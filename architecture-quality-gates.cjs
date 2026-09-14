/**
 * Deterministic Architecture Quality Gates Engine (WAVE-D2)
 *
 * Evaluates repository and component architectural state against explicit rules
 * using pre-computed deterministic facts from Wave A/B/C capabilities.
 *
 * Strict boundary rules:
 *   - 0 LLM runtime dependencies or calls.
 *   - 100% deterministic, explainable, and repeatable.
 *   - MUST NOT duplicate detection engines; consumes existing capabilities
 *     (Smells, Debt, Health, Safety Envelope, Bottlenecks, Security, Test Gap, etc.).
 *   - Preserves UNKNOWN when critical evidence is missing and reports rule-level evidence.
 *   - Aggregates overall gate result (PASS, WARN, FAIL, UNKNOWN) without hiding individual rule failures.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult,
  enforceDeterministicAuthority
} = require("./deterministic/contract.cjs");

const GATE_RESULTS = Object.freeze(["PASS", "WARN", "FAIL", "UNKNOWN"]);

const GATE_SEVERITIES = Object.freeze(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

const SEVERITY_RANK = Object.freeze({
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
});

/**
 * Centralized quality gate rule definitions and default configuration.
 */
const DEFAULT_QUALITY_GATE_CONFIG = Object.freeze({
  rules: {
    "RULE-EXCESSIVE-COUPLING": {
      enabled: true,
      ruleId: "RULE-EXCESSIVE-COUPLING",
      name: "Excessive Component Coupling",
      description: "Detects components with severe total coupling or god-component characteristics that violate structural safety thresholds.",
      severity: "CRITICAL",
      thresholdCoupling: 15
    },
    "RULE-EXCESSIVE-BREADTH": {
      enabled: true,
      ruleId: "RULE-EXCESSIVE-BREADTH",
      name: "Excessive Dependency Breadth",
      description: "Detects structural dependency hub components with fan-in or fan-out exceeding threshold.",
      severity: "HIGH",
      thresholdFanIn: 12,
      thresholdFanOut: 12
    },
    "RULE-CIRCULAR-DEPENDENCIES": {
      enabled: true,
      ruleId: "RULE-CIRCULAR-DEPENDENCIES",
      name: "Circular Dependency Loops",
      description: "Detects participation in circular dependency loops across architecture components.",
      severity: "HIGH",
      maxAllowedCycles: 0
    },
    "RULE-ARCHITECTURAL-BOTTLENECK": {
      enabled: true,
      ruleId: "RULE-ARCHITECTURAL-BOTTLENECK",
      name: "Architectural Bottlenecks",
      description: "Detects central flow bottleneck components that concentrate graph dependencies and change risk.",
      severity: "HIGH"
    },
    "RULE-MISSING-TEST-PROTECTION": {
      enabled: true,
      ruleId: "RULE-MISSING-TEST-PROTECTION",
      name: "Missing Test Protection on Critical Paths",
      description: "Detects structurally critical or business-critical components that lack adequate test protection.",
      severity: "CRITICAL"
    },
    "RULE-UNSAFE-EXTERNAL-BOUNDARY": {
      enabled: true,
      ruleId: "RULE-UNSAFE-EXTERNAL-BOUNDARY",
      name: "Unsafe External Boundaries",
      description: "Detects unisolated or concentrated external boundary integration points.",
      severity: "HIGH"
    },
    "RULE-SECURITY-BOUNDARY-VIOLATION": {
      enabled: true,
      ruleId: "RULE-SECURITY-BOUNDARY-VIOLATION",
      name: "Security Boundary Violations",
      description: "Detects security boundary risks such as 'without sharing' declarations on entry or persistence paths.",
      severity: "CRITICAL"
    },
    "RULE-SEVERE-ARCHITECTURE-DEBT": {
      enabled: true,
      ruleId: "RULE-SEVERE-ARCHITECTURE-DEBT",
      name: "Severe Architecture Debt Accumulation",
      description: "Detects critical or high-severity architecture debt items accumulating across components.",
      severity: "CRITICAL"
    },
    "RULE-UNSAFE-CHANGE-IMPACT": {
      enabled: true,
      ruleId: "RULE-UNSAFE-CHANGE-IMPACT",
      name: "Unsafe Change Impact & Blast Radius",
      description: "Detects components whose modification produces unsafe change propagation or BLOCKED safety envelopes.",
      severity: "HIGH"
    },
    "RULE-INVALID-ROLE-LAYER-RELATIONSHIPS": {
      enabled: true,
      ruleId: "RULE-INVALID-ROLE-LAYER-RELATIONSHIPS",
      name: "Invalid Role / Layer Relationships",
      description: "Detects illegal cross-layer dependencies or mixed control/persistence responsibilities.",
      severity: "CRITICAL"
    },
    "RULE-DOMAIN-INCONSISTENCIES": {
      enabled: true,
      ruleId: "RULE-DOMAIN-INCONSISTENCIES",
      name: "Domain Architectural Ambiguity & Inconsistencies",
      description: "Detects ambiguous static references or domain boundary conflicts in component flows.",
      severity: "MEDIUM"
    }
  }
});

/**
 * Sorts evidence items deterministically by severity rank (descending) then rule ID.
 */
function sortEvidenceBySeverity(evidenceList) {
  return [...evidenceList].sort((a, b) => {
    const sevA = SEVERITY_RANK[a.severity || "LOW"] || 1;
    const sevB = SEVERITY_RANK[b.severity || "LOW"] || 1;
    if (sevB !== sevA) return sevB - sevA;
    return String(a.rule || "").localeCompare(String(b.rule || ""));
  });
}

/**
 * Evaluates component-level architecture quality gates using pre-computed facts.
 */
function evaluateComponentQualityGates(symbol, graph = null, metric = null, options = {}) {
  if (!symbol) {
    const res = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      metadata: {
        componentId: null,
        componentName: null,
        overallResult: "UNKNOWN",
        confidence: "unknown",
        ruleResults: [],
        failures: [],
        warnings: [],
        unknownChecks: ["Missing or null symbol."],
        evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")]
      }
    });
    res.overallResult = "UNKNOWN";
    res.ruleResults = [];
    res.failures = [];
    res.warnings = [];
    res.unknownChecks = ["Missing or null symbol."];
    return res;
  }

  const symbolId = symbol.id || `ApexClass:${symbol.name}`;
  const symbolName = String(symbol.name || symbol.parsed?.name || symbolId).trim();

  const config = options.config || DEFAULT_QUALITY_GATE_CONFIG;
  const rulesConfig = config.rules || DEFAULT_QUALITY_GATE_CONFIG.rules;

  // Consumed pre-computed capabilities (Zero duplication)
  const smellInfo = options.smellInfo || options.smells || null;
  const debtInfo = options.debtInfo || options.architectureDebt || null;
  const bottleneckInfo = options.bottleneckInfo || options.bottleneck || null;
  const securityInfo = options.securityInfo || options.securityBoundaries || null;
  const testGapInfo = options.testGapInfo || options.testGap || null;
  const externalBoundaryInfo = options.externalBoundaryInfo || options.externalBoundary || null;
  const safetyEnvelopeInfo = options.safetyEnvelopeInfo || options.safetyEnvelope || null;
  const layerInfo = options.layerInfo || options.layer || null;
  const domainInfo = options.domainInfo || options.domain || null;

  const ruleResults = [];
  const failures = [];
  const warnings = [];
  const unknownChecks = [];
  const accumulatedEvidence = [];

  const smells = smellInfo?.smells || smellInfo?.metadata?.smells || [];
  const debtItems = debtInfo?.debtItems || debtInfo?.metadata?.debtItems || [];
  const fanIn = metric?.fanIn ?? 0;
  const fanOut = metric?.fanOut ?? 0;
  const coupling = metric?.coupling ?? (fanIn + fanOut);

  // Helper to register rule evaluation result
  function recordRuleEvaluation({ ruleId, result, severity, affectedComponents, evidenceItems, confidence = "high" }) {
    const ruleDef = rulesConfig[ruleId] || {};
    const evalResult = {
      ruleId,
      name: ruleDef.name || ruleId,
      description: ruleDef.description || "",
      severity: severity || ruleDef.severity || "HIGH",
      result, // PASS, WARN, FAIL, UNKNOWN
      confidence,
      affectedComponents: affectedComponents || [symbolName],
      evidence: evidenceItems || []
    };

    ruleResults.push(evalResult);

    for (const ev of evidenceItems) {
      accumulatedEvidence.push({
        ...ev,
        severity: evalResult.severity,
        ruleId
      });
    }

    if (result === "FAIL") {
      failures.push(evalResult);
    } else if (result === "WARN") {
      warnings.push(evalResult);
    } else if (result === "UNKNOWN") {
      unknownChecks.push(ruleDef.name || ruleId);
    }
  }

  // 1. RULE-EXCESSIVE-COUPLING
  if (rulesConfig["RULE-EXCESSIVE-COUPLING"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-EXCESSIVE-COUPLING"];
    const threshold = rConfig.thresholdCoupling || 15;
    const hasGodSmell = smells.some(s => s.smell === "god-component" || s.smell === "high-coupling");
    const hasCouplingDebt = debtItems.some(d => d.debtCategory === "excessive-coupling");

    if (coupling >= threshold || hasGodSmell) {
      const isCritical = coupling >= 20 || smells.some(s => s.smell === "god-component");
      recordRuleEvaluation({
        ruleId: "RULE-EXCESSIVE-COUPLING",
        result: isCritical ? "FAIL" : "WARN",
        severity: rConfig.severity || "CRITICAL",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "excessive-coupling-violation",
            `Component '${symbolName}' total coupling is ${coupling} (threshold: ${threshold}), violating coupling gate.`
          )
        ]
      });
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-EXCESSIVE-COUPLING",
        result: "PASS",
        severity: rConfig.severity || "CRITICAL",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("excessive-coupling-pass", `Component '${symbolName}' coupling ${coupling} is within safe gate threshold.`)
        ]
      });
    }
  }

  // 2. RULE-EXCESSIVE-BREADTH
  if (rulesConfig["RULE-EXCESSIVE-BREADTH"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-EXCESSIVE-BREADTH"];
    const threshIn = rConfig.thresholdFanIn || 12;
    const threshOut = rConfig.thresholdFanOut || 12;
    const hasHubSmell = smells.some(s => s.smell === "hub-component");

    if (fanIn >= threshIn || fanOut >= threshOut || hasHubSmell) {
      recordRuleEvaluation({
        ruleId: "RULE-EXCESSIVE-BREADTH",
        result: "FAIL",
        severity: rConfig.severity || "HIGH",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "excessive-breadth-violation",
            `Component '${symbolName}' fan-in is ${fanIn} (thresh: ${threshIn}), fan-out is ${fanOut} (thresh: ${threshOut}).`
          )
        ]
      });
    } else if (fanIn >= 8 || fanOut >= 8) {
      recordRuleEvaluation({
        ruleId: "RULE-EXCESSIVE-BREADTH",
        result: "WARN",
        severity: rConfig.severity || "HIGH",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "elevated-breadth-warning",
            `Component '${symbolName}' has elevated fan-in (${fanIn}) or fan-out (${fanOut}).`
          )
        ]
      });
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-EXCESSIVE-BREADTH",
        result: "PASS",
        severity: rConfig.severity || "HIGH",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("excessive-breadth-pass", `Component '${symbolName}' dependency breadth is within safe gate thresholds.`)
        ]
      });
    }
  }

  // 3. RULE-CIRCULAR-DEPENDENCIES
  if (rulesConfig["RULE-CIRCULAR-DEPENDENCIES"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-CIRCULAR-DEPENDENCIES"];
    const activeCycles = (options.cycles || []).filter(c => Array.isArray(c) && c.includes(symbolId));
    const hasCycleSmell = smells.some(s => s.smell === "circular-dependency");

    if (activeCycles.length > 0 || hasCycleSmell) {
      recordRuleEvaluation({
        ruleId: "RULE-CIRCULAR-DEPENDENCIES",
        result: "FAIL",
        severity: rConfig.severity || "HIGH",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "circular-dependency-violation",
            `Component '${symbolName}' participates in ${Math.max(activeCycles.length, 1)} circular dependency loop(s).`
          )
        ]
      });
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-CIRCULAR-DEPENDENCIES",
        result: "PASS",
        severity: rConfig.severity || "HIGH",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("circular-dependency-pass", `Component '${symbolName}' participates in zero circular dependencies.`)
        ]
      });
    }
  }

  // 4. RULE-ARCHITECTURAL-BOTTLENECK
  if (rulesConfig["RULE-ARCHITECTURAL-BOTTLENECK"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-ARCHITECTURAL-BOTTLENECK"];
    const isBottleneck = Boolean(bottleneckInfo?.isBottleneck);

    if (isBottleneck) {
      recordRuleEvaluation({
        ruleId: "RULE-ARCHITECTURAL-BOTTLENECK",
        result: "WARN",
        severity: rConfig.severity || "HIGH",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "architectural-bottleneck-warning",
            `Component '${symbolName}' is an identified architectural bottleneck (score: ${bottleneckInfo?.score || 0}).`
          )
        ]
      });
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-ARCHITECTURAL-BOTTLENECK",
        result: "PASS",
        severity: rConfig.severity || "HIGH",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("architectural-bottleneck-pass", `Component '${symbolName}' is not an architectural flow bottleneck.`)
        ]
      });
    }
  }

  // 5. RULE-MISSING-TEST-PROTECTION
  if (rulesConfig["RULE-MISSING-TEST-PROTECTION"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-MISSING-TEST-PROTECTION"];
    if (testGapInfo) {
      const hasGap = Boolean(testGapInfo.hasTestGap || testGapInfo.signal === "no-test-evidence" || testGapInfo.signal === "known-coverage-failure");
      const isCritical = Boolean(bottleneckInfo?.isBottleneck || (metric && metric.fanIn >= 8) || symbol.parsed?.isBusinessCritical);

      if (hasGap && isCritical) {
        recordRuleEvaluation({
          ruleId: "RULE-MISSING-TEST-PROTECTION",
          result: "FAIL",
          severity: rConfig.severity || "CRITICAL",
          affectedComponents: [symbolName],
          evidenceItems: [
            createEvidence(
              "missing-test-protection-critical-fail",
              `Critical component '${symbolName}' has test gap status '${testGapInfo.status || testGapInfo.signal}'.`
            )
          ]
        });
      } else if (hasGap) {
        recordRuleEvaluation({
          ruleId: "RULE-MISSING-TEST-PROTECTION",
          result: "WARN",
          severity: rConfig.severity || "CRITICAL",
          affectedComponents: [symbolName],
          evidenceItems: [
            createEvidence(
              "missing-test-protection-warning",
              `Component '${symbolName}' lacks direct test protection (${testGapInfo.status || testGapInfo.signal}).`
            )
          ]
        });
      } else {
        recordRuleEvaluation({
          ruleId: "RULE-MISSING-TEST-PROTECTION",
          result: "PASS",
          severity: rConfig.severity || "CRITICAL",
          affectedComponents: [symbolName],
          evidenceItems: [
            createEvidence("missing-test-protection-pass", `Component '${symbolName}' has verified test protection.`)
          ]
        });
      }
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-MISSING-TEST-PROTECTION",
        result: "UNKNOWN",
        severity: rConfig.severity || "CRITICAL",
        confidence: "unknown",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("missing-test-protection-unknown", `Test gap evidence is missing for component '${symbolName}'.`)
        ]
      });
    }
  }

  // 6. RULE-UNSAFE-EXTERNAL-BOUNDARY
  if (rulesConfig["RULE-UNSAFE-EXTERNAL-BOUNDARY"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-UNSAFE-EXTERNAL-BOUNDARY"];
    if (externalBoundaryInfo) {
      const hasBoundary = Boolean(externalBoundaryInfo.hasExternalBoundary);
      const types = externalBoundaryInfo.boundaryTypes || externalBoundaryInfo.types || [];

      if (hasBoundary && (types.length >= 2 || coupling >= 10)) {
        recordRuleEvaluation({
          ruleId: "RULE-UNSAFE-EXTERNAL-BOUNDARY",
          result: "FAIL",
          severity: rConfig.severity || "HIGH",
          affectedComponents: [symbolName],
          evidenceItems: [
            createEvidence(
              "unsafe-external-boundary-fail",
              `Component '${symbolName}' concentrates multiple external boundaries (${types.join(", ")}) or high coupling.`
            )
          ]
        });
      } else if (hasBoundary) {
        recordRuleEvaluation({
          ruleId: "RULE-UNSAFE-EXTERNAL-BOUNDARY",
          result: "WARN",
          severity: rConfig.severity || "HIGH",
          affectedComponents: [symbolName],
          evidenceItems: [
            createEvidence(
              "unsafe-external-boundary-warn",
              `Component '${symbolName}' exposes an external boundary (${types.join(", ") || "external integration"}).`
            )
          ]
        });
      } else {
        recordRuleEvaluation({
          ruleId: "RULE-UNSAFE-EXTERNAL-BOUNDARY",
          result: "PASS",
          severity: rConfig.severity || "HIGH",
          affectedComponents: [symbolName],
          evidenceItems: [
            createEvidence("unsafe-external-boundary-pass", `Component '${symbolName}' has no unisolated external boundaries.`)
          ]
        });
      }
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-UNSAFE-EXTERNAL-BOUNDARY",
        result: "UNKNOWN",
        severity: rConfig.severity || "HIGH",
        confidence: "unknown",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("unsafe-external-boundary-unknown", `External boundary evidence unavailable for '${symbolName}'.`)
        ]
      });
    }
  }

  // 7. RULE-SECURITY-BOUNDARY-VIOLATION
  if (rulesConfig["RULE-SECURITY-BOUNDARY-VIOLATION"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-SECURITY-BOUNDARY-VIOLATION"];
    const p = symbol.parsed || {};
    const sharingModel = String(p.sharing || securityInfo?.metadata?.sharingModel || "").toLowerCase();
    const isWithoutSharing = sharingModel === "without sharing";
    const hasDbOps = (p.soql && p.soql.length > 0) || (p.dml && p.dml.length > 0);

    if (isWithoutSharing && (coupling >= 10 || hasDbOps)) {
      recordRuleEvaluation({
        ruleId: "RULE-SECURITY-BOUNDARY-VIOLATION",
        result: "FAIL",
        severity: rConfig.severity || "CRITICAL",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "security-boundary-violation-fail",
            `Component '${symbolName}' operates in 'without sharing' mode with persistence operations or high coupling.`
          )
        ]
      });
    } else if (isWithoutSharing) {
      recordRuleEvaluation({
        ruleId: "RULE-SECURITY-BOUNDARY-VIOLATION",
        result: "WARN",
        severity: rConfig.severity || "CRITICAL",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("security-boundary-violation-warn", `Component '${symbolName}' explicitly declares 'without sharing' mode.`)
        ]
      });
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-SECURITY-BOUNDARY-VIOLATION",
        result: "PASS",
        severity: rConfig.severity || "CRITICAL",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("security-boundary-violation-pass", `Component '${symbolName}' complies with security boundary sharing rules.`)
        ]
      });
    }
  }

  // 8. RULE-SEVERE-ARCHITECTURE-DEBT
  if (rulesConfig["RULE-SEVERE-ARCHITECTURE-DEBT"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-SEVERE-ARCHITECTURE-DEBT"];
    const criticalDebt = debtItems.filter(d => d.severity === "critical");
    const highDebt = debtItems.filter(d => d.severity === "high");

    if (criticalDebt.length > 0) {
      recordRuleEvaluation({
        ruleId: "RULE-SEVERE-ARCHITECTURE-DEBT",
        result: "FAIL",
        severity: rConfig.severity || "CRITICAL",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "severe-architecture-debt-fail",
            `Component '${symbolName}' accumulates ${criticalDebt.length} critical architecture debt item(s) (${criticalDebt.map(d => d.debtCategory).join(", ")}).`
          )
        ]
      });
    } else if (highDebt.length > 0) {
      recordRuleEvaluation({
        ruleId: "RULE-SEVERE-ARCHITECTURE-DEBT",
        result: "WARN",
        severity: rConfig.severity || "CRITICAL",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "severe-architecture-debt-warn",
            `Component '${symbolName}' accumulates ${highDebt.length} high-severity architecture debt item(s).`
          )
        ]
      });
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-SEVERE-ARCHITECTURE-DEBT",
        result: "PASS",
        severity: rConfig.severity || "CRITICAL",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("severe-architecture-debt-pass", `Component '${symbolName}' is free of severe architecture debt.`)
        ]
      });
    }
  }

  // 9. RULE-UNSAFE-CHANGE-IMPACT
  if (rulesConfig["RULE-UNSAFE-CHANGE-IMPACT"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-UNSAFE-CHANGE-IMPACT"];
    const safetyClassification = safetyEnvelopeInfo?.safetyClassification || safetyEnvelopeInfo?.value || "UNKNOWN";

    if (safetyClassification === "BLOCKED") {
      recordRuleEvaluation({
        ruleId: "RULE-UNSAFE-CHANGE-IMPACT",
        result: "FAIL",
        severity: rConfig.severity || "HIGH",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "unsafe-change-impact-blocked-fail",
            `Safety envelope for component '${symbolName}' is BLOCKED due to architectural safety blockers.`
          )
        ]
      });
    } else if (safetyClassification === "HIGH_RISK") {
      recordRuleEvaluation({
        ruleId: "RULE-UNSAFE-CHANGE-IMPACT",
        result: "WARN",
        severity: rConfig.severity || "HIGH",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "unsafe-change-impact-high-risk-warn",
            `Safety envelope for component '${symbolName}' is classified as HIGH_RISK.`
          )
        ]
      });
    } else if (safetyClassification === "SAFE" || safetyClassification === "SAFE_WITH_REVIEW") {
      recordRuleEvaluation({
        ruleId: "RULE-UNSAFE-CHANGE-IMPACT",
        result: "PASS",
        severity: rConfig.severity || "HIGH",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("unsafe-change-impact-pass", `Safety envelope for component '${symbolName}' is within acceptable change risk parameters (${safetyClassification}).`)
        ]
      });
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-UNSAFE-CHANGE-IMPACT",
        result: "UNKNOWN",
        severity: rConfig.severity || "HIGH",
        confidence: "unknown",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("unsafe-change-impact-unknown", `Safety envelope evidence unavailable for component '${symbolName}'.`)
        ]
      });
    }
  }

  // 10. RULE-INVALID-ROLE-LAYER-RELATIONSHIPS
  if (rulesConfig["RULE-INVALID-ROLE-LAYER-RELATIONSHIPS"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-INVALID-ROLE-LAYER-RELATIONSHIPS"];
    const hasLayerViolationSmell = smells.some(s => s.smell === "layer-violation" || s.smell === "mixed-responsibility");

    if (hasLayerViolationSmell) {
      recordRuleEvaluation({
        ruleId: "RULE-INVALID-ROLE-LAYER-RELATIONSHIPS",
        result: "FAIL",
        severity: rConfig.severity || "CRITICAL",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence(
            "invalid-role-layer-relationship-fail",
            `Component '${symbolName}' violates structural layer encapsulation or mixes presentation control with data persistence.`
          )
        ]
      });
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-INVALID-ROLE-LAYER-RELATIONSHIPS",
        result: "PASS",
        severity: rConfig.severity || "CRITICAL",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("invalid-role-layer-relationship-pass", `Component '${symbolName}' respects valid role and layer boundary relationships.`)
        ]
      });
    }
  }

  // 11. RULE-DOMAIN-INCONSISTENCIES
  if (rulesConfig["RULE-DOMAIN-INCONSISTENCIES"]?.enabled !== false) {
    const rConfig = rulesConfig["RULE-DOMAIN-INCONSISTENCIES"];
    const domainName = domainInfo?.primary || domainInfo?.domain || "unknown";

    if (domainName === "unknown") {
      recordRuleEvaluation({
        ruleId: "RULE-DOMAIN-INCONSISTENCIES",
        result: "WARN",
        severity: rConfig.severity || "MEDIUM",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("domain-inconsistencies-warn", `Component '${symbolName}' has an unclassified or ambiguous domain mapping.`)
        ]
      });
    } else {
      recordRuleEvaluation({
        ruleId: "RULE-DOMAIN-INCONSISTENCIES",
        result: "PASS",
        severity: rConfig.severity || "MEDIUM",
        affectedComponents: [symbolName],
        evidenceItems: [
          createEvidence("domain-inconsistencies-pass", `Component '${symbolName}' maps cleanly to domain '${domainName}'.`)
        ]
      });
    }
  }

  // DETERMINE OVERALL COMPONENT GATE RESULT
  let overallResult = "PASS";
  if (failures.length > 0) {
    overallResult = "FAIL";
  } else if (warnings.length > 0) {
    overallResult = "WARN";
  } else if (unknownChecks.length > 0 && ruleResults.every(r => r.result === "UNKNOWN" || r.result === "PASS")) {
    overallResult = "UNKNOWN";
  }

  let overallConfidence = "high";
  if (unknownChecks.length >= 3) {
    overallConfidence = "low";
  } else if (unknownChecks.length >= 1) {
    overallConfidence = "medium";
  }

  const sortedEvidence = sortEvidenceBySeverity(accumulatedEvidence);

  const result = createDeterministicResult({
    value: overallResult,
    primary: overallResult,
    confidence: overallConfidence,
    evidence: sortedEvidence,
    secondary: ruleResults.map(r => `${r.ruleId}:${r.result}`),
    metadata: {
      componentId: symbolId,
      componentName: symbolName,
      overallResult,
      confidence: overallConfidence,
      ruleResults,
      failures,
      warnings,
      unknownChecks,
      evidence: sortedEvidence
    }
  });

  result.overallResult = overallResult;
  result.ruleResults = ruleResults;
  result.failures = failures;
  result.warnings = warnings;
  result.unknownChecks = unknownChecks;

  return result;
}

/**
 * Evaluates repository-wide architecture quality gates by aggregating component-level and repository-level rules.
 */
function evaluateQualityGates(registry, graph = null, metricList = [], options = {}) {
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];

  if (symbols.length === 0 && (!graph || !graph.nodes || graph.nodes.length === 0)) {
    const emptyResult = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [createEvidence("empty-repository-gate", "Repository registry and graph are empty or unavailable.")],
      metadata: {
        overallResult: "UNKNOWN",
        confidence: "unknown",
        ruleResults: [],
        failures: [],
        warnings: [],
        unknownChecks: ["Repository contains 0 symbols or graph nodes."],
        evidence: [createEvidence("empty-repository-gate", "Repository contains 0 symbols or graph nodes.")]
      }
    });

    emptyResult.overallResult = "UNKNOWN";
    emptyResult.ruleResults = [];
    emptyResult.failures = [];
    emptyResult.warnings = [];
    emptyResult.unknownChecks = ["Repository contains 0 symbols or graph nodes."];
    return emptyResult;
  }

  const config = options.config || DEFAULT_QUALITY_GATE_CONFIG;
  const rulesConfig = config.rules || DEFAULT_QUALITY_GATE_CONFIG.rules;

  // Extract or reference pre-computed intelligence maps
  const smellAnalysis = options.smellAnalysis || options.smells || null;
  const debtAnalysis = options.architectureDebtAnalysis || options.debt || null;
  const bottleneckAnalysis = options.bottleneckAnalysis || options.bottlenecks || null;
  const securityAnalysis = options.securityAnalysis || options.securityBoundaries || null;
  const externalBoundaryAnalysis = options.externalBoundaryAnalysis || options.externalBoundaries || null;
  const testGapSummary = options.testGapSummary || null;
  const safetyEnvelopeAnalysis = options.safetyEnvelopeAnalysis || options.safetyEnvelopes || null;
  const layerAnalysis = options.layerAnalysis || options.layers || null;
  const domainAnalysis = options.domainAnalysis || options.domains || null;
  const cycles = options.cycles || [];

  const metricById = new Map((metricList || []).map(m => [m.id, m]));

  const componentGateResults = new Map();
  const ruleAggregationMap = new Map();

  // Initialize rule aggregation entry for every enabled rule
  for (const [ruleId, rDef] of Object.entries(rulesConfig)) {
    if (rDef.enabled !== false) {
      ruleAggregationMap.set(ruleId, {
        ruleId,
        name: rDef.name || ruleId,
        description: rDef.description || "",
        severity: rDef.severity || "HIGH",
        result: "PASS",
        confidence: "high",
        affectedComponents: [],
        evidence: []
      });
    }
  }

  // Evaluate individual components
  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const compGate = evaluateComponentQualityGates(symbol, graph, metric, {
      config,
      smellInfo: smellAnalysis?.componentSmells?.get(symbol.id),
      debtInfo: debtAnalysis?.componentDebt?.get(symbol.id),
      bottleneckInfo: bottleneckAnalysis?.componentBottlenecks?.get(symbol.id),
      securityInfo: securityAnalysis?.symbolSecurityBoundaries?.get(symbol.id),
      testGapInfo: options.testGaps?.get ? options.testGaps.get(symbol.id) : null,
      externalBoundaryInfo: externalBoundaryAnalysis?.symbolExternalBoundaries?.get(symbol.id),
      safetyEnvelopeInfo: safetyEnvelopeAnalysis?.symbolSafetyEnvelopes?.get(symbol.id),
      layerInfo: layerAnalysis?.symbolLayers?.get(symbol.id),
      domainInfo: domainAnalysis?.symbolDomains?.get(symbol.id),
      cycles
    });

    componentGateResults.set(symbol.id, compGate);

    // Aggregate component rule evaluations into repository-level rules
    for (const cRule of compGate.ruleResults) {
      const repRule = ruleAggregationMap.get(cRule.ruleId);
      if (!repRule) continue;

      if (cRule.result === "FAIL") {
        repRule.result = "FAIL";
      } else if (cRule.result === "WARN" && repRule.result !== "FAIL") {
        repRule.result = "WARN";
      } else if (cRule.result === "UNKNOWN" && repRule.result === "PASS") {
        repRule.result = "UNKNOWN";
      }

      if (cRule.result !== "PASS") {
        for (const comp of cRule.affectedComponents) {
          if (!repRule.affectedComponents.includes(comp)) {
            repRule.affectedComponents.push(comp);
          }
        }
        for (const ev of cRule.evidence) {
          if (ev.rule && !ev.rule.endsWith("-pass")) {
            repRule.evidence.push(ev);
          }
        }
      }
    }
  }

  // Handle repository-level cycles check directly for RULE-CIRCULAR-DEPENDENCIES
  const cycleRule = ruleAggregationMap.get("RULE-CIRCULAR-DEPENDENCIES");
  if (cycleRule && cycles.length > 0) {
    cycleRule.result = "FAIL";
    for (const cycleGroup of cycles) {
      for (const cId of cycleGroup) {
        const cName = cId.split(":").pop();
        if (!cycleRule.affectedComponents.includes(cName)) {
          cycleRule.affectedComponents.push(cName);
        }
      }
    }
    cycleRule.evidence.push(
      createEvidence(
        "repository-cycles-detected",
        `Repository contains ${cycles.length} circular dependency loop(s) touching components: ${cycleRule.affectedComponents.join(", ")}.`
      )
    );
  }

  const ruleResults = Array.from(ruleAggregationMap.values());
  const failures = ruleResults.filter(r => r.result === "FAIL");
  const warnings = ruleResults.filter(r => r.result === "WARN");
  const unknownChecks = ruleResults.filter(r => r.result === "UNKNOWN").map(r => r.name);

  // Overall repository gate result calculation
  let overallResult = "PASS";
  if (failures.length > 0) {
    overallResult = "FAIL";
  } else if (warnings.length > 0) {
    overallResult = "WARN";
  } else if (unknownChecks.length > 0) {
    overallResult = "UNKNOWN";
  }

  let overallConfidence = "high";
  if (unknownChecks.length >= 3) {
    overallConfidence = "low";
  } else if (unknownChecks.length >= 1) {
    overallConfidence = "medium";
  }

  // Aggregate all evidence cleanly
  const allEvidence = [];
  for (const r of ruleResults) {
    for (const ev of r.evidence) {
      allEvidence.push({
        ...ev,
        severity: r.severity,
        ruleId: r.ruleId
      });
    }
  }

  if (allEvidence.length === 0) {
    allEvidence.push(
      createEvidence("all-quality-gates-passed", `All ${ruleResults.length} architecture quality gates PASSED with zero failures or warnings.`)
    );
  }

  const sortedEvidence = sortEvidenceBySeverity(allEvidence);

  const result = createDeterministicResult({
    value: overallResult,
    primary: overallResult,
    confidence: overallConfidence,
    evidence: sortedEvidence,
    secondary: ruleResults.map(r => `${r.ruleId}:${r.result}`),
    metadata: {
      overallResult,
      confidence: overallConfidence,
      ruleResults,
      failures,
      warnings,
      unknownChecks,
      evidence: sortedEvidence,
      totalRulesEvaluated: ruleResults.length,
      evaluatedComponentCount: componentGateResults.size
    }
  });

  result.overallResult = overallResult;
  result.ruleResults = ruleResults;
  result.failures = failures;
  result.warnings = warnings;
  result.unknownChecks = unknownChecks;
  result.componentGateResults = componentGateResults;

  return result;
}

module.exports = {
  GATE_RESULTS,
  GATE_SEVERITIES,
  DEFAULT_QUALITY_GATE_CONFIG,
  sortEvidenceBySeverity,
  evaluateComponentQualityGates,
  evaluateQualityGates
};
