#!/usr/bin/env node
/**
 * Test Suite for Salesforce Architecture Explorer Data Adapter
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { exportExplorerData, normalizeNodeId, normalizeNodeType } = require("./export-explorer.cjs");

const FIXTURE_DIR = path.join(__dirname, "../temp-test-fixture");
const ANALYZE_OUT_DIR = path.join(FIXTURE_DIR, "analyze");
const EXPLORER_OUT_FILE = path.join(ANALYZE_OUT_DIR, "explorer-data.json");

function setupFixture() {
  if (fs.existsSync(FIXTURE_DIR)) {
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(FIXTURE_DIR, "classes"), { recursive: true });

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "classes/ServiceA.cls"),
    "public class ServiceA { public static void run() { ServiceB.execute(); Account a = new Account(); } }"
  );
  fs.writeFileSync(
    path.join(FIXTURE_DIR, "classes/ServiceB.cls"),
    "public class ServiceB { public static void execute() { ServiceA.run(); } }"
  );
  fs.writeFileSync(
    path.join(FIXTURE_DIR, "classes/ServiceATest.cls"),
    "@isTest public class ServiceATest { @isTest static void testRun() { ServiceA.run(); } }"
  );
}

function cleanupFixture() {
  if (fs.existsSync(FIXTURE_DIR)) {
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  }
}

function runTests() {
  console.log("Running Explorer Data Adapter Test Suite...");
  console.log("==========================================");

  // 1. Test Node ID & Type normalization
  console.log("Test 1: Node ID and Type normalization");
  assert.strictEqual(normalizeNodeId("ServiceA", "ApexClass"), "ApexClass:ServiceA");
  assert.strictEqual(normalizeNodeId("ApexClass:ServiceA"), "ApexClass:ServiceA");
  assert.strictEqual(normalizeNodeType("ApexClass"), "ApexClass");
  assert.strictEqual(normalizeNodeType(null, "ApexClass:ServiceA"), "ApexClass");
  console.log("  ✓ Helper unit tests passed");

  // 2. Integration Test: Run Analyzer CLI then Adapter CLI
  console.log("\nTest 2: End-to-end analyzer integration & adapter export");
  setupFixture();

  try {
    const analyzerPath = path.join(__dirname, "../dependency-analyzer.cjs");
    const { execSync } = require("child_process");

    execSync(`node "${analyzerPath}" analyze "${FIXTURE_DIR}"`, { stdio: "ignore" });

    // Move default analyze output to test fixture analyze dir if needed
    if (fs.existsSync("analyze") && !fs.existsSync(ANALYZE_OUT_DIR)) {
      fs.renameSync("analyze", ANALYZE_OUT_DIR);
    }

    const reportFile = path.join(ANALYZE_OUT_DIR, "dependency-report.json");
    assert.ok(fs.existsSync(reportFile), "dependency-report.json must exist in fixture");

    const result = exportExplorerData(ANALYZE_OUT_DIR, EXPLORER_OUT_FILE);
    assert.ok(fs.existsSync(EXPLORER_OUT_FILE), "explorer-data.json must be generated");

    const explorerData = result.explorerData;

    // 3. Schema & Version Verification
    console.log("Test 3: Schema & Version contract validation");
    assert.strictEqual(explorerData.schemaVersion, "1.0.0");
    assert.ok(explorerData.analyzerVersion);
    assert.strictEqual(typeof explorerData.generatedAt, "string");

    // 4. Summary Verification
    console.log("Test 4: Summary counts verification");
    assert.strictEqual(explorerData.summary.nodeCount, explorerData.nodes.length);
    assert.strictEqual(explorerData.summary.edgeCount, explorerData.edges.length);
    assert.strictEqual(explorerData.summary.cycleCount, explorerData.cycles.length);
    assert.strictEqual(explorerData.summary.unresolvedCount, explorerData.unresolvedReferences.length);

    // 5. Node Structure Verification
    console.log("Test 5: Node data structure & readiness flags");
    const serviceA = explorerData.nodes.find(n => n.displayName === "ServiceA");
    assert.ok(serviceA, "ServiceA node must exist");
    assert.strictEqual(serviceA.id, "ApexClass:ServiceA");
    assert.strictEqual(serviceA.type, "ApexClass");
    assert.ok(serviceA.metrics);
    assert.ok(serviceA.refactoringReadiness);

    const testNode = explorerData.nodes.find(n => n.displayName === "ServiceATest");
    assert.ok(testNode, "ServiceATest node must exist");
    assert.strictEqual(testNode.behavior.isTest, true);

    // 6. Impact Summaries Verification
    console.log("Test 6: Impact summaries verification");
    const serviceAImpact = explorerData.impactSummaries["ApexClass:ServiceA"];
    assert.ok(serviceAImpact, "ServiceA impact summary must exist");
    assert.ok(serviceAImpact.impactedTests.includes("ApexClass:ServiceATest"), "ServiceATest must be identified as an impacted test");

    // 7. Determinism Test
    console.log("Test 7: Determinism test (identical inputs generate identical JSON)");
    const firstRunJSON = JSON.stringify(explorerData);

    const secondResult = exportExplorerData(ANALYZE_OUT_DIR, EXPLORER_OUT_FILE);
    const secondRunJSON = JSON.stringify(secondResult.explorerData);

    assert.strictEqual(firstRunJSON, secondRunJSON, "Adapter output must be 100% deterministic");
    console.log("  ✓ Determinism verified successfully");

    console.log("\nALL ADAPTER TESTS PASSED SUCCESSFULLY!");
  } finally {
    cleanupFixture();
    if (fs.existsSync("analyze")) {
      fs.rmSync("analyze", { recursive: true, force: true });
    }
  }
}

if (require.main === module) {
  try {
    runTests();
  } catch (err) {
    console.error(`\nTest failure: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

module.exports = { runTests };
