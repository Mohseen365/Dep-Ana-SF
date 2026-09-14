/**
 * Comprehensive Test Suite for Deterministic Architecture Snapshot Diff Engine
 * =========================================================================
 *
 * Tests:
 *   1. Identical snapshots produce zero changes.
 *   2. Reordered input arrays produce identical deterministic outputs.
 *   3. Added node and added edge (e.g. A->B -> A->B->C).
 *   4. Removed node and removed edge.
 *   5. Changed node metadata (risk, coupling, role, layer, safety envelope, etc.).
 *   6. Changed edge method (method update in edge relationship).
 *   7. Introduced and removed circular dependency cycles (canonical node sets).
 *   8. Introduced and removed unresolved references.
 *   9. Incompatible schema / version handling throws explicit errors.
 *   10. Empty snapshots produce empty diff result.
 */

"use strict";

const assert = require("assert");
const {
  diffSnapshots,
  validateSnapshotCompatibility,
  getNodeIdentity,
  getEdgeIdentity,
  getCanonicalCycle,
  DIFF_SCHEMA_VERSION,
} = require("../architecture-diff.cjs");

console.log("==========================================================");
console.log("Running Deterministic Architecture Diff Engine Tests");
console.log("==========================================================");

function createMockSnapshot(overrides = {}) {
  return {
    schemaVersion: 5,
    analyzerVersion: "13",
    snapshotIdentity:
      overrides.snapshotIdentity || "arch-snap-sha256:test-base",
    components: overrides.components || [],
    relationships: overrides.relationships || [],
    cycles: overrides.cycles || [],
    unresolvedReferences: overrides.unresolvedReferences || [],
  };
}

// TEST 1: Identical snapshots produce zero changes
console.log("Test 1: Identical snapshots produce zero changes...");
{
  const snapA = createMockSnapshot({
    components: [
      {
        id: "ApexClass:A",
        name: "A",
        type: "ApexClass",
        metrics: { risk: "LOW", coupling: 1 },
      },
      {
        id: "ApexClass:B",
        name: "B",
        type: "ApexClass",
        metrics: { risk: "LOW", coupling: 1 },
      },
    ],
    relationships: [
      {
        from: "ApexClass:A",
        to: "ApexClass:B",
        type: "method-call",
        method: "doStuff",
      },
    ],
  });

  const diff = diffSnapshots(snapA, snapA);
  assert.strictEqual(diff.hasChanges, false);
  assert.strictEqual(diff.summary.totalChangesCount, 0);
  assert.strictEqual(diff.addedNodes.length, 0);
  assert.strictEqual(diff.removedNodes.length, 0);
  assert.strictEqual(diff.changedNodes.length, 0);
  assert.strictEqual(diff.addedEdges.length, 0);
  assert.strictEqual(diff.removedEdges.length, 0);
}
console.log("  ✓ PASS: Zero changes for identical snapshots.\n");

// TEST 2: Reordered input arrays produce identical deterministic outputs
console.log("Test 2: Reordered input arrays produce identical outputs...");
{
  const snap1 = createMockSnapshot({
    components: [
      { id: "ApexClass:A", name: "A", type: "ApexClass" },
      { id: "ApexClass:B", name: "B", type: "ApexClass" },
      { id: "ApexClass:C", name: "C", type: "ApexClass" },
    ],
    relationships: [
      {
        from: "ApexClass:A",
        to: "ApexClass:B",
        type: "method-call",
        method: "m1",
      },
      {
        from: "ApexClass:B",
        to: "ApexClass:C",
        type: "method-call",
        method: "m2",
      },
    ],
    cycles: [["ApexClass:A", "ApexClass:B"]],
  });

  const snap2 = createMockSnapshot({
    components: [
      { id: "ApexClass:C", name: "C", type: "ApexClass" },
      { id: "ApexClass:A", name: "A", type: "ApexClass" },
      { id: "ApexClass:B", name: "B", type: "ApexClass" },
    ],
    relationships: [
      {
        from: "ApexClass:B",
        to: "ApexClass:C",
        type: "method-call",
        method: "m2",
      },
      {
        from: "ApexClass:A",
        to: "ApexClass:B",
        type: "method-call",
        method: "m1",
      },
    ],
    cycles: [["ApexClass:B", "ApexClass:A"]],
  });

  const diff = diffSnapshots(snap1, snap2);
  assert.strictEqual(diff.hasChanges, false);
  assert.strictEqual(diff.summary.totalChangesCount, 0);
}
console.log("  ✓ PASS: Input array reordering is completely deterministic.\n");

// TEST 3: Prompt Example: A -> B transformed into A -> B -> C (Node C added, Edge B->C added)
console.log("Test 3: Prompt Example: A -> B transformed to A -> B -> C...");
{
  const before = createMockSnapshot({
    components: [
      { id: "ApexClass:A", name: "A", type: "ApexClass" },
      { id: "ApexClass:B", name: "B", type: "ApexClass" },
    ],
    relationships: [
      {
        from: "ApexClass:A",
        to: "ApexClass:B",
        type: "method-call",
        method: "execute",
      },
    ],
  });

  const after = createMockSnapshot({
    components: [
      { id: "ApexClass:A", name: "A", type: "ApexClass" },
      { id: "ApexClass:B", name: "B", type: "ApexClass" },
      { id: "ApexClass:C", name: "C", type: "ApexClass" },
    ],
    relationships: [
      {
        from: "ApexClass:A",
        to: "ApexClass:B",
        type: "method-call",
        method: "execute",
      },
      {
        from: "ApexClass:B",
        to: "ApexClass:C",
        type: "method-call",
        method: "process",
      },
    ],
  });

  const diff = diffSnapshots(before, after);
  assert.strictEqual(diff.hasChanges, true);
  assert.strictEqual(diff.summary.addedNodesCount, 1);
  assert.strictEqual(diff.addedNodes[0].id, "ApexClass:C");
  assert.strictEqual(diff.summary.addedEdgesCount, 1);
  assert.strictEqual(diff.addedEdges[0].source, "ApexClass:B");
  assert.strictEqual(diff.addedEdges[0].target, "ApexClass:C");
  assert.strictEqual(diff.addedEdges[0].method, "process");
}
console.log("  ✓ PASS: Correctly detected node C added and edge B->C added.\n");

// TEST 4: Removed node and removed edge
console.log("Test 4: Removed node and removed edge...");
{
  const before = createMockSnapshot({
    components: [
      { id: "ApexClass:A", name: "A", type: "ApexClass" },
      { id: "ApexClass:B", name: "B", type: "ApexClass" },
    ],
    relationships: [
      {
        from: "ApexClass:A",
        to: "ApexClass:B",
        type: "method-call",
        method: "callB",
      },
    ],
  });

  const after = createMockSnapshot({
    components: [{ id: "ApexClass:A", name: "A", type: "ApexClass" }],
    relationships: [],
  });

  const diff = diffSnapshots(before, after);
  assert.strictEqual(diff.hasChanges, true);
  assert.strictEqual(diff.summary.removedNodesCount, 1);
  assert.strictEqual(diff.removedNodes[0].id, "ApexClass:B");
  assert.strictEqual(diff.summary.removedEdgesCount, 1);
  assert.strictEqual(diff.removedEdges[0].source, "ApexClass:A");
  assert.strictEqual(diff.removedEdges[0].target, "ApexClass:B");
}
console.log("  ✓ PASS: Removed node and removed edge detected.\n");

// TEST 5: Changed node risk, coupling, role, layer, safety envelope
console.log(
  "Test 5: Changed node metadata (risk, coupling, role, layer, safetyEnvelope)...",
);
{
  const before = createMockSnapshot({
    components: [
      {
        id: "ApexClass:A",
        name: "A",
        type: "ApexClass",
        risk: "LOW",
        metrics: { coupling: 2, fanIn: 1, fanOut: 1 },
        role: { primary: "utility" },
        layer: { primary: "domain" },
        safetyEnvelope: { classification: "SAFE" },
      },
    ],
  });

  const after = createMockSnapshot({
    components: [
      {
        id: "ApexClass:A",
        name: "A",
        type: "ApexClass",
        risk: "HIGH",
        metrics: { coupling: 15, fanIn: 10, fanOut: 5 },
        role: { primary: "service" },
        layer: { primary: "service" },
        safetyEnvelope: { classification: "HIGH_RISK" },
      },
    ],
  });

  const diff = diffSnapshots(before, after);
  assert.strictEqual(diff.hasChanges, true);
  assert.strictEqual(diff.summary.changedNodesCount, 1);
  const changed = diff.changedNodes[0];
  assert.strictEqual(changed.id, "ApexClass:A");

  const propertiesChanged = changed.changes.map((c) => c.property);
  assert.ok(propertiesChanged.includes("risk"));
  assert.ok(propertiesChanged.includes("coupling"));
  assert.ok(propertiesChanged.includes("fanIn"));
  assert.ok(propertiesChanged.includes("fanOut"));
  assert.ok(propertiesChanged.includes("role"));
  assert.ok(propertiesChanged.includes("layer"));
  assert.ok(propertiesChanged.includes("safetyEnvelope"));

  const riskChange = changed.changes.find((c) => c.property === "risk");
  assert.strictEqual(riskChange.before, "LOW");
  assert.strictEqual(riskChange.after, "HIGH");
}
console.log("  ✓ PASS: Changed node metadata correctly captured.\n");

// TEST 6: Changed edge method (represented as removed edge with old method + added edge with new method)
console.log("Test 6: Changed edge method...");
{
  const before = createMockSnapshot({
    relationships: [
      {
        from: "ApexClass:A",
        to: "ApexClass:B",
        type: "method-call",
        method: "oldMethod",
      },
    ],
  });

  const after = createMockSnapshot({
    relationships: [
      {
        from: "ApexClass:A",
        to: "ApexClass:B",
        type: "method-call",
        method: "newMethod",
      },
    ],
  });

  const diff = diffSnapshots(before, after);
  assert.strictEqual(diff.hasChanges, true);
  assert.strictEqual(diff.summary.removedEdgesCount, 1);
  assert.strictEqual(diff.removedEdges[0].method, "oldMethod");
  assert.strictEqual(diff.summary.addedEdgesCount, 1);
  assert.strictEqual(diff.addedEdges[0].method, "newMethod");
}
console.log(
  "  ✓ PASS: Changed edge method properly tracked as semantic relationship update.\n",
);

// TEST 7: Introduced cycle & removed cycle (canonical node sets)
console.log(
  "Test 7: Introduced cycle and removed cycle using canonical node sets...",
);
{
  const before = createMockSnapshot({
    cycles: [["ApexClass:X", "ApexClass:Y"]],
  });

  const after = createMockSnapshot({
    cycles: [["ApexClass:A", "ApexClass:B", "ApexClass:C"]],
  });

  const diff = diffSnapshots(before, after);
  assert.strictEqual(diff.hasChanges, true);
  assert.strictEqual(diff.summary.removedCyclesCount, 1);
  assert.strictEqual(
    diff.cycleChanges.removed[0].id,
    "ApexClass:X::ApexClass:Y",
  );
  assert.strictEqual(diff.summary.addedCyclesCount, 1);
  assert.strictEqual(
    diff.cycleChanges.added[0].id,
    "ApexClass:A::ApexClass:B::ApexClass:C",
  );
}
console.log(
  "  ✓ PASS: Cycle additions and removals compared via canonical node sets.\n",
);

// TEST 8: Introduced and removed unresolved reference
console.log("Test 8: Introduced and removed unresolved references...");
{
  const before = createMockSnapshot({
    unresolvedReferences: [
      {
        sourceNodeId: "ApexClass:A",
        targetName: "OldExt",
        targetType: "External",
        file: "classes/A.cls",
      },
    ],
  });

  const after = createMockSnapshot({
    unresolvedReferences: [
      {
        sourceNodeId: "ApexClass:A",
        targetName: "NewExt",
        targetType: "External",
        file: "classes/A.cls",
      },
    ],
  });

  const diff = diffSnapshots(before, after);
  assert.strictEqual(diff.hasChanges, true);
  assert.strictEqual(diff.summary.removedUnresolvedReferencesCount, 1);
  assert.strictEqual(
    diff.unresolvedReferenceChanges.removed[0].targetName,
    "OldExt",
  );
  assert.strictEqual(diff.summary.addedUnresolvedReferencesCount, 1);
  assert.strictEqual(
    diff.unresolvedReferenceChanges.added[0].targetName,
    "NewExt",
  );
}
console.log("  ✓ PASS: Unresolved reference changes correctly detected.\n");

// TEST 9: Incompatible schema handling
console.log("Test 9: Incompatible schema handling...");
{
  const snapV1 = { schemaVersion: 1, components: [] };
  const snapV2 = { schemaVersion: 2, components: [] };

  assert.throws(() => {
    diffSnapshots(snapV1, snapV2);
  }, /Incompatible snapshot schemaVersion/);

  assert.throws(() => {
    diffSnapshots(null, snapV2);
  }, /Invalid snapshot/);

  assert.throws(() => {
    diffSnapshots({ components: [] }, snapV2);
  }, /missing required 'schemaVersion'/);
}
console.log("  ✓ PASS: Schema/version incompatibilities throw clear errors.\n");

// TEST 10: Empty snapshots produce zero diff
console.log("Test 10: Empty snapshots produce zero diff...");
{
  const emptyBefore = createMockSnapshot();
  const emptyAfter = createMockSnapshot();

  const diff = diffSnapshots(emptyBefore, emptyAfter);
  assert.strictEqual(diff.hasChanges, false);
  assert.strictEqual(diff.summary.totalChangesCount, 0);
}
console.log("  ✓ PASS: Empty snapshots work seamlessly.\n");

console.log("==========================================================");
console.log("ALL ARCHITECTURE SNAPSHOT DIFF ENGINE TESTS PASSED (100%)");
console.log("==========================================================");
