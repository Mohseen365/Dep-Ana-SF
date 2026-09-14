import React from "react";

export interface ViewModeSwitcherProps {
  viewMode: "graph" | "findings";
  onChangeViewMode: (mode: "graph" | "findings") => void;
  findingsCount: number;
}

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  viewMode,
  onChangeViewMode,
  findingsCount
}) => {
  return (
    <div className="view-mode-switcher-overlay">
      <div className="view-mode-toggle-group">
        <button
          className={`view-mode-btn ${viewMode === "graph" ? "active" : ""}`}
          onClick={() => onChangeViewMode("graph")}
        >
          <span className="btn-icon">🕸️</span> Graph
        </button>
        <button
          className={`view-mode-btn ${viewMode === "findings" ? "active" : ""}`}
          onClick={() => onChangeViewMode("findings")}
        >
          <span className="btn-icon">🔍</span> Findings
          {findingsCount > 0 && <span className="findings-count-pill">{findingsCount}</span>}
        </button>
      </div>
    </div>
  );
};
