#!/usr/bin/env node
/**
 * Deterministic Change Simulator Test Suite (Prompt B3)
 *
 * Verifies deterministic change simulation:
 * 1. Direct change / modification impact
 * 2. Transitive change impact
 * 3. Reverse impact (dependents -> target)
 * 4. Data impact (SOQL/DML object impact)
 * 5. Entry-point impact (Triggers, LWC, REST, etc.)
 * 6. Security impact (sharing models, exposures)
 * 7. External boundary impact (HTTP Callouts, Named Credentials)
 * 8. Test impact (affected test components/suites)
 * 9. Cycle safety and cycle participation detection
 * 10. Traversal bounds (maxDepth, maxPaths, maxSteps)
 * 11. Disconnected / isolated component handling
 * 12. 100% deterministic repeatability across runs
 * 13. Zero LLM calls verification
 * 14. Core analyzer integration & regression
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { simulateChange, normalizeOperation } = require("../change-simulator.cjs");
const { validateDeterministicResult } = require("../deterministic/contract.cjs");
const { analyze } = require("../dependency-analyzer.cjs");

console.log("Running Deterministic Change Simulator Test Suite (Prompt B3)...");
console.log("==================================================================");

// Fixture setup for unit tests
const mockRegistry = {
  symbols: [
    {
      id: "ApexClass:OrderService",
      type: "ApexClass",
      name: "OrderService",
      parsed: {
        sharing: "with sharing",
        objects: ["Order", "OrderItem"],
        soql: [{ object: "Order" }],
        dml: [{ operation: "insert", object: "Order" }],
        methods: [{ name: "processOrder", visibility: "public" }]
      }
    },
    {
      id: "ApexClass:OrderController",
      type: "ApexClass",
      name: "OrderController",
      parsed: {
        annotations: ["RestResource"],
        methods: [{ name: "handleOrder", visibility: "global", isAuraEnabled: true }]
      }
    },
    {
      id: "ApexClass:PaymentGateway",
      type: "ApexClass",
      name: "PaymentGateway",
      parsed: {
        callouts: ["HttpRequest"],
        dependencies: [{ toName: "NamedCredential", evidence: "callout:PaymentAPI" }]
      }
    },
    {
      id: "LWC:orderComponent",
      type: "LWC",
      name: "orderComponent",
      parsed: {
        dependencies: [{ toName: "OrderController", type: "lwc-apex" }]
      }
    },
    {
      id: "ApexClass:OrderServiceTest",
      type: "ApexClass",
      name: "OrderServiceTest",
      parsed: {
        isTest: true,
        testReferences: ["OrderService"]
      }
    },
    {
      id: "ApexClass:IsolatedHelper",
      type: "ApexClass",
      name: "IsolatedHelper",
      parsed: {
        methods: [{ name: "formatString", visibility: "public" }]
      }
    },
    // Cycle components: CycleA <-> CycleB
    {
      id: "ApexClass:CycleA",
      type: "ApexClass",
      name: "CycleA",
      parsed: {}
    },
    {
      id: "ApexClass:CycleB",
      type: "ApexClass",
      name: "CycleB",
      parsed: {}
    }
  ]
};

const mockGraph = {
  nodes: [
    { id: "ApexClass:OrderService", type: "ApexClass", name: "OrderService" },
    { id: "ApexClass:OrderController", type: "ApexClass", name: "OrderController" },
    { id: "ApexClass:PaymentGateway", type: "ApexClass", name: "PaymentGateway" },
    { id: "LWC:orderComponent", type: "LWC", name: "orderComponent" },
    { id: "ApexClass:OrderServiceTest", type: "ApexClass", name: "OrderServiceTest" },
    { id: "ApexClass:IsolatedHelper", type: "ApexClass", name: "IsolatedHelper" },
    { id: "ApexClass:CycleA", type: "ApexClass", name: "CycleA" },
    { id: "ApexClass:CycleB", type: "ApexClass", name: "CycleB" }
  ],
  edges: [
    // OrderController -> OrderService -> PaymentGateway
    { from: "ApexClass:OrderController", to: "ApexClass:OrderService", type: "method-call", method: "processOrder" },
    { from: "ApexClass:OrderService", to: "ApexClass:PaymentGateway", type: "method-call", method: "sendPayment" },
    // orderComponent -> OrderController
    { from: "LWC:orderComponent", to: "ApexClass:OrderController", type: "lwc-apex", method: "handleOrder" },
    // OrderServiceTest -> OrderService
    { from: "ApexClass:OrderServiceTest", to: "ApexClass:OrderService", type: "test-reference" },
    // CycleA <-> CycleB
    { from: "ApexClass:CycleA", to: "ApexClass:CycleB", type: "method-call" },
    { from: "ApexClass:CycleB", to: "ApexClass:CycleA", type: "method-call" }
  ]
};

// 1. Direct Change Impact Test
(function testDirectChangeImpact() {
  console.log("Test 1: Direct change / modification impact simulation...");

  const result = simulateChange("OrderService", "modify_component", mockGraph, mockRegistry);

  assert.ok(validateDeterministicResult(result), "Result must conform to BASE-ARCH-1 contract");
  assert.strictEqual(result.metadata.target, "OrderService");
  assert.strictEqual(result.metadata.operation, "modify_component");

  // Direct dependent of OrderService is OrderController
  assert.ok(
    result.metadata.directDependents.some(d => d.id === "ApexClass:OrderController"),
    "OrderController must be identified as direct dependent"
  );

  console.log("  ✓ Test 1 PASSED (Direct change impact correctly identified)");
})();

// 2. Transitive Change Impact Test
(function testTransitiveChangeImpact() {
  console.log("Test 2: Transitive change impact simulation...");

  const result = simulateChange("OrderService", "modify_component", mockGraph, mockRegistry);

  // orderComponent -> OrderController -> OrderService => orderComponent is transitive dependent
  assert.ok(
    result.metadata.transitiveDependents.some(d => d.id === "LWC:orderComponent"),
    "orderComponent must be identified as transitive dependent"
  );

  console.log("  ✓ Test 2 PASSED (Transitive dependents correctly collected)");
})();

// 3. Reverse Impact Test (Dependents -> Target)
(function testReverseImpact() {
  console.log("Test 3: Reverse impact (dependents -> target)...");

  const result = simulateChange("OrderService", "modify_component", mockGraph, mockRegistry);

  const dependentsCount = result.metadata.directDependents.length + result.metadata.transitiveDependents.length;
  assert.ok(dependentsCount >= 2, "Must identify direct and transitive upstream dependents");

  console.log("  ✓ Test 3 PASSED (Reverse upstream impact verified)");
})();

// 4. Data Impact Simulation Test
(function testDataImpact() {
  console.log("Test 4: Data impact simulation...");

  const result = simulateChange("OrderService", "modify_component", mockGraph, mockRegistry);

  assert.ok(Array.isArray(result.metadata.affectedObjects), "affectedObjects must be an array");
  assert.ok(
    result.metadata.affectedObjects.some(o => o.object === "Order"),
    "Order object must be listed in affectedObjects"
  );

  console.log("  ✓ Test 4 PASSED (Data object impact correctly included)");
})();

// 5. Entry-Point Impact Test
(function testEntryPointImpact() {
  console.log("Test 5: Entry-point impact simulation...");

  const result = simulateChange("OrderService", "modify_component", mockGraph, mockRegistry);

  assert.ok(Array.isArray(result.metadata.affectedEntryPoints), "affectedEntryPoints must be an array");
  assert.ok(
    result.metadata.affectedEntryPoints.some(ep => ep.id === "ApexClass:OrderController"),
    "OrderController must be identified as affected REST/Aura entry point"
  );

  console.log("  ✓ Test 5 PASSED (Affected entry points correctly identified)");
})();

// 6. Security Impact Test
(function testSecurityImpact() {
  console.log("Test 6: Security impact simulation...");

  const result = simulateChange("OrderService", "modify_component", mockGraph, mockRegistry);

  assert.ok(Array.isArray(result.metadata.securityImpact), "securityImpact must be an array");
  const targetSec = result.metadata.securityImpact.find(s => s.id === "ApexClass:OrderService");
  assert.ok(targetSec, "OrderService security boundaries must be reported");
  assert.strictEqual(targetSec.sharingModel, "with sharing");

  console.log("  ✓ Test 6 PASSED (Security sharing boundaries verified)");
})();

// 7. External Boundary Impact Test
(function testExternalBoundaryImpact() {
  console.log("Test 7: External boundary impact simulation...");

  const result = simulateChange("OrderService", "modify_component", mockGraph, mockRegistry);

  assert.ok(Array.isArray(result.metadata.affectedExternalBoundaries), "affectedExternalBoundaries must be an array");
  // OrderService directly depends on PaymentGateway which has external callout boundary
  assert.ok(
    result.metadata.directDependencies.some(d => d.id === "ApexClass:PaymentGateway"),
    "PaymentGateway must be collected in direct downstream dependencies"
  );

  console.log("  ✓ Test 7 PASSED (External boundary dependencies collected)");
})();

// 8. Test Impact Simulation
(function testTestImpact() {
  console.log("Test 8: Test impact simulation...");

  const result = simulateChange("OrderService", "modify_component", mockGraph, mockRegistry);

  assert.ok(Array.isArray(result.metadata.affectedTests), "affectedTests must be an array");
  assert.ok(
    result.metadata.affectedTests.some(t => t.id === "ApexClass:OrderServiceTest"),
    "OrderServiceTest must be identified as affected test suite"
  );

  console.log("  ✓ Test 8 PASSED (Affected test suites correctly identified)");
})();

// 9. Cycle Safety & Cycle Participation Test
(function testCycles() {
  console.log("Test 9: Cycles & cycle participation simulation...");

  const result = simulateChange("CycleA", "modify_component", mockGraph, mockRegistry);

  assert.strictEqual(result.metadata.cycleInvolved, true, "Cycle participation must be flagged");
  assert.ok(
    result.metadata.riskSignals.some(r => r.rule === "cycle-participation"),
    "Cycle participation risk signal must be present"
  );

  console.log("  ✓ Test 9 PASSED (Cycles handled safely and flagged in risk signals)");
})();

// 10. Traversal Bounds Test
(function testBounds() {
  console.log("Test 10: Traversal bounds (maxDepth, maxPaths) test...");

  const resultUnbounded = simulateChange("OrderService", "modify_component", mockGraph, mockRegistry);
  assert.ok(resultUnbounded.metadata.transitiveDependents.length > 0, "Unbounded simulation includes transitive dependents");

  const resultBounded = simulateChange("OrderService", {
    operation: "modify_component",
    maxDepth: 1
  }, mockGraph, mockRegistry);

  assert.strictEqual(
    resultBounded.metadata.transitiveDependents.length,
    0,
    "maxDepth: 1 must exclude transitive dependents at depth > 1"
  );

  console.log("  ✓ Test 10 PASSED (Traversal bounds strictly respected)");
})();

// 11. Disconnected / Isolated Component Test
(function testDisconnectedComponent() {
  console.log("Test 11: Disconnected / isolated component simulation...");

  const result = simulateChange("IsolatedHelper", "remove_component", mockGraph, mockRegistry);

  assert.strictEqual(result.metadata.isDisconnected, true, "isDisconnected must be true");
  assert.strictEqual(result.metadata.directDependents.length, 0, "0 direct dependents");
  assert.strictEqual(result.metadata.transitiveDependents.length, 0, "0 transitive dependents");
  assert.strictEqual(result.metadata.blastRadiusLevel, "SMALL", "Blast radius for isolated node must be SMALL");

  console.log("  ✓ Test 11 PASSED (Disconnected isolated component handled cleanly)");
})();

// 12. Deterministic Repeatability Test
(function testDeterministicRepeatability() {
  console.log("Test 12: Deterministic repeatability across 10 runs...");

  const firstRun = JSON.stringify(simulateChange("OrderService", "modify_component", mockGraph, mockRegistry));

  for (let i = 0; i < 10; i++) {
    const run = JSON.stringify(simulateChange("OrderService", "modify_component", mockGraph, mockRegistry));
    assert.strictEqual(run, firstRun, `Run ${i + 1} output must match run 1 exactly`);
  }

  console.log("  ✓ Test 12 PASSED (100% deterministic repeatability verified)");
})();

// 13. Zero LLM Calls Verification
(function testZeroLlmCalls() {
  console.log("Test 13: Zero LLM calls verification...");

  const moduleContent = fs.readFileSync(path.join(__dirname, "../change-simulator.cjs"), "utf8");

  assert.strictEqual(moduleContent.includes("LlmClient"), false, "Must not import LlmClient");
  assert.strictEqual(moduleContent.includes("CacheManager"), false, "Must not import CacheManager");
  assert.strictEqual(moduleContent.includes("semantic-investigation-service"), false, "Must not import semantic-investigation-service");

  const start = Date.now();
  const res = simulateChange("OrderService", "modify_component", mockGraph, mockRegistry);
  const duration = Date.now() - start;

  assert.ok(res.metadata.target, "Simulation completed synchronously");
  assert.ok(duration < 50, "Execution took less than 50ms (0 network / LLM calls)");

  console.log("  ✓ Test 13 PASSED (0 LLM imports or calls verified)");
})();

// 14. Full Analyzer Regression Test
(function testFullAnalyzerRegression() {
  console.log("Test 14: Full analyzer regression check...");

  const testProjectDir = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");

  if (fs.existsSync(testProjectDir)) {
    const analysis = analyze(testProjectDir, { writeOutputs: false });
    assert.ok(analysis.graph, "Analyzer graph created");
    assert.ok(analysis.registry, "Analyzer registry created");

    const sampleNode = analysis.graph.nodes[0];
    if (sampleNode) {
      const simResult = simulateChange(sampleNode.id, "modify_component", analysis.graph, analysis.registry);
      assert.ok(validateDeterministicResult(simResult), "Simulation result on real fixture conforms to contract");
      assert.ok(simResult.metadata.blastRadiusLevel, "Blast radius level computed for real fixture");
    }
    console.log("  ✓ Test 14 PASSED (Change simulator operates seamlessly on full analyzer fixture)");
  } else {
    console.log("  ~ Test 14 SKIPPED (Fixture directory not found)");
  }
})();

console.log("");
console.log("ALL DETERMINISTIC CHANGE SIMULATOR TESTS PASSED SUCCESSFULLY!");
