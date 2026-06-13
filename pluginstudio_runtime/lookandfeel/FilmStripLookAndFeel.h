/*
  ==============================================================================

   FilmStripLookAndFeel.h
   Created: 12 Jun 2026

   Custom LookAndFeel that overrides drawRotarySlider() to crop and render
   frames from a vertical filmstrip image. Used by KnobComponent and
   SwitchComponent for filmstrip-based rotary controls.

  ==============================================================================
*/

#pragma once

#include "../pluginstudio_runtime.h"

namespace pluginstudio
{

//==============================================================================
/**
    A LookAndFeel that renders rotary sliders using frames from a vertical
    filmstrip image.

    The filmstrip image is loaded once from the component's asset path and
    cached via juce::ImageCache. On each draw call, the slider's proportional
    position is mapped to a frame index, the corresponding frame is cropped
    from the filmstrip, and drawn scaled to fill the slider bounds.

    If no valid filmstrip is loaded, drawRotarySlider() falls back to a simple
    circular knob with an indicator line.
*/
class FilmStripLookAndFeel : public juce::LookAndFeel_V4
{
public:
    //==============================================================================
    /** Creates a FilmStripLookAndFeel from component design data.

        Loads the filmstrip image specified by data.assetPath and computes
        frame dimensions from data.frames and data.frameHeight.

        @param data  The ComponentData describing the component's filmstrip
                     configuration (assetPath, frames, frameHeight).
    */
    FilmStripLookAndFeel (const ComponentData& data);

    //==============================================================================
    /** @internal */
    void drawRotarySlider (juce::Graphics& g,
                           int x, int y, int width, int height,
                           float sliderPos,
                           float rotaryStartAngle, float rotaryEndAngle,
                           juce::Slider& slider) override;

    //==============================================================================
    /** Returns true if a valid filmstrip image was loaded and is ready for rendering. */
    bool hasFilmstrip() const noexcept { return filmstrip.isValid(); }

private:
    //==============================================================================
    juce::Image filmstrip;
    int numFrames = 0;
    int frameHeight = 0;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (FilmStripLookAndFeel)
};

} // namespace pluginstudio
