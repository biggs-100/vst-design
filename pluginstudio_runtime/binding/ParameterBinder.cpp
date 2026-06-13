/*
  ==============================================================================

   ParameterBinder.cpp
   Created: 12 Jun 2026

   Implementation: factory dispatch for DynamicComponent creation and
   APVTS ParameterLayout generation from parsed PluginDesign data.

  ==============================================================================
*/

#include "ParameterBinder.h"

namespace pluginstudio
{

//==============================================================================
juce::OwnedArray<DynamicComponent> ParameterBinder::createComponents (
    const PluginDesign& design,
    juce::AudioProcessorValueTreeState& apvts)
{
    juce::OwnedArray<DynamicComponent> components;

    for (const auto& compData : design.components)
    {
        // Factory dispatch — creates the correct subclass or nullptr for
        // unknown types (a warning is logged inside create()).
        auto component = DynamicComponent::create (compData, apvts);

        if (component != nullptr)
        {
            // The component self-positions in its constructor from JSON
            // bounds. Explicit bounds call here is a safety net.
            component->setBounds (compData.x, compData.y,
                                  compData.width, compData.height);

            // Create APVTS attachment (SliderAttachment for knob,
            // ButtonAttachment for switch, no-op for VU/LED).
            component->attachParameter (apvts);

            components.add (component.release());
        }
        else
        {
            // create() already logged the warning; we skip the entry.
        }
    }

    return components;
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout
ParameterBinder::createLayout (const PluginDesign& design)
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    // Track already-registered parameterIds to avoid duplicate registration,
    // which would cause APVTS assertion failures.
    juce::StringArray registeredParams;

    for (const auto& compData : design.components)
    {
        // Only process components that declare a parameter binding.
        if (compData.parameterId.isEmpty())
            continue;

        // Skip duplicate parameterIds (shared across components).
        if (registeredParams.contains (compData.parameterId))
            continue;

        registeredParams.add (compData.parameterId);

        // Map component type to the appropriate APVTS parameter type.
        //   Knob   → AudioParameterFloat (range from JSON config)
        //   Switch → AudioParameterFloat (range from JSON config)
        //
        // VUMeter and LED are display-only by default — they poll the
        // parameter via timer if a registered parameterId is provided,
        // but layout registration for those types is deferred to the
        // consumer if needed.
        if (compData.type == "Knob" || compData.type == "Switch")
        {
            layout.add (std::make_unique<juce::AudioParameterFloat> (
                compData.parameterId,
                compData.id,
                juce::NormalisableRange<float> (
                    static_cast<float> (compData.minValue),
                    static_cast<float> (compData.maxValue)),
                static_cast<float> (compData.defaultValue)));
        }
    }

    return layout;
}

} // namespace pluginstudio
