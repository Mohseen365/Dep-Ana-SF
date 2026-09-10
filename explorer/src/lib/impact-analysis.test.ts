import { describe, it, expect } from 'vitest';
import {
  createEmptyImpactState,
  isImpactActive,
  getAffectedNodesIn,
  computeImpactAnalysis,
  ImpactState
} from './impact-analysis';
import { ExplorerDataSchema } from '../types/explorer';

describe('impact-analysis lib', () => {
  const mockData: ExplorerDataSchema = {
    schemaVersion: '1.0.0',
    analyzerVersion: '13.0.0',
    generatedAt: '2025-01-01T00:00:00Z',
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
        apexClasses: 4,
        apexTriggers: 0,
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
        id: 'ApexClass:Service',
        displayName: 'Service',
        type: 'ApexClass',
        file: 'Service.cls',
        metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
        risk: 'MEDIUM',
        riskReasons: [],
        behavior: {
          isTest: false,
          sharing: 'with sharing',
          publicContractsCount: 1,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: true,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED'
        }
      },
      {
        id: 'ApexClass:Controller',
        displayName: 'Controller',
        type: 'ApexClass',
        file: 'Controller.cls',
        metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          sharing: 'with sharing',
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
          testCoverageStatus: 'UNTESTED'
        }
      },
      {
        id: 'LWC:component',
        displayName: 'component',
        type: 'LWC',
        file: 'component.js',
        metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
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
          calloutCount: 0
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED'
        }
      },
      {
        id: 'ApexClass:ServiceTest',
        displayName: 'ServiceTest',
        type: 'ApexClass',
        file: 'ServiceTest.cls',
        metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: true,
          sharing: null,
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
        id: 'ApexClass:Isolated',
        displayName: 'Isolated',
        type: 'ApexClass',
        file: 'Isolated.cls',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
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
          calloutCount: 0
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED'
        }
      }
    ],
    edges: [
      // LWC:component -> Controller -> Service
      {
        id: 'edge1',
        source: 'LWC:component',
        target: 'ApexClass:Controller',
        relationshipType: 'lwc-apex',
        method: null,
        evidence: 'import getService',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'high',
        line: 1,
        column: 1,
        methodOwner: null,
        file: 'component.js',
        canonical: {
          source: { type: 'LWC', name: 'component' },
          target: { type: 'ApexClass', name: 'Controller' },
          relationship: { type: 'lwc-apex', resolution: 'EXACT' },
          location: { line: 1, column: 1 }
        }
      },
      {
        id: 'edge2',
        source: 'ApexClass:Controller',
        target: 'ApexClass:Service',
        relationshipType: 'method-call',
        method: 'execute',
        evidence: 'Service.execute()',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'high',
        line: 10,
        column: 5,
        methodOwner: 'doWork',
        file: 'Controller.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'Controller' },
          target: { type: 'ApexClass', name: 'Service' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 10, column: 5 }
        }
      },
      {
        id: 'edge3',
        source: 'ApexClass:ServiceTest',
        target: 'ApexClass:Service',
        relationshipType: 'test-reference',
        method: 'testExecute',
        evidence: 'Service.execute()',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'high',
        line: 15,
        column: 5,
        methodOwner: 'testExecute',
        file: 'ServiceTest.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'ServiceTest' },
          target: { type: 'ApexClass', name: 'Service' },
          relationship: { type: 'test-reference', resolution: 'EXACT' },
          location: { line: 15, column: 5 }
        }
      },
      {
        id: 'edge4',
        source: 'ApexClass:Service',
        target: 'ApexClass:Controller',
        relationshipType: 'method-call',
        method: 'callback',
        evidence: 'Controller.callback()',
        unresolved: true,
        resolutionClassification: 'UNKNOWN',
        resolutionStrategy: 'LLM',
        confidence: 'low',
        line: 20,
        column: 5,
        methodOwner: 'notify',
        file: 'Service.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'Service' },
          target: { type: 'ApexClass', name: 'Controller' },
          relationship: { type: 'method-call', resolution: 'UNRESOLVED' },
          location: { line: 20, column: 5 }
        }
      }
    ],
    cycles: [
      {
        id: 'cycle-1',
        size: 2,
        nodes: ['ApexClass:Service', 'ApexClass:Controller']
      }
    ],
    unresolvedReferences: [
      {
        edgeId: 'edge4',
        sourceNodeId: 'ApexClass:Service',
        targetName: 'Controller',
        targetType: 'ApexClass',
        file: 'Service.cls',
        line: 20,
        evidence: 'Controller.callback()',
        reason: 'Unresolved reference to ApexClass:Controller'
      }
    ],
    impactSummaries: {
      'ApexClass:Service': {
        id: 'ApexClass:Service',
        directDependencies: ['ApexClass:Controller'],
        directDependents: ['ApexClass:Controller', 'ApexClass:ServiceTest'],
        transitiveDependencies: ['ApexClass:Controller'],
        transitiveDependents: ['ApexClass:Controller', 'ApexClass:ServiceTest', 'LWC:component'],
        impactedTests: ['ApexClass:ServiceTest'],
        totalImpactCount: 3
      },
      'ApexClass:Isolated': {
        id: 'ApexClass:Isolated',
        directDependencies: [],
        directDependents: [],
        transitiveDependencies: [],
        transitiveDependents: [],
        impactedTests: [],
        totalImpactCount: 0
      }
    }
  };

  it('creates empty impact state', () => {
    const state = createEmptyImpactState();
    expect(state.enabled).toBe(false);
    expect(state.originNodeId).toBeNull();
    expect(state.depth).toBe('ALL');
  });

  it('checks if impact is active correctly', () => {
    expect(isImpactActive({ enabled: false, originNodeId: null, depth: 'ALL' })).toBe(false);
    expect(isImpactActive({ enabled: true, originNodeId: null, depth: 'ALL' })).toBe(false);
    expect(isImpactActive({ enabled: true, originNodeId: 'ApexClass:Service', depth: 'ALL' })).toBe(true);
  });

  it('computes depth 1 affected nodes (direct dependents)', () => {
    // Service target is pointed to by Controller and ServiceTest
    const nodes = getAffectedNodesIn(mockData.edges, 'ApexClass:Service', 1);
    expect(nodes).toEqual(new Set(['ApexClass:Service', 'ApexClass:Controller', 'ApexClass:ServiceTest']));
  });

  it('computes depth 2 affected nodes', () => {
    // Service -> (Controller, ServiceTest) -> LWC:component
    const nodes = getAffectedNodesIn(mockData.edges, 'ApexClass:Service', 2);
    expect(nodes).toEqual(new Set(['ApexClass:Service', 'ApexClass:Controller', 'ApexClass:ServiceTest', 'LWC:component']));
  });

  it('computes depth 3 affected nodes', () => {
    const nodes = getAffectedNodesIn(mockData.edges, 'ApexClass:Service', 3);
    expect(nodes).toEqual(new Set(['ApexClass:Service', 'ApexClass:Controller', 'ApexClass:ServiceTest', 'LWC:component']));
  });

  it('computes depth ALL affected nodes', () => {
    const nodes = getAffectedNodesIn(mockData.edges, 'ApexClass:Service', 'ALL');
    expect(nodes).toEqual(new Set(['ApexClass:Service', 'ApexClass:Controller', 'ApexClass:ServiceTest', 'LWC:component']));
  });

  it('calculates visible impacted count when filters hide some nodes', () => {
    const state: ImpactState = {
      enabled: true,
      originNodeId: 'ApexClass:Service',
      depth: 'ALL'
    };
    // Imagine filter hides LWC:component
    const visibleSet = new Set(['ApexClass:Service', 'ApexClass:Controller', 'ApexClass:ServiceTest']);
    const result = computeImpactAnalysis(mockData, state, visibleSet);

    expect(result?.summaryMetrics.impactedComponentsCount).toBe(3);
    expect(result?.summaryMetrics.visibleImpactedCount).toBe(2); // Controller and ServiceTest visible
  });

  it('computes impact analysis correctly for active component', () => {
    const state: ImpactState = {
      enabled: true,
      originNodeId: 'ApexClass:Service',
      depth: 'ALL'
    };
    const result = computeImpactAnalysis(mockData, state);
    expect(result).not.toBeNull();
    expect(result?.originNodeId).toBe('ApexClass:Service');
    expect(result?.originNode?.displayName).toBe('Service');
    expect(result?.summaryMetrics.directDependentsCount).toBe(2);
    expect(result?.summaryMetrics.transitiveDependentsCount).toBe(3);
    expect(result?.summaryMetrics.impactedTestsCount).toBe(1);
    expect(result?.summaryMetrics.cyclesInvolvedCount).toBe(1);
    expect(result?.summaryMetrics.unresolvedCount).toBe(1);
  });

  it('handles isolated component with no dependents', () => {
    const state: ImpactState = {
      enabled: true,
      originNodeId: 'ApexClass:Isolated',
      depth: 'ALL'
    };
    const result = computeImpactAnalysis(mockData, state);
    expect(result).not.toBeNull();
    expect(result?.summaryMetrics.directDependentsCount).toBe(0);
    expect(result?.summaryMetrics.transitiveDependentsCount).toBe(0);
    expect(result?.summaryMetrics.impactedTestsCount).toBe(0);
    expect(result?.affectedNodeIds).toEqual(new Set(['ApexClass:Isolated']));
  });

  it('returns null when state disabled or invalid origin', () => {
    expect(computeImpactAnalysis(mockData, { enabled: false, originNodeId: 'ApexClass:Service', depth: 'ALL' })).toBeNull();
    expect(computeImpactAnalysis(mockData, { enabled: true, originNodeId: 'ApexClass:NonExistent', depth: 'ALL' })).toBeNull();
  });
});
