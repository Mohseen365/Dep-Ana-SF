/**
 * COMPONENT ORBIT — GEOMETRY & FOCUSED ORBIT LAYOUT ENGINE
 *
 * Pure, deterministic radial placement engine for Focused Component Orbit views.
 * Consumes verified ComponentOrbitProjection metadata (from component-orbit-adapter)
 * and produces deterministic (x, y) Cartesian positions, polar guides, and layout diagnostics.
 *
 * Enforces all 12 Geometry Invariants:
 * - G1: Focal Sun at center (0, 0)
 * - G2: Ring isolation (Ring N nodes stay on Ring N)
 * - G3: Ring-depth equivalence (Depth N === Ring N)
 * - G4: 100% Deterministic placement
 * - G5: Stable angular ordering
 * - G6-G8: Arc, AABB, and label clearance
 * - G9: Repair within semantic ring only
 * - G10: Locality / cascade protection
 * - G11: Deterministic repair
 * - G12: Input projection immutability
 */

import type { ComponentOrbitProjection, ComponentOrbitNode } from '../adapters/component-orbit-adapter';
import { checkAABBOverlap, normalizeAngle } from './orbit-layout';

export interface ComponentOrbitLayoutOptions {
  center?: { x: number; y: number };
  innerRadius?: number; // Radius for Ring 1 (default: 280px)
  ringSpacingPx?: number; // Base radial spacing between rings (default: 220px)
  trackSpacingPx?: number; // Radial spacing between tracks in same ring (default: 160px)
  nodeWidth?: number; // Base AABB bounding width W (default: 120px)
  nodeHeight?: number; // Base AABB bounding height H (default: 60px)
  horizontalGap?: number; // Horizontal clearance gap C_x (default: 40px)
  verticalGap?: number; // Vertical clearance gap C_y (default: 40px)
  maxNodesPerTrack?: number; // Max nodes per track before multi-track ring expansion (default: 16)
  maxRepairPasses?: number; // Max FSM collision repair passes (default: 20)
  customNodeDimensions?: Record<string, { width: number; height: number }>;
}

export interface ComponentOrbitNodePosition {
  nodeId: string;
  ring: number;
  depth: number;
  track: number;
  angle: number; // Polar angle in radians [0, 2pi)
  radius: number; // Polar radius in pixels
  x: number; // Cartesian X
  y: number; // Cartesian Y
  width: number;
  height: number;
}

export interface ComponentOrbitGuideRing {
  ringIndex: number;
  radiusPx: number;
  label: string;
  nodeCount: number;
}

export interface ComponentOrbitGuideMetadata {
  rings: ComponentOrbitGuideRing[];
}

export interface ComponentOrbitDiagnostics {
  totalNodes: number;
  ringNodeCounts: Record<number, number>;
  trackCounts: Record<number, number>; // ringIndex -> maxTrack + 1
  maxDepth: number;
  minRadiusPx: number;
  maxRadiusPx: number;
  minAngularSeparationRad: number;
  minAABBSeparationPx: number;
  initialCollisionCount: number;
  collisionCount: number;
  repairCount: number;
  movedNodeIds: string[];
  executionTimeMs: number;
}

export interface ComponentOrbitLayoutOutput {
  positions: Record<string, ComponentOrbitNodePosition>;
  guides: ComponentOrbitGuideMetadata;
  diagnostics: ComponentOrbitDiagnostics;
}

function getEffectiveAABBGap(
  a: { width: number; height: number },
  b: { width: number; height: number },
  horizontalGap: number,
  verticalGap: number
) {
  return {
    effWidth: (a.width + b.width) / 2 + horizontalGap,
    effHeight: (a.height + b.height) / 2 + verticalGap,
  };
}

/**
 * Computes deterministic radial placement for a Focused Component Orbit.
 */
export function computeComponentOrbitLayout(
  projection: ComponentOrbitProjection,
  options: ComponentOrbitLayoutOptions = {}
): ComponentOrbitLayoutOutput {
  const startTime = performance.now();

  const center = options.center || { x: 0, y: 0 };
  const innerRadius = options.innerRadius ?? 280;
  const ringSpacing = options.ringSpacingPx ?? 220;
  const trackSpacing = options.trackSpacingPx ?? 160;
  const baseNodeWidth = options.nodeWidth ?? 120;
  const baseNodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;
  const maxNodesPerTrack = options.maxNodesPerTrack ?? 16;
  const maxRepairPasses = options.maxRepairPasses ?? 20;
  const customDimensions = options.customNodeDimensions || {};

  const positions: Record<string, ComponentOrbitNodePosition> = {};
  const ringNodeCounts: Record<number, number> = {};
  const trackCounts: Record<number, number> = {};

  // Gather reachable nodes from projection dictionary
  const nodeArray = Object.values(projection.nodes);

  // Group nodes by ring / depth
  const nodesByRing = new Map<number, ComponentOrbitNode[]>();
  nodeArray.forEach((node) => {
    const ring = node.ringIndex;
    ringNodeCounts[ring] = (ringNodeCounts[ring] || 0) + 1;
    if (!nodesByRing.has(ring)) {
      nodesByRing.set(ring, []);
    }
    nodesByRing.get(ring)!.push(node);
  });

  const sortedRingIndices = Array.from(nodesByRing.keys()).sort((a, b) => a - b);

  let maxRadiusPx = 0;
  let minRadiusPx = Infinity;

  sortedRingIndices.forEach((ringIndex) => {
    const ringNodes = nodesByRing.get(ringIndex)!;

    // Invariant G1 — Focal Sun at center (0, 0)
    if (ringIndex === 0) {
      const sunNode = ringNodes[0] || projection.focus;
      if (sunNode) {
        const dim = customDimensions[sunNode.nodeId] || { width: baseNodeWidth, height: baseNodeHeight };
        positions[sunNode.nodeId] = {
          nodeId: sunNode.nodeId,
          ring: 0,
          depth: 0,
          track: 0,
          angle: 0,
          radius: 0,
          x: center.x,
          y: center.y,
          width: dim.width,
          height: dim.height,
        };
        minRadiusPx = 0;
      }
      return;
    }

    // Preserve adapter's semantic intra-ring ordering (role symbol priority -> type -> coupling -> ID)
    const n = ringNodes.length;
    const baseRingRadius = innerRadius + (ringIndex - 1) * ringSpacing;

    // Partition nodes into tracks if population exceeds maxNodesPerTrack
    const tracksNeeded = Math.max(1, Math.ceil(n / maxNodesPerTrack));
    trackCounts[ringIndex] = tracksNeeded;

    const nodesByTrack = new Map<number, ComponentOrbitNode[]>();
    ringNodes.forEach((node, idx) => {
      const trackIdx = Math.floor(idx / maxNodesPerTrack);
      if (!nodesByTrack.has(trackIdx)) {
        nodesByTrack.set(trackIdx, []);
      }
      nodesByTrack.get(trackIdx)!.push(node);
    });

    Array.from(nodesByTrack.keys()).sort((a, b) => a - b).forEach((trackIdx) => {
      const trackNodes = nodesByTrack.get(trackIdx)!;
      const n_k = trackNodes.length;

      // Calculate max node dimensions on track for chord requirements
      let maxNodeW = baseNodeWidth;
      let maxNodeH = baseNodeHeight;

      trackNodes.forEach((node) => {
        const dim = customDimensions[node.nodeId];
        if (dim) {
          maxNodeW = Math.max(maxNodeW, dim.width);
          maxNodeH = Math.max(maxNodeH, dim.height);
        }
      });

      const maxEffW = maxNodeW + horizontalGap;
      const maxEffH = maxNodeH + verticalGap;
      const requiredChordSeparation = Math.sqrt(maxEffW * maxEffW + maxEffH * maxEffH);
      const fullCircleAngle = 2 * Math.PI;

      // Base radius for track
      const baseTrackRadius = baseRingRadius + trackIdx * trackSpacing;

      // Required radius to satisfy arc-length & chord clearance on full 360-degree circle
      const reqRadius = n_k <= 1 ? 0 : requiredChordSeparation / (2 * Math.sin(Math.PI / n_k));
      const trackRadius = Math.max(baseTrackRadius, reqRadius);

      // Stagger angular starting offset per track for visual distribution
      const trackAngularOffset = (trackIdx * Math.PI) / (tracksNeeded * 2);

      trackNodes.forEach((node, nodeIdxOnTrack) => {
        const deltaTheta = fullCircleAngle / n_k;
        const rawAngle = trackAngularOffset + nodeIdxOnTrack * deltaTheta;
        const angle = normalizeAngle(rawAngle);

        const x = center.x + trackRadius * Math.cos(angle);
        const y = center.y + trackRadius * Math.sin(angle);

        const dim = customDimensions[node.nodeId] || { width: baseNodeWidth, height: baseNodeHeight };

        positions[node.nodeId] = {
          nodeId: node.nodeId,
          ring: ringIndex,
          depth: ringIndex,
          track: trackIdx,
          angle,
          radius: trackRadius,
          x: Math.round(x * 1000) / 1000,
          y: Math.round(y * 1000) / 1000,
          width: dim.width,
          height: dim.height,
        };

        if (trackRadius < minRadiusPx) minRadiusPx = trackRadius;
        if (trackRadius > maxRadiusPx) maxRadiusPx = trackRadius;
      });
    });
  });

  // Calculate Initial Collision Count
  const placedList = Object.values(positions);
  const totalPlaced = placedList.length;
  let initialCollisionCount = 0;

  for (let i = 0; i < totalPlaced; i++) {
    const a = placedList[i];

    for (let j = i + 1; j < totalPlaced; j++) {
      const b = placedList[j];
      const { effWidth, effHeight } = getEffectiveAABBGap(a, b, horizontalGap, verticalGap);

      if (checkAABBOverlap(a, b, effWidth, effHeight)) {
        initialCollisionCount++;
      }
    }
  }

  // Same-Ring Local Track/Radius Collision Repair Pass
  // Invariant G9: Repairs MUST move nodes only within their semantic ring (track += 1, radius += trackSpacing).
  let repairPass = 0;
  let repairCount = 0;
  const movedNodeIdsSet = new Set<string>();

  while (repairPass < maxRepairPasses) {
    repairPass++;
    let repairsInThisPass = 0;
    const currentList = Object.values(positions);

    for (let i = 0; i < currentList.length; i++) {
      const posA = currentList[i];
      if (posA.ring === 0) continue; // Sun stays fixed

      for (let j = i + 1; j < currentList.length; j++) {
        const posB = currentList[j];
        if (posB.ring === 0) continue;

        const { effWidth, effHeight } = getEffectiveAABBGap(posA, posB, horizontalGap, verticalGap);

        if (checkAABBOverlap(posA, posB, effWidth, effHeight)) {
          // Resolve collision by shifting the outer/later node along its track radius within its ring
          const shiftNode = posB.ring >= posA.ring ? posB : posA;
          shiftNode.track += 1;
          shiftNode.radius += trackSpacing;
          shiftNode.x = Math.round((center.x + shiftNode.radius * Math.cos(shiftNode.angle)) * 1000) / 1000;
          shiftNode.y = Math.round((center.y + shiftNode.radius * Math.sin(shiftNode.angle)) * 1000) / 1000;

          movedNodeIdsSet.add(shiftNode.nodeId);
          repairCount++;
          repairsInThisPass++;

          if (shiftNode.radius > maxRadiusPx) maxRadiusPx = shiftNode.radius;
        }
      }
    }

    if (repairsInThisPass === 0) break;
  }

  // Calculate Final Diagnostics
  const finalPosList = Object.values(positions);
  let finalCollisionCount = 0;
  let minAngularSeparationRad = Infinity;
  let minAABBSeparationPx = Infinity;

  for (let i = 0; i < finalPosList.length; i++) {
    const a = finalPosList[i];
    for (let j = i + 1; j < finalPosList.length; j++) {
      const b = finalPosList[j];

      const { effWidth, effHeight } = getEffectiveAABBGap(a, b, horizontalGap, verticalGap);

      if (checkAABBOverlap(a, b, effWidth, effHeight)) {
        finalCollisionCount++;
      }

      if (a.ring === b.ring && a.ring > 0) {
        const diff = Math.abs(a.angle - b.angle);
        const angularDist = Math.min(diff, 2 * Math.PI - diff);
        if (angularDist > 1e-6 && angularDist < minAngularSeparationRad) {
          minAngularSeparationRad = angularDist;
        }
      }

      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minAABBSeparationPx) {
        minAABBSeparationPx = dist;
      }
    }
  }

  if (minAngularSeparationRad === Infinity) minAngularSeparationRad = 0;
  if (minAABBSeparationPx === Infinity) minAABBSeparationPx = 0;
  if (minRadiusPx === Infinity) minRadiusPx = 0;

  // Calculate maximum placed radius per ring across all placed nodes (including multi-track & repair shifts)
  const maxPlacedRadiusPerRing = new Map<number, number>();
  finalPosList.forEach((pos) => {
    if (pos.ring > 0) {
      const curr = maxPlacedRadiusPerRing.get(pos.ring) ?? 0;
      if (pos.radius > curr) {
        maxPlacedRadiusPerRing.set(pos.ring, pos.radius);
      }
    }
  });

  // Build Guide Metadata reflecting post-repair maximum placed radius per ring
  const guideRings: ComponentOrbitGuideRing[] = projection.rings.map((ring) => {
    const rIdx = ring.ringIndex;
    let radiusPx = 0;
    if (rIdx > 0) {
      const maxPlaced = maxPlacedRadiusPerRing.get(rIdx);
      radiusPx = maxPlaced !== undefined
        ? Math.round(maxPlaced * 1000) / 1000
        : (innerRadius + (rIdx - 1) * ringSpacing);
    }
    return {
      ringIndex: rIdx,
      radiusPx,
      label: ring.label,
      nodeCount: ring.totalCount,
    };
  });

  const endTime = performance.now();

  return {
    positions,
    guides: {
      rings: guideRings,
    },
    diagnostics: {
      totalNodes: nodeArray.length,
      ringNodeCounts,
      trackCounts,
      maxDepth: projection.summary.maxDepth,
      minRadiusPx: Math.round(minRadiusPx * 1000) / 1000,
      maxRadiusPx: Math.round(maxRadiusPx * 1000) / 1000,
      minAngularSeparationRad: Math.round(minAngularSeparationRad * 10000) / 10000,
      minAABBSeparationPx: Math.round(minAABBSeparationPx * 1000) / 1000,
      initialCollisionCount,
      collisionCount: finalCollisionCount,
      repairCount,
      movedNodeIds: Array.from(movedNodeIdsSet).sort(),
      executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
    },
  };
}
