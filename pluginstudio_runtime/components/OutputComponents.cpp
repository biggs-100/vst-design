/*
  ==============================================================================

   OutputComponents.cpp
   Created: 12 Jun 2026

   Implementation: VUMeterComponent (second-order ballistics, needle
   rendering, dB scale marks) and LedComponent (on_off / saturation
   rendering modes).

  ==============================================================================
*/

#include "OutputComponents.h"

namespace pluginstudio
{

//==============================================================================
//  VUMeterComponent
//==============================================================================

VUMeterComponent::VUMeterComponent (const ComponentData& d,
                                    juce::AudioProcessorValueTreeState& apvts)
    : DynamicComponent (d, apvts)
{
    // Clamp damping to minimum positive value to prevent instability.
    damping = juce::jmax (0.001, data.damping);

    startTimer (16); // ~60 FPS
}

//==============================================================================
void VUMeterComponent::paint (juce::Graphics& g)
{
    using namespace juce;

    const auto bounds = getLocalBounds().toFloat();
    const auto centre = Point<float> (bounds.getCentreX(), bounds.getBottom());
    const auto radius = jmin (bounds.getWidth(), bounds.getHeight() * data.needleLength);

    // ── Dark background ───────────────────────────────────────────────────
    g.setColour (Colour (0xff1a1a1a));
    g.fillRoundedRectangle (bounds.reduced (1.0f), 4.0f);

    // ── Meter face (semi-circular arc area) ───────────────────────────────
    g.setColour (Colour (0xff2a2a2a));
    g.fillRoundedRectangle (bounds.reduced (2.0f), 3.0f);

    // ── dB scale marks ────────────────────────────────────────────────────
    // Map dB values to normalised levels, then to angles.
    //   0 dB   → level = 1.0
    //  -5 dB   → level ≈ 0.56
    // -10 dB   → level ≈ 0.32
    // -20 dB   → level ≈ 0.10
    struct DbMark { double db; double level; };
    const DbMark marks[] = {
        { -20, 0.10 },
        { -10, 0.32 },
        {  -5, 0.56 },
        {   0, 1.00 }
    };

    g.setColour (Colours::lightgrey);

    for (const auto& mark : marks)
    {
        const double angle = jmap (mark.level, 0.0, 1.0, -45.0, 45.0);
        const double rad   = MathConstants<double>::degreesToRadians (angle);

        // Tick start / end points
        const auto tickInner = centre + Point<float> (
            static_cast<float> ((radius - 6.0) * std::sin (rad)),
            static_cast<float> (-(radius - 6.0) * std::cos (rad)));

        const auto tickOuter = centre + Point<float> (
            static_cast<float> ((radius - 2.0) * std::sin (rad)),
            static_cast<float> (-(radius - 2.0) * std::cos (rad)));

        g.drawLine (Line<float> (tickInner, tickOuter), 1.5f);

        // Label
        g.setFont (9.0f);
        g.drawText (String (static_cast<int> (mark.db)) + " dB",
                    tickOuter.getX() - 12.0f,
                    tickOuter.getY() - 14.0f,
                    24.0f, 12.0f,
                    Justification::centred);
    }

    // ── Needle ────────────────────────────────────────────────────────────
    const double needleAngle = jmap (currentLevel, 0.0, 1.0, -45.0, 45.0);
    const double needleRad   = MathConstants<double>::degreesToRadians (needleAngle);

    const auto needleEnd = centre + Point<float> (
        static_cast<float> (radius * std::sin (needleRad)),
        static_cast<float> (-radius * std::cos (needleRad)));

    // Needle shadow
    g.setColour (Colour (0x40000000));
    g.drawLine (Line<float> (centre.translated (1.0f, 1.0f), needleEnd.translated (1.0f, 1.0f)), 2.5f);

    // Needle
    g.setColour (Colours::orange);
    g.drawLine (Line<float> (centre, needleEnd), 2.0f);

    // Centre dot
    g.setColour (Colours::white);
    g.fillEllipse (centre.getX() - 3.0f, centre.getY() - 3.0f, 6.0f, 6.0f);
}

//==============================================================================
void VUMeterComponent::timerCallback()
{
    // Poll the APVTS parameter if we have one.
    if (apvtsPtr != nullptr && data.parameterId.isNotEmpty())
    {
        auto* param = apvtsPtr->getRawParameterValue (data.parameterId);
        if (param != nullptr)
            targetLevel = param->load();
    }

    updateBallistics (targetLevel);
    repaint();
}

//==============================================================================
void VUMeterComponent::updateBallistics (double newTarget)
{
    const double dt = 1.0 / 60.0;

    double force = spring * (newTarget - currentLevel) - damping * velocity;
    velocity += force / mass * dt;
    currentLevel += velocity * dt;

    // Clamp to valid range (allow slight overshoot for underdamped response).
    currentLevel = jlimit (-0.1, 1.1, currentLevel);
}


//==============================================================================
//  LedComponent
//==============================================================================

LedComponent::LedComponent (const ComponentData& d,
                            juce::AudioProcessorValueTreeState& apvts)
    : DynamicComponent (d, apvts),
      colorOn  (d.colorOn),
      colorOff (d.colorOff),
      ledMode  (d.ledMode)
{
    startTimer (50); // ~20 FPS — LED doesn't need 60
}

//==============================================================================
void LedComponent::paint (juce::Graphics& g)
{
    using namespace juce;

    const auto bounds = getLocalBounds().toFloat();
    const auto size   = jmin (bounds.getWidth(), bounds.getHeight());
    const auto centre = bounds.getCentre();

    // LED circle centred in the component bounds.
    const Rectangle<float> ledRect (centre.getX() - size * 0.4f,
                                    centre.getY() - size * 0.4f,
                                    size * 0.8f,
                                    size * 0.8f);

    // Determine fill colour based on mode.
    Colour fillColour;

    if (ledMode == "saturation")
    {
        // Continuous interpolation between colourOff and colourOn.
        fillColour = colorOff.interpolatedWith (colorOn, static_cast<float> (value));
    }
    else
    {
        // on_off mode — discrete toggle at 0.5 threshold.
        fillColour = (value > 0.5) ? colorOn : colorOff;
    }

    // ── Glow / border effect ──────────────────────────────────────────────
    g.setColour (fillColour.withAlpha (0.3f));
    g.fillEllipse (ledRect.reduced (-2.0f));

    // ── Fill ──────────────────────────────────────────────────────────────
    g.setColour (fillColour);
    g.fillEllipse (ledRect);

    // ── Border ────────────────────────────────────────────────────────────
    g.setColour (Colours::black.withAlpha (0.5f));
    g.drawEllipse (ledRect, 1.0f);
}

//==============================================================================
void LedComponent::timerCallback()
{
    // Poll the APVTS parameter if we have one.
    if (apvtsPtr != nullptr && data.parameterId.isNotEmpty())
    {
        auto* param = apvtsPtr->getRawParameterValue (data.parameterId);
        if (param != nullptr)
            value = param->load();
    }

    repaint();
}

} // namespace pluginstudio
