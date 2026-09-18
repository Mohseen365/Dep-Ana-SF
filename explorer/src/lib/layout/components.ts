/**
 * Deterministic spatial packing for disconnected graph components.
 *
 * Implements a 2D geometry-based shelf packing algorithm (First-Fit Decreasing Height - FFDH variant)
 * that arranges disconnected components based on actual component bounding box geometry.
 *
 * Guarantees:
 * - Zero component overlap
 * - Configurable minimum separation gaps
 * - Deterministic placement across executions
 * - Support for diverse component aspect ratios and mixtures
 * - Compact 2D bounding-box layout (avoids single-line horizontal stretching)
 */

export interface ComponentRectangle {
  /** Unique component ID or index */
  id: string | number;
  /** Bounding box width */
  width: number;
  /** Bounding box height */
  height: number;
  /** Optional structural importance score (e.g. centrality/degree sum) */
  structuralImportance?: number;
  /** Optional total node count in component */
  nodeCount?: number;
  /** Optional minimum node ID in component (for deterministic sorting tie-breaker) */
  minNodeId?: string;
  /** Local bounding box minX offset (default: 0) */
  minX?: number;
  /** Local bounding box minY offset (default: 0) */
  minY?: number;
}

export interface ComponentLocalLayout {
  /** Unique component ID or index */
  id: string | number;
  /** Map of nodeId -> local {x, y} coordinates */
  positions: Record<string, { x: number; y: number }>;
  /** Optional node width for computing bounding boxes (default: 120) */
  nodeWidth?: number;
  /** Optional node height for computing bounding boxes (default: 60) */
  nodeHeight?: number;
  /** Optional structural importance score */
  structuralImportance?: number;
  /** Optional min node ID */
  minNodeId?: string;
}

export interface ComponentPackingOptions {
  /** Configurable minimum clearance gap between component bounding boxes (default: 100) */
  gap?: number;
  /** Maximum target canvas/row packing width. If omitted, derived deterministically from aggregate geometry. */
  targetWidth?: number;
  /** Preferred aspect ratio (width / height) when computing target canvas width (default: 1.6) */
  targetAspectRatio?: number;
  /** Default node width when bounding box is computed from node centers (default: 120) */
  nodeWidth?: number;
  /** Default node height when bounding box is computed from node centers (default: 60) */
  nodeHeight?: number;
}

export interface PlacedComponent {
  /** Component ID */
  id: string | number;
  /** Global top-left X coordinate of the component bounding box */
  x: number;
  /** Global top-left Y coordinate of the component bounding box */
  y: number;
  /** Offset vector to translate local node coordinates to global coordinates */
  offset: {
    x: number;
    y: number;
  };
  /** Placed global bounding box */
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface PackedLayoutResult {
  /** Map of component ID -> coordinate offset vector {x, y} */
  offsets: Record<string | number, { x: number; y: number }>;
  /** Array of placed component bounding box details */
  placedComponents: PlacedComponent[];
  /** Combined global bounding box containing all packed components */
  totalBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    area: number;
  };
  /** Sum of individual component bounding box areas */
  usedArea: number;
  /** Unused bounding box area ratio: 1 - (usedArea / totalBounds.area) */
  unusedSpaceRatio: number;
}

/**
 * Deterministically compares two component rectangles for sorting before packing.
 *
 * Ordering priority:
 * 1. Structural importance (descending)
 * 2. Component node count (descending)
 * 3. Component area (width * height) (descending)
 * 4. Component height (descending - primary key for shelf creation)
 * 5. Component width (descending)
 * 6. Minimum node ID (ascending string comparison)
 * 7. Component ID (ascending string comparison)
 */
export function compareComponents(a: ComponentRectangle, b: ComponentRectangle): number {
  // 1. Structural importance
  if (a.structuralImportance !== undefined && b.structuralImportance !== undefined) {
    if (a.structuralImportance !== b.structuralImportance) {
      return b.structuralImportance - a.structuralImportance;
    }
  }

  // 2. Component node count
  if (a.nodeCount !== undefined && b.nodeCount !== undefined) {
    if (a.nodeCount !== b.nodeCount) {
      return b.nodeCount - a.nodeCount;
    }
  }

  // 3. Component area
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  if (Math.abs(areaA - areaB) > 1e-6) {
    return areaB - areaA;
  }

  // 4. Component height
  if (Math.abs(a.height - b.height) > 1e-6) {
    return b.height - a.height;
  }

  // 5. Component width
  if (Math.abs(a.width - b.width) > 1e-6) {
    return b.width - a.width;
  }

  // 6. Minimum Node ID
  if (a.minNodeId !== undefined && b.minNodeId !== undefined) {
    const cmp = a.minNodeId.localeCompare(b.minNodeId);
    if (cmp !== 0) return cmp;
  }

  // 7. Component ID
  return String(a.id).localeCompare(String(b.id));
}

interface Shelf {
  y: number;
  height: number;
  currentX: number;
  items: ComponentRectangle[];
}

/**
 * Packs component bounding boxes deterministically into a non-overlapping 2D layout.
 *
 * @param rects Array of component rectangles to pack
 * @param options Packing configuration options (gap, targetWidth, targetAspectRatio)
 * @returns PackedLayoutResult with offsets, placed components, and bounding box metrics
 */
export function packComponents(
  rects: ComponentRectangle[],
  options: ComponentPackingOptions = {}
): PackedLayoutResult {
  const gap = options.gap ?? 100;
  const targetAspectRatio = options.targetAspectRatio ?? 1.6;

  if (rects.length === 0) {
    return {
      offsets: {},
      placedComponents: [],
      totalBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0, area: 0 },
      usedArea: 0,
      unusedSpaceRatio: 0,
    };
  }

  // Sort components deterministically
  const sortedRects = [...rects].sort(compareComponents);

  // Compute maximum individual component width
  let maxCompWidth = 0;
  let totalCompArea = 0;
  for (const r of sortedRects) {
    if (r.width > maxCompWidth) maxCompWidth = r.width;
    totalCompArea += (r.width + gap) * (r.height + gap);
  }

  // Determine target canvas packing width
  let targetWidth: number;
  if (options.targetWidth !== undefined && options.targetWidth > 0) {
    targetWidth = Math.max(options.targetWidth, maxCompWidth);
  } else {
    // Derive deterministic target width from aggregate geometry and target aspect ratio
    const idealWidth = Math.sqrt(totalCompArea * targetAspectRatio);
    targetWidth = Math.max(idealWidth, maxCompWidth);
  }

  const shelves: Shelf[] = [];
  const placedComponents: PlacedComponent[] = [];
  const offsets: Record<string | number, { x: number; y: number }> = {};

  for (const rect of sortedRects) {
    let placedShelf: Shelf | null = null;

    // First-fit search across existing shelves.
    // Non-last shelves require rect.height <= shelf.height to prevent expanding height into shelves below.
    for (let i = 0; i < shelves.length; i++) {
      const shelf = shelves[i];
      const isLastShelf = i === shelves.length - 1;
      const fitsHorizontally = shelf.currentX + rect.width <= targetWidth;
      const fitsVertically = isLastShelf || rect.height <= shelf.height;

      if (fitsHorizontally && fitsVertically) {
        placedShelf = shelf;
        break;
      }
    }

    if (!placedShelf) {
      // Create new shelf below previous shelves
      let newY = 0;
      if (shelves.length > 0) {
        const lastShelf = shelves[shelves.length - 1];
        newY = lastShelf.y + lastShelf.height + gap;
      }

      placedShelf = {
        y: newY,
        height: rect.height,
        currentX: 0,
        items: [],
      };
      shelves.push(placedShelf);
    }

    const globalX = placedShelf.currentX;
    const globalY = placedShelf.y;

    const localMinX = rect.minX ?? 0;
    const localMinY = rect.minY ?? 0;

    const offsetX = globalX - localMinX;
    const offsetY = globalY - localMinY;

    offsets[rect.id] = { x: offsetX, y: offsetY };

    const placed: PlacedComponent = {
      id: rect.id,
      x: globalX,
      y: globalY,
      offset: { x: offsetX, y: offsetY },
      bounds: {
        minX: globalX,
        maxX: globalX + rect.width,
        minY: globalY,
        maxY: globalY + rect.height,
        width: rect.width,
        height: rect.height,
      },
    };

    placedComponents.push(placed);
    placedShelf.items.push(rect);
    placedShelf.currentX += rect.width + gap;
    if (rect.height > placedShelf.height) {
      placedShelf.height = rect.height;
    }
  }

  // Calculate global bounding box & metrics
  let gMinX = Infinity;
  let gMaxX = -Infinity;
  let gMinY = Infinity;
  let gMaxY = -Infinity;
  let usedArea = 0;

  for (const p of placedComponents) {
    if (p.bounds.minX < gMinX) gMinX = p.bounds.minX;
    if (p.bounds.maxX > gMaxX) gMaxX = p.bounds.maxX;
    if (p.bounds.minY < gMinY) gMinY = p.bounds.minY;
    if (p.bounds.maxY > gMaxY) gMaxY = p.bounds.maxY;
    usedArea += p.bounds.width * p.bounds.height;
  }

  if (placedComponents.length === 0) {
    gMinX = 0;
    gMaxX = 0;
    gMinY = 0;
    gMaxY = 0;
  }

  const totalWidth = gMaxX - gMinX;
  const totalHeight = gMaxY - gMinY;
  const totalArea = totalWidth * totalHeight;
  const unusedSpaceRatio = totalArea > 0 ? Math.max(0, 1 - usedArea / totalArea) : 0;

  return {
    offsets,
    placedComponents,
    totalBounds: {
      minX: gMinX,
      maxX: gMaxX,
      minY: gMinY,
      maxY: gMaxY,
      width: totalWidth,
      height: totalHeight,
      area: totalArea,
    },
    usedArea,
    unusedSpaceRatio,
  };
}

/**
 * Calculates local bounding box for a set of node center positions.
 *
 * @param positions Record of nodeId -> {x, y}
 * @param nodeWidth Node bounding box width (default: 120)
 * @param nodeHeight Node bounding box height (default: 60)
 */
export function calculateLocalComponentBounds(
  positions: Record<string, { x: number; y: number }>,
  nodeWidth = 120,
  nodeHeight = 60
): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } {
  const nodeIds = Object.keys(positions);
  if (nodeIds.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minNodeX = Infinity;
  let maxNodeX = -Infinity;
  let minNodeY = Infinity;
  let maxNodeY = -Infinity;

  for (const id of nodeIds) {
    const pos = positions[id];
    if (pos) {
      if (pos.x < minNodeX) minNodeX = pos.x;
      if (pos.x > maxNodeX) maxNodeX = pos.x;
      if (pos.y < minNodeY) minNodeY = pos.y;
      if (pos.y > maxNodeY) maxNodeY = pos.y;
    }
  }

  const minX = minNodeX - nodeWidth / 2;
  const maxX = maxNodeX + nodeWidth / 2;
  const minY = minNodeY - nodeHeight / 2;
  const maxY = maxNodeY + nodeHeight / 2;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(nodeWidth, maxX - minX),
    height: Math.max(nodeHeight, maxY - minY),
  };
}

/**
 * Convenience helper to pack component local position maps directly into a combined global coordinate map.
 *
 * @param components Array of ComponentLocalLayout definitions
 * @param options ComponentPackingOptions
 * @returns Map of nodeId -> global {x, y} coordinates and PackedLayoutResult
 */
export function packComponentPositions(
  components: ComponentLocalLayout[],
  options: ComponentPackingOptions = {}
): {
  positions: Record<string, { x: number; y: number }>;
  packedResult: PackedLayoutResult;
} {
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;

  const rects: ComponentRectangle[] = [];

  for (const comp of components) {
    const bounds = calculateLocalComponentBounds(comp.positions, nodeWidth, nodeHeight);
    const nodeIds = Object.keys(comp.positions).sort();
    const minNodeId = comp.minNodeId ?? (nodeIds.length > 0 ? nodeIds[0] : undefined);

    rects.push({
      id: comp.id,
      width: bounds.width,
      height: bounds.height,
      minX: bounds.minX,
      minY: bounds.minY,
      nodeCount: nodeIds.length,
      structuralImportance: comp.structuralImportance,
      minNodeId,
    });
  }

  const packedResult = packComponents(rects, options);
  const globalPositions: Record<string, { x: number; y: number }> = {};

  for (const comp of components) {
    const offset = packedResult.offsets[comp.id] ?? { x: 0, y: 0 };
    for (const [nodeId, localPos] of Object.entries(comp.positions)) {
      globalPositions[nodeId] = {
        x: localPos.x + offset.x,
        y: localPos.y + offset.y,
      };
    }
  }

  return {
    positions: globalPositions,
    packedResult,
  };
}
