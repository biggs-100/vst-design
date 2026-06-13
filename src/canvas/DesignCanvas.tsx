import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Transformer } from 'react-konva';
import type Konva from 'konva';
import Grid from './Grid';
import KnobComponent from './KnobComponent';
import SwitchComponent from './SwitchComponent';
import VUMeterComponent from './VUMeterComponent';
import LedComponent from './LedComponent';
import { usePluginStore } from '@/store/usePluginStore';
import type { DesignComponent } from '@/types/component';

const DesignCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);

  // Store subscriptions (fine-grained selectors to minimise re-renders)
  const components = usePluginStore((s) => s.components);
  const gridEnabled = usePluginStore((s) => s.gridEnabled);
  const gridSize = usePluginStore((s) => s.gridSize);
  const projectMeta = usePluginStore((s) => s.projectMeta);
  const selectedComponentId = usePluginStore((s) => s.selectedComponentId);
  const selectComponent = usePluginStore((s) => s.selectComponent);
  const zoom = usePluginStore((s) => s.zoom);
  const panX = usePluginStore((s) => s.panX);
  const panY = usePluginStore((s) => s.panY);

  // Resize the Konva Stage to fill its container on mount and window resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // ── Transformer: attach / detach based on selectedComponentId ──────────
  useEffect(() => {
    if (!transformerRef.current) return;
    if (!selectedComponentId) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
      return;
    }
    const stage = transformerRef.current.getStage();
    if (!stage) return;
    // Konva node IDs match component IDs set via the `id` prop on each Group
    const node = stage.findOne(`#${selectedComponentId}`);
    if (node) {
      transformerRef.current.nodes([node]);
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedComponentId]);

  // ── Wheel handler: Ctrl+scroll = zoom to cursor, plain scroll = vertical pan ──
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const { zoom, panX, panY, setZoom, setPan } = usePluginStore.getState();

    if (e.evt.ctrlKey || e.evt.metaKey) {
      // Zoom toward / away from cursor
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1.1;
      const rawZoom = direction > 0 ? zoom * factor : zoom / factor;
      const newZoom = Math.max(0.25, Math.min(4, rawZoom));

      // Keep the point under the cursor stationary
      const mousePointTo = {
        x: (pointer.x - panX) / zoom,
        y: (pointer.y - panY) / zoom,
      };

      setZoom(newZoom);
      setPan(
        pointer.x - mousePointTo.x * newZoom,
        pointer.y - mousePointTo.y * newZoom,
      );
    } else {
      // Plain scroll → vertical pan
      setPan(panX, panY - e.evt.deltaY);
    }
  }, []);

  // ── Middle-mouse drag pan ──
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button === 1) {
        isPanningRef.current = true;
        setPanning(true);
        lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
        e.evt.preventDefault();
      }
    },
    [],
  );

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanningRef.current) return;
    const dx = e.evt.clientX - lastPosRef.current.x;
    const dy = e.evt.clientY - lastPosRef.current.y;
    const { panX, panY, setPan } = usePluginStore.getState();
    setPan(panX + dx, panY + dy);
    lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    setPanning(false);
  }, []);

  // ── Click on empty stage → deselect ──
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        selectComponent(null);
      }
    },
    [selectComponent],
  );

  const baseWidth = projectMeta.base_width || 800;
  const baseHeight = projectMeta.base_height || 600;

  // ── Render the appropriate component type ──────────────────────────────
  const renderComponent = (comp: DesignComponent) => {
    const isSelected = selectedComponentId === comp.id;
    const select = () => selectComponent(comp.id);

    switch (comp.type) {
      case 'Knob':
        return (
          <KnobComponent
            key={comp.id}
            component={comp}
            isSelected={isSelected}
            onSelect={select}
          />
        );
      case 'Switch':
        return (
          <SwitchComponent
            key={comp.id}
            component={comp}
            isSelected={isSelected}
            onSelect={select}
          />
        );
      case 'VUMeter':
        return (
          <VUMeterComponent
            key={comp.id}
            component={comp}
            isSelected={isSelected}
            onSelect={select}
          />
        );
      case 'LED':
        return (
          <LedComponent
            key={comp.id}
            component={comp}
            isSelected={isSelected}
            onSelect={select}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        x={panX}
        y={panY}
        scaleX={zoom}
        scaleY={zoom}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleStageClick}
        style={{ cursor: panning ? 'grabbing' : 'default' }}
      >
        <Layer>
          {/* Magnetic grid */}
          <Grid
            width={baseWidth}
            height={baseHeight}
            gridSize={gridSize}
            enabled={gridEnabled}
          />

          {/* Render each component based on its type */}
          {components.map(renderComponent)}

          {/* Transformer for the selected component */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Prevent resizing to negative dimensions
              if (newBox.width < 10 || newBox.height < 10) return oldBox;
              return newBox;
            }}
            rotateEnabled={false}
            keepRatio={false}
            borderStroke="#6ab0ff"
            borderStrokeWidth={1.5}
            anchorStroke="#6ab0ff"
            anchorFill="#fff"
            anchorSize={8}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default DesignCanvas;
