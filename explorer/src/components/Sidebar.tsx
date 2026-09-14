import React from 'react';
import { ExplorerNode } from '../types/explorer';
import { SearchFilterState, createEmptyFilterState } from '../lib/search-filter';
import { SearchFilterPanel } from './SearchFilterPanel';

interface SidebarProps {
  nodes: ExplorerNode[];
  displayNodes: ExplorerNode[];
  filterState: SearchFilterState;
  selectedNodeId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onFilterChange: (filterState: SearchFilterState) => void;
  onSelectNode: (node: ExplorerNode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  nodes,
  displayNodes,
  filterState,
  selectedNodeId,
  collapsed,
  onToggleCollapse,
  onFilterChange,
  onSelectNode
}) => {
  if (collapsed) {
    return null;
  }

  const query = filterState.searchQuery?.trim() || "";

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Components ({displayNodes.length})</span>
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title="Collapse Sidebar"
          aria-label="Collapse Sidebar"
        >
          ◀
        </button>
      </div>

      <div className="sidebar-content">
        <SearchFilterPanel
          nodes={nodes}
          filterState={filterState}
          onFilterChange={onFilterChange}
          onSelectResult={onSelectNode}
        />

        <div className="component-list-container">
          {displayNodes.length === 0 ? (
            <div className="search-no-results-card" style={{ padding: "16px 12px", textAlign: "center", background: "rgba(15, 23, 42, 0.6)", borderRadius: "6px", border: "1px dashed rgba(255, 255, 255, 0.15)", margin: "12px 0" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>🔍</div>
              <div className="search-no-results" style={{ fontSize: "0.85rem", fontWeight: "600", color: "#f8fafc", marginBottom: "4px" }}>
                {query ? `No components match '${query}'.` : "No components found"}
              </div>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 10px 0" }}>
                Try adjusting your search terms or active filters.
              </p>
              <button
                className="clear-filters-btn"
                style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                onClick={() => onFilterChange(createEmptyFilterState())}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            displayNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  className={`component-list-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectNode(node)}
                >
                  <div className="component-item-info">
                    <span className="component-item-name">{node.displayName}</span>
                    <span className="component-item-type">{node.type}</span>
                  </div>
                  <div className="component-item-badges">
                    <span className={`badge risk-badge risk-${node.risk.toLowerCase()}`}>
                      {node.risk}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;