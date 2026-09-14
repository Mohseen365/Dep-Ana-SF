import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SelectionProvider } from './context/SelectionContext';
import { useExplorerData } from './hooks/useExplorerData';
import { useGraphSelection } from './hooks/useGraphSelection';
import { useViewState } from './hooks/useViewState';
import { GraphView, GraphViewRef } from './components/GraphView';
import { InvestigationDrawer } from './components/InvestigationDrawer';
import { createArchitectureContext } from './lib/intelligence/context';
import { runAllRules } from './lib/intelligence/rules';
import type { ArchitectureFinding } from './lib/intelligence';
import { computeFocusedGraph, createEmptyFocusState } from './lib/focus-graph';
import { createEmptyImpactState } from './lib/impact-analysis';
import { createEmptyFilterState } from './lib/search-filter';
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
  const palette = useCommandPalette();
  const [selectedFinding, setSelectedFinding] = useState<ArchitectureFinding | null>(null);
  const [highlightedImpactNodeIds, setHighlightedImpactNodeIds] = useState<string[] | null>(null);

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

    // Check if detached window is still alive
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

  // Sync node selection from view state (URL) to SelectionContext
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

  // Derive effective focus state with current selection
  const effectiveFocusState = useMemo(() => ({
    ...view.focusState,
    focusNodeId: selection.selectedNodeId || view.focusState.focusNodeId,
  }), [view.focusState, selection.selectedNodeId]);

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

  const isDrawerOpen = view.isInvestigating || isPinned;

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorScreen error={error} onRetry={retry} />;

  return (
    <SelectionProvider value={selection}>
      <div className="app-layout">
        <Header onResetView={handleResetView} />
        <main className="graph-pane">
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
          />
        </main>
        {isDrawerOpen && (
          <InvestigationDrawer
            node={selectedNode}
            open={isDrawerOpen}
            onClose={() => {
              if (!isPinned) {
                view.setIsInvestigating(false);
              }
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
        )}
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
          onSelectFinding={handleSelectFinding}
          onClearFinding={handleClearFinding}
          compareState={compareState}
          activeRiskFilter={view.filterState.riskFilter}
          onRiskFilterChange={(risk) => view.setFilterState({ ...view.filterState, riskFilter: risk })}
          onSelectNode={(nodeId) => {
            selection.selectNode(nodeId);
            view.setIsInvestigating(true);
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
          }}
          onShowImpact={() => {
            if (selection.selectedNodeId) {
              view.setImpactState({ enabled: true, originNodeId: selection.selectedNodeId, depth: 'ALL' });
            }
          }}
          onToggleViewMode={() => {
            view.setViewMode(view.viewMode === 'graph' ? 'findings' : 'graph');
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
