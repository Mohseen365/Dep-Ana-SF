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

  return {
    ...baseDefaults,
    ...overrides,
  };
}

export function createMockGraphLayoutPatch(
  overrides?: Partial<GraphLayoutState>
): Partial<GraphLayoutState> {
  return {
    ...overrides,
  };
}
