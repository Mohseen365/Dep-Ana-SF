import { useState, useMemo, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { SelectionProvider } from './context/SelectionContext';
import { useExplorerData } from './hooks/useExplorerData';
import { useGraphSelection } from './hooks/useGraphSelection';
import { useViewState } from './hooks/useViewState';
import { GraphView, GraphViewRef } from './components/GraphView';
import { Sidebar } from './components/Sidebar';
import { DetailsPanel } from './components/DetailsPanel';
import { FindingsPanel } from './components/findings/FindingsPanel';
import { InvestigationDrawer } from './components/InvestigationDrawer';
import { ViewModeSwitcher } from './components/ViewModeSwitcher';
import { applyFilters, SearchFilterState, createEmptyFilterState } from './lib/search-filter';
import { createArchitectureContext } from './lib/intelligence/context';
import { runAllRules } from './lib/intelligence/rules';
import type { ArchitectureFinding } from './lib/intelligence';
import { FocusControls } from './components/FocusControls';
import { computeFocusedGraph, createEmptyFocusState } from './lib/focus-graph';
import { analyzeConnections, type ConnectionAnalysis } from './lib/connection-analysis';
import { createEmptyImpactState } from './lib/impact-analysis';
import { ComparePanel } from './components/ComparePanel';
import { useCompareState } from './hooks/useCompareState';

import type {
  ExplorerDataSchema,
  ExplorerNode,
  ExplorerEdge,
  ExplorerComponentImpactSummary,
  ExplorerCycleGroup,
} from './types/explorer';
import './index.css';

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
}) {
  return (
    <div className="graph-container" data-slot="graph">
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
      />
    </div>
  );
}

/**
 * SidebarSlot renders component search, risk filters, and component navigation list.
 */
export function SidebarSlot(props: {
  nodes: ExplorerNode[];
  displayNodes: ExplorerNode[];
  filterState: SearchFilterState;
  selectedNodeId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onFilterChange: (filterState: SearchFilterState) => void;
  onSelectNode: (node: ExplorerNode) => void;
}) {
  return (
    <div className="sidebar-slot" data-slot="sidebar">
      <Sidebar
        nodes={props.nodes}
        displayNodes={props.displayNodes}
        filterState={props.filterState}
        selectedNodeId={props.selectedNodeId}
        collapsed={props.collapsed}
        onToggleCollapse={props.onToggleCollapse}
        onFilterChange={props.onFilterChange}
        onSelectNode={props.onSelectNode}
      />
    </div>
  );
}

/**
 * DetailsSlot renders component or relationship details, blast radius, metrics, and simulator.
 */
export function DetailsSlot(props: {
  node: ExplorerNode | null;
  edge: ExplorerEdge | null;
  impactSummary: ExplorerComponentImpactSummary | null;
  history: string[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose: () => void;
  onShowImpact?: (nodeId: string) => void;
  onSelectNodeById?: (nodeId: string) => void;
  data?: ExplorerDataSchema | null;
  nodes?: ExplorerNode[];
  cycles?: ExplorerCycleGroup[];
  impactSummaries?: Record<string, ExplorerComponentImpactSummary>;
  onHighlightImpact?: (nodeIds: string[], edgeIds: string[]) => void;
  connectionAnalysis?: ConnectionAnalysis | null;
  connectionState?: any;
  onConnectionStateChange?: (state: any) => void;
}) {
  return (
    <div
      className={`details-panel-slot ${props.collapsed ? 'collapsed hidden' : ''}`}
      data-slot="details"
    >
      <DetailsPanel
        node={props.node}
        edge={props.edge}
        impactSummary={props.impactSummary}
        history={props.history}
        collapsed={props.collapsed}
        onToggleCollapse={props.onToggleCollapse}
        onClose={props.onClose}
        onShowImpact={props.onShowImpact}
        onSelectNodeById={props.onSelectNodeById}
        data={props.data}
        nodes={props.nodes}
        cycles={props.cycles}
        impactSummaries={props.impactSummaries}
        onHighlightImpact={props.onHighlightImpact}
        connectionAnalysis={props.connectionAnalysis}
        connectionState={props.connectionState}
        onConnectionStateChange={props.onConnectionStateChange}
      />
    </div>
  );
}

/**
 * FindingsSlot renders the deterministic architecture intelligence findings panel.
 */
export function FindingsSlot(props: {
  findings: ArchitectureFinding[];
  selectedFindingId: string | null;
  onSelectFinding: (finding: ArchitectureFinding) => void;
  onClearSelection: () => void;
}) {
  return (
    <div data-slot="findings">
      <FindingsPanel
        findings={props.findings}
        selectedFindingId={props.selectedFindingId}
        onSelectFinding={props.onSelectFinding}
        onClearSelection={props.onClearSelection}
      />
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
  const { data, loading, error, retry } = useExplorerData('/explorer-data.json');
  const selection = useGraphSelection();
  const view = useViewState();
  const compareState = useCompareState();
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [graphFullscreen, setGraphFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<ArchitectureFinding | null>(null);
  const [highlightedImpactNodeIds, setHighlightedImpactNodeIds] = useState<string[] | null>(null);

  // Progressive drilling and session-only recent list state
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [recentNodeIds, setRecentNodeIds] = useState<string[]>([]);

  const graphRef = useRef<GraphViewRef>(null);

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

  // Sync node selection from view state (URL) to SelectionContext
  // Sync initial selection from URL params
  useEffect(() => {
    if (!data) return;
    const urlNode = (view as any).selectedNodeId || view.urlNodeId;
    if (urlNode) {
      // Find matching node ID by exact match or name / displayName
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

  // Compute filtered graph data based on search and behavior filters
  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (!data) return { visibleNodes: [], visibleEdges: [] };
    const filtered = applyFilters(data.nodes, data.edges, view.filterState);
    return { visibleNodes: filtered.nodes, visibleEdges: filtered.edges };
  }, [data, view.filterState]);

  // Derive effective focus state with current selection
  const effectiveFocusState = useMemo(() => ({
    ...view.focusState,
    focusNodeId: selection.selectedNodeId || view.focusState.focusNodeId,
  }), [view.focusState, selection.selectedNodeId]);

  // Compute focused sub-graph when focus mode is active
  const focusedGraphData = useMemo(() => {
    if (!effectiveFocusState.enabled || !effectiveFocusState.focusNodeId) {
      return { nodes: visibleNodes, edges: visibleEdges };
    }
    const res = computeFocusedGraph(visibleNodes, visibleEdges, effectiveFocusState);
    return { nodes: res.nodes, edges: res.edges };
  }, [visibleNodes, visibleEdges, effectiveFocusState]);

  // Compute method-aware connection analysis when a node is selected
  const connectionAnalysis = useMemo(() => {
    if (!data || !selection.selectedNodeId) return null;
    return analyzeConnections(data.nodes, data.edges, {
      origin: selection.selectedNodeId,
      direction: view.connectionState.direction,
      depth: view.connectionState.depth,
    });
  }, [data, selection.selectedNodeId, view.connectionState]);

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

  const selectedEdge = useMemo(() => {
    if (!data || !selection.selectedEdgeId) return null;
    return data.edges.find((e) => e.id === selection.selectedEdgeId) ?? null;
  }, [data, selection.selectedEdgeId]);

  const selectedImpactSummary = useMemo(() => {
    if (!data || !selection.selectedNodeId) return null;
    return data.impactSummaries?.[selection.selectedNodeId] ?? null;
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

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorScreen error={error} onRetry={retry} />;

  return (
    <SelectionProvider value={selection}>
      <div className={`app-layout ${graphFullscreen ? 'graph-fullscreen' : ''}`}>
        <Header
          onResetView={handleResetView}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onToggleDetails={() => setDetailsCollapsed((prev) => !prev)}
          isDetailsOpen={!detailsCollapsed}
          onToggleFullscreen={() => setGraphFullscreen((f) => !f)}
          onToggleCompare={() => setIsCompareOpen((prev) => !prev)}
          isCompareOpen={isCompareOpen || compareState.isActive}
        />

        <div className={`main-viewport ${view.isInvestigating ? 'drawer-open' : 'drawer-closed'}`}>
          {(isCompareOpen || compareState.isActive) && (
            <div className="compare-panel-wrapper" style={{ position: 'relative', zIndex: 20, padding: '0.8rem' }}>
              <ComparePanel
                compareState={compareState}
                onClose={() => setIsCompareOpen(false)}
              />
            </div>
          )}

          <div className="top-toolbar" style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ViewModeSwitcher
              viewMode={view.viewMode}
              onChangeViewMode={view.setViewMode}
              findingsCount={findings.length}
            />
            {view.viewMode === 'graph' && (
              <FocusControls
                focusState={effectiveFocusState}
                onFocusChange={view.setFocusState}
                hasSelectedNode={Boolean(selection.selectedNodeId)}
              />
            )}
          </div>

          {view.viewMode === 'graph' ? (
            <div className="graph-view-layout">
              <div className={`sidebar-region ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <SidebarSlot
                  nodes={data.nodes}
                  displayNodes={visibleNodes}
                  filterState={view.filterState}
                  selectedNodeId={selection.selectedNodeId}
                  collapsed={sidebarCollapsed}
                  onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
                  onFilterChange={view.setFilterState}
                  onSelectNode={(node) => {
                    selection.selectNode(node.id);
                    view.setIsInvestigating(true);
                  }}
                />
                <button
                  className="sidebar-toggle-btn sidebar-reopen-handle"
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  data-testid="sidebar-toggle-btn"
                >
                  {sidebarCollapsed ? '▶' : '◀'}
                </button>
              </div>

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
                isFullscreen={graphFullscreen}
                onToggleFullscreen={() => setGraphFullscreen((f) => !f)}
                focusedNodeId={
                  view.isInvestigating
                    ? drillPath.length > 0
                      ? drillPath[drillPath.length - 1]
                      : selection.selectedNodeId
                    : null
                }
              />

              <div className={`details-region ${detailsCollapsed ? 'collapsed' : ''}`}>
                <button
                  className="details-toggle-btn details-reopen-handle"
                  onClick={() => setDetailsCollapsed((c) => !c)}
                  aria-label={detailsCollapsed ? "Expand details panel" : "Collapse details panel"}
                  title={detailsCollapsed ? "Expand details panel" : "Collapse details panel"}
                  data-testid="details-toggle-btn"
                >
                  {detailsCollapsed ? '◀' : '▶'}
                </button>
                <DetailsSlot
                  node={selectedNode}
                  edge={selectedEdge}
                  impactSummary={selectedImpactSummary}
                  history={selection.history}
                  collapsed={detailsCollapsed}
                  onToggleCollapse={() => setDetailsCollapsed((prev) => !prev)}
                  onClose={() => selection.clear()}
                  onShowImpact={(nodeId) => {
                    view.setImpactState({ enabled: true, originNodeId: nodeId, depth: 'ALL' });
                    (view as any).setSelectedNodeId?.(nodeId);
                  }}
                  onSelectNodeById={(id) => selection.selectNode(id)}
                  data={data}
                  nodes={data.nodes}
                  cycles={data.cycles}
                  impactSummaries={data.impactSummaries}
                  onHighlightImpact={(nodeIds) => setHighlightedImpactNodeIds(nodeIds)}
                  connectionAnalysis={connectionAnalysis}
                  connectionState={view.connectionState}
                  onConnectionStateChange={view.setConnectionState}
                />
              </div>

              <InvestigationDrawer
                node={selectedNode}
                open={view.isInvestigating}
                onClose={() => view.setIsInvestigating(false)}
                onDrill={handleDrill}
                data={data}
                drillPath={drillPath}
                onNavigateBreadcrumb={handleNavigateBreadcrumb}
                recentNodeIds={recentNodeIds}
                onSelectRecentNode={handleSelectRecentNode}
              />
            </div>
          ) : (
            <FindingsSlot
              findings={findings}
              selectedFindingId={selectedFinding?.id ?? null}
              onSelectFinding={handleSelectFinding}
              onClearSelection={handleClearFinding}
            />
          )}
        </div>

        <StatusBar
          totalNodes={data.nodes.length}
          totalEdges={data.edges.length}
          visibleNodes={visibleNodes.length}
          selectedNodeName={selectedNode?.displayName ?? selection.selectedNodeId}
          activeFilterCount={
            (view.filterState.searchQuery ? 1 : 0) +
            (view.filterState.typeFilter ? 1 : 0) +
            (view.filterState.riskFilter ? 1 : 0) +
            (view.filterState.hasCallouts ? 1 : 0) +
            (view.filterState.withoutSharing ? 1 : 0) +
            (view.filterState.hideTests ? 1 : 0) +
            (view.filterState.hasAsyncPatterns ? 1 : 0)
          }
          cycleCount={data.summary.cycleCount}
          unresolvedCount={data.summary.unresolvedCount}
        />
      </div>
    </SelectionProvider>
  );
}

export default App;
