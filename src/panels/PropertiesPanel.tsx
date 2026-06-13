import React, { useCallback } from 'react';
import { usePluginStore } from '@/store/usePluginStore';
import type { DesignComponent } from '@/types/component';

/* ------------------------------------------------------------------ */
/*  Component type guard helpers                                       */
/* ------------------------------------------------------------------ */

function isKnob(c: DesignComponent): c is DesignComponent & { type: 'Knob' } {
  return c.type === 'Knob';
}
function isSwitch(c: DesignComponent): c is DesignComponent & { type: 'Switch' } {
  return c.type === 'Switch';
}
function isVUMeter(c: DesignComponent): c is DesignComponent & { type: 'VUMeter' } {
  return c.type === 'VUMeter';
}
function isLED(c: DesignComponent): c is DesignComponent & { type: 'LED' } {
  return c.type === 'LED';
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  background: '#1a1a1a',
  color: '#e0e0e0',
  border: '1px solid #555',
  borderRadius: 4,
  fontSize: 12,
};

const numberInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: '100%',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  height: 26,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#aaa',
  marginBottom: 2,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const fieldRowStyle: React.CSSProperties = {
  marginBottom: 8,
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  borderBottom: '1px solid #444',
  paddingBottom: 4,
  marginBottom: 8,
  marginTop: 12,
};

const row2Col: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
};

/* ------------------------------------------------------------------ */
/*  Field renderers                                                    */
/* ------------------------------------------------------------------ */

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (v: string | number) => void;
  type?: 'text' | 'number';
  step?: number;
  min?: number;
  max?: number;
  /** Optional suffix label like "px" */
  suffix?: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  step,
  min,
  max,
  suffix,
}) => (
  <div style={fieldRowStyle}>
    <label style={labelStyle}>{label}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        type={type}
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = type === 'number' ? parseFloat(e.target.value) : e.target.value;
          onChange(v);
        }}
        style={type === 'number' ? numberInputStyle : inputStyle}
      />
      {suffix && <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>{suffix}</span>}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  PropertiesPanel                                                    */
/* ------------------------------------------------------------------ */

const PropertiesPanel: React.FC = () => {
  const selectedComponentId = usePluginStore((s) => s.selectedComponentId);
  const components = usePluginStore((s) => s.components);
  const updateComponent = usePluginStore((s) => s.updateComponent);

  const component = React.useMemo(
    () => components.find((c) => c.id === selectedComponentId) ?? null,
    [components, selectedComponentId],
  );

  // Generic numeric field updater
  const set = useCallback(
    (field: string, val: string | number) => {
      if (!component) return;
      updateComponent(component.id, { [field]: val });
    },
    [component, updateComponent],
  );

  // Early return if no selection
  if (!component) {
    return (
      <div className="panel panel-properties">
        <div className="panel-header">Properties</div>
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            color: '#666',
            fontSize: 12,
          }}
        >
          No component selected
        </div>
      </div>
    );
  }

  return (
    <div className="panel panel-properties">
      <div className="panel-header">Properties</div>

      <div className="panel-body">
        {/* ── Position section ── */}
        <div style={sectionHeaderStyle}>Position</div>
        <div style={row2Col}>
          <Field label="X" type="number" value={component.x} onChange={(v) => set('x', v)} suffix="px" />
          <Field label="Y" type="number" value={component.y} onChange={(v) => set('y', v)} suffix="px" />
          <Field label="W" type="number" value={component.width} onChange={(v) => set('width', v)} suffix="px" />
          <Field label="H" type="number" value={component.height} onChange={(v) => set('height', v)} suffix="px" />
        </div>

        {/* ── Metadata section ── */}
        <div style={sectionHeaderStyle}>Metadata</div>
        <Field label="Label" type="text" value={component.label ?? ''} onChange={(v) => set('label', v)} />
        <Field label="Parameter ID" type="text" value={component.parameterId ?? ''} onChange={(v) => set('parameterId', v)} />
        <Field label="Frames" type="number" value={component.frames ?? 0} onChange={(v) => set('frames', v)} />

        {/* ── Type-specific config ── */}
        {isKnob(component) && (
          <>
            <div style={sectionHeaderStyle}>Knob Config</div>
            <div style={row2Col}>
              <Field label="Min" type="number" value={component.min ?? 0} onChange={(v) => set('min', v)} />
              <Field label="Max" type="number" value={component.max ?? 100} onChange={(v) => set('max', v)} />
            </div>
            <Field label="Default Value" type="number" value={component.defaultValue ?? 50} onChange={(v) => set('defaultValue', v)} />
          </>
        )}

        {isSwitch(component) && (
          <>
            <div style={sectionHeaderStyle}>Switch Config</div>
            <Field
              label="States (comma-separated)"
              type="text"
              value={(component.states ?? []).join(', ')}
              onChange={(v) => {
                const states = String(v).split(',').map((s) => s.trim()).filter(Boolean);
                updateComponent(component.id, { states });
              }}
            />
          </>
        )}

        {isVUMeter(component) && (
          <>
            <div style={sectionHeaderStyle}>VU Meter Config</div>
            <div style={row2Col}>
              <Field label="Needle Length" type="number" value={component.needleLength ?? 60} onChange={(v) => set('needleLength', v)} />
              <Field label="Damping" type="number" value={component.damping ?? 0.3} onChange={(v) => set('damping', v)} step={0.05} min={0} max={1} />
            </div>
          </>
        )}

        {isLED(component) && (
          <>
            <div style={sectionHeaderStyle}>LED Config</div>
            <div style={fieldRowStyle}>
              <label style={labelStyle}>Mode</label>
              <select
                value={component.ledMode ?? 'on_off'}
                onChange={(e) => set('ledMode', e.target.value)}
                style={selectStyle}
              >
                <option value="on_off">On / Off</option>
                <option value="saturation">Saturation</option>
              </select>
            </div>
            <div style={row2Col}>
              <Field label="Color On" type="text" value={component.colorOn ?? '#00FF00'} onChange={(v) => set('colorOn', v)} />
              <Field label="Color Off" type="text" value={component.colorOff ?? '#333333'} onChange={(v) => set('colorOff', v)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(PropertiesPanel);
