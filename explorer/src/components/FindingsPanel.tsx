import React, { useState, useMemo } from "react";
import type { ArchitectureFinding, FindingSeverity } from "../lib/intelligence";
import {
  formatFindingReviewItem,
  resolveFinding,
  reopen,
  setFindingInReview,
  type ReviewStatus
} from "../lib/annotations";

export interface FindingsPanelProps {
  findings: ArchitectureFinding[];
  selectedFindingId: string | null;
  onSelectFinding: (finding: ArchitectureFinding) => void;
  onClearSelection: () => void;
  onInvestigateNode?: (nodeId: string) => void;
}

export type StatusFilterOption = "ALL" | "UNRESOLVED" | "RESOLVED";

const SEVERITY_ORDER: FindingSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

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

export const FindingsPanel: React.FC<FindingsPanelProps> = ({
  findings,
  selectedFindingId,
  onSelectFinding,
  onClearSelection,
  onInvestigateNode
}) => {
  const [selectedSeverities, setSelectedSeverities] = useState<Set<FindingSeverity>>(
    new Set(SEVERITY_ORDER)
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("UNRESOLVED");
  const [expandedFindingIds, setExpandedFindingIds] = useState<Set<string>>(new Set());
  const [refreshCounter, setRefreshCounter] = useState(0);

  const forceRefresh = () => setRefreshCounter(prev => prev + 1);

  const toggleSeverity = (sev: FindingSeverity) => {
    setSelectedSeverities(prev => {
      const next = new Set(prev);
      if (next.has(sev)) {
        if (next.size > 1) {
          next.delete(sev);
        }
      } else {
        next.add(sev);
      }
      return next;
    });
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedFindingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleResolveFinding = (e: React.MouseEvent, finding: ArchitectureFinding) => {
    e.stopPropagation();
    resolveFinding(finding, "Reviewer", "Resolved finding from FindingsPanel.");
    forceRefresh();
  };

  const handleReopenFinding = (e: React.MouseEvent, findingId: string) => {
    e.stopPropagation();
    reopen(findingId);
    forceRefresh();
  };

  const handleSetInReview = (e: React.MouseEvent, finding: ArchitectureFinding) => {
    e.stopPropagation();
    setFindingInReview(finding, "Reviewer", "Investigating finding.");
    forceRefresh();
  };

  const handleInvestigate = (e: React.MouseEvent, finding: ArchitectureFinding) => {
    e.stopPropagation();
    onSelectFinding(finding);
    if (onInvestigateNode && finding.nodeIds.length > 0) {
      onInvestigateNode(finding.nodeIds[0]);
    }
  };

  // Map each finding with its review item
  const findingsWithReview = useMemo(() => {
    return findings.map(f => ({
      finding: f,
      review: formatFindingReviewItem(f)
    }));
  }, [findings, refreshCounter]);

  // Filter by severity and review status
  const filteredFindings = useMemo(() => {
    return findingsWithReview.filter(({ finding, review }) => {
      if (!selectedSeverities.has(finding.severity)) return false;

      if (statusFilter === "UNRESOLVED") {
        return review.status === "OPEN" || review.status === "IN_REVIEW";
      }
      if (statusFilter === "RESOLVED") {
        return review.status === "RESOLVED";
      }
      return true;
    });
  }, [findingsWithReview, selectedSeverities, statusFilter]);

  // Group filtered findings by severity
  const groupedFindings = useMemo(() => {
    const groups: Partial<Record<FindingSeverity, typeof findingsWithReview>> = {};
    for (const sev of SEVERITY_ORDER) {
      const list = filteredFindings.filter(item => item.finding.severity === sev);
      if (list.length > 0) {
        groups[sev] = list;
      }
    }
    return groups;
  }, [filteredFindings]);

  const unresolvedCount = useMemo(
    () => findingsWithReview.filter(i => i.review.status !== "RESOLVED").length,
    [findingsWithReview]
  );
  const resolvedCount = useMemo(
    () => findingsWithReview.filter(i => i.review.status === "RESOLVED").length,
    [findingsWithReview]
  );

  if (findings.length === 0) {
    return (
      <div className="findings-panel empty-state">
        <div className="empty-icon">✨</div>
        <h3>No findings</h3>
        <p>This architecture is in good shape. Zero violations or risk patterns detected.</p>
      </div>
    );
  }

  return (
    <div className="findings-panel">
      <div className="findings-header">
        <div className="findings-title">
          <h2>Architecture Intelligence Findings ({filteredFindings.length})</h2>
          {selectedFindingId && (
            <button className="clear-selection-btn" onClick={onClearSelection}>
              Clear Selected Finding
            </button>
          )}
        </div>

        <div className="findings-filter-bar">
          <div className="status-filter-group">
            <span className="filter-label">Status:</span>
            <button
              className={`status-filter-btn ${statusFilter === "UNRESOLVED" ? "active" : ""}`}
              onClick={() => setStatusFilter("UNRESOLVED")}
            >
              Unresolved ({unresolvedCount})
            </button>
            <button
              className={`status-filter-btn ${statusFilter === "RESOLVED" ? "active" : ""}`}
              onClick={() => setStatusFilter("RESOLVED")}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              className={`status-filter-btn ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              All ({findings.length})
            </button>
          </div>

          <div className="severity-filters">
            <span className="filter-label">Severity:</span>
            {SEVERITY_ORDER.map(sev => {
              const count = findings.filter(f => f.severity === sev).length;
              const isActive = selectedSeverities.has(sev);
              return (
                <button
                  key={sev}
                  className={`severity-chip ${SEVERITY_BADGE_CLASSES[sev]} ${isActive ? "active" : "inactive"}`}
                  onClick={() => toggleSeverity(sev)}
                  disabled={count === 0}
                >
                  {sev} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="findings-content">
        {Object.keys(groupedFindings).length === 0 ? (
          <div className="empty-state-sub">
            <p>No findings matching the selected status ({statusFilter}) or severity filters.</p>
          </div>
        ) : (
          Object.entries(groupedFindings).map(([sev, groupItems]) => {
            const severity = sev as FindingSeverity;
            return (
              <div key={severity} className="finding-group">
                <div className={`finding-group-header ${SEVERITY_BADGE_CLASSES[severity]}`}>
                  <span className="group-title">{severity}</span>
                  <span className="group-count">{groupItems.length}</span>
                </div>
                <div className="finding-rows">
                  {groupItems.map(({ finding, review }) => {
                    const isSelected = finding.id === selectedFindingId;
                    const isExpanded = expandedFindingIds.has(finding.id);

                    return (
                      <div
                        key={finding.id}
                        className={`finding-row ${isSelected ? "selected" : ""}`}
                        onClick={() => onSelectFinding(finding)}
                      >
                        <div className="finding-row-top">
                          <span className={`severity-chip-sm ${SEVERITY_BADGE_CLASSES[finding.severity]}`}>
                            {finding.severity}
                          </span>
                          <span className={`status-chip-sm ${STATUS_BADGE_CLASSES[review.status]}`}>
                            {review.status}
                          </span>
                          <h4 className="finding-row-title">{finding.title}</h4>
                          <div className="finding-badges">
                            <span className="badge node-count" title="Participating Components">
                              🧩 {finding.nodeIds.length} components
                            </span>
                            <span className="badge evidence-count" title="Evidence Snippets">
                              📄 Evidence: {finding.evidence.length}
                            </span>
                            <button
                              className="expand-btn"
                              onClick={e => toggleExpand(e, finding.id)}
                              title={isExpanded ? "Collapse Evidence" : "Expand Evidence"}
                            >
                              {isExpanded ? "▲" : "▼"}
                            </button>
                          </div>
                        </div>

                        <p className="finding-description">{finding.description}</p>

                        <div className="finding-actions">
                          {finding.nodeIds.length > 0 && (
                            <button
                              className="action-btn investigate-btn"
                              onClick={e => handleInvestigate(e, finding)}
                              title={`Investigate ${finding.nodeIds[0]}`}
                            >
                              🔍 Investigate {finding.nodeIds[0].split(":")[1] || finding.nodeIds[0]}
                            </button>
                          )}
                          {review.status === "RESOLVED" ? (
                            <button
                              className="action-btn reopen-btn"
                              onClick={e => handleReopenFinding(e, finding.id)}
                            >
                              🔄 Reopen
                            </button>
                          ) : (
                            <>
                              {review.status === "OPEN" && (
                                <button
                                  className="action-btn review-btn"
                                  onClick={e => handleSetInReview(e, finding)}
                                >
                                  ⏳ Mark In Review
                                </button>
                              )}
                              <button
                                className="action-btn resolve-btn"
                                onClick={e => handleResolveFinding(e, finding)}
                              >
                                ✓ Resolve
                              </button>
                            </>
                          )}
                        </div>

                        {isExpanded && finding.evidence.length > 0 && (
                          <div className="finding-evidence-box">
                            <h5>Evidence & Source Locations:</h5>
                            <ul className="evidence-list">
                              {finding.evidence.map((item, idx) => {
                                const lineStr = item.line ? `:${item.line}` : "";
                                const vsCodeUrl = `vscode://file/${item.file}${lineStr}`;
                                return (
                                  <li key={idx} className="evidence-item">
                                    <div className="evidence-meta">
                                      <span className="evidence-file">
                                        {item.file}
                                        {lineStr}
                                      </span>
                                      <a
                                        href={vsCodeUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="open-in-editor"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        Open in editor
                                      </a>
                                    </div>
                                    {item.snippet && (
                                      <pre className="evidence-snippet">{item.snippet}</pre>
                                    )}
                                    {item.description && (
                                      <div className="evidence-desc">{item.description}</div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
