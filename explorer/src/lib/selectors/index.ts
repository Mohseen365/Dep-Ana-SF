import { ExplorerDataSchema, ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../../types/explorer';
import { discoverFeatures, FeatureCluster } from '../layout/features';
import { classifyNodeLayer, ArchitectureLayer } from '../layout/layers';
import { computeGraphCentralityAnalysis, GraphCentralityAnalysis } from '../layout/centrality';
import { getArchitecturalHotspots, CategorizedHotspots } from '../hotspots';
import { filterGraphByNodeTypes, applyFilters, FilteredGraphData } from '../search-filter';
import { SearchFilterState } from '../search-filter';
import { buildDiffOverlayGraph, DiffOverlayGraph } from '../diff-adapter';

// Lightweight memoization helper with max cache size 1 per selector
function createMemoizedSelector<TInputs extends any[], TOutput>(
  fn: (...args: TInputs) => TOutput,
  isEqual: (a: TInputs, b: TInputs) => boolean
): (...args: TInputs) => TOutput {
  let lastArgs: TInputs | null = null;
  let lastResult: TOutput | null = null;

  return (...args: TInputs): TOutput => {
    if (lastArgs !== null && lastResult !== null && isEqual(lastArgs, args)) {
      return lastResult;
    }
    const result = fn(...args);
    lastArgs = args;
    lastResult = result;
    return result;
  };
}

function shallowArrayEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function filterStateEqual(a: SearchFilterState, b: SearchFilterState): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.searchQuery === b.searchQuery &&
    a.typeFilter === b.typeFilter &&
    a.riskFilter === b.riskFilter &&
    a.hasCallouts === b.hasCallouts &&
    a.withoutSharing === b.withoutSharing &&
    a.hideTests === b.hideTests &&
    a.hasAsyncPatterns === b.hasAsyncPatterns
  );
}

// 1. Feature Discovery Selector
export const selectDiscoveredFeatures = createMemoizedSelector(
  (data: ExplorerDataSchema | null): FeatureCluster[] => {
    if (!data || !data.nodes) return [];
    return discoverFeatures(data.nodes, data.edges || []).featureList;
  },
  (argsA, argsB) => argsA[0] === argsB[0]
);

// 2. Filtered Graph Selector
export interface SelectFilteredGraphOptions {
  filterState?: SearchFilterState;
  visibleNodeTypes?: ExplorerNodeType[];
}

export const selectFilteredGraph = createMemoizedSelector(
  (data: ExplorerDataSchema | null, options?: SelectFilteredGraphOptions): FilteredGraphData => {
    if (!data || !data.nodes) {
      return { nodes: [], edges: [], matchingNodeIds: new Set() };
    }

    const visibleTypes = options?.visibleNodeTypes;
    let currentNodes = data.nodes;
    let currentEdges = data.edges || [];

    if (visibleTypes && visibleTypes.length > 0) {
      const typeFiltered = filterGraphByNodeTypes(currentNodes, currentEdges, visibleTypes);
      currentNodes = typeFiltered.nodes;
      currentEdges = typeFiltered.edges;
    }

    if (options?.filterState) {
      return applyFilters(currentNodes, currentEdges, options.filterState);
    }

    const matchingNodeIds = new Set<string>();
    for (let i = 0; i < currentNodes.length; i++) {
      matchingNodeIds.add(currentNodes[i].id);
    }

    return {
      nodes: currentNodes,
      edges: currentEdges,
      matchingNodeIds,
    };
  },
  (argsA, argsB) => {
    const [dataA, optsA] = argsA;
    const [dataB, optsB] = argsB;
    if (dataA !== dataB) return false;
    if (optsA === optsB) return true;
    if (!optsA || !optsB) return false;

    if (!filterStateEqual(optsA.filterState || {} as any, optsB.filterState || {} as any)) {
      return false;
    }

    const typesA = optsA.visibleNodeTypes || [];
    const typesB = optsB.visibleNodeTypes || [];
    return shallowArrayEqual(typesA, typesB);
  }
);

// 3. Node Layers Selector
export const selectNodeLayers = createMemoizedSelector(
  (data: ExplorerDataSchema | null): Map<string, ArchitectureLayer> => {
    const layerMap = new Map<string, ArchitectureLayer>();
    if (!data || !data.nodes) return layerMap;
    for (const node of data.nodes) {
      layerMap.set(node.id, classifyNodeLayer(node));
    }
    return layerMap;
  },
  (argsA, argsB) => argsA[0] === argsB[0]
);

// 4. Centrality Scores Selector
export const selectCentralityScores = createMemoizedSelector(
  (data: ExplorerDataSchema | null): Map<string, any> => {
    if (!data || !data.nodes) {
      return new Map();
    }
    const domainMap = new Map<string, string>();
    const layerMap = new Map<string, ArchitectureLayer>();
    for (const node of data.nodes) {
      if (node.domain) domainMap.set(node.id, node.domain);
      layerMap.set(node.id, classifyNodeLayer(node));
    }
    return computeGraphCentralityAnalysis(data.nodes, data.edges || [], domainMap, layerMap);
  },
  (argsA, argsB) => argsA[0] === argsB[0]
);

// 5. Architectural Hotspots Selector
export interface SelectHotspotsOptions {
  riskFilter?: string;
}

export const selectHotspots = createMemoizedSelector(
  (data: ExplorerDataSchema | null, options?: SelectHotspotsOptions): CategorizedHotspots => {
    if (!data || !data.nodes) {
      return {
        highRisk: [],
        highFanIn: [],
        highCoupling: [],
        circular: [],
        unresolved: [],
        topRanked: [],
      };
    }
    const hotspots = getArchitecturalHotspots(data.nodes, data.cycles || [], data.impactSummaries);

    if (options?.riskFilter) {
      const risk = options.riskFilter;
      return {
        ...hotspots,
        topRanked: hotspots.topRanked.filter((item) => item.node.risk === risk),
      };
    }

    return hotspots;
  },
  (argsA, argsB) => {
    const [dataA, optsA] = argsA;
    const [dataB, optsB] = argsB;
    if (dataA !== dataB) return false;
    if (optsA === optsB) return true;
    if (!optsA || !optsB) return false;
    return optsA.riskFilter === optsB.riskFilter;
  }
);

// 6. Diff Model Selector
export const selectDiffModel = createMemoizedSelector(
  (baseData: ExplorerDataSchema | null, compareData: ExplorerDataSchema | null): DiffOverlayGraph | null => {
    if (!baseData || !compareData) return null;
    const emptyDiffResult = {
      diffSchemaVersion: 1,
      snapshotBeforeIdentity: baseData.projectId || null,
      snapshotAfterIdentity: compareData.projectId || null,
      hasChanges: false,
      summary: {
        addedNodesCount: 0,
        removedNodesCount: 0,
        changedNodesCount: 0,
        addedEdgesCount: 0,
        removedEdgesCount: 0,
        addedCyclesCount: 0,
        removedCyclesCount: 0,
        addedUnresolvedReferencesCount: 0,
        removedUnresolvedReferencesCount: 0,
        totalChangesCount: 0,
      },
      addedNodes: [],
      removedNodes: [],
      changedNodes: [],
      addedEdges: [],
      removedEdges: [],
      cycleChanges: { added: [], removed: [] },
      unresolvedReferenceChanges: { added: [], removed: [] },
    };

    return buildDiffOverlayGraph(baseData, compareData, emptyDiffResult);
  },
  (argsA, argsB) => {
    const [baseA, compA] = argsA;
    const [baseB, compB] = argsB;
    return baseA === baseB && compA === compB;
  }
);
