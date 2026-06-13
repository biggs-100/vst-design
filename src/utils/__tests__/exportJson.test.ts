import { describe, it, expect } from 'vitest';
import { toPluginDesignJson } from '@/utils/toPluginDesignJson';
import type { DesignComponent } from '@/types/component';

/* ── Fixture store state with all 4 component types ───────────────── */
function buildFixtureComponents(): DesignComponent[] {
  return [
    {
      id: 'gain_knob',
      type: 'Knob',
      x: 50,
      y: 60,
      width: 80,
      height: 80,
      label: 'Gain',
      parameterId: 'param_gain',
      assetPath: 'assets/knob.png',
      frames: 100,
      min: 0,
      max: 100,
      defaultValue: 50,
      value: 0.5,
    } as DesignComponent,
    {
      id: 'power_switch',
      type: 'Switch',
      x: 200,
      y: 50,
      width: 40,
      height: 60,
      label: 'Power',
      parameterId: 'param_power',
      states: ['Off', 'On'],
      value: 0,
    } as DesignComponent,
    {
      id: 'level_meter',
      type: 'VUMeter',
      x: 300,
      y: 100,
      width: 30,
      height: 200,
      label: 'Level',
      parameterId: undefined,
      assetPath: 'assets/vu.png',
      needleLength: 80,
      damping: 0.3,
      value: 0,
    } as DesignComponent,
    {
      id: 'clip_led',
      type: 'LED',
      x: 400,
      y: 50,
      width: 20,
      height: 20,
      label: 'Clip',
      parameterId: 'param_clip',
      colorOn: '#FF0000',
      colorOff: '#333333',
      ledMode: 'on_off',
      value: 1,
    } as DesignComponent,
  ];
}

const fixtureMeta = { name: 'TestPlugin', base_width: 800, base_height: 600 };

describe('toPluginDesignJson', () => {
  it('produces correct plugin_meta name', () => {
    const result = toPluginDesignJson(buildFixtureComponents(), fixtureMeta);
    expect(result.plugin_meta.name).toBe('TestPlugin');
    expect(result.plugin_meta.base_width).toBe(800);
    expect(result.plugin_meta.base_height).toBe(600);
  });

  it('includes all components', () => {
    const result = toPluginDesignJson(buildFixtureComponents(), fixtureMeta);
    expect(result.ui_components).toHaveLength(4);
  });

  it('serializes Knob component correctly', () => {
    const result = toPluginDesignJson(buildFixtureComponents(), fixtureMeta);
    const knob = result.ui_components.find((c) => c.id === 'gain_knob');
    expect(knob).toBeDefined();
    expect(knob!.component_type).toBe('Knob');
    expect(knob!.x).toBe(50);
    expect(knob!.y).toBe(60);
    expect(knob!.width).toBe(80);
    expect(knob!.height).toBe(80);
    expect(knob!.asset_path).toBe('assets/knob.png');
    expect(knob!.frames).toBe(100);
    expect(knob!.parameter_id).toBe('param_gain');
    expect(knob!.config).toEqual({
      min: 0,
      max: 100,
      default_value: 50,
      total_frames: 100,
    });
  });

  it('serializes Switch component correctly', () => {
    const result = toPluginDesignJson(buildFixtureComponents(), fixtureMeta);
    const sw = result.ui_components.find((c) => c.id === 'power_switch');
    expect(sw).toBeDefined();
    expect(sw!.component_type).toBe('Switch');
    expect(sw!.config).toEqual({
      states: ['Off', 'On'],
    });
  });

  it('serializes VUMeter component correctly', () => {
    const result = toPluginDesignJson(buildFixtureComponents(), fixtureMeta);
    const vu = result.ui_components.find((c) => c.id === 'level_meter');
    expect(vu).toBeDefined();
    expect(vu!.component_type).toBe('VUMeter');
    expect(vu!.config).toEqual({
      needle_length: 80,
      damping: 0.3,
    });
  });

  it('serializes LED component correctly', () => {
    const result = toPluginDesignJson(buildFixtureComponents(), fixtureMeta);
    const led = result.ui_components.find((c) => c.id === 'clip_led');
    expect(led).toBeDefined();
    expect(led!.component_type).toBe('LED');
    expect(led!.config).toEqual({
      mode: 'on_off',
      color_on: '#FF0000',
      color_off: '#333333',
    });
  });

  it('leaves parameter_id undefined when not set', () => {
    const result = toPluginDesignJson(buildFixtureComponents(), fixtureMeta);
    const vu = result.ui_components.find((c) => c.id === 'level_meter');
    expect(vu!.parameter_id).toBeUndefined();
  });

  it('JSON snapshots match expected structure', () => {
    const result = toPluginDesignJson(buildFixtureComponents(), fixtureMeta);
    const json = JSON.parse(JSON.stringify(result));
    expect(json).toMatchSnapshot();
  });
});
