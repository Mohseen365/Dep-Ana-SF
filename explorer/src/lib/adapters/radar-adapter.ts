import { ExplorerDataSchema } from '../../types/explorer';
import { calculateArchitectureHealth, HealthLevel } from '../health';
import { getArchitecturalHotspots } from '../hotspots';

export interface RadarDimension {
  id: string;
  label: string;
  value: number;
  rawValue: number;
  unit: 'score' | 'percent' | 'count';
  sourceMetric: string;
  hasAuthoritativeScore: boolean;
  description: string;
}

export interface RadarSummary {
  architectureHealthScore: number;
  healthLevel: HealthLevel;
  riskPercent: number;
  totalComponents: number;
  totalDependencies: number;
  cycleCount: number;
  unresolvedCount: number;
  hotspotCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  mainConcerns: string[];
}

export interface MissingPrimitiveInfo {
  dimension: string;
  reason: string;
  requiredPrimitive: string;
}

export interface RadarData {
  dimensions: RadarDimension[];
  summary: RadarSummary;
  missingPrimitives: MissingPrimitiveInfo[];
}

export interface RadarAdapterOptions {
  includeOptionalDimensions?: boolean;
}

/**
 * Radar / Architectural Dimension Adapter
 *
 * Pure, read-only, deterministic data transformation adapter that shapes existing
 * authoritative project and architecture health metrics into a multidimensional radar dataset.
 *
 * CRITICAL RULE: Does NOT invent new scoring algorithms or weightings.
 * Only dimensions backed by authoritative project metrics are exposed with scores.
 * Unscored counts are exposed as raw metrics. Unbacked radar concepts are reported
 * explicitly as missing primitives.
 */
export function adaptRadarDimensions(
  input: ExplorerDataSchema,
  _options?: RadarAdapterOptions
): RadarData {
  const nodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const edges = Array.isArray(input?.edges) ? input.edges : [];
  const cycles = Array.isArray(input?.cycles) ? input.cycles : [];

  // Defensive copy for calculations, sorted by ID for input-order determinism
  const sortedNodes = [...nodes].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
  const sortedEdges = [...edges].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
  const sortedCycles = [...cycles].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));

  // Compute authoritative architecture health metrics via existing health.ts heuristic
  const health = calculateArchitectureHealth(input);

  // Compute authoritative hotspot metrics via existing hotspots.ts
  const hotspots = getArchitecturalHotspots(sortedNodes, sortedCycles);

  const totalNodes = sortedNodes.length;
  const totalEdges = sortedEdges.length;
  const cycleCount = sortedCycles.length;
  const unresolvedCount = input?.summary?.unresolvedCount ?? 0;
  const highRiskCount = input?.summary?.highRiskCount ?? sortedNodes.filter(n => n.risk === 'HIGH' || n.refactoringReadiness?.isHighRisk).length;
  const mediumRiskCount = input?.summary?.mediumRiskCount ?? sortedNodes.filter(n => n.risk === 'MEDIUM').length;

  const dimensions: RadarDimension[] = [
    {
      id: 'architecture_health',
      label: 'Architecture Health',
      value: health.score,
      rawValue: health.score,
      unit: 'score',
      sourceMetric: 'calculateArchitectureHealth().score (explorer/src/lib/health.ts)',
      hasAuthoritativeScore: true,
      description: 'Overall architectural health score out of 100 calculated by calculateArchitectureHealth heuristic'
    },
    {
      id: 'risk_exposure',
      label: 'Risk Exposure',
      value: health.riskPercent,
      rawValue: health.riskPercent,
      unit: 'percent',
      sourceMetric: 'calculateArchitectureHealth().riskPercent (explorer/src/lib/health.ts)',
      hasAuthoritativeScore: true,
      description: 'Percentage of components classified as HIGH or MEDIUM risk'
    },
    {
      id: 'circular_dependencies',
      label: 'Circular Dependencies',
      value: cycleCount,
      rawValue: cycleCount,
      unit: 'count',
      sourceMetric: 'input.cycles.length / input.summary.cycleCount',
      hasAuthoritativeScore: false,
      description: 'Total number of circular dependency groups in the project'
    },
    {
      id: 'unresolved_references',
      label: 'Unresolved References',
      value: unresolvedCount,
      rawValue: unresolvedCount,
      unit: 'count',
      sourceMetric: 'input.summary.unresolvedCount',
      hasAuthoritativeScore: false,
      description: 'Total count of unresolved external or missing component references'
    },
    {
      id: 'architectural_hotspots',
      label: 'Architectural Hotspots',
      value: hotspots.topRanked.length,
      rawValue: hotspots.topRanked.length,
      unit: 'count',
      sourceMetric: 'getArchitecturalHotspots().topRanked.length (explorer/src/lib/hotspots.ts)',
      hasAuthoritativeScore: false,
      description: 'Total count of components exceeding fan-in, coupling, or risk hotspot thresholds'
    },
    {
      id: 'high_risk_components',
      label: 'High Risk Components',
      value: highRiskCount,
      rawValue: highRiskCount,
      unit: 'count',
      sourceMetric: 'input.summary.highRiskCount',
      hasAuthoritativeScore: false,
      description: 'Total count of components classified as HIGH risk'
    },
    {
      id: 'medium_risk_components',
      label: 'Medium Risk Components',
      value: mediumRiskCount,
      rawValue: mediumRiskCount,
      unit: 'count',
      sourceMetric: 'input.summary.mediumRiskCount',
      hasAuthoritativeScore: false,
      description: 'Total count of components classified as MEDIUM risk'
    },
    {
      id: 'total_components',
      label: 'Total Components',
      value: totalNodes,
      rawValue: totalNodes,
      unit: 'count',
      sourceMetric: 'input.nodes.length / input.summary.nodeCount',
      hasAuthoritativeScore: false,
      description: 'Total count of architectural components in the project'
    },
    {
      id: 'total_dependencies',
      label: 'Total Dependencies',
      value: totalEdges,
      rawValue: totalEdges,
      unit: 'count',
      sourceMetric: 'input.edges.length / input.summary.edgeCount',
      hasAuthoritativeScore: false,
      description: 'Total count of directed dependency relationships in the project'
    }
  ];

  // Document missing primitives explicitly to enforce strict no-invented-scoring policy
  const missingPrimitives: MissingPrimitiveInfo[] = [
    {
      dimension: 'Layer Purity Score',
      reason: 'No authoritative 0-100 layer purity or illegal layer dependency scoring model exists in the project.',
      requiredPrimitive: 'computeLayerPurityIndex(nodes, edges)'
    },
    {
      dimension: 'Dependency Health Index',
      reason: 'No authoritative normalized dependency health or fan-in/fan-out balance metric exists in the project.',
      requiredPrimitive: 'computeDependencyHealthIndex(nodes, edges)'
    },
    {
      dimension: 'Test Coverage Score',
      reason: 'Node testCoverageStatus is categorical (COVERED, NO_TESTS, UNTESTED), not a percentage or project-level aggregate score.',
      requiredPrimitive: 'computeProjectTestCoverageScore(nodes)'
    }
  ];

  const summary: RadarSummary = {
    architectureHealthScore: health.score,
    healthLevel: health.level,
    riskPercent: health.riskPercent,
    totalComponents: totalNodes,
    totalDependencies: totalEdges,
    cycleCount,
    unresolvedCount,
    hotspotCount: hotspots.topRanked.length,
    highRiskCount,
    mediumRiskCount,
    mainConcerns: [...health.mainConcerns]
  };

  return {
    dimensions,
    summary,
    missingPrimitives
  };
}
