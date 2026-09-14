/**
 * Deterministic Investigation Context Minimizer Test Suite (WAVE-E4)
 *
 * Verifies all required scenarios for WAVE-E4:
 *   1. Eligible responsibility task context minimization
 *   2. Eligible behavioral task context minimization
 *   3. Eligible change-impact task context minimization
 *   4. Irrelevant sections excluded
 *   5. Required evidence preserved (rule, detail, confidence, sourceCapability)
 *   6. UNKNOWN preserved
 *   7. Multiple relevant components handled
 *   8. Transitive dependency path retained
 *   9. Safe broader-context fallback
 *  10. 100% deterministic repeated output
 *  11. Context versioning
 *  12. Cache compatibility
 *  13. Rejected E3 task does not reach E4
 *  14. Eligible task reaches E4
 *  15. D5 decision context consumed directly
 *  16. Deterministic authority preserved over contradictory claims
 *  17. Zero LLM calls / 0 RL runtime dependencies
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const da = require("../dependency-analyzer.cjs");
const {
  CONTEXT_VERSION,
  minimizeInvestigationContext,
  minimizeInvestigationTasks,
  calculateByteSize
} = require("../investigation-context-minimizer.cjs");
const { evaluateArchitectureDecisionContext } = require("../architecture-decision-context.cjs");
const { filterInvestigationTasks } = require("../investigation-eligibility.cjs");

function runTest(testNumber, name, testFn) {
  try {
    testFn();
    console.log(`  ✓ Test ${testNumber} PASSED (${name})`);
  } catch (err) {
    console.error(`  ✕ Test ${testNumber} FAILED (${name})`);
    console.error(err);
    process.exit(1);
  }
}

console.log("Running Deterministic Investigation Context Minimizer Test Suite (WAVE-E4)...");
console.log("============================================================================");

// Sample symbol and D5 Decision Context setup
const sampleSymbol = {
  id: "ApexClass:AccountService",
  name: "AccountService",
  type: "ApexClass",
  file: "force-app/main/default/classes/AccountService.cls",
  parsed: {
    name: "AccountService",
    dependencies: [{ toName: "AccountSelector", type: "method-call" }]
  }
};

const d5ContextResult = evaluateArchitectureDecisionContext(sampleSymbol, {
  role: { primary: "service", confidence: "high" },
  layer: { primary: "business-logic", confidence: "high" },
  domain: { primary: "core-domain", confidence: "high" },
  dependencies: [{ to: "AccountSelector", type: "method-call" }],
  dependents: [{ from: "AccountController", type: "method-call" }],
  impact: { level: "MEDIUM", downstream: ["AccountSelector"], upstream: ["AccountController"] },
  changeRisk: { level: "MEDIUM" },
  safetyEnvelope: { safetyClassification: "SAFE", confidence: "high" },
  businessCriticality: { businessCriticality: "HIGH", confidence: "high" },
  architectureHealth: { overallHealth: "HEALTHY", confidence: "high" },
  architectureDebt: { debtItems: [] },
  bottlenecks: { isBottleneck: false },
  smells: { smells: [{ smellType: "tight-coupling", severity: "medium", description: "Slight coupling detected." }] },
  securityBoundaries: { metadata: { sharingModel: "with sharing" } },
  externalBoundaries: { hasExternalBoundary: false },
  testProtection: { status: "COVERED", signal: "covered" },
  qualityGates: { overallResult: "PASS" },
  duplicateResponsibility: { primary: "POSSIBLE_OVERLAP", confidence: "medium" }
});

const d5Context = d5ContextResult.architectureDecisionContext;

// Test 1: Eligible responsibility task context minimization
runTest(1, "Eligible responsibility task context minimization", () => {
  const task = {
    id: "INV-001",
    type: "duplicate-responsibility",
    question: "Disambiguate overlapping business responsibility between AccountService and AccountManager.",
    evidence: { rule: "duplicate-responsibility", detail: "Overlapping business methods detected." }
  };

  const res = minimizeInvestigationContext(task, d5Context);
  assert.strictEqual(res.contextSelection.category, "responsibility-overlap");
  assert.ok(res.contextSelection.includedSections.includes("duplicateResponsibility"));
  assert.ok(res.contextSelection.includedSections.includes("role"));
  assert.ok(res.contextSelection.includedSections.includes("domain"));
  assert.ok(res.contextSelection.includedSections.includes("smells"));
});

// Test 2: Eligible behavioral task context minimization
runTest(2, "Eligible behavioral task context minimization", () => {
  const task = {
    id: "INV-002",
    type: "dynamic-apex",
    question: "Determine runtime target class instantiated via Type.forName in AccountService.",
    evidence: { rule: "dynamic-apex", detail: "Type.forName call at line 45." }
  };

  const res = minimizeInvestigationContext(task, d5Context);
  assert.strictEqual(res.contextSelection.category, "behavioral-ambiguity");
  assert.ok(res.contextSelection.includedSections.includes("dependencies"));
  assert.ok(res.contextSelection.includedSections.includes("boundaries"));
  assert.ok(!res.contextSelection.includedSections.includes("architectureDebt"));
});

// Test 3: Eligible change-impact task context minimization
runTest(3, "Eligible change-impact task context minimization", () => {
  const task = {
    id: "INV-003",
    type: "change-impact",
    question: "Evaluate downstream blast radius impact of modifying AccountService signature.",
    evidence: { rule: "change-impact", detail: "Proposed modification to public interface." }
  };

  const res = minimizeInvestigationContext(task, d5Context);
  assert.strictEqual(res.contextSelection.category, "change-impact");
  assert.ok(res.contextSelection.includedSections.includes("impact"));
  assert.ok(res.contextSelection.includedSections.includes("safety"));
  assert.ok(res.contextSelection.includedSections.includes("testProtection"));
  assert.ok(res.contextSelection.includedSections.includes("qualityGates"));
});

// Test 4: Irrelevant sections excluded
runTest(4, "Irrelevant sections excluded and metrics reported", () => {
  const task = {
    id: "INV-004",
    type: "dynamic-apex",
    question: "Investigate dynamic Apex execution."
  };

  const res = minimizeInvestigationContext(task, d5Context);
  assert.ok(res.metrics.excludedSectionCount > 0, "Excluded section count should be > 0");
  assert.ok(res.metrics.minimizedContextSize < res.metrics.originalContextSize, "Minimized context size must be strictly smaller than original D5 context size");
  assert.ok(res.metrics.reductionRatio > 0, "Reduction ratio should be > 0");
});

// Test 5: Required evidence preserved
runTest(5, "Required evidence preserved", () => {
  const task = {
    id: "INV-005",
    type: "security-semantics",
    question: "Verify dynamic SOQL security enforcement.",
    evidence: { rule: "dynamic-soql-security", detail: "Unenforced string concatenation in query.", confidence: "high" }
  };

  const res = minimizeInvestigationContext(task, d5Context);
  assert.ok(Array.isArray(res.evidence) && res.evidence.length > 0);
  const taskEv = res.evidence.find(e => e.rule === "dynamic-soql-security");
  assert.ok(taskEv, "Task specific evidence must be preserved");
  assert.strictEqual(taskEv.confidence, "high");
});

// Test 6: UNKNOWN preserved
runTest(6, "UNKNOWN preserved explicitly", () => {
  const incompleteD5Context = {
    subject: { name: "UnknownClass" },
    unknowns: ["Sharing model is unspecified", "Test protection status unknown"]
  };

  const task = { id: "INV-006", type: "security-semantics", question: "Check security." };
  const res = minimizeInvestigationContext(task, incompleteD5Context);

  assert.ok(res.minimizedContext.unknowns);
  assert.strictEqual(res.minimizedContext.unknowns.length, 2);
});

// Test 7: Multiple relevant components
runTest(7, "Multiple relevant components handled", () => {
  const multiD5Context = {
    subject: { name: "AccountService" },
    dependencies: [{ to: "AccountSelector" }, { to: "AccountHelper" }],
    dependents: [{ from: "AccountController" }, { from: "AccountBatch" }]
  };

  const task = { id: "INV-007", type: "change-impact", question: "Evaluate change impact across components." };
  const res = minimizeInvestigationContext(task, multiD5Context);

  assert.strictEqual(res.minimizedContext.dependencies.length, 2);
  assert.strictEqual(res.minimizedContext.dependents.length, 2);
});

// Test 8: Transitive dependency path retained
runTest(8, "Transitive dependency path retained in change impact", () => {
  const pathD5Context = {
    subject: { name: "AccountService" },
    impact: {
      level: "HIGH",
      paths: [
        { path: ["AccountController", "AccountService", "AccountSelector"] }
      ]
    }
  };

  const task = { id: "INV-008", type: "change-impact", question: "Evaluate blast radius path." };
  const res = minimizeInvestigationContext(task, pathD5Context);

  assert.ok(res.minimizedContext.impact.paths);
  assert.strictEqual(res.minimizedContext.impact.paths[0].path.length, 3);
});

// Test 9: Safe broader-context fallback
runTest(9, "Safe broader-context fallback for unknown task types", () => {
  const task = {
    id: "INV-009",
    type: "custom-unrecognized-type",
    question: "Custom semantic question requiring unknown context scope."
  };

  const res = minimizeInvestigationContext(task, d5Context);
  assert.strictEqual(res.contextSelection.category, "generic-fallback");
  assert.ok(res.contextSelection.selectionReasons[0].includes("safe broader-context fallback"));
  assert.ok(res.contextSelection.includedSections.includes("architectureHealth"));
  assert.ok(res.contextSelection.includedSections.includes("architectureDebt"));
});

// Test 10: Deterministic repeated output
runTest(10, "100% deterministic repeated output across 10 runs", () => {
  const task = { id: "INV-010", type: "duplicate-responsibility", question: "Disambiguate overlap." };
  const first = JSON.stringify(minimizeInvestigationContext(task, d5Context));

  for (let i = 0; i < 10; i++) {
    const repeat = JSON.stringify(minimizeInvestigationContext(task, d5Context));
    assert.strictEqual(repeat, first, "Output must be 100% byte-for-byte identical across runs.");
  }
});

// Test 11: Context versioning
runTest(11, "Context versioning enforced", () => {
  const task = { id: "INV-011", type: "dynamic-apex", question: "Runtime target?" };
  const res = minimizeInvestigationContext(task, d5Context);

  assert.strictEqual(res.contextVersion, "1.0.0");
  assert.strictEqual(res.task.contextVersion, "1.0.0");
  assert.strictEqual(res.contextSelection.contextVersion, "1.0.0");
});

// Test 12: Cache compatibility
runTest(12, "Cache compatibility and contract version check", () => {
  assert.strictEqual(da.CONTEXT_VERSION, "1.0.0");
  assert.strictEqual(CONTEXT_VERSION, "1.0.0");
});

// Test 13: Rejected E3 task does not reach E4
runTest(13, "Rejected E3 task does not reach E4", () => {
  const deterministicallyResolvedCandidate = {
    id: "INV-013",
    type: "role-classification",
    question: "What is the role of AccountService?"
  };

  const e3Result = filterInvestigationTasks([deterministicallyResolvedCandidate], d5Context);
  assert.strictEqual(e3Result.investigationRequired, false);
  assert.strictEqual(e3Result.eligibleTasks.length, 0);

  // E4 should receive 0 tasks
  const e4MinimizedTasks = minimizeInvestigationTasks(e3Result.eligibleTasks, d5Context);
  assert.strictEqual(e4MinimizedTasks.length, 0);
});

// Test 14: Eligible task reaches E4
runTest(14, "Eligible task reaches E4 and gets context minimized", () => {
  const eligibleCandidate = {
    id: "INV-014",
    type: "dynamic-apex",
    question: "Determine runtime class instantiated via Type.forName in AccountService."
  };

  const e3Result = filterInvestigationTasks([eligibleCandidate], d5Context);
  assert.strictEqual(e3Result.investigationRequired, true);
  assert.strictEqual(e3Result.eligibleTasks.length, 1);

  const e4MinimizedTasks = minimizeInvestigationTasks(e3Result.eligibleTasks, d5Context);
  assert.strictEqual(e4MinimizedTasks.length, 1);
  assert.ok(e4MinimizedTasks[0].minimizedContext);
  assert.strictEqual(e4MinimizedTasks[0].contextVersion, "1.0.0");
});

// Test 15: D5 context consumed directly
runTest(15, "D5 decision context consumed directly without re-parsing", () => {
  const task = { id: "INV-015", type: "change-impact", question: "Check change impact." };
  const res = minimizeInvestigationContext(task, d5ContextResult); // Passing full D5 result

  assert.ok(res.minimizedContext.impact);
  assert.ok(res.minimizedContext.safety);
});

// Test 16: Authority preserved
runTest(16, "Deterministic authority preserved over contradictory claims", () => {
  const { enforceResultAuthority } = require("../semantic-investigation-adapter.cjs");

  const mockLlmResult = {
    component: "AccountService",
    taskResults: [
      {
        taskId: "INV-016",
        llmClaims: { sharingModel: "without sharing" }
      }
    ],
    contradictions: []
  };

  const mockDeterministicContext = {
    knownFacts: { sharingModel: "with sharing" }
  };

  const enforced = enforceResultAuthority(mockLlmResult, mockDeterministicContext);
  assert.strictEqual(enforced.deterministicFactsRetained, true);
  assert.strictEqual(enforced.contradictions.length, 1);
  assert.strictEqual(enforced.contradictions[0].resolution, "DETERMINISTIC_FACT_RETAINED");
});

// Test 17: Zero LLM calls / 0 RL dependencies
runTest(17, "0 LLM imports or runtime dependencies verified in investigation-context-minimizer.cjs", () => {
  const source = fs.readFileSync(path.join(__dirname, "../investigation-context-minimizer.cjs"), "utf8");
  const forbidden = ["openai", "anthropic", "langchain", "LlmClient", "semantic-investigation-service", "orchestrator"];

  for (const term of forbidden) {
    assert.strictEqual(source.includes(term), false, `Forbidden term '${term}' found in investigation-context-minimizer.cjs`);
  }
});

console.log("============================================================================");
console.log("ALL 17 DETERMINISTIC INVESTIGATION CONTEXT MINIMIZER TESTS PASSED!");
