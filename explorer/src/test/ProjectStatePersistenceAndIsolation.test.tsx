import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createDefaultProjectUIState,
  loadProjectState,
  saveProjectState,
  updateProjectState,
  clearProjectState,
  getProjectStorageKey,
  type ProjectUIState,
} from '../lib/projectState';
import {
  shouldAutoLayout,
  resolveAuthoritativePosition,
  calculateDeterministicNewNodePosition,
} from '../lib/position-policy';
import { ALL_EXPLORER_NODE_TYPES } from '../types/explorer';

describe('PROMPT 6D: Project State, Persistence, Restoration & Isolation Acceptance Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('1. Position Authority & Zero Coordinate Drift', () => {
    it('restores exact user-authored manual node positions with 0.00000 px drift', () => {
      const projectId = 'proj-drag-test';
      const initialPositions = {
        'ApexClass:AccountController': { x: 100, y: 100 },
        'ApexClass:AccountService': { x: 500, y: 300 },
        'CustomObject:Account': { x: 900, y: 700 },
      };

      const state = createDefaultProjectUIState(projectId);
      state.graphLayout.nodePositions = initialPositions;
      saveProjectState(projectId, state);

      const restored = loadProjectState(projectId);
      const restoredPositions = restored.graphLayout.nodePositions;

      expect(restoredPositions['ApexClass:AccountController']).toEqual({ x: 100, y: 100 });
      expect(restoredPositions['ApexClass:AccountService']).toEqual({ x: 500, y: 300 });
      expect(restoredPositions['CustomObject:Account']).toEqual({ x: 900, y: 700 });

      // Calculate exact coordinate drift
      for (const [nodeId, origPos] of Object.entries(initialPositions)) {
        const restPos = restoredPositions[nodeId];
        const driftX = Math.abs(origPos.x - restPos.x);
        const driftY = Math.abs(origPos.y - restPos.y);
        expect(driftX).toBe(0);
        expect(driftY).toBe(0);
      }
    });

    it('resolves position authority hierarchy correctly (Level 1 session drag > Level 2 persisted)', () => {
      const nodeId = 'ApexClass:Service';
      const sessionPos = { x: 250, y: 350 };
      const persistedPos = { x: 100, y: 100 };

      // Level 1: Session drag
      const resLevel1 = resolveAuthoritativePosition(nodeId, {
        sessionPositions: new Map([[nodeId, sessionPos]]),
        persistedPositions: { [nodeId]: persistedPos },
      });
      expect(resLevel1?.level).toBe(1);
      expect(resLevel1?.position).toEqual(sessionPos);

      // Level 2: Persisted position when session position is absent
      const resLevel2 = resolveAuthoritativePosition(nodeId, {
        sessionPositions: new Map(),
        persistedPositions: { [nodeId]: persistedPos },
      });
      expect(resLevel2?.level).toBe(2);
      expect(resLevel2?.position).toEqual(persistedPos);
    });
  });

  describe('2. New Node Behavior', () => {
    it('preserves existing persisted node positions when a new node is added', () => {
      const projectId = 'proj-new-node';
      const existingPositions = {
        'ApexClass:A': { x: 120, y: 240 },
        'ApexClass:B': { x: 480, y: 360 },
      };

      // Project state with A and B persisted
      updateProjectState(projectId, {
        graphLayout: {
          layoutName: 'cola',
          mode: 'interactive',
          nodePositions: existingPositions,
        },
      });

      // New node C arrives with an edge to A
      const edges: ExplorerEdge[] = [
        {
          id: 'e1',
          source: 'ApexClass:A',
          target: 'ApexClass:C',
          relationshipType: 'method-call',
          method: null,
          evidence: '',
          unresolved: false,
          resolutionClassification: 'RESOLVED_LOCAL',
          resolutionStrategy: 'EXACT',
          confidence: '1.0',
          line: null,
          column: null,
          methodOwner: null,
          file: '',
          canonical: {
            source: { type: 'ApexClass', name: 'A' },
            target: { type: 'ApexClass', name: 'C' },
            relationship: { type: 'method-call', resolution: 'EXACT' },
            location: {},
          },
        },
      ];

      const newPosC = calculateDeterministicNewNodePosition(
        'ApexClass:C',
        edges,
        existingPositions
      );

      // Save C alongside existing positions
      updateProjectState(projectId, {
        graphLayout: {
          layoutName: 'cola',
          mode: 'interactive',
          nodePositions: {
            ...existingPositions,
            'ApexClass:C': newPosC,
          },
        },
      });

      const reloaded = loadProjectState(projectId);
      const reloadedPositions = reloaded.graphLayout.nodePositions;

      // Existing nodes MUST remain completely unchanged
      expect(reloadedPositions['ApexClass:A']).toEqual({ x: 120, y: 240 });
      expect(reloadedPositions['ApexClass:B']).toEqual({ x: 480, y: 360 });

      // New node MUST have a valid deterministic position
      expect(reloadedPositions['ApexClass:C']).toBeDefined();
      expect(typeof reloadedPositions['ApexClass:C'].x).toBe('number');
      expect(typeof reloadedPositions['ApexClass:C'].y).toBe('number');
    });
  });

  describe('3. Project Switching & Cross-Project Contamination', () => {
    it('guarantees complete state isolation during A -> B -> A switching with overlapping node IDs', () => {
      const projA = 'project-alpha';
      const projB = 'project-beta';

      // Shared node ID 'NodeX' with different positions in A and B
      updateProjectState(projA, {
        selectedComponent: { selectedNodeId: 'NodeX', selectedEdgeId: null, selectedInvestigationId: null },
        filters: { searchQuery: 'AlphaSearch', typeFilter: 'ApexClass', riskFilter: 'HIGH', hasCallouts: true, withoutSharing: false, hideTests: false, hasAsyncPatterns: false, visibleNodeTypes: ['ApexClass'] },
        graphLayout: { layoutName: 'cose', mode: 'static', nodePositions: { NodeX: { x: 100, y: 100 } } },
        zoom: { zoom: 0.8, pan: { x: 10, y: 20 } },
      });

      updateProjectState(projB, {
        selectedComponent: { selectedNodeId: 'NodeX', selectedEdgeId: null, selectedInvestigationId: null },
        filters: { searchQuery: 'BetaSearch', typeFilter: 'LWC', riskFilter: 'LOW', hasCallouts: false, withoutSharing: true, hideTests: true, hasAsyncPatterns: true, visibleNodeTypes: ['LWC'] },
        graphLayout: { layoutName: 'dagre', mode: 'interactive', nodePositions: { NodeX: { x: 900, y: 900 } } },
        zoom: { zoom: 1.4, pan: { x: -50, y: -100 } },
      });

      // 1. Load A
      const load1A = loadProjectState(projA);
      expect(load1A.graphLayout.nodePositions.NodeX).toEqual({ x: 100, y: 100 });
      expect(load1A.filters.searchQuery).toBe('AlphaSearch');
      expect(load1A.filters.visibleNodeTypes).toEqual(['ApexClass']);
      expect(load1A.graphLayout.mode).toBe('static');

      // 2. Switch to B
      const loadB = loadProjectState(projB);
      expect(loadB.graphLayout.nodePositions.NodeX).toEqual({ x: 900, y: 900 });
      expect(loadB.filters.searchQuery).toBe('BetaSearch');
      expect(loadB.filters.visibleNodeTypes).toEqual(['LWC']);
      expect(loadB.graphLayout.mode).toBe('interactive');

      // 3. Switch back to A
      const load2A = loadProjectState(projA);
      expect(load2A.graphLayout.nodePositions.NodeX).toEqual({ x: 100, y: 100 });
      expect(load2A.filters.searchQuery).toBe('AlphaSearch');
      expect(load2A.filters.visibleNodeTypes).toEqual(['ApexClass']);
      expect(load2A.graphLayout.mode).toBe('static');
    });
  });

  describe('4. Rapid Project Switching & Async Safety', () => {
    it('handles rapid sequential project switching (A -> B -> C -> A -> C -> B) cleanly', () => {
      const projects = ['proj-1', 'proj-2', 'proj-3'];

      // Seed projects
      projects.forEach((pid, idx) => {
        updateProjectState(pid, {
          filters: { searchQuery: `Query-${pid}`, typeFilter: '', riskFilter: '', hasCallouts: false, withoutSharing: false, hideTests: false, hasAsyncPatterns: false },
          zoom: { zoom: 1.0 + idx * 0.2, pan: { x: idx * 10, y: idx * 20 } },
        });
      });

      // Rapid sequence simulation
      const sequence = ['proj-1', 'proj-2', 'proj-3', 'proj-1', 'proj-3', 'proj-2'];
      let currentLoadedState: ProjectUIState | null = null;

      for (const pid of sequence) {
        currentLoadedState = loadProjectState(pid);
      }

      // Final state must match proj-2
      expect(currentLoadedState).not.toBeNull();
      expect(currentLoadedState?.projectId).toBe('proj-2');
      expect(currentLoadedState?.filters.searchQuery).toBe('Query-proj-2');
      expect(currentLoadedState?.zoom.zoom).toBe(1.2);
    });
  });

  describe('5. Graph Canvas Visibility Persistence', () => {
    it('persists and restores visibleNodeTypes per project without altering node positions', () => {
      const projectId = 'proj-visibility-test';
      const positions = { 'ApexClass:Service': { x: 200, y: 300 } };

      updateProjectState(projectId, {
        filters: {
          searchQuery: '',
          typeFilter: '',
          riskFilter: '',
          hasCallouts: false,
          withoutSharing: false,
          hideTests: false,
          hasAsyncPatterns: false,
          visibleNodeTypes: ['ApexClass', 'LWC'],
        },
        graphLayout: {
          layoutName: 'cola',
          mode: 'interactive',
          nodePositions: positions,
        },
      });

      const loaded = loadProjectState(projectId);
      expect(loaded.filters.visibleNodeTypes).toEqual(['ApexClass', 'LWC']);
      expect(loaded.graphLayout.nodePositions).toEqual(positions);

      // Verify shouldAutoLayout returns false for filter-change
      expect(shouldAutoLayout('static', 'filter-change', { hasAuthoritativePositions: true })).toBe(false);
      expect(shouldAutoLayout('interactive', 'filter-change', { hasAuthoritativePositions: true })).toBe(false);
    });
  });

  describe('6. Hydration vs Auto-Layout Invariance', () => {
    it('prevents destructive post-hydration relayout when authoritative positions exist', () => {
      // Static mode initial load with authoritative positions
      expect(shouldAutoLayout('static', 'initial', { hasAuthoritativePositions: true })).toBe(false);

      // Interactive mode initial load with authoritative positions
      expect(shouldAutoLayout('interactive', 'initial', { hasAuthoritativePositions: true })).toBe(false);

      // Graph update with positions
      expect(shouldAutoLayout('static', 'graph-update', { hasAuthoritativePositions: true })).toBe(false);
      expect(shouldAutoLayout('interactive', 'graph-update', { hasAuthoritativePositions: true })).toBe(false);

      // Reset layout explicitly allows layout
      expect(shouldAutoLayout('static', 'reset-layout', { hasAuthoritativePositions: true })).toBe(true);
      expect(shouldAutoLayout('interactive', 'reset-layout', { hasAuthoritativePositions: true })).toBe(true);
    });
  });

  describe('7. Partial / Corrupt State Safety', () => {
    it('handles corrupted localStorage JSON gracefully with default fallback', () => {
      const projId = 'corrupt-proj';
      localStorage.setItem(getProjectStorageKey(projId), '{"corrupted": json... [');

      const loaded = loadProjectState(projId);
      expect(loaded.projectId).toBe(projId);
      expect(loaded.zoom.zoom).toBe(1.0);
      expect(loaded.filters.visibleNodeTypes).toEqual(ALL_EXPLORER_NODE_TYPES);
    });

    it('safely merges partial state missing properties or containing invalid coordinates', () => {
      const projId = 'partial-proj';
      const partialJson = JSON.stringify({
        projectId: projId,
        graphLayout: {
          nodePositions: {
            validNode: { x: 100, y: 200 },
            invalidNode: { x: NaN, y: 300 },
          },
        },
      });
      localStorage.setItem(getProjectStorageKey(projId), partialJson);

      const loaded = loadProjectState(projId);
      expect(loaded.projectId).toBe(projId);
      expect(loaded.graphLayout.nodePositions.validNode).toEqual({ x: 100, y: 200 });

      // Invalid position fallback in position policy
      const resolvedInvalid = resolveAuthoritativePosition('invalidNode', {
        persistedPositions: loaded.graphLayout.nodePositions,
      });
      expect(resolvedInvalid).toBeNull();
    });
  });

  describe('8. Exact Reset & Clear Semantics', () => {
    it('clears saved project state cleanly from storage without touching other projects', () => {
      updateProjectState('proj-clear-1', { zoom: { zoom: 0.5, pan: { x: 0, y: 0 } } });
      updateProjectState('proj-clear-2', { zoom: { zoom: 1.5, pan: { x: 0, y: 0 } } });

      clearProjectState('proj-clear-1');

      // proj-clear-1 falls back to default on load
      const reloaded1 = loadProjectState('proj-clear-1');
      expect(reloaded1.zoom.zoom).toBe(1.0);

      // proj-clear-2 remains untouched
      const reloaded2 = loadProjectState('proj-clear-2');
      expect(reloaded2.zoom.zoom).toBe(1.5);
    });
  });
});
