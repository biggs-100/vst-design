import { describe, it, expect } from 'vitest';
import { generateCppHeader, generateCppSource } from '@/utils/generateSnippets';
import type { DesignComponent } from '@/types/component';

/* ── Fixtures ──────────────────────────────────────────────────────── */

function makeKnob(overrides: Partial<DesignComponent> = {}): DesignComponent {
  return {
    id: 'gain_knob',
    type: 'Knob',
    x: 50,
    y: 60,
    width: 80,
    height: 80,
    label: 'Gain',
    parameterId: 'param_gain',
    ...overrides,
  } as DesignComponent;
}

function makeSwitch(overrides: Partial<DesignComponent> = {}): DesignComponent {
  return {
    id: 'power_switch',
    type: 'Switch',
    x: 200,
    y: 50,
    width: 40,
    height: 60,
    label: 'Power',
    parameterId: 'param_power',
    states: ['Off', 'On'],
    ...overrides,
  } as DesignComponent;
}

function makeVUMeter(overrides: Partial<DesignComponent> = {}): DesignComponent {
  return {
    id: 'level_meter',
    type: 'VUMeter',
    x: 300,
    y: 100,
    width: 30,
    height: 200,
    label: 'Level',
    parameterId: undefined,
    ...overrides,
  } as DesignComponent;
}

function makeLed(overrides: Partial<DesignComponent> = {}): DesignComponent {
  return {
    id: 'clip_led',
    type: 'LED',
    x: 400,
    y: 50,
    width: 20,
    height: 20,
    label: 'Clip',
    parameterId: 'param_clip',
    ...overrides,
  } as DesignComponent;
}

describe('generateCppHeader', () => {
  it('produces a Slider declaration for Knob components', () => {
    const result = generateCppHeader([makeKnob()], 'Test');
    expect(result).toContain('juce::Slider gain;');
    expect(result).toContain('juce::ImageComponent gainImage;');
  });

  it('includes SliderAttachment when Knob has parameterId', () => {
    const result = generateCppHeader([makeKnob()], 'Test');
    expect(result).toContain('SliderAttachment');
  });

  it('omits SliderAttachment when Knob has no parameterId', () => {
    const result = generateCppHeader([makeKnob({ parameterId: undefined })], 'Test');
    expect(result).not.toContain('Attachment');
  });

  it('produces ImageButton declaration for Switch', () => {
    const result = generateCppHeader([makeSwitch()], 'Test');
    expect(result).toContain('juce::ImageButton power;');
    expect(result).toContain('States: Off, On');
  });

  it('produces ButtonAttachment when Switch has parameterId', () => {
    const result = generateCppHeader([makeSwitch()], 'Test');
    expect(result).toContain('ButtonAttachment');
  });

  it('omits ButtonAttachment when Switch has no parameterId', () => {
    const result = generateCppHeader([makeSwitch({ parameterId: undefined })], 'Test');
    expect(result).not.toContain('Attachment');
  });

  it('produces VU Meter comment and ImageComponent', () => {
    const result = generateCppHeader([makeVUMeter()], 'Test');
    expect(result).toContain('VU Meter');
    expect(result).toContain('juce::ImageComponent level;');
  });

  it('produces LED comment and ImageComponent', () => {
    const result = generateCppHeader([makeLed()], 'Test');
    expect(result).toContain('LED indicator');
    expect(result).toContain('juce::ImageComponent clip;');
  });

  it('includes project name in header', () => {
    const result = generateCppHeader([makeKnob()], 'MyAwesomePlugin');
    expect(result).toContain('MyAwesomePlugin');
  });

  it('includes component label in comments', () => {
    const result = generateCppHeader([makeKnob()], 'Test');
    expect(result).toContain('Gain');
    expect(result).toContain('param_gain');
  });
});

describe('generateCppSource', () => {
  it('includes setBounds for each component', () => {
    const result = generateCppSource([makeKnob()]);
    expect(result).toContain('gain.setBounds(50, 60, 80, 80)');
  });

  it('includes Image.setBounds for Knob components', () => {
    const result = generateCppSource([makeKnob()]);
    expect(result).toContain('gainImage.setBounds(50, 60, 80, 80)');
  });

  it('does NOT add Image.setBounds for non-Knob types', () => {
    const result = generateCppSource([makeSwitch()]);
    expect(result).toContain('power.setBounds(200, 50, 40, 60)');
    expect(result).not.toContain('Image.setBounds');
  });

  it('handles all four types together', () => {
    const components = [makeKnob(), makeSwitch(), makeVUMeter(), makeLed()];
    const result = generateCppSource(components);
    expect(result).toContain('gain.setBounds');
    expect(result).toContain('power.setBounds');
    expect(result).toContain('level.setBounds');
    expect(result).toContain('clip.setBounds');
  });
});
