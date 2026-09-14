/**
 * Deterministic Investigation Context Minimization (WAVE-E4)
 *
 * Minimizes and filters deterministic architecture context sent to the LLM for investigation
 * tasks that have already been evaluated and marked ELIGIBLE by WAVE-E3.
 *
 * Strict boundary rules:
 *   - 0 LLM runtime dependencies or calls.
 *   - 0 RL runtime dependencies.
 *   - E4 owns ONLY context selection for eligible tasks (does NOT decide eligibility or change gating).
 *   - Uses D5 architectureDecisionContext as the canonical source.
 *   - 100% deterministic, repeatable, and explainable.
 *   - Preserves deterministic evidence without turning evidence into unsupported prose.
 *   - Provides safe broader-context fallback when task scope is uncertain.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

const CONTEXT_VERSION = "1.0.0";

/**
 * Helper to measure serialized JSON byte size deterministically.
 */
function calculateByteSize(obj) {
  if (obj === undefined || obj === null) return 0;
  try {
    const jsonStr = typeof obj === "string" ? obj : JSON.stringify(obj);
    return Buffer.byteLength(jsonStr, "utf8");
  } catch (_) {
    return 0;
  }
}

/**
 * Normalizes input decision context from D5 result or plain object.
 */
function extractDecisionContext(decisionContext = {}) {
  if (!decisionContext || typeof decisionContext !== "object") {
    return {};
  }
  if (decisionContext.architectureDecisionContext) {
    return decisionContext.architectureDecisionContext;
  }
  if (decisionContext.metadata) {
    return decisionContext.metadata;
  }
  return decisionContext;
}

/**
 * Normalizes a list of evidence items to ensure standard evidence schema.
 */
function normalizeEvidence(evidenceList = [], defaultSource = "architecture-decision-context") {
  if (!Array.isArray(evidenceList)) return [];

  return evidenceList.map(ev => {
    if (!ev || typeof ev !== "object") {
      return createEvidence("context-evidence", String(ev || "No detail provided"), "medium");
    }
    return {
      rule: String(ev.rule || ev.ruleId || "context-evidence"),
      detail: String(ev.detail || ev.description || ev.message || ev.reason || "Context evidence detail"),
      confidence: String(ev.confidence || "high").toLowerCase(),
      sourceCapability: String(ev.sourceCapability || ev.source || defaultSource)
    };
  });
}

/**
 * Selects minimal sufficient context for a single eligible investigation task using D5 context.
 *
 * @param {Object} task Eligible investigation task
 * @param {Object} [decisionContext] D5 architecture decision context
 * @param {Object} [options] Options
 * @returns {Object} Minimized context package with selection metadata and size metrics
 */
function minimizeInvestigationContext(task = null, decisionContext = {}, options = {}) {
  const d5Context = extractDecisionContext(decisionContext);
  const originalBytes = calculateByteSize(d5Context);

  // Fallback / Guard for missing or invalid inputs
  if (!task || typeof task !== "object") {
    const fallbackEv = createEvidence("missing-task", "Task is missing or invalid.");
    const emptyResult = {
      task: null,
      contextVersion: CONTEXT_VERSION,
      minimizedContext: {},
      contextSelection: {
        taskType: "unknown",
        includedSections: [],
        excludedSections: [],
        selectionReasons: ["Task is missing or invalid; empty context produced."],
        sourceCapabilities: ["architecture-decision-context"],
        contextVersion: CONTEXT_VERSION
      },
      metrics: {
        originalContextSize: originalBytes,
        minimizedContextSize: 0,
        reductionRatio: 0,
        includedSectionCount: 0,
        excludedSectionCount: 0
      },
      evidence: [fallbackEv]
    };
    return emptyResult;
  }

  const taskId = String(task.id || "INV-000");
  const taskType = String(task.type || "unknown").toLowerCase().trim();
  const question = String(task.question || task.title || "").toLowerCase();

  // Determine Task Category
  let category = "generic-fallback";

  if (
    taskType === "duplicate-responsibility" ||
    taskType === "responsibility-overlap" ||
    question.includes("duplicate responsibility") ||
    question.includes("overlapping business responsibility") ||
    question.includes("domain disambiguation")
  ) {
    category = "responsibility-overlap";
  } else if (
    taskType === "dynamic-apex" ||
    taskType === "dynamic-soql-security" ||
    taskType === "behavioral-ambiguity" ||
    taskType === "unresolved-reference" ||
    taskType === "semantic-gap" ||
    taskType === "security-semantics" ||
    question.includes("dynamic apex") ||
    question.includes("dynamic soql") ||
    question.includes("sharing model") ||
    question.includes("unresolved")
  ) {
    category = "behavioral-ambiguity";
  } else if (
    taskType === "change-impact" ||
    taskType === "change-risk" ||
    question.includes("change impact") ||
    question.includes("blast radius") ||
    question.includes("proposed change")
  ) {
    category = "change-impact";
  }

  // Section Mapping based on Category
  const allSections = [
    "subject",
    "summary",
    "architecturalProfile",
    "role",
    "layer",
    "domain",
    "dependencies",
    "dependents",
    "impact",
    "changeRisk",
    "safety",
    "businessCriticality",
    "architectureHealth",
    "architectureDebt",
    "bottlenecks",
    "smells",
    "boundaries",
    "testProtection",
    "baselineChanges",
    "qualityGates",
    "governance",
    "duplicateResponsibility",
    "constraints",
    "blockers",
    "recommendations",
    "unknowns",
    "conflicts"
  ];

  let desiredSections = [];
  const selectionReasons = [];

  switch (category) {
    case "responsibility-overlap":
      desiredSections = [
        "subject",
        "summary",
        "architecturalProfile",
        "role",
        "layer",
        "domain",
        "dependencies",
        "dependents",
        "smells",
        "duplicateResponsibility",
        "constraints",
        "recommendations",
        "unknowns",
        "conflicts"
      ];
      selectionReasons.push("Responsibility overlap task requires structural role, layer, domain, profile, dependencies, smells, and duplicate responsibility context.");
      break;

    case "behavioral-ambiguity":
      desiredSections = [
        "subject",
        "summary",
        "dependencies",
        "dependents",
        "boundaries",
        "smells",
        "unknowns",
        "conflicts"
      ];
      selectionReasons.push("Behavioral ambiguity task requires target component callers/callees, boundaries (security/external), structural smells, and unresolved unknowns.");
      break;

    case "change-impact":
      desiredSections = [
        "subject",
        "summary",
        "dependencies",
        "dependents",
        "impact",
        "changeRisk",
        "safety",
        "testProtection",
        "boundaries",
        "qualityGates",
        "governance",
        "constraints",
        "blockers",
        "recommendations",
        "unknowns",
        "conflicts"
      ];
      selectionReasons.push("Change impact task requires downstream impact graph, change risk, safety classification, test protection, boundaries, quality gates, and blockers.");
      break;

    case "generic-fallback":
    default:
      // Safe broader-context fallback: Include all available sections in d5Context
      desiredSections = [...allSections];
      selectionReasons.push("Task scope uncertain or generic; applying safe broader-context fallback (all available context sections retained).");
      break;
  }

  // Construct Minimized Context
  const minimizedContext = {};
  const includedSections = [];
  const excludedSections = [];
  const sourceCapabilities = new Set(["architecture-decision-context"]);
  const collectedEvidence = [];

  for (const sec of allSections) {
    const isDesired = desiredSections.includes(sec);
    const hasValue = d5Context[sec] !== undefined && d5Context[sec] !== null;

    if (isDesired && hasValue) {
      minimizedContext[sec] = d5Context[sec];
      includedSections.push(sec);

      // Track capability sources
      if (sec === "role") sourceCapabilities.add("Role Classifier");
      if (sec === "layer") sourceCapabilities.add("Layer Classifier");
      if (sec === "domain") sourceCapabilities.add("Domain Classifier");
      if (sec === "boundaries") {
        sourceCapabilities.add("Security Boundaries");
        sourceCapabilities.add("External Boundaries");
      }
      if (sec === "safety") sourceCapabilities.add("Safety Envelope");
      if (sec === "architectureHealth") sourceCapabilities.add("Architecture Health");
      if (sec === "architectureDebt") sourceCapabilities.add("Architecture Debt");
      if (sec === "duplicateResponsibility") sourceCapabilities.add("Duplicate Responsibility");
      if (sec === "testProtection") sourceCapabilities.add("Test Gap Analysis");
      if (sec === "qualityGates") sourceCapabilities.add("Quality Gates");
      if (sec === "governance") sourceCapabilities.add("Governance");
    } else if (!isDesired && hasValue) {
      excludedSections.push(sec);
    }
  }

  // Always collect evidence from d5Context
  if (Array.isArray(d5Context.evidence) && d5Context.evidence.length > 0) {
    collectedEvidence.push(...normalizeEvidence(d5Context.evidence));
  } else if (Array.isArray(d5Context.evidenceList)) {
    collectedEvidence.push(...normalizeEvidence(d5Context.evidenceList));
  } else {
    collectedEvidence.push(createEvidence("context-minimized", `Selected ${includedSections.length} context sections for task '${taskId}'.`));
  }

  // Ensure task specific evidence is retained
  if (task.evidence) {
    if (Array.isArray(task.evidence)) {
      collectedEvidence.push(...normalizeEvidence(task.evidence, "investigation-task"));
    } else if (typeof task.evidence === "object") {
      collectedEvidence.push(createEvidence(
        task.evidence.rule || task.evidence.ruleId || "task-evidence",
        task.evidence.detail || task.evidence.description || task.evidence.reason || JSON.stringify(task.evidence),
        {
          confidence: String(task.evidence.confidence || "high").toLowerCase(),
          sourceCapability: String(task.evidence.sourceCapability || task.evidence.source || "investigation-task")
        }
      ));
    }
  }

  const minimizedBytes = calculateByteSize(minimizedContext);
  const reductionRatio = originalBytes > 0
    ? Number(((originalBytes - minimizedBytes) / originalBytes).toFixed(4))
    : 0;

  const contextSelection = {
    taskType: task.type || "unknown",
    category,
    includedSections,
    excludedSections,
    selectionReasons,
    sourceCapabilities: Array.from(sourceCapabilities),
    contextVersion: CONTEXT_VERSION
  };

  const metrics = {
    originalContextSize: originalBytes,
    minimizedContextSize: minimizedBytes,
    reductionRatio: Math.max(0, reductionRatio),
    includedSectionCount: includedSections.length,
    excludedSectionCount: excludedSections.length
  };

  const resultTask = {
    ...task,
    contextVersion: CONTEXT_VERSION,
    minimizedContext,
    contextSelection,
    metrics
  };

  const deterministicResult = createDeterministicResult({
    value: "CONTEXT_MINIMIZED",
    primary: "CONTEXT_MINIMIZED",
    confidence: "high",
    evidence: collectedEvidence,
    metadata: {
      taskId,
      taskType: task.type || "unknown",
      contextVersion: CONTEXT_VERSION,
      minimizedContext,
      contextSelection,
      metrics
    }
  });

  return {
    ...deterministicResult,
    task: resultTask,
    contextVersion: CONTEXT_VERSION,
    minimizedContext,
    contextSelection,
    metrics,
    evidence: collectedEvidence
  };
}

/**
 * Minimizes context for an array of eligible investigation tasks.
 *
 * @param {Array} eligibleTasks Array of ELIGIBLE investigation tasks
 * @param {Object} [decisionContext] D5 architecture decision context
 * @param {Object} [options] Options
 * @returns {Array} Array of tasks enriched with minimized context
 */
function minimizeInvestigationTasks(eligibleTasks = [], decisionContext = {}, options = {}) {
  if (!Array.isArray(eligibleTasks)) return [];

  return eligibleTasks.map(task => {
    const minRes = minimizeInvestigationContext(task, decisionContext, options);
    return minRes.task || task;
  });
}

module.exports = {
  CONTEXT_VERSION,
  minimizeInvestigationContext,
  minimizeInvestigationTasks,
  calculateByteSize
};
