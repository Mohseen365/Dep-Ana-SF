import React, { useCallback, useId, useState } from 'react';
import { ImpactState, ImpactDepth, ImpactAnalysisResult } from '../lib/impact-analysis';
import { ExplorerNode } from '../types/explorer';

interface ImpactControlsProps {
  impactState: ImpactState;
  impactResult: ImpactAnalysisResult | null;
  onImpactChange: (newState: ImpactState) => void;
  onExitImpact: () => void;
  selectedNode: ExplorerNode | null;
  onShowImpact: (nodeId: string) => void;
}

export const ImpactControls: React.FC<ImpactControlsProps> = ({
  impactState,
  impactResult,
  onImpactChange,
  onExitImpact,
  selectedNode,
  onShowImpact
}) => {
  const controlId = useId();
  const active = Boolean(impactState.enabled);
  const [showAffectedList, setShowAffectedList] = useState<boolean>(false);

  const handleDepthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const depth = value === 'ALL' ? 'ALL' : (parseInt(value, 10) as ImpactDepth);
    onImpactChange({
      ...impactState,
      depth
    });
  }, [impactState, onImpactChange]);

  const handleToggleClick = useCallback(() => {
    if (active) {
      onExitImpact();
    } else if (selectedNode) {
      onShowImpact(selectedNode.id);
    }
  }, [active, selectedNode, onExitImpact, onShowImpact]);

  const originName = impactResult?.originNode?.displayName || selectedNode?.displayName || '';
  const originType = impactResult?.originNode?.type || selectedNode?.type || '';
  const originRisk = impactResult?.originNode?.risk || selectedNode?.risk || 'LOW';

  return (
    <div className={`impact-controls ${active ? 'active' : ''}`}>
      {/* Consistent Navigation Banner */}
      <div className="analysis-mode-nav">
        <span className="nav-mode-item">Graph</span>
        <span className="nav-mode-item">Findings</span>
        <span className="nav-mode-item">Hotspots</span>
        <span className="nav-mode-item active">Impact</span>
        <span className="nav-mode-item">Compare</span>
      </div>

      <div className="impact-header">
        <button
          className={`impact-toggle-btn ${active ? 'active' : ''}`}
          onClick={handleToggleClick}
          disabled={!active && !selectedNode}
          title={
            active
              ? 'Exit Impact Mode'
              : selectedNode
              ? `Show Refactoring Impact for ${selectedNode.displayName}`
              : 'Select a component to show impact'
          }
        >
          <span className="impact-icon" aria-hidden="true">💥</span>
          {active ? 'Exit Impact' : 'Show Impact'}
        </button>

        {active && (
          <div className="impact-origin-tag">
            <span className="impact-label">IMPACT MODE:</span>
            <span className="impact-origin-name">★ {originName} ★</span>
            <span className={`badge risk-badge risk-${originRisk.toLowerCase()}`}>
              {originType} • {originRisk} RISK
            </span>
          </div>
        )}
      </div>

      {active && impactResult && (
        <>
          <div className="impact-options">
            <div className="impact-option" role="group" aria-labelledby={`${controlId}-impact-direction-label`}>
              <span id={`${controlId}-impact-direction-label`} className="impact-direction-label">Impact Direction:</span>
              <span className="impact-direction-badge">← Dependents (Affected)</span>
            </div>

            <div className="impact-option">
              <label htmlFor={`${controlId}-depth`}>Depth:</label>
              <select
                id={`${controlId}-depth`}
                value={impactState.depth === 'ALL' ? 'ALL' : String(impactState.depth)}
                onChange={handleDepthChange}
                className="impact-select"
              >
                <option value="1">Depth 1 (Direct)</option>
                <option value="2">Depth 2</option>
                <option value="3">Depth 3</option>
                <option value="ALL">ALL (Transitive)</option>
              </select>
            </div>
          </div>

          {/* Structured Summary Cards Grid */}
          <div className="impact-summary-metrics">
            <div className="impact-metric">
              <span className="metric-lbl">Direct Dependents:</span>
              <span className="metric-val">{impactResult.summaryMetrics.directDependentsCount}</span>
            </div>
            <div className="impact-metric">
              <span className="metric-lbl">Transitive Dependents:</span>
              <span className="metric-val">{impactResult.summaryMetrics.transitiveDependentsCount}</span>
            </div>
            <div className="impact-metric">
              <span className="metric-lbl">Impacted Components:</span>
              <span className="metric-val">
                {impactResult.summaryMetrics.impactedComponentsCount}
                {impactResult.summaryMetrics.visibleImpactedCount !== impactResult.summaryMetrics.impactedComponentsCount && (
                  <span className="filter-visible-count">
                    ({impactResult.summaryMetrics.visibleImpactedCount} visible)
                  </span>
                )}
              </span>
            </div>
            <div className="impact-metric">
              <span className="metric-lbl">Impacted Tests:</span>
              <span className="metric-val">{impactResult.summaryMetrics.impactedTestsCount}</span>
            </div>
            <div className="impact-metric">
              <span className="metric-lbl">Cycles Involved:</span>
              <span className="metric-val">{impactResult.summaryMetrics.cyclesInvolvedCount}</span>
            </div>
            <div className="impact-metric">
              <span className="metric-lbl">Unresolved Refs:</span>
              <span className="metric-val">{impactResult.summaryMetrics.unresolvedCount}</span>
            </div>
          </div>

          {/* Progressive Disclosure Section for Direct & Transitive Dependents Breakdown */}
          <div className="impact-breakdown-section">
            <div
              className="breakdown-header"
              onClick={() => setShowAffectedList(!showAffectedList)}
            >
              <span className="breakdown-title">
                <span aria-hidden="true">🔍</span> Affected Dependents & Test Breakdown ({impactResult.affectedNodeIds.size - 1})
              </span>
              <button className="breakdown-toggle-btn">
                {showAffectedList ? '▲ Hide' : '▼ Details'}
              </button>
            </div>

            {showAffectedList && (
              <div className="breakdown-content">
                <div className="breakdown-group">
                  <h5>Direct Dependents ({impactResult.directDependentIds.length}):</h5>
                  <div className="breakdown-pills">
                    {impactResult.directDependentIds.length === 0 ? (
                      <span className="no-items-text">No direct dependents.</span>
                    ) : (
                      impactResult.directDependentIds.map(id => (
                        <span key={id} className="pill direct-pill">
                          {id.split(':')[1] || id}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="breakdown-group">
                  <h5>Impacted Tests ({impactResult.impactedTestNodeIds.length}):</h5>
                  <div className="breakdown-pills">
                    {impactResult.impactedTestNodeIds.length === 0 ? (
                      <span className="no-items-text">No impacted unit tests detected.</span>
                    ) : (
                      impactResult.impactedTestNodeIds.map(id => (
                        <span key={id} className="pill test-pill">
                          <span aria-hidden="true">🧪</span> {id.split(':')[1] || id}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!active && !selectedNode && (
        <span className="impact-hint">Select a component to show blast radius / impact analysis</span>
      )}
    </div>
  );
};

export default ImpactControls;
