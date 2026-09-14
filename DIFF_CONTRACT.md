# Architecture Snapshot Diff Contract (WAVE-D1 / TRACK E)

## Overview

The Architecture Snapshot Diff Engine provides deterministic structural diffing between two canonical Architecture Snapshots (or ExplorerData snapshots).

The engine strictly complies with zero LLM runtime dependencies and enforces stable identities across nodes, edges, cycles, and unresolved references regardless of array ordering or execution environment.

---

## Engine Interface

```js
const { diffSnapshots } = require("./architecture-diff.cjs");

const diffResult = diffSnapshots(beforeSnapshot, afterSnapshot, options);
```

### Parameters

- `before` (`Object`): Baseline canonical Architecture Snapshot or ExplorerData object. Must contain `schemaVersion`.
- `after` (`Object`): Target canonical Architecture Snapshot or ExplorerData object. Must contain `schemaVersion`.
- `options` (`Object`, optional): Additional options reserved for future extensibility.

---

## Identity Specifications

### 1. Node Identity

- **Formula:** `Type:Name` (e.g. `ApexClass:BouquetOrderController`).
- Unstable internal array indices or database IDs are ignored.

### 2. Edge / Relationship Identity

- **Formula:** `SourceNodeId|TargetNodeId|RelationshipType|Method`
- **Example:** `ApexClass:ServiceA|ApexClass:ServiceB|method-call|execute`
- Method is included as part of the identity because changing an invoked method represents a structural relationship change.

### 3. Cycle Identity

- **Formula:** Joined sorted node IDs: `Node1::Node2::...::NodeN`
- **Example:** `ApexClass:CircularA::ApexClass:CircularB`
- Cycle comparison relies strictly on canonical sorted node sets rather than unstable cycle IDs (`cycle-1`).

### 4. Unresolved Reference Identity

- **Formula:** `SourceNodeId|TargetType:TargetName|SourceFilePath`
- **Example:** `ApexClass:Selector|External:Account|classes/Selector.cls`

---

## Node Property Comparison

When both `before` and `after` snapshots contain a node with matching identity, the engine compares meaningful architectural properties and ignores non-structural metadata (e.g. timestamps, absolute file system paths, execution durations).

### Tracked Node Properties:

1. `risk` (e.g. `LOW`, `MEDIUM`, `HIGH`)
2. `coupling` (Total coupling metric score)
3. `fanIn` (Inbound dependency count)
4. `fanOut` (Outbound dependency count)
5. `role` (Primary architectural role)
6. `layer` (Primary architectural layer)
7. `domain` (Architectural domain classification)
8. `safetyEnvelope` (Safety envelope classification, e.g. `SAFE`, `HIGH_RISK`, `BLOCKED`)
9. `bottleneck` (Boolean bottleneck status)
10. `smellCount` (Number of detected architecture smells)
11. `debtCount` (Number of architecture debt items)
12. `testGapStatus` (Test protection status)

---

## Output Schema

The return object of `diffSnapshots` conforms to the following deterministic schema:

```json
{
  "diffSchemaVersion": 1,
  "snapshotBeforeIdentity": "arch-snap-sha256:...",
  "snapshotAfterIdentity": "arch-snap-sha256:...",
  "hasChanges": true,
  "summary": {
    "addedNodesCount": 1,
    "removedNodesCount": 0,
    "changedNodesCount": 1,
    "addedEdgesCount": 1,
    "removedEdgesCount": 0,
    "addedCyclesCount": 0,
    "removedCyclesCount": 0,
    "addedUnresolvedReferencesCount": 0,
    "removedUnresolvedReferencesCount": 0,
    "totalChangesCount": 3
  },
  "addedNodes": [
    {
      "id": "ApexClass:ComponentC",
      "name": "ComponentC",
      "type": "ApexClass",
      "file": "classes/ComponentC.cls"
    }
  ],
  "removedNodes": [],
  "changedNodes": [
    {
      "id": "ApexClass:ComponentB",
      "name": "ComponentB",
      "type": "ApexClass",
      "changes": [
        {
          "property": "risk",
          "before": "LOW",
          "after": "HIGH"
        }
      ]
    }
  ],
  "addedEdges": [
    {
      "id": "ApexClass:ComponentB|ApexClass:ComponentC|method-call|process",
      "source": "ApexClass:ComponentB",
      "target": "ApexClass:ComponentC",
      "relationshipType": "method-call",
      "method": "process",
      "evidence": "ComponentC.process()"
    }
  ],
  "removedEdges": [],
  "cycleChanges": {
    "added": [],
    "removed": []
  },
  "unresolvedReferenceChanges": {
    "added": [],
    "removed": []
  }
}
```

---

## Schema & Version Incompatibility Rules

If `before` or `after` snapshot is invalid or missing `schemaVersion`, or if `before.schemaVersion !== after.schemaVersion`, `diffSnapshots` throws an explicit Error:

```text
Incompatible snapshot schemaVersion: before schemaVersion (1) does not match after schemaVersion (2).
```

---

## Determinism & Guarantee Standards

1. **Ordering:** All arrays (`addedNodes`, `removedNodes`, `changedNodes`, `addedEdges`, `removedEdges`, `cycleChanges.added`, `cycleChanges.removed`, `unresolvedReferenceChanges.added`, `unresolvedReferenceChanges.removed`) are sorted alphabetically by ID/Key.
2. **Reordering Immunity:** Passing snapshots with identical logical content in different array orders yields identical JSON outputs.
3. **Empty Snapshots:** Comparing two empty snapshots returns `hasChanges: false` and `totalChangesCount: 0`.
