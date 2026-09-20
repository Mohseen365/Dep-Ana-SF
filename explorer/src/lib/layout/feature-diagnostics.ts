import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { FeatureDiscoveryResult, FeatureCluster, FeatureAssignment } from './features';
import type { LayoutGraphIndex } from './graph-index';
import { createLayoutGraphIndex } from './graph-index';

export type EvidenceType =
  | 'seed'
  | 'direct_dependency'
  | 'execution_chain'
  | 'role_compatibility'
  | 'domain_relationship'
  | 'test_ownership'
  | 'field_ownership'
  | 'shared_infrastructure';

export interface FeatureEvidence {
  type: EvidenceType;
  description: string;
  weight?: number;
}

export interface FeatureMembershipEvidence {
  nodeId: string;
  featureId: string;
  featureRole: string;
  score?: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: FeatureEvidence[];
}

export interface SeparationMarginDiagnostic {
  nodeId: string;
  ownFeatureId: string;
  ownFeatureDistance: number;
  nearestCompetingFeatureId: string;
  nearestCompetingFeatureDistance: number;
  separationMargin: number;
  classification: 'CLEAR' | 'BORDERLINE' | 'AMBIGUOUS';
}

export interface FeatureAnchorVisibilityDiagnostic {
  featureId: string;
  anchorNodeId: string;
  anchorPosition: { x: number; y: number };
  featureCentroid: { x: number; y: number };
  distanceToCentroid: number;
  isAnchorDistant: boolean;
}

export interface FeatureDensityDiagnostic {
  featureId: string;
  primaryNodeCount: number;
  totalNodeCount: number;
  featureWidth: number;
  featureHeight: number;
  featureArea: number;
  densityRatio: number;
  isHighDensity: boolean;
}

export interface FeatureDiagnosticReport {
  evidence: Record<string, FeatureMembershipEvidence>;
  separationMargins: Record<string, SeparationMarginDiagnostic>;
  anchorVisibilities: Record<string, FeatureAnchorVisibilityDiagnostic>;
  densities: Record<string, FeatureDensityDiagnostic>;
}

/**
 * Computes deterministic membership evidence explaining why a specific node belongs to its assigned feature.
 */
export function getFeatureMembershipEvidence(
  nodeId: string,
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  discoveryResult: FeatureDiscoveryResult,
  index?: LayoutGraphIndex
): FeatureMembershipEvidence {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  const graphIndex = index || createLayoutGraphIndex(safeNodes, safeEdges);

  const assignment = discoveryResult.assignments.get(nodeId);
  const node = graphIndex.nodeById.get(nodeId);

  if (!assignment || !node) {
    return {
      nodeId,
      featureId: 'Unassigned',
      featureRole: 'FeatureCore',
      confidence: 'LOW',
      evidence: [
        {
          type: 'role_compatibility',
          description: 'Unassigned or unknown node',
          weight: 0,
        },
      ],
    };
  }

  const featureId = assignment.primaryFeatureId;
  const feature = discoveryResult.features.get(featureId);
  const evidenceList: FeatureEvidence[] = [];

  if (feature && feature.anchorNodeId === nodeId) {
    evidenceList.push({
      type: 'seed',
      description: `Anchor seed component for feature cluster ${featureId}`,
      weight: 10,
    });
  }

  if (assignment.isShared) {
    evidenceList.push({
      type: 'shared_infrastructure',
      description: `Identified as Shared Infrastructure referenced by ${assignment.secondaryFeatureIds.length} features`,
      weight: 8,
    });
  }

  if (assignment.featureRole === 'FeatureTest') {
    const parentProdId = graphIndex.parentProductionNodeId.get(nodeId);
    evidenceList.push({
      type: 'test_ownership',
      description: parentProdId
        ? `Unit test targeting production parent ${parentProdId}`
        : 'Unit test associated with feature cluster',
      weight: 9,
    });
  }

  if (assignment.featureRole === 'FeatureData') {
    const parentObjId = graphIndex.parentObjectId.get(nodeId);
    evidenceList.push({
      type: 'field_ownership',
      description: parentObjId
        ? `Field belonging to CustomObject parent ${parentObjId}`
        : 'Schema field associated with feature cluster',
      weight: 9,
    });
  }

  if (feature) {
    const primarySet = new Set(feature.primaryNodeIds);
    let directDepCount = 0;

    const neighbors = graphIndex.incidentNeighborsByNode.get(nodeId) || [];
    for (const nId of neighbors) {
      if (primarySet.has(nId) && nId !== nodeId) {
        directDepCount++;
      }
    }

    if (directDepCount > 0) {
      evidenceList.push({
        type: 'direct_dependency',
        description: `Direct dependency connections to ${directDepCount} primary feature members`,
        weight: 3.0 * directDepCount,
      });
    }

    evidenceList.push({
      type: 'role_compatibility',
      description: `Role ${assignment.featureRole} aligns with feature tier structure`,
      weight: 2,
    });

    if (feature.domains.length > 0) {
      evidenceList.push({
        type: 'domain_relationship',
        description: `Aligned with primary domain ${feature.domains[0]}`,
        weight: 1,
      });
    }
  }

  const totalScore = evidenceList.reduce((sum, e) => sum + (e.weight || 0), 0);
  const confidence = totalScore >= 8 ? 'HIGH' : totalScore >= 4 ? 'MEDIUM' : 'LOW';

  return {
    nodeId,
    featureId,
    featureRole: assignment.featureRole,
    score: totalScore,
    confidence,
    evidence: evidenceList,
  };
}

/**
 * Computes separation margin diagnostics comparing distance from each primary node to its own
 * feature centroid versus nearest competing feature centroid.
 */
export function computeSeparationMarginDiagnostics(
  discoveryResult: FeatureDiscoveryResult,
  nodePositions: Record<string, { x: number; y: number }>
): Record<string, SeparationMarginDiagnostic> {
  const result: Record<string, SeparationMarginDiagnostic> = {};
  if (!nodePositions) return result;

  // Calculate centroids for all features
  const centroids = new Map<string, { x: number; y: number }>();

  discoveryResult.features.forEach((feature, fId) => {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    feature.primaryNodeIds.forEach((nId) => {
      const pos = nodePositions[nId];
      if (pos) {
        sumX += pos.x;
        sumY += pos.y;
        count++;
      }
    });

    if (count > 0) {
      centroids.set(fId, { x: sumX / count, y: sumY / count });
    }
  });

  discoveryResult.assignments.forEach((assignment, nId) => {
    const ownFeatureId = assignment.primaryFeatureId;
    if (ownFeatureId === 'Shared' || ownFeatureId === 'Unassigned') return;

    const pos = nodePositions[nId];
    const ownCentroid = centroids.get(ownFeatureId);
    if (!pos || !ownCentroid) return;

    const ownDist = Math.hypot(pos.x - ownCentroid.x, pos.y - ownCentroid.y);

    let nearestCompeteId = 'None';
    let nearestCompeteDist = Infinity;

    centroids.forEach((compCentroid, compId) => {
      if (compId !== ownFeatureId) {
        const d = Math.hypot(pos.x - compCentroid.x, pos.y - compCentroid.y);
        if (d < nearestCompeteDist) {
          nearestCompeteDist = d;
          nearestCompeteId = compId;
        }
      }
    });

    const separationMargin = nearestCompeteDist === Infinity ? 999 : nearestCompeteDist - ownDist;
    const classification = separationMargin >= 50 ? 'CLEAR' : separationMargin >= 0 ? 'BORDERLINE' : 'AMBIGUOUS';

    result[nId] = {
      nodeId: nId,
      ownFeatureId,
      ownFeatureDistance: Math.round(ownDist),
      nearestCompetingFeatureId: nearestCompeteId,
      nearestCompetingFeatureDistance: Math.round(nearestCompeteDist),
      separationMargin: Math.round(separationMargin),
      classification,
    };
  });

  return result;
}

/**
 * Computes anchor visibility diagnostics measuring spatial distance from LWC/anchor component
 * to feature cluster primary centroid.
 */
export function computeFeatureAnchorVisibilityDiagnostics(
  discoveryResult: FeatureDiscoveryResult,
  nodePositions: Record<string, { x: number; y: number }>
): Record<string, FeatureAnchorVisibilityDiagnostic> {
  const result: Record<string, FeatureAnchorVisibilityDiagnostic> = {};
  if (!nodePositions) return result;

  discoveryResult.features.forEach((feature, fId) => {
    const anchorId = feature.anchorNodeId;
    const anchorPos = nodePositions[anchorId];

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    feature.primaryNodeIds.forEach((nId) => {
      const pos = nodePositions[nId];
      if (pos) {
        sumX += pos.x;
        sumY += pos.y;
        count++;
      }
    });

    if (anchorPos && count > 0) {
      const centroid = { x: sumX / count, y: sumY / count };
      const dist = Math.hypot(anchorPos.x - centroid.x, anchorPos.y - centroid.y);

      result[fId] = {
        featureId: fId,
        anchorNodeId: anchorId,
        anchorPosition: { x: Math.round(anchorPos.x), y: Math.round(anchorPos.y) },
        featureCentroid: { x: Math.round(centroid.x), y: Math.round(centroid.y) },
        distanceToCentroid: Math.round(dist),
        isAnchorDistant: dist > 300,
      };
    }
  });

  return result;
}

/**
 * Computes density diagnostics for feature clusters based on primary node count and bounding area.
 */
export function computeFeatureDensityDiagnostics(
  discoveryResult: FeatureDiscoveryResult,
  nodePositions: Record<string, { x: number; y: number }>
): Record<string, FeatureDensityDiagnostic> {
  const result: Record<string, FeatureDensityDiagnostic> = {};
  if (!nodePositions) return result;

  discoveryResult.features.forEach((feature, fId) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let validCount = 0;

    feature.primaryNodeIds.forEach((nId) => {
      const pos = nodePositions[nId];
      if (pos) {
        validCount++;
        if (pos.x < minX) minX = pos.x;
        if (pos.x > maxX) maxX = pos.x;
        if (pos.y < minY) minY = pos.y;
        if (pos.y > maxY) maxY = pos.y;
      }
    });

    if (validCount > 0) {
      const width = Math.max(160, maxX - minX + 120);
      const height = Math.max(100, maxY - minY + 60);
      const area = width * height;
      const densityRatio = (feature.primaryNodeIds.length / area) * 10000;
      const isHighDensity = feature.primaryNodeIds.length >= 10 || densityRatio > 1.5;

      result[fId] = {
        featureId: fId,
        primaryNodeCount: feature.primaryNodeIds.length,
        totalNodeCount: feature.primaryNodeIds.length + feature.secondaryNodeIds.length,
        featureWidth: Math.round(width),
        featureHeight: Math.round(height),
        featureArea: Math.round(area),
        densityRatio: Number(densityRatio.toFixed(3)),
        isHighDensity,
      };
    }
  });

  return result;
}

/**
 * Generates comprehensive feature diagnostic report for observability, tests, and export.
 */
export function generateFeatureDiagnosticReport(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  discoveryResult: FeatureDiscoveryResult,
  nodePositions: Record<string, { x: number; y: number }>
): FeatureDiagnosticReport {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  const index = createLayoutGraphIndex(safeNodes, safeEdges);

  const evidence: Record<string, FeatureMembershipEvidence> = {};
  discoveryResult.assignments.forEach((_, nodeId) => {
    evidence[nodeId] = getFeatureMembershipEvidence(
      nodeId,
      safeNodes,
      safeEdges,
      discoveryResult,
      index
    );
  });

  const separationMargins = computeSeparationMarginDiagnostics(discoveryResult, nodePositions);
  const anchorVisibilities = computeFeatureAnchorVisibilityDiagnostics(discoveryResult, nodePositions);
  const densities = computeFeatureDensityDiagnostics(discoveryResult, nodePositions);

  return {
    evidence,
    separationMargins,
    anchorVisibilities,
    densities,
  };
}
