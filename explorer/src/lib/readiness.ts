import { ExplorerNode, ExplorerComponentImpactSummary } from '../types/explorer';

export type ReadinessClassification = 'GOOD CANDIDATE' | 'CAUTION' | 'HIGH CAUTION';

export interface ReadinessEvaluation {
  classification: ReadinessClassification;
  reasons: string[];
  disclaimer: string;
}

export const READINESS_DISCLAIMER =
  'Refactoring Readiness is a decision support indicator based on static analysis metadata and metrics. It is not a guarantee of safety or risk-free modification.';

export function evaluateRefactoringReadiness(
  node: ExplorerNode,
  impactSummary?: ExplorerComponentImpactSummary | null
): ReadinessEvaluation {
  const reasons: string[] = [];

  const isHighRisk = node.risk === 'HIGH' || node.refactoringReadiness?.isHighRisk;
  const isMediumRisk = node.risk === 'MEDIUM';
  const hasCycles = Boolean(node.refactoringReadiness?.hasCycles);
  const hasUnresolved = Boolean(node.refactoringReadiness?.hasUnresolved) || (node.metrics?.unresolved || 0) > 0;
  const testCoverage = node.refactoringReadiness?.testCoverageStatus;
  const fanIn = node.metrics?.fanIn || 0;
  const coupling = node.metrics?.coupling || 0;
  const totalImpact = impactSummary?.totalImpactCount || 0;

  const highFanIn = fanIn >= 8;
  const highCoupling = coupling >= 15;
  const largeImpact = totalImpact >= 10;
  const moderateImpact = totalImpact >= 5 && totalImpact < 10;

  if (isHighRisk) {
    reasons.push('High component risk score from analyzer');
  }
  if (hasCycles) {
    reasons.push('Participates in circular dependency');
  }
  if (hasUnresolved) {
    reasons.push('Contains unresolved external or missing references');
  }
  if (testCoverage === 'UNTESTED' || testCoverage === 'NO_TESTS') {
    reasons.push(
      testCoverage === 'UNTESTED'
        ? 'Untested component (no covering tests identified)'
        : 'No tests identified for this component'
    );
  }
  if (highFanIn) {
    reasons.push(`High fan-in (${fanIn} dependent components)`);
  }
  if (highCoupling) {
    reasons.push(`High coupling (${coupling} total connections)`);
  }
  if (largeImpact) {
    reasons.push(`Large architectural impact surface (${totalImpact} affected components)`);
  }

  let classification: ReadinessClassification = 'GOOD CANDIDATE';

  if (
    isHighRisk ||
    hasCycles ||
    hasUnresolved ||
    testCoverage === 'UNTESTED' ||
    testCoverage === 'NO_TESTS' ||
    highFanIn ||
    highCoupling ||
    largeImpact
  ) {
    classification = 'HIGH CAUTION';
  } else if (isMediumRisk || moderateImpact || fanIn >= 4 || coupling >= 8) {
    classification = 'CAUTION';
    if (reasons.length === 0) {
      if (isMediumRisk) reasons.push('Moderate risk evaluation from analyzer');
      if (moderateImpact) reasons.push(`Moderate architectural impact (${totalImpact} components)`);
      if (fanIn >= 4) reasons.push(`Moderate fan-in (${fanIn} dependent components)`);
      if (coupling >= 8) reasons.push(`Moderate coupling (${coupling} connections)`);
    }
  } else {
    classification = 'GOOD CANDIDATE';
    if (reasons.length === 0) {
      reasons.push('Low risk, no cycles, no unresolved references, tests identified, limited impact');
    }
  }

  return {
    classification,
    reasons,
    disclaimer: READINESS_DISCLAIMER
  };
}
