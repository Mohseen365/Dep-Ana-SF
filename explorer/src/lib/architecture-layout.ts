import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureLayer } from './layout/types';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification } from './layout/analysis';
import { classifyNodeLayer, classifyNodeLayerWithReason, isTestNode } from './layout/layers';
import { discoverDomains, extractDomainStem } from './layout/domains';
import { computeGlobalDomainLayout } from './layout/global-layout';
import { reduceEdgeCrossings } from './layout/ordering';
import { computeLocalNodeLayout } from './layout/local-layout';
import {
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
} from './layout/centrality';
import { placeSatellites } from './layout/satellites';
import { packComponentPositions, ComponentLocalLayout } from './layout/components';
import { resolveSpacingAndCollisions } from './layout/spacing';

export interface ArchitectureLayoutOptions {
  /** Width of nodes used for collision avoidance (default: 120) */
  nodeWidth?: number;
  /** Height of nodes used for collision avoidance (default: 60) */
  nodeHeight?: number;
  /** Vertical distance between architectural layer bands (default: 250) */
  layerSpacing?: number;
  /** Horizontal distance between domain/subsystem clusters (default: 380) */
  domainSpacing?: number;
  /** Horizontal gap between disconnected graph components (default: 450) */
  componentGap?: number;
  /** Map of existing authoritative positions to preserve for incremental layout */
  existingPositions?: Record<string, { x: number; y: number }>;
}

export { classifyNodeLayer, extractDomainStem, isTestNode };
export type { ArchitectureLayer };

/**
 * Intelligent Architecture-Aware Layout Orchestrator
 *
 * Orchestrates Wave 1-4 deterministic layout pipeline:
 * 1. Graph facts normalization & defensive cloning
 * 2. Intermediate architecture analysis
 * 3. Layer classification & Domain discovery
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
  const {
    nodeWidth = 120,
    nodeHeight = 60,
    layerSpacing = 250,
    domainSpacing = 380,
    componentGap = 450,
    existingPositions = {},
  } = options;

  // Defensive deep clone of inputs to guarantee immutability
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  if (safeNodes.length === 0) {
    return { ...existingPositions };
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

  // Step 1: Base Architecture Analysis (Wave 1A)
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges);

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
    layerMap
  );

  // Step 5: Global Domain Architecture Layout (Wave 2A)
  const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
    domainSpacing,
    layerSpacing,
    nodeWidth,
    nodeHeight,
  });

  // Step 6: Layer Ordering & Crossing Reduction (Wave 2B)
  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap,
    domainOrder: globalDomainResult.orderedDomains,
  });

  // Step 7: Primary Production Local Layout (Wave 3A)
  const localResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: globalDomainResult.domainRegions,
    layerMap,
    domainMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth,
      nodeHeight,
      domainSpacing,
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
        { layerSpacing, nodeWidth, nodeHeight }
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
    }
  );

  // Step 10: Disconnected Component Packing (Wave 2C)
  // If there are multiple disconnected components, separate them horizontally while preserving layer Y coordinates
  let componentShiftedPositions: Record<string, { x: number; y: number }> = {
    ...satelliteResult.positions,
  };

  if (analysis.components.length > 1) {
    // Check if components actually occupy overlapping horizontal ranges
    const compRanges = analysis.components.map(comp => {
      let minX = Infinity;
      let maxX = -Infinity;
      comp.nodeIds.forEach(id => {
        const pos = satelliteResult.positions[id];
        if (pos) {
          if (pos.x < minX) minX = pos.x;
          if (pos.x > maxX) maxX = pos.x;
        }
      });
      return { comp, minX, maxX };
    }).filter(c => c.minX !== Infinity);

    let overlaps = false;
    for (let i = 0; i < compRanges.length; i++) {
      for (let j = i + 1; j < compRanges.length; j++) {
        const r1 = compRanges[i];
        const r2 = compRanges[j];
        if (!(r1.maxX + nodeWidth < r2.minX || r2.maxX + nodeWidth < r1.minX)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) break;
    }

    if (overlaps) {
      componentShiftedPositions = {};
      let currentComponentXOffset = 0;

      for (const comp of analysis.components) {
        const compNodeIds = comp.nodeIds;
        if (compNodeIds.length === 0) continue;

        let minCompX = Infinity;
        let maxCompX = -Infinity;

        compNodeIds.forEach(id => {
          const pos = satelliteResult.positions[id];
          if (pos) {
            if (pos.x < minCompX) minCompX = pos.x;
            if (pos.x > maxCompX) maxCompX = pos.x;
          }
        });

        if (minCompX === Infinity) continue;

        const deltaX = currentComponentXOffset - minCompX;

        compNodeIds.forEach(id => {
          const pos = satelliteResult.positions[id];
          if (pos) {
            // Preserve exact vertical layer Y, shift X horizontally to separate component
            componentShiftedPositions[id] = {
              x: pos.x + deltaX,
              y: pos.y,
            };
          }
        });

        const compWidth = maxCompX - minCompX;
        currentComponentXOffset += Math.max(compWidth, nodeWidth) + componentGap;
      }
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
      domainMap,
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

  return resultPositions;
}
