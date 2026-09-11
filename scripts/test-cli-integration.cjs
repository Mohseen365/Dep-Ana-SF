#!/usr/bin/env node
/**
 * CLI Integration Boundary Test Suite for dependency-analyzer
 *
 * Tests:
 *  1. CLI success
 *  2. CLI failure (unknown command, missing source directory)
 *  3. Windows-style paths (backslashes)
 *  4. Custom output directory handling (--output-dir / --output)
 *  5. Artifact generation
 *  6. Manifest generation and SHA-256 hash integrity
 *  7. Explorer data adapter manifest registration
 *  8. Stale/source hash detection
 *  9. Deterministic output behavior
 * 10. Module require safety (if require.main === module)
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const crypto = require("crypto");
const { execSync, execFileSync } = require("child_process");

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
  console.log("Running CLI Integration Boundary Test Suite...");
  console.log("=============================================");

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
    // Test 2: CLI Success with --output-dir
    // -------------------------------------------------------------
    console.log("Test 2: CLI Success (analyze with custom --output-dir)");
    const stdout = execSync(
      `node "${ANALYZER_SCRIPT}" analyze "${FIXTURE_DIR}" --output-dir "${OUTPUT_DIR_1}"`,
      { encoding: "utf8" }
    );
    assert.ok(stdout.includes("Analysis complete"), "Output should indicate completion");
    assert.ok(fs.existsSync(OUTPUT_DIR_1), "Output directory must exist");
    console.log("  ✓ CLI executed successfully and generated output directory");

    // -------------------------------------------------------------
    // Test 3: Artifact Generation
    // -------------------------------------------------------------
    console.log("Test 3: Artifact Generation Verification");
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
    console.log(`  ✓ Verified presence of all ${requiredArtifacts.length} required artifacts`);

    // -------------------------------------------------------------
    // Test 4: Manifest Schema & Provenance Validation
    // -------------------------------------------------------------
    console.log("Test 4: Manifest Schema & SHA-256 Hash Validation");
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

    // Check artifact SHA-256 file hashes in manifest
    assert.ok(manifest.artifacts.dependencyReport, "manifest.artifacts.dependencyReport must exist");
    for (const [key, artifact] of Object.entries(manifest.artifacts)) {
      const artPath = path.join(OUTPUT_DIR_1, artifact.path);
      assert.ok(fs.existsSync(artPath), `Manifest artifact path '${artifact.path}' must exist on disk`);
      const actualHash = computeFileHash(artPath);
      assert.strictEqual(
        artifact.fileHash,
        actualHash,
        `File hash mismatch for artifact key '${key}' (${artifact.path})`
      );
    }
    console.log("  ✓ Manifest schema and SHA-256 hashes successfully verified");

    // -------------------------------------------------------------
    // Test 5: Explorer Adapter Manifest Integration
    // -------------------------------------------------------------
    console.log("Test 5: Explorer Adapter Manifest Integration");
    const explorerOut = path.join(OUTPUT_DIR_1, "explorer-data.json");
    execSync(`node "${ADAPTER_SCRIPT}" --input "${OUTPUT_DIR_1}" --output "${explorerOut}"`);
    assert.ok(fs.existsSync(explorerOut), "explorer-data.json must exist after adapter run");

    // Re-read manifest to verify explorerData registration
    const updatedManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.ok(updatedManifest.artifacts.explorerData, "manifest.artifacts.explorerData must be registered");
    assert.strictEqual(updatedManifest.artifacts.explorerData.schemaVersion, "1.0.0");
    assert.strictEqual(
      updatedManifest.artifacts.explorerData.fileHash,
      computeFileHash(explorerOut)
    );
    assert.ok(updatedManifest.artifacts.explorerData.nodeCount > 0, "nodeCount must be > 0");
    console.log("  ✓ Explorer adapter registered explorerData into manifest with valid SHA-256");

    // -------------------------------------------------------------
    // Test 6: CLI Failure on Missing Source Directory
    // -------------------------------------------------------------
    console.log("Test 6: CLI Failure on Missing Source Directory");
    let missingFailed = false;
    try {
      execSync(`node "${ANALYZER_SCRIPT}" analyze non_existent_dir_xyz_123`, {
        stdio: "pipe"
      });
    } catch (err) {
      missingFailed = true;
      assert.notStrictEqual(err.status, 0, "Exit code must be non-zero on failure");
      const stderr = err.stderr ? err.stderr.toString() : "";
      assert.ok(stderr.includes("Source directory does not exist"), "stderr must state source missing error");
    }
    assert.ok(missingFailed, "CLI must fail when source directory does not exist");
    console.log("  ✓ Correct non-zero exit code and stderr on missing source directory");

    // -------------------------------------------------------------
    // Test 7: CLI Failure on Unknown Command
    // -------------------------------------------------------------
    console.log("Test 7: CLI Failure on Unknown Command");
    let unknownCmdFailed = false;
    try {
      execSync(`node "${ANALYZER_SCRIPT}" invalidcommandname`, {
        stdio: "pipe"
      });
    } catch (err) {
      unknownCmdFailed = true;
      assert.notStrictEqual(err.status, 0, "Exit code must be non-zero on unknown command");
      const stderr = err.stderr ? err.stderr.toString() : "";
      assert.ok(stderr.includes("Unknown command"), "stderr must state unknown command");
    }
    assert.ok(unknownCmdFailed, "CLI must fail on unknown command");
    console.log("  ✓ Correct non-zero exit code and stderr on unknown command");

    // -------------------------------------------------------------
    // Test 8: Windows-style Backslash Path Handling
    // -------------------------------------------------------------
    console.log("Test 8: Windows-style Backslash Path Handling");
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
    // Test 9: Deterministic Output Behavior
    // -------------------------------------------------------------
    console.log("Test 9: Deterministic Output Verification");
    execSync(`node "${ANALYZER_SCRIPT}" analyze "${FIXTURE_DIR}" --output-dir "${OUTPUT_DIR_2}"`);

    const report1 = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR_1, "dependency-report.json"), "utf8"));
    const report2 = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR_2, "dependency-report.json"), "utf8"));

    // Exclude timestamp comparison
    delete report1.generatedAt;
    delete report2.generatedAt;

    assert.deepStrictEqual(report1, report2, "Analyzer outputs MUST be 100% structurally identical for identical input");
    console.log("  ✓ Structural determinism verified across independent runs");

    // -------------------------------------------------------------
    // Test 10: Stale Data Detection Simulation
    // -------------------------------------------------------------
    console.log("Test 10: Stale Data Detection Logic");
    const initialSourceHash = manifest.source.sourceHash;

    // Mutate a source file
    fs.appendFileSync(path.join(FIXTURE_DIR, "classes/SampleService.cls"), "\n// Modified\n");

    const { getAnalysis } = require(ANALYZER_SCRIPT);
    const rechecked = getAnalysis(FIXTURE_DIR, { quiet: true, useSnapshot: true });
    assert.strictEqual(rechecked.fromSnapshot, undefined, "Cached snapshot must be invalidated when source changes");
    console.log("  ✓ Stale data successfully detected when source files change");

    console.log("\nALL 10 CLI INTEGRATION BOUNDARY TESTS PASSED SUCCESSFULLY!");

  } finally {
    cleanup();
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
