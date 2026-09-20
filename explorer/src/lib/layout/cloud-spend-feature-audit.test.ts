import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeArchitectureLayout } from '../architecture-layout';
import { discoverFeatures } from './features';
import { discoverDomains } from './domains';
import { classifyNodeLayer } from './layers';
import { computeGlobalFeatureLayout } from './global-layout';
import { computeArchitectureAnalysis } from './analysis';
import { createLayoutGraphIndex } from './graph-index';

// Helper to read Cloud Spend Tracker dataset
function loadCloudSpendData(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('Wave 7 — Real Cloud Spend Tracker Feature Layout Acceptance & Forensic Audit Suite', () => {
  const { nodes, edges } = loadCloudSpendData();

  it('1. Dataset Inventory Validation', () => {
    expect(nodes.length).toBe(240);
    expect(edges.length).toBe(1024);

    const artifactCounts = {
      LWCs: 0,
      Visualforce: 0,
      Controllers: 0,
      Services: 0,
      DomainClasses: 0,
      SelectorsRepositories: 0,
      CustomObjects: 0,
      Flows: 0,
      Triggers: 0,
      Tests: 0,
      Fields: 0,
      OtherArtifacts: 0,
    };

    nodes.forEach(n => {
      const name = n.displayName || n.id;
      const isTest = n.behavior?.isTest || /(?:test|tests|testdatafactory)$/i.test(name) || (typeof n.file === 'string' && /(?:^|\/)(?:test|tests)\//i.test(n.file));

      if (isTest) {
        artifactCounts.Tests++;
        return;
      }

      switch (n.type) {
        case 'LWC':
          artifactCounts.LWCs++;
          break;
        case 'Visualforce':
          artifactCounts.Visualforce++;
          break;
        case 'ApexTrigger':
          artifactCounts.Triggers++;
          break;
        case 'Flow':
          artifactCounts.Flows++;
          break;
        case 'CustomObject':
        case 'Object':
          artifactCounts.CustomObjects++;
          break;
        case 'CustomField':
        case 'Field':
          artifactCounts.Fields++;
          break;
        case 'ApexClass':
          if (/(?:controller|controllerextension|controllerext|api|resource|endpoint|handler)$/i.test(name)) {
            artifactCounts.Controllers++;
          } else if (/(?:service|services|manager|processor|engine|workflow|orchestrator)$/i.test(name)) {
            artifactCounts.Services++;
          } else if (/(?:selector|repository|repo|dao|queries|finder|dto|vo|model|wrapper)$/i.test(name)) {
            artifactCounts.SelectorsRepositories++;
          } else if (/(?:domain)$/i.test(name)) {
            artifactCounts.DomainClasses++;
          } else {
            artifactCounts.OtherArtifacts++;
          }
          break;
        default:
          artifactCounts.OtherArtifacts++;
          break;
      }
    });

    console.log('Artifact Inventory:', JSON.stringify(artifactCounts, null, 2));

    const domainDiscovery = discoverDomains(nodes, edges);
    const domainSet = new Set(Array.from(domainDiscovery.assignments.values()).map(a => a.primaryDomain));
    const primaryDomains = Array.from(domainSet).sort();
    console.log('Primary Domains Count:', primaryDomains.length, primaryDomains);

    const featureDiscovery = discoverFeatures(nodes, edges);
    console.log('Features Discovered Count:', featureDiscovery.featureList.length);

    const sharedNodes = Array.from(featureDiscovery.assignments.values()).filter(a => a.isShared || a.primaryFeatureId === 'Shared');
    console.log('Shared Infrastructure Nodes Count:', sharedNodes.length);

    const index = createLayoutGraphIndex(nodes, edges);
    const analysis = computeArchitectureAnalysis(nodes, edges, { index });
    console.log('Disconnected Components Count:', analysis.components.length);
  });

  it('2. Feature Discovery & Inventory Detailed Extraction', () => {
    const discovery = discoverFeatures(nodes, edges);
    const index = createLayoutGraphIndex(nodes, edges);

    console.log('\n================ FEATURE DISCOVERY INVENTORY ================');
    discovery.featureList.forEach(feat => {
      const primaryNodes = feat.primaryNodeIds.map(id => index.nodeById.get(id)).filter(Boolean) as ExplorerNode[];
      const layers = Array.from(new Set(primaryNodes.map(n => classifyNodeLayer(n)))).sort();
      console.log(`Feature ID: ${feat.id}`);
      console.log(`  Name: ${feat.name}`);
      console.log(`  Anchor Node: ${feat.anchorNodeId}`);
      console.log(`  Total Member Nodes: ${feat.primaryNodeIds.length + feat.secondaryNodeIds.length}`);
      console.log(`  Primary Production Nodes (${feat.primaryNodeIds.length}):`, feat.primaryNodeIds);
      console.log(`  Secondary Nodes (${feat.secondaryNodeIds.length}):`, feat.secondaryNodeIds);
      console.log(`  Domains:`, feat.domains);
      console.log(`  Layers:`, layers);
      console.log(`  Role Distribution:`, feat.roleDistribution);
      console.log(`  Connected Features:`, feat.connectedFeatureIds);
      console.log('------------------------------------------------------------');
    });

    // Largest and Smallest features
    const sortedByPrimary = [...discovery.featureList].sort((a, b) => b.primaryNodeIds.length - a.primaryNodeIds.length);
    console.log('Largest Feature (by primary nodes):', sortedByPrimary[0].id, sortedByPrimary[0].primaryNodeIds.length);
    console.log('Smallest Feature (by primary nodes):', sortedByPrimary[sortedByPrimary.length - 1].id, sortedByPrimary[sortedByPrimary.length - 1].primaryNodeIds.length);
  });

  it('3. Feature Layout Geometry & Overlap Forensic Checks', () => {
    const layout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    expect(Object.keys(layout).length).toBe(nodes.length);

    // Primary Node Overlap Check
    const posKeys = new Map<string, string[]>();
    for (const [nodeId, pos] of Object.entries(layout)) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;
      const name = node.displayName || node.id;
      const isTest = node.behavior?.isTest || /(?:test|tests|testdatafactory)$/i.test(name) || (typeof node.file === 'string' && /(?:^|\/)(?:test|tests)\//i.test(node.file));
      const isField = node.type === 'Field' || node.type === 'CustomField';

      if (!isTest && !isField) {
        const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
        if (!posKeys.has(key)) posKeys.set(key, []);
        posKeys.get(key)!.push(nodeId);
      }
    }

    const primaryOverlaps = Array.from(posKeys.entries()).filter(([_, ids]) => ids.length > 1);
    console.log('Primary Node Overlaps Count:', primaryOverlaps.length);
    expect(primaryOverlaps.length).toBe(0);

    // Feature Region Geometry Measurement
    const featureLayoutResult = computeGlobalFeatureLayout(nodes, edges);
    console.log('\n================ FEATURE REGION GEOMETRY ================');
    featureLayoutResult.featureRegions.forEach((region, featureId) => {
      console.log(`Region ${featureId}: xCenter=${region.xCenter}, yCenter=${region.yCenter}, width=${region.width}, height=${region.height}, xMin=${region.xMin}, xMax=${region.xMax}, primaryLayer=${region.primaryLayer}`);
    });

    // Region Overlap Check
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
          console.log(`Region Overlap detected between ${r1.featureId} and ${r2.featureId}`);
        }
      }
    }
    console.log('Feature Region Overlaps Count:', regionOverlaps);
    expect(regionOverlaps).toBe(0);
  });

  it('4. 100% Determinism Verification across 5 Permutations', () => {
    // 1. Original
    const res1 = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const feat1 = discoverFeatures(nodes, edges);

    // 2. Reversed nodes
    const reversedNodes = [...nodes].reverse();
    const res2 = computeArchitectureLayout(reversedNodes, edges, { enableFeatureLayout: true });
    const feat2 = discoverFeatures(reversedNodes, edges);

    // 3. Reversed edges
    const reversedEdges = [...edges].reverse();
    const res3 = computeArchitectureLayout(nodes, reversedEdges, { enableFeatureLayout: true });
    const feat3 = discoverFeatures(nodes, reversedEdges);

    // 4. Shuffled nodes
    const shuffledNodes = [...nodes].sort((a, b) => (a.id.length % 3) - (b.id.length % 3) || b.id.localeCompare(a.id));
    const res4 = computeArchitectureLayout(shuffledNodes, edges, { enableFeatureLayout: true });
    const feat4 = discoverFeatures(shuffledNodes, edges);

    // 5. Shuffled edges
    const shuffledEdges = [...edges].sort((a, b) => (a.id.length % 5) - (b.id.length % 5) || b.id.localeCompare(a.id));
    const res5 = computeArchitectureLayout(nodes, shuffledEdges, { enableFeatureLayout: true });
    const feat5 = discoverFeatures(nodes, shuffledEdges);

    // Feature Discovery Invariance
    expect(feat1.featureList.length).toBe(feat2.featureList.length);
    expect(feat1.featureList.length).toBe(feat3.featureList.length);
    expect(feat1.featureList.length).toBe(feat4.featureList.length);
    expect(feat1.featureList.length).toBe(feat5.featureList.length);

    feat1.featureList.forEach((f1, i) => {
      const f2 = feat2.featureList[i];
      expect(f1.id).toBe(f2.id);
      expect(f1.primaryNodeIds).toEqual(f2.primaryNodeIds);
    });

    // Coordinate Drift Check
    let maxDrift = 0;
    for (const nodeId of Object.keys(res1)) {
      const p1 = res1[nodeId];
      const p2 = res2[nodeId];
      const p3 = res3[nodeId];
      const p4 = res4[nodeId];
      const p5 = res5[nodeId];

      const d2 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const d3 = Math.hypot(p1.x - p3.x, p1.y - p3.y);
      const d4 = Math.hypot(p1.x - p4.x, p1.y - p4.y);
      const d5 = Math.hypot(p1.x - p5.x, p1.y - p5.y);

      maxDrift = Math.max(maxDrift, d2, d3, d4, d5);
    }

    console.log('Max Coordinate Drift across 5 Permutations:', maxDrift.toFixed(5), 'px');
    expect(maxDrift).toBeCloseTo(0, 4);
  });

  it('5. Legacy Domain vs Feature Layout Comparison & Performance Breakdown', () => {
    // Legacy execution
    const t0 = performance.now();
    const legacyLayout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
    const legacyTime = performance.now() - t0;

    // Feature execution
    const t1 = performance.now();
    const featureLayout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const featureTime = performance.now() - t1;
    expect(Object.keys(featureLayout).length).toBe(nodes.length);

    console.log(`\nPerformance Comparison on Cloud Spend Dataset (240 nodes, 1024 edges):`);
    console.log(`  Legacy Domain Layout Time: ${legacyTime.toFixed(2)} ms`);
    console.log(`  Feature Layout Time:       ${featureTime.toFixed(2)} ms`);
    console.log(`  Speedup:                   ${(legacyTime / featureTime).toFixed(2)}x`);

    // Verify disabling feature layout preserves baseline positions
    const legacyReRun = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
    let legacyDrift = 0;
    for (const nodeId of Object.keys(legacyLayout)) {
      const p1 = legacyLayout[nodeId];
      const p2 = legacyReRun[nodeId];
      legacyDrift = Math.max(legacyDrift, Math.hypot(p1.x - p2.x, p1.y - p2.y));
    }
    expect(legacyDrift).toBe(0);
  });
});
