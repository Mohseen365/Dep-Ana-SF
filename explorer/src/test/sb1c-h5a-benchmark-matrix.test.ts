import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from '../lib/layout/centrality';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeGlobalDomainLayout } from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';

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
): { median: number; p95: number; max: number } {
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
      // M1 for node = mean neighbor distance
      const meanDist = nDists.reduce((a, b) => a + b, 0) / nDists.length;
      distances.push(meanDist);
    }
  }

  return computeQuantiles(distances);
}

describe('Phase 5L-U Control Separation Benchmark Suite', () => {
  for (const ds of DATASETS) {
    test(`Run Same-SHA Control Separation Pipeline for ${ds.key.toUpperCase()}`, () => {
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

      const neighborMap = new Map<string, string[]>();
      safeNodes.forEach(n => {
        const nodeAnalysis = analysis.nodes.get(n.id);
        neighborMap.set(n.id, nodeAnalysis?.neighborIds || []);
      });

      // Stage 1-7 (shared for both SB1C and H5A controls)
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

      // Runner helper for Stage 8 detailed collision and coordinate extraction
      function runStage8(enableImmutablePrimary: boolean) {
        const basePositions: Record<string, { x: number; y: number }> = {
          ...stage7PrimaryPositions,
        };

        let primaryRejections = 0;
        let dynamicRejections = 0;

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

            const layer = layerMap.get(node.id) || 'application';

            // Trace rejections during bridge placement
            // To trace candidate rejections, we re-simulate candidate search step by step
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

            // Bounds
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
                      dynamicRejections++;
                      break;
                    }
                  }

                  let primaryCollide = false;
                  if (!dynamicCollide && enableImmutablePrimary) {
                    for (const [otherId, otherPos] of Object.entries(stage7PrimaryPositions)) {
                      if (otherId === node.id) continue;
                      if (Math.abs(otherPos.x - testX) < minDx - 1e-3 && Math.abs(otherPos.y - testY) < minDy - 1e-3) {
                        primaryCollide = true;
                        primaryRejections++;
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
          }
        });

        return {
          positions: basePositions,
          primaryRejections,
          dynamicRejections,
        };
      }

      // Execute SB1C Stage 8
      const sb1cStage8 = runStage8(false);
      // Execute H5A Stage 8
      const h5aStage8 = runStage8(true);

      // Execute Full Pipeline (Stage 9-11)
      const sb1cFull = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, { enableImmutablePrimaryPositions: false });
      const h5aFull = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, { enableImmutablePrimaryPositions: true });

      // Calculate Movement from Stage 7 for both
      let sb1cMovedFromStage7 = 0;
      let h5aMovedFromStage7 = 0;

      bridgeIds.forEach(bId => {
        const stg7 = stage7PrimaryPositions[bId];
        const sb8 = sb1cStage8.positions[bId];
        const h8 = h5aStage8.positions[bId];

        if (stg7 && sb8) {
          const dSb = Math.hypot(sb8.x - stg7.x, sb8.y - stg7.y);
          if (dSb > 0.01) sb1cMovedFromStage7++;
        }
        if (stg7 && h8) {
          const dH = Math.hypot(h8.x - stg7.x, h8.y - stg7.y);
          if (dH > 0.01) h5aMovedFromStage7++;
        }
      });

      // Calculate Stage 8 widths
      function calculateWidth(posMap: Record<string, { x: number; y: number }>): number {
        let minX = Infinity;
        let maxX = -Infinity;
        Object.values(posMap).forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.x + 120 > maxX) maxX = p.x + 120;
        });
        return maxX - minX;
      }

      const sb1cStage8Width = calculateWidth(sb1cStage8.positions);
      const h5aStage8Width = calculateWidth(h5aStage8.positions);
      const sb1cFinalWidth = calculateWidth(sb1cFull.positions);
      const h5aFinalWidth = calculateWidth(h5aFull.positions);

      // Calculate M1 metrics
      const sb1cStage8M1 = computeM1ForBridges(bridgeIds, sb1cStage8.positions, neighborMap);
      const h5aStage8M1 = computeM1ForBridges(bridgeIds, h5aStage8.positions, neighborMap);
      const sb1cFinalM1 = computeM1ForBridges(bridgeIds, sb1cFull.positions, neighborMap);
      const h5aFinalM1 = computeM1ForBridges(bridgeIds, h5aFull.positions, neighborMap);

      // Coordinate difference between SB1C and H5A at Stage 8
      let diffBridgeCount = 0;
      const deltas: number[] = [];
      bridgeIds.forEach(bId => {
        const p1 = sb1cStage8.positions[bId];
        const p2 = h5aStage8.positions[bId];
        if (p1 && p2) {
          const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (d > 0.01) {
            diffBridgeCount++;
            deltas.push(d);
          }
        }
      });

      const quantDeltas = computeQuantiles(deltas);

      console.log(`\n=================== PHASE 5L-U RESULTS: ${ds.key.toUpperCase()} ===================`);
      console.log(`Total Bridges: ${bridgeIds.length}`);
      console.log(`SB1C: Primary Rejects = ${sb1cStage8.primaryRejections} | Dynamic Rejects = ${sb1cStage8.dynamicRejections} | Moved from Stage 7 = ${sb1cMovedFromStage7}`);
      console.log(`H5A:  Primary Rejects = ${h5aStage8.primaryRejections} | Dynamic Rejects = ${h5aStage8.dynamicRejections} | Moved from Stage 7 = ${h5aMovedFromStage7}`);
      console.log(`Stage 8 Coordinate Divergence: ${diffBridgeCount} bridges differ | Median Delta = ${quantDeltas.median.toFixed(2)}px | Max Delta = ${quantDeltas.max.toFixed(2)}px`);
      console.log(`SB1C Stage 8 M1: Median = ${sb1cStage8M1.median.toFixed(2)}px | P95 = ${sb1cStage8M1.p95.toFixed(2)}px | Max = ${sb1cStage8M1.max.toFixed(2)}px | Width = ${sb1cStage8Width.toFixed(2)}px`);
      console.log(`H5A  Stage 8 M1: Median = ${h5aStage8M1.median.toFixed(2)}px | P95 = ${h5aStage8M1.p95.toFixed(2)}px | Max = ${h5aStage8M1.max.toFixed(2)}px | Width = ${h5aStage8Width.toFixed(2)}px`);
      console.log(`SB1C Final   M1: Median = ${sb1cFinalM1.median.toFixed(2)}px | P95 = ${sb1cFinalM1.p95.toFixed(2)}px | Max = ${sb1cFinalM1.max.toFixed(2)}px | Width = ${sb1cFinalWidth.toFixed(2)}px`);
      console.log(`H5A  Final   M1: Median = ${h5aFinalM1.median.toFixed(2)}px | P95 = ${h5aFinalM1.p95.toFixed(2)}px | Max = ${h5aFinalM1.max.toFixed(2)}px | Width = ${h5aFinalWidth.toFixed(2)}px`);

      expect(diffBridgeCount).toBeGreaterThanOrEqual(ds.key === 'pbim' ? 66 : 0);
    });
  }
});
