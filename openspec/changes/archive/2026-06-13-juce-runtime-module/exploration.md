# Exploration: JUCE Runtime Module for PluginStudio

## Current State

PluginStudio is a desktop app (Tauri + React + react-konva) that exports `.plugindesign` JSON files
and static C++ code snippets. A JUCE developer currently must:
1. Manually declare UI components in their `PluginEditor.h`
2. Manually position them via `setBounds()` in `resized()`
3. Manually create `SliderAttachment` bindings per parameter
4. Manually write `drawRotarySlider()` LookAndFeel overrides for filmstrip rendering

Any layout change in PluginStudio requires re-exporting JSON and re-compiling C++. There is no
runtime component that reads the exported design JSON and builds the UI dynamically.

## Affected Areas

- `openspec/specs/json-export/spec.md` — the JSON schema the module must consume (stable, v1)
- `src/types/schema.ts` — TypeScript schema definition (source of truth for JSON structure)
- `src/types/component.ts` — component type definitions that map to JUCE classes
- `src/utils/toPluginDesignJson.ts` — how we serialize (confirms the output shape)
- `openspec/specs/filmstrip-manager/spec.md` — filmstrip format the module must render
- No JUCE code exists yet — this is net-new

## Approaches

### 1. Module Structure

#### Approach A: Single-file module (header-only + one .cpp)
Single `pluginstudio_runtime.h` with inline implementations or thin .cpp.
- Pros: Simplest to distribute, single file to include
- Cons: Poor organization as module grows, harder to maintain
- Effort: Low

#### Approach B: Multi-file module with internal sub-folders **← RECOMMENDED**
Folder structure:
```
pluginstudio_runtime/
├── pluginstudio_runtime.h         # Master header + BEGIN_JUCE_MODULE_DECLARATION
├── pluginstudio_runtime.cpp       # Single compile unit that includes internal .cpps
├── parser/
│   └── DesignParser.h / .cpp      # JSON → internal model
├── components/
│   ├── KnobComponent.h / .cpp
│   ├── SwitchComponent.h / .cpp
│   ├── VUMeterComponent.h / .cpp
│   └── LEDComponent.h / .cpp
├── lookandfeel/
│   ├── FilmStripLookAndFeel.h / .cpp
└── binding/
    └── ParameterBinder.h / .cpp
```
- Pros: Clean separation of concerns, single public header, each concern in its own file
- Cons: Slightly more files for the module author
- Effort: Medium

**Decision**: Approach B. JUCE convention uses sub-folders for internal files. The master header
remains the single public API surface — consumers only `#include <pluginstudio_runtime/pluginstudio_runtime.h>`.

---

### 2. JSON Parsing Strategy

#### Approach A: juce::JSON::parse (built-in) **← RECOMMENDED**
JUCE's `juce_core` includes `juce::JSON::parse(const File&)` returning `juce::var`.
- Pros: Zero extra dependencies, shipping with JUCE, no CMake/nlohmann setup
- Cons: Dynamic typing — `var["key"]` returns another `var`, needs explicit casts: `(double)var["key"]`, `(String)var["key"]`, `(Array<var>)var["key"]`
- Effort: Low

#### Approach B: nlohmann-json
- Pros: Strong typing (`json.at("key").get<int>()`), better error messages
- Cons: External dependency the developer must install, additional CMake/Projucer configuration
- Effort: Medium

#### Approach C: Custom parser
- Pros: None
- Cons: Waste of effort, bug-prone
- Effort: Very High

**Decision**: Approach A. The schema is shallow (2 levels deep, 4 component types). `var` dynamic
access is adequate. Zero dependency overhead is the decisive factor.

---

### 3. Component Mapping (JSON type → JUCE class)

| JSON `type` | JUCE Class | Style / Notes |
|-------------|-----------|---------------|
| `knob` | `juce::Slider` | `RotaryVerticalDrag` style + custom `LookAndFeel` rendering filmstrip frame |
| `switch` | `juce::Slider` | `Rotary` style, range 0.0–1.0 mapped to frame 0 or frame N-1; or `juce::TextButton` |
| `vu_meter` | Custom `juce::Component` | Draws needle with ballistics (damping, rotation around needle_radius center) |
| `led` | Custom `juce::Component` | `paint()` override fills with `color_on` or `color_off` based on value |

**Key sub-decisions**:

**Switch**: Use `juce::Slider` with `RotaryHorizontalVerticalDrag` style for N positions.
Override `drawRotarySlider()` in LookAndFeel to render the matching filmstrip frame.
Two-position switch = 2-frame filmstrip. N-position = N frames.

**VU Meter**: This is an OUTPUT-only component. It does NOT bind to APVTS for control — it reads
a parameter value and animates the needle. Ballistics (damping) are applied in a `Timer` callback
that smooths the displayed value toward the actual parameter value.

**LED**: Similar to VU meter — output-only, reads parameter value. Paint `color_on` when `value > 0`,
`color_off` otherwise. In `saturation` mode, interpolate between the two colors.

---

### 4. Filmstrip Rendering in JUCE

#### Approach A: LookAndFeel override for Slider **← RECOMMENDED**
Override `Slider::LookAndFeelMethods::drawRotarySlider()` in a custom `LookAndFeel` subclass.
- Knob and switch components use this class
- Pros: Standard JUCE slider customization path, works with both Projucer and CMake projects
- Cons: All sliders using this L&F get filmstrip treatment (manageable via component-based L&F)

**Rendering algorithm:**
```
drawRotarySlider(g, x, y, w, h, sliderPosProportional, startAngle, endAngle, slider):
  frameCount = totalFrames from config
  frameIndex = round(sliderPosProportional * (frameCount - 1))
  sourceRect = Rectangle(0, frameIndex * frameHeight, frameWidth, frameHeight)
  Image frame = filmstrip.getClippedImage(sourceRect)
  g.drawImage(frame, x, y, w, h, 0, 0, frameWidth, frameHeight)
```

#### Approach B: Custom Component with paint() override
Each component has its own `paint()` that does filmstrip cropping.
- Pros: Total control over rendering
- Cons: Duplicates logic, no slider integration (no built-in drag behavior)

**Decision**: Approach A for knob/switch. VU Meter and LED use Approach B since they aren't sliders.

#### HiDPI / Retina handling

- **Approach A**: Always load 1x images. Component draws at logical size. If @2x image detected,
  half the crop coordinates during `getClippedImage()`. **← RECOMMENDED for v1**
- **Approach B**: Use JUCE's native @2x via ImageCache — JUCE handles it. Requires @2x naming convention.
  Problem: `ImageCache::getFromFile()` does NOT auto-detect @2x naming. You must implement it.
- Effort: Low for Approach A (skip @2x for now), Medium for proper @2x support

**Decision**: Start with 1x only. Document @2x support as a future enhancement.

---

### 5. Parameter Binding

#### Approach A: APVTS attachments from editor **← RECOMMENDED**
The module receives a reference to the project's `AudioProcessorValueTreeState` and creates
`SliderAttachment` objects for each knob/switch component.

**Critical constraint**: APVTS parameters must be REGISTERED before attachments can be created.
The module cannot register parameters from the editor because APVTS is typically constructed
in the AudioProcessor constructor (before the editor exists).

**Solution**: Provide a static utility that generates the parameter layout from a design JSON:

```cpp
// In AudioProcessor constructor or getParameterLayout()
juce::AudioProcessorValueTreeState::ParameterLayout layout;
PluginStudioRuntime::addParametersFromDesign("design.json", layout);
apvts = std::make_unique<AudioProcessorValueTreeState>(*this, nullptr, "params", layout);
```

Then in the editor:
```cpp
PluginStudioRuntime::loadComponents("design.json", *apvts, *this);
```

**Parameter type mapping**:
| JSON type | JUCE Parameter | Range |
|-----------|---------------|-------|
| `knob` | `juce::AudioParameterFloat` | 0.0–1.0 (or config.min → config.max) |
| `switch` | `juce::AudioParameterInt` or `juce::AudioParameterChoice` | 0–(states.length-1) |
| `vu_meter` | `juce::AudioParameterFloat` (read-only, output) | 0.0–1.0 |
| `led` | `juce::AudioParameterBool` (or float > threshold) | 0 or 1 |

---

### 6. DynamicComponent Factory & Layout

#### Approach A: Registry-based factory with base class **← RECOMMENDED**
```cpp
class DynamicComponent : public juce::Component {
public:
    virtual void bind(juce::AudioProcessorValueTreeState&) = 0;
    void setComponentBounds(const ComponentData& data);
};

class KnobComponent : public DynamicComponent { ... };
class SwitchComponent : public DynamicComponent { ... };
class VUMeterComponent : public DynamicComponent { ... };
class LEDComponent : public DynamicComponent { ... };

// Factory
std::unique_ptr<DynamicComponent> createComponent(const juce::var& json, const ComponentData& data);
```

**Layout**: Each component sets its own bounds from JSON x/y/width/height in `setComponentBounds()`.
The editor's `resized()` does NOT need to reposition individual components — they position themselves.

**Relative positioning**: Future enhancement. For v1, absolute positioning from JSON coordinates.

#### Approach B: `Component::setBounds()` in parent resized()
Parse JSON in `resized()`, iterate and call setBounds on each child.
- Pros: Standard JUCE resized() pattern
- Cons: Re-parses JSON on every resize, couples layout to parent

**Decision**: Approach A. Components are self-positioning from their JSON data. The parent only
needs to ensure its own size matches `plugin_meta.base_width × base_meta.base_height`.

#### Component ownership
- `DynamicComponent` is owned by the parent via `addAndMakeVisible()` (JUCE manages lifetime)
- `SliderAttachment` is stored inside each `DynamicComponent` (moved in, owned by component)
- The LookAndFeel instance should be shared across all components of the same type (singleton or static)

---

### 7. Integration Flow

**Target developer workflow:**

1. Drop `pluginstudio_runtime/` into `JUCE/modules/` or project's module path
2. Add module dependency in Projucer or `juce_add_module()` in CMake
3. Copy `design.json` and `assets/` folder into the project
4. In `PluginProcessor.h`:
   ```cpp
   #include <pluginstudio_runtime/pluginstudio_runtime.h>
   ```
5. In `PluginProcessor` constructor or `getParameterLayout()`:
   ```cpp
   auto layout = PluginStudioRuntime::createParameterLayout(BinaryData::design_json);
   // or load from file:
   auto layout = PluginStudioRuntime::createParameterLayoutFromFile("design.json");
   ```
6. In `PluginEditor` constructor:
   ```cpp
   PluginStudioRuntime::loadInto(
       juce::File::getCurrentWorkingDirectory().getChildFile("design.json"),
       apvts, *this);
   ```
   This creates all dynamic components as children of the editor, positions them, and binds them.

**File resolution**: Filmstrip asset paths in JSON are relative (e.g., `"assets/knob.png"`).
The module resolves them relative to the JSON file's parent directory.

---

## Recommendation

The module should be structured as follows:

```
pluginstudio_runtime/
├── pluginstudio_runtime.h
├── pluginstudio_runtime.cpp          # includes all internal .cpps
├── parser/
│   ├── DesignParser.h
│   └── DesignParser.cpp              # juce::JSON::parse → internal structs
├── components/
│   ├── DynamicComponent.h            # base class
│   ├── KnobComponent.h/.cpp          # Slider + filmstrip
│   ├── SwitchComponent.h/.cpp        # Slider + filmstrip (multi-frame)
│   ├── VUMeterComponent.h/.cpp       # custom Component + ballistics timer
│   └── LEDComponent.h/.cpp           # custom Component + paint()
├── lookandfeel/
│   ├── FilmStripLookAndFeel.h/.cpp   # drawRotarySlider override
└── binding/
    ├── ParameterBinder.h/.cpp        # APVTS layout factory + attachment creation
```

**Key design principles:**
1. **Zero external dependencies** — use `juce::JSON::parse()`, `juce::ImageCache`, `juce::Slider`
2. **Single include** — consumers only `#include <pluginstudio_runtime/pluginstudio_runtime.h>`
3. **Self-positioning** — components set their own bounds from JSON data
4. **Loose coupling** — module receives APVTS reference, doesn't own it
5. **Output-only components** — VU Meter and LED don't create slider attachments; they use Timer + value polling

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| APVTS parameter registration must happen before editor creation | High — design error if missed | Provide `createParameterLayout()` utility called in `getParameterLayout()` or constructor |
| Filmstrip asset path resolution breaks when JSON is moved | Medium | Resolve relative to JSON file parent dir; document this convention |
| Component ownership and attachment lifetime | Medium | Store attachments inside each DynamicComponent (moved in during `bind()`) |
| Schema version mismatch between PluginStudio export and module | Medium | Check `schema_version` field; reject unknown or future schema versions |
| Re-entrant `loadInto()` call (loading twice) | Low | Either clear children first or guard with a flag |
| Thread safety of image loading | Low | Images loaded on message thread (fine for editor init); document that `loadInto()` must be called on the message thread |
| @2x Retina filmstrip support | Low | Defer to v2. Document as known limitation. |

## Ready for Proposal

**Yes.** The exploration is complete. All 7 dimensions have clear recommendations backed by JUCE
API research. The module design is consistent with JUCE conventions, uses zero external dependencies,
and provides a clean integration workflow.

The orchestrator should proceed to **sdd-propose** with:
- Change name: `juce-runtime-module`
- Recommendation summary: Multi-file module using `juce::JSON::parse()`, APVTS attachments,
  self-positioning DynamicComponent hierarchy, FilmStripLookAndFeel for filmstrip rendering

## Schema Compatibility Notes

The module consumes JSON format v1 as defined in `openspec/specs/json-export/spec.md`.
Key fields consumed per component type:

**knob**: `parameter_id`, `x`, `y`, `width`, `height`, `asset_path`, `frames`, `config.total_frames`, `config.min`, `config.max`
**switch**: `parameter_id`, `x`, `y`, `width`, `height`, `asset_path`, `frames`, `config.states`
**vu_meter**: `parameter_id`, `x`, `y`, `width`, `height`, `asset_path`, `config.needle_radius`, `config.damping`, `config.segments`
**led**: `parameter_id`, `x`, `y`, `width`, `height`, `config.mode`, `config.color_on`, `config.color_off`

The `frames` field at the component level is redundant with `config.total_frames` for knobs — the
module uses `config.total_frames` as the source of truth. The `frames` field at the component level
should match for consistency but is secondary.
