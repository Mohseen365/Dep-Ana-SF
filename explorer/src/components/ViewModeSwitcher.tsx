import React, { useRef, useEffect } from "react";
import { WorkspaceViewMode } from "../lib/projectState";
import {
  getAllWorkspaceModes,
  getWorkspaceDefinition,
} from "../registry/workspace-registry";

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
 * Reconciled ViewModeSwitcher consuming canonical Lens and Surface Registries.
 * Eliminates duplicate view lists and hardcoded view mode button arrays.
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
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeBtnRef.current?.scrollIntoView) {
      activeBtnRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeMode]);

  const handleModeSelect = (m: WorkspaceViewMode) => {
    if (onChangeViewMode) onChangeViewMode(m);
    if (onModeChange) onModeChange(m);
  };

  const allModes = getAllWorkspaceModes();

  return (
    <div
      className={`view-mode-switcher-bar view-mode-switcher ${className}`}
      data-testid="view-mode-switcher"
    >
      <div className="view-mode-toggle-group">
        {allModes.map((mode) => {
          const def = getWorkspaceDefinition(mode);
          if (!def) return null;

          const isActive = activeMode === mode;

          return (
            <button
              key={mode}
              ref={isActive ? activeBtnRef : null}
              className={`view-mode-btn ${isActive ? "active" : ""}`}
              onClick={() => handleModeSelect(mode)}
              title={def.title}
              data-testid={`view-btn-${mode}`}
            >
              <span className="btn-icon icon">{def.icon}</span>{" "}
              <span className="label">{def.label}</span>
              {mode === "findings" && findingsCount > 0 && (
                <span className="findings-count-pill">{findingsCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
