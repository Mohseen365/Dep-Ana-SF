import type { ExplorerDataSchema, ExplorerNode } from '../../types/explorer';
import type { ArchitectureLayer } from '../layout/types';
import type { FeatureRole } from '../layout/feature-roles';
import { classifyNodeLayer } from '../layout/layers';
import {
  discoverFeatures,
  type FeatureDiscoveryOptions,
} from '../layout/features';
import {
  computeGraphCentralityAnalysis,
  type NodeSpatialRole,
  type HubType,
} from '../layout/centrality';
import { getArchitecturalHotspots } from '../hotspots';
import { isTestNode, isFieldNode } from '../layout/analysis';

export interface ComponentProfile {
  /** Stable component node ID (e.g. 'ApexClass:CloudSpendController') */
  id: string;
  /** Display name for UI rendering */
  displayName: string;
  /** Salesforce metadata type (e.g. 'ApexClass', 'LWC', 'CustomObject') */
  entityType: string;
  /** File path */
  file: string;

  // Architectural Classifications
  layer: ArchitectureLayer;
  domain: string;
  featureId: string;
  featureRole: FeatureRole;

  // Direct Dependency & Risk Metrics
  fanIn: number;
  fanOut: number;
  coupling: number;
  unresolved: number;
  score: number;
  risk: string;

  // Centrality & Structural Topology (sourced from computeGraphCentralityAnalysis)
  spatialRole: NodeSpatialRole;
  hubType: HubType;
  isBridge: boolean;

  // Hotspot Information (sourced from getArchitecturalHotspots)
  isHotspot: boolean;
  hotspotCategory?: string;

  // Refactoring Readiness Signals
  isHighRisk: boolean;
  hasCycles: boolean;
  hasUnresolved: boolean;
  isTest: boolean;
  isField: boolean;
}

export interface ComponentProfileSummary {
  totalComponents: number;
  highRiskCount: number;
  hotspotCount: number;
  bridgeCount: number;
  hubCount: number;
  averageCoupling: number;
}

export interface ComponentProfileData {
  profiles: ComponentProfile[];
  profileMap: Record<string, ComponentProfile>;
  summary: ComponentProfileSummary;
}

export interface ProfileAdapterOptions extends FeatureDiscoveryOptions {}

/**
 * Pure, deterministic data adapter for the Component Architecture Profile lens.
 * Composes authoritative outputs from existing project analytics primitives
 * (discoverFeatures, classifyNodeLayer, computeGraphCentralityAnalysis, getArchitecturalHotspots)
 * into a typed, compact component profile dataset.
 */
export function adaptComponentProfile(
  input: ExplorerDataSchema,
  options: ProfileAdapterOptions = {}
): ComponentProfileData {
  const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input?.edges) ? input.edges : [];
  const cycles = Array.isArray(input?.cycles) ? input.cycles : [];

  // Defensive sort of input nodes by ID to ensure order-invariance
  const nodes: ExplorerNode[] = [...rawNodes].sort((a, b) => a.id.localeCompare(b.id));

  if (nodes.length === 0) {
    return {
      profiles: [],
      profileMap: {},
      summary: {
        totalComponents: 0,
        highRiskCount: 0,
        hotspotCount: 0,
        bridgeCount: 0,
        hubCount: 0,
        averageCoupling: 0,
      },
    };
  }

  // 1. Feature Discovery Primitive
  const discovery = discoverFeatures(nodes, rawEdges, options);

  // Build domain and layer maps for centrality analysis
  const domainMap = new Map<string, string>();
  const layerMap = new Map<string, ArchitectureLayer>();

  nodes.forEach(node => {
    const assignment = discovery.assignments.get(node.id);
    const cluster = assignment?.primaryFeatureId
      ? discovery.features.get(assignment.primaryFeatureId)
      : undefined;
    const domain = cluster?.domains && cluster.domains.length > 0 ? cluster.domains[0] : 'Shared';

    domainMap.set(node.id, domain);
    layerMap.set(node.id, classifyNodeLayer(node));
  });

  // 2. Graph Centrality Analysis Primitive
  const centralityMap = computeGraphCentralityAnalysis(
    nodes,
    rawEdges,
    domainMap,
    layerMap,
    { index: options.index }
  );

  // 3. Hotspot Analysis Primitive
  const hotspots = getArchitecturalHotspots(nodes, cycles, input?.impactSummaries);
  const hotspotMap = new Map<string, string>();
  hotspots.topRanked.forEach(item => {
    hotspotMap.set(item.node.id, item.category);
  });

  // 4. Construct Component Profiles
  const profiles: ComponentProfile[] = [];
  const profileMap: Record<string, ComponentProfile> = {};

  let highRiskCount = 0;
  let hotspotCount = 0;
  let bridgeCount = 0;
  let hubCount = 0;
  let totalCoupling = 0;

  nodes.forEach(node => {
    const assignment = discovery.assignments.get(node.id);
    const featureId = assignment?.primaryFeatureId ?? 'Unassigned';
    const role = assignment?.featureRole ?? 'FeatureCore';
    const domain = domainMap.get(node.id) ?? 'Shared';
    const layer = layerMap.get(node.id) ?? 'application';

    const centrality = centralityMap.get(node.id);
    const spatialRole: NodeSpatialRole = centrality?.spatialRole ?? 'standard';
    const hubType: HubType = centrality?.hubType ?? 'none';
    const isBridge = centrality?.isBridge ?? false;

    if (isBridge) bridgeCount++;
    if (spatialRole === 'hub-only' || spatialRole === 'hub-and-bridge') hubCount++;

    const isHotspot = hotspotMap.has(node.id);
    if (isHotspot) hotspotCount++;
    const hotspotCategory = hotspotMap.get(node.id);

    const isHighRisk = node.risk === 'HIGH' || Boolean(node.refactoringReadiness?.isHighRisk);
    if (isHighRisk) highRiskCount++;

    const fanIn = node.metrics?.fanIn ?? 0;
    const fanOut = node.metrics?.fanOut ?? 0;
    const coupling = node.metrics?.coupling ?? (fanIn + fanOut);
    totalCoupling += coupling;

    const profile: ComponentProfile = {
      id: node.id,
      displayName: node.displayName || node.id,
      entityType: node.type,
      file: node.file || '',
      layer,
      domain,
      featureId,
      featureRole: role,
      fanIn,
      fanOut,
      coupling,
      unresolved: node.metrics?.unresolved ?? 0,
      score: node.metrics?.score ?? 0,
      risk: node.risk || 'LOW',
      spatialRole,
      hubType,
      isBridge,
      isHotspot,
      hotspotCategory,
      isHighRisk,
      hasCycles: Boolean(node.refactoringReadiness?.hasCycles),
      hasUnresolved: Boolean(node.refactoringReadiness?.hasUnresolved),
      isTest: isTestNode(node),
      isField: isFieldNode(node),
    };

    profiles.push(profile);
    profileMap[node.id] = profile;
  });

  // Sort profiles deterministically by ID
  profiles.sort((a, b) => a.id.localeCompare(b.id));

  const averageCoupling = profiles.length > 0
    ? Number((totalCoupling / profiles.length).toFixed(2))
    : 0;

  const summary: ComponentProfileSummary = {
    totalComponents: profiles.length,
    highRiskCount,
    hotspotCount,
    bridgeCount,
    hubCount,
    averageCoupling,
  };

  return {
    profiles,
    profileMap,
    summary,
  };
}
