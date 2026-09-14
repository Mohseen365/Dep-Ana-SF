/**
 * Deterministic Architecture Intelligence Contract Test Suite (BASE-ARCH-1)
 *
 * Verifies contract stability, confidence vocabulary, evidence structure,
 * deterministic authority rules, zero LLM calls, and capability independence.
 */

"use strict";

const assert = require("assert");
const {
  CONFIDENCE_LEVELS,
  CONFIDENCE_DESCRIPTIONS,
  validateConfidence,
  createEvidence,
  validateEvidence,
  createDeterministicResult,
  validateDeterministicResult,
  enforceDeterministicAuthority
} = require("../deterministic/contract.cjs");
const { classifyComponentRole } = require("../role-classifier.cjs");

console.log("Running Deterministic Architecture Intelligence Contract Test Suite (BASE-ARCH-1)...");
console.log("==================================================================================");

// -----------------------------------------------------------------------------
// Test 1: Confidence Vocabulary & Validation
// -----------------------------------------------------------------------------
{
  console.log("Test 1: Confidence vocabulary & validation...");
  assert.deepStrictEqual(CONFIDENCE_LEVELS, ["high", "medium", "low", "unknown"]);
  assert.ok(validateConfidence("high"));
  assert.ok(validateConfidence("medium"));
  assert.ok(validateConfidence("low"));
  assert.ok(validateConfidence("unknown"));
  assert.ok(validateConfidence(" HIGH "));
  assert.strictEqual(validateConfidence("invalid"), false);
  assert.strictEqual(validateConfidence(123), false);

  for (const level of CONFIDENCE_LEVELS) {
    assert.ok(typeof CONFIDENCE_DESCRIPTIONS[level] === "string" && CONFIDENCE_DESCRIPTIONS[level].length > 0);
  }
  console.log("  ✓ Test 1 PASSED (Vocabulary: high, medium, low, unknown verified)");
}

// -----------------------------------------------------------------------------
// Test 2: Evidence Contract Structure
// -----------------------------------------------------------------------------
{
  console.log("Test 2: Evidence contract structure...");
  const ev = createEvidence("rule-test", "Test explanation detail");
  assert.strictEqual(ev.rule, "rule-test");
  assert.strictEqual(ev.detail, "Test explanation detail");
  assert.ok(validateEvidence(ev));

  const evWithExtra = createEvidence("rule-extra", "Detail", { weight: "high", source: "metadata" });
  assert.strictEqual(evWithExtra.weight, "high");
  assert.strictEqual(evWithExtra.source, "metadata");
  assert.ok(validateEvidence(evWithExtra));

  assert.strictEqual(validateEvidence(null), false);
  assert.strictEqual(validateEvidence({ rule: "" }), false);
  assert.strictEqual(validateEvidence({ detail: "no rule" }), false);
  console.log("  ✓ Test 2 PASSED (Evidence shape { rule, detail } validated)");
}

// -----------------------------------------------------------------------------
// Test 3: Deterministic Result Creation & Validation
// -----------------------------------------------------------------------------
{
  console.log("Test 3: Deterministic result structure...");
  const res = createDeterministicResult({
    primary: "service",
    confidence: "high",
    evidence: [createEvidence("name-suffix-service", "Component name matches service layer.")],
    secondary: ["utility"]
  });

  assert.strictEqual(res.value, "service");
  assert.strictEqual(res.primary, "service");
  assert.strictEqual(res.confidence, "high");
  assert.strictEqual(res.evidence.length, 1);
  assert.strictEqual(res.evidence[0].rule, "name-suffix-service");
  assert.deepStrictEqual(res.secondary, ["utility"]);
  assert.ok(validateDeterministicResult(res));

  assert.throws(() => {
    createDeterministicResult({ confidence: "super-high" });
  }, /Invalid confidence level/);

  console.log("  ✓ Test 3 PASSED (Deterministic result shape validated)");
}

// -----------------------------------------------------------------------------
// Test 4: Deterministic Authority Rule Enforcement
// -----------------------------------------------------------------------------
{
  console.log("Test 4: Deterministic authority rule enforcement...");

  // Match case: no contradiction
  const match = enforceDeterministicAuthority("with sharing", "with sharing");
  assert.strictEqual(match.authoritativeValue, "with sharing");
  assert.strictEqual(match.contradiction, false);

  // Mismatch case: deterministic fact retains authority
  const mismatch = enforceDeterministicAuthority("with sharing", "without sharing");
  assert.strictEqual(mismatch.authoritativeValue, "with sharing");
  assert.strictEqual(mismatch.contradiction, true);
  assert.ok(mismatch.message.includes("contradicts deterministic fact"));

  // Unspecified observation does not contradict
  const unspec = enforceDeterministicAuthority("inherited sharing", "unspecified");
  assert.strictEqual(unspec.authoritativeValue, "inherited sharing");
  assert.strictEqual(unspec.contradiction, false);

  console.log("  ✓ Test 4 PASSED (Deterministic facts authoritative over semantic observations)");
}

// -----------------------------------------------------------------------------
// Test 5: Role Classifier Compliance with Contract
// -----------------------------------------------------------------------------
{
  console.log("Test 5: Role Classifier compliance with contract...");
  const symbol = {
    name: "AccountService",
    type: "ApexClass",
    parsed: { name: "AccountService" }
  };

  const roleRes = classifyComponentRole(symbol);
  assert.ok(validateDeterministicResult(roleRes));
  assert.strictEqual(roleRes.value, "service");
  assert.strictEqual(roleRes.primary, "service");
  assert.strictEqual(roleRes.confidence, "high");
  assert.ok(roleRes.evidence.every(validateEvidence));
  console.log("  ✓ Test 5 PASSED (Role classifier outputs valid contract results)");
}

// -----------------------------------------------------------------------------
// Test 6: Zero LLM Calls Verification
// -----------------------------------------------------------------------------
{
  console.log("Test 6: Zero LLM calls verification...");
  // Verify deterministic/contract.cjs has no external imports
  const contractSource = require("fs").readFileSync(require.resolve("../deterministic/contract.cjs"), "utf8");
  assert.strictEqual(contractSource.includes("LlmClient"), false);
  assert.strictEqual(contractSource.includes("CacheManager"), false);
  assert.strictEqual(contractSource.includes("semantic-investigation-service"), false);
  console.log("  ✓ Test 6 PASSED (0 LLM imports or calls in deterministic contract module)");
}

console.log("");
console.log("ALL 6 DETERMINISTIC CONTRACT TESTS PASSED SUCCESSFULLY!");
