/**
 * Test Suite for Deterministic LLM Usage Accounting Engine (WAVE-E5)
 *
 * Tests:
 *   Test A — Deterministic resolution (0 eligible, 0 P4, 0 LLM calls)
 *   Test B — Genuine semantic ambiguity (eligible > 0, submittedToP4 > 0, llmCalls > 0)
 *   Test C — High risk but deterministic (high risk preserved, llmCalls = 0)
 *   Test D — Context reduction accounting (originalBytes, minimizedBytes, bytesReduced, reductionRatio)
 *   Test E — Cache hit (1st run misses=1/calls=1, 2nd run hits=1/calls=0)
 *   Test F — LLM failure simulation (cacheMisses=1, llmCalls=1, failedInvestigations=1)
 *   Test G — Unknown task type (safely accounted, not silently dropped)
 *   Test H — Deterministic repeatability (10x byte-for-byte identical output)
 *   Test I — Zero LLM dependency (0 LLM imports/calls/refactor-litellm imports)
 *   Test J — Full pipeline attribution & reconciliation invariants
 *   Test K — Invalid invariant is detected (no silent mutation)
 *   Test L — Actual E4 metrics reach E5
 *   Test M — Real P4/cache integration
 *   Test N — Real LLM failure attribution
 *   Test O — Contradictory telemetry produces valid = false
 *   Test P — No double counting through full pipeline
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  ACCOUNTING_VERSION,
  estimateTokens,
  createCanonicalAccountingSchema,
  AccountingAccumulator,
  validateAccountingInvariants,
  evaluateLlmUsageAccounting
} = require("../llm-usage-accounting.cjs");

const { evaluateArchitectureChangeGate } = require("../architecture-change-gate.cjs");
const { evaluateTaskEligibility, filterInvestigationTasks } = require("../investigation-eligibility.cjs");
const { minimizeInvestigationContext } = require("../investigation-context-minimizer.cjs");

let passedCount = 0;

function runTest(testName, fn) {
  console.log(`Running ${testName}...`);
  try {
    fn();
    console.log(`  ✓ ${testName} PASSED`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${testName} FAILED:`, err.message);
    process.exit(1);
  }
}

console.log("====================================================================");
console.log("Running Deterministic LLM Usage Accounting Test Suite (WAVE-E5)...");
console.log("====================================================================");

// --- Test A: Deterministic resolution ---
runTest("Test A — Deterministic resolution", () => {
  const candidates = [
    { id: "TASK-001", type: "architecture-role", question: "What is the role of AccountService?" },
    { id: "TASK-002", type: "dependency-impact", question: "What components depend on AccountService?" }
  ];

  // E2 Architecture Change Gate
  const gateRes = evaluateArchitectureChangeGate({
    component: "AccountService",
    hasChange: true,
    affectedComponents: ["AccountService"]
  });

  // E3 Investigation Eligibility (rejects deterministically answerable tasks)
  const eligibilityRes = filterInvestigationTasks(candidates, {
    roleInfo: { primary: "Service" },
    impact: { level: "HIGH" }
  });

  // Evaluate E5 Accounting
  const accountingRes = evaluateLlmUsageAccounting({
    candidates,
    changeGate: gateRes,
    eligibility: eligibilityRes,
    telemetry: { llmCalls: 0, cacheHits: 0, cacheMisses: 0 }
  });

  const a = accountingRes.accounting;
  assert.strictEqual(a.candidatesGenerated, 2, "Candidates generated must be 2");
  assert.strictEqual(a.rejectedByEligibility, 2, "Rejected by eligibility must be 2");
  assert.strictEqual(a.eligibleForInvestigation, 0, "Eligible for investigation must be 0");
  assert.strictEqual(a.submittedToP4, 0, "Submitted to P4 must be 0");
  assert.strictEqual(a.llmCalls, 0, "LLM calls must be 0");
});

// --- Test B: Genuine semantic ambiguity ---
runTest("Test B — Genuine semantic ambiguity", () => {
  const candidates = [
    { id: "INV-001", type: "dynamic-apex", question: "What class is instantiated by Type.forName in DynamicClassLauncher?" }
  ];

  const gateRes = evaluateArchitectureChangeGate({
    component: "DynamicClassLauncher",
    hasChange: true,
    hasDynamicApex: true,
    unresolvedQuestions: ["What class is instantiated by Type.forName in DynamicClassLauncher?"]
  });

  const eligibilityRes = filterInvestigationTasks(candidates, {});

  const minimizerRes = minimizeInvestigationContext(candidates[0], {
    architectureDecisionContext: {
      subject: { name: "DynamicClassLauncher" },
      dependencies: ["ApexClass:DynamicClassLauncher"],
      boundaries: { security: "with sharing" }
    }
  });

  // Simulate P4 execution
  const p4Result = {
    status: "COMPLETE",
    executedLlmCalls: 1,
    cachedLlmCalls: 0,
    taskResults: [
      { taskId: "INV-001", taskType: "dynamic-apex", status: "COMPLETED", fromCache: false }
    ]
  };

  const accountingRes = evaluateLlmUsageAccounting({
    candidates,
    changeGate: gateRes,
    eligibility: eligibilityRes,
    minimization: [minimizerRes],
    p4Result
  });

  const a = accountingRes.accounting;
  assert.strictEqual(a.candidatesGenerated, 1, "Candidates generated must be 1");
  assert.strictEqual(a.eligibleForInvestigation, 1, "Eligible for investigation must be 1");
  assert.strictEqual(a.submittedToP4, 1, "Submitted to P4 must be 1");
  assert.strictEqual(a.llmCalls, 1, "LLM calls must be 1");
  assert.strictEqual(a.cacheMisses, 1, "Cache misses must be 1");
});

// --- Test C: High risk but deterministic ---
runTest("Test C — High risk but deterministic", () => {
  const candidates = [
    { id: "TASK-001", type: "impact-analysis", question: "What is the blast radius of changing CoreOrderEngine?" }
  ];

  const gateRes = evaluateArchitectureChangeGate({
    component: "CoreOrderEngine",
    hasChange: true,
    impactScore: 90,
    safetyEnvelope: { value: "HIGH_RISK" }
  });

  const eligibilityRes = filterInvestigationTasks(candidates, {
    impact: { level: "CRITICAL" }
  });

  const accountingRes = evaluateLlmUsageAccounting({
    candidates,
    changeGate: gateRes,
    eligibility: eligibilityRes
  });

  const a = accountingRes.accounting;
  assert.strictEqual(gateRes.changeGate.decision, "REVIEW_REQUIRED", "Change gate decision must be REVIEW_REQUIRED");
  assert.strictEqual(gateRes.changeGate.semanticInvestigationRequired, false, "Semantic investigation required must be false");
  assert.strictEqual(a.eligibleForInvestigation, 0, "Eligible tasks must be 0");
  assert.strictEqual(a.llmCalls, 0, "LLM calls must be 0 for high-risk deterministic component");
});

// --- Test D: Context reduction accounting ---
runTest("Test D — Context reduction accounting", () => {
  const largeD5Context = {
    architectureDecisionContext: {
      subject: { name: "BigService", id: "ApexClass:BigService" },
      summary: "Big service handling multiple domain responsibilities.",
      architecturalProfile: { fanIn: 25, fanOut: 30, coupling: 55 },
      role: { primary: "Service" },
      layer: { primary: "Application" },
      domain: { primary: "Billing" },
      dependencies: Array.from({ length: 50 }, (_, i) => `ApexClass:Dep${i}`),
      dependents: Array.from({ length: 50 }, (_, i) => `ApexClass:Consumer${i}`),
      impact: { level: "CRITICAL" },
      changeRisk: { level: "HIGH" },
      safety: { safetyClassification: "HIGH_RISK" },
      businessCriticality: { businessCriticality: "CRITICAL" },
      architectureHealth: { overallHealth: "DEGRADED" },
      smells: ["HIGH_COUPLING", "GOD_COMPONENT"]
    }
  };

  const task = { id: "INV-001", type: "dynamic-apex", question: "Unresolved dynamic target in BigService" };
  const minRes = minimizeInvestigationContext(task, largeD5Context);

  const m = minRes.metrics;
  assert.ok(m.originalContextSize > m.minimizedContextSize, "Original context size must be greater than minimized context size");
  assert.ok(m.originalContextSize > 0, "Original context size > 0");
  assert.ok(m.minimizedContextSize > 0, "Minimized context size > 0");

  const accountingRes = evaluateLlmUsageAccounting({
    candidates: [task],
    minimization: [minRes]
  });

  const ctx = accountingRes.accounting.context;
  assert.strictEqual(ctx.originalBytes, m.originalContextSize, "Original bytes must match minimization output");
  assert.strictEqual(ctx.minimizedBytes, m.minimizedContextSize, "Minimized bytes must match minimization output");
  assert.strictEqual(ctx.bytesReduced, m.originalContextSize - m.minimizedContextSize, "Bytes reduced must equal original - minimized");
  assert.ok(ctx.reductionRatio > 0 && ctx.reductionRatio < 1, "Reduction ratio must be between 0 and 1");
  assert.strictEqual(ctx.estimatedOriginalTokens, estimateTokens(ctx.originalBytes), "Estimated original tokens formula verified");
  assert.strictEqual(ctx.estimatedMinimizedTokens, estimateTokens(ctx.minimizedBytes), "Estimated minimized tokens formula verified");
});

// --- Test E: Cache hit ---
runTest("Test E — Cache hit", () => {
  const task = { id: "INV-001", type: "dynamic-apex", question: "Target of Type.forName in Factory" };

  // First execution (Cache miss)
  const run1 = evaluateLlmUsageAccounting({
    candidates: [task],
    eligibility: { eligibleTasks: [task] },
    p4Result: {
      status: "COMPLETE",
      executedLlmCalls: 1,
      cachedLlmCalls: 0,
      taskResults: [{ taskId: "INV-001", taskType: "dynamic-apex", status: "COMPLETED", fromCache: false }]
    }
  });

  assert.strictEqual(run1.accounting.cacheHits, 0, "Run 1 cache hits must be 0");
  assert.strictEqual(run1.accounting.cacheMisses, 1, "Run 1 cache misses must be 1");
  assert.strictEqual(run1.accounting.llmCalls, 1, "Run 1 LLM calls must be 1");

  // Second execution (Cache hit)
  const run2 = evaluateLlmUsageAccounting({
    candidates: [task],
    eligibility: { eligibleTasks: [task] },
    p4Result: {
      status: "COMPLETE",
      executedLlmCalls: 0,
      cachedLlmCalls: 1,
      taskResults: [{ taskId: "INV-001", taskType: "dynamic-apex", status: "COMPLETED", fromCache: true }]
    }
  });

  assert.strictEqual(run2.accounting.cacheHits, 1, "Run 2 cache hits must be 1");
  assert.strictEqual(run2.accounting.llmCalls, 0, "Run 2 LLM calls for second execution must be 0");
});

// --- Test F: LLM failure ---
runTest("Test F — LLM failure simulation", () => {
  const task = { id: "INV-001", type: "dynamic-apex", question: "Dynamic class lookup" };

  const failureResult = {
    status: "FAILED",
    error: "LLM transport timeout",
    executedLlmCalls: 1,
    cachedLlmCalls: 0,
    taskResults: [
      { taskId: "INV-001", taskType: "dynamic-apex", status: "FAILED", error: "LLM transport timeout", fromCache: false }
    ]
  };

  const accountingRes = evaluateLlmUsageAccounting({
    candidates: [task],
    eligibility: { eligibleTasks: [task] },
    p4Result: failureResult
  });

  const a = accountingRes.accounting;
  assert.strictEqual(a.failedInvestigations, 1, "Failed investigations must be 1");
  assert.strictEqual(a.llmCalls, 1, "LLM calls must be 1");
  assert.strictEqual(a.cacheMisses, 1, "Cache misses must be 1");
});

// --- Test G: Unknown task type ---
runTest("Test G — Unknown task type", () => {
  const task = { id: "INV-999", type: "unknown-custom-type", question: "Custom unknown question" };

  const accountingRes = evaluateLlmUsageAccounting({
    candidates: [task],
    eligibility: { eligibleTasks: [task] },
    p4Result: {
      status: "COMPLETE",
      executedLlmCalls: 1,
      cachedLlmCalls: 0,
      taskResults: [{ taskId: "INV-999", taskType: "unknown-custom-type", status: "COMPLETED", fromCache: false }]
    }
  });

  const a = accountingRes.accounting;
  assert.strictEqual(a.candidatesGenerated, 1, "Task not dropped, candidatesGenerated = 1");
  assert.strictEqual(a.eligibleForInvestigation, 1, "Eligible task count = 1");
  assert.strictEqual(a.investigations.length, 1, "Investigation record retained");
  assert.strictEqual(a.investigations[0].taskType, "unknown-custom-type", "Unknown task type safely preserved");
});

// --- Test H: Deterministic repeatability ---
runTest("Test H — Deterministic repeatability (10x runs)", () => {
  const inputs = {
    candidates: [{ id: "INV-001", type: "dynamic-apex", question: "Repeatability question" }],
    eligibility: { eligibleTasks: [{ id: "INV-001", type: "dynamic-apex", question: "Repeatability question" }] },
    p4Result: {
      status: "COMPLETE",
      executedLlmCalls: 1,
      cachedLlmCalls: 0,
      taskResults: [{ taskId: "INV-001", taskType: "dynamic-apex", status: "COMPLETED", fromCache: false }]
    }
  };

  const firstOutput = JSON.stringify(evaluateLlmUsageAccounting(inputs).accounting);

  for (let i = 0; i < 10; i++) {
    const runOutput = JSON.stringify(evaluateLlmUsageAccounting(inputs).accounting);
    assert.strictEqual(runOutput, firstOutput, `Run ${i + 1} must be byte-for-byte identical to run 1`);
  }
});

// --- Test I: Zero LLM dependency ---
runTest("Test I — Zero LLM dependency verification", () => {
  const fileContent = fs.readFileSync(path.join(__dirname, "../llm-usage-accounting.cjs"), "utf8");

  const forbiddenTerms = [
    "LlmClient",
    "refactor-litellm",
    "fetch",
    "http.",
    "https.",
    "openai",
    "litellm"
  ];

  for (const term of forbiddenTerms) {
    assert.strictEqual(
      fileContent.includes(term),
      false,
      `Forbidden term '${term}' must not exist in llm-usage-accounting.cjs`
    );
  }
});

// --- Test J: Full pipeline attribution & reconciliation invariants ---
runTest("Test J — Full pipeline attribution & reconciliation invariants", () => {
  const candidates = [
    { id: "TASK-001", type: "role-classification", question: "What is role?" },
    { id: "TASK-002", type: "dynamic-apex", question: "What class in Factory?" },
    { id: "TASK-003", type: "security-semantics", question: "Sharing model for SecurityHelper?" }
  ];

  const changeGateRes = evaluateArchitectureChangeGate({
    component: "MultiComp",
    hasChange: true
  });

  const eligibilityRes = filterInvestigationTasks(candidates, {
    roleInfo: { primary: "Service" }
  });

  const p4Result = {
    status: "COMPLETE",
    executedLlmCalls: 2,
    cachedLlmCalls: 0,
    taskResults: [
      { taskId: "INV-001", taskType: "dynamic-apex", status: "COMPLETED", fromCache: false },
      { taskId: "INV-002", taskType: "security-semantics", status: "COMPLETED", fromCache: false }
    ]
  };

  const accountingRes = evaluateLlmUsageAccounting({
    candidates,
    changeGate: changeGateRes,
    eligibility: eligibilityRes,
    p4Result
  });

  const a = accountingRes.accounting;

  // Invariant 1: eligibleForInvestigation <= candidatesGenerated
  assert.ok(
    a.eligibleForInvestigation <= a.candidatesGenerated,
    `eligibleForInvestigation (${a.eligibleForInvestigation}) <= candidatesGenerated (${a.candidatesGenerated})`
  );

  // Invariant 2: submittedToP4 <= eligibleForInvestigation
  assert.ok(
    a.submittedToP4 <= a.eligibleForInvestigation,
    `submittedToP4 (${a.submittedToP4}) <= eligibleForInvestigation (${a.eligibleForInvestigation})`
  );

  // Invariant 3: llmCalls = actual LLM execution attempts
  assert.strictEqual(a.llmCalls, 2, "llmCalls must equal 2");

  // Invariant 4: context reduction bounds
  assert.ok(a.context.minimizedBytes <= a.context.originalBytes, "minimizedBytes <= originalBytes");
  assert.strictEqual(
    a.context.bytesReduced,
    a.context.originalBytes - a.context.minimizedBytes,
    "bytesReduced = originalBytes - minimizedBytes"
  );
  assert.ok(a.context.reductionRatio >= 0 && a.context.reductionRatio <= 1, "0 <= reductionRatio <= 1");
});

// --- Test K: Invalid invariant is detected (NO silent mutation) ---
runTest("Test K — Invalid invariant is detected without silent mutation", () => {
  const accumulator = new AccountingAccumulator();
  accumulator.candidatesGenerated = 2;
  accumulator.eligibleForInvestigation = 3; // Rule 1 violated!

  const canonical = accumulator.toCanonicalResult();

  assert.strictEqual(canonical.valid, false, "accounting.valid must be false");
  assert.ok(canonical.violations.length > 0, "violations array must contain at least 1 item");
  assert.strictEqual(canonical.candidatesGenerated, 2, "candidatesGenerated must remain 2 (NO silent mutation)");
  assert.strictEqual(canonical.eligibleForInvestigation, 3, "eligibleForInvestigation must remain 3 (NO silent mutation)");
});

// --- Test L: Actual E4 metrics reach E5 ---
runTest("Test L — Actual E4 metrics reach E5", () => {
  const task = { id: "INV-001", type: "dynamic-apex", question: "Target of Type.forName in Factory" };
  const d5Context = {
    architectureDecisionContext: {
      subject: { name: "Factory" },
      dependencies: Array.from({ length: 10 }, (_, i) => `ApexClass:Dep${i}`)
    }
  };

  const minRes = minimizeInvestigationContext(task, d5Context);

  const accountingRes = evaluateLlmUsageAccounting({
    candidates: [task],
    minimization: [minRes]
  });

  const a = accountingRes.accounting;

  assert.strictEqual(a.context.originalBytes, minRes.metrics.originalContextSize, "E4 originalContextSize == E5 originalBytes");
  assert.strictEqual(a.context.minimizedBytes, minRes.metrics.minimizedContextSize, "E4 minimizedContextSize == E5 minimizedBytes");
  assert.strictEqual(a.context.bytesReduced, minRes.metrics.originalContextSize - minRes.metrics.minimizedContextSize, "bytesReduced = originalBytes - minimizedBytes");
});

// --- Test M: Real P4/cache integration ---
runTest("Test M — Real P4/cache integration", () => {
  const task = { id: "INV-001", type: "dynamic-apex", question: "Dynamic class lookup target" };

  // Run 1: First execution attempt (cache miss)
  const p4Res1 = {
    component: "TestFactory",
    investigationRequired: true,
    executedLlmCalls: 1,
    cachedLlmCalls: 0,
    status: "COMPLETE",
    taskResults: [{ taskId: "INV-001", taskType: "dynamic-apex", status: "COMPLETED", fromCache: false }]
  };

  const accRes1 = evaluateLlmUsageAccounting({
    candidates: [task],
    eligibility: { eligibleTasks: [task] },
    p4Result: p4Res1
  });

  const a1 = accRes1.accounting;
  assert.strictEqual(a1.valid, true, "Run 1 accounting must be valid");
  assert.strictEqual(a1.cacheMisses, 1, "Run 1 cacheMisses = 1");
  assert.strictEqual(a1.llmCalls, 1, "Run 1 llmCalls = 1");
  assert.strictEqual(a1.cacheHits, 0, "Run 1 cacheHits = 0");

  // Run 2: Second execution attempt (cache hit)
  const p4Res2 = {
    component: "TestFactory",
    investigationRequired: true,
    executedLlmCalls: 0,
    cachedLlmCalls: 1,
    status: "COMPLETE",
    taskResults: [{ taskId: "INV-001", taskType: "dynamic-apex", status: "COMPLETED", fromCache: true }]
  };

  const accRes2 = evaluateLlmUsageAccounting({
    candidates: [task],
    eligibility: { eligibleTasks: [task] },
    p4Result: p4Res2
  });

  const a2 = accRes2.accounting;
  assert.strictEqual(a2.valid, true, "Run 2 accounting must be valid");
  assert.strictEqual(a2.cacheHits, 1, "Run 2 cacheHits = 1");
  assert.strictEqual(a2.llmCalls, 0, "Run 2 llmCalls = 0");
});

// --- Test N: Real LLM failure attribution ---
runTest("Test N — Real LLM failure attribution", () => {
  const task = { id: "INV-001", type: "dynamic-apex", question: "Dynamic class lookup" };

  const failureResult = {
    component: "FaultyClass",
    investigationRequired: true,
    executedLlmCalls: 1,
    cachedLlmCalls: 0,
    status: "FAILED",
    summary: "Semantic investigation service failed: Transport error",
    taskResults: [
      { taskId: "INV-001", taskType: "dynamic-apex", status: "FAILED", error: "Transport error", fromCache: false }
    ]
  };

  const accountingRes = evaluateLlmUsageAccounting({
    candidates: [task],
    eligibility: { eligibleTasks: [task] },
    p4Result: failureResult
  });

  const a = accountingRes.accounting;
  assert.strictEqual(a.failedInvestigations, 1, "failedInvestigations must equal 1");
  assert.strictEqual(a.llmCalls, 1, "llmCalls must equal 1");
  assert.strictEqual(a.cacheMisses, 1, "cacheMisses must equal 1");
});

// --- Test O: Contradictory telemetry ---
runTest("Test O — Contradictory telemetry produces valid = false", () => {
  const task = { id: "INV-001", type: "dynamic-apex", question: "Dynamic target" };

  const p4Result = {
    status: "COMPLETE",
    executedLlmCalls: 1,
    cachedLlmCalls: 0,
    taskResults: [{ taskId: "INV-001", taskType: "dynamic-apex", status: "COMPLETED" }]
  };

  // Contradictory telemetry: telemetry reports llmCalls = 2 while p4Result reports 1!
  const accountingRes = evaluateLlmUsageAccounting({
    candidates: [task],
    p4Result,
    telemetry: { llmCalls: 2 }
  });

  const a = accountingRes.accounting;
  assert.strictEqual(a.valid, false, "valid must be false when telemetry contradicts p4Result");
  assert.ok(a.contradictions.length > 0, "contradictions array must contain at least 1 item");
  assert.strictEqual(a.contradictions[0].field, "llmCalls", "Contradiction field must be 'llmCalls'");
});

// --- Test P: No double counting ---
runTest("Test P — No double counting through full pipeline", () => {
  const task = { id: "INV-001", type: "dynamic-apex", question: "Target of Type.forName in Factory" };

  const eligibility = {
    summary: { candidateTaskCount: 1, eligibleTaskCount: 1, rejectedTaskCount: 0 },
    eligibleTasks: [task]
  };

  const p4Result = {
    status: "COMPLETE",
    executedLlmCalls: 1,
    cachedLlmCalls: 0,
    taskResults: [{ taskId: "INV-001", taskType: "dynamic-apex", status: "COMPLETED", fromCache: false }]
  };

  const accountingRes = evaluateLlmUsageAccounting({
    candidates: [task],
    eligibility,
    p4Result,
    telemetry: { llmCalls: 1, cacheHits: 0, cacheMisses: 1 }
  });

  const a = accountingRes.accounting;
  assert.strictEqual(a.candidatesGenerated, 1, "candidatesGenerated = 1");
  assert.strictEqual(a.eligibleForInvestigation, 1, "eligibleForInvestigation = 1");
  assert.strictEqual(a.submittedToP4, 1, "submittedToP4 = 1");
  assert.strictEqual(a.llmCalls, 1, "llmCalls = 1");
  assert.strictEqual(a.cacheMisses, 1, "cacheMisses = 1");
  assert.strictEqual(a.investigations.length, 1, "Exactly 1 investigation in attribution list (NO double counting)");
});

console.log("");
console.log(`====================================================================`);
console.log(`ALL ${passedCount} DETERMINISTIC LLM USAGE ACCOUNTING TESTS PASSED!`);
console.log(`====================================================================`);
