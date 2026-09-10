import React from 'react';
import { ExplorerSummary } from '../types/explorer';

interface SummaryBarProps {
  summary: ExplorerSummary;
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ summary }) => {
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
      <div className="summary-item">
        <span className="summary-label">High Risk</span>
        <span className="summary-value risk-high">{summary.highRiskCount}</span>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <span className="summary-label">Medium Risk</span>
        <span className="summary-value risk-medium">{summary.mediumRiskCount}</span>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <span className="summary-label">Low Risk</span>
        <span className="summary-value risk-low">{summary.lowRiskCount}</span>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <span className="summary-label">Cycles</span>
        <span className="summary-value">{summary.cycleCount}</span>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <span className="summary-label">Unresolved</span>
        <span className="summary-value">{summary.unresolvedCount}</span>
      </div>
    </div>
  );
};
