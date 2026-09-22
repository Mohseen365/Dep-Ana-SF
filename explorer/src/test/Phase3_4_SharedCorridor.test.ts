import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import {
  computeGraphCentralityAnalysis,
  classifyNodeConceptualCategory,
  calculateBridgeCandidatePosition,
} from '../lib/layout/centrality';
import { placeSatellites } from '../lib/layout/satellites';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { calculateLayoutMetrics, calculateDetailedEdgeCrossings } from '../lib/layout/metrics';

describe('Phase 3.4 — Shared Infrastructure & Corridor Spatial Behavior Verification Suite', () => {
  const fixturePath = path.resolve(
    __dirname,
    '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
  );

  let rawData: { nodes: ExplorerNode[]; edges: ExplorerEdge[] };

  if (fs.existsSync(fixturePath)) {
    rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  } else {
    rawData = { nodes: [], edges: [] };
  }

  const { nodes, edges } = rawData;

  it('1. Audits high fan-in and shared infrastructure nodes on Cloud Spend dataset', () => {
    if (nodes.length === 0) return;

    const layerMap = new Map<string, any>();
    nodes.forEach(n => layerMap.set(n.id, classifyNodeLayerWithReason(n).layer));

    const domainDiscovery = discoverDomains(nodes, edges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((a, id) => domainMap.set(id, a.primaryDomain));

    const centralityMap = computeGraphCentralityAnalysis(nodes, edges, domainMap, layerMap);

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    // Identify high fan-in nodes
    const highFanInNodes = nodes.filter(n => {
      const fanIn = edges.filter(e => e.target === n.id).length;
      return fanIn >= 20;
    });

    expect(highFanInNodes.length).toBeGreaterThan(0);

    highFanInNodes.forEach(node => {
      const pos = positions[node.id];
      expect(pos).toBeDefined();
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);

      const centrality = centralityMap.get(node.id);
      expect(centrality).toBeDefined();

      const category = classifyNodeConceptualCategory(
        node.id,
        node,
        centrality!,
        domainMap.get(node.id) || null,
        centrality!.connectedDomains
      );

      expect(['shared-infrastructure', 'bridge', 'satellite']).toContain(category);
    });
  });

  it('2. Verifies bridge corridor candidate positioning with anti-collision stepping', () => {
    const bridgePositionsMap: Record<string, { x: number; y: number }> = {};

    const bridgeInfo1 = calculateBridgeCandidatePosition(
      'ApexClass:BridgeAdapter1',
      'application',
      ['DomainA', 'DomainB'],
      { DomainA: 400, DomainB: 1200 },
      { DomainA: { minX: 300, maxX: 500 }, DomainB: { minX: 1100, maxX: 1300 } },
      {
        'ApexClass:DomainAController': { x: 400, y: 350 },
        'ApexClass:DomainBController': { x: 1200, y: 350 },
      },
      { layerSpacing: 250, nodeWidth: 120, nodeHeight: 60, allocatedPositions: bridgePositionsMap }
    );

    expect(bridgeInfo1.candidatePosition.x).toBe(800);
    // Lifted into corridor above application layer Y (350 - 125 = 225)
    expect(bridgeInfo1.candidatePosition.y).toBe(225);

    bridgePositionsMap['ApexClass:BridgeAdapter1'] = bridgeInfo1.candidatePosition;

    // Second bridge in same corridor receives deterministic anti-collision step
    const bridgeInfo2 = calculateBridgeCandidatePosition(
      'ApexClass:BridgeAdapter2',
      'application',
      ['DomainA', 'DomainB'],
      { DomainA: 400, DomainB: 1200 },
      { DomainA: { minX: 300, maxX: 500 }, DomainB: { minX: 1100, maxX: 1300 } },
      {
        'ApexClass:DomainAController': { x: 400, y: 350 },
        'ApexClass:DomainBController': { x: 1200, y: 350 },
      },
      { layerSpacing: 250, nodeWidth: 120, nodeHeight: 60, allocatedPositions: bridgePositionsMap }
    );

    expect(bridgeInfo2.candidatePosition.x).not.toBe(bridgeInfo1.candidatePosition.x);
    expect(bridgeInfo2.candidatePosition.y).toBe(bridgeInfo1.candidatePosition.y);
  });

  it('3. Verifies dense satellite cluster placement around parent anchors with 0 overlaps', () => {
    const parentPos = { 'Object:Test_Object__c': { x: 1000, y: 600 } };
    const mockNodes: ExplorerNode[] = [
      {
        id: 'Object:Test_Object__c',
        displayName: 'Test Object',
        type: 'CustomObject',
        file: 'force-app/main/default/objects/Test_Object__c.object-meta.xml',
        metrics: { fanIn: 35, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
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
          testCoverageStatus: 'TESTED',
        },
      },
    ];

    const mockEdges: ExplorerEdge[] = [];

    for (let i = 1; i <= 35; i++) {
      const fieldId = `Field:Test_Object__c.Field_${i}__c`;
      mockNodes.push({
        id: fieldId,
        displayName: `Field ${i}`,
        type: 'CustomField',
        file: '',
        metrics: { fanIn: 1, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
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
          testCoverageStatus: 'TESTED',
        },
      });
      mockEdges.push({
        source: 'Object:Test_Object__c',
        target: fieldId,
        type: 'contains',
      });
    }

    const mockAnalysis = {
      nodes: new Map(),
      nodeList: mockNodes.map(n => ({
        nodeId: n.id,
        node: n,
        nodeType: n.type,
        displayName: n.displayName,
        file: n.file,
        layer: 'schema' as const,
        domain: 'Test',
        role: 'data' as const,
        isTest: false,
        isField: n.type === 'CustomField',
        fanIn: 0,
        fanOut: 0,
        degree: 0,
        neighborIds: [],
        parentObjectId: n.type === 'CustomField' ? 'Object:Test_Object__c' : null,
      })),
      domainCount: 1,
      layerCounts: { presentation: 0, application: 0, domain: 0, schema: 36 },
      crossDomainEdgeCount: 0,
      components: [],
      hubNodeIds: [],
      bridgeNodeIds: [],
      sharedNodeIds: [],
    };

    const satelliteResult = placeSatellites(
      mockNodes,
      mockEdges,
      mockAnalysis as any,
      parentPos,
      { nodeWidth: 120, nodeHeight: 60, horizontalGap: 40, verticalGap: 40 }
    );

    expect(satelliteResult.placedFieldsCount).toBe(35);
    expect(satelliteResult.positions['Object:Test_Object__c']).toEqual(parentPos['Object:Test_Object__c']);

    // Check zero overlaps
    const activePositions = satelliteResult.positions;
    const posKeys = Object.keys(activePositions);

    for (let i = 0; i < posKeys.length; i++) {
      for (let j = i + 1; j < posKeys.length; j++) {
        const p1 = activePositions[posKeys[i]];
        const p2 = activePositions[posKeys[j]];
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);
        const overlaps = dx < 120 - 1e-3 && dy < 60 - 1e-3;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('4. Verifies Cloud Spend real dataset spatial invariants (0 satellite overlaps, finite coords)', () => {
    if (nodes.length === 0) return;

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    const metrics = calculateLayoutMetrics(nodes, edges, positions);
    const detailedCrossings = calculateDetailedEdgeCrossings(nodes, edges, positions);

    expect(metrics.satelliteOverlapCount).toBe(0);
    expect(detailedCrossings.totalGeometricCrossings).toBeGreaterThan(0);

    // Verify all coordinates are finite
    Object.values(positions).forEach(pos => {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    });
  });

  it('5. Verifies 10x determinism and input permutation invariance (0.00000 px drift)', () => {
    if (nodes.length === 0) return;

    const basePositions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    for (let run = 0; run < 10; run++) {
      const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
      const shuffledEdges = [...edges].sort(() => Math.random() - 0.5);

      const runPositions = computeArchitectureLayout(shuffledNodes, shuffledEdges, {
        enableFeatureLayout: true,
      });

      for (const n of nodes) {
        const pBase = basePositions[n.id];
        const pRun = runPositions[n.id];

        expect(pRun).toBeDefined();
        expect(Math.abs(pBase.x - pRun.x)).toBeLessThan(1e-4);
        expect(Math.abs(pBase.y - pRun.y)).toBeLessThan(1e-4);
      }
    }
  });
});
