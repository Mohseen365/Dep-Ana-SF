import React, { useCallback } from 'react';
import { ImpactState, ImpactDepth, ImpactAnalysisResult, isImpactActive } from '../lib/impact-analysis';
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
  const active = isImpactActive(impactState) && impactResult !== null;

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

  return (
    <div className={`impact-controls ${active ? 'active' : ''}`}>
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
          <span className="impact-icon">💥</span>
          {active ? 'Exit Impact' : 'Show Impact'}
        </button>

        {active && (
          <div className="impact-origin-tag">
            <span className="impact-label">IMPACT MODE:</span>
            <span className="impact-origin-name">★ {originName} ★</span>
          </div>
        )}
      </div>

      {active && impactResult && (
        <>
          <div className="impact-options">
            <div className="impact-option">
              <label>Impact Direction:</label>
              <span className="impact-direction-badge">← Dependents (Affected)</span>
            </div>

            <div className="impact-option">
              <label>Depth:</label>
              <select
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
        </>
      )}

      {!active && !selectedNode && (
        <span className="impact-hint">Select a component to show blast radius / impact analysis</span>
      )}
    </div>
  );
};

export default ImpactControls;
