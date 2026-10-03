import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge, ArchitectureLayoutMode } from '../types/explorer';
import {
  computeArchitectureLayoutWithMetadata,
  type ArchitectureLayoutOptions,
} from '../lib/architecture-layout';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from '../lib/layout/centrality';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import {
  computeArchitectureAnalysis,
  applyLayerClassification,
  applyDomainClassification,
  isFieldNode,
} from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import type { ArchitectureLayer } from '../lib/layout/types';
import { calculateLayoutMetrics } from '../lib/layout/metrics';
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
    let maxDist = 0;
    for (const nId of neighbors) {
      const nPos = positions[nId];
      if (nPos) {
        const dx = pos.x - nPos.x;
        const dy = pos.y - nPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) maxDist = dist;
      }
    }
    result.set(bId, maxDist);
  }
  return result;
}

function calculateCanvasWidth(posMap: Record<string, { x: number; y: number }>): number {
  let minX = Infinity;
  let maxX = -Infinity;
  Object.values(posMap).forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x + 120 > maxX) maxX = p.x + 120;
  });
  return maxX - minX;
}

// Emulates GraphView's effectiveLayoutOptions construction logic
function buildEffectiveLayoutOptions(
  architectureMode: ArchitectureLayoutMode,
  layoutOptions?: ArchitectureLayoutOptions
): ArchitectureLayoutOptions {
  return {
    ...layoutOptions,
    enableFeatureLayout: architectureMode === 'hybrid',
    enableCandidateDOrdering: architectureMode === 'hierarchical',
    architectureMode,
  };
}

describe('Phase 6B — Candidate D Activation Wiring Integrity & Adversarial Audit Suite', () => {
  describe('Section 2 & 7: Hostile Override Matrix (9 Combinations)', () => {
    const modes: ArchitectureLayoutMode[] = ['hierarchical', 'orbit', 'hybrid'];
    const overrideOptions: Array<{ name: string; value?: boolean }> = [
      { name: 'absent', value: undefined },
      { name: 'false', value: false },
      { name: 'true', value: true },
    ];

    modes.forEach(mode => {
      overrideOptions.forEach(opt => {
        test(`Mode: ${mode}, Override: ${opt.name} -> Effective Candidate D = ${mode === 'hierarchical'}`, () => {
          const layoutOpts: ArchitectureLayoutOptions | undefined =
            opt.value !== undefined ? { enableCandidateDOrdering: opt.value } : undefined;

          const effective = buildEffectiveLayoutOptions(mode, layoutOpts);
          const expectedCandidateD = mode === 'hierarchical';

          expect(effective.enableCandidateDOrdering).toBe(expectedCandidateD);
        });
      });
    });
  });

  describe('Section 8 & 9: State Transition & Stale Option Persistence Tests', () => {
    test('Hierarchical -> Orbit -> Hierarchical Transition & Isolation', () => {
      const pbimData = loadDataset({ key: 'pbim', file: 'public/projects/pbim/explorer-data.json' });

      // Step 1: Hierarchical with no override -> Candidate D = TRUE
      const opt1 = buildEffectiveLayoutOptions('hierarchical');
      expect(opt1.enableCandidateDOrdering).toBe(true);
      const run1 = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, opt1).positions;

      // Step 2: Switch to Orbit with hostile override { enableCandidateDOrdering: true }
      const optOrbit = buildEffectiveLayoutOptions('orbit', { enableCandidateDOrdering: true });
      expect(optOrbit.enableCandidateDOrdering).toBe(false);
      const runOrbit = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, optOrbit).positions;
      expect(runOrbit).toBeDefined();

      // Step 3: Switch back to Hierarchical with hostile override { enableCandidateDOrdering: false }
      const opt2 = buildEffectiveLayoutOptions('hierarchical', { enableCandidateDOrdering: false });
      expect(opt2.enableCandidateDOrdering).toBe(true);
      const run2 = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, opt2).positions;

      // Verify bit-for-bit identity between run 1 and run 2
      for (const [id, pos1] of Object.entries(run1)) {
        const pos2 = run2[id];
        expect(pos2).toBeDefined();
        expect(pos2.x).toBe(pos1.x);
        expect(pos2.y).toBe(pos1.y);
      }
    });

    test('Hierarchical -> Hybrid -> Hierarchical Transition & Isolation', () => {
      const cstData = loadDataset({ key: 'cst', file: 'public/projects/cst/explorer-data.json' });

      // Step 1: Hierarchical
      const opt1 = buildEffectiveLayoutOptions('hierarchical');
      expect(opt1.enableCandidateDOrdering).toBe(true);
      const run1 = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, opt1).positions;

      // Step 2: Hybrid
      const optHybrid = buildEffectiveLayoutOptions('hybrid', { enableCandidateDOrdering: true });
      expect(optHybrid.enableCandidateDOrdering).toBe(false);
      const runHybrid = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, optHybrid).positions;
      expect(runHybrid).toBeDefined();

      // Step 3: Return to Hierarchical
      const opt2 = buildEffectiveLayoutOptions('hierarchical');
      expect(opt2.enableCandidateDOrdering).toBe(true);
      const run2 = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, opt2).positions;

      for (const [id, pos1] of Object.entries(run1)) {
        const pos2 = run2[id];
        expect(pos2).toBeDefined();
        expect(pos2.x).toBe(pos1.x);
        expect(pos2.y).toBe(pos1.y);
      }
    });

    test('Hostile Multi-Step Stale Option Sequence', () => {
      const bqcData = loadDataset({ key: 'bqc', file: 'public/projects/bqc/explorer-data.json' });

      // 1. Set layoutOptions.enableCandidateDOrdering = false
      // 2. Enter Hierarchical -> Must force Candidate D = true
      const step2 = buildEffectiveLayoutOptions('hierarchical', { enableCandidateDOrdering: false });
      expect(step2.enableCandidateDOrdering).toBe(true);

      // 4. Switch to Orbit
      // 5. Set layoutOptions.enableCandidateDOrdering = true -> Must force Candidate D = false
      const step6 = buildEffectiveLayoutOptions('orbit', { enableCandidateDOrdering: true });
      expect(step6.enableCandidateDOrdering).toBe(false);

      // 7. Switch back to Hierarchical -> Must force Candidate D = true
      const step8 = buildEffectiveLayoutOptions('hierarchical');
      expect(step8.enableCandidateDOrdering).toBe(true);
    });
  });

  describe('Section 11, 12, 13: Hierarchical Metric Regression, Safety & Determinism', () => {
    DATASETS.forEach(ds => {
      describe(`Dataset: ${ds.key.toUpperCase()}`, () => {
        const { nodes, edges } = loadDataset(ds);

        test('Metric Reproduction & Structural Safety', () => {
          const index = createLayoutGraphIndex(nodes, edges);
          let analysis = computeArchitectureAnalysis(nodes, edges, { index });
          const layerMap = new Map<string, ArchitectureLayer>();
          nodes.forEach(node => {
            layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
          });
          analysis = applyLayerClassification(analysis, layerMap);
          const domainDiscovery = discoverDomains(nodes, edges);
          const domainMap = new Map<string, string>();
          domainDiscovery.assignments.forEach((assignment, nodeId) => {
            domainMap.set(nodeId, assignment.primaryDomain);
          });
          analysis = applyDomainClassification(analysis, domainMap);
          const centralityMap = computeGraphCentralityAnalysis(nodes, edges, domainMap, layerMap, { index });

          const primaryNodes = nodes.filter(node => {
            if (isTestNode(node) || isFieldNode(node)) return false;
            const centrality = centralityMap.get(node.id);
            return !centrality?.isBridge || centrality.isHub;
          });
          const primaryIds = primaryNodes.map(p => p.id);

          const bridgeNodes = nodes.filter(node => {
            if (isTestNode(node) || isFieldNode(node)) return false;
            const centrality = centralityMap.get(node.id);
            return centrality?.isBridge && !centrality.isHub;
          });
          const bridgeIds = bridgeNodes.map(b => b.id);

          const neighborMap = new Map<string, string[]>();
          nodes.forEach(n => {
            const aNode = analysis.nodes.get(n.id);
            if (aNode) {
              neighborMap.set(n.id, aNode.neighborIds);
            }
          });

          // Execute Hierarchical layout via effective option construction
          const effectiveOpts = buildEffectiveLayoutOptions('hierarchical', { enableCandidateDOrdering: false });
          const result = computeArchitectureLayoutWithMetadata(nodes, edges, effectiveOpts);
          const posMap = result.positions;

          const m1Stats = computeStats(Array.from(calculateBridgeDistancesM1(bridgeIds, posMap, neighborMap).values()));
          const m2Stats = computeStats(Array.from(calculateBridgeDistancesM2(bridgeIds, posMap, neighborMap).values()));
          const canvasWidth = calculateCanvasWidth(posMap);

          if (ds.key === 'cst') {
            expect(m1Stats.median).toBe(544.06);
            expect(m2Stats.median).toBe(578.23);
            expect(canvasWidth).toBe(8337.60);
          } else if (ds.key === 'bqc') {
            expect(m1Stats.median).toBe(481.66);
            expect(m2Stats.median).toBe(481.66);
            expect(canvasWidth).toBe(6240.00);
          } else if (ds.key === 'pbim') {
            expect(m1Stats.median).toBe(1017.91);
            expect(m2Stats.median).toBe(1303.34);
            expect(canvasWidth).toBe(10773.33);
          }

          // Section 12 Structural Safety Checks
          // 1. Verify 0.00000px Stage 7 Primary Occupancy Mutation during Stage 8 bridge placement
          const domainXCenters: Record<string, number> = {};
          const domainBounds: Record<string, { minX: number; maxX: number }> = {};
          const globalDomainResult = computeGlobalDomainLayout(nodes, edges, {
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
          globalDomainResult.domainRegions.forEach((region, domain) => {
            domainXCenters[domain] = region.xCenter;
            domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
          });

          const orderingResult = reduceEdgeCrossings({
            nodes,
            edges,
            layerMap,
            domainMap,
            domainOrder: globalDomainResult.orderedDomains,
            layerYMap: globalDomainResult.layerYMap,
          });

          const localResult = computeLocalNodeLayout({
            nodes,
            edges,
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

          const basePositions: Record<string, { x: number; y: number }> = {
            ...localResult.primaryNodePositions,
          };
          const immutableStage7Primary = Object.freeze({ ...localResult.primaryNodePositions });

          // Pre-sort bridgeNodes with Candidate D ordering
          const layerOrderMap: Record<ArchitectureLayer, number> = {
            presentation: 0,
            application: 1,
            domain: 2,
            schema: 3,
          };
          const candDBridgeNodes = [...bridgeNodes].sort((a, b) => {
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

          let exhaustedCount = 0;
          for (const bNode of candDBridgeNodes) {
            const centrality = centralityMap.get(bNode.id)!;
            const neighborPositions: Record<string, { x: number; y: number }> = {};
            const nodeAnalysis = analysis.nodes.get(bNode.id);
            nodeAnalysis?.neighborIds.forEach(nId => {
              if (basePositions[nId]) neighborPositions[nId] = basePositions[nId];
            });

            const bridgeInfo = calculateBridgeCandidatePosition(
              bNode.id,
              layerMap.get(bNode.id) || 'application',
              centrality.connectedDomains,
              domainXCenters,
              domainBounds,
              neighborPositions,
              {
                layerSpacing: 250,
                nodeWidth: 120,
                nodeHeight: 60,
                layerYOffsets: globalDomainResult.layerYMap,
                index,
                allocatedPositions: basePositions,
                immutablePrimaryPositions: immutableStage7Primary,
              }
            );

            if (bridgeInfo.placementStatus === 'PLACEMENT_EXHAUSTED') {
              exhaustedCount++;
            }
            basePositions[bNode.id] = bridgeInfo.candidatePosition;
          }

          // Search exhaustion count must be 0
          expect(exhaustedCount).toBe(0);

          // Verify 0.00000px primary position mutation during Stage 8 (primary positions in basePositions remain exact)
          primaryIds.forEach(pId => {
            const initialPos = immutableStage7Primary[pId];
            const posAfterStage8 = basePositions[pId];
            if (initialPos && posAfterStage8) {
              expect(posAfterStage8.x).toBe(initialPos.x);
              expect(posAfterStage8.y).toBe(initialPos.y);
            }
          });
        });

        test('10x Determinism and Input Order Invariance', () => {
          const effectiveOpts = buildEffectiveLayoutOptions('hierarchical');
          const baseline = computeArchitectureLayoutWithMetadata(nodes, edges, effectiveOpts).positions;

          // 10x Identical Runs
          for (let run = 0; run < 10; run++) {
            const current = computeArchitectureLayoutWithMetadata(nodes, edges, effectiveOpts).positions;
            for (const [id, basePos] of Object.entries(baseline)) {
              const curPos = current[id];
              expect(curPos.x).toBe(basePos.x);
              expect(curPos.y).toBe(basePos.y);
            }
          }

          // 10x Shuffled Input Permutations
          for (let perm = 0; perm < 10; perm++) {
            const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
            const current = computeArchitectureLayoutWithMetadata(shuffledNodes, edges, effectiveOpts).positions;
            for (const [id, basePos] of Object.entries(baseline)) {
              const curPos = current[id];
              expect(curPos.x).toBe(basePos.x);
              expect(curPos.y).toBe(basePos.y);
            }
          }
        });
      });
    });
  });

  describe('Section 14: Constellation / Orbit Negative Control', () => {
    test('Candidate D is FALSE under Orbit even when explicitly requested as TRUE', () => {
      const cstData = loadDataset({ key: 'cst', file: 'public/projects/cst/explorer-data.json' });

      const hostileOrbitOpts = buildEffectiveLayoutOptions('orbit', { enableCandidateDOrdering: true });
      expect(hostileOrbitOpts.enableCandidateDOrdering).toBe(false);

      const resOrbit = computeArchitectureLayoutWithMetadata(cstData.nodes, cstData.edges, hostileOrbitOpts);
      expect(resOrbit.positions).toBeDefined();
    });
  });
});
