export type CanvasLODLevel = 0 | 1 | 2 | 3 | 4;

export interface CanvasLODParams {
  zoom: number;
  nodeCount: number;
  edgeCount: number;
}

export interface CanvasLODConfig {
  lodLevel: CanvasLODLevel;
  showNodeLabels: boolean;
  showEdgeLabels: boolean;
  showCompositionGroups: boolean;
  showFindingBadges: boolean;
  showFeatureRegionLabels: boolean;
  simplifiedEdges: boolean;
  edgeOpacityScale: number;
}

/**
 * Pure, deterministic Level-of-Detail (LOD) computation for Canvas / Cytoscape graph rendering.
 *
 * Computes rendering fidelity tiers based on viewport zoom level and total graph scale (node/edge count).
 *
 * LEVEL 0 — Full Fidelity (zoom >= 1.2, N < 1000)
 * LEVEL 1 — Reduced Decorations (0.6 <= zoom < 1.2, 1000 <= N < 2500)
 * LEVEL 2 — Simplified Edges / Far Zoom (0.3 <= zoom < 0.6, 2500 <= N < 5000)
 * LEVEL 3 — Density / Aggregate Representation (zoom < 0.3, 5000 <= N < 10000)
 * LEVEL 4 — Extreme Scale Overview (N >= 10000)
 *
 * GUARANTEE: Does NOT modify node positions or trigger layout recomputation.
 */
export function computeCanvasLODLevel(params: CanvasLODParams): CanvasLODConfig {
  const { zoom, nodeCount } = params;

  let lodLevel: CanvasLODLevel = 0;

  if (nodeCount >= 10000) {
    lodLevel = 4;
  } else if (nodeCount >= 5000 || zoom < 0.3) {
    lodLevel = 3;
  } else if (nodeCount >= 2500 || zoom < 0.6) {
    lodLevel = 2;
  } else if (nodeCount >= 1000 || zoom < 1.2) {
    lodLevel = 1;
  } else {
    lodLevel = 0;
  }

  switch (lodLevel) {
    case 0:
      return {
        lodLevel: 0,
        showNodeLabels: true,
        showEdgeLabels: true,
        showCompositionGroups: true,
        showFindingBadges: true,
        showFeatureRegionLabels: true,
        simplifiedEdges: false,
        edgeOpacityScale: 1.0,
      };

    case 1:
      return {
        lodLevel: 1,
        showNodeLabels: true,
        showEdgeLabels: false,
        showCompositionGroups: false,
        showFindingBadges: true,
        showFeatureRegionLabels: true,
        simplifiedEdges: false,
        edgeOpacityScale: 0.85,
      };

    case 2:
      return {
        lodLevel: 2,
        showNodeLabels: false,
        showEdgeLabels: false,
        showCompositionGroups: false,
        showFindingBadges: false,
        showFeatureRegionLabels: false, // Far zoom (< 0.6) suppresses labelled feature region overlays
        simplifiedEdges: true,
        edgeOpacityScale: 0.65,
      };

    case 3:
      return {
        lodLevel: 3,
        showNodeLabels: false,
        showEdgeLabels: false,
        showCompositionGroups: false,
        showFindingBadges: false,
        showFeatureRegionLabels: false,
        simplifiedEdges: true,
        edgeOpacityScale: 0.45,
      };

    case 4:
    default:
      return {
        lodLevel: 4,
        showNodeLabels: false,
        showEdgeLabels: false,
        showCompositionGroups: false,
        showFindingBadges: false,
        showFeatureRegionLabels: false,
        simplifiedEdges: true,
        edgeOpacityScale: 0.25,
      };
  }
}
