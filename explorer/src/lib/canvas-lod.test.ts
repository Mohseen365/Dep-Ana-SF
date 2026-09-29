import { describe, it, expect } from 'vitest';
import { computeCanvasLODLevel } from './canvas-lod';

describe('Canvas LOD Deterministic Calculation', () => {
  it('1. returns LOD 0 for full fidelity zoom and small graphs', () => {
    const config = computeCanvasLODLevel({ zoom: 1.5, nodeCount: 240, edgeCount: 1024 });

    expect(config.lodLevel).toBe(0);
    expect(config.showNodeLabels).toBe(true);
    expect(config.showEdgeLabels).toBe(true);
    expect(config.showCompositionGroups).toBe(true);
    expect(config.showFindingBadges).toBe(true);
    expect(config.showFeatureRegionLabels).toBe(true);
    expect(config.simplifiedEdges).toBe(false);
    expect(config.edgeOpacityScale).toBe(1.0);
  });

  it('2. returns LOD 1 for mid zoom or N >= 1000', () => {
    const configZoom = computeCanvasLODLevel({ zoom: 0.8, nodeCount: 240, edgeCount: 1024 });
    const configScale = computeCanvasLODLevel({ zoom: 1.5, nodeCount: 1000, edgeCount: 2000 });

    expect(configZoom.lodLevel).toBe(1);
    expect(configScale.lodLevel).toBe(1);
    expect(configZoom.showNodeLabels).toBe(true);
    expect(configZoom.showEdgeLabels).toBe(false);
    expect(configZoom.showCompositionGroups).toBe(false);
  });

  it('3. returns LOD 2 for far zoom or N >= 2500', () => {
    const configScale = computeCanvasLODLevel({ zoom: 1.0, nodeCount: 2500, edgeCount: 5000 });

    expect(configScale.lodLevel).toBe(2);
    expect(configScale.showNodeLabels).toBe(false);
    expect(configScale.showFeatureRegionLabels).toBe(false);
    expect(configScale.simplifiedEdges).toBe(true);
  });

  it('4. returns LOD 3 for very far zoom or N >= 5000', () => {
    const configScale = computeCanvasLODLevel({ zoom: 1.0, nodeCount: 5000, edgeCount: 10000 });

    expect(configScale.lodLevel).toBe(3);
    expect(configScale.showFeatureRegionLabels).toBe(false);
    expect(configScale.simplifiedEdges).toBe(true);
  });

  it('5. returns LOD 4 for extreme scale N >= 10000', () => {
    const configScale = computeCanvasLODLevel({ zoom: 1.0, nodeCount: 10000, edgeCount: 20000 });

    expect(configScale.lodLevel).toBe(4);
    expect(configScale.edgeOpacityScale).toBe(0.25);
  });

  it('6. produces 100% deterministic results on repeated invocations', () => {
    const params = { zoom: 0.75, nodeCount: 1200, edgeCount: 2400 };

    const run1 = computeCanvasLODLevel(params);
    const run2 = computeCanvasLODLevel(params);

    expect(run1).toEqual(run2);
  });
});
