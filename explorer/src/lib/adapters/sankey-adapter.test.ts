import { describe, it, expect } from 'vitest';
import { adaptSankeyRiver } from './sankey-adapter';
import type { ExplorerDataSchema } from '../../types/explorer';

describe('adaptSankeyRiver Adapter', () => {
  const mockGraphData: ExplorerDataSchema = {
    schemaVersion: '1.0',
    project: {
      id: 'test-project',
      name: 'Test Project',
      sourcePath: 'force-app',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      analysisStatus: 'COMPLETE',
      componentCount: 4,
      dependencyCount: 4,
    },
    summary: {
      nodeCount: 4,
      edgeCount: 4,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 4,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: {
        files: 4,
        apexClasses: 3,
        apexTriggers: 0,
        lwcJs: 0,
        lwcHtml: 0,
        visualforce: 0,
        flows: 0,
        objects: 1,
        fields: 0,
      },
    },
    nodes: [
      {
        id: 'c1',
        displayName: 'BillingController',
        type: 'ApexClass',
        file: 'BillingController.cls',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 0, fanOut: 2, coupling: 2, unresolved: 0, score: 10 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'c2',
        displayName: 'BillingService',
        type: 'ApexClass',
        file: 'BillingService.cls',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 10 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'c3',
        displayName: 'AccountRepository',
        type: 'ApexClass',
        file: 'AccountRepository.cls',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 2, fanOut: 1, coupling: 3, unresolved: 0, score: 10 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'c4',
        displayName: 'Account__c',
        type: 'CustomObject',
        file: 'Account__c.object-meta.xml',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 10 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'c1',
        target: 'c2',
        relationshipType: 'method-call',
        method: 'execute',
        evidence: 'c1 calls c2',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 10,
        column: 5,
        methodOwner: 'BillingService',
        file: 'BillingController.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'BillingController' },
          target: { type: 'ApexClass', name: 'BillingService' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 10, column: 5 },
        },
      },
      {
        id: 'e2',
        source: 'c2',
        target: 'c3',
        relationshipType: 'method-call',
        method: 'find',
        evidence: 'c2 calls c3',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 15,
        column: 5,
        methodOwner: 'AccountRepository',
        file: 'BillingService.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'BillingService' },
          target: { type: 'ApexClass', name: 'AccountRepository' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 15, column: 5 },
        },
      },
      {
        id: 'e3',
        source: 'c3',
        target: 'c4',
        relationshipType: 'SOQL',
        method: 'query',
        evidence: 'c3 queries c4',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 20,
        column: 5,
        methodOwner: 'Account__c',
        file: 'AccountRepository.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'AccountRepository' },
          target: { type: 'CustomObject', name: 'Account__c' },
          relationship: { type: 'SOQL', resolution: 'EXACT' },
          location: { line: 20, column: 5 },
        },
      },
      {
        id: 'e4',
        source: 'c1',
        target: 'c3',
        relationshipType: 'method-call',
        method: 'check',
        evidence: 'c1 calls c3',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 25,
        column: 5,
        methodOwner: 'AccountRepository',
        file: 'BillingController.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'BillingController' },
          target: { type: 'ApexClass', name: 'AccountRepository' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 25, column: 5 },
        },
      },
    ],
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  };

  it('transforms valid canonical graph data into structured Sankey adapter output', () => {
    const result = adaptSankeyRiver(mockGraphData);

    expect(result.stages.length).toBe(4); // presentation, application, domain, schema
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.flows.length).toBeGreaterThan(0);
    expect(result.summary.totalEdgeWeight).toBe(4);
  });

  it('preserves 100% component-level edge provenance in flows', () => {
    const result = adaptSankeyRiver(mockGraphData);

    let foundE1 = false;
    result.flows.forEach(flow => {
      flow.provenance.forEach(prov => {
        if (prov.edgeId === 'e1') {
          foundE1 = true;
          expect(prov.sourceComponentId).toBe('c1');
          expect(prov.targetComponentId).toBe('c2');
        }
      });
    });

    expect(foundE1).toBe(true);
  });

  it('is completely pure and deterministic across repeated executions', () => {
    const res1 = adaptSankeyRiver(mockGraphData);
    const res2 = adaptSankeyRiver(mockGraphData);

    expect(JSON.stringify(res1.summary)).toBe(JSON.stringify(res2.summary));
    expect(res1.flows.length).toBe(res2.flows.length);
    expect(res1.nodes.length).toBe(res2.nodes.length);
  });

  it('handles empty input gracefully without throwing errors', () => {
    const emptyData: ExplorerDataSchema = {
      schemaVersion: '1.0',
      project: {
        id: 'empty',
        name: 'Empty',
        sourcePath: 'force-app',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        analysisStatus: 'COMPLETE',
        componentCount: 0,
        dependencyCount: 0,
      },
      summary: {
        nodeCount: 0,
        edgeCount: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: {
          files: 0,
          apexClasses: 0,
          apexTriggers: 0,
          lwcJs: 0,
          lwcHtml: 0,
          visualforce: 0,
          flows: 0,
          objects: 0,
          fields: 0,
        },
      },
      nodes: [],
      edges: [],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    };

    const result = adaptSankeyRiver(emptyData);
    expect(result.stages.length).toBe(4);
    expect(result.nodes.length).toBe(0);
    expect(result.flows.length).toBe(0);
    expect(result.summary.totalEdgeWeight).toBe(0);
  });
});
