/**
 * COMPONENT CONSTELLATION — GEOMETRY & MULTI-SUN LAYOUT ENGINE
 *
 * Pure, deterministic radial placement engine for Multi-Sun Component Constellation views.
 * Consumes ComponentConstellationProjection metadata (from component-constellation-adapter)
 * and produces deterministic Cartesian positions, polar guides, and clearance diagnostics.
 *
 * Enforces all Multi-Sun Macro & Micro Geometry Contracts:
 * - Macro Inner Radius: 900px (6 inner Suns)
 * - Macro Outer Radius: 1760px (8 outer Suns)
 * - Interlacing Angle Offset: 22.5° (0.392699 rad)
 * - Local Orbit Radius: 280px around non-shared k=1 direct dependencies
 * - Shared-Node Centroid + Radial/Tangent Displacement
 * - Min Shared-Node Sun AABB Clearance: >= 120px (Center distance >= 240px)
 * - 100% Determinism (0.00000px coordinate drift)
 */

import type { ComponentConstellationProjection, ComponentConstellationNode } from '../adapters/component-constellation-adapter';

export interface ComponentConstellationLayoutOptions {
  center?: { x: number; y: number };
  innerMacroRadius?: number; // default: 900px
  outerMacroRadius?: number; // default: 1760px
  localOrbitRadius?: number; // default: 280px
  nodeWidth?: number; // default: 120px
  nodeHeight?: number; // default: 60px
  sharedNodeSunAabbClearance?: number; // default: 120px
}

export interface ComponentConstellationNodePosition {
  nodeId: string;
  isSun: boolean;
  sunRing: 'inner' | 'outer' | null;
  isSharedNode: boolean;
  angle: number; // Polar angle in radians
  radius: number; // Polar radius from center
  x: number; // Cartesian X
  y: number; // Cartesian Y
  width: number;
  height: number;
}

export interface ComponentConstellationGuideRing {
  ringIndex: number;
  radiusPx: number;
  label: string;
  nodeCount: number;
}

export interface ComponentConstellationGuideMetadata {
  rings: ComponentConstellationGuideRing[];
}

export interface ComponentConstellationDiagnostics {
  totalNodes: number;
  sunCount: number;
  sharedNodeCount: number;
  minSunCenterDistancePx: number;
  minSunEdgeClearancePx: number;
  minSharedNodeAabbClearancePx: number;
  displacedSharedNodeCount: number;
  executionTimeMs: number;
  invariantViolations?: string[];
}

export interface ComponentConstellationLayoutOutput {
  positions: Record<string, ComponentConstellationNodePosition>;
  guides: ComponentConstellationGuideMetadata;
  diagnostics: ComponentConstellationDiagnostics;
}

function calcAABBGap(
  posA: { x: number; y: number },
  sizeA: { width: number; height: number },
  posB: { x: number; y: number },
  sizeB: { width: number; height: number }
): number {
  const dx = Math.max(0, Math.abs(posA.x - posB.x) - (sizeA.width / 2 + sizeB.width / 2));
  const dy = Math.max(0, Math.abs(posA.y - posB.y) - (sizeA.height / 2 + sizeB.height / 2));
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes deterministic radial placement for Multi-Sun Component Constellation.
 */
export function computeComponentConstellationLayout(
  projection: ComponentConstellationProjection,
  options: ComponentConstellationLayoutOptions = {}
): ComponentConstellationLayoutOutput {
  const startTime = performance.now();

  const center = options.center || { x: 0, y: 0 };
  const R_INNER = options.innerMacroRadius ?? 900.0;
  const R_OUTER = options.outerMacroRadius ?? 1760.0;
  const R_LOCAL = options.localOrbitRadius ?? 280.0;
  const nodeWidth = options.nodeWidth ?? 120.0;
  const nodeHeight = options.nodeHeight ?? 60.0;
  const minRequiredAabbClearance = options.sharedNodeSunAabbClearance ?? 120.0;

  const positions: Record<string, ComponentConstellationNodePosition> = {};
  const sunCoords: Record<string, { x: number; y: number; angle: number; radius: number }> = {};

  // 1. Calculate Macro Coordinates for Inner Suns (6 Suns at 60° increments starting at 0°)
  const innerSuns = [...projection.innerSuns].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const innerAngleStep = (2 * Math.PI) / 6; // 60°

  innerSuns.forEach((sunNode, idx) => {
    const angle = idx * innerAngleStep;
    const x = Math.round((center.x + R_INNER * Math.cos(angle)) * 100) / 100;
    const y = Math.round((center.y + R_INNER * Math.sin(angle)) * 100) / 100;

    sunCoords[sunNode.nodeId] = { x, y, angle, radius: R_INNER };
    positions[sunNode.nodeId] = {
      nodeId: sunNode.nodeId,
      isSun: true,
      sunRing: 'inner',
      isSharedNode: false,
      angle,
      radius: R_INNER,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
    };
  });

  // 2. Calculate Macro Coordinates for Outer Suns (8 Suns at 45° increments with 22.5° interlacing offset)
  const outerSuns = [...projection.outerSuns].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const outerAngleStep = (2 * Math.PI) / 8; // 45°
  const outerInterlacingOffset = Math.PI / 8; // 22.5°

  outerSuns.forEach((sunNode, idx) => {
    const angle = outerInterlacingOffset + idx * outerAngleStep;
    const x = Math.round((center.x + R_OUTER * Math.cos(angle)) * 100) / 100;
    const y = Math.round((center.y + R_OUTER * Math.sin(angle)) * 100) / 100;

    sunCoords[sunNode.nodeId] = { x, y, angle, radius: R_OUTER };
    positions[sunNode.nodeId] = {
      nodeId: sunNode.nodeId,
      isSun: true,
      sunRing: 'outer',
      isSharedNode: false,
      angle,
      radius: R_OUTER,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
    };
  });

  // 3. Group local k=1 dependencies by referencing Sun
  const unsharedNodesBySun = new Map<string, ComponentConstellationNode[]>();
  const sharedNodesList: ComponentConstellationNode[] = [];

  Object.values(projection.nodes).forEach((node) => {
    if (node.isSun) return; // Suns already placed

    if (node.isSharedNode) {
      sharedNodesList.push(node);
    } else if (node.referencingSunIds.length === 1) {
      const parentSunId = node.referencingSunIds[0];
      if (!unsharedNodesBySun.has(parentSunId)) {
        unsharedNodesBySun.set(parentSunId, []);
      }
      unsharedNodesBySun.get(parentSunId)!.push(node);
    }
  });

  // 4. Place Unshared Local k=1 Dependency Nodes radially around their parent Sun
  unsharedNodesBySun.forEach((children, sunId) => {
    const sunPos = sunCoords[sunId];
    if (!sunPos) return;

    // Sort local children deterministically
    children.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const k = children.length;
    const localAngleStep = k > 0 ? (2 * Math.PI) / k : 0;

    children.forEach((childNode, childIdx) => {
      // Offset local angle based on parent Sun's global polar angle for radial orientation
      const localAngle = sunPos.angle + childIdx * localAngleStep;
      const lx = Math.round((sunPos.x + R_LOCAL * Math.cos(localAngle)) * 100) / 100;
      const ly = Math.round((sunPos.y + R_LOCAL * Math.sin(localAngle)) * 100) / 100;

      const globalRadius = Math.round(Math.hypot(lx - center.x, ly - center.y) * 100) / 100;
      const globalAngle = (Math.atan2(ly - center.y, lx - center.x) + 2 * Math.PI) % (2 * Math.PI);

      positions[childNode.nodeId] = {
        nodeId: childNode.nodeId,
        isSun: false,
        sunRing: null,
        isSharedNode: false,
        angle: globalAngle,
        radius: globalRadius,
        x: lx,
        y: ly,
        width: nodeWidth,
        height: nodeHeight,
      };
    });
  });

  // 5. Place Shared Nodes using General Deterministic Centroid + Radial & Tangential Clearance Resolver
  sharedNodesList.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const sharedNodeStateMap = new Map<string, { x: number; y: number; rawX: number; rawY: number; isDisplaced: boolean }>();

  sharedNodesList.forEach((sNode) => {
    const suns = sNode.referencingSunIds;
    let sumX = 0;
    let sumY = 0;
    let validSunCount = 0;

    suns.forEach((sId) => {
      if (sunCoords[sId]) {
        sumX += sunCoords[sId].x;
        sumY += sunCoords[sId].y;
        validSunCount++;
      }
    });

    if (validSunCount === 0) return;

    const rawX = sumX / validSunCount;
    const rawY = sumY / validSunCount;

    sharedNodeStateMap.set(sNode.nodeId, {
      x: rawX,
      y: rawY,
      rawX,
      rawY,
      isDisplaced: false,
    });
  });

  // Iterative repair pass for shared-node clearance & overlap resolution (max 20 passes)
  const maxPasses = 20;
  const nodeSize = { width: nodeWidth, height: nodeHeight };

  for (let pass = 0; pass < maxPasses; pass++) {
    let repairsAppliedInPass = 0;

    sharedNodesList.forEach((sNode) => {
      const state = sharedNodeStateMap.get(sNode.nodeId);
      if (!state) return;

      // Rule A: Radial clearance enforcement against all referencing Suns
      sNode.referencingSunIds.forEach((sunId) => {
        const sunPos = sunCoords[sunId];
        if (!sunPos) return;

        const gap = calcAABBGap(state, nodeSize, sunPos, nodeSize);
        if (gap < minRequiredAabbClearance - 1e-3) {
          let dx = state.x - sunPos.x;
          let dy = state.y - sunPos.y;
          let dist = Math.hypot(dx, dy);

          if (dist < 1e-4) {
            dx = 1.0;
            dy = 0.0;
            dist = 1.0;
          }

          const ux = dx / dist;
          const uy = dy / dist;
          const pushDist = minRequiredAabbClearance - gap + 1.0;

          state.x += ux * pushDist;
          state.y += uy * pushDist;
          state.isDisplaced = true;
          repairsAppliedInPass++;
        }
      });

      // Rule B: Tangential / collision clearance against other shared nodes
      sharedNodesList.forEach((otherNode) => {
        if (otherNode.nodeId === sNode.nodeId) return;
        const otherState = sharedNodeStateMap.get(otherNode.nodeId);
        if (!otherState) return;

        const gap = calcAABBGap(state, nodeSize, otherState, nodeSize);
        if (gap < 40.0 - 1e-3) {
          let dx = state.x - otherState.x;
          let dy = state.y - otherState.y;
          let dist = Math.hypot(dx, dy);

          if (dist < 1e-4) {
            // Stable directional displacement based on string comparison
            const orderSign = sNode.nodeId < otherNode.nodeId ? -1 : 1;
            dx = orderSign * 0.5;
            dy = orderSign * -0.8660254;
            dist = Math.hypot(dx, dy);
          }

          const ux = dx / dist;
          const uy = dy / dist;
          const pushDist = (40.0 - gap + 1.0) / 2.0;

          state.x += ux * pushDist;
          state.y += uy * pushDist;
          otherState.x -= ux * pushDist;
          otherState.y -= uy * pushDist;

          state.isDisplaced = true;
          otherState.isDisplaced = true;
          repairsAppliedInPass++;
        }
      });
    });

    if (repairsAppliedInPass === 0) break;
  }

  // Populate positions for shared nodes from state map
  let displacedSharedNodeCount = 0;
  sharedNodesList.forEach((sNode) => {
    const state = sharedNodeStateMap.get(sNode.nodeId);
    if (!state) return;

    const finalX = Math.round(state.x * 100) / 100;
    const finalY = Math.round(state.y * 100) / 100;

    if (state.isDisplaced || Math.hypot(finalX - state.rawX, finalY - state.rawY) > 1.0) {
      displacedSharedNodeCount++;
    }

    const globalRadius = Math.round(Math.hypot(finalX - center.x, finalY - center.y) * 100) / 100;
    const globalAngle = (Math.atan2(finalY - center.y, finalX - center.x) + 2 * Math.PI) % (2 * Math.PI);

    positions[sNode.nodeId] = {
      nodeId: sNode.nodeId,
      isSun: false,
      sunRing: null,
      isSharedNode: true,
      angle: globalAngle,
      radius: globalRadius,
      x: finalX,
      y: finalY,
      width: nodeWidth,
      height: nodeHeight,
    };
  });

  // 6. Diagnostics & Verification
  const placedSuns = Object.values(positions).filter((p) => p.isSun);
  let minSunCenterDistancePx = Infinity;
  let minSunEdgeClearancePx = Infinity;

  for (let i = 0; i < placedSuns.length; i++) {
    for (let j = i + 1; j < placedSuns.length; j++) {
      const a = placedSuns[i];
      const b = placedSuns[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < minSunCenterDistancePx) minSunCenterDistancePx = dist;

      const gap = calcAABBGap(a, { width: nodeWidth, height: nodeHeight }, b, { width: nodeWidth, height: nodeHeight });
      if (gap < minSunEdgeClearancePx) minSunEdgeClearancePx = gap;
    }
  }

  const sharedPositions = Object.values(positions).filter((p) => p.isSharedNode);
  let minSharedNodeAabbClearancePx = Infinity;

  sharedPositions.forEach((sharedPos) => {
    placedSuns.forEach((sunPos) => {
      const gap = calcAABBGap(
        sharedPos,
        { width: nodeWidth, height: nodeHeight },
        sunPos,
        { width: nodeWidth, height: nodeHeight }
      );
      if (gap < minSharedNodeAabbClearancePx) {
        minSharedNodeAabbClearancePx = gap;
      }
    });
  });

  if (minSunCenterDistancePx === Infinity) minSunCenterDistancePx = 0;
  if (minSunEdgeClearancePx === Infinity) minSunEdgeClearancePx = 0;
  if (minSharedNodeAabbClearancePx === Infinity) minSharedNodeAabbClearancePx = 0;

  // Check for any remaining invariant violations after repair pass limit
  const invariantViolations: string[] = [];
  sharedPositions.forEach((sharedPos) => {
    placedSuns.forEach((sunPos) => {
      const gap = calcAABBGap(sharedPos, nodeSize, sunPos, nodeSize);
      if (gap < minRequiredAabbClearance - 1e-3) {
        invariantViolations.push(
          `Shared node ${sharedPos.nodeId} violates clearance with Sun ${sunPos.nodeId}: gap = ${gap.toFixed(2)}px < ${minRequiredAabbClearance}px`
        );
      }
    });
  });

  // Build Guide Metadata for Macro Rings
  const guides: ComponentConstellationGuideMetadata = {
    rings: [
      {
        ringIndex: 0,
        radiusPx: 0,
        label: 'Nucleus Center',
        nodeCount: 0,
      },
      {
        ringIndex: 1,
        radiusPx: R_INNER,
        label: 'Inner Constellation Macro Ring (6 Root Containers)',
        nodeCount: innerSuns.length,
      },
      {
        ringIndex: 2,
        radiusPx: R_OUTER,
        label: 'Outer Constellation Macro Ring (8 Standalone Roots)',
        nodeCount: outerSuns.length,
      },
    ],
  };

  const endTime = performance.now();

  return {
    positions,
    guides,
    diagnostics: {
      totalNodes: Object.keys(positions).length,
      sunCount: placedSuns.length,
      sharedNodeCount: sharedPositions.length,
      minSunCenterDistancePx: Math.round(minSunCenterDistancePx * 100) / 100,
      minSunEdgeClearancePx: Math.round(minSunEdgeClearancePx * 100) / 100,
      minSharedNodeAabbClearancePx: Math.round(minSharedNodeAabbClearancePx * 100) / 100,
      displacedSharedNodeCount,
      executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
      ...(invariantViolations.length > 0 ? { invariantViolations } : {}),
    },
  };
}
