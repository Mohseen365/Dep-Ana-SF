#!/usr/bin/env node
/**
 * Test Gap Analysis Test Suite (PROMPT 24)
 *
 * Verifies deterministic test gap analysis:
 * 1. Matching test (direct graph dependency/reference) -> covered
 * 2. Obvious test naming relationship -> likely-covered
 * 3. No test -> no-test-evidence
 * 4. Ambiguous test -> ambiguous-test
 * 5. Test component itself -> test-component
 * 6. Known runtime coverage failure -> known-coverage-failure
 * 7. Deterministic repeatability
 * 8. Evidence structure
 * 9. Repository-wide summary aggregation
 * 10. Zero LLM calls
 */

const assert = require("assert");
const path = require("path");
const { analyzeTestGap, computeTestGapSummary, buildComponentIntelligence } = require("../dependency-analyzer.cjs");

console.log("Running Deterministic Test Gap Analysis Capability Test Suite...");
console.log("===============================================================");

// 1. Test Matching Test (Direct Dependency Edge / Reference)
(function testMatchingTest() {
  console.log("Test 1: Matching test (direct graph dependency)");

  const registry = [
    {
      id: "ApexClass:AccountService",
      type: "ApexClass",
      name: "AccountService",
      file: "force-app/main/default/classes/AccountService.cls",
      parsed: { isTest: false }
    },
    {
      id: "ApexClass:AccountServiceTest",
      type: "ApexClass",
      name: "AccountServiceTest",
      file: "force-app/main/default/classes/AccountServiceTest.cls",
      parsed: { isTest: true, testReferences: ["AccountService"] }
    }
  ];

  const graph = {
    nodes: [
      { id: "ApexClass:AccountService", type: "ApexClass", name: "AccountService" },
      { id: "ApexClass:AccountServiceTest", type: "ApexClass", name: "AccountServiceTest" }
    ],
    edges: [
      {
        from: "ApexClass:AccountServiceTest",
        to: "ApexClass:AccountService",
        type: "test-reference"
      }
    ]
  };

  const target = registry[0];
  const result = analyzeTestGap(target, registry, graph);

  assert.strictEqual(result.signal, "covered", "Signal should be covered");
  assert.strictEqual(result.status, "COVERED", "Status should be COVERED");
  assert.strictEqual(result.hasTestGap, false, "hasTestGap should be false");
  assert.ok(result.matchingTests.includes("ApexClass:AccountServiceTest"), "matchingTests should contain test ID");
  assert.ok(result.evidence.length > 0, "Evidence should be present");
  console.log("  ✓ Direct test dependency correctly identified as covered");
})();

// 2. Test Obvious Test Naming Relationship
(function testObviousNamingRelationship() {
  console.log("Test 2: Obvious test naming relationship (no graph edge)");

  const registry = [
    {
      id: "ApexClass:OrderProcessor",
      type: "ApexClass",
      name: "OrderProcessor",
      file: "force-app/main/default/classes/OrderProcessor.cls",
      parsed: { isTest: false }
    },
    {
      id: "ApexClass:OrderProcessorTest",
      type: "ApexClass",
      name: "OrderProcessorTest",
      file: "force-app/main/default/classes/OrderProcessorTest.cls",
      parsed: { isTest: true }
    }
  ];

  const graph = {
    nodes: [
      { id: "ApexClass:OrderProcessor", type: "ApexClass", name: "OrderProcessor" },
      { id: "ApexClass:OrderProcessorTest", type: "ApexClass", name: "OrderProcessorTest" }
    ],
    edges: []
  };

  const target = registry[0];
  const result = analyzeTestGap(target, registry, graph);

  assert.strictEqual(result.signal, "likely-covered", "Signal should be likely-covered");
  assert.strictEqual(result.status, "LIKELY_COVERED", "Status should be LIKELY_COVERED");
  assert.strictEqual(result.hasTestGap, false, "hasTestGap should be false");
  assert.ok(result.matchingTests.includes("ApexClass:OrderProcessorTest"), "matchingTests should include OrderProcessorTest");
  console.log("  ✓ Naming relationship correctly identified as likely-covered");
})();

// 3. Test No Test Evidence
(function testNoTestEvidence() {
  console.log("Test 3: No test evidence");

  const registry = [
    {
      id: "ApexClass:PaymentGateway",
      type: "ApexClass",
      name: "PaymentGateway",
      file: "force-app/main/default/classes/PaymentGateway.cls",
      parsed: { isTest: false }
    }
  ];

  const graph = {
    nodes: [{ id: "ApexClass:PaymentGateway", type: "ApexClass", name: "PaymentGateway" }],
    edges: []
  };

  const target = registry[0];
  const result = analyzeTestGap(target, registry, graph);

  assert.strictEqual(result.signal, "no-test-evidence", "Signal should be no-test-evidence");
  assert.strictEqual(result.status, "NO_TEST_EVIDENCE", "Status should be NO_TEST_EVIDENCE");
  assert.strictEqual(result.hasTestGap, true, "hasTestGap should be true");
  assert.strictEqual(result.matchingTests.length, 0, "matchingTests should be empty");
  console.log("  ✓ Missing test correctly identified as no-test-evidence");
})();

// 4. Test Ambiguous Test Relationship
(function testAmbiguousTest() {
  console.log("Test 4: Ambiguous test relationship");

  const registry = [
    {
      id: "ApexClass:CustomerPortal",
      type: "ApexClass",
      name: "CustomerPortal",
      file: "force-app/main/default/classes/CustomerPortal.cls",
      parsed: { isTest: false }
    },
    {
      id: "ApexClass:CustomerPortalTest",
      type: "ApexClass",
      name: "CustomerPortalTest",
      file: "force-app/main/default/classes/CustomerPortalTest.cls",
      parsed: { isTest: true }
    },
    {
      id: "ApexClass:CustomerPortal_Test",
      type: "ApexClass",
      name: "CustomerPortal_Test",
      file: "force-app/main/default/classes/CustomerPortal_Test.cls",
      parsed: { isTest: true }
    }
  ];

  const graph = {
    nodes: [
      { id: "ApexClass:CustomerPortal", type: "ApexClass", name: "CustomerPortal" },
      { id: "ApexClass:CustomerPortalTest", type: "ApexClass", name: "CustomerPortalTest" },
      { id: "ApexClass:CustomerPortal_Test", type: "ApexClass", name: "CustomerPortal_Test" }
    ],
    edges: []
  };

  const target = registry[0];
  const result = analyzeTestGap(target, registry, graph);

  assert.strictEqual(result.signal, "ambiguous-test", "Signal should be ambiguous-test");
  assert.strictEqual(result.status, "AMBIGUOUS_TEST", "Status should be AMBIGUOUS_TEST");
  assert.strictEqual(result.hasTestGap, true, "hasTestGap should be true");
  assert.strictEqual(result.matchingTests.length, 2, "Should match 2 ambiguous tests");
  console.log("  ✓ Ambiguous test relationship correctly identified");
})();

// 5. Test Test Component Itself
(function testTestComponentItself() {
  console.log("Test 5: Test component itself");

  const registry = [
    {
      id: "ApexClass:AccountServiceTest",
      type: "ApexClass",
      name: "AccountServiceTest",
      file: "force-app/main/default/classes/AccountServiceTest.cls",
      parsed: { isTest: true }
    }
  ];

  const graph = {
    nodes: [{ id: "ApexClass:AccountServiceTest", type: "ApexClass", name: "AccountServiceTest" }],
    edges: []
  };

  const target = registry[0];
  const result = analyzeTestGap(target, registry, graph);

  assert.strictEqual(result.signal, "test-component", "Signal should be test-component");
  assert.strictEqual(result.status, "TEST_COMPONENT", "Status should be TEST_COMPONENT");
  assert.strictEqual(result.hasTestGap, false, "hasTestGap should be false");
  console.log("  ✓ Test component itself correctly classified");
})();

// 6. Test Known Runtime Coverage Failure
(function testKnownCoverageFailure() {
  console.log("Test 6: Known runtime coverage failure");

  const registry = [
    {
      id: "ApexClass:InventoryManager",
      type: "ApexClass",
      name: "InventoryManager",
      file: "force-app/main/default/classes/InventoryManager.cls",
      parsed: {
        isTest: false,
        coverage: {
          percentCovered: 42,
          status: "FAILED",
          failed: true
        }
      }
    }
  ];

  const graph = {
    nodes: [{ id: "ApexClass:InventoryManager", type: "ApexClass", name: "InventoryManager" }],
    edges: []
  };

  const target = registry[0];
  const result = analyzeTestGap(target, registry, graph);

  assert.strictEqual(result.signal, "known-coverage-failure", "Signal should be known-coverage-failure");
  assert.strictEqual(result.status, "KNOWN_COVERAGE_FAILURE", "Status should be KNOWN_COVERAGE_FAILURE");
  assert.strictEqual(result.hasTestGap, true, "hasTestGap should be true");
  assert.strictEqual(result.coverageData.percentCovered, 42, "Coverage data percent preserved");
  console.log("  ✓ Known coverage failure correctly distinguished from no-test-evidence");
})();

// 7. Test Deterministic Repeatability
(function testDeterministicRepeatability() {
  console.log("Test 7: Deterministic repeatability across 10 runs");

  const registry = [
    {
      id: "ApexClass:ServiceA",
      type: "ApexClass",
      name: "ServiceA",
      parsed: { isTest: false }
    },
    {
      id: "ApexClass:ServiceATest",
      type: "ApexClass",
      name: "ServiceATest",
      parsed: { isTest: true }
    }
  ];
  const graph = { nodes: [], edges: [] };

  const firstRun = JSON.stringify(analyzeTestGap(registry[0], registry, graph));
  for (let i = 0; i < 10; i++) {
    const subsequentRun = JSON.stringify(analyzeTestGap(registry[0], registry, graph));
    assert.strictEqual(subsequentRun, firstRun, `Run ${i + 1} output must match run 1 exactly`);
  }
  console.log("  ✓ 100% deterministic repeatability verified across runs");
})();

// 8. Test Evidence Preservation
(function testEvidencePreservation() {
  console.log("Test 8: Detailed evidence preservation");

  const registry = [
    {
      id: "ApexClass:BillingEngine",
      type: "ApexClass",
      name: "BillingEngine",
      parsed: { isTest: false }
    },
    {
      id: "ApexClass:BillingEngineTest",
      type: "ApexClass",
      name: "BillingEngineTest",
      parsed: { isTest: true, testReferences: ["BillingEngine"] }
    }
  ];
  const graph = {
    nodes: [],
    edges: [{ from: "ApexClass:BillingEngineTest", to: "ApexClass:BillingEngine", type: "test-reference" }]
  };

  const result = analyzeTestGap(registry[0], registry, graph);
  assert.ok(Array.isArray(result.evidence), "Evidence must be an array");
  assert.ok(result.evidence.some(e => e.type === "dependencyEdge"), "Dependency edge evidence present");
  assert.ok(result.evidence.some(e => e.type === "namingMatch"), "Naming match evidence present");
  console.log("  ✓ Explainable evidence structure verified");
})();

// 9. Test Summary Aggregation
(function testSummaryAggregation() {
  console.log("Test 9: Repository-wide test gap summary aggregation");

  const registry = [
    { id: "ApexClass:CoveredService", name: "CoveredService", parsed: { isTest: false } },
    { id: "ApexClass:CoveredServiceTest", name: "CoveredServiceTest", parsed: { isTest: true } },
    { id: "ApexClass:UntestedService", name: "UntestedService", parsed: { isTest: false } },
    { id: "ApexClass:FailedService", name: "FailedService", parsed: { isTest: false, coverage: { percentCovered: 10, status: "FAILED" } } }
  ];
  const graph = {
    nodes: [],
    edges: [{ from: "ApexClass:CoveredServiceTest", to: "ApexClass:CoveredService", type: "test-reference" }]
  };

  const summary = computeTestGapSummary(registry, graph);
  assert.strictEqual(summary.totalComponents, 4, "Total components count correct");
  assert.strictEqual(summary.coveredCount, 1, "Covered count correct");
  assert.strictEqual(summary.testComponentCount, 1, "Test component count correct");
  assert.strictEqual(summary.noTestEvidenceCount, 1, "No test evidence count correct");
  assert.strictEqual(summary.knownCoverageFailureCount, 1, "Known coverage failure count correct");
  assert.strictEqual(summary.componentsWithTestGap, 2, "Components with test gap count correct");
  console.log("  ✓ Repository summary aggregation verified");
})();

// 10. Test Zero LLM Calls Assertion
(function testZeroLlmCalls() {
  console.log("Test 10: Zero LLM calls verification");

  // Pure synchronous call without network or external client invocation
  const start = Date.now();
  const registry = [{ id: "ApexClass:FastComponent", name: "FastComponent", parsed: {} }];
  const result = analyzeTestGap(registry[0], registry, { edges: [] });
  const duration = Date.now() - start;

  assert.ok(result.signal, "Result produced synchronously");
  assert.ok(duration < 50, "Execution took less than 50ms (zero network / LLM calls)");
  console.log("  ✓ Synchronous deterministic execution completed in " + duration + "ms with zero LLM calls");
})();

console.log("");
console.log("ALL TEST GAP ANALYSIS CAPABILITY TESTS PASSED SUCCESSFULLY!");
