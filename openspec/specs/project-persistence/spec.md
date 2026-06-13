# Project Persistence Specification

## Purpose

Save and load .plugindesign files via Tauri file I/O, preserving complete canvas and component state.

## Requirements

### Requirement: Save MUST serialize full canvas state to .plugindesign JSON

The saved file MUST include all canvas config, component definitions, and asset references. File extension MUST be .plugindesign.

#### Scenario: Save empty canvas

- GIVEN a fresh canvas with no components
- WHEN the user selects File > Save As
- THEN the system opens a native save dialog
- AND writes a .plugindesign file with empty ui_components array

#### Scenario: Save canvas with components

- GIVEN a canvas with 3 components (knob, switch, VU meter)
- WHEN the user saves
- THEN the JSON contains all 3 component definitions with positions, types, and config

#### Scenario: Save fails (disk full)

- GIVEN the target disk has no free space
- WHEN the user attempts to save
- THEN an error message is displayed: "Save failed: disk may be full"
- AND the canvas state is preserved (no data loss)

### Requirement: Load MUST restore canvas state from .plugindesign

#### Scenario: Load valid file

- GIVEN a valid .plugindesign file with 2 components
- WHEN the user selects File > Open
- THEN the canvas renders both components at their saved positions
- AND all config values are restored

#### Scenario: Load corrupted file

- GIVEN a .plugindesign file with missing required fields
- WHEN the user attempts to open it
- THEN the system reports: "Invalid project file: missing required field 'plugin_meta'"
- AND the canvas remains unchanged

#### Scenario: Load file from older schema version

- GIVEN a .plugindesign file with schema version 0.9
- WHEN the user opens it
- AND the current schema is 1.0
- THEN the system SHOULD attempt migration or warn: "File from older version — some features may be unavailable"

### Requirement: Unsaved changes MUST trigger confirmation

#### Scenario: Close with unsaved changes

- GIVEN the canvas has unsaved changes
- WHEN the user attempts to close the app or open another file
- THEN a confirmation dialog appears: "Save changes before closing?"
- WITH options: Save, Discard, Cancel

### Requirement: Recent files SHOULD be tracked

#### Scenario: Recent files populate on startup

- GIVEN the user has opened 3 projects previously
- WHEN the app starts
- THEN File > Recent shows the 3 most recent .plugindesign files
- AND selecting one loads the project

### Requirement: Save/load MUST use Tauri native dialogs

#### Scenario: Save As triggers native dialog

- GIVEN the user clicks Save As
- WHEN the command triggers
- THEN the Tauri save dialog opens with filter "PluginDesign (*.plugindesign)"
