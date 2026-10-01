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
  innerRadius?: number; // Nucleus clearance radius (default: 120px)
  ringSpacing?: number; // Base radial spacing between rings (default: 160px >= W_eff)
  nodeWidth?: number; // Bounding width W (default: 120px)
  nodeHeight?: number; // Bounding height H (default: 60px)
  horizontalGap?: number; // Horizontal clearance C_x (default: 40px)
  verticalGap?: number; // Vertical clearance C_y (default: 40px)
  sectorMarginAngleRad?: number; // Inter-sector angular margin gap (default: 0.05 rad)
  trackSpacingPx?: number; // Radial delta between tracks within same ring (default: 100px >= H_eff)
  maxTracksPerRing?: number; // Max track expansion count (default: 10)
  maxRepairPasses?: number; // Max iterative collision repair passes (default: 20)
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

export interface OrbitGuideMetadata {
  rings: Array<{ ringIndex: number; radiusPx: number; label: string }>;
  sectors: Array<{ sectorId: string; label: string; startAngleRad: number; endAngleRad: number }>;
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
  collisionCount: number;
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
  const innerRadius = options.innerRadius ?? 120;
  const ringSpacing = options.ringSpacing ?? 160; // >= W_eff (120 + 40 = 160)
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;
  const sectorMargin = options.sectorMarginAngleRad ?? 0.05;
  const trackSpacing = options.trackSpacingPx ?? 100; // >= H_eff (60 + 40 = 100)
  const maxTracksPerRing = options.maxTracksPerRing ?? 10;
  const maxRepairPasses = options.maxRepairPasses ?? 20;

  const effWidth = nodeWidth + horizontalGap;
  const effHeight = nodeHeight + verticalGap;
  // Diagonal effective chord clearance
  const requiredChordSeparation = Math.sqrt(effWidth * effWidth + effHeight * effHeight) * 0.5;

  const rawNodes = Array.isArray(input.nodes) ? [...input.nodes] : [];

  // Deterministic sorting of input nodes by ID
  const nodes = [...rawNodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  // Diagnostics counters
  let nanCount = 0;
  let infinityCount = 0;
  let collisionCount = 0;
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

  // Dynamic Angular Sector Allocation
  const numSectors = sortedSectorIds.length;
  const totalCircleRad = 2 * Math.PI;

  const sectorAngles = new Map<string, { startAngle: number; endAngle: number; usableAngle: number }>();

  if (numSectors === 0) {
    // Empty graph
  } else if (numSectors === 1) {
    const secId = sortedSectorIds[0];
    const usableAngle = Math.max(0.001, totalCircleRad - 2 * sectorMargin);
    sectorAngles.set(secId, {
      startAngle: 0,
      endAngle: totalCircleRad,
      usableAngle,
    });
  } else {
    // Proportional allocation based on total sector node population
    const totalNodesCount = Math.max(1, nodes.length);
    const minSectorSpan = Math.max(2 * sectorMargin + 0.05, totalCircleRad / (numSectors * 4));

    const sectorSpans = new Map<string, number>();
    sortedSectorIds.forEach((secId) => {
      const pop = sectorNodeCounts[secId] || 1;
      const proportion = pop / totalNodesCount;
      const span = Math.max(minSectorSpan, proportion * totalCircleRad);
      sectorSpans.set(secId, span);
    });

    // Renormalize spans to sum exactly to 2*pi
    let sumSpans = 0;
    sectorSpans.forEach((s) => (sumSpans += s));
    let currentAngle = 0;

    sortedSectorIds.forEach((secId) => {
      const rawSpan = sectorSpans.get(secId)!;
      const normalizedSpan = (rawSpan / sumSpans) * totalCircleRad;
      const startAngle = currentAngle;
      const endAngle = currentAngle + normalizedSpan;
      const usableAngle = Math.max(0.001, normalizedSpan - 2 * sectorMargin);

      sectorAngles.set(secId, {
        startAngle,
        endAngle,
        usableAngle,
      });

      currentAngle = endAngle;
    });
  }

  // Node Placement Calculation per Ring and Sector
  const positions: Record<string, OrbitNodePosition> = {};
  let maxTrackIndex = 0;
  let minRadiusPx = Infinity;
  let maxRadiusPx = 0;

  sortedSectorIds.forEach((secId) => {
    const secNodes = nodesBySector.get(secId) || [];
    const angleInfo = sectorAngles.get(secId) || { startAngle: 0, endAngle: 2 * Math.PI, usableAngle: 2 * Math.PI - 0.1 };

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

      const baseRingRadius = innerRadius + ring * ringSpacing;
      const n = ringNodes.length;

      // Determine required tracks for this ring population
      const reqRadiusForSingleTrack = calculateRequiredSectorRadius(n, angleInfo.usableAngle, requiredChordSeparation);

      let tracksNeeded = 1;
      if (reqRadiusForSingleTrack > baseRingRadius && n > 1) {
        // Expand into multiple tracks
        const approxCapacityPerTrack = Math.max(
          1,
          Math.floor((angleInfo.usableAngle * baseRingRadius) / requiredChordSeparation)
        );
        tracksNeeded = Math.min(maxTracksPerRing, Math.ceil(n / approxCapacityPerTrack));
      }

      trackCounts[secId] = Math.max(trackCounts[secId] || 0, tracksNeeded);

      // Assign nodes to specific tracks and group nodes by track for exact track angular spacing
      const nodesByTrack = new Map<number, OrbitNodeMetadata[]>();
      ringNodes.forEach((node, nodeIdx) => {
        const trk = nodeIdx % tracksNeeded;
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
        const trackRadius = baseRingRadius + track * trackSpacing;

        trackNodes.forEach((node, nodeIdxOnTrack) => {
          let angle: number;
          if (n_k <= 1) {
            angle = angleInfo.startAngle + sectorMargin + angleInfo.usableAngle / 2;
          } else {
            const stepAngle = angleInfo.usableAngle / (n_k - 1);
            angle = angleInfo.startAngle + sectorMargin + nodeIdxOnTrack * stepAngle;
          }

          angle = normalizeAngle(angle);

          // Polar to Cartesian conversion
          const x = center.x + trackRadius * Math.cos(angle);
          const y = center.y + trackRadius * Math.sin(angle);

          // Finite coordinate checks
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(trackRadius) || !Number.isFinite(angle)) {
            if (!Number.isFinite(x) || !Number.isFinite(y)) nanCount++;
            if (x === Infinity || x === -Infinity || y === Infinity || y === -Infinity) infinityCount++;

            // Deterministic fallback
            positions[node.nodeId] = {
              nodeId: node.nodeId,
              ring,
              sector: secId,
              track,
              angle: 0,
              radius: baseRingRadius,
              x: center.x + baseRingRadius,
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

  // Multi-Pass Exact Pair Collision Repair
  let repairPass = 0;

  while (repairPass < maxRepairPasses) {
    repairPass++;
    let repairsInThisPass = 0;

    const placedPosList = Object.values(positions);
    const totalPlaced = placedPosList.length;
    if (totalPlaced <= 1) break;

    for (let i = 0; i < totalPlaced; i++) {
      const posA = placedPosList[i];

      for (let j = i + 1; j < totalPlaced; j++) {
        const posB = placedPosList[j];

        // Exact AABB collision test
        if (checkAABBOverlap(posA, posB, effWidth, effHeight)) {
          collisionCount++;

          // Deterministic Monotonic FSM Collision Repair:
          // Shift lower priority / higher index node outwards radially along its angle
          const shiftNode = posB;
          const shiftAngle = shiftNode.angle;

          // Expand radius by trackSpacing
          shiftNode.track += 1;
          shiftNode.radius += trackSpacing;
          shiftNode.x = Math.round((center.x + shiftNode.radius * Math.cos(shiftAngle)) * 1000) / 1000;
          shiftNode.y = Math.round((center.y + shiftNode.radius * Math.sin(shiftAngle)) * 1000) / 1000;

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

  // Calculate Minimum Angular & AABB Separations for Diagnostics
  const finalPosList = Object.values(positions);
  const totalFinal = finalPosList.length;
  let minAngularSeparationRad = Infinity;
  let minAABBSeparationPx = Infinity;

  for (let i = 0; i < totalFinal; i++) {
    const a = finalPosList[i];
    for (let j = i + 1; j < totalFinal; j++) {
      const b = finalPosList[j];

      // Angular separation for nodes in same ring
      if (a.ring === b.ring) {
        const diff = Math.abs(a.angle - b.angle);
        const angularDist = Math.min(diff, 2 * Math.PI - diff);
        if (angularDist > 1e-6 && angularDist < minAngularSeparationRad) {
          minAngularSeparationRad = angularDist;
        }
      }

      // Center-to-center distance minus effective boundary
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
  const guideRings: Array<{ ringIndex: number; radiusPx: number; label: string }> = [];
  for (let r = 0; r <= 5; r++) {
    const radiusPx = innerRadius + r * ringSpacing;
    guideRings.push({
      ringIndex: r,
      radiusPx,
      label: LAYER_LABELS[r] || `Layer Ring ${r}`,
    });
  }

  const guideSectors: Array<{ sectorId: string; label: string; startAngleRad: number; endAngleRad: number }> = [];
  sortedSectorIds.forEach((secId) => {
    const info = sectorAngles.get(secId);
    if (info) {
      guideSectors.push({
        sectorId: secId,
        label: secId === '_unassigned' ? 'Unassigned Features' : secId,
        startAngleRad: Math.round(info.startAngle * 1000) / 1000,
        endAngleRad: Math.round(info.endAngle * 1000) / 1000,
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
    collisionCount,
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
