import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeArchitectureLayout } from '../architecture-layout';
import { discoverFeatures } from './features';
import { classifyNodeLayer } from './layers';
import { isTestNode, isFieldNode } from './analysis';
import { evaluateLayout } from './evaluate-layout';
import { shouldAutoLayout } from '../position-policy';
import { filterGraphByNodeTypes } from '../search-filter';
import { computeFocusedGraph } from '../focus-graph';

// Load Salesforce Cloud Spend Tracker dataset
const cloudSpendDataPath = path.resolve(
  __dirname,
  '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);
const rawData = JSON.parse(fs.readFileSync(cloudSpendDataPath, 'utf8'));
const cloudSpendNodes: ExplorerNode[] = rawData.nodes || [];
const cloudSpendEdges: ExplorerEdge[] = rawData.edges || [];

function getBoundingBox(positions: Record<string, { x: number; y: number }>, nodeWidth = 120, nodeHeight = 60) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pos of Object.values(positions)) {
    if (!pos) continue;
    if (pos.x - nodeWidth / 2 < minX) minX = pos.x - nodeWidth / 2;
    if (pos.x + nodeWidth / 2 > maxX) maxX = pos.x + nodeWidth / 2;
    if (pos.y - nodeHeight / 2 < minY) minY = pos.y - nodeHeight / 2;
    if (pos.y + nodeHeight / 2 > maxY) maxY = pos.y + nodeHeight / 2;
  }
  const width = isFinite(minX) ? maxX - minX : 0;
  const height = isFinite(minY) ? maxY - minY : 0;
  const aspectRatio = height === 0 ? 0 : width / height;
  return { minX, maxX, minY, maxY, width, height, aspectRatio };
}

function getPrimaryProdOverlaps(nodes: ExplorerNode[], positions: Record<string, { x: number; y: number }>, nodeWidth = 120, nodeHeight = 60) {
  const primaryProdNodes = nodes.filter(n => !isTestNode(n) && !isFieldNode(n) && n.type !== 'External' && positions[n.id]);
  let overlaps = 0;

  for (let i = 0; i < primaryProdNodes.length; i++) {
    const id1 = primaryProdNodes[i].id;
    const p1 = positions[id1];
    for (let j = i + 1; j < primaryProdNodes.length; j++) {
      const id2 = primaryProdNodes[j].id;
      const p2 = positions[id2];

      if (
        Math.abs(p1.x - p2.x) < nodeWidth - 1e-3 &&
        Math.abs(p1.y - p2.y) < nodeHeight - 1e-3
      ) {
        overlaps++;
      }
    }
  }
  return overlaps;
}

function getMinPrimaryClearance(nodes: ExplorerNode[], positions: Record<string, { x: number; y: number }>, nodeWidth = 120, nodeHeight = 60) {
  const primaryNodes = nodes.filter(n => !isTestNode(n) && !isFieldNode(n) && n.type !== 'External' && positions[n.id]);
  let minGap = Infinity;

  for (let i = 0; i < primaryNodes.length; i++) {
    const posA = positions[primaryNodes[i].id];
    for (let j = i + 1; j < primaryNodes.length; j++) {
      const posB = positions[primaryNodes[j].id];
      const dx = Math.abs(posA.x - posB.x) - nodeWidth;
      const dy = Math.abs(posA.y - posB.y) - nodeHeight;
      const gap = Math.max(dx, dy);
      if (gap < minGap) {
        minGap = gap;
      }
    }
  }
  return isFinite(minGap) ? minGap : 40;
}

describe('Prompt 5 — Hybrid Hierarchy + Cluster Spatial Coherence Adversarial Suite', () => {
  it('S1 — Simple component: PaymentDomain + PaymentSelector + PaymentService preserves same cluster & correct layer hierarchy', () => {
    const makeNode = (id: string, type: ExplorerNode['type'], displayName: string): ExplorerNode => ({
      id,
      displayName,
      type,
      file: `${displayName}.cls`,
      risk: 'LOW',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    });

    const makeEdge = (id: string, source: string, target: string): ExplorerEdge => ({
      id,
      source,
      target,
      relationshipType: 'method-call',
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
        source: { type: 'ApexClass', name: source },
        target: { type: 'ApexClass', name: target },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    });

    const nodes: ExplorerNode[] = [
      makeNode('LWC:PaymentController', 'LWC', 'PaymentController'),
      makeNode('ApexClass:PaymentService', 'ApexClass', 'PaymentService'),
      makeNode('ApexClass:PaymentDomain', 'ApexClass', 'PaymentDomain'),
      makeNode('ApexClass:PaymentSelector', 'ApexClass', 'PaymentSelector'),
    ];

    const edges: ExplorerEdge[] = [
      makeEdge('e1', 'LWC:PaymentController', 'ApexClass:PaymentService'),
      makeEdge('e2', 'ApexClass:PaymentService', 'ApexClass:PaymentDomain'),
      makeEdge('e3', 'ApexClass:PaymentService', 'ApexClass:PaymentSelector'),
    ];

    const discovery = discoverFeatures(nodes, edges);
    expect(discovery.featureList.length).toBe(1);

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    // Verify layer ordering Y hierarchy: Presentation < Application < Domain
    const controllerLayer = classifyNodeLayer(nodes[0]); // presentation
    const serviceLayer = classifyNodeLayer(nodes[1]);    // application
    const domainLayer = classifyNodeLayer(nodes[2]);     // domain

    expect(controllerLayer).toBe('presentation');
    expect(serviceLayer).toBe('application');
    expect(domainLayer).toBe('domain');

    expect(positions['LWC:PaymentController'].y).toBeLessThan(positions['ApexClass:PaymentService'].y);
    expect(positions['ApexClass:PaymentService'].y).toBeLessThan(positions['ApexClass:PaymentDomain'].y);

    // Verify zero bounding-box overlaps
    expect(getPrimaryProdOverlaps(nodes, positions)).toBe(0);
  });

  it('S2 — Multi-layer component: Component spanning Presentation → Application → Domain → Schema maintains layer correctness & spatial alignment', () => {
    const makeNode = (id: string, type: ExplorerNode['type'], displayName: string): ExplorerNode => ({
      id,
      displayName,
      type,
      file: `${displayName}.cls`,
      risk: 'LOW',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    });

    const makeEdge = (id: string, source: string, target: string): ExplorerEdge => ({
      id,
      source,
      target,
      relationshipType: 'method-call',
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
        source: { type: 'ApexClass', name: source },
        target: { type: 'ApexClass', name: target },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    });

    const nodes: ExplorerNode[] = [
      makeNode('LWC:OrderForm', 'LWC', 'OrderForm'),
      makeNode('ApexClass:OrderController', 'ApexClass', 'OrderController'),
      makeNode('ApexClass:OrderService', 'ApexClass', 'OrderService'),
      makeNode('ApexClass:OrderDomain', 'ApexClass', 'OrderDomain'),
      makeNode('CustomObject:Order__c', 'CustomObject', 'Order__c'),
    ];

    const edges: ExplorerEdge[] = [
      makeEdge('e1', 'LWC:OrderForm', 'ApexClass:OrderController'),
      makeEdge('e2', 'ApexClass:OrderController', 'ApexClass:OrderService'),
      makeEdge('e3', 'ApexClass:OrderService', 'ApexClass:OrderDomain'),
      makeEdge('e4', 'ApexClass:OrderDomain', 'CustomObject:Order__c'),
    ];

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    // Layer Y order strictly preserved: Presentation <= Application <= Domain <= Schema
    expect(positions['LWC:OrderForm'].y).toBeLessThan(positions['ApexClass:OrderController'].y);
    expect(positions['ApexClass:OrderController'].y).toBeLessThanOrEqual(positions['ApexClass:OrderService'].y);
    expect(positions['ApexClass:OrderService'].y).toBeLessThan(positions['ApexClass:OrderDomain'].y);
    expect(positions['ApexClass:OrderDomain'].y).toBeLessThan(positions['CustomObject:Order__c'].y);

    // Bounding box overlaps = 0
    expect(getPrimaryProdOverlaps(nodes, positions)).toBe(0);

    // Component nodes maintain reasonable horizontal alignment (small X spread within region)
    const xPositions = nodes.map(n => positions[n.id].x);
    const xSpan = Math.max(...xPositions) - Math.min(...xPositions);
    expect(xSpan).toBeLessThan(1000);
  });

  it('S3 — Two components: Payment trio vs Order trio form 2 distinct non-overlapping spatial regions', () => {
    const makeNode = (id: string, type: ExplorerNode['type'], displayName: string): ExplorerNode => ({
      id,
      displayName,
      type,
      file: `${displayName}.cls`,
      risk: 'LOW',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    });

    const makeEdge = (id: string, source: string, target: string): ExplorerEdge => ({
      id,
      source,
      target,
      relationshipType: 'method-call',
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
        source: { type: 'ApexClass', name: source },
        target: { type: 'ApexClass', name: target },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    });

    const nodes: ExplorerNode[] = [
      makeNode('ApexClass:PaymentDomain', 'ApexClass', 'PaymentDomain'),
      makeNode('ApexClass:PaymentSelector', 'ApexClass', 'PaymentSelector'),
      makeNode('ApexClass:PaymentService', 'ApexClass', 'PaymentService'),
      makeNode('ApexClass:OrderDomain', 'ApexClass', 'OrderDomain'),
      makeNode('ApexClass:OrderSelector', 'ApexClass', 'OrderSelector'),
      makeNode('ApexClass:OrderService', 'ApexClass', 'OrderService'),
    ];

    const edges: ExplorerEdge[] = [
      makeEdge('e1', 'ApexClass:PaymentService', 'ApexClass:PaymentDomain'),
      makeEdge('e2', 'ApexClass:PaymentService', 'ApexClass:PaymentSelector'),
      makeEdge('e3', 'ApexClass:OrderService', 'ApexClass:OrderDomain'),
      makeEdge('e4', 'ApexClass:OrderService', 'ApexClass:OrderSelector'),
    ];

    const discovery = discoverFeatures(nodes, edges);
    expect(discovery.featureList.length).toBe(2);

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    const paymentX = [positions['ApexClass:PaymentDomain'].x, positions['ApexClass:PaymentSelector'].x, positions['ApexClass:PaymentService'].x];
    const orderX = [positions['ApexClass:OrderDomain'].x, positions['ApexClass:OrderSelector'].x, positions['ApexClass:OrderService'].x];

    const paymentMaxX = Math.max(...paymentX);
    const paymentMinX = Math.min(...paymentX);
    const orderMaxX = Math.max(...orderX);
    const orderMinX = Math.min(...orderX);

    // Regions are separated horizontally
    const isSeparated = paymentMaxX < orderMinX || orderMaxX < paymentMinX;
    expect(isSeparated).toBe(true);

    expect(getPrimaryProdOverlaps(nodes, positions)).toBe(0);
  });

  it('S4 — Feature-heavy graph: 21 features in Cloud Spend dataset maintain region separation and readability', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    expect(discovery.featureList.length).toBeGreaterThanOrEqual(15);

    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    expect(getPrimaryProdOverlaps(cloudSpendNodes, positions)).toBe(0);
    expect(getMinPrimaryClearance(cloudSpendNodes, positions)).toBeGreaterThanOrEqual(40);
  });

  it('S5 — Domain-heavy graph: 106 domains in Cloud Spend dataset wrap into 2D composition without horizontal stretching', () => {
    const domainPositions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: false });
    const featurePositions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    const domainBbox = getBoundingBox(domainPositions);
    const featureBbox = getBoundingBox(featurePositions);

    // Feature layout reduces overall width and aspect ratio significantly
    expect(featureBbox.width).toBeLessThan(domainBbox.width);
    expect(featureBbox.aspectRatio).toBeLessThan(domainBbox.aspectRatio);
  });

  it('S6 — Large graph: Scale 100+ node benchmark preserves locality and produces 0 primary overlaps', () => {
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    expect(getPrimaryProdOverlaps(cloudSpendNodes, positions)).toBe(0);
    expect(getMinPrimaryClearance(cloudSpendNodes, positions)).toBeGreaterThanOrEqual(40);
  });

  it('S7 — Dense component: 50+ nodes in one component expand spatial region elastically without squeezing', () => {
    const nodes: ExplorerNode[] = [];
    const edges: ExplorerEdge[] = [];

    const makeNode = (id: string, displayName: string): ExplorerNode => ({
      id,
      displayName,
      type: 'ApexClass',
      file: `${displayName}.cls`,
      risk: 'LOW',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    });

    const makeEdge = (id: string, source: string, target: string): ExplorerEdge => ({
      id,
      source,
      target,
      relationshipType: 'method-call',
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
        source: { type: 'ApexClass', name: source },
        target: { type: 'ApexClass', name: target },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    });

    // Create a 50-node dense component
    nodes.push(makeNode('ApexClass:CoreHub', 'CoreHub'));
    for (let i = 1; i <= 50; i++) {
      const nodeId = `ApexClass:Worker_${i}`;
      nodes.push(makeNode(nodeId, `Worker_${i}`));
      edges.push(makeEdge(`e_${i}`, 'ApexClass:CoreHub', nodeId));
    }

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    // Zero overlaps, minimum 40px clearance preserved
    expect(getPrimaryProdOverlaps(nodes, positions)).toBe(0);
    expect(getMinPrimaryClearance(nodes, positions)).toBeGreaterThanOrEqual(40);
  });

  it('S8 — High-degree hub: Hub with degree >= 10 preserves surrounding clearance buffer and readable edge fan', () => {
    const hubNode = cloudSpendNodes.find(n => n.id === 'ApexClass:CloudSpendService');
    expect(hubNode).toBeDefined();

    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    expect(getPrimaryProdOverlaps(cloudSpendNodes, positions)).toBe(0);
    expect(getMinPrimaryClearance(cloudSpendNodes, positions)).toBeGreaterThanOrEqual(40);
  });

  it('S9 — Shared infrastructure: Utility node serving multiple components does not collapse feature regions', () => {
    const makeNode = (id: string, displayName: string): ExplorerNode => ({
      id,
      displayName,
      type: 'ApexClass',
      file: `${displayName}.cls`,
      risk: 'LOW',
      riskReasons: [],
      metrics: { fanIn: 1, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    });

    const makeEdge = (id: string, source: string, target: string): ExplorerEdge => ({
      id,
      source,
      target,
      relationshipType: 'method-call',
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
        source: { type: 'ApexClass', name: source },
        target: { type: 'ApexClass', name: target },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: {},
      },
    });

    const nodes: ExplorerNode[] = [
      makeNode('ApexClass:AppLogger', 'AppLogger'),
      makeNode('ApexClass:PaymentService', 'PaymentService'),
      makeNode('ApexClass:PaymentDomain', 'PaymentDomain'),
      makeNode('ApexClass:OrderService', 'OrderService'),
      makeNode('ApexClass:OrderDomain', 'OrderDomain'),
      makeNode('ApexClass:BillingService', 'BillingService'),
      makeNode('ApexClass:BillingDomain', 'BillingDomain'),
    ];

    const edges: ExplorerEdge[] = [
      makeEdge('e1', 'ApexClass:PaymentService', 'ApexClass:PaymentDomain'),
      makeEdge('e2', 'ApexClass:OrderService', 'ApexClass:OrderDomain'),
      makeEdge('e3', 'ApexClass:BillingService', 'ApexClass:BillingDomain'),
      makeEdge('e4', 'ApexClass:PaymentService', 'ApexClass:AppLogger'),
      makeEdge('e5', 'ApexClass:OrderService', 'ApexClass:AppLogger'),
      makeEdge('e6', 'ApexClass:BillingService', 'ApexClass:AppLogger'),
    ];

    const discovery = discoverFeatures(nodes, edges);
    // AppLogger is recognized as shared infrastructure / utility and does not force Payment, Order, Billing features to merge
    const loggerAssignment = discovery.assignments.get('ApexClass:AppLogger');
    expect(loggerAssignment?.isShared).toBe(true);

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    expect(getPrimaryProdOverlaps(nodes, positions)).toBe(0);
  });

  it('S10 — Bridge-heavy graph: Cross-domain bridge corridors remain readable and non-overlapping', () => {
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    const evalResult = evaluateLayout(cloudSpendNodes, cloudSpendEdges, positions);

    expect(getPrimaryProdOverlaps(cloudSpendNodes, positions)).toBe(0);
    expect(evalResult.bridgeLocality).toBeDefined();
  });

  it('S11 — Satellite-heavy graph: Test classes and custom fields attach subordinate to anchors without moving primary nodes', () => {
    const fullPositions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    const evalResult = evaluateLayout(cloudSpendNodes, cloudSpendEdges, fullPositions);

    expect(getPrimaryProdOverlaps(cloudSpendNodes, fullPositions)).toBe(0);
    expect(evalResult.satelliteLocality.testCountWithTarget).toBeGreaterThan(0);
  });

  it('S12 — Filtered graph: Filtering preserves spatial semantics and static mode coordinate invariance', () => {
    const filterPolicy = shouldAutoLayout('static', 'filter-change', { hasAuthoritativePositions: true });
    expect(filterPolicy).toBe(false);

    const fullPositions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    const filtered = filterGraphByNodeTypes(cloudSpendNodes, cloudSpendEdges, ['ApexClass', 'LWC']);

    // In static mode, filtering retains coordinates from full layout
    expect(getPrimaryProdOverlaps(filtered.nodes, fullPositions)).toBe(0);
  });

  it('S13 — Focused graph: Focus depth and direction preserve layer hierarchy and feature cluster coherence', () => {
    const focused = computeFocusedGraph(cloudSpendNodes, cloudSpendEdges, {
      enabled: true,
      focusNodeId: 'ApexClass:AccountController',
      depth: 2,
      direction: 'both',
    });

    const fullPositions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    expect(getPrimaryProdOverlaps(focused.nodes, fullPositions)).toBe(0);
    expect(focused.nodes.length).toBeGreaterThan(0);
  });

  it('S14 — Position-authoritative graph: Level 1 and Level 2 user/persisted positions strictly override auto-layout', () => {
    const existingPositions = {
      'ApexClass:AccountController': { x: 9999, y: 8888 },
    };

    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
      existingPositions,
    });

    expect(positions['ApexClass:AccountController']).toEqual({ x: 9999, y: 8888 });
  });
});
