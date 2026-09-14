/**
 * Centralized Deterministic Component Entry-Point Detector
 *
 * Identifies Salesforce DX components that represent architectural entry points
 * into the system using 100% deterministic metadata, AST annotations,
 * interfaces, and graph relationships.
 *
 * Entry Point Types:
 *   Trigger, LWC, Visualforce, REST, Async, Invocable, AuraEnabled, InboundEmail
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

function unique(values) {
  return [...new Set(values)];
}

/**
 * Detects whether a component is an architectural entry point and identifies
 * all applicable entry-point types and evidence.
 *
 * @param {Object} symbol - The component symbol object from the registry.
 * @param {Object} [graph] - Optional dependency graph for edge analysis.
 * @param {Object} [metric] - Optional metrics object.
 * @returns {Object} Deterministic intelligence result conforming to contract.
 */
function detectEntryPoint(symbol, graph = null, metric = null) {
  if (!symbol) {
    const result = createDeterministicResult({
      value: "none",
      primary: "none",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      secondary: []
    });
    result.isEntryPoint = false;
    result.entryPointTypes = [];
    return result;
  }

  const p = symbol.parsed || {};
  const name = String(symbol.name || p.name || "").trim();
  const type = String(symbol.type || p.type || "ApexClass").trim();

  const detectedTypesMap = new Map(); // entryPointType -> list of evidence items

  function addTypeMatch(epType, rule, detail, weight = "high") {
    if (!detectedTypesMap.has(epType)) {
      detectedTypesMap.set(epType, []);
    }
    detectedTypesMap.get(epType).push(createEvidence(rule, detail, { weight }));
  }

  // 1. Trigger
  if (type === "Trigger") {
    addTypeMatch("Trigger", "type-trigger", "Component is an Apex Trigger (database event entry-point).", "high");
  }

  // 2. LWC
  if (type === "LWC") {
    addTypeMatch("LWC", "type-lwc", "Component is a Lightning Web Component UI entry-point.", "high");
  }

  // 3. Visualforce
  if (type === "Visualforce") {
    addTypeMatch("Visualforce", "type-visualforce", "Component is a Visualforce page/component UI entry-point.", "high");
  }

  // 4. REST Annotations / REST Web Services
  const annotations = Array.isArray(p.annotations) ? p.annotations.map(a => String(a).toLowerCase()) : [];
  if (annotations.some(a => ["restresource", "httpget", "httppost", "httpput", "httpdelete", "httppatch"].includes(a))) {
    addTypeMatch("REST", "annotation-rest", "Component is annotated as a REST Web Service (@RestResource or HTTP method annotation).", "high");
  }

  // 5. Asynchronous Interfaces / Annotations
  const asyncSignals = Array.isArray(p.behavior?.async) ? p.behavior.async : [];
  const implementsList = Array.isArray(p.implements) ? p.implements.map(i => String(i).toLowerCase()) : [];

  const isBatchable = asyncSignals.includes("Batchable") || implementsList.some(i => i.includes("batchable"));
  const isQueueable = asyncSignals.includes("Queueable") || implementsList.some(i => i.includes("queueable"));
  const isSchedulable = asyncSignals.includes("Schedulable") || implementsList.some(i => i.includes("schedulable"));
  const isFuture = asyncSignals.includes("@future") || annotations.includes("future");

  if (isBatchable || isQueueable || isSchedulable || isFuture) {
    const details = [];
    if (isBatchable) details.push("Batchable");
    if (isQueueable) details.push("Queueable");
    if (isSchedulable) details.push("Schedulable");
    if (isFuture) details.push("@future");
    addTypeMatch("Async", "interface-async", `Component provides asynchronous execution entry-point (${details.join(", ")}).`, "high");
  }

  // 6. Invocable / Flow Interfaces
  const methods = Array.isArray(p.methods) ? p.methods : [];
  const hasInvocable = methods.some(m => m.isInvocable) || annotations.includes("invocablemethod");
  if (hasInvocable) {
    addTypeMatch("Invocable", "annotation-invocable", "Component contains @InvocableMethod exposed to Flow or Process Builder.", "high");
  }

  // 7. AuraEnabled / UI Exposed
  const hasAuraEnabled = methods.some(m => m.isAuraEnabled) || annotations.includes("auraenabled");
  if (hasAuraEnabled) {
    addTypeMatch("AuraEnabled", "annotation-auraenabled", "Component contains @AuraEnabled methods exposed to LWC/Aura UI.", "high");
  }

  // 8. Inbound Email Handler
  if (implementsList.some(i => i.includes("inboundemailhandler"))) {
    addTypeMatch("InboundEmail", "interface-inboundemail", "Component implements Messaging.InboundEmailHandler platform interface.", "high");
  }

  // 9. Graph Edges Exposure
  if (graph && Array.isArray(graph.edges)) {
    const hasLwcConsumer = graph.edges.some(e => e.to === symbol.id && e.type === "lwc-apex");
    if (hasLwcConsumer && !detectedTypesMap.has("AuraEnabled")) {
      addTypeMatch("AuraEnabled", "edge-lwc-consumer", "Component is directly called by one or more Lightning Web Components.", "high");
    }

    const hasVfConsumer = graph.edges.some(e => e.to === symbol.id && e.type === "visualforce-controller");
    if (hasVfConsumer && !detectedTypesMap.has("Visualforce")) {
      addTypeMatch("Visualforce", "edge-vf-controller", "Component serves as a Visualforce controller or extension.", "high");
    }
  }

  const entryPointTypes = Array.from(detectedTypesMap.keys());
  const isEntryPoint = entryPointTypes.length > 0;

  // Gather all evidence items
  const allEvidence = [];
  for (const epType of entryPointTypes) {
    const items = detectedTypesMap.get(epType) || [];
    for (const item of items) {
      allEvidence.push(item);
    }
  }

  if (!isEntryPoint) {
    allEvidence.push(
      createEvidence("no-entry-point-criteria", "Component does not match any deterministic entry-point criteria.", { weight: "low" })
    );
  }

  const primaryType = isEntryPoint ? entryPointTypes[0] : "none";
  const secondaryTypes = isEntryPoint ? entryPointTypes.slice(1) : [];
  const confidence = isEntryPoint ? "high" : "unknown";

  const result = createDeterministicResult({
    value: isEntryPoint ? entryPointTypes.join(", ") : "none",
    primary: primaryType,
    confidence,
    evidence: allEvidence.map(e => createEvidence(e.rule, e.detail)),
    secondary: secondaryTypes
  });

  result.isEntryPoint = isEntryPoint;
  result.entryPointTypes = entryPointTypes;

  return result;
}

/**
 * Detects entry points across all symbols in a registry and produces summary counts.
 *
 * @param {Object} registry - Symbol registry.
 * @param {Object} [graph] - Dependency graph.
 * @param {Array} [metricList] - Metrics list.
 * @returns {Object} Map of symbol entry points and summary counts.
 */
function detectAllEntryPoints(registry, graph = null, metricList = []) {
  const metricById = new Map((metricList || []).map(m => [m.id, m]));
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];

  const symbolEntryPoints = new Map();
  const summary = {
    totalComponents: symbols.length,
    totalEntryPoints: 0,
    nonEntryPoints: 0,
    byType: {
      Trigger: 0,
      LWC: 0,
      Visualforce: 0,
      REST: 0,
      Async: 0,
      Invocable: 0,
      AuraEnabled: 0,
      InboundEmail: 0
    }
  };

  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const epInfo = detectEntryPoint(symbol, graph, metric);

    symbolEntryPoints.set(symbol.id, epInfo);

    if (epInfo.isEntryPoint) {
      summary.totalEntryPoints++;
      for (const epType of epInfo.entryPointTypes) {
        if (summary.byType[epType] !== undefined) {
          summary.byType[epType]++;
        } else {
          summary.byType[epType] = 1;
        }
      }
    } else {
      summary.nonEntryPoints++;
    }
  }

  return {
    symbolEntryPoints,
    summary
  };
}

module.exports = {
  detectEntryPoint,
  detectAllEntryPoints
};
