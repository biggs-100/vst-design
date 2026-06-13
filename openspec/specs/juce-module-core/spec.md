# JUCE Module Core Specification

## Purpose

Module scaffolding, public API surface, JSON schema loading and validation for the PluginStudio runtime module. Provides the single entry point (`pluginstudio_runtime.h`) and the `DesignParser` that transforms `.plugindesign` JSON into an internal model consumed by downstream capabilities.

## Requirements

### Requirement: Module MUST expose a single public header

The module SHALL define a master header `pluginstudio_runtime.h` using `BEGIN_JUCE_MODULE_DECLARATION` / `END_JUCE_MODULE_DECLARATION`. Consumers SHALL only `#include <pluginstudio_runtime/pluginstudio_runtime.h>`.

#### Scenario: Consumer includes master header

- GIVEN a JUCE project with `pluginstudio_runtime/` on the module path
- WHEN the consumer adds `#include <pluginstudio_runtime/pluginstudio_runtime.h>`
- THEN compilation succeeds
- AND `PluginStudioRuntime`, `ComponentData`, `DynamicComponent`, `DesignParser`, `ParameterBinder` are all declared as public types
- Note: `FilmStripLookAndFeel`, `VUMeterComponent`, and `LEDComponent` are internal module types — not exposed through the master header

### Requirement: DesignParser MUST parse v1 schema JSON

The `DesignParser` SHALL accept a `juce::File` or raw string, call `juce::JSON::parse()`, and extract `plugin_meta` and `ui_components` into typed structs.

#### Scenario: Parse valid design file

- GIVEN a `.plugindesign` JSON file conforming to v1 schema with 1 knob and 1 switch
- WHEN `DesignParser::parse(file)` is called
- THEN it returns a `PluginDesign` struct with `plugin_meta.name == "MyPlugin"` and `ui_components.size() == 2`

#### Scenario: Parse rejects missing ui_components

- GIVEN a JSON file with `plugin_meta` but no `ui_components` array
- WHEN parse is called
- THEN it returns an error: "Missing required field: ui_components"
- AND no component objects are created

#### Scenario: Parse rejects null JSON input

- GIVEN an empty file or invalid JSON
- WHEN parse is called
- THEN it returns an error: "Failed to parse JSON"
- AND no internal state is modified

### Requirement: Module MUST validate schema_version on load

The parser SHALL check the `schema_version` field in the JSON root. If absent or not equal to `1`, loading SHALL be rejected.

#### Scenario: Accept version 1

- GIVEN a JSON file with `"schema_version": 1`
- WHEN parse is called
- THEN parsing proceeds normally

#### Scenario: Reject unsupported version

- GIVEN a JSON file with `"schema_version": 2`
- WHEN parse is called
- THEN it returns an error: "Unsupported schema version: 2. Supported: 1"
- AND no components are created

#### Scenario: Reject missing schema_version

- GIVEN a JSON file without a `schema_version` field
- WHEN parse is called
- THEN it returns an error: "Missing schema_version"

### Requirement: Asset paths MUST resolve relative to JSON parent directory

Image file paths in component `asset_path` fields SHALL be resolved relative to the directory containing the loaded `.plugindesign` JSON file.

#### Scenario: Resolve relative asset path

- GIVEN a design at `/Users/user/MyPlugin/design.json` with a knob `asset_path` of `"assets/knob.png"`
- WHEN `DesignParser` resolves the asset path
- THEN the resolved path is `/Users/user/MyPlugin/assets/knob.png`

#### Scenario: Empty asset_path for LED

- GIVEN an LED component with `asset_path: ""`
- WHEN the parser resolves it
- THEN it returns an empty path (no image load attempted)
- AND no error is raised

### Requirement: PluginStudioRuntime MUST provide a static loadInto() entry point

The module SHALL expose `PluginStudioRuntime::loadInto(const juce::File& designFile, juce::AudioProcessorValueTreeState& apvts, juce::Component& parent)` that orchestrates parsing, component creation, positioning, and parameter binding in one call.

#### Scenario: loadInto creates visual hierarchy

- GIVEN a valid design file, an APVTS instance, and an empty parent `juce::Component`
- WHEN `PluginStudioRuntime::loadInto()` is called
- THEN the parent component has N child components matching `ui_components.length`
- AND each child has correct bounds from JSON x/y/width/height
- AND knobs/switches have active `SliderAttachment` bindings

#### Scenario: loadInto with invalid file returns gracefully

- GIVEN a path to a non-existent or invalid JSON file
- WHEN `loadInto()` is called
- THEN no child components are added to the parent
- AND the error is logged via `juce::Logger::writeToLog()`
- AND no crash or undefined behavior occurs

#### Scenario: loadInto MUST be called on the message thread

- GIVEN a call to `loadInto()` from a non-message thread
- WHEN the call executes
- THEN behavior is undefined (documented precondition — module SHALL NOT add thread safety)
