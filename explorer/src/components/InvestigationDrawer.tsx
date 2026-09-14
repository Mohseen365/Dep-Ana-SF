import React from 'react';
import type { ExplorerDataSchema, ExplorerNode } from '../types/explorer';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';
import { rankDependents, rankDependencies } from '../lib/drill';

export interface InvestigationDrawerProps {
  node: ExplorerNode | null;
  open: boolean;
  onClose: () => void;
  onDrill?: (id: string) => void;
  data?: ExplorerDataSchema | null;
  drillPath?: string[];
  onNavigateBreadcrumb?: (id: string) => void;
  recentNodeIds?: string[];
  onSelectRecentNode?: (id: string) => void;
  onRequestHandoff?: (nodeId: string) => void;
}

export const InvestigationDrawer: React.FC<InvestigationDrawerProps> = ({
  node,
  open,
  onClose,
  onDrill,
  data,
  drillPath = [],
  onNavigateBreadcrumb,
  recentNodeIds = [],
  onSelectRecentNode,
  onRequestHandoff,
}) => {
  if (!open) {
    return null;
  }

  const currentNodeId = node?.id ?? (drillPath.length > 0 ? drillPath[drillPath.length - 1] : null);

  const breadcrumbItems: BreadcrumbItem[] = drillPath.map((id) => {
    const foundNode = data?.nodes.find((n) => n.id === id);
    return {
      id,
      label: foundNode ? foundNode.displayName : id,
    };
  });

  const rankedDeps = data && currentNodeId ? rankDependents(currentNodeId, data) : [];
  const rankedDependencies = data && currentNodeId ? rankDependencies(currentNodeId, data) : [];

  const handleRowClick = (targetId: string) => {
    if (onDrill) {
      onDrill(targetId);
    }
  };

  return (
    <aside
      className="investigation-drawer"
      data-testid="investigation-drawer"
      aria-label="Investigation Drawer"
    >
      <header className="investigation-drawer-header">
        <div className="drawer-title-group">
          <h2>{node ? node.displayName : 'No Component Selected'}</h2>
          {node && <span className="drawer-node-type">{node.type}</span>}
        </div>
        <div className="drawer-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onRequestHandoff && (
            <button
              className="drawer-handoff-btn"
              data-testid="investigation-drawer-handoff-btn"
              aria-label="Hand off to refactor"
              title="Hand off to refactor"
              onClick={() => {
                if (currentNodeId) {
                  onRequestHandoff(currentNodeId);
                }
              }}
            >
              Hand off
            </button>
          )}
          <button
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close Investigation Drawer"
            title="Close Investigation Drawer"
          >
            ×
          </button>
        </div>
      </header>

      <div className="investigation-drawer-top-toolbar">
        {breadcrumbItems.length > 0 && (
          <Breadcrumbs
            items={breadcrumbItems}
            onNavigate={(id) => onNavigateBreadcrumb && onNavigateBreadcrumb(id)}
          />
        )}

        {recentNodeIds.length > 0 && (
          <div className="drawer-recent-list" data-testid="recent-investigations">
            <span className="recent-label">Recent:</span>
            <ul className="recent-items">
              {recentNodeIds.map((recId) => {
                const recNode = data?.nodes.find((n) => n.id === recId);
                const recLabel = recNode ? recNode.displayName : recId;
                return (
                  <li key={recId}>
                    <button
                      type="button"
                      className="recent-item-btn"
                      onClick={() => onSelectRecentNode && onSelectRecentNode(recId)}
                      title={`Jump to ${recLabel}`}
                    >
                      {recLabel}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="investigation-drawer-body">
        {/* Dependents Section */}
        <section className="drawer-section" data-testid="dependents-section">
          <h3>Dependents ({rankedDeps.length})</h3>
          {rankedDeps.length === 0 ? (
            <p className="empty-state">No dependents detected</p>
          ) : (
            <ul className="drill-list dependents-list">
              {rankedDeps.map(({ node: depNode, impactCount, isDirect }) => (
                <li
                  key={depNode.id}
                  className="drill-row-item"
                  onClick={() => handleRowClick(depNode.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleRowClick(depNode.id);
                    }
                  }}
                  data-testid={`dependent-row-${depNode.id}`}
                >
                  <div className="drill-row-main">
                    <span className="drill-row-name">{depNode.displayName}</span>
                    <span className="drill-row-type">{depNode.type}</span>
                  </div>
                  <div className="drill-row-meta">
                    <span className={`hop-badge ${isDirect ? 'direct' : 'transitive'}`}>
                      {isDirect ? 'Direct' : 'Transitive'}
                    </span>
                    <span className="impact-count-badge" title="Impact Count">
                      Impact: {impactCount}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Dependencies Section */}
        <section className="drawer-section" data-testid="dependencies-section">
          <h3>Dependencies ({rankedDependencies.length})</h3>
          {rankedDependencies.length === 0 ? (
            <p className="empty-state">No dependencies detected</p>
          ) : (
            <ul className="drill-list dependencies-list">
              {rankedDependencies.map(({ node: depNode, impactCount }) => (
                <li
                  key={depNode.id}
                  className="drill-row-item"
                  onClick={() => handleRowClick(depNode.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleRowClick(depNode.id);
                    }
                  }}
                  data-testid={`dependency-row-${depNode.id}`}
                >
                  <div className="drill-row-main">
                    <span className="drill-row-name">{depNode.displayName}</span>
                    <span className="drill-row-type">{depNode.type}</span>
                  </div>
                  <div className="drill-row-meta">
                    <span className="impact-count-badge" title="Impact Count">
                      Impact: {impactCount}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
};
