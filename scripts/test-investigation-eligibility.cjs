/**
 * Test Suite: Deterministic Investigation Eligibility Engine (WAVE-E3)
 *
 * Verifies all 15 required scenarios for deterministic investigation eligibility:
 *   1. Zero candidates
 *   2. All candidates deterministically resolved
 *   3. One valid semantic question
 *   4. Multiple valid questions
 *   5. Duplicate questions
 *   6. Bounded questions
 *   7. High-risk but deterministic component
 *   8. Low-risk semantic ambiguity
 *   9. Role/layer already known
 *  10. Dependency/impact already known
 *  11. Business-critical but deterministic
 *  12. Unknown evidence
 *  13. Contradictory signals
 *  14. Existing P4 compatibility
 *  15. Zero LLM calls
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  evaluateTaskEligibility,
  filterInvestigationTasks,
  ELIGIBILITY_DECISIONS
} = require("../investigation-eligibility.cjs");
const { validateDeterministicResult } = require("../deterministic/contract.cjs");

function runEligibilityTests() {
  console.log("Running Deterministic Investigation Eligibility Test Suite (WAVE-E3)...");
  console.log("=====================================================================");

  // Test 1: Zero candidates
  console.log("Test 1: Zero candidates...");
  {
    const res = filterInvestigationTasks([]);
    assert.strictEqual(res.summary.candidateTaskCount, 0);
    assert.strictEqual(res.summary.eligibleTaskCount, 0);
    assert.strictEqual(res.investigationRequired, false);
    console.log("  ✓ Test 1 PASSED (0 candidates yields 0 eligible tasks and investigationRequired=false)");
  }

  // Test 2: All candidates deterministically resolved
  console.log("Test 2: All candidates deterministically resolved...");
  {
    const candidates = [
      { id: "INV-001", type: "role-classification", question: "What is the role of this component?" },
      { id: "INV-002", type: "impact-analysis", question: "Calculate impact and dependencies" }
    ];
    const context = {
      roleInfo: { primary: "controller" },
      impact: { directDependentsCount: 5 }
    };
    const res = filterInvestigationTasks(candidates, context);
    assert.strictEqual(res.summary.candidateTaskCount, 2);
    assert.strictEqual(res.summary.eligibleTaskCount, 0);
    assert.strictEqual(res.summary.rejectedTaskCount, 2);
    assert.strictEqual(res.investigationRequired, false);
    assert.strictEqual(res.rejectedTasks[0].reason.includes("already"), true);
    console.log("  ✓ Test 2 PASSED (All deterministically answerable questions rejected)");
  }

  // Test 3: One valid semantic question
  console.log("Test 3: One valid semantic question...");
  {
    const candidates = [
      { id: "INV-001", type: "dynamic-apex", question: "Determine the runtime target of Type.forName(dynStr).newInstance()" }
    ];
    const res = filterInvestigationTasks(candidates, {});
    assert.strictEqual(res.summary.candidateTaskCount, 1);
    assert.strictEqual(res.summary.eligibleTaskCount, 1);
    assert.strictEqual(res.investigationRequired, true);
    assert.strictEqual(res.eligibleTasks[0].id, "INV-001");
    console.log("  ✓ Test 3 PASSED (Valid dynamic Apex question yields ELIGIBLE)");
  }

  // Test 4: Multiple valid questions
  console.log("Test 4: Multiple valid questions...");
  {
    const candidates = [
      { id: "INV-001", type: "dynamic-apex", question: "Determine dynamic Apex target" },
      { id: "INV-002", type: "dynamic-soql-security", question: "Verify dynamic SOQL string construction for FLS" },
      { id: "INV-003", type: "unresolved-reference", question: "Classify unresolved symbol ExternalHelper" }
    ];
    const res = filterInvestigationTasks(candidates, {});
    assert.strictEqual(res.summary.candidateTaskCount, 3);
    assert.strictEqual(res.summary.eligibleTaskCount, 3);
    assert.strictEqual(res.investigationRequired, true);
    console.log("  ✓ Test 4 PASSED (Multiple genuine semantic questions preserved)");
  }

  // Test 5: Duplicate questions
  console.log("Test 5: Duplicate questions...");
  {
    const candidates = [
      { id: "INV-001", type: "dynamic-apex", question: "Determine dynamic Apex runtime class target" },
      { id: "INV-002", type: "dynamic-apex", question: "Determine dynamic Apex runtime class target" }
    ];
    const res = filterInvestigationTasks(candidates, {});
    assert.strictEqual(res.summary.candidateTaskCount, 2);
    assert.strictEqual(res.summary.eligibleTaskCount, 1);
    assert.strictEqual(res.summary.deduplicatedTaskCount, 1);
    console.log("  ✓ Test 5 PASSED (Duplicate semantic tasks collapsed into 1)");
  }

  // Test 6: Bounded questions
  console.log("Test 6: Bounded questions...");
  {
    const candidates = [];
    for (let i = 1; i <= 15; i++) {
      candidates.push({ id: `INV-${i}`, type: "unresolved-reference", question: `Unresolved symbol ref #${i}` });
    }
    const res = filterInvestigationTasks(candidates, {}, { maxTasks: 5 });
    assert.strictEqual(res.summary.candidateTaskCount, 15);
    assert.strictEqual(res.summary.eligibleTaskCount, 5);
    assert.strictEqual(res.summary.boundedTaskCount, 10);
    console.log("  ✓ Test 6 PASSED (Task count correctly bounded to max limit)");
  }

  // Test 7: High-risk but deterministic component
  console.log("Test 7: High-risk but deterministic component...");
  {
    const candidates = [
      { id: "INV-001", type: "impact-analysis", question: "What depends on this critical bottleneck component?" },
      { id: "INV-002", type: "role-classification", question: "What is the role of this god class?" }
    ];
    const context = {
      isBottleneck: true,
      impact: { directDependentsCount: 50 },
      roleInfo: { primary: "god-component" }
    };
    const res = filterInvestigationTasks(candidates, context);
    assert.strictEqual(res.summary.eligibleTaskCount, 0, "High structural risk alone must NOT make tasks eligible!");
    assert.strictEqual(res.investigationRequired, false);
    console.log("  ✓ Test 7 PASSED (High risk != LLM: deterministic high-risk questions rejected)");
  }

  // Test 8: Low-risk semantic ambiguity
  console.log("Test 8: Low-risk semantic ambiguity...");
  {
    const candidates = [
      { id: "INV-001", type: "duplicate-responsibility", question: "Determine whether HelperA and HelperB implement overlapping business responsibility" }
    ];
    const context = {
      impact: { directDependentsCount: 1 }
    };
    const res = filterInvestigationTasks(candidates, context);
    assert.strictEqual(res.summary.eligibleTaskCount, 1);
    assert.strictEqual(res.investigationRequired, true);
    console.log("  ✓ Test 8 PASSED (Low-risk semantic ambiguity correctly yields ELIGIBLE task)");
  }

  // Test 9: Role/layer already known
  console.log("Test 9: Role/layer already known...");
  {
    const task1 = { id: "T1", type: "role", question: "What is the role of this class?" };
    const task2 = { id: "T2", type: "layer", question: "What is the layer of this class?" };
    const context = {
      roleInfo: { primary: "selector" },
      layerInfo: { primary: "data" }
    };
    const eval1 = evaluateTaskEligibility(task1, context);
    const eval2 = evaluateTaskEligibility(task2, context);

    assert.strictEqual(eval1.eligibility, "NOT_ELIGIBLE");
    assert.strictEqual(eval2.eligibility, "NOT_ELIGIBLE");
    console.log("  ✓ Test 9 PASSED (Known role and layer questions rejected)");
  }

  // Test 10: Dependency/impact already known
  console.log("Test 10: Dependency/impact already known...");
  {
    const task = { id: "T1", type: "impact", question: "What depends on this class and what is its blast radius?" };
    const context = { impact: { directDependentsCount: 10 } };
    const evalRes = evaluateTaskEligibility(task, context);
    assert.strictEqual(evalRes.eligibility, "NOT_ELIGIBLE");
    console.log("  ✓ Test 10 PASSED (Known dependency impact question rejected)");
  }

  // Test 11: Business-critical but deterministic
  console.log("Test 11: Business-critical but deterministic...");
  {
    const candidates = [
      { id: "INV-001", type: "security-semantics", question: "Verify sharing model of PaymentGateway" }
    ];
    const context = {
      businessCriticality: "CRITICAL",
      knownFacts: { sharingModel: "with sharing", securityEnforced: true, hasDynamicApex: false }
    };
    const res = filterInvestigationTasks(candidates, context);
    assert.strictEqual(res.summary.eligibleTaskCount, 0, "Business critical component with established facts rejects LLM task");
    console.log("  ✓ Test 11 PASSED (Business critical component with known facts rejects LLM task)");
  }

  // Test 12: Unknown evidence
  console.log("Test 12: Unknown evidence...");
  {
    const evalNull = evaluateTaskEligibility(null, {});
    assert.strictEqual(evalNull.eligibility, "UNKNOWN");

    const evalUnk = evaluateTaskEligibility({ id: "T1", question: "Sample question" }, { unknownEvidence: true });
    assert.strictEqual(evalUnk.eligibility, "UNKNOWN");
    console.log("  ✓ Test 12 PASSED (Missing or unknown evidence yields UNKNOWN eligibility)");
  }

  // Test 13: Contradictory signals
  console.log("Test 13: Contradictory signals...");
  {
    const task = {
      id: "T1",
      type: "security-semantics",
      question: "Determine sharing model",
      deterministicFact: "with sharing",
      semanticObservation: "without sharing"
    };
    const evalRes = evaluateTaskEligibility(task, {});
    assert.strictEqual(evalRes.eligibility, "ELIGIBLE");
    assert.ok(evalRes.metadata.reasons[0].includes("Contradictory"), "Must state contradictory signals");
    console.log("  ✓ Test 13 PASSED (Contradictory signals trigger ELIGIBLE status)");
  }

  // Test 14: Existing P4 compatibility
  console.log("Test 14: Existing P4 compatibility...");
  {
    const da = require("../dependency-analyzer.cjs");
    assert.strictEqual(typeof da.evaluateTaskEligibility, "function");
    assert.strictEqual(typeof da.filterInvestigationTasks, "function");
    assert.ok(Array.isArray(da.ELIGIBILITY_DECISIONS));
    console.log("  ✓ Test 14 PASSED (Exports & P4 compatibility verified)");
  }

  // Test 15: Zero LLM calls verification
  console.log("Test 15: Zero LLM calls verification...");
  {
    const code = fs.readFileSync(path.join(__dirname, "../investigation-eligibility.cjs"), "utf8");
    const forbidden = ["openai", "anthropic", "langchain", "LlmClient", "semantic-investigation-service"];
    for (const term of forbidden) {
      assert.strictEqual(code.includes(term), false, `Module must not import '${term}'`);
    }
    console.log("  ✓ Test 15 PASSED (0 LLM imports or runtime dependencies verified in investigation-eligibility.cjs)");
  }

  console.log("\nALL 15 DETERMINISTIC INVESTIGATION ELIGIBILITY TESTS PASSED SUCCESSFULLY!\n");
}

if (require.main === module) {
  runEligibilityTests();
}

module.exports = { runEligibilityTests };
