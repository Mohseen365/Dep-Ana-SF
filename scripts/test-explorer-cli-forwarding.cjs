#!/usr/bin/env node
/**
 * Test Suite for Explorer CLI Argument Forwarding Contract
 *
 * Verifies that npm script argument forwarding and direct Node CLI invocations
 * correctly parse flags (--project, --source, --input) without misinterpreting
 * flags as positional arguments or creating unwanted artifacts.
 *
 * Covers 7 Core Tests:
 *   1. Direct run-explorer project argument (`node scripts/run-explorer.cjs --project Movie`)
 *   2. Direct export-explorer project/source (`node scripts/export-explorer.cjs --project movie --source <path>`)
 *   3. npm explorer forwarding (`npm run explorer -- --project Movie`)
 *   4. npm adapter forwarding (`npm run adapter -- --input analyze/projects/movie --project movie --source <path>`)
 *   5. Explicit source mismatch rejection
 *   6. Nonexistent explicit source clear failure
 *   7. Project ID normalization across case variants
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const ANALYZER_SCRIPT = path.join(ROOT_DIR, "dependency-analyzer.cjs");
const ADAPTER_SCRIPT = path.join(ROOT_DIR, "scripts", "export-explorer.cjs");
const RUNNER_SCRIPT = path.join(ROOT_DIR, "scripts", "run-explorer.cjs");
const TEST_TMP_DIR = path.join(ROOT_DIR, "tmp-cli-forwarding-test");

function setupFixture() {
  cleanup();
  const sourceDir = path.join(TEST_TMP_DIR, "src", "force-app", "main", "default", "classes");
  fs.mkdirSync(sourceDir, { recursive: true });

  fs.writeFileSync(
    path.join(sourceDir, "MovieService.cls"),
    `public with sharing class MovieService {
      public static void loadMovies() {
        System.debug('MovieService');
      }
    }`
  );

  return path.join(TEST_TMP_DIR, "src", "force-app", "main", "default");
}

function cleanup() {
  if (fs.existsSync(TEST_TMP_DIR)) {
    fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
  }
  const analyzeMovieDir = path.join(ROOT_DIR, "analyze", "projects", "movie");
  if (fs.existsSync(analyzeMovieDir)) {
    fs.rmSync(analyzeMovieDir, { recursive: true, force: true });
  }
  const testProjDir = path.join(ROOT_DIR, "analyze", "projects", "test-norm-proj");
  if (fs.existsSync(testProjDir)) {
    fs.rmSync(testProjDir, { recursive: true, force: true });
  }
  const rootMovieFile = path.join(ROOT_DIR, "Movie");
  if (fs.existsSync(rootMovieFile)) {
    fs.rmSync(rootMovieFile, { force: true });
  }
}

function runTests() {
  console.log("Running Explorer CLI Argument Forwarding Test Suite...");
  console.log("=====================================================");

  const realSource = setupFixture();

  try {
    // -------------------------------------------------------------
    // Pre-requisite: Generate Movie analyzer artifact
    // -------------------------------------------------------------
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${realSource}" --project Movie`, {
      cwd: ROOT_DIR,
      stdio: "pipe",
    });

    const reportPath = path.join(ROOT_DIR, "analyze", "projects", "movie", "dependency-report.json");
    assert.ok(fs.existsSync(reportPath), "dependency-report.json must exist under analyze/projects/movie/");

    // -------------------------------------------------------------
    // Test 1: Direct run-explorer project argument
    // -------------------------------------------------------------
    console.log("Test 1: Direct run-explorer project argument");
    // Run run-explorer with --project Movie (it will attempt to start explorer, but we catch/verify before spawn or mock build)
    try {
      const out1 = execSync(`node "${RUNNER_SCRIPT}" --project Movie --build`, {
        cwd: ROOT_DIR,
        encoding: "utf8",
        stdio: "pipe",
      });
      assert.ok(out1.includes("Project: movie"), "Output must show Project: movie");
      assert.ok(!out1.includes("Source:  /app/Movie") && !out1.includes("Source:  C:\\Movie"), "Source must NOT be interpreted as Movie");
    } catch (err) {
      const stdout = err.stdout ? err.stdout.toString() : "";
      assert.ok(stdout.includes("Project: movie"), `Output should contain 'Project: movie', got: ${stdout}`);
    }
    assert.ok(!fs.existsSync(path.join(ROOT_DIR, "Movie")), "Accidental root Movie file must NOT be created");
    console.log("  ✓ Direct run-explorer accurately sets project = movie and does not interpret Movie as source");

    // -------------------------------------------------------------
    // Test 2: Direct export-explorer project/source
    // -------------------------------------------------------------
    console.log("Test 2: Direct export-explorer project/source");
    const out2 = execSync(`node "${ADAPTER_SCRIPT}" --project movie --source "${realSource}"`, {
      cwd: ROOT_DIR,
      encoding: "utf8",
    });
    assert.ok(out2.includes("Project: movie"), "Adapter output must confirm Project: movie");
    const expDataPath = path.join(ROOT_DIR, "analyze", "projects", "movie", "explorer-data.json");
    assert.ok(fs.existsSync(expDataPath), "explorer-data.json must be generated");
    console.log("  ✓ Direct export-explorer correctly selects project movie and produces explorer-data.json");

    // -------------------------------------------------------------
    // Test 3: npm explorer forwarding
    // -------------------------------------------------------------
    console.log("Test 3: npm explorer argument forwarding");
    try {
      const out3 = execSync(`npm run explorer -- --project Movie --build`, {
        cwd: ROOT_DIR,
        encoding: "utf8",
        stdio: "pipe",
      });
      assert.ok(out3.includes("Project: movie"), "npm run explorer output must show Project: movie");
      assert.ok(!out3.includes("Unknown cli config"), "npm must not emit Unknown cli config warnings when using --");
    } catch (err) {
      const stdout = err.stdout ? err.stdout.toString() : "";
      assert.ok(stdout.includes("Project: movie"), `npm explorer stdout should contain 'Project: movie', got: ${stdout}`);
    }
    console.log("  ✓ npm run explorer -- --project Movie forwards arguments cleanly without npm config warnings");

    // -------------------------------------------------------------
    // Test 4: npm adapter forwarding
    // -------------------------------------------------------------
    console.log("Test 4: npm adapter argument forwarding");
    const out4 = execSync(
      `npm run adapter -- --input analyze/projects/movie --project movie --source "${realSource}"`,
      { cwd: ROOT_DIR, encoding: "utf8" }
    );
    assert.ok(out4.includes("Project: movie"), "Adapter output must confirm Project: movie");
    assert.ok(!out4.includes("Unknown cli config"), "npm must not emit Unknown cli config warnings when using --");
    console.log("  ✓ npm run adapter -- --input ... forwards flags cleanly to Node script");

    // -------------------------------------------------------------
    // Test 5: Rejection of mismatched explicit source
    // -------------------------------------------------------------
    console.log("Test 5: Explicit source mismatch rejection");
    const dummyOtherSource = path.join(TEST_TMP_DIR, "other-source");
    fs.mkdirSync(dummyOtherSource, { recursive: true });
    fs.writeFileSync(path.join(dummyOtherSource, "Dummy.cls"), "public class Dummy {}");

    let mismatchedFailed = false;
    try {
      execSync(`node "${ADAPTER_SCRIPT}" --input analyze/projects/movie --project movie --source "${dummyOtherSource}"`, {
        cwd: ROOT_DIR,
        stdio: "pipe",
      });
    } catch (err) {
      mismatchedFailed = true;
      const stderr = err.stderr ? err.stderr.toString() : "";
      assert.ok(
        stderr.includes("does not match explicit source"),
        `Stderr must report source mismatch, got: ${stderr}`
      );
    }
    assert.ok(mismatchedFailed, "Adapter must fail when explicit source does not match analyzer report");
    console.log("  ✓ Mismatched explicit source correctly rejected");

    // -------------------------------------------------------------
    // Test 6: Nonexistent explicit source clear failure
    // -------------------------------------------------------------
    console.log("Test 6: Clear failure on nonexistent explicit source");
    let nonexistentFailed = false;
    try {
      execSync(`node "${ADAPTER_SCRIPT}" --project movie --source "${path.join(TEST_TMP_DIR, "non-existent-path")}"`, {
        cwd: ROOT_DIR,
        stdio: "pipe",
      });
    } catch (err) {
      nonexistentFailed = true;
      const stderr = err.stderr ? err.stderr.toString() : "";
      assert.ok(
        stderr.includes("Explicitly supplied source directory does not exist"),
        `Stderr must report missing explicit source, got: ${stderr}`
      );
    }
    assert.ok(nonexistentFailed, "Adapter must fail clearly when explicit source directory does not exist");
    console.log("  ✓ Nonexistent explicit source fails clearly with informative error message");

    // -------------------------------------------------------------
    // Test 7: Project ID case normalization contract
    // -------------------------------------------------------------
    console.log("Test 7: Project ID case normalization");
    // Run analyzer with mixed case --project Test-Norm-Proj
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${realSource}" --project Test-Norm-Proj`, {
      cwd: ROOT_DIR,
      stdio: "pipe",
    });

    // Run adapter with different case variants: --project TEST-NORM-PROJ and --project test-norm-proj
    const resA = execSync(`node "${ADAPTER_SCRIPT}" --project TEST-NORM-PROJ --source "${realSource}"`, {
      cwd: ROOT_DIR,
      encoding: "utf8",
    });
    assert.ok(resA.includes("Project: test-norm-proj"), "Output must show normalized slug test-norm-proj");

    const resB = execSync(`node "${ADAPTER_SCRIPT}" --project test-norm-proj --source "${realSource}"`, {
      cwd: ROOT_DIR,
      encoding: "utf8",
    });
    assert.ok(resB.includes("Project: test-norm-proj"), "Output must show normalized slug test-norm-proj");

    assert.ok(
      fs.existsSync(path.join(ROOT_DIR, "analyze", "projects", "test-norm-proj", "explorer-data.json")),
      "Artifact created under canonical slug directory test-norm-proj"
    );
    console.log("  ✓ Project ID case variants resolve consistently to canonical slug");

    console.log("\nALL 7 EXPLORER CLI FORWARDING TESTS PASSED SUCCESSFULLY!");

  } finally {
    cleanup();
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
