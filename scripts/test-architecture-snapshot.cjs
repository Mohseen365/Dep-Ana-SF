/**
 * Test Suite for Canonical Architecture Snapshot (WAVE-E1)
 * ==========================================================
 *
 * Verifies:
 *   1. Snapshot generation
 *   2. Schema validation
 *   3. Deterministic repeated generation
 *   4. Stable component ordering
 *   5. Stable relationship ordering
 *   6. UNKNOWN preservation
 *   7. Authority preservation
 *   8. Snapshot identity stability
 *   9. Minimal/empty architecture
 *  10. Representative full architecture
 *  11. Backward compatibility
 *  12. Zero LLM calls verification
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  createCanonicalArchitectureSnapshot,
  computeSnapshotIdentity,
  validateArchitectureSnapshot,
  SNAPSHOT_SCHEMA_VERSION,
  CURRENT_ANALYZER_VERSION
} = require("../architecture-snapshot.cjs");

const {
  analyze,
  getAnalysis
} = require("../dependency-analyzer.cjs");

const { enforceDeterministicAuthority } = require("../deterministic/contract.cjs");

let FIXTURE_DIR = path.resolve(
  __dirname,
  "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default"
);

if (!fs.existsSync(FIXTURE_DIR)) {
  FIXTURE_DIR = path.join(__dirname, "temp-snapshot-test-fixture");
  if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(path.join(FIXTURE_DIR, "classes"), { recursive: true });
    fs.writeFileSync(
      path.join(FIXTURE_DIR, "classes/ClassA.cls"),
      `public class ClassA { public static void doWork() { ClassB.doHelp(); } }`
    );
    fs.writeFileSync(
      path.join(FIXTURE_DIR, "classes/ClassB.cls"),
      `public class ClassB { public static void doHelp() { ClassA.doWork(); } }`
    );
  }
}

console.log("Running Canonical Architecture Snapshot Test Suite (WAVE-E1)...");
console.log("================================================================");

// ---------------------------------------------------------------------------
// Test 1: Snapshot generation
// ---------------------------------------------------------------------------
console.log("Test 1: Snapshot generation...");
{
  const snap = createCanonicalArchitectureSnapshot({
    sourceDir: FIXTURE_DIR,
    registry: { symbols: [] },
    graph: { nodes: [], edges: [] }
  });

  assert.strictEqual(typeof snap, "object", "Snapshot must be an object");
  assert.strictEqual(snap.schemaVersion, SNAPSHOT_SCHEMA_VERSION, "Schema version must match SNAPSHOT_SCHEMA_VERSION");
  assert.strictEqual(snap.analyzerVersion, CURRENT_ANALYZER_VERSION, "Analyzer version must match CURRENT_ANALYZER_VERSION");
  assert.ok(snap.snapshotIdentity.startsWith("arch-snap-sha256:"), "Snapshot identity must start with arch-snap-sha256:");
  console.log("  ✓ Test 1 PASSED (Snapshot generation verified)");
}

// ---------------------------------------------------------------------------
// Test 2: Schema validation
// ---------------------------------------------------------------------------
console.log("Test 2: Schema validation...");
{
  const snap = createCanonicalArchitectureSnapshot({
    sourceDir: FIXTURE_DIR,
    registry: { symbols: [{ id: "ApexClass:A", name: "A", type: "ApexClass" }] },
    graph: { nodes: [{ id: "ApexClass:A" }], edges: [] }
  });

  const validation = validateArchitectureSnapshot(snap);
  assert.strictEqual(validation.valid, true, `Validation failed: ${validation.errors.join(", ")}`);
  assert.strictEqual(validation.errors.length, 0);

  const invalidValidation = validateArchitectureSnapshot({});
  assert.strictEqual(invalidValidation.valid, false, "Invalid object must fail validation");
  assert.ok(invalidValidation.errors.length > 0);

  console.log("  ✓ Test 2 PASSED (Schema validation verified)");
}

// ---------------------------------------------------------------------------
// Test 3: Deterministic repeated generation
// ---------------------------------------------------------------------------
console.log("Test 3: Deterministic repeated generation...");
{
  const mockRegistry = {
    symbols: [
      { id: "ApexClass:BService", name: "BService", type: "ApexClass" },
      { id: "ApexClass:AController", name: "AController", type: "ApexClass" }
    ]
  };
  const mockGraph = {
    nodes: [
      { id: "ApexClass:BService" },
      { id: "ApexClass:AController" }
    ],
    edges: [
      { from: "ApexClass:AController", to: "ApexClass:BService", type: "method-call", method: "doWork", evidence: "BService.doWork()" }
    ]
  };

  const snap1 = createCanonicalArchitectureSnapshot({ registry: mockRegistry, graph: mockGraph, sourceDir: FIXTURE_DIR });
  const snap2 = createCanonicalArchitectureSnapshot({ registry: mockRegistry, graph: mockGraph, sourceDir: FIXTURE_DIR });

  assert.strictEqual(snap1.snapshotIdentity, snap2.snapshotIdentity, "Snapshot identity must be identical across repeated generations");
  assert.deepStrictEqual(snap1.components, snap2.components, "Components array must be strictly identical across repeated runs");
  assert.deepStrictEqual(snap1.relationships, snap2.relationships, "Relationships array must be strictly identical across repeated runs");

  console.log("  ✓ Test 3 PASSED (100% repeatable snapshot generation verified)");
}

// ---------------------------------------------------------------------------
// Test 4: Stable component ordering
// ---------------------------------------------------------------------------
console.log("Test 4: Stable component ordering...");
{
  // Input components out of alphabetical order
  const mockRegistryUnsorted = {
    symbols: [
      { id: "ApexClass:ZebraService", name: "ZebraService", type: "ApexClass" },
      { id: "ApexClass:AlphaController", name: "AlphaController", type: "ApexClass" },
      { id: "ApexClass:MiddleManager", name: "MiddleManager", type: "ApexClass" }
    ]
  };

  const snap = createCanonicalArchitectureSnapshot({ registry: mockRegistryUnsorted, graph: { nodes: [], edges: [] } });
  const componentIds = snap.components.map(c => c.id);

  assert.deepStrictEqual(componentIds, [
    "ApexClass:AlphaController",
    "ApexClass:MiddleManager",
    "ApexClass:ZebraService"
  ], "Components must be deterministically sorted by ID");

  console.log("  ✓ Test 4 PASSED (Component ordering determinism verified)");
}

// ---------------------------------------------------------------------------
// Test 5: Stable relationship ordering
// ---------------------------------------------------------------------------
console.log("Test 5: Stable relationship ordering...");
{
  const mockEdgesUnsorted = [
    { from: "ApexClass:Zebra", to: "ApexClass:Alpha", type: "method-call", method: "bMethod" },
    { from: "ApexClass:Alpha", to: "ApexClass:Beta", type: "instantiation", method: null },
    { from: "ApexClass:Alpha", to: "ApexClass:Alpha", type: "type-reference", method: null },
    { from: "ApexClass:Zebra", to: "ApexClass:Alpha", type: "method-call", method: "aMethod" }
  ];

  const snap = createCanonicalArchitectureSnapshot({
    registry: { symbols: [] },
    graph: { nodes: [], edges: mockEdgesUnsorted }
  });

  const relKeys = snap.relationships.map(r => `${r.from}|${r.to}|${r.type}|${r.method || ""}`);
  const sortedKeys = [...relKeys].sort();

  assert.deepStrictEqual(relKeys, sortedKeys, "Relationships must be deterministically sorted by from, to, type, method, evidence");

  console.log("  ✓ Test 5 PASSED (Relationship ordering determinism verified)");
}

// ---------------------------------------------------------------------------
// Test 6: UNKNOWN preservation
// ---------------------------------------------------------------------------
console.log("Test 6: UNKNOWN preservation...");
{
  const mockSymbol = { id: "ApexClass:UnknownComp", name: "UnknownComp", type: "ApexClass" };
  const snap = createCanonicalArchitectureSnapshot({
    registry: { symbols: [mockSymbol] },
    graph: { nodes: [{ id: "ApexClass:UnknownComp" }], edges: [] }
  });

  const comp = snap.components.find(c => c.id === "ApexClass:UnknownComp");
  assert.ok(comp, "Component must be present");
  assert.strictEqual(comp.safetyEnvelope.classification, "UNKNOWN", "Safety envelope must remain UNKNOWN when unclassified");
  assert.strictEqual(comp.role.primary, "unknown", "Role must remain unknown when unclassified");

  console.log("  ✓ Test 6 PASSED (UNKNOWN classification preservation verified)");
}

// ---------------------------------------------------------------------------
// Test 7: Authority preservation
// ---------------------------------------------------------------------------
console.log("Test 7: Authority preservation...");
{
  const deterministicFact = "with sharing";
  const conflictingLLMObservation = "without sharing";

  const authorityResult = enforceDeterministicAuthority(deterministicFact, conflictingLLMObservation);

  assert.strictEqual(authorityResult.authoritativeValue, "with sharing", "Deterministic fact must be retained");
  assert.strictEqual(authorityResult.contradiction, true, "Contradiction must be flagged");
  assert.strictEqual(authorityResult.source, "deterministic", "Source must remain deterministic");

  console.log("  ✓ Test 7 PASSED (Deterministic authority over contradictory observations verified)");
}

// ---------------------------------------------------------------------------
// Test 8: Snapshot identity stability
// ---------------------------------------------------------------------------
console.log("Test 8: Snapshot identity stability...");
{
  const stateA = {
    schemaVersion: 5,
    analyzerVersion: "13",
    sourceDirectory: "force-app/main/default",
    components: [{ id: "A", name: "A" }],
    relationships: [],
    cycles: []
  };

  const id1 = computeSnapshotIdentity(stateA);
  const id2 = computeSnapshotIdentity(stateA);

  assert.strictEqual(id1, id2, "Snapshot identity must be identical for identical logical states");

  // Modify logical state
  const stateB = { ...stateA, components: [{ id: "A", name: "A" }, { id: "B", name: "B" }] };
  const id3 = computeSnapshotIdentity(stateB);

  assert.notStrictEqual(id1, id3, "Snapshot identity must differ when logical state changes");

  console.log("  ✓ Test 8 PASSED (Snapshot identity stability verified)");
}

// ---------------------------------------------------------------------------
// Test 9: Minimal / empty architecture
// ---------------------------------------------------------------------------
console.log("Test 9: Minimal / empty architecture...");
{
  const snap = createCanonicalArchitectureSnapshot({
    registry: { symbols: [] },
    graph: { nodes: [], edges: [] },
    sourceDir: "empty/dir"
  });

  assert.strictEqual(snap.components.length, 0);
  assert.strictEqual(snap.relationships.length, 0);
  assert.strictEqual(snap.cycles.length, 0);
  assert.strictEqual(snap.metadata.fileCount, 0);
  assert.strictEqual(validateArchitectureSnapshot(snap).valid, true);

  console.log("  ✓ Test 9 PASSED (Minimal / empty architecture handled gracefully)");
}

// ---------------------------------------------------------------------------
// Test 10: Representative full architecture
// ---------------------------------------------------------------------------
console.log("Test 10: Representative full architecture...");
{
  // Pass writeOutputs = false (3rd param) so analyze() executes in-memory
  // without mutating shared repository output paths or canonical manifests.
  const result = analyze(FIXTURE_DIR, { maxGraphEdges: 10000 }, false);

  const snap = createCanonicalArchitectureSnapshot({
    registry: result.registry,
    graph: result.graph,
    metricList: result.metricList,
    cycles: result.cycles,
    sourceDir: FIXTURE_DIR
  });

  assert.strictEqual(validateArchitectureSnapshot(snap).valid, true);
  assert.ok(snap.components.length > 0, "Components must be present for full analysis");
  assert.ok(snap.relationships.length > 0, "Relationships must be present for full analysis");
  assert.ok(snap.cycles.length > 0, "Cycles must be present for full analysis");

  console.log("  ✓ Test 10 PASSED (Representative full architecture verified)");
}

// ---------------------------------------------------------------------------
// Test 11: Backward compatibility
// ---------------------------------------------------------------------------
console.log("Test 11: Backward compatibility...");
{
  // Search pre-existing project artifact directories first before root/analyze
  const candidateDirs = [
    path.resolve(__dirname, "../analyze/projects/pbim"),
    path.resolve(__dirname, "../explorer/public/projects/pbim"),
    path.resolve(__dirname, ".."),
    path.resolve(__dirname, "../analyze"),
    process.cwd()
  ];

  const manifestDir = candidateDirs.find(d => fs.existsSync(path.join(d, "analysis-manifest.json")));
  assert.ok(manifestDir, "analysis-manifest.json must exist after analyze in one of the expected output directories");

  const manifestPath = path.join(manifestDir, "analysis-manifest.json");
  const snapshotPath = path.join(manifestDir, "architecture-snapshot.json");
  const depReportPath = path.join(manifestDir, "dependency-report.json");

  assert.ok(fs.existsSync(snapshotPath), "architecture-snapshot.json must exist after analyze");
  assert.ok(fs.existsSync(depReportPath), "dependency-report.json must exist after analyze");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.ok(manifest.artifacts.architectureSnapshot, "architectureSnapshot artifact must be present in analysis manifest");

  console.log("  ✓ Test 11 PASSED (Backward compatibility & legacy artifact integrity verified)");
}

// ---------------------------------------------------------------------------
// Test 12: Zero LLM calls verification
// ---------------------------------------------------------------------------
console.log("Test 12: Zero LLM calls verification...");
{
  const code = fs.readFileSync(path.resolve(__dirname, "../architecture-snapshot.cjs"), "utf8");

  assert.ok(!code.includes("LlmClient"), "architecture-snapshot.cjs must NOT import LlmClient");
  assert.ok(!code.includes("semantic-investigation-service"), "architecture-snapshot.cjs must NOT import semantic-investigation-service");
  assert.ok(!code.includes("CacheManager"), "architecture-snapshot.cjs must NOT import CacheManager");

  console.log("  ✓ Test 12 PASSED (0 LLM imports or runtime dependencies verified in architecture-snapshot.cjs)");
}

console.log("");
console.log("ALL 12 CANONICAL ARCHITECTURE SNAPSHOT TESTS PASSED SUCCESSFULLY!");
