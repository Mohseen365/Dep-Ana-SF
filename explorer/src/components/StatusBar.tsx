import React from 'react';

interface StatusBarProps {
  totalNodes: number;
  totalEdges: number;
  visibleNodes: number;
  selectedNodeName?: string | null;
  activeFilterCount: number;
  cycleCount: number;
  unresolvedCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  totalNodes,
  totalEdges,
  visibleNodes,
  selectedNodeName,
  activeFilterCount,
  cycleCount,
  unresolvedCount
}) => {
  return (
    <footer className="status-bar" role="contentinfo" aria-label="Explorer status bar">
      <div className="status-left">
        <div className="status-item">
          <span>Components:</span>
          <span className="status-val">{visibleNodes} / {totalNodes}</span>
        </div>
        <div className="status-item">
          <span>Relationships:</span>
          <span className="status-val">{totalEdges}</span>
        </div>
        {activeFilterCount > 0 && (
          <div className="status-item">
            <span>Filters:</span>
            <span className="status-val">{activeFilterCount} active</span>
          </div>
        )}
      </div>

      <div className="status-right">
        {selectedNodeName && (
          <div className="status-item">
            <span>Selected:</span>
            <span className="status-val status-selected">{selectedNodeName}</span>
          </div>
        )}
        {cycleCount > 0 && (
          <div className="status-item status-warning">
            <span>⚠️ Cycles: {cycleCount}</span>
          </div>
        )}
        {unresolvedCount > 0 && (
          <div className="status-item status-error">
            <span>⚠️ Unresolved: {unresolvedCount}</span>
          </div>
        )}
        <div className="status-item ui-status-indicator">
          <span className="ui-status-dot ui-status-success" aria-hidden="true" />
          <span>Ready</span>
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;
