/**
 * Deterministic Multi-Level Architecture Maps (WAVE-C4)
 *
 * Provides progressively different architectural views (System, Domain, Component, Change/Impact)
 * without introducing another analysis engine or making LLM calls.
 *
 * Strict boundary rules:
 *   - 100% deterministic rules, metadata, AST, and graph evidence.
 *   - 0 LLM runtime dependencies or calls.
 *   - Consumes canonical results from existing capabilities (roles, layers, entry points,
 *     external boundaries, bottlenecks, business criticality, smells, change simulator, etc.).
 *   - Stable across repeated runs (reproducible & machine-readable).
 *   - Complies with BASE-ARCH-1 contract.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

const { classifyComponentRole } = require("./role-classifier.cjs");
const { classifyComponentLayer } = require("./layer-classifier.cjs");
const { analyzeComponentDataImpact } = require("./data-impact.cjs");
const { detectEntryPoint } = require("./entry-points.cjs");
const { detectExternalBoundary } = require("./external-boundaries.cjs");
const { analyzeSecurityBoundaries } = require("./security-boundaries.cjs");
const { detectComponentBottleneck } = require("./bottleneck-detector.cjs");
const { detectComponentSmells } = require("./architecture-smells.cjs");
const { classifyComponentBusinessCriticality } = require("./business-criticality.cjs");
const { simulateChange } = require("./change-simulator.cjs");

/**
 * Infers domain/subsystem for a symbol using 100% deterministic heuristics:
 *   1. Directory path convention (e.g. force-app/main/default/classes/billing/...)
 *   2. Primary custom/standard object association (e.g. Account, Order, Asset)
 *   3. Naming prefix / PascalCase domain word extraction (e.g. AssetDashboardService -> Asset)
 */
function inferComponentDomain(symbol) {
  if (!symbol) return "General";

  const p = symbol.parsed || {};
  const name = String(symbol.name || p.name || "").trim();
  const file = String(symbol.file || p.file || "").replace(/\\/g, "/");

  // 1. Directory path convention
  const pathParts = file.split("/");
  const classesIdx = pathParts.indexOf("classes");
  if (classesIdx >= 0 && classesIdx < pathParts.length - 2) {
    const folderCandidate = pathParts[classesIdx + 1];
    if (folderCandidate && !["default", "main", "force-app"].includes(folderCandidate.toLowerCase())) {
      return folderCandidate.charAt(0).toUpperCase() + folderCandidate.slice(1);
    }
  }

  // 2. Objects association
  const objects = Array.isArray(p.objects) ? p.objects : [];
  if (objects.length > 0) {
    const primaryObj = objects[0].replace(/__c$/, "").replace(/__mdt$/, "").replace(/__e$/, "");
    if (primaryObj && primaryObj.length > 2) {
      return primaryObj.charAt(0).toUpperCase() + primaryObj.slice(1);
    }
  }

  // 3. Name prefix / entity extraction
  const nameMatch = name.match(/^([A-Z][a-z0-9]+)(?:[A-Z][a-zA-Z0-9]*)?$/);
  if (nameMatch && nameMatch[1]) {
    const prefix = nameMatch[1];
    const commonTechnicalPrefixes = new Set([
      "Test", "Sample", "Mock", "Abstract", "Base", "Common", "Util", "Utils", "Global", "System"
    ]);
    if (!commonTechnicalPrefixes.has(prefix) && prefix.length >= 3) {
      return prefix;
    }
  }

  // Fallback
  if (name.includes("Account")) return "Account";
  if (name.includes("Order")) return "Order";
  if (name.includes("Asset")) return "Asset";
  if (name.includes("Billing") || name.includes("Invoice")) return "Billing";
  if (name.includes("Case") || name.includes("Support")) return "Support";

  return "General";
}

/**
 * Level 1 — System Map
 * Major architectural domains/areas and their relationships.
 */
function buildSystemMap(registry, graph = null, options = {}) {
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];

  const symbolMap = new Map(symbols.map(s => [s.id, s]));
  const domainComponents = new Map();
  const componentToDomain = new Map();

  for (const symbol of symbols) {
    const domain = inferComponentDomain(symbol);
    componentToDomain.set(symbol.id, domain);
    if (!domainComponents.has(domain)) {
      domainComponents.set(domain, []);
    }
    domainComponents.get(domain).push(symbol.id);
  }

  // Aggregate domain-to-domain edges
  const domainRelationshipsMap = new Map();

  for (const edge of edges) {
    const sourceDomain = componentToDomain.get(edge.from) || "General";
    const targetDomain = componentToDomain.get(edge.to) || (
      edge.to.startsWith("External:") ? "External" : "General"
    );

    if (sourceDomain !== targetDomain) {
      const relKey = `${sourceDomain}->${targetDomain}`;
      if (!domainRelationshipsMap.has(relKey)) {
        domainRelationshipsMap.set(relKey, {
          sourceDomain,
          targetDomain,
          couplingCount: 0,
          sampleEdges: []
        });
      }
      const rel = domainRelationshipsMap.get(relKey);
      rel.couplingCount++;
      if (rel.sampleEdges.length < 5) {
        rel.sampleEdges.push({
          from: edge.from,
          to: edge.to,
          type: edge.type,
          evidence: edge.evidence || null
        });
      }
    }
  }

  const domains = [];
  for (const [domainName, compIds] of domainComponents.entries()) {
    domains.push({
      domain: domainName,
      componentCount: compIds.length,
      components: [...compIds].sort()
    });
  }
  domains.sort((a, b) => b.componentCount - a.componentCount || a.domain.localeCompare(b.domain));

  const relationships = Array.from(domainRelationshipsMap.values()).sort(
    (a, b) => b.couplingCount - a.couplingCount || a.sourceDomain.localeCompare(b.sourceDomain)
  );

  const evidence = [
    createEvidence("system-map-domains", `Identified ${domains.length} system architectural domain(s) across ${symbols.length} component(s).`),
    createEvidence("system-map-relationships", `Mapped ${relationships.length} inter-domain relationship link(s).`)
  ];

  return createDeterministicResult({
    value: `system-map-${domains.length}-domains`,
    primary: "system-map",
    confidence: "high",
    evidence,
    secondary: domains.map(d => d.domain),
    metadata: {
      mapLevel: 1,
      mapName: "System Map",
      totalDomains: domains.length,
      totalComponents: symbols.length,
      domains,
      relationships
    }
  });
}

/**
 * Level 2 — Domain Map
 * Components/groups inside each domain.
 */
function buildDomainMap(registry, graph = null, options = {}) {
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const selectedDomain = options.domain || null;

  const symbolMap = new Map(symbols.map(s => [s.id, s]));
  const domainGroups = new Map();

  for (const symbol of symbols) {
    const domain = inferComponentDomain(symbol);
    if (selectedDomain && domain.toLowerCase() !== selectedDomain.toLowerCase()) {
      continue;
    }

    if (!domainGroups.has(domain)) {
      domainGroups.set(domain, []);
    }

    const role = classifyComponentRole(symbol, graph);
    const layer = classifyComponentLayer(symbol, graph, null, role);
    const entryPoint = detectEntryPoint(symbol, graph);

    domainGroups.get(domain).push({
      id: symbol.id,
      name: symbol.name,
      type: symbol.type,
      file: symbol.file || null,
      role: role.primary,
      layer: layer.primary,
      isEntryPoint: entryPoint.isEntryPoint
    });
  }

  const domainBreakdowns = [];

  for (const [domainName, components] of domainGroups.entries()) {
    const compIds = new Set(components.map(c => c.id));
    const internalEdges = [];
    const outboundEdges = [];
    const inboundEdges = [];

    for (const edge of edges) {
      const sourceIn = compIds.has(edge.from);
      const targetIn = compIds.has(edge.to);

      if (sourceIn && targetIn) {
        internalEdges.push({
          from: edge.from,
          to: edge.to,
          type: edge.type,
          evidence: edge.evidence || null
        });
      } else if (sourceIn && !targetIn) {
        outboundEdges.push({
          from: edge.from,
          to: edge.to,
          type: edge.type,
          evidence: edge.evidence || null
        });
      } else if (!sourceIn && targetIn) {
        inboundEdges.push({
          from: edge.from,
          to: edge.to,
          type: edge.type,
          evidence: edge.evidence || null
        });
      }
    }

    components.sort((a, b) => a.name.localeCompare(b.name));

    domainBreakdowns.push({
      domain: domainName,
      componentCount: components.length,
      components,
      internalEdgeCount: internalEdges.length,
      outboundEdgeCount: outboundEdges.length,
      inboundEdgeCount: inboundEdges.length,
      internalEdges,
      outboundEdges,
      inboundEdges
    });
  }

  domainBreakdowns.sort((a, b) => b.componentCount - a.componentCount || a.domain.localeCompare(b.domain));

  const evidence = [
    createEvidence("domain-map-breakdown", `Generated Level 2 domain map breakdown for ${domainBreakdowns.length} domain group(s).`)
  ];

  return createDeterministicResult({
    value: `domain-map-${domainBreakdowns.length}-groups`,
    primary: "domain-map",
    confidence: "high",
    evidence,
    secondary: domainBreakdowns.map(d => d.domain),
    metadata: {
      mapLevel: 2,
      mapName: "Domain Map",
      selectedDomain: selectedDomain || "ALL",
      totalDomains: domainBreakdowns.length,
      domains: domainBreakdowns
    }
  });
}

/**
 * Level 3 — Component Map
 * Individual component relationships and important architectural attributes.
 */
function buildComponentMap(target = null, registry = null, graph = null, options = {}) {
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const metricList = Array.isArray(options.metricList) ? options.metricList : [];
  const metricById = new Map(metricList.map(m => [m.id, m]));

  let targetSymbol = null;
  if (target) {
    const rawTarget = typeof target === "string" ? target.trim() : (target.id || target.name);
    targetSymbol = symbols.find(
      s => s.id === rawTarget || s.name === rawTarget || s.id.toLowerCase() === rawTarget.toLowerCase() || s.name.toLowerCase() === rawTarget.toLowerCase()
    ) || (typeof target === "object" && target.parsed ? target : null);
  }

  const focusSymbols = targetSymbol ? [targetSymbol] : symbols;
  const nodesMap = new Map();

  for (const symbol of focusSymbols) {
    const metric = metricById.get(symbol.id) || null;
    const role = classifyComponentRole(symbol, graph, metric);
    const layer = classifyComponentLayer(symbol, graph, metric, role);
    const dataImpact = analyzeComponentDataImpact(symbol, graph, registry);
    const entryPoint = detectEntryPoint(symbol, graph, metric);
    const externalBoundary = detectExternalBoundary(symbol, graph, metric);
    const bottleneck = detectComponentBottleneck(symbol, graph, metric, options.cycles || []);
    const security = analyzeSecurityBoundaries(symbol, graph);
    const smells = detectComponentSmells(symbol, graph, metric, { cycles: options.cycles || [] });
    const businessCriticality = classifyComponentBusinessCriticality(symbol, graph, metric, role, layer, entryPoint, externalBoundary);

    nodesMap.set(symbol.id, {
      id: symbol.id,
      name: symbol.name,
      type: symbol.type,
      file: symbol.file || null,
      domain: inferComponentDomain(symbol),
      role: role.primary,
      layer: layer.primary,
      entryPoint: entryPoint.isEntryPoint,
      externalBoundary: externalBoundary.hasExternalBoundary,
      bottleneck: bottleneck.isBottleneck,
      businessCriticality: businessCriticality.primary,
      smellCount: smells.metadata?.totalSmells || 0,
      dataImpactObjects: (dataImpact.metadata?.objects || []).map(o => typeof o === "string" ? o : o.name),
      sharingModel: security.metadata?.sharingModel || "unspecified",
      metrics: {
        fanIn: metric?.fanIn ?? 0,
        fanOut: metric?.fanOut ?? 0,
        coupling: (metric?.fanIn ?? 0) + (metric?.fanOut ?? 0)
      }
    });
  }

  // If focused on a single component, include direct neighbors
  let relevantEdges = edges;
  if (targetSymbol) {
    const focusId = targetSymbol.id;
    relevantEdges = edges.filter(e => e.from === focusId || e.to === focusId);

    for (const edge of relevantEdges) {
      const neighborId = edge.from === focusId ? edge.to : edge.from;
      if (!nodesMap.has(neighborId)) {
        const neighborSymbol = symbols.find(s => s.id === neighborId);
        if (neighborSymbol) {
          const metric = metricById.get(neighborSymbol.id) || null;
          const role = classifyComponentRole(neighborSymbol, graph, metric);
          const layer = classifyComponentLayer(neighborSymbol, graph, metric, role);
          nodesMap.set(neighborSymbol.id, {
            id: neighborSymbol.id,
            name: neighborSymbol.name,
            type: neighborSymbol.type,
            file: neighborSymbol.file || null,
            domain: inferComponentDomain(neighborSymbol),
            role: role.primary,
            layer: layer.primary,
            metrics: {
              fanIn: metric?.fanIn ?? 0,
              fanOut: metric?.fanOut ?? 0,
              coupling: (metric?.fanIn ?? 0) + (metric?.fanOut ?? 0)
            }
          });
        } else {
          // External node
          nodesMap.set(neighborId, {
            id: neighborId,
            name: neighborId.replace(/^External:/, ""),
            type: "External",
            domain: "External",
            role: "unknown",
            layer: "unknown"
          });
        }
      }
    }
  }

  const nodes = Array.from(nodesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const mappedEdges = relevantEdges.map(e => ({
    from: e.from,
    to: e.to,
    type: e.type,
    evidence: e.evidence || null
  })).sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  const evidence = [
    createEvidence("component-map-construction", `Constructed Level 3 component map with ${nodes.length} node(s) and ${mappedEdges.length} edge(s).`)
  ];

  return createDeterministicResult({
    value: `component-map-${nodes.length}-nodes`,
    primary: "component-map",
    confidence: "high",
    evidence,
    secondary: targetSymbol ? [targetSymbol.id] : [],
    metadata: {
      mapLevel: 3,
      mapName: "Component Map",
      focalComponent: targetSymbol ? targetSymbol.id : null,
      totalNodes: nodes.length,
      totalEdges: mappedEdges.length,
      nodes,
      edges: mappedEdges
    }
  });
}

/**
 * Level 4 — Change / Impact Map
 * Relevant impacted components, paths, boundaries, and risks for a selected component/change.
 */
function buildImpactMap(target, operation = "modify_component", graph = null, registry = null, options = {}) {
  const simulation = simulateChange(target, operation, graph, registry, options);
  const meta = simulation.metadata || {};

  const evidence = [
    createEvidence("impact-map-simulation", `Generated Level 4 Change/Impact map for target '${meta.target || target}' under operation '${meta.operation || operation}'.`),
    ...(meta.riskSignals || [])
  ];

  return createDeterministicResult({
    value: `impact-map-${meta.blastRadiusLevel || "unknown"}`,
    primary: "impact-map",
    confidence: simulation.confidence || "high",
    evidence,
    secondary: [meta.operation || "modify_component", `blast-radius-${meta.blastRadiusLevel || "unknown"}`],
    metadata: {
      mapLevel: 4,
      mapName: "Change / Impact Map",
      targetComponent: meta.target || String(target),
      operation: meta.operation || "modify_component",
      blastRadiusLevel: meta.blastRadiusLevel || "SMALL",
      isDisconnected: Boolean(meta.isDisconnected),
      cycleInvolved: Boolean(meta.cycleInvolved),
      directDependents: meta.directDependents || [],
      transitiveDependents: meta.transitiveDependents || [],
      directDependencies: meta.directDependencies || [],
      transitiveDependencies: meta.transitiveDependencies || [],
      affectedObjects: meta.affectedObjects || [],
      affectedEntryPoints: meta.affectedEntryPoints || [],
      affectedExternalBoundaries: meta.affectedExternalBoundaries || [],
      affectedTests: meta.affectedTests || [],
      securityImpact: meta.securityImpact || [],
      riskSignals: meta.riskSignals || []
    }
  });
}

/**
 * Unified Multi-Level Architecture Maps Orchestrator.
 * Returns Levels 1, 2, 3, and (optionally) 4 maps in a single deterministic payload.
 */
function buildMultiLevelArchitectureMaps(target = null, registry = null, graph = null, options = {}) {
  const systemMap = buildSystemMap(registry, graph, options);
  const domainMap = buildDomainMap(registry, graph, options);
  const componentMap = buildComponentMap(target, registry, graph, options);
  const impactMap = target ? buildImpactMap(target, options.operation || "modify_component", graph, registry, options) : null;

  const maps = {
    level1_system: systemMap,
    level2_domain: domainMap,
    level3_component: componentMap
  };

  if (impactMap) {
    maps.level4_impact = impactMap;
  }

  const evidence = [
    createEvidence("multi-level-maps-orchestration", `Constructed deterministic multi-level architecture maps (Levels 1-3${impactMap ? ", 4" : ""}).`)
  ];

  return createDeterministicResult({
    value: "multi-level-architecture-maps",
    primary: "multi-level-architecture-maps",
    confidence: "high",
    evidence,
    metadata: {
      hasImpactMap: Boolean(impactMap),
      focalTarget: target ? (typeof target === "string" ? target : target.name) : null,
      maps
    }
  });
}

module.exports = {
  inferComponentDomain,
  buildSystemMap,
  buildDomainMap,
  buildComponentMap,
  buildImpactMap,
  buildMultiLevelArchitectureMaps
};
