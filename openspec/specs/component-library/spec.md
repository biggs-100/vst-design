# Component Library Specification

## Purpose

Draggable analog audio plugin components: Knob, Switch/Toggle, VU Meter, and LED.

## Schema

```yaml
Component:
  type: knob | switch | vu_meter | led
  id: string           # unique within project
  parameter_id: string # maps to JUCE parameter
  x: integer           # canvas position (0-800)
  y: integer           # canvas position (0-600)
  width: integer
  height: integer
  asset_path: string   # filmstrip or static image path
  frames: integer      # filmstrip frame count (1-200)

KnobConfig:
  total_frames: 100    # default 100, range 1-200
  start_angle: -135    # degrees, default -135
  end_angle: 135       # degrees, default 135

SwitchConfig:
  frame_count: 2       # 2 or 3
  labels: [string]     # per-frame labels (e.g. ["Off","On"])

VUMeterConfig:
  needle_radius: 80    # pixels, range 20-200
  damping: 0.3         # ballistics, range 0.1-0.9
  segments: 10         # visual segments

LEDConfig:
  mode: on_off | saturation
  color_on: "#00FF00"
  color_off: "#333333"
```

## Requirements

### Requirement: Knob MUST render from filmstrip frames

#### Scenario: Knob rotates on circular drag

- GIVEN a knob component with 100 frames
- WHEN the user drags in a circular motion around the knob center
- THEN the displayed frame updates proportionally to the drag angle
- AND the parameter_id value changes from 0.0 to 1.0

#### Scenario: Knob frame count validation

- GIVEN a knob with total_frames set to 250
- WHEN validation runs
- THEN an error is raised: frames MUST be 1-200

### Requirement: Switch MUST support 2 or 3 toggle positions

#### Scenario: Two-position toggle

- GIVEN a switch with frame_count 2
- WHEN the user clicks the switch
- THEN the display toggles between frame 0 and frame 1

#### Scenario: Three-position switch

- GIVEN a switch with frame_count 3
- WHEN the user clicks the switch sequentially
- THEN the display cycles through frames 0, 1, 2

### Requirement: VU Meter MUST support configurable needle ballistics

#### Scenario: Needle responds to test signal

- GIVEN a VU meter with needle_radius 80 and damping 0.3
- WHEN a test signal is applied
- THEN the needle moves with damping (smoothing factor 0.3)
- AND needle length matches needle_radius

#### Scenario: Damping affects response curve

- GIVEN a VU meter with damping 0.9
- WHEN a signal drops from 1.0 to 0.0
- THEN the needle returns slowly (high inertia)
- AND with damping 0.1 the needle returns rapidly

### Requirement: LED MUST support on/off and saturation modes

#### Scenario: On/off toggles color

- GIVEN an LED in on_off mode
- WHEN the parameter value is 0
- THEN the LED shows color_off
- WHEN the parameter value is > 0
- THEN the LED shows color_on

#### Scenario: Saturation follows signal

- GIVEN an LED in saturation mode
- WHEN the parameter value increases from 0.0 to 1.0
- THEN the LED brightness/color intensity scales proportionally

### Requirement: All components MUST be draggable on canvas

#### Scenario: Component moves on drag

- GIVEN a component at position (100, 100)
- WHEN the user drags it 50px right
- THEN the component x updates to 150
- AND the y stays at 100
