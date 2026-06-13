/*
  ==============================================================================

   KnobComponent.h
   Created: 12 Jun 2026

   Rotary knob component that wraps a juce::Slider with RotaryVerticalDrag
   style and renders via FilmStripLookAndFeel.

  ==============================================================================
*/

#pragma once

#include "DynamicComponent.h"
#include "../lookandfeel/FilmStripLookAndFeel.h"

namespace pluginstudio
{

//==============================================================================
/**
    A rotary knob component driven by a juce::Slider with RotaryVerticalDrag
    style. The slider's LookAndFeel is set to a FilmStripLookAndFeel instance
    that renders frames from a vertical filmstrip image based on the slider
    position.

    Parameter binding is handled via juce::SliderAttachment created by
    attachParameter().
*/
class KnobComponent : public DynamicComponent
{
public:
    //==============================================================================
    /** Creates a KnobComponent from design data.

        Constructs the internal juce::Slider, sets its range from
        data.minValue / data.maxValue, applies the FilmStripLookAndFeel,
        and positions it within the component bounds.
    */
    KnobComponent (const ComponentData& data,
                   juce::AudioProcessorValueTreeState& apvts);

    /** @internal */
    ~KnobComponent() override = default;

    //==============================================================================
    /** Creates a SliderAttachment for data.parameterId if non-empty. */
    void attachParameter (juce::AudioProcessorValueTreeState& apvts) override;

    /** Makes the slider fill the entire component bounds. */
    void resized() override;

private:
    //==============================================================================
    std::unique_ptr<juce::Slider> slider;
    std::unique_ptr<FilmStripLookAndFeel> lookAndFeel;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (KnobComponent)
};

} // namespace pluginstudio
