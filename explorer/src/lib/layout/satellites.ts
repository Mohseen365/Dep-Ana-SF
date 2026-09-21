import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { LayoutGraphIndex } from './graph-index';
import type {
  ArchitectureGraphAnalysis,
  ArchitectureNodeAnalysis,
  ArchitectureLayer,
} from './types';
import { findParentProductionNodeId, findParentObjectId } from './analysis';

export interface SatelliteLayoutOptions {
  /** Width of nodes used for geometry calculations (default: 120) */
  nodeWidth?: number;
  /** Height of nodes used for geometry calculations (default: 60) */
  nodeHeight?: number;
  /** Layer spacing Y delta (default: 250) */
  layerSpacing?: number;
  /** Base Y offsets per layer */
  layerYOffsets?: Record<ArchitectureLayer, number>;
  /** Default X center if domain X is unknown */
  defaultDomainX?: number;
  /** Minimum horizontal gap between nodes (default: 40) */
  horizontalGap?: number;
  /** Minimum vertical gap between nodes (default: 40) */
  verticalGap?: number;
  /** Maximum distance a satellite can be displaced from its parent target (default: 280) */
  maxSatelliteDistance?: number;
  /** Optional transient LayoutGraphIndex for fast infrastructure lookups */
  index?: LayoutGraphIndex;
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

interface Point {
  x: number;
  y: number;
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
 * Generates non-overlapping, gap-aware candidate placement slots around an anchor position.
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
  bias: 'field' | 'test' | 'neutral'
): Point[] {
  if (count <= 0) return [];

  const dx = nodeWidth + horizontalGap;
  const dy = nodeHeight + verticalGap;
  const effectiveMaxDist = Math.max(
    maxDistance,
    Math.ceil(Math.sqrt(count)) * Math.max(dx, dy) * 1.2
  );

  const candidateSlots: Array<{
    x: number;
    y: number;
    dist: number;
    effectiveScore: number;
    row: number;
    col: number;
  }> = [];

  // Expand max search radius adaptively based on satellite count to guarantee enough candidate slots
  const maxSearchRadius = Math.max(12, Math.ceil(Math.sqrt(count) * 3));
  const gridRadiusCap = Math.max(3, Math.ceil(Math.sqrt(count)));

  for (let r = -maxSearchRadius; r <= maxSearchRadius; r++) {
    for (let c = -maxSearchRadius; c <= maxSearchRadius; c++) {
      if (c === 0 && r === 0) continue; // Skip anchor slot itself

      // Directional constraints
      if (bias === 'field' && r <= 0) {
        // Fields must sit strictly below parent object (r > 0)
        continue;
      }

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
        if (c < 0) directionalScore = 1.5; // Strong preference for right side (c > 0) over left (c < 0)
      }

      let aspectPenalty = 0;
      if (bias === 'field' && Math.abs(c) > gridRadiusCap) {
        aspectPenalty = (Math.abs(c) - gridRadiusCap) * dx * 1.5;
      } else if (bias === 'test' && Math.abs(r) > gridRadiusCap) {
        aspectPenalty = (Math.abs(r) - gridRadiusCap) * dy * 1.5;
      }

      const tetherPenalty = dist > effectiveMaxDist ? 10.0 * (dist - effectiveMaxDist) : 0;
      const effectiveScore = dist * directionalScore + aspectPenalty + tetherPenalty;

      candidateSlots.push({ x, y, dist, effectiveScore, row: r, col: c });
    }
  }

  // Sort candidate slots deterministically
  candidateSlots.sort((a, b) => {
    if (Math.abs(a.effectiveScore - b.effectiveScore) > 1e-4) {
      return a.effectiveScore - b.effectiveScore;
    }
    if (Math.abs(a.dist - b.dist) > 1e-4) {
      return a.dist - b.dist;
    }
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const selectedSlots = candidateSlots.slice(0, count).map(s => ({ x: s.x, y: s.y }));

  // If search space didn't yield enough slots, generate fallback non-overlapping slots dynamically
  if (selectedSlots.length < count) {
    let r = 1;
    while (selectedSlots.length < count && r <= maxSearchRadius + 20) {
      for (let c = -maxSearchRadius - 10; c <= maxSearchRadius + 10; c++) {
        if (selectedSlots.length >= count) break;
        if (bias === 'field' && r <= 0) continue;
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
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;
  const maxSatelliteDistance = options.maxSatelliteDistance ?? 280;
  const layerYOffsets = options.layerYOffsets ?? DEFAULT_LAYER_Y_OFFSETS;
  const defaultDomainX = options.defaultDomainX ?? 0;
  const index = options.index;

  // Immutably clone primary positions into result positions
  const positions: Record<string, { x: number; y: number }> = { ...primaryPositions };
  const satellitePositions: Record<string, { x: number; y: number }> = {};

  // Track primary / locked node IDs to guarantee they are never moved
  const primaryNodeIds = new Set(Object.keys(primaryPositions));

  // Occupied positions list for collision-free slot generation
  const occupiedList: Point[] = Object.values(primaryPositions).map(p => ({ x: p.x, y: p.y }));

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
      : layerYOffsets.application;

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
        'neutral'
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
            'neutral'
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
    let hY = anchorPos ? anchorPos.y : layerYOffsets.application;

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
        'neutral'
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

    const slots = generateSatelliteSlots(
      parentPos,
      fields.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field'
    );

    fields.forEach((fieldItem, idx) => {
      const slot = slots[idx] || {
        x: parentPos.x + (idx + 1) * (nodeWidth + horizontalGap),
        y: parentPos.y + (nodeHeight + verticalGap),
      };

      positions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[fieldItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedFieldsCount++;
    });
  });

  // Place unanchored fields in schema layer fallback grid
  unanchoredFields.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  if (unanchoredFields.length > 0) {
    const fallbackAnchor: Point = { x: defaultDomainX, y: layerYOffsets.schema };
    const fallbackSlots = generateSatelliteSlots(
      fallbackAnchor,
      unanchoredFields.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'field'
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

    const slots = generateSatelliteSlots(
      targetPos,
      tests.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test'
    );

    tests.forEach((testItem, idx) => {
      const slot = slots[idx] || {
        x: targetPos.x + (nodeWidth + horizontalGap),
        y: targetPos.y + idx * (nodeHeight + verticalGap),
      };

      positions[testItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[testItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedTestsCount++;
    });
  });

  // Place unanchored tests in fallback domain/layer cluster
  unanchoredTests.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  if (unanchoredTests.length > 0) {
    const fallbackAnchor: Point = { x: defaultDomainX, y: layerYOffsets.application };
    const fallbackSlots = generateSatelliteSlots(
      fallbackAnchor,
      unanchoredTests.length,
      occupiedList,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      maxSatelliteDistance,
      'test'
    );

    unanchoredTests.forEach((testItem, idx) => {
      const slot = fallbackSlots[idx] || {
        x: fallbackAnchor.x + (nodeWidth + horizontalGap),
        y: fallbackAnchor.y + idx * (nodeHeight + verticalGap),
      };

      positions[testItem.nodeId] = { x: slot.x, y: slot.y };
      satellitePositions[testItem.nodeId] = { x: slot.x, y: slot.y };
      occupiedList.push({ x: slot.x, y: slot.y });
      placedTestsCount++;
    });
  }

  return {
    positions,
    satellitePositions,
    placedTestsCount,
    placedFieldsCount,
    placedMicroclusterCount,
  };
}
