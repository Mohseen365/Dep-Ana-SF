import React, { useState, useEffect, useCallback } from "react";
import {
  SearchFilterState,
  SearchResult,
  getUniqueNodeTypes,
  getAvailableRiskLevels,
  createEmptyFilterState,
  hasActiveFilters,
  searchNodes,
} from "../lib/search-filter";
import {
  ExplorerNode,
  ExplorerNodeType,
  ExplorerRiskLevel,
} from "../types/explorer";

export type QuickFilterPreset = "all" | "high_risk" | "hotspots";
export type SortOption = "risk" | "name" | "type";

interface SearchFilterPanelProps {
  nodes: ExplorerNode[];
  filterState: SearchFilterState;
  quickFilter: QuickFilterPreset;
  sortOption: SortOption;
  onFilterChange: (filterState: SearchFilterState) => void;
  onQuickFilterChange: (preset: QuickFilterPreset) => void;
  onSortOptionChange: (sort: SortOption) => void;
  onSelectResult: (node: ExplorerNode) => void;
}

export const SearchFilterPanel: React.FC<SearchFilterPanelProps> = ({
  nodes,
  filterState,
  quickFilter,
  sortOption,
  onFilterChange,
  onQuickFilterChange,
  onSortOptionChange,
  onSelectResult,
}) => {
  const [localQuery, setLocalQuery] = useState(filterState.searchQuery || "");
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const nodeTypes = getUniqueNodeTypes(nodes);
  const riskLevels = getAvailableRiskLevels(nodes);

  // Debounced search dropdown
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim()) {
        const results = searchNodes(nodes, localQuery);
        setSearchResults(results.slice(0, 8)); // Top 8 dropdown results
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [localQuery, nodes]);

  // Sync with external filter state
  useEffect(() => {
    setLocalQuery(filterState.searchQuery || "");
  }, [filterState.searchQuery]);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setLocalQuery(newQuery);
      onFilterChange({ ...filterState, searchQuery: newQuery });
    },
    [filterState, onFilterChange]
  );

  const handleClearQuery = useCallback(() => {
    setLocalQuery("");
    setShowResults(false);
    onFilterChange({ ...filterState, searchQuery: "" });
  }, [filterState, onFilterChange]);

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as ExplorerNodeType | "";
      onFilterChange({ ...filterState, typeFilter: newType });
    },
    [filterState, onFilterChange]
  );

  const handleRiskChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newRisk = e.target.value as ExplorerRiskLevel | "";
      onFilterChange({ ...filterState, riskFilter: newRisk });
    },
    [filterState, onFilterChange]
  );

  const handleCheckboxChange = useCallback(
    (field: keyof SearchFilterState) => {
      onFilterChange({ ...filterState, [field]: !filterState[field] });
    },
    [filterState, onFilterChange]
  );

  const handleClearAll = useCallback(() => {
    setLocalQuery("");
    setSearchResults([]);
    setShowResults(false);
    onQuickFilterChange("all");
    onFilterChange(createEmptyFilterState());
  }, [onFilterChange, onQuickFilterChange]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onSelectResult(result.node);
      setShowResults(false);
    },
    [onSelectResult]
  );

  const handleInputFocus = useCallback(() => {
    if (localQuery.trim() && searchResults.length > 0) {
      setShowResults(true);
    }
  }, [localQuery, searchResults.length]);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => setShowResults(false), 200);
  }, []);

  const activeFiltersPresent =
    hasActiveFilters(filterState) || quickFilter !== "all";

  return (
    <div className="sidebar-search-filter-panel" style={{ padding: "0 12px 12px 12px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
      {/* Search Bar */}
      <div className="ui-search-field" style={{ position: "relative", marginBottom: "8px" }}>
        <span className="ui-search-icon" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", opacity: 0.6, pointerEvents: "none" }}>
          🔍
        </span>
        <input
          type="text"
          className="ui-input"
          style={{
            width: "100%",
            paddingLeft: "30px",
            paddingRight: localQuery ? "28px" : "10px",
            height: "32px",
            fontSize: "12px",
            borderRadius: "6px",
            backgroundColor: "var(--surface-subtle, #0f172a)",
            border: "1px solid var(--border-default, #334155)",
            color: "var(--text-primary, #f8fafc)",
            boxSizing: "border-box"
          }}
          placeholder="Search components..."
          value={localQuery}
          onChange={handleQueryChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          aria-label="Search components"
        />
        {localQuery && (
          <button
            type="button"
            className="ui-search-clear"
            onClick={handleClearQuery}
            style={{
              position: "absolute",
              right: "6px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "14px",
              padding: "2px 6px"
            }}
            title="Clear search"
            aria-label="Clear search"
          >
            ×
          </button>
        )}

        {/* Dropdown Results */}
        {showResults && searchResults.length > 0 && (
          <div
            className="search-results-dropdown"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              backgroundColor: "var(--surface-panel, #111827)",
              border: "1px solid var(--border-default, #334155)",
              borderRadius: "6px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
              zIndex: 100,
              maxHeight: "220px",
              overflowY: "auto"
            }}
          >
            {searchResults.map((result) => (
              <div
                key={result.node.id}
                className="search-result-item"
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.04)"
                }}
                onMouseDown={() => handleResultClick(result)}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontWeight: 600, color: "#f8fafc" }}>
                    {result.node.displayName}
                  </span>
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                    {result.node.type}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    backgroundColor:
                      result.node.risk === "HIGH"
                        ? "rgba(239,68,68,0.18)"
                        : result.node.risk === "MEDIUM"
                        ? "rgba(245,158,11,0.18)"
                        : "rgba(16,185,129,0.18)",
                    color:
                      result.node.risk === "HIGH"
                        ? "#f87171"
                        : result.node.risk === "MEDIUM"
                        ? "#f59e0b"
                        : "#10b981"
                  }}
                >
                  {result.node.risk}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Filter Pills */}
      <div
        className="quick-filter-pills"
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "8px",
          alignItems: "center"
        }}
      >
        <button
          type="button"
          className={`ui-btn ui-btn-sm ${quickFilter === "all" ? "ui-btn-primary" : "ui-btn-ghost"}`}
          onClick={() => onQuickFilterChange("all")}
          style={{
            flex: 1,
            height: "24px",
            fontSize: "11px",
            borderRadius: "4px",
            padding: "0 8px"
          }}
        >
          All
        </button>
        <button
          type="button"
          className={`ui-btn ui-btn-sm ${quickFilter === "high_risk" ? "ui-btn-primary" : "ui-btn-ghost"}`}
          onClick={() => onQuickFilterChange("high_risk")}
          style={{
            flex: 1,
            height: "24px",
            fontSize: "11px",
            borderRadius: "4px",
            padding: "0 8px",
            backgroundColor: quickFilter === "high_risk" ? "rgba(239,68,68,0.25)" : undefined,
            color: quickFilter === "high_risk" ? "#f87171" : undefined,
            borderColor: quickFilter === "high_risk" ? "rgba(239,68,68,0.4)" : undefined
          }}
        >
          High Risk
        </button>
        <button
          type="button"
          className={`ui-btn ui-btn-sm ${quickFilter === "hotspots" ? "ui-btn-primary" : "ui-btn-ghost"}`}
          onClick={() => onQuickFilterChange("hotspots")}
          style={{
            flex: 1,
            height: "24px",
            fontSize: "11px",
            borderRadius: "4px",
            padding: "0 8px",
            backgroundColor: quickFilter === "hotspots" ? "rgba(245,158,11,0.25)" : undefined,
            color: quickFilter === "hotspots" ? "#f59e0b" : undefined,
            borderColor: quickFilter === "hotspots" ? "rgba(245,158,11,0.4)" : undefined
          }}
        >
          Hotspots
        </button>
      </div>

      {/* Select Controls & Sort */}
      <div
        className="filter-controls-row"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "6px",
          alignItems: "center"
        }}
      >
        <select
          className="ui-input"
          value={filterState.typeFilter}
          onChange={handleTypeChange}
          style={{
            height: "26px",
            fontSize: "10px",
            padding: "0 4px",
            borderRadius: "4px",
            backgroundColor: "var(--surface-subtle, #0f172a)",
            border: "1px solid var(--border-default, #334155)",
            color: "var(--text-secondary, #cbd5e1)"
          }}
          aria-label="Filter by Type"
        >
          <option value="">All Types</option>
          {nodeTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          className="ui-input"
          value={filterState.riskFilter}
          onChange={handleRiskChange}
          style={{
            height: "26px",
            fontSize: "10px",
            padding: "0 4px",
            borderRadius: "4px",
            backgroundColor: "var(--surface-subtle, #0f172a)",
            border: "1px solid var(--border-default, #334155)",
            color: "var(--text-secondary, #cbd5e1)"
          }}
          aria-label="Filter by Risk"
        >
          <option value="">All Risks</option>
          {riskLevels.map((risk) => (
            <option key={risk} value={risk}>
              {risk}
            </option>
          ))}
        </select>

        <select
          className="ui-input"
          value={sortOption}
          onChange={(e) => onSortOptionChange(e.target.value as SortOption)}
          style={{
            height: "26px",
            fontSize: "10px",
            padding: "0 4px",
            borderRadius: "4px",
            backgroundColor: "var(--surface-subtle, #0f172a)",
            border: "1px solid var(--border-default, #334155)",
            color: "var(--text-secondary, #cbd5e1)"
          }}
          aria-label="Sort by"
        >
          <option value="risk">Sort: Risk</option>
          <option value="name">Sort: Name</option>
          <option value="type">Sort: Type</option>
        </select>
      </div>

      {/* Advanced Filters Toggle */}
      <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted, #94a3b8)",
            fontSize: "10px",
            cursor: "pointer",
            padding: "2px 0",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          <span>{showAdvanced ? "▼" : "►"}</span>
          <span>Advanced Filters</span>
        </button>

        {activeFiltersPresent && (
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              fontSize: "10px",
              cursor: "pointer",
              padding: "2px 0"
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {showAdvanced && (
        <div
          className="advanced-filter-options"
          style={{
            marginTop: "6px",
            padding: "6px 8px",
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            borderRadius: "4px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
            fontSize: "10px",
            color: "var(--text-secondary, #cbd5e1)"
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!filterState.hasCallouts}
              onChange={() => handleCheckboxChange("hasCallouts")}
            />
            Callouts
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!filterState.withoutSharing}
              onChange={() => handleCheckboxChange("withoutSharing")}
            />
            Without Sharing
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!filterState.hideTests}
              onChange={() => handleCheckboxChange("hideTests")}
            />
            Hide Tests
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!filterState.hasAsyncPatterns}
              onChange={() => handleCheckboxChange("hasAsyncPatterns")}
            />
            Async Patterns
          </label>
        </div>
      )}
    </div>
  );
};

export default SearchFilterPanel;
