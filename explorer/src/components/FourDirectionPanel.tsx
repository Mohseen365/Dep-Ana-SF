import React, { useState } from 'react';
import {
  FourDirectionData,
  FourDirectionItem,
  FourDirectionQuadrant,
  CardinalDirection
} from '../lib/adapters/four-direction-adapter';

export interface FourDirectionPanelProps {
  data: FourDirectionData;
  onSelectNode?: (nodeId: string) => void;
  onReturnToGraph?: () => void;
  className?: string;
}

export const FourDirectionPanel: React.FC<FourDirectionPanelProps> = ({
  data,
  onSelectNode,
  onReturnToGraph,
  className = '',
}) => {
  const [filterText, setFilterText] = useState('');
  const [selectedItemNodeId, setSelectedItemNodeId] = useState<string | null>(null);

  const { subject, quadrants, summary, availableNodes } = data;

  if (!subject) {
    return (
      <div className={`four-direction-panel empty ${className}`} data-testid="four-direction-panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
          <h2>🧭 Four-Direction Architectural View</h2>
          {onReturnToGraph && (
            <button className="return-graph-btn" onClick={onReturnToGraph} data-testid="return-graph-btn" style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              ← Return to Graph Canvas
            </button>
          )}
        </div>
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
          No components available in active dataset.
        </div>
      </div>
    );
  }

  const matchesFilter = (item: FourDirectionItem) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      item.displayName.toLowerCase().includes(q) ||
      item.nodeId.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.featureName.toLowerCase().includes(q) ||
      item.layerName.toLowerCase().includes(q)
    );
  };

  const renderQuadrantCard = (quadrant: FourDirectionQuadrant, key: CardinalDirection, icon: string) => {
    const filteredItems = quadrant.items.filter(matchesFilter);

    return (
      <div
        className={`quadrant-box quadrant-${key}`}
        data-testid={`quadrant-${key}`}
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '380px',
          overflowY: 'auto'
        }}
      >
        <div className="quadrant-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
          <div>
            <span style={{ fontSize: '16px', marginRight: '6px' }}>{icon}</span>
            <strong style={{ color: '#f8fafc', fontSize: '14px' }}>{quadrant.title}</strong>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{quadrant.subtitle}</div>
          </div>
          <span className="count-pill" style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
            {filteredItems.length} / {quadrant.totalCount}
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '12px 0' }}>
            No components in this quadrant.
          </div>
        ) : (
          <div className="quadrant-item-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredItems.map(item => {
              const isSelected = selectedItemNodeId === item.nodeId;
              const riskColor = item.risk === 'HIGH' ? '#ef4444' : item.risk === 'MEDIUM' ? '#f59e0b' : '#10b981';

              return (
                <div
                  key={item.nodeId}
                  className={`quadrant-item ${isSelected ? 'selected' : ''}`}
                  data-testid={`item-${item.nodeId}`}
                  onClick={() => setSelectedItemNodeId(item.nodeId)}
                  onDoubleClick={() => onSelectNode && onSelectNode(item.nodeId)}
                  style={{
                    background: isSelected ? '#1e293b' : '#1e293b80',
                    borderLeft: `3px solid ${riskColor}`,
                    border: isSelected ? '1px solid #3b82f6' : '1px solid #334155',
                    borderRadius: '4px',
                    padding: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '13px' }}>{item.displayName}</span>
                    <span style={{ fontSize: '10px', color: '#cbd5e1', background: '#334155', padding: '1px 5px', borderRadius: '3px' }}>
                      {item.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    <span>📦 {item.featureName}</span>
                    <span>🏗️ {item.layerName}</span>
                  </div>
                  {item.relationshipTypes.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {item.relationshipTypes.map(rel => (
                        <span key={rel} style={{ fontSize: '9px', background: '#0284c722', color: '#38bdf8', border: '1px solid #0284c744', borderRadius: '2px', padding: '1px 4px' }}>
                          {rel}
                        </span>
                      ))}
                    </div>
                  )}
                  {onSelectNode && (
                    <button
                      className="make-subject-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(item.nodeId);
                      }}
                      style={{
                        marginTop: '6px',
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: '#334155',
                        color: '#38bdf8',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Focus as Subject Center →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`four-direction-panel ${className}`} data-testid="four-direction-panel" style={{ background: '#090d16', color: '#f8fafc', minHeight: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '12px 16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧭</span> Four-Direction Architectural View
          </h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Source-Grounded Relationship Distribution & Cardinal Neighborhood Lens
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Component Subject Selector */}
          <select
            data-testid="subject-selector"
            value={subject.nodeId}
            onChange={(e) => onSelectNode && onSelectNode(e.target.value)}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '13px'
            }}
          >
            {availableNodes.map(n => (
              <option key={n.id} value={n.id}>
                {n.displayName} ({n.type})
              </option>
            ))}
          </select>

          {/* Return to Graph Button */}
          {onReturnToGraph && (
            <button
              className="return-graph-btn"
              onClick={onReturnToGraph}
              data-testid="return-graph-btn"
              style={{
                padding: '6px 14px',
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              ← Return to Graph Canvas
            </button>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '8px 16px', borderRadius: '6px', border: '1px solid #1e293b' }}>
        <input
          type="text"
          data-testid="quadrant-filter-input"
          placeholder="Filter quadrant items..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '4px',
            padding: '4px 10px',
            fontSize: '12px',
            width: '240px'
          }}
        />

        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8' }}>
          <span>Total Connected Neighbors: <strong style={{ color: '#f8fafc' }}>{summary.totalNeighbors}</strong></span>
          <span>Upstream: <strong style={{ color: '#38bdf8' }}>{summary.upstreamCount}</strong></span>
          <span>Downstream: <strong style={{ color: '#10b981' }}>{summary.downstreamCount}</strong></span>
          <span>Peers: <strong style={{ color: '#a855f7' }}>{summary.leftPeerCount}</strong></span>
          <span>Shared/Cross: <strong style={{ color: '#f59e0b' }}>{summary.rightCrossCount}</strong></span>
        </div>
      </div>

      {/* 3x3 Cardinal Direction Quadrant Grid */}
      <div
        className="cardinal-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: 'auto auto auto',
          gap: '12px',
          alignItems: 'stretch'
        }}
      >
        {/* Row 1, Col 2: UP */}
        <div style={{ gridColumn: '2', gridRow: '1' }}>
          {renderQuadrantCard(quadrants.up, 'up', '⬆️')}
        </div>

        {/* Row 2, Col 1: LEFT */}
        <div style={{ gridColumn: '1', gridRow: '2' }}>
          {renderQuadrantCard(quadrants.left, 'left', '⬅️')}
        </div>

        {/* Row 2, Col 2: CENTER SUBJECT CARD */}
        <div
          className="subject-center-card"
          data-testid="subject-center-card"
          style={{
            gridColumn: '2',
            gridRow: '2',
            background: '#1e293b',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justify: 'center',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 4px 20px #00000055'
          }}
        >
          <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Subject Component
          </div>
          <h3 style={{ margin: '6px 0', fontSize: '18px', color: '#f8fafc' }}>{subject.displayName}</h3>
          <div style={{ fontSize: '12px', color: '#cbd5e1', background: '#334155', padding: '2px 8px', borderRadius: '4px', marginBottom: '8px' }}>
            {subject.type}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
            <div>📦 Feature: <strong>{subject.featureName}</strong></div>
            <div>🏗️ Layer: <strong>{subject.layerName}</strong></div>
            <div>📄 File: {subject.file}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', fontSize: '11px', background: '#0f172a', padding: '8px', borderRadius: '4px' }}>
            <div>Fan-In: <strong style={{ color: '#f8fafc' }}>{subject.metrics.fanIn}</strong></div>
            <div>Fan-Out: <strong style={{ color: '#f8fafc' }}>{subject.metrics.fanOut}</strong></div>
            <div>Coupling: <strong style={{ color: '#f8fafc' }}>{subject.metrics.coupling}</strong></div>
            <div>Risk: <strong style={{ color: subject.risk === 'HIGH' ? '#ef4444' : subject.risk === 'MEDIUM' ? '#f59e0b' : '#10b981' }}>{subject.risk}</strong></div>
          </div>
        </div>

        {/* Row 2, Col 3: RIGHT */}
        <div style={{ gridColumn: '3', gridRow: '2' }}>
          {renderQuadrantCard(quadrants.right, 'right', '➡️')}
        </div>

        {/* Row 3, Col 2: DOWN */}
        <div style={{ gridColumn: '2', gridRow: '3' }}>
          {renderQuadrantCard(quadrants.down, 'down', '⬇️')}
        </div>
      </div>
    </div>
  );
};
