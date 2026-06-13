/*
  ==============================================================================

   BEGIN_JUCE_MODULE_DECLARATION

   ID:            pluginstudio_runtime
   vendor:        PluginStudio
   version:       1.0.0
   name:          PluginStudio Runtime Module
   description:   Dynamic JSON UI loader — parses .plugindesign files and
                  builds JUCE plugin UIs at runtime with parameter bindings,
                  filmstrip rendering, VU metering, and LED indicators.
   dependencies:  juce_core, juce_graphics, juce_gui_basics,
                  juce_audio_processors, juce_audio_utils
   website:       https://github.com/pluginstudio

   END_JUCE_MODULE_DECLARATION

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <juce_graphics/juce_graphics.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>

#if ! DONT_SET_USING_JUCE_NAMESPACES
 using namespace juce;
#endif

//==============================================================================
/** PluginStudio Runtime — public API for loading .plugindesign JSON files
    and building a full plugin UI with parameter bindings at runtime.

    Usage:
        @code
        // In AudioProcessor::getParameterLayout()
        auto layout = pluginstudio::createParameterLayout (designFile);

        // In AudioProcessorEditor header:
        juce::OwnedArray<pluginstudio::DynamicComponent> pluginStudioComponents;

        // In AudioProcessorEditor constructor:
        pluginStudioComponents = pluginstudio::loadInto (*this, designFile, apvts);
        @endcode
*/
namespace pluginstudio
{

//==============================================================================
// Forward declarations for internal types exposed for testing / custom hosts.
struct PluginDesign;
struct ComponentData;
class DynamicComponent;

//==============================================================================
/** Parses the given .plugindesign JSON file and returns a ParameterLayout
    populated with every parameter declared across all ui_components.

    Call this in AudioProcessor::getParameterLayout() or the processor
    constructor when building the AudioProcessorValueTreeState.

    @param designJson  A .plugindesign JSON file on disk.
    @returns           A ParameterLayout ready to pass to APVTS constructor.
*/
inline juce::AudioProcessorValueTreeState::ParameterLayout
createParameterLayout (const juce::File& designJson)
{
    auto design = DesignParser::parse (designJson);
    return ParameterBinder::createLayout (design);
}

/** Creates DynamicComponent instances from the given .plugindesign JSON
    file, adds them as children of the specified parent Component, binds
    their parameters via APVTS attachments, and returns the OwnedArray
    for the caller to store as a member variable.

    This is the primary entry point for the module. The caller MUST keep
    the returned OwnedArray alive for the lifetime of the parent component
    (typically as a member of the AudioProcessorEditor subclass).

    Must be called on the JUCE message thread.

    Usage:
        @code
        // In PluginEditor.h:
        juce::OwnedArray<pluginstudio::DynamicComponent> comps;

        // In PluginEditor constructor:
        comps = pluginstudio::loadInto (*this, designFile, apvts);
        @endcode

    @param parent      The parent Component that will display the children.
    @param designJson  A .plugindesign JSON file on disk.
    @param apvts       The AudioProcessorValueTreeState to bind parameters to.
    @returns           An OwnedArray of DynamicComponent instances. Store this
                       as a member to keep components alive.
*/
inline juce::OwnedArray<DynamicComponent>
loadInto (juce::Component& parent,
          const juce::File& designJson,
          juce::AudioProcessorValueTreeState& apvts)
{
    auto design = DesignParser::parse (designJson);
    parent.setSize (design.baseWidth, design.baseHeight);

    auto components = ParameterBinder::createComponents (design, apvts);

    for (auto* comp : components)
        parent.addAndMakeVisible (comp);

    return components;
}

} // namespace pluginstudio

//==============================================================================
// Internal data structures (included here so the master header is self-contained)
#include "parser/DesignData.h"
#include "parser/DesignParser.h"
#include "binding/ParameterBinder.h"
