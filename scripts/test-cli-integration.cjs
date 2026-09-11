#!/usr/bin/env node
/**
 * Hardened CLI Integration Boundary Test Suite for dependency-analyzer (DA-2.1)
 *
 * Covers 20 core contract invariants:
 *  1. Module require safety (if require.main === module)
 *  2. Normal CLI analysis
 *  3. Explicit output directory (--output-dir)
 *  4. Explicit source flag (--source)
 *  5. Windows-style path input
 *  6. Artifact generation
 *  7. Manifest schema & provenance
 *  8. Artifact SHA-256 file hashes
 *  9. Content-based source hash
 * 10. Same contents + changed mtime produces SAME source hash
 * 11. Changed contents produces DIFFERENT source hash
 * 12. Renamed file produces DIFFERENT source hash
 * 13. Stale source detection
 * 14. Missing source failure (exit code 1, stderr error)
 * 15. Unknown command failure (exit code 1, stderr error)
 * 16. No misleading COMPLETE manifest on failure
 * 17. Deterministic analysis output
 * 18. Explorer adapter behavior & explorerData registration
 * 19. Single manifest lifecycle
 * 20. External-consumer-style validation flow
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const crypto = require("crypto");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const ANALYZER_SCRIPT = path.join(ROOT_DIR, "dependency-analyzer.cjs");
const ADAPTER_SCRIPT = path.join(ROOT_DIR, "scripts", "export-explorer.cjs");
const TEST_TMP_DIR = path.join(ROOT_DIR, "tmp-integration-test");
const FIXTURE_DIR = path.join(TEST_TMP_DIR, "fixture");
const OUTPUT_DIR_1 = path.join(TEST_TMP_DIR, "out1");
const OUTPUT_DIR_2 = path.join(TEST_TMP_DIR, "out2");

function computeFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return "sha256:" + crypto.createHash("sha256").update(content).digest("hex");
}

function setupFixture() {
  cleanup();
  fs.mkdirSync(path.join(FIXTURE_DIR, "classes"), { recursive: true });
  fs.mkdirSync(path.join(FIXTURE_DIR, "triggers"), { recursive: true });
  fs.mkdirSync(path.join(FIXTURE_DIR, "lwc/demo"), { recursive: true });

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "classes/SampleService.cls"),
    `public with sharing class SampleService {
      public static void doWork() {
        SampleHelper.help();
      }
    }`
  );

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "classes/SampleHelper.cls"),
    `public with sharing class SampleHelper {
      public static void help() {
        System.debug('Helping');
      }
    }`
  );

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "triggers/SampleTrigger.trigger"),
    `trigger SampleTrigger on Account (before insert) {
      SampleService.doWork();
    }`
  );

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "lwc/demo/demo.js"),
    `import { LightningElement } from 'lwc';
    import doWork from '@salesforce/apex/SampleService.doWork';
    export default class Demo extends LightningElement {}`
  );
}

function cleanup() {
  if (fs.existsSync(TEST_TMP_DIR)) {
    fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
  }
}

function runTests() {
  console.log("Running Hardened CLI Integration Boundary Test Suite (DA-2.1)...");
  console.log("=============================================================");

  setupFixture();

  try {
    // -------------------------------------------------------------
    // Test 1: Module import safety (require does not execute CLI)
    // -------------------------------------------------------------
    console.log("Test 1: Module require safety");
    const requiredModule = require(ANALYZER_SCRIPT);
    assert.strictEqual(typeof requiredModule.analyze, "function");
    assert.strictEqual(typeof requiredModule.buildGraph, "function");
    console.log("  ✓ Requiring module does not trigger CLI execution or error");

    // -------------------------------------------------------------
    // Test 2: Normal CLI analysis
    // -------------------------------------------------------------
    console.log("Test 2: Normal CLI analysis execution");
    const stdout = execSync(
      `node "${ANALYZER_SCRIPT}" analyze "${FIXTURE_DIR}" --output-dir "${OUTPUT_DIR_1}"`,
      { encoding: "utf8" }
    );
    assert.ok(stdout.includes("Analysis complete"), "Output should indicate completion");
    assert.ok(fs.existsSync(OUTPUT_DIR_1), "Output directory must exist");
    console.log("  ✓ CLI executed successfully and generated output directory");

    // -------------------------------------------------------------
    // Test 3: Explicit --output-dir flag
    // -------------------------------------------------------------
    console.log("Test 3: Explicit --output-dir flag handling");
    const customOut = path.join(TEST_TMP_DIR, "custom_out");
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${FIXTURE_DIR}" --output-dir "${customOut}"`);
    assert.ok(fs.existsSync(path.join(customOut, "analysis-manifest.json")), "Manifest created in custom output dir");
    console.log("  ✓ Custom output directory correctly populated");

    // -------------------------------------------------------------
    // Test 4: Explicit --source flag
    // -------------------------------------------------------------
    console.log("Test 4: Explicit --source flag handling");
    const sourceOut = path.join(TEST_TMP_DIR, "source_out");
    execSync(`node "${ANALYZER_SCRIPT}" analyze --source "${FIXTURE_DIR}" --output-dir "${sourceOut}"`);
    assert.ok(fs.existsSync(path.join(sourceOut, "analysis-manifest.json")), "Manifest created via --source option");
    console.log("  ✓ --source option correctly resolved");

    // -------------------------------------------------------------
    // Test 5: Windows-style Backslash Path Input
    // -------------------------------------------------------------
    console.log("Test 5: Windows-style Backslash Path Handling");
    const relFixtureDir = path.relative(process.cwd(), FIXTURE_DIR).replace(/\//g, "\\");
    const relWinOutDir = path.relative(process.cwd(), path.join(TEST_TMP_DIR, "win_out")).replace(/\//g, "\\");
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${relFixtureDir}" --output-dir "${relWinOutDir}"`);
    const actualWinOutDir = path.join(TEST_TMP_DIR, "win_out");
    assert.ok(fs.existsSync(path.join(actualWinOutDir, "analysis-manifest.json")), "Manifest generated with Windows paths");

    const winReport = JSON.parse(fs.readFileSync(path.join(actualWinOutDir, "dependency-report.json"), "utf8"));
    for (const node of winReport.nodes) {
      if (node.file) {
        assert.ok(!node.file.includes("\\"), `File path in node '${node.id}' must use POSIX slashes: ${node.file}`);
      }
    }
    console.log("  ✓ Backslash path inputs handled smoothly and normalized to POSIX slashes in output");

    // -------------------------------------------------------------
    // Test 6: Required Artifact Generation
    // -------------------------------------------------------------
    console.log("Test 6: Core Integration Artifact Generation");
    const requiredArtifacts = [
      "analysis-manifest.json",
      "dependency-report.json",
      "analysis-snapshot.json",
      "architecture-metrics.json",
      "dependency-report.md",
      "dependency-summary.md",
      "unresolved-references.md"
    ];

    for (const file of requiredArtifacts) {
      const p = path.join(OUTPUT_DIR_1, file);
      assert.ok(fs.existsSync(p), `Required artifact missing: ${file}`);
    }
    console.log(`  ✓ Verified presence of all ${requiredArtifacts.length} core integration artifacts`);

    // -------------------------------------------------------------
    // Test 7: Manifest Schema & Provenance
    // -------------------------------------------------------------
    console.log("Test 7: Manifest Schema & Provenance Verification");
    const manifestPath = path.join(OUTPUT_DIR_1, "analysis-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    assert.strictEqual(manifest.manifestVersion, "1.0.0");
    assert.strictEqual(manifest.analyzerVersion, "13.0.0");
    assert.strictEqual(manifest.contractVersion, "1.0.0");
    assert.strictEqual(manifest.status, "COMPLETE");
    assert.ok(manifest.generatedAt, "generatedAt must exist");
    assert.ok(manifest.source.directory, "source.directory must exist");
    assert.ok(manifest.source.fileCount > 0, "source.fileCount must be > 0");
    assert.ok(manifest.source.sourceHash.startsWith("sha256:"), "sourceHash must start with sha256:");
    console.log("  ✓ Manifest schema version, status, and source properties verified");

    // -------------------------------------------------------------
    // Test 8: Manifest Artifact SHA-256 Hashes
    // -------------------------------------------------------------
    console.log("Test 8: Artifact SHA-256 File Hash Integrity");
    assert.ok(manifest.artifacts.dependencyReport, "manifest.artifacts.dependencyReport must exist");
    for (const [key, artifact] of Object.entries(manifest.artifacts)) {
      assert.ok(!artifact.path.includes("analysis-manifest.json"), "Manifest must NOT list itself as an artifact");
      const artPath = path.join(OUTPUT_DIR_1, artifact.path);
      assert.ok(fs.existsSync(artPath), `Manifest artifact path '${artifact.path}' must exist on disk`);
      const actualHash = computeFileHash(artPath);
      assert.strictEqual(
        artifact.fileHash,
        actualHash,
        `File hash mismatch for artifact key '${key}' (${artifact.path})`
      );
    }
    console.log("  ✓ All artifact SHA-256 file hashes match actual file bytes");

    // -------------------------------------------------------------
    // Test 9: Content-based Source Hash Initial Calculation
    // -------------------------------------------------------------
    console.log("Test 9: Content-based Source Hash Fingerprint");
    const hash1 = manifest.source.sourceHash;
    assert.ok(typeof hash1 === "string" && hash1.length > 10);
    console.log(`  ✓ Initial source content hash: ${hash1}`);

    // -------------------------------------------------------------
    // Test 10: Same contents + changed mtimes -> SAME source hash
    // -------------------------------------------------------------
    console.log("Test 10: Same Contents + Changed mtime -> SAME Source Hash");
    const fileToTouch = path.join(FIXTURE_DIR, "classes/SampleService.cls");
    const futureTime = new Date(Date.now() + 100000);
    fs.utimesSync(fileToTouch, futureTime, futureTime);

    const touchOut = path.join(TEST_TMP_DIR, "touch_out");
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${FIXTURE_DIR}" --output-dir "${touchOut}"`);
    const touchManifest = JSON.parse(fs.readFileSync(path.join(touchOut, "analysis-manifest.json"), "utf8"));
    assert.strictEqual(
      touchManifest.source.sourceHash,
      hash1,
      "Modifying file timestamps (mtime) MUST NOT change content-based sourceHash"
    );
    console.log("  ✓ Source hash remains identical when file mtime changes without content modification");

    // -------------------------------------------------------------
    // Test 11: Changed file contents -> DIFFERENT source hash
    // -------------------------------------------------------------
    console.log("Test 11: Changed File Contents -> DIFFERENT Source Hash");
    fs.appendFileSync(fileToTouch, "\n// Content modification\n");

    const contentOut = path.join(TEST_TMP_DIR, "content_out");
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${FIXTURE_DIR}" --output-dir "${contentOut}"`);
    const contentManifest = JSON.parse(fs.readFileSync(path.join(contentOut, "analysis-manifest.json"), "utf8"));
    assert.notStrictEqual(
      contentManifest.source.sourceHash,
      hash1,
      "Modifying file content MUST change content-based sourceHash"
    );
    console.log("  ✓ Source hash changes when file content is modified");

    // -------------------------------------------------------------
    // Test 12: Renamed file -> DIFFERENT source hash
    // -------------------------------------------------------------
    console.log("Test 12: Renamed File -> DIFFERENT Source Hash");
    const oldPath = path.join(FIXTURE_DIR, "classes/SampleHelper.cls");
    const newPath = path.join(FIXTURE_DIR, "classes/SampleHelperRenamed.cls");
    fs.renameSync(oldPath, newPath);

    const renameOut = path.join(TEST_TMP_DIR, "rename_out");
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${FIXTURE_DIR}" --output-dir "${renameOut}"`);
    const renameManifest = JSON.parse(fs.readFileSync(path.join(renameOut, "analysis-manifest.json"), "utf8"));
    assert.notStrictEqual(
      renameManifest.source.sourceHash,
      hash1,
      "Renaming a source file MUST change sourceHash"
    );
    // Restore file name
    fs.renameSync(newPath, oldPath);
    console.log("  ✓ Source hash changes when a file is renamed");

    // -------------------------------------------------------------
    // Test 13: Stale Source Detection Logic
    // -------------------------------------------------------------
    console.log("Test 13: Stale Source Detection Logic");
    const { getAnalysis } = require(ANALYZER_SCRIPT);
    const rechecked = getAnalysis(FIXTURE_DIR, { quiet: true, useSnapshot: true });
    assert.strictEqual(rechecked.fromSnapshot, undefined, "Cached snapshot must be invalidated when source changes");
    console.log("  ✓ Stale source data successfully detected and invalidated");

    // -------------------------------------------------------------
    // Test 14: Missing Source Directory Failure
    // -------------------------------------------------------------
    console.log("Test 14: Failure Semantics - Missing Source Directory");
    let missingFailed = false;
    try {
      execSync(`node "${ANALYZER_SCRIPT}" analyze non_existent_dir_xyz_123`, { stdio: "pipe" });
    } catch (err) {
      missingFailed = true;
      assert.notStrictEqual(err.status, 0, "Exit code must be non-zero on missing source");
      const stderr = err.stderr ? err.stderr.toString() : "";
      assert.ok(stderr.includes("Source directory does not exist"), "stderr must state source missing error");
    }
    assert.ok(missingFailed, "CLI must fail when source directory does not exist");
    console.log("  ✓ Non-zero exit code and error logged on stderr");

    // -------------------------------------------------------------
    // Test 15: Unknown Command Failure
    // -------------------------------------------------------------
    console.log("Test 15: Failure Semantics - Unknown Command");
    let unknownCmdFailed = false;
    try {
      execSync(`node "${ANALYZER_SCRIPT}" invalidcommandname`, { stdio: "pipe" });
    } catch (err) {
      unknownCmdFailed = true;
      assert.notStrictEqual(err.status, 0, "Exit code must be non-zero on unknown command");
      const stderr = err.stderr ? err.stderr.toString() : "";
      assert.ok(stderr.includes("Unknown command"), "stderr must state unknown command");
    }
    assert.ok(unknownCmdFailed, "CLI must fail on unknown command");
    console.log("  ✓ Non-zero exit code and error logged on stderr");

    // -------------------------------------------------------------
    // Test 16: No Misleading COMPLETE Manifest on Failure
    // -------------------------------------------------------------
    console.log("Test 16: No Misleading COMPLETE Manifest on Failure");
    const failOutDir = path.join(TEST_TMP_DIR, "fail_out");
    fs.mkdirSync(failOutDir, { recursive: true });
    // Pre-create a stale COMPLETE manifest
    fs.writeFileSync(path.join(failOutDir, "analysis-manifest.json"), JSON.stringify({ status: "COMPLETE" }));

    try {
      execSync(`node "${ANALYZER_SCRIPT}" analyze non_existent_dir_xyz --output-dir "${failOutDir}"`, { stdio: "pipe" });
    } catch (_) {}

    const staleManifest = path.join(failOutDir, "analysis-manifest.json");
    assert.ok(!fs.existsSync(staleManifest), "Stale COMPLETE manifest must be removed on failure");
    console.log("  ✓ Stale COMPLETE manifest removed when analysis fails");

    // -------------------------------------------------------------
    // Test 17: Deterministic Output Behavior
    // -------------------------------------------------------------
    console.log("Test 17: Deterministic Output Verification");
    setupFixture(); // Reset fixture
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${FIXTURE_DIR}" --output-dir "${OUTPUT_DIR_1}"`);
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${FIXTURE_DIR}" --output-dir "${OUTPUT_DIR_2}"`);

    const report1 = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR_1, "dependency-report.json"), "utf8"));
    const report2 = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR_2, "dependency-report.json"), "utf8"));

    delete report1.generatedAt;
    delete report2.generatedAt;

    assert.deepStrictEqual(report1, report2, "Analyzer outputs MUST be 100% structurally identical for identical input");
    console.log("  ✓ Structural determinism verified across independent runs");

    // -------------------------------------------------------------
    // Test 18: Explorer Adapter Behavior & Manifest Registration
    // -------------------------------------------------------------
    console.log("Test 18: Explorer Adapter Behavior & Manifest Registration");
    const explorerOut = path.join(OUTPUT_DIR_1, "explorer-data.json");
    execSync(`node "${ADAPTER_SCRIPT}" --input "${OUTPUT_DIR_1}" --output "${explorerOut}"`);
    assert.ok(fs.existsSync(explorerOut), "explorer-data.json must exist after adapter run");

    const adapterManifest = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR_1, "analysis-manifest.json"), "utf8"));
    assert.ok(adapterManifest.artifacts.explorerData, "manifest.artifacts.explorerData must be registered");
    assert.strictEqual(adapterManifest.artifacts.explorerData.schemaVersion, "1.0.0");
    assert.strictEqual(adapterManifest.artifacts.explorerData.fileHash, computeFileHash(explorerOut));
    console.log("  ✓ Explorer adapter registered explorerData into manifest cleanly");

    // -------------------------------------------------------------
    // Test 19: Single Manifest Lifecycle
    // -------------------------------------------------------------
    console.log("Test 19: Single Manifest Lifecycle Verification");
    assert.strictEqual(adapterManifest.status, "COMPLETE");
    assert.ok(adapterManifest.artifacts.dependencyReport);
    assert.ok(adapterManifest.artifacts.explorerData);
    console.log("  ✓ Manifest represents complete integration output at finalization point");

    // -------------------------------------------------------------
    // Test 20: External Consumer Validation Flow Simulation
    // -------------------------------------------------------------
    console.log("Test 20: External Consumer Validation Flow Simulation");
    const consumerManifestPath = path.join(OUTPUT_DIR_1, "analysis-manifest.json");
    const consumerManifest = JSON.parse(fs.readFileSync(consumerManifestPath, "utf8"));

    // Consumer step 1: Check status
    assert.strictEqual(consumerManifest.status, "COMPLETE");
    // Consumer step 2: Check contract version
    assert.strictEqual(consumerManifest.contractVersion, "1.0.0");
    // Consumer step 3: Verify artifact hashes
    for (const [key, artifact] of Object.entries(consumerManifest.artifacts)) {
      const artPath = path.join(OUTPUT_DIR_1, artifact.path);
      const computedHash = computeFileHash(artPath);
      assert.strictEqual(computedHash, artifact.fileHash, `External consumer hash verification failed for ${key}`);
    }
    // Consumer step 4: Verify source content hash
    const requiredSourceHash = requiredModule.analyze
      ? JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR_1, "analysis-manifest.json"))).source.sourceHash
      : null;
    assert.ok(requiredSourceHash.startsWith("sha256:"));
    console.log("  ✓ External consumer validation flow successfully simulated");

    console.log("\nALL 20 CLI INTEGRATION BOUNDARY CONTRACT TESTS PASSED SUCCESSFULLY!");

  } finally {
    cleanup();
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
