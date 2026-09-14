/**
 * Deterministic Business Criticality Test Suite (B4)
 *
 * Verifies that business criticality signals are strictly deterministic,
 * distinguishing explicit business criticality from structural proxies.
 */

"use strict";

const path = require("path");
const assert = require("assert");
const fs = require("fs");

const {
  classifyComponentBusinessCriticality,
  classifyAllBusinessCriticality
} = require("../business-criticality.cjs");

const { analyze } = require("../dependency-analyzer.cjs");

function runTests() {
  console.log("Running Deterministic Business Criticality Test Suite (B4)...");
  console.log("=============================================================");

  // -------------------------------------------------------------
  // Test 1: Explicit business metadata / annotation -> high business criticality
  // -------------------------------------------------------------
  console.log("Test 1: Explicit business metadata & annotation...");
  const explicitSymbol = {
    id: "ApexClass:OrderProcessingService",
    name: "OrderProcessingService",
    type: "ApexClass",
    parsed: {
      annotations: ["RestResource", "BusinessCritical"],
      businessMetadata: { criticality: "critical" },
      methods: [{ name: "processOrder" }]
    }
  };
  const result1 = classifyComponentBusinessCriticality(explicitSymbol);
  assert.strictEqual(result1.businessCriticality, "high");
  assert.strictEqual(result1.confidence, "high");
  assert.ok(result1.explicitBusinessEvidence.length > 0);
  assert.strictEqual(result1.explicitBusinessEvidence[0].rule, "explicit-business-metadata");
  console.log("  ✓ Test 1 PASSED (Explicit business metadata correctly identified as business criticality 'high')");

  // -------------------------------------------------------------
  // Test 2: Unknown business criticality when no explicit business metadata exists (even with high structural importance)
  // -------------------------------------------------------------
  console.log("Test 2: Unknown business criticality on component without explicit business evidence...");
  const structuralSymbol = {
    id: "ApexClass:CoreUtility",
    name: "CoreUtility",
    type: "ApexClass",
    parsed: {
      objects: ["Account", "Contact", "Opportunity", "Order"],
      soql: [{ object: "Account" }],
      methods: [{ name: "execute" }]
    }
  };
  const metricHighFanIn = { fanIn: 15, fanOut: 2, coupling: 17 };
  const entryPointInfo = { isEntryPoint: true, primary: "REST" };
  const externalBoundaryInfo = { hasExternalBoundary: true, value: "HTTPCallout" };

  const result2 = classifyComponentBusinessCriticality(
    structuralSymbol,
    null,
    metricHighFanIn,
    null,
    null,
    entryPointInfo,
    externalBoundaryInfo
  );

  assert.strictEqual(result2.businessCriticality, "unknown");
  assert.strictEqual(result2.confidence, "unknown");
  assert.strictEqual(result2.structuralCriticality.level, "high");
  assert.ok(result2.structuralCriticality.signals.length >= 4);
  console.log("  ✓ Test 2 PASSED (High structural importance correctly separated from business criticality 'unknown')");

  // -------------------------------------------------------------
  // Test 3: Structural proxy signals (External dependency, entry-point, broad data impact)
  // -------------------------------------------------------------
  console.log("Test 3: Structural proxy signals classification...");
  const proxySymbol = {
    id: "Trigger:AccountTrigger",
    name: "AccountTrigger",
    type: "Trigger",
    parsed: {
      objects: ["Account", "Case", "Task", "Order", "Asset"],
      callouts: ["HttpRequest"]
    }
  };
  const result3 = classifyComponentBusinessCriticality(proxySymbol);
  assert.strictEqual(result3.businessCriticality, "unknown");
  assert.strictEqual(result3.structuralCriticality.level, "high");
  assert.ok(result3.structuralCriticality.signals.some(s => s.includes("entry-point")));
  assert.ok(result3.structuralCriticality.signals.some(s => s.includes("external integration")));
  assert.ok(result3.structuralCriticality.signals.some(s => s.includes("broad data impact")));
  console.log("  ✓ Test 3 PASSED (Structural proxies detected: entry-point, external integration, broad data impact)");

  // -------------------------------------------------------------
  // Test 4: Conflicting signals handling
  // -------------------------------------------------------------
  console.log("Test 4: Conflicting signals handling...");
  const conflictingSymbol = {
    id: "ApexClass:LegacyHelper",
    name: "LegacyHelper",
    type: "ApexClass",
    parsed: {
      annotations: ["isTest"],
      businessMetadata: { level: "low" }
    }
  };
  const result4 = classifyComponentBusinessCriticality(conflictingSymbol);
  assert.strictEqual(result4.businessCriticality, "low");
  assert.ok(result4.explicitBusinessEvidence.length > 0);
  console.log("  ✓ Test 4 PASSED (Conflicting signals handled cleanly without throwing errors)");

  // -------------------------------------------------------------
  // Test 5: Explainability & evidence contract
  // -------------------------------------------------------------
  console.log("Test 5: Evidence contract compliance...");
  assert.ok(Array.isArray(result2.evidence));
  assert.ok(result2.evidence.length >= 2);
  assert.ok(result2.evidence.every(e => typeof e.rule === "string" && e.rule.length > 0 && typeof e.detail === "string"));
  console.log("  ✓ Test 5 PASSED (Evidence contract satisfied)");

  // -------------------------------------------------------------
  // Test 6: Deterministic repeatability
  // -------------------------------------------------------------
  console.log("Test 6: Deterministic repeatability across 10 runs...");
  const run1 = JSON.stringify(classifyComponentBusinessCriticality(explicitSymbol));
  for (let i = 0; i < 10; i++) {
    const runN = JSON.stringify(classifyComponentBusinessCriticality(explicitSymbol));
    assert.strictEqual(runN, run1);
  }
  console.log("  ✓ Test 6 PASSED (100% deterministic repeatability verified)");

  // -------------------------------------------------------------
  // Test 7: Zero LLM calls verification
  // -------------------------------------------------------------
  console.log("Test 7: Zero LLM calls verification...");
  const moduleContent = fs.readFileSync(
    path.join(__dirname, "../business-criticality.cjs"),
    "utf8"
  );
  assert.strictEqual(moduleContent.includes("LlmClient"), false);
  assert.strictEqual(moduleContent.includes("refactor-litellm"), false);
  assert.strictEqual(moduleContent.includes("CacheManager"), false);
  console.log("  ✓ Test 7 PASSED (0 LLM imports or runtime calls)");

  // -------------------------------------------------------------
  // Test 8: Full analyzer integration & regression
  // -------------------------------------------------------------
  console.log("Test 8: Full analyzer integration & regression check...");
  const fixtureDir = path.resolve(
    __dirname,
    "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default"
  );
  if (fs.existsSync(fixtureDir)) {
    const analysis = analyze(fixtureDir, { quiet: true }, false);
    assert.ok(analysis.registry);
    assert.ok(analysis.graph);

    const allCrit = classifyAllBusinessCriticality(
      analysis.registry,
      analysis.graph,
      analysis.metricList
    );

    assert.ok(allCrit.summary);
    assert.strictEqual(allCrit.summary.totalComponents, analysis.registry.symbols.length);
    assert.ok(typeof allCrit.summary.unknownBusinessCriticalityCount === "number");
    console.log("  ✓ Test 8 PASSED (Full analyzer integration verified)");
  } else {
    console.log("  ~ Test 8 SKIPPED (Fixture directory not found)");
  }

  console.log("\nALL DETERMINISTIC BUSINESS CRITICALITY TESTS PASSED SUCCESSFULLY!\n");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
