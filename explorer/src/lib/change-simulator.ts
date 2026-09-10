import { ExplorerDataSchema, ExplorerRiskLevel } from '../types/explorer';

export type SimulationChangeType =
  | 'general'
  | 'rename'
  | 'remove'
  | 'method'
  | 'field'
  | 'object';

export type BlastRadiusLevel = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface ChangeTypeOption {
  type: SimulationChangeType;
  label: string;
  description: string;
}

export const CHANGE_TYPE_OPTIONS: ChangeTypeOption[] = [
  {
    type: 'general',
    label: 'General component change',
    description: 'Estimates architectural impact using existing deterministic component dependency graphs.'
  },
  {
    type: 'rename',
    label: 'Rename component',
    description: 'Identifies all dependent components and references that may need symbol updates.'
  },
  {
    type: 'remove',
    label: 'Remove component',
    description: 'High-consequence change identifying all components and tests dependent on this target.'
  },
  {
    type: 'method',
    label: 'Method / API signature change',
    description: 'Highlights method-level callers and relationships where source evidence supports it.'
  },
  {
    type: 'field',
    label: 'Field change',
    description: 'Evaluates field-level references, SOQL field access, and component field bindings.'
  },
  {
    type: 'object',
    label: 'Object change',
    description: 'Evaluates object schema relationships, trigger-on bindings, and SOQL object queries.'
  }
];

export interface SimulationResult {
  originNodeId: string;
  originNodeName: string;
  originNodeType: string;
  changeType: SimulationChangeType;
  changeTypeLabel: string;
  semanticExplanation: string;
  directDependentsCount: number;
  transitiveDependentsCount: number;
  impactedComponentsCount: number;
  impactedTestsCount: number;
  cyclesInvolvedCount: number;
  unresolvedReferencesCount: number;
  risk: ExplorerRiskLevel;
  blastRadius: BlastRadiusLevel;
  blastRadiusExplanation: string;
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  impactedTestIds: string[];
}

export function classifyBlastRadius(
  transitiveDependentsCount: number,
  risk: ExplorerRiskLevel,
  cyclesInvolvedCount: number,
  unresolvedReferencesCount: number
): { level: BlastRadiusLevel; explanation: string } {
  if (cyclesInvolvedCount > 0) {
    return {
      level: 'LARGE',
      explanation: `LARGE blast radius: Component participates in ${cyclesInvolvedCount} circular dependency cycle(s).`
    };
  }
  if (transitiveDependentsCount >= 10) {
    return {
      level: 'LARGE',
      explanation: `LARGE blast radius: Modifying this component affects ${transitiveDependentsCount} transitive dependents across the repository.`
    };
  }
  if (risk === 'HIGH') {
    return {
      level: 'LARGE',
      explanation: 'LARGE blast radius: Target component is classified as HIGH risk by analyzer metrics.'
    };
  }
  if (transitiveDependentsCount >= 3) {
    return {
      level: 'MEDIUM',
      explanation: `MEDIUM blast radius: Component affects ${transitiveDependentsCount} transitive dependents.`
    };
  }
  if (risk === 'MEDIUM') {
    return {
      level: 'MEDIUM',
      explanation: 'MEDIUM blast radius: Target component is classified as MEDIUM risk.'
    };
  }
  if (unresolvedReferencesCount > 0) {
    return {
      level: 'MEDIUM',
      explanation: `MEDIUM blast radius: Contains ${unresolvedReferencesCount} unresolved reference(s).`
    };
  }
  return {
    level: 'SMALL',
    explanation: 'SMALL blast radius: Component has minimal impact on downstream dependents.'
  };
}

export function simulateChange(
  data: ExplorerDataSchema,
  nodeId: string,
  changeType: SimulationChangeType = 'general'
): SimulationResult | null {
  const node = data.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const impactSummary = data.impactSummaries[nodeId] || {
    id: nodeId,
    directDependencies: [],
    directDependents: [],
    transitiveDependencies: [],
    transitiveDependents: [],
    impactedTests: [],
    totalImpactCount: 0
  };

  const cyclesInvolved = data.cycles.filter(cycle => cycle.nodes.includes(nodeId));
  const cyclesInvolvedCount = cyclesInvolved.length;

  const unresolvedForNode = data.unresolvedReferences.filter(
    u => u.sourceNodeId === nodeId
  );
  const unresolvedReferencesCount = unresolvedForNode.length;

  const affectedNodeSet = new Set<string>();
  affectedNodeSet.add(nodeId);
  impactSummary.transitiveDependents.forEach(depId => affectedNodeSet.add(depId));

  const affectedEdgeSet = new Set<string>();
  data.edges.forEach(edge => {
    if (edge.target === nodeId || (affectedNodeSet.has(edge.source) && affectedNodeSet.has(edge.target))) {
      if (changeType === 'method') {
        if (edge.method || edge.relationshipType === 'method-call' || edge.target === nodeId) {
          affectedEdgeSet.add(edge.id);
        }
      } else if (changeType === 'field') {
        if (
          edge.relationshipType === 'field-reference' ||
          edge.relationshipType === 'soql-field' ||
          edge.target === nodeId
        ) {
          affectedEdgeSet.add(edge.id);
        }
      } else if (changeType === 'object') {
        if (
          edge.relationshipType === 'soql-object' ||
          edge.relationshipType === 'trigger-on' ||
          edge.relationshipType === 'trigger-object' ||
          edge.target === nodeId
        ) {
          affectedEdgeSet.add(edge.id);
        }
      } else {
        affectedEdgeSet.add(edge.id);
      }
    }
  });

  const directDependentsCount = impactSummary.directDependents.length;
  const transitiveDependentsCount = impactSummary.transitiveDependents.length;
  const impactedTestsCount = impactSummary.impactedTests.length;
  const impactedComponentsCount = impactSummary.totalImpactCount;

  const option = CHANGE_TYPE_OPTIONS.find(o => o.type === changeType) || CHANGE_TYPE_OPTIONS[0];

  const blastRadiusInfo = classifyBlastRadius(
    transitiveDependentsCount,
    node.risk,
    cyclesInvolvedCount,
    unresolvedReferencesCount
  );

  let semanticExplanation = option.description;
  if (changeType === 'remove') {
    semanticExplanation = 'High-consequence simulation: Removing this component will break all dependent components and test suites.';
  } else if (changeType === 'rename') {
    semanticExplanation = 'Rename simulation: All dependent callers and imported references will require explicit symbol updates.';
  }

  return {
    originNodeId: node.id,
    originNodeName: node.displayName,
    originNodeType: node.type,
    changeType,
    changeTypeLabel: option.label,
    semanticExplanation,
    directDependentsCount,
    transitiveDependentsCount,
    impactedComponentsCount,
    impactedTestsCount,
    cyclesInvolvedCount,
    unresolvedReferencesCount,
    risk: node.risk,
    blastRadius: blastRadiusInfo.level,
    blastRadiusExplanation: blastRadiusInfo.explanation,
    affectedNodeIds: Array.from(affectedNodeSet),
    affectedEdgeIds: Array.from(affectedEdgeSet),
    impactedTestIds: impactSummary.impactedTests
  };
}
