import type { TreemapData, TreemapNode } from './treemap-adapter';

export interface TreemapRect {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  height: number;
  depth: number;
  type: TreemapNode['type'];
  displayName: string;
  value: number;
  node: TreemapNode;
  children?: TreemapRect[];
}

export interface LayoutTreemapOptions {
  width: number;
  height: number;
  padding?: number; // Inner padding for container nodes
  targetSubtreeId?: string; // Optional focus on a specific root/subtree node
}

/**
 * Pure, deterministic squarified treemap layout engine (Bruls et al. implementation).
 * Recursively computes layout rectangles for treemap hierarchy nodes within a specified bounding box.
 */
export function computeTreemapLayout(
  data: TreemapData,
  options: LayoutTreemapOptions
): TreemapRect | null {
  const { width, height, padding = 4, targetSubtreeId } = options;

  if (!data || !data.nodes || width <= 0 || height <= 0) {
    return null;
  }

  const rootId = targetSubtreeId && data.nodes[targetSubtreeId] ? targetSubtreeId : data.rootId;
  const rootNode = data.nodes[rootId];

  if (!rootNode) {
    return null;
  }

  return layoutNode(data.nodes, rootNode, 0, 0, width, height, padding);
}

function layoutNode(
  nodes: Record<string, TreemapNode>,
  node: TreemapNode,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  padding: number
): TreemapRect {
  const width = Math.max(0, x1 - x0);
  const height = Math.max(0, y1 - y0);

  const rect: TreemapRect = {
    id: node.id,
    x0,
    y0,
    x1,
    y1,
    width,
    height,
    depth: node.depth,
    type: node.type,
    displayName: node.displayName,
    value: node.value,
    node,
    children: [],
  };

  if (!node.childIds || node.childIds.length === 0) {
    return rect;
  }

  // Retrieve child nodes
  const childrenNodes: TreemapNode[] = node.childIds
    .map(childId => nodes[childId])
    .filter((c): c is TreemapNode => c !== undefined);

  if (childrenNodes.length === 0) {
    return rect;
  }

  // Inner bounds after container padding
  const innerX0 = x0 + padding;
  const innerY0 = y0 + padding + (node.type !== 'root' ? 18 : 0); // extra top header room for label
  const innerX1 = Math.max(innerX0, x1 - padding);
  const innerY1 = Math.max(innerY0, y1 - padding);

  const innerWidth = innerX1 - innerX0;
  const innerHeight = innerY1 - innerY0;

  if (innerWidth <= 0 || innerHeight <= 0) {
    return rect;
  }

  // Squarified layout algorithm
  const childRects = squarify(
    nodes,
    childrenNodes,
    innerX0,
    innerY0,
    innerX1,
    innerY1,
    padding
  );

  rect.children = childRects;
  return rect;
}

function squarify(
  nodes: Record<string, TreemapNode>,
  children: TreemapNode[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  padding: number
): TreemapRect[] {
  // Sort children deterministically descending by value, breaking ties by ID
  const sortedChildren = [...children].sort((a, b) => {
    if (b.value !== a.value) {
      return b.value - a.value;
    }
    return a.id.localeCompare(b.id);
  });

  const totalValue = sortedChildren.reduce((sum, c) => sum + c.value, 0);

  if (totalValue <= 0) {
    // If all children have zero metric value, distribute area equally
    return layoutEqualGrid(nodes, sortedChildren, x0, y0, x1, y1, padding);
  }

  const result: TreemapRect[] = [];
  layoutRow(nodes, sortedChildren, [], x0, y0, x1 - x0, y1 - y0, totalValue, result, padding);
  return result;
}

function layoutRow(
  nodes: Record<string, TreemapNode>,
  children: TreemapNode[],
  currentRow: TreemapNode[],
  x0: number,
  y0: number,
  width: number,
  height: number,
  totalValue: number,
  result: TreemapRect[],
  padding: number
) {
  if (children.length === 0) {
    if (currentRow.length > 0) {
      positionRow(nodes, currentRow, x0, y0, width, height, totalValue, result, padding);
    }
    return;
  }

  const nextChild = children[0];
  const remainingChildren = children.slice(1);

  if (currentRow.length === 0) {
    layoutRow(nodes, remainingChildren, [nextChild], x0, y0, width, height, totalValue, result, padding);
    return;
  }

  const currentWorst = worstAspectRatio(currentRow, width, height, totalValue);
  const candidateWorst = worstAspectRatio([...currentRow, nextChild], width, height, totalValue);

  if (candidateWorst <= currentWorst) {
    // Adding nextChild improves or keeps aspect ratio acceptable
    layoutRow(nodes, remainingChildren, [...currentRow, nextChild], x0, y0, width, height, totalValue, result, padding);
  } else {
    // Current row is optimal, position it and start new row in remaining space
    const rowArea = (currentRow.reduce((sum, c) => sum + c.value, 0) / totalValue) * (width * height);
    let newX0 = x0;
    let newY0 = y0;
    let newWidth = width;
    let newHeight = height;

    if (width >= height) {
      const rowWidth = width > 0 ? rowArea / height : 0;
      positionRow(nodes, currentRow, x0, y0, rowWidth, height, totalValue, result, padding);
      newX0 = x0 + rowWidth;
      newWidth = Math.max(0, width - rowWidth);
    } else {
      const rowHeight = height > 0 ? rowArea / width : 0;
      positionRow(nodes, currentRow, x0, y0, width, rowHeight, totalValue, result, padding);
      newY0 = y0 + rowHeight;
      newHeight = Math.max(0, height - rowHeight);
    }

    const remainingTotalValue = totalValue - currentRow.reduce((sum, c) => sum + c.value, 0);
    layoutRow(nodes, remainingChildren, [nextChild], newX0, newY0, newWidth, newHeight, remainingTotalValue, result, padding);
  }
}

function positionRow(
  nodes: Record<string, TreemapNode>,
  row: TreemapNode[],
  x0: number,
  y0: number,
  width: number,
  height: number,
  _totalValue: number,
  result: TreemapRect[],
  padding: number
) {
  const rowValueSum = row.reduce((sum, c) => sum + c.value, 0);
  let currentX = x0;
  let currentY = y0;

  row.forEach(child => {
    const fraction = rowValueSum > 0 ? child.value / rowValueSum : 1 / row.length;
    let cx0 = currentX;
    let cy0 = currentY;
    let cx1 = currentX;
    let cy1 = currentY;

    if (width >= height) {
      const childHeight = height * fraction;
      cy1 = currentY + childHeight;
      cx1 = currentX + width;
      currentY = cy1;
    } else {
      const childWidth = width * fraction;
      cx1 = currentX + childWidth;
      cy1 = currentY + height;
      currentX = cx1;
    }

    const childRect = layoutNode(nodes, child, cx0, cy0, cx1, cy1, padding);
    result.push(childRect);
  });
}

function worstAspectRatio(row: TreemapNode[], width: number, height: number, totalValue: number): number {
  if (row.length === 0 || totalValue <= 0 || width <= 0 || height <= 0) return Infinity;

  const area = width * height;
  const rowSum = row.reduce((s, c) => s + c.value, 0);
  const rowArea = (rowSum / totalValue) * area;
  if (rowArea <= 0) return Infinity;

  const sideLength = width >= height ? height : width;

  let maxAspect = 0;
  row.forEach(item => {
    const itemArea = (item.value / totalValue) * area;
    if (itemArea <= 0) return;
    const lengthInSide = itemArea / (rowArea / sideLength);
    const otherSide = rowArea / sideLength;
    const aspect = Math.max(lengthInSide / otherSide, otherSide / lengthInSide);
    if (aspect > maxAspect) maxAspect = aspect;
  });

  return maxAspect || Infinity;
}

function layoutEqualGrid(
  nodes: Record<string, TreemapNode>,
  children: TreemapNode[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  padding: number
): TreemapRect[] {
  const count = children.length;
  if (count === 0) return [];

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const cellWidth = (x1 - x0) / cols;
  const cellHeight = (y1 - y0) / rows;

  const result: TreemapRect[] = [];

  children.forEach((child, index) => {
    const c = index % cols;
    const r = Math.floor(index / cols);

    const cx0 = x0 + c * cellWidth;
    const cy0 = y0 + r * cellHeight;
    const cx1 = Math.min(x1, cx0 + cellWidth);
    const cy1 = Math.min(y1, cy0 + cellHeight);

    result.push(layoutNode(nodes, child, cx0, cy0, cx1, cy1, padding));
  });

  return result;
}
