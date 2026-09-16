#!/usr/bin/env node
/**
 * Regression Test Suite for Source Resolution in Explorer Workflow
 *
 * Verifies:
 *   Test 1: Default Explorer with existing report (when force-app/main/default is absent)
 *   Test 2: Explicit valid source
 *   Test 3: Explicit nonexistent source failure
 *   Test 4: Explicit source mismatch rejection
 *   Test 5: Movie project workflow (--project movie-app)
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

function setupFixtures() {
  cleanupFixtures();
  fs.mkdirSync(TEMP_TEST_DIR, { recursive: true });
}

function cleanupFixtures() {
  if (fs.existsSync(TEMP_TEST_DIR)) {
    fs.rmSync(TEMP_TEST_DIR, { recursive: true, force: true });
  }
}

function runTests() {
  console.log("Running Source Resolution Regression Test Suite...");
  console.log("=================================================");

  setupFixtures();

  try {
    // -------------------------------------------------------------
    // Test 1: Default Explorer with existing report when force-app/main/default is absent
    // -------------------------------------------------------------
    console.log("Test 1: Default Explorer with existing report when default source is absent");
    const testAnalyzeDir = path.join(TEMP_TEST_DIR, "analyze_t1");
    fs.mkdirSync(testAnalyzeDir, { recursive: true });
    const dummyReport = {
      sourceDirectory: "../Food-App/force-app/main/default",
      generatedAt: new Date().toISOString(),
      nodes: [{ id: "ApexClass:FoodService", name: "FoodService", type: "ApexClass" }],
      edges: []
    };
    fs.writeFileSync(path.join(testAnalyzeDir, "dependency-report.json"), JSON.stringify(dummyReport, null, 2));

    const t1Out = path.join(testAnalyzeDir, "explorer-data.json");
    // Call adapter without --source
    execSync(`node "${ADAPTER_SCRIPT}" --input "${testAnalyzeDir}" --output "${t1Out}"`, { cwd: ROOT_DIR });
    assert.ok(fs.existsSync(t1Out), "Adapter should successfully export existing report when no explicit source is supplied");
    console.log("  ✓ Test 1 PASSED: Adapter resolves report even when sourceDirectory differs from default path");

    // -------------------------------------------------------------
    // Test 2: Explicit valid source
    // -------------------------------------------------------------
    console.log("Test 2: Explicit valid source");
    const validSourceDir = path.join(TEMP_TEST_DIR, "valid_src");
    fs.mkdirSync(path.join(validSourceDir, "classes"), { recursive: true });
    fs.writeFileSync(path.join(validSourceDir, "classes", "ValidService.cls"), "public class ValidService {}");

    const validAnalyzeDir = path.join(TEMP_TEST_DIR, "analyze_t2");
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${validSourceDir}" --output-dir "${validAnalyzeDir}"`, { stdio: "ignore" });

    const t2Out = path.join(validAnalyzeDir, "explorer-data.json");
    execSync(`node "${ADAPTER_SCRIPT}" --input "${validAnalyzeDir}" --output "${t2Out}" --source "${validSourceDir}"`, { cwd: ROOT_DIR });
    assert.ok(fs.existsSync(t2Out), "Adapter should succeed for valid explicit source matching report");
    console.log("  ✓ Test 2 PASSED: Explicit valid source processed successfully");

    // -------------------------------------------------------------
    // Test 3: Explicit nonexistent source
    // -------------------------------------------------------------
    console.log("Test 3: Explicit nonexistent source failure");
    const nonexistentSource = path.join(TEMP_TEST_DIR, "nonexistent_src_xyz");
    let t3Failed = false;
    try {
      execSync(`node "${ADAPTER_SCRIPT}" --input "${validAnalyzeDir}" --source "${nonexistentSource}"`, { stdio: "pipe" });
    } catch (err) {
      t3Failed = true;
      const stderr = err.stderr ? err.stderr.toString() : "";
      assert.ok(stderr.includes("does not exist"), "Error message must state that explicit source does not exist");
    }
    assert.ok(t3Failed, "Adapter must fail when explicitly supplied source does not exist");
    console.log("  ✓ Test 3 PASSED: Explicit nonexistent source rejected with clear error");

    // -------------------------------------------------------------
    // Test 4: Explicit source mismatch
    // -------------------------------------------------------------
    console.log("Test 4: Explicit source mismatch rejection");
    const otherSourceDir = path.join(TEMP_TEST_DIR, "other_src");
    fs.mkdirSync(path.join(otherSourceDir, "classes"), { recursive: true });
    fs.writeFileSync(path.join(otherSourceDir, "classes", "OtherService.cls"), "public class OtherService {}");

    const t4ReportFile = path.join(validAnalyzeDir, "dependency-report.json");

    let t4Failed = false;
    try {
      const output = execSync(`node "${ADAPTER_SCRIPT}" --input "${t4ReportFile}" --source "${otherSourceDir}"`, { cwd: ROOT_DIR, encoding: "utf8", stdio: "pipe" });
      console.log("Test 4 unexpected output:", output);
    } catch (err) {
      t4Failed = true;
      const stderr = (err.stderr || "").toString();
      const stdout = (err.stdout || "").toString();
      const combined = stderr + stdout;
      assert.ok(combined.includes("Analyzer output file not found"), `Expected 'Analyzer output file not found' in output, got: ${combined}`);
    }
    assert.ok(t4Failed, "Adapter must reject report when explicit source does not match existing report source");
    console.log("  ✓ Test 4 PASSED: Explicit source mismatch rejected");

    // -------------------------------------------------------------
    // Test 5: Movie project workflow
    // -------------------------------------------------------------
    console.log("Test 5: Movie project workflow");
    const movieAppDir = path.join(ROOT_DIR, "analyze", "projects", "movie-app");
    const reportFile = path.join(movieAppDir, "dependency-report.json");
    if (!fs.existsSync(reportFile)) {
      const dummyReport = {
        analyzerVersion: "13.0.0",
        generatedAt: new Date().toISOString(),
        sourceDirectory: "analyze/projects/movie-app",
        nodes: [{ id: "ApexClass:MovieController", name: "MovieController", type: "ApexClass" }],
        edges: []
      };
      fs.writeFileSync(reportFile, JSON.stringify(dummyReport, null, 2));
    }

    const movieOut = path.join(movieAppDir, "explorer-data.json");
    execSync(`node "${ADAPTER_SCRIPT}" --input "${movieAppDir}" --output "${movieOut}" --project "movie-app"`, { cwd: ROOT_DIR });
    assert.ok(fs.existsSync(movieOut), "movie-app explorer-data.json should be generated successfully");
    console.log("  ✓ Test 5 PASSED: Movie project contract exported successfully");

    console.log("\nALL SOURCE RESOLUTION REGRESSION TESTS PASSED!");
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
