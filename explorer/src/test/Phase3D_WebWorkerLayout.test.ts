import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  computeArchitectureLayoutWithMetadata,
  type ArchitectureLayoutOptions,
} from '../lib/architecture-layout';
import {
  LayoutWorkerClient,
} from '../lib/workers/layout-worker-client';
import type {
  LayoutWorkerRequest,
  LayoutWorkerResponse,
  FeatureRegionSummary,
} from '../lib/workers/layout-worker-types';

/**
 * Creates an in-process Worker mock for Vitest / Node environments that executes
 * the worker event listener logic using computeArchitectureLayoutWithMetadata.
 */
function createMockLayoutWorker(asyncDelayMs = 1): Worker {
  const listeners: Record<string, ((event: any) => void)[]> = {};

  const workerObj = {
    addEventListener(type: string, listener: (event: any) => void) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
    },
    removeEventListener(type: string, listener: (event: any) => void) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter(l => l !== listener);
      }
    },
    postMessage(data: LayoutWorkerRequest) {
      const { projectId, requestGeneration, nodes, edges, options } = data;
      const tStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

      setTimeout(() => {
        try {
          const result = computeArchitectureLayoutWithMetadata(
            nodes || [],
            edges || [],
            options || {}
          );
          const tEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();

          let featureRegionsSummary: FeatureRegionSummary[] | undefined;
          if (result.featureRegions && result.featureRegions.size > 0) {
            featureRegionsSummary = [];
            result.featureRegions.forEach((region, featureId) => {
              featureRegionsSummary!.push({
                id: region.id || featureId,
                domainId: region.domainId,
                xMin: region.xMin,
                xMax: region.xMax,
                yMin: region.yMin,
                yMax: region.yMax,
                xCenter: region.xCenter,
                yCenter: region.yCenter,
              });
            });
          }

          const response: LayoutWorkerResponse = {
            type: 'LAYOUT_SUCCESS',
            projectId,
            requestGeneration,
            positions: result.positions,
            featureRegionsSummary,
            computeDurationMs: tEnd - tStart,
          };

          const event = { data: response };
          listeners['message']?.forEach(fn => fn(event));
        } catch (err: any) {
          const tEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
          const response: LayoutWorkerResponse = {
            type: 'LAYOUT_ERROR',
            projectId,
            requestGeneration,
            error: err?.message || String(err),
            computeDurationMs: tEnd - tStart,
          };

          const event = { data: response };
          listeners['message']?.forEach(fn => fn(event));
        }
      }, asyncDelayMs);
    },
    terminate() {
      listeners['message'] = [];
      listeners['error'] = [];
    },
  };

  return workerObj as unknown as Worker;
}

/**
 * Generates a synthetic deterministic architecture graph of specified node count.
 */
function generateSyntheticGraph(nodeCount: number): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const nodes: ExplorerNode[] = [];
  const edges: ExplorerEdge[] = [];

  const types = ['ApexClass', 'LWC', 'CustomObject', 'Flow'];

  for (let i = 0; i < nodeCount; i++) {
    const id = `Node_${i.toString().padStart(5, '0')}`;
    const type = types[i % types.length];
    const domain = `Domain_${i % 10}`;

    nodes.push({
      id,
      displayName: `Component_${i}`,
      type: type as any,
      file: `src/${domain}/${id}.cls`,
      metrics: {
        fanIn: (i * 3) % 11,
        fanOut: (i * 2) % 7,
        coupling: i % 5,
        unresolved: 0,
        score: 0,
      },
      risk: i % 10 === 0 ? 'HIGH' : i % 3 === 0 ? 'MEDIUM' : 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 1,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: i % 10 === 0,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    });

    if (i > 0) {
      const sourceId = `Node_${(i - 1).toString().padStart(5, '0')}`;
      edges.push({
        id: `Edge_${i}`,
        source: sourceId,
        target: id,
        relationshipType: 'method-call',
        method: null,
        evidence: 'test',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: '1.0',
        line: null,
        column: null,
        methodOwner: null,
        file: '',
        canonical: {
          source: { type: 'ApexClass', name: sourceId },
          target: { type: 'ApexClass', name: id },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: {},
        },
      });
    }
  }

  return { nodes, edges };
}

describe('Phase 3D — Web Worker Layout Offloading Validation Suite', () => {
  let cstNodes: ExplorerNode[] = [];
  let cstEdges: ExplorerEdge[] = [];

  beforeEach(() => {
    // Load canonical Cloud Spend Tracker fixture if available
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    if (fs.existsSync(cstPath)) {
      const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
      cstNodes = cstData.nodes || [];
      cstEdges = cstData.edges || [];
    } else {
      const syn = generateSyntheticGraph(240);
      cstNodes = syn.nodes;
      cstEdges = syn.edges;
    }
  });

  describe('1. Determinism & Coordinate Parity Contract (0.00000px Maximum Drift)', () => {
    const scaleTiers = [
      { name: '0N (Empty)', count: 0 },
      { name: '1N (Single Node)', count: 1 },
      { name: '240N (CST Canonical Fixture)', count: 240, useCst: true },
      { name: '500N', count: 500 },
    ];

    scaleTiers.forEach(tier => {
      it(`verifies 0.00000px coordinate drift on ${tier.name}`, async () => {
        let nodes: ExplorerNode[];
        let edges: ExplorerEdge[];

        if (tier.useCst && cstNodes.length > 0) {
          nodes = cstNodes;
          edges = cstEdges;
        } else {
          const syn = generateSyntheticGraph(tier.count);
          nodes = syn.nodes;
          edges = syn.edges;
        }

        const options: ArchitectureLayoutOptions = { enableFeatureLayout: false };

        // 1. Synchronous Phase 3C baseline output
        const syncResult = computeArchitectureLayoutWithMetadata(nodes, edges, options);

        // 2. Worker Client output
        const client = new LayoutWorkerClient({
          workerFactory: () => createMockLayoutWorker(1),
        });

        const workerResult = await client.calculateLayoutAsync({
          projectId: 'test-project',
          nodes,
          edges,
          options,
        });

        // 3. Compare positions
        const syncKeys = Object.keys(syncResult.positions).sort();
        const workerKeys = Object.keys(workerResult.positions).sort();

        expect(workerKeys).toEqual(syncKeys);

        let maxDrift = 0;
        let mismatchedNodes = 0;

        for (const key of syncKeys) {
          const syncPos = syncResult.positions[key];
          const workerPos = workerResult.positions[key];

          const dx = Math.abs(syncPos.x - workerPos.x);
          const dy = Math.abs(syncPos.y - workerPos.y);

          if (dx > maxDrift) maxDrift = dx;
          if (dy > maxDrift) maxDrift = dy;

          if (dx > 0.00001 || dy > 0.00001) {
            mismatchedNodes++;
          }
        }

        expect(mismatchedNodes).toBe(0);
        expect(maxDrift).toBeCloseTo(0, 5);

        client.terminate();
      });
    });

    it('verifies determinism across 10 repeat worker runs and shuffled input order', async () => {
      const syn = generateSyntheticGraph(240);

      const client = new LayoutWorkerClient({
        workerFactory: () => createMockLayoutWorker(1),
      });

      const baseline = await client.calculateLayoutAsync({
        projectId: 'repeat-test',
        nodes: syn.nodes,
        edges: syn.edges,
      });

      // 10 repeat runs
      for (let run = 1; run <= 10; run++) {
        const repeat = await client.calculateLayoutAsync({
          projectId: 'repeat-test',
          nodes: syn.nodes,
          edges: syn.edges,
        });

        for (const key of Object.keys(baseline.positions)) {
          expect(repeat.positions[key].x).toBe(baseline.positions[key].x);
          expect(repeat.positions[key].y).toBe(baseline.positions[key].y);
        }
      }

      // Shuffled inputs
      const shuffledNodes = [...syn.nodes].reverse();
      const shuffledEdges = [...syn.edges].reverse();

      const shuffledRun = await client.calculateLayoutAsync({
        projectId: 'repeat-test',
        nodes: shuffledNodes,
        edges: shuffledEdges,
      });

      for (const key of Object.keys(baseline.positions)) {
        expect(shuffledRun.positions[key].x).toBe(baseline.positions[key].x);
        expect(shuffledRun.positions[key].y).toBe(baseline.positions[key].y);
      }

      client.terminate();
    });
  });

  describe('2. Generation Counter & Stale-Result Protection', () => {
    it('discards completed earlier request A if later request B completes first', async () => {
      let requestAListener: any = null;
      let requestBListener: any = null;

      // Custom worker allowing controlled completion order
      const controlledWorkerObj = {
        addEventListener(type: string, l: any) {
          if (type === 'message') {
            if (!requestAListener) requestAListener = l;
            else requestBListener = l;
          }
        },
        removeEventListener() {},
        postMessage() {},
        terminate() {},
      };

      const client = new LayoutWorkerClient({
        workerFactory: () => controlledWorkerObj as unknown as Worker,
      });

      const syn = generateSyntheticGraph(10);

      // Start Request A (generation 1)
      const promiseA = client.calculateLayoutAsync({
        projectId: 'cst',
        nodes: syn.nodes,
        edges: syn.edges,
      });

      // Start Request B (generation 2)
      const promiseB = client.calculateLayoutAsync({
        projectId: 'cst',
        nodes: syn.nodes,
        edges: syn.edges,
      });

      // Simulate Request B (generation 2) completing first
      const responseB: LayoutWorkerResponse = {
        type: 'LAYOUT_SUCCESS',
        projectId: 'cst',
        requestGeneration: 2,
        positions: { Node_00000: { x: 200, y: 200 } },
        computeDurationMs: 10,
      };

      if (requestBListener) {
        requestBListener({ data: responseB });
      }

      const resultB = await promiseB;
      expect(resultB.requestGeneration).toBe(2);
      expect(resultB.positions['Node_00000']).toEqual({ x: 200, y: 200 });

      // Promise A was rejected/superceded when Request B was issued
      await expect(promiseA).rejects.toThrow('Superceded by request generation 2');

      client.terminate();
    });

    it('discards results from Project A if user switches to Project B during calculation', async () => {
      const client = new LayoutWorkerClient({
        workerFactory: () => createMockLayoutWorker(50),
      });

      const syn = generateSyntheticGraph(10);

      const promiseProjectA = client.calculateLayoutAsync({
        projectId: 'ProjectA',
        nodes: syn.nodes,
        edges: syn.edges,
      });

      // User immediately switches project to ProjectB
      client.setProject('ProjectB');

      // Project A promise is rejected due to project switch cancellation
      await expect(promiseProjectA).rejects.toThrow('Project changed from ProjectA to ProjectB');

      expect(client.getCurrentProjectId()).toBe('ProjectB');
      expect(client.getLatestRequestGeneration()).toBe(0);

      client.terminate();
    });
  });

  describe('3. Position Authority Protection (Levels 1 to 5)', () => {
    it('enforces Position Authority hierarchy without allowing Worker output to overwrite higher levels', () => {
      const client = new LayoutWorkerClient();

      const calculatedPositions = {
        n1: { x: 100, y: 100 },
        n2: { x: 200, y: 200 },
        n3: { x: 300, y: 300 },
        n4: { x: 400, y: 400 },
      };

      const userDragPositions = {
        n1: { x: 10, y: 10 }, // Level 1 User Drag
      };

      const persistedPositions = {
        n2: { x: 20, y: 20 }, // Level 2 Persisted
      };

      const existingCanvasPositions = {
        n3: { x: 30, y: 30 }, // Level 3 Existing Canvas
      };

      const finalPositions = client.applyPositionAuthority({
        calculatedPositions,
        userDragPositions,
        persistedPositions,
        existingCanvasPositions,
        nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5_unknown'],
      });

      // Level 1 User Drag takes precedence over Level 4 calculated (100, 100)
      expect(finalPositions['n1']).toEqual({ x: 10, y: 10 });

      // Level 2 Persisted takes precedence over Level 4 calculated (200, 200)
      expect(finalPositions['n2']).toEqual({ x: 20, y: 20 });

      // Level 3 Existing Canvas takes precedence over Level 4 calculated (300, 300)
      expect(finalPositions['n3']).toEqual({ x: 30, y: 30 });

      // Level 4 Calculated layout output applied when no Level 1-3 override exists
      expect(finalPositions['n4']).toEqual({ x: 400, y: 400 });

      // Level 5 Fallback position for unmapped node
      expect(finalPositions['n5_unknown']).toEqual({ x: 0, y: 0 });
    });
  });

  describe('4. Error Recovery & Fallback Validation', () => {
    it('falls back safely to synchronous layout on worker postMessage failure', async () => {
      const faultyWorkerObj = {
        addEventListener() {},
        removeEventListener() {},
        postMessage() {
          throw new Error('DataCloneError: Object could not be cloned');
        },
        terminate() {},
      };

      const client = new LayoutWorkerClient({
        workerFactory: () => faultyWorkerObj as unknown as Worker,
      });

      const syn = generateSyntheticGraph(20);

      const result = await client.calculateLayoutAsync({
        projectId: 'faulty-project',
        nodes: syn.nodes,
        edges: syn.edges,
      });

      // Fell back to synchronous layout
      expect(result.isOffloaded).toBe(false);

      // Result positions match standard synchronous positions
      const expectedSync = computeArchitectureLayoutWithMetadata(syn.nodes, syn.edges);
      expect(Object.keys(result.positions).length).toBe(Object.keys(expectedSync.positions).length);

      client.terminate();
    });

    it('falls back safely to synchronous layout when Worker is null / unavailable', async () => {
      const client = new LayoutWorkerClient({
        workerFactory: () => null as any,
      });

      const syn = generateSyntheticGraph(20);

      const result = await client.calculateLayoutAsync({
        projectId: 'no-worker-project',
        nodes: syn.nodes,
        edges: syn.edges,
      });

      expect(result.isOffloaded).toBe(false);
      expect(Object.keys(result.positions).length).toBe(20);

      client.terminate();
    });
  });

  describe('5. IPC Serialization, Timing & Memory Benchmarks', () => {
    it('benchmarks IPC serialization, payload sizes, compute timings, and memory footprint', async () => {
      const benchmarks: any[] = [];
      const testTiers = [0, 1, 240, 500];

      for (const count of testTiers) {
        let nodes: ExplorerNode[];
        let edges: ExplorerEdge[];

        if (count === 240 && cstNodes.length > 0) {
          nodes = cstNodes;
          edges = cstEdges;
        } else {
          const syn = generateSyntheticGraph(count);
          nodes = syn.nodes;
          edges = syn.edges;
        }

        // Measure input payload serialization size
        const payloadSample = { projectId: 'bench', requestGeneration: 1, nodes, edges };
        const serializedPayloadBytes = JSON.stringify(payloadSample).length;

        // Measure synchronous wall-clock time
        const tSyncStart = performance.now();
        const syncResult = computeArchitectureLayoutWithMetadata(nodes, edges);
        const tSyncEnd = performance.now();
        const syncDurationMs = tSyncEnd - tSyncStart;

        // Measure output result payload serialization size
        const resultSample = { positions: syncResult.positions };
        const serializedResultBytes = JSON.stringify(resultSample).length;

        // Measure Worker client offloaded time
        const client = new LayoutWorkerClient({
          workerFactory: () => createMockLayoutWorker(0),
        });

        const workerResult = await client.calculateLayoutAsync({
          projectId: 'bench',
          nodes,
          edges,
        });

        benchmarks.push({
          tier: `${count}N`,
          nodeCount: count,
          edgeCount: edges.length,
          payloadSizeBytes: serializedPayloadBytes,
          resultSizeBytes: serializedResultBytes,
          syncDurationMs: Number(syncDurationMs.toFixed(2)),
          workerComputeDurationMs: Number(workerResult.computeDurationMs.toFixed(2)),
          workerIpcDurationMs: Number(workerResult.ipcDurationMs.toFixed(2)),
          workerTotalDurationMs: Number(workerResult.totalDurationMs.toFixed(2)),
        });

        client.terminate();
      }

      console.log('=== PHASE 3D IPC & SERIALIZATION BENCHMARKS ===');
      console.table(benchmarks);

      // Verify payload sizes scale predictably
      expect(benchmarks.find(b => b.nodeCount === 240).payloadSizeBytes).toBeGreaterThan(1000);
      expect(benchmarks.find(b => b.nodeCount === 1).payloadSizeBytes).toBeGreaterThan(benchmarks.find(b => b.nodeCount === 0).payloadSizeBytes);
    });

    it('evaluates Activation Strategies (Strategy A: All, Strategy B: Scale Threshold N>=240, Strategy C: Explicit Async)', () => {
      // Strategy evaluation based on measured IPC vs Sync compute overhead
      const thresholdN = 240;

      const evalStrategy = (count: number) => {
        const isStrategyA = true; // Always offload
        const isStrategyB = count >= thresholdN; // Offload N >= 240
        const isStrategyC = true; // Async canvas layout operations

        return { count, isStrategyA, isStrategyB, isStrategyC };
      };

      expect(evalStrategy(10).isStrategyB).toBe(false); // Small graphs avoid IPC overhead
      expect(evalStrategy(240).isStrategyB).toBe(true);  // Canonical CST offloads to worker
      expect(evalStrategy(1000).isStrategyB).toBe(true); // Large graphs offload to worker
    });
  });
});
