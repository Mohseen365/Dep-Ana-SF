#!/usr/bin/env node

/**
 * Deterministic Architecture Health Test Suite (WAVE-C5)
 *
 * Covers 10 required test scenarios:
 *  1. Healthy repository/component
 *  2. Degraded architecture
 *  3. High-risk architecture
 *  4. Conflicting dimensions
 *  5. Missing evidence
 *  6. Unknown state
 *  7. Business-critical component (verifying distinction from structural health)
 *  8. Deterministic authority (BASE-ARCH contract validation)
 *  9. Stable repeated output (100% repeatability)
 * 10. Zero LLM calls verification
 */

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");
const {
  evaluateArchitectureHealth,
  evaluateComponentArchitectureHealth,
  HEALTH_LEVELS
} = require(path.join(ROOT_DIR, "architecture-health.cjs"));

const { validateDeterministicResult } = require(path.join(ROOT_DIR, "deterministic", "contract.cjs"));

function runHealthTests() {
  console.log("Running Deterministic Architecture Health Test Suite (WAVE-C5)...");
  console.log("===============================================================");

  // -------------------------------------------------------------
  // Test 1: Healthy repository / component
  // -------------------------------------------------------------
  console.log("Test 1: Healthy repository / component...");
  const cleanSymbol = {
    id: "ApexClass:CleanService",
    type: "ApexClass",
    name: "CleanService",
    parsed: {
      name: "CleanService",
      type: "ApexClass",
      sharing: "with sharing",
      isTest: false,
      methods: [{ name: "doWork", visibility: "public", returnType: "void" }],
      dependencies: []
    }
  };

  const cleanMetric = { id: "ApexClass:CleanService", fanIn: 1, fanOut: 1, coupling: 2 };
  const healthyResult = evaluateComponentArchitectureHealth(cleanSymbol, null, cleanMetric, {
    role: { primary: "service", confidence: "high" },
    layer: { primary: "service", confidence: "high" },
    testGap: { signal: "covered", hasTestGap: false },
    securityBoundaries: { primary: "with sharing", confidence: "high", metadata: { sharingModel: "with sharing" } },
    smells: { smells: [] },
    businessCriticality: { businessCriticality: "low" }
  });

  assert.strictEqual(healthyResult.overallHealth, "HEALTHY");
  assert.strictEqual(healthyResult.confidence, "high");
  assert.ok(healthyResult.strongestPositiveSignals.length > 0);
  assert.strictEqual(healthyResult.strongestNegativeSignals.length, 0);
  console.log("  ✓ Test 1 PASSED (Clean component evaluated as HEALTHY)");

  // -------------------------------------------------------------
  // Test 2: Degraded architecture
  // -------------------------------------------------------------
  console.log("Test 2: Degraded architecture...");
  const degradedSymbol = {
    id: "ApexClass:DegradedController",
    type: "ApexClass",
    name: "DegradedController",
    parsed: {
      name: "DegradedController",
      type: "ApexClass",
      sharing: "without sharing",
      isTest: false,
      methods: [],
      soql: [{ object: "Account" }],
      dml: [{ operation: "insert", variable: "acc" }]
    }
  };

  const degradedMetric = { id: "ApexClass:DegradedController", fanIn: 5, fanOut: 5, coupling: 10 };
  const degradedResult = evaluateComponentArchitectureHealth(degradedSymbol, null, degradedMetric, {
    role: { primary: "controller", confidence: "high" },
    layer: { primary: "presentation", confidence: "high" },
    testGap: { signal: "no-test-evidence", hasTestGap: true },
    securityBoundaries: { primary: "without sharing", confidence: "high", metadata: { sharingModel: "without sharing" } },
    smells: {
      smells: [
        { smell: "mixed-responsibility" },
        { smell: "high-coupling" }
      ]
    }
  });

  assert.strictEqual(degradedResult.overallHealth, "DEGRADED");
  assert.ok(degradedResult.strongestNegativeSignals.length > 0);
  assert.strictEqual(degradedResult.dimensions.architecturalDebt.classification, "DEGRADED");
  assert.strictEqual(degradedResult.dimensions.testProtection.classification, "DEGRADED");
  console.log("  ✓ Test 2 PASSED (Degraded component evaluated as DEGRADED)");

  // -------------------------------------------------------------
  // Test 3: High-risk architecture
  // -------------------------------------------------------------
  console.log("Test 3: High-risk architecture...");
  const highRiskSymbol = {
    id: "ApexClass:GodManager",
    type: "ApexClass",
    name: "GodManager",
    parsed: { name: "GodManager", type: "ApexClass", lines: 800 }
  };

  const highRiskMetric = { id: "ApexClass:GodManager", fanIn: 15, fanOut: 15, coupling: 30 };
  const highRiskResult = evaluateComponentArchitectureHealth(highRiskSymbol, null, highRiskMetric, {
    role: { primary: "service", confidence: "high" },
    layer: { primary: "service", confidence: "high" },
    bottleneck: { isBottleneck: true, score: 9 },
    testGap: { signal: "no-test-evidence", hasTestGap: true },
    cycles: [["ApexClass:GodManager", "ApexClass:OtherClass"]],
    smells: {
      smells: [
        { smell: "god-component" },
        { smell: "circular-dependency" },
        { smell: "uncovered-critical-path" }
      ]
    }
  });

  assert.strictEqual(highRiskResult.overallHealth, "HIGH_RISK");
  assert.strictEqual(highRiskResult.dimensions.structuralCoupling.classification, "HIGH_RISK");
  assert.strictEqual(highRiskResult.dimensions.dependencyComplexity.classification, "HIGH_RISK");
  assert.strictEqual(highRiskResult.dimensions.architecturalDebt.classification, "HIGH_RISK");
  assert.strictEqual(highRiskResult.dimensions.concentrationBottlenecks.classification, "HIGH_RISK");
  console.log("  ✓ Test 3 PASSED (Severe issues produce HIGH_RISK classification)");

  // -------------------------------------------------------------
  // Test 4: Conflicting dimensions
  // -------------------------------------------------------------
  console.log("Test 4: Conflicting dimensions...");
  const conflictResult = evaluateComponentArchitectureHealth(highRiskSymbol, null, highRiskMetric, {
    role: { primary: "service", confidence: "high" },
    layer: { primary: "service", confidence: "high" },
    testGap: { signal: "covered", hasTestGap: false }, // Excellent test protection!
    securityBoundaries: { primary: "with sharing", confidence: "high", metadata: { sharingModel: "with sharing" } },
    cycles: [["ApexClass:GodManager", "ApexClass:OtherClass"]], // Severe circular dependency!
    smells: {
      smells: [{ smell: "circular-dependency" }]
    }
  });

  // Check that testProtection is HEALTHY while dependencyComplexity is HIGH_RISK
  assert.strictEqual(conflictResult.dimensions.testProtection.classification, "HEALTHY");
  assert.strictEqual(conflictResult.dimensions.dependencyComplexity.classification, "HIGH_RISK");
  assert.ok(conflictResult.strongestPositiveSignals.some(s => s.includes("test protection")));
  assert.ok(conflictResult.strongestNegativeSignals.some(s => s.includes("circular dependency")));
  assert.strictEqual(conflictResult.overallHealth, "HIGH_RISK");
  console.log("  ✓ Test 4 PASSED (Dimension conflicts preserved and traceable without hiding evidence)");

  // -------------------------------------------------------------
  // Test 5: Missing evidence
  // -------------------------------------------------------------
  console.log("Test 5: Missing evidence handling...");
  const missingEvidenceResult = evaluateComponentArchitectureHealth(cleanSymbol, null, null, {
    // Only role provided; testGap, security, changeSim missing
    role: { primary: "service", confidence: "high" }
  });

  assert.strictEqual(missingEvidenceResult.dimensions.testProtection.classification, "UNKNOWN");
  assert.strictEqual(missingEvidenceResult.dimensions.securityRisk.classification, "UNKNOWN");
  assert.ok(missingEvidenceResult.unknownIncompleteAreas.length > 0);
  assert.notStrictEqual(missingEvidenceResult.confidence, "high");
  console.log("  ✓ Test 5 PASSED (Missing signals set affected dimensions to UNKNOWN and lower confidence)");

  // -------------------------------------------------------------
  // Test 6: Unknown state (null/empty input)
  // -------------------------------------------------------------
  console.log("Test 6: Unknown state (null/empty input)...");
  const unknownCompResult = evaluateComponentArchitectureHealth(null);
  assert.strictEqual(unknownCompResult.overallHealth, "UNKNOWN");
  assert.strictEqual(unknownCompResult.confidence, "unknown");

  const unknownRepoResult = evaluateArchitectureHealth({ symbols: [] }, { nodes: [], edges: [] }, []);
  assert.strictEqual(unknownRepoResult.overallHealth, "UNKNOWN");
  assert.strictEqual(unknownRepoResult.confidence, "unknown");
  assert.ok(unknownRepoResult.unknownIncompleteAreas.length > 0);
  console.log("  ✓ Test 6 PASSED (Null/empty inputs cleanly evaluate as UNKNOWN)");

  // -------------------------------------------------------------
  // Test 7: Business-critical component
  // -------------------------------------------------------------
  console.log("Test 7: Business-critical component distinction...");
  const bcSymbol = {
    id: "ApexClass:PaymentProcessor",
    type: "ApexClass",
    name: "PaymentProcessor",
    parsed: { name: "PaymentProcessor", type: "ApexClass", isBusinessCritical: true }
  };

  const bcMetric = { id: "ApexClass:PaymentProcessor", fanIn: 1, fanOut: 1, coupling: 2 };
  const bcResult = evaluateComponentArchitectureHealth(bcSymbol, null, bcMetric, {
    role: { primary: "service", confidence: "high" },
    layer: { primary: "service", confidence: "high" },
    testGap: { signal: "covered", hasTestGap: false },
    securityBoundaries: { primary: "with sharing", confidence: "high", metadata: { sharingModel: "with sharing" } },
    businessCriticality: { businessCriticality: "high", structuralCriticality: { level: "high" } }
  });

  assert.strictEqual(bcResult.overallHealth, "HEALTHY"); // Structural health remains HEALTHY
  assert.strictEqual(bcResult.businessCriticality, "high"); // Business criticality is high
  console.log("  ✓ Test 7 PASSED (Business criticality remains strictly distinct from structural health)");

  // -------------------------------------------------------------
  // Test 8: Deterministic authority & contract compliance
  // -------------------------------------------------------------
  console.log("Test 8: BASE-ARCH contract compliance...");
  assert.ok(validateDeterministicResult(healthyResult), "healthyResult must comply with contract");
  assert.ok(validateDeterministicResult(degradedResult), "degradedResult must comply with contract");
  assert.ok(validateDeterministicResult(highRiskResult), "highRiskResult must comply with contract");
  assert.ok(validateDeterministicResult(unknownCompResult), "unknownCompResult must comply with contract");
  assert.ok(validateDeterministicResult(unknownRepoResult), "unknownRepoResult must comply with contract");
  console.log("  ✓ Test 8 PASSED (Results fully comply with BASE-ARCH-1 contract)");

  // -------------------------------------------------------------
  // Test 9: Stable repeated output (100% repeatability)
  // -------------------------------------------------------------
  console.log("Test 9: Stable repeated output (100% repeatability)...");
  const firstRun = JSON.stringify(evaluateComponentArchitectureHealth(cleanSymbol, null, cleanMetric, {
    role: { primary: "service" },
    testGap: { signal: "covered" }
  }));

  for (let i = 0; i < 10; i++) {
    const run = JSON.stringify(evaluateComponentArchitectureHealth(cleanSymbol, null, cleanMetric, {
      role: { primary: "service" },
      testGap: { signal: "covered" }
    }));
    assert.strictEqual(run, firstRun, `Run ${i + 1} produced different output from run 1`);
  }
  console.log("  ✓ Test 9 PASSED (100% deterministic repeatability verified across 10 runs)");

  // -------------------------------------------------------------
  // Test 10: Zero LLM runtime dependencies or calls
  // -------------------------------------------------------------
  console.log("Test 10: Zero LLM runtime dependencies verification...");
  const code = fs.readFileSync(path.join(ROOT_DIR, "architecture-health.cjs"), "utf8");
  assert.ok(!code.includes("llm"), "architecture-health.cjs must not import or reference LLM services");
  assert.ok(!code.includes("openai"), "architecture-health.cjs must not import openai");
  assert.ok(!code.includes("anthropic"), "architecture-health.cjs must not import anthropic");
  assert.ok(!code.includes("fetch("), "architecture-health.cjs must not execute HTTP fetch");
  console.log("  ✓ Test 10 PASSED (0 LLM imports or runtime dependencies verified)");

  console.log("\nALL 10 DETERMINISTIC ARCHITECTURE HEALTH TESTS PASSED SUCCESSFULLY!");
}

if (require.main === module) {
  runHealthTests();
}

module.exports = { runHealthTests };
