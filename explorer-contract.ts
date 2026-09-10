/**
 * Salesforce Architecture & Refactoring Explorer - Stable Data Contract Types
 * Schema Version: 1.0.0
 */

export interface ExplorerDataSchema {
  /** Contract schema version */
  schemaVersion: string;
  /** Version of the underlying Salesforce Dependency Analyzer */
  analyzerVersion: string;
  /** ISO timestamp of analysis generation */
  generatedAt: string;
  /** Target source directory analyzed */
  sourceDirectory: string;

  /** Section 1: Top-level summary & architecture metrics */
  summary: ExplorerSummary;

  /** Section 2: Complete metadata nodes */
  nodes: ExplorerNode[];

  /** Section 3: Directional dependency edges */
  edges: ExplorerEdge[];

  /** Section 4: Circular dependency groups */
  cycles: ExplorerCycleGroup[];

  /** Section 5: Unresolved references */
  unresolvedReferences: ExplorerUnresolvedReference[];

  /** Section 6: Pre-computed impact summaries per component */
  impactSummaries: Record<string, ExplorerComponentImpactSummary>;
}

export interface ExplorerSummary {
  nodeCount: number;
  edgeCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  cycleCount: number;
  unresolvedCount: number;
  inventory: ExplorerInventory;
}

export interface ExplorerInventory {
  files: number;
  apexClasses: number;
  apexTriggers: number;
  lwcJs: number;
  lwcHtml: number;
  visualforce: number;
  flows: number;
  objects: number;
  fields: number;
}

export type ExplorerNodeType =
  | "ApexClass"
  | "ApexTrigger"
  | "LWC"
  | "Visualforce"
  | "Flow"
  | "Object"
  | "CustomObject"
  | "Field"
  | "CustomField"
  | "External";

export type ExplorerRiskLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ExplorerNodeMetrics {
  fanIn: number;
  fanOut: number;
  coupling: number;
  unresolved: number;
  score: number;
}

export interface ExplorerNodeBehavior {
  isTest: boolean;
  sharing?: "with sharing" | "without sharing" | "inherited sharing" | null;
  publicContractsCount: number;
  asyncPatterns: string[];
  securitySignalsCount: number;
  queryCount: number;
  dmlCount: number;
  calloutCount: number;
}

export interface ExplorerNode {
  /** Stable node identifier (e.g. ApexClass:AssetDashboardService) */
  id: string;
  /** Human-readable display name (e.g. AssetDashboardService) */
  displayName: string;
  /** Salesforce metadata type */
  type: ExplorerNodeType;
  /** Source file relative path */
  file: string;
  /** Node coupling & risk metrics */
  metrics: ExplorerNodeMetrics;
  /** Calculated risk level */
  risk: ExplorerRiskLevel;
  /** Risk classification reasons */
  riskReasons: string[];
  /** Behavior & code capabilities metadata */
  behavior: ExplorerNodeBehavior;
  /** Refactoring readiness flags */
  refactoringReadiness: {
    isHighRisk: boolean;
    hasCycles: boolean;
    hasUnresolved: boolean;
    testCoverageStatus: "COVERED" | "NO_TESTS" | "UNTESTED";
  };
}

export type ExplorerRelationshipType =
  | "method-call"
  | "instantiation"
  | "type-reference"
  | "generic-type"
  | "extends"
  | "implements"
  | "SOQL"
  | "soql-object"
  | "soql-field"
  | "DML"
  | "aura-enabled"
  | "lwc-apex"
  | "lwc-import"
  | "lwc-template-child"
  | "field-reference"
  | "trigger-handler"
  | "trigger-object"
  | "trigger-on"
  | "visualforce-controller"
  | "test-reference"
  | "event-publisher"
  | "unknown"
  | string;

export interface ExplorerEdgeCanonical {
  source: {
    type: ExplorerNodeType;
    name: string;
    method?: string | null;
  };
  target: {
    type: ExplorerNodeType;
    name: string;
    method?: string | null;
  };
  relationship: {
    type: ExplorerRelationshipType;
    resolution: "EXACT" | "INFERRED" | "UNRESOLVED";
  };
  location: {
    line?: number | null;
    column?: number | null;
  };
}

export interface ExplorerEdge {
  /** Unique edge ID */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Directional relationship type */
  relationshipType: ExplorerRelationshipType;
  /** Target method name if applicable */
  method: string | null;
  /** Source code snippet evidence */
  evidence: string;
  /** Whether the target reference could not be resolved */
  unresolved: boolean;
  /** Resolution category classification */
  resolutionClassification: "RESOLVED_LOCAL" | "RESOLVED_PLATFORM" | "UNKNOWN" | string;
  /** Resolution strategy */
  resolutionStrategy: "EXACT" | "INFERRED" | "LLM" | string;
  /** Confidence score */
  confidence: "high" | "medium" | "low" | string;
  /** File line location */
  line: number | null;
  /** File column location */
  column: number | null;
  /** Enclosing method in source file */
  methodOwner: string | null;
  /** Source file relative path */
  file: string;
  /** Canonical detail metadata */
  canonical: ExplorerEdgeCanonical;
}

export interface ExplorerCycleGroup {
  /** Unique cycle ID */
  id: string;
  /** Size of cycle (number of participating nodes) */
  size: number;
  /** List of node IDs participating in cycle */
  nodes: string[];
}

export interface ExplorerUnresolvedReference {
  /** Edge ID containing unresolved reference */
  edgeId: string;
  /** Source node ID */
  sourceNodeId: string;
  /** Referenced target symbol name */
  targetName: string;
  /** Expected target type */
  targetType: ExplorerNodeType;
  /** Source file relative path */
  file: string;
  /** Line number */
  line: number | null;
  /** Code evidence snippet */
  evidence: string;
  /** Classification reason */
  reason: string;
}

export interface ExplorerComponentImpactSummary {
  /** Component node ID */
  id: string;
  /** Direct outbound dependency node IDs */
  directDependencies: string[];
  /** Direct inbound dependent node IDs */
  directDependents: string[];
  /** Transitive outbound dependency node IDs */
  transitiveDependencies: string[];
  /** Transitive inbound dependent node IDs */
  transitiveDependents: string[];
  /** Impacted test component node IDs */
  impactedTests: string[];
  /** Affected component count */
  totalImpactCount: number;
}
