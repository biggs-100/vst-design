/** Supported analog UI component types. */
export type ComponentType = 'Knob' | 'Switch' | 'VUMeter' | 'LED';

/** Base properties shared by every component on the design canvas. */
export interface BaseComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  parameterId?: string;
  label?: string;
  assetPath?: string;
  frames?: number;
  /** Explicit frame dimensions after filmstrip import. Derived from image size when set. */
  frameWidth?: number;
  frameHeight?: number;
  /** Normalised parameter value 0.0–1.0 (knob rotation, VU level, LED state, etc.). */
  value?: number;
}

/** Knob — rotary control driven by a filmstrip sprite. */
export interface KnobConfig extends BaseComponent {
  type: 'Knob';
  min?: number;
  max?: number;
  defaultValue?: number;
}

/** Switch — 2- or 3-position toggle driven by a filmstrip sprite. */
export interface SwitchConfig extends BaseComponent {
  type: 'Switch';
  states?: string[];
}

/** VU Meter — background image with a rotating needle indicator. */
export interface VUMeterConfig extends BaseComponent {
  type: 'VUMeter';
  needleLength?: number;
  damping?: number;
}

/** LED — indicator light with on/off or saturation modes. */
export interface LedConfig extends BaseComponent {
  type: 'LED';
  colorOn?: string;
  colorOff?: string;
  /** `on_off` = binary toggle at value>0; `saturation` = intensity scales with value. */
  ledMode?: 'on_off' | 'saturation';
}

/** Union of all supported design component types. */
export type DesignComponent =
  | KnobConfig
  | SwitchConfig
  | VUMeterConfig
  | LedConfig;
