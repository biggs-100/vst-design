/**
 * Map a normalised value (0.0–1.0) to a filmstrip frame index.
 *
 * Clamps input to [0, 1], then uniformly distributes across frames [0, totalFrames-1].
 * Returns 0 when totalFrames <= 1.
 *
 * @example
 *   valueToFrame(0.0, 100)   // → 0
 *   valueToFrame(1.0, 100)   // → 99
 *   valueToFrame(0.5, 100)   // → 49
 *   valueToFrame(-0.1, 100)  // → 0   (clamped)
 *   valueToFrame(1.5, 100)   // → 99  (clamped)
 *   valueToFrame(0.5, 1)     // → 0   (single frame)
 */
export function valueToFrame(value: number, totalFrames: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  if (totalFrames <= 1) return 0;
  return Math.floor(clamped * (totalFrames - 1));
}
