# Proposal: PluginStudio MVP — Analog Audio Plugin UI Designer

## Intent

Build a desktop app that lets UI/product designers prototype analog-style audio plugin interfaces visually, and export structured data that JUCE C++ developers can consume directly. This closes the gap between design tools (Figma/Blender) and implementation (JUCE C++), saving weeks of back-and-forth coordinate mapping.

## Scope

### In Scope
- Tauri 2.x + React + react-konva desktop app
- Design canvas with magnetic grid, zoom, fixed 800×600 base
- Component library: Knob (filmstrip, 100 frames), Switch/Toggle (2-3 frames), VU Meter (configurable needle radius), LED/Indicator light
- Filmstrip importer with real-time rotation preview
- JSON export (.plugindesign format)
- C++ snippet exporter (side panel with .h/.cpp copy-paste blocks)
- Project save/load (.plugindesign files)

### Out of Scope
- Full JUCE project generation (.jucer / CMake)
- Runtime JSON interpreter JUCE module (post-MVP)
- FFT analyzers, OLED screens, linear sliders, digital displays
- Real-time collaboration / multi-user
- Plugin DSP engine (UI tool only)

## Capabilities

### New Capabilities
- `design-canvas`: Fixed 800×600 canvas with magnetic grid, zoom/pan
- `component-library`: Draggable analog components (Knob, Switch, VU Meter, LED)
- `filmstrip-manager`: Import, preview, and test filmstrip sprite animations
- `project-persistence`: Save/load .plugindesign files via Tauri file I/O
- `json-export`: Export structured JSON schema consumable by JUCE
- `code-snippet-export`: Generate copy-paste ready C++ .h/.cpp blocks for resized() and declarations

### Modified Capabilities
None — greenfield project.

## Approach

Tauri 2.x + React + react-konva for canvas rendering. Zustand for state management (handles canvas mutations every frame during drag). Components rendered as Konva shapes with Sprite animation for filmstrips. A JSON schema drives both canvas rendering and export. Rust backend handles file I/O (save/load/export) via Tauri commands. No webview IPC bottleneck for drag operations — all mutation stays in JS/WASM.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src-tauri/` | New | Rust backend — file I/O, Tauri command handlers |
| `src/canvas/` | New | Konva-based canvas, grid, zoom system |
| `src/components/` | New | Analog UI components (Knob, Switch, VU, LED) |
| `src/filmstrip/` | New | Filmstrip import/preview pipeline |
| `src/store/` | New | Zustand store for canvas state |
| `src/export/` | New | JSON + C++ code generation |
| `src/types/` | New | PluginStudio JSON schema types |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rust learning curve | Medium | Minimal Rust surface (file I/O only, no complex logic) |
| Filmstrip perf with large sprites | Low | Konva Sprite native support + GPU acceleration |
| JUCE coord mapping complexity | Low | Fixed 800×600 base — JUCE does runtime DPI scaling |

## Rollback Plan

Git revert of the initial commit. No production data to migrate since this is greenfield. If the architecture proves wrong, the JSON schema is the contract — only the renderer changes.

## Dependencies

- Tauri 2.x CLI + Rust toolchain
- Node.js + npm or yarn for React frontend
- react-konva (Konva.js wrapper for React)

## Success Criteria

- [ ] A designer can import a filmstrip, place a knob on canvas, rotate it with mouse drag
- [ ] A designer can export a .plugindesign JSON file and save/load projects
- [ ] A developer can take exported JSON + C++ snippets and integrate with a JUCE project
- [ ] The app runs on Windows (primary) with < 100 MB memory at idle
