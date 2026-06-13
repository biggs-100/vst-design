# Filmstrip Manager Specification

## Purpose

Import, preview, and test filmstrip sprite animations used by knob and switch components.

## Filmstrip Format

- Vertical strip image (PNG or JPG)
- Frames stacked top-to-bottom, each identical height
- Frame count = total image height ÷ single frame height
- Example: 1000px image with 100px per frame = 10 frames
- Frame width is uniform across the strip

```yaml
FilmstripConfig:
  source_path: string     # asset path relative to project
  total_frames: integer   # detected or manually overridden
  frame_width: integer    # derived from image width
  frame_height: integer   # derived: img_height / total_frames
  fps: 30                 # preview playback speed
```

## Requirements

### Requirement: Filmstrip MUST import from PNG/JPG files

#### Scenario: Import valid vertical strip

- GIVEN a valid vertical filmstrip image (800x2000, 100px per frame = 20 frames)
- WHEN the user imports the file
- THEN the system detects 20 frames
- AND frame_width is 800, frame_height is 100

#### Scenario: Import non-strip image

- GIVEN a non-square image that does not divide evenly
- WHEN the user imports it
- THEN the system warns: "Image dimensions do not divide evenly into equal frames"

#### Scenario: Unsupported file format

- GIVEN a file with .webp or .gif extension
- WHEN the user attempts to import
- THEN the system rejects with: "Unsupported format. Use PNG or JPG."

### Requirement: Frame count MUST be overridable

#### Scenario: Override detected frames

- GIVEN a filmstrip with auto-detected 20 frames
- WHEN the user sets frame count to 100
- THEN frame_height recalculates to 2000 / 100 = 20px per frame
- AND the preview updates immediately

### Requirement: Preview MUST animate at configurable FPS

#### Scenario: Preview plays at 30 FPS

- GIVEN a filmstrip with 100 frames loaded
- WHEN the user presses play
- THEN frames advance at 30 FPS cycling from frame 0 to 99

### Requirement: Knob rotation in preview panel MUST test frame mapping

#### Scenario: Circular drag maps to frames

- GIVEN a knob preview with 100 frames in the test panel
- WHEN the user drags in a circle 180 degrees
- THEN the displayed frame maps proportionally to drag angle

#### Scenario: Full rotation covers all frames

- GIVEN the knob preview
- WHEN the user completes a full 360-degree rotation
- THEN the knob cycles through all frames from 0 to 99 and back to 0
