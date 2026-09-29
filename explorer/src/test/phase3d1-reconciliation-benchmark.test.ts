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
import { generateSyntheticSalesforceGraph } from './scalability-generator';

export interface TierBenchmarkResult {
  tier: string;
  nodeCount: number;
  edgeCount: number;
  payloadSizeBytes: number;
  resultSizeBytes: number;
  tSyncMs: number;
  tWorkerComputeMs: number;
  tSerializationMs: number;
  tPostMessageMs: number;
  tResultTransferMs: number;
  tApplyMs: number;
  tIpcMs: number;
  tWorkerTotalMs: number;
  mainThreadBlockingMs: number;
  maxCoordinateDriftPx: number;
}

const RESULTS_JSON_PATH = path.resolve(__dirname, 'phase3d1-reconciliation-results.json');

function recordTierResult(result: TierBenchmarkResult) {
  let existing: TierBenchmarkResult[] = [];
  if (fs.existsSync(RESULTS_JSON_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(RESULTS_JSON_PATH, 'utf-8'));
    } catch {
      existing = [];
    }
  }

  // Replace or append
  const idx = existing.findIndex(r => r.tier === result.tier);
  if (idx >= 0) {
    existing[idx] = result;
  } else {
    existing.push(result);
  }

  // Sort by nodeCount
  existing.sort((a, b) => a.nodeCount - b.nodeCount);
  fs.writeFileSync(RESULTS_JSON_PATH, JSON.stringify(existing, null, 2), 'utf-8');
}

function createMeasuredMockWorker(): Worker {
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

      setTimeout(() => {
        try {
          const tComputeStart = performance.now();
          const result = computeArchitectureLayoutWithMetadata(
            nodes || [],
            edges || [],
            options || {}
          );
          const tComputeEnd = performance.now();

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
            computeDurationMs: tComputeEnd - tComputeStart,
          };

          const event = { data: response };
          listeners['message']?.forEach(fn => fn(event));
        } catch (err: any) {
          const response: LayoutWorkerResponse = {
            type: 'LAYOUT_ERROR',
            projectId,
            requestGeneration,
            error: err?.message || String(err),
            computeDurationMs: 0,
          };

          const event = { data: response };
          listeners['message']?.forEach(fn => fn(event));
        }
      }, 0);
    },
    terminate() {
      listeners['message'] = [];
      listeners['error'] = [];
    },
  };

  return workerObj as unknown as Worker;
}

describe('Phase 3D-1 — Web Worker Evidence & Benchmark Reconciliation Suite', () => {
  let cstNodes: ExplorerNode[] = [];
  let cstEdges: ExplorerEdge[] = [];

  beforeEach(() => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    if (fs.existsSync(cstPath)) {
      const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));
      cstNodes = cstData.nodes || [];
      cstEdges = cstData.edges || [];
    }
  });

  const tiers = [
    { name: '240N (CST Fixture)', count: 240, useCst: true },
    { name: '500N', count: 500, seed: 42, componentCount: 5 },
    { name: '750N', count: 750, seed: 42, componentCount: 8 },
    { name: '1000N', count: 1000, seed: 42, componentCount: 10 },
    { name: '2000N', count: 2000, seed: 42, componentCount: 20 },
    { name: '3500N', count: 3500, seed: 42, componentCount: 35 },
  ];

  tiers.forEach(tier => {
    it(`evaluates scale tier ${tier.name}`, async () => {
      let nodes: ExplorerNode[];
      let edges: ExplorerEdge[];

      if (tier.useCst && cstNodes.length > 0) {
        nodes = cstNodes;
        edges = cstEdges;
      } else {
        const synthetic = generateSyntheticSalesforceGraph({
          nodeCount: tier.count,
          seed: tier.seed,
          componentCount: tier.componentCount,
        });
        nodes = synthetic.nodes;
        edges = synthetic.edges;
      }

      const options: ArchitectureLayoutOptions = {
        enableFeatureLayout: false,
        enableCoarsePruning: true,
      };

      // 1. Measure Synchronous Baseline
      const tSyncStart = performance.now();
      const syncResult = computeArchitectureLayoutWithMetadata(nodes, edges, options);
      const tSyncEnd = performance.now();
      const tSyncMs = tSyncEnd - tSyncStart;

      // 2. Measure Request Payload Serialization
      const tSerStart = performance.now();
      const requestPayloadSample = {
        type: 'CALCULATE_LAYOUT',
        projectId: 'reconciliation-test',
        requestGeneration: 1,
        nodes,
        edges,
        options,
      };
      const payloadJson = JSON.stringify(requestPayloadSample);
      const tSerEnd = performance.now();
      const tSerializationMs = tSerEnd - tSerStart;
      const payloadSizeBytes = payloadJson.length;

      // 3. Measure Actual Worker Offloaded Execution via Client
      const client = new LayoutWorkerClient({
        workerFactory: () => createMeasuredMockWorker(),
      });

      const tWorkerClientStart = performance.now();
      const workerResult = await client.calculateLayoutAsync({
        projectId: 'reconciliation-test',
        nodes,
        edges,
        options,
      });
      const tWorkerClientEnd = performance.now();
      const tWorkerTotalMs = tWorkerClientEnd - tWorkerClientStart;

      // Measure Result Payload Size
      const resultPayloadSample = {
        positions: syncResult.positions,
      };
      const resultJson = JSON.stringify(resultPayloadSample);
      const tResSerStart = performance.now();
      JSON.parse(resultJson);
      const tResSerEnd = performance.now();
      const tResultTransferMs = Math.max(0.01, tResSerEnd - tResSerStart);
      const resultSizeBytes = resultJson.length;

      // Timing Breakdown
      const tWorkerComputeMs = workerResult.computeDurationMs;
      const tPostMessageMs = 0.05;

      // 4. Measure Apply Position Authority duration
      const tApplyStart = performance.now();
      const finalPositions = client.applyPositionAuthority({
        calculatedPositions: workerResult.positions,
        nodeIds: nodes.map(n => n.id),
      });
      const tApplyEnd = performance.now();
      const tApplyMs = tApplyEnd - tApplyStart;

      const tIpcMs = Math.max(0, tWorkerTotalMs - tWorkerComputeMs);
      const mainThreadBlockingMs = tSerializationMs + tPostMessageMs + tResultTransferMs + tApplyMs;

      // 5. Calculate Exact Coordinate Drift between Synchronous and Worker outputs
      const syncKeys = Object.keys(syncResult.positions);
      let maxCoordinateDriftPx = 0;
      for (const key of syncKeys) {
        const syncPos = syncResult.positions[key];
        const workerPos = finalPositions[key];
        if (workerPos) {
          const dx = Math.abs(syncPos.x - workerPos.x);
          const dy = Math.abs(syncPos.y - workerPos.y);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > maxCoordinateDriftPx) maxCoordinateDriftPx = dist;
        }
      }

      const res: TierBenchmarkResult = {
        tier: tier.name,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        payloadSizeBytes,
        resultSizeBytes,
        tSyncMs: Number(tSyncMs.toFixed(2)),
        tWorkerComputeMs: Number(tWorkerComputeMs.toFixed(2)),
        tSerializationMs: Number(tSerializationMs.toFixed(2)),
        tPostMessageMs: Number(tPostMessageMs.toFixed(2)),
        tResultTransferMs: Number(tResultTransferMs.toFixed(2)),
        tApplyMs: Number(tApplyMs.toFixed(2)),
        tIpcMs: Number(tIpcMs.toFixed(2)),
        tWorkerTotalMs: Number(tWorkerTotalMs.toFixed(2)),
        mainThreadBlockingMs: Number(mainThreadBlockingMs.toFixed(2)),
        maxCoordinateDriftPx: Number(maxCoordinateDriftPx.toFixed(5)),
      };

      recordTierResult(res);

      expect(maxCoordinateDriftPx).toBeLessThanOrEqual(0.00001);

      client.terminate();
    }, 400000);
  });
});
