import React from 'react';

export interface HeaderProps {
  onResetView?: () => void;
  onToggleSidebar?: () => void;
  onToggleDetails?: () => void;
  isDetailsOpen?: boolean;
  onToggleFullscreen?: () => void;
  onToggleCompare?: () => void;
  isCompareOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onResetView,
  onToggleSidebar,
  onToggleDetails,
  isDetailsOpen,
  onToggleFullscreen,
  onToggleCompare,
  isCompareOpen,
}) => {
  return (
    <header className="header">
      <div className="header-title">
        {onToggleSidebar && (
          <button
            className="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            ☰
          </button>
        )}
        <span className="icon">⚡</span>
        <h1>Dependency Explorer</h1>
      </div>
      <div className="header-actions">
        {onToggleFullscreen && (
          <button
            className="clear-filters-btn"
            onClick={onToggleFullscreen}
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            ⛶
          </button>
        )}
        {onToggleDetails && (
          <button
            className={`clear-filters-btn ${isDetailsOpen ? 'active' : ''}`}
            onClick={onToggleDetails}
            title="Toggle Details Panel"
            aria-label="Toggle Details Panel"
          >
            📋 Details
          </button>
        )}
        {onToggleCompare && (
          <button
            className={`clear-filters-btn ${isCompareOpen ? 'active' : ''}`}
            onClick={onToggleCompare}
            title="Toggle Architecture Snapshot Compare Mode"
          >
            🔍 Compare
          </button>
        )}
        {onResetView && (
          <button
            className="clear-filters-btn"
            onClick={onResetView}
            title="Reset active graph filters and selection"
          >
            Reset View
          </button>
        )}
        <div className="header-badge">
          <span>Salesforce Architecture Explorer</span>
        </div>
      </div>
    </header>
  );
};
