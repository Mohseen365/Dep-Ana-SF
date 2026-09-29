import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import React from 'react';
import { SelectionProvider } from './context/SelectionContext';
import { InvestigationProvider } from './context/InvestigationContext';
import { WorkspaceRouterProvider, useWorkspaceRouter } from './context/WorkspaceRouterContext';
import { WorkspaceViewMode } from './components/ViewModeSwitcher';
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
import { computeFocusedGraph, createEmptyFocusState } from './lib/focus-graph';
import { createEmptyImpactState } from './lib/impact-analysis';
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
  type ExplorerNode,
  type ExplorerEdge,
  type ExplorerDataSchema,
  type ArchitectureLayoutMode,
} from './types/explorer';
import './index.css';

// Re-export GraphSlot for compatibility & registry component resolution
export { GraphSlot } from './components/GraphSlot';

function useProjectSafe() {
  try {
    return useProject();
  } catch (_) {
    return null;
  }
}

function useProjectStateSafe() {
  try {
    return useProjectState();
  } catch (_) {
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

  const isNotAnalyzed =
    activeProject?.analysisStatus === 'NOT_ANALYZED' ||
    (error && error.message.startsWith('NOT_ANALYZED:')) ||
    (!activeData && activeProjectId !== 'default' && (!error || error.message.startsWith('NOT_ANALYZED:')));

  const selection = useGraphSelection();
  const view = useViewState();
  const compareState = useCompareState();
  const palette = useCommandPalette();

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

  // Drawer pin & detach states
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('explorer.drawer.pinned') === 'true';
    }
    return false;
  });

  const [isDetached, setIsDetached] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('explorer.drawer.detached') === 'true';
    }
    return false;
  });

  const detachedWindowRef = useRef<Window | null>(null);

  // Refactor handoff target state
  const [handoffTarget, setHandoffTarget] = useState<HandoffTarget | null>(null);

  // Progressive drilling and session-only recent list state
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [recentNodeIds, setRecentNodeIds] = useState<string[]>([]);

  const graphRef = useRef<GraphViewRef>(null);

  // Clear simulation and selection state on project switch
  useEffect(() => {
    const handleProjectChanged = () => {
      const projState = loadProjectState(activeProjectId);
      setCommittedMutatedGraph(null);
      setActiveSimulationProposal(null);
      setSimulationStepIndex(0);
      selection.clear();
      setSelectedFinding(null);
      setDrillPath([]);
      setRecentNodeIds([]);
      setHighlightedImpactNodeIds(null);
      setSelectedCycleId(null);
      view.setIsInvestigating(false);
      view.setFocusState(createEmptyFocusState());
      view.setImpactState(createEmptyImpactState());
      view.setFilterState({
        ...createEmptyFilterState(),
        visibleNodeTypes: projState.filters?.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES,
      });
      (view as any).setSelectedNodeId?.(null);
      (view as any).setSelectedFindingId?.(null);
    };

    window.addEventListener('explorer:project-changed', handleProjectChanged as EventListener);
    return () => {
      window.removeEventListener('explorer:project-changed', handleProjectChanged as EventListener);
    };
  }, [activeProjectId, selection, view]);

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
    if (selection.selectedNodeId) {
      const selectedNode = activeData.nodes.find((n) => n.id === selection.selectedNodeId);
      if (!selectedNode) {
        selection.clear();
        setDrillPath([]);
        view.setIsInvestigating(false);
        return;
      }
      const visibleTypes = view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES;
      if (!visibleTypes.includes(selectedNode.type)) {
        selection.clear();
        setDrillPath([]);
        view.setIsInvestigating(false);
      }
    }
  }, [activeData, selection, view, view.filterState.visibleNodeTypes]);

  // Global Escape key listener to clear node selection across all views
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selection.selectedNodeId) {
        selection.clear();
        setDrillPath([]);
        view.setIsInvestigating(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, view]);

  const handleTogglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('explorer.drawer.pinned', String(next));
      }
      return next;
    });
  }, []);

  const handleDetach = useCallback(() => {
    if (!isDetached) {
      const win = openDetachedWindow();
      detachedWindowRef.current = win;
      setIsDetached(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('explorer.drawer.detached', 'true');
      }
    } else {
      if (detachedWindowRef.current && !detachedWindowRef.current.closed) {
        detachedWindowRef.current.close();
      }
      detachedWindowRef.current = null;
      setIsDetached(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('explorer.drawer.detached', 'false');
      }
    }
  }, [isDetached]);

  // BroadcastChannel setup for detached drawer
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = createChannel();

    const unsubscribe = onDetachedDrill(channel, (nodeId) => {
      selection.selectNode(nodeId);
      view.setIsInvestigating(true);
    });

    return () => {
      unsubscribe();
      channel.close();
    };
  }, [selection, view]);

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
        selection.selectNode(compareState.focusedEntityId);
      } else if (activeData?.edges.some((e) => e.id === compareState.focusedEntityId)) {
        selection.selectEdge(compareState.focusedEntityId);
      }
    }
  }, [compareState.focusedEntityId, activeData, selection]);

  // Sync drill path and recent items
  useEffect(() => {
    const id = selection.selectedNodeId;
    if (!id) return;

    setRecentNodeIds((prev) => {
      const filtered = prev.filter((item) => item !== id);
      return [id, ...filtered].slice(0, 5);
    });

    setDrillPath((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === id) {
        return prev;
      }
      const existingIndex = prev.indexOf(id);
      if (existingIndex !== -1) {
        return prev.slice(0, existingIndex + 1);
      }
      return [id];
    });
  }, [selection.selectedNodeId]);

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
  useEffect(() => {
    if (!activeData) return;
    const urlNode = (view as any).selectedNodeId || view.urlNodeId;
    if (urlNode) {
      const matchedNode = activeData.nodes.find(
        (n: any) => n.id === urlNode || n.name === urlNode || n.displayName === urlNode
      );
      const targetId = matchedNode ? matchedNode.id : urlNode;
      if (selection.selectedNodeId !== targetId) {
        selection.selectNode(targetId);
      }
    }
  }, [activeData, (view as any).selectedNodeId, view.urlNodeId]);

  // Derive effective focus state
  const effectiveFocusState = useMemo(() => ({
    ...view.focusState,
    focusNodeId: selection.selectedNodeId || view.focusState.focusNodeId,
  }), [view.focusState, selection.selectedNodeId]);

  // Compute focused sub-graph
  const focusedGraphData = useMemo(() => {
    if (!activeData) return { nodes: [], edges: [] };
    if (!effectiveFocusState.enabled || !effectiveFocusState.focusNodeId) {
      return { nodes: activeData.nodes, edges: activeData.edges };
    }
    const res = computeFocusedGraph(activeData.nodes, activeData.edges, effectiveFocusState);
    return { nodes: res.nodes, edges: res.edges };
  }, [activeData, effectiveFocusState]);

  // Canonical visibility-filtered activeData for all layout lenses
  const visibleActiveData = useMemo(() => {
    if (!activeData) return null;
    const visibleTypes = view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES;
    const { nodes, edges } = filterGraphByNodeTypes(activeData.nodes, activeData.edges, visibleTypes);
    return {
      ...activeData,
      nodes,
      edges,
    };
  }, [activeData, view.filterState.visibleNodeTypes]);

  // Apply node-type visibility filter to focused graph data
  const visibleGraphData = useMemo(() => {
    const visibleTypes = view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES;
    return filterGraphByNodeTypes(focusedGraphData.nodes, focusedGraphData.edges, visibleTypes);
  }, [focusedGraphData, view.filterState.visibleNodeTypes]);

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

    const visibleTypes = view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES;
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
  }, [activeData, activeSimulationProposal, simulationStepIndex, visibleGraphData, effectiveFocusState, view.filterState.visibleNodeTypes, findings, nodePositions]);

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
    if (!activeData || !selection.selectedNodeId) return null;
    return activeData.nodes.find((n) => n.id === selection.selectedNodeId) ?? null;
  }, [activeData, selection.selectedNodeId]);

  const handleResetView = () => {
    selection.clear();
    view.setFilterState(createEmptyFilterState());
    view.setFocusState(createEmptyFocusState());
    view.setImpactState(createEmptyImpactState());
    (view as any).setSelectedNodeId?.(null);
    (view as any).setSelectedFindingId?.(null);
    setSelectedFinding(null);
    setHighlightedImpactNodeIds(null);
    setDrillPath([]);
    setActiveSimulationProposal(null);
    if (graphRef.current) {
      graphRef.current.fitView();
    }
  };

  const handleSelectFinding = (finding: ArchitectureFinding) => {
    setSelectedFinding(finding);
    (view as any).setSelectedFindingId?.(finding.id);
    if (finding.nodeIds && finding.nodeIds.length > 0) {
      selection.selectNode(finding.nodeIds[0]);
      (view as any).setSelectedNodeId?.(finding.nodeIds[0]);
    }
  };

  const handleClearFinding = () => {
    setSelectedFinding(null);
    (view as any).setSelectedFindingId?.(null);
  };

  const handleDrill = (targetId: string) => {
    setDrillPath((prev) => [...prev, targetId]);
    selection.selectNode(targetId);
    view.setIsInvestigating(true);
  };

  const handleNavigateBreadcrumb = (targetId: string) => {
    setDrillPath((prev) => {
      const idx = prev.indexOf(targetId);
      if (idx !== -1) {
        return prev.slice(0, idx + 1);
      }
      return [targetId];
    });
    selection.selectNode(targetId);
  };

  const handleSelectRecentNode = (targetId: string) => {
    selection.selectNode(targetId);
    view.setIsInvestigating(true);
  };

  const handleCommitSimulation = () => {
    if (!activeData || !activeSimulationProposal) return;

    const validation = validateProposalCommit(activeSimulationProposal, activeProjectId, activeData);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Cannot commit stale simulation proposal.');
    }

    const allOps = activeSimulationProposal.steps.flatMap(s => s.operations);
    const mutated = applySimulationOperations(activeData, allOps);
    setCommittedMutatedGraph(mutated);
    setActiveSimulationProposal(null);
    setSimulationStepIndex(0);
  };

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
