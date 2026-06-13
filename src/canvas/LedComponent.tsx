import React, { useCallback } from 'react';
import { Group, Circle, Text } from 'react-konva';
import type Konva from 'konva';
import { usePluginStore } from '@/store/usePluginStore';
import type { DesignComponent, LedConfig } from '@/types/component';

export interface LedComponentProps {
  component: DesignComponent;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

/** Snap a position to the nearest grid intersection (if within tolerance). */
const SNAP_TOLERANCE = 10;
function snap(value: number, gridSize: number): number {
  const snapped = Math.round(value / gridSize) * gridSize;
  return Math.abs(value - snapped) <= SNAP_TOLERANCE ? snapped : value;
}

/**
 * Parse a hex colour string like "#ff3333" into { r, g, b } components.
 * Returns null on failure.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

/**
 * Linear-interpolate between two hex colours by factor `t` (0.0–1.0).
 */
function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return t < 0.5 ? a : b;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(ca.r + (cb.r - ca.r) * t);
  const g = clamp(ca.g + (cb.g - ca.g) * t);
  const bVal = clamp(ca.b + (cb.b - ca.b) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bVal.toString(16).padStart(2, '0')}`;
}

const LedComponent: React.FC<LedComponentProps> = ({
  component,
  isSelected,
  onSelect,
}) => {
  const ledCfg = component as LedConfig;
  const colorOn = ledCfg.colorOn ?? '#ff3333';
  const colorOff = ledCfg.colorOff ?? '#333333';
  const ledMode = ledCfg.ledMode ?? 'on_off';
  const value = component.value ?? 0;

  // ── Determine fill colour based on mode ────────────────────────────────
  let fillColor: string;
  if (ledMode === 'saturation') {
    // Interpolate from colorOff to colorOn based on value
    fillColor = lerpColor(colorOff, colorOn, value);
  } else {
    // on_off: binary — value > 0 → on, else off
    fillColor = value > 0 ? colorOn : colorOff;
  }

  // ── Click to toggle (on_off mode only) ─────────────────────────────────
  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect(component.id);

      if (ledMode === 'on_off') {
        // Toggle between 0 and 1
        const newValue = (component.value ?? 0) > 0 ? 0 : 1;
        usePluginStore.getState().updateComponent(component.id, {
          value: newValue,
        });
      }
    },
    [component.id, component.value, ledMode, onSelect],
  );

  // ── Position drag ──────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const { gridEnabled, gridSize } = usePluginStore.getState();
      const snapSize = gridEnabled ? gridSize : 1;
      usePluginStore.getState().updateComponent(component.id, {
        x: snap(e.target.x(), snapSize),
        y: snap(e.target.y(), snapSize),
      });
    },
    [component.id],
  );

  const handleDragStart = useCallback(() => {
    if (!isSelected) onSelect(component.id);
  }, [component.id, isSelected, onSelect]);

  // ── Geometry ───────────────────────────────────────────────────────────
  const w = component.width;
  const h = component.height;
  const radius = Math.min(w, h) * 0.35;
  const ledCx = radius + 4;
  const labelX = ledCx + radius + 6;

  return (
    <Group
      id={component.id}
      x={component.x}
      y={component.y}
      width={w}
      height={h}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* LED circle */}
      <Circle
        x={ledCx}
        y={h / 2}
        radius={radius}
        fill={fillColor}
        stroke={value > 0 ? colorOn : '#555'}
        strokeWidth={1}
      />

      {/* Label next to the LED */}
      {component.label && (
        <Text
          x={labelX}
          y={h / 2 - 7}
          width={w - labelX - 2}
          height={14}
          text={component.label}
          fontSize={10}
          fill="#bbb"
          align="left"
          verticalAlign="middle"
        />
      )}
    </Group>
  );
};

export default React.memo(LedComponent);
