import { ExplorerDataSchema, ExplorerNode, ExplorerEdge, ExplorerRelationshipType } from '../../types/explorer';
import { createLayoutGraphIndex } from '../layout/graph-index';
import { discoverFeatures, FeatureCluster } from '../layout/features';
import { classifyNodeLayer } from '../layout/layers';

export interface SubwayStation {
  nodeId: string;
  displayName: string;
  type: string;
  file: string;
  risk: string;
  featureId: string;
  featureName: string;
  layerName: string;
  x: number;
  y: number;
  lineIndex: number;
  stationIndex: number;
  isShared: boolean;
  isTransfer: boolean;
  fanIn: number;
  fanOut: number;
  connectedEdgeIds: string[];
}

export interface SubwayLine {
  lineId: string;
  name: string;
  color: string;
  y: number;
  stations: SubwayStation[];
  isShared: boolean;
}

export interface SubwayRouteSegment {
  edgeId: string;
  sourceStationId: string;
  targetStationId: string;
  sourceFeatureId: string;
  targetFeatureId: string;
  relationshipType: ExplorerRelationshipType | string;
  pathSvg: string;
  color: string;
  isCrossLine: boolean;
}

export interface SubwaySummary {
  totalLines: number;
  totalStations: number;
  totalRoutes: number;
  totalTransferHubs: number;
  sharedLineCount: number;
}

export interface SubwayMapData {
  lines: SubwayLine[];
  stations: SubwayStation[];
  stationsById: Map<string, SubwayStation>;
  routes: SubwayRouteSegment[];
  summary: SubwaySummary;
  availableFeatures: { id: string; name: string; color: string; count: number }[];
}

export interface SubwayAdapterOptions {
  selectedFeatureId?: string | null;
  selectedStationId?: string | null;
  lineSpacing?: number;
  stationSpacing?: number;
  startX?: number;
  startY?: number;
}

const DEFAULT_LINE_SPACING = 90;
const DEFAULT_STATION_SPACING = 140;
const DEFAULT_START_X = 120;
const DEFAULT_START_Y = 100;

const FEATURE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#64748b', // slate
];

/**
 * Generates octilinear / orthogonal SVG route paths between two station points.
 * Supports horizontal segments, 45-degree diagonal transitions, and vertical connections.
 */
export function generateSubwayRoutePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number = 12
): string {
  if (Math.abs(y1 - y2) < 2) {
    // Same horizontal line
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  if (Math.abs(x1 - x2) < 2) {
    // Vertical line
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  const signX = dx > 0 ? 1 : -1;
  const signY = dy > 0 ? 1 : -1;

  if (absDx >= absDy) {
    // Octilinear: horizontal -> 45deg diagonal -> horizontal
    const midX = x1 + signX * (absDx - absDy);
    return `M ${x1} ${y1} L ${midX} ${y1} L ${x2} ${y2}`;
  } else {
    // Octilinear: 45deg diagonal -> vertical -> horizontal
    const midY = y1 + signY * (absDy - absDx);
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${y2}`;
  }
}

/**
 * Pure, read-only, deterministic data adapter for Architecture Subway Map.
 *
 * Maps canonical graph features and component relationships into a schematic
 * subway map system with tracks, stations, transfer hubs, and octilinear routes.
 */
export function adaptSubwayMap(
  input: ExplorerDataSchema,
  options?: SubwayAdapterOptions
): SubwayMapData {
  const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input?.edges) ? input.edges : [];

  // Deterministic sorting by ID
  const safeNodes = [...rawNodes].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
  const safeEdges = [...rawEdges].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));

  if (safeNodes.length === 0) {
    return {
      lines: [],
      stations: [],
      stationsById: new Map(),
      routes: [],
      summary: {
        totalLines: 0,
        totalStations: 0,
        totalRoutes: 0,
        totalTransferHubs: 0,
        sharedLineCount: 0,
      },
      availableFeatures: [],
    };
  }

  const index = createLayoutGraphIndex(safeNodes, safeEdges);
  const discovery = discoverFeatures(safeNodes, safeEdges, { index });

  const lineSpacing = options?.lineSpacing ?? DEFAULT_LINE_SPACING;
  const stationSpacing = options?.stationSpacing ?? DEFAULT_STATION_SPACING;
  const startX = options?.startX ?? DEFAULT_START_X;
  const startY = options?.startY ?? DEFAULT_START_Y;

  // Helper to determine if a cluster represents shared infrastructure
  const isClusterShared = (cluster: FeatureCluster) =>
    cluster.id === 'Shared' || (cluster.roleDistribution?.SharedInfrastructure ?? 0) > 0;

  // Group features deterministically
  const sortedFeatureClusters: FeatureCluster[] = Array.from(discovery.features.values()).sort((a, b) => {
    const sharedA = isClusterShared(a);
    const sharedB = isClusterShared(b);
    if (sharedA !== sharedB) {
      return sharedA ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });

  const lines: SubwayLine[] = [];
  const stations: SubwayStation[] = [];
  const stationsById = new Map<string, SubwayStation>();

  let currentY = startY;

  sortedFeatureClusters.forEach((cluster, lineIdx) => {
    const nodeIds = Array.from(
      new Set([...(cluster.primaryNodeIds || []), ...(cluster.secondaryNodeIds || [])])
    );

    const clusterNodes = nodeIds
      .map(id => index.nodeById.get(id))
      .filter((n): n is ExplorerNode => n !== undefined)
      .sort((a, b) => {
        const layerA = classifyNodeLayer(a).order;
        const layerB = classifyNodeLayer(b).order;
        if (layerA !== layerB) return layerA - layerB;
        const fanInA = index.incomingEdgesByNode.get(a.id)?.length ?? 0;
        const fanOutA = index.outgoingEdgesByNode.get(a.id)?.length ?? 0;
        const degreeA = fanInA + fanOutA;

        const fanInB = index.incomingEdgesByNode.get(b.id)?.length ?? 0;
        const fanOutB = index.outgoingEdgesByNode.get(b.id)?.length ?? 0;
        const degreeB = fanInB + fanOutB;

        if (degreeB !== degreeA) return degreeB - degreeA;
        return (a.displayName || a.id).localeCompare(b.displayName || b.id);
      });

    const lineColor = FEATURE_COLORS[lineIdx % FEATURE_COLORS.length];
    const isShared = isClusterShared(cluster);
    const lineStations: SubwayStation[] = [];

    clusterNodes.forEach((node, stationIdx) => {
      const incidentEdges = index.incidentEdgesByNode.get(node.id) || [];
      const incidentNeighborIds = index.incidentNeighborsByNode.get(node.id) || [];

      // A station is a transfer hub if it connects across features
      let isTransfer = false;
      for (const neighborId of incidentNeighborIds) {
        const neighborAssignment = discovery.assignments.get(neighborId);
        if (neighborAssignment && neighborAssignment.primaryFeatureId !== cluster.id) {
          isTransfer = true;
          break;
        }
      }

      const layer = classifyNodeLayer(node);
      const stationX = startX + stationIdx * stationSpacing;
      const fanIn = index.incomingEdgesByNode.get(node.id)?.length ?? 0;
      const fanOut = index.outgoingEdgesByNode.get(node.id)?.length ?? 0;

      const station: SubwayStation = {
        nodeId: node.id,
        displayName: node.displayName || node.id,
        type: node.type,
        file: node.file || '',
        risk: node.risk || 'LOW',
        featureId: cluster.id,
        featureName: cluster.name,
        layerName: layer.name,
        x: stationX,
        y: currentY,
        lineIndex: lineIdx,
        stationIndex: stationIdx,
        isShared,
        isTransfer,
        fanIn,
        fanOut,
        connectedEdgeIds: incidentEdges.map(e => e.id).sort(),
      };

      lineStations.push(station);
      stations.push(station);
      stationsById.set(node.id, station);
    });

    const subwayLine: SubwayLine = {
      lineId: cluster.id,
      name: cluster.name,
      color: lineColor,
      y: currentY,
      stations: lineStations,
      isShared,
    };

    lines.push(subwayLine);
    currentY += lineSpacing;
  });

  // Calculate route segments for edges
  const routes: SubwayRouteSegment[] = [];

  safeEdges.forEach(edge => {
    const sourceStation = stationsById.get(edge.source);
    const targetStation = stationsById.get(edge.target);

    if (!sourceStation || !targetStation) return;

    const isCrossLine = sourceStation.featureId !== targetStation.featureId;
    const sourceLine = lines[sourceStation.lineIndex];
    const color = isCrossLine ? '#94a3b8' : (sourceLine?.color || '#3b82f6');

    const pathSvg = generateSubwayRoutePath(
      sourceStation.x,
      sourceStation.y,
      targetStation.x,
      targetStation.y
    );

    routes.push({
      edgeId: edge.id,
      sourceStationId: sourceStation.nodeId,
      targetStationId: targetStation.nodeId,
      sourceFeatureId: sourceStation.featureId,
      targetFeatureId: targetStation.featureId,
      relationshipType: edge.relationshipType,
      pathSvg,
      color,
      isCrossLine,
    });
  });

  const totalTransferHubs = stations.filter(s => s.isTransfer).length;
  const sharedLineCount = lines.filter(l => l.isShared).length;

  const availableFeatures = lines.map(l => ({
    id: l.lineId,
    name: l.name,
    color: l.color,
    count: l.stations.length,
  }));

  return {
    lines,
    stations,
    stationsById,
    routes,
    summary: {
      totalLines: lines.length,
      totalStations: stations.length,
      totalRoutes: routes.length,
      totalTransferHubs,
      sharedLineCount,
    },
    availableFeatures,
  };
}
