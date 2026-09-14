import type { ExplorerEdge } from '../../types/explorer';
import { sampleEdges } from './sample-data';

export { sampleEdges };

export function createSampleEdge(overrides?: Partial<ExplorerEdge>): ExplorerEdge {
  const base = sampleEdges[0];
  return {
    ...base,
    ...overrides,
    canonical: {
      ...base.canonical,
      ...(overrides?.canonical || {}),
    },
  };
}
