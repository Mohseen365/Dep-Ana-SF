import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchFilterState, createEmptyFilterState } from '../lib/search-filter';
import { FocusState, createEmptyFocusState } from '../lib/focus-graph';
import { ImpactState, createEmptyImpactState } from '../lib/impact-analysis';
import { useWorkspaceRouter } from '../context/WorkspaceRouterContext';
import { WorkspaceViewMode } from '../lib/projectState';
import {
  filterQuery,
  focusQuery,
  impactQuery,
  findingsQuery,
  connectionQuery,
  investigationQuery,
  ConnectionQueryState,
} from '../lib/url';

function useWorkspaceRouterSafe() {
  try {
    return useWorkspaceRouter();
  } catch (_) {
    return null;
  }
}

export function useViewState() {
  const router = useWorkspaceRouterSafe();
  const [localViewMode, setLocalViewMode] = useState<WorkspaceViewMode>('graph');

  const activeViewMode: WorkspaceViewMode = router ? router.activeViewMode : localViewMode;

  const setViewMode = useCallback(
    (mode: WorkspaceViewMode) => {
      if (router) {
        router.setViewMode(mode);
      } else {
        setLocalViewMode(mode);
      }
    },
    [router]
  );
  const [filterState, setFilterState] = useState<SearchFilterState>(createEmptyFilterState);
  const [focusState, setFocusState] = useState<FocusState>(createEmptyFocusState);
  const [impactState, setImpactState] = useState<ImpactState>(createEmptyImpactState);
  const [connectionState, setConnectionState] = useState<ConnectionQueryState>({
    direction: 'both',
    depth: 2,
  });
  const [diagnosticsTab, setDiagnosticsTab] = useState<'cycles' | 'unresolved' | 'none'>('none');
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [selectedUnresolvedEdgeId, setSelectedUnresolvedEdgeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | null>(null);
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [urlNodeId, setUrlNodeId] = useState<string | null>(null);
  const [urlEdgeId, setUrlEdgeId] = useState<string | null>(null);

  const isInitialMountRef = useRef(true);
  const prevViewModeRef = useRef<WorkspaceViewMode>(activeViewMode);

  const readStateFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    const initialNode = params.get('node') || params.get('component');
    if (initialNode) {
      setUrlNodeId(initialNode);
      setSelectedNodeId(initialNode);
    } else {
      setUrlNodeId(null);
      setSelectedNodeId(null);
    }

    const initialEdge = params.get('edge');
    if (initialEdge) {
      setUrlEdgeId(initialEdge);
    } else {
      setUrlEdgeId(null);
    }

    const filterParsed = filterQuery.fromQuery(params);
    if (router) {
      router.setViewMode(filterParsed.viewMode);
    } else {
      setLocalViewMode(filterParsed.viewMode);
    }
    setFilterState(filterParsed.filterState);

    const focusParsed = focusQuery.fromQuery(params, initialNode);
    setFocusState(focusParsed);

    const impactParsed = impactQuery.fromQuery(params, initialNode);
    setImpactState(impactParsed);

    const connParsed = connectionQuery.fromQuery(params);
    setConnectionState(connParsed);

    const findingsParsed = findingsQuery.fromQuery(params);
    setDiagnosticsTab(findingsParsed.diagnosticsTab);
    setSelectedCycleId(findingsParsed.selectedCycleId);
    setSelectedUnresolvedEdgeId(findingsParsed.selectedUnresolvedEdgeId);
    setSelectedFindingId(findingsParsed.selectedFindingId);

    const invParsed = investigationQuery.fromQuery(params);
    setSelectedInvestigationId(invParsed.selectedInvestigationId);

    setIsInvestigating(params.get('investigate') === 'true');
  }, []);

  // Read initial values from URL on mount
  useEffect(() => {
    readStateFromUrl();

    const handlePopState = () => {
      readStateFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [readStateFromUrl]);

  // Reset view state completely on project switch to enforce project isolation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleProjectChanged = () => {
      setSelectedNodeId(null);
      setSelectedFindingId(null);
      setSelectedCycleId(null);
      setSelectedUnresolvedEdgeId(null);
      setSelectedInvestigationId(null);
      setIsInvestigating(false);
      setUrlNodeId(null);
      setUrlEdgeId(null);
      setFilterState(createEmptyFilterState());
      setFocusState(createEmptyFocusState());
      setImpactState(createEmptyImpactState());
      setConnectionState({ direction: 'both', depth: 2 });
      setDiagnosticsTab('none');
    };

    window.addEventListener('explorer:project-changed', handleProjectChanged);
    return () => {
      window.removeEventListener('explorer:project-changed', handleProjectChanged);
    };
  }, []);

  // Sync state to URL search params
  const syncToUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevViewModeRef.current = activeViewMode;
      return;
    }

    const params = new URLSearchParams();

    const effectiveNode = selectedNodeId || focusState.focusNodeId || impactState.originNodeId;
    if (effectiveNode) {
      params.set('node', effectiveNode);
    }

    if (isInvestigating) {
      params.set('investigate', 'true');
    }

    if (focusState.enabled) {
      focusQuery.toQuery(focusState, params);
    }

    if (impactState.enabled) {
      impactQuery.toQuery(impactState, params);
    }

    if (diagnosticsTab !== 'none' || selectedFindingId !== null) {
      findingsQuery.toQuery(
        {
          diagnosticsTab,
          selectedCycleId,
          selectedUnresolvedEdgeId,
          selectedFindingId,
        },
        params,
      );
    }

    if (connectionState.direction !== 'both' || connectionState.depth !== 2) {
      connectionQuery.toQuery(connectionState, params);
    }

    if (selectedInvestigationId !== null) {
      investigationQuery.toQuery(
        {
          selectedInvestigationId,
          investigationStatus: null,
        },
        params,
      );
    }

    const isFilterActive =
      filterState.searchQuery !== '' ||
      filterState.typeFilter !== '' ||
      filterState.riskFilter !== '' ||
      filterState.hasCallouts ||
      filterState.withoutSharing ||
      filterState.hideTests ||
      filterState.hasAsyncPatterns;

    if (activeViewMode !== 'graph' || isFilterActive) {
      filterQuery.toQuery({ viewMode: activeViewMode, filterState }, params);
    }

    const searchString = params.toString() ? `?${params.toString()}` : '';
    const newUrl = `${window.location.pathname}${searchString}`;
    if (window.location.search !== searchString) {
      if (prevViewModeRef.current !== activeViewMode) {
        window.history.pushState(null, '', newUrl);
        prevViewModeRef.current = activeViewMode;
      } else {
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [
    activeViewMode,
    filterState,
    focusState,
    connectionState,
    impactState,
    diagnosticsTab,
    selectedCycleId,
    selectedUnresolvedEdgeId,
    selectedNodeId,
    selectedFindingId,
    selectedInvestigationId,
    isInvestigating,
  ]);

  useEffect(() => {
    syncToUrl();
  }, [syncToUrl]);

  return {
    viewMode: activeViewMode,
    setViewMode,
    filterState,
    setFilterState,
    focusState,
    setFocusState,
    impactState,
    setImpactState,
    connectionState,
    setConnectionState,
    diagnosticsTab,
    setDiagnosticsTab,
    selectedCycleId,
    setSelectedCycleId,
    selectedUnresolvedEdgeId,
    setSelectedUnresolvedEdgeId,
    selectedNodeId,
    setSelectedNodeId,
    selectedFindingId,
    setSelectedFindingId,
    selectedInvestigationId,
    setSelectedInvestigationId,
    isInvestigating,
    setIsInvestigating,
    urlNodeId,
    urlEdgeId,
  };
}
