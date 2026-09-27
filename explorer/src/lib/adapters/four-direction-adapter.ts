import { ExplorerDataSchema, ExplorerNode, ExplorerEdge, ExplorerRelationshipType } from '../../types/explorer';
import { createLayoutGraphIndex } from '../layout/graph-index';
import { discoverFeatures } from '../layout/features';
import { classifyNodeLayer } from '../layout/layers';

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

export interface FourDirectionSubject {
  nodeId: string;
  displayName: string;
  type: string;
  file: string;
  risk: string;
  featureName: string;
  layerName: string;
  metrics: {
    fanIn: number;
    fanOut: number;
    coupling: number;
    unresolved: number;
    score: number;
  };
}

export interface FourDirectionEdgeInfo {
  edgeId: string;
  source: string;
  target: string;
  relationshipType: ExplorerRelationshipType | string;
  method?: string | null;
}

export interface FourDirectionItem {
  nodeId: string;
  displayName: string;
  type: string;
  file: string;
  risk: string;
  direction: CardinalDirection;
  directionLabel: string;
  edges: FourDirectionEdgeInfo[];
  relationshipTypes: string[];
  distance: number;
  featureName: string;
  layerName: string;
}

export interface FourDirectionQuadrant {
  direction: CardinalDirection;
  title: string;
  subtitle: string;
  items: FourDirectionItem[];
  totalCount: number;
}

export interface FourDirectionSummary {
  totalNeighbors: number;
  upstreamCount: number;
  downstreamCount: number;
  leftPeerCount: number;
  rightCrossCount: number;
  selectedNodeId: string;
}

export interface FourDirectionData {
  subject: FourDirectionSubject | null;
  quadrants: {
    up: FourDirectionQuadrant;
    down: FourDirectionQuadrant;
    left: FourDirectionQuadrant;
    right: FourDirectionQuadrant;
  };
  summary: FourDirectionSummary;
  availableNodes: { id: string; displayName: string; type: string }[];
}

export interface FourDirectionAdapterOptions {
  selectedNodeId?: string | null;
}

/**
 * Pure, read-only, deterministic data adapter for Four-Direction View.
 *
 * Maps canonical graph relationships for a selected subject node into
 * four cardinal regions:
 * - Up: Upstream Dependents (Callers / Ingestion)
 * - Down: Downstream Dependencies (Callees / Persistence)
 * - Left: Same-Feature Peers (Intra-Feature Coupling)
 * - Right: Shared Infrastructure & Cross-Feature Dependencies
 */
export function adaptFourDirectionView(
  input: ExplorerDataSchema,
  options?: FourDirectionAdapterOptions
): FourDirectionData {
  const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input?.edges) ? input.edges : [];

  // Defensive copy and deterministic sort by ID for input-order stability
  const safeNodes = [...rawNodes].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
  const safeEdges = [...rawEdges].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));

  const availableNodes = safeNodes.map(n => ({
    id: n.id,
    displayName: n.displayName || n.id,
    type: n.type
  })).sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id));

  if (safeNodes.length === 0) {
    return {
      subject: null,
      quadrants: {
        up: { direction: 'up', title: 'Upstream Dependents', subtitle: 'Callers & Ingesting Components', items: [], totalCount: 0 },
        down: { direction: 'down', title: 'Downstream Dependencies', subtitle: 'Callees & Services/Data', items: [], totalCount: 0 },
        left: { direction: 'left', title: 'Same-Feature Peers', subtitle: 'Intra-Feature Components', items: [], totalCount: 0 },
        right: { direction: 'right', title: 'Shared & Cross-Feature', subtitle: 'Shared Utilities & External Data', items: [], totalCount: 0 },
      },
      summary: {
        totalNeighbors: 0,
        upstreamCount: 0,
        downstreamCount: 0,
        leftPeerCount: 0,
        rightCrossCount: 0,
        selectedNodeId: ''
      },
      availableNodes: []
    };
  }

  // Pre-index graph and discover features
  const index = createLayoutGraphIndex(safeNodes, safeEdges);
  const discovery = discoverFeatures(safeNodes, safeEdges, { index });

  // Resolve subject node
  let subjectNode: ExplorerNode | null = null;
  const requestedId = options?.selectedNodeId;
  if (requestedId && index.nodeById.has(requestedId)) {
    subjectNode = index.nodeById.get(requestedId)!;
  } else {
    // Default subject: highest risk / highest fanIn / first node
    const highRisk = safeNodes.find(n => n.risk === 'HIGH');
    if (highRisk) {
      subjectNode = highRisk;
    } else {
      const topFanIn = [...safeNodes].sort((a, b) => (b.metrics?.fanIn ?? 0) - (a.metrics?.fanIn ?? 0))[0];
      subjectNode = topFanIn || safeNodes[0];
    }
  }

  const subjectAssignment = discovery.assignments.get(subjectNode.id);
  const subjectFeatureId = subjectAssignment?.primaryFeatureId || 'Unassigned';
  const subjectFeatureCluster = discovery.features.get(subjectFeatureId);
  const subjectFeatureName = subjectFeatureCluster?.name || subjectFeatureId;
  const subjectLayer = classifyNodeLayer(subjectNode);

  const subject: FourDirectionSubject = {
    nodeId: subjectNode.id,
    displayName: subjectNode.displayName || subjectNode.id,
    type: subjectNode.type,
    file: subjectNode.file || '',
    risk: subjectNode.risk || 'LOW',
    featureName: subjectFeatureName,
    layerName: subjectLayer.name,
    metrics: {
      fanIn: subjectNode.metrics?.fanIn ?? 0,
      fanOut: subjectNode.metrics?.fanOut ?? 0,
      coupling: subjectNode.metrics?.coupling ?? 0,
      unresolved: subjectNode.metrics?.unresolved ?? 0,
      score: subjectNode.metrics?.score ?? 0,
    }
  };

  // Extract incident edges & neighbor nodes for the subject
  const incidentEdges = index.incidentEdgesByNode.get(subjectNode.id) || [];
  const incidentNeighborIds = index.incidentNeighborsByNode.get(subjectNode.id) || [];

  const itemsUp: FourDirectionItem[] = [];
  const itemsDown: FourDirectionItem[] = [];
  const itemsLeft: FourDirectionItem[] = [];
  const itemsRight: FourDirectionItem[] = [];

  for (const neighborId of incidentNeighborIds) {
    const neighborNode = index.nodeById.get(neighborId);
    if (!neighborNode) continue;

    const neighborAssignment = discovery.assignments.get(neighborId);
    const neighborFeatureId = neighborAssignment?.primaryFeatureId || 'Unassigned';
    const neighborFeatureCluster = discovery.features.get(neighborFeatureId);
    const neighborFeatureName = neighborFeatureCluster?.name || neighborFeatureId;
    const neighborLayer = classifyNodeLayer(neighborNode);

    // Filter connected edges between subjectNode and neighborNode
    const connectedEdges = incidentEdges.filter(
      e => (e.source === subjectNode.id && e.target === neighborId) ||
           (e.target === subjectNode.id && e.source === neighborId)
    );

    const edgeInfos: FourDirectionEdgeInfo[] = connectedEdges.map(e => ({
      edgeId: e.id,
      source: e.source,
      target: e.target,
      relationshipType: e.relationshipType,
      method: e.canonical?.source?.method || e.canonical?.target?.method || e.method || null
    }));

    const relTypes = Array.from(new Set(connectedEdges.map(e => e.relationshipType))).sort();

    const isIncoming = connectedEdges.some(e => e.target === subjectNode.id);
    const isOutgoing = connectedEdges.some(e => e.source === subjectNode.id);

    const isShared = neighborAssignment?.isShared || neighborFeatureId === 'Shared' || neighborFeatureId === 'Unassigned';
    const isSameFeature = !isShared && subjectFeatureId !== 'Shared' && subjectFeatureId !== 'Unassigned' && neighborFeatureId === subjectFeatureId;

    let direction: CardinalDirection = 'right';
    let directionLabel = 'Shared & Cross-Feature';

    if (isShared) {
      direction = 'right';
      directionLabel = 'Shared Infrastructure';
    } else if (isSameFeature) {
      direction = 'left';
      directionLabel = 'Same-Feature Peer';
    } else if (isIncoming && !isOutgoing) {
      direction = 'up';
      directionLabel = 'Upstream Dependent';
    } else if (isOutgoing && !isIncoming) {
      direction = 'down';
      directionLabel = 'Downstream Dependency';
    } else {
      direction = 'right';
      directionLabel = 'Cross-Feature Boundary';
    }

    const item: FourDirectionItem = {
      nodeId: neighborNode.id,
      displayName: neighborNode.displayName || neighborNode.id,
      type: neighborNode.type,
      file: neighborNode.file || '',
      risk: neighborNode.risk || 'LOW',
      direction,
      directionLabel,
      edges: edgeInfos,
      relationshipTypes: relTypes,
      distance: 1,
      featureName: neighborFeatureName,
      layerName: neighborLayer.name,
    };

    if (direction === 'up') itemsUp.push(item);
    else if (direction === 'down') itemsDown.push(item);
    else if (direction === 'left') itemsLeft.push(item);
    else itemsRight.push(item);
  }

  // Sort quadrant items deterministically by display name then ID
  const sortItems = (arr: FourDirectionItem[]) =>
    arr.sort((a, b) => a.displayName.localeCompare(b.displayName) || a.nodeId.localeCompare(b.nodeId));

  sortItems(itemsUp);
  sortItems(itemsDown);
  sortItems(itemsLeft);
  sortItems(itemsRight);

  return {
    subject,
    quadrants: {
      up: {
        direction: 'up',
        title: 'Upstream Dependents',
        subtitle: 'Callers & Ingesting Components',
        items: itemsUp,
        totalCount: itemsUp.length
      },
      down: {
        direction: 'down',
        title: 'Downstream Dependencies',
        subtitle: 'Callees & Services/Data',
        items: itemsDown,
        totalCount: itemsDown.length
      },
      left: {
        direction: 'left',
        title: 'Same-Feature Peers',
        subtitle: 'Intra-Feature Components',
        items: itemsLeft,
        totalCount: itemsLeft.length
      },
      right: {
        direction: 'right',
        title: 'Shared & Cross-Feature',
        subtitle: 'Shared Utilities & External Data',
        items: itemsRight,
        totalCount: itemsRight.length
      }
    },
    summary: {
      totalNeighbors: incidentNeighborIds.length,
      upstreamCount: itemsUp.length,
      downstreamCount: itemsDown.length,
      leftPeerCount: itemsLeft.length,
      rightCrossCount: itemsRight.length,
      selectedNodeId: subjectNode.id
    },
    availableNodes
  };
}
