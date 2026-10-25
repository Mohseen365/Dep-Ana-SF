import { describe, test, expect, vi } from 'vitest';
import { LayoutWorkerClient } from '../lib/workers/layout-worker-client';
import { runLayoutWithMetadataAsync } from '../lib/graph-layout';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';

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
    // Instantiate LayoutWorkerClient without worker factory to trigger synchronous fallback
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
    // Simulate Worker environment message handler
    const rawResult = computeArchitectureLayoutWithMetadata(
      [
        { id: 'LWC:sun', displayName: 'Sun', type: 'LWC', file: 'sun.js', risk: 'LOW' } as any,
        { id: 'ApexClass:Child', displayName: 'Child', type: 'ApexClass', file: 'Child.cls', risk: 'LOW' } as any,
        { id: 'ApexClass:Hidden', displayName: 'Hidden', type: 'ApexClass', file: 'Hidden.cls', risk: 'LOW' } as any,
      ],
      [{ id: 'e1', source: 'LWC:sun', target: 'ApexClass:Child', relationshipType: 'lwc-apex' } as any],
      { architectureMode: 'constellation' }
    );

    // Simulate layout.worker.ts response construction
    const serializedResponse = {
      type: 'LAYOUT_SUCCESS' as const,
      projectId: 'test-project',
      requestGeneration: 1,
      positions: rawResult.positions,
      projectedNodeIds: rawResult.projectedNodeIds ? Array.from(rawResult.projectedNodeIds) : undefined,
      computeDurationMs: 12,
    };

    expect(Array.isArray(serializedResponse.projectedNodeIds)).toBe(true);

    // Simulate mock worker factory passing serialized message
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

  test('runLayoutWithMetadataAsync invokes calculateLayoutAsync and populates projectedNodeIds for constellation mode', async () => {
    const showMock = vi.fn();
    const hideMock = vi.fn();
    const positionMock = vi.fn();

    const mockNodeEles = [
      { id: () => 'LWC:sun', show: showMock, hide: hideMock, position: positionMock, data: () => ({ id: 'LWC:sun', type: 'LWC' }) },
      { id: () => 'ApexClass:Child', show: showMock, hide: hideMock, position: positionMock, data: () => ({ id: 'ApexClass:Child', type: 'ApexClass' }) },
    ];

    const mockCy = {
      nodes: () => {
        const arr = [...mockNodeEles] as any;
        arr.filter = (predicate: any) => {
          const filtered = mockNodeEles.filter(n => predicate(n));
          return {
            show: showMock,
            hide: hideMock,
            forEach: (cb: any) => filtered.forEach(cb),
            style: vi.fn(),
          };
        };
        arr.forEach = (cb: any) => mockNodeEles.forEach(cb);
        return arr;
      },
      edges: () => {
        const arr = [] as any;
        arr.filter = () => ({
          show: showMock,
          hide: hideMock,
          style: vi.fn(),
        });
        arr.forEach = () => {};
        return arr;
      },
      elements: () => {
        const arr = [] as any;
        arr.filter = () => [];
        return arr;
      },
      batch: (cb: any) => cb(),
      fit: vi.fn(),
    } as any;

    const res = await runLayoutWithMetadataAsync(mockCy, {
      architectureMode: 'constellation',
    });

    expect(res.projectedNodeIds).toBeDefined();
    expect(res.projectedNodeIds).toBeInstanceOf(Set);
    expect(res.projectedNodeIds!.has('LWC:sun')).toBe(true);
  });
});
