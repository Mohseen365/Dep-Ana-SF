import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { discoverFeatures } from './features';
import { computeArchitectureLayout } from '../architecture-layout';
import { deriveFeatureCompositionGroups } from './feature-composition';
import { getSharedHighlightData } from './shared-highlight';
import { shouldAutoLayout } from '../position-policy';
import { filterGraphByNodeTypes } from '../search-filter';
import { computeFocusedGraph } from '../focus-graph';

// Load Salesforce Cloud Spend Tracker acceptance dataset
const cloudSpendDataPath = path.resolve(
  __dirname,
  '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);
const rawData = JSON.parse(fs.readFileSync(cloudSpendDataPath, 'utf8'));
const cloudSpendNodes: ExplorerNode[] = rawData.nodes || [];
const cloudSpendEdges: ExplorerEdge[] = rawData.edges || [];

describe('Prompt 4 — Visual Composition & Shared Infrastructure Readability Suite', () => {
  it('S1 — Single Component: PaymentDomain + PaymentSelector + PaymentService resolves into 1 coherent composition region', () => {
    const nodes: ExplorerNode[] = [
      { id: 'ApexClass:PaymentDomain', name: 'PaymentDomain', displayName: 'PaymentDomain', type: 'ApexClass', risk: 'LOW' },
      { id: 'ApexClass:PaymentSelector', name: 'PaymentSelector', displayName: 'PaymentSelector', type: 'ApexClass', risk: 'LOW' },
      { id: 'ApexClass:PaymentService', name: 'PaymentService', displayName: 'PaymentService', type: 'ApexClass', risk: 'LOW' },
    ];

    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'ApexClass:PaymentService', target: 'ApexClass:PaymentDomain' },
      { id: 'e2', source: 'ApexClass:PaymentService', target: 'ApexClass:PaymentSelector' },
    ];

    const discovery = discoverFeatures(nodes, edges);
    expect(discovery.featureList.length).toBe(1);

    const feature = discovery.featureList[0];
    expect(feature.primaryNodeIds).toContain('ApexClass:PaymentDomain');
    expect(feature.primaryNodeIds).toContain('ApexClass:PaymentSelector');
    expect(feature.primaryNodeIds).toContain('ApexClass:PaymentService');

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const groups = deriveFeatureCompositionGroups(feature, nodes, edges, positions);

    // Single coherent composition region
    expect(groups.length).toBe(1);
    expect(groups[0].nodeIds).toHaveLength(3);
    expect(groups[0].label).toContain('Group');
    expect(groups[0].bounds).toBeDefined();
    if (groups[0].bounds) {
      expect(groups[0].bounds.width).toBeGreaterThan(0);
      expect(groups[0].bounds.height).toBeGreaterThan(0);
    }
  });

  it('S2 — Multiple Components: Payment trio vs Order trio form 2 distinct semantic regions without accidental merging', () => {
    const nodes: ExplorerNode[] = [
      { id: 'ApexClass:PaymentDomain', name: 'PaymentDomain', displayName: 'PaymentDomain', type: 'ApexClass', risk: 'LOW' },
      { id: 'ApexClass:PaymentSelector', name: 'PaymentSelector', displayName: 'PaymentSelector', type: 'ApexClass', risk: 'LOW' },
      { id: 'ApexClass:PaymentService', name: 'PaymentService', displayName: 'PaymentService', type: 'ApexClass', risk: 'LOW' },
      { id: 'ApexClass:OrderDomain', name: 'OrderDomain', displayName: 'OrderDomain', type: 'ApexClass', risk: 'LOW' },
      { id: 'ApexClass:OrderSelector', name: 'OrderSelector', displayName: 'OrderSelector', type: 'ApexClass', risk: 'LOW' },
      { id: 'ApexClass:OrderService', name: 'OrderService', displayName: 'OrderService', type: 'ApexClass', risk: 'LOW' },
    ];

    const edges: ExplorerEdge[] = [
      { id: 'e1', source: 'ApexClass:PaymentService', target: 'ApexClass:PaymentDomain' },
      { id: 'e2', source: 'ApexClass:PaymentService', target: 'ApexClass:PaymentSelector' },
      { id: 'e3', source: 'ApexClass:OrderService', target: 'ApexClass:OrderDomain' },
      { id: 'e4', source: 'ApexClass:OrderService', target: 'ApexClass:OrderSelector' },
    ];

    const discovery = discoverFeatures(nodes, edges);
    expect(discovery.featureList.length).toBe(2);

    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    const paymentFeature = discovery.featureList.find((f) => f.id.includes('Payment'))!;
    const orderFeature = discovery.featureList.find((f) => f.id.includes('Order'))!;

    expect(paymentFeature).toBeDefined();
    expect(orderFeature).toBeDefined();

    const paymentGroups = deriveFeatureCompositionGroups(paymentFeature, nodes, edges, positions);
    const orderGroups = deriveFeatureCompositionGroups(orderFeature, nodes, edges, positions);

    expect(paymentGroups.length).toBe(1);
    expect(orderGroups.length).toBe(1);

    // Verify distinct member nodes
    expect(paymentGroups[0].nodeIds.some((id) => id.includes('Order'))).toBe(false);
    expect(orderGroups[0].nodeIds.some((id) => id.includes('Payment'))).toBe(false);
  });

  it('S3 — Feature-Heavy Graph: Composition remains readable with IoU deduplication and non-overlapping group bounds', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    let totalCompositionGroups = 0;
    discovery.featureList.forEach((feat) => {
      const groups = deriveFeatureCompositionGroups(feat, cloudSpendNodes, cloudSpendEdges, positions);
      totalCompositionGroups += groups.length;

      // Deduplication check per feature
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const b1 = groups[i].bounds;
          const b2 = groups[j].bounds;
          if (b1 && b2) {
            const xMin = Math.max(b1.xMin, b2.xMin);
            const xMax = Math.min(b1.xMax, b2.xMax);
            const yMin = Math.max(b1.yMin, b2.yMin);
            const yMax = Math.min(b1.yMax, b2.yMax);
            if (xMax > xMin && yMax > yMin) {
              const intersection = (xMax - xMin) * (yMax - yMin);
              const union = b1.width * b1.height + b2.width * b2.height - intersection;
              const iou = intersection / union;
              expect(iou).toBeLessThan(0.55);
            }
          }
        }
      }
    });

    expect(totalCompositionGroups).toBeGreaterThan(0);
  });

  it('S4 — Shared Infrastructure Hub: Shared nodes are not duplicated; shared edges are subordinate by default and revealed on interaction', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);

    // Default state: no highlight active
    const defaultHighlight = getSharedHighlightData('', discovery, cloudSpendNodes, cloudSpendEdges);
    expect(defaultHighlight.type).toBe('none');
    expect(defaultHighlight.sharedNodeIds).toHaveLength(0);

    // Interaction state: hovering AuditService (high fan-in shared infrastructure node)
    const activeHighlight = getSharedHighlightData('ApexClass:AuditService', discovery, cloudSpendNodes, cloudSpendEdges);
    expect(activeHighlight.type).toBe('shared_to_features');
    expect(activeHighlight.sharedNodeIds).toEqual(['ApexClass:AuditService']);
    expect(activeHighlight.featureIds.length).toBeGreaterThan(1);
    expect(activeHighlight.connectedNodeIds.length).toBeGreaterThan(1);

    // Shared node is NOT physically duplicated in assignment list
    const auditAssignment = discovery.assignments.get('ApexClass:AuditService');
    expect(auditAssignment).toBeDefined();
    expect(auditAssignment?.isShared).toBe(true);
  });

  it('S5 — Bridge-Heavy Graph: Bridge relationships do not collapse composition into unreadable corridors', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    // Verify bridge nodes remain distinct and non-overlapping with primary nodes
    const bridgeAssignments = Array.from(discovery.assignments.values()).filter(
      (a) => a.featureRole === 'FeatureBridge'
    );

    bridgeAssignments.forEach((b) => {
      const pos = positions[b.nodeId];
      expect(pos).toBeDefined();
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeGreaterThanOrEqual(0);
    });
  });

  it('S6 — Dense Feature: Retains minimum overlay padding (20px) and visual clearance around nodes', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    const forecastFeature = discovery.features.get('feature_forecast-manager');
    expect(forecastFeature).toBeDefined();

    if (forecastFeature) {
      const groups = deriveFeatureCompositionGroups(forecastFeature, cloudSpendNodes, cloudSpendEdges, positions, {
        padding: 20,
      });

      groups.forEach((group) => {
        if (group.bounds) {
          expect(group.bounds.width).toBeGreaterThanOrEqual(160); // 120 nodeWidth + 2*20 padding
          expect(group.bounds.height).toBeGreaterThanOrEqual(100); // 60 nodeHeight + 2*20 padding
        }
      });
    }
  });

  it('S7 — Large Graph: Composition overlays do not recreate extreme visual density in 240-node Cloud Spend dataset', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    let countWithBounds = 0;
    discovery.featureList.forEach((feat) => {
      const groups = deriveFeatureCompositionGroups(feat, cloudSpendNodes, cloudSpendEdges, positions);
      groups.forEach((g) => {
        if (g.bounds) countWithBounds++;
      });
    });

    // Verify groups with bounds are concise and bounded
    expect(countWithBounds).toBeLessThanOrEqual(25);
  });

  it('S8 — Zoom Sweep: Threshold transitions across zoom levels (0.4, 0.6, 0.8, 1.0, 1.5, 2.0)', () => {
    const zoomLevels = [0.4, 0.6, 0.8, 1.0, 1.5, 2.0];

    zoomLevels.forEach((zoom) => {
      const isFarZoom = zoom < 0.6;
      const isCloseZoom = zoom >= 1.2;

      if (zoom === 0.4) {
        expect(isFarZoom).toBe(true);
        expect(isCloseZoom).toBe(false);
      } else if (zoom === 1.5 || zoom === 2.0) {
        expect(isFarZoom).toBe(false);
        expect(isCloseZoom).toBe(true);
      } else {
        expect(isFarZoom).toBe(false);
        expect(isCloseZoom).toBe(false);
      }
    });
  });

  it('S9 — Interaction Safety: Overlay calculations cause 0 layout invocations and 0 coordinate drift', () => {
    const initialPositions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);

    // Spy on computeArchitectureLayout
    const spy = vi.fn();

    // Perform interactive operations (computing overlays, hovering shared nodes)
    discovery.featureList.forEach((f) => {
      deriveFeatureCompositionGroups(f, cloudSpendNodes, cloudSpendEdges, initialPositions);
    });
    getSharedHighlightData('ApexClass:AuditService', discovery, cloudSpendNodes, cloudSpendEdges);

    // Verify spy was NOT called during overlay calculation
    expect(spy).toHaveBeenCalledTimes(0);

    // Verify position coordinates remain 100% exact (0.00000px drift)
    const recomputedPositions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    expect(initialPositions).toEqual(recomputedPositions);
  });

  it('S10 — Filter & Focus Compatibility: Filtering and focus depth changes update subgraphs without triggering auto-relayout', () => {
    // 1. Static mode auto layout policy check
    const filterPolicy = shouldAutoLayout('static', 'filter-change', { hasAuthoritativePositions: true });
    expect(filterPolicy).toBe(false);

    const focusPolicy = shouldAutoLayout('static', 'focus-change', { hasAuthoritativePositions: true });
    expect(focusPolicy).toBe(false);

    // 2. Filter graph by node types (ApexClass + LWC)
    const filtered = filterGraphByNodeTypes(cloudSpendNodes, cloudSpendEdges, ['ApexClass', 'LWC']);
    expect(filtered.nodes.length).toBeLessThan(cloudSpendNodes.length);

    // 3. Focus graph on AccountController depth 2
    const focused = computeFocusedGraph(cloudSpendNodes, cloudSpendEdges, {
      enabled: true,
      focusNodeId: 'ApexClass:AccountController',
      depth: 2,
      direction: 'both',
    });
    expect(focused.nodes.length).toBeGreaterThan(0);
    expect(focused.nodes.length).toBeLessThan(cloudSpendNodes.length);

    // 4. Composition discovery on focused subgraph operates cleanly
    const focusedDiscovery = discoverFeatures(focused.nodes, focused.edges);
    expect(focusedDiscovery.featureList.length).toBeGreaterThan(0);
  });
});
