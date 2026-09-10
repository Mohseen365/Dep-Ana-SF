import React, { useState, useMemo } from 'react';
import { ExplorerDataSchema } from '../types/explorer';
import { calculateArchitectureHealth } from '../lib/health';
import { HealthSummary } from './HealthSummary';

interface SummaryBarProps {
  data: ExplorerDataSchema | null;
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ data }) => {
  const [showHealthModal, setShowHealthModal] = useState<boolean>(false);

  const summary = data?.summary || {
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
  };

  const health = useMemo(() => {
    return calculateArchitectureHealth(data);
  }, [data]);

  const getHealthTagClass = (level: string) => {
    switch (level) {
      case 'GOOD':
        return 'health-good';
      case 'CAUTION':
        return 'health-caution';
      case 'HIGH CONCERN':
        return 'health-concern';
      default:
        return '';
    }
  };

  return (
    <>
      <div className="summary-bar">
        <div className="summary-item health-summary-trigger" onClick={() => setShowHealthModal(!showHealthModal)} title="Click to view Architecture Health details">
          <span className="summary-label">Health</span>
          <span className={`summary-value health-score-pill ${getHealthTagClass(health.level)}`}>
            {health.score} / 100 ({health.level})
          </span>
        </div>
        <div className="summary-divider" />
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

      {showHealthModal && (
        <div className="health-popover-overlay" onClick={() => setShowHealthModal(false)}>
          <div className="health-popover-content" onClick={(e) => e.stopPropagation()}>
            <div className="health-popover-header">
              <h3>Architecture Diagnostic</h3>
              <button className="close-btn" onClick={() => setShowHealthModal(false)}>×</button>
            </div>
            <HealthSummary health={health} />
          </div>
        </div>
      )}
    </>
  );
};
