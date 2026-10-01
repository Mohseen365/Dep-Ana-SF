# ARCHITECTURE ORBIT — MASTER EXECUTION CONTRACT

**Document Type:** Master Execution Contract & Parallel Workstream Architecture Blueprint
**Status:** ESTABLISHED — READY FOR PARALLEL WORKSTREAMS
**Mode:** Contract Definition & Coordination (Zero Production Code Changes)
**Authority:** Direct Repository Audit (`explorer/src/`, `analyze/`, `deterministic/`, public fixtures) + Validated Orbit Audits

---

## 1. EXECUTIVE PURPOSE

This document establishes the binding, authoritative **Master Execution Contract** for implementing **Architecture Orbit** across four parallel workstreams (A, B, C, D).

The primary purpose of this contract is to:
1. Guarantee that parallel Jules execution agents proceed with zero duplicated archaeology, zero conflicting assumptions, zero file-ownership collisions, and zero architectural drift.
2. Freeze the product definition and ownership boundaries of Architecture Orbit as a **pure semantic radial projection** of the existing graph.
3. Eliminate unproven parameters ($S_{max} = 25$, $C = 8$, hardcoded radius constants, pre-baked feature mergers) from being treated as repository facts.
4. Protect existing layouts (`hierarchical`, `hybrid`, `constellation`) and runtime position authority infrastructure against regression.

---

## 2. REPOSITORY-TRUTH SUMMARY

A comprehensive audit of the repository (`explorer/src/`) establishes the following factual baseline:

```text
REPOSITORY FACT
- Layout Orchestrator: `computeArchitectureLayout` in `explorer/src/lib/architecture-layout.ts` dispatches `hierarchical` (via `computeGlobalDomainLayout`) and `hybrid` (via `computeGlobalFeatureLayout`).
- Active Layout Modes: `ArchitectureLayoutMode` in `explorer/src/types/explorer.ts` currently supports `'hierarchical' | 'hybrid'`.
- Interactive Visualization Lenses: `LENS_REGISTRY` in `explorer/src/registry/workspace-registry.ts` registers 12 active lenses including `'constellation'`.
- Constellation Engine: `explorer/src/lib/layout/constellation-layout.ts` implements focal-node k-hop BFS radial projection.
- Position Authority: `explorer/src/lib/position-policy.ts` enforces a 5-level position authority model.
- State Persistence: `explorer/src/lib/projectState.ts` stores project state in `localStorage` under `GraphLayoutState` (`layoutProvenance`: `'automatic-hierarchical' | 'automatic-hybrid' | 'user-authored'`).
- Async Offloading: `LayoutWorkerClient` (`explorer/src/lib/workers/layout-worker-client.ts`) handles worker dispatch with synchronous fallback.
- Test Fixtures: Project datasets `cst`, `bqc`, `food-app`, and `pbim` exist in `explorer/public/projects/` and `analyze/projects/pbim`.

DESIGN CONTRACT
- Orbit is an additive layout mode (`architectureMode = 'orbit'`) that computes polar coordinates $(r, \theta) \to (x, y)$ from existing node layer classification and feature/domain semantic grouping.
- Orbit reuses existing Cytoscape GraphView rendering, visibility, selection, hover, and highlighting without introducing Cytoscape position API mutations.

UNIMPLEMENTED PROPOSAL (NOT REPOSITORY TRUTH)
- `orbit-layout.ts` / `orbit-adapter.ts` (Not yet implemented in `explorer/src/`).
- Hardcoded $S_{max} = 25$ or $C = 8$ capacity constraints.
- Water-filling angular allocation engine.
- Physical feature-merger or custom Orbit semantic classifier.
```

---

## 3. ORBIT PRODUCT DEFINITION

> **Architecture Orbit is a global semantic radial projection of the existing architecture graph.**

```text
EXISTING ARCHITECTURE GRAPH
          │
          ├── existing node semantics (layers, roles, metrics)
          ├── existing feature/domain discovery
          ├── existing dependency relationships
          ├── existing visibility & filter state
          └── existing interaction state (selection, hover, highlight)
                    │
                    ▼
              ORBIT PROJECTION
                    │
             ┌──────┴──────┐
             │             │
           RINGS         SECTORS
       (Layer / Role) (Feature / Domain)
             │             │
             └──────┬──────┘
                    │
             RADIAL GEOMETRY
             (r, θ) → (x, y)
                    │
                    ▼
              EXISTING GRAPHVIEW
```

Orbit answers one fundamental question: **"Where should already-understood architecture nodes appear in a compact radial architecture map?"**

Orbit does **NOT** redefine what those nodes mean or re-classify graph semantics.

---

## 4. REUSE ARCHITECTURE

Orbit aggressively reuses existing core infrastructure:

| Infrastructure Component | Existing File Location | Reused Behavior |
| :--- | :--- | :--- |
| **Layer Classification** | `explorer/src/lib/layout/layers.ts` | Assigns nodes to architectural layers ($R_0 \dots R_4$). |
| **Feature / Domain Discovery** | `explorer/src/lib/layout/features.ts`, `domains.ts` | Provides primary feature and domain grouping for angular sectors. |
| **Centrality & Roles** | `explorer/src/lib/layout/centrality.ts`, `feature-roles.ts` | Provides hub, bridge, and satellite node classifications. |
| **Graph Indexing** | `explorer/src/lib/layout/graph-index.ts` | Provides fast neighbor and degree queries. |
| **Polar Helpers** | `explorer/src/lib/adapters/constellation-adapter.ts` | `polarToCartesian`, SVG arc rendering algorithms. |
| **Position Authority** | `explorer/src/lib/position-policy.ts` | Enforces Level 1-5 position authority hierarchy. |
| **State Persistence** | `explorer/src/lib/projectState.ts` | Persists layout state and provenance (`'automatic-orbit'`). |
| **Worker Dispatch** | `explorer/src/lib/workers/layout-worker-client.ts` | Asynchronous worker execution and generation cancellation. |
| **Graph Rendering** | `explorer/src/components/GraphView.tsx` | Cytoscape rendering, node selection, edge highlighting, zoom/pan. |

---

## 5. OWNERSHIP BOUNDARIES

To prevent architectural contamination and conflicting responsibilities across workstreams:

### Orbit OWNS
* Orbit ring mapping from existing layers/roles.
* Orbit sector projection from existing features/domains.
* Orbit deterministic angular placement and track capacity calculation.
* Orbit radial radius computation and multi-track expansion.
* Orbit node coordinate generation $(x, y)$.
* Orbit visual guide metadata (ring circles, sector guide lines, ring labels).
* Orbit-specific layout metadata and performance diagnostics.

### Orbit DOES NOT OWN
* Node existence or graph filtering (`search-filter.ts`).
* Global semantic classification or feature discovery algorithms.
* Global selection, hover, or edge highlighting state (`InvestigationContext.tsx`).
* Global position policy or persistence engines (`position-policy.ts`, `projectState.ts`).
* Cytoscape instance lifecycle or canvas rendering (`GraphView.tsx`).
* Existing layout algorithms (`hierarchical` or `hybrid`).

---

## 6. EXISTING LAYOUT PROTECTION

Orbit is strictly **additive**.

1. **Non-Interference:** Existing layouts (`hierarchical` and `hybrid` in `architecture-layout.ts`, `constellation` in `constellation-layout.ts`) must remain 100% untouched and functionally invariant.
2. **Provenance Isolation:** Orbit positions persist with `layoutProvenance = 'automatic-orbit'` in `GraphLayoutState`. Orbit execution must never overwrite or corrupt saved positions of `automatic-hierarchical`, `automatic-hybrid`, or `user-authored` layouts.
3. **Shared Infrastructure Changes:** Any modification to shared utilities (e.g., `types.ts`, `projectState.ts`, `layout-worker-types.ts`) must be strictly backward-compatible and backed by full regression test execution before merge.

---

## 7. FOUR WORKSTREAM DEFINITIONS

The Orbit implementation is split into four strictly scoped parallel workstreams:

```text
WORKSTREAM A — SEMANTIC + PROJECTION
WORKSTREAM B — GEOMETRY + PLACEMENT
WORKSTREAM C — INTEGRATION + GRAPHVIEW + UI
WORKSTREAM D — RUNTIME + BROWSER VALIDATION
```

---

### WORKSTREAM A — SEMANTIC + PROJECTION

* **Responsibility:** Define deterministic mapping from existing graph semantics to Orbit Ring IDs, Sector IDs, and deterministic node sort keys.
* **Owned Surface:**
  - Semantic mapping specification and fallback hierarchy.
  - Ring assignment logic ($R_0 \dots R_4$) based on `classifyNodeLayer`.
  - Sector assignment logic based on `discoverFeatures` / `discoverDomains`.
  - Deterministic intra-sector / intra-ring node ordering key generation.
  - Unmapped node fallback strategies (e.g., unassigned features $\to$ `_unassigned` sector).
* **Read-Only Dependencies:**
  - `explorer/src/lib/layout/layers.ts`
  - `explorer/src/lib/layout/features.ts`
  - `explorer/src/lib/layout/domains.ts`
  - `explorer/src/lib/layout/feature-roles.ts`
  - `explorer/src/types/explorer.ts`
* **Forbidden Surface:**
  - Radial $(r, \theta)$ or Cartesian $(x, y)$ coordinate math.
  - Worker dispatch or UI component code.
* **Expected Artifact:** `ARCHITECTURE_ORBIT_WORKSTREAM_A_SEMANTIC_CONTRACT.md` (and optional unit test specification `orbit-semantics.test.ts`).

---

### WORKSTREAM B — GEOMETRY + PLACEMENT

* **Responsibility:** Define and implement pure mathematical radial geometry, sector angle allocation, track capacity equations, collision avoidance, and $(x, y)$ coordinate generation.
* **Owned Surface:**
  - Pure layout engine `explorer/src/lib/layout/orbit-layout.ts`.
  - Dynamic sector angular allocation ($\theta_{start}, \theta_{end}$).
  - Multi-track radius expansion ($R_{k,a}, R_{k,b}$) and track capacity limits.
  - Node polar-to-Cartesian coordinate calculation $(r, \theta) \to (x, y)$.
  - Node-size aware angular clearance and 1D sweep-line collision management.
* **Read-Only Dependencies:**
  - Interface output from Workstream A.
  - Polar helper algorithms in `explorer/src/lib/adapters/constellation-adapter.ts`.
  - `explorer/src/lib/layout/graph-index.ts`.
* **Forbidden Surface:**
  - Semantic re-classification or feature discovery modifications.
  - React components, GraphView DOM, or worker client code.
* **Expected Artifact:** `explorer/src/lib/layout/orbit-layout.ts`, `explorer/src/lib/layout/orbit-layout.test.ts`, and `ARCHITECTURE_ORBIT_WORKSTREAM_B_GEOMETRY_REPORT.md`.

---

### WORKSTREAM C — INTEGRATION + GRAPHVIEW + UI

* **Responsibility:** Wire Orbit layout engine into the orchestrator dispatch, worker client, project state, and UI controls.
* **Owned Surface:**
  - Orchestrator integration in `explorer/src/lib/architecture-layout.ts`.
  - Worker payload & message handling in `layout-worker-types.ts`, `layout.worker.ts`, and `layout-worker-client.ts`.
  - State persistence schema in `projectState.ts` (`'orbit'` mode and `'automatic-orbit'` provenance).
  - UI control toggles in `GraphControls.tsx` / `WorkspaceShell.tsx`.
  - Orbit visual guide rendering (ring guide circles, sector labels) via `FeatureOverlayCanvas.tsx` or Orbit overlay layer.
* **Read-Only Dependencies:**
  - Workstream A semantic metadata.
  - Workstream B `orbit-layout.ts` execution engine.
* **Forbidden Surface:**
  - Modifications to existing hierarchical or hybrid layout logic.
* **Expected Artifact:** Integration pull-request/diff, updated `GraphView.tsx` / `WorkspaceShell.tsx`, and `ARCHITECTURE_ORBIT_WORKSTREAM_C_INTEGRATION_REPORT.md`.

---

### WORKSTREAM D — RUNTIME + BROWSER VALIDATION

* **Responsibility:** Execute real-world runtime, benchmark, determinism, and Playwright browser verification across canonical fixtures.
* **Owned Surface:**
  - Test suites and verification scripts (`explorer/src/test/orbit-runtime-validation.test.ts`, `scripts/verify-orbit-real-browser.cjs`).
  - Validation across fixtures (`food-app`, `cst`, `bqc`, `pbim`).
  - Position authority verification (0px coordinate drift in static mode).
  - Performance SLA measurement ($< 250\text{ms}$ layout execution for $N \le 1,000$).
* **Read-Only Dependencies:**
  - Complete integrated codebase from Workstreams A, B, and C.
* **Forbidden Surface:**
  - Production layout modifications (Validator role only).
* **Expected Artifact:** `ARCHITECTURE_ORBIT_WORKSTREAM_D_VALIDATION_REPORT.md` and screenshot evidence.

---

## 8. FILE OWNERSHIP MATRIX

To prevent file editing collisions when parallel Jules execution agents run simultaneously:

| File / Path | Primary Owner | Secondary Access | Status / Boundary Rule |
| :--- | :--- | :--- | :--- |
| `explorer/src/lib/layout/orbit-semantics.ts` | **Workstream A** | Read-Only: B, C | New File. Pure semantic projection. |
| `explorer/src/lib/layout/orbit-layout.ts` | **Workstream B** | Read-Only: C, D | New File. Pure geometry math. |
| `explorer/src/lib/layout/orbit-layout.test.ts` | **Workstream B** | Read-Only: D | New File. Math unit tests. |
| `explorer/src/lib/architecture-layout.ts` | **Workstream C** | Read-Only: D | Modified. Adding Orbit orchestrator dispatch branch. |
| `explorer/src/lib/projectState.ts` | **Workstream C** | Read-Only: A, B, D | Modified. Adding `'orbit'` and `'automatic-orbit'`. |
| `explorer/src/types/explorer.ts` | **Workstream C** | Read-Only: A, B, D | Modified. Updating `ArchitectureLayoutMode`. |
| `explorer/src/lib/workers/layout-worker-types.ts` | **Workstream C** | Read-Only: B, D | Modified. Adding Orbit options to worker types. |
| `explorer/src/lib/workers/layout.worker.ts` | **Workstream C** | Read-Only: D | Modified. Adding Orbit branch in worker. |
| `explorer/src/components/GraphControls.tsx` | **Workstream C** | Read-Only: D | Modified. Adding Orbit mode toggle button. |
| `explorer/src/components/GraphView.tsx` | **Workstream C** | Read-Only: D | Modified. Passing Orbit visual guide props. |
| `explorer/src/test/orbit-runtime-validation.test.ts` | **Workstream D** | Read-Only: A, B, C | New File. End-to-end runtime test. |

---

## 9. SHARED INTERFACE CONTRACT

The data pipeline connecting Workstream A $\to$ Workstream B $\to$ Workstream C is formally defined below:

```typescript
/**
 * Shared Orbit Node Metadata produced by Workstream A and consumed by Workstream B
 */
export interface OrbitNodeMetadata {
  nodeId: string;
  canonicalNodeType: string;
  canonicalLayer: ArchitectureLayer; // 'presentation' | 'application' | 'domain' | 'schema' | 'supporting'
  orbitRingIndex: number;            // 0..4 (or 0..5 with field track)
  primaryFeatureId: string;          // e.g. 'F01_OrderProcessing'
  primaryDomainId: string;           // e.g. 'Sales'
  orbitSectorId: string;             // Sector key derived from feature/domain
  semanticOrderKey: string;          // Deterministic sort key for intra-ring ordering
}

/**
 * Shared Orbit Layout Options passed from Orchestration (C) to Geometry Engine (B)
 */
export interface OrbitLayoutOptions {
  center: { x: number; y: number };
  innerRadius: number;               // Nucleus clearance radius (default: 120px)
  ringSpacing: number;               // Distance between consecutive layer rings (default: 140px)
  nodeWidth: number;                 // Node bounding width (default: 120px)
  nodeHeight: number;                // Node bounding height (default: 60px)
  sectorMarginAngleRad: number;      // Angular margin gap between adjacent sectors (default: 0.05 rad)
}

/**
 * Shared Orbit Node Coordinate Output produced by Geometry Engine (B)
 */
export interface OrbitNodePosition {
  nodeId: string;
  orbitRingIndex: number;
  trackIndex: number;                // 0 for primary ring, 1 for expanded outer track
  orbitSectorId: string;
  angleRad: number;                  // Assigned polar angle in radians [0, 2π)
  radiusPx: number;                  // Assigned radial distance in pixels
  x: number;                         // Calculated Cartesian X coordinate
  y: number;                         // Calculated Cartesian Y coordinate
}

/**
 * Shared Orbit Visual Guides Metadata produced by Workstream B for UI Overlay (C)
 */
export interface OrbitGuideMetadata {
  rings: Array<{ ringIndex: number; radiusPx: number; label: string }>;
  sectors: Array<{ sectorId: string; label: string; startAngleRad: number; endAngleRad: number }>;
}
```

---

## 10. EVIDENCE TAXONOMY

All workstream reports and assertions must classify findings according to the strict 5-tier evidence hierarchy:

1. **Repository Truth:** Directly verified in active codebase source files or configurations.
2. **Mathematical Truth:** Analytical derivation or geometric proof.
3. **Simulation Evidence:** Output from unit/integration test execution scripts.
4. **Runtime Truth:** Verified execution in real node runtime environment.
5. **Browser Truth:** Observed behavior in Playwright / Chrome browser execution with DOM inspection.
6. **Proposal:** Design proposal or conjecture not yet verified by code.

*No proposal or simulation evidence shall override Repository Truth.*

---

## 11. PARALLEL DEPENDENCY GRAPH

```text
               ┌─────────────────────────────────────────┐
               │ MASTER EXECUTION CONTRACT ESTABLISHED   │
               └────────────────────┬────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           │                                                 │
           ▼                                                 ▼
┌─────────────────────────────┐                   ┌─────────────────────────────┐
│ WORKSTREAM A                │                   │ WORKSTREAM B                │
│ Semantic Projection         │                   │ Geometry & Placement        │
│ (orbit-semantics.ts)        │                   │ (orbit-layout.ts)           │
└──────────┬──────────────────┘                   └──────────┬──────────────────┘
           │                                                 │
           └────────────────────────┬────────────────────────┘
                                    │
                                    ▼
                       ┌───────────────────────────┐
                       │ WORKSTREAM C              │
                       │ Integration & UI          │
                       │ (architecture-layout.ts)  │
                       └────────────┬──────────────┘
                                    │
                                    ▼
                       ┌───────────────────────────┐
                       │ WORKSTREAM D              │
                       │ Runtime & Browser Valid.  │
                       │ (PBIM, CST, Playwright)   │
                       └────────────┬──────────────┘
                                    │
                                    ▼
                       ┌───────────────────────────┐
                       │ CONVERGENCE 1 — MVP GATE  │
                       └───────────────────────────┘
```

---

## 12. CONVERGENCE GATES

### CONVERGENCE 1 — MVP GATE
* **Trigger:** Completion of Workstreams A, B, C, and D.
* **Verification Criteria:**
  1. `orbit-layout.ts` passes 100% of mathematical unit tests with zero NaN/Infinity coordinates.
  2. Integrated orchestrator executes `architectureMode = 'orbit'` without throwing errors.
  3. Real fixture `PBIM` (528 nodes, 2063 edges) calculates Orbit coordinates within $< 250\text{ms}$.
  4. Real browser Playwright test confirms Orbit mode renders node layout and visual guide circles on canvas.
  5. Position Authority verified: Switching from Orbit to Static mode preserves coordinates with 0px drift.

### CONVERGENCE 2 — FINAL ADVERSARIAL RELEASE GATE
* **Trigger:** Post-MVP hardening and edge-case stress testing.
* **Verification Criteria:**
  1. 100% node conservation: $|V_{input}| = |V_{rendered}|$ across all test fixtures.
  2. Edge preservation: All dependency edges remain attached to correct node endpoints.
  3. Zero regression in existing `hierarchical` and `hybrid` layouts.
  4. Full project isolation: Switching projects cleanly clears/reloads Orbit layout state without memory leaks.
  5. Final Verdict issued: `PASS — ORBIT RELEASE READY`.

---

## 13. DEFERRED COMPLEXITY

The following items are explicitly **DEFERRED** from the Orbit MVP scope:
* Force-directed spring physical relaxation or continuous iterative simulation.
* Dynamic community detection algorithms (e.g., Louvain / Infomap).
* Hierarchical edge bundling or curved Bezier splines customization.
* Complex spectral layout or multi-dimensional scaling.
* Level-of-Detail (LOD) node hiding based on zoom depth in Orbit mode.

---

## 14. KNOWN UNRESOLVED QUESTIONS

1. **Sector Angle Allocation Strategy:** Should sector angular span be allocated strictly proportional to node count or using logarithmic water-filling? *(To be resolved by Workstream B empirical geometry tests).*
2. **Sub-track Expansion Spacing:** What is the optimal radial delta $\Delta R$ for multi-track ring overflow when a single ring sector exceeds angular capacity? *(To be resolved by Workstream B).*

---

# NEXT EXECUTION

Downstream execution must proceed strictly in the following sequence:

1. **Run Workstream A — Semantic + Projection**
   - *Purpose:* Implement semantic projection adapter (`orbit-semantics.ts`).
   - *Inputs:* `explorer/src/lib/layout/layers.ts`, `features.ts`, `domains.ts`.
   - *Expected Artifact:* `ARCHITECTURE_ORBIT_WORKSTREAM_A_SEMANTIC_CONTRACT.md` and `orbit-semantics.ts`.
   - *Success Gate:* 100% deterministic mapping for all nodes in `cst` and `pbim`.

2. **Run Workstream B — Geometry + Placement**
   - *Purpose:* Implement radial geometry math engine (`orbit-layout.ts`).
   - *Inputs:* `OrbitNodeMetadata` contract from Workstream A.
   - *Expected Artifact:* `explorer/src/lib/layout/orbit-layout.ts` and `orbit-layout.test.ts`.
   - *Success Gate:* Pass all angular allocation, multi-track expansion, and 0-overlap clearance tests.

3. **Run Workstream C — Integration + GraphView + UI**
   - *Purpose:* Connect Orbit layout engine to orchestrator, worker, state persistence, and UI.
   - *Inputs:* Codebase artifacts from Workstreams A and B.
   - *Expected Artifact:* Orchestrator diff and `ARCHITECTURE_ORBIT_WORKSTREAM_C_INTEGRATION_REPORT.md`.
   - *Success Gate:* UI mode toggle renders Orbit layout smoothly.

4. **Run Workstream D — Runtime + Browser Validation**
   - *Purpose:* Run end-to-end PBIM benchmark and Playwright browser verification.
   - *Inputs:* Integrated system from Workstreams A, B, and C.
   - *Expected Artifact:* `ARCHITECTURE_ORBIT_WORKSTREAM_D_VALIDATION_REPORT.md` and screenshots.
   - *Success Gate:* PBIM runtime execution succeeds $< 250\text{ms}$ with 0 console errors.

5. **Run Convergence 1 — MVP + Real PBIM Gate**
   - *Purpose:* Cross-audit reconciliation and MVP release authorization.

6. **Run Convergence 2 — Final Adversarial Release Gate**
   - *Purpose:* Final release certification.

---

## FINAL VERDICT

```text
MASTER EXECUTION CONTRACT ESTABLISHED — READY FOR PARALLEL WORKSTREAMS
```
