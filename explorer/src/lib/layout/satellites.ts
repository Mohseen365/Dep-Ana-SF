import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
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
 * Main entry point for Agent 3C Satellite Layout.
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
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const layerYOffsets = options.layerYOffsets ?? DEFAULT_LAYER_Y_OFFSETS;
  const defaultDomainX = options.defaultDomainX ?? 0;

  // Immutably clone primary positions into result positions
  const positions: Record<string, { x: number; y: number }> = { ...primaryPositions };
  const satellitePositions: Record<string, { x: number; y: number }> = {};

  // Track primary / locked node IDs to guarantee they are never moved
  const primaryNodeIds = new Set(Object.keys(primaryPositions));

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

  // Process triggers first
  for (const triggerItem of triggerAnalyses) {
    if (primaryNodeIds.has(triggerItem.nodeId)) continue; // Already placed as primary

    // Find connected CustomObject / Object
    const connectedEdges = edges.filter(
      e => e.source === triggerItem.nodeId || e.target === triggerItem.nodeId
    );

    let parentObjectPos: { x: number; y: number } | null = null;
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

    let trigX = defaultDomainX;
    let trigY = layerYOffsets.application;

    if (parentObjectPos) {
      // Position trigger in Application layer directly above/aligned with parent object
      trigX = parentObjectPos.x;
      trigY = layerYOffsets.application;
    }

    positions[triggerItem.nodeId] = { x: trigX, y: trigY };
    satellitePositions[triggerItem.nodeId] = { x: trigX, y: trigY };
    placedMicroclusterCount++;

    // Place connected Handler relative to Trigger if handler is not primary
    if (connectedHandlerId && !primaryNodeIds.has(connectedHandlerId)) {
      const handlerItem = nodeAnalysisMap.get(connectedHandlerId);
      if (handlerItem) {
        // Find if handler connects to a Service
        const handlerEdges = edges.filter(
          e => e.source === connectedHandlerId || e.target === connectedHandlerId
        );
        let servicePos: { x: number; y: number } | null = null;

        for (const hEdge of handlerEdges) {
          const hOtherId = hEdge.source === connectedHandlerId ? hEdge.target : hEdge.source;
          if (hOtherId !== triggerItem.nodeId && positions[hOtherId]) {
            servicePos = positions[hOtherId];
            break;
          }
        }

        let handlerX = trigX + nodeWidth * 1.25;
        let handlerY = trigY;

        if (servicePos) {
          // Place handler midway between trigger and service
          handlerX = (trigX + servicePos.x) / 2;
          handlerY = (trigY + servicePos.y) / 2;
        }

        positions[connectedHandlerId] = { x: handlerX, y: handlerY };
        satellitePositions[connectedHandlerId] = { x: handlerX, y: handlerY };
        placedMicroclusterCount++;
      }
    }
  }

  // Handle remaining unplaced handlers
  for (const handlerItem of handlerAnalyses) {
    if (positions[handlerItem.nodeId]) continue; // Already placed

    const connectedEdges = edges.filter(
      e => e.source === handlerItem.nodeId || e.target === handlerItem.nodeId
    );

    let anchorPos: { x: number; y: number } | null = null;
    for (const edge of connectedEdges) {
      const otherId = edge.source === handlerItem.nodeId ? edge.target : edge.source;
      if (positions[otherId]) {
        anchorPos = positions[otherId];
        break;
      }
    }

    const hX = anchorPos ? anchorPos.x + nodeWidth * 1.25 : defaultDomainX;
    const hY = anchorPos ? anchorPos.y : layerYOffsets.application;

    positions[handlerItem.nodeId] = { x: hX, y: hY };
    satellitePositions[handlerItem.nodeId] = { x: hX, y: hY };
    placedMicroclusterCount++;
  }

  // --------------------------------------------------------------------------
  // STAGE 2: FIELD SATELLITE PLACEMENT
  // --------------------------------------------------------------------------
  let placedFieldsCount = 0;

  // Group fields by parent object ID
  const fieldsByParent = new Map<string, ArchitectureNodeAnalysis[]>();
  const unanchoredFields: ArchitectureNodeAnalysis[] = [];

  for (const fieldItem of fieldAnalyses) {
    if (primaryNodeIds.has(fieldItem.nodeId)) continue; // Keep primary if already placed

    let parentId = fieldItem.parentObjectId;
    if (!parentId) {
      parentId = findParentObjectId(fieldItem.node, nodes, edges);
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

  // Place anchored fields in compact local grid centered below parent object
  fieldsByParent.forEach((fields, parentId) => {
    fields.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const parentPos = positions[parentId];

    const totalFields = fields.length;
    const maxCols = totalFields > 6 ? 4 : totalFields > 2 ? 3 : totalFields;

    fields.forEach((fieldItem, idx) => {
      const col = idx % maxCols;
      const row = Math.floor(idx / maxCols);

      const offsetX = (col - (maxCols - 1) / 2) * (nodeWidth * 1.15);
      const offsetY = nodeHeight * 1.75 + row * (nodeHeight * 1.25);

      const fx = parentPos.x + offsetX;
      const fy = parentPos.y + offsetY;

      positions[fieldItem.nodeId] = { x: fx, y: fy };
      satellitePositions[fieldItem.nodeId] = { x: fx, y: fy };
      placedFieldsCount++;
    });
  });

  // Place unanchored fields in schema layer fallback grid
  unanchoredFields.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  unanchoredFields.forEach((fieldItem, idx) => {
    const cols = 3;
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const fx = defaultDomainX + (col - (cols - 1) / 2) * (nodeWidth * 1.15);
    const fy = layerYOffsets.schema + (row + 1) * (nodeHeight * 1.15);

    positions[fieldItem.nodeId] = { x: fx, y: fy };
    satellitePositions[fieldItem.nodeId] = { x: fx, y: fy };
    placedFieldsCount++;
  });

  // --------------------------------------------------------------------------
  // STAGE 3: TEST SATELLITE PLACEMENT
  // --------------------------------------------------------------------------
  let placedTestsCount = 0;

  // Group tests by parent production node ID
  const testsByTarget = new Map<string, ArchitectureNodeAnalysis[]>();
  const unanchoredTests: ArchitectureNodeAnalysis[] = [];

  for (const testItem of testAnalyses) {
    if (primaryNodeIds.has(testItem.nodeId)) continue; // Keep primary if already placed

    let targetId = testItem.parentProductionNodeId;
    if (!targetId) {
      targetId = findParentProductionNodeId(testItem.node, nodes, edges);
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

  // Place anchored tests in a compact deterministic arc / side cluster around target
  testsByTarget.forEach((tests, targetId) => {
    tests.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const targetPos = positions[targetId];

    const count = tests.length;

    if (count === 1) {
      // Single test: place cleanly to the right of the target
      const tx = targetPos.x + nodeWidth * 1.25;
      const ty = targetPos.y;

      positions[tests[0].nodeId] = { x: tx, y: ty };
      satellitePositions[tests[0].nodeId] = { x: tx, y: ty };
      placedTestsCount++;
    } else {
      // Multiple tests: 2-column compact side cluster to the right of target
      const maxCols = 2;
      tests.forEach((testItem, idx) => {
        const col = idx % maxCols;
        const row = Math.floor(idx / maxCols);

        const totalRows = Math.ceil(count / maxCols);
        const rowOffset = (row - (totalRows - 1) / 2) * (nodeHeight * 1.15);
        const colOffset = nodeWidth * 1.25 + col * (nodeWidth * 1.15);

        const tx = targetPos.x + colOffset;
        const ty = targetPos.y + rowOffset;

        positions[testItem.nodeId] = { x: tx, y: ty };
        satellitePositions[testItem.nodeId] = { x: tx, y: ty };
        placedTestsCount++;
      });
    }
  });

  // Place unanchored tests in fallback domain/layer cluster
  unanchoredTests.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  unanchoredTests.forEach((testItem, idx) => {
    const layer = testItem.layer || 'application';
    const baseY = layerYOffsets[layer];

    const maxCols = 2;
    const col = idx % maxCols;
    const row = Math.floor(idx / maxCols);

    const tx = defaultDomainX + nodeWidth * 1.25 + col * (nodeWidth * 1.15);
    const ty = baseY + (row + 1) * (nodeHeight * 1.15);

    positions[testItem.nodeId] = { x: tx, y: ty };
    satellitePositions[testItem.nodeId] = { x: tx, y: ty };
    placedTestsCount++;
  });

  return {
    positions,
    satellitePositions,
    placedTestsCount,
    placedFieldsCount,
    placedMicroclusterCount,
  };
}
