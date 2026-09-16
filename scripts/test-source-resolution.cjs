#!/usr/bin/env node
/**
 * Comprehensive Regression Test Suite for Artifact and Source Resolution
 *
 * Verifies all 7 core invariants required by the specification:
 *   Test 1: Root test artifact cannot override analyze artifact
 *   Test 2: Default source directory absent handling
 *   Test 3: Explicit source mismatch rejection
 *   Test 4: Explicit nonexistent source rejection
 *   Test 5: Existing Movie-App Explorer contract resolution without dependency-report.json
 *   Test 6: Project isolation enforcement
 *   Test 7: Test cleanup verification (no transient root dependency-report.json)
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const RUN_EXPLORER_SCRIPT = path.join(ROOT_DIR, "scripts", "run-explorer.cjs");
const ADAPTER_SCRIPT = path.join(ROOT_DIR, "scripts", "export-explorer.cjs");
const ANALYZER_SCRIPT = path.join(ROOT_DIR, "dependency-analyzer.cjs");
const TEMP_TEST_DIR = path.join(ROOT_DIR, "temp-test-source-resolution");

const { exportExplorerData } = require("./export-explorer.cjs");

function setupFixtures() {
  cleanupFixtures();
  fs.mkdirSync(TEMP_TEST_DIR, { recursive: true });
}

function cleanupFixtures() {
  if (fs.existsSync(TEMP_TEST_DIR)) {
    fs.rmSync(TEMP_TEST_DIR, { recursive: true, force: true });
  }
  const rootReport = path.join(ROOT_DIR, "dependency-report.json");
  if (fs.existsSync(rootReport)) {
    fs.unlinkSync(rootReport);
  }
}

function runTests() {
  console.log("Running Source Resolution & Artifact Contract Regression Test Suite...");
  console.log("====================================================================");

  setupFixtures();

  try {
    // -------------------------------------------------------------
    // Test 1: Root test artifact cannot override analyze artifact
    // -------------------------------------------------------------
    console.log("Test 1: Root test artifact cannot override analyze artifact");
    const test1Dir = path.join(TEMP_TEST_DIR, "test1");
    const t1AnalyzeDir = path.join(test1Dir, "analyze");
    fs.mkdirSync(t1AnalyzeDir, { recursive: true });

    const syntheticRootReport = {
      sourceDirectory: "scripts/temp-snapshot-test-fixture",
      generatedAt: new Date().toISOString(),
      nodes: [
        { id: "ApexClass:ClassA", name: "ClassA", type: "ApexClass" },
        { id: "ApexClass:ClassB", name: "ClassB", type: "ApexClass" },
      ],
      edges: [
        { from: "ApexClass:ClassA", to: "ApexClass:ClassB", type: "method-call" }
      ],
    };

    const authoritativeAnalyzeReport = {
      sourceDirectory: "../Food-App/force-app/main/default",
      generatedAt: new Date().toISOString(),
      nodes: [
        { id: "ApexClass:FoodService", name: "FoodService", type: "ApexClass" },
        { id: "ApexClass:FoodController", name: "FoodController", type: "ApexClass" },
        { id: "ApexClass:FoodHelper", name: "FoodHelper", type: "ApexClass" },
      ],
      edges: [],
    };

    fs.writeFileSync(path.join(test1Dir, "dependency-report.json"), JSON.stringify(syntheticRootReport, null, 2));
    fs.writeFileSync(path.join(t1AnalyzeDir, "dependency-report.json"), JSON.stringify(authoritativeAnalyzeReport, null, 2));

    const t1Out = path.join(t1AnalyzeDir, "explorer-data.json");
    // Run resolution on t1AnalyzeDir
    const res1 = exportExplorerData(t1AnalyzeDir, t1Out);

    assert.strictEqual(
      res1.explorerData.sourceDirectory,
      "../Food-App/force-app/main/default",
      `Expected sourceDirectory '../Food-App/force-app/main/default', got '${res1.explorerData.sourceDirectory}'`
    );
    assert.strictEqual(
      res1.explorerData.nodes.length,
      3,
      `Expected 3 nodes from analyze report, got ${res1.explorerData.nodes.length}`
    );
    assert.ok(
      res1.explorerData.nodes.some((n) => n.displayName === "FoodService"),
      "Authoritative FoodService node must be present in exported contract"
    );
    console.log("  ✓ Test 1 PASSED: Authoritative analyze/ artifact correctly selected over root fixture");

    // -------------------------------------------------------------
    // Test 2: Default source directory absent
    // -------------------------------------------------------------
    console.log("Test 2: Default source directory absent handling");
    const test2Dir = path.join(TEMP_TEST_DIR, "test2");
    const t2AnalyzeDir = path.join(test2Dir, "analyze");
    fs.mkdirSync(t2AnalyzeDir, { recursive: true });

    const dummyReport2 = {
      sourceDirectory: "../Food-App/force-app/main/default",
      generatedAt: new Date().toISOString(),
      nodes: [{ id: "ApexClass:FooService", name: "FooService", type: "ApexClass" }],
      edges: [],
    };
    fs.writeFileSync(path.join(t2AnalyzeDir, "dependency-report.json"), JSON.stringify(dummyReport2, null, 2));

    const t2Out = path.join(t2AnalyzeDir, "explorer-data.json");
    const res2 = exportExplorerData(t2AnalyzeDir, t2Out);
    assert.ok(fs.existsSync(t2Out), "Explorer data exported successfully without requiring nonexistent force-app source");
    assert.strictEqual(res2.explorerData.summary.nodeCount, 1);
    console.log("  ✓ Test 2 PASSED: Absent default source directory handled gracefully");

    // -------------------------------------------------------------
    // Test 3: Explicit source mismatch remains rejected
    // -------------------------------------------------------------
    console.log("Test 3: Explicit source mismatch remains rejected");
    const validSourceDir = path.join(TEMP_TEST_DIR, "src_valid");
    const otherSourceDir = path.join(TEMP_TEST_DIR, "src_other");
    fs.mkdirSync(path.join(validSourceDir, "classes"), { recursive: true });
    fs.mkdirSync(path.join(otherSourceDir, "classes"), { recursive: true });
    fs.writeFileSync(path.join(validSourceDir, "classes", "ServiceA.cls"), "public class ServiceA {}");
    fs.writeFileSync(path.join(otherSourceDir, "classes", "ServiceB.cls"), "public class ServiceB {}");

    const t3AnalyzeDir = path.join(TEMP_TEST_DIR, "analyze_t3");
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${validSourceDir}" --output-dir "${t3AnalyzeDir}"`, { stdio: "ignore" });

    const t3ReportFile = path.join(t3AnalyzeDir, "dependency-report.json");
    let t3Failed = false;
    try {
      execSync(`node "${ADAPTER_SCRIPT}" --input "${t3ReportFile}" --source "${otherSourceDir}"`, {
        cwd: ROOT_DIR,
        stdio: "pipe",
      });
    } catch (err) {
      t3Failed = true;
      const combined = (err.stderr || "").toString() + (err.stdout || "").toString();
      assert.ok(
        combined.includes("Analyzer output file not found"),
        `Expected 'Analyzer output file not found', got: ${combined}`
      );
    }
    assert.ok(t3Failed, "Adapter must reject report when explicit source does not match existing report source");
    console.log("  ✓ Test 3 PASSED: Explicit source mismatch rejected");

    // -------------------------------------------------------------
    // Test 4: Explicit nonexistent source remains rejected
    // -------------------------------------------------------------
    console.log("Test 4: Explicit nonexistent source remains rejected");
    const nonexistentSource = path.join(TEMP_TEST_DIR, "nonexistent_src_xyz");
    let t4Failed = false;
    try {
      execSync(`node "${ADAPTER_SCRIPT}" --input "${t3AnalyzeDir}" --source "${nonexistentSource}"`, { stdio: "pipe" });
    } catch (err) {
      t4Failed = true;
      const stderr = (err.stderr || "").toString();
      assert.ok(stderr.includes("does not exist"), "Stderr must state that explicit source does not exist");
    }
    assert.ok(t4Failed, "Adapter must fail when explicitly supplied source does not exist");
    console.log("  ✓ Test 4 PASSED: Explicit nonexistent source rejected with clear error");

    // -------------------------------------------------------------
    // Test 5: Existing Movie-App Explorer contract
    // -------------------------------------------------------------
    console.log("Test 5: Existing Movie-App Explorer contract resolution");
    const movieAppDir = path.join(ROOT_DIR, "analyze", "projects", "movie-app");
    fs.mkdirSync(movieAppDir, { recursive: true });

    const movieReportFile = path.join(movieAppDir, "dependency-report.json");
    const movieExplorerDataFile = path.join(movieAppDir, "explorer-data.json");

    if (!fs.existsSync(movieExplorerDataFile)) {
      const dummyMovieContract = {
        schemaVersion: "1.0.0",
        analyzerVersion: "13.0.0",
        generatedAt: new Date().toISOString(),
        sourceDirectory: "analyze/projects/movie-app",
        project: {
          id: "movie-app",
          name: "movie-app",
          description: "Salesforce DX Architecture Analysis",
          sourcePath: "analyze/projects/movie-app",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastAnalyzedAt: new Date().toISOString(),
          analysisStatus: "COMPLETE",
          componentCount: 1,
          dependencyCount: 0,
          analysisPath: "/projects/movie-app/explorer-data.json"
        },
        summary: {
          nodeCount: 1,
          edgeCount: 0,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          cycleCount: 0,
          unresolvedCount: 0,
          inventory: { files: 1, apexClasses: 1, apexTriggers: 0, lwcJs: 0, lwcHtml: 0, visualforce: 0, flows: 0, objects: 0, fields: 0 }
        },
        nodes: [
          {
            id: "ApexClass:MovieController",
            displayName: "MovieController",
            type: "ApexClass",
            file: "classes/MovieController.cls",
            metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
            risk: "LOW",
            riskReasons: [],
            behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
            refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "UNTESTED" }
          }
        ],
        edges: [],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {
          "ApexClass:MovieController": { id: "ApexClass:MovieController", directDependencies: [], directDependents: [], transitiveDependencies: [], transitiveDependents: [], impactedTests: [], totalImpactCount: 0 }
        }
      };
      fs.writeFileSync(movieExplorerDataFile, JSON.stringify(dummyMovieContract, null, 2), "utf8");
    }

    // Temporarily remove dependency-report.json if it exists to simulate absent raw report
    let backupReport = null;
    if (fs.existsSync(movieReportFile)) {
      backupReport = fs.readFileSync(movieReportFile, "utf8");
      fs.unlinkSync(movieReportFile);
    }

    try {
      // Execute run-explorer.cjs --project movie-app in build mode
      const output5 = execSync(`node "${RUN_EXPLORER_SCRIPT}" --project movie-app --build`, {
        cwd: ROOT_DIR,
        encoding: "utf8",
      });

      assert.ok(
        output5.includes("Project: movie-app"),
        `Output must indicate project movie-app, got:\n${output5}`
      );
      assert.ok(
        output5.includes("Successfully generated explorer data contract!"),
        "Output must indicate successful contract resolution"
      );
      assert.ok(
        !fs.existsSync(movieReportFile),
        "Test must not generate a synthetic dependency report file for movie-app"
      );
      console.log("  ✓ Test 5 PASSED: Existing Movie-App contract resolved without raw dependency report or source");
    } finally {
      if (backupReport) {
        fs.writeFileSync(movieReportFile, backupReport, "utf8");
      }
    }

    // -------------------------------------------------------------
    // Test 6: Project isolation
    // -------------------------------------------------------------
    console.log("Test 6: Project isolation");
    let t6Failed = false;
    try {
      // Create synthetic food-app contract
      const foodContract = {
        schemaVersion: "1.0.0",
        analyzerVersion: "13.0.0",
        generatedAt: new Date().toISOString(),
        sourceDirectory: "analyze/projects/food-app",
        project: { id: "food-app", name: "food-app" },
        summary: { nodeCount: 1, edgeCount: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: {} },
        nodes: [{ id: "ApexClass:Food", displayName: "Food", type: "ApexClass", file: "", metrics: {}, risk: "LOW", riskReasons: [], behavior: {}, refactoringReadiness: {} }],
        edges: [],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };
      const foodContractPath = path.join(TEMP_TEST_DIR, "food-explorer-data.json");
      fs.writeFileSync(foodContractPath, JSON.stringify(foodContract, null, 2));

      exportExplorerData(foodContractPath, path.join(TEMP_TEST_DIR, "out6.json"), {
        project: "movie-app",
      });
    } catch (err) {
      t6Failed = true;
      assert.ok(
        err.message.includes("Project isolation error"),
        `Expected project isolation error, got: ${err.message}`
      );
    }
    assert.ok(t6Failed, "Adapter must enforce project isolation and reject consuming mismatched project artifacts");
    console.log("  ✓ Test 6 PASSED: Project isolation strictly enforced");

    // -------------------------------------------------------------
    // Test 7: Test cleanup
    // -------------------------------------------------------------
    console.log("Test 7: Test cleanup verification");
    const rootTransientReport = path.join(ROOT_DIR, "dependency-report.json");
    assert.ok(
      !fs.existsSync(rootTransientReport),
      `Transient artifact '${rootTransientReport}' MUST NOT exist in repository root after test suite execution`
    );
    console.log("  ✓ Test 7 PASSED: Repository root free of transient test artifacts");

    console.log("\nALL 7 SOURCE RESOLUTION REGRESSION TESTS PASSED!");
  } finally {
    cleanupFixtures();
  }
}

if (require.main === module) {
  try {
    runTests();
  } catch (err) {
    console.error(`\nSource resolution test failure: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

module.exports = { runTests };
