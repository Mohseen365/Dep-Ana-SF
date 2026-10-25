import { describe, it, expect } from 'vitest';
import {
  ARCH_MODE_META as ARCH_MODE_META_TYPE,
  ARCH_MODE_ORDER as ARCH_MODE_ORDER_TYPE,
  getNextArchMode as getNextArchModeType,
  ArchitectureLayoutMode,
} from '../explorer';
import {
  ARCH_MODE_META,
  ARCH_MODE_ORDER,
  getNextArchMode,
} from '../../lib/layout/arch-mode';

describe('ARCH_MODE_META & ARCH_MODE_ORDER Contract', () => {
  it('defines ARCH_MODE_ORDER containing all 4 architecture modes in cycle order', () => {
    expect(ARCH_MODE_ORDER).toEqual(['hierarchical', 'hybrid', 'orbit', 'constellation']);
  });

  it('provides getNextArchMode helper that cycles through ARCH_MODE_ORDER', () => {
    expect(getNextArchMode('hierarchical')).toBe('hybrid');
    expect(getNextArchMode('hybrid')).toBe('orbit');
    expect(getNextArchMode('orbit')).toBe('constellation');
    expect(getNextArchMode('constellation')).toBe('hierarchical');
    expect(getNextArchMode('unknown' as ArchitectureLayoutMode)).toBe('hierarchical');
  });

  it('forms a single closed cycle containing all 4 architecture modes via ARCH_MODE_META', () => {
    const modes: ArchitectureLayoutMode[] = ['hierarchical', 'hybrid', 'orbit', 'constellation'];

    // Verify all 4 modes are present in ARCH_MODE_META
    modes.forEach((mode) => {
      expect(ARCH_MODE_META[mode]).toBeDefined();
      expect(ARCH_MODE_META[mode].icon).toBeTruthy();
      expect(ARCH_MODE_META[mode].label).toBeTruthy();
      expect(ARCH_MODE_META[mode].description).toBeTruthy();
      expect(ARCH_MODE_META[mode].next).toBe(getNextArchMode(mode));
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

  it('preserves backward compatibility via re-exports from src/types/explorer', () => {
    expect(ARCH_MODE_META_TYPE).toBe(ARCH_MODE_META);
    expect(ARCH_MODE_ORDER_TYPE).toBe(ARCH_MODE_ORDER);
    expect(getNextArchModeType).toBe(getNextArchMode);
  });
});
