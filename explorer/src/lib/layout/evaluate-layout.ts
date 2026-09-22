import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import {
  type PositionMap,
  type LayoutMetricOptions,
  type DomainCohesionResult,
  type ComponentSeparationResult,
  type HubLocalityResult,
  type BridgePlacementResult,
  type DetailedCrossingBreakdown,
  edgeCrossingCount,
  calculateDetailedEdgeCrossings,
  averageEdgeLength,
  maxEdgeLength,
  nodeOverlapCount,
  primaryNodeOverlapCount,
  satelliteNodeOverlapCount,
  minimumNodeClearance,
  layerViolationCount,
  domainCohesion,
  componentSeparation,
  hubLocality,
  bridgePlacement,
} from './metrics';
import { classifyNodeLayer } from './layers';
import { isTestNode, isFieldNode, findParentProductionNodeId, findParentObjectId } from './analysis';

export interface CrossingEdgePair {
  sourceA: string;
  targetA: string;
  sourceB: string;
  targetB: string;
}

export interface LayerViolationEdge {
  source: string;
  target: string;
}

export interface SatelliteLocalityResult {
  /** Average Euclidean distance between test nodes and their production targets */
  averageTestToTargetDistance: number | null;
  /** Total count of test nodes with resolved target positions */
  testCountWithTarget: number;
  /** Breakdown of test-to-target distances keyed by test nodeId (sorted deterministically) */
  testDistances: Record<string, number>;

  /** Average Euclidean distance between field nodes and their parent objects */
  averageFieldToObjectDistance: number | null;
  /** Total count of field nodes with resolved object positions */
  fieldCountWithObject: number;
  /** Breakdown of field-to-object distances keyed by field nodeId (sorted deterministically) */
  fieldDistances: Record<string, number>;

  /** Average Euclidean distance between trigger nodes and their handler nodes */
  averageTriggerToHandlerDistance: number | null;
  /** Total count of trigger-handler pairs evaluated */
  triggerHandlerPairCount: number;
  /** Breakdown of trigger-to-handler distances keyed by "triggerId->handlerId" (sorted deterministically) */
  triggerHandlerDistances: Record<string, number>;
}

export interface EvaluatedLayoutMetrics {
  /** Total geometric edge crossings count */
  edgeCrossingCount: number;
  /** Detailed breakdown of crossings by node role pairs */
  detailedCrossings?: DetailedCrossingBreakdown;
  /** Optional deterministic list of crossing edge segment pairs */
  crossingEdgePairs?: CrossingEdgePair[];

  /** Average edge Euclidean distance */
  averageEdgeLength: number;
  /** Median edge Euclidean distance */
  medianEdgeLength: number;
  /** Maximum edge Euclidean distance */
  maxEdgeLength: number;

  /** Total overlapping node pairs count */
  nodeOverlapCount: number;
  /** Primary production node overlap count */
  primaryOverlapCount: number;
  /** Satellite node overlap count */
  satelliteOverlapCount: number;
  /** Minimum clearance between primary nodes */
  minClearance: number;

  /** Count of edges violating layer flow order */
  layerViolationCount: number;
  /** Optional deterministic list of layer-violating edges */
  layerViolationEdges?: LayerViolationEdge[];

  /** Domain cohesion metrics */
  domainCohesion: DomainCohesionResult;

  /** Component separation metrics */
  componentSeparation: ComponentSeparationResult;

  /** Hub locality metrics */
  hubLocality: HubLocalityResult;

  /** Bridge placement metrics */
  bridgeLocality: BridgePlacementResult;

  /** Satellite locality metrics (tests, fields, trigger-handlers) */
  satelliteLocality: SatelliteLocalityResult;
}

export interface LayoutMetricsComparison {
  edgeCrossingCountDelta: number;
  averageEdgeLengthDelta: number;
  medianEdgeLengthDelta: number;
  maxEdgeLengthDelta: number;
  nodeOverlapCountDelta: number;
  layerViolationCountDelta: number;
  averageIntraDomainDistanceDelta: number;
  domainCohesionScoreDelta: number;
  minComponentDistanceDelta: number | null;
  overlappingComponentPairsDelta: number;
  gapViolationCountDelta: number;
  averageHubNeighborDistanceDelta: number;
  averageBridgeToDomainCentroidDistanceDelta: number;
  averageTestToTargetDistanceDelta: number | null;
  averageFieldToObjectDistanceDelta: number | null;
  averageTriggerToHandlerDistanceDelta: number | null;
}

interface Point {
  x: number;
  y: number;
}

function euclideanDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates median edge length from positions.
 */
function calculateMedianEdgeLength(
  edges: ExplorerEdge[],
  positions: PositionMap
): number {
  const lengths: number[] = [];

  for (const edge of edges) {
    const p1 = positions[edge.source];
    const p2 = positions[edge.target];
    if (p1 && p2) {
      lengths.push(euclideanDistance(p1, p2));
    }
  }

  if (lengths.length === 0) return 0;

  lengths.sort((a, b) => a - b);
  const mid = Math.floor(lengths.length / 2);

  if (lengths.length % 2 === 1) {
    return lengths[mid];
  } else {
    return (lengths[mid - 1] + lengths[mid]) / 2;
  }
}

/**
 * Collects layer-violating edges deterministically.
 */
function collectLayerViolationEdges(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[]
): LayerViolationEdge[] {
  const LAYER_ORDER: Record<string, number> = {
    presentation: 0,
    application: 1,
    domain: 2,
    schema: 3,
  };

  const nodeMap = new Map<string, ExplorerNode>(nodes.map(n => [n.id, n]));
  const violations: LayerViolationEdge[] = [];

  for (const edge of edges) {
    const srcNode = nodeMap.get(edge.source);
    const tgtNode = nodeMap.get(edge.target);
    if (!srcNode || !tgtNode) continue;

    const srcLayer = classifyNodeLayer(srcNode);
    const tgtLayer = classifyNodeLayer(tgtNode);

    const srcRank = LAYER_ORDER[srcLayer] ?? 1;
    const tgtRank = LAYER_ORDER[tgtLayer] ?? 1;

    if (srcRank > tgtRank) {
      violations.push({
        source: edge.source,
        target: edge.target,
      });
    }
  }

  violations.sort((a, b) => {
    const srcCmp = a.source.localeCompare(b.source);
    if (srcCmp !== 0) return srcCmp;
    return a.target.localeCompare(b.target);
  });

  return violations;
}

/**
 * Evaluates satellite locality metrics for tests, fields, and trigger-handlers.
 */
export function evaluateSatelliteLocality(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap
): SatelliteLocalityResult {
  const nodeMap = new Map<string, ExplorerNode>(nodes.map(n => [n.id, n]));

  const testDistancesMap = new Map<string, number>();
  let testDistSum = 0;

  for (const node of nodes) {
    if (isTestNode(node) && positions[node.id]) {
      const targetId = findParentProductionNodeId(node, nodes, edges);
      if (targetId && positions[targetId]) {
        const dist = euclideanDistance(positions[node.id], positions[targetId]);
        testDistancesMap.set(node.id, dist);
        testDistSum += dist;
      }
    }
  }

  const sortedTestKeys = Array.from(testDistancesMap.keys()).sort((a, b) => a.localeCompare(b));
  const testDistances: Record<string, number> = {};
  sortedTestKeys.forEach(k => {
    testDistances[k] = testDistancesMap.get(k)!;
  });

  const testCountWithTarget = sortedTestKeys.length;
  const averageTestToTargetDistance =
    testCountWithTarget > 0 ? testDistSum / testCountWithTarget : null;

  const fieldDistancesMap = new Map<string, number>();
  let fieldDistSum = 0;

  for (const node of nodes) {
    if (isFieldNode(node) && positions[node.id]) {
      const parentObjId = findParentObjectId(node, nodes, edges);
      if (parentObjId && positions[parentObjId]) {
        const dist = euclideanDistance(positions[node.id], positions[parentObjId]);
        fieldDistancesMap.set(node.id, dist);
        fieldDistSum += dist;
      }
    }
  }

  const sortedFieldKeys = Array.from(fieldDistancesMap.keys()).sort((a, b) => a.localeCompare(b));
  const fieldDistances: Record<string, number> = {};
  sortedFieldKeys.forEach(k => {
    fieldDistances[k] = fieldDistancesMap.get(k)!;
  });

  const fieldCountWithObject = sortedFieldKeys.length;
  const averageFieldToObjectDistance =
    fieldCountWithObject > 0 ? fieldDistSum / fieldCountWithObject : null;

  const triggerHandlerMap = new Map<string, number>();
  let thDistSum = 0;

  for (const edge of edges) {
    const srcNode = nodeMap.get(edge.source);
    const tgtNode = nodeMap.get(edge.target);
    if (!srcNode || !tgtNode) continue;

    const posSrc = positions[edge.source];
    const posTgt = positions[edge.target];
    if (!posSrc || !posTgt) continue;

    let triggerId: string | null = null;
    let handlerId: string | null = null;

    if (
      (srcNode.type === 'ApexTrigger' || /(?:trigger|triggers)$/i.test(srcNode.displayName || srcNode.id)) &&
      /(?:handler|handlers|controllerextension|controllerext)$/i.test(tgtNode.displayName || tgtNode.id) &&
      !tgtNode.behavior?.isTest
    ) {
      triggerId = edge.source;
      handlerId = edge.target;
    } else if (
      (tgtNode.type === 'ApexTrigger' || /(?:trigger|triggers)$/i.test(tgtNode.displayName || tgtNode.id)) &&
      /(?:handler|handlers|controllerextension|controllerext)$/i.test(srcNode.displayName || srcNode.id) &&
      !srcNode.behavior?.isTest
    ) {
      triggerId = edge.target;
      handlerId = edge.source;
    }

    if (triggerId && handlerId) {
      const pairKey = `${triggerId}->${handlerId}`;
      if (!triggerHandlerMap.has(pairKey)) {
        const dist = euclideanDistance(posSrc, posTgt);
        triggerHandlerMap.set(pairKey, dist);
        thDistSum += dist;
      }
    }
  }

  const sortedTHKeys = Array.from(triggerHandlerMap.keys()).sort((a, b) => a.localeCompare(b));
  const triggerHandlerDistances: Record<string, number> = {};
  sortedTHKeys.forEach(k => {
    triggerHandlerDistances[k] = triggerHandlerMap.get(k)!;
  });

  const triggerHandlerPairCount = sortedTHKeys.length;
  const averageTriggerToHandlerDistance =
    triggerHandlerPairCount > 0 ? thDistSum / triggerHandlerPairCount : null;

  return {
    averageTestToTargetDistance,
    testCountWithTarget,
    testDistances,
    averageFieldToObjectDistance,
    fieldCountWithObject,
    fieldDistances,
    averageTriggerToHandlerDistance,
    triggerHandlerPairCount,
    triggerHandlerDistances,
  };
}

/**
 * Main Deterministic Layout Evaluator.
 */
export function evaluateLayout(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap,
  options: LayoutMetricOptions = {}
): EvaluatedLayoutMetrics {
  const crossingsCount = edgeCrossingCount(nodes, edges, positions);
  const detailedCrossings = calculateDetailedEdgeCrossings(nodes, edges, positions);
  const avgLen = averageEdgeLength(nodes, edges, positions);
  const medLen = calculateMedianEdgeLength(edges, positions);
  const maxLen = maxEdgeLength(nodes, edges, positions);
  const overlaps = nodeOverlapCount(nodes, edges, positions, options);
  const primaryOverlaps = primaryNodeOverlapCount(nodes, edges, positions, options);
  const satelliteOverlaps = satelliteNodeOverlapCount(nodes, edges, positions, options);
  const minClearance = minimumNodeClearance(nodes, edges, positions, options);
  const violationsCount = layerViolationCount(nodes, edges, positions);
  const violationEdges = collectLayerViolationEdges(nodes, edges);

  const cohesion = domainCohesion(nodes, edges, positions);
  const separation = componentSeparation(nodes, edges, positions, options);
  const hubs = hubLocality(nodes, edges, positions, options);
  const bridges = bridgePlacement(nodes, edges, positions);
  const satellites = evaluateSatelliteLocality(nodes, edges, positions);

  return {
    edgeCrossingCount: crossingsCount,
    detailedCrossings,
    averageEdgeLength: avgLen,
    medianEdgeLength: medLen,
    maxEdgeLength: maxLen,
    nodeOverlapCount: overlaps,
    primaryOverlapCount: primaryOverlaps,
    satelliteOverlapCount: satelliteOverlaps,
    minClearance,
    layerViolationCount: violationsCount,
    layerViolationEdges: violationEdges,
    domainCohesion: cohesion,
    componentSeparation: separation,
    hubLocality: hubs,
    bridgeLocality: bridges,
    satelliteLocality: satellites,
  };
}

/**
 * Compares two evaluated layout metric objects.
 */
export function compareLayoutMetrics(
  before: EvaluatedLayoutMetrics,
  after: EvaluatedLayoutMetrics
): LayoutMetricsComparison {
  const computeDelta = (a: number, b: number) => a - b;
  const computeOptionalDelta = (a: number | null, b: number | null): number | null => {
    if (a !== null && b !== null) return a - b;
    return null;
  };

  return {
    edgeCrossingCountDelta: computeDelta(
      after.edgeCrossingCount,
      before.edgeCrossingCount
    ),
    averageEdgeLengthDelta: computeDelta(
      after.averageEdgeLength,
      before.averageEdgeLength
    ),
    medianEdgeLengthDelta: computeDelta(
      after.medianEdgeLength,
      before.medianEdgeLength
    ),
    maxEdgeLengthDelta: computeDelta(
      after.maxEdgeLength,
      before.maxEdgeLength
    ),
    nodeOverlapCountDelta: computeDelta(
      after.nodeOverlapCount,
      before.nodeOverlapCount
    ),
    layerViolationCountDelta: computeDelta(
      after.layerViolationCount,
      before.layerViolationCount
    ),
    averageIntraDomainDistanceDelta: computeDelta(
      after.domainCohesion.averageIntraDomainDistance,
      before.domainCohesion.averageIntraDomainDistance
    ),
    domainCohesionScoreDelta: computeDelta(
      after.domainCohesion.domainCohesionScore,
      before.domainCohesion.domainCohesionScore
    ),
    minComponentDistanceDelta: computeOptionalDelta(
      after.componentSeparation.minComponentDistance,
      before.componentSeparation.minComponentDistance
    ),
    overlappingComponentPairsDelta: computeDelta(
      after.componentSeparation.overlappingComponentPairs,
      before.componentSeparation.overlappingComponentPairs
    ),
    gapViolationCountDelta: computeDelta(
      after.componentSeparation.gapViolationCount,
      before.componentSeparation.gapViolationCount
    ),
    averageHubNeighborDistanceDelta: computeDelta(
      after.hubLocality.averageHubNeighborDistance,
      before.hubLocality.averageHubNeighborDistance
    ),
    averageBridgeToDomainCentroidDistanceDelta: computeDelta(
      after.bridgeLocality.averageBridgeToDomainCentroidDistance,
      before.bridgeLocality.averageBridgeToDomainCentroidDistance
    ),
    averageTestToTargetDistanceDelta: computeOptionalDelta(
      after.satelliteLocality.averageTestToTargetDistance,
      before.satelliteLocality.averageTestToTargetDistance
    ),
    averageFieldToObjectDistanceDelta: computeOptionalDelta(
      after.satelliteLocality.averageFieldToObjectDistance,
      before.satelliteLocality.averageFieldToObjectDistance
    ),
    averageTriggerToHandlerDistanceDelta: computeOptionalDelta(
      after.satelliteLocality.averageTriggerToHandlerDistance,
      before.satelliteLocality.averageTriggerToHandlerDistance
    ),
  };
}
