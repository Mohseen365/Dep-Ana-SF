import type { ExplorerComponentImpactSummary } from '../../types/explorer';
import { sampleImpactSummaries } from './sample-data';

export { sampleImpactSummaries };

export function createSampleImpactSummary(
  nodeId: string,
  overrides?: Partial<ExplorerComponentImpactSummary>
): ExplorerComponentImpactSummary {
  const base = sampleImpactSummaries[nodeId] || {
    id: nodeId,
    directDependencies: [],
    directDependents: [],
    transitiveDependencies: [],
    transitiveDependents: [],
    impactedTests: [],
    totalImpactCount: 0,
  };
  return {
    ...base,
    ...overrides,
  };
}
