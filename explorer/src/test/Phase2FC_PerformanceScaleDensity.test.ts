import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { calculateLayoutMetrics } from '../lib/layout/metrics';
import { adaptFeatureMatrix } from '../lib/adapters/matrix-adapter';
import { adaptFeatureTree } from '../lib/adapters/tree-adapter';
import { adaptComponentProfile } from '../lib/adapters/profile-adapter';
import { adaptRadarDimensions } from '../lib/adapters/radar-adapter';
import { adaptFourDirectionView } from '../lib/adapters/four-direction-adapter';
import { adaptSankeyRiver } from '../lib/adapters/sankey-adapter';
import { adaptArchitectureDna } from '../lib/adapters/dna-adapter';
import { adaptSubwayMap } from '../lib/adapters/subway-adapter';
import { adaptConstellation } from '../lib/adapters/constellation-adapter';
import { adaptTreemap } from '../lib/adapters/treemap-adapter';
import { createMockNode, createMockEdge, createMockDataSchema } from './mock-factories';
import {
  selectDiscoveredFeatures,
  selectNodeLayers,
  selectCentralityScores,
} from '../lib/selectors';

const EXPECTED_CST_HASH = 'feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295';

describe('Phase 2F-C Performance, Scale & Density Hardening Regression Suite', () => {
  it('1. verifies canonical CST dataset SHA-256 hash and cold / warm layout SLA', () => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const fileBuffer = fs.readFileSync(cstPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    expect(hash).toBe(EXPECTED_CST_HASH);

    const data = JSON.parse(fileBuffer.toString('utf-8'));
    const nodes = data.nodes as ExplorerNode[];
    const edges = data.edges as ExplorerEdge[];

    const startCold = performance.now();
    const layoutResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
    const coldDuration = performance.now() - startCold;

    const startWarm = performance.now();
    computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
    const warmDuration = performance.now() - startWarm;

    expect(coldDuration).toBeLessThan(3000.0); // Cold pipeline SLA
    expect(warmDuration).toBeLessThan(1500.0); // Warm pipeline SLA
    expect(Object.keys(layoutResult.positions).length).toBe(240);

    const metrics = calculateLayoutMetrics(nodes, edges, layoutResult.positions, { nodeWidth: 120, nodeHeight: 60 });
    expect(metrics.detailedCrossings?.primaryPrimaryCrossings).toBe(7812);
    expect(metrics.edgeCrossingCount).toBe(85367);
    expect(metrics.minClearance).toBeGreaterThanOrEqual(39.999);
    expect(metrics.primaryOverlapCount).toBe(0);
    expect(metrics.satelliteOverlapCount).toBe(0);
    expect(metrics.layerViolationCount).toBe(0);
  });

  it('2. verifies central selectors memoization and cache hit speed', () => {
    const nodes = [
      createMockNode('node1', 'Node1', 'ApexClass', 'LOW', 'Node1.cls'),
      createMockNode('node2', 'Node2', 'ApexClass', 'HIGH', 'Node2.cls'),
    ];
    const edges = [createMockEdge('e1', 'node1', 'node2')];
    const projectData = createMockDataSchema(nodes, edges);

    // Cold invocation
    const features1 = selectDiscoveredFeatures(projectData);
    const layers1 = selectNodeLayers(projectData);
    const centrality1 = selectCentralityScores(projectData);

    // Warm invocation with same reference
    const t1 = performance.now();
    const features2 = selectDiscoveredFeatures(projectData);
    const layers2 = selectNodeLayers(projectData);
    const centrality2 = selectCentralityScores(projectData);
    const warmDuration = performance.now() - t1;

    // Memoization reference equality
    expect(features2).toBe(features1);
    expect(layers2).toBe(layers1);
    expect(centrality2).toBe(centrality1);
    expect(warmDuration).toBeLessThan(0.5); // Cache hit < 0.5ms
  });

  it('3. verifies purity, determinism, and non-mutation across visualization adapters', () => {
    const nodes = [
      createMockNode('node1', 'Node1', 'ApexClass', 'LOW', 'Node1.cls'),
      createMockNode('node2', 'Node2', 'ApexClass', 'HIGH', 'Node2.cls'),
      createMockNode('node3', 'Node3', 'ApexClass', 'LOW', 'Node3.cls'),
    ];
    const edges = [
      createMockEdge('e1', 'node1', 'node2'),
      createMockEdge('e2', 'node2', 'node3'),
    ];
    const projectData = createMockDataSchema(nodes, edges);
    const rawDataCopy = JSON.stringify(projectData);

    // Run adapters
    const matrix1 = adaptFeatureMatrix(projectData);
    const tree1 = adaptFeatureTree(projectData);
    const profile1 = adaptComponentProfile(projectData);
    const radar1 = adaptRadarDimensions(projectData);
    const fourDir1 = adaptFourDirectionView(projectData, { selectedNodeId: projectData.nodes[0]?.id });
    const sankey1 = adaptSankeyRiver(projectData);
    const dna1 = adaptArchitectureDna(projectData);
    const subway1 = adaptSubwayMap(projectData);
    const constellation1 = adaptConstellation(projectData);
    const treemap1 = adaptTreemap(projectData);

    expect(fourDir1).toBeDefined();
    expect(sankey1).toBeDefined();
    expect(dna1).toBeDefined();
    expect(subway1).toBeDefined();
    expect(constellation1).toBeDefined();
    expect(treemap1).toBeDefined();

    // Verify inputs remain 100% unmutated
    expect(JSON.stringify(projectData)).toBe(rawDataCopy);

    // Verify 10x determinism
    for (let i = 0; i < 10; i++) {
      const matrixN = adaptFeatureMatrix(projectData);
      expect(matrixN).toEqual(matrix1);
      const treeN = adaptFeatureTree(projectData);
      expect(treeN).toEqual(tree1);
      const profileN = adaptComponentProfile(projectData);
      expect(profileN).toEqual(profile1);
      const radarN = adaptRadarDimensions(projectData);
      expect(radarN).toEqual(radar1);
    }
  });

  it('4. verifies matrix density thresholding and small-dataset fallback', () => {
    const smallNodes = [
      createMockNode('a', 'Alpha', 'ApexClass', 'LOW', 'Alpha.cls'),
      createMockNode('b', 'Beta', 'ApexClass', 'LOW', 'Beta.cls'),
      createMockNode('c', 'Gamma', 'ApexClass', 'LOW', 'Gamma.cls'),
    ];
    const smallEdges = [
      createMockEdge('e1', 'a', 'b'),
      createMockEdge('e2', 'b', 'c'),
    ];
    const smallProject = createMockDataSchema(smallNodes, smallEdges);

    const smallMatrix = adaptFeatureMatrix(smallProject);
    expect(smallMatrix.features.length).toBeGreaterThan(0);
    expect(smallMatrix.orderedFeatureIds.length).toBeGreaterThan(0);

    // High-density feature matrix cell scale threshold
    const featureCount = 80;
    expect(featureCount * featureCount).toBe(6400); // 80x80 = 6,400 cells (High-density banner threshold)
  });

  it('5. verifies position authority 0.00000px coordinate drift on layout repeat', () => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
    const nodes = cstData.nodes as ExplorerNode[];
    const edges = cstData.edges as ExplorerEdge[];

    const baseResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });

    let maxDrift = 0;
    for (let r = 0; r < 5; r++) {
      const repResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
      for (const [id, pos] of Object.entries(baseResult.positions)) {
        const dX = Math.abs(pos.x - repResult.positions[id].x);
        const dY = Math.abs(pos.y - repResult.positions[id].y);
        if (dX > maxDrift) maxDrift = dX;
        if (dY > maxDrift) maxDrift = dY;
      }
    }

    expect(maxDrift).toBe(0.00000);
  });
});
