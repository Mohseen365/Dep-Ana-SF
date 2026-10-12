import { describe, test, expect, vi } from 'vitest';
import { LayoutWorkerClient } from '../lib/workers/layout-worker-client';
import { runLayoutWithMetadata, runLayoutWithMetadataAsync } from '../lib/graph-layout';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';

function createMockCy(
  nodesData: Array<{ id: string; type: string; displayName?: string; file?: string }>,
  edgesData: Array<{ id: string; source: string; target: string; relationshipType?: string }>
) {
  const visibleNodes = new Set<string>(nodesData.map(n => n.id));
  const visibleEdges = new Set<string>(edgesData.map(e => e.id));

  const nodeMap = new Map<string, any>();
  nodesData.forEach(data => {
    nodeMap.set(data.id, {
      id: () => data.id,
      position: vi.fn(),
      data: (key?: string) => {
        const obj = { label: data.displayName || data.id, type: data.type, file: data.file || '', ...data };
        return key ? (obj as any)[key] : obj;
      },
    });
  });

  const edgeMap = new Map<string, any>();
  edgesData.forEach(data => {
    edgeMap.set(data.id, {
      id: () => data.id,
      position: vi.fn(),
      data: (key?: string) => {
        const obj = { relationshipType: 'lwc-apex', ...data };
        return key ? (obj as any)[key] : obj;
      },
    });
  });

  const makeCollection = (items: any[], kind: 'nodes' | 'edges') => {
    const coll: any = [...items];
    coll.show = () => {
      items.forEach(item => {
        if (kind === 'nodes') visibleNodes.add(item.id());
        else visibleEdges.add(item.id());
      });
    };
    coll.hide = () => {
      items.forEach(item => {
        if (kind === 'nodes') visibleNodes.delete(item.id());
        else visibleEdges.delete(item.id());
      });
    };
    coll.style = vi.fn();
    coll.forEach = (cb: any) => items.forEach(cb);
    coll.filter = (predicate: any) => {
      const filtered = items.filter(predicate);
      return makeCollection(filtered, kind);
    };
    return coll;
  };

  const mockCy = {
    nodes: () => makeCollection(Array.from(nodeMap.values()), 'nodes'),
    edges: () => makeCollection(Array.from(edgeMap.values()), 'edges'),
    elements: () => {
      const all = [...Array.from(nodeMap.values()), ...Array.from(edgeMap.values())];
      const coll: any = [...all];
      coll.filter = (predicate: any) => {
        const filtered = all.filter(item => {
          const mockEle = {
            isNode: () => nodeMap.has(item.id()),
            id: item.id,
            data: (key?: string) => item.data(key),
          };
          return predicate(mockEle);
        });
        return filtered;
      };
      return coll;
    },
    batch: (cb: any) => cb(),
    fit: vi.fn(),
    visibleNodes,
    visibleEdges,
  } as any;

  return mockCy;
}

describe('FINDING-01 — Web Worker Projection IPC Serialization and Async Visibility Contract', () => {
  test('computeArchitectureLayoutWithMetadata returns projectedNodeIds Set for orbit and constellation modes', () => {
    const nodes = [
      { id: 'LWC:container', displayName: 'Container', type: 'LWC', file: 'container.js', risk: 'LOW' } as any,
      { id: 'ApexClass:Controller', displayName: 'Controller', type: 'ApexClass', file: 'Controller.cls', risk: 'LOW' } as any,
      { id: 'ApexClass:Unrelated', displayName: 'Unrelated', type: 'ApexClass', file: 'Unrelated.cls', risk: 'LOW' } as any,
    ];
    const edges = [
      { id: 'e1', source: 'LWC:container', target: 'ApexClass:Controller', relationshipType: 'lwc-apex' } as any,
    ];

    const orbitRes = computeArchitectureLayoutWithMetadata(nodes, edges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:container',
      componentOrbitOptions: { maxDepth: 1 },
    });

    expect(orbitRes.projectedNodeIds).toBeDefined();
    expect(orbitRes.projectedNodeIds).toBeInstanceOf(Set);
    expect(orbitRes.projectedNodeIds!.has('LWC:container')).toBe(true);
    expect(orbitRes.projectedNodeIds!.has('ApexClass:Controller')).toBe(true);
    expect(orbitRes.projectedNodeIds!.has('ApexClass:Unrelated')).toBe(false);

    const constellationRes = computeArchitectureLayoutWithMetadata(nodes, edges, {
      architectureMode: 'constellation',
    });

    expect(constellationRes.projectedNodeIds).toBeDefined();
    expect(constellationRes.projectedNodeIds).toBeInstanceOf(Set);
    expect(constellationRes.projectedNodeIds!.has('LWC:container')).toBe(true);
  });

  test('LayoutWorkerClient synchronous fallback preserves projectedNodeIds Set', async () => {
    const client = new LayoutWorkerClient();

    const nodes = [
      { id: 'LWC:container', displayName: 'Container', type: 'LWC', file: 'container.js', risk: 'LOW' } as any,
      { id: 'ApexClass:Controller', displayName: 'Controller', type: 'ApexClass', file: 'Controller.cls', risk: 'LOW' } as any,
    ];
    const edges = [
      { id: 'e1', source: 'LWC:container', target: 'ApexClass:Controller', relationshipType: 'lwc-apex' } as any,
    ];

    const result = await client.calculateLayoutAsync({
      projectId: 'test-project',
      nodes,
      edges,
      options: {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:container',
      },
    });

    expect(result.projectedNodeIds).toBeDefined();
    expect(result.projectedNodeIds).toBeInstanceOf(Set);
    expect(result.projectedNodeIds!.has('LWC:container')).toBe(true);
    expect(result.projectedNodeIds!.has('ApexClass:Controller')).toBe(true);
  });

  test('Mock Worker IPC postMessage converts projectedNodeIds Set to Array and reconstructs Set on client', async () => {
    const rawResult = computeArchitectureLayoutWithMetadata(
      [
        { id: 'LWC:sun', displayName: 'Sun', type: 'LWC', file: 'sun.js', risk: 'LOW' } as any,
        { id: 'ApexClass:Child', displayName: 'Child', type: 'ApexClass', file: 'Child.cls', risk: 'LOW' } as any,
        { id: 'ApexClass:Hidden', displayName: 'Hidden', type: 'ApexClass', file: 'Hidden.cls', risk: 'LOW' } as any,
      ],
      [{ id: 'e1', source: 'LWC:sun', target: 'ApexClass:Child', relationshipType: 'lwc-apex' } as any],
      { architectureMode: 'constellation' }
    );

    const serializedResponse = {
      type: 'LAYOUT_SUCCESS' as const,
      projectId: 'test-project',
      requestGeneration: 1,
      positions: rawResult.positions,
      projectedNodeIds: rawResult.projectedNodeIds ? Array.from(rawResult.projectedNodeIds) : undefined,
      computeDurationMs: 12,
    };

    expect(Array.isArray(serializedResponse.projectedNodeIds)).toBe(true);

    let messageListener: any;
    const mockWorker = {
      postMessage: (data: any) => {
        setTimeout(() => {
          if (messageListener) {
            messageListener({ data: serializedResponse });
          }
        }, 0);
      },
      addEventListener: (type: string, listener: any) => {
        if (type === 'message') messageListener = listener;
      },
      removeEventListener: () => {},
      terminate: () => {},
    } as any;

    const client = new LayoutWorkerClient({
      workerFactory: () => mockWorker,
    });

    const asyncResult = await client.calculateLayoutAsync({
      projectId: 'test-project',
      nodes: [],
      edges: [],
      options: { architectureMode: 'constellation' },
    });

    expect(asyncResult.isOffloaded).toBe(true);
    expect(asyncResult.projectedNodeIds).toBeDefined();
    expect(asyncResult.projectedNodeIds).toBeInstanceOf(Set);
    expect(asyncResult.projectedNodeIds!.has('LWC:sun')).toBe(true);
    expect(asyncResult.projectedNodeIds!.has('ApexClass:Child')).toBe(true);
    expect(asyncResult.projectedNodeIds!.has('ApexClass:Hidden')).toBe(false);
  });

  test('Orbit mode: runLayoutWithMetadataAsync filters unprojected nodes and invalid edges', async () => {
    const nodes = [
      { id: 'LWC:focal', type: 'LWC' },
      { id: 'ApexClass:satellite', type: 'ApexClass' },
      { id: 'ApexClass:unrelated', type: 'ApexClass' },
    ];
    const edges = [
      { id: 'e_valid', source: 'LWC:focal', target: 'ApexClass:satellite', relationshipType: 'lwc-apex' },
      { id: 'e_invalid', source: 'ApexClass:satellite', target: 'ApexClass:unrelated', relationshipType: 'method-call' },
    ];

    const cy = createMockCy(nodes, edges);

    const res = await runLayoutWithMetadataAsync(cy, {
      nodes,
      edges,
      architectureMode: 'orbit',
      focalLwcId: 'LWC:focal',
      componentOrbitOptions: { maxDepth: 1 },
    });

    expect(res.projectedNodeIds).toBeDefined();
    expect(res.projectedNodeIds!.has('LWC:focal')).toBe(true);
    expect(res.projectedNodeIds!.has('ApexClass:satellite')).toBe(true);
    expect(res.projectedNodeIds!.has('ApexClass:unrelated')).toBe(false);

    expect(cy.visibleNodes.has('LWC:focal')).toBe(true);
    expect(cy.visibleNodes.has('ApexClass:satellite')).toBe(true);
    expect(cy.visibleNodes.has('ApexClass:unrelated')).toBe(false);

    expect(cy.visibleEdges.has('e_valid')).toBe(true);
    expect(cy.visibleEdges.has('e_invalid')).toBe(false);
  });

  test('Constellation mode: runLayoutWithMetadataAsync excludes unprojected nodes and retains projected nodes and valid edges', async () => {
    const nodes = [
      { id: 'LWC:sun', type: 'LWC' },
      { id: 'ApexClass:connected', type: 'ApexClass' },
      { id: 'ApexClass:unprojected', type: 'ApexClass' },
    ];
    const edges = [
      { id: 'e_projected', source: 'LWC:sun', target: 'ApexClass:connected', relationshipType: 'lwc-apex' },
      { id: 'e_unprojected', source: 'ApexClass:connected', target: 'ApexClass:unprojected', relationshipType: 'method-call' },
    ];

    const cy = createMockCy(nodes, edges);

    const res = await runLayoutWithMetadataAsync(cy, {
      nodes,
      edges,
      architectureMode: 'constellation',
    });

    expect(res.projectedNodeIds).toBeDefined();
    expect(res.projectedNodeIds!.has('LWC:sun')).toBe(true);
    expect(res.projectedNodeIds!.has('ApexClass:connected')).toBe(true);
    expect(res.projectedNodeIds!.has('ApexClass:unprojected')).toBe(false);

    // Assert DOM elements in cytoscape core are properly shown / hidden
    expect(cy.visibleNodes.has('LWC:sun')).toBe(true);
    expect(cy.visibleNodes.has('ApexClass:connected')).toBe(true);
    expect(cy.visibleNodes.has('ApexClass:unprojected')).toBe(false);

    expect(cy.visibleEdges.has('e_projected')).toBe(true);
    expect(cy.visibleEdges.has('e_unprojected')).toBe(false);
  });

  test('Hierarchical and Hybrid modes: runLayoutWithMetadataAsync retains all nodes and edges', async () => {
    const nodes = [
      { id: 'ApexClass:A', type: 'ApexClass' },
      { id: 'ApexClass:B', type: 'ApexClass' },
    ];
    const edges = [
      { id: 'e1', source: 'ApexClass:A', target: 'ApexClass:B' },
    ];

    const cyHierarchical = createMockCy(nodes, edges);
    await runLayoutWithMetadataAsync(cyHierarchical, {
      nodes,
      edges,
      architectureMode: 'hierarchical',
    });
    expect(cyHierarchical.visibleNodes.has('ApexClass:A')).toBe(true);
    expect(cyHierarchical.visibleNodes.has('ApexClass:B')).toBe(true);
    expect(cyHierarchical.visibleEdges.has('e1')).toBe(true);

    const cyHybrid = createMockCy(nodes, edges);
    await runLayoutWithMetadataAsync(cyHybrid, {
      nodes,
      edges,
      architectureMode: 'hybrid',
    });
    expect(cyHybrid.visibleNodes.has('ApexClass:A')).toBe(true);
    expect(cyHybrid.visibleNodes.has('ApexClass:B')).toBe(true);
    expect(cyHybrid.visibleEdges.has('e1')).toBe(true);
  });

  test('Synchronous fallback path (runLayoutWithMetadata): Constellation mode filtering behaves identically', () => {
    const nodes = [
      { id: 'LWC:sun', type: 'LWC' },
      { id: 'ApexClass:connected', type: 'ApexClass' },
      { id: 'ApexClass:unprojected', type: 'ApexClass' },
    ];
    const edges = [
      { id: 'e_projected', source: 'LWC:sun', target: 'ApexClass:connected', relationshipType: 'lwc-apex' },
      { id: 'e_unprojected', source: 'ApexClass:connected', target: 'ApexClass:unprojected', relationshipType: 'method-call' },
    ];

    const cy = createMockCy(nodes, edges);

    const res = runLayoutWithMetadata(cy, {
      nodes,
      edges,
      architectureMode: 'constellation',
    });

    expect(res.projectedNodeIds).toBeDefined();
    expect(res.projectedNodeIds!.has('LWC:sun')).toBe(true);
    expect(res.projectedNodeIds!.has('ApexClass:connected')).toBe(true);
    expect(res.projectedNodeIds!.has('ApexClass:unprojected')).toBe(false);

    expect(cy.visibleNodes.has('LWC:sun')).toBe(true);
    expect(cy.visibleNodes.has('ApexClass:connected')).toBe(true);
    expect(cy.visibleNodes.has('ApexClass:unprojected')).toBe(false);

    expect(cy.visibleEdges.has('e_projected')).toBe(true);
    expect(cy.visibleEdges.has('e_unprojected')).toBe(false);
  });
});
