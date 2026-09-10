#!/usr/bin/env node
/**
 * Salesforce Architecture & Refactoring Explorer Data Adapter
 *
 * Reads existing Salesforce Dependency Analyzer outputs (dependency-report.json,
 * architecture-metrics.json, analysis-snapshot.json) and transforms them into
 * the deterministic, stable explorer-data.json contract for read-only Explorer consumption.
 *
 * Usage:
 *   node scripts/export-explorer.cjs [inputDirOrFile] [outputFile]
 *   node scripts/export-explorer.cjs --input analyze --output analyze/explorer-data.json
 */

const fs = require("fs");
const path = require("path");

const CURRENT_SCHEMA_VERSION = "1.0.0";
const DEFAULT_ANALYZER_VERSION = "13.0.0";

function parseArgs(argv) {
  const args = argv.slice(2);
  let input = "analyze";
  let output = "analyze/explorer-data.json";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--input" && args[i + 1]) {
      input = args[i + 1];
      i++;
    } else if (arg === "--output" && args[i + 1]) {
      output = args[i + 1];
      i++;
    } else if (!arg.startsWith("--")) {
      if (i === 0 || (i === 1 && !args[0].startsWith("--"))) {
        if (i === 0) input = arg;
        if (i === 1) output = arg;
      }
    }
  }

  return { input, output };
}

function resolveInputFile(inputPath) {
  let targetFile = inputPath;
  if (fs.existsSync(inputPath) && fs.statSync(inputPath).isDirectory()) {
    const reportFile = path.join(inputPath, "dependency-report.json");
    const snapshotFile = path.join(inputPath, "analysis-snapshot.json");
    if (fs.existsSync(reportFile)) {
      targetFile = reportFile;
    } else if (fs.existsSync(snapshotFile)) {
      targetFile = snapshotFile;
    }
  }

  if (!fs.existsSync(targetFile)) {
    throw new Error(`Analyzer output file not found: ${targetFile}`);
  }

  return targetFile;
}

function normalizeNodeId(id, fallbackType = "ApexClass", fallbackName = "") {
  if (!id) return `${fallbackType}:${fallbackName}`;
  if (id.includes(":")) return id;
  return `${fallbackType}:${id}`;
}

function normalizeNodeType(type, id = "") {
  if (type) {
    if (type === "Object") return "CustomObject";
    if (type === "Field") return "CustomField";
    if (type === "Trigger") return "ApexTrigger";
    return type;
  }
  if (id.includes(":")) {
    const rawType = id.split(":")[0];
    if (rawType === "Object") return "CustomObject";
    if (rawType === "Field") return "CustomField";
    if (rawType === "Trigger") return "ApexTrigger";
    return rawType;
  }
  return "ApexClass";
}

function buildImpactSummaries(nodes, edges) {
  const impactMap = {};

  nodes.forEach(node => {
    impactMap[node.id] = {
      id: node.id,
      directDependencies: new Set(),
      directDependents: new Set(),
      transitiveDependencies: new Set(),
      transitiveDependents: new Set(),
      impactedTests: new Set()
    };
  });

  const outgoing = {};
  const incoming = {};

  nodes.forEach(node => {
    outgoing[node.id] = new Set();
    incoming[node.id] = new Set();
  });

  edges.forEach(edge => {
    const fromId = edge.source;
    const toId = edge.target;
    if (outgoing[fromId]) outgoing[fromId].add(toId);
    if (incoming[toId]) incoming[toId].add(fromId);
    if (impactMap[fromId]) impactMap[fromId].directDependencies.add(toId);
    if (impactMap[toId]) impactMap[toId].directDependents.add(fromId);
  });

  // BFS for transitive closures
  nodes.forEach(node => {
    const startId = node.id;

    // Transitive dependencies
    const queueDep = Array.from(outgoing[startId] || []);
    const visitedDep = new Set(queueDep);
    while (queueDep.length > 0) {
      const curr = queueDep.shift();
      const nextTargets = outgoing[curr] || new Set();
      nextTargets.forEach(nxt => {
        if (!visitedDep.has(nxt) && nxt !== startId) {
          visitedDep.add(nxt);
          queueDep.push(nxt);
        }
      });
    }
    impactMap[startId].transitiveDependencies = visitedDep;

    // Transitive dependents
    const queueDepnd = Array.from(incoming[startId] || []);
    const visitedDepnd = new Set(queueDepnd);
    while (queueDepnd.length > 0) {
      const curr = queueDepnd.shift();
      const nextSources = incoming[curr] || new Set();
      nextSources.forEach(src => {
        if (!visitedDepnd.has(src) && src !== startId) {
          visitedDepnd.add(src);
          queueDepnd.push(src);
        }
      });
    }
    impactMap[startId].transitiveDependents = visitedDepnd;

    // Identify impacted tests among transitive dependents
    const isTestNode = n => n.type === "ApexClass" && (n.behavior?.isTest || n.displayName.endsWith("Test"));
    visitedDepnd.forEach(depndId => {
      const depndNode = nodes.find(n => n.id === depndId);
      if (depndNode && isTestNode(depndNode)) {
        impactMap[startId].impactedTests.add(depndId);
      }
    });
  });

  const finalImpactSummaries = {};
  Object.keys(impactMap).sort().forEach(nodeId => {
    const item = impactMap[nodeId];
    const directDeps = Array.from(item.directDependencies).sort();
    const directDepnds = Array.from(item.directDependents).sort();
    const transDeps = Array.from(item.transitiveDependencies).sort();
    const transDepnds = Array.from(item.transitiveDependents).sort();
    const testList = Array.from(item.impactedTests).sort();

    const uniqueImpacted = new Set([...directDeps, ...directDepnds, ...transDeps, ...transDepnds]);

    finalImpactSummaries[nodeId] = {
      id: nodeId,
      directDependencies: directDeps,
      directDependents: directDepnds,
      transitiveDependencies: transDeps,
      transitiveDependents: transDepnds,
      impactedTests: testList,
      totalImpactCount: uniqueImpacted.size
    };
  });

  return finalImpactSummaries;
}

function exportExplorerData(inputPath, outputPath) {
  const resolvedInputFile = resolveInputFile(inputPath);
  const rawContent = fs.readFileSync(resolvedInputFile, "utf8");
  const reportData = JSON.parse(rawContent);

  const analyzerVersion = reportData.analyzerVersion || reportData.analyzer || DEFAULT_ANALYZER_VERSION;
  const generatedAt = reportData.generatedAt || new Date().toISOString();
  const sourceDirectory = reportData.sourceDirectory || "force-app/main/default";

  // Build Registry Lookup Map
  const registryMap = {};
  if (Array.isArray(reportData.registry)) {
    reportData.registry.forEach(item => {
      if (item && item.id) {
        registryMap[item.id] = item;
      }
    });
  }

  // Build Metrics Lookup Map
  const metricsMap = {};
  if (Array.isArray(reportData.metrics)) {
    reportData.metrics.forEach(item => {
      if (item && item.id) {
        metricsMap[item.id] = item;
      }
    });
  }

  // Process Nodes
  const rawNodes = Array.isArray(reportData.nodes) ? reportData.nodes : [];
  const normalizedNodes = rawNodes.map(rawNode => {
    const type = normalizeNodeType(rawNode.type, rawNode.id);
    const id = normalizeNodeId(rawNode.id, type, rawNode.name);
    const displayName = rawNode.name || (id.includes(":") ? id.split(":")[1] : id);
    const metricItem = metricsMap[id] || metricsMap[rawNode.id] || {};
    const registryItem = registryMap[id] || registryMap[rawNode.id] || {};
    const parsed = registryItem.parsed || {};
    const behaviorRaw = parsed.behavior || {};

    const fanIn = typeof metricItem.fanIn === "number" ? metricItem.fanIn : 0;
    const fanOut = typeof metricItem.fanOut === "number" ? metricItem.fanOut : 0;
    const coupling = typeof metricItem.coupling === "number" ? metricItem.coupling : fanIn + fanOut;
    const unresolved = typeof metricItem.unresolved === "number" ? metricItem.unresolved : 0;
    const score = typeof metricItem.score === "number" ? metricItem.score : coupling;

    const risk = (metricItem.risk || "LOW").toUpperCase();
    const riskReasons = Array.isArray(metricItem.reasons) ? [...metricItem.reasons] : [];

    const isTest = Boolean(parsed.isTest || (type === "ApexClass" && displayName.endsWith("Test")));

    return {
      id,
      displayName,
      type,
      file: rawNode.file || registryItem.file || "",
      metrics: {
        fanIn,
        fanOut,
        coupling,
        unresolved,
        score
      },
      risk,
      riskReasons,
      behavior: {
        isTest,
        sharing: parsed.sharing || null,
        publicContractsCount: Array.isArray(behaviorRaw.publicContracts) ? behaviorRaw.publicContracts.length : 0,
        asyncPatterns: Array.isArray(behaviorRaw.async) ? [...behaviorRaw.async] : [],
        securitySignalsCount: Array.isArray(behaviorRaw.securitySignals) ? behaviorRaw.securitySignals.length : 0,
        queryCount: Array.isArray(behaviorRaw.queries) ? behaviorRaw.queries.length : 0,
        dmlCount: Array.isArray(parsed.dml) ? parsed.dml.length : 0,
        calloutCount: Array.isArray(parsed.callouts) ? parsed.callouts.length : 0
      },
      refactoringReadiness: {
        isHighRisk: risk === "HIGH",
        hasCycles: false, // Updated after cycles pass
        hasUnresolved: unresolved > 0,
        testCoverageStatus: isTest ? "COVERED" : "UNTESTED"
      }
    };
  });

  // Sort nodes deterministically by ID
  normalizedNodes.sort((a, b) => a.id.localeCompare(b.id));

  // Process Edges
  const rawEdges = Array.isArray(reportData.edges) ? reportData.edges : [];
  const normalizedEdges = rawEdges.map(rawEdge => {
    const source = normalizeNodeId(rawEdge.from, "ApexClass", "");
    const target = normalizeNodeId(rawEdge.to, "ApexClass", "");
    const relationshipType = rawEdge.type || "unknown";
    const method = rawEdge.method || null;
    const evidence = rawEdge.evidence || "";
    const unresolved = Boolean(rawEdge.unresolved);
    const line = typeof rawEdge.line === "number" ? rawEdge.line : null;
    const column = typeof rawEdge.column === "number" ? rawEdge.column : null;
    const methodOwner = rawEdge.methodOwner || null;
    const file = rawEdge.file || "";

    const resCat = rawEdge.resolutionCategory || {};
    const canonical = rawEdge.canonical || {
      source: { type: source.split(":")[0], name: source.split(":")[1] || "", method: methodOwner },
      target: { type: target.split(":")[0], name: target.split(":")[1] || "", method },
      relationship: { type: relationshipType, resolution: unresolved ? "UNRESOLVED" : "EXACT" },
      location: { line, column }
    };

    const edgeId = rawEdge.id || `${source}|${target}|${relationshipType}|${method || ""}|${evidence}`;

    return {
      id: edgeId,
      source,
      target,
      relationshipType,
      method,
      evidence,
      unresolved,
      resolutionClassification: resCat.classification || (unresolved ? "UNKNOWN" : "RESOLVED_LOCAL"),
      resolutionStrategy: resCat.resolution || (unresolved ? "LLM" : "EXACT"),
      confidence: rawEdge.confidence || resCat.confidence || (unresolved ? "low" : "high"),
      line,
      column,
      methodOwner,
      file,
      canonical
    };
  });

  // Sort edges deterministically by ID
  normalizedEdges.sort((a, b) => a.id.localeCompare(b.id));

  // Process Cycles
  const rawCycles = Array.isArray(reportData.cycles) ? reportData.cycles : [];
  const cycleNodeSet = new Set();
  const normalizedCycles = rawCycles.map((cycleArr, idx) => {
    const cycleNodes = (Array.isArray(cycleArr) ? cycleArr : []).map(nodeId => normalizeNodeId(nodeId)).sort();
    cycleNodes.forEach(nid => cycleNodeSet.add(nid));
    return {
      id: `cycle-${idx + 1}`,
      size: cycleNodes.length,
      nodes: cycleNodes
    };
  });

  // Update node cycle readiness flags
  normalizedNodes.forEach(node => {
    if (cycleNodeSet.has(node.id)) {
      node.refactoringReadiness.hasCycles = true;
    }
  });

  // Process Unresolved References
  const unresolvedReferences = normalizedEdges
    .filter(e => e.unresolved)
    .map(e => ({
      edgeId: e.id,
      sourceNodeId: e.source,
      targetName: e.target.includes(":") ? e.target.split(":")[1] : e.target,
      targetType: e.target.includes(":") ? e.target.split(":")[0] : "External",
      file: e.file,
      line: e.line,
      evidence: e.evidence,
      reason: `Unresolved reference to ${e.target}`
    }));

  // Build Pre-computed Impact Summaries
  const impactSummaries = buildImpactSummaries(normalizedNodes, normalizedEdges);

  // Compute Summary Statistics
  const highRiskCount = normalizedNodes.filter(n => n.risk === "HIGH").length;
  const mediumRiskCount = normalizedNodes.filter(n => n.risk === "MEDIUM").length;
  const lowRiskCount = normalizedNodes.filter(n => n.risk === "LOW").length;

  const rawInventory = reportData.inventory || {};
  const inventory = {
    files: typeof rawInventory.files === "number" ? rawInventory.files : normalizedNodes.length,
    apexClasses: typeof rawInventory.apexClasses === "number" ? rawInventory.apexClasses : normalizedNodes.filter(n => n.type === "ApexClass").length,
    apexTriggers: typeof rawInventory.apexTriggers === "number" ? rawInventory.apexTriggers : normalizedNodes.filter(n => n.type === "ApexTrigger").length,
    lwcJs: typeof rawInventory.lwcJs === "number" ? rawInventory.lwcJs : normalizedNodes.filter(n => n.type === "LWC").length,
    lwcHtml: typeof rawInventory.lwcHtml === "number" ? rawInventory.lwcHtml : 0,
    visualforce: typeof rawInventory.visualforce === "number" ? rawInventory.visualforce : normalizedNodes.filter(n => n.type === "Visualforce").length,
    flows: typeof rawInventory.flows === "number" ? rawInventory.flows : normalizedNodes.filter(n => n.type === "Flow").length,
    objects: typeof rawInventory.objects === "number" ? rawInventory.objects : normalizedNodes.filter(n => n.type === "CustomObject").length,
    fields: typeof rawInventory.fields === "number" ? rawInventory.fields : normalizedNodes.filter(n => n.type === "CustomField").length
  };

  const explorerData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    analyzerVersion,
    generatedAt,
    sourceDirectory,
    summary: {
      nodeCount: normalizedNodes.length,
      edgeCount: normalizedEdges.length,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      cycleCount: normalizedCycles.length,
      unresolvedCount: unresolvedReferences.length,
      inventory
    },
    nodes: normalizedNodes,
    edges: normalizedEdges,
    cycles: normalizedCycles,
    unresolvedReferences,
    impactSummaries
  };

  // Ensure output parent directory exists
  const resolvedOutputFile = path.resolve(outputPath);
  const parentDir = path.dirname(resolvedOutputFile);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const jsonContent = JSON.stringify(explorerData, null, 2);
  fs.writeFileSync(resolvedOutputFile, jsonContent, "utf8");

  return {
    inputFile: resolvedInputFile,
    outputFile: resolvedOutputFile,
    explorerData
  };
}

// CLI Execution
if (require.main === module) {
  try {
    const { input, output } = parseArgs(process.argv);
    console.log(`Salesforce Architecture Explorer Data Adapter`);
    console.log(`============================================`);
    console.log(`Input:  ${input}`);
    console.log(`Output: ${output}`);

    const res = exportExplorerData(input, output);

    console.log(``);
    console.log(`Successfully generated explorer data contract!`);
    console.log(`  Nodes: ${res.explorerData.summary.nodeCount}`);
    console.log(`  Edges: ${res.explorerData.summary.edgeCount}`);
    console.log(`  High Risk: ${res.explorerData.summary.highRiskCount}`);
    console.log(`  Cycles: ${res.explorerData.summary.cycleCount}`);
    console.log(`  Unresolved: ${res.explorerData.summary.unresolvedCount}`);
    console.log(`Destination: ${res.outputFile}`);
  } catch (err) {
    console.error(`Adapter failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  exportExplorerData,
  normalizeNodeId,
  normalizeNodeType,
  buildImpactSummaries
};
