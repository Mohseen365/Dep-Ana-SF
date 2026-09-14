/**
 * Centralized Deterministic Component-Role Classifier (Prompt 17)
 *
 * Classifies Salesforce DX components into explainable architectural roles
 * using 100% deterministic repository evidence.
 *
 * Roles:
 *   entry-point, controller, service, selector, repository,
 *   data-access, domain, utility, configuration, test, unknown
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

const ROLE_PRECEDENCE = [
  "test",
  "configuration",
  "entry-point",
  "controller",
  "service",
  "repository",
  "selector",
  "data-access",
  "domain",
  "utility",
  "unknown"
];

function unique(values) {
  return [...new Set(values)];
}

function classifyComponentRole(symbol, graph = null, metric = null) {
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

  const rulesMatchedByRole = {
    test: [],
    configuration: [],
    "entry-point": [],
    controller: [],
    service: [],
    repository: [],
    selector: [],
    "data-access": [],
    domain: [],
    utility: [],
    unknown: []
  };

  function addMatch(role, rule, detail, weight = "medium") {
    rulesMatchedByRole[role].push(createEvidence(rule, detail, { weight }));
  }

  // 1. TEST RULES
  if (p.isTest || Boolean(symbol.isTest) || (Array.isArray(p.annotations) && p.annotations.some(a => String(a).toLowerCase() === "istest"))) {
    addMatch("test", "is-test-attribute", "Component is explicitly declared as an Apex test (@isTest / isTest=true).", "high");
  }
  if (/(?:test|tests|testdatafactory)$/i.test(name)) {
    addMatch("test", "name-suffix-test", `Component name '${name}' matches Apex test naming convention.`, "high");
  }
  if (/(?:^|\/)(?:test|tests)\//i.test(relFile) && !relFile.includes("tests/fixtures")) {
    addMatch("test", "path-directory-test", `Relative file path '${relFile}' is located in a test directory.`, "medium");
  }

  // 2. CONFIGURATION RULES
  if (/(?:config|configuration|settings|constants|custommetadata|metadata)$/i.test(name)) {
    addMatch("configuration", "name-suffix-config", `Component name '${name}' matches configuration naming convention.`, "high");
  }
  if (type === "Object" && (name.endsWith("__mdt") || name.endsWith("__setting") || name.endsWith("__e"))) {
    addMatch("configuration", "schema-type-config", `Object '${name}' is custom metadata, setting, or platform event.`, "high");
  }

  // 3. ENTRY-POINT RULES
  if (type === "Trigger") {
    addMatch("entry-point", "type-trigger", "Component is an Apex Trigger (database automation entry-point).", "high");
  }
  if (type === "Visualforce") {
    addMatch("entry-point", "type-visualforce", "Component is a Visualforce page/component UI entry-point.", "high");
  }
  if (type === "LWC") {
    addMatch("entry-point", "type-lwc", "Component is a Lightning Web Component UI entry-point.", "high");
  }
  const annotations = Array.isArray(p.annotations) ? p.annotations.map(a => String(a).toLowerCase()) : [];
  if (annotations.some(a => ["restresource", "httpget", "httppost", "httpput", "httpdelete", "httppatch"].includes(a))) {
    addMatch("entry-point", "annotation-rest", "Component is annotated as a REST Web Service (@RestResource).", "high");
  }
  const asyncSignals = Array.isArray(p.behavior?.async) ? p.behavior.async : [];
  if (asyncSignals.some(s => ["Batchable", "Queueable", "Schedulable"].includes(s))) {
    addMatch("entry-point", "interface-async-entry", `Component implements asynchronous execution entry-point (${asyncSignals.join(", ")}).`, "high");
  }

  // 4. CONTROLLER RULES
  if (/(?:controller|controllerextension|controllerext)$/i.test(name)) {
    addMatch("controller", "name-suffix-controller", `Component name '${name}' matches UI Controller naming convention.`, "high");
  }
  const methods = Array.isArray(p.methods) ? p.methods : [];
  const hasAuraEnabled = methods.some(m => m.isAuraEnabled);
  const hasInvocable = methods.some(m => m.isInvocable);

  if (hasAuraEnabled) {
    addMatch("controller", "annotation-auraenabled", "Component contains @AuraEnabled methods exposed to LWC/Aura UI.", "high");
  }
  if (hasInvocable) {
    addMatch("controller", "annotation-invocable", "Component contains @InvocableMethod exposed to Flow/Process Builder.", "high");
  }
  if (graph && graph.edges) {
    const hasLwcConsumer = graph.edges.some(e => e.to === symbol.id && e.type === "lwc-apex");
    if (hasLwcConsumer) {
      addMatch("controller", "edge-lwc-consumer", "Component is directly called by one or more Lightning Web Components.", "high");
    }
    const hasVfConsumer = graph.edges.some(e => e.to === symbol.id && e.type === "visualforce-controller");
    if (hasVfConsumer) {
      addMatch("controller", "edge-vf-controller", "Component serves as a Visualforce controller or extension.", "high");
    }
  }

  // 5. SERVICE RULES
  if (/(?:service|handler|manager|processor|engine|workflow)$/i.test(name)) {
    addMatch("service", "name-suffix-service", `Component name '${name}' matches Service layer naming convention.`, "high");
  }
  if (/(?:^|\/)(?:services|handlers)\//i.test(relFile)) {
    addMatch("service", "path-directory-service", `Relative file path '${relFile}' is in a service or handler directory.`, "medium");
  }

  // 6. REPOSITORY RULES
  if (/(?:repository|repo|dao)$/i.test(name)) {
    addMatch("repository", "name-suffix-repository", `Component name '${name}' matches Repository/DAO naming convention.`, "high");
  }
  const dmlOps = Array.isArray(p.dml) ? p.dml : [];
  if (dmlOps.length > 0 && !name.endsWith("Controller") && !name.endsWith("Service")) {
    addMatch("repository", "dml-encapsulation", `Component performs DML persistence operations (${dmlOps.length} DML statement(s)).`, "medium");
  }

  // 7. SELECTOR RULES
  if (/(?:selector|queries|finder)$/i.test(name)) {
    addMatch("selector", "name-suffix-selector", `Component name '${name}' matches Selector querying naming convention.`, "high");
  }
  const soqlQueries = Array.isArray(p.soql) ? p.soql : [];
  if (soqlQueries.length > 0 && dmlOps.length === 0 && /(?:selector|query|queries|finder)$/i.test(name)) {
    addMatch("selector", "soql-pure-encapsulation", "Component performs SOQL data queries without DML operations.", "high");
  }

  // 8. DATA-ACCESS RULES
  if (soqlQueries.length > 0 || dmlOps.length > 0) {
    if (!name.match(/(?:Controller|Service|Selector|Repository|Test|Util|Utils)$/i)) {
      addMatch("data-access", "data-access-operations", "Component directly executes SOQL or DML operations.", "medium");
    }
  }

  // 9. DOMAIN RULES
  if (/(?:domain|dto|vo|model|wrapper|request|response)$/i.test(name)) {
    addMatch("domain", "name-suffix-domain", `Component name '${name}' matches Domain/DTO entity naming convention.`, "high");
  }

  // 10. UTILITY RULES
  if (/(?:util|utils|utility|helper|helpers|common)$/i.test(name)) {
    addMatch("utility", "name-suffix-utility", `Component name '${name}' matches Utility/Helper naming convention.`, "high");
  }
  const fanIn = metric?.fanIn ?? 0;
  const fanOut = metric?.fanOut ?? 0;
  if (fanIn >= 5 && fanOut <= 2 && soqlQueries.length === 0 && dmlOps.length === 0 && type === "ApexClass") {
    addMatch("utility", "graph-high-fan-in-utility", `Component has high fan-in (${fanIn}) with minimal outbound state coupling (${fanOut}).`, "medium");
  }

  // DETERMINE PRIMARY & SECONDARY ROLES USING PRECEDENCE
  let primaryRole = "unknown";
  let primaryMatches = [];
  const secondaryRoles = [];

  for (const role of ROLE_PRECEDENCE) {
    const matches = rulesMatchedByRole[role];
    if (matches.length > 0) {
      if (primaryRole === "unknown") {
        primaryRole = role;
        primaryMatches = matches;
      } else {
        secondaryRoles.push(role);
      }
    }
  }

  if (primaryRole === "unknown") {
    primaryMatches.push(
      createEvidence("default-fallback", "Insufficient deterministic evidence to assign a specific architectural role.", { weight: "low" })
    );
  }

  // CONFIDENCE DETERMINATION
  let confidence = "low";
  if (primaryRole === "unknown") {
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
    value: primaryRole,
    primary: primaryRole,
    confidence,
    evidence: primaryMatches.map(m => createEvidence(m.rule, m.detail)),
    secondary: unique(secondaryRoles)
  });
}

/**
 * Classifies roles across all symbols in a registry and produces summary counts.
 */
function classifyAllRoles(registry, graph = null, metricList = []) {
  const metricById = new Map((metricList || []).map(m => [m.id, m]));
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];

  const symbolRoles = new Map();
  const roleCounts = {
    "entry-point": 0,
    controller: 0,
    service: 0,
    selector: 0,
    repository: 0,
    "data-access": 0,
    domain: 0,
    utility: 0,
    configuration: 0,
    test: 0,
    unknown: 0
  };

  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const roleInfo = classifyComponentRole(symbol, graph, metric);

    symbolRoles.set(symbol.id, roleInfo);
    if (roleCounts[roleInfo.primary] !== undefined) {
      roleCounts[roleInfo.primary]++;
    } else {
      roleCounts.unknown++;
    }
  }

  return {
    symbolRoles,
    roles: roleCounts
  };
}

module.exports = {
  ROLE_PRECEDENCE,
  classifyComponentRole,
  classifyAllRoles
};
