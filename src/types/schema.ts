/** Plugin project metadata. */
export interface PluginMeta {
  name: string;
  base_width: number;
  base_height: number;
}

/** Serialisable representation of a single UI component (mirrors the Rust struct). */
export interface ComponentData {
  component_type: string;
  id: string;
  parameter_id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  asset_path?: string;
  frames?: number;
  config?: Record<string, unknown>;
}

/** Top-level .plugindesign JSON structure (mirrors the Rust struct). */
export interface PluginDesignJson {
  plugin_meta: PluginMeta;
  ui_components: ComponentData[];
  /** Schema version for forward/backward compatibility. Incremented on breaking changes. */
  schema_version: number;
}

/** Current schema version of PluginStudio. */
export const CURRENT_SCHEMA_VERSION = 1;

/** Minimum supported schema version for loading. */
export const MIN_SCHEMA_VERSION = 1;
