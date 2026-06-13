/*
  ==============================================================================

   ParameterBinder.h
   Created: 12 Jun 2026

   Factory and binding orchestrator for PluginStudio runtime components.

   ParameterBinder provides two static entry points:
     - createComponents()   — instantiates DynamicComponent subclasses from a
                              parsed PluginDesign and attaches their APVTS
                              parameter bindings.
     - createLayout()       — builds an AudioProcessorValueTreeState::ParameterLayout
                              from the design's component descriptions, suitable
                              for use in AudioProcessor::getParameterLayout().

   These are called by the higher-level pluginstudio::loadInto() and
   pluginstudio::createParameterLayout() free functions.

  ==============================================================================
*/

#pragma once

#include "../pluginstudio_runtime.h"
#include "../components/DynamicComponent.h"

namespace pluginstudio
{

//==============================================================================
/**
    Orchestrates component creation and parameter binding from a parsed
    PluginDesign.

    Usage:
        @code
        auto design = DesignParser::parse (designFile);
        auto layout = ParameterBinder::createLayout (design);
        auto components = ParameterBinder::createComponents (design, apvts);
        @endcode

    Consumers should prefer the higher-level free functions
    (pluginstudio::loadInto / pluginstudio::createParameterLayout) over
    calling ParameterBinder directly.
*/
class ParameterBinder
{
public:
    //==============================================================================
    /** Creates DynamicComponent instances for every entry in the design's
        component list, attaches their APVTS parameter bindings, and returns
        them in an OwnedArray.

        The caller (or pluginstudio::loadInto()) owns the returned array and
        is responsible for keeping it alive as long as the components are
        displayed in the parent component.

        @param design   The parsed PluginDesign (from DesignParser).
        @param apvts    The AudioProcessorValueTreeState for parameter binding.
        @returns        An OwnedArray containing one DynamicComponent per
                        ui_components[] entry. Unknown types are skipped
                        with a logged warning.
    */
    static juce::OwnedArray<DynamicComponent> createComponents (
        const PluginDesign& design,
        juce::AudioProcessorValueTreeState& apvts);

    //==============================================================================
    /** Builds a ParameterLayout from the design's component list.

        For each component that has a non-empty parameterId and is of type
        Knob or Switch, an AudioParameterFloat is created with the range
        specified in the component data.

        Duplicate parameterIds are registered only once to avoid APVTS
        assertion failures.

        @param design  The parsed PluginDesign (from DesignParser).
        @returns       A ParameterLayout ready to pass to the APVTS constructor.
    */
    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout (
        const PluginDesign& design);

private:
    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE (ParameterBinder)
};

} // namespace pluginstudio
