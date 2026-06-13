import { describe, it, expect } from 'vitest';
import { valueToFrame } from '@/utils/valueToFrame';

describe('valueToFrame', () => {
  it('returns 0 for value 0.0', () => {
    expect(valueToFrame(0.0, 100)).toBe(0);
  });

  it('returns totalFrames - 1 for value 1.0', () => {
    expect(valueToFrame(1.0, 100)).toBe(99);
    expect(valueToFrame(1.0, 50)).toBe(49);
    expect(valueToFrame(1.0, 10)).toBe(9);
  });

  it('returns mid frame for value 0.5', () => {
    expect(valueToFrame(0.5, 100)).toBe(49);
    expect(valueToFrame(0.5, 200)).toBe(99);
    expect(valueToFrame(0.5, 4)).toBe(1);
  });

  it('clamps values below 0 to 0', () => {
    expect(valueToFrame(-0.1, 100)).toBe(0);
    expect(valueToFrame(-1.0, 100)).toBe(0);
  });

  it('clamps values above 1 to max frame', () => {
    expect(valueToFrame(1.1, 100)).toBe(99);
    expect(valueToFrame(2.0, 100)).toBe(99);
  });

  it('returns 0 when totalFrames is 1', () => {
    expect(valueToFrame(0.0, 1)).toBe(0);
    expect(valueToFrame(0.5, 1)).toBe(0);
    expect(valueToFrame(1.0, 1)).toBe(0);
  });

  it('returns 0 when totalFrames is 0 (edge case)', () => {
    expect(valueToFrame(0.0, 0)).toBe(0);
    expect(valueToFrame(0.5, 0)).toBe(0);
    expect(valueToFrame(1.0, 0)).toBe(0);
  });

  it('distributes uniformly across frames', () => {
    const total = 10;
    for (let i = 0; i < total; i++) {
      const val = i / (total - 1);
      expect(valueToFrame(val, total)).toBe(i);
    }
  });
});
