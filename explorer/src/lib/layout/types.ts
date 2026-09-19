import type { ExplorerNode, ExplorerNodeType } from '../../types/explorer';

export type ArchitectureLayer = 'presentation' | 'application' | 'domain' | 'schema';

/**
 * Detailed intermediate architecture layout analysis for a single node.
 * Contains structural graph facts, satellite relationships, centrality metrics,
 * and classification slots to be populated by layer/domain classification modules.
 */
export interface ArchitectureNodeAnalysis {
  /** Canonical node ID */
  nodeId: string;
  /** Raw ExplorerNode instance */
  node: ExplorerNode;
  /** Display label for UI or logging */
  displayName: string;
  /** Salesforce architectural node type */
  nodeType: ExplorerNodeType;

  // --- Classification Slots (Populated by Agents 1B and 1C / Layout Stages) ---
  /** Architectural layer (presentation, application, domain, schema) or null if unassigned */
  layer: ArchitectureLayer | null;
  /** Subsystem / Domain identifier or null if unassigned */
  domain: string | null;
  /** Architectural role (e.g. controller, handler, selector, etc.) or null if unassigned */
  role: string | null;

  // --- Node Behavioral & Structural Flags ---
  /** Flag indicating whether node is a unit test class/component */
  isTest: boolean;
  /** Flag indicating whether node is an object field or custom field */
  isField: boolean;
  /** Flag indicating whether node acts as a cross-domain bridge */
  isBridge: boolean;

  // --- Quantitative Centrality Metrics (INDEPENDENT) ---
  /** Graph centrality degree score (e.g., fanIn + fanOut) */
  hubScore: number;
  /** Cross-domain or cross-subsystem boundary connectivity score */
  bridgeScore: number;

  // --- Direct Graph Connectivity Facts ---
  /** Number of incoming edges targeting this node */
  fanIn: number;
  /** Number of outgoing edges originating from this node */
  fanOut: number;
  /** Sorted, deduplicated array of adjacent neighbor node IDs */
  neighborIds: string[];

  // --- Topology & Satellite Relationships ---
  /** Deterministic connected component identifier */
  componentId: number;
  /** Resolved target production node ID if this node is a test, or null */
  parentProductionNodeId: string | null;
  /** Resolved parent CustomObject node ID if this node is a field, or null */
  parentObjectId: string | null;
}

/**
 * Analysis model for a connected subgraph component.
 */
export interface ConnectedComponentAnalysis {
  /** Deterministic component ID */
  componentId: number;
  /** Node IDs belonging to this component, sorted alphabetically */
  nodeIds: string[];
  /** Edge IDs contained within this component, sorted alphabetically */
  edgeIds: string[];
}

/**
 * Complete graph-level analysis output model.
 */
export interface ArchitectureGraphAnalysis {
  /** Fast lookup map of node ID to node analysis */
  nodes: Map<string, ArchitectureNodeAnalysis>;
  /** Deterministically ordered list of all node analyses */
  nodeList: ArchitectureNodeAnalysis[];
  /** Connected components, sorted deterministically by size and min node ID */
  components: ConnectedComponentAnalysis[];
  /** Total number of nodes analyzed */
  totalNodes: number;
  /** Total number of edges analyzed */
  totalEdges: number;
}

/**
 * Options for configuring graph analysis calculation.
 */
export interface ArchitectureAnalysisOptions {
  /** Optional pre-computed layer map (nodeId -> ArchitectureLayer) */
  layerMap?: Map<string, ArchitectureLayer> | Record<string, ArchitectureLayer>;
  /** Optional pre-computed domain map (nodeId -> domain string) */
  domainMap?: Map<string, string> | Record<string, string>;
  /** Optional pre-computed role map (nodeId -> role string) */
  roleMap?: Map<string, string> | Record<string, string>;
}
