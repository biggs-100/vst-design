# LED Component Specification

## Purpose

Custom JUCE `Component` with two rendering modes: `on_off` (discrete binary toggle between `color_on` and `color_off`) and `saturation` (continuous interpolation between the two colors based on parameter value). Used for status indicators such as clip detection, gate open, or power state.

## Requirements

### Requirement: LEDComponent MUST extend juce::Component

`LEDComponent` SHALL inherit from `juce::Component` and override `paint(juce::Graphics&)`. It SHALL read the APVTS parameter value once per paint or via a polling timer.

#### Scenario: LED paints without crashing

- GIVEN an `LEDComponent` constructed with valid JSON
- WHEN `paint()` is called
- THEN it renders without throwing or crashing
- AND the output is a filled rectangle or ellipse in the component bounds

### Requirement: On/off mode MUST toggle between two discrete colors

In `on_off` mode, the component SHALL render `color_off` when the parameter value is `0`, and `color_on` when `value > 0`.

#### Scenario: Off state renders color_off

- GIVEN an LED in `on_off` mode with `color_on: "#FF0000"`, `color_off: "#333333"`, parameter value `0.0`
- WHEN `paint()` is called
- THEN the fill color is `"#333333"` (dark gray)

#### Scenario: On state renders color_on

- GIVEN parameter value `0.5` (or any non-zero)
- WHEN `paint()` is called
- THEN the fill color is `"#FF0000"` (red)

### Requirement: Saturation mode MUST interpolate between color_off and color_on

In `saturation` mode, the component SHALL linearly interpolate each RGB channel from `color_off` to `color_on` based on the parameter value (0.0–1.0).

#### Scenario: Zero value shows color_off

- GIVEN an LED in `saturation` mode, parameter value `0.0`
- WHEN `paint()` is called
- THEN the fill color equals `color_off`

#### Scenario: Full value shows color_on

- GIVEN parameter value `1.0`
- WHEN `paint()` is called
- THEN the fill color equals `color_on`

#### Scenario: Mid value interpolates

- GIVEN `color_off: "#000000"`, `color_on: "#FFFFFF"`, parameter value `0.5`
- WHEN `paint()` is called
- THEN the fill color approximates `"#808080"` (mid-gray)

### Requirement: LED must poll parameter value from APVTS

The component SHALL read the APVTS parameter value for its `parameter_id` each time it paints, or use an optional low-frequency timer. It SHALL NOT create a `SliderAttachment`.

#### Scenario: Paint reflects current APVTS value

- GIVEN an LED bound to `parameter_id: "clip"` with APVTS value changing from 0 to 1
- WHEN the component is repainted after the value change
- THEN the LED color updates to match

#### Scenario: Null APVTS pointer

- GIVEN a LED with `apvts == nullptr`
- WHEN `paint()` is called
- THEN no crash occurs
- AND the LED renders in `color_off` (fail-safe state)

### Requirement: Colors MUST parse from hex string "#RRGGBB"

The component SHALL parse `config.color_on` and `config.color_off` from 6-digit hex strings into `juce::Colour`. If parsing fails, it SHALL fall back to `juce::Colours::red` for `color_on` and `juce::Colours::darkgrey` for `color_off`.

#### Scenario: Valid hex parses correctly

- GIVEN `color_on: "#00FF00"`
- WHEN the color is parsed
- THEN the resulting `juce::Colour` has RGB `(0, 255, 0)`

#### Scenario: Invalid hex falls back gracefully

- GIVEN `color_on: "not-a-color"`
- WHEN the color is parsed
- THEN it falls back to `juce::Colours::red`
- AND a warning is logged

#### Scenario: Missing color_on field defaults

- GIVEN a JSON with `color_off` but no `color_on`
- WHEN the component is constructed
- THEN `color_on` defaults to `juce::Colours::red`
- AND `color_off` uses the provided value

### Requirement: LED SHOULD render as a filled circle

The default shape SHALL be an ellipse filling the component bounds. The component MAY support rectangular rendering via a future config option.

#### Scenario: Ellipse matches bounds

- GIVEN component bounds `(500, 300, 16, 16)`
- WHEN `paint()` is called
- THEN an ellipse is drawn filling `(500, 300, 16, 16)`
