#!/usr/bin/env node
/**
 * Test Suite for Explorer CLI Argument Forwarding Contract & Path Isolation
 *
 * Covers 9 Core Regression Tests:
 *   1. Project is not source (`node scripts/run-explorer.cjs --project movie`)
 *   2. Correct project analysis path (`analyze/projects/movie/` vs `ROOT/Movie`)
 *   3. Correct dependency report selection (`analyze/projects/movie/dependency-report.json`)
 *   4. Correct Explorer contract publishing (`explorer/public/projects/movie/` and `movie-app/`)
 *   5. npm explorer forwarding (`npm run explorer -- --project Movie`)
 *   6. npm adapter forwarding (`npm run adapter -- --input analyze/projects/movie --project movie --source <path>`)
 *   7. Explicit source mismatch rejection
 *   8. Nonexistent explicit source clear failure
 *   9. Root artifact protection (`ROOT/dependency-report.json` does not override project report)
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
  const tempRootReport = path.join(ROOT_DIR, "dependency-report.json");
  if (fs.existsSync(tempRootReport)) {
    fs.rmSync(tempRootReport, { force: true });
  }
}

function runTests() {
  console.log("Running Explorer CLI Argument Forwarding & Contract Test Suite...");
  console.log("===============================================================");

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
    // Test 1: Project is not source
    // -------------------------------------------------------------
    console.log("Test 1: Project is not source");
    try {
      const out1 = execSync(`node "${RUNNER_SCRIPT}" --project movie --build`, {
        cwd: ROOT_DIR,
        encoding: "utf8",
        stdio: "pipe",
      });
      assert.ok(out1.includes("Project: movie"), "Output must show Project: movie");
      assert.ok(
        !out1.includes(`Source:  ${path.join(ROOT_DIR, "movie")}`) &&
          !out1.includes(`Source:  ${path.join(ROOT_DIR, "Movie")}`),
        "Source must NOT be derived as ROOT/movie or ROOT/Movie"
      );
    } catch (err) {
      const stdout = err.stdout ? err.stdout.toString() : "";
      assert.ok(stdout.includes("Project: movie"), `Output should contain 'Project: movie', got: ${stdout}`);
    }
    assert.ok(!fs.existsSync(path.join(ROOT_DIR, "Movie")), "Accidental root Movie file must NOT be created");
    console.log("  ✓ Direct run-explorer accurately sets project = movie and source != ROOT/movie");

    // -------------------------------------------------------------
    // Test 2: Correct project analysis path
    // -------------------------------------------------------------
    console.log("Test 2: Correct project analysis path");
    const projAnalyzeDir = path.join(ROOT_DIR, "analyze", "projects", "movie");
    assert.ok(fs.existsSync(projAnalyzeDir), "Analysis directory must be analyze/projects/movie/");
    assert.ok(!fs.existsSync(path.join(ROOT_DIR, "Movie")), "ROOT/Movie must not be created as analysis path");
    console.log("  ✓ Analysis path correctly resolves to analyze/projects/movie/ and not ROOT/Movie");

    // -------------------------------------------------------------
    // Test 3: Correct dependency report
    // -------------------------------------------------------------
    console.log("Test 3: Correct dependency report selection");
    const projReportFile = path.join(projAnalyzeDir, "dependency-report.json");
    assert.ok(fs.existsSync(projReportFile), "Project dependency report must exist");
    const projReportData = JSON.parse(fs.readFileSync(projReportFile, "utf8"));
    assert.ok(
      projReportData.nodes && projReportData.nodes.length > 0,
      "Project dependency report must contain analyzed nodes"
    );
    console.log("  ✓ Project-scoped analyze/projects/movie/dependency-report.json selected");

    // -------------------------------------------------------------
    // Test 4: Correct Explorer contract
    // -------------------------------------------------------------
    console.log("Test 4: Correct Explorer contract publishing");
    execSync(`node "${ADAPTER_SCRIPT}" --project movie --source "${realSource}"`, {
      cwd: ROOT_DIR,
      encoding: "utf8",
    });

    const pubMovieContract = path.join(ROOT_DIR, "explorer", "public", "projects", "movie", "explorer-data.json");
    const pubMovieAppContract = path.join(ROOT_DIR, "explorer", "public", "projects", "movie-app", "explorer-data.json");
    assert.ok(fs.existsSync(pubMovieContract), "explorer/public/projects/movie/explorer-data.json must exist");
    if (fs.existsSync(path.join(ROOT_DIR, "explorer", "public", "projects", "movie-app"))) {
      assert.ok(fs.existsSync(pubMovieAppContract), "explorer/public/projects/movie-app/explorer-data.json must be synced");
    }
    console.log("  ✓ Resulting Explorer contract is project-scoped and mapped to public project assets");

    // -------------------------------------------------------------
    // Test 5: npm explorer forwarding
    // -------------------------------------------------------------
    console.log("Test 5: npm explorer argument forwarding");
    try {
      const out5 = execSync(`npm run explorer -- --project Movie --build`, {
        cwd: ROOT_DIR,
        encoding: "utf8",
        stdio: "pipe",
      });
      assert.ok(out5.includes("Project: movie"), "npm run explorer output must show Project: movie");
      assert.ok(!out5.includes("Unknown cli config"), "npm must not emit Unknown cli config warnings when using --");
    } catch (err) {
      const stdout = err.stdout ? err.stdout.toString() : "";
      assert.ok(stdout.includes("Project: movie"), `npm explorer stdout should contain 'Project: movie', got: ${stdout}`);
    }
    console.log("  ✓ npm run explorer -- --project Movie passes arguments to Node cleanly without becoming Movie source");

    // -------------------------------------------------------------
    // Test 6: npm adapter forwarding
    // -------------------------------------------------------------
    console.log("Test 6: npm adapter argument forwarding");
    const out6 = execSync(
      `npm run adapter -- --input analyze/projects/movie --project movie --source "${realSource}"`,
      { cwd: ROOT_DIR, encoding: "utf8" }
    );
    assert.ok(out6.includes("Project: movie"), "Adapter output must confirm Project: movie");
    assert.ok(!out6.includes("Unknown cli config"), "npm must not emit Unknown cli config warnings when using --");
    assert.ok(!fs.existsSync(path.join(ROOT_DIR, "Movie")), "No root Movie file created by npm adapter");
    console.log("  ✓ npm run adapter -- --input ... parses flags cleanly and creates project Explorer contract");

    // -------------------------------------------------------------
    // Test 7: Explicit source mismatch rejection
    // -------------------------------------------------------------
    console.log("Test 7: Explicit source mismatch rejection");
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
    console.log("  ✓ Report from another source correctly rejected when explicit source differs");

    // -------------------------------------------------------------
    // Test 8: Explicit nonexistent source clear failure
    // -------------------------------------------------------------
    console.log("Test 8: Clear failure on nonexistent explicit source");
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
    // Test 9: Root artifact protection
    // -------------------------------------------------------------
    console.log("Test 9: Root artifact protection");
    const tempRootReport = path.join(ROOT_DIR, "dependency-report.json");
    fs.writeFileSync(
      tempRootReport,
      JSON.stringify({
        sourceDirectory: "dummy/root/path",
        nodes: [{ id: "ApexClass:RootDummy", name: "RootDummy", type: "ApexClass" }],
        edges: [],
      })
    );

    const adapterResult = execSync(`node "${ADAPTER_SCRIPT}" --project movie --source "${realSource}"`, {
      cwd: ROOT_DIR,
      encoding: "utf8",
    });
    assert.ok(adapterResult.includes("Project: movie"), "Adapter must target project movie");

    const movieExplorerData = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, "analyze", "projects", "movie", "explorer-data.json"), "utf8")
    );
    assert.ok(
      movieExplorerData.nodes.some((n) => n.id.includes("MovieService")),
      "Explorer contract must contain MovieService from project report"
    );
    assert.ok(
      !movieExplorerData.nodes.some((n) => n.id.includes("RootDummy")),
      "Explorer contract MUST NOT contain RootDummy from root dependency-report.json"
    );
    console.log("  ✓ ROOT/dependency-report.json does not override project-scoped report for --project movie");

    // -------------------------------------------------------------
    // Test 10: Positional project name when ROOT/Movie directory exists
    // -------------------------------------------------------------
    console.log("Test 10: Positional project name when ROOT/Movie directory exists");
    const rootMovieDir = path.join(ROOT_DIR, "Movie");
    if (!fs.existsSync(rootMovieDir)) {
      fs.mkdirSync(rootMovieDir, { recursive: true });
    }
    try {
      const out10 = execSync(`node "${RUNNER_SCRIPT}" Movie --build`, {
        cwd: ROOT_DIR,
        encoding: "utf8",
        stdio: "pipe",
      });
      assert.ok(out10.includes("Project: movie"), "Positional 'Movie' must set project to movie");
      assert.ok(
        !out10.includes(`Source:  ${rootMovieDir}`),
        `Source must NOT be set to ROOT/Movie directory, got output: ${out10}`
      );
    } catch (err) {
      const stdout = err.stdout ? err.stdout.toString() : "";
      assert.ok(stdout.includes("Project: movie"), `Expected 'Project: movie' in stdout, got: ${stdout}`);
      assert.ok(!stdout.includes(`Source:  ${rootMovieDir}`), `Source must not be ROOT/Movie, got: ${stdout}`);
    } finally {
      if (fs.existsSync(rootMovieDir)) {
        fs.rmdirSync(rootMovieDir);
      }
    }
    console.log("  ✓ Positional 'Movie' correctly resolved to project = movie without treating ROOT/Movie as source");

    // -------------------------------------------------------------
    // Test 11: npm run explorer argument forwarding with positional argument
    // -------------------------------------------------------------
    console.log("Test 11: npm run explorer forwarding with positional argument and ROOT/Movie present");
    if (!fs.existsSync(rootMovieDir)) {
      fs.mkdirSync(rootMovieDir, { recursive: true });
    }
    try {
      const out11 = execSync(`npm run explorer -- --project Movie --build`, {
        cwd: ROOT_DIR,
        encoding: "utf8",
        stdio: "pipe",
      });
      assert.ok(out11.includes("Project: movie"), "npm run explorer output must show Project: movie");
      assert.ok(
        !out11.includes(`Source:  ${rootMovieDir}`),
        "Source must NOT be set to ROOT/Movie when --project Movie --build is passed"
      );
    } catch (err) {
      const stdout = err.stdout ? err.stdout.toString() : "";
      assert.ok(stdout.includes("Project: movie"), `Expected 'Project: movie' in stdout, got: ${stdout}`);
      assert.ok(!stdout.includes(`Source:  ${rootMovieDir}`), `Source must not be ROOT/Movie, got: ${stdout}`);
    } finally {
      if (fs.existsSync(rootMovieDir)) {
        fs.rmdirSync(rootMovieDir);
      }
    }
    console.log("  ✓ npm run explorer -- --project Movie --build correctly sets project = movie and source != ROOT/Movie");

    // -------------------------------------------------------------
    // Test 12: npm adapter forwarding with positional project argument
    // -------------------------------------------------------------
    console.log("Test 12: npm adapter argument forwarding with positional project argument");
    if (!fs.existsSync(rootMovieDir)) {
      fs.mkdirSync(rootMovieDir, { recursive: true });
    }
    try {
      const out12 = execSync(
        `npm run adapter -- --input analyze/projects/movie --project movie Movie`,
        { cwd: ROOT_DIR, encoding: "utf8" }
      );
      assert.ok(out12.includes("Project: movie"), "Adapter output must show Project: movie");
      assert.ok(!out12.includes("Source:  Movie"), "Source must not be set to Movie");
    } finally {
      if (fs.existsSync(rootMovieDir)) {
        fs.rmdirSync(rootMovieDir);
      }
    }
    console.log("  ✓ npm run adapter correctly parses project = movie without misinterpreting positional Movie as source");

    console.log("\nALL 12 EXPLORER CLI REGRESSION TESTS PASSED SUCCESSFULLY!");

  } finally {
    cleanup();
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
