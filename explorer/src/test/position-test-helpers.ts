import { expect } from 'vitest';

export interface PositionMap {
  [nodeId: string]: { x: number; y: number };
}

/**
 * Captures (x, y) coordinates for all currently rendered nodes in a Cytoscape instance.
 */
export function captureNodePositions(cy: any): PositionMap {
  const positions: PositionMap = {};
  if (!cy || typeof cy.nodes !== 'function') {
    return positions;
  }

  const nodes = cy.nodes();
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (typeof node.id === 'function' && typeof node.position === 'function') {
        const id = node.id();
        const pos = node.position();
        if (id && pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          positions[id] = { x: pos.x, y: pos.y };
        }
      }
    }
  } else if (nodes && typeof nodes.forEach === 'function') {
    nodes.forEach((node: any) => {
      const id = typeof node.id === 'function' ? node.id() : node.data?.id;
      const pos = typeof node.position === 'function' ? node.position() : null;
      if (id && pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        positions[id] = { x: pos.x, y: pos.y };
      }
    });
  }

  return positions;
}

/**
 * Asserts that two position maps are exact equal for all common node IDs.
 */
export function expectPositionsEqual(before: PositionMap, after: PositionMap): void {
  const beforeKeys = Object.keys(before);

  // Compare every key present in both or before
  for (const key of beforeKeys) {
    if (after[key] !== undefined) {
      expect(after[key].x, `Node ${key} x coordinate changed`).toBe(before[key].x);
      expect(after[key].y, `Node ${key} y coordinate changed`).toBe(before[key].y);
    }
  }
}

/**
 * Asserts that ONLY node IDs in `allowedNodeIds` moved between before and after.
 */
export function expectOnlyNodesMoved(
  before: PositionMap,
  after: PositionMap,
  allowedNodeIds: string[]
): void {
  const allowedSet = new Set(allowedNodeIds);
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (before[key] && after[key]) {
      const xMoved = before[key].x !== after[key].x;
      const yMoved = before[key].y !== after[key].y;
      if (xMoved || yMoved) {
        expect(
          allowedSet.has(key),
          `Node ${key} was moved from (${before[key].x}, ${before[key].y}) to (${after[key].x}, ${after[key].y}) but was not in allowed list [${allowedNodeIds.join(', ')}]`
        ).toBe(true);
      }
    }
  }
}

/**
 * Asserts that none of the nodes in `existingNodeIds` changed position between before and after.
 */
export function expectNoExistingNodesMoved(
  before: PositionMap,
  after: PositionMap,
  existingNodeIds: string[]
): void {
  for (const key of existingNodeIds) {
    if (before[key] && after[key]) {
      expect(after[key].x, `Existing node ${key} x coordinate moved`).toBe(before[key].x);
      expect(after[key].y, `Existing node ${key} y coordinate moved`).toBe(before[key].y);
    }
  }
}
