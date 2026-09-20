import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import {
  computeArchitectureAnalysis,
  applyLayerClassification,
  applyDomainClassification,
  findParentObjectId,
  findParentProductionNodeId,
  isTestNode,
  isFieldNode,
} from './analysis';
import { classifyNodeLayerWithReason } from './layers';
import { discoverDomains } from './domains';
import { computeGlobalDomainLayout } from './global-layout';
import { reduceEdgeCrossings } from './ordering';
import { computeLocalNodeLayout } from './local-layout';
import {
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
} from './centrality';
import { placeSatellites } from './satellites';
import { packComponentPositions, calculateLocalComponentBounds } from './components';
import { resolveSpacingAndCollisions } from './spacing';
import { computeArchitectureLayout } from '../architecture-layout';
import { calculateDetailedEdgeCrossings, nodeOverlapCount, averageEdgeLength, maxEdgeLength } from './metrics';

const FIXTURE_PATH = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');

function loadCloudSpendFixture(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { nodes: data.nodes || [], edges: data.edges || [] };
}

function isPrimary(n: ExplorerNode) {
  return !isTestNode(n) && !isFieldNode(n);
}

describe('Wave 10E Forensic Investigation', () => {
  it('Phase 3: Stage-by-Stage Crossings & Geometry', () => {
    const { nodes, edges } = loadCloudSpendFixture();

    const safeNodes = [...nodes];
    const safeEdges = [...edges];
    safeNodes.sort((a, b) => a.id.localeCompare(b.id));
    safeEdges.sort((a, b) => a.id.localeCompare(b.id));

    let analysis = computeArchitectureAnalysis(safeNodes, safeEdges);
    const layerMap = new Map<string, any>();
    safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
    analysis = applyLayerClassification(analysis, layerMap);

    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) => domainMap.set(nodeId, assignment.primaryDomain));
    analysis = applyDomainClassification(analysis, domainMap);

    const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap);

    const nodeWidth = 120;
    const nodeHeight = 60;
    const layerSpacing = 250;
    const domainSpacing = 380;
    const componentGap = 100;

    function measureStage(stageName: string, positions: Record<string, { x: number; y: number }>) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      safeNodes.forEach(n => {
        const p = positions[n.id];
        if (p) {
          minX = Math.min(minX, p.x - nodeWidth / 2);
          maxX = Math.max(maxX, p.x + nodeWidth / 2);
          minY = Math.min(minY, p.y - nodeHeight / 2);
          maxY = Math.max(maxY, p.y + nodeHeight / 2);
        }
      });
      const width = maxX - minX;
      const height = maxY - minY;
      const detailed = calculateDetailedEdgeCrossings(safeNodes, safeEdges, positions);
      return {
        stage: stageName,
        primaryCrossings: detailed.primaryPrimaryCrossings,
        totalCrossings: detailed.totalGeometricCrossings,
        detailed,
        width,
        height,
      };
    }

    // Stage 5: Global Domain Layout
    const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
      domainSpacing, layerSpacing, nodeWidth, nodeHeight, analysis, domainDiscovery, layerMap, domainMap,
    });
    const stage5Pos: Record<string, { x: number; y: number }> = {};
    globalDomainResult.nodeRegions.forEach((reg, id) => {
      stage5Pos[id] = { x: reg.xCenter, y: reg.yCenter };
    });
    const stage5 = measureStage('Stage 5 - Global Domain', stage5Pos);

    // Stage 6: Ordering
    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes, edges: safeEdges, layerMap, domainMap, domainOrder: globalDomainResult.orderedDomains,
    });

    // Stage 7: Primary Local Layout
    const localResult = computeLocalNodeLayout({
      nodes: safeNodes, edges: safeEdges, analysis, domainRegions: globalDomainResult.domainRegions,
      layerMap, domainMap, bucketOrder: orderingResult.bucketOrder,
      options: { nodeWidth, nodeHeight, domainSpacing, layerYMap: globalDomainResult.layerYMap },
    });
    const stage7Pos = { ...localResult.primaryNodePositions };
    const stage7 = measureStage('Stage 7 - Primary Local', stage7Pos);

    // Stage 8: Bridge Placement
    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    globalDomainResult.domainRegions.forEach((region, domain) => {
      domainXCenters[domain] = region.xCenter;
      domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
    });
    const stage8Pos = { ...stage7Pos };
    safeNodes.forEach(node => {
      if (isTestNode(node) || isFieldNode(node)) return;
      const centrality = centralityMap.get(node.id);
      if (centrality?.isBridge && !centrality.isHub) {
        const neighborPositions: Record<string, { x: number; y: number }> = {};
        const nodeAnalysis = analysis.nodes.get(node.id);
        nodeAnalysis?.neighborIds.forEach(nId => {
          if (stage8Pos[nId]) neighborPositions[nId] = stage8Pos[nId];
        });
        const bridgeInfo = calculateBridgeCandidatePosition(
          node.id, layerMap.get(node.id) || 'application', centrality.connectedDomains,
          domainXCenters, domainBounds, neighborPositions,
          { layerSpacing, nodeWidth, nodeHeight, layerYOffsets: globalDomainResult.layerYMap }
        );
        stage8Pos[node.id] = bridgeInfo.candidatePosition;
      }
    });
    const stage8 = measureStage('Stage 8 - Bridge Placement', stage8Pos);

    // Stage 9: Satellites
    const satelliteResult = placeSatellites(safeNodes, safeEdges, analysis, stage8Pos, {
      nodeWidth, nodeHeight, layerSpacing, layerYOffsets: globalDomainResult.layerYMap,
    });
    const stage9Pos = { ...satelliteResult.positions };
    const stage9 = measureStage('Stage 9 - Satellites', stage9Pos);

    // Stage 10: Component Packing
    let stage10Pos = { ...stage9Pos };
    if (analysis.components.length > 1) {
      const componentLayouts = analysis.components.map(comp => {
        const positions: Record<string, { x: number; y: number }> = {};
        let minNodeId: string | undefined = undefined;
        let importance = 0;
        for (const nodeId of comp.nodeIds) {
          const pos = stage9Pos[nodeId];
          if (pos) {
            positions[nodeId] = pos;
            if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) minNodeId = nodeId;
            const centrality = centralityMap.get(nodeId);
            if (centrality) importance += centrality.hubScore + centrality.bridgeScore;
          }
        }
        return { id: comp.componentId, positions, nodeWidth, nodeHeight, structuralImportance: importance, minNodeId };
      }).filter(c => Object.keys(c.positions).length > 0);

      if (componentLayouts.length > 1) {
        const compWidths = componentLayouts.map(c => {
          const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
          return bounds.width;
        }).sort((a, b) => b - a);

        const maxW = compWidths[0] || nodeWidth;
        const secondMaxW = compWidths[1] || nodeWidth;
        const minRowWidth = maxW + secondMaxW + componentGap;

        let totalCompArea = 0;
        componentLayouts.forEach(c => {
          const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
          totalCompArea += (bounds.width + componentGap) * (bounds.height + componentGap);
        });

        const idealWidth = Math.sqrt(totalCompArea * 1.6);
        const targetWidth = Math.max(idealWidth, minRowWidth);

        const packed = packComponentPositions(componentLayouts, {
          gap: componentGap, targetWidth, targetAspectRatio: 1.6, nodeWidth, nodeHeight,
        });
        stage10Pos = packed.positions;
      }
    }
    const stage10 = measureStage('Stage 10 - Component Packing', stage10Pos);

    // Stage 11: Spacing / Collisions
    const finalCleanupResult = resolveSpacingAndCollisions({
      nodes: safeNodes, edges: safeEdges, positions: stage10Pos, analysis,
      options: { nodeWidth, nodeHeight, layerMap, domainMap },
    });
    const stage11Pos = finalCleanupResult.positions;
    const stage11 = measureStage('Stage 11 - Spacing', stage11Pos);

    console.log('\n--- PHASE 3 STAGE METRICS ---');
    console.table([stage5, stage7, stage8, stage9, stage10, stage11].map(s => ({
      Stage: s.stage,
      PrimaryCrossings: s.primaryCrossings,
      TotalCrossings: s.totalCrossings,
      Width: Math.round(s.width),
      Height: Math.round(s.height),
    })));

    console.log('\nDetailed Breakdown for Stage 7:');
    console.log(stage7.detailed);
    console.log('\nDetailed Breakdown for Stage 11:');
    console.log(stage11.detailed);
  });

  it('Phase 11: Unanchored Satellites Analysis', () => {
    const { nodes, edges } = loadCloudSpendFixture();
    const safeNodes = [...nodes];
    const safeEdges = [...edges];
    safeNodes.sort((a, b) => a.id.localeCompare(b.id));
    safeEdges.sort((a, b) => a.id.localeCompare(b.id));

    const positions = computeArchitectureLayout(nodes, edges);

    const unanchoredSatellites: any[] = [];
    safeNodes.forEach(node => {
      if (!isPrimary(node)) {
        let anchorId: string | null = null;
        let expectedParent: string | null = null;
        let reason = '';

        if (isFieldNode(node)) {
          expectedParent = findParentObjectId(node, safeNodes, safeEdges);
          anchorId = node.parentObjectId || expectedParent;
          if (!anchorId) reason = 'Field without parent object ID in file/name';
        } else {
          expectedParent = findParentProductionNodeId(node, safeNodes, safeEdges);
          anchorId = node.parentProductionNodeId || expectedParent;
          if (!anchorId) reason = 'Test without parent production node ID';
        }

        const satPos = positions[node.id];
        const anchorPos = anchorId ? positions[anchorId] : null;

        if (!anchorId || !anchorPos) {
          unanchoredSatellites.push({
            id: node.id,
            type: node.type,
            file: node.file,
            expectedParent,
            anchorId,
            reason: reason || (anchorId ? 'Anchor node missing from positions' : 'No anchor ID resolved'),
            pos: satPos,
          });
        }
      }
    });

    console.log('\n--- PHASE 11 UNANCHORED SATELLITES ---');
    console.log(`Total unanchored satellites: ${unanchoredSatellites.length}`);
    console.log(JSON.stringify(unanchoredSatellites, null, 2));
  });

  it('Phase 10: Geometry Breakdown (Primary vs Bridges vs Satellites vs Final)', () => {
    const { nodes, edges } = loadCloudSpendFixture();
    const safeNodes = [...nodes];
    const safeEdges = [...edges];
    const positions = computeArchitectureLayout(nodes, edges);

    const nodeWidth = 120;
    const nodeHeight = 60;

    function getBboxFor(nodesToMeasure: ExplorerNode[]) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodesToMeasure.forEach(n => {
        const p = positions[n.id];
        if (p) {
          minX = Math.min(minX, p.x - nodeWidth / 2);
          maxX = Math.max(maxX, p.x + nodeWidth / 2);
          minY = Math.min(minY, p.y - nodeHeight / 2);
          maxY = Math.max(maxY, p.y + nodeHeight / 2);
        }
      });
      return { count: nodesToMeasure.length, width: maxX - minX, height: maxY - minY, minX, maxX, minY, maxY };
    }

    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) => domainMap.set(nodeId, assignment.primaryDomain));
    const layerMap = new Map<string, any>();
    safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));

    const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap);

    const primaryNodes = safeNodes.filter(n => isPrimary(n) && !centralityMap.get(n.id)?.isBridge);
    const bridgeNodes = safeNodes.filter(n => isPrimary(n) && centralityMap.get(n.id)?.isBridge);
    const satelliteNodes = safeNodes.filter(n => !isPrimary(n));

    const primaryBbox = getBboxFor(primaryNodes);
    const bridgeBbox = getBboxFor(bridgeNodes);
    const satBbox = getBboxFor(satelliteNodes);
    const finalBbox = getBboxFor(safeNodes);

    console.log('\n--- PHASE 10 GEOMETRY BREAKDOWN ---');
    console.table([
      { Category: 'Primary (non-bridge)', Count: primaryBbox.count, Width: Math.round(primaryBbox.width), Height: Math.round(primaryBbox.height), MinX: Math.round(primaryBbox.minX), MaxX: Math.round(primaryBbox.maxX) },
      { Category: 'Bridges', Count: bridgeBbox.count, Width: Math.round(bridgeBbox.width), Height: Math.round(bridgeBbox.height), MinX: Math.round(bridgeBbox.minX), MaxX: Math.round(bridgeBbox.maxX) },
      { Category: 'Satellites', Count: satBbox.count, Width: Math.round(satBbox.width), Height: Math.round(satBbox.height), MinX: Math.round(satBbox.minX), MaxX: Math.round(satBbox.maxX) },
      { Category: 'Final Canvas', Count: finalBbox.count, Width: Math.round(finalBbox.width), Height: Math.round(finalBbox.height), MinX: Math.round(finalBbox.minX), MaxX: Math.round(finalBbox.maxX) },
    ]);
  });

  it('Phase 12: Satellite Stack Density', () => {
    const { nodes, edges } = loadCloudSpendFixture();
    const safeNodes = [...nodes];
    const safeEdges = [...edges];
    const positions = computeArchitectureLayout(nodes, edges);

    const parentSatMap = new Map<string, ExplorerNode[]>();
    safeNodes.forEach(n => {
      if (isFieldNode(n)) {
        const parentId = n.parentObjectId || findParentObjectId(n, safeNodes, safeEdges);
        if (parentId) {
          if (!parentSatMap.has(parentId)) parentSatMap.set(parentId, []);
          parentSatMap.get(parentId)!.push(n);
        }
      }
    });

    const stackMetrics: any[] = [];
    parentSatMap.forEach((sats, parentId) => {
      const parentPos = positions[parentId];
      if (!parentPos) return;

      let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
      let minParentDist = Infinity;

      sats.forEach(sat => {
        const p = positions[sat.id];
        if (p) {
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          const dist = Math.sqrt((p.x - parentPos.x)**2 + (p.y - parentPos.y)**2);
          minParentDist = Math.min(minParentDist, dist);
        }
      });

      stackMetrics.push({
        parentId,
        fieldCount: sats.length,
        stackWidth: maxX - minX,
        stackHeight: maxY - minY,
        minParentDist: minParentDist.toFixed(1),
      });
    });

    console.log('\n--- PHASE 12 SATELLITE STACK DENSITY ---');
    console.table(stackMetrics);
  });

  it('Phase 13: 40px Row Stagger vs 0px Stagger Analysis', () => {
    const { nodes, edges } = loadCloudSpendFixture();
    const safeNodes = [...nodes];
    const safeEdges = [...edges];

    const pos40 = computeArchitectureLayout(nodes, edges); // default uses 40px row stagger in global-layout

    const crossings40 = calculateDetailedEdgeCrossings(safeNodes, safeEdges, pos40);
    const overlaps40 = nodeOverlapCount(safeNodes, safeEdges, pos40);
    const avgLen40 = averageEdgeLength(safeNodes, safeEdges, pos40);
    const maxLen40 = maxEdgeLength(safeNodes, safeEdges, pos40);

    console.log('\n--- PHASE 13 STAGGER VARIANT ANALYSIS ---');
    console.log('Default (40px stagger):');
    console.log({
      primaryCrossings: crossings40.primaryPrimaryCrossings,
      totalCrossings: crossings40.totalGeometricCrossings,
      overlaps: overlaps40,
      avgEdgeLen: avgLen40.toFixed(1),
      maxEdgeLen: maxLen40.toFixed(1),
    });
  });
});
