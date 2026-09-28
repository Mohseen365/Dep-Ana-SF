import React, { useState, useMemo } from 'react';
import {
  ConstellationData,
  ConstellationNode,
} from '../lib/adapters/constellation-adapter';
import {
  computeConstellationLayout,
} from '../lib/layout/constellation-layout';
import { FocusDirection } from '../lib/focus-graph';

export interface DependencyConstellationPanelProps {
  data: ConstellationData;
  onSelectNode?: (nodeId: string) => void;
  onOptionChange?: (options: { focalNodeId?: string; maxDepth?: number; direction?: FocusDirection }) => void;
  onReturnToGraph?: () => void;
  className?: string;
}

export const DependencyConstellationPanel: React.FC<DependencyConstellationPanelProps> = ({
  data,
  onSelectNode,
  onOptionChange,
  onReturnToGraph,
  className = '',
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  const { focalNode, nodes, edges, availableNodes, summary, options } = data;

  // Compute local polar layout geometry
  const layout = useMemo(() => {
    return computeConstellationLayout(data, {
      width: 900,
      height: 900,
      baseRadius: 180,
      ringStepRadius: 150,
    });
  }, [data]);

  if (!focalNode) {
    return (
      <div className={`dependency-constellation-panel empty ${className}`} data-testid="dependency-constellation-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px' }}>🌌 Dependency Constellation / Polar View</h2>
          {onReturnToGraph && (
            <button className="return-graph-btn" onClick={onReturnToGraph} data-testid="return-graph-btn" style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              ← Return to Graph Canvas
            </button>
          )}
        </div>
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
          No focal component or graph data available in active dataset.
        </div>
      </div>
    );
  }

  const activeInspectId = hoveredNodeId || selectedNodeId || focalNode.id;
  const activeInspectNode: ConstellationNode | null = nodes[activeInspectId] || null;

  // Compute highlighted edge IDs when node is hovered/selected
  const highlightedEdgeIds = useMemo(() => {
    if (!activeInspectId) return new Set<string>();
    const set = new Set<string>();
    edges.forEach((edge) => {
      if (edge.source === activeInspectId || edge.target === activeInspectId) {
        set.add(edge.edgeId);
      }
    });
    return set;
  }, [activeInspectId, edges]);

  // Compute highlighted node IDs
  const highlightedNodeIds = useMemo(() => {
    if (!activeInspectId) return new Set<string>();
    const set = new Set<string>([activeInspectId]);
    edges.forEach((edge) => {
      if (edge.source === activeInspectId) set.add(edge.target);
      if (edge.target === activeInspectId) set.add(edge.source);
    });
    return set;
  }, [activeInspectId, edges]);

  const matchesFilter = (node: ConstellationNode) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      node.displayName.toLowerCase().includes(q) ||
      node.nodeId.toLowerCase().includes(q) ||
      node.type.toLowerCase().includes(q) ||
      node.featureName.toLowerCase().includes(q) ||
      node.layerName.toLowerCase().includes(q)
    );
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH':
        return '#ef4444';
      case 'MEDIUM':
        return '#f59e0b';
      case 'LOW':
      default:
        return '#10b981';
    }
  };

  return (
    <div
      className={`dependency-constellation-panel ${className}`}
      data-testid="dependency-constellation-panel"
      style={{
        background: '#090d16',
        color: '#f8fafc',
        minHeight: '100%',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Header */}
      <div
        className="panel-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0f172a',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #1e293b',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌌</span> Dependency Constellation
          </h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Focal-Centric Orbital Distance & Radial Dependency Influence Lens
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Focal Node Selector */}
          <select
            data-testid="focal-selector"
            value={focalNode.id}
            onChange={(e) => {
              const val = e.target.value;
              if (onOptionChange) onOptionChange({ focalNodeId: val });
              if (onSelectNode) onSelectNode(val);
            }}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '13px',
            }}
          >
            {availableNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.displayName} ({n.type})
              </option>
            ))}
          </select>

          {/* Hop Depth Selector */}
          <select
            data-testid="depth-selector"
            value={options.maxDepth}
            onChange={(e) => {
              if (onOptionChange) onOptionChange({ maxDepth: parseInt(e.target.value, 10) });
            }}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '13px',
            }}
          >
            <option value={1}>1-Hop Orbit</option>
            <option value={2}>2-Hop Orbit</option>
            <option value={3}>3-Hop Orbit</option>
          </select>

          {/* Direction Filter Selector */}
          <select
            data-testid="direction-selector"
            value={options.direction}
            onChange={(e) => {
              if (onOptionChange) onOptionChange({ direction: e.target.value as FocusDirection });
            }}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '13px',
            }}
          >
            <option value="both">Both Directions</option>
            <option value="dependencies">Dependencies (Outgoing)</option>
            <option value="dependents">Dependents (Incoming)</option>
          </select>

          {/* Return to Graph Canvas Button */}
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
                fontSize: '13px',
              }}
            >
              ← Return to Graph Canvas
            </button>
          )}
        </div>
      </div>

      {/* Control & Summary Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0f172a',
          padding: '8px 16px',
          borderRadius: '6px',
          border: '1px solid #1e293b',
        }}
      >
        <input
          type="text"
          data-testid="constellation-filter-input"
          placeholder="Filter orbital components..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '4px',
            padding: '4px 10px',
            fontSize: '12px',
            width: '240px',
          }}
        />

        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8' }}>
          <span>Focal Component: <strong style={{ color: '#38bdf8' }}>{focalNode.displayName}</strong></span>
          <span>Orbital Rings: <strong style={{ color: '#f8fafc' }}>{summary.ringCount}</strong></span>
          <span>Neighborhood Components: <strong style={{ color: '#f8fafc' }}>{summary.totalNodes}</strong></span>
          <span>Dependencies: <strong style={{ color: '#f8fafc' }}>{summary.totalEdges}</strong></span>
        </div>
      </div>

      {/* Main Canvas & Inspection Drawer Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', alignItems: 'start' }}>
        {/* Orbital SVG Canvas */}
        <div
          data-testid="constellation-canvas-container"
          style={{
            background: '#020617',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            position: 'relative',
            padding: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '620px',
            overflow: 'hidden',
          }}
        >
          <svg
            data-testid="constellation-svg"
            width={layout.viewport.width}
            height={layout.viewport.height}
            viewBox={`0 0 ${layout.viewport.width} ${layout.viewport.height}`}
            style={{ maxWidth: '100%', height: 'auto' }}
          >
            <defs>
              <marker
                id="constellation-arrow"
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
              </marker>
              <marker
                id="constellation-arrow-highlight"
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
              </marker>
            </defs>

            {/* Render Orbital Rings */}
            {layout.ringGeometries.map((ring) => (
              <g key={`ring_${ring.ringIndex}`}>
                <circle
                  cx={ring.cx}
                  cy={ring.cy}
                  r={ring.radius}
                  fill="none"
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                />
                <text
                  x={ring.cx}
                  y={ring.cy - ring.radius - 6}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {ring.label}
                </text>
              </g>
            ))}

            {/* Render Edge Paths */}
            {layout.edgePaths.map((edge) => {
              const isHighlighted = highlightedEdgeIds.has(edge.edgeId);
              const strokeColor = isHighlighted ? '#38bdf8' : '#3b82f633';
              const strokeWidth = isHighlighted ? 2.5 : 1;
              const marker = isHighlighted
                ? 'url(#constellation-arrow-highlight)'
                : 'url(#constellation-arrow)';

              return (
                <path
                  key={edge.edgeId}
                  d={edge.pathSvg}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  markerEnd={marker}
                  style={{ transition: 'all 0.2s ease' }}
                />
              );
            })}

            {/* Render Center Origin Marker */}
            <circle cx={layout.viewport.cx} cy={layout.viewport.cy} r={6} fill="#3b82f6" />

            {/* Render Node Circles & Labels */}
            {Object.values(layout.nodePositions).map((pos) => {
              const nodeData = nodes[pos.nodeId];
              const isFocal = pos.nodeId === focalNode.id;
              const isHighlighted = highlightedNodeIds.has(pos.nodeId);
              const isSelected = selectedNodeId === pos.nodeId;
              const matches = nodeData ? matchesFilter(nodeData) : true;

              const r = isFocal ? 18 : 12;
              const strokeColor = getRiskColor(nodeData?.risk || 'LOW');
              const fillColor = isFocal
                ? '#3b82f6'
                : isSelected
                ? '#0284c7'
                : matches
                ? '#1e293b'
                : '#0f172a';
              const opacity = matches ? (highlightedNodeIds.size > 0 && !isHighlighted ? 0.35 : 1) : 0.2;

              return (
                <g
                  key={pos.nodeId}
                  data-testid={`constellation-node-${pos.nodeId}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer', opacity, transition: 'opacity 0.2s ease' }}
                  onMouseEnter={() => setHoveredNodeId(pos.nodeId)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => {
                    setSelectedNodeId(pos.nodeId);
                    if (onSelectNode) onSelectNode(pos.nodeId);
                  }}
                  onDoubleClick={() => {
                    if (onOptionChange) onOptionChange({ focalNodeId: pos.nodeId });
                    if (onSelectNode) onSelectNode(pos.nodeId);
                  }}
                >
                  <circle
                    r={r}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isHighlighted || isSelected ? 3 : 1.5}
                  />

                  {/* Node Type Abbreviation / Icon */}
                  <text
                    y={4}
                    fill="#f8fafc"
                    fontSize={isFocal ? '10' : '8'}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {isFocal ? '★' : pos.label.slice(0, 3)}
                  </text>

                  {/* Node Display Label */}
                  <text
                    y={r + 14}
                    fill={isHighlighted || isSelected ? '#38bdf8' : '#cbd5e1'}
                    fontSize="10"
                    fontWeight={isFocal ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {pos.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Details Inspection Drawer */}
        <div
          data-testid="constellation-inspection-drawer"
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase' }}>
              Component Inspector
            </span>
            <h3 style={{ margin: '4px 0', fontSize: '16px', color: '#f8fafc' }}>
              {activeInspectNode?.displayName || focalNode.displayName}
            </h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              ID: {activeInspectNode?.nodeId || focalNode.id}
            </span>
          </div>

          {activeInspectNode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Orbit Radius:</span>
                <strong>{activeInspectNode.hopDistance === 0 ? 'Center Origin (0)' : `${activeInspectNode.hopDistance}-Hop Ring`}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Type:</span>
                <strong style={{ color: '#f8fafc' }}>{activeInspectNode.type}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Feature Cluster:</span>
                <strong style={{ color: '#38bdf8' }}>{activeInspectNode.featureName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Architectural Layer:</span>
                <strong style={{ color: '#f8fafc' }}>{activeInspectNode.layerName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Risk Profile:</span>
                <strong style={{ color: getRiskColor(activeInspectNode.risk) }}>{activeInspectNode.risk}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Coupling Score:</span>
                <strong>{activeInspectNode.metrics.coupling}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Local Fan-In:</span>
                <strong>{activeInspectNode.incomingCount}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Local Fan-Out:</span>
                <strong>{activeInspectNode.outgoingCount}</strong>
              </div>

              {activeInspectNode.nodeId !== focalNode.id && (
                <button
                  className="make-focal-btn"
                  onClick={() => {
                    if (onOptionChange) onOptionChange({ focalNodeId: activeInspectNode.nodeId });
                    if (onSelectNode) onSelectNode(activeInspectNode.nodeId);
                  }}
                  style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  Set as Orbit Focal Center →
                </button>
              )}
            </div>
          )}

          {/* Direct Relationships List */}
          <div style={{ marginTop: '12px', borderTop: '1px solid #334155', paddingTop: '8px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#f8fafc' }}>
              Dependencies ({edges.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
              {edges.map((edge) => {
                const sNode = nodes[edge.source];
                const tNode = nodes[edge.target];
                return (
                  <div
                    key={edge.edgeId}
                    style={{
                      background: '#1e293b',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      borderLeft: '2px solid #3b82f6',
                    }}
                  >
                    <div style={{ color: '#f8fafc', fontWeight: 600 }}>
                      {sNode?.displayName || edge.source} → {tNode?.displayName || edge.target}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                      Type: <span style={{ color: '#38bdf8' }}>{edge.relationshipType}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
