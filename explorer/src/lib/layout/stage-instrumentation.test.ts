import { describe, it, expect } from 'vitest';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { measurePipelineStageMetrics } from './pipeline-stage-diagnostics';

describe('Pipeline Stage Timing Instrumentation', () => {
  const sampleNodes: ExplorerNode[] = [
    {
      id: 'ApexClass:AccountController',
      displayName: 'AccountController',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/AccountController.cls',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'ApexClass:AccountService',
      displayName: 'AccountService',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/AccountService.cls',
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 1 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
  ];

  const sampleEdges: ExplorerEdge[] = [
    {
      id: 'ApexClass:AccountController->ApexClass:AccountService',
      source: 'ApexClass:AccountController',
      target: 'ApexClass:AccountService',
      relationshipType: 'method-call',
      method: 'execute',
      evidence: '',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 1,
      column: 1,
      methodOwner: 'execute',
      file: 'AccountController.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'AccountController' },
        target: { type: 'ApexClass', name: 'AccountService' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    },
  ];

  it('1. provides non-negative stage timing information in stageTimesMs and snapshots', () => {
    const diagnostics = measurePipelineStageMetrics(sampleNodes, sampleEdges, { enableFeatureLayout: true });

    expect(diagnostics.stageTimesMs).toBeDefined();
    expect(diagnostics.stageTimesMs?.['Stage 0']).toBeGreaterThanOrEqual(0);
    expect(diagnostics.stageTimesMs?.['Stage 5']).toBeGreaterThanOrEqual(0);
    expect(diagnostics.stageTimesMs?.['Stage 6']).toBeGreaterThanOrEqual(0);
    expect(diagnostics.stageTimesMs?.['Stage 7']).toBeGreaterThanOrEqual(0);
    expect(diagnostics.stageTimesMs?.['Stage 8']).toBeGreaterThanOrEqual(0);
    expect(diagnostics.stageTimesMs?.['Stage 9']).toBeGreaterThanOrEqual(0);
    expect(diagnostics.stageTimesMs?.['Stage 10']).toBeGreaterThanOrEqual(0);
    expect(diagnostics.stageTimesMs?.['Stage 11']).toBeGreaterThanOrEqual(0);
    expect(diagnostics.stageTimesMs?.['Stage 12']).toBeGreaterThanOrEqual(0);

    expect(diagnostics.snapshots['Stage 5'].durationMs).toBeGreaterThanOrEqual(0);
    expect(diagnostics.snapshots['Stage 12'].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('2. verifies timing instrumentation does not alter layout positions or metrics', () => {
    const result1 = measurePipelineStageMetrics(sampleNodes, sampleEdges, { enableFeatureLayout: true });
    const result2 = measurePipelineStageMetrics(sampleNodes, sampleEdges, { enableFeatureLayout: true });

    expect(result1.snapshots['Stage 12'].positions).toEqual(result2.snapshots['Stage 12'].positions);
    expect(result1.snapshots['Stage 12'].metrics.edgeCrossingCount).toBe(result2.snapshots['Stage 12'].metrics.edgeCrossingCount);
  });
});
