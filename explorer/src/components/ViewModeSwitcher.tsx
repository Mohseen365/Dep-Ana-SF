import React from "react";
import { WorkspaceViewMode } from "../lib/projectState";

export type { WorkspaceViewMode };

export interface ViewModeSwitcherProps {
  viewMode?: WorkspaceViewMode;
  currentMode?: WorkspaceViewMode;
  onChangeViewMode?: (mode: WorkspaceViewMode) => void;
  onModeChange?: (mode: WorkspaceViewMode) => void;
  findingsCount?: number;
  className?: string;
}

/**
 * Reconciled ViewModeSwitcher supporting all Phase 0–2 modes and Phase 3 modes (Treemap, River/Sankey, Subway).
 */
export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  viewMode,
  currentMode,
  onChangeViewMode,
  onModeChange,
  findingsCount = 0,
  className = "",
}) => {
  const activeMode = viewMode ?? currentMode ?? "graph";

  const handleModeSelect = (m: WorkspaceViewMode) => {
    if (onChangeViewMode) onChangeViewMode(m);
    if (onModeChange) onModeChange(m);
  };

  return (
    <div
      className={`view-mode-switcher-bar view-mode-switcher ${className}`}
      data-testid="view-mode-switcher"
    >
      <div
        className="view-mode-toggle-group"
        style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}
      >
        <button
          className={`view-mode-btn ${activeMode === "graph" ? "active" : ""}`}
          onClick={() => handleModeSelect("graph")}
          title="Interactive Dependency Graph Canvas"
          data-testid="view-btn-graph"
        >
          <span className="btn-icon icon">🕸️</span> <span className="label">Graph</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "dashboard" ? "active" : ""}`}
          onClick={() => handleModeSelect("dashboard")}
          title="Project Portfolio & Overview Dashboard"
          data-testid="view-btn-dashboard"
        >
          <span className="btn-icon icon">📊</span> <span className="label">Overview</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "matrix" ? "active" : ""}`}
          onClick={() => handleModeSelect("matrix")}
          title="Feature Dependency Matrix Lens"
          data-testid="view-btn-matrix"
        >
          <span className="btn-icon icon">🧩</span> <span className="label">Matrix</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "heatmap" ? "active" : ""}`}
          onClick={() => handleModeSelect("heatmap")}
          title="Feature Coupling Heatmap Lens"
          data-testid="view-btn-heatmap"
        >
          <span className="btn-icon icon">🌡️</span> <span className="label">Heatmap</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "river" ? "active" : ""}`}
          onClick={() => handleModeSelect("river")}
          title="Dependency River / Sankey Macro Flow Lens"
          data-testid="view-btn-river"
        >
          <span className="btn-icon icon">🌊</span> <span className="label">River</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "tree" ? "active" : ""}`}
          onClick={() => handleModeSelect("tree")}
          title="Feature Hierarchy Tree Lens"
          data-testid="view-btn-tree"
        >
          <span className="btn-icon icon">🌳</span> <span className="label">Tree</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "treemap" ? "active" : ""}`}
          onClick={() => handleModeSelect("treemap")}
          title="Architecture Treemap Spatial Lens"
          data-testid="view-btn-treemap"
        >
          <span className="btn-icon icon">🗺️</span> <span className="label">Treemap</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "subway" ? "active" : ""}`}
          onClick={() => handleModeSelect("subway")}
          title="Feature Subway Routes & Component Transfer Stations"
          data-testid="view-btn-subway"
        >
          <span className="btn-icon icon">🚇</span> <span className="label">Subway</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "constellation" ? "active" : ""}`}
          onClick={() => handleModeSelect("constellation")}
          title="Dependency Constellation Radial Lens"
          data-testid="view-btn-constellation"
        >
          <span className="btn-icon icon">🌌</span> <span className="label">Constellation</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "profile" ? "active" : ""}`}
          onClick={() => handleModeSelect("profile")}
          title="Component Architecture Profile Lens"
          data-testid="view-btn-profile"
        >
          <span className="btn-icon icon">👤</span> <span className="label">Profile</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "radar" ? "active" : ""}`}
          onClick={() => handleModeSelect("radar")}
          title="Architecture Radar Multi-Dimensional Lens"
          data-testid="view-btn-radar"
        >
          <span className="btn-icon icon">🎯</span> <span className="label">Radar</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "dna" ? "active" : ""}`}
          onClick={() => handleModeSelect("dna")}
          title="Architecture DNA / Barcode Multi-Band Lens"
          data-testid="view-btn-dna"
        >
          <span className="btn-icon icon">🧬</span> <span className="label">DNA</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "four-direction" ? "active" : ""}`}
          onClick={() => handleModeSelect("four-direction")}
          title="Four-Direction Cardinal Neighborhood Lens"
          data-testid="view-btn-four-direction"
        >
          <span className="btn-icon icon">🧭</span> <span className="label">Four-Dir</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "findings" ? "active" : ""}`}
          onClick={() => handleModeSelect("findings")}
          title="Architecture Rule Findings"
          data-testid="view-btn-findings"
        >
          <span className="btn-icon icon">📋</span> <span className="label">Findings</span>
          {findingsCount > 0 && (
            <span className="findings-count-pill">{findingsCount}</span>
          )}
        </button>
        <button
          className={`view-mode-btn ${activeMode === "hotspots" ? "active" : ""}`}
          onClick={() => handleModeSelect("hotspots")}
          title="Architectural Hotspots & Refactoring Readiness"
          data-testid="view-btn-hotspots"
        >
          <span className="btn-icon icon">🔥</span> <span className="label">Hotspots</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "diagnostics" ? "active" : ""}`}
          onClick={() => handleModeSelect("diagnostics")}
          title="Circular Dependencies & Unresolved References"
          data-testid="view-btn-diagnostics"
        >
          <span className="btn-icon icon">⚡</span> <span className="label">Diagnostics</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "compare" ? "active" : ""}`}
          onClick={() => handleModeSelect("compare")}
          title="Architecture Snapshot Diff Comparison"
          data-testid="view-btn-compare"
        >
          <span className="btn-icon icon">🔍</span> <span className="label">Compare</span>
        </button>
        <button
          className={`view-mode-btn ${activeMode === "history" ? "active" : ""}`}
          onClick={() => handleModeSelect("history")}
          title="Project Analysis History & Timeline"
          data-testid="view-btn-history"
        >
          <span className="btn-icon icon">📜</span> <span className="label">History</span>
        </button>
      </div>
    </div>
  );
};
