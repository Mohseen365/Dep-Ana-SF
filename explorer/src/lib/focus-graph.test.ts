import { describe, it, expect } from 'vitest';
import {
  computeFocusedGraph,
  hasConnections,
  createEmptyFocusState,
  isFocusActive,
  FocusState,
  FocusDepth
} from './focus-graph';
import { ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../types/explorer';

// Test graph: A → B → C → D
// A depends on B, B depends on C, C depends on D
// D is depended on by C, C by B, B by A
const mockNodes: ExplorerNode[] = [
  {
    id: 'A',
    displayName: 'A',
    type: 'ApexClass' as ExplorerNodeType,
    file: 'A.cls',
    metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
    risk: 'LOW',
    riskReasons: [],
    behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  },
  {
    id: 'B',
    displayName: 'B',
    type: 'ApexClass' as ExplorerNodeType,
    file: 'B.cls',
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
    risk: 'MEDIUM',
    riskReasons: [],
    behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  },
  {
    id: 'C',
    displayName: 'C',
    type: 'ApexClass' as ExplorerNodeType,
    file: 'C.cls',
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
    risk: 'MEDIUM',
    riskReasons: [],
    behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  },
  {
    id: 'D',
    displayName: 'D',
    type: 'ApexClass' as ExplorerNodeType,
    file: 'D.cls',
    metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 1 },
    risk: 'LOW',
    riskReasons: [],
    behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  }
];

// A → B → C → D (A depends on B, B on C, C on D)
const mockEdges: ExplorerEdge[] = [
  {
    id: 'A-B',
    source: 'A',
    target: 'B',
    relationshipType: 'method-call',
    method: 'callB',
    evidence: 'B.method()',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'high',
    line: 1,
    column: 1,
    methodOwner: 'A',
    file: 'A.cls',
    canonical: {
      source: { type: 'ApexClass' as ExplorerNodeType, name: 'A', method: 'callB' },
      target: { type: 'ApexClass' as ExplorerNodeType, name: 'B', method: 'method' },
      relationship: { type: 'method-call', resolution: 'EXACT' as const },
      location: { line: 1, column: 1 }
    }
  },
  {
    id: 'B-C',
    source: 'B',
    target: 'C',
    relationshipType: 'method-call',
    method: 'callC',
    evidence: 'C.method()',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'high',
    line: 1,
    column: 1,
    methodOwner: 'B',
    file: 'B.cls',
    canonical: {
      source: { type: 'ApexClass' as ExplorerNodeType, name: 'B', method: 'callC' },
      target: { type: 'ApexClass' as ExplorerNodeType, name: 'C', method: 'method' },
      relationship: { type: 'method-call', resolution: 'EXACT' as const },
      location: { line: 1, column: 1 }
    }
  },
  {
    id: 'C-D',
    source: 'C',
    target: 'D',
    relationshipType: 'method-call',
    method: 'callD',
    evidence: 'D.method()',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'high',
    line: 1,
    column: 1,
    methodOwner: 'C',
    file: 'C.cls',
    canonical: {
      source: { type: 'ApexClass' as ExplorerNodeType, name: 'C', method: 'callD' },
      target: { type: 'ApexClass' as ExplorerNodeType, name: 'D', method: 'method' },
      relationship: { type: 'method-call', resolution: 'EXACT' as const },
      location: { line: 1, column: 1 }
    }
  }
];

describe('computeFocusedGraph', () => {
  describe('depth behavior', () => {
    it('should show only the focus node at depth 0 (technically includes it)', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'A',
        direction: 'both',
        depth: 1
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      expect(result.nodes.map(n => n.id).sort()).toEqual(['A', 'B']); // A + direct neighbors
      expect(result.edges.length).toBe(1);
      expect(result.edges[0].id).toBe('A-B');
    });

    it('should show depth 1 from A: A → B', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'A',
        direction: 'dependencies',
        depth: 1
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['A', 'B']);
    });

    it('should show depth 2 from A: A → B → C', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'A',
        direction: 'dependencies',
        depth: 2
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['A', 'B', 'C']);
    });

    it('should show depth 3 from A: A → B → C → D', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'A',
        direction: 'dependencies',
        depth: 3
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should show ALL depth from A', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'A',
        direction: 'dependencies',
        depth: 'ALL' as FocusDepth
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should show depth 1 from D (reverse direction): D ← C', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'D',
        direction: 'dependents',
        depth: 1
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['C', 'D']);
    });

    it('should show depth 2 from D (dependents): D ← C ← B', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'D',
        direction: 'dependents',
        depth: 2
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['B', 'C', 'D']);
    });
  });

  describe('direction behavior', () => {
    it('should show dependencies only', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'A',
        direction: 'dependencies',
        depth: 3
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      // A depends on B, B on C, C on D - so we get A, B, C, D
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should show dependents only', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'D',
        direction: 'dependents',
        depth: 3
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      // D is depended on by C, C by B, B by A - so we get A, B, C, D
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should show both directions', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'B',
        direction: 'both',
        depth: 2
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      // B: A → B → C (dependents at depth 1: A, at depth 2: none beyond A)
      // B: B → C → D (dependencies at depth 1: C, at depth 2: D)
      // Combined: A, B, C, D
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should show both directions for node C at depth 2', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'C',
        direction: 'both',
        depth: 2
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      // C: depends on D (depth 1), depends on B→A (depth 2 via dependents of D)
      // Actually: C has dependencies (D) at depth 1
      // C has dependents: B at depth 1, A at depth 2
      // So both = C, D (dependency) + B, A (dependents) = A, B, C, D
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('edge direction handling', () => {
    it('should include edges in the correct direction for dependencies', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'A',
        direction: 'dependencies',
        depth: 2
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      expect(result.edges.map(e => e.id).sort()).toEqual(['A-B', 'B-C']);
    });

    it('should include edges in the correct direction for dependents', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'D',
        direction: 'dependents',
        depth: 2
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      // D has dependents: C at depth 1, B at depth 2 (through C)
      expect(result.edges.map(e => e.id).sort()).toEqual(['B-C', 'C-D']);
    });
  });

  describe('when disabled', () => {
    it('should return empty when not enabled', () => {
      const focusState: FocusState = {
        enabled: false,
        focusNodeId: 'A',
        direction: 'both',
        depth: 1
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should return empty when focusNodeId is null', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: null,
        direction: 'both',
        depth: 1
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('center node', () => {
    it('should set centerNodeId to the focus node', () => {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId: 'B',
        direction: 'both',
        depth: 1
      };
      const result = computeFocusedGraph(mockNodes, mockEdges, focusState);
      expect(result.centerNodeId).toBe('B');
    });
  });
});

describe('hasConnections', () => {
  it('should detect dependencies for node A', () => {
    const result = hasConnections(mockEdges, 'A', 'both');
    expect(result.hasDependencies).toBe(true);
    expect(result.hasDependents).toBe(false);
  });

  it('should detect dependents for node D', () => {
    const result = hasConnections(mockEdges, 'D', 'both');
    expect(result.hasDependencies).toBe(false);
    expect(result.hasDependents).toBe(true);
  });

  it('should detect both for node B', () => {
    const result = hasConnections(mockEdges, 'B', 'both');
    expect(result.hasDependencies).toBe(true);
    expect(result.hasDependents).toBe(true);
  });

  it('should handle isolated node with no connections', () => {
    const result = hasConnections(mockEdges, 'X', 'both');
    expect(result.hasDependencies).toBe(false);
    expect(result.hasDependents).toBe(false);
  });
});

describe('createEmptyFocusState', () => {
  it('should create empty focus state', () => {
    const state = createEmptyFocusState();
    expect(state.enabled).toBe(false);
    expect(state.focusNodeId).toBe(null);
    expect(state.direction).toBe('both');
    expect(state.depth).toBe(2);
  });
});

describe('isFocusActive', () => {
  it('should return false when not enabled', () => {
    const state: FocusState = { enabled: false, focusNodeId: 'A', direction: 'both', depth: 1 };
    expect(isFocusActive(state)).toBe(false);
  });

  it('should return false when focusNodeId is null', () => {
    const state: FocusState = { enabled: true, focusNodeId: null, direction: 'both', depth: 1 };
    expect(isFocusActive(state)).toBe(false);
  });

  it('should return true when enabled with valid focusNodeId', () => {
    const state: FocusState = { enabled: true, focusNodeId: 'A', direction: 'both', depth: 1 };
    expect(isFocusActive(state)).toBe(true);
  });
});