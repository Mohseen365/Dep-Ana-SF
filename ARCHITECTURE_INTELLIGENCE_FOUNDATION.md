# Architecture Intelligence Foundation

## 1. Purpose
The **Architecture Intelligence Foundation** provides a shared, read-only, deterministic infrastructure for higher-level architectural reasoning over `explorer-data.json`. It establishes lightweight, memory-efficient data structures and O(1) indexes that future intelligence modules (Roles, Layers, Smells, Paths, Entry Points, Bottlenecks, Refactoring Safety, Debt) can consume without re-scanning the dependency graph or duplicating analyzer facts.

---

## 2. Architecture Boundary & Source-of-Truth
* **Single Source of Truth:** `dependency-analyzer.cjs` remains the authoritative fact provider (nodes, edges, metrics, risk, cycles, unresolved references, behavior, impact summaries).
* **Deterministic Interpretation:** Intelligence modules derive findings from Level 1 facts using explicit, explainable rules.
* **Zero UI Duplication:** UI components consume structured intelligence outputs presentationally.
* **Zero External Dependencies:** No `orchestrator.js`, LLMs, backend, database, or external AI services are required. Operates completely client-side.

---

## 3. Core Abstractions

### `ArchitectureContext`
A read-only context wrapper encapsulating the underlying `ExplorerDataSchema`, active `IntelligenceConfig`, and pre-built `ArchitectureIndexes`:

```typescript
export interface ArchitectureContext {
  readonly data: Readonly<ExplorerDataSchema>;
  readonly config: Readonly<IntelligenceConfig>;
  readonly indexes: ArchitectureIndexes;
}
```

### `ArchitectureIndexes` & `ImmutableMap`
Pre-built read-only `ImmutableMap` structures providing O(1) lookups:
* `nodeById`: Node lookup by stable ID (`Type:Name`).
* `nodesByType`: Nodes grouped by `ExplorerNodeType`.
* `outgoingEdges`: Outgoing dependency edges per source node ID.
* `incomingEdges`: Incoming dependent edges per target node ID.
* `cyclesByNodeId`: Cycle groups containing a participating node ID.
* `unresolvedBySourceId`: Unresolved references originating from a source node ID.
* `impactByNodeId`: Pre-computed impact summaries per component.

`ImmutableMap` wraps standard JavaScript `Map` instances and omits `.set()`, `.delete()`, and `.clear()` methods, ensuring runtime `.set()` attempts throw a `TypeError`.

---

## 4. Runtime Immutability & Defensive Cloning Mechanics
To enforce strict runtime read-only behavior across all context consumers:
1. **Defensive Cloning:** `createArchitectureContext` and `buildArchitectureIndexes` perform deep defensive copies of input datasets (`ExplorerDataSchema`) so that caller-owned input objects remain unaffected.
2. **Recursive Deep Freezing (`deepFreeze`):** All context data, index maps, node arrays, edge canonical metadata, cycle arrays, unresolved references, impact summaries, configuration thresholds, and finding structures are recursively frozen using `deepFreeze`. Attempting to modify properties or push items to arrays throws a runtime `TypeError`.
3. **`ImmutableMap` Abstraction:** Index maps expose read-only Map interfaces without mutation capabilities.

---

## 5. Common Architecture Finding Model

All derived findings, smells, and alerts use the standardized `ArchitectureFinding` shape:

```typescript
export interface ArchitectureFinding {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  description: string;
  nodeIds: string[];
  edgeIds: string[];
  evidence: FindingEvidenceItem[];
  provenance: FindingProvenance;
  rule: RuleIdentity;
}
```

### Evidence Provenance
Every finding explicitly records its origin:
* `ANALYZER_FACT`: Directly derived from AST/regex analysis outputs (e.g. cycle ID, unresolved reference snippet).
* `CONTRACT_FACT`: Derived from adapter contract structure.
* `DERIVED_RULE`: Derived by an Intelligence Layer rule.
* `CONFIGURATION`: Resulting from profile/threshold settings.

---

## 6. Rule Identity & Versioning
Every finding includes an immutable `rule` metadata object (`ruleId`, `ruleVersion`, `name`) ensuring that findings are identifiable, version-tracked, and deterministic across runs.

---

## 7. Determinism & Performance
* **Deterministic Sorting:** `nodeIds`, `edgeIds`, and `evidence` lists are lexicographically sorted upon creation.
* **Frozen Immutability:** Contexts, maps, lists, and findings are deeply frozen using `deepFreeze` to prevent accidental state mutation.
* **O(1) Indexed Lookups:** Pre-built index maps prevent repeated graph traversals across intelligence evaluations.

---

## 8. Configuration Boundary
A lightweight `IntelligenceConfig` interface allows threshold and profile customization without hardcoding rules into individual modules:

```typescript
export interface IntelligenceConfig {
  profileName: string;
  version: string;
  thresholds: {
    highFanInThreshold: number;
    highFanOutThreshold: number;
    highCouplingThreshold: number;
  };
  enabledRuleIds?: string[];
  customSettings?: Record<string, unknown>;
}
```

---

## 9. What is Deliberately NOT Implemented
* Feature-level logic (Roles, Layers, Smells, Paths, Entry Points, Bottlenecks) is intentionally omitted from this foundation session.
* Contract Schema v2.0 schema extensions are NOT hardcoded into `explorer-data.json`; intelligence findings remain runtime-derived objects.

---

## 10. Usage Guidelines for Future Jules Sessions

To create a new intelligence module in future sessions:
1. Accept `context: ArchitectureContext` as the primary parameter.
2. Use `context.indexes` for fast lookups (e.g. `context.indexes.incomingEdges.get(nodeId)`).
3. Generate findings using `createFinding(...)` from `src/lib/intelligence`.
4. Return frozen, deterministically ordered results.
