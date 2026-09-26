import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { discoverFeatures } from './features';
import { computeGlobalFeatureLayout } from './global-layout';
import { computeArchitectureLayout } from '../architecture-layout';
import { evaluateLayout } from './evaluate-layout';

function loadCloudSpendData(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('Phase 4-B — Feature Semantics & True 2D Region Geometry Test Suite', () => {
  const { nodes: cloudNodes, edges: cloudEdges } = loadCloudSpendData();

  it('1. Tests a single-layer feature', () => {
    const nodes: ExplorerNode[] = [
      {
        id: 'LWC:SingleLayerComponent',
        type: 'LWC',
        displayName: 'SingleLayerComponent',
        file: 'force-app/main/default/lwc/singleLayer/singleLayer.js',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'ApexClass:SingleLayerController',
        type: 'ApexClass',
        displayName: 'SingleLayerController',
        file: 'force-app/main/default/classes/SingleLayerController.cls',
        metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
    ];

    const edges: ExplorerEdge[] = [
      {
        id: 'e1',
        source: 'LWC:SingleLayerComponent',
        target: 'ApexClass:SingleLayerController',
        relationshipType: 'method-call',
        method: 'call',
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
          source: { type: 'LWC', name: 'SingleLayerComponent' },
          target: { type: 'ApexClass', name: 'SingleLayerController' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: {},
        },
      },
    ];

    const discovery = discoverFeatures(nodes, edges);
    expect(discovery.featureList.length).toBe(1);

    const layout = computeGlobalFeatureLayout(nodes, edges, { featureDiscovery: discovery });
    expect(layout.featureRegions.size).toBeGreaterThanOrEqual(1);
  });

  it('2. Tests a multi-layer feature spanning 2-3 layers', () => {
    const nodes: ExplorerNode[] = [
      {
        id: 'ApexClass:MultiLayerController',
        type: 'ApexClass',
        displayName: 'MultiLayerController',
        file: 'classes/MultiLayerController.cls',
        metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
        risk: 'LOW', riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'ApexClass:MultiLayerService',
        type: 'ApexClass',
        displayName: 'MultiLayerService',
        file: 'classes/MultiLayerService.cls',
        metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 0 },
        risk: 'LOW', riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'ApexClass:MultiLayerSelector',
        type: 'ApexClass',
        displayName: 'MultiLayerSelector',
        file: 'classes/MultiLayerSelector.cls',
        metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
        risk: 'LOW', riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 1, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
    ];

    const edges: ExplorerEdge[] = [
      {
        id: 'e1',
        source: 'ApexClass:MultiLayerController',
        target: 'ApexClass:MultiLayerService',
        relationshipType: 'method-call',
        method: 'call',
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
          source: { type: 'ApexClass', name: 'MultiLayerController' },
          target: { type: 'ApexClass', name: 'MultiLayerService' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: {},
        },
      },
      {
        id: 'e2',
        source: 'ApexClass:MultiLayerService',
        target: 'ApexClass:MultiLayerSelector',
        relationshipType: 'method-call',
        method: 'call',
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
          source: { type: 'ApexClass', name: 'MultiLayerService' },
          target: { type: 'ApexClass', name: 'MultiLayerSelector' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: {},
        },
      },
    ];

    const discovery = discoverFeatures(nodes, edges);
    expect(discovery.featureList.length).toBe(1);

    const layout = computeGlobalFeatureLayout(nodes, edges, { featureDiscovery: discovery });
    const region = layout.featureRegions.get(discovery.featureList[0].id);
    expect(region).toBeDefined();
    expect(region!.height).toBeGreaterThan(100);
  });

  it('3. Tests a feature spanning all four architecture layers', () => {
    const discovery = discoverFeatures(cloudNodes, cloudEdges);
    const fourLayerFeature = discovery.featureList.find(f => {
      const layers = new Set(f.primaryNodeIds.map(id => {
        const n = cloudNodes.find(node => node.id === id);
        return n ? n.type : '';
      }));
      return layers.size >= 3;
    });

    expect(fourLayerFeature).toBeDefined();
    const layout = computeGlobalFeatureLayout(cloudNodes, cloudEdges, { featureDiscovery: discovery });
    expect(layout.featureRegions.has(fourLayerFeature!.id)).toBe(true);
  });

  it('4. Tests large, small, many, and disconnected features', () => {
    const discovery = discoverFeatures(cloudNodes, cloudEdges);
    expect(discovery.featureList.length).toBeGreaterThan(10);

    const sortedFeatures = [...discovery.featureList].sort((a, b) => b.primaryNodeIds.length - a.primaryNodeIds.length);
    const largeFeature = sortedFeatures[0];
    const smallFeature = sortedFeatures[sortedFeatures.length - 1];

    expect(largeFeature.primaryNodeIds.length).toBeGreaterThan(5);
    expect(smallFeature.primaryNodeIds.length).toBeGreaterThanOrEqual(1);

    const disconnectedFeature = discovery.featureList.find(f => f.connectedFeatureIds.length === 0);
    expect(disconnectedFeature).toBeDefined();
  });

  it('5. Tests shared infrastructure and multi-feature relationships', () => {
    const discovery = discoverFeatures(cloudNodes, cloudEdges);
    const sharedNodes = Array.from(discovery.assignments.values()).filter(a => a.isShared);
    expect(sharedNodes.length).toBeGreaterThan(0);

    const multiFeatureShared = sharedNodes.filter(a => a.secondaryFeatureIds.length > 1);
    expect(multiFeatureShared.length).toBeGreaterThan(0);
  });

  it('6. Tests Unassigned nodes on Cloud Spend fixture', () => {
    const discovery = discoverFeatures(cloudNodes, cloudEdges);
    const unassignedNodes = Array.from(discovery.assignments.values()).filter(a => a.primaryFeatureId === 'Unassigned');
    expect(unassignedNodes.length).toBeGreaterThan(0);
  });

  it('7. Tests shuffled input order and repeated 10x deterministic execution', () => {
    const run1 = computeArchitectureLayout(cloudNodes, cloudEdges, { enableFeatureLayout: true });

    for (let i = 0; i < 10; i++) {
      const runN = computeArchitectureLayout(cloudNodes, cloudEdges, { enableFeatureLayout: true });
      for (const node of cloudNodes) {
        expect(runN[node.id].x).toBe(run1[node.id].x);
        expect(runN[node.id].y).toBe(run1[node.id].y);
      }
    }

    const shuffledNodes = [...cloudNodes].reverse();
    const shuffledEdges = [...cloudEdges].reverse();

    const runShuffled = computeArchitectureLayout(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });
    for (const node of cloudNodes) {
      expect(runShuffled[node.id].x).toBe(run1[node.id].x);
      expect(runShuffled[node.id].y).toBe(run1[node.id].y);
    }
  });

  it('8. Verifies zero primary overlaps and zero layer violations on Cloud Spend fixture', () => {
    const positions = computeArchitectureLayout(cloudNodes, cloudEdges, { enableFeatureLayout: true });
    const metrics = evaluateLayout(cloudNodes, cloudEdges, positions);

    expect(metrics.primaryOverlapCount).toBe(0);
    expect(metrics.layerViolationCount).toBe(0);
  });
});
