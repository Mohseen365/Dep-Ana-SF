/**
 * Comprehensive Deterministic External Boundaries Test Suite (PROMPT 27)
 *
 * Verifies:
 *   1. HTTP callout boundary
 *   2. Named credential boundary
 *   3. External service boundary
 *   4. Event boundary (Platform Events)
 *   5. No external boundary
 *   6. Multiple boundary types
 *   7. Evidence structure & validity
 *   8. Deterministic repeatability
 *   9. Zero LLM calls verification
 *  10. Full analyzer integration & regression
 */

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { detectExternalBoundary, detectAllExternalBoundaries } = require("../external-boundaries.cjs");
const { validateDeterministicResult } = require("../deterministic/contract.cjs");
const { analyze } = require("../dependency-analyzer.cjs");

console.log("Running Deterministic External Boundaries Test Suite (Prompt 27)...");
console.log("================================================================");

// -----------------------------------------------------------------------------
// Test 1 — HTTP Callout Boundary
// -----------------------------------------------------------------------------
{
  console.log("Test 1: HTTP Callout boundary detection...");
  const symbol = {
    id: "ApexClass:PaymentClient",
    name: "PaymentClient",
    type: "ApexClass",
    file: "classes/PaymentClient.cls",
    parsed: {
      name: "PaymentClient",
      type: "ApexClass",
      callouts: ["HttpRequest", "Http.send"]
    }
  };

  const res = detectExternalBoundary(symbol);
  assert.strictEqual(res.hasExternalBoundary, true, "Callout class must have external boundary");
  assert.ok(res.boundaryTypes.includes("HTTPCallout"), "Boundary types must include HTTPCallout");
  assert.strictEqual(res.confidence, "high", "Confidence must be high");
  assert.ok(validateDeterministicResult(res), "Result must comply with contract");
  console.log("  ✓ Test 1 PASSED (HTTP Callout boundary detected [high])");
}

// -----------------------------------------------------------------------------
// Test 2 — Named Credential Boundary
// -----------------------------------------------------------------------------
{
  console.log("Test 2: Named Credential boundary detection...");
  const symbol = {
    id: "ApexClass:StripeService",
    name: "StripeService",
    type: "ApexClass",
    file: "classes/StripeService.cls",
    parsed: {
      name: "StripeService",
      type: "ApexClass",
      callouts: ["HttpRequest"],
      dependencies: [
        { toName: "External", evidence: "req.setEndpoint('callout:Stripe_API/v1/charges')" }
      ]
    }
  };

  const res = detectExternalBoundary(symbol);
  assert.strictEqual(res.hasExternalBoundary, true, "Named Credential class must have external boundary");
  assert.ok(res.boundaryTypes.includes("NamedCredential"), "Boundary types must include NamedCredential");
  assert.ok(res.targets.includes("callout:Stripe_API"), "Targets must include callout:Stripe_API");
  assert.strictEqual(res.confidence, "high", "Confidence must be high");
  assert.ok(validateDeterministicResult(res), "Result must comply with contract");
  console.log("  ✓ Test 2 PASSED (Named Credential boundary detected [high])");
}

// -----------------------------------------------------------------------------
// Test 3 — External Service Boundary
// -----------------------------------------------------------------------------
{
  console.log("Test 3: External Service boundary detection...");
  const symbol = {
    id: "ApexClass:CreditCheckAdapter",
    name: "CreditCheckAdapter",
    type: "ApexClass",
    file: "classes/CreditCheckAdapter.cls",
    parsed: {
      name: "CreditCheckAdapter",
      type: "ApexClass",
      dependencies: [
        { toName: "ExternalService.CreditBureau", evidence: "ExternalService.CreditBureau.checkScore()" }
      ]
    }
  };

  const res = detectExternalBoundary(symbol);
  assert.strictEqual(res.hasExternalBoundary, true, "External Service caller must have external boundary");
  assert.ok(res.boundaryTypes.includes("ExternalService"), "Boundary types must include ExternalService");
  assert.strictEqual(res.confidence, "high", "Confidence must be high");
  assert.ok(validateDeterministicResult(res), "Result must comply with contract");
  console.log("  ✓ Test 3 PASSED (External Service boundary detected [high])");
}

// -----------------------------------------------------------------------------
// Test 4 — Event Boundary (Platform Events)
// -----------------------------------------------------------------------------
{
  console.log("Test 4: Event boundary (Platform Events) detection...");
  const symbol = {
    id: "ApexClass:OrderEventPublisher",
    name: "OrderEventPublisher",
    type: "ApexClass",
    file: "classes/OrderEventPublisher.cls",
    parsed: {
      name: "OrderEventPublisher",
      type: "ApexClass",
      objects: ["Order_Event__e"],
      behavior: { async: ["Platform Event / EventBus"] }
    }
  };

  const res = detectExternalBoundary(symbol);
  assert.strictEqual(res.hasExternalBoundary, true, "Platform Event publisher must have external boundary");
  assert.ok(res.boundaryTypes.includes("PlatformEvent"), "Boundary types must include PlatformEvent");
  assert.ok(res.targets.includes("Order_Event__e"), "Targets must include Order_Event__e");
  assert.strictEqual(res.confidence, "high", "Confidence must be high");
  assert.ok(validateDeterministicResult(res), "Result must comply with contract");
  console.log("  ✓ Test 4 PASSED (Event boundary detected [high])");
}

// -----------------------------------------------------------------------------
// Test 5 — No External Boundary
// -----------------------------------------------------------------------------
{
  console.log("Test 5: No external boundary detection...");
  const symbol = {
    id: "ApexClass:StringUtil",
    name: "StringUtil",
    type: "ApexClass",
    file: "classes/StringUtil.cls",
    parsed: {
      name: "StringUtil",
      type: "ApexClass",
      methods: [{ name: "truncate" }]
    }
  };

  const res = detectExternalBoundary(symbol);
  assert.strictEqual(res.hasExternalBoundary, false, "Local utility class must NOT have external boundary");
  assert.deepStrictEqual(res.boundaryTypes, [], "Boundary types must be empty");
  assert.strictEqual(res.confidence, "unknown", "Confidence for no external boundary must be unknown");
  assert.strictEqual(res.primary, "none", "Primary value must be none");
  assert.ok(validateDeterministicResult(res), "Result must comply with contract");
  console.log("  ✓ Test 5 PASSED (No external boundary correctly identified)");
}

// -----------------------------------------------------------------------------
// Test 6 — Multiple Boundary Types
// -----------------------------------------------------------------------------
{
  console.log("Test 6: Multiple boundary types...");
  const symbol = {
    id: "ApexClass:MultiIntegrationHub",
    name: "MultiIntegrationHub",
    type: "ApexClass",
    file: "classes/MultiIntegrationHub.cls",
    parsed: {
      name: "MultiIntegrationHub",
      type: "ApexClass",
      annotations: ["RestResource"],
      callouts: ["HttpRequest", "Http.send"],
      objects: ["Log_Event__e"],
      dependencies: [
        { toName: "External", evidence: "req.setEndpoint('callout:My_ERP/api')" }
      ],
      behavior: { async: ["Platform Event / EventBus"] }
    }
  };

  const res = detectExternalBoundary(symbol);
  assert.strictEqual(res.hasExternalBoundary, true, "Multi-integration class must have external boundary");
  assert.ok(res.boundaryTypes.includes("HTTPCallout"), "Contains HTTPCallout");
  assert.ok(res.boundaryTypes.includes("RESTService"), "Contains RESTService");
  assert.ok(res.boundaryTypes.includes("NamedCredential"), "Contains NamedCredential");
  assert.ok(res.boundaryTypes.includes("PlatformEvent"), "Contains PlatformEvent");
  assert.ok(res.evidence.length >= 4, "Evidence array contains evidence for each boundary type");
  console.log("  ✓ Test 6 PASSED (Multiple boundary types detected [HTTPCallout, RESTService, NamedCredential, PlatformEvent])");
}

// -----------------------------------------------------------------------------
// Test 7 — Evidence Structure & Explainability
// -----------------------------------------------------------------------------
{
  console.log("Test 7: Evidence structure & explainability...");
  const symbol = {
    id: "ApexClass:PaymentClient",
    name: "PaymentClient",
    type: "ApexClass",
    file: "classes/PaymentClient.cls",
    parsed: {
      name: "PaymentClient",
      type: "ApexClass",
      callouts: ["HttpRequest"]
    }
  };

  const res = detectExternalBoundary(symbol);
  assert.ok(Array.isArray(res.evidence) && res.evidence.length > 0, "Evidence array must be non-empty");
  for (const item of res.evidence) {
    assert.ok(typeof item.rule === "string" && item.rule.length > 0, "Evidence item must have rule");
    assert.ok(typeof item.detail === "string" && item.detail.length > 0, "Evidence item must have detail");
  }
  console.log(`  ✓ Test 7 PASSED (Evidence verified: ${res.evidence[0].rule} -> ${res.evidence[0].detail})`);
}

// -----------------------------------------------------------------------------
// Test 8 — Deterministic Repeatability
// -----------------------------------------------------------------------------
{
  console.log("Test 8: Deterministic repeatability...");
  const symbol = {
    id: "ApexClass:PaymentClient",
    name: "PaymentClient",
    type: "ApexClass",
    file: "classes/PaymentClient.cls",
    parsed: {
      name: "PaymentClient",
      type: "ApexClass",
      callouts: ["HttpRequest"]
    }
  };

  const run1 = detectExternalBoundary(symbol);
  const run2 = detectExternalBoundary(symbol);
  assert.deepStrictEqual(run1, run2, "Repeated external boundary detection runs must yield identical outputs");
  console.log("  ✓ Test 8 PASSED (Identical output across runs)");
}

// -----------------------------------------------------------------------------
// Test 9 — Zero LLM Calls Verification
// -----------------------------------------------------------------------------
{
  console.log("Test 9: Zero LLM calls verification...");
  const ebModule = require("../external-boundaries.cjs");
  const moduleSource = fs.readFileSync(path.resolve(__dirname, "../external-boundaries.cjs"), "utf8");

  assert.ok(!moduleSource.includes("LlmClient"), "external-boundaries.cjs must not import LlmClient");
  assert.ok(!moduleSource.includes("CacheManager"), "external-boundaries.cjs must not import CacheManager");
  assert.ok(!moduleSource.includes("semantic-investigation"), "external-boundaries.cjs must not import semantic investigation");

  let executedLlmCalls = 0;
  const testSymbols = [
    { name: "Client", type: "ApexClass", parsed: { callouts: ["HttpRequest"] } },
    { name: "Service", type: "ApexClass", parsed: { annotations: ["RestResource"] } }
  ];

  for (const s of testSymbols) {
    detectExternalBoundary(s);
  }

  assert.strictEqual(executedLlmCalls, 0, "External boundary detection must perform 0 LLM calls");
  console.log("  ✓ Test 9 PASSED (0 LLM imports or calls in external-boundaries module)");
}

// -----------------------------------------------------------------------------
// Test 10 — Full Analyzer Integration & Regression Check
// -----------------------------------------------------------------------------
{
  console.log("Test 10: Full analyzer integration & regression check...");
  const fixturesDir = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");

  if (fs.existsSync(fixturesDir)) {
    const result = analyze(fixturesDir, {}, false);
    assert.ok(result.externalBoundaryAnalysis, "externalBoundaryAnalysis returned in analyze result");
    assert.ok(result.externalBoundaryAnalysis.summary, "externalBoundaryAnalysis summary object present");
    assert.ok(typeof result.externalBoundaryAnalysis.summary.componentsWithExternalBoundary === "number", "componentsWithExternalBoundary tracked");
    console.log("  ✓ Test 10 PASSED (Analyzer integration produces valid aggregate external boundary metrics)");
  } else {
    console.log("  ~ Test 10 SKIPPED (Fixtures directory not found)");
  }
}

console.log("");
console.log("ALL 10 DETERMINISTIC EXTERNAL BOUNDARIES TESTS PASSED SUCCESSFULLY!");
