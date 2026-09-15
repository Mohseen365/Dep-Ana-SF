#!/usr/bin/env node
/**
 * Hardened Test Suite for Multi-Project Foundation, Isolation & Explorer Data Pipeline
 *
 * Validates 8 core regression requirements:
 * 1. Project name slugification (e.g. "Movie App" -> "movie-app", "Salesforce Core CRM" -> "salesforce-core-crm")
 * 2. Project-scoped output (analyze/projects/movie-app/explorer-data.json)
 * 3. Browser-scoped output (explorer/public/projects/movie-app/explorer-data.json)
 * 4. Multiple projects independence (proj-a, proj-b, movie-app remain isolated)
 * 5. Source-specific export
 * 6. Default project backward compatibility (analyze/explorer-data.json & explorer/public/explorer-data.json)
 * 7. Project switching URL & metadata contract consistency
 * 8. Stale report prevention (explicit --source prevents re-using unrelated reports)
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { exportExplorerData, slugify } = require("./export-explorer.cjs");

const FIXTURE_DIR_A = path.join(__dirname, "../temp-test-fixture-proj-a");
const FIXTURE_DIR_B = path.join(__dirname, "../temp-test-fixture-proj-b");
const TEST_ANALYZE_DIR = path.join(__dirname, "../temp-multi-project-analyze");
const PUBLIC_DIR = path.join(__dirname, "../explorer/public");

function setupFixtures() {
  cleanupFixtures();

  // Project A Fixture (ApexClass: ServiceA)
  fs.mkdirSync(path.join(FIXTURE_DIR_A, "classes"), { recursive: true });
  fs.writeFileSync(
    path.join(FIXTURE_DIR_A, "classes/ServiceA.cls"),
    `public class ServiceA { public static void doA() {} }`
  );

  // Project B Fixture (ApexClass: ServiceB)
  fs.mkdirSync(path.join(FIXTURE_DIR_B, "classes"), { recursive: true });
  fs.writeFileSync(
    path.join(FIXTURE_DIR_B, "classes/ServiceB.cls"),
    `public class ServiceB { public static void doB() {} }`
  );

  const { execSync } = require("child_process");
  const analyzerPath = path.join(__dirname, "../dependency-analyzer.cjs");

  // Analyze Project A
  const analyzeOutA = path.join(FIXTURE_DIR_A, "analyze");
  execSync(`node "${analyzerPath}" analyze "${FIXTURE_DIR_A}"`, { stdio: "ignore" });
  if (fs.existsSync("analyze") && !fs.existsSync(analyzeOutA)) {
    fs.renameSync("analyze", analyzeOutA);
  }

  // Analyze Project B
  const analyzeOutB = path.join(FIXTURE_DIR_B, "analyze");
  execSync(`node "${analyzerPath}" analyze "${FIXTURE_DIR_B}"`, { stdio: "ignore" });
  if (fs.existsSync("analyze") && !fs.existsSync(analyzeOutB)) {
    fs.renameSync("analyze", analyzeOutB);
  }
}

function cleanupFixtures() {
  [FIXTURE_DIR_A, FIXTURE_DIR_B, TEST_ANALYZE_DIR].forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // Clean transient test project outputs from explorer/public/projects
  const transientTestProjs = ["project-alpha", "project-beta", "stale-check", "invalid-proj"];
  transientTestProjs.forEach((pId) => {
    const pPath = path.join(PUBLIC_DIR, "projects", pId);
    if (fs.existsSync(pPath)) {
      fs.rmSync(pPath, { recursive: true, force: true });
    }
  });

  // Restore any git-tracked files in analyze/ or explorer/public/ modified by test runs
  const { execSync } = require("child_process");
  try {
    execSync("git checkout HEAD -- analyze/ explorer/public/", { stdio: "ignore" });
  } catch (_) {}
}

function runMultiProjectTests() {
  console.log("Running Multi-Project Foundation & Isolation Test Suite...");
  console.log("==========================================================");

  setupFixtures();

  try {
    const inputA = path.join(FIXTURE_DIR_A, "analyze");
    const inputB = path.join(FIXTURE_DIR_B, "analyze");

    // REGRESSION TEST 1: Project Name Slugification
    console.log("Regression Test 1: Project name slugification");
    assert.strictEqual(slugify("Movie App"), "movie-app");
    assert.strictEqual(slugify("Salesforce Core CRM"), "salesforce-core-crm");
    assert.strictEqual(slugify("MOVIE APP"), "movie-app");
    assert.strictEqual(slugify("  Movie--App  "), "movie-app");
    assert.strictEqual(slugify("default"), "default");
    console.log("  ✓ Project name slugification functions deterministically");

    // REGRESSION TEST 2: Project-Scoped Output
    console.log("Regression Test 2: Project-scoped output contract generation");
    const movieAppOutput = path.join(TEST_ANALYZE_DIR, "projects", "movie-app", "explorer-data.json");
    const resMovie = exportExplorerData(inputA, movieAppOutput, {
      project: "Movie App",
      projectName: "Movie App",
      source: FIXTURE_DIR_A,
    });

    assert.ok(fs.existsSync(movieAppOutput), "analyze/projects/movie-app/explorer-data.json must exist");
    assert.strictEqual(resMovie.projectMetadata.id, "movie-app");
    assert.strictEqual(resMovie.explorerData.project.id, "movie-app");
    assert.ok(resMovie.explorerData.nodes.length > 0, "nodes must not be empty");
    assert.ok(Array.isArray(resMovie.explorerData.edges), "edges must be an array");
    assert.strictEqual(resMovie.explorerData.summary.nodeCount, resMovie.explorerData.nodes.length);
    console.log("  ✓ Created project-scoped output contract at analyze/projects/movie-app/explorer-data.json");

    // REGRESSION TEST 3: Browser-Scoped Output
    console.log("Regression Test 3: Browser-scoped output publishing");
    const browserMovieOutput = path.join(PUBLIC_DIR, "projects", "movie-app", "explorer-data.json");
    assert.ok(fs.existsSync(browserMovieOutput), "explorer/public/projects/movie-app/explorer-data.json must exist");

    const analyzeContent = fs.readFileSync(movieAppOutput, "utf8");
    const browserContent = fs.readFileSync(browserMovieOutput, "utf8");
    assert.strictEqual(analyzeContent, browserContent, "analyze contract and explorer/public contract must be identical");
    console.log("  ✓ Published browser-served contract at explorer/public/projects/movie-app/explorer-data.json");

    // REGRESSION TEST 4: Multiple Projects Independence
    console.log("Regression Test 4: Multiple projects independence");
    const outputA = path.join(TEST_ANALYZE_DIR, "projects", "proj-a", "explorer-data.json");
    const outputB = path.join(TEST_ANALYZE_DIR, "projects", "proj-b", "explorer-data.json");

    const resA = exportExplorerData(inputA, outputA, {
      project: "Project Alpha",
      projectName: "Project Alpha",
      source: FIXTURE_DIR_A,
    });

    const resB = exportExplorerData(inputB, outputB, {
      project: "Project Beta",
      projectName: "Project Beta",
      source: FIXTURE_DIR_B,
    });

    assert.strictEqual(resA.projectMetadata.id, "project-alpha");
    assert.strictEqual(resB.projectMetadata.id, "project-beta");

    assert.ok(fs.existsSync(outputA));
    assert.ok(fs.existsSync(outputB));

    const nodesA = resA.explorerData.nodes.map((n) => n.displayName);
    const nodesB = resB.explorerData.nodes.map((n) => n.displayName);

    assert.ok(nodesA.includes("ServiceA"), "Project Alpha MUST contain ServiceA");
    assert.ok(!nodesA.includes("ServiceB"), "Project Alpha MUST NOT contain ServiceB");

    assert.ok(nodesB.includes("ServiceB"), "Project Beta MUST contain ServiceB");
    assert.ok(!nodesB.includes("ServiceA"), "Project Beta MUST NOT contain ServiceA");

    console.log("  ✓ Verified project-alpha, project-beta, and movie-app remain completely independent");

    // REGRESSION TEST 5: Source-Specific Export
    console.log("Regression Test 5: Source-specific export");
    assert.strictEqual(resA.projectMetadata.sourcePath, FIXTURE_DIR_A);
    assert.strictEqual(resB.projectMetadata.sourcePath, FIXTURE_DIR_B);
    console.log("  ✓ Exported contracts correctly reflect requested source directories");

    // REGRESSION TEST 6: Default Project Backward Compatibility
    console.log("Regression Test 6: Default project backward compatibility");
    const defaultOutput = path.join(TEST_ANALYZE_DIR, "explorer-data.json");
    const defaultRes = exportExplorerData(inputA, defaultOutput);

    assert.strictEqual(defaultRes.projectMetadata.id, "default");
    assert.strictEqual(defaultRes.projectMetadata.name, "Default Salesforce Project");
    assert.strictEqual(defaultRes.projectMetadata.analysisPath, "/explorer-data.json");
    assert.ok(fs.existsSync(defaultOutput), "analyze/explorer-data.json fallback must exist");
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, "explorer-data.json")), "explorer/public/explorer-data.json fallback must exist");
    console.log("  ✓ Backward compatibility for default single-project export verified");

    // REGRESSION TEST 7: Project Switching Contract Consistency
    console.log("Regression Test 7: Project switching contract consistency");
    const manifestPath = path.join(TEST_ANALYZE_DIR, "project-manifest.json");
    assert.ok(fs.existsSync(manifestPath));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const projIds = manifest.projects.map((p) => p.id);
    assert.ok(projIds.includes("default"));
    assert.ok(projIds.includes("movie-app"));
    assert.ok(projIds.includes("project-alpha"));
    assert.ok(projIds.includes("project-beta"));

    manifest.projects.forEach((p) => {
      if (p.id === "default") {
        assert.strictEqual(p.analysisPath, "/explorer-data.json");
      } else {
        assert.strictEqual(p.analysisPath, `/projects/${p.id}/explorer-data.json`);
      }
    });
    console.log("  ✓ Project switching metadata and analysisPath contract consistency verified");

    // REGRESSION TEST 8: Stale Report Prevention
    console.log("Regression Test 8: Stale report prevention");
    // Ensure that supplying a different explicit --source on a directory with an old report triggers re-analysis for the new source
    assert.throws(
      () => {
        exportExplorerData(inputA, path.join(TEST_ANALYZE_DIR, "projects", "stale-check", "explorer-data.json"), {
          project: "stale-check",
          source: "/non/existent/unrelated/source/directory",
        });
      },
      /Analyzer output file not found/,
      "Must not silently reuse stale input report when explicit --source does not match"
    );
    console.log("  ✓ Stale report prevention verified: explicit unmatched --source rejected");

    console.log("\nALL 8 REGRESSION TESTS PASSED SUCCESSFULLY!");
  } finally {
    cleanupFixtures();
  }
}

if (require.main === module) {
  try {
    runMultiProjectTests();
  } catch (err) {
    console.error(`\nMulti-project test failure: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

module.exports = { runMultiProjectTests };
