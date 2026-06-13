# Tasks: PluginStudio MVP — Analog Audio Plugin UI Designer

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,700 (greenfield, ~29 files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested work units | 6 (see below) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

```
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: scaffold, configs, types, store, Rust backend | PR 1 | Base for all other work |
| 2 | Canvas & Grid: DesignCanvas, Grid, zoom/pan, Toolbar | PR 2 | Depends on PR 1 |
| 3 | Component Library: Knob, Switch, VU Meter, LED on canvas | PR 3 | Depends on PR 2 |
| 4 | Filmstrip Manager: import, frame detection, preview/scrub | PR 4 | Depends on PR 3 |
| 5 | Panels & Persistence: ExportPanel, PropertiesPanel, save/load | PR 5 | Depends on PR 4 |
| 6 | Tests & Polish: unit tests, error handling, edge cases | PR 6 | Depends on PR 5 |

## Phase 1: Foundation

- [x] 1.1 Create `package.json` — React 18, react-konva, konva, zustand, @tauri-apps/api, TypeScript, Vite
- [x] 1.2 Create `tsconfig.json` — strict mode, path aliases for `@/`
- [x] 1.3 Create `vite.config.ts` — Vite config with Tauri dev server host/port
- [x] 1.4 Create `index.html` — root `<div id="root">`, Vite entry script
- [x] 1.5 Create `src/main.tsx` — ReactDOM.createRoot with StrictMode
- [x] 1.6 Create `src-tauri/Cargo.toml` — tauri 2.x, serde, serde_json, dialog plugin
- [x] 1.7 Create `src-tauri/tauri.conf.json` — window title "PluginStudio", size 1200x800, dialog permissions
- [x] 1.8 Create `src-tauri/src/lib.rs` — PluginDesignJson, PluginMeta, ComponentData structs with serde derives
- [x] 1.9 Create `src-tauri/src/main.rs` — 4 command stubs: save_design, load_design, export_json, open_file_dialog
- [x] 1.10 Create `src/types/component.ts` — DesignComponent union type, ComponentType enum, per-type config interfaces
- [x] 1.11 Create `src/types/schema.ts` — PluginDesignJson, PluginMeta, ComponentData export interfaces
- [x] 1.12 Create `src/store/usePluginStore.ts` — Zustand store: components[], selection, grid, zoom, CRUD + setZoom

## Phase 2: Canvas & Grid

- [x] 2.1 Create `src/canvas/Grid.tsx` — Konva.Line array, configurable spacing (default 20px), top-left origin
- [x] 2.2 Create `src/canvas/DesignCanvas.tsx` — Konva Stage (800x600 logical), Layer, middle-mouse pan, Ctrl+scroll zoom (25-400%), snap-to-grid on drop
- [x] 2.3 Create `src/panels/Toolbar.tsx` — Add component buttons, grid toggle, zoom slider, zoom reset
- [x] 2.4 Create `src/App.tsx` — Root layout: Toolbar top, canvas center, placeholder banners for side panels

## Phase 3: Component Library

- [x] 3.1 Create `src/canvas/KnobComponent.tsx` — Konva.Group with Sprite (filmstrip), circular drag maps angle → frame (0-99), valueToFrame helper
- [x] 3.2 Create `src/canvas/SwitchComponent.tsx` — Konva.Group with 2-3 frames, click toggles/cycles frame index
- [x] 3.3 Create `src/canvas/VUMeterComponent.tsx` — Konva.Group with background Image + rotating Line needle, configurable radius/damping
- [x] 3.4 Create `src/canvas/LedComponent.tsx` — Konva.Circle with on_off (two colors) and saturation (scaled intensity) modes
- [x] 3.5 Wire drag-to-store for all components — onDragEnd calls updateComponent(id, { x, y })

## Phase 4: Filmstrip Manager

- [x] 4.1 Create `src/filmstrip/FilmstripPreview.tsx` — Import button invokes Tauri file dialog, validates PNG/JPG
- [x] 4.2 Implement frame auto-detection — image height ÷ frameCount, warn if not divisible evenly
- [x] 4.3 Add Konva.Sprite preview with play/pause, configurable FPS slider (1-60)
- [x] 4.4 Add frame count override — numeric input recalculates frame_height, updates preview in real-time
- [x] 4.5 Add test knob in preview — circular drag maps rotation → frame index for interactive testing
- [x] 4.6 Wire import to assign filmstrip metadata (asset_path, frames, frame dimensions) to selected component

## Phase 5: Panels & Persistence

- [x] 5.1 Create `src/panels/PropertiesPanel.tsx` — Editable fields for selected component: type, label, parameter_id, x/y, config values
- [x] 5.2 Create `src/panels/ExportPanel.tsx` — JSON tab: formatted .plugindesign preview, "Copy JSON" button
- [x] 5.3 Add C++ .h tab — generates header declarations with component type, id, parameter_id comments
- [x] 5.4 Add C++ .cpp tab — generates resized() setBounds entries from current canvas positions
- [x] 5.5 Wire real-time snippet updates — ExportPanel re-renders via Zustand selector on component changes
- [x] 5.6 Wire save_design cmd — serialize store → PluginDesignJson → Tauri invoke → native save dialog
- [x] 5.7 Wire load_design cmd — Tauri invoke native open dialog → parse JSON → restore store state
- [x] 5.8 Wire export_json cmd — Tauri invoke writes .plugindesign file from current store state
- [x] 5.9 Implement validation — missing parameter_id blocks export with error message per component

## Phase 6: Tests & Polish

- [x] 6.1 Create `vitest.config.ts` — configure Vitest with jsdom for React/konva component tests
- [x] 6.2 Write store tests — addComponent, updateComponent, removeComponent, selectComponent, setZoom
- [x] 6.3 Write valueToFrame tests — boundary values (0.0, 1.0), clamping, mid-range
- [x] 6.4 Write JSON export tests — fixture store → expected .plugindesign structure, snapshot match
- [x] 6.5 Write frame detection tests — known image dimensions → correct frame config array
- [x] 6.6 Write C++ snippet tests — all component types produce expected .h declarations + .cpp setBounds
- [x] 6.7 Write Rust serialization tests — #[cfg(test)] round-trip PluginDesignJson through serde
- [x] 6.8 Implement unsaved changes confirmation — compare store snapshot on close/open/new
- [x] 6.9 Handle error states — save failure (disk full), corrupted file parse, unsupported import format
- [x] 6.10 Add schema version check on load — warn if older .plugindesign version detected
