import React from "react";
import { WorkspaceViewMode } from "../lib/projectState";
export type WorkspaceViewMode =
  | "graph"
  | "dashboard"
  | "matrix"
  | "heatmap"
  | "river"
  | "tree"
  | "treemap"
  | "profile"
  | "radar"
  | "dna"
  | "four-direction"
  | "findings"
  | "hotspots"
  | "diagnostics"
  | "compare"
  | "history";
export interface ViewModeSwitcherProps {
  currentMode: WorkspaceViewMode;
  onModeChange: (mode: WorkspaceViewMode) => void;
}

/**
 * Phase 3C ViewModeSwitcher supporting Graph, Matrix, Tree, Profile, Radar, DNA, Heatmap, 4-Dir, and Subway modes.
 */
export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  currentMode,
  onModeChange,
}) => {
  const modes: {
    mode: WorkspaceViewMode;
    label: string;
    icon: string;
    description: string;
  }[] = [
    {
      mode: "graph",
      label: "Graph",
      icon: "🕸️",
      description: "Interactive Cytoscape topology graph",
    },
    {
      mode: "matrix",
      label: "Matrix",
      icon: "📊",
      description: "Feature dependency matrix grid",
    },
    {
      mode: "tree",
      label: "Tree",
      icon: "🌲",
      description: "Hierarchical feature & component tree",
    },
    {
      mode: "profile",
      label: "Profile",
      icon: "📋",
      description: "Component metrics & risk profile",
    },
    {
      mode: "radar",
      label: "Radar",
      icon: "🎯",
      description: "Architectural dimension radar",
    },
    {
      mode: "dna",
      label: "DNA",
      icon: "🧬",
      description: "Architecture DNA & barcode",
    },
    {
      mode: "heatmap",
      label: "Heatmap",
      icon: "🔥",
      description: "Coupling & risk heatmap",
    },
    {
      mode: "four-direction",
      label: "4-Dir",
      icon: "🧭",
      description: "Four-cardinal dependency neighborhood",
    },
    {
      mode: "subway",
      label: "Subway",
      icon: "🚇",
      description: "Feature subway routes & component transfer stations",
    },
  ];

  return (
    <div className="view-mode-switcher" data-testid="view-mode-switcher">
      {modes.map((m) => (
        <button
          key={m.mode}
          className={`view-mode-btn ${currentMode === m.mode ? "active" : ""}`}
          onClick={() => onModeChange(m.mode)}
          title={m.description}
          data-testid={`view-mode-btn-${m.mode}`}
        >
          <span className="icon">{m.icon}</span>
          <span className="label">{m.label}</span>
        </button>
      ))}
    </div>
  );
};

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
    <div
      className={`view-mode-switcher-bar ${className}`}
      data-testid="view-mode-switcher"
    >
      <div
        className="view-mode-toggle-group"
        style={{ display: "flex", gap: "4px" }}
      >
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
          className={`view-mode-btn ${viewMode === "heatmap" ? "active" : ""}`}
          onClick={() => onChangeViewMode("heatmap")}
          title="Feature Coupling Heatmap Lens"
          data-testid="view-btn-heatmap"
        >
          <span className="btn-icon">🌡️</span> Heatmap
        </button>
        <button
          className={`view-mode-btn ${viewMode === "river" ? "active" : ""}`}
          onClick={() => onChangeViewMode("river")}
          title="Dependency River / Sankey Macro Flow Lens"
          data-testid="view-btn-river"
        >
          <span className="btn-icon">🌊</span> River
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
          className={`view-mode-btn ${viewMode === "treemap" ? "active" : ""}`}
          onClick={() => onChangeViewMode("treemap")}
          title="Architecture Treemap Spatial Lens"
          data-testid="view-btn-treemap"
        >
          <span className="btn-icon">🗺️</span> Treemap
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
          className={`view-mode-btn ${viewMode === "four-direction" ? "active" : ""}`}
          onClick={() => onChangeViewMode("four-direction")}
          title="Four-Direction Cardinal Neighborhood Lens"
          data-testid="view-btn-four-direction"
        >
          <span className="btn-icon">🧭</span> Four-Dir
        </button>
        <button
          className={`view-mode-btn ${viewMode === "findings" ? "active" : ""}`}
          onClick={() => onChangeViewMode("findings")}
          title="Architecture Rule Findings"
          data-testid="view-btn-findings"
        >
          <span className="btn-icon">📋</span> Findings
          {findingsCount > 0 && (
            <span className="findings-count-pill">{findingsCount}</span>
          )}
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
