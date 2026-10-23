import type { ArchitectureLayoutMode } from '../../types/explorer';

export const ARCH_MODE_ORDER: readonly ArchitectureLayoutMode[] = [
  'hierarchical',
  'hybrid',
  'orbit',
  'constellation',
];

export function getNextArchMode(mode: ArchitectureLayoutMode): ArchitectureLayoutMode {
  const index = ARCH_MODE_ORDER.indexOf(mode);
  if (index === -1) {
    return ARCH_MODE_ORDER[0];
  }
  return ARCH_MODE_ORDER[(index + 1) % ARCH_MODE_ORDER.length];
}

export interface ArchModeMetaItem {
  icon: string;
  label: string;
  description: string;
  next: ArchitectureLayoutMode;
}

const ARCH_MODE_INFO: Record<ArchitectureLayoutMode, Omit<ArchModeMetaItem, 'next'>> = {
  hierarchical: {
    icon: '🏢',
    label: 'Hierarchical',
    description: 'Hierarchical Layout (Layered Flow)',
  },
  hybrid: {
    icon: '🧩',
    label: 'Hybrid',
    description: 'Hybrid Layout (Clustered Feature Regions)',
  },
  orbit: {
    icon: '🪐',
    label: 'Orbit',
    description: 'Architecture Orbit (Radial Concentric Bands)',
  },
  constellation: {
    icon: '🌌',
    label: 'Constellation',
    description: 'Component Constellation (Macro Component Canvas)',
  },
};

export const ARCH_MODE_META: Record<ArchitectureLayoutMode, ArchModeMetaItem> = Object.fromEntries(
  ARCH_MODE_ORDER.map((mode) => [
    mode,
    {
      ...ARCH_MODE_INFO[mode],
      next: getNextArchMode(mode),
    },
  ])
) as Record<ArchitectureLayoutMode, ArchModeMetaItem>;
