import React, { useState, useEffect } from 'react';

export interface HeaderProps {
  onResetView?: () => void;
  onToggleCompare?: () => void;
  isCompareOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onResetView,
  onToggleCompare,
  isCompareOpen,
}) => {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const platform = navigator.platform || navigator.userAgent || '';
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(platform));
    }
  }, []);

  return (
    <header className="header">
      <div className="header-title">
        <span className="icon">⚡</span>
        <h1>Dependency Explorer</h1>
      </div>
      <div className="header-actions">
        <div className="header-shortcut-hint">
          <kbd>{isMac ? '⌘K' : 'Ctrl+K'}</kbd> to search
        </div>
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
