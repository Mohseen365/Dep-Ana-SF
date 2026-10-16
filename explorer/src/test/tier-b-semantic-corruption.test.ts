import { describe, test, expect } from 'vitest';
import { adaptComponentOrbit } from '../lib/adapters/component-orbit-adapter';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';

describe('Tier B — Silent Semantic Corruption Regression Suite', () => {
  test('B1: isChildLwc ignores LWC-to-LWC non-composition edges (e.g. lwc-import)', () => {
    const schema: ExplorerDataSchema = {
      summary: {
        nodeCount: 3,
        edgeCount: 2,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 3,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: { apexClasses: 1, apexTriggers: 0, lwcs: 2, visualforcePages: 0, flows: 0, objects: 0, fields: 0 },
      },
      nodes: [
        {
          id: 'LWC:focal-comp',
          displayName: 'FocalComp',
          type: 'LWC',
          file: 'focalComp.js',
          metrics: { fanIn: 0, fanOut: 2, coupling: 2, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
        {
          id: 'LWC:import-util-comp',
          displayName: 'ImportUtilComp',
          type: 'LWC',
          file: 'importUtilComp.js',
          metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
        {
          id: 'ApexClass:MainService',
          displayName: 'MainService',
          type: 'ApexClass',
          file: 'MainService.cls',
          metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'LWC:focal-comp',
          target: 'LWC:import-util-comp',
          relationshipType: 'lwc-import', // NOT lwc-template-child composition
          method: null,
          evidence: '',
          unresolved: false,
          resolutionClassification: 'RESOLVED_LOCAL',
          resolutionStrategy: 'EXACT',
          confidence: '1.0',
          line: null,
          column: null,
          methodOwner: null,
          file: '',
          canonical: { source: { type: 'LWC', name: 'LWC:focal-comp' }, target: { type: 'LWC', name: 'LWC:import-util-comp' }, relationship: { type: 'lwc-import', resolution: 'EXACT' }, location: {} },
        },
        {
          id: 'e2',
          source: 'LWC:focal-comp',
          target: 'ApexClass:MainService',
          relationshipType: 'lwc-apex',
          method: null,
          evidence: '',
          unresolved: false,
          resolutionClassification: 'RESOLVED_LOCAL',
          resolutionStrategy: 'EXACT',
          confidence: '1.0',
          line: null,
          column: null,
          methodOwner: null,
          file: '',
          canonical: { source: { type: 'LWC', name: 'LWC:focal-comp' }, target: { type: 'ApexClass', name: 'ApexClass:MainService' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} },
        },
      ],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    };

    const projection = adaptComponentOrbit(schema, { focalLwcId: 'LWC:focal-comp' });
    const utilNode = projection.nodes['LWC:import-util-comp'];

    expect(utilNode).toBeDefined();
    expect(utilNode.isChildLwc).toBe(false); // lwc-import is NOT composition, so roleSymbol is not '◎'
    expect(utilNode.roleSymbol).toBe('○');
  });

  test('B2: isSharedHub is scoped to reachable projection LWCs', () => {
    const schema: ExplorerDataSchema = {
      summary: {
        nodeCount: 4,
        edgeCount: 3,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 4,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: { apexClasses: 1, apexTriggers: 0, lwcs: 3, visualforcePages: 0, flows: 0, objects: 0, fields: 0 },
      },
      nodes: [
        {
          id: 'LWC:focal-comp',
          displayName: 'FocalComp',
          type: 'LWC',
          file: 'focalComp.js',
          metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
        {
          id: 'ApexClass:SharedService',
          displayName: 'SharedService',
          type: 'ApexClass',
          file: 'SharedService.cls',
          metrics: { fanIn: 3, fanOut: 0, coupling: 3, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
        {
          id: 'LWC:unreachable-lwc-1',
          displayName: 'UnreachableLWC1',
          type: 'LWC',
          file: 'unreachable1.js',
          metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
        {
          id: 'LWC:unreachable-lwc-2',
          displayName: 'UnreachableLWC2',
          type: 'LWC',
          file: 'unreachable2.js',
          metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
      ],
      edges: [
        { id: 'e1', source: 'LWC:focal-comp', target: 'ApexClass:SharedService', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: '1.0', line: null, column: null, methodOwner: null, file: '', canonical: { source: { type: 'LWC', name: 'LWC:focal-comp' }, target: { type: 'ApexClass', name: 'ApexClass:SharedService' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
        { id: 'e2', source: 'LWC:unreachable-lwc-1', target: 'ApexClass:SharedService', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: '1.0', line: null, column: null, methodOwner: null, file: '', canonical: { source: { type: 'LWC', name: 'LWC:unreachable-lwc-1' }, target: { type: 'ApexClass', name: 'ApexClass:SharedService' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
        { id: 'e3', source: 'LWC:unreachable-lwc-2', target: 'ApexClass:SharedService', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: '1.0', line: null, column: null, methodOwner: null, file: '', canonical: { source: { type: 'LWC', name: 'LWC:unreachable-lwc-2' }, target: { type: 'ApexClass', name: 'ApexClass:SharedService' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
      ],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    };

    // Focal LWC:focal-comp maxDepth: 1 reaches ONLY FocalComp + SharedService (unreachable-lwc-1 & 2 are unreachable)
    const projection = adaptComponentOrbit(schema, { focalLwcId: 'LWC:focal-comp', maxDepth: 1 });
    const sharedNode = projection.nodes['ApexClass:SharedService'];

    expect(sharedNode).toBeDefined();
    // Only 1 LWC (focal-comp) is reachable in this projection, so dependentLwcCount = 1, NOT shared hub
    expect(sharedNode.dependentLwcCount).toBe(1);
    expect(sharedNode.isSharedHub).toBe(false);
    expect(sharedNode.roleSymbol).toBe('○');
  });

  test('B4: computeArchitectureLayoutWithMetadata generates complete ExplorerSummary input', () => {
    const res = computeArchitectureLayoutWithMetadata(
      [
        {
          id: 'LWC:TestComp',
          displayName: 'TestComp',
          type: 'LWC',
          file: 'TestComp.js',
          metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
      ],
      [],
      { architectureMode: 'orbit', focalLwcId: 'LWC:TestComp' }
    );

    expect(res.positions['LWC:TestComp']).toBeDefined();
  });
});
