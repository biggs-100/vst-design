import { describe, it, expect } from 'vitest';
import { detectFrameCount } from '@/filmstrip/ImageCache';

describe('detectFrameCount', () => {
  it('detects frameCount=100, frameHeight=10 for 1000px image (1000/100=10)', () => {
    const r = detectFrameCount(1000);
    expect(r.frameCount).toBe(100);
    expect(r.frameHeight).toBe(10);
    expect(r.exact).toBe(true);
  });

  it('detects frameCount=100, frameHeight=8 for 800px image', () => {
    const r = detectFrameCount(800);
    expect(r.frameCount).toBe(100);
    expect(r.frameHeight).toBe(8);
    expect(r.exact).toBe(true);
  });

  it('prefers 128 over 100 for 1920px image (1920%128=0)', () => {
    const r = detectFrameCount(1920);
    expect(r.frameCount).toBe(128);
    expect(r.frameHeight).toBe(15);
    expect(r.exact).toBe(true);
  });

  it('falls back to guessed count when no common count divides evenly', () => {
    // 977 is prime, not divisible by any COMMON_FRAME_COUNTS entry
    // guess=max(2,round(977/100))=max(2,10)=10, floor(977/10)=97, remainder=7
    const r = detectFrameCount(977);
    expect(r.frameCount).toBe(10);
    expect(r.frameHeight).toBe(97);
    expect(r.exact).toBe(false);
  });

  it('returns at least 2 frames in fallback for tiny images', () => {
    // 53 not divisible by any common count → guess=max(2,round(53/100))=2
    const r = detectFrameCount(53);
    expect(r.frameCount).toBe(2);
    expect(r.frameHeight).toBe(26);
    expect(r.exact).toBe(false);
  });

  it('detects exact division from fallback guess', () => {
    // 679 not divisible by any common count → guess=max(2,round(679/100))=7
    // 679%7=0 → exact=true
    const r = detectFrameCount(679);
    expect(r.frameCount).toBe(7);
    expect(r.frameHeight).toBe(97);
    expect(r.exact).toBe(true);
  });
});
