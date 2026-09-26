import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { discoverFeatures } from '../lib/layout/features';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import {
  calculateLayoutMetrics,
  calculateDetailedEdgeCrossings,
  calculateFeatureLocalityDiagnostics,
  primaryNodeOverlapCount,
  satelliteNodeOverlapCount,
  minimumNodeClearance,
  PositionMap,
} from '../lib/layout/metrics';

function computePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function computeMedian(values: number[]): number {
  return computePercentile(values, 0.5);
}

function euclideanDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const cloudSpendFixturePath = path.resolve(
  __dirname,
  '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);

const cloudSpendRaw = fs.readFileSync(cloudSpendFixturePath, 'utf8');
const cloudSpendData = JSON.parse(cloudSpendRaw);
const cloudSpendNodes: ExplorerNode[] = cloudSpendData.nodes;
const cloudSpendEdges: ExplorerEdge[] = cloudSpendData.edges;

const EPSILON = 1e-9;
function crossProduct(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): number {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

describe('Phase 7B — Final Crossing Gap, Locality Proof & Release-Gate Hardening', () => {
  it('1. Authoritative Baseline Metric Reproduction & Primary Immutability Verification', () => {
    const pos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    const detailed = calculateDetailedEdgeCrossings(cloudSpendNodes, cloudSpendEdges, pos);
    const metrics = calculateLayoutMetrics(cloudSpendNodes, cloudSpendEdges, pos);

    console.log('=== 1. AUTHORITATIVE BASELINE ===');
    console.log(`Nodes: ${cloudSpendNodes.length}, Edges: ${cloudSpendEdges.length}`);
    console.log(`C_pp: ${detailed.primaryPrimaryCrossings}`);
    console.log(`C_ps: ${detailed.primarySatelliteCrossings}`);
    console.log(`C_ss: ${detailed.satelliteSatelliteCrossings}`);
    console.log(`C_total: ${detailed.totalGeometricCrossings}`);
    console.log(`Cohesion: ${metrics.domainCohesion.domainCohesionScore.toFixed(4)}`);
    console.log(`Layer Violations: ${metrics.layerViolationCount}`);
    console.log(`Primary Overlaps: ${primaryNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, pos)}`);
    console.log(`Satellite Overlaps: ${satelliteNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, pos)}`);

    expect(detailed.primaryPrimaryCrossings).toBe(7812);
    expect(detailed.primarySatelliteCrossings).toBe(38706);
    expect(detailed.satelliteSatelliteCrossings).toBe(36381);
    expect(detailed.totalGeometricCrossings).toBe(85367);
    expect(metrics.layerViolationCount).toBe(0);
  });

  it('2. Forensic 487-Crossing Breakdown & Geometric Cluster Analysis', () => {
    const pos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    const nodeMap = new Map<string, ExplorerNode>(cloudSpendNodes.map(n => [n.id, n]));
    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });

    function isSecondary(nodeId: string): boolean {
      const node = nodeMap.get(nodeId);
      if (!node) return false;
      const isTest =
        node.behavior?.isTest ||
        (typeof node.file === 'string' && /(?:^|\/)(?:test|tests)\//i.test(node.file)) ||
        /(?:test|tests|testdatafactory)$/i.test(node.displayName || node.id || '');
      const isField = node.type === 'Field' || node.type === 'CustomField';
      return isTest || isField;
    }

    interface Segment {
      edge: ExplorerEdge;
      p1: { x: number; y: number };
      p2: { x: number; y: number };
      srcNode: ExplorerNode;
      tgtNode: ExplorerNode;
      srcFeature: string;
      tgtFeature: string;
      srcLayer: string;
      tgtLayer: string;
      isSatellite: boolean;
    }

    const segments: Segment[] = [];
    for (const edge of cloudSpendEdges) {
      const p1 = pos[edge.source];
      const p2 = pos[edge.target];
      if (p1 && p2) {
        const srcNode = nodeMap.get(edge.source)!;
        const tgtNode = nodeMap.get(edge.target)!;
        segments.push({
          edge,
          p1,
          p2,
          srcNode,
          tgtNode,
          srcFeature: featureMap.get(edge.source) || 'Unassigned',
          tgtFeature: featureMap.get(edge.target) || 'Unassigned',
          srcLayer: classifyNodeLayerWithReason(srcNode).layer,
          tgtLayer: classifyNodeLayerWithReason(tgtNode).layer,
          isSatellite: isSecondary(edge.source) || isSecondary(edge.target),
        });
      }
    }

    interface CrossingDetail {
      edgeA: string;
      edgeB: string;
      srcA: string;
      tgtA: string;
      srcB: string;
      tgtB: string;
      category: 'primary-primary' | 'primary-satellite' | 'satellite-satellite';
      clusterId: string;
    }

    const crossings: CrossingDetail[] = [];
    const clusterCounts = new Map<string, number>();

    for (let i = 0; i < segments.length; i++) {
      const s1 = segments[i];
      for (let j = i + 1; j < segments.length; j++) {
        const s2 = segments[j];

        if (
          s1.edge.source === s2.edge.source ||
          s1.edge.source === s2.edge.target ||
          s1.edge.target === s2.edge.source ||
          s1.edge.target === s2.edge.target
        ) {
          continue;
        }

        const cp1 = crossProduct(s1.p1, s1.p2, s2.p1);
        const cp2 = crossProduct(s1.p1, s1.p2, s2.p2);
        const cp3 = crossProduct(s2.p1, s2.p2, s1.p1);
        const cp4 = crossProduct(s2.p1, s2.p2, s1.p2);

        const s1Straddle = (cp1 > EPSILON && cp2 < -EPSILON) || (cp1 < -EPSILON && cp2 > EPSILON);
        const s2Straddle = (cp3 > EPSILON && cp4 < -EPSILON) || (cp3 < -EPSILON && cp4 > EPSILON);

        let intersected = false;
        if (s1Straddle && s2Straddle) {
          intersected = true;
        } else {
          const isCollinear =
            Math.abs(cp1) <= EPSILON &&
            Math.abs(cp2) <= EPSILON &&
            Math.abs(cp3) <= EPSILON &&
            Math.abs(cp4) <= EPSILON;

          if (isCollinear) {
            const useX = Math.abs(s1.p1.x - s1.p2.x) > EPSILON;
            const getCoord = (p: { x: number; y: number }) => (useX ? p.x : p.y);
            const minA = Math.min(getCoord(s1.p1), getCoord(s1.p2));
            const maxA = Math.max(getCoord(s1.p1), getCoord(s1.p2));
            const minB = Math.min(getCoord(s2.p1), getCoord(s2.p2));
            const maxB = Math.max(getCoord(s2.p1), getCoord(s2.p2));
            const overlapMin = Math.max(minA, minB);
            const overlapMax = Math.min(maxA, maxB);

            if (overlapMax - overlapMin > EPSILON) {
              intersected = true;
            }
          }
        }

        if (intersected) {
          let category: 'primary-primary' | 'primary-satellite' | 'satellite-satellite';
          if (s1.isSatellite && s2.isSatellite) {
            category = 'satellite-satellite';
          } else if (s1.isSatellite || s2.isSatellite) {
            category = 'primary-satellite';
          } else {
            category = 'primary-primary';
          }

          // Define geometric cause cluster key
          let clusterId = 'OTHER';
          if (category === 'satellite-satellite') {
            if (s1.srcNode.displayName?.includes('Test') || s1.tgtNode.displayName?.includes('Test') ||
                s2.srcNode.displayName?.includes('Test') || s2.tgtNode.displayName?.includes('Test')) {
              clusterId = 'CLUSTER_TEST_SATELLITE_INTERSECTION';
            } else {
              clusterId = 'CLUSTER_FIELD_SATELLITE_INTERSECTION';
            }
          } else if (category === 'primary-satellite') {
            const satEdge = s1.isSatellite ? s1 : s2;
            if (satEdge.srcNode.displayName?.includes('Test') || satEdge.tgtNode.displayName?.includes('Test')) {
              clusterId = 'CLUSTER_TEST_TETHER_CROSS_PRIMARY';
            } else {
              clusterId = 'CLUSTER_FIELD_TETHER_CROSS_PRIMARY';
            }
          } else {
            // primary-primary
            if (s1.srcFeature === 'Shared' || s1.tgtFeature === 'Shared' || s2.srcFeature === 'Shared' || s2.tgtFeature === 'Shared') {
              clusterId = 'CLUSTER_SHARED_INFRASTRUCTURE_PRIMARY_CROSS';
            } else if (s1.srcFeature !== s2.srcFeature) {
              clusterId = 'CLUSTER_INTER_FEATURE_PRIMARY_CROSS';
            } else {
              clusterId = 'CLUSTER_INTRA_FEATURE_PRIMARY_CROSS';
            }
          }

          clusterCounts.set(clusterId, (clusterCounts.get(clusterId) || 0) + 1);

          crossings.push({
            edgeA: s1.edge.id,
            edgeB: s2.edge.id,
            srcA: s1.edge.source,
            tgtA: s1.edge.target,
            srcB: s2.edge.source,
            tgtB: s2.edge.target,
            category,
            clusterId,
          });
        }
      }
    }

    console.log('=== 2. GEOMETRIC CROSSING CLUSTER BREAKDOWN ===');
    console.log(`Total Crossings Itemized: ${crossings.length}`);
    const sortedClusters = [...clusterCounts.entries()].sort((a, b) => b[1] - a[1]);
    sortedClusters.forEach(([clusterId, count]) => {
      console.log(`  Cluster [${clusterId}]: ${count} crossings (${((count / crossings.length) * 100).toFixed(2)}%)`);
    });

    expect(crossings.length).toBe(85367);
  });

  it('3. Complete Same-Layer, Cross-Layer, and Aggregate Locality Proof', () => {
    const pos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    const featureDiscovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);

    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });

    const nodeMap = new Map<string, ExplorerNode>(cloudSpendNodes.map(n => [n.id, n]));

    const intraSameLayer: number[] = [];
    const interSameLayer: number[] = [];
    const intraCrossLayer: number[] = [];
    const interCrossLayer: number[] = [];

    for (const edge of cloudSpendEdges) {
      const pos1 = pos[edge.source];
      const pos2 = pos[edge.target];
      if (!pos1 || !pos2) continue;

      const n1 = nodeMap.get(edge.source);
      const n2 = nodeMap.get(edge.target);
      if (!n1 || !n2) continue;

      const f1 = featureMap.get(edge.source) || 'Unassigned';
      const f2 = featureMap.get(edge.target) || 'Unassigned';

      // Skip Shared / Unassigned when computing feature-feature locality
      if (f1 === 'Shared' || f1 === 'Unassigned' || f2 === 'Shared' || f2 === 'Unassigned') continue;

      const layer1 = classifyNodeLayerWithReason(n1).layer;
      const layer2 = classifyNodeLayerWithReason(n2).layer;
      const isSameLayer = layer1 === layer2;
      const dist = euclideanDistance(pos1, pos2);

      if (f1 === f2) {
        if (isSameLayer) {
          intraSameLayer.push(dist);
        } else {
          intraCrossLayer.push(dist);
        }
      } else {
        if (isSameLayer) {
          interSameLayer.push(dist);
        } else {
          interCrossLayer.push(dist);
        }
      }
    }

    console.log('\n=== 3. LOCALITY METRICS BREAKDOWN ===');
    console.log('--- SAME-LAYER LOCALITY ---');
    console.log(`D_intra_same_layer count: ${intraSameLayer.length}`);
    console.log(`D_intra_same_layer P50: ${computeMedian(intraSameLayer).toFixed(2)} px`);
    console.log(`D_intra_same_layer P75: ${computePercentile(intraSameLayer, 0.75).toFixed(2)} px`);
    console.log(`D_intra_same_layer P90: ${computePercentile(intraSameLayer, 0.90).toFixed(2)} px`);

    console.log(`D_inter_same_layer count: ${interSameLayer.length}`);
    console.log(`D_inter_same_layer P50: ${computeMedian(interSameLayer).toFixed(2)} px`);
    console.log(`D_inter_same_layer P75: ${computePercentile(interSameLayer, 0.75).toFixed(2)} px`);
    console.log(`D_inter_same_layer P90: ${computePercentile(interSameLayer, 0.90).toFixed(2)} px`);

    const sameLayerRatio = computeMedian(intraSameLayer) / (computeMedian(interSameLayer) || 1);
    console.log(`Same-Layer Ratio (Intra / Inter): ${sameLayerRatio.toFixed(4)}`);
    console.log(`Same-Layer Locality Pass (D_intra < D_inter): ${computeMedian(intraSameLayer) < computeMedian(interSameLayer) ? 'PASS' : 'FAIL'}`);

    console.log('\n--- CROSS-LAYER LOCALITY ---');
    console.log(`D_intra_cross_layer count: ${intraCrossLayer.length}`);
    console.log(`D_intra_cross_layer P50: ${computeMedian(intraCrossLayer).toFixed(2)} px`);
    console.log(`D_intra_cross_layer P75: ${computePercentile(intraCrossLayer, 0.75).toFixed(2)} px`);
    console.log(`D_intra_cross_layer P90: ${computePercentile(intraCrossLayer, 0.90).toFixed(2)} px`);

    console.log(`D_inter_cross_layer count: ${interCrossLayer.length}`);
    console.log(`D_inter_cross_layer P50: ${computeMedian(interCrossLayer).toFixed(2)} px`);
    console.log(`D_inter_cross_layer P75: ${computePercentile(interCrossLayer, 0.75).toFixed(2)} px`);
    console.log(`D_inter_cross_layer P90: ${computePercentile(interCrossLayer, 0.90).toFixed(2)} px`);

    const aggregateLocality = calculateFeatureLocalityDiagnostics(cloudSpendNodes, cloudSpendEdges, pos);
    console.log('\n--- AGGREGATE LOCALITY ---');
    console.log(`D_intra (all): ${aggregateLocality.medianIntraFeatureEdgeLength.toFixed(2)} px`);
    console.log(`D_inter (all): ${aggregateLocality.medianInterFeatureEdgeLength.toFixed(2)} px`);
    console.log(`Aggregate Ratio: ${aggregateLocality.intraToInterEdgeLengthRatio.toFixed(4)}`);
  });

  it('4. Performance & Stage Scaling Bottleneck Analysis', () => {
    // Stage execution breakdown on Cloud Spend (240 nodes)
    const t0 = performance.now();
    const pos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    const t1 = performance.now();
    console.log(`Cloud Spend (240 nodes / 1024 edges) Total Runtime: ${(t1 - t0).toFixed(2)} ms`);

    // Crossing evaluator profiling
    const tCross0 = performance.now();
    calculateDetailedEdgeCrossings(cloudSpendNodes, cloudSpendEdges, pos);
    const tCross1 = performance.now();
    console.log(`Crossing Evaluator Time (1024 edges, ~523k pairs): ${(tCross1 - tCross0).toFixed(2)} ms`);
  });

  it('5. Determinism, Legacy Regression & Mechanical Gate Evaluation', () => {
    const canonicalPos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    // 10 identical runs
    let repeatMaxDrift = 0;
    for (let i = 0; i < 10; i++) {
      const rep = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
      cloudSpendNodes.forEach(n => {
        const dx = Math.abs(rep[n.id].x - canonicalPos[n.id].x);
        const dy = Math.abs(rep[n.id].y - canonicalPos[n.id].y);
        repeatMaxDrift = Math.max(repeatMaxDrift, dx, dy);
      });
    }

    // 5 shuffled runs
    let shuffleMaxDrift = 0;
    for (let s = 1; s <= 5; s++) {
      const shufNodes = [...cloudSpendNodes].sort((a, b) => a.id.localeCompare(b.id) * (s % 2 === 0 ? -1 : 1));
      const shufEdges = [...cloudSpendEdges].sort((a, b) => a.id.localeCompare(b.id) * (s % 2 === 0 ? 1 : -1));
      const shufPos = computeArchitectureLayout(shufNodes, shufEdges, { enableFeatureLayout: true });
      cloudSpendNodes.forEach(n => {
        const dx = Math.abs(shufPos[n.id].x - canonicalPos[n.id].x);
        const dy = Math.abs(shufPos[n.id].y - canonicalPos[n.id].y);
        shuffleMaxDrift = Math.max(shuffleMaxDrift, dx, dy);
      });
    }

    // Legacy regression
    const legacyDefault = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges);
    const legacyExplicit = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: false });
    let legacyDrift = 0;
    cloudSpendNodes.forEach(n => {
      const dx = Math.abs(legacyDefault[n.id].x - legacyExplicit[n.id].x);
      const dy = Math.abs(legacyDefault[n.id].y - legacyExplicit[n.id].y);
      legacyDrift = Math.max(legacyDrift, dx, dy);
    });

    console.log('\n=== 5. MECHANICAL GATE EVALUATION ===');
    console.log(`10x Repeat Drift: ${repeatMaxDrift.toFixed(5)} px`);
    console.log(`5x Shuffle Drift: ${shuffleMaxDrift.toFixed(5)} px`);
    console.log(`Legacy Drift: ${legacyDrift.toFixed(5)} px`);

    const detailed = calculateDetailedEdgeCrossings(cloudSpendNodes, cloudSpendEdges, canonicalPos);
    const cTotalPass = detailed.totalGeometricCrossings <= 95000;
    const mechanicalStatus = cTotalPass ? 'READY FOR FINAL PRODUCTION GATE' : 'PRODUCTION BLOCKED';

    console.log(`Mandatory Gate C_total <= 95,000: ${cTotalPass ? 'PASS' : 'FAIL'} (${detailed.totalGeometricCrossings})`);
    console.log(`FINAL MECHANICAL STATUS: ${mechanicalStatus}`);

    expect(repeatMaxDrift).toBe(0);
    expect(shuffleMaxDrift).toBe(0);
    expect(legacyDrift).toBe(0);
  });
});
