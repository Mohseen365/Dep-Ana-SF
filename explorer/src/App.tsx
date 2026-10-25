import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { SelectionProvider } from './context/SelectionContext';
import { InvestigationProvider, useInvestigation } from './context/InvestigationContext';
import { WorkspaceRouterProvider, useWorkspaceRouter } from './context/WorkspaceRouterContext';
import { useProject } from './context/ProjectContext';
import { useProjectState } from './context/ProjectStateContext';
import { useExplorerData } from './hooks/useExplorerData';
import { useGraphSelection } from './hooks/useGraphSelection';
import { useViewState } from './hooks/useViewState';
import { GraphViewRef } from './components/GraphView';
import { WorkspaceShell } from './components/workspace/WorkspaceShell';
import { createArchitectureContext } from './lib/intelligence/context';
import { runAllRules } from './lib/intelligence/rules';
import type { ArchitectureFinding } from './lib/intelligence';
import { computeFocusedGraph } from './lib/focus-graph';
import { createEmptyFilterState, searchNodes, filterGraphByNodeTypes } from './lib/search-filter';
import { loadProjectState, saveProjectState } from './lib/projectState';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useCompareState } from './hooks/useCompareState';
import { buildHandoffPayload, openHandoff, HandoffTarget } from './lib/refactor-handoff';
import {
  applySimulationOperations,
  computeStepImpact,
  computeTemporarySimulatedPositions,
  createProposalFromTargetNodes,
  validateProposalCommit,
  type RefactoringProposal,
} from './lib/refactoring-simulation';
import {
  openDetachedWindow,
  createChannel,
  onDetachedDrill,
} from './lib/detached-drawer';

import {
  ALL_EXPLORER_NODE_TYPES,
  type ExplorerDataSchema,
} from './types/explorer';
import './index.css';

// Re-export GraphSlot for compatibility & registry component resolution
export { GraphSlot } from './components/GraphSlot';

function useProjectSafe() {
  try {
    const project = useProject();
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && !project) {
      console.warn('[App] useProjectSafe resolved uninitialized ProjectContext.');
    }
    return project;
  } catch (err) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn('[App] useProjectSafe context resolution skipped:', err);
    }
    return null;
  }
}

export interface CheckIsNotAnalyzedParams {
  loading: boolean;
  projectLoading?: boolean;
  analysisStatus?: string;
  error?: Error | null;
  activeData?: unknown;
  activeProjectId?: string;
}

export function isNotAnalyzed(
  statusOrParams?: string | null | CheckIsNotAnalyzedParams
): boolean {
  if (!statusOrParams) return false;
  if (typeof statusOrParams === 'string') {
    return statusOrParams === 'NOT_ANALYZED';
  }
  return checkIsNotAnalyzed(statusOrParams);
}

export function checkIsNotAnalyzed({
  loading,
  projectLoading = false,
  analysisStatus,
  error = null,
  activeData,
  activeProjectId = 'default',
}: CheckIsNotAnalyzedParams): boolean {
  if (loading || projectLoading) {
    return false;
  }

  const isNotAnalyzedStatus = analysisStatus === 'NOT_ANALYZED';
  const isNotAnalyzedError = Boolean(error && error.message.startsWith('NOT_ANALYZED:'));
  const isMissingNonDefaultData =
    !activeData &&
    activeProjectId !== 'default' &&
    (!error || error.message.startsWith('NOT_ANALYZED:'));

  return isNotAnalyzedStatus || isNotAnalyzedError || isMissingNonDefaultData;
}

function useProjectStateSafe() {
  try {
    const projectState = useProjectState();
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && !projectState) {
      console.warn('[App] useProjectStateSafe resolved uninitialized ProjectStateContext.');
    }
    return projectState;
  } catch (err) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn('[App] useProjectStateSafe context resolution skipped:', err);
    }
    return null;
  }
}

export function NotAnalyzedScreen({
  project,
}: {
  project?: { name: string; id: string; sourcePath?: string } | null;
}) {
  const sourcePath = project?.sourcePath || 'force-app/main/default';
  const projectId = project?.id || 'project-id';

  return (
    <div
      className="state-screen state-empty"
      data-testid="not-analyzed-screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        maxWidth: '640px',
        margin: '40px auto',
        backgroundColor: 'var(--surface-panel, #111827)',
        border: '1px solid var(--border-default, #334155)',
        borderRadius: 'var(--radius-lg, 8px)',
        boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.3))',
      }}
    >
      <span style={{ fontSize: '48px', marginBottom: '16px', lineHeight: 1 }} aria-hidden="true">
        ⚡
      </span>
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-primary, #f8fafc)',
          margin: '0 0 12px 0',
        }}
      >
        Project created successfully.
      </h2>
      <p
        style={{
          fontSize: '14px',
          color: 'var(--text-secondary, #cbd5e1)',
          margin: '0 0 24px 0',
          lineHeight: '1.5',
        }}
      >
        This project has not been analyzed yet.
      </p>

      <div
        style={{
          width: '100%',
          backgroundColor: 'var(--surface-subtle, #0f172a)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 'var(--radius-md, 6px)',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'left',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-muted, #94a3b8)',
            margin: '0 0 8px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Run analysis to generate dependency data:
        </p>
        <code
          style={{
            fontSize: '13px',
            color: 'var(--accent-primary, #3b82f6)',
            fontFamily: 'var(--font-mono, monospace)',
            display: 'block',
            wordBreak: 'break-all',
          }}
        >
          node scripts/export-explorer.cjs --project {projectId} --source {sourcePath}
        </code>
      </div>

      <p
        style={{
          fontSize: '12px',
          color: 'var(--text-muted, #94a3b8)',
          margin: 0,
          lineHeight: '1.4',
        }}
      >
        You can switch back to the <strong>Default Salesforce Project</strong> or another active project using the project selector in the top header.
      </p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="state-screen">
      <div className="spinner" />
      <h2>Loading Architecture Graph…</h2>
      <p>Parsing explorer-data.json contract and constructing view model.</p>
    </div>
  );
}

function ErrorScreen({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="state-screen state-error">
      <span className="error-icon">⚠️</span>
      <h2>Failed to Load Explorer</h2>
      <p>{error?.message || 'No data available'}</p>
      <button onClick={onRetry} className="retry-btn">Retry</button>
    </div>
  );
}

function AppContent() {
  const router = useWorkspaceRouter();
  const projectContext = useProjectSafe();
  const projectStateContext = useProjectStateSafe();

  const activeProjectId = projectContext?.activeProjectId || 'default';
  const nodePositions = projectStateContext?.projectState.graphLayout.nodePositions;
  const layoutMode = projectStateContext?.projectState.graphLayout.mode || 'interactive';
  const architectureMode = projectStateContext?.projectState.graphLayout.architectureMode || 'hierarchical';
  const activeProject = projectContext?.activeProject;
  const dataUrl = projectContext?.getProjectDataUrl(activeProjectId) || '/explorer-data.json';

  const { data, loading, error, retry } = useExplorerData(dataUrl);

  // Dynamic override for graph mutations committed from simulation
  const [committedMutatedGraph, setCommittedMutatedGraph] = useState<ExplorerDataSchema | null>(null);
  const activeData = committedMutatedGraph || data;

  // Invalidate committed mutated graph when fresh baseline data or re-analysis results arrive
  const prevDataRef = useRef<ExplorerDataSchema | null>(data);
  const prevDataGeneratedAtRef = useRef<string | undefined>(data?.generatedAt);
  useEffect(() => {
    if (!data) return;
    if (prevDataRef.current !== data || prevDataGeneratedAtRef.current !== data.generatedAt) {
      prevDataRef.current = data;
      prevDataGeneratedAtRef.current = data.generatedAt;
      if (committedMutatedGraph) {
        setCommittedMutatedGraph(null);
      }
    }
  }, [data, committedMutatedGraph]);

  const isNotAnalyzed = checkIsNotAnalyzed({
    loading,
    projectLoading: projectContext?.loading,
    analysisStatus: activeProject?.analysisStatus,
    error,
    activeData,
    activeProjectId,
  });

  
  const selection = useGraphSelection();
  const investigation = useInvestigation();
  const view = useViewState();
  const compareState = useCompareState();
  const palette = useCommandPalette();

  const { clear: clearSelection, selectNode, selectEdge, selectedNodeId } = selection;
  const { resetInvestigationContext } = investigation;
  const { setIsInvestigating, setFilterState, selectedNodeId: viewSelectedNodeId, urlNodeId: viewUrlNodeId } = view;

  const [selectedFinding, setSelectedFinding] = useState<ArchitectureFinding | null>(null);
  const [highlightedImpactNodeIds, setHighlightedImpactNodeIds] = useState<string[] | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [diagnosticsTab, setDiagnosticsTab] = useState<'cycles' | 'unresolved' | 'none'>('cycles');

  // Constellation lens transient options state
  const [constellationOptions, setConstellationOptions] = useState<{
    focalNodeId?: string;
    maxDepth?: number;
    direction?: 'both' | 'dependencies' | 'dependents';
  }>({
    maxDepth: 2,
    direction: 'both',
  });

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Refactoring simulation state
  const [activeSimulationProposal, setActiveSimulationProposal] = useState<RefactoringProposal | null>(null);
  const [simulationStepIndex, setSimulationStepIndex] = useState<number>(0);

  // Canonical investigation state derived directly from InvestigationContext
  const isPinned = investigation.state.drawerState.isPinned;
  const isDetached = investigation.state.drawerState.isDetached;
  const drillPath = investigation.state.drillPath;
  const recentNodeIds = investigation.state.recentNodeIds;

  const detachedWindowRef = useRef<Window | null>(null);

  // Refactor handoff target state
  const [handoffTarget, setHandoffTarget] = useState<HandoffTarget | null>(null);

  const graphRef = useRef<GraphViewRef>(null);

  // Stabilize callback refs for event listeners
  const clearSelectionRef = useRef(clearSelection);
  clearSelectionRef.current = clearSelection;
  const resetInvestigationContextRef = useRef(resetInvestigationContext);
  resetInvestigationContextRef.current = resetInvestigationContext;
  const setIsInvestigatingRef = useRef(setIsInvestigating);
  setIsInvestigatingRef.current = setIsInvestigating;
  const setFilterStateRef = useRef(setFilterState);
  setFilterStateRef.current = setFilterState;

  // Clear simulation and selection state on project switch
  useEffect(() => {
    const handleProjectChanged = () => {
      const projState = loadProjectState(activeProjectId);
      setCommittedMutatedGraph(null);
      setActiveSimulationProposal(null);
      setSimulationStepIndex(0);
      clearSelectionRef.current();
      resetInvestigationContextRef.current();
      setSelectedFinding(null);
      setHighlightedImpactNodeIds(null);
      setSelectedCycleId(null);
      setIsInvestigatingRef.current(false);
      setFilterStateRef.current({
        ...createEmptyFilterState(),
        visibleNodeTypes: projState.filters?.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES,
      });
      setConstellationOptions({
        focalNodeId: undefined,
        maxDepth: 2,
        direction: 'both',
      });
    };

    window.addEventListener('explorer:project-changed', handleProjectChanged as EventListener);
    return () => {
      window.removeEventListener('explorer:project-changed', handleProjectChanged as EventListener);
    };
  }, [activeProjectId]);

  // Sync visibleNodeTypes state persistence on filter change
  useEffect(() => {
    if (!activeProjectId) return;
    const currentProjState = loadProjectState(activeProjectId);
    const activeVisibleTypes = view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES;
    if (
      JSON.stringify(currentProjState.filters?.visibleNodeTypes) !==
      JSON.stringify(activeVisibleTypes)
    ) {
      saveProjectState(activeProjectId, {
        ...currentProjState,
        filters: {
          ...currentProjState.filters,
          visibleNodeTypes: activeVisibleTypes,
        },
      });
    }
  }, [activeProjectId, view.filterState.visibleNodeTypes]);

  // Defensive validation: clear stale node selection
  useEffect(() => {
    if (!activeData) return;
    if (selectedNodeId) {
      const selectedNode = activeData.nodes.find((n) => n.id === selectedNodeId);
      if (!selectedNode) {
        clearSelection();
        setIsInvestigating(false);
        return;
      }
      const visibleTypes = view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES;
      if (!visibleTypes.includes(selectedNode.type)) {
        clearSelection();
        setIsInvestigating(false);
      }
    }
  }, [activeData, selectedNodeId, clearSelection, setIsInvestigating, view.filterState.visibleNodeTypes]);

  // Ref stabilization for Escape key listener
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;
  const selectedEdgeIdRef = useRef(selection.selectedEdgeId);
  selectedEdgeIdRef.current = selection.selectedEdgeId;
  const focusStateRef = useRef(view.focusState);
  focusStateRef.current = view.focusState;
  const setFocusStateRef = useRef(view.setFocusState);
  setFocusStateRef.current = view.setFocusState;

  // Global Escape key listener to clear node selection across all views
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) || target?.isContentEditable) return;

      if (
        e.key === 'Escape' &&
        (selectedNodeIdRef.current || selectedEdgeIdRef.current || focusStateRef.current.enabled)
      ) {
        clearSelectionRef.current();
        setIsInvestigatingRef.current(false);
        if (focusStateRef.current.enabled) {
          setFocusStateRef.current({ ...focusStateRef.current, enabled: false, focusNodeId: null });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTogglePin = useCallback(() => {
    investigation.setDrawerPinned(!isPinned);
  }, [investigation, isPinned]);

  const handleDetach = useCallback(() => {
    if (!isDetached) {
      const win = openDetachedWindow();
      if (!win) {
        console.error('[App] Popup blocked while opening detached drawer.');
        return;
      }
      detachedWindowRef.current = win;
      investigation.setDrawerDetached(true);
    } else {
      if (detachedWindowRef.current && !detachedWindowRef.current.closed) {
        detachedWindowRef.current.close();
      }
      detachedWindowRef.current = null;
      investigation.setDrawerDetached(false);
    }
  }, [investigation, isDetached]);

  // BroadcastChannel setup for detached drawer
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = createChannel();

    const unsubscribe = onDetachedDrill(channel, (nodeId) => {
      if (!activeData?.nodes.some((n: any) => n.id === nodeId)) return;
      selectNode(nodeId);
      setIsInvestigating(true);
    });

    return () => {
      unsubscribe();
      channel.close();
    };
  }, [activeData, selectNode, setIsInvestigating]);

  const handleRequestHandoff = useCallback((nodeId: string) => {
    if (!activeData) return;
    const node = activeData.nodes.find(n => n.id === nodeId);
    if (!node) return;
    setHandoffTarget(buildHandoffPayload(node, activeData));
  }, [activeData]);

  const handleStartSimulationForNode = useCallback((nodeId: string) => {
    if (!activeData) return;
    const proposal = createProposalFromTargetNodes([nodeId], activeData, activeProjectId);
    setActiveSimulationProposal(proposal);
    setSimulationStepIndex(0);
    router.navigateToView('graph');
  }, [activeData, activeProjectId, router]);

  // Sync compare focused entity selection
  useEffect(() => {
    if (compareState.focusedEntityId) {
      if (activeData?.nodes.some((n) => n.id === compareState.focusedEntityId)) {
        selectNode(compareState.focusedEntityId);
      } else if (activeData?.edges.some((e) => e.id === compareState.focusedEntityId)) {
        selectEdge(compareState.focusedEntityId);
      }
    }
  }, [compareState.focusedEntityId, activeData, selectNode, selectEdge]);


  // Compute architecture context and findings
  const ctx = useMemo(() => (activeData ? createArchitectureContext(activeData as any) : null), [activeData]);
  const findings = useMemo(() => (ctx ? runAllRules(ctx) : []), [ctx]);

  // Filtered nodes for sidebar display
  const displayNodes = useMemo(() => {
    if (!activeData) return [];
    if (!view.filterState.searchQuery) return activeData.nodes;
    const results = searchNodes(activeData.nodes, view.filterState.searchQuery);
    return results.map((r) => r.node);
  }, [activeData, view.filterState.searchQuery]);

  // Sync node selection from view state
  const consumedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeData) return;
    const urlNode = viewSelectedNodeId || viewUrlNodeId;
    if (urlNode && consumedUrlRef.current !== urlNode) {
      consumedUrlRef.current = urlNode;
      const matchedNode = activeData.nodes.find(
        (n: any) => n.id === urlNode || n.name === urlNode || n.displayName === urlNode
      );
      const targetId = matchedNode ? matchedNode.id : urlNode;
      if (selectedNodeId !== targetId) {
        selectNode(targetId);
      }
    }
  }, [activeData, viewSelectedNodeId, viewUrlNodeId, selectedNodeId, selectNode]);

  // Derive effective focus state with primitive dependencies
  const focusNodeId = selectedNodeId || view.focusState.focusNodeId;
  const effectiveFocusState = useMemo(() => ({
    enabled: view.focusState.enabled,
    focusNodeId,
    direction: view.focusState.direction,
    depth: view.focusState.depth,
  }), [view.focusState.enabled, focusNodeId, view.focusState.direction, view.focusState.depth]);

  // Compute focused sub-graph
  const focusedGraphData = useMemo(() => {
    if (!activeData) return { nodes: [], edges: [] };
    if (!effectiveFocusState.enabled || !effectiveFocusState.focusNodeId) {
      return { nodes: activeData.nodes, edges: activeData.edges };
    }
    const res = computeFocusedGraph(activeData.nodes, activeData.edges, effectiveFocusState);
    return { nodes: res.nodes, edges: res.edges };
  }, [activeData, effectiveFocusState]);

  // Stable visibleNodeTypes reference
  const visibleTypes = useMemo(
    () => view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES,
    [view.filterState.visibleNodeTypes]
  );

  // Canonical visibility-filtered activeData for all layout lenses
  const visibleActiveData = useMemo(() => {
    if (!activeData) return null;
    const { nodes, edges } = filterGraphByNodeTypes(activeData.nodes, activeData.edges, visibleTypes);
    return {
      ...activeData,
      nodes,
      edges,
    };
  }, [activeData, visibleTypes]);

  // Apply node-type visibility filter to focused graph data
  const visibleGraphData = useMemo(() => {
    return filterGraphByNodeTypes(focusedGraphData.nodes, focusedGraphData.edges, visibleTypes);
  }, [focusedGraphData, visibleTypes]);

  // Compute simulated graph & temporary positions
  const { simulatedGraph, currentStepOps, stepImpact, effectivePositions } = useMemo(() => {
    if (!activeData || !activeSimulationProposal) {
      return {
        simulatedGraph: visibleGraphData,
        currentStepOps: [],
        stepImpact: null,
        effectivePositions: nodePositions || {},
      };
    }

    const currentStep = activeSimulationProposal.steps[simulationStepIndex];
    const opsToApply = activeSimulationProposal.steps
      .slice(0, simulationStepIndex + 1)
      .flatMap(s => s.operations);

    const fullSimulatedData = applySimulationOperations(activeData, opsToApply);

    // Filter by focus & node type
    const focusedSim = (!effectiveFocusState.enabled || !effectiveFocusState.focusNodeId)
      ? { nodes: fullSimulatedData.nodes, edges: fullSimulatedData.edges }
      : computeFocusedGraph(fullSimulatedData.nodes, fullSimulatedData.edges, effectiveFocusState);

    const finalSimulatedGraph = filterGraphByNodeTypes(focusedSim.nodes, focusedSim.edges, visibleTypes);

    const impact = computeStepImpact(
      activeData,
      fullSimulatedData,
      findings,
      currentStep ? currentStep.operations : []
    );

    const tempPositions = computeTemporarySimulatedPositions(
      finalSimulatedGraph.nodes,
      finalSimulatedGraph.edges,
      nodePositions || {}
    );

    return {
      simulatedGraph: finalSimulatedGraph,
      currentStepOps: currentStep ? currentStep.operations : [],
      stepImpact: impact,
      effectivePositions: tempPositions,
    };
  }, [activeData, activeSimulationProposal, simulationStepIndex, visibleGraphData, effectiveFocusState, visibleTypes, findings, nodePositions]);

  // Simulated element highlight IDs
  const simulatedAddedNodeIds = useMemo(() => {
    if (!activeSimulationProposal) return [];
    return currentStepOps
      .filter(op => op.type === 'add-node')
      .map(op => (op as any).node.id);
  }, [activeSimulationProposal, currentStepOps]);

  const simulatedRemovedNodeIds = useMemo(() => {
    if (!activeSimulationProposal) return [];
    return currentStepOps
      .filter(op => op.type === 'remove-node')
      .map(op => (op as any).nodeId);
  }, [activeSimulationProposal, currentStepOps]);

  const simulatedEdgeIds = useMemo(() => {
    if (!activeSimulationProposal) return [];
    return currentStepOps
      .filter(op => op.type === 'add-edge')
      .map(op => (op as any).edge.id);
  }, [activeSimulationProposal, currentStepOps]);

  // Determine node IDs to highlight
  const highlightedCycleNodeIds = useMemo(() => {
    if (selectedFinding?.nodeIds && selectedFinding.nodeIds.length > 0) {
      return selectedFinding.nodeIds;
    }
    if (highlightedImpactNodeIds && highlightedImpactNodeIds.length > 0) {
      return highlightedImpactNodeIds;
    }
    return null;
  }, [selectedFinding, highlightedImpactNodeIds]);

  const selectedNode = useMemo(() => {
    if (!activeData || !selectedNodeId) return null;
    return activeData.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [activeData, selectedNodeId]);

  const handleResetView = useCallback(() => {
    selection.clear();
    investigation.resetInvestigationContext();
    view.setFilterState(createEmptyFilterState());
    setSelectedFinding(null);
    setHighlightedImpactNodeIds(null);
    setActiveSimulationProposal(null);
    if (graphRef.current) {
      graphRef.current.fitView();
    }
  }, [selection, investigation, view]);

  const handleSelectFinding = useCallback((finding: ArchitectureFinding) => {
    setSelectedFinding(finding);
    view.setSelectedFindingId(finding.id);
    if (finding.nodeIds && finding.nodeIds.length > 0) {
      selection.selectNode(finding.nodeIds[0]);
      view.setSelectedNodeId(finding.nodeIds[0]);
    }
  }, [selection, view]);

  const handleClearFinding = useCallback(() => {
    setSelectedFinding(null);
    view.setSelectedFindingId(null);
  }, [view]);

  const handleDrill = useCallback((targetId: string) => {
    investigation.drillIntoComponent(targetId);
    view.setIsInvestigating(true);
  }, [investigation, view]);

  const handleNavigateBreadcrumb = useCallback((targetId: string) => {
    const idx = drillPath.indexOf(targetId);
    if (idx !== -1) {
      investigation.navigateBreadcrumb(idx);
    } else {
      investigation.selectNode(targetId);
    }
  }, [drillPath, investigation]);

  const handleSelectRecentNode = useCallback((targetId: string) => {
    investigation.selectNode(targetId);
    view.setIsInvestigating(true);
  }, [investigation, view]);

  const handleCommitSimulation = useCallback(() => {
    if (!activeData || !activeSimulationProposal) return;

    try {
      const validation = validateProposalCommit(activeSimulationProposal, activeProjectId, activeData);
      if (!validation.valid) {
        console.warn('[App] Simulation commit rejected:', validation.reason);
        return;
      }

      const allOps = activeSimulationProposal.steps.flatMap(s => s.operations);
      const mutated = applySimulationOperations(activeData, allOps);
      setCommittedMutatedGraph(mutated);
      setActiveSimulationProposal(null);
      setSimulationStepIndex(0);
    } catch (err) {
      console.error('[App] handleCommitSimulation failed:', err);
    }
  }, [activeData, activeSimulationProposal, activeProjectId]);

  if (loading) return <LoadingScreen />;
  if (error && !isNotAnalyzed) return <ErrorScreen error={error} onRetry={retry} />;

  return (
    <SelectionProvider value={selection}>
      <WorkspaceShell
        activeProjectId={activeProjectId}
        activeProject={activeProject}
        activeData={activeData}
        visibleActiveData={visibleActiveData}
        simulatedGraph={simulatedGraph}
        displayNodes={displayNodes}
        selection={selection}
        view={view}
        compareState={compareState}
        palette={palette}
        projectStateContext={projectStateContext}
        findings={findings}
        selectedFinding={selectedFinding}
        highlightedCycleNodeIds={highlightedCycleNodeIds}
        effectiveFocusState={effectiveFocusState}
        effectivePositions={effectivePositions}
        layoutMode={layoutMode}
        architectureMode={architectureMode}
        simulatedAddedNodeIds={simulatedAddedNodeIds}
        simulatedRemovedNodeIds={simulatedRemovedNodeIds}
        simulatedEdgeIds={simulatedEdgeIds}
        graphRef={graphRef}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isPinned={isPinned}
        handleTogglePin={handleTogglePin}
        isDetached={isDetached}
        handleDetach={handleDetach}
        selectedNode={selectedNode}
        drillPath={drillPath}
        handleDrill={handleDrill}
        handleNavigateBreadcrumb={handleNavigateBreadcrumb}
        recentNodeIds={recentNodeIds}
        handleSelectRecentNode={handleSelectRecentNode}
        handleRequestHandoff={handleRequestHandoff}
        handleStartSimulationForNode={handleStartSimulationForNode}
        constellationOptions={constellationOptions}
        setConstellationOptions={setConstellationOptions}
        activeSimulationProposal={activeSimulationProposal}
        simulationStepIndex={simulationStepIndex}
        stepImpact={stepImpact}
        setSimulationStepIndex={setSimulationStepIndex}
        setActiveSimulationProposal={setActiveSimulationProposal}
        handleCommitSimulation={handleCommitSimulation}
        handleResetView={handleResetView}
        handleSelectFinding={handleSelectFinding}
        handleClearFinding={handleClearFinding}
        diagnosticsTab={diagnosticsTab}
        selectedCycleId={selectedCycleId}
        setSelectedCycleId={setSelectedCycleId}
        setDiagnosticsTab={setDiagnosticsTab}
        isNotAnalyzed={isNotAnalyzed}
        handoffTarget={handoffTarget}
        setHandoffTarget={setHandoffTarget}
        openHandoff={openHandoff}
        NotAnalyzedScreen={NotAnalyzedScreen}
      />
    </SelectionProvider>
  );
}

export function App() {
  return (
    <InvestigationProvider>
      <WorkspaceRouterProvider>
        <AppContent />
      </WorkspaceRouterProvider>
    </InvestigationProvider>
  );
}

export default App;
