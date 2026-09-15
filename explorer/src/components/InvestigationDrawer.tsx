import React, { useState } from 'react';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
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
  onApplyFocus?: (nodeId: string) => void;
  onShowImpact?: (nodeId: string) => void;
  onAnalyzeConnections?: (nodeId: string) => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isDetached?: boolean;
  onDetach?: () => void;
}

export type DrawerTab = 'overview' | 'dependencies' | 'dependents' | 'evidence' | 'actions';

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
  onApplyFocus,
  onShowImpact,
  onAnalyzeConnections,
  isPinned = false,
  onTogglePin,
  isDetached = false,
  onDetach,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  // Find incoming and outgoing edges for the current node for the Evidence tab
  const relevantEdges: ExplorerEdge[] = data && currentNodeId
    ? data.edges.filter((e) => e.source === currentNodeId || e.target === currentNodeId)
    : [];

  const handleRowClick = (targetId: string) => {
    if (onDrill) {
      onDrill(targetId);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {});
  };

  const renderRiskSummary = () => {
    if (!node) return null;
    const riskLevel = node.risk || 'LOW';
    const riskClass = riskLevel.toLowerCase();

    return (
      <div className="drawer-risk-summary" data-testid="drawer-risk-summary" style={{ padding: '12px 16px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '8px', border: '1px solid var(--border-subtle, #1e293b)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
            Risk Summary
          </span>
          <span className={`ui-badge ui-badge-${riskClass}`} data-testid="drawer-risk-badge">
            {riskLevel} RISK
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: node.riskReasons && node.riskReasons.length > 0 ? '8px' : '0' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
            Score: {node.metrics?.score ?? 0}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
            (Coupling: {node.metrics?.coupling ?? 0})
          </span>
        </div>
        {node.riskReasons && node.riskReasons.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>
            {node.riskReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderKeyMetrics = () => {
    if (!node) return null;
    return (
      <div className="drawer-key-metrics" data-testid="drawer-key-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Fan-In / Dependents</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{node.metrics?.fanIn ?? 0}</div>
        </div>
        <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Fan-Out / Dependencies</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{node.metrics?.fanOut ?? 0}</div>
        </div>
        <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Unresolved Refs</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: node.metrics?.unresolved ? 'var(--risk-high, #ef4444)' : 'var(--text-primary, #f8fafc)' }}>
            {node.metrics?.unresolved ?? 0}
          </div>
        </div>
        <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Test Coverage</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: node.refactoringReadiness?.testCoverageStatus === 'COVERED' ? 'var(--state-success, #10b981)' : 'var(--risk-medium, #f59e0b)' }}>
            {node.refactoringReadiness?.testCoverageStatus || 'N/A'}
          </div>
        </div>
      </div>
    );
  };

  const renderOverviewTab = () => {
    if (!node) return null;
    return (
      <div className="tab-content-overview" data-testid="tab-content-overview">
        {renderRiskSummary()}
        {renderKeyMetrics()}

        {/* Quick Depth Analysis Actions */}
        {(onApplyFocus || onShowImpact || onAnalyzeConnections) && currentNodeId && (
          <div style={{ padding: '12px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '8px', border: '1px solid var(--border-subtle, #1e293b)', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Graph Depth Analysis
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {onApplyFocus && (
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => onApplyFocus(currentNodeId)}
                  data-testid="drawer-action-focus"
                >
                  🎯 Focus
                </button>
              )}
              {onShowImpact && (
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => onShowImpact(currentNodeId)}
                  data-testid="drawer-action-impact"
                >
                  💥 Impact
                </button>
              )}
              {onAnalyzeConnections && (
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => onAnalyzeConnections(currentNodeId)}
                  data-testid="drawer-action-connections"
                >
                  🔗 Connections
                </button>
              )}
            </div>
          </div>
        )}

        {/* Behavioral Summary */}
        {node.behavior && (
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '8px', border: '1px solid var(--border-subtle, #1e293b)', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Behavioral Profile
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
              <span className="ui-badge">{node.behavior.isTest ? 'Test Class' : 'Production Component'}</span>
              {node.behavior.sharing && <span className="ui-badge">{node.behavior.sharing}</span>}
              <span className="ui-badge">SOQL Queries: {node.behavior.queryCount}</span>
              <span className="ui-badge">DML Statements: {node.behavior.dmlCount}</span>
              {node.behavior.calloutCount > 0 && <span className="ui-badge ui-badge-high">Callouts: {node.behavior.calloutCount}</span>}
            </div>
          </div>
        )}

        {/* Quick Dependents Preview */}
        <section className="drawer-section" style={{ marginBottom: '16px' }} data-testid="dependents-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Top Dependents ({rankedDeps.length})</h3>
            {rankedDeps.length > 0 && (
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setActiveTab('dependents')}>
                View All →
              </button>
            )}
          </div>
          {rankedDeps.length === 0 ? (
            <p className="empty-state">No dependents detected</p>
          ) : (
            <ul className="drill-list dependents-list">
              {rankedDeps.slice(0, 3).map(({ node: depNode, impactCount, isDirect }) => (
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
                    <span className="impact-count-badge">Impact: {impactCount}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick Dependencies Preview */}
        <section className="drawer-section" data-testid="dependencies-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Top Dependencies ({rankedDependencies.length})</h3>
            {rankedDependencies.length > 0 && (
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setActiveTab('dependencies')}>
                View All →
              </button>
            )}
          </div>
          {rankedDependencies.length === 0 ? (
            <p className="empty-state">No dependencies detected</p>
          ) : (
            <ul className="drill-list dependencies-list">
              {rankedDependencies.slice(0, 3).map(({ node: depNode, impactCount }) => (
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
                    <span className="impact-count-badge">Impact: {impactCount}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  };

  const renderDependenciesTab = () => {
    return (
      <div className="tab-content-dependencies" data-testid="tab-content-dependencies">
        <section className="drawer-section" data-testid="dependencies-section">
          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            Dependencies ({rankedDependencies.length})
          </h3>
          {rankedDependencies.length === 0 ? (
            <div className="ui-empty-state" style={{ padding: '24px 12px' }}>
              <div className="ui-empty-icon">📦</div>
              <div className="ui-empty-title">No Dependencies</div>
              <p className="ui-empty-description">This component does not reference any other components.</p>
            </div>
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
    );
  };

  const renderDependentsTab = () => {
    return (
      <div className="tab-content-dependents" data-testid="tab-content-dependents">
        <section className="drawer-section" data-testid="dependents-section">
          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            Dependents ({rankedDeps.length})
          </h3>
          {rankedDeps.length === 0 ? (
            <div className="ui-empty-state" style={{ padding: '24px 12px' }}>
              <div className="ui-empty-icon">⛓️</div>
              <div className="ui-empty-title">No Dependents</div>
              <p className="ui-empty-description">No other components depend on this component.</p>
            </div>
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
      </div>
    );
  };

  const renderEvidenceTab = () => {
    return (
      <div className="tab-content-evidence" data-testid="tab-content-evidence">
        <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Code Evidence & References ({relevantEdges.length})
        </h3>
        {relevantEdges.length === 0 ? (
          <div className="ui-empty-state" style={{ padding: '24px 12px' }}>
            <div className="ui-empty-icon">🔍</div>
            <div className="ui-empty-title">No Code Evidence</div>
            <p className="ui-empty-description">No static analysis evidence available for this component.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {relevantEdges.map((edge) => {
              const isOutgoing = edge.source === currentNodeId;
              const otherNodeId = isOutgoing ? edge.target : edge.source;
              const otherNode = data?.nodes.find((n) => n.id === otherNodeId);
              const targetName = otherNode ? otherNode.displayName : otherNodeId;

              return (
                <div
                  key={edge.id}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--surface-subtle, #0f172a)',
                    border: '1px solid var(--border-subtle, #1e293b)',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent-primary, #3b82f6)' }}>
                      {isOutgoing ? '→ Calls: ' : '← Called by: '} {targetName}
                    </span>
                    <span className="ui-badge ui-badge-sm">
                      {edge.relationshipType}
                    </span>
                  </div>
                  {edge.method && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                      Method: <code>{edge.method}</code>
                    </div>
                  )}
                  {edge.evidence && (
                    <pre style={{
                      backgroundColor: 'var(--surface-base, #090d16)',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono, monospace)',
                      color: 'var(--text-secondary, #cbd5e1)',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}>
                      {edge.evidence}
                    </pre>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
                    {edge.line !== null && <span>Line: {edge.line}{edge.column ? `:${edge.column}` : ''}</span>}
                    {edge.resolutionStrategy && <span>Resolution: {edge.resolutionStrategy}</span>}
                    {edge.confidence && <span>Confidence: {edge.confidence}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderActionsTab = () => {
    return (
      <div className="tab-content-actions" data-testid="tab-content-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
          Component Investigation Actions
        </h3>

        {onRequestHandoff && currentNodeId && (
          <div style={{ padding: '12px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
            <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '4px' }}>Refactoring Handoff</div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }}>
              Export component context and dependencies for refactoring sequencing.
            </p>
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-sm"
              onClick={() => onRequestHandoff(currentNodeId)}
            >
              Hand off to Refactor
            </button>
          </div>
        )}

        <div style={{ padding: '12px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>Panel State</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onTogglePin && (
              <button
                type="button"
                className={`ui-btn ui-btn-secondary ui-btn-sm ${isPinned ? 'active' : ''}`}
                onClick={onTogglePin}
              >
                {isPinned ? '📌 Unpin Drawer' : '📌 Pin Drawer'}
              </button>
            )}
            {onDetach && (
              <button
                type="button"
                className={`ui-btn ui-btn-secondary ui-btn-sm ${isDetached ? 'active' : ''}`}
                onClick={onDetach}
              >
                {isDetached ? '↗ Re-dock Window' : '↗ Detach Window'}
              </button>
            )}
          </div>
        </div>

        {node && (
          <div style={{ padding: '12px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
            <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>Metadata & Copy</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                className="ui-btn ui-btn-ghost ui-btn-sm"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => copyToClipboard(node.id, 'id')}
              >
                📋 {copiedField === 'id' ? 'Copied ID!' : `Copy ID (${node.id})`}
              </button>
              {node.file && (
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost ui-btn-sm"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => copyToClipboard(node.file, 'file')}
                >
                  📁 {copiedField === 'file' ? 'Copied File Path!' : `Copy File Path`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`investigation-drawer ${isPinned ? 'pinned' : ''} ${isDetached ? 'detached' : ''}`}
      data-testid="investigation-drawer"
      aria-label="Investigation Drawer"
    >
      <header className="investigation-drawer-header">
        <div className="drawer-title-group">
          <h2>{node ? node.displayName : 'No Component Selected'}</h2>
          {node && <span className="drawer-node-type">{node.type}</span>}
        </div>
        <div className="drawer-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onTogglePin && (
            <button
              type="button"
              className={`drawer-pin-btn ${isPinned ? 'active' : ''}`}
              data-testid="investigation-drawer-pin-btn"
              aria-label={isPinned ? 'Unpin drawer' : 'Pin drawer'}
              title={isPinned ? 'Unpin drawer (stay open across selection changes)' : 'Pin drawer'}
              onClick={onTogglePin}
            >
              📌
            </button>
          )}

          {onDetach && (
            <button
              type="button"
              className={`drawer-detach-btn ${isDetached ? 'active' : ''}`}
              data-testid="investigation-drawer-detach-btn"
              aria-label={isDetached ? 'Drawer is detached in second window' : 'Detach drawer'}
              title={isDetached ? 'Drawer is detached in second window' : 'Detach drawer'}
              onClick={onDetach}
            >
              ↗
            </button>
          )}

          {onRequestHandoff && (
            <button
              type="button"
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
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            disabled={isPinned}
            aria-label="Close Investigation Drawer"
            title={isPinned ? 'Drawer is pinned. Unpin to close.' : 'Close Investigation Drawer'}
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

      {/* 5-Tab Navigation Bar */}
      {node && (
        <nav className="ui-tabs" aria-label="Inspector Navigation Tabs" data-testid="inspector-tabs" style={{ display: 'flex', overflowX: 'auto' }}>
          <button
            type="button"
            className={`ui-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            data-testid="tab-overview"
          >
            Overview
          </button>
          <button
            type="button"
            className={`ui-tab-item ${activeTab === 'dependencies' ? 'active' : ''}`}
            onClick={() => setActiveTab('dependencies')}
            data-testid="tab-dependencies"
          >
            Dependencies ({rankedDependencies.length})
          </button>
          <button
            type="button"
            className={`ui-tab-item ${activeTab === 'dependents' ? 'active' : ''}`}
            onClick={() => setActiveTab('dependents')}
            data-testid="tab-dependents"
          >
            Dependents ({rankedDeps.length})
          </button>
          <button
            type="button"
            className={`ui-tab-item ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
            data-testid="tab-evidence"
          >
            Evidence ({relevantEdges.length})
          </button>
          <button
            type="button"
            className={`ui-tab-item ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
            data-testid="tab-actions"
          >
            Actions
          </button>
        </nav>
      )}

      <div className="investigation-drawer-body">
        {!node ? (
          <div className="ui-empty-state" data-testid="inspector-empty-state">
            <div className="ui-empty-icon">🔍</div>
            <div className="ui-empty-title">No Architectural Component Selected</div>
            <p className="ui-empty-description">
              Select a component node from the graph or search palette to inspect its architecture metrics, dependencies, dependents, and evidence.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'dependencies' && renderDependenciesTab()}
            {activeTab === 'dependents' && renderDependentsTab()}
            {activeTab === 'evidence' && renderEvidenceTab()}
            {activeTab === 'actions' && renderActionsTab()}
          </>
        )}
      </div>
    </aside>
  );
};
