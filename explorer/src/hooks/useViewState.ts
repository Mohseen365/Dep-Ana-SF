import { useState, useEffect, useCallback, useRef } from "react";
import {
  SearchFilterState,
  createEmptyFilterState,
} from "../lib/search-filter";
import { FocusState, createEmptyFocusState } from "../lib/focus-graph";
import { ImpactState, createEmptyImpactState } from "../lib/impact-analysis";
import { useWorkspaceRouter } from "../context/WorkspaceRouterContext";
import { useInvestigation } from "../context/InvestigationContext";
import { useProject } from "../context/ProjectContext";

import { WorkspaceViewMode } from "../lib/projectState";
import {
  filterQuery,
  focusQuery,
  impactQuery,
  findingsQuery,
  connectionQuery,
  investigationQuery,
  ConnectionQueryState,
} from "../lib/url";

function useWorkspaceRouterSafe() {
  try {
    return useWorkspaceRouter();
  } catch (_) {
    return null;
  }
}

function useInvestigationSafe() {
  try {
    return useInvestigation();
  } catch (_) {
    return null;
  }
}

function useProjectSafe() {
  try {
    return useProject();
  } catch (_) {
    return null;
  }
}
export function useViewState() {
  const router = useWorkspaceRouterSafe();
  const investigation = useInvestigationSafe();
  const projectContext = useProjectSafe();

  const routerRef = useRef(router);
  routerRef.current = router;

  const investigationRef = useRef(investigation);
  investigationRef.current = investigation;

  const projectRef = useRef(projectContext);
  projectRef.current = projectContext;
  const [localViewMode, setLocalViewMode] =
    useState<WorkspaceViewMode>("graph");

  const activeViewMode: WorkspaceViewMode = router
    ? router.activeViewMode
    : localViewMode;

  const setViewMode = useCallback((mode: WorkspaceViewMode) => {
    if (routerRef.current) {
      routerRef.current.setViewMode(mode);
    } else {
      setLocalViewMode(mode);
    }
  }, []);

  // Local state fallbacks for standalone hook usage without InvestigationContext
  const [filterState, setFilterState] = useState<SearchFilterState>(
    createEmptyFilterState,
  );
  const [localFocusState, setLocalFocusState] = useState<FocusState>(
    createEmptyFocusState,
  );
  const [localImpactState, setLocalImpactState] = useState<ImpactState>(
    createEmptyImpactState,
  );
  const [localConnectionState, setLocalConnectionState] =
    useState<ConnectionQueryState>({
      direction: "both",
      depth: 2,
    });
  const [diagnosticsTab, setDiagnosticsTab] = useState<
    "cycles" | "unresolved" | "none"
  >("none");
  const [localSelectedCycleId, setLocalSelectedCycleId] = useState<
    string | null
  >(null);
  const [localSelectedUnresolvedEdgeId, setLocalSelectedUnresolvedEdgeId] =
    useState<string | null>(null);
  const [localSelectedNodeId, setLocalSelectedNodeId] = useState<string | null>(
    null,
  );
  const [localSelectedFindingId, setLocalSelectedFindingId] = useState<
    string | null
  >(null);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<
    string | null
  >(null);
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [urlNodeId, setUrlNodeId] = useState<string | null>(null);
  const [localSelectedEdgeId, setLocalSelectedEdgeId] = useState<string | null>(null);

  // Canonical investigation state derived directly from InvestigationContext when present
  const selectedNodeId = investigation
    ? investigation.state.selectedNodeId
    : localSelectedNodeId;
  const selectedEdgeId = investigation
    ? investigation.state.selectedEdgeId
    : localSelectedEdgeId;
  const selectedFindingId = investigation
    ? investigation.state.selectedFindingId
    : localSelectedFindingId;
  const selectedCycleId = investigation
    ? investigation.state.selectedCycleId
    : localSelectedCycleId;
  const selectedUnresolvedEdgeId = investigation
    ? investigation.state.selectedUnresolvedEdgeId
    : localSelectedUnresolvedEdgeId;
  const focusState = investigation
    ? investigation.state.focusState
    : localFocusState;
  const impactState = investigation
    ? investigation.state.impactState
    : localImpactState;
  const connectionState = investigation
    ? investigation.state.connectionState
    : localConnectionState;

  const setSelectedNodeId = useCallback((nodeId: string | null) => {
    if (investigationRef.current) {
      investigationRef.current.selectNode(nodeId);
    } else {
      setLocalSelectedNodeId(nodeId);
    }
  }, []);

  const setSelectedEdgeId = useCallback((edgeId: string | null) => {
    if (investigationRef.current) {
      investigationRef.current.selectEdge(edgeId);
    } else {
      setLocalSelectedEdgeId(edgeId);
    }
  }, []);

  const setSelectedFindingId = useCallback(
    (findingId: string | null, associatedNodeId?: string | null) => {
      if (investigationRef.current) {
        investigationRef.current.selectFinding(findingId, associatedNodeId);
      } else {
        setLocalSelectedFindingId(findingId);
        if (associatedNodeId) setLocalSelectedNodeId(associatedNodeId);
      }
    },
    [],
  );

  const setSelectedCycleId = useCallback(
    (cycleId: string | null, associatedNodeId?: string | null) => {
      if (investigationRef.current) {
        investigationRef.current.selectCycle(cycleId, associatedNodeId);
      } else {
        setLocalSelectedCycleId(cycleId);
        if (associatedNodeId) setLocalSelectedNodeId(associatedNodeId);
      }
    },
    [],
  );

  const setSelectedUnresolvedEdgeId = useCallback(
    (edgeId: string | null, associatedNodeId?: string | null) => {
      if (investigationRef.current) {
        investigationRef.current.selectUnresolvedEdge(edgeId, associatedNodeId);
      } else {
        setLocalSelectedUnresolvedEdgeId(edgeId);
        if (associatedNodeId) setLocalSelectedNodeId(associatedNodeId);
      }
    },
    [],
  );

  const setFocusState = useCallback(
    (focus: Partial<FocusState> | ((prev: FocusState) => FocusState)) => {
      if (investigationRef.current) {
        if (typeof focus === "function") {
          const next = focus(investigationRef.current.state.focusState);
          if (next.enabled === false) {
            investigationRef.current.clearFocus();
          } else {
            investigationRef.current.setFocus(next);
          }
        } else if (focus.enabled === false) {
          investigationRef.current.clearFocus();
        } else {
          investigationRef.current.setFocus(focus);
        }
      } else {
        setLocalFocusState((prev) =>
          typeof focus === "function" ? focus(prev) : { ...prev, ...focus },
        );
      }
    },
    [],
  );

  const setImpactState = useCallback(
    (impact: Partial<ImpactState> | ((prev: ImpactState) => ImpactState)) => {
      if (investigationRef.current) {
        if (typeof impact === "function") {
          const next = impact(investigationRef.current.state.impactState);
          if (next.enabled === false) {
            investigationRef.current.clearImpact();
          } else {
            investigationRef.current.setImpact(next);
          }
        } else if (impact.enabled === false) {
          investigationRef.current.clearImpact();
        } else {
          investigationRef.current.setImpact(impact);
        }
      } else {
        setLocalImpactState((prev) =>
          typeof impact === "function" ? impact(prev) : { ...prev, ...impact },
        );
      }
    },
    [],
  );

  const setConnectionState = useCallback(
    (
      conn:
        | Partial<ConnectionQueryState>
        | ((prev: ConnectionQueryState) => ConnectionQueryState),
    ) => {
      if (investigationRef.current) {
        if (typeof conn === "function") {
          investigationRef.current.setConnection(
            conn(investigationRef.current.state.connectionState),
          );
        } else {
          investigationRef.current.setConnection(conn);
        }
      } else {
        setLocalConnectionState((prev) =>
          typeof conn === "function" ? conn(prev) : { ...prev, ...conn },
        );
      }
    },
    [],
  );

  const isInitialMountRef = useRef(true);
  const prevViewModeRef = useRef<WorkspaceViewMode>(activeViewMode);

  const readStateFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    let initialNode = params.get("node") || params.get("component");
    if (!initialNode && typeof window !== "undefined" && window.location.hash) {
      try {
        const hashRaw = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hashRaw);
        initialNode = hashParams.get("node");
      } catch { /* ignore */ }
    }

    if (initialNode) {
      setUrlNodeId(initialNode);
      if (investigationRef.current) {
        investigationRef.current.selectNode(initialNode);
      } else {
        setLocalSelectedNodeId(initialNode);
      }
    } else {
      setUrlNodeId(null);
      if (investigationRef.current) {
        investigationRef.current.selectNode(null);
      } else {
        setLocalSelectedNodeId(null);
      }
    }

    const initialEdge = params.get("edge");
    setSelectedEdgeId(initialEdge ?? null);

    const filterParsed = filterQuery.fromQuery(params);
    if (routerRef.current) {
      routerRef.current.setViewMode(filterParsed.viewMode);
    } else {
      setLocalViewMode(filterParsed.viewMode);
    }
    setFilterState(filterParsed.filterState);

    const focusParsed = focusQuery.fromQuery(params, initialNode);
    if (investigationRef.current) {
      if (focusParsed.enabled) {
        investigationRef.current.setFocus(focusParsed);
      } else {
        investigationRef.current.clearFocus();
      }
    } else {
      setLocalFocusState(focusParsed);
    }

    const impactParsed = impactQuery.fromQuery(params, initialNode);
    if (investigationRef.current) {
      if (impactParsed.enabled) {
        investigationRef.current.setImpact(impactParsed);
      } else {
        investigationRef.current.clearImpact();
      }
    } else {
      setLocalImpactState(impactParsed);
    }

    const connParsed = connectionQuery.fromQuery(params);
    if (investigationRef.current) {
      investigationRef.current.setConnection(connParsed);
    } else {
      setLocalConnectionState(connParsed);
    }

    const findingsParsed = findingsQuery.fromQuery(params);
    setDiagnosticsTab(findingsParsed.diagnosticsTab);
    if (investigationRef.current) {
      if (findingsParsed.selectedCycleId) {
        investigationRef.current.selectCycle(findingsParsed.selectedCycleId);
      }
      if (findingsParsed.selectedUnresolvedEdgeId) {
        investigationRef.current.selectUnresolvedEdge(
          findingsParsed.selectedUnresolvedEdgeId,
        );
      }
      if (findingsParsed.selectedFindingId) {
        investigationRef.current.selectFinding(
          findingsParsed.selectedFindingId,
        );
      }
    } else {
      setLocalSelectedCycleId(findingsParsed.selectedCycleId);
      setLocalSelectedUnresolvedEdgeId(findingsParsed.selectedUnresolvedEdgeId);
      setLocalSelectedFindingId(findingsParsed.selectedFindingId);
    }

    const invParsed = investigationQuery.fromQuery(params);
    setSelectedInvestigationId(invParsed.selectedInvestigationId);

    setIsInvestigating(params.get("investigate") === "true");
  }, []);

  // Read initial values from URL on mount and popstate
  useEffect(() => {
    readStateFromUrl();

    const handlePopState = () => {
      readStateFromUrl();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [readStateFromUrl]);

  // Reset view state completely on project switch to enforce project isolation
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleProjectChanged = () => {
      if (investigationRef.current) {
        investigationRef.current.resetInvestigationContext();
      } else {
        setLocalSelectedNodeId(null);
        setLocalSelectedFindingId(null);
        setLocalSelectedCycleId(null);
        setLocalSelectedUnresolvedEdgeId(null);
        setLocalFocusState(createEmptyFocusState());
        setLocalImpactState(createEmptyImpactState());
        setLocalConnectionState({ direction: "both", depth: 2 });
      }
      setSelectedInvestigationId(null);
      setIsInvestigating(false);
      setUrlNodeId(null);
      setSelectedEdgeId(null);
      setFilterState(createEmptyFilterState());
      setDiagnosticsTab("none");
    };

    window.addEventListener("explorer:project-changed", handleProjectChanged);
    return () => {
      window.removeEventListener(
        "explorer:project-changed",
        handleProjectChanged,
      );
    };
  }, []);

  // Sync state to URL search params
  const syncToUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevViewModeRef.current = activeViewMode;
      return;
    }

    const currentParams = new URLSearchParams(window.location.search);
    const existingProject = currentParams.get("project");
    const activeProject = projectRef.current?.activeProjectId;

    const projectToPreserve =
      existingProject ||
      (activeProject && activeProject !== "default" ? activeProject : null);

    // Start from the existing query so unknown params (debug, utm_*, feature flags)
    // survive the rewrite.
    const params = new URLSearchParams(currentParams);

    // Delete only the keys this hook owns; they will be re-added below if active.
    const OWNED_KEYS = [
      "project", "node", "component", "edge", "investigate",
      "focus", "focusNode", "depth", "direction",
      "impact", "impactOrigin", "impactDepth",
      "conn", "findings", "cycle", "unresolvedEdge", "finding", "tab",
      "investigation",
      "view", "search", "typeFilter", "riskFilter",
      "hasCallouts", "withoutSharing", "hideTests", "hasAsyncPatterns",
    ] as const;
    for (const k of OWNED_KEYS) params.delete(k);

    if (projectToPreserve) {
      params.set("project", projectToPreserve);
    }

    const effectiveNode =
      selectedNodeId || focusState.focusNodeId || impactState.originNodeId;
    if (effectiveNode) {
      params.set("node", effectiveNode);
    }

    if (selectedEdgeId) {
      params.set("edge", selectedEdgeId);
    }

    if (isInvestigating) {
      params.set("investigate", "true");
    }

    if (focusState.enabled) {
      focusQuery.toQuery(focusState, params);
    }

    if (impactState.enabled) {
      impactQuery.toQuery(impactState, params);
    }

    if (diagnosticsTab !== "none" || selectedFindingId !== null) {
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

    if (connectionState.direction !== "both" || connectionState.depth !== 2) {
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
      filterState.searchQuery !== "" ||
      filterState.typeFilter !== "" ||
      filterState.riskFilter !== "" ||
      filterState.hasCallouts ||
      filterState.withoutSharing ||
      filterState.hideTests ||
      filterState.hasAsyncPatterns;

    if (activeViewMode !== "graph" || isFilterActive) {
      filterQuery.toQuery({ viewMode: activeViewMode, filterState }, params);
    }

    const searchString = params.toString() ? `?${params.toString()}` : "";
    const currentHash = typeof window !== "undefined" ? window.location.hash : "";
    const newUrl = `${window.location.pathname}${searchString}${currentHash}`;
    if (window.location.search !== searchString) {
      if (prevViewModeRef.current !== activeViewMode) {
        window.history.pushState(null, "", newUrl);
        prevViewModeRef.current = activeViewMode;
      } else {
        window.history.replaceState(null, "", newUrl);
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
    selectedEdgeId,
    selectedFindingId,
    selectedInvestigationId,
    isInvestigating,
  ]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncToUrlRef = useRef(syncToUrl);
  syncToUrlRef.current = syncToUrl;

  const prevSearchQueryRef = useRef(filterState.searchQuery);
  const prevNonSearchStateRef = useRef({
    activeViewMode,
    selectedNodeId,
    selectedFindingId,
    selectedCycleId,
    selectedUnresolvedEdgeId,
    selectedInvestigationId,
    isInvestigating,
    diagnosticsTab,
    focusState,
    impactState,
    connectionState,
    typeFilter: filterState.typeFilter,
    riskFilter: filterState.riskFilter,
    hasCallouts: filterState.hasCallouts,
    withoutSharing: filterState.withoutSharing,
    hideTests: filterState.hideTests,
    hasAsyncPatterns: filterState.hasAsyncPatterns,
  });

  useEffect(() => {
    const currentNonSearchState = {
      activeViewMode,
      selectedNodeId,
      selectedFindingId,
      selectedCycleId,
      selectedUnresolvedEdgeId,
      selectedInvestigationId,
      isInvestigating,
      diagnosticsTab,
      focusState,
      impactState,
      connectionState,
      typeFilter: filterState.typeFilter,
      riskFilter: filterState.riskFilter,
      hasCallouts: filterState.hasCallouts,
      withoutSharing: filterState.withoutSharing,
      hideTests: filterState.hideTests,
      hasAsyncPatterns: filterState.hasAsyncPatterns,
    };

    const nonSearchChanged =
      JSON.stringify(prevNonSearchStateRef.current) !== JSON.stringify(currentNonSearchState);
    const searchQueryChanged = prevSearchQueryRef.current !== filterState.searchQuery;

    prevNonSearchStateRef.current = currentNonSearchState;
    prevSearchQueryRef.current = filterState.searchQuery;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (searchQueryChanged && !nonSearchChanged && filterState.searchQuery) {
      debounceTimerRef.current = setTimeout(() => {
        syncToUrlRef.current();
      }, 150);
    } else {
      syncToUrl();
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [
    syncToUrl,
    activeViewMode,
    selectedNodeId,
    selectedFindingId,
    selectedCycleId,
    selectedUnresolvedEdgeId,
    selectedInvestigationId,
    isInvestigating,
    diagnosticsTab,
    focusState,
    impactState,
    connectionState,
    filterState,
  ]);

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
    selectedEdgeId,
    setSelectedEdgeId,
    selectedFindingId,
    setSelectedFindingId,
    selectedInvestigationId,
    setSelectedInvestigationId,
    isInvestigating,
    setIsInvestigating,
    urlNodeId,
    urlEdgeId: selectedEdgeId,
  };
}
