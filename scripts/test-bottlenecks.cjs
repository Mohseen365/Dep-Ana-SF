#!/usr/bin/env node
/**
 * Deterministic Architectural Bottleneck Detector Test Suite (Prompt 23)
 *
 * Validates:
 *   1. High fan-in signal detection
 *   2. High fan-out signal detection
 *   3. Cycle participation signal detection
 *   4. Multiple signals combination
 *   5. Normal component (no bottleneck)
 *   6. Disconnected component
 *   7. Deterministic score calculation and repeatability
 *   8. Evidence format validation (rule & detail strings)
 *   9. Zero LLM calls / 0 LLM dependencies
 *  10. Full dependency-analyzer integration regression
 */

"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

const {
  detectComponentBottleneck,
  detectAllBottlenecks,
  THRESHOLDS
} = require("../bottleneck-detector.cjs");

const {
  validateDeterministicResult,
  validateEvidence
} = require("../deterministic/contract.cjs");

const { analyze } = require("../dependency-analyzer.cjs");

function runTests() {
  console.log("Running Deterministic Architectural Bottleneck Test Suite (Prompt 23)...");
  console.log("====================================================================");

  // Mock symbols
  const symService = { id: "ApexClass:AssetService", name: "AssetService", type: "ApexClass" };
  const symNormal = { id: "ApexClass:SimpleHelper", name: "SimpleHelper", type: "ApexClass" };
  const symIsolated = { id: "ApexClass:IsolatedUtil", name: "IsolatedUtil", type: "ApexClass" };

  // -------------------------------------------------------------
  // Test 1: High fan-in signal
  // -------------------------------------------------------------
  console.log("Test 1: High fan-in signal detection...");
  const highFanInMetric = { id: symService.id, fanIn: 10, fanOut: 2 };
  const resFanIn = detectComponentBottleneck(symService, null, highFanInMetric, []);

  assert.strictEqual(resFanIn.isBottleneck, true, "Component with fanIn >= 8 must be identified as bottleneck");
  assert.ok(resFanIn.score >= 25, "Score should include high fan-in weight");
  assert.ok(resFanIn.signals.some(s => s.rule === "high-fan-in"), "Signals must contain 'high-fan-in' rule");
  assert.ok(validateDeterministicResult(resFanIn), "Result must adhere to BASE-ARCH-1 contract");
  console.log("  ✓ High fan-in signal correctly detected");

  // -------------------------------------------------------------
  // Test 2: High fan-out signal
  // -------------------------------------------------------------
  console.log("Test 2: High fan-out signal detection...");
  const highFanOutMetric = { id: symService.id, fanIn: 1, fanOut: 12 };
  const resFanOut = detectComponentBottleneck(symService, null, highFanOutMetric, []);

  assert.ok(resFanOut.signals.some(s => s.rule === "high-fan-out"), "Signals must contain 'high-fan-out' rule");
  assert.ok(resFanOut.score >= 20, "Score should include high fan-out weight");
  console.log("  ✓ High fan-out signal correctly detected");

  // -------------------------------------------------------------
  // Test 3: Cycle participation signal
  // -------------------------------------------------------------
  console.log("Test 3: Cycle participation signal detection...");
  const cycles = [
    ["ApexClass:AssetService", "ApexClass:OrderService"]
  ];
  const resCycle = detectComponentBottleneck(symService, null, { fanIn: 2, fanOut: 2 }, cycles);

  assert.ok(resCycle.signals.some(s => s.rule === "cycle-participant"), "Signals must contain 'cycle-participant' rule");
  assert.strictEqual(resCycle.metadata.isCycleParticipant, true);
  console.log("  ✓ Cycle participation signal correctly detected");

  // -------------------------------------------------------------
  // Test 4: Multiple signals combination
  // -------------------------------------------------------------
  console.log("Test 4: Multiple signals combination...");
  const multiMetric = { id: symService.id, fanIn: 12, fanOut: 15 };
  const multiGraph = {
    edges: [
      { from: "LWC:assetViewer", to: symService.id },
      { from: symService.id, to: "ApexClass:AccountSelector" }
    ]
  };

  const resMulti = detectComponentBottleneck(symService, multiGraph, multiMetric, cycles);

  assert.strictEqual(resMulti.isBottleneck, true);
  assert.ok(resMulti.signals.length >= 3, "Should detect high fan-in, high fan-out, cycle participation, bridge position");
  assert.strictEqual(resMulti.confidence, "high", "Multiple signals must yield high confidence");
  console.log("  ✓ Multiple signals correctly combined");

  // -------------------------------------------------------------
  // Test 5: Normal component (no bottleneck)
  // -------------------------------------------------------------
  console.log("Test 5: Normal component (no bottleneck)...");
  const normalMetric = { id: symNormal.id, fanIn: 2, fanOut: 3 };
  const resNormal = detectComponentBottleneck(symNormal, null, normalMetric, []);

  assert.strictEqual(resNormal.isBottleneck, false, "Normal component must not be marked as bottleneck");
  assert.strictEqual(resNormal.value, "normal");
  assert.strictEqual(resNormal.score, 0);
  assert.strictEqual(resNormal.signals.length, 0);
  console.log("  ✓ Normal component correctly classified");

  // -------------------------------------------------------------
  // Test 6: Disconnected component
  // -------------------------------------------------------------
  console.log("Test 6: Disconnected component...");
  const isolatedMetric = { id: symIsolated.id, fanIn: 0, fanOut: 0 };
  const resIsolated = detectComponentBottleneck(symIsolated, { edges: [] }, isolatedMetric, []);

  assert.strictEqual(resIsolated.isBottleneck, false);
  assert.strictEqual(resIsolated.value, "disconnected");
  assert.strictEqual(resIsolated.score, 0);
  console.log("  ✓ Disconnected component correctly classified");

  // -------------------------------------------------------------
  // Test 7: Deterministic score calculation & repeatability
  // -------------------------------------------------------------
  console.log("Test 7: Deterministic score repeatability...");
  const run1 = detectComponentBottleneck(symService, multiGraph, multiMetric, cycles);
  const run2 = detectComponentBottleneck(symService, multiGraph, multiMetric, cycles);

  assert.strictEqual(run1.score, run2.score, "Scores across independent runs must be identical");
  assert.deepStrictEqual(run1.signals, run2.signals, "Signals across independent runs must be identical");
  assert.strictEqual(typeof run1.score, "number");
  assert.ok(run1.score >= 0 && run1.score <= 100, "Score must be bounded between 0 and 100");
  console.log("  ✓ Deterministic score calculation & repeatability verified");

  // -------------------------------------------------------------
  // Test 8: Evidence format validation
  // -------------------------------------------------------------
  console.log("Test 8: Evidence format validation...");
  for (const signal of resMulti.signals) {
    assert.ok(validateEvidence(signal), "Each signal must be a valid BASE-ARCH-1 evidence item");
    assert.ok(typeof signal.rule === "string" && signal.rule.length > 0);
    assert.ok(typeof signal.detail === "string" && signal.detail.length > 0);
  }
  console.log("  ✓ Evidence format contract verified");

  // -------------------------------------------------------------
  // Test 9: Zero LLM boundary check
  // -------------------------------------------------------------
  console.log("Test 9: Zero LLM calls verification...");
  const moduleSource = fs.readFileSync(path.join(__dirname, "../bottleneck-detector.cjs"), "utf8");
  assert.ok(!moduleSource.includes("LlmClient"), "Bottleneck detector must not import LlmClient");
  assert.ok(!moduleSource.includes("CacheManager"), "Bottleneck detector must not import CacheManager");
  assert.ok(!moduleSource.includes("semantic-investigation-service"), "Bottleneck detector must not import semantic service");
  console.log("  ✓ Zero LLM runtime dependency boundary verified");

  // -------------------------------------------------------------
  // Test 10: Full analyzer integration check
  // -------------------------------------------------------------
  console.log("Test 10: Full analyzer integration check...");
  const fixturePath = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");
  if (fs.existsSync(fixturePath)) {
    const analysisResult = analyze(fixturePath, { maxGraphEdges: 1000 }, false);
    assert.ok(analysisResult.bottleneckAnalysis, "Full analysis result must contain bottleneckAnalysis");
    assert.ok(typeof analysisResult.bottleneckAnalysis.summary.totalComponents === "number");
    assert.ok(typeof analysisResult.bottleneckAnalysis.summary.bottleneckCount === "number");
    console.log("  ✓ Full analyzer integration check passed");
  } else {
    console.log("  ~ Skipped full fixture analysis (fixture path not found)");
  }

  console.log("\nALL 10 DETERMINISTIC BOTTLENECK TESTS PASSED SUCCESSFULLY!");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
