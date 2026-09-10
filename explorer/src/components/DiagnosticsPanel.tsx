import React from 'react';
import {
  ExplorerCycleGroup,
  ExplorerUnresolvedReference,
  ExplorerNode
} from '../types/explorer';

export interface DiagnosticsPanelProps {
  cycles: ExplorerCycleGroup[];
  unresolvedReferences: ExplorerUnresolvedReference[];
  nodes: ExplorerNode[];
  activeTab: 'cycles' | 'unresolved' | 'none';
  selectedCycleId: string | null;
  selectedUnresolvedEdgeId: string | null;
  onSelectCycle: (cycle: ExplorerCycleGroup | null) => void;
  onSelectUnresolved: (ref: ExplorerUnresolvedReference | null) => void;
  onTabChange: (tab: 'cycles' | 'unresolved' | 'none') => void;
}

/**
 * Helper to get user-friendly display name for a node ID.
 */
function getNodeDisplayName(nodeId: string, nodes: ExplorerNode[]): string {
  const found = nodes.find((n) => n.id === nodeId);
  if (found) return found.displayName;
  if (nodeId.includes(':')) {
    return nodeId.split(':')[1];
  }
  return nodeId;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  cycles,
  unresolvedReferences,
  nodes,
  activeTab,
  selectedCycleId,
  selectedUnresolvedEdgeId,
  onSelectCycle,
  onSelectUnresolved,
  onTabChange
}) => {
  if (activeTab === 'none') {
    return null;
  }

  return (
    <div className="diagnostics-panel">
      <div className="diagnostics-header">
        <div className="diagnostics-tabs">
          <button
            className={`diagnostics-tab ${activeTab === 'cycles' ? 'active' : ''}`}
            onClick={() => onTabChange('cycles')}
          >
            Cycles ({cycles.length})
          </button>
          <button
            className={`diagnostics-tab ${activeTab === 'unresolved' ? 'active' : ''}`}
            onClick={() => onTabChange('unresolved')}
          >
            Unresolved ({unresolvedReferences.length})
          </button>
        </div>
        <button
          className="close-btn"
          onClick={() => onTabChange('none')}
          title="Close diagnostics panel"
        >
          ×
        </button>
      </div>

      <div className="diagnostics-content">
        {activeTab === 'cycles' && (
          <div className="cycles-view">
            <h3>Circular Dependency Diagnostics</h3>
            <p className="diagnostics-subtitle">
              Analyzer-detected dependency loops. Select a cycle to highlight participating components on the graph.
            </p>

            {cycles.length === 0 ? (
              <div className="diagnostics-empty">
                ✓ No circular dependencies detected in source graph.
              </div>
            ) : (
              <div className="cycles-list">
                {cycles.map((cycle, index) => {
                  const isSelected = selectedCycleId === cycle.id;
                  // Construct cycle flow display: Node1 -> Node2 -> ... -> Node1
                  const flowNodes = [...cycle.nodes];
                  if (flowNodes.length > 0 && flowNodes[0] !== flowNodes[flowNodes.length - 1]) {
                    flowNodes.push(flowNodes[0]);
                  }

                  return (
                    <div
                      key={cycle.id || index}
                      className={`cycle-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="cycle-card-header">
                        <h4>Circular Dependency #{index + 1}</h4>
                        <span className="cycle-size-badge">{cycle.nodes.length} components</span>
                      </div>

                      <div className="cycle-flow">
                        {flowNodes.map((nodeId, idx) => (
                          <React.Fragment key={idx}>
                            <div className="cycle-flow-node">
                              {getNodeDisplayName(nodeId, nodes)}
                            </div>
                            {idx < flowNodes.length - 1 && (
                              <div className="cycle-flow-arrow">↓</div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      <div className="cycle-actions">
                        {isSelected ? (
                          <button
                            className="cycle-btn clear-btn"
                            onClick={() => onSelectCycle(null)}
                          >
                            Clear Cycle Highlight
                          </button>
                        ) : (
                          <button
                            className="cycle-btn highlight-btn"
                            onClick={() => onSelectCycle(cycle)}
                          >
                            Highlight Cycle on Graph
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'unresolved' && (
          <div className="unresolved-view">
            <h3>Unresolved Reference Diagnostics</h3>
            <div className="semantic-distinction-banner">
              <strong>Semantic Distinction:</strong>
              <p>
                Dependency/reference exists in source code, but target symbol is unresolved in registry.
              </p>
            </div>

            {unresolvedReferences.length === 0 ? (
              <div className="diagnostics-empty">
                ✓ No unresolved references detected in source graph.
              </div>
            ) : (
              <div className="unresolved-list">
                {unresolvedReferences.map((ref, index) => {
                  const isSelected = selectedUnresolvedEdgeId === ref.edgeId;

                  return (
                    <div
                      key={ref.edgeId || index}
                      className={`unresolved-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="unresolved-card-header">
                        <h4>{ref.targetName}</h4>
                        <span className="unresolved-type-badge">{ref.targetType}</span>
                      </div>

                      <div className="unresolved-details-grid">
                        <div>
                          <span className="label">Source Component:</span>
                          <span className="value">
                            {getNodeDisplayName(ref.sourceNodeId, nodes)}
                          </span>
                        </div>
                        <div>
                          <span className="label">Target Symbol:</span>
                          <span className="value">{ref.targetName}</span>
                        </div>
                        <div>
                          <span className="label">Target Type:</span>
                          <span className="value">{ref.targetType}</span>
                        </div>
                        <div>
                          <span className="label">Location:</span>
                          <span className="value">
                            {ref.file}:{ref.line ?? '?'}
                          </span>
                        </div>
                      </div>

                      <div className="unresolved-section">
                        <span className="label">Evidence:</span>
                        <code className="unresolved-code">
                          {ref.evidence || 'No evidence code available'}
                        </code>
                      </div>

                      <div className="unresolved-section">
                        <span className="label">Reason:</span>
                        <p className="unresolved-reason">{ref.reason}</p>
                      </div>

                      <div className="unresolved-actions">
                        <button
                          className="unresolved-btn"
                          onClick={() => onSelectUnresolved(ref)}
                        >
                          {isSelected ? 'Edge Selected' : 'Inspect Edge & Evidence'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
