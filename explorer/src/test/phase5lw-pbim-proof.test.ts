import { describe, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeGraphCentralityAnalysis } from '../lib/layout/centrality';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import type { ArchitectureLayer } from '../lib/layout/types';
import { computeGlobalDomainLayout } from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';

function loadDataset(key: string): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, `../../public/projects/${key}/explorer-data.json`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return { nodes: parsed.nodes || [], edges: parsed.edges || [] };
}

function computeQuantiles(arr: number[]): { median: number; p95: number; max: number } {
  if (arr.length === 0) return { median: 0, p95: 0, max: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length * 0.5);
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p95 = sorted[p95Idx];
  const max = sorted[sorted.length - 1];
  return { median, p95, max };
}

function computeM1ForBridges(
  bridgeIds: string[],
  positions: Record<string, { x: number; y: number }>,
  neighborMap: Map<string, string[]>
): number {
  const distances: number[] = [];
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
      distances.push(meanDist);
    }
  }
  return computeQuantiles(distances).median;
}

describe('Phase 5L-W PBIM Stage 7 X-Centering Causal Proof', () => {
  test('Detailed Inspection of PBIM Stage 7 Primary Positions and Candidate Decisions', () => {
    const { nodes, edges } = loadDataset('pbim');
    const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

    const index = createLayoutGraphIndex(safeNodes, safeEdges);
    let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
    const layerMap = new Map<string, ArchitectureLayer>();
    safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
    analysis = applyLayerClassification(analysis, layerMap);

    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) => domainMap.set(nodeId, assignment.primaryDomain));
    analysis = applyDomainClassification(analysis, domainMap);

    const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

    const neighborMap = new Map<string, string[]>();
    safeNodes.forEach(n => {
      const nodeAnalysis = analysis.nodes.get(n.id);
      neighborMap.set(n.id, nodeAnalysis?.neighborIds || []);
    });

    const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
      domainSpacing: 380, layerSpacing: 250, nodeWidth: 120, nodeHeight: 60,
      analysis, domainDiscovery, layerMap, domainMap, index,
    });

    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes, edges: safeEdges, layerMap, domainMap,
      domainOrder: globalDomainResult.orderedDomains, layerYMap: globalDomainResult.layerYMap,
    });

    // Current Stage 7
    const localResult = computeLocalNodeLayout({
      nodes: safeNodes, edges: safeEdges, analysis,
      domainRegions: globalDomainResult.domainRegions, layerMap, domainMap,
      bucketOrder: orderingResult.bucketOrder,
      options: { nodeWidth: 120, nodeHeight: 60, domainSpacing: 380, layerYMap: globalDomainResult.layerYMap },
    });

    const currentStage7PrimaryPositions = { ...localResult.primaryNodePositions };

    const bridgeNodes = safeNodes.filter(n => {
      if (isTestNode(n) || isFieldNode(n)) return false;
      const c = centralityMap.get(n.id);
      return c?.isBridge && !c.isHub;
    });
    const bridgeIds = bridgeNodes.map(b => b.id);

    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    globalDomainResult.domainRegions.forEach((region, domain) => {
      domainXCenters[domain] = region.xCenter;
      domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
    });

    // Runner helper for Stage 8 with custom Stage 7 primary positions injected
    function runStage8WithCustomStage7(
      enableImmutablePrimary: boolean,
      stage7Positions: Record<string, { x: number; y: number }>
    ) {
      const basePositions: Record<string, { x: number; y: number }> = { ...stage7Positions };
      const candidateTrace: Record<string, any> = {};

      safeNodes.forEach(node => {
        if (isTestNode(node) || isFieldNode(node)) return;
        const centrality = centralityMap.get(node.id);
        if (centrality?.isBridge && !centrality.isHub) {
          const nodeAnalysis = analysis.nodes.get(node.id);
          const layer = layerMap.get(node.id) || 'application';
          const minDx = 160; const minDy = 100;
          const layerYOffsets = globalDomainResult.layerYMap as Record<ArchitectureLayer, number>;
          const baseY = layerYOffsets[layer];

          const sortedConnectedDomains = [...centrality.connectedDomains].sort((a, b) => a.localeCompare(b));
          let sumX = 0; let dCount = 0;
          for (const d of sortedConnectedDomains) {
            if (domainXCenters[d] !== undefined) { sumX += domainXCenters[d]; dCount++; }
          }
          let neighborSumX = 0; let neighborCount = 0;
          for (const nId of nodeAnalysis?.neighborIds || []) {
            if (basePositions[nId]) { neighborSumX += basePositions[nId].x; neighborCount++; }
          }
          let semanticX = neighborCount > 0 ? neighborSumX / neighborCount : (dCount > 0 ? sumX / dCount : 0);

          let minConnectedX = Infinity; let maxConnectedX = -Infinity;
          for (const d of sortedConnectedDomains) {
            const bounds = domainBounds[d];
            if (bounds) {
              if (bounds.minX < minConnectedX) minConnectedX = bounds.minX;
              if (bounds.maxX > maxConnectedX) maxConnectedX = bounds.maxX;
            }
          }
          if (!Number.isFinite(minConnectedX)) { minConnectedX = semanticX; maxConnectedX = semanticX; }

          const initialMinX = minConnectedX - minDx;
          const initialMaxX = maxConnectedX + minDx;
          const X0 = Math.max(initialMinX, Math.min(initialMaxX, semanticX));

          let hasIntermediateTrap = false;
          for (const domainId of Object.keys(domainBounds)) {
            if (sortedConnectedDomains.includes(domainId) || domainId === 'Shared') continue;
            const bounds = domainBounds[domainId];
            if (bounds && semanticX >= bounds.minX - 60 && semanticX <= bounds.maxX + 60) {
              hasIntermediateTrap = true; break;
            }
          }

          const legalYLanes = (hasIntermediateTrap || sortedConnectedDomains.length >= 2)
            ? [baseY - minDy, baseY + minDy, baseY]
            : [baseY, baseY - minDy, baseY + minDy];

          let accepted: { x: number; y: number } | null = null;
          let acceptedK = -1;
          let k0RejectedPrimary = false;
          let blockingPrimaryId = '';
          let blockingPrimaryDx = -1;

          const evaluatedXSet = new Set<number>();

          for (let k = 0; k <= 50; k++) {
            const currentMinX = initialMinX - k * minDx;
            const currentMaxX = initialMaxX + k * minDx;
            const xSteps: number[] = [];
            let stepIndex = 0;
            while (true) {
              let addedAny = false;
              if (stepIndex === 0) {
                if (X0 >= currentMinX - 1e-2 && X0 <= currentMaxX + 1e-2) { xSteps.push(X0); addedAny = true; }
              } else {
                const rightX = X0 + stepIndex * minDx;
                const leftX = X0 - stepIndex * minDx;
                if (rightX <= currentMaxX + 1e-2 && rightX >= currentMinX - 1e-2) { xSteps.push(rightX); addedAny = true; }
                if (leftX >= currentMinX - 1e-2 && leftX <= currentMaxX + 1e-2) { xSteps.push(leftX); addedAny = true; }
              }
              if (!addedAny && (X0 + stepIndex * minDx > currentMaxX + 1e-2) && (X0 - stepIndex * minDx < currentMinX - 1e-2)) break;
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
                    dynamicCollide = true; break;
                  }
                }

                let primaryCollide = false;
                if (!dynamicCollide && enableImmutablePrimary) {
                  for (const [otherId, otherPos] of Object.entries(stage7Positions)) {
                    if (otherId === node.id) continue;
                    const dxVal = Math.abs(otherPos.x - testX);
                    const dyVal = Math.abs(otherPos.y - testY);
                    if (dxVal < minDx - 1e-3 && dyVal < minDy - 1e-3) {
                      primaryCollide = true;
                      if (k === 0) {
                        k0RejectedPrimary = true;
                        blockingPrimaryId = otherId;
                        blockingPrimaryDx = dxVal;
                      }
                      break;
                    }
                  }
                }

                if (!dynamicCollide && !primaryCollide) {
                  accepted = { x: Math.round(testX * 100) / 100, y: Math.round(testY * 100) / 100 };
                  acceptedK = k;
                  break;
                }
              }
              if (accepted) break;
            }
            if (accepted) break;
          }

          if (!accepted) accepted = { x: Math.round(X0 * 100) / 100, y: Math.round(baseY * 100) / 100 };
          basePositions[node.id] = accepted;
          candidateTrace[node.id] = {
            accepted, acceptedK, k0RejectedPrimary, blockingPrimaryId, blockingPrimaryDx,
            semanticX, X0, baseY
          };
        }
      });

      return { positions: basePositions, trace: candidateTrace };
    }

    // Run Current Stage 7 + H5A
    const currentRun = runStage8WithCustomStage7(true, currentStage7PrimaryPositions);
    const currentM1 = computeM1ForBridges(bridgeIds, currentRun.positions, neighborMap);
    console.log(`Current Stage 7 + H5A Stage 8 M1 = ${currentM1.toFixed(2)}px`);

    // Run Current Stage 7 + SB1C
    const currentSb1cRun = runStage8WithCustomStage7(false, currentStage7PrimaryPositions);
    const currentSb1cM1 = computeM1ForBridges(bridgeIds, currentSb1cRun.positions, neighborMap);
    console.log(`Current Stage 7 + SB1C Stage 8 M1 = ${currentSb1cM1.toFixed(2)}px`);

    // Construct Historical Stage 7 Primary Positions prior to Stage 7 optimization
    // Prior to Stage 7 optimization, Stage 7 computed unrounded bucket X-center division without pre-indexing or single-pass optimizations.
    // Let's inspect External:KpiItemDTO and External:LocationDTO traces in currentRun.
    console.log('\n--- KPI ITEM DTO TRACE ---');
    console.log(currentRun.trace['External:KpiItemDTO']);
    console.log('\n--- LOCATION DTO TRACE ---');
    console.log(currentRun.trace['External:LocationDTO']);

    // Let's inspect all bridges where k0RejectedPrimary is true or acceptedK > 0
    const nonK0Bridges: any[] = [];
    Object.entries(currentRun.trace).forEach(([bId, t]: [string, any]) => {
      if (t.acceptedK > 0 || t.k0RejectedPrimary) {
        nonK0Bridges.push({
          bridgeId: bId,
          acceptedK: t.acceptedK,
          k0RejectedPrimary: t.k0RejectedPrimary,
          blockingPrimaryId: t.blockingPrimaryId,
          blockingPrimaryDx: t.blockingPrimaryDx?.toFixed(4),
          accepted: `${t.accepted.x}, ${t.accepted.y}`,
          primaryX: currentStage7PrimaryPositions[t.blockingPrimaryId]?.x.toFixed(4)
        });
      }
    });

    console.log('\n--- ALL BRIDGES REJECTED AT K=0 OR PLACED AT K > 0 ---');
    console.table(nonK0Bridges);
  });
});
