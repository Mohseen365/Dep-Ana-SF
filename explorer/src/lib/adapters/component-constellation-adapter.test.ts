import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  adaptComponentConstellation,
  CONTRACTED_14_SUN_IDS,
  CONTRACTED_INNER_SUN_IDS,
  CONTRACTED_OUTER_SUN_IDS,
} from './component-constellation-adapter';
import type { ExplorerDataSchema } from '../../types/explorer';

describe('Component Constellation Adapter — Unit & PBIM Validation', () => {
  const pbimPath = path.join(__dirname, '../../../../analyze/projects/pbim/explorer-data.json');
  const pbimRaw = fs.readFileSync(pbimPath, 'utf8');
  const pbimData: ExplorerDataSchema = JSON.parse(pbimRaw);

  it('1. Selects exactly 14 contracted Suns on canonical PBIM', () => {
    const projection = adaptComponentConstellation(pbimData);

    expect(projection.summary.sunCount).toBe(14);
    expect(projection.suns.map((s) => s.nodeId).sort()).toEqual([...CONTRACTED_14_SUN_IDS].sort());
    expect(projection.innerSuns.map((s) => s.nodeId).sort()).toEqual([...CONTRACTED_INNER_SUN_IDS].sort());
    expect(projection.outerSuns.map((s) => s.nodeId).sort()).toEqual([...CONTRACTED_OUTER_SUN_IDS].sort());
  });

  it('2. Preserves identity conservation (0 node clones, original IDs)', () => {
    const projection = adaptComponentConstellation(pbimData);

    const projectedIds = Object.keys(projection.nodes);
    const uniqueIds = new Set(projectedIds);

    expect(projectedIds.length).toBe(uniqueIds.size);
    projectedIds.forEach((id) => {
      expect(id).not.toContain('@Sun');
      expect(id).not.toContain(':cluster');
      expect(id).not.toContain(':local');
    });
  });

  it('3. Accurately measures PBIM k=1 local projection (50 occurrences, 42 unique nodes, 7 shared nodes)', () => {
    const projection = adaptComponentConstellation(pbimData);

    expect(projection.summary.totalOccurrences).toBe(50);
    expect(projection.summary.totalUniqueNodes).toBe(42);
    expect(projection.summary.sharedNodeCount).toBe(7);

    const expectedShared7 = [
      'ApexClass:BudgetController',
      'ApexClass:CitizenRequestController',
      'ApexClass:CityZoneController',
      'ApexClass:MaintenanceRequestController',
      'ApexClass:VendorAssignmentController',
      'LWC:vendor-card',
      'LWC:vendor-history-modal',
    ].sort();

    expect(projection.sharedNodeIds.sort()).toEqual(expectedShared7);
  });

  it('4. Preserves 100% authoritative edge relationships', () => {
    const projection = adaptComponentConstellation(pbimData);

    expect(projection.edges.length).toBeGreaterThan(0);
    projection.edges.forEach((edge) => {
      expect(edge.provenance.sourceEdgeId).toBeDefined();
      expect(projection.nodes[edge.source]).toBeDefined();
      expect(projection.nodes[edge.target]).toBeDefined();
    });
  });

  it('5. Guarantees 10x determinism and input-order invariance', () => {
    const baseline = adaptComponentConstellation(pbimData);

    for (let i = 0; i < 10; i++) {
      const shuffledNodes = [...pbimData.nodes].sort(() => Math.random() - 0.5);
      const shuffledEdges = [...pbimData.edges].sort(() => Math.random() - 0.5);

      const shuffledProjection = adaptComponentConstellation({
        ...pbimData,
        nodes: shuffledNodes,
        edges: shuffledEdges,
      });

      expect(shuffledProjection.summary).toEqual(baseline.summary);
      expect(shuffledProjection.sharedNodeIds).toEqual(baseline.sharedNodeIds);
      expect(Object.keys(shuffledProjection.nodes).sort()).toEqual(Object.keys(baseline.nodes).sort());
    }
  });

  it('6. Handles synthetic graphs gracefully', () => {
    const syntheticSchema: ExplorerDataSchema = {
      summary: {
        nodeCount: 3,
        edgeCount: 2,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: { files: 3, apexClasses: 1, apexTriggers: 0, lwcJs: 2, lwcHtml: 0, visualforce: 0, flows: 0, objects: 0, fields: 0 },
      },
      nodes: [
        { id: 'LWC:SunA', displayName: 'Sun A', type: 'LWC', file: '', metrics: { fanIn: 0, fanOut: 2, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' } },
        { id: 'LWC:SunB', displayName: 'Sun B', type: 'LWC', file: '', metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' } },
        { id: 'ApexClass:Service', displayName: 'Service', type: 'ApexClass', file: '', metrics: { fanIn: 2, fanOut: 0, coupling: 2, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' } },
      ],
      edges: [
        { id: 'e1', source: 'LWC:SunA', target: 'ApexClass:Service', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: '1.0', line: null, column: null, methodOwner: null, file: '', canonical: { source: { type: 'LWC', name: 'LWC:SunA' }, target: { type: 'ApexClass', name: 'ApexClass:Service' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
        { id: 'e2', source: 'LWC:SunB', target: 'ApexClass:Service', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: '1.0', line: null, column: null, methodOwner: null, file: '', canonical: { source: { type: 'LWC', name: 'LWC:SunB' }, target: { type: 'ApexClass', name: 'ApexClass:Service' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
      ],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    };

    const projection = adaptComponentConstellation(syntheticSchema, {
      customSunIds: ['LWC:SunA', 'LWC:SunB'],
    });

    expect(projection.summary.sunCount).toBe(2);
    expect(projection.summary.sharedNodeCount).toBe(1);
    expect(projection.sharedNodeIds).toEqual(['ApexClass:Service']);
  });
});
