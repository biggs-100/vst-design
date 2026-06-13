import React, { useCallback, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { usePluginStore } from '@/store/usePluginStore';
import type { DesignComponent } from '@/types/component';
import type { ComponentData, PluginDesignJson } from '@/types/schema';
import { CURRENT_SCHEMA_VERSION } from '@/types/schema';
import { toPluginDesignJson } from '@/utils/toPluginDesignJson';
import { generateCppHeader, generateCppSource } from '@/utils/generateSnippets';

export interface ExportPanelProps {
  /** Callback to set an application-level error message. */
  onError?: (error: string | null) => void;
  /** Callback to set a schema version warning message. */
  onSchemaVersionWarning?: (warning: string | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

type TabId = 'json' | 'h' | 'cpp';

const TABS: { id: TabId; label: string }[] = [
  { id: 'json', label: 'JSON' },
  { id: 'h', label: 'C++ .h' },
  { id: 'cpp', label: 'C++ .cpp' },
];

/* ------------------------------------------------------------------ */
/*  Convert DesignComponent[] → DesignComponent[] (from ComponentData) */
/* ------------------------------------------------------------------ */

function fromComponentData(data: ComponentData): DesignComponent {
  const base = {
    id: data.id,
    x: data.x,
    y: data.y,
    width: data.width,
    height: data.height,
    parameterId: data.parameter_id,
    label: data.parameter_id || data.id,
    assetPath: data.asset_path,
    frames: data.frames,
  };

  const cfg = data.config ?? {};

  switch (data.component_type) {
    case 'Knob':
      return {
        ...base,
        type: 'Knob',
        min: (cfg as Record<string, unknown>).min as number ?? 0,
        max: (cfg as Record<string, unknown>).max as number ?? 100,
        defaultValue: (cfg as Record<string, unknown>).default_value as number ?? 50,
        value: 0.5,
      } as DesignComponent;
    case 'Switch':
      return {
        ...base,
        type: 'Switch',
        states: (cfg as Record<string, unknown>).states as string[] ?? ['Off', 'On'],
        value: 0,
      } as DesignComponent;
    case 'VUMeter':
      return {
        ...base,
        type: 'VUMeter',
        needleLength: (cfg as Record<string, unknown>).needle_length as number ?? 60,
        damping: (cfg as Record<string, unknown>).damping as number ?? 0.3,
        value: 0,
      } as DesignComponent;
    case 'LED':
      return {
        ...base,
        type: 'LED',
        colorOn: (cfg as Record<string, unknown>).color_on as string ?? '#00FF00',
        colorOff: (cfg as Record<string, unknown>).color_off as string ?? '#333333',
        ledMode: (cfg as Record<string, unknown>).mode as 'on_off' | 'saturation' ?? 'on_off',
        value: 0,
      } as DesignComponent;
    default:
      throw new Error(`Unknown component type: ${data.component_type}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validate(components: DesignComponent[]): ValidationResult {
  const errors: string[] = [];

  for (const comp of components) {
    // Every component type should have a parameter_id
    if (!comp.parameterId || comp.parameterId.trim() === '') {
      errors.push(`Missing parameter_id for: ${comp.label || comp.id}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/* ------------------------------------------------------------------ */
/*  Inline styles                                                      */
/* ------------------------------------------------------------------ */

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #444',
  marginBottom: 8,
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 600,
  color: active ? '#e0e0e0' : '#777',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid #4a90d9' : '2px solid transparent',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

const preStyle: React.CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid #444',
  borderRadius: 4,
  padding: 8,
  fontSize: 11,
  fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
  color: '#ccc',
  overflow: 'auto',
  whiteSpace: 'pre',
  wordWrap: 'normal',
  lineHeight: 1.5,
  margin: 0,
  flex: 1,
  minHeight: 0,
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '5px 12px',
  background: '#4a90d9',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 600,
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: '5px 12px',
  background: '#4a4a4a',
  color: '#e0e0e0',
  border: '1px solid #666',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11,
};

const errorBannerStyle: React.CSSProperties = {
  background: '#4a1a1a',
  border: '1px solid #8a3a3a',
  borderRadius: 4,
  padding: '6px 10px',
  color: '#e88',
  fontSize: 11,
  marginBottom: 8,
  lineHeight: 1.5,
};

/* ------------------------------------------------------------------ */
/*  ExportPanel                                                        */
/* ------------------------------------------------------------------ */

const ExportPanel: React.FC<ExportPanelProps> = ({
  onError,
  onSchemaVersionWarning,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('json');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Subscribe to store (fine-grained selectors for real-time updates)
  const components = usePluginStore((s) => s.components);
  const projectMeta = usePluginStore((s) => s.projectMeta);
  const loadDesign = usePluginStore((s) => s.loadDesign);
  const markSaved = usePluginStore((s) => s.markSaved);

  // Memo-computed outputs
  const designJson = useMemo(
    () => toPluginDesignJson(components, projectMeta),
    [components, projectMeta],
  );

  const formattedJson = useMemo(
    () => JSON.stringify(designJson, null, 2),
    [designJson],
  );

  const cppHeader = useMemo(
    () => generateCppHeader(components, projectMeta.name),
    [components, projectMeta.name],
  );

  const cppSource = useMemo(
    () => generateCppSource(components),
    [components],
  );

  const validation = useMemo(() => validate(components), [components]);

  // ── Clipboard copy ────────────────────────────────────────────────

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${label} copied!`);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback('Copy failed');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }, []);

  // ── Save handler (5.6) ────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setActionError(null);
    if (!validation.valid) {
      setActionError(validation.errors.join('\n'));
      return;
    }
    try {
      const path = await invoke<string | null>('open_file_dialog', { kind: 'save' });
      if (!path) return; // user cancelled
      await invoke('save_design', { path, design: designJson });
      markSaved();
      setCopyFeedback('Design saved!');
      setTimeout(() => setCopyFeedback(null), 2000);
      onError?.(null);
    } catch (err) {
      const msg = `Save failed: ${err instanceof Error ? err.message : String(err)}`;
      setActionError(msg);
      onError?.(msg);
    }
  }, [designJson, validation, markSaved, onError]);

  // ── Load handler (5.7) ────────────────────────────────────────────

  const handleLoad = useCallback(async () => {
    setActionError(null);
    try {
      const path = await invoke<string | null>('open_file_dialog', { kind: 'open' });
      if (!path) return; // user cancelled
      const loaded: PluginDesignJson = await invoke('load_design', { path });

      // ── Schema version check (6.10) ──────────────────────────────
      const fileVersion = loaded.schema_version ?? 0;
      if (fileVersion < CURRENT_SCHEMA_VERSION) {
        onSchemaVersionWarning?.(
          `This file was created with an older version of PluginStudio (schema v${fileVersion}). ` +
          'Some features may not be available.',
        );
      } else if (fileVersion > CURRENT_SCHEMA_VERSION) {
        onSchemaVersionWarning?.(
          `This file was created with a newer version of PluginStudio (schema v${fileVersion}). ` +
          'Try upgrading PluginStudio.',
        );
      } else {
        onSchemaVersionWarning?.(null);
      }

      const restored = loaded.ui_components.map(fromComponentData);
      loadDesign(restored, loaded.plugin_meta);
      setCopyFeedback('Design loaded!');
      setTimeout(() => setCopyFeedback(null), 2000);
      onError?.(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Provide a user-friendly message for parse errors (6.9)
      const friendly = msg.includes('parse') || msg.includes('JSON')
        ? `Could not read file: ${msg}`
        : `Load failed: ${msg}`;
      setActionError(friendly);
      onError?.(friendly);
    }
  }, [loadDesign, onError, onSchemaVersionWarning]);

  // ── Export file handler (5.8) ─────────────────────────────────────

  const handleExportFile = useCallback(async () => {
    setActionError(null);
    if (!validation.valid) {
      setActionError(validation.errors.join('\n'));
      return;
    }
    try {
      const path = await invoke<string | null>('open_file_dialog', { kind: 'save' });
      if (!path) return;
      await invoke('save_design', { path, design: designJson });
      markSaved();
      setCopyFeedback('File exported!');
      setTimeout(() => setCopyFeedback(null), 2000);
      onError?.(null);
    } catch (err) {
      const msg = `Export failed: ${err instanceof Error ? err.message : String(err)}`;
      setActionError(msg);
      onError?.(msg);
    }
  }, [designJson, validation, markSaved, onError]);

  // ── Active tab content ────────────────────────────────────────────

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'json':
        return (
          <>
            <pre style={preStyle}>{formattedJson}</pre>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                style={btnPrimaryStyle}
                onClick={() => copyToClipboard(formattedJson, 'JSON')}
              >
                Copy JSON
              </button>
              <button
                style={{
                  ...btnSecondaryStyle,
                  opacity: validation.valid ? 1 : 0.5,
                }}
                onClick={handleExportFile}
                disabled={!validation.valid}
                title={
                  !validation.valid
                    ? 'Fix validation errors before exporting'
                    : 'Export .plugindesign file'
                }
              >
                Export File
              </button>
            </div>
          </>
        );
      case 'h':
        return (
          <>
            <pre style={preStyle}>{cppHeader}</pre>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                style={btnPrimaryStyle}
                onClick={() => copyToClipboard(cppHeader, '.h')}
              >
                Copy .h
              </button>
            </div>
          </>
        );
      case 'cpp':
        return (
          <>
            <pre style={preStyle}>{cppSource}</pre>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                style={btnPrimaryStyle}
                onClick={() => copyToClipboard(cppSource, '.cpp')}
              >
                Copy .cpp
              </button>
            </div>
          </>
        );
    }
  }, [
    activeTab,
    formattedJson,
    cppHeader,
    cppSource,
    copyToClipboard,
    validation,
    handleExportFile,
  ]);

  return (
    <div className="panel panel-export">
      {/* ── Header with Save/Load ── */}
      <div className="panel-header">
        <span>Export</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            style={{
              ...btnSecondaryStyle,
              padding: '3px 8px',
              fontSize: 10,
            }}
            onClick={handleSave}
            title="Save design to .plugindesign file"
          >
            Save
          </button>
          <button
            style={{
              ...btnSecondaryStyle,
              padding: '3px 8px',
              fontSize: 10,
            }}
            onClick={handleLoad}
            title="Load design from .plugindesign file"
          >
            Load
          </button>
        </div>
      </div>

      <div className="panel-body">
        {/* ── Validation error banner (5.9) ── */}
        {!validation.valid && (
          <div style={errorBannerStyle}>
            <strong>Cannot export:</strong>
            {validation.errors.map((err, i) => (
              <div key={i}>• {err}</div>
            ))}
          </div>
        )}

        {/* ── Action error (disk full, parse failure, etc.) ── */}
        {actionError && (
          <div style={errorBannerStyle}>
            <strong>Error:</strong> {actionError}
            <button
              style={{
                marginLeft: 8,
                background: 'none',
                border: 'none',
                color: '#e88',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 11,
              }}
              onClick={() => setActionError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Copy feedback ── */}
        {copyFeedback && (
          <div
            style={{
              color: '#8c8',
              fontSize: 11,
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            {copyFeedback}
          </div>
        )}

        {/* ── Tab bar ── */}
        <div style={tabBarStyle}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              style={tabStyle(activeTab === tab.id)}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {tabContent}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ExportPanel);
