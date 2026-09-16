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
    console.log(
      "Test 1: Default Explorer with existing report when default source is absent",
    );
    const testAnalyzeDir = path.join(TEMP_TEST_DIR, "analyze_t1");
    fs.mkdirSync(testAnalyzeDir, { recursive: true });
    const dummyReport = {
      sourceDirectory: "../Food-App/force-app/main/default",
      generatedAt: new Date().toISOString(),
      nodes: [
        { id: "ApexClass:FoodService", name: "FoodService", type: "ApexClass" },
      ],
      edges: [],
    };
    fs.writeFileSync(
      path.join(testAnalyzeDir, "dependency-report.json"),
      JSON.stringify(dummyReport, null, 2),
    );

    const t1Out = path.join(testAnalyzeDir, "explorer-data.json");
    // Call adapter without --source
    execSync(
      `node "${ADAPTER_SCRIPT}" --input "${testAnalyzeDir}" --output "${t1Out}"`,
      { cwd: ROOT_DIR },
    );
    assert.ok(
      fs.existsSync(t1Out),
      "Adapter should successfully export existing report when no explicit source is supplied",
    );
    console.log(
      "  ✓ Test 1 PASSED: Adapter resolves report even when sourceDirectory differs from default path",
    );

    // -------------------------------------------------------------
    // Test 2: Explicit valid source
    // -------------------------------------------------------------
    console.log("Test 2: Explicit valid source");
    const validSourceDir = path.join(TEMP_TEST_DIR, "valid_src");
    fs.mkdirSync(path.join(validSourceDir, "classes"), { recursive: true });
    fs.writeFileSync(
      path.join(validSourceDir, "classes", "ValidService.cls"),
      "public class ValidService {}",
    );

    const validAnalyzeDir = path.join(TEMP_TEST_DIR, "analyze_t2");
    execSync(
      `node "${ANALYZER_SCRIPT}" analyze "${validSourceDir}" --output-dir "${validAnalyzeDir}"`,
      { stdio: "ignore" },
    );

    const t2Out = path.join(validAnalyzeDir, "explorer-data.json");
    execSync(
      `node "${ADAPTER_SCRIPT}" --input "${validAnalyzeDir}" --output "${t2Out}" --source "${validSourceDir}"`,
      { cwd: ROOT_DIR },
    );
    assert.ok(
      fs.existsSync(t2Out),
      "Adapter should succeed for valid explicit source matching report",
    );
    console.log(
      "  ✓ Test 2 PASSED: Explicit valid source processed successfully",
    );

    // -------------------------------------------------------------
    // Test 3: Explicit nonexistent source
    // -------------------------------------------------------------
    console.log("Test 3: Explicit nonexistent source failure");
    const nonexistentSource = path.join(TEMP_TEST_DIR, "nonexistent_src_xyz");
    let t3Failed = false;
    try {
      execSync(
        `node "${ADAPTER_SCRIPT}" --input "${validAnalyzeDir}" --source "${nonexistentSource}"`,
        { stdio: "pipe" },
      );
    } catch (err) {
      t3Failed = true;
      const stderr = err.stderr ? err.stderr.toString() : "";
      assert.ok(
        stderr.includes("does not exist"),
        "Error message must state that explicit source does not exist",
      );
    }
    assert.ok(
      t3Failed,
      "Adapter must fail when explicitly supplied source does not exist",
    );
    console.log(
      "  ✓ Test 3 PASSED: Explicit nonexistent source rejected with clear error",
    );

    // -------------------------------------------------------------
    // Test 4: Explicit source mismatch
    // -------------------------------------------------------------
    console.log("Test 4: Explicit source mismatch rejection");
    const otherSourceDir = path.join(TEMP_TEST_DIR, "other_src");
    fs.mkdirSync(path.join(otherSourceDir, "classes"), { recursive: true });
    fs.writeFileSync(
      path.join(otherSourceDir, "classes", "OtherService.cls"),
      "public class OtherService {}",
    );

    const t4ReportFile = path.join(validAnalyzeDir, "dependency-report.json");

    let t4Failed = false;
    try {
      const output = execSync(
        `node "${ADAPTER_SCRIPT}" --input "${t4ReportFile}" --source "${otherSourceDir}"`,
        { cwd: ROOT_DIR, encoding: "utf8", stdio: "pipe" },
      );
      console.log("Test 4 unexpected output:", output);
    } catch (err) {
      t4Failed = true;
      const stderr = (err.stderr || "").toString();
      const stdout = (err.stdout || "").toString();
      const combined = stderr + stdout;
      assert.ok(
        combined.includes("does not match explicit source") || combined.includes("Analyzer output file not found"),
        `Expected explicit source mismatch error in output, got: ${combined}`,
      );
    }
    assert.ok(
      t4Failed,
      "Adapter must reject report when explicit source does not match existing report source",
    );
    console.log("  ✓ Test 4 PASSED: Explicit source mismatch rejected");

    // -------------------------------------------------------------
    // Test 4B: Positional and key=value argument parsing
    // -------------------------------------------------------------
    console.log("Test 4B: Positional and key=value argument parsing");
    const test4bSrc = path.join(TEMP_TEST_DIR, "src_4b");
    fs.mkdirSync(path.join(test4bSrc, "classes"), { recursive: true });
    fs.writeFileSync(
      path.join(test4bSrc, "classes", "Service4B.cls"),
      "public class Service4B {}",
    );

    // Test run-explorer.cjs with positional args (like `npm run explorer Food-App C:\path\to\src`)
    const { execSync: execSub } = require("child_process");
    const r4b = execSub(
      `node "${RUN_EXPLORER_SCRIPT}" Food-App "${test4bSrc}" --build`,
      { cwd: ROOT_DIR, encoding: "utf8" },
    );
    assert.ok(
      r4b.includes("Project: food-app"),
      `Project should be parsed as food-app, got output:\n${r4b}`,
    );
    assert.ok(
      r4b.includes(test4bSrc),
      `Source should be parsed as ${test4bSrc}`,
    );
    console.log(
      "  ✓ Test 4B PASSED: Positional arguments correctly inferred for project and source",
    );

    // -------------------------------------------------------------
    // Test A: Direct run-explorer project flag
    // -------------------------------------------------------------
    console.log("Test A: Direct run-explorer project flag parsing");
    const movieSrcA = path.join(TEMP_TEST_DIR, "movie_src_a");
    fs.mkdirSync(path.join(movieSrcA, "classes"), { recursive: true });
    fs.writeFileSync(
      path.join(movieSrcA, "classes", "MovieControllerA.cls"),
      "public class MovieControllerA {}",
    );
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${movieSrcA}" --project Movie`, {
      cwd: ROOT_DIR,
      stdio: "ignore",
    });

    const runA = execSync(
      `node "${RUN_EXPLORER_SCRIPT}" --project Movie --build`,
      { cwd: ROOT_DIR, encoding: "utf8" },
    );
    assert.ok(runA.includes("Project: movie"), `Expected Project: movie in output, got:\n${runA}`);
    assert.ok(!runA.includes("Source:  Movie"), `Movie must not be parsed as source path in:\n${runA}`);
    console.log("  ✓ Test A PASSED: --project Movie parsed as project='movie', not source");

    // -------------------------------------------------------------
    // Test B: Direct export-explorer project/source
    // -------------------------------------------------------------
    console.log("Test B: Direct export-explorer project/source resolution");
    const movieProjDir = path.join(ROOT_DIR, "analyze", "projects", "movie");
    const movieExpOut = path.join(movieProjDir, "explorer-data.json");

    execSync(
      `node "${ADAPTER_SCRIPT}" --project movie --source "${movieSrcA}"`,
      { cwd: ROOT_DIR, stdio: "ignore" },
    );
    assert.ok(fs.existsSync(movieExpOut), "explorer-data.json must be created in analyze/projects/movie");
    console.log("  ✓ Test B PASSED: Project-scoped dependency-report.json selected and contract generated");

    // -------------------------------------------------------------
    // Test C: Project ID Case Normalization
    // -------------------------------------------------------------
    console.log("Test C: Project ID case normalization");
    execSync(
      `node "${ADAPTER_SCRIPT}" --project Movie --source "${movieSrcA}"`,
      { cwd: ROOT_DIR, stdio: "ignore" },
    );
    assert.ok(fs.existsSync(movieExpOut), "Movie ID must normalize to 'movie' directory");
    console.log("  ✓ Test C PASSED: Project 'Movie' and 'movie' resolve consistently");

    // -------------------------------------------------------------
    // Test D: Explicit Source Mismatch
    // -------------------------------------------------------------
    console.log("Test D: Explicit source mismatch rejection");
    const wrongSrc = path.join(TEMP_TEST_DIR, "wrong_src");
    fs.mkdirSync(path.join(wrongSrc, "classes"), { recursive: true });
    fs.writeFileSync(path.join(wrongSrc, "classes", "Wrong.cls"), "public class Wrong {}");

    let tDFailed = false;
    try {
      execSync(
        `node "${ADAPTER_SCRIPT}" --project movie --source "${wrongSrc}"`,
        { cwd: ROOT_DIR, encoding: "utf8", stdio: "pipe" },
      );
    } catch (err) {
      tDFailed = true;
      const combined = (err.stderr || "").toString() + (err.stdout || "").toString();
      assert.ok(combined.includes("Analyzer output file not found"), `Expected mismatch rejection in:\n${combined}`);
    }
    assert.ok(tDFailed, "Adapter must reject report from another source");
    console.log("  ✓ Test D PASSED: Mismatched explicit source rejected");

    // -------------------------------------------------------------
    // Test E: Nonexistent Explicit Source
    // -------------------------------------------------------------
    console.log("Test E: Nonexistent explicit source error");
    let tEFailed = false;
    try {
      execSync(
        `node "${ADAPTER_SCRIPT}" --project movie --source "${TEMP_TEST_DIR}/nonexistent_123"`,
        { cwd: ROOT_DIR, encoding: "utf8", stdio: "pipe" },
      );
    } catch (err) {
      tEFailed = true;
      const combined = (err.stderr || "").toString() + (err.stdout || "").toString();
      assert.ok(combined.includes("does not exist"), `Expected 'does not exist' error in:\n${combined}`);
    }
    assert.ok(tEFailed, "Adapter must fail when explicit source directory does not exist");
    console.log("  ✓ Test E PASSED: Nonexistent explicit source rejected with clear error");

    // -------------------------------------------------------------
    // Test F: npm forwarding
    // -------------------------------------------------------------
    console.log("Test F: npm argument forwarding");
    const npmOut = execSync(
      `npm run adapter -- --input analyze/projects/movie --project Movie --source "${movieSrcA}"`,
      { cwd: ROOT_DIR, encoding: "utf8" },
    );
    assert.ok(npmOut.includes("Project: movie"), `Expected Project: movie in npm output, got:\n${npmOut}`);
    assert.ok(fs.existsSync(movieExpOut), "npm forwarded command must generate explorer-data.json");
    console.log("  ✓ Test F PASSED: npm forwarding reaches adapter correctly");

    // -------------------------------------------------------------
    // Test G: Root test artifact protection
    // -------------------------------------------------------------
    console.log("Test G: Root test artifact protection");
    const syntheticRootReport = path.join(ROOT_DIR, "dependency-report.json");
    const createdSynthetic = !fs.existsSync(syntheticRootReport);
    if (createdSynthetic) {
      fs.writeFileSync(
        syntheticRootReport,
        JSON.stringify({ sourceDirectory: "synthetic/root", nodes: [], edges: [] }),
      );
    }
    try {
      // Direct adapter call with explicit project and source should pick project report, not root report
      const resG = execSync(
        `node "${ADAPTER_SCRIPT}" --project movie --source "${movieSrcA}"`,
        { cwd: ROOT_DIR, encoding: "utf8" },
      );
      assert.ok(resG.includes("Project: movie"), "Should select project movie");
      assert.ok(!resG.includes("synthetic/root"), "Root synthetic report must not override project report");
      console.log("  ✓ Test G PASSED: Synthetic root artifact does not override project-scoped report");
    } finally {
      if (createdSynthetic && fs.existsSync(syntheticRootReport)) {
        fs.unlinkSync(syntheticRootReport);
      }
    }

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
