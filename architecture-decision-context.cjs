/**
 * Deterministic Architecture Decision Context Engine (WAVE-D5)
 *
 * Consolidates existing deterministic architecture intelligence across Wave A, B, C, and D
 * capabilities into a structured, explainable decision context for downstream planning,
 * refactoring, governance, and optional semantic investigation.
 *
 * Strict boundary rules:
 *   - Aggregation and presentation layer ONLY.
 *   - MUST NOT become an independent architecture-analysis or graph engine.
 *   - 0 LLM runtime dependencies or calls.
 *   - 0 RL runtime dependencies.
 *   - Deterministic authority remains authoritative; facts cannot be overwritten by LLM observations.
 *   - MUST NOT produce a single aggregate score (e.g., "Score = 82").
 *   - Preserves UNKNOWN explicitly when evidence is missing.
 *   - Preserves contradictory signals explicitly in `conflicts` rather than flattening or averaging.
 *   - Business criticality remains strictly distinct from structural impact, health, and safety.
 *   - Evidence traceability is maintained for all decisions, recommendations, constraints, and blockers.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult,
  enforceDeterministicAuthority
} = require("./deterministic/contract.cjs");

/**
 * Builds deterministic decision context for a component subject.
 */
function buildComponentDecisionContext(symbol, options = {}) {
  const symbolId = symbol ? (symbol.id || `ApexClass:${symbol.name}`) : "UNKNOWN";
  const symbolName = symbol ? String(symbol.name || symbol.parsed?.name || symbolId).trim() : "UNKNOWN";

  const subject = {
    type: "component",
    id: symbolId,
    name: symbolName,
    file: symbol?.file || null,
    symbolType: symbol?.type || "Unknown"
  };

  if (!symbol) {
    return createEmptyDecisionContext(subject, "Component symbol is missing or unresolvable.");
  }

  // Pre-computed capability outputs passed in options or extracted
  const role = options.role || options.roleInfo || null;
  const layer = options.layer || options.layerInfo || null;
  const domain = options.domain || options.domainInfo || null;
  const profile = options.profile || options.architectureProfile || null;
  const dependencies = options.dependencies || symbol.parsed?.dependencies || [];
  const dependents = options.dependents || [];
  const impact = options.impact || null;
  const changeRisk = options.changeRisk || null;
  const safety = options.safetyEnvelope || options.safety || null;
  const businessCriticality = options.businessCriticality || options.criticality || null;
  const architectureHealth = options.architectureHealth || options.health || null;
  const architectureDebt = options.architectureDebt || options.debt || null;
  const bottlenecks = options.bottlenecks || options.bottleneck || null;
  const smells = options.smells || options.smellInfo || null;
  const securityBoundaries = options.securityBoundaries || options.security || null;
  const externalBoundaries = options.externalBoundaries || options.externalBoundary || null;
  const testProtection = options.testProtection || options.testGap || options.testGapInfo || null;
  const baselineChanges = options.baselineChanges || options.baseline || null;
  const qualityGates = options.qualityGates || options.gates || null;
  const governance = options.governance || null;
  const duplicateResponsibility = options.duplicateResponsibility || null;

  const constraints = [];
  const blockers = [];
  const recommendations = [];
  const unknowns = [];
  const conflicts = [];
  const evidenceList = [];

  // Helper to collect evidence cleanly
  function addEvidence(rule, detail) {
    const item = createEvidence(rule, detail);
    evidenceList.push(item);
    return item;
  }

  // 1. Role, Layer, Domain, Profile
  const roleVal = role?.primary || role?.value || "unknown";
  const layerVal = layer?.primary || layer?.value || "unknown";
  const domainVal = domain?.primary || domain?.value || domain?.domain || "unknown";

  if (roleVal === "unknown") unknowns.push("Architectural role is unknown or unclassified.");
  if (layerVal === "unknown") unknowns.push("Architectural layer is unknown or unclassified.");
  if (domainVal === "unknown") unknowns.push("Architectural domain is unknown or unclassified.");

  // 2. Safety Envelope & Blockers
  const safetyClass = safety?.safetyClassification || safety?.value || "UNKNOWN";
  if (safetyClass === "BLOCKED") {
    const reasons = safety?.blockers || safety?.metadata?.blockers || ["Safety envelope classified as BLOCKED."];
    for (const r of reasons) {
      blockers.push({
        type: "SAFETY_BLOCKED",
        reason: typeof r === "string" ? r : r.detail || r.reason || "Safety envelope blocker.",
        sourceCapability: "Safety Envelope",
        evidence: safety?.evidence || [addEvidence("safety-blocked", `Component '${symbolName}' safety envelope is BLOCKED.`)],
        confidence: safety?.confidence || "high"
      });
    }
  }

  // 3. Quality Gates & Governance Blockers / Constraints
  const gateResult = qualityGates?.overallResult || qualityGates?.value || "UNKNOWN";
  if (gateResult === "FAIL") {
    const failures = qualityGates?.failures || qualityGates?.metadata?.failures || [];
    if (failures.length > 0) {
      for (const f of failures) {
        blockers.push({
          type: "QUALITY_GATE_FAILURE",
          reason: `Quality gate '${f.name || f.ruleId}' failed: ${f.description || "Critical rule violation."}`,
          sourceCapability: "Quality Gates",
          evidence: f.evidence || [addEvidence("quality-gate-fail", `Quality gate rule '${f.ruleId}' failed.`)],
          confidence: f.confidence || "high"
        });
      }
    } else {
      blockers.push({
        type: "QUALITY_GATE_FAILURE",
        reason: `Quality gate evaluation for '${symbolName}' failed.`,
        sourceCapability: "Quality Gates",
        evidence: qualityGates?.evidence || [addEvidence("quality-gate-fail", "Quality gate evaluation failed.")],
        confidence: qualityGates?.confidence || "high"
      });
    }
  }

  if (governance) {
    const govViolations = governance.violations || governance.metadata?.violations || [];
    for (const gv of govViolations) {
      blockers.push({
        type: "GOVERNANCE_VIOLATION",
        reason: typeof gv === "string" ? gv : gv.reason || gv.detail || "Governance rule violation.",
        sourceCapability: "Governance",
        evidence: [addEvidence("governance-violation", typeof gv === "string" ? gv : gv.reason || "Governance violation.")],
        confidence: "high"
      });
      constraints.push(`Governance rule constraint: ${typeof gv === "string" ? gv : gv.ruleId || gv.reason}`);
    }
  }

  // 4. Boundary Constraints
  if (securityBoundaries) {
    const sharingModel = securityBoundaries.metadata?.sharingModel || securityBoundaries.primary || "unspecified";
    if (sharingModel === "without sharing") {
      constraints.push(`Security constraint: Component '${symbolName}' operates in 'without sharing' mode.`);
      addEvidence("security-boundary-constraint", `Component '${symbolName}' is 'without sharing'.`);
      recommendations.push({
        recommendationType: "REVIEW_SECURITY_BOUNDARY",
        reason: `Class '${symbolName}' uses 'without sharing' mode. Review security implications before modification.`,
        sourceCapability: "Security Boundaries",
        evidence: [createEvidence("security-boundary-rec", `Class operates in 'without sharing' mode.`)],
        confidence: securityBoundaries.confidence || "high"
      });
    } else if (sharingModel === "unspecified" && symbol.type === "ApexClass") {
      unknowns.push(`Class '${symbolName}' has an unspecified sharing declaration.`);
    }
  }

  if (externalBoundaries) {
    const hasExternal = Boolean(externalBoundaries.hasExternalBoundary || externalBoundaries.value === "external-boundary");
    if (hasExternal) {
      const types = externalBoundaries.boundaryTypes || externalBoundaries.types || ["external-system"];
      constraints.push(`External boundary constraint: Integrates with external systems (${types.join(", ")}).`);
      addEvidence("external-boundary-constraint", `Integrates with external systems: ${types.join(", ")}.`);
      recommendations.push({
        recommendationType: "REVIEW_EXTERNAL_BOUNDARY_IMPACT",
        reason: `Component '${symbolName}' interacts with external boundary (${types.join(", ")}). Validate external contracts before changing.`,
        sourceCapability: "External Boundaries",
        evidence: [createEvidence("external-boundary-rec", `External boundary types: ${types.join(", ")}`)],
        confidence: externalBoundaries.confidence || "high"
      });
    }
  }

  // 5. Test Protection & Debt Recommendations
  if (testProtection) {
    const hasGap = Boolean(testProtection.hasTestGap || testProtection.signal === "no-test-evidence" || testProtection.signal === "known-coverage-failure");
    if (hasGap) {
      constraints.push(`Test protection requirement: Component '${symbolName}' lacks verified test coverage.`);
      recommendations.push({
        recommendationType: "ADD_TEST_PROTECTION",
        reason: `Add test protection for '${symbolName}' prior to modification (status: ${testProtection.status || testProtection.signal}).`,
        sourceCapability: "Test Gap Analysis",
        evidence: [createEvidence("test-protection-rec", `Test gap status: ${testProtection.status || testProtection.signal}`)],
        confidence: testProtection.confidence || "high"
      });
    }
  } else {
    unknowns.push(`Test protection status is unknown for component '${symbolName}'.`);
  }

  if (architectureDebt) {
    const debtItems = architectureDebt.debtItems || architectureDebt.metadata?.debtItems || [];
    const criticalDebt = debtItems.filter(d => d.severity === "critical" || d.severity === "high");
    if (criticalDebt.length > 0) {
      recommendations.push({
        recommendationType: "ADDRESS_ARCHITECTURE_DEBT",
        reason: `Address high-severity architecture debt in '${symbolName}' (${criticalDebt.map(d => d.debtCategory).join(", ")}) before high-risk modifications.`,
        sourceCapability: "Architecture Debt",
        evidence: [createEvidence("architecture-debt-rec", `High severity debt items: ${criticalDebt.length}`)],
        confidence: architectureDebt.confidence || "high"
      });
    }
  }

  // 6. Duplicate Responsibility Signal
  if (duplicateResponsibility) {
    const classification = duplicateResponsibility.primary || duplicateResponsibility.value || "NO_DUPLICATION_SIGNAL";
    if (classification === "POSSIBLE_OVERLAP" || classification === "STRONG_OVERLAP") {
      recommendations.push({
        recommendationType: "EVALUATE_DUPLICATE_RESPONSIBILITY",
        reason: `Component '${symbolName}' exhibits duplicate responsibility signals (${classification}). Evaluate consolidation or boundary refactoring.`,
        sourceCapability: "Duplicate Responsibility",
        evidence: duplicateResponsibility.evidence || [createEvidence("duplicate-responsibility-rec", `Duplication signal: ${classification}`)],
        confidence: duplicateResponsibility.confidence || "medium"
      });
    }
  }

  // 7. Prerequisite / Sequencing Constraint
  if (options.refactoringSequence || options.sequencing) {
    const seq = options.refactoringSequence || options.sequencing;
    const prereqs = seq.prerequisites || seq.metadata?.prerequisites || [];
    if (prereqs.length > 0) {
      constraints.push(`Dependency prerequisite: Refactor prerequisite components (${prereqs.join(", ")}) before '${symbolName}'.`);
      recommendations.push({
        recommendationType: "ADDRESS_PREREQUISITE_FIRST",
        reason: `Address prerequisite components (${prereqs.join(", ")}) prior to modifying '${symbolName}'.`,
        sourceCapability: "Refactoring Sequencing",
        evidence: [createEvidence("prerequisite-sequence-rec", `Prerequisites: ${prereqs.join(", ")}`)],
        confidence: seq.confidence || "high"
      });
    }
  }

  // 8. Conflict Detection (Section 9)
  const healthClass = architectureHealth?.overallHealth || architectureHealth?.value || "UNKNOWN";
  if (healthClass === "HEALTHY" && (safetyClass === "HIGH_RISK" || safetyClass === "BLOCKED")) {
    conflicts.push({
      type: "HEALTH_VS_SAFETY_CONFLICT",
      signals: {
        architectureHealth: healthClass,
        safetyEnvelope: safetyClass
      },
      explanation: `Component '${symbolName}' exhibits HEALTHY structural metrics overall but has a ${safetyClass} safety envelope due to specific boundary or test risk factors.`,
      confidence: "high"
    });
  }

  const busCritLevel = businessCriticality?.businessCriticality || businessCriticality?.primary || businessCriticality?.value || "unknown";
  const blastRadius = impact?.level || changeRisk?.level || (bottlenecks?.isBottleneck ? "HIGH" : "LOW");
  if ((busCritLevel === "LOW" || busCritLevel === "NONE") && (blastRadius === "CRITICAL" || blastRadius === "HIGH")) {
    conflicts.push({
      type: "BUSINESS_CRITICALITY_VS_STRUCTURAL_IMPACT_CONFLICT",
      signals: {
        businessCriticality: busCritLevel,
        structuralImpact: blastRadius
      },
      explanation: `Component '${symbolName}' has LOW business criticality but CRITICAL/HIGH structural impact across the dependency graph.`,
      confidence: "high"
    });
  }

  if (governance && gateResult === "FAIL") {
    const govStatus = governance.status || governance.value || "COMPLIANT";
    if (govStatus === "COMPLIANT") {
      conflicts.push({
        type: "GOVERNANCE_VS_QUALITY_GATE_CONFLICT",
        signals: {
          governance: govStatus,
          qualityGates: gateResult
        },
        explanation: `Component '${symbolName}' is flagged as governance compliant, yet failed quality gate checks.`,
        confidence: "high"
      });
    }
  }

  // 9. Deterministic Summary Generation (Section 5)
  const summaryParts = [
    `Subject '${symbolName}' is a ${symbol.type || "component"} with architectural role '${roleVal}', layer '${layerVal}', and domain '${domainVal}'.`,
    `Safety envelope classification: ${safetyClass}. Architecture health: ${healthClass}. Quality gates: ${gateResult}.`
  ];

  if (blockers.length > 0) {
    summaryParts.push(`BLOCKERS DETECTED (${blockers.length}): ${blockers.map(b => b.reason).join("; ")}.`);
  }

  if (constraints.length > 0) {
    summaryParts.push(`Constraints: ${constraints.join("; ")}.`);
  }

  if (conflicts.length > 0) {
    summaryParts.push(`ATTENTION: ${conflicts.length} conflicting deterministic signal(s) detected.`);
  }

  if (unknowns.length > 0) {
    summaryParts.push(`Unknowns: ${unknowns.join("; ")}.`);
  }

  const summary = summaryParts.join(" ");

  // Overall Confidence calculation
  let confidence = "high";
  if (unknowns.length >= 3) {
    confidence = "low";
  } else if (unknowns.length >= 1) {
    confidence = "medium";
  }

  const contextResult = createDeterministicResult({
    value: "DECISION_CONTEXT_GENERATED",
    primary: "DECISION_CONTEXT_GENERATED",
    confidence,
    evidence: evidenceList,
    metadata: {
      subject,
      summary,
      architecturalProfile: profile || null,
      role: role || { primary: roleVal, confidence: "unknown" },
      layer: layer || { primary: layerVal, confidence: "unknown" },
      domain: domain || { primary: domainVal, confidence: "unknown" },
      dependencies,
      dependents,
      impact: impact || null,
      changeRisk: changeRisk || null,
      safety: safety || { safetyClassification: safetyClass, confidence: "unknown" },
      businessCriticality: businessCriticality || { businessCriticality: busCritLevel, confidence: "unknown" },
      architectureHealth: architectureHealth || { overallHealth: healthClass, confidence: "unknown" },
      architectureDebt: architectureDebt || null,
      bottlenecks: bottlenecks || null,
      smells: smells || null,
      boundaries: {
        security: securityBoundaries || null,
        external: externalBoundaries || null
      },
      testProtection: testProtection || null,
      baselineChanges: baselineChanges || null,
      qualityGates: qualityGates || null,
      governance: governance || null,
      duplicateResponsibility: duplicateResponsibility || null,
      constraints,
      blockers,
      recommendations,
      unknowns,
      conflicts,
      evidence: evidenceList
    }
  });

  // Attach root properties for direct context tree consumption
  contextResult.architectureDecisionContext = contextResult.metadata;
  contextResult.subject = subject;
  contextResult.summary = summary;
  contextResult.constraints = constraints;
  contextResult.blockers = blockers;
  contextResult.recommendations = recommendations;
  contextResult.unknowns = unknowns;
  contextResult.conflicts = conflicts;

  return contextResult;
}

/**
 * Builds deterministic decision context for a proposed change or change set.
 */
function buildChangeDecisionContext(changeInfo, options = {}) {
  const changeTarget = changeInfo ? (changeInfo.component || changeInfo.target || "UNKNOWN_CHANGE") : "UNKNOWN_CHANGE";
  const subject = {
    type: "change",
    id: typeof changeTarget === "string" ? changeTarget : changeTarget.id || "UNKNOWN_CHANGE",
    name: typeof changeTarget === "string" ? changeTarget : changeTarget.name || "UNKNOWN_CHANGE",
    changeType: changeInfo?.changeType || options.changeType || "MODIFICATION",
    proposedChanges: changeInfo?.proposedChanges || []
  };

  const baselineChanges = changeInfo?.baselineChanges || options.baselineChanges || options.baseline || null;
  const impactedComponents = changeInfo?.impactedComponents || options.impactedComponents || options.impact?.downstream || [];
  const dependencyPaths = changeInfo?.dependencyPaths || options.dependencyPaths || options.paths || [];
  const changeRisk = changeInfo?.changeRisk || options.changeRisk || null;
  const safety = changeInfo?.safetyEnvelope || options.safetyEnvelope || options.safety || null;
  const testProtection = changeInfo?.testProtection || options.testGap || options.testGapInfo || null;
  const securityBoundaries = changeInfo?.securityBoundaries || options.securityBoundaries || options.security || null;
  const externalBoundaries = changeInfo?.externalBoundaries || options.externalBoundaries || options.externalBoundary || null;
  const governance = changeInfo?.governance || options.governance || null;
  const qualityGates = changeInfo?.qualityGates || options.qualityGates || options.gates || null;

  const constraints = [];
  const blockers = [];
  const recommendations = [];
  const unknowns = [];
  const conflicts = [];
  const evidenceList = [];

  function addEvidence(rule, detail) {
    const item = createEvidence(rule, detail);
    evidenceList.push(item);
    return item;
  }

  // Safety & Blockers
  const safetyClass = safety?.safetyClassification || safety?.value || "UNKNOWN";
  if (safetyClass === "BLOCKED") {
    const reasons = safety?.blockers || safety?.metadata?.blockers || ["Proposed change is BLOCKED by safety envelope."];
    for (const r of reasons) {
      blockers.push({
        type: "SAFETY_BLOCKED",
        reason: typeof r === "string" ? r : r.detail || r.reason || "Safety blocker.",
        sourceCapability: "Safety Envelope",
        evidence: [addEvidence("change-safety-blocked", `Change safety envelope is BLOCKED for '${subject.name}'.`)],
        confidence: safety?.confidence || "high"
      });
    }
  } else if (safetyClass === "HIGH_RISK") {
    recommendations.push({
      recommendationType: "INVESTIGATE_BEFORE_CHANGING",
      reason: `Proposed change to '${subject.name}' is HIGH_RISK. Conduct thorough impact and safety investigation prior to modification.`,
      sourceCapability: "Safety Envelope",
      evidence: [addEvidence("change-high-risk", `Safety classification is HIGH_RISK.`)],
      confidence: safety?.confidence || "high"
    });
  }

  if (qualityGates?.overallResult === "FAIL") {
    blockers.push({
      type: "QUALITY_GATE_FAILURE",
      reason: `Quality gates failed for proposed change on '${subject.name}'.`,
      sourceCapability: "Quality Gates",
      evidence: qualityGates?.evidence || [addEvidence("change-gate-fail", "Quality gate failed for proposed change.")],
      confidence: qualityGates?.confidence || "high"
    });
  }

  if (baselineChanges) {
    constraints.push(`Baseline change detected: ${baselineChanges.summary || "Architecture baseline differs from proposed state."}`);
    addEvidence("baseline-change-detected", `Baseline changes present for '${subject.name}'.`);
  } else {
    unknowns.push("Baseline change comparison data unavailable.");
  }

  if (!testProtection) {
    unknowns.push("Test protection status for impacted components unavailable.");
  }

  const summary = `Change Subject '${subject.name}' (${subject.changeType}). Safety: ${safetyClass}. Quality gates: ${qualityGates?.overallResult || "UNKNOWN"}. Impacted components count: ${impactedComponents.length}. Blockers: ${blockers.length}.`;

  let confidence = "high";
  if (unknowns.length >= 3) confidence = "low";
  else if (unknowns.length >= 1) confidence = "medium";

  const contextResult = createDeterministicResult({
    value: "DECISION_CONTEXT_GENERATED",
    primary: "DECISION_CONTEXT_GENERATED",
    confidence,
    evidence: evidenceList,
    metadata: {
      subject,
      summary,
      baselineChanges,
      impactedComponents,
      dependencyPaths,
      changeRisk,
      safety: safety || { safetyClassification: safetyClass, confidence: "unknown" },
      testProtection,
      boundaries: {
        security: securityBoundaries,
        external: externalBoundaries
      },
      governance,
      qualityGates,
      constraints,
      blockers,
      recommendations,
      unknowns,
      conflicts,
      evidence: evidenceList
    }
  });

  contextResult.architectureDecisionContext = contextResult.metadata;
  contextResult.subject = subject;
  contextResult.summary = summary;
  contextResult.constraints = constraints;
  contextResult.blockers = blockers;
  contextResult.recommendations = recommendations;
  contextResult.unknowns = unknowns;
  contextResult.conflicts = conflicts;

  return contextResult;
}

/**
 * Builds deterministic decision context for repository-level scope.
 */
function buildRepositoryDecisionContext(repositoryInfo, options = {}) {
  const subject = {
    type: "repository",
    id: "REPOSITORY_ROOT",
    name: repositoryInfo?.name || options.repositoryName || "Repository"
  };

  const architectureHealth = repositoryInfo?.architectureHealth || options.architectureHealth || options.health || null;
  const architectureDebt = repositoryInfo?.architectureDebt || options.architectureDebt || options.debt || null;
  const bottlenecks = repositoryInfo?.bottlenecks || options.bottlenecks || options.bottleneck || null;
  const governance = repositoryInfo?.governance || options.governance || null;
  const qualityGates = repositoryInfo?.qualityGates || options.qualityGates || options.gates || null;
  const baselineChanges = repositoryInfo?.baselineChanges || options.baselineChanges || options.baseline || null;
  const duplicateResponsibility = repositoryInfo?.duplicateResponsibility || options.duplicateResponsibility || null;

  const constraints = [];
  const blockers = [];
  const recommendations = [];
  const unknowns = [];
  const conflicts = [];
  const evidenceList = [];

  function addEvidence(rule, detail) {
    const item = createEvidence(rule, detail);
    evidenceList.push(item);
    return item;
  }

  const gateResult = qualityGates?.overallResult || qualityGates?.value || "UNKNOWN";
  if (gateResult === "FAIL") {
    const failures = qualityGates?.failures || [];
    for (const f of failures) {
      blockers.push({
        type: "QUALITY_GATE_FAILURE",
        reason: `Repository quality gate failure '${f.name || f.ruleId}': ${f.description || "Failure detected."}`,
        sourceCapability: "Quality Gates",
        evidence: f.evidence || [addEvidence("rep-gate-fail", `Gate failure: ${f.ruleId}`)],
        confidence: f.confidence || "high"
      });
    }
  }

  const healthVal = architectureHealth?.overallHealth || architectureHealth?.value || "UNKNOWN";
  if (healthVal === "HIGH_RISK" || healthVal === "DEGRADED") {
    recommendations.push({
      recommendationType: "ADDRESS_ARCHITECTURE_DEBT",
      reason: `Repository architecture health is ${healthVal}. Address primary debt and bottleneck drivers.`,
      sourceCapability: "Architecture Health",
      evidence: architectureHealth?.evidence || [addEvidence("rep-health-rec", `Overall health is ${healthVal}`)],
      confidence: architectureHealth?.confidence || "high"
    });
  }

  if (!qualityGates) unknowns.push("Repository quality gates status unavailable.");
  if (!governance) unknowns.push("Repository architecture governance status unavailable.");
  if (!architectureHealth) unknowns.push("Repository architecture health evaluation unavailable.");

  const summary = `Repository Context '${subject.name}'. Health: ${healthVal}. Quality Gates: ${gateResult}. Failures: ${blockers.length}. Unknowns: ${unknowns.length}.`;

  let confidence = "high";
  if (unknowns.length >= 3) confidence = "low";
  else if (unknowns.length >= 1) confidence = "medium";

  const contextResult = createDeterministicResult({
    value: "DECISION_CONTEXT_GENERATED",
    primary: "DECISION_CONTEXT_GENERATED",
    confidence,
    evidence: evidenceList,
    metadata: {
      subject,
      summary,
      architectureHealth,
      majorDebt: architectureDebt,
      bottlenecks,
      governanceViolations: governance?.violations || [],
      qualityGateFailures: qualityGates?.failures || [],
      significantBaselineChanges: baselineChanges,
      duplicateResponsibilitySignals: duplicateResponsibility,
      constraints,
      blockers,
      recommendations,
      unknowns,
      conflicts,
      evidence: evidenceList
    }
  });

  contextResult.architectureDecisionContext = contextResult.metadata;
  contextResult.subject = subject;
  contextResult.summary = summary;
  contextResult.constraints = constraints;
  contextResult.blockers = blockers;
  contextResult.recommendations = recommendations;
  contextResult.unknowns = unknowns;
  contextResult.conflicts = conflicts;

  return contextResult;
}

/**
 * Creates an empty or fallback decision context when subject info is missing or unknown.
 */
function createEmptyDecisionContext(subject, reason = "Insufficient evidence") {
  const summary = `Decision context for '${subject.name || "unknown"}' could not be established. Reason: ${reason}.`;
  const evidenceList = [createEvidence("empty-decision-context", reason)];

  const res = createDeterministicResult({
    value: "UNKNOWN_DECISION_CONTEXT",
    primary: "UNKNOWN_DECISION_CONTEXT",
    confidence: "unknown",
    evidence: evidenceList,
    metadata: {
      subject,
      summary,
      architecturalProfile: null,
      role: { primary: "unknown", confidence: "unknown" },
      layer: { primary: "unknown", confidence: "unknown" },
      domain: { primary: "unknown", confidence: "unknown" },
      dependencies: [],
      dependents: [],
      impact: null,
      changeRisk: null,
      safety: { safetyClassification: "UNKNOWN", confidence: "unknown" },
      businessCriticality: { businessCriticality: "unknown", confidence: "unknown" },
      architectureHealth: { overallHealth: "UNKNOWN", confidence: "unknown" },
      architectureDebt: null,
      bottlenecks: null,
      smells: null,
      boundaries: { security: null, external: null },
      testProtection: null,
      baselineChanges: null,
      qualityGates: null,
      governance: null,
      duplicateResponsibility: null,
      constraints: [],
      blockers: [],
      recommendations: [],
      unknowns: [reason],
      conflicts: [],
      evidence: evidenceList
    }
  });

  res.architectureDecisionContext = res.metadata;
  res.subject = subject;
  res.summary = summary;
  res.constraints = [];
  res.blockers = [];
  res.recommendations = [];
  res.unknowns = [reason];
  res.conflicts = [];

  return res;
}

/**
 * Main entry point for evaluating Architecture Decision Context (WAVE-D5).
 */
function evaluateArchitectureDecisionContext(subjectTarget, options = {}) {
  const subjectType = options.subjectType || options.type || (typeof subjectTarget === "string" ? "component" : (subjectTarget?.subjectType || subjectTarget?.type || "component"));

  if (subjectType === "change") {
    return buildChangeDecisionContext(subjectTarget, options);
  }

  if (subjectType === "repository") {
    return buildRepositoryDecisionContext(subjectTarget, options);
  }

  // Default: component subject
  return buildComponentDecisionContext(subjectTarget, options);
}

module.exports = {
  evaluateArchitectureDecisionContext,
  buildComponentDecisionContext,
  buildChangeDecisionContext,
  buildRepositoryDecisionContext,
  createEmptyDecisionContext
};
