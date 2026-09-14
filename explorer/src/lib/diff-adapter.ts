import type {
  ExplorerDataSchema,
  ExplorerNode,
  ExplorerEdge,
  ExplorerCycleGroup,
} from '../types/explorer';

// Import pure diffSnapshots engine from architecture-diff.cjs
// @ts-ignore - CommonJS module import in ESM/TS environment
import * as architectureDiffModule from '../../../architecture-diff.cjs';

const architectureDiff: any = (architectureDiffModule as any).default || architectureDiffModule;

export function diffSnapshots(
  before: any,
  after: any,
  options?: any
): DiffResult {
  const fn =
    (architectureDiffModule as any).diffSnapshots ||
    (architectureDiffModule as any).default?.diffSnapshots ||
    architectureDiff?.diffSnapshots ||
    architectureDiff?.default?.diffSnapshots;

  if (typeof fn !== 'function') {
    throw new Error(`diffSnapshots function not found on imported module`);
  }
  return fn(before, after, options);
}

export type DiffNodeState = 'added' | 'removed' | 'changed' | 'unchanged';
export type DiffEdgeState = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffNodeChangeProperty {
  property: string;
  before: any;
  after: any;
}

export interface DiffNodeChange {
  id: string;
  name: string;
  type: string;
  changes: DiffNodeChangeProperty[];
}

export interface DiffNodeItem {
  id: string;
  name: string;
  type: string;
  file?: string;
}

export interface DiffEdgeItem {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  method?: string | null;
  evidence?: string;
}

export interface DiffCycleItem {
  id: string;
  size: number;
  nodes: string[];
}

export interface DiffUnresolvedRef {
  id: string;
  source: string;
  targetName: string;
  targetType: string;
  file?: string;
  evidence?: string;
  reason?: string;
}

export interface DiffSummary {
  addedNodesCount: number;
  removedNodesCount: number;
  changedNodesCount: number;
  addedEdgesCount: number;
  removedEdgesCount: number;
  addedCyclesCount: number;
  removedCyclesCount: number;
  addedUnresolvedReferencesCount: number;
  removedUnresolvedReferencesCount: number;
  totalChangesCount: number;
}

export interface DiffResult {
  diffSchemaVersion: number;
  snapshotBeforeIdentity: string | null;
  snapshotAfterIdentity: string | null;
  hasChanges: boolean;
  summary: DiffSummary;
  addedNodes: DiffNodeItem[];
  removedNodes: DiffNodeItem[];
  changedNodes: DiffNodeChange[];
  addedEdges: DiffEdgeItem[];
  removedEdges: DiffEdgeItem[];
  cycleChanges: {
    added: DiffCycleItem[];
    removed: DiffCycleItem[];
  };
  unresolvedReferenceChanges: {
    added: DiffUnresolvedRef[];
    removed: DiffUnresolvedRef[];
  };
}

export interface DiffOverlayNode extends ExplorerNode {
  diffState: DiffNodeState;
  diffChanges?: DiffNodeChangeProperty[];
}

export interface DiffOverlayEdge extends ExplorerEdge {
  diffState: DiffEdgeState;
}

export interface DiffOverlayGraph {
  nodes: DiffOverlayNode[];
  edges: DiffOverlayEdge[];
  cycles: ExplorerCycleGroup[];
  diffResult: DiffResult;
}

/**
 * Builds a merged overlay graph model combining before and after snapshots with diff states.
 */
export function buildDiffOverlayGraph(
  beforeSnapshot: ExplorerDataSchema | any,
  afterSnapshot: ExplorerDataSchema | any,
  diffResult: DiffResult
): DiffOverlayGraph {
  const beforeNodes = Array.isArray(beforeSnapshot?.components)
    ? beforeSnapshot.components
    : Array.isArray(beforeSnapshot?.nodes)
    ? beforeSnapshot.nodes
    : [];

  const afterNodes = Array.isArray(afterSnapshot?.components)
    ? afterSnapshot.components
    : Array.isArray(afterSnapshot?.nodes)
    ? afterSnapshot.nodes
    : [];

  const beforeEdges = Array.isArray(beforeSnapshot?.relationships)
    ? beforeSnapshot.relationships
    : Array.isArray(beforeSnapshot?.edges)
    ? beforeSnapshot.edges
    : [];

  const afterEdges = Array.isArray(afterSnapshot?.relationships)
    ? afterSnapshot.relationships
    : Array.isArray(afterSnapshot?.edges)
    ? afterSnapshot.edges
    : [];

  const addedNodeSet = new Set(diffResult.addedNodes.map((n) => n.id));
  const removedNodeSet = new Set(diffResult.removedNodes.map((n) => n.id));
  const changedNodeMap = new Map(diffResult.changedNodes.map((n) => [n.id, n.changes]));

  const addedEdgeSet = new Set(diffResult.addedEdges.map((e) => e.id));
  const removedEdgeSet = new Set(diffResult.removedEdges.map((e) => e.id));

  const nodeMap = new Map<string, DiffOverlayNode>();

  // Process after nodes
  for (const rawNode of afterNodes) {
    const id = rawNode.id.includes(':') ? rawNode.id : `${rawNode.type || 'ApexClass'}:${rawNode.id}`;
    let diffState: DiffNodeState = 'unchanged';
    let diffChanges: DiffNodeChangeProperty[] | undefined;

    if (addedNodeSet.has(id)) {
      diffState = 'added';
    } else if (changedNodeMap.has(id)) {
      diffState = 'changed';
      diffChanges = changedNodeMap.get(id);
    }

    nodeMap.set(id, {
      id,
      displayName: rawNode.displayName || rawNode.name || id.split(':')[1] || id,
      type: rawNode.type || id.split(':')[0] || 'ApexClass',
      file: rawNode.file || '',
      metrics: rawNode.metrics || { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      risk: rawNode.risk || 'LOW',
      riskReasons: rawNode.riskReasons || [],
      behavior: rawNode.behavior || {
        isTest: false,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: rawNode.refactoringReadiness || {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'UNTESTED',
      },
      diffState,
      diffChanges,
    });
  }

  // Process removed before nodes
  for (const rawNode of beforeNodes) {
    const id = rawNode.id.includes(':') ? rawNode.id : `${rawNode.type || 'ApexClass'}:${rawNode.id}`;
    if (removedNodeSet.has(id) && !nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        displayName: rawNode.displayName || rawNode.name || id.split(':')[1] || id,
        type: rawNode.type || id.split(':')[0] || 'ApexClass',
        file: rawNode.file || '',
        metrics: rawNode.metrics || { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: rawNode.risk || 'LOW',
        riskReasons: rawNode.riskReasons || [],
        behavior: rawNode.behavior || {
          isTest: false,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: rawNode.refactoringReadiness || {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED',
        },
        diffState: 'removed',
      });
    }
  }

  // Process edges
  const edgeMap = new Map<string, DiffOverlayEdge>();

  for (const rawEdge of afterEdges) {
    const source = rawEdge.source || rawEdge.from || '';
    const target = rawEdge.target || rawEdge.to || '';
    const relType = rawEdge.relationshipType || rawEdge.type || 'unknown';
    const method = rawEdge.method || null;
    const edgeId = rawEdge.id || `${source}|${target}|${relType}|${method || ''}`;

    let diffState: DiffEdgeState = 'unchanged';
    if (addedEdgeSet.has(edgeId)) {
      diffState = 'added';
    }

    edgeMap.set(edgeId, {
      id: edgeId,
      source,
      target,
      relationshipType: relType,
      method,
      evidence: rawEdge.evidence || '',
      unresolved: Boolean(rawEdge.unresolved),
      resolutionClassification: rawEdge.resolutionClassification || 'RESOLVED_LOCAL',
      resolutionStrategy: rawEdge.resolutionStrategy || 'EXACT',
      confidence: rawEdge.confidence || 'high',
      line: rawEdge.line ?? null,
      column: rawEdge.column ?? null,
      methodOwner: rawEdge.methodOwner ?? null,
      file: rawEdge.file || '',
      canonical: rawEdge.canonical || {
        source: { type: source.split(':')[0], name: source.split(':')[1] || '' },
        target: { type: target.split(':')[0], name: target.split(':')[1] || '' },
        relationship: { type: relType, resolution: 'EXACT' },
        location: {},
      },
      diffState,
    });
  }

  for (const rawEdge of beforeEdges) {
    const source = rawEdge.source || rawEdge.from || '';
    const target = rawEdge.target || rawEdge.to || '';
    const relType = rawEdge.relationshipType || rawEdge.type || 'unknown';
    const method = rawEdge.method || null;
    const edgeId = rawEdge.id || `${source}|${target}|${relType}|${method || ''}`;

    if (removedEdgeSet.has(edgeId) && !edgeMap.has(edgeId)) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source,
        target,
        relationshipType: relType,
        method,
        evidence: rawEdge.evidence || '',
        unresolved: Boolean(rawEdge.unresolved),
        resolutionClassification: rawEdge.resolutionClassification || 'RESOLVED_LOCAL',
        resolutionStrategy: rawEdge.resolutionStrategy || 'EXACT',
        confidence: rawEdge.confidence || 'high',
        line: rawEdge.line ?? null,
        column: rawEdge.column ?? null,
        methodOwner: rawEdge.methodOwner ?? null,
        file: rawEdge.file || '',
        canonical: rawEdge.canonical || {
          source: { type: source.split(':')[0], name: source.split(':')[1] || '' },
          target: { type: target.split(':')[0], name: target.split(':')[1] || '' },
          relationship: { type: relType, resolution: 'EXACT' },
          location: {},
        },
        diffState: 'removed',
      });
    }
  }

  const nodes = Array.from(nodeMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  const edges = Array.from(edgeMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  // Merge cycle groups
  const cycleGroups: ExplorerCycleGroup[] = [
    ...diffResult.cycleChanges.added.map((c, i) => ({
      id: `new-cycle-${i + 1}`,
      size: c.size,
      nodes: c.nodes,
    })),
    ...diffResult.cycleChanges.removed.map((c, i) => ({
      id: `removed-cycle-${i + 1}`,
      size: c.size,
      nodes: c.nodes,
    })),
  ];

  return {
    nodes,
    edges,
    cycles: cycleGroups,
    diffResult,
  };
}
