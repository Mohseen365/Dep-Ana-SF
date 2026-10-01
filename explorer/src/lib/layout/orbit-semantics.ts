import type { ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../../types/explorer';
import type { ArchitectureLayer } from './types';
import { classifyNodeLayerWithReason, isTestNode } from './layers';
import { discoverFeatures, type FeatureDiscoveryResult } from './features';
import { discoverDomains, type DomainDiscoveryResult } from './domains';
import { classifyFeatureRole, type FeatureRole } from './feature-roles';

/**
 * Authoritative Orbit Node Metadata produced by Workstream A.
 * Strictly semantic facts, zero geometry fields.
 */
export interface OrbitNodeMetadata {
  nodeId: string;
  canonicalNodeType: ExplorerNodeType;
  canonicalLayer: ArchitectureLayer;
  orbitRingIndex: number;
  primaryFeatureId: string;
  primaryDomainId: string;
  orbitSectorId: string;
  semanticOrderKey: string;
  fallbackFlags: {
    isDefaultLayerFallback: boolean;
    isUnassignedFeature: boolean;
    isSharedDomain: boolean;
    isUntypedNodeFallback: boolean;
  };
}

/**
 * Optional execution configuration for projectOrbitSemantics.
 */
export interface OrbitSemanticProjectionOptions {
  featureDiscovery?: FeatureDiscoveryResult;
  domainDiscovery?: DomainDiscoveryResult;
}

/**
 * Complete Orbit Semantic Projection Result.
 */
export interface OrbitSemanticProjectionResult {
  nodes: Map<string, OrbitNodeMetadata>;
  nodeList: OrbitNodeMetadata[];
  ringCounts: Record<number, number>;
  sectorCounts: Record<string, number>;
  featureCount: number;
  domainCount: number;
  fallbackCounts: {
    layerFallback: number;
    featureFallback: number;
    domainFallback: number;
  };
  summary: {
    totalNodes: number;
    totalEdges: number;
    distinctNodeTypes: number;
    ringCount: number;
    sectorCount: number;
    unassignedNodes: number;
    duplicateProjections: number;
  };
}

/**
 * Computes deterministic Orbit Radial Ring Index (0..5) from canonical architecture semantics.
 *
 * Ring Mapping Rules:
 * - Ring 0 (Entry / Presentation): LWCs, Visualforce, ApexTriggers, Flows, Presentation Layer.
 * - Ring 1 (Application / Controllers): Application Layer (Controllers, Handlers, Orchestrators).
 * - Ring 2 (Business Logic / Services): Domain Layer (Services, Domain Models, DTOs).
 * - Ring 3 (Schema Objects): Schema Layer Objects (CustomObject, Object).
 * - Ring 4 (Schema Detail / External): Schema Layer Fields (CustomField, Field) and External.
 * - Ring 5 (Supporting / Satellites / Shared): Apex Tests, Shared Infrastructure, Satellites.
 */
export function computeOrbitRingIndex(
  node: ExplorerNode,
  layer: ArchitectureLayer,
  role: FeatureRole
): number {
  // 1. Supporting / Satellites / Shared Infrastructure -> Ring 5
  if (isTestNode(node) || role === 'SharedInfrastructure' || role === 'FeatureTest') {
    return 5;
  }

  // 2. Fine-grained Schema Detail & External -> Ring 4
  if (node.type === 'Field' || node.type === 'CustomField' || node.type === 'External') {
    return 4;
  }

  // 3. High-level Schema Objects -> Ring 3
  if (node.type === 'Object' || node.type === 'CustomObject') {
    return 3;
  }

  // 4. Perimeter Entry Points & Presentation UI -> Ring 0
  if (
    node.type === 'LWC' ||
    node.type === 'Visualforce' ||
    node.type === 'ApexTrigger' ||
    node.type === 'Flow' ||
    layer === 'presentation'
  ) {
    return 0;
  }

  // 5. Application & Controller Layer -> Ring 1
  if (layer === 'application') {
    return 1;
  }

  // 6. Domain & Service Layer -> Ring 2
  if (layer === 'domain') {
    return 2;
  }

  // 7. Schema fallback (if type was not explicitly Object/Field)
  if (layer === 'schema') {
    return 3;
  }

  // Deterministic Fallback -> Ring 1
  return 1;
}

/**
 * Projects an existing architecture graph into deterministic Orbit Semantic Metadata.
 * Pure function: zero geometry calculation, zero UI/worker dependency, zero graph mutation.
 */
export function projectOrbitSemantics(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: OrbitSemanticProjectionOptions = {}
): OrbitSemanticProjectionResult {
  // Defensive sorting to guarantee input-order invariance
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  // Reuse existing semantic discovery infrastructure
  const featureDiscovery = options.featureDiscovery || discoverFeatures(safeNodes, safeEdges);
  const domainDiscovery = options.domainDiscovery || discoverDomains(safeNodes, safeEdges);

  const nodeMap = new Map<string, OrbitNodeMetadata>();
  const ringCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const sectorCounts: Record<string, number> = {};
  const distinctTypesSet = new Set<ExplorerNodeType>();

  let layerFallbackCount = 0;
  let featureFallbackCount = 0;
  let domainFallbackCount = 0;

  for (const node of safeNodes) {
    const canonicalNodeType: ExplorerNodeType = node.type || 'External';
    distinctTypesSet.add(canonicalNodeType);

    const layerResult = classifyNodeLayerWithReason(node);
    const canonicalLayer = layerResult.layer;
    const isDefaultLayerFallback = layerResult.confidence < 0.6;
    if (isDefaultLayerFallback) {
      layerFallbackCount++;
    }

    const featureRole = classifyFeatureRole(node, { layer: canonicalLayer });
    const orbitRingIndex = computeOrbitRingIndex(node, canonicalLayer, featureRole);

    const featureAssignment = featureDiscovery.assignments.get(node.id);
    const primaryFeatureId = featureAssignment?.primaryFeatureId || 'Unassigned';
    const isUnassignedFeature = primaryFeatureId === 'Unassigned';
    if (isUnassignedFeature) {
      featureFallbackCount++;
    }

    const domainAssignment = domainDiscovery.assignments.get(node.id);
    const primaryDomainId = domainAssignment?.primaryDomain || 'Shared';
    const isSharedDomain = primaryDomainId === 'Shared';
    if (isSharedDomain) {
      domainFallbackCount++;
    }

    // Orbit sector identity = primary feature identity
    const orbitSectorId = primaryFeatureId;

    // Construction of deterministic semantic sort key
    const semanticOrderKey = `R${String(orbitRingIndex).padStart(2, '0')}:S${orbitSectorId}:T${canonicalNodeType}:N${node.id}`;

    const metadata: OrbitNodeMetadata = {
      nodeId: node.id,
      canonicalNodeType,
      canonicalLayer,
      orbitRingIndex,
      primaryFeatureId,
      primaryDomainId,
      orbitSectorId,
      semanticOrderKey,
      fallbackFlags: {
        isDefaultLayerFallback,
        isUnassignedFeature,
        isSharedDomain,
        isUntypedNodeFallback: !node.type,
      },
    };

    nodeMap.set(node.id, metadata);
    ringCounts[orbitRingIndex] = (ringCounts[orbitRingIndex] || 0) + 1;
    sectorCounts[orbitSectorId] = (sectorCounts[orbitSectorId] || 0) + 1;
  }

  // Construct deterministically sorted node list
  const nodeList = Array.from(nodeMap.values()).sort((a, b) =>
    a.semanticOrderKey.localeCompare(b.semanticOrderKey)
  );

  return {
    nodes: nodeMap,
    nodeList,
    ringCounts,
    sectorCounts,
    featureCount: featureDiscovery.features.size,
    domainCount: domainDiscovery.allDomains.length,
    fallbackCounts: {
      layerFallback: layerFallbackCount,
      featureFallback: featureFallbackCount,
      domainFallback: domainFallbackCount,
    },
    summary: {
      totalNodes: safeNodes.length,
      totalEdges: safeEdges.length,
      distinctNodeTypes: distinctTypesSet.size,
      ringCount: Object.keys(ringCounts).length,
      sectorCount: Object.keys(sectorCounts).length,
      unassignedNodes: 0,
      duplicateProjections: 0,
    },
  };
}
