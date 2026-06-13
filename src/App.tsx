import React, { useCallback, useEffect, useState } from 'react';
import Toolbar from './panels/Toolbar';
import DesignCanvas from './canvas/DesignCanvas';
import PropertiesPanel from './panels/PropertiesPanel';
import ExportPanel from './panels/ExportPanel';
import FilmstripPreview from './filmstrip/FilmstripPreview';
import ErrorBanner from './components/ErrorBanner';
import { usePluginStore } from '@/store/usePluginStore';
import './styles.css';

const UNSAVED_CHANGES_MSG = 'You have unsaved changes. Save before leaving?';

const App: React.FC = () => {
  const filmstripModalOpen = usePluginStore((s) => s.filmstripModalOpen);
  const setFilmstripModalOpen = usePluginStore((s) => s.setFilmstripModalOpen);
  const schemaVersionWarning = usePluginStore((s) => s.schemaVersionWarning);
  const setSchemaVersionWarning = usePluginStore((s) => s.setSchemaVersionWarning);

  // ── Unsaved changes confirmation (6.8) ─────────────────────────────
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (usePluginStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = UNSAVED_CHANGES_MSG;
        return UNSAVED_CHANGES_MSG;
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // ── Schema version warning banner (6.10) ───────────────────────────
  const showSchemaWarning = schemaVersionWarning && dismissedError !== schemaVersionWarning;

  const dismissSchemaWarning = useCallback(() => {
    setDismissedError(schemaVersionWarning);
    setSchemaVersionWarning(null);
  }, [schemaVersionWarning, setSchemaVersionWarning]);

  // ── Application-level error state ──────────────────────────────────
  const [appError, setAppError] = useState<string | null>(null);

  return (
    <div className="app-container">
      {/* Schema version warning banner */}
      {showSchemaWarning && (
        <ErrorBanner
          message={schemaVersionWarning!}
          onDismiss={dismissSchemaWarning}
          autoDismissMs={8000}
        />
      )}

      {/* Application-level error banner */}
      {appError && (
        <ErrorBanner
          message={appError}
          onDismiss={() => setAppError(null)}
        />
      )}

      <Toolbar />

      <div className="content-area">
        {/* Main canvas area — fills remaining horizontal space */}
        <div className="canvas-area">
          <DesignCanvas />
        </div>

        {/* Right-side panels: Properties (top) + Export (bottom) */}
        <div className="side-panels">
          <PropertiesPanel />
          <ExportPanel onError={setAppError} onSchemaVersionWarning={setSchemaVersionWarning} />
        </div>
      </div>

      {/* Filmstrip Manager modal */}
      <FilmstripPreview
        isOpen={filmstripModalOpen}
        onClose={() => setFilmstripModalOpen(false)}
      />
    </div>
  );
};

export default App;
