import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { computeGraphCentralityAnalysis } from '../lib/layout/centrality';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeGlobalDomainLayout } from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import type { ArchitectureLayer } from '../lib/layout/types';

interface DatasetSpec {
  key: string;
  file: string;
}

const DATASETS: DatasetSpec[] = [
  { key: 'cst', file: 'public/projects/cst/explorer-data.json' },
  { key: 'bqc', file: 'public/projects/bqc/explorer-data.json' },
  { key: 'pbim', file: 'public/projects/pbim/explorer-data.json' },
];

function loadDataset(ds: DatasetSpec): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const p1 = path.resolve(process.cwd(), ds.file);
  const p2 = path.resolve(__dirname, '../../', ds.file);
  const fullPath = fs.existsSync(p1) ? p1 : p2;
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

export interface DistributionStats {
  count: number;
  mean: number;
  median: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

function computeFullDistributionStats(arr: number[]): DistributionStats {
  if (arr.length === 0) {
    return { count: 0, mean: 0, median: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const count = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / count;

  const getQuantile = (q: number) => {
    const idx = Math.min(count - 1, Math.floor(count * q));
    return sorted[idx];
  };

  const mid = Math.floor(count * 0.5);
  const median = count % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    count,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    p50: Number(median.toFixed(2)),
    p75: Number(getQuantile(0.75).toFixed(2)),
    p90: Number(getQuantile(0.90).toFixed(2)),
    p95: Number(getQuantile(0.95).toFixed(2)),
    p99: Number(getQuantile(0.99).toFixed(2)),
    max: Number(sorted[count - 1].toFixed(2)),
  };
}

function calculateBridgeDistancesM1(
  bridgeIds: string[],
  positions: Record<string, { x: number; y: number }>,
  neighborMap: Map<string, string[]>
): Map<string, number> {
  const result = new Map<string, number>();
  for (const bId of bridgeIds) {
    const pos = positions[bId];
    if (!pos) continue;
    const neighbors = neighborMap.get(bId) || [];
    const nDists: number[] = [];
    for (const nId of neighbors) {
      const nPos = positions[nId];
      if (nPos) {
        const dx = pos.x - nPos.x;
        const dy = pos.y - nPos.y;
        nDists.push(Math.sqrt(dx * dx + dy * dy));
      }
    }
    if (nDists.length > 0) {
      const meanDist = nDists.reduce((a, b) => a + b, 0) / nDists.length;
      result.set(bId, meanDist);
    } else {
      result.set(bId, 0);
    }
  }
  return result;
}

function calculateBridgeDistancesM2(
  bridgeIds: string[],
  positions: Record<string, { x: number; y: number }>,
  neighborMap: Map<string, string[]>
): Map<string, number> {
  const result = new Map<string, number>();
  for (const bId of bridgeIds) {
    const pos = positions[bId];
    if (!pos) continue;
    const neighbors = neighborMap.get(bId) || [];
    const nDists: number[] = [];
    for (const nId of neighbors) {
      const nPos = positions[nId];
      if (nPos) {
        const dx = pos.x - nPos.x;
        const dy = pos.y - nPos.y;
        nDists.push(Math.sqrt(dx * dx + dy * dy));
      }
    }
    if (nDists.length > 0) {
      result.set(bId, Math.max(...nDists));
    } else {
      result.set(bId, 0);
    }
  }
  return result;
}

function calculateWidth(posMap: Record<string, { x: number; y: number }>): number {
  let minX = Infinity;
  let maxX = -Infinity;
  Object.values(posMap).forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x + 120 > maxX) maxX = p.x + 120;
  });
  return maxX - minX;
}

interface Stage8RunDetails {
  positions: Record<string, { x: number; y: number }>;
  primaryRejectionsMap: Map<string, number>;
  dynamicRejectionsMap: Map<string, number>;
  processingOrder: string[];
  candidateX0Map: Map<string, number>;
}

function runStage8Detailed(
  safeNodes: ExplorerNode[],
  _safeEdges: ExplorerEdge[],
  centralityMap: Map<string, any>,
  analysis: any,
  layerMap: Map<string, ArchitectureLayer>,
  _domainMap: Map<string, string>,
  globalDomainResult: any,
  stage7PrimaryPositions: Record<string, { x: number; y: number }>,
  enableCandidateD: boolean
): Stage8RunDetails {
  const basePositions: Record<string, { x: number; y: number }> = {
    ...stage7PrimaryPositions,
  };

  const primaryRejectionsMap = new Map<string, number>();
  const dynamicRejectionsMap = new Map<string, number>();
  const candidateX0Map = new Map<string, number>();

  const stage8BridgeNodes = safeNodes.filter(node => {
    if (isTestNode(node) || isFieldNode(node)) return false;
    const centrality = centralityMap.get(node.id);
    return centrality?.isBridge && !centrality.isHub;
  });

  if (enableCandidateD) {
    const layerOrderMap: Record<ArchitectureLayer, number> = {
      presentation: 0,
      application: 1,
      domain: 2,
      schema: 3,
    };
    stage8BridgeNodes.sort((a, b) => {
      const cA = centralityMap.get(a.id);
      const cB = centralityMap.get(b.id);
      const spanA = cA?.connectedDomains.length || 0;
      const spanB = cB?.connectedDomains.length || 0;
      if (spanA !== spanB) return spanA - spanB;
      const nA = analysis.nodes.get(a.id)?.neighborIds.length || 0;
      const nB = analysis.nodes.get(b.id)?.neighborIds.length || 0;
      if (nB !== nA) return nB - nA;
      const lA = layerOrderMap[layerMap.get(a.id) || 'application'];
      const lB = layerOrderMap[layerMap.get(b.id) || 'application'];
      if (lA !== lB) return lA - lB;
      return a.id.localeCompare(b.id);
    });
  }

  const processingOrder = stage8BridgeNodes.map(n => n.id);

  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};
  globalDomainResult.domainRegions.forEach((region: any, domain: string) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  stage8BridgeNodes.forEach(node => {
    const centrality = centralityMap.get(node.id)!;
    const nodeAnalysis = analysis.nodes.get(node.id);

    const layer = layerMap.get(node.id) || 'application';
    const minDx = 160;
    const minDy = 100;
    const layerYOffsets = globalDomainResult.layerYMap;
    const baseY = layerYOffsets[layer];

    const sortedConnectedDomains = [...centrality.connectedDomains].sort((a, b) => a.localeCompare(b));
    let sumX = 0;
    let dCount = 0;
    for (const d of sortedConnectedDomains) {
      if (domainXCenters[d] !== undefined) {
        sumX += domainXCenters[d];
        dCount++;
      }
    }

    let neighborSumX = 0;
    let neighborCount = 0;
    for (const nId of nodeAnalysis?.neighborIds || []) {
      if (basePositions[nId]) {
        neighborSumX += basePositions[nId].x;
        neighborCount++;
      }
    }

    let semanticX = neighborCount > 0 ? neighborSumX / neighborCount : (dCount > 0 ? sumX / dCount : 0);

    let minConnectedX = Infinity;
    let maxConnectedX = -Infinity;
    for (const d of sortedConnectedDomains) {
      const bounds = domainBounds[d];
      if (bounds) {
        if (bounds.minX < minConnectedX) minConnectedX = bounds.minX;
        if (bounds.maxX > maxConnectedX) maxConnectedX = bounds.maxX;
      }
    }
    if (!Number.isFinite(minConnectedX)) {
      minConnectedX = semanticX;
      maxConnectedX = semanticX;
    }

    const initialMinX = minConnectedX - minDx;
    const initialMaxX = maxConnectedX + minDx;
    const X0 = Math.max(initialMinX, Math.min(initialMaxX, semanticX));
    candidateX0Map.set(node.id, X0);

    let hasIntermediateTrap = false;
    for (const domainId of Object.keys(domainBounds)) {
      if (sortedConnectedDomains.includes(domainId) || domainId === 'Shared') continue;
      const bounds = domainBounds[domainId];
      if (bounds && semanticX >= bounds.minX - 60 && semanticX <= bounds.maxX + 60) {
        hasIntermediateTrap = true;
        break;
      }
    }

    const legalYLanes = (hasIntermediateTrap || sortedConnectedDomains.length >= 2)
      ? [baseY - minDy, baseY + minDy, baseY]
      : [baseY, baseY - minDy, baseY + minDy];

    let accepted: { x: number; y: number } | null = null;
    const evaluatedXSet = new Set<number>();
    let primaryRejects = 0;
    let dynamicRejects = 0;

    for (let k = 0; k <= 50; k++) {
      const currentMinX = initialMinX - k * minDx;
      const currentMaxX = initialMaxX + k * minDx;

      const xSteps: number[] = [];
      let stepIndex = 0;
      while (true) {
        let addedAny = false;
        if (stepIndex === 0) {
          if (X0 >= currentMinX - 1e-2 && X0 <= currentMaxX + 1e-2) {
            xSteps.push(X0);
            addedAny = true;
          }
        } else {
          const rightX = X0 + stepIndex * minDx;
          const leftX = X0 - stepIndex * minDx;
          if (rightX <= currentMaxX + 1e-2 && rightX >= currentMinX - 1e-2) {
            xSteps.push(rightX);
            addedAny = true;
          }
          if (leftX >= currentMinX - 1e-2 && leftX <= currentMaxX + 1e-2) {
            xSteps.push(leftX);
            addedAny = true;
          }
        }
        if (!addedAny && (X0 + stepIndex * minDx > currentMaxX + 1e-2) && (X0 - stepIndex * minDx < currentMinX - 1e-2)) {
          break;
        }
        stepIndex++;
      }

      for (const testX of xSteps) {
        const xKey = Math.round(testX * 100) / 100;
        if (evaluatedXSet.has(xKey)) continue;
        evaluatedXSet.add(xKey);

        for (const testY of legalYLanes) {
          let dynamicCollide = false;
          for (const [otherId, otherPos] of Object.entries(basePositions)) {
            if (otherId === node.id) continue;
            if (Math.abs(otherPos.x - testX) < minDx - 1e-3 && Math.abs(otherPos.y - testY) < minDy - 1e-3) {
              dynamicCollide = true;
              dynamicRejects++;
              break;
            }
          }

          let primaryCollide = false;
          if (!dynamicCollide) {
            for (const [otherId, otherPos] of Object.entries(stage7PrimaryPositions)) {
              if (otherId === node.id) continue;
              if (Math.abs(otherPos.x - testX) < minDx - 1e-3 && Math.abs(otherPos.y - testY) < minDy - 1e-3) {
                primaryCollide = true;
                primaryRejects++;
                break;
              }
            }
          }

          if (!dynamicCollide && !primaryCollide) {
            accepted = {
              x: Math.round(testX * 100) / 100,
              y: Math.round(testY * 100) / 100,
            };
            break;
          }
        }
        if (accepted) break;
      }
      if (accepted) break;
    }

    if (!accepted) {
      accepted = { x: Math.round(X0 * 100) / 100, y: Math.round(baseY * 100) / 100 };
    }

    primaryRejectionsMap.set(node.id, primaryRejects);
    dynamicRejectionsMap.set(node.id, dynamicRejects);
    basePositions[node.id] = accepted;
  });

  return {
    positions: basePositions,
    primaryRejectionsMap,
    dynamicRejectionsMap,
    processingOrder,
    candidateX0Map,
  };
}

describe('Phase 5N Dump Forensics JSON Suite', () => {
  test('Compute and save all Phase 5N forensic evidence JSON', () => {
    const reportData: any = {};

    for (const ds of DATASETS) {
      const { nodes, edges } = loadDataset(ds);

      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map<string, ArchitectureLayer>();
      safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
      analysis = applyLayerClassification(analysis, layerMap);
      const domainDiscovery = discoverDomains(safeNodes, safeEdges);
      const domainMap = new Map<string, string>();
      domainDiscovery.assignments.forEach((a, nodeId) => domainMap.set(nodeId, a.primaryDomain));
      analysis = applyDomainClassification(analysis, domainMap);
      const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

      const neighborMap = new Map<string, string[]>();
      safeNodes.forEach(n => neighborMap.set(n.id, analysis.nodes.get(n.id)?.neighborIds || []));

      const primaryNodes = safeNodes.filter(n => !isTestNode(n) && !isFieldNode(n) && (!centralityMap.get(n.id)?.isBridge || centralityMap.get(n.id)?.isHub));
      const bridgeNodes = safeNodes.filter(n => !isTestNode(n) && !isFieldNode(n) && centralityMap.get(n.id)?.isBridge && !centralityMap.get(n.id)?.isHub);
      const bridgeIds = bridgeNodes.map(b => b.id);

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

      const stage7PrimaryPositions = Object.freeze({
        ...localResult.primaryNodePositions,
      });

      const stage8H5A = runStage8Detailed(safeNodes, safeEdges, centralityMap, analysis, layerMap, domainMap, globalDomainResult, stage7PrimaryPositions, false);
      const stage8CandD = runStage8Detailed(safeNodes, safeEdges, centralityMap, analysis, layerMap, domainMap, globalDomainResult, stage7PrimaryPositions, true);

      const sb1cFull = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, { enableImmutablePrimaryPositions: false, enableCandidateDOrdering: false });
      const h5aFull = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: false });
      const candDFull = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: true });

      const h5aStage8M1Map = calculateBridgeDistancesM1(bridgeIds, stage8H5A.positions, neighborMap);
      const candDStage8M1Map = calculateBridgeDistancesM1(bridgeIds, stage8CandD.positions, neighborMap);

      const sb1cFinalM1Map = calculateBridgeDistancesM1(bridgeIds, sb1cFull.positions, neighborMap);
      const h5aFinalM1Map = calculateBridgeDistancesM1(bridgeIds, h5aFull.positions, neighborMap);
      const candDFinalM1Map = calculateBridgeDistancesM1(bridgeIds, candDFull.positions, neighborMap);

      const h5aStage8M2Map = calculateBridgeDistancesM2(bridgeIds, stage8H5A.positions, neighborMap);
      const candDStage8M2Map = calculateBridgeDistancesM2(bridgeIds, stage8CandD.positions, neighborMap);

      const sb1cFinalM2Map = calculateBridgeDistancesM2(bridgeIds, sb1cFull.positions, neighborMap);
      const h5aFinalM2Map = calculateBridgeDistancesM2(bridgeIds, h5aFull.positions, neighborMap);
      const candDFinalM2Map = calculateBridgeDistancesM2(bridgeIds, candDFull.positions, neighborMap);

      // Domain Span Counts
      const spanCounts: Record<number, number> = {};
      bridgeIds.forEach(id => {
        const s = centralityMap.get(id)?.connectedDomains.length || 0;
        spanCounts[s] = (spanCounts[s] || 0) + 1;
      });

      reportData[ds.key] = {
        bridgeCount: bridgeIds.length,
        primaryCount: primaryNodes.length,
        spanCounts,
        stage8M1: {
          h5a: computeFullDistributionStats(Array.from(h5aStage8M1Map.values())),
          candD: computeFullDistributionStats(Array.from(candDStage8M1Map.values())),
        },
        finalM1: {
          sb1c: computeFullDistributionStats(Array.from(sb1cFinalM1Map.values())),
          h5a: computeFullDistributionStats(Array.from(h5aFinalM1Map.values())),
          candD: computeFullDistributionStats(Array.from(candDFinalM1Map.values())),
        },
        stage8M2: {
          h5a: computeFullDistributionStats(Array.from(h5aStage8M2Map.values())),
          candD: computeFullDistributionStats(Array.from(candDStage8M2Map.values())),
        },
        finalM2: {
          sb1c: computeFullDistributionStats(Array.from(sb1cFinalM2Map.values())),
          h5a: computeFullDistributionStats(Array.from(h5aFinalM2Map.values())),
          candD: computeFullDistributionStats(Array.from(candDFinalM2Map.values())),
        },
        widths: {
          stage8H5A: calculateWidth(stage8H5A.positions),
          stage8CandD: calculateWidth(stage8CandD.positions),
          finalSB1C: calculateWidth(sb1cFull.positions),
          finalH5A: calculateWidth(h5aFull.positions),
          finalCandD: calculateWidth(candDFull.positions),
        },
      };
    }

    const outPath = path.resolve(process.cwd(), 'audit-reports/phase5n-forensic-data.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(reportData, null, 2), 'utf8');

    expect(fs.existsSync(outPath)).toBe(true);
  });
});
