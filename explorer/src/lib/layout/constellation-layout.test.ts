import { describe, it, expect } from 'vitest';
import { adaptConstellation } from '../adapters/constellation-adapter';
import { computeConstellationLayout } from './constellation-layout';
import { ExplorerDataSchema } from '../../types/explorer';

describe('Constellation Layout Generator', () => {
  const sampleSchema: ExplorerDataSchema = {
    schemaVersion: '1.0',
    analyzerVersion: '1.0',
    generatedAt: '2026-09-27T00:00:00Z',
    sourceDirectory: '/project/src',
    summary: {
      nodeCount: 3,
      edgeCount: 2,
      highRiskCount: 1,
      mediumRiskCount: 0,
      lowRiskCount: 2,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: {
        files: 3,
        apexClasses: 2,
        apexTriggers: 0,
        lwcJs: 1,
        lwcHtml: 0,
        visualforce: 0,
        flows: 0,
        objects: 0,
        fields: 0,
      },
    },
    nodes: [
      {
        id: 'ApexClass:OrderController',
        displayName: 'OrderController',
        type: 'ApexClass',
        file: 'OrderController.cls',
        metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 50 },
        risk: 'HIGH',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 1,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: true,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'COVERED',
        },
      },
      {
        id: 'LWC:OrderView',
        displayName: 'OrderView',
        type: 'LWC',
        file: 'orderView.js',
        metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 10 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 1,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'COVERED',
        },
      },
      {
        id: 'ApexClass:OrderService',
        displayName: 'OrderService',
        type: 'ApexClass',
        file: 'OrderService.cls',
        metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 30 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 1,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'COVERED',
        },
      },
    ],
    edges: [
      {
        source: 'LWC:OrderView',
        target: 'ApexClass:OrderController',
        relationshipType: 'calls',
      },
      {
        source: 'ApexClass:OrderController',
        target: 'ApexClass:OrderService',
        relationshipType: 'calls',
      },
    ],
  };

  it('computes polar positions and edge curves deterministically', () => {
    const adapterData = adaptConstellation(sampleSchema, {
      focalNodeId: 'ApexClass:OrderController',
    });

    const layout = computeConstellationLayout(adapterData, {
      width: 800,
      height: 800,
      baseRadius: 150,
    });

    // Focal node position at origin (400, 400)
    expect(layout.focalPosition).not.toBeNull();
    expect(layout.focalPosition?.x).toBe(400);
    expect(layout.focalPosition?.y).toBe(400);

    // Ring 1 nodes should have radius 150
    const ring1Nodes = Object.values(layout.nodePositions).filter((p) => p.hopDistance === 1);
    expect(ring1Nodes.length).toBe(2);
    ring1Nodes.forEach((node) => {
      expect(node.radius).toBe(150);
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isNaN(node.x)).toBe(false);
      expect(Number.isNaN(node.y)).toBe(false);
    });

    // Edge paths generated with valid SVG path string
    expect(layout.edgePaths.length).toBe(2);
    layout.edgePaths.forEach((edge) => {
      expect(edge.pathSvg).toContain('M ');
      expect(edge.pathSvg).toContain('C ');
      expect(Number.isNaN(edge.sourceX)).toBe(false);
      expect(Number.isNaN(edge.targetX)).toBe(false);
    });
  });

  it('demonstrates 10x repeated execution determinism with 0.00000 px drift', () => {
    const adapterData = adaptConstellation(sampleSchema, {
      focalNodeId: 'ApexClass:OrderController',
    });

    const baseline = computeConstellationLayout(adapterData);

    for (let i = 0; i < 10; i++) {
      const current = computeConstellationLayout(adapterData);
      expect(current).toEqual(baseline);
    }
  });
});
