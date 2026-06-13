/*
  ==============================================================================

   OutputComponents.h
   Created: 12 Jun 2026

   Output-only components: VUMeterComponent and LedComponent.

   Both components are display-only — they poll the APVTS parameter value
   via a juce::Timer and render their state visually. They do NOT create
   APVTS attachments, making them suitable for meters, clip indicators,
   gate status, and similar read-only displays.

  ==============================================================================
*/

#pragma once

#include "DynamicComponent.h"

namespace pluginstudio
{

//==============================================================================
/**
    Analogue-style VU meter with second-order damped harmonic oscillator
    ballistics.

    A needle sweeps between -45 and +45 degrees, driven by a mass-spring-
    damper simulation updated at ~60 FPS (16ms timer interval). The target
    value is polled from the APVTS parameter on each tick.

    Ballistic constants (mass, damping, spring) are configurable via
    ComponentData. Defaults: mass=1.0, damping=0.7, spring=0.8.
    Damping is clamped to a minimum of 0.001 to prevent instability.
*/
class VUMeterComponent : public DynamicComponent,
                         private juce::Timer
{
public:
    //==============================================================================
    /** Creates a VUMeterComponent from design data.

        Starts the 16ms timer for ~60 FPS ballistics updates.
        Reads data.damping for the damping coefficient.
    */
    VUMeterComponent (const ComponentData& data,
                      juce::AudioProcessorValueTreeState& apvts);

    /** @internal */
    ~VUMeterComponent() override = default;

    //==============================================================================
    /** No-op — VU meter polls the parameter value via timer. */
    void attachParameter (juce::AudioProcessorValueTreeState& apvts) override {}

    /** Draws the VU meter face: dark background, dB scale marks, and needle. */
    void paint (juce::Graphics& g) override;

    /** No special layout needed. */
    void resized() override {}

private:
    //==============================================================================
    double currentLevel = 0.0;
    double targetLevel  = 0.0;
    double velocity     = 0.0;
    double mass         = 1.0;
    double damping      = 0.7;
    double spring       = 0.8;

    //==============================================================================
    /** Polls the APVTS parameter and advances the ballistics simulation. */
    void timerCallback() override;

    /** Advances the mass-spring-damper simulation by one timestep. */
    void updateBallistics (double newTarget);

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (VUMeterComponent)
};


//==============================================================================
/**
    Status indicator LED with two rendering modes.

    Modes:
      - on_off:      Discrete toggle between colorOn (> 0.5) and colorOff.
      - saturation:  Continuous RGB interpolation between colorOff and colorOn
                     based on the parameter value (0.0–1.0).

    Polls the APVTS parameter at 20 FPS (50ms timer interval).
*/
class LedComponent : public DynamicComponent,
                     private juce::Timer
{
public:
    //==============================================================================
    /** Creates an LedComponent from design data.

        Starts the 50ms timer for ~20 FPS polling.
        Reads data.colorOn, data.colorOff, and data.ledMode.
    */
    LedComponent (const ComponentData& data,
                  juce::AudioProcessorValueTreeState& apvts);

    /** @internal */
    ~LedComponent() override = default;

    //==============================================================================
    /** No-op — LED polls the parameter value via timer. */
    void attachParameter (juce::AudioProcessorValueTreeState& apvts) override {}

    /** Draws a filled circle with the current LED colour. */
    void paint (juce::Graphics& g) override;

    /** No special layout needed. */
    void resized() override {}

private:
    //==============================================================================
    double value = 0.0;
    juce::Colour colorOn;
    juce::Colour colorOff;
    juce::String ledMode;

    //==============================================================================
    /** Polls the APVTS parameter and triggers a repaint. */
    void timerCallback() override;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (LedComponent)
};

} // namespace pluginstudio
