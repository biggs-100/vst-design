import React, { useCallback } from 'react';
import { usePluginStore } from '@/store/usePluginStore';
import type { ComponentType, DesignComponent } from '@/types/component';

/** The four component types the toolbar can create. */
const COMPONENT_TYPES: ComponentType[] = ['Knob', 'Switch', 'VUMeter', 'LED'];

/** Default dimensions for each component type. */
const DEFAULT_SIZES: Record<ComponentType, { width: number; height: number }> = {
  Knob: { width: 60, height: 60 },
  Switch: { width: 40, height: 60 },
  VUMeter: { width: 80, height: 120 },
  LED: { width: 30, height: 30 },
};

/**
 * Build a fully-formed DesignComponent for the given type.
 * Position is slightly randomised around the canvas centre to avoid stacking.
 */
function createComponent(type: ComponentType): DesignComponent {
  const id = `${type.toLowerCase()}_${Date.now()}`;
  const offsetX = Math.floor(Math.random() * 80 - 40);
  const offsetY = Math.floor(Math.random() * 80 - 40);
  const base = {
    id,
    x: 400 + offsetX,
    y: 300 + offsetY,
    parameterId: `${type.toLowerCase()}_param`,
    label: type,
  };

  switch (type) {
    case 'Knob':
      return {
        ...base,
        type: 'Knob' as const,
        width: DEFAULT_SIZES.Knob.width,
        height: DEFAULT_SIZES.Knob.height,
        min: 0,
        max: 100,
        defaultValue: 50,
        value: 0.5,
      };
    case 'Switch':
      return {
        ...base,
        type: 'Switch' as const,
        width: DEFAULT_SIZES.Switch.width,
        height: DEFAULT_SIZES.Switch.height,
        states: ['Off', 'On'],
        value: 0,
      };
    case 'VUMeter':
      return {
        ...base,
        type: 'VUMeter' as const,
        width: DEFAULT_SIZES.VUMeter.width,
        height: DEFAULT_SIZES.VUMeter.height,
        needleLength: 60,
        damping: 0.3,
        value: 0,
      };
    case 'LED':
      return {
        ...base,
        type: 'LED' as const,
        width: DEFAULT_SIZES.LED.width,
        height: DEFAULT_SIZES.LED.height,
        colorOn: '#00FF00',
        colorOff: '#333333',
        ledMode: 'on_off',
        value: 0,
      };
  }
}

const Toolbar: React.FC = () => {
  const addComponent = usePluginStore((s) => s.addComponent);
  const gridEnabled = usePluginStore((s) => s.gridEnabled);
  const toggleGrid = usePluginStore((s) => s.toggleGrid);
  const zoom = usePluginStore((s) => s.zoom);
  const setZoom = usePluginStore((s) => s.setZoom);
  const setFilmstripModalOpen = usePluginStore((s) => s.setFilmstripModalOpen);

  const handleAddComponent = useCallback(
    (type: ComponentType) => {
      addComponent(createComponent(type));
    },
    [addComponent],
  );

  const handleZoomSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setZoom(parseFloat(e.target.value));
    },
    [setZoom],
  );

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  return (
    <div className="toolbar">
      {/* ── Component buttons ── */}
      <div className="toolbar-section">
        {COMPONENT_TYPES.map((type) => (
          <button
            key={type}
            className="toolbar-btn"
            onClick={() => handleAddComponent(type)}
            title={`Add ${type} component`}
          >
            {type === 'VUMeter' ? 'VU Meter' : type}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {/* ── Filmstrip Manager ── */}
      <div className="toolbar-section">
        <button
          className="toolbar-btn"
          onClick={() => setFilmstripModalOpen(true)}
          title="Import and manage filmstrip sprites"
        >
          Filmstrip
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* ── Grid toggle ── */}
      <div className="toolbar-section">
        <button
          className={`toolbar-btn${gridEnabled ? ' active' : ''}`}
          onClick={toggleGrid}
          title="Toggle magnetic grid"
        >
          Grid: {gridEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* ── Zoom controls ── */}
      <div className="toolbar-section zoom-section">
        <label>Zoom:</label>
        <input
          type="range"
          min="0.25"
          max="4"
          step="0.05"
          value={zoom}
          onChange={handleZoomSlider}
          className="zoom-slider"
          aria-label="Zoom level"
        />
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="toolbar-btn" onClick={handleZoomReset}>
          Reset
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
