/**
 * Centralized Deterministic External Boundary Detector
 *
 * Identifies Salesforce DX components that interact with systems or services
 * outside the local application architecture using 100% deterministic metadata,
 * AST annotations, code patterns, and graph edges.
 *
 * Boundary Types:
 *   HTTPCallout, NamedCredential, ExternalService, PlatformEvent,
 *   OutboundMessaging, InboundEmail, ExternalObject, RESTService
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
 * Detects whether a component interacts with external system boundaries and
 * identifies all applicable boundary types, targets, evidence, and confidence.
 *
 * @param {Object} symbol - Component symbol object.
 * @param {Object} [graph] - Dependency graph.
 * @param {Object} [metric] - Metrics object.
 * @returns {Object} Deterministic intelligence result conforming to contract.
 */
function detectExternalBoundary(symbol, graph = null, metric = null) {
  if (!symbol) {
    const result = createDeterministicResult({
      value: "none",
      primary: "none",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      secondary: []
    });
    result.hasExternalBoundary = false;
    result.boundaryTypes = [];
    result.targets = [];
    return result;
  }

  const p = symbol.parsed || {};
  const name = String(symbol.name || p.name || "").trim();
  const type = String(symbol.type || p.type || "ApexClass").trim();
  const relFile = String(symbol.file || p.file || "").replace(/\\/g, "/");

  const boundaryMap = new Map(); // boundaryType -> list of evidence items
  const detectedTargets = new Set();

  function addMatch(bType, rule, detail, target = null, weight = "high") {
    if (!boundaryMap.has(bType)) {
      boundaryMap.set(bType, []);
    }
    boundaryMap.get(bType).push(createEvidence(rule, detail, { weight }));
    if (target) {
      detectedTargets.add(String(target).trim());
    }
  }

  // 1. HTTP Callouts
  const callouts = Array.isArray(p.callouts) ? p.callouts : [];
  if (callouts.length > 0) {
    addMatch("HTTPCallout", "apex-callout-signals", `Component performs HTTP callouts (${callouts.join(", ")}).`, "HTTP API", "high");
  }

  // 2. REST Service Annotations (Inbound REST Web Service)
  const annotations = Array.isArray(p.annotations) ? p.annotations.map(a => String(a).toLowerCase()) : [];
  if (annotations.some(a => ["restresource", "httpget", "httppost", "httpput", "httpdelete", "httppatch"].includes(a))) {
    addMatch("RESTService", "annotation-rest-service", "Component exposes an inbound REST web service interface (@RestResource or HTTP annotations).", "Inbound REST Web Service", "high");
  }

  // 3. Named Credentials & External Services
  const dependencies = Array.isArray(p.dependencies) ? p.dependencies : [];
  for (const dep of dependencies) {
    const ev = String(dep.evidence || "");
    if (/callout:[A-Za-z0-9_]+/i.test(ev)) {
      const match = ev.match(/callout:([A-Za-z0-9_]+)/i);
      const credentialName = match ? match[1] : "NamedCredential";
      addMatch("NamedCredential", "evidence-named-credential", `Component references Named Credential endpoint 'callout:${credentialName}'.`, `callout:${credentialName}`, "high");
    }
    if (/ExternalService\./i.test(ev) || /ExternalService/i.test(dep.toName || "")) {
      addMatch("ExternalService", "type-external-service", `Component invokes External Service '${dep.toName || ev}'.`, dep.toName || "ExternalService", "high");
    }
  }

  // 4. Platform Events
  const asyncSignals = Array.isArray(p.behavior?.async) ? p.behavior.async : [];
  if (asyncSignals.some(s => String(s).includes("Platform Event") || String(s).includes("EventBus"))) {
    addMatch("PlatformEvent", "behavior-platform-event", "Component publishes or manages Platform Events via EventBus.", "EventBus / Platform Event", "high");
  }

  const objects = Array.isArray(p.objects) ? p.objects : [];
  for (const obj of objects) {
    if (String(obj).endsWith("__e")) {
      addMatch("PlatformEvent", "schema-platform-event-object", `Component interacts with Platform Event custom object '${obj}'.`, obj, "high");
    }
    if (String(obj).endsWith("__x")) {
      addMatch("ExternalObject", "schema-external-object", `Component accesses Salesforce External Object '${obj}'.`, obj, "high");
    }
  }

  // 5. Inbound / Outbound Messaging & Email
  const implementsList = Array.isArray(p.implements) ? p.implements.map(i => String(i).toLowerCase()) : [];
  if (implementsList.some(i => i.includes("inboundemailhandler"))) {
    addMatch("InboundEmail", "interface-inbound-email", "Component implements Messaging.InboundEmailHandler interface.", "Inbound Email Service", "high");
  }

  // 6. External Graph Edges
  if (graph && Array.isArray(graph.edges)) {
    const externalEdges = graph.edges.filter(e => (e.from === symbol.id || e.to === symbol.id) && (String(e.from).startsWith("External:") || String(e.to).startsWith("External:")));
    for (const edge of externalEdges) {
      const targetId = edge.from === symbol.id ? edge.to : edge.from;
      if (!boundaryMap.has("HTTPCallout") && !boundaryMap.has("ExternalService") && !boundaryMap.has("ExternalObject")) {
        addMatch("ExternalService", "graph-external-edge", `Component is connected to external reference '${targetId}'.`, targetId, "medium");
      }
    }
  }

  const boundaryTypes = Array.from(boundaryMap.keys());
  const hasExternalBoundary = boundaryTypes.length > 0;

  const allEvidence = [];
  for (const bType of boundaryTypes) {
    const items = boundaryMap.get(bType) || [];
    for (const item of items) {
      allEvidence.push(item);
    }
  }

  if (!hasExternalBoundary) {
    allEvidence.push(
      createEvidence("no-external-boundary-criteria", "Component does not exhibit any deterministic external boundary interactions.", { weight: "low" })
    );
  }

  const primaryType = hasExternalBoundary ? boundaryTypes[0] : "none";
  const secondaryTypes = hasExternalBoundary ? boundaryTypes.slice(1) : [];
  const confidence = hasExternalBoundary ? "high" : "unknown";

  const targetsList = Array.from(detectedTargets);

  const result = createDeterministicResult({
    value: hasExternalBoundary ? boundaryTypes.join(", ") : "none",
    primary: primaryType,
    confidence,
    evidence: allEvidence.map(e => createEvidence(e.rule, e.detail)),
    secondary: secondaryTypes,
    metadata: {
      targets: targetsList
    }
  });

  result.hasExternalBoundary = hasExternalBoundary;
  result.boundaryTypes = boundaryTypes;
  result.targets = targetsList;

  return result;
}

/**
 * Detects external boundaries across all symbols in a registry and produces summary counts.
 *
 * @param {Object} registry - Symbol registry.
 * @param {Object} [graph] - Dependency graph.
 * @param {Array} [metricList] - Metrics list.
 * @returns {Object} Map of symbol external boundaries and summary counts.
 */
function detectAllExternalBoundaries(registry, graph = null, metricList = []) {
  const metricById = new Map((metricList || []).map(m => [m.id, m]));
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];

  const symbolExternalBoundaries = new Map();
  const summary = {
    totalComponents: symbols.length,
    componentsWithExternalBoundary: 0,
    componentsWithoutExternalBoundary: 0,
    byType: {
      HTTPCallout: 0,
      NamedCredential: 0,
      ExternalService: 0,
      PlatformEvent: 0,
      OutboundMessaging: 0,
      InboundEmail: 0,
      ExternalObject: 0,
      RESTService: 0
    }
  };

  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const ebInfo = detectExternalBoundary(symbol, graph, metric);

    symbolExternalBoundaries.set(symbol.id, ebInfo);

    if (ebInfo.hasExternalBoundary) {
      summary.componentsWithExternalBoundary++;
      for (const bType of ebInfo.boundaryTypes) {
        if (summary.byType[bType] !== undefined) {
          summary.byType[bType]++;
        } else {
          summary.byType[bType] = 1;
        }
      }
    } else {
      summary.componentsWithoutExternalBoundary++;
    }
  }

  return {
    symbolExternalBoundaries,
    summary
  };
}

module.exports = {
  detectExternalBoundary,
  detectAllExternalBoundaries
};
