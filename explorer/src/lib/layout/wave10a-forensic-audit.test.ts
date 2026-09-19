import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification } from './analysis';
import { classifyNodeLayerWithReason } from './layers';
import { discoverDomains } from './domains';
import { computeGlobalDomainLayout } from './global-layout';
import { reduceEdgeCrossings } from './ordering';
import { computeLocalNodeLayout } from './local-layout';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from './centrality';
import { placeSatellites } from './satellites';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from './components';
import { resolveSpacingAndCollisions } from './spacing';
import { computeArchitectureLayout } from '../architecture-layout';
import { evaluateLayout } from './evaluate-layout';

const FIXTURE_PATH = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');

function loadFixture(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  if (!fs.existsSync(FIXTURE_PATH)) {
    throw new Error(`AUDIT BLOCKED: Cloud Spend Tracker fixture could not be made available at: ${FIXTURE_PATH}`);
  }
  const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { nodes: data.nodes || [], edges: data.edges || [] };
}

describe('Wave 10A Cloud Spend Tracker Read-Only Forensic Audit', () => {
  it('1. Verifies Input Data Integrity', () => {
    const { nodes, edges } = loadFixture();
    console.log(`Fixture Path: ${FIXTURE_PATH}`);
    console.log(`Expected nodes: 240 | Observed nodes: ${nodes.length}`);
    console.log(`Expected edges: 1024 | Observed edges: ${edges.length}`);

    expect(nodes.length).toBe(240);
    expect(edges.length).toBe(1024);

    const typeCounts: Record<string, number> = {};
    nodes.forEach(n => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });
    console.log('Node types distribution:', JSON.stringify(typeCounts, null, 2));
  });

  it('2-17. Comprehensive Read-Only Forensic Audit', () => {
    const { nodes, edges } = loadFixture();
    const nodeWidth = 120;
    const nodeHeight = 60;
    const layerSpacing = 250;
    const domainSpacing = 380;
    const componentGap = 100;

    const safeNodes = [...nodes];
    const safeEdges = [...edges];
    safeNodes.sort((a, b) => a.id.localeCompare(b.id));
    safeEdges.sort((a, b) => a.id.localeCompare(b.id));

    // Measure Performance
    const t0 = performance.now();

    // Step 1: Base Analysis
    let analysis = computeArchitectureAnalysis(safeNodes, safeEdges);
    const t1 = performance.now();

    // Step 2: Layer Classification
    const layerMap = new Map<string, any>();
    safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
    analysis = applyLayerClassification(analysis, layerMap);

    // Step 3: Domain Discovery
    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) => domainMap.set(nodeId, assignment.primaryDomain));
    analysis = applyDomainClassification(analysis, domainMap);

    // Step 4: Centrality
    const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap);

    // Step 5: Global Domain Architecture Layout
    const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
      domainSpacing, layerSpacing, nodeWidth, nodeHeight, analysis, domainDiscovery, layerMap, domainMap
    });

    // Step 6: Layer Ordering
    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes, edges: safeEdges, layerMap, domainMap, domainOrder: globalDomainResult.orderedDomains
    });

    // Step 7: Local Node Layout
    const localResult = computeLocalNodeLayout({
      nodes: safeNodes, edges: safeEdges, analysis, domainRegions: globalDomainResult.domainRegions,
      layerMap, domainMap, bucketOrder: orderingResult.bucketOrder,
      options: { nodeWidth, nodeHeight, domainSpacing, layerYMap: globalDomainResult.layerYMap }
    });

    const basePositionsStage7: Record<string, { x: number; y: number }> = { ...localResult.primaryNodePositions };

    // Step 8: Bridge Placement
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

    // Step 9: Satellite Placement
    const satelliteResult = placeSatellites(safeNodes, safeEdges, analysis, basePositionsStage8, {
      nodeWidth, nodeHeight, layerSpacing, layerYOffsets: globalDomainResult.layerYMap
    });
    const basePositionsStage9 = { ...satelliteResult.positions };

    // Step 10: Component Packing
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

    // Step 11: Final Spacing Cleanup
    const finalCleanupResult = resolveSpacingAndCollisions({
      nodes: safeNodes, edges: safeEdges, positions: basePositionsStage10, analysis,
      options: { nodeWidth, nodeHeight, layerMap, domainMap }
    });
    const basePositionsStage11 = finalCleanupResult.positions;

    const t2 = performance.now();

    // Evaluate final metrics
    const evaluatedMetrics = evaluateLayout(safeNodes, safeEdges, basePositionsStage11);
    const t3 = performance.now();

    console.log(`Performance Timings:`);
    console.log(`  Analysis: ${(t1 - t0).toFixed(2)}ms`);
    console.log(`  Layout: ${(t2 - t1).toFixed(2)}ms`);
    console.log(`  Evaluation: ${(t3 - t2).toFixed(2)}ms`);
    console.log(`  Total: ${(t3 - t0).toFixed(2)}ms`);

    // --- DOMAIN INVENTORY & GEOMETRY INVESTIGATION ---
    const nodeMap = new Map<string, ExplorerNode>(safeNodes.map(n => [n.id, n]));
    const domainInventory: any[] = [];
    const domainComparison: any[] = [];

    // Map component for each nodeId
    const nodeToComponentMap = new Map<string, string>();
    analysis.components.forEach(comp => {
      comp.nodeIds.forEach(nId => nodeToComponentMap.set(nId, comp.componentId));
    });

    globalDomainResult.domainRegions.forEach((region, domain) => {
      const domainNodes = safeNodes.filter(n => domainMap.get(n.id) === domain);
      const primaryNodes = domainNodes.filter(n => {
        const c = centralityMap.get(n.id);
        return !c?.isBridge && !n.behavior?.isTest && n.type !== 'CustomField';
      });
      const secondaryNodes = domainNodes.filter(n => !primaryNodes.includes(n));

      const layersRepresented = Array.from(new Set(domainNodes.map(n => layerMap.get(n.id)))).sort();
      const compIds = Array.from(new Set(domainNodes.map(n => nodeToComponentMap.get(n.id) || 'unknown'))).sort();

      // Bounding box from final positions
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      domainNodes.forEach(n => {
        const p = basePositionsStage11[n.id];
        if (p) {
          minX = Math.min(minX, p.x - nodeWidth/2);
          maxX = Math.max(maxX, p.x + nodeWidth/2);
          minY = Math.min(minY, p.y - nodeHeight/2);
          maxY = Math.max(maxY, p.y + nodeHeight/2);
        }
      });
      const finalWidth = minX !== Infinity ? maxX - minX : 0;
      const finalHeight = minY !== Infinity ? maxY - minY : 0;
      const centerX = minX !== Infinity ? (minX + maxX) / 2 : 0;
      const centerY = minY !== Infinity ? (minY + maxY) / 2 : 0;

      // Edges metrics
      let internalEdges = 0;
      let incomingEdges = 0;
      let outgoingEdges = 0;

      safeEdges.forEach(e => {
        const srcDomain = domainMap.get(e.source);
        const tgtDomain = domainMap.get(e.target);
        if (srcDomain === domain && tgtDomain === domain) {
          internalEdges++;
        } else if (tgtDomain === domain && srcDomain !== domain) {
          incomingEdges++;
        } else if (srcDomain === domain && tgtDomain !== domain) {
          outgoingEdges++;
        }
      });

      domainInventory.push({
        domainId: domain,
        totalNodes: domainNodes.length,
        primaryNodes: primaryNodes.length,
        secondaryNodes: secondaryNodes.length,
        layers: layersRepresented.join(','),
        components: compIds.join(','),
        bbox: minX !== Infinity ? `[${minX.toFixed(0)}, ${minY.toFixed(0)}, ${maxX.toFixed(0)}, ${maxY.toFixed(0)}]` : 'N/A',
        width: finalWidth,
        height: finalHeight,
        center: `(${centerX.toFixed(0)}, ${centerY.toFixed(0)})`,
        internalEdges,
        incomingEdges,
        outgoingEdges,
      });

      // Global vs Local Primary comparison
      let pMinX = Infinity, pMaxX = -Infinity;
      primaryNodes.forEach(n => {
        const p = localResult.primaryNodePositions[n.id];
        if (p) {
          pMinX = Math.min(pMinX, p.x - nodeWidth/2);
          pMaxX = Math.max(pMaxX, p.x + nodeWidth/2);
        }
      });
      const actualPrimaryWidth = pMinX !== Infinity ? pMaxX - pMinX : 0;
      const globalEstimatedWidth = region.width;

      domainComparison.push({
        domain,
        globalEstimatedWidth,
        actualPrimaryWidth,
        diffWidth: globalEstimatedWidth - actualPrimaryWidth,
        primaryNodeCount: region.primaryNodeCount,
        regionXMin: region.xMin,
        regionXMax: region.xMax,
      });
    });

    // --- 1D DOMAIN CHAINING INVESTIGATION ---
    const domainRegionsArray = Array.from(globalDomainResult.domainRegions.entries()).map(([d, r]) => ({ domain: d, ...r }));
    domainRegionsArray.sort((a, b) => a.xMin - b.xMin);

    const totalHorizontalSpan = domainRegionsArray.length > 0 ? domainRegionsArray[domainRegionsArray.length - 1].xMax - domainRegionsArray[0].xMin : 0;

    const domainGaps: number[] = [];
    for (let i = 0; i < domainRegionsArray.length - 1; i++) {
      const gap = domainRegionsArray[i+1].xMin - domainRegionsArray[i].xMax;
      domainGaps.push(gap);
    }
    domainGaps.sort((a, b) => a - b);

    const medianGap = domainGaps.length > 0 ? domainGaps[Math.floor(domainGaps.length * 0.5)] : 0;
    const p95Gap = domainGaps.length > 0 ? domainGaps[Math.floor(domainGaps.length * 0.95)] : 0;
    const maxGap = domainGaps.length > 0 ? domainGaps[domainGaps.length - 1] : 0;

    // --- EDGE CROSSINGS BREAKDOWN ---
    function doIntersect(p1: any, q1: any, p2: any, q2: any): boolean {
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

    let intraDomainCrossings = 0;
    let interDomainCrossings = 0;
    let interLayerCrossings = 0;
    let bridgeCrossings = 0;
    let satelliteCrossings = 0;

    const domainPairCrossings: Record<string, number> = {};

    const edgeList = safeEdges.map(e => ({
      ...e,
      srcPos: basePositionsStage11[e.source],
      tgtPos: basePositionsStage11[e.target],
      srcDomain: domainMap.get(e.source),
      tgtDomain: domainMap.get(e.target),
      srcLayer: layerMap.get(e.source),
      tgtLayer: layerMap.get(e.target),
      isSrcBridge: centralityMap.get(e.source)?.isBridge,
      isTgtBridge: centralityMap.get(e.target)?.isBridge,
      isSrcSatellite: nodeMap.get(e.source)?.behavior?.isTest || nodeMap.get(e.source)?.type === 'CustomField',
      isTgtSatellite: nodeMap.get(e.target)?.behavior?.isTest || nodeMap.get(e.target)?.type === 'CustomField',
    })).filter(e => e.srcPos && e.tgtPos);

    let totalCrossings = 0;
    for (let i = 0; i < edgeList.length; i++) {
      for (let j = i + 1; j < edgeList.length; j++) {
        const e1 = edgeList[i];
        const e2 = edgeList[j];

        if (e1.source === e2.source || e1.source === e2.target || e1.target === e2.source || e1.target === e2.target) continue;

        if (doIntersect(e1.srcPos, e1.tgtPos, e2.srcPos, e2.tgtPos)) {
          totalCrossings++;

          const isE1Intra = e1.srcDomain === e1.tgtDomain;
          const isE2Intra = e2.srcDomain === e2.tgtDomain;

          if (isE1Intra && isE2Intra && e1.srcDomain === e2.srcDomain) {
            intraDomainCrossings++;
          } else {
            interDomainCrossings++;
            const pairKey = [e1.srcDomain, e1.tgtDomain, e2.srcDomain, e2.tgtDomain].filter(Boolean).sort().join(' <-> ');
            domainPairCrossings[pairKey] = (domainPairCrossings[pairKey] || 0) + 1;
          }

          if (e1.srcLayer !== e1.tgtLayer || e2.srcLayer !== e2.tgtLayer) {
            interLayerCrossings++;
          }
          if (e1.isSrcBridge || e1.isTgtBridge || e2.isSrcBridge || e2.isTgtBridge) {
            bridgeCrossings++;
          }
          if (e1.isSrcSatellite || e1.isTgtSatellite || e2.isSrcSatellite || e2.isTgtSatellite) {
            satelliteCrossings++;
          }
        }
      }
    }

    // --- LONG EDGES INVESTIGATION ---
    const edgeLengths = edgeList.map(e => {
      const dx = e.srcPos.x - e.tgtPos.x;
      const dy = e.srcPos.y - e.tgtPos.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      return { ...e, len };
    });
    edgeLengths.sort((a, b) => b.len - a.len);

    const top20LongestEdges = edgeLengths.slice(0, 20).map(e => ({
      source: e.source,
      target: e.target,
      sourceDomain: e.srcDomain,
      targetDomain: e.tgtDomain,
      sourceLayer: e.srcLayer,
      targetLayer: e.tgtLayer,
      edgeType: e.type,
      length: e.len.toFixed(1)
    }));

    // --- COMPONENT PACKING INVESTIGATION ---
    const componentInventory: any[] = [];
    const compBoundsList: { compId: string; width: number; height: number; minX: number; maxX: number; minY: number; maxY: number }[] = [];

    analysis.components.forEach(comp => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let nodeCount = 0;
      comp.nodeIds.forEach(nId => {
        const p = basePositionsStage11[nId];
        if (p) {
          nodeCount++;
          minX = Math.min(minX, p.x - nodeWidth/2);
          maxX = Math.max(maxX, p.x + nodeWidth/2);
          minY = Math.min(minY, p.y - nodeHeight/2);
          maxY = Math.max(maxY, p.y + nodeHeight/2);
        }
      });
      const w = minX !== Infinity ? maxX - minX : 0;
      const h = minY !== Infinity ? maxY - minY : 0;
      const cx = minX !== Infinity ? (minX + maxX)/2 : 0;
      const cy = minY !== Infinity ? (minY + maxY)/2 : 0;

      const compNodeSet = new Set(comp.nodeIds);
      const compEdges = safeEdges.filter(e => compNodeSet.has(e.source) && compNodeSet.has(e.target)).length;

      componentInventory.push({
        componentId: comp.componentId,
        nodeCount,
        edgeCount: compEdges,
        bbox: `[${minX.toFixed(0)}, ${minY.toFixed(0)}, ${maxX.toFixed(0)}, ${maxY.toFixed(0)}]`,
        width: w,
        height: h,
        center: `(${cx.toFixed(0)}, ${cy.toFixed(0)})`
      });

      compBoundsList.push({ compId: comp.componentId, width: w, height: h, minX, maxX, minY, maxY });
    });

    const componentGaps: number[] = [];
    for (let i = 0; i < compBoundsList.length; i++) {
      for (let j = i + 1; j < compBoundsList.length; j++) {
        const c1 = compBoundsList[i];
        const c2 = compBoundsList[j];
        const dx = Math.max(0, Math.max(c1.minX - c2.maxX, c2.minX - c1.maxX));
        const dy = Math.max(0, Math.max(c1.minY - c2.maxY, c2.minY - c1.maxY));
        const gap = Math.sqrt(dx * dx + dy * dy);
        componentGaps.push(gap);
      }
    }
    componentGaps.sort((a, b) => a - b);

    // --- SATELLITES INVESTIGATION ---
    const satelliteDistances: { id: string; type: string; anchorId: string; distance: number }[] = [];
    safeNodes.forEach(node => {
      const isTest = node.behavior?.isTest;
      const isField = node.type === 'CustomField';
      if (isTest || isField) {
        const anchorEdges = safeEdges.filter(e => e.source === node.id || e.target === node.id);
        if (anchorEdges.length > 0) {
          const firstEdge = anchorEdges[0];
          const anchorId = firstEdge.source === node.id ? firstEdge.target : firstEdge.source;
          const pos = basePositionsStage11[node.id];
          const anchorPos = basePositionsStage11[anchorId];
          if (pos && anchorPos) {
            const dist = Math.sqrt((pos.x - anchorPos.x)**2 + (pos.y - anchorPos.y)**2);
            satelliteDistances.push({
              id: node.id,
              type: node.type,
              anchorId,
              distance: dist
            });
          }
        }
      }
    });

    satelliteDistances.sort((a, b) => a.distance - b.distance);
    const satDists = satelliteDistances.map(s => s.distance);
    const satMedian = satDists.length > 0 ? satDists[Math.floor(satDists.length * 0.5)] : 0;
    const satP90 = satDists.length > 0 ? satDists[Math.floor(satDists.length * 0.9)] : 0;
    const satP95 = satDists.length > 0 ? satDists[Math.floor(satDists.length * 0.95)] : 0;
    const satMax = satDists.length > 0 ? satDists[satDists.length - 1] : 0;

    // --- DETERMINISM AUDIT ---
    const posRun1 = computeArchitectureLayout(safeNodes, safeEdges);
    const posRun2 = computeArchitectureLayout(safeNodes, safeEdges);

    let maxDeltaRun1Run2 = 0;
    safeNodes.forEach(n => {
      const p1 = posRun1[n.id];
      const p2 = posRun2[n.id];
      if (p1 && p2) {
        const d = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
        maxDeltaRun1Run2 = Math.max(maxDeltaRun1Run2, d);
      }
    });

    function shuffle<T>(array: T[], seed: number): T[] {
      const arr = [...array];
      let m = arr.length;
      let t: T, i: number, s = seed;
      while (m) {
        s = (s * 9301 + 49297) % 233280;
        i = Math.floor((s / 233280) * m--);
        t = arr[m]; arr[m] = arr[i]; arr[i] = t;
      }
      return arr;
    }

    let maxShuffleDelta = 0;
    let shuffleChangedNodes = 0;
    for (let sRun = 1; sRun <= 5; sRun++) {
      const shufNodes = shuffle(safeNodes, sRun * 100 + 7);
      const shufEdges = shuffle(safeEdges, sRun * 200 + 13);
      const shufPos = computeArchitectureLayout(shufNodes, shufEdges);

      safeNodes.forEach(n => {
        const pBase = posRun1[n.id];
        const pShuf = shufPos[n.id];
        if (pBase && pShuf) {
          const d = Math.sqrt((pBase.x - pShuf.x)**2 + (pBase.y - pShuf.y)**2);
          if (d > 1e-5) shuffleChangedNodes++;
          maxShuffleDelta = Math.max(maxShuffleDelta, d);
        }
      });
    }

    // SAVE DETAILED AUDIT RESULTS
    const fullAuditReport = {
      performance: {
        analysisTimeMs: (t1 - t0).toFixed(2),
        layoutTimeMs: (t2 - t1).toFixed(2),
        evaluationTimeMs: (t3 - t2).toFixed(2),
        totalTimeMs: (t3 - t0).toFixed(2)
      },
      domainAnalysis: {
        totalDomains: domainInventory.length,
        domainInventory,
        domainComparison,
        domain1DChaining: {
          totalHorizontalSpan,
          orderedDomainCount: domainRegionsArray.length,
          row0DomainCount: domainRegionsArray.length,
          medianGap,
          p95Gap,
          maxGap
        }
      },
      edgeCrossings: {
        totalCrossings,
        intraDomainCrossings,
        interDomainCrossings,
        interLayerCrossings,
        bridgeCrossings,
        satelliteCrossings,
        topDomainPairs: Object.entries(domainPairCrossings).sort((a,b) => b[1] - a[1]).slice(0, 10)
      },
      longEdges: {
        median: edgeLengths[Math.floor(edgeLengths.length * 0.5)]?.len.toFixed(1),
        p90: edgeLengths[Math.floor(edgeLengths.length * 0.9)]?.len.toFixed(1),
        p95: edgeLengths[Math.floor(edgeLengths.length * 0.95)]?.len.toFixed(1),
        p99: edgeLengths[Math.floor(edgeLengths.length * 0.99)]?.len.toFixed(1),
        max: edgeLengths[0]?.len.toFixed(1),
        top20LongestEdges
      },
      componentPacking: {
        componentCount: componentInventory.length,
        componentInventory,
        minGap: componentGaps[0],
        medianGap: componentGaps[Math.floor(componentGaps.length * 0.5)],
        p95Gap: componentGaps[Math.floor(componentGaps.length * 0.95)]
      },
      satellites: {
        count: satelliteDistances.length,
        medianDistance: satMedian,
        p90Distance: satP90,
        p95Distance: satP95,
        maxDistance: satMax,
        outliers: satelliteDistances.slice(-10)
      },
      determinism: {
        maxDeltaRun1Run2,
        maxShuffleDelta,
        shuffleChangedNodes
      }
    };

    fs.writeFileSync(path.resolve(__dirname, '../../../../wave10a-full-audit-report.json'), JSON.stringify(fullAuditReport, null, 2));
    console.log(`Full Audit Report Written to wave10a-full-audit-report.json`);
  });
});
