import React, { useCallback } from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import type Konva from 'konva';
import { usePluginStore } from '@/store/usePluginStore';
import type { DesignComponent, VUMeterConfig } from '@/types/component';

export interface VUMeterComponentProps {
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

/** Scale mark dB labels and their normalised Y position within the meter face. */
const SCALE_MARKS: { db: number; normY: number }[] = [
  { db: -20, normY: 0.8 },
  { db: -10, normY: 0.55 },
  { db: -5, normY: 0.35 },
  { db: 0, normY: 0.15 },
];

const VUMeterComponent: React.FC<VUMeterComponentProps> = ({
  component,
  isSelected,
  onSelect,
}) => {
  const vuCfg = component as VUMeterConfig;
  const needleLen = vuCfg.needleLength ?? component.height * 0.8;

  // Value from component, default 0
  const value = component.value ?? 0;

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
  const padding = 6;
  const faceW = w - padding * 2;
  const faceH = h - padding * 2 - 16; // reserve space for label

  // Needle angle: value 0.0 → -45°, 1.0 → +45°
  const needleAngle = (value - 0.5) * 90;

  // Pivot point: bottom centre of the face area
  const pivotX = w / 2;
  const pivotY = padding + faceH;

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
      onClick={() => onSelect(component.id)}
      onTap={() => onSelect(component.id)}
    >
      {/* Outer body */}
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill="#222"
        stroke="#555"
        strokeWidth={1.5}
        cornerRadius={4}
      />

      {/* Meter face (inset) */}
      <Rect
        x={padding}
        y={padding}
        width={faceW}
        height={faceH}
        fill="#1a1a1a"
        stroke="#333"
        strokeWidth={1}
        cornerRadius={2}
      />

      {/* Scale marks */}
      {SCALE_MARKS.map(({ db, normY }) => {
        const y = padding + faceH * normY;
        return (
          <React.Fragment key={db}>
            {/* Tick line */}
            <Line
              points={[padding + 4, y, w - padding - 4, y]}
              stroke="#666"
              strokeWidth={0.5}
              listening={false}
            />
            {/* dB label */}
            <Text
              x={padding + 2}
              y={y - 5}
              width={24}
              height={10}
              text={`${db}`}
              fontSize={7}
              fill="#888"
              align="left"
              listening={false}
            />
          </React.Fragment>
        );
      })}

      {/* Needle pivot dot */}
      <Circle
        x={pivotX}
        y={pivotY}
        radius={3}
        fill="#555"
        listening={false}
      />

      {/* Needle group rotated around pivot */}
      <Group
        x={pivotX}
        y={pivotY}
        rotation={needleAngle}
        listening={false}
      >
        <Line
          points={[0, 0, 0, -needleLen]}
          stroke="#e44"
          strokeWidth={2}
          lineCap="round"
        />
      </Group>

      {/* 0 dB reference mark (slightly brighter line at the top) */}

      {/* Label below */}
      {component.label && (
        <Text
          x={0}
          y={h - 14}
          width={w}
          height={14}
          text={component.label}
          fontSize={9}
          fill="#bbb"
          align="center"
          verticalAlign="top"
        />
      )}
    </Group>
  );
};

export default React.memo(VUMeterComponent);
