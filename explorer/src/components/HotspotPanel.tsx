import React, { useState, useMemo } from "react";
import {
  ExplorerNode,
  ExplorerCycleGroup,
  ExplorerComponentImpactSummary,
} from "../types/explorer";
import { getArchitecturalHotspots, CategorizedHotspots } from "../lib/hotspots";
import {
  evaluateRefactoringReadiness,
  ReadinessEvaluation,
  ReadinessClassification,
} from "../lib/readiness";

interface HotspotPanelProps {
  nodes: ExplorerNode[];
  cycles: ExplorerCycleGroup[];
  impactSummaries: Record<string, ExplorerComponentImpactSummary>;
  onSelectHotspot: (node: ExplorerNode) => void;
  selectedNodeId: string | null;
  onShowImpact?: (nodeId: string) => void;
}

type TabType =
  | "ranked"
  | "highRisk"
  | "highFanIn"
  | "highCoupling"
  | "circular"
  | "unresolved"
  | "readiness";

export const HotspotPanel: React.FC<HotspotPanelProps> = ({
  nodes,
  cycles,
  impactSummaries,
  onSelectHotspot,
  selectedNodeId,
  onShowImpact,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("ranked");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [hideHighCautionDependents, setHideHighCautionDependents] =
    useState<boolean>(false);
  const [expandedHotspotId, setExpandedHotspotId] = useState<string | null>(null);

  const hotspots: CategorizedHotspots = useMemo(() => {
    return getArchitecturalHotspots(nodes, cycles, impactSummaries);
  }, [nodes, cycles, impactSummaries]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, ExplorerNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const readinessEvaluations = useMemo(() => {
    return nodes.map((node) => {
      const summary = impactSummaries[node.id] || null;
      const evalResult = evaluateRefactoringReadiness(node, summary);
      const directDeps = summary?.directDependents || [];
      const hasHighCautionDependent = directDeps.some((depId) => {
        const depNode = nodeMap.get(depId);
        if (!depNode) return false;
        const depSummary = impactSummaries[depId] || null;
        const depEval = evaluateRefactoringReadiness(depNode, depSummary);
        return depEval.classification === "HIGH CAUTION";
      });
      return {
        node,
        evaluation: evalResult,
        hasHighCautionDependent,
      };
    });
  }, [nodes, impactSummaries, nodeMap]);

  const readinessFilteredNodes = useMemo(() => {
    if (!hideHighCautionDependents) return readinessEvaluations;
    return readinessEvaluations.filter((item) => !item.hasHighCautionDependent);
  }, [readinessEvaluations, hideHighCautionDependents]);

  const readinessGroups = useMemo(() => {
    const groups: Record<
      ReadinessClassification,
      Array<{ node: ExplorerNode; evaluation: ReadinessEvaluation }>
    > = {
      "GOOD CANDIDATE": [],
      CAUTION: [],
      "HIGH CAUTION": [],
    };
    readinessFilteredNodes.forEach((item) => {
      groups[item.evaluation.classification].push(item);
    });
    return groups;
  }, [readinessFilteredNodes]);

  const totalHotspots = hotspots.topRanked.length;

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedHotspotId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="hotspot-panel">
      {/* Consistent Navigation Banner */}
      <div className="analysis-mode-nav">
        <span className="nav-mode-item">Graph</span>
        <span className="nav-mode-item">Findings</span>
        <span className="nav-mode-item active">Hotspots</span>
        <span className="nav-mode-item">Impact</span>
        <span className="nav-mode-item">Compare</span>
      </div>

      <div
        className="hotspot-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="hotspot-header-title">
          <span className="hotspot-icon">🔥</span>
          <h3>Architectural Hotspots</h3>
          <span className="hotspot-badge">{totalHotspots}</span>
        </div>
        <button
          className="collapse-toggle"
          title={isCollapsed ? "Expand Hotspots" : "Collapse Hotspots"}
        >
          {isCollapsed ? "▲" : "▼"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="hotspot-body">
          <div className="hotspot-tabs">
            <button
              className={`hotspot-tab ${activeTab === "ranked" ? "active" : ""}`}
              onClick={() => setActiveTab("ranked")}
            >
              Top ({hotspots.topRanked.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === "highRisk" ? "active" : ""}`}
              onClick={() => setActiveTab("highRisk")}
            >
              High Risk ({hotspots.highRisk.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === "highFanIn" ? "active" : ""}`}
              onClick={() => setActiveTab("highFanIn")}
            >
              Fan-In ({hotspots.highFanIn.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === "highCoupling" ? "active" : ""}`}
              onClick={() => setActiveTab("highCoupling")}
            >
              Coupling ({hotspots.highCoupling.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === "circular" ? "active" : ""}`}
              onClick={() => setActiveTab("circular")}
            >
              Cycles ({hotspots.circular.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === "unresolved" ? "active" : ""}`}
              onClick={() => setActiveTab("unresolved")}
            >
              Unresolved ({hotspots.unresolved.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === "readiness" ? "active" : ""}`}
              onClick={() => setActiveTab("readiness")}
            >
              Readiness ({readinessFilteredNodes.length})
            </button>
          </div>

          {activeTab === "readiness" && (
            <div className="readiness-filter-bar">
              <label
                className="checkbox-label"
                style={{
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={hideHighCautionDependents}
                  onChange={(e) =>
                    setHideHighCautionDependents(e.target.checked)
                  }
                />
                Hide nodes with any HIGH CAUTION dependent
              </label>
            </div>
          )}

          <div className="hotspot-list">
            {activeTab === "readiness" &&
              (readinessFilteredNodes.length === 0 ? (
                <div className="hotspot-empty">
                  No components match readiness criteria.
                </div>
              ) : (
                <div
                  className="readiness-groups-list"
                  style={{ display: "flex", gap: "12px" }}
                >
                  {(["GOOD CANDIDATE", "CAUTION", "HIGH CAUTION"] as const).map(
                    (group) => {
                      const groupItems = readinessGroups[group];
                      if (groupItems.length === 0) return null;

                      return (
                        <div
                          key={group}
                          className="readiness-group-column"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <div
                            className={`readiness-badge readiness-${group.toLowerCase().replace(" ", "-")}`}
                          >
                            {group} ({groupItems.length})
                          </div>
                          {groupItems.map(({ node, evaluation }) => (
                            <div
                              key={node.id}
                              className={`hotspot-item ${selectedNodeId === node.id ? "selected" : ""}`}
                              onClick={() => onSelectHotspot(node)}
                            >
                              <div className="hotspot-item-header">
                                <span className="hotspot-name">
                                  {node.displayName}
                                </span>
                                <span
                                  className={`badge risk-badge risk-${node.risk.toLowerCase()}`}
                                >
                                  {node.risk}
                                </span>
                              </div>
                              <div className="hotspot-item-details">
                                {evaluation.reasons.join(", ")}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    },
                  )}
                </div>
              ))}

            {activeTab === "ranked" &&
              (hotspots.topRanked.length === 0 ? (
                <div className="hotspot-empty">
                  No architectural hotspots identified.
                </div>
              ) : (
                hotspots.topRanked.map((item, idx) => {
                  const isExpanded = expandedHotspotId === item.node.id;
                  return (
                    <div
                      key={item.node.id}
                      className={`hotspot-item ranked-item ${selectedNodeId === item.node.id ? "selected" : ""}`}
                      onClick={() => onSelectHotspot(item.node)}
                    >
                      <div className="hotspot-item-header">
                        <span className="hotspot-rank-badge">#{idx + 1}</span>
                        <span className="hotspot-name">{item.node.displayName}</span>
                        <span className={`badge risk-badge risk-${item.node.risk.toLowerCase()}`}>
                          {item.node.risk}
                        </span>
                        <button
                          className="hotspot-expand-btn"
                          onClick={(e) => toggleExpand(e, item.node.id)}
                          title="Toggle Detailed Metrics"
                        >
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      </div>

                      <div className="hotspot-item-details">{item.details}</div>

                      {isExpanded && (
                        <div className="hotspot-expanded-metrics">
                          <div className="metrics-grid">
                            <div className="metric-cell">
                              <span className="metric-lbl">Fan-In:</span>
                              <span className="metric-val">{item.node.metrics.fanIn}</span>
                            </div>
                            <div className="metric-cell">
                              <span className="metric-lbl">Fan-Out:</span>
                              <span className="metric-val">{item.node.metrics.fanOut}</span>
                            </div>
                            <div className="metric-cell">
                              <span className="metric-lbl">Coupling:</span>
                              <span className="metric-val">{item.node.metrics.coupling}</span>
                            </div>
                            <div className="metric-cell">
                              <span className="metric-lbl">Score:</span>
                              <span className="metric-val">{item.node.metrics.score}</span>
                            </div>
                          </div>

                          <div className="hotspot-action-row">
                            <button
                              className="hotspot-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectHotspot(item.node);
                              }}
                            >
                              🔍 Select Component
                            </button>
                            {onShowImpact && (
                              <button
                                className="hotspot-action-btn impact-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShowImpact(item.node.id);
                                }}
                              >
                                💥 Analyze Impact
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ))}

            {activeTab !== "ranked" &&
              activeTab !== "readiness" &&
              (hotspots[activeTab].length === 0 ? (
                <div className="hotspot-empty">
                  No components in this category.
                </div>
              ) : (
                hotspots[activeTab].map((node, idx) => (
                  <div
                    key={node.id}
                    className={`hotspot-item ${selectedNodeId === node.id ? "selected" : ""}`}
                    onClick={() => onSelectHotspot(node)}
                  >
                    <div className="hotspot-item-header">
                      <span className="hotspot-rank">#{idx + 1}</span>
                      <span className="hotspot-name">{node.displayName}</span>
                      <span
                        className={`badge risk-badge risk-${node.risk.toLowerCase()}`}
                      >
                        {node.risk}
                      </span>
                    </div>
                    <div className="hotspot-item-details">
                      Fan-In: {node.metrics.fanIn} | Fan-Out:{" "}
                      {node.metrics.fanOut} | Coupling: {node.metrics.coupling}
                      {node.refactoringReadiness?.hasCycles
                        ? " | Cycle: Yes"
                        : ""}
                      {node.metrics.unresolved > 0
                        ? ` | Unresolved: ${node.metrics.unresolved}`
                        : ""}
                    </div>
                  </div>
                ))
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
