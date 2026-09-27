import { describe, it, expect } from 'vitest';
import { adaptSankeyRiver } from '../adapters/sankey-adapter';
import { computeSankeyLayout } from './sankey-layout';
import type { ExplorerDataSchema } from '../../types/explorer';

describe('computeSankeyLayout Layout Engine', () => {
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

  it('computes finite, non-NaN layout geometries within requested bounds', () => {
    const adapterData = adaptSankeyRiver(mockGraphData);
    const layout = computeSankeyLayout(adapterData, { width: 1000, height: 600 });

    expect(layout.width).toBe(1000);
    expect(layout.height).toBeGreaterThanOrEqual(600);
    expect(layout.stages.length).toBe(4);
    expect(layout.nodes.length).toBeGreaterThan(0);
    expect(layout.flows.length).toBeGreaterThan(0);

    layout.nodes.forEach(node => {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isFinite(node.width)).toBe(true);
      expect(Number.isFinite(node.height)).toBe(true);
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
    });

    layout.flows.forEach(flow => {
      expect(flow.pathString).toMatch(/^M [\d\.\-]+ [\d\.\-]+ C/);
      expect(flow.pathString.includes('NaN')).toBe(false);
    });
  });

  it('is completely deterministic across repeated calls', () => {
    const adapterData = adaptSankeyRiver(mockGraphData);
    const layout1 = computeSankeyLayout(adapterData);
    const layout2 = computeSankeyLayout(adapterData);

    expect(JSON.stringify(layout1.nodes)).toBe(JSON.stringify(layout2.nodes));
    expect(JSON.stringify(layout1.flows)).toBe(JSON.stringify(layout2.flows));
  });

  it('handles empty adapter data gracefully', () => {
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

    const adapterData = adaptSankeyRiver(emptyData);
    const layout = computeSankeyLayout(adapterData);

    expect(layout.nodes.length).toBe(0);
    expect(layout.flows.length).toBe(0);
    expect(layout.stages.length).toBe(4);
  });
});
