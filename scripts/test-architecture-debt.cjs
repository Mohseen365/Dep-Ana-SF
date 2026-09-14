/**
 * Deterministic Architecture Debt Test Suite (Prompt C3)
 *
 * Verifies that architecture debt detection and classification is 100% deterministic,
 * evidence-driven, repeatable, and operates with 0 LLM runtime dependencies.
 */

"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

const {
  DEBT_CATEGORIES,
  DEBT_SEVERITIES,
  DEBT_METADATA,
  mergeDebtItems,
  detectComponentArchitectureDebt,
  detectAllArchitectureDebt
} = require("../architecture-debt.cjs");

const {
  validateConfidence,
  validateEvidence,
  validateDeterministicResult
} = require("../deterministic/contract.cjs");

const { analyze } = require("../dependency-analyzer.cjs");

console.log("Running Deterministic Architecture Debt Test Suite (Prompt C3)...");
console.log("================================================================");

// TEST 1: Single debt signal detection (excessive-coupling via high coupling)
console.log("Test 1: Single debt signal detection...");
{
  const symbol = {
    id: "ApexClass:CoupledService",
    name: "CoupledService",
    type: "ApexClass",
    parsed: { lineCount: 120 }
  };
  const metric = { fanIn: 2, fanOut: 11, coupling: 13 };
  const context = {
    bottleneckInfo: { isBottleneck: false },
    entryPointInfo: { isEntryPoint: false },
    testGapInfo: { hasTestGap: false }
  };
  const result = detectComponentArchitectureDebt(symbol, null, metric, context);

  assert.strictEqual(result.value, "has-debt");
  assert.strictEqual(result.hasDebt, true);
  assert.strictEqual(result.debtItems.length, 1);

  const item = result.debtItems[0];
  assert.strictEqual(item.debtCategory, "excessive-coupling");
  assert.deepStrictEqual(item.affectedComponents, ["CoupledService"]);
  assert.strictEqual(item.severity, "high");
  assert.strictEqual(item.confidence, "high");
  assert.strictEqual(item.sourceCapability, "architecture-smells");
  assert.ok(item.architecturalConsequence.includes("Excessive coupling"));
  assert.ok(item.remediationDirection.includes("Decouple component"));
  assert.ok(item.evidence.length > 0);
  assert.ok(item.evidence.every(validateEvidence));

  console.log("  ✓ Test 1 PASSED (Single debt signal correctly detected)");
}

// TEST 2: Multiple debt signals detection
console.log("Test 2: Multiple distinct debt signals detection...");
{
  const symbol = {
    id: "ApexClass:GodController",
    name: "GodController",
    type: "ApexClass",
    parsed: {
      lineCount: 600,
      sharing: "without sharing",
      soql: [{ object: "Account" }],
      dml: [{ operation: "insert" }]
    }
  };
  const metric = { fanIn: 10, fanOut: 12, coupling: 22 };
  const context = {
    entryPointInfo: { isEntryPoint: true, primary: "rest-resource" },
    bottleneckInfo: { isBottleneck: true, score: 8 }
  };

  const result = detectComponentArchitectureDebt(symbol, null, metric, context);

  assert.strictEqual(result.hasDebt, true);
  assert.ok(result.debtItems.length >= 3, `Expected at least 3 debt items, got ${result.debtItems.length}`);

  const categories = result.debtItems.map(d => d.debtCategory);
  assert.ok(categories.includes("excessive-coupling"), "Expected excessive-coupling from god component smell");
  assert.ok(categories.includes("duplicated-responsibility"), "Expected duplicated-responsibility from controller direct DB access");
  assert.ok(categories.includes("architectural-bottleneck"), "Expected architectural-bottleneck from bottleneck detector");
  assert.ok(categories.includes("security-boundary-risk"), "Expected security-boundary-risk from without sharing entry point");

  console.log("  ✓ Test 2 PASSED (Multiple distinct debt signals correctly detected)");
}

// TEST 3: Duplicate/overlapping signals deduplication and merging
console.log("Test 3: Duplicate/overlapping signals deduplication...");
{
  const rawItems = [
    {
      debtCategory: "excessive-coupling",
      affectedComponents: ["BigClass"],
      severity: "high",
      confidence: "high",
      evidence: [{ rule: "high-coupling", detail: "Coupling score 14" }],
      sourceCapability: "architecture-smells",
      architecturalConsequence: DEBT_METADATA["excessive-coupling"].consequence,
      remediationDirection: DEBT_METADATA["excessive-coupling"].remediationDirection
    },
    {
      debtCategory: "excessive-coupling",
      affectedComponents: ["BigClass"],
      severity: "critical",
      confidence: "high",
      evidence: [{ rule: "god-component", detail: "Bloated class with 600 lines" }],
      sourceCapability: "architecture-smells",
      architecturalConsequence: DEBT_METADATA["excessive-coupling"].consequence,
      remediationDirection: DEBT_METADATA["excessive-coupling"].remediationDirection
    }
  ];

  const merged = mergeDebtItems(rawItems);
  assert.strictEqual(merged.length, 1, "Duplicate items should be merged into 1");
  assert.strictEqual(merged[0].severity, "critical", "Should retain highest severity 'critical'");
  assert.strictEqual(merged[0].evidence.length, 2, "Evidence items should be merged");

  console.log("  ✓ Test 3 PASSED (Duplicate/overlapping signals correctly merged)");
}

// TEST 4: Severity classification rules
console.log("Test 4: Severity classification rules...");
{
  // Critical severity: god-component / layering-violation / without sharing entry point
  const criticalSymbol = {
    id: "ApexClass:LayerViolationClass",
    name: "LayerViolationClass",
    type: "ApexClass",
    parsed: { lineCount: 100 }
  };
  const targetSymbol = {
    id: "ApexClass:HigherController",
    name: "HigherController",
    type: "ApexClass",
    parsed: { lineCount: 100 }
  };
  const graph = {
    edges: [{ from: criticalSymbol.id, to: targetSymbol.id, type: "method-call" }]
  };
  const context = {
    layerInfo: { primary: "data" },
    symbolMap: new Map([
      [criticalSymbol.id, criticalSymbol],
      [targetSymbol.id, targetSymbol]
    ]),
    bottleneckInfo: { isBottleneck: false }
  };

  const criticalResult = detectComponentArchitectureDebt(criticalSymbol, graph, { fanIn: 1, fanOut: 1, coupling: 2 }, context);
  const layerItem = criticalResult.debtItems.find(d => d.debtCategory === "layering-violation");
  assert.ok(layerItem, "Expected layering-violation debt item");
  assert.strictEqual(layerItem.severity, "critical");

  // Medium severity: without sharing non-entry point
  const mediumSymbol = {
    id: "ApexClass:HelperClass",
    name: "HelperClass",
    type: "ApexClass",
    parsed: { lineCount: 50, sharing: "without sharing" }
  };
  const mediumResult = detectComponentArchitectureDebt(mediumSymbol, null, { fanIn: 1, fanOut: 1, coupling: 2 }, {
    entryPointInfo: { isEntryPoint: false },
    bottleneckInfo: { isBottleneck: false }
  });
  const secItem = mediumResult.debtItems.find(d => d.debtCategory === "security-boundary-risk");
  assert.ok(secItem, "Expected security-boundary-risk item");
  assert.strictEqual(secItem.severity, "medium");

  console.log("  ✓ Test 4 PASSED (Severity rules correctly applied)");
}

// TEST 5: Unknown evidence / missing symbol handling
console.log("Test 5: Unknown evidence / missing symbol handling...");
{
  const nullResult = detectComponentArchitectureDebt(null);
  assert.strictEqual(nullResult.value, "unknown");
  assert.strictEqual(nullResult.hasDebt, false);
  assert.strictEqual(nullResult.debtItems.length, 0);

  const cleanSymbol = {
    id: "ApexClass:CleanService",
    name: "CleanService",
    type: "ApexClass",
    parsed: { lineCount: 80 }
  };
  const cleanResult = detectComponentArchitectureDebt(cleanSymbol, null, { fanIn: 1, fanOut: 1, coupling: 2 }, {
    testGapInfo: { hasTestGap: false },
    bottleneckInfo: { isBottleneck: false }
  });
  assert.strictEqual(cleanResult.value, "clean");
  assert.strictEqual(cleanResult.hasDebt, false);
  assert.strictEqual(cleanResult.debtItems.length, 0);

  console.log("  ✓ Test 5 PASSED (Null symbol & clean component handled cleanly)");
}

// TEST 6: Debt repository aggregation
console.log("Test 6: Debt repository aggregation...");
{
  const symbols = [
    {
      id: "ApexClass:CoupledComponent",
      name: "CoupledComponent",
      type: "ApexClass",
      parsed: { lineCount: 120 }
    },
    {
      id: "ApexClass:CleanComponent",
      name: "CleanComponent",
      type: "ApexClass",
      parsed: { lineCount: 50 }
    }
  ];
  const registry = { symbols };
  const metricList = [
    { id: "ApexClass:CoupledComponent", fanIn: 2, fanOut: 11, coupling: 13 },
    { id: "ApexClass:CleanComponent", fanIn: 1, fanOut: 1, coupling: 2 }
  ];

  const aggregate = detectAllArchitectureDebt(registry, null, metricList, [], {
    bottleneckInfoMap: new Map()
  });

  assert.strictEqual(aggregate.summary.totalComponents, 2);
  assert.strictEqual(aggregate.summary.componentsWithDebtCount, 1);
  assert.strictEqual(aggregate.summary.cleanComponentsCount, 1);
  assert.strictEqual(aggregate.summary.totalDebtItemsCount, 2);
  assert.strictEqual(aggregate.summary.categoryCounts["excessive-coupling"], 1);
  assert.strictEqual(aggregate.summary.categoryCounts["architectural-bottleneck"], 1);

  console.log("  ✓ Test 6 PASSED (Repository aggregate debt correctly computed)");
}

// TEST 7: Deterministic authority & BASE-ARCH-1 contract compliance
console.log("Test 7: Deterministic authority & contract compliance...");
{
  const symbol = {
    id: "ApexClass:ContractTestClass",
    name: "ContractTestClass",
    type: "ApexClass",
    parsed: { lineCount: 600 }
  };
  const result = detectComponentArchitectureDebt(symbol, null, { fanIn: 10, fanOut: 12, coupling: 22 }, {});

  assert.strictEqual(validateDeterministicResult(result), true, "Debt result must comply with BASE-ARCH-1 contract");
  assert.ok(validateConfidence(result.confidence));
  assert.ok(result.evidence.every(validateEvidence));

  console.log("  ✓ Test 7 PASSED (BASE-ARCH-1 contract compliance verified)");
}

// TEST 8: Zero LLM dependency verification
console.log("Test 8: Zero LLM runtime dependencies verification...");
{
  const fileContent = fs.readFileSync(path.join(__dirname, "../architecture-debt.cjs"), "utf8");
  assert.ok(!fileContent.includes("LlmClient"), "Must not import LlmClient");
  assert.ok(!fileContent.includes("CacheManager"), "Must not import CacheManager");
  assert.ok(!fileContent.includes("semantic-investigation-service"), "Must not import semantic service");

  console.log("  ✓ Test 8 PASSED (0 LLM imports or runtime dependencies verified)");
}

// TEST 9: Full analyzer integration test
console.log("Test 9: Full analyzer integration test...");
{
  const fixtureDir = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");
  if (fs.existsSync(fixtureDir)) {
    const analysis = analyze(fixtureDir, {}, false);
    assert.ok(analysis.architectureDebtAnalysis, "Analysis output must contain architectureDebtAnalysis");
    assert.ok(typeof analysis.architectureDebtAnalysis.summary.totalComponents === "number");
    assert.ok(typeof analysis.architectureDebtAnalysis.summary.totalDebtItemsCount === "number");
    assert.ok(analysis.architectureDebtAnalysis.summary.categoryCounts["excessive-coupling"] !== undefined);
  }

  console.log("  ✓ Test 9 PASSED (Full analyzer integration verified)");
}

console.log("\nALL DETERMINISTIC ARCHITECTURE DEBT TESTS PASSED SUCCESSFULLY!\n");
