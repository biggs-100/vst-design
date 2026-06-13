# Proposal: JUCE Runtime Module — Dynamic JSON UI Loader for PluginStudio

## Intent

Eliminate manual C++ UI coding for JUCE plugin developers. Instead of copying snippet code by hand, the developer drops in a JUCE module that reads PluginStudio's exported `.plugindesign` JSON at runtime and builds the entire UI dynamically — components, positions, filmstrips, parameter bindings.

## Scope

### In Scope
- Multi-file JUCE module with public header `pluginstudio_runtime.h`
- JSON parser for `.plugindesign` v1 schema via `juce::JSON::parse()`
- Dynamic component factory: Knob (`juce::Slider` rotary + filmstrip), Switch (`juce::Slider` two-value rotary), VU Meter (custom + Timer ballistics), LED (custom paint)
- `FilmStripLookAndFeel` extending `juce::LookAndFeel_V4` for rotary slider filmstrip rendering
- Parameter binder: auto-create APVTS `SliderAttachment` per `parameter_id`
- Asset path resolver (relative to JSON parent directory)
- Schema version validation on load
- `createParameterLayout()` utility for `AudioProcessor::getParameterLayout()`

### Out of Scope
- @2x Retina image support (deferred)
- Custom component type registration API (v2)
- Non-JUCE targets (AAX/VST3 native)
- In-editor parameter value editing
- Animation / transitions between states
- Multiple simultaneous designs per plugin

## Capabilities

### New Capabilities
- `juce-module-core`: Module scaffolding, public API, JSON parsing, schema validation
- `dynamic-component-factory`: Component hierarchy + factory creating JUCE components from JSON type strings
- `filmstrip-rendering`: LookAndFeel cropping filmstrip by frame index in `drawRotarySlider()`
- `parameter-binding`: Automatic APVTS `SliderAttachment` creation from `parameter_id`
- `vu-meter-component`: Custom JUCE Component with needle ballistics (timer-based)
- `led-component`: Custom JUCE Component with on/off and saturation rendering

### Modified Capabilities
None — this is net-new JUCE code; no existing specs change.

## Approach

Standard JUCE module format with sub-folders (`parser/`, `components/`, `lookandfeel/`, `binding/`). Public API is header-only via `pluginstudio_runtime.h`. `FilmStripLookAndFeel` extends `juce::LookAndFeel_V4` and overrides `drawRotarySlider()`. `DynamicComponent` base class stores its `SliderAttachment` and self-positions from JSON bounds. `DesignParser` returns a struct tree. `PluginStudioRuntime` static methods provide the one-line `loadInto()` entry point.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `openspec/specs/json-export/spec.md` | Read-only | Module consumes v1 schema (no changes needed) |
| `openspec/specs/component-library/spec.md` | Read-only | Component types map directly to JUCE classes |
| `openspec/specs/filmstrip-manager/spec.md` | Read-only | Vertical strip format consumed by FilmStripLookAndFeel |
| JUCE module (`pluginstudio_runtime/`) | **New** | Entire module is net-new |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| APVTS params must register before editor creation | Medium | `createParameterLayout()` utility called in `getParameterLayout()` |
| Filmstrip asset paths break if JSON is moved | Medium | Resolve relative to JSON parent dir; document convention |
| Schema drift between PluginStudio and module | Low | Version check on load; reject unknown/future schema versions |

## Rollback Plan

Remove the module from the project's module path and revert to the previous manual C++ UI approach. No data loss — `.plugindesign` JSON files remain valid. The module is entirely additive with no build system changes outside the module itself.

## Dependencies

- JUCE 7+ (requires `juce::JSON`, `juce::Slider`, `juce::AudioProcessorValueTreeState`)
- No external dependencies — module uses only JUCE built-in APIs

## Success Criteria

- [ ] A JUCE developer can add the module, call `loadInto()`, and see the full design rendered
- [ ] Knobs render filmstrip correctly with 100-frame rotation
- [ ] Parameter attachments work bidirectionally (UI ↔ parameter)
- [ ] VU Meter needle moves with ballistics when audio plays
- [ ] Layout updates when `design.json` is replaced (no recompile)
