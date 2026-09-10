import React, { useEffect, useState } from 'react';
import { ExplorerDataSchema, ExplorerNode } from './types/explorer';
import { Header } from './components/Header';
import { SummaryBar } from './components/SummaryBar';
import { GraphView } from './components/GraphView';
import { DetailsPanel } from './components/DetailsPanel';
import './index.css';

export const App: React.FC = () => {
  const [data, setData] = useState<ExplorerDataSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ExplorerNode | null>(null);

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

  const selectedImpact = selectedNode ? data.impactSummaries[selectedNode.id] || null : null;

  return (
    <div className="app-layout">
      <Header />
      <SummaryBar summary={data.summary} />
      <div className="main-viewport">
        <GraphView
          nodes={data.nodes}
          edges={data.edges}
          onSelectNode={setSelectedNode}
          selectedNodeId={selectedNode?.id || null}
        />
        <DetailsPanel
          node={selectedNode}
          impactSummary={selectedImpact}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
};

export default App;
