/**
 * Centralized Deterministic Component-Layer Classifier (Prompt 18)
 *
 * Classifies Salesforce DX components into explainable architectural layers
 * using 100% deterministic repository evidence and contract standards (BASE-ARCH-1).
 *
 * Layers:
 *   presentation, entry, application, service, domain, data,
 *   integration, configuration, test, unknown
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

const LAYER_PRECEDENCE = [
  "test",
  "configuration",
  "presentation",
  "integration",
  "entry",
  "application",
  "service",
  "data",
  "domain",
  "unknown"
];

function unique(values) {
  return [...new Set(values)];
}

function classifyComponentLayer(symbol, graph = null, metric = null, roleInfo = null) {
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
  const name = String(symbol.name || p.name || "").trim();
  const type = String(symbol.type || p.type || "ApexClass").trim();
  const relFile = String(symbol.file || p.file || "").replace(/\\/g, "/");

  const rulesMatchedByLayer = {
    test: [],
    configuration: [],
    presentation: [],
    integration: [],
    entry: [],
    application: [],
    service: [],
    data: [],
    domain: [],
    unknown: []
  };

  function addMatch(layer, rule, detail, weight = "medium") {
    rulesMatchedByLayer[layer].push(createEvidence(rule, detail, { weight }));
  }

  const annotations = Array.isArray(p.annotations) ? p.annotations.map(a => String(a).toLowerCase()) : [];
  const methods = Array.isArray(p.methods) ? p.methods : [];
  const callouts = Array.isArray(p.callouts) ? p.callouts : [];
  const soqlQueries = Array.isArray(p.soql) ? p.soql : [];
  const dmlOps = Array.isArray(p.dml) ? p.dml : [];
  const asyncSignals = Array.isArray(p.behavior?.async) ? p.behavior.async : [];

  // 1. TEST LAYER RULES
  if (p.isTest || Boolean(symbol.isTest) || annotations.includes("istest")) {
    addMatch("test", "is-test-attribute", "Component is explicitly declared as an Apex test (@isTest / isTest=true).", "high");
  }
  if (/(?:test|tests|testdatafactory)$/i.test(name)) {
    addMatch("test", "name-suffix-test", `Component name '${name}' matches Apex test naming convention.`, "high");
  }
  if (/(?:^|\/)(?:test|tests)\//i.test(relFile) && !relFile.includes("tests/fixtures")) {
    addMatch("test", "path-directory-test", `Relative file path '${relFile}' is located in a test directory.`, "medium");
  }

  // 2. CONFIGURATION LAYER RULES
  if (/(?:config|configuration|settings|constants|custommetadata|metadata)$/i.test(name)) {
    addMatch("configuration", "name-suffix-config", `Component name '${name}' matches configuration naming convention.`, "high");
  }
  if (type === "Object" && (name.endsWith("__mdt") || name.endsWith("__setting") || name.endsWith("__e"))) {
    addMatch("configuration", "schema-type-config", `Object '${name}' is custom metadata, setting, or platform event.`, "high");
  }

  // 3. PRESENTATION LAYER RULES
  if (type === "LWC") {
    addMatch("presentation", "type-lwc", "Component is a Lightning Web Component UI presentation layer.", "high");
  }
  if (type === "Visualforce") {
    addMatch("presentation", "type-visualforce", "Component is a Visualforce UI presentation layer.", "high");
  }

  // 4. INTEGRATION LAYER RULES
  if (callouts.length > 0) {
    addMatch("integration", "outbound-callouts", `Component performs outbound API callouts (${callouts.join(", ")}).`, "high");
  }
  if (annotations.some(a => ["restresource", "httpget", "httppost", "httpput", "httpdelete", "httppatch"].includes(a))) {
    addMatch("integration", "annotation-rest-endpoint", "Component is annotated as a REST Web Service endpoint (@RestResource).", "high");
  }
  if (/(?:callout|integration|api|adapter|gateway|client)$/i.test(name)) {
    addMatch("integration", "name-suffix-integration", `Component name '${name}' matches Integration naming convention.`, "high");
  }

  // 5. ENTRY LAYER RULES
  if (type === "Trigger") {
    addMatch("entry", "type-trigger", "Component is an Apex Trigger database automation entry point.", "high");
  }
  if (asyncSignals.some(s => ["Batchable", "Queueable", "Schedulable"].includes(s))) {
    addMatch("entry", "interface-async-entry", `Component implements asynchronous execution entry point (${asyncSignals.join(", ")}).`, "high");
  }
  const hasInvocable = methods.some(m => m.isInvocable);
  if (hasInvocable) {
    addMatch("entry", "annotation-invocable-entry", "Component exposes @InvocableMethod entry point for Flow / Process Builder.", "high");
  }

  // 6. APPLICATION LAYER RULES
  if (/(?:controller|controllerextension|controllerext|handler|workflow|orchestrator)$/i.test(name)) {
    addMatch("application", "name-suffix-application", `Component name '${name}' matches Application/Controller naming convention.`, "high");
  }
  const hasAuraEnabled = methods.some(m => m.isAuraEnabled);
  if (hasAuraEnabled) {
    addMatch("application", "annotation-auraenabled", "Component exposes @AuraEnabled controller methods to presentation layer.", "high");
  }
  if (graph && graph.edges) {
    const hasLwcConsumer = graph.edges.some(e => e.to === symbol.id && e.type === "lwc-apex");
    if (hasLwcConsumer) {
      addMatch("application", "edge-lwc-consumer", "Component is directly invoked by Lightning Web Components.", "high");
    }
  }

  // 7. SERVICE LAYER RULES
  if (/(?:service|processor|engine)$/i.test(name)) {
    addMatch("service", "name-suffix-service", `Component name '${name}' matches Service layer naming convention.`, "high");
  }
  if (/(?:^|\/)(?:services)\//i.test(relFile)) {
    addMatch("service", "path-directory-service", `Relative file path '${relFile}' is in a services directory.`, "medium");
  }

  // 8. DATA LAYER RULES
  if (/(?:selector|repository|repo|dao|finder|queries)$/i.test(name)) {
    addMatch("data", "name-suffix-data", `Component name '${name}' matches Data/Selector/Repository naming convention.`, "high");
  }
  if (type === "Object" || type === "Field") {
    addMatch("data", "schema-data-type", `Component '${name}' is a Salesforce schema Object/Field.`, "high");
  }
  if ((soqlQueries.length > 0 || dmlOps.length > 0) && !/(?:Controller|Service|Test|Util|Utils)$/i.test(name)) {
    addMatch("data", "data-operations", "Component directly performs SOQL or DML data operations.", "medium");
  }

  // 9. DOMAIN LAYER RULES
  if (/(?:domain|dto|vo|model|wrapper|request|response)$/i.test(name)) {
    addMatch("domain", "name-suffix-domain", `Component name '${name}' matches Domain/DTO entity naming convention.`, "high");
  }

  // DETERMINE PRIMARY & SECONDARY LAYERS USING PRECEDENCE
  let primaryLayer = "unknown";
  let primaryMatches = [];
  const secondaryLayers = [];

  for (const layer of LAYER_PRECEDENCE) {
    const matches = rulesMatchedByLayer[layer];
    if (matches.length > 0) {
      if (primaryLayer === "unknown") {
        primaryLayer = layer;
        primaryMatches = matches;
      } else {
        secondaryLayers.push(layer);
      }
    }
  }

  if (primaryLayer === "unknown") {
    primaryMatches.push(
      createEvidence("default-fallback", "Insufficient deterministic evidence to assign a specific architectural layer.", { weight: "low" })
    );
  }

  // CONFIDENCE DETERMINATION
  let confidence = "low";
  if (primaryLayer === "unknown") {
    confidence = "unknown";
  } else {
    const highCount = primaryMatches.filter(m => m.weight === "high").length;
    if (primaryMatches.length >= 2 || highCount >= 1) {
      confidence = "high";
    } else if (primaryMatches.length === 1) {
      confidence = "medium";
    }
  }

  return createDeterministicResult({
    value: primaryLayer,
    primary: primaryLayer,
    confidence,
    evidence: primaryMatches.map(m => createEvidence(m.rule, m.detail)),
    secondary: unique(secondaryLayers)
  });
}

/**
 * Classifies layers across all symbols in a registry and produces summary counts.
 */
function classifyAllLayers(registry, graph = null, metricList = [], symbolRoles = null) {
  const metricById = new Map((metricList || []).map(m => [m.id, m]));
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];

  const symbolLayers = new Map();
  const layerCounts = {
    presentation: 0,
    entry: 0,
    application: 0,
    service: 0,
    domain: 0,
    data: 0,
    integration: 0,
    configuration: 0,
    test: 0,
    unknown: 0
  };

  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const roleInfo = symbolRoles ? symbolRoles.get(symbol.id) || null : null;
    const layerInfo = classifyComponentLayer(symbol, graph, metric, roleInfo);

    symbolLayers.set(symbol.id, layerInfo);
    if (layerCounts[layerInfo.primary] !== undefined) {
      layerCounts[layerInfo.primary]++;
    } else {
      layerCounts.unknown++;
    }
  }

  return {
    symbolLayers,
    layers: layerCounts
  };
}

module.exports = {
  LAYER_PRECEDENCE,
  classifyComponentLayer,
  classifyAllLayers
};
