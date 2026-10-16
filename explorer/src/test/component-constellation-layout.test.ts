import { describe, test, expect } from 'vitest';
import { computeComponentConstellationLayout } from '../lib/layout/component-constellation-layout';
import type { ComponentConstellationProjection } from '../lib/adapters/component-constellation-adapter';

describe('Tier A2 — General Shared Node Constellation Resolver', () => {
  test('displaces 3 co-located shared nodes and 1 shared node inside Sun AABB to satisfy minSharedNodeAabbClearancePx', () => {
    const projection: ComponentConstellationProjection = {
      innerSuns: [
        {
          nodeId: 'LWC:sun-1',
          type: 'LWC',
          isSun: true,
          sunRing: 'inner',
          isSharedNode: false,
          referencingSunIds: ['LWC:sun-1'],
          unsharedChildCount: 0,
        },
        {
          nodeId: 'LWC:sun-2',
          type: 'LWC',
          isSun: true,
          sunRing: 'inner',
          isSharedNode: false,
          referencingSunIds: ['LWC:sun-2'],
          unsharedChildCount: 0,
        },
      ],
      outerSuns: [],
      nodes: {
        'LWC:sun-1': {
          nodeId: 'LWC:sun-1',
          type: 'LWC',
          isSun: true,
          sunRing: 'inner',
          isSharedNode: false,
          referencingSunIds: ['LWC:sun-1'],
          unsharedChildCount: 0,
        },
        'LWC:sun-2': {
          nodeId: 'LWC:sun-2',
          type: 'LWC',
          isSun: true,
          sunRing: 'inner',
          isSharedNode: false,
          referencingSunIds: ['LWC:sun-2'],
          unsharedChildCount: 0,
        },
        'ApexClass:Shared1': {
          nodeId: 'ApexClass:Shared1',
          type: 'ApexClass',
          isSun: false,
          sunRing: null,
          isSharedNode: true,
          referencingSunIds: ['LWC:sun-1', 'LWC:sun-2'],
          unsharedChildCount: 0,
        },
        'ApexClass:Shared2': {
          nodeId: 'ApexClass:Shared2',
          type: 'ApexClass',
          isSun: false,
          sunRing: null,
          isSharedNode: true,
          referencingSunIds: ['LWC:sun-1', 'LWC:sun-2'],
          unsharedChildCount: 0,
        },
        'ApexClass:Shared3': {
          nodeId: 'ApexClass:Shared3',
          type: 'ApexClass',
          isSun: false,
          sunRing: null,
          isSharedNode: true,
          referencingSunIds: ['LWC:sun-1', 'LWC:sun-2'],
          unsharedChildCount: 0,
        },
        'ApexClass:SharedSun1Inside': {
          nodeId: 'ApexClass:SharedSun1Inside',
          type: 'ApexClass',
          isSun: false,
          sunRing: null,
          isSharedNode: true,
          referencingSunIds: ['LWC:sun-1'],
          unsharedChildCount: 0,
        },
      },
      summary: {
        totalUniqueNodes: 6,
        sunCount: 2,
        innerSunCount: 2,
        outerSunCount: 0,
        sharedNodeCount: 4,
        unsharedNodeCount: 0,
        unreachableNodeCount: 0,
      },
      unreachableNodeIds: [],
    };

    const output = computeComponentConstellationLayout(projection, {
      sharedNodeSunAabbClearance: 120,
    });

    expect(output.diagnostics.sharedNodeCount).toBe(4);
    expect(output.diagnostics.displacedSharedNodeCount).toBeGreaterThan(0);
    expect(output.diagnostics.minSharedNodeAabbClearancePx).toBeGreaterThanOrEqual(120);
    expect(output.diagnostics.invariantViolations).toBeUndefined();
  });
});
