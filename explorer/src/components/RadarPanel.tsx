import React, { useMemo, useState } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import {
  adaptRadarDimensions,
  type RadarData,
  type RadarDimension,
  type RadarSummary,
} from '../lib/adapters/radar-adapter';

export interface RadarPanelProps {
  data: ExplorerDataSchema | null;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

/**
 * Visual normalization function strictly for radial SVG geometry positioning.
 * Maps heterogeneous metrics (scores, percentages, counts) into bounded [0, 1] radial display coordinates.
 *
 * CRITICAL: This is a visual-scaling presentation mapping only and does NOT alter raw values or represent
 * a new architectural scoring algorithm. Raw source values and native units remain authoritative and displayed.
 */
export function getVisualNormalizedValue(dim: RadarDimension, summary: RadarSummary): number {
  if (dim.unit === 'score' || dim.unit === 'percent') {
    return Math.min(1, Math.max(0, dim.rawValue / 100));
  }
  // Count unit presentation scaling relative to summary scales
  if (dim.id === 'total_components') {
    return summary.totalComponents > 0 ? 1.0 : 0;
  }
  if (dim.id === 'total_dependencies') {
    return summary.totalDependencies > 0 ? 1.0 : 0;
  }
  if (dim.id === 'high_risk_components' || dim.id === 'medium_risk_components') {
    return summary.totalComponents > 0 ? Math.min(1, dim.rawValue / summary.totalComponents) : 0;
  }
  if (dim.id === 'circular_dependencies') {
    const refMax = Math.max(10, summary.totalComponents * 0.1);
    return Math.min(1, dim.rawValue / refMax);
  }
  if (dim.id === 'unresolved_references') {
    const refMax = Math.max(20, summary.totalComponents * 0.2);
    return Math.min(1, dim.rawValue / refMax);
  }
  if (dim.id === 'architectural_hotspots') {
    const refMax = Math.max(20, summary.totalComponents * 0.2);
    return Math.min(1, dim.rawValue / refMax);
  }
  return Math.min(1, Math.max(0, dim.rawValue / 100));
}

export const RadarPanel: React.FC<RadarPanelProps> = ({
  data,
  onSelectNode: _onSelectNode,
  className = '',
}) => {
  const [hoveredDimId, setHoveredDimId] = useState<string | null>(null);
  const [selectedDimId, setSelectedDimId] = useState<string | null>(null);

  // Safely invoke adaptRadarDimensions without mutating input data
  const radarData: RadarData | null = useMemo(() => {
    if (!data) return null;
    return adaptRadarDimensions(data);
  }, [data]);

  if (!radarData || !radarData.dimensions || radarData.dimensions.length === 0) {
    return (
      <div className={`radar-panel ui-panel ${className}`} data-testid="radar-panel">
        <div className="radar-empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🎯</span>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>
            No Architecture Radar Data
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
            Select or analyze a project dataset containing components to view the multi-dimensional architecture radar.
          </p>
        </div>
      </div>
    );
  }

  const { dimensions, summary, missingPrimitives } = radarData;

  const activeDim = dimensions.find(d => d.id === (hoveredDimId || selectedDimId)) || null;

  // SVG Radar Layout Geometry Parameters
  const size = 380;
  const center = size / 2;
  const radius = 140;
  const angleStep = (2 * Math.PI) / dimensions.length;

  // Compute radial axis points and polygon vertex positions
  const axisPoints = dimensions.map((dim, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    const xEnd = center + radius * Math.cos(angle);
    const yEnd = center + radius * Math.sin(angle);

    const normVal = getVisualNormalizedValue(dim, summary);
    const xVal = center + radius * normVal * Math.cos(angle);
    const yVal = center + radius * normVal * Math.sin(angle);

    // Label positioning slightly past axis end
    const labelRadius = radius + 22;
    const xLabel = center + labelRadius * Math.cos(angle);
    const yLabel = center + labelRadius * Math.sin(angle);

    return {
      dim,
      angle,
      xEnd,
      yEnd,
      normVal,
      xVal,
      yVal,
      xLabel,
      yLabel,
    };
  });

  const polygonPointsStr = axisPoints.map(p => `${p.xVal.toFixed(1)},${p.yVal.toFixed(1)}`).join(' ');

  const getUnitBadgeStyle = (unit: 'score' | 'percent' | 'count') => {
    switch (unit) {
      case 'score':
        return { backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid #3b82f6' };
      case 'percent':
        return { backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid #a855f7' };
      case 'count':
        return { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981' };
    }
  };

  const getHealthBadgeStyle = (level: string) => {
    switch (level) {
      case 'GOOD':
        return { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981' };
      case 'CAUTION':
        return { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid #f59e0b' };
      default:
        return { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444' };
    }
  };

  return (
    <div
      className={`radar-panel ui-panel ${className}`}
      data-testid="radar-panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', padding: '12px' }}
    >
      {/* Header & Health Summary Banner */}
      <div
        className="radar-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default, #334155)',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🎯</span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
            Architecture Radar
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              ...getHealthBadgeStyle(summary.healthLevel),
            }}
          >
            Health: {summary.architectureHealthScore}/100 ({summary.healthLevel})
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Risk Exposure: <strong style={{ color: '#f59e0b' }}>{summary.riskPercent}%</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Components: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{summary.totalComponents}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Dependencies: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{summary.totalDependencies}</strong>
          </span>
        </div>
      </div>

      {/* Content Grid Area */}
      <div className="radar-content-area" style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0, overflow: 'hidden' }}>
        {/* SVG Radar Visualization Viewport */}
        <div
          className="radar-svg-container"
          style={{
            flex: '1 1 420px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--surface-base, #090d16)',
            border: '1px solid var(--border-default, #334155)',
            borderRadius: '6px',
            position: 'relative',
            overflow: 'auto',
            padding: '16px',
          }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            data-testid="radar-svg"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          >
            <defs>
              <linearGradient id="radarAreaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.25" />
              </linearGradient>
            </defs>

            {/* Concentric Reference Rings */}
            {[0.25, 0.5, 0.75, 1.0].map((ringLevel) => {
              const ringRadius = radius * ringLevel;
              const ringPointsStr = axisPoints
                .map((_, idx) => {
                  const angle = idx * angleStep - Math.PI / 2;
                  return `${(center + ringRadius * Math.cos(angle)).toFixed(1)},${(center + ringRadius * Math.sin(angle)).toFixed(1)}`;
                })
                .join(' ');

              return (
                <g key={`ring-${ringLevel}`}>
                  <polygon
                    points={ringPointsStr}
                    fill="none"
                    stroke="var(--border-subtle, #1e293b)"
                    strokeWidth="1"
                    strokeDasharray={ringLevel === 1.0 ? 'none' : '2,2'}
                  />
                  <text
                    x={center + 4}
                    y={center - ringRadius + 10}
                    fill="var(--text-muted, #475569)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {Math.round(ringLevel * 100)}%
                  </text>
                </g>
              );
            })}

            {/* Radial Axes */}
            {axisPoints.map((p) => (
              <line
                key={`axis-${p.dim.id}`}
                x1={center}
                y1={center}
                x2={p.xEnd}
                y2={p.yEnd}
                stroke="var(--border-default, #334155)"
                strokeWidth="1"
              />
            ))}

            {/* Polygon Data Fill Area */}
            <polygon
              points={polygonPointsStr}
              fill="url(#radarAreaGrad)"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Axis Data Points & Labels */}
            {axisPoints.map((p) => {
              const isHovered = hoveredDimId === p.dim.id;
              const isSelected = selectedDimId === p.dim.id;
              const isHighlighted = isHovered || isSelected;

              return (
                <g
                  key={`point-group-${p.dim.id}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredDimId(p.dim.id)}
                  onMouseLeave={() => setHoveredDimId(null)}
                  onClick={() => setSelectedDimId(prev => (prev === p.dim.id ? null : p.dim.id))}
                  data-testid={`radar-axis-${p.dim.id}`}
                >
                  {/* Vertex Circle */}
                  <circle
                    cx={p.xVal}
                    cy={p.yVal}
                    r={isHighlighted ? 6 : 4}
                    fill={isHighlighted ? '#60a5fa' : '#3b82f6'}
                    stroke="#ffffff"
                    strokeWidth={isHighlighted ? 2 : 1}
                  />

                  {/* Axis Label */}
                  <text
                    x={p.xLabel}
                    y={p.yLabel}
                    textAnchor={p.xLabel > center + 10 ? 'start' : p.xLabel < center - 10 ? 'end' : 'middle'}
                    dominantBaseline="middle"
                    fill={isHighlighted ? '#38bdf8' : 'var(--text-secondary, #cbd5e1)'}
                    fontSize={isHighlighted ? '11' : '10'}
                    fontWeight={isHighlighted ? '700' : '500'}
                  >
                    {p.dim.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Radial Geometry Presentation Disclaimer */}
          <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted, #64748b)', textAlign: 'center' }}>
            ℹ️ Radial geometry scales dimensions visually for presentation. Source metrics maintain native units (score / percent / count).
          </div>
        </div>

        {/* Right Inspector & Metric Table Pane */}
        <div
          className="radar-inspector-pane"
          style={{
            flex: '1 1 360px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
          }}
        >
          {/* Active Dimension Inspection Card */}
          <div
            style={{
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: 'var(--surface-card, #1e293b)',
              border: '1px solid var(--border-default, #334155)',
            }}
          >
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted, #94a3b8)',
              }}
            >
              Dimension Inspector
            </h4>
            {activeDim ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ color: 'var(--text-primary, #f8fafc)', fontSize: '14px' }}>
                    {activeDim.label}
                  </strong>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      ...getUnitBadgeStyle(activeDim.unit),
                    }}
                  >
                    {activeDim.unit}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>
                    {activeDim.rawValue}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                    {activeDim.unit === 'score' ? '/ 100 points' : activeDim.unit === 'percent' ? '%' : 'items'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-secondary, #cbd5e1)', lineHeight: '1.4' }}>
                  {activeDim.description}
                </p>
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-default, #334155)', fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
                  <strong>Source Metric:</strong> {activeDim.sourceMetric}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                Hover or click on a radar vertex or table row to inspect dimension source metrics and unit semantics.
              </div>
            )}
          </div>

          {/* Full Dimensions Metric Table */}
          <div
            style={{
              borderRadius: '6px',
              backgroundColor: 'var(--surface-card, #1e293b)',
              border: '1px solid var(--border-default, #334155)',
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
                textAlign: 'left',
              }}
              data-testid="radar-dimensions-table"
            >
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-panel, #111827)', borderBottom: '1px solid var(--border-default, #334155)' }}>
                  <th style={{ padding: '8px', color: 'var(--text-muted, #94a3b8)' }}>Dimension</th>
                  <th style={{ padding: '8px', color: 'var(--text-muted, #94a3b8)', textAlign: 'right' }}>Value</th>
                  <th style={{ padding: '8px', color: 'var(--text-muted, #94a3b8)', textAlign: 'center' }}>Unit</th>
                </tr>
              </thead>
              <tbody>
                {dimensions.map((dim) => {
                  const isHovered = hoveredDimId === dim.id;
                  const isSelected = selectedDimId === dim.id;
                  const isHighlighted = isHovered || isSelected;

                  return (
                    <tr
                      key={dim.id}
                      style={{
                        backgroundColor: isHighlighted ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        borderBottom: '1px solid var(--border-subtle, #1e293b)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHoveredDimId(dim.id)}
                      onMouseLeave={() => setHoveredDimId(null)}
                      onClick={() => setSelectedDimId(prev => (prev === dim.id ? null : dim.id))}
                    >
                      <td style={{ padding: '6px 8px', fontWeight: isHighlighted ? 700 : 500, color: 'var(--text-primary, #f8fafc)' }}>
                        {dim.label}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
                        {dim.rawValue}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            ...getUnitBadgeStyle(dim.unit),
                          }}
                        >
                          {dim.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Missing Primitives Section */}
          {missingPrimitives && missingPrimitives.length > 0 && (
            <div
              style={{
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <h4
                style={{
                  margin: '0 0 6px 0',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#fbbf24',
                }}
              >
                Missing Architectural Primitives
              </h4>
              <p style={{ margin: '0 0 8px 0', fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
                The following radar concepts are explicitly reported as unbacked primitives to prevent synthetic score fabrication:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {missingPrimitives.map((mp, idx) => (
                  <div key={`mp-${idx}`} style={{ fontSize: '10px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    <strong style={{ color: '#f59e0b' }}>{mp.dimension}:</strong> {mp.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RadarPanel;
