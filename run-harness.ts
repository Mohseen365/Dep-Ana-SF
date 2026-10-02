import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from './explorer/src/types/explorer';
import { computeArchitectureLayoutWithMetadata } from './explorer/src/lib/architecture-layout';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from './explorer/src/lib/layout/centrality';
import { createLayoutGraphIndex } from './explorer/src/lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from './explorer/src/lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from './explorer/src/lib/layout/layers';
import { discoverDomains } from './explorer/src/lib/layout/domains';
import { computeGlobalDomainLayout } from './explorer/src/lib/layout/global-layout';
import { reduceEdgeCrossings } from './explorer/src/lib/layout/ordering';
import { computeLocalNodeLayout } from './explorer/src/lib/layout/local-layout';
import { placeSatellites } from './explorer/src/lib/layout/satellites';
import { resolveSpacingAndCollisions } from './explorer/src/lib/layout/spacing';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from './explorer/src/lib/layout/components';
import { calculateLayoutMetrics } from './explorer/src/lib/layout/metrics';

interface Dataset {
  key: string;
  file: string;
}

const DATASETS: Dataset[] = [
  { key: 'cst', file: 'explorer/public/projects/cst/explorer-data.json' },
  { key: 'bqc', file: 'explorer/public/projects/bqc/explorer-data.json' },
  { key: 'pbim', file: 'explorer/public/projects/pbim/explorer-data.json' },
];

function loadDataset(dataset: Dataset): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const fullPath = path.resolve(process.cwd(), dataset.file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

function calcPercentiles(arr: number[]) {
  if (arr.length === 0) {
    return { min: 0, p25: 0, median: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0, mean: 0 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;

  const getPercentile = (p: number) => {
    if (sorted.length === 1) return sorted[0];
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  return {
    min: sorted[0],
    p25: getPercentile(25),
    median: getPercentile(50),
    p75: getPercentile(75),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
    max: sorted[sorted.length - 1],
    mean,
  };
}

function getWidth(posMap: Record<string, { x: number; y: number }>) {
  let minX = Infinity;
  let maxX = -Infinity;
  Object.values(posMap).forEach(pos => {
    if (pos.x < minX) minX = pos.x;
    if (pos.x + 120 > maxX) maxX = pos.x + 120;
  });
  return maxX - minX;
}

export function runFullPipelineHarness(extraOptions: any = {}) {
  const results: Record<string, any> = {};

  for (const ds of DATASETS) {
    const { nodes, edges } = loadDataset(ds);

    const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

    const index = createLayoutGraphIndex(safeNodes, safeEdges);
    let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
    const layerMap = new Map<string, any>();
    safeNodes.forEach(node => {
      layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
    });
    analysis = applyLayerClassification(analysis, layerMap);

    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) => {
      domainMap.set(nodeId, assignment.primaryDomain);
    });
    analysis = applyDomainClassification(analysis, domainMap);

    const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

    const bridgeNodes: ExplorerNode[] = [];
    safeNodes.forEach(n => {
      const c = centralityMap.get(n.id);
      if (c?.isBridge && !c.isHub) {
        bridgeNodes.push(n);
      }
    });

    const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
      domainSpacing: 380,
      layerSpacing: 250,
      nodeWidth: 120,
      nodeHeight: 60,
      analysis,
      domainDiscovery,
      layerMap,
      domainMap,
      index,
    });

    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    globalDomainResult.domainRegions.forEach((region, domain) => {
      domainXCenters[domain] = region.xCenter;
      domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
    });

    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes,
      edges: safeEdges,
      layerMap,
      domainMap,
      domainOrder: globalDomainResult.orderedDomains,
      layerYMap: globalDomainResult.layerYMap,
    });

    const localResult = computeLocalNodeLayout({
      nodes: safeNodes,
      edges: safeEdges,
      analysis,
      domainRegions: globalDomainResult.domainRegions,
      layerMap,
      domainMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        domainSpacing: 380,
        layerYMap: globalDomainResult.layerYMap,
      },
    });

    const stage7Positions: Record<string, { x: number; y: number }> = {
      ...localResult.primaryNodePositions,
    };

    const stage8Positions: Record<string, { x: number; y: number }> = {
      ...stage7Positions,
    };

    let bridgePrimaryOverlaps = 0;
    let bridgeBridgeOverlaps = 0;
    let exhaustionCount = 0;
    let candidateRejections = 0;
    let totalExpansionSteps = 0;

    const minDx = 160;
    const minDy = 100;

    // Run Stage 8 bridge allocation
    const immutableStage7 = extraOptions.useDualOccupancy
      ? Object.freeze({ ...localResult.primaryNodePositions })
      : undefined;

    safeNodes.forEach(node => {
      if (isTestNode(node) || isFieldNode(node)) return;
      const centrality = centralityMap.get(node.id);
      if (centrality?.isBridge && !centrality.isHub) {
        const neighborPositions: Record<string, { x: number; y: number }> = {};
        const nodeAnalysis = analysis.nodes.get(node.id);
        nodeAnalysis?.neighborIds.forEach(nId => {
          if (stage8Positions[nId]) {
            neighborPositions[nId] = stage8Positions[nId];
          }
        });

        const options: any = {
          layerSpacing: 250,
          nodeWidth: 120,
          nodeHeight: 60,
          layerYOffsets: globalDomainResult.layerYMap,
          index,
          allocatedPositions: stage8Positions,
          ...extraOptions,
        };

        if (extraOptions.useDualOccupancy) {
          options.immutablePrimaryPositions = immutableStage7;
        }

        const bridgeInfo = calculateBridgeCandidatePosition(
          node.id,
          layerMap.get(node.id) || 'application',
          centrality.connectedDomains,
          domainXCenters,
          domainBounds,
          neighborPositions,
          options
        );

        if (bridgeInfo.isExhausted) {
          exhaustionCount++;
        }
        if (bridgeInfo.exhaustionTelemetry) {
          totalExpansionSteps += bridgeInfo.exhaustionTelemetry.expansionSteps;
        }

        stage8Positions[node.id] = bridgeInfo.candidatePosition;
      }
    });

    // Check Stage 8 Overlaps
    const primaryNodeIds = Object.keys(stage7Positions);
    const bridgeNodeIds = bridgeNodes.map(n => n.id);

    // Bridge-Primary Overlaps
    for (const bId of bridgeNodeIds) {
      const bPos = stage8Positions[bId];
      if (!bPos) continue;
      for (const pId of primaryNodeIds) {
        if (pId === bId) continue;
        const pPos = stage7Positions[pId];
        if (!pPos) continue;
        if (Math.abs(pPos.x - bPos.x) < minDx - 1e-3 && Math.abs(pPos.y - bPos.y) < minDy - 1e-3) {
          bridgePrimaryOverlaps++;
        }
      }
    }

    // Bridge-Bridge Overlaps
    for (let i = 0; i < bridgeNodeIds.length; i++) {
      for (let j = i + 1; j < bridgeNodeIds.length; j++) {
        const b1 = stage8Positions[bridgeNodeIds[i]];
        const b2 = stage8Positions[bridgeNodeIds[j]];
        if (!b1 || !b2) continue;
        if (Math.abs(b1.x - b2.x) < minDx - 1e-3 && Math.abs(b1.y - b2.y) < minDy - 1e-3) {
          bridgeBridgeOverlaps++;
        }
      }
    }

    // Downstream stages
    const stage9Result = placeSatellites(safeNodes, safeEdges, analysis, stage8Positions, {
      nodeWidth: 120,
      nodeHeight: 60,
      layerSpacing: 250,
      layerYOffsets: globalDomainResult.layerYMap,
      index,
    });
    const stage9Positions = stage9Result.positions;

    let stage10Positions: Record<string, { x: number; y: number }> = { ...stage9Positions };
    if (analysis.components.length > 1) {
      const componentLayouts: ComponentLocalLayout[] = analysis.components
        .map(comp => {
          const posMap: Record<string, { x: number; y: number }> = {};
          let minNodeId: string | undefined = undefined;
          let importance = 0;
          for (const nodeId of comp.nodeIds) {
            const pos = stage9Positions[nodeId];
            if (pos) {
              posMap[nodeId] = pos;
              if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) minNodeId = nodeId;
              const c = centralityMap.get(nodeId);
              if (c) importance += c.hubScore + c.bridgeScore;
            }
          }
          return {
            id: comp.componentId,
            positions: posMap,
            nodeWidth: 120,
            nodeHeight: 60,
            structuralImportance: importance,
            minNodeId,
          };
        })
        .filter(c => Object.keys(c.positions).length > 0);

      if (componentLayouts.length > 1) {
        const compWidths = componentLayouts.map(c => {
          const bounds = calculateLocalComponentBounds(c.positions, 120, 60);
          return bounds.width;
        }).sort((a, b) => b - a);
        const maxW = compWidths[0] || 120;
        const secondMaxW = compWidths[1] || 120;
        const minRowWidth = maxW + secondMaxW + 100;
        let totalCompArea = 0;
        componentLayouts.forEach(c => {
          const bounds = calculateLocalComponentBounds(c.positions, 120, 60);
          totalCompArea += (bounds.width + 100) * (bounds.height + 100);
        });
        const targetWidth = Math.max(Math.sqrt(totalCompArea * 1.6), minRowWidth);
        const packed = packComponentPositions(componentLayouts, {
          gap: 100,
          targetWidth,
          targetAspectRatio: 1.6,
          nodeWidth: 120,
          nodeHeight: 60,
        });
        stage10Positions = packed.positions;
      }
    }

    const stage11Result = resolveSpacingAndCollisions({
      nodes: safeNodes,
      edges: safeEdges,
      positions: stage10Positions,
      analysis,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        layerMap,
        domainMap,
      },
    });
    const stage11Positions = stage11Result.positions;
    const finalPositions = stage11Positions;

    // Calculate semantic neighbor distances
    const computeSemanticDistances = (posMap: Record<string, { x: number; y: number }>) => {
      const medianDists: number[] = [];
      const p95Dists: number[] = [];
      const maxDists: number[] = [];

      bridgeNodes.forEach(bNode => {
        const bPos = posMap[bNode.id];
        if (!bPos) return;
        const nIds = analysis.nodes.get(bNode.id)?.neighborIds || [];
        const dists: number[] = [];
        nIds.forEach(nId => {
          const nPos = posMap[nId];
          if (!nPos) return;
          const dx = Math.abs(bPos.x - nPos.x);
          const dy = Math.abs(bPos.y - nPos.y);
          dists.push(Math.sqrt(dx * dx + dy * dy));
        });
        if (dists.length > 0) {
          const p = calcPercentiles(dists);
          medianDists.push(p.median);
          p95Dists.push(p.p95);
          maxDists.push(p.max);
        }
      });

      return {
        median: calcPercentiles(medianDists).median,
        p95: calcPercentiles(p95Dists).p95,
        max: calcPercentiles(maxDists).max,
      };
    };

    const stage8Semantic = computeSemanticDistances(stage8Positions);
    const finalSemantic = computeSemanticDistances(finalPositions);

    // Corridor Locality (Stage 8)
    const corridorMidpointDists: number[] = [];
    bridgeNodes.forEach(bNode => {
      const bPos = stage8Positions[bNode.id];
      if (!bPos) return;
      const centrality = centralityMap.get(bNode.id);
      const connDomains = [...(centrality?.connectedDomains || [])].sort((a, b) => a.localeCompare(b));
      let sumX = 0;
      let dCount = 0;
      connDomains.forEach(d => {
        if (domainXCenters[d] !== undefined) {
          sumX += domainXCenters[d];
          dCount++;
        }
      });
      if (dCount > 0) {
        const midX = sumX / dCount;
        corridorMidpointDists.push(Math.abs(bPos.x - midX));
      }
    });
    const corridorLocalityMedian = calcPercentiles(corridorMidpointDists).median;

    // Displacements
    const s7_s8: number[] = [];
    const s8_s11: number[] = [];
    const s7_final: number[] = [];

    bridgeNodes.forEach(bNode => {
      const p7 = stage7Positions[bNode.id];
      const p8 = stage8Positions[bNode.id];
      const p11 = stage11Positions[bNode.id];
      if (p7 && p8) s7_s8.push(Math.hypot(p8.x - p7.x, p8.y - p7.y));
      if (p8 && p11) s8_s11.push(Math.hypot(p11.x - p8.x, p11.y - p8.y));
      if (p7 && p11) s7_final.push(Math.hypot(p11.x - p7.x, p11.y - p7.y));
    });

    results[ds.key.toUpperCase()] = {
      dataset: ds.key.toUpperCase(),
      bridgeCount: bridgeNodes.length,
      structural: {
        bridgePrimaryOverlaps,
        bridgeBridgeOverlaps,
        exhaustionCount,
        totalExpansionSteps,
      },
      stage8CanvasWidth: getWidth(stage8Positions),
      finalCanvasWidth: getWidth(finalPositions),
      stage8Semantic,
      finalSemantic,
      corridorLocalityMedian,
      displacements: {
        s7_s8: calcPercentiles(s7_s8),
        s8_s11: calcPercentiles(s8_s11),
        s7_final: calcPercentiles(s7_final),
      },
      stage8Positions,
      finalPositions,
    };
  }

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('run-harness.ts')) {
  console.log('Running Baseline Harness...');
  const baseline = runFullPipelineHarness();
  console.log(JSON.stringify(baseline, null, 2));
}
