import React, { useMemo, useState } from 'react';
import { ExplorerSummary, ExplorerRiskLevel, ExplorerDataSchema } from '../types/explorer';
import { calculateArchitectureHealth } from '../lib/health';
import { HealthSummary } from './HealthSummary';

interface SummaryBarProps {
  summary: ExplorerSummary;
  data?: ExplorerDataSchema | null;
  activeRiskFilter?: ExplorerRiskLevel | '';
  onRiskFilterChange?: (risk: ExplorerRiskLevel) => void;
  onCyclesClick?: () => void;
  onUnresolvedClick?: () => void;
  activeDiagnosticTab?: 'cycles' | 'unresolved' | 'none';
}

export const SummaryBar: React.FC<SummaryBarProps> = ({
  summary,
  data = null,
  activeRiskFilter = '',
  onRiskFilterChange,
  onCyclesClick,
  onUnresolvedClick,
  activeDiagnosticTab = 'none'
}) => {
  const [showHealthModal, setShowHealthModal] = useState(false);

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

  const handleRiskFilterKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    risk: ExplorerRiskLevel
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRiskFilterChange?.(risk);
    }
  };

  const handleDiagnosticKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    callback?: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback?.();
    }
  };

  return (
    <>
      <div className="summary-bar">
        <div
          className="summary-item health-summary-trigger summary-clickable"
          onClick={() => setShowHealthModal(true)}
          title="Click to view Architecture Health details"
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setShowHealthModal(true);
            }
          }}
        >
          <span className="summary-label">Health</span>
          <span
            className={`summary-value health-score-pill ${getHealthTagClass(
              health.level
            )}`}
          >
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

        <div
          className={`summary-item summary-clickable ${
            activeRiskFilter === 'HIGH' ? 'active' : ''
          }`}
          onClick={() => onRiskFilterChange?.('HIGH')}
          onKeyDown={(event) => handleRiskFilterKeyDown(event, 'HIGH')}
          title="Click to filter graph by High Risk components"
          role="button"
          tabIndex={0}
        >
          <span className="summary-label">High Risk</span>
          <span className="summary-value risk-high">
            {summary.highRiskCount}
          </span>
        </div>

        <div className="summary-divider" />

        <div
          className={`summary-item summary-clickable ${
            activeRiskFilter === 'MEDIUM' ? 'active' : ''
          }`}
          onClick={() => onRiskFilterChange?.('MEDIUM')}
          onKeyDown={(event) => handleRiskFilterKeyDown(event, 'MEDIUM')}
          title="Click to filter graph by Medium Risk components"
          role="button"
          tabIndex={0}
        >
          <span className="summary-label">Medium Risk</span>
          <span className="summary-value risk-medium">
            {summary.mediumRiskCount}
          </span>
        </div>

        <div className="summary-divider" />

        <div
          className={`summary-item summary-clickable ${
            activeRiskFilter === 'LOW' ? 'active' : ''
          }`}
          onClick={() => onRiskFilterChange?.('LOW')}
          onKeyDown={(event) => handleRiskFilterKeyDown(event, 'LOW')}
          title="Click to filter graph by Low Risk components"
          role="button"
          tabIndex={0}
        >
          <span className="summary-label">Low Risk</span>
          <span className="summary-value risk-low">
            {summary.lowRiskCount}
          </span>
        </div>

        <div className="summary-divider" />

        <div
          className={`summary-item summary-clickable ${
            activeDiagnosticTab === 'cycles' ? 'active' : ''
          }`}
          onClick={() => onCyclesClick?.()}
          onKeyDown={(event) =>
            handleDiagnosticKeyDown(event, onCyclesClick)
          }
          title="Click to inspect circular dependencies"
          role="button"
          tabIndex={0}
        >
          <span className="summary-label">Cycles</span>
          <span className="summary-value">{summary.cycleCount}</span>
        </div>

        <div className="summary-divider" />

        <div
          className={`summary-item summary-clickable ${
            activeDiagnosticTab === 'unresolved' ? 'active' : ''
          }`}
          onClick={() => onUnresolvedClick?.()}
          onKeyDown={(event) =>
            handleDiagnosticKeyDown(event, onUnresolvedClick)
          }
          title="Click to inspect unresolved references"
          role="button"
          tabIndex={0}
        >
          <span className="summary-label">Unresolved</span>
          <span className="summary-value">
            {summary.unresolvedCount}
          </span>
        </div>
      </div>

      {showHealthModal && (
        <div
          className="health-popover-overlay"
          onClick={() => setShowHealthModal(false)}
          role="presentation"
        >
          <div
            className="health-popover-content"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Architecture Diagnostic"
          >
            <div className="health-popover-header">
              <h3>Architecture Diagnostic</h3>

              <button
                type="button"
                className="close-btn"
                onClick={() => setShowHealthModal(false)}
                aria-label="Close Architecture Diagnostic"
              >
                ×
              </button>
            </div>

            <HealthSummary health={health} />
          </div>
        </div>
      )}
    </>
  );
};