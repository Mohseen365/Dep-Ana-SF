/**
 * Deterministic Safety Envelope Test Suite (WAVE-C1)
 *
 * Verifies that the Safety Envelope capability deterministically classifies
 * architectural risk and blockers (SAFE, SAFE_WITH_REVIEW, HIGH_RISK, BLOCKED, UNKNOWN)
 * with 0 LLM calls and strict BASE-ARCH-1 contract compliance.
 */

"use strict";

const path = require("path");
const assert = require("assert");
const fs = require("fs");

const {
  classifyComponentSafetyEnvelope,
  classifyAllSafetyEnvelopes,
  SAFETY_CLASSIFICATIONS,
  SAFETY_THRESHOLDS
} = require("../safety-envelope.cjs");

const { enforceDeterministicAuthority } = require("../deterministic/contract.cjs");
const { analyze } = require("../dependency-analyzer.cjs");

function runTests() {
  console.log("Running Deterministic Safety Envelope Test Suite (WAVE-C1)...");
  console.log("==========================================================");

  // -------------------------------------------------------------
  // Test 1: Clearly safe component -> SAFE
  // -------------------------------------------------------------
  console.log("Test 1: Clearly safe component classification...");
  const safeSymbol = {
    id: "ApexClass:SimpleHelper",
    name: "SimpleHelper",
    type: "ApexClass",
    parsed: {
      sharing: "with sharing",
      methods: [{ name: "calculateTotal" }]
    }
  };
  const safeMetric = { fanIn: 1, fanOut: 1, coupling: 2 };
  const safeTestGap = { hasTestGap: false, status: "COVERED", signal: "covered" };

  const result1 = classifyComponentSafetyEnvelope(
    safeSymbol,
    null,
    safeMetric,
    null,
    { testGapInfo: safeTestGap }
  );

  assert.strictEqual(result1.safetyClassification, "SAFE");
  assert.strictEqual(result1.value, "SAFE");
  assert.strictEqual(result1.confidence, "high");
  assert.strictEqual(result1.blockers.length, 0);
  assert.ok(result1.safeguards.length > 0);
  console.log("  ✓ Test 1 PASSED (Clearly safe component classified as 'SAFE')");

  // -------------------------------------------------------------
  // Test 2: High-impact component -> HIGH_RISK
  // -------------------------------------------------------------
  console.log("Test 2: High-impact component classification...");
  const highImpactSymbol = {
    id: "ApexClass:CoreDomainService",
    name: "CoreDomainService",
    type: "ApexClass",
    parsed: {
      sharing: "with sharing",
      methods: [{ name: "execute" }]
    }
  };
  const highMetric = { fanIn: 10, fanOut: 5, coupling: 15 };
  const highSim = {
    metadata: {
      blastRadiusLevel: "LARGE",
      transitiveDependents: [
        { id: "Dep1" }, { id: "Dep2" }, { id: "Dep3" }, { id: "Dep4" }, { id: "Dep5" }, { id: "Dep6" }
      ]
    }
  };

  const result2 = classifyComponentSafetyEnvelope(
    highImpactSymbol,
    null,
    highMetric,
    null,
    {
      testGapInfo: safeTestGap,
      simulationResult: highSim
    }
  );

  assert.strictEqual(result2.safetyClassification, "HIGH_RISK");
  assert.strictEqual(result2.confidence, "high");
  assert.ok(result2.riskFactors.some(r => r.rule === "high-coupling" || r.rule === "broad-transitive-impact"));
  console.log("  ✓ Test 2 PASSED (High-impact component classified as 'HIGH_RISK')");

  // -------------------------------------------------------------
  // Test 3: Security-boundary component -> BLOCKED
  // -------------------------------------------------------------
  console.log("Test 3: Security-boundary component classification...");
  const securitySymbol = {
    id: "ApexClass:UnsecuredEndpointController",
    name: "UnsecuredEndpointController",
    type: "ApexClass",
    parsed: {
      sharing: "without sharing",
      annotations: ["RestResource"],
      dml: [{ operation: "insert", variable: "acc" }],
      methods: [{ name: "doPost" }]
    }
  };
  const securityEntryPoint = { isEntryPoint: true, primary: "RestResource" };

  const result3 = classifyComponentSafetyEnvelope(
    securitySymbol,
    null,
    null,
    null,
    {
      entryPointInfo: securityEntryPoint,
      testGapInfo: safeTestGap
    }
  );

  assert.strictEqual(result3.safetyClassification, "BLOCKED");
  assert.strictEqual(result3.confidence, "high");
  assert.ok(result3.blockers.some(b => b.rule === "critical-security-boundary-impact"));
  console.log("  ✓ Test 3 PASSED (Security-boundary violation classified as 'BLOCKED')");

  // -------------------------------------------------------------
  // Test 4: External-boundary component -> BLOCKED / HIGH_RISK
  // -------------------------------------------------------------
  console.log("Test 4: External-boundary component classification...");
  const externalSymbol = {
    id: "ApexClass:PaymentGatewayIntegration",
    name: "PaymentGatewayIntegration",
    type: "ApexClass",
    parsed: {
      sharing: "with sharing",
      callouts: ["HttpRequest", "WebServiceCallout"],
      methods: [{ name: "processPayment" }]
    }
  };
  const externalBoundaryInfo = {
    hasExternalBoundary: true,
    boundaryTypes: ["HTTPCallout", "NamedCredential"],
    value: "HTTPCallout"
  };

  const result4 = classifyComponentSafetyEnvelope(
    externalSymbol,
    null,
    { fanIn: 2, fanOut: 2, coupling: 4 },
    null,
    {
      externalBoundaryInfo,
      testGapInfo: safeTestGap
    }
  );

  assert.strictEqual(result4.safetyClassification, "BLOCKED");
  assert.strictEqual(result4.confidence, "high");
  assert.ok(result4.blockers.some(b => b.rule === "critical-external-boundary-impact"));
  console.log("  ✓ Test 4 PASSED (Critical external boundary concentration classified as 'BLOCKED')");

  // -------------------------------------------------------------
  // Test 5: High business-criticality component with inadequate test evidence -> BLOCKED
  // -------------------------------------------------------------
  console.log("Test 5: High business criticality + test gap classification...");
  const criticalSymbol = {
    id: "ApexClass:BillingEngine",
    name: "BillingEngine",
    type: "ApexClass",
    parsed: {
      annotations: ["BusinessCritical"],
      methods: [{ name: "runBilling" }]
    }
  };
  const testGap = {
    hasTestGap: true,
    signal: "no-test-evidence",
    status: "NO_TEST_EVIDENCE",
    reason: "No direct test evidence found"
  };
  const criticalityInfo = {
    businessCriticality: "high",
    value: "high",
    confidence: "high"
  };

  const result5 = classifyComponentSafetyEnvelope(
    criticalSymbol,
    null,
    null,
    null,
    {
      criticalityInfo,
      testGapInfo: testGap
    }
  );

  assert.strictEqual(result5.safetyClassification, "BLOCKED");
  assert.strictEqual(result5.confidence, "high");
  assert.ok(result5.blockers.some(b => b.rule === "critical-business-component-test-gap"));
  console.log("  ✓ Test 5 PASSED (High business criticality + test gap correctly classified as 'BLOCKED')");

  // -------------------------------------------------------------
  // Test 6: Insufficient test evidence on non-critical component -> SAFE_WITH_REVIEW
  // -------------------------------------------------------------
  console.log("Test 6: Insufficient test evidence on standard component...");
  const standardSymbol = {
    id: "ApexClass:FormatUtils",
    name: "FormatUtils",
    type: "ApexClass",
    parsed: {
      sharing: "with sharing",
      methods: [{ name: "formatCurrency" }]
    }
  };

  const result6 = classifyComponentSafetyEnvelope(
    standardSymbol,
    null,
    { fanIn: 1, fanOut: 0, coupling: 1 },
    null,
    {
      testGapInfo: testGap
    }
  );

  assert.strictEqual(result6.safetyClassification, "SAFE_WITH_REVIEW");
  assert.ok(result6.riskFactors.some(r => r.rule === "test-gap-present"));
  console.log("  ✓ Test 6 PASSED (Minor test gap on standard component classified as 'SAFE_WITH_REVIEW')");

  // -------------------------------------------------------------
  // Test 7: Multiple simultaneous risk factors -> HIGH_RISK
  // -------------------------------------------------------------
  console.log("Test 7: Multiple simultaneous risk factors...");
  const multiRiskSymbol = {
    id: "ApexClass:ComplexHubController",
    name: "ComplexHubController",
    type: "ApexClass",
    parsed: {
      sharing: "inherited sharing",
      methods: [{ name: "handleAction" }]
    }
  };
  const multiMetric = { fanIn: 9, fanOut: 6, coupling: 15 };
  const entryPointInfo = { isEntryPoint: true, primary: "AuraEnabled" };
  const smellsInfo = {
    hasSmells: true,
    smells: [{ smell: "god-component" }]
  };

  const result7 = classifyComponentSafetyEnvelope(
    multiRiskSymbol,
    null,
    multiMetric,
    null,
    {
      entryPointInfo,
      smellsInfo,
      testGapInfo: safeTestGap
    }
  );

  assert.strictEqual(result7.safetyClassification, "HIGH_RISK");
  assert.ok(result7.riskFactors.length >= 3);
  console.log("  ✓ Test 7 PASSED (Multiple simultaneous risk factors correctly evaluated)");

  // -------------------------------------------------------------
  // Test 8: Unknown / incomplete evidence -> UNKNOWN
  // -------------------------------------------------------------
  console.log("Test 8: Unknown / incomplete evidence...");
  const result8Null = classifyComponentSafetyEnvelope(null);
  assert.strictEqual(result8Null.safetyClassification, "UNKNOWN");
  assert.strictEqual(result8Null.confidence, "unknown");

  const unparsedSymbol = { id: "ApexClass:Empty" };
  const result8Unparsed = classifyComponentSafetyEnvelope(unparsedSymbol);
  assert.strictEqual(result8Unparsed.safetyClassification, "UNKNOWN");
  assert.strictEqual(result8Unparsed.confidence, "unknown");
  console.log("  ✓ Test 8 PASSED (Incomplete / null evidence correctly classified as 'UNKNOWN')");

  // -------------------------------------------------------------
  // Test 9: Deterministic authority & BASE-ARCH-1 contract
  // -------------------------------------------------------------
  console.log("Test 9: Deterministic authority & BASE-ARCH-1 contract validation...");
  assert.ok(SAFETY_CLASSIFICATIONS.includes(result1.value));
  assert.ok(Array.isArray(result1.evidence));
  assert.ok(result1.evidence.every(e => typeof e.rule === "string" && e.rule.length > 0 && typeof e.detail === "string"));

  const authorityCheck = enforceDeterministicAuthority(result1.value, "LLM claims component is SAFE");
  assert.strictEqual(authorityCheck.authoritativeValue, "SAFE");
  assert.strictEqual(authorityCheck.source, "deterministic");
  console.log("  ✓ Test 9 PASSED (BASE-ARCH-1 contract & deterministic authority verified)");

  // -------------------------------------------------------------
  // Test 10: Zero LLM calls verification
  // -------------------------------------------------------------
  console.log("Test 10: Zero LLM calls verification...");
  const moduleContent = fs.readFileSync(
    path.join(__dirname, "../safety-envelope.cjs"),
    "utf8"
  );
  assert.strictEqual(moduleContent.includes("LlmClient"), false);
  assert.strictEqual(moduleContent.includes("refactor-litellm"), false);
  assert.strictEqual(moduleContent.includes("CacheManager"), false);
  assert.strictEqual(moduleContent.includes("semantic-investigation-service"), false);
  console.log("  ✓ Test 10 PASSED (0 LLM imports or runtime calls in safety-envelope.cjs)");

  // -------------------------------------------------------------
  // Test 11: Full analyzer integration regression check
  // -------------------------------------------------------------
  console.log("Test 11: Full analyzer integration regression check...");
  const externalFixturesDir = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");
  const localFixturesDir = path.resolve(__dirname, "../audit-fixtures/force-app/main/default");
  const fixtureDir = fs.existsSync(localFixturesDir) ? localFixturesDir : (fs.existsSync(externalFixturesDir) ? externalFixturesDir : null);

  if (fixtureDir) {
    const analysis = analyze(fixtureDir, { quiet: true }, false);
    assert.ok(analysis.registry);
    assert.ok(analysis.graph);
    assert.ok(analysis.safetyEnvelopeAnalysis);
    assert.ok(analysis.safetyEnvelopeAnalysis.summary);
    assert.strictEqual(
      analysis.safetyEnvelopeAnalysis.summary.totalComponents,
      analysis.registry.symbols.length
    );

    const firstSymbol = analysis.registry.symbols[0];
    const safetyForFirst = analysis.safetyEnvelopeAnalysis.symbolSafetyEnvelopes.get(firstSymbol.id);
    assert.ok(safetyForFirst);
    assert.ok(SAFETY_CLASSIFICATIONS.includes(safetyForFirst.safetyClassification));
    console.log("  ✓ Test 11 PASSED (Full analyzer integration verified)");
  } else {
    console.log("  ~ Test 11 SKIPPED (Fixture directory not found)");
  }

  console.log("\nALL DETERMINISTIC SAFETY ENVELOPE TESTS PASSED SUCCESSFULLY!\n");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
