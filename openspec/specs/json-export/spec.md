# JSON Export Specification

## Purpose

Export a .plugindesign JSON file containing all canvas and component data in a schema consumable by JUCE C++ projects.

## JSON Schema

```json
{
  "$schema": "https://pluginstudio.dev/schema/v1",
  "plugin_meta": {
    "name": "MyPlugin",
    "version": "1.0.0",
    "base_width": 800,
    "base_height": 600
  },
  "ui_components": [
    {
      "type": "knob",
      "id": "knob_001",
      "parameter_id": "frequency",
      "x": 120,
      "y": 80,
      "width": 60,
      "height": 60,
      "asset_path": "assets/knob_filmstrip.png",
      "frames": 100,
      "config": {
        "total_frames": 100,
        "start_angle": -135,
        "end_angle": 135
      }
    },
    {
      "type": "switch",
      "id": "switch_001",
      "parameter_id": "bypass",
      "x": 300,
      "y": 200,
      "width": 40,
      "height": 80,
      "asset_path": "assets/switch.png",
      "frames": 2,
      "config": {
        "frame_count": 2,
        "labels": ["Off", "On"]
      }
    },
    {
      "type": "vu_meter",
      "id": "vu_001",
      "parameter_id": "level",
      "x": 400,
      "y": 100,
      "width": 200,
      "height": 100,
      "asset_path": "assets/vu_bg.png",
      "frames": 0,
      "config": {
        "needle_radius": 80,
        "damping": 0.3,
        "segments": 10
      }
    },
    {
      "type": "led",
      "id": "led_001",
      "parameter_id": "clip",
      "x": 500,
      "y": 300,
      "width": 16,
      "height": 16,
      "asset_path": "",
      "frames": 0,
      "config": {
        "mode": "on_off",
        "color_on": "#FF0000",
        "color_off": "#333333"
      }
    }
  ]
}
```

## Requirements

### Requirement: Export MUST produce valid .plugindesign JSON

#### Scenario: Export with knob and switch

- GIVEN a canvas with 1 knob and 1 switch
- WHEN the user clicks Export JSON
- THEN the output file contains plugin_meta and ui_components with 2 entries
- AND parameter_id values match component configuration

#### Scenario: Validate before export

- GIVEN a component with missing parameter_id
- WHEN export is triggered
- THEN the system blocks export and reports: "Component knob_001 is missing parameter_id"

### Requirement: plugin_meta MUST include name, base_width, base_height

#### Scenario: Metadata reflects project settings

- GIVEN the project name is "FilterBank" and canvas is 800x600
- WHEN exported
- THEN plugin_meta.name is "FilterBank", base_width is 800, base_height is 600

### Requirement: Each component MUST include type, id, parameter_id, position, and config

#### Scenario: Full component data on export

- GIVEN a VU meter with custom damping 0.5
- WHEN exported
- THEN the VU meter entry includes needle_radius, damping, and segments in config

### Requirement: Export SHOULD validate asset_path existence

#### Scenario: Missing asset path warns

- GIVEN a knob component referencing a missing image file
- WHEN export is triggered
- THEN the system shows a warning: "Missing asset: assets/knob.png"
- BUT export proceeds (warning, not error)
