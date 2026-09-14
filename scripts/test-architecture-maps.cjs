#!/usr/bin/env node
/**
 * Deterministic Architecture Maps Test Suite (WAVE-C4)
 *
 * Verifies:
 *   1. System Map (Level 1) domain grouping and relationship aggregation.
 *   2. Domain Map (Level 2) internal component breakdown & boundary edges.
 *   3. Component Map (Level 3) individual relationships and key architectural attributes.
 *   4. Change/Impact Map (Level 4) blast radius, boundaries, entry points, data impact.
 *   5. Isolated Component handling (zero dependencies / zero dependents).
 *   6. Missing/Unknown Domain handling (graceful fallback).
 *   7. Graph Cycles handling (cycle participation and cycle safety).
 *   8. Deterministic Output Repeatability (100% byte/structural identity across runs).
 *   9. Authority Preservation (enforceDeterministicAuthority contract compliance).
 *  10. Zero LLM Calls & zero LLM imports verification.
 *  11. Full Analyzer Integration Regression Check.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const {
  buildSystemMap,
  buildDomainMap,
  buildComponentMap,
  buildImpactMap,
  buildMultiLevelArchitectureMaps,
  inferComponentDomain
} = require("../architecture-maps.cjs");

const {
  validateDeterministicResult,
  enforceDeterministicAuthority
} = require("../deterministic/contract.cjs");

const analyzer = require("../dependency-analyzer.cjs");

function runTests() {
  console.log("Running Deterministic Architecture Maps Test Suite (WAVE-C4)...");
  console.log("=========================================================================");

  // Mock Registry & Graph Fixtures
  const registry = {
    symbols: [
      {
        id: "ApexClass:AccountService",
        name: "AccountService",
        type: "ApexClass",
        file: "force-app/main/default/classes/account/AccountService.cls",
        parsed: {
          objects: ["Account"],
          soql: [{ object: "Account" }],
          dml: [{ operation: "update", variable: "acc" }]
        }
      },
      {
        id: "ApexClass:AccountController",
        name: "AccountController",
        type: "ApexClass",
        file: "force-app/main/default/classes/account/AccountController.cls",
        parsed: {
          annotations: ["AuraEnabled"],
          methods: [{ name: "getAccounts", isAuraEnabled: true }]
        }
      },
      {
        id: "ApexClass:OrderProcessor",
        name: "OrderProcessor",
        type: "ApexClass",
        file: "force-app/main/default/classes/order/OrderProcessor.cls",
        parsed: {
          objects: ["Order"],
          soql: [{ object: "Order" }]
        }
      },
      {
        id: "ApexClass:OrderHelper",
        name: "OrderHelper",
        type: "ApexClass",
        file: "force-app/main/default/classes/order/OrderHelper.cls",
        parsed: {}
      },
      {
        id: "ApexClass:IsolatedUtil",
        name: "IsolatedUtil",
        type: "ApexClass",
        file: "force-app/main/default/classes/common/IsolatedUtil.cls",
        parsed: {}
      },
      {
        id: "ApexClass:CycleA",
        name: "CycleA",
        type: "ApexClass",
        file: "force-app/main/default/classes/common/CycleA.cls",
        parsed: {}
      },
      {
        id: "ApexClass:CycleB",
        name: "CycleB",
        type: "ApexClass",
        file: "force-app/main/default/classes/common/CycleB.cls",
        parsed: {}
      }
    ]
  };

  const graph = {
    nodes: [
      { id: "ApexClass:AccountService", name: "AccountService", type: "ApexClass" },
      { id: "ApexClass:AccountController", name: "AccountController", type: "ApexClass" },
      { id: "ApexClass:OrderProcessor", name: "OrderProcessor", type: "ApexClass" },
      { id: "ApexClass:OrderHelper", name: "OrderHelper", type: "ApexClass" },
      { id: "ApexClass:IsolatedUtil", name: "IsolatedUtil", type: "ApexClass" },
      { id: "ApexClass:CycleA", name: "CycleA", type: "ApexClass" },
      { id: "ApexClass:CycleB", name: "CycleB", type: "ApexClass" }
    ],
    edges: [
      { from: "ApexClass:AccountController", to: "ApexClass:AccountService", type: "method-call", evidence: "AccountService.getAccount()" },
      { from: "ApexClass:AccountService", to: "ApexClass:OrderProcessor", type: "method-call", evidence: "OrderProcessor.process()" },
      { from: "ApexClass:OrderProcessor", to: "ApexClass:OrderHelper", type: "method-call", evidence: "OrderHelper.help()" },
      { from: "ApexClass:CycleA", to: "ApexClass:CycleB", type: "method-call", evidence: "CycleB.call()" },
      { from: "ApexClass:CycleB", to: "ApexClass:CycleA", type: "method-call", evidence: "CycleA.call()" }
    ]
  };

  // -------------------------------------------------------------
  // Test 1: System Map (Level 1)
  // -------------------------------------------------------------
  console.log("Test 1: System Map (Level 1) generation...");
  const systemMap = buildSystemMap(registry, graph);
  assert.ok(validateDeterministicResult(systemMap), "System map result must comply with BASE-ARCH-1 contract.");
  assert.strictEqual(systemMap.metadata.mapLevel, 1);
  assert.ok(systemMap.metadata.totalDomains > 0);
  assert.ok(Array.isArray(systemMap.metadata.domains));
  assert.ok(Array.isArray(systemMap.metadata.relationships));

  const accountDomain = systemMap.metadata.domains.find(d => d.domain === "Account");
  assert.ok(accountDomain, "Account domain should be inferred from file path or object usage.");
  assert.ok(accountDomain.components.includes("ApexClass:AccountService"));

  const interDomainRel = systemMap.metadata.relationships.find(
    r => r.sourceDomain === "Account" && r.targetDomain === "Order"
  );
  assert.ok(interDomainRel, "Inter-domain relationship Account -> Order must be detected.");
  console.log("  ✓ Test 1 PASSED (System map correctly constructed)");

  // -------------------------------------------------------------
  // Test 2: Domain Map (Level 2)
  // -------------------------------------------------------------
  console.log("Test 2: Domain Map (Level 2) generation...");
  const domainMap = buildDomainMap(registry, graph);
  assert.ok(validateDeterministicResult(domainMap));
  assert.strictEqual(domainMap.metadata.mapLevel, 2);
  assert.ok(domainMap.metadata.totalDomains > 0);

  const orderDomainBreakdown = domainMap.metadata.domains.find(d => d.domain === "Order");
  assert.ok(orderDomainBreakdown, "Order domain breakdown must exist.");
  assert.strictEqual(orderDomainBreakdown.components.length, 2); // OrderProcessor & OrderHelper
  assert.ok(orderDomainBreakdown.internalEdgeCount > 0, "Internal edge OrderProcessor -> OrderHelper must be counted.");
  console.log("  ✓ Test 2 PASSED (Domain map correctly constructed)");

  // -------------------------------------------------------------
  // Test 3: Component Map (Level 3)
  // -------------------------------------------------------------
  console.log("Test 3: Component Map (Level 3) generation...");
  const componentMap = buildComponentMap("AccountService", registry, graph);
  assert.ok(validateDeterministicResult(componentMap));
  assert.strictEqual(componentMap.metadata.mapLevel, 3);
  assert.strictEqual(componentMap.metadata.focalComponent, "ApexClass:AccountService");

  const focalNode = componentMap.metadata.nodes.find(n => n.id === "ApexClass:AccountService");
  assert.ok(focalNode, "Focal component node must exist in map.");
  assert.strictEqual(focalNode.domain, "Account");
  assert.ok(focalNode.role, "Role must be assigned.");
  assert.ok(focalNode.layer, "Layer must be assigned.");
  console.log("  ✓ Test 3 PASSED (Component map correctly constructed)");

  // -------------------------------------------------------------
  // Test 4: Change / Impact Map (Level 4)
  // -------------------------------------------------------------
  console.log("Test 4: Change / Impact Map (Level 4) generation...");
  const impactMap = buildImpactMap("AccountService", "modify_component", graph, registry);
  assert.ok(validateDeterministicResult(impactMap));
  assert.strictEqual(impactMap.metadata.mapLevel, 4);
  assert.strictEqual(impactMap.metadata.targetComponent, "AccountService");
  assert.ok(Array.isArray(impactMap.metadata.directDependents));
  assert.ok(impactMap.metadata.directDependents.some(d => d.id === "ApexClass:AccountController"));
  console.log("  ✓ Test 4 PASSED (Impact map correctly constructed)");

  // -------------------------------------------------------------
  // Test 5: Isolated Component Handling
  // -------------------------------------------------------------
  console.log("Test 5: Isolated Component handling...");
  const isolatedComponentMap = buildComponentMap("IsolatedUtil", registry, graph);
  assert.ok(validateDeterministicResult(isolatedComponentMap));
  assert.strictEqual(isolatedComponentMap.metadata.totalNodes, 1);
  assert.strictEqual(isolatedComponentMap.metadata.totalEdges, 0);

  const isolatedImpactMap = buildImpactMap("IsolatedUtil", "remove_component", graph, registry);
  assert.strictEqual(isolatedImpactMap.metadata.isDisconnected, true);
  console.log("  ✓ Test 5 PASSED (Isolated components cleanly handled)");

  // -------------------------------------------------------------
  // Test 6: Missing / Unknown Domain Fallback
  // -------------------------------------------------------------
  console.log("Test 6: Missing / Unknown domain fallback...");
  const unknownSymbol = { id: "ApexClass:X", name: "X", file: "X.cls" };
  const inferredDomain = inferComponentDomain(unknownSymbol);
  assert.strictEqual(inferredDomain, "General", "Unclassifiable component should fall back to 'General'.");
  console.log("  ✓ Test 6 PASSED (Missing/unknown domain cleanly handled)");

  // -------------------------------------------------------------
  // Test 7: Graph Cycles Handling
  // -------------------------------------------------------------
  console.log("Test 7: Graph Cycles handling...");
  const cycleImpactMap = buildImpactMap("CycleA", "modify_component", graph, registry, { cycles: [["ApexClass:CycleA", "ApexClass:CycleB"]] });
  assert.strictEqual(cycleImpactMap.metadata.cycleInvolved, true);
  assert.ok(cycleImpactMap.metadata.riskSignals.some(r => r.rule === "cycle-participation"));
  console.log("  ✓ Test 7 PASSED (Graph cycles safely handled and flagged)");

  // -------------------------------------------------------------
  // Test 8: Deterministic Repeatability
  // -------------------------------------------------------------
  console.log("Test 8: Deterministic Repeatability verification...");
  const mapsRun1 = JSON.stringify(buildMultiLevelArchitectureMaps("AccountService", registry, graph));
  const mapsRun2 = JSON.stringify(buildMultiLevelArchitectureMaps("AccountService", registry, graph));
  assert.strictEqual(mapsRun1, mapsRun2, "Identical input MUST yield 100% identical multi-level architecture maps.");
  console.log("  ✓ Test 8 PASSED (100% deterministic repeatability verified)");

  // -------------------------------------------------------------
  // Test 9: Authority Preservation
  // -------------------------------------------------------------
  console.log("Test 9: Authority Preservation contract compliance...");
  const systemMapRes = buildSystemMap(registry, graph);
  const detFact = systemMapRes.value;
  const semClaim = "Custom-Domain-Structure";

  const authorityResult = enforceDeterministicAuthority(detFact, semClaim);
  assert.strictEqual(authorityResult.authoritativeValue, detFact);
  assert.strictEqual(authorityResult.source, "deterministic");
  assert.strictEqual(authorityResult.contradiction, true);
  console.log("  ✓ Test 9 PASSED (Authority preservation verified)");

  // -------------------------------------------------------------
  // Test 10: Zero LLM Calls & Imports Verification
  // -------------------------------------------------------------
  console.log("Test 10: Zero LLM calls & runtime dependencies verification...");
  const mapsSource = fs.readFileSync(path.join(__dirname, "../architecture-maps.cjs"), "utf8");
  const forbiddenTerms = ["LlmClient", "CacheManager", "semantic-investigation-service", "openai", "anthropic", "langchain"];
  for (const term of forbiddenTerms) {
    assert.strictEqual(mapsSource.toLowerCase().includes(term.toLowerCase()), false, `Module MUST NOT import or reference '${term}'.`);
  }
  console.log("  ✓ Test 10 PASSED (0 LLM dependencies verified)");

  // -------------------------------------------------------------
  // Test 11: Full Analyzer Integration Regression Check
  // -------------------------------------------------------------
  console.log("Test 11: Full Analyzer Integration Regression Check...");
  const fixtureDir = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");
  if (fs.existsSync(fixtureDir)) {
    const fullAnalysis = analyzer.analyze(fixtureDir, { quiet: true }, false);
    const fullMaps = analyzer.buildMultiLevelArchitectureMaps("DashboardContext", fullAnalysis.registry, fullAnalysis.graph);
    assert.ok(validateDeterministicResult(fullMaps));
    assert.ok(fullMaps.metadata.maps.level1_system);
    assert.ok(fullMaps.metadata.maps.level2_domain);
    assert.ok(fullMaps.metadata.maps.level3_component);
    assert.ok(fullMaps.metadata.maps.level4_impact);
    console.log("  ✓ Test 11 PASSED (Integrated into full analyzer fixture cleanly)");
  } else {
    console.log("  ~ Test 11 SKIPPED (Fixture directory not present in environment)");
  }

  console.log("\nALL DETERMINISTIC ARCHITECTURE MAPS TESTS PASSED SUCCESSFULLY!\n");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
