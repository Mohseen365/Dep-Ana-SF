/**
 * Deterministic LLM Usage Accounting Engine (WAVE-E5)
 *
 * Observes and accounts for candidate generation, architecture change gating (E2),
 * investigation eligibility (E3), context minimization (E4), P4 semantic investigation,
 * cache hit/miss behavior, and actual LLM execution calls.
 *
 * Strict boundary rules:
 *   - Observability / accounting capability ONLY.
 *   - MUST NOT introduce new semantic decisions or recompute architectural facts.
 *   - 0 LLM calls or imports.
 *   - 0 external orchestrator runtime dependencies.
 *   - 100% deterministic, repeatable, and auditably explainable.
 *   - Preserves deterministic contract standards and reconciliation invariants.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

const ACCOUNTING_VERSION = "1.0.0";

/**
 * Deterministically estimates token usage from byte count.
 * Formula: ceil(bytes / 4)
 *
 * @param {number} bytes Byte count
 * @returns {number} Estimated token count
 */
function estimateTokens(bytes) {
  const b = typeof bytes === "number" && !isNaN(bytes) && bytes > 0 ? bytes : 0;
  return Math.ceil(b / 4);
}

/**
 * Creates a clean, initial canonical accounting data structure.
 *
 * @returns {Object} Canonical accounting object
 */
function createCanonicalAccountingSchema() {
  return {
    version: ACCOUNTING_VERSION,
    valid: true,
    violations: [],
    contradictions: [],
    candidatesGenerated: 0,
    rejectedByChangeGate: 0,
    rejectedByEligibility: 0,
    eligibleForInvestigation: 0,
    submittedToP4: 0,
    completedInvestigations: 0,
    failedInvestigations: 0,
    skippedInvestigations: 0,
    llmCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    context: {
      originalBytes: 0,
      minimizedBytes: 0,
      bytesReduced: 0,
      reductionRatio: 0,
      estimatedOriginalTokens: 0,
      estimatedMinimizedTokens: 0,
      estimatedTokensReduced: 0
    },
    investigations: []
  };
}

/**
 * Accumulator class to cleanly record and reconcile investigation stage events.
 */
class AccountingAccumulator {
  constructor() {
    this.investigationMap = new Map();
    this.valid = true;
    this.violations = [];
    this.contradictions = [];
    this.candidatesGenerated = 0;
    this.rejectedByChangeGate = 0;
    this.rejectedByEligibility = 0;
    this.eligibleForInvestigation = 0;
    this.submittedToP4 = 0;
    this.completedInvestigations = 0;
    this.failedInvestigations = 0;
    this.skippedInvestigations = 0;
    this.llmCalls = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.totalOriginalBytes = 0;
    this.totalMinimizedBytes = 0;
  }

  /**
   * Records candidates generated at candidate generation phase.
   */
  recordCandidatesGenerated(count = 1) {
    if (typeof count === "number" && count > 0) {
      this.candidatesGenerated += count;
    }
  }

  /**
   * Records candidate tasks rejected by E2 Architecture Change Gate.
   */
  recordRejectedByChangeGate(count = 1) {
    if (typeof count === "number" && count > 0) {
      this.rejectedByChangeGate += count;
    }
  }

  /**
   * Records candidate tasks rejected by E3 Investigation Eligibility.
   */
  recordRejectedByEligibility(count = 1) {
    if (typeof count === "number" && count > 0) {
      this.rejectedByEligibility += count;
    }
  }

  /**
   * Registers or updates a per-investigation attribution entry using a stable taskId.
   * Prevents double counting by keying on taskId.
   */
  recordInvestigationTask(taskRecord = {}) {
    if (!taskRecord || typeof taskRecord !== "object") return;

    const taskId = String(taskRecord.taskId || taskRecord.id || `INV-${this.investigationMap.size + 1}`);

    const existing = this.investigationMap.get(taskId) || {
      taskId,
      taskType: String(taskRecord.taskType || taskRecord.type || "unknown"),
      eligible: false,
      submittedToP4: false,
      status: "PENDING",
      cacheHit: false,
      llmCall: false,
      originalContextBytes: 0,
      minimizedContextBytes: 0,
      bytesReduced: 0
    };

    if (taskRecord.taskType) existing.taskType = String(taskRecord.taskType);
    if (taskRecord.eligible !== undefined) existing.eligible = Boolean(taskRecord.eligible);
    if (taskRecord.submittedToP4 !== undefined) existing.submittedToP4 = Boolean(taskRecord.submittedToP4);
    if (taskRecord.status) existing.status = String(taskRecord.status);
    if (taskRecord.cacheHit !== undefined) existing.cacheHit = Boolean(taskRecord.cacheHit);
    if (taskRecord.llmCall !== undefined) existing.llmCall = Boolean(taskRecord.llmCall);

    if (typeof taskRecord.originalContextBytes === "number") {
      existing.originalContextBytes = Math.max(0, taskRecord.originalContextBytes);
    }
    if (typeof taskRecord.minimizedContextBytes === "number") {
      existing.minimizedContextBytes = Math.max(0, taskRecord.minimizedContextBytes);
    }

    existing.bytesReduced = Math.max(0, existing.originalContextBytes - existing.minimizedContextBytes);

    this.investigationMap.set(taskId, existing);
  }

  /**
   * Ingests context minimization metrics from E4 minimization result.
   */
  recordContextMetrics({ originalBytes = 0, minimizedBytes = 0 } = {}) {
    if (typeof originalBytes === "number" && originalBytes >= 0) {
      this.totalOriginalBytes += originalBytes;
    }
    if (typeof minimizedBytes === "number" && minimizedBytes >= 0) {
      this.totalMinimizedBytes += minimizedBytes;
    }
  }

  /**
   * Finalizes and builds the canonical deterministic accounting schema.
   */
  toCanonicalResult() {
    const canonical = createCanonicalAccountingSchema();

    // Aggregations from investigation map
    const invList = Array.from(this.investigationMap.values()).sort((a, b) => a.taskId.localeCompare(b.taskId));

    let countEligible = 0;
    let countSubmitted = 0;
    let countCompleted = 0;
    let countFailed = 0;
    let countSkipped = 0;
    let countLlmCalls = 0;
    let countCacheHits = 0;
    let countCacheMisses = 0;
    let mapOrigBytes = 0;
    let mapMinBytes = 0;

    for (const inv of invList) {
      if (inv.eligible) countEligible++;
      if (inv.submittedToP4) countSubmitted++;

      if (inv.status === "COMPLETED" || inv.status === "COMPLETE") countCompleted++;
      else if (inv.status === "FAILED") countFailed++;
      else if (inv.status === "SKIPPED" || inv.status === "SKIPPED_DETERMINISTIC_COMPLETE") countSkipped++;

      if (inv.llmCall) countLlmCalls++;
      if (inv.cacheHit) countCacheHits++;
      else if (inv.submittedToP4 && inv.status !== "SKIPPED") countCacheMisses++;

      mapOrigBytes += inv.originalContextBytes || 0;
      mapMinBytes += inv.minimizedContextBytes || 0;
    }

    canonical.valid = this.valid;
    canonical.violations = [...this.violations];
    canonical.contradictions = [...this.contradictions];

    canonical.candidatesGenerated = this.candidatesGenerated > 0 ? this.candidatesGenerated : invList.length;
    canonical.rejectedByChangeGate = this.rejectedByChangeGate;
    canonical.rejectedByEligibility = this.rejectedByEligibility;
    canonical.eligibleForInvestigation = this.eligibleForInvestigation > 0 ? this.eligibleForInvestigation : countEligible;
    canonical.submittedToP4 = this.submittedToP4 > 0 ? this.submittedToP4 : countSubmitted;
    canonical.completedInvestigations = this.completedInvestigations > 0 ? this.completedInvestigations : countCompleted;
    canonical.failedInvestigations = this.failedInvestigations > 0 ? this.failedInvestigations : countFailed;
    canonical.skippedInvestigations = this.skippedInvestigations > 0 ? this.skippedInvestigations : countSkipped;

    canonical.llmCalls = this.llmCalls;
    canonical.cacheHits = this.cacheHits;
    canonical.cacheMisses = this.cacheMisses;

    // Context Bytes aggregation (use explicit total if provided, otherwise sum from task map)
    const totalOrig = this.totalOriginalBytes > 0 ? this.totalOriginalBytes : mapOrigBytes;
    const totalMin = this.totalMinimizedBytes > 0 ? this.totalMinimizedBytes : mapMinBytes;

    const bytesReduced = Math.max(0, totalOrig - totalMin);
    const reductionRatio = totalOrig > 0
      ? Number(((totalOrig - totalMin) / totalOrig).toFixed(4))
      : 0;

    const estOrigTokens = estimateTokens(totalOrig);
    const estMinTokens = estimateTokens(totalMin);
    const estReducedTokens = Math.max(0, estOrigTokens - estMinTokens);

    canonical.context = {
      originalBytes: totalOrig,
      minimizedBytes: totalMin,
      bytesReduced,
      reductionRatio,
      estimatedOriginalTokens: estOrigTokens,
      estimatedMinimizedTokens: estMinTokens,
      estimatedTokensReduced: estReducedTokens
    };

    canonical.investigations = invList;

    // Reconciliation Invariant Checks (non-mutating!)
    validateAccountingInvariants(canonical);

    return canonical;
  }
}

/**
 * Validates reconciliation invariants for an accounting result object.
 * Throws or fixes discrepancies deterministically.
 */
function validateAccountingInvariants(accounting) {
  if (!accounting || typeof accounting !== "object") return;

  const violations = Array.isArray(accounting.violations) ? accounting.violations : [];

  // Invariant 1: eligibleForInvestigation <= candidatesGenerated
  if (accounting.eligibleForInvestigation > accounting.candidatesGenerated) {
    violations.push({
      rule: "eligibleForInvestigation <= candidatesGenerated",
      actual: accounting.eligibleForInvestigation,
      expected: `<= ${accounting.candidatesGenerated}`,
      message: `eligibleForInvestigation (${accounting.eligibleForInvestigation}) exceeds candidatesGenerated (${accounting.candidatesGenerated}).`
    });
  }

  // Invariant 2: submittedToP4 <= eligibleForInvestigation
  if (accounting.submittedToP4 > accounting.eligibleForInvestigation) {
    violations.push({
      rule: "submittedToP4 <= eligibleForInvestigation",
      actual: accounting.submittedToP4,
      expected: `<= ${accounting.eligibleForInvestigation}`,
      message: `submittedToP4 (${accounting.submittedToP4}) exceeds eligibleForInvestigation (${accounting.eligibleForInvestigation}).`
    });
  }

  // Invariant 3: minimizedBytes <= originalBytes
  if (accounting.context.minimizedBytes > accounting.context.originalBytes) {
    violations.push({
      rule: "minimizedBytes <= originalBytes",
      actual: accounting.context.minimizedBytes,
      expected: `<= ${accounting.context.originalBytes}`,
      message: `minimizedBytes (${accounting.context.minimizedBytes}) exceeds originalBytes (${accounting.context.originalBytes}).`
    });
  }

  // Invariant 4: bytesReduced = originalBytes - minimizedBytes
  const expectedReduced = Math.max(0, accounting.context.originalBytes - accounting.context.minimizedBytes);
  if (accounting.context.bytesReduced !== expectedReduced) {
    violations.push({
      rule: "bytesReduced = originalBytes - minimizedBytes",
      actual: accounting.context.bytesReduced,
      expected: expectedReduced,
      message: `bytesReduced (${accounting.context.bytesReduced}) does not equal expected (${expectedReduced}).`
    });
  }

  // Invariant 5: 0 <= reductionRatio <= 1
  if (accounting.context.originalBytes > 0) {
    if (accounting.context.reductionRatio < 0 || accounting.context.reductionRatio > 1) {
      violations.push({
        rule: "0 <= reductionRatio <= 1",
        actual: accounting.context.reductionRatio,
        expected: "0 <= ratio <= 1",
        message: `reductionRatio (${accounting.context.reductionRatio}) is out of bounds [0, 1].`
      });
    }
  }

  accounting.violations = violations;
  if (violations.length > 0 || (Array.isArray(accounting.contradictions) && accounting.contradictions.length > 0)) {
    accounting.valid = false;
  }
}

/**
 * Evaluates canonical E5 LLM usage accounting over combined pipeline outputs.
 *
 * @param {Object} inputs Pipeline stage inputs
 * @param {Object} [inputs.candidates] Candidate tasks array or count
 * @param {Object} [inputs.changeGate] E2 change gate output
 * @param {Object} [inputs.eligibility] E3 eligibility output
 * @param {Object} [inputs.minimization] E4 context minimization output
 * @param {Object} [inputs.p4Result] P4 / adapter execution result
 * @param {Object} [inputs.telemetry] Execution telemetry (llmCalls, cacheHits, cacheMisses)
 * @param {Object} [options] Options
 * @returns {Object} Structured deterministic result containing canonical accounting metadata
 */
function evaluateLlmUsageAccounting(inputs = {}, options = {}) {
  const accumulator = new AccountingAccumulator();

  // 1. Candidate Accounting
  const rawCandidates = inputs.candidates || inputs.candidateTasks || [];
  const candidatesCount = typeof rawCandidates === "number"
    ? rawCandidates
    : Array.isArray(rawCandidates) ? rawCandidates.length : 0;

  accumulator.recordCandidatesGenerated(candidatesCount);

  // 2. Change Gate Accounting (E2)
  const gate = inputs.changeGate?.changeGate || inputs.changeGate || null;
  if (gate) {
    if (gate.decision === "NO_ANALYSIS_REQUIRED" || gate.decision === "DETERMINISTIC_ANALYSIS_SUFFICIENT") {
      accumulator.recordRejectedByChangeGate(candidatesCount > 0 ? candidatesCount : 1);
    }
  }

  // 3. Eligibility Accounting (E3)
  const eligibility = inputs.eligibility || null;
  if (eligibility) {
    if (typeof eligibility.summary?.rejectedTaskCount === "number") {
      accumulator.recordRejectedByEligibility(eligibility.summary.rejectedTaskCount);
    } else if (Array.isArray(eligibility.rejectedTasks)) {
      accumulator.recordRejectedByEligibility(eligibility.rejectedTasks.length);
    }

    const eligibleTasks = Array.isArray(eligibility.eligibleTasks)
      ? eligibility.eligibleTasks
      : Array.isArray(eligibility.tasks) ? eligibility.tasks : [];

    accumulator.eligibleForInvestigation = eligibleTasks.length;

    for (const task of eligibleTasks) {
      accumulator.recordInvestigationTask({
        taskId: task.id || task.taskId,
        taskType: task.type || task.taskType,
        eligible: true,
        originalContextBytes: task.metrics?.originalContextSize || 0,
        minimizedContextBytes: task.metrics?.minimizedContextSize || 0
      });

      if (task.metrics) {
        accumulator.recordContextMetrics({
          originalBytes: task.metrics.originalContextSize || 0,
          minimizedBytes: task.metrics.minimizedContextSize || 0
        });
      }
    }
  }

  // 4. Context Minimization Direct Output (E4)
  const minimizerRes = inputs.minimization || inputs.contextMinimizer || null;
  if (minimizerRes) {
    const minTasks = Array.isArray(minimizerRes) ? minimizerRes : [minimizerRes];
    for (const mt of minTasks) {
      const taskObj = mt.task || mt;
      const metrics = mt.metrics || taskObj?.metrics;
      if (taskObj && taskObj.id) {
        accumulator.recordInvestigationTask({
          taskId: taskObj.id,
          taskType: taskObj.type,
          eligible: true,
          originalContextBytes: metrics?.originalContextSize || 0,
          minimizedContextBytes: metrics?.minimizedContextSize || 0
        });
      }
      if (metrics) {
        accumulator.recordContextMetrics({
          originalBytes: metrics.originalContextSize || 0,
          minimizedBytes: metrics.minimizedContextSize || 0
        });
      }
    }
  }

  // 5. P4 Execution & Telemetry
  const p4 = inputs.p4Result || inputs.investigationResult || null;
  const telemetry = inputs.telemetry || {};

  if (p4) {
    const isSkipped = p4.status === "SKIPPED_DETERMINISTIC_COMPLETE" || p4.investigationRequired === false;
    const taskResults = Array.isArray(p4.taskResults) ? p4.taskResults : [];

    if (isSkipped) {
      accumulator.skippedInvestigations += 1;
    } else {
      accumulator.submittedToP4 += taskResults.length > 0 ? taskResults.length : 1;
    }

    let p4LlmCalls = p4.executedLlmCalls;
    let p4CacheHits = p4.cachedLlmCalls;

    if (typeof telemetry.llmCalls === "number" && typeof p4LlmCalls === "number" && telemetry.llmCalls !== p4LlmCalls) {
      accumulator.contradictions.push({
        field: "llmCalls",
        sourceA: `p4Result.executedLlmCalls (${p4LlmCalls})`,
        sourceB: `telemetry.llmCalls (${telemetry.llmCalls})`,
        message: `Contradictory LLM call counts between p4Result (${p4LlmCalls}) and telemetry (${telemetry.llmCalls}).`
      });
      accumulator.valid = false;
      accumulator.llmCalls = telemetry.llmCalls;
    } else if (typeof telemetry.llmCalls === "number") {
      accumulator.llmCalls = telemetry.llmCalls;
    } else if (typeof p4LlmCalls === "number") {
      accumulator.llmCalls = p4LlmCalls;
    }

    if (typeof telemetry.cacheHits === "number" && typeof p4CacheHits === "number" && telemetry.cacheHits !== p4CacheHits) {
      accumulator.contradictions.push({
        field: "cacheHits",
        sourceA: `p4Result.cachedLlmCalls (${p4CacheHits})`,
        sourceB: `telemetry.cacheHits (${telemetry.cacheHits})`,
        message: `Contradictory cache hit counts between p4Result (${p4CacheHits}) and telemetry (${telemetry.cacheHits}).`
      });
      accumulator.valid = false;
      accumulator.cacheHits = telemetry.cacheHits;
    } else if (typeof telemetry.cacheHits === "number") {
      accumulator.cacheHits = telemetry.cacheHits;
    } else if (typeof p4CacheHits === "number") {
      accumulator.cacheHits = p4CacheHits;
    }

    if (typeof telemetry.cacheMisses === "number") {
      accumulator.cacheMisses = telemetry.cacheMisses;
    } else if (typeof p4LlmCalls === "number" && !isSkipped) {
      accumulator.cacheMisses = p4LlmCalls;
    }

    for (const tr of taskResults) {
      const isFromCache = tr.fromCache === true;
      const isFailed = tr.status === "FAILED";

      accumulator.recordInvestigationTask({
        taskId: tr.taskId,
        taskType: tr.taskType,
        eligible: true,
        submittedToP4: !isSkipped,
        status: tr.status || (isFailed ? "FAILED" : "COMPLETED"),
        cacheHit: isFromCache,
        llmCall: !isFromCache && !isSkipped
      });
    }
  } else {
    if (typeof telemetry.llmCalls === "number") accumulator.llmCalls = telemetry.llmCalls;
    if (typeof telemetry.cacheHits === "number") accumulator.cacheHits = telemetry.cacheHits;
    if (typeof telemetry.cacheMisses === "number") accumulator.cacheMisses = telemetry.cacheMisses;
  }

  const canonical = accumulator.toCanonicalResult();

  const evidenceList = [
    createEvidence(
      "llm-usage-accounting",
      `LLM Usage Accounting v${ACCOUNTING_VERSION}: candidates=${canonical.candidatesGenerated}, eligible=${canonical.eligibleForInvestigation}, submitted=${canonical.submittedToP4}, llmCalls=${canonical.llmCalls}, cacheHits=${canonical.cacheHits}, cacheMisses=${canonical.cacheMisses}, reductionRatio=${canonical.context.reductionRatio}.`
    )
  ];

  const result = createDeterministicResult({
    value: "ACCOUNTING_COMPLETE",
    primary: "ACCOUNTING_COMPLETE",
    confidence: "high",
    evidence: evidenceList,
    metadata: canonical
  });

  result.accounting = canonical;
  return result;
}

module.exports = {
  ACCOUNTING_VERSION,
  estimateTokens,
  createCanonicalAccountingSchema,
  AccountingAccumulator,
  validateAccountingInvariants,
  evaluateLlmUsageAccounting
};
