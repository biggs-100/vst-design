/*
  ==============================================================================

   DesignParser.cpp
   Created: 12 Jun 2026

   Implementation: JSON deserialization, schema validation, component
   extraction, and asset path resolution for the .plugindesign v1 schema.

  ==============================================================================
*/

#include "DesignParser.h"

namespace pluginstudio
{

//==============================================================================
int DesignParser::currentSchemaVersion()
{
    return 1;
}

//==============================================================================
PluginDesign DesignParser::parse (const juce::File& jsonFile)
{
    if (! jsonFile.existsAsFile())
    {
        juce::Logger::writeToLog ("DesignParser: File not found — "
                                  + jsonFile.getFullPathName());
        return {};
    }

    juce::var json;
    auto result = juce::JSON::parse (jsonFile, json);

    if (result.failed())
    {
        juce::Logger::writeToLog ("DesignParser: Failed to parse JSON — "
                                  + result.getErrorMessage());
        return {};
    }

    return parseJsonVar (json, jsonFile);
}

//==============================================================================
PluginDesign DesignParser::parseFromString (const juce::String& jsonText)
{
    if (jsonText.trim().isEmpty())
    {
        juce::Logger::writeToLog ("DesignParser: Empty JSON input");
        return {};
    }

    auto json = juce::JSON::parse (jsonText);

    if (json.isVoid() || json.isUndefined())
    {
        juce::Logger::writeToLog ("DesignParser: Failed to parse JSON string");
        return {};
    }

    // No source file available — pass a null File so relative asset paths
    // are left unresolved (tests can provide absolute paths or empty strings).
    return parseJsonVar (json, juce::File{});
}

//==============================================================================
PluginDesign DesignParser::parseJsonVar (const juce::var& json,
                                          const juce::File& jsonFile)
{
    PluginDesign design;

    // ── Validate root is an object ───────────────────────────────────────
    auto* obj = json.getDynamicObject();

    if (obj == nullptr)
    {
        juce::Logger::writeToLog ("DesignParser: JSON root is not an object");
        return {};
    }

    auto& props = obj->getProperties();

    // ── Schema version check ─────────────────────────────────────────────
    if (! props.contains (juce::Identifier ("schema_version")))
    {
        juce::Logger::writeToLog ("DesignParser: Missing schema_version");
        return {};
    }

    int schemaVersion = static_cast<int> (props["schema_version"]);

    if (schemaVersion > currentSchemaVersion())
    {
        juce::Logger::writeToLog ("DesignParser: Unsupported schema version: "
                                  + juce::String (schemaVersion)
                                  + ". Supported: "
                                  + juce::String (currentSchemaVersion()));
        return {};
    }

    if (schemaVersion < currentSchemaVersion())
    {
        juce::Logger::writeToLog ("DesignParser: Loading older schema version: "
                                  + juce::String (schemaVersion));
    }

    design.schemaVersion = schemaVersion;

    // ── Extract plugin_meta ──────────────────────────────────────────────
    auto meta = props["plugin_meta"];
    auto* metaObj = meta.getDynamicObject();

    if (metaObj != nullptr)
    {
        auto& metaProps = metaObj->getProperties();

        design.name = metaProps["name"].toString();

        auto toInt = [] (const juce::var& v, int fallback)
        {
            if (v.isDouble())  return juce::roundToInt (static_cast<double> (v));
            if (v.isInt())     return static_cast<int> (v);
            if (v.isInt64())   return static_cast<int> (static_cast<int64_t> (v));
            return fallback;
        };

        design.baseWidth  = juce::jmax (1, toInt (metaProps["base_width"],  800));
        design.baseHeight = juce::jmax (1, toInt (metaProps["base_height"], 600));
    }

    // ── Extract ui_components ────────────────────────────────────────────
    auto componentsVar = props["ui_components"];

    if (! componentsVar.isArray())
    {
        juce::Logger::writeToLog ("DesignParser: Missing required field: "
                                  "ui_components");
        return design;
    }

    auto* compArray = componentsVar.getArray();
    jassert (compArray != nullptr);

    for (auto& compVar : *compArray)
    {
        auto comp = parseComponent (compVar, jsonFile);
        design.components.add (comp);
    }

    return design;
}

//==============================================================================
ComponentData DesignParser::parseComponent (const juce::var& compVar,
                                             const juce::File& jsonFile)
{
    ComponentData comp;
    auto* obj = compVar.getDynamicObject();

    if (obj == nullptr)
    {
        juce::Logger::writeToLog ("DesignParser: Component entry is not "
                                  "an object");
        return comp;
    }

    auto& props = obj->getProperties();

    // ── Local helpers ────────────────────────────────────────────────────
    auto toInt = [] (const juce::var& v, int fallback)
    {
        if (v.isDouble())  return juce::roundToInt (static_cast<double> (v));
        if (v.isInt())     return static_cast<int> (v);
        if (v.isInt64())   return static_cast<int> (static_cast<int64_t> (v));
        return fallback;
    };

    auto toString = [] (const juce::var& v) -> juce::String
    {
        return v.isVoid() ? juce::String() : v.toString();
    };

    // ── Core fields ──────────────────────────────────────────────────────
    comp.type        = toString (props["type"]);
    comp.id          = toString (props["id"]);
    comp.parameterId = toString (props["parameter_id"]);

    // Validate type
    const juce::StringArray validTypes { "Knob", "Switch", "VUMeter", "LED" };

    if (! validTypes.contains (comp.type))
    {
        juce::Logger::writeToLog ("DesignParser: Unknown component type '"
                                  + comp.type + "' for id '" + comp.id + "'");
    }

    // Warn on empty id
    if (comp.id.isEmpty())
    {
        juce::Logger::writeToLog ("DesignParser: Component with empty id");
    }

    // ── Position and size ────────────────────────────────────────────────
    comp.x      = toInt (props["x"],       0);
    comp.y      = toInt (props["y"],       0);
    comp.width  = toInt (props["width"],   80);
    comp.height = toInt (props["height"],  80);

    // ── Asset path (relative → absolute) ─────────────────────────────────
    auto rawPath = toString (props["asset_path"]);

    if (rawPath.isNotEmpty())
    {
        juce::File assetFile (rawPath);

        if (! assetFile.isAbsolute() && jsonFile != juce::File{})
        {
            assetFile = jsonFile.getParentDirectory().getChildFile (rawPath);
        }

        comp.assetPath = assetFile.getFullPathName();
    }
    // else: comp.assetPath stays empty (default)

    // ── Filmstrip frames ─────────────────────────────────────────────────
    comp.frames       = toInt (props["frames"],       0);
    comp.frameWidth   = toInt (props["frameWidth"],   0);
    comp.frameHeight  = toInt (props["frameHeight"],  0);

    // If frames > 0 but frameWidth / frameHeight are 0, the image-loading
    // code will compute them from the actual image dimensions.

    // ── Per-type config ──────────────────────────────────────────────────
    auto configVar = props["config"];
    auto* configObj = configVar.getDynamicObject();

    if (configObj != nullptr)
    {
        auto& config = configObj->getProperties();

        if (comp.type == "Knob")
        {
            comp.minValue     = static_cast<double> (config.getWithDefault ("min",     0.0));
            comp.maxValue     = static_cast<double> (config.getWithDefault ("max",     1.0));
            comp.defaultValue = static_cast<double> (config.getWithDefault ("default", 0.5));
        }
        else if (comp.type == "Switch")
        {
            auto statesVar = config["states"];

            if (auto* statesArray = statesVar.getArray())
            {
                for (auto& s : *statesArray)
                    comp.states.add (s.toString());
            }
        }
        else if (comp.type == "VUMeter")
        {
            comp.needleLength = static_cast<double> (config.getWithDefault ("needleLength", 0.8));
            comp.damping      = static_cast<double> (config.getWithDefault ("damping",      0.7));
        }
        else if (comp.type == "LED")
        {
            comp.ledMode  = config.getWithDefault ("ledMode", "on_off").toString();
            comp.colorOn  = parseColour (config["colorOn"],  juce::Colours::red);
            comp.colorOff = parseColour (config["colorOff"], juce::Colours::darkgrey);
        }
    }

    return comp;
}

//==============================================================================
juce::Colour DesignParser::parseColour (const juce::var& colourVar,
                                         const juce::Colour& fallback)
{
    auto str = colourVar.toString().trim();

    if (str.isEmpty())
        return fallback;

    // juce::Colour::fromString handles "0xAARRGGBB" but not "#RRGGBB".
    // Convert CSS-style hex to the format JUCE expects.
    if (str.startsWith ("#"))
    {
        auto hex = str.substring (1);

        if (hex.length() == 6)
            return juce::Colour::fromString ("0xff" + hex);

        if (hex.length() == 8)
            return juce::Colour::fromString ("0x" + hex);

        // Unknown format after # — use fallback
        return fallback;
    }

    // Try direct JUCE parse (handles "0x..." and named colours).
    // fromString returns transparent black (0x00000000) for unparseable input.
    auto parsed = juce::Colour::fromString (str);

    if (parsed.getARGB() != 0)
        return parsed;

    return fallback;
}

} // namespace pluginstudio
