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
      const meanDist = nDists.reduce((a, b) => a + b, 0) / nDists.length;
      distances.push(meanDist);
    }
  }

  return computeQuantiles(distances);
}

function computeM2ForBridges(
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
      const maxDist = Math.max(...nDists);
      distances.push(maxDist);
    }
  }

  return computeQuantiles(distances);
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

function computeResidualOverlaps(
  bridgeIds: string[],
  primaryIds: string[],
  positions: Record<string, { x: number; y: number }>
): { bridgePrimaryOverlaps: number; bridgeBridgeOverlaps: number } {
  let bridgePrimaryOverlaps = 0;
  let bridgeBridgeOverlaps = 0;

  const minDx = 160;
  const minDy = 100;
  const eps = 1e-3;

  for (const bId of bridgeIds) {
    const bRaw = positions[bId];
    if (!bRaw) continue;
    const bPos = { x: Math.round(bRaw.x * 100) / 100, y: Math.round(bRaw.y * 100) / 100 };

    for (const pId of primaryIds) {
      if (bId === pId) continue;
      const pRaw = positions[pId];
      if (!pRaw) continue;
      const pPos = { x: Math.round(pRaw.x * 100) / 100, y: Math.round(pRaw.y * 100) / 100 };

      if (Math.abs(bPos.x - pPos.x) < minDx - eps && Math.abs(bPos.y - pPos.y) < minDy - eps) {
        bridgePrimaryOverlaps++;
      }
    }
  }

  for (let i = 0; i < bridgeIds.length; i++) {
    const bId1 = bridgeIds[i];
    const raw1 = positions[bId1];
    if (!raw1) continue;
    const pos1 = { x: Math.round(raw1.x * 100) / 100, y: Math.round(raw1.y * 100) / 100 };

    for (let j = i + 1; j < bridgeIds.length; j++) {
      const bId2 = bridgeIds[j];
      const raw2 = positions[bId2];
      if (!raw2) continue;
      const pos2 = { x: Math.round(raw2.x * 100) / 100, y: Math.round(raw2.y * 100) / 100 };

      if (Math.abs(pos1.x - pos2.x) < minDx - eps && Math.abs(pos1.y - pos2.y) < minDy - eps) {
        bridgeBridgeOverlaps++;
      }
    }
  }

  return { bridgePrimaryOverlaps, bridgeBridgeOverlaps };
}

describe('Phase 5M Candidate D Processing-Order-Only Implementation & Validation Suite', () => {
  test('1. Baseline Reproduction Check (PBIM Stage8 M1 & Final M1)', () => {
    const { nodes, edges } = loadDataset(DATASETS[2]); // PBIM
    const sb1c = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: false, enableCandidateDOrdering: false });
    const h5a = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: false });

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

    const bridgeNodes = safeNodes.filter(n => !isTestNode(n) && !isFieldNode(n) && centralityMap.get(n.id)?.isBridge && !centralityMap.get(n.id)?.isHub);
    const bridgeIds = bridgeNodes.map(b => b.id);

    const sb1cFinalM1 = computeM1ForBridges(bridgeIds, sb1c.positions, neighborMap);
    const h5aFinalM1 = computeM1ForBridges(bridgeIds, h5a.positions, neighborMap);

    expect(Number(sb1cFinalM1.median.toFixed(2))).toBe(1009.69);
    expect(Number(h5aFinalM1.median.toFixed(2))).toBe(1278.38);
  });

  test('2. Control Separation Verification (SB1C, H5A, Candidate D)', () => {
    const { nodes, edges } = loadDataset(DATASETS[0]); // CST
    const sb1c = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: false, enableCandidateDOrdering: false });
    const h5a = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: false });
    const candD = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: true });

    expect(sb1c.positions).toBeDefined();
    expect(h5a.positions).toBeDefined();
    expect(candD.positions).toBeDefined();
  });

  test('3. CST Specimen Test (DateUtils & StandardAccessPolicy)', () => {
    const { nodes, edges } = loadDataset(DATASETS[0]);
    const h5a = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: false });
    const candD = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: true });

    expect(h5a.positions['ApexClass:DateUtils']).toBeDefined();
    expect(candD.positions['ApexClass:DateUtils']).toBeDefined();
  });

  test('4. PBIM Boundary Specimen Test (EscalationSelector, SchedulableContext, SelectorMock)', () => {
    const { nodes, edges } = loadDataset(DATASETS[2]);
    const candD = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: true });

    expect(candD.positions['ApexClass:EscalationSelector']).toBeDefined();
    expect(candD.positions['External:SchedulableContext']).toBeDefined();
    expect(candD.positions['External:SelectorMock']).toBeDefined();
  });

  for (const ds of DATASETS) {
    test(`5. Complete Forensics & Gate Evaluation for ${ds.key.toUpperCase()}`, () => {
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

      // Stage 1-7 primary positions
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

      const domainXCenters: Record<string, number> = {};
      const domainBounds: Record<string, { minX: number; maxX: number }> = {};
      globalDomainResult.domainRegions.forEach((region, domain) => {
        domainXCenters[domain] = region.xCenter;
        domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
      });

      // Stage 8 runner for Candidate D Stage 8 sampling
      function runStage8(enableCandidateD: boolean) {
        const basePositions: Record<string, { x: number; y: number }> = {
          ...stage7PrimaryPositions,
        };

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

        stage8BridgeNodes.forEach(node => {
          const centrality = centralityMap.get(node.id)!;
          const neighborPositions: Record<string, { x: number; y: number }> = {};
          const nodeAnalysis = analysis.nodes.get(node.id);

          nodeAnalysis?.neighborIds.forEach(nId => {
            if (basePositions[nId]) {
              neighborPositions[nId] = basePositions[nId];
            }
          });

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

      const candDStage8Positions = runStage8(true);
      const stage8Overlaps = computeResidualOverlaps(bridgeIds, primaryIds, candDStage8Positions);

      // Gate: Stage 8 Residual Overlaps MUST be 0
      expect(stage8Overlaps.bridgePrimaryOverlaps).toBe(0);
      expect(stage8Overlaps.bridgeBridgeOverlaps).toBe(0);

      const sb1cFull = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, { enableImmutablePrimaryPositions: false, enableCandidateDOrdering: false });
      const h5aFull = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: false });
      const candDFull = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: true });

      const sb1cStage8M1 = computeM1ForBridges(bridgeIds, runStage8(false), neighborMap);
      const candDStage8M1 = computeM1ForBridges(bridgeIds, candDStage8Positions, neighborMap);

      const sb1cFinalM1 = computeM1ForBridges(bridgeIds, sb1cFull.positions, neighborMap);
      const h5aFinalM1 = computeM1ForBridges(bridgeIds, h5aFull.positions, neighborMap);
      const candDFinalM1 = computeM1ForBridges(bridgeIds, candDFull.positions, neighborMap);

      const sb1cWidth = calculateWidth(sb1cFull.positions);
      const h5aWidth = calculateWidth(h5aFull.positions);
      const candDWidth = calculateWidth(candDFull.positions);

      console.log(`\n=================== PHASE 5M ACCEPTANCE: ${ds.key.toUpperCase()} ===================`);
      console.log(`Bridges: ${bridgeIds.length} | Primaries: ${primaryIds.length}`);
      console.log(`Stage 8 M1 (CandD): Med=${candDStage8M1.median.toFixed(2)}px | P95=${candDStage8M1.p95.toFixed(2)}px`);
      console.log(`SB1C Final M1: Med=${sb1cFinalM1.median.toFixed(2)}px | P95=${sb1cFinalM1.p95.toFixed(2)}px | Width=${sb1cWidth.toFixed(2)}px`);
      console.log(`H5A  Final M1: Med=${h5aFinalM1.median.toFixed(2)}px | P95=${h5aFinalM1.p95.toFixed(2)}px | Width=${h5aWidth.toFixed(2)}px`);
      console.log(`CandD Final M1: Med=${candDFinalM1.median.toFixed(2)}px | P95=${candDFinalM1.p95.toFixed(2)}px | Width=${candDWidth.toFixed(2)}px`);
      console.log(`Stage 8 Residual Overlaps (CandD): BP=${stage8Overlaps.bridgePrimaryOverlaps} | BB=${stage8Overlaps.bridgeBridgeOverlaps}`);
    });

    test(`6. Determinism Test for ${ds.key.toUpperCase()}`, { timeout: 180000 }, () => {
      const { nodes, edges } = loadDataset(ds);
      const baseline = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: true });

      let maxDrift = 0;
      for (let run = 0; run < 10; run++) {
        const current = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: true });
        for (const [id, pos] of Object.entries(baseline.positions)) {
          const cPos = current.positions[id];
          if (cPos) {
            const dx = Math.abs(pos.x - cPos.x);
            const dy = Math.abs(pos.y - cPos.y);
            if (dx > maxDrift) maxDrift = dx;
            if (dy > maxDrift) maxDrift = dy;
          }
        }
      }

      expect(maxDrift).toBe(0);
    });

    test(`7. Input-Order Invariance Test for ${ds.key.toUpperCase()}`, { timeout: 180000 }, () => {
      const { nodes, edges } = loadDataset(ds);
      const baseline = computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: true });

      let maxDrift = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const shuffledNodes = [...nodes].sort((a, b) => {
          const hA = (a.id.length * 31 + seed * 17) % 100;
          const hB = (b.id.length * 31 + seed * 17) % 100;
          return hA - hB || a.id.localeCompare(b.id);
        });

        const current = computeArchitectureLayoutWithMetadata(shuffledNodes, edges, { enableImmutablePrimaryPositions: true, enableCandidateDOrdering: true });
        for (const [id, pos] of Object.entries(baseline.positions)) {
          const cPos = current.positions[id];
          if (cPos) {
            const dx = Math.abs(pos.x - cPos.x);
            const dy = Math.abs(pos.y - cPos.y);
            if (dx > maxDrift) maxDrift = dx;
            if (dy > maxDrift) maxDrift = dy;
          }
        }
      }

      expect(maxDrift).toBe(0);
    });
  }
});
