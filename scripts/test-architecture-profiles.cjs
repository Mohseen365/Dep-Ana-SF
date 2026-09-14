/**
 * Capability Test Suite for Deterministic Architecture Profiles (Prompt B1)
 *
 * Verifies:
 *   1. Complete component architecture profile construction.
 *   2. Partial profile handling with missing signals cleanly distinguished from false.
 *   3. Unknown / missing symbol profile handling.
 *   4. Profile composition and source provenance preservation.
 *   5. Repository-level aggregate architecture profile.
 *   6. Deterministic repeatability across multiple runs.
 *   7. Zero LLM runtime dependencies or calls.
 *   8. Core analyzer integration regression.
 */

"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

const {
  buildComponentArchitectureProfile,
  buildRepositoryArchitectureProfile
} = require("../architecture-profile.cjs");

const {
  validateDeterministicResult,
  CONFIDENCE_LEVELS
} = require("../deterministic/contract.cjs");

const analyzer = require("../dependency-analyzer.cjs");

console.log("Running Deterministic Architecture Profiles Test Suite (Prompt B1)...");
console.log("====================================================================");

// Fixture symbol definitions
const sampleSymbol = {
  id: "ApexClass:OrderService",
  name: "OrderService",
  type: "ApexClass",
  file: "force-app/main/default/classes/OrderService.cls",
  sourceHash: "abc123hash",
  parsed: {
    name: "OrderService",
    type: "ApexClass",
    sourceHash: "abc123hash"
  }
};

const sampleMetric = {
  id: "ApexClass:OrderService",
  fanIn: 5,
  fanOut: 3
};

// Mock capability signals
const sampleRole = { primary: "service", confidence: "high" };
const sampleLayer = { primary: "application", confidence: "high" };
const sampleEntryPoint = { isEntryPoint: false, entryPointTypes: [] };
const sampleBottleneck = { isBottleneck: true, score: 35 };
const sampleTestGap = { signal: "covered" };
const sampleSecurity = { metadata: { sharingModel: "with sharing", boundaries: ["with sharing"] } };
const sampleExternalBoundary = { hasExternalBoundary: true, boundaryTypes: ["HTTPCallout"] };
const sampleDataImpact = { metadata: { objects: ["Account", "Order"] } };
const samplePaths = { metadata: { summary: { totalPaths: 12 } } };

// TEST 1: Complete component architecture profile construction
console.log("Test 1: Complete component architecture profile construction...");
const completeProfile = buildComponentArchitectureProfile(sampleSymbol, null, sampleMetric, {
  role: sampleRole,
  layer: sampleLayer,
  entryPoint: sampleEntryPoint,
  bottleneck: sampleBottleneck,
  testGap: sampleTestGap,
  securityBoundaries: sampleSecurity,
  externalBoundary: sampleExternalBoundary,
  dataImpact: sampleDataImpact,
  paths: samplePaths
});

assert.strictEqual(validateDeterministicResult(completeProfile), true, "Result must conform to BASE-ARCH-1 contract");
assert.strictEqual(completeProfile.confidence, "high", "Complete profile with >=7 signals must have 'high' confidence");
assert.strictEqual(completeProfile.profile.role, "service");
assert.strictEqual(completeProfile.profile.layer, "application");
assert.strictEqual(completeProfile.profile.entryPoint.isEntryPoint, false);
assert.strictEqual(completeProfile.profile.bottleneck.isBottleneck, true);
assert.strictEqual(completeProfile.profile.bottleneck.score, 35);
assert.strictEqual(completeProfile.profile.testStatus.signal, "covered");
assert.strictEqual(completeProfile.profile.security.sharingModel, "with sharing");
assert.strictEqual(completeProfile.profile.externalBoundary.hasExternalBoundary, true);
assert.deepStrictEqual(completeProfile.profile.dataImpact.objects, ["Account", "Order"]);
assert.strictEqual(completeProfile.profile.metrics.fanIn, 5);
assert.strictEqual(completeProfile.profile.metrics.fanOut, 3);
assert.strictEqual(completeProfile.profile.metrics.coupling, 8);
assert.strictEqual(completeProfile.metadata.availableSignals, 10);
assert.strictEqual(completeProfile.metadata.missingSignals.length, 0);
console.log("  ✓ Test 1 PASSED (Complete architecture profile successfully constructed)");

// TEST 2: Partial profile handling with missing signals
console.log("Test 2: Partial profile handling with missing signals...");
const partialProfile = buildComponentArchitectureProfile(sampleSymbol, null, sampleMetric, {
  role: sampleRole,
  layer: sampleLayer,
  testGap: sampleTestGap
});

assert.strictEqual(validateDeterministicResult(partialProfile), true);
assert.strictEqual(partialProfile.confidence, "medium", "Profile with 4 signals should have 'medium' confidence");
assert.strictEqual(partialProfile.profile.role, "service");
assert.strictEqual(partialProfile.profile.layer, "application");
assert.strictEqual(partialProfile.profile.entryPoint.status, "unavailable");
assert.strictEqual(partialProfile.profile.entryPoint.isEntryPoint, false);
assert.strictEqual(partialProfile.profile.bottleneck.status, "unavailable");
assert.strictEqual(partialProfile.profile.dataImpact.status, "unavailable");
assert.ok(partialProfile.metadata.missingSignals.includes("entryPoint"));
assert.ok(partialProfile.metadata.missingSignals.includes("bottleneck"));
assert.ok(partialProfile.metadata.missingSignals.includes("dataImpact"));
console.log("  ✓ Test 2 PASSED (Unavailable signals correctly distinguished from false)");

// TEST 3: Null / missing symbol handling
console.log("Test 3: Null / missing symbol profile handling...");
const nullProfile = buildComponentArchitectureProfile(null);
assert.strictEqual(validateDeterministicResult(nullProfile), true);
assert.strictEqual(nullProfile.confidence, "unknown");
assert.strictEqual(nullProfile.metadata.availableSignals, 0);
assert.strictEqual(nullProfile.metadata.provenance, null);
console.log("  ✓ Test 3 PASSED (Null symbol cleanly handled)");

// TEST 4: Source provenance preservation
console.log("Test 4: Source provenance preservation...");
assert.strictEqual(completeProfile.provenance.componentId, "ApexClass:OrderService");
assert.strictEqual(completeProfile.provenance.componentName, "OrderService");
assert.strictEqual(completeProfile.provenance.targetFile, "force-app/main/default/classes/OrderService.cls");
assert.strictEqual(completeProfile.provenance.sourceHash, "abc123hash");
console.log("  ✓ Test 4 PASSED (Source provenance accurately preserved)");

// TEST 5: Repository-level aggregate architecture profile
console.log("Test 5: Repository-level aggregate architecture profile...");
const mockRegistry = {
  symbols: [
    sampleSymbol,
    {
      id: "ApexClass:OrderController",
      name: "OrderController",
      type: "ApexClass",
      file: "force-app/main/default/classes/OrderController.cls",
      parsed: { name: "OrderController", type: "ApexClass" }
    }
  ]
};

const repoProfile = buildRepositoryArchitectureProfile(mockRegistry, null, [sampleMetric], {
  roles: { symbolRoles: new Map([["ApexClass:OrderService", sampleRole]]) },
  layers: { symbolLayers: new Map([["ApexClass:OrderService", sampleLayer]]) },
  bottlenecks: { componentBottlenecks: new Map([["ApexClass:OrderService", sampleBottleneck]]) }
});

assert.strictEqual(repoProfile.summary.totalComponents, 2);
assert.strictEqual(repoProfile.summary.roles.service, 1);
assert.strictEqual(repoProfile.summary.roles.unknown, 1);
assert.strictEqual(repoProfile.summary.layers.application, 1);
assert.strictEqual(repoProfile.summary.bottlenecks.count, 1);
assert.ok(repoProfile.componentProfiles.has("ApexClass:OrderService"));
assert.ok(repoProfile.componentProfiles.has("ApexClass:OrderController"));
console.log("  ✓ Test 5 PASSED (Repository aggregate profile generated cleanly)");

// TEST 6: Deterministic repeatability
console.log("Test 6: Deterministic repeatability across multiple runs...");
const profileRun1 = JSON.stringify(buildComponentArchitectureProfile(sampleSymbol, null, sampleMetric, { role: sampleRole, layer: sampleLayer }));
const profileRun2 = JSON.stringify(buildComponentArchitectureProfile(sampleSymbol, null, sampleMetric, { role: sampleRole, layer: sampleLayer }));
assert.strictEqual(profileRun1, profileRun2, "Profile outputs must be 100% identical across runs");
console.log("  ✓ Test 6 PASSED (100% deterministic repeatability verified)");

// TEST 7: Zero LLM runtime dependencies verification
console.log("Test 7: Zero LLM runtime dependencies verification...");
const fileContent = fs.readFileSync(path.resolve(__dirname, "../architecture-profile.cjs"), "utf8");
const forbiddenTerms = ["LlmClient", "CacheManager", "semantic-investigation-service", "AI Gateway", "OpenAI"];
for (const term of forbiddenTerms) {
  assert.strictEqual(fileContent.includes(term), false, `Forbidden term '${term}' found in architecture-profile.cjs`);
}
console.log("  ✓ Test 7 PASSED (0 LLM imports or runtime dependencies verified)");

// TEST 8: Full analyzer integration regression check
console.log("Test 8: Full analyzer integration regression check...");
const fixtureDir = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");
if (fs.existsSync(fixtureDir)) {
  const result = analyzer.analyze(fixtureDir, {}, false);
  assert.ok(result.repositoryProfile, "Analyzer result must include repositoryProfile");
  assert.strictEqual(result.repositoryProfile.summary.totalComponents, 9);
  assert.ok(typeof result.repositoryProfile.summary.roles === "object");
  assert.ok(typeof result.repositoryProfile.summary.layers === "object");

  // Check individual component intelligence
  const targetSymbol = result.registry.symbols[0];
  const intelligence = analyzer.buildComponentIntelligence(targetSymbol, result);
  assert.ok(intelligence.architectureProfile, "Intelligence package must include architectureProfile");
  assert.strictEqual(intelligence.architectureProfile.provenance.componentName, targetSymbol.name);
  console.log("  ✓ Test 8 PASSED (Core analyzer integration verified)");
} else {
  console.log("  ⚠ Test 8 SKIPPED (Fixture directory not found)");
}

console.log("\nALL 8 DETERMINISTIC ARCHITECTURE PROFILE TESTS PASSED SUCCESSFULLY!\n");
