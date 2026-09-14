/**
 * Centralized Deterministic Architectural Domain Classifier (B5)
 *
 * Classifies Salesforce DX components into coherent architectural domains
 * using 100% deterministic repository structure, naming conventions, metadata,
 * schema object dependencies, and graph relationships (BASE-ARCH-1).
 *
 * Domains are orthogonal to roles and layers.
 * Zero LLM runtime dependencies or calls.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

// Standard architectural suffixes to strip when extracting candidate domain stems
const ARCHITECTURAL_SUFFIXES = [
  "TestDataFactory",
  "ControllerExtension",
  "ControllerExt",
  "Controller",
  "Service",
  "Services",
  "Selector",
  "Selectors",
  "Repository",
  "Repo",
  "DAO",
  "Manager",
  "Processor",
  "Engine",
  "Handler",
  "Handlers",
  "Helper",
  "Helpers",
  "Util",
  "Utils",
  "Utility",
  "Factory",
  "Batch",
  "Queueable",
  "Schedulable",
  "DTO",
  "VO",
  "Model",
  "Wrapper",
  "Event",
  "Events",
  "Trigger",
  "Triggers",
  "Component",
  "View",
  "Adapter",
  "Gateway",
  "Client",
  "Queries",
  "Finder",
  "Constants",
  "Config",
  "Configuration",
  "Settings",
  "Test",
  "Tests"
];

// Stems that are too generic to form an architectural business domain on their own
const GENERIC_STEMS = new Set([
  "base",
  "app",
  "application",
  "common",
  "global",
  "util",
  "utils",
  "utility",
  "helper",
  "helpers",
  "core",
  "main",
  "system",
  "data",
  "test",
  "tests",
  "foo",
  "bar",
  "baz",
  "object",
  "field",
  "custom",
  "standard",
  "shared"
]);

function unique(values) {
  return [...new Set(values)];
}

function cleanDomainName(raw) {
  if (!raw) return "";
  let name = String(raw).trim();
  // Remove __c, __mdt, __e suffixes for custom objects
  name = name.replace(/__(?:c|mdt|e|r)$/i, "");
  // Capitalize first letter
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
}

/**
 * Extracts candidate domain stem from a component name.
 * e.g. "OrderService" -> "Order", "PaymentProcessingController" -> "PaymentProcessing"
 */
function extractNameDomainCandidate(name) {
  if (!name || typeof name !== "string") return null;

  for (const suffix of ARCHITECTURAL_SUFFIXES) {
    if (name.length > suffix.length && name.endsWith(suffix)) {
      const candidate = name.slice(0, name.length - suffix.length);
      if (candidate.length >= 2 && !GENERIC_STEMS.has(candidate.toLowerCase())) {
        return cleanDomainName(candidate);
      }
    }
  }

  // If no suffix matched, but name itself is an entity/domain name (e.g. "Order")
  if (name.length >= 2 && /^[A-Z][A-Za-z0-9_]*$/.test(name) && !GENERIC_STEMS.has(name.toLowerCase())) {
    const isArchitecturalKeyword = ARCHITECTURAL_SUFFIXES.some(s => s.toLowerCase() === name.toLowerCase());
    if (!isArchitecturalKeyword) {
      return cleanDomainName(name);
    }
  }

  return null;
}

/**
 * Extracts domain candidate from file path boundaries.
 * e.g. "force-app/main/default/classes/order/OrderService.cls" -> "Order"
 * e.g. "domains/billing/InvoiceService.cls" -> "Billing"
 */
function extractPathDomainCandidate(relFile) {
  if (!relFile || typeof relFile !== "string") return null;
  const normalized = relFile.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i].toLowerCase();
    if (["domains", "domain", "modules", "module", "features", "feature"].includes(part)) {
      const folder = parts[i + 1];
      if (folder && folder.length >= 2 && !GENERIC_STEMS.has(folder.toLowerCase())) {
        return cleanDomainName(folder);
      }
    }
  }

  // Check subfolders under classes/lwc/triggers
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i].toLowerCase();
    if (["classes", "lwc", "triggers", "aura", "pages"].includes(part)) {
      const subfolder = parts[i + 1];
      // If there is another folder level before the file
      if (i + 2 < parts.length && subfolder && subfolder.length >= 2 && !GENERIC_STEMS.has(subfolder.toLowerCase())) {
        return cleanDomainName(subfolder);
      }
    }
  }

  return null;
}

/**
 * Classifies the domain of a single component.
 */
function classifyComponentDomain(symbol, registry = null, graph = null, metric = null, domainContext = null) {
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

  const domainMatches = new Map();

  function addMatch(domain, rule, detail, weight = "medium") {
    const cleanDomain = cleanDomainName(domain);
    if (!cleanDomain || GENERIC_STEMS.has(cleanDomain.toLowerCase())) return;

    if (!domainMatches.has(cleanDomain)) {
      domainMatches.set(cleanDomain, []);
    }
    domainMatches.get(cleanDomain).push(createEvidence(rule, detail, { weight }));
  }

  // 1. Explicit domain metadata in symbol
  if (symbol.domain || p.domain) {
    const explicit = symbol.domain || p.domain;
    addMatch(explicit, "explicit-domain-metadata", `Component explicitly declares domain '${explicit}' in metadata.`, "high");
  }

  // 2. Directory / File Path Evidence
  const pathCandidate = extractPathDomainCandidate(relFile);
  if (pathCandidate) {
    addMatch(pathCandidate, "path-directory-domain", `Relative file path '${relFile}' is located in domain folder '${pathCandidate}'.`, "high");
  }

  // 3. Name Prefix / Stem Evidence
  const nameCandidate = extractNameDomainCandidate(name);
  if (nameCandidate) {
    // Check if domain stem is shared across multiple components or matches a known Object/Schema
    let isMultiComponent = false;
    let isKnownObject = false;

    if (domainContext) {
      isMultiComponent = (domainContext.stemCounts.get(nameCandidate) || 0) >= 2;
      isKnownObject = domainContext.objects.has(nameCandidate);
    } else if (registry && Array.isArray(registry.symbols)) {
      const count = registry.symbols.filter(s => {
        const cName = extractNameDomainCandidate(s.name);
        return cName === nameCandidate;
      }).length;
      isMultiComponent = count >= 2;
      isKnownObject = registry.symbols.some(s => s.type === "Object" && cleanDomainName(s.name) === nameCandidate);
    }

    if (isMultiComponent || isKnownObject || pathCandidate === nameCandidate) {
      addMatch(
        nameCandidate,
        "name-prefix-domain",
        `Component name '${name}' matches domain stem '${nameCandidate}' (supported by repository evidence).`,
        "high"
      );
    } else {
      addMatch(
        nameCandidate,
        "name-prefix-domain",
        `Component name '${name}' matches domain stem candidate '${nameCandidate}'.`,
        "medium"
      );
    }
  }

  // 4. Shared Object / Schema Dependencies
  if (type === "Object") {
    const objDomain = cleanDomainName(name);
    if (objDomain && !GENERIC_STEMS.has(objDomain.toLowerCase())) {
      addMatch(objDomain, "schema-type-domain", `Object symbol '${name}' represents domain entity '${objDomain}'.`, "high");
    }
  } else if (type === "Field") {
    const objName = symbol.object || p.object || name.split(".")[0];
    const objDomain = cleanDomainName(objName);
    if (objDomain && !GENERIC_STEMS.has(objDomain.toLowerCase())) {
      addMatch(objDomain, "schema-field-domain", `Field symbol '${name}' belongs to domain entity '${objDomain}'.`, "high");
    }
  }

  const objectsTouched = unique([
    ...(Array.isArray(p.objects) ? p.objects : []),
    ...(Array.isArray(p.soql) ? p.soql.map(s => s.object) : []),
    ...(Array.isArray(p.dml) ? p.dml.map(d => d.variable) : [])
  ].filter(Boolean).map(cleanDomainName));

  for (const objDomain of objectsTouched) {
    if (objDomain && !GENERIC_STEMS.has(objDomain.toLowerCase())) {
      addMatch(objDomain, "object-dependency-domain", `Component directly interacts with domain object '${objDomain}'.`, "medium");
    }
  }

  // 5. Graph Edge Neighborhood Evidence
  if (graph && Array.isArray(graph.edges)) {
    const neighborEdges = graph.edges.filter(e => e.from === symbol.id || e.to === symbol.id);
    const connectedNodeIds = unique(neighborEdges.map(e => e.from === symbol.id ? e.to : e.from));

    if (domainContext && domainContext.symbolDomains) {
      for (const connectedId of connectedNodeIds) {
        const neighborDomainResult = domainContext.symbolDomains.get(connectedId);
        if (neighborDomainResult && neighborDomainResult.primary !== "unknown") {
          const neighborDomain = neighborDomainResult.primary;
          addMatch(
            neighborDomain,
            "graph-cluster-domain",
            `Component is structurally connected via dependency graph to component in domain '${neighborDomain}'.`,
            "low"
          );
        }
      }
    }
  }

  // DETERMINE PRIMARY & SECONDARY DOMAINS
  if (domainMatches.size === 0) {
    return createDeterministicResult({
      value: "unknown",
      primary: "unknown",
      confidence: "unknown",
      evidence: [createEvidence("default-fallback", "Insufficient deterministic evidence to assign an architectural domain.")],
      secondary: []
    });
  }

  // Rank domains by weighted evidence
  const rankedDomains = [...domainMatches.entries()].map(([domain, matches]) => {
    let score = 0;
    for (const m of matches) {
      score += m.weight === "high" ? 3 : m.weight === "medium" ? 2 : 1;
    }
    return { domain, matches, score };
  }).sort((a, b) => b.score - a.score || a.domain.localeCompare(b.domain));

  const primaryEntry = rankedDomains[0];
  const primaryDomain = primaryEntry.domain;
  const primaryMatches = primaryEntry.matches;

  const secondaryDomains = rankedDomains
    .slice(1)
    .map(e => e.domain)
    .sort((a, b) => a.localeCompare(b));

  // Determine Confidence
  const highCount = primaryMatches.filter(m => m.weight === "high").length;
  let confidence = "low";
  if (highCount >= 1 || primaryMatches.length >= 2) {
    confidence = "high";
  } else if (primaryMatches.length === 1 && primaryMatches[0].weight === "medium") {
    confidence = "medium";
  }

  return createDeterministicResult({
    value: primaryDomain,
    primary: primaryDomain,
    confidence,
    evidence: primaryMatches.map(m => createEvidence(m.rule, m.detail)),
    secondary: secondaryDomains
  });
}

/**
 * Classifies domains across all components in a registry using a 2-pass deterministic algorithm.
 * Pass 1: Local & schema/prefix evidence collection.
 * Pass 2: Bounded graph cluster propagation for cross-domain awareness.
 */
function classifyAllDomains(registry, graph = null, metricList = []) {
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];

  // Pass 1 Pre-processing: Index domain stems & schema objects
  const stemCounts = new Map();
  const objects = new Set();

  for (const symbol of symbols) {
    const nameCandidate = extractNameDomainCandidate(symbol.name);
    if (nameCandidate) {
      stemCounts.set(nameCandidate, (stemCounts.get(nameCandidate) || 0) + 1);
    }
    if (symbol.type === "Object") {
      objects.add(cleanDomainName(symbol.name));
    }
  }

  const domainContext = {
    stemCounts,
    objects,
    symbolDomains: new Map()
  };

  // Pass 1: Primary component domain classification
  for (const symbol of symbols) {
    const metric = metricList ? metricList.find(m => m.id === symbol.id) || null : null;
    const domainInfo = classifyComponentDomain(symbol, registry, graph, metric, domainContext);
    domainContext.symbolDomains.set(symbol.id, domainInfo);
  }

  // Pass 2: Refine graph cluster connections deterministically
  const symbolDomains = new Map();
  const domainCounts = {};

  for (const symbol of symbols) {
    const metric = metricList ? metricList.find(m => m.id === symbol.id) || null : null;
    // Re-run with neighbor domain context populated
    const refinedInfo = classifyComponentDomain(symbol, registry, graph, metric, domainContext);

    symbolDomains.set(symbol.id, refinedInfo);

    const primary = refinedInfo.primary || "unknown";
    domainCounts[primary] = (domainCounts[primary] || 0) + 1;
  }

  // Sort domain summary counts deterministically
  const sortedDomainCounts = Object.keys(domainCounts)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = domainCounts[key];
      return acc;
    }, {});

  return {
    symbolDomains,
    domains: sortedDomainCounts
  };
}

module.exports = {
  ARCHITECTURAL_SUFFIXES,
  GENERIC_STEMS,
  cleanDomainName,
  extractNameDomainCandidate,
  extractPathDomainCandidate,
  classifyComponentDomain,
  classifyAllDomains
};
