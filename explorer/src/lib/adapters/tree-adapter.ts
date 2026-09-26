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

export type FeatureTreeNodeType = 'root' | 'domain' | 'feature' | 'role' | 'component';

export interface FeatureTreeNode {
  id: string;
  parentId: string | null;
  type: FeatureTreeNodeType;
  displayName: string;
  childIds: string[];
  depth: number;

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

export interface FeatureTreeSummary {
  totalNodes: number;
  maxDepth: number;
  domainCount: number;
  featureCount: number;
  componentCount: number;
}

export interface FeatureTreeData {
  rootId: string;
  nodes: Record<string, FeatureTreeNode>;
  summary: FeatureTreeSummary;
}

export interface TreeAdapterOptions extends FeatureDiscoveryOptions {
  rootName?: string;
}

/**
 * Pure, deterministic data adapter for the Feature Tree / Hierarchy lens.
 * Transforms canonical ExplorerDataSchema into a strongly-typed hierarchy
 * (Root -> Domain -> Feature -> Role -> Component) using existing feature analytics primitives.
 */
export function adaptFeatureTree(
  input: ExplorerDataSchema,
  options: TreeAdapterOptions = {}
): FeatureTreeData {
  const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input?.edges) ? input.edges : [];

  // Defensive sort of input nodes by ID to ensure order-invariance
  const nodes: ExplorerNode[] = [...rawNodes].sort((a, b) => a.id.localeCompare(b.id));

  const rootId = 'root';
  const rootName = options.rootName ?? 'Architecture Hierarchy';

  if (nodes.length === 0) {
    const rootNode: FeatureTreeNode = {
      id: rootId,
      parentId: null,
      type: 'root',
      displayName: rootName,
      childIds: [],
      depth: 0,
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
      },
    };
  }

  // 1. Run Feature Discovery primitive
  const discovery = discoverFeatures(nodes, rawEdges, options);

  // 2. Map nodes to feature clusters, roles, and domains
  // Group components by feature -> role
  const featureComponentMap = new Map<string, Map<FeatureRole, ExplorerNode[]>>();
  const featureDomainMap = new Map<string, string>();

  // Initialize feature map from discovery
  discovery.features.forEach((cluster, featureId) => {
    featureComponentMap.set(featureId, new Map());
    const primaryDomain = cluster.domains.length > 0 ? cluster.domains[0] : 'Shared';
    featureDomainMap.set(featureId, primaryDomain);
  });

  // Ensure 'Unassigned' feature bucket exists if needed
  if (!featureComponentMap.has('Unassigned')) {
    featureComponentMap.set('Unassigned', new Map());
    featureDomainMap.set('Unassigned', 'Unassigned');
  }

  // Ensure 'Shared' feature bucket exists if needed
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

  // 3. Build Hierarchy Tree Nodes
  const treeNodes: Record<string, FeatureTreeNode> = {};
  const domainNodeIds: string[] = [];

  let domainCount = 0;
  let featureCount = 0;
  let componentCount = 0;

  sortedDomainNames.forEach(domainName => {
    const domainNodeId = `domain_${domainName}`;
    domainNodeIds.push(domainNodeId);
    domainCount++;

    const featureIdsInDomain = domainFeatureMap.get(domainName)!.sort((a, b) => a.localeCompare(b));
    const featureTreeNodeIds: string[] = [];

    featureIdsInDomain.forEach(featureId => {
      const featureTreeNodeId = `feature_${featureId}`;
      featureTreeNodeIds.push(featureTreeNodeId);
      featureCount++;

      const cluster: FeatureCluster | undefined = discovery.features.get(featureId);
      const featureDisplayName = cluster?.name ?? featureId.replace(/^feature_/, '');

      const roleMap = featureComponentMap.get(featureId)!;
      const sortedRoles = Array.from(roleMap.keys()).sort((a, b) => a.localeCompare(b));
      const roleTreeNodeIds: string[] = [];

      sortedRoles.forEach(role => {
        const compNodes = roleMap.get(role)!;
        if (compNodes.length === 0) return;

        const roleTreeNodeId = `role_${featureId}_${role}`;
        roleTreeNodeIds.push(roleTreeNodeId);

        compNodes.sort((a, b) => a.id.localeCompare(b.id));
        const compTreeNodeIds: string[] = [];

        compNodes.forEach(node => {
          const compTreeNodeId = `component_${node.id}`;
          compTreeNodeIds.push(compTreeNodeId);
          componentCount++;

          const layer = classifyNodeLayer(node);

          treeNodes[compTreeNodeId] = {
            id: compTreeNodeId,
            parentId: roleTreeNodeId,
            type: 'component',
            displayName: node.displayName || node.id,
            childIds: [],
            depth: 4,
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

        treeNodes[roleTreeNodeId] = {
          id: roleTreeNodeId,
          parentId: featureTreeNodeId,
          type: 'role',
          displayName: role,
          childIds: compTreeNodeIds,
          depth: 3,
          sourceFeatureId: featureId,
          domain: domainName,
          featureRole: role,
        };
      });

      treeNodes[featureTreeNodeId] = {
        id: featureTreeNodeId,
        parentId: domainNodeId,
        type: 'feature',
        displayName: featureDisplayName,
        childIds: roleTreeNodeIds,
        depth: 2,
        sourceFeatureId: featureId,
        domain: domainName,
      };
    });

    treeNodes[domainNodeId] = {
      id: domainNodeId,
      parentId: rootId,
      type: 'domain',
      displayName: `${domainName} Domain`,
      childIds: featureTreeNodeIds,
      depth: 1,
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
    },
  };
}
