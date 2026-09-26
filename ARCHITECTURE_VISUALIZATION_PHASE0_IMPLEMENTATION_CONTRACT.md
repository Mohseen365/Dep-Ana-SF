# Architecture Visualization Phase 0 Implementation Contract

## 1. Purpose

This document establishes the **precise Phase 0 implementation contract and execution specification** for the Salesforce Architecture Explorer visualization system.

It translates the approved visualization strategy (`ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS.md`), its integrity audit (`ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS_INTEGRITY_AUDIT.md`), and the implementation roadmap (`ARCHITECTURE_VISUALIZATION_IMPLEMENTATION_ROADMAP.md`) into an evidence-grounded execution specification governing Phase 0 deliverables.

> **THIS DOCUMENT IS A PLANNING ARTIFACT ONLY. IT DOES NOT AUTHORIZE IMPLEMENTATION.**
> No source code, tests, configuration, dependencies, fixtures, context files, or existing audit reports have been modified.

---

## 2. Phase 0 Scope Boundary

Phase 0 exists **ONLY** to establish the type contracts, baseline telemetry, determinism checks, and test infrastructure needed for safe, zero-regression visualization development.

### What Phase 0 MUST NOT Implement
* Feature Dependency Matrix
* Coupling Heatmap
* Dependency Radar
* Architecture DNA
* Dependency Tree
* Four-Direction View
* Architecture Treemap
* Dependency River / Sankey
* Architecture Subway Map
* Architecture Story Mode
* Time Machine
* WebGL Viewport
* 3D Models A–D
* 3D Architecture City
* Unified Visualization Lens Switcher

All UI visualization lenses, alternative 2D layout engines, historical stores, and WebGL renderers belong strictly to later execution phases (Phases 1–8).

---

## 3. Source Hierarchy

In resolving all facts, contracts, and boundaries for Phase 0, the following precedence order is enforced:

1. **Current production source code** (`explorer/src/`, `dependency-analyzer.cjs`, `architecture-layout.ts`, `position-policy.ts`) — **AUTHORITATIVE GROUND TRUTH**
2. `AGENT.md` & `08_Audit_Source_Register.md`
3. Existing audit and context files (`ARCHITECTURE_VISUALIZATION_FOUNDATION_AUDIT.md`, `ARCHITECTURE_VISUALIZATION_AUDIT_RECONCILIATION.md`)
4. `ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS.md`
5. `ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS_INTEGRITY_AUDIT.md`
6. `ARCHITECTURE_VISUALIZATION_IMPLEMENTATION_ROADMAP.md`
7. `ARCHITECTURE_VISUALIZATION_PHASE0_IMPLEMENTATION_CONTRACT.md` (**SUBJECT OF THIS CONTRACT**)

Where discrepancies exist between documentation or roadmap assumptions and current production source code, **current production source code is treated as absolute truth**. Roadmap assumptions are audited and reported in Section 18.

---

## 4. Repository Contract Inventory

The active codebase (`explorer/src/`) contains 5 major categories of verified type contracts:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                REPOSITORY CONTRACT INVENTORY                             │
├────────────────────────────┬──────────────────────────────────┬──────────────────────────┤
│ Category                   │ Source File                      │ Primary Contracts        │
├────────────────────────────┼──────────────────────────────────┼──────────────────────────┤
│ 1. Canonical Graph         │ explorer/src/types/explorer.ts   │ ExplorerDataSchema,      │
│                            │                                  │ ExplorerNode, Edge,      │
│                            │                                  │ ExplorerSummary, Metrics │
├────────────────────────────┼──────────────────────────────────┼──────────────────────────┤
│ 2. Position Authority      │ explorer/src/lib/position-policy.ts│ ResolvedPosition,       │
│                            │                                  │ PositionAuthorityLevel,  │
│                            │                                  │ shouldAutoLayout()       │
├────────────────────────────┼──────────────────────────────────┼──────────────────────────┤
│ 3. Layout Stage            │ explorer/src/lib/architecture-layout.ts│ ArchitectureLayoutResult,│
│                            │                                  │ StagePositions, Options  │
├────────────────────────────┼──────────────────────────────────┼──────────────────────────┤
│ 4. UI & State              │ explorer/src/lib/projectState.ts │ ProjectUIState,          │
│                            │                                  │ GraphLayoutState, Filters│
├────────────────────────────┼──────────────────────────────────┼──────────────────────────┤
│ 5. Diff & Overlay          │ explorer/src/lib/diff-adapter.ts │ DiffResult, OverlayGraph,│
│                            │                                  │ DiffOverlayNode, Edge    │
└────────────────────────────┴──────────────────────────────────┴──────────────────────────┘
```

---

## 5. Canonical Graph Contract

Contract: Canonical Graph Data Model
Source: `explorer/src/types/explorer.ts`
Purpose: Establishes the authoritative schema for nodes, edges, summary metrics, and impact paths extracted from Salesforce repositories.
Inputs: `ExplorerDataSchema` payload generated by `scripts/export-explorer.cjs` or `dependency-analyzer.cjs`.
Outputs: Validated JSON graph model containing `nodes: ExplorerNode[]`, `edges: ExplorerEdge[]`, `summary: ExplorerSummary`, `impactSummaries: Record<string, ExplorerComponentImpactSummary>`.
Consumers: `architecture-layout.ts`, `graph-index.ts`, `features.ts`, `layers.ts`, `centrality.ts`, `hotspots.ts`, `GraphView.tsx`, `Sidebar.tsx`.
Mutation Rules: **STRICTLY READ-ONLY**. No visualization lens, adapter, or layout algorithm may add, delete, or mutate base properties of `ExplorerNode` or `ExplorerEdge`.
Evidence: `explorer/src/types/explorer.ts` lines 1–210.

Finding: Canonical Graph Schema Immutability
Evidence: `ExplorerDataSchema` is validated by Zod schema `ExplorerDataSchemaZ` in `explorer/src/lib/schema.ts` and consumed immutably across all 13 stages of `architecture-layout.ts`.
Source: `explorer/src/lib/schema.ts`, `explorer/src/lib/architecture-layout.ts`
Interpretation: The canonical graph contract is complete, robust, and fully specified.
Decision: Phase 0 MUST NOT modify `explorer/src/types/explorer.ts`.

---

## 6. Position Authority Contract

Contract: 5-Level Position Authority Hierarchy
Source: `explorer/src/lib/position-policy.ts`
Purpose: Determines coordinate provenance and protects user-authored coordinate overrides across view switches, filter changes, and layout execution triggers.
Inputs: `sessionPositions`, `persistedPositions`, `cyNodePosition`, `hasAuthoritativePositions`.
Outputs: `ResolvedPosition` (`{ position: { x, y }, level: PositionAuthorityLevel }`).
Consumers: `GraphView.tsx`, `architecture-layout.ts`, `projectState.ts`.
Mutation Rules: Higher authority levels (Level 1 Session Drag, Level 2 Persisted) strictly overwrite lower levels (Level 4 Layout Calculation, Level 5 Fallback). Visualization adapters must read coordinates as read-only inputs and **NEVER** overwrite Level 1 or Level 2 authority.
Evidence: `explorer/src/lib/position-policy.ts` lines 1–150.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               5-LEVEL POSITION AUTHORITY CONTRACT                        │
├───────┬───────────────────────────────────┬──────────────────────────────────────────────┤
│ Level │ Name                              │ Operational Behavior                         │
├───────┼───────────────────────────────────┼──────────────────────────────────────────────┤
│ Level 1│ Session Drag (User-Authored)     │ Active in-session node drag overrides all    │
├───────┼───────────────────────────────────┼──────────────────────────────────────────────┤
│ Level 2│ Persisted Project State          │ localStorage persisted positions             │
├───────┼───────────────────────────────────┼──────────────────────────────────────────────┤
│ Level 3│ Cytoscape Canvas Position         │ Current canvas element coordinates           │
├───────┼───────────────────────────────────┼──────────────────────────────────────────────┤
│ Level 4│ Layout Calculation (Stage 12)     │ 13-stage architecture layout engine output   │
├───────┼───────────────────────────────────┼──────────────────────────────────────────────┤
│ Level 5│ System Fallback (Deterministic)   │ Centroid / origin grid deterministic fallback│
└───────┴───────────────────────────────────┴──────────────────────────────────────────────┘
```

Finding: Position Authority Resolution
Evidence: `resolveAuthoritativePosition()` in `position-policy.ts` evaluates Levels 1 through 3 sequentially and returns `null` if no authoritative position exists, allowing Stage 12 layout to execute.
Source: `explorer/src/lib/position-policy.ts`
Interpretation: The position policy mechanism currently preserves authoritative coordinate precedence within the existing graph/layout workflow. Future visualization lenses must consume these authoritative coordinates without becoming a new position authority.
Decision: Visualization lenses may consume Level 1–5 coordinates as read-only inputs, but visualization adapters must NOT become position authorities.

---

## 7. Determinism Contract

Contract: 10x Repeat and Shuffled Input Determinism Guarantee
Source: `explorer/src/lib/architecture-layout.ts`, `ordering.ts`, `spacing.ts`
Purpose: Guarantees that running the layout engine on identical inputs produces bit-for-bit identical $(X,Y)$ node coordinates ($0.00000\text{ px}$ drift).
Inputs: `ExplorerNode[]`, `ExplorerEdge[]`.
Outputs: `Record<string, { x: number, y: number }>` with 0.00000 px variance across 10x repeat executions and 5x input order shuffles.
Consumers: All graph rendering and overlay views.
Mutation Rules: Node IDs and edge lists are pre-sorted lexicographically (`sort((a,b) => a.id.localeCompare(b.id))`) at Stage 0 before layout processing.
Evidence: `explorer/src/lib/architecture-layout.ts` Stage 0 sorting; verified in `HYBRID_PHASE2_P2_7_PERFORMANCE_REPORT.md` and `Phase3_7_PerformanceAndDeterminism.test.ts`.

Finding: Determinism Verification
Evidence: Benchmark tests in `Phase3_7_PerformanceAndDeterminism.test.ts` verify that reversing node lists, reversing edge lists, and applying seeded shuffles produce `JSON.stringify(posOriginal) === JSON.stringify(posShuffled)`.
Source: `explorer/src/test/Phase3_7_PerformanceAndDeterminism.test.ts`
Interpretation: The determinism mechanism is active, tested, and verified.
Decision: Phase 0 baseline verification MUST enforce $0.00000\text{ px}$ determinism drift on the canonical Cloud Spend Tracker fixture (`audit-fixtures/cloud-spend-tracker/explorer-data.json`).

---

## 8. Analytics Contract Inventory

Contract: Precomputed Graph Analytics Engine
Source: `graph-index.ts`, `features.ts`, `layers.ts`, `feature-roles.ts`, `centrality.ts`, `hotspots.ts`, `impact-analysis.ts`, `metrics.ts`
Purpose: Computes topological metrics, semantic feature clusters, layer assignments, hub/bridge centrality scores, and blast radius impact paths.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               ANALYTICS CONTRACT INVENTORY                               │
├────────────────────────────┬─────────────────────────────────┬───────────────────────────┤
│ Module                     │ Function / Export               │ Contract Output           │
├────────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ graph-index.ts             │ createLayoutGraphIndex()        │ O(1) adjacency map index  │
│ features.ts                │ discoverFeatures()              │ FeatureClusterMap         │
│ layers.ts                  │ classifyNodeLayerWithReason()   │ ArchitectureLayer ('pres' │
│                            │                                 │ 'app', 'domain', 'schema')│
│ feature-roles.ts           │ classifyFeatureRole()           │ FeatureRole classification│
│ centrality.ts              │ computeGraphCentralityAnalysis()│ Hub & Bridge scores       │
│ hotspots.ts                │ getArchitecturalHotspots()      │ Ranked hotspot risk array │
│ impact-analysis.ts         │ calculateImpactAnalysis()       │ Affected components & paths│
│ metrics.ts                 │ evaluateLayoutQuality()         │ Crossing & clearance maps │
└────────────────────────────┴─────────────────────────────────┴───────────────────────────┘
```

Consumers: `architecture-layout.ts`, `GraphView.tsx`, `Sidebar.tsx`, `HotspotPanel.tsx`.
Mutation Rules: **STRICTLY READ-ONLY & PURE**. Analytics modules do not mutate input graph arrays or store internal state.
Evidence: `explorer/src/lib/` analytics module implementations.

Finding: Reusability of Existing Analytics
Evidence: Existing analytics demonstrate high reusability for future visualization data adapters because they use pure functional inputs/outputs and have no DOM or Cytoscape rendering dependencies.
Source: `explorer/src/lib/`
Interpretation: Existing analytics provide clean, pure data transformation functions without DOM or rendering side-effects.
Decision: Phase 0 contract records existing analytics as reusable baseline feeds for future adapters.

---

## 9. UI / State Contract Inventory

Contract: Project-Scoped UI State Persistence
Source: `explorer/src/lib/projectState.ts`
Purpose: Manages project-isolated state persistence in `localStorage` under `explorer.projectState.<projectId>`.
Inputs: `projectId`, `ProjectUIState` slice updates.
Outputs: `ProjectUIState` object containing `selectedComponent`, `filters`, `graphLayout`, `zoom`, `sidebarState`, `inspectorState`, `navigatorState`, `analysisView`, `comparisonState`.
Consumers: `App.tsx`, `GraphView.tsx`, `Sidebar.tsx`, `InspectorDrawer.tsx`.
Mutation Rules: State updates are saved atomically via `updateProjectState(projectId, update)`.
Evidence: `explorer/src/lib/projectState.ts` lines 1–320.

Finding: State Isolation Scope
Evidence: `loadProjectState(projectId)` merges stored JSON with `createDefaultProjectUIState(projectId)` to handle schema evolution smoothly.
Source: `explorer/src/lib/projectState.ts`
Interpretation: The project state manager provides a clean extension point for storing lens selection (`selectedVisualizationLens`) in future phases.
Decision: Phase 0 contract documentation MUST record `ProjectUIState` as the single authoritative state contract.

---

## 10. Diff Contract Inventory

Contract: Two-Snapshot Diff Overlay Engine
Source: `architecture-diff.cjs`, `explorer/src/lib/diff-adapter.ts`
Purpose: Computes structural node/edge diffs between two snapshot graph payloads and converts diff results into a merged overlay graph model.
Inputs: `beforeSnapshot: ExplorerDataSchema`, `afterSnapshot: ExplorerDataSchema`.
Outputs: `DiffResult` (summary counts, added/removed/changed arrays) and `DiffOverlayGraph` (`DiffOverlayNode[]`, `DiffOverlayEdge[]`).
Consumers: `DiffSelector.tsx`, `ComparePanel.tsx`, `GraphView.tsx`.
Mutation Rules: Pure calculation over input snapshots. Assigns `diffState: 'added' | 'removed' | 'changed' | 'unchanged'` to overlay nodes/edges.
Evidence: `architecture-diff.cjs`, `explorer/src/lib/diff-adapter.ts` lines 1–280.

Finding: Diff Engine Capability
Evidence: `diffSnapshots()` in `architecture-diff.cjs` executes in $< 15\text{ ms}$ on canonical 240-node snapshots, producing structured diff overlays without modifying original snapshot objects.
Source: `architecture-diff.cjs`, `explorer/src/lib/diff-adapter.ts`
Interpretation: Two-snapshot diff capabilities exist and are fully functional.
Decision: Multi-snapshot time-series capabilities (Time Machine) belong to Phase 5 and require new `MultiSnapshotStore` infrastructure, while two-snapshot diffs reuse `diff-adapter.ts` directly.

---

## 11. Benchmark Infrastructure Audit

Finding: Evaluation of Existing Benchmark Infrastructure
Evidence: The repository contains mature performance benchmark scripts and harnesses:
1. `explorer/src/test/benchmark-wave7b.ts`: Automated multi-tier benchmark runner executing cold profiling passes, memory usage tracking (`process.memoryUsage()`), stage timing breakdowns (Stages 0–12), and determinism checks across scale tiers (100 to 15,000 nodes).
2. `explorer/src/test/Phase4DAcceptancePerformance.test.ts`: Automated performance suite evaluating cold load pipeline timing, primary crossings, satellite placement, and memory stability on Cloud Spend Tracker (`audit-fixtures/cloud-spend-tracker/explorer-data.json`).
3. `explorer/src/lib/layout/evaluate-layout.ts`: Layout metrics engine calculating physical clearance, crossings breakdown ($C_{pp}, C_{ps}, C_{ss}$), and feature cohesion.
Source: `explorer/src/test/benchmark-wave7b.ts`, `Phase4DAcceptancePerformance.test.ts`, `evaluate-layout.ts`

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                BENCHMARK INFRASTRUCTURE AUDIT                            │
├────────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Benchmark Subsystem        │ Existing Implementation     │ Status Classification         │
├────────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Cold Pipeline Timing       │ benchmark-wave7b.ts         │ EXISTING                      │
├────────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Stage 0--12 Profile Breakdown│ benchmark-wave7b.ts       │ EXISTING                      │
├────────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Memory & RSS Telemetry     │ process.memoryUsage()       │ EXISTING                      │
├────────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Crossings Breakdown Engine │ evaluate-layout.ts          │ EXISTING                      │
├────────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Determinism Verification   │ Phase3_7 / benchmark-wave7b │ EXISTING                      │
├────────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Lens Adapter Telemetry     │ None                        │ EXTENDABLE (Add to benchmark) │
└────────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

Interpretation: A brand-new benchmark framework is **NOT REQUIRED**. The existing `benchmark-wave7b.ts` and `Phase4DAcceptancePerformance.test.ts` utilities can be extended when adapter telemetry is implemented in later phases.
Decision: Classify benchmark infrastructure strictly as `EXISTING — EXTEND` (extending `benchmark-wave7b.ts` rather than constructing a new framework).

---

## 12. Testing Infrastructure Audit

Finding: Inspection of Existing Test Utilities & Runners
Evidence: The repository uses Vitest as its primary runner (`npm run test:cli`) with comprehensive test suites:
* **Unit Tests**: `schema.test.ts`, `focus-graph.test.ts`, `impact-analysis.test.ts`, `centrality.test.ts`, `hotspots.test.ts`, `position-policy.test.ts`.
* **Integration Tests**: `HybridLayoutAcceptanceB6.test.ts`, `Phase5DAcceptance.test.ts`, `Phase6B_LocalityCompaction.test.ts`, `Phase11ERenderedNodeSetBoundingBoxIdentityAudit.test.ts`.
* **UI Component Tests**: `FeatureRegionOverlay.test.tsx`, `FindingsIntegration6B.test.tsx`, `RefactoringSimulationIntegration.test.tsx`, `ViewportPerformanceB5.test.tsx`.
* **Test Fixture Helpers**: `explorer/src/test/scalability-generator.ts`, `position-test-helpers.ts`, `setup.ts`.
Source: `explorer/src/test/`

Interpretation: The existing Vitest infrastructure provides reusable unit, integration, UI, and fixture-test utilities for future visualization implementation phases without requiring a new test framework.
Decision: Phase 0 testing contract requires registering test utilities in `explorer/src/test/` for reuse in Phase 1–8 adapter and UI tests without creating a new test framework.

---

## 13. Visualization Adapter Necessity Analysis

The roadmap proposed a Visualization Data Adapter layer in Phase 1. We perform an evidence-grounded analysis of whether this abstraction is justified.

### Existing Architecture Analysis
1. Currently, UI components like `HotspotPanel.tsx` and `ComparePanel.tsx` consume raw `ExplorerNode[]` or precomputed analytics functions directly.
2. For simple 2D analytical views (e.g. Hotspots, Radar), calling analytics functions directly is sufficient.
3. However, for complex specialized views (e.g. Feature Dependency Matrix $N \times N$ cell aggregation, Squarified Treemap bounds, Sankey flow matrix), passing raw graph arrays directly into UI components creates tight coupling between raw graph topology and component rendering logic.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                           ADAPTER NECESSITY DECISION MATRIX                              │
├───────────────────────────────┬───────────────────────────────┬──────────────────────────┤
│ Proposed Adapter              │ Architectural Requirement     │ Decision                 │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────┤
│ Feature Matrix Adapter        │ Aggregates N x N coupling     │ NEW — JUSTIFIED          │
│                               │ cell matrix payload           │ (Phase 1 Unit 101)       │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────┤
│ Dependency Tree Adapter       │ Extracts k-hop DAG traversal  │ NEW — JUSTIFIED          │
│                               │ paths into tree hierarchy     │ (Phase 1 Unit 102)       │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────┤
│ Component Profile Adapter     │ Normalizes 7-band metrics for │ NEW — JUSTIFIED          │
│                               │ Radar & DNA barcodes          │ (Phase 1 Unit 103)       │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────┤
│ Generic Adapter Framework     │ Complex registry / DI hierarchy│ NEW — NOT JUSTIFIED     │
│ / Plugin Registry             │ over-engineering              │ (REJECTED)               │
└───────────────────────────────┴───────────────────────────────┴──────────────────────────┘
```

Interpretation: Lens-specific data adapter functions are justified for complex data transformations, but a heavy adapter registry framework / dependency-injection container is **REJECTED**.
Decision: Define simple, pure TypeScript adapter functions (`matrix-adapter.ts`, `tree-adapter.ts`, `profile-adapter.ts`) as lightweight data transformers.

---

## 14. Minimal Visualization Adapter Contract

If a visualization data adapter function is implemented in Phase 1, it MUST satisfy this minimal contract:

```text
Canonical ExplorerDataSchema
        ↓
Shared Graph Analytics
        ↓
Visualization Data Adapter Function (Pure TypeScript)
        ↓
Lens-Specific Data Contract (JSON / TS Interface)
```

### Mandatory Adapter Constraints
1. **Pure Functional Contract**: `(schema: ExplorerDataSchema, options?: TOptions) => TLensData`.
2. **Strict Read-Only Input**: Must NOT mutate the input `ExplorerDataSchema` or node/edge arrays.
3. **No Layout Authority**: Must NOT execute layout algorithms or assign 2D node coordinates.
4. **No Rendering Responsibility**: Must NOT generate SVG/DOM strings or canvas draw calls.
5. **No State Ownership**: Must NOT store internal mutable state or window references.
6. **Deterministic Output**: Identical inputs MUST yield identical output JSON structures.

---

## 15. Phase 0 Required Deliverables

Phase 0 MUST establish exactly three contract deliverables before Phase 1 implementation begins:

### Deliverable A — Baseline Contracts Specification
* Document formal specifications for future adapter data contracts. Evaluating a common `visualization-adapter.ts` interface is deferred until after the first concrete adapter (`matrix-adapter.ts` in Phase 1) establishes concrete shared patterns (`JUSTIFIED AFTER FIRST ADAPTER`).

### Deliverable B — Telemetry & Determinism Baseline Ledger
* Execute `Phase4DAcceptancePerformance.test.ts` on `audit-fixtures/cloud-spend-tracker/explorer-data.json` during Phase 0 execution and record cold pipeline execution time ($231.14\text{ ms}$ baseline), primary crossings ($C_{\text{pp}} = 8,704$), total crossings ($C_{\text{total}} = 94,662$), and determinism drift ($0.00000\text{ px}$).

### Deliverable C — Phase 0 Contract Acceptance Record
* Validate and freeze the existing `ARCHITECTURE_VISUALIZATION_PHASE0_IMPLEMENTATION_CONTRACT.md` as the planning and execution-control document for Phase 0.
* Do not create a replacement contract during Phase 0 execution.
* Any future Phase 0 execution results must be recorded separately from this contract unless a future task explicitly authorizes modification of this file.

---

## 16. Candidate File Analysis

Every proposed file across Phase 0 and Phase 1 is evaluated against repository evidence:

```text
File: explorer/src/types/explorer.ts
Status: EXISTING — REUSE
Why Needed: Canonical graph schema definition.
Existing Equivalent: Self.
Evidence: Contains ExplorerNode, ExplorerEdge, ExplorerSummary.
Change Type: READ ONLY.
Risk: Modifying schema breaks all downstream layout stages and Zod validation.
Dependency: None.

File: explorer/src/lib/position-policy.ts
Status: EXISTING — REUSE
Why Needed: Enforces 5-level Position Authority hierarchy.
Existing Equivalent: Self.
Evidence: Implements resolveAuthoritativePosition().
Change Type: READ ONLY.
Risk: Overwriting position policy corrupts user-authored overrides.
Dependency: None.

File: explorer/src/types/visualization-adapter.ts
Status: JUSTIFIED AFTER FIRST ADAPTER (Phase 1)
Why Needed: Common interface proposal for Phase 1 data adapters.
Existing Equivalent: None.
Evidence: Deferred until matrix-adapter.ts establishes concrete shared patterns.
Change Type: Proposed future file (Phase 1 post-matrix adapter step).
Risk: Minimal (pure TypeScript type definitions).
Dependency: explorer/src/types/explorer.ts.

File: explorer/src/lib/adapters/matrix-adapter.ts
Status: NEW — JUSTIFIED (Phase 1)
Why Needed: Transforms canonical graph into N x N feature coupling matrix.
Existing Equivalent: buildFeatureDependencyMatrix() in feature-ordering.ts.
Evidence: Isolates matrix data calculation from layout reordering code.
Change Type: Proposed future file (Phase 1).
Risk: Low (pure function).
Dependency: features.ts, feature-ordering.ts.

File: explorer/src/lib/adapters/adapter-registry.ts
Status: NEW — NOT JUSTIFIED
Why Needed: Proposed registry/plugin pattern for managing adapters.
Existing Equivalent: Direct TypeScript imports.
Evidence: No multi-tenant runtime plugin requirements exist in codebase.
Change Type: REJECTED.
Risk: Unnecessary abstraction complexity.
Dependency: N/A.
```

---

## 17. Exact Change Boundary

| File Path | Read Status | Proposed Future Change | Phase 0 Allowed? | Architectural Reason |
| :--- | :--- | :--- | :--- | :--- |
| `explorer/src/types/explorer.ts` | **READ ONLY** | None | **NOT TOUCHED** | Canonical graph schema; must remain untouched. |
| `explorer/src/lib/position-policy.ts` | **READ ONLY** | None | **NOT TOUCHED** | Enforces 5-level Position Authority. |
| `explorer/src/lib/architecture-layout.ts` | **READ ONLY** | None | **NOT TOUCHED** | 13-stage layout engine; must remain untouched. |
| `explorer/src/lib/projectState.ts` | **READ ONLY** | Lens state extension (Phase 8) | **NOT TOUCHED** | UI state manager; untouched in Phase 0. |
| `explorer/src/lib/diff-adapter.ts` | **READ ONLY** | None | **NOT TOUCHED** | Diff overlay builder; untouched in Phase 0. |
| `explorer/src/test/benchmark-wave7b.ts` | **READ ONLY** | Telemetry logging (Phase 1) | **NOT TOUCHED** | Existing benchmark utility (`EXISTING — EXTEND`). |
| `audit-fixtures/cloud-spend-tracker/...` | **READ ONLY** | None | **NOT TOUCHED** | Benchmark fixture SHA-256 strictly preserved. |
| `ARCHITECTURE_VISUALIZATION_PHASE0_IMPLEMENTATION_CONTRACT.md` | **EXISTING — CONTROLLED DOCUMENT** | Amend only when explicitly authorized | **NOT TOUCHED BY DEFAULT** | Existing Phase 0 planning and execution-control contract; no replacement document required. |

---

## 18. Roadmap Corrections

An audit of `ARCHITECTURE_VISUALIZATION_IMPLEMENTATION_ROADMAP.md` against current source code reveals 4 areas where roadmap assumptions are overly prescriptive or unsupported:

1. **Correction 1: Benchmark Harness Classification**:
   * *Roadmap Assumption*: Phase 0 Unit 002 proposed building a new automated benchmark harness (`UNIT-002-BENCHMARK-HARNESS`).
   * *Source Code Truth*: `benchmark-wave7b.ts` and `Phase4DAcceptancePerformance.test.ts` already exist and provide automated cold load profiling, memory tracking, and stage timing.
   * *Correction*: Reclassify benchmark infrastructure consistently as `EXISTING — EXTEND` (extending `benchmark-wave7b.ts` rather than building a new harness).

2. **Correction 2: Adapter Framework Over-Engineering**:
   * *Roadmap Assumption*: Roadmap implied an extensible adapter framework / registry layer.
   * *Source Code Truth*: No dynamic runtime plugin requirements exist; all lenses are statically compiled React components.
   * *Correction*: Implement simple pure TypeScript functions (`matrix-adapter.ts`, `tree-adapter.ts`) without a registry or dependency-injection container.

3. **Correction 3: Performance Target Governance**:
   * *Roadmap Assumption*: Roadmap listed targets like `< 10ms` for matrix computation and `< 2ms` for tree traversal.
   * *Source Code Truth*: These latency targets are analytical estimates, not measured facts for large scale tiers.
   * *Correction*: Reclassify all unbuilt performance figures as `TARGET` or `ESTIMATE` in governance documentation, requiring empirical measurement during phase execution.

4. **Correction 4: Parallelization Opportunity**:
   * *Roadmap Assumption*: Roadmap sequenced Phase 2 (2D Analytical Extensions) strictly before Phase 3 (Specialized 2D Layouts).
   * *Source Code Truth*: Phase 2 UI work (Matrix UI, Radar UI) and Phase 3 layout engine work (Treemap engine, Octilinear router) touch completely decoupled files and can proceed in parallel once Phase 1 Data Adapters are complete.
   * *Correction*: Mark Phase 2 and Phase 3 as parallelizable tracks following Phase 1.

---

## 19. Phase 0 Acceptance Criteria

Phase 0 contract specification is evaluated against 7 evidence-based acceptance criteria:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               PHASE 0 ACCEPTANCE CRITERIA                                │
├─────────────────┬────────────────────────────────────────────────────────────────────────┤
│ Category        │ Required Evidence Condition                                            │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 1. Source / API │ All 5 existing type contract categories inventoried from active code   │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 2. Data         │ Canonical ExplorerDataSchema verified as 100% read-only & immutable   │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 3. Position     │ 5-Level Position Authority documented with Level 1--2 preservation rule│
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 4. Determinism  │ 0.00000px determinism drift baseline to be verified during Phase 0 exec│
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 5. Performance  │ Existing benchmark-wave7b.ts classified as EXISTING -- EXTEND          │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 6. Testing      │ Existing Vitest suite (npm run test:cli, 31 suites) verified passing │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 7. Architecture │ Adapter necessity resolved: pure functions justified, registry REJECTED│
└─────────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## 20. Phase 0 Exit Gate

Phase 0 may be declared COMPLETE and ready for Phase 1 execution **ONLY** when all 8 conditions are verified upon Phase 0 execution:

* [ ] Canonical graph contracts in `explorer/src/types/explorer.ts` are documented and protected.
* [ ] Position Authority hierarchy in `position-policy.ts` is documented and protected.
* [ ] Determinism baseline ($0.00000\text{ px}$ drift) is verified on Cloud Spend Tracker fixture during Phase 0 execution.
* [ ] Analytics contract inventory confirms high reusability of existing `explorer/src/lib/` modules due to pure functional contracts and zero DOM dependencies.
* [ ] Existing benchmark infrastructure (`benchmark-wave7b.ts`) is classified as `EXISTING — EXTEND`.
* [ ] Adapter necessity analysis confirms pure adapter functions are justified and rejects heavy registry framework.
* [ ] Roadmap corrections (4 items) are documented.
* [ ] Common interface `visualization-adapter.ts` is deferred until after `matrix-adapter.ts` in Phase 1 establishes concrete adapter patterns (`JUSTIFIED AFTER FIRST ADAPTER`).

### Final Readiness Status: `CONTRACT READY FOR CONTROLLED PHASE 0 EXECUTION (EXECUTION & VERIFICATION PENDING)`

---

## 21. Phase 1 Preconditions

Before Phase 1 (Shared Visualization Data Infrastructure) implementation may begin, the following preconditions must be satisfied:

1. **Authorization**: Explicit authorization to begin Phase 1 implementation must be granted (this document is planning-only).
2. **Contract Freeze**: `explorer/src/types/explorer.ts` and `position-policy.ts` must be frozen against modification during Phase 1.
3. **Pure Function Scope**: Phase 1 implementation must be restricted strictly to creating pure TypeScript adapter functions in `explorer/src/lib/adapters/` without UI components or Cytoscape DOM dependencies.

---

## 22. Final Integrity Checklist

```text
[x] Only repository inspection and contract planning were performed.
[x] Production source code remained untouched.
[x] Tests remained untouched.
[x] Configuration remained untouched.
[x] Dependencies remained untouched.
[x] Fixtures remained untouched.
[x] Existing context files remained untouched.
[x] Existing audit reports remained untouched.
[x] Final synthesis document remained untouched.
[x] Integrity audit document remained untouched.
[x] Implementation roadmap document remained untouched.
[x] Exactly one existing contract document modified (ARCHITECTURE_VISUALIZATION_PHASE0_IMPLEMENTATION_CONTRACT.md).
[x] Existing contracts inventoried from active source files.
[x] Position Authority 5-level hierarchy documented and protected.
[ ] Determinism contract (0.00000px drift) to be verified upon Phase 0 execution.
[x] Analytics reusability wording bounded to pure functional contracts and zero DOM dependencies.
[x] Benchmark infrastructure reclassified as EXISTING -- EXTEND (benchmark-wave7b.ts).
[x] Testing infrastructure audited (npm run test:cli, 31 suites).
[x] Adapter necessity analyzed (pure functions justified, heavy registry framework rejected).
[x] visualization-adapter.ts timing deferred until after first concrete adapter (JUSTIFIED AFTER FIRST ADAPTER).
[x] Candidate files analyzed with explicit status classifications.
[x] Exact change boundaries defined.
[x] Roadmap corrections (4 items) documented.
[ ] Phase 0 exit gate conditions defined; satisfaction requires Phase 0 execution evidence.
[x] Document explicitly states PLANNING ARTIFACT ONLY.
```

### Final Conclusion
This document establishes an authoritative, evidence-grounded Phase 0 Implementation Contract for the Salesforce Architecture Explorer visualization system.

> **THIS DOCUMENT IS A PLANNING ARTIFACT ONLY. IT DOES NOT AUTHORIZE IMPLEMENTATION.**
