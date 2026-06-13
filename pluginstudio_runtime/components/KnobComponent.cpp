/*
  ==============================================================================

   KnobComponent.cpp
   Created: 12 Jun 2026

   Implementation: rotary slider with FilmStripLookAndFeel and APVTS
   parameter attachment.

  ==============================================================================
*/

#include "KnobComponent.h"

namespace pluginstudio
{

//==============================================================================
KnobComponent::KnobComponent (const ComponentData& d,
                              juce::AudioProcessorValueTreeState& apvts)
    : DynamicComponent (d, apvts)
{
    // ── Create the rotary slider ──────────────────────────────────────────
    slider = std::make_unique<juce::Slider> (juce::Slider::RotaryVerticalDrag,
                                             juce::Slider::NoTextBox);

    slider->setRange (data.minValue, data.maxValue, 0.0);
    slider->setValue (data.defaultValue);
    slider->setDoubleClickReturnValue (true, data.defaultValue);

    // ── Apply FilmStripLookAndFeel ────────────────────────────────────────
    lookAndFeel = std::make_unique<FilmStripLookAndFeel> (data);
    slider->setLookAndFeel (lookAndFeel.get());

    // ── Make visible ──────────────────────────────────────────────────────
    addAndMakeVisible (slider.get());
}

//==============================================================================
void KnobComponent::attachParameter (juce::AudioProcessorValueTreeState& apvts)
{
    if (data.parameterId.isNotEmpty())
    {
        attachment = std::make_unique<Attachment> (
            apvts, data.parameterId, *slider);
    }
}

//==============================================================================
void KnobComponent::resized()
{
    slider->setBounds (getLocalBounds());
}

} // namespace pluginstudio
