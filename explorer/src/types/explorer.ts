export type ProjectAnalysisStatus = 'NOT_ANALYZED' | 'ANALYZING' | 'COMPLETE' | 'FAILED';

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  sourcePath: string;
  createdAt: string;
  updatedAt: string;
  lastAnalyzedAt?: string | null;
  analysisStatus: ProjectAnalysisStatus;
  componentCount: number;
  dependencyCount: number;
  analysisPath?: string;
  isArchived?: boolean;
}

export interface MultiProjectManifest {
  manifestVersion: string;
  activeProjectId: string;
  projects: ProjectMetadata[];
}

export interface ExplorerDataSchema {
  schemaVersion: string;
  analyzerVersion: string;
  generatedAt: string;
  sourceDirectory: string;
  project?: ProjectMetadata;
  summary: ExplorerSummary;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  cycles: ExplorerCycleGroup[];
  unresolvedReferences: ExplorerUnresolvedReference[];
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
  id: string;
  displayName: string;
  type: ExplorerNodeType;
  file: string;
  metrics: ExplorerNodeMetrics;
  risk: ExplorerRiskLevel;
  riskReasons: string[];
  behavior: ExplorerNodeBehavior;
  refactoringReadiness: {
    isHighRisk: boolean;
    hasCycles: boolean;
    hasUnresolved: boolean;
    testCoverageStatus: "COVERED" | "NO_TESTS" | "UNTESTED" | "AMBIGUOUS";
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
  | "unknown";

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
    resolution: "EXACT" | "INFERRED" | "HEURISTIC" | "UNRESOLVED";
  };
  location: {
    line?: number | null;
    column?: number | null;
  };
}

export interface ExplorerEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: ExplorerRelationshipType;
  method: string | null;
  evidence: string;
  unresolved: boolean;
  resolutionClassification: "RESOLVED_LOCAL" | "UNKNOWN";
  resolutionStrategy: "EXACT" | "HEURISTIC" | "LLM";
  confidence: string;
  line: number | null;
  column: number | null;
  methodOwner: string | null;
  file: string;
  canonical: ExplorerEdgeCanonical;
}

export interface ExplorerCycleGroup {
  id: string;
  size: number;
  nodes: string[];
}

export interface ExplorerUnresolvedReference {
  edgeId: string;
  sourceNodeId: string;
  targetName: string;
  targetType: ExplorerNodeType;
  file: string;
  line: number | null;
  evidence: string;
  reason: string;
}

export interface ExplorerComponentImpactSummary {
  id: string;
  directDependencies: string[];
  directDependents: string[];
  transitiveDependencies: string[];
  transitiveDependents: string[];
  impactedTests: string[];
  totalImpactCount: number;
}
