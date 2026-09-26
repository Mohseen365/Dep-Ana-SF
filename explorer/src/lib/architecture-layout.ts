import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureLayer } from './layout/types';
import { createLayoutGraphIndex } from './layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from './layout/analysis';
import { classifyNodeLayer, classifyNodeLayerWithReason, isTestNode } from './layout/layers';
import { discoverDomains, extractDomainStem } from './layout/domains';
import { classifyAllFeatureRoles, type FeatureRole, type FeatureRoleContext } from './layout/feature-roles';
import { discoverFeatures, type FeatureDiscoveryResult } from './layout/features';
import { computeGlobalDomainLayout, computeGlobalFeatureLayout, type FeatureRegion } from './layout/global-layout';
import { reduceEdgeCrossings } from './layout/ordering';
import { computeLocalNodeLayout } from './layout/local-layout';
import {
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
} from './layout/centrality';
import { placeSatellites } from './layout/satellites';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from './layout/components';
import { resolveSpacingAndCollisions } from './layout/spacing';

export interface ArchitectureLayoutOptions {
  /** Width of nodes used for collision avoidance (default: 120) */
  nodeWidth?: number;
  /** Height of nodes used for collision avoidance (default: 60) */
  nodeHeight?: number;
  /** Vertical distance between architectural layer bands (default: 250) */
  layerSpacing?: number;
  /** Feature-local vertical layer spacing inside feature regions (default: 60) */
  featureLayerSpacing?: number;
  /** Horizontal distance between domain/subsystem clusters (default: 380) */
  domainSpacing?: number;
  /** Clearance gap between disconnected graph components (default: 100) */
  componentGap?: number;
  /** Map of existing authoritative positions to preserve for incremental layout */
  existingPositions?: Record<string, { x: number; y: number }>;
  /** Enables Feature-aware spatial layout (default: false) */
  enableFeatureLayout?: boolean;
}

export interface ArchitectureLayoutResultWithMetadata {
  positions: Record<string, { x: number; y: number }>;
  featureRegions?: Map<string, FeatureRegion>;
}

export { classifyNodeLayer, extractDomainStem, isTestNode, classifyAllFeatureRoles, discoverFeatures };
export type { ArchitectureLayer, FeatureRole, FeatureDiscoveryResult, FeatureRegion };

/**
 * Intelligent Architecture-Aware Layout Orchestrator
 *
 * Orchestrates Wave 1-4 deterministic layout pipeline:
 * 1. Graph facts normalization & defensive cloning
 * 2. Intermediate architecture analysis
 * 3. Layer classification & Domain discovery
 * 3.5 Feature Role classification & Feature Discovery (semantic)
 * 4. Centrality (hubs/bridges) analysis
 * 5. Connected component decomposition
 * 6. Global domain architecture layout & ordering
 * 7. Relationship-aware layer crossing reduction
 * 8. Primary production local node layout
 * 9. Hub / Bridge placement refinement
 * 10. Secondary satellite placement (tests, fields, triggers/handlers)
 * 11. Spatial clearance & collision cleanup
 * 12. Component packing
 * 13. Position Authority restoration
 */
export function computeArchitectureLayout(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureLayoutOptions = {}
): Record<string, { x: number; y: number }> {
  return computeArchitectureLayoutWithMetadata(nodes, edges, options).positions;
}

export function computeArchitectureLayoutWithMetadata(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureLayoutOptions = {}
): ArchitectureLayoutResultWithMetadata {
  const {
    nodeWidth = 120,
    nodeHeight = 60,
    layerSpacing = 250,
    domainSpacing = 380,
    componentGap = 100,
    existingPositions = {},
    enableFeatureLayout = false,
  } = options;

  // Defensive deep clone of inputs to guarantee immutability
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  if (safeNodes.length === 0) {
    return { positions: { ...existingPositions } };
  }

  // Ensure all edge endpoints are present in safeNodes
  const knownNodeIds = new Set(safeNodes.map(n => n.id));
  safeEdges.forEach(e => {
    if (!knownNodeIds.has(e.source)) {
      knownNodeIds.add(e.source);
      safeNodes.push({
        id: e.source,
        displayName: e.source.split(':').pop() || e.source,
        type: 'External',
        file: '',
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
          testCoverageStatus: 'UNTESTED',
        },
      });
    }
    if (!knownNodeIds.has(e.target)) {
      knownNodeIds.add(e.target);
      safeNodes.push({
        id: e.target,
        displayName: e.target.split(':').pop() || e.target,
        type: 'External',
        file: '',
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
          testCoverageStatus: 'UNTESTED',
        },
      });
    }
  });

  // Sort nodes & edges deterministically by ID
  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  if (safeNodes.length === 0) {
    return { positions: { ...existingPositions } };
  }

  // Construct LayoutGraphIndex immediately after Stage 0 normalization
  const index = createLayoutGraphIndex(safeNodes, safeEdges);

  // Step 1: Base Architecture Analysis (Wave 1A)
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  // Step 2: Layer Classification (Wave 1B)
  const layerMap = new Map<string, ArchitectureLayer>();
  safeNodes.forEach(node => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });
  analysis = applyLayerClassification(analysis, layerMap);

  // Step 3: Domain Discovery (Wave 1C)
  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((assignment, nodeId) => {
    domainMap.set(nodeId, assignment.primaryDomain);
  });
  analysis = applyDomainClassification(analysis, domainMap);

  // Step 4: Centrality & Spatial Roles (Wave 3B)
  const centralityMap = computeGraphCentralityAnalysis(
    safeNodes,
    safeEdges,
    domainMap,
    layerMap,
    { index }
  );

  // Step 3.5 & 4: Feature Role Mapping & Semantic Feature Discovery
  const featureRoleContextMap = new Map<string, FeatureRoleContext>();
  safeNodes.forEach(node => {
    featureRoleContextMap.set(node.id, {
      layer: layerMap.get(node.id) || null,
      analysisNode: analysis.nodes.get(node.id) || null,
      centrality: centralityMap.get(node.id) || null,
      roleOverride: analysis.nodes.get(node.id)?.role || null,
    });
  });

  const featureDiscovery = discoverFeatures(safeNodes, safeEdges, {
    index,
    analysis,
    layerMap,
    domainMap,
  });

  const featureMap = new Map<string, string>();
  featureDiscovery.assignments.forEach((assignment, nodeId) => {
    featureMap.set(nodeId, assignment.primaryFeatureId);
  });

  // Step 5: Global Domain or Feature Architecture Layout
  let globalDomainResult;
  let activeSpatialMap: Map<string, string>;

  if (enableFeatureLayout) {
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[HYBRID_DIAGNOSTICS] computeGlobalFeatureLayout() called');
    }
    const featureLayoutResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
      domainSpacing,
      layerSpacing,
      featureLayerSpacing: options.featureLayerSpacing,
      nodeWidth,
      nodeHeight,
      analysis,
      layerMap,
      domainMap,
      domainDiscovery,
      featureDiscovery,
      featureMap,
      index,
    });
    globalDomainResult = featureLayoutResult;
    activeSpatialMap = featureMap;
  } else {
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[HYBRID_DIAGNOSTICS] computeGlobalDomainLayout() called');
    }
    globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
      domainSpacing,
      layerSpacing,
      nodeWidth,
      nodeHeight,
      analysis,
      domainDiscovery,
      layerMap,
      domainMap,
      index,
    });
    activeSpatialMap = domainMap;
  }

  // Step 6: Layer Ordering & Crossing Reduction (Wave 2B)
  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: activeSpatialMap,
    domainOrder: globalDomainResult.orderedDomains,
    layerYMap: globalDomainResult.layerYMap,
  });

  // Step 7: Primary Production Local Layout (Wave 3A)
  const localResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: globalDomainResult.domainRegions,
    layerMap,
    domainMap: activeSpatialMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth,
      nodeHeight,
      domainSpacing,
      layerYMap: globalDomainResult.layerYMap,
      featureLayerYMap: globalDomainResult.featureLayerYMap,
    },
  });

  const basePositions: Record<string, { x: number; y: number }> = {
    ...localResult.primaryNodePositions,
  };

  // Step 8: Hub & Bridge Spatial Refinement (Wave 3B)
  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};

  globalDomainResult.domainRegions.forEach((region, domain) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  safeNodes.forEach(node => {
    // Secondary satellite nodes (tests, fields) are placed exclusively in Step 9
    if (isTestNode(node) || isFieldNode(node)) return;

    const centrality = centralityMap.get(node.id);
    if (centrality?.isBridge && !centrality.isHub) {
      const neighborPositions: Record<string, { x: number; y: number }> = {};
      const nodeAnalysis = analysis.nodes.get(node.id);

      nodeAnalysis?.neighborIds.forEach(nId => {
        if (basePositions[nId]) {
          neighborPositions[nId] = basePositions[nId];
        }
      });

      const bridgeInfo = calculateBridgeCandidatePosition(
        node.id,
        layerMap.get(node.id) || 'application',
        centrality.connectedDomains,
        domainXCenters,
        domainBounds,
        neighborPositions,
        { layerSpacing, nodeWidth, nodeHeight, layerYOffsets: globalDomainResult.layerYMap, index, allocatedPositions: basePositions }
      );

      basePositions[node.id] = bridgeInfo.candidatePosition;
    }
  });

  // Step 9: Secondary Satellite Placement (Tests, Fields, Trigger/Handlers) (Wave 3C)
  const satelliteResult = placeSatellites(
    safeNodes,
    safeEdges,
    analysis,
    basePositions,
    {
      nodeWidth,
      nodeHeight,
      layerSpacing,
      layerYOffsets: globalDomainResult.layerYMap,
      index,
      ...(enableFeatureLayout && globalDomainResult.featureLayerYMap
        ? { featureLayerYMap: globalDomainResult.featureLayerYMap, featureMap }
        : {}),
    }
  );

  // Step 10: Disconnected Component Packing (Wave 2C)
  // If there are multiple disconnected components, pack them using 2D shelf packing algorithm (FFDH)
  let componentShiftedPositions: Record<string, { x: number; y: number }> = {
    ...satelliteResult.positions,
  };

  if (analysis.components.length > 1) {
    const componentLayouts: ComponentLocalLayout[] = analysis.components
      .map(comp => {
        const positions: Record<string, { x: number; y: number }> = {};
        let minNodeId: string | undefined = undefined;
        let importance = 0;

        for (const nodeId of comp.nodeIds) {
          const pos = satelliteResult.positions[nodeId];
          if (pos) {
            positions[nodeId] = pos;
            if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) {
              minNodeId = nodeId;
            }
            const centrality = centralityMap.get(nodeId);
            if (centrality) {
              importance += centrality.hubScore + centrality.bridgeScore;
            }
          }
        }

        return {
          id: comp.componentId,
          positions,
          nodeWidth,
          nodeHeight,
          structuralImportance: importance,
          minNodeId,
        };
      })
      .filter(c => Object.keys(c.positions).length > 0);

    if (componentLayouts.length > 1) {
      // Ensure targetWidth accommodates at least the two largest components side-by-side
      const compWidths = componentLayouts.map(c => {
        const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
        return bounds.width;
      }).sort((a, b) => b - a);

      const maxW = compWidths[0] || nodeWidth;
      const secondMaxW = compWidths[1] || nodeWidth;
      const minRowWidth = maxW + secondMaxW + componentGap;

      let totalCompArea = 0;
      componentLayouts.forEach(c => {
        const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
        totalCompArea += (bounds.width + componentGap) * (bounds.height + componentGap);
      });

      const idealWidth = Math.sqrt(totalCompArea * 1.6);
      const targetWidth = Math.max(idealWidth, minRowWidth);

      const packed = packComponentPositions(componentLayouts, {
        gap: componentGap,
        targetWidth,
        targetAspectRatio: 1.6,
        nodeWidth,
        nodeHeight,
      });
      componentShiftedPositions = packed.positions;
    }
  }

  // Step 11: Final Global Spatial Cleanup Pass (Wave 4A)
  const finalCleanupResult = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: componentShiftedPositions,
    analysis,
    options: {
      nodeWidth,
      nodeHeight,
      layerMap,
      domainMap: activeSpatialMap,
      ...(enableFeatureLayout && globalDomainResult.domainBounds
        ? { domainBounds: globalDomainResult.domainBounds }
        : {}),
    },
  });

  const calculatedPositions = finalCleanupResult.positions;

  // Step 8: Position Authority Restoration
  // Preserved authoritative existing positions take precedence over calculated layout
  const resultPositions: Record<string, { x: number; y: number }> = {
    ...calculatedPositions,
  };

  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos) {
      resultPositions[id] = { x: pos.x, y: pos.y };
    }
  }

  return {
    positions: resultPositions,
    featureRegions: (globalDomainResult as any)?.featureRegions,
  };
}
