import React, { useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useExplorerData } from '../hooks/useExplorerData';
import { createArchitectureContext } from '../lib/intelligence/context';
import { runAllRules } from '../lib/intelligence/rules';
import type { ArchitectureFinding, FindingSeverity } from '../lib/intelligence';
import type { ProjectMetadata, ExplorerDataSchema, ProjectAnalysisStatus } from '../types/explorer';

export interface ProjectDashboardProps {
  project?: ProjectMetadata | null;
  data?: ExplorerDataSchema | null;
  findings?: ArchitectureFinding[];
  loading?: boolean;
  error?: Error | null;
  onExploreGraph?: () => void;
  onRunAnalysis?: () => void;
  onViewFindings?: () => void;
  onViewHistory?: () => void;
  className?: string;
}

const STATUS_BADGE_CLASSES: Record<ProjectAnalysisStatus, string> = {
  COMPLETE: 'ui-badge-low',
  NOT_ANALYZED: 'ui-badge-info',
  ANALYZING: 'ui-badge-medium',
  FAILED: 'ui-badge-critical',
};

const STATUS_LABELS: Record<ProjectAnalysisStatus, string> = {
  COMPLETE: 'Complete',
  NOT_ANALYZED: 'Not Analyzed',
  ANALYZING: 'Analysis In Progress',
  FAILED: 'Analysis Failed',
};

function formatDate(isoString?: string | null): string {
  if (!isoString) return 'Never / Not Analyzed';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return isoString;
  }
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  project: propProject,
  data: propData,
  findings: propFindings,
  loading: propLoading,
  error: propError,
  onExploreGraph,
  onRunAnalysis,
  onViewFindings,
  onViewHistory,
  className = '',
}) => {
  // Read project context if project prop is not provided directly
  let projectContext: ReturnType<typeof useProject> | null = null;
  try {
    projectContext = useProject();
  } catch (_) {
    // Rendered outside ProjectProvider (e.g. isolated unit test)
  }

  const project = propProject ?? projectContext?.activeProject ?? null;
  const targetProjectId = project?.id || 'default';

  // Read explorer data if not provided as prop
  const explorerDataHook = useExplorerData(propData ? undefined : targetProjectId);
  const data = propData ?? (propProject ? null : explorerDataHook.data);
  const loading = propLoading ?? (propData ? false : explorerDataHook.loading);
  const error = propError ?? (propData ? null : explorerDataHook.error);

  // Compute findings from architecture context if not provided as prop
  const computedFindings = useMemo(() => {
    if (propFindings) return propFindings;
    if (!data) return [];
    try {
      const ctx = createArchitectureContext(data as any);
      return runAllRules(ctx);
    } catch (_) {
      return [];
    }
  }, [propFindings, data]);

  const findings = propFindings ?? computedFindings;

  // Compute severity counts
  const severityCounts = useMemo(() => {
    const counts: Record<FindingSeverity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };
    findings.forEach((f) => {
      if (counts[f.severity] !== undefined) {
        counts[f.severity]++;
      }
    });
    return counts;
  }, [findings]);

  // Compute metrics from data or project fallback
  const componentCount = data?.summary?.nodeCount ?? data?.nodes?.length ?? project?.componentCount ?? 0;
  const dependencyCount = data?.summary?.edgeCount ?? data?.edges?.length ?? project?.dependencyCount ?? 0;
  const findingsCount = findings.length;
  const lastAnalysis = formatDate(project?.lastAnalyzedAt || data?.generatedAt);

  // Risk counts
  const highRiskCount = data?.summary?.highRiskCount ?? data?.nodes?.filter((n) => n.risk === 'HIGH').length ?? 0;
  const mediumRiskCount = data?.summary?.mediumRiskCount ?? data?.nodes?.filter((n) => n.risk === 'MEDIUM').length ?? 0;
  const lowRiskCount = data?.summary?.lowRiskCount ?? data?.nodes?.filter((n) => n.risk === 'LOW').length ?? 0;
  const cycleCount = data?.summary?.cycleCount ?? data?.cycles?.length ?? 0;
  const unresolvedCount = data?.summary?.unresolvedCount ?? data?.unresolvedReferences?.length ?? 0;

  // Inventory breakdown
  const inventory = useMemo(() => {
    if (data?.summary?.inventory) {
      return data.summary.inventory;
    }
    const nodes = data?.nodes ?? [];
    return {
      files: nodes.length,
      apexClasses: nodes.filter((n) => n.type === 'ApexClass').length,
      apexTriggers: nodes.filter((n) => n.type === 'ApexTrigger').length,
      lwcJs: nodes.filter((n) => n.type === 'LWC').length,
      lwcHtml: 0,
      visualforce: nodes.filter((n) => n.type === 'Visualforce').length,
      flows: nodes.filter((n) => n.type === 'Flow').length,
      objects: nodes.filter((n) => n.type === 'Object' || n.type === 'CustomObject').length,
      fields: nodes.filter((n) => n.type === 'Field' || n.type === 'CustomField').length,
    };
  }, [data]);

  const projectStatus: ProjectAnalysisStatus = project?.analysisStatus || (data ? 'COMPLETE' : 'NOT_ANALYZED');
  const statusBadgeClass = STATUS_BADGE_CLASSES[projectStatus] || 'ui-badge-info';
  const statusLabel = STATUS_LABELS[projectStatus] || projectStatus;

  return (
    <div className={`project-dashboard ${className}`} style={dashboardStyles.container}>
      {/* Header Section */}
      <div style={dashboardStyles.headerCard}>
        <div style={dashboardStyles.headerLeft}>
          <div style={dashboardStyles.titleRow}>
            <h1 style={dashboardStyles.projectTitle}>{project?.name || 'Salesforce DX Project'}</h1>
            <span className={`ui-badge ${statusBadgeClass}`} style={dashboardStyles.statusBadge}>
              <span style={dashboardStyles.statusDot(projectStatus)} />
              {statusLabel}
            </span>
          </div>
          {project?.description && (
            <p style={dashboardStyles.projectDescription}>{project.description}</p>
          )}
          <div style={dashboardStyles.metaRow}>
            <span style={dashboardStyles.metaItem}>
              <strong>Source:</strong> <code>{project?.sourcePath || data?.sourceDirectory || 'force-app/main/default'}</code>
            </span>
            {data?.analyzerVersion && (
              <span style={dashboardStyles.metaItem}>
                <strong>Analyzer:</strong> v{data.analyzerVersion}
              </span>
            )}
            {data?.schemaVersion && (
              <span style={dashboardStyles.metaItem}>
                <strong>Contract:</strong> v{data.schemaVersion}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={dashboardStyles.headerActions}>
          <button
            className="ui-btn ui-btn-primary ui-btn-lg"
            onClick={onExploreGraph}
            style={dashboardStyles.primaryBtn}
            data-testid="explore-graph-btn"
          >
            <span style={{ marginRight: '6px' }}>🕸️</span>
            Explore Dependency Graph
          </button>
          <div style={dashboardStyles.secondaryBtnGroup}>
            {onRunAnalysis ? (
              <button
                className="ui-btn ui-btn-secondary"
                onClick={onRunAnalysis}
                data-testid="run-analysis-btn"
              >
                ⚡ Run Analysis
              </button>
            ) : (
              <button
                className="ui-btn ui-btn-secondary"
                disabled
                title="Analysis can be run via CLI: node scripts/export-explorer.cjs"
                data-testid="run-analysis-btn-disabled"
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
              >
                ⚡ Run Analysis (CLI)
              </button>
            )}

            {onViewFindings && (
              <button
                className="ui-btn ui-btn-secondary"
                onClick={onViewFindings}
                data-testid="view-findings-btn"
              >
                🔍 View Findings ({findingsCount})
              </button>
            )}

            {onViewHistory && (
              <button
                className="ui-btn ui-btn-secondary"
                onClick={onViewHistory}
                data-testid="view-history-btn"
              >
                📜 View History
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div style={dashboardStyles.infoBanner}>
          <div className="spinner" style={{ width: '18px', height: '18px', marginRight: '10px' }} />
          <span>Loading project metrics and architecture intelligence data…</span>
        </div>
      )}

      {error && (
        <div style={dashboardStyles.errorBanner}>
          <span style={{ marginRight: '8px', fontSize: '16px' }}>⚠️</span>
          <span>Could not load detailed architecture model for this project ({error.message}). Showing manifest metadata.</span>
        </div>
      )}

      {/* Metrics Row */}
      <div style={dashboardStyles.metricsGrid}>
        <div style={dashboardStyles.metricCard}>
          <div style={dashboardStyles.metricHeader}>
            <span style={dashboardStyles.metricIcon}>🧩</span>
            <span style={dashboardStyles.metricLabel}>Component Count</span>
          </div>
          <div style={dashboardStyles.metricValue}>{componentCount}</div>
          <span style={dashboardStyles.metricSubtext}>Analyzed Metadata Items</span>
        </div>

        <div style={dashboardStyles.metricCard}>
          <div style={dashboardStyles.metricHeader}>
            <span style={dashboardStyles.metricIcon}>🔗</span>
            <span style={dashboardStyles.metricLabel}>Dependency Count</span>
          </div>
          <div style={dashboardStyles.metricValue}>{dependencyCount}</div>
          <span style={dashboardStyles.metricSubtext}>Static & Heuristic References</span>
        </div>

        <div style={dashboardStyles.metricCard}>
          <div style={dashboardStyles.metricHeader}>
            <span style={dashboardStyles.metricIcon}>⚠️</span>
            <span style={dashboardStyles.metricLabel}>Findings Count</span>
          </div>
          <div style={dashboardStyles.metricValue}>
            {findingsCount}
            {severityCounts.CRITICAL > 0 && (
              <span className="ui-badge ui-badge-critical" style={{ marginLeft: '8px', fontSize: '11px' }}>
                {severityCounts.CRITICAL} Critical
              </span>
            )}
          </div>
          <span style={dashboardStyles.metricSubtext}>Architecture Violations</span>
        </div>

        <div style={dashboardStyles.metricCard}>
          <div style={dashboardStyles.metricHeader}>
            <span style={dashboardStyles.metricIcon}>🕒</span>
            <span style={dashboardStyles.metricLabel}>Last Analysis</span>
          </div>
          <div style={dashboardStyles.metricValueSmall}>{lastAnalysis}</div>
          <span style={dashboardStyles.metricSubtext}>Snapshot Generation Time</span>
        </div>
      </div>

      {/* Two Column Section: Architecture Summary & Risk Summary */}
      <div style={dashboardStyles.twoColGrid}>
        {/* Architecture Summary */}
        <div style={dashboardStyles.sectionCard}>
          <div style={dashboardStyles.sectionHeader}>
            <h2 style={dashboardStyles.sectionTitle}>
              <span style={{ marginRight: '8px' }}>📊</span>
              Architecture Summary
            </h2>
          </div>
          <div style={dashboardStyles.sectionBody}>
            <p style={dashboardStyles.sectionDesc}>
              Metadata breakdown across Apex, Lightning Web Components, Flows, and Schema elements:
            </p>
            <div style={dashboardStyles.inventoryGrid}>
              <div style={dashboardStyles.inventoryItem}>
                <span style={dashboardStyles.inventoryType}>Apex Classes</span>
                <span style={dashboardStyles.inventoryCount}>{inventory.apexClasses}</span>
              </div>
              <div style={dashboardStyles.inventoryItem}>
                <span style={dashboardStyles.inventoryType}>Apex Triggers</span>
                <span style={dashboardStyles.inventoryCount}>{inventory.apexTriggers}</span>
              </div>
              <div style={dashboardStyles.inventoryItem}>
                <span style={dashboardStyles.inventoryType}>LWC Components</span>
                <span style={dashboardStyles.inventoryCount}>{inventory.lwcJs}</span>
              </div>
              <div style={dashboardStyles.inventoryItem}>
                <span style={dashboardStyles.inventoryType}>Visualforce</span>
                <span style={dashboardStyles.inventoryCount}>{inventory.visualforce}</span>
              </div>
              <div style={dashboardStyles.inventoryItem}>
                <span style={dashboardStyles.inventoryType}>Flows</span>
                <span style={dashboardStyles.inventoryCount}>{inventory.flows}</span>
              </div>
              <div style={dashboardStyles.inventoryItem}>
                <span style={dashboardStyles.inventoryType}>Objects / Fields</span>
                <span style={dashboardStyles.inventoryCount}>{inventory.objects + inventory.fields}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Summary */}
        <div style={dashboardStyles.sectionCard}>
          <div style={dashboardStyles.sectionHeader}>
            <h2 style={dashboardStyles.sectionTitle}>
              <span style={{ marginRight: '8px' }}>🛡️</span>
              Risk & Quality Summary
            </h2>
          </div>
          <div style={dashboardStyles.sectionBody}>
            <div style={dashboardStyles.riskPillRow}>
              <div style={dashboardStyles.riskPill('HIGH')}>
                <span style={dashboardStyles.riskPillLabel}>High Risk</span>
                <span style={dashboardStyles.riskPillVal}>{highRiskCount}</span>
              </div>
              <div style={dashboardStyles.riskPill('MEDIUM')}>
                <span style={dashboardStyles.riskPillLabel}>Medium Risk</span>
                <span style={dashboardStyles.riskPillVal}>{mediumRiskCount}</span>
              </div>
              <div style={dashboardStyles.riskPill('LOW')}>
                <span style={dashboardStyles.riskPillLabel}>Low Risk</span>
                <span style={dashboardStyles.riskPillVal}>{lowRiskCount}</span>
              </div>
            </div>

            <div style={dashboardStyles.issuesList}>
              <div style={dashboardStyles.issueRow}>
                <div style={dashboardStyles.issueLeft}>
                  <span style={{ marginRight: '6px' }}>🔄</span>
                  <span>Circular Dependencies</span>
                </div>
                <span className={`ui-badge ${cycleCount > 0 ? 'ui-badge-high' : 'ui-badge-low'}`}>
                  {cycleCount} {cycleCount === 1 ? 'cycle' : 'cycles'}
                </span>
              </div>

              <div style={dashboardStyles.issueRow}>
                <div style={dashboardStyles.issueLeft}>
                  <span style={{ marginRight: '6px' }}>❓</span>
                  <span>Unresolved References</span>
                </div>
                <span className={`ui-badge ${unresolvedCount > 0 ? 'ui-badge-medium' : 'ui-badge-low'}`}>
                  {unresolvedCount} unresolved
                </span>
              </div>

              <div style={dashboardStyles.issueRow}>
                <div style={dashboardStyles.issueLeft}>
                  <span style={{ marginRight: '6px' }}>🚨</span>
                  <span>Critical Rule Violations</span>
                </div>
                <span className={`ui-badge ${severityCounts.CRITICAL > 0 ? 'ui-badge-critical' : 'ui-badge-low'}`}>
                  {severityCounts.CRITICAL} critical
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div style={dashboardStyles.sectionCard}>
        <div style={dashboardStyles.sectionHeader}>
          <h2 style={dashboardStyles.sectionTitle}>
            <span style={{ marginRight: '8px' }}>📜</span>
            Recent Activity & Timeline
          </h2>
        </div>
        <div style={dashboardStyles.sectionBody}>
          <div style={dashboardStyles.timelineList}>
            <div style={dashboardStyles.timelineItem}>
              <div style={dashboardStyles.timelineDot('#10b981')} />
              <div style={dashboardStyles.timelineContent}>
                <div style={dashboardStyles.timelineTitle}>
                  Static Dependency Analysis Executed
                </div>
                <div style={dashboardStyles.timelineTime}>
                  {lastAnalysis}
                </div>
                <div style={dashboardStyles.timelineSub}>
                  Processed {componentCount} components and {dependencyCount} relationships from <code>{project?.sourcePath || 'force-app/main/default'}</code>.
                </div>
              </div>
            </div>

            {project?.updatedAt && (
              <div style={dashboardStyles.timelineItem}>
                <div style={dashboardStyles.timelineDot('#3b82f6')} />
                <div style={dashboardStyles.timelineContent}>
                  <div style={dashboardStyles.timelineTitle}>
                    Project Metadata Updated
                  </div>
                  <div style={dashboardStyles.timelineTime}>
                    {formatDate(project.updatedAt)}
                  </div>
                  <div style={dashboardStyles.timelineSub}>
                    Project configuration and settings updated in registry.
                  </div>
                </div>
              </div>
            )}

            {project?.createdAt && (
              <div style={dashboardStyles.timelineItem}>
                <div style={dashboardStyles.timelineDot('#64748b')} />
                <div style={dashboardStyles.timelineContent}>
                  <div style={dashboardStyles.timelineTitle}>
                    Project Registered
                  </div>
                  <div style={dashboardStyles.timelineTime}>
                    {formatDate(project.createdAt)}
                  </div>
                  <div style={dashboardStyles.timelineSub}>
                    Initial project setup created for <strong>{project.name}</strong>.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const dashboardStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    padding: '24px',
    maxWidth: '1280px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box' as const,
    color: 'var(--text-primary, #f8fafc)',
  },
  headerCard: {
    backgroundColor: 'var(--surface-panel, #111827)',
    borderRadius: 'var(--radius-lg, 8px)',
    border: '1px solid var(--border-default, #334155)',
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '16px',
    boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.3))',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    flex: '1 1 400px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  projectTitle: {
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
    color: 'var(--text-primary, #f8fafc)',
    letterSpacing: '-0.02em',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusDot: (status: ProjectAnalysisStatus) => ({
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor:
      status === 'COMPLETE'
        ? '#10b981'
        : status === 'ANALYZING'
        ? '#f59e0b'
        : status === 'FAILED'
        ? '#ef4444'
        : '#64748b',
  }),
  projectDescription: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--text-secondary, #cbd5e1)',
    lineHeight: 1.4,
  },
  metaRow: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: 'var(--text-muted, #94a3b8)',
    flexWrap: 'wrap' as const,
    marginTop: '4px',
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '10px',
    flex: '0 0 auto',
  },
  primaryBtn: {
    fontWeight: 600,
    padding: '10px 20px',
    fontSize: '14px',
  },
  secondaryBtnGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  infoBanner: {
    backgroundColor: 'var(--surface-card, #1e293b)',
    border: '1px solid var(--border-subtle, #1e293b)',
    borderRadius: 'var(--radius-md, 6px)',
    padding: '12px 16px',
    fontSize: '13px',
    color: 'var(--text-secondary, #cbd5e1)',
    display: 'flex',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 'var(--radius-md, 6px)',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#f87171',
    display: 'flex',
    alignItems: 'center',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  metricCard: {
    backgroundColor: 'var(--surface-panel, #111827)',
    borderRadius: 'var(--radius-lg, 8px)',
    border: '1px solid var(--border-default, #334155)',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  metricIcon: {
    fontSize: '16px',
  },
  metricLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-muted, #94a3b8)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary, #f8fafc)',
    lineHeight: 1.1,
  },
  metricValueSmall: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary, #f8fafc)',
    lineHeight: 1.2,
    marginTop: '4px',
  },
  metricSubtext: {
    fontSize: '11px',
    color: 'var(--text-muted, #94a3b8)',
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
  },
  sectionCard: {
    backgroundColor: 'var(--surface-panel, #111827)',
    borderRadius: 'var(--radius-lg, 8px)',
    border: '1px solid var(--border-default, #334155)',
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: 'var(--surface-card, #1e293b)',
    padding: '14px 20px',
    borderBottom: '1px solid var(--border-subtle, #1e293b)',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary, #f8fafc)',
    display: 'flex',
    alignItems: 'center',
  },
  sectionBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  sectionDesc: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--text-muted, #94a3b8)',
  },
  inventoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
  },
  inventoryItem: {
    backgroundColor: 'var(--surface-subtle, #0f172a)',
    borderRadius: 'var(--radius-md, 6px)',
    border: '1px solid var(--border-subtle, #1e293b)',
    padding: '10px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryType: {
    fontSize: '12px',
    color: 'var(--text-secondary, #cbd5e1)',
  },
  inventoryCount: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary, #f8fafc)',
  },
  riskPillRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  riskPill: (risk: 'HIGH' | 'MEDIUM' | 'LOW') => ({
    flex: '1 1 100px',
    backgroundColor:
      risk === 'HIGH'
        ? 'rgba(239, 68, 68, 0.12)'
        : risk === 'MEDIUM'
        ? 'rgba(245, 158, 11, 0.12)'
        : 'rgba(16, 185, 129, 0.12)',
    border: `1px solid ${
      risk === 'HIGH'
        ? 'rgba(239, 68, 68, 0.3)'
        : risk === 'MEDIUM'
        ? 'rgba(245, 158, 11, 0.3)'
        : 'rgba(16, 185, 129, 0.3)'
    }`,
    borderRadius: 'var(--radius-md, 6px)',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
  }),
  riskPillLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted, #94a3b8)',
    textTransform: 'uppercase' as const,
  },
  riskPillVal: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary, #f8fafc)',
  },
  issuesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginTop: '4px',
  },
  issueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--surface-subtle, #0f172a)',
    borderRadius: 'var(--radius-md, 6px)',
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--text-secondary, #cbd5e1)',
  },
  issueLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    position: 'relative' as const,
    paddingLeft: '12px',
  },
  timelineItem: {
    display: 'flex',
    gap: '14px',
    position: 'relative' as const,
  },
  timelineDot: (color: string) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: color,
    marginTop: '4px',
    flexShrink: 0,
  }),
  timelineContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  timelineTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary, #f8fafc)',
  },
  timelineTime: {
    fontSize: '11px',
    color: 'var(--text-muted, #94a3b8)',
  },
  timelineSub: {
    fontSize: '12px',
    color: 'var(--text-secondary, #cbd5e1)',
    marginTop: '2px',
  },
};
