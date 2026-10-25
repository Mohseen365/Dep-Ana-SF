import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { LayoutGraphIndex } from './graph-index';
import type {
  ArchitectureGraphAnalysis,
  ArchitectureNodeAnalysis,
  ArchitectureLayer,
} from './types';
import { findParentProductionNodeId, findParentObjectId } from './analysis';

export const STAGE9_COARSE_PRUNING_ACTIVATION_THRESHOLD = 750;

export interface SatelliteLayoutOptions {
  /** Width of nodes used for geometry calculations (default: 120) */
  nodeWidth?: number;
  /** Height of nodes used for geometry calculations (default: 60) */
  nodeHeight?: number;
  /** Layer spacing Y delta (default: 250) */
  layerSpacing?: number;
  /** Base Y offsets per layer */
  layerYOffsets?: Record<ArchitectureLayer, number>;
  /** Feature-specific layer Y coordinates for compact feature-aware satellite placement */
  featureLayerYMap?: Record<string, Record<ArchitectureLayer, number>>
                   | Map<string, Record<ArchitectureLayer, number>>;
  /** Feature map (nodeId -> featureId) for resolving feature-local Y anchors */
  featureMap?: Map<string, string> | Record<string, string>;
  /** Whether feature layout is enabled */
  enableFeatureLayout?: boolean;
  /** Default X center if domain X is unknown */
  defaultDomainX?: number;
  /** Minimum horizontal gap between nodes (default: 40) */
  horizontalGap?: number;
  /** Minimum vertical gap between nodes (default: 40) */
  verticalGap?: number;
  /** Maximum distance a satellite can be displaced from its parent target (default: 280) */
  maxSatelliteDistance?: number;
  /** Whether Stage 9 coarse anchor bounding-region pruning is enabled (default: true if node count >= 750) */
  enableCoarsePruning?: boolean;
  /** Optional transient LayoutGraphIndex for fast infrastructure lookups */
  index?: LayoutGraphIndex;
}

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  p1: Point;
  p2: Point;
}

export interface SatellitePlacementResult {
  /** Final calculated positions map for all nodes (primary + satellites) */
  positions: Record<string, { x: number; y: number }>;
  /** Subset of positions belonging specifically to secondary satellite nodes */
  satellitePositions: Record<string, { x: number; y: number }>;
  /** Count of test nodes placed */
  placedTestsCount: number;
  /** Count of field nodes placed */
  placedFieldsCount: number;
  /** Count of trigger/handler satellite nodes placed */
  placedMicroclusterCount: number;
}

const DEFAULT_LAYER_Y_OFFSETS: Record<ArchitectureLayer, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
};

/**
 * Checks if a node analysis or node represent a Trigger.
 */
export function isTriggerNode(nodeAnalysis: ArchitectureNodeAnalysis): boolean {
  if (nodeAnalysis.nodeType === 'ApexTrigger') return true;
  const name = nodeAnalysis.displayName || nodeAnalysis.nodeId;
  return /(?:trigger|triggers)$/i.test(name);
}

/**
 * Checks if a node analysis or node represent a Handler.
 */
export function isHandlerNode(nodeAnalysis: ArchitectureNodeAnalysis): boolean {
  const name = nodeAnalysis.displayName || nodeAnalysis.nodeId;
  return /(?:handler|handlers|controllerextension|controllerext)$/i.test(name) && !nodeAnalysis.isTest;
}

/**
 * Broad-Phase Coarse Bounding-Region Segment Filter.
 * Filters primary segments once per cluster before ring expansion.
 * Guarantees zero false negatives: retains all segments whose AABB overlaps the cluster candidate bounding region.
 */
export function filterPrimarySegmentsCoarse(
  anchor: Point,
  count: number,
  nodeWidth: number,
  nodeHeight: number,
  horizontalGap: number,
  verticalGap: number,
  _maxDistance: number,
  primarySegments: Segment[],
  incidentEndpoints?: Point[]
): Segment[] {
  if (!primarySegments || primarySegments.length === 0) {
    return [];
  }

  const dx = nodeWidth + horizontalGap;
  const dy = nodeHeight + verticalGap;
  // Maximum search radius including potential fallback expansion (+30)
  const maxSearchRadius = Math.max(12, Math.ceil(Math.sqrt(count) * 3)) + 30;

  // Compute cluster candidate bounding box
  let minX = anchor.x - maxSearchRadius * dx;
  let maxX = anchor.x + maxSearchRadius * dx;
  let minY = anchor.y - maxSearchRadius * dy;
  let maxY = anchor.y + maxSearchRadius * dy;

  // Expand bounding box to encompass all incident endpoints (e.g. parent object or production node)
  if (incidentEndpoints && incidentEndpoints.length > 0) {
    for (let i = 0; i < incidentEndpoints.length; i++) {
      const ep = incidentEndpoints[i];
      if (ep.x < minX) minX = ep.x;
      if (ep.x > maxX) maxX = ep.x;
      if (ep.y < minY) minY = ep.y;
      if (ep.y > maxY) maxY = ep.y;
    }
  }

  // Safety buffer to prevent floating-point boundary misses
  const EPS = 1e-3;
  minX -= EPS;
  maxX += EPS;
  minY -= EPS;
  maxY += EPS;

  const relevantSegments: Segment[] = [];

  for (let i = 0; i < primarySegments.length; i++) {
    const seg = primarySegments[i];
    const sMinX = seg.p1.x < seg.p2.x ? seg.p1.x : seg.p2.x;
    const sMaxX = seg.p1.x > seg.p2.x ? seg.p1.x : seg.p2.x;
    const sMinY = seg.p1.y < seg.p2.y ? seg.p1.y : seg.p2.y;
    const sMaxY = seg.p1.y > seg.p2.y ? seg.p1.y : seg.p2.y;

    // AABB Overlap Condition
    if (sMaxX >= minX && sMinX <= maxX && sMaxY >= minY && sMinY <= maxY) {
      relevantSegments.push(seg);
    }
  }

  return relevantSegments;
}

/**
 * Helper to check if two 2D line segments strictly intersect in interior points.
 */
function segmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  // Ignore segments sharing endpoints
  if (
    (p1.x === q1.x && p1.y === q1.y) ||
    (p1.x === q2.x && p1.y === q2.y) ||
    (p2.x === q1.x && p2.y === q1.y) ||
    (p2.x === q2.x && p2.y === q2.y)
  ) {
    return false;
  }

  const cp1 = (p2.x - p1.x) * (q1.y - p1.y) - (p2.y - p1.y) * (q1.x - p1.x);
  const cp2 = (p2.x - p1.x) * (q2.y - p1.y) - (p2.y - p1.y) * (q2.x - p1.x);
  const cp3 = (q2.x - q1.x) * (p1.y - q1.y) - (q2.y - q1.y) * (p1.x - q1.x);
  const cp4 = (q2.x - q1.x) * (p2.y - q1.y) - (q2.y - q1.y) * (p2.x - q1.x);

  const EPS = 1e-9;
  const straddle1 = (cp1 > EPS && cp2 < -EPS) || (cp1 < -EPS && cp2 > EPS);
  const straddle2 = (cp3 > EPS && cp4 < -EPS) || (cp3 < -EPS && cp4 > EPS);

  return straddle1 && straddle2;
}

/**
 * Helper to check if a candidate point collides with any already occupied positions.
 */
function isSlotOccupied(
  candidateX: number,
  candidateY: number,
  occupied: Point[],
  minDx: number,
  minDy: number
): boolean {
  for (let i = 0; i < occupied.length; i++) {
    const pos = occupied[i];
    if (
      Math.abs(pos.x - candidateX) < minDx - 1e-3 &&
      Math.abs(pos.y - candidateY) < minDy - 1e-3
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Production-Equivalent Deterministic Comparator
 */
function candidateComparator(
  a: { effectiveScore: number; dist: number; row: number; col: number },
  b: { effectiveScore: number; dist: number; row: number; col: number }
): number {
  if (Math.abs(a.effectiveScore - b.effectiveScore) > 1e-4) {
    return a.effectiveScore - b.effectiveScore;
  }
  if (Math.abs(a.dist - b.dist) > 1e-4) {
    return a.dist - b.dist;
  }
  if (a.row !== b.row) return a.row - b.row;
  return a.col - b.col;
}

/**
 * Generates non-overlapping, gap-aware candidate placement slots around an anchor position.
 * Uses Chebyshev concentric ring expansion with distance lower-bound early termination.
 */
function generateSatelliteSlots(
  anchor: Point,
  count: number,
  occupied: Point[],
  nodeWidth: number,
  nodeHeight: number,
  horizontalGap: number,
  verticalGap: number,
  maxDistance: number,
  bias: 'field' | 'test' | 'neutral',
  targetVector?: Point,
  primarySegments?: Segment[],
  placedSatelliteSegments?: Segment[],
  incidentEndpoints?: Point[],
  enableCoarsePruning?: boolean
): Point[] {
  if (count <= 0) return [];

  const dx = nodeWidth + horizontalGap;
  const dy = nodeHeight + verticalGap;
  const minStep = Math.min(dx, dy);
  const effectiveMaxDist = Math.max(
    maxDistance,
    Math.ceil(Math.sqrt(count)) * Math.max(dx, dy) * 1.2
  );

  const rawPrimarySegments = primarySegments || [];
  const relevantSegments = (enableCoarsePruning && rawPrimarySegments.length > 0)
    ? filterPrimarySegmentsCoarse(
        anchor,
        count,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxDistance,
        rawPrimarySegments,
        incidentEndpoints
      )
    : rawPrimarySegments;

  const candidateSlots: Array<{
    x: number;
    y: number;
    dist: number;
    effectiveScore: number;
    row: number;
    col: number;
  }> = [];

  const maxSearchRadius = Math.max(12, Math.ceil(Math.sqrt(count) * 3));

  // Evaluate concentric rings R = 1 ... maxSearchRadius
  for (let ring = 1; ring <= maxSearchRadius; ring++) {
    // Collect all grid cell coordinates (r, c) on Chebyshev ring R
    const ringCells: Array<{ r: number; c: number }> = [];

    // Top & Bottom edges
    for (let c = -ring; c <= ring; c++) {
      ringCells.push({ r: -ring, c }); // Top edge
      ringCells.push({ r: ring, c });  // Bottom edge
    }
    // Left & Right edges
    for (let r = -ring + 1; r <= ring - 1; r++) {
      ringCells.push({ r, c: -ring }); // Left edge
      ringCells.push({ r, c: ring });  // Right edge
    }

    for (let idx = 0; idx < ringCells.length; idx++) {
      const { r, c } = ringCells[idx];

      // Directional constraints
      if (bias === 'test' && c === 0) {
        // Tests must sit to the side of target (c != 0)
        continue;
      }

      const x = anchor.x + c * dx;
      const y = anchor.y + r * dy;

      if (isSlotOccupied(x, y, occupied, dx, dy)) {
        continue;
      }

      const dist = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

      // Directional preference scoring
      let directionalScore = 1.0;
      if (bias === 'test') {
        if (c < 0) directionalScore = 1.2; // Mild preference for right side (c > 0) over left (c < 0)
      }

      let aspectPenalty = 0;
      if (bias === 'field') {
        if (r <= 0) {
          // Soft penalty for sitting above parent object
          aspectPenalty += 400.0;
        }
        // Fields stack in narrow vertical columns (max 2-3 columns wide)
        if (Math.abs(c) > 2) {
          aspectPenalty += Math.abs(c) * dx * 2.0;
        } else {
          aspectPenalty += (Math.abs(r) - 1) * dy * 0.2;
        }
      } else if (bias === 'test') {
        if (Math.abs(r) > 3) {
          aspectPenalty += (Math.abs(r) - 3) * dy * 1.5;
        }
      }

      // Vector alignment penalty if primary edge direction vector is provided
      let vectorPenalty = 0;
      if (targetVector && (targetVector.x !== 0 || targetVector.y !== 0)) {
        const slotVecX = c * dx;
        const slotVecY = r * dy;
        const dot = slotVecX * targetVector.x + slotVecY * targetVector.y;
        if (dot > 0) {
          vectorPenalty = dot * 0.5; // Penalize placing satellites in same direction as primary edges
        }
      }

      // Crossing penalties across all incident endpoints
      let primaryCrossings = 0;
      let satelliteCrossings = 0;
      const candPoint = { x, y };
      const endpointsToTest = (incidentEndpoints && incidentEndpoints.length > 0) ? incidentEndpoints : [anchor];

      for (let epIdx = 0; epIdx < endpointsToTest.length; epIdx++) {
        const ep = endpointsToTest[epIdx];

        if (relevantSegments.length > 0) {
          for (let i = 0; i < relevantSegments.length; i++) {
            if (segmentsIntersect(ep, candPoint, relevantSegments[i].p1, relevantSegments[i].p2)) {
              primaryCrossings++;
            }
          }
        }

        if (placedSatelliteSegments && placedSatelliteSegments.length > 0) {
          for (let i = 0; i < placedSatelliteSegments.length; i++) {
            if (segmentsIntersect(ep, candPoint, placedSatelliteSegments[i].p1, placedSatelliteSegments[i].p2)) {
              satelliteCrossings++;
            }
          }
        }
      }

      const crossingPenalty = primaryCrossings * 2000.0 + satelliteCrossings * 800.0;
      const tetherPenalty = dist > effectiveMaxDist ? 10.0 * (dist - effectiveMaxDist) : 0;
      const effectiveScore = dist * directionalScore + aspectPenalty + vectorPenalty + crossingPenalty + tetherPenalty;

      candidateSlots.push({ x, y, dist, effectiveScore, row: r, col: c });
    }

    // Check distance lower-bound termination condition after completing ring
    if (candidateSlots.length >= count) {
      candidateSlots.sort(candidateComparator);
      const currentWorstSelectedScore = candidateSlots[count - 1].effectiveScore;
      const futureLowerBound = (ring + 1) * minStep;

      if (futureLowerBound > currentWorstSelectedScore) {
        break; // Safe early loop termination!
      }
    }
  }

  // Sort candidate slots deterministically
  candidateSlots.sort(candidateComparator);

  const selectedSlots = candidateSlots.slice(0, count).map(s => ({ x: s.x, y: s.y }));

  // If search space didn't yield enough slots, generate fallback non-overlapping slots dynamically
  if (selectedSlots.length < count) {
    let r = 1;
    while (selectedSlots.length < count && r <= maxSearchRadius + 20) {
      for (let c = -maxSearchRadius - 10; c <= maxSearchRadius + 10; c++) {
        if (selectedSlots.length >= count) break;
        if (bias === 'test' && c === 0) continue;
        const x = anchor.x + c * dx;
        const y = anchor.y + r * dy;
        const combinedOccupied = [...occupied, ...selectedSlots];
        if (!isSlotOccupied(x, y, combinedOccupied, dx, dy)) {
          selectedSlots.push({ x, y });
        }
      }
      r++;
    }
  }

  return selectedSlots;
}

/**
 * Evaluates total edge crossings for a set of edges given current positions.
 */
function evaluateTotalCrossings(
  edges: ExplorerEdge[],
  positions: Record<string, { x: number; y: number }>
): number {
  interface EdgeSeg {
    p1: Point;
    p2: Point;
    s: string;
    t: string;
  }
  const segs: EdgeSeg[] = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const p1 = positions[e.source];
    const p2 = positions[e.target];
    if (p1 && p2) {
      segs.push({ p1, p2, s: e.source, t: e.target });
    }
  }

  let count = 0;
  for (let i = 0; i < segs.length; i++) {
    const s1 = segs[i];
    for (let j = i + 1; j < segs.length; j++) {
      const s2 = segs[j];
      if (s1.s === s2.s || s1.s === s2.t || s1.t === s2.s || s1.t === s2.t) continue;
      if (segmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2)) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Main entry point for Satellite Layout Engine.
 *
 * Takes primary node positions as fixed anchors and deterministically places:
 * 1. Trigger / Handler microclusters
 * 2. Field node compact grids around parent CustomObjects
 * 3. Test node compact satellite clusters around production targets
 *
 * Enforces satellite priority:
 * production nodes > hubs > bridges > trigger/handlers > tests > fields
 * Primary nodes are NEVER moved by satellite placement.
 */
export function placeSatellites(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  analysis: ArchitectureGraphAnalysis,
  primaryPositions: Record<string, { x: number; y: number }>,
  options: SatelliteLayoutOptions = {}
): SatellitePlacementResult {
  const safeEdges = Array.isArray(edges) ? edges : [];
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;
  const maxSatelliteDistance = options.maxSatelliteDistance ?? 280;
  const layerYOffsets = options.layerYOffsets ?? DEFAULT_LAYER_Y_OFFSETS;

  // Normalise featureMap once
  const _featureMap: Map<string, string> | null = options.featureMap instanceof Map
    ? options.featureMap
    : options.featureMap
      ? new Map(Object.entries(options.featureMap))
      : null;

  // Returns the best available Y base for `layer` relative to a given node
  function resolveLayerY(nodeId: string, layer: ArchitectureLayer): number {
    if (options.featureLayerYMap && _featureMap) {
      const featureId = _featureMap.get(nodeId);
      if (featureId) {
        const fMap = options.featureLayerYMap instanceof Map
          ? options.featureLayerYMap.get(featureId)
          : options.featureLayerYMap[featureId];
        if (fMap && fMap[layer] !== undefined) return fMap[layer];
      }
    }
    return layerYOffsets[layer] ?? DEFAULT_LAYER_Y_OFFSETS[layer];
  }

  const defaultDomainX = options.defaultDomainX ?? 0;
  const index = options.index;

  const enableCoarsePruning = options.enableCoarsePruning ?? (nodes.length >= STAGE9_COARSE_PRUNING_ACTIVATION_THRESHOLD);

  // Immutably clone primary positions into result positions
  const positions: Record<string, { x: number; y: number }> = { ...primaryPositions };
  const satellitePositions: Record<string, { x: number; y: number }> = {};

  // Track primary / locked node IDs to guarantee they are never moved
  const primaryNodeIds = new Set(Object.keys(primaryPositions));

  // Occupied positions list for collision-free slot generation
  const occupiedList: Point[] = Object.values(primaryPositions).map(p => ({ x: p.x, y: p.y }));

  // Pre-build primary edge segments for fast crossing evaluation
  const primarySegments: Array<{ p1: Point; p2: Point }> = [];
  for (let i = 0; i < safeEdges.length; i++) {
    const e = safeEdges[i];
    if (primaryNodeIds.has(e.source) && primaryNodeIds.has(e.target)) {
      const p1 = primaryPositions[e.source];
      const p2 = primaryPositions[e.target];
      if (p1 && p2) {
        primarySegments.push({ p1, p2 });
      }
    }
  }

  // Track satellite segments as they get placed
  const placedSatelliteSegments: Array<{ p1: Point; p2: Point }> = [];

  // Identify node subsets from analysis
  const allAnalyses = analysis.nodeList;
  const nodeAnalysisMap = analysis.nodes;

  const testAnalyses: ArchitectureNodeAnalysis[] = [];
  const fieldAnalyses: ArchitectureNodeAnalysis[] = [];
  const triggerAnalyses: ArchitectureNodeAnalysis[] = [];
  const handlerAnalyses: ArchitectureNodeAnalysis[] = [];

  for (const item of allAnalyses) {
    if (item.isTest) {
      testAnalyses.push(item);
    } else if (item.isField) {
      fieldAnalyses.push(item);
    } else if (isTriggerNode(item)) {
      triggerAnalyses.push(item);
    } else if (isHandlerNode(item)) {
      handlerAnalyses.push(item);
    }
  }

  // Sort all satellite arrays deterministically by nodeId
  testAnalyses.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  fieldAnalyses.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  triggerAnalyses.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  handlerAnalyses.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  // --------------------------------------------------------------------------
  // STAGE 1: TRIGGER / HANDLER MICROCLUSTERS
  // --------------------------------------------------------------------------
  let placedMicroclusterCount = 0;

  for (const triggerItem of triggerAnalyses) {
    if (primaryNodeIds.has(triggerItem.nodeId)) continue; // Already placed as primary

    const connectedEdges = index
      ? index.incidentEdgesByNode.get(triggerItem.nodeId) || []
      : edges.filter(e => e.source === triggerItem.nodeId || e.target === triggerItem.nodeId);

    let parentObjectPos: Point | null = null;
    let connectedHandlerId: string | null = null;

    for (const edge of connectedEdges) {
      const otherId = edge.source === triggerItem.nodeId ? edge.target : edge.source;
      const otherAnalysis = nodeAnalysisMap.get(otherId);
      if (otherAnalysis) {
        if (
          (otherAnalysis.nodeType === 'Object' || otherAnalysis.nodeType === 'CustomObject') &&
          positions[otherId]
        ) {
          parentObjectPos = positions[otherId];
        } else if (isHandlerNode(otherAnalysis)) {
          connectedHandlerId = otherId;
        }
      }
    }

    let trigX = parentObjectPos ? parentObjectPos.x : defaultDomainX;
    let trigY = parentObjectPos
      ? parentObjectPos.y - (nodeHeight + verticalGap)
      : resolveLayerY(triggerItem.nodeId, 'application');

    // Check collision for trigger candidate
    const minDx = nodeWidth + horizontalGap;
    const minDy = nodeHeight + verticalGap;
    if (isSlotOccupied(trigX, trigY, occupiedList, minDx, minDy)) {
      const slots = generateSatelliteSlots(
        { x: trigX, y: trigY },
        1,
        occupiedList,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxSatelliteDistance,
          'neutral',
          undefined,
          undefined,
          undefined,
          undefined,
          enableCoarsePruning
      );
      if (slots.length > 0) {
        trigX = slots[0].x;
        trigY = slots[0].y;
      }
    }

    positions[triggerItem.nodeId] = { x: trigX, y: trigY };
    satellitePositions[triggerItem.nodeId] = { x: trigX, y: trigY };
    occupiedList.push({ x: trigX, y: trigY });
    placedMicroclusterCount++;

    // Place connected Handler relative to Trigger if handler is not primary
    if (connectedHandlerId && !primaryNodeIds.has(connectedHandlerId)) {
      const handlerItem = nodeAnalysisMap.get(connectedHandlerId);
      if (handlerItem && !positions[connectedHandlerId]) {
        const handlerEdges = index
          ? index.incidentEdgesByNode.get(connectedHandlerId) || []
          : edges.filter(e => e.source === connectedHandlerId || e.target === connectedHandlerId);
        let servicePos: Point | null = null;

        for (const hEdge of handlerEdges) {
          const hOtherId = hEdge.source === connectedHandlerId ? hEdge.target : hEdge.source;
          if (hOtherId !== triggerItem.nodeId && positions[hOtherId]) {
            servicePos = positions[hOtherId];
            break;
          }
        }

        let handlerX = trigX + nodeWidth + horizontalGap;
        let handlerY = trigY;

        if (servicePos) {
          handlerX = (trigX + servicePos.x) / 2;
          handlerY = (trigY + servicePos.y) / 2;
        }

        if (isSlotOccupied(handlerX, handlerY, occupiedList, minDx, minDy)) {
          const handlerSlots = generateSatelliteSlots(
            { x: handlerX, y: handlerY },
            1,
            occupiedList,
            nodeWidth,
            nodeHeight,
            horizontalGap,
            verticalGap,
            maxSatelliteDistance,
            'neutral',
            undefined,
            undefined,
            undefined,
            undefined,
            enableCoarsePruning
          );
          if (handlerSlots.length > 0) {
            handlerX = handlerSlots[0].x;
            handlerY = handlerSlots[0].y;
          }
        }

        positions[connectedHandlerId] = { x: handlerX, y: handlerY };
        satellitePositions[connectedHandlerId] = { x: handlerX, y: handlerY };
        occupiedList.push({ x: handlerX, y: handlerY });
        placedMicroclusterCount++;
      }
    }
  }

  // Handle remaining unplaced handlers
  for (const handlerItem of handlerAnalyses) {
    if (positions[handlerItem.nodeId]) continue;

    const connectedEdges = index
      ? index.incidentEdgesByNode.get(handlerItem.nodeId) || []
      : edges.filter(e => e.source === handlerItem.nodeId || e.target === handlerItem.nodeId);

    let anchorPos: Point | null = null;
    for (const edge of connectedEdges) {
      const otherId = edge.source === handlerItem.nodeId ? edge.target : edge.source;
      if (positions[otherId]) {
        anchorPos = positions[otherId];
        break;
      }
    }

    let hX = anchorPos ? anchorPos.x + nodeWidth + horizontalGap : defaultDomainX;
    let hY = anchorPos ? anchorPos.y : resolveLayerY(handlerItem.nodeId, 'application');

    const minDx = nodeWidth + horizontalGap;
    const minDy = nodeHeight + verticalGap;
    if (isSlotOccupied(hX, hY, occupiedList, minDx, minDy)) {
      const slots = generateSatelliteSlots(
        { x: hX, y: hY },
        1,
        occupiedList,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        maxSatelliteDistance,
        'neutral',
        undefined,
        undefined,
        undefined,
        undefined,
        enableCoarsePruning
      );
      if (slots.length > 0) {
        hX = slots[0].x;
        hY = slots[0].y;
      }
    }

    positions[handlerItem.nodeId] = { x: hX, y: hY };
    satellitePositions[handlerItem.nodeId] = { x: hX, y: hY };
    occupiedList.push({ x: hX, y: hY });
    placedMicroclusterCount++;
  }

  // --------------------------------------------------------------------------
  // STAGE 2: FIELD SATELLITE PLACEMENT
  // --------------------------------------------------------------------------
  let placedFieldsCount = 0;

  const fieldsByParent = new Map<string, ArchitectureNodeAnalysis[]>();
  const unanchoredFields: ArchitectureNodeAnalysis[] = [];

  for (const fieldItem of fieldAnalyses) {
    if (primaryNodeIds.has(fieldItem.nodeId)) continue;

    let parentId = fieldItem.parentObjectId;
    if (!parentId) {
      parentId = index
        ? index.parentObjectId.get(fieldItem.nodeId) ?? null
        : findParentObjectId(fieldItem.node, nodes, edges);
    }

    if (parentId && positions[parentId]) {
      if (!fieldsByParent.has(parentId)) {
        fieldsByParent.set(parentId, []);
      }
      fieldsByParent.get(parentId)!.push(fieldItem);
    } else {
      unanchoredFields.push(fieldItem);
    }
  }

  // Place anchored fields using gap-aware candidate slot generation
  fieldsByParent.forEach((fields, parentId) => {
    fields.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const parentPos = positions[parentId];

    // Compute primary edge vector for parent object to avoid placing fields over primary dependency paths
    const pEdges = index
      ? index.incidentEdgesByNode.get(parentId) || []
      : edges.filter(e => e.source === parentId || e.target === parentId);

    let sumDx = 0;
    let sumDy = 0;
    let pCount = 0;

    for (const e of pEdges) {
      const otherId = e.source === parentId ? e.target : e.source;
      if (positions[otherId] && primaryNodeIds.has(otherId)) {
        sumDx += positions[otherId].x - parentPos.x;
        sumDy += positions[otherId].y - parentPos.y;
        pCount++;
      }
    }

    const targetVector = pCount > 0 ? { x: sumDx / pCount, y: sumDy / pCount } : undefined;

    const slots = generateSatelliteSlots(
      parentPos,
      fields.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field',
      targetVector,
      primarySegments,
      placedSatelliteSegments,
      [parentPos],
      enableCoarsePruning
    );

    fields.forEach((fieldItem, idx) => {
      const slot = slots[idx] || {
        x: parentPos.x + (idx + 1) * (nodeWidth + horizontalGap),
        y: parentPos.y + (nodeHeight + verticalGap),
      };

      positions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedSatelliteSegments.push({ p1: parentPos, p2: { x: slot.x, y: slot.y } });
      placedFieldsCount++;
    });
  });

  // Place unanchored fields in schema layer fallback grid
  unanchoredFields.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  if (unanchoredFields.length > 0) {
    const fallbackAnchor: Point = {
      x: defaultDomainX,
      y: resolveLayerY(unanchoredFields[0].nodeId, 'schema'),
    };
    const fallbackSlots = generateSatelliteSlots(
      fallbackAnchor,
      unanchoredFields.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field',
      undefined,
      undefined,
      undefined,
      undefined,
      enableCoarsePruning
    );

    unanchoredFields.forEach((fieldItem, idx) => {
      const slot = fallbackSlots[idx] || {
        x: fallbackAnchor.x + (idx + 1) * (nodeWidth + horizontalGap),
        y: fallbackAnchor.y + (nodeHeight + verticalGap),
      };

      positions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedFieldsCount++;
    });
  }

  // --------------------------------------------------------------------------
  // STAGE 3: TEST SATELLITE PLACEMENT
  // --------------------------------------------------------------------------
  let placedTestsCount = 0;

  const testsByTarget = new Map<string, ArchitectureNodeAnalysis[]>();
  const unanchoredTests: ArchitectureNodeAnalysis[] = [];

  for (const testItem of testAnalyses) {
    if (primaryNodeIds.has(testItem.nodeId)) continue;

    let targetId = testItem.parentProductionNodeId;
    if (!targetId) {
      targetId = index
        ? index.parentProductionNodeId.get(testItem.nodeId) ?? null
        : findParentProductionNodeId(testItem.node, nodes, edges);
    }

    if (targetId && positions[targetId]) {
      if (!testsByTarget.has(targetId)) {
        testsByTarget.set(targetId, []);
      }
      testsByTarget.get(targetId)!.push(testItem);
    } else {
      unanchoredTests.push(testItem);
    }
  }

  // Place anchored tests using gap-aware candidate slot generation
  testsByTarget.forEach((tests, targetId) => {
    tests.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const targetPos = positions[targetId];

    const tEdges = index
      ? index.incidentEdgesByNode.get(targetId) || []
      : edges.filter(e => e.source === targetId || e.target === targetId);

    let sumDx = 0;
    let sumDy = 0;
    let pCount = 0;

    for (const e of tEdges) {
      const otherId = e.source === targetId ? e.target : e.source;
      if (positions[otherId] && primaryNodeIds.has(otherId)) {
        sumDx += positions[otherId].x - targetPos.x;
        sumDy += positions[otherId].y - targetPos.y;
        pCount++;
      }
    }

    const targetVector = pCount > 0 ? { x: sumDx / pCount, y: sumDy / pCount } : undefined;

    const slots = generateSatelliteSlots(
      targetPos,
      tests.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test',
      targetVector,
      primarySegments,
      placedSatelliteSegments,
      [targetPos],
      enableCoarsePruning
    );

    tests.forEach((testItem, idx) => {
      const slot = slots[idx] || {
        x: targetPos.x + (nodeWidth + horizontalGap),
        y: targetPos.y + idx * (nodeHeight + verticalGap),
      };

      positions[testItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[testItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedSatelliteSegments.push({ p1: targetPos, p2: { x: slot.x, y: slot.y } });
      placedTestsCount++;
    });
  });

  // Place unanchored tests in fallback domain/layer cluster
  unanchoredTests.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  if (unanchoredTests.length > 0) {
    const fallbackAnchor: Point = {
      x: defaultDomainX,
      y: resolveLayerY(unanchoredTests[0].nodeId, 'application'),
    };
    const fallbackSlots = generateSatelliteSlots(
      fallbackAnchor,
      unanchoredTests.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test',
      undefined,
      undefined,
      undefined,
      undefined,
      enableCoarsePruning
    );

    unanchoredTests.forEach((testItem, idx) => {
      const slot = fallbackSlots[idx] || {
        x: fallbackAnchor.x + (nodeWidth + horizontalGap),
        y: fallbackAnchor.y + idx * (nodeHeight + verticalGap),
      };

      positions[testItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[testItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: fallbackAnchor.x, y: fallbackAnchor.y });
      placedTestsCount++;
    });
  }

  // --------------------------------------------------------------------------
  // STAGE 4: POST-PLACEMENT SATELLITE SLOT PERMUTATION REFINEMENT
  // --------------------------------------------------------------------------
  // Optimizes satellite-to-slot assignments for field clusters around parent anchors
  fieldsByParent.forEach((fields) => {
    if (fields.length < 2) return;
    const fieldIds = fields.map(f => f.nodeId);
    const slots = fieldIds.map(id => positions[id]).filter(Boolean);
    if (slots.length !== fieldIds.length) return;

    let currentBestCrossings = evaluateTotalCrossings(safeEdges, positions);

    // Test cyclic permutations of slot assignments
    for (let shift = 1; shift < Math.min(fieldIds.length, 5); shift++) {
      const candidatePositions = { ...positions };
      fieldIds.forEach((id, idx) => {
        candidatePositions[id] = slots[(idx + shift) % fieldIds.length];
      });

      const candidateCrossings = evaluateTotalCrossings(safeEdges, candidatePositions);
      if (candidateCrossings < currentBestCrossings) {
        currentBestCrossings = candidateCrossings;
        fieldIds.forEach((id) => {
          positions[id] = candidatePositions[id];
          satellitePositions[id] = candidatePositions[id];
        });
      }
    }
  });

  return {
    positions,
    satellitePositions,
    placedTestsCount,
    placedFieldsCount,
    placedMicroclusterCount,
  };
}
