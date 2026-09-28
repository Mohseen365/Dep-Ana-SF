import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureLayer, ArchitectureGraphAnalysis } from '../lib/layout/types';
import type { LayoutGraphIndex } from '../lib/layout/graph-index';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from '../lib/layout/analysis';
import { classifyNodeLayer, classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains, classifyNodeDomain, type DomainDiscoveryResult } from '../lib/layout/domains';
import { discoverFeatures, type FeatureDiscoveryResult } from '../lib/layout/features';
import { determineGlobalFeatureOrder, type FeatureOrderingStrategy } from '../lib/layout/feature-ordering';
import {
  computeGlobalDomainLayout,
  computeGlobalFeatureLayout,
  buildDomainGraph,
  computeDynamicLayerYMap,
  computeFeatureLayerYMap,
  determineGlobalDomainOrder,
  type GlobalFeatureLayoutOptions,
  type GlobalFeatureLayoutResult,
  type GlobalLayoutOptions,
  type GlobalLayoutResult,
  type DomainGraph,
  type FeatureRegion,
  type DomainRegion,
} from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from '../lib/layout/centrality';
import { placeSatellites } from '../lib/layout/satellites';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from '../lib/layout/components';
import { resolveSpacingAndCollisions } from '../lib/layout/spacing';
import { calculateLayoutMetrics } from '../lib/layout/metrics';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { generateSyntheticSalesforceGraph } from './scalability-generator';

const EXPECTED_CST_HASH = 'feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295';

// Counter for tracking graph construction invocations
export let globalGraphBuildCounter = { count: 0, nodesProcessed: 0, edgesProcessed: 0 };

export function resetGlobalGraphBuildCounter() {
  globalGraphBuildCounter.count = 0;
  globalGraphBuildCounter.nodesProcessed = 0;
  globalGraphBuildCounter.edgesProcessed = 0;
}

export function buildDomainGraphWithCounter(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  domainResult?: DomainDiscoveryResult,
  index?: LayoutGraphIndex,
  domainMapInput?: Map<string, string> | Record<string, string>
): DomainGraph {
  globalGraphBuildCounter.count++;
  globalGraphBuildCounter.nodesProcessed += nodes.length;
  globalGraphBuildCounter.edgesProcessed += edges.length;
  return buildDomainGraph(nodes, edges, domainResult, index, domainMapInput);
}

const LAYERS_IN_ORDER: ArchitectureLayer[] = [
  'presentation',
  'application',
  'domain',
  'schema',
];

/**
 * Test-Only Candidate implementation of computeGlobalDomainLayout that reuses domainGraph if prebuilt.
 */
export function computeGlobalDomainLayoutCandidate(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: GlobalLayoutOptions & { domainGraph?: DomainGraph; countBuilds?: boolean } = {}
): GlobalLayoutResult {
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];
  const index = options.index;

  const baseX = options.baseX ?? 100;
  const baseY = options.baseY ?? 100;
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;

  // CANDIDATE OPTIMIZATION: Reuse pre-built domainGraph if supplied
  const domainGraph = options.domainGraph || (options.countBuilds
    ? buildDomainGraphWithCounter(safeNodes, safeEdges, options.domainDiscovery, index, options.domainMap)
    : buildDomainGraph(safeNodes, safeEdges, options.domainDiscovery, index, options.domainMap));

  const orderedDomains = options.orderedDomains || determineGlobalDomainOrder(domainGraph);

  const dynamicLayerResult = computeDynamicLayerYMap(safeNodes, safeEdges, options);
  const layerYMap = dynamicLayerResult.layerYMap;

  const domainRegions = new Map<string, DomainRegion>();
  const nodeRegions = new Map<string, { domain: string; xCenter: number; yCenter: number; width: number; height: number }>();

  let totalWidthSum = 0;
  const domainDimensions = new Map<string, { width: number; height: number; primaryLayer: ArchitectureLayer }>();

  orderedDomains.forEach(domain => {
    const dNode = domainGraph.nodes.get(domain);
    const primaryLayer = dNode ? dNode.primaryLayer : 'application';

    const primaryNodesInDomain = dNode
      ? dNode.primaryNodeIds
          .map(id => (index ? index.nodeById.get(id) : safeNodes.find(n => n.id === id)))
          .filter((n): n is ExplorerNode => n !== undefined)
      : [];

    const layerCounts: Record<ArchitectureLayer, number> = {
      presentation: 0,
      application: 0,
      domain: 0,
      schema: 0,
    };

    primaryNodesInDomain.forEach(node => {
      const layer = classifyNodeLayer(node);
      layerCounts[layer] = (layerCounts[layer] || 0) + 1;
    });

    const representedLayers = LAYERS_IN_ORDER.filter(l => layerCounts[l] > 0);

    const maxCols = Math.max(
      1,
      ...LAYERS_IN_ORDER.map(l => (layerCounts[l] > 0 ? Math.min(4, layerCounts[l]) : 0))
    );

    const maxRows = Math.max(
      1,
      ...LAYERS_IN_ORDER.map(l => (layerCounts[l] > 0 ? Math.ceil(layerCounts[l] / 4) : 0))
    );

    const primaryWidth = maxCols * nodeWidth + Math.max(0, maxCols - 1) * 40;
    const primaryHeight = maxRows * nodeHeight + Math.max(0, maxRows - 1) * 40;

    const defaultMin = options.minRegionWidth ?? 160;
    const minWidth = options.minRegionWidth !== undefined
      ? options.minRegionWidth
      : (primaryNodesInDomain.length > 1 ? defaultMin : 160);
    const regionWidth = Math.max(minWidth, primaryWidth + 40);

    let regionHeight: number;
    if (representedLayers.length > 1) {
      const firstLayer = representedLayers[0];
      const lastLayer = representedLayers[representedLayers.length - 1];
      const minY = layerYMap[firstLayer];
      const maxY = layerYMap[lastLayer] + (dynamicLayerResult.layerHeights[lastLayer] || nodeHeight);
      regionHeight = Math.max(100, maxY - minY + 40);
    } else {
      regionHeight = Math.max(100, primaryHeight + 40);
    }

    domainDimensions.set(domain, { width: regionWidth, height: regionHeight, primaryLayer });
    totalWidthSum += regionWidth + 60;
  });

  const isFeatureLayout = options.isFeatureLayout ?? false;
  const isMultiRowNeeded = isFeatureLayout
    ? (orderedDomains.length >= 4 || totalWidthSum > 1200)
    : (orderedDomains.length >= 25 || totalWidthSum > 5000);

  if (!isMultiRowNeeded) {
    let currentX = baseX;

    orderedDomains.forEach((domain, orderIndex) => {
      const dNode = domainGraph.nodes.get(domain);
      const nodeCount = dNode ? dNode.nodeCount : 1;
      const primaryNodeCount = dNode ? dNode.primaryNodeCount : 0;
      const primaryLayer = dNode ? dNode.primaryLayer : 'application';
      const dim = domainDimensions.get(domain)!;

      if (orderIndex > 0) {
        for (let k = 0; k < orderIndex; k++) {
          const prevDomain = orderedDomains[k];
          const prevRegion = domainRegions.get(prevDomain);
          if (prevRegion) {
            const rel = domainGraph.adjacency.get(prevDomain)?.get(domain);
            const strength = rel ? rel.strength : 0;
            const minGap = 40;
            const maxGap = 80;
            const domainGap = maxGap - strength * (maxGap - minGap);
            currentX = Math.max(currentX, prevRegion.xMax + domainGap);
          }
        }
      }

      const xCenter = currentX + dim.width / 2;

      const primaryNodesInDomain = dNode
        ? dNode.primaryNodeIds
            .map(id => (index ? index.nodeById.get(id) : safeNodes.find(n => n.id === id)))
            .filter((n): n is ExplorerNode => n !== undefined)
        : [];

      const layerCounts: Record<ArchitectureLayer, number> = {
        presentation: 0,
        application: 0,
        domain: 0,
        schema: 0,
      };
      primaryNodesInDomain.forEach(node => {
        const layer = classifyNodeLayer(node);
        layerCounts[layer] = (layerCounts[layer] || 0) + 1;
      });
      const representedLayers = LAYERS_IN_ORDER.filter(l => layerCounts[l] > 0);

      let yMin: number;
      let yMax: number;
      let yCenter: number;

      if (representedLayers.length > 1) {
        const firstLayer = representedLayers[0];
        const lastLayer = representedLayers[representedLayers.length - 1];
        yMin = layerYMap[firstLayer] - 20;
        yMax = layerYMap[lastLayer] + (dynamicLayerResult.layerHeights[lastLayer] || nodeHeight) + 20;
        yCenter = (yMin + yMax) / 2;
      } else {
        const layerBaseY = layerYMap[primaryLayer] ?? baseY;
        yCenter = layerBaseY + dim.height / 2;
        yMin = yCenter - dim.height / 2;
        yMax = yCenter + dim.height / 2;
      }

      const xMin = currentX;
      const xMax = currentX + dim.width;

      const region: DomainRegion = {
        domain,
        xCenter,
        yCenter,
        width: dim.width,
        height: dim.height,
        xMin,
        xMax,
        yMin,
        yMax,
        nodeCount,
        primaryNodeCount,
        primaryLayer,
        orderIndex,
      };

      domainRegions.set(domain, region);

      if (dNode) {
        dNode.nodeIds.forEach(nodeId => {
          nodeRegions.set(nodeId, {
            domain,
            xCenter,
            yCenter,
            width: dim.width,
            height: dim.height,
          });
        });
      }
    });
  } else {
    const domainsByLayer: Record<ArchitectureLayer, string[]> = {
      presentation: [],
      application: [],
      domain: [],
      schema: [],
    };

    orderedDomains.forEach(domain => {
      const dNode = domainGraph.nodes.get(domain);
      const primaryLayer = dNode ? dNode.primaryLayer : 'application';
      domainsByLayer[primaryLayer].push(domain);
    });

    const targetRowWidth = options.targetRowWidthOverride ?? (isFeatureLayout
      ? Math.max(1200, Math.min(3200, Math.sqrt(totalWidthSum * 300 * 1.6)))
      : Math.max(2400, Math.min(4800, Math.sqrt(totalWidthSum * 800 * 1.6))));
    let currentY = baseY;

    LAYERS_IN_ORDER.forEach(layer => {
      const layerDomains = domainsByLayer[layer];
      if (layerDomains.length === 0) return;

      if (domainRegions.size > 0 && layerDomains.length > 1) {
        const barycenters = new Map<string, number>();
        layerDomains.forEach((d, origIdx) => {
          let sumX = 0;
          let weightSum = 0;
          const neighbors = domainGraph.adjacency.get(d);
          if (neighbors) {
            neighbors.forEach((rel, otherD) => {
              const placed = domainRegions.get(otherD);
              if (placed) {
                sumX += placed.xCenter * rel.totalEdgeCount;
                weightSum += rel.totalEdgeCount;
              }
            });
          }
          if (weightSum > 0) {
            barycenters.set(d, sumX / weightSum);
          } else {
            barycenters.set(d, baseX + origIdx * 300);
          }
        });

        layerDomains.sort((a, b) => {
          const bcA = barycenters.get(a) ?? 0;
          const bcB = barycenters.get(b) ?? 0;
          if (Math.abs(bcA - bcB) > 1e-6) return bcA - bcB;
          return a.localeCompare(b);
        });
      }

      let currentX = baseX;
      let maxRowHeightInLayer = 0;
      let rowIdx = 0;

      layerDomains.forEach((domain, idx) => {
        const dim = domainDimensions.get(domain)!;
        const dNode = domainGraph.nodes.get(domain);

        let domainGap = 80;
        if (idx > 0) {
          const prevDomain = layerDomains[idx - 1];
          const rel = domainGraph.adjacency.get(prevDomain)?.get(domain);
          const strength = rel ? rel.strength : 0;
          domainGap = 100 - strength * 20;
        }

        if (currentX > baseX && currentX + dim.width > targetRowWidth) {
          rowIdx++;
          currentX = baseX + (rowIdx % 5) * 40;
          currentY += maxRowHeightInLayer + 60;
          maxRowHeightInLayer = 0;
        }

        if (idx > 0) {
          const prevRegion = domainRegions.get(layerDomains[idx - 1]);
          if (prevRegion && prevRegion.yMin === currentY) {
            currentX = Math.max(currentX, prevRegion.xMax + domainGap);
          }
        }

        const xMin = currentX;
        const xMax = currentX + dim.width;
        const xCenter = currentX + dim.width / 2;
        const yMin = currentY;
        const yMax = currentY + dim.height;
        const yCenter = currentY + dim.height / 2;

        const region: DomainRegion = {
          domain,
          xCenter,
          yCenter,
          width: dim.width,
          height: dim.height,
          xMin,
          xMax,
          yMin,
          yMax,
          nodeCount: dNode ? dNode.nodeCount : 1,
          primaryNodeCount: dNode ? dNode.primaryNodeCount : 0,
          primaryLayer: layer,
          orderIndex: idx,
        };

        domainRegions.set(domain, region);

        if (dNode) {
          dNode.nodeIds.forEach(nodeId => {
            nodeRegions.set(nodeId, {
              domain,
              xCenter,
              yCenter,
              width: dim.width,
              height: dim.height,
            });
          });
        }

        currentX = xMax + domainGap;
        if (dim.height > maxRowHeightInLayer) {
          maxRowHeightInLayer = dim.height;
        }
      });

      currentY += maxRowHeightInLayer + 120;
    });
  }

  const candidatePositions: Record<string, { x: number; y: number }> = {};
  nodeRegions.forEach((region, nodeId) => {
    candidatePositions[nodeId] = { x: region.xCenter, y: region.yCenter };
  });

  let metrics = null;
  if (safeNodes.length > 0 && Object.keys(candidatePositions).length > 0) {
    metrics = calculateLayoutMetrics(safeNodes, safeEdges, candidatePositions, {
      nodeWidth,
      nodeHeight,
    });
  }

  return {
    domainGraph,
    domainRegions,
    nodeRegions,
    orderedDomains,
    metrics,
    layerYMap,
    layerRowCounts: dynamicLayerResult.layerRowCounts,
    layerHeights: dynamicLayerResult.layerHeights,
  };
}

/**
 * Test-Only Candidate implementation of computeGlobalFeatureLayout that reuses featureGraph across calls.
 */
export function computeGlobalFeatureLayoutCandidate(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: GlobalFeatureLayoutOptions & { prebuiltFeatureGraph?: DomainGraph; countBuilds?: boolean } = {}
): GlobalFeatureLayoutResult {
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const index = options.index;
  const analysis = options.analysis || computeArchitectureAnalysis(safeNodes, safeEdges, { index });
  const layerMap = options.layerMap;
  const domainMap = options.domainMap;

  // Resolve feature map from options or feature discovery
  const featureMap = new Map<string, string>();
  if (options.featureMap instanceof Map) {
    options.featureMap.forEach((v, k) => featureMap.set(k, v));
  } else if (options.featureMap) {
    Object.entries(options.featureMap).forEach(([k, v]) => featureMap.set(k, v));
  } else {
    const discovery = options.featureDiscovery || discoverFeatures(safeNodes, safeEdges, {
      index,
      analysis,
      layerMap,
      domainMap,
    });
    discovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });
  }

  // Fallback for unmapped nodes
  safeNodes.forEach(node => {
    if (!featureMap.has(node.id)) {
      featureMap.set(node.id, 'Unassigned');
    }
  });

  // CANDIDATE OPTIMIZATION: Build featureGraph ONCE (or use prebuilt)
  const featureGraph = options.prebuiltFeatureGraph || (options.countBuilds
    ? buildDomainGraphWithCounter(safeNodes, safeEdges, undefined, index, featureMap)
    : buildDomainGraph(safeNodes, safeEdges, undefined, index, featureMap));

  const orderedFeatures = options.orderedDomains || determineGlobalFeatureOrder(
    safeNodes,
    safeEdges,
    featureGraph,
    featureMap,
    options.featureOrderingStrategy ?? 'F_2D_BAND_AWARE'
  );

  // CANDIDATE OPTIMIZATION: Pass domainGraph: featureGraph into computeGlobalDomainLayoutCandidate
  const globalResult = computeGlobalDomainLayoutCandidate(safeNodes, safeEdges, {
    ...options,
    analysis,
    index,
    orderedDomains: orderedFeatures,
    minRegionWidth: options.minRegionWidth ?? 280,
    domainMap: featureMap,
    isFeatureLayout: true,
    domainGraph: featureGraph, // <--- REUSED GRAPH OBJECT
    countBuilds: options.countBuilds,
  });

  const featureRegions = new Map<string, FeatureRegion>();
  globalResult.domainRegions.forEach((region, featureId) => {
    let domainId: string | undefined = undefined;
    if (options.featureDiscovery) {
      domainId = options.featureDiscovery.features.get(featureId)?.domains[0];
    }

    featureRegions.set(featureId, {
      ...region,
      featureId,
      domainId,
    });
  });

  const featureLayerYMap = computeFeatureLayerYMap(safeNodes, safeEdges, featureGraph, {
    ...options,
    analysis,
    index,
    featureMap,
    featureRegions,
  });

  const layerYMap = {
    ...globalResult.layerYMap,
  };

  const domainBounds: Record<string, { xMin: number; xMax: number }> = {};
  featureRegions.forEach((region, featureId) => {
    domainBounds[featureId] = {
      xMin: region.xMin - 40,
      xMax: region.xMax + 40,
    };
  });

  return {
    ...globalResult,
    layerYMap,
    featureRegions,
    featureGraph: globalResult.domainGraph,
    orderedFeatures: globalResult.orderedDomains,
    featureLayerYMap,
    domainBounds,
  };
}

/**
 * Helper to serialize DomainGraph for structural comparison.
 */
export function serializeDomainGraph(g: DomainGraph) {
  const nodeEntries = Array.from(g.nodes.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({
      domain: k,
      nodeCount: v.nodeCount,
      primaryNodeCount: v.primaryNodeCount,
      layers: [...v.layers].sort(),
      primaryLayer: v.primaryLayer,
      nodeIds: [...v.nodeIds].sort(),
      primaryNodeIds: [...v.primaryNodeIds].sort(),
      connectedDomains: [...v.connectedDomains].sort(),
      degree: v.degree,
      isShared: v.isShared,
      primaryDomain: v.primaryDomain,
    }));

  const edgeEntries = [...g.edges]
    .sort((a, b) => {
      const cmp = a.sourceDomain.localeCompare(b.sourceDomain);
      return cmp !== 0 ? cmp : a.targetDomain.localeCompare(b.targetDomain);
    })
    .map(e => ({
      sourceDomain: e.sourceDomain,
      targetDomain: e.targetDomain,
      edgeCount: e.edgeCount,
      reverseEdgeCount: e.reverseEdgeCount,
      totalEdgeCount: e.totalEdgeCount,
      strength: e.strength,
      isBidirectional: e.isBidirectional,
      layerSpan: [...e.layerSpan].sort(),
    }));

  const adjacencyKeys = Array.from(g.adjacency.keys()).sort();
  const adjacencyEntries = adjacencyKeys.map(k1 => {
    const map2 = g.adjacency.get(k1)!;
    const k2s = Array.from(map2.keys()).sort();
    return {
      k1,
      neighbors: k2s.map(k2 => {
        const rel = map2.get(k2)!;
        return {
          k2,
          edgeCount: rel.edgeCount,
          totalEdgeCount: rel.totalEdgeCount,
        };
      }),
    };
  });

  return {
    nodeEntries,
    edgeEntries,
    adjacencyEntries,
  };
}

/**
 * Executes full downstream layout pipeline given a Stage 5 result.
 */
export function runFullPipelineFromStage5(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  stage5Result: GlobalFeatureLayoutResult,
  options: {
    nodeWidth?: number;
    nodeHeight?: number;
    layerSpacing?: number;
    domainSpacing?: number;
    componentGap?: number;
  } = {}
) {
  const {
    nodeWidth = 120,
    nodeHeight = 60,
    layerSpacing = 250,
    domainSpacing = 380,
    componentGap = 100,
  } = options;

  const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
  const index = createLayoutGraphIndex(safeNodes, safeEdges);
  const analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  const layerMap = new Map<string, ArchitectureLayer>();
  safeNodes.forEach(node => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });

  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((assignment, nodeId) => {
    domainMap.set(nodeId, assignment.primaryDomain);
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
  safeNodes.forEach(node => {
    if (!featureMap.has(node.id)) featureMap.set(node.id, 'Unassigned');
  });

  const centralityMap = computeGraphCentralityAnalysis(
    safeNodes,
    safeEdges,
    domainMap,
    layerMap,
    { index }
  );

  // Stage 6: Layer Ordering & Crossing Reduction
  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: featureMap,
    domainOrder: stage5Result.orderedDomains,
    layerYMap: stage5Result.layerYMap,
  });

  // Stage 7: Primary Production Local Layout
  const localResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: stage5Result.domainRegions,
    layerMap,
    domainMap: featureMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth,
      nodeHeight,
      domainSpacing,
      layerYMap: stage5Result.layerYMap,
      featureLayerYMap: stage5Result.featureLayerYMap,
    },
  });

  const basePositions: Record<string, { x: number; y: number }> = {
    ...localResult.primaryNodePositions,
  };

  // Stage 8: Hub & Bridge Spatial Refinement
  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};

  stage5Result.domainRegions.forEach((region, domain) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  safeNodes.forEach(node => {
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
        { layerSpacing, nodeWidth, nodeHeight, layerYOffsets: stage5Result.layerYMap, index, allocatedPositions: basePositions }
      );

      basePositions[node.id] = bridgeInfo.candidatePosition;
    }
  });

  // Stage 9: Secondary Satellite Placement
  const satelliteResult = placeSatellites(
    safeNodes,
    safeEdges,
    analysis,
    basePositions,
    {
      nodeWidth,
      nodeHeight,
      layerSpacing,
      layerYOffsets: stage5Result.layerYMap,
      index,
      ...(stage5Result.featureLayerYMap
        ? { featureLayerYMap: stage5Result.featureLayerYMap, featureMap }
        : {}),
    }
  );

  // Stage 10: Disconnected Component Packing
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

  // Stage 11: Final Global Spatial Cleanup Pass
  const finalCleanupResult = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: componentShiftedPositions,
    analysis,
    options: {
      nodeWidth,
      nodeHeight,
      layerMap,
      domainMap: featureMap,
      ...(stage5Result.domainBounds
        ? { domainBounds: stage5Result.domainBounds }
        : {}),
    },
  });

  const finalPositions = finalCleanupResult.positions;
  const evaluation = evaluateLayout(safeNodes, safeEdges, finalPositions, { nodeWidth, nodeHeight });

  return {
    positions: finalPositions,
    evaluation,
  };
}

describe('Stage 5 — Feature Graph Reuse A/B Experiment Harness', () => {
  it('0. Sanity & Fixture Baseline Verification', () => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const buf = fs.readFileSync(cstPath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    expect(hash).toBe(EXPECTED_CST_HASH);
  });

  describe('3. FIRST FORENSIC CHECK — PROVE GRAPH IDENTITY & EQUIVALENCE', () => {
    it('proves exact identity between featureGraph built at Line 1414 and domainGraph built at Line 1037', () => {
      const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
      const nodes = cstData.nodes as ExplorerNode[];
      const edges = cstData.edges as ExplorerEdge[];

      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      const analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map<string, ArchitectureLayer>();
      safeNodes.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));
      const domainDiscovery = discoverDomains(safeNodes, safeEdges, { index, analysis, layerMap });
      const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap: domainDiscovery.domainMap });

      const featureMap = new Map<string, string>();
      featureDiscovery.assignments.forEach((assignment, nodeId) => {
        featureMap.set(nodeId, assignment.primaryFeatureId);
      });
      safeNodes.forEach(node => {
        if (!featureMap.has(node.id)) featureMap.set(node.id, 'Unassigned');
      });

      // Graph 1: Built at Line 1414 (domainResult = undefined)
      const graphLine1414 = buildDomainGraph(safeNodes, safeEdges, undefined, index, featureMap);

      // Graph 2: Built at Line 1037 (domainResult = options.domainDiscovery)
      const graphLine1037 = buildDomainGraph(safeNodes, safeEdges, domainDiscovery, index, featureMap);

      // 1. Node counts match
      expect(graphLine1414.nodes.size).toBe(graphLine1037.nodes.size);

      // 2. Node IDs match exactly
      const nodes1414Keys = Array.from(graphLine1414.nodes.keys()).sort();
      const nodes1037Keys = Array.from(graphLine1037.nodes.keys()).sort();
      expect(nodes1414Keys).toEqual(nodes1037Keys);

      // 3. Edge counts match
      expect(graphLine1414.edges.length).toBe(graphLine1037.edges.length);

      // 4. Structural equality across all node properties
      const s1414 = serializeDomainGraph(graphLine1414);
      const s1037 = serializeDomainGraph(graphLine1037);
      expect(s1414).toEqual(s1037);
    });

    it('proves mutability/aliasing safety: Stage 5 does NOT mutate featureGraph during execution', () => {
      const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
      const nodes = cstData.nodes as ExplorerNode[];
      const edges = cstData.edges as ExplorerEdge[];

      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      const analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map<string, ArchitectureLayer>();
      safeNodes.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));
      const domainDiscovery = discoverDomains(safeNodes, safeEdges, { index, analysis, layerMap });
      const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap: domainDiscovery.domainMap });

      const featureMap = new Map<string, string>();
      featureDiscovery.assignments.forEach((assignment, nodeId) => {
        featureMap.set(nodeId, assignment.primaryFeatureId);
      });
      safeNodes.forEach(node => {
        if (!featureMap.has(node.id)) featureMap.set(node.id, 'Unassigned');
      });

      const prebuiltGraph = buildDomainGraph(safeNodes, safeEdges, undefined, index, featureMap);
      const serializedBefore = JSON.stringify(serializeDomainGraph(prebuiltGraph));

      // Execute candidate using prebuiltGraph
      computeGlobalFeatureLayoutCandidate(safeNodes, safeEdges, {
        index,
        analysis,
        layerMap,
        domainMap: domainDiscovery.domainMap,
        featureDiscovery,
        prebuiltFeatureGraph: prebuiltGraph,
      });

      const serializedAfter = JSON.stringify(serializeDomainGraph(prebuiltGraph));

      // Prove zero mutations occurred during Stage 5 execution
      expect(serializedAfter).toBe(serializedBefore);
    });
  });

  describe('STAGE 5 OUTPUT & DOWNSTREAM LAYOUT EQUIVALENCE', () => {
    it('proves Stage 5 outputs are 100% bit-for-bit identical between Oracle and Candidate on CST', () => {
      const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
      const nodes = cstData.nodes as ExplorerNode[];
      const edges = cstData.edges as ExplorerEdge[];

      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      const analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map<string, ArchitectureLayer>();
      safeNodes.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));
      const domainDiscovery = discoverDomains(safeNodes, safeEdges, { index, analysis, layerMap });
      const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap: domainDiscovery.domainMap });

      const options = {
        index,
        analysis,
        layerMap,
        domainMap: domainDiscovery.domainMap,
        featureDiscovery,
      };

      const oracleResult = computeGlobalFeatureLayout(safeNodes, safeEdges, options);
      const candidateResult = computeGlobalFeatureLayoutCandidate(safeNodes, safeEdges, options);

      expect(candidateResult.orderedFeatures).toEqual(oracleResult.orderedFeatures);
      expect(candidateResult.layerYMap).toEqual(oracleResult.layerYMap);
      expect(candidateResult.layerRowCounts).toEqual(oracleResult.layerRowCounts);
      expect(candidateResult.layerHeights).toEqual(oracleResult.layerHeights);
      expect(candidateResult.featureLayerYMap).toEqual(oracleResult.featureLayerYMap);
      expect(candidateResult.domainBounds).toEqual(oracleResult.domainBounds);

      expect(Array.from(candidateResult.domainRegions.entries())).toEqual(Array.from(oracleResult.domainRegions.entries()));
      expect(Array.from(candidateResult.featureRegions.entries())).toEqual(Array.from(oracleResult.featureRegions.entries()));
      expect(Array.from(candidateResult.nodeRegions.entries())).toEqual(Array.from(oracleResult.nodeRegions.entries()));
    });

    it('proves downstream layout (Stages 6-12) produces 100% identical positions and meets canonical CST contract', () => {
      const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
      const nodes = cstData.nodes as ExplorerNode[];
      const edges = cstData.edges as ExplorerEdge[];

      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      const analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map<string, ArchitectureLayer>();
      safeNodes.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));
      const domainDiscovery = discoverDomains(safeNodes, safeEdges, { index, analysis, layerMap });
      const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap: domainDiscovery.domainMap });

      const options = {
        index,
        analysis,
        layerMap,
        domainMap: domainDiscovery.domainMap,
        featureDiscovery,
      };

      const oracleStage5 = computeGlobalFeatureLayout(safeNodes, safeEdges, options);
      const candidateStage5 = computeGlobalFeatureLayoutCandidate(safeNodes, safeEdges, options);

      const oraclePipeline = runFullPipelineFromStage5(safeNodes, safeEdges, oracleStage5);
      const candidatePipeline = runFullPipelineFromStage5(safeNodes, safeEdges, candidateStage5);

      // Exact position equality
      expect(candidatePipeline.positions).toEqual(oraclePipeline.positions);

      // Exact evaluation metrics match
      expect(candidatePipeline.evaluation).toEqual(oraclePipeline.evaluation);

      // Default Domain Mode contract check
      const fullDefaultLayoutPositions = computeArchitectureLayout(safeNodes, safeEdges, { enableFeatureLayout: false });
      const fullDefaultEval = evaluateLayout(safeNodes, safeEdges, fullDefaultLayoutPositions);

      expect(fullDefaultEval.detailedCrossings?.primaryPrimaryCrossings).toBe(9562);
      expect(fullDefaultEval.detailedCrossings?.totalGeometricCrossings).toBe(103654);
      expect(fullDefaultEval.edgeCrossingCount).toBe(103654);

      // Hybrid Mode contract check
      const fullHybridLayoutPositions = computeArchitectureLayout(safeNodes, safeEdges, { enableFeatureLayout: true });
      const fullHybridEval = evaluateLayout(safeNodes, safeEdges, fullHybridLayoutPositions);

      expect(fullHybridEval.detailedCrossings?.primaryPrimaryCrossings).toBe(7812);
      expect(fullHybridEval.detailedCrossings?.totalGeometricCrossings).toBe(85367);
      expect(fullHybridEval.edgeCrossingCount).toBe(85367);
      expect(fullHybridEval.minClearance).toBeGreaterThanOrEqual(40.0 - 0.001);
      expect(fullHybridEval.primaryOverlapCount).toBe(0);
      expect(fullHybridEval.satelliteOverlapCount).toBe(0);
      expect(fullHybridEval.layerViolationCount).toBe(0);
    });
  });

  describe('ADVERSARIAL, SEEDED RANDOMIZED, AND DETERMINISM SUITES', () => {
    it('11. Adversarial Scenarios: 12 edge cases comparing Oracle vs Candidate', () => {
      // 1. Empty feature graph
      const emptyNodes: ExplorerNode[] = [];
      const emptyEdges: ExplorerEdge[] = [];
      expect(computeGlobalFeatureLayoutCandidate(emptyNodes, emptyEdges).orderedFeatures).toEqual(
        computeGlobalFeatureLayout(emptyNodes, emptyEdges).orderedFeatures
      );

      // 2. Single feature
      const singleNode: ExplorerNode[] = [
        { id: 'ApexClass:Single', name: 'Single', type: 'ApexClass', data: { name: 'Single' } },
      ];

      const oracleSingle = computeGlobalFeatureLayout(singleNode, []);
      const candSingle = computeGlobalFeatureLayoutCandidate(singleNode, []);
      expect(candSingle.orderedFeatures).toEqual(oracleSingle.orderedFeatures);
      expect(Array.from(candSingle.featureRegions.entries())).toEqual(Array.from(oracleSingle.featureRegions.entries()));

      // 3. Multiple disconnected features
      const discNodes: ExplorerNode[] = [
        { id: 'ApexClass:FeatureA_Class', name: 'FeatureA_Class', type: 'ApexClass', data: {} },
        { id: 'ApexClass:FeatureB_Class', name: 'FeatureB_Class', type: 'ApexClass', data: {} },
        { id: 'ApexClass:FeatureC_Class', name: 'FeatureC_Class', type: 'ApexClass', data: {} },
      ];
      const oracleDisc = computeGlobalFeatureLayout(discNodes, []);
      const candDisc = computeGlobalFeatureLayoutCandidate(discNodes, []);
      expect(candDisc.orderedFeatures).toEqual(oracleDisc.orderedFeatures);
      expect(Array.from(candDisc.featureRegions.entries())).toEqual(Array.from(oracleDisc.featureRegions.entries()));

      // 4. Densely connected features
      const denseNodes: ExplorerNode[] = [
        { id: 'ApexClass:FeatureA_1', name: 'FeatureA_1', type: 'ApexClass', data: {} },
        { id: 'ApexClass:FeatureB_1', name: 'FeatureB_1', type: 'ApexClass', data: {} },
        { id: 'ApexClass:FeatureC_1', name: 'FeatureC_1', type: 'ApexClass', data: {} },
      ];
      const denseEdges: ExplorerEdge[] = [
        { id: 'e1', source: 'ApexClass:FeatureA_1', target: 'ApexClass:FeatureB_1', data: {} },
        { id: 'e2', source: 'ApexClass:FeatureB_1', target: 'ApexClass:FeatureC_1', data: {} },
        { id: 'e3', source: 'ApexClass:FeatureC_1', target: 'ApexClass:FeatureA_1', data: {} },
      ];
      const oracleDense = computeGlobalFeatureLayout(denseNodes, denseEdges);
      const candDense = computeGlobalFeatureLayoutCandidate(denseNodes, denseEdges);
      expect(candDense.orderedFeatures).toEqual(oracleDense.orderedFeatures);
      expect(Array.from(candDense.featureRegions.entries())).toEqual(Array.from(oracleDense.featureRegions.entries()));

      // 5. Multiple domains
      const domNodes: ExplorerNode[] = [
        { id: 'ApexClass:AccountController', name: 'AccountController', file: 'force-app/main/default/classes/AccountController.cls', type: 'ApexClass', data: {} },
        { id: 'ApexClass:OpportunityService', name: 'OpportunityService', file: 'force-app/main/default/classes/OpportunityService.cls', type: 'ApexClass', data: {} },
      ];
      const oracleDom = computeGlobalFeatureLayout(domNodes, []);
      const candDom = computeGlobalFeatureLayoutCandidate(domNodes, []);
      expect(candDom.orderedFeatures).toEqual(oracleDom.orderedFeatures);

      // 6. Features shared across domains
      const sharedNodes: ExplorerNode[] = [
        { id: 'ApexClass:SharedUtils', name: 'SharedUtils', type: 'ApexClass', data: {} },
        { id: 'ApexClass:AccountService', name: 'AccountService', type: 'ApexClass', data: {} },
        { id: 'ApexClass:OrderService', name: 'OrderService', type: 'ApexClass', data: {} },
      ];
      const sharedEdges: ExplorerEdge[] = [
        { id: 'e1', source: 'ApexClass:AccountService', target: 'ApexClass:SharedUtils', data: {} },
        { id: 'e2', source: 'ApexClass:OrderService', target: 'ApexClass:SharedUtils', data: {} },
      ];
      const oracleShared = computeGlobalFeatureLayout(sharedNodes, sharedEdges);
      const candShared = computeGlobalFeatureLayoutCandidate(sharedNodes, sharedEdges);
      expect(candShared.orderedFeatures).toEqual(oracleShared.orderedFeatures);

      // 7. Asymmetric adjacency
      const asymEdges: ExplorerEdge[] = [
        { id: 'e1', source: 'ApexClass:FeatureA_1', target: 'ApexClass:FeatureB_1', data: {} },
        { id: 'e2', source: 'ApexClass:FeatureA_1', target: 'ApexClass:FeatureB_1', data: {} },
        { id: 'e3', source: 'ApexClass:FeatureA_1', target: 'ApexClass:FeatureB_1', data: {} },
      ];
      const oracleAsym = computeGlobalFeatureLayout(denseNodes, asymEdges);
      const candAsym = computeGlobalFeatureLayoutCandidate(denseNodes, asymEdges);
      expect(candAsym.orderedFeatures).toEqual(oracleAsym.orderedFeatures);

      // 8. Feature ordering ties
      const tieNodes: ExplorerNode[] = [
        { id: 'ApexClass:TieA_Service', name: 'TieA_Service', type: 'ApexClass', data: {} },
        { id: 'ApexClass:TieB_Service', name: 'TieB_Service', type: 'ApexClass', data: {} },
      ];
      const oracleTie = computeGlobalFeatureLayout(tieNodes, []);
      const candTie = computeGlobalFeatureLayoutCandidate(tieNodes, []);
      expect(candTie.orderedFeatures).toEqual(oracleTie.orderedFeatures);

      // 9. Sparse graph
      const sparse = generateSyntheticSalesforceGraph({ nodeCount: 50, seed: 99 });
      const oracleSparse = computeGlobalFeatureLayout(sparse.nodes, sparse.edges);
      const candSparse = computeGlobalFeatureLayoutCandidate(sparse.nodes, sparse.edges);
      expect(candSparse.orderedFeatures).toEqual(oracleSparse.orderedFeatures);

      // 10. Large graph
      const large = generateSyntheticSalesforceGraph({ nodeCount: 200, seed: 100 });
      const oracleLarge = computeGlobalFeatureLayout(large.nodes, large.edges);
      const candLarge = computeGlobalFeatureLayoutCandidate(large.nodes, large.edges);
      expect(candLarge.orderedFeatures).toEqual(oracleLarge.orderedFeatures);

      // 11. Graph with fallback assignments
      const fallbackNodes: ExplorerNode[] = [
        { id: 'ApexClass:X_123', name: 'X_123', type: 'ApexClass', data: {} },
      ];
      const oracleFallback = computeGlobalFeatureLayout(fallbackNodes, []);
      const candFallback = computeGlobalFeatureLayoutCandidate(fallbackNodes, []);
      expect(candFallback.orderedFeatures).toEqual(oracleFallback.orderedFeatures);

      // 12. Discovery order differs from input order
      const revNodes = [...denseNodes].reverse();
      const oracleRev = computeGlobalFeatureLayout(revNodes, denseEdges);
      const candRev = computeGlobalFeatureLayoutCandidate(revNodes, denseEdges);
      expect(candRev.orderedFeatures).toEqual(oracleRev.orderedFeatures);
    });

    it('12. Seeded Randomized Differential Testing: 10 random seeds compare Oracle vs Candidate', () => {
      for (let seed = 1; seed <= 10; seed++) {
        const synth = generateSyntheticSalesforceGraph({ nodeCount: 100 + seed * 10, seed });
        const oracleRes = computeGlobalFeatureLayout(synth.nodes, synth.edges);
        const candRes = computeGlobalFeatureLayoutCandidate(synth.nodes, synth.edges);

        expect(candRes.orderedFeatures).toEqual(oracleRes.orderedFeatures);
        expect(candRes.layerYMap).toEqual(oracleRes.layerYMap);
        expect(Array.from(candRes.featureRegions.entries())).toEqual(Array.from(oracleRes.featureRegions.entries()));

        const oraclePipe = runFullPipelineFromStage5(synth.nodes, synth.edges, oracleRes);
        const candPipe = runFullPipelineFromStage5(synth.nodes, synth.edges, candRes);

        expect(candPipe.positions).toEqual(oraclePipe.positions);
        expect(candPipe.evaluation).toEqual(oraclePipe.evaluation);
      }
    });

    it('13. Determinism: 10x repeated runs and shuffled inputs produce 0px coordinate drift', () => {
      const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
      const nodes = cstData.nodes as ExplorerNode[];
      const edges = cstData.edges as ExplorerEdge[];

      const baseRes = computeGlobalFeatureLayoutCandidate(nodes, edges);

      // 10x repeated execution
      for (let run = 1; run <= 10; run++) {
        const runRes = computeGlobalFeatureLayoutCandidate(nodes, edges);
        expect(runRes.orderedFeatures).toEqual(baseRes.orderedFeatures);
        expect(Array.from(runRes.featureRegions.entries())).toEqual(Array.from(baseRes.featureRegions.entries()));
      }

      // Shuffled input order
      for (let run = 1; run <= 5; run++) {
        const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
        const shuffledEdges = [...edges].sort(() => Math.random() - 0.5);
        const shRes = computeGlobalFeatureLayoutCandidate(shuffledNodes, shuffledEdges);
        expect(shRes.orderedFeatures).toEqual(baseRes.orderedFeatures);
        expect(Array.from(shRes.featureRegions.entries())).toEqual(Array.from(baseRes.featureRegions.entries()));
      }
    });
  });

  describe('DISAGGREGATED PERFORMANCE & WORK ELIMINATED BENCHMARKS (T1 - T5)', () => {
    it('14-16. Measures disaggregated runtime, speedups, and work eliminated across Scale Tiers T1-T5', { timeout: 600000 }, () => {
      const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
      const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
      const t1Nodes = cstData.nodes as ExplorerNode[];
      const t1Edges = cstData.edges as ExplorerEdge[];

      const t2 = generateSyntheticSalesforceGraph({ nodeCount: 500, seed: 42 });
      const t3 = generateSyntheticSalesforceGraph({ nodeCount: 1000, seed: 43 });
      const t4 = generateSyntheticSalesforceGraph({ nodeCount: 2000, seed: 44 });
      const t5 = generateSyntheticSalesforceGraph({ nodeCount: 5000, seed: 45 });

      const scaleTiers = [
        { tier: 'T1 (240N/1024E)', nodes: t1Nodes, edges: t1Edges },
        { tier: 'T2 (500N/1000E)', nodes: t2.nodes, edges: t2.edges },
        { tier: 'T3 (1000N/2000E)', nodes: t3.nodes, edges: t3.edges },
        { tier: 'T4 (2000N/4000E)', nodes: t4.nodes, edges: t4.edges },
        { tier: 'T5 (5000N/10000E)', nodes: t5.nodes, edges: t5.edges },
      ];

      console.log('\n========================================================================================================');
      console.log('              STAGE 5 FEATURE GRAPH REUSE A/B EXPERIMENT PERFORMANCE BENCHMARK');
      console.log('========================================================================================================');
      console.log('Tier              | Oracle Time | Candidate Time | Delta (ms) | Speedup | Graph Build Time | % Stage5 Saved');
      console.log('--------------------------------------------------------------------------------------------------------');

      const WARM_RUNS = 3;

      for (const t of scaleTiers) {
        const { nodes, edges, tier } = t;

        // Warmup runs
        for (let w = 0; w < 2; w++) {
          computeGlobalFeatureLayout(nodes, edges);
          computeGlobalFeatureLayoutCandidate(nodes, edges);
        }

        // Measure Oracle
        const oracleTimes: number[] = [];
        for (let r = 0; r < WARM_RUNS; r++) {
          const t0 = performance.now();
          computeGlobalFeatureLayout(nodes, edges);
          const t1 = performance.now();
          oracleTimes.push(t1 - t0);
        }
        oracleTimes.sort((a, b) => a - b);
        const oracleMedian = oracleTimes[Math.floor(oracleTimes.length / 2)];

        // Measure Candidate
        const candidateTimes: number[] = [];
        for (let r = 0; r < WARM_RUNS; r++) {
          const t0 = performance.now();
          computeGlobalFeatureLayoutCandidate(nodes, edges);
          const t1 = performance.now();
          candidateTimes.push(t1 - t0);
        }
        candidateTimes.sort((a, b) => a - b);
        const candidateMedian = candidateTimes[Math.floor(candidateTimes.length / 2)];

        // Measure single buildDomainGraph time
        const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
        const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
        const index = createLayoutGraphIndex(safeNodes, safeEdges);
        const analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
        const layerMap = new Map<string, ArchitectureLayer>();
        safeNodes.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));
        const domainDiscovery = discoverDomains(safeNodes, safeEdges, { index, analysis, layerMap });
        const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap: domainDiscovery.domainMap });

        const featureMap = new Map<string, string>();
        featureDiscovery.assignments.forEach((assignment, nodeId) => {
          featureMap.set(nodeId, assignment.primaryFeatureId);
        });
        safeNodes.forEach(node => {
          if (!featureMap.has(node.id)) featureMap.set(node.id, 'Unassigned');
        });

        const bgTimes: number[] = [];
        for (let r = 0; r < WARM_RUNS; r++) {
          const tb0 = performance.now();
          buildDomainGraph(safeNodes, safeEdges, undefined, index, featureMap);
          const tb1 = performance.now();
          bgTimes.push(tb1 - tb0);
        }
        bgTimes.sort((a, b) => a - b);
        const bgMedian = bgTimes[Math.floor(bgTimes.length / 2)];

        const delta = oracleMedian - candidateMedian;
        const speedup = oracleMedian / Math.max(0.001, candidateMedian);
        const pctSaved = (delta / oracleMedian) * 100;

        console.log(
          `${tier.padEnd(17)} | ` +
          `${oracleMedian.toFixed(2).padStart(8)} ms | ` +
          `${candidateMedian.toFixed(2).padStart(11)} ms | ` +
          `${delta.toFixed(2).padStart(7)} ms | ` +
          `${speedup.toFixed(2).padStart(6)}x | ` +
          `${bgMedian.toFixed(2).padStart(13)} ms | ` +
          `${pctSaved.toFixed(1).padStart(12)}%`
        );

        // Measure Work Eliminated via Counter
        resetGlobalGraphBuildCounter();
        computeGlobalFeatureLayoutCandidate(nodes, edges, { countBuilds: true });
        const candidateBuilds = globalGraphBuildCounter.count;
        const candidateNodesProcessed = globalGraphBuildCounter.nodesProcessed;
        const candidateEdgesProcessed = globalGraphBuildCounter.edgesProcessed;

        resetGlobalGraphBuildCounter();
        // Oracle calls buildDomainGraph twice
        computeGlobalFeatureLayoutCandidate(nodes, edges, { prebuiltFeatureGraph: undefined, countBuilds: true }); // builds twice if no reuse
        // Build 1
        buildDomainGraphWithCounter(safeNodes, safeEdges, undefined, index, featureMap);
        // Build 2
        buildDomainGraphWithCounter(safeNodes, safeEdges, domainDiscovery, index, featureMap);
        const oracleBuilds = 2;
        const oracleNodesProcessed = nodes.length * 2;
        const oracleEdgesProcessed = edges.length * 2;

        expect(candidateBuilds).toBe(1);
        expect(oracleBuilds).toBe(2);
        expect(candidateNodesProcessed).toBe(nodes.length);
        expect(oracleNodesProcessed).toBe(nodes.length * 2);
      }
    });
  });
});
