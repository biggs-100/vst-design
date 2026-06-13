# Code Snippet Export Specification

## Purpose

Generate copy-paste ready C++ header declarations and `resized()` position entries that JUCE developers can insert directly into their projects.

## Output Format

### Header Declaration (.h)
```cpp
// PluginStudio — Generated Header Declarations
// Project: MyPlugin

// Knob: frequency
juce::Slider frequencyKnob;
juce::ImageComponent frequencyKnobImage;

// Switch: bypass
juce::ImageButton bypassSwitch;

// VU Meter: level
juce::ImageComponent vuMeterLevel;

// LED: clip
juce::ImageComponent clipLed;
```

### Resized Entry (.cpp)
```cpp
// frequencyKnob
frequencyKnob.setBounds(120, 80, 60, 60);
frequencyKnobImage.setBounds(120, 80, 60, 60);

// bypassSwitch
bypassSwitch.setBounds(300, 200, 40, 80);

// vuMeterLevel
vuMeterLevel.setBounds(400, 100, 200, 100);

// clipLed
clipLed.setBounds(500, 300, 16, 16);
```

## Requirements

### Requirement: Snippet export MUST generate .h declarations for each component

#### Scenario: All component types generate declarations

- GIVEN a project with a knob, switch, VU meter, and LED
- WHEN code export is triggered
- THEN 4 declarations are generated in the .h tab
- AND each declaration includes the component id and parameter_id as a comment

### Requirement: Snippet export MUST generate .cpp resized() entries with exact positions

#### Scenario: Position matches canvas coordinates

- GIVEN a knob at position (120, 80) with size (60, 60)
- WHEN the .cpp entry is generated
- THEN setBounds(120, 80, 60, 60) appears in the output

### Requirement: Snippets MUST be displayed in a side panel with copy buttons

#### Scenario: Copy .h declarations to clipboard

- GIVEN the .h snippet panel is visible
- WHEN the user clicks "Copy .h"
- THEN the full .h block is copied to clipboard

#### Scenario: Copy .cpp entries to clipboard

- GIVEN the .cpp snippet panel is visible
- WHEN the user clicks "Copy .cpp"
- THEN the full .cpp resized() block is copied to clipboard

### Requirement: Snippets MUST update in real-time as components are moved

#### Scenario: Snippet updates on component drag

- GIVEN a component at (100, 100)
- WHEN the user drags it to (150, 200)
- THEN the .cpp snippet automatically updates setBounds to (150, 200, ...)
- AND the change is reflected without requiring manual re-export

### Requirement: Snippet export SHOULD handle missing component types with best-effort

#### Scenario: Unsupported component type generates placeholder

- GIVEN a component with unknown type "fader"
- WHEN snippet generation runs
- THEN a comment is generated: "// Unknown component type: fader (id: fader_001)"
- AND generation continues for other components (no crash)

### Requirement: Component labels SHOULD be included as comments in .h

#### Scenario: Switch labels in comments

- GIVEN a switch with frame labels ["Off", "On"]
- WHEN the .h snippet is generated
- THEN the declaration includes: "// States: Off, On" as a comment
