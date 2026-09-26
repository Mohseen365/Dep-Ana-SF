import type { ExplorerDataSchema, ExplorerNode } from '../../types/explorer';
import type { ArchitectureLayer } from '../layout/types';
import { calculateArchitectureHealth, type HealthLevel } from '../health';
import {
  discoverFeatures,
  calculateSemanticFeatureCohesion,
  type FeatureDiscoveryOptions,
} from '../layout/features';
import { layerViolationCount } from '../layout/metrics';
import { getArchitecturalHotspots } from '../hotspots';
import { classifyNodeLayer } from '../layout/layers';

export interface RadarDimension {
  /** Stable dimension identifier */
  id: string;
  /** Display label for radar chart axis rendering */
  label: string;
  /** Raw metric value directly sourced from existing analytics */
  rawValue: number;
  /**
   * Normalized score (0-100 scale) sourced from calculateArchitectureHealth or direct percentage metrics.
   * Higher score = healthier dimension.
   */
  score: number;
  /** Description or unit of the raw metric */
  unit: string;
  /** Name of the authoritative source function supplying this metric */
  sourceMetric: string;
}

export interface RadarSummary {
  overallHealthScore: number;
  healthLevel: HealthLevel;
  totalComponents: number;
  totalDependencies: number;
  dimensionCount: number;
}

export interface RadarData {
  dimensions: RadarDimension[];
  summary: RadarSummary;
}

export interface RadarAdapterOptions extends FeatureDiscoveryOptions {}

/**
 * Pure, deterministic data adapter for the Architectural Dimension / Radar lens.
 * Shapes authoritative architecture-level quality metrics from existing project primitives
 * (calculateArchitectureHealth, discoverFeatures, calculateSemanticFeatureCohesion, layerViolationCount, getArchitecturalHotspots)
 * into a typed, compact radar dataset without inventing custom scoring models.
 */
export function adaptArchitectureRadar(
  input: ExplorerDataSchema,
  options: RadarAdapterOptions = {}
): RadarData {
  const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input?.edges) ? input.edges : [];
  const cycles = Array.isArray(input?.cycles) ? input.cycles : [];

  // Defensive sort of input nodes by ID to ensure order-invariance
  const nodes: ExplorerNode[] = [...rawNodes].sort((a, b) => a.id.localeCompare(b.id));

  if (nodes.length === 0) {
    return {
      dimensions: [],
      summary: {
        overallHealthScore: 100,
        healthLevel: 'GOOD',
        totalComponents: 0,
        totalDependencies: 0,
        dimensionCount: 0,
      },
    };
  }

  // 1. Authoritative Architecture Health Heuristic
  const health = calculateArchitectureHealth(input);

  // 2. Authoritative Feature Discovery & Semantic Cohesion
  const discovery = discoverFeatures(nodes, rawEdges, options);

  // 3. Authoritative Layer Violations Calculation
  const layerMap: Record<string, ArchitectureLayer> = {};
  nodes.forEach(node => {
    layerMap[node.id] = classifyNodeLayer(node);
  });
  const layerViolations = layerViolationCount(nodes, rawEdges, layerMap);

  // 4. Authoritative Hotspots Calculation
  const hotspots = getArchitecturalHotspots(nodes, cycles, input?.impactSummaries);

  // 5. Construct Radar Dimensions from Authoritative Primitives
  const highRisk = input?.summary?.highRiskCount ?? 0;
  const mediumRisk = input?.summary?.mediumRiskCount ?? 0;
  const totalNodes = nodes.length;
  const totalEdges = rawEdges.length;

  const lowRiskCount = totalNodes - highRisk - mediumRisk;
  const lowRiskRatio = totalNodes > 0 ? (lowRiskCount / totalNodes) * 100 : 100;

  const cycleCount = input?.summary?.cycleCount ?? cycles.length;
  const unresolvedCount = input?.summary?.unresolvedCount ?? 0;

  // Layer Purity Score (100 - (layerViolations / totalEdges) * 100)
  const layerPurityScore = totalEdges > 0
    ? Math.max(0, Math.round(100 - (layerViolations / totalEdges) * 100))
    : 100;

  // Unresolved Integrity Score (100 - min(100, unresolvedCount * 5))
  const unresolvedIntegrityScore = Math.max(0, 100 - Math.min(100, unresolvedCount * 5));

  // Circular Dependency Score (100 - min(100, cycleCount * 20))
  const cycleIntegrityScore = Math.max(0, 100 - Math.min(100, cycleCount * 20));

  const dimensions: RadarDimension[] = [
    {
      id: 'overall_health',
      label: 'Architecture Health',
      rawValue: health.score,
      score: health.score,
      unit: 'score (0-100)',
      sourceMetric: 'calculateArchitectureHealth()',
    },
    {
      id: 'risk_profile',
      label: 'Low Risk Profile',
      rawValue: Math.round(lowRiskRatio),
      score: Math.round(lowRiskRatio),
      unit: '% low risk components',
      sourceMetric: 'data.summary.highRiskCount / mediumRiskCount',
    },
    {
      id: 'layer_purity',
      label: 'Layer Flow Purity',
      rawValue: layerViolations,
      score: layerPurityScore,
      unit: 'layer violations count',
      sourceMetric: 'layerViolationCount()',
    },
    {
      id: 'cycle_integrity',
      label: 'Acyclic Structure',
      rawValue: cycleCount,
      score: cycleIntegrityScore,
      unit: 'circular dependency groups',
      sourceMetric: 'data.summary.cycleCount',
    },
    {
      id: 'unresolved_integrity',
      label: 'Reference Integrity',
      rawValue: unresolvedCount,
      score: unresolvedIntegrityScore,
      unit: 'unresolved references count',
      sourceMetric: 'data.summary.unresolvedCount',
    },
    {
      id: 'hotspot_density',
      label: 'Hotspot Isolation',
      rawValue: hotspots.topRanked.length,
      score: Math.max(0, Math.round(100 - (hotspots.topRanked.length / totalNodes) * 100)),
      unit: 'hotspot components count',
      sourceMetric: 'getArchitecturalHotspots()',
    },
  ];

  // Sort dimensions deterministically by ID
  dimensions.sort((a, b) => a.id.localeCompare(b.id));

  const summary: RadarSummary = {
    overallHealthScore: health.score,
    healthLevel: health.level,
    totalComponents: totalNodes,
    totalDependencies: totalEdges,
    dimensionCount: dimensions.length,
  };

  return {
    dimensions,
    summary,
  };
}
