import React, { useCallback, useEffect, useState } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { usePluginStore } from '@/store/usePluginStore';
import type { DesignComponent, SwitchConfig } from '@/types/component';
import { loadImage } from '@/filmstrip/ImageCache';

export interface SwitchComponentProps {
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

const SwitchComponent: React.FC<SwitchComponentProps> = ({
  component,
  isSelected,
  onSelect,
}) => {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Derive state labels and count from component
  const switchCfg = component as SwitchConfig;
  const states = switchCfg.states ?? ['Off', 'On'];
  const stateCount = states.length;
  const totalFrames = component.frames ?? stateCount;

  // Determine current frame from component.value (0.0–1.0) or default to 0
  const [currentFrame, setCurrentFrame] = useState(
    component.value !== undefined
      ? Math.min(
          Math.floor(component.value * (stateCount - 1)),
          stateCount - 1,
        )
      : 0,
  );
  // Derive value from frame (used on click to persist to store)

  // Load filmstrip image via shared cache
  useEffect(() => {
    if (!component.assetPath) {
      setImageObj(null);
      return;
    }
    let cancelled = false;
    loadImage(component.assetPath)
      .then((img) => { if (!cancelled) setImageObj(img); })
      .catch(() => { if (!cancelled) setImageObj(null); });
    return () => { cancelled = true; };
  }, [component.assetPath]);

  // ── Click to cycle ─────────────────────────────────────────────────────
  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect(component.id);
      const nextFrame = (currentFrame + 1) % stateCount;
      setCurrentFrame(nextFrame);
      const nextValue =
        stateCount > 1 ? nextFrame / (stateCount - 1) : 0;
      usePluginStore.getState().updateComponent(component.id, {
        value: nextValue,
      });
    },
    [component.id, currentFrame, stateCount, onSelect],
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

  // Filmstrip frame crop — prefer stored metadata, fall back to computed
  const frameH = component.frameHeight ?? (imageObj ? imageObj.height / totalFrames : 0);

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
      {imageObj && component.assetPath ? (
        /* ── Filmstrip mode ── */
        <KonvaImage
          image={imageObj}
          x={0}
          y={0}
          width={w}
          height={h}
          crop={{
            x: 0,
            y: currentFrame * frameH,
            width: imageObj.width,
            height: frameH,
          }}
        />
      ) : (
        /* ── Fallback / placeholder mode ── */
        <>
          <Rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill="#555"
            stroke="#777"
            strokeWidth={1.5}
            cornerRadius={6}
          />
          <Text
            x={0}
            y={h / 2 - 8}
            width={w}
            height={16}
            text={states[currentFrame] ?? `State ${currentFrame}`}
            fontSize={10}
            fill="#eee"
            align="center"
            verticalAlign="middle"
          />
        </>
      )}

      {/* Label below */}
      {component.label && (
        <Text
          x={0}
          y={h - 2}
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

export default React.memo(SwitchComponent);
