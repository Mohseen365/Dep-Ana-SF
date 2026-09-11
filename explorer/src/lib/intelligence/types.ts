/**
 * Architecture Intelligence Foundation - Types and Interfaces
 *
 * Provides shared, read-only data structures for context, indexing,
 * common architecture findings, evidence provenance, rule identities,
 * and configuration boundaries.
 */

import type {
  ExplorerDataSchema,
  ExplorerNode,
  ExplorerEdge,
  ExplorerCycleGroup,
  ExplorerUnresolvedReference,
  ExplorerComponentImpactSummary,
  ExplorerNodeType,
  ExplorerRiskLevel
} from "../../../../explorer-contract";

export type {
  ExplorerDataSchema,
  ExplorerNode,
  ExplorerEdge,
  ExplorerCycleGroup,
  ExplorerUnresolvedReference,
  ExplorerComponentImpactSummary,
  ExplorerNodeType,
  ExplorerRiskLevel
};

/**
 * Severity level for deterministic architecture findings
 */
export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

/**
 * Provenance origin type distinguishing Level 1 facts from Level 2 derived rules or configuration
 */
export type ProvenanceOriginType =
  | "ANALYZER_FACT"
  | "CONTRACT_FACT"
  | "DERIVED_RULE"
  | "CONFIGURATION";

/**
 * Source code evidence snippet item attached to a finding
 */
export interface FindingEvidenceItem {
  file: string;
  line: number | null;
  snippet: string;
  description: string;
}

/**
 * Provenance entry explaining why an architectural finding was produced
 */
export interface FindingProvenance {
  origin: ProvenanceOriginType;
  source: string;
  facts: Record<string, unknown>;
}

/**
 * Rule metadata identifying the deterministic rule that generated a finding
 */
export interface RuleIdentity {
  ruleId: string;
  ruleVersion: string;
  name: string;
  description?: string;
}

/**
 * Standardized, deterministic architecture finding representation
 */
export interface ArchitectureFinding {
  /** Unique stable ID for finding (e.g., finding:cycle:cycle-1) */
  id: string;
  /** Finding classification code (e.g., CIRCULAR_DEPENDENCY, HIGH_FAN_IN_HUB) */
  type: string;
  /** Finding severity */
  severity: FindingSeverity;
  /** Concise human-readable title */
  title: string;
  /** Detailed explanation */
  description: string;
  /** Participating component node IDs */
  nodeIds: string[];
  /** Participating edge IDs */
  edgeIds: string[];
  /** Evidence snippets */
  evidence: FindingEvidenceItem[];
  /** Provenance explanation */
  provenance: FindingProvenance;
  /** Rule metadata */
  rule: RuleIdentity;
}

/**
 * Read-only configuration boundary for Architecture Intelligence
 */
export interface IntelligenceConfig {
  profileName: string;
  version: string;
  thresholds: {
    highFanInThreshold: number;
    highFanOutThreshold: number;
    highCouplingThreshold: number;
  };
  enabledRuleIds?: string[];
  customSettings?: Record<string, unknown>;
}

/**
 * Default fallback configuration
 */
export const DEFAULT_INTELLIGENCE_CONFIG: Readonly<IntelligenceConfig> = Object.freeze({
  profileName: "Default-Salesforce-Profile",
  version: "1.0.0",
  thresholds: {
    highFanInThreshold: 10,
    highFanOutThreshold: 10,
    highCouplingThreshold: 15
  }
});

/**
 * Read-only indexes over the Explorer dataset for O(1) lookups
 */
export interface ArchitectureIndexes {
  /** Lookup node by stable ID */
  readonly nodeById: ReadonlyMap<string, ExplorerNode>;
  /** Lookup nodes grouped by metadata type */
  readonly nodesByType: ReadonlyMap<ExplorerNodeType, readonly ExplorerNode[]>;
  /** Lookup outgoing edges originating from node ID */
  readonly outgoingEdges: ReadonlyMap<string, readonly ExplorerEdge[]>;
  /** Lookup incoming edges pointing to node ID */
  readonly incomingEdges: ReadonlyMap<string, readonly ExplorerEdge[]>;
  /** Lookup cycles containing participating node ID */
  readonly cyclesByNodeId: ReadonlyMap<string, readonly ExplorerCycleGroup[]>;
  /** Lookup unresolved references originating from source node ID */
  readonly unresolvedBySourceId: ReadonlyMap<string, readonly ExplorerUnresolvedReference[]>;
  /** Lookup pre-computed impact summary by node ID */
  readonly impactByNodeId: ReadonlyMap<string, ExplorerComponentImpactSummary>;
}

/**
 * Read-only architecture context passed to intelligence modules
 */
export interface ArchitectureContext {
  /** Read-only reference to underlying Explorer dataset */
  readonly data: Readonly<ExplorerDataSchema>;
  /** Read-only configuration */
  readonly config: Readonly<IntelligenceConfig>;
  /** Fast read-only index lookups */
  readonly indexes: ArchitectureIndexes;
}
