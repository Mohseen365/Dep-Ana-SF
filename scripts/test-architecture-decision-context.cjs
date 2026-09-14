/**
 * Test Suite for Deterministic Architecture Decision Context (WAVE-D5)
 *
 * Verifies all 20 required test scenarios:
 *  1. Healthy component
 *  2. High-risk component
 *  3. Component with safety blocker
 *  4. Component with quality-gate failure
 *  5. Governance violation / rule failure
 *  6. Architecture debt
 *  7. Duplicate-responsibility signal
 *  8. Baseline change
 *  9. Conflicting signals
 * 10. Unknown evidence
 * 11. Business criticality separation
 * 12. Evidence traceability
 * 13. Deterministic repeated output (100% repeatability)
 * 14. Empty / minimal architecture context
 * 15. Repository-level decision context
 * 16. Change-level decision context
 * 17. Component-level decision context
 * 18. Authority preservation
 * 19. Zero LLM calls verification
 * 20. Zero RL runtime dependency verification
 */

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const {
  evaluateArchitectureDecisionContext,
  buildComponentDecisionContext,
  buildChangeDecisionContext,
  buildRepositoryDecisionContext
} = require("../architecture-decision-context.cjs");

const {
  enforceDeterministicAuthority
} = require("../deterministic/contract.cjs");

console.log("Running Deterministic Architecture Decision Context Test Suite (WAVE-D5)...");
console.log("==========================================================================");

let passedTests = 0;

function runTest(num, name, fn) {
  process.stdout.write(`Test ${num}: ${name}... `);
  try {
    fn();
    console.log(`✓ Test ${num} PASSED (${name})`);
    passedTests++;
  } catch (err) {
    console.log(`\n❌ Test ${num} FAILED: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

// 1. Healthy component
runTest(1, "Healthy component decision context", () => {
  const symbol = { id: "ApexClass:AssetService", name: "AssetService", type: "ApexClass", file: "force-app/main/default/classes/AssetService.cls" };
  const ctx = buildComponentDecisionContext(symbol, {
    role: { primary: "service", confidence: "high" },
    layer: { primary: "service", confidence: "high" },
    domain: { primary: "asset-management", confidence: "high" },
    safetyEnvelope: { safetyClassification: "SAFE", confidence: "high" },
    architectureHealth: { overallHealth: "HEALTHY", confidence: "high" },
    qualityGates: { overallResult: "PASS", failures: [] },
    businessCriticality: { businessCriticality: "HIGH", confidence: "high" },
    testProtection: { hasTestGap: false, status: "COVERED" }
  });

  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.subject.name, "AssetService");
  assert.strictEqual(res.safety.safetyClassification, "SAFE");
  assert.strictEqual(res.architectureHealth.overallHealth, "HEALTHY");
  assert.strictEqual(res.blockers.length, 0);
  assert.strictEqual(res.conflicts.length, 0);
});

// 2. High-risk component
runTest(2, "High-risk component decision context", () => {
  const symbol = { id: "ApexClass:CoreHub", name: "CoreHub", type: "ApexClass" };
  const ctx = buildComponentDecisionContext(symbol, {
    safetyEnvelope: { safetyClassification: "HIGH_RISK", confidence: "high" },
    architectureHealth: { overallHealth: "DEGRADED", confidence: "high" },
    impact: { level: "CRITICAL" }
  });

  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.safety.safetyClassification, "HIGH_RISK");
  assert.strictEqual(res.architectureHealth.overallHealth, "DEGRADED");
  assert.strictEqual(res.impact.level, "CRITICAL");
});

// 3. Component with safety blocker
runTest(3, "Component with safety blocker", () => {
  const symbol = { id: "ApexClass:UnsafeClass", name: "UnsafeClass", type: "ApexClass" };
  const ctx = buildComponentDecisionContext(symbol, {
    safetyEnvelope: {
      safetyClassification: "BLOCKED",
      blockers: ["Security boundary violation: missing sharing model."],
      confidence: "high"
    }
  });

  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.safety.safetyClassification, "BLOCKED");
  assert.strictEqual(res.blockers.length, 1);
  assert.strictEqual(res.blockers[0].type, "SAFETY_BLOCKED");
  assert.strictEqual(res.blockers[0].sourceCapability, "Safety Envelope");
});

// 4. Component with quality-gate failure
runTest(4, "Component with quality-gate failure", () => {
  const symbol = { id: "ApexClass:LegacyClass", name: "LegacyClass", type: "ApexClass" };
  const ctx = buildComponentDecisionContext(symbol, {
    qualityGates: {
      overallResult: "FAIL",
      failures: [{
        ruleId: "RULE-EXCESSIVE-COUPLING",
        name: "Excessive Component Coupling",
        description: "Coupling exceeds threshold of 15.",
        confidence: "high"
      }]
    }
  });

  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.qualityGates.overallResult, "FAIL");
  assert.strictEqual(res.blockers.length, 1);
  assert.strictEqual(res.blockers[0].type, "QUALITY_GATE_FAILURE");
  assert.strictEqual(res.blockers[0].sourceCapability, "Quality Gates");
});

// 5. Governance violation / rule failure
runTest(5, "Governance violation", () => {
  const symbol = { id: "ApexClass:GovViolationClass", name: "GovViolationClass", type: "ApexClass" };
  const ctx = buildComponentDecisionContext(symbol, {
    governance: {
      status: "NON_COMPLIANT",
      violations: ["RULE-GOV-NO-DIRECT-SOQL-IN-CONTROLLER: Controller contains direct SOQL."]
    }
  });

  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.blockers.length, 1);
  assert.strictEqual(res.blockers[0].type, "GOVERNANCE_VIOLATION");
  assert.strictEqual(res.constraints.length, 1);
});

// 6. Architecture debt
runTest(6, "Architecture debt signals & recommendations", () => {
  const symbol = { id: "ApexClass:DebtClass", name: "GovViolationClass", type: "ApexClass" };
  const ctx = buildComponentDecisionContext(symbol, {
    architectureDebt: {
      debtItems: [{ severity: "critical", debtCategory: "god-component" }],
      confidence: "high"
    }
  });

  const res = ctx.architectureDecisionContext;
  assert.ok(res.recommendations.some(r => r.recommendationType === "ADDRESS_ARCHITECTURE_DEBT"));
  assert.strictEqual(res.recommendations[0].sourceCapability, "Architecture Debt");
});

// 7. Duplicate-responsibility signal
runTest(7, "Duplicate-responsibility signal", () => {
  const symbol = { id: "ApexClass:DupClass", name: "DupClass", type: "ApexClass" };
  const ctx = buildComponentDecisionContext(symbol, {
    duplicateResponsibility: {
      primary: "STRONG_OVERLAP",
      confidence: "medium"
    }
  });

  const res = ctx.architectureDecisionContext;
  assert.ok(res.recommendations.some(r => r.recommendationType === "EVALUATE_DUPLICATE_RESPONSIBILITY"));
  assert.strictEqual(res.recommendations[0].sourceCapability, "Duplicate Responsibility");
});

// 8. Baseline change
runTest(8, "Baseline change context", () => {
  const ctx = buildChangeDecisionContext({
    component: "AssetController",
    baselineChanges: { summary: "New method call added to AssetService." }
  });

  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.subject.name, "AssetController");
  assert.strictEqual(res.constraints.length, 1);
  assert.ok(res.constraints[0].includes("Baseline change detected"));
});

// 9. Conflicting signals
runTest(9, "Conflicting signals explicitly preserved", () => {
  const symbol = { id: "ApexClass:ConflictClass", name: "ConflictClass", type: "ApexClass" };
  const ctx = buildComponentDecisionContext(symbol, {
    architectureHealth: { overallHealth: "HEALTHY" },
    safetyEnvelope: { safetyClassification: "HIGH_RISK" },
    businessCriticality: { businessCriticality: "LOW" },
    impact: { level: "CRITICAL" }
  });

  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.conflicts.length, 2);
  assert.strictEqual(res.conflicts[0].type, "HEALTH_VS_SAFETY_CONFLICT");
  assert.strictEqual(res.conflicts[1].type, "BUSINESS_CRITICALITY_VS_STRUCTURAL_IMPACT_CONFLICT");
});

// 10. Unknown evidence
runTest(10, "Unknown evidence preserved explicitly", () => {
  const symbol = { id: "ApexClass:UnknownClass", name: "UnknownClass", type: "ApexClass" };
  const ctx = buildComponentDecisionContext(symbol, {});

  const res = ctx.architectureDecisionContext;
  assert.ok(res.unknowns.length >= 3);
  assert.ok(res.unknowns.some(u => u.includes("role")));
  assert.ok(res.unknowns.some(u => u.includes("layer")));
  assert.ok(res.unknowns.some(u => u.includes("domain")));
});

// 11. Business criticality separation
runTest(11, "Business criticality separation", () => {
  const symbol = { id: "ApexClass:CritClass", name: "CritClass", type: "ApexClass" };
  const ctx = buildComponentDecisionContext(symbol, {
    businessCriticality: { businessCriticality: "HIGH", confidence: "high" },
    impact: { level: "LOW" },
    architectureHealth: { overallHealth: "DEGRADED" }
  });

  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.businessCriticality.businessCriticality, "HIGH");
  assert.strictEqual(res.impact.level, "LOW");
  assert.strictEqual(res.architectureHealth.overallHealth, "DEGRADED");
  // Proves business criticality was NOT recalculated from impact or health
});

// 12. Evidence traceability
runTest(12, "Evidence traceability across context results", () => {
  const symbol = { id: "ApexClass:EvClass", name: "EvClass", type: "ApexClass" };
  const ctx = buildComponentDecisionContext(symbol, {
    securityBoundaries: { metadata: { sharingModel: "without sharing" }, confidence: "high" }
  });

  const res = ctx.architectureDecisionContext;
  const rec = res.recommendations.find(r => r.recommendationType === "REVIEW_SECURITY_BOUNDARY");
  assert.ok(rec);
  assert.strictEqual(rec.sourceCapability, "Security Boundaries");
  assert.ok(Array.isArray(rec.evidence));
  assert.strictEqual(rec.evidence[0].rule, "security-boundary-rec");
});

// 13. Deterministic repeated output (100% repeatability)
runTest(13, "100% deterministic repeated output", () => {
  const symbol = { id: "ApexClass:DetClass", name: "DetClass", type: "ApexClass" };
  const opts = {
    role: { primary: "controller" },
    layer: { primary: "presentation" },
    safetyEnvelope: { safetyClassification: "SAFE_WITH_REVIEW" }
  };

  const json1 = JSON.stringify(buildComponentDecisionContext(symbol, opts));
  const json2 = JSON.stringify(buildComponentDecisionContext(symbol, opts));
  assert.strictEqual(json1, json2);
});

// 14. Empty / minimal architecture context
runTest(14, "Empty / minimal architecture context", () => {
  const ctx = buildComponentDecisionContext(null);
  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.subject.name, "UNKNOWN");
  assert.strictEqual(res.safety.safetyClassification, "UNKNOWN");
  assert.ok(res.unknowns.length > 0);
});

// 15. Repository-level decision context
runTest(15, "Repository-level decision context", () => {
  const ctx = buildRepositoryDecisionContext({
    name: "SalesforceProject",
    architectureHealth: { overallHealth: "DEGRADED" },
    qualityGates: { overallResult: "FAIL", failures: [{ ruleId: "RULE-CIRCULAR-DEPENDENCIES", name: "Cycles" }] }
  });

  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.subject.type, "repository");
  assert.strictEqual(res.subject.name, "SalesforceProject");
  assert.strictEqual(res.blockers.length, 1);
  assert.ok(res.recommendations.some(r => r.recommendationType === "ADDRESS_ARCHITECTURE_DEBT"));
});

// 16. Change-level decision context
runTest(16, "Change-level decision context", () => {
  const ctx = buildChangeDecisionContext({
    component: "AssetDashboardService",
    changeType: "REFACTOR",
    safetyEnvelope: { safetyClassification: "HIGH_RISK" }
  });

  const res = ctx.architectureDecisionContext;
  assert.strictEqual(res.subject.type, "change");
  assert.strictEqual(res.subject.name, "AssetDashboardService");
  assert.ok(res.recommendations.some(r => r.recommendationType === "INVESTIGATE_BEFORE_CHANGING"));
});

// 17. Component-level decision context
runTest(17, "Component-level decision context via evaluateArchitectureDecisionContext", () => {
  const symbol = { id: "ApexClass:CompClass", name: "CompClass", type: "ApexClass" };
  const ctx = evaluateArchitectureDecisionContext(symbol, {
    subjectType: "component",
    role: { primary: "domain-logic" }
  });

  assert.strictEqual(ctx.subject.type, "component");
  assert.strictEqual(ctx.subject.name, "CompClass");
  assert.strictEqual(ctx.architectureDecisionContext.role.primary, "domain-logic");
});

// 18. Authority preservation
runTest(18, "Authority preservation over conflicting claims", () => {
  const check = enforceDeterministicAuthority("with sharing", "without sharing");
  assert.strictEqual(check.authoritativeValue, "with sharing");
  assert.strictEqual(check.contradiction, true);
  assert.strictEqual(check.source, "deterministic");
});

// 19. Zero LLM calls verification
runTest(19, "0 LLM runtime dependencies or calls verification", () => {
  const d5Code = fs.readFileSync(path.join(__dirname, "../architecture-decision-context.cjs"), "utf8");
  assert.doesNotMatch(d5Code, /LlmClient|semantic-investigation-service|CacheManager|openai|anthropic/i);
});

// 20. Zero RL runtime dependency verification
runTest(20, "0 RL runtime dependencies verification", () => {
  const d5Code = fs.readFileSync(path.join(__dirname, "../architecture-decision-context.cjs"), "utf8");
  assert.doesNotMatch(d5Code, /rl-orchestrator|reward-engine|policy-network/i);
});

console.log("==========================================================================");
console.log(`ALL ${passedTests} DETERMINISTIC ARCHITECTURE DECISION CONTEXT TESTS PASSED!`);
