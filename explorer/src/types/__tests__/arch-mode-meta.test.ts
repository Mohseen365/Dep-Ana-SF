import { describe, it, expect } from 'vitest';
import { ARCH_MODE_META, ArchitectureLayoutMode } from '../explorer';

describe('ARCH_MODE_META Cycle Invariants', () => {
  it('forms a single closed cycle containing all 4 architecture modes', () => {
    const modes: ArchitectureLayoutMode[] = ['hierarchical', 'hybrid', 'orbit', 'constellation'];

    // Verify all 4 modes are present in ARCH_MODE_META
    modes.forEach((mode) => {
      expect(ARCH_MODE_META[mode]).toBeDefined();
      expect(ARCH_MODE_META[mode].icon).toBeTruthy();
      expect(ARCH_MODE_META[mode].label).toBeTruthy();
      expect(ARCH_MODE_META[mode].description).toBeTruthy();
      expect(ARCH_MODE_META[mode].next).toBeTruthy();
    });

    // Traverse the cycle starting at 'hierarchical'
    const visited: ArchitectureLayoutMode[] = [];
    let current: ArchitectureLayoutMode = 'hierarchical';

    for (let i = 0; i < modes.length; i++) {
      visited.push(current);
      current = ARCH_MODE_META[current].next;
    }

    // Must return to start
    expect(current).toBe('hierarchical');

    // Must have visited every mode exactly once
    expect(visited.sort()).toEqual([...modes].sort());
  });
});
