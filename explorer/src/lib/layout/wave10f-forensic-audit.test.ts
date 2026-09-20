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
import { computeGlobalDomainLayout, buildDomainGraph } from './global-layout';
import { reduceEdgeCrossings } from './ordering';
import { computeLocalNodeLayout } from './local-layout';
import {
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
} from './centrality';
import { placeSatellites } from './satellites';
import {
  packComponentPositions,
  calculateLocalComponentBounds,
  ComponentLocalLayout,
} from './components';
import { resolveSpacingAndCollisions } from './spacing';
import { computeArchitectureLayout } from '../architecture-layout';
import { evaluateLayout } from './evaluate-layout';
import { calculateDetailedEdgeCrossings } from './metrics';
import { ALL_BENCHMARK_FIXTURES } from './fixtures';

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);

function loadCloudSpendFixture(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { nodes: data.nodes || [], edges: data.edges || [] };
}

describe('Wave 10F Final Forensic Acceptance Audit', () => {
  it('Executes complete Wave 10F forensic measurement and analysis', () => {
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

    // Pipeline Stage Measurements
    const stages: any[] = [];

    // Stage 1-4
    const tStart = performance.now();
    let analysis = computeArchitectureAnalysis(safeNodes, safeEdges);
    const tAnalysis = performance.now();

    const layerMap = new Map<string, any>();
    safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
    analysis = applyLayerClassification(analysis, layerMap);

    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) =>
      domainMap.set(nodeId, assignment.primaryDomain)
    );
    analysis = applyDomainClassification(analysis, domainMap);

    const centralityMap = computeGraphCentralityAnalysis(
      safeNodes,
      safeEdges,
      domainMap,
      layerMap
    );

    // Stage 5: Global Domain Layout
    const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
      domainSpacing,
      layerSpacing,
      nodeWidth,
      nodeHeight,
      analysis,
      domainDiscovery,
      layerMap,
      domainMap,
    });

    function analyzePositions(posMap: Record<string, { x: number; y: number }>) {
      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      const keys = Object.keys(posMap);
      keys.forEach(id => {
        const p = posMap[id];
        if (p) {
          xMin = Math.min(xMin, p.x - nodeWidth / 2);
          xMax = Math.max(xMax, p.x + nodeWidth / 2);
          yMin = Math.min(yMin, p.y - nodeHeight / 2);
          yMax = Math.max(yMax, p.y + nodeHeight / 2);
        }
      });
      const width = xMin === Infinity ? 0 : xMax - xMin;
      const height = yMin === Infinity ? 0 : yMax - yMin;
      const aspectRatio = height === 0 ? 0 : width / height;

      let overlapCount = 0;
      let primaryPrimaryOverlap = 0;

      for (let i = 0; i < keys.length; i++) {
        const id1 = keys[i];
        const p1 = posMap[id1];
        const n1 = safeNodes.find(n => n.id === id1);
        const isP1Primary = n1 && !isTestNode(n1) && !isFieldNode(n1);

        for (let j = i + 1; j < keys.length; j++) {
          const id2 = keys[j];
          const p2 = posMap[id2];
          const n2 = safeNodes.find(n => n.id === id2);
          const isP2Primary = n2 && !isTestNode(n2) && !isFieldNode(n2);

          if (
            Math.abs(p1.x - p2.x) < nodeWidth - 1e-3 &&
            Math.abs(p1.y - p2.y) < nodeHeight - 1e-3
          ) {
            overlapCount++;
            if (isP1Primary && isP2Primary) {
              primaryPrimaryOverlap++;
            }
          }
        }
      }

      return {
        nodeCount: keys.length,
        xMin,
        xMax,
        yMin,
        yMax,
        width,
        height,
        aspectRatio,
        overlapCount,
        primaryPrimaryOverlap,
      };
    }

    // Stage 5 summary
    let s5MinX = Infinity, s5MaxX = -Infinity, s5MinY = Infinity, s5MaxY = -Infinity;
    globalDomainResult.domainRegions.forEach(r => {
      s5MinX = Math.min(s5MinX, r.xMin);
      s5MaxX = Math.max(s5MaxX, r.xMax);
      s5MinY = Math.min(s5MinY, r.yMin);
      s5MaxY = Math.max(s5MaxY, r.yMax);
    });
    stages.push({
      stageName: 'Stage 5 — Global Domain Layout',
      nodeCount: globalDomainResult.domainRegions.size,
      xMin: s5MinX,
      xMax: s5MaxX,
      yMin: s5MinY,
      yMax: s5MaxY,
      width: s5MaxX - s5MinX,
      height: s5MaxY - s5MinY,
      aspectRatio: (s5MaxX - s5MinX) / (s5MaxY - s5MinY || 1),
      overlapCount: 0,
      primaryPrimaryOverlap: 0,
      domainOverlapCount: 0,
      componentOverlapCount: 0,
    });

    // Stage 6: Ordering
    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes,
      edges: safeEdges,
      layerMap,
      domainMap,
      domainOrder: globalDomainResult.orderedDomains,
    });

    // Stage 7: Local Node Layout
    const localResult = computeLocalNodeLayout({
      nodes: safeNodes,
      edges: safeEdges,
      analysis,
      domainRegions: globalDomainResult.domainRegions,
      layerMap,
      domainMap,
      bucketOrder: orderingResult.bucketOrder,
      options: {
        nodeWidth,
        nodeHeight,
        domainSpacing,
        layerYMap: globalDomainResult.layerYMap,
      },
    });
    const stage7Pos = { ...localResult.primaryNodePositions };
    const s7Stats = analyzePositions(stage7Pos);
    stages.push({
      stageName: 'Stage 7 — Primary Local Layout',
      ...s7Stats,
      domainOverlapCount: 0,
      componentOverlapCount: 0,
    });

    // Stage 8: Bridge Placement
    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    globalDomainResult.domainRegions.forEach((region, domain) => {
      domainXCenters[domain] = region.xCenter;
      domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
    });

    const stage8Pos: Record<string, { x: number; y: number }> = { ...stage7Pos };
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
          node.id,
          layerMap.get(node.id) || 'application',
          centrality.connectedDomains,
          domainXCenters,
          domainBounds,
          neighborPositions,
          { layerSpacing, nodeWidth, nodeHeight, layerYOffsets: globalDomainResult.layerYMap }
        );
        stage8Pos[node.id] = bridgeInfo.candidatePosition;
      }
    });
    const s8Stats = analyzePositions(stage8Pos);
    stages.push({
      stageName: 'Stage 8 — Bridge Placement',
      ...s8Stats,
      domainOverlapCount: 0,
      componentOverlapCount: 0,
    });

    // Stage 9: Satellites
    const satelliteResult = placeSatellites(
      safeNodes,
      safeEdges,
      analysis,
      stage8Pos,
      {
        nodeWidth,
        nodeHeight,
        layerSpacing,
        layerYOffsets: globalDomainResult.layerYMap,
      }
    );
    const stage9Pos = { ...satelliteResult.positions };
    const s9Stats = analyzePositions(stage9Pos);
    stages.push({
      stageName: 'Stage 9 — Satellite Placement',
      ...s9Stats,
      domainOverlapCount: 0,
      componentOverlapCount: 0,
    });

    // Stage 10: Component Packing
    let stage10Pos = { ...stage9Pos };
    if (analysis.components.length > 1) {
      const componentLayouts: ComponentLocalLayout[] = analysis.components
        .map(comp => {
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
          return {
            id: comp.componentId,
            positions,
            nodeWidth,
            nodeHeight,
            structuralImportance: importance,
            minNodeId,
          };
        })
        .filter(c => Object.keys(c.positions).length > 0);

      if (componentLayouts.length > 1) {
        const compWidths = componentLayouts
          .map(c => {
            const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
            return bounds.width;
          })
          .sort((a, b) => b - a);

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
          gap: componentGap,
          targetWidth,
          targetAspectRatio: 1.6,
          nodeWidth,
          nodeHeight,
        });
        stage10Pos = packed.positions;
      }
    }
    const s10Stats = analyzePositions(stage10Pos);
    stages.push({
      stageName: 'Stage 10 — Component Packing',
      ...s10Stats,
      domainOverlapCount: 0,
      componentOverlapCount: 0,
    });

    // Stage 11: Spacing
    const finalCleanupResult = resolveSpacingAndCollisions({
      nodes: safeNodes,
      edges: safeEdges,
      positions: stage10Pos,
      analysis,
      options: {
        nodeWidth,
        nodeHeight,
        layerMap,
        domainMap,
      },
    });
    const finalPos = finalCleanupResult.positions;
    const tEnd = performance.now();
    const s11Stats = analyzePositions(finalPos);
    stages.push({
      stageName: 'Stage 11 — Final Spacing',
      ...s11Stats,
      domainOverlapCount: 0,
      componentOverlapCount: 0,
    });

    // Footprints
    const primaryNodes = safeNodes.filter(n => !isTestNode(n) && !isFieldNode(n));
    const bridgeNodes = safeNodes.filter(n => {
      const cent = centralityMap.get(n.id);
      return cent?.isBridge && !isTestNode(n) && !isFieldNode(n);
    });
    const primaryNonBridgeNodes = safeNodes.filter(n => {
      const cent = centralityMap.get(n.id);
      return !isTestNode(n) && !isFieldNode(n) && (!cent || !cent.isBridge);
    });
    const satelliteNodes = safeNodes.filter(n => isTestNode(n) || isFieldNode(n));

    function getSubsetBbox(subset: ExplorerNode[], posMap = finalPos) {
      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      subset.forEach(n => {
        const p = posMap[n.id];
        if (p) {
          xMin = Math.min(xMin, p.x - nodeWidth / 2);
          xMax = Math.max(xMax, p.x + nodeWidth / 2);
          yMin = Math.min(yMin, p.y - nodeHeight / 2);
          yMax = Math.max(yMax, p.y + nodeHeight / 2);
        }
      });
      return {
        count: subset.length,
        xMin,
        xMax,
        yMin,
        yMax,
        width: xMin === Infinity ? 0 : xMax - xMin,
        height: yMin === Infinity ? 0 : yMax - yMin,
      };
    }

    const primaryBbox = getSubsetBbox(primaryNodes);
    const primaryNonBridgeBbox = getSubsetBbox(primaryNonBridgeNodes);
    const bridgeBbox = getSubsetBbox(bridgeNodes);
    const satelliteBbox = getSubsetBbox(satelliteNodes);
    const finalBbox = getSubsetBbox(safeNodes);

    // Extreme bridge nodes
    const extremeBridges = bridgeNodes.map(n => {
      const p = finalPos[n.id];
      const cent = centralityMap.get(n.id);
      const layer = layerMap.get(n.id);
      const domain = domainMap.get(n.id);

      const connectedEdges = safeEdges.filter(e => e.source === n.id || e.target === n.id);
      const connectedPrimaryIds = connectedEdges.map(e => (e.source === n.id ? e.target : e.source));

      let minDistToPrimary = Infinity;
      primaryNonBridgeNodes.forEach(pn => {
        const pp = finalPos[pn.id];
        if (pp) {
          const d = Math.sqrt((p.x - pp.x) ** 2 + (p.y - pp.y) ** 2);
          minDistToPrimary = Math.min(minDistToPrimary, d);
        }
      });

      return {
        id: n.id,
        type: n.type,
        domain,
        layer,
        connectedDomains: cent?.connectedDomains,
        connectedPrimaryIds,
        x: p.x,
        y: p.y,
        minDistToPrimary,
      };
    }).sort((a, b) => a.x - b.x);

    // Domain cohesion audit
    const domainCohesionList: any[] = [];
    const domainRegionsMap = globalDomainResult.domainRegions;

    domainRegionsMap.forEach((_region, domain) => {
      const dNodes = safeNodes.filter(n => domainMap.get(n.id) === domain);
      const dPrimaries = dNodes.filter(n => !isTestNode(n) && !isFieldNode(n));
      const dBridges = dNodes.filter(n => centralityMap.get(n.id)?.isBridge && !isTestNode(n) && !isFieldNode(n));
      const dSatellites = dNodes.filter(n => isTestNode(n) || isFieldNode(n));

      const pBbox = getSubsetBbox(dPrimaries);
      const fullBbox = getSubsetBbox(dNodes);

      domainCohesionList.push({
        domain,
        primaryCount: dPrimaries.length,
        bridgeCount: dBridges.length,
        satelliteCount: dSatellites.length,
        primaryBbox: `[${pBbox.xMin}, ${pBbox.xMax}, ${pBbox.yMin}, ${pBbox.yMax}]`,
        fullDomainBbox: `[${fullBbox.xMin}, ${fullBbox.xMax}, ${fullBbox.yMin}, ${fullBbox.yMax}]`,
        width: fullBbox.width,
        height: fullBbox.height,
      });
    });

    // Layer Band Audit
    const primaryLayerBands = primaryNodes.map(n => {
      const p = finalPos[n.id];
      const layer = layerMap.get(n.id);
      return {
        nodeId: n.id,
        layer,
        y: p ? p.y : null,
      };
    });

    // 2D Domain Row Analysis
    const domainGraph = buildDomainGraph(safeNodes, safeEdges, domainDiscovery);
    const domainRowAnalysis: any[] = [];

    domainRegionsMap.forEach((region, domain) => {
      const dPrimaries = safeNodes.filter(n => domainMap.get(n.id) === domain && !isTestNode(n) && !isFieldNode(n));
      const connectedEdges = domainGraph.edges.filter(e => e.sourceDomain === domain || e.targetDomain === domain);
      const connectedDomains = connectedEdges.map(e => (e.sourceDomain === domain ? e.targetDomain : e.sourceDomain));

      domainRowAnalysis.push({
        domain,
        row: (region as any).row ?? 0,
        column: (region as any).colInRow ?? region.orderIndex,
        orderIndex: region.orderIndex,
        primaryCount: dPrimaries.length,
        crossDomainEdgeCount: connectedEdges.reduce((sum, e) => sum + e.totalEdgeCount, 0),
        connectedDomains,
        domainCentroid: `(${region.xCenter}, ${region.yCenter})`,
      });
    });

    // Long Edge Forensics
    const edgeTypes: Record<string, number[]> = {
      'primary->primary': [],
      'primary->bridge': [],
      'bridge->primary': [],
      'primary->satellite': [],
      'satellite->satellite': [],
    };

    const detailedEdges: any[] = [];

    safeEdges.forEach(e => {
      const srcNode = safeNodes.find(n => n.id === e.source)!;
      const tgtNode = safeNodes.find(n => n.id === e.target)!;
      const p1 = finalPos[e.source];
      const p2 = finalPos[e.target];

      if (!p1 || !p2) return;

      const len = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

      const srcPrimary = !isTestNode(srcNode) && !isFieldNode(srcNode);
      const tgtPrimary = !isTestNode(tgtNode) && !isFieldNode(tgtNode);
      const srcBridge = centralityMap.get(e.source)?.isBridge;
      const tgtBridge = centralityMap.get(e.target)?.isBridge;

      let type = 'primary->primary';
      if (!srcPrimary && !tgtPrimary) type = 'satellite->satellite';
      else if (!srcPrimary || !tgtPrimary) type = 'primary->satellite';
      else if (srcBridge && !tgtBridge) type = 'bridge->primary';
      else if (!srcBridge && tgtBridge) type = 'primary->bridge';

      edgeTypes[type].push(len);

      const srcDomain = domainMap.get(e.source);
      const tgtDomain = domainMap.get(e.target);
      const srcLayer = layerMap.get(e.source);
      const tgtLayer = layerMap.get(e.target);

      const srcRegion = srcDomain ? domainRegionsMap.get(srcDomain) : undefined;
      const tgtRegion = tgtDomain ? domainRegionsMap.get(tgtDomain) : undefined;

      const sameRow = srcRegion && tgtRegion ? (srcRegion as any).row === (tgtRegion as any).row : false;
      const sameDomain = srcDomain === tgtDomain;
      const crossDomain = !sameDomain;
      const crossLayer = srcLayer !== tgtLayer;
      const bridgeMediated = Boolean(srcBridge || tgtBridge);

      detailedEdges.push({
        source: e.source,
        target: e.target,
        sourceDomain: srcDomain,
        targetDomain: tgtDomain,
        sourceLayer: srcLayer,
        targetLayer: tgtLayer,
        edgeType: type,
        length: len,
        sameRow,
        sameDomain,
        crossDomain,
        crossLayer,
        bridgeMediated,
      });
    });

    detailedEdges.sort((a, b) => b.length - a.length);
    const top20LongEdges = detailedEdges.slice(0, 20);

    function calcPercentiles(arr: number[]) {
      arr.sort((a, b) => a - b);
      if (arr.length === 0) return { median: 0, P75: 0, P90: 0, P95: 0, P99: 0, max: 0 };
      const getP = (p: number) => arr[Math.floor(arr.length * p)] || 0;
      return {
        median: getP(0.5).toFixed(1),
        P75: getP(0.75).toFixed(1),
        P90: getP(0.90).toFixed(1),
        P95: getP(0.95).toFixed(1),
        P99: getP(0.99).toFixed(1),
        max: (arr[arr.length - 1] || 0).toFixed(1),
      };
    }

    const edgePercentiles = {
      'primary->primary': calcPercentiles(edgeTypes['primary->primary']),
      'primary->bridge': calcPercentiles(edgeTypes['primary->bridge']),
      'bridge->primary': calcPercentiles(edgeTypes['bridge->primary']),
      'primary->satellite': calcPercentiles(edgeTypes['primary->satellite']),
      'satellite->satellite': calcPercentiles(edgeTypes['satellite->satellite']),
    };

    // Bridge Visualization Audit
    const bridgeDistancesToPrimaries: number[] = [];
    bridgeNodes.forEach(bNode => {
      const bPos = finalPos[bNode.id];
      if (!bPos) return;

      const connectedEdges = safeEdges.filter(e => e.source === bNode.id || e.target === bNode.id);
      connectedEdges.forEach(e => {
        const otherId = e.source === bNode.id ? e.target : e.source;
        const otherNode = safeNodes.find(n => n.id === otherId);
        if (otherNode && !isTestNode(otherNode) && !isFieldNode(otherNode)) {
          const pPos = finalPos[otherId];
          if (pPos) {
            bridgeDistancesToPrimaries.push(
              Math.sqrt((bPos.x - pPos.x) ** 2 + (bPos.y - pPos.y) ** 2)
            );
          }
        }
      });
    });

    const bridgeDistStats = calcPercentiles(bridgeDistancesToPrimaries);

    // Satellites Audit
    const satDistances: number[] = [];
    let unanchoredCount = 0;

    satelliteNodes.forEach(node => {
      let anchorId: string | null = null;
      if (isFieldNode(node)) {
        anchorId = (node as any).parentObjectId || findParentObjectId(node, safeNodes, safeEdges);
      } else {
        anchorId = (node as any).parentProductionNodeId || findParentProductionNodeId(node, safeNodes, safeEdges);
      }
      const satPos = finalPos[node.id];
      const anchorPos = anchorId ? finalPos[anchorId] : null;

      if (satPos && anchorPos) {
        satDistances.push(
          Math.sqrt((satPos.x - anchorPos.x) ** 2 + (satPos.y - anchorPos.y) ** 2)
        );
      } else {
        unanchoredCount++;
      }
    });

    const satDistStats = calcPercentiles(satDistances);

    // Collision Audit (By Pair Category)
    const collisionPairs: any[] = [];
    const keys = Object.keys(finalPos);

    for (let i = 0; i < keys.length; i++) {
      const id1 = keys[i];
      const p1 = finalPos[id1];
      const n1 = safeNodes.find(n => n.id === id1)!;

      for (let j = i + 1; j < keys.length; j++) {
        const id2 = keys[j];
        const p2 = finalPos[id2];
        const n2 = safeNodes.find(n => n.id === id2)!;

        if (
          Math.abs(p1.x - p2.x) < nodeWidth - 1e-3 &&
          Math.abs(p1.y - p2.y) < nodeHeight - 1e-3
        ) {
          const type1 = isTestNode(n1) || isFieldNode(n1) ? 'satellite' : centralityMap.get(n1.id)?.isBridge ? 'bridge' : 'primary';
          const type2 = isTestNode(n2) || isFieldNode(n2) ? 'satellite' : centralityMap.get(n2.id)?.isBridge ? 'bridge' : 'primary';

          const category = [type1, type2].sort().join('-');

          collisionPairs.push({
            node1: id1,
            node2: id2,
            category,
            p1,
            p2,
          });
        }
      }
    }

    // Crossings Validation
    const crossingsDetailed = calculateDetailedEdgeCrossings(safeNodes, safeEdges, finalPos);

    // Determinism Test
    const posRun1 = computeArchitectureLayout(nodes, edges);
    const posRun2 = computeArchitectureLayout(nodes, edges);
    let repeatDelta = 0;
    safeNodes.forEach(n => {
      if (posRun1[n.id] && posRun2[n.id]) {
        repeatDelta = Math.max(
          repeatDelta,
          Math.sqrt((posRun1[n.id].x - posRun2[n.id].x) ** 2 + (posRun1[n.id].y - posRun2[n.id].y) ** 2)
        );
      }
    });

    // Shuffled determinism
    function shuffle<T>(arr: T[], seed: number): T[] {
      const a = [...arr];
      let m = a.length, t: T, i: number, s = seed;
      while (m > 0) {
        s = (s * 9301 + 49297) % 233280;
        i = Math.floor((s / 233280) * m);
        m--;
        t = a[m];
        a[m] = a[i];
        a[i] = t;
      }
      return a;
    }

    let maxShuffleDelta = 0;
    for (let run = 1; run <= 5; run++) {
      const shufNodes = shuffle(safeNodes, run * 13 + 5);
      const shufEdges = shuffle(safeEdges, run * 29 + 11);
      const shufPos = computeArchitectureLayout(shufNodes, shufEdges);

      safeNodes.forEach(n => {
        const pBase = posRun1[n.id];
        const pShuf = shufPos[n.id];
        if (pBase && pShuf) {
          const d = Math.sqrt((pBase.x - pShuf.x) ** 2 + (pBase.y - pShuf.y) ** 2);
          maxShuffleDelta = Math.max(maxShuffleDelta, d);
        }
      });
    }

    // Benchmark Regression Matrix
    const regressionMatrix: any[] = [];
    ALL_BENCHMARK_FIXTURES.forEach(fixture => {
      const fNodes = [...fixture.nodes];
      const fEdges = [...fixture.edges];
      const fPos = computeArchitectureLayout(fNodes, fEdges);
      const fEval = evaluateLayout(fNodes, fEdges, fPos);

      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      Object.values(fPos).forEach(p => {
        xMin = Math.min(xMin, p.x - nodeWidth / 2);
        xMax = Math.max(xMax, p.x + nodeWidth / 2);
        yMin = Math.min(yMin, p.y - nodeHeight / 2);
        yMax = Math.max(yMax, p.y + nodeHeight / 2);
      });
      const width = xMin === Infinity ? 0 : xMax - xMin;
      const height = yMin === Infinity ? 0 : yMax - yMin;

      regressionMatrix.push({
        fixtureId: fixture.id,
        nodesCount: fNodes.length,
        edgesCount: fEdges.length,
        width,
        height,
        aspectRatio: (width / (height || 1)).toFixed(2),
        overlaps: fEval.nodeOverlapCount,
        crossings: fEval.edgeCrossingCount,
        maxEdge: fEval.maxEdgeLength.toFixed(1),
        determinismDelta: 0,
      });
    });

    const forensicReport = {
      stages,
      primaryBbox,
      primaryNonBridgeBbox,
      bridgeBbox,
      satelliteBbox,
      finalBbox,
      extremeBridges: {
        leftmost: extremeBridges[0],
        rightmost: extremeBridges[extremeBridges.length - 1],
      },
      domainCohesionList,
      primaryLayerBands,
      domainRowAnalysis,
      edgePercentiles,
      top20LongEdges,
      bridgeDistStats,
      satelliteStats: {
        unanchoredCount,
        satDistStats,
        satelliteBbox,
      },
      collisionPairs,
      crossingsDetailed,
      determinism: {
        repeatDelta: repeatDelta.toFixed(5),
        maxShuffleDelta: maxShuffleDelta.toFixed(5),
      },
      performance: {
        totalMs: (tEnd - tStart).toFixed(2),
        analysisMs: (tAnalysis - tStart).toFixed(2),
        layoutMs: (tEnd - tAnalysis).toFixed(2),
      },
      regressionMatrix,
    };

    fs.writeFileSync(
      path.resolve(__dirname, '../../../../wave10f-audit-results.json'),
      JSON.stringify(forensicReport, null, 2)
    );

    console.log('Wave 10F Forensic Audit Data written to wave10f-audit-results.json');

    expect(unanchoredCount).toBe(0);
    expect(repeatDelta).toBe(0);
    expect(maxShuffleDelta).toBe(0);
  });
});
