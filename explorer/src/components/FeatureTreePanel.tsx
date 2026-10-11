import React, { useMemo, useState, useEffect } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import {
  adaptFeatureTree,
  type FeatureTreeData,
  type FeatureTreeNode,
} from '../lib/adapters/tree-adapter';
import { useInvestigationOptional } from '../context/InvestigationContext';

export interface FeatureTreePanelProps {
  data: ExplorerDataSchema | null;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

export const FeatureTreePanel: React.FC<FeatureTreePanelProps> = ({
  data,
  selectedNodeId: selectedNodeIdProp,
  onSelectNode: onSelectNodeProp,
  className = '',
}) => {
  const investigation = useInvestigationOptional();
  const canonicalSelectedNodeId = selectedNodeIdProp ?? investigation?.state.selectedNodeId;

  const handleSelectNode = (nodeId: string) => {
    if (investigation) {
      investigation.selectNode(nodeId);
    }
    if (onSelectNodeProp) {
      onSelectNodeProp(nodeId);
    }
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string | null>(null);
  const [hoveredTreeNodeId, setHoveredTreeNodeId] = useState<string | null>(null);

  // Safely invoke adaptFeatureTree without mutating input data
  const treeData: FeatureTreeData | null = useMemo(() => {
    if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      return null;
    }
    return adaptFeatureTree(data);
  }, [data]);

  // Initialize expanded nodes on treeData load: expand root, domains, and features by default
  useEffect(() => {
    if (!treeData) {
      setExpandedNodeIds(new Set());
      return;
    }
    const initialExpanded = new Set<string>();
    Object.values(treeData.nodes).forEach(node => {
      if (node.type === 'root' || node.type === 'domain' || node.type === 'feature') {
        initialExpanded.add(node.id);
      }
    });
    setExpandedNodeIds(initialExpanded);
  }, [treeData]);

  // Expand all parent nodes for nodes matching search query
  const matchingNodeIds = useMemo(() => {
    if (!treeData || !searchQuery.trim()) {
      return null;
    }
    const query = searchQuery.toLowerCase().trim();
    const matches = new Set<string>();

    Object.values(treeData.nodes).forEach(node => {
      const matchName = node.displayName.toLowerCase().includes(query);
      const matchId = node.id.toLowerCase().includes(query);
      const matchSource = node.sourceNodeId?.toLowerCase().includes(query) ?? false;
      const matchEntity = node.entityType?.toLowerCase().includes(query) ?? false;
      const matchRole = node.featureRole?.toLowerCase().includes(query) ?? false;

      if (matchName || matchId || matchSource || matchEntity || matchRole) {
        matches.add(node.id);
      }
    });

    return matches;
  }, [treeData, searchQuery]);

  // Auto-expand path to selectedNodeId when canonicalSelectedNodeId changes
  useEffect(() => {
    if (!treeData || !canonicalSelectedNodeId) return;
    const targetNode = Object.values(treeData.nodes).find(n => n.sourceNodeId === canonicalSelectedNodeId || n.id === canonicalSelectedNodeId);
    if (!targetNode) return;

    setExpandedNodeIds(prev => {
      const next = new Set<string>(prev);
      let curr: FeatureTreeNode | undefined = targetNode;
      while (curr && curr.parentId) {
        next.add(curr.parentId);
        curr = treeData.nodes[curr.parentId];
      }
      return next;
    });
  }, [treeData, canonicalSelectedNodeId]);

  // Auto-expand path to matching nodes when search query changes
  useEffect(() => {
    if (!treeData || !matchingNodeIds || matchingNodeIds.size === 0) {
      return;
    }
    setExpandedNodeIds(prev => {
      const next = new Set<string>(prev);
      matchingNodeIds.forEach(matchId => {
        let curr = treeData.nodes[matchId];
        while (curr && curr.parentId) {
          next.add(curr.parentId);
          curr = treeData.nodes[curr.parentId];
        }
      });
      return next;
    });
  }, [treeData, matchingNodeIds]);

  if (!treeData || Object.keys(treeData.nodes).length === 0) {
    return (
      <div
        className={`feature-tree-panel ui-panel ${className}`}
        data-testid="feature-tree-panel"
        style={{ padding: '24px', textAlign: 'center' }}
      >
        <div className="tree-empty-state">
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🌳</span>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>
            No Feature Tree Data
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
            Select or analyze a project dataset containing components to view the architecture tree hierarchy.
          </p>
        </div>
      </div>
    );
  }

  const { rootId, nodes, summary } = treeData;

  const toggleExpand = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const btnTarget = e?.currentTarget as HTMLElement | undefined;
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        btnTarget?.focus();
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>(Object.keys(nodes));
    setExpandedNodeIds(all);
  };

  const collapseAll = () => {
    setExpandedNodeIds(new Set([rootId]));
  };

  const getLayerColor = (layer?: string) => {
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

  const getRiskBadgeStyle = (risk?: string) => {
    switch (risk) {
      case 'HIGH':
        return { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' };
      case 'MEDIUM':
        return { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid #f59e0b' };
      case 'LOW':
        return { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981' };
      default:
        return { backgroundColor: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', border: '1px solid #64748b' };
    }
  };

  const getNodeIcon = (node: FeatureTreeNode) => {
    switch (node.type) {
      case 'root':
        return '🏛️';
      case 'domain':
        return '🌐';
      case 'feature':
        return '🧩';
      case 'role':
        return '🏷️';
      case 'component':
        switch (node.entityType) {
          case 'ApexClass':
            return '📄';
          case 'ApexTrigger':
            return '⚡';
          case 'LWC':
            return '⚛️';
          case 'Visualforce':
            return '🌐';
          case 'Flow':
            return '🔀';
          case 'Object':
          case 'CustomObject':
            return '📦';
          case 'Field':
          case 'CustomField':
            return '🏷️';
          case 'External':
            return '🔗';
          default:
            return '📄';
        }
    }
  };

  const activeInspectedNodeId = hoveredTreeNodeId || selectedTreeNodeId;
  const inspectedNode = activeInspectedNodeId ? nodes[activeInspectedNodeId] : null;

  // Helper to recursively render tree nodes
  const renderTreeNode = (nodeId: string) => {
    const node = nodes[nodeId];
    if (!node) return null;

    const hasChildren = node.childIds && node.childIds.length > 0;
    const isExpanded = expandedNodeIds.has(node.id);
    const childrenRegionId = `tree-children-${node.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const isCanonicalSelected = canonicalSelectedNodeId ? (node.sourceNodeId === canonicalSelectedNodeId || node.id === canonicalSelectedNodeId) : false;
    const isSelected = selectedTreeNodeId === node.id || isCanonicalSelected;
    const isDimmed = !!canonicalSelectedNodeId && !isCanonicalSelected && node.type === 'component';
    const isHovered = hoveredTreeNodeId === node.id;
    const isMatch = matchingNodeIds ? matchingNodeIds.has(node.id) : false;

    return (
      <div key={node.id} className="tree-node-wrapper" style={{ display: 'flex', flexDirection: 'column', opacity: isDimmed ? 0.35 : 1 }}>
        <div
          className={`tree-node-row ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isDimmed ? 'dimmed' : ''}`}
          data-testid={`tree-node-${node.id}`}
          role="treeitem"
          tabIndex={0}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-selected={isSelected}
          aria-label={`${node.displayName}, ${node.type}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            paddingLeft: `${node.depth * 18 + 8}px`,
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: isSelected
              ? 'rgba(59, 130, 246, 0.25)'
              : isHovered
              ? 'var(--surface-hover, #2d3748)'
              : isMatch
              ? 'rgba(245, 158, 11, 0.15)'
              : 'transparent',
            borderLeft: isSelected ? '3px solid var(--accent-primary, #3b82f6)' : '3px solid transparent',
            transition: 'all 0.1s ease',
            gap: '6px',
            fontSize: '12px',
          }}
          onClick={() => {
            setSelectedTreeNodeId(node.id);
            if (node.type === 'component' && node.sourceNodeId) {
              handleSelectNode(node.sourceNodeId);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedTreeNodeId(node.id);
              if (node.type === 'component' && node.sourceNodeId) {
                handleSelectNode(node.sourceNodeId);
              }
            } else if (hasChildren && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
              e.preventDefault();
              toggleExpand(node.id);
            }
          }}
          onMouseEnter={() => setHoveredTreeNodeId(node.id)}
          onMouseLeave={() => setHoveredTreeNodeId(null)}
        >
          {/* Expand / Collapse Chevron */}
          {hasChildren ? (
            <button
              type="button"
              className="tree-expand-btn"
              data-testid={`expand-btn-${node.id}`}
              aria-label={isExpanded ? `Collapse ${node.displayName}` : `Expand ${node.displayName}`}
              aria-expanded={isExpanded}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                fontSize: '10px',
                padding: '0 2px',
                width: '16px',
                textAlign: 'center',
              }}
              onClick={(e) => toggleExpand(node.id, e)}
              title={isExpanded ? `Collapse ${node.displayName}` : `Expand ${node.displayName}`}
              aria-label={isExpanded ? `Collapse ${node.displayName}` : `Expand ${node.displayName}`}
              aria-expanded={isExpanded}
              aria-controls={isExpanded ? childrenRegionId : undefined}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span style={{ width: '16px', display: 'inline-block' }} />
          )}

          {/* Type Icon */}
          <span style={{ fontSize: '13px', lineHeight: 1 }}>{getNodeIcon(node)}</span>

          {/* Display Name */}
          <span
            style={{
              fontWeight: node.type === 'root' || node.type === 'domain' ? 700 : node.type === 'feature' ? 600 : 400,
              color: 'var(--text-primary, #f8fafc)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {node.displayName}
          </span>

          {/* Child Count Pill */}
          {hasChildren && (
            <span
              style={{
                fontSize: '10px',
                color: 'var(--text-muted, #94a3b8)',
                backgroundColor: 'var(--surface-subtle, #0f172a)',
                padding: '1px 5px',
                borderRadius: '9999px',
                border: '1px solid var(--border-subtle, #1e293b)',
              }}
            >
              {node.childIds.length}
            </span>
          )}

          {/* Role Pill */}
          {node.type === 'role' && (
            <span
              style={{
                fontSize: '9px',
                color: '#93c5fd',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 600,
                marginLeft: 'auto',
              }}
            >
              Role
            </span>
          )}

          {/* Component Metadata Badges */}
          {node.type === 'component' && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Layer Pill */}
              {node.layer && (
                <span
                  style={{
                    fontSize: '9px',
                    color: getLayerColor(node.layer),
                    backgroundColor: 'var(--surface-subtle, #0f172a)',
                    border: `1px solid ${getLayerColor(node.layer)}`,
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {node.layer}
                </span>
              )}

              {/* Entity Type Pill */}
              {node.entityType && (
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-secondary, #cbd5e1)',
                    backgroundColor: 'var(--surface-card, #1e293b)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {node.entityType}
                </span>
              )}

              {/* Risk Badge */}
              {node.risk && (
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '3px',
                    ...getRiskBadgeStyle(node.risk),
                  }}
                >
                  {node.risk}
                </span>
              )}

              {/* Test / Field flags */}
              {node.isTest && (
                <span
                  style={{
                    fontSize: '9px',
                    color: '#6ee7b7',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                  }}
                >
                  TEST
                </span>
              )}
            </div>
          )}
        </div>

        {/* Children Subtree */}
        {hasChildren && isExpanded && (
          <div id={childrenRegionId} className="tree-node-children" style={{ display: 'flex', flexDirection: 'column' }}>
            {node.childIds.map(childId => renderTreeNode(childId))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`feature-tree-panel ui-panel ${className}`}
      data-testid="feature-tree-panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', padding: '12px' }}
    >
      {/* Header & Controls */}
      <div
        className="tree-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default, #334155)',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🌳</span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
            Architecture Feature Hierarchy
          </h2>
        </div>

        {/* Header Summary Statistics */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Domains: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{summary.domainCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Features: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{summary.featureCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Components: <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>{summary.componentCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Total Nodes: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{summary.totalNodes}</strong>
          </span>
        </div>
      </div>

      {/* Toolbar: Search and Expand/Collapse Controls */}
      <div
        className="tree-toolbar"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
      >
        <div style={{ flex: 1, maxWidth: '360px', position: 'relative' }}>
          <input
            type="text"
            data-testid="tree-search-input"
            className="ui-input"
            placeholder="Search hierarchy (name, type, role, source)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '12px',
              backgroundColor: 'var(--surface-base, #090d16)',
              color: 'var(--text-primary, #f8fafc)',
              border: '1px solid var(--border-default, #334155)',
              borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="ui-btn ui-btn-secondary ui-btn-sm"
            data-testid="expand-all-btn"
            onClick={expandAll}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              backgroundColor: 'var(--surface-card, #1e293b)',
              border: '1px solid var(--border-default, #334155)',
              color: 'var(--text-secondary, #cbd5e1)',
              borderRadius: '4px',
            }}
          >
            Expand All
          </button>
          <button
            className="ui-btn ui-btn-secondary ui-btn-sm"
            data-testid="collapse-all-btn"
            onClick={collapseAll}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              backgroundColor: 'var(--surface-card, #1e293b)',
              border: '1px solid var(--border-default, #334155)',
              color: 'var(--text-secondary, #cbd5e1)',
              borderRadius: '4px',
            }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="tree-content-area"
        style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0, overflow: 'hidden' }}
      >
        {/* Tree Viewport */}
        <div
          className="tree-viewport-scroll"
          data-testid="feature-tree-viewport"
          role="tree"
          aria-label="Feature Hierarchy Tree"
          style={{
            flex: 1,
            overflow: 'auto',
            border: '1px solid var(--border-default, #334155)',
            borderRadius: '6px',
            backgroundColor: 'var(--surface-base, #090d16)',
            padding: '8px',
          }}
        >
          {renderTreeNode(rootId)}
        </div>

        {/* Side Inspector Card */}
        <div
          className="tree-inspector-pane"
          data-testid="tree-inspector-pane"
          style={{
            width: '280px',
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
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
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted, #94a3b8)',
              }}
            >
              Node Details
            </h4>

            {inspectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>
                    Display Name:
                  </span>
                  <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{inspectedNode.displayName}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>
                      Node Type:
                    </span>
                    <strong style={{ color: 'var(--accent-primary, #3b82f6)', textTransform: 'capitalize' }}>
                      {inspectedNode.type}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>
                      Depth:
                    </span>
                    <strong>{inspectedNode.depth}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>
                      Children:
                    </span>
                    <strong>{inspectedNode.childIds.length}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>
                      Domain:
                    </span>
                    <strong>{inspectedNode.domain || 'Shared'}</strong>
                  </div>
                </div>

                {inspectedNode.featureRole && (
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>
                      Feature Role:
                    </span>
                    <span style={{ color: '#93c5fd', fontWeight: 600 }}>{inspectedNode.featureRole}</span>
                  </div>
                )}

                {inspectedNode.type === 'component' && (
                  <div
                    style={{
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: '1px dashed var(--border-default, #334155)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>
                        Source Node ID:
                      </span>
                      <code
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono, monospace)',
                          color: 'var(--text-secondary, #cbd5e1)',
                          wordBreak: 'break-all',
                        }}
                      >
                        {inspectedNode.sourceNodeId}
                      </code>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>
                          Layer:
                        </span>
                        <strong style={{ color: getLayerColor(inspectedNode.layer) }}>
                          {inspectedNode.layer}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', display: 'block' }}>
                          Risk:
                        </span>
                        <strong style={getRiskBadgeStyle(inspectedNode.risk)}>
                          {inspectedNode.risk || 'LOW'}
                        </strong>
                      </div>
                    </div>

                    {inspectedNode.sourceNodeId && (
                      <button
                        className="ui-btn ui-btn-primary ui-btn-sm"
                        data-testid="inspect-in-graph-btn"
                        onClick={() => handleSelectNode(inspectedNode.sourceNodeId!)}
                        style={{
                          marginTop: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          backgroundColor: 'var(--accent-primary, #3b82f6)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        Explore in Graph Canvas →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                Select or hover over a tree node to inspect hierarchy metadata.
              </div>
            )}
          </div>

          {/* Hierarchy Legend */}
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
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted, #94a3b8)',
              }}
            >
              Hierarchy Levels
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🏛️</span> <strong>Root</strong>
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', marginLeft: 'auto' }}>
                  Depth 0
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🌐</span> <strong>Domain</strong>
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', marginLeft: 'auto' }}>
                  Depth 1
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🧩</span> <strong>Feature</strong>
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', marginLeft: 'auto' }}>
                  Depth 2
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🏷️</span> <strong>Role</strong>
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', marginLeft: 'auto' }}>
                  Depth 3
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📄</span> <strong>Component</strong>
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px', marginLeft: 'auto' }}>
                  Depth 4
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureTreePanel;
