/*
  ==============================================================================

   DynamicComponent.cpp
   Created: 12 Jun 2026

   Implementation: constructor self-positions from JSON bounds, factory method
   dispatches on ComponentData::type to create the correct subclass.

  ==============================================================================
*/

#include "DynamicComponent.h"
#include "KnobComponent.h"
#include "SwitchComponent.h"
#include "OutputComponents.h"

namespace pluginstudio
{

//==============================================================================
DynamicComponent::DynamicComponent (const ComponentData& d,
                                    juce::AudioProcessorValueTreeState& apvts)
    : data (d),
      apvtsPtr (&apvts)
{
    setBounds (data.x, data.y, data.width, data.height);
}

//==============================================================================
std::unique_ptr<DynamicComponent> DynamicComponent::create (
    const ComponentData& data,
    juce::AudioProcessorValueTreeState& apvts)
{
    if (data.type == "Knob")
        return std::make_unique<KnobComponent> (data, apvts);

    if (data.type == "Switch")
        return std::make_unique<SwitchComponent> (data, apvts);

    if (data.type == "VUMeter")
        return std::make_unique<VUMeterComponent> (data, apvts);

    if (data.type == "LED")
        return std::make_unique<LedComponent> (data, apvts);

    // Unknown type — log warning and return nullptr.
    juce::Logger::writeToLog (
        "DynamicComponent::create: Unknown component type '"
        + data.type + "' for id '" + data.id + "'");
    return nullptr;
}

} // namespace pluginstudio
