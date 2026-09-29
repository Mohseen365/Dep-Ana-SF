import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ExplorerNode } from '../types/explorer';
import { SearchFilterState, createEmptyFilterState } from '../lib/search-filter';
import { SearchFilterPanel, QuickFilterPreset, SortOption } from './SearchFilterPanel';

interface SidebarProps {
  nodes: ExplorerNode[];
  displayNodes: ExplorerNode[];
  filterState: SearchFilterState;
  selectedNodeId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onFilterChange: (filterState: SearchFilterState) => void;
  onSelectNode: (node: ExplorerNode) => void;
  isLoading?: boolean;
  error?: string | null;
}

const RISK_WEIGHTS: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0
};

export const Sidebar: React.FC<SidebarProps> = ({
  nodes,
  displayNodes,
  filterState,
  selectedNodeId,
  collapsed,
  onToggleCollapse,
  onFilterChange,
  onSelectNode,
  isLoading = false,
  error = null
}) => {
  const [quickFilter, setQuickFilter] = useState<QuickFilterPreset>("all");
  const [sortOption, setSortOption] = useState<SortOption>("risk");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Closed state: return null to ensure zero background, border, padding, or phantom hitbox remain
  if (collapsed) {
    return null;
  }

  // Apply quick filter & sorting onto displayNodes
  const processedNodes = useMemo(() => {
    let result = [...displayNodes];

    // Quick Filter
    if (quickFilter === "high_risk") {
      result = result.filter(
        (n) => (n.risk as string) === "HIGH" || (n.risk as string) === "CRITICAL"
      );
    } else if (quickFilter === "hotspots") {
      result = result.filter(
        (n) =>
          n.risk === "HIGH" ||
          (n.metrics?.fanIn ?? 0) >= 3 ||
          (n.metrics?.fanOut ?? 0) >= 3
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOption === "risk") {
        const weightA = RISK_WEIGHTS[a.risk] ?? 0;
        const weightB = RISK_WEIGHTS[b.risk] ?? 0;
        if (weightA !== weightB) {
          return weightB - weightA; // High risk first
        }
        return a.displayName.localeCompare(b.displayName);
      } else if (sortOption === "name") {
        return a.displayName.localeCompare(b.displayName);
      } else if (sortOption === "type") {
        const typeCompare = a.type.localeCompare(b.type);
        if (typeCompare !== 0) return typeCompare;
        return a.displayName.localeCompare(b.displayName);
      }
      return 0;
    });

    return result;
  }, [displayNodes, quickFilter, sortOption]);

  // Keep focused index within bounds
  useEffect(() => {
    if (focusedIndex >= processedNodes.length) {
      setFocusedIndex(processedNodes.length > 0 ? processedNodes.length - 1 : -1);
    }
  }, [processedNodes.length, focusedIndex]);

  // Keyboard navigation handler for the component list
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (processedNodes.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < processedNodes.length - 1 ? prev + 1 : prev;
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : 0;
          return next;
        });
      } else if (e.key === "Enter" || e.key === " ") {
        if (focusedIndex >= 0 && focusedIndex < processedNodes.length) {
          e.preventDefault();
          onSelectNode(processedNodes[focusedIndex]);
        }
      }
    },
    [processedNodes, focusedIndex, onSelectNode]
  );

  const getRiskDotColor = (risk: string) => {
    switch (risk) {
      case "CRITICAL":
      case "HIGH":
        return "#ef4444";
      case "MEDIUM":
        return "#f59e0b";
      case "LOW":
        return "#10b981";
      default:
        return "#64748b";
    }
  };

  const getRiskBadgeStyle = (risk: string) => {
    switch (risk) {
      case "CRITICAL":
      case "HIGH":
        return {
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          color: "#f87171",
          border: "1px solid rgba(239, 68, 68, 0.3)"
        };
      case "MEDIUM":
        return {
          backgroundColor: "rgba(245, 158, 11, 0.15)",
          color: "#f59e0b",
          border: "1px solid rgba(245, 158, 11, 0.3)"
        };
      case "LOW":
        return {
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          color: "#10b981",
          border: "1px solid rgba(16, 185, 129, 0.3)"
        };
      default:
        return {
          backgroundColor: "rgba(100, 116, 139, 0.15)",
          color: "#94a3b8",
          border: "1px solid rgba(100, 116, 139, 0.3)"
        };
    }
  };

  return (
    <aside
      className="sidebar ui-panel"
      aria-label="Component Inventory Sidebar"
      data-testid="component-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "var(--surface-panel, #111827)",
        overflow: "hidden"
      }}
    >
      {/* Header Bar */}
      <div
        className="sidebar-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "var(--surface-subtle, #0f172a)"
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "var(--text-muted, #94a3b8)",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono, monospace)"
            }}
          >
            COMPONENTS
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-primary, #f8fafc)"
            }}
          >
            {processedNodes.length}
          </span>
        </div>
        <button
          type="button"
          className="ui-icon-btn ui-icon-btn-sm"
          onClick={onToggleCollapse}
          title="Collapse Sidebar"
          aria-label="Collapse Component Sidebar"
          data-testid="collapse-sidebar-btn"
          style={{
            background: "transparent",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "4px",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "11px",
            padding: "3px 6px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <span aria-hidden="true">◀</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="sidebar-content" style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        <SearchFilterPanel
          nodes={nodes}
          filterState={filterState}
          quickFilter={quickFilter}
          sortOption={sortOption}
          onFilterChange={onFilterChange}
          onQuickFilterChange={setQuickFilter}
          onSortOptionChange={setSortOption}
          onSelectResult={onSelectNode}
        />

        {/* Component List */}
        <div
          ref={listContainerRef}
          className="component-list-container"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="listbox"
          aria-label="Component Inventory List"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "6px 8px",
            outline: "none"
          }}
        >
          {/* Visually hidden live region for screen-reader announcements */}
          <div
            className="sr-only"
            aria-live="polite"
            aria-atomic="true"
            data-testid="sidebar-a11y-status"
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {isLoading
              ? 'Loading components'
              : error
              ? 'Error loading components'
              : `Showing ${processedNodes.length} components`}
          </div>

          {isLoading ? (
            /* Skeleton Loading State */
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "44px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(255, 255, 255, 0.04)"
                  }}
                />
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div
              className="ui-empty-state"
              style={{
                padding: "24px 12px",
                textAlign: "center",
                color: "#ef4444"
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "6px" }} aria-hidden="true">⚠️</div>
              <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Error Loading Components
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{error}</div>
            </div>
          ) : processedNodes.length === 0 ? (
            /* Empty State */
            <div
              className="ui-empty-state"
              style={{
                padding: "32px 16px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px", opacity: 0.6 }} aria-hidden="true">🔍</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc", marginBottom: "4px" }}>
                No components match your search
              </div>
              <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 12px 0", maxWidth: "200px" }}>
                Try adjusting your search terms or active filters.
              </p>
              <button
                type="button"
                className="ui-btn ui-btn-primary ui-btn-sm"
                onClick={() => {
                  setQuickFilter("all");
                  onFilterChange(createEmptyFilterState());
                }}
                style={{ fontSize: "11px", padding: "4px 12px", borderRadius: "4px" }}
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            /* List Rows */
            processedNodes.map((node, index) => {
              const isSelected = selectedNodeId === node.id;
              const isFocused = focusedIndex === index;

              return (
                <div
                  key={node.id}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${node.displayName}, ${node.type}, risk ${node.risk}`}
                  tabIndex={-1}
                  className={`component-list-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setFocusedIndex(index);
                    onSelectNode(node);
                  }}
                  onMouseEnter={() => setFocusedIndex(index)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "6px 8px",
                    marginBottom: "4px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    backgroundColor: isSelected
                      ? "rgba(59, 130, 246, 0.15)"
                      : isFocused
                      ? "rgba(255, 255, 255, 0.05)"
                      : "transparent",
                    borderLeft: isSelected
                      ? "3px solid #3b82f6"
                      : isFocused
                      ? "3px solid rgba(255, 255, 255, 0.2)"
                      : "3px solid transparent",
                    boxShadow: isSelected ? "0 1px 3px rgba(0, 0, 0, 0.3)" : "none"
                  }}
                >
                  {/* Top Row: Dot + Name + Risk Badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", paddingRight: "6px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          backgroundColor: getRiskDotColor(node.risk),
                          flexShrink: 0
                        }}
                        title={`Risk level: ${node.risk}`}
                        aria-hidden="true"
                      />
                      <span
                        className="component-item-name"
                        style={{
                          fontSize: "12px",
                          fontWeight: isSelected ? 700 : 600,
                          color: isSelected ? "#ffffff" : "#f8fafc",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {node.displayName}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: "4px",
                        letterSpacing: "0.02em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-mono, monospace)",
                        flexShrink: 0,
                        ...getRiskBadgeStyle(node.risk)
                      }}
                    >
                      {node.risk}
                    </span>
                  </div>

                  {/* Subtitle Row: Type */}
                  <div style={{ display: "flex", alignItems: "center", paddingLeft: "13px", marginTop: "1px" }}>
                    <span
                      className="component-item-type"
                      style={{
                        fontSize: "10px",
                        color: "var(--text-muted, #94a3b8)",
                        fontWeight: 400
                      }}
                    >
                      {node.type}
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
