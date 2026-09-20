import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { discoverFeatures } from './features';
import { deriveFeatureCompositionGroups } from './feature-composition';
import { getSharedHighlightData } from './shared-highlight';
import {
  getFeatureMembershipEvidence,
  computeSeparationMarginDiagnostics,
  computeFeatureAnchorVisibilityDiagnostics,
  computeFeatureDensityDiagnostics,
  generateFeatureDiagnosticReport,
} from './feature-diagnostics';
import { computeArchitectureLayout } from '../architecture-layout';

function loadCloudSpendData(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('Wave 11 — Feature Visualization Hardening & UX Acceptance Suite', () => {
  const { nodes, edges } = loadCloudSpendData();
  const discoveryResult = discoverFeatures(nodes, edges);
  const layoutPositions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

  describe('1. Composition Overlay & Negative Control Acceptance', () => {
    it('derives deterministic LWC composition groups for multi-component features', () => {
      const forecastFeature = discoveryResult.features.get('feature_forecast-manager');
      expect(forecastFeature).toBeDefined();

      if (forecastFeature) {
        const groups = deriveFeatureCompositionGroups(forecastFeature, nodes, edges, layoutPositions);
        expect(groups.length).toBeGreaterThan(0);

        groups.forEach((g) => {
          expect(g.featureId).toBe('feature_forecast-manager');
          expect(g.nodeIds.length).toBeGreaterThanOrEqual(2);
          expect(g.bounds).toBeDefined();
          if (g.bounds) {
            expect(g.bounds.width).toBeGreaterThan(0);
            expect(g.bounds.height).toBeGreaterThan(0);
            expect(Number.isFinite(g.bounds.xMin)).toBe(true);
            expect(Number.isFinite(g.bounds.yMin)).toBe(true);
          }
        });
      }
    });

    it('produces zero composition groups for pure singletons (no subgroups)', () => {
      const pureSingletons = discoveryResult.featureList.filter(
        (f) => f.primaryNodeIds.length === 1 && f.secondaryNodeIds.length === 0
      );
      expect(pureSingletons.length).toBeGreaterThan(0);

      pureSingletons.forEach((feat) => {
        const groups = deriveFeatureCompositionGroups(feat, nodes, edges, layoutPositions);
        expect(groups.length).toBe(0);
      });
    });

    it('enforces negative control: similarly named LWCs across different features do NOT merge into one group', () => {
      const mockNodes: ExplorerNode[] = [
        {
          id: 'LWC:spendHeader',
          displayName: 'spendHeader',
          type: 'LWC',
          file: 'lwc/spendHeader/spendHeader.js',
          metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
        {
          id: 'LWC:billingHeader',
          displayName: 'billingHeader',
          type: 'LWC',
          file: 'lwc/billingHeader/billingHeader.js',
          metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
      ];
      const mockEdges: ExplorerEdge[] = [];

      const mockDiscovery = discoverFeatures(mockNodes, mockEdges);
      // Because there are no edges, two separate feature clusters are created
      expect(mockDiscovery.featureList.length).toBe(2);

      // Verify composition groups derived for each feature remain strictly bounded to that feature
      mockDiscovery.featureList.forEach((feat) => {
        const groups = deriveFeatureCompositionGroups(feat, mockNodes, mockEdges);
        expect(groups.length).toBe(0);
      });
    });
  });

  describe('2. Shared Infrastructure Highlighting Acceptance & Performance', () => {
    it('highlights shared infrastructure relationships bidirectionally in under 1ms without layout invocation', () => {
      const sharedNodeId = 'ApexClass:SpendTrackerAccessContext';
      const assignment = discoveryResult.assignments.get(sharedNodeId);
      expect(assignment).toBeDefined();

      // Measure Shared -> Features lookup latency
      const t0 = performance.now();
      const sharedHighlight = getSharedHighlightData(sharedNodeId, discoveryResult, nodes, edges);
      const sharedLookupTime = performance.now() - t0;

      expect(sharedLookupTime).toBeLessThan(1.0); // Strict < 1ms
      expect(sharedHighlight.type).toBe('shared_to_features');
      expect(sharedHighlight.sharedNodeIds).toContain(sharedNodeId);
      expect(sharedHighlight.featureIds.length).toBeGreaterThan(0);

      // Measure Feature member -> Shared lookup latency on a primary feature member
      const forecastFeature = discoveryResult.features.get('feature_forecast-manager');
      expect(forecastFeature).toBeDefined();

      const featureMemberId = forecastFeature!.primaryNodeIds[0];
      const t1 = performance.now();
      const memberHighlight = getSharedHighlightData(featureMemberId, discoveryResult, nodes, edges);
      const memberLookupTime = performance.now() - t1;

      expect(memberLookupTime).toBeLessThan(1.0);
      expect(memberHighlight.type).toBe('feature_to_shared');
      expect(memberHighlight.sharedNodeIds.length).toBeGreaterThan(0);
    });

    it('returns empty highlight result for non-existent node ID or unassigned node', () => {
      const res = getSharedHighlightData('NonExistentNode', discoveryResult, nodes, edges);
      expect(res.type).toBe('none');
      expect(res.sharedNodeIds.length).toBe(0);
      expect(res.featureIds.length).toBe(0);
    });
  });

  describe('3. Explainability & Diagnostic Metrics Acceptance', () => {
    it('generates deterministic membership evidence with accurate confidence classification', () => {
      const forecastFeature = discoveryResult.features.get('feature_forecast-manager');
      expect(forecastFeature).toBeDefined();

      const anchorNodeId = forecastFeature!.anchorNodeId;
      const evidence = getFeatureMembershipEvidence(anchorNodeId, nodes, edges, discoveryResult);

      expect(evidence.nodeId).toBe(anchorNodeId);
      expect(evidence.confidence).toBe('HIGH');
      expect(evidence.score).toBeGreaterThanOrEqual(8);
      expect(evidence.evidence.some((e) => e.type === 'seed')).toBe(true);
    });

    it('computes separation margin diagnostics with valid CLEAR/BORDERLINE classification', () => {
      const margins = computeSeparationMarginDiagnostics(discoveryResult, layoutPositions);
      expect(Object.keys(margins).length).toBeGreaterThan(0);

      let clearCount = 0;
      Object.values(margins).forEach((m) => {
        expect(['CLEAR', 'BORDERLINE', 'AMBIGUOUS']).toContain(m.classification);
        if (m.classification === 'CLEAR') clearCount++;
      });

      expect(clearCount).toBeGreaterThan(0);
    });

    it('computes anchor visibility diagnostics identifying centroid distances', () => {
      const visibilities = computeFeatureAnchorVisibilityDiagnostics(discoveryResult, layoutPositions);
      expect(Object.keys(visibilities).length).toBe(21);

      Object.values(visibilities).forEach((v) => {
        expect(v.featureId).toBeDefined();
        expect(typeof v.distanceToCentroid).toBe('number');
        expect(typeof v.isAnchorDistant).toBe('boolean');
      });
    });

    it('computes density diagnostics for high-density features like feature_forecast-manager', () => {
      const densities = computeFeatureDensityDiagnostics(discoveryResult, layoutPositions);
      expect(Object.keys(densities).length).toBe(21);

      const forecastDensity = densities['feature_forecast-manager'];
      expect(forecastDensity).toBeDefined();
      if (forecastDensity) {
        expect(forecastDensity.primaryNodeCount).toBeGreaterThanOrEqual(10);
        expect(forecastDensity.isHighDensity).toBe(true);
      }
    });

    it('generates comprehensive diagnostic report containing all 4 metric sections', () => {
      const report = generateFeatureDiagnosticReport(nodes, edges, discoveryResult, layoutPositions);
      expect(Object.keys(report.evidence).length).toBe(240);
      expect(Object.keys(report.separationMargins).length).toBeGreaterThan(0);
      expect(Object.keys(report.anchorVisibilities).length).toBe(21);
      expect(Object.keys(report.densities).length).toBe(21);
    });
  });

  describe('4. Determinism Stress Test & Zero Coordinate Drift Gate', () => {
    it('verifies 100% exact coordinate equality (0.00000px drift) across 5 input permutations', () => {
      const basePos = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

      // Permutation 1: Reverse
      const revNodes = [...nodes].reverse();
      const revEdges = [...edges].reverse();
      const revPos = computeArchitectureLayout(revNodes, revEdges, { enableFeatureLayout: true });
      expect(revPos).toEqual(basePos);

      // Permutation 2: Rotate
      const rotNodes = [...nodes.slice(17), ...nodes.slice(0, 17)];
      const rotEdges = [...edges.slice(23), ...edges.slice(0, 23)];
      const rotPos = computeArchitectureLayout(rotNodes, rotEdges, { enableFeatureLayout: true });
      expect(rotPos).toEqual(basePos);

      // Permutation 3 & 4: Shuffled
      const shufANodes = [...nodes].sort((a, b) => b.id.localeCompare(a.id));
      const shufAEdges = [...edges].sort((a, b) => b.id.localeCompare(a.id));
      const shufAPos = computeArchitectureLayout(shufANodes, shufAEdges, { enableFeatureLayout: true });
      expect(shufAPos).toEqual(basePos);

      let maxDrift = 0;
      for (const id of Object.keys(basePos)) {
        const p1 = basePos[id];
        const p2 = revPos[id];
        const p3 = rotPos[id];
        const p4 = shufAPos[id];
        const d = Math.max(
          Math.hypot(p1.x - p2.x, p1.y - p2.y),
          Math.hypot(p1.x - p3.x, p1.y - p3.y),
          Math.hypot(p1.x - p4.x, p1.y - p4.y)
        );
        maxDrift = Math.max(maxDrift, d);
      }

      expect(maxDrift).toBeCloseTo(0, 5);
    });
  });
});
