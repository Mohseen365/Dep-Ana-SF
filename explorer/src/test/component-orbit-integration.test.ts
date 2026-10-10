import { describe, test, expect } from 'vitest';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

describe('Component Orbit Integration in computeArchitectureLayoutWithMetadata', () => {
  const sampleNodes: ExplorerNode[] = [
    {
      id: 'LWC:asset-dashboard-container',
      displayName: 'AssetDashboardContainer',
      type: 'LWC',
      file: 'force-app/lwc/assetDashboardContainer',
      risk: 'LOW',
      metrics: { fanIn: 0, fanOut: 2, coupling: 2, unresolved: 0, score: 0 },
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
    {
      id: 'ApexClass:AssetController',
      displayName: 'AssetController',
      type: 'ApexClass',
      file: 'force-app/classes/AssetController.cls',
      risk: 'LOW',
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
    {
      id: 'LWC:asset-tile',
      displayName: 'AssetTile',
      type: 'LWC',
      file: 'force-app/lwc/assetTile',
      risk: 'LOW',
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    },
  ];

  const sampleEdges: ExplorerEdge[] = [
    {
      id: 'e1',
      source: 'LWC:asset-dashboard-container',
      target: 'ApexClass:AssetController',
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
      canonical: {
        source: { type: 'LWC', name: 'LWC:asset-dashboard-container' },
        target: { type: 'ApexClass', name: 'ApexClass:AssetController' },
        relationship: { type: 'lwc-apex', resolution: 'EXACT' },
        location: {},
      },
    },
    {
      id: 'e2',
      source: 'LWC:asset-dashboard-container',
      target: 'LWC:asset-tile',
      relationshipType: 'lwc-template-child',
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
      canonical: {
        source: { type: 'LWC', name: 'LWC:asset-dashboard-container' },
        target: { type: 'LWC', name: 'LWC:asset-tile' },
        relationship: { type: 'lwc-template-child', resolution: 'EXACT' },
        location: {},
      },
    },
  ];

  test('delegates to Component Orbit layout when architectureMode is orbit and focalLwcId is provided', () => {
    const res = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:asset-dashboard-container',
    });

    expect(res.positions).toBeDefined();
    // Sun at 0,0
    expect(res.positions['LWC:asset-dashboard-container']).toEqual({ x: 0, y: 0 });

    const controllerPos = res.positions['ApexClass:AssetController'];
    const tilePos = res.positions['LWC:asset-tile'];

    expect(controllerPos).toBeDefined();
    expect(tilePos).toBeDefined();

    expect(controllerPos.x).toBe(280);
    expect(controllerPos.y).toBe(0);
    expect(tilePos.x).toBe(-280);
    expect(tilePos.y).toBe(0);
  });

  test('Case A — retains position authority for focal Sun when stale existingPositions are passed', () => {
    const res = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:asset-dashboard-container',
      existingPositions: {
        'LWC:asset-dashboard-container': { x: 100, y: 200 },
      },
    });

    // Component Orbit geometry is authoritative for projected Sun
    expect(res.positions['LWC:asset-dashboard-container']).toEqual({ x: 0, y: 0 });
  });

  test('Case B — retains position authority for projected dependency when stale existingPositions are passed', () => {
    const res = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:asset-dashboard-container',
      existingPositions: {
        'ApexClass:AssetController': { x: 999, y: 888 },
      },
    });

    // Component Orbit geometry is authoritative for projected dependency
    expect(res.positions['ApexClass:AssetController']).toEqual({ x: 280, y: 0 });
  });

  test('Case C — isolates position map output from unprojected nodes outside current orbit projection (DEF-01)', () => {
    const res = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:asset-dashboard-container',
      existingPositions: {
        'ApexClass:UnrelatedClass': { x: 500, y: 500 },
      },
    });

    // Unprojected node is absent from returned position map under DEF-01
    expect(res.positions['ApexClass:UnrelatedClass']).toBeUndefined();
  });

  test('Case D — invariant layout geometry of projected nodes across varying stale position inputs', () => {
    const pureRes = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:asset-dashboard-container',
    });

    const staleRes = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:asset-dashboard-container',
      existingPositions: {
        'LWC:asset-dashboard-container': { x: -1000, y: -2000 },
        'ApexClass:AssetController': { x: 3000, y: 4000 },
        'ApexClass:UnrelatedClass': { x: 500, y: 500 },
      },
    });

    expect(staleRes.positions['LWC:asset-dashboard-container']).toEqual(pureRes.positions['LWC:asset-dashboard-container']);
    expect(staleRes.positions['ApexClass:AssetController']).toEqual(pureRes.positions['ApexClass:AssetController']);
    expect(staleRes.positions['LWC:asset-tile']).toEqual(pureRes.positions['LWC:asset-tile']);
    expect(staleRes.positions['ApexClass:UnrelatedClass']).toBeUndefined();
  });
});
