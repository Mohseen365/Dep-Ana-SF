import React, { useState, useEffect } from 'react';
import type {
  ProjectSnapshot,
  ProjectAnalysisHistory,
  ProjectMetadata,
  ExplorerDataSchema,
} from '../types/explorer';
import {
  loadProjectHistory,
  setActiveSnapshot as setActiveSnapshotInStorage,
  calculateSnapshotDelta,
} from '../lib/projectHistory';
import type { UseCompareStateReturn } from '../hooks/useCompareState';

export interface AnalysisHistoryPanelProps {
  projectId?: string;
  projectMeta?: ProjectMetadata | null;
  currentData?: ExplorerDataSchema | null;
  compareState?: UseCompareStateReturn | null;
  onSelectSnapshot?: (snapshot: ProjectSnapshot) => void;
  onCompareSnapshots?: (beforeSnapshot: ProjectSnapshot, afterSnapshot: ProjectSnapshot) => void;
  onClose?: () => void;
  className?: string;
}

export const AnalysisHistoryPanel: React.FC<AnalysisHistoryPanelProps> = ({
  projectId = 'default',
  projectMeta,
  currentData,
  compareState,
  onSelectSnapshot,
  onCompareSnapshots,
  onClose,
  className = '',
}) => {
  const [history, setHistory] = useState<ProjectAnalysisHistory>(() =>
    loadProjectHistory(projectId, projectMeta, currentData)
  );

  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    const loaded = loadProjectHistory(projectId, projectMeta, currentData);
    setHistory(loaded);
  }, [projectId, projectMeta, currentData]);

  const handleActivateSnapshot = (snap: ProjectSnapshot) => {
    const updated = setActiveSnapshotInStorage(projectId, snap.id, projectMeta, currentData);
    setHistory(updated);
    if (onSelectSnapshot) {
      onSelectSnapshot(snap);
    }
  };

  const handleCompareWithActive = (targetSnap: ProjectSnapshot) => {
    const activeSnap = history.snapshots.find((s) => s.isActive) || history.snapshots[0];
    if (!activeSnap) return;

    if (onCompareSnapshots) {
      onCompareSnapshots(targetSnap, activeSnap);
    } else if (compareState) {
      if (targetSnap.rawSchemaJson) {
        compareState.setBeforeRaw(targetSnap.rawSchemaJson);
      }
      if (activeSnap.rawSchemaJson) {
        compareState.setAfterRaw(activeSnap.rawSchemaJson);
      }
      compareState.runCompare();
    }
  };

  const handleToggleCompareSelection = (snapId: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(snapId)) {
        return prev.filter((id) => id !== snapId);
      }
      if (prev.length >= 2) {
        return [prev[1], snapId];
      }
      return [...prev, snapId];
    });
  };

  const handleRunPairwiseCompare = () => {
    if (selectedForCompare.length !== 2) return;
    const snapA = history.snapshots.find((s) => s.id === selectedForCompare[0]);
    const snapB = history.snapshots.find((s) => s.id === selectedForCompare[1]);
    if (!snapA || !snapB) return;

    if (onCompareSnapshots) {
      onCompareSnapshots(snapA, snapB);
    } else if (compareState) {
      if (snapA.rawSchemaJson) compareState.setBeforeRaw(snapA.rawSchemaJson);
      if (snapB.rawSchemaJson) compareState.setAfterRaw(snapB.rawSchemaJson);
      compareState.runCompare();
    }
  };

  return (
    <div
      className={`analysis-history-panel ${className}`}
      data-testid="analysis-history-panel"
      style={{
        background: 'var(--surface-panel, #111827)',
        color: 'var(--text-primary, #f8fafc)',
        borderRadius: 'var(--radius-lg, 8px)',
        border: '1px solid var(--border-default, #334155)',
        padding: 'var(--space-5, 16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4, 12px)',
        maxWidth: '100%',
      }}
    >
      {/* Header */}
      <div
        className="history-panel-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle, #1e293b)',
          paddingBottom: 'var(--space-3, 8px)',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--font-size-lg, 15px)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📜</span> Project Analysis History
          </h2>
          <span
            style={{
              fontSize: 'var(--font-size-sm, 11px)',
              color: 'var(--text-muted, #94a3b8)',
            }}
          >
            Project: <strong>{projectId}</strong> • {history.snapshots.length} Historical Snapshots
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="ui-icon-btn ui-icon-btn-sm"
            aria-label="Close Analysis History"
            data-testid="close-history-btn"
          >
            ✕
          </button>
        )}
      </div>

      {/* Bulk Pairwise Compare Bar */}
      {selectedForCompare.length > 0 && (
        <div
          style={{
            background: 'var(--surface-card, #1e293b)',
            padding: 'var(--space-3, 8px) var(--space-4, 12px)',
            borderRadius: 'var(--radius-md, 6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 'var(--font-size-sm, 11px)',
            border: '1px solid var(--accent-primary, #3b82f6)',
          }}
        >
          <span>
            Selected for comparison: <strong>{selectedForCompare.length}</strong> / 2 snapshots
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={selectedForCompare.length !== 2}
              onClick={handleRunPairwiseCompare}
              className="ui-btn ui-btn-primary ui-btn-sm"
              data-testid="run-pairwise-compare-btn"
            >
              ⚡ Compare Selected Pair
            </button>
            <button
              onClick={() => setSelectedForCompare([])}
              className="ui-btn ui-btn-ghost ui-btn-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Snapshot Timeline List */}
      <div
        className="history-timeline-list"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3, 8px)',
        }}
      >
        {history.snapshots.map((snap, index) => {
          const previousSnap = history.snapshots[index + 1] ?? null;
          const delta = calculateSnapshotDelta(snap, previousSnap);
          const isSelectedCompare = selectedForCompare.includes(snap.id);

          return (
            <div
              key={snap.id}
              className={`snapshot-timeline-card ${snap.isActive ? 'active-snapshot' : ''}`}
              data-testid={`snapshot-card-${snap.id}`}
              style={{
                background: snap.isActive
                  ? 'rgba(59, 130, 246, 0.08)'
                  : 'var(--surface-card, #1e293b)',
                border: snap.isActive
                  ? '1px solid var(--accent-primary, #3b82f6)'
                  : '1px solid var(--border-subtle, #1e293b)',
                borderRadius: 'var(--radius-md, 6px)',
                padding: 'var(--space-4, 12px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2, 4px)',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Card Header & Display Format */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  {/* Exact display per spec: Date, components, dependencies */}
                  <div
                    className="snapshot-date-display"
                    style={{
                      fontSize: 'var(--font-size-md, 13px)',
                      fontWeight: 700,
                      color: 'var(--text-primary, #f8fafc)',
                    }}
                    title={snap.createdAt}
                  >
                    {snap.dateDisplay}
                  </div>
                  <div
                    className="snapshot-component-count"
                    style={{
                      fontSize: 'var(--font-size-sm, 11px)',
                      color: 'var(--text-secondary, #cbd5e1)',
                    }}
                  >
                    {snap.componentCount} components
                  </div>
                  <div
                    className="snapshot-dependency-count"
                    style={{
                      fontSize: 'var(--font-size-sm, 11px)',
                      color: 'var(--text-secondary, #cbd5e1)',
                    }}
                  >
                    {snap.dependencyCount} dependencies
                  </div>
                </div>

                {/* Active Indicator or Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {snap.isActive ? (
                    <span
                      className="ui-badge ui-badge-low"
                      data-testid={`active-badge-${snap.id}`}
                      style={{
                        background: 'rgba(16, 185, 129, 0.18)',
                        color: 'var(--state-success, #10b981)',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full, 9999px)',
                        fontSize: '10px',
                      }}
                    >
                      ● Active Snapshot
                    </span>
                  ) : (
                    <button
                      onClick={() => handleActivateSnapshot(snap)}
                      className="ui-btn ui-btn-ghost ui-btn-sm"
                      data-testid={`activate-btn-${snap.id}`}
                      title="Set this snapshot as active workspace context"
                    >
                      Make Active
                    </button>
                  )}
                </div>
              </div>

              {/* Delta Callout (What Changed) */}
              {previousSnap && (
                <div
                  className="snapshot-delta-summary"
                  style={{
                    marginTop: '4px',
                    paddingTop: '6px',
                    borderTop: '1px dashed var(--border-subtle, #1e293b)',
                    fontSize: '10px',
                    color: 'var(--text-muted, #94a3b8)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Change vs {previousSnap.dateDisplay}:</span>
                  <span
                    style={{
                      color:
                        delta.componentDelta >= 0
                          ? 'var(--text-secondary, #cbd5e1)'
                          : 'var(--state-warning, #f59e0b)',
                    }}
                  >
                    {delta.componentDelta >= 0 ? `+${delta.componentDelta}` : delta.componentDelta} components
                  </span>
                  <span>•</span>
                  <span
                    style={{
                      color:
                        delta.dependencyDelta >= 0
                          ? 'var(--text-secondary, #cbd5e1)'
                          : 'var(--state-warning, #f59e0b)',
                    }}
                  >
                    {delta.dependencyDelta >= 0 ? `+${delta.dependencyDelta}` : delta.dependencyDelta} dependencies
                  </span>
                  {delta.cycleDelta !== 0 && (
                    <>
                      <span>•</span>
                      <span style={{ color: 'var(--risk-high, #ef4444)' }}>
                        {delta.cycleDelta > 0 ? `+${delta.cycleDelta}` : delta.cycleDelta} cycles
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Card Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '6px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelectedCompare}
                    onChange={() => handleToggleCompareSelection(snap.id)}
                  />
                  Select for compare
                </label>

                {!snap.isActive && (
                  <button
                    onClick={() => handleCompareWithActive(snap)}
                    className="ui-btn ui-btn-secondary ui-btn-sm"
                    data-testid={`compare-active-btn-${snap.id}`}
                  >
                    ⚡ Compare with Active
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
