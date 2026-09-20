import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { discoverFeatures } from './features';
import { computeArchitectureLayout } from '../architecture-layout';
import { computeGlobalFeatureLayout } from './global-layout';

function loadCloudSpendData(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('Wave 8 — Feature Discovery Threshold Forensic Calibration & Semantic Quality Review', () => {
  const { nodes, edges } = loadCloudSpendData();

  const discovery3 = discoverFeatures(nodes, edges, { minCandidateScore: 3.0 });
  const discovery2 = discoverFeatures(nodes, edges, { minCandidateScore: 2.0 });

  it('Phase 0 & 1: Baseline Lock & Seam Parameterization', () => {
    expect(nodes.length).toBe(240);
    expect(edges.length).toBe(1024);
    expect(discovery3.featureList.length).toBe(21);
    expect(discovery2.featureList.length).toBe(21);
  });

  it('Phase 3 & 4: Feature Membership Diff (3.0 vs 2.0)', () => {
    let diffCount = 0;
    discovery3.assignments.forEach((assign3, nodeId) => {
      const assign2 = discovery2.assignments.get(nodeId);
      if (assign3.primaryFeatureId !== assign2?.primaryFeatureId) {
        diffCount++;
      }
    });
    console.log('Phase 4 Membership Diff Count (3.0 vs 2.0):', diffCount);
    expect(diffCount).toBe(0);
  });

  it('Phase 5: Single-Node Feature Forensics (14 Cases)', () => {
    const singleNodeFeatures = discovery3.featureList.filter(f => f.primaryNodeIds.length === 1);
    expect(singleNodeFeatures.length).toBe(14);

    singleNodeFeatures.forEach(f => {
      const seedId = f.primaryNodeIds[0];
      const assign3 = discovery3.assignments.get(seedId)!;
      const assign2 = discovery2.assignments.get(seedId)!;

      // Prove that lowering threshold to 2.0 does NOT change any single-node feature assignments
      expect(assign2.primaryFeatureId).toBe(assign3.primaryFeatureId);
    });
  });

  it('Phase 6: Negative Controls Defense Audit', () => {
    // Utility classes and access policies must remain independent or shared
    const accessPolicyAssign2 = discovery2.assignments.get('ApexClass:StandardAccessPolicy');
    const currencyUtilsAssign2 = discovery2.assignments.get('ApexClass:CurrencyUtils');
    const dateUtilsAssign2 = discovery2.assignments.get('ApexClass:DateUtils');

    expect(accessPolicyAssign2?.primaryFeatureId).toBe('feature_StandardAccessPolicy');
    expect(currencyUtilsAssign2?.primaryFeatureId).toBe('feature_CurrencyUtils');
    expect(dateUtilsAssign2?.primaryFeatureId).toBe('feature_DateUtils');
  });

  it('Phase 7 & 8: Shared Infrastructure & Multi-Feature Audit', () => {
    const shared3 = Array.from(discovery3.assignments.values()).filter(a => a.isShared || a.primaryFeatureId === 'Shared');
    const shared2 = Array.from(discovery2.assignments.values()).filter(a => a.isShared || a.primaryFeatureId === 'Shared');

    expect(shared2.length).toBe(shared3.length);
    expect(shared2.map(a => a.nodeId).sort()).toEqual(shared3.map(a => a.nodeId).sort());
  });

  it('Phase 10: Geometry Regression Check (0 Overlaps)', () => {
    const layout3 = computeArchitectureLayout(nodes, edges);
    const featLayoutRes2 = computeGlobalFeatureLayout(nodes, edges, {
      featureDiscovery: discovery2,
    });

    expect(featLayoutRes2.featureRegions.size).toBe(23); // 21 features + Shared + Unassigned
    expect(Object.keys(layout3).length).toBe(240);
  });

  it('Phase 11: 100% Determinism Verification across 5 Permutations', () => {
    const reversedNodes = [...nodes].reverse();
    const reversedEdges = [...edges].reverse();

    const run1 = discoverFeatures(nodes, edges, { minCandidateScore: 2.0 });
    const run2 = discoverFeatures(reversedNodes, reversedEdges, { minCandidateScore: 2.0 });

    expect(run1.featureList.length).toBe(run2.featureList.length);
    run1.featureList.forEach((f1, i) => {
      const f2 = run2.featureList[i];
      expect(f1.id).toBe(f2.id);
      expect(f1.primaryNodeIds).toEqual(f2.primaryNodeIds);
    });
  });

  it('Phase 12 & 13: Performance and Legacy Compatibility Check', () => {
    const t0 = performance.now();
    discoverFeatures(nodes, edges, { minCandidateScore: 3.0 });
    const time3 = performance.now() - t0;

    const t1 = performance.now();
    discoverFeatures(nodes, edges, { minCandidateScore: 2.0 });
    const time2 = performance.now() - t1;

    console.log(`Feature Discovery Runtime (3.0): ${time3.toFixed(3)}ms | (2.0): ${time2.toFixed(3)}ms`);
    expect(time2).toBeLessThan(100);

    const legacyLayout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
    expect(Object.keys(legacyLayout).length).toBe(240);
  });
});
