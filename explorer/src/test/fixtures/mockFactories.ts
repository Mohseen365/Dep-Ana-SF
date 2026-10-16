import type { ExplorerSummary, ExplorerInventory } from '../../types/explorer';
import type { GraphLayoutState, LayoutProvenance } from '../../lib/projectState';

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
  const mode = overrides?.mode ?? 'interactive';
  const architectureMode = overrides?.architectureMode ?? 'hierarchical';
  const layoutProvenance =
    overrides?.layoutProvenance ??
    (`automatic-${architectureMode}` as LayoutProvenance);
  const nodePositions = overrides?.nodePositions ?? {};

  const layoutPositions = overrides?.layoutPositions ?? {
    [architectureMode]: nodePositions,
  };

  const layoutProvenances = overrides?.layoutProvenances ?? {
    [architectureMode]: layoutProvenance,
  };

  return {
    mode,
    architectureMode,
    layoutProvenance,
    nodePositions,
    layoutPositions,
    layoutProvenances,
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
