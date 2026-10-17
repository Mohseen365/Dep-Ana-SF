import { describe, it, expect } from 'vitest';
import { stableCompareStrings, stableCompareByProperty } from '../lib/layout/compare';

describe('Deterministic Sorting - stableCompareStrings', () => {
  it('produces identical ordering for strings regardless of system locale', () => {
    const list = ['charlie', 'alpha', 'bravo', 'delta'];
    const sorted1 = [...list].sort(stableCompareStrings);
    const sorted2 = [...list].reverse().sort(stableCompareStrings);

    expect(sorted1).toEqual(['alpha', 'bravo', 'charlie', 'delta']);
    expect(sorted2).toEqual(sorted1);
  });

  it('handles null and undefined deterministically', () => {
    const items = ['beta', null, 'alpha', undefined, 'gamma'];
    const sorted = [...items].sort(stableCompareStrings);

    expect(sorted).toEqual([undefined, null, 'alpha', 'beta', 'gamma']);
  });

  it('compares objects deterministically using stableCompareByProperty', () => {
    const nodes = [
      { id: 'node3', name: 'Gamma' },
      { id: 'node1', name: 'Alpha' },
      { id: 'node2', name: 'Beta' },
    ];

    const sorted = [...nodes].sort((a, b) => stableCompareByProperty(a, b, n => n.id));
    expect(sorted.map(n => n.id)).toEqual(['node1', 'node2', 'node3']);
  });
});
