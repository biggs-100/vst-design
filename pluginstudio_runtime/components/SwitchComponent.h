/*
  ==============================================================================

   SwitchComponent.h
   Created: 12 Jun 2026

   Click-to-toggle switch component using a juce::TextButton with toggle state
   and ButtonAttachment for APVTS parameter binding.

  ==============================================================================
*/

#pragma once

#include "DynamicComponent.h"

namespace pluginstudio
{

//==============================================================================
/**
    A click-to-toggle switch component.

    Wraps a juce::TextButton configured with clickingTogglesState(). The
    button text reflects the state labels from data.states (first = OFF,
    second = ON). Parameter binding is handled via
    juce::ButtonAttachment created by attachParameter().

    The resolved design decision is to use a TextButton (not a rotary slider)
    for click-to-toggle behaviour.
*/
class SwitchComponent : public DynamicComponent
{
public:
    //==============================================================================
    /** Creates a SwitchComponent from design data.

        Constructs a TextButton labelled with data.states[0] ("OFF") /
        data.states[1] ("ON"), enables clickingTogglesState, and positions
        it within the component bounds.
    */
    SwitchComponent (const ComponentData& data,
                     juce::AudioProcessorValueTreeState& apvts);

    /** @internal */
    ~SwitchComponent() override = default;

    //==============================================================================
    /** Creates a ButtonAttachment for data.parameterId if non-empty. */
    void attachParameter (juce::AudioProcessorValueTreeState& apvts) override;

    /** Makes the button fill the entire component bounds. */
    void resized() override;

private:
    //==============================================================================
    std::unique_ptr<juce::TextButton> button;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment>
        buttonAttachment;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (SwitchComponent)
};

} // namespace pluginstudio
