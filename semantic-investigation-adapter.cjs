/**
 * Semantic Investigation Adapter (Layer B)
 *
 * Connects dependency-analyzer (Layer A) to refactor-litellm (Layer C)
 * through a clean child-process CLI boundary.
 *
 * Deterministic DA static analysis remains 100% independent.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const { enforceDeterministicAuthority } = require("./deterministic/contract.cjs");
const { evaluateLlmUsageAccounting } = require("./llm-usage-accounting.cjs");
const { minimizeInvestigationTasks } = require("./investigation-context-minimizer.cjs");

function findRefactorLitellmDir(startDir) {
  const candidates = [
    path.resolve(startDir, "..", "refactor-litellm"),
    path.resolve(startDir, "refactor-litellm"),
    path.resolve(process.cwd(), "..", "refactor-litellm"),
    path.resolve(process.cwd(), "refactor-litellm")
  ];

  for (const candidate of candidates) {
    const cliScript = path.join(candidate, "services", "semantic-investigation-cli.js");
    if (fs.existsSync(cliScript)) {
      return candidate;
    }
  }

  return null;
}

function enforceResultAuthority(result, deterministicContext) {
  if (!result || typeof result !== "object") return result;

  const contradictions = Array.isArray(result.contradictions) ? [...result.contradictions] : [];
  const knownFacts =
    deterministicContext?.securityIntelligence?.facts ||
    deterministicContext?.knownFacts ||
    deterministicContext?.facts ||
    {};

  const taskResults = Array.isArray(result.taskResults) ? result.taskResults : [];

  for (const taskRes of taskResults) {
    const llmClaims = taskRes.llmClaims || {};

    if (knownFacts.sharingModel && knownFacts.sharingModel !== "unspecified" && llmClaims.sharingModel) {
      const factSharing = String(knownFacts.sharingModel).toLowerCase().trim();
      const claimSharing = String(llmClaims.sharingModel).toLowerCase().trim();

      const check = enforceDeterministicAuthority(factSharing, claimSharing);

      if (check.contradiction) {
        taskRes.contradictsDeterministicFact = true;

        const existing = contradictions.find(c => c.taskId === taskRes.taskId && c.field === "sharingModel");
        if (!existing) {
          contradictions.push({
            taskId: taskRes.taskId || "INV-UNKNOWN",
            field: "sharingModel",
            deterministicFact: factSharing,
            llmClaim: claimSharing,
            resolution: "DETERMINISTIC_FACT_RETAINED",
            message: check.message
          });
        }
      }
    }
  }

  return {
    ...result,
    contradictions,
    deterministicFactsRetained: true
  };
}

/**
 * High-level investigation adapter API.
 *
 * @param {Object} params Investigation request
 * @param {Array} [params.tasks] Array of investigation tasks
 * @param {Object} [params.deterministicContext] Deterministic component context or 08-LLM-INVESTIGATION payload
 * @param {string} [params.component] Target component name
 * @param {string} [params.contextDir] Path to package context directory
 * @param {Object} [params.options] Additional options
 * @returns {Object} Structured investigation result
 */
function investigate(tasks = null, deterministicContext = null, options = {}) {
  const component =
    options.component ||
    deterministicContext?.component ||
    "UNKNOWN";

  const rawTasks = Array.isArray(tasks)
    ? tasks
    : Array.isArray(deterministicContext?.investigations)
      ? deterministicContext.investigations
      : Array.isArray(deterministicContext?.tasks)
        ? deterministicContext.tasks
        : [];

  const isRequired = Boolean(
    deterministicContext?.investigationRequired ||
    deterministicContext?.llmInvestigationRequired ||
    rawTasks.length > 0
  );

  // 1. DETERMINISTIC-FIRST GATING: Skip LLM completely if 0 investigation tasks.
  if (!isRequired || rawTasks.length === 0) {
    const skippedResult = {
      component,
      investigationRequired: false,
      executedLlmCalls: 0,
      cachedLlmCalls: 0,
      status: "SKIPPED_DETERMINISTIC_COMPLETE",
      summary: "0 LLM calls executed: deterministic coverage is complete and no investigation is required.",
      taskResults: [],
      contradictions: [],
      deterministicFactsRetained: true
    };

    if (options.contextDir && fs.existsSync(options.contextDir)) {
      try {
        fs.writeFileSync(
          path.join(options.contextDir, "08-LLM-INVESTIGATION-RESULT.json"),
          JSON.stringify(skippedResult, null, 2),
          "utf8"
        );
        const minimizedTasks = minimizeInvestigationTasks(rawTasks, deterministicContext);
        const accountingRes = evaluateLlmUsageAccounting({
          candidates: rawTasks,
          changeGate: deterministicContext?.changeGate || null,
          eligibility: deterministicContext?.eligibilitySummary || null,
          minimization: minimizedTasks,
          p4Result: skippedResult,
          telemetry: { llmCalls: 0, cacheHits: 0, cacheMisses: 0 }
        });
        fs.writeFileSync(
          path.join(options.contextDir, "09-LLM-USAGE-ACCOUNTING.json"),
          JSON.stringify(accountingRes.accounting, null, 2),
          "utf8"
        );
      } catch (_) {}
    }

    return skippedResult;
  }

  // 2. LAYER C INVOCATION via CLI child process
  const rlDir = options.rlRoot || findRefactorLitellmDir(__dirname);

  if (!rlDir) {
    const unavailableResult = {
      component,
      investigationRequired: true,
      executedLlmCalls: 0,
      cachedLlmCalls: 0,
      status: "FAILED",
      summary: "Semantic investigation capability (refactor-litellm) is not available or installed.",
      error: "REFACTOR_LITELLM_NOT_FOUND",
      taskResults: [],
      contradictions: [],
      deterministicFactsRetained: true
    };

    if (options.contextDir && fs.existsSync(options.contextDir)) {
      try {
        fs.writeFileSync(
          path.join(options.contextDir, "08-LLM-INVESTIGATION-RESULT.json"),
          JSON.stringify(unavailableResult, null, 2),
          "utf8"
        );
        const minimizedTasks = minimizeInvestigationTasks(rawTasks, deterministicContext);
        const accountingRes = evaluateLlmUsageAccounting({
          candidates: rawTasks,
          changeGate: deterministicContext?.changeGate || null,
          eligibility: deterministicContext?.eligibilitySummary || null,
          minimization: minimizedTasks,
          p4Result: unavailableResult,
          telemetry: { llmCalls: 0, cacheHits: 0, cacheMisses: 0 }
        });
        fs.writeFileSync(
          path.join(options.contextDir, "09-LLM-USAGE-ACCOUNTING.json"),
          JSON.stringify(accountingRes.accounting, null, 2),
          "utf8"
        );
      } catch (_) {}
    }

    return unavailableResult;
  }

  const cliScript = path.join(rlDir, "services", "semantic-investigation-cli.js");
  let tempPayloadFile = null;

  try {
    const cliArgs = ["--component", component];
    if (options.contextDir) {
      cliArgs.push("--package-dir", path.resolve(options.contextDir));
    } else {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "da-sem-payload-"));
      tempPayloadFile = path.join(tempDir, "payload.json");
      const payload = {
        component,
        investigationRequired: true,
        investigations: rawTasks,
        securityIntelligence: deterministicContext?.securityIntelligence || null,
        knownFacts: deterministicContext?.knownFacts || null
      };
      fs.writeFileSync(tempPayloadFile, JSON.stringify(payload, null, 2), "utf8");
      cliArgs.push("--payload-file", tempPayloadFile);
    }

    if (options.capability) {
      cliArgs.push("--capability", options.capability);
    }
    if (options.orchestratorDir) {
      cliArgs.push("--orchestrator-dir", options.orchestratorDir);
    }

    const stdout = execFileSync("node", [cliScript, ...cliArgs], {
      cwd: rlDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...(options.env || {}) }
    });

    let rawResult = null;
    try {
      rawResult = JSON.parse(stdout.trim());
    } catch {
      throw new Error("Invalid JSON returned by semantic investigation service: " + stdout.slice(0, 200));
    }

    const enforcedResult = enforceResultAuthority(rawResult, deterministicContext);

    if (options.contextDir && fs.existsSync(options.contextDir)) {
      try {
        fs.writeFileSync(
          path.join(options.contextDir, "08-LLM-INVESTIGATION-RESULT.json"),
          JSON.stringify(enforcedResult, null, 2),
          "utf8"
        );
        const minimizedTasks = minimizeInvestigationTasks(rawTasks, deterministicContext);
        const accountingRes = evaluateLlmUsageAccounting({
          candidates: rawTasks,
          changeGate: deterministicContext?.changeGate || null,
          eligibility: deterministicContext?.eligibilitySummary || null,
          minimization: minimizedTasks,
          p4Result: enforcedResult,
          telemetry: {
            llmCalls: enforcedResult.executedLlmCalls || 0,
            cacheHits: enforcedResult.cachedLlmCalls || 0,
            cacheMisses: enforcedResult.executedLlmCalls || 0
          }
        });
        fs.writeFileSync(
          path.join(options.contextDir, "09-LLM-USAGE-ACCOUNTING.json"),
          JSON.stringify(accountingRes.accounting, null, 2),
          "utf8"
        );
      } catch (_) {}
    }

    return enforcedResult;
  } catch (err) {
    // Failure isolation: LLM / RL error does not corrupt deterministic DA artifacts.
    const failureResult = {
      component,
      investigationRequired: true,
      executedLlmCalls: 0,
      cachedLlmCalls: 0,
      status: "FAILED",
      summary: "Semantic investigation service failed: " + err.message,
      error: err.message,
      taskResults: [],
      contradictions: [],
      deterministicFactsRetained: true
    };

    if (options.contextDir && fs.existsSync(options.contextDir)) {
      try {
        fs.writeFileSync(
          path.join(options.contextDir, "08-LLM-INVESTIGATION-RESULT.json"),
          JSON.stringify(failureResult, null, 2),
          "utf8"
        );
        const minimizedTasks = minimizeInvestigationTasks(rawTasks, deterministicContext);
        const accountingRes = evaluateLlmUsageAccounting({
          candidates: rawTasks,
          changeGate: deterministicContext?.changeGate || null,
          eligibility: deterministicContext?.eligibilitySummary || null,
          minimization: minimizedTasks,
          p4Result: failureResult,
          telemetry: { llmCalls: 0, cacheHits: 0, cacheMisses: 0 }
        });
        fs.writeFileSync(
          path.join(options.contextDir, "09-LLM-USAGE-ACCOUNTING.json"),
          JSON.stringify(accountingRes.accounting, null, 2),
          "utf8"
        );
      } catch (_) {}
    }

    return failureResult;
  } finally {
    if (tempPayloadFile) {
      try {
        fs.rmSync(path.dirname(tempPayloadFile), { recursive: true, force: true });
      } catch (_) {}
    }
  }
}

/**
 * Helper to execute investigation given a package directory path.
 */
function investigateComponentContext({ component, contextDir, options = {} }) {
  let deterministicContext = null;
  let tasks = null;

  if (contextDir && fs.existsSync(contextDir)) {
    const path08 = path.join(contextDir, "08-LLM-INVESTIGATION.json");
    const path06 = path.join(contextDir, "06-INVESTIGATION-PLAN.json");
    const path01 = path.join(contextDir, "01-CONTEXT.json");

    if (fs.existsSync(path08)) {
      try { deterministicContext = JSON.parse(fs.readFileSync(path08, "utf8")); } catch (_) {}
    } else if (fs.existsSync(path06)) {
      try { deterministicContext = JSON.parse(fs.readFileSync(path06, "utf8")); } catch (_) {}
    }

    if (fs.existsSync(path01)) {
      try {
        const c01 = JSON.parse(fs.readFileSync(path01, "utf8"));
        deterministicContext = { ...c01, ...deterministicContext };
      } catch (_) {}
    }
  }

  return investigate(tasks, deterministicContext, {
    component: component || deterministicContext?.component || "UNKNOWN",
    contextDir,
    ...options
  });
}

module.exports = {
  investigate,
  investigateComponentContext,
  enforceResultAuthority
};
