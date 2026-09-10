import { describe, it, expect } from 'vitest';
import { simulateChange } from './change-simulator';
import { ExplorerDataSchema } from '../types/explorer';

const comprehensiveMockData: ExplorerDataSchema = {
  schemaVersion: '1.0.0',
  analyzerVersion: '13.0.0',
  generatedAt: '2026-09-10T00:00:00.000Z',
  sourceDirectory: 'force-app/main/default',
  summary: {
    nodeCount: 5,
    edgeCount: 4,
    highRiskCount: 1,
    mediumRiskCount: 1,
    lowRiskCount: 3,
    cycleCount: 1,
    unresolvedCount: 1,
    inventory: {
      files: 5,
      apexClasses: 3,
      apexTriggers: 1,
      lwcJs: 0,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 1,
      fields: 0
    }
  },
  nodes: [
    {
      id: 'ApexClass:ServiceA',
      displayName: 'ServiceA',
      type: 'ApexClass',
      file: 'classes/ServiceA.cls',
      metrics: { fanIn: 2, fanOut: 1, coupling: 3, unresolved: 1, score: 8 },
      risk: 'HIGH',
      riskReasons: ['High coupling', 'Participates in cycle'],
      behavior: {
        isTest: false,
        publicContractsCount: 2,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 1,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: true,
        hasCycles: true,
        hasUnresolved: true,
        testCoverageStatus: 'COVERED'
      }
    },
    {
      id: 'ApexClass:ControllerB',
      displayName: 'ControllerB',
      type: 'ApexClass',
      file: 'classes/ControllerB.cls',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 2 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 1,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED'
      }
    },
    {
      id: 'ApexClass:TestA',
      displayName: 'TestA',
      type: 'ApexClass',
      file: 'classes/TestA.cls',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: true,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED'
      }
    },
    {
      id: 'Object:Account',
      displayName: 'Account',
      type: 'Object',
      file: 'objects/Account.object',
      metrics: { fanIn: 2, fanOut: 0, coupling: 2, unresolved: 0, score: 3 },
      risk: 'MEDIUM',
      riskReasons: ['Broad object usage'],
      behavior: {
        isTest: false,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'NO_TESTS'
      }
    },
    {
      id: 'ApexClass:IsolatedClass',
      displayName: 'IsolatedClass',
      type: 'ApexClass',
      file: 'classes/IsolatedClass.cls',
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 1,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'NO_TESTS'
      }
    }
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'ApexClass:ControllerB',
      target: 'ApexClass:ServiceA',
      relationshipType: 'method-call',
      method: 'doAction',
      evidence: 'ServiceA.doAction()',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 10,
      column: 5,
      methodOwner: 'execute',
      file: 'classes/ControllerB.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'ControllerB', method: 'execute' },
        target: { type: 'ApexClass', name: 'ServiceA', method: 'doAction' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 10, column: 5 }
      }
    },
    {
      id: 'edge-2',
      source: 'ApexClass:TestA',
      target: 'ApexClass:ServiceA',
      relationshipType: 'test-reference',
      method: null,
      evidence: 'ServiceA s = new ServiceA()',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 5,
      column: 1,
      methodOwner: 'testService',
      file: 'classes/TestA.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'TestA', method: 'testService' },
        target: { type: 'ApexClass', name: 'ServiceA', method: null },
        relationship: { type: 'test-reference', resolution: 'EXACT' },
        location: { line: 5, column: 1 }
      }
    },
    {
      id: 'edge-3',
      source: 'ApexClass:ServiceA',
      target: 'Object:Account',
      relationshipType: 'soql-object',
      method: null,
      evidence: '[SELECT Id FROM Account]',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 15,
      column: 8,
      methodOwner: 'getAccounts',
      file: 'classes/ServiceA.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'ServiceA', method: 'getAccounts' },
        target: { type: 'Object', name: 'Account', method: null },
        relationship: { type: 'soql-object', resolution: 'EXACT' },
        location: { line: 15, column: 8 }
      }
    }
  ],
  cycles: [
    {
      id: 'cycle-1',
      size: 2,
      nodes: ['ApexClass:ServiceA', 'ApexClass:ControllerB']
    }
  ],
  unresolvedReferences: [
    {
      edgeId: 'edge-4',
      sourceNodeId: 'ApexClass:ServiceA',
      targetName: 'ExternalHelper',
      targetType: 'External',
      file: 'classes/ServiceA.cls',
      line: 20,
      evidence: 'ExternalHelper.call()',
      reason: 'Missing component in local workspace'
    }
  ],
  impactSummaries: {
    'ApexClass:ServiceA': {
      id: 'ApexClass:ServiceA',
      directDependencies: ['Object:Account'],
      directDependents: ['ApexClass:ControllerB', 'ApexClass:TestA'],
      transitiveDependencies: ['Object:Account'],
      transitiveDependents: ['ApexClass:ControllerB', 'ApexClass:TestA'],
      impactedTests: ['ApexClass:TestA'],
      totalImpactCount: 2
    },
    'ApexClass:IsolatedClass': {
      id: 'ApexClass:IsolatedClass',
      directDependencies: [],
      directDependents: [],
      transitiveDependencies: [],
      transitiveDependents: [],
      impactedTests: [],
      totalImpactCount: 0
    },
    'Object:Account': {
      id: 'Object:Account',
      directDependencies: [],
      directDependents: ['ApexClass:ServiceA'],
      transitiveDependencies: [],
      transitiveDependents: ['ApexClass:ServiceA', 'ApexClass:ControllerB', 'ApexClass:TestA'],
      impactedTests: ['ApexClass:TestA'],
      totalImpactCount: 3
    }
  }
};

describe('Change Simulator Engine Tests', () => {
  it('Requirement 2: General component change scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'general');
    expect(sim).not.toBeNull();
    expect(sim?.changeType).toBe('general');
    expect(sim?.changeTypeLabel).toBe('General component change');
    expect(sim?.directDependentsCount).toBe(2);
    expect(sim?.transitiveDependentsCount).toBe(2);
  });

  it('Requirement 3: Rename scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'rename');
    expect(sim).not.toBeNull();
    expect(sim?.changeType).toBe('rename');
    expect(sim?.semanticExplanation).toContain('Rename simulation');
    expect(sim?.affectedNodeIds).toContain('ApexClass:ControllerB');
  });

  it('Requirement 4: Remove scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'remove');
    expect(sim).not.toBeNull();
    expect(sim?.changeType).toBe('remove');
    expect(sim?.semanticExplanation).toContain('High-consequence simulation');
    expect(sim?.blastRadius).toBe('LARGE');
  });

  it('Requirement 5: Method/API scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'method');
    expect(sim).not.toBeNull();
    expect(sim?.changeType).toBe('method');
    expect(sim?.affectedEdgeIds).toContain('edge-1');
  });

  it('Requirement 6: Field scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'field');
    expect(sim).not.toBeNull();
    expect(sim?.changeType).toBe('field');
  });

  it('Requirement 7: Object scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'Object:Account', 'object');
    expect(sim).not.toBeNull();
    expect(sim?.changeType).toBe('object');
    expect(sim?.originNodeId).toBe('Object:Account');
    expect(sim?.affectedEdgeIds).toContain('edge-3');
  });

  it('Requirement 8: No-impact component scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'ApexClass:IsolatedClass', 'general');
    expect(sim).not.toBeNull();
    expect(sim?.directDependentsCount).toBe(0);
    expect(sim?.transitiveDependentsCount).toBe(0);
    expect(sim?.impactedComponentsCount).toBe(0);
    expect(sim?.impactedTestsCount).toBe(0);
    expect(sim?.cyclesInvolvedCount).toBe(0);
    expect(sim?.unresolvedReferencesCount).toBe(0);
    expect(sim?.blastRadius).toBe('SMALL');
  });

  it('Requirement 9: High-impact component scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'general');
    expect(sim?.risk).toBe('HIGH');
    expect(sim?.blastRadius).toBe('LARGE');
  });

  it('Requirement 10: Cycle participation scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'general');
    expect(sim?.cyclesInvolvedCount).toBe(1);
    expect(sim?.blastRadiusExplanation).toContain('circular dependency cycle');
  });

  it('Requirement 11: Unresolved references scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'general');
    expect(sim?.unresolvedReferencesCount).toBe(1);
  });

  it('Requirement 12: Impacted tests scenario', () => {
    const sim = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'general');
    expect(sim?.impactedTestsCount).toBe(1);
    expect(sim?.impactedTestIds).toContain('ApexClass:TestA');
  });

  it('Requirement 17: Deterministic simulation output verification', () => {
    const sim1 = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'general');
    const sim2 = simulateChange(comprehensiveMockData, 'ApexClass:ServiceA', 'general');
    expect(sim1).toEqual(sim2);
  });
});
