/**
 * Deterministic Architecture Regression Engine (WAVE-D1 / TRACK E)
 * ================================================================
 *
 * Purpose:
 *   Detects architectural regressions between two Architecture Snapshots
 *   or ExplorerData objects on top of `diffSnapshots()`.
 *
 * Detected Regressions:
 *   1. NEW_CYCLE: Introduction of a circular dependency cycle.
 *   2. NEW_UNRESOLVED_REFERENCE: Introduction of an unresolved reference.
 *   3. NEW_HIGH_RISK: Transition of a component to HIGH risk level (or addition of a high-risk component).
 *   4. COUPLING_INCREASED: Increase in total component coupling.
 *   5. HEALTH_DECREASED: Degradation of repository or component architecture health level.
 *   6. NEW_DEPENDENCY: Addition of a new graph dependency relationship.
 *
 * Requirements:
 *   - 0 LLM calls or runtime dependencies.
 *   - 100% deterministic output and stable sorting.
 *   - Return findings with severity, type, affected nodes, and evidence/change reference.
 */

"use strict";

const { createEvidence } = require("./deterministic/contract.cjs");
const { diffSnapshots } = require("./architecture-diff.cjs");

const REGRESSION_TYPES = Object.freeze({
  NEW_CYCLE: "NEW_CYCLE",
  NEW_UNRESOLVED_REFERENCE: "NEW_UNRESOLVED_REFERENCE",
  NEW_HIGH_RISK: "NEW_HIGH_RISK",
  COUPLING_INCREASED: "COUPLING_INCREASED",
  HEALTH_DECREASED: "HEALTH_DECREASED",
  NEW_DEPENDENCY: "NEW_DEPENDENCY"
});

const REGRESSION_SEVERITIES = Object.freeze({
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
});

/**
 * Health hierarchy rank helper for comparing architecture health degradation.
 */
function getHealthRank(levelStr) {
  const l = String(levelStr || "UNKNOWN").toUpperCase().trim();
  switch (l) {
    case "HEALTHY":
      return 4;
    case "ATTENTION":
      return 3;
    case "DEGRADED":
      return 2;
    case "HIGH_RISK":
    case "CRITICAL":
      return 1;
    default:
      return 0;
  }
}

/**
 * Main Architecture Regression Engine function.
 *
 * @param {Object} before - Baseline snapshot or ExplorerData.
 * @param {Object} after - Target snapshot or ExplorerData.
 * @param {Object} [options] - Configuration options.
 * @returns {Object} Deterministic regression findings and summary.
 */
function detectArchitectureRegressions(before, after, options = {}) {
  const diff = diffSnapshots(before, after, options);

  const regressions = [];

  // 1. Detect NEW_CYCLE
  if (Array.isArray(diff.cycleChanges?.added) && diff.cycleChanges.added.length > 0) {
    for (const cycle of diff.cycleChanges.added) {
      const affectedNodes = [...cycle.nodes].sort();
      regressions.push({
        id: `regression-new-cycle-${cycle.id}`,
        type: REGRESSION_TYPES.NEW_CYCLE,
        severity: REGRESSION_SEVERITIES.CRITICAL,
        message: `New circular dependency cycle introduced touching ${affectedNodes.length} component(s): ${affectedNodes.join(", ")}`,
        affectedNodes,
        evidence: [
          createEvidence(
            "new-cycle-introduced",
            `Circular dependency loop created touching components [${affectedNodes.join(", ")}].`
          )
        ],
        changeReference: {
          cycleId: cycle.id,
          size: cycle.size,
          nodes: affectedNodes
        }
      });
    }
  }

  // 2. Detect NEW_UNRESOLVED_REFERENCE
  if (Array.isArray(diff.unresolvedReferenceChanges?.added) && diff.unresolvedReferenceChanges.added.length > 0) {
    for (const ref of diff.unresolvedReferenceChanges.added) {
      const affectedNodes = [ref.source];
      regressions.push({
        id: `regression-unresolved-${ref.id}`,
        type: REGRESSION_TYPES.NEW_UNRESOLVED_REFERENCE,
        severity: REGRESSION_SEVERITIES.HIGH,
        message: `Unresolved reference introduced from '${ref.source}' to '${ref.targetType}:${ref.targetName}'`,
        affectedNodes,
        evidence: [
          createEvidence(
            "new-unresolved-reference",
            `Component '${ref.source}' references unresolved target '${ref.targetType}:${ref.targetName}' in file '${ref.file || "unknown"}'.`
          )
        ],
        changeReference: { ...ref }
      });
    }
  }

  // 3. Detect NEW_HIGH_RISK
  // Check changed nodes that transitioned risk to HIGH
  for (const cNode of diff.changedNodes) {
    const riskChange = cNode.changes?.find(c => c.property === "risk");
    if (riskChange && String(riskChange.after).toUpperCase() === "HIGH" && String(riskChange.before).toUpperCase() !== "HIGH") {
      regressions.push({
        id: `regression-high-risk-${cNode.id}`,
        type: REGRESSION_TYPES.NEW_HIGH_RISK,
        severity: REGRESSION_SEVERITIES.HIGH,
        message: `Component '${cNode.id}' risk level increased from ${riskChange.before} to HIGH`,
        affectedNodes: [cNode.id],
        evidence: [
          createEvidence(
            "risk-level-increased",
            `Component '${cNode.id}' risk level escalated from '${riskChange.before}' to 'HIGH'.`
          )
        ],
        changeReference: {
          nodeId: cNode.id,
          property: "risk",
          before: riskChange.before,
          after: riskChange.after
        }
      });
    }
  }

  // Check newly added nodes that are HIGH risk
  for (const aNode of diff.addedNodes) {
    const isHighRisk = String(aNode.risk || "").toUpperCase() === "HIGH";
    if (isHighRisk) {
      regressions.push({
        id: `regression-added-high-risk-${aNode.id}`,
        type: REGRESSION_TYPES.NEW_HIGH_RISK,
        severity: REGRESSION_SEVERITIES.HIGH,
        message: `New high-risk component '${aNode.id}' added to architecture`,
        affectedNodes: [aNode.id],
        evidence: [
          createEvidence(
            "added-high-risk-component",
            `Newly introduced component '${aNode.id}' is classified as HIGH risk.`
          )
        ],
        changeReference: {
          nodeId: aNode.id,
          risk: "HIGH"
        }
      });
    }
  }

  // 4. Detect COUPLING_INCREASED
  for (const cNode of diff.changedNodes) {
    const couplingChange = cNode.changes?.find(c => c.property === "coupling");
    if (couplingChange && Number(couplingChange.after) > Number(couplingChange.before)) {
      const delta = Number(couplingChange.after) - Number(couplingChange.before);
      regressions.push({
        id: `regression-coupling-increased-${cNode.id}`,
        type: REGRESSION_TYPES.COUPLING_INCREASED,
        severity: delta >= 5 ? REGRESSION_SEVERITIES.HIGH : REGRESSION_SEVERITIES.MEDIUM,
        message: `Component '${cNode.id}' coupling increased by +${delta} (from ${couplingChange.before} to ${couplingChange.after})`,
        affectedNodes: [cNode.id],
        evidence: [
          createEvidence(
            "coupling-metric-increased",
            `Total coupling metric for '${cNode.id}' increased from ${couplingChange.before} to ${couplingChange.after} (+${delta}).`
          )
        ],
        changeReference: {
          nodeId: cNode.id,
          property: "coupling",
          before: couplingChange.before,
          after: couplingChange.after,
          delta
        }
      });
    }
  }

  // 5. Detect HEALTH_DECREASED
  // Check repository overall health degradation
  const beforeHealthLevel = before?.architectureHealth?.overallHealth || before?.health?.overallHealth || "UNKNOWN";
  const afterHealthLevel = after?.architectureHealth?.overallHealth || after?.health?.overallHealth || "UNKNOWN";

  if (beforeHealthLevel !== "UNKNOWN" && afterHealthLevel !== "UNKNOWN") {
    const beforeRank = getHealthRank(beforeHealthLevel);
    const afterRank = getHealthRank(afterHealthLevel);

    if (afterRank < beforeRank) {
      regressions.push({
        id: "regression-overall-health-decreased",
        type: REGRESSION_TYPES.HEALTH_DECREASED,
        severity: afterHealthLevel === "HIGH_RISK" ? REGRESSION_SEVERITIES.CRITICAL : REGRESSION_SEVERITIES.HIGH,
        message: `Overall repository architecture health degraded from ${beforeHealthLevel} to ${afterHealthLevel}`,
        affectedNodes: diff.changedNodes.map(n => n.id).sort(),
        evidence: [
          createEvidence(
            "overall-health-degraded",
            `Repository architectural health level degraded from '${beforeHealthLevel}' to '${afterHealthLevel}'.`
          )
        ],
        changeReference: {
          beforeHealthLevel,
          afterHealthLevel
        }
      });
    }
  }

  // Check component health level changes
  for (const cNode of diff.changedNodes) {
    const healthChange = cNode.changes?.find(c => c.property === "architectureHealth" || c.property === "healthLevel");
    if (healthChange) {
      const bRank = getHealthRank(healthChange.before);
      const aRank = getHealthRank(healthChange.after);

      if (aRank < bRank) {
        regressions.push({
          id: `regression-component-health-decreased-${cNode.id}`,
          type: REGRESSION_TYPES.HEALTH_DECREASED,
          severity: REGRESSION_SEVERITIES.HIGH,
          message: `Component '${cNode.id}' architecture health level degraded from ${healthChange.before} to ${healthChange.after}`,
          affectedNodes: [cNode.id],
          evidence: [
            createEvidence(
              "component-health-degraded",
              `Architecture health level for component '${cNode.id}' degraded from '${healthChange.before}' to '${healthChange.after}'.`
            )
          ],
          changeReference: {
            nodeId: cNode.id,
            beforeHealthLevel: healthChange.before,
            afterHealthLevel: healthChange.after
          }
        });
      }
    }
  }

  // 6. Detect NEW_DEPENDENCY
  if (Array.isArray(diff.addedEdges) && diff.addedEdges.length > 0) {
    for (const edge of diff.addedEdges) {
      const affectedNodes = [edge.source, edge.target].sort();
      regressions.push({
        id: `regression-new-dependency-${edge.id}`,
        type: REGRESSION_TYPES.NEW_DEPENDENCY,
        severity: REGRESSION_SEVERITIES.LOW,
        message: `New dependency edge introduced: '${edge.source}' ➔ '${edge.target}' (${edge.relationshipType})`,
        affectedNodes,
        evidence: [
          createEvidence(
            "new-dependency-edge",
            `New dependency relationship introduced from '${edge.source}' to '${edge.target}' (type: ${edge.relationshipType}, method: ${edge.method || "none"}).`
          )
        ],
        changeReference: { ...edge }
      });
    }
  }

  // Pre-sort all findings deterministically by ID
  regressions.sort((a, b) => a.id.localeCompare(b.id));

  // Compute summary statistics
  const summaryByType = {
    [REGRESSION_TYPES.NEW_CYCLE]: 0,
    [REGRESSION_TYPES.NEW_UNRESOLVED_REFERENCE]: 0,
    [REGRESSION_TYPES.NEW_HIGH_RISK]: 0,
    [REGRESSION_TYPES.COUPLING_INCREASED]: 0,
    [REGRESSION_TYPES.HEALTH_DECREASED]: 0,
    [REGRESSION_TYPES.NEW_DEPENDENCY]: 0
  };

  const summaryBySeverity = {
    [REGRESSION_SEVERITIES.CRITICAL]: 0,
    [REGRESSION_SEVERITIES.HIGH]: 0,
    [REGRESSION_SEVERITIES.MEDIUM]: 0,
    [REGRESSION_SEVERITIES.LOW]: 0
  };

  for (const r of regressions) {
    if (summaryByType[r.type] !== undefined) summaryByType[r.type]++;
    if (summaryBySeverity[r.severity] !== undefined) summaryBySeverity[r.severity]++;
  }

  const hasRegressions = regressions.length > 0;

  return {
    hasRegressions,
    summary: {
      totalRegressionsCount: regressions.length,
      byType: summaryByType,
      bySeverity: summaryBySeverity
    },
    regressions,
    diffSummary: diff.summary
  };
}

module.exports = {
  REGRESSION_TYPES,
  REGRESSION_SEVERITIES,
  detectArchitectureRegressions
};
