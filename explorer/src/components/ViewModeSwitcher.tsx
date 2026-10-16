import React, { useRef, useEffect } from "react";
import { WorkspaceViewMode } from "../lib/projectState";
import {
  getAllWorkspaceModes,
  getWorkspaceDefinition,
} from "../registry/workspace-registry";
import {
  WORKSPACE_DOMAINS,
  WorkspaceDomain,
} from "../lib/router/domain-mapping";

export type { WorkspaceViewMode };

export interface ViewModeSwitcherProps {
  viewMode?: WorkspaceViewMode;
  currentMode?: WorkspaceViewMode;
  onChangeViewMode?: (mode: WorkspaceViewMode) => void;
  onModeChange?: (mode: WorkspaceViewMode) => void;
  findingsCount?: number;
  className?: string;
  groupByDomain?: boolean;
}

/**
 * Reconciled ViewModeSwitcher consuming canonical Lens and Surface Registries
 * and 5-domain workspace taxonomy mapping.
 */
export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  viewMode,
  currentMode,
  onChangeViewMode,
  onModeChange,
  findingsCount = 0,
  className = "",
  groupByDomain = true,
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

  const handleTablistKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.key;
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(key)) {
      return;
    }
    const container = e.currentTarget;
    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'));
    if (tabs.length === 0) return;

    const activeElement = document.activeElement as HTMLButtonElement;
    let currentIndex = tabs.indexOf(activeElement);
    if (currentIndex === -1) {
      currentIndex = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      if (currentIndex === -1) currentIndex = 0;
    }

    let nextIndex = currentIndex;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (key === 'Home') {
      nextIndex = 0;
    } else if (key === 'End') {
      nextIndex = tabs.length - 1;
    }

    e.preventDefault();
    const targetTab = tabs[nextIndex];
    if (targetTab) {
      targetTab.focus();
      targetTab.click();
    }
  };

  const domainKeys: WorkspaceDomain[] = [
    'portfolio',
    'topological',
    'feature',
    'local',
    'governance',
  ];

  return (
    <div
      className={`view-mode-switcher-bar view-mode-switcher ${className}`}
      data-testid="view-mode-switcher"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '100%',
        overflowX: 'auto',
      }}
    >
      <div
        className="view-mode-toggle-group"
        role="tablist"
        aria-label="Workspace View Modes"
        onKeyDown={handleTablistKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {groupByDomain
          ? domainKeys.map((domainKey) => {
              const domDef = WORKSPACE_DOMAINS[domainKey];
              const modes = domDef.viewModes;

              return (
                <div
                  key={domainKey}
                  className={`domain-group domain-group-${domainKey}`}
                  data-testid={`domain-group-${domainKey}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 4px',
                    borderRadius: 'var(--radius-md, 6px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <span
                    className="domain-group-label"
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted, #94a3b8)',
                      padding: '0 4px',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {domDef.label.split(' ')[0]}
                  </span>

                  {modes.map((mode) => {
                    const def = getWorkspaceDefinition(mode);
                    if (!def) return null;

                    const isActive = activeMode === mode;

                    return (
                      <button
                        key={mode}
                        ref={isActive ? activeBtnRef : null}
                        role="tab"
                        aria-selected={isActive}
                        tabIndex={isActive ? 0 : -1}
                        aria-label={`${def.label} view: ${def.title}`}
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
              );
            })
          : getAllWorkspaceModes().map((mode) => {
              const def = getWorkspaceDefinition(mode);
              if (!def) return null;

              const isActive = activeMode === mode;

              return (
                <button
                  key={mode}
                  ref={isActive ? activeBtnRef : null}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  aria-label={`${def.label} view: ${def.title}`}
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
