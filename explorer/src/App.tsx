import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SelectionProvider } from './context/SelectionContext';
import { useProject } from './context/ProjectContext';
import { useExplorerData } from './hooks/useExplorerData';
import { useGraphSelection } from './hooks/useGraphSelection';
import { useViewState } from './hooks/useViewState';
import { GraphView, GraphViewRef } from './components/GraphView';
import { Sidebar } from './components/Sidebar';
import { InvestigationDrawer } from './components/InvestigationDrawer';
import { ViewModeSwitcher, WorkspaceViewMode } from './components/ViewModeSwitcher';
import { ProjectDashboard } from './components/ProjectDashboard';
import { FindingsPanel } from './components/findings/FindingsPanel';
import { HotspotPanel } from './components/HotspotPanel';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { ComparePanel } from './components/ComparePanel';
import { AnalysisHistoryPanel } from './components/AnalysisHistoryPanel';
import { StatusBar } from './components/StatusBar';
import { createArchitectureContext } from './lib/intelligence/context';
import { runAllRules } from './lib/intelligence/rules';
import type { ArchitectureFinding } from './lib/intelligence';
import { computeFocusedGraph, createEmptyFocusState } from './lib/focus-graph';
import { createEmptyImpactState } from './lib/impact-analysis';
import { createEmptyFilterState, searchNodes } from './lib/search-filter';
import { CommandPalette } from './components/CommandPalette';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useCompareState } from './hooks/useCompareState';
import { RefactorHandoffModal } from './components/RefactorHandoffModal';
import { buildHandoffPayload, openHandoff, HandoffTarget } from './lib/refactor-handoff';
import {
  openDetachedWindow,
  createChannel,
  broadcastNodeChange,
  onDetachedDrill,
} from './lib/detached-drawer';

import type {
  ExplorerNode,
  ExplorerEdge,
} from './types/explorer';
import './index.css';

function useProjectSafe() {
  try {
    return useProject();
  } catch (_) {
    return null;
  }
}

/**
 * GraphSlot renders the main interactive Cytoscape graph canvas.
 */
export function GraphSlot(props: {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (node: ExplorerNode | null) => void;
  onSelectEdge: (edgeId: string) => void;
  impactResult?: any;
  selectedCycleNodeIds?: string[] | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  graphRef?: React.RefObject<GraphViewRef>;
  focusedNodeId?: string | null;
  focusState?: any;
  onFocusChange?: (focusState: any) => void;
}) {
  return (
    <div className="graph-container" data-slot="graph" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <GraphView
        ref={props.graphRef}
        nodes={props.nodes}
        edges={props.edges}
        selectedNodeId={props.selectedNodeId}
        selectedEdgeId={props.selectedEdgeId}
        onSelectNode={props.onSelectNode}
        onSelectEdge={props.onSelectEdge}
        impactResult={props.impactResult}
        selectedCycleNodeIds={props.selectedCycleNodeIds}
        isFullscreen={props.isFullscreen}
        onToggleFullscreen={props.onToggleFullscreen}
        focusedNodeId={props.focusedNodeId}
        focusState={props.focusState}
        onFocusChange={props.onFocusChange}
      />
    </div>
  );
}

function NotAnalyzedScreen({
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

export function App() {
  const projectContext = useProjectSafe();

  const activeProjectId = projectContext?.activeProjectId || 'default';
  const activeProject = projectContext?.activeProject;
  const dataUrl = projectContext?.getProjectDataUrl(activeProjectId) || '/explorer-data.json';

  const { data, loading, error, retry } = useExplorerData(dataUrl);

  const isNotAnalyzed =
    activeProject?.analysisStatus === 'NOT_ANALYZED' ||
    (error && error.message.startsWith('NOT_ANALYZED:')) ||
    (!data && activeProjectId !== 'default' && (!error || error.message.startsWith('NOT_ANALYZED:')));

  const selection = useGraphSelection();
  const view = useViewState();
  const compareState = useCompareState();
  const palette = useCommandPalette();

  const [selectedFinding, setSelectedFinding] = useState<ArchitectureFinding | null>(null);
  const [highlightedImpactNodeIds, setHighlightedImpactNodeIds] = useState<string[] | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [diagnosticsTab, setDiagnosticsTab] = useState<'cycles' | 'unresolved' | 'none'>('cycles');

  // Active workspace view mode: 'graph' | 'dashboard' | 'findings' | 'hotspots' | 'diagnostics' | 'compare' | 'history'
  const [workspaceViewMode, setWorkspaceViewMode] = useState<WorkspaceViewMode>('graph');

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Drawer pin & detach states with localStorage persistence
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

  // Listen for project change events to flush single-project selection & history
  useEffect(() => {
    const handleProjectChanged = () => {
      selection.clear();
      setSelectedFinding(null);
      setDrillPath([]);
      setRecentNodeIds([]);
      setHighlightedImpactNodeIds(null);
      setSelectedCycleId(null);
      view.setIsInvestigating(false);
      view.setFocusState(createEmptyFocusState());
      view.setImpactState(createEmptyImpactState());
      view.setFilterState(createEmptyFilterState());
      (view as any).setSelectedNodeId?.(null);
      (view as any).setSelectedFindingId?.(null);
    };

    window.addEventListener('explorer:project-changed', handleProjectChanged as EventListener);
    return () => {
      window.removeEventListener('explorer:project-changed', handleProjectChanged as EventListener);
    };
  }, [selection, view]);

  // Defensive validation: clear stale node selection if selectedNodeId does not belong to data.nodes
  useEffect(() => {
    if (!data) return;
    if (selection.selectedNodeId) {
      const exists = data.nodes.some((n) => n.id === selection.selectedNodeId);
      if (!exists) {
        selection.clear();
        setDrillPath([]);
        view.setIsInvestigating(false);
      }
    }
  }, [data, selection, view]);

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

  // Setup BroadcastChannel for detached drawer sync
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

  // Broadcast node changes when selection or drill path updates
  useEffect(() => {
    if (!isDetached || typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    if (detachedWindowRef.current && detachedWindowRef.current.closed) {
      detachedWindowRef.current = null;
      setIsDetached(false);
      localStorage.setItem('explorer.drawer.detached', 'false');
      return;
    }

    const currentNodeId =
      drillPath.length > 0
        ? drillPath[drillPath.length - 1]
        : selection.selectedNodeId;

    if (currentNodeId) {
      const channel = createChannel();
      broadcastNodeChange(channel, currentNodeId);
      channel.close();
    }
  }, [selection.selectedNodeId, drillPath, isDetached]);

  const handleRequestHandoff = useCallback((nodeId: string) => {
    if (!data) return;
    const node = data.nodes.find(n => n.id === nodeId);
    if (!node) return;
    setHandoffTarget(buildHandoffPayload(node, data));
  }, [data]);

  // Sync compare focused entity selection to SelectionContext
  useEffect(() => {
    if (compareState.focusedEntityId) {
      if (data?.nodes.some((n) => n.id === compareState.focusedEntityId)) {
        selection.selectNode(compareState.focusedEntityId);
      } else if (data?.edges.some((e) => e.id === compareState.focusedEntityId)) {
        selection.selectEdge(compareState.focusedEntityId);
      }
    }
  }, [compareState.focusedEntityId, data]);

  // Sync drill path and recent items when selection.selectedNodeId changes
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
  const ctx = useMemo(() => (data ? createArchitectureContext(data as any) : null), [data]);
  const findings = useMemo(() => (ctx ? runAllRules(ctx) : []), [ctx]);

  // Filtered nodes for sidebar display
  const displayNodes = useMemo(() => {
    if (!data) return [];
    if (!view.filterState.searchQuery) return data.nodes;
    const results = searchNodes(data.nodes, view.filterState.searchQuery);
    return results.map((r) => r.node);
  }, [data, view.filterState.searchQuery]);

  // Sync node selection from view state (URL) to SelectionContext
  useEffect(() => {
    if (!data) return;
    const urlNode = (view as any).selectedNodeId || view.urlNodeId;
    if (urlNode) {
      const matchedNode = data.nodes.find(
        (n: any) => n.id === urlNode || n.name === urlNode || n.displayName === urlNode
      );
      const targetId = matchedNode ? matchedNode.id : urlNode;
      if (selection.selectedNodeId !== targetId) {
        selection.selectNode(targetId);
      }
    } else if (selection.selectedNodeId) {
      selection.selectNode(null);
    }
  }, [data, (view as any).selectedNodeId, view.urlNodeId]);

  // Sync selection changes back to view state
  useEffect(() => {
    if (selection.selectedNodeId !== (view as any).selectedNodeId) {
      (view as any).setSelectedNodeId?.(selection.selectedNodeId);
    }
  }, [selection.selectedNodeId]);

  // Sync edge selection from URL
  useEffect(() => {
    if (view.urlEdgeId && selection.selectedEdgeId !== view.urlEdgeId) {
      if (view.urlNodeId) {
        selection.selectNode(view.urlNodeId);
      }
    }
    if (view.urlEdgeId && !selection.selectedEdgeId) {
      selection.selectEdge(view.urlEdgeId);
    }
  }, [view.urlEdgeId]);

  // Sync finding selection from view state (URL)
  useEffect(() => {
    if (!findings || findings.length === 0) return;
    const findingId = view.selectedFindingId;
    if (findingId) {
      const targetFinding = findings.find(
        (f) =>
          f.id === findingId ||
          f.id.endsWith(`:${findingId}`) ||
          f.id.includes(findingId)
      );
      if (targetFinding && selectedFinding?.id !== targetFinding.id) {
        setSelectedFinding(targetFinding);
      }
    } else if (selectedFinding) {
      setSelectedFinding(null);
    }
  }, [findings, view.selectedFindingId, view.urlNodeId, view.urlEdgeId]);

  // Derive effective focus state with current selection
  const effectiveFocusState = useMemo(() => ({
    ...view.focusState,
    focusNodeId: selection.selectedNodeId || view.focusState.focusNodeId,
  }), [view.focusState, selection.selectedNodeId]);

  // Keep view.focusState.focusNodeId in sync with selection.selectedNodeId when focus is active
  useEffect(() => {
    if (view.focusState.enabled && selection.selectedNodeId && selection.selectedNodeId !== view.focusState.focusNodeId) {
      view.setFocusState({
        ...view.focusState,
        focusNodeId: selection.selectedNodeId,
      });
    }
  }, [selection.selectedNodeId, view.focusState, view.setFocusState]);

  // Compute focused sub-graph when focus mode is active
  const focusedGraphData = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    if (!effectiveFocusState.enabled || !effectiveFocusState.focusNodeId) {
      return { nodes: data.nodes, edges: data.edges };
    }
    const res = computeFocusedGraph(data.nodes, data.edges, effectiveFocusState);
    return { nodes: res.nodes, edges: res.edges };
  }, [data, effectiveFocusState]);

  // Determine node IDs to highlight on the graph (finding selection or simulator impact)
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
    if (!data || !selection.selectedNodeId) return null;
    return data.nodes.find((n) => n.id === selection.selectedNodeId) ?? null;
  }, [data, selection.selectedNodeId]);

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

  const hasDrawerContent = selectedNode !== null;
  const isDrawerOpen = hasDrawerContent && (view.isInvestigating || isPinned);

  if (loading) return <LoadingScreen />;
  if (error && !isNotAnalyzed) return <ErrorScreen error={error} onRetry={retry} />;

  return (
    <SelectionProvider value={selection}>
      <div
        className="app-layout"
        data-sidebar={isSidebarCollapsed ? 'closed' : 'open'}
        data-drawer={isDrawerOpen ? 'open' : 'closed'}
        style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}
      >
        {/* Top Header */}
        <Header
          onResetView={handleResetView}
          onToggleCompare={() =>
            setWorkspaceViewMode((prev) => (prev === 'compare' ? 'graph' : 'compare'))
          }
          isCompareOpen={workspaceViewMode === 'compare'}
          onOpenCommandPalette={() => palette.open()}
          onOpenPanel={(panelId) => setWorkspaceViewMode(panelId as WorkspaceViewMode)}
        />

        {/* Main Body Container: [Sidebar 280px] | [Workspace 1fr] | [Drawer 380px] */}
        <div
          className="app-body-container"
          data-sidebar={isSidebarCollapsed ? 'closed' : 'open'}
          data-drawer={isDrawerOpen ? 'open' : 'closed'}
          style={{ display: 'flex', flex: 1, width: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}
        >
          {/* Collapsible Left Sidebar Slot */}
          {!isSidebarCollapsed && (
            <div
              className="sidebar-slot"
              style={{ width: '280px', minWidth: '280px', height: '100%', borderRight: '1px solid var(--border-default, #334155)', flexShrink: 0 }}
            >
              <Sidebar
                nodes={data?.nodes ?? []}
                displayNodes={displayNodes}
                filterState={view.filterState}
                selectedNodeId={selection.selectedNodeId}
                collapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(true)}
                onFilterChange={view.setFilterState}
                onSelectNode={(node) => {
                  selection.selectNode(node.id);
                  view.setIsInvestigating(true);
                }}
              />
            </div>
          )}

          {/* Center Workspace (Takes ALL remaining width: flex: 1) */}
          <div className="workspace-center-pane" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minWidth: 0, overflow: 'hidden', position: 'relative' }}>
            {/* View Mode Switcher Action Bar at top of Workspace */}
            <div className="app-workspace-bar" style={{ background: 'var(--surface-panel, #111827)', borderBottom: '1px solid var(--border-default, #334155)', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <ViewModeSwitcher
                viewMode={workspaceViewMode}
                onChangeViewMode={setWorkspaceViewMode}
                findingsCount={findings.length}
              />
              {isSidebarCollapsed && (
                <button
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => setIsSidebarCollapsed(false)}
                  title="Expand Component Inventory Sidebar"
                  data-testid="expand-sidebar-btn"
                >
                  ▶ Component Sidebar
                </button>
              )}
            </div>

            {/* Active View Container */}
            <main className="graph-pane" style={{ flex: 1, position: 'relative', overflow: 'hidden', height: '100%', width: '100%' }}>
              {workspaceViewMode === 'graph' && (
                isNotAnalyzed || !data ? (
                  <NotAnalyzedScreen project={activeProject} />
                ) : (
                  <GraphSlot
                    graphRef={graphRef}
                    nodes={focusedGraphData.nodes}
                    edges={focusedGraphData.edges}
                    selectedNodeId={selection.selectedNodeId}
                    selectedEdgeId={selection.selectedEdgeId}
                    onSelectNode={(node) => {
                      selection.selectNode(node ? node.id : null);
                      if (node) {
                        view.setIsInvestigating(true);
                      }
                    }}
                    onSelectEdge={(edgeId) => selection.selectEdge(edgeId)}
                    selectedCycleNodeIds={highlightedCycleNodeIds}
                    focusedNodeId={
                      isDrawerOpen
                        ? drillPath.length > 0
                          ? drillPath[drillPath.length - 1]
                          : selection.selectedNodeId
                        : null
                    }
                    focusState={effectiveFocusState}
                    onFocusChange={view.setFocusState}
                  />
                )
              )}

              {workspaceViewMode === 'dashboard' && (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <ProjectDashboard
                    project={data?.project ?? activeProject}
                    data={data}
                    findings={findings}
                    onExploreGraph={() => setWorkspaceViewMode('graph')}
                    onViewFindings={() => setWorkspaceViewMode('findings')}
                    onViewHistory={() => setWorkspaceViewMode('history')}
                  />
                </div>
              )}

              {workspaceViewMode === 'findings' && (
                isNotAnalyzed || !data ? (
                  <NotAnalyzedScreen project={activeProject} />
                ) : (
                  <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                    <FindingsPanel
                      findings={findings}
                      selectedFindingId={selectedFinding?.id ?? null}
                      onSelectFinding={handleSelectFinding}
                      onClearSelection={handleClearFinding}
                      onInvestigateNode={(nodeId) => {
                        selection.selectNode(nodeId);
                        view.setIsInvestigating(true);
                        setWorkspaceViewMode('graph');
                      }}
                    />
                  </div>
                )
              )}

              {workspaceViewMode === 'hotspots' && (
                isNotAnalyzed || !data ? (
                  <NotAnalyzedScreen project={activeProject} />
                ) : (
                  <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                    <HotspotPanel
                      nodes={data?.nodes ?? []}
                      cycles={data?.cycles ?? []}
                      impactSummaries={data?.impactSummaries ?? {}}
                      onSelectHotspot={(node) => {
                        selection.selectNode(node.id);
                        view.setIsInvestigating(true);
                        setWorkspaceViewMode('graph');
                      }}
                      selectedNodeId={selection.selectedNodeId}
                    />
                  </div>
                )
              )}

              {workspaceViewMode === 'diagnostics' && (
                isNotAnalyzed || !data ? (
                  <NotAnalyzedScreen project={activeProject} />
                ) : (
                  <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                    <DiagnosticsPanel
                      cycles={data?.cycles ?? []}
                      unresolvedReferences={data?.unresolvedReferences ?? []}
                      nodes={data?.nodes ?? []}
                      activeTab={diagnosticsTab}
                      selectedCycleId={selectedCycleId}
                      selectedUnresolvedEdgeId={selection.selectedEdgeId}
                      onSelectCycle={(cycle) => {
                        setSelectedCycleId(cycle ? cycle.id : null);
                        if (cycle && cycle.nodes.length > 0) {
                          selection.selectNode(cycle.nodes[0]);
                        }
                      }}
                      onSelectUnresolved={(ref) => {
                        if (ref) {
                          selection.selectEdge(ref.edgeId);
                          selection.selectNode(ref.sourceNodeId);
                        } else {
                          selection.clear();
                        }
                      }}
                      onTabChange={(tab) => setDiagnosticsTab(tab)}
                    />
                  </div>
                )
              )}

              {workspaceViewMode === 'compare' && (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <ComparePanel
                    compareState={compareState}
                    onClose={() => setWorkspaceViewMode('graph')}
                  />
                </div>
              )}

              {workspaceViewMode === 'history' && (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <AnalysisHistoryPanel
                    projectId={activeProjectId}
                    projectMeta={data?.project ?? activeProject}
                    currentData={data}
                    compareState={compareState}
                    onCompareSnapshots={(snapA, snapB) => {
                      if (snapA.rawSchemaJson) compareState.setBeforeRaw(snapA.rawSchemaJson);
                      if (snapB.rawSchemaJson) compareState.setAfterRaw(snapB.rawSchemaJson);
                      compareState.runCompare();
                      setWorkspaceViewMode('compare');
                    }}
                  />
                </div>
              )}
            </main>
          </div>

          {/* Collapsible Right Inspector Drawer Slot */}
          {isDrawerOpen && (
            <div
              className="drawer-slot"
              style={{ width: '380px', minWidth: '380px', height: '100%', borderLeft: '1px solid var(--border-default, #334155)', flexShrink: 0 }}
            >
              <InvestigationDrawer
                node={selectedNode}
                open={isDrawerOpen}
                onClose={() => {
                  view.setIsInvestigating(false);
                  if (isPinned) setIsPinned(false);
                }}
                onDrill={handleDrill}
                data={data}
                drillPath={drillPath}
                onNavigateBreadcrumb={handleNavigateBreadcrumb}
                recentNodeIds={recentNodeIds}
                onSelectRecentNode={handleSelectRecentNode}
                onRequestHandoff={handleRequestHandoff}
                isPinned={isPinned}
                onTogglePin={handleTogglePin}
                isDetached={isDetached}
                onDetach={handleDetach}
              />
            </div>
          )}
        </div>

        {/* Bottom Status Indicator Bar */}
        <StatusBar
          totalNodes={data?.summary?.nodeCount ?? data?.nodes?.length ?? 0}
          totalEdges={data?.summary?.edgeCount ?? data?.edges?.length ?? 0}
          visibleNodes={displayNodes.length}
          selectedNodeName={selectedNode?.displayName ?? null}
          activeFilterCount={view.filterState.searchQuery ? 1 : 0}
          cycleCount={data?.summary?.cycleCount ?? data?.cycles?.length ?? 0}
          unresolvedCount={data?.summary?.unresolvedCount ?? data?.unresolvedReferences?.length ?? 0}
        />

        {/* Command Palette Modal */}
        <CommandPalette
          isOpen={palette.isOpen}
          onClose={palette.close}
          nodes={data?.nodes ?? []}
          query={palette.query}
          onQueryChange={palette.setQuery}
          data={data}
          selectedNodeId={selection.selectedNodeId}
          isInvestigating={view.isInvestigating}
          findings={findings}
          selectedFindingId={selectedFinding?.id ?? null}
          onSelectFinding={(f) => {
            handleSelectFinding(f);
            palette.close();
          }}
          onClearFinding={handleClearFinding}
          compareState={compareState}
          activeRiskFilter={view.filterState.riskFilter}
          onRiskFilterChange={(risk) => view.setFilterState({ ...view.filterState, riskFilter: risk })}
          onSelectNode={(nodeId) => {
            selection.selectNode(nodeId);
            view.setIsInvestigating(true);
            palette.close();
          }}
          onApplyFocus={() => {
            if (selection.selectedNodeId) {
              view.setFocusState({
                enabled: true,
                focusNodeId: selection.selectedNodeId,
                depth: 1,
                direction: 'both',
              });
            }
            palette.close();
          }}
          onShowImpact={() => {
            if (selection.selectedNodeId) {
              view.setImpactState({ enabled: true, originNodeId: selection.selectedNodeId, depth: 'ALL' });
            }
            palette.close();
          }}
          onToggleViewMode={() => {
            setWorkspaceViewMode((prev) => (prev === 'graph' ? 'findings' : 'graph'));
            palette.close();
          }}
          onRequestHandoff={handleRequestHandoff}
        />

        <RefactorHandoffModal
          target={handoffTarget}
          onConfirm={() => {
            if (handoffTarget) openHandoff(handoffTarget);
            setHandoffTarget(null);
          }}
          onCancel={() => setHandoffTarget(null)}
        />
      </div>
    </SelectionProvider>
  );
}

export default App;
