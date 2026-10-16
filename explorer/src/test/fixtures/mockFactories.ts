import type { ExplorerSummary, ExplorerInventory } from '../../types/explorer';
import type { GraphLayoutState } from '../../lib/projectState';

export function createMockInventory(
  overrides?: Partial<ExplorerInventory>
): ExplorerInventory {
  return {
    files: 10,
    apexClasses: 5,
    apexTriggers: 2,
    lwcJs: 3,
    lwcHtml: 0,
    visualforce: 0,
    flows: 0,
    objects: 0,
    fields: 0,
    ...overrides,
  };
}

export function createMockSummary(
  overrides?: Partial<ExplorerSummary>
): ExplorerSummary {
  const { inventory: inventoryOverrides, ...restOverrides } = overrides || {};
  return {
    nodeCount: 10,
    edgeCount: 15,
    highRiskCount: 1,
    mediumRiskCount: 2,
    lowRiskCount: 7,
    cycleCount: 0,
    unresolvedCount: 0,
    ...restOverrides,
    inventory: createMockInventory(inventoryOverrides),
  };
}

export function createMockGraphLayoutState(
  overrides?: Partial<GraphLayoutState>
): GraphLayoutState {
  const hasOverrides = overrides !== undefined && Object.keys(overrides).length > 0;

  const baseDefaults: GraphLayoutState = {
    mode: 'interactive',
    architectureMode: 'hierarchical',
    layoutProvenance: 'automatic-hierarchical',
    nodePositions: {},
    layoutPositions: {
      hierarchical: {},
      hybrid: {},
      orbit: {},
      constellation: {},
    },
    layoutProvenances: {
      hierarchical: 'automatic-hierarchical',
      hybrid: 'automatic-hybrid',
      orbit: 'automatic-orbit',
      constellation: 'automatic-constellation',
    },
  };

  if (!hasOverrides) {
    return baseDefaults;
  }

  return {
    mode: overrides.mode ?? 'interactive',
    ...(overrides.architectureMode !== undefined ? { architectureMode: overrides.architectureMode } : {}),
    ...(overrides.layoutProvenance !== undefined ? { layoutProvenance: overrides.layoutProvenance } : {}),
    ...(overrides.nodePositions !== undefined ? { nodePositions: overrides.nodePositions } : {}),
    ...(overrides.layoutPositions !== undefined ? { layoutPositions: overrides.layoutPositions } : {}),
    ...(overrides.layoutProvenances !== undefined ? { layoutProvenances: overrides.layoutProvenances } : {}),
    ...(overrides.layoutName !== undefined ? { layoutName: overrides.layoutName } : {}),
    ...(overrides.layoutVersion !== undefined ? { layoutVersion: overrides.layoutVersion } : {}),
  } as GraphLayoutState;
}
