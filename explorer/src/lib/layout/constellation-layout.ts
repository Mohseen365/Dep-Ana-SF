import {
  ConstellationData,
} from '../adapters/constellation-adapter';

export interface ConstellationLayoutNodePosition {
  nodeId: string;
  x: number;
  y: number;
  radius: number;
  angleRad: number;
  angleDeg: number;
  hopDistance: number;
  ringIndex: number;
  trackIndex: number;
  label: string;
}

export interface ConstellationLayoutEdgePath {
  edgeId: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  controlX1: number;
  controlY1: number;
  controlX2: number;
  controlY2: number;
  pathSvg: string;
  isSameRing: boolean;
  isCrossRing: boolean;
}

export interface ConstellationLayoutRingGeometry {
  ringIndex: number;
  hopDistance: number;
  trackIndex: number;
  radius: number;
  cx: number;
  cy: number;
  label: string;
}

export interface ConstellationLayoutResult {
  focalPosition: ConstellationLayoutNodePosition | null;
  nodePositions: Record<string, ConstellationLayoutNodePosition>;
  edgePaths: ConstellationLayoutEdgePath[];
  ringGeometries: ConstellationLayoutRingGeometry[];
  viewport: {
    width: number;
    height: number;
    cx: number;
    cy: number;
    baseRadius: number;
    interRingGap: number;
    trackSpacing: number;
    sparseThreshold: number;
  };
}

export interface ConstellationLayoutOptions {
  width?: number; // default 900
  height?: number; // default 900
  cx?: number; // default width / 2
  cy?: number; // default height / 2
  baseRadius?: number; // default 180 (radius of 1-hop ring base)
  interRingGap?: number; // default 120 (radial clearance gap between rings)
  trackSpacing?: number; // default 40 (distance between multi-track sub-rings)
  sparseThreshold?: number; // default 30 (node count threshold for sparse T=1 vs dense T=4)
  maxTrackCount?: number; // default 4
  ringStepRadius?: number; // legacy option fallback if interRingGap is not passed
  startAngleRad?: number; // default -Math.PI / 2 (-90deg, top)
}

/**
 * Deterministic local polar layout generator for the Dependency Constellation lens.
 * Implements Phase 12 Candidate Geometry Contract (sparse threshold N<=30 -> T=1, N>30 -> T=4,
 * trackSpacing 40px, interRingGap 120px, Strategy B interleaved track assignment).
 * Calculates lens-local coordinates (x, y, radius, angleRad) and smooth curved edge paths.
 * Guarantees zero side effects, no mutation of input data, and finite numbers (no NaN/Infinity).
 */
export function computeConstellationLayout(
  data: ConstellationData,
  options: ConstellationLayoutOptions = {}
): ConstellationLayoutResult {
  const width = options.width ?? 900;
  const height = options.height ?? 900;
  const cx = options.cx ?? width / 2;
  const cy = options.cy ?? height / 2;
  const baseRadius = options.baseRadius ?? 180;
  const interRingGap = options.interRingGap ?? options.ringStepRadius ?? 120;
  const trackSpacing = options.trackSpacing ?? 40;
  const sparseThreshold = options.sparseThreshold ?? 30;
  const maxTrackCount = options.maxTrackCount ?? 4;
  const startAngleRad = options.startAngleRad ?? -Math.PI / 2;

  if (!data.focalNode) {
    return {
      focalPosition: null,
      nodePositions: {},
      edgePaths: [],
      ringGeometries: [],
      viewport: {
        width,
        height,
        cx,
        cy,
        baseRadius,
        interRingGap,
        trackSpacing,
        sparseThreshold,
      },
    };
  }

  // Position focal node at origin (cx, cy)
  const focalPosition: ConstellationLayoutNodePosition = {
    nodeId: data.focalNode.id,
    x: cx,
    y: cy,
    radius: 0,
    angleRad: 0,
    angleDeg: 0,
    hopDistance: 0,
    ringIndex: 0,
    trackIndex: 0,
    label: data.focalNode.displayName,
  };

  const nodePositions: Record<string, ConstellationLayoutNodePosition> = {};
  nodePositions[data.focalNode.id] = focalPosition;

  const ringGeometries: ConstellationLayoutRingGeometry[] = [];

  let currentBaseRadius = baseRadius;

  data.rings.forEach((ring, ringIdx) => {
    const hop = ring.hopDistance;
    const items = ring.items;
    const itemCount = items.length;

    // Determine effective track count T for this ring
    const effectiveT = itemCount <= sparseThreshold ? 1 : maxTrackCount;

    if (ringIdx === 0) {
      currentBaseRadius = baseRadius;
    } else {
      const prevRing = data.rings[ringIdx - 1];
      const prevCount = prevRing.items.length;
      const prevT = prevCount <= sparseThreshold ? 1 : maxTrackCount;
      const prevOuterRadius = currentBaseRadius + (prevT - 1) * trackSpacing;
      currentBaseRadius = prevOuterRadius + interRingGap;
    }

    // Register geometries for each sub-track in the ring
    for (let t = 0; t < effectiveT; t++) {
      const subTrackRadius = currentBaseRadius + t * trackSpacing;
      ringGeometries.push({
        ringIndex: ring.ringIndex,
        hopDistance: hop,
        trackIndex: t,
        radius: subTrackRadius,
        cx,
        cy,
        label: t === 0 ? ring.label : '',
      });
    }

    if (itemCount === 0) return;

    // Calculate sub-track distribution
    const baseCount = Math.floor(itemCount / effectiveT);
    const remainder = itemCount % effectiveT;
    const trackCounts: number[] = [];
    for (let t = 0; t < effectiveT; t++) {
      trackCounts.push(baseCount + (t < remainder ? 1 : 0));
    }

    // Strategy B Interleaved Sub-track Assignment
    // Node i assigned to sub-track t = i % effectiveT
    const trackNodeIndices: number[] = Array(effectiveT).fill(0);

    items.forEach((item, i) => {
      const t = i % effectiveT;
      const indexInTrack = trackNodeIndices[t];
      trackNodeIndices[t] += 1;

      const trackCount = trackCounts[t];
      const subTrackRadius = currentBaseRadius + t * trackSpacing;
      const angleStep = (2 * Math.PI) / trackCount;

      const angleRad = startAngleRad + indexInTrack * angleStep;
      let angleDeg = (angleRad * 180) / Math.PI;
      while (angleDeg < 0) angleDeg += 360;
      angleDeg = angleDeg % 360;

      const x = cx + subTrackRadius * Math.cos(angleRad);
      const y = cy + subTrackRadius * Math.sin(angleRad);

      nodePositions[item.nodeId] = {
        nodeId: item.nodeId,
        x: Number.isFinite(x) ? x : cx,
        y: Number.isFinite(y) ? y : cy,
        radius: subTrackRadius,
        angleRad,
        angleDeg,
        hopDistance: hop,
        ringIndex: ring.ringIndex,
        trackIndex: t,
        label: item.displayName,
      };
    });
  });

  // Calculate smooth edge paths between node positions
  const edgePaths: ConstellationLayoutEdgePath[] = [];

  data.edges.forEach((edge) => {
    const sPos = nodePositions[edge.source];
    const tPos = nodePositions[edge.target];

    if (!sPos || !tPos) return;

    const sourceX = sPos.x;
    const sourceY = sPos.y;
    const targetX = tPos.x;
    const targetY = tPos.y;

    let controlX1: number;
    let controlY1: number;
    let controlX2: number;
    let controlY2: number;

    if (edge.source === data.focalNode?.id || edge.target === data.focalNode?.id) {
      // Radial connection between origin and ring: use straight or slight radial curve
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;
      controlX1 = midX;
      controlY1 = midY;
      controlX2 = midX;
      controlY2 = midY;
    } else if (edge.isSameRing) {
      // Edge within same ring: bend curve towards origin for clarity
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;
      const pullFactor = 0.5;
      controlX1 = midX * (1 - pullFactor) + cx * pullFactor;
      controlY1 = midY * (1 - pullFactor) + cy * pullFactor;
      controlX2 = controlX1;
      controlY2 = controlY1;
    } else {
      // Inter-ring edge: bezier curve passing through mid-radial point
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;
      controlX1 = midX;
      controlY1 = midY;
      controlX2 = midX;
      controlY2 = midY;
    }

    // Ensure all control points are finite
    controlX1 = Number.isFinite(controlX1) ? controlX1 : (sourceX + targetX) / 2;
    controlY1 = Number.isFinite(controlY1) ? controlY1 : (sourceY + targetY) / 2;
    controlX2 = Number.isFinite(controlX2) ? controlX2 : controlX1;
    controlY2 = Number.isFinite(controlY2) ? controlY2 : controlY1;

    const pathSvg = `M ${sourceX.toFixed(2)} ${sourceY.toFixed(2)} C ${controlX1.toFixed(2)} ${controlY1.toFixed(2)}, ${controlX2.toFixed(2)} ${controlY2.toFixed(2)}, ${targetX.toFixed(2)} ${targetY.toFixed(2)}`;

    edgePaths.push({
      edgeId: edge.edgeId,
      source: edge.source,
      target: edge.target,
      sourceX,
      sourceY,
      targetX,
      targetY,
      controlX1,
      controlY1,
      controlX2,
      controlY2,
      pathSvg,
      isSameRing: edge.isSameRing,
      isCrossRing: edge.isCrossRing,
    });
  });

  return {
    focalPosition,
    nodePositions,
    edgePaths,
    ringGeometries,
    viewport: {
      width,
      height,
      cx,
      cy,
      baseRadius,
      interRingGap,
      trackSpacing,
      sparseThreshold,
    },
  };
}
