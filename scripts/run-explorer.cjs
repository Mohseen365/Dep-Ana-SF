#!/usr/bin/env node
/**
 * One-Command Explorer Workflow Runner (Multi-Project Aware)
 *
 * Workflow:
 *   1. Check if dependency analysis exists and is fresh using dependency-analyzer.cjs getAnalysis.
 *   2. Run analysis if missing or explicitly forced (--fresh).
 *   3. Run export-explorer.cjs adapter to transform analysis artifacts into project-scoped explorer-data.json.
 *   4. Copy project contract and project-manifest.json to explorer/public and explorer/dist.
 *   5. Launch Vite Explorer dev server or preview server.
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const ANALYZER_SCRIPT = path.join(ROOT_DIR, "dependency-analyzer.cjs");
const ADAPTER_SCRIPT = path.join(ROOT_DIR, "scripts", "export-explorer.cjs");
const EXPLORER_DIR = path.join(ROOT_DIR, "explorer");

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
  let mode = "dev"; // 'dev' | 'preview' | 'build'
  let fresh = false;
  let project = "default";
  let source = "";
  let explicitSource = false;

  const defaultSourcePath = path.join(ROOT_DIR, "force-app", "main", "default");

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--preview") mode = "preview";
    if (arg === "--build") mode = "build";
    if (arg === "--fresh") fresh = true;
    if ((arg === "--project" || arg === "--project-id") && args[i + 1]) {
      project = slugify(args[i + 1]) || "default";
      i++;
    }
    if (arg === "--source" && args[i + 1]) {
      source = path.resolve(ROOT_DIR, args[i + 1]);
      explicitSource = true;
      i++;
    }
  }

  if (!explicitSource && fs.existsSync(defaultSourcePath)) {
    source = defaultSourcePath;
  }

  return { mode, fresh, project, source, explicitSource };
}

function runAnalysisIfNeeded(sourceDir, fresh, projectId = "default", explicitSource = false) {
  const slugId = slugify(projectId) || "default";
  const analyzeDir = slugId !== "default"
    ? path.join(ROOT_DIR, "analyze", "projects", slugId)
    : path.join(ROOT_DIR, "analyze");
  const reportFile = path.join(analyzeDir, "dependency-report.json");

  const hasSource = Boolean(sourceDir && fs.existsSync(sourceDir));
  const hasReport = fs.existsSync(reportFile);

  if (explicitSource && !hasSource) {
    throw new Error(`Explicitly supplied source directory does not exist: ${sourceDir}`);
  }

  if (!hasSource && !hasReport) {
    throw new Error(`Source directory (${sourceDir || path.join(ROOT_DIR, "force-app", "main", "default")}) and existing analysis (${reportFile}) both not found.`);
  }

  let shouldRun = fresh || !hasReport;

  if (!shouldRun && hasSource) {
    try {
      const analyzer = require(ANALYZER_SCRIPT);
      if (typeof analyzer.getAnalysis === "function") {
        console.log("Checking dependency analysis cache freshness...");
        const result = analyzer.getAnalysis(sourceDir, { quiet: true, project: slugId });
        if (!result || !result.fromSnapshot) {
          shouldRun = true;
        } else {
          console.log("Existing analysis cache is valid and up-to-date.");
        }
      }
    } catch (e) {
      console.warn("Cache check fallback:", e.message);
      shouldRun = true;
    }
  }

  if (shouldRun) {
    if (!hasSource) {
      console.log("Source directory not present, reusing existing analysis artifacts...");
      return;
    }
    console.log(`Running Salesforce Dependency Analyzer on ${sourceDir}...`);
    const projectFlag = slugId !== "default" ? ` --project "${slugId}"` : "";
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${sourceDir}"${projectFlag}`, {
      cwd: ROOT_DIR,
      stdio: "inherit"
    });
  }
}

function runAdapter(projectId, sourceDir) {
  const slugId = slugify(projectId) || "default";
  console.log(`Running Explorer Data Adapter for project '${slugId}'...`);

  let inputDir = "analyze";
  let targetOutput = path.join(ROOT_DIR, "analyze", "explorer-data.json");
  if (slugId !== "default") {
    inputDir = path.join(ROOT_DIR, "analyze", "projects", slugId);
    targetOutput = path.join(ROOT_DIR, "analyze", "projects", slugId, "explorer-data.json");
  }

  const sourceFlag = sourceDir ? ` --source "${sourceDir}"` : "";
  execSync(
    `node "${ADAPTER_SCRIPT}" --input "${inputDir}" --output "${targetOutput}" --project "${slugId}"${sourceFlag}`,
    {
      cwd: ROOT_DIR,
      stdio: "inherit"
    }
  );

  if (!fs.existsSync(targetOutput)) {
    throw new Error(`Failed to produce project data contract: ${targetOutput}`);
  }
}

function startExplorer(mode) {
  console.log(`Starting Salesforce Architecture Explorer (${mode} mode)...`);

  if (mode === "build") {
    execSync("npm run build", { cwd: EXPLORER_DIR, stdio: "inherit" });
    console.log("Explorer build completed successfully.");
    return;
  }

  const script = mode === "preview" ? "preview" : "dev";
  const child = spawn("npm", ["run", script], {
    cwd: EXPLORER_DIR,
    stdio: "inherit",
    shell: true
  });

  child.on("error", (err) => {
    console.error("Failed to start Explorer process:", err);
    process.exit(1);
  });
}

function main() {
  try {
    const { mode, fresh, project, source, explicitSource } = parseArgs(process.argv);
    console.log("Salesforce Architecture & Refactoring Explorer");
    console.log("=============================================");
    console.log(`Project: ${project}`);
    console.log(`Source:  ${source || "(none)"}`);

    if (explicitSource && source && !fs.existsSync(source)) {
      throw new Error(`Explicitly supplied source directory does not exist: ${source}`);
    }

    runAnalysisIfNeeded(source, fresh, project, explicitSource);
    runAdapter(project, source);
    startExplorer(mode);
  } catch (err) {
    console.error("\nExplorer One-Command Workflow failed:");
    console.error(err.message);
    process.exit(1);
  }
}

main();
