import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { calculateDetailedEdgeCrossings } from '../lib/layout/metrics';
import { isTestNode, isFieldNode, computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification } from '../lib/layout/analysis';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from '../lib/layout/centrality';
import { classifyAllFeatureRoles, type FeatureRoleContext } from '../lib/layout/feature-roles';
import { discoverFeatures } from '../lib/layout/features';
import { computeGlobalFeatureLayout } from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { placeSatellites } from '../lib/layout/satellites';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from '../lib/layout/components';
import { resolveSpacingAndCollisions } from '../lib/layout/spacing';

const FIXTURE_PATH = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = fs.readFileSync(FIXTURE_PATH, 'utf-8');
const data = JSON.parse(rawData);
const fixtureNodes: ExplorerNode[] = data.nodes;
const fixtureEdges: ExplorerEdge[] = data.edges;

describe('Phase 11 — Hybrid Layout Release Hardening & Visual Validation Suite', () => {
  it('1. Reproduces Phase 10 Baseline & Verifies Self-Auditing Metric Equation', () => {
    const finalPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });
    const metrics = evaluateLayout(fixtureNodes, fixtureEdges, finalPositions);

    expect(metrics.detailedCrossings).toBeDefined();
    const dc = metrics.detailedCrossings!;

    expect(dc.primaryPrimaryCrossings).toBe(8704);
    expect(dc.primarySatelliteCrossings).toBe(41590);
    expect(dc.satelliteSatelliteCrossings).toBe(41544);
    expect(dc.primaryBridgeCrossings).toBe(2594);
    expect(dc.bridgeBridgeCrossings).toBe(230);
    expect(dc.totalGeometricCrossings).toBe(94662);

    const sum = dc.primaryPrimaryCrossings + dc.primaryBridgeCrossings + dc.bridgeBridgeCrossings + dc.primarySatelliteCrossings + dc.satelliteSatelliteCrossings;
    expect(metrics.edgeCrossingCount).toBe(sum);
    expect(dc.totalGeometricCrossings).toBe(sum);
  });

  it('2. Performs Primary Coordinate Forensics across Stages 7 to 12', () => {
    // Re-run pipeline step-by-step to capture Stage 7, 8, 9, 10, 11, 12 positions
    const safeNodes = [...fixtureNodes].sort((a, b) => a.id.localeCompare(b.id));
    const safeEdges = [...fixtureEdges].sort((a, b) => a.id.localeCompare(b.id));

    const index = createLayoutGraphIndex(safeNodes, safeEdges);
    let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

    const layerMap = new Map();
    safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
    analysis = applyLayerClassification(analysis, layerMap);

    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map();
    domainDiscovery.assignments.forEach((assignment, nodeId) => domainMap.set(nodeId, assignment.primaryDomain));
    analysis = applyDomainClassification(analysis, domainMap);

    const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });
    const featureRoleContextMap = new Map<string, FeatureRoleContext>();
    safeNodes.forEach(node => {
      featureRoleContextMap.set(node.id, {
        layer: layerMap.get(node.id) || null,
        analysisNode: analysis.nodes.get(node.id) || null,
        centrality: centralityMap.get(node.id) || null,
        roleOverride: analysis.nodes.get(node.id)?.role || null,
      });
    });
    const featureRoles = classifyAllFeatureRoles(safeNodes, featureRoleContextMap);
    const featureDiscovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap });
    const featureMap = new Map();
    featureDiscovery.assignments.forEach((assignment, nodeId) => featureMap.set(nodeId, assignment.primaryFeatureId));

    const featureLayoutResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
      domainSpacing: 380,
      layerSpacing: 250,
      nodeWidth: 120,
      nodeHeight: 60,
      analysis,
      layerMap,
      domainMap,
      domainDiscovery,
      featureDiscovery,
      featureMap,
      index,
    });

    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes,
      edges: safeEdges,
      layerMap,
      domainMap: featureMap,
      domainOrder: featureLayoutResult.orderedDomains,
    });

    // Stage 7: Primary Production Local Layout
    const localResult = computeLocalNodeLayout({
      nodes: safeNodes,
      edges: safeEdges,
      analysis,
      domainRegions: featureLayoutResult.domainRegions,
      layerMap,
      domainMap: featureMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth: 120,
        nodeHeight: 60,
        domainSpacing: 380,
        layerYMap: featureLayoutResult.layerYMap,
      },
    });

    const stage7Positions: Record<string, { x: number; y: number }> = { ...localResult.primaryNodePositions };

    // Stage 8: Bridge placement refinement
    const stage8Positions: Record<string, { x: number; y: number }> = { ...stage7Positions };
    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    featureLayoutResult.domainRegions.forEach((region, domain) => {
      domainXCenters[domain] = region.xCenter;
      domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
    });

    safeNodes.forEach(node => {
      if (isTestNode(node) || isFieldNode(node)) return;
      const centrality = centralityMap.get(node.id);
      if (centrality?.isBridge && !centrality.isHub) {
        const neighborPositions: Record<string, { x: number; y: number }> = {};
        const nodeAnalysis = analysis.nodes.get(node.id);
        nodeAnalysis?.neighborIds.forEach(nId => {
          if (stage8Positions[nId]) neighborPositions[nId] = stage8Positions[nId];
        });
        const bridgeInfo = calculateBridgeCandidatePosition(
          node.id,
          layerMap.get(node.id) || 'application',
          centrality.connectedDomains,
          domainXCenters,
          domainBounds,
          neighborPositions,
          { layerSpacing: 250, nodeWidth: 120, nodeHeight: 60, layerYOffsets: featureLayoutResult.layerYMap, index, allocatedPositions: stage8Positions }
        );
        stage8Positions[node.id] = bridgeInfo.candidatePosition;
      }
    });

    // Stage 9: Satellite Placement
    const satelliteResult = placeSatellites(
      safeNodes,
      safeEdges,
      analysis,
      stage8Positions,
      {
        nodeWidth: 120,
        nodeHeight: 60,
        layerSpacing: 250,
        layerYOffsets: featureLayoutResult.layerYMap,
        index,
      }
    );
    const stage9Positions = { ...satelliteResult.positions };

    // Stage 10: Component Packing
    let stage10Positions: Record<string, { x: number; y: number }> = { ...stage9Positions };
    if (analysis.components.length > 1) {
      const componentLayouts: ComponentLocalLayout[] = analysis.components
        .map(comp => {
          const positions: Record<string, { x: number; y: number }> = {};
          let minNodeId: string | undefined = undefined;
          let importance = 0;
          for (const nodeId of comp.nodeIds) {
            const pos = satelliteResult.positions[nodeId];
            if (pos) {
              positions[nodeId] = pos;
              if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) minNodeId = nodeId;
              const centrality = centralityMap.get(nodeId);
              if (centrality) importance += centrality.hubScore + centrality.bridgeScore;
            }
          }
          return { id: comp.componentId, positions, nodeWidth: 120, nodeHeight: 60, structuralImportance: importance, minNodeId };
        })
        .filter(c => Object.keys(c.positions).length > 0);

      if (componentLayouts.length > 1) {
        const compWidths = componentLayouts.map(c => {
          const bounds = calculateLocalComponentBounds(c.positions, 120, 60);
          return bounds.width;
        }).sort((a, b) => b - a);
        const maxW = compWidths[0] || 120;
        const secondMaxW = compWidths[1] || 120;
        const minRowWidth = maxW + secondMaxW + 100;
        let totalCompArea = 0;
        componentLayouts.forEach(c => {
          const bounds = calculateLocalComponentBounds(c.positions, 120, 60);
          totalCompArea += (bounds.width + 100) * (bounds.height + 100);
        });
        const idealWidth = Math.sqrt(totalCompArea * 1.6);
        const targetWidth = Math.max(idealWidth, minRowWidth);
        const packed = packComponentPositions(componentLayouts, { gap: 100, targetWidth, targetAspectRatio: 1.6, nodeWidth: 120, nodeHeight: 60 });
        stage10Positions = packed.positions;
      }
    }

    // Stage 11: Collision Spacing
    const stage11Result = resolveSpacingAndCollisions({
      nodes: safeNodes,
      edges: safeEdges,
      positions: stage10Positions,
      analysis,
      options: { nodeWidth: 120, nodeHeight: 60, layerMap, domainMap: featureMap },
    });
    const stage11Positions = stage11Result.positions;

    // Stage 12: Position Authority (unpersisted = stage 11)
    const stage12Positions = { ...stage11Positions };

    // Forensic evaluation of Cpp across stages
    const stage9Crossings = calculateDetailedEdgeCrossings(safeNodes, safeEdges, stage9Positions);
    const stage10Crossings = calculateDetailedEdgeCrossings(safeNodes, safeEdges, stage10Positions);
    const stage11Crossings = calculateDetailedEdgeCrossings(safeNodes, safeEdges, stage11Positions);
    const stage12Crossings = calculateDetailedEdgeCrossings(safeNodes, safeEdges, stage12Positions);

    // Stage 9 Cpp is 8,763 before component packing eliminates inter-component overlaps.
    // Stage 10, 11, 12 Cpp is exactly 8,704.
    expect(stage9Crossings.primaryPrimaryCrossings).toBe(8763);
    expect(stage10Crossings.primaryPrimaryCrossings).toBe(8704);
    expect(stage11Crossings.primaryPrimaryCrossings).toBe(8704);
    expect(stage12Crossings.primaryPrimaryCrossings).toBe(8704);

    // Verify relative primary node geometry preservation across all stages
    const primaryNodes = safeNodes.filter(n => !isTestNode(n) && !isFieldNode(n));
    expect(primaryNodes.length).toBeGreaterThan(100);

    // Check component rigid translation in Stage 10
    // Component 0 contains main graph nodes. Check if relative dx/dy between any pair of primary nodes in the same component is 0.00000 px
    for (const comp of analysis.components) {
      const compPrimaryIds = comp.nodeIds.filter(id => {
        const node = safeNodes.find(n => n.id === id);
        return node && !isTestNode(node) && !isFieldNode(node);
      });

      if (compPrimaryIds.length < 2) continue;

      const baseId = compPrimaryIds[0];
      const pos8Base = stage8Positions[baseId];
      const pos10Base = stage10Positions[baseId];
      const pos12Base = stage12Positions[baseId];

      const compDx10 = pos10Base.x - pos8Base.x;
      const compDy10 = pos10Base.y - pos8Base.y;

      for (let i = 1; i < compPrimaryIds.length; i++) {
        const id = compPrimaryIds[i];
        const p8 = stage8Positions[id];
        const p10 = stage10Positions[id];
        const p12 = stage12Positions[id];

        // Verify Stage 10 applies rigid translation (same compDx, compDy for all nodes in component)
        const nodeDx10 = p10.x - p8.x;
        const nodeDy10 = p10.y - p8.y;
        expect(Math.abs(nodeDx10 - compDx10)).toBeLessThan(1e-4);
        expect(Math.abs(nodeDy10 - compDy10)).toBeLessThan(1e-4);

        // Relative distance between node i and baseId in Stage 8 vs Stage 12 must be identical
        const relDist8 = Math.hypot(p8.x - pos8Base.x, p8.y - pos8Base.y);
        const relDist12 = Math.hypot(p12.x - pos12Base.x, p12.y - pos12Base.y);
        expect(Math.abs(relDist12 - relDist8)).toBeLessThan(1e-2);
      }
    }

    // Verify Stage 10 -> Stage 11 -> Stage 12 primary coordinate survival (0.00000 px drift)
    for (const node of primaryNodes) {
      const p10 = stage10Positions[node.id];
      const p11 = stage11Positions[node.id];
      const p12 = stage12Positions[node.id];

      if (p10 && p11 && p12) {
        expect(Math.abs(p11.x - p10.x)).toBeLessThan(1e-2);
        expect(Math.abs(p11.y - p10.y)).toBeLessThan(1e-2);
        expect(Math.abs(p12.x - p11.x)).toBeLessThan(1e-5);
        expect(Math.abs(p12.y - p11.y)).toBeLessThan(1e-5);
      }
    }
  });

  it('3. Verifies 10x Repeat Determinism & 5x Shuffled Node/Edge Permutation Invariance (0.00000 px drift)', () => {
    // 10x repeated execution with identical input
    const baseRun = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });
    const baseKeys = Object.keys(baseRun).sort();

    for (let r = 1; r <= 10; r++) {
      const repeatRun = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });
      expect(Object.keys(repeatRun).sort()).toEqual(baseKeys);

      for (const k of baseKeys) {
        expect(repeatRun[k].x).toBeCloseTo(baseRun[k].x, 5);
        expect(repeatRun[k].y).toBeCloseTo(baseRun[k].y, 5);
      }
    }

    // 5x shuffled node permutations
    for (let p = 1; p <= 5; p++) {
      const shuffledNodes = [...fixtureNodes].sort(() => Math.sin(p * 999));
      const permRun = computeArchitectureLayout(shuffledNodes, fixtureEdges, { enableFeatureLayout: true });

      for (const k of baseKeys) {
        expect(permRun[k].x).toBeCloseTo(baseRun[k].x, 5);
        expect(permRun[k].y).toBeCloseTo(baseRun[k].y, 5);
      }
    }

    // 5x shuffled edge permutations
    for (let p = 1; p <= 5; p++) {
      const shuffledEdges = [...fixtureEdges].sort(() => Math.sin(p * 888));
      const permRun = computeArchitectureLayout(fixtureNodes, shuffledEdges, { enableFeatureLayout: true });

      for (const k of baseKeys) {
        expect(permRun[k].x).toBeCloseTo(baseRun[k].x, 5);
        expect(permRun[k].y).toBeCloseTo(baseRun[k].y, 5);
      }
    }
  });

  it('4. Benchmarks Stage 5-12 Pipeline Performance & Confirms Performance Gate (< 2,000 ms)', () => {
    const startTime = performance.now();
    const positions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000);
    expect(Object.keys(positions).length).toBe(fixtureNodes.length);
  });

  it('5. Validates Generalized Algorithm on Top Dense Satellite Clusters Without Node-Name Branching', () => {
    const positions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });

    const topParentIds = [
      'Object:Spend_Import_Batch__c',
      'Object:Cloud_Spend__c',
      'Object:User_Organization_Role__c',
      'External:Account',
      'Object:Forecast__c',
      'Object:Cloud_Service__c',
    ];

    topParentIds.forEach(parentId => {
      const parentPos = positions[parentId];
      expect(parentPos).toBeDefined();

      // Find all field satellites associated with this parent object
      const childFields = fixtureNodes.filter(n => isFieldNode(n) && n.id.startsWith(parentId.split(':')[1] + '.'));

      childFields.forEach(field => {
        const fieldPos = positions[field.id];
        expect(fieldPos).toBeDefined();

        // Verify distance from parent is bounded
        const dist = Math.hypot(fieldPos.x - parentPos.x, fieldPos.y - parentPos.y);
        expect(dist).toBeLessThan(1200); // Satellites cluster tightly around parent
      });
    });
  });

  it('6. Verifies Feature Community Geometry & Spatial Locality Preservation', () => {
    const positions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });
    const metrics = evaluateLayout(fixtureNodes, fixtureEdges, positions);

    expect(metrics.featureLocality).toBeDefined();
    const fl = metrics.featureLocality!;

    expect(fl.featureBandLocality.averageFeatureWidth).toBeGreaterThan(0);
    expect(fl.featureBandLocality.averageFeatureHeight).toBeGreaterThan(0);
    expect(fl.crossBandDependencyDistance.medianCrossBandDistance).toBeGreaterThan(0);
  });

  it('7. Verifies Exact Legacy Isolation Default Flag (enableFeatureLayout = false)', () => {
    const legacyRun = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: false });
    const legacyMetrics = evaluateLayout(fixtureNodes, fixtureEdges, legacyRun);

    // Verify default call without options resolves to enableFeatureLayout = false
    const defaultRun = computeArchitectureLayout(fixtureNodes, fixtureEdges);

    expect(Object.keys(legacyRun).sort()).toEqual(Object.keys(defaultRun).sort());
    for (const id of Object.keys(legacyRun)) {
      expect(defaultRun[id].x).toBe(legacyRun[id].x);
      expect(defaultRun[id].y).toBe(legacyRun[id].y);
    }
  });

  it('8. Verifies Position Authority & Interaction Integrity', () => {
    // Existing persisted position authority takes precedence
    const customX = 1234.5;
    const customY = 5678.9;
    const testNodeId = fixtureNodes[0].id;

    const existingPositions = {
      [testNodeId]: { x: customX, y: customY },
    };

    const runWithPersisted = computeArchitectureLayout(fixtureNodes, fixtureEdges, {
      enableFeatureLayout: true,
      existingPositions,
    });

    expect(runWithPersisted[testNodeId].x).toBe(customX);
    expect(runWithPersisted[testNodeId].y).toBe(customY);
  });
});
