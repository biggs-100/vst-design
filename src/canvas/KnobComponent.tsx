import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Group, Circle, Line, Text, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { usePluginStore } from '@/store/usePluginStore';
import type { DesignComponent } from '@/types/component';
import { loadImage } from '@/filmstrip/ImageCache';
import { valueToFrame } from '@/utils/valueToFrame';

export interface KnobComponentProps {
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

/** Default knob rotation sweep in degrees (centered, so ±halfSweep from 12-o'clock). */
const HALF_SWEEP = 135;

const KnobComponent: React.FC<KnobComponentProps> = ({
  component,
  isSelected,
  onSelect,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const isRotatingRef = useRef(false);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Local value synced to store; initialised from component.value or 0.5
  const [localValue, setLocalValue] = useState(
    component.value ?? 0.5,
  );

  // Derive total frames from component.frames
  const totalFrames = component.frames ?? 100;
  const currentFrame = valueToFrame(localValue, totalFrames);

  // Load filmstrip image when assetPath changes
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

  // ── Circular drag for value ────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Stop propagation so the parent Group does NOT start a position drag
      e.cancelBubble = true;
      isRotatingRef.current = true;
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isRotatingRef.current) return;
      e.cancelBubble = true;

      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      // Convert pointer to canvas coordinates (undo Stage pan/zoom)
      const { panX, panY, zoom } = usePluginStore.getState();
      const canvasX = (pointer.x - panX) / zoom;
      const canvasY = (pointer.y - panY) / zoom;

      // Knob centre in canvas coords
      const cx = component.x + component.width / 2;
      const cy = component.y + component.height / 2;

      // Angle from centre to mouse (degrees)
      const angleDeg =
        Math.atan2(canvasY - cy, canvasX - cx) * (180 / Math.PI);

      // Map angle to value: -135..+135 → 0..1
      // We offset by 90° so that 12-o'clock is the midpoint (value 0.5)
      const offset = 90; // so straight up = 90° in atan2
      const raw = (angleDeg + offset + HALF_SWEEP) / (HALF_SWEEP * 2);
      const newValue = Math.max(0, Math.min(1, raw));
      setLocalValue(newValue);
    },
    [component.x, component.y, component.width, component.height],
  );

  const handleMouseUp = useCallback(() => {
    if (!isRotatingRef.current) return;
    isRotatingRef.current = false;
    // Persist final value to store
    usePluginStore.getState().updateComponent(component.id, {
      value: localValue,
    });
  }, [component.id, localValue]);

  // Also clean up on mouse leave (cancels rotation)
  const handleMouseLeave = useCallback(() => {
    if (isRotatingRef.current) {
      isRotatingRef.current = false;
      usePluginStore.getState().updateComponent(component.id, {
        value: localValue,
      });
    }
  }, [component.id, localValue]);

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
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) * 0.4;
  const innerR = outerR * 0.45;
  const indicatorLen = outerR * 0.85;

  // Rotation of the indicator line (deg): 0.0→-135°, 1.0→+135°
  const indicatorAngle = (localValue - 0.5) * (HALF_SWEEP * 2);

  // Filmstrip frame crop — prefer stored metadata, fall back to computed
  const frameH = component.frameHeight ?? (imageObj ? imageObj.height / totalFrames : 0);

  return (
    <Group
      ref={groupRef}
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
          // Prevent the image from initiating position drag; it's for rotation only
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      ) : (
        /* ── Fallback / placeholder mode ── */
        <>
          {/* Outer ring */}
          <Circle
            x={cx}
            y={cy}
            radius={outerR}
            fill="#444"
            stroke="#666"
            strokeWidth={2}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
          {/* Inner disc */}
          <Circle
            x={cx}
            y={cy}
            radius={innerR}
            fill="#333"
            stroke="#555"
            strokeWidth={1}
            listening={false}
          />
          {/* Indicator line */}
          <Line
            x={cx}
            y={cy}
            points={[0, 0, indicatorLen, 0]}
            stroke="#e88"
            strokeWidth={2}
            lineCap="round"
            rotation={indicatorAngle - 90}
            listening={false}
          />
        </>
      )}

      {/* Label below the knob */}
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

export default React.memo(KnobComponent);
