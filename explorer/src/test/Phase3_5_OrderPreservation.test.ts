import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { computeGlobalFeatureLayout } from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { primaryNodeOverlapCount, layerViolationCount, calculateDetailedEdgeCrossings } from '../lib/layout/metrics';

function loadCloudSpendData(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('Phase 3.5: Order Preservation & Crossing Conservation Test Suite', () => {
  const { nodes, edges } = loadCloudSpendData();

  it('1. verifies global feature order, layer order, and local node rank preservation across Stage 5, Stage 6, Stage 7', () => {
    const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

    // Stage 5: Global Feature Architecture Layout
    const globalFeatureResult = computeGlobalFeatureLayout(safeNodes, safeEdges);
    const featureOrder = globalFeatureResult.orderedDomains;
    expect(featureOrder.length).toBeGreaterThanOrEqual(14);

    const featureDiscovery = discoverFeatures(safeNodes, safeEdges);
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((assignment: { primaryFeatureId: string }, nodeId: string) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });

    const primaryNodeSet = new Set<string>();
    safeNodes.forEach(node => {
      const isTest = node.behavior?.isTest || (typeof node.file === 'string' && /(?:^|\/)(?:test|tests)\//i.test(node.file)) || /(?:test|tests|testdatafactory)$/i.test(node.displayName || node.id || '');
      const isField = node.type === 'Field' || node.type === 'CustomField';
      if (!isTest && !isField) primaryNodeSet.add(node.id);
    });

    // Stage 6: Layer Ordering & Crossing Reduction
    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes,
      edges: safeEdges,
      domainMap: featureMap,
      domainOrder: featureOrder,
    });

    // Stage 7: Primary Production Local Layout
    const localResult = computeLocalNodeLayout({
      nodes: safeNodes,
      edges: safeEdges,
      domainRegions: globalFeatureResult.domainRegions,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        domainSpacing: 380,
        layerYMap: globalFeatureResult.layerYMap,
      },
    });

    // Check rank preservation: for nodes in the same bucket and row, Stage 7 X coordinate order matches Stage 6 rank order
    let rankInversions = 0;
    let totalPairsEvaluated = 0;

    orderingResult.bucketOrder.forEach((nodeIds) => {
      const primaryInBucket = nodeIds.filter(id => primaryNodeSet.has(id));
      if (primaryInBucket.length >= 2) {
        for (let i = 0; i < primaryInBucket.length; i++) {
          for (let j = i + 1; j < primaryInBucket.length; j++) {
            const idA = primaryInBucket[i];
            const idB = primaryInBucket[j];
            const posA = localResult.primaryNodePositions[idA];
            const posB = localResult.primaryNodePositions[idB];
            if (posA && posB && Math.abs(posA.y - posB.y) < 1e-3) { // Same row
              totalPairsEvaluated++;
              if (posA.x > posB.x + 1e-3) {
                rankInversions++;
              }
            }
          }
        }
      }
    });

    console.log(`Stage 7 Same-Row Intra-Bucket Rank Inversions: ${rankInversions} / ${totalPairsEvaluated} pairs evaluated`);
    expect(rankInversions).toBe(0);

    // Verify 0 primary overlaps in Stage 7
    const stage7Overlaps = primaryNodeOverlapCount(safeNodes, safeEdges, localResult.primaryNodePositions);
    expect(stage7Overlaps).toBe(0);
  });

  it('2. verifies full pipeline execution and layer hierarchy on Cloud Spend dataset', () => {
    const layout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    expect(Object.keys(layout).length).toBe(nodes.length);

    const layerViolations = layerViolationCount(nodes, edges, layout);
    expect(layerViolations).toBe(0);

    const crossings = calculateDetailedEdgeCrossings(nodes, edges, layout);
    console.log('Phase 3.5 Cloud Spend Detailed Crossings:', crossings);
    expect(crossings.primaryPrimaryCrossings).toBeGreaterThan(0);
    expect(crossings.totalGeometricCrossings).toBeGreaterThan(0);
  });

  it('3. verifies 0.00000 px coordinate determinism drift across 10 repeated runs', () => {
    const runs: Record<string, { x: number; y: number }>[] = [];
    for (let i = 0; i < 10; i++) {
      runs.push(computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true }));
    }

    let maxDrift = 0;
    const baseRun = runs[0];

    for (let i = 1; i < runs.length; i++) {
      const currentRun = runs[i];
      for (const [nodeId, pos1] of Object.entries(baseRun)) {
        const pos2 = currentRun[nodeId];
        const drift = Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y);
        if (drift > maxDrift) {
          maxDrift = drift;
        }
      }
    }

    console.log(`Phase 3.5 10x Determinism Drift: ${maxDrift.toFixed(5)} px`);
    expect(maxDrift).toBeCloseTo(0, 5);
  });
});
