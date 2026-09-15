import React from "react";

export type WorkspaceViewMode =
  | "graph"
  | "dashboard"
  | "findings"
  | "hotspots"
  | "diagnostics"
  | "compare"
  | "history";

export interface ViewModeSwitcherProps {
  viewMode: WorkspaceViewMode;
  onChangeViewMode: (mode: WorkspaceViewMode) => void;
  findingsCount?: number;
  className?: string;
}

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  viewMode,
  onChangeViewMode,
  findingsCount = 0,
  className = "",
}) => {
  return (
    <div className={`view-mode-switcher-bar ${className}`} data-testid="view-mode-switcher">
      <div className="view-mode-toggle-group" style={{ display: 'flex', gap: '4px' }}>
        <button
          className={`view-mode-btn ${viewMode === "graph" ? "active" : ""}`}
          onClick={() => onChangeViewMode("graph")}
          title="Interactive Dependency Graph Canvas"
          data-testid="view-btn-graph"
        >
          <span className="btn-icon">🕸️</span> Graph
        </button>
        <button
          className={`view-mode-btn ${viewMode === "dashboard" ? "active" : ""}`}
          onClick={() => onChangeViewMode("dashboard")}
          title="Project Portfolio & Overview Dashboard"
          data-testid="view-btn-dashboard"
        >
          <span className="btn-icon">📊</span> Overview
        </button>
        <button
          className={`view-mode-btn ${viewMode === "findings" ? "active" : ""}`}
          onClick={() => onChangeViewMode("findings")}
          title="Architecture Rule Findings"
          data-testid="view-btn-findings"
        >
          <span className="btn-icon">📋</span> Findings
          {findingsCount > 0 && <span className="findings-count-pill">{findingsCount}</span>}
        </button>
        <button
          className={`view-mode-btn ${viewMode === "hotspots" ? "active" : ""}`}
          onClick={() => onChangeViewMode("hotspots")}
          title="Architectural Hotspots & Refactoring Readiness"
          data-testid="view-btn-hotspots"
        >
          <span className="btn-icon">🔥</span> Hotspots
        </button>
        <button
          className={`view-mode-btn ${viewMode === "diagnostics" ? "active" : ""}`}
          onClick={() => onChangeViewMode("diagnostics")}
          title="Circular Dependencies & Unresolved References"
          data-testid="view-btn-diagnostics"
        >
          <span className="btn-icon">⚡</span> Diagnostics
        </button>
        <button
          className={`view-mode-btn ${viewMode === "compare" ? "active" : ""}`}
          onClick={() => onChangeViewMode("compare")}
          title="Architecture Snapshot Diff Comparison"
          data-testid="view-btn-compare"
        >
          <span className="btn-icon">🔍</span> Compare
        </button>
        <button
          className={`view-mode-btn ${viewMode === "history" ? "active" : ""}`}
          onClick={() => onChangeViewMode("history")}
          title="Project Analysis History & Timeline"
          data-testid="view-btn-history"
        >
          <span className="btn-icon">📜</span> History
        </button>
      </div>
    </div>
  );
};
