/*
  ==============================================================================

   ParserTests.cpp
   Created: 12 Jun 2026

   Tests for DesignParser: JSON parsing, schema version validation, and
   component data extraction.

   Tests use parseFromString() which bypasses file I/O and asset path
   resolution, making it suitable for unit testing.

   ==============================================================================
*/

#include <pluginstudio_runtime/pluginstudio_runtime.h>
#include <iostream>
#include <cassert>

//==============================================================================
void testParserBasic()
{
    // Valid minimal JSON with one knob component
    juce::String json = R"({
        "schema_version": 1,
        "plugin_meta": {
            "name": "TestComp",
            "base_width": 800,
            "base_height": 600
        },
        "ui_components": [
            {
                "type": "Knob",
                "id": "gain",
                "parameter_id": "param_gain",
                "x": 100,
                "y": 200,
                "width": 80,
                "height": 80,
                "frames": 100
            }
        ]
    })";

    auto design = pluginstudio::DesignParser::parseFromString (json);

    assert (design.schemaVersion == 1);
    assert (design.name == "TestComp");
    assert (design.baseWidth == 800);
    assert (design.baseHeight == 600);
    assert (design.components.size() == 1);

    const auto& comp = design.components[0];
    assert (comp.type == "Knob");
    assert (comp.id == "gain");
    assert (comp.parameterId == "param_gain");
    assert (comp.x == 100);
    assert (comp.y == 200);
    assert (comp.width == 80);
    assert (comp.height == 80);
    assert (comp.frames == 100);

    std::cout << "  \xE2\x9C\x93  Parser: basic JSON parsing\n";
}

//==============================================================================
void testParserSchemaVersion()
{
    // ── Future schema version is rejected ───────────────────────────────
    {
        juce::String futureJson = R"({
            "schema_version": 999,
            "plugin_meta": {
                "name": "Future",
                "base_width": 800,
                "base_height": 600
            },
            "ui_components": [
                { "type": "Knob", "id": "k1", "x": 10, "y": 10,
                  "width": 50, "height": 50 }
            ]
        })";

        auto design = pluginstudio::DesignParser::parseFromString (futureJson);

        // On version rejection the parser returns a default PluginDesign.
        // The design should have NO parsed components and the name should
        // be empty (meta parsing was skipped).
        assert (design.components.size() == 0);
        assert (design.name.isEmpty());

        std::cout << "  \xE2\x9C\x93  Parser: future schema version 999 rejected\n";
    }

    // ── Missing schema_version is rejected ─────────────────────────────
    {
        juce::String missingVersionJson = R"({
            "plugin_meta": {
                "name": "NoSchema",
                "base_width": 800,
                "base_height": 600
            },
            "ui_components": []
        })";

        auto design = pluginstudio::DesignParser::parseFromString (missingVersionJson);

        // Without schema_version the parser returns default, empty design.
        assert (design.components.size() == 0);
        assert (design.name.isEmpty());

        std::cout << "  \xE2\x9C\x93  Parser: missing schema_version rejected\n";
    }

    // ── Schema version 0 is accepted (older version, logged, but allowed) ──
    {
        juce::String oldVersionJson = R"({
            "schema_version": 0,
            "plugin_meta": {
                "name": "Legacy",
                "base_width": 800,
                "base_height": 600
            },
            "ui_components": []
        })";

        auto design = pluginstudio::DesignParser::parseFromString (oldVersionJson);

        // Schema version 0 < currentVersion (1) — accepted as older format.
        assert (design.schemaVersion == 0);
        assert (design.name == "Legacy");

        std::cout << "  \xE2\x9C\x93  Parser: older schema version 0 accepted\n";
    }
}

//==============================================================================
void testParserEdgeCases()
{
    // ── Missing ui_components field ─────────────────────────────────────
    {
        juce::String noCompsJson = R"({
            "schema_version": 1,
            "plugin_meta": {
                "name": "NoComps",
                "base_width": 800,
                "base_height": 600
            }
        })";

        auto design = pluginstudio::DesignParser::parseFromString (noCompsJson);

        // Meta data should still be populated, but components should be empty.
        assert (design.name == "NoComps");
        assert (design.baseWidth == 800);
        assert (design.baseHeight == 600);
        assert (design.components.size() == 0);

        std::cout << "  \xE2\x9C\x93  Parser: missing ui_components — meta "
                     "extracted, empty components\n";
    }

    // ── Empty component array ──────────────────────────────────────────
    {
        juce::String emptyCompsJson = R"({
            "schema_version": 1,
            "plugin_meta": {
                "name": "Empty",
                "base_width": 800,
                "base_height": 600
            },
            "ui_components": []
        })";

        auto design = pluginstudio::DesignParser::parseFromString (emptyCompsJson);
        assert (design.components.size() == 0);
        assert (design.name == "Empty");

        std::cout << "  \xE2\x9C\x93  Parser: empty ui_components array\n";
    }

    // ── Multiple components of different types ─────────────────────────
    {
        juce::String multiJson = R"({
            "schema_version": 1,
            "plugin_meta": {
                "name": "Multi",
                "base_width": 800,
                "base_height": 600
            },
            "ui_components": [
                {
                    "type": "Knob",
                    "id": "gain",
                    "parameter_id": "param_gain",
                    "x": 10, "y": 10, "width": 80, "height": 80
                },
                {
                    "type": "Switch",
                    "id": "bypass",
                    "parameter_id": "param_bypass",
                    "x": 100, "y": 10, "width": 60, "height": 30
                },
                {
                    "type": "VUMeter",
                    "id": "vu_out",
                    "parameter_id": "param_level",
                    "x": 200, "y": 50, "width": 150, "height": 100
                },
                {
                    "type": "LED",
                    "id": "clip_led",
                    "parameter_id": "param_clip",
                    "x": 400, "y": 10, "width": 20, "height": 20
                }
            ]
        })";

        auto design = pluginstudio::DesignParser::parseFromString (multiJson);
        assert (design.components.size() == 4);
        assert (design.components[0].type == "Knob");
        assert (design.components[1].type == "Switch");
        assert (design.components[2].type == "VUMeter");
        assert (design.components[3].type == "LED");

        // Verify each component id
        assert (design.components[0].id == "gain");
        assert (design.components[1].id == "bypass");
        assert (design.components[2].id == "vu_out");
        assert (design.components[3].id == "clip_led");

        std::cout << "  \xE2\x9C\x93  Parser: multiple component types parsed\n";
    }

    // ── Config block extraction for VU meter ───────────────────────────
    {
        juce::String vuConfigJson = R"({
            "schema_version": 1,
            "plugin_meta": {
                "name": "VUTest",
                "base_width": 800,
                "base_height": 600
            },
            "ui_components": [
                {
                    "type": "VUMeter",
                    "id": "vu_main",
                    "parameter_id": "param_level",
                    "x": 20, "y": 20, "width": 200, "height": 120,
                    "config": {
                        "needleLength": 0.85,
                        "damping": 0.9
                    }
                }
            ]
        })";

        auto design = pluginstudio::DesignParser::parseFromString (vuConfigJson);
        assert (design.components.size() == 1);

        const auto& vu = design.components[0];
        assert (vu.type == "VUMeter");
        assert (vu.needleLength == 0.85);
        assert (vu.damping == 0.9);

        std::cout << "  \xE2\x9C\x93  Parser: VU config fields (needleLength, "
                     "damping) extracted\n";
    }

    // ── Config block extraction for Knob (min/max/default) ─────────────
    {
        juce::String knobConfigJson = R"({
            "schema_version": 1,
            "plugin_meta": {
                "name": "KnobConfig",
                "base_width": 400,
                "base_height": 300
            },
            "ui_components": [
                {
                    "type": "Knob",
                    "id": "freq",
                    "parameter_id": "param_freq",
                    "x": 10, "y": 10, "width": 80, "height": 80,
                    "config": {
                        "min": 20.0,
                        "max": 20000.0,
                        "default": 1000.0
                    }
                }
            ]
        })";

        auto design = pluginstudio::DesignParser::parseFromString (knobConfigJson);
        assert (design.components.size() == 1);

        const auto& knob = design.components[0];
        assert (knob.minValue == 20.0);
        assert (knob.maxValue == 20000.0);
        assert (knob.defaultValue == 1000.0);

        std::cout << "  \xE2\x9C\x93  Parser: Knob config (min/max/default) "
                     "extracted\n";
    }
}
