import React from 'react';
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

export const ComparePanel: React.FC<ComparePanelProps> = ({ compareState, onClose }) => {

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
    <div className="compare-panel-container" style={{ padding: '1rem', background: '#1e1e24', color: '#fff', borderRadius: '8px', border: '1px solid #333' }}>
      <div className="compare-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔍</span> Architecture Snapshot Compare
        </h2>
        {isActive && (
          <button
            className="exit-compare-btn"
            onClick={() => {
              compareState.exitCompare();
              if (onClose) onClose();
            }}
            style={{ padding: '0.4rem 0.8rem', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Exit Compare Mode
          </button>
        )}
      </div>

      {!isActive && (
        <div className="compare-input-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Before Snapshot (Baseline JSON):</label>
              <textarea
                value={compareState.beforeRaw}
                onChange={(e) => compareState.setBeforeRaw(e.target.value)}
                placeholder="Paste baseline snapshot JSON or select file..."
                rows={6}
                style={{ width: '100%', fontFamily: 'monospace', padding: '0.5rem', background: '#121216', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
              />
              <input
                type="file"
                accept=".json"
                onChange={(e) => handleFileUpload(e, true)}
                style={{ marginTop: '0.5rem' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>After Snapshot (Target JSON):</label>
              <textarea
                value={compareState.afterRaw}
                onChange={(e) => compareState.setAfterRaw(e.target.value)}
                placeholder="Paste target snapshot JSON or select file..."
                rows={6}
                style={{ width: '100%', fontFamily: 'monospace', padding: '0.5rem', background: '#121216', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
              />
              <input
                type="file"
                accept=".json"
                onChange={(e) => handleFileUpload(e, false)}
                style={{ marginTop: '0.5rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => compareState.runCompare()}
              style={{ padding: '0.6rem 1.2rem', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Compare Snapshots
            </button>

            <button
              onClick={handleLoadPresetSamples}
              style={{ padding: '0.6rem 1.2rem', background: '#4a5568', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Load Sample Snapshots
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="compare-error-banner" style={{ marginTop: '1rem', padding: '0.8rem', background: '#742a2a', color: '#fed7d7', border: '1px solid #9b2c2c', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {isActive && diffResult && (
        <div className="compare-results-section" style={{ marginTop: '1rem' }}>
          {!diffResult.hasChanges ? (
            <div className="no-changes-banner" style={{ padding: '1rem', background: '#276749', color: '#c6f6d5', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}>
              No architectural changes
            </div>
          ) : (
            <>
              <div className="diff-summary-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ background: '#22543d', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9ae6b4' }}>+ Nodes</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38a169' }}>+{diffResult.summary.addedNodesCount}</div>
                </div>
                <div style={{ background: '#742a2a', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#feb2b2' }}>- Nodes</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e53e3e' }}>-{diffResult.summary.removedNodesCount}</div>
                </div>
                <div style={{ background: '#7b341e', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#fbd38d' }}>Changed Nodes</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#dd6b20' }}>{diffResult.summary.changedNodesCount}</div>
                </div>
                <div style={{ background: '#22543d', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9ae6b4' }}>+ Edges</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38a169' }}>+{diffResult.summary.addedEdgesCount}</div>
                </div>
                <div style={{ background: '#742a2a', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#feb2b2' }}>- Edges</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e53e3e' }}>-{diffResult.summary.removedEdgesCount}</div>
                </div>
                <div style={{ background: '#742a2a', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#fbd38d' }}>New Cycles</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#dd6b20' }}>+{diffResult.summary.addedCyclesCount}</div>
                </div>
                <div style={{ background: '#22543d', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9ae6b4' }}>Removed Cycles</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38a169' }}>-{diffResult.summary.removedCyclesCount}</div>
                </div>
              </div>

              <div className="diff-details-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {diffResult.addedNodes.map((n: DiffNodeItem) => (
                  <div
                    key={`added-node-${n.id}`}
                    onClick={() => compareState.focusEntity(n.id)}
                    className={`diff-item ${focusedEntityId === n.id ? 'focused' : ''}`}
                    style={{ padding: '0.5rem', background: '#1c4532', borderLeft: '4px solid #38a169', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <strong>+ Added Node:</strong> {n.id} ({n.type})
                  </div>
                ))}

                {diffResult.removedNodes.map((n: DiffNodeItem) => (
                  <div
                    key={`removed-node-${n.id}`}
                    onClick={() => compareState.focusEntity(n.id)}
                    className={`diff-item ${focusedEntityId === n.id ? 'focused' : ''}`}
                    style={{ padding: '0.5rem', background: '#63171b', borderLeft: '4px solid #e53e3e', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <strong>- Removed Node:</strong> {n.id} ({n.type})
                  </div>
                ))}

                {diffResult.changedNodes.map((n: DiffNodeChange) => (
                  <div
                    key={`changed-node-${n.id}`}
                    onClick={() => compareState.focusEntity(n.id)}
                    className={`diff-item ${focusedEntityId === n.id ? 'focused' : ''}`}
                    style={{ padding: '0.5rem', background: '#652b19', borderLeft: '4px solid #dd6b20', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <strong>Changed Node:</strong> {n.id}
                    <div style={{ fontSize: '0.85rem', color: '#fbd38d', marginTop: '0.2rem' }}>
                      {n.changes.map((c: DiffNodeChangeProperty) => `${c.property}: ${c.before} ➔ ${c.after}`).join(', ')}
                    </div>
                  </div>
                ))}

                {diffResult.addedEdges.map((e: DiffEdgeItem) => (
                  <div
                    key={`added-edge-${e.id}`}
                    onClick={() => compareState.focusEntity(e.id)}
                    className={`diff-item ${focusedEntityId === e.id ? 'focused' : ''}`}
                    style={{ padding: '0.5rem', background: '#1c4532', borderLeft: '4px solid #38a169', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <strong>+ Added Edge:</strong> {e.source} ➔ {e.target} ({e.relationshipType} {e.method ? `:: ${e.method}` : ''})
                  </div>
                ))}

                {diffResult.removedEdges.map((e: DiffEdgeItem) => (
                  <div
                    key={`removed-edge-${e.id}`}
                    onClick={() => compareState.focusEntity(e.id)}
                    className={`diff-item ${focusedEntityId === e.id ? 'focused' : ''}`}
                    style={{ padding: '0.5rem', background: '#63171b', borderLeft: '4px solid #e53e3e', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <strong>- Removed Edge:</strong> {e.source} ➔ {e.target} ({e.relationshipType} {e.method ? `:: ${e.method}` : ''})
                  </div>
                ))}

                {diffResult.cycleChanges.added.map((c: DiffCycleItem) => (
                  <div
                    key={`added-cycle-${c.id}`}
                    className="diff-item"
                    style={{ padding: '0.5rem', background: '#652b19', borderLeft: '4px solid #dd6b20', borderRadius: '4px' }}
                  >
                    <strong>New Cycle Introduced:</strong> {c.nodes.join(' ➔ ')}
                  </div>
                ))}

                {diffResult.cycleChanges.removed.map((c: DiffCycleItem) => (
                  <div
                    key={`removed-cycle-${c.id}`}
                    className="diff-item"
                    style={{ padding: '0.5rem', background: '#1c4532', borderLeft: '4px solid #38a169', borderRadius: '4px' }}
                  >
                    <strong>Cycle Removed:</strong> {c.nodes.join(' ➔ ')}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
