import type {
  ExplorerNode,
  ExplorerEdge,
  ExplorerNodeType,
  ExplorerRelationshipType,
  ExplorerRiskLevel,
  ExplorerSummary,
  ExplorerDataSchema,
} from '../types/explorer';

export function createMockNode(
  id: string,
  displayName?: string,
  type: ExplorerNodeType = 'ApexClass',
  risk: ExplorerRiskLevel = 'LOW',
  file?: string,
  isTest = false
): ExplorerNode {
  const name = displayName || id.split(':').pop() || id;
  return {
    id,
    displayName: name,
    type,
    file: file || `${name}.cls`,
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 5 },
    risk,
    riskReasons: [],
    behavior: {
      isTest,
      publicContractsCount: 1,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 0,
      dmlCount: 0,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: risk === 'HIGH',
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: isTest ? 'NO_TESTS' : 'COVERED',
    },
  };
}

export function createMockEdge(
  id: string,
  source: string,
  target: string,
  relationshipType: ExplorerRelationshipType = 'method-call'
): ExplorerEdge {
  return {
    id,
    source,
    target,
    relationshipType,
    method: 'execute',
    evidence: 'calls target',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 1,
    column: 1,
    methodOwner: source,
    file: '',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: relationshipType, resolution: 'EXACT' },
      location: {},
    },
  };
}

export function createMockSummary(nodeCount = 0, edgeCount = 0): ExplorerSummary {
  return {
    nodeCount,
    edgeCount,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: nodeCount,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: nodeCount,
      apexClasses: nodeCount,
      apexTriggers: 0,
      lwcJs: 0,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  };
}

export function createMockDataSchema(
  nodes: ExplorerNode[] = [],
  edges: ExplorerEdge[] = []
): ExplorerDataSchema {
  return {
    summary: createMockSummary(nodes.length, edges.length),
    nodes,
    edges,
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  };
}
