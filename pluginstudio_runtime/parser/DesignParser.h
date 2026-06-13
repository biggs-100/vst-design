/*
  ==============================================================================

   DesignParser.h
   Created: 12 Jun 2026

   Parses .plugindesign JSON (v1 schema) into PluginDesign structs.
   Both file-based and string-based entry points are provided.

  ==============================================================================
*/

#pragma once

#include "../pluginstudio_runtime.h"

namespace pluginstudio
{

//==============================================================================
/** Parses .plugindesign JSON files (v1 schema) into PluginDesign structs.

    Usage:
        @code
        auto design = DesignParser::parse (designFile);
        // or for testing:
        auto design = DesignParser::parseFromString (jsonText);
        @endcode

    On parse failure, errors are logged via juce::Logger and an empty/default
    PluginDesign (schemaVersion = 0) is returned.
*/
class DesignParser
{
public:
    //==============================================================================
    /** Parses a .plugindesign JSON file from disk.
        Asset paths in components are resolved relative to the JSON file's
        parent directory.
    */
    static PluginDesign parse (const juce::File& jsonFile);

    /** Parses .plugindesign JSON from a raw string.
        Intended primarily for unit testing — asset path resolution requires a
        source file, so relative paths will not be resolved with this overload.
    */
    static PluginDesign parseFromString (const juce::String& jsonText);

private:
    //==============================================================================
    /** Internal parse implementation that works on a parsed juce::var tree. */
    static PluginDesign parseJsonVar (const juce::var& json,
                                      const juce::File& jsonFile);

    /** Extracts a single ComponentData from a ui_components[] entry. */
    static ComponentData parseComponent (const juce::var& compVar,
                                         const juce::File& jsonFile);

    /** Returns the current supported schema version (1). */
    static int currentSchemaVersion();

    /** Parses a hex colour string (#RRGGBB or #AARRGGBB) with fallback. */
    static juce::Colour parseColour (const juce::var& colourVar,
                                     const juce::Colour& fallback);

    JUCE_DECLARE_NON_COPYABLE (DesignParser)
};

} // namespace pluginstudio
