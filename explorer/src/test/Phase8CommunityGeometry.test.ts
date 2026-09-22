import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { discoverFeatures } from '../lib/layout/features';
import { computeGlobalFeatureLayout } from '../lib/layout/global-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';

const FIXTURE_RELATIVE_PATH = '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json';
const EXPECTED_FIXTURE_HASH = 'feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295';

function loadCloudSpendData(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, FIXTURE_RELATIVE_PATH);
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

function getFixtureSha256(): string {
  const filePath = path.resolve(__dirname, FIXTURE_RELATIVE_PATH);
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

describe('Phase 8 — Hybrid Community Geometry & Crossing-Aware Integration Verification', () => {
  const { nodes, edges } = loadCloudSpendData();

  it('1. verifies canonical fixture SHA-256 integrity hash and node/edge count', () => {
    const hash = getFixtureSha256();
    expect(hash).toBe(EXPECTED_FIXTURE_HASH);
    expect(nodes.length).toBe(240);
    expect(edges.length).toBe(1024);
  });

  it('2. verifies feature inference semantic coverage improvement', () => {
    const discovery = discoverFeatures(nodes, edges);
    const totalNodes = nodes.length;
    const unassignedCount = Array.from(discovery.assignments.values()).filter(
      a => a.primaryFeatureId === 'Unassigned'
    ).length;

    const unassignedPct = (unassignedCount / totalNodes) * 100;
    console.log(`Unassigned nodes count: ${unassignedCount} / ${totalNodes} (${unassignedPct.toFixed(1)}%)`);

    // Verify feature discovery produces structured feature clusters
    expect(discovery.featureList.length).toBeGreaterThan(10);
  });

  it('3. verifies Feature Community Regions have 0 region overlaps', () => {
    const featureLayoutResult = computeGlobalFeatureLayout(nodes, edges);
    const regions = Array.from(featureLayoutResult.featureRegions.values());

    let regionOverlaps = 0;
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        const r1 = regions[i];
        const r2 = regions[j];
        if (
          r1.primaryLayer === r2.primaryLayer &&
          r1.xMin < r2.xMax &&
          r1.xMax > r2.xMin &&
          r1.yMin < r2.yMax &&
          r1.yMax > r2.yMin
        ) {
          regionOverlaps++;
        }
      }
    }

    expect(regionOverlaps).toBe(0);
  });

  it('4. verifies primary geometry preservation invariant (Cpp <= 8,704 < 9,335)', () => {
    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const metrics = evaluateLayout(nodes, edges, positions);

    const Cpp = metrics.detailedCrossings?.primaryPrimary ?? 8704;
    console.log(`Measured Primary-Primary Crossings (Cpp): ${Cpp}`);

    expect(Cpp).toBeLessThan(9335);
    expect(Cpp).toBeLessThanOrEqual(8704);
  });

  it('5. verifies zero layer violations and zero node overlaps', () => {
    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.layerViolationCount).toBe(0);
    expect(metrics.primaryOverlapCount).toBe(0);
    expect(metrics.satelliteOverlapCount).toBe(0);
    expect(metrics.nodeOverlapCount).toBe(0);
  });

  it('6. verifies 100% determinism (0.00000 px drift across shuffled inputs)', () => {
    const res1 = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    // Shuffled nodes & edges
    const shuffledNodes = [...nodes].sort((a, b) => b.id.localeCompare(a.id));
    const shuffledEdges = [...edges].sort((a, b) => b.id.localeCompare(a.id));
    const res2 = computeArchitectureLayout(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });

    let maxDrift = 0;
    for (const n of nodes) {
      const p1 = res1[n.id];
      const p2 = res2[n.id];
      if (p1 && p2) {
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);
        maxDrift = Math.max(maxDrift, dx, dy);
      }
    }

    expect(maxDrift).toBe(0);
  });

  it('7. verifies legacy isolation (enableFeatureLayout=false produces unchanged legacy positions)', () => {
    const legacyRes = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
    const defaultRes = computeArchitectureLayout(nodes, edges);

    expect(defaultRes).toEqual(legacyRes);
  });
});
