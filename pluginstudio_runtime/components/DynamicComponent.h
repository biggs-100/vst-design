/*
  ==============================================================================

   DynamicComponent.h
   Created: 12 Jun 2026

   Abstract base class for all dynamic UI components created from JSON design
   data. Provides a factory method that dispatches on ComponentData::type to
   create the appropriate concrete subclass.

   Each DynamicComponent self-positions from JSON bounds at construction and
   stores a reference to the AudioProcessorValueTreeState for parameter
   binding.

  ==============================================================================
*/

#pragma once

#include "../pluginstudio_runtime.h"

namespace pluginstudio
{

//==============================================================================
/**
    Abstract base for all PluginStudio runtime components.

    Subclasses must implement attachParameter() to create the appropriate
    APVTS attachment for their parameter type. Output-only components
    (VUMeter, LED) implement attachParameter() as a no-op and instead poll
    the parameter value via a timer.

    @see KnobComponent, SwitchComponent, VUMeterComponent, LedComponent
*/
class DynamicComponent : public juce::Component
{
public:
    //==============================================================================
    /** Constructs a DynamicComponent from design data.
        The component is automatically positioned using data.x/y/width/height.
    */
    DynamicComponent (const ComponentData& data,
                      juce::AudioProcessorValueTreeState& apvts);

    /** @internal */
    ~DynamicComponent() override = default;

    //==============================================================================
    /** Creates and binds the appropriate APVTS attachment for this component.

        For KnobComponent / SwitchComponent this creates a SliderAttachment
        or ButtonAttachment. For VUMeterComponent / LedComponent this is a
        no-op (they poll the parameter value via timer).
    */
    virtual void attachParameter (juce::AudioProcessorValueTreeState& apvts) = 0;

    //==============================================================================
    /** Returns the component's unique identifier from the JSON design. */
    juce::String getComponentId() const noexcept { return data.id; }

    /** Returns the APVTS parameter key, or empty string if display-only. */
    juce::String getParameterId() const noexcept { return data.parameterId; }

    /** Returns a const reference to the parsed design data. */
    const ComponentData& getData() const noexcept { return data; }

    //==============================================================================
    /** Factory method: creates the correct DynamicComponent subclass based on
        ComponentData::type.

        @param data    Parsed component design data from the JSON.
        @param apvts   The AudioProcessorValueTreeState for parameter binding.
        @returns       A unique_ptr to the created component, or nullptr for
                       unknown types (a warning is logged).
    */
    static std::unique_ptr<DynamicComponent> create (
        const ComponentData& data,
        juce::AudioProcessorValueTreeState& apvts);

protected:
    //==============================================================================
    ComponentData data;
    juce::AudioProcessorValueTreeState* apvtsPtr = nullptr;

    // Shared attachment storage (reused by KnobComponent for SliderAttachment).
    using Attachment = juce::AudioProcessorValueTreeState::SliderAttachment;
    std::unique_ptr<Attachment> attachment;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (DynamicComponent)
};

} // namespace pluginstudio
