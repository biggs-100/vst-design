# Design: JUCE Runtime Module — Dynamic JSON UI Loader

## Technical Approach

Multi-file JUCE module that reads PluginStudio's `.plugindesign` JSON v1 schema at runtime and builds the full plugin UI dynamically. Components are self-positioning from JSON bounds, parameter bindings auto-create via APVTS attachments, and filmstrip rendering uses a custom `LookAndFeel` override on `juce::Slider`. Zero external dependencies — only JUCE 7+ built-in APIs.

## Architecture Decisions

### Decision: Module Structure

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single-file (header-only) | Simple but unmaintainable as module grows | ❌ |
| **Multi-file with sub-folders** | Clean separation, single public header, JUCE convention | ✅ |

### Decision: JSON Parsing

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **`juce::JSON::parse()`** | Zero deps, dynamic `var` access — schema is shallow (2 levels) | ✅ |
| `nlohmann-json` | Strong typing but external dep for consumers | ❌ |
| Custom parser | Waste of effort, bug-prone | ❌ |

### Decision: Filmstrip Rendering

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **`LookAndFeel::drawRotarySlider()` override** | Standard JUCE slider path, works with Projucer/CMake | ✅ |
| Custom `paint()` per component | Duplicates slider drag behavior | ❌ |

### Decision: Parameter Binding

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **APVTS attachments inside DynamicComponent** | Self-contained, loose coupling | ✅ |
| Parent-owned attachments | Couples layout to parent lifecycle | ❌ |

### Decision: Component Positioning

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Self-positioning from JSON bounds** | No `resized()` re-parsing, components own their bounds | ✅ |
| Parent `resized()` sets bounds | Re-parses JSON on every resize | ❌ |

### Decision: Image Resolution

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **1x only (v1)** | Simple, defers @2x complexity to v2 | ✅ |
| Full @2x Retina | JUCE `ImageCache` doesn't auto-detect @2x naming | ❌ |

## Data Flow

```
.plugindesign JSON (file on disk)
         │
         ▼
  DesignParser::parse() ──→ PluginDesign struct tree
         │
         ▼
  loadComponents() ──→ iterate ui_components[]
         │
         ├── factory[type] → DynamicComponent subclass
         │       │
         │       ├── setBounds(x, y, w, h)
         │       ├── attachParameters(apvts)  → SliderAttachment
         │       └── parent.addAndMakeVisible()
         │
         ▼
  Runtime: components render via JUCE message thread
  Timer-based: VUMeterComponent polls APVTS at ~60 FPS
  LookAndFeel: FilmStripLookAndFeel crops frame from sliderPos
```

### Parameter Registration Flow (separate, earlier in lifecycle)

```
  AudioProcessor::getParameterLayout()
         │
         ▼
  createParameterLayout(designJson) → AudioProcessorValueTreeState::ParameterLayout
         │
         ▼
  AudioProcessor constructor → apvts = std::make_unique<APVTS>(*this, nullptr, "params", layout)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `pluginstudio_runtime/pluginstudio_runtime.h` | Create | Master header with `BEGIN_JUCE_MODULE_DECLARATION`, public API |
| `pluginstudio_runtime/pluginstudio_runtime.cpp` | Create | Single compile unit including all internal .cpps |
| `pluginstudio_runtime/parser/DesignData.h` | Create | Structs: `PluginDesign`, `ComponentData` |
| `pluginstudio_runtime/parser/DesignParser.h` | Create | `parse(File)` — JSON → PluginDesign |
| `pluginstudio_runtime/parser/DesignParser.cpp` | Create | Implementation: schema version check, component extraction, asset path resolution |
| `pluginstudio_runtime/components/DynamicComponent.h` | Create | Base class with `attachParameters()` virtual, stores `ComponentData` + APVTS ref |
| `pluginstudio_runtime/components/KnobComponent.h` | Create | `juce::Slider` rotary + `FilmStripLookAndFeel` |
| `pluginstudio_runtime/components/KnobComponent.cpp` | Create | Filmstrip load, frame calc, attachment create |
| `pluginstudio_runtime/components/SwitchComponent.h` | Create | `juce::Slider` two-value rotary or discrete positions |
| `pluginstudio_runtime/components/SwitchComponent.cpp` | Create | N-position frame mapping |
| `pluginstudio_runtime/components/OutputComponents.h` | Create | `VUMeterComponent` + `LedComponent` declarations |
| `pluginstudio_runtime/components/OutputComponents.cpp` | Create | VU ballistics timer, LED paint modes |
| `pluginstudio_runtime/lookandfeel/FilmStripLookAndFeel.h` | Create | `drawRotarySlider()` override declaration |
| `pluginstudio_runtime/lookandfeel/FilmStripLookAndFeel.cpp` | Create | Frame cropping logic, fallback circle rendering |
| `pluginstudio_runtime/binding/ParameterBinder.h` | Create | Factory registry + `loadComponents()` static |
| `pluginstudio_runtime/binding/ParameterBinder.cpp` | Create | Factory map init, component iteration + creation |

## Interfaces / Contracts

```cpp
#pragma once
#include <juce_core/juce_core.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_utils/juce_audio_utils.h>

namespace pluginstudio {

// ── Public API ──────────────────────────────────────────────────────────────

// Call in AudioProcessor::getParameterLayout() (or constructor).
// Returns ParameterLayout populated with params from every ui_component
// that has a parameter_id.
juce::AudioProcessorValueTreeState::ParameterLayout
createParameterLayout(const juce::File& designJson);

// Call in AudioProcessorEditor constructor.
// Parses JSON, creates DynamicComponent children, positions them,
// and binds parameters via APVTS attachments.
void loadComponents(const juce::File& designJson,
                    juce::AudioProcessorValueTreeState& apvts,
                    juce::Component& parent);

// ── Internal Structs (exposed for testing / custom hosts) ──────────────────

struct ComponentData {
    juce::String type;
    juce::String id;
    juce::String parameterId;
    int x, y, width, height;
    juce::String assetPath;
    int frames = 0;
    int frameWidth = 0;
    int frameHeight = 0;

    // Per-type config (from JSON `config` object)
    double minValue = 0.0, maxValue = 1.0, defaultValue = 0.5;
    juce::StringArray states;
    double startAngle = -135.0, endAngle = 135.0;   // knob
    double needleLength = 0.8;                       // VU Meter (% of height)
    double damping = 0.7;                            // VU Meter
    int segments = 10;                               // VU Meter
    juce::String ledMode = "on_off";                 // LED
    juce::Colour colorOn = juce::Colours::red;
    juce::Colour colorOff = juce::Colours::darkgrey;
};

struct PluginDesign {
    juce::String name;
    int baseWidth = 800;
    int baseHeight = 600;
    int schemaVersion;
    juce::Array<ComponentData> components;
};

// ── DynamicComponent Base Class ────────────────────────────────────────────

class DynamicComponent : public juce::Component {
public:
    DynamicComponent(const ComponentData& data, juce::AudioProcessorValueTreeState& apvts);
    virtual ~DynamicComponent() = default;
    virtual void attachParameters(juce::AudioProcessorValueTreeState& apvts) = 0;
    juce::String getComponentId() const;
    juce::String getParameterId() const;
protected:
    ComponentData data;
};

// ── Factory Type ───────────────────────────────────────────────────────────

using ComponentFactory = std::function<std::unique_ptr<DynamicComponent>(
    const ComponentData&, juce::AudioProcessorValueTreeState&)>;

} // namespace pluginstudio
```

### Schema Version Contract

| Field | Path | Type | Consumed by |
|-------|------|------|-------------|
| `plugin_meta.schema_version` | top-level | int | `DesignParser` — reject if > current |
| `plugin_meta.name` | top-level | string | `PluginDesign::name` |
| `plugin_meta.base_width` | top-level | int | `parent.setSize()` |
| `plugin_meta.base_height` | top-level | int | `parent.setSize()` |
| `ui_components[].type` | per component | string | Factory dispatch |
| `ui_components[].id` | per component | string | `ComponentData::id` |
| `ui_components[].parameter_id` | per component | string | APVTS attachment key |
| `ui_components[].x/y/width/height` | per component | int | `setBounds()` |
| `ui_components[].asset_path` | per component | string | Image loading, resolved relative to JSON dir |
| `ui_components[].frames` | per component | int | `ComponentData::frames` |
| `ui_components[].config.*` | per component | object | Per-type config extraction |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Parser Unit | `DesignParser::parse()` — valid JSON, missing fields, schema version mismatch, relative asset path resolution | Create sample `.plugindesign` JSON files, parse, assert struct fields match |
| Parser Unit | Cross-file config merge — all 4 component types extract correct per-type config | Create one JSON per component type, assert `ComponentData` fields |
| Component Unit | `KnobComponent` — filmstrip frame calc at 0%, 50%, 100% | Mock image, verify `drawRotarySlider` source rect |
| Component Unit | `VUMeterComponent` — ballistics smoothing (step response) | Set value, tick timer, assert needle angle converges |
| Component Unit | `LedComponent` — `on_off` threshold rendering, `saturation` lerp | Set value, call `paint()`, assert expected color |
| Integration | `loadComponents()` — factory dispatch creates correct subclass per type | Parse shared JSON, assert child count and types on parent |
| Integration | Parameter attachment — slider change updates APVTS value | Create APVTS with known params, attach, simulate slider drag, read APVTS |

Note: JUCE module tests require a JUCE project with test runner (testem). Since the project is greenfield with no test runner configured (`strict_tdd: false`), testing will rely on manual verification via a consumer project until unit test infrastructure is established.

## Migration / Rollout

No migration required. This is a net-new JUCE module with no existing code to migrate. Consumers opt in by adding the module to their project path:

1. Copy `pluginstudio_runtime/` into `JUCE/modules/` or project's module path
2. Add `juce_add_module(pluginstudio_runtime)` in CMake (or add in Projucer)
3. `#include <pluginstudio_runtime/pluginstudio_runtime.h>`
4. Call `createParameterLayout()` in `getParameterLayout()`
5. Call `loadComponents()` in editor constructor

## Open Questions

- [ ] Confirm the JSON `schema_version` field location — is it at `plugin_meta.schema_version` or a top-level `schema_version`? The JSON export spec doesn't show it explicitly but the exploration references it. Default to top-level `$schema` URI semantics.
- [ ] VU Meter ballistics: should the timer interval be fixed at 16ms (~60 FPS) or configurable via `config.damping`? Fixed 16ms with configurable damping coefficient is the intended approach — confirm.
- [ ] `SwitchComponent`: confirm whether to use `juce::Slider::RotaryVerticalDrag` (like Knob) or `juce::Slider::IncDecButtons` for click-to-toggle behavior. The exploration recommends rotary slider with N frames — confirm this is acceptable for 2-state toggles.
