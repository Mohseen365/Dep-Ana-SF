// explorer/src/lib/graph-layout.ts
import type { LayoutOptions } from 'cytoscape';
import type { ExplorerNode, ExplorerEdge, ExplorerNodeType, ExplorerRiskLevel } from '../types/explorer';
import { toBool } from './boolean-utils';
import {
  computeArchitectureLayout,
  computeArchitectureLayoutWithMetadata,
  ArchitectureLayoutOptions,
  ArchitectureLayoutResultWithMetadata,
  classifyNodeLayer,
  extractDomainStem,
  isTestNode,
  ArchitectureLayer,
  FeatureRegion,
} from './architecture-layout';
import { LayoutWorkerClient, type CalculateLayoutAsyncResult } from './workers/layout-worker-client';

export {
  computeArchitectureLayout,
  computeArchitectureLayoutWithMetadata,
  classifyNodeLayer,
  extractDomainStem,
  isTestNode,
};
export type { ArchitectureLayoutOptions, ArchitectureLayoutResultWithMetadata, ArchitectureLayer, FeatureRegion };

export const globalWorkerClient = new LayoutWorkerClient();

function emitCyEvent(cy: cytoscape.Core, eventName: string): void {
  if (typeof (cy as any).emit === 'function') {
    (cy as any).emit(eventName);
  } else if (typeof (cy as any).trigger === 'function') {
    (cy as any).trigger(eventName);
  }
}

/** --------------------------------------------------------------------
 *  DEV‑ONLY layout logger
 *  ----------------------------------------------------------------- */
function recordLayout(entry: Record<string, unknown>) {
  // Guard against being executed in a Node environment (e.g. unit tests)
  if (typeof window === 'undefined') return;
  const w = window as any;
  (w.__layoutLog ||= []).push({
    t: performance.now(),
    ...entry,
  });
}

export interface GraphLayoutOptions extends ArchitectureLayoutOptions {
  nodeCount?: number;
  padding?: number;
  animate?: boolean;
  nodeRepulsion?: number | ((node: any) => number);
  idealEdgeLength?: number | ((edge: any) => number);
  gravity?: number;
  animationDuration?: number;
  packComponents?: boolean;
  nodes?: ExplorerNode[];
  edges?: ExplorerEdge[];
  fit?: boolean;
  useArchitectureLayout?: boolean;
  projectId?: string;
  correlationToken?: string;
  [key: string]: any;
}

export function extractNodesAndEdgesFromCy(cy: cytoscape.Core): {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
} {
  const nodes: ExplorerNode[] = [];
  const edges: ExplorerEdge[] = [];

  cy.nodes().forEach(cyNode => {
    const data = typeof cyNode.data === 'function' ? cyNode.data() : (cyNode?.data || {});
    nodes.push({
      id: data.id || cyNode.id(),
      displayName: data.displayName || data.label || cyNode.id(),
      type: (data.type as ExplorerNodeType) || 'ApexClass',
      file: data.file || '',
      ...(data.layer ? { layer: data.layer } : {}),
      ...(data.domain ? { domain: data.domain } : {}),
      metrics: data.metrics || {
        fanIn: data.fanIn ?? 0,
        fanOut: data.fanOut ?? 0,
        coupling: data.coupling ?? 0,
        unresolved: data.unresolved ?? 0,
        score: data.score ?? 0,
      },
      risk: (data.risk as ExplorerRiskLevel) || 'LOW',
      riskReasons: Array.isArray(data.riskReasons) ? data.riskReasons : [],
      behavior: data.behavior || {
        isTest: toBool(data.isTest),
        sharing: data.sharing ?? null,
        publicContractsCount: data.publicContractsCount,
        asyncPatterns: Array.isArray(data.asyncPatterns) ? data.asyncPatterns : [],
        securitySignalsCount: data.securitySignalsCount,
        queryCount: data.queryCount,
        dmlCount: data.dmlCount,
        calloutCount: data.calloutCount,
      },
      refactoringReadiness: data.refactoringReadiness || {
        isHighRisk: data.risk === 'HIGH',
        hasCycles: toBool(data.hasCycles),
        hasUnresolved: toBool(data.hasUnresolved),
        testCoverageStatus: data.testCoverageStatus || 'UNTESTED',
      },
    });
  });

  cy.edges().forEach(cyEdge => {
    const data = typeof cyEdge.data === 'function' ? cyEdge.data() : (cyEdge?.data || {});
    edges.push({
      id: data.id || cyEdge.id(),
      source: data.source || cyEdge.source().id(),
      target: data.target || cyEdge.target().id(),
      relationshipType: data.relationshipType || 'unknown',
      method: data.method || null,
      evidence: data.evidence || '',
      unresolved: toBool(data.unresolved),
      resolutionClassification: data.resolutionClassification || 'RESOLVED_LOCAL',
      resolutionStrategy: data.resolutionStrategy || 'EXACT',
      confidence: data.confidence !== undefined ? String(data.confidence) : '1.0',
      line: data.line ?? null,
      column: data.column ?? null,
      methodOwner: data.methodOwner ?? null,
      file: data.file || '',
      canonical: data.canonical || {
        source: { type: (data.sourceType as ExplorerNodeType) || 'ApexClass', name: data.source || cyEdge.source().id() },
        target: { type: (data.targetType as ExplorerNodeType) || 'ApexClass', name: data.target || cyEdge.target().id() },
        relationship: { type: data.relationshipType || 'unknown', resolution: 'EXACT' },
        location: { line: data.line ?? null, column: data.column ?? null },
      },
    });
  });

  return { nodes, edges };
}

export function getLayoutOptions(options: GraphLayoutOptions = {}): LayoutOptions {
  const { nodes, edges, animate = false, animationDuration = 500, padding = 50, useArchitectureLayout, ...rest } = options;
  const useArch = useArchitectureLayout !== false;

  if (useArch && nodes && nodes.length > 0) {
    const posMap = computeArchitectureLayout(nodes, edges || [], options);
    return {
      name: 'preset',
      positions: (node: any) => posMap[node.id()] || (typeof node.position === 'function' ? node.position() : { x: 0, y: 0 }),
      animate,
      animationDuration,
      padding,
      fit: options.fit ?? true,
      ...rest,
    } as LayoutOptions;
  }

  if (options.existingPositions && Object.keys(options.existingPositions).length > 0) {
    const posMap = options.existingPositions;
    return {
      name: 'preset',
      positions: (node: any) => posMap[node.id()] || (typeof node.position === 'function' ? node.position() : { x: 0, y: 0 }),
      animate,
      animationDuration,
      padding,
      fit: options.fit ?? true,
      ...rest,
    } as LayoutOptions;
  }

  const nodeCount = options.nodeCount ?? (nodes ? nodes.length : 0);
  const density = Math.max(1, Math.sqrt(nodeCount / 20));
  return {
    name: 'fcose',
    padding: 80 * density,
    idealEdgeLength: 120 * density,
    nodeRepulsion: 8000 * density,
    gravity: 0.15,
    animate,
    animationDuration,
    packComponents: true,
    ...rest,
  } as LayoutOptions;
}

export const LAYOUT_PRESETS = {
  stable: {
    animate: false,
    numIter: 1000,
    initialTemp: 200,
    nodeRepulsion: 8000,
    idealEdgeLength: 120,
  },
  animated: {
    animate: true,
    animationDuration: 500,
    numIter: 1000,
    initialTemp: 200,
    nodeRepulsion: 8000,
    idealEdgeLength: 120,
  },
  fast: {
    animate: false,
    numIter: 250,
    initialTemp: 100,
    nodeRepulsion: 4000,
    idealEdgeLength: 80,
  },
  quality: {
    animate: false,
    numIter: 2500,
    initialTemp: 400,
    nodeRepulsion: 12000,
    idealEdgeLength: 150,
  },
};

export function createLayout(cy: cytoscape.Core, options?: GraphLayoutOptions): cytoscape.Layouts {
  const useArch = options?.useArchitectureLayout !== false;

  if (useArch) {
    const hasNodes = Array.isArray(options?.nodes) && options!.nodes!.length > 0;
    const hasEdges = Array.isArray(options?.edges) && options!.edges!.length > 0;
    const extracted = (!hasNodes || !hasEdges) ? extractNodesAndEdgesFromCy(cy) : { nodes: [], edges: [] };
    const nodes = hasNodes ? options!.nodes! : extracted.nodes;
    const edges = hasEdges ? options!.edges! : extracted.edges;

    if (nodes.length > 0) {
      const posMap = computeArchitectureLayout(nodes, edges, options);
      return cy.layout({
        name: 'preset',
        positions: (node: any) => posMap[node.id()] || (typeof node.position === 'function' ? node.position() : { x: 0, y: 0 }),
        animate: options?.animate ?? false,
        animationDuration: options?.animationDuration ?? 500,
        padding: options?.padding ?? 50,
        fit: options?.fit ?? true,
      } as any);
    }
  }

  const effectiveOptions: GraphLayoutOptions = {
    nodeCount: options?.nodeCount ?? cy.nodes().length,
    ...options,
  };
  const layoutOptions = getLayoutOptions(effectiveOptions);
  return cy.layout(layoutOptions);
}

export function runLayout(cy: cytoscape.Core, options?: GraphLayoutOptions): void {
  runLayoutWithMetadata(cy, options);
}

/** --------------------------------------------------------------------
 *  Async layout – wrapper + inner implementation
 *  ----------------------------------------------------------------- */
export async function runLayoutWithMetadataAsync(
  cy: cytoscape.Core,
  options?: GraphLayoutOptions
): Promise<CalculateLayoutAsyncResult> {
  // ---- 1️⃣  Record start -------------------------------------------------
  const startEntry = {
    type: 'start' as const,
    reason: (options as any)?.layoutReason ?? 'unknown',
    requestId: (options as any)?.requestId ?? 'none',
    correlationToken: options?.correlationToken ?? 'none',
    projectId: options?.projectId ?? 'none',
    nodeCount: cy?.nodes?.().length ?? 0,
    edgeCount: cy?.edges?.().length ?? 0,
    existingPositions: Object.keys(options?.existingPositions ?? {}).length,
  };
  recordLayout(startEntry);

  // ---- 2️⃣  Call the original implementation (now renamed) ---------------
  const result = await runLayoutWithMetadataAsyncInner(cy, options);

  // ---- 3️⃣  Record end ---------------------------------------------------
  const posEntries = Object.entries(result?.positions ?? {});
  const endEntry = {
    type: 'end' as const,
    reason: startEntry.reason,
    requestId: startEntry.requestId,
    posCount: posEntries.length,
    sample: posEntries[0] ?? null,
    isOffloaded: (result as any).isOffloaded ?? false,
  };
  recordLayout(endEntry);

  return result;
}

/** --------------------------------------------------------------------
 *  Async layout – original implementation (renamed)
 *  ----------------------------------------------------------------- */
export async function runLayoutWithMetadataAsyncInner(
  cy: cytoscape.Core,
  options?: GraphLayoutOptions
): Promise<CalculateLayoutAsyncResult> {
  const useArch = options?.useArchitectureLayout !== false;

  if (useArch && cy.nodes().length > 0) {
    const hasNodes = Array.isArray(options?.nodes) && options!.nodes!.length > 0;
    const hasEdges = Array.isArray(options?.edges) && options!.edges!.length > 0;
    const extracted = (!hasNodes || !hasEdges) ? extractNodesAndEdgesFromCy(cy) : { nodes: [], edges: [] };
    const finalNodes = hasNodes ? options!.nodes! : extracted.nodes;
    const finalEdges = hasEdges ? options!.edges! : extracted.edges;

    const result = await globalWorkerClient.calculateLayoutAsync({
      projectId: options?.projectId || 'default',
      correlationToken: options?.correlationToken,
      nodes: finalNodes,
      edges: finalEdges,
      options,
      existingCanvasPositions: options?.existingPositions,
    });

    const posMap = result.positions;

    const isOrbitComponentFilter = (options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation') && result.projectedNodeIds;
    const focusedSet = result.projectedNodeIds;

    emitCyEvent(cy, 'layoutstart');

    cy.batch(() => {
      if (isOrbitComponentFilter && focusedSet) {
        const toShowNodes = cy.nodes().filter(n => focusedSet.has(n.id()));
        const toHideNodes = cy.nodes().filter(n => !focusedSet.has(n.id()));

        if (typeof (toShowNodes as any).show === 'function') {
          (toShowNodes as any).show();
        } else if (typeof (toShowNodes as any).style === 'function') {
          toShowNodes.style('display', 'element');
        }
        if (typeof (toHideNodes as any).hide === 'function') {
          (toHideNodes as any).hide();
        } else if (typeof (toHideNodes as any).style === 'function') {
          toHideNodes.style('display', 'none');
        }

        toShowNodes.forEach(node => {
          const id = node.id();
          if (posMap[id]) {
            node.position(posMap[id]);
          }
        });

        const toShowEdges = cy.edges().filter(e => focusedSet.has(e.data('source')) && focusedSet.has(e.data('target')));
        const toHideEdges = cy.edges().filter(e => !focusedSet.has(e.data('source')) || !focusedSet.has(e.data('target')));

        if (typeof (toShowEdges as any).show === 'function') {
          (toShowEdges as any).show();
        } else if (typeof (toShowEdges as any).style === 'function') {
          toShowEdges.style('display', 'element');
        }
        if (typeof (toHideEdges as any).hide === 'function') {
          (toHideEdges as any).hide();
        } else if (typeof (toHideEdges as any).style === 'function') {
          toHideEdges.style('display', 'none');
        }
      } else {
        const allNodes = cy.nodes();
        const allEdges = cy.edges();
        if (typeof (allNodes as any).show === 'function') {
          (allNodes as any).show();
        } else if (typeof (allNodes as any).style === 'function') {
          allNodes.style('display', 'element');
        }
        if (typeof (allEdges as any).show === 'function') {
          (allEdges as any).show();
        } else if (typeof (allEdges as any).style === 'function') {
          allEdges.style('display', 'element');
        }
        allNodes.forEach(node => {
          const id = node.id();
          if (posMap[id]) {
            node.position(posMap[id]);
          }
        });
      }
    });

    if (options?.animate) {
      cy.layout({
        name: 'preset',
        positions: (node: any) => posMap[node.id()] || node.position(),
        animate: true,
        animationDuration: options?.animationDuration ?? 500,
        padding: options?.padding ?? 50,
        fit: options?.fit ?? true,
      } as any).run();
    } else {
      if (options?.fit !== false) {
        if (isOrbitComponentFilter && focusedSet) {
          const visibleEles = cy.elements().filter(e => {
            if (e.isNode()) return focusedSet.has(e.id());
            return focusedSet.has(e.data('source')) && focusedSet.has(e.data('target'));
          });
          if (visibleEles.length > 0) {
            cy.fit(visibleEles, options?.padding ?? 50);
          } else {
            cy.fit(cy.elements(), options?.padding ?? 50);
          }
        } else {
          cy.fit(cy.elements(), options?.padding ?? 50);
        }
      }
      emitCyEvent(cy, 'layoutstop');
    }
    return result;
  }

  // Non‑arch branch
  const tStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

  if (options?.existingPositions) {
    cy.nodes().forEach(node => {
      const pos = options.existingPositions![node.id()];
      if (pos) {
        node.position(pos);
      }
    });
  }

  emitCyEvent(cy, 'layoutstart');
  const layout = createLayout(cy, options);
  layout.run();

  if (options?.fit !== false) {
    cy.fit(cy.elements(), options?.padding ?? 50);
  }
  emitCyEvent(cy, 'layoutstop');

  const tEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const computeDurationMs = Math.max(0, tEnd - tStart);

  const currentPositions: Record<string, { x: number; y: number }> = {};
  cy.nodes().forEach(node => {
    currentPositions[node.id()] = node.position();
  });
  return {
    positions: currentPositions,
    featureRegions: undefined,
    orbitGuides: undefined,
    projectedNodeIds: undefined,
    requestGeneration: 0,
    projectId: options?.projectId || 'default',
    correlationToken: options?.correlationToken,
    isOffloaded: false,
    computeDurationMs,
    ipcDurationMs: 0,
    totalDurationMs: computeDurationMs,
  };
}

/** --------------------------------------------------------------------
 *  Synchronous layout – wrapper + inner implementation
 *  ----------------------------------------------------------------- */
export function runLayoutWithMetadata(
  cy: cytoscape.Core,
  options?: GraphLayoutOptions,
): ArchitectureLayoutResultWithMetadata {
  // ---- 1️⃣  Record start -------------------------------------------------
  recordLayout({
    type: 'start' as const,
    reason: (options as any)?.layoutReason ?? 'unknown',
    requestId: (options as any)?.requestId ?? 'none',
    correlationToken: options?.correlationToken ?? 'none',
    projectId: options?.projectId ?? 'none',
    nodeCount: cy?.nodes?.().length ?? 0,
    edgeCount: cy?.edges?.().length ?? 0,
    existingPositions: Object.keys(options?.existingPositions ?? {}).length,
  });

  // ---- 2️⃣  Call the original implementation (renamed) -------------------
  const result = runLayoutWithMetadataInner(cy, options);

  // ---- 3️⃣  Record end ---------------------------------------------------
  const posEntries = Object.entries(result?.positions ?? {});
  recordLayout({
    type: 'end' as const,
    reason: (options as any)?.layoutReason ?? 'unknown',
    requestId: (options as any)?.requestId ?? 'none',
    posCount: posEntries.length,
    sample: posEntries[0] ?? null,
  });

  return result;
}

/** --------------------------------------------------------------------
 *  Synchronous layout – original implementation (renamed)
 *  ----------------------------------------------------------------- */
export function runLayoutWithMetadataInner(
  cy: cytoscape.Core,
  options?: GraphLayoutOptions,
): ArchitectureLayoutResultWithMetadata {
  const useArch = options?.useArchitectureLayout !== false;

  if (useArch && cy.nodes().length > 0) {
    const hasNodes = Array.isArray(options?.nodes) && options!.nodes!.length > 0;
    const hasEdges = Array.isArray(options?.edges) && options!.edges!.length > 0;
    const extracted = (!hasNodes || !hasEdges) ? extractNodesAndEdgesFromCy(cy) : { nodes: [], edges: [] };
    const finalNodes = hasNodes ? options!.nodes! : extracted.nodes;
    const finalEdges = hasEdges ? options!.edges! : extracted.edges;

    const result = computeArchitectureLayoutWithMetadata(finalNodes, finalEdges, options);
    const posMap = result.positions;

    const isOrbitComponentFilter = (options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation') && result.projectedNodeIds;
    const focusedSet = result.projectedNodeIds;

    emitCyEvent(cy, 'layoutstart');

    cy.batch(() => {
      if (isOrbitComponentFilter && focusedSet) {
        const toShowNodes = cy.nodes().filter(n => focusedSet.has(n.id()));
        const toHideNodes = cy.nodes().filter(n => !focusedSet.has(n.id()));

        if (typeof (toShowNodes as any).show === 'function') {
          (toShowNodes as any).show();
        } else if (typeof (toShowNodes as any).style === 'function') {
          toShowNodes.style('display', 'element');
        }
        if (typeof (toHideNodes as any).hide === 'function') {
          (toHideNodes as any).hide();
        } else if (typeof (toHideNodes as any).style === 'function') {
          toHideNodes.style('display', 'none');
        }

        toShowNodes.forEach(node => {
          const id = node.id();
          if (posMap[id]) {
            node.position(posMap[id]);
          }
        });

        const toShowEdges = cy.edges().filter(e => focusedSet.has(e.data('source')) && focusedSet.has(e.data('target')));
        const toHideEdges = cy.edges().filter(e => !focusedSet.has(e.data('source')) || !focusedSet.has(e.data('target')));

        if (typeof (toShowEdges as any).show === 'function') {
          (toShowEdges as any).show();
        } else if (typeof (toShowEdges as any).style === 'function') {
          toShowEdges.style('display', 'element');
        }
        if (typeof (toHideEdges as any).hide === 'function') {
          (toHideEdges as any).hide();
        } else if (typeof (toHideEdges as any).style === 'function') {
          toHideEdges.style('display', 'none');
        }
      } else {
        const allNodes = cy.nodes();
        const allEdges = cy.edges();
        if (typeof (allNodes as any).show === 'function') {
          (allNodes as any).show();
        } else if (typeof (allNodes as any).style === 'function') {
          allNodes.style('display', 'element');
        }
        if (typeof (allEdges as any).show === 'function') {
          (allEdges as any).show();
        } else if (typeof (allEdges as any).style === 'function') {
          allEdges.style('display', 'element');
        }
        allNodes.forEach(node => {
          const id = node.id();
          if (posMap[id]) {
            node.position(posMap[id]);
          }
        });
      }
    });

    if (options?.animate) {
      cy.layout({
        name: 'preset',
        positions: (node: any) => posMap[node.id()] || node.position(),
        animate: true,
        animationDuration: options?.animationDuration ?? 500,
        padding: options?.padding ?? 50,
        fit: options?.fit ?? true,
      } as any).run();
    } else {
      if (options?.fit !== false) {
        if (isOrbitComponentFilter && focusedSet) {
          const visibleEles = cy.elements().filter(e => {
            if (e.isNode()) return focusedSet.has(e.id());
            return focusedSet.has(e.data('source')) && focusedSet.has(e.data('target'));
          });
          if (visibleEles.length > 0) {
            cy.fit(visibleEles, options?.padding ?? 50);
          } else {
            cy.fit(cy.elements(), options?.padding ?? 50);
          }
        } else {
          cy.fit(cy.elements(), options?.padding ?? 50);
        }
      }
      emitCyEvent(cy, 'layoutstop');
    }
    return result;
  }

  // Non‑arch branch
  if (options?.existingPositions) {
    cy.nodes().forEach(node => {
      const pos = options.existingPositions![node.id()];
      if (pos) {
        node.position(pos);
      }
    });
  }

  emitCyEvent(cy, 'layoutstart');
  const layout = createLayout(cy, options);
  layout.run();

  if (options?.fit !== false) {
    cy.fit(cy.elements(), options?.padding ?? 50);
  }
  emitCyEvent(cy, 'layoutstop');

  const currentPositions: Record<string, { x: number; y: number }> = {};
  cy.nodes().forEach(node => {
    currentPositions[node.id()] = node.position();
  });
  return {
    positions: currentPositions,
    featureRegions: undefined,
    orbitGuides: undefined,
    projectedNodeIds: undefined,
  };
}
