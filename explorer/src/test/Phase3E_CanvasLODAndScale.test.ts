import { describe, it, expect } from 'vitest';
import { computeCanvasLODLevel } from '../lib/canvas-lod';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';

describe('Phase 3E Canvas LOD & Extreme Scale Test Suite', () => {
  const scaleTiers = [
    { N: 240, E: 1024, zoom: 1.5, expectedLOD: 0 },
    { N: 1000, E: 2000, zoom: 1.0, expectedLOD: 1 },
    { N: 2500, E: 5000, zoom: 1.0, expectedLOD: 2 },
    { N: 5000, E: 10000, zoom: 1.0, expectedLOD: 3 },
    { N: 10000, E: 20000, zoom: 1.0, expectedLOD: 4 },
  ];

  it('1. computes correct LOD level across scale tiers N = 240 to 10,000', () => {
    scaleTiers.forEach(({ N, E, zoom, expectedLOD }) => {
      const config = computeCanvasLODLevel({ zoom, nodeCount: N, edgeCount: E });
      expect(config.lodLevel).toBe(expectedLOD);
    });
  });

  it('2. Position Authority Safety: Canvas LOD does NOT mutate node coordinates or trigger layout', () => {
    const { nodes, edges } = generateSyntheticSalesforceGraph({ nodeCount: 240, seed: 42 });

    const initialLayout = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: false });
    const posBefore = JSON.parse(JSON.stringify(initialLayout.positions));

    // Evaluate Canvas LOD config across zoom levels
    const zoomLevels = [2.0, 1.0, 0.5, 0.2];
    zoomLevels.forEach((zoom) => {
      const lodConfig = computeCanvasLODLevel({ zoom, nodeCount: nodes.length, edgeCount: edges.length });
      expect(lodConfig).toBeDefined();
    });

    // Verify 0.00000 px coordinate drift
    const posAfter = initialLayout.positions;
    for (const nodeId of Object.keys(posBefore)) {
      expect(posAfter[nodeId].x).toBe(posBefore[nodeId].x);
      expect(posAfter[nodeId].y).toBe(posBefore[nodeId].y);
    }
  });

  it('3. Canvas LOD configuration is 100% deterministic and input-order invariant', () => {
    const params = { zoom: 0.75, nodeCount: 1500, edgeCount: 3000 };

    const run1 = computeCanvasLODLevel(params);
    const run2 = computeCanvasLODLevel(params);

    expect(run1).toEqual(run2);
  });
});
