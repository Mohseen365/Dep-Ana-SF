#!/usr/bin/env node

/**
 * Deterministic Architecture Quality Gates Test Suite (WAVE-D2)
 *
 * Covers 11 core contract requirements:
 *  1. All-pass architecture
 *  2. Warning result
 *  3. Failure result
 *  4. Unknown state (missing evidence)
 *  5. Multiple failures (all reported explicitly, not hidden behind single score)
 *  6. Multiple warnings (all reported explicitly)
 *  7. Severity ordering (CRITICAL > HIGH > MEDIUM > LOW)
 *  8. Rule determinism (100% repeatability across runs)
 *  9. Duplicate detection avoidance (consumes Wave A/B/C pre-computed capabilities)
 * 10. BASE-ARCH authority (enforces deterministic facts over contradictory claims)
 * 11. Zero LLM calls verification
 */

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");
const {
  evaluateQualityGates,
  evaluateComponentQualityGates,
  DEFAULT_QUALITY_GATE_CONFIG,
  GATE_RESULTS,
  GATE_SEVERITIES,
  sortEvidenceBySeverity
} = require(path.join(ROOT_DIR, "architecture-quality-gates.cjs"));

const {
  validateDeterministicResult,
  enforceDeterministicAuthority
} = require(path.join(ROOT_DIR, "deterministic", "contract.cjs"));

function runQualityGateTests() {
  console.log("Running Deterministic Architecture Quality Gates Test Suite (WAVE-D2)...");
  console.log("=========================================================================");

  // -------------------------------------------------------------
  // Test 1: All-pass architecture
  // -------------------------------------------------------------
  console.log("Test 1: All-pass architecture...");
  const cleanSymbol = {
    id: "ApexClass:CleanService",
    type: "ApexClass",
    name: "CleanService",
    parsed: {
      name: "CleanService",
      type: "ApexClass",
      sharing: "with sharing",
      isTest: false,
      methods: [{ name: "doWork", visibility: "public", returnType: "void" }],
      dependencies: []
    }
  };

  const cleanMetric = { id: "ApexClass:CleanService", fanIn: 1, fanOut: 1, coupling: 2 };
  const passResult = evaluateComponentQualityGates(cleanSymbol, null, cleanMetric, {
    smellInfo: { smells: [] },
    debtInfo: { debtItems: [] },
    bottleneckInfo: { isBottleneck: false },
    securityInfo: { metadata: { sharingModel: "with sharing" } },
    testGapInfo: { signal: "covered", hasTestGap: false, status: "COVERED" },
    externalBoundaryInfo: { hasExternalBoundary: false, boundaryTypes: [] },
    safetyEnvelopeInfo: { safetyClassification: "SAFE" },
    layerInfo: { primary: "service" },
    domainInfo: { primary: "sales" }
  });

  assert.strictEqual(passResult.overallResult, "PASS");
  assert.strictEqual(passResult.confidence, "high");
  assert.strictEqual(passResult.failures.length, 0);
  assert.strictEqual(passResult.warnings.length, 0);
  assert.strictEqual(passResult.unknownChecks.length, 0);
  console.log("  ✓ Test 1 PASSED (All rules evaluated as PASS)");

  // -------------------------------------------------------------
  // Test 2: Warning result
  // -------------------------------------------------------------
  console.log("Test 2: Warning result...");
  const warnSymbol = {
    id: "ApexClass:WarnComponent",
    type: "ApexClass",
    name: "WarnComponent",
    parsed: { name: "WarnComponent", type: "ApexClass", sharing: "without sharing" }
  };

  const warnMetric = { id: "ApexClass:WarnComponent", fanIn: 3, fanOut: 2, coupling: 5 };
  const warnResult = evaluateComponentQualityGates(warnSymbol, null, warnMetric, {
    smellInfo: { smells: [] },
    debtInfo: { debtItems: [] },
    bottleneckInfo: { isBottleneck: true, score: 5 }, // Warning: Bottleneck
    securityInfo: { metadata: { sharingModel: "without sharing" } }, // Warning: without sharing (isolated)
    testGapInfo: { signal: "covered", hasTestGap: false, status: "COVERED" },
    externalBoundaryInfo: { hasExternalBoundary: false },
    safetyEnvelopeInfo: { safetyClassification: "SAFE_WITH_REVIEW" },
    layerInfo: { primary: "service" },
    domainInfo: { primary: "core" }
  });

  assert.strictEqual(warnResult.overallResult, "WARN");
  assert.strictEqual(warnResult.failures.length, 0);
  assert.ok(warnResult.warnings.length > 0);
  assert.ok(warnResult.ruleResults.some(r => r.ruleId === "RULE-ARCHITECTURAL-BOTTLENECK" && r.result === "WARN"));
  console.log("  ✓ Test 2 PASSED (Warnings produced without failures yields WARN overall)");

  // -------------------------------------------------------------
  // Test 3: Failure result
  // -------------------------------------------------------------
  console.log("Test 3: Failure result...");
  const failSymbol = {
    id: "ApexClass:FailService",
    type: "ApexClass",
    name: "FailService",
    parsed: { name: "FailService", type: "ApexClass" }
  };

  const failMetric = { id: "ApexClass:FailService", fanIn: 15, fanOut: 10, coupling: 25 };
  const failResult = evaluateComponentQualityGates(failSymbol, null, failMetric, {
    smellInfo: { smells: [{ smell: "god-component" }] },
    debtInfo: { debtItems: [{ severity: "critical", debtCategory: "excessive-coupling" }] },
    bottleneckInfo: { isBottleneck: true },
    testGapInfo: { signal: "no-test-evidence", hasTestGap: true, status: "NO_TEST_EVIDENCE" },
    safetyEnvelopeInfo: { safetyClassification: "BLOCKED" }
  });

  assert.strictEqual(failResult.overallResult, "FAIL");
  assert.ok(failResult.failures.length > 0);
  assert.ok(failResult.ruleResults.some(r => r.ruleId === "RULE-EXCESSIVE-COUPLING" && r.result === "FAIL"));
  assert.ok(failResult.ruleResults.some(r => r.ruleId === "RULE-MISSING-TEST-PROTECTION" && r.result === "FAIL"));
  console.log("  ✓ Test 3 PASSED (Failed critical rules produce FAIL overall)");

  // -------------------------------------------------------------
  // Test 4: Unknown state
  // -------------------------------------------------------------
  console.log("Test 4: Unknown state (missing evidence)...");
  const unknownComponentResult = evaluateComponentQualityGates(cleanSymbol, null, null, {
    // Only smell provided; testGap, externalBoundary, safetyEnvelope missing
    smellInfo: { smells: [] }
  });

  assert.ok(unknownComponentResult.unknownChecks.length > 0);
  assert.ok(unknownComponentResult.ruleResults.some(r => r.ruleId === "RULE-MISSING-TEST-PROTECTION" && r.result === "UNKNOWN"));

  const emptyRepoResult = evaluateQualityGates({ symbols: [] }, { nodes: [], edges: [] }, []);
  assert.strictEqual(emptyRepoResult.overallResult, "UNKNOWN");
  assert.strictEqual(emptyRepoResult.confidence, "unknown");
  console.log("  ✓ Test 4 PASSED (Missing evidence preserves UNKNOWN state)");

  // -------------------------------------------------------------
  // Test 5: Multiple failures (Explicit listing)
  // -------------------------------------------------------------
  console.log("Test 5: Multiple failures explicitly reported...");
  const multiFailSymbol = {
    id: "ApexClass:MultiFailController",
    type: "ApexClass",
    name: "MultiFailController",
    parsed: { name: "MultiFailController", type: "ApexClass", sharing: "without sharing", soql: [{ object: "Account" }] }
  };

  const multiFailMetric = { id: "ApexClass:MultiFailController", fanIn: 15, fanOut: 15, coupling: 30 };
  const multiFailResult = evaluateComponentQualityGates(multiFailSymbol, null, multiFailMetric, {
    smellInfo: {
      smells: [
        { smell: "god-component" },
        { smell: "layer-violation" },
        { smell: "circular-dependency" }
      ]
    },
    debtInfo: { debtItems: [{ severity: "critical", debtCategory: "excessive-coupling" }] },
    bottleneckInfo: { isBottleneck: true },
    securityInfo: { metadata: { sharingModel: "without sharing" } },
    testGapInfo: { signal: "known-coverage-failure", hasTestGap: true, status: "KNOWN_COVERAGE_FAILURE" },
    safetyEnvelopeInfo: { safetyClassification: "BLOCKED" },
    cycles: [["ApexClass:MultiFailController", "ApexClass:OtherService"]]
  });

  assert.strictEqual(multiFailResult.overallResult, "FAIL");
  assert.ok(multiFailResult.failures.length >= 4, `Expected >= 4 failures, got ${multiFailResult.failures.length}`);
  const failedRuleIds = multiFailResult.failures.map(f => f.ruleId);
  assert.ok(failedRuleIds.includes("RULE-EXCESSIVE-COUPLING"));
  assert.ok(failedRuleIds.includes("RULE-CIRCULAR-DEPENDENCIES"));
  assert.ok(failedRuleIds.includes("RULE-MISSING-TEST-PROTECTION"));
  assert.ok(failedRuleIds.includes("RULE-SECURITY-BOUNDARY-VIOLATION"));
  assert.ok(failedRuleIds.includes("RULE-INVALID-ROLE-LAYER-RELATIONSHIPS"));
  console.log(`  ✓ Test 5 PASSED (${multiFailResult.failures.length} distinct rule failures explicitly reported)`);

  // -------------------------------------------------------------
  // Test 6: Multiple warnings
  // -------------------------------------------------------------
  console.log("Test 6: Multiple warnings explicitly reported...");
  const multiWarnResult = evaluateComponentQualityGates(warnSymbol, null, warnMetric, {
    smellInfo: { smells: [] },
    debtInfo: { debtItems: [] },
    bottleneckInfo: { isBottleneck: true }, // Warn 1
    externalBoundaryInfo: { hasExternalBoundary: true, boundaryTypes: ["HTTP"] }, // Warn 2
    securityInfo: { metadata: { sharingModel: "without sharing" } }, // Warn 3
    testGapInfo: { signal: "covered", hasTestGap: false, status: "COVERED" },
    safetyEnvelopeInfo: { safetyClassification: "SAFE_WITH_REVIEW" },
    domainInfo: { primary: "unknown" } // Warn 4
  });

  assert.strictEqual(multiWarnResult.overallResult, "WARN");
  assert.strictEqual(multiWarnResult.failures.length, 0);
  assert.ok(multiWarnResult.warnings.length >= 3);
  const warnRuleIds = multiWarnResult.warnings.map(w => w.ruleId);
  assert.ok(warnRuleIds.includes("RULE-ARCHITECTURAL-BOTTLENECK"));
  assert.ok(warnRuleIds.includes("RULE-UNSAFE-EXTERNAL-BOUNDARY"));
  assert.ok(warnRuleIds.includes("RULE-SECURITY-BOUNDARY-VIOLATION"));
  console.log(`  ✓ Test 6 PASSED (${multiWarnResult.warnings.length} distinct warnings explicitly reported)`);

  // -------------------------------------------------------------
  // Test 7: Severity ordering (CRITICAL > HIGH > MEDIUM > LOW)
  // -------------------------------------------------------------
  console.log("Test 7: Severity ordering verification...");
  const rawEvidence = [
    { rule: "medium-rule", detail: "Medium detail", severity: "MEDIUM" },
    { rule: "critical-rule", detail: "Critical detail", severity: "CRITICAL" },
    { rule: "low-rule", detail: "Low detail", severity: "LOW" },
    { rule: "high-rule", detail: "High detail", severity: "HIGH" }
  ];

  const sorted = sortEvidenceBySeverity(rawEvidence);
  assert.strictEqual(sorted[0].severity, "CRITICAL");
  assert.strictEqual(sorted[1].severity, "HIGH");
  assert.strictEqual(sorted[2].severity, "MEDIUM");
  assert.strictEqual(sorted[3].severity, "LOW");
  console.log("  ✓ Test 7 PASSED (Evidence correctly ordered: CRITICAL > HIGH > MEDIUM > LOW)");

  // -------------------------------------------------------------
  // Test 8: Rule determinism (100% repeatability)
  // -------------------------------------------------------------
  console.log("Test 8: Rule determinism (100% repeatability)...");
  const run1 = JSON.stringify(evaluateComponentQualityGates(multiFailSymbol, null, multiFailMetric, {
    smellInfo: { smells: [{ smell: "god-component" }] },
    testGapInfo: { signal: "no-test-evidence", hasTestGap: true }
  }));

  for (let i = 0; i < 10; i++) {
    const runN = JSON.stringify(evaluateComponentQualityGates(multiFailSymbol, null, multiFailMetric, {
      smellInfo: { smells: [{ smell: "god-component" }] },
      testGapInfo: { signal: "no-test-evidence", hasTestGap: true }
    }));
    assert.strictEqual(runN, run1, `Run ${i + 1} output differed from initial run`);
  }
  console.log("  ✓ Test 8 PASSED (100% deterministic repeatability verified across 10 runs)");

  // -------------------------------------------------------------
  // Test 9: Duplicate detection avoidance
  // -------------------------------------------------------------
  console.log("Test 9: Duplicate detection avoidance...");
  // Verifies that quality gates consume pre-computed smell/debt/bottleneck results
  // rather than re-implementing independent detection algorithms.
  const preComputedSmells = { smells: [{ smell: "god-component" }] };
  const preComputedDebt = { debtItems: [{ severity: "critical", debtCategory: "excessive-coupling" }] };

  const consumedGate = evaluateComponentQualityGates(failSymbol, null, failMetric, {
    smellInfo: preComputedSmells,
    debtInfo: preComputedDebt,
    testGapInfo: { signal: "covered", hasTestGap: false }
  });

  assert.ok(consumedGate.ruleResults.some(r => r.ruleId === "RULE-EXCESSIVE-COUPLING" && r.result === "FAIL"));
  assert.ok(consumedGate.ruleResults.some(r => r.ruleId === "RULE-SEVERE-ARCHITECTURE-DEBT" && r.result === "FAIL"));
  console.log("  ✓ Test 9 PASSED (Quality gate cleanly consumed pre-computed smell/debt intelligence)");

  // -------------------------------------------------------------
  // Test 10: BASE-ARCH authority enforcement
  // -------------------------------------------------------------
  console.log("Test 10: BASE-ARCH authority enforcement...");
  const deterministicFact = "FAIL";
  const conflictingLlmClaim = "PASS";
  const authorityCheck = enforceDeterministicAuthority(deterministicFact, conflictingLlmClaim);

  assert.strictEqual(authorityCheck.authoritativeValue, "FAIL");
  assert.strictEqual(authorityCheck.contradiction, true);
  assert.ok(authorityCheck.message.includes("Deterministic fact retained"));
  console.log("  ✓ Test 10 PASSED (Deterministic authority over contradictory LLM claims enforced)");

  // -------------------------------------------------------------
  // Test 11: Zero LLM calls verification
  // -------------------------------------------------------------
  console.log("Test 11: Zero LLM calls verification...");
  const moduleCode = fs.readFileSync(path.join(ROOT_DIR, "architecture-quality-gates.cjs"), "utf8");
  assert.ok(!moduleCode.includes("LlmClient"), "architecture-quality-gates.cjs must not import LlmClient");
  assert.ok(!moduleCode.includes("CacheManager"), "architecture-quality-gates.cjs must not import CacheManager");
  assert.ok(!moduleCode.includes("semantic-investigation-service"), "architecture-quality-gates.cjs must not import semantic-investigation-service");
  assert.ok(!moduleCode.includes("fetch("), "architecture-quality-gates.cjs must not issue network fetch requests");
  console.log("  ✓ Test 11 PASSED (0 LLM imports or network dependencies verified in architecture-quality-gates.cjs)");

  console.log("\nALL 11 ARCHITECTURE QUALITY GATES TESTS PASSED SUCCESSFULLY!");
}

if (require.main === module) {
  runQualityGateTests();
}

module.exports = { runQualityGateTests };
