import React from "react";

export type WorkspaceViewMode =
  | "graph"
  | "dashboard"
  | "matrix"
  | "tree"
  | "profile"
  | "radar"
  | "dna"
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
          className={`view-mode-btn ${viewMode === "matrix" ? "active" : ""}`}
          onClick={() => onChangeViewMode("matrix")}
          title="Feature Dependency Matrix Lens"
          data-testid="view-btn-matrix"
        >
          <span className="btn-icon">🧩</span> Matrix
        </button>
        <button
          className={`view-mode-btn ${viewMode === "tree" ? "active" : ""}`}
          onClick={() => onChangeViewMode("tree")}
          title="Feature Hierarchy Tree Lens"
          data-testid="view-btn-tree"
        >
          <span className="btn-icon">🌳</span> Tree
        </button>
        <button
          className={`view-mode-btn ${viewMode === "profile" ? "active" : ""}`}
          onClick={() => onChangeViewMode("profile")}
          title="Component Architecture Profile Lens"
          data-testid="view-btn-profile"
        >
          <span className="btn-icon">👤</span> Profile
        </button>
        <button
          className={`view-mode-btn ${viewMode === "radar" ? "active" : ""}`}
          onClick={() => onChangeViewMode("radar")}
          title="Architecture Radar Multi-Dimensional Lens"
          data-testid="view-btn-radar"
        >
          <span className="btn-icon">🎯</span> Radar
        </button>
        <button
          className={`view-mode-btn ${viewMode === "dna" ? "active" : ""}`}
          onClick={() => onChangeViewMode("dna")}
          title="Architecture DNA / Barcode Multi-Band Lens"
          data-testid="view-btn-dna"
        >
          <span className="btn-icon">🧬</span> DNA
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
