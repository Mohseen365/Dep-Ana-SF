import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { InvestigationProvider, useInvestigation } from '../context/InvestigationContext';
import { WorkspaceRouterProvider, useWorkspaceRouter } from '../context/WorkspaceRouterContext';
import { SelectionProvider, useSelection } from '../context/SelectionContext';
import { useGraphSelection } from '../hooks/useGraphSelection';
import { useViewState } from '../hooks/useViewState';
import {
  LENS_REGISTRY,
  SURFACE_REGISTRY,
  getAllWorkspaceModes,
} from '../registry/workspace-registry';
import { getDomainForViewMode, WorkspaceDomain } from '../lib/router/domain-mapping';

describe('Phase 2F-A Core Architecture, State & Navigation Hardening', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    localStorage.clear();
  });

  describe('1. Core State Authority Audit', () => {
    it('enforces single runtime authority for InvestigationContext state fields', () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <InvestigationProvider>{children}</InvestigationProvider>
      );

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      expect(result.current.state.selectedNodeId).toBeNull();
      expect(result.current.state.selectedEdgeId).toBeNull();
      expect(result.current.state.selectedFindingId).toBeNull();
      expect(result.current.state.focusState.enabled).toBe(false);
      expect(result.current.state.impactState.enabled).toBe(false);

      act(() => {
        result.current.selectNode('ApexClass:AccountService');
      });

      expect(result.current.state.selectedNodeId).toBe('ApexClass:AccountService');
      expect(result.current.state.drawerState.isOpen).toBe(true);
      expect(result.current.state.selectionHistory).toContain('ApexClass:AccountService');
      expect(result.current.state.recentNodeIds[0]).toBe('ApexClass:AccountService');
    });

    it('enforces single runtime authority for WorkspaceRouterContext activeViewMode & activeDomain', () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <WorkspaceRouterProvider initialViewMode="matrix">{children}</WorkspaceRouterProvider>
      );

      const { result } = renderHook(() => useWorkspaceRouter(), { wrapper });

      expect(result.current.activeViewMode).toBe('matrix');
      expect(result.current.activeDomain).toBe('feature');

      act(() => {
        result.current.setViewMode('radar');
      });

      expect(result.current.activeViewMode).toBe('radar');
      expect(result.current.activeDomain).toBe('local');

      act(() => {
        result.current.navigateToDomain('governance');
      });

      expect(result.current.activeViewMode).toBe('findings');
      expect(result.current.activeDomain).toBe('governance');
    });

    it('delegates useViewState investigation properties to InvestigationContext when present', () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <InvestigationProvider>
          <WorkspaceRouterProvider>{children}</WorkspaceRouterProvider>
        </InvestigationProvider>
      );

      const { result } = renderHook(
        () => ({
          inv: useInvestigation(),
          view: useViewState(),
        }),
        { wrapper }
      );

      expect(result.current.view.selectedNodeId).toBeNull();

      act(() => {
        result.current.inv.selectNode('ApexClass:OrderService');
      });

      // View state reflects InvestigationContext state without local state duplication
      expect(result.current.view.selectedNodeId).toBe('ApexClass:OrderService');

      act(() => {
        result.current.view.setSelectedFindingId('finding-123');
      });

      expect(result.current.inv.state.selectedFindingId).toBe('finding-123');
      expect(result.current.view.selectedFindingId).toBe('finding-123');
    });
  });

  describe('2. Workspace Router & Two-Registry Audit', () => {
    it('verifies 12 interactive lenses and 6 supporting surfaces combine to 18 exhaustive modes', () => {
      expect(Object.keys(LENS_REGISTRY)).toHaveLength(12);
      expect(Object.keys(SURFACE_REGISTRY)).toHaveLength(6);
      expect(getAllWorkspaceModes()).toHaveLength(18);
    });

    it('maps all 18 modes exactly once across the 5 canonical domains', () => {
      const allModes = getAllWorkspaceModes();
      const domainCounts: Record<WorkspaceDomain, number> = {
        portfolio: 0,
        topological: 0,
        feature: 0,
        local: 0,
        governance: 0,
      };

      allModes.forEach((mode) => {
        const domain = getDomainForViewMode(mode);
        domainCounts[domain]++;
      });

      expect(domainCounts.portfolio).toBe(3);   // dashboard, compare, history
      expect(domainCounts.topological).toBe(5); // graph, subway, constellation, tree, treemap
      expect(domainCounts.feature).toBe(4);     // matrix, heatmap, river, dna
      expect(domainCounts.local).toBe(3);       // profile, radar, four-direction
      expect(domainCounts.governance).toBe(3);  // findings, hotspots, diagnostics
    });
  });

  describe('3. Selection ≠ Navigation Neutrality Contract', () => {
    it('selecting a node in InvestigationContext does NOT alter the active workspace view mode', () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <InvestigationProvider>
          <WorkspaceRouterProvider initialViewMode="matrix">{children}</WorkspaceRouterProvider>
        </InvestigationProvider>
      );

      const { result } = renderHook(
        () => ({
          router: useWorkspaceRouter(),
          inv: useInvestigation(),
        }),
        { wrapper }
      );

      expect(result.current.router.activeViewMode).toBe('matrix');

      act(() => {
        result.current.inv.selectNode('ApexClass:AccountService');
      });

      // View mode remains matrix, selection updated in place
      expect(result.current.inv.state.selectedNodeId).toBe('ApexClass:AccountService');
      expect(result.current.router.activeViewMode).toBe('matrix');

      act(() => {
        result.current.inv.selectFinding('finding:high-coupling');
      });

      expect(result.current.router.activeViewMode).toBe('matrix');
    });

    it('explicit navigation via WorkspaceRouter.setViewMode changes active workspace view mode', () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <WorkspaceRouterProvider initialViewMode="matrix">{children}</WorkspaceRouterProvider>
      );

      const { result } = renderHook(() => useWorkspaceRouter(), { wrapper });

      expect(result.current.activeViewMode).toBe('matrix');

      act(() => {
        result.current.setViewMode('graph');
      });

      expect(result.current.activeViewMode).toBe('graph');
    });
  });

  describe('4. URL Synchronization & Browser History Semantics', () => {
    it('uses pushState on explicit view mode changes and replaceState on parameter updates', () => {
      const pushSpy = vi.spyOn(window.history, 'pushState');
      const replaceSpy = vi.spyOn(window.history, 'replaceState');

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <InvestigationProvider>
          <WorkspaceRouterProvider initialViewMode="graph">{children}</WorkspaceRouterProvider>
        </InvestigationProvider>
      );

      const { result } = renderHook(() => useViewState(), { wrapper });

      pushSpy.mockClear();
      replaceSpy.mockClear();

      // Parameter update (node selection)
      act(() => {
        result.current.setSelectedNodeId('ApexClass:Service');
      });

      expect(window.location.search).toContain('node=ApexClass%3AService');
      expect(replaceSpy).toHaveBeenCalled();

      // Explicit view mode change
      act(() => {
        result.current.setViewMode('radar');
      });

      expect(window.location.search).toContain('view=radar');
      expect(pushSpy).toHaveBeenCalled();

      pushSpy.mockRestore();
      replaceSpy.mockRestore();
    });

    it('hydrates 18-mode deep link parameters directly on mount', () => {
      window.history.replaceState(
        null,
        '',
        '/?view=four-direction&node=ApexClass:Hub&focus.enabled=true&focus.direction=dependencies&focus.depth=1'
      );

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <InvestigationProvider>
          <WorkspaceRouterProvider>{children}</WorkspaceRouterProvider>
        </InvestigationProvider>
      );

      const { result } = renderHook(() => useViewState(), { wrapper });

      expect(result.current.viewMode).toBe('four-direction');
      expect(result.current.selectedNodeId).toBe('ApexClass:Hub');
      expect(result.current.focusState.enabled).toBe(true);
      expect(result.current.focusState.direction).toBe('dependencies');
    });
  });

  describe('5. Project Boundary Isolation & Transient Context Reset', () => {
    it('resets transient investigation state on project change while retaining project-persistent state', () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <InvestigationProvider>
          <WorkspaceRouterProvider>{children}</WorkspaceRouterProvider>
        </InvestigationProvider>
      );

      const { result: invResult } = renderHook(() => useInvestigation(), { wrapper });

      act(() => {
        invResult.current.drillIntoComponent('ApexClass:ProjectA_Component');
        invResult.current.setFocus({ enabled: true, focusNodeId: 'ApexClass:ProjectA_Component' });
      });

      expect(invResult.current.state.selectedNodeId).toBe('ApexClass:ProjectA_Component');
      expect(invResult.current.state.drillPath).toHaveLength(1);

      // Simulate project switch event
      act(() => {
        window.dispatchEvent(
          new CustomEvent('explorer:project-changed', { detail: { projectId: 'project-b' } })
        );
      });

      // Transient investigation state is cleanly reset
      expect(invResult.current.state.selectedNodeId).toBeNull();
      expect(invResult.current.state.focusState.enabled).toBe(false);
      expect(invResult.current.state.drillPath).toHaveLength(0);
    });
  });

  describe('6. Compatibility Bridges', () => {
    it('useGraphSelection delegates to InvestigationContext when present', () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <InvestigationProvider>{children}</InvestigationProvider>
      );

      const { result } = renderHook(
        () => ({
          inv: useInvestigation(),
          graphSel: useGraphSelection(),
        }),
        { wrapper }
      );

      act(() => {
        result.current.graphSel.selectNode('ApexClass:BridgeTest');
      });

      expect(result.current.inv.state.selectedNodeId).toBe('ApexClass:BridgeTest');
      expect(result.current.graphSel.selectedNodeId).toBe('ApexClass:BridgeTest');
    });

    it('SelectionContext provides useGraphSelection value cleanly', () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <InvestigationProvider>
          <SelectionProvider>{children}</SelectionProvider>
        </InvestigationProvider>
      );

      const { result } = renderHook(
        () => ({
          sel: useSelection(),
          inv: useInvestigation(),
        }),
        { wrapper }
      );

      act(() => {
        result.current.sel.selectNode('ApexClass:SelectionContextTest');
      });

      expect(result.current.inv.state.selectedNodeId).toBe('ApexClass:SelectionContextTest');
      expect(result.current.sel.selectedNodeId).toBe('ApexClass:SelectionContextTest');
    });
  });
});
