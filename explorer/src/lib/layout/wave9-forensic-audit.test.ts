import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeArchitectureLayout } from '../architecture-layout';
import { discoverFeatures } from './features';

function loadCloudSpendData(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('Wave 9 — Forensic Semantic & Visual Quality Audit Suite', () => {
  const { nodes, edges } = loadCloudSpendData();

  it('Phase 14 — Determinism Verification (5 Permutations)', () => {
    const feat1 = discoverFeatures(nodes, edges);
    const layout1 = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    // Permutation 2: Reversed nodes
    const reversedNodes = [...nodes].reverse();
    const feat2 = discoverFeatures(reversedNodes, edges);
    const layout2 = computeArchitectureLayout(reversedNodes, edges, { enableFeatureLayout: true });

    // Permutation 3: Reversed edges
    const reversedEdges = [...edges].reverse();
    const feat3 = discoverFeatures(nodes, reversedEdges);
    const layout3 = computeArchitectureLayout(nodes, reversedEdges, { enableFeatureLayout: true });

    // Permutation 4: Shuffled nodes
    const shuffledNodes = [...nodes].sort((a, b) => (a.id.length % 3) - (b.id.length % 3) || b.id.localeCompare(a.id));
    const feat4 = discoverFeatures(shuffledNodes, edges);
    const layout4 = computeArchitectureLayout(shuffledNodes, edges, { enableFeatureLayout: true });

    // Permutation 5: Shuffled edges
    const shuffledEdges = [...edges].sort((a, b) => (a.id.length % 5) - (b.id.length % 5) || b.id.localeCompare(a.id));
    const feat5 = discoverFeatures(nodes, shuffledEdges);
    const layout5 = computeArchitectureLayout(nodes, shuffledEdges, { enableFeatureLayout: true });

    // Feature Discovery Drift Check
    expect(feat1.featureList.length).toBe(feat2.featureList.length);
    expect(feat1.featureList.length).toBe(feat3.featureList.length);
    expect(feat1.featureList.length).toBe(feat4.featureList.length);
    expect(feat1.featureList.length).toBe(feat5.featureList.length);

    feat1.featureList.forEach((f1, idx) => {
      expect(f1.id).toBe(feat2.featureList[idx].id);
      expect(f1.id).toBe(feat3.featureList[idx].id);
      expect(f1.id).toBe(feat4.featureList[idx].id);
      expect(f1.id).toBe(feat5.featureList[idx].id);

      expect(f1.primaryNodeIds).toEqual(feat2.featureList[idx].primaryNodeIds);
      expect(f1.primaryNodeIds).toEqual(feat3.featureList[idx].primaryNodeIds);
      expect(f1.primaryNodeIds).toEqual(feat4.featureList[idx].primaryNodeIds);
      expect(f1.primaryNodeIds).toEqual(feat5.featureList[idx].primaryNodeIds);
    });

    // Coordinate Drift Check
    let maxDrift = 0;
    for (const nodeId of Object.keys(layout1)) {
      const p1 = layout1[nodeId];
      const p2 = layout2[nodeId];
      const p3 = layout3[nodeId];
      const p4 = layout4[nodeId];
      const p5 = layout5[nodeId];

      const d2 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const d3 = Math.hypot(p1.x - p3.x, p1.y - p3.y);
      const d4 = Math.hypot(p1.x - p4.x, p1.y - p4.y);
      const d5 = Math.hypot(p1.x - p5.x, p1.y - p5.y);

      maxDrift = Math.max(maxDrift, d2, d3, d4, d5);
    }

    console.log(`Phase 14 Determinism: Max Coordinate Drift = ${maxDrift.toFixed(5)} px across 5 permutations.`);
    expect(maxDrift).toBeCloseTo(0, 5);
  });

  it('Phase 15 — Legacy Compatibility & Mode Verification', () => {
    const legacyLayout1 = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
    const legacyLayout2 = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });

    let legacyDrift = 0;
    for (const nodeId of Object.keys(legacyLayout1)) {
      const p1 = legacyLayout1[nodeId];
      const p2 = legacyLayout2[nodeId];
      legacyDrift = Math.max(legacyDrift, Math.hypot(p1.x - p2.x, p1.y - p2.y));
    }

    console.log(`Phase 15 Legacy Compatibility: Legacy Coordinate Drift = ${legacyDrift.toFixed(5)} px.`);
    expect(legacyDrift).toBe(0);
  });
});
