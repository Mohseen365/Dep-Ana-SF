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

  test('preserves position authority when existingPositions are passed', () => {
    const res = computeArchitectureLayoutWithMetadata(sampleNodes, sampleEdges, {
      architectureMode: 'orbit',
      focalLwcId: 'LWC:asset-dashboard-container',
      existingPositions: {
        'LWC:asset-dashboard-container': { x: 100, y: 200 },
      },
    });

    expect(res.positions['LWC:asset-dashboard-container']).toEqual({ x: 100, y: 200 });
  });
});
