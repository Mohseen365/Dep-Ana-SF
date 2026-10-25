import { describe, it, expect, beforeEach } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  loadProjectState,
  updateProjectState,
  clearProjectState,
  mergeWithDefaultState,
  ProjectUIState,
} from '../lib/projectState';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { resolveAuthoritativePosition } from '../lib/position-policy';

describe('Position Isolation Remediation & Cross-Mode Stability Regression Suite', () => {
  const sampleNodes: ExplorerNode[] = [
    {
      id: 'LWC:focal-a',
      displayName: 'focal-a',
      type: 'LWC',
      file: 'a.js',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    },
    {
      id: 'ApexClass:service-b',
      displayName: 'service-b',
      type: 'ApexClass',
      file: 'b.cls',
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    },
    {
      id: 'ApexClass:unreachable-c',
      displayName: 'unreachable-c',
      type: 'ApexClass',
      file: 'c.cls',
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    },
  ];

  const sampleEdges: ExplorerEdge[] = [
    {
      id: 'e1',
      source: 'LWC:focal-a',
      target: 'ApexClass:service-b',
      relationshipType: 'lwc-apex',
      method: null,
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 1,
      column: 1,
      methodOwner: null,
      file: 'a.js',
      canonical: {
        source: { type: 'LWC', name: 'focal-a' },
        target: { type: 'ApexClass', name: 'service-b' },
        relationship: { type: 'lwc-apex', resolution: 'EXACT' },
        location: {},
      },
    },
  ];

  const PROJECT_A = 'test-proj-a';
  const PROJECT_B = 'test-proj-b';

  beforeEach(() => {
    clearProjectState(PROJECT_A);
    clearProjectState(PROJECT_B);
  });

  it('Case 1 — Same-mode saved positions are preserved when intended', () => {
    const userDraggedHierarchical = {
      'LWC:focal-a': { x: 500, y: 500 },
      'ApexClass:service-b': { x: 600, y: 600 },
    };

    updateProjectState(PROJECT_A, {
      graphLayout: {
        mode: 'interactive',
        architectureMode: 'hierarchical',
        nodePositions: userDraggedHierarchical,
        layoutProvenance: 'user-authored',
      },
    });

    const loaded = loadProjectState(PROJECT_A);
    expect(loaded.graphLayout.architectureMode).toBe('hierarchical');
    expect(loaded.graphLayout.nodePositions).toEqual(userDraggedHierarchical);
    expect(loaded.graphLayout.layoutPositions?.hierarchical).toEqual(userDraggedHierarchical);
    expect(loaded.graphLayout.layoutProvenances?.hierarchical).toBe('user-authored');
  });

  it('Case 2 — Switching Hierarchical -> Orbit does not import incompatible Hierarchical coordinates', () => {
    const userHierarchicalPositions = {
      'LWC:focal-a': { x: 100, y: 100 },
      'ApexClass:service-b': { x: 200, y: 200 },
    };

    updateProjectState(PROJECT_A, {
      graphLayout: {
        mode: 'interactive',
        architectureMode: 'hierarchical',
        nodePositions: userHierarchicalPositions,
        layoutProvenance: 'user-authored',
      },
    });

    const orbitState = updateProjectState(PROJECT_A, {
      graphLayout: {
        mode: 'interactive',
        architectureMode: 'orbit',
        nodePositions: {},
      },
    });

    expect(orbitState.graphLayout.architectureMode).toBe('orbit');
    expect(orbitState.graphLayout.nodePositions).toEqual({});
    expect(orbitState.graphLayout.layoutPositions?.hierarchical).toEqual(userHierarchicalPositions);

    const orbitLayout = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:focal-a',
      existingPositions: orbitState.graphLayout.nodePositions,
    });

    expect(orbitLayout.positions['LWC:focal-a']).toEqual({ x: 0, y: 0 });
    expect(orbitLayout.positions['ApexClass:service-b']).not.toEqual({ x: 200, y: 200 });
  });

  it('Case 3 — Switching Hierarchical -> Constellation does not import incompatible Hierarchical coordinates', () => {
    const userHierarchicalPositions = {
      'LWC:focal-a': { x: 100, y: 100 },
      'ApexClass:service-b': { x: 200, y: 200 },
    };

    updateProjectState(PROJECT_A, {
      graphLayout: {
        mode: 'interactive',
        architectureMode: 'hierarchical',
        nodePositions: userHierarchicalPositions,
        layoutProvenance: 'user-authored',
      },
    });

    const constellationState = updateProjectState(PROJECT_A, {
      graphLayout: {
        mode: 'interactive',
        architectureMode: 'constellation',
        nodePositions: {},
      },
    });

    expect(constellationState.graphLayout.architectureMode).toBe('constellation');
    expect(constellationState.graphLayout.nodePositions).toEqual({});

    const constellationLayout = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'constellation',
      existingPositions: constellationState.graphLayout.nodePositions,
    });

    expect(constellationLayout.positions['LWC:focal-a']).not.toEqual({ x: 100, y: 100 });
    expect(constellationLayout.positions['ApexClass:service-b']).not.toEqual({ x: 200, y: 200 });
  });

  it('Case 4 — Switching Orbit -> Hierarchical does not reuse incompatible Orbit coordinates', () => {
    const userOrbitPositions = {
      'LWC:focal-a': { x: 0, y: 0 },
      'ApexClass:service-b': { x: 300, y: 0 },
    };

    updateProjectState(PROJECT_A, {
      graphLayout: {
        mode: 'interactive',
        architectureMode: 'orbit',
        nodePositions: userOrbitPositions,
        layoutProvenance: 'user-authored',
      },
    });

    const hierState = updateProjectState(PROJECT_A, {
      graphLayout: {
        mode: 'interactive',
        architectureMode: 'hierarchical',
        nodePositions: {},
      },
    });

    expect(hierState.graphLayout.architectureMode).toBe('hierarchical');
    expect(hierState.graphLayout.nodePositions).toEqual({});
    expect(hierState.graphLayout.layoutPositions?.orbit).toEqual(userOrbitPositions);
  });

  it('Case 5 — Focal-anchor changes obey documented position-ownership contract', () => {
    const focalAResult = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:focal-a',
    });

    expect(focalAResult.positions['LWC:focal-a']).toEqual({ x: 0, y: 0 });
    expect(focalAResult.projectedNodeIds?.has('ApexClass:unreachable-c')).toBe(false);

    const multiLwcNodes: ExplorerNode[] = [
      ...sampleNodes,
      {
        id: 'LWC:focal-d',
        displayName: 'focal-d',
        type: 'LWC',
        file: 'd.js',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
    ];

    const focalDResult = computeArchitectureLayoutWithMetadata(multiLwcNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:focal-d',
      existingPositions: focalAResult.positions,
    });

    expect(focalDResult.positions['LWC:focal-d']).toEqual({ x: 0, y: 0 });
    expect(focalDResult.positions['LWC:focal-a']).toBeUndefined();
    expect(focalDResult.projectedNodeIds?.has('LWC:focal-a')).toBe(false);
  });

  it('Case 6 — Project A positions cannot leak into Project B', () => {
    const projAPositions = {
      'LWC:focal-a': { x: 111, y: 111 },
    };

    updateProjectState(PROJECT_A, {
      graphLayout: {
        mode: 'interactive',
        architectureMode: 'hierarchical',
        nodePositions: projAPositions,
      },
    });

    const stateB = loadProjectState(PROJECT_B);
    expect(stateB.projectId).toBe(PROJECT_B);
    expect(stateB.graphLayout.nodePositions).toEqual({});
    expect(stateB.graphLayout.layoutPositions?.hierarchical).toEqual({});
  });

  it('Case 7 — Missing or partial position state does not crash layout', () => {
    const partialPositions = {
      'LWC:focal-a': { x: 50, y: 50 },
    };

    const result = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'hierarchical',
      existingPositions: partialPositions,
    });

    expect(result.positions['LWC:focal-a']).toEqual({ x: 50, y: 50 });
    expect(result.positions['ApexClass:service-b']).toBeDefined();
    expect(typeof result.positions['ApexClass:service-b'].x).toBe('number');
    expect(typeof result.positions['ApexClass:service-b'].y).toBe('number');
  });

  it('Case 8 — Legacy persisted flat positions are handled according to explicit compatibility rule', () => {
    const legacyFlatPositions = {
      'LWC:focal-a': { x: 777, y: 777 },
      'ApexClass:service-b': { x: 888, y: 888 },
    };

    const legacyRawJson: Partial<ProjectUIState> = {
      projectId: PROJECT_A,
      graphLayout: {
        mode: 'interactive',
        architectureMode: 'hierarchical',
        nodePositions: legacyFlatPositions,
      },
    };

    const merged = mergeWithDefaultState(PROJECT_A, legacyRawJson);
    expect(merged.graphLayout.architectureMode).toBe('hierarchical');
    expect(merged.graphLayout.nodePositions).toEqual(legacyFlatPositions);
    expect(merged.graphLayout.layoutPositions?.hierarchical).toEqual(legacyFlatPositions);
    expect(merged.graphLayout.layoutPositions?.hybrid).toEqual({});
    expect(merged.graphLayout.layoutPositions?.orbit).toEqual({});
    expect(merged.graphLayout.layoutPositions?.constellation).toEqual({});
  });

  it('Case 9 — Static/interactive switching obeys existing position-authority contract', () => {
    const initialPos = {
      'LWC:focal-a': { x: 10, y: 20 },
    };

    const resolvedInteractive = resolveAuthoritativePosition('LWC:focal-a', {
      persistedPositions: initialPos,
      hasAuthoritativePositions: true,
    });
    expect(resolvedInteractive?.level).toBe(2);
    expect(resolvedInteractive?.position).toEqual({ x: 10, y: 20 });

    const resolvedNoAuth = resolveAuthoritativePosition('LWC:focal-a', {
      persistedPositions: initialPos,
      hasAuthoritativePositions: false,
    });
    expect(resolvedNoAuth).toBeNull();
  });

  it('Case 10 — Repeated mode switching does not cause cumulative coordinate drift', () => {
    const userHierarchical = {
      'LWC:focal-a': { x: 123, y: 456 },
    };

    updateProjectState(PROJECT_A, {
      graphLayout: {
          mode: 'interactive',
        architectureMode: 'hierarchical',
        nodePositions: userHierarchical,
        layoutProvenance: 'user-authored',
      },
    });

      updateProjectState(PROJECT_A, { graphLayout: { mode: 'interactive', architectureMode: 'orbit', nodePositions: {} } });
      updateProjectState(PROJECT_A, { graphLayout: { mode: 'interactive', architectureMode: 'constellation', nodePositions: {} } });
      updateProjectState(PROJECT_A, { graphLayout: { mode: 'interactive', architectureMode: 'hybrid', nodePositions: {} } });
      const finalState = updateProjectState(PROJECT_A, { graphLayout: { mode: 'interactive', architectureMode: 'hierarchical', nodePositions: userHierarchical } });

    expect(finalState.graphLayout.architectureMode).toBe('hierarchical');
    expect(finalState.graphLayout.nodePositions).toEqual(userHierarchical);
    expect(finalState.graphLayout.layoutPositions?.hierarchical).toEqual(userHierarchical);
    expect(finalState.graphLayout.layoutProvenances?.hierarchical).toBe('user-authored');
  });

  describe('Adversarial Hydration Matrix A–H', () => {
    it('Case A — Legacy-only: nodePositions exists; layoutPositions is absent', () => {
      const rawLegacyState = {
        projectId: PROJECT_A,
        graphLayout: {
            mode: 'interactive' as const,
            architectureMode: 'hierarchical' as const,
          nodePositions: { 'Node:a1': { x: 101, y: 102 } },
        },
      };

      const merged = mergeWithDefaultState(PROJECT_A, rawLegacyState as any);
      expect(merged.graphLayout.architectureMode).toBe('hierarchical');
      expect(merged.graphLayout.nodePositions).toEqual({ 'Node:a1': { x: 101, y: 102 } });
      expect(merged.graphLayout.layoutPositions?.hierarchical).toEqual({ 'Node:a1': { x: 101, y: 102 } });
      expect(merged.graphLayout.layoutPositions?.orbit).toEqual({});
      expect(merged.graphLayout.layoutPositions?.hybrid).toEqual({});
      expect(merged.graphLayout.layoutPositions?.constellation).toEqual({});
    });

    it('Case B — Scoped target empty: layoutPositions: { orbit: {} } plus stale flat positions; active mode orbit', () => {
      const rawScopedEmptyState = {
        projectId: PROJECT_A,
        graphLayout: {
            mode: 'interactive' as const,
            architectureMode: 'orbit' as const,
          nodePositions: { 'Node:stale-flat': { x: 999, y: 999 } },
          layoutPositions: {
            orbit: {},
          },
        },
      };

      const merged = mergeWithDefaultState(PROJECT_A, rawScopedEmptyState as any);
      expect(merged.graphLayout.architectureMode).toBe('orbit');
      expect(merged.graphLayout.nodePositions).toEqual({});
      expect(merged.graphLayout.layoutPositions?.orbit).toEqual({});
      expect(merged.graphLayout.layoutPositions?.hierarchical).toEqual({});
      expect(merged.graphLayout.nodePositions['Node:stale-flat']).toBeUndefined();
    });

    it('Case C — Explicit top-level empty map: layoutPositions: {} plus stale flat positions', () => {
      const rawTopEmptyState = {
        projectId: PROJECT_A,
        graphLayout: {
            mode: 'interactive' as const,
            architectureMode: 'hierarchical' as const,
          nodePositions: { 'Node:legacy-flat': { x: 888, y: 888 } },
          layoutPositions: {},
        },
      };

      const merged = mergeWithDefaultState(PROJECT_A, rawTopEmptyState as any);
      expect(merged.graphLayout.architectureMode).toBe('hierarchical');
      // Under explicit top-level empty map, hasExplicitLayoutPositions is false (Object.keys({}).length === 0).
      // The compatibility contract treats top-level {} identically to missing/unpopulated layoutPositions, migrating flat positions into active mode.
      expect(merged.graphLayout.nodePositions).toEqual({ 'Node:legacy-flat': { x: 888, y: 888 } });
      expect(merged.graphLayout.layoutPositions?.hierarchical).toEqual({ 'Node:legacy-flat': { x: 888, y: 888 } });
      expect(merged.graphLayout.layoutPositions?.orbit).toEqual({});
    });

    it('Case D — Other mode only: layoutPositions: { hierarchical: {...} } plus stale flat positions; active mode orbit', () => {
      const rawOtherModeState = {
        projectId: PROJECT_A,
        graphLayout: {
            mode: 'interactive' as const,
            architectureMode: 'orbit' as const,
          nodePositions: { 'Node:stale-flat': { x: 777, y: 777 } },
          layoutPositions: {
            hierarchical: { 'Node:h1': { x: 10, y: 20 } },
          },
        },
      };

      const merged = mergeWithDefaultState(PROJECT_A, rawOtherModeState as any);
      expect(merged.graphLayout.architectureMode).toBe('orbit');
      // Presence of hierarchical entry makes hasExplicitLayoutPositions true, suppressing migration of flat nodePositions into Orbit.
      expect(merged.graphLayout.nodePositions).toEqual({});
      expect(merged.graphLayout.layoutPositions?.orbit).toEqual({});
      expect(merged.graphLayout.layoutPositions?.hierarchical).toEqual({ 'Node:h1': { x: 10, y: 20 } });
      expect(merged.graphLayout.nodePositions['Node:stale-flat']).toBeUndefined();
    });

    it('Case E — Scoped target populated: layoutPositions: { orbit: {...} } plus conflicting flat positions', () => {
      const rawPopulatedState = {
        projectId: PROJECT_A,
        graphLayout: {
            mode: 'interactive' as const,
            architectureMode: 'orbit' as const,
          nodePositions: { 'Node:conflict': { x: 999, y: 999 } },
          layoutPositions: {
            orbit: { 'Node:orbit-1': { x: 42, y: 84 } },
          },
        },
      };

      const merged = mergeWithDefaultState(PROJECT_A, rawPopulatedState as any);
      expect(merged.graphLayout.architectureMode).toBe('orbit');
      expect(merged.graphLayout.nodePositions).toEqual({ 'Node:orbit-1': { x: 42, y: 84 } });
      expect(merged.graphLayout.layoutPositions?.orbit).toEqual({ 'Node:orbit-1': { x: 42, y: 84 } });
      expect(merged.graphLayout.nodePositions['Node:conflict']).toBeUndefined();
    });

    it('Case F — Partial modern map: layoutPositions: { hierarchical: {...}, orbit: {} } plus flat positions', () => {
      const rawPartialState = {
        projectId: PROJECT_A,
        graphLayout: {
            mode: 'interactive' as const,
            architectureMode: 'orbit' as const,
          nodePositions: { 'Node:stale-flat': { x: 555, y: 555 } },
          layoutPositions: {
            hierarchical: { 'Node:hier-1': { x: 200, y: 300 } },
            orbit: {},
          },
        },
      };

      const merged = mergeWithDefaultState(PROJECT_A, rawPartialState as any);
      expect(merged.graphLayout.architectureMode).toBe('orbit');
      expect(merged.graphLayout.nodePositions).toEqual({});
      expect(merged.graphLayout.layoutPositions?.orbit).toEqual({});
      expect(merged.graphLayout.layoutPositions?.hierarchical).toEqual({ 'Node:hier-1': { x: 200, y: 300 } });
      expect(merged.graphLayout.nodePositions['Node:stale-flat']).toBeUndefined();
    });

    it('Case G — Null or malformed field: layoutPositions is null or non-object, plus flat positions', () => {
      const rawMalformedNullState = {
        projectId: PROJECT_A,
        graphLayout: {
            mode: 'interactive' as const,
            architectureMode: 'hierarchical' as const,
          nodePositions: { 'Node:safe': { x: 444, y: 444 } },
          layoutPositions: null,
        },
      };

      const mergedNull = mergeWithDefaultState(PROJECT_A, rawMalformedNullState as any);
      expect(mergedNull.graphLayout.architectureMode).toBe('hierarchical');
      expect(mergedNull.graphLayout.nodePositions).toEqual({ 'Node:safe': { x: 444, y: 444 } });
      expect(mergedNull.graphLayout.layoutPositions?.hierarchical).toEqual({ 'Node:safe': { x: 444, y: 444 } });

      const rawMalformedStringState = {
        projectId: PROJECT_A,
        graphLayout: {
            mode: 'interactive' as const,
            architectureMode: 'hierarchical' as const,
          nodePositions: { 'Node:safe2': { x: 333, y: 333 } },
          layoutPositions: "invalid-string",
        },
      };

      const mergedString = mergeWithDefaultState(PROJECT_A, rawMalformedStringState as any);
      expect(mergedString.graphLayout.architectureMode).toBe('hierarchical');
      expect(mergedString.graphLayout.nodePositions).toEqual({ 'Node:safe2': { x: 333, y: 333 } });
      expect(mergedString.graphLayout.layoutPositions?.hierarchical).toEqual({ 'Node:safe2': { x: 333, y: 333 } });
    });

    it('Case H — Provenance mismatch: scoped positions exist but layoutProvenances is absent or partial', () => {
      const rawProvenanceMismatchState = {
        projectId: PROJECT_A,
        graphLayout: {
            mode: 'interactive' as const,
            architectureMode: 'orbit' as const,
          nodePositions: { 'Node:o1': { x: 10, y: 20 } },
          layoutPositions: {
            orbit: { 'Node:o1': { x: 10, y: 20 } },
          },
          layoutProvenances: {},
        },
      };

      const merged = mergeWithDefaultState(PROJECT_A, rawProvenanceMismatchState as any);
      expect(merged.graphLayout.architectureMode).toBe('orbit');
      expect(merged.graphLayout.nodePositions).toEqual({ 'Node:o1': { x: 10, y: 20 } });
      expect(merged.graphLayout.layoutPositions?.orbit).toEqual({ 'Node:o1': { x: 10, y: 20 } });
      expect(merged.graphLayout.layoutProvenances?.orbit).toBe('automatic-orbit');
      expect(merged.graphLayout.layoutProvenances?.hierarchical).toBe('automatic-hierarchical');
    });
  });
});
