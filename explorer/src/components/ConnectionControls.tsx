import React, { useCallback, useId } from 'react';
import { ConnectionQueryState, ConnectionDirection, ConnectionDepth } from '../lib/url/connectionQuery';
import { ConnectionAnalysis } from '../lib/connection-analysis';
import { ExplorerNode } from '../types/explorer';

export interface ConnectionControlsState extends ConnectionQueryState {
  enabled?: boolean;
  originNodeId?: string | null;
}

export interface ConnectionControlsProps {
  connectionState: ConnectionControlsState;
  connectionResult: ConnectionAnalysis | null;
  onConnectionChange: (newState: ConnectionControlsState) => void;
  onExitConnection: () => void;
  selectedNode: ExplorerNode | null;
  onShowConnection: (nodeId: string) => void;
}

export const ConnectionControls: React.FC<ConnectionControlsProps> = ({
  connectionState,
  connectionResult,
  onConnectionChange,
  onExitConnection,
  selectedNode,
  onShowConnection
}) => {
  const controlId = useId();
  const active = Boolean(connectionState.enabled);

  const handleDirectionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onConnectionChange({
      ...connectionState,
      direction: e.target.value as ConnectionDirection
    });
  }, [connectionState, onConnectionChange]);

  const handleDepthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const depth = value === 'ALL' ? 'ALL' : (parseInt(value, 10) as ConnectionDepth);
    onConnectionChange({
      ...connectionState,
      depth
    });
  }, [connectionState, onConnectionChange]);

  const handleToggleClick = useCallback(() => {
    if (active) {
      onExitConnection();
    } else if (selectedNode) {
      onShowConnection(selectedNode.id);
    }
  }, [active, selectedNode, onExitConnection, onShowConnection]);

  const originName = selectedNode?.displayName || connectionResult?.origin || connectionState.originNodeId || '';

  return (
    <div className={`connection-controls ${active ? 'active' : ''}`} data-testid="connection-controls">
      <div className="connection-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          className={`connection-toggle-btn ui-btn ui-btn-sm ${active ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
          onClick={handleToggleClick}
          disabled={!active && !selectedNode}
          title={
            active
              ? 'Exit Connection Analysis'
              : selectedNode
              ? `Analyze connections for ${selectedNode.displayName}`
              : 'Select a component to analyze connections'
          }
          data-testid="connection-toggle-btn"
        >
          <span className="connection-icon" aria-hidden="true">🔗</span>
          {active ? 'Exit Connections' : 'Analyze Connections'}
        </button>

        {active && (
          <div className="connection-origin-tag" style={{ fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-primary, #3b82f6)' }}>CONNECTION MODE:</span>
            <span className="connection-origin-name">★ {originName} ★</span>
          </div>
        )}
      </div>

      {active && (
        <div className="connection-options" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
          <div className="connection-option" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor={`${controlId}-direction`} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>Direction:</label>
            <select
              id={`${controlId}-direction`}
              value={connectionState.direction}
              onChange={handleDirectionChange}
              className="connection-select ui-input"
              style={{ fontSize: '12px', padding: '2px 6px', height: '26px' }}
              data-testid="connection-direction-select"
            >
              <option value="both">↔ Both</option>
              <option value="dependencies">→ Dependencies</option>
              <option value="dependents">← Dependents</option>
            </select>
          </div>

          <div className="connection-option" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor={`${controlId}-depth`} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>Depth:</label>
            <select
              id={`${controlId}-depth`}
              value={connectionState.depth === 'ALL' ? 'ALL' : String(connectionState.depth)}
              onChange={handleDepthChange}
              className="connection-select ui-input"
              style={{ fontSize: '12px', padding: '2px 6px', height: '26px' }}
              data-testid="connection-depth-select"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="ALL">ALL</option>
            </select>
          </div>

          {connectionResult && (
            <div className="connection-summary-pills" style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary, #cbd5e1)' }}>
              <span className="ui-badge">Paths: {connectionResult.collapsedPathCount}</span>
              <span className="ui-badge">Cycles: {connectionResult.cyclePathCount}</span>
              <span className="ui-badge">Candidates: {connectionResult.investigationPathCount}</span>
            </div>
          )}
        </div>
      )}

      {!active && !selectedNode && (
        <span className="connection-hint" style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px', display: 'block' }}>
          Select a component to analyze method-level connections
        </span>
      )}
    </div>
  );
};

export default ConnectionControls;
