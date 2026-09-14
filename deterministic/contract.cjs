/**
 * Deterministic Architecture Intelligence Contract (BASE-ARCH-1)
 *
 * Provides standard structures, confidence vocabulary, evidence formatting,
 * result validation, and authority enforcement helpers for deterministic
 * architectural capabilities.
 *
 * Strict boundary rules:
 *   - 0 LLM runtime dependencies or calls.
 *   - 100% deterministic rules, metadata, AST, and graph evidence.
 *   - Deterministic facts remain authoritative over semantic LLM claims.
 */

"use strict";

const CONFIDENCE_LEVELS = Object.freeze(["high", "medium", "low", "unknown"]);

const CONFIDENCE_DESCRIPTIONS = Object.freeze({
  high: "Strong deterministic evidence exists (explicit type, explicit annotation, multiple independent rules, authoritative metadata).",
  medium: "Meaningful deterministic evidence exists, but is less direct (naming convention, directory convention, single structural rule).",
  low: "Only weak heuristic evidence exists.",
  unknown: "Insufficient evidence exists to establish a classification."
});

/**
 * Validates whether a value is a valid confidence level.
 */
function validateConfidence(confidence) {
  if (typeof confidence !== "string") return false;
  return CONFIDENCE_LEVELS.includes(confidence.toLowerCase().trim());
}

/**
 * Creates a standardized evidence item.
 * Preferred shape: { rule: "rule-name", detail: "human-readable explanation" }
 */
function createEvidence(rule, detail, extra = {}) {
  const ruleStr = String(rule || "unknown-rule").trim();
  const detailStr = String(detail || "").trim();

  return {
    rule: ruleStr,
    detail: detailStr,
    ...extra
  };
}

/**
 * Validates that an evidence item matches the standard evidence contract.
 */
function validateEvidence(evidenceItem) {
  if (!evidenceItem || typeof evidenceItem !== "object") return false;
  return (
    typeof evidenceItem.rule === "string" &&
    evidenceItem.rule.trim().length > 0 &&
    typeof evidenceItem.detail === "string"
  );
}

/**
 * Creates a standardized deterministic intelligence result.
 *
 * Conceptual shape:
 * {
 *   value: "...",
 *   confidence: "high" | "medium" | "low" | "unknown",
 *   evidence: [ { rule: "...", detail: "..." } ],
 *   secondary: [ ... ] (optional)
 * }
 */
function createDeterministicResult({
  value = "unknown",
  primary = null,
  confidence = "unknown",
  evidence = [],
  secondary = [],
  metadata = null
}) {
  const normConfidence = String(confidence || "unknown").toLowerCase().trim();
  if (!CONFIDENCE_LEVELS.includes(normConfidence)) {
    throw new Error(
      `Invalid confidence level '${confidence}'. Must be one of: ${CONFIDENCE_LEVELS.join(", ")}`
    );
  }

  const rawValue = primary !== null ? primary : value;
  const resultValue = String(rawValue || "unknown").trim();

  const rawEvidence = Array.isArray(evidence) ? evidence : [];
  const normalizedEvidence = rawEvidence.map(item => {
    if (typeof item === "string") {
      return createEvidence("heuristic", item);
    }
    if (item && typeof item === "object") {
      return createEvidence(item.rule, item.detail, { ...item });
    }
    return createEvidence("unknown", String(item));
  });

  const rawSecondary = Array.isArray(secondary) ? secondary : [];
  const normalizedSecondary = [...new Set(rawSecondary.map(s => String(s).trim()))];

  const result = {
    value: resultValue,
    primary: resultValue,
    confidence: normConfidence,
    evidence: normalizedEvidence,
    secondary: normalizedSecondary
  };

  if (metadata && typeof metadata === "object") {
    result.metadata = metadata;
  }

  return result;
}

/**
 * Validates that a result complies with the deterministic intelligence contract.
 */
function validateDeterministicResult(result) {
  if (!result || typeof result !== "object") return false;
  const val = result.value ?? result.primary;
  if (typeof val !== "string" || !val) return false;
  if (!validateConfidence(result.confidence)) return false;
  if (!Array.isArray(result.evidence)) return false;
  return result.evidence.every(validateEvidence);
}

/**
 * Authority rule: Deterministic facts are authoritative and must not be
 * silently overwritten by LLM/semantic claims or observations.
 *
 * Semantic observations may be preserved alongside deterministic facts.
 */
function enforceDeterministicAuthority(deterministicFact, semanticObservation) {
  if (deterministicFact === undefined || deterministicFact === null) {
    return {
      authoritativeValue: semanticObservation,
      source: "semantic",
      contradiction: false
    };
  }

  if (semanticObservation === undefined || semanticObservation === null) {
    return {
      authoritativeValue: deterministicFact,
      source: "deterministic",
      contradiction: false
    };
  }

  const detStr = String(deterministicFact).toLowerCase().trim();
  const semStr = String(semanticObservation).toLowerCase().trim();

  const matches = detStr === semStr || semStr === "unspecified";

  return {
    authoritativeValue: deterministicFact,
    deterministicFact,
    semanticObservation,
    source: "deterministic",
    contradiction: !matches,
    message: matches
      ? "Semantic observation aligns with deterministic fact."
      : `Semantic observation '${semanticObservation}' contradicts deterministic fact '${deterministicFact}'. Deterministic fact retained.`
  };
}

module.exports = {
  CONFIDENCE_LEVELS,
  CONFIDENCE_DESCRIPTIONS,
  validateConfidence,
  createEvidence,
  validateEvidence,
  createDeterministicResult,
  validateDeterministicResult,
  enforceDeterministicAuthority
};
