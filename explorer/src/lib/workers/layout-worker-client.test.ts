import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LayoutWorkerClient } from './layout-worker-client';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { LayoutWorkerResponse } from './layout-worker-types';

describe('LayoutWorkerClient reliability', () => {
  let mockWorker: any;
  let client: LayoutWorkerClient;

  const mockNodes: ExplorerNode[] = [
    {
      id: 'node1',
      displayName: 'Node 1',
      type: 'ApexClass',
      file: 'Node1.cls',
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        sharing: null,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      metrics: { fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
  ];

  const mockEdges: ExplorerEdge[] = [];

  beforeEach(() => {
    const listeners: Record<string, ((event: any) => void)[]> = {};

    mockWorker = {
      addEventListener: vi.fn((event: string, cb: (event: any) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: (event: any) => void) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter(l => l !== cb);
        }
      }),
      postMessage: vi.fn(),
      terminate: vi.fn(),
      _emitMessage: (data: LayoutWorkerResponse) => {
        if (listeners['message']) {
          listeners['message'].forEach(cb => cb({ data }));
        }
      },
      _emitError: (err: any) => {
        if (listeners['error']) {
          listeners['error'].forEach(cb => cb(err));
        }
      },
      _getListeners: () => listeners,
    };

    client = new LayoutWorkerClient({
      workerFactory: () => mockWorker,
    });
  });

  it('D9: cancelPendingRequest terminates worker and rejects active pending promise', async () => {
    const promise = client.calculateLayoutAsync({
      projectId: 'p1',
      nodes: mockNodes,
      edges: mockEdges,
    });

    client.cancelPendingRequest('User cancelled layout');

    await expect(promise).rejects.toThrow('User cancelled layout');
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('D9: superseding layout request cancels prior pending promise', async () => {
    const promise1 = client.calculateLayoutAsync({
      projectId: 'p1',
      nodes: mockNodes,
      edges: mockEdges,
    });

    const promise2 = client.calculateLayoutAsync({
      projectId: 'p1',
      nodes: mockNodes,
      edges: mockEdges,
    });

    await expect(promise1).rejects.toThrow(/Superceded/);

    // Simulate worker success for request 2
    mockWorker._emitMessage({
      type: 'LAYOUT_SUCCESS',
      projectId: 'p1',
      requestGeneration: client.getLatestRequestGeneration(),
      positions: { node1: { x: 10, y: 20 } },
      computeDurationMs: 5,
    });

    const res2 = await promise2;
    expect(res2.positions.node1).toEqual({ x: 10, y: 20 });
  });

  it('D9: times out after timeoutMs if worker does not respond and cleans up listeners', async () => {
    const promise = client.calculateLayoutAsync({
      projectId: 'p1',
      nodes: mockNodes,
      edges: mockEdges,
      timeoutMs: 100,
    } as any);

    await expect(promise).rejects.toThrow(/timed out|timeout/i);
    expect(mockWorker.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWorker.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  }, 2000);

  it('D10: converts projectedNodeIds array to Set<string> and featureRegionsSummary to Map', async () => {
    const promise = client.calculateLayoutAsync({
      projectId: 'p1',
      nodes: mockNodes,
      edges: mockEdges,
    });

    mockWorker._emitMessage({
      type: 'LAYOUT_SUCCESS',
      projectId: 'p1',
      requestGeneration: client.getLatestRequestGeneration(),
      positions: { node1: { x: 100, y: 200 } },
      projectedNodeIds: ['node1'],
      featureRegionsSummary: [
        {
          id: 'feature1',
          domainId: 'domain1',
          xMin: 0,
          xMax: 100,
          yMin: 0,
          yMax: 100,
          xCenter: 50,
          yCenter: 50,
        },
      ],
      computeDurationMs: 12,
    });

    const res = await promise;
    expect(res.projectedNodeIds).toBeInstanceOf(Set);
    expect(res.projectedNodeIds?.has('node1')).toBe(true);
    expect(res.featureRegions).toBeInstanceOf(Map);
    expect(res.featureRegions?.get('feature1')).toBeDefined();
    expect(res.featureRegions?.get('feature1')?.width).toBe(100);
  });

  it('D19: does NOT mutate input options, nodes, or edges, and defaults positions safely', async () => {
    const inputOptions = { enableFeatureLayout: true };
    const frozenOptions = Object.freeze({ ...inputOptions });

    const promise = client.calculateLayoutAsync({
      projectId: 'p1',
      nodes: mockNodes,
      edges: mockEdges,
      options: frozenOptions as any,
      userDragPositions: undefined,
      persistedPositions: undefined,
      existingCanvasPositions: undefined,
    });

    mockWorker._emitMessage({
      type: 'LAYOUT_SUCCESS',
      projectId: 'p1',
      requestGeneration: client.getLatestRequestGeneration(),
      positions: { node1: { x: 10, y: 20 } },
      computeDurationMs: 5,
    });

    const res = await promise;
    expect(res.positions.node1).toEqual({ x: 10, y: 20 });
    expect(frozenOptions).toEqual(inputOptions);
  });

  it('cleans up listeners on worker runtime error', async () => {
    const promise = client.calculateLayoutAsync({
      projectId: 'p1',
      nodes: mockNodes,
      edges: mockEdges,
    });

    mockWorker._emitError(new Error('Worker crashed'));

    const res = await promise;
    expect(res.isOffloaded).toBe(false);
    expect(mockWorker.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWorker.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
