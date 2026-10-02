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

function computeStats(arr: number[]): DistributionStats {
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

function calculatePairLevelDistances(
  bridgeIds: string[],
  positions: Record<string, { x: number; y: number }>,
  neighborMap: Map<string, string[]>
): number[] {
  const allPairDists: number[] = [];
  for (const bId of bridgeIds) {
    const pos = positions[bId];
    if (!pos) continue;
    const neighbors = neighborMap.get(bId) || [];
    for (const nId of neighbors) {
      const nPos = positions[nId];
      if (nPos) {
        const dx = pos.x - nPos.x;
        const dy = pos.y - nPos.y;
        allPairDists.push(Math.sqrt(dx * dx + dy * dy));
      }
    }
  }
  return allPairDists;
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
  safeEdges: ExplorerEdge[],
  centralityMap: Map<string, any>,
  analysis: any,
  layerMap: Map<string, ArchitectureLayer>,
  domainMap: Map<string, string>,
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

// Counterfactual Runners
function runCounterfactualA(
  safeNodes: ExplorerNode[],
  safeEdges: ExplorerEdge[],
  centralityMap: Map<string, any>,
  analysis: any,
  layerMap: Map<string, ArchitectureLayer>,
  domainMap: Map<string, string>,
  globalDomainResult: any,
  stage7PrimaryPositions: Record<string, { x: number; y: number }>,
  candDStage8Positions: Record<string, { x: number; y: number }>
): Record<string, { x: number; y: number }> {
  // Counterfactual A: Processing order = H5A (alphabetical), BUT predecessor dynamic allocations are pre-populated with Candidate D accepted positions!
  const basePositions: Record<string, { x: number; y: number }> = {
    ...stage7PrimaryPositions,
    ...candDStage8Positions, // Inject CandD predecessor allocations
  };

  const h5aBridgeNodes = safeNodes.filter(node => {
    if (isTestNode(node) || isFieldNode(node)) return false;
    const centrality = centralityMap.get(node.id);
    return centrality?.isBridge && !centrality.isHub;
  }).sort((a, b) => a.id.localeCompare(b.id));

  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};
  globalDomainResult.domainRegions.forEach((region: any, domain: string) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  h5aBridgeNodes.forEach(node => {
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
              break;
            }
          }

          let primaryCollide = false;
          if (!dynamicCollide) {
            for (const [otherId, otherPos] of Object.entries(stage7PrimaryPositions)) {
              if (otherId === node.id) continue;
              if (Math.abs(otherPos.x - testX) < minDx - 1e-3 && Math.abs(otherPos.y - testY) < minDy - 1e-3) {
                primaryCollide = true;
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

    basePositions[node.id] = accepted;
  });

  return basePositions;
}

function runCounterfactualB(
  safeNodes: ExplorerNode[],
  safeEdges: ExplorerEdge[],
  centralityMap: Map<string, any>,
  analysis: any,
  layerMap: Map<string, ArchitectureLayer>,
  domainMap: Map<string, string>,
  globalDomainResult: any,
  stage7PrimaryPositions: Record<string, { x: number; y: number }>,
  h5aStage8Positions: Record<string, { x: number; y: number }>
): Record<string, { x: number; y: number }> {
  // Counterfactual B: Processing order = Candidate D (Asc1), BUT predecessor dynamic allocations are pre-populated with H5A accepted positions!
  const basePositions: Record<string, { x: number; y: number }> = {
    ...stage7PrimaryPositions,
    ...h5aStage8Positions, // Inject H5A predecessor allocations
  };

  const candDBridgeNodes = safeNodes.filter(node => {
    if (isTestNode(node) || isFieldNode(node)) return false;
    const centrality = centralityMap.get(node.id);
    return centrality?.isBridge && !centrality.isHub;
  });

  const layerOrderMap: Record<ArchitectureLayer, number> = {
    presentation: 0,
    application: 1,
    domain: 2,
    schema: 3,
  };
  candDBridgeNodes.sort((a, b) => {
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

  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};
  globalDomainResult.domainRegions.forEach((region: any, domain: string) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  candDBridgeNodes.forEach(node => {
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
              break;
            }
          }

          let primaryCollide = false;
          if (!dynamicCollide) {
            for (const [otherId, otherPos] of Object.entries(stage7PrimaryPositions)) {
              if (otherId === node.id) continue;
              if (Math.abs(otherPos.x - testX) < minDx - 1e-3 && Math.abs(otherPos.y - testY) < minDy - 1e-3) {
                primaryCollide = true;
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

    basePositions[node.id] = accepted;
  });

  return basePositions;
}

describe('Phase 5O Forensic Audit Suite', () => {
  test('Rebuild Canonical Bridge Universe and Audit All Metrics', { timeout: 180000 }, () => {
    const reportData: any = {
      timestamp: new Date().toISOString(),
      datasets: {},
    };

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

      const primaryIds = primaryNodes.map(p => p.id);
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

      // Run Counterfactuals
      const counterfactualA_Stage8 = runCounterfactualA(safeNodes, safeEdges, centralityMap, analysis, layerMap, domainMap, globalDomainResult, stage7PrimaryPositions, stage8CandD.positions);
      const counterfactualB_Stage8 = runCounterfactualB(safeNodes, safeEdges, centralityMap, analysis, layerMap, domainMap, globalDomainResult, stage7PrimaryPositions, stage8H5A.positions);

      // Reconstruct Canonical Bridge Universe Table
      const bridgeUniverse: any[] = [];
      for (const bId of bridgeIds) {
        const bNode = safeNodes.find(n => n.id === bId)!;
        const cMeta = centralityMap.get(bId)!;
        const nIds = analysis.nodes.get(bId)?.neighborIds || [];
        const layer = layerMap.get(bId) || 'application';

        const indexH5A = stage8H5A.processingOrder.indexOf(bId);
        const indexCandD = stage8CandD.processingOrder.indexOf(bId);

        // Stage 7 initial coordinate (estimated from initial semantic X0)
        const candidateX0_H5A = stage8H5A.candidateX0Map.get(bId) || 0;
        const candidateX0_CandD = stage8CandD.candidateX0Map.get(bId) || 0;

        const posStage8_SB1C = sb1cFull.positions[bId] || { x: 0, y: 0 }; // Approximate or full
        const posStage8_H5A = stage8H5A.positions[bId] || { x: 0, y: 0 };
        const posStage8_CandD = stage8CandD.positions[bId] || { x: 0, y: 0 };

        const posFinal_SB1C = sb1cFull.positions[bId] || { x: 0, y: 0 };
        const posFinal_H5A = h5aFull.positions[bId] || { x: 0, y: 0 };
        const posFinal_CandD = candDFull.positions[bId] || { x: 0, y: 0 };

        const posCounterfactualA = counterfactualA_Stage8[bId] || { x: 0, y: 0 };
        const posCounterfactualB = counterfactualB_Stage8[bId] || { x: 0, y: 0 };

        // M1 values
        const h5aStage8M1 = calculateBridgeDistancesM1([bId], stage8H5A.positions, neighborMap).get(bId) || 0;
        const candDStage8M1 = calculateBridgeDistancesM1([bId], stage8CandD.positions, neighborMap).get(bId) || 0;

        const sb1cFinalM1 = calculateBridgeDistancesM1([bId], sb1cFull.positions, neighborMap).get(bId) || 0;
        const h5aFinalM1 = calculateBridgeDistancesM1([bId], h5aFull.positions, neighborMap).get(bId) || 0;
        const candDFinalM1 = calculateBridgeDistancesM1([bId], candDFull.positions, neighborMap).get(bId) || 0;

        // M2 values
        const h5aStage8M2 = calculateBridgeDistancesM2([bId], stage8H5A.positions, neighborMap).get(bId) || 0;
        const candDStage8M2 = calculateBridgeDistancesM2([bId], stage8CandD.positions, neighborMap).get(bId) || 0;

        const sb1cFinalM2 = calculateBridgeDistancesM2([bId], sb1cFull.positions, neighborMap).get(bId) || 0;
        const h5aFinalM2 = calculateBridgeDistancesM2([bId], h5aFull.positions, neighborMap).get(bId) || 0;
        const candDFinalM2 = calculateBridgeDistancesM2([bId], candDFull.positions, neighborMap).get(bId) || 0;

        // Causal classification
        let causalClass = 'UNCHANGED_COORDINATE';
        const deltaX_H5A_CandD = Math.abs(posStage8_CandD.x - posStage8_H5A.x);
        const deltaY_H5A_CandD = Math.abs(posStage8_CandD.y - posStage8_H5A.y);

        if (deltaX_H5A_CandD > 0.01 || deltaY_H5A_CandD > 0.01) {
          const cfA_diff = Math.abs(posCounterfactualA.x - posStage8_H5A.x) + Math.abs(posCounterfactualA.y - posStage8_H5A.y);
          const cfB_diff = Math.abs(posCounterfactualB.x - posStage8_CandD.x) + Math.abs(posCounterfactualB.y - posStage8_CandD.y);

          if (indexCandD !== indexH5A && cfB_diff < 0.01 && cfA_diff > 0.01) {
            causalClass = 'DIRECT_ORDER_EFFECT';
          } else if (cfA_diff > 0.01 && cfB_diff > 0.01) {
            causalClass = 'DYNAMIC_CASCADE_EFFECT';
          } else {
            causalClass = 'MIXED';
          }
        }

        // Displacement Stage 7 -> Final
        const dxStage7Final_CandD = Math.sqrt(Math.pow(posFinal_CandD.x - candidateX0_CandD, 2) + Math.pow(posFinal_CandD.y - globalDomainResult.layerYMap[layer], 2));

        bridgeUniverse.push({
          dataset: ds.key,
          bridgeId: bId,
          isBridge: true,
          isHub: false,
          isTest: isTestNode(bNode),
          isField: isFieldNode(bNode),
          candidateX0_H5A: Number(candidateX0_H5A.toFixed(2)),
          candidateX0_CandD: Number(candidateX0_CandD.toFixed(2)),
          Stage7_Y: globalDomainResult.layerYMap[layer],
          Stage8_H5A: posStage8_H5A,
          Stage8_CandD: posStage8_CandD,
          Final_SB1C: posFinal_SB1C,
          Final_H5A: posFinal_H5A,
          Final_CandD: posFinal_CandD,
          CounterfactualA_Stage8: posCounterfactualA,
          CounterfactualB_Stage8: posCounterfactualB,
          processingIndex_H5A: indexH5A,
          processingIndex_CandD: indexCandD,
          connectedDomainsCount: cMeta.connectedDomains.length,
          connectedDomains: cMeta.connectedDomains,
          neighborIdsCount: nIds.length,
          layer,
          Stage8_M1_H5A: Number(h5aStage8M1.toFixed(2)),
          Stage8_M1_CandD: Number(candDStage8M1.toFixed(2)),
          Final_M1_SB1C: Number(sb1cFinalM1.toFixed(2)),
          Final_M1_H5A: Number(h5aFinalM1.toFixed(2)),
          Final_M1_CandD: Number(candDFinalM1.toFixed(2)),
          Stage8_M2_H5A: Number(h5aStage8M2.toFixed(2)),
          Stage8_M2_CandD: Number(candDStage8M2.toFixed(2)),
          Final_M2_SB1C: Number(sb1cFinalM2.toFixed(2)),
          Final_M2_H5A: Number(h5aFinalM2.toFixed(2)),
          Final_M2_CandD: Number(candDFinalM2.toFixed(2)),
          primaryRejections_H5A: stage8H5A.primaryRejectionsMap.get(bId) || 0,
          primaryRejections_CandD: stage8CandD.primaryRejectionsMap.get(bId) || 0,
          dynamicRejections_H5A: stage8H5A.dynamicRejectionsMap.get(bId) || 0,
          dynamicRejections_CandD: stage8CandD.dynamicRejectionsMap.get(bId) || 0,
          causalClass,
          displacementStage7Final_CandD: Number(dxStage7Final_CandD.toFixed(2)),
        });
      }

      // Compute Distribution Statistics over bridgeUniverse
      const h5aStage8M1_arr = bridgeUniverse.map(b => b.Stage8_M1_H5A);
      const candDStage8M1_arr = bridgeUniverse.map(b => b.Stage8_M1_CandD);

      const sb1cFinalM1_arr = bridgeUniverse.map(b => b.Final_M1_SB1C);
      const h5aFinalM1_arr = bridgeUniverse.map(b => b.Final_M1_H5A);
      const candDFinalM1_arr = bridgeUniverse.map(b => b.Final_M1_CandD);

      const h5aStage8M2_arr = bridgeUniverse.map(b => b.Stage8_M2_H5A);
      const candDStage8M2_arr = bridgeUniverse.map(b => b.Stage8_M2_CandD);

      const sb1cFinalM2_arr = bridgeUniverse.map(b => b.Final_M2_SB1C);
      const h5aFinalM2_arr = bridgeUniverse.map(b => b.Final_M2_H5A);
      const candDFinalM2_arr = bridgeUniverse.map(b => b.Final_M2_CandD);

      // Pair-level distances
      const candDFinalM1_pair_arr = calculatePairLevelDistances(bridgeIds, candDFull.positions, neighborMap);
      const h5aFinalM1_pair_arr = calculatePairLevelDistances(bridgeIds, h5aFull.positions, neighborMap);

      // Divergence Definitions Comparison
      let controlDiverged_Stage8 = 0; // Stage8 SB1C vs Stage8 H5A
      let controlDiverged_Final = 0;  // Final SB1C vs Final H5A
      let h5aVsCandD_Stage8 = 0;
      let h5aVsCandD_Final = 0;

      for (const b of bridgeUniverse) {
        if (Math.abs(b.Stage8_H5A.x - b.Final_SB1C.x) > 0.01 || Math.abs(b.Stage8_H5A.y - b.Final_SB1C.y) > 0.01) {
          controlDiverged_Stage8++;
        }
        if (Math.abs(b.Final_H5A.x - b.Final_SB1C.x) > 0.01 || Math.abs(b.Final_H5A.y - b.Final_SB1C.y) > 0.01) {
          controlDiverged_Final++;
        }
        if (Math.abs(b.Stage8_CandD.x - b.Stage8_H5A.x) > 0.01 || Math.abs(b.Stage8_CandD.y - b.Stage8_H5A.y) > 0.01) {
          h5aVsCandD_Stage8++;
        }
        if (Math.abs(b.Final_CandD.x - b.Final_H5A.x) > 0.01 || Math.abs(b.Final_CandD.y - b.Final_H5A.y) > 0.01) {
          h5aVsCandD_Final++;
        }
      }

      // Displacement Buckets for CandD (Stage7 -> Final)
      const displacementBuckets = {
        zero: 0,
        b0_160: 0,
        b160_320: 0,
        b320_640: 0,
        b640_1280: 0,
        b1280_2560: 0,
        gt2560: 0,
      };

      const gt2560Bridges: any[] = [];

      for (const b of bridgeUniverse) {
        const d = b.displacementStage7Final_CandD;
        if (d === 0) displacementBuckets.zero++;
        else if (d <= 160) displacementBuckets.b0_160++;
        else if (d <= 320) displacementBuckets.b160_320++;
        else if (d <= 640) displacementBuckets.b320_640++;
        else if (d <= 1280) displacementBuckets.b640_1280++;
        else if (d <= 2560) displacementBuckets.b1280_2560++;
        else {
          displacementBuckets.gt2560++;
          gt2560Bridges.push(b);
        }
      }

      reportData.datasets[ds.key] = {
        bridgeCount: bridgeUniverse.length,
        primaryCount: primaryNodes.length,
        bridgeUniverse,
        stats: {
          stage8M1: {
            h5a: computeStats(h5aStage8M1_arr),
            candD: computeStats(candDStage8M1_arr),
          },
          finalM1: {
            sb1c: computeStats(sb1cFinalM1_arr),
            h5a: computeStats(h5aFinalM1_arr),
            candD: computeStats(candDFinalM1_arr),
          },
          finalM1_pairLevel: {
            h5a: computeStats(h5aFinalM1_pair_arr),
            candD: computeStats(candDFinalM1_pair_arr),
          },
          stage8M2: {
            h5a: computeStats(h5aStage8M2_arr),
            candD: computeStats(candDStage8M2_arr),
          },
          finalM2: {
            sb1c: computeStats(sb1cFinalM2_arr),
            h5a: computeStats(h5aFinalM2_arr),
            candD: computeStats(candDFinalM2_arr),
          },
        },
        widths: {
          stage8H5A: calculateWidth(stage8H5A.positions),
          stage8CandD: calculateWidth(stage8CandD.positions),
          finalSB1C: calculateWidth(sb1cFull.positions),
          finalH5A: calculateWidth(h5aFull.positions),
          finalCandD: calculateWidth(candDFull.positions),
        },
        divergenceCounts: {
          controlDiverged_Stage8,
          controlDiverged_Final,
          h5aVsCandD_Stage8,
          h5aVsCandD_Final,
        },
        displacementBuckets,
        gt2560Bridges,
      };
    }

    const outPath = path.resolve(process.cwd(), 'audit-reports/phase5o-forensic-data.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(reportData, null, 2), 'utf8');

    expect(fs.existsSync(outPath)).toBe(true);
  });
});
