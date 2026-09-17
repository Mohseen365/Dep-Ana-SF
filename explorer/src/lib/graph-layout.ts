import type { LayoutOptions } from 'cytoscape';
import type { ExplorerNode, ExplorerEdge, ExplorerNodeType, ExplorerRiskLevel } from '../types/explorer';
import {
  computeArchitectureLayout,
  ArchitectureLayoutOptions,
  classifyNodeLayer,
  extractDomainStem,
  isTestNode,
  ArchitectureLayer,
} from './architecture-layout';

export {
  computeArchitectureLayout,
  classifyNodeLayer,
  extractDomainStem,
  isTestNode,
};
export type { ArchitectureLayoutOptions, ArchitectureLayer };

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
  [key: string]: any;
}

export function extractNodesAndEdgesFromCy(cy: cytoscape.Core): {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
} {
  const nodes: ExplorerNode[] = [];
  const edges: ExplorerEdge[] = [];

  cy.nodes().forEach(cyNode => {
    const data = cyNode.data();
    nodes.push({
      id: data.id || cyNode.id(),
      displayName: data.label || data.displayName || cyNode.id(),
      type: (data.type as ExplorerNodeType) || 'ApexClass',
      file: data.file || '',
      metrics: {
        fanIn: data.fanIn ?? 0,
        fanOut: data.fanOut ?? 0,
        coupling: data.coupling ?? 0,
        unresolved: 0,
        score: 0,
      },
      risk: (data.risk as ExplorerRiskLevel) || 'LOW',
      riskReasons: [],
      behavior: {
        isTest: Boolean(data.isTest),
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: data.risk === 'HIGH',
        hasCycles: Boolean(data.hasCycles),
        hasUnresolved: Boolean(data.hasUnresolved),
        testCoverageStatus: 'UNTESTED',
      },
    });
  });

  cy.edges().forEach(cyEdge => {
    const data = cyEdge.data();
    edges.push({
      id: data.id || cyEdge.id(),
      source: data.source || cyEdge.source().id(),
      target: data.target || cyEdge.target().id(),
      relationshipType: data.relationshipType || 'unknown',
      method: data.method || null,
      evidence: data.evidence || '',
      unresolved: Boolean(data.unresolved),
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: null,
      column: null,
      methodOwner: null,
      file: '',
      canonical: {
        source: { type: 'ApexClass', name: data.source },
        target: { type: 'ApexClass', name: data.target },
        relationship: { type: 'unknown', resolution: 'EXACT' },
        location: {},
      },
    });
  });

  return { nodes, edges };
}

export function getLayoutOptions(options: GraphLayoutOptions = {}): LayoutOptions {
  const { nodes, edges, animate = false, animationDuration = 500, padding = 50, ...rest } = options;

  if (nodes && nodes.length > 0) {
    const posMap = computeArchitectureLayout(nodes, edges || [], options);
    return {
      name: 'preset',
      positions: (node: any) => posMap[node.id()] || { x: 0, y: 0 },
      animate,
      animationDuration,
      padding,
      fit: options.fit ?? true,
      ...rest,
    } as LayoutOptions;
  }

  const nodeCount = options.nodeCount || 0;
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
  },
  animated: {
    animate: true,
    animationDuration: 500,
    numIter: 1000,
    initialTemp: 200,
  },
  fast: {
    animate: false,
    numIter: 250,
    initialTemp: 100,
  },
  quality: {
    animate: false,
    numIter: 2500,
    initialTemp: 400,
  },
};

export function createLayout(cy: cytoscape.Core, options?: GraphLayoutOptions): cytoscape.Layouts {
  const useArch = options?.useArchitectureLayout !== false;

  if (useArch) {
    const nodes = options?.nodes || extractNodesAndEdgesFromCy(cy).nodes;
    const edges = options?.edges || extractNodesAndEdgesFromCy(cy).edges;

    if (nodes.length > 0) {
      const posMap = computeArchitectureLayout(nodes, edges, options);
      return cy.layout({
        name: 'preset',
        positions: (node: any) => posMap[node.id()] || node.position(),
        animate: options?.animate ?? false,
        animationDuration: options?.animationDuration ?? 500,
        padding: options?.padding ?? 50,
        fit: options?.fit ?? true,
      } as any);
    }
  }

  const layoutOptions = getLayoutOptions(options);
  return cy.layout(layoutOptions);
}

export function runLayout(cy: cytoscape.Core, options?: GraphLayoutOptions): void {
  const useArch = options?.useArchitectureLayout !== false;

  if (useArch && cy.nodes().length > 0) {
    const { nodes, edges } = extractNodesAndEdgesFromCy(cy);
    const finalNodes = options?.nodes && options.nodes.length > 0 ? options.nodes : nodes;
    const finalEdges = options?.edges && options.edges.length > 0 ? options.edges : edges;

    const posMap = computeArchitectureLayout(finalNodes, finalEdges, options);

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
      cy.batch(() => {
        cy.nodes().forEach(node => {
          const id = node.id();
          if (posMap[id]) {
            node.position(posMap[id]);
          }
        });
      });
      if (options?.fit !== false) {
        cy.fit(cy.elements(), options?.padding ?? 50);
      }
    }
    return;
  }

  const layout = createLayout(cy, options);
  layout.run();
}
