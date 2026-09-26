import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeArchitectureLayout } from '../architecture-layout';
import {
  classifyNodeConceptualCategory,
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
  computeNodeHubMetrics,
} from './centrality';
import { createLayoutGraphIndex } from './graph-index';
import { computeArchitectureAnalysis } from './analysis';
import { discoverFeatures } from './features';
import { placeSatellites } from './satellites';

function loadCloudSpendData(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('Phase 2.4 — Shared Infrastructure, Bridge, and Satellite Spatial Behavior Verification Suite', () => {
  const { nodes, edges } = loadCloudSpendData();

  it('1. High Fan-In Shared Infrastructure Nodes Audit', () => {
    const index = createLayoutGraphIndex(nodes, edges);
    const analysis = computeArchitectureAnalysis(nodes, edges, { index });
    const featureDiscovery = discoverFeatures(nodes, edges, { index, analysis });

    const highFanInNodes = [
      'Object:Cloud_Account__c',
      'Object:User_Organization_Role__c',
      'External:User',
    ];

    highFanInNodes.forEach(nodeId => {
      const node = index.nodeById.get(nodeId);
      expect(node).toBeDefined();

      const assignment = featureDiscovery.assignments.get(nodeId);
      expect(assignment).toBeDefined();
      expect(assignment?.isShared || assignment?.primaryFeatureId === 'Shared').toBe(true);

      const fanIn = index.incidentEdgesByNode.get(nodeId)?.filter(e => e.target === nodeId).length || 0;
      const fanOut = index.incidentEdgesByNode.get(nodeId)?.filter(e => e.source === nodeId).length || 0;
      const { isHub, hubType } = computeNodeHubMetrics(fanIn, fanOut);

      expect(isHub || fanIn >= 20).toBe(true);
      expect(hubType).toBe('fan-in');
    });
  });

  it('2. Multi-Feature Shared Nodes and Conceptual 5-Category Classification', () => {
    const index = createLayoutGraphIndex(nodes, edges);
    const analysis = computeArchitectureAnalysis(nodes, edges, { index });
    const featureDiscovery = discoverFeatures(nodes, edges, { index, analysis });

    const domainMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((assignment, nodeId) => {
      domainMap.set(nodeId, assignment.primaryFeatureId);
    });

    const layerMap = new Map<string, any>();
    analysis.nodeList.forEach(item => {
      layerMap.set(item.nodeId, item.layer);
    });

    const centralityMap = computeGraphCentralityAnalysis(nodes, edges, domainMap, layerMap, { index });

    const categoryCounts: Record<string, number> = {
      'satellite': 0,
      'shared-infrastructure': 0,
      'bridge': 0,
      'multi-feature': 0,
      'feature-local': 0,
    };

    nodes.forEach(node => {
      const centrality = centralityMap.get(node.id)!;
      const assignment = featureDiscovery.assignments.get(node.id);
      const primaryRegion = assignment ? assignment.primaryFeatureId : 'Unassigned';
      const secondaryRegions = assignment ? assignment.secondaryFeatureIds : [];
      const connectedRegions = [primaryRegion, ...secondaryRegions].filter(r => r !== 'Unassigned');

      const isSharedOrUnassigned = primaryRegion === 'Shared' || primaryRegion === 'Unassigned' || assignment?.isShared;

      const cat = classifyNodeConceptualCategory(
        node.id,
        node,
        centrality,
        primaryRegion,
        connectedRegions,
        isSharedOrUnassigned
      );

      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    console.log('\n================ 5 CONCEPTUAL CATEGORIES BREAKDOWN ================');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(25)}: ${count} (${((count / nodes.length) * 100).toFixed(1)}%)`);
    });

    expect(categoryCounts['satellite']).toBe(90);
    expect(categoryCounts['shared-infrastructure']).toBe(79);
    expect(categoryCounts['bridge']).toBe(14);
    expect(categoryCounts['multi-feature']).toBe(57);
  });

  it('3. Bridge Corridors and Trap Avoidance Verification', () => {
    const domainXCenters = {
      FeatureA: 100,
      DomainB: 500,
      FeatureB: 900,
    };

    const domainBounds = {
      FeatureA: { minX: 0, maxX: 200 },
      DomainB: { minX: 400, maxX: 600 },
      FeatureB: { minX: 800, maxX: 1000 },
    };

    const placement = calculateBridgeCandidatePosition(
      'BridgeControllerNode',
      'application',
      ['FeatureA', 'FeatureB'],
      domainXCenters,
      domainBounds,
      {},
      { layerSpacing: 250, nodeWidth: 120 }
    );

    expect(placement.hasIntermediateTrap).toBe(true);
    expect(placement.trapDomainId).toBe('DomainB');
    expect(placement.candidatePosition.y).toBe(225);
    expect(placement.candidatePosition.x).toBe(500);
  });

  it('4. Dense Satellite Clusters (High Fan-Out Fields & Multi-Test Targets)', () => {
    const parentObject: ExplorerNode = {
      id: 'Object:DenseObject__c',
      displayName: 'DenseObject__c',
      type: 'CustomObject',
      file: 'DenseObject.object-meta.xml',
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
    };

    const denseFields: ExplorerNode[] = [];
    const denseEdges: ExplorerEdge[] = [];

    for (let i = 1; i <= 35; i++) {
      const fieldId = `CustomField:DenseObject__c.Field_${i}__c`;
      denseFields.push({
        id: fieldId,
        displayName: `Field_${i}__c`,
        type: 'CustomField',
        file: `Field_${i}.field-meta.xml`,
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      });
      denseEdges.push({
        id: `Edge:DenseObject__c-Field_${i}`,
        source: 'Object:DenseObject__c',
        target: fieldId,
        relationshipType: 'field-reference',
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
          source: { type: 'CustomObject', name: 'DenseObject__c' },
          target: { type: 'CustomField', name: `Field_${i}__c` },
          relationship: { type: 'field-reference', resolution: 'EXACT' },
          location: {},
        },
      });
    }

    const testNodes = [parentObject, ...denseFields];
    const index = createLayoutGraphIndex(testNodes, denseEdges);
    const analysis = computeArchitectureAnalysis(testNodes, denseEdges, { index });

    const primaryPositions = {
      'Object:DenseObject__c': { x: 500, y: 850 },
    };

    const satelliteResult = placeSatellites(testNodes, denseEdges, analysis, primaryPositions, { index });

    expect(satelliteResult.placedFieldsCount).toBe(35);

    // Verify 0 overlaps among dense fields and parent object
    const nodeWidth = 120;
    const nodeHeight = 60;
    const allPositions = Object.entries(satelliteResult.positions);

    for (let i = 0; i < allPositions.length; i++) {
      for (let j = i + 1; j < allPositions.length; j++) {
        const [, posA] = allPositions[i];
        const [, posB] = allPositions[j];

        const dx = Math.abs(posA.x - posB.x);
        const dy = Math.abs(posA.y - posB.y);

        expect(dx >= nodeWidth || dy >= nodeHeight).toBe(true);
      }
    }
  });

  it('5. Cloud Spend Real Dataset Spatial Invariants & Overlap Elimination', () => {
    const layout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    expect(Object.keys(layout).length).toBe(nodes.length);

    const index = createLayoutGraphIndex(nodes, edges);
    const analysis = computeArchitectureAnalysis(nodes, edges, { index });

    const satelliteIds = new Set<string>();
    const primaryIds = new Set<string>();

    nodes.forEach(n => {
      const nodeAnalysis = analysis.nodes.get(n.id);
      if (nodeAnalysis?.isTest || nodeAnalysis?.isField) {
        satelliteIds.add(n.id);
      } else {
        primaryIds.add(n.id);
      }
    });

    const satSatCollisions: Array<[string, string]> = [];
    const satPriCollisions: Array<[string, string]> = [];

    const nodeWidth = 120;
    const nodeHeight = 60;

    const satArray = Array.from(satelliteIds);
    const priArray = Array.from(primaryIds);

    // Sat-Sat
    for (let i = 0; i < satArray.length; i++) {
      for (let j = i + 1; j < satArray.length; j++) {
        const idA = satArray[i];
        const idB = satArray[j];
        const posA = layout[idA];
        const posB = layout[idB];
        if (!posA || !posB) continue;

        if (Math.abs(posA.x - posB.x) < nodeWidth && Math.abs(posA.y - posB.y) < nodeHeight) {
          satSatCollisions.push([idA, idB]);
        }
      }
    }

    // Sat-Pri
    for (const satId of satArray) {
      const posA = layout[satId];
      if (!posA) continue;
      for (const priId of priArray) {
        const posB = layout[priId];
        if (!posB) continue;

        if (Math.abs(posA.x - posB.x) < nodeWidth && Math.abs(posA.y - posB.y) < nodeHeight) {
          satPriCollisions.push([satId, priId]);
        }
      }
    }

    console.log(`Satellite-Satellite Overlaps: ${satSatCollisions.length}`);
    console.log(`Satellite-Primary Overlaps: ${satPriCollisions.length}`);

    expect(satSatCollisions.length).toBe(0);
    expect(satPriCollisions.length).toBe(0);

    // Verify all coordinates are finite
    Object.values(layout).forEach(pos => {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    });
  });

  it('6. 10x Determinism & Input Permutation Invariance (0.00000 px Drift)', () => {
    const baseLayout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    // 10 repeated runs
    for (let run = 1; run <= 10; run++) {
      const runLayout = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
      let maxDrift = 0;

      for (const nodeId of Object.keys(baseLayout)) {
        const pos1 = baseLayout[nodeId];
        const pos2 = runLayout[nodeId];
        const drift = Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y);
        if (drift > maxDrift) maxDrift = drift;
      }

      expect(maxDrift).toBeCloseTo(0, 5);
    }

    // Shuffled input order
    const shuffledNodes = [...nodes].reverse();
    const shuffledEdges = [...edges].reverse();

    const shuffledLayout = computeArchitectureLayout(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });
    let maxShuffledDrift = 0;

    for (const nodeId of Object.keys(baseLayout)) {
      const pos1 = baseLayout[nodeId];
      const pos2 = shuffledLayout[nodeId];
      const drift = Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y);
      if (drift > maxShuffledDrift) maxShuffledDrift = drift;
    }

    expect(maxShuffledDrift).toBeCloseTo(0, 5);
  });

  it('7. Position Authority Preservation (Zero Displacement of Fixed Anchors)', () => {
    const fixedPositions = {
      'ApexClass:CloudAccountController': { x: 1234.56, y: 7890.12 },
      'Object:Cloud_Account__c': { x: 5555.55, y: 6666.66 },
    };

    const layoutWithAuthoritative = computeArchitectureLayout(nodes, edges, {
      enableFeatureLayout: true,
      existingPositions: fixedPositions,
    });

    expect(layoutWithAuthoritative['ApexClass:CloudAccountController']).toEqual({ x: 1234.56, y: 7890.12 });
    expect(layoutWithAuthoritative['Object:Cloud_Account__c']).toEqual({ x: 5555.55, y: 6666.66 });
  });
});
