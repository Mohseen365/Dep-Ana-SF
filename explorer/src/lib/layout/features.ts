import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayer, ArchitectureGraphAnalysis } from './types';
import { LayoutGraphIndex, createLayoutGraphIndex } from './graph-index';
import { computeArchitectureAnalysis, isTestNode, isFieldNode } from './analysis';
import {
  classifyFeatureRole,
  isFeatureSeedCandidate,
  isSharedInfrastructure,
  type FeatureRole,
} from './feature-roles';

export interface FeatureCluster {
  /** Unique feature identifier (e.g. 'feature_OrderController') */
  id: string;
  /** Display label for UI or logging */
  name: string;
  /** Canonical node ID of the seed / anchor component */
  anchorNodeId: string;
  /** Primary production node IDs belonging exclusively to this feature */
  primaryNodeIds: string[];
  /** Secondary or shared node IDs referenced by this feature */
  secondaryNodeIds: string[];
  /** Distribution of feature roles within primary members */
  roleDistribution: Record<FeatureRole, number>;
  /** Subsystem / Domain names represented in this feature */
  domains: string[];
  /** IDs of adjacent connected feature clusters */
  connectedFeatureIds: string[];
}

export interface FeatureAssignment {
  nodeId: string;
  primaryFeatureId: string;
  secondaryFeatureIds: string[];
  featureRole: FeatureRole;
  isShared: boolean;
}

export interface FeatureDiscoveryResult {
  features: Map<string, FeatureCluster>;
  assignments: Map<string, FeatureAssignment>;
  featureList: FeatureCluster[];
}

export interface SemanticCohesionDiagnostics {
  totalNodes: number;
  discoveredFeaturesCount: number;
  primaryAssignedNodesCount: number;
  sharedNodesCount: number;
  unassignedNodesCount: number;
  featureCohesionScore: number;
  averageIntraFeatureDistance: number;
  featureDistances: Record<string, number>;
}

export interface FeatureDiscoveryOptions {
  index?: LayoutGraphIndex;
  analysis?: ArchitectureGraphAnalysis;
  layerMap?: Map<string, ArchitectureLayer> | Record<string, ArchitectureLayer>;
  domainMap?: Map<string, string> | Record<string, string>;
  featureRoles?: Map<string, FeatureRole> | Record<string, FeatureRole>;
  /** Minimum candidate score threshold required to join a feature cluster (default: 3.0) */
  minCandidateScore?: number;
}

interface RankedSeed {
  node: ExplorerNode;
  score: number;
  tier: number;
  role: FeatureRole;
}

/**
 * Checks if two feature roles satisfy architectural call-chain alignment:
 * LWC/VF -> Controller -> Service -> Selector/Repository/Data
 */
function checkExecutionChainAlignment(roleA: FeatureRole, roleB: FeatureRole): boolean {
  if (roleA === 'FeatureAnchor' && (roleB === 'FeatureAnchor' || roleB === 'FeatureCore' || roleB === 'FeatureData')) {
    return true;
  }
  if (roleA === 'FeatureCore' && (roleB === 'FeatureCore' || roleB === 'FeatureData')) {
    return true;
  }
  if (roleA === 'FeatureData' && (roleB === 'FeatureData' || roleB === 'FeatureCore')) {
    return true;
  }
  return false;
}

/**
 * Discovers Feature Clusters deterministically from graph data using adapted seed ranking
 * and dependency-weighted BFS candidate expansion.
 */
export function discoverFeatures(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: FeatureDiscoveryOptions = {}
): FeatureDiscoveryResult {
  const minCandidateScore = options.minCandidateScore ?? 3.0;

  // Step 0: Facts Normalization & Defensive Sorting
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  // Ensure all edge endpoints are present in safeNodes
  const knownNodeIds = new Set(safeNodes.map(n => n.id));
  safeEdges.forEach(e => {
    if (!knownNodeIds.has(e.source)) {
      knownNodeIds.add(e.source);
      safeNodes.push({
        id: e.source,
        displayName: e.source.split(':').pop() || e.source,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED',
        },
      });
    }
    if (!knownNodeIds.has(e.target)) {
      knownNodeIds.add(e.target);
      safeNodes.push({
        id: e.target,
        displayName: e.target.split(':').pop() || e.target,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED',
        },
      });
    }
  });

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  // Graph Infrastructure Index
  const index = options.index || createLayoutGraphIndex(safeNodes, safeEdges);

  // Architecture Analysis
  const analysis = options.analysis || computeArchitectureAnalysis(safeNodes, safeEdges, { index });

  // Layer & Domain Maps
  const layerMap = options.layerMap instanceof Map
    ? options.layerMap
    : options.layerMap
    ? new Map(Object.entries(options.layerMap))
    : new Map<string, ArchitectureLayer>();

  const domainMap = options.domainMap instanceof Map
    ? options.domainMap
    : options.domainMap
    ? new Map(Object.entries(options.domainMap))
    : new Map<string, string>();

  // Feature Role Classifications
  const featureRoles = new Map<string, FeatureRole>();
  for (const node of safeNodes) {
    const override = options.featureRoles instanceof Map
      ? options.featureRoles.get(node.id)
      : options.featureRoles?.[node.id];

    if (override) {
      featureRoles.set(node.id, override);
    } else {
      const layer = layerMap.get(node.id) || null;
      const analysisNode = analysis.nodes.get(node.id) || null;
      featureRoles.set(
        node.id,
        classifyFeatureRole(node, { layer, analysisNode, roleOverride: analysisNode?.role })
      );
    }
  }

  // Step 1: Feature Seed Candidate Ranking
  const rankedSeeds: RankedSeed[] = [];

  for (const node of safeNodes) {
    const role = featureRoles.get(node.id) || 'FeatureCore';
    const analysisNode = analysis.nodes.get(node.id);
    const layer = layerMap.get(node.id);

    if (isFeatureSeedCandidate(node, role, { analysisNode, layer })) {
      let tier = 3;
      const type = node.type;

      // Tier 1: LWC / Visualforce connected to backend / controller
      if (type === 'LWC' || type === 'Visualforce') {
        tier = 1;
      }
      // Tier 2: Controllers / API / Triggers
      else if (role === 'FeatureAnchor') {
        tier = 2;
      }
      // Tier 3: Services with fanIn >= 1
      else if (role === 'FeatureCore') {
        tier = 3;
      }
      // Tier 4: Flows
      else if (type === 'Flow') {
        tier = 4;
      }

      const fanIn = analysisNode?.fanIn || 0;
      const fanOut = analysisNode?.fanOut || 0;
      const coupling = fanIn + fanOut;

      const tierBase = tier === 1 ? 1000 : tier === 2 ? 800 : tier === 3 ? 600 : 400;
      const score = tierBase + fanIn * 4 + fanOut * 3 + coupling * 2;

      rankedSeeds.push({
        node,
        score,
        tier,
        role,
      });
    }
  }

  // Sort candidate seeds deterministically: score descending, then node ID ascending
  rankedSeeds.sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id));

  // Step 2: Feature Cluster Expansion
  const unassignedPrimaryNodes = new Set<string>();
  for (const node of safeNodes) {
    const role = featureRoles.get(node.id) || 'FeatureCore';
    const analysisNode = analysis.nodes.get(node.id);
    if (
      !isTestNode(node) &&
      !isFieldNode(node) &&
      role !== 'SharedInfrastructure' &&
      !isSharedInfrastructure(node, { analysisNode })
    ) {
      unassignedPrimaryNodes.add(node.id);
    }
  }

  const assignments = new Map<string, FeatureAssignment>();
  const features = new Map<string, FeatureCluster>();
  const featureList: FeatureCluster[] = [];
  const usedFeatureIds = new Set<string>();

  for (const seedItem of rankedSeeds) {
    const seedId = seedItem.node.id;
    if (!unassignedPrimaryNodes.has(seedId)) {
      continue;
    }

    const baseName = seedItem.node.displayName || seedId.split(':').pop() || seedId;
    let featureId = `feature_${baseName}`;
    let counter = 1;
    while (usedFeatureIds.has(featureId)) {
      counter++;
      featureId = `feature_${baseName}_${counter}`;
    }
    usedFeatureIds.add(featureId);

    unassignedPrimaryNodes.delete(seedId);

    const clusterPrimaryNodeIds: string[] = [seedId];

    assignments.set(seedId, {
      nodeId: seedId,
      primaryFeatureId: featureId,
      secondaryFeatureIds: [],
      featureRole: seedItem.role,
      isShared: false,
    });

    const candidateQueue = new Set<string>();
    const seedNeighbors = index.incidentNeighborsByNode.get(seedId) || [];
    for (const neighborId of seedNeighbors) {
      if (unassignedPrimaryNodes.has(neighborId)) {
        candidateQueue.add(neighborId);
      }
    }

    // Bounded primary candidate expansion loop
    while (candidateQueue.size > 0) {
      const scoredCandidates: { candidateId: string; score: number }[] = [];

      for (const candidateId of candidateQueue) {
        const candidateNode = index.nodeById.get(candidateId);
        if (!candidateNode) continue;

        // Do not absorb distinct Tier 1 seeds (e.g. distinct LWCs/VFs) into another Tier 1 seed cluster
        const isCandidateTier1 = candidateNode.type === 'LWC' || candidateNode.type === 'Visualforce';
        const isSeedTier1 = seedItem.tier === 1;
        if (isCandidateTier1 && isSeedTier1 && candidateId !== seedId) {
          continue;
        }

        const candidateRole = featureRoles.get(candidateId) || 'FeatureCore';

        // 1. Dependency edge count to existing cluster primary members
        let dependencyEdges = 0;
        const candidateNeighbors = index.incidentNeighborsByNode.get(candidateId) || [];
        for (const memberId of clusterPrimaryNodeIds) {
          if (candidateNeighbors.includes(memberId)) {
            dependencyEdges++;
          }
        }

        // 2. Execution chain alignment
        let executionChainAlignment = 0;
        for (const memberId of clusterPrimaryNodeIds) {
          const memberRole = featureRoles.get(memberId) || 'FeatureCore';
          if (
            checkExecutionChainAlignment(memberRole, candidateRole) ||
            checkExecutionChainAlignment(candidateRole, memberRole)
          ) {
            executionChainAlignment++;
          }
        }

        // 3. Role compatibility
        let roleCompatibility = 0;
        if (candidateRole === 'FeatureAnchor' || candidateRole === 'FeatureCore' || candidateRole === 'FeatureData') {
          roleCompatibility = 1;
        }

        // 4. Domain match
        let domainMatch = 0;
        const candidateDomain = domainMap.get(candidateId);
        const seedDomain = domainMap.get(seedId);
        if (candidateDomain && seedDomain && candidateDomain !== 'Shared' && candidateDomain === seedDomain) {
          domainMatch = 1;
        }

        const totalScore =
          3.0 * dependencyEdges +
          3.0 * executionChainAlignment +
          2.0 * roleCompatibility +
          1.0 * domainMatch;

        scoredCandidates.push({ candidateId, score: totalScore });
      }

      scoredCandidates.sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId));

      if (scoredCandidates.length === 0) break;

      const topCandidate = scoredCandidates[0];
      if (topCandidate.score < minCandidateScore) {
        // Expansion cutoff threshold reached
        break;
      }

      const selectedId = topCandidate.candidateId;
      candidateQueue.delete(selectedId);

      const selectedRole = featureRoles.get(selectedId) || 'FeatureCore';

      // Assign candidate as primary member of feature cluster
      unassignedPrimaryNodes.delete(selectedId);
      clusterPrimaryNodeIds.push(selectedId);

      assignments.set(selectedId, {
        nodeId: selectedId,
        primaryFeatureId: featureId,
        secondaryFeatureIds: [],
        featureRole: selectedRole,
        isShared: false,
      });

      // Add selected node's unassigned neighbors to candidate queue
      const newNeighbors = index.incidentNeighborsByNode.get(selectedId) || [];
      for (const neighborId of newNeighbors) {
        if (unassignedPrimaryNodes.has(neighborId)) {
          candidateQueue.add(neighborId);
        }
      }
    }

    // Attach Shared Infrastructure as secondary members of this feature cluster
    const clusterSecondaryNodeIds: string[] = [];
    for (const memberId of clusterPrimaryNodeIds) {
      const neighbors = index.incidentNeighborsByNode.get(memberId) || [];
      for (const neighborId of neighbors) {
        const neighborNode = index.nodeById.get(neighborId);
        if (!neighborNode) continue;

        const role = featureRoles.get(neighborId) || 'FeatureCore';
        const analysisNode = analysis.nodes.get(neighborId);

        if (
          role === 'SharedInfrastructure' ||
          isSharedInfrastructure(neighborNode, { analysisNode })
        ) {
          if (!clusterSecondaryNodeIds.includes(neighborId)) {
            clusterSecondaryNodeIds.push(neighborId);
          }

          let existingAssignment = assignments.get(neighborId);
          if (!existingAssignment) {
            existingAssignment = {
              nodeId: neighborId,
              primaryFeatureId: 'Shared',
              secondaryFeatureIds: [featureId],
              featureRole: 'SharedInfrastructure',
              isShared: true,
            };
            assignments.set(neighborId, existingAssignment);
          } else {
            if (!existingAssignment.secondaryFeatureIds.includes(featureId)) {
              existingAssignment.secondaryFeatureIds.push(featureId);
            }
            existingAssignment.isShared = true;
          }
        }
      }
    }

    // Role distribution calculation
    const roleDistribution: Record<FeatureRole, number> = {
      FeatureAnchor: 0,
      FeatureCore: 0,
      FeatureData: 0,
      FeatureBridge: 0,
      FeatureTest: 0,
      SharedInfrastructure: 0,
    };

    for (const memberId of clusterPrimaryNodeIds) {
      const r = featureRoles.get(memberId) || 'FeatureCore';
      roleDistribution[r] = (roleDistribution[r] || 0) + 1;
    }

    // Domain collection
    const domainSet = new Set<string>();
    for (const memberId of clusterPrimaryNodeIds) {
      const d = domainMap.get(memberId);
      if (d && d !== 'Shared') {
        domainSet.add(d);
      }
    }
    const clusterDomains = Array.from(domainSet).sort((a, b) => a.localeCompare(b));

    const cluster: FeatureCluster = {
      id: featureId,
      name: baseName,
      anchorNodeId: seedId,
      primaryNodeIds: clusterPrimaryNodeIds.sort((a, b) => a.localeCompare(b)),
      secondaryNodeIds: clusterSecondaryNodeIds.sort((a, b) => a.localeCompare(b)),
      roleDistribution,
      domains: clusterDomains,
      connectedFeatureIds: [],
    };

    features.set(featureId, cluster);
    featureList.push(cluster);
  }

  // Step 3: Satellite Node Assignment (Tests & Fields inherit parent Feature)
  for (const node of safeNodes) {
    if (isTestNode(node)) {
      const prodParentId = index.parentProductionNodeId.get(node.id);
      if (prodParentId) {
        const prodAssignment = assignments.get(prodParentId);
        if (prodAssignment && prodAssignment.primaryFeatureId !== 'Shared') {
          const feat = features.get(prodAssignment.primaryFeatureId);
          if (feat && !feat.secondaryNodeIds.includes(node.id)) {
            feat.secondaryNodeIds.push(node.id);
            feat.secondaryNodeIds.sort((a, b) => a.localeCompare(b));
          }
          assignments.set(node.id, {
            nodeId: node.id,
            primaryFeatureId: prodAssignment.primaryFeatureId,
            secondaryFeatureIds: [],
            featureRole: 'FeatureTest',
            isShared: false,
          });
        }
      }
    } else if (isFieldNode(node)) {
      const objParentId = index.parentObjectId.get(node.id);
      if (objParentId) {
        const objAssignment = assignments.get(objParentId);
        if (objAssignment && objAssignment.primaryFeatureId !== 'Shared') {
          const feat = features.get(objAssignment.primaryFeatureId);
          if (feat && !feat.secondaryNodeIds.includes(node.id)) {
            feat.secondaryNodeIds.push(node.id);
            feat.secondaryNodeIds.sort((a, b) => a.localeCompare(b));
          }
          assignments.set(node.id, {
            nodeId: node.id,
            primaryFeatureId: objAssignment.primaryFeatureId,
            secondaryFeatureIds: [],
            featureRole: 'FeatureData',
            isShared: false,
          });
        }
      }
    }
  }

  // Handle remaining unassigned nodes
  for (const node of safeNodes) {
    if (!assignments.has(node.id)) {
      const role = featureRoles.get(node.id) || 'FeatureCore';
      assignments.set(node.id, {
        nodeId: node.id,
        primaryFeatureId: 'Unassigned',
        secondaryFeatureIds: [],
        featureRole: role,
        isShared: role === 'SharedInfrastructure',
      });
    }
  }

  // Step 4: Compute Cross-Feature Cluster Connections
  for (const cluster of featureList) {
    const connectedFeatIds = new Set<string>();
    for (const memberId of cluster.primaryNodeIds) {
      const neighbors = index.incidentNeighborsByNode.get(memberId) || [];
      for (const nId of neighbors) {
        const nAssignment = assignments.get(nId);
        if (
          nAssignment &&
          nAssignment.primaryFeatureId !== cluster.id &&
          nAssignment.primaryFeatureId !== 'Shared' &&
          nAssignment.primaryFeatureId !== 'Unassigned'
        ) {
          connectedFeatIds.add(nAssignment.primaryFeatureId);
        }
      }
    }
    cluster.connectedFeatureIds = Array.from(connectedFeatIds).sort((a, b) => a.localeCompare(b));
  }

  return {
    features,
    assignments,
    featureList: featureList.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

/**
 * Calculates semantic feature cohesion metrics grouped strictly by discovered Feature ID
 * rather than relying on legacy name-prefix domain heuristics.
 */
export function calculateSemanticFeatureCohesion(
  nodes: ExplorerNode[],
  positions: Record<string, { x: number; y: number }>,
  discovery: FeatureDiscoveryResult
): SemanticCohesionDiagnostics {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  if (safeNodes.length === 0 || !positions) {
    return {
      totalNodes: 0,
      discoveredFeaturesCount: discovery.features.size,
      primaryAssignedNodesCount: 0,
      sharedNodesCount: 0,
      unassignedNodesCount: 0,
      featureCohesionScore: 1.0,
      averageIntraFeatureDistance: 0,
      featureDistances: {},
    };
  }

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const node of safeNodes) {
    const pos = positions[node.id];
    if (pos) {
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    }
  }

  const graphDiagonal = Math.sqrt(
    Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2)
  );
  const graphScale = graphDiagonal > 1e-9 ? graphDiagonal : 1;

  const featureNodesMap = new Map<string, ExplorerNode[]>();
  let primaryAssignedNodesCount = 0;
  let sharedNodesCount = 0;
  let unassignedNodesCount = 0;

  for (const node of safeNodes) {
    const assignment = discovery.assignments.get(node.id);
    const featureId = assignment ? assignment.primaryFeatureId : 'Unassigned';

    if (featureId === 'Shared') {
      sharedNodesCount++;
    } else if (featureId === 'Unassigned') {
      unassignedNodesCount++;
    } else {
      primaryAssignedNodesCount++;
    }

    if (!featureNodesMap.has(featureId)) {
      featureNodesMap.set(featureId, []);
    }
    featureNodesMap.get(featureId)!.push(node);
  }

  const featureDistances: Record<string, number> = {};
  let totalIntraDistSum = 0;
  let evaluatedFeatureCount = 0;

  featureNodesMap.forEach((fNodes, featureId) => {
    // Skip Shared and Unassigned buckets for intra-feature cohesion metric
    if (featureId === 'Shared' || featureId === 'Unassigned' || fNodes.length < 2) {
      return;
    }

    let distSum = 0;
    let pairCount = 0;

    for (let i = 0; i < fNodes.length; i++) {
      const posA = positions[fNodes[i].id];
      for (let j = i + 1; j < fNodes.length; j++) {
        const posB = positions[fNodes[j].id];
        if (posA && posB) {
          const dx = posA.x - posB.x;
          const dy = posA.y - posB.y;
          distSum += Math.sqrt(dx * dx + dy * dy);
          pairCount++;
        }
      }
    }

    const avgDist = pairCount > 0 ? distSum / pairCount : 0;
    featureDistances[featureId] = avgDist;
    totalIntraDistSum += avgDist;
    evaluatedFeatureCount++;
  });

  const averageIntraFeatureDistance =
    evaluatedFeatureCount > 0 ? totalIntraDistSum / evaluatedFeatureCount : 0;
  const dispersion = averageIntraFeatureDistance / graphScale;
  const featureCohesionScore = Math.max(0, Math.min(1, 1 - dispersion));

  return {
    totalNodes: safeNodes.length,
    discoveredFeaturesCount: discovery.features.size,
    primaryAssignedNodesCount,
    sharedNodesCount,
    unassignedNodesCount,
    featureCohesionScore,
    averageIntraFeatureDistance,
    featureDistances,
  };
}
