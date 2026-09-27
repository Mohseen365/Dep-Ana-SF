import type { ExplorerDataSchema, ExplorerNode } from '../../types/explorer';
import type { ArchitectureLayer } from '../layout/types';
import { classifyNodeLayer } from '../layout/layers';
import {
  discoverFeatures,
  type FeatureDiscoveryOptions,
  type FeatureCluster,
} from '../layout/features';
import { type FeatureRole } from '../layout/feature-roles';
import { isTestNode, isFieldNode } from '../layout/analysis';

export type TreemapNodeType = 'root' | 'domain' | 'feature' | 'role' | 'component';

export type TreemapMetricMode = 'count' | 'fanIn' | 'fanOut' | 'coupling' | 'score';

export interface TreemapNodeMetrics {
  count: number;
  fanIn: number;
  fanOut: number;
  coupling: number;
  score: number;
}

export interface TreemapNode {
  id: string;
  parentId: string | null;
  type: TreemapNodeType;
  displayName: string;
  childIds: string[];
  depth: number;

  // Sizing metric values
  value: number; // Sizing value according to current metricMode
  metrics: TreemapNodeMetrics;

  // Structural identities
  sourceNodeId?: string;
  sourceFeatureId?: string;
  domain?: string;
  layer?: ArchitectureLayer;
  featureRole?: FeatureRole;

  // Component metadata (when type === 'component')
  entityType?: string;
  risk?: string;
  isTest?: boolean;
  isField?: boolean;
}

export interface TreemapSummary {
  totalNodes: number;
  maxDepth: number;
  domainCount: number;
  featureCount: number;
  componentCount: number;
  totalMetricValue: number;
}

export interface TreemapData {
  rootId: string;
  nodes: Record<string, TreemapNode>;
  summary: TreemapSummary;
  metricMode: TreemapMetricMode;
}

export interface TreemapAdapterOptions extends FeatureDiscoveryOptions {
  rootName?: string;
  metricMode?: TreemapMetricMode;
}

function getNodeValue(metrics: TreemapNodeMetrics, metricMode: TreemapMetricMode): number {
  switch (metricMode) {
    case 'fanIn':
      return metrics.fanIn;
    case 'fanOut':
      return metrics.fanOut;
    case 'coupling':
      return metrics.coupling;
    case 'score':
      return metrics.score;
    case 'count':
    default:
      return metrics.count;
  }
}

/**
 * Pure, deterministic data adapter for the Architecture Treemap lens.
 * Transforms canonical ExplorerDataSchema into a strongly-typed hierarchy
 * (Root -> Domain -> Feature -> Role -> Component) using existing feature analytics primitives,
 * aggregating metrics at every container level.
 */
export function adaptTreemap(
  input: ExplorerDataSchema,
  options: TreemapAdapterOptions = {}
): TreemapData {
  const metricMode: TreemapMetricMode = options.metricMode ?? 'count';
  const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input?.edges) ? input.edges : [];

  // Defensive sort of input nodes by ID to ensure order-invariance
  const nodes: ExplorerNode[] = [...rawNodes].sort((a, b) => a.id.localeCompare(b.id));

  const rootId = 'root';
  const rootName = options.rootName ?? 'Architecture Treemap';

  if (nodes.length === 0) {
    const emptyMetrics: TreemapNodeMetrics = { count: 0, fanIn: 0, fanOut: 0, coupling: 0, score: 0 };
    const rootNode: TreemapNode = {
      id: rootId,
      parentId: null,
      type: 'root',
      displayName: rootName,
      childIds: [],
      depth: 0,
      value: 0,
      metrics: emptyMetrics,
    };

    return {
      rootId,
      nodes: { [rootId]: rootNode },
      summary: {
        totalNodes: 1,
        maxDepth: 0,
        domainCount: 0,
        featureCount: 0,
        componentCount: 0,
        totalMetricValue: 0,
      },
      metricMode,
    };
  }

  // 1. Run Feature Discovery primitive
  const discovery = discoverFeatures(nodes, rawEdges, options);

  // 2. Map components to feature clusters, roles, and domains
  const featureComponentMap = new Map<string, Map<FeatureRole, ExplorerNode[]>>();
  const featureDomainMap = new Map<string, string>();

  discovery.features.forEach((cluster, featureId) => {
    featureComponentMap.set(featureId, new Map());
    const primaryDomain = cluster.domains.length > 0 ? cluster.domains[0] : 'Shared';
    featureDomainMap.set(featureId, primaryDomain);
  });

  if (!featureComponentMap.has('Unassigned')) {
    featureComponentMap.set('Unassigned', new Map());
    featureDomainMap.set('Unassigned', 'Unassigned');
  }

  if (!featureComponentMap.has('Shared')) {
    featureComponentMap.set('Shared', new Map());
    featureDomainMap.set('Shared', 'Shared');
  }

  nodes.forEach(node => {
    const assignment = discovery.assignments.get(node.id);
    const featureId = assignment?.primaryFeatureId ?? 'Unassigned';
    const role: FeatureRole = assignment?.featureRole ?? 'FeatureCore';

    if (!featureComponentMap.has(featureId)) {
      featureComponentMap.set(featureId, new Map());
      const cluster = discovery.features.get(featureId);
      const domain = cluster?.domains && cluster.domains.length > 0 ? cluster.domains[0] : 'Shared';
      featureDomainMap.set(featureId, domain);
    }

    const roleMap = featureComponentMap.get(featureId)!;
    if (!roleMap.has(role)) {
      roleMap.set(role, []);
    }
    roleMap.get(role)!.push(node);
  });

  // Clean up empty features
  const activeFeatureIds: string[] = [];
  featureComponentMap.forEach((roleMap, featureId) => {
    let hasNodes = false;
    roleMap.forEach(nList => {
      if (nList.length > 0) hasNodes = true;
    });
    if (hasNodes) {
      activeFeatureIds.push(featureId);
    }
  });

  // Sort active feature IDs deterministically
  activeFeatureIds.sort((a, b) => a.localeCompare(b));

  // Group features by domain
  const domainFeatureMap = new Map<string, string[]>();
  activeFeatureIds.forEach(featureId => {
    const domainName = featureDomainMap.get(featureId) || 'Shared';
    if (!domainFeatureMap.has(domainName)) {
      domainFeatureMap.set(domainName, []);
    }
    domainFeatureMap.get(domainName)!.push(featureId);
  });

  // Sort domain names deterministically
  const sortedDomainNames = Array.from(domainFeatureMap.keys()).sort((a, b) => a.localeCompare(b));

  // 3. Build Treemap Hierarchy Nodes
  const treeNodes: Record<string, TreemapNode> = {};
  const domainNodeIds: string[] = [];

  let domainCount = 0;
  let featureCount = 0;
  let componentCount = 0;

  const rootMetrics: TreemapNodeMetrics = { count: 0, fanIn: 0, fanOut: 0, coupling: 0, score: 0 };

  sortedDomainNames.forEach(domainName => {
    const domainNodeId = `domain_${domainName}`;
    domainNodeIds.push(domainNodeId);
    domainCount++;

    const featureIdsInDomain = domainFeatureMap.get(domainName)!.sort((a, b) => a.localeCompare(b));
    const featureTreeNodeIds: string[] = [];

    const domainMetrics: TreemapNodeMetrics = { count: 0, fanIn: 0, fanOut: 0, coupling: 0, score: 0 };

    featureIdsInDomain.forEach(featureId => {
      const featureTreeNodeId = `feature_${featureId}`;
      featureTreeNodeIds.push(featureTreeNodeId);
      featureCount++;

      const cluster: FeatureCluster | undefined = discovery.features.get(featureId);
      const featureDisplayName = cluster?.name ?? featureId.replace(/^feature_/, '');

      const roleMap = featureComponentMap.get(featureId)!;
      const sortedRoles = Array.from(roleMap.keys()).sort((a, b) => a.localeCompare(b));
      const roleTreeNodeIds: string[] = [];

      const featureMetrics: TreemapNodeMetrics = { count: 0, fanIn: 0, fanOut: 0, coupling: 0, score: 0 };

      sortedRoles.forEach(role => {
        const compNodes = roleMap.get(role)!;
        if (compNodes.length === 0) return;

        const roleTreeNodeId = `role_${featureId}_${role}`;
        roleTreeNodeIds.push(roleTreeNodeId);

        compNodes.sort((a, b) => a.id.localeCompare(b.id));
        const compTreeNodeIds: string[] = [];

        const roleMetrics: TreemapNodeMetrics = { count: 0, fanIn: 0, fanOut: 0, coupling: 0, score: 0 };

        compNodes.forEach(node => {
          const compTreeNodeId = `component_${node.id}`;
          compTreeNodeIds.push(compTreeNodeId);
          componentCount++;

          const layer = classifyNodeLayer(node);

          const fanIn = node.metrics?.fanIn ?? 0;
          const fanOut = node.metrics?.fanOut ?? 0;
          const coupling = node.metrics?.coupling ?? (fanIn + fanOut);
          const score = node.metrics?.score ?? 0;

          const compMetrics: TreemapNodeMetrics = {
            count: 1,
            fanIn,
            fanOut,
            coupling,
            score,
          };

          roleMetrics.count += compMetrics.count;
          roleMetrics.fanIn += compMetrics.fanIn;
          roleMetrics.fanOut += compMetrics.fanOut;
          roleMetrics.coupling += compMetrics.coupling;
          roleMetrics.score += compMetrics.score;

          treeNodes[compTreeNodeId] = {
            id: compTreeNodeId,
            parentId: roleTreeNodeId,
            type: 'component',
            displayName: node.displayName || node.id,
            childIds: [],
            depth: 4,
            value: getNodeValue(compMetrics, metricMode),
            metrics: compMetrics,
            sourceNodeId: node.id,
            sourceFeatureId: featureId,
            domain: domainName,
            layer,
            featureRole: role,
            entityType: node.type,
            risk: node.risk,
            isTest: isTestNode(node),
            isField: isFieldNode(node),
          };
        });

        featureMetrics.count += roleMetrics.count;
        featureMetrics.fanIn += roleMetrics.fanIn;
        featureMetrics.fanOut += roleMetrics.fanOut;
        featureMetrics.coupling += roleMetrics.coupling;
        featureMetrics.score += roleMetrics.score;

        treeNodes[roleTreeNodeId] = {
          id: roleTreeNodeId,
          parentId: featureTreeNodeId,
          type: 'role',
          displayName: role,
          childIds: compTreeNodeIds,
          depth: 3,
          value: getNodeValue(roleMetrics, metricMode),
          metrics: roleMetrics,
          sourceFeatureId: featureId,
          domain: domainName,
          featureRole: role,
        };
      });

      domainMetrics.count += featureMetrics.count;
      domainMetrics.fanIn += featureMetrics.fanIn;
      domainMetrics.fanOut += featureMetrics.fanOut;
      domainMetrics.coupling += featureMetrics.coupling;
      domainMetrics.score += featureMetrics.score;

      treeNodes[featureTreeNodeId] = {
        id: featureTreeNodeId,
        parentId: domainNodeId,
        type: 'feature',
        displayName: featureDisplayName,
        childIds: roleTreeNodeIds,
        depth: 2,
        value: getNodeValue(featureMetrics, metricMode),
        metrics: featureMetrics,
        sourceFeatureId: featureId,
        domain: domainName,
      };
    });

    rootMetrics.count += domainMetrics.count;
    rootMetrics.fanIn += domainMetrics.fanIn;
    rootMetrics.fanOut += domainMetrics.fanOut;
    rootMetrics.coupling += domainMetrics.coupling;
    rootMetrics.score += domainMetrics.score;

    treeNodes[domainNodeId] = {
      id: domainNodeId,
      parentId: rootId,
      type: 'domain',
      displayName: `${domainName} Domain`,
      childIds: featureTreeNodeIds,
      depth: 1,
      value: getNodeValue(domainMetrics, metricMode),
      metrics: domainMetrics,
      domain: domainName,
    };
  });

  // Construct Root Node
  treeNodes[rootId] = {
    id: rootId,
    parentId: null,
    type: 'root',
    displayName: rootName,
    childIds: domainNodeIds,
    depth: 0,
    value: getNodeValue(rootMetrics, metricMode),
    metrics: rootMetrics,
  };

  const totalTreeNodes = Object.keys(treeNodes).length;
  const maxDepth = componentCount > 0 ? 4 : totalTreeNodes > 1 ? 1 : 0;

  return {
    rootId,
    nodes: treeNodes,
    summary: {
      totalNodes: totalTreeNodes,
      maxDepth,
      domainCount,
      featureCount,
      componentCount,
      totalMetricValue: treeNodes[rootId].value,
    },
    metricMode,
  };
}
