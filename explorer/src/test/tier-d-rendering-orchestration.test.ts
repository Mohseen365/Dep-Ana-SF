import { describe, test, expect } from 'vitest';
import { computeComponentOrbitLayout } from '../lib/layout/component-orbit-layout';
import type { ComponentOrbitProjection } from '../lib/adapters/component-orbit-adapter';

describe('Tier D — Rendering & Orchestration Regression Suite', () => {
  test('D3 & D4: preserves adapter semantic intra-ring order and reports post-repair guide ring radius', () => {
    const projection: ComponentOrbitProjection = {
      focus: {
        nodeId: 'LWC:focal',
        displayName: 'Focal',
        type: 'LWC',
        file: 'focal.js',
        risk: 'LOW',
        depth: 0,
        ringIndex: 0,
        roleSymbol: '☉',
        isSun: true,
        isChildLwc: false,
        isSharedHub: false,
        dependentLwcCount: 0,
        dependentLwcIds: [],
        childLwcTargets: [],
        metrics: { fanIn: 0, fanOut: 2, coupling: 2, score: 0 },
        provenance: { sourceGraphNodeId: 'LWC:focal', nodeType: 'LWC' },
      },
      rings: [
        {
          ringIndex: 0,
          depth: 0,
          label: 'Focus Component (Sun)',
          items: [
            {
              nodeId: 'LWC:focal',
              displayName: 'Focal',
              type: 'LWC',
              file: 'focal.js',
              risk: 'LOW',
              depth: 0,
              ringIndex: 0,
              roleSymbol: '☉',
              isSun: true,
              isChildLwc: false,
              isSharedHub: false,
              dependentLwcCount: 0,
              dependentLwcIds: [],
              childLwcTargets: [],
              metrics: { fanIn: 0, fanOut: 2, coupling: 2, score: 0 },
              provenance: { sourceGraphNodeId: 'LWC:focal', nodeType: 'LWC' },
            },
          ],
          totalCount: 1,
        },
        {
          ringIndex: 1,
          depth: 1,
          label: 'Direct Dependencies (1-Hop)',
          items: [
            {
              nodeId: 'LWC:child-b',
              displayName: 'ChildB',
              type: 'LWC',
              file: 'childB.js',
              risk: 'LOW',
              depth: 1,
              ringIndex: 1,
              roleSymbol: '◎', // Role priority '◎' comes BEFORE '○'
              isSun: false,
              isChildLwc: true,
              isSharedHub: false,
              dependentLwcCount: 0,
              dependentLwcIds: [],
              childLwcTargets: [],
              metrics: { fanIn: 1, fanOut: 0, coupling: 1, score: 0 },
              provenance: { sourceGraphNodeId: 'LWC:child-b', nodeType: 'LWC' },
            },
            {
              nodeId: 'ApexClass:service-a',
              displayName: 'ServiceA',
              type: 'ApexClass',
              file: 'ServiceA.cls',
              risk: 'LOW',
              depth: 1,
              ringIndex: 1,
              roleSymbol: '○',
              isSun: false,
              isChildLwc: false,
              isSharedHub: false,
              dependentLwcCount: 0,
              dependentLwcIds: [],
              childLwcTargets: [],
              metrics: { fanIn: 1, fanOut: 0, coupling: 1, score: 0 },
              provenance: { sourceGraphNodeId: 'ApexClass:service-a', nodeType: 'ApexClass' },
            },
          ],
          totalCount: 2,
        },
      ],
      nodes: {
        'LWC:focal': {
          nodeId: 'LWC:focal',
          displayName: 'Focal',
          type: 'LWC',
          file: 'focal.js',
          risk: 'LOW',
          depth: 0,
          ringIndex: 0,
          roleSymbol: '☉',
          isSun: true,
          isChildLwc: false,
          isSharedHub: false,
          dependentLwcCount: 0,
          dependentLwcIds: [],
          childLwcTargets: [],
          metrics: { fanIn: 0, fanOut: 2, coupling: 2, score: 0 },
          provenance: { sourceGraphNodeId: 'LWC:focal', nodeType: 'LWC' },
        },
        'LWC:child-b': {
          nodeId: 'LWC:child-b',
          displayName: 'ChildB',
          type: 'LWC',
          file: 'childB.js',
          risk: 'LOW',
          depth: 1,
          ringIndex: 1,
          roleSymbol: '◎',
          isSun: false,
          isChildLwc: true,
          isSharedHub: false,
          dependentLwcCount: 0,
          dependentLwcIds: [],
          childLwcTargets: [],
          metrics: { fanIn: 1, fanOut: 0, coupling: 1, score: 0 },
          provenance: { sourceGraphNodeId: 'LWC:child-b', nodeType: 'LWC' },
        },
        'ApexClass:service-a': {
          nodeId: 'ApexClass:service-a',
          displayName: 'ServiceA',
          type: 'ApexClass',
          file: 'ServiceA.cls',
          risk: 'LOW',
          depth: 1,
          ringIndex: 1,
          roleSymbol: '○',
          isSun: false,
          isChildLwc: false,
          isSharedHub: false,
          dependentLwcCount: 0,
          dependentLwcIds: [],
          childLwcTargets: [],
          metrics: { fanIn: 1, fanOut: 0, coupling: 1, score: 0 },
          provenance: { sourceGraphNodeId: 'ApexClass:service-a', nodeType: 'ApexClass' },
        },
      },
      edges: [],
      availableSuns: [],
      unreachableNodeIds: [],
      summary: {
        focalLwcId: 'LWC:focal',
        totalReachableNodes: 3,
        totalUnreachableNodes: 0,
        totalEdges: 2,
        maxDepth: 1,
        ringCount: 2,
        childLwcCount: 1,
        sharedHubCount: 0,
      },
      options: {},
    };

    const output = computeComponentOrbitLayout(projection, { innerRadius: 280 });

    // D3: Child B ('◎') should be at first angle offset, Service A ('○') at second
    const posChildB = output.positions['LWC:child-b'];
    const posServiceA = output.positions['ApexClass:service-a'];

    expect(posChildB).toBeDefined();
    expect(posServiceA).toBeDefined();
    expect(posChildB.angle).toBeLessThan(posServiceA.angle);

    // D4: Guide ring 1 radius should reflect placed node radius
    expect(output.guides.rings[1]).toBeDefined();
    expect(output.guides.rings[1].radiusPx).toBeGreaterThanOrEqual(280);
  });
});
