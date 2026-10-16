import type { ExplorerEdge } from '../types/explorer';

export type LayoutMode = 'static' | 'interactive';

export type LayoutTrigger =
  | 'initial'
  | 'graph-update'
  | 'filter-change'
  | 'focus-change'
  | 'investigation'
  | 'new-nodes'
  | 'mode-switch'
  | 'architecture-mode-switch'
  | 'reset-layout';

export interface Position {
  x: number;
  y: number;
}

export type PositionAuthorityLevel = 1 | 2 | 3 | 4 | 5;

export interface ResolvedPosition {
  position: Position;
  level: PositionAuthorityLevel;
}

/**
 * Central policy decision mechanism determining whether a full graph layout or selective placement
 * should execute for a given layout trigger and operational mode.
 *
 * Rules:
 * Static Mode:
 * - initial → only if no authoritative positions exist
 * - graph-update → no automatic relayout
 * - filter-change → no automatic relayout
 * - focus-change → no automatic relayout
 * - investigation → no automatic relayout
 * - new-nodes → only place new nodes ('place-new-only')
 * - mode-switch → capture/restore, no visual rearrangement
 * - reset-layout → allowed (true)
 *
 * Interactive Mode:
 * - retains existing layout semantics:
 * - initial → only if no authoritative positions exist
 * - reset-layout → allowed (true)
 * - graph-update / filter-change / focus-change / investigation / mode-switch → no automatic relayout if positions exist
 * - new-nodes → 'place-new-only'
 */
export function shouldAutoLayout(
  mode: LayoutMode,
  trigger: LayoutTrigger,
  context?: {
    hasAuthoritativePositions?: boolean;
    hasNewNodes?: boolean;
  }
): boolean | 'place-new-only' {
  if (trigger === 'reset-layout') {
    return true;
  }

  const hasAuth = Boolean(context?.hasAuthoritativePositions);

  if (mode === 'static') {
    switch (trigger) {
      case 'initial':
        return !hasAuth;
      case 'graph-update':
      case 'filter-change':
      case 'focus-change':
      case 'investigation':
      case 'mode-switch':
        return false;
      case 'architecture-mode-switch':
        return true;
      case 'new-nodes':
        return hasAuth ? 'place-new-only' : true;
      default:
        return false;
    }
  } else {
    // Interactive mode
    switch (trigger) {
      case 'initial':
        return !hasAuth;
      case 'graph-update':
        return !hasAuth;
      case 'architecture-mode-switch':
        return true;
      case 'filter-change':
      case 'focus-change':
      case 'investigation':
      case 'mode-switch':
        return false;
      case 'new-nodes':
        return hasAuth ? 'place-new-only' : true;
      default:
        return false;
    }
  }
}

/**
 * Resolves the position for a single node based on the 5-level Position Authority hierarchy:
 * 1. Explicit current user position (in-session user drag)
 * 2. Persisted project position (localStorage project state)
 * 3. Existing Cytoscape position during incremental update
 * 4. Intelligent initial layout (handled at graph level when no positions exist)
 * 5. Deterministic fallback placement (handled via calculateDeterministicNewNodePosition)
 */
export function resolveAuthoritativePosition(
  nodeId: string,
  options: {
    sessionPositions?: Map<string, Position> | Record<string, Position>;
    persistedPositions?: Record<string, Position>;
    cyNodePosition?: Position | null;
    hasAuthoritativePositions?: boolean;
  }
): ResolvedPosition | null {
  const { sessionPositions, persistedPositions, cyNodePosition, hasAuthoritativePositions = true } = options;

  // Level 1: Explicit current user position
  if (sessionPositions) {
    let sessionPos: Position | undefined;
    if (sessionPositions instanceof Map) {
      sessionPos = sessionPositions.get(nodeId);
    } else {
      sessionPos = sessionPositions[nodeId];
    }
    if (sessionPos && typeof sessionPos.x === 'number' && typeof sessionPos.y === 'number' && !isNaN(sessionPos.x) && !isNaN(sessionPos.y)) {
      return { position: { x: sessionPos.x, y: sessionPos.y }, level: 1 };
    }
  }

  // Level 2: Persisted project position (only if authoritative for active layout mode)
  if (hasAuthoritativePositions && persistedPositions && persistedPositions[nodeId]) {
    const pPos = persistedPositions[nodeId];
    if (pPos && typeof pPos.x === 'number' && typeof pPos.y === 'number' && !isNaN(pPos.x) && !isNaN(pPos.y)) {
      return { position: { x: pPos.x, y: pPos.y }, level: 2 };
    }
  }

  // Level 3: Existing Cytoscape position during incremental update (only if authoritative for active layout mode)
  if (hasAuthoritativePositions && cyNodePosition && typeof cyNodePosition.x === 'number' && typeof cyNodePosition.y === 'number' && !isNaN(cyNodePosition.x) && !isNaN(cyNodePosition.y)) {
    return { position: { x: cyNodePosition.x, y: cyNodePosition.y }, level: 3 };
  }

  return null;
}

/**
 * Helper to produce a simple deterministic 32-bit integer hash from a string ID.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Level 5: Deterministic Fallback Placement for genuinely new nodes inserted into a graph
 * where existing nodes have authoritative positions.
 *
 * Algorithm:
 * 1. Checks connected neighbors of `nodeId` in `edges`.
 * 2. If neighbors with known positions exist, calculates their average position (centroid) and applies a deterministic offset.
 * 3. If no neighbors have known positions, places the node on a deterministic grid offset around origin (0, 0).
 */
export function calculateDeterministicNewNodePosition(
  nodeId: string,
  edges: ExplorerEdge[],
  knownPositions: Record<string, Position>
): Position {
  const neighborIds = new Set<string>();
  for (const edge of edges) {
    if (edge.source === nodeId) neighborIds.add(edge.target);
    if (edge.target === nodeId) neighborIds.add(edge.source);
  }

  const validNeighborPositions: Position[] = [];
  for (const nId of neighborIds) {
    if (knownPositions[nId]) {
      validNeighborPositions.push(knownPositions[nId]);
    }
  }

  const hash = simpleHash(nodeId);

  if (validNeighborPositions.length > 0) {
    let sumX = 0;
    let sumY = 0;
    for (const pos of validNeighborPositions) {
      sumX += pos.x;
      sumY += pos.y;
    }
    const avgX = sumX / validNeighborPositions.length;
    const avgY = sumY / validNeighborPositions.length;

    const offsetX = 40 + (hash % 60);
    const offsetY = 40 + ((hash >> 2) % 60);

    return {
      x: Math.round(avgX + offsetX),
      y: Math.round(avgY + offsetY),
    };
  }

  // Fallback grid placement around origin (0, 0)
  const gridX = ((hash % 10) - 5) * 100;
  const gridY = (((hash >> 3) % 10) - 5) * 100;

  return { x: gridX, y: gridY };
}
