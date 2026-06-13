# VU Meter Component Specification

## Purpose

Custom JUCE `Component` that renders a needle with second-order damped harmonic oscillator ballistics. Uses a `juce::Timer` to poll the APVTS parameter value and animate the needle toward the target with configurable mass, damping, and spring constants.

## Requirements

### Requirement: VUMeterComponent MUST extend juce::Component and juce::Timer

The component SHALL inherit from `juce::Component` and `juce::Timer`. The timer callback SHALL drive the ballistic simulation each tick.

#### Scenario: Timer is started on construction

- GIVEN a `VUMeterComponent` constructed with a valid `ComponentData`
- WHEN the component is created
- THEN `isTimerRunning()` returns `true`
- AND the timer interval is 15–17ms (~60 FPS)

#### Scenario: Timer is stopped on destruction

- GIVEN a `VUMeterComponent` that is about to be destroyed
- WHEN the destructor runs
- THEN `stopTimer()` is called
- AND no timer callback fires after destruction

### Requirement: Needle ballistics MUST use 2nd-order damped harmonic oscillator

The displayed needle position SHALL NOT jump to the target value instantly. Instead, it SHALL simulate a mass-spring-damper system: `acceleration = (target - position) * spring - velocity * damping`, divided by mass. Velocity and position SHALL be integrated each tick.

#### Scenario: Needle moves smoothly toward target

- GIVEN a VU meter with default mass=1.0, damping=0.5, spring=10.0
- WHEN the target value jumps from 0.0 to 1.0
- THEN the needle position approaches 1.0 with smooth acceleration/deceleration
- AND it reaches 0.99+ within 500ms (settling time)

#### Scenario: High damping slows response

- GIVEN damping=0.9, mass=1.0, spring=10.0
- WHEN the target drops from 1.0 to 0.0
- THEN the needle returns slowly (overshoot-avoiding, critically damped or overdamped behavior)

#### Scenario: Low damping allows overshoot

- GIVEN damping=0.1, mass=1.0, spring=10.0
- WHEN the target jumps from 0.0 to 1.0
- THEN the needle may overshoot past 1.0 before settling (underdamped)
- AND eventually stabilizes at 1.0

### Requirement: Target value MUST be polled from APVTS

The timer callback SHALL read the APVTS parameter value for its `parameter_id` each tick and set it as the ballistics target. The component SHALL NOT use `SliderAttachment`.

#### Scenario: Polling reflects APVTS changes

- GIVEN a VU meter bound to `parameter_id: "level"` with value 0.0
- WHEN the APVTS value changes to 0.75
- THEN within 2 timer ticks, the target value updates to 0.75
- AND the needle begins moving toward 0.75

#### Scenario: Null APVTS pointer is handled gracefully

- GIVEN a VU meter with `apvts == nullptr`
- WHEN the timer fires
- THEN no crash occurs
- AND the needle stays at its current position

### Requirement: Needle MUST render as a line from pivot to arc

The `paint()` override SHALL draw a line from the needle pivot point (defined by `needle_radius` from center) rotated by `currentAngle = normalizedPosition * (endAngle - startAngle) + startAngle`. The background SHALL use the `asset_path` image if provided, or a solid color.

#### Scenario: Needle at 0 points to start angle

- GIVEN a VU meter with `start_angle: -135, end_angle: 135`, needle value 0.0
- WHEN `paint()` is called
- THEN the needle line is drawn at angle -135 degrees

#### Scenario: Needle at 1 points to end angle

- GIVEN same angles, needle value 1.0
- WHEN `paint()` is called
- THEN the needle line is drawn at angle 135 degrees

#### Scenario: Segments render as arc markers

- GIVEN a VU meter with `segments: 10`
- WHEN `paint()` is called
- THEN 10 tick marks or arc segments are drawn between start and end angle

### Requirement: Ballistic constants MUST be configurable per component

The `config` block SHALL support `mass`, `damping`, and `spring` independently per VU meter component. Defaults SHALL be `mass=1.0, damping=0.5, spring=10.0`.

#### Scenario: Config overrides defaults

- GIVEN a VU meter JSON with `config: { "damping": 0.8, "spring": 5.0 }`
- WHEN the component is constructed
- THEN `damping == 0.8`, `spring == 5.0`, `mass == 1.0` (default)

#### Scenario: Invalid damping clamps to valid range

- GIVEN a VU meter JSON with `config: { "damping": 0.0 }` or `config: { "damping": -1.0 }`
- WHEN the component is constructed
- THEN damping SHALL be clamped to `0.001` (minimum positive)
