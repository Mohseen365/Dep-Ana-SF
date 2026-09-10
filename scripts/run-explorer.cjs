#!/usr/bin/env node
/**
 * One-Command Explorer Workflow Runner
 *
 * Workflow:
 *   1. Check if dependency analysis exists and is fresh using dependency-analyzer.cjs getAnalysis.
 *   2. Run analysis if missing or explicitly forced (--fresh).
 *   3. Run export-explorer.cjs adapter to transform analysis artifacts into explorer-data.json.
 *   4. Copy explorer-data.json to explorer/public/explorer-data.json and explorer/dist/explorer-data.json.
 *   5. Launch Vite Explorer dev server or preview server.
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const ANALYZER_SCRIPT = path.join(ROOT_DIR, "dependency-analyzer.cjs");
const ADAPTER_SCRIPT = path.join(ROOT_DIR, "scripts", "export-explorer.cjs");
const EXPLORER_DIR = path.join(ROOT_DIR, "explorer");
const SOURCE_DIR = path.join(ROOT_DIR, "force-app", "main", "default");
const OUTPUT_CONTRACT = path.join(ROOT_DIR, "explorer-data.json");
const PUBLIC_CONTRACT = path.join(EXPLORER_DIR, "public", "explorer-data.json");
const DIST_CONTRACT = path.join(EXPLORER_DIR, "dist", "explorer-data.json");

function parseArgs(argv) {
  const args = argv.slice(2);
  let mode = "dev"; // 'dev' | 'preview' | 'build'
  let fresh = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--preview") mode = "preview";
    if (arg === "--build") mode = "build";
    if (arg === "--fresh") fresh = true;
  }

  return { mode, fresh };
}

function runAnalysisIfNeeded(fresh) {
  const analyzeDir = path.join(ROOT_DIR, "analyze");
  const reportFile = path.join(analyzeDir, "dependency-report.json");

  // Check if source dir exists for running fresh analysis
  if (!fs.existsSync(SOURCE_DIR) && !fs.existsSync(reportFile)) {
    throw new Error(`Source directory (${SOURCE_DIR}) and existing analysis (${reportFile}) both not found.`);
  }

  let shouldRun = fresh || !fs.existsSync(reportFile);

  if (!shouldRun && fs.existsSync(SOURCE_DIR)) {
    try {
      const analyzer = require(ANALYZER_SCRIPT);
      if (typeof analyzer.getAnalysis === "function") {
        console.log("Checking dependency analysis cache freshness...");
        const result = analyzer.getAnalysis(SOURCE_DIR, { quiet: true });
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
    if (!fs.existsSync(SOURCE_DIR)) {
      console.log("Source directory not present, reusing existing analysis artifacts...");
      return;
    }
    console.log("Running Salesforce Dependency Analyzer...");
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${SOURCE_DIR}"`, {
      cwd: ROOT_DIR,
      stdio: "inherit"
    });
  }
}

function runAdapter() {
  console.log("Running Explorer Data Adapter...");
  execSync(`node "${ADAPTER_SCRIPT}" --input analyze --output "${OUTPUT_CONTRACT}"`, {
    cwd: ROOT_DIR,
    stdio: "inherit"
  });

  if (!fs.existsSync(OUTPUT_CONTRACT)) {
    throw new Error(`Failed to produce data contract: ${OUTPUT_CONTRACT}`);
  }

  // Copy data to public and dist
  fs.mkdirSync(path.dirname(PUBLIC_CONTRACT), { recursive: true });
  fs.copyFileSync(OUTPUT_CONTRACT, PUBLIC_CONTRACT);

  if (fs.existsSync(path.dirname(DIST_CONTRACT))) {
    fs.copyFileSync(OUTPUT_CONTRACT, DIST_CONTRACT);
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
    const { mode, fresh } = parseArgs(process.argv);
    console.log("Salesforce Architecture & Refactoring Explorer");
    console.log("=============================================");

    runAnalysisIfNeeded(fresh);
    runAdapter();
    startExplorer(mode);
  } catch (err) {
    console.error("\nExplorer One-Command Workflow failed:");
    console.error(err.message);
    process.exit(1);
  }
}

main();
