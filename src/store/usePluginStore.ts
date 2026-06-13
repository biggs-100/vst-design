import { create } from 'zustand';
import type { DesignComponent } from '@/types/component';
import type { PluginMeta } from '@/types/schema';

export interface PluginStore {
  projectMeta: PluginMeta;
  components: DesignComponent[];
  selectedComponentId: string | null;
  gridEnabled: boolean;
  gridSize: number;
  zoom: number;
  panX: number;
  panY: number;
  filmstripModalOpen: boolean;
  /** True when unsaved changes exist since last save or load. */
  isDirty: boolean;
  /** Warning message about schema version mismatch, or null. */
  schemaVersionWarning: string | null;

  // Actions
  addComponent: (component: DesignComponent) => void;
  updateComponent: (id: string, props: Partial<DesignComponent>) => void;
  removeComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  setProjectMeta: (meta: Partial<PluginMeta>) => void;
  setFilmstripModalOpen: (open: boolean) => void;
  loadDesign: (components: DesignComponent[], meta: PluginMeta) => void;
  /** Mark the current state as saved — clears isDirty. */
  markSaved: () => void;
  /** Set a schema version warning message (or null to clear). */
  setSchemaVersionWarning: (warning: string | null) => void;
}

export const usePluginStore = create<PluginStore>((set) => ({
  // Default state
  projectMeta: {
    name: 'Untitled Plugin',
    base_width: 800,
    base_height: 600,
  },
  components: [],
  selectedComponentId: null,
  gridEnabled: true,
  gridSize: 20,
  zoom: 1,
  panX: 0,
  panY: 0,
  filmstripModalOpen: false,
  isDirty: false,
  schemaVersionWarning: null,

  // Actions
  addComponent: (component) =>
    set((state) => ({
      components: [...state.components, component],
      isDirty: true,
    })),

  updateComponent: (id, props) =>
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? ({ ...c, ...props } as DesignComponent) : c,
      ),
      isDirty: true,
    })),

  removeComponent: (id) =>
    set((state) => ({
      components: state.components.filter((c) => c.id !== id),
      selectedComponentId:
        state.selectedComponentId === id ? null : state.selectedComponentId,
      isDirty: true,
    })),

  selectComponent: (id) =>
    set({ selectedComponentId: id }),

  setZoom: (zoom) =>
    set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  toggleGrid: () =>
    set((state) => ({ gridEnabled: !state.gridEnabled })),

  setGridSize: (size) =>
    set({ gridSize: Math.max(5, Math.min(100, size)) }),

  setProjectMeta: (meta) =>
    set((state) => ({
      projectMeta: { ...state.projectMeta, ...meta },
      isDirty: true,
    })),

  setFilmstripModalOpen: (open) =>
    set({ filmstripModalOpen: open }),

  loadDesign: (components: DesignComponent[], meta: PluginMeta) =>
    set({
      components,
      projectMeta: meta,
      selectedComponentId: null,
      isDirty: false,
    }),

  markSaved: () => set({ isDirty: false }),

  setSchemaVersionWarning: (warning) => set({ schemaVersionWarning: warning }),
}));
