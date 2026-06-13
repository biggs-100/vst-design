# PluginStudio

**Diseña interfaces de plugins de audio analógico. Exporta JSON que JUCE entiende.**

PluginStudio es un "Figma para Audio Plugins" — una app de escritorio donde diseñadores UI crean prototipos de interfaces analógicas arrastrando componentes, y exportan datos estructurados que un desarrollador C++/JUCE consume sin reescribir código a mano.

```
PluginStudio (Tauri + React) ──→ .plugindesign JSON ──→ pluginstudio_runtime (JUCE Module)
```

---

## Stack

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| **Desktop** | Tauri 2.x (Rust) | File I/O, diálogos nativos |
| **Frontend** | React + TypeScript | UI de la app |
| **Canvas** | react-konva (Konva.js) | Lienzo de diseño con grid, zoom, snap |
| **Estado** | Zustand | Store del canvas y componentes |
| **Runtime** | C++ / JUCE | Módulo que lee el JSON y construye la UI del plugin |

---

## Proyectos

### PluginStudio MVP — App de diseño

App de escritorio para prototipar UIs de plugins con componentes analógicos arrastrables.

```
src/
├── canvas/          # DesignCanvas, Grid, y componentes visuales
│   ├── KnobComponent    # Perilla con filmstrip (100 frames)
│   ├── SwitchComponent  # Switch click-to-toggle
│   ├── VUMeterComponent # Medidor VU con aguja y marcas dB
│   └── LedComponent     # LED on/off y saturación
├── filmstrip/       # Gestor de filmstrips (import, preview, test knob)
├── panels/          # PropertiesPanel, ExportPanel (JSON + snippets C++)
├── store/           # Zustand store con CRUD de componentes
├── types/           # TypeScript definitions del schema .plugindesign
└── utils/           # valueToFrame, export, snippet generation
```

**Canvas**: 800x600 fijo · grid magnético (20px) · zoom 25-400% · snap-to-grid

**Exportación**:
- JSON `.plugindesign` con schema v1
- Snippets C++ (declaraciones .h + `setBounds()` en .cpp)

---

### pluginstudio_runtime — Módulo JUCE (C++)

Librería JUCE que lee el `.plugindesign` exportado y construye la UI del plugin en **una línea de código**.

```cpp
// En tu PluginEditor.cpp — así de simple:
componentes = pluginstudio::loadInto(*this, archivoDesign, apvts);
```

```
pluginstudio_runtime/
├── parser/          # DesignParser — parsea JSON, valida schema, resuelve assets
├── components/      # DynamicComponent factory + 4 tipos
│   ├── KnobComponent      # Slider rotary + FilmStripLookAndFeel
│   ├── SwitchComponent    # TextButton click-to-toggle
│   ├── VUMeterComponent   # Ballistics 2º orden + needle
│   └── LedComponent       # On/off + saturation
├── lookandfeel/     # FilmStripLookAndFeel (drawRotarySlider con crop)
└── binding/         # ParameterBinder (APVTS attachments)
```

**Dependencias**: `juce_core`, `juce_graphics`, `juce_gui_basics`, `juce_audio_processors`, `juce_audio_utils`

---

## API del Módulo JUCE

```cpp
#include <pluginstudio_runtime/pluginstudio_runtime.h>

// 1. Registrar parámetros desde el JSON (en getParameterLayout())
auto layout = pluginstudio::createParameterLayout(designFile);

// 2. Cargar componentes en el editor
juce::OwnedArray<pluginstudio::DynamicComponent> componentes;
componentes = pluginstudio::loadInto(*this, designFile, apvts);
```

Sin recompilar cuando el diseñador mueve una perilla en PluginStudio y re-exporta el JSON.

---

## JSON Schema (.plugindesign v1)

```json
{
  "schema_version": 1,
  "plugin_meta": {
    "name": "Vintage_Comp",
    "base_width": 800,
    "base_height": 600
  },
  "ui_components": [
    {
      "type": "Knob",
      "id": "input_gain",
      "parameter_id": "input_gain",
      "x": 150, "y": 200,
      "width": 80, "height": 80,
      "asset_path": "assets/knob_vintage.png",
      "frames": 100,
      "config": { "min": 0, "max": 10, "default": 5 }
    }
  ]
}
```

Tipos soportados: `Knob`, `Switch`, `VUMeter`, `LED`.

---

## Tests

| Suite | Tests | Cobertura |
|-------|-------|-----------|
| Parser (C++) | 8 | JSON parsing, schema version, edge cases |
| Componentes (C++) | 4 | Struct fields, factory dispatch |
| Math (C++) | 5 | valueToFrame, ballistics (default/over/under-damped) |
| JS/TS (Vitest) | 51 | Store, export, snippets, frame detection, Rust serialization |

```bash
# Tests JS
npm test

# Tests Rust (módulo Tauri)
cd src-tauri && cargo test
```

---

## Primeros pasos

```bash
# App de diseño (PluginStudio)
npm install
npm run tauri dev

# Módulo JUCE — incluir en tu proyecto:
# 1. Copia pluginstudio_runtime/ a tu proyecto
# 2. Agrega el módulo en Projucer o CMake
# 3. #include <pluginstudio_runtime/pluginstudio_runtime.h>
```

---

## Licencia

MIT
