import { describe, it, expect, beforeEach } from 'vitest';
import { usePluginStore } from '@/store/usePluginStore';
import type { DesignComponent } from '@/types/component';

function makeKnob(id: string, overrides: Partial<DesignComponent> = {}): DesignComponent {
  return {
    id,
    type: 'Knob',
    x: 100,
    y: 200,
    width: 80,
    height: 80,
    label: `Knob ${id}`,
    parameterId: `param_${id}`,
    ...overrides,
  } as DesignComponent;
}

describe('usePluginStore', () => {
  // Reset store before each test by calling the Zustand reset pattern.
  // Zustand stores created with `create` don't have a built-in reset,
  // so we set each slice back to its default.
  beforeEach(() => {
    usePluginStore.setState({
      projectMeta: { name: 'Untitled Plugin', base_width: 800, base_height: 600 },
      components: [],
      selectedComponentId: null,
      gridEnabled: true,
      gridSize: 20,
      zoom: 1,
      panX: 0,
      panY: 0,
      filmstripModalOpen: false,
    });
  });

  /* ── addComponent ─────────────────────────────────────────────────── */
  it('addComponent adds to components array', () => {
    const knob = makeKnob('knob1');
    usePluginStore.getState().addComponent(knob);
    expect(usePluginStore.getState().components).toHaveLength(1);
    expect(usePluginStore.getState().components[0].id).toBe('knob1');
  });

  it('addComponent appends multiple components in order', () => {
    usePluginStore.getState().addComponent(makeKnob('a'));
    usePluginStore.getState().addComponent(makeKnob('b'));
    usePluginStore.getState().addComponent(makeKnob('c'));
    const ids = usePluginStore.getState().components.map((c) => c.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  /* ── updateComponent ──────────────────────────────────────────────── */
  it('updateComponent modifies component in-place', () => {
    usePluginStore.getState().addComponent(makeKnob('k1', { x: 10, y: 20 }));
    usePluginStore.getState().updateComponent('k1', { x: 99, y: 88 });
    const comp = usePluginStore.getState().components.find((c) => c.id === 'k1');
    expect(comp?.x).toBe(99);
    expect(comp?.y).toBe(88);
  });

  it('updateComponent does not affect other components', () => {
    usePluginStore.getState().addComponent(makeKnob('a', { x: 1 }));
    usePluginStore.getState().addComponent(makeKnob('b', { x: 2 }));
    usePluginStore.getState().updateComponent('a', { x: 100 });
    const b = usePluginStore.getState().components.find((c) => c.id === 'b');
    expect(b?.x).toBe(2);
  });

  /* ── removeComponent ──────────────────────────────────────────────── */
  it('removeComponent removes by id', () => {
    usePluginStore.getState().addComponent(makeKnob('r1'));
    usePluginStore.getState().addComponent(makeKnob('r2'));
    usePluginStore.getState().removeComponent('r1');
    expect(usePluginStore.getState().components).toHaveLength(1);
    expect(usePluginStore.getState().components[0].id).toBe('r2');
  });

  it('removeComponent clears selection when removing selected component', () => {
    usePluginStore.getState().addComponent(makeKnob('sel'));
    usePluginStore.getState().selectComponent('sel');
    usePluginStore.getState().removeComponent('sel');
    expect(usePluginStore.getState().selectedComponentId).toBeNull();
  });

  it('removeComponent leaves selection alone when removing non-selected', () => {
    usePluginStore.getState().addComponent(makeKnob('a'));
    usePluginStore.getState().addComponent(makeKnob('b'));
    usePluginStore.getState().selectComponent('a');
    usePluginStore.getState().removeComponent('b');
    expect(usePluginStore.getState().selectedComponentId).toBe('a');
  });

  /* ── selectComponent ─────────────────────────────────────────────── */
  it('selectComponent sets selectedComponentId', () => {
    usePluginStore.getState().selectComponent('some_id');
    expect(usePluginStore.getState().selectedComponentId).toBe('some_id');
  });

  it('selectComponent with null clears selection', () => {
    usePluginStore.getState().selectComponent('some_id');
    usePluginStore.getState().selectComponent(null);
    expect(usePluginStore.getState().selectedComponentId).toBeNull();
  });

  /* ── setZoom ──────────────────────────────────────────────────────── */
  it('setZoom sets zoom value', () => {
    usePluginStore.getState().setZoom(2);
    expect(usePluginStore.getState().zoom).toBe(2);
  });

  it('setZoom clamps to minimum 0.25', () => {
    usePluginStore.getState().setZoom(0.1);
    expect(usePluginStore.getState().zoom).toBe(0.25);
  });

  it('setZoom clamps to maximum 4', () => {
    usePluginStore.getState().setZoom(10);
    expect(usePluginStore.getState().zoom).toBe(4);
  });

  /* ── toggleGrid ──────────────────────────────────────────────────── */
  it('toggleGrid flips gridEnabled boolean', () => {
    const initial = usePluginStore.getState().gridEnabled;
    usePluginStore.getState().toggleGrid();
    expect(usePluginStore.getState().gridEnabled).toBe(!initial);
    usePluginStore.getState().toggleGrid();
    expect(usePluginStore.getState().gridEnabled).toBe(initial);
  });

  /* ── setProjectMeta ──────────────────────────────────────────────── */
  it('setProjectMeta merges partial meta', () => {
    usePluginStore.getState().setProjectMeta({ name: 'My Plugin' });
    expect(usePluginStore.getState().projectMeta.name).toBe('My Plugin');
    expect(usePluginStore.getState().projectMeta.base_width).toBe(800);
  });

  /* ── loadDesign ──────────────────────────────────────────────────── */
  it('loadDesign replaces components and meta, clears selection', () => {
    usePluginStore.getState().addComponent(makeKnob('old'));
    usePluginStore.getState().selectComponent('old');
    usePluginStore.getState().setZoom(2);

    const newComponents = [makeKnob('new1'), makeKnob('new2')];
    const newMeta = { name: 'Loaded', base_width: 1024, base_height: 768 };
    usePluginStore.getState().loadDesign(newComponents, newMeta);

    expect(usePluginStore.getState().components).toHaveLength(2);
    expect(usePluginStore.getState().components[0].id).toBe('new1');
    expect(usePluginStore.getState().projectMeta.name).toBe('Loaded');
    expect(usePluginStore.getState().selectedComponentId).toBeNull();
  });
});
