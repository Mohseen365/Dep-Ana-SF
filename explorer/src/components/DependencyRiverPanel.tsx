import React, { useMemo, useState } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import { adaptSankeyRiver, type SankeyFlow, type SankeyNode } from '../lib/adapters/sankey-adapter';
import { computeSankeyLayout } from '../lib/layout/sankey-layout';

export interface DependencyRiverPanelProps {
  data: ExplorerDataSchema;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onReturnToGraph?: () => void;
  className?: string;
}

export const DependencyRiverPanel: React.FC<DependencyRiverPanelProps> = ({
  data,
  selectedNodeId: selectedNodeIdProp,
  onSelectNode,
  onReturnToGraph,
  className = '',
}) => {
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [hoveredFlowId, setHoveredFlowId] = useState<string | null>(null);
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null);
  const canonicalSelectedId = selectedNodeIdProp || internalSelectedNodeId;
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Transform canonical graph data into pure Sankey adapter model
  const adapterData = useMemo(() => adaptSankeyRiver(data), [data]);

  // 2. Compute deterministic Sankey layout geometry
  const layout = useMemo(
    () => computeSankeyLayout(adapterData, { width: 1100, height: 680 }),
    [adapterData]
  );

  // 3. Active selected or hovered flow / node details
  const activeFlow: SankeyFlow | null = useMemo(() => {
    const id = selectedFlowId || hoveredFlowId;
    if (!id) return null;
    return adapterData.flowMap.get(id) ?? null;
  }, [selectedFlowId, hoveredFlowId, adapterData.flowMap]);

  const activeNode: SankeyNode | null = useMemo(() => {
    const id = canonicalSelectedId || hoveredNodeId;
    if (!id) return null;
    return adapterData.nodeMap.get(id) ?? null;
  }, [canonicalSelectedId, hoveredNodeId, adapterData.nodeMap]);

  // Filtered nodes or flows by search query
  const matchesSearch = (nodeId: string, nodeName: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return nodeId.toLowerCase().includes(q) || nodeName.toLowerCase().includes(q);
  };

  return (
    <div
      className={`dependency-river-panel ${className}`}
      data-testid="dependency-river-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--surface-panel, #111827)',
        color: 'var(--text-primary, #f8fafc)',
        borderRadius: '8px',
        border: '1px solid var(--border-default, #334155)',
        overflow: 'hidden',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--surface-subtle, #0f172a)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🌊</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
              Dependency River / Sankey Lens
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
              Macro Architectural Flow Volume & Edge-Level Provenance
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            placeholder="Filter feature flows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              backgroundColor: 'var(--surface-card, #1e293b)',
              border: '1px solid var(--border-default, #334155)',
              color: 'var(--text-primary, #f8fafc)',
              borderRadius: '4px',
              width: '180px',
            }}
            data-testid="sankey-search-input"
          />

          {onReturnToGraph && (
            <button
              onClick={onReturnToGraph}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'var(--surface-card, #1e293b)',
                border: '1px solid var(--border-default, #334155)',
                color: 'var(--text-secondary, #cbd5e1)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              data-testid="return-to-graph-btn"
            >
              ⬅ Return to Graph
            </button>
          )}
        </div>
      </div>

      {/* Main Content Split (Canvas + Inspector) */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left Interactive SVG Canvas */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            padding: '16px',
            backgroundColor: '#0a0f1d',
          }}
          data-testid="sankey-canvas-container"
        >
          <svg
            width={layout.width}
            height={layout.height}
            style={{ display: 'block' }}
            data-testid="sankey-svg"
          >
            <defs>
              <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="flowGradientActive" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.85" />
              </linearGradient>
            </defs>

            {/* Stage Column Backgrounds & Header Labels */}
            {layout.stages.map((stage) => (
              <g key={stage.layer}>
                <rect
                  x={stage.x - 10}
                  y={10}
                  width={stage.width + 20}
                  height={layout.height - 20}
                  fill="#0d1527"
                  rx={6}
                  stroke="#1e293b"
                  strokeWidth={1}
                />
                <text
                  x={stage.x + stage.width / 2}
                  y={32}
                  fill="#94a3b8"
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="middle"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {stage.label}
                </text>
              </g>
            ))}

            {/* Flow Streams (Paths) */}
            {layout.flows.map((flowGeom) => {
              const flow = adapterData.flowMap.get(flowGeom.flowId);
              if (!flow) return null;

              const isHighlighted =
                hoveredFlowId === flowGeom.flowId ||
                selectedFlowId === flowGeom.flowId ||
                (hoveredNodeId &&
                  (flow.sourceFeatureId === hoveredNodeId || flow.targetFeatureId === hoveredNodeId)) ||
                (canonicalSelectedId &&
                  (flow.sourceFeatureId === canonicalSelectedId || flow.targetFeatureId === canonicalSelectedId));

              const isMatch =
                matchesSearch(flow.sourceFeatureId, flow.sourceFeatureId) ||
                matchesSearch(flow.targetFeatureId, flow.targetFeatureId);

              return (
                <path
                  key={flowGeom.flowId}
                  d={flowGeom.pathString}
                  fill="none"
                  stroke={isHighlighted ? 'url(#flowGradientActive)' : 'url(#flowGradient)'}
                  strokeWidth={isHighlighted ? flowGeom.strokeWidth + 2 : flowGeom.strokeWidth}
                  opacity={isMatch ? (isHighlighted ? 1.0 : 0.65) : 0.15}
                  style={{
                    cursor: 'pointer',
                    transition: 'stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease',
                  }}
                  onMouseEnter={() => setHoveredFlowId(flowGeom.flowId)}
                  onMouseLeave={() => setHoveredFlowId(null)}
                  onClick={() => {
                    setSelectedFlowId(flowGeom.flowId === selectedFlowId ? null : flowGeom.flowId);
                    setInternalSelectedNodeId(null);
                  }}
                  data-testid={`sankey-flow-${flowGeom.flowId}`}
                />
              );
            })}

            {/* Feature Node Cards */}
            {layout.nodes.map((nodeGeom) => {
              const node = adapterData.nodeMap.get(nodeGeom.nodeId);
              if (!node) return null;

              const isNodeMatching = canonicalSelectedId ? (
                node.anchorNodeId === canonicalSelectedId ||
                node.id === canonicalSelectedId ||
                nodeGeom.nodeId === canonicalSelectedId
              ) : false;

              const isSelected = canonicalSelectedId === nodeGeom.nodeId || isNodeMatching;
              const isHovered = hoveredNodeId === nodeGeom.nodeId;
              const isMatch = matchesSearch(node.id, node.name);
              const isDimmed = !!canonicalSelectedId && !isNodeMatching;

              return (
                <g
                  key={nodeGeom.nodeId}
                  transform={`translate(${nodeGeom.x}, ${nodeGeom.y})`}
                  style={{ cursor: 'pointer', opacity: isDimmed ? 0.25 : isMatch ? 1.0 : 0.3 }}
                  onMouseEnter={() => setHoveredNodeId(nodeGeom.nodeId)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => {
                    setInternalSelectedNodeId(nodeGeom.nodeId === internalSelectedNodeId ? null : nodeGeom.nodeId);
                    setSelectedFlowId(null);
                    if (node.anchorNodeId && onSelectNode) {
                      onSelectNode(node.anchorNodeId);
                    }
                  }}
                  data-testid={`sankey-node-${nodeGeom.nodeId}`}
                >
                  <rect
                    width={nodeGeom.width}
                    height={nodeGeom.height}
                    rx={6}
                    fill={isSelected ? '#1e3a8a' : isHovered ? '#1e293b' : '#0f172a'}
                    stroke={
                      isSelected
                        ? '#3b82f6'
                        : isHovered
                        ? '#60a5fa'
                        : isMatch
                        ? '#334155'
                        : '#1e293b'
                    }
                    strokeWidth={isSelected || isHovered ? 2 : 1}
                  />

                  {/* Left Layer Indicator Bar */}
                  <rect
                    width={4}
                    height={nodeGeom.height - 8}
                    x={4}
                    y={4}
                    rx={2}
                    fill={
                      node.primaryLayer === 'presentation'
                        ? '#3b82f6'
                        : node.primaryLayer === 'application'
                        ? '#10b981'
                        : node.primaryLayer === 'domain'
                        ? '#f59e0b'
                        : '#8b5cf6'
                    }
                  />

                  {/* Node Label & Stats */}
                  <text
                    x={14}
                    y={20}
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="600"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.name.length > 20 ? `${node.name.slice(0, 18)}…` : node.name}
                  </text>

                  <text
                    x={14}
                    y={34}
                    fill="#94a3b8"
                    fontSize="10"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.componentCount} comps · in:{node.totalInflow} out:{node.totalOutflow}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Inspector & Provenance Detail Pane */}
        <div
          style={{
            width: '320px',
            borderLeft: '1px solid var(--border-default, #334155)',
            backgroundColor: 'var(--surface-subtle, #0f172a)',
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
          data-testid="sankey-inspector-pane"
        >
          {/* Summary Overview */}
          <div>
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                color: 'var(--text-muted, #94a3b8)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              River Metrics Summary
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--surface-card, #1e293b)',
                  padding: '8px',
                  borderRadius: '4px',
                }}
              >
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>Features</div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                  {adapterData.summary.totalFeatures}
                </div>
              </div>
              <div
                style={{
                  backgroundColor: 'var(--surface-card, #1e293b)',
                  padding: '8px',
                  borderRadius: '4px',
                }}
              >
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>
                  Directed Flows
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                  {adapterData.summary.totalFlows}
                </div>
              </div>
              <div
                style={{
                  backgroundColor: 'var(--surface-card, #1e293b)',
                  padding: '8px',
                  borderRadius: '4px',
                }}
              >
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>
                  Total Edges
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                  {adapterData.summary.totalEdgeWeight}
                </div>
              </div>
              <div
                style={{
                  backgroundColor: 'var(--surface-card, #1e293b)',
                  padding: '8px',
                  borderRadius: '4px',
                }}
              >
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>Max Stream</div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                  {adapterData.summary.maxFlowWeight}
                </div>
              </div>
            </div>
          </div>

          {/* Active Selected Flow Inspection */}
          {activeFlow && (
            <div
              style={{
                backgroundColor: 'var(--surface-card, #1e293b)',
                borderRadius: '6px',
                padding: '12px',
                border: '1px solid var(--accent-primary, #3b82f6)',
              }}
              data-testid="flow-inspector-card"
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-primary, #3b82f6)',
                  marginBottom: '4px',
                }}
              >
                SELECTED FLOW STREAM
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                {activeFlow.sourceFeatureId} ➔ {activeFlow.targetFeatureId}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary, #cbd5e1)',
                  marginBottom: '10px',
                }}
              >
                Flow Weight: <strong>{activeFlow.weight} component edges</strong>
              </div>

              {/* Provenance List */}
              <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>
                Component Edge Provenance ({activeFlow.provenance.length}):
              </div>
              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {activeFlow.provenance.map((prov) => (
                  <div
                    key={prov.edgeId}
                    style={{
                      fontSize: '10px',
                      backgroundColor: '#0f172a',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    }}
                  >
                    <div>
                      {prov.sourceComponentName} ➔ {prov.targetComponentName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Selected Feature Node Inspection */}
          {activeNode && !activeFlow && (
            <div
              style={{
                backgroundColor: 'var(--surface-card, #1e293b)',
                borderRadius: '6px',
                padding: '12px',
                border: '1px solid #38bdf8',
              }}
              data-testid="node-inspector-card"
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#38bdf8',
                  marginBottom: '4px',
                }}
              >
                SELECTED FEATURE CLUSTER
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                {activeNode.name}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted, #94a3b8)',
                  marginBottom: '10px',
                }}
              >
                Layer: {activeNode.primaryLayer} · Domain: {activeNode.primaryDomain}
              </div>

              {onSelectNode && activeNode.anchorNodeId && (
                <button
                  onClick={() => onSelectNode(activeNode.anchorNodeId)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: 'var(--accent-primary, #3b82f6)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                  data-testid="explore-feature-in-graph-btn"
                >
                  🔍 Explore in Graph Canvas
                </button>
              )}
            </div>
          )}

          {!activeFlow && !activeNode && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted, #94a3b8)',
                fontStyle: 'italic',
                textAlign: 'center',
                marginTop: '20px',
              }}
            >
              Click a feature node card or flow stream to inspect full edge provenance.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
