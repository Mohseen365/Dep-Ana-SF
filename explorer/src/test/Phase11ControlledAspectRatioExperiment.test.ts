import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { PositionMap } from '../lib/layout/metrics';
import { calculateLayoutMetrics } from '../lib/layout/metrics';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from '../lib/layout/centrality';
import { type FeatureRoleContext } from '../lib/layout/feature-roles';
import { discoverFeatures } from '../lib/layout/features';
import {
  buildDomainGraph,
  computeFeatureLayerYMap,
  type FeatureRegion,
  type DomainRegion,
  LAYER_Y_MAP,
} from '../lib/layout/global-layout';
import { determineGlobalFeatureOrder } from '../lib/layout/feature-ordering';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { placeSatellites } from '../lib/layout/satellites';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from '../lib/layout/components';
import { resolveSpacingAndCollisions } from '../lib/layout/spacing';

interface ProjectDataset {
  key: string;
  name: string;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
}

function loadProject(projectKey: string, relativePath: string): ProjectDataset {
  const fullPath = path.resolve(__dirname, '../../../', relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Project file not found at: ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    key: projectKey,
    name: projectKey,
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

function isSecondaryNode(node: ExplorerNode): boolean {
  const isTest =
    node.behavior?.isTest ||
    (typeof node.file === 'string' && /(?:^|\/)(?:test|tests)\//i.test(node.file)) ||
    /(?:test|tests|testdatafactory)$/i.test(node.displayName || node.id || '');
  const isField = node.type === 'Field' || node.type === 'CustomField';
  return isTest || isField;
}

const LAYERS_IN_ORDER = ['presentation', 'application', 'domain', 'schema'] as const;

/**
 * Phase 11 Controlled Experiment Pipeline Runner.
 * Executes Stage 1 to Stage 12 layout pipeline with an explicit targetRowWidthOverride in Stage 5.
 */
function runPhase11ExperimentPipeline(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  targetRowWidthOverride?: number
) {
  const nodeWidth = 120;
  const nodeHeight = 60;
  const layerSpacing = 250;
  const domainSpacing = 380;
  const componentGap = 100;

  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

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
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
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
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      });
    }
  });

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const index = createLayoutGraphIndex(safeNodes, safeEdges);

  // Stage 1-4 Analysis setup
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  const layerMap = new Map();
  safeNodes.forEach(node => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });
  analysis = applyLayerClassification(analysis, layerMap);

  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map();
  domainDiscovery.assignments.forEach((assignment, nodeId) => {
    domainMap.set(nodeId, assignment.primaryDomain);
  });
  analysis = applyDomainClassification(analysis, domainMap);

  const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

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

  safeNodes.forEach(node => {
    if (!featureMap.has(node.id)) {
      featureMap.set(node.id, 'Unassigned');
    }
  });

  const featureGraph = buildDomainGraph(safeNodes, safeEdges, undefined, index, featureMap);
  const orderedFeatures = determineGlobalFeatureOrder(
    safeNodes,
    safeEdges,
    featureGraph,
    featureMap,
    'F_2D_BAND_AWARE'
  );

  // Parameterized Stage 5 Global Feature Layout
  const baseX = 100;
  const baseY = 100;

  const domainRegions = new Map<string, DomainRegion>();
  const nodeRegions = new Map<string, { domain: string; xCenter: number; yCenter: number; width: number; height: number }>();

  let totalWidthSum = 0;
  const domainDimensions = new Map<string, { width: number; height: number; primaryLayer: any }>();

  orderedFeatures.forEach(fId => {
    const dNode = featureGraph.nodes.get(fId);
    const primaryLayer = dNode ? dNode.primaryLayer : 'application';

    const primaryNodesInDomain = dNode
      ? dNode.primaryNodeIds
          .map(id => index.nodeById.get(id))
          .filter((n): n is ExplorerNode => n !== undefined)
      : [];

    const layerCounts: Record<string, number> = { presentation: 0, application: 0, domain: 0, schema: 0 };
    primaryNodesInDomain.forEach(node => {
      const l = layerMap.get(node.id) || 'application';
      layerCounts[l] = (layerCounts[l] || 0) + 1;
    });


    const maxCols = Math.max(1, ...LAYERS_IN_ORDER.map(l => (layerCounts[l] > 0 ? Math.min(4, layerCounts[l]) : 0)));
    const maxRows = Math.max(1, ...LAYERS_IN_ORDER.map(l => (layerCounts[l] > 0 ? Math.ceil(layerCounts[l] / 4) : 0)));

    const primaryWidth = maxCols * nodeWidth + Math.max(0, maxCols - 1) * 40;
    const primaryHeight = maxRows * nodeHeight + Math.max(0, maxRows - 1) * 40;

    const minWidth = 280;
    const regionWidth = Math.max(minWidth, primaryWidth + 40);
    const regionHeight = Math.max(100, primaryHeight + 40);

    domainDimensions.set(fId, { width: regionWidth, height: regionHeight, primaryLayer });
    totalWidthSum += regionWidth + 60;
  });

  const domainsByLayer: Record<string, string[]> = { presentation: [], application: [], domain: [], schema: [] };
  orderedFeatures.forEach(fId => {
    const dNode = featureGraph.nodes.get(fId);
    const primaryLayer = dNode ? dNode.primaryLayer : 'application';
    domainsByLayer[primaryLayer].push(fId);
  });

  const targetRowWidth = targetRowWidthOverride !== undefined
    ? targetRowWidthOverride
    : Math.max(1200, Math.min(3200, Math.sqrt(totalWidthSum * 300 * 1.6)));

  let currentY = baseY;

  LAYERS_IN_ORDER.forEach(layer => {
    const layerDomains = domainsByLayer[layer];
    if (layerDomains.length === 0) return;

    if (domainRegions.size > 0 && layerDomains.length > 1) {
      const barycenters = new Map<string, number>();
      layerDomains.forEach((d, origIdx) => {
        let sumX = 0;
        let weightSum = 0;
        const neighbors = featureGraph.adjacency.get(d);
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
      const dNode = featureGraph.nodes.get(domain);

      let domainGap = 80;
      if (idx > 0) {
        const prevDomain = layerDomains[idx - 1];
        const rel = featureGraph.adjacency.get(prevDomain)?.get(domain);
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
        primaryLayer: layer as any,
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

  const featureRegions = new Map<string, FeatureRegion>();
  domainRegions.forEach((region, featureId) => {
    let domainId = featureDiscovery.features.get(featureId)?.domains[0];
    featureRegions.set(featureId, { ...region, featureId, domainId });
  });

  const featureLayerYMap = computeFeatureLayerYMap(safeNodes, safeEdges, featureGraph, {
    analysis,
    index,
    featureMap,
    featureRegions,
  });

  const globalDomainResult = {
    domainGraph: featureGraph,
    domainRegions,
    nodeRegions,
    orderedDomains: orderedFeatures,
    metrics: null,
    layerYMap: LAYER_Y_MAP,
    layerRowCounts: { presentation: 0, application: 0, domain: 0, schema: 0 },
    layerHeights: { presentation: 0, application: 0, domain: 0, schema: 0 },
    featureRegions,
    featureGraph,
    orderedFeatures,
    featureLayerYMap,
  };

  const stage5Positions: PositionMap = {};
  globalDomainResult.nodeRegions.forEach((region, nodeId) => {
    stage5Positions[nodeId] = { x: region.xCenter, y: region.yCenter };
  });

  // Stage 6: Layer Ordering & Crossing Reduction
  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: featureMap,
    domainOrder: globalDomainResult.orderedDomains,
  });

  // Stage 7: Primary Production Local Layout
  const localResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: globalDomainResult.domainRegions,
    layerMap,
    domainMap: featureMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth,
      nodeHeight,
      domainSpacing,
      layerYMap: globalDomainResult.layerYMap,
    },
  });

  const stage7Positions: PositionMap = { ...localResult.primaryNodePositions };

  // Stage 8: Hub & Bridge Spatial Refinement
  const stage8Positions: PositionMap = { ...stage7Positions };
  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};

  globalDomainResult.domainRegions.forEach((region, domain) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  safeNodes.forEach(node => {
    if (isSecondaryNode(node)) return;

    const centrality = centralityMap.get(node.id);
    if (centrality?.isBridge && !centrality.isHub) {
      const neighborPositions: Record<string, { x: number; y: number }> = {};
      const nodeAnalysis = analysis.nodes.get(node.id);

      nodeAnalysis?.neighborIds.forEach(nId => {
        if (stage8Positions[nId]) {
          neighborPositions[nId] = stage8Positions[nId];
        }
      });

      const bridgeInfo = calculateBridgeCandidatePosition(
        node.id,
        layerMap.get(node.id) || 'application',
        centrality.connectedDomains,
        domainXCenters,
        domainBounds,
        neighborPositions,
        { layerSpacing, nodeWidth, nodeHeight, layerYOffsets: globalDomainResult.layerYMap, index, allocatedPositions: stage8Positions }
      );

      stage8Positions[node.id] = bridgeInfo.candidatePosition;
    }
  });

  // Stage 9: Secondary Satellite Placement
  const satelliteResult = placeSatellites(
    safeNodes,
    safeEdges,
    analysis,
    stage8Positions,
    {
      nodeWidth,
      nodeHeight,
      layerSpacing,
      layerYOffsets: globalDomainResult.layerYMap,
      index,
    }
  );

  const stage9Positions: PositionMap = { ...satelliteResult.positions };

  // Stage 10: Disconnected Component Packing
  let stage10Positions: PositionMap = { ...stage9Positions };

  if (analysis.components.length > 1) {
    const componentLayouts: ComponentLocalLayout[] = analysis.components
      .map(comp => {
        const positions: Record<string, { x: number; y: number }> = {};
        let minNodeId: string | undefined = undefined;
        let importance = 0;

        for (const nodeId of comp.nodeIds) {
          const pos = stage9Positions[nodeId];
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
      const tW = Math.max(idealWidth, minRowWidth);

      const packed = packComponentPositions(componentLayouts, {
        gap: componentGap,
        targetWidth: tW,
        targetAspectRatio: 1.6,
        nodeWidth,
        nodeHeight,
      });
      stage10Positions = packed.positions;
    }
  }

  // Stage 11: Final Global Spatial Cleanup Pass
  const finalCleanupResult = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: stage10Positions,
    analysis,
    options: {
      nodeWidth,
      nodeHeight,
      layerMap,
      domainMap: featureMap,
    },
  });

  const stage11Positions: PositionMap = finalCleanupResult.positions;
  const stage11Metrics = calculateLayoutMetrics(safeNodes, safeEdges, stage11Positions, { nodeWidth, nodeHeight });

  return {
    featureRegions,
    effectiveTargetRowWidth: targetRowWidth,
    stage5Positions,
    stage11Positions,
    stage11Metrics,
  };
}

const CANDIDATE_WIDTHS = [
  3200, 3600, 4000, 4500, 5000, 5500, 6000, 7000, 8000, 9000, 10000, 12000, 16000, 20000,
];

describe('Phase 11 — Controlled Aspect-Ratio Optimization Experiment Suite', () => {
  const datasets: Record<string, ProjectDataset> = {
    cst_canonical: loadProject('cst_canonical', 'audit-fixtures/cloud-spend-tracker/explorer-data.json'),
    pub_infra_mang: loadProject('pub-infra-mang', 'explorer/public/projects/pub-infra-mang/explorer-data.json'),
    bqc: loadProject('bqc', 'explorer/public/projects/bqc/explorer-data.json'),
    movie_small: loadProject('movie_small', 'explorer/public/projects/movie/explorer-data.json'),
  };

  test('Execute Baseline and Sweep Experiments across Datasets', () => {
    console.log('\n================================================================================');
    console.log('PHASE 11: CONTROLLED ASPECT-RATIO OPTIMIZATION EXPERIMENT RUNTIME TRACE');
    console.log('================================================================================\n');

    Object.entries(datasets).forEach(([dsKey, ds]) => {
      console.log(`\n================================================================================`);
      console.log(`DATASET: [${dsKey.toUpperCase()}] (${ds.nodes.length} nodes, ${ds.edges.length} edges)`);
      console.log(`================================================================================`);

      // 1. Measure Baseline
      const baselineRes = runPhase11ExperimentPipeline(ds.nodes, ds.edges);

      let s5BaseMinX = Infinity, s5BaseMaxX = -Infinity, s5BaseMinY = Infinity, s5BaseMaxY = -Infinity;
      baselineRes.featureRegions.forEach(r => {
        if (r.xMin < s5BaseMinX) s5BaseMinX = r.xMin;
        if (r.xMax > s5BaseMaxX) s5BaseMaxX = r.xMax;
        if (r.yMin < s5BaseMinY) s5BaseMinY = r.yMin;
        if (r.yMax > s5BaseMaxY) s5BaseMaxY = r.yMax;
      });
      const s5BaseW = s5BaseMaxX - s5BaseMinX;
      const s5BaseH = s5BaseMaxY - s5BaseMinY;

      let s11BaseMinX = Infinity, s11BaseMaxX = -Infinity, s11BaseMinY = Infinity, s11BaseMaxY = -Infinity;
      Object.values(baselineRes.stage11Positions).forEach(pos => {
        if (pos.x < s11BaseMinX) s11BaseMinX = pos.x;
        if (pos.x > s11BaseMaxX) s11BaseMaxX = pos.x;
        if (pos.y < s11BaseMinY) s11BaseMinY = pos.y;
        if (pos.y > s11BaseMaxY) s11BaseMaxY = pos.y;
      });
      const s11BaseW = s11BaseMaxX - s11BaseMinX;
      const s11BaseH = s11BaseMaxY - s11BaseMinY;
      const s11BaseAR = s11BaseW / s11BaseH;

      const mBase = baselineRes.stage11Metrics;
      const cBase = mBase.detailedCrossings;

      console.log(`\n--- PRODUCTION BASELINE (Effective Target Width = ${baselineRes.effectiveTargetRowWidth.toFixed(0)}px) ---`);
      console.log(`Features Count: ${baselineRes.featureRegions.size}`);
      console.log(`Stage 5 Bounds: ${s5BaseW.toFixed(0)}px (W) x ${s5BaseH.toFixed(0)}px (H) | AR: ${(s5BaseW / s5BaseH).toFixed(3)}`);
      console.log(`Final Canvas:   ${s11BaseW.toFixed(0)}px (W) x ${s11BaseH.toFixed(0)}px (H) | AR: ${s11BaseAR.toFixed(3)}`);
      console.log(`Crossings:      Cpp=${cBase?.primaryPrimaryCrossings}, Cpb=${cBase?.primaryBridgeCrossings}, Cbb=${cBase?.bridgeBridgeCrossings}, Cps=${cBase?.primarySatelliteCrossings}, Css=${cBase?.satelliteSatelliteCrossings}, Ctotal=${mBase.edgeCrossingCount}`);

      // 2. Candidate Sweep Table
      console.log(`\n--- CANDIDATE WIDTH SWEEP TABLE ---`);
      console.log(
        `Target W | Stage 5 W x H (AR)     | Final W x H (AR)       | H Δ%    | W Δ%    | Rows | Cpp   | Cpb  | Cbb  | Cps   | Css   | Ctotal | Clearance | Invariants`
      );
      console.log(
        `------------------------------------------------------------------------------------------------------------------------------------------------------------------`
      );

      CANDIDATE_WIDTHS.forEach(targetW => {
        const candRes = runPhase11ExperimentPipeline(ds.nodes, ds.edges, targetW);

        let s5MinX = Infinity, s5MaxX = -Infinity, s5MinY = Infinity, s5MaxY = -Infinity;
        candRes.featureRegions.forEach(r => {
          if (r.xMin < s5MinX) s5MinX = r.xMin;
          if (r.xMax > s5MaxX) s5MaxX = r.xMax;
          if (r.yMin < s5MinY) s5MinY = r.yMin;
          if (r.yMax > s5MaxY) s5MaxY = r.yMax;
        });
        const s5W = s5MaxX - s5MinX;
        const s5H = s5MaxY - s5MinY;
        const s5AR = s5W / s5H;

        let s11MinX = Infinity, s11MaxX = -Infinity, s11MinY = Infinity, s11MaxY = -Infinity;
        Object.values(candRes.stage11Positions).forEach(pos => {
          if (pos.x < s11MinX) s11MinX = pos.x;
          if (pos.x > s11MaxX) s11MaxX = pos.x;
          if (pos.y < s11MinY) s11MinY = pos.y;
          if (pos.y > s11MaxY) s11MaxY = pos.y;
        });
        const s11W = s11MaxX - s11MinX;
        const s11H = s11MaxY - s11MinY;
        const s11AR = s11W / s11H;

        const hDeltaPct = ((s11H - s11BaseH) / s11BaseH) * 100;
        const wDeltaPct = ((s11W - s11BaseW) / s11BaseW) * 100;

        const layerRowsMap = new Map<number, string[]>();
        candRes.featureRegions.forEach(r => {
          if (!layerRowsMap.has(r.yMin)) layerRowsMap.set(r.yMin, []);
          layerRowsMap.get(r.yMin)!.push(r.featureId);
        });
        const totalRows = layerRowsMap.size;

        const m = candRes.stage11Metrics;
        const c = m.detailedCrossings;

        const isInvariantsValid =
          (m.primaryOverlapCount ?? 0) === 0 &&
          (m.satelliteOverlapCount ?? 0) === 0 &&
          (m.layerViolationCount ?? 0) === 0 &&
          (m.minClearance ?? 0) >= 39.99;

        const statusStr = isInvariantsValid ? 'PASS' : `FAIL (P:${m.primaryOverlapCount}/S:${m.satelliteOverlapCount}/V:${m.layerViolationCount})`;

        console.log(
          `${(targetW.toFixed(0) + 'px').padStart(8)} | ` +
          `${s5W.toFixed(0).padStart(5)}x${s5H.toFixed(0).padEnd(5)} (${s5AR.toFixed(2)}) | ` +
          `${s11W.toFixed(0).padStart(5)}x${s11H.toFixed(0).padEnd(5)} (${s11AR.toFixed(2)}) | ` +
          `${(hDeltaPct >= 0 ? '+' : '') + hDeltaPct.toFixed(1) + '%'}`.padStart(7) + ' | ' +
          `${(wDeltaPct >= 0 ? '+' : '') + wDeltaPct.toFixed(1) + '%'}`.padStart(7) + ' | ' +
          `${String(totalRows).padStart(4)} | ` +
          `${String(c?.primaryPrimaryCrossings).padStart(5)} | ` +
          `${String(c?.primaryBridgeCrossings).padStart(4)} | ` +
          `${String(c?.bridgeBridgeCrossings).padStart(4)} | ` +
          `${String(c?.primarySatelliteCrossings).padStart(5)} | ` +
          `${String(c?.satelliteSatelliteCrossings).padStart(5)} | ` +
          `${String(m.edgeCrossingCount).padStart(6)} | ` +
          `${m.minClearance!.toFixed(1).padStart(9)}px | ` +
          `${statusStr}`
        );
      });
    });
  }, 300000);

  test('Detailed Per-Layer Row-Packing Metrics for Key Candidate Widths', () => {
    console.log('\n================================================================================');
    console.log('DETAILED PER-LAYER ROW-PACKING METRICS');
    console.log('================================================================================\n');

    const evalWidths = [3200, 5000, 10000, 20000];

    Object.entries(datasets).forEach(([dsKey, ds]) => {
      console.log(`\nDataset: [${dsKey.toUpperCase()}]`);

      evalWidths.forEach(targetW => {
        const candRes = runPhase11ExperimentPipeline(ds.nodes, ds.edges, targetW);

        const layers: Record<string, string[]> = { presentation: [], application: [], domain: [], schema: [] };
        candRes.featureRegions.forEach((region, fId) => {
          const layer = region.primaryLayer || 'application';
          if (layers[layer]) layers[layer].push(fId);
        });

        console.log(`  Target Width: ${targetW}px`);

        Object.entries(layers).forEach(([layerName, fIds]) => {
          if (fIds.length === 0) return;
          const rowsMap = new Map<number, { fIds: string[]; width: number }>();
          fIds.forEach(fId => {
            const r = candRes.featureRegions.get(fId)!;
            const y = r.yMin;
            if (!rowsMap.has(y)) {
              rowsMap.set(y, { fIds: [], width: 0 });
            }
            const rowInfo = rowsMap.get(y)!;
            rowInfo.fIds.push(fId);
          });

          rowsMap.forEach((rowInfo) => {
            let minX = Infinity, maxX = -Infinity;
            rowInfo.fIds.forEach(fId => {
              const r = candRes.featureRegions.get(fId)!;
              if (r.xMin < minX) minX = r.xMin;
              if (r.xMax > maxX) maxX = r.xMax;
            });
            rowInfo.width = maxX - minX;
          });

          const rowWidths = Array.from(rowsMap.values()).map(r => r.width);
          const totalWaste = rowWidths.reduce((acc, w) => acc + Math.max(0, targetW - w), 0);
          const maxRowW = Math.max(...rowWidths, 0);
          const minRowW = Math.min(...rowWidths, 0);
          const avgRowW = rowWidths.reduce((a, b) => a + b, 0) / (rowWidths.length || 1);

          console.log(
            `    Layer [${layerName.padEnd(12)}] Rows: ${rowWidths.length} | ` +
            `Row Widths: [${rowWidths.map(w => w.toFixed(0) + 'px').join(', ')}] | ` +
            `Min/Avg/Max: ${minRowW.toFixed(0)}/${avgRowW.toFixed(0)}/${maxRowW.toFixed(0)}px | ` +
            `Waste: ${totalWaste.toFixed(0)}px`
          );
        });
      });
    });
  }, 120000);

  test('10x Repeat Determinism & 5x Shuffled Permutation Verification', () => {
    console.log('\n================================================================================');
    console.log('DETERMINISM VERIFICATION (10X REPEAT & 5X SHUFFLED PERMUTATION)');
    console.log('================================================================================\n');

    const ds = datasets.cst_canonical;
    const testWidth = 5000;

    const baseRun = runPhase11ExperimentPipeline(ds.nodes, ds.edges, testWidth);
    const basePositions = baseRun.stage11Positions;

    // 10x Sequential Executions
    for (let run = 0; run < 10; run++) {
      const runResult = runPhase11ExperimentPipeline(ds.nodes, ds.edges, testWidth);
      const runPositions = runResult.stage11Positions;

      Object.keys(basePositions).forEach(nodeId => {
        expect(runPositions[nodeId].x).toBeCloseTo(basePositions[nodeId].x, 5);
        expect(runPositions[nodeId].y).toBeCloseTo(basePositions[nodeId].y, 5);
      });
    }

    // 5x Shuffled Permutations
    for (let perm = 0; perm < 5; perm++) {
      const shuffledNodes = [...ds.nodes].sort(() => (perm % 2 === 0 ? 0.5 - Math.random() : Math.random() - 0.5));
      const shuffledEdges = [...ds.edges].sort(() => (perm % 2 === 0 ? Math.random() - 0.5 : 0.5 - Math.random()));

      const permResult = runPhase11ExperimentPipeline(shuffledNodes, shuffledEdges, testWidth);
      const permPositions = permResult.stage11Positions;

      Object.keys(basePositions).forEach(nodeId => {
        expect(permPositions[nodeId].x).toBeCloseTo(basePositions[nodeId].x, 5);
        expect(permPositions[nodeId].y).toBeCloseTo(basePositions[nodeId].y, 5);
      });
    }

    console.log('Zero Coordinate Drift Verified (0.00000 px across 10 repeat runs and 5 shuffled permutations).');
  }, 120000);
});
