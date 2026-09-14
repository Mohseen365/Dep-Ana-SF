/**
 * Deterministic Investigation Eligibility Engine (WAVE-E3)
 *
 * Evaluates candidate semantic investigation tasks to determine whether each task
 * is genuinely justified or if existing deterministic architecture intelligence already answers the question.
 *
 * Strict boundary rules:
 *   - 0 LLM runtime dependencies or calls.
 *   - 100% deterministic, explainable, and repeatable.
 *   - Rejects tasks asking for deterministic facts (roles, layers, domains, dependencies, impact, boundaries, health, quality gates).
 *   - Retains ELIGIBLE status only for genuine semantic questions (unresolved dynamic Apex/SOQL, semantic security gaps, domain disambiguation).
 *   - Deduplicates and bounds tasks to prevent unnecessary P4 LLM usage.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult,
  enforceDeterministicAuthority
} = require("./deterministic/contract.cjs");

const ELIGIBILITY_DECISIONS = Object.freeze([
  "ELIGIBLE",
  "NOT_ELIGIBLE",
  "BLOCKED",
  "UNKNOWN"
]);

/**
 * Evaluates a single candidate investigation task against deterministic architecture context.
 *
 * @param {Object} task Candidate investigation task object
 * @param {Object} [deterministicContext] Deterministic intelligence context
 * @param {Object} [options] Additional configuration options
 * @returns {Object} Structured eligibility evaluation result
 */
function evaluateTaskEligibility(task = null, deterministicContext = {}, options = {}) {
  // 1. UNKNOWN / Missing Input Check
  if (!task || typeof task !== "object") {
    const ev = createEvidence("missing-task", "Candidate investigation task is missing or null.");
    const result = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [ev],
      metadata: {
        taskId: null,
        eligibility: "UNKNOWN",
        reasons: ["Candidate task is missing or null."],
        unresolvedSemanticQuestion: null,
        source: "architecture-decision-context"
      }
    });
    result.eligibility = "UNKNOWN";
    result.task = null;
    return result;
  }

  const taskId = task.id || "INV-000";
  const taskType = String(task.type || "unknown-type").toLowerCase().trim();
  const question = String(task.question || task.title || task.text || "").trim();
  const lowerQ = question.toLowerCase();

  if (!question || lowerQ === "analyze this component" || lowerQ === "scan this component" || lowerQ === "investigate component") {
    const ev = createEvidence("vague-candidate-question", "Task question is overly generic or vague. Must specify an explicit unresolved semantic question.");
    const result = createDeterministicResult({
      value: "NOT_ELIGIBLE",
      primary: "NOT_ELIGIBLE",
      confidence: "high",
      evidence: [ev],
      metadata: {
        taskId,
        taskType,
        eligibility: "NOT_ELIGIBLE",
        reasons: ["Task question is overly generic or vague."],
        unresolvedSemanticQuestion: null,
        source: "architecture-decision-context"
      }
    });
    result.eligibility = "NOT_ELIGIBLE";
    result.task = task;
    return result;
  }

  // 2. UNKNOWN EVIDENCE Check
  if (deterministicContext.unknownEvidence === true || deterministicContext.evidenceState === "UNKNOWN") {
    const ev = createEvidence("unknown-context-evidence", "Deterministic context evidence is missing or incomplete.");
    const result = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [ev],
      metadata: {
        taskId,
        taskType,
        eligibility: "UNKNOWN",
        reasons: ["Incomplete or unknown evidence supplied in deterministic context."],
        unresolvedSemanticQuestion: null,
        source: "architecture-decision-context"
      }
    });
    result.eligibility = "UNKNOWN";
    result.task = task;
    return result;
  }

  // 3. CONTRADICTORY SIGNALS CHECK
  if (task.semanticObservation && task.deterministicFact) {
    const authCheck = enforceDeterministicAuthority(task.deterministicFact, task.semanticObservation);
    if (authCheck.contradiction) {
      const ev = createEvidence("contradictory-signals-detected", authCheck.message);
      const result = createDeterministicResult({
        value: "ELIGIBLE",
        primary: "ELIGIBLE",
        confidence: "high",
        evidence: [ev],
        metadata: {
          taskId,
          taskType,
          eligibility: "ELIGIBLE",
          reasons: ["Contradictory deterministic vs semantic claims require semantic investigation."],
          unresolvedSemanticQuestion: question,
          source: "architecture-decision-context"
        }
      });
      result.eligibility = "ELIGIBLE";
      result.task = task;
      return result;
    }
  }

  // 4. CHECK FOR DETERMINISTICALLY ANSWERABLE QUESTIONS
  // Reject tasks asking for information already established deterministically
  const knownFacts = deterministicContext.knownFacts || deterministicContext.securityIntelligence?.facts || {};
  const reasons = [];
  const evidence = [];

  let isDeterministicallyResolved = false;

  // Check 4A: Role / Layer / Domain questions
  if (
    (lowerQ.includes("what is the role") || lowerQ.includes("classify role")) &&
    deterministicContext.roleInfo?.primary &&
    deterministicContext.roleInfo.primary !== "unknown"
  ) {
    isDeterministicallyResolved = true;
    reasons.push(`Component role is already deterministically classified as '${deterministicContext.roleInfo.primary}'.`);
    evidence.push(createEvidence("role-already-known", `Role '${deterministicContext.roleInfo.primary}' is deterministically known.`));
  }

  if (
    (lowerQ.includes("what is the layer") || lowerQ.includes("classify layer")) &&
    deterministicContext.layerInfo?.primary &&
    deterministicContext.layerInfo.primary !== "unknown"
  ) {
    isDeterministicallyResolved = true;
    reasons.push(`Component layer is already deterministically classified as '${deterministicContext.layerInfo.primary}'.`);
    evidence.push(createEvidence("layer-already-known", `Layer '${deterministicContext.layerInfo.primary}' is deterministically known.`));
  }

  if (
    (lowerQ.includes("what domain") || lowerQ.includes("classify domain")) &&
    deterministicContext.domainInfo?.primary &&
    deterministicContext.domainInfo.primary !== "unknown"
  ) {
    isDeterministicallyResolved = true;
    reasons.push(`Component domain is already deterministically classified as '${deterministicContext.domainInfo.primary}'.`);
    evidence.push(createEvidence("domain-already-known", `Domain '${deterministicContext.domainInfo.primary}' is deterministically known.`));
  }

  // Check 4B: Dependency / Impact / Bottleneck questions
  if (
    (lowerQ.includes("what depends on") || lowerQ.includes("find dependencies") || lowerQ.includes("calculate impact")) &&
    deterministicContext.impact
  ) {
    isDeterministicallyResolved = true;
    reasons.push("Component dependency and blast radius impact graph is already computed deterministically.");
    evidence.push(createEvidence("impact-already-known", "Structural blast radius and dependencies are deterministically established."));
  }

  if (
    lowerQ.includes("is this a bottleneck") &&
    deterministicContext.isBottleneck !== undefined
  ) {
    isDeterministicallyResolved = true;
    reasons.push(`Bottleneck status is already deterministically known (${deterministicContext.isBottleneck ? "YES" : "NO"}).`);
    evidence.push(createEvidence("bottleneck-already-known", `Bottleneck status deterministically established.`));
  }

  // Check 4C: Quality Gate / Health questions
  if (
    (lowerQ.includes("why did quality gate fail") || lowerQ.includes("explain health score")) &&
    (deterministicContext.qualityGates || deterministicContext.architectureHealth)
  ) {
    isDeterministicallyResolved = true;
    reasons.push("Quality gates and health score failures are already deterministically explained by rule violations.");
    evidence.push(createEvidence("quality-gate-already-known", "Quality gate rule violations provide full deterministic diagnostic explanations."));
  }

  if (isDeterministicallyResolved) {
    const result = createDeterministicResult({
      value: "NOT_ELIGIBLE",
      primary: "NOT_ELIGIBLE",
      confidence: "high",
      evidence,
      metadata: {
        taskId,
        taskType,
        eligibility: "NOT_ELIGIBLE",
        reasons: reasons.length > 0 ? reasons : ["Deterministic evidence is sufficient."],
        unresolvedSemanticQuestion: null,
        source: "architecture-decision-context"
      }
    });
    result.eligibility = "NOT_ELIGIBLE";
    result.task = task;
    return result;
  }

  // 5. CHECK FOR LEGITIMATE SEMANTIC QUESTIONS
  let isLegitimateSemantic = false;
  let unresolvedReason = "";

  if (taskType === "dynamic-apex" || lowerQ.includes("dynamic apex") || lowerQ.includes("runtime target")) {
    isLegitimateSemantic = true;
    unresolvedReason = "Dynamic Apex execution cannot be resolved statically by AST; requires semantic runtime evaluation.";
    evidence.push(createEvidence("legitimate-dynamic-apex", unresolvedReason));
  } else if (taskType === "dynamic-soql-security" || lowerQ.includes("dynamic soql")) {
    isLegitimateSemantic = true;
    unresolvedReason = "Dynamic SOQL string concatenation cannot be verified statically for FLS/CRUD enforcement.";
    evidence.push(createEvidence("legitimate-dynamic-soql", unresolvedReason));
  } else if (taskType === "security-semantics" || lowerQ.includes("sharing model") || lowerQ.includes("fls")) {
    // If security fact is already 100% known and no unknown exists
    if (knownFacts.sharingModel && knownFacts.sharingModel !== "unspecified" && knownFacts.securityEnforced && !knownFacts.hasDynamicApex) {
      // Deterministically known!
      const ev = createEvidence("security-fact-already-known", `Security fact '${knownFacts.sharingModel}' is already deterministically proven.`);
      const result = createDeterministicResult({
        value: "NOT_ELIGIBLE",
        primary: "NOT_ELIGIBLE",
        confidence: "high",
        evidence: [ev],
        metadata: {
          taskId,
          taskType,
          eligibility: "NOT_ELIGIBLE",
          reasons: [`Security facts for '${knownFacts.sharingModel}' are already deterministically established.`],
          unresolvedSemanticQuestion: null,
          source: "architecture-decision-context"
        }
      });
      result.eligibility = "NOT_ELIGIBLE";
      result.task = task;
      return result;
    } else {
      isLegitimateSemantic = true;
      unresolvedReason = "Security semantics or enforcement intent requires semantic reasoning.";
      evidence.push(createEvidence("legitimate-security-semantics", unresolvedReason));
    }
  } else if (taskType === "duplicate-responsibility" || lowerQ.includes("overlapping business responsibility") || lowerQ.includes("domain disambiguation")) {
    isLegitimateSemantic = true;
    unresolvedReason = "Overlapping structural responsibility detected; requires semantic domain/business disambiguation.";
    evidence.push(createEvidence("legitimate-duplicate-responsibility", unresolvedReason));
  } else if (taskType === "unresolved-reference" || taskType === "semantic-gap") {
    isLegitimateSemantic = true;
    unresolvedReason = "Unresolved symbol reference or semantic gap cannot be structurally linked.";
    evidence.push(createEvidence("legitimate-unresolved-reference", unresolvedReason));
  } else if (task.llmRequired === true || task.evidence?.resolution === "LLM") {
    isLegitimateSemantic = true;
    unresolvedReason = "Task explicitly identified as requiring LLM reasoning.";
    evidence.push(createEvidence("explicit-llm-required", unresolvedReason));
  }

  if (isLegitimateSemantic) {
    reasons.push(unresolvedReason || "Genuine unresolved semantic question identified.");
    const result = createDeterministicResult({
      value: "ELIGIBLE",
      primary: "ELIGIBLE",
      confidence: "high",
      evidence,
      metadata: {
        taskId,
        taskType,
        eligibility: "ELIGIBLE",
        reasons,
        unresolvedSemanticQuestion: question,
        unresolvedBecause: unresolvedReason,
        source: "architecture-decision-context"
      }
    });
    result.eligibility = "ELIGIBLE";
    result.task = task;
    return result;
  }

  // Fallback: If not explicitly matching legitimate semantic patterns, default to NOT_ELIGIBLE (Deterministic evidence sufficient)
  const defaultEv = createEvidence("default-deterministic-sufficient", "Deterministic evidence is sufficient. Task does not present unresolved semantic uncertainty.");
  const result = createDeterministicResult({
    value: "NOT_ELIGIBLE",
    primary: "NOT_ELIGIBLE",
    confidence: "high",
    evidence: [defaultEv],
    metadata: {
      taskId,
      taskType,
      eligibility: "NOT_ELIGIBLE",
      reasons: ["Deterministic evidence is sufficient."],
      unresolvedSemanticQuestion: null,
      source: "architecture-decision-context"
    }
  });
  result.eligibility = "NOT_ELIGIBLE";
  result.task = task;

  return result;
}

/**
 * Filters and processes candidate investigation tasks according to eligibility rules,
 * task deduplication, and bounding limits.
 *
 * @param {Array} candidateTasks Array of candidate investigation tasks
 * @param {Object} [deterministicContext] Deterministic context
 * @param {Object} [options] Options including maxTasks (default: 10)
 * @returns {Object} Structured eligibility filtering results and accounting summary
 */
function filterInvestigationTasks(candidateTasks = [], deterministicContext = {}, options = {}) {
  const rawCandidates = Array.isArray(candidateTasks) ? candidateTasks : [];
  const maxTasks = typeof options.maxTasks === "number" ? options.maxTasks : 10;

  const taskResults = [];
  const eligibleTasks = [];
  const rejectedTasks = [];

  let candidateTaskCount = rawCandidates.length;
  let rejectedTaskCount = 0;
  let deterministicResolutionCount = 0;
  let semanticUncertaintyCount = 0;

  // 1. Evaluate Eligibility for each candidate
  for (const cand of rawCandidates) {
    const evalRes = evaluateTaskEligibility(cand, deterministicContext, options);
    taskResults.push(evalRes);

    if (evalRes.eligibility === "ELIGIBLE") {
      semanticUncertaintyCount++;
      eligibleTasks.push(evalRes.task || cand);
    } else {
      rejectedTaskCount++;
      if (evalRes.eligibility === "NOT_ELIGIBLE") {
        deterministicResolutionCount++;
      }
      rejectedTasks.push({
        taskId: evalRes.metadata?.taskId || cand.id,
        taskType: evalRes.metadata?.taskType || cand.type,
        eligibility: evalRes.eligibility,
        reason: evalRes.metadata?.reasons?.[0] || "deterministic evidence is sufficient",
        source: evalRes.metadata?.source || "architecture-decision-context"
      });
    }
  }

  // 2. Task Deduplication
  const dedupedMap = new Map();
  let deduplicatedTaskCount = 0;

  for (const task of eligibleTasks) {
    const key = `${String(task.type).toLowerCase()}|${String(task.question || "").toLowerCase().trim()}`;
    if (dedupedMap.has(key)) {
      deduplicatedTaskCount++;
    } else {
      dedupedMap.set(key, task);
    }
  }

  const uniqueEligibleTasks = Array.from(dedupedMap.values());

  // 3. Task Bounding
  let boundedTaskCount = 0;
  const finalEligibleTasks = [];

  for (let i = 0; i < uniqueEligibleTasks.length; i++) {
    if (i < maxTasks) {
      finalEligibleTasks.push({
        ...uniqueEligibleTasks[i],
        id: `INV-${String(i + 1).padStart(3, "0")}`
      });
    } else {
      boundedTaskCount++;
    }
  }

  const summary = {
    candidateTaskCount,
    eligibleTaskCount: finalEligibleTasks.length,
    rejectedTaskCount,
    deduplicatedTaskCount,
    boundedTaskCount,
    deterministicResolutionCount,
    semanticUncertaintyCount
  };

  return {
    investigationRequired: finalEligibleTasks.length > 0,
    eligibleTasks: finalEligibleTasks,
    rejectedTasks,
    taskResults,
    summary
  };
}

module.exports = {
  ELIGIBILITY_DECISIONS,
  evaluateTaskEligibility,
  filterInvestigationTasks
};
