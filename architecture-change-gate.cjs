/**
 * Deterministic Architecture Change Gate Engine (WAVE-E2)
 *
 * Determines whether a detected architectural change requires deeper semantic
 * investigation (LLM) or if deterministic analysis is sufficient.
 *
 * Strict boundary rules:
 *   - 0 LLM runtime dependencies or calls.
 *   - 100% deterministic, explainable, and repeatable.
 *   - MUST NOT confuse architectural risk with semantic uncertainty.
 *     High-risk changes with complete deterministic evidence do NOT require LLM.
 *     Low-risk changes with genuine semantic ambiguity DO require LLM.
 *   - Integrates cleanly with existing investigation gating (P4 flow).
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult,
  enforceDeterministicAuthority
} = require("./deterministic/contract.cjs");

const GATE_DECISIONS = Object.freeze([
  "NO_ANALYSIS_REQUIRED",
  "DETERMINISTIC_ANALYSIS_SUFFICIENT",
  "REVIEW_REQUIRED",
  "SEMANTIC_INVESTIGATION_REQUIRED",
  "BLOCKED",
  "UNKNOWN"
]);

/**
 * Evaluates an architectural change context to determine if deeper semantic
 * investigation is required or if deterministic analysis is sufficient.
 *
 * @param {Object} changeContext Architecture change context object
 * @param {Object} [options] Additional configuration options
 * @returns {Object} Deterministic intelligence change gate result
 */
function evaluateArchitectureChangeGate(changeContext = null, options = {}) {
  // 1. UNKNOWN / Missing Context Check
  if (!changeContext || typeof changeContext !== "object") {
    const result = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [createEvidence("missing-change-context", "Architecture change context is missing or null.")],
      metadata: buildGateMetadata({
        decision: "UNKNOWN",
        deterministicSufficient: false,
        semanticInvestigationRequired: false,
        reasons: ["Architecture change context is missing or null."],
        evidence: [createEvidence("missing-change-context", "Architecture change context is missing or null.")],
        unresolvedQuestions: [],
        blockers: ["Missing change context."],
        confidence: "unknown",
        analysisAvoided: false,
        semanticInvestigationSkipped: false,
        deterministicOnlyResolution: false,
        llmCallsAvoided: 0
      })
    });
    result.changeGate = result.metadata;
    return result;
  }

  if (changeContext.unknownEvidence === true || changeContext.evidenceState === "UNKNOWN") {
    const evidenceList = [createEvidence("unknown-evidence-signal", "Incomplete or unknown evidence supplied in change context.")];
    const result = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: evidenceList,
      metadata: buildGateMetadata({
        decision: "UNKNOWN",
        deterministicSufficient: false,
        semanticInvestigationRequired: false,
        reasons: ["Incomplete or unknown evidence supplied in change context."],
        evidence: evidenceList,
        unresolvedQuestions: Array.isArray(changeContext.unresolvedQuestions) ? changeContext.unresolvedQuestions : [],
        blockers: [],
        confidence: "unknown",
        analysisAvoided: false,
        semanticInvestigationSkipped: false,
        deterministicOnlyResolution: false,
        llmCallsAvoided: 0
      })
    });
    result.changeGate = result.metadata;
    return result;
  }

  // Handle deterministic authority override check if semantic observation is present
  if (changeContext.semanticClaim && changeContext.deterministicFact) {
    const authCheck = enforceDeterministicAuthority(
      changeContext.deterministicFact,
      changeContext.semanticClaim
    );
    if (authCheck.contradiction) {
      changeContext.contradictorySignals = true;
      changeContext.contradictionMessage = authCheck.message;
    }
  }

  const reasons = [];
  const evidence = [];
  const unresolvedQuestions = [];
  const blockers = [];

  // Extract change signal / diff
  const diff = changeContext.diff || changeContext.architectureDiff || changeContext.changeSimulation || null;
  const hasDiffChanges = diff ? Boolean(diff.hasChanges ?? (Array.isArray(diff.changes) && diff.changes.length > 0)) : null;
  const operations = Array.isArray(changeContext.operations)
    ? changeContext.operations
    : Array.isArray(diff?.operations)
      ? diff.operations
      : [];
  const affectedComponents = Array.isArray(changeContext.affectedComponents)
    ? changeContext.affectedComponents
    : Array.isArray(diff?.affectedComponents)
      ? diff.affectedComponents
      : changeContext.component ? [changeContext.component] : [];

  const hasExplicitChange = changeContext.hasChange !== undefined
    ? Boolean(changeContext.hasChange)
    : hasDiffChanges !== null
      ? hasDiffChanges
      : operations.length > 0 || affectedComponents.length > 0;

  // 2. NO ARCHITECTURE CHANGE / HARMLESS CHECK
  if (!hasExplicitChange && affectedComponents.length === 0) {
    const ev = createEvidence("no-architecture-change", "No architectural change or affected components detected.");
    evidence.push(ev);
    reasons.push("No relevant architecture change exists.");

    const gateMeta = buildGateMetadata({
      decision: "NO_ANALYSIS_REQUIRED",
      deterministicSufficient: true,
      semanticInvestigationRequired: false,
      reasons,
      evidence,
      unresolvedQuestions: [],
      blockers: [],
      confidence: "high",
      analysisAvoided: true,
      semanticInvestigationSkipped: true,
      deterministicOnlyResolution: true,
      llmCallsAvoided: 1
    });

    const result = createDeterministicResult({
      value: "NO_ANALYSIS_REQUIRED",
      primary: "NO_ANALYSIS_REQUIRED",
      confidence: "high",
      evidence,
      metadata: gateMeta
    });
    result.changeGate = gateMeta;
    return result;
  }

  // Extract Capability Signals
  const safetyEnvelope = changeContext.safetyEnvelope || null;
  const qualityGates = changeContext.qualityGates || null;
  const governance = changeContext.governance || null;
  const duplicateResponsibility = changeContext.duplicateResponsibility || null;
  const decisionContext = changeContext.decisionContext || null;

  // 3. SAFETY BLOCKERS & QUALITY GATE FAILURES & GOVERNANCE VIOLATIONS
  const isSafetyBlocked = safetyEnvelope?.value === "BLOCKED" || safetyEnvelope?.classification === "BLOCKED";
  if (isSafetyBlocked) {
    const msg = `Safety envelope is BLOCKED: ${safetyEnvelope?.reasons?.join("; ") || "Hard structural safety threshold violated."}`;
    blockers.push(msg);
    evidence.push(createEvidence("safety-envelope-blocked", msg));
  }

  const isQualityGateFailed = qualityGates?.value === "FAIL" || qualityGates?.overallResult === "FAIL";
  if (isQualityGateFailed) {
    const msg = `Quality gates evaluation status: FAIL. Critical architectural rules failed.`;
    blockers.push(msg);
    evidence.push(createEvidence("quality-gate-failed", msg));
  }

  const isGovernanceViolation = governance?.value === "VIOLATION" || governance?.hasViolation === true;
  if (isGovernanceViolation) {
    const msg = `Governance rule violation detected: ${governance?.violationReason || "Policy constraint violated."}`;
    blockers.push(msg);
    evidence.push(createEvidence("governance-violation", msg));
  }

  // 4. SEMANTIC UNCERTAINTY DETECTION
  // Check for ambiguous responsibility, unresolved references, contradictory signals, dynamic string execution
  let hasSemanticUncertainty = false;

  // Signal A: Ambiguous Duplicate Responsibility
  if (
    duplicateResponsibility?.classification === "POSSIBLE_OVERLAP" ||
    duplicateResponsibility?.classification === "STRONG_OVERLAP" ||
    duplicateResponsibility?.value === "POSSIBLE_OVERLAP" ||
    duplicateResponsibility?.value === "STRONG_OVERLAP"
  ) {
    // If responsibility overlap exists and requires domain/business disambiguation
    if (duplicateResponsibility.requiresDomainDisambiguation !== false) {
      hasSemanticUncertainty = true;
      const q = `Duplicate architectural responsibility detected between '${affectedComponents.join(", ")}' and candidate components. Requires semantic domain disambiguation.`;
      unresolvedQuestions.push(q);
      evidence.push(createEvidence("ambiguous-duplicate-responsibility", q));
    }
  }

  // Signal B: Unresolved References / Dynamic Apex / Dynamic SOQL / Semantic Gap
  if (
    changeContext.hasDynamicApex === true ||
    changeContext.hasDynamicSoql === true ||
    changeContext.unresolvedDynamicReferences === true ||
    changeContext.hasSemanticGap === true ||
    (Array.isArray(changeContext.unresolvedReferences) && changeContext.unresolvedReferences.length > 0)
  ) {
    hasSemanticUncertainty = true;
    const refDetails = Array.isArray(changeContext.unresolvedReferences)
      ? changeContext.unresolvedReferences.join(", ")
      : "Dynamic execution string or unparsed method call";
    const q = `Unresolved dynamic reference or semantic gap identified (${refDetails}). Cannot be structurally determined by AST.`;
    unresolvedQuestions.push(q);
    evidence.push(createEvidence("unresolved-semantic-reference", q));
  }

  // Signal C: Contradictory Deterministic vs Semantic Signals
  if (changeContext.contradictorySignals === true) {
    hasSemanticUncertainty = true;
    const q = `Contradictory deterministic vs semantic signals detected: ${changeContext.contradictionMessage || "Deterministic fact and LLM claim conflict."}`;
    unresolvedQuestions.push(q);
    evidence.push(createEvidence("contradictory-signals", q));
  }

  // Signal D: Explicit Unresolved Semantic Questions in Decision Context
  if (Array.isArray(changeContext.unresolvedQuestions) && changeContext.unresolvedQuestions.length > 0) {
    hasSemanticUncertainty = true;
    for (const uq of changeContext.unresolvedQuestions) {
      if (!unresolvedQuestions.includes(uq)) {
        unresolvedQuestions.push(uq);
        evidence.push(createEvidence("explicit-unresolved-question", String(uq)));
      }
    }
  }

  if (Array.isArray(decisionContext?.unresolvedQuestions) && decisionContext.unresolvedQuestions.length > 0) {
    hasSemanticUncertainty = true;
    for (const uq of decisionContext.unresolvedQuestions) {
      if (!unresolvedQuestions.includes(uq)) {
        unresolvedQuestions.push(uq);
        evidence.push(createEvidence("decision-context-unresolved-question", String(uq)));
      }
    }
  }

  // 5. DECISION DETERMINATION
  let decision = "DETERMINISTIC_ANALYSIS_SUFFICIENT";
  let confidence = "high";

  if (blockers.length > 0) {
    decision = "BLOCKED";
    reasons.push(...blockers);

    // Critical distinction: Does a safety blocker require semantic investigation or is it deterministically blocked?
    // If the blocker is purely deterministic (e.g. AST security violation) and no semantic questions exist, semantic investigation is NOT required.
    const semRequired = hasSemanticUncertainty;

    const gateMeta = buildGateMetadata({
      decision: "BLOCKED",
      deterministicSufficient: !semRequired,
      semanticInvestigationRequired: semRequired,
      reasons,
      evidence,
      unresolvedQuestions,
      blockers,
      confidence: "high",
      analysisAvoided: !semRequired,
      semanticInvestigationSkipped: !semRequired,
      deterministicOnlyResolution: !semRequired,
      llmCallsAvoided: semRequired ? 0 : 1
    });

    const result = createDeterministicResult({
      value: "BLOCKED",
      primary: "BLOCKED",
      confidence: "high",
      evidence,
      metadata: gateMeta
    });
    result.changeGate = gateMeta;
    return result;
  }

  if (hasSemanticUncertainty) {
    decision = "SEMANTIC_INVESTIGATION_REQUIRED";
    reasons.push("Genuine unresolved semantic questions identified that cannot be answered structurally.");

    const gateMeta = buildGateMetadata({
      decision,
      deterministicSufficient: false,
      semanticInvestigationRequired: true,
      reasons,
      evidence,
      unresolvedQuestions,
      blockers: [],
      confidence: "high",
      analysisAvoided: false,
      semanticInvestigationSkipped: false,
      deterministicOnlyResolution: false,
      llmCallsAvoided: 0
    });

    const result = createDeterministicResult({
      value: decision,
      primary: decision,
      confidence: "high",
      evidence,
      metadata: gateMeta
    });
    result.changeGate = gateMeta;
    return result;
  }

  // NO SEMANTIC UNCERTAINTY — Deterministic evidence is sufficient!
  // Check if risk factors exist (high impact, bottleneck, quality gate warning, safety envelope HIGH_RISK)
  const isHighRisk =
    safetyEnvelope?.value === "HIGH_RISK" ||
    safetyEnvelope?.value === "HIGH_CAUTION" ||
    changeContext.isBottleneck === true ||
    changeContext.businessCriticality === "CRITICAL" ||
    qualityGates?.value === "WARN" ||
    changeContext.impactScore > 50;

  if (isHighRisk) {
    decision = "REVIEW_REQUIRED";
    reasons.push("Change carries architectural risk but is fully characterized deterministically. Human architectural review recommended; semantic LLM investigation not required.");
    evidence.push(createEvidence("high-risk-deterministic-change", "High structural risk/impact detected with 100% complete deterministic evidence."));
  } else {
    decision = "DETERMINISTIC_ANALYSIS_SUFFICIENT";
    reasons.push("Change is fully characterized by deterministic evidence. Semantic investigation not required.");
    evidence.push(createEvidence("fully-deterministic-safe-change", "No semantic uncertainty; deterministic analysis complete."));
  }

  const gateMeta = buildGateMetadata({
    decision,
    deterministicSufficient: true,
    semanticInvestigationRequired: false,
    reasons,
    evidence,
    unresolvedQuestions: [],
    blockers: [],
    confidence,
    analysisAvoided: decision === "DETERMINISTIC_ANALYSIS_SUFFICIENT",
    semanticInvestigationSkipped: true,
    deterministicOnlyResolution: true,
    llmCallsAvoided: 1
  });

  const result = createDeterministicResult({
    value: decision,
    primary: decision,
    confidence,
    evidence,
    metadata: gateMeta
  });
  result.changeGate = gateMeta;

  return result;
}

/**
 * Builds standard changeGate metadata payload with required instrumentation fields.
 */
function buildGateMetadata({
  decision,
  deterministicSufficient,
  semanticInvestigationRequired,
  reasons,
  evidence,
  unresolvedQuestions,
  blockers,
  confidence,
  analysisAvoided,
  semanticInvestigationSkipped,
  deterministicOnlyResolution,
  llmCallsAvoided
}) {
  return {
    decision,
    deterministicSufficient: Boolean(deterministicSufficient),
    semanticInvestigationRequired: Boolean(semanticInvestigationRequired),
    reasons: Array.isArray(reasons) ? reasons : [],
    evidence: Array.isArray(evidence) ? evidence : [],
    unresolvedQuestions: Array.isArray(unresolvedQuestions) ? unresolvedQuestions : [],
    blockers: Array.isArray(blockers) ? blockers : [],
    confidence: String(confidence || "high"),

    // Instrumentation-friendly measurement fields (Section 8)
    analysisAvoided: Boolean(analysisAvoided),
    semanticInvestigationSkipped: Boolean(semanticInvestigationSkipped),
    deterministicOnlyResolution: Boolean(deterministicOnlyResolution),
    llmCallsAvoided: Number(llmCallsAvoided || 0)
  };
}

module.exports = {
  GATE_DECISIONS,
  evaluateArchitectureChangeGate,
  buildGateMetadata
};
