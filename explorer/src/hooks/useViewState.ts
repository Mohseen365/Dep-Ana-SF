import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchFilterState, createEmptyFilterState } from '../lib/search-filter';
import { FocusState, createEmptyFocusState } from '../lib/focus-graph';
import { ImpactState, createEmptyImpactState } from '../lib/impact-analysis';
import {
  filterQuery,
  focusQuery,
  impactQuery,
  findingsQuery,
  connectionQuery,
  investigationQuery,
  ConnectionQueryState,
} from '../lib/url';

export function useViewState() {
  const [viewMode, setViewMode] = useState<'graph' | 'findings'>('graph');
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
    setViewMode(filterParsed.viewMode);
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

  // Sync state to URL search params
  const syncToUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
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

    if (viewMode !== 'graph' || isFilterActive) {
      filterQuery.toQuery({ viewMode, filterState }, params);
    }

    const searchString = params.toString() ? `?${params.toString()}` : '';
    const newUrl = `${window.location.pathname}${searchString}`;
    if (window.location.search !== searchString) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [
    viewMode,
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
    viewMode,
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
