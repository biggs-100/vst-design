/*
  ==============================================================================

   DesignData.h
   Created: 12 Jun 2026

   Internal data structures representing a parsed .plugindesign JSON file.

   These structs are exposed in the master header for testing and custom
   host use, but consumers should prefer the higher-level API
   (createParameterLayout / loadComponents) when possible.

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>

namespace pluginstudio
{

//==============================================================================
/** Describes a single UI component extracted from a ui_components[] entry
    in the .plugindesign JSON.

    Each ComponentData carries both common positioning / identity fields and
    per-type configuration fields that are only meaningful for specific types:
        Knob       — minValue, maxValue, defaultValue
        Switch     — states[], frames
        VUMeter    — needleLength, damping
        LED        — ledMode, colorOn, colorOff
*/
struct ComponentData
{
    // ── Identity & layout (all types) ────────────────────────────────────
    juce::String type;              // "Knob", "Switch", "VUMeter", "LED"
    juce::String id;                // Unique component identifier
    juce::String parameterId;       // APVTS parameter key (empty for display-only)
    int x = 0;
    int y = 0;
    int width = 80;
    int height = 80;

    // ── Filmstrip (Knob, Switch) ─────────────────────────────────────────
    juce::String assetPath;         // Path to filmstrip image (relative to JSON)
    int frames = 0;                 // Total frames in the filmstrip
    int frameWidth = 0;             // Width of a single frame (auto if 0)
    int frameHeight = 0;            // Height of a single frame (auto if 0)

    // ── Per-type config ──────────────────────────────────────────────────
    double minValue = 0.0;          // Knob / Switch
    double maxValue = 1.0;          // Knob / Switch
    double defaultValue = 0.5;      // Knob / Switch

    juce::StringArray states;       // Switch — discrete state labels

    double needleLength = 0.8;      // VUMeter — % of component height
    double damping = 0.7;           // VUMeter — ballistics damping coefficient

    juce::String ledMode = "on_off";       // LED — "on_off" | "saturation"
    juce::Colour colorOn = juce::Colours::red;
    juce::Colour colorOff = juce::Colours::darkgrey;
};

//==============================================================================
/** Top-level model representing a complete .plugindesign JSON file.
    Populated by DesignParser::parse().
*/
struct PluginDesign
{
    juce::String name;                      // plugin_meta.name
    int baseWidth = 800;                    // plugin_meta.base_width
    int baseHeight = 600;                   // plugin_meta.base_height
    int schemaVersion = 1;                  // top-level schema_version

    juce::Array<ComponentData> components;  // ui_components[]
};

} // namespace pluginstudio
