/**
 * ARCHITECTURE ORBIT — GEOMETRY & PLACEMENT ENGINE (WORKSTREAM B)
 *
 * Pure, deterministic radial layout engine for Architecture Orbit.
 * Consumes semantic projection metadata (Workstream A contract) and produces
 * deterministic polar and Cartesian (x, y) coordinates with exact AABB safety,
 * dynamic sector allocation, track capacity limits, and multi-pass finite-state collision repair.
 *
 * Independent of React, Cytoscape, DOM, or visual rendering state.
 */

export interface OrbitNodeMetadata {
  nodeId: string;
  canonicalNodeType: string;
  canonicalLayer: string; // e.g., 'presentation' | 'application' | 'domain' | 'schema' | 'supporting'
  orbitRingIndex: number; // 0..4 (or 0..5)
  primaryFeatureId?: string;
  primaryDomainId?: string;
  orbitSectorId: string; // Sector key
  semanticOrderKey: string; // Deterministic sort key
}

export interface OrbitLayoutOptions {
  center?: { x: number; y: number };
  innerRadius?: number; // Nucleus clearance radius (default: 200px)
  ringSpacing?: number; // Base radial spacing between rings (default: 200px >= EFF_DIAG = 188.68px)
  nodeWidth?: number; // Bounding width W (default: 120px)
  nodeHeight?: number; // Bounding height H (default: 60px)
  horizontalGap?: number; // Horizontal clearance C_x (default: 40px)
  verticalGap?: number; // Vertical clearance C_y (default: 40px)
  sectorMarginAngleRad?: number; // Inter-sector angular margin gap base
  trackSpacingPx?: number; // Radial delta between tracks within same ring (default: 200px)
  maxTracksPerRing?: number; // Max track expansion count (default: 20)
  maxRepairPasses?: number; // Max iterative collision repair passes (default: 20)
  ringLabels?: Record<number, string>; // Dynamic ring labels override
}

export interface OrbitNodePosition {
  nodeId: string;
  ring: number;
  sector: string;
  track: number;
  angle: number; // Polar angle in radians [0, 2pi)
  radius: number; // Polar radius in pixels
  x: number; // Cartesian X coordinate
  y: number; // Cartesian Y coordinate
}

export interface OrbitGuideSector {
  sectorId: string;
  label: string;
  startAngleRad: number;
  endAngleRad: number;
  sectorBodyAngleRad: number;
  sectorMarginAngleRad: number;
  usableStartAngleRad: number;
  usableEndAngleRad: number;
  usableAngleRad: number;
  nodeCount: number;
}

export interface OrbitGuideMetadata {
  rings: Array<{ ringIndex: number; radiusPx: number; label: string }>;
  sectors: OrbitGuideSector[];
}

export interface OrbitDiagnostics {
  totalNodes: number;
  ringNodeCounts: Record<number, number>;
  sectorNodeCounts: Record<string, number>;
  trackCounts: Record<string, number>; // sectorId -> maxTrack + 1
  maxTrackIndex: number;
  minRadiusPx: number;
  maxRadiusPx: number;
  minAngularSeparationRad: number;
  minAABBSeparationPx: number;
  initialCollisionCount: number;
  collisionCount: number; // Final collision count
  collisionPairsTested: number;
  repairCount: number;
  fallbackCount: number;
  nanCount: number;
  infinityCount: number;
  executionTimeMs: number;
}

export interface OrbitLayoutInput {
  nodes: OrbitNodeMetadata[];
  options?: OrbitLayoutOptions;
}

export interface OrbitLayoutOutput {
  positions: Record<string, OrbitNodePosition>;
  guides: OrbitGuideMetadata;
  diagnostics: OrbitDiagnostics;
}

const LAYER_LABELS: Record<number, string> = {
  0: 'Nucleus / Core',
  1: 'Presentation Layer',
  2: 'Application Layer',
  3: 'Domain Layer',
  4: 'Schema Layer',
  5: 'Supporting Layer',
};

/**
 * Normalizes an angle into the range [0, 2pi).
 */
export function normalizeAngle(rad: number): number {
  if (!Number.isFinite(rad)) return 0;
  const twoPi = 2 * Math.PI;
  let a = rad % twoPi;
  if (a < 0) a += twoPi;
  return a;
}

/**
 * Exact AABB Overlap Check for two rectangular nodes with effective dimensions.
 * Effective Width  = nodeWidth + horizontalGap
 * Effective Height = nodeHeight + verticalGap
 */
export function checkAABBOverlap(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number },
  effWidth: number,
  effHeight: number,
  epsilon = 1e-3
): boolean {
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  return dx < effWidth - epsilon && dy < effHeight - epsilon;
}

/**
 * Derives minimum radius required for placing n nodes with required chord separation
 * within a sector angular span usableAngle.
 * Chord distance formula: separation = 2 * R * sin(deltaTheta / 2)
 * -> R_req = separation / (2 * sin(deltaTheta / 2))
 */
export function calculateRequiredSectorRadius(
  n: number,
  usableAngle: number,
  requiredSeparationPx: number
): number {
  if (n <= 1) return 0;
  if (usableAngle <= 0) return Infinity;

  // Angular separation between adjacent nodes
  const deltaTheta = usableAngle / (n - 1);

  // If angle is >= pi, chord distance simplifies
  const halfAngle = deltaTheta / 2;
  const sinHalf = Math.sin(halfAngle);

  if (sinHalf <= 1e-6) {
    return Infinity;
  }

  return requiredSeparationPx / (2 * sinHalf);
}

/**
 * Main Pure Geometry Layout Engine for Architecture Orbit.
 */
export function computeOrbitLayout(input: OrbitLayoutInput): OrbitLayoutOutput {
  const startTime = performance.now();

  const options = input.options || {};
  const center = options.center || { x: 0, y: 0 };
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;
  const trackSpacing = options.trackSpacingPx ?? 200; // Guaranteed >= 188.68px (sqrt(160^2 + 100^2))
  const numRadialTiers = 2; // Alternating even/odd sector radial tiering
  const maxTracksPerRing = options.maxTracksPerRing ?? 10;
  const tierSpanPx = maxTracksPerRing * trackSpacing; // 2000px
  const ringSpacing = options.ringSpacing ?? (numRadialTiers * tierSpanPx); // 4000px
  const innerRadius = options.innerRadius ?? 600;
  const maxRepairPasses = options.maxRepairPasses ?? 20;

  const effWidth = nodeWidth + horizontalGap; // 160
  const effHeight = nodeHeight + verticalGap; // 100
  const requiredChordSeparation = Math.sqrt(effWidth * effWidth + effHeight * effHeight); // 188.6796px

  const rawNodes = Array.isArray(input.nodes) ? [...input.nodes] : [];

  // Deterministic sorting of input nodes by ID
  const nodes = [...rawNodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  // Diagnostics counters
  let nanCount = 0;
  let infinityCount = 0;
  let repairCount = 0;
  let fallbackCount = 0;

  const ringNodeCounts: Record<number, number> = {};
  const sectorNodeCounts: Record<string, number> = {};
  const trackCounts: Record<string, number> = {};

  // Group nodes by Ring and Sector
  const sectorSet = new Set<string>();
  const nodesBySector = new Map<string, OrbitNodeMetadata[]>();

  nodes.forEach((node) => {
    const ring = Number.isFinite(node.orbitRingIndex) ? node.orbitRingIndex : 1;
    const sector = node.orbitSectorId || '_unassigned';

    ringNodeCounts[ring] = (ringNodeCounts[ring] || 0) + 1;
    sectorNodeCounts[sector] = (sectorNodeCounts[sector] || 0) + 1;

    sectorSet.add(sector);
    if (!nodesBySector.has(sector)) {
      nodesBySector.set(sector, []);
    }
    nodesBySector.get(sector)!.push(node);
  });

  // Sort sectors deterministically by sector ID
  const sortedSectorIds = Array.from(sectorSet).sort((a, b) => {
    if (a === '_unassigned') return 1;
    if (b === '_unassigned') return -1;
    return a.localeCompare(b);
  });

  // Dynamic Water-Filling Constrained Angular Sector Allocation
  const numSectors = sortedSectorIds.length;
  const totalCircleRad = 2 * Math.PI;

  interface InternalSectorInfo {
    sectorId: string;
    startAngle: number;
    endAngle: number;
    sectorBodyAngle: number;
    sectorMargin: number;
    usableStart: number;
    usableEnd: number;
    usableAngle: number;
    nodeCount: number;
  }

  const sectorAngles = new Map<string, InternalSectorInfo>();

  if (numSectors === 0) {
    // Empty graph
  } else if (numSectors === 1) {
    const secId = sortedSectorIds[0];
    const margin = options.sectorMarginAngleRad ?? 0.05;
    const bodyAngle = totalCircleRad;
    const usableStart = margin;
    const usableEnd = totalCircleRad - margin;
    const usableAngle = usableEnd - usableStart;
    sectorAngles.set(secId, {
      sectorId: secId,
      startAngle: 0,
      endAngle: totalCircleRad,
      sectorBodyAngle: bodyAngle,
      sectorMargin: margin,
      usableStart,
      usableEnd,
      usableAngle,
      nodeCount: nodes.length,
    });
  } else {
    // Water-Filling Allocation with derived sector margins:
    // Sector margin total budget = 5% of 2pi across all S sectors
    // Margin per side for sector s = (0.05 * 2pi) / (2 * S)
    const margin = (0.05 * totalCircleRad) / (2 * numSectors);

    // theta_min guarantees each sector receives at least 20% of equal-share span
    const thetaMin = (totalCircleRad / numSectors) * 0.20;
    const residualBudget = totalCircleRad - numSectors * thetaMin;

    const totalNodesCount = Math.max(1, nodes.length);

    // Calculate body angle per sector
    const bodyAngles = new Map<string, number>();
    let rawSum = 0;
    sortedSectorIds.forEach((secId) => {
      const pop = sectorNodeCounts[secId] || 1;
      const weight = pop / totalNodesCount;
      const angle = thetaMin + residualBudget * weight;
      bodyAngles.set(secId, angle);
      rawSum += angle;
    });

    // Enforce sum(bodyAngle) = 2pi exactly
    let currentAngle = 0;
    sortedSectorIds.forEach((secId, idx) => {
      let bodyAngle = (bodyAngles.get(secId)! / rawSum) * totalCircleRad;
      if (idx === numSectors - 1) {
        bodyAngle = totalCircleRad - currentAngle;
      }

      const startAngle = currentAngle;
      const endAngle = currentAngle + bodyAngle;

      const usableStart = startAngle + margin;
      const usableEnd = endAngle - margin;
      const usableAngle = Math.max(1e-6, usableEnd - usableStart);

      sectorAngles.set(secId, {
        sectorId: secId,
        startAngle,
        endAngle,
        sectorBodyAngle: bodyAngle,
        sectorMargin: margin,
        usableStart,
        usableEnd,
        usableAngle,
        nodeCount: sectorNodeCounts[secId] || 0,
      });

      currentAngle = endAngle;
    });
  }

  // Node Placement Calculation per Ring and Sector
  const positions: Record<string, OrbitNodePosition> = {};
  let maxTrackIndex = 0;
  let minRadiusPx = Infinity;
  let maxRadiusPx = 0;

  sortedSectorIds.forEach((secId, secIdx) => {
    const secNodes = nodesBySector.get(secId) || [];
    const secInfo = sectorAngles.get(secId) || {
      sectorId: secId,
      startAngle: 0,
      endAngle: 2 * Math.PI,
      sectorBodyAngle: 2 * Math.PI,
      sectorMargin: 0.05,
      usableStart: 0.05,
      usableEnd: 2 * Math.PI - 0.05,
      usableAngle: 2 * Math.PI - 0.1,
      nodeCount: secNodes.length,
    };

    // Group nodes in this sector by ring
    const nodesByRingInSector = new Map<number, OrbitNodeMetadata[]>();
    secNodes.forEach((node) => {
      const ring = Number.isFinite(node.orbitRingIndex) ? node.orbitRingIndex : 1;
      if (!nodesByRingInSector.has(ring)) {
        nodesByRingInSector.set(ring, []);
      }
      nodesByRingInSector.get(ring)!.push(node);
    });

    const ringIndicesInSector = Array.from(nodesByRingInSector.keys()).sort((a, b) => a - b);

    ringIndicesInSector.forEach((ring) => {
      const ringNodes = nodesByRingInSector.get(ring)!;

      // Deterministic sort within (Ring, Sector) by semanticOrderKey then nodeId
      ringNodes.sort((a, b) => {
        const keyDiff = (a.semanticOrderKey || '').localeCompare(b.semanticOrderKey || '');
        if (keyDiff !== 0) return keyDiff;
        return a.nodeId.localeCompare(b.nodeId);
      });

      const n = ringNodes.length;

      const tierIndex = numSectors <= 1 ? 0 : (secIdx % numRadialTiers);
      const baseRingRadius = innerRadius + ring * ringSpacing + tierIndex * trackSpacing;

      // Dynamic track capacity based on available angular arc
      const approxCapacity = Math.max(1, Math.min(8, Math.floor((secInfo.usableAngle * baseRingRadius) / requiredChordSeparation)));
      const tracksNeeded = Math.min(maxTracksPerRing, Math.max(1, Math.ceil(n / approxCapacity)));
      trackCounts[secId] = Math.max(trackCounts[secId] || 0, tracksNeeded);

      // Assign nodes to specific tracks based on dynamic track capacity
      const nodesByTrack = new Map<number, OrbitNodeMetadata[]>();
      ringNodes.forEach((node, nodeIdx) => {
        const trk = Math.floor(nodeIdx / approxCapacity) % tracksNeeded;
        if (!nodesByTrack.has(trk)) {
          nodesByTrack.set(trk, []);
        }
        nodesByTrack.get(trk)!.push(node);
      });

      // Position nodes track-by-track using exact track node population n_k
      Array.from(nodesByTrack.keys()).sort((a, b) => a - b).forEach((track) => {
        const trackNodes = nodesByTrack.get(track)!;
        const n_k = trackNodes.length;

        if (track > maxTrackIndex) maxTrackIndex = track;

        // Tier stagger m = secIdx % numRadialTiers
        const tierIndex = numSectors <= 1 ? 0 : (secIdx % numRadialTiers);
        const baseTrackRadius = innerRadius + ring * ringSpacing + tierIndex * tierSpanPx + track * trackSpacing;

        // Same-track angular step
        const deltaTheta_k = n_k <= 1 ? secInfo.usableAngle : secInfo.usableAngle / (n_k - 1);

        // Required radius to ensure same-track adjacent chord distance >= requiredChordSeparation
        const reqRadius = calculateRequiredSectorRadius(n_k, secInfo.usableAngle, requiredChordSeparation);

        const trackRadius = Math.max(baseTrackRadius, reqRadius);

        trackNodes.forEach((node, nodeIdxOnTrack) => {
          let angle: number;
          if (n_k <= 1) {
            angle = secInfo.usableStart + secInfo.usableAngle / 2;
          } else {
            angle = secInfo.usableStart + nodeIdxOnTrack * deltaTheta_k;
          }

          angle = normalizeAngle(angle);

          // Polar to Cartesian conversion
          const x = center.x + trackRadius * Math.cos(angle);
          const y = center.y + trackRadius * Math.sin(angle);

          // Finite coordinate checks
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(trackRadius) || !Number.isFinite(angle)) {
            if (!Number.isFinite(x) || !Number.isFinite(y)) nanCount++;
            if (x === Infinity || x === -Infinity || y === Infinity || y === -Infinity) infinityCount++;

            positions[node.nodeId] = {
              nodeId: node.nodeId,
              ring,
              sector: secId,
              track,
              angle: 0,
              radius: baseTrackRadius,
              x: center.x + baseTrackRadius,
              y: center.y,
            };
            fallbackCount++;
          } else {
            positions[node.nodeId] = {
              nodeId: node.nodeId,
              ring,
              sector: secId,
              track,
              angle,
              radius: trackRadius,
              x: Math.round(x * 1000) / 1000,
              y: Math.round(y * 1000) / 1000,
            };
          }

          if (trackRadius < minRadiusPx) minRadiusPx = trackRadius;
          if (trackRadius > maxRadiusPx) maxRadiusPx = trackRadius;
        });
      });
    });
  });

  // Calculate Initial Collision Count across all node pairs
  const initialPosList = Object.values(positions);
  const totalPlaced = initialPosList.length;
  let initialCollisionCount = 0;
  let collisionPairsTested = 0;

  for (let i = 0; i < totalPlaced; i++) {
    for (let j = i + 1; j < totalPlaced; j++) {
      collisionPairsTested++;
      if (checkAABBOverlap(initialPosList[i], initialPosList[j], effWidth, effHeight)) {
        initialCollisionCount++;
        console.log(`Initial Collision #${initialCollisionCount}: A(${initialPosList[i].nodeId}, r=${initialPosList[i].ring}, s=${initialPosList[i].sector}, trk=${initialPosList[i].track}, rad=${initialPosList[i].radius}, ang=${initialPosList[i].angle.toFixed(4)}) vs B(${initialPosList[j].nodeId}, r=${initialPosList[j].ring}, s=${initialPosList[j].sector}, trk=${initialPosList[j].track}, rad=${initialPosList[j].radius}, ang=${initialPosList[j].angle.toFixed(4)})`);
      }
    }
  }

  // Multi-Pass Exact Pair Monotonic FSM Collision Repair (Defensive Fallback)
  let repairPass = 0;

  while (repairPass < maxRepairPasses) {
    repairPass++;
    let repairsInThisPass = 0;

    const placedPosList = Object.values(positions);

    for (let i = 0; i < totalPlaced; i++) {
      const posA = placedPosList[i];

      for (let j = i + 1; j < totalPlaced; j++) {
        const posB = placedPosList[j];

        if (checkAABBOverlap(posA, posB, effWidth, effHeight)) {
          const shiftNode = posB;
          shiftNode.track += 1;
          shiftNode.radius += trackSpacing;
          shiftNode.x = Math.round((center.x + shiftNode.radius * Math.cos(shiftNode.angle)) * 1000) / 1000;
          shiftNode.y = Math.round((center.y + shiftNode.radius * Math.sin(shiftNode.angle)) * 1000) / 1000;

          repairCount++;
          repairsInThisPass++;
          if (shiftNode.radius > maxRadiusPx) maxRadiusPx = shiftNode.radius;
        }
      }
    }

    if (repairsInThisPass === 0) {
      break;
    }
  }

  // Calculate Final Collision Count and Diagnostics
  const finalPosList = Object.values(positions);
  const totalFinal = finalPosList.length;
  let finalCollisionCount = 0;
  let minAngularSeparationRad = Infinity;
  let minAABBSeparationPx = Infinity;

  for (let i = 0; i < totalFinal; i++) {
    const a = finalPosList[i];
    for (let j = i + 1; j < totalFinal; j++) {
      const b = finalPosList[j];

      if (checkAABBOverlap(a, b, effWidth, effHeight)) {
        finalCollisionCount++;
      }

      if (a.ring === b.ring) {
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

  // Generate Visual Guide Metadata
  const customRingLabels = options.ringLabels;
  const guideRings: Array<{ ringIndex: number; radiusPx: number; label: string }> = [];
  for (let r = 0; r <= 5; r++) {
    const radiusPx = innerRadius + r * ringSpacing;
    const ringLabel = customRingLabels?.[r] ?? LAYER_LABELS[r] ?? `Ring ${r}`;
    guideRings.push({
      ringIndex: r,
      radiusPx,
      label: ringLabel,
    });
  }

  const guideSectors: OrbitGuideSector[] = [];
  sortedSectorIds.forEach((secId) => {
    const info = sectorAngles.get(secId);
    if (info) {
      guideSectors.push({
        sectorId: secId,
        label: secId === '_unassigned' ? 'Unassigned Features' : secId,
        startAngleRad: Math.round(info.startAngle * 1000) / 1000,
        endAngleRad: Math.round(info.endAngle * 1000) / 1000,
        sectorBodyAngleRad: Math.round(info.sectorBodyAngle * 1000) / 1000,
        sectorMarginAngleRad: Math.round(info.sectorMargin * 1000) / 1000,
        usableStartAngleRad: Math.round(info.usableStart * 1000) / 1000,
        usableEndAngleRad: Math.round(info.usableEnd * 1000) / 1000,
        usableAngleRad: Math.round(info.usableAngle * 1000) / 1000,
        nodeCount: info.nodeCount,
      });
    }
  });

  const endTime = performance.now();

  const diagnostics: OrbitDiagnostics = {
    totalNodes: nodes.length,
    ringNodeCounts,
    sectorNodeCounts,
    trackCounts,
    maxTrackIndex,
    minRadiusPx: Math.round(minRadiusPx * 1000) / 1000,
    maxRadiusPx: Math.round(maxRadiusPx * 1000) / 1000,
    minAngularSeparationRad: Math.round(minAngularSeparationRad * 10000) / 10000,
    minAABBSeparationPx: Math.round(minAABBSeparationPx * 1000) / 1000,
    initialCollisionCount,
    collisionCount: finalCollisionCount,
    collisionPairsTested,
    repairCount,
    fallbackCount,
    nanCount,
    infinityCount,
    executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
  };

  return {
    positions,
    guides: {
      rings: guideRings,
      sectors: guideSectors,
    },
    diagnostics,
  };
}
