/*
  ==============================================================================

   FilmStripLookAndFeel.cpp
   Created: 12 Jun 2026

   Implementation: frame calculation, filmstrip cropping, fallback rendering.

  ==============================================================================
*/

#include "FilmStripLookAndFeel.h"

namespace pluginstudio
{

//==============================================================================
FilmStripLookAndFeel::FilmStripLookAndFeel (const ComponentData& data)
    : juce::LookAndFeel_V4(),
      numFrames (data.frames)
{
    // Nothing to load if there's no asset path or no frames.
    if (data.assetPath.isEmpty() || numFrames <= 0)
    {
        filmstrip = juce::Image {};
        numFrames = 0;
        frameHeight = 0;
        return;
    }

    // Load the filmstrip image (ImageCache handles disk caching).
    filmstrip = juce::ImageCache::getFromFile (juce::File (data.assetPath));

    if (! filmstrip.isValid())
    {
        juce::Logger::writeToLog (
            "FilmStripLookAndFeel: failed to load filmstrip from \""
            + data.assetPath + "\"");
        numFrames = 0;
        frameHeight = 0;
        return;
    }

    // Validate that the image divides evenly into the requested number of frames.
    const int imageHeight = filmstrip.getHeight();

    if (imageHeight % numFrames != 0)
    {
        juce::Logger::writeToLog (
            "FilmStripLookAndFeel: filmstrip dimensions do not divide evenly. "
            + juce::String (imageHeight) + " / " + juce::String (numFrames)
            + " = " + juce::String (static_cast<double> (imageHeight) / numFrames, 2));
        filmstrip = juce::Image {};
        numFrames = 0;
        frameHeight = 0;
        return;
    }

    // Use explicit frame height from data, or derive from image dimensions.
    frameHeight = (data.frameHeight > 0) ? data.frameHeight : (imageHeight / numFrames);
}

//==============================================================================
void FilmStripLookAndFeel::drawRotarySlider (juce::Graphics& g,
                                             int x, int y, int width, int height,
                                             float sliderPos,
                                             float rotaryStartAngle,
                                             float rotaryEndAngle,
                                             juce::Slider& /*slider*/)
{
    // ── Filmstrip path ────────────────────────────────────────────────────
    if (filmstrip.isValid() && numFrames > 0)
    {
        // Map slider position [0, 1] to frame index [0, numFrames - 1].
        const int frameIndex = juce::jlimit (0, numFrames - 1,
            static_cast<int> (std::floor (sliderPos * (numFrames - 1) + 0.5f)));

        // The source rectangle is vertically positioned within the filmstrip.
        const int sourceY = frameIndex * frameHeight;
        const juce::Rectangle<int> sourceRect (0, sourceY,
                                               filmstrip.getWidth(), frameHeight);

        g.drawImage (filmstrip, x, y, width, height,
                     sourceRect.getX(), sourceRect.getY(),
                     sourceRect.getWidth(), sourceRect.getHeight());
        return;
    }

    // ── Fallback: basic circular rotary knob ──────────────────────────────
    auto bounds = juce::Rectangle<int> (x, y, width, height)
                      .toFloat()
                      .reduced (4.0f);
    auto centre = bounds.getCentre();
    auto radius = juce::jmin (bounds.getWidth(), bounds.getHeight()) / 2.0f;

    // Outer circle
    g.setColour (juce::Colours::darkgrey);
    g.fillEllipse (bounds.reduced (2.0f));

    g.setColour (juce::Colours::lightgrey);
    g.drawEllipse (bounds.reduced (2.0f), 1.0f);

    // Indicator line
    const float angle = rotaryStartAngle
                        + sliderPos * (rotaryEndAngle - rotaryStartAngle);
    juce::Path p;
    p.addLine (centre.getX(), centre.getY(),
               centre.getX() + radius * std::cos (angle),
               centre.getY() + radius * std::sin (angle));

    g.setColour (juce::Colours::orange);
    g.strokePath (p, juce::PathStrokeType (2.0f));
}

} // namespace pluginstudio
