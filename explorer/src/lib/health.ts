import { ExplorerDataSchema } from '../types/explorer';

export type HealthLevel = 'GOOD' | 'CAUTION' | 'HIGH CONCERN';

export interface ArchitectureHealth {
  score: number;
  level: HealthLevel;
  riskPercent: number;
  cycleCount: number;
  unresolvedCount: number;
  hotspotCount: number;
  mainConcerns: string[];
}

/**
 * Deterministic Architecture Health Heuristic
 *
 * Inputs:
 *   - Total nodes, high risk node count, medium risk node count
 *   - Cycle count
 *   - Unresolved reference count
 *   - Hotspot count (high risk, high coupling >= 15, high fan-in >= 8)
 *
 * Weightings & Penalties (out of 100):
 *   - Base score: 100
 *   - High Risk Penalty: - (highRiskCount / totalNodes) * 40
 *   - Medium Risk Penalty: - (mediumRiskCount / totalNodes) * 15
 *   - Cycle Penalty: - min(30, cycleCount * 10)
 *   - Unresolved Penalty: - min(20, unresolvedCount * 3)
 *   - High Coupling/Fan-In Hotspot Penalty: - min(15, hotspotCount * 2)
 *
 * Limitations:
 *   - Explorer-specific heuristic for decision support, not an industry-standard benchmark.
 */
export function calculateArchitectureHealth(data: ExplorerDataSchema | null): ArchitectureHealth {
  if (!data || !data.summary || data.summary.nodeCount === 0) {
    return {
      score: 100,
      level: 'GOOD',
      riskPercent: 0,
      cycleCount: 0,
      unresolvedCount: 0,
      hotspotCount: 0,
      mainConcerns: ['Empty dataset']
    };
  }

  const nodeCount = data.summary.nodeCount;
  const highRisk = data.summary.highRiskCount || 0;
  const mediumRisk = data.summary.mediumRiskCount || 0;
  const cycleCount = data.summary.cycleCount || 0;
  const unresolvedCount = data.summary.unresolvedCount || 0;

  let hotspotCount = 0;
  for (const node of data.nodes || []) {
    if (
      node.risk === 'HIGH' ||
      (node.metrics?.fanIn || 0) >= 8 ||
      (node.metrics?.coupling || 0) >= 15 ||
      (node.refactoringReadiness?.hasCycles)
    ) {
      hotspotCount++;
    }
  }

  const highRiskPenalty = (highRisk / nodeCount) * 40;
  const mediumRiskPenalty = (mediumRisk / nodeCount) * 15;
  const cyclePenalty = Math.min(30, cycleCount * 10);
  const unresolvedPenalty = Math.min(20, unresolvedCount * 3);
  const hotspotPenalty = Math.min(15, hotspotCount * 2);

  const totalPenalties = highRiskPenalty + mediumRiskPenalty + cyclePenalty + unresolvedPenalty + hotspotPenalty;
  const rawScore = Math.max(0, Math.round(100 - totalPenalties));

  let level: HealthLevel = 'GOOD';
  if (rawScore < 60) {
    level = 'HIGH CONCERN';
  } else if (rawScore < 85) {
    level = 'CAUTION';
  }

  const riskPercent = Math.round(((highRisk + mediumRisk) / nodeCount) * 100);

  const mainConcerns: string[] = [];
  if (cycleCount > 0) {
    mainConcerns.push(`${cycleCount} circular dependency group${cycleCount > 1 ? 's' : ''}`);
  }
  if (highRisk > 0) {
    mainConcerns.push(`${highRisk} high-risk component${highRisk > 1 ? 's' : ''}`);
  }
  if (unresolvedCount > 0) {
    mainConcerns.push(`${unresolvedCount} unresolved reference${unresolvedCount > 1 ? 's' : ''}`);
  }
  if (hotspotCount > 0 && mainConcerns.length < 3) {
    mainConcerns.push(`${hotspotCount} architectural hotspot component${hotspotCount > 1 ? 's' : ''}`);
  }
  if (mainConcerns.length === 0) {
    mainConcerns.push('No major architectural concerns identified');
  }

  return {
    score: rawScore,
    level,
    riskPercent,
    cycleCount,
    unresolvedCount,
    hotspotCount,
    mainConcerns
  };
}
