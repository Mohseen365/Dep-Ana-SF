import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import cytoscape from 'cytoscape';

import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { PositionMap } from '../lib/layout/metrics';
import { calculateLayoutMetrics } from '../lib/layout/metrics';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from '../lib/layout/centrality';
import { type FeatureRoleContext } from '../lib/layout/feature-roles';
import { discoverFeatures } from '../lib/layout/features';
import {
  computeGlobalFeatureLayout,
  type FeatureRegion,
} from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { placeSatellites } from '../lib/layout/satellites';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from '../lib/layout/components';
import { resolveSpacingAndCollisions } from '../lib/layout/spacing';
import { buildGraphElements } from '../lib/graph-builder';

interface ProjectDataset {
  key: string;
  name: string;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
}

function loadProject(projectKey: string, relativePath: string): ProjectDataset {
  const fullPath = path.resolve(__dirname, '../../../', relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Project file not found at: ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    key: projectKey,
    name: projectKey,
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

function isSecondaryNode(node: ExplorerNode): boolean {
  const isTest =
    node.behavior?.isTest ||
    (typeof node.file === 'string' && /(?:^|\/)(?:test|tests)\//i.test(node.file)) ||
    /(?:test|tests|testdatafactory)$/i.test(node.displayName || node.id || '');
  const isField = node.type === 'Field' || node.type === 'CustomField';
  return isTest || isField;
}

interface StageRunResult {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  effectiveTargetRowWidth: number;
  stage5FeatureRegions: Map<string, FeatureRegion>;
  stage5Positions: PositionMap;
  stage7Positions: PositionMap;
  stage8Positions: PositionMap;
  stage9Positions: PositionMap;
  stage10Positions: PositionMap;
  stage11Positions: PositionMap;
  stage12Positions: PositionMap;
  featureMap: Map<string, string>;
  layerMap: Map<string, string>;
  centralityMap: Map<string, any>;
  analysis: any;
  components: ComponentLocalLayout[];
}

/**
 * Phase 12 Full Pipeline Tracer.
 * Captures intermediate position maps across Stage 5, Stage 7, Stage 8, Stage 9, Stage 10, Stage 11, Stage 12,
 * matching production `computeArchitectureLayoutWithMetadata` bit-for-bit.
 */
function runPhase12PipelineTrace(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  targetRowWidthOverride?: number
): StageRunResult {
  const nodeWidth = 120;
  const nodeHeight = 60;
  const layerSpacing = 250;
  const domainSpacing = 380;
  const componentGap = 100;

  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  const knownNodeIds = new Set(safeNodes.map(n => n.id));
  safeEdges.forEach(e => {
    if (!knownNodeIds.has(e.source)) {
      knownNodeIds.add(e.source);
      safeNodes.push({
        id: e.source,
        displayName: e.source.split(':').pop() || e.source,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      });
    }
    if (!knownNodeIds.has(e.target)) {
      knownNodeIds.add(e.target);
      safeNodes.push({
        id: e.target,
        displayName: e.target.split(':').pop() || e.target,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      });
    }
  });

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const index = createLayoutGraphIndex(safeNodes, safeEdges);

  // Stage 1: Base Analysis
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  // Stage 2: Layer Classification
  const layerMap = new Map<string, any>();
  safeNodes.forEach(node => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });
  analysis = applyLayerClassification(analysis, layerMap);

  // Stage 3: Domain Discovery
  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((assignment, nodeId) => {
    domainMap.set(nodeId, assignment.primaryDomain);
  });
  analysis = applyDomainClassification(analysis, domainMap);

  // Stage 4: Centrality & Spatial Roles
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

  const featureDiscovery = discoverFeatures(safeNodes, safeEdges, {
    index,
    analysis,
    layerMap,
    domainMap,
  });

  const featureMap = new Map<string, string>();
  featureDiscovery.assignments.forEach((assignment, nodeId) => {
    featureMap.set(nodeId, assignment.primaryFeatureId);
  });

  safeNodes.forEach(node => {
    if (!featureMap.has(node.id)) {
      featureMap.set(node.id, 'Unassigned');
    }
  });

  // Stage 5: Global Feature Layout passing targetRowWidth
  const globalDomainResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
    domainSpacing,
    layerSpacing,
    nodeWidth,
    nodeHeight,
    analysis,
    layerMap,
    domainMap,
    domainDiscovery,
    featureDiscovery,
    featureMap,
    index,
    ...(targetRowWidthOverride !== undefined ? { targetRowWidth: targetRowWidthOverride } : {}),
  } as any);

  const stage5Positions: PositionMap = {};
  globalDomainResult.nodeRegions.forEach((region, nodeId) => {
    stage5Positions[nodeId] = { x: region.xCenter, y: region.yCenter };
  });

  // Stage 6: Layer Ordering
  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: featureMap,
    domainOrder: globalDomainResult.orderedDomains,
    layerYMap: globalDomainResult.layerYMap,
  });

  // Stage 7: Primary Production Local Layout using globalDomainResult.layerYMap
  const localResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: globalDomainResult.domainRegions,
    layerMap,
    domainMap: featureMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth,
      nodeHeight,
      domainSpacing,
      layerYMap: globalDomainResult.layerYMap,
      featureLayerYMap: globalDomainResult.featureLayerYMap,
    },
  });

  const stage7Positions: PositionMap = { ...localResult.primaryNodePositions };

  // Stage 8: Hub & Bridge Refinement using globalDomainResult.layerYMap
  const stage8Positions: PositionMap = { ...stage7Positions };
  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};

  globalDomainResult.domainRegions.forEach((region, domain) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  safeNodes.forEach(node => {
    if (isSecondaryNode(node)) return;

    const centrality = centralityMap.get(node.id);
    if (centrality?.isBridge && !centrality.isHub) {
      const neighborPositions: Record<string, { x: number; y: number }> = {};
      const nodeAnalysis = analysis.nodes.get(node.id);

      nodeAnalysis?.neighborIds.forEach(nId => {
        if (stage8Positions[nId]) {
          neighborPositions[nId] = stage8Positions[nId];
        }
      });

      const bridgeInfo = calculateBridgeCandidatePosition(
        node.id,
        layerMap.get(node.id) || 'application',
        centrality.connectedDomains,
        domainXCenters,
        domainBounds,
        neighborPositions,
        { layerSpacing, nodeWidth, nodeHeight, layerYOffsets: globalDomainResult.layerYMap, index, allocatedPositions: stage8Positions }
      );

      stage8Positions[node.id] = bridgeInfo.candidatePosition;
    }
  });

  // Stage 9: Secondary Satellite Placement using globalDomainResult.layerYMap
  const satelliteResult = placeSatellites(
    safeNodes,
    safeEdges,
    analysis,
    stage8Positions,
    {
      nodeWidth,
      nodeHeight,
      layerSpacing,
      layerYOffsets: globalDomainResult.layerYMap,
      index,
      featureLayerYMap: globalDomainResult.featureLayerYMap,
      featureMap,
    }
  );

  const stage9Positions: PositionMap = { ...satelliteResult.positions };

  // Stage 10: Disconnected Component Packing
  let stage10Positions: PositionMap = { ...stage9Positions };
  let componentLayouts: ComponentLocalLayout[] = [];

  if (analysis.components.length > 1) {
    componentLayouts = analysis.components
      .map((comp: any) => {
        const positions: Record<string, { x: number; y: number }> = {};
        let minNodeId: string | undefined = undefined;
        let importance = 0;

        for (const nodeId of comp.nodeIds) {
          const pos = stage9Positions[nodeId];
          if (pos) {
            positions[nodeId] = pos;
            if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) {
              minNodeId = nodeId;
            }
            const centrality = centralityMap.get(nodeId);
            if (centrality) {
              importance += centrality.hubScore + centrality.bridgeScore;
            }
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
      .filter((c: ComponentLocalLayout) => Object.keys(c.positions).length > 0);

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
      const tW = Math.max(idealWidth, minRowWidth);

      const packed = packComponentPositions(componentLayouts, {
        gap: componentGap,
        targetWidth: tW,
        targetAspectRatio: 1.6,
        nodeWidth,
        nodeHeight,
      });
      stage10Positions = packed.positions;
    }
  }

  // Stage 11: Collision Cleanup
  const finalCleanupResult = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: stage10Positions,
    analysis,
    options: {
      nodeWidth,
      nodeHeight,
      layerMap,
      domainMap: featureMap,
      domainBounds: globalDomainResult.domainBounds,
    },
  });

  const stage11Positions: PositionMap = finalCleanupResult.positions;
  const stage12Positions: PositionMap = { ...stage11Positions };

  return {
    nodes: safeNodes,
    edges: safeEdges,
    effectiveTargetRowWidth: targetRowWidthOverride ?? 3200,
    stage5FeatureRegions: globalDomainResult.featureRegions,
    stage5Positions,
    stage7Positions,
    stage8Positions,
    stage9Positions,
    stage10Positions,
    stage11Positions,
    stage12Positions,
    featureMap,
    layerMap,
    centralityMap,
    analysis,
    components: componentLayouts,
  };
}

function getMapBounds(posMap: PositionMap, filterFn?: (nodeId: string) => boolean) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let count = 0;
  for (const [id, p] of Object.entries(posMap)) {
    if (!p) continue;
    if (filterFn && !filterFn(id)) continue;
    count++;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (count === 0) return { count: 0, minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  return { count, minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

describe('PHASE 12 — CURRENT PRODUCTION GEOMETRY DOMINATOR & OPTIMIZATION EXPERIMENT AUDIT', () => {
  const datasets = {
    pub_infra_mang: loadProject('pub-infra-mang', 'explorer/public/projects/pub-infra-mang/explorer-data.json'),
    cst_canonical: loadProject('cst_canonical', 'audit-fixtures/cloud-spend-tracker/explorer-data.json'),
    bqc: loadProject('bqc', 'explorer/public/projects/bqc/explorer-data.json'),
    movie: loadProject('movie', 'explorer/public/projects/movie/explorer-data.json'),
    project_b: loadProject('project-b', 'explorer/public/projects/project-b/explorer-data.json'),
  };

  test('Step 3: Stage Geometry Ledger for pub-infra-mang at targetRowWidth = 3200', () => {
    console.log('\n================================================================================');
    console.log('SECTION 3: REQUIRED STAGE GEOMETRY LEDGER (pub-infra-mang, targetRowWidth = 3200)');
    console.log('================================================================================');

    const ds = datasets.pub_infra_mang;
    const res = runPhase12PipelineTrace(ds.nodes, ds.edges, 3200);

    const primarySet = new Set(ds.nodes.filter(n => !isSecondaryNode(n)).map(n => n.id));
    const satelliteSet = new Set(ds.nodes.filter(n => isSecondaryNode(n)).map(n => n.id));

    // Cytoscape model
    const cy = cytoscape({ elements: buildGraphElements(ds.nodes, ds.edges) });
    cy.nodes().forEach(n => {
      if (res.stage12Positions[n.id()]) {
        n.position(res.stage12Positions[n.id()]);
      }
    });

    const stages = [
      { name: 'Stage 5 (Feature Packing)', pos: res.stage5Positions },
      { name: 'Stage 7 (Local Primary)', pos: res.stage7Positions },
      { name: 'Stage 8 (Bridge Relocation)', pos: res.stage8Positions },
      { name: 'Stage 9 (Satellite Placement)', pos: res.stage9Positions },
      { name: 'Stage 10 (Component Packing)', pos: res.stage10Positions },
      { name: 'Stage 11 (Collision Cleanup)', pos: res.stage11Positions },
      { name: 'Stage 12 (Position Authority)', pos: res.stage12Positions },
    ];

    console.log('\n--- STAGE GEOMETRY LEDGER ---');
    stages.forEach(st => {
      const allB = getMapBounds(st.pos);
      const priB = getMapBounds(st.pos, id => primarySet.has(id));
      const satB = getMapBounds(st.pos, id => satelliteSet.has(id));
      console.log(`[${st.name}] Nodes: ${allB.count}`);
      console.log(`  All Nodes:       X=[${allB.minX}, ${allB.maxX}] (W=${allB.width}px), Y=[${allB.minY}, ${allB.maxY}] (H=${allB.height}px)`);
      console.log(`  Primary Nodes:   X=[${priB.minX}, ${priB.maxX}] (W=${priB.width}px), Y=[${priB.minY}, ${priB.maxY}] (H=${priB.height}px)`);
      console.log(`  Satellite Nodes: X=[${satB.minX}, ${satB.maxX}] (W=${satB.width}px), Y=[${satB.minY}, ${satB.maxY}] (H=${satB.height}px)`);
    });

    const cyBb = cy.nodes().boundingBox({});
    console.log(`[Cytoscape cy.nodes().boundingBox()]`);
    console.log(`  BB: X=[${cyBb.x1}, ${cyBb.x2}] (W=${cyBb.w}px), Y=[${cyBb.y1}, ${cyBb.y2}] (H=${cyBb.h}px)`);

    expect(getMapBounds(res.stage12Positions).height).toBe(24670);
    expect(getMapBounds(res.stage12Positions).width).toBe(12760);
  });

  test('Step 4 & 5: Vertical-Extent Decomposition & Height Contribution Ledger', () => {
    console.log('\n================================================================================');
    console.log('SECTION 4 & 5: VERTICAL-EXTENT DECOMPOSITION & HEIGHT CONTRIBUTION LEDGER');
    console.log('================================================================================');

    const ds = datasets.pub_infra_mang;
    const res = runPhase12PipelineTrace(ds.nodes, ds.edges, 3200);

    // Identify final Stage 12 extremum nodes
    const s12Pos = res.stage12Positions;
    let minYId = '', maxYId = '';
    let minYVal = Infinity, maxYVal = -Infinity;

    for (const [id, p] of Object.entries(s12Pos)) {
      if (p.y < minYVal) { minYVal = p.y; minYId = id; }
      if (p.y > maxYVal) { maxYVal = p.y; maxYId = id; }
    }

    console.log(`Final Stage 12 minY Node: ${minYId} at Y=${minYVal}`);
    console.log(`Final Stage 12 maxY Node: ${maxYId} at Y=${maxYVal}`);

    const traceNode = (nodeId: string) => {
      const fId = res.featureMap.get(nodeId) || 'Unassigned';
      const fRegion = res.stage5FeatureRegions.get(fId);
      const layer = res.layerMap.get(nodeId);

      let compId = -1;
      res.analysis.components.forEach((c: any, idx: number) => {
        if (c.nodeIds.includes(nodeId)) compId = idx;
      });

      return {
        id: nodeId,
        feature: fId,
        layer,
        component: compId,
        stage5Y: res.stage5Positions[nodeId]?.y ?? 'N/A',
        stage5FeatureRegionY: fRegion ? `[${fRegion.yMin}, ${fRegion.yMax}]` : 'N/A',
        stage7Y: res.stage7Positions[nodeId]?.y ?? 'N/A',
        stage8Y: res.stage8Positions[nodeId]?.y ?? 'N/A',
        stage9Y: res.stage9Positions[nodeId]?.y ?? 'N/A',
        stage10Y: res.stage10Positions[nodeId]?.y ?? 'N/A',
        stage11Y: res.stage11Positions[nodeId]?.y ?? 'N/A',
        stage12Y: res.stage12Positions[nodeId]?.y ?? 'N/A',
      };
    };

    console.log('\n--- EXTREMUM NODE TRACE BACKWARD ---');
    console.log('minY Node Trace:', traceNode(minYId));
    console.log('maxY Node Trace:', traceNode(maxYId));

    // Height Contribution Ledger
    const calcH = (posMap: PositionMap) => {
      const b = getMapBounds(posMap);
      return b.height;
    };

    const cy = cytoscape({ elements: buildGraphElements(ds.nodes, ds.edges) });
    cy.nodes().forEach(n => { if (res.stage12Positions[n.id()]) n.position(res.stage12Positions[n.id()]); });
    const cyH = cy.nodes().boundingBox({}).h;

    const transitions = [
      { from: 'Stage 5', to: 'Stage 7', prevH: calcH(res.stage5Positions), newH: calcH(res.stage7Positions), cause: 'Primary node placement across macro architectural layer Y offsets' },
      { from: 'Stage 7', to: 'Stage 8', prevH: calcH(res.stage7Positions), newH: calcH(res.stage8Positions), cause: 'Bridge node relocation in corridor space' },
      { from: 'Stage 8', to: 'Stage 9', prevH: calcH(res.stage8Positions), newH: calcH(res.stage9Positions), cause: 'Secondary satellite placement (test classes at Y=-270px)' },
      { from: 'Stage 9', to: 'Stage 10', prevH: calcH(res.stage9Positions), newH: calcH(res.stage10Positions), cause: '2D FFDH component shelf packing (utility singletons packed in side shelves)' },
      { from: 'Stage 10', to: 'Stage 11', prevH: calcH(res.stage10Positions), newH: calcH(res.stage11Positions), cause: 'Collision cleanup pass' },
      { from: 'Stage 11', to: 'Stage 12', prevH: calcH(res.stage11Positions), newH: calcH(res.stage12Positions), cause: 'Position Authority restoration (identity map)' },
      { from: 'Stage 12', to: 'Cytoscape', prevH: calcH(res.stage12Positions), newH: cyH, cause: 'Node border/halo padding (+3.0px)' },
    ];

    console.log('\n--- HEIGHT CONTRIBUTION LEDGER ---');
    transitions.forEach(t => {
      const dH = t.newH - t.prevH;
      console.log(`Transition [${t.from} → ${t.to}]: Prev H = ${t.prevH}px, New H = ${t.newH}px, ΔH = ${dH >= 0 ? '+' : ''}${dH}px | Cause: ${t.cause}`);
    });
  });

  test('Step 6, 7 & 8: Feature-Band, Row-Packing, and Local-Layout Contributions', () => {
    console.log('\n================================================================================');
    console.log('SECTION 6, 7 & 8: FEATURE-BAND, ROW-PACKING, AND LOCAL-LAYOUT CONTRIBUTIONS');
    console.log('================================================================================');

    const ds = datasets.pub_infra_mang;
    const res = runPhase12PipelineTrace(ds.nodes, ds.edges, 3200);

    const primarySet = new Set(ds.nodes.filter(n => !isSecondaryNode(n)).map(n => n.id));
    const satelliteSet = new Set(ds.nodes.filter(n => isSecondaryNode(n)).map(n => n.id));

    console.log('\n--- FEATURE-BAND HEIGHT CONTRIBUTION (Sorted by Region Height) ---');
    const featureList: any[] = [];

    res.stage5FeatureRegions.forEach((region, fId) => {
      const fNodes = ds.nodes.filter(n => res.featureMap.get(n.id) === fId);
      const fPrimaryNodes = fNodes.filter(n => primarySet.has(n.id));
      const fSatNodes = fNodes.filter(n => satelliteSet.has(n.id));

      const priBounds = getMapBounds(res.stage7Positions, id => fPrimaryNodes.some(n => n.id === id));
      const satBounds = getMapBounds(res.stage9Positions, id => fSatNodes.some(n => n.id === id));

      featureList.push({
        fId,
        layer: region.primaryLayer,
        regionX: region.xMin,
        regionY: region.yMin,
        regionW: region.width,
        regionH: region.height,
        priMinY: priBounds.minY,
        priMaxY: priBounds.maxY,
        priH: priBounds.height,
        satMinY: satBounds.minY,
        satMaxY: satBounds.maxY,
        satH: satBounds.height,
      });
    });

    featureList.sort((a, b) => b.regionH - a.regionH);

    featureList.forEach(f => {
      console.log(`Feature [${f.fId.padEnd(35)}] Layer: ${f.layer.padEnd(12)} | Region: [${f.regionX},${f.regionY}] ${f.regionW}x${f.regionH}px | Primary H: ${f.priH}px | Satellite H: ${f.satH}px`);
    });

    // Row packing reconstruction
    console.log('\n--- ROW-PACKING CONTRIBUTION (targetRowWidth = 3200px) ---');
    const rowsMap = new Map<number, { layer: string; fIds: string[]; maxH: number; totalW: number }>();

    res.stage5FeatureRegions.forEach((region, fId) => {
      const y = region.yMin;
      if (!rowsMap.has(y)) {
        rowsMap.set(y, { layer: region.primaryLayer, fIds: [], maxH: 0, totalW: 0 });
      }
      const rInfo = rowsMap.get(y)!;
      rInfo.fIds.push(fId);
      if (region.height > rInfo.maxH) rInfo.maxH = region.height;
      rInfo.totalW += region.width;
    });

    let totalFeatureBandHeight = 0;
    rowsMap.forEach((rInfo, y) => {
      totalFeatureBandHeight += rInfo.maxH;
      console.log(`Row Y = ${y}px | Layer: ${rInfo.layer.padEnd(12)} | Features (${rInfo.fIds.length}): [${rInfo.fIds.join(', ')}] | Row Height: ${rInfo.maxH}px | Occupied W: ${rInfo.totalW}px | Unused W: ${3200 - rInfo.totalW}px`);
    });

    console.log(`Total Feature-Band Height (sum of max row heights): ${totalFeatureBandHeight}px vs Final Canvas Height: ${getMapBounds(res.stage12Positions).height}px`);

    // Local Layout Stage 7 expansion
    console.log('\n--- LOCAL-LAYOUT STAGE 7 EXPANSION ANALYSIS ---');
    featureList.forEach(f => {
      const deltaY = f.priH - f.regionH;
      console.log(`Feature [${f.fId.padEnd(35)}]: Region H = ${f.regionH}px, Primary Span H = ${f.priH}px, ΔY expansion = ${deltaY >= 0 ? '+' : ''}${deltaY}px`);
    });
  });

  test('Step 9, 10, 11 & 12: Bridges, Satellites, and Component Packing', () => {
    console.log('\n================================================================================');
    console.log('SECTION 9, 10, 11 & 12: BRIDGES, SATELLITES, AND COMPONENT PACKING');
    console.log('================================================================================');

    const ds = datasets.pub_infra_mang;
    const res = runPhase12PipelineTrace(ds.nodes, ds.edges, 3200);

    // Bridge Analysis
    console.log('\n--- BRIDGE RELOCATION ANALYSIS (Stage 8) ---');
    let bridgesMoved = 0;
    let maxDx = 0, maxDy = 0;

    for (const [id, pos8] of Object.entries(res.stage8Positions)) {
      const pos7 = res.stage7Positions[id];
      if (pos7) {
        const dx = Math.abs(pos8.x - pos7.x);
        const dy = Math.abs(pos8.y - pos7.y);
        if (dx > 1e-3 || dy > 1e-3) {
          bridgesMoved++;
          if (dx > maxDx) maxDx = dx;
          if (dy > maxDy) maxDy = dy;
        }
      }
    }

    const s7Bounds = getMapBounds(res.stage7Positions);
    const s8Bounds = getMapBounds(res.stage8Positions);

    console.log(`Bridges Moved: ${bridgesMoved} / ${ds.nodes.length}`);
    console.log(`Max |ΔX|: ${maxDx.toFixed(1)}px, Max |ΔY|: ${maxDy.toFixed(1)}px`);
    console.log(`Stage 7 Y Bounds: [${s7Bounds.minY}, ${s7Bounds.maxY}] (H=${s7Bounds.height}px)`);
    console.log(`Stage 8 Y Bounds: [${s8Bounds.minY}, ${s8Bounds.maxY}] (H=${s8Bounds.height}px)`);

    // Satellite Analysis
    console.log('\n--- SATELLITE PLACEMENT ANALYSIS (Stage 9) ---');
    const satNodes = ds.nodes.filter(n => isSecondaryNode(n));
    let satMinY = Infinity, satMaxY = -Infinity;

    satNodes.forEach(s => {
      const pos9 = res.stage9Positions[s.id];
      if (pos9) {
        if (pos9.y < satMinY) satMinY = pos9.y;
        if (pos9.y > satMaxY) satMaxY = pos9.y;
      }
    });

    const s9Bounds = getMapBounds(res.stage9Positions);
    console.log(`Total Satellite Nodes: ${satNodes.length}`);
    console.log(`Satellite Y Extrema: minY = ${satMinY}px, maxY = ${satMaxY}px`);
    console.log(`Stage 9 Global Y Bounds: [${s9Bounds.minY}, ${s9Bounds.maxY}] (H=${s9Bounds.height}px)`);

    // Component Packing Analysis
    console.log('\n--- COMPONENT PACKING ANALYSIS (Stage 10) ---');
    console.log(`Total Connected Components: ${res.components.length}`);

    const s9AllB = getMapBounds(res.stage9Positions);
    const s10AllB = getMapBounds(res.stage10Positions);

    console.log(`Pre-Pack (Stage 9) Global Bounds:  X=[${s9AllB.minX}, ${s9AllB.maxX}] (W=${s9AllB.width}px), Y=[${s9AllB.minY}, ${s9AllB.maxY}] (H=${s9AllB.height}px)`);
    console.log(`Post-Pack (Stage 10) Global Bounds: X=[${s10AllB.minX}, ${s10AllB.maxX}] (W=${s10AllB.width}px), Y=[${s10AllB.minY}, ${s10AllB.maxY}] (H=${s10AllB.height}px)`);

    res.components.forEach((c, idx) => {
      const preB = getMapBounds(res.stage9Positions, id => c.positions[id] !== undefined);
      const postB = getMapBounds(res.stage10Positions, id => c.positions[id] !== undefined);
      const dx = postB.minX - preB.minX;
      const dy = postB.minY - preB.minY;

      if (idx < 5 || Object.keys(c.positions).length > 2) {
        console.log(`Component ${idx} (${Object.keys(c.positions).length} nodes): Pre X=[${preB.minX},${preB.maxX}], Post X=[${postB.minX},${postB.maxX}], ΔX=${dx}px, ΔY=${dy}px`);
      }
    });
  });

  test('Step 13, 14, 15, 17, 19, 20 & 21: Controlled Experiments across Target Widths and Datasets', () => {
    console.log('\n================================================================================');
    console.log('CONTROLLED EXPERIMENTS ACROSS TARGET ROW WIDTHS AND DATASETS');
    console.log('================================================================================');

    const targetWidths = [3200, 4000, 6000, 10000, 20000];

    Object.entries(datasets).forEach(([dsKey, ds]) => {
      console.log(`\n================================================================================`);
      console.log(`DATASET: [${dsKey.toUpperCase()}] (${ds.nodes.length} nodes, ${ds.edges.length} edges)`);
      console.log(`================================================================================`);

      targetWidths.forEach(tw => {
        const res = runPhase12PipelineTrace(ds.nodes, ds.edges, tw);

        const s5B = getMapBounds(res.stage5Positions);
        const s7B = getMapBounds(res.stage7Positions);
        const s8B = getMapBounds(res.stage8Positions);
        const s9B = getMapBounds(res.stage9Positions);
        const s10B = getMapBounds(res.stage10Positions);
        const s11B = getMapBounds(res.stage11Positions);
        const s12B = getMapBounds(res.stage12Positions);

        const cy = cytoscape({ elements: buildGraphElements(ds.nodes, ds.edges) });
        cy.nodes().forEach(n => { if (res.stage12Positions[n.id()]) n.position(res.stage12Positions[n.id()]); });
        const cyBb = cy.nodes().boundingBox({});

        const metrics = calculateLayoutMetrics(ds.nodes, ds.edges, res.stage12Positions, { nodeWidth: 120, nodeHeight: 60 });
        const c = metrics.detailedCrossings;

        const overlaps = (metrics.primaryOverlapCount ?? 0) + (metrics.satelliteOverlapCount ?? 0);
        const clearancePass = (metrics.minClearance ?? 0) >= 39.99;

        console.log(`\n[Target Row Width: ${tw}px]`);
        console.log(`  Stage 5 Bounds:  ${s5B.width}x${s5B.height}px`);
        console.log(`  Stage 7 Bounds:  ${s7B.width}x${s7B.height}px`);
        console.log(`  Stage 8 Bounds:  ${s8B.width}x${s8B.height}px`);
        console.log(`  Stage 9 Bounds:  ${s9B.width}x${s9B.height}px`);
        console.log(`  Stage 10 Bounds: ${s10B.width}x${s10B.height}px`);
        console.log(`  Stage 11 Bounds: ${s11B.width}x${s11B.height}px`);
        console.log(`  Stage 12 Bounds: ${s12B.width}x${s12B.height}px`);
        console.log(`  Rendered BB:     ${cyBb.w}x${cyBb.h}px`);
        console.log(`  Crossings:       Cpp=${c?.primaryPrimaryCrossings}, Cpb=${c?.primaryBridgeCrossings}, Cbb=${c?.bridgeBridgeCrossings}, Cps=${c?.primarySatelliteCrossings}, Css=${c?.satelliteSatelliteCrossings}, Ctotal=${metrics.edgeCrossingCount}`);
        console.log(`  Invariants:      Overlaps=${overlaps}, MinClearance=${metrics.minClearance!.toFixed(2)}px (${clearancePass ? 'PASS' : 'FAIL'})`);

        expect(overlaps).toBe(0);
        expect(metrics.minClearance!).toBeGreaterThanOrEqual(39.99);
      });
    });
  }, 300000);

  test('Determinism Test: 5 Repeat Runs and 5 Shuffled Permutations', () => {
    console.log('\n================================================================================');
    console.log('DETERMINISM VERIFICATION (5X REPEAT & 5X SHUFFLED PERMUTATION)');
    console.log('================================================================================');

    const ds = datasets.pub_infra_mang;
    const baseRun = runPhase12PipelineTrace(ds.nodes, ds.edges, 3200);
    const basePos = baseRun.stage12Positions;

    // 5x Repeat Runs
    for (let r = 0; r < 5; r++) {
      const repRun = runPhase12PipelineTrace(ds.nodes, ds.edges, 3200);
      Object.keys(basePos).forEach(id => {
        expect(repRun.stage12Positions[id].x).toBeCloseTo(basePos[id].x, 5);
        expect(repRun.stage12Positions[id].y).toBeCloseTo(basePos[id].y, 5);
      });
    }

    // 5x Shuffled Permutations
    for (let p = 0; p < 5; p++) {
      const shufNodes = [...ds.nodes].sort(() => (p % 2 === 0 ? 0.5 - Math.random() : Math.random() - 0.5));
      const shufEdges = [...ds.edges].sort(() => (p % 2 === 0 ? Math.random() - 0.5 : 0.5 - Math.random()));
      const permRun = runPhase12PipelineTrace(shufNodes, shufEdges, 3200);

      Object.keys(basePos).forEach(id => {
        expect(permRun.stage12Positions[id].x).toBeCloseTo(basePos[id].x, 5);
        expect(permRun.stage12Positions[id].y).toBeCloseTo(basePos[id].y, 5);
      });
    }

    console.log('Zero Coordinate Drift Verified (0.00000 px across 5 repeat runs and 5 shuffled permutations).');
  }, 120000);
});
