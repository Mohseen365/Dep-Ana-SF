import React, { useState } from 'react';
import type { UseCompareStateReturn } from '../hooks/useCompareState';
import type {
  DiffNodeItem,
  DiffNodeChange,
  DiffEdgeItem,
  DiffCycleItem,
  DiffNodeChangeProperty,
} from '../lib/diff-adapter';

export interface ComparePanelProps {
  compareState: UseCompareStateReturn;
  onClose?: () => void;
}

type ChangeCategoryFilter = 'ALL' | 'NODES' | 'EDGES' | 'CYCLES';

export const ComparePanel: React.FC<ComparePanelProps> = ({ compareState, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<ChangeCategoryFilter>('ALL');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isBefore: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (isBefore) {
        compareState.setBeforeRaw(content);
      } else {
        compareState.setAfterRaw(content);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadPresetSamples = () => {
    const sampleBefore = JSON.stringify(
      {
        schemaVersion: 5,
        analyzerVersion: '13',
        snapshotIdentity: 'arch-snap-sha256:before-sample',
        components: [
          { id: 'ApexClass:ServiceA', name: 'ServiceA', type: 'ApexClass', risk: 'LOW', metrics: { coupling: 1 } },
          { id: 'ApexClass:ServiceB', name: 'ServiceB', type: 'ApexClass', risk: 'LOW', metrics: { coupling: 1 } },
        ],
        relationships: [
          { from: 'ApexClass:ServiceA', to: 'ApexClass:ServiceB', type: 'method-call', method: 'execute' },
        ],
        cycles: [],
      },
      null,
      2
    );

    const sampleAfter = JSON.stringify(
      {
        schemaVersion: 5,
        analyzerVersion: '13',
        snapshotIdentity: 'arch-snap-sha256:after-sample',
        components: [
          { id: 'ApexClass:ServiceA', name: 'ServiceA', type: 'ApexClass', risk: 'HIGH', metrics: { coupling: 5 } },
          { id: 'ApexClass:ServiceB', name: 'ServiceB', type: 'ApexClass', risk: 'LOW', metrics: { coupling: 1 } },
          { id: 'ApexClass:ServiceC', name: 'ServiceC', type: 'ApexClass', risk: 'LOW', metrics: { coupling: 0 } },
        ],
        relationships: [
          { from: 'ApexClass:ServiceA', to: 'ApexClass:ServiceB', type: 'method-call', method: 'execute' },
          { from: 'ApexClass:ServiceB', to: 'ApexClass:ServiceC', type: 'method-call', method: 'process' },
        ],
        cycles: [],
      },
      null,
      2
    );

    compareState.setBeforeRaw(sampleBefore);
    compareState.setAfterRaw(sampleAfter);
  };

  const { diffResult, isActive, error, focusedEntityId } = compareState;

  return (
    <div className="compare-panel-container">
      {/* Consistent Navigation Banner */}
      <div className="analysis-mode-nav">
        <span className="nav-mode-item">Graph</span>
        <span className="nav-mode-item">Findings</span>
        <span className="nav-mode-item">Hotspots</span>
        <span className="nav-mode-item">Impact</span>
        <span className="nav-mode-item active">Compare</span>
      </div>

      <div className="compare-header">
        <h2 className="compare-panel-title">
          <span>🔍</span> Architecture Snapshot Compare
        </h2>
        {isActive && (
          <button
            className="exit-compare-btn"
            onClick={() => {
              compareState.exitCompare();
              if (onClose) onClose();
            }}
          >
            Exit Compare Mode
          </button>
        )}
      </div>

      {/* Workflow Step Indicators */}
      <div className="compare-workflow-steps">
        <div className={`workflow-step ${!isActive ? 'active' : 'completed'}`}>
          <span className="step-num">1</span>
          <span className="step-text">Select Snapshots</span>
        </div>
        <div className="workflow-arrow">➔</div>
        <div className={`workflow-step ${isActive && diffResult ? 'active' : ''}`}>
          <span className="step-num">2</span>
          <span className="step-text">Diff Summary</span>
        </div>
        <div className="workflow-arrow">➔</div>
        <div className={`workflow-step ${isActive && diffResult?.hasChanges ? 'active' : ''}`}>
          <span className="step-num">3</span>
          <span className="step-text">Categorized Inspection</span>
        </div>
      </div>

      {/* Step 1: Input Snapshots Section */}
      {!isActive && (
        <div className="compare-input-section">
          <div className="compare-inputs-grid">
            <div className="compare-input-box">
              <label className="input-label">Before Snapshot (Baseline JSON):</label>
              <textarea
                value={compareState.beforeRaw}
                onChange={(e) => compareState.setBeforeRaw(e.target.value)}
                placeholder="Paste baseline snapshot JSON or select file..."
                rows={6}
                className="compare-textarea"
              />
              <div className="file-upload-row">
                <span className="upload-lbl">Or upload file:</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileUpload(e, true)}
                  className="file-input"
                />
              </div>
            </div>

            <div className="compare-input-box">
              <label className="input-label">After Snapshot (Target JSON):</label>
              <textarea
                value={compareState.afterRaw}
                onChange={(e) => compareState.setAfterRaw(e.target.value)}
                placeholder="Paste target snapshot JSON or select file..."
                rows={6}
                className="compare-textarea"
              />
              <div className="file-upload-row">
                <span className="upload-lbl">Or upload file:</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="file-input"
                />
              </div>
            </div>
          </div>

          <div className="compare-actions-row">
            <button
              onClick={() => compareState.runCompare()}
              className="run-compare-btn"
            >
              ⚡ Compare Snapshots
            </button>

            <button
              onClick={handleLoadPresetSamples}
              className="preset-samples-btn"
            >
              📄 Load Sample Snapshots
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="compare-error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Step 2 & 3: Executive Summary & Categorized Changes */}
      {isActive && diffResult && (
        <div className="compare-results-section">
          {!diffResult.hasChanges ? (
            <div className="no-changes-banner">
              ✨ No architectural changes detected between baseline and target snapshots.
            </div>
          ) : (
            <>
              {/* Executive Diff Summary Cards */}
              <div className="diff-summary-bar">
                <div className="summary-card added">
                  <span className="summary-lbl">+ Nodes</span>
                  <div className="summary-val">+{diffResult.summary.addedNodesCount}</div>
                </div>
                <div className="summary-card removed">
                  <span className="summary-lbl">- Nodes</span>
                  <div className="summary-val">-{diffResult.summary.removedNodesCount}</div>
                </div>
                <div className="summary-card changed">
                  <span className="summary-lbl">Changed Nodes</span>
                  <div className="summary-val">{diffResult.summary.changedNodesCount}</div>
                </div>
                <div className="summary-card added">
                  <span className="summary-lbl">+ Edges</span>
                  <div className="summary-val">+{diffResult.summary.addedEdgesCount}</div>
                </div>
                <div className="summary-card removed">
                  <span className="summary-lbl">- Edges</span>
                  <div className="summary-val">-{diffResult.summary.removedEdgesCount}</div>
                </div>
                <div className="summary-card warning">
                  <span className="summary-lbl">New Cycles</span>
                  <div className="summary-val">+{diffResult.summary.addedCyclesCount}</div>
                </div>
                <div className="summary-card added">
                  <span className="summary-lbl">Removed Cycles</span>
                  <div className="summary-val">-{diffResult.summary.removedCyclesCount}</div>
                </div>
              </div>

              {/* Step 3: Filterable Category Bar */}
              <div className="diff-category-filter">
                <span className="filter-title">Filter Changes:</span>
                <button
                  className={`cat-filter-btn ${activeCategory === 'ALL' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('ALL')}
                >
                  All Changes ({diffResult.summary.totalChangesCount})
                </button>
                <button
                  className={`cat-filter-btn ${activeCategory === 'NODES' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('NODES')}
                >
                  Nodes ({diffResult.summary.addedNodesCount + diffResult.summary.removedNodesCount + diffResult.summary.changedNodesCount})
                </button>
                <button
                  className={`cat-filter-btn ${activeCategory === 'EDGES' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('EDGES')}
                >
                  Edges ({diffResult.summary.addedEdgesCount + diffResult.summary.removedEdgesCount})
                </button>
                <button
                  className={`cat-filter-btn ${activeCategory === 'CYCLES' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('CYCLES')}
                >
                  Cycles ({diffResult.summary.addedCyclesCount + diffResult.summary.removedCyclesCount})
                </button>
              </div>

              {/* Categorized Diff Details List */}
              <div className="diff-details-list">
                {(activeCategory === 'ALL' || activeCategory === 'NODES') && (
                  <>
                    {diffResult.addedNodes.map((n: DiffNodeItem) => (
                      <div
                        key={`added-node-${n.id}`}
                        onClick={() => compareState.focusEntity(n.id)}
                        className={`diff-item item-added ${focusedEntityId === n.id ? 'focused' : ''}`}
                      >
                        <span className="diff-type-badge added">+ Node Added</span>
                        <span className="diff-entity-id"><strong>+ Added Node:</strong> {n.id} ({n.type})</span>
                        <button className="focus-btn" title="Focus component on graph">🔍 Focus</button>
                      </div>
                    ))}

                    {diffResult.removedNodes.map((n: DiffNodeItem) => (
                      <div
                        key={`removed-node-${n.id}`}
                        onClick={() => compareState.focusEntity(n.id)}
                        className={`diff-item item-removed ${focusedEntityId === n.id ? 'focused' : ''}`}
                      >
                        <span className="diff-type-badge removed">- Node Removed</span>
                        <span className="diff-entity-id"><strong>- Removed Node:</strong> {n.id} ({n.type})</span>
                        <button className="focus-btn" title="Focus component on graph">🔍 Focus</button>
                      </div>
                    ))}

                    {diffResult.changedNodes.map((n: DiffNodeChange) => (
                      <div
                        key={`changed-node-${n.id}`}
                        onClick={() => compareState.focusEntity(n.id)}
                        className={`diff-item item-changed ${focusedEntityId === n.id ? 'focused' : ''}`}
                      >
                        <span className="diff-type-badge changed">⚡ Node Modified</span>
                        <div className="diff-change-body">
                          <strong>Changed Node:</strong> {n.id}
                          <div className="diff-prop-changes">
                            {n.changes.map((c: DiffNodeChangeProperty) => `${c.property}: ${c.before} ➔ ${c.after}`).join(', ')}
                          </div>
                        </div>
                        <button className="focus-btn" title="Focus component on graph">🔍 Focus</button>
                      </div>
                    ))}
                  </>
                )}

                {(activeCategory === 'ALL' || activeCategory === 'EDGES') && (
                  <>
                    {diffResult.addedEdges.map((e: DiffEdgeItem) => (
                      <div
                        key={`added-edge-${e.id}`}
                        onClick={() => compareState.focusEntity(e.id)}
                        className={`diff-item item-added ${focusedEntityId === e.id ? 'focused' : ''}`}
                      >
                        <span className="diff-type-badge added">+ Edge Added</span>
                        <span className="diff-entity-id">
                          <strong>+ Added Edge:</strong> {e.source} ➔ {e.target} ({e.relationshipType} {e.method ? `:: ${e.method}` : ''})
                        </span>
                        <button className="focus-btn" title="Focus edge on graph">🔍 Focus</button>
                      </div>
                    ))}

                    {diffResult.removedEdges.map((e: DiffEdgeItem) => (
                      <div
                        key={`removed-edge-${e.id}`}
                        onClick={() => compareState.focusEntity(e.id)}
                        className={`diff-item item-removed ${focusedEntityId === e.id ? 'focused' : ''}`}
                      >
                        <span className="diff-type-badge removed">- Edge Removed</span>
                        <span className="diff-entity-id">
                          <strong>- Removed Edge:</strong> {e.source} ➔ {e.target} ({e.relationshipType} {e.method ? `:: ${e.method}` : ''})
                        </span>
                        <button className="focus-btn" title="Focus edge on graph">🔍 Focus</button>
                      </div>
                    ))}
                  </>
                )}

                {(activeCategory === 'ALL' || activeCategory === 'CYCLES') && (
                  <>
                    {diffResult.cycleChanges.added.map((c: DiffCycleItem) => (
                      <div
                        key={`added-cycle-${c.id}`}
                        className="diff-item item-warning"
                      >
                        <span className="diff-type-badge warning">🔄 Cycle Introduced</span>
                        <span className="diff-entity-id">
                          <strong>New Cycle Introduced:</strong> {c.nodes.join(' ➔ ')}
                        </span>
                      </div>
                    ))}

                    {diffResult.cycleChanges.removed.map((c: DiffCycleItem) => (
                      <div
                        key={`removed-cycle-${c.id}`}
                        className="diff-item item-added"
                      >
                        <span className="diff-type-badge added">✓ Cycle Removed</span>
                        <span className="diff-entity-id">
                          <strong>Cycle Removed:</strong> {c.nodes.join(' ➔ ')}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
