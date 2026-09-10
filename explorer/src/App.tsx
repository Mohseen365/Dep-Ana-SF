import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ExplorerDataSchema, ExplorerNode, ExplorerEdge, ExplorerCycleGroup, ExplorerUnresolvedReference, ExplorerRiskLevel } from './types/explorer';
import { Header } from './components/Header';
import { SummaryBar } from './components/SummaryBar';
import { GraphView } from './components/GraphView';
import { DetailsPanel } from './components/DetailsPanel';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { SearchFilterPanel } from './components/SearchFilterPanel';
import { FocusControls } from './components/FocusControls';
import { HotspotPanel } from './components/HotspotPanel';
import { SearchFilterState, applyFilters, createEmptyFilterState } from './lib/search-filter';
import { FocusState, computeFocusedGraph, createEmptyFocusState, isFocusActive } from './lib/focus-graph';
import './index.css';

export const App: React.FC = () => {
  const [data, setData] = useState<ExplorerDataSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ExplorerNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ExplorerEdge | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<ExplorerCycleGroup | null>(null);
  const [diagnosticTab, setDiagnosticTab] = useState<'cycles' | 'unresolved' | 'none'>('none');
  const [filterState, setFilterState] = useState<SearchFilterState>(createEmptyFilterState());
  const [focusState, setFocusState] = useState<FocusState>(createEmptyFocusState());

  // Update focus state when a node is selected
  useEffect(() => {
    if (selectedNode) {
      setFocusState(prev => ({
        ...prev,
        focusNodeId: selectedNode.id
      }));
    }
  }, [selectedNode]);

  // Apply filters to get display nodes/edges (without modifying original data)
  const filteredData = useMemo(() => {
    if (!data) return { nodes: [], edges: [], matchingNodeIds: new Set<string>() };
    return applyFilters(data.nodes, data.edges, filterState);
  }, [data, filterState]);

  // Compute focused graph from filtered data
  const displayData = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    
    const baseNodes = filteredData.nodes;
    const baseEdges = filteredData.edges;
    
    if (isFocusActive(focusState)) {
      return computeFocusedGraph(baseNodes, baseEdges, focusState);
    }
    
    return { nodes: baseNodes, edges: baseEdges };
  }, [data, filteredData, focusState]);

  useEffect(() => {
    fetch('/explorer-data.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load explorer data: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json: ExplorerDataSchema) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching explorer-data.json:', err);
        setError(err.message || 'Failed to load Explorer data');
        setLoading(false);
      });
  }, []);

  const handleFilterChange = useCallback((newFilterState: SearchFilterState) => {
    setFilterState(newFilterState);
  }, []);

  const handleSelectResult = useCallback((node: ExplorerNode) => {
    setSelectedNode(node);
  }, []);

  const handleSelectEdge = useCallback((edgeId: string) => {
    if (!data) return;
    const edge = data.edges.find(e => e.id === edgeId) || null;
    setSelectedEdge(edge);
    if (edge) {
      setSelectedNode(null);
    }
  }, [data]);

  const handleCloseDetails = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleRiskFilterChange = useCallback((risk: ExplorerRiskLevel) => {
    setFilterState(prev => ({
      ...prev,
      riskFilter: prev.riskFilter === risk ? '' : risk
    }));
  }, []);

  const handleCyclesClick = useCallback(() => {
    setDiagnosticTab(prev => (prev === 'cycles' ? 'none' : 'cycles'));
  }, []);

  const handleUnresolvedClick = useCallback(() => {
    setDiagnosticTab(prev => (prev === 'unresolved' ? 'none' : 'unresolved'));
  }, []);

  const handleSelectCycle = useCallback((cycle: ExplorerCycleGroup | null) => {
    setSelectedCycle(cycle);
  }, []);

  const handleSelectUnresolved = useCallback((ref: ExplorerUnresolvedReference | null) => {
    if (!ref || !data) return;
    const edge = data.edges.find(e => e.id === ref.edgeId);
    if (edge) {
      setSelectedEdge(edge);
      setSelectedNode(null);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="state-screen">
        <div className="spinner" />
        <h2>Loading Architecture Graph...</h2>
        <p>Parsing explorer-data.json contract and constructing view model.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="state-screen state-error">
        <span className="error-icon">⚠️</span>
        <h2>Failed to Load Explorer</h2>
        <p>{error || 'No data available'}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  const selectedImpact = selectedNode && data ? data.impactSummaries[selectedNode.id] || null : null;

  const handleFilterChange = (newFilterState: SearchFilterState) => {
    setFilterState(newFilterState);
  };

  const handleSelectResult = (node: ExplorerNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleSelectEdge = useCallback((edgeId: string) => {
    if (!data) return;
    const edge = data.edges.find(e => e.id === edgeId) || null;
    setSelectedEdge(edge);
    if (edge) {
      setSelectedNode(null);
    }
  }, [data]);

  const handleCloseDetails = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  return (
    <div className="app-layout">
      <Header />
      <SummaryBar
        summary={data?.summary || {
          nodeCount: 0,
          edgeCount: 0,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          cycleCount: 0,
          unresolvedCount: 0,
          inventory: {
            files: 0,
            apexClasses: 0,
            apexTriggers: 0,
            lwcJs: 0,
            lwcHtml: 0,
            visualforce: 0,
            flows: 0,
            objects: 0,
            fields: 0
          }
        }}
        activeRiskFilter={filterState.riskFilter}
        onRiskFilterChange={handleRiskFilterChange}
        onCyclesClick={handleCyclesClick}
        onUnresolvedClick={handleUnresolvedClick}
        activeDiagnosticTab={diagnosticTab}
      />
      <SearchFilterPanel
        nodes={data?.nodes || []}
        filterState={filterState}
        onFilterChange={handleFilterChange}
        onSelectResult={handleSelectResult}
      />
      <HotspotPanel
        nodes={data?.nodes || []}
        cycles={data?.cycles || []}
        impactSummaries={data?.impactSummaries || {}}
        onSelectHotspot={handleSelectResult}
        selectedNodeId={selectedNode?.id || null}
      />
      <FocusControls
        focusState={focusState}
        onFocusChange={setFocusState}
        hasSelectedNode={!!selectedNode}
      />
      <div className="main-viewport">
        <GraphView
          nodes={displayData.nodes}
          edges={displayData.edges}
          onSelectNode={(node) => {
            setSelectedNode(node);
            if (node) setSelectedEdge(null);
          }}
          onSelectEdge={handleSelectEdge}
          selectedNodeId={selectedNode?.id || null}
          selectedEdgeId={selectedEdge?.id || null}
          selectedCycleNodeIds={selectedCycle?.nodes || null}
        />
        {diagnosticTab !== 'none' && (
          <DiagnosticsPanel
            cycles={data?.cycles || []}
            unresolvedReferences={data?.unresolvedReferences || []}
            nodes={data?.nodes || []}
            activeTab={diagnosticTab}
            selectedCycleId={selectedCycle?.id || null}
            selectedUnresolvedEdgeId={selectedEdge?.id || null}
            onSelectCycle={handleSelectCycle}
            onSelectUnresolved={handleSelectUnresolved}
            onTabChange={setDiagnosticTab}
          />
        )}
        <DetailsPanel
          node={selectedNode}
          edge={selectedEdge}
          impactSummary={selectedImpact}
          onClose={handleCloseDetails}
        />
      </div>
    </div>
  );
};

export default App;
