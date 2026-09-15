import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDefaultProjectUIState,
  loadProjectState,
  saveProjectState,
  updateProjectState,
  clearProjectState,
  getAllSavedProjectIds,
  getProjectStorageKey,
  type ProjectUIState,
} from './projectState';

describe('Project-Scoped UI State Storage Manager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates default UI state with correct initial values for a given project ID', () => {
    const state = createDefaultProjectUIState('proj-alpha');

    expect(getProjectStorageKey('proj-alpha')).toBe('explorer.projectState.proj-alpha');
    expect(state.projectId).toBe('proj-alpha');
    expect(state.selectedComponent).toEqual({
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedInvestigationId: null,
    });
    expect(state.filters.searchQuery).toBe('');
    expect(state.graphLayout.layoutName).toBe('cola');
    expect(state.zoom).toEqual({ zoom: 1.0, pan: { x: 0, y: 0 } });
    expect(state.sidebarState.collapsed).toBe(false);
    expect(state.inspectorState.pinned).toBe(false);
    expect(state.navigatorState.visible).toBe(true);
    expect(state.analysisView.viewMode).toBe('graph');
    expect(state.comparisonState.isActive).toBe(false);
  });

  it('loads default state when no state is saved in localStorage', () => {
    const state = loadProjectState('proj-alpha');
    expect(state.projectId).toBe('proj-alpha');
    expect(state.zoom.zoom).toBe(1.0);
  });

  it('saves and loads project state from localStorage', () => {
    const customState: ProjectUIState = {
      ...createDefaultProjectUIState('proj-alpha'),
      zoom: { zoom: 0.8, pan: { x: 10, y: 20 } },
      sidebarState: { collapsed: true, activeTab: 'components', searchQuery: 'Account' },
      filters: {
        searchQuery: 'Account',
        typeFilter: 'ApexClass',
        riskFilter: 'HIGH',
        hasCallouts: true,
        withoutSharing: false,
        hideTests: true,
        hasAsyncPatterns: false,
      },
    };

    saveProjectState('proj-alpha', customState);

    const loaded = loadProjectState('proj-alpha');
    expect(loaded.projectId).toBe('proj-alpha');
    expect(loaded.zoom.zoom).toBe(0.8);
    expect(loaded.sidebarState.collapsed).toBe(true);
    expect(loaded.filters.riskFilter).toBe('HIGH');
  });

  it('STRICT ISOLATION REQUIREMENT: Project A state must never overwrite Project B state', () => {
    const projA = 'project-a';
    const projB = 'project-b';

    // Configure Project A: sidebar collapsed, zoom 80%
    updateProjectState(projA, {
      sidebarState: { collapsed: true, activeTab: 'all', searchQuery: '' },
      zoom: { zoom: 0.8, pan: { x: -50, y: -50 } },
    });

    // Configure Project B: sidebar expanded, zoom 120%
    updateProjectState(projB, {
      sidebarState: { collapsed: false, activeTab: 'all', searchQuery: '' },
      zoom: { zoom: 1.2, pan: { x: 100, y: 100 } },
    });

    // Load states independently
    const loadedA = loadProjectState(projA);
    const loadedB = loadProjectState(projB);

    // Verify Project A state
    expect(loadedA.projectId).toBe(projA);
    expect(loadedA.sidebarState.collapsed).toBe(true);
    expect(loadedA.zoom.zoom).toBe(0.8);
    expect(loadedA.zoom.pan).toEqual({ x: -50, y: -50 });

    // Verify Project B state
    expect(loadedB.projectId).toBe(projB);
    expect(loadedB.sidebarState.collapsed).toBe(false);
    expect(loadedB.zoom.zoom).toBe(1.2);
    expect(loadedB.zoom.pan).toEqual({ x: 100, y: 100 });

    // Modifying Project A again must not affect Project B
    updateProjectState(projA, {
      zoom: { zoom: 0.5, pan: { x: 0, y: 0 } },
    });

    const reloadedB = loadProjectState(projB);
    expect(reloadedB.zoom.zoom).toBe(1.2);
  });

  it('proves isolation across all 9 required state dimensions', () => {
    const proj1 = 'org-crm';
    const proj2 = 'org-billing';

    // Set complete distinct states for proj1
    updateProjectState(proj1, {
      selectedComponent: {
        selectedNodeId: 'ApexClass:AccountController',
        selectedEdgeId: 'Edge:1',
        selectedInvestigationId: 'inv-123',
      },
      filters: {
        searchQuery: 'Account',
        typeFilter: 'ApexClass',
        riskFilter: 'HIGH',
        hasCallouts: true,
        withoutSharing: true,
        hideTests: true,
        hasAsyncPatterns: false,
      },
      graphLayout: {
        layoutName: 'concentric',
        nodePositions: { 'node-1': { x: 10, y: 20 } },
      },
      zoom: { zoom: 0.75, pan: { x: 5, y: 10 } },
      sidebarState: { collapsed: true, activeTab: 'favorites', searchQuery: 'Account' },
      inspectorState: { pinned: true, detached: true, activeTab: 'metrics' },
      navigatorState: { visible: false, collapsed: true },
      analysisView: {
        viewMode: 'findings',
        diagnosticsTab: 'cycles',
        selectedFindingId: 'f-1',
        selectedCycleId: 'c-1',
        selectedUnresolvedEdgeId: null,
      },
      comparisonState: {
        isActive: true,
        beforeRaw: '{"ver": 1}',
        afterRaw: '{"ver": 2}',
        focusedEntityId: 'ent-1',
      },
    });

    // Set complete distinct states for proj2
    updateProjectState(proj2, {
      selectedComponent: {
        selectedNodeId: 'ApexTrigger:InvoiceTrigger',
        selectedEdgeId: 'Edge:99',
        selectedInvestigationId: 'inv-456',
      },
      filters: {
        searchQuery: 'Invoice',
        typeFilter: 'ApexTrigger',
        riskFilter: 'MEDIUM',
        hasCallouts: false,
        withoutSharing: false,
        hideTests: false,
        hasAsyncPatterns: true,
      },
      graphLayout: {
        layoutName: 'dagre',
        nodePositions: { 'node-2': { x: 100, y: 200 } },
      },
      zoom: { zoom: 1.5, pan: { x: 30, y: 40 } },
      sidebarState: { collapsed: false, activeTab: 'all', searchQuery: 'Invoice' },
      inspectorState: { pinned: false, detached: false, activeTab: 'dependencies' },
      navigatorState: { visible: true, collapsed: false },
      analysisView: {
        viewMode: 'hotspots',
        diagnosticsTab: 'unresolved',
        selectedFindingId: null,
        selectedCycleId: null,
        selectedUnresolvedEdgeId: 'u-1',
      },
      comparisonState: {
        isActive: false,
        beforeRaw: '',
        afterRaw: '',
        focusedEntityId: null,
      },
    });

    const s1 = loadProjectState(proj1);
    const s2 = loadProjectState(proj2);

    // Dimension 1: Selected Component
    expect(s1.selectedComponent.selectedNodeId).toBe('ApexClass:AccountController');
    expect(s2.selectedComponent.selectedNodeId).toBe('ApexTrigger:InvoiceTrigger');

    // Dimension 2: Filters
    expect(s1.filters.searchQuery).toBe('Account');
    expect(s2.filters.searchQuery).toBe('Invoice');

    // Dimension 3: Graph Layout
    expect(s1.graphLayout.layoutName).toBe('concentric');
    expect(s2.graphLayout.layoutName).toBe('dagre');

    // Dimension 4: Zoom & Pan
    expect(s1.zoom.zoom).toBe(0.75);
    expect(s2.zoom.zoom).toBe(1.5);

    // Dimension 5: Sidebar State
    expect(s1.sidebarState.collapsed).toBe(true);
    expect(s2.sidebarState.collapsed).toBe(false);

    // Dimension 6: Inspector State
    expect(s1.inspectorState.pinned).toBe(true);
    expect(s2.inspectorState.pinned).toBe(false);

    // Dimension 7: Navigator State
    expect(s1.navigatorState.visible).toBe(false);
    expect(s2.navigatorState.visible).toBe(true);

    // Dimension 8: Analysis View
    expect(s1.analysisView.viewMode).toBe('findings');
    expect(s2.analysisView.viewMode).toBe('hotspots');

    // Dimension 9: Comparison State
    expect(s1.comparisonState.isActive).toBe(true);
    expect(s2.comparisonState.isActive).toBe(false);
  });

  it('clears state and lists saved project IDs', () => {
    updateProjectState('proj-x', { zoom: { zoom: 1.1, pan: { x: 0, y: 0 } } });
    updateProjectState('proj-y', { zoom: { zoom: 1.2, pan: { x: 0, y: 0 } } });

    const ids = getAllSavedProjectIds();
    expect(ids).toContain('proj-x');
    expect(ids).toContain('proj-y');

    clearProjectState('proj-x');
    const idsAfter = getAllSavedProjectIds();
    expect(idsAfter).not.toContain('proj-x');
    expect(idsAfter).toContain('proj-y');
  });
});
