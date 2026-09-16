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

function isSameSource(sourceA, sourceB) {
  if (!sourceA || !sourceB) return false;
  const normA = path.resolve(ROOT_DIR, sourceA).toLowerCase().replace(/\\/g, "/").replace(/\/+$/, "");
  const normB = path.resolve(ROOT_DIR, sourceB).toLowerCase().replace(/\\/g, "/").replace(/\/+$/, "");
  return normA === normB;
}

function getRecordedSourceForProject(slugId) {
  if (!slugId) return null;
  const projDir =
    slugId !== "default"
      ? path.join(ROOT_DIR, "analyze", "projects", slugId)
      : path.join(ROOT_DIR, "analyze");
  const manifestFile = path.join(projDir, "analysis-manifest.json");
  const reportFile = path.join(projDir, "dependency-report.json");

  if (fs.existsSync(manifestFile)) {
    try {
      const content = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
      const dir =
        content.source?.directory ||
        content.source?.sourceDir ||
        content.sourceDirectory;
      if (dir) return path.isAbsolute(dir) ? dir : path.resolve(ROOT_DIR, dir);
    } catch (_) {}
  }
  if (fs.existsSync(reportFile)) {
    try {
      const content = JSON.parse(fs.readFileSync(reportFile, "utf8"));
      const dir =
        content.sourceDirectory ||
        content.discovered?.sourceDir ||
        content.source?.sourceDir;
      if (dir) return path.isAbsolute(dir) ? dir : path.resolve(ROOT_DIR, dir);
    } catch (_) {}
  }
  return null;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let mode = "dev"; // 'dev' | 'preview' | 'build'
  let fresh = false;
  let project = "default";
  let projectExplicit = false;
  let source = "";
  let explicitSource = false;
  const positionals = [];

  const defaultSourcePath = path.join(ROOT_DIR, "force-app", "main", "default");

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--preview" || arg === "-preview") {
      mode = "preview";
      continue;
    }
    if (arg === "--build" || arg === "-build") {
      mode = "build";
      continue;
    }
    if (arg === "--fresh" || arg === "-fresh") {
      fresh = true;
      continue;
    }

    if (
      arg.startsWith("--project=") ||
      arg.startsWith("-project=") ||
      arg.startsWith("--project-id=") ||
      arg.startsWith("-project-id=")
    ) {
      const val = arg.split("=").slice(1).join("=");
      if (val) {
        project = slugify(val) || "default";
        projectExplicit = true;
      }
      continue;
    }
    if (
      (arg === "--project" ||
        arg === "-project" ||
        arg === "--project-id" ||
        arg === "-project-id") &&
      args[i + 1]
    ) {
      project = slugify(args[i + 1]) || "default";
      projectExplicit = true;
      i++;
      continue;
    }

    if (arg.startsWith("--source=") || arg.startsWith("-source=")) {
      const val = arg.split("=").slice(1).join("=");
      if (val) {
        source = path.resolve(ROOT_DIR, val);
        explicitSource = true;
      }
      continue;
    }
    if ((arg === "--source" || arg === "-source") && args[i + 1]) {
      source = path.resolve(ROOT_DIR, args[i + 1]);
      explicitSource = true;
      i++;
      continue;
    }

    if (!arg.startsWith("-")) {
      positionals.push(arg);
    }
  }

  // Process positional arguments if flags were stripped or passed positionally
  for (const pos of positionals) {
    const resolvedPos = path.resolve(ROOT_DIR, pos);
    const exists = fs.existsSync(resolvedPos);
    const isDir = exists && fs.statSync(resolvedPos).isDirectory();
    const isFile = exists && fs.statSync(resolvedPos).isFile();
    const hasPathSep = pos.includes("/") || pos.includes("\\");

    // A positional arg is ONLY a source directory if it's an actual directory or contains path separators (and is not a file)
    const looksLikeSourceDir = (hasPathSep || isDir) && !isFile;

    if (looksLikeSourceDir && !explicitSource) {
      source = resolvedPos;
      explicitSource = true;
    } else if (!looksLikeSourceDir && !projectExplicit && project === "default") {
      project = slugify(pos) || "default";
      projectExplicit = true;
    }
  }

  // Resolve source from recorded project manifest if no explicit source provided
  const slugId = slugify(project) || "default";
  const recordedSource = getRecordedSourceForProject(slugId);

  if (!explicitSource) {
    if (recordedSource && fs.existsSync(recordedSource)) {
      source = recordedSource;
    } else if (recordedSource) {
      source = recordedSource; // Keep recorded source path even if disk location moved
    } else if (slugId === "default" && fs.existsSync(defaultSourcePath)) {
      source = defaultSourcePath;
    }
  }

  return { mode, fresh, project: slugId, source, explicitSource };
}

function runAnalysisIfNeeded(
  sourceDir,
  fresh,
  projectId = "default",
  explicitSource = false,
) {
  const slugId = slugify(projectId) || "default";
  const analyzeDir =
    slugId !== "default"
      ? path.join(ROOT_DIR, "analyze", "projects", slugId)
      : path.join(ROOT_DIR, "analyze");
  const reportFile = path.join(analyzeDir, "dependency-report.json");
  const manifestFile = path.join(analyzeDir, "analysis-manifest.json");

  const hasReport = fs.existsSync(reportFile) || fs.existsSync(manifestFile);
  const hasSource = Boolean(sourceDir && fs.existsSync(sourceDir));

  if (explicitSource && !hasSource) {
    throw new Error(
      `Explicitly supplied source directory does not exist: ${sourceDir}`,
    );
  }

  if (explicitSource && hasReport) {
    const recordedSource = getRecordedSourceForProject(slugId);
    if (recordedSource && !isSameSource(recordedSource, sourceDir)) {
      throw new Error(
        `Analyzer output file in directory '${analyzeDir}' does not match explicit source: ${sourceDir}`,
      );
    }
  }

  if (!hasSource && !hasReport) {
    throw new Error(
      `Source directory (${sourceDir || "none"}) and existing analysis (${reportFile}) both not found.`,
    );
  }

  let shouldRun = fresh || !hasReport;

  if (!shouldRun && hasSource) {
    try {
      const analyzer = require(ANALYZER_SCRIPT);
      if (typeof analyzer.getAnalysis === "function") {
        console.log("Checking dependency analysis cache freshness...");
        const result = analyzer.getAnalysis(sourceDir, {
          quiet: true,
          project: slugId,
        });
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
      console.log(
        "Source directory not present, reusing existing analysis artifacts...",
      );
      return;
    }
    console.log(`Running Salesforce Dependency Analyzer on ${sourceDir}...`);
    const projectFlag = slugId !== "default" ? ` --project "${slugId}"` : "";
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${sourceDir}"${projectFlag}`, {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });
  }
}

function runAdapter(projectId, sourceDir, explicitSource = false) {
  const slugId = slugify(projectId) || "default";
  console.log(`Running Explorer Data Adapter for project '${slugId}'...`);

  let inputDir = "analyze";
  let targetOutput = path.join(ROOT_DIR, "analyze", "explorer-data.json");
  if (slugId !== "default") {
    inputDir = path.join(ROOT_DIR, "analyze", "projects", slugId);
    targetOutput = path.join(
      ROOT_DIR,
      "analyze",
      "projects",
      slugId,
      "explorer-data.json",
    );
  }

  const hasSourceOnDisk = Boolean(sourceDir && fs.existsSync(sourceDir));
  const sourceFlag = hasSourceOnDisk ? ` --source "${sourceDir}"` : "";
  execSync(
    `node "${ADAPTER_SCRIPT}" --input "${inputDir}" --output "${targetOutput}" --project "${slugId}"${sourceFlag}`,
    {
      cwd: ROOT_DIR,
      stdio: "inherit",
    },
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
    shell: true,
  });

  child.on("error", (err) => {
    console.error("Failed to start Explorer process:", err);
    process.exit(1);
  });
}

function main() {
  try {
    const { mode, fresh, project, source, explicitSource } = parseArgs(
      process.argv,
    );
    console.log("Salesforce Architecture & Refactoring Explorer");
    console.log("=============================================");
    console.log(`Project: ${project}`);
    console.log(`Source:  ${source || "(none)"}`);

    if (explicitSource && source && !fs.existsSync(source)) {
      throw new Error(
        `Explicitly supplied source directory does not exist: ${source}`,
      );
    }

    runAnalysisIfNeeded(source, fresh, project, explicitSource);
    runAdapter(project, source, explicitSource);
    startExplorer(mode);
  } catch (err) {
    console.error("\nExplorer One-Command Workflow failed:");
    console.error(err.message);
    process.exit(1);
  }
}

main();
