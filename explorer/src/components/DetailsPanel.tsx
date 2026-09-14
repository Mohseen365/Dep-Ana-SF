import React, { useState, useMemo } from "react";
import {
  ExplorerNode,
  ExplorerEdge,
  ExplorerComponentImpactSummary,
  ExplorerDataSchema,
  ExplorerCycleGroup,
} from "../types/explorer";
import { evaluateRefactoringReadiness } from "../lib/readiness";
import { simulateChange, SimulationChangeType } from "../lib/change-simulator";
import { getArchitecturalHotspots } from "../lib/hotspots";
import { runAllRules } from "../lib/intelligence/rules";
import type { ConnectionAnalysis } from "../lib/connection-analysis";
import { createArchitectureContext } from "../lib/intelligence/context";
import {
  formatFindingReviewItem,
  resolveFinding,
  reopen,
  addAnnotation,
  getAnnotationsForNode,
  type ReviewStatus
} from "../lib/annotations";
import type { ArchitectureFinding, FindingSeverity } from "../lib/intelligence";
import "./panels/panels.css";

interface DetailsPanelProps {
  node: ExplorerNode | null;
  edge: ExplorerEdge | null;
  impactSummary: ExplorerComponentImpactSummary | null;
  history?: string[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose: () => void;
  onShowImpact?: (nodeId: string) => void;
  onSelectNodeById?: (nodeId: string) => void;
  data?: ExplorerDataSchema | null;
  nodes?: ExplorerNode[];
  cycles?: ExplorerCycleGroup[];
  impactSummaries?: Record<string, ExplorerComponentImpactSummary>;
  onHighlightImpact?: (nodeIds: string[], edgeIds: string[]) => void;
  connectionAnalysis?: ConnectionAnalysis | null;
  connectionState?: { direction: 'both' | 'dependencies' | 'dependents'; depth: 1 | 2 | 3 | 'ALL' };
  onConnectionStateChange?: (state: { direction: 'both' | 'dependencies' | 'dependents'; depth: 1 | 2 | 3 | 'ALL' }) => void;
}

const CHANGE_TYPES: Array<{ type: SimulationChangeType; label: string }> = [
  { type: "general", label: "General" },
  { type: "rename", label: "Rename" },
  { type: "remove", label: "Remove" },
  { type: "method", label: "Method" },
  { type: "field", label: "Field" },
  { type: "object", label: "Object" },
];

const SEVERITY_BADGE_CLASSES: Record<FindingSeverity, string> = {
  CRITICAL: "severity-critical",
  HIGH: "severity-high",
  MEDIUM: "severity-medium",
  LOW: "severity-low",
  INFO: "severity-info"
};

const STATUS_BADGE_CLASSES: Record<ReviewStatus, string> = {
  OPEN: "status-open",
  IN_REVIEW: "status-in-review",
  RESOLVED: "status-resolved"
};

export type ThreeTab = "summary" | "analysis" | "review";

export const DetailsPanel: React.FC<DetailsPanelProps> = ({
  node,
  edge,
  impactSummary,
  history = [],
  collapsed: _collapsed = false,
  onToggleCollapse,
  onClose,
  onShowImpact,
  onSelectNodeById,
  data,
  nodes,
  cycles,
  impactSummaries,
  onHighlightImpact,
  connectionAnalysis,
  connectionState,
  onConnectionStateChange,
}) => {
  const [activeTab, setActiveTab] = useState<ThreeTab>("summary");
  const [showRawData, setShowRawData] = useState(false);
  const [selectedChangeType, setSelectedChangeType] = useState<SimulationChangeType>("general");
  const [isSimCollapsed, setIsSimCollapsed] = useState(false);
  const [newAnnotationText, setNewAnnotationText] = useState("");
  const [authorName, setAuthorName] = useState("Reviewer");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [handoffSuccess, setHandoffSuccess] = useState<string | null>(null);

  const forceRefresh = () => setRefreshCounter(prev => prev + 1);

  // Compute findings relevant to the currently selected node
  const relevantFindings = useMemo(() => {
    if (!data || !node) return [];
    try {
      const ctx = createArchitectureContext(data as any);
      const allFindings = runAllRules(ctx);
      return allFindings.filter(f => f.nodeIds.includes(node.id));
    } catch (err) {
      console.error("Failed to compute relevant findings for node:", err);
      return [];
    }
  }, [data, node]);

  // Retrieve annotations stored for the currently selected node
  const nodeAnnotations = useMemo(() => {
    if (!node) return [];
    return getAnnotationsForNode(node.id);
  }, [node, refreshCounter]);

  const handleAddAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!node || !newAnnotationText.trim()) return;
    addAnnotation(node.id, authorName, newAnnotationText.trim());
    setNewAnnotationText("");
    forceRefresh();
  };

  const handleResolveFinding = (finding: ArchitectureFinding) => {
    resolveFinding(finding, authorName, "Resolved from Investigation Workspace.");
    forceRefresh();
  };

  const handleReopenFinding = (findingId: string) => {
    reopen(findingId);
    forceRefresh();
  };

  // Show edge details if an edge is selected
  if (edge) {
    return (
      <div className="details-panel">
        <div className="details-header">
          <div>
            <span className="badge edge-badge">
              {edge.relationshipType.toUpperCase().replace("-", " ")}
            </span>
            <h2>Relationship Evidence</h2>
            <span className="node-type-label">Edge Details</span>
          </div>
          <button
            className="close-btn"
            onClick={onToggleCollapse || onClose}
            title="Close details"
            aria-label="Collapse Details Panel"
          >
            ▶
          </button>
        </div>

        <div className="details-content">
          <div className="details-section">
            <h4>Connection</h4>
            <div className="evidence-flow">
              <div className="evidence-endpoint">
                <span className="evidence-label">Source</span>
                <span
                  className="evidence-value test-item-link"
                  onClick={() =>
                    onSelectNodeById && onSelectNodeById(edge.source)
                  }
                >
                  {edge.source}
                </span>
                {edge.methodOwner && (
                  <span className="evidence-detail">
                    via {edge.methodOwner}()
                  </span>
                )}
              </div>
              <span className="evidence-arrow">→</span>
              <div className="evidence-endpoint">
                <span className="evidence-label">Target</span>
                <span
                  className="evidence-value test-item-link"
                  onClick={() =>
                    onSelectNodeById && onSelectNodeById(edge.target)
                  }
                >
                  {edge.target}
                </span>
                {edge.method && (
                  <span className="evidence-detail">calls {edge.method}()</span>
                )}
              </div>
            </div>
          </div>

          <div className="details-section">
            <h4>Evidence</h4>
            <div className="evidence-code">
              {edge.evidence ? (
                <code>{edge.evidence}</code>
              ) : (
                <span className="evidence-missing">No evidence available</span>
              )}
            </div>
            {edge.file && (
              <p className="evidence-location">
                {edge.file}:{edge.line || "?"}
              </p>
            )}
          </div>

          <div className="details-section">
            <h4>Resolution Details</h4>
            <div className="resolution-grid">
              <div className="resolution-item">
                <span className="resolution-label">Status</span>
                <span
                  className={`resolution-value ${edge.unresolved ? "unresolved" : "resolved"}`}
                >
                  {edge.unresolved ? "⚠️ Unresolved" : "✓ Resolved"}
                </span>
              </div>
              <div className="resolution-item">
                <span className="resolution-label">Classification</span>
                <span className="resolution-value">
                  {edge.resolutionClassification}
                </span>
              </div>
              <div className="resolution-item">
                <span className="resolution-label">Strategy</span>
                <span className="resolution-value">
                  {edge.resolutionStrategy}
                </span>
              </div>
              <div className="resolution-item">
                <span className="resolution-label">Confidence</span>
                <span
                  className={`resolution-value confidence-${edge.confidence}`}
                >
                  {edge.confidence.charAt(0).toUpperCase() +
                    edge.confidence.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {edge.unresolved && (
            <div className="details-section">
              <h4>Unresolved Reference</h4>
              <div className="unresolved-box">
                <p>
                  The analyzer could not resolve this reference. This may
                  indicate:
                </p>
                <ul>
                  <li>Missing dependency in the source code</li>
                  <li>External dependency not in the analyzed scope</li>
                  <li>Typo or removed reference</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show hotspot empty dashboard if no node is selected
  if (!node) {
    const hotspots =
      nodes && nodes.length > 0
        ? getArchitecturalHotspots(nodes, cycles || [], impactSummaries || {})
        : null;
    const top3 = hotspots ? hotspots.topRanked.slice(0, 3) : [];

    if (top3.length > 0) {
      return (
        <div className="details-panel empty-dashboard">
          <div className="details-header">
            <div>
              <h2>Top architectural hotspots</h2>
              <span className="node-type-label">
                The most impactful components in this analysis
              </span>
            </div>
            {onToggleCollapse && (
              <button
                className="close-btn"
                onClick={onToggleCollapse}
                title="Close details"
                aria-label="Collapse Details Panel"
              >
                ▶
              </button>
            )}
          </div>
          <div className="details-content">
            <div className="hotspot-dashboard-list">
              {top3.map((item, idx) => (
                <div
                  key={item.node.id}
                  className="hotspot-dashboard-item"
                  onClick={() =>
                    onSelectNodeById && onSelectNodeById(item.node.id)
                  }
                >
                  <div className="hotspot-dashboard-item-header">
                    <span className="hotspot-rank">#{idx + 1}</span>
                    <span className="hotspot-name">
                      {item.node.displayName}
                    </span>
                    <span className="node-type-label">{item.node.type}</span>
                    <span
                      className={`badge risk-badge risk-${item.node.risk.toLowerCase()}`}
                    >
                      {item.node.risk}
                    </span>
                  </div>
                  <div className="hotspot-details">{item.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="details-panel details-empty">
        <div className="details-placeholder">
          <span className="placeholder-icon">🔍</span>
          <h3>No Component Selected</h3>
          <p>
            Click on any node or edge in the architecture graph to view detailed
            information.
          </p>
        </div>
      </div>
    );
  }

  const simResult = data
    ? simulateChange(data, node.id, selectedChangeType)
    : null;

  const readiness = evaluateRefactoringReadiness(node, impactSummary);

  const getReadinessBadgeClass = (classification: string) => {
    switch (classification) {
      case "GOOD CANDIDATE":
        return "readiness-good";
      case "CAUTION":
        return "readiness-caution";
      case "HIGH CAUTION":
        return "readiness-high-caution";
      default:
        return "readiness-caution";
    }
  };

  return (
    <div className="details-panel">
      {/* 1. Visually Dominant Selected Component Header */}
      <div className="details-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span className="badge node-type-badge" style={{ backgroundColor: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
              {node.type}
            </span>
            <span className={`badge risk-badge risk-${node.risk.toLowerCase()}`}>
              {node.risk} RISK
            </span>
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#f8fafc", margin: "2px 0 4px 0" }}>
            {node.displayName}
          </h2>
          <span className="node-file-path" style={{ fontSize: "0.75rem", color: "#94a3b8", wordBreak: "break-all" }}>
            📁 {node.file || "N/A"}
          </span>
        </div>
        <button
          className="close-btn"
          onClick={onToggleCollapse || onClose}
          title="Close details"
          aria-label="Collapse Details Panel"
        >
          ▶
        </button>
      </div>

      {history.length > 1 && (
        <div className="breadcrumb-bar">
          <span className="summary-label">History:</span>
          {history.map((histId, idx) => (
            <React.Fragment key={histId + idx}>
              {idx > 0 && <span className="breadcrumb-separator">→</span>}
              <span
                className="breadcrumb-item"
                onClick={() => onSelectNodeById && onSelectNodeById(histId)}
              >
                {histId.split(":")[1] || histId}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* 2. Readiness Hero & Primary CTA (Sticky - No Scrolling Needed) */}
      <div className="readiness-hero-sticky" style={{
        padding: "12px",
        margin: "8px 0 12px 0",
        backgroundColor: "#0f172a",
        borderRadius: "8px",
        border: "1px solid rgba(56, 189, 248, 0.2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span className="hero-label" style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.05em" }}>
            Refactoring Readiness
          </span>
          <span className={`readiness-badge ${getReadinessBadgeClass(readiness.classification)}`}>
            {readiness.classification}
          </span>
        </div>

        {targetError && (
          <div className="target-error-msg" style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "8px" }}>
            ⚠️ {targetError}
          </div>
        )}
        {handoffSuccess && (
          <div className="handoff-success-msg" style={{ color: "#10b981", fontSize: "0.8rem", marginBottom: "8px" }}>
            ✓ {handoffSuccess}
          </div>
        )}

        <button
          className="refactor-primary-cta"
          style={{
            width: "100%",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "bold",
            fontSize: "0.9rem",
            border: "none",
            cursor: "pointer",
            padding: "10px 14px",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(56, 189, 248, 0.25)",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
          onClick={() => {
            setTargetError(null);
            setHandoffSuccess(null);
            if (!node || !node.id || typeof node.id !== "string" || node.id.trim() === "") {
              setTargetError("Invalid or stale target component selected.");
              return;
            }
            const compName = node.displayName || (node.id.includes(":") ? node.id.split(":")[1] : node.id);
            if (!compName || compName.trim() === "") {
              setTargetError("Invalid or stale component target name.");
              return;
            }
            setShowConfirmModal(true);
          }}
        >
          ⚡ Refactor in LiteLLM
        </button>
      </div>

      {/* 3. Consolidated Navigation Tabs: SUMMARY / ANALYSIS / REVIEW */}
      <div className="three-tab-navigation" style={{ display: "flex", gap: "4px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "6px", marginBottom: "12px" }}>
        {(["summary", "analysis", "review"] as ThreeTab[]).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "6px 8px",
              fontSize: "0.8rem",
              fontWeight: "700",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              background: activeTab === tab ? "#38bdf8" : "rgba(255,255,255,0.06)",
              color: activeTab === tab ? "#0f172a" : "#cbd5e1",
              transition: "background 0.15s ease"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="details-content">
        {/* ========================================================= */}
        {/* TAB 1: SUMMARY                                            */}
        {/* ========================================================= */}
        {activeTab === "summary" && (
          <>
            {/* Risk Reasons Section with Severity Icons */}
            <div className="details-section">
              <h4>Risk Assessment</h4>
              {readiness.reasons.length > 0 ? (
                <ul className="risk-reasons-list" style={{ paddingLeft: 0, listStyle: "none" }}>
                  {readiness.reasons.map((reason, idx) => (
                    <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "6px", fontSize: "0.82rem", color: "#e2e8f0" }}>
                      <span style={{ color: readiness.classification.includes("GOOD") ? "#10b981" : "#f59e0b" }}>
                        {readiness.classification.includes("GOOD") ? "✓" : "⚠️"}
                      </span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="risk-reasons-empty">No elevated risk reasons identified for this component.</p>
              )}
            </div>

            {/* Concise Blast Radius Summary */}
            <div className="details-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <h4>Blast Radius Summary</h4>
                <button
                  className="evidence-btn"
                  style={{ fontSize: "0.75rem", padding: "2px 6px" }}
                  onClick={() => setActiveTab("analysis")}
                >
                  View Details in Analysis →
                </button>
              </div>
              <div className="blast-radius-summary-box" style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                  <div>
                    <span className="summary-label" style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block" }}>Direct Dependents</span>
                    <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#f8fafc" }}>
                      {impactSummary ? impactSummary.directDependents.length : "?"}
                    </span>
                  </div>
                  <div>
                    <span className="summary-label" style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block" }}>Dependencies</span>
                    <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#f8fafc" }}>
                      {impactSummary ? impactSummary.directDependencies.length : node.metrics.fanOut}
                    </span>
                  </div>
                  <div>
                    <span className="summary-label" style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block" }}>Transitive Impact</span>
                    <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#38bdf8" }}>
                      {impactSummary ? impactSummary.totalImpactCount : "?"}
                    </span>
                  </div>
                </div>
                {onShowImpact && (
                  <button
                    className="show-impact-btn"
                    style={{ marginTop: "10px", width: "100%", padding: "6px 10px", fontSize: "0.8rem" }}
                    onClick={() => onShowImpact(node.id)}
                  >
                    💥 Highlight Blast Radius
                  </button>
                )}
              </div>
            </div>

            {/* Key Dependencies & Dependents Preview */}
            {impactSummary && (
              <div className="details-section">
                <h4>Key Relationships</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <span className="summary-label" style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Direct Dependents ({impactSummary.directDependents.length}):</span>
                    {impactSummary.directDependents.length > 0 ? (
                      <div className="dep-link-list" style={{ marginTop: "4px" }}>
                        {impactSummary.directDependents.slice(0, 3).map((depId) => (
                          <div key={depId} className="dep-link-item" onClick={() => onSelectNodeById && onSelectNodeById(depId)}>
                            <span className="dep-link-name">← {depId}</span>
                            <span className="dep-link-arrow">Inspect</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="risk-reasons-empty" style={{ margin: "2px 0" }}>No direct dependents</p>
                    )}
                  </div>
                  <div>
                    <span className="summary-label" style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Direct Dependencies ({impactSummary.directDependencies.length}):</span>
                    {impactSummary.directDependencies.length > 0 ? (
                      <div className="dep-link-list" style={{ marginTop: "4px" }}>
                        {impactSummary.directDependencies.slice(0, 3).map((depId) => (
                          <div key={depId} className="dep-link-item" onClick={() => onSelectNodeById && onSelectNodeById(depId)}>
                            <span className="dep-link-name">→ {depId}</span>
                            <span className="dep-link-arrow">Inspect</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="risk-reasons-empty" style={{ margin: "2px 0" }}>No direct dependencies</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Coupling Metrics Grid */}
            <div className="details-section" id="coupling-metrics">
              <h4>Coupling Metrics</h4>
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-title">Fan-In</span>
                  <span className="metric-num">{node.metrics.fanIn}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-title">Fan-Out</span>
                  <span className="metric-num">{node.metrics.fanOut}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-title">Coupling</span>
                  <span className="metric-num">{node.metrics.coupling}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-title">Unresolved</span>
                  <span className="metric-num">{node.metrics.unresolved}</span>
                </div>
              </div>
            </div>

            {/* Behavior Chips */}
            {node.behavior && (
              <div className="details-section behavior-chips-section">
                <h4>Component Behavior</h4>
                <div className="behavior-chips-container">
                  {node.behavior.sharing && node.behavior.sharing !== "inherited sharing" && (
                    <span className={`behavior-chip ${node.behavior.sharing === "without sharing" ? "chip-without-sharing" : ""}`}>
                      ⚠ {node.behavior.sharing}
                    </span>
                  )}
                  {Boolean(node.behavior.calloutCount) && (
                    <span className="behavior-chip">🌐 callouts:{node.behavior.calloutCount}</span>
                  )}
                  {Boolean(node.behavior.securitySignalsCount) && (
                    <span className="behavior-chip">🔒 signals:{node.behavior.securitySignalsCount}</span>
                  )}
                  {Boolean(node.behavior.queryCount) && (
                    <span className="behavior-chip">📊 SOQL:{node.behavior.queryCount}</span>
                  )}
                  {Boolean(node.behavior.dmlCount) && (
                    <span className="behavior-chip">✏ DML:{node.behavior.dmlCount}</span>
                  )}
                  {Boolean(node.behavior.asyncPatterns?.length) && (
                    <span className="behavior-chip">⚡ {node.behavior.asyncPatterns.join(", ")}</span>
                  )}
                </div>
              </div>
            )}

            {/* Findings Preview */}
            {relevantFindings.length > 0 && (
              <div className="details-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4>Relevant Findings ({relevantFindings.length})</h4>
                  <button className="evidence-btn" style={{ fontSize: "0.75rem", padding: "2px 6px" }} onClick={() => setActiveTab("review")}>
                    View in Review →
                  </button>
                </div>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  {relevantFindings.length} architectural finding(s) detected affecting this component.
                </p>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ANALYSIS                                           */}
        {/* ========================================================= */}
        {activeTab === "analysis" && (
          <>
            {/* Connection Paths Analysis */}
            {connectionAnalysis && (
              <div className="details-section connection-analysis-section" data-testid="connection-analysis-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4>Connection Analysis</h4>
                  {connectionState && onConnectionStateChange && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <select
                        value={connectionState.direction}
                        onChange={(e) => onConnectionStateChange({ ...connectionState, direction: e.target.value as any })}
                        className="focus-select"
                        style={{ padding: "2px 6px", fontSize: "0.8rem" }}
                      >
                        <option value="both">↔ Both</option>
                        <option value="dependencies">→ Dependencies</option>
                        <option value="dependents">← Dependents</option>
                      </select>
                      <select
                        value={String(connectionState.depth)}
                        onChange={(e) => onConnectionStateChange({ ...connectionState, depth: (e.target.value === "ALL" ? "ALL" : parseInt(e.target.value, 10)) as any })}
                        className="focus-select"
                        style={{ padding: "2px 6px", fontSize: "0.8rem" }}
                      >
                        <option value="1">Depth 1</option>
                        <option value="2">Depth 2</option>
                        <option value="3">Depth 3</option>
                        <option value="ALL">Depth ALL</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "0.8rem" }}>
                  <span className="badge" style={{ background: "#3b82f6", color: "#fff" }}>
                    Paths: {connectionAnalysis.totalPathCount}
                  </span>
                  {connectionAnalysis.cyclePathCount > 0 && (
                    <span className="badge" style={{ background: "#ef4444", color: "#fff" }}>
                      Cycles: {connectionAnalysis.cyclePathCount}
                    </span>
                  )}
                  {connectionAnalysis.investigationPathCount > 0 && (
                    <span className="badge" style={{ background: "#8b5cf6", color: "#fff" }}>
                      Candidates: {connectionAnalysis.investigationPathCount}
                    </span>
                  )}
                </div>

                {connectionAnalysis.paths.length > 0 ? (
                  <div className="dep-link-list" style={{ maxHeight: "180px", overflowY: "auto" }}>
                    {connectionAnalysis.paths.slice(0, 10).map((path, idx) => (
                      <div key={idx} className="dep-link-item" onClick={() => onSelectNodeById && onSelectNodeById(path.target)}>
                        <span className="dep-link-name">
                          {path.direction === "dependencies" ? "→" : "←"} {path.orderedPath.join(" ➔ ")}
                        </span>
                        <span className="dep-link-arrow">Inspect</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="risk-reasons-empty">No connection paths found within selected depth/direction.</p>
                )}
              </div>
            )}

            {/* Direct Dependencies */}
            {impactSummary && (
              <div className="details-section">
                <h4>Dependencies ({impactSummary.directDependencies.length})</h4>
                {impactSummary.directDependencies.length > 0 ? (
                  <div className="dep-link-list">
                    {impactSummary.directDependencies.map((depId) => (
                      <div key={depId} className="dep-link-item" onClick={() => onSelectNodeById && onSelectNodeById(depId)}>
                        <span className="dep-link-name">→ {depId}</span>
                        <span className="dep-link-arrow">Inspect</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="risk-reasons-empty">No direct dependencies</p>
                )}
              </div>
            )}

            {/* Direct Dependents */}
            {impactSummary && (
              <div className="details-section">
                <h4>Dependents ({impactSummary.directDependents.length})</h4>
                {impactSummary.directDependents.length > 0 ? (
                  <div className="dep-link-list">
                    {impactSummary.directDependents.map((depId) => (
                      <div key={depId} className="dep-link-item" onClick={() => onSelectNodeById && onSelectNodeById(depId)}>
                        <span className="dep-link-name">← {depId}</span>
                        <span className="dep-link-arrow">Inspect</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="risk-reasons-empty">No direct dependents</p>
                )}
              </div>
            )}

            {/* Full Refactoring Impact Summary */}
            {impactSummary && (
              <div className="details-section" id="impact-summary">
                <h4>Refactoring Impact Analysis</h4>
                <div className="impact-box">
                  <p><strong>Total Impacted Components:</strong> {impactSummary.totalImpactCount}</p>
                  <p><strong>Direct Dependencies:</strong> {impactSummary.directDependencies.length > 0 ? impactSummary.directDependencies.join(", ") : "None"}</p>
                  <p><strong>Direct Dependents:</strong> {impactSummary.directDependents.length > 0 ? impactSummary.directDependents.join(", ") : "None"}</p>
                  <div className="impact-tests-subsection">
                    <strong>Impacted Tests:</strong>
                    {impactSummary.impactedTests.length > 0 ? (
                      <ul className="impact-tests-list">
                        {impactSummary.impactedTests.map((testId) => (
                          <li key={testId}>
                            {onSelectNodeById ? (
                              <span className="test-item-link" onClick={() => onSelectNodeById(testId)}>
                                {testId.split(":")[1] || testId}
                              </span>
                            ) : (
                              <span>{testId.split(":")[1] || testId}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-impacted-tests">No impacted tests identified by analyzer data.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Change Simulator Section ("What if I change this?") */}
            {data && (
              <div className="details-section simulator-section">
                <div
                  className="simulator-header"
                  onClick={() => setIsSimCollapsed((prev) => !prev)}
                  style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <h4>What if I change this?</h4>
                  <span className="collapse-icon">{isSimCollapsed ? "▲" : "▼"}</span>
                </div>
                {!isSimCollapsed && simResult && (
                  <div className="simulator-card">
                    <div className="simulator-title">Simulate change to {node.displayName}</div>
                    <div className="simulator-options">
                      {CHANGE_TYPES.map((opt) => (
                        <label key={opt.type} className="simulator-radio">
                          <input
                            type="radio"
                            name="changeType"
                            value={opt.type}
                            checked={selectedChangeType === opt.type}
                            onChange={() => setSelectedChangeType(opt.type)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    <div className="simulator-metrics">
                      <div className="sim-metric-row">
                        <span>Blast radius:</span>
                        <span className={`blast-radius-badge blast-${simResult.blastRadius.toLowerCase()}`}>
                          {simResult.blastRadius}
                        </span>
                      </div>
                      <div className="sim-metric-row">
                        <span>Direct dependents:</span>
                        <span>{simResult.directDependentsCount}</span>
                      </div>
                      <div className="sim-metric-row">
                        <span>Transitive:</span>
                        <span>{simResult.transitiveDependentsCount}</span>
                      </div>
                      <div className="sim-metric-row">
                        <span>Impacted tests:</span>
                        <span>{simResult.impactedTestsCount}</span>
                      </div>
                      <div className="sim-metric-row">
                        <span>Cycles involved:</span>
                        <span>{simResult.cyclesInvolvedCount}</span>
                      </div>
                      <div className="sim-metric-row">
                        <span>Unresolved:</span>
                        <span>{simResult.unresolvedReferencesCount}</span>
                      </div>
                    </div>
                    <p className="sim-explanation">{simResult.blastRadiusExplanation}</p>
                    <button
                      className="highlight-affected-btn"
                      disabled={!onHighlightImpact}
                      title={!onHighlightImpact ? "Impact highlighting not available" : "Highlight affected components in graph"}
                      onClick={() => {
                        if (onHighlightImpact) {
                          onHighlightImpact(simResult.affectedNodeIds, simResult.affectedEdgeIds);
                        }
                      }}
                    >
                      Highlight affected in graph
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 3: REVIEW                                             */}
        {/* ========================================================= */}
        {activeTab === "review" && (
          <>
            {/* Relevant Architecture Findings */}
            <div className="details-section relevant-findings-section">
              <h4>Relevant Architecture Findings ({relevantFindings.length})</h4>
              {relevantFindings.length > 0 ? (
                <div className="relevant-findings-list">
                  {relevantFindings.map(finding => {
                    const reviewItem = formatFindingReviewItem(finding);
                    return (
                      <div key={finding.id} className="relevant-finding-card">
                        <div className="relevant-finding-header">
                          <span className={`severity-chip-sm ${SEVERITY_BADGE_CLASSES[finding.severity]}`}>
                            {finding.severity}
                          </span>
                          <span className={`status-chip-sm ${STATUS_BADGE_CLASSES[reviewItem.status]}`}>
                            {reviewItem.status}
                          </span>
                          <h5 className="relevant-finding-title">{finding.title}</h5>
                        </div>
                        <p className="relevant-finding-desc">{finding.description}</p>

                        {finding.evidence.length > 0 && (
                          <div className="finding-evidence-mini">
                            <span className="mini-evidence-label">Evidence Locations ({finding.evidence.length}):</span>
                            <ul className="mini-evidence-list">
                              {finding.evidence.map((ev, idx) => {
                                const lineStr = ev.line ? `:${ev.line}` : "";
                                const vsCodeUrl = `vscode://file/${ev.file}${lineStr}`;
                                return (
                                  <li key={idx}>
                                    <code>{ev.file}{lineStr}</code>
                                    <a href={vsCodeUrl} target="_blank" rel="noreferrer" className="open-in-editor-mini">
                                      Open in editor
                                    </a>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        <div className="relevant-finding-actions">
                          {reviewItem.status === "RESOLVED" ? (
                            <button className="action-btn reopen-btn" onClick={() => handleReopenFinding(finding.id)}>
                              🔄 Reopen Finding
                            </button>
                          ) : (
                            <button className="action-btn resolve-btn" onClick={() => handleResolveFinding(finding)}>
                              ✓ Resolve Finding
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="risk-reasons-empty">No architecture findings for this component.</p>
              )}
            </div>

            {/* Annotations & Review Notes */}
            <div className="details-section annotations-section">
              <h4>Annotations & Review Notes ({nodeAnnotations.length})</h4>
              {nodeAnnotations.length > 0 ? (
                <div className="annotations-list">
                  {nodeAnnotations.map(anno => (
                    <div key={anno.id} className="annotation-item">
                      <div className="annotation-header">
                        <span className="annotation-author">{anno.author}</span>
                        <span className="annotation-date">
                          {new Date(anno.createdAt).toLocaleDateString()}
                        </span>
                        <span className={`status-chip-sm ${STATUS_BADGE_CLASSES[anno.status]}`}>
                          {anno.status}
                        </span>
                      </div>
                      <p className="annotation-text">{anno.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="risk-reasons-empty">No review annotations for this component yet.</p>
              )}

              <form onSubmit={handleAddAnnotation} className="add-annotation-form">
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Author (e.g. Reviewer)"
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    className="author-input"
                  />
                </div>
                <div className="form-row">
                  <textarea
                    placeholder="Add a review note or annotation..."
                    value={newAnnotationText}
                    onChange={e => setNewAnnotationText(e.target.value)}
                    className="annotation-textarea"
                    rows={2}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newAnnotationText.trim()}
                  className="submit-annotation-btn"
                >
                  ➕ Add Review Note
                </button>
              </form>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* ADVANCED SECTION: RAW METADATA                            */}
        {/* ========================================================= */}
        <div className="details-section raw-metadata-accordion" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "12px", marginTop: "16px" }}>
          <button
            className="clear-filters-btn"
            style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            onClick={() => setShowRawData((prev) => !prev)}
          >
            <span>Advanced: Raw Metadata</span>
            <span>{showRawData ? "▲" : "▼"}</span>
          </button>
          {showRawData && (
            <div className="evidence-code" style={{ marginTop: "8px" }}>
              <code>{JSON.stringify(node, null, 2)}</code>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal Boundary (Preserved Contract) */}
      {showConfirmModal && node && (
        <div
          className="refactor-confirm-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            className="refactor-confirm-modal"
            style={{
              backgroundColor: "#1e293b",
              border: "1px solid #38bdf8",
              borderRadius: "8px",
              padding: "20px",
              maxWidth: "480px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              color: "#f8fafc",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#38bdf8" }}>Confirm Refactor Handoff</h3>
            <p style={{ fontSize: "0.9rem", color: "#cbd5e1" }}>
              You are initiating refactoring handoff for target component:
            </p>
            <div style={{ backgroundColor: "#0f172a", padding: "10px", borderRadius: "4px", fontSize: "0.85rem", marginBottom: "12px" }}>
              <div><strong>Canonical Target ID:</strong> {node.id}</div>
              <div><strong>Component Name:</strong> {node.displayName || (node.id.includes(":") ? node.id.split(":")[1] : node.id)}</div>
              <div><strong>Component Type:</strong> {node.type}</div>
              <div><strong>Source File:</strong> {node.file || "N/A"}</div>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic", marginBottom: "12px" }}>
              🔒 Note: Selecting this action does NOT modify source code directly. A refactor job will only execute after explicit confirmation.
            </p>

            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>Standalone CLI Command:</span>
              <pre style={{ backgroundColor: "#0f172a", padding: "8px", borderRadius: "4px", fontSize: "0.75rem", overflowX: "auto", margin: "4px 0 0 0" }}>
                <code>node refactor-litellm/orchestrator.js --component {node.displayName || (node.id.includes(":") ? node.id.split(":")[1] : node.id)}</code>
              </pre>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                className="cancel-btn"
                style={{ padding: "8px 14px", borderRadius: "4px", border: "1px solid #64748b", background: "transparent", color: "#cbd5e1", cursor: "pointer" }}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-handoff-btn"
                style={{ padding: "8px 14px", borderRadius: "4px", border: "none", background: "#38bdf8", color: "#0f172a", fontWeight: "bold", cursor: "pointer" }}
                onClick={() => {
                  const compName = node.displayName || (node.id.includes(":") ? node.id.split(":")[1] : node.id);
                  const payload = {
                    type: "OPEN_COMPONENT_MODAL",
                    targetComponentId: node.id,
                    componentName: compName,
                    componentType: node.type,
                    sourceFile: node.file || "",
                    nodeId: node.id,
                    component: compName,
                  };
                  if (window.parent && window.parent !== window) {
                    window.parent.postMessage(payload, "*");
                    setHandoffSuccess(`Dispatched postMessage handoff payload for ${compName}.`);
                  } else {
                    setHandoffSuccess(`Standalone handoff confirmed for ${compName}. Use CLI command to execute.`);
                  }
                  setShowConfirmModal(false);
                }}
              >
                Confirm & Send to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
