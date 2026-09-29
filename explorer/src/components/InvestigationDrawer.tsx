import React, { useState } from 'react';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureFinding } from '../lib/intelligence';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';
import { rankDependents, rankDependencies } from '../lib/drill';

export interface InvestigationDrawerProps {
  node: ExplorerNode | null;
  open: boolean;
  onClose: () => void;
  onDrill?: (id: string) => void;
  data?: ExplorerDataSchema | null;
  findings?: ArchitectureFinding[];
  drillPath?: string[];
  onNavigateBreadcrumb?: (id: string) => void;
  recentNodeIds?: string[];
  onSelectRecentNode?: (id: string) => void;
  onRequestHandoff?: (nodeId: string) => void;
  onSimulateRefactoring?: (nodeId: string) => void;
  onApplyFocus?: (nodeId: string) => void;
  onShowImpact?: (nodeId: string) => void;
  onAnalyzeConnections?: (nodeId: string) => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isDetached?: boolean;
  onDetach?: () => void;
}

export type DrawerTab = 'overview' | 'dependencies' | 'dependents' | 'evidence' | 'actions';

const getRiskBadgeStyle = (risk?: string) => {
  switch (risk) {
    case 'CRITICAL':
    case 'HIGH':
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        border: '1px solid rgba(239, 68, 68, 0.3)',
      };
    case 'MEDIUM':
      return {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        color: '#f59e0b',
        border: '1px solid rgba(245, 158, 11, 0.3)',
      };
    case 'LOW':
      return {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        color: '#10b981',
        border: '1px solid rgba(16, 185, 129, 0.3)',
      };
    default:
      return {
        backgroundColor: 'rgba(100, 116, 139, 0.15)',
        color: '#94a3b8',
        border: '1px solid rgba(100, 116, 139, 0.3)',
      };
  }
};

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
  onSimulateRefactoring,
  onApplyFocus,
  onShowImpact,
  onAnalyzeConnections,
  isPinned = false,
  onTogglePin,
  isDetached = false,
  findings = [],
  onDetach,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const currentNodeId = node?.id ?? (drillPath.length > 0 ? drillPath[drillPath.length - 1] : null);

  const nodeFindings = node && findings && findings.length > 0
    ? findings.filter((f) => f.nodeIds && f.nodeIds.includes(node.id))
    : [];

  const breadcrumbItems: BreadcrumbItem[] = drillPath.map((id) => {
    const foundNode = data?.nodes.find((n) => n.id === id);
    return {
      id,
      label: foundNode ? foundNode.displayName : id,
    };
  });

  const rankedDeps = data && currentNodeId ? rankDependents(currentNodeId, data) : [];
  const rankedDependencies = data && currentNodeId ? rankDependencies(currentNodeId, data) : [];

  // Find incoming and outgoing edges for the current node for Evidence tab
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
      <div
        className="drawer-risk-summary"
        data-testid="drawer-risk-summary"
        style={{
          padding: '10px 12px',
          backgroundColor: 'var(--surface-subtle, #0f172a)',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle, #1e293b)',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.05em' }}>
            Risk Assessment
          </span>
          <span className={`ui-badge ui-badge-${riskClass}`} data-testid="drawer-risk-badge" style={getRiskBadgeStyle(node.risk)}>
            {riskLevel} RISK
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: node.riskReasons && node.riskReasons.length > 0 ? '6px' : '0' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
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
      <div
        className="drawer-key-metrics"
        data-testid="drawer-key-metrics"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk / Score</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span>{node.metrics?.score ?? 0}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', fontWeight: 400 }}>({node.risk || 'LOW'})</span>
          </div>
        </div>
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dependents</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{node.metrics?.fanIn ?? 0}</div>
        </div>
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dependencies</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{node.metrics?.fanOut ?? 0}</div>
        </div>
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unresolved</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: node.metrics?.unresolved ? '#ef4444' : '#f8fafc' }}>
            {node.metrics?.unresolved ?? 0}
          </div>
        </div>
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coverage</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: node.refactoringReadiness?.testCoverageStatus === 'COVERED' ? '#10b981' : '#f59e0b' }}>
            {node.refactoringReadiness?.testCoverageStatus || 'N/A'}
          </div>
        </div>
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coupling</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{node.metrics?.coupling ?? 0}</div>
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

        {/* Associated Architecture Findings */}
        {nodeFindings.length > 0 && (
          <div
            className="drawer-associated-findings"
            data-testid="drawer-associated-findings"
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: '#f87171',
                letterSpacing: '0.05em',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              ⚠️ Associated Architecture Findings ({nodeFindings.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {nodeFindings.map((f) => (
                <div
                  key={f.id}
                  style={{
                    padding: '6px 8px',
                    backgroundColor: 'var(--surface-subtle, #0f172a)',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>{f.title}</span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: '3px',
                        backgroundColor:
                          f.severity === 'CRITICAL' || f.severity === 'HIGH'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(245, 158, 11, 0.2)',
                        color:
                          f.severity === 'CRITICAL' || f.severity === 'HIGH'
                            ? '#f87171'
                            : '#f59e0b',
                      }}
                    >
                      {f.severity}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted, #94a3b8)', fontSize: '10px', lineHeight: '1.3' }}>
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Depth Analysis Actions */}
        {(onApplyFocus || onShowImpact || onAnalyzeConnections) && currentNodeId && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--surface-subtle, #0f172a)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, #1e293b)',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Graph Analysis Actions
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {onApplyFocus && (
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => onApplyFocus(currentNodeId)}
                  data-testid="drawer-action-focus"
                  aria-label={`Focus graph on ${node.displayName}`}
                  title="Focus on component neighborhood"
                >
                  <span aria-hidden="true">🎯</span> Focus
                </button>
              )}
              {onShowImpact && (
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => onShowImpact(currentNodeId)}
                  data-testid="drawer-action-impact"
                  aria-label={`Calculate blast radius impact for ${node.displayName}`}
                  title="Analyze blast radius impact"
                >
                  <span aria-hidden="true">💥</span> Impact
                </button>
              )}
              {onAnalyzeConnections && (
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => onAnalyzeConnections(currentNodeId)}
                  data-testid="drawer-action-connections"
                  aria-label={`Analyze connection paths for ${node.displayName}`}
                  title="Analyze component connections"
                >
                  <span aria-hidden="true">🔗</span> Connections
                </button>
              )}
            </div>
          </div>
        )}

        {/* Behavioral Summary */}
        {node.behavior && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--surface-subtle, #0f172a)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, #1e293b)',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Behavioral Profile
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
              <span className="ui-badge">{node.behavior.isTest ? 'Test Class' : 'Production Component'}</span>
              {node.behavior.sharing && <span className="ui-badge">{node.behavior.sharing}</span>}
              <span className="ui-badge">SOQL Queries: {node.behavior.queryCount}</span>
              <span className="ui-badge">DML Statements: {node.behavior.dmlCount}</span>
              {node.behavior.calloutCount > 0 && <span className="ui-badge ui-badge-high">Callouts: {node.behavior.calloutCount}</span>}
            </div>
          </div>
        )}

        {/* Quick Dependents Preview */}
        <section className="drawer-section" style={{ marginBottom: '12px' }} data-testid="dependents-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
              Top Dependents ({rankedDeps.length})
            </h3>
            {rankedDeps.length > 0 && (
              <button
                type="button"
                className="ui-btn ui-btn-ghost ui-btn-xs"
                onClick={() => setActiveTab('dependents')}
                style={{ fontSize: '11px', padding: '2px 6px' }}
              >
                View All →
              </button>
            )}
          </div>
          {rankedDeps.length === 0 ? (
            <p className="empty-state" style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>No dependents detected</p>
          ) : (
            <ul className="drill-list dependents-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
              Top Dependencies ({rankedDependencies.length})
            </h3>
            {rankedDependencies.length > 0 && (
              <button
                type="button"
                className="ui-btn ui-btn-ghost ui-btn-xs"
                onClick={() => setActiveTab('dependencies')}
                style={{ fontSize: '11px', padding: '2px 6px' }}
              >
                View All →
              </button>
            )}
          </div>
          {rankedDependencies.length === 0 ? (
            <p className="empty-state" style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>No dependencies detected</p>
          ) : (
            <ul className="drill-list dependencies-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
          <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary, #f8fafc)' }}>
            Dependencies ({rankedDependencies.length})
          </h3>
          {rankedDependencies.length === 0 ? (
            <div className="ui-empty-state" style={{ padding: '20px 12px' }}>
              <div className="ui-empty-icon">📦</div>
              <div className="ui-empty-title">No Dependencies</div>
              <p className="ui-empty-description">This component does not reference any other components.</p>
            </div>
          ) : (
            <ul className="drill-list dependencies-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
          <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary, #f8fafc)' }}>
            Dependents ({rankedDeps.length})
          </h3>
          {rankedDeps.length === 0 ? (
            <div className="ui-empty-state" style={{ padding: '20px 12px' }}>
              <div className="ui-empty-icon">⛓️</div>
              <div className="ui-empty-title">No Dependents</div>
              <p className="ui-empty-description">No other components depend on this component.</p>
            </div>
          ) : (
            <ul className="drill-list dependents-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
        <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary, #f8fafc)' }}>
          Code Evidence & References ({relevantEdges.length})
        </h3>
        {relevantEdges.length === 0 ? (
          <div className="ui-empty-state" style={{ padding: '20px 12px' }}>
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
                    padding: '8px 10px',
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
                    <pre
                      style={{
                        backgroundColor: 'var(--surface-base, #090d16)',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--text-secondary, #cbd5e1)',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        margin: 0,
                      }}
                    >
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
      <div className="tab-content-actions" data-testid="tab-content-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px', color: 'var(--text-primary, #f8fafc)' }}>
          Component Investigation Actions
        </h3>

        {(onRequestHandoff || onSimulateRefactoring) && currentNodeId && (
          <div style={{ padding: '10px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
            <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '4px', color: '#f8fafc' }}>Refactoring Handoff</div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginBottom: '8px', margin: '0 0 8px 0' }}>
              Export component context or simulate interactive refactoring sequence.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {onRequestHandoff && (
                <button
                  type="button"
                  className="ui-btn ui-btn-primary ui-btn-sm"
                  onClick={() => onRequestHandoff(currentNodeId)}
                >
                  Hand off to Refactor
                </button>
              )}
              {onSimulateRefactoring && (
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  data-testid="simulate-refactoring-btn"
                  onClick={() => onSimulateRefactoring(currentNodeId)}
                  style={{ color: '#38bdf8', borderColor: '#38bdf8' }}
                >
                  Simulate Proposed Refactoring
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: '10px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
          <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px', color: '#f8fafc' }}>Panel Layout</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onTogglePin && (
              <button
                type="button"
                className={`ui-btn ui-btn-secondary ui-btn-sm ${isPinned ? 'active' : ''}`}
                onClick={onTogglePin}
                aria-label={isPinned ? 'Unpin investigation drawer' : 'Pin investigation drawer'}
              >
                <span aria-hidden="true">📌</span> {isPinned ? 'Unpin Drawer' : 'Pin Drawer'}
              </button>
            )}
            {onDetach && (
              <button
                type="button"
                className={`ui-btn ui-btn-secondary ui-btn-sm ${isDetached ? 'active' : ''}`}
                onClick={onDetach}
                aria-label={isDetached ? 'Re-dock investigation drawer window' : 'Detach investigation drawer window'}
              >
                <span aria-hidden="true">↗</span> {isDetached ? 'Re-dock Window' : 'Detach Window'}
              </button>
            )}
          </div>
        </div>

        {node && (
          <div style={{ padding: '10px', backgroundColor: 'var(--surface-subtle, #0f172a)', borderRadius: '6px', border: '1px solid var(--border-subtle, #1e293b)' }}>
            <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px', color: '#f8fafc' }}>Metadata & Copy</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                className="ui-btn ui-btn-ghost ui-btn-sm"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => copyToClipboard(node.id, 'id')}
                aria-label={`Copy component ID ${node.id}`}
              >
                <span aria-hidden="true">📋</span> {copiedField === 'id' ? 'Copied ID!' : `Copy ID (${node.id})`}
              </button>
              {node.file && (
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost ui-btn-sm"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => copyToClipboard(node.file, 'file')}
                  aria-label="Copy file path"
                >
                  <span aria-hidden="true">📁</span> {copiedField === 'file' ? 'Copied File Path!' : `Copy File Path`}
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
      className={`investigation-drawer ${open ? 'open' : 'closed'} ${isPinned ? 'pinned' : ''} ${isDetached ? 'detached' : ''}`}
      data-testid="investigation-drawer"
      aria-label="Investigation Drawer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--surface-panel, #111827)',
        overflow: 'hidden',
      }}
    >
      <header
        className="investigation-drawer-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          backgroundColor: 'var(--surface-subtle, #0f172a)',
          gap: '8px',
        }}
      >
        <div className="drawer-title-group" style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text-primary, #f8fafc)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {node ? node.displayName : 'No Component Selected'}
          </h2>
          {node && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className="drawer-node-type"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted, #94a3b8)',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {node.type}
              </span>
              <span
                className={`ui-badge ui-badge-${(node.risk || 'low').toLowerCase()}`}
                data-testid="drawer-risk-badge"
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  ...getRiskBadgeStyle(node.risk),
                }}
              >
                {node.risk || 'LOW'} RISK
              </span>
            </div>
          )}
        </div>

        <div className="drawer-header-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          {onTogglePin && (
            <button
              type="button"
              className={`drawer-pin-btn ${isPinned ? 'active' : ''}`}
              data-testid="investigation-drawer-pin-btn"
              aria-label={isPinned ? 'Unpin drawer' : 'Pin drawer'}
              title={isPinned ? 'Unpin drawer' : 'Pin drawer'}
              onClick={onTogglePin}
              style={{
                background: isPinned ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: isPinned ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                padding: '3px 6px',
                cursor: 'pointer',
                color: isPinned ? '#60a5fa' : '#94a3b8',
                fontSize: '12px',
              }}
            >
              <span aria-hidden="true">📌</span>
            </button>
          )}

          {onDetach && (
            <button
              type="button"
              className={`drawer-detach-btn ${isDetached ? 'active' : ''}`}
              data-testid="investigation-drawer-detach-btn"
              aria-label={isDetached ? 'Re-dock drawer window' : 'Detach drawer in separate window'}
              title={isDetached ? 'Re-dock window' : 'Detach window'}
              onClick={onDetach}
              style={{
                background: isDetached ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: isDetached ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                padding: '3px 6px',
                cursor: 'pointer',
                color: isDetached ? '#60a5fa' : '#94a3b8',
                fontSize: '12px',
              }}
            >
              <span aria-hidden="true">↗</span>
            </button>
          )}

          {onRequestHandoff && currentNodeId && (
            <button
              type="button"
              className="drawer-handoff-btn ui-btn ui-btn-xs ui-btn-primary"
              data-testid="investigation-drawer-handoff-btn"
              aria-label="Hand off to refactor"
              title="Hand off component to refactoring sequence"
              onClick={() => onRequestHandoff(currentNodeId)}
            >
              Hand off
            </button>
          )}

          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close Investigation Drawer"
            title="Close Investigation Drawer"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '18px',
              lineHeight: 1,
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            ×
          </button>
        </div>
      </header>

      <div className="investigation-drawer-top-toolbar" style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {breadcrumbItems.length > 0 && (
          <Breadcrumbs
            items={breadcrumbItems}
            onNavigate={(id) => onNavigateBreadcrumb && onNavigateBreadcrumb(id)}
          />
        )}

        {recentNodeIds.length > 0 && (
          <div className="drawer-recent-list" data-testid="recent-investigations" style={{ marginTop: '4px' }}>
            <span className="recent-label" style={{ fontSize: '10px', color: '#94a3b8' }}>Recent:</span>
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
                      aria-label={`Jump to recent component ${recLabel}`}
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
        <nav
          className="ui-tabs"
          role="tablist"
          aria-label="Inspector Navigation Tabs"
          data-testid="inspector-tabs"
          style={{
            display: 'flex',
            overflowX: 'auto',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'var(--surface-panel, #111827)',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            className={`ui-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            data-testid="tab-overview"
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dependencies'}
            className={`ui-tab-item ${activeTab === 'dependencies' ? 'active' : ''}`}
            onClick={() => setActiveTab('dependencies')}
            data-testid="tab-dependencies"
          >
            Dependencies ({rankedDependencies.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dependents'}
            className={`ui-tab-item ${activeTab === 'dependents' ? 'active' : ''}`}
            onClick={() => setActiveTab('dependents')}
            data-testid="tab-dependents"
          >
            Dependents ({rankedDeps.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'evidence'}
            className={`ui-tab-item ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
            data-testid="tab-evidence"
          >
            Evidence ({relevantEdges.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'actions'}
            className={`ui-tab-item ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
            data-testid="tab-actions"
          >
            Actions
          </button>
        </nav>
      )}

      <div
        className="investigation-drawer-body"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {!node ? (
          <div className="ui-empty-state" data-testid="inspector-empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div className="ui-empty-icon" style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
            <div className="ui-empty-title" style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
              No Architectural Component Selected
            </div>
            <p className="ui-empty-description" style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
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
