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
 *   node scripts/export-explorer.cjs --input analyze --output analyze/projects/movie-app/explorer-data.json --project movie-app
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { analyzeTestGap } = require("../dependency-analyzer.cjs");

const CURRENT_SCHEMA_VERSION = "1.0.0";
const DEFAULT_ANALYZER_VERSION = "13.0.0";

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let input = "analyze";
  let output = "";
  let project = "default";
  let projectName = "";
  let projectDesc = "";
  let source = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--input" && args[i + 1]) {
      input = args[i + 1];
      i++;
    } else if (arg === "--output" && args[i + 1]) {
      output = args[i + 1];
      i++;
    } else if ((arg === "--project" || arg === "--project-id") && args[i + 1]) {
      project = slugify(args[i + 1]) || "default";
      i++;
    } else if (arg === "--project-name" && args[i + 1]) {
      projectName = args[i + 1];
      if (project === "default" && projectName) {
        project = slugify(projectName) || "default";
      }
      i++;
    } else if (arg === "--project-desc" && args[i + 1]) {
      projectDesc = args[i + 1];
      i++;
    } else if (arg === "--source" && args[i + 1]) {
      source = args[i + 1];
      i++;
    } else if (!arg.startsWith("--")) {
      if (i === 0 || (i === 1 && !args[0].startsWith("--"))) {
        if (i === 0) input = arg;
        if (i === 1) output = arg;
      }
    }
  }

  if (!output) {
    if (project && project !== "default") {
      output = path.join("analyze", "projects", project, "explorer-data.json");
    } else {
      output = "analyze/explorer-data.json";
    }
  }

  return { input, output, project, projectName, projectDesc, source };
}

function isSameSource(sourceA, sourceB) {
  if (!sourceA || !sourceB) return false;
  const normA = path.resolve(sourceA).toLowerCase().replace(/\\/g, "/");
  const normB = path.resolve(sourceB).toLowerCase().replace(/\\/g, "/");
  return normA === normB;
}

function getReportSourceDir(reportFilePath) {
  try {
    if (!reportFilePath || !fs.existsSync(reportFilePath)) return null;
    const content = JSON.parse(fs.readFileSync(reportFilePath, "utf8"));
    return content.sourceDirectory || content.discovered?.sourceDir || content.source?.sourceDir || null;
  } catch (_) {
    return null;
  }
}

function resolveInputFile(inputPath, options = {}) {
  const rawProjectId = options.project || options.projectId || "default";
  const projectId = slugify(rawProjectId) || "default";
  const explicitSource = options.source || null;

  const matchesSource = (candidateFile) => {
    if (!candidateFile || !fs.existsSync(candidateFile)) return false;
    if (!explicitSource) return true;
    const candidateSource = getReportSourceDir(candidateFile);
    return candidateSource ? isSameSource(candidateSource, explicitSource) : true;
  };

  // 1. Check explicit inputPath if provided
  if (inputPath && inputPath !== "analyze") {
    if (fs.existsSync(inputPath) && fs.statSync(inputPath).isFile()) {
      if (matchesSource(inputPath)) return inputPath;
    }
    if (fs.existsSync(inputPath) && fs.statSync(inputPath).isDirectory()) {
      const reportFile = path.join(inputPath, "dependency-report.json");
      const snapshotFile = path.join(inputPath, "analysis-snapshot.json");
      const foundFile = fs.existsSync(reportFile) ? reportFile : fs.existsSync(snapshotFile) ? snapshotFile : null;
      if (foundFile && matchesSource(foundFile)) return foundFile;
    }
  }

  // 2. Check project-specific analyze directory
  if (projectId !== "default") {
    const projReport = path.resolve(__dirname, "..", "analyze", "projects", projectId, "dependency-report.json");
    const projSnapshot = path.resolve(__dirname, "..", "analyze", "projects", projectId, "analysis-snapshot.json");
    const foundProj = fs.existsSync(projReport) ? projReport : fs.existsSync(projSnapshot) ? projSnapshot : null;
    if (foundProj && matchesSource(foundProj)) return foundProj;
  }

  // 3. If explicit source was provided and exists, run analyzer on explicit source
  if (explicitSource && fs.existsSync(explicitSource)) {
    console.log(`Analyzer output not found or stale for source '${explicitSource}'. Running analyzer...`);
    const analyzerScript = path.join(__dirname, "..", "dependency-analyzer.cjs");
    const execSync = require("child_process").execSync;

    const outputDir = projectId !== "default"
      ? path.resolve(__dirname, "..", "analyze", "projects", projectId)
      : path.resolve(__dirname, "..", "analyze");

    try {
      execSync(`node "${analyzerScript}" analyze "${explicitSource}" --output-dir "${outputDir}"`, {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit"
      });
    } catch (err) {
      console.warn(`Analyzer execution notice: ${err.message}`);
    }

    const generatedReport = path.join(outputDir, "dependency-report.json");
    if (fs.existsSync(generatedReport)) {
      return generatedReport;
    }
  }

  // 4. Check root or default analyze directory for report
  const rootReport = path.resolve(__dirname, "..", "dependency-report.json");
  const rootSnapshot = path.resolve(__dirname, "..", "analysis-snapshot.json");
  const analyzeReport = path.resolve(__dirname, "..", "analyze", "dependency-report.json");
  const analyzeSnapshot = path.resolve(__dirname, "..", "analyze", "analysis-snapshot.json");

  const foundDefault = [rootReport, rootSnapshot, analyzeReport, analyzeSnapshot].find((f) => fs.existsSync(f) && matchesSource(f));
  if (foundDefault) return foundDefault;

  throw new Error(`Analyzer output file not found in directory: ${inputPath}`);
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

  nodes.forEach((node) => {
    impactMap[node.id] = {
      id: node.id,
      directDependencies: new Set(),
      directDependents: new Set(),
      transitiveDependencies: new Set(),
      transitiveDependents: new Set(),
      impactedTests: new Set(),
    };
  });

  const outgoing = {};
  const incoming = {};

  nodes.forEach((node) => {
    outgoing[node.id] = new Set();
    incoming[node.id] = new Set();
  });

  edges.forEach((edge) => {
    const fromId = edge.source;
    const toId = edge.target;
    if (outgoing[fromId]) outgoing[fromId].add(toId);
    if (incoming[toId]) incoming[toId].add(fromId);
    if (impactMap[fromId]) impactMap[fromId].directDependencies.add(toId);
    if (impactMap[toId]) impactMap[toId].directDependents.add(fromId);
  });

  // BFS for transitive closures
  nodes.forEach((node) => {
    const startId = node.id;

    // Transitive dependencies
    const queueDep = Array.from(outgoing[startId] || []);
    const visitedDep = new Set(queueDep);
    while (queueDep.length > 0) {
      const curr = queueDep.shift();
      const nextTargets = outgoing[curr] || new Set();
      nextTargets.forEach((nxt) => {
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
      nextSources.forEach((src) => {
        if (!visitedDepnd.has(src) && src !== startId) {
          visitedDepnd.add(src);
          queueDepnd.push(src);
        }
      });
    }
    impactMap[startId].transitiveDependents = visitedDepnd;

    // Identify impacted tests among transitive dependents
    const isTestNode = (n) =>
      n.type === "ApexClass" &&
      (n.behavior?.isTest || n.displayName.endsWith("Test"));
    visitedDepnd.forEach((depndId) => {
      const depndNode = nodes.find((n) => n.id === depndId);
      if (depndNode && isTestNode(depndNode)) {
        impactMap[startId].impactedTests.add(depndId);
      }
    });
  });

  const finalImpactSummaries = {};
  Object.keys(impactMap)
    .sort()
    .forEach((nodeId) => {
      const item = impactMap[nodeId];
      const directDeps = Array.from(item.directDependencies).sort();
      const directDepnds = Array.from(item.directDependents).sort();
      const transDeps = Array.from(item.transitiveDependencies).sort();
      const transDepnds = Array.from(item.transitiveDependents).sort();
      const testList = Array.from(item.impactedTests).sort();

      const uniqueImpacted = new Set([
        ...directDeps,
        ...directDepnds,
        ...transDeps,
        ...transDepnds,
      ]);

      finalImpactSummaries[nodeId] = {
        id: nodeId,
        directDependencies: directDeps,
        directDependents: directDepnds,
        transitiveDependencies: transDeps,
        transitiveDependents: transDepnds,
        impactedTests: testList,
        totalImpactCount: uniqueImpacted.size,
      };
    });

  return finalImpactSummaries;
}

function exportExplorerData(inputPath, outputPath, options = {}) {
  const rawProjectId = options.project || options.projectId || "default";
  const projectId = slugify(rawProjectId) || "default";

  let effectiveOutputPath = outputPath;
  if (!effectiveOutputPath || (projectId !== "default" && (effectiveOutputPath === "analyze/explorer-data.json" || effectiveOutputPath === "explorer-data.json"))) {
    effectiveOutputPath = path.join("analyze", "projects", projectId, "explorer-data.json");
  }

  const resolvedInputFile = resolveInputFile(inputPath, { ...options, project: projectId });
  const rawContent = fs.readFileSync(resolvedInputFile, "utf8");
  const reportData = JSON.parse(rawContent);

  const analyzerVersion =
    reportData.analyzerVersion ||
    reportData.analyzer ||
    DEFAULT_ANALYZER_VERSION;
  const generatedAt = reportData.generatedAt || new Date().toISOString();
  const sourceDirectory =
    options.source || reportData.sourceDirectory || "force-app/main/default";

  const projectName =
    options.projectName ||
    (projectId !== "default" ? projectId : "Default Salesforce Project");
  const projectDesc =
    options.projectDesc || "Salesforce DX Architecture Analysis";

  // Build Registry Lookup Map
  const registryMap = {};
  if (Array.isArray(reportData.registry)) {
    reportData.registry.forEach((item) => {
      if (item && item.id) {
        registryMap[item.id] = item;
      }
    });
  }

  // Build Metrics Lookup Map
  const metricsMap = {};
  if (Array.isArray(reportData.metrics)) {
    reportData.metrics.forEach((item) => {
      if (item && item.id) {
        metricsMap[item.id] = item;
      }
    });
  }
  const rawRegistry = Array.isArray(reportData.registry)
    ? reportData.registry
    : [];
  const rawEdges = Array.isArray(reportData.edges) ? reportData.edges : [];

  // Process Nodes
  const rawNodes = Array.isArray(reportData.nodes) ? reportData.nodes : [];
  const normalizedNodes = rawNodes.map((rawNode) => {
    const type = normalizeNodeType(rawNode.type, rawNode.id);
    const id = normalizeNodeId(rawNode.id, type, rawNode.name);
    const displayName =
      rawNode.name || (id.includes(":") ? id.split(":")[1] : id);
    const metricItem = metricsMap[id] || metricsMap[rawNode.id] || {};
    const registryItem = registryMap[id] || registryMap[rawNode.id] || {};
    const parsed = registryItem.parsed || {};
    const behaviorRaw = parsed.behavior || {};

    const fanIn = typeof metricItem.fanIn === "number" ? metricItem.fanIn : 0;
    const fanOut =
      typeof metricItem.fanOut === "number" ? metricItem.fanOut : 0;
    const coupling =
      typeof metricItem.coupling === "number"
        ? metricItem.coupling
        : fanIn + fanOut;
    const unresolved =
      typeof metricItem.unresolved === "number" ? metricItem.unresolved : 0;
    const score =
      typeof metricItem.score === "number" ? metricItem.score : coupling;

    const risk = (metricItem.risk || "LOW").toUpperCase();
    const riskReasons = Array.isArray(metricItem.reasons)
      ? [...metricItem.reasons]
      : [];

    const isTest = Boolean(
      parsed.isTest || (type === "ApexClass" && displayName.endsWith("Test")),
    );

    const testGapResult = analyzeTestGap(
      { id, type, name: displayName, parsed },
      rawRegistry,
      rawEdges,
    );

    let testCoverageStatus = "UNTESTED";
    if (isTest || testGapResult.signal === "test-component") {
      testCoverageStatus = "COVERED";
    } else if (testGapResult.signal === "covered") {
      testCoverageStatus = "COVERED";
    } else if (testGapResult.signal === "likely-covered") {
      testCoverageStatus = "LIKELY_COVERED";
    } else if (testGapResult.signal === "known-coverage-failure") {
      testCoverageStatus = "KNOWN_COVERAGE_FAILURE";
    } else if (testGapResult.signal === "ambiguous-test") {
      testCoverageStatus = "AMBIGUOUS";
    } else {
      testCoverageStatus = "UNTESTED";
    }

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
        score,
      },
      risk,
      riskReasons,
      behavior: {
        isTest,
        sharing: parsed.sharing || null,
        publicContractsCount: Array.isArray(behaviorRaw.publicContracts)
          ? behaviorRaw.publicContracts.length
          : 0,
        asyncPatterns: Array.isArray(behaviorRaw.async)
          ? [...behaviorRaw.async]
          : [],
        securitySignalsCount: Array.isArray(behaviorRaw.securitySignals)
          ? behaviorRaw.securitySignals.length
          : 0,
        queryCount: Array.isArray(behaviorRaw.queries)
          ? behaviorRaw.queries.length
          : 0,
        dmlCount: Array.isArray(parsed.dml) ? parsed.dml.length : 0,
        calloutCount: Array.isArray(parsed.callouts)
          ? parsed.callouts.length
          : 0,
      },
      refactoringReadiness: {
        isHighRisk: risk === "HIGH",
        hasCycles: false, // Updated after cycles pass
        hasUnresolved: unresolved > 0,
        testCoverageStatus,
      },
    };
  });

  // Sort nodes deterministically by ID
  normalizedNodes.sort((a, b) => a.id.localeCompare(b.id));

  // Process Edges
  const normalizedEdges = rawEdges.map((rawEdge) => {
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
    const sourceNormType = normalizeNodeType(source.split(":")[0]);
    const targetNormType = normalizeNodeType(target.split(":")[0]);

    const canonical = {
      source: {
        type: normalizeNodeType(rawEdge.canonical?.source?.type || sourceNormType),
        name: rawEdge.canonical?.source?.name || (source.includes(":") ? source.split(":")[1] : source),
        method: rawEdge.canonical?.source?.method || methodOwner,
      },
      target: {
        type: normalizeNodeType(rawEdge.canonical?.target?.type || targetNormType),
        name: rawEdge.canonical?.target?.name || (target.includes(":") ? target.split(":")[1] : target),
        method: rawEdge.canonical?.target?.method || method,
      },
      relationship: {
        type: rawEdge.canonical?.relationship?.type || relationshipType,
        resolution: rawEdge.canonical?.relationship?.resolution || (unresolved ? "UNRESOLVED" : "EXACT"),
      },
      location: rawEdge.canonical?.location || { line, column },
    };

    const edgeId =
      rawEdge.id ||
      `${source}|${target}|${relationshipType}|${method || ""}|${evidence}`;

    return {
      id: edgeId,
      source,
      target,
      relationshipType,
      method,
      evidence,
      unresolved,
      resolutionClassification:
        resCat.classification || (unresolved ? "UNKNOWN" : "RESOLVED_LOCAL"),
      resolutionStrategy: resCat.resolution || (unresolved ? "LLM" : "EXACT"),
      confidence:
        rawEdge.confidence ||
        resCat.confidence ||
        (unresolved ? "low" : "high"),
      line,
      column,
      methodOwner,
      file,
      canonical,
    };
  });

  // Sort edges deterministically by ID
  normalizedEdges.sort((a, b) => a.id.localeCompare(b.id));

  // Process Cycles
  const rawCycles = Array.isArray(reportData.cycles) ? reportData.cycles : [];
  const cycleNodeSet = new Set();
  const normalizedCycles = rawCycles.map((cycleArr, idx) => {
    const cycleNodes = (Array.isArray(cycleArr) ? cycleArr : [])
      .map((nodeId) => normalizeNodeId(nodeId))
      .sort();
    cycleNodes.forEach((nid) => cycleNodeSet.add(nid));
    return {
      id: `cycle-${idx + 1}`,
      size: cycleNodes.length,
      nodes: cycleNodes,
    };
  });

  // Update node cycle readiness flags
  normalizedNodes.forEach((node) => {
    if (cycleNodeSet.has(node.id)) {
      node.refactoringReadiness.hasCycles = true;
    }
  });

  // Process Unresolved References
  const unresolvedReferences = normalizedEdges
    .filter((e) => e.unresolved)
    .map((e) => ({
      edgeId: e.id,
      sourceNodeId: e.source,
      targetName: e.target.includes(":") ? e.target.split(":")[1] : e.target,
      targetType: e.target.includes(":") ? e.target.split(":")[0] : "External",
      file: e.file,
      line: e.line,
      evidence: e.evidence,
      reason: `Unresolved reference to ${e.target}`,
    }));

  // Build Pre-computed Impact Summaries
  const impactSummaries = buildImpactSummaries(
    normalizedNodes,
    normalizedEdges,
  );

  // Compute Summary Statistics
  const highRiskCount = normalizedNodes.filter((n) => n.risk === "HIGH").length;
  const mediumRiskCount = normalizedNodes.filter(
    (n) => n.risk === "MEDIUM",
  ).length;
  const lowRiskCount = normalizedNodes.filter((n) => n.risk === "LOW").length;

  const rawInventory = reportData.inventory || {};
  const inventory = {
    files:
      typeof rawInventory.files === "number"
        ? rawInventory.files
        : normalizedNodes.length,
    apexClasses:
      typeof rawInventory.apexClasses === "number"
        ? rawInventory.apexClasses
        : normalizedNodes.filter((n) => n.type === "ApexClass").length,
    apexTriggers:
      typeof rawInventory.apexTriggers === "number"
        ? rawInventory.apexTriggers
        : normalizedNodes.filter((n) => n.type === "ApexTrigger").length,
    lwcJs:
      typeof rawInventory.lwcJs === "number"
        ? rawInventory.lwcJs
        : normalizedNodes.filter((n) => n.type === "LWC").length,
    lwcHtml:
      typeof rawInventory.lwcHtml === "number" ? rawInventory.lwcHtml : 0,
    visualforce:
      typeof rawInventory.visualforce === "number"
        ? rawInventory.visualforce
        : normalizedNodes.filter((n) => n.type === "Visualforce").length,
    flows:
      typeof rawInventory.flows === "number"
        ? rawInventory.flows
        : normalizedNodes.filter((n) => n.type === "Flow").length,
    objects:
      typeof rawInventory.objects === "number"
        ? rawInventory.objects
        : normalizedNodes.filter((n) => n.type === "CustomObject").length,
    fields:
      typeof rawInventory.fields === "number"
        ? rawInventory.fields
        : normalizedNodes.filter((n) => n.type === "CustomField").length,
  };

  const projectMetadata = {
    id: projectId,
    name: projectName,
    description: projectDesc,
    sourcePath: sourceDirectory,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    lastAnalyzedAt: generatedAt,
    analysisStatus: "COMPLETE",
    componentCount: normalizedNodes.length,
    dependencyCount: normalizedEdges.length,
    analysisPath:
      projectId !== "default"
        ? `/projects/${projectId}/explorer-data.json`
        : "/explorer-data.json",
  };

  const explorerData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    analyzerVersion,
    generatedAt,
    sourceDirectory,
    project: projectMetadata,
    summary: {
      nodeCount: normalizedNodes.length,
      edgeCount: normalizedEdges.length,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      cycleCount: normalizedCycles.length,
      unresolvedCount: unresolvedReferences.length,
      inventory,
    },
    nodes: normalizedNodes,
    edges: normalizedEdges,
    cycles: normalizedCycles,
    unresolvedReferences,
    impactSummaries,
  };

  // Ensure output parent directory exists
  const resolvedOutputFile = path.resolve(effectiveOutputPath);
  const parentDir = path.dirname(resolvedOutputFile);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const jsonContent = JSON.stringify(explorerData, null, 2);
  fs.writeFileSync(resolvedOutputFile, jsonContent, "utf8");

  // Save project-metadata.json alongside explorer-data.json
  const metadataPath = path.join(parentDir, "project-metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(projectMetadata, null, 2), "utf8");

  updateManifestWithExplorerData(resolvedOutputFile, explorerData, projectMetadata);
  publishProjectToExplorerAssets(resolvedOutputFile, explorerData, projectMetadata);

  return {
    inputFile: resolvedInputFile,
    outputFile: resolvedOutputFile,
    projectMetadata,
    explorerData,
  };
}

function publishProjectToExplorerAssets(resolvedOutputFile, explorerData, projectMetadata) {
  const rootDir = path.resolve(__dirname, "..");
  const explorerPublicDir = path.join(rootDir, "explorer", "public");
  const explorerDistDir = path.join(rootDir, "explorer", "dist");

  if (!fs.existsSync(explorerPublicDir)) {
    return;
  }

  const projectId = projectMetadata?.id || "default";

  // 1. Publish project contract file
  if (projectId !== "default") {
    const projPublicDir = path.join(explorerPublicDir, "projects", projectId);
    fs.mkdirSync(projPublicDir, { recursive: true });
    fs.copyFileSync(resolvedOutputFile, path.join(projPublicDir, "explorer-data.json"));

    if (fs.existsSync(explorerDistDir)) {
      const projDistDir = path.join(explorerDistDir, "projects", projectId);
      fs.mkdirSync(projDistDir, { recursive: true });
      fs.copyFileSync(resolvedOutputFile, path.join(projDistDir, "explorer-data.json"));
    }
  } else {
    fs.copyFileSync(resolvedOutputFile, path.join(explorerPublicDir, "explorer-data.json"));
    if (fs.existsSync(explorerDistDir)) {
      fs.copyFileSync(resolvedOutputFile, path.join(explorerDistDir, "explorer-data.json"));
    }
  }

  // 2. Publish project-manifest.json
  let manifestDir = path.dirname(resolvedOutputFile);
  if (manifestDir.includes("projects")) {
    const idx = manifestDir.lastIndexOf("projects");
    if (idx > 0) {
      manifestDir = manifestDir.substring(0, idx);
    }
  }

  const analyzeManifest = path.join(manifestDir, "project-manifest.json");
  if (fs.existsSync(analyzeManifest)) {
    fs.copyFileSync(analyzeManifest, path.join(explorerPublicDir, "project-manifest.json"));
    if (fs.existsSync(explorerDistDir)) {
      fs.copyFileSync(analyzeManifest, path.join(explorerDistDir, "project-manifest.json"));
    }
  }
}

function updateManifestWithExplorerData(outputFile, explorerData, projectMetadata) {
  const outputDir = path.dirname(outputFile);
  let manifestDir = outputDir;

  if (manifestDir.includes("/projects/") || manifestDir.includes("\\projects\\") || manifestDir.endsWith("/projects") || manifestDir.endsWith("\\projects")) {
    const idx = manifestDir.lastIndexOf("projects");
    if (idx > 0) {
      manifestDir = manifestDir.substring(0, idx);
    }
  }

  const fileHash =
    "sha256:" +
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(outputFile))
      .digest("hex");
  const relFile = path.basename(outputFile);

  // 1. Update project-manifest.json
  const projectManifestPath = path.join(manifestDir, "project-manifest.json");
  let projectManifest = null;
  if (fs.existsSync(projectManifestPath)) {
    try {
      projectManifest = JSON.parse(fs.readFileSync(projectManifestPath, "utf8"));
    } catch (_) {}
  }

  if (!projectManifest) {
    projectManifest = {
      manifestVersion: "1.0.0",
      activeProjectId: projectMetadata?.id || "default",
      projects: [],
      artifacts: {},
    };
  }

  if (!Array.isArray(projectManifest.projects)) projectManifest.projects = [];
  if (!projectManifest.artifacts) projectManifest.artifacts = {};

  if (projectMetadata) {
    const existingIdx = projectManifest.projects.findIndex((p) => p.id === projectMetadata.id);
    if (existingIdx >= 0) {
      projectManifest.projects[existingIdx] = projectMetadata;
    } else {
      projectManifest.projects.push(projectMetadata);
    }
    projectManifest.activeProjectId = projectMetadata.id;
  }

  projectManifest.artifacts[projectMetadata?.id || "explorerData"] = {
    path: relFile,
    schemaVersion: explorerData.schemaVersion || CURRENT_SCHEMA_VERSION,
    fileHash,
    nodeCount: explorerData.summary?.nodeCount || 0,
    edgeCount: explorerData.summary?.edgeCount || 0,
  };

  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }

  fs.writeFileSync(projectManifestPath, JSON.stringify(projectManifest, null, 2), "utf8");

  // 2. Also update analysis-manifest.json if it exists in outputDir or manifestDir
  const analysisManifestCandidates = [
    path.join(outputDir, "analysis-manifest.json"),
    path.join(manifestDir, "analysis-manifest.json")
  ];
  for (const analysisManifestPath of analysisManifestCandidates) {
    if (fs.existsSync(analysisManifestPath)) {
      try {
        const analysisManifest = JSON.parse(fs.readFileSync(analysisManifestPath, "utf8"));
        if (!analysisManifest.artifacts) analysisManifest.artifacts = {};
        analysisManifest.artifacts.explorerData = {
          path: relFile,
          schemaVersion: explorerData.schemaVersion || CURRENT_SCHEMA_VERSION,
          fileHash,
          nodeCount: explorerData.summary?.nodeCount || 0,
          edgeCount: explorerData.summary?.edgeCount || 0,
        };
        fs.writeFileSync(analysisManifestPath, JSON.stringify(analysisManifest, null, 2), "utf8");
      } catch (_) {}
    }
  }
}

// CLI Execution
if (require.main === module) {
  try {
    const parsed = parseArgs(process.argv);
    console.log(`Salesforce Architecture Explorer Data Adapter`);
    console.log(`============================================`);
    console.log(`Input:   ${parsed.input}`);
    console.log(`Output:  ${parsed.output}`);
    console.log(`Project: ${parsed.project}`);

    const res = exportExplorerData(parsed.input, parsed.output, {
      project: parsed.project,
      projectName: parsed.projectName,
      projectDesc: parsed.projectDesc,
      source: parsed.source,
    });

    console.log(``);
    console.log(`Successfully generated explorer data contract!`);
    console.log(`  Project ID: ${res.projectMetadata.id}`);
    console.log(`  Project Name: ${res.projectMetadata.name}`);
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
  buildImpactSummaries,
  slugify,
};
