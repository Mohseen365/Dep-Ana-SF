import type { ExplorerDataSchema, ExplorerNode } from '../../types/explorer';
import type { ArchitectureLayer } from '../layout/types';
import { classifyNodeLayer } from '../layout/layers';
import {
  discoverFeatures,
  type FeatureDiscoveryOptions,
} from '../layout/features';
import {
  computeGraphCentralityAnalysis,
  type NodeSpatialRole,
} from '../layout/centrality';
import { getArchitecturalHotspots } from '../hotspots';

export interface DnaBand {
  /** Unique band ID (e.g. 'layer', 'fanIn', 'fanOut', 'risk', 'centrality', 'hotspot', 'hygiene') */
  id: 'layer' | 'fanIn' | 'fanOut' | 'risk' | 'centrality' | 'hotspot' | 'hygiene';
  /** Human-readable band label */
  label: string;
  /** Authoritative raw value (e.g. 'domain', 15, 8, 'HIGH', 'hub-and-bridge', true, false) */
  rawValue: number | string | boolean;
  /** Display value for text rendering */
  displayValue: string;
  /** Presentation-only normalized value bounded in [0.0, 1.0] for barcode band visual intensity */
  normalizedValue: number;
  /** Hex color code for barcode band styling */
  color: string;
  /** Description / provenance note */
  description: string;
}

export interface ComponentDna {
  /** Stable component node ID */
  id: string;
  /** Display name for UI rendering */
  displayName: string;
  /** Salesforce metadata type */
  entityType: string;
  /** File path */
  file: string;
  /** Architectural Layer */
  layer: ArchitectureLayer;
  /** Domain assignment */
  domain: string;
  /** Feature assignment */
  featureId: string;
  /** Risk classification */
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Array of 7 architectural DNA bands */
  bands: DnaBand[];
  /** Overall average DNA intensity score [0.0, 1.0] */
  overallDnaIndex: number;
}

export interface DnaSummary {
  totalComponents: number;
  highRiskDnaCount: number;
  hotspotDnaCount: number;
  bridgeDnaCount: number;
  hubDnaCount: number;
  averageDnaIndex: number;
}

export interface ArchitectureDnaData {
  dnaProfiles: ComponentDna[];
  dnaMap: Record<string, ComponentDna>;
  summary: DnaSummary;
}

export interface DnaAdapterOptions extends FeatureDiscoveryOptions {}

/**
 * Pure, deterministic data adapter for the Architecture DNA / Barcode lens.
 * Transforms canonical ExplorerDataSchema into a 7-band normalized barcode dataset
 * for every component, preserving authoritative raw metrics and provenance.
 */
export function adaptArchitectureDna(
  input: ExplorerDataSchema,
  options: DnaAdapterOptions = {}
): ArchitectureDnaData {
  const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input?.edges) ? input.edges : [];
  const cycles = Array.isArray(input?.cycles) ? input.cycles : [];

  // Defensive sort of input nodes by ID to guarantee 100% order-invariance
  const nodes: ExplorerNode[] = [...rawNodes].sort((a, b) => a.id.localeCompare(b.id));

  if (nodes.length === 0) {
    return {
      dnaProfiles: [],
      dnaMap: {},
      summary: {
        totalComponents: 0,
        highRiskDnaCount: 0,
        hotspotDnaCount: 0,
        bridgeDnaCount: 0,
        hubDnaCount: 0,
        averageDnaIndex: 0,
      },
    };
  }

  // 1. Feature Discovery Primitive
  const discovery = discoverFeatures(nodes, rawEdges, options);

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

  // 2. Centrality Analysis Primitive
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

  // Calculate max fanIn / fanOut across project for relative normalization bounds
  let maxFanIn = 1;
  let maxFanOut = 1;
  nodes.forEach(node => {
    const fi = node.metrics?.fanIn ?? 0;
    const fo = node.metrics?.fanOut ?? 0;
    if (fi > maxFanIn) maxFanIn = fi;
    if (fo > maxFanOut) maxFanOut = fo;
  });

  const dnaProfiles: ComponentDna[] = [];
  const dnaMap: Record<string, ComponentDna> = {};

  let highRiskDnaCount = 0;
  let hotspotDnaCount = 0;
  let bridgeDnaCount = 0;
  let hubDnaCount = 0;
  let sumDnaIndices = 0;

  nodes.forEach(node => {
    const assignment = discovery.assignments.get(node.id);
    const featureId = assignment?.primaryFeatureId ?? 'Unassigned';
    const domain = domainMap.get(node.id) ?? 'Shared';
    const layer = layerMap.get(node.id) ?? 'application';

    const centrality = centralityMap.get(node.id);
    const spatialRole: NodeSpatialRole = centrality?.spatialRole ?? 'standard';
    const isBridge = centrality?.isBridge ?? false;

    if (isBridge) bridgeDnaCount++;
    if (spatialRole === 'hub-only' || spatialRole === 'hub-and-bridge') hubDnaCount++;

    const isHotspot = hotspotMap.has(node.id);
    if (isHotspot) hotspotDnaCount++;

    const riskStr = (node.risk || 'LOW').toUpperCase();
    const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
      riskStr === 'HIGH' ? 'HIGH' : riskStr === 'MEDIUM' ? 'MEDIUM' : 'LOW';
    if (riskLevel === 'HIGH') highRiskDnaCount++;

    const fanIn = node.metrics?.fanIn ?? 0;
    const fanOut = node.metrics?.fanOut ?? 0;
    const hasCycles = Boolean(node.refactoringReadiness?.hasCycles);
    const hasUnresolved = Boolean(node.refactoringReadiness?.hasUnresolved) || (node.metrics?.unresolved ?? 0) > 0;

    // Build 7 Architectural DNA Bands
    // Band 1: Layer Depth
    let layerNorm = 0.25;
    let layerColor = '#3b82f6';
    if (layer === 'presentation') { layerNorm = 0.25; layerColor = '#3b82f6'; }
    else if (layer === 'application') { layerNorm = 0.50; layerColor = '#8b5cf6'; }
    else if (layer === 'domain') { layerNorm = 0.75; layerColor = '#10b981'; }
    else if (layer === 'schema') { layerNorm = 1.00; layerColor = '#f59e0b'; }

    const bandLayer: DnaBand = {
      id: 'layer',
      label: 'Layer Depth',
      rawValue: layer,
      displayValue: layer.toUpperCase(),
      normalizedValue: layerNorm,
      color: layerColor,
      description: `Architectural tier: ${layer}`,
    };

    // Band 2: Fan-In (Dependents)
    const fanInNorm = Math.min(1.0, Number((fanIn / Math.max(1, maxFanIn)).toFixed(4)));
    const bandFanIn: DnaBand = {
      id: 'fanIn',
      label: 'Fan-In (Dependents)',
      rawValue: fanIn,
      displayValue: `${fanIn} items`,
      normalizedValue: Math.max(0.05, fanInNorm),
      color: '#06b6d4',
      description: `Incoming dependent callers (${fanIn})`,
    };

    // Band 3: Fan-Out (Coupling)
    const fanOutNorm = Math.min(1.0, Number((fanOut / Math.max(1, maxFanOut)).toFixed(4)));
    const bandFanOut: DnaBand = {
      id: 'fanOut',
      label: 'Fan-Out (Dependencies)',
      rawValue: fanOut,
      displayValue: `${fanOut} items`,
      normalizedValue: Math.max(0.05, fanOutNorm),
      color: '#6366f1',
      description: `Outgoing dependencies (${fanOut})`,
    };

    // Band 4: Risk Severity
    let riskNorm = 0.15;
    let riskColor = '#10b981';
    if (riskLevel === 'HIGH') { riskNorm = 1.00; riskColor = '#ef4444'; }
    else if (riskLevel === 'MEDIUM') { riskNorm = 0.55; riskColor = '#f59e0b'; }

    const bandRisk: DnaBand = {
      id: 'risk',
      label: 'Risk Severity',
      rawValue: riskLevel,
      displayValue: riskLevel,
      normalizedValue: riskNorm,
      color: riskColor,
      description: `Architectural risk level: ${riskLevel}`,
    };

    // Band 5: Centrality Role
    let centralityNorm = 0.10;
    let centralityColor = '#64748b';
    let centralityDisp = 'Standard';
    if (spatialRole === 'hub-and-bridge') { centralityNorm = 1.00; centralityColor = '#a855f7'; centralityDisp = 'Hub & Bridge'; }
    else if (spatialRole === 'hub-only') { centralityNorm = 0.80; centralityColor = '#8b5cf6'; centralityDisp = 'Hub Node'; }
    else if (isBridge) { centralityNorm = 0.60; centralityColor = '#3b82f6'; centralityDisp = 'Bridge Node'; }

    const bandCentrality: DnaBand = {
      id: 'centrality',
      label: 'Centrality Role',
      rawValue: spatialRole,
      displayValue: centralityDisp,
      normalizedValue: centralityNorm,
      color: centralityColor,
      description: `Structural role: ${centralityDisp}`,
    };

    // Band 6: Hotspot Severity
    const bandHotspot: DnaBand = {
      id: 'hotspot',
      label: 'Hotspot Status',
      rawValue: isHotspot,
      displayValue: isHotspot ? 'HOTSPOT 🔥' : 'Clean',
      normalizedValue: isHotspot ? 1.00 : 0.05,
      color: isHotspot ? '#f97316' : '#334155',
      description: isHotspot ? `Architectural hotspot: ${hotspotMap.get(node.id) || 'Ranked'}` : 'Not a hotspot',
    };

    // Band 7: Refactoring Debt / Hygiene
    let hygieneNorm = 0.05;
    let hygieneColor = '#10b981';
    let hygieneDisp = 'Clean';
    if (hasCycles) { hygieneNorm = 1.00; hygieneColor = '#dc2626'; hygieneDisp = 'Circular Cycles 🔄'; }
    else if (hasUnresolved) { hygieneNorm = 0.60; hygieneColor = '#f59e0b'; hygieneDisp = 'Unresolved Refs ⚡'; }

    const bandHygiene: DnaBand = {
      id: 'hygiene',
      label: 'Refactoring Debt',
      rawValue: hasCycles ? 'cycles' : hasUnresolved ? 'unresolved' : 'clean',
      displayValue: hygieneDisp,
      normalizedValue: hygieneNorm,
      color: hygieneColor,
      description: `Technical debt signal: ${hygieneDisp}`,
    };

    const bands = [
      bandLayer,
      bandFanIn,
      bandFanOut,
      bandRisk,
      bandCentrality,
      bandHotspot,
      bandHygiene,
    ];

    const overallDnaIndex = Number(
      (bands.reduce((sum, b) => sum + b.normalizedValue, 0) / bands.length).toFixed(4)
    );

    sumDnaIndices += overallDnaIndex;

    const componentDna: ComponentDna = {
      id: node.id,
      displayName: node.displayName || node.id,
      entityType: node.type,
      file: node.file || '',
      layer,
      domain,
      featureId,
      riskLevel,
      bands,
      overallDnaIndex,
    };

    dnaProfiles.push(componentDna);
    dnaMap[node.id] = componentDna;
  });

  // Sort deterministically by ID
  dnaProfiles.sort((a, b) => a.id.localeCompare(b.id));

  const averageDnaIndex = dnaProfiles.length > 0
    ? Number((sumDnaIndices / dnaProfiles.length).toFixed(4))
    : 0;

  return {
    dnaProfiles,
    dnaMap,
    summary: {
      totalComponents: dnaProfiles.length,
      highRiskDnaCount,
      hotspotDnaCount,
      bridgeDnaCount,
      hubDnaCount,
      averageDnaIndex,
    },
  };
}
