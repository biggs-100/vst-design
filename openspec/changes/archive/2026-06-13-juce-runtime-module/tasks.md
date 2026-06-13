# Tasks: JUCE Runtime Module

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,250 (16 new C++ files) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Scaffold + Parser → PR 2: LookAndFeel + Components → PR 3: Binding/API → PR 4: Tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

```
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium
```

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Module scaffold + Parser (DesignData, DesignParser) | PR 1 | Foundation — no component deps |
| 2 | LookAndFeel + Components (FilmStripL&F, DynamicComponent, Knob, Switch, VU, LED) | PR 2 | Depends on DesignData from PR 1 |
| 3 | Binding + Public API (ParameterBinder, loadComponents, createParameterLayout) | PR 3 | Depends on all components from PR 2 |
| 4 | Tests (parser, components, ballistics, frame calc) | PR 4 | Depends on PR 3 |

### Resolved Decisions

1. `schema_version` → Top-level field in JSON (validated before full parse)
2. VU Meter → 60 FPS (16ms Timer), damping configurable via JSON `config.damping`
3. Switch → Click-to-toggle button (not rotary slider)

## Phase 1: Module Scaffolding

- [x] 1.1 Create `pluginstudio_runtime/pluginstudio_runtime.h` — `BEGIN_JUCE_MODULE_DECLARATION`, includes for core/gui/processors/utils, `namespace pluginstudio`, public API stubs for `createParameterLayout()` and `loadComponents()`
- [x] 1.2 Create `pluginstudio_runtime/pluginstudio_runtime.cpp` — includes all internal .cpps from parser/, components/, lookandfeel/, binding/
- [x] 1.3 Create `pluginstudio_runtime/parser/DesignData.h` — `PluginDesign` (name, baseWidth, baseHeight, schemaVersion, components[]) and `ComponentData` (type, id, parameterId, x/y/width/height, assetPath, frames, frameWidth, frameHeight, per-type config fields) structs

## Phase 2: Parser

- [x] 2.1 Create `pluginstudio_runtime/parser/DesignParser.h/.cpp` — `parse(juce::File)` calls `juce::JSON::parse()`, validates `schema_version == 1`, returns `std::optional<PluginDesign>` or logs error; resolves `asset_path` relative to JSON parent dir via `File::getParentDirectory().getChildFile()`
- [x] 2.2 Extract `ComponentData` from each `ui_components[]` entry — cast `var` to typed fields: `(int)obj["x"]`, `(String)obj["type"]`; extract `config` sub-object for per-type fields (total_frames, start_angle, damping, mode, colors)

## Phase 3: LookAndFeel

- [x] 3.1 Create `pluginstudio_runtime/lookandfeel/FilmStripLookAndFeel.h` — extends `juce::LookAndFeel_V4`, stores `juce::Image` filmstrip + frame count, declares `drawRotarySlider()` override
- [x] 3.2 Create `pluginstudio_runtime/lookandfeel/FilmStripLookAndFeel.cpp` — constructor loads filmstrip from `data.assetPath` via `ImageCache::getFromFile()`; even-division validation with error log; `drawRotarySlider()` computes `frameIndex = round(sliderPos * (numFrames - 1))`, crops `sourceRect(0, frameIndex * frameHeight, imageWidth, frameHeight)`, draws scaled to bounds; fallback circular knob with indicator line

## Phase 4: Components

- [x] 4.1 Create `pluginstudio_runtime/components/DynamicComponent.h` — abstract base: `DynamicComponent(ComponentData, APVTS&)`, `virtual attachParameter(APVTS&) = 0`, stores `ComponentData` + `apvtsPtr` + shared `SliderAttachment`, self-positions via `setBounds(x, y, w, h)`, static `create()` factory
- [x] 4.2 Create `pluginstudio_runtime/components/DynamicComponent.cpp` — constructor stores data/apvtsPtr and positions; `create()` factory switches on `data.type`: Knob→KnobComponent, Switch→SwitchComponent, VUMeter→VUMeterComponent, LED→LedComponent, unknown→log warning + nullptr
- [x] 4.3 Create `pluginstudio_runtime/components/KnobComponent.h/.cpp` — wraps `juce::Slider` `RotaryVerticalDrag` style, range from `data.minValue`/`data.maxValue`, default from `data.defaultValue`; sets `FilmStripLookAndFeel` from data; `attachParameter()` creates `SliderAttachment`; `resized()` fills bounds
- [x] 4.4 Create `pluginstudio_runtime/components/SwitchComponent.h/.cpp` — wraps `juce::TextButton` with `setClickingTogglesState(true)`; labels from `data.states[0]`/`[1]` (default "OFF"/"ON"); onClick updates button text; `attachParameter()` creates `ButtonAttachment`; `resized()` fills bounds
- [x] 4.5 Create `pluginstudio_runtime/components/OutputComponents.h` — declare `VUMeterComponent` (extends `DynamicComponent` + `Timer`, ballistics: currentLevel/targetLevel/velocity, mass/damping/spring) and `LedComponent` (extends `DynamicComponent` + `Timer`, colorOn/colorOff/ledMode, 50ms polling timer)
- [x] 4.6 Create `pluginstudio_runtime/components/OutputComponents.cpp` — `VUMeterComponent`: startTimer(16ms), timerTick polls APVTS → second-order ballistics (force = spring*(target-pos) - damp*vel, vel += force/mass*dt, pos += vel*dt); `paint()` draws dark bg, dB scale marks (-20/-10/-5/0 dB), needle jmapped from currentLevel (-45..+45 deg), centre dot; `LedComponent`: startTimer(50ms), `paint()` draws filled circle, `on_off` mode: value>0.5→colorOn else colorOff, `saturation` mode: `colorOff.interpolatedWith(colorOn, value)`, glow/border effect

## Phase 5: Binding & Public API

- [x] 5.1 Create `pluginstudio_runtime/binding/ParameterBinder.h` — class declaration with `createComponents()` and `createLayout()` static methods
- [x] 5.2 Create `pluginstudio_runtime/binding/ParameterBinder.cpp` — `createComponents()` factory dispatches via DynamicComponent::create(), calls attachParameter(), returns OwnedArray; `createLayout()` iterates components, creates AudioParameterFloat for Knob/Switch with deduplication by parameterId
- [x] 5.3 Update `pluginstudio_runtime.h` — replace stub declarations with inline implementations of `createParameterLayout()` and `loadInto()`; add `loadInto(parent, file, apvts)` returning `OwnedArray<DynamicComponent>` as primary entry point; add includes for DesignParser.h and ParameterBinder.h

## Phase 6: Test Runner Setup & Tests

- [x] 6.1 Create `tests/TestRunner.cpp` — standalone JUCE app entry point with grouped test declarations, console output formatting, and return code
- [x] 6.2 Create `tests/ParserTests.cpp` — valid JSON round-trip to `PluginDesign`, missing `ui_components` returns empty components with meta preserved, schema version 999 rejected (empty name + zero components), missing `schema_version` rejected, older schema version 0 accepted, config block extraction for VU meter (needleLength, damping) and Knob (min/max/default)
- [x] 6.3 Create `tests/ComponentTests.cpp` — `ComponentData` struct defaults and field assignment, VU meter config fields, LED config fields, Switch state labels, factory dispatch type strings
- [x] 6.4 Create `tests/MathTests.cpp` — `valueToFrame()` boundary/edge/midpoint cases, default ballistics converges to target (600 frames), over-damped ballistics doesn't overshoot, under-damped ballistics does overshoot, ballistics stable at minimum damping clamp (0.001)
