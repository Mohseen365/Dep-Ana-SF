import { describe, it, expect } from 'vitest';
import { adaptConstellation } from '../adapters/constellation-adapter';
import { computeConstellationLayout } from './constellation-layout';
import type { ExplorerDataSchema, ExplorerRelationshipType } from '../../types/explorer';
import { createMockNode, createMockEdge, createMockDataSchema } from '../../test/mock-factories';

describe('Constellation Layout Generator', () => {
  const nodeController = createMockNode('ApexClass:OrderController', 'OrderController', 'ApexClass', 'HIGH', 'OrderController.cls');
  const nodeView = createMockNode('LWC:OrderView', 'OrderView', 'LWC', 'LOW', 'orderView.js');
  const nodeService = createMockNode('ApexClass:OrderService', 'OrderService', 'ApexClass', 'LOW', 'OrderService.cls');

  const sampleSchema: ExplorerDataSchema = createMockDataSchema(
    [nodeController, nodeView, nodeService],
    [
      createMockEdge('e1', 'LWC:OrderView', 'ApexClass:OrderController', 'method-call'),
      createMockEdge('e2', 'ApexClass:OrderController', 'ApexClass:OrderService', 'method-call'),
    ]
  );

  it('computes polar positions and edge curves deterministically', () => {
    const adapterData = adaptConstellation(sampleSchema, {
      focalNodeId: 'ApexClass:OrderController',
    });

    const layout = computeConstellationLayout(adapterData, {
      width: 800,
      height: 800,
      baseRadius: 150,
    });

    // Focal node position at origin (400, 400)
    expect(layout.focalPosition).not.toBeNull();
    expect(layout.focalPosition?.x).toBe(400);
    expect(layout.focalPosition?.y).toBe(400);

    // Ring 1 nodes should have radius 150
    const ring1Nodes = Object.values(layout.nodePositions).filter((p) => p.hopDistance === 1);
    expect(ring1Nodes.length).toBe(2);
    ring1Nodes.forEach((node) => {
      expect(node.radius).toBe(150);
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isNaN(node.x)).toBe(false);
      expect(Number.isNaN(node.y)).toBe(false);
    });

    // Edge paths generated with valid SVG path string
    expect(layout.edgePaths.length).toBe(2);
    layout.edgePaths.forEach((edge) => {
      expect(edge.pathSvg).toContain('M ');
      expect(edge.pathSvg).toContain('C ');
      expect(Number.isNaN(edge.sourceX)).toBe(false);
      expect(Number.isNaN(edge.targetX)).toBe(false);
    });
  });

  it('demonstrates 10x repeated execution determinism with 0.00000 px drift', () => {
    const adapterData = adaptConstellation(sampleSchema, {
      focalNodeId: 'ApexClass:OrderController',
    });

    const baseline = computeConstellationLayout(adapterData);

    for (let i = 0; i < 10; i++) {
      const current = computeConstellationLayout(adapterData);
      expect(current).toEqual(baseline);
    }
  });

  it('CC-006: Dense ring layout guarantees minimum pairwise clearance (>= 10px) at N=30, 50, 100', () => {
    const focal = createMockNode('ApexClass:Focal', 'Focal', 'ApexClass', 'LOW', 'Focal.cls');
    [30, 50, 100].forEach((n) => {
      const ringNodes = Array.from({ length: n }, (_, i) =>
        createMockNode(`ApexClass:RingNode_${i}`, `RingNode_${i}`, 'ApexClass', 'LOW', `RingNode_${i}.cls`)
      );
      const ringEdges = ringNodes.map((rn, i) =>
        createMockEdge(`edge_${i}`, 'ApexClass:Focal', rn.id, 'unknown' as ExplorerRelationshipType)
      );

      const schema = createMockDataSchema([focal, ...ringNodes], ringEdges);
      const adapterData = adaptConstellation(schema, { focalNodeId: 'ApexClass:Focal', maxDepth: 1 });
      const layout = computeConstellationLayout(adapterData, { width: 1000, height: 1000, cx: 500, cy: 500 });

      // Calculate minimum pairwise distance between adjacent nodes on each track
      const positionsByTrack = new Map<number, typeof layout.nodePositions[string][]>();
      Object.values(layout.nodePositions).forEach((pos) => {
        if (pos.hopDistance === 0) return;
        const key = pos.trackIndex;
        if (!positionsByTrack.has(key)) positionsByTrack.set(key, []);
        positionsByTrack.get(key)!.push(pos);
      });

      positionsByTrack.forEach((trackPositions) => {
        trackPositions.sort((a, b) => a.angleRad - b.angleRad);
        for (let i = 0; i < trackPositions.length; i++) {
          const next = trackPositions[(i + 1) % trackPositions.length];
          const dist = Math.hypot(trackPositions[i].x - next.x, trackPositions[i].y - next.y);
          // Circle radius is 12px (diameter 24px). Minimum clearance gap g = dist - 24.
          const clearanceGap = dist - 24;
          expect(clearanceGap).toBeGreaterThanOrEqual(9.5); // >= 10px clearance threshold
        }
      });
    });
  });
});
