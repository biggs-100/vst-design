# Design: PluginStudio MVP — Analog Audio Plugin UI Designer

## Technical Approach

Tauri 2.x desktop app with React + react-konva frontend. Rust backend is deliberately minimal — file I/O and native dialogs only. All canvas mutation stays in the JS/webview layer via Zustand, avoiding IPC overhead during drag operations. Components render as Konva Groups with Sprite animation for filmstrip-driven controls. A single JSON schema drives both the canvas rendering and all export formats.

---

## Architecture Decisions

### Process Model — Tauri 2.x

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Electron | Heavy memory, large binary, familiar | Rejected — memory target <100 MB |
| Tauri 1.x | Stable but no 2.x webview lifecycle | Rejected — 2.x has better mobile path |
| **Tauri 2.x** | Lightweight, Rust backend, webview frontend | **Chosen** — matches memory target, Rust surface is minimal |

**Rationale**: Tauri 2.x gives us a <5 MB binary and <100 MB idle memory. The Rust surface is intentionally tiny — file dialogs and disk I/O only. All real-time interaction (drag, animation, zoom) stays in JS with no IPC bridge needed.

### Canvas Rendering — react-konva

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Raw Canvas 2D | Full control, no component model | Rejected — no React-friendly component tree |
| PixiJS | GPU-accelerated, overkill for 2D UI | Rejected — too heavy for static canvas |
| **react-konva** | React-idiomatic, Konva.Layer/Group model, Sprite support | **Chosen** — matches React mental model, built-in Sprite animation for filmstrips |

**Rationale**: react-konva lets each component be a React component wrapping a Konva.Group. Filmstrip frames map directly to Konva.Sprite animation. Transformer handles selection/resize natively.

### State Management — Zustand

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Redux | Verbose boilerplate, middleware heavy | Rejected — overkill for single-store canvas |
| Jotai | Atomic, good for fine-grained updates | Rejected — canvas mutations need batched store updates |
| **Zustand** | Minimal API, no providers, fine-grained subscriptions | **Chosen** — `usePluginStore(s => s.components)` re-renders only changed components |

**Rationale**: Zustand's selector-based subscriptions mean a knob drag only re-renders that knob, not the entire canvas. No provider wrapping needed. Actions are plain functions — no reducer boilerplate.

### Filmstrip Strategy — Server-side frames or client-side slicing

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Server-side pre-slice | Generate N files on import, pre-baked frames | Rejected — more I/O, slower import, less flexible |
| **Client-side Konva.Sprite** | Single image, frame config in metadata, GPU-sliced at render | **Chosen** — one import, instant preview, adjustable frame count |

**Rationale**: Konva.Sprite takes a single spritesheet image + frame config `{x, y, width, height}`. Frame detection is a pure JS calculation on canvas load. This means the user can adjust frame count without re-importing.

---

## Data Flow

```ascii
 ┌─────────────────────────────────────────────────┐
 │  Webview (React + react-konva)                  │
 │                                                  │
 │  Canvas Drag ──► Zustand Store ──► Konva re-render│
 │       │                       │                  │
 │       │                  ┌────┴────┐             │
 │       │                  │ Export  │             │
 │       │                  │ Panels  │             │
 │       │                  └────┬────┘             │
 │       │                       │                  │
 │  ┌────┴────┐                  │                  │
 │  │ Tauri   │     JSON/C++     │                  │
 │  │ Invoke  │◄─────────────────┘                  │
 │  │ (async) │                                     │
 │  └────┬────┘                                     │
 └───────┼─────────────────────────────────────────┘
         │ IPC (tauri::ipc)
 ┌───────┴─────────────────────────────────────────┐
 │  Rust Backend (src-tauri/)                       │
 │                                                   │
 │  #[tauri::command] fn save_plugin_design(...)     │
 │  #[tauri::command] fn load_plugin_design(...)     │
 │  #[tauri::command] fn export_json(...)            │
 │  #[tauri::command] fn open_file_dialog(...)       │
 │                                                   │
 │  File System ──► .plugindesign (JSON)            │
 └─────────────────────────────────────────────────┘
```

Key principle: **mutation stays in JS**. During a drag, Zustand updates at 60 fps with no IPC. The Rust side is only invoked on explicit save/load/export actions (button clicks).

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/Cargo.toml` | Create | Rust dependencies: tauri 2.x, serde, serde_json |
| `src-tauri/tauri.conf.json` | Create | Tauri config — window title/pos, permissions, dialog plugin |
| `src-tauri/src/main.rs` | Create | Entrypoint + 4 Tauri commands: save, load, export, file_dialog |
| `src-tauri/src/lib.rs` | Create | Shared types for Tauri IPC payloads |
| `src/main.tsx` | Create | React entry point with StrictMode |
| `src/App.tsx` | Create | Root layout: Toolbar + Canvas + PropertiesPanel + ExportPanel |
| `src/types/component.ts` | Create | `DesignComponent` union type + `ComponentType` enum |
| `src/types/schema.ts` | Create | `.plugindesign` JSON schema types + export interfaces |
| `src/store/usePluginStore.ts` | Create | Zustand store: components[], selection, grid, zoom, actions |
| `src/canvas/DesignCanvas.tsx` | Create | Konva Stage + Layer container, zoom handler, Transformer |
| `src/canvas/Grid.tsx` | Create | Magnetic grid — Konva.Line array, configurable spacing |
| `src/canvas/KnobComponent.tsx` | Create | Konva.Group: Image + Sprite, drag→value→frame mapping |
| `src/canvas/SwitchComponent.tsx` | Create | Konva.Group: 2-3 frame toggle, click to advance |
| `src/canvas/VUMeterComponent.tsx` | Create | Konva.Group: background image + rotating needle Line |
| `src/canvas/LedComponent.tsx` | Create | Konva.Circle: two-state fill color |
| `src/panels/Toolbar.tsx` | Create | Add component buttons, grid toggle, zoom controls |
| `src/panels/PropertiesPanel.tsx` | Create | Selected component property editor |
| `src/panels/ExportPanel.tsx` | Create | JSON + C++ snippet display + copy-to-clipboard |
| `src/filmstrip/FilmstripPreview.tsx` | Create | Import dialog, frame count config, Konva.Sprite scrub preview |
| `package.json` | Create | Dependencies: react, react-konva, konva, zustand, @tauri-apps/api |
| `tsconfig.json` | Create | TypeScript config with strict mode |
| `vite.config.ts` | Create | Vite config for Tauri dev server |
| `index.html` | Create | HTML entry point |

---

## Interfaces / Contracts

### Zustand Store

```typescript
type ComponentType = 'knob' | 'switch' | 'vu_meter' | 'led';

interface DesignComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;            // degrees
  frameIndex: number;          // current filmstrip frame
  label: string;
  parameterId: string;         // maps to JUCE parameter
  config: KnobConfig | SwitchConfig | VUMeterConfig | LedConfig;
  filmstrip?: FilmstripMeta;
}

interface PluginStore {
  projectMeta: { name: string; baseWidth: number; baseHeight: number };
  components: DesignComponent[];
  selectedComponentId: string | null;
  gridEnabled: boolean;
  gridSize: number;
  zoom: number;

  addComponent: (type: ComponentType, partial?: Partial<DesignComponent>) => string;
  updateComponent: (id: string, patch: Partial<DesignComponent>) => void;
  removeComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  setZoom: (zoom: number) => void;
}
```

### Tauri IPC Commands

```rust
#[tauri::command]
fn save_design(path: String, data: PluginDesignJson) -> Result<(), String>;

#[tauri::command]
fn load_design(path: String) -> Result<PluginDesignJson, String>;

#[tauri::command]
fn export_json(data: PluginDesignJson) -> Result<String, String>;

#[tauri::command]
fn open_file_dialog(kind: String) -> Result<Option<String>, String>;
// kind: "open" | "save" — `Some(path)` on confirm, `None` on cancel
```

### Filmstrip Frame Detection

```typescript
// Auto-detect: assume equal-height horizontal frames
function detectFrames(
  image: HTMLImageElement,
  frameCount: number
): Array<{ x: number; y: number; width: number; height: number }> {
  const frameHeight = image.height / frameCount;
  return Array.from({ length: frameCount }, (_, i) => ({
    x: 0, y: i * frameHeight, width: image.width, height: frameHeight
  }));
}
```

### Value-to-Frame Mapping (all components)

```typescript
// Normalized 0.0–1.0 input maps to discrete frame index
function valueToFrame(normalized: number, totalFrames: number): number {
  return Math.min(Math.floor(normalized * totalFrames), totalFrames - 1);
}
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Zustand store actions (add, update, remove, select) | Vitest — dispatch actions, assert store state |
| Unit | Value-to-frame mapping (`valueToFrame`) | Vitest — boundary values, edge cases |
| Unit | JSON/C++ export serialization | Vitest — generate from fixture store, snapshot match |
| Unit | Frame auto-detection logic | Vitest — synthetic canvases with known dimensions |
| Integration | Component render + selection via Konva.Transformer | Vitest + jsdom — mount react-konva, simulate click |
| Integration | Tauri command handlers | Rust `#[cfg(test)]` — unit test serialization round-trips |
| E2E | Full workflow: import filmstrip → place knob → drag → export JSON | Skip for MVP — manual QA |

---

## Migration / Rollout

No migration required — greenfield project. First commit contains the full Tauri scaffold. Subsequent commits per capability (`design-canvas`, `component-library`, etc.)

---

## Open Questions

- [ ] **Filmstrip dimension limits** — Should we enforce max image dimensions at import (e.g., 4096×4096) or let Konva handle GPU constraints?
- [ ] **Component z-ordering** — Do we need a layer panel in MVP or is auto-z (insertion order) sufficient?
- [ ] **VU Meter needle origin** — Is the needle anchor point fixed at center-bottom of the component rect, or should it be configurable?
- [ ] **C++ snippet accuracy** — The C++ templates assume a specific JUCE pattern (slider with `SliderAttachment`). Should we support JUCE 7 vs JUCE 8 variations?
