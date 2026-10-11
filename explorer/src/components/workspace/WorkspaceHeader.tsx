import React from 'react';
import { useWorkspaceRouter } from '../../context/WorkspaceRouterContext';
import {
  WORKSPACE_DOMAINS,
  WorkspaceDomain,
} from '../../lib/router/domain-mapping';
import {
  getWorkspaceDefinition,
} from '../../registry/workspace-registry';
import { WorkspaceViewMode } from '../../lib/projectState';

export interface WorkspaceHeaderProps {
  findingsCount?: number;
  isSidebarCollapsed?: boolean;
  onExpandSidebar?: () => void;
  className?: string;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  findingsCount = 0,
  isSidebarCollapsed = false,
  onExpandSidebar,
  className = '',
}) => {
  const { activeViewMode, activeDomain, navigateToView } = useWorkspaceRouter();

  const currentDomainDef = WORKSPACE_DOMAINS[activeDomain] || WORKSPACE_DOMAINS.topological;
  const domainViewModes = currentDomainDef.viewModes;

  const domainKeys: WorkspaceDomain[] = [
    'portfolio',
    'topological',
    'feature',
    'local',
    'governance',
  ];

  return (
    <div
      className={`workspace-header-panel ${className}`}
      data-testid="workspace-header"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--surface-panel, #111827)',
        borderBottom: '1px solid var(--border-default, #334155)',
        flexShrink: 0,
      }}
    >
      {/* Top Row: Domain Navigation Pills + Sidebar Expand Button */}
      <div
        className="workspace-header-top"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Domain Navigation Pills */}
        <div
          className="domain-nav-pills"
          role="navigation"
          aria-label="Workspace Domains"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--surface-subtle, #0f172a)',
            padding: '3px',
            borderRadius: 'var(--radius-md, 6px)',
            border: '1px solid var(--border-subtle, #1e293b)',
          }}
        >
          {domainKeys.map((domainKey) => {
            const dom = WORKSPACE_DOMAINS[domainKey];
            const isDomainActive = activeDomain === domainKey;

            return (
              <button
                key={domainKey}
                type="button"
                className={`domain-tab-btn ${isDomainActive ? 'active' : ''}`}
                onClick={() => navigateToView(dom.defaultViewMode)}
                aria-current={isDomainActive ? 'page' : undefined}
                data-testid={`domain-tab-${domainKey}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: isDomainActive ? 700 : 500,
                  color: isDomainActive
                    ? 'var(--text-primary, #f8fafc)'
                    : 'var(--text-muted, #94a3b8)',
                  backgroundColor: isDomainActive
                    ? 'var(--surface-card, #1e293b)'
                    : 'transparent',
                  border: isDomainActive
                    ? '1px solid var(--accent-primary, #3b82f6)'
                    : '1px solid transparent',
                  borderRadius: 'var(--radius-sm, 4px)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{dom.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side of top row: Active Domain Description + Sidebar Expand Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            className="active-domain-info"
            data-testid="active-domain-info"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--text-secondary, #cbd5e1)',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--accent-primary, #3b82f6)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              Domain: {currentDomainDef.label}
            </span>
            <span
              className="domain-desc-text"
              style={{
                fontSize: '11px',
                color: 'var(--text-muted, #94a3b8)',
                fontStyle: 'italic',
              }}
            >
              {currentDomainDef.description}
            </span>
          </div>

          {isSidebarCollapsed && onExpandSidebar && (
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-sm"
              onClick={onExpandSidebar}
              title="Expand Component Inventory Sidebar"
              aria-label="Expand Component Inventory Sidebar"
              aria-expanded="false"
              aria-controls="component-sidebar-panel"
              data-testid="expand-sidebar-btn"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
              }}
            >
              ▶ Component Sidebar
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Domain-Specific Lenses Switcher */}
      <div
        className="domain-lenses-bar"
        role="tablist"
        aria-label={`${currentDomainDef.label} Lenses`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {domainViewModes.map((mode: WorkspaceViewMode) => {
          const def = getWorkspaceDefinition(mode);
          if (!def) return null;

          const isActive = activeViewMode === mode;

          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${def.label} view: ${def.title}`}
              className={`lens-switch-btn ${isActive ? 'active' : ''}`}
              onClick={() => navigateToView(mode)}
              title={def.title}
              data-testid={`view-btn-${mode}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '28px',
                padding: '0 10px',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                color: isActive
                  ? 'var(--text-primary, #f8fafc)'
                  : 'var(--text-secondary, #cbd5e1)',
                backgroundColor: isActive
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'var(--surface-subtle, #0f172a)',
                border: isActive
                  ? '1px solid var(--accent-primary, #3b82f6)'
                  : '1px solid var(--border-default, #334155)',
                borderRadius: 'var(--radius-md, 6px)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="btn-icon icon">{def.icon}</span>
              <span className="label">{def.label}</span>
              {mode === 'findings' && findingsCount > 0 && (
                <span
                  className="findings-count-pill"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '9999px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    marginLeft: '4px',
                  }}
                >
                  {findingsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WorkspaceHeader;
