/*
  ==============================================================================

   SwitchComponent.cpp
   Created: 12 Jun 2026

   Implementation: click-to-toggle TextButton with APVTS ButtonAttachment.

  ==============================================================================
*/

#include "SwitchComponent.h"

namespace pluginstudio
{

//==============================================================================
SwitchComponent::SwitchComponent (const ComponentData& d,
                                  juce::AudioProcessorValueTreeState& apvts)
    : DynamicComponent (d, apvts)
{
    // ── Create the toggle button ──────────────────────────────────────────
    button = std::make_unique<juce::TextButton> (data.id);

    // Use state labels if provided, otherwise default to "OFF" / "ON".
    juce::String offLabel = (data.states.size() > 0) ? data.states[0] : "OFF";
    juce::String onLabel  = (data.states.size() > 1) ? data.states[1] : "ON";

    button->setButtonText (offLabel);
    button->onClick = [this, offLabel, onLabel]
    {
        button->setButtonText (button->getToggleState() ? onLabel : offLabel);
    };

    button->setClickingTogglesState (true);
    button->setColour (juce::TextButton::buttonOnColourId,
                       juce::Colours::green);

    // ── Make visible ──────────────────────────────────────────────────────
    addAndMakeVisible (button.get());
}

//==============================================================================
void SwitchComponent::attachParameter (
    juce::AudioProcessorValueTreeState& apvts)
{
    if (data.parameterId.isNotEmpty())
    {
        buttonAttachment = std::make_unique<
            juce::AudioProcessorValueTreeState::ButtonAttachment> (
                apvts, data.parameterId, *button);
    }
}

//==============================================================================
void SwitchComponent::resized()
{
    button->setBounds (getLocalBounds());
}

} // namespace pluginstudio
