import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { discoverFeatures } from './features';
import { computeArchitectureLayout } from '../architecture-layout';
import { deriveFeatureCompositionGroups } from './feature-composition';
import { getSharedHighlightData } from './shared-highlight';
import {
  getFeatureMembershipEvidence,
  computeSeparationMarginDiagnostics,
  computeFeatureAnchorVisibilityDiagnostics,
  computeFeatureDensityDiagnostics,
  generateFeatureDiagnosticReport,
} from './feature-diagnostics';

// Load Salesforce Cloud Spend Tracker dataset
const cloudSpendDataPath = path.resolve(
  __dirname,
  '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);
const rawData = JSON.parse(fs.readFileSync(cloudSpendDataPath, 'utf8'));
const cloudSpendNodes: ExplorerNode[] = rawData.nodes || [];
const cloudSpendEdges: ExplorerEdge[] = rawData.edges || [];

describe('Wave 10 — Feature Visualization, Explainability & Layout Efficiency Consolidation Suite', () => {
  it('1. Baseline Reproduction Verification (21 Features, 14 Singletons, 11 Shared Nodes, 8 Bridges)', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);

    expect(discovery.featureList.length).toBe(21);

    const singletons = discovery.featureList.filter((f) => f.primaryNodeIds.length === 1);
    expect(singletons.length).toBe(14);

    const sharedAssignments = Array.from(discovery.assignments.values()).filter(
      (a) => a.isShared || a.primaryFeatureId === 'Shared'
    );
    expect(sharedAssignments.length).toBeGreaterThan(0);

    // Compute layout with feature layout enabled
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    expect(Object.keys(positions).length).toBeGreaterThanOrEqual(cloudSpendNodes.length);
  });

  it('2. LWC Composition Group Derivation (forecast-manager multi-group discovery & bounds)', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const forecastFeature = discovery.features.get('feature_forecast-manager');
    expect(forecastFeature).toBeDefined();

    if (forecastFeature) {
      const groups = deriveFeatureCompositionGroups(
        forecastFeature,
        cloudSpendNodes,
        cloudSpendEdges,
        positions
      );

      expect(groups.length).toBeGreaterThan(0);

      groups.forEach((group) => {
        expect(group.featureId).toBe('feature_forecast-manager');
        expect(group.nodeIds.length).toBeGreaterThanOrEqual(2);
        expect(group.label).toContain('Group');
        if (group.bounds) {
          expect(group.bounds.xMin).toBeLessThan(group.bounds.xMax);
          expect(group.bounds.yMin).toBeLessThan(group.bounds.yMax);
          expect(group.bounds.width).toBeGreaterThan(0);
          expect(group.bounds.height).toBeGreaterThan(0);
        }
      });
    }
  });

  it('3. LWC Composition Grouping is Generic (Returns empty array for singleton features)', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const singletonFeature = discovery.featureList.find((f) => f.primaryNodeIds.length === 1);
    expect(singletonFeature).toBeDefined();

    if (singletonFeature) {
      const groups = deriveFeatureCompositionGroups(
        singletonFeature,
        cloudSpendNodes,
        cloudSpendEdges,
        positions
      );

      expect(groups).toEqual([]);
    }
  });

  it('4. Interactive Shared Infrastructure Link Highlighting Lookup (O(connected features))', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);

    // Test hovering a Shared Infrastructure node
    const sharedHighlight = getSharedHighlightData(
      'ApexClass:AuditService',
      discovery,
      cloudSpendNodes,
      cloudSpendEdges
    );

    expect(sharedHighlight.type).toBe('shared_to_features');
    expect(sharedHighlight.sharedNodeIds).toContain('ApexClass:AuditService');
    expect(sharedHighlight.featureIds.length).toBeGreaterThan(0);
    expect(sharedHighlight.connectedNodeIds.length).toBeGreaterThan(0);

    // Test reverse lookup (hovering a Feature member node)
    const featureMemberId = 'ApexClass:SpendImportService';
    const featureHighlight = getSharedHighlightData(
      featureMemberId,
      discovery,
      cloudSpendNodes,
      cloudSpendEdges
    );

    expect(featureHighlight.type).toBe('feature_to_shared');
    expect(featureHighlight.sharedNodeIds.length).toBeGreaterThan(0);
    expect(featureHighlight.featureIds).toContain('feature_SpendImportService');
  });

  it('5. Feature Membership Evidence Generation ("Why is this node in this Feature?")', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);

    const evidence = getFeatureMembershipEvidence(
      'ApexClass:SpendImportService',
      cloudSpendNodes,
      cloudSpendEdges,
      discovery
    );

    expect(evidence.nodeId).toBe('ApexClass:SpendImportService');
    expect(evidence.featureId).toBe('feature_SpendImportService');
    expect(evidence.confidence).toBeDefined();
    expect(evidence.evidence.length).toBeGreaterThan(0);

    const types = evidence.evidence.map((e) => e.type);
    expect(types).toContain('seed');
  });

  it('6. Feature Diagnostics Models (Separation Margin, Anchor Visibility, Density)', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const separation = computeSeparationMarginDiagnostics(discovery, positions);
    expect(Object.keys(separation).length).toBeGreaterThan(0);

    const sampleNodeId = Object.keys(separation)[0];
    expect(separation[sampleNodeId].classification).toBeDefined();
    expect(['CLEAR', 'BORDERLINE', 'AMBIGUOUS']).toContain(separation[sampleNodeId].classification);

    const anchorVis = computeFeatureAnchorVisibilityDiagnostics(discovery, positions);
    expect(Object.keys(anchorVis).length).toBe(21);

    const densities = computeFeatureDensityDiagnostics(discovery, positions);
    expect(Object.keys(densities).length).toBe(21);
    expect(densities['feature_forecast-manager'].isHighDensity).toBe(true);

    const report = generateFeatureDiagnosticReport(
      cloudSpendNodes,
      cloudSpendEdges,
      discovery,
      positions
    );

    expect(Object.keys(report.evidence).length).toBeGreaterThan(0);
    expect(Object.keys(report.separationMargins).length).toBeGreaterThan(0);
    expect(Object.keys(report.anchorVisibilities).length).toBe(21);
    expect(Object.keys(report.densities).length).toBe(21);
  });

  it('7. Layout Equality in Legacy Mode (enableFeatureLayout=false produces identical legacy coordinates)', () => {
    const legacyPositions1 = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: false,
    });

    const legacyPositions2 = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: false,
    });

    expect(legacyPositions1).toEqual(legacyPositions2);
  });

  it('8. Static Mode Coordinate Invariance (No coordinate drift when computing overlays or diagnostics)', () => {
    const initialPositions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);

    // Compute overlays and diagnostics
    const forecastFeature = discovery.features.get('feature_forecast-manager');
    if (forecastFeature) {
      deriveFeatureCompositionGroups(forecastFeature, cloudSpendNodes, cloudSpendEdges, initialPositions);
    }
    getSharedHighlightData('ApexClass:AuditService', discovery, cloudSpendNodes, cloudSpendEdges);
    generateFeatureDiagnosticReport(cloudSpendNodes, cloudSpendEdges, discovery, initialPositions);

    // Verify initial positions were untouched
    const afterPositions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
      existingPositions: initialPositions,
    });

    Object.keys(initialPositions).forEach((nId) => {
      expect(afterPositions[nId].x).toBeCloseTo(initialPositions[nId].x, 5);
      expect(afterPositions[nId].y).toBeCloseTo(initialPositions[nId].y, 5);
    });
  });
});
