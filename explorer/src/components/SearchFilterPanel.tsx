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

interface SearchFilterPanelProps {
  nodes: ExplorerNode[];
  filterState: SearchFilterState;
  onFilterChange: (filterState: SearchFilterState) => void;
  onSelectResult: (node: ExplorerNode) => void;
}

export const SearchFilterPanel: React.FC<SearchFilterPanelProps> = ({
  nodes,
  filterState,
  onFilterChange,
  onSelectResult,
}) => {
  const [localQuery, setLocalQuery] = useState(filterState.searchQuery);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Get unique types and risk levels from data
  const nodeTypes = getUniqueNodeTypes(nodes);
  const riskLevels = getAvailableRiskLevels(nodes);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim()) {
        const results = searchNodes(nodes, localQuery);
        setSearchResults(results);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [localQuery, nodes]);

  // Sync local query with external filter state
  useEffect(() => {
    setLocalQuery(filterState.searchQuery);
  }, [filterState.searchQuery]);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setLocalQuery(newQuery);
      onFilterChange({ ...filterState, searchQuery: newQuery });
    },
    [filterState, onFilterChange],
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as ExplorerNodeType | "";
      onFilterChange({ ...filterState, typeFilter: newType });
    },
    [filterState, onFilterChange],
  );

  const handleRiskChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newRisk = e.target.value as ExplorerRiskLevel | "";
      onFilterChange({ ...filterState, riskFilter: newRisk });
    },
    [filterState, onFilterChange],
  );
  const handleCheckboxChange = useCallback(
    (field: keyof SearchFilterState) => {
      onFilterChange({ ...filterState, [field]: !filterState[field] });
    },
    [filterState, onFilterChange],
  );
  const handleClearFilters = useCallback(() => {
    const emptyState = createEmptyFilterState();
    setLocalQuery("");
    setSearchResults([]);
    setShowResults(false);
    onFilterChange(emptyState);
  }, [onFilterChange]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onSelectResult(result.node);
      setShowResults(false);
      setLocalQuery(result.node.displayName);
      onFilterChange({ ...filterState, searchQuery: result.node.displayName });
    },
    [filterState, onFilterChange, onSelectResult],
  );

  const handleInputFocus = useCallback(() => {
    if (localQuery.trim() && searchResults.length > 0) {
      setShowResults(true);
    }
  }, [localQuery, searchResults.length]);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => setShowResults(false), 200);
  }, []);

  const hasFilters = hasActiveFilters(filterState);

  return (
    <div className="search-filter-panel">
      {/* Search Input */}
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Filter or search..."
          value={localQuery}
          onChange={handleQueryChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
        {showResults && searchResults.length > 0 && (
          <div className="search-results-dropdown">
            {searchResults.map((result) => (
              <div
                key={result.node.id}
                className="search-result-item"
                onClick={() => handleResultClick(result)}
              >
                <span className="result-name">{result.node.displayName}</span>
                <span className="result-type">{result.node.type}</span>
                <span
                  className={`result-risk risk-${result.node.risk.toLowerCase()}`}
                >
                  {result.node.risk}
                </span>
              </div>
            ))}
          </div>
        )}
        {showResults && localQuery.trim() && searchResults.length === 0 && (
          <div className="search-results-dropdown">
            <div className="search-no-results">No results found</div>
          </div>
        )}
      </div>

      {/* Filter Select Controls */}
      <div className="filter-row">
        <div className="filter-group">
          <select
            className="filter-select"
            value={filterState.typeFilter}
            onChange={handleTypeChange}
          >
            <option value="">All Types</option>
            {nodeTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={filterState.riskFilter}
            onChange={handleRiskChange}
          >
            <option value="">All Risks</option>
            {riskLevels.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear
          </button>
        )}
      </div>
      {/* Advanced Filter Controls */}
      <div className="advanced-filter-section">
        <button
          type="button"
          className="advanced-filter-toggle"
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          <span>{showAdvanced ? "▼" : "►"} Advanced Filters</span>
        </button>
        {showAdvanced && (
          <div className="advanced-filter-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!filterState.hasCallouts}
                onChange={() => handleCheckboxChange("hasCallouts")}
              />
              Has Callouts
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!filterState.withoutSharing}
                onChange={() => handleCheckboxChange("withoutSharing")}
              />
              Without Sharing
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!filterState.hideTests}
                onChange={() => handleCheckboxChange("hideTests")}
              />
              Hide Tests
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!filterState.hasAsyncPatterns}
                onChange={() => handleCheckboxChange("hasAsyncPatterns")}
              />
              Has Async Patterns
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilterPanel;
