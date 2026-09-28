import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import { adaptFeatureMatrix, type FeatureMatrixData, type FeatureMatrixCell } from '../lib/adapters/matrix-adapter';

export type HeatmapMetricMode = 'combined' | 'direct' | 'flow' | 'shared';

export interface CouplingHeatmapPanelProps {
  data: ExplorerDataSchema | null;
  onSelectNode?: (nodeId: string) => void;
  onSelectFeatureAnchor?: (anchorNodeId: string) => void;
  className?: string;
}

export const CouplingHeatmapPanel: React.FC<CouplingHeatmapPanelProps> = ({
  data,
  onSelectNode,
  onSelectFeatureAnchor,
  className = '',
}) => {
  const [metricMode, setMetricMode] = useState<HeatmapMetricMode>('combined');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [manualMinThreshold, setManualMinThreshold] = useState<number | null>(null);

  const [hoveredCellInfo, setHoveredCellInfo] = useState<{
    sourceName: string;
    targetName: string;
    cell: FeatureMatrixCell;
    x: number;
    y: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Safely adapt data without mutating input graph
  const matrixData: FeatureMatrixData | null = useMemo(() => {
    if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      return null;
    }
    return adaptFeatureMatrix(data);
  }, [data]);

  // Filter features if searchQuery is present
  const filteredFeatures = useMemo(() => {
    if (!matrixData) return [];
    if (!searchQuery.trim()) return matrixData.features;
    const q = searchQuery.toLowerCase();
    return matrixData.features.filter(
      f => f.name.toLowerCase().includes(q) || f.primaryDomain.toLowerCase().includes(q) || f.primaryLayer.toLowerCase().includes(q)
    );
  }, [matrixData, searchQuery]);

  // Quick lookup grid for cells by sourceIndex and targetIndex
  const cellGridMap = useMemo(() => {
    if (!matrixData) return new Map<string, FeatureMatrixCell>();
    const map = new Map<string, FeatureMatrixCell>();
    matrixData.cells.forEach(cell => {
      map.set(`${cell.sourceIndex}:${cell.targetIndex}`, cell);
    });
    return map;
  }, [matrixData]);

  // Get active cell weight based on selected metric mode
  const getCellWeight = useCallback((cell: FeatureMatrixCell | undefined, mode: HeatmapMetricMode): number => {
    if (!cell) return 0;
    switch (mode) {
      case 'combined':
        return cell.combinedWeight;
      case 'direct':
        return cell.directWeight;
      case 'flow':
        return cell.directionalFlow;
      case 'shared':
        return cell.sharedNodeWeight;
      default:
        return cell.combinedWeight;
    }
  }, []);

  // Compute maximum weight across all cells for active metric mode
  const maxMetricWeight = useMemo(() => {
    if (!matrixData) return 1;
    let max = 0;
    matrixData.cells.forEach(cell => {
      const w = getCellWeight(cell, metricMode);
      if (w > max) max = w;
    });
    return Math.max(1, max);
  }, [matrixData, metricMode, getCellWeight]);

  // Layer color mapper
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

  // Convert weight ratio (0..1) to HTML5 canvas color fill string
  const getHeatmapColor = useCallback((ratio: number): string => {
    if (ratio <= 0) return '#0f172a'; // background slate
    if (ratio < 0.2) return 'rgba(30, 58, 138, 0.85)'; // deep blue
    if (ratio < 0.4) return 'rgba(37, 99, 235, 0.9)';  // royal blue
    if (ratio < 0.6) return 'rgba(6, 182, 212, 0.95)'; // cyan
    if (ratio < 0.8) return 'rgba(245, 158, 11, 0.95)'; // amber/orange
    return 'rgba(239, 68, 68, 1.0)';                    // hot red
  }, []);

  // Render HTML5 Canvas Heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matrixData || matrixData.features.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const features = matrixData.features;
    const count = features.length;

    const cellSize = Math.max(28, Math.min(48, Math.floor(640 / Math.max(1, count))));
    const headerOffset = 140; // Space for row/col headers
    const width = headerOffset + count * cellSize;
    const height = headerOffset + count * cellSize;

    // Set high-DPI scaling
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Fill background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Draw Column Headers (Top)
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    features.forEach((feat, colIdx) => {
      const x = headerOffset + colIdx * cellSize + cellSize / 2;
      const y = headerOffset - 8;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 3);
      ctx.fillStyle = getLayerColor(feat.primaryLayer);
      ctx.fillText(`#${colIdx + 1} ${feat.name}`, 0, 0);
      ctx.restore();
    });

    // Draw Row Headers (Left) & Cells
    features.forEach((rowFeat, rowIdx) => {
      const rowY = headerOffset + rowIdx * cellSize;

      // Row Header
      ctx.fillStyle = getLayerColor(rowFeat.primaryLayer);
      ctx.fillRect(10, rowY + 4, 6, cellSize - 8);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${rowIdx + 1} ${rowFeat.name}`, 22, rowY + cellSize / 2);

      // Render Cells across columns
      features.forEach((colFeat, colIdx) => {
        const colX = headerOffset + colIdx * cellSize;

        if (rowIdx === colIdx) {
          // Diagonal self-cell
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(colX + 1, rowY + 1, cellSize - 2, cellSize - 2);

          ctx.fillStyle = '#475569';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\\', colX + cellSize / 2, rowY + cellSize / 2);
        } else {
          const cellKey = `${rowIdx}:${colIdx}`;
          const cell = cellGridMap.get(cellKey);
          const weight = getCellWeight(cell, metricMode);
          const ratio = weight > 0 ? Math.min(1, Math.max(0.1, weight / maxMetricWeight)) : 0;

          // Fill heatmap cell color
          ctx.fillStyle = getHeatmapColor(ratio);
          ctx.fillRect(colX + 1, rowY + 1, cellSize - 2, cellSize - 2);

          // Highlight row/cell hover if matching
          if (
            hoveredCellInfo &&
            hoveredCellInfo.cell.sourceIndex === rowIdx &&
            hoveredCellInfo.cell.targetIndex === colIdx
          ) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(colX + 1, rowY + 1, cellSize - 2, cellSize - 2);
          }

          // Draw cell native weight text if cellSize is large enough
          if (weight > 0 && cellSize >= 24) {
            ctx.fillStyle = ratio > 0.5 ? '#ffffff' : '#cbd5e1';
            ctx.font = cellSize >= 32 ? 'bold 11px monospace' : '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(weight), colX + cellSize / 2, rowY + cellSize / 2);
          }
        }
      });
    });

    // Draw Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    for (let i = 0; i <= count; i++) {
      const pos = headerOffset + i * cellSize;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(pos, headerOffset);
      ctx.lineTo(pos, headerOffset + count * cellSize);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(headerOffset, pos);
      ctx.lineTo(headerOffset + count * cellSize, pos);
      ctx.stroke();
    }
  }, [matrixData, metricMode, maxMetricWeight, cellGridMap, getCellWeight, getHeatmapColor, hoveredCellInfo]);

  // Handle canvas mouse move for hover inspection
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !matrixData) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const count = matrixData.features.length;
    const cellSize = Math.max(28, Math.min(48, Math.floor(640 / Math.max(1, count))));
    const headerOffset = 140;

    if (clickX < headerOffset || clickY < headerOffset) {
      setHoveredCellInfo(null);
      return;
    }

    const colIdx = Math.floor((clickX - headerOffset) / cellSize);
    const rowIdx = Math.floor((clickY - headerOffset) / cellSize);

    if (rowIdx >= 0 && rowIdx < count && colIdx >= 0 && colIdx < count && rowIdx !== colIdx) {
      const cellKey = `${rowIdx}:${colIdx}`;
      const cell = cellGridMap.get(cellKey);

      if (cell) {
        setHoveredCellInfo({
          sourceName: matrixData.features[rowIdx].name,
          targetName: matrixData.features[colIdx].name,
          cell,
          x: clickX,
          y: clickY,
        });
      } else {
        setHoveredCellInfo(null);
      }
    } else {
      setHoveredCellInfo(null);
    }
  };

  // Handle canvas click for feature node selection
  const handleCanvasClick = () => {
    if (!hoveredCellInfo || !matrixData) return;

    const rowFeat = matrixData.features[hoveredCellInfo.cell.sourceIndex];
    if (rowFeat && rowFeat.anchorNodeId) {
      setSelectedFeatureId(rowFeat.id);
      if (onSelectFeatureAnchor) {
        onSelectFeatureAnchor(rowFeat.anchorNodeId);
      } else if (onSelectNode) {
        onSelectNode(rowFeat.anchorNodeId);
      }
    }
  };

  if (!matrixData || matrixData.features.length === 0) {
    return (
      <div className={`coupling-heatmap-panel ui-panel ${className}`} data-testid="coupling-heatmap-panel">
        <div className="heatmap-empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🌡️</span>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>
            No Coupling Heatmap Data
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
            Select or analyze a project dataset containing components to view the interactive feature coupling heatmap canvas.
          </p>
        </div>
      </div>
    );
  }

  const { features, summary } = matrixData;

  // Data-driven threshold policy: defaults to 0 so all non-zero relationships are visible
  const activeThreshold = useMemo(() => {
    if (manualMinThreshold !== null) {
      return manualMinThreshold;
    }
    return 0;
  }, [manualMinThreshold]);

  const metricLabels: Record<HeatmapMetricMode, { title: string; desc: string }> = {
    combined: {
      title: 'Combined Coupling Weight',
      desc: 'Aggregate coupling weight incorporating direct edges, directional flow, and shared component interactions.',
    },
    direct: {
      title: 'Direct Dependency Count',
      desc: 'Count of direct component dependencies linking components between the source and target features.',
    },
    flow: {
      title: 'Directional Dependency Flow',
      desc: 'Directional dependency flow vector weight between the source feature and target feature.',
    },
    shared: {
      title: 'Shared Component Weight',
      desc: 'Weight of shared secondary/utility components co-referenced by both features.',
    },
  };

  return (
    <div
      className={`coupling-heatmap-panel ui-panel ${className}`}
      data-testid="coupling-heatmap-panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', padding: '12px' }}
    >
      {/* Header & Controls Bar */}
      <div
        className="heatmap-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default, #334155)',
          paddingBottom: '8px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🌡️</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
              Feature Coupling Heatmap
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
              Canvas Multi-Metric Feature Inter-Coupling Lens
            </span>
          </div>
        </div>

        {/* Metric Mode Selector Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--surface-base, #090d16)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-default, #334155)' }}>
          {(['combined', 'direct', 'flow', 'shared'] as HeatmapMetricMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMetricMode(m)}
              data-testid={`heatmap-metric-${m}`}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: metricMode === m ? 700 : 500,
                color: metricMode === m ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                backgroundColor: metricMode === m ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
              title={metricLabels[m].desc}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Threshold Filter & Summary Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted, #94a3b8)' }}>
            <label htmlFor="heatmap-threshold-filter" style={{ fontSize: '11px' }}>Min Weight Filter:</label>
            <input
              id="heatmap-threshold-filter"
              type="number"
              min="0"
              max={maxMetricWeight || 100}
              step="0.1"
              value={activeThreshold}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setManualMinThreshold(isNaN(val) ? 0 : Math.max(0, val));
              }}
              data-testid="heatmap-threshold-input"
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
            Features: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{features.length}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Max Metric Value: <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>{maxMetricWeight}</strong>
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="text"
          placeholder="Filter features by name, domain, or layer..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          data-testid="heatmap-search-input"
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border-default, #334155)',
            backgroundColor: 'var(--surface-base, #090d16)',
            color: 'var(--text-primary, #f8fafc)',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid var(--border-default, #334155)',
              backgroundColor: 'var(--surface-card, #1e293b)',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="heatmap-content-area" style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0, overflow: 'hidden' }}>
        {/* Canvas Viewport */}
        <div
          className="heatmap-canvas-container"
          style={{
            flex: 1,
            overflow: 'auto',
            border: '1px solid var(--border-default, #334155)',
            borderRadius: '6px',
            backgroundColor: 'var(--surface-base, #090d16)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: '12px',
            position: 'relative',
          }}
        >
          <canvas
            ref={canvasRef}
            data-testid="coupling-heatmap-canvas"
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredCellInfo(null)}
            onClick={handleCanvasClick}
            style={{ cursor: hoveredCellInfo ? 'pointer' : 'default', display: 'block' }}
          />
        </div>

        {/* Side Inspector Pane */}
        <div
          className="heatmap-inspector-pane"
          style={{ width: '280px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {/* Active Metric Info Card */}
          <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-card, #1e293b)', border: '1px solid var(--border-default, #334155)' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-primary, #3b82f6)' }}>
              {metricLabels[metricMode].title}
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary, #cbd5e1)', lineHeight: '1.4' }}>
              {metricLabels[metricMode].desc}
            </p>
          </div>

          {/* Hovered Cell Detail Card */}
          <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-card, #1e293b)', border: '1px solid var(--border-default, #334155)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #94a3b8)' }}>
              Coupling Inspector
            </h4>
            {hoveredCellInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>Source Feature:</span>
                  <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>{hoveredCellInfo.sourceName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>Target Feature:</span>
                  <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{hoveredCellInfo.targetName}</strong>
                </div>
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-default, #334155)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>Direct Weight:</span>
                    <strong>{hoveredCellInfo.cell.directWeight}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>Directional Flow:</span>
                    <strong>{hoveredCellInfo.cell.directionalFlow}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>Shared Weight:</span>
                    <strong>{hoveredCellInfo.cell.sharedNodeWeight}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>Combined:</span>
                    <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>{hoveredCellInfo.cell.combinedWeight}</strong>
                  </div>
                </div>
                <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
                  Click cell to navigate to source feature anchor node.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                Hover over a heatmap cell to inspect raw inter-feature coupling weights.
              </div>
            )}
          </div>

          {/* Color Intensity Scale Legend */}
          <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-card, #1e293b)', border: '1px solid var(--border-default, #334155)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #94a3b8)' }}>
              Visual Intensity Scale
            </h4>
            <div style={{ display: 'flex', height: '14px', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border-default, #334155)', marginBottom: '6px' }}>
              <div style={{ flex: 1, backgroundColor: '#0f172a' }} title="Zero (0)" />
              <div style={{ flex: 1, backgroundColor: 'rgba(30, 58, 138, 0.85)' }} title="Low (< 20%)" />
              <div style={{ flex: 1, backgroundColor: 'rgba(37, 99, 235, 0.9)' }} title="Medium (< 40%)" />
              <div style={{ flex: 1, backgroundColor: 'rgba(6, 182, 212, 0.95)' }} title="Moderate (< 60%)" />
              <div style={{ flex: 1, backgroundColor: 'rgba(245, 158, 11, 0.95)' }} title="High (< 80%)" />
              <div style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 1.0)' }} title="Extreme (80% - 100%)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
              <span>0 (None)</span>
              <span>50%</span>
              <span>Max ({maxMetricWeight})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CouplingHeatmapPanel;
