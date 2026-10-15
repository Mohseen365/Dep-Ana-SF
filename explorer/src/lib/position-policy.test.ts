import { describe, it, expect } from 'vitest';
import {
  shouldAutoLayout,
  resolveAuthoritativePosition,
  calculateDeterministicNewNodePosition,
  LayoutMode,
} from './position-policy';
import { ExplorerEdge } from '../types/explorer';

describe('Central Position Policy & Authority System', () => {
  describe('shouldAutoLayout decision policy', () => {
    describe('Static Mode Policy Rules', () => {
      const mode: LayoutMode = 'static';

      it('initial trigger: auto-layouts ONLY if no authoritative positions exist', () => {
        expect(shouldAutoLayout(mode, 'initial', { hasAuthoritativePositions: false })).toBe(true);
        expect(shouldAutoLayout(mode, 'initial', { hasAuthoritativePositions: true })).toBe(false);
      });

      it('graph-update trigger: blocks automatic relayout', () => {
        expect(shouldAutoLayout(mode, 'graph-update')).toBe(false);
        expect(shouldAutoLayout(mode, 'graph-update', { hasAuthoritativePositions: true })).toBe(false);
      });

      it('filter-change trigger: blocks automatic relayout', () => {
        expect(shouldAutoLayout(mode, 'filter-change')).toBe(false);
      });

      it('focus-change trigger: blocks automatic relayout', () => {
        expect(shouldAutoLayout(mode, 'focus-change')).toBe(false);
      });

      it('investigation trigger: blocks automatic relayout', () => {
        expect(shouldAutoLayout(mode, 'investigation')).toBe(false);
      });

      it('mode-switch trigger: blocks visual rearrangement', () => {
        expect(shouldAutoLayout(mode, 'mode-switch')).toBe(false);
      });

      it('new-nodes trigger: returns place-new-only when authoritative positions exist, true otherwise', () => {
        expect(shouldAutoLayout(mode, 'new-nodes', { hasAuthoritativePositions: true })).toBe('place-new-only');
        expect(shouldAutoLayout(mode, 'new-nodes', { hasAuthoritativePositions: false })).toBe(true);
      });

      it('reset-layout trigger: allows explicit layout reset', () => {
        expect(shouldAutoLayout(mode, 'reset-layout')).toBe(true);
      });
    });

    describe('Interactive Mode Policy Rules', () => {
      const mode: LayoutMode = 'interactive';

      it('initial trigger: auto-layouts if no authoritative positions exist', () => {
        expect(shouldAutoLayout(mode, 'initial', { hasAuthoritativePositions: false })).toBe(true);
        expect(shouldAutoLayout(mode, 'initial', { hasAuthoritativePositions: true })).toBe(false);
      });

      it('graph-update trigger: preserves existing positions when present', () => {
        expect(shouldAutoLayout(mode, 'graph-update', { hasAuthoritativePositions: true })).toBe(false);
        expect(shouldAutoLayout(mode, 'graph-update', { hasAuthoritativePositions: false })).toBe(true);
      });

      it('filter-change, focus-change, investigation, and mode-switch triggers: block relayout', () => {
        expect(shouldAutoLayout(mode, 'filter-change')).toBe(false);
        expect(shouldAutoLayout(mode, 'focus-change')).toBe(false);
        expect(shouldAutoLayout(mode, 'investigation')).toBe(false);
        expect(shouldAutoLayout(mode, 'mode-switch')).toBe(false);
      });

      it('new-nodes trigger: returns place-new-only when authoritative positions exist, true otherwise', () => {
        expect(shouldAutoLayout(mode, 'new-nodes', { hasAuthoritativePositions: true })).toBe('place-new-only');
        expect(shouldAutoLayout(mode, 'new-nodes', { hasAuthoritativePositions: false })).toBe(true);
      });

      it('reset-layout trigger: allows explicit layout reset', () => {
        expect(shouldAutoLayout(mode, 'reset-layout')).toBe(true);
      });
    });
  });

  describe('resolveAuthoritativePosition hierarchy', () => {
    const sessionPositions = new Map([['n1', { x: 100, y: 100 }]]);
    const persistedPositions = { n1: { x: 200, y: 200 }, n2: { x: 300, y: 300 } };
    const cyNodePosition = { x: 400, y: 400 };

    it('Level 1: prefers explicit current user session drag position', () => {
      const res = resolveAuthoritativePosition('n1', {
        sessionPositions,
        persistedPositions,
        cyNodePosition,
      });
      expect(res).not.toBeNull();
      expect(res?.level).toBe(1);
      expect(res?.position).toEqual({ x: 100, y: 100 });
    });

    it('Level 2: falls back to persisted project position when session position missing', () => {
      const res = resolveAuthoritativePosition('n2', {
        sessionPositions,
        persistedPositions,
        cyNodePosition,
      });
      expect(res).not.toBeNull();
      expect(res?.level).toBe(2);
      expect(res?.position).toEqual({ x: 300, y: 300 });
    });

    it('Level 3: falls back to existing Cytoscape rendered position when session & persisted missing', () => {
      const res = resolveAuthoritativePosition('n3', {
        sessionPositions,
        persistedPositions,
        cyNodePosition,
      });
      expect(res).not.toBeNull();
      expect(res?.level).toBe(3);
      expect(res?.position).toEqual({ x: 400, y: 400 });
    });

    it('returns null when no position authority exists', () => {
      const res = resolveAuthoritativePosition('n4', {
        sessionPositions: new Map(),
        persistedPositions: {},
        cyNodePosition: null,
      });
      expect(res).toBeNull();
    });
  });

  describe('calculateDeterministicNewNodePosition (Level 5 Fallback)', () => {
    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'new_node', target: 'neighbor_a', relationshipType: 'method-call' } as ExplorerEdge,
      { id: 'e2', source: 'new_node', target: 'neighbor_b', relationshipType: 'method-call' } as ExplorerEdge,
    ];

    const knownPositions = {
      neighbor_a: { x: 100, y: 100 },
      neighbor_b: { x: 300, y: 300 },
    };

    it('places new node near the centroid of connected neighbors with deterministic offset', () => {
      const pos1 = calculateDeterministicNewNodePosition('new_node', edges, knownPositions);
      const pos2 = calculateDeterministicNewNodePosition('new_node', edges, knownPositions);

      // Centroid of (100,100) and (300,300) is (200,200)
      expect(pos1.x).toBeGreaterThan(200);
      expect(pos1.y).toBeGreaterThan(200);
      // Deterministic: repeated calls for same nodeId yield identical coordinates
      expect(pos1).toEqual(pos2);
    });

    it('places unconnected new node on a deterministic grid offset when no neighbors exist', () => {
      const pos = calculateDeterministicNewNodePosition('isolated_node', [], {});
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
      expect(isNaN(pos.x)).toBe(false);
      expect(isNaN(pos.y)).toBe(false);
    });
  });
});
