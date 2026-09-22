/**
 * Project-Scoped UI State Storage Manager & Data Contract
 *
 * Provides deterministic, project-isolated state persistence and restoration.
 * Guarantees that state for Project A (e.g., sidebar collapsed, zoom 80%)
 * never pollutes or overwrites state for Project B (e.g., sidebar expanded, zoom 120%).
 */

import { ExplorerNodeType, ALL_EXPLORER_NODE_TYPES, ArchitectureLayoutMode } from '../types/explorer';

export interface SelectedComponentState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedInvestigationId: string | null;
}

export interface FilterUIState {
  searchQuery: string;
  typeFilter: string;
  riskFilter: string;
  hasCallouts: boolean;
  withoutSharing: boolean;
  hideTests: boolean;
  hasAsyncPatterns: boolean;
  customTags?: string[];
  visibleNodeTypes?: ExplorerNodeType[];
}

export type GraphInteractionMode = 'interactive' | 'static';

export type LayoutProvenance = 'automatic-hierarchical' | 'automatic-hybrid' | 'user-authored';

export interface GraphLayoutState {
  layoutName: string; // e.g. 'cola' | 'cose' | 'grid' | 'concentric' | 'dagre'
  mode: GraphInteractionMode;
  architectureMode?: ArchitectureLayoutMode;
  layoutProvenance?: LayoutProvenance;
  nodePositions: Record<string, { x: number; y: number }>;
  layoutVersion?: string | number;
}

export interface ZoomPanState {
  zoom: number; // e.g. 0.8 (80%), 1.0 (100%), 1.2 (120%)
  pan: { x: number; y: number };
}

export interface SidebarUIState {
  collapsed: boolean;
  activeTab?: string;
  searchQuery?: string;
}

export interface InspectorUIState {
  pinned: boolean;
  detached: boolean;
  activeTab?: string;
}

export interface NavigatorUIState {
  visible: boolean;
  collapsed?: boolean;
}

export type AnalysisViewMode = 'graph' | 'findings' | 'hotspots' | 'diagnostics' | 'compare' | 'dashboard';

export interface AnalysisViewUIState {
  viewMode: AnalysisViewMode;
  diagnosticsTab: 'cycles' | 'unresolved' | 'none';
  selectedFindingId: string | null;
  selectedCycleId: string | null;
  selectedUnresolvedEdgeId: string | null;
}

export interface ComparisonUIState {
  isActive: boolean;
  beforeRaw: string;
  afterRaw: string;
  focusedEntityId: string | null;
}

export interface ProjectUIState {
  projectId: string;
  selectedComponent: SelectedComponentState;
  filters: FilterUIState;
  graphLayout: GraphLayoutState;
  zoom: ZoomPanState;
  sidebarState: SidebarUIState;
  inspectorState: InspectorUIState;
  navigatorState: NavigatorUIState;
  analysisView: AnalysisViewUIState;
  comparisonState: ComparisonUIState;
  updatedAt: string;
}

const STORAGE_PREFIX = 'explorer.projectState.';
const inMemoryStateMap = new Map<string, string>();

function getStoredItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (_) {
    // Fallback to memory map if window.localStorage throws
  }
  return inMemoryStateMap.get(key) || null;
}

function setStoredItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (_) {
    // Fallback to memory map
  }
  inMemoryStateMap.set(key, value);
}

function removeStoredItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (_) {
    // Fallback to memory map
  }
  inMemoryStateMap.delete(key);
}

/**
 * Creates default UI state for a given project ID.
 */
export function createDefaultProjectUIState(projectId: string): ProjectUIState {
  return {
    projectId,
    selectedComponent: {
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedInvestigationId: null,
    },
    filters: {
      searchQuery: '',
      typeFilter: '',
      riskFilter: '',
      hasCallouts: false,
      withoutSharing: false,
      hideTests: false,
      hasAsyncPatterns: false,
      customTags: [],
      visibleNodeTypes: [...ALL_EXPLORER_NODE_TYPES],
    },
    graphLayout: {
      layoutName: 'cola',
      mode: 'interactive',
      architectureMode: 'hierarchical',
      layoutProvenance: 'automatic-hierarchical',
      nodePositions: {},
    },
    zoom: {
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    },
    sidebarState: {
      collapsed: false,
      activeTab: 'all',
      searchQuery: '',
    },
    inspectorState: {
      pinned: false,
      detached: false,
      activeTab: 'overview',
    },
    navigatorState: {
      visible: true,
      collapsed: false,
    },
    analysisView: {
      viewMode: 'graph',
      diagnosticsTab: 'none',
      selectedFindingId: null,
      selectedCycleId: null,
      selectedUnresolvedEdgeId: null,
    },
    comparisonState: {
      isActive: false,
      beforeRaw: '',
      afterRaw: '',
      focusedEntityId: null,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Derives localStorage key for a specific project.
 */
export function getProjectStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

/**
 * Loads project-scoped state from localStorage for a specific project ID.
 * Falls back to default project UI state if no stored state exists or on parse error.
 */
export function loadProjectState(projectId: string): ProjectUIState {
  if (!projectId) {
    return createDefaultProjectUIState('default');
  }

  try {
    const raw = getStoredItem(getProjectStorageKey(projectId));
    if (!raw) {
      return createDefaultProjectUIState(projectId);
    }
    const parsed = JSON.parse(raw);
    return mergeWithDefaultState(projectId, parsed);
  } catch (_) {
    return createDefaultProjectUIState(projectId);
  }
}

/**
 * Merges loaded JSON object with default project state to handle partial state updates or schema evolution.
 */
export function mergeWithDefaultState(projectId: string, loaded: Partial<ProjectUIState>): ProjectUIState {
  const defaults = createDefaultProjectUIState(projectId);
  if (!loaded || typeof loaded !== 'object') {
    return defaults;
  }

  return {
    projectId,
    selectedComponent: {
      ...defaults.selectedComponent,
      ...(loaded.selectedComponent || {}),
    },
    filters: {
      ...defaults.filters,
      ...(loaded.filters || {}),
      visibleNodeTypes: Array.isArray(loaded.filters?.visibleNodeTypes)
        ? loaded.filters.visibleNodeTypes
        : defaults.filters.visibleNodeTypes,
    },
    graphLayout: {
      layoutName: loaded.graphLayout?.layoutName || defaults.graphLayout.layoutName,
      mode: ((loaded.graphLayout as any)?.mode === 'static' || (loaded.graphLayout as any)?.layoutMode === 'static') ? 'static' : 'interactive',
      architectureMode: (loaded.graphLayout as any)?.architectureMode === 'hybrid' ? 'hybrid' : 'hierarchical',
      layoutProvenance: (loaded.graphLayout as any)?.layoutProvenance ||
        ((loaded.graphLayout as any)?.architectureMode === 'hybrid' ? 'automatic-hybrid' : 'automatic-hierarchical'),
      nodePositions: (loaded.graphLayout && typeof loaded.graphLayout.nodePositions === 'object' && loaded.graphLayout.nodePositions !== null)
        ? loaded.graphLayout.nodePositions
        : defaults.graphLayout.nodePositions,
      ...(loaded.graphLayout?.layoutVersion !== undefined ? { layoutVersion: loaded.graphLayout.layoutVersion } : {}),
    },
    zoom: {
      ...defaults.zoom,
      ...(loaded.zoom || {}),
    },
    sidebarState: {
      ...defaults.sidebarState,
      ...(loaded.sidebarState || {}),
    },
    inspectorState: {
      ...defaults.inspectorState,
      ...(loaded.inspectorState || {}),
    },
    navigatorState: {
      ...defaults.navigatorState,
      ...(loaded.navigatorState || {}),
    },
    analysisView: {
      ...defaults.analysisView,
      ...(loaded.analysisView || {}),
    },
    comparisonState: {
      ...defaults.comparisonState,
      ...(loaded.comparisonState || {}),
    },
    updatedAt: loaded.updatedAt || defaults.updatedAt,
  };
}

/**
 * Saves project-scoped UI state to localStorage.
 */
export function saveProjectState(projectId: string, state: ProjectUIState): void {
  if (!projectId) return;

  try {
    const key = getProjectStorageKey(projectId);
    const toSave: ProjectUIState = {
      ...state,
      projectId,
      updatedAt: new Date().toISOString(),
    };
    setStoredItem(key, JSON.stringify(toSave));
  } catch (_) {
    // Ignore storage quota errors
  }
}

/**
 * Updates a slice of project-scoped UI state and saves it atomically.
 */
export function updateProjectState(
  projectId: string,
  update: Partial<ProjectUIState>
): ProjectUIState {
  const current = loadProjectState(projectId);
  const updated = mergeWithDefaultState(projectId, {
    ...current,
    ...update,
  });
  saveProjectState(projectId, updated);
  return updated;
}

/**
 * Clears saved UI state for a given project ID.
 */
export function clearProjectState(projectId: string): void {
  if (!projectId) return;

  try {
    removeStoredItem(getProjectStorageKey(projectId));
  } catch (_) {
    // Ignore
  }
}

/**
 * Lists all project IDs that currently have saved state in localStorage or in-memory fallback.
 */
export function getAllSavedProjectIds(): string[] {
  const result = new Set<string>();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          result.add(key.substring(STORAGE_PREFIX.length));
        }
      }
    }
  } catch (_) {
    // Ignore
  }

  for (const key of inMemoryStateMap.keys()) {
    if (key.startsWith(STORAGE_PREFIX)) {
      result.add(key.substring(STORAGE_PREFIX.length));
    }
  }

  return Array.from(result);
}
