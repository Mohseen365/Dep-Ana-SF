import type { ExplorerNode } from '../../types/explorer';
import { sampleNodes } from './sample-data';

export { sampleNodes };

export function createSampleNode(overrides?: Partial<ExplorerNode>): ExplorerNode {
  const base = sampleNodes[0];
  return {
    ...base,
    ...overrides,
    metrics: {
      ...base.metrics,
      ...(overrides?.metrics || {}),
    },
    behavior: {
      ...base.behavior,
      ...(overrides?.behavior || {}),
    },
    refactoringReadiness: {
      ...base.refactoringReadiness,
      ...(overrides?.refactoringReadiness || {}),
    },
  };
}
