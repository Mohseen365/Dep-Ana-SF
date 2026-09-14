import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewState } from './useViewState';

describe('useViewState', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('handles empty URL state with safe default values', () => {
    const { result } = renderHook(() => useViewState());

    expect(result.current.viewMode).toBe('graph');
    expect(result.current.selectedNodeId).toBeNull();
    expect(result.current.urlNodeId).toBeNull();
    expect(result.current.selectedFindingId).toBeNull();
    expect(result.current.connectionState).toEqual({ direction: 'both', depth: 2 });
    expect(result.current.focusState.enabled).toBe(false);
    expect(result.current.impactState.enabled).toBe(false);
    expect(result.current.diagnosticsTab).toBe('none');
    expect(result.current.selectedInvestigationId).toBeNull();
    expect(window.location.search).toBe('');
  });

  it('reads initial state from URL search parameters including filter, focus, impact, diag, and selected node/finding', () => {
    window.history.replaceState(
      null,
      '',
      '/?filter.q=Controller&filter.type=ApexClass&filter.risk=HIGH&focus.enabled=true&focus.direction=dependents&focus.depth=2&impact.enabled=true&impact.depth=3&diag.tab=unresolved&diag.cycle=cycle-1&diag.unresolved=edge-5&node=ApexClass:Test&finding=finding:cycle:cycle-1&investigation=inv-123'
    );

    const { result } = renderHook(() => useViewState());

    expect(result.current.filterState.searchQuery).toBe('Controller');
    expect(result.current.filterState.typeFilter).toBe('ApexClass');
    expect(result.current.filterState.riskFilter).toBe('HIGH');
    expect(result.current.focusState.enabled).toBe(true);
    expect(result.current.focusState.direction).toBe('dependents');
    expect(result.current.focusState.depth).toBe(2);
    expect(result.current.impactState.enabled).toBe(true);
    expect(result.current.impactState.depth).toBe(3);
    expect(result.current.diagnosticsTab).toBe('unresolved');
    expect(result.current.selectedCycleId).toBe('cycle-1');
    expect(result.current.selectedUnresolvedEdgeId).toBe('edge-5');
    expect(result.current.urlNodeId).toBe('ApexClass:Test');
    expect(result.current.selectedNodeId).toBe('ApexClass:Test');
    expect(result.current.selectedFindingId).toBe('finding:cycle:cycle-1');
    expect(result.current.selectedInvestigationId).toBe('inv-123');
  });

  it('reuses selected node parameter without generating duplicate node keys', () => {
    const { result } = renderHook(() => useViewState());

    act(() => {
      result.current.setSelectedNodeId('ApexClass:AssetService');
      result.current.setFocusState({
        enabled: true,
        focusNodeId: 'ApexClass:AssetService',
        direction: 'dependencies',
        depth: 1,
      });
      result.current.setImpactState({
        enabled: true,
        originNodeId: 'ApexClass:AssetService',
        depth: 'ALL',
      });
    });

    const search = window.location.search;
    expect(search).toContain('node=ApexClass%3AAssetService');
    expect(search).not.toContain('focus.node');
    expect(search).not.toContain('impact.node');
  });

  it('supports depth ALL and 1/2/3 values for focus and impact', () => {
    const { result } = renderHook(() => useViewState());

    act(() => {
      result.current.setSelectedNodeId('ApexClass:Hub');
      result.current.setFocusState({
        enabled: true,
        focusNodeId: 'ApexClass:Hub',
        direction: 'both',
        depth: 'ALL',
      });
      result.current.setImpactState({
        enabled: true,
        originNodeId: 'ApexClass:Hub',
        depth: 1,
      });
    });

    const search = window.location.search;
    expect(search).toContain('focus.depth=ALL');
    expect(search).toContain('impact.depth=1');
  });

  it('supports connection direction dependencies/dependents/both and custom depth', () => {
    const { result } = renderHook(() => useViewState());

    act(() => {
      result.current.setConnectionState({ direction: 'dependencies', depth: 3 });
    });

    const search = window.location.search;
    expect(search).toContain('conn.direction=dependencies');
    expect(search).toContain('conn.depth=3');
  });

  it('safely falls back for invalid query values and old URL parameters', () => {
    window.history.replaceState(
      null,
      '',
      '/?filter.type=INVALID_TYPE&filter.risk=UNKNOWN&focus.enabled=true&focus.direction=INVALID_DIR&focus.depth=INVALID_DEPTH&viewMode=findings&node=ApexClass:OldNode'
    );

    const { result } = renderHook(() => useViewState());

    expect(result.current.viewMode).toBe('findings');
    expect(result.current.filterState.typeFilter).toBe('');
    expect(result.current.filterState.riskFilter).toBe('');
    expect(result.current.focusState.direction).toBe('both');
    expect(result.current.focusState.depth).toBe(2);
    expect(result.current.selectedNodeId).toBe('ApexClass:OldNode');
  });

  it('handles browser back/forward navigation popstate events cleanly', () => {
    const { result } = renderHook(() => useViewState());

    expect(result.current.selectedNodeId).toBeNull();

    act(() => {
      window.history.replaceState(null, '', '/?node=ApexClass:NavigatedNode&finding=finding:123');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.selectedNodeId).toBe('ApexClass:NavigatedNode');
    expect(result.current.selectedFindingId).toBe('finding:123');
  });

  it('round-trips complex combined state to query string and back', () => {
    const { result } = renderHook(() => useViewState());

    act(() => {
      result.current.setViewMode('findings');
      result.current.setSelectedNodeId('ApexClass:TargetService');
      result.current.setSelectedFindingId('finding:shared-state:1');
      result.current.setFilterState({
        searchQuery: 'Order',
        typeFilter: 'Flow',
        riskFilter: 'HIGH',
        hasCallouts: true,
        withoutSharing: false,
        hideTests: true,
        hasAsyncPatterns: false,
      });
      result.current.setDiagnosticsTab('cycles');
      result.current.setSelectedCycleId('cycle-7');
      result.current.setSelectedInvestigationId('inv-999');
    });

    const search = window.location.search;
    expect(search).toContain('view.mode=findings');
    expect(search).toContain('node=ApexClass%3ATargetService');
    expect(search).toContain('finding=finding%3Ashared-state%3A1');
    expect(search).toContain('filter.q=Order');
    expect(search).toContain('filter.type=Flow');
    expect(search).toContain('filter.risk=HIGH');
    expect(search).toContain('filter.hasCallouts=true');
    expect(search).toContain('filter.hideTests=true');
    expect(search).toContain('diag.tab=cycles');
    expect(search).toContain('diag.cycle=cycle-7');
    expect(search).toContain('investigation=inv-999');
  });
});
