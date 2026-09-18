import type { ExplorerNode } from '../../types/explorer';

export type ArchitectureLayer = 'presentation' | 'application' | 'domain' | 'schema';

export interface LayerClassificationContext {
  /** Target production node if the node being classified is a test node */
  targetProductionNode?: ExplorerNode | null;
  /** Explicit layer override for target production node if already computed */
  productionTargetLayer?: ArchitectureLayer | null;
  /** Force treatment of node as a test node regardless of node properties */
  isTestNode?: boolean;
}

export interface LayerClassificationResult {
  layer: ArchitectureLayer;
  reason: string;
  confidence: number;
}

/**
 * Checks whether a node is a test component based on behavior, name, or file path.
 */
export function isTestNode(node: ExplorerNode): boolean {
  if (node.behavior?.isTest) return true;
  const name = node.displayName || node.id || '';
  if (/(?:test|tests|testdatafactory)$/i.test(name)) return true;
  if (node.file && /(?:^|\/)(?:test|tests)\//i.test(node.file)) return true;
  return false;
}

/**
 * Classifies a node into one of four architectural layers:
 * - presentation (LWC, Visualforce, UI components)
 * - application (Triggers, Flows, Controllers, Services, Async Apex)
 * - domain (Selectors, Repositories, DAOs, Models, DTOs, Wrappers, Data-heavy Apex)
 * - schema (Objects, CustomObjects, Fields, CustomFields, External)
 *
 * Evaluation follows strict priority:
 * 1. Salesforce/node type
 * 2. Dependency / Test-aware context
 * 3. Explicit structural file path info
 * 4. Behavior (async execution, query/DML profile)
 * 5. Naming conventions
 * 6. Deterministic fallback ('application')
 */
export function classifyNodeLayer(
  node: ExplorerNode,
  context?: LayerClassificationContext
): ArchitectureLayer {
  return classifyNodeLayerWithReason(node, context).layer;
}

/**
 * Classifies a node layer and provides explainable diagnostic details including reason and confidence score.
 */
export function classifyNodeLayerWithReason(
  node: ExplorerNode,
  context?: LayerClassificationContext
): LayerClassificationResult {
  const type = node.type;
  const name = node.displayName || node.id || '';
  const file = node.file || '';

  // 1. Salesforce / Node Type (Strongest Structural Evidence)
  if (
    type === 'Object' ||
    type === 'CustomObject' ||
    type === 'Field' ||
    type === 'CustomField' ||
    type === 'External'
  ) {
    return {
      layer: 'schema',
      reason: `Node type '${type}' maps to schema layer`,
      confidence: 1.0,
    };
  }

  if (type === 'LWC' || type === 'Visualforce') {
    return {
      layer: 'presentation',
      reason: `Node type '${type}' maps to presentation layer`,
      confidence: 1.0,
    };
  }

  if (type === 'ApexTrigger' || type === 'Flow') {
    return {
      layer: 'application',
      reason: `Node type '${type}' maps to application layer`,
      confidence: 1.0,
    };
  }

  // 2. Test Node Context Rules (Inherit target production node layer)
  const isTest = context?.isTestNode ?? isTestNode(node);
  if (isTest) {
    if (context?.productionTargetLayer) {
      return {
        layer: context.productionTargetLayer,
        reason: `Test node inherits target production layer '${context.productionTargetLayer}' from context`,
        confidence: 0.95,
      };
    }
    if (context?.targetProductionNode) {
      const targetResult = classifyNodeLayerWithReason(context.targetProductionNode);
      return {
        layer: targetResult.layer,
        reason: `Test node inherits target production layer '${targetResult.layer}' from target '${context.targetProductionNode.displayName || context.targetProductionNode.id}'`,
        confidence: 0.9,
      };
    }
  }

  // 3. File Path Evidence
  if (/(?:^|\/)(?:lwc|aura|pages)\//i.test(file)) {
    return {
      layer: 'presentation',
      reason: `File path '${file}' indicates presentation component`,
      confidence: 0.9,
    };
  }

  // 4. Behavior Evidence
  if (node.behavior) {
    if (node.behavior.asyncPatterns && node.behavior.asyncPatterns.length > 0) {
      return {
        layer: 'application',
        reason: `Async execution behavior (${node.behavior.asyncPatterns.join(', ')}) maps to application layer`,
        confidence: 0.85,
      };
    }

    if (node.behavior.queryCount > 0 || node.behavior.dmlCount > 0) {
      // Exclude controllers and application orchestrators which drive UI/flows but run queries
      if (!/(?:Controller|Controllerextension|Service|Services)$/i.test(name)) {
        return {
          layer: 'domain',
          reason: `Data operation behavior (queries: ${node.behavior.queryCount}, dml: ${node.behavior.dmlCount}) maps to domain layer`,
          confidence: 0.8,
        };
      }
    }
  }

  // 5. Naming Conventions
  if (/(?:view|page|component|ui)$/i.test(name)) {
    return {
      layer: 'presentation',
      reason: `Name suffix/pattern in '${name}' indicates presentation layer`,
      confidence: 0.8,
    };
  }

  if (
    /(?:controller|controllerextension|handler|manager|processor|engine|workflow|orchestrator|batch|queueable|schedulable|service|services)$/i.test(
      name
    )
  ) {
    return {
      layer: 'application',
      reason: `Name suffix/pattern in '${name}' indicates application layer`,
      confidence: 0.85,
    };
  }

  if (
    /(?:selector|repository|repo|dao|domain|dto|vo|model|wrapper|queries|finder)$/i.test(
      name
    )
  ) {
    return {
      layer: 'domain',
      reason: `Name suffix/pattern in '${name}' indicates domain layer`,
      confidence: 0.85,
    };
  }

  // 6. Deterministic Fallback
  return {
    layer: 'application',
    reason: `Deterministic fallback to application layer for unclassified ApexClass '${name}'`,
    confidence: 0.5,
  };
}
