import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { discoverFeatures, calculateSemanticFeatureCohesion } from '../lib/layout/features';
import {
  calculateFeatureLocalityDiagnostics,
  domainCohesion,
  calculateDetailedEdgeCrossings,
} from '../lib/layout/metrics';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { determineGlobalFeatureOrder } from '../lib/layout/feature-ordering';
import { computeGlobalFeatureLayout } from '../lib/layout/global-layout';
import { discoverDomains } from '../lib/layout/domains';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import { classifyAllFeatureRoles, FeatureRoleContext } from '../lib/layout/feature-roles';
import { ArchitectureLayer } from '../lib/layout/types';

// Load Cloud Spend Tracker benchmark fixture
const cloudSpendFixturePath = path.resolve(
  __dirname,
  '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);
const cloudSpendRaw = fs.readFileSync(cloudSpendFixturePath, 'utf8');
const cloudSpendData = JSON.parse(cloudSpendRaw);
const cloudSpendNodes: ExplorerNode[] = cloudSpendData.nodes;
const cloudSpendEdges: ExplorerEdge[] = cloudSpendData.edges;

describe('Phase 3.6 Locality Metrics Audit & Hybrid Quality Test Suite', () => {
  it('computes diagnostic locality metrics for Legacy Layout (Path A)', () => {
    const posLegacy = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: false,
    });

    const metrics = evaluateLayout(cloudSpendNodes, cloudSpendEdges, posLegacy);
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const semanticCohesion = calculateSemanticFeatureCohesion(cloudSpendNodes, posLegacy, discovery);
    const locality = calculateFeatureLocalityDiagnostics(cloudSpendNodes, cloudSpendEdges, posLegacy, {
      featureDiscovery: discovery,
    });

    expect(metrics.edgeCrossingCount).toBeGreaterThan(0);
    expect(metrics.domainCohesion.domainCohesionScore).toBeGreaterThan(0.80);
    expect(semanticCohesion.featureCohesionScore).toBeGreaterThan(0.70);

    expect(locality.medianIntraFeatureEdgeLength).toBeGreaterThan(0);
    expect(locality.medianInterFeatureEdgeLength).toBeGreaterThan(0);
    expect(locality.highCouplingUtilityDistance).toBeGreaterThan(0);
    expect(locality.featureBandLocality.averageFeatureWidth).toBeGreaterThanOrEqual(0);
    expect(locality.crossBandDependencyDistance.medianCrossBandDistance).toBeGreaterThan(0);
  });

  it('computes diagnostic locality metrics for Phase 2 Hybrid Layout (Path B Strategy F)', () => {
    const posFeature = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const metrics = evaluateLayout(cloudSpendNodes, cloudSpendEdges, posFeature);
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const semanticCohesion = calculateSemanticFeatureCohesion(cloudSpendNodes, posFeature, discovery);
    const locality = calculateFeatureLocalityDiagnostics(cloudSpendNodes, cloudSpendEdges, posFeature, {
      featureDiscovery: discovery,
    });

    expect(metrics.edgeCrossingCount).toBeGreaterThan(0);
    expect(metrics.domainCohesion.domainCohesionScore).toBeGreaterThan(0.80);
    expect(semanticCohesion.featureCohesionScore).toBeGreaterThan(0.80);

    // Verify diagnostic locality attributes
    expect(locality.medianIntraFeatureEdgeLength).toBeGreaterThan(0);
    expect(locality.medianInterFeatureEdgeLength).toBeGreaterThan(0);
    expect(locality.intraToInterEdgeLengthRatio).toBeGreaterThan(0);
    expect(typeof locality.isIntraShorterThanInter).toBe('boolean');

    expect(locality.highCouplingUtilityDistance).toBeGreaterThan(0);
    expect(locality.featureBandLocality.medianFeatureWidth).toBeGreaterThan(0);
    expect(locality.crossBandDependencyDistance.medianCrossBandDistance).toBeGreaterThan(0);
  });

  it('compares diagnostic metrics across Legacy, Phase 1, Phase 2, and Candidates', () => {
    const posLegacy = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: false,
    });

    const posPhase2 = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const metricsLegacy = evaluateLayout(cloudSpendNodes, cloudSpendEdges, posLegacy);
    const metricsPhase2 = evaluateLayout(cloudSpendNodes, cloudSpendEdges, posPhase2);

    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const semCohesionLegacy = calculateSemanticFeatureCohesion(cloudSpendNodes, posLegacy, discovery);
    const semCohesionPhase2 = calculateSemanticFeatureCohesion(cloudSpendNodes, posPhase2, discovery);

    const locLegacy = metricsLegacy.featureLocality!;
    const locPhase2 = metricsPhase2.featureLocality!;

    console.log('\n========================================================================');
    console.log('HYBRID LAYOUT DIAGNOSTIC LOCALITY AUDIT MATRIX');
    console.log('========================================================================');
    console.log('Metric Name                          | Path A (Legacy) | Path B (Phase 2)');
    console.log('-------------------------------------+-----------------+-----------------');
    console.log(`1. Legacy Domain Cohesion            | ${metricsLegacy.domainCohesion.domainCohesionScore.toFixed(4).padStart(15)} | ${metricsPhase2.domainCohesion.domainCohesionScore.toFixed(4).padStart(15)}`);
    console.log(`2. Semantic Feature Cohesion         | ${semCohesionLegacy.featureCohesionScore.toFixed(4).padStart(15)} | ${semCohesionPhase2.featureCohesionScore.toFixed(4).padStart(15)}`);
    console.log(`3. Median Intra-Feature Edge Length  | ${(locLegacy.medianIntraFeatureEdgeLength.toFixed(2) + ' px').padStart(15)} | ${(locPhase2.medianIntraFeatureEdgeLength.toFixed(2) + ' px').padStart(15)}`);
    console.log(`4. Median Inter-Feature Edge Length  | ${(locLegacy.medianInterFeatureEdgeLength.toFixed(2) + ' px').padStart(15)} | ${(locPhase2.medianInterFeatureEdgeLength.toFixed(2) + ' px').padStart(15)}`);
    console.log(`5. Intra / Inter Edge Length Ratio   | ${locLegacy.intraToInterEdgeLengthRatio.toFixed(4).padStart(15)} | ${locPhase2.intraToInterEdgeLengthRatio.toFixed(4).padStart(15)}`);
    console.log(`6. High-Coupling Utility Distance    | ${(locLegacy.highCouplingUtilityDistance.toFixed(2) + ' px').padStart(15)} | ${(locPhase2.highCouplingUtilityDistance.toFixed(2) + ' px').padStart(15)}`);
    console.log(`7. Feature Band Average Width        | ${(locLegacy.featureBandLocality.averageFeatureWidth.toFixed(2) + ' px').padStart(15)} | ${(locPhase2.featureBandLocality.averageFeatureWidth.toFixed(2) + ' px').padStart(15)}`);
    console.log(`8. Cross-Band Median Distance        | ${(locLegacy.crossBandDependencyDistance.medianCrossBandDistance.toFixed(2) + ' px').padStart(15)} | ${(locPhase2.crossBandDependencyDistance.medianCrossBandDistance.toFixed(2) + ' px').padStart(15)}`);
    console.log(`9. Average Edge Length               | ${(metricsLegacy.averageEdgeLength.toFixed(2) + ' px').padStart(15)} | ${(metricsPhase2.averageEdgeLength.toFixed(2) + ' px').padStart(15)}`);
    console.log(`10. Primary Edge Crossings           | ${String(metricsLegacy.detailedCrossings?.primaryPrimaryCrossings ?? 0).padStart(15)} | ${String(metricsPhase2.detailedCrossings?.primaryPrimaryCrossings ?? 0).padStart(15)}`);
    console.log(`11. Total Geometric Crossings        | ${String(metricsLegacy.edgeCrossingCount).padStart(15)} | ${String(metricsPhase2.edgeCrossingCount).padStart(15)}`);
    console.log(`12. Intra < Inter Invariant Holds    | ${String(locLegacy.isIntraShorterThanInter).padStart(15)} | ${String(locPhase2.isIntraShorterThanInter).padStart(15)}`);
    console.log('========================================================================\n');

    expect(locLegacy).toBeDefined();
    expect(locPhase2).toBeDefined();
  });
});
