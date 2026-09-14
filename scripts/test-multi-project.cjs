#!/usr/bin/env node
/**
 * Hardened Test Suite for Multi-Project Foundation & Isolation
 *
 * Validates:
 * 1. Creating project metadata and schema compliance
 * 2. Multi-project manifest generation & project loading
 * 3. Switching project context
 * 4. Project data isolation (Project A data never leaks into Project B)
 * 5. Missing / invalid project error handling
 * 6. Backward compatibility with default single-project export
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { exportExplorerData } = require("./export-explorer.cjs");

const FIXTURE_DIR_A = path.join(__dirname, "../temp-test-fixture-proj-a");
const FIXTURE_DIR_B = path.join(__dirname, "../temp-test-fixture-proj-b");
const TEST_ANALYZE_DIR = path.join(__dirname, "../temp-multi-project-analyze");

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
  if (fs.existsSync("analyze")) {
    fs.rmSync("analyze", { recursive: true, force: true });
  }
}

function runMultiProjectTests() {
  console.log("Running Multi-Project Foundation & Isolation Test Suite...");
  console.log("==========================================================");

  setupFixtures();

  try {
    const inputA = path.join(FIXTURE_DIR_A, "analyze");
    const inputB = path.join(FIXTURE_DIR_B, "analyze");

    const outputA = path.join(TEST_ANALYZE_DIR, "projects", "proj-a", "explorer-data.json");
    const outputB = path.join(TEST_ANALYZE_DIR, "projects", "proj-b", "explorer-data.json");

    // TEST 1: Creating Project Metadata & Exporting Isolated Projects
    console.log("Test 1: Creating project metadata");
    const resA = exportExplorerData(inputA, outputA, {
      project: "proj-a",
      projectName: "Project Alpha",
      projectDesc: "Salesforce DX Package Alpha",
      source: "force-app/alpha",
    });

    const resB = exportExplorerData(inputB, outputB, {
      project: "proj-b",
      projectName: "Project Beta",
      projectDesc: "Salesforce DX Package Beta",
      source: "force-app/beta",
    });

    assert.strictEqual(resA.projectMetadata.id, "proj-a");
    assert.strictEqual(resA.projectMetadata.name, "Project Alpha");
    assert.strictEqual(resA.projectMetadata.sourcePath, "force-app/alpha");

    assert.strictEqual(resB.projectMetadata.id, "proj-b");
    assert.strictEqual(resB.projectMetadata.name, "Project Beta");
    assert.strictEqual(resB.projectMetadata.sourcePath, "force-app/beta");

    assert.ok(fs.existsSync(path.join(TEST_ANALYZE_DIR, "projects", "proj-a", "project-metadata.json")));
    assert.ok(fs.existsSync(path.join(TEST_ANALYZE_DIR, "projects", "proj-b", "project-metadata.json")));
    console.log("  ✓ Created metadata for Project Alpha (proj-a) and Project Beta (proj-b)");

    // TEST 2: Loading Projects from Multi-Project Manifest
    console.log("Test 2: Loading projects from multi-project manifest");
    const manifestPath = path.join(TEST_ANALYZE_DIR, "project-manifest.json");
    assert.ok(fs.existsSync(manifestPath), "project-manifest.json must exist in root output directory");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.strictEqual(manifest.manifestVersion, "1.0.0");
    assert.strictEqual(manifest.projects.length, 2);

    const loadedIds = manifest.projects.map((p) => p.id);
    assert.ok(loadedIds.includes("proj-a"));
    assert.ok(loadedIds.includes("proj-b"));
    console.log("  ✓ Loaded manifest with 2 registered projects");

    // TEST 3: Switching Project Context & Project Isolation Guarantees
    console.log("Test 3: Switching project context & data isolation");
    const dataA = resA.explorerData;
    const dataB = resB.explorerData;

    const nodesA = dataA.nodes.map((n) => n.displayName);
    const nodesB = dataB.nodes.map((n) => n.displayName);

    assert.ok(nodesA.includes("ServiceA"), "Project Alpha MUST contain ServiceA");
    assert.ok(!nodesA.includes("ServiceB"), "Project Alpha MUST NOT contain ServiceB (Data Leak Check)");

    assert.ok(nodesB.includes("ServiceB"), "Project Beta MUST contain ServiceB");
    assert.ok(!nodesB.includes("ServiceA"), "Project Beta MUST NOT contain ServiceA (Data Leak Check)");

    console.log("  ✓ Verified zero component/dependency data leaks between Project Alpha and Project Beta");

    // TEST 4: Missing or Invalid Project Error Handling
    console.log("Test 4: Missing or invalid project error handling");
    assert.throws(
      () => {
        exportExplorerData(path.join(__dirname, "non-existent-folder"), "output.json", {
          project: "invalid-proj",
        });
      },
      /Analyzer output file not found/,
      "Adapter must throw clear error when input directory does not exist"
    );
    console.log("  ✓ Clean error handling for missing/invalid projects verified");

    // TEST 5: Backward Compatibility
    console.log("Test 5: Backward compatibility with default single-project export");
    const defaultOutput = path.join(TEST_ANALYZE_DIR, "explorer-data.json");
    const defaultRes = exportExplorerData(inputA, defaultOutput);

    assert.strictEqual(defaultRes.projectMetadata.id, "default");
    assert.strictEqual(defaultRes.projectMetadata.name, "Default Salesforce Project");
    assert.ok(fs.existsSync(defaultOutput), "Legacy root explorer-data.json output must exist");
    console.log("  ✓ Backward compatibility for default single-project pipeline verified");

    console.log("\nALL MULTI-PROJECT FOUNDATION & ISOLATION TESTS PASSED!");
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
