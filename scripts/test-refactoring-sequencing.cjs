/**
 * Test Suite: Deterministic Refactoring Sequencing (WAVE-C2)
 *
 * Verifies that refactoring sequencing produces defensible, explainable,
 * cycle-safe, topological orderings for candidate components based strictly on
 * deterministic repository intelligence.
 *
 * Scenarios covered:
 *   1. Simple linear dependency (A depends on B -> B before A)
 *   2. Branching dependency (C depends on A & B -> A, B before C)
 *   3. Shared bottleneck (Shared core service unblocks multiple candidates)
 *   4. Prerequisite ordering (Prerequisites preceding dependent components)
 *   5. Independent components (Deterministic tie-breaking)
 *   6. Cycle handling (Safe cycle breaking without infinite loops)
 *   7. High business-criticality vs high structural impact (Explicit business criticality vs structural ranking)
 *   8. Safety blocker (HIGH_CAUTION envelope flagged as safety blocker)
 *   9. Incomplete evidence / Unknown inputs (Unknown components remain unknown)
 *  10. Deterministic authority over LLM observations
 *  11. Zero LLM / runtime dependency audit
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  determineRefactoringSequence,
  buildPrerequisiteGraph,
  classifySafetyEnvelope,
  rankCandidates
} = require("../refactoring-sequencer.cjs");

const {
  validateDeterministicResult,
  enforceDeterministicAuthority
} = require("../deterministic/contract.cjs");

function runTests() {
  console.log("Running Deterministic Refactoring Sequencing Test Suite (WAVE-C2)...");
  console.log("===================================================================");

  // --- MOCK REPOSITORY GRAPH AND REGISTRY FIXTURES ---
  const registry = {
    symbols: [
      {
        id: "ApexClass:ComponentA",
        name: "ComponentA",
        type: "ApexClass",
        file: "force-app/main/default/classes/ComponentA.cls",
        parsed: { lineCount: 150 }
      },
      {
        id: "ApexClass:ComponentB",
        name: "ComponentB",
        type: "ApexClass",
        file: "force-app/main/default/classes/ComponentB.cls",
        parsed: { lineCount: 200 }
      },
      {
        id: "ApexClass:ComponentC",
        name: "ComponentC",
        type: "ApexClass",
        file: "force-app/main/default/classes/ComponentC.cls",
        parsed: { lineCount: 100 }
      },
      {
        id: "ApexClass:SharedCoreService",
        name: "SharedCoreService",
        type: "ApexClass",
        file: "force-app/main/default/classes/SharedCoreService.cls",
        parsed: { lineCount: 300 }
      },
      {
        id: "ApexClass:CycleClassX",
        name: "CycleClassX",
        type: "ApexClass",
        file: "force-app/main/default/classes/CycleClassX.cls",
        parsed: { lineCount: 120 }
      },
      {
        id: "ApexClass:CycleClassY",
        name: "CycleClassY",
        type: "ApexClass",
        file: "force-app/main/default/classes/CycleClassY.cls",
        parsed: { lineCount: 140 }
      },
      {
        id: "ApexClass:BizCriticalService",
        name: "BizCriticalService",
        type: "ApexClass",
        file: "force-app/main/default/classes/BizCriticalService.cls",
        parsed: {
          lineCount: 80,
          isBusinessCritical: true,
          businessMetadata: { criticality: "high" }
        }
      },
      {
        id: "ApexClass:UnsafeClass",
        name: "UnsafeClass",
        type: "ApexClass",
        file: "force-app/main/default/classes/UnsafeClass.cls",
        parsed: {
          lineCount: 600,
          coverage: { percentCovered: 40, status: "FAILED" }
        }
      },
      {
        id: "ApexClass:IndependentAlpha",
        name: "IndependentAlpha",
        type: "ApexClass",
        file: "force-app/main/default/classes/IndependentAlpha.cls",
        parsed: { lineCount: 50, coverage: { percentCovered: 100 } }
      },
      {
        id: "ApexClass:IndependentBeta",
        name: "IndependentBeta",
        type: "ApexClass",
        file: "force-app/main/default/classes/IndependentBeta.cls",
        parsed: { lineCount: 50, coverage: { percentCovered: 100 } }
      }
    ]
  };

  const graph = {
    nodes: registry.symbols.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      file: s.file
    })),
    edges: [
      // ComponentA -> ComponentB (A depends on B)
      { from: "ApexClass:ComponentA", to: "ApexClass:ComponentB", type: "method-call", evidence: "ComponentB.doWork()" },
      // ComponentC -> ComponentA and ComponentC -> ComponentB (C depends on both)
      { from: "ApexClass:ComponentC", to: "ApexClass:ComponentA", type: "method-call", evidence: "ComponentA.run()" },
      { from: "ApexClass:ComponentC", to: "ApexClass:ComponentB", type: "method-call", evidence: "ComponentB.doWork()" },
      // ComponentA -> SharedCoreService, ComponentB -> SharedCoreService
      { from: "ApexClass:ComponentA", to: "ApexClass:SharedCoreService", type: "method-call", evidence: "SharedCoreService.execute()" },
      { from: "ApexClass:ComponentB", to: "ApexClass:SharedCoreService", type: "method-call", evidence: "SharedCoreService.execute()" },
      // Cycle: CycleClassX <-> CycleClassY
      { from: "ApexClass:CycleClassX", to: "ApexClass:CycleClassY", type: "method-call", evidence: "CycleClassY.call()" },
      { from: "ApexClass:CycleClassY", to: "ApexClass:CycleClassX", type: "method-call", evidence: "CycleClassX.call()" },
      // ComponentA -> UnsafeClass
      { from: "ApexClass:ComponentA", to: "ApexClass:UnsafeClass", type: "method-call", evidence: "UnsafeClass.rawExecute()" }
    ]
  };

  // -------------------------------------------------------------
  // Test 1: Simple Linear Dependency
  // ComponentA depends on ComponentB. ComponentB must precede ComponentA.
  // -------------------------------------------------------------
  console.log("Test 1: Simple linear dependency...");
  {
    const result = determineRefactoringSequence(["ComponentA", "ComponentB"], graph, registry);
    assert.strictEqual(validateDeterministicResult(result), true, "Result must satisfy contract");
    const seq = result.sequence;
    assert.strictEqual(seq.length, 2);

    const posB = seq.findIndex(s => s.component === "ComponentB");
    const posA = seq.findIndex(s => s.component === "ComponentA");

    assert.ok(posB < posA, "Prerequisite ComponentB must come before dependent ComponentA");
    assert.strictEqual(seq[posB].sequencePosition, 1);
    assert.strictEqual(seq[posA].sequencePosition, 2);
    assert.ok(seq[posA].prerequisites.includes("ApexClass:ComponentB"));
    console.log("  ✓ Test 1 PASSED (Linear dependency correctly ordered: B before A)");
  }

  // -------------------------------------------------------------
  // Test 2: Branching Dependency
  // ComponentC depends on A and B. A depends on B. Order: B, A, C.
  // -------------------------------------------------------------
  console.log("Test 2: Branching dependency...");
  {
    const result = determineRefactoringSequence(["ComponentC", "ComponentA", "ComponentB"], graph, registry);
    const seq = result.sequence;
    assert.strictEqual(seq.length, 3);

    const posB = seq.findIndex(s => s.component === "ComponentB");
    const posA = seq.findIndex(s => s.component === "ComponentA");
    const posC = seq.findIndex(s => s.component === "ComponentC");

    assert.ok(posB < posA, "ComponentB before ComponentA");
    assert.ok(posA < posC, "ComponentA before ComponentC");
    assert.strictEqual(seq[posC].sequencePosition, 3);
    console.log("  ✓ Test 2 PASSED (Branching topological ordering verified: B -> A -> C)");
  }

  // -------------------------------------------------------------
  // Test 3: Shared Bottleneck
  // SharedCoreService is depended on by A and B. It must be prioritized first.
  // -------------------------------------------------------------
  console.log("Test 3: Shared bottleneck prioritization...");
  {
    const result = determineRefactoringSequence(["ComponentA", "ComponentB", "SharedCoreService"], graph, registry);
    const seq = result.sequence;
    assert.strictEqual(seq[0].component, "SharedCoreService", "SharedCoreService must be ranked first as foundational bottleneck");
    assert.ok(seq[0].evidence.some(e => e.rule === "unblocks-dependents" || e.rule === "topological-position"));
    console.log("  ✓ Test 3 PASSED (Shared bottleneck core service ranked at sequence position 1)");
  }

  // -------------------------------------------------------------
  // Test 4: Prerequisite Ordering
  // -------------------------------------------------------------
  console.log("Test 4: Explicit prerequisite relationship tracking...");
  {
    const { prerequisiteMap, dependentMap } = buildPrerequisiteGraph(
      [{ candidateId: "ApexClass:ComponentA" }, { candidateId: "ApexClass:ComponentB" }],
      graph
    );
    assert.ok(prerequisiteMap.get("ApexClass:ComponentA").has("ApexClass:ComponentB"));
    assert.ok(dependentMap.get("ApexClass:ComponentB").has("ApexClass:ComponentA"));
    console.log("  ✓ Test 4 PASSED (Prerequisite & dependent maps constructed accurately)");
  }

  // -------------------------------------------------------------
  // Test 5: Independent Components & Deterministic Tie-Breaking
  // IndependentAlpha and IndependentBeta have zero dependencies between each other.
  // Must sort deterministically by name / ID tie-breaker.
  // -------------------------------------------------------------
  console.log("Test 5: Independent components & deterministic tie-breaking...");
  {
    const res1 = determineRefactoringSequence(["IndependentBeta", "IndependentAlpha"], graph, registry);
    const res2 = determineRefactoringSequence(["IndependentAlpha", "IndependentBeta"], graph, registry);

    const names1 = res1.sequence.map(s => s.component);
    const names2 = res2.sequence.map(s => s.component);

    assert.deepStrictEqual(names1, names2, "Ordering must be identical regardless of input array order");
    assert.strictEqual(names1[0], "IndependentAlpha");
    assert.strictEqual(names1[1], "IndependentBeta");
    console.log("  ✓ Test 5 PASSED (Independent components ordered deterministically)");
  }

  // -------------------------------------------------------------
  // Test 6: Cycle Handling
  // CycleClassX <-> CycleClassY. Algorithm must break cycle safely without crashing/infinite loop.
  // -------------------------------------------------------------
  console.log("Test 6: Cycle handling & safe cycle resolution...");
  {
    const result = determineRefactoringSequence(["CycleClassX", "CycleClassY"], graph, registry);
    assert.strictEqual(result.sequence.length, 2);
    assert.strictEqual(result.metadata.cyclesDetected, true, "Cycles in candidate set must be flagged");
    console.log("  ✓ Test 6 PASSED (Cycles handled safely and flagged in metadata)");
  }

  // -------------------------------------------------------------
  // Test 7: High Business-Criticality vs High Structural Impact
  // Business criticality evidence preserved separately without warping topological order.
  // -------------------------------------------------------------
  console.log("Test 7: Business criticality vs structural impact separation...");
  {
    const result = determineRefactoringSequence(["BizCriticalService", "ComponentA", "SharedCoreService"], graph, registry);
    const bizItem = result.sequence.find(s => s.component === "BizCriticalService");
    assert.ok(bizItem, "BizCriticalService included in sequence");
    assert.strictEqual(bizItem.businessCriticality, "high", "Explicit business criticality correctly reported");
    assert.ok(bizItem.evidence.some(e => e.rule === "explicit-business-criticality"));
    console.log("  ✓ Test 7 PASSED (Business criticality preserved separately from structural topological order)");
  }

  // -------------------------------------------------------------
  // Test 8: Safety Blocker
  // UnsafeClass has known coverage failure (40%), classified as HIGH_CAUTION and flagged in blockers.
  // -------------------------------------------------------------
  console.log("Test 8: Safety blocker & HIGH_CAUTION safety envelope...");
  {
    const result = determineRefactoringSequence(["ComponentA", "UnsafeClass"], graph, registry);
    const unsafeItem = result.sequence.find(s => s.component === "UnsafeClass");
    assert.strictEqual(unsafeItem.safetyClassification, "HIGH_CAUTION");

    const aItem = result.sequence.find(s => s.component === "ComponentA");
    const blocker = aItem.blockers.find(b => b.blockerName === "UnsafeClass");
    assert.ok(blocker, "UnsafeClass flagged as blocker for ComponentA");
    assert.strictEqual(blocker.reason, "safety-blocker");
    console.log("  ✓ Test 8 PASSED (HIGH_CAUTION envelope & safety blockers correctly generated)");
  }

  // -------------------------------------------------------------
  // Test 9: Incomplete Evidence & Unknown Inputs
  // Unknown component stays unknown.
  // -------------------------------------------------------------
  console.log("Test 9: Incomplete evidence & unknown component handling...");
  {
    const result = determineRefactoringSequence(["UnknownComponentX", "ComponentB"], graph, registry);
    const unknownItem = result.sequence.find(s => s.component === "UnknownComponentX");
    assert.strictEqual(unknownItem.safetyClassification, "UNKNOWN");
    assert.strictEqual(unknownItem.confidence, "unknown");
    assert.ok(unknownItem.evidence.some(e => e.rule === "unresolved-input"));
    console.log("  ✓ Test 9 PASSED (Unknown inputs correctly yield UNKNOWN safety and unknown confidence)");
  }

  // -------------------------------------------------------------
  // Test 10: Deterministic Authority
  // Deterministic sequencing facts overwrite contradicting semantic claims.
  // -------------------------------------------------------------
  console.log("Test 10: Deterministic authority enforcement...");
  {
    const detFact = "ComponentB must be refactored before ComponentA";
    const semClaim = "ComponentA should be refactored before ComponentB";
    const authority = enforceDeterministicAuthority(detFact, semClaim);
    assert.strictEqual(authority.contradiction, true);
    assert.strictEqual(authority.authoritativeValue, detFact);
    console.log("  ✓ Test 10 PASSED (Deterministic authority over conflicting LLM observation enforced)");
  }

  // -------------------------------------------------------------
  // Test 11: Zero LLM / Runtime Dependency Audit
  // -------------------------------------------------------------
  console.log("Test 11: Zero LLM runtime dependency audit...");
  {
    const code = fs.readFileSync(path.join(__dirname, "../refactoring-sequencer.cjs"), "utf8");
    assert.strictEqual(code.includes("LlmClient"), false, "Must not contain LlmClient");
    assert.strictEqual(code.includes("semantic-investigation-service"), false, "Must not import semantic-investigation-service");
    assert.strictEqual(code.includes("CacheManager"), false, "Must not import CacheManager");
    console.log("  ✓ Test 11 PASSED (0 LLM imports or runtime calls verified in refactoring-sequencer.cjs)");
  }

  console.log("\nALL 11 DETERMINISTIC REFACTORING SEQUENCING TESTS PASSED SUCCESSFULLY!");
}

if (require.main === module) {
  try {
    runTests();
  } catch (error) {
    console.error("\nTest suite failed:", error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}
