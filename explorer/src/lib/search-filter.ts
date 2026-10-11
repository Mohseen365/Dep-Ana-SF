import {
  ExplorerNode,
  ExplorerEdge,
  ExplorerRiskLevel,
  ExplorerNodeType,
  ALL_EXPLORER_NODE_TYPES,
} from "../types/explorer";

export interface SearchFilterState {
  searchQuery: string;
  typeFilter: ExplorerNodeType | "";
  riskFilter: ExplorerRiskLevel | "";
  hasCallouts?: boolean;
  withoutSharing?: boolean;
  hideTests?: boolean;
  hasAsyncPatterns?: boolean;
  visibleNodeTypes?: ExplorerNodeType[];
}

export interface SearchResult {
  node: ExplorerNode;
  matchField: string;
  matchValue: string;
}

export interface FilteredGraphData {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  matchingNodeIds: Set<string>;
}

const searchTokenCache = new WeakMap<ExplorerNode, string>();

function getSearchToken(node: ExplorerNode): string {
  let cached = searchTokenCache.get(node);
  if (!cached) {
    const nameStr = node.id.includes(":") ? node.id.split(":")[1] : "";
    cached = `${node.displayName} ${node.id} ${node.file} ${node.type} ${node.risk} ${nameStr}`.toLowerCase();
    searchTokenCache.set(node, cached);
  }
  return cached;
}

export function searchNodes(
  nodes: ExplorerNode[],
  query: string,
  exact: boolean = false,
): SearchResult[] {
  if (!query || query.trim() === "") {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const results: SearchResult[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const searchToken = getSearchToken(node);

    if (exact) {
      if (
        node.displayName.toLowerCase() === normalizedQuery ||
        node.id.toLowerCase() === normalizedQuery
      ) {
        results.push({
          node,
          matchField: "id",
          matchValue: query.trim(),
        });
      }
    } else {
      if (searchToken.includes(normalizedQuery)) {
        results.push({
          node,
          matchField: "displayName",
          matchValue: query.trim(),
        });
      }
    }
  }

  return results;
}

export function filterNodesByType(
  nodes: ExplorerNode[],
  type: ExplorerNodeType | "",
): ExplorerNode[] {
  if (!type) {
    return nodes;
  }
  const result: ExplorerNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].type === type) {
      result.push(nodes[i]);
    }
  }
  return result;
}

export function filterNodesByRisk(
  nodes: ExplorerNode[],
  risk: ExplorerRiskLevel | "",
): ExplorerNode[] {
  if (!risk) {
    return nodes;
  }
  const result: ExplorerNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].risk === risk) {
      result.push(nodes[i]);
    }
  }
  return result;
}

export function filterEdgesByNodes(
  edges: ExplorerEdge[],
  matchingNodeIds: Set<string>,
): ExplorerEdge[] {
  const result: ExplorerEdge[] = [];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target)) {
      result.push(edge);
    }
  }
  return result;
}

export function applyFilters(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  filterState: SearchFilterState,
): FilteredGraphData {
  let filteredNodes = nodes;

  if (filterState.typeFilter) {
    filteredNodes = filterNodesByType(filteredNodes, filterState.typeFilter);
  }

  if (filterState.riskFilter) {
    filteredNodes = filterNodesByRisk(filteredNodes, filterState.riskFilter);
  }
  if (filterState.hasCallouts) {
    filteredNodes = filteredNodes.filter(
      (n) => (n.behavior?.calloutCount ?? 0) > 0,
    );
  }

  if (filterState.withoutSharing) {
    filteredNodes = filteredNodes.filter(
      (n) => n.behavior?.sharing === "without sharing",
    );
  }

  if (filterState.hideTests) {
    filteredNodes = filteredNodes.filter((n) => !n.behavior?.isTest);
  }

  if (filterState.hasAsyncPatterns) {
    filteredNodes = filteredNodes.filter(
      (n) => (n.behavior?.asyncPatterns?.length ?? 0) > 0,
    );
  }

  if (filterState.searchQuery) {
    const searchResults = searchNodes(filteredNodes, filterState.searchQuery);
    const matchedIds = new Set(searchResults.map((r) => r.node.id));
    const searchMatchedNodes: ExplorerNode[] = [];
    for (let i = 0; i < filteredNodes.length; i++) {
      if (matchedIds.has(filteredNodes[i].id)) {
        searchMatchedNodes.push(filteredNodes[i]);
      }
    }
    filteredNodes = searchMatchedNodes;
  }

  const matchingNodeIds = new Set<string>();
  for (let i = 0; i < filteredNodes.length; i++) {
    matchingNodeIds.add(filteredNodes[i].id);
  }

  const filteredEdges = filterEdgesByNodes(edges, matchingNodeIds);

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    matchingNodeIds,
  };
}

export function hasActiveFilters(filterState: SearchFilterState): boolean {
  return !!(
    filterState.searchQuery ||
    filterState.typeFilter ||
    filterState.riskFilter ||
    filterState.hasCallouts ||
    filterState.withoutSharing ||
    filterState.hideTests ||
    filterState.hasAsyncPatterns
  );
}

export function getUniqueNodeTypes(nodes: ExplorerNode[]): ExplorerNodeType[] {
  const types = new Set<ExplorerNodeType>();
  for (let i = 0; i < nodes.length; i++) {
    types.add(nodes[i].type);
  }
  return Array.from(types).sort();
}

export function getAvailableRiskLevels(
  nodes: ExplorerNode[],
): ExplorerRiskLevel[] {
  const risks = new Set<ExplorerRiskLevel>();
  for (let i = 0; i < nodes.length; i++) {
    risks.add(nodes[i].risk);
  }
  return Array.from(risks).sort();
}

export function filterNodesByVisibleTypes(
  nodes: ExplorerNode[],
  visibleTypes?: ExplorerNodeType[],
): ExplorerNode[] {
  if (!visibleTypes) {
    return nodes;
  }
  const typeSet = new Set<ExplorerNodeType>(visibleTypes);
  const result: ExplorerNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (typeSet.has(nodes[i].type)) {
      result.push(nodes[i]);
    }
  }
  return result;
}

export function filterEdgesByVisibleNodes(
  edges: ExplorerEdge[],
  visibleNodeIds: Set<string>,
): ExplorerEdge[] {
  const result: ExplorerEdge[] = [];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
      result.push(edge);
    }
  }
  return result;
}

export function filterGraphByNodeTypes(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  visibleTypes?: ExplorerNodeType[],
): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const visibleNodes = filterNodesByVisibleTypes(nodes, visibleTypes);
  const visibleNodeIds = new Set<string>();
  for (let i = 0; i < visibleNodes.length; i++) {
    visibleNodeIds.add(visibleNodes[i].id);
  }
  const visibleEdges = filterEdgesByVisibleNodes(edges, visibleNodeIds);
  return {
    nodes: visibleNodes,
    edges: visibleEdges,
  };
}

export function createEmptyFilterState(): SearchFilterState {
  return {
    searchQuery: "",
    typeFilter: "",
    riskFilter: "",
    hasCallouts: false,
    withoutSharing: false,
    hideTests: false,
    hasAsyncPatterns: false,
    visibleNodeTypes: [...ALL_EXPLORER_NODE_TYPES],
  };
}
