import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import { adaptFeatureMatrix, type FeatureMatrixData, type FeatureMatrixCell } from '../lib/adapters/matrix-adapter';
import { useInvestigationOptional } from '../context/InvestigationContext';

export interface FeatureMatrixPanelProps {
  data: ExplorerDataSchema | null;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onSelectFeatureAnchor?: (anchorNodeId: string) => void;
  className?: string;
  /** Fixed cell dimensions for DOM virtualization */
  rowHeight?: number;
  colWidth?: number;
  overscan?: number;
}

export const FeatureMatrixPanel: React.FC<FeatureMatrixPanelProps> = ({
  data,
  selectedNodeId: selectedNodeIdProp,
  onSelectNode: onSelectNodeProp,
  onSelectFeatureAnchor,
  className = '',
  rowHeight = 32,
  colWidth = 44,
  overscan = 4,
}) => {
  const investigation = useInvestigationOptional();
  const canonicalSelectedNodeId = selectedNodeIdProp ?? investigation?.state.selectedNodeId;

  const handleSelectNode = useCallback((nodeId: string) => {
    if (investigation) {
      investigation.selectNode(nodeId);
    }
    if (onSelectNodeProp) {
      onSelectNodeProp(nodeId);
    }
  }, [investigation, onSelectNodeProp]);

  const [hoveredCell, setHoveredCell] = useState<{
    sourceName: string;
    targetName: string;
    cell: FeatureMatrixCell;
  } | null>(null);

  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [manualMinThreshold, setManualMinThreshold] = useState<number | null>(null);
  const [focusedCellIndex, setFocusedCellIndex] = useState<{ row: number; col: number } | null>(null);

  // Scroll Container Ref and State for DOM Virtualization
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportSize, setViewportSize] = useState({ height: 600, width: 800 });

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

  // ResizeObserver to track container viewport dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportSize({
          height: entry.contentRect.height,
          width: entry.contentRect.width,
        });
      }
    });

    observer.observe(el);
    setViewportSize({ height: el.clientHeight, width: el.clientWidth });

    return () => observer.disconnect();
  }, []);

  // Handle scroll events on the virtualized viewport container
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
  }, []);

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
  const totalFeatures = features.length;

  // Compute Virtualized Window Ranges
  const HEADER_OFFSET_X = 180;
  const HEADER_OFFSET_Y = 100;

  const visibleStartRow = Math.max(0, Math.floor((scrollTop - HEADER_OFFSET_Y) / rowHeight) - overscan);
  const visibleEndRow = Math.min(totalFeatures - 1, Math.ceil((scrollTop + viewportSize.height - HEADER_OFFSET_Y) / rowHeight) + overscan);

  const visibleStartCol = Math.max(0, Math.floor((scrollLeft - HEADER_OFFSET_X) / colWidth) - overscan);
  const visibleEndCol = Math.min(totalFeatures - 1, Math.ceil((scrollLeft + viewportSize.width - HEADER_OFFSET_X) / colWidth) + overscan);

  const startRow = Math.min(visibleStartRow, totalFeatures - 1);
  const endRow = Math.max(startRow, visibleEndRow);
  const startCol = Math.min(visibleStartCol, totalFeatures - 1);
  const endCol = Math.max(startCol, visibleEndCol);

  const topSpacerHeight = Math.max(0, startRow * rowHeight);
  const bottomSpacerHeight = Math.max(0, (totalFeatures - 1 - endRow) * rowHeight);

  const leftSpacerWidth = Math.max(0, startCol * colWidth);
  const rightSpacerWidth = Math.max(0, (totalFeatures - 1 - endCol) * colWidth);

  // Exact rendered columns count per row for table markup validity
  const activeColCount = (endCol - startCol + 1) + 1 + (leftSpacerWidth > 0 ? 1 : 0) + (rightSpacerWidth > 0 ? 1 : 0);

  // Data-driven threshold calculation: default policy ensures visible relationships
  const activeThreshold = manualMinThreshold !== null ? manualMinThreshold : 0;

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

  // Keyboard navigation across virtualized grid
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (!focusedCellIndex) return;

    let { row, col } = focusedCellIndex;
    let handled = false;

    if (e.key === 'ArrowUp' && row > 0) {
      row--;
      handled = true;
    } else if (e.key === 'ArrowDown' && row < totalFeatures - 1) {
      row++;
      handled = true;
    } else if (e.key === 'ArrowLeft' && col > 0) {
      col--;
      handled = true;
    } else if (e.key === 'ArrowRight' && col < totalFeatures - 1) {
      col++;
      handled = true;
    } else if (e.key === 'Enter' || e.key === ' ') {
      const feat = features[row];
      if (feat && feat.anchorNodeId) {
        handleSelectNode(feat.anchorNodeId);
        if (onSelectFeatureAnchor) onSelectFeatureAnchor(feat.anchorNodeId);
      }
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      setFocusedCellIndex({ row, col });

      // Ensure focused cell scrolls into view
      const targetY = HEADER_OFFSET_Y + row * rowHeight;
      const targetX = HEADER_OFFSET_X + col * colWidth;

      if (containerRef.current) {
        const curEl = containerRef.current;
        if (targetY < curEl.scrollTop + HEADER_OFFSET_Y) {
          curEl.scrollTop = targetY - HEADER_OFFSET_Y;
        } else if (targetY + rowHeight > curEl.scrollTop + curEl.clientHeight) {
          curEl.scrollTop = targetY + rowHeight - curEl.clientHeight;
        }

        if (targetX < curEl.scrollLeft + HEADER_OFFSET_X) {
          curEl.scrollLeft = targetX - HEADER_OFFSET_X;
        } else if (targetX + colWidth > curEl.scrollLeft + curEl.clientWidth) {
          curEl.scrollLeft = targetX + colWidth - curEl.clientWidth;
        }
      }
    }
  };

  return (
    <div
      className={`feature-matrix-panel ui-panel ${className}`}
      data-testid="feature-matrix-panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', padding: '12px' }}
    >
      {/* Header & Navigation Indicator */}
      <div
        className="matrix-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default, #334155)',
          paddingBottom: '8px',
        }}
      >
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
        {/* Virtualized Info / High-density Status Badge */}
        {totalFeatures >= 80 && (
          <div
            style={{
              position: 'absolute',
              top: '48px',
              left: '12px',
              right: '12px',
              zIndex: 10,
              padding: '6px 12px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>⚡ DOM Virtualization Active: Rendering windowed subset of {totalFeatures}×{totalFeatures} matrix ({endRow - startRow + 1}×{endCol - startCol + 1} active cells in DOM).</span>
          </div>
        )}

        {/* Matrix Grid Table Viewport with DOM Virtualization */}
        <div
          ref={containerRef}
          className="matrix-grid-scroll-container"
          onScroll={handleScroll}
          onKeyDown={handleGridKeyDown}
          tabIndex={0}
          aria-label="Virtualized Feature Dependency Matrix"
          aria-rowcount={totalFeatures + 1}
          aria-colcount={totalFeatures + 1}
          style={{
            flex: 1,
            overflow: 'auto',
            border: '1px solid var(--border-default, #334155)',
            borderRadius: '6px',
            backgroundColor: 'var(--surface-base, #090d16)',
            position: 'relative',
            outline: 'none',
          }}
        >
          <table
            className="feature-matrix-table"
            data-testid="feature-matrix-table"
            role="grid"
            tabIndex={0}
            style={{
              borderCollapse: 'collapse',
              width: `${HEADER_OFFSET_X + totalFeatures * colWidth}px`,
              fontSize: '11px',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            <thead>
              <tr style={{ height: `${HEADER_OFFSET_Y}px` }}>
                {/* Top-Left Corner Header */}
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    zIndex: 3,
                    backgroundColor: 'var(--surface-panel, #111827)',
                    borderRight: '1px solid var(--border-default, #334155)',
                    borderBottom: '1px solid var(--border-default, #334155)',
                    padding: '8px',
                    textAlign: 'left',
                    minWidth: `${HEADER_OFFSET_X}px`,
                    width: `${HEADER_OFFSET_X}px`,
                  }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>
                    Source (Row) ↓ / Target (Col) →
                  </div>
                </th>

                {/* Left Column Spacer */}
                {leftSpacerWidth > 0 && (
                  <th style={{ width: `${leftSpacerWidth}px`, minWidth: `${leftSpacerWidth}px`, padding: 0 }} />
                )}

                {/* Visible Column Headers */}
                {features.slice(startCol, endCol + 1).map((feat, relColIdx) => {
                  const colIdx = startCol + relColIdx;
                  return (
                    <th
                      key={`col-${feat.id}`}
                      aria-colindex={colIdx + 2}
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        backgroundColor: 'var(--surface-panel, #111827)',
                        borderRight: '1px solid var(--border-subtle, #1e293b)',
                        borderBottom: '1px solid var(--border-default, #334155)',
                        padding: '6px 2px',
                        minWidth: `${colWidth}px`,
                        width: `${colWidth}px`,
                        maxWidth: `${colWidth}px`,
                        textAlign: 'center',
                      }}
                      title={`Column ${colIdx + 1}: ${feat.name} (${feat.primaryLayer})`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '9px', color: getLayerColor(feat.primaryLayer), fontWeight: 700 }}>
                          #{colIdx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: '9px',
                            color: 'var(--text-muted, #94a3b8)',
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            whiteSpace: 'nowrap',
                            maxHeight: '65px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {feat.name}
                        </span>
                      </div>
                    </th>
                  );
                })}

                {/* Right Column Spacer */}
                {rightSpacerWidth > 0 && (
                  <th style={{ width: `${rightSpacerWidth}px`, minWidth: `${rightSpacerWidth}px`, padding: 0 }} />
                )}
              </tr>
            </thead>

            <tbody>
              {/* Top Row Spacer */}
              {topSpacerHeight > 0 && (
                <tr style={{ height: `${topSpacerHeight}px` }}>
                  <td colSpan={activeColCount} style={{ padding: 0, border: 'none' }} />
                </tr>
              )}

              {/* Render Visible Row Range */}
              {features.slice(startRow, endRow + 1).map((rowFeat, relRowIdx) => {
                const rowIdx = startRow + relRowIdx;
                const isFeatureMatching = canonicalSelectedNodeId ? (
                  rowFeat.anchorNodeId === canonicalSelectedNodeId ||
                  rowFeat.id === canonicalSelectedNodeId
                ) : false;
                const isRowSelected = selectedFeatureId === rowFeat.id || isFeatureMatching;
                const isRowDimmed = !!canonicalSelectedNodeId && !isFeatureMatching;

                return (
                  <tr
                    key={`row-${rowFeat.id}`}
                    aria-rowindex={rowIdx + 2}
                    className={`matrix-row ${isRowDimmed ? 'dimmed' : ''}`}
                    style={{
                      height: `${rowHeight}px`,
                      backgroundColor: isRowSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                      opacity: isRowDimmed ? 0.35 : 1,
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {/* Row Header (Sticky Left) */}
                    <th
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        backgroundColor: 'var(--surface-panel, #111827)',
                        borderRight: '1px solid var(--border-default, #334155)',
                        borderBottom: '1px solid var(--border-subtle, #1e293b)',
                        padding: '4px 8px',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        minWidth: `${HEADER_OFFSET_X}px`,
                        width: `${HEADER_OFFSET_X}px`,
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
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>
                          {rowFeat.name}
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted, #94a3b8)', marginLeft: 'auto' }}>
                          ({rowFeat.primaryNodeCount}n)
                        </span>
                      </div>
                    </th>

                    {/* Left Column Spacer for Row */}
                    {leftSpacerWidth > 0 && <td style={{ width: `${leftSpacerWidth}px`, padding: 0 }} />}

                    {/* Visible Cells for Row */}
                    {features.slice(startCol, endCol + 1).map((colFeat, relColIdx) => {
                      const colIdx = startCol + relColIdx;
                      const isDiagonal = rowIdx === colIdx;
                      const cellKey = `${rowIdx}:${colIdx}`;
                      const cell = cellGridMap.get(cellKey);
                      const isFocused = focusedCellIndex?.row === rowIdx && focusedCellIndex?.col === colIdx;

                      if (isDiagonal) {
                        return (
                          <td
                            key={`cell-${cellKey}`}
                            aria-colindex={colIdx + 2}
                            style={{
                              borderRight: '1px solid var(--border-subtle, #1e293b)',
                              borderBottom: '1px solid var(--border-subtle, #1e293b)',
                              backgroundColor: 'var(--surface-subtle, #0f172a)',
                              textAlign: 'center',
                              padding: '2px',
                              width: `${colWidth}px`,
                              minWidth: `${colWidth}px`,
                              outline: isFocused ? '2px solid #3b82f6' : 'none',
                            }}
                            title={`Self (${rowFeat.name}): ${rowFeat.primaryNodeCount} primary nodes`}
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
                          aria-colindex={colIdx + 2}
                          role="gridcell"
                          tabIndex={isFocused ? 0 : -1}
                          style={{
                            borderRight: '1px solid var(--border-subtle, #1e293b)',
                            borderBottom: '1px solid var(--border-subtle, #1e293b)',
                            textAlign: 'center',
                            padding: '2px',
                            width: `${colWidth}px`,
                            minWidth: `${colWidth}px`,
                            cursor: isCellPassing ? 'pointer' : 'default',
                            outline: isFocused ? '2px solid #3b82f6' : 'none',
                            transition: 'all 0.1s ease',
                            ...intensityStyle,
                          }}
                          onFocus={() => setFocusedCellIndex({ row: rowIdx, col: colIdx })}
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
                            setFocusedCellIndex({ row: rowIdx, col: colIdx });
                            if (rowFeat.anchorNodeId && onSelectFeatureAnchor) {
                              onSelectFeatureAnchor(rowFeat.anchorNodeId);
                            } else if (rowFeat.anchorNodeId && onSelectNode) {
                              onSelectNode(rowFeat.anchorNodeId);
                            }
                          }}
                        >
                          {isCellPassing ? cell.combinedWeight : '·'}
                        </td>
                      );
                    })}

                    {/* Right Column Spacer for Row */}
                    {rightSpacerWidth > 0 && <td style={{ width: `${rightSpacerWidth}px`, padding: 0 }} />}
                  </tr>
                );
              })}

              {/* Bottom Row Spacer */}
              {bottomSpacerHeight > 0 && (
                <tr style={{ height: `${bottomSpacerHeight}px` }}>
                  <td colSpan={activeColCount} style={{ padding: 0, border: 'none' }} />
                </tr>
              )}
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
