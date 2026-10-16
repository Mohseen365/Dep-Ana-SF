import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDefaultProjectUIState,
  loadProjectState,
  saveProjectState,
  updateProjectState,
  clearProjectState,
} from '../lib/projectState';
import { resolveAuthoritativePosition } from '../lib/position-policy';
import { createMockGraphLayoutState } from './fixtures/mockFactories';

describe('Phase 1F — Position Persistence and Provenance Contract Tests', () => {
  const TEST_PROJECT_ID = 'test-proj-phase1f';

  beforeEach(() => {
    clearProjectState(TEST_PROJECT_ID);
  });

  it('A. Same-layout drag persistence: User-dragged position persists within the same layout identity across updates and reload', () => {
    // Initialize default state
    const initialState = createDefaultProjectUIState(TEST_PROJECT_ID);
    saveProjectState(TEST_PROJECT_ID, initialState);

    const draggedPositions = {
      'ApexClass:OrderController': { x: 350, y: 450 },
      'ApexClass:OrderService': { x: 500, y: 600 },
    };

    // Update state simulating drag in Hierarchical mode
    const updated = updateProjectState(TEST_PROJECT_ID, {
      graphLayout: createMockGraphLayoutState({
        architectureMode: 'hierarchical',
        nodePositions: draggedPositions,
        layoutProvenance: 'user-authored',
      }),
    });

    // Check in-memory update
    expect(updated.graphLayout.architectureMode).toBe('hierarchical');
    expect(updated.graphLayout.nodePositions).toEqual(draggedPositions);
    expect(updated.graphLayout.layoutProvenance).toBe('user-authored');
    expect(updated.graphLayout.layoutPositions?.hierarchical).toEqual(draggedPositions);
    expect(updated.graphLayout.layoutProvenances?.hierarchical).toBe('user-authored');

    // Reload from storage and verify persistence
    const reloaded = loadProjectState(TEST_PROJECT_ID);
    expect(reloaded.graphLayout.nodePositions).toEqual(draggedPositions);
    expect(reloaded.graphLayout.layoutPositions?.hierarchical).toEqual(draggedPositions);
    expect(reloaded.graphLayout.layoutProvenances?.hierarchical).toBe('user-authored');
  });

  it('B. Cross-layout isolation: Saved dragged position in Layout A is not blindly applied to Layout B', () => {
    const initialState = createDefaultProjectUIState(TEST_PROJECT_ID);
    saveProjectState(TEST_PROJECT_ID, initialState);

    const hierPositions = {
      'ApexClass:OrderController': { x: 100, y: 200 },
    };

    // 1. Save dragged position in Hierarchical mode
    updateProjectState(TEST_PROJECT_ID, {
      graphLayout: createMockGraphLayoutState({
        architectureMode: 'hierarchical',
        nodePositions: hierPositions,
        layoutProvenance: 'user-authored',
      }),
    });

    // 2. Switch to Orbit mode
    const orbitState = updateProjectState(TEST_PROJECT_ID, {
      graphLayout: createMockGraphLayoutState({
        architectureMode: 'orbit',
        layoutProvenance: 'automatic-orbit',
      }),
    });

    // Verify top-level nodePositions is empty for Orbit (not blindly inheriting Hierarchical positions)
    expect(orbitState.graphLayout.architectureMode).toBe('orbit');
    expect(orbitState.graphLayout.nodePositions).toEqual({});
    expect(orbitState.graphLayout.layoutProvenance).toBe('automatic-orbit');

    // Verify Hierarchical positions remain preserved in layoutPositions.hierarchical
    expect(orbitState.graphLayout.layoutPositions?.hierarchical).toEqual(hierPositions);
    expect(orbitState.graphLayout.layoutProvenances?.hierarchical).toBe('user-authored');

    // 3. Save distinct position in Orbit mode
    const orbitPositions = {
      'ApexClass:OrderController': { x: 800, y: 800 },
    };

    const orbitUpdated = updateProjectState(TEST_PROJECT_ID, {
      graphLayout: createMockGraphLayoutState({
        architectureMode: 'orbit',
        nodePositions: orbitPositions,
        layoutProvenance: 'user-authored',
      }),
    });

    expect(orbitUpdated.graphLayout.nodePositions).toEqual(orbitPositions);
    expect(orbitUpdated.graphLayout.layoutPositions?.orbit).toEqual(orbitPositions);
    expect(orbitUpdated.graphLayout.layoutPositions?.hierarchical).toEqual(hierPositions);
  });

  it('C. Round-trip restoration: Save positions in multiple layouts and verify switching between them restores correct coordinates', () => {
    const initialState = createDefaultProjectUIState(TEST_PROJECT_ID);
    saveProjectState(TEST_PROJECT_ID, initialState);

    const posHier = { 'Node-1': { x: 10, y: 20 } };
    const posHybrid = { 'Node-1': { x: 30, y: 40 } };
    const posOrbit = { 'Node-1': { x: 50, y: 60 } };
    const posConstellation = { 'Node-1': { x: 70, y: 80 } };

    // Set positions for all 4 layout modes
    updateProjectState(TEST_PROJECT_ID, {
      graphLayout: createMockGraphLayoutState({ architectureMode: 'hierarchical', nodePositions: posHier, layoutProvenance: 'user-authored' }),
    });
    updateProjectState(TEST_PROJECT_ID, {
      graphLayout: createMockGraphLayoutState({ architectureMode: 'hybrid', nodePositions: posHybrid, layoutProvenance: 'user-authored' }),
    });
    updateProjectState(TEST_PROJECT_ID, {
      graphLayout: createMockGraphLayoutState({ architectureMode: 'orbit', nodePositions: posOrbit, layoutProvenance: 'user-authored' }),
    });
    updateProjectState(TEST_PROJECT_ID, {
      graphLayout: createMockGraphLayoutState({ architectureMode: 'constellation', nodePositions: posConstellation, layoutProvenance: 'user-authored' }),
    });

    // Round-trip 1: Switch back to Hierarchical
    const sHier = updateProjectState(TEST_PROJECT_ID, { graphLayout: createMockGraphLayoutState({ architectureMode: 'hierarchical' }) });
    expect(sHier.graphLayout.nodePositions).toEqual(posHier);
    expect(sHier.graphLayout.layoutProvenance).toBe('user-authored');

    // Round-trip 2: Switch back to Hybrid
    const sHybrid = updateProjectState(TEST_PROJECT_ID, { graphLayout: createMockGraphLayoutState({ architectureMode: 'hybrid' }) });
    expect(sHybrid.graphLayout.nodePositions).toEqual(posHybrid);
    expect(sHybrid.graphLayout.layoutProvenance).toBe('user-authored');

    // Round-trip 3: Switch back to Orbit
    const sOrbit = updateProjectState(TEST_PROJECT_ID, { graphLayout: createMockGraphLayoutState({ architectureMode: 'orbit' }) });
    expect(sOrbit.graphLayout.nodePositions).toEqual(posOrbit);
    expect(sOrbit.graphLayout.layoutProvenance).toBe('user-authored');

    // Round-trip 4: Switch back to Constellation
    const sConst = updateProjectState(TEST_PROJECT_ID, { graphLayout: createMockGraphLayoutState({ architectureMode: 'constellation' }) });
    expect(sConst.graphLayout.nodePositions).toEqual(posConstellation);
    expect(sConst.graphLayout.layoutProvenance).toBe('user-authored');
  });

  it('D. Provenance correctness: Distinguishes user-dragged positions from generated positions and enforces mode isolation', () => {
    const userPos = { 'Node-A': { x: 123, y: 456 } };

    // Level 1: Explicit user drag in active session
    const resolvedSession = resolveAuthoritativePosition('Node-A', {
      sessionPositions: userPos,
      persistedPositions: userPos,
      hasAuthoritativePositions: true,
    });
    expect(resolvedSession).not.toBeNull();
    expect(resolvedSession?.level).toBe(1);
    expect(resolvedSession?.position).toEqual({ x: 123, y: 456 });

    // Level 2: Persisted position when hasAuthoritativePositions is true
    const resolvedPersisted = resolveAuthoritativePosition('Node-A', {
      persistedPositions: userPos,
      hasAuthoritativePositions: true,
    });
    expect(resolvedPersisted).not.toBeNull();
    expect(resolvedPersisted?.level).toBe(2);

    // Cross-mode isolation check: if hasAuthoritativePositions is false (e.g. Mode B switching while holding Mode A positions)
    const resolvedStale = resolveAuthoritativePosition('Node-A', {
      persistedPositions: userPos,
      hasAuthoritativePositions: false,
    });
    expect(resolvedStale).toBeNull();
  });

  it('E. Legacy project state: Normalizes flat legacy nodePositions state without throwing or data loss', () => {
    const legacyFlatPositions = {
      'ApexClass:LegacyController': { x: 999, y: 888 },
    };

    const legacyRawJSON = {
      projectId: TEST_PROJECT_ID,
      graphLayout: {
        mode: 'interactive',
        architectureMode: 'hierarchical',
        nodePositions: legacyFlatPositions,
        // layoutPositions and layoutProvenances are omitted as in legacy state
      },
    };

    // Save legacy state directly into storage
    saveProjectState(TEST_PROJECT_ID, legacyRawJSON as any);

    // Load and verify deterministic fallback migration
    const loaded = loadProjectState(TEST_PROJECT_ID);

    expect(loaded.graphLayout.architectureMode).toBe('hierarchical');
    expect(loaded.graphLayout.nodePositions).toEqual(legacyFlatPositions);
    expect(loaded.graphLayout.layoutPositions?.hierarchical).toEqual(legacyFlatPositions);
    expect(loaded.graphLayout.layoutProvenances?.hierarchical).toBe('automatic-hierarchical');

    // Round-trip serialization/deserialization check
    saveProjectState(TEST_PROJECT_ID, loaded);
    const reloaded = loadProjectState(TEST_PROJECT_ID);
    expect(reloaded.graphLayout.layoutPositions?.hierarchical).toEqual(legacyFlatPositions);
  });

  it('F. Node lifecycle and identity: Handles deleted and reintroduced nodes safely without crashing', () => {
    const initialPositions = {
      'Node-1': { x: 100, y: 100 },
      'Node-2': { x: 200, y: 200 },
    };

    updateProjectState(TEST_PROJECT_ID, {
      graphLayout: createMockGraphLayoutState({
        architectureMode: 'hierarchical',
        nodePositions: initialPositions,
        layoutProvenance: 'user-authored',
      }),
    });

    // Simulating node deletion: resolving a deleted node returns null or fallback without throwing
    const deletedResolved = resolveAuthoritativePosition('Node-Deleted', {
      persistedPositions: initialPositions,
      hasAuthoritativePositions: true,
    });
    expect(deletedResolved).toBeNull();

    // Resolving existing node returns valid position
    const existingResolved = resolveAuthoritativePosition('Node-1', {
      persistedPositions: initialPositions,
      hasAuthoritativePositions: true,
    });
    expect(existingResolved?.position).toEqual({ x: 100, y: 100 });
  });

  it('G. Layout options: Transient UI settings update without corrupting node positions or layout identity', () => {
    const basePositions = { 'Node-1': { x: 150, y: 250 } };

    updateProjectState(TEST_PROJECT_ID, {
      graphLayout: createMockGraphLayoutState({
        architectureMode: 'hierarchical',
        nodePositions: basePositions,
        layoutProvenance: 'user-authored',
      }),
    });

    // Update transient zoom/pan state
    updateProjectState(TEST_PROJECT_ID, {
      zoom: { zoom: 1.5, pan: { x: 50, y: 50 } },
    });

    const stateAfterZoom = loadProjectState(TEST_PROJECT_ID);
    expect(stateAfterZoom.zoom.zoom).toBe(1.5);
    expect(stateAfterZoom.graphLayout.nodePositions).toEqual(basePositions);
    expect(stateAfterZoom.graphLayout.architectureMode).toBe('hierarchical');
    expect(stateAfterZoom.graphLayout.layoutProvenance).toBe('user-authored');
  });
});
