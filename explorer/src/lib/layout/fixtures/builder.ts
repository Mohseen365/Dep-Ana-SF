import type {
  ExplorerNode,
  ExplorerEdge,
  ExplorerNodeType,
  ExplorerRelationshipType,
  ExplorerRiskLevel,
} from '../../../types/explorer';

export interface NodeOptions {
  displayName?: string;
  file?: string;
  fanIn?: number;
  fanOut?: number;
  risk?: ExplorerRiskLevel;
  isTest?: boolean;
  publicContractsCount?: number;
  queryCount?: number;
  dmlCount?: number;
  asyncPatterns?: string[];
}

export function createNode(
  id: string,
  type: ExplorerNodeType,
  opts: NodeOptions = {}
): ExplorerNode {
  const displayName = opts.displayName || id.split(':').pop() || id;
  const isTest = opts.isTest ?? (type === 'ApexClass' && /(?:test|tests)$/i.test(displayName));

  return {
    id,
    displayName,
    type,
    file: opts.file || `classes/${displayName}.cls`,
    metrics: {
      fanIn: opts.fanIn ?? 0,
      fanOut: opts.fanOut ?? 0,
      coupling: (opts.fanIn ?? 0) + (opts.fanOut ?? 0),
      unresolved: 0,
      score: 1.0,
    },
    risk: opts.risk || 'LOW',
    riskReasons: [],
    behavior: {
      isTest,
      publicContractsCount: opts.publicContractsCount ?? 5,
      asyncPatterns: opts.asyncPatterns || [],
      securitySignalsCount: 0,
      queryCount: opts.queryCount ?? 0,
      dmlCount: opts.dmlCount ?? 0,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: opts.risk === 'HIGH',
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: isTest ? 'COVERED' : 'UNTESTED',
    },
  };
}

export interface EdgeOptions {
  relationshipType?: ExplorerRelationshipType;
  method?: string | null;
  evidence?: string;
  confidence?: string;
}

export function createEdge(
  source: string,
  target: string,
  opts: EdgeOptions = {}
): ExplorerEdge {
  const relType = opts.relationshipType || 'type-reference';
  const id = `edge:${source}->${target}:${relType}`;

  const sourceParts = source.split(':');
  const targetParts = target.split(':');

  const sourceName = sourceParts.pop() || source;
  const sourceType = (sourceParts[0] || 'ApexClass') as ExplorerNodeType;

  const targetName = targetParts.pop() || target;
  const targetType = (targetParts[0] || 'ApexClass') as ExplorerNodeType;

  return {
    id,
    source,
    target,
    relationshipType: relType,
    method: opts.method ?? null,
    evidence: opts.evidence || `${sourceName} uses ${targetName}`,
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: opts.confidence || '1.0',
    line: 10,
    column: 5,
    methodOwner: sourceName,
    file: `classes/${sourceName}.cls`,
    canonical: {
      source: {
        type: sourceType,
        name: sourceName,
        method: opts.method || null,
      },
      target: {
        type: targetType,
        name: targetName,
        method: null,
      },
      relationship: {
        type: relType,
        resolution: 'EXACT',
      },
      location: {
        line: 10,
        column: 5,
      },
    },
  };
}

export function recalculateNodeMetrics(nodes: ExplorerNode[], edges: ExplorerEdge[]): void {
  const fanInMap = new Map<string, number>();
  const fanOutMap = new Map<string, number>();

  nodes.forEach(n => {
    fanInMap.set(n.id, 0);
    fanOutMap.set(n.id, 0);
  });

  edges.forEach(e => {
    if (fanOutMap.has(e.source)) {
      fanOutMap.set(e.source, (fanOutMap.get(e.source) || 0) + 1);
    }
    if (fanInMap.has(e.target)) {
      fanInMap.set(e.target, (fanInMap.get(e.target) || 0) + 1);
    }
  });

  nodes.forEach(n => {
    n.metrics.fanIn = fanInMap.get(n.id) || 0;
    n.metrics.fanOut = fanOutMap.get(n.id) || 0;
    n.metrics.coupling = n.metrics.fanIn + n.metrics.fanOut;
  });
}
