import React from 'react';
import { ExplorerSummary, ExplorerRiskLevel } from '../types/explorer';

interface SummaryBarProps {
  summary: ExplorerSummary;
  activeRiskFilter?: ExplorerRiskLevel | '';
  onRiskFilterChange?: (risk: ExplorerRiskLevel) => void;
  onCyclesClick?: () => void;
  onUnresolvedClick?: () => void;
  activeDiagnosticTab?: 'cycles' | 'unresolved' | 'none';
}

export const SummaryBar: React.FC<SummaryBarProps> = ({
  summary,
  activeRiskFilter = '',
  onRiskFilterChange,
  onCyclesClick,
  onUnresolvedClick,
  activeDiagnosticTab = 'none'
}) => {
  return (
    <div className="summary-bar">
      <div className="summary-item">
        <span className="summary-label">Nodes</span>
        <span className="summary-value">{summary.nodeCount}</span>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <span className="summary-label">Edges</span>
        <span className="summary-value">{summary.edgeCount}</span>
      </div>
      <div className="summary-divider" />
      <div
        className={`summary-item summary-clickable ${activeRiskFilter === 'HIGH' ? 'active' : ''}`}
        onClick={() => onRiskFilterChange?.('HIGH')}
        title="Click to filter graph by High Risk components"
        role="button"
        tabIndex={0}
      >
        <span className="summary-label">High Risk</span>
        <span className="summary-value risk-high">{summary.highRiskCount}</span>
      </div>
      <div className="summary-divider" />
      <div
        className={`summary-item summary-clickable ${activeRiskFilter === 'MEDIUM' ? 'active' : ''}`}
        onClick={() => onRiskFilterChange?.('MEDIUM')}
        title="Click to filter graph by Medium Risk components"
        role="button"
        tabIndex={0}
      >
        <span className="summary-label">Medium Risk</span>
        <span className="summary-value risk-medium">{summary.mediumRiskCount}</span>
      </div>
      <div className="summary-divider" />
      <div
        className={`summary-item summary-clickable ${activeRiskFilter === 'LOW' ? 'active' : ''}`}
        onClick={() => onRiskFilterChange?.('LOW')}
        title="Click to filter graph by Low Risk components"
        role="button"
        tabIndex={0}
      >
        <span className="summary-label">Low Risk</span>
        <span className="summary-value risk-low">{summary.lowRiskCount}</span>
      </div>
      <div className="summary-divider" />
      <div
        className={`summary-item summary-clickable ${activeDiagnosticTab === 'cycles' ? 'active' : ''}`}
        onClick={() => onCyclesClick?.()}
        title="Click to inspect circular dependencies"
        role="button"
        tabIndex={0}
      >
        <span className="summary-label">Cycles</span>
        <span className="summary-value">{summary.cycleCount}</span>
      </div>
      <div className="summary-divider" />
      <div
        className={`summary-item summary-clickable ${activeDiagnosticTab === 'unresolved' ? 'active' : ''}`}
        onClick={() => onUnresolvedClick?.()}
        title="Click to inspect unresolved references"
        role="button"
        tabIndex={0}
      >
        <span className="summary-label">Unresolved</span>
        <span className="summary-value">{summary.unresolvedCount}</span>
      </div>
    </div>
  );
};
