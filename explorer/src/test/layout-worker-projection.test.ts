import { describe, test, expect } from 'vitest';
import cytoscape from 'cytoscape';
import { runLayoutWithMetadataAsync } from '../lib/graph-layout';
import { LayoutWorkerClient } from '../lib/workers/layout-worker-client';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { buildGraphElements } from '../lib/graph-builder';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

describe('Tier A1 — Async Worker Projection & Metadata Contract', () => {
  // Generate a 20-node graph to trigger the >= 20 nodes worker offloading path
  const nodes: ExplorerNode[] = Array.from({ length: 20 }, (_, i) => ({
    id: i === 0 ? 'LWC:focal-comp' : `LWC:child-comp-${i}`,
    displayName: i === 0 ? 'FocalComp' : `ChildComp${i}`,
    type: 'LWC' as const,
    file: i === 0 ? 'focalComp.js' : `childComp${i}.js`,
    metrics: { fanIn: i === 0 ? 0 : 1, fanOut: i === 0 ? 19 : 0, coupling: 1, unresolved: 0, score: 0 },
    risk: 'LOW' as const,
    riskReasons: [],
    behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' as const },
  }));

  const edges: ExplorerEdge[] = Array.from({ length: 19 }, (_, i) => ({
    id: `edge-${i + 1}`,
    source: 'LWC:focal-comp',
    target: `LWC:child-comp-${i + 1}`,
    relationshipType: 'lwc-template-child',
    method: null,
    evidence: '',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL' as const,
    resolutionStrategy: 'EXACT' as const,
    confidence: '1.0',
    line: null,
    column: null,
    methodOwner: null,
    file: '',
    canonical: {
      source: { type: 'LWC' as const, name: 'LWC:focal-comp' },
      target: { type: 'LWC' as const, name: `LWC:child-comp-${i + 1}` },
      relationship: { type: 'lwc-template-child', resolution: 'EXACT' as const },
      location: {},
    },
  }));

  test('Mock Worker IPC offloading deserializes projectedNodeIds Set and orbitGuides for 20+ node graphs', async () => {
    // Create a mock worker simulating the Web Worker IPC postMessage/onmessage cycle
    class MockLayoutWorker {
      public onmessage: ((e: MessageEvent) => void) | null = null;
      public addEventListener(type: string, listener: any) {
        if (type === 'message') this.onmessage = listener;
      }
      public removeEventListener() {}
      public postMessage(msg: any) {
        if (msg.type === 'CALCULATE_LAYOUT') {
          const syncRes = computeArchitectureLayoutWithMetadata(msg.nodes, msg.edges, msg.options);
          const response = {
            type: 'LAYOUT_SUCCESS',
            projectId: msg.projectId,
            requestGeneration: msg.requestGeneration,
            correlationToken: msg.correlationToken,
            positions: syncRes.positions,
            orbitGuides: syncRes.orbitGuides,
            projectedNodeIds: syncRes.projectedNodeIds ? Array.from(syncRes.projectedNodeIds) : undefined,
            computeDurationMs: 10,
          };
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({ data: response } as MessageEvent);
            }
          }, 0);
        }
      }
      public terminate() {}
    }

    const workerClient = new LayoutWorkerClient({
      workerFactory: () => new MockLayoutWorker() as any,
    });

    const res = await workerClient.calculateLayoutAsync({
      projectId: 'test-proj',
      nodes,
      edges,
      options: {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:focal-comp',
      },
    });

    expect(res.isOffloaded).toBe(true);
    expect(res.projectedNodeIds).toBeInstanceOf(Set);
    expect(res.projectedNodeIds!.has('LWC:focal-comp')).toBe(true);
    expect(res.orbitGuides).toBeDefined();
    expect(res.orbitGuides?.rings.length).toBeGreaterThan(0);
  });

  test('runLayoutWithMetadataAsync forwards projectedNodeIds and sets visibility filter on Cytoscape canvas', async () => {
    const elements = buildGraphElements(nodes, edges);
    const cy = cytoscape({
      elements,
      headless: true,
    });

    const result = await runLayoutWithMetadataAsync(cy, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:focal-comp',
      nodes,
      edges,
      componentOrbitOptions: {
        focalLwcId: 'LWC:focal-comp',
        maxDepth: 1,
      },
    });

    expect(result.projectedNodeIds).toBeInstanceOf(Set);
    expect(result.projectedNodeIds!.size).toBeLessThanOrEqual(nodes.length);
    expect(result.projectedNodeIds!.has('LWC:focal-comp')).toBe(true);
  });

  test('Constellation mode worker projection parity and mode transition reconciliation', async () => {
    const elements = buildGraphElements(nodes, edges);
    const cy = cytoscape({
      elements,
      headless: true,
    });

    // 1. Constellation mode
    const constRes = await runLayoutWithMetadataAsync(cy, {
      architectureMode: 'constellation',
      nodes,
      edges,
    });
    expect(constRes.projectedNodeIds).toBeInstanceOf(Set);

    // 2. Transition back to hierarchical mode — all nodes restored to visible
    const hierRes = await runLayoutWithMetadataAsync(cy, {
      architectureMode: 'hierarchical',
      nodes,
      edges,
    });
    expect(hierRes.projectedNodeIds).toBeUndefined();
  });
});
