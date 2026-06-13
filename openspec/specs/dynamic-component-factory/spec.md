# Dynamic Component Factory Specification

## Purpose

Component hierarchy and factory that creates JUCE components from JSON type strings. Defines the `DynamicComponent` base class, concrete subclasses (`KnobComponent`, `SwitchComponent`, `VUMeterComponent`, `LEDComponent`), and a factory function that maps JSON `type` → JUCE component instance.

## Requirements

### Requirement: DynamicComponent base class MUST define common interface

`DynamicComponent` SHALL extend `juce::Component` and declare `virtual void bind(juce::AudioProcessorValueTreeState&) = 0`. It SHALL provide `setComponentBounds(const ComponentData&)` that calls `setBounds()` from JSON x/y/width/height.

#### Scenario: Base class applies bounds from data

- GIVEN a `ComponentData` with `x: 50, y: 100, width: 60, height: 60`
- WHEN `setComponentBounds(data)` is called
- THEN the component's bounds are `(50, 100, 60, 60)`

#### Scenario: bind() is pure virtual

- GIVEN any `DynamicComponent` subclass
- WHEN `bind()` is called
- THEN it does not crash (either succeeds or is a no-op for output-only components)

### Requirement: Factory MUST create correct subclass per JSON type

The factory function `createComponent(const juce::var& json)` SHALL read the `type` field and construct the matching concrete subclass.

#### Scenario: Factory creates KnobComponent for type "knob"

- GIVEN a JSON object with `"type": "knob"`
- WHEN `createComponent()` is called
- THEN it returns a `std::unique_ptr<KnobComponent>` (upcast to `DynamicComponent`)

#### Scenario: Factory creates VUMeterComponent for type "vu_meter"

- GIVEN a JSON object with `"type": "vu_meter"`
- WHEN `createComponent()` is called
- THEN it returns a `std::unique_ptr<VUMeterComponent>`

#### Scenario: Factory rejects unknown type

- GIVEN a JSON object with `"type": "fader"`
- WHEN `createComponent()` is called
- THEN it returns `nullptr`
- AND an error is logged

### Requirement: KnobComponent MUST wrap a juce::Slider with RotaryVerticalDrag style

`KnobComponent` SHALL contain a `juce::Slider` member set to `Slider::RotaryVerticalDrag` style. The slider's `LookAndFeel` SHALL be set to a shared `FilmStripLookAndFeel` instance.

#### Scenario: Knob slider is rotary and bounded 0.0–1.0

- GIVEN a constructed `KnobComponent`
- THEN its internal slider has `RotaryVerticalDrag` style
- AND slider range is `0.0` to `1.0`
- AND slider interval is `0.0` (continuous)

#### Scenario: Knob binds parameter attachment

- GIVEN a `KnobComponent` with `parameter_id: "frequency"` and a valid APVTS
- WHEN `bind(apvts)` is called
- THEN a `juce::SliderParameterAttachment` is created internally for `"frequency"`
- AND moving the slider changes the APVTS parameter value

### Requirement: SwitchComponent MUST wrap a juce::TextButton with clickingTogglesState

`SwitchComponent` SHALL contain a `juce::TextButton` with `clickingTogglesState` enabled. Clicking the button SHALL toggle between `0.0` (off) and `1.0` (on). The button text SHALL reflect the current state. Three-position switches are not supported in v1.

#### Scenario: Click toggles from 0.0 to 1.0

- GIVEN a switch component at state `0.0` (off)
- WHEN the button is clicked
- THEN the state becomes `1.0` (on)
- AND the button visual reflects the "on" state

#### Scenario: Second click returns to 0.0

- GIVEN a switch component at state `1.0` (on)
- WHEN the button is clicked again
- THEN the state returns to `0.0` (off)
- AND the button visual reflects the "off" state

### Requirement: Output-only components (VU, LED) MUST NOT create attachments

`VUMeterComponent` and `LEDComponent` SHALL have `bind()` as a no-op (they read parameter values via polling, not attachments).

#### Scenario: VU bind is no-op

- GIVEN a `VUMeterComponent` with `parameter_id: "level"` and a valid APVTS
- WHEN `bind(apvts)` is called
- THEN no attachment is created
- AND no exception is thrown

#### Scenario: LED bind is no-op

- GIVEN an `LEDComponent` with `parameter_id: "clip"` and a valid APVTS
- WHEN `bind(apvts)` is called
- THEN no attachment is created

### Requirement: Components SHALL self-position from JSON data at construction

Each component SHALL read bounds during construction from its parsed JSON data. No external layout pass SHOULD be required.

#### Scenario: Component positioned from JSON

- GIVEN a knob JSON with `"x": 120, "y": 80, "width": 60, "height": 60`
- WHEN `KnobComponent` is constructed
- THEN `getBounds() == (120, 80, 60, 60)`
