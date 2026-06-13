# Parameter Binding Specification

## Purpose

Automatic creation of APVTS `SliderAttachment` objects from `parameter_id` fields in the design JSON. Also provides `createParameterLayout()` so developers can register parameters BEFORE editor creation — a critical constraint of the JUCE APVTS architecture.

## Requirements

### Requirement: Parameters MUST be registered before editor creation

APVTS `SliderAttachment` creation fails if the target parameter is not already registered in the `AudioProcessorValueTreeState`. The module MUST provide a static utility `PluginStudioRuntime::createParameterLayout()` that generates a `ParameterLayout` from a design JSON.

#### Scenario: createParameterLayout registers float parameters

- GIVEN a design JSON with a knob having `parameter_id: "frequency"`, `config.min: 20.0`, `config.max: 20000.0`
- WHEN `createParameterLayout()` is called
- THEN the returned layout contains a `juce::AudioParameterFloat` named `"frequency"` with range `20.0–20000.0`

#### Scenario: createParameterLayout registers float parameters for switches

- GIVEN a design JSON with a switch having `parameter_id: "bypass"` and `config.default: 0.0`
- WHEN `createParameterLayout()` is called
- THEN the layout contains a `juce::AudioParameterFloat` named `"bypass"` with range `0.0–1.0`

#### Scenario: Duplicate parameter_id across components

- GIVEN two components sharing the same `parameter_id`
- WHEN `createParameterLayout()` is called
- THEN the parameter is registered only once (no duplicate crash)
- AND both components share the same APVTS parameter

### Requirement: ParameterBinder MUST create SliderAttachment per knob/switch

`ParameterBinder` SHALL iterate over dynamic components, and for each knob/switch, create a `juce::SliderParameterAttachment` linking the component's internal slider to the APVTS parameter identified by `parameter_id`.

#### Scenario: Knob attachment is bidirectional

- GIVEN a `KnobComponent` bound via `ParameterBinder::bindAll(components, apvts)`
- WHEN the user drags the slider
- THEN the APVTS parameter value changes to match
- WHEN the APVTS parameter changes programmatically
- THEN the slider position updates

#### Scenario: VU meter and LED skip binding

- GIVEN an array of components containing both a VUMeterComponent and an LEDComponent
- WHEN `ParameterBinder::bindAll()` is called
- THEN no attachments are created for those components
- AND no errors are logged

### Requirement: Attachment lifetime MUST match component lifetime

Each `SliderAttachment` SHALL be stored inside its owning `DynamicComponent` (moved in during `bind()`). When the component is destroyed, the attachment MUST be destroyed first (RAII).

#### Scenario: Component destruction cleans up attachment

- GIVEN a parent editor with bound components
- WHEN the editor is destroyed (or `loadInto()` is called again)
- THEN all child components are destroyed
- AND all attachments are destroyed before the APVTS
- AND no dangling pointer or crash occurs

### Requirement: Re-entrant loadInto() MUST clear previous bindings

If `loadInto()` is called on a parent that already has dynamic children, the module SHALL remove all existing children and their bindings before creating new ones.

#### Scenario: Second loadInto replaces previous design

- GIVEN a parent with components loaded from `design_a.json`
- WHEN `loadInto()` is called with `design_b.json`
- THEN previous children are removed
- AND new children matching `design_b` are created
- AND old attachments are destroyed

### Requirement: Parameter type mapping MUST follow defined rules

| JSON type | APVTS Parameter | Range |
|-----------|----------------|-------|
| `knob` | `AudioParameterFloat` | config.min → config.max (default 0.0–1.0) |
| `switch` | `AudioParameterFloat` + `ButtonAttachment` | 0.0–1.0 |
| `vu_meter` | `AudioParameterFloat` | 0.0–1.0 (read-only) |
| `led` | `AudioParameterBool` | 0 or 1 |

#### Scenario: Knob with no config.min defaults to 0.0–1.0

- GIVEN a knob JSON with no `config.min` or `config.max`
- WHEN `createParameterLayout()` runs
- THEN the parameter range is `NormalisableRange<float>(0.0f, 1.0f)`
