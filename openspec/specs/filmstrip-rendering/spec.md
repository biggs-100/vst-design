# Filmstrip Rendering Specification

## Purpose

`FilmStripLookAndFeel` that extends `juce::LookAndFeel_V4` and overrides `drawRotarySlider()` to crop and render a frame from a vertical filmstrip image. Used by `KnobComponent` and `SwitchComponent` to display filmstrip-based rotary controls.

## Requirements

### Requirement: FilmStripLookAndFeel MUST extend LookAndFeel_V4

`FilmStripLookAndFeel` SHALL inherit from `juce::LookAndFeel_V4` and override `drawRotarySlider()`. The instance SHALL be shared across components (static or singleton).

#### Scenario: Default fallthrough when no filmstrip loaded

- GIVEN a `FilmStripLookAndFeel` instance with no filmstrip image set
- WHEN `drawRotarySlider()` is called for a slider
- THEN it falls back to `LookAndFeel_V4::drawRotarySlider()` (no crash, default JUCE rendering)

### Requirement: FilmStripLookAndFeel MUST crop filmstrip by frame index

The override SHALL compute `frameIndex = round(sliderPosProportional * (frameCount - 1))`, then crop the loaded filmstrip image to `(0, frameIndex * frameHeight, frameWidth, frameHeight)` and draw it scaled to the slider bounds.

#### Scenario: Slider at 0.5 renders middle frame

- GIVEN a 100-frame filmstrip, `sliderPosProportional = 0.5`
- WHEN `drawRotarySlider()` is invoked
- THEN the source rect is `(0, 49 * frameHeight, frameWidth, frameHeight)` (frame index 49)
- AND the cropped image is drawn filling the slider bounds

#### Scenario: Slider at 1.0 renders last frame

- GIVEN a 100-frame filmstrip, `sliderPosProportional = 1.0`
- WHEN `drawRotarySlider()` is invoked
- THEN frame index is 99 (last frame)

#### Scenario: Slider at 0.0 renders first frame

- GIVEN any frame count N, `sliderPosProportional = 0.0`
- WHEN `drawRotarySlider()` is invoked
- THEN frame index is 0

### Requirement: Frame count MUST be configurable per component

The `FilmStripLookAndFeel` SHALL accept per-component frame counts via a map or by being set per Slider attachment. If not configured, it SHALL use the image-derived frame count.

#### Scenario: Two-frame switch renders correct frame

- GIVEN a switch component with `frame_count: 2` and slider value `1.0`
- WHEN `drawRotarySlider()` is called
- THEN frame index is 1

### Requirement: Filmstrip image format MUST be vertical strip

The filmstrip SHALL be a single image with frames stacked vertically. Frame height is derived as `imageHeight / frameCount`. The image MUST divide evenly.

#### Scenario: Filmstrip division error

- GIVEN a filmstrip image with dimensions 800x1003 and frame count 100
- WHEN `setFilmstrip(image, frameCount)` is called
- THEN the method logs an error: "Filmstrip dimensions do not divide evenly. 1003 / 100 = 10.03"
- AND rendering falls back to the default LookAndFeel

#### Scenario: Zero frame count

- GIVEN a filmstrip with `frameCount = 0`
- WHEN `drawRotarySlider()` is called
- THEN no image is drawn (safe no-op)
- AND the error is logged

### Requirement: Kinematic frame mapping MUST use proportional position

The frame index SHALL be `round(sliderPosProportional * (frameCount - 1))`, clamped to `[0, frameCount - 1]`.

#### Scenario: Frame mapping covers full range

- GIVEN 100 frames
- WHEN `sliderPosProportional` varies from 0.0 to 1.0
- THEN frame index varies from 0 to 99 (every frame reachable)

#### Scenario: Proportional position at boundary clamps correctly

- GIVEN `sliderPosProportional = 1.001` (floating point drift)
- WHEN frame index is computed
- THEN it clamps to `frameCount - 1`
