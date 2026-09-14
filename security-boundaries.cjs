/**
 * Deterministic Security Boundaries Analyzer (Prompt 26)
 *
 * Evaluates observable security architecture boundaries for Salesforce DX components
 * using 100% deterministic repository evidence.
 *
 * Rules report observable architectural facts:
 *   - Sharing models: with sharing, without sharing, inherited sharing, unspecified
 *   - Exposures / Entry points: REST exposed, Aura exposed, Invocable exposed, Trigger entry point, UI entry point, Async entry point
 *
 * Strictly avoids subjective security assertions ("secure", "vulnerable", "insecure").
 * Strictly zero LLM dependencies or calls.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

/**
 * Analyzes security boundaries for a given component symbol.
 *
 * @param {Object} symbol Parsed component symbol
 * @param {Object} [graph] Optional dependency graph
 * @returns {Object} Deterministic intelligence result conforming to BASE-ARCH-1
 */
function analyzeSecurityBoundaries(symbol, graph = null) {
  if (!symbol) {
    return createDeterministicResult({
      value: "unknown",
      primary: "unknown",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      secondary: []
    });
  }

  const p = symbol.parsed || {};
  const type = String(symbol.type || p.type || "ApexClass").trim();
  const name = String(symbol.name || p.name || "").trim();

  const evidence = [];
  const boundaries = [];

  // 1. SHARING BOUNDARIES (Apex Class)
  let sharingModel = "unspecified";
  if (type === "ApexClass") {
    if (p.sharing) {
      sharingModel = String(p.sharing).toLowerCase().trim();
      evidence.push(createEvidence("explicit-sharing-declaration", `Class '${name}' explicitly declares '${sharingModel}'.`));
    } else {
      const securitySignals = Array.isArray(p.behavior?.securitySignals) ? p.behavior.securitySignals : [];
      const sharingSignal = securitySignals.find(s =>
        typeof s === "string" && (s.includes("sharing") || s === "with sharing" || s === "without sharing" || s === "inherited sharing")
      );

      if (sharingSignal) {
        sharingModel = String(sharingSignal).toLowerCase().trim();
        evidence.push(createEvidence("parsed-sharing-signal", `Class '${name}' has parsed sharing signal '${sharingModel}'.`));
      } else {
        sharingModel = "unspecified";
        evidence.push(createEvidence("unspecified-sharing", `Class '${name}' has no explicit sharing declaration (defaults to unspecified/omitted sharing).`));
      }
    }
  }

  boundaries.push(sharingModel);

  // 2. EXPOSURE / ACCESS BOUNDARIES
  const annotations = Array.isArray(p.annotations) ? p.annotations.map(a => String(a).toLowerCase()) : [];
  const methods = Array.isArray(p.methods) ? p.methods : [];

  // REST exposed
  if (annotations.some(a => ["restresource", "httpget", "httppost", "httpput", "httpdelete", "httppatch"].includes(a))) {
    boundaries.push("REST exposed");
    evidence.push(createEvidence("annotation-restresource", `Class '${name}' is annotated with REST Web Service exposure (@RestResource / HTTP methods).`));
  }

  // Aura exposed
  if (methods.some(m => m.isAuraEnabled)) {
    boundaries.push("Aura exposed");
    evidence.push(createEvidence("annotation-auraenabled", `Component '${name}' contains @AuraEnabled method(s) exposed to LWC/Aura UI.`));
  }

  // Invocable exposed
  if (methods.some(m => m.isInvocable)) {
    boundaries.push("Invocable exposed");
    evidence.push(createEvidence("annotation-invocable", `Component '${name}' contains @InvocableMethod exposed to Flow / Process Builder.`));
  }

  // Trigger entry point
  if (type === "Trigger") {
    boundaries.push("Trigger entry point");
    evidence.push(createEvidence("type-trigger-boundary", `Component '${name}' is an Apex Trigger database execution boundary.`));
  }

  // UI entry point
  if (type === "LWC" || type === "Visualforce") {
    boundaries.push("UI entry point");
    evidence.push(createEvidence("type-ui-boundary", `Component '${name}' is a user interface entry point (${type}).`));
  }

  // Async entry point
  const asyncSignals = Array.isArray(p.behavior?.async) ? p.behavior.async : [];
  if (asyncSignals.length > 0) {
    boundaries.push("Async entry point");
    evidence.push(createEvidence("async-execution-boundary", `Component '${name}' implements asynchronous boundary execution (${asyncSignals.join(", ")}).`));
  }

  const primary = boundaries[0] || "unknown";
  const secondary = boundaries.slice(1);

  // Determine confidence
  let confidence = "high";
  if (sharingModel === "unspecified" && boundaries.length === 1) {
    confidence = "unknown";
  } else if (evidence.some(e => e.rule === "explicit-sharing-declaration" || e.rule.startsWith("annotation-") || e.rule.startsWith("type-"))) {
    confidence = "high";
  } else {
    confidence = "medium";
  }

  return createDeterministicResult({
    value: primary,
    primary,
    confidence,
    evidence,
    secondary,
    metadata: {
      sharingModel,
      boundaries,
      isRestExposed: boundaries.includes("REST exposed"),
      isAuraExposed: boundaries.includes("Aura exposed"),
      isInvocableExposed: boundaries.includes("Invocable exposed"),
      isTriggerEntryPoint: boundaries.includes("Trigger entry point"),
      isUiEntryPoint: boundaries.includes("UI entry point"),
      isAsyncEntryPoint: boundaries.includes("Async entry point")
    }
  });
}

/**
 * Analyzes security boundaries across all symbols in a registry.
 */
function analyzeAllSecurityBoundaries(registry, graph = null) {
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];
  const symbolBoundaries = new Map();

  const counts = {
    "with sharing": 0,
    "without sharing": 0,
    "inherited sharing": 0,
    "unspecified": 0,
    "REST exposed": 0,
    "Aura exposed": 0,
    "Invocable exposed": 0,
    "Trigger entry point": 0,
    "UI entry point": 0,
    "Async entry point": 0
  };

  for (const symbol of symbols) {
    const boundaryInfo = analyzeSecurityBoundaries(symbol, graph);
    symbolBoundaries.set(symbol.id, boundaryInfo);

    const activeBoundaries = boundaryInfo.metadata?.boundaries || [boundaryInfo.primary];
    for (const b of activeBoundaries) {
      if (counts[b] !== undefined) {
        counts[b]++;
      }
    }
  }

  return {
    symbolBoundaries,
    counts
  };
}

module.exports = {
  analyzeSecurityBoundaries,
  analyzeAllSecurityBoundaries
};
