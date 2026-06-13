import type { DesignComponent } from '@/types/component';
import type { ComponentData, PluginDesignJson } from '@/types/schema';
import { CURRENT_SCHEMA_VERSION } from '@/types/schema';

/**
 * Convert a single DesignComponent to the serialisable ComponentData format.
 */
export function toComponentData(comp: DesignComponent): ComponentData {
  const base: ComponentData = {
    component_type: comp.type,
    id: comp.id,
    parameter_id: comp.parameterId,
    x: comp.x,
    y: comp.y,
    width: comp.width,
    height: comp.height,
    asset_path: comp.assetPath,
    frames: comp.frames,
    config: {},
  };

  switch (comp.type) {
    case 'Knob':
      base.config = {
        min: comp.min,
        max: comp.max,
        default_value: comp.defaultValue,
        total_frames: comp.frames ?? 100,
      };
      break;
    case 'Switch':
      base.config = {
        states: comp.states ?? [],
      };
      break;
    case 'VUMeter':
      base.config = {
        needle_length: comp.needleLength,
        damping: comp.damping,
      };
      break;
    case 'LED':
      base.config = {
        mode: comp.ledMode ?? 'on_off',
        color_on: comp.colorOn ?? '#00FF00',
        color_off: comp.colorOff ?? '#333333',
      };
      break;
  }

  return base;
}

/**
 * Convert the full store state to a serialisable PluginDesignJson structure.
 */
export function toPluginDesignJson(
  components: DesignComponent[],
  projectMeta: { name: string; base_width: number; base_height: number },
): PluginDesignJson {
  return {
    plugin_meta: {
      name: projectMeta.name,
      base_width: projectMeta.base_width,
      base_height: projectMeta.base_height,
    },
    ui_components: components.map(toComponentData),
    schema_version: CURRENT_SCHEMA_VERSION,
  };
}
