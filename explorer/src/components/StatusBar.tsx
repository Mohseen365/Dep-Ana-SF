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
            <span className="status-val" style={{ color: '#60a5fa' }}>{selectedNodeName}</span>
          </div>
        )}
        {cycleCount > 0 && (
          <div className="status-item">
            <span style={{ color: '#f59e0b' }}>⚠️ Cycles: {cycleCount}</span>
          </div>
        )}
        {unresolvedCount > 0 && (
          <div className="status-item">
            <span style={{ color: '#ef4444' }}>⚠️ Unresolved: {unresolvedCount}</span>
          </div>
        )}
        <div className="status-item">
          <span style={{ color: '#10b981' }}>● Ready</span>
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;