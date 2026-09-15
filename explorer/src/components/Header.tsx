import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { ProjectSelector } from './ProjectSelector';

export interface HeaderProps {
  onResetView?: () => void;
  onToggleCompare?: () => void;
  isCompareOpen?: boolean;
  onOpenCommandPalette?: (initialQuery?: string) => void;
  activeBreadcrumb?: string;
  onOpenPanel?: (panelId: 'findings' | 'hotspots' | 'diagnostics' | 'compare') => void;
  activeProjectName?: string;
  activeProjectStatus?: string;
  onSelectProject?: (projectId: string) => void;
}

function useProjectSafe() {
  try {
    return useProject();
  } catch (_) {
    return null;
  }
}

export const Header: React.FC<HeaderProps> = ({
  onResetView,
  onToggleCompare,
  isCompareOpen = false,
  onOpenCommandPalette,
  activeBreadcrumb,
  onOpenPanel,
  activeProjectName: propProjectName,
  activeProjectStatus: propProjectStatus,
  onSelectProject: propSelectProject,
}) => {
  const [isMac, setIsMac] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  const projectContext = useProjectSafe();

  const activeProject = projectContext?.activeProject;
  const projects = projectContext?.projects || [];
  const selectProject = projectContext?.selectProject || propSelectProject;

  const currentProjectName =
    activeProject?.name || propProjectName || 'Salesforce Project';
  const currentProjectStatus =
    activeProject?.analysisStatus || propProjectStatus || 'COMPLETE';

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const platform = navigator.platform || navigator.userAgent || '';
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(platform));
    }
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreOpen(false);
      }
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenSearch = (initialQuery: string = '') => {
    if (onOpenCommandPalette) {
      onOpenCommandPalette(initialQuery);
    } else {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac })
      );
    }
  };

  return (
    <header className="header app-header-redesign" role="banner" data-testid="app-header">
      <style>{`
        .app-header-redesign {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 48px;
          min-height: 48px;
          background-color: var(--surface-panel, #111827);
          border-bottom: 1px solid var(--border-default, #334155);
          padding: 0 16px;
          gap: 16px;
          z-index: 20;
          box-sizing: border-box;
          font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          min-width: 0;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .header-title .icon {
          font-size: 18px;
        }

        .header-title-group {
          display: flex;
          flex-direction: column;
        }

        .header-title h1 {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary, #f8fafc);
          letter-spacing: 0.3px;
          white-space: nowrap;
          margin: 0;
          line-height: 1.1;
        }

        .header-subtitle {
          font-size: 10px;
          color: var(--text-muted, #94a3b8);
          font-weight: 500;
          letter-spacing: 0.2px;
        }

        .header-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: var(--radius-sm, 4px);
          background-color: var(--surface-card, #1e293b);
          border: 1px solid var(--border-default, #334155);
          color: var(--accent-primary, #3b82f6);
          font-weight: 500;
        }

        .header-project-context {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .header-project-trigger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--surface-card, #1e293b);
          border: 1px solid var(--border-default, #334155);
          border-radius: var(--radius-md, 6px);
          padding: 4px 10px;
          color: var(--text-primary, #f8fafc);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-fast, all 0.1s ease);
        }

        .header-project-trigger:hover {
          background-color: var(--surface-hover, #2d3748);
          border-color: var(--border-strong, #475569);
        }

        .header-project-label {
          color: var(--text-muted, #94a3b8);
          font-weight: 500;
          font-size: 12px;
        }

        .header-project-name {
          color: var(--accent-primary, #3b82f6);
        }

        .header-dropdown-icon {
          font-size: 10px;
          color: var(--text-muted, #94a3b8);
          margin-left: 2px;
        }

        .header-project-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          background-color: var(--surface-panel, #111827);
          border: 1px solid var(--border-default, #334155);
          border-radius: var(--radius-lg, 8px);
          box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.5));
          padding: 6px;
          min-width: 220px;
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .header-project-menu-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted, #94a3b8);
          padding: 6px 8px 4px;
          letter-spacing: 0.5px;
        }

        .header-project-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 6px 10px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm, 4px);
          color: var(--text-secondary, #cbd5e1);
          font-size: 12px;
          cursor: pointer;
          text-align: left;
          transition: var(--transition-fast, all 0.1s ease);
        }

        .header-project-option:hover,
        .header-project-option.active {
          background-color: var(--surface-hover, #2d3748);
          color: var(--text-primary, #f8fafc);
        }

        .header-project-option.active {
          font-weight: 600;
          color: var(--accent-primary, #3b82f6);
        }

        .proj-option-id {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: var(--text-muted, #94a3b8);
        }

        .header-project-menu-divider {
          height: 1px;
          background-color: var(--border-subtle, #1e293b);
          margin: 4px 0;
        }

        .header-project-option.action-option {
          color: var(--accent-primary, #3b82f6);
          font-weight: 500;
        }

        .header-project-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: var(--radius-full, 9999px);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.3px;
          background-color: var(--surface-subtle, #0f172a);
          border: 1px solid var(--border-subtle, #1e293b);
          color: var(--text-secondary, #cbd5e1);
        }

        .header-project-status-badge.status-complete {
          background-color: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.3);
          color: #34d399;
        }

        .header-project-status-badge.status-analyzing {
          background-color: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.3);
          color: #fef08a;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: currentColor;
        }

        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 180px;
        }

        .breadcrumb-sep {
          color: var(--text-disabled, #64748b);
        }

        .breadcrumb-item {
          color: var(--text-primary, #f8fafc);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-center {
          flex: 1;
          max-width: 480px;
          display: flex;
          justify-content: center;
        }

        .header-search-field {
          display: flex;
          align-items: center;
          width: 100%;
          height: 32px;
          padding: 0 12px;
          background-color: var(--surface-subtle, #0f172a);
          border: 1px solid var(--border-default, #334155);
          border-radius: var(--radius-md, 6px);
          color: var(--text-muted, #94a3b8);
          font-size: 13px;
          cursor: pointer;
          transition: var(--transition-fast, all 0.1s ease);
        }

        .header-search-field:hover {
          border-color: var(--border-strong, #475569);
          background-color: var(--surface-card, #1e293b);
          color: var(--text-secondary, #cbd5e1);
        }

        .search-icon {
          font-size: 14px;
          margin-right: 8px;
        }

        .search-placeholder {
          flex: 1;
          text-align: left;
        }

        .search-shortcut-hint {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          padding: 2px 6px;
          border-radius: var(--radius-sm, 4px);
          background-color: var(--surface-panel, #111827);
          border: 1px solid var(--border-default, #334155);
          color: var(--text-muted, #94a3b8);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .header-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 12px;
          background-color: transparent;
          border: 1px solid var(--border-default, #334155);
          border-radius: var(--radius-md, 6px);
          color: var(--text-secondary, #cbd5e1);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: var(--transition-fast, all 0.1s ease);
        }

        .header-action-btn:hover {
          background-color: var(--surface-card, #1e293b);
          color: var(--text-primary, #f8fafc);
        }

        .header-action-btn.active {
          background-color: var(--accent-subtle, rgba(59, 130, 246, 0.15));
          border-color: var(--accent-primary, #3b82f6);
          color: var(--accent-primary, #3b82f6);
        }

        .header-more-container {
          position: relative;
        }

        .dropdown-arrow {
          font-size: 9px;
          margin-left: 2px;
        }

        .header-more-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background-color: var(--surface-panel, #111827);
          border: 1px solid var(--border-default, #334155);
          border-radius: var(--radius-lg, 8px);
          box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.5));
          padding: 6px;
          min-width: 200px;
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .header-more-menu-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 8px 10px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm, 4px);
          color: var(--text-secondary, #cbd5e1);
          font-size: 13px;
          cursor: pointer;
          text-align: left;
          transition: var(--transition-fast, all 0.1s ease);
        }

        .header-more-menu-item:hover {
          background-color: var(--surface-hover, #2d3748);
          color: var(--text-primary, #f8fafc);
        }

        .header-more-menu-divider {
          height: 1px;
          background-color: var(--border-subtle, #1e293b);
          margin: 4px 0;
        }

        @media (max-width: 768px) {
          .header-center {
            max-width: 200px;
          }
          .search-placeholder {
            display: none;
          }
          .header-breadcrumb {
            display: none;
          }
        }
      `}</style>

      {/* Brand & Main Title */}
      <div className="header-left">
        <div className="header-title" data-testid="header-title">
          <span className="icon" aria-hidden="true">⚡</span>
          <div className="header-title-group">
            <h1>Dependency Analyzer</h1>
            <span className="header-subtitle">Dependency Explorer</span>
          </div>
        </div>

        <span className="header-badge" style={{ display: 'none' }}>
          Salesforce Architecture Explorer
        </span>

        {/* ACTIVE PROJECT CONTEXT AREA & SWITCHER */}
        <div
          className="header-project-context"
          ref={projectDropdownRef}
          data-testid="header-project-context"
        >
          {projectContext ? (
            <ProjectSelector className="header-project-selector" />
          ) : (
            <div className="header-project-dropdown-wrapper">
              <button
                className="header-project-trigger"
                onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
                aria-expanded={isProjectDropdownOpen}
                aria-label="Select active project"
                data-testid="header-project-trigger"
              >
                <span className="header-project-label">Project:</span>
                <span className="header-project-name">{currentProjectName}</span>
                <span className="header-dropdown-icon" aria-hidden="true">▼</span>
              </button>

              {isProjectDropdownOpen && (
                <div
                  className="header-project-menu"
                  role="menu"
                  data-testid="header-project-menu"
                >
                  <div className="header-project-menu-title">Switch Active Project</div>
                  {projects.length > 0 ? (
                    projects.map((proj) => (
                      <button
                        key={proj.id}
                        className={`header-project-option ${
                          proj.name === currentProjectName ? 'active' : ''
                        }`}
                        onClick={() => {
                          selectProject?.(proj.id);
                          setIsProjectDropdownOpen(false);
                        }}
                        role="menuitem"
                        data-testid={`header-project-option-${proj.id}`}
                      >
                        <span className="proj-option-name">{proj.name}</span>
                        <span className="proj-option-id">({proj.id})</span>
                      </button>
                    ))
                  ) : (
                    <button
                      className="header-project-option active"
                      onClick={() => setIsProjectDropdownOpen(false)}
                      role="menuitem"
                    >
                      <span className="proj-option-name">{currentProjectName}</span>
                    </button>
                  )}
                  <div className="header-project-menu-divider" />
                  <button
                    className="header-project-option action-option"
                    onClick={() => {
                      setIsProjectDropdownOpen(false);
                      handleOpenSearch('project');
                    }}
                    role="menuitem"
                    data-testid="header-project-option-open-cmd"
                  >
                    <span>🔍 Open Project Switcher (⌘K)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE PROJECT STATUS INDICATOR */}
          <span
            className={`header-project-status-badge status-${currentProjectStatus.toLowerCase()}`}
            title={`Active Project Status: ${currentProjectStatus}`}
            data-testid="header-project-status"
          >
            <span className="status-dot" aria-hidden="true" />
            <span className="status-text">{currentProjectStatus}</span>
          </span>
        </div>

        {/* BREADCRUMB CONTEXT AREA */}
        {activeBreadcrumb && (
          <div className="header-breadcrumb" data-testid="header-breadcrumb">
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-item" title={activeBreadcrumb}>
              {activeBreadcrumb}
            </span>
          </div>
        )}
      </div>

      {/* CENTER GLOBAL SEARCH FIELD */}
      <div className="header-center">
        <button
          className="header-search-field"
          onClick={() => handleOpenSearch()}
          aria-label="Search architecture components and commands"
          data-testid="header-search-button"
        >
          <span className="search-icon" aria-hidden="true">🔍</span>
          <span className="search-placeholder">Search architecture...</span>
          <kbd className="search-shortcut-hint">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>
      </div>

      {/* RIGHT GLOBAL ACTIONS & MORE MENU */}
      <div className="header-right" data-testid="header-actions">
        {onToggleCompare && (
          <button
            className={`header-action-btn ${isCompareOpen ? 'active' : ''}`}
            onClick={onToggleCompare}
            title="Toggle Architecture Snapshot Compare Mode"
            aria-pressed={isCompareOpen}
            data-testid="header-compare-btn"
          >
            <span aria-hidden="true">🔍</span> Compare
          </button>
        )}

        {onResetView && (
          <button
            className="header-action-btn"
            onClick={onResetView}
            title="Reset active graph filters and selection"
            data-testid="header-reset-btn"
          >
            Reset View
          </button>
        )}

        {/* MORE OVERFLOW MENU */}
        <div className="header-more-container" ref={moreMenuRef}>
          <button
            className={`header-action-btn ${isMoreOpen ? 'active' : ''}`}
            onClick={() => setIsMoreOpen((prev) => !prev)}
            aria-expanded={isMoreOpen}
            aria-label="More navigation actions"
            data-testid="header-more-btn"
          >
            More <span className="dropdown-arrow" aria-hidden="true">▼</span>
          </button>

          {isMoreOpen && (
            <div
              className="header-more-menu"
              role="menu"
              data-testid="header-more-menu"
            >
              <button
                className="header-more-menu-item"
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenPanel?.('findings') || handleOpenSearch('findings');
                }}
                role="menuitem"
                data-testid="more-item-findings"
              >
                <span>📋 Open Findings</span>
              </button>
              <button
                className="header-more-menu-item"
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenPanel?.('hotspots') || handleOpenSearch('hotspots');
                }}
                role="menuitem"
                data-testid="more-item-hotspots"
              >
                <span>🔥 Open Hotspots</span>
              </button>
              <button
                className="header-more-menu-item"
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenPanel?.('diagnostics') || handleOpenSearch('diagnostics');
                }}
                role="menuitem"
                data-testid="more-item-diagnostics"
              >
                <span>⚡ Open Diagnostics / Cycles</span>
              </button>
              <button
                className="header-more-menu-item"
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenPanel?.('compare') || handleOpenSearch('compare');
                }}
                role="menuitem"
                data-testid="more-item-compare"
              >
                <span>🔍 Compare Snapshots</span>
              </button>
              <div className="header-more-menu-divider" />
              <button
                className="header-more-menu-item"
                onClick={() => {
                  setIsMoreOpen(false);
                  handleOpenSearch('');
                }}
                role="menuitem"
                data-testid="more-item-cmd"
              >
                <span>⌨️ Command Palette ({isMac ? '⌘K' : 'Ctrl+K'})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
