import type { SankeyAdapterData } from '../adapters/sankey-adapter';

export interface SankeyLayoutOptions {
  width?: number;
  height?: number;
  stagePaddingX?: number;
  nodeWidth?: number;
  nodeMinHeight?: number;
  nodeMaxHeight?: number;
  nodeGapY?: number;
  paddingY?: number;
}

export interface SankeyNodeGeometry {
  nodeId: string;
  stageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  flowVolume: number;
}

export interface SankeyFlowGeometry {
  flowId: string;
  sourceFeatureId: string;
  targetFeatureId: string;
  weight: number;
  strokeWidth: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  pathString: string;
  isSelfFlow: boolean;
}

export interface SankeyStageGeometry {
  layer: string;
  label: string;
  orderIndex: number;
  x: number;
  width: number;
}

export interface SankeyLayoutResult {
  width: number;
  height: number;
  stages: SankeyStageGeometry[];
  nodes: SankeyNodeGeometry[];
  flows: SankeyFlowGeometry[];
  nodeGeometryMap: Map<string, SankeyNodeGeometry>;
  flowGeometryMap: Map<string, SankeyFlowGeometry>;
}

/**
 * Deterministic, bounded Sankey / Dependency River flow layout calculator.
 * Computes stage column positions, node card heights/positions, and cubic Bézier flow paths
 * with non-overlapping attachment offsets.
 */
export function computeSankeyLayout(
  data: SankeyAdapterData,
  options: SankeyLayoutOptions = {}
): SankeyLayoutResult {
  const canvasWidth = options.width ?? 1200;
  const canvasMinHeight = options.height ?? 700;
  const stagePaddingX = options.stagePaddingX ?? 40;
  const nodeWidth = options.nodeWidth ?? 180;
  const nodeMinHeight = options.nodeMinHeight ?? 48;
  const nodeMaxHeight = options.nodeMaxHeight ?? 180;
  const nodeGapY = options.nodeGapY ?? 16;
  const paddingY = options.paddingY ?? 60;

  const numStages = data.stages.length;
  const usableWidth = canvasWidth - stagePaddingX * 2;
  const stageXSpacing = numStages > 1 ? (usableWidth - nodeWidth) / (numStages - 1) : 0;

  // 1. Stage Geometries
  const stageGeometries: SankeyStageGeometry[] = data.stages.map((stage, idx) => ({
    layer: stage.layer,
    label: stage.label,
    orderIndex: stage.orderIndex,
    x: stagePaddingX + idx * stageXSpacing,
    width: nodeWidth,
  }));

  // 2. Compute Node Heights and Y Positions per Stage Column
  const nodeGeometryMap = new Map<string, SankeyNodeGeometry>();
  const nodesGeometryList: SankeyNodeGeometry[] = [];

  let maxYEncountered = canvasMinHeight;

  stageGeometries.forEach((stageGeom, stageIdx) => {
    const stageInfo = data.stages[stageIdx];
    const featureIdsInStage = stageInfo.featureIds;

    let currentY = paddingY;

    featureIdsInStage.forEach(nodeId => {
      const node = data.nodeMap.get(nodeId);
      if (!node) return;

      const flowVolume = Math.max(node.totalInflow, node.totalOutflow, 1);
      const computedHeight = Math.min(
        nodeMaxHeight,
        Math.max(nodeMinHeight, nodeMinHeight + flowVolume * 8)
      );

      const nodeGeom: SankeyNodeGeometry = {
        nodeId: node.id,
        stageIndex: stageIdx,
        x: stageGeom.x,
        y: currentY,
        width: nodeWidth,
        height: computedHeight,
        flowVolume,
      };

      nodeGeometryMap.set(node.id, nodeGeom);
      nodesGeometryList.push(nodeGeom);

      currentY += computedHeight + nodeGapY;
    });

    if (currentY + paddingY > maxYEncountered) {
      maxYEncountered = currentY + paddingY;
    }
  });

  const finalCanvasHeight = Math.max(canvasMinHeight, maxYEncountered);

  // 3. Compute Flow Paths with Non-Overlapping Attachment Offsets
  const flowGeometryMap = new Map<string, SankeyFlowGeometry>();
  const flowsGeometryList: SankeyFlowGeometry[] = [];

  const sourceFlowOffsetMap = new Map<string, number>();
  const targetFlowOffsetMap = new Map<string, number>();

  data.nodes.forEach(n => {
    sourceFlowOffsetMap.set(n.id, 0);
    targetFlowOffsetMap.set(n.id, 0);
  });

  // Sort flows deterministically by source stage, source Y, target stage, target Y
  const sortedFlows = [...data.flows].sort((a, b) => {
    const srcGeomA = nodeGeometryMap.get(a.sourceFeatureId);
    const srcGeomB = nodeGeometryMap.get(b.sourceFeatureId);
    const tgtGeomA = nodeGeometryMap.get(a.targetFeatureId);
    const tgtGeomB = nodeGeometryMap.get(b.targetFeatureId);

    const srcYA = srcGeomA?.y ?? 0;
    const srcYB = srcGeomB?.y ?? 0;
    const tgtYA = tgtGeomA?.y ?? 0;
    const tgtYB = tgtGeomB?.y ?? 0;

    return (
      (srcGeomA?.stageIndex ?? 0) - (srcGeomB?.stageIndex ?? 0) ||
      srcYA - srcYB ||
      (tgtGeomA?.stageIndex ?? 0) - (tgtGeomB?.stageIndex ?? 0) ||
      tgtYA - tgtYB ||
      a.id.localeCompare(b.id)
    );
  });

  sortedFlows.forEach(flow => {
    const srcGeom = nodeGeometryMap.get(flow.sourceFeatureId);
    const tgtGeom = nodeGeometryMap.get(flow.targetFeatureId);

    if (!srcGeom || !tgtGeom) return;

    const strokeWidth = Math.min(24, Math.max(3, flow.weight * 2.5));

    const isSelf = flow.isSelfFlow;

    if (isSelf) {
      // Self flow loop path on right side of node
      const currentSourceOffset = sourceFlowOffsetMap.get(flow.sourceFeatureId) || 0;
      const srcX = srcGeom.x + srcGeom.width;
      const srcY = srcGeom.y + 12 + currentSourceOffset;

      const loopWidth = 30;
      const loopHeight = 24;

      const pathString = `M ${srcX} ${srcY} C ${srcX + loopWidth} ${srcY - loopHeight}, ${srcX + loopWidth} ${srcY + loopHeight}, ${srcX} ${srcY + 12}`;

      sourceFlowOffsetMap.set(flow.sourceFeatureId, currentSourceOffset + strokeWidth + 4);

      const flowGeom: SankeyFlowGeometry = {
        flowId: flow.id,
        sourceFeatureId: flow.sourceFeatureId,
        targetFeatureId: flow.targetFeatureId,
        weight: flow.weight,
        strokeWidth,
        sourceX: srcX,
        sourceY: srcY,
        targetX: srcX,
        targetY: srcY + 12,
        pathString,
        isSelfFlow: true,
      };

      flowGeometryMap.set(flow.id, flowGeom);
      flowsGeometryList.push(flowGeom);
      return;
    }

    // Inter-node flow
    const currentSrcOffset = sourceFlowOffsetMap.get(flow.sourceFeatureId) || 0;
    const currentTgtOffset = targetFlowOffsetMap.get(flow.targetFeatureId) || 0;

    const isBackward = tgtGeom.stageIndex <= srcGeom.stageIndex;

    const srcX = isBackward ? srcGeom.x : srcGeom.x + srcGeom.width;
    const srcY = srcGeom.y + 14 + currentSrcOffset;

    const tgtX = isBackward ? tgtGeom.x + tgtGeom.width : tgtGeom.x;
    const tgtY = tgtGeom.y + 14 + currentTgtOffset;

    sourceFlowOffsetMap.set(flow.sourceFeatureId, currentSrcOffset + strokeWidth + 3);
    targetFlowOffsetMap.set(flow.targetFeatureId, currentTgtOffset + strokeWidth + 3);

    let pathString = '';

    if (!isBackward) {
      // Forward flow across columns
      const dx = tgtX - srcX;
      const controlDist = Math.max(40, dx * 0.45);
      const cp1X = srcX + controlDist;
      const cp1Y = srcY;
      const cp2X = tgtX - controlDist;
      const cp2Y = tgtY;

      pathString = `M ${srcX} ${srcY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tgtX} ${tgtY}`;
    } else {
      // Backward or same-column flow (arch path)
      const archOffset = 60 + Math.abs(srcY - tgtY) * 0.2;
      const cp1X = srcX - archOffset;
      const cp1Y = srcY;
      const cp2X = tgtX - archOffset;
      const cp2Y = tgtY;

      pathString = `M ${srcX} ${srcY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tgtX} ${tgtY}`;
    }

    const flowGeom: SankeyFlowGeometry = {
      flowId: flow.id,
      sourceFeatureId: flow.sourceFeatureId,
      targetFeatureId: flow.targetFeatureId,
      weight: flow.weight,
      strokeWidth,
      sourceX: srcX,
      sourceY: srcY,
      targetX: tgtX,
      targetY: tgtY,
      pathString,
      isSelfFlow: false,
    };

    flowGeometryMap.set(flow.id, flowGeom);
    flowsGeometryList.push(flowGeom);
  });

  return {
    width: canvasWidth,
    height: finalCanvasHeight,
    stages: stageGeometries,
    nodes: nodesGeometryList,
    flows: flowsGeometryList,
    nodeGeometryMap,
    flowGeometryMap,
  };
}
