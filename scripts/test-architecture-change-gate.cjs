/**
 * Test Suite: Deterministic Architecture Change Gate Engine (WAVE-E2)
 *
 * Verifies all 15 required scenarios for the deterministic architecture change gate:
 *   1. No architecture change
 *   2. Harmless change
 *   3. Fully deterministic change
 *   4. High-risk but deterministic change (High risk != LLM)
 *   5. Low-risk semantic uncertainty (Low risk + semantic uncertainty = LLM)
 *   6. High-risk semantic uncertainty
 *   7. Safety blocker
 *   8. Quality-gate failure
 *   9. Governance violation
 *  10. Ambiguous responsibility
 *  11. Unknown evidence
 *  12. Contradictory signals
 *  13. Deterministic authority
 *  14. Zero LLM calls
 *  15. Existing P4 compatibility
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  evaluateArchitectureChangeGate,
  GATE_DECISIONS
} = require("../architecture-change-gate.cjs");
const { validateDeterministicResult } = require("../deterministic/contract.cjs");

function runChangeGateTests() {
  console.log("Running Deterministic Architecture Change Gate Test Suite (WAVE-E2)...");
  console.log("====================================================================");

  // Test 1: No architecture change
  console.log("Test 1: No architecture change...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: false,
      affectedComponents: []
    });
    assert.strictEqual(res.value, "NO_ANALYSIS_REQUIRED", "No change must yield NO_ANALYSIS_REQUIRED");
    assert.strictEqual(res.changeGate.semanticInvestigationRequired, false, "Semantic investigation must be false");
    assert.strictEqual(res.changeGate.analysisAvoided, true, "analysisAvoided must be true");
    assert.strictEqual(res.changeGate.llmCallsAvoided, 1, "llmCallsAvoided must be 1");
    assert.ok(validateDeterministicResult(res), "Result must comply with BASE-ARCH contract");
    console.log("  ✓ Test 1 PASSED (No architecture change yields NO_ANALYSIS_REQUIRED)");
  }

  // Test 2: Harmless change
  console.log("Test 2: Harmless change...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: true,
      affectedComponents: ["SimpleUtility"],
      safetyEnvelope: { value: "SAFE" },
      qualityGates: { value: "PASS" },
      impactScore: 5
    });
    assert.strictEqual(res.value, "DETERMINISTIC_ANALYSIS_SUFFICIENT", "Harmless change must yield DETERMINISTIC_ANALYSIS_SUFFICIENT");
    assert.strictEqual(res.changeGate.semanticInvestigationRequired, false);
    assert.strictEqual(res.changeGate.deterministicSufficient, true);
    assert.strictEqual(res.changeGate.llmCallsAvoided, 1);
    console.log("  ✓ Test 2 PASSED (Harmless change yields DETERMINISTIC_ANALYSIS_SUFFICIENT)");
  }

  // Test 3: Fully deterministic change
  console.log("Test 3: Fully deterministic change...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: true,
      affectedComponents: ["AccountTriggerHandler"],
      safetyEnvelope: { value: "SAFE" },
      qualityGates: { value: "PASS" },
      isBottleneck: false,
      hasDynamicApex: false,
      hasDynamicSoql: false
    });
    assert.strictEqual(res.value, "DETERMINISTIC_ANALYSIS_SUFFICIENT");
    assert.strictEqual(res.changeGate.semanticInvestigationRequired, false);
    assert.strictEqual(res.changeGate.deterministicOnlyResolution, true);
    console.log("  ✓ Test 3 PASSED (Fully deterministic change yields DETERMINISTIC_ANALYSIS_SUFFICIENT)");
  }

  // Test 4: High-risk but deterministic change (CRITICAL: High Risk != LLM)
  console.log("Test 4: High-risk but deterministic change (High Risk != LLM)...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: true,
      affectedComponents: ["CoreOrderEngine"],
      isBottleneck: true,
      businessCriticality: "CRITICAL",
      safetyEnvelope: { value: "HIGH_RISK", reasons: ["Central architectural hub with high blast radius"] },
      qualityGates: { value: "WARN" },
      impactScore: 85,
      // Completely deterministic, no semantic uncertainty!
      hasDynamicApex: false,
      hasDynamicSoql: false,
      unresolvedQuestions: []
    });
    assert.strictEqual(res.value, "REVIEW_REQUIRED", "High-risk deterministic change must yield REVIEW_REQUIRED");
    assert.strictEqual(res.changeGate.semanticInvestigationRequired, false, "High risk alone must NOT trigger LLM semantic investigation!");
    assert.strictEqual(res.changeGate.deterministicSufficient, true, "Deterministic evidence is sufficient for high-risk change");
    assert.strictEqual(res.changeGate.llmCallsAvoided, 1, "LLM call correctly avoided for high-risk deterministic change");
    console.log("  ✓ Test 4 PASSED (High risk != LLM: yields REVIEW_REQUIRED with semanticInvestigationRequired=false)");
  }

  // Test 5: Low-risk semantic uncertainty (CRITICAL: Low Risk + Semantic Uncertainty = LLM)
  console.log("Test 5: Low-risk semantic uncertainty (Low Risk + Semantic Uncertainty = LLM)...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: true,
      affectedComponents: ["MinorHelper"],
      safetyEnvelope: { value: "SAFE" },
      qualityGates: { value: "PASS" },
      impactScore: 2,
      // Genuine semantic uncertainty present!
      hasDynamicApex: true,
      unresolvedReferences: ["Type.forName(dynamicClassName).newInstance()"]
    });
    assert.strictEqual(res.value, "SEMANTIC_INVESTIGATION_REQUIRED", "Low-risk with semantic uncertainty must yield SEMANTIC_INVESTIGATION_REQUIRED");
    assert.strictEqual(res.changeGate.semanticInvestigationRequired, true, "Semantic investigation required for low-risk semantic uncertainty");
    assert.strictEqual(res.changeGate.deterministicSufficient, false);
    assert.strictEqual(res.changeGate.llmCallsAvoided, 0);
    console.log("  ✓ Test 5 PASSED (Low risk + semantic uncertainty = SEMANTIC_INVESTIGATION_REQUIRED)");
  }

  // Test 6: High-risk semantic uncertainty
  console.log("Test 6: High-risk semantic uncertainty...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: true,
      affectedComponents: ["PaymentGatewayRouter"],
      isBottleneck: true,
      safetyEnvelope: { value: "HIGH_RISK" },
      hasDynamicSoql: true,
      unresolvedQuestions: ["Which dynamic payment adapter is instantiated at runtime?"]
    });
    assert.strictEqual(res.value, "SEMANTIC_INVESTIGATION_REQUIRED");
    assert.strictEqual(res.changeGate.semanticInvestigationRequired, true);
    console.log("  ✓ Test 6 PASSED (High-risk semantic uncertainty correctly yields SEMANTIC_INVESTIGATION_REQUIRED)");
  }

  // Test 7: Safety blocker
  console.log("Test 7: Safety blocker...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: true,
      affectedComponents: ["UserDataAccessor"],
      safetyEnvelope: { value: "BLOCKED", reasons: ["Hard security boundary violation: without sharing accessing restricted object."] }
    });
    assert.strictEqual(res.value, "BLOCKED", "Safety envelope BLOCKED must yield BLOCKED decision");
    assert.strictEqual(res.changeGate.blockers.length, 1);
    assert.strictEqual(res.changeGate.semanticInvestigationRequired, false, "Pure deterministic safety blocker does NOT require LLM");
    console.log("  ✓ Test 7 PASSED (Safety blocker correctly yields BLOCKED)");
  }

  // Test 8: Quality-gate failure
  console.log("Test 8: Quality-gate failure...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: true,
      affectedComponents: ["LegacyGodClass"],
      qualityGates: { value: "FAIL", overallResult: "FAIL" }
    });
    assert.strictEqual(res.value, "BLOCKED");
    assert.ok(res.changeGate.blockers.some(b => b.includes("Quality gates")), "Blocker list must include quality gate failure");
    console.log("  ✓ Test 8 PASSED (Quality gate failure yields BLOCKED)");
  }

  // Test 9: Governance violation
  console.log("Test 9: Governance violation...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: true,
      affectedComponents: ["RestCustomEndpoint"],
      governance: { value: "VIOLATION", hasViolation: true, violationReason: "Public API modification without version deprecation notice" }
    });
    assert.strictEqual(res.value, "BLOCKED");
    assert.ok(res.changeGate.blockers.some(b => b.includes("Governance")), "Blocker list must include governance violation");
    console.log("  ✓ Test 9 PASSED (Governance violation yields BLOCKED)");
  }

  // Test 10: Ambiguous responsibility
  console.log("Test 10: Ambiguous responsibility...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: true,
      affectedComponents: ["OrderProcessorA", "OrderProcessorB"],
      duplicateResponsibility: { classification: "POSSIBLE_OVERLAP", requiresDomainDisambiguation: true }
    });
    assert.strictEqual(res.value, "SEMANTIC_INVESTIGATION_REQUIRED");
    assert.strictEqual(res.changeGate.semanticInvestigationRequired, true);
    assert.ok(res.changeGate.unresolvedQuestions.some(q => q.includes("Duplicate architectural responsibility")), "Unresolved questions must record duplicate responsibility ambiguity");
    console.log("  ✓ Test 10 PASSED (Ambiguous duplicate responsibility requires semantic investigation)");
  }

  // Test 11: Unknown evidence
  console.log("Test 11: Unknown evidence...");
  {
    const res1 = evaluateArchitectureChangeGate(null);
    assert.strictEqual(res1.value, "UNKNOWN");
    assert.strictEqual(res1.confidence, "unknown");

    const res2 = evaluateArchitectureChangeGate({ unknownEvidence: true });
    assert.strictEqual(res2.value, "UNKNOWN");
    assert.strictEqual(res2.confidence, "unknown");
    console.log("  ✓ Test 11 PASSED (Null or unknown evidence yields UNKNOWN decision)");
  }

  // Test 12: Contradictory signals
  console.log("Test 12: Contradictory signals...");
  {
    const res = evaluateArchitectureChangeGate({
      hasChange: true,
      affectedComponents: ["SecurityService"],
      deterministicFact: "with sharing",
      semanticClaim: "without sharing"
    });
    assert.strictEqual(res.value, "SEMANTIC_INVESTIGATION_REQUIRED");
    assert.strictEqual(res.changeGate.semanticInvestigationRequired, true);
    assert.ok(res.changeGate.unresolvedQuestions.some(q => q.includes("Contradictory")), "Must record contradictory signals");
    console.log("  ✓ Test 12 PASSED (Contradictory signals trigger SEMANTIC_INVESTIGATION_REQUIRED)");
  }

  // Test 13: Deterministic authority
  console.log("Test 13: Deterministic authority...");
  {
    const { enforceDeterministicAuthority } = require("../deterministic/contract.cjs");
    const check = enforceDeterministicAuthority("with sharing", "without sharing");
    assert.strictEqual(check.contradiction, true);
    assert.strictEqual(check.authoritativeValue, "with sharing", "Deterministic fact must remain authoritative");
    console.log("  ✓ Test 13 PASSED (Deterministic authority over contradictory LLM claims enforced)");
  }

  // Test 14: Zero LLM calls verification
  console.log("Test 14: Zero LLM calls verification...");
  {
    const code = fs.readFileSync(path.join(__dirname, "../architecture-change-gate.cjs"), "utf8");
    const forbidden = ["openai", "anthropic", "langchain", "LlmClient", "semantic-investigation-service"];
    for (const term of forbidden) {
      assert.strictEqual(code.includes(term), false, `Module must not import or reference '${term}'`);
    }
    console.log("  ✓ Test 14 PASSED (0 LLM imports or runtime dependencies verified in architecture-change-gate.cjs)");
  }

  // Test 15: Existing P4 compatibility
  console.log("Test 15: Existing P4 compatibility...");
  {
    const da = require("../dependency-analyzer.cjs");
    assert.strictEqual(typeof da.evaluateArchitectureChangeGate, "function", "evaluateArchitectureChangeGate must be exported by dependency-analyzer.cjs");
    assert.ok(Array.isArray(da.GATE_DECISIONS), "GATE_DECISIONS array must be exported");

    // Test buildLlmInvestigationContext gating simulation
    const sampleContext = {
      component: "SampleComponent",
      hasChange: true,
      safetyEnvelope: { value: "SAFE" },
      qualityGates: { value: "PASS" }
    };
    const gateRes = da.evaluateArchitectureChangeGate(sampleContext);
    assert.strictEqual(gateRes.changeGate.semanticInvestigationRequired, false, "Safe component yields semanticInvestigationRequired=false");
    console.log("  ✓ Test 15 PASSED (P4 compatibility & export boundary verified)");
  }

  console.log("\nALL 15 DETERMINISTIC ARCHITECTURE CHANGE GATE TESTS PASSED SUCCESSFULLY!\n");
}

if (require.main === module) {
  runChangeGateTests();
}

module.exports = { runChangeGateTests };
