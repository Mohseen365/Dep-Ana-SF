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

const ROOT_DIR = path.resolve(__dirname, "..");
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
  let outputDir = "";
  let project = "default";
  let projectName = "";
  let projectDesc = "";
  let source = "";
  const positionals = [];

  let inputExplicit = false;
  let outputExplicit = false;
  let projectExplicit = false;
  let sourceExplicit = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--input=") || arg.startsWith("-input=")) {
      input = arg.split("=").slice(1).join("=");
      inputExplicit = true;
      continue;
    }
    if ((arg === "--input" || arg === "-input") && args[i + 1]) {
      input = args[i + 1];
      inputExplicit = true;
      i++;
      continue;
    }

    if (arg.startsWith("--output=") || arg.startsWith("-output=")) {
      output = arg.split("=").slice(1).join("=");
      outputExplicit = true;
      continue;
    }
    if ((arg === "--output" || arg === "-output") && args[i + 1]) {
      output = args[i + 1];
      outputExplicit = true;
      i++;
      continue;
    }

    if (arg.startsWith("--output-dir=") || arg.startsWith("-output-dir=")) {
      outputDir = arg.split("=").slice(1).join("=");
      continue;
    }
    if ((arg === "--output-dir" || arg === "-output-dir") && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
      continue;
    }

    if (arg.startsWith("--project=") || arg.startsWith("-project=") || arg.startsWith("--project-id=") || arg.startsWith("-project-id=")) {
      const val = arg.split("=").slice(1).join("=");
      if (val) {
        project = slugify(val) || "default";
        projectExplicit = true;
      }
      continue;
    }
    if ((arg === "--project" || arg === "-project" || arg === "--project-id" || arg === "-project-id") && args[i + 1]) {
      project = slugify(args[i + 1]) || "default";
      projectExplicit = true;
      i++;
      continue;
    }

    if (arg.startsWith("--source=") || arg.startsWith("-source=")) {
      source = arg.split("=").slice(1).join("=");
      sourceExplicit = true;
      continue;
    }
    if ((arg === "--source" || arg === "-source") && args[i + 1]) {
      source = args[i + 1];
      sourceExplicit = true;
      i++;
      continue;
    }

    if (!arg.startsWith("-")) {
      positionals.push(arg);
    }
  }

  // Safely classify positional arguments
  for (const pos of positionals) {
    const posSlug = slugify(pos);
    const resolvedPath = path.resolve(ROOT_DIR, pos);
    const exists = fs.existsSync(resolvedPath);
    const isDir = exists && fs.statSync(resolvedPath).isDirectory();
    const isFile = exists && fs.statSync(resolvedPath).isFile();
    const isJsonFile = pos.endsWith(".json");
    const containsPathSep = pos.includes("/") || pos.includes("\\");

    const isProjectNameMatch = projectExplicit && posSlug && posSlug === slugify(project);

    // A positional arg is ONLY a source directory if:
    // 1. It contains path separators OR is a directory (when project is already explicitly set to something else)
    // 2. AND it is not a file, does not start with "analyze", and does not match the explicit project name
    const looksLikeSourceDir =
      (containsPathSep || (isDir && projectExplicit && !isProjectNameMatch)) &&
      !isFile &&
      !pos.startsWith("analyze") &&
      !isProjectNameMatch;

    if (looksLikeSourceDir && !sourceExplicit) {
      source = pos;
      sourceExplicit = true;
    } else if (!inputExplicit && !isProjectNameMatch && (isDir || isJsonFile || pos.startsWith("analyze") || exists)) {
      if (isJsonFile) {
        if (!outputExplicit && inputExplicit) {
          output = pos;
          outputExplicit = true;
        } else if (!inputExplicit) {
          input = pos;
          inputExplicit = true;
        }
      } else {
        input = pos;
        inputExplicit = true;
      }
    } else if (!projectExplicit && !isJsonFile && !isDir && !isFile && !containsPathSep) {
      project = slugify(pos) || "default";
      projectExplicit = true;
    }
  }

  if (input && !projectExplicit) {
    const m = input.match(/projects[/\\]([^/\\]+)/);
    if (m && m[1]) {
      project = slugify(m[1]) || "default";
    }
  }

  if (!output || !output.endsWith(".json")) {
    if (outputDir) {
      output = path.join(outputDir, "explorer-data.json");
    } else if (project && project !== "default") {
      output = path.join("analyze", "projects", project, "explorer-data.json");
    } else {
      output = "analyze/explorer-data.json";
    }
  }

  return { input, output, outputDir, project, projectName, projectDesc, source };
}

function isSameSource(sourceA, sourceB) {
  if (!sourceA || !sourceB) return false;
  const normA = path.resolve(ROOT_DIR, sourceA).toLowerCase().replace(/\\/g, "/").replace(/\/+$/, "");
  const normB = path.resolve(ROOT_DIR, sourceB).toLowerCase().replace(/\\/g, "/").replace(/\/+$/, "");
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
  const explicitSource = options.source ? path.resolve(ROOT_DIR, options.source) : null;

  if (explicitSource && !fs.existsSync(explicitSource)) {
    throw new Error(`Explicitly supplied source directory does not exist: ${options.source}`);
  }

  const matchesSource = (candidateFile) => {
    if (!candidateFile || !fs.existsSync(candidateFile)) return false;
    if (!explicitSource) return true;
    const candidateSource = getReportSourceDir(candidateFile);
    return candidateSource ? isSameSource(candidateSource, explicitSource) : false;
  };

  // 1. Check explicit inputPath if provided and not generic default "analyze"
  if (inputPath && inputPath !== "analyze") {
    const resolvedInput = path.resolve(ROOT_DIR, inputPath);
    if (fs.existsSync(resolvedInput)) {
      const stat = fs.statSync(resolvedInput);
      if (stat.isFile()) {
        if (matchesSource(resolvedInput)) {
          return resolvedInput;
        } else if (explicitSource) {
          throw new Error(`Analyzer output file '${inputPath}' does not match explicit source: ${options.source}`);
        }
      }
      if (stat.isDirectory()) {
        const reportFile = path.join(resolvedInput, "dependency-report.json");
        const snapshotFile = path.join(resolvedInput, "analysis-snapshot.json");
        const foundFile = fs.existsSync(reportFile) ? reportFile : fs.existsSync(snapshotFile) ? snapshotFile : null;
        if (foundFile && matchesSource(foundFile)) {
          return foundFile;
        } else if (foundFile && explicitSource) {
          throw new Error(`Analyzer output file in directory '${inputPath}' does not match explicit source: ${options.source}`);
        }
      }
    }
  }

  // 2. Check project-specific analyze directory
  if (projectId !== "default") {
    const projReport = path.resolve(ROOT_DIR, "analyze", "projects", projectId, "dependency-report.json");
    const projSnapshot = path.resolve(ROOT_DIR, "analyze", "projects", projectId, "analysis-snapshot.json");
    const foundProj = fs.existsSync(projReport) ? projReport : fs.existsSync(projSnapshot) ? projSnapshot : null;
    if (foundProj && matchesSource(foundProj)) return foundProj;
    if (foundProj && explicitSource) {
      throw new Error(`Analyzer output file in directory 'analyze/projects/${projectId}' does not match explicit source: ${options.source}`);
    }
    if (explicitSource) {
      throw new Error(`Analyzer output file not found matching explicit source '${options.source}' in directory: analyze/projects/${projectId}`);
    }
    throw new Error(`Analyzer output file not found in project directory: analyze/projects/${projectId}`);
  }

  // 3. Check root or default analyze directory for report ONLY IF projectId === "default"
  const analyzeReport = path.resolve(ROOT_DIR, "analyze", "dependency-report.json");
  const analyzeSnapshot = path.resolve(ROOT_DIR, "analyze", "analysis-snapshot.json");
  const rootReport = path.resolve(ROOT_DIR, "dependency-report.json");
  const rootSnapshot = path.resolve(ROOT_DIR, "analysis-snapshot.json");

  // Prefer analyze/ directory over root test artifacts
  const candidateDefaults = [analyzeReport, analyzeSnapshot, rootReport, rootSnapshot];
  const foundDefault = candidateDefaults.find((f) => fs.existsSync(f) && matchesSource(f));
  if (foundDefault) return foundDefault;

  if (explicitSource) {
    throw new Error(`Analyzer output file not found matching explicit source '${options.source}' in directory: ${inputPath}`);
  }
  throw new Error(`Analyzer output file not found in directory: ${inputPath}`);
}

/**
 * Normalizes a source path into a portable, deterministic POSIX representation.
 * Handles Windows drive letters, Windows backslashes, machine-specific absolute prefixes,
 * and relative navigation while preserving meaningful project-relative path structure.
 */
function normalizeSourcePath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") return "force-app/main/default";

  let p = rawPath.trim();
  if (!p) return "force-app/main/default";

  // Strip Windows drive letter prefix (e.g., C:, D:)
  p = p.replace(/^[a-zA-Z]:/, "");

  // Convert all backslashes to forward slashes
  p = p.replace(/\\/g, "/");

  // Collapse duplicate slashes
  p = p.replace(/\/+/g, "/");

  // Strip leading slashes
  p = p.replace(/^\/+/, "");

  // Normalize absolute or deep machine-specific paths (e.g. Users/.../Downloads/Interview Project/Cloud-Spend-Tracker/force-app/main/default)
  const forceAppIdx = p.indexOf("force-app/");
  if (forceAppIdx > 0) {
    const preceding = p.substring(0, forceAppIdx).replace(/\/+$/, "");
    const parts = preceding.split("/").filter(Boolean);
    const genericDirs = new Set(["users", "user", "downloads", "desktop", "documents", "app", "tmp", "temp", "home", "src", "interview project"]);
    let projDir = "";
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (!genericDirs.has(part.toLowerCase())) {
        projDir = parts.slice(i).join("/");
        break;
      }
    }
    if (projDir) {
      p = `${projDir}/${p.substring(forceAppIdx)}`;
    } else {
      p = p.substring(forceAppIdx);
    }
  } else {
    // Strip leading relative navigation (e.g., ../..)
    p = p.replace(/^(\.\.\/)+/, "");
  }

  // Strip trailing slashes
  p = p.replace(/\/+$/, "");

  return p || "force-app/main/default";
}

function normalizeNodeId(id, fallbackType = "ApexClass", fallbackName = "") {
  if (!id) return `${fallbackType}:${fallbackName}`;
  if (id.includes(":")) return id;
  return `${fallbackType}:${id}`;
}

function normalizeTestCoverageStatus(status) {
  if (!status) return "UNTESTED";
  const s = String(status).trim().toLowerCase().replace(/_/g, "-");
  if (s === "likely-covered" || s === "covered") return "COVERED";
  if (s === "known-coverage-failure" || s === "untested") return "UNTESTED";
  if (s === "no-tests" || s === "no-test-evidence") return "NO_TESTS";
  if (s === "ambiguous-test" || s === "ambiguous" || s === "ambiguous-tests") return "AMBIGUOUS";
  return "UNTESTED";
}

function normalizeNodeType(type, id = "") {
  let candidate = type;
  if (!candidate && id && id.includes(":")) {
    candidate = id.split(":")[0];
  }
  if (!candidate) return "ApexClass";

  const t = String(candidate).trim();
  if (t === "Trigger" || t === "ApexTrigger") return "ApexTrigger";
  if (t === "Object" || t === "CustomObject") return "CustomObject";
  if (t === "Field" || t === "CustomField") return "CustomField";
  if (t === "LWC" || t === "LWC_HTML" || t === "LWC_JS") return "LWC";
  if (t === "Visualforce" || t === "ApexPage" || t === "VF") return "Visualforce";
  if (t === "Flow") return "Flow";
  if (t === "External") return "External";
  if (t === "ApexClass") return "ApexClass";

  const valid = [
    "ApexClass",
    "ApexTrigger",
    "LWC",
    "Visualforce",
    "Flow",
    "Object",
    "CustomObject",
    "Field",
    "CustomField",
    "External",
  ];
  if (valid.includes(t)) return t;
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
  const rawSourceDirectory =
    options.source || reportData.sourceDirectory || "force-app/main/default";
  const sourceDirectory = normalizeSourcePath(rawSourceDirectory);

  const projectName =
    options.projectName ||
    (projectId !== "default" ? projectId : "Default Salesforce Project");
  const projectDesc =
    options.projectDesc || "Salesforce DX Architecture Analysis";

  const isAlreadyExplorerData = Boolean(
    reportData.schemaVersion &&
      reportData.summary &&
      Array.isArray(reportData.nodes) &&
      reportData.nodes.length > 0 &&
      reportData.nodes[0].metrics &&
      reportData.nodes[0].risk !== undefined
  );

  if (isAlreadyExplorerData) {
    const explorerData = JSON.parse(JSON.stringify(reportData));
    explorerData.sourceDirectory = normalizeSourcePath(explorerData.sourceDirectory || reportData.sourceDirectory);
    const projectMetadata = {
      ...explorerData.project,
      id: projectId,
      name: options.projectName || explorerData.project?.name || (projectId !== "default" ? projectId : "Default Salesforce Project"),
      description: options.projectDesc || explorerData.project?.description || "Salesforce DX Architecture Analysis",
      sourcePath: normalizeSourcePath(options.source || explorerData.project?.sourcePath || explorerData.sourceDirectory),
      analysisPath: projectId !== "default" ? `/projects/${projectId}/explorer-data.json` : "/explorer-data.json",
    };
    explorerData.project = projectMetadata;

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

    let rawStatus = rawNode.refactoringReadiness?.testCoverageStatus;
    if (!rawStatus) {
      if (isTest || testGapResult.signal === "test-component") {
        rawStatus = "COVERED";
      } else {
        rawStatus = testGapResult.signal;
      }
    }
    const testCoverageStatus = normalizeTestCoverageStatus(rawStatus);

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

    const rawCanSource = rawEdge.canonical?.source;
    const rawCanTarget = rawEdge.canonical?.target;

    const canonical = {
      source: {
        type: normalizeNodeType(rawCanSource?.type || sourceNormType),
        name: rawCanSource?.name || (source.includes(":") ? source.split(":")[1] : source),
        method: rawCanSource?.method !== undefined ? rawCanSource.method : methodOwner,
      },
      target: {
        type: normalizeNodeType(rawCanTarget?.type || targetNormType),
        name: rawCanTarget?.name || (target.includes(":") ? target.split(":")[1] : target),
        method: rawCanTarget?.method !== undefined ? rawCanTarget.method : method,
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
    fs.mkdirSync(explorerPublicDir, { recursive: true });
  }

  const projectId = projectMetadata?.id || "default";

  // 1. Publish project contract file
  if (projectId !== "default") {
    const projPublicDir = path.join(explorerPublicDir, "projects", projectId);
    fs.mkdirSync(projPublicDir, { recursive: true });
    fs.copyFileSync(resolvedOutputFile, path.join(projPublicDir, "explorer-data.json"));

    const parentDir = path.dirname(resolvedOutputFile);
    const metaPath = path.join(parentDir, "project-metadata.json");
    if (fs.existsSync(metaPath)) {
      fs.copyFileSync(metaPath, path.join(projPublicDir, "project-metadata.json"));
    }

    // Check for alias mapping (e.g. movie -> movie-app)
    const aliases = [];
    if (projectId === "movie") aliases.push("movie-app");

    for (const alias of aliases) {
      const aliasPublicDir = path.join(explorerPublicDir, "projects", alias);
      if (fs.existsSync(aliasPublicDir)) {
        fs.copyFileSync(resolvedOutputFile, path.join(aliasPublicDir, "explorer-data.json"));
        if (fs.existsSync(metaPath)) {
          fs.copyFileSync(metaPath, path.join(aliasPublicDir, "project-metadata.json"));
        }
      }
    }

    if (fs.existsSync(explorerDistDir)) {
      const projDistDir = path.join(explorerDistDir, "projects", projectId);
      fs.mkdirSync(projDistDir, { recursive: true });
      fs.copyFileSync(resolvedOutputFile, path.join(projDistDir, "explorer-data.json"));
      if (fs.existsSync(metaPath)) {
        fs.copyFileSync(metaPath, path.join(projDistDir, "project-metadata.json"));
      }

      for (const alias of aliases) {
        const aliasDistDir = path.join(explorerDistDir, "projects", alias);
        if (fs.existsSync(aliasDistDir)) {
          fs.copyFileSync(resolvedOutputFile, path.join(aliasDistDir, "explorer-data.json"));
          if (fs.existsSync(metaPath)) {
            fs.copyFileSync(metaPath, path.join(aliasDistDir, "project-metadata.json"));
          }
        }
      }
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
    // Cleanup any accidental root Movie file if present
    const accidentalMovieFile = path.join(ROOT_DIR, "Movie");
    if (fs.existsSync(accidentalMovieFile) && fs.statSync(accidentalMovieFile).isFile()) {
      try {
        fs.unlinkSync(accidentalMovieFile);
      } catch (_) {}
    }

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
  normalizeTestCoverageStatus,
  normalizeSourcePath,
  buildImpactSummaries,
  slugify,
};
