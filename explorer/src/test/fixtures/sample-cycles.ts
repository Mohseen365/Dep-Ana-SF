import type { ExplorerCycleGroup } from '../../types/explorer';
import { sampleCycles } from './sample-data';

export { sampleCycles };

export function createSampleCycleGroup(overrides?: Partial<ExplorerCycleGroup>): ExplorerCycleGroup {
  const base = sampleCycles[0];
  return {
    ...base,
    ...overrides,
  };
}
