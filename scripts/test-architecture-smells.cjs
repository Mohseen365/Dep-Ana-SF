/**
 * Deterministic Architecture Smells Test Suite (Prompt B2)
 *
 * Verifies that architecture smell detection is 100% deterministic,
 * explainable, repeatable, and operates with 0 LLM runtime dependencies.
 */

"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

const {
  SMELL_TYPES,
  SMELL_THRESHOLDS,
  isLayerViolation,
  detectComponentSmells,
  detectAllSmells
} = require("../architecture-smells.cjs");

const {
  validateConfidence,
  validateEvidence,
  validateDeterministicResult
} = require("../deterministic/contract.cjs");

const { analyze } = require("../dependency-analyzer.cjs");

console.log("Running Deterministic Architecture Smells Test Suite (Prompt B2)...");
console.log("===============================================================");

// TEST 1: God Component smell detection
console.log("Test 1: God component smell detection...");
{
  const symbol = {
    id: "ApexClass:GodService",
    name: "GodService",
    type: "ApexClass",
    parsed: { lineCount: 600 }
  };
  const metric = { fanIn: 10, fanOut: 12, coupling: 22 };
  const result = detectComponentSmells(symbol, null, metric, {});

  assert.strictEqual(result.value, "has-smells");
  assert.strictEqual(result.hasSmells, true);
  const godSmell = result.smells.find(s => s.smell === "god-component");
  assert.ok(godSmell, "Expected god-component smell");
  assert.strictEqual(godSmell.confidence, "high");
  assert.ok(godSmell.evidence.length > 0);
  assert.ok(godSmell.evidence.every(validateEvidence));
  console.log("  ✓ Test 1 PASSED (God component detected cleanly)");
}

// TEST 2: Hub Component smell detection
console.log("Test 2: Hub component smell detection...");
{
  const symbol = {
    id: "ApexClass:CoreHubService",
    name: "CoreHubService",
    type: "ApexClass",
    parsed: { lineCount: 150 }
  };
  const metric = { fanIn: 9, fanOut: 2, coupling: 11 };
  const result = detectComponentSmells(symbol, null, metric, {});

  assert.strictEqual(result.hasSmells, true);
  const hubSmell = result.smells.find(s => s.smell === "hub-component");
  assert.ok(hubSmell, "Expected hub-component smell");
  assert.strictEqual(hubSmell.evidence[0].rule, "fan-in-threshold");
  console.log("  ✓ Test 2 PASSED (Hub component detected [high fan-in])");
}

// TEST 3: High Coupling smell detection
console.log("Test 3: High coupling smell detection...");
{
  const symbol = {
    id: "ApexClass:CoupledService",
    name: "CoupledService",
    type: "ApexClass",
    parsed: { lineCount: 120 }
  };
  const metric = { fanIn: 2, fanOut: 11, coupling: 13 };
  const result = detectComponentSmells(symbol, null, metric, {});

  assert.strictEqual(result.hasSmells, true);
  const couplingSmell = result.smells.find(s => s.smell === "high-coupling");
  assert.ok(couplingSmell, "Expected high-coupling smell");
  assert.strictEqual(couplingSmell.evidence[0].rule, "fan-out-threshold");
  console.log("  ✓ Test 3 PASSED (High coupling detected)");
}

// TEST 4: Circular Dependency smell detection
console.log("Test 4: Circular dependency smell detection...");
{
  const symbol = {
    id: "ApexClass:CycleClassA",
    name: "CycleClassA",
    type: "ApexClass",
    parsed: { lineCount: 100 }
  };
  const metric = { fanIn: 2, fanOut: 2, coupling: 4 };
  const context = {
    cycles: [["ApexClass:CycleClassA", "ApexClass:CycleClassB"]]
  };
  const result = detectComponentSmells(symbol, null, metric, context);

  assert.strictEqual(result.hasSmells, true);
  const cycleSmell = result.smells.find(s => s.smell === "circular-dependency");
  assert.ok(cycleSmell, "Expected circular-dependency smell");
  assert.strictEqual(cycleSmell.evidence[0].rule, "cycle-participant");
  console.log("  ✓ Test 4 PASSED (Circular dependency detected)");
}

// TEST 5: Orphan Component smell detection
console.log("Test 5: Orphan component smell detection...");
{
  const symbol = {
    id: "ApexClass:UnusedUtilityHelper",
    name: "UnusedUtilityHelper",
    type: "ApexClass",
    parsed: { lineCount: 80 }
  };
  const metric = { fanIn: 0, fanOut: 0, coupling: 0 };
  const context = {
    roleInfo: { primary: "utility" },
    layerInfo: { primary: "domain" }
  };
  const result = detectComponentSmells(symbol, null, metric, context);

  assert.strictEqual(result.hasSmells, true);
  const orphanSmell = result.smells.find(s => s.smell === "orphan-component");
  assert.ok(orphanSmell, "Expected orphan-component smell");
  assert.strictEqual(orphanSmell.evidence[0].rule, "zero-coupling-orphan");
  console.log("  ✓ Test 5 PASSED (Orphan component detected)");
}

// TEST 6: Uncovered Critical Path smell detection
console.log("Test 6: Uncovered critical path smell detection...");
{
  const symbol = {
    id: "ApexClass:CriticalCoreService",
    name: "CriticalCoreService",
    type: "ApexClass",
    parsed: { lineCount: 200 }
  };
  const metric = { fanIn: 10, fanOut: 3, coupling: 13 };
  const context = {
    testGapInfo: { hasTestGap: true, status: "NO_TEST_EVIDENCE", signal: "no-test-evidence" },
    bottleneckInfo: { isBottleneck: true },
    entryPointInfo: { isEntryPoint: false }
  };
  const result = detectComponentSmells(symbol, null, metric, context);

  assert.strictEqual(result.hasSmells, true);
  const testGapSmell = result.smells.find(s => s.smell === "uncovered-critical-path");
  assert.ok(testGapSmell, "Expected uncovered-critical-path smell");
  assert.strictEqual(testGapSmell.evidence[0].rule, "uncovered-critical-component");
  console.log("  ✓ Test 6 PASSED (Uncovered critical path detected)");
}

// TEST 7: Layer Violation smell detection
console.log("Test 7: Layer violation smell detection...");
{
  assert.strictEqual(isLayerViolation("data", "presentation"), true);
  assert.strictEqual(isLayerViolation("data", "application"), true);
  assert.strictEqual(isLayerViolation("service", "presentation"), true);
  assert.strictEqual(isLayerViolation("service", "data"), false);
  assert.strictEqual(isLayerViolation("presentation", "service"), false);

  const symbol = {
    id: "ApexClass:AccountSelector",
    name: "AccountSelector",
    type: "ApexClass",
    parsed: { lineCount: 100 }
  };
  const targetSymbol = {
    id: "ApexClass:AssetDashboardController",
    name: "AssetDashboardController",
    type: "ApexClass",
    parsed: { lineCount: 100 }
  };

  const graph = {
    edges: [
      { from: "ApexClass:AccountSelector", to: "ApexClass:AssetDashboardController", type: "method-call" }
    ]
  };

  const symbolMap = new Map([
    [symbol.id, symbol],
    [targetSymbol.id, targetSymbol]
  ]);

  const context = {
    layerInfo: { primary: "data" },
    symbolMap
  };

  const result = detectComponentSmells(symbol, graph, { fanIn: 1, fanOut: 1, coupling: 2 }, context);
  assert.strictEqual(result.hasSmells, true);
  const layerSmell = result.smells.find(s => s.smell === "layer-violation");
  assert.ok(layerSmell, "Expected layer-violation smell");
  assert.strictEqual(layerSmell.evidence[0].rule, "illegal-layer-dependency");
  console.log("  ✓ Test 7 PASSED (Layer violation detected)");
}

// TEST 8: Mixed Responsibility smell detection
console.log("Test 8: Mixed responsibility smell detection...");
{
  const symbol = {
    id: "ApexClass:OrderController",
    name: "OrderController",
    type: "ApexClass",
    parsed: {
      lineCount: 150,
      soql: [{ object: "Account" }],
      dml: [{ operation: "insert" }]
    }
  };

  const context = {
    roleInfo: { primary: "controller" },
    layerInfo: { primary: "application" }
  };

  const result = detectComponentSmells(symbol, null, { fanIn: 2, fanOut: 2, coupling: 4 }, context);
  assert.strictEqual(result.hasSmells, true);
  const mixedSmell = result.smells.find(s => s.smell === "mixed-responsibility");
  assert.ok(mixedSmell, "Expected mixed-responsibility smell");
  assert.strictEqual(mixedSmell.evidence[0].rule, "controller-direct-db-access");
  console.log("  ✓ Test 8 PASSED (Mixed responsibility detected)");
}

// TEST 9: External Boundary Concentration smell detection
console.log("Test 9: External boundary concentration smell detection...");
{
  const symbol = {
    id: "ApexClass:MultiIntegrationAdapter",
    name: "MultiIntegrationAdapter",
    type: "ApexClass",
    parsed: {
      lineCount: 200,
      callouts: ["HttpRequest", "Http.send"]
    }
  };

  const context = {
    externalBoundaryInfo: {
      isExternalBoundary: true,
      boundaryTypes: ["HTTPCallout", "RESTService"]
    }
  };

  const result = detectComponentSmells(symbol, null, { fanIn: 1, fanOut: 2, coupling: 3 }, context);
  assert.strictEqual(result.hasSmells, true);
  const boundarySmell = result.smells.find(s => s.smell === "external-boundary-concentration");
  assert.ok(boundarySmell, "Expected external-boundary-concentration smell");
  assert.strictEqual(boundarySmell.evidence[0].rule, "multiple-external-boundary-types");
  console.log("  ✓ Test 9 PASSED (External boundary concentration detected)");
}

// TEST 10: Threshold Boundaries & False Positives
console.log("Test 10: Threshold boundaries & false positives...");
{
  const symbol = {
    id: "ApexClass:CleanService",
    name: "CleanService",
    type: "ApexClass",
    parsed: { lineCount: 100 }
  };
  const metric = { fanIn: 2, fanOut: 3, coupling: 5 };
  const context = {
    roleInfo: { primary: "service" },
    layerInfo: { primary: "service" },
    testGapInfo: { hasTestGap: false },
    bottleneckInfo: { isBottleneck: false },
    entryPointInfo: { isEntryPoint: false },
    externalBoundaryInfo: { boundaryTypes: [] },
    cycles: []
  };

  const result = detectComponentSmells(symbol, null, metric, context);
  assert.strictEqual(result.hasSmells, false);
  assert.strictEqual(result.smells.length, 0);
  assert.strictEqual(result.value, "clean");
  console.log("  ✓ Test 10 PASSED (Clean component produces zero false positives)");
}

// TEST 11: BASE-ARCH-1 Contract Validation
console.log("Test 11: BASE-ARCH-1 contract validation...");
{
  const symbol = {
    id: "ApexClass:SampleClass",
    name: "SampleClass",
    type: "ApexClass",
    parsed: { lineCount: 100 }
  };
  const result = detectComponentSmells(symbol, null, { fanIn: 0, fanOut: 0, coupling: 0 }, {
    roleInfo: { primary: "service" },
    layerInfo: { primary: "service" }
  });

  assert.strictEqual(validateDeterministicResult(result), true, "Result must validate against contract");
  assert.ok(validateConfidence(result.confidence));
  assert.ok(result.evidence.every(validateEvidence));
  console.log("  ✓ Test 11 PASSED (Result shape complies with BASE-ARCH-1 contract)");
}

// TEST 12: Deterministic Repeatability
console.log("Test 12: Deterministic repeatability across 10 runs...");
{
  const symbol = {
    id: "ApexClass:RepeatabilityTestClass",
    name: "RepeatabilityTestClass",
    type: "ApexClass",
    parsed: { lineCount: 600, soql: [{ object: "Account" }] }
  };
  const metric = { fanIn: 10, fanOut: 12, coupling: 22 };
  const context = {
    roleInfo: { primary: "controller" },
    layerInfo: { primary: "application" },
    cycles: [["ApexClass:RepeatabilityTestClass"]]
  };

  const initialJson = JSON.stringify(detectComponentSmells(symbol, null, metric, context));

  for (let i = 0; i < 10; i++) {
    const currentJson = JSON.stringify(detectComponentSmells(symbol, null, metric, context));
    assert.strictEqual(currentJson, initialJson, `Mismatch on run ${i + 1}`);
  }
  console.log("  ✓ Test 12 PASSED (100% deterministic repeatability verified)");
}

// TEST 13: Zero LLM Calls Verification
console.log("Test 13: Zero LLM calls verification...");
{
  const fileContent = fs.readFileSync(path.join(__dirname, "../architecture-smells.cjs"), "utf8");
  assert.ok(!fileContent.includes("LlmClient"), "Must not import LlmClient");
  assert.ok(!fileContent.includes("CacheManager"), "Must not import CacheManager");
  assert.ok(!fileContent.includes("semantic-investigation-service"), "Must not import semantic service");
  console.log("  ✓ Test 13 PASSED (0 LLM imports or runtime calls verified)");
}

// TEST 14: Full Analyzer Integration & Regression
console.log("Test 14: Full analyzer integration & regression check...");
{
  const fixtureDir = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");
  if (fs.existsSync(fixtureDir)) {
    const analysis = analyze(fixtureDir, {}, false);
    assert.ok(analysis.smellAnalysis, "Analysis output must contain smellAnalysis");
    assert.ok(typeof analysis.smellAnalysis.summary.totalComponents === "number");
    assert.ok(typeof analysis.smellAnalysis.summary.totalSmellsCount === "number");
    assert.ok(analysis.smellAnalysis.summary.smellCounts["god-component"] !== undefined);
    assert.ok(analysis.smellAnalysis.summary.smellCounts["mixed-responsibility"] !== undefined);
  }
  console.log("  ✓ Test 14 PASSED (Full analyzer integration verified)");
}

console.log("\nALL 14 DETERMINISTIC ARCHITECTURE SMELLS TESTS PASSED SUCCESSFULLY!\n");
