import React, { useState, useMemo } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import { adaptTreemap, type TreemapMetricMode, type TreemapNode, type TreemapData } from '../lib/adapters/treemap-adapter';
import { computeTreemapLayout, type TreemapRect } from '../lib/adapters/treemap-layout';

export type TreemapColorScheme = 'layer' | 'risk';

export interface ArchitectureTreemapPanelProps {
  data: ExplorerDataSchema;
  selectedNodeId?: string | null;
  onSelectComponent?: (nodeId: string) => void;
  onExploreInGraph?: (nodeId: string) => void;
  className?: string;
}

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  LWC: { bg: 'rgba(59, 130, 246, 0.25)', border: 'rgba(59, 130, 246, 0.6)', text: '#93c5fd' },
  ApexTrigger: { bg: 'rgba(236, 72, 153, 0.25)', border: 'rgba(236, 72, 153, 0.6)', text: '#fbcfe8' },
  ApexClass: { bg: 'rgba(16, 185, 129, 0.25)', border: 'rgba(16, 185, 129, 0.6)', text: '#a7f3d0' },
  Objects: { bg: 'rgba(245, 158, 11, 0.25)', border: 'rgba(245, 158, 11, 0.6)', text: '#fde68a' },
  External: { bg: 'rgba(107, 114, 128, 0.25)', border: 'rgba(107, 114, 128, 0.6)', text: '#e5e7eb' },
  Unknown: { bg: 'rgba(75, 85, 99, 0.2)', border: 'rgba(75, 85, 99, 0.4)', text: '#d1d5db' },
};

const RISK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  HIGH: { bg: 'rgba(239, 68, 68, 0.3)', border: 'rgba(239, 68, 68, 0.7)', text: '#fca5a5' },
  MEDIUM: { bg: 'rgba(245, 158, 11, 0.28)', border: 'rgba(245, 158, 11, 0.65)', text: '#fde68a' },
  LOW: { bg: 'rgba(16, 185, 129, 0.22)', border: 'rgba(16, 185, 129, 0.55)', text: '#a7f3d0' },
};

export const ArchitectureTreemapPanel: React.FC<ArchitectureTreemapPanelProps> = ({
  data,
  selectedNodeId,
  onSelectComponent,
  onExploreInGraph,
  className = '',
}) => {
  const [metricMode, setMetricMode] = useState<TreemapMetricMode>('count');
  const [colorScheme, setColorScheme] = useState<TreemapColorScheme>('layer');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubtreeId, setActiveSubtreeId] = useState<string>('root');
  const [hoveredNode, setHoveredNode] = useState<TreemapNode | null>(null);

  // Adapt data
  const treemapData: TreemapData = useMemo(() => {
    return adaptTreemap(data, { metricMode });
  }, [data, metricMode]);

  // Compute Layout
  const layoutWidth = 1100;
  const layoutHeight = 700;

  const layoutRoot: TreemapRect | null = useMemo(() => {
    return computeTreemapLayout(treemapData, {
      width: layoutWidth,
      height: layoutHeight,
      padding: 6,
      targetSubtreeId: activeSubtreeId,
    });
  }, [treemapData, activeSubtreeId]);

  // Filtered leaf rects or full treemap
  const activeNode = treemapData.nodes[activeSubtreeId] || treemapData.nodes['root'];

  // Breadcrumb path computation
  const breadcrumbPath = useMemo(() => {
    const path: TreemapNode[] = [];
    let current: TreemapNode | undefined = activeNode;
    while (current) {
      path.unshift(current);
      current = current.parentId ? treemapData.nodes[current.parentId] : undefined;
    }
    return path;
  }, [activeNode, treemapData]);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className={`architecture-treemap-panel empty ${className}`} data-testid="architecture-treemap-panel">
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
          <h3>No Architecture Data Available</h3>
          <p>Load or analyze a project to inspect the Architecture Treemap.</p>
        </div>
      </div>
    );
  }

  // Render recursive SVG/HTML rects
  const renderRect = (rect: TreemapRect): React.ReactNode => {
    const isLeaf = !rect.children || rect.children.length === 0;
    const isComponent = rect.type === 'component';

    const node = rect.node;
    const matchesSearch = searchQuery.trim() === '' ||
      node.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.sourceNodeId && node.sourceNodeId.toLowerCase().includes(searchQuery.toLowerCase()));

    let styleConfig = {
      bg: 'rgba(30, 41, 59, 0.4)',
      border: 'rgba(51, 65, 85, 0.6)',
      text: '#cbd5e1',
    };

    const isMatchingSelected = selectedNodeId ? (node.sourceNodeId === selectedNodeId || node.id === selectedNodeId) : false;
    const isDimmed = !!selectedNodeId && isComponent && !isMatchingSelected;

    if (isComponent) {
      if (isMatchingSelected) {
        styleConfig = { bg: 'rgba(59, 130, 246, 0.45)', border: '#3b82f6', text: '#ffffff' };
      } else if (colorScheme === 'risk' && node.risk) {
        styleConfig = RISK_COLORS[node.risk] || styleConfig;
      } else if (colorScheme === 'layer' && node.layer) {
        styleConfig = LAYER_COLORS[node.layer] || styleConfig;
      }
    }

    const opacity = matchesSearch ? (isDimmed ? 0.25 : 1) : 0.2;

    return (
      <div
        key={rect.id}
        data-testid={`treemap-rect-${rect.id}`}
        style={{
          position: 'absolute',
          left: `${(rect.x0 / layoutWidth) * 100}%`,
          top: `${(rect.y0 / layoutHeight) * 100}%`,
          width: `${(rect.width / layoutWidth) * 100}%`,
          height: `${(rect.height / layoutHeight) * 100}%`,
          boxSizing: 'border-box',
          padding: isLeaf ? '2px' : '4px',
          opacity,
          transition: 'all 0.15s ease-in-out',
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isComponent && node.sourceNodeId) {
              onSelectComponent?.(node.sourceNodeId);
            } else if (!isComponent && node.childIds.length > 0) {
              setActiveSubtreeId(node.id);
            }
          }}
          onMouseEnter={() => setHoveredNode(node)}
          onMouseLeave={() => setHoveredNode(null)}
          style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            backgroundColor: styleConfig.bg,
            border: `1px solid ${styleConfig.border}`,
            borderRadius: '4px',
            overflow: 'hidden',
            cursor: isComponent ? 'pointer' : node.childIds.length > 0 ? 'zoom-in' : 'default',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            padding: '4px',
            userSelect: 'none',
          }}
        >
          {rect.width > 40 && rect.height > 20 && (
            <div
              style={{
                fontSize: rect.width > 90 ? '11px' : '9px',
                fontWeight: isComponent ? 500 : 700,
                color: styleConfig.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}
              title={`${node.displayName} (${metricMode}: ${node.value})`}
            >
              {node.displayName}
            </div>
          )}

          {isComponent && rect.width > 70 && rect.height > 38 && (
            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
              {metricMode}: {node.value}
            </div>
          )}

          {rect.children && rect.children.length > 0 && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {rect.children.map(renderRect)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`architecture-treemap-panel ${className}`}
      data-testid="architecture-treemap-panel"
      style={{
        background: '#090d16',
        color: '#f8fafc',
        minHeight: '100%',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🗺️</span> Architecture Treemap Lens
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Hierarchical spatial distribution ({treemapData.summary.componentCount} components across {treemapData.summary.domainCount} domains)
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Filter */}
          <input
            type="text"
            placeholder="Search component..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              color: '#f8fafc',
              outline: 'none',
              width: '180px',
            }}
            data-testid="treemap-search-input"
          />

          {/* Metric Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
            <span>Size By:</span>
            <select
              value={metricMode}
              onChange={(e) => setMetricMode(e.target.value as TreemapMetricMode)}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                color: '#f8fafc',
                outline: 'none',
              }}
              data-testid="treemap-metric-select"
            >
              <option value="count">Component Count</option>
              <option value="fanIn">Fan-In (Dependents)</option>
              <option value="fanOut">Fan-Out (Dependencies)</option>
              <option value="coupling">Total Coupling</option>
              <option value="score">Risk Score</option>
            </select>
          </div>

          {/* Color Scheme Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
            <span>Color:</span>
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value as TreemapColorScheme)}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                color: '#f8fafc',
                outline: 'none',
              }}
              data-testid="treemap-color-select"
            >
              <option value="layer">Architecture Layer</option>
              <option value="risk">Risk Classification</option>
            </select>
          </div>
        </div>
      </div>

      {/* Breadcrumbs / Subtree Drilldown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', background: '#0f172a', padding: '8px 12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
        <span style={{ color: '#64748b' }}>Hierarchy:</span>
        {breadcrumbPath.map((node, index) => (
          <React.Fragment key={node.id}>
            {index > 0 && <span style={{ color: '#475569' }}>/</span>}
            <button
              onClick={() => setActiveSubtreeId(node.id)}
              style={{
                background: 'none',
                border: 'none',
                color: index === breadcrumbPath.length - 1 ? '#38bdf8' : '#94a3b8',
                fontWeight: index === breadcrumbPath.length - 1 ? 600 : 400,
                cursor: 'pointer',
                padding: 0,
                fontSize: '12px',
              }}
              data-testid={`treemap-breadcrumb-${node.id}`}
            >
              {node.displayName}
            </button>
          </React.Fragment>
        ))}
        {activeSubtreeId !== 'root' && (
          <button
            onClick={() => setActiveSubtreeId('root')}
            style={{
              marginLeft: 'auto',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '4px',
              color: '#f8fafc',
              fontSize: '11px',
              padding: '2px 8px',
              cursor: 'pointer',
            }}
            data-testid="treemap-reset-zoom"
          >
            Reset Drilldown 🔄
          </button>
        )}
      </div>

      {/* Treemap Visualization Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '620px',
          background: '#030712',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
        data-testid="treemap-canvas-container"
      >
        {layoutRoot ? renderRect(layoutRoot) : (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
            Unable to render layout.
          </div>
        )}
      </div>

      {/* Hover Card / Inspector Footer */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          padding: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '48px',
        }}
        data-testid="treemap-inspector-footer"
      >
        {hoveredNode ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                {hoveredNode.displayName}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
                Type: {hoveredNode.type} {hoveredNode.layer ? `(${hoveredNode.layer})` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#cbd5e1' }}>
              <span>Fan-In: <strong>{hoveredNode.metrics.fanIn}</strong></span>
              <span>Fan-Out: <strong>{hoveredNode.metrics.fanOut}</strong></span>
              <span>Coupling: <strong>{hoveredNode.metrics.coupling}</strong></span>
              {hoveredNode.risk && (
                <span>Risk: <strong style={{ color: hoveredNode.risk === 'HIGH' ? '#fca5a5' : hoveredNode.risk === 'MEDIUM' ? '#fde68a' : '#a7f3d0' }}>{hoveredNode.risk}</strong></span>
              )}
            </div>

            {hoveredNode.type === 'component' && hoveredNode.sourceNodeId && onExploreInGraph && (
              <button
                onClick={() => onExploreInGraph(hoveredNode.sourceNodeId!)}
                style={{
                  marginLeft: 'auto',
                  background: '#0284c7',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '4px 10px',
                  cursor: 'pointer',
                }}
                data-testid="treemap-explore-in-graph-btn"
              >
                Explore in Graph Canvas 🕸️
              </button>
            )}
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Hover over any container or component rectangle to view detailed architectural metrics. Click container to zoom in.
          </span>
        )}
      </div>
    </div>
  );
};
