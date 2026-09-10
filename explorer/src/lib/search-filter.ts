import { ExplorerNode, ExplorerEdge, ExplorerRiskLevel, ExplorerNodeType } from '../types/explorer';

export interface SearchFilterState {
  searchQuery: string;
  typeFilter: ExplorerNodeType | '';
  riskFilter: ExplorerRiskLevel | '';
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

/**
 * Determine which fields to search and how to match.
 */
function getSearchFields(node: ExplorerNode): Array<{ field: string; value: string }> {
  return [
    { field: 'displayName', value: node.displayName.toLowerCase() },
    { field: 'id', value: node.id.toLowerCase() },
    { field: 'file', value: node.file.toLowerCase() },
    { field: 'type', value: node.type.toLowerCase() },
    { field: 'risk', value: node.risk.toLowerCase() },
    // Extract name from id (e.g., "ApexClass:AssetHelper" -> "AssetHelper")
    { field: 'name', value: node.id.includes(':') ? node.id.split(':')[1].toLowerCase() : '' },
  ];
}

/**
 * Perform search on nodes - exact or partial match.
 * Returns matching nodes with information about what matched.
 */
export function searchNodes(
  nodes: ExplorerNode[],
  query: string,
  exact: boolean = false
): SearchResult[] {
  if (!query || query.trim() === '') {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const results: SearchResult[] = [];

  for (const node of nodes) {
    const searchFields = getSearchFields(node);

    for (const { field, value } of searchFields) {
      if (!value) continue;

      const isMatch = exact 
        ? value === normalizedQuery 
        : value.includes(normalizedQuery);

      if (isMatch) {
        results.push({
          node,
          matchField: field,
          matchValue: query.trim()
        });
        break; // Only match each node once
      }
    }
  }

  return results;
}

/**
 * Filter nodes by type.
 */
export function filterNodesByType(
  nodes: ExplorerNode[],
  type: ExplorerNodeType | ''
): ExplorerNode[] {
  if (!type) {
    return nodes;
  }
  return nodes.filter(node => node.type === type);
}

/**
 * Filter nodes by risk level.
 */
export function filterNodesByRisk(
  nodes: ExplorerNode[],
  risk: ExplorerRiskLevel | ''
): ExplorerNode[] {
  if (!risk) {
    return nodes;
  }
  return nodes.filter(node => node.risk === risk);
}

/**
 * Filter edges to only include those where both source and target
 * are in the matching node set.
 */
export function filterEdgesByNodes(
  edges: ExplorerEdge[],
  matchingNodeIds: Set<string>
): ExplorerEdge[] {
  return edges.filter(edge => 
    matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target)
  );
}

/**
 * Apply all filters and return filtered graph data.
 * This does NOT modify the original analyzer data.
 */
export function applyFilters(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  filterState: SearchFilterState
): FilteredGraphData {
  let filteredNodes = [...nodes];

  // Apply type filter
  if (filterState.typeFilter) {
    filteredNodes = filterNodesByType(filteredNodes, filterState.typeFilter);
  }

  // Apply risk filter
  if (filterState.riskFilter) {
    filteredNodes = filterNodesByRisk(filteredNodes, filterState.riskFilter);
  }

  // Apply search query
  if (filterState.searchQuery) {
    const searchResults = searchNodes(nodes, filterState.searchQuery);
    const matchedIds = new Set(searchResults.map(r => r.node.id));
    
    // If there's a search query, intersect with search results
    // But also respect type/risk filters
    const searchMatchedNodes = filteredNodes.filter(node => matchedIds.has(node.id));
    filteredNodes = searchMatchedNodes;
  }

  // Build set of matching node IDs for edge filtering
  const matchingNodeIds = new Set(filteredNodes.map(n => n.id));

  // Filter edges to only include those connecting matching nodes
  const filteredEdges = filterEdgesByNodes(edges, matchingNodeIds);

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    matchingNodeIds
  };
}

/**
 * Check if any filters are active.
 */
export function hasActiveFilters(filterState: SearchFilterState): boolean {
  return !!(filterState.searchQuery || filterState.typeFilter || filterState.riskFilter);
}

/**
 * Get unique node types from the data.
 */
export function getUniqueNodeTypes(nodes: ExplorerNode[]): ExplorerNodeType[] {
  const types = new Set<ExplorerNodeType>();
  nodes.forEach(node => types.add(node.type));
  return Array.from(types).sort();
}

/**
 * Get available risk levels from the data.
 */
export function getAvailableRiskLevels(nodes: ExplorerNode[]): ExplorerRiskLevel[] {
  const risks = new Set<ExplorerRiskLevel>();
  nodes.forEach(node => risks.add(node.risk));
  return Array.from(risks).sort();
}

/**
 * Create empty filter state.
 */
export function createEmptyFilterState(): SearchFilterState {
  return {
    searchQuery: '',
    typeFilter: '',
    riskFilter: ''
  };
}