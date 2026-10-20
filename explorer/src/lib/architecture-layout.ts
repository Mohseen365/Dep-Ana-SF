import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureLayer } from './layout/types';
import { createLayoutGraphIndex } from './layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from './layout/analysis';
import { classifyNodeLayer, classifyNodeLayerWithReason, isTestNode } from './layout/layers';
import { discoverDomains, extractDomainStem } from './layout/domains';
import { classifyAllFeatureRoles, type FeatureRole, type FeatureRoleContext } from './layout/feature-roles';
import { discoverFeatures, type FeatureDiscoveryResult } from './layout/features';
import { computeGlobalDomainLayout, computeGlobalFeatureLayout, buildDomainGraph, type FeatureRegion } from './layout/global-layout';
import { reduceEdgeCrossings } from './layout/ordering';
import { computeLocalNodeLayout } from './layout/local-layout';
import {
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
} from './layout/centrality';
import { placeSatellites } from './layout/satellites';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from './layout/components';
import { resolveSpacingAndCollisions } from './layout/spacing';
import { computeOrbitLayout, type OrbitGuideMetadata } from './orbit-layout';
import { adaptComponentOrbit, type ComponentOrbitAdapterOptions } from './adapters/component-orbit-adapter';
import { computeComponentOrbitLayout } from './layout/component-orbit-layout';
import { adaptComponentConstellation, type ComponentConstellationAdapterOptions } from './adapters/component-constellation-adapter';
import { computeComponentConstellationLayout } from './layout/component-constellation-layout';
import { stableCompareStrings } from './layout/compare';
import type { ArchitectureLayoutMode } from '../types/explorer';

export interface ArchitectureLayoutOptions {
  /** Architecture Layout Mode: 'hierarchical' | 'hybrid' | 'orbit' | 'constellation' */
  architectureMode?: ArchitectureLayoutMode;
  /** Focal LWC node ID for Component Orbit layout */
  focalLwcId?: string | null;
  /** Component Orbit adapter options */
  componentOrbitOptions?: ComponentOrbitAdapterOptions;
  /** Component Constellation adapter options */
  componentConstellationOptions?: ComponentConstellationAdapterOptions;
  /** Width of nodes used for collision avoidance (default: 120) */
  nodeWidth?: number;
  /** Height of nodes used for collision avoidance (default: 60) */
  nodeHeight?: number;
  /** Vertical distance between architectural layer bands (default: 250) */
  layerSpacing?: number;
  /** Feature-local vertical layer spacing inside feature regions (default: 60) */
  featureLayerSpacing?: number;
  /** Horizontal distance between domain/subsystem clusters (default: 380) */
  domainSpacing?: number;
  /** Clearance gap between disconnected graph components (default: 100) */
  componentGap?: number;
  /** Map of existing authoritative positions to preserve for incremental layout */
  existingPositions?: Record<string, { x: number; y: number }>;
  /** Enables Feature-aware spatial layout (default: false) */
  enableFeatureLayout?: boolean;
  /** Maximum iterations for layer ordering passes */
  maxIterations?: number;
  /** Enables Stage 7 immutable primary occupancy checking in Stage 8 bridge placement (default: true for H5A, false for SB1C) */
  enableImmutablePrimaryPositions?: boolean;
  /** Enables Candidate D processing-order-only pre-sorting for Stage 8 bridge candidate evaluation (default: false) */
  enableCandidateDOrdering?: boolean;
}

export interface ArchitectureLayoutResultWithMetadata {
  positions: Record<string, { x: number; y: number }>;
  featureRegions?: Map<string, FeatureRegion>;
  orbitGuides?: OrbitGuideMetadata;
  projectedNodeIds?: Set<string>;
}

export { classifyNodeLayer, extractDomainStem, isTestNode, classifyAllFeatureRoles, discoverFeatures };
export type { ArchitectureLayer, FeatureRole, FeatureDiscoveryResult, FeatureRegion };

/**
 * Intelligent Architecture-Aware Layout Orchestrator
 *
 * Orchestrates Wave 1-4 deterministic layout pipeline:
 * 1. Graph facts normalization & defensive cloning
 * 2. Intermediate architecture analysis
 * 3. Layer classification & Domain discovery
 * 3.5 Feature Role classification & Feature Discovery (semantic)
 * 4. Centrality (hubs/bridges) analysis
 * 5. Connected component decomposition
 * 6. Global domain architecture layout & ordering
 * 7. Relationship-aware layer crossing reduction
 * 8. Primary production local node layout
 * 9. Hub / Bridge placement refinement
 * 10. Secondary satellite placement (tests, fields, triggers/handlers)
 * 11. Spatial clearance & collision cleanup
 * 12. Component packing
 * 13. Position Authority restoration
 */
export function computeArchitectureLayout(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureLayoutOptions = {}
): Record<string, { x: number; y: number }> {
  return computeArchitectureLayoutWithMetadata(nodes, edges, options).positions;
}

export function computeArchitectureLayoutWithMetadata(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureLayoutOptions = {}
): ArchitectureLayoutResultWithMetadata {
  const {
    nodeWidth = 120,
    nodeHeight = 60,
    layerSpacing = 250,
    domainSpacing = 380,
    componentGap = 100,
    existingPositions: rawExistingPositions = {},
    architectureMode,
    enableFeatureLayout = options.enableFeatureLayout ?? (architectureMode === 'hybrid'),
    enableImmutablePrimaryPositions = true,
    enableCandidateDOrdering = false,
  } = options;

  // Defensive deep clone of inputs to guarantee immutability (A11, A20, A36)
  const safeNodes: ExplorerNode[] = Array.isArray(nodes)
    ? nodes.map(n => ({
        ...n,
        metrics: n.metrics ? { ...n.metrics } : { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        behavior: n.behavior ? { ...n.behavior, asyncPatterns: Array.isArray(n.behavior.asyncPatterns) ? [...n.behavior.asyncPatterns] : [] } : { isTest: false },
        refactoringReadiness: n.refactoringReadiness
          ? { ...n.refactoringReadiness }
          : {
              isHighRisk: false,
              hasCycles: false,
              hasUnresolved: false,
              testCoverageStatus: 'UNTESTED',
            },
        riskReasons: Array.isArray(n.riskReasons) ? [...n.riskReasons] : [],
      }))
    : [];

  const safeEdges: ExplorerEdge[] = Array.isArray(edges)
    ? edges.map(e => ({ ...e }))
    : [];

  // Filter and sanitize existingPositions (A8, A9, A20, X4)
  const existingPositions: Record<string, { x: number; y: number }> = {};
  if (rawExistingPositions && typeof rawExistingPositions === 'object') {
    for (const [id, pos] of Object.entries(rawExistingPositions)) {
      if (
        pos &&
        typeof pos.x === 'number' &&
        typeof pos.y === 'number' &&
        Number.isFinite(pos.x) &&
        Number.isFinite(pos.y)
      ) {
        existingPositions[id] = { x: pos.x, y: pos.y };
      }
    }
  }

  if (safeNodes.length === 0) {
    if (architectureMode === 'orbit') {
      const orbitOutput = computeOrbitLayout({
        nodes: [],
        options: {
          nodeWidth,
          nodeHeight,
        },
      });
      return {
        positions: { ...existingPositions },
        orbitGuides: orbitOutput.guides,
      };
    }
    return { positions: { ...existingPositions } };
  }

  // Track real node IDs prior to phantom injection
  const realNodeIds = new Set(safeNodes.map(n => n.id));
  const knownNodeIds = new Set(realNodeIds);

  // Filter existingPositions to only include nodes present in input graph (A9)
  for (const id of Object.keys(existingPositions)) {
    if (!knownNodeIds.has(id)) {
      delete existingPositions[id];
    }
  }

  // Phantom node fabrication (A1, A25, A31, A38, A39)
  safeEdges.forEach(e => {
    if (!knownNodeIds.has(e.source)) {
      knownNodeIds.add(e.source);
      safeNodes.push({
        id: e.source,
        displayName: e.source.split(':').pop() || e.source,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 1, score: 100 },
        risk: 'HIGH',
        riskReasons: ['Unresolved external dependency endpoint'],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: true,
          hasCycles: false,
          hasUnresolved: true,
          testCoverageStatus: 'UNTESTED',
        },
      });
    }
    if (!knownNodeIds.has(e.target)) {
      knownNodeIds.add(e.target);
      safeNodes.push({
        id: e.target,
        displayName: e.target.split(':').pop() || e.target,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 1, score: 100 },
        risk: 'HIGH',
        riskReasons: ['Unresolved external dependency endpoint'],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: true,
          hasCycles: false,
          hasUnresolved: true,
          testCoverageStatus: 'UNTESTED',
        },
      });
    }
  });

  // Sort nodes & edges deterministically by ID using stableCompareStrings (A16, X3)
  safeNodes.sort((a, b) => stableCompareStrings(a.id, b.id));
  safeEdges.sort((a, b) => stableCompareStrings(a.id, b.id));

  // Construct complete summary input satisfying ExplorerSummary with real unresolved counts (A2)
  const completeSummary = {
    totalNodes: safeNodes.length,
    totalEdges: safeEdges.length,
    nodeCount: safeNodes.length,
    edgeCount: safeEdges.length,
    highRiskCount: safeNodes.filter(n => n.risk === 'HIGH').length,
    mediumRiskCount: safeNodes.filter(n => n.risk === 'MEDIUM').length,
    lowRiskCount: safeNodes.filter(n => n.risk === 'LOW').length,
    cycleCount: 0,
    cyclesCount: 0,
    unresolvedCount: safeEdges.filter(e => Boolean(e.unresolved) || e.unresolved).length,
    inventory: {
      files: safeNodes.length,
      apexClasses: safeNodes.filter(n => n.type === 'ApexClass').length,
      apexTriggers: safeNodes.filter(n => n.type === 'ApexTrigger').length,
      lwcJs: safeNodes.filter(n => n.type === 'LWC').length,
      lwcHtml: 0,
      visualforce: safeNodes.filter(n => n.type === 'Visualforce').length,
      flows: safeNodes.filter(n => n.type === 'Flow').length,
      objects: safeNodes.filter(n => n.type === 'Object' || n.type === 'CustomObject').length,
      fields: safeNodes.filter(n => n.type === 'Field' || n.type === 'CustomField').length,
    },
  };

  const schemaInput = {
    summary: completeSummary,
    nodes: safeNodes,
    edges: safeEdges,
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  };

  // Check if Constellation mode is explicitly requested
  if (architectureMode === 'constellation') {
    const projection = adaptComponentConstellation(
      schemaInput,
      options.componentConstellationOptions
    );
    const constellationOutput = computeComponentConstellationLayout(projection, {
      nodeWidth,
      nodeHeight,
    });

    const constellationPositions: Record<string, { x: number; y: number }> = {};
    for (const [nodeId, pos] of Object.entries(constellationOutput.positions)) {
      constellationPositions[nodeId] = { x: pos.x, y: pos.y };
    }

    return {
      positions: constellationPositions,
      orbitGuides: constellationOutput.guides as any,
      projectedNodeIds: new Set(Object.keys(projection.nodes)),
    };
  }

  // Check if Architecture Orbit / Component Orbit mode is explicitly requested
  const isOrbit = architectureMode === 'orbit';
  if (isOrbit) {
    const projection = adaptComponentOrbit(
      schemaInput,
      {
        focalLwcId: options.focalLwcId,
        ...options.componentOrbitOptions,
      }
    );
    const orbitOutput = computeComponentOrbitLayout(projection, {
      nodeWidth,
      nodeHeight,
    });

    const orbitPositions: Record<string, { x: number; y: number }> = {};
    for (const [nodeId, pos] of Object.entries(orbitOutput.positions)) {
      orbitPositions[nodeId] = { x: pos.x, y: pos.y };
    }

    return {
      positions: orbitPositions,
      orbitGuides: orbitOutput.guides as any,
      projectedNodeIds: new Set(Object.keys(projection.nodes)),
    };
  }

  // Construct LayoutGraphIndex immediately after Stage 0 normalization
  const index = createLayoutGraphIndex(safeNodes, safeEdges);

  // Step 3: Domain Discovery (Wave 1C)
  const domainDiscovery = discoverDomains(safeNodes, safeEdges);
  const domainMap = new Map<string, string>();
  domainDiscovery.assignments.forEach((assignment, nodeId) => {
    domainMap.set(nodeId, assignment.primaryDomain);
  });

  // Step 1: Base Architecture Analysis (Wave 1A) with domainMap pre-supplied to avoid re-discovering domains
  let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index, domainMap });

  // Step 2: Layer Classification (Wave 1B)
  const layerMap = new Map<string, ArchitectureLayer>();
  safeNodes.forEach(node => {
    layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
  });
  analysis = applyLayerClassification(analysis, layerMap);
  analysis = applyDomainClassification(analysis, domainMap);

  // Step 4: Centrality & Spatial Roles (Wave 3B)
  const centralityMap = computeGraphCentralityAnalysis(
    safeNodes,
    safeEdges,
    domainMap,
    layerMap,
    { index }
  );

  // Step 3.5 & 4: Feature Role Mapping & Semantic Feature Discovery
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

  // Step 5: Global Domain or Feature Architecture Layout
  let globalDomainResult;
  let activeSpatialMap: Map<string, string>;

  if (enableFeatureLayout) {
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[HYBRID_DIAGNOSTICS] computeGlobalFeatureLayout() called');
    }
    const featureGraph = buildDomainGraph(safeNodes, safeEdges, domainDiscovery, index, featureMap);
    const featureLayoutResult = computeGlobalFeatureLayout(safeNodes, safeEdges, {
      domainSpacing,
      layerSpacing,
      featureLayerSpacing: options.featureLayerSpacing,
      nodeWidth,
      nodeHeight,
      analysis,
      layerMap,
      domainMap,
      domainDiscovery,
      featureDiscovery,
      featureMap,
      domainGraph: featureGraph,
      index,
    });
    globalDomainResult = featureLayoutResult;
    activeSpatialMap = featureMap;
  } else {
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[HYBRID_DIAGNOSTICS] computeGlobalDomainLayout() called');
    }
    const domainGraph = buildDomainGraph(safeNodes, safeEdges, domainDiscovery, index, domainMap);
    globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
      domainSpacing,
      layerSpacing,
      nodeWidth,
      nodeHeight,
      analysis,
      domainDiscovery,
      layerMap,
      domainMap,
      domainGraph,
      index,
    });
    activeSpatialMap = domainMap;
  }

  // Step 6: Layer Ordering & Crossing Reduction (Wave 2B)
  const orderingResult = reduceEdgeCrossings({
    nodes: safeNodes,
    edges: safeEdges,
    layerMap,
    domainMap: activeSpatialMap,
    domainOrder: globalDomainResult.orderedDomains,
    layerYMap: globalDomainResult.layerYMap,
  });

  // Step 7: Primary Production Local Layout (Wave 3A)
  const localResult = computeLocalNodeLayout({
    nodes: safeNodes,
    edges: safeEdges,
    analysis,
    domainRegions: globalDomainResult.domainRegions,
    layerMap,
    domainMap: activeSpatialMap,
    bucketOrder: orderingResult.bucketOrder,
    options: {
      nodeWidth,
      nodeHeight,
      domainSpacing,
      layerYMap: globalDomainResult.layerYMap,
      featureLayerYMap: globalDomainResult.featureLayerYMap,
    },
  });

  const basePositions: Record<string, { x: number; y: number }> = {
    ...localResult.primaryNodePositions,
  };

  const immutableStage7PrimaryPositions: Record<string, { x: number; y: number }> = Object.freeze({
    ...localResult.primaryNodePositions,
  });

  // Step 8: Hub & Bridge Spatial Refinement (Wave 3B)
  const domainXCenters: Record<string, number> = {};
  const domainBounds: Record<string, { minX: number; maxX: number }> = {};

  globalDomainResult.domainRegions.forEach((region, domain) => {
    domainXCenters[domain] = region.xCenter;
    domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
  });

  // Exclude phantom nodes from stage 8 bridge candidate evaluation (A31)
  const stage8BridgeNodes = safeNodes.filter(node => {
    if (!realNodeIds.has(node.id)) return false;
    if (isTestNode(node) || isFieldNode(node)) return false;
    const centrality = centralityMap.get(node.id);
    return centrality?.isBridge && !centrality.isHub;
  });

  if (enableCandidateDOrdering) {
    const layerOrderMap: Record<ArchitectureLayer, number> = {
      presentation: 0,
      application: 1,
      domain: 2,
      schema: 3,
    };
    stage8BridgeNodes.sort((a, b) => {
      const cA = centralityMap.get(a.id);
      const cB = centralityMap.get(b.id);
      const spanA = cA?.connectedDomains.length || 0;
      const spanB = cB?.connectedDomains.length || 0;
      if (spanA !== spanB) {
        return spanA - spanB;
      }
      const nA = analysis.nodes.get(a.id)?.neighborIds.length || 0;
      const nB = analysis.nodes.get(b.id)?.neighborIds.length || 0;
      if (nB !== nA) {
        return nB - nA;
      }
      const lA = layerOrderMap[layerMap.get(a.id) || 'application'];
      const lB = layerOrderMap[layerMap.get(b.id) || 'application'];
      if (lA !== lB) {
        return lA - lB;
      }
      return stableCompareStrings(a.id, b.id);
    });
  }

  stage8BridgeNodes.forEach(node => {
    const centrality = centralityMap.get(node.id)!;
    const neighborPositions: Record<string, { x: number; y: number }> = {};
    const nodeAnalysis = analysis.nodes.get(node.id);

    nodeAnalysis?.neighborIds.forEach(nId => {
      if (basePositions[nId]) {
        neighborPositions[nId] = basePositions[nId];
      }
    });

    const bridgeInfo = calculateBridgeCandidatePosition(
      node.id,
      layerMap.get(node.id) || 'application',
      centrality.connectedDomains,
      domainXCenters,
      domainBounds,
      neighborPositions,
      {
        layerSpacing,
        nodeWidth,
        nodeHeight,
        layerYOffsets: globalDomainResult.layerYMap,
        index,
        allocatedPositions: basePositions,
        immutablePrimaryPositions: enableImmutablePrimaryPositions ? immutableStage7PrimaryPositions : undefined,
      }
    );

    basePositions[node.id] = bridgeInfo.candidatePosition;
  });

  // Step 9: Secondary Satellite Placement (Tests, Fields, Trigger/Handlers) (Wave 3C)
  const satelliteResult = placeSatellites(
    safeNodes,
    safeEdges,
    analysis,
    basePositions,
    {
      nodeWidth,
      nodeHeight,
      layerSpacing,
      layerYOffsets: globalDomainResult.layerYMap,
      index,
      ...(enableFeatureLayout && globalDomainResult.featureLayerYMap
        ? { featureLayerYMap: globalDomainResult.featureLayerYMap, featureMap }
        : {}),
    }
  );

  // Step 10: Disconnected Component Packing (Wave 2C)
  // Merge satellite positions into componentShiftedPositions defensively
  let componentShiftedPositions: Record<string, { x: number; y: number }> = {
    ...basePositions,
    ...satelliteResult.positions,
  };

  if (analysis.components.length > 1) {
    const componentLayouts: ComponentLocalLayout[] = analysis.components
      .map(comp => {
        const positions: Record<string, { x: number; y: number }> = {};
        let minNodeId: string | undefined = undefined;
        let importance = 0;

        for (const nodeId of comp.nodeIds) {
          const pos = componentShiftedPositions[nodeId];
          if (pos) {
            positions[nodeId] = pos;
            if (!minNodeId || stableCompareStrings(nodeId, minNodeId) < 0) {
              minNodeId = nodeId;
            }
            const centrality = centralityMap.get(nodeId);
            if (centrality) {
              const hScore = centrality.hubScore ?? 0;
              const bScore = centrality.bridgeScore ?? 0;
              importance += hScore + bScore;
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
      .filter(c => Object.keys(c.positions).length > 0);

    if (componentLayouts.length > 1) {
      // Avoid in-place mutation of component widths when computing minRowWidth (A15, A21, A23)
      const compWidths = componentLayouts.map(c => {
        const bounds = calculateLocalComponentBounds(c.positions, nodeWidth, nodeHeight);
        return bounds.width;
      });
      const sortedWidths = [...compWidths].sort((a, b) => b - a);

      const maxW = sortedWidths[0] ?? nodeWidth;
      const secondMaxW = sortedWidths[1] ?? nodeWidth;
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

      // Merge packed positions so no un-packed nodes are dropped
      componentShiftedPositions = {
        ...componentShiftedPositions,
        ...packed.positions,
      };
    }
  }

  // Step 11: Final Global Spatial Cleanup Pass (Wave 4A)
  const finalCleanupResult = resolveSpacingAndCollisions({
    nodes: safeNodes,
    edges: safeEdges,
    positions: componentShiftedPositions,
    analysis,
    options: {
      nodeWidth,
      nodeHeight,
      layerMap,
      domainMap: activeSpatialMap,
      ...(enableFeatureLayout && globalDomainResult.domainBounds
        ? { domainBounds: globalDomainResult.domainBounds }
        : {}),
    },
  });

  const calculatedPositions = finalCleanupResult.positions;

  // Step 8: Position Authority Restoration
  // Preserved authoritative existing positions take precedence over calculated layout
  const resultPositions: Record<string, { x: number; y: number }> = {
    ...calculatedPositions,
  };

  const overriddenIds: string[] = [];
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos && knownNodeIds.has(id)) {
      if (resultPositions[id]) {
        overriddenIds.push(id);
      }
      resultPositions[id] = { x: pos.x, y: pos.y };
    }
  }

  if (overriddenIds.length > 0 && process.env.NODE_ENV !== 'production') {
    console.debug(`[layout] Position authority restored for ${overriddenIds.length} nodes: ${overriddenIds.slice(0, 5).join(', ')}...`);
  }

  // A44: Dev-time assertion that layout outputs contain positions for every expected node
  if (process.env.NODE_ENV !== 'production') {
    const missing = safeNodes.filter((n) => !resultPositions[n.id]);
    if (missing.length > 0) {
      console.warn(
        `[layout] ${missing.length} nodes missing from layout result: ${missing.slice(0, 5).map((n) => n.id).join(', ')}...`
      );
    }
  }

  return {
    positions: resultPositions,
    featureRegions: (globalDomainResult as any)?.featureRegions,
  };
}
