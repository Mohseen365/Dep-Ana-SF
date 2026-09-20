import type { ExplorerNode } from '../../types/explorer';
import type { ArchitectureLayer, ArchitectureNodeAnalysis } from './types';
import type { NodeCentralityAnalysis } from './centrality';
import { isTestNode, isFieldNode } from './analysis';

export type FeatureRole =
  | 'FeatureAnchor'
  | 'FeatureCore'
  | 'FeatureData'
  | 'FeatureBridge'
  | 'FeatureTest'
  | 'SharedInfrastructure';

export interface FeatureRoleContext {
  layer?: ArchitectureLayer | null;
  analysisNode?: ArchitectureNodeAnalysis | null;
  centrality?: NodeCentralityAnalysis | null;
  connectedDomainsCount?: number;
  roleOverride?: string | null;
}

/**
 * Checks if a node represents Shared Infrastructure based on audit thresholds:
 * - fanIn >= 5
 * - role === 'utility' || role === 'configuration'
 * - connected across >= 3 distinct primary domains/features
 * - naming matching common shared infrastructure patterns (Logger, Validator, Gateway, Util, etc.)
 */
export function isSharedInfrastructure(
  node: ExplorerNode,
  context: FeatureRoleContext = {}
): boolean {
  if (isTestNode(node) || isFieldNode(node)) {
    return false;
  }

  const { analysisNode, centrality, connectedDomainsCount, roleOverride } = context;
  const fanIn = analysisNode?.fanIn ?? node.metrics?.fanIn ?? 0;
  const role = (roleOverride || analysisNode?.role || '').toLowerCase();
  const name = node.displayName || node.id || '';

  // 1. Structural Fan-In Threshold (fanIn >= 5)
  if (fanIn >= 5) {
    return true;
  }

  // 2. Explicit Role Classification
  if (role === 'utility' || role === 'configuration') {
    return true;
  }

  // 3. Cross-Domain Connectivity Threshold (>= 3 distinct domains)
  const domainCount = connectedDomainsCount ?? centrality?.connectedDomains?.length ?? 0;
  if (domainCount >= 3) {
    return true;
  }

  // 4. Shared Infrastructure Naming Conventions (Logger, Validator, Gateway, Factory, Adapter, Shared Util)
  if (
    /(?:logger|logservice|validator|gateway|adapter|factory|testdatafactory|constants|sharedutil|collectionutil|stringutil|configservice|configurationservice)$/i.test(
      name
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Determines whether a node can act as a Feature Seed based on audit rules:
 * Eligible seeds: FeatureAnchors (LWC, VF, Controller, Trigger, API, Flow) and unanchored Core Services.
 * Excluded seeds: Tests, Fields, Objects, Shared Infrastructure, Utilities, Configuration.
 */
export function isFeatureSeedCandidate(
  node: ExplorerNode,
  role: FeatureRole,
  context: FeatureRoleContext = {}
): boolean {
  // Hard exclusions
  if (isTestNode(node) || isFieldNode(node)) {
    return false;
  }

  const type = node.type;
  if (
    type === 'Object' ||
    type === 'CustomObject' ||
    type === 'Field' ||
    type === 'CustomField' ||
    type === 'External'
  ) {
    return false;
  }

  if (role === 'SharedInfrastructure' || role === 'FeatureTest' || role === 'FeatureData') {
    return false;
  }

  if (isSharedInfrastructure(node, context)) {
    return false;
  }

  const { analysisNode, roleOverride } = context;
  const rawRole = (roleOverride || analysisNode?.role || '').toLowerCase();
  if (rawRole === 'utility' || rawRole === 'configuration') {
    return false;
  }

  return role === 'FeatureAnchor' || role === 'FeatureCore';
}

/**
 * Classifies a node into a FeatureRole based on factual node facts, layer classification,
 * centrality metrics, and role mapping.
 */
export function classifyFeatureRole(
  node: ExplorerNode,
  context: FeatureRoleContext = {}
): FeatureRole {
  const { layer, analysisNode, centrality, roleOverride } = context;
  const name = node.displayName || node.id || '';
  const type = node.type;
  const rawRole = (roleOverride || analysisNode?.role || '').toLowerCase();

  // 1. Secondary Test / Satellite Node
  if (isTestNode(node) || analysisNode?.isTest || rawRole === 'test') {
    return 'FeatureTest';
  }

  // 2. Shared Infrastructure Protection
  if (isSharedInfrastructure(node, context)) {
    return 'SharedInfrastructure';
  }

  // 3. Feature Bridge (Cross-domain / cross-subsystem spanning)
  if (centrality?.isBridge || analysisNode?.isBridge) {
    return 'FeatureBridge';
  }

  // 4. Feature Anchor (Entry Points, LWCs, Visualforce, Controllers, Triggers, Flows, APIs)
  if (
    type === 'LWC' ||
    type === 'Visualforce' ||
    type === 'ApexTrigger' ||
    type === 'Flow' ||
    rawRole === 'entry-point' ||
    rawRole === 'controller' ||
    layer === 'presentation' ||
    /(?:controller|controllerextension|controllerext|api|resource|endpoint|handler)$/i.test(
      name
    )
  ) {
    return 'FeatureAnchor';
  }

  // 5. Feature Data (Selectors, Repositories, Schema Entities, Custom Objects)
  if (
    type === 'Object' ||
    type === 'CustomObject' ||
    type === 'Field' ||
    type === 'CustomField' ||
    rawRole === 'selector' ||
    rawRole === 'repository' ||
    rawRole === 'data-access' ||
    layer === 'schema' ||
    /(?:selector|repository|repo|dao|queries|finder|dto|vo|model|wrapper)$/i.test(
      name
    )
  ) {
    return 'FeatureData';
  }

  // 6. Feature Core (Services, Business Logic, Application Domain)
  if (
    rawRole === 'service' ||
    rawRole === 'domain' ||
    layer === 'application' ||
    layer === 'domain' ||
    /(?:service|services|manager|processor|engine|workflow|orchestrator|domain)$/i.test(
      name
    )
  ) {
    return 'FeatureCore';
  }

  // Fallback
  return 'FeatureCore';
}

/**
 * Classifies feature roles for all nodes in a graph deterministically.
 */
export function classifyAllFeatureRoles(
  nodes: readonly ExplorerNode[],
  contextMap: Map<string, FeatureRoleContext> = new Map()
): Map<string, FeatureRole> {
  const result = new Map<string, FeatureRole>();
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

  for (const node of sortedNodes) {
    const ctx = contextMap.get(node.id) || {};
    const role = classifyFeatureRole(node, ctx);
    result.set(node.id, role);
  }

  return result;
}
