# Design Canvas Specification

## Purpose

Fixed 800x600 coordinate plane with magnetic grid and zoom/pan that serves as the primary surface for arranging analog UI components.

## Schema

```yaml
CanvasConfig:
  base_width: 800        # MUST be 800
  base_height: 600       # MUST be 600
  grid_size: 20          # pixels between grid lines
  snap_enabled: true     # default enabled
  snap_tolerance: 10     # pixels, configurable 1-50
  zoom_level: 1.0        # 0.25 to 4.0 range
  pan_offset: { x: 0, y: 0 }
```

## Requirements

### Requirement: Canvas bounds MUST be fixed at 800x600

The canvas MUST NOT resize or adapt to viewport. Scroll/pan is the only navigation method beyond the 800x600 area.

#### Scenario: Canvas does not stretch

- GIVEN the app is loaded at any window size
- WHEN the canvas renders
- THEN the logical coordinate space is exactly 800 units wide by 600 units tall

#### Scenario: Viewport smaller than canvas

- GIVEN the window is smaller than 800x600
- WHEN the canvas renders
- THEN scroll bars or pan controls appear to navigate the full canvas

### Requirement: Magnetic grid MUST support configurable snap

Grid lines MUST be visible at all zoom levels. Components MUST snap to the nearest grid intersection when snap is enabled.

#### Scenario: Component snaps on drop

- GIVEN snap is enabled with tolerance 10px
- WHEN a component is dropped within 10px of a grid intersection
- THEN the component position snaps to that grid intersection

#### Scenario: Grid snap can be disabled

- GIVEN snap is disabled
- WHEN a component is dropped at any position
- THEN the component stays at the precise drop position

### Requirement: Zoom MUST support range 25%–400%

Zoom MUST be controlled via Ctrl+MouseWheel. Zoom MUST center on cursor position when possible.

#### Scenario: Zoom in to 400%

- GIVEN the canvas is at 100% zoom
- WHEN the user Ctrl+scrolls up 12 steps
- THEN zoom level is 400%
- AND grid lines and components scale proportionally

#### Scenario: Zoom below minimum is clamped

- GIVEN the canvas is at 25% zoom
- WHEN the user attempts to zoom out further
- THEN zoom stays at 25%

### Requirement: Pan MUST allow navigating canvas

Pan MUST work via middle-mouse drag or two-finger scroll.

#### Scenario: Pan the canvas

- GIVEN the canvas is zoomed to 200%
- WHEN the user middle-drags 100px right
- THEN the pan offset x increases by 100px

### Requirement: Grid origin SHALL be top-left (0, 0)

All component positions are relative to canvas origin.

#### Scenario: Component at origin

- GIVEN a component has position (0, 0)
- WHEN the canvas renders
- THEN the component appears at the canvas top-left corner
