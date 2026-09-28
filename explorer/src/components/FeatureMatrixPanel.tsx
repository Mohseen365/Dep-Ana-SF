import React, { useMemo, useState } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import { adaptFeatureMatrix, type FeatureMatrixData, type FeatureMatrixCell } from '../lib/adapters/matrix-adapter';

export interface FeatureMatrixPanelProps {
  data: ExplorerDataSchema | null;
  onSelectNode?: (nodeId: string) => void;
  onSelectFeatureAnchor?: (anchorNodeId: string) => void;
  className?: string;
}

export const FeatureMatrixPanel: React.FC<FeatureMatrixPanelProps> = ({
  data,
  onSelectNode,
  onSelectFeatureAnchor,
  className = '',
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    sourceName: string;
    targetName: string;
    cell: FeatureMatrixCell;
  } | null>(null);

  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [manualMinThreshold, setManualMinThreshold] = useState<number | null>(null);

  // Safely invoke adaptFeatureMatrix without mutating input data
  const matrixData: FeatureMatrixData | null = useMemo(() => {
    if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      return null;
    }
    return adaptFeatureMatrix(data);
  }, [data]);

  // Construct quick lookup for cell lookup by sourceIndex and targetIndex
  const cellGridMap = useMemo(() => {
    if (!matrixData) return new Map<string, FeatureMatrixCell>();
    const map = new Map<string, FeatureMatrixCell>();
    matrixData.cells.forEach(cell => {
      map.set(`${cell.sourceIndex}:${cell.targetIndex}`, cell);
    });
    return map;
  }, [matrixData]);

  if (!matrixData || matrixData.features.length === 0) {
    return (
      <div className={`feature-matrix-panel ui-panel ${className}`} data-testid="feature-matrix-panel">
        <div className="analysis-mode-nav">
          <span className="nav-mode-item">Graph</span>
          <span className="nav-mode-item active">Matrix</span>
          <span className="nav-mode-item">Findings</span>
          <span className="nav-mode-item">Hotspots</span>
        </div>
        <div className="matrix-empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🧩</span>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>
            No Feature Matrix Data
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
            Select or analyze a project dataset containing components to view the 2D feature dependency matrix.
          </p>
        </div>
      </div>
    );
  }

  const { features, summary } = matrixData;

  // Data-driven threshold calculation: default policy ensures visible relationships for small/sparse datasets
  const activeThreshold = useMemo(() => {
    if (manualMinThreshold !== null) {
      return manualMinThreshold;
    }
    return 0; // Default policy: threshold 0 guarantees all non-zero relationships are visible
  }, [manualMinThreshold]);

  const getLayerColor = (layer: string) => {
    switch (layer) {
      case 'presentation':
        return '#3b82f6';
      case 'application':
        return '#8b5cf6';
      case 'domain':
        return '#10b981';
      case 'schema':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const getCellIntensityStyle = (weight: number, maxWeight: number) => {
    if (weight <= 0 || maxWeight <= 0) {
      return {
        backgroundColor: 'transparent',
        color: 'var(--text-muted, #64748b)',
      };
    }
    const ratio = Math.min(1, Math.max(0.15, weight / maxWeight));
    return {
      backgroundColor: `rgba(59, 130, 246, ${ratio * 0.85})`,
      color: ratio > 0.4 ? '#ffffff' : '#e2e8f0',
      fontWeight: ratio > 0.5 ? 700 : 500,
    };
  };

  return (
    <div className={`feature-matrix-panel ui-panel ${className}`} data-testid="feature-matrix-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', padding: '12px' }}>
      {/* Header & Navigation Indicator */}
      <div className="matrix-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default, #334155)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🧩</span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
            Feature Dependency Matrix
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted, #94a3b8)' }}>
            <label htmlFor="matrix-threshold-filter" style={{ fontSize: '11px' }}>Min Weight Filter:</label>
            <input
              id="matrix-threshold-filter"
              type="number"
              min="0"
              max={summary.maxCombinedWeight || 100}
              step="0.1"
              value={activeThreshold}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setManualMinThreshold(isNaN(val) ? 0 : Math.max(0, val));
              }}
              data-testid="matrix-threshold-input"
              style={{
                width: '56px',
                padding: '2px 4px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid var(--border-default, #334155)',
                backgroundColor: 'var(--surface-base, #090d16)',
                color: 'var(--text-primary, #f8fafc)',
              }}
            />
          </div>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Features: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{summary.totalFeatures}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Dependencies: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{summary.totalDependencies}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Max Weight: <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>{summary.maxCombinedWeight}</strong>
          </span>
        </div>
      </div>

      {/* Main Matrix Container */}
      <div className="matrix-content-area" style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0, overflow: 'hidden' }}>
        {/* Matrix Grid Table Viewport */}
        <div className="matrix-grid-scroll-container" style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-default, #334155)', borderRadius: '6px', backgroundColor: 'var(--surface-base, #090d16)' }}>
          <table className="feature-matrix-table" data-testid="feature-matrix-table" style={{ borderCollapse: 'collapse', width: 'max-content', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>
            <thead>
              <tr>
                {/* Top-Left Corner Header */}
                <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, backgroundColor: 'var(--surface-panel, #111827)', borderRight: '1px solid var(--border-default, #334155)', borderBottom: '1px solid var(--border-default, #334155)', padding: '8px', textAlign: 'left', minWidth: '180px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>
                    Source (Row) ↓ / Target (Col) →
                  </div>
                </th>
                {/* Column Headers */}
                {features.map((feat, colIdx) => (
                  <th
                    key={`col-${feat.id}`}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      backgroundColor: 'var(--surface-panel, #111827)',
                      borderRight: '1px solid var(--border-subtle, #1e293b)',
                      borderBottom: '1px solid var(--border-default, #334155)',
                      padding: '6px 4px',
                      minWidth: '36px',
                      maxWidth: '48px',
                      textAlign: 'center',
                    }}
                    title={`Column ${colIdx + 1}: ${feat.name} (${feat.primaryLayer})`}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '9px', color: getLayerColor(feat.primaryLayer), fontWeight: 700 }}>
                        #{colIdx + 1}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted, #94a3b8)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {feat.name}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((rowFeat, rowIdx) => {
                const isRowSelected = selectedFeatureId === rowFeat.id;
                return (
                  <tr key={`row-${rowFeat.id}`} style={{ backgroundColor: isRowSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                    {/* Row Header */}
                    <th
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        backgroundColor: 'var(--surface-panel, #111827)',
                        borderRight: '1px solid var(--border-default, #334155)',
                        borderBottom: '1px solid var(--border-subtle, #1e293b)',
                        padding: '6px 8px',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => {
                        setSelectedFeatureId(prev => (prev === rowFeat.id ? null : rowFeat.id));
                        if (rowFeat.anchorNodeId && onSelectFeatureAnchor) {
                          onSelectFeatureAnchor(rowFeat.anchorNodeId);
                        } else if (rowFeat.anchorNodeId && onSelectNode) {
                          onSelectNode(rowFeat.anchorNodeId);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', minWidth: '18px' }}>
                          #{rowIdx + 1}
                        </span>
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: getLayerColor(rowFeat.primaryLayer),
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                          {rowFeat.name}
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted, #94a3b8)', marginLeft: 'auto' }}>
                          ({rowFeat.primaryNodeCount}n)
                        </span>
                      </div>
                    </th>

                    {/* Cells */}
                    {features.map((colFeat, colIdx) => {
                      const isDiagonal = rowIdx === colIdx;
                      const cellKey = `${rowIdx}:${colIdx}`;
                      const cell = cellGridMap.get(cellKey);

                      if (isDiagonal) {
                        return (
                          <td
                            key={`cell-${cellKey}`}
                            style={{
                              borderRight: '1px solid var(--border-subtle, #1e293b)',
                              borderBottom: '1px solid var(--border-subtle, #1e293b)',
                              backgroundColor: 'var(--surface-subtle, #0f172a)',
                              textAlign: 'center',
                              padding: '4px',
                            }}
                            title={`Self (${rowFeat.name}): ${rowFeat.primaryNodeCount} primary nodes, ${rowFeat.secondaryNodeCount} secondary nodes`}
                          >
                            <span style={{ color: 'var(--border-strong, #475569)', fontSize: '10px' }}>\</span>
                          </td>
                        );
                      }

                      const isCellPassing = cell && cell.combinedWeight >= activeThreshold;
                      const intensityStyle = isCellPassing
                        ? getCellIntensityStyle(cell.combinedWeight, summary.maxCombinedWeight)
                        : { backgroundColor: 'transparent', color: 'var(--border-default, #1e293b)' };

                      return (
                        <td
                          key={`cell-${cellKey}`}
                          style={{
                            borderRight: '1px solid var(--border-subtle, #1e293b)',
                            borderBottom: '1px solid var(--border-subtle, #1e293b)',
                            textAlign: 'center',
                            padding: '4px',
                            cursor: isCellPassing ? 'pointer' : 'default',
                            transition: 'all 0.1s ease',
                            ...intensityStyle,
                          }}
                          onMouseEnter={() => {
                            if (cell && isCellPassing) {
                              setHoveredCell({
                                sourceName: rowFeat.name,
                                targetName: colFeat.name,
                                cell,
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => {
                            if (rowFeat.anchorNodeId && onSelectFeatureAnchor) {
                              onSelectFeatureAnchor(rowFeat.anchorNodeId);
                            }
                          }}
                        >
                          {isCellPassing ? cell.combinedWeight : '·'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Side Inspector / Hover Legend Panel */}
        <div className="matrix-inspector-pane" style={{ width: '260px', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Hovered Cell Detail Card */}
          <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-card, #1e293b)', border: '1px solid var(--border-default, #334155)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #94a3b8)' }}>
              Dependency Details
            </h4>
            {hoveredCell ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>Source Feature:</span>
                  <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>{hoveredCell.sourceName}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>Target Feature:</span>
                  <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{hoveredCell.targetName}</strong>
                </div>
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-default, #334155)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>Direct Weight:</span>
                    <strong>{hoveredCell.cell.directWeight}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>Directional Flow:</span>
                    <strong>{hoveredCell.cell.directionalFlow}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>Shared Weight:</span>
                    <strong>{hoveredCell.cell.sharedNodeWeight}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>Combined:</span>
                    <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>{hoveredCell.cell.combinedWeight}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                Hover over a matrix cell to inspect directional feature dependency weights.
              </div>
            )}
          </div>

          {/* Layer Color Legend */}
          <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-card, #1e293b)', border: '1px solid var(--border-default, #334155)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #94a3b8)' }}>
              Architectural Layers
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              {[
                { layer: 'presentation', label: 'Presentation Layer' },
                { layer: 'application', label: 'Application Layer' },
                { layer: 'domain', label: 'Domain Layer' },
                { layer: 'schema', label: 'Schema Layer' },
              ].map(({ layer, label }) => (
                <div key={layer} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getLayerColor(layer) }} />
                  <span style={{ color: 'var(--text-secondary, #cbd5e1)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureMatrixPanel;
