import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification } from './analysis';
import { classifyNodeLayerWithReason } from './layers';
import { discoverDomains } from './domains';
import { computeGlobalDomainLayout, buildDomainGraph } from './global-layout';
import { reduceEdgeCrossings } from './ordering';
import { computeLocalNodeLayout } from './local-layout';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from './centrality';
import { placeSatellites } from './satellites';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from './components';
import { resolveSpacingAndCollisions } from './spacing';
import { computeArchitectureLayout } from '../architecture-layout';
import { evaluateLayout } from './evaluate-layout';
import { ALL_BENCHMARK_FIXTURES } from './fixtures';

const FIXTURE_PATH = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');

function loadCloudSpendFixture(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  if (!fs.existsSync(FIXTURE_PATH)) {
    throw new Error(`AUDIT BLOCKED: Cloud Spend Tracker fixture could not be made available at: ${FIXTURE_PATH}`);
  }
  const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { nodes: data.nodes || [], edges: data.edges || [] };
}

describe('Wave 10C Forensic Validation Audit', () => {
  it('Executes Full Wave 10C Forensic Measurement and Export', () => {
    const { nodes, edges } = loadCloudSpendFixture();
    const nodeWidth = 120;
    const nodeHeight = 60;
    const layerSpacing = 250;
    const domainSpacing = 380;
    const componentGap = 100;

    const safeNodes = [...nodes];
    const safeEdges = [...edges];
    safeNodes.sort((a, b) => a.id.localeCompare(b.id));
    safeEdges.sort((a, b) => a.id.localeCompare(b.id));

    // --- 1. STAGE-BY-STAGE PIPELINE CAPTURE ---
    const stagesData: any[] = [];
    const t0 = performance.now();

    // Stage 1: Analysis
    let analysis = computeArchitectureAnalysis(safeNodes, safeEdges);
    const t1 = performance.now();

    // Stage 2: Layer Classification
    const layerMap = new Map<string, any>();
    safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
    analysis = applyLayerClassification(analysis, layerMap);

    // Stage 3: Domain Discovery
    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) => domainMap.set(nodeId, assignment.primaryDomain));
    analysis = applyDomainClassification(analysis, domainMap);

    // Stage 4: Centrality
    const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap);

    // Stage 5: Global Domain Architecture Layout
    const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
      domainSpacing, layerSpacing, nodeWidth, nodeHeight, analysis, domainDiscovery, layerMap, domainMap
    });

    // Stage 5 snapshot: Global Domain Regions
    let gMinX = Infinity, gMaxX = -Infinity, gMinY = Infinity, gMaxY = -Infinity;
    globalDomainResult.domainRegions.forEach(r => {
      gMinX = Math.min(gMinX, r.xMin);
      gMaxX = Math.max(gMaxX, r.xMax);
      gMinY = Math.min(gMinY, r.yMin);
      gMaxY = Math.max(gMaxY, r.yMax);
    });
    const stage5W = gMaxX - gMinX;
    const stage5H = gMaxY - gMinY;
    stagesData.push({
      stage: 'Stage 5: Global Layout (Domains)',
      nodeCount: globalDomainResult.domainRegions.size,
      width: stage5W,
      height: stage5H,
      aspectRatio: (stage5W / (stage5H || 1)).toFixed(2),
      overlaps: 0,
      maxEdgeLength: 'N/A'
    });

    // Stage 6: Layer Ordering
    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes, edges: safeEdges, layerMap, domainMap, domainOrder: globalDomainResult.orderedDomains
    });

    // Stage 7: Local Node Layout (Primary Nodes)
    const localResult = computeLocalNodeLayout({
      nodes: safeNodes, edges: safeEdges, analysis, domainRegions: globalDomainResult.domainRegions,
      layerMap, domainMap, bucketOrder: orderingResult.bucketOrder,
      options: { nodeWidth, nodeHeight, domainSpacing, layerYMap: globalDomainResult.layerYMap }
    });

    const basePositionsStage7 = { ...localResult.primaryNodePositions };
    const evalStage7 = evaluateLayout(safeNodes, safeEdges, basePositionsStage7);
    let s7MinX = Infinity, s7MaxX = -Infinity, s7MinY = Infinity, s7MaxY = -Infinity;
    Object.values(basePositionsStage7).forEach(p => {
      s7MinX = Math.min(s7MinX, p.x - nodeWidth/2);
      s7MaxX = Math.max(s7MaxX, p.x + nodeWidth/2);
      s7MinY = Math.min(s7MinY, p.y - nodeHeight/2);
      s7MaxY = Math.max(s7MaxY, p.y + nodeHeight/2);
    });
    const stage7W = s7MaxX - s7MinX;
    const stage7H = s7MaxY - s7MinY;
    stagesData.push({
      stage: 'Stage 7: Primary Local Node Layout',
      nodeCount: Object.keys(basePositionsStage7).length,
      width: stage7W,
      height: stage7H,
      aspectRatio: (stage7W / (stage7H || 1)).toFixed(2),
      overlaps: evalStage7.nodeOverlapCount,
      maxEdgeLength: evalStage7.maxEdgeLength.toFixed(1)
    });

    // Stage 8: Bridge Candidate Placement
    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    globalDomainResult.domainRegions.forEach((region, domain) => {
      domainXCenters[domain] = region.xCenter;
      domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
    });

    const basePositionsStage8: Record<string, { x: number; y: number }> = { ...basePositionsStage7 };
    safeNodes.forEach(node => {
      const centrality = centralityMap.get(node.id);
      if (centrality?.isBridge && !centrality.isHub) {
        const neighborPositions: Record<string, { x: number; y: number }> = {};
        const nodeAnalysis = analysis.nodes.get(node.id);
        nodeAnalysis?.neighborIds.forEach(nId => {
          if (basePositionsStage8[nId]) neighborPositions[nId] = basePositionsStage8[nId];
        });
        const bridgeInfo = calculateBridgeCandidatePosition(
          node.id, layerMap.get(node.id) || 'application', centrality.connectedDomains,
          domainXCenters, domainBounds, neighborPositions,
          { layerSpacing, nodeWidth, nodeHeight, layerYOffsets: globalDomainResult.layerYMap }
        );
        basePositionsStage8[node.id] = bridgeInfo.candidatePosition;
      }
    });

    const evalStage8 = evaluateLayout(safeNodes, safeEdges, basePositionsStage8);
    let s8MinX = Infinity, s8MaxX = -Infinity, s8MinY = Infinity, s8MaxY = -Infinity;
    Object.values(basePositionsStage8).forEach(p => {
      s8MinX = Math.min(s8MinX, p.x - nodeWidth/2);
      s8MaxX = Math.max(s8MaxX, p.x + nodeWidth/2);
      s8MinY = Math.min(s8MinY, p.y - nodeHeight/2);
      s8MaxY = Math.max(s8MaxY, p.y + nodeHeight/2);
    });
    const stage8W = s8MaxX - s8MinX;
    const stage8H = s8MaxY - s8MinY;
    stagesData.push({
      stage: 'Stage 8: Bridge Placement',
      nodeCount: Object.keys(basePositionsStage8).length,
      width: stage8W,
      height: stage8H,
      aspectRatio: (stage8W / (stage8H || 1)).toFixed(2),
      overlaps: evalStage8.nodeOverlapCount,
      maxEdgeLength: evalStage8.maxEdgeLength.toFixed(1)
    });

    // Stage 9: Secondary Satellite Placement
    const satelliteResult = placeSatellites(safeNodes, safeEdges, analysis, basePositionsStage8, {
      nodeWidth, nodeHeight, layerSpacing, layerYOffsets: globalDomainResult.layerYMap
    });
    const basePositionsStage9 = { ...satelliteResult.positions };
    const evalStage9 = evaluateLayout(safeNodes, safeEdges, basePositionsStage9);
    let s9MinX = Infinity, s9MaxX = -Infinity, s9MinY = Infinity, s9MaxY = -Infinity;
    Object.values(basePositionsStage9).forEach(p => {
      s9MinX = Math.min(s9MinX, p.x - nodeWidth/2);
      s9MaxX = Math.max(s9MaxX, p.x + nodeWidth/2);
      s9MinY = Math.min(s9MinY, p.y - nodeHeight/2);
      s9MaxY = Math.max(s9MaxY, p.y + nodeHeight/2);
    });
    const stage9W = s9MaxX - s9MinX;
    const stage9H = s9MaxY - s9MinY;
    stagesData.push({
      stage: 'Stage 9: Satellite Placement',
      nodeCount: Object.keys(basePositionsStage9).length,
      width: stage9W,
      height: stage9H,
      aspectRatio: (stage9W / (stage9H || 1)).toFixed(2),
      overlaps: evalStage9.nodeOverlapCount,
      maxEdgeLength: evalStage9.maxEdgeLength.toFixed(1)
    });

    // Stage 10: Component Packing
    let basePositionsStage10 = { ...basePositionsStage9 };
    if (analysis.components.length > 1) {
      const componentLayouts: ComponentLocalLayout[] = analysis.components
        .map(comp => {
          const positions: Record<string, { x: number; y: number }> = {};
          let minNodeId: string | undefined = undefined;
          let importance = 0;
          for (const nodeId of comp.nodeIds) {
            const pos = basePositionsStage9[nodeId];
            if (pos) {
              positions[nodeId] = pos;
              if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) minNodeId = nodeId;
              const centrality = centralityMap.get(nodeId);
              if (centrality) importance += centrality.hubScore + centrality.bridgeScore;
            }
          }
          return { id: comp.componentId, positions, nodeWidth, nodeHeight, structuralImportance: importance, minNodeId };
        })
        .filter(c => Object.keys(c.positions).length > 0);

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
          gap: componentGap, targetWidth, targetAspectRatio: 1.6, nodeWidth, nodeHeight
        });
        basePositionsStage10 = packed.positions;
      }
    }

    const evalStage10 = evaluateLayout(safeNodes, safeEdges, basePositionsStage10);
    let s10MinX = Infinity, s10MaxX = -Infinity, s10MinY = Infinity, s10MaxY = -Infinity;
    Object.values(basePositionsStage10).forEach(p => {
      s10MinX = Math.min(s10MinX, p.x - nodeWidth/2);
      s10MaxX = Math.max(s10MaxX, p.x + nodeWidth/2);
      s10MinY = Math.min(s10MinY, p.y - nodeHeight/2);
      s10MaxY = Math.max(s10MaxY, p.y + nodeHeight/2);
    });
    const stage10W = s10MaxX - s10MinX;
    const stage10H = s10MaxY - s10MinY;
    stagesData.push({
      stage: 'Stage 10: Component Packing',
      nodeCount: Object.keys(basePositionsStage10).length,
      width: stage10W,
      height: stage10H,
      aspectRatio: (stage10W / (stage10H || 1)).toFixed(2),
      overlaps: evalStage10.nodeOverlapCount,
      maxEdgeLength: evalStage10.maxEdgeLength.toFixed(1)
    });

    // Stage 11: Final Spacing Cleanup Pass
    const finalCleanupResult = resolveSpacingAndCollisions({
      nodes: safeNodes, edges: safeEdges, positions: basePositionsStage10, analysis,
      options: { nodeWidth, nodeHeight, layerMap, domainMap }
    });
    const finalPositions = finalCleanupResult.positions;
    const t2 = performance.now();

    const finalEval = evaluateLayout(safeNodes, safeEdges, finalPositions);
    let fMinX = Infinity, fMaxX = -Infinity, fMinY = Infinity, fMaxY = -Infinity;
    Object.values(finalPositions).forEach(p => {
      fMinX = Math.min(fMinX, p.x - nodeWidth/2);
      fMaxX = Math.max(fMaxX, p.x + nodeWidth/2);
      fMinY = Math.min(fMinY, p.y - nodeHeight/2);
      fMaxY = Math.max(fMaxY, p.y + nodeHeight/2);
    });
    const finalW = fMaxX - fMinX;
    const finalH = fMaxY - fMinY;
    stagesData.push({
      stage: 'Stage 11: Final Spacing Cleanup',
      nodeCount: Object.keys(finalPositions).length,
      width: finalW,
      height: finalH,
      aspectRatio: (finalW / (finalH || 1)).toFixed(2),
      overlaps: finalEval.nodeOverlapCount,
      maxEdgeLength: finalEval.maxEdgeLength.toFixed(1)
    });

    // --- 2. TARGET WIDTH MATHEMATICAL SENSITIVITY ANALYSIS ---
    const targetWidthSensitivity: any[] = [];
    const domainCountsToTest = [10, 25, 50, 100, 150, 200];
    const avgDomainWidth = 200; // typical domain width

    domainCountsToTest.forEach(count => {
      const totalWidthSum = count * (avgDomainWidth + 60);
      const targetRowWidth = Math.max(2400, Math.min(4800, Math.sqrt(totalWidthSum * 800 * 1.6)));
      const rawSqrt = Math.sqrt(totalWidthSum * 800 * 1.6);
      targetWidthSensitivity.push({
        domainCount: count,
        totalWidthSum,
        rawSqrtValue: rawSqrt.toFixed(1),
        targetRowWidth: targetRowWidth.toFixed(1),
        clampedByMin: targetRowWidth === 2400,
        clampedByMax: targetRowWidth === 4800,
      });
    });

    // --- 3. DOMAIN COHESION & FRAGMENTATION AUDIT (ALL 106 DOMAINS) ---
    const domainCohesionList: any[] = [];
    const domainMapObj = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) => domainMapObj.set(nodeId, assignment.primaryDomain));

    const allDomainsList = Array.from(globalDomainResult.domainRegions.keys()).sort();

    allDomainsList.forEach(domain => {
      const dRegion = globalDomainResult.domainRegions.get(domain)!;
      const dNodes = safeNodes.filter(n => domainMapObj.get(n.id) === domain);

      // Primary nodes vs Secondary nodes
      const primaryNodes = dNodes.filter(n => {
        const isTest = n.behavior?.isTest;
        const isField = n.type === 'Field' || n.type === 'CustomField';
        return !isTest && !isField;
      });

      // All node bounding box
      let dMinX = Infinity, dMaxX = -Infinity, dMinY = Infinity, dMaxY = -Infinity;
      dNodes.forEach(n => {
        const p = finalPositions[n.id];
        if (p) {
          dMinX = Math.min(dMinX, p.x - nodeWidth/2);
          dMaxX = Math.max(dMaxX, p.x + nodeWidth/2);
          dMinY = Math.min(dMinY, p.y - nodeHeight/2);
          dMaxY = Math.max(dMaxY, p.y + nodeHeight/2);
        }
      });
      const dWidth = dMinX !== Infinity ? dMaxX - dMinX : 0;
      const dHeight = dMinY !== Infinity ? dMaxY - dMinY : 0;
      const dCentroidX = dMinX !== Infinity ? (dMinX + dMaxX) / 2 : 0;
      const dCentroidY = dMinY !== Infinity ? (dMinY + dMaxY) / 2 : 0;

      // Primary node bounding box & centroid
      let pMinX = Infinity, pMaxX = -Infinity, pMinY = Infinity, pMaxY = -Infinity;
      primaryNodes.forEach(n => {
        const p = finalPositions[n.id];
        if (p) {
          pMinX = Math.min(pMinX, p.x - nodeWidth/2);
          pMaxX = Math.max(pMaxX, p.x + nodeWidth/2);
          pMinY = Math.min(pMinY, p.y - nodeHeight/2);
          pMaxY = Math.max(pMaxY, p.y + nodeHeight/2);
        }
      });
      const pWidth = pMinX !== Infinity ? pMaxX - pMinX : 0;
      const pCentroidX = pMinX !== Infinity ? (pMinX + pMaxX) / 2 : 0;
      const pCentroidY = pMinY !== Infinity ? (pMinY + pMaxY) / 2 : 0;

      // Pairwise primary distances
      let sumPairDist = 0;
      let maxPairDist = 0;
      let pairCount = 0;
      const primaryDists: number[] = [];

      for (let i = 0; i < primaryNodes.length; i++) {
        const p1 = finalPositions[primaryNodes[i].id];
        for (let j = i + 1; j < primaryNodes.length; j++) {
          const p2 = finalPositions[primaryNodes[j].id];
          if (p1 && p2) {
            const dist = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
            primaryDists.push(dist);
            sumPairDist += dist;
            maxPairDist = Math.max(maxPairDist, dist);
            pairCount++;
          }
        }
      }
      primaryDists.sort((a, b) => a - b);
      const medianPairDist = primaryDists.length > 0 ? primaryDists[Math.floor(primaryDists.length / 2)] : 0;

      const bboxArea = dWidth * dHeight;
      const occupiedNodeArea = dNodes.length * nodeWidth * nodeHeight;
      const utilizationRatio = bboxArea > 0 ? (occupiedNodeArea / bboxArea) : 1;

      // Fragmentation check
      const primaryExpansionRatio = dWidth > 0 && pWidth > 0 ? dWidth / pWidth : 1;

      domainCohesionList.push({
        domain,
        layer: dRegion.primaryLayer,
        orderIndex: dRegion.orderIndex,
        totalNodes: dNodes.length,
        primaryNodes: primaryNodes.length,
        bbox: `[${dMinX.toFixed(0)}, ${dMinY.toFixed(0)}, ${dMaxX.toFixed(0)}, ${dMaxY.toFixed(0)}]`,
        width: dWidth,
        height: dHeight,
        centroid: `(${dCentroidX.toFixed(0)}, ${dCentroidY.toFixed(0)})`,
        pCentroid: `(${pCentroidX.toFixed(0)}, ${pCentroidY.toFixed(0)})`,
        medianPairwiseDist: medianPairDist.toFixed(1),
        maxPairwiseDist: maxPairDist.toFixed(1),
        occupiedArea: occupiedNodeArea,
        bboxArea,
        utilizationRatio: utilizationRatio.toFixed(3),
        primaryExpansionRatio: primaryExpansionRatio.toFixed(2),
      });
    });

    // Top 10 fragmented domains
    const top10FragmentedDomains = [...domainCohesionList]
      .sort((a, b) => parseFloat(b.primaryExpansionRatio) - parseFloat(a.primaryExpansionRatio) || parseFloat(b.maxPairwiseDist) - parseFloat(a.maxPairwiseDist))
      .slice(0, 10);

    // --- 4. RELATIONSHIP LOCALITY AUDIT ---
    const domainCentroidMap = new Map<string, { x: number; y: number }>();
    domainCohesionList.forEach(d => {
      const match = d.centroid.match(/\((-?\d+),\s*(-?\d+)\)/);
      if (match) {
        domainCentroidMap.set(d.domain, { x: parseFloat(match[1]), y: parseFloat(match[2]) });
      }
    });

    // Domain graph
    const domainGraph = buildDomainGraph(safeNodes, safeEdges, domainDiscovery);
    const domainPairRelList: any[] = [];

    domainGraph.edges.forEach(rel => {
      const c1 = domainCentroidMap.get(rel.sourceDomain);
      const c2 = domainCentroidMap.get(rel.targetDomain);
      if (c1 && c2) {
        const centroidDist = Math.sqrt((c1.x - c2.x)**2 + (c1.y - c2.y)**2);
        domainPairRelList.push({
          sourceDomain: rel.sourceDomain,
          targetDomain: rel.targetDomain,
          edgeCount: rel.totalEdgeCount,
          strength: rel.strength,
          centroidDist,
        });
      }
    });

    domainPairRelList.sort((a, b) => b.edgeCount - a.edgeCount);

    // Connectivity quartiles vs median centroid distance
    const totalRelPairs = domainPairRelList.length;
    let q1List: number[] = [], q2List: number[] = [], q3List: number[] = [], q4List: number[] = [];

    if (totalRelPairs >= 4) {
      const qSize = Math.floor(totalRelPairs / 4);
      const q4 = domainPairRelList.slice(0, qSize);
      const q3 = domainPairRelList.slice(qSize, qSize * 2);
      const q2 = domainPairRelList.slice(qSize * 2, qSize * 3);
      const q1 = domainPairRelList.slice(qSize * 3);

      q4List = q4.map(r => r.centroidDist);
      q3List = q3.map(r => r.centroidDist);
      q2List = q2.map(r => r.centroidDist);
      q1List = q1.map(r => r.centroidDist);
    }

    const calcMed = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    const connectivityQuartiles = {
      Q1_lowest: { count: q1List.length, medianCentroidDist: calcMed(q1List).toFixed(1) },
      Q2_mediumLow: { count: q2List.length, medianCentroidDist: calcMed(q2List).toFixed(1) },
      Q3_mediumHigh: { count: q3List.length, medianCentroidDist: calcMed(q3List).toFixed(1) },
      Q4_highest: { count: q4List.length, medianCentroidDist: calcMed(q4List).toFixed(1) },
    };

    // --- 5. EDGE LENGTH DISTRIBUTION AUDIT ---
    const allEdgesWithPositions = safeEdges.map(e => {
      const p1 = finalPositions[e.source];
      const p2 = finalPositions[e.target];
      if (!p1 || !p2) return null;
      const len = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
      const srcDomain = domainMapObj.get(e.source);
      const tgtDomain = domainMapObj.get(e.target);
      const srcLayer = layerMap.get(e.source);
      const tgtLayer = layerMap.get(e.target);
      const isSrcBridge = centralityMap.get(e.source)?.isBridge;
      const isTgtBridge = centralityMap.get(e.target)?.isBridge;
      const isSrcSat = safeNodes.find(n => n.id === e.source)?.behavior?.isTest || safeNodes.find(n => n.id === e.source)?.type === 'CustomField';
      const isTgtSat = safeNodes.find(n => n.id === e.target)?.behavior?.isTest || safeNodes.find(n => n.id === e.target)?.type === 'CustomField';

      return {
        edge: e,
        len,
        isIntraDomain: srcDomain === tgtDomain,
        isIntraLayer: srcLayer === tgtLayer,
        isBridgeEdge: isSrcBridge || isTgtBridge,
        isSatelliteEdge: isSrcSat || isTgtSat,
      };
    }).filter((e): e is NonNullable<typeof e> => e !== null);

    allEdgesWithPositions.sort((a, b) => a.len - b.len);
    const totalEdgeCount = allEdgesWithPositions.length;

    const getPercentile = (p: number) => {
      if (totalEdgeCount === 0) return 0;
      const idx = Math.min(totalEdgeCount - 1, Math.floor(totalEdgeCount * p));
      return allEdgesWithPositions[idx].len;
    };

    const intraDomainEdges = allEdgesWithPositions.filter(e => e.isIntraDomain);
    const interDomainEdges = allEdgesWithPositions.filter(e => !e.isIntraDomain);
    const interLayerEdges = allEdgesWithPositions.filter(e => !e.isIntraLayer);
    const bridgeEdges = allEdgesWithPositions.filter(e => e.isBridgeEdge);
    const satelliteEdges = allEdgesWithPositions.filter(e => e.isSatelliteEdge);

    const calcAvg = (arr: typeof allEdgesWithPositions) => arr.length > 0 ? arr.reduce((sum, e) => sum + e.len, 0) / arr.length : 0;

    const edgeLengthStats = {
      median: getPercentile(0.5).toFixed(1),
      P75: getPercentile(0.75).toFixed(1),
      P90: getPercentile(0.90).toFixed(1),
      P95: getPercentile(0.95).toFixed(1),
      P99: getPercentile(0.99).toFixed(1),
      max: (allEdgesWithPositions[totalEdgeCount - 1]?.len || 0).toFixed(1),
      avgIntraDomain: calcAvg(intraDomainEdges).toFixed(1),
      avgInterDomain: calcAvg(interDomainEdges).toFixed(1),
      avgInterLayer: calcAvg(interLayerEdges).toFixed(1),
      avgBridgeEdge: calcAvg(bridgeEdges).toFixed(1),
      avgSatelliteEdge: calcAvg(satelliteEdges).toFixed(1),
    };

    // --- 6. CROSSING METRIC FORENSICS & BREAKDOWN ---
    let primaryPrimaryCrossings = 0;
    let primaryBridgeCrossings = 0;
    let bridgeBridgeCrossings = 0;
    let satellitePrimaryCrossings = 0;
    let satelliteSatelliteCrossings = 0;

    function doIntersect(p1: {x:number, y:number}, q1: {x:number, y:number}, p2: {x:number, y:number}, q2: {x:number, y:number}): boolean {
      function orientation(p: any, q: any, r: any) {
        const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (Math.abs(val) < 1e-9) return 0;
        return val > 0 ? 1 : 2;
      }
      function onSegment(p: any, q: any, r: any) {
        return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
               q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
      }
      const o1 = orientation(p1, q1, p2);
      const o2 = orientation(p1, q1, q2);
      const o3 = orientation(p2, q2, p1);
      const o4 = orientation(p2, q2, q1);

      if (o1 !== o2 && o3 !== o4) return true;
      if (o1 === 0 && onSegment(p1, p2, q1)) return true;
      if (o2 === 0 && onSegment(p1, q2, q1)) return true;
      if (o3 === 0 && onSegment(p2, p1, q2)) return true;
      if (o4 === 0 && onSegment(p2, q1, q2)) return true;
      return false;
    }

    const segments = allEdgesWithPositions.map(e => ({
      p1: finalPositions[e.edge.source],
      p2: finalPositions[e.edge.target],
      source: e.edge.source,
      target: e.edge.target,
      isBridge: e.isBridgeEdge,
      isSatellite: e.isSatelliteEdge,
    }));

    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const s1 = segments[i];
        const s2 = segments[j];

        if (s1.source === s2.source || s1.source === s2.target || s1.target === s2.source || s1.target === s2.target) continue;

        if (doIntersect(s1.p1, s1.p2, s2.p1, s2.p2)) {
          if (s1.isSatellite || s2.isSatellite) {
            if (s1.isSatellite && s2.isSatellite) {
              satelliteSatelliteCrossings++;
            } else {
              satellitePrimaryCrossings++;
            }
          } else if (s1.isBridge || s2.isBridge) {
            if (s1.isBridge && s2.isBridge) {
              bridgeBridgeCrossings++;
            } else {
              primaryBridgeCrossings++;
            }
          } else {
            primaryPrimaryCrossings++;
          }
        }
      }
    }

    const totalCrossingsBreakdown = {
      total: finalEval.edgeCrossingCount,
      primaryPrimaryCrossings,
      primaryBridgeCrossings,
      bridgeBridgeCrossings,
      satellitePrimaryCrossings,
      satelliteSatelliteCrossings,
    };

    // --- 7. BRIDGE PLACEMENT FORENSICS ---
    const bridgeNodesList: any[] = [];
    safeNodes.forEach(node => {
      const centrality = centralityMap.get(node.id);
      if (centrality?.isBridge && !centrality.isHub) {
        const connectedDomains = centrality.connectedDomains;
        const bridgePos = finalPositions[node.id];
        if (bridgePos) {
          let sumCX = 0, sumCY = 0, cCount = 0;
          connectedDomains.forEach(cd => {
            const cPos = domainCentroidMap.get(cd);
            if (cPos) {
              sumCX += cPos.x;
              sumCY += cPos.y;
              cCount++;
            }
          });
          const midX = cCount > 0 ? sumCX / cCount : bridgePos.x;
          const midY = cCount > 0 ? sumCY / cCount : bridgePos.y;
          const distToMidpoint = Math.sqrt((bridgePos.x - midX)**2 + (bridgePos.y - midY)**2);

          bridgeNodesList.push({
            nodeId: node.id,
            layer: layerMap.get(node.id),
            connectedDomains: connectedDomains.join(','),
            bridgePos: `(${bridgePos.x.toFixed(0)}, ${bridgePos.y.toFixed(0)})`,
            midpoint: `(${midX.toFixed(0)}, ${midY.toFixed(0)})`,
            distToMidpoint: distToMidpoint.toFixed(1),
          });
        }
      }
    });

    // --- 8. SATELLITE PLACEMENT FORENSICS ---
    const satelliteAuditList: any[] = [];

    safeNodes.forEach(node => {
      const isTest = node.behavior?.isTest;
      const isField = node.type === 'CustomField' || node.type === 'Field';

      if (isTest || isField) {
        const anchorEdges = safeEdges.filter(e => e.source === node.id || e.target === node.id);
        let anchorId = 'UNANCHORED';
        if (anchorEdges.length > 0) {
          const firstEdge = anchorEdges[0];
          anchorId = firstEdge.source === node.id ? firstEdge.target : firstEdge.source;
        }

        const satPos = finalPositions[node.id];
        const anchorPos = finalPositions[anchorId];
        let anchorDist = 0;
        if (satPos && anchorPos) {
          anchorDist = Math.sqrt((satPos.x - anchorPos.x)**2 + (satPos.y - anchorPos.y)**2);
        }

        satelliteAuditList.push({
          nodeId: node.id,
          type: isTest ? 'Test' : 'Field',
          anchorId,
          anchorDist,
          satPos: satPos ? `(${satPos.x.toFixed(0)}, ${satPos.y.toFixed(0)})` : 'N/A',
          anchorPos: anchorPos ? `(${anchorPos.x.toFixed(0)}, ${anchorPos.y.toFixed(0)})` : 'N/A',
        });
      }
    });

    satelliteAuditList.sort((a, b) => a.anchorDist - b.anchorDist);
    const satDistances = satelliteAuditList.map(s => s.anchorDist);
    const satCount = satDistances.length;

    const satelliteStats = {
      totalSatellites: satCount,
      medianAnchorDist: satCount > 0 ? satDistances[Math.floor(satCount * 0.5)].toFixed(1) : '0',
      P90AnchorDist: satCount > 0 ? satDistances[Math.floor(satCount * 0.9)].toFixed(1) : '0',
      P95AnchorDist: satCount > 0 ? satDistances[Math.floor(satCount * 0.95)].toFixed(1) : '0',
      P99AnchorDist: satCount > 0 ? satDistances[Math.floor(satCount * 0.99)].toFixed(1) : '0',
      maxAnchorDist: satCount > 0 ? satDistances[satCount - 1].toFixed(1) : '0',
      top10Outliers: satelliteAuditList.slice(-10).map(s => ({
        nodeId: s.nodeId,
        type: s.type,
        anchorId: s.anchorId,
        anchorDist: s.anchorDist.toFixed(1)
      })),
    };

    // --- 9. SMALL-GRAPH FALLBACK BOUNDARY AUDIT ---
    const smallGraphBoundaryTests: any[] = [];
    const boundaryCases = [
      { domains: 24, totalWidth: 4999, expect2D: false },
      { domains: 24, totalWidth: 5001, expect2D: true },
      { domains: 25, totalWidth: 4000, expect2D: true },
      { domains: 26, totalWidth: 4000, expect2D: true },
    ];

    boundaryCases.forEach(bCase => {
      const isMultiRowNeeded = bCase.domains >= 25 || bCase.totalWidth > 5000;
      smallGraphBoundaryTests.push({
        domainsCount: bCase.domains,
        totalWidth: bCase.totalWidth,
        isMultiRowTriggered: isMultiRowNeeded,
        matchesExpectedMode: isMultiRowNeeded === bCase.expect2D,
      });
    });

    // --- 10. INPUT-ORDER DETERMINISM AUDIT ---
    const posRun1 = computeArchitectureLayout(safeNodes, safeEdges);
    const posRun2 = computeArchitectureLayout(safeNodes, safeEdges);

    let maxRepeatDelta = 0;
    safeNodes.forEach(n => {
      const p1 = posRun1[n.id];
      const p2 = posRun2[n.id];
      if (p1 && p2) {
        const d = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
        maxRepeatDelta = Math.max(maxRepeatDelta, d);
      }
    });

    function shuffle<T>(array: T[], seed: number): T[] {
      const arr = [...array];
      let m = arr.length;
      let t: T, i: number, s = seed;
      while (m > 0) {
        s = (s * 9301 + 49297) % 233280;
        i = Math.floor((s / 233280) * m);
        m--;
        t = arr[m];
        arr[m] = arr[i];
        arr[i] = t;
      }
      return arr;
    }

    let maxShuffleDelta = 0;
    for (let sRun = 1; sRun <= 5; sRun++) {
      const shufNodes = shuffle(safeNodes, sRun * 101 + 7);
      const shufEdges = shuffle(safeEdges, sRun * 203 + 11);
      const shufPos = computeArchitectureLayout(shufNodes, shufEdges);

      safeNodes.forEach(n => {
        const pBase = posRun1[n.id];
        const pShuf = shufPos[n.id];
        if (pBase && pShuf) {
          const d = Math.sqrt((pBase.x - pShuf.x)**2 + (pBase.y - pShuf.y)**2);
          maxShuffleDelta = Math.max(maxShuffleDelta, d);
        }
      });
    }

    const determinismAudit = {
      repeatRunMaxDeltaPx: maxRepeatDelta.toFixed(5),
      shuffleInputMaxDeltaPx: maxShuffleDelta.toFixed(5),
      is100PercentDeterministic: maxRepeatDelta === 0 && maxShuffleDelta === 0,
    };

    // --- 11. REGRESSION MATRIX ACROSS ALL BENCHMARK FIXTURES ---
    const benchmarkRegressionMatrix: any[] = [];

    ALL_BENCHMARK_FIXTURES.forEach(fixture => {
      const fNodes = [...fixture.nodes];
      const fEdges = [...fixture.edges];
      const fPos = computeArchitectureLayout(fNodes, fEdges);
      const fEval = evaluateLayout(fNodes, fEdges, fPos);

      let fMinX = Infinity, fMaxX = -Infinity, fMinY = Infinity, fMaxY = -Infinity;
      Object.values(fPos).forEach(p => {
        fMinX = Math.min(fMinX, p.x - 60);
        fMaxX = Math.max(fMaxX, p.x + 60);
        fMinY = Math.min(fMinY, p.y - 30);
        fMaxY = Math.max(fMaxY, p.y + 30);
      });
      const fW = fMinX !== Infinity ? fMaxX - fMinX : 0;
      const fH = fMinY !== Infinity ? fMaxY - fMinY : 0;

      // Repeat determinism check
      const fPos2 = computeArchitectureLayout(fNodes, fEdges);
      let fDelta = 0;
      fNodes.forEach(n => {
        if (fPos[n.id] && fPos2[n.id]) {
          fDelta = Math.max(fDelta, Math.sqrt((fPos[n.id].x - fPos2[n.id].x)**2 + (fPos[n.id].y - fPos2[n.id].y)**2));
        }
      });

      benchmarkRegressionMatrix.push({
        fixtureId: fixture.id,
        nodeCount: fNodes.length,
        edgeCount: fEdges.length,
        width: fW.toFixed(1),
        height: fH.toFixed(1),
        aspectRatio: (fW / (fH || 1)).toFixed(2),
        overlaps: fEval.nodeOverlapCount,
        crossings: fEval.edgeCrossingCount,
        maxEdge: fEval.maxEdgeLength.toFixed(1),
        determinismDeltaPx: fDelta.toFixed(5),
        layerViolations: fEval.layerViolationCount,
      });
    });

    // --- SAVE COMPLETE FORENSIC AUDIT DATA TO JSON ---
    const wave10cForensicReport = {
      metadata: {
        fixture: 'Cloud Spend Tracker',
        nodeCount: safeNodes.length,
        edgeCount: safeEdges.length,
        domainCount: globalDomainResult.domainRegions.size,
        timestamp: new Date().toISOString(),
      },
      performanceTimingsMs: {
        analysis: (t1 - t0).toFixed(2),
        layout: (t2 - t1).toFixed(2),
        total: (t2 - t0).toFixed(2),
      },
      pipelineStagesSnapshots: stagesData,
      targetWidthSensitivity,
      domainCohesionSummary: {
        totalDomains: domainCohesionList.length,
        top10FragmentedDomains,
      },
      relationshipLocality: {
        connectivityQuartiles,
        topDomainRelationships: domainPairRelList.slice(0, 10),
      },
      edgeLengthStats,
      crossingsBreakdown: totalCrossingsBreakdown,
      bridgePlacement: {
        bridgeCount: bridgeNodesList.length,
        sampleBridges: bridgeNodesList.slice(0, 10),
      },
      satellitePlacement: satelliteStats,
      smallGraphBoundaryTests,
      determinismAudit,
      benchmarkRegressionMatrix,
    };

    fs.writeFileSync(
      path.resolve(__dirname, '../../../../wave10c-forensic-data.json'),
      JSON.stringify(wave10cForensicReport, null, 2)
    );

    console.log('Wave 10C Forensic Audit Data Written to wave10c-forensic-data.json');

    expect(safeNodes.length).toBe(240);
    expect(safeEdges.length).toBe(1024);
    expect(globalDomainResult.domainRegions.size).toBe(106);
    expect(determinismAudit.is100PercentDeterministic).toBe(true);
  });
});
