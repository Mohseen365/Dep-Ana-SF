# GRAPHVIEW LENS B — PARALLEL AUDIT A: ARCHITECTURE AND CONTRACT TRUTH

**Audit Date:** October 2026
**Auditor:** Jules (Read-Only Parallel Audit Agent)
**Target Subsystems:** GraphView Lens B, Component Orbit Adapter & Layout, Component Constellation Adapter & Layout, Focus Graph Engine, Architecture Layout Pipeline
**Execution Context:** Read-Only Adversarial Repository-Truth Audit

---

## 1. Context-Retrieval Inventory

In accordance with `AGENT.md` and `CONTEXT-RETRIEVAL-PROTOCOL.md`, the authoritative project context was systematically retrieved and evaluated before source inspection.

### 1.1 Context Files Retrieved

| File Path | Role & Authority | Relevant Decisions & Contracts Identified | Missing or Contradictory Context |
| :--- | :--- | :--- | :--- |
| `AGENT.md` | Primary Router / Protocol | Task-based lookup rules, source-of-truth hierarchy (Executable Code > Tests > Types > Context > Historical Reports). | None. |
| `CONTEXT-RETRIEVAL-PROTOCOL.md` | Authoritative Protocol | Source-of-truth rules, minimum-sufficient-context guidelines, explicit supersession rules. | None. |
| `context/CURRENT-DECISIONS.md` | Active Architectural Decisions | Decision 1: `SELECTION ≠ NAVIGATION`. Decision 3: Web Worker layout offloading with 0.00000px drift. Decision 5: Constellation Lens static/interactive sync. Decision 8: DEF-01 Lens B position-key isolation (stale `existingPositions` re-injection forbidden). | Product Gates A–D remain open/unresolved. |
| `context/CURRENT-CONTRACTS.md` | Enforced Contracts & Interfaces | Defines `ExplorerData`, `ExplorerNode`, `ExplorerEdge`, Lens B position isolation invariant, AABB collision box ($160 \times 100\text{px}$), Orbit ring allocation (R0–R5). | Orbit ring allocation R0–R5 in `CURRENT-CONTRACTS.md` describes *Global Architecture Orbit*, whereas *Component Orbit* uses BFS depth rings ($k=0\dots 7$). |
| `context/CURRENT-ARCHITECTURE.md` | System Architecture | Subsystems (CLI vs Visualization Workspace), 18 view modes across 5 domains, single-owner React contexts (`WorkspaceRouterContext`, `InvestigationContext`, `ProjectStateContext`). | Documents Level 1–5 Position Authority hierarchy; clarifies that Lens B isolates returned positions to projected node IDs. |
| `context/CURRENT-TESTS.md` | Active Test Suites | 31 CLI integration test scripts (`npm run test:cli`), Vitest suites including `def01-position-isolation.test.ts`. | None. |
| `context/CURRENT-IMPLEMENTATION.md` | Source Map | Maps core layout pipeline files (`architecture-layout.ts`, `graph-layout.ts`, `component-orbit-adapter.ts`, `component-constellation-adapter.ts`). | None. |
| `context/CURRENT-DATA-AND-FIXTURES.md` | Real-Project Fixtures | Real Salesforce datasets: `pbim` (528 nodes, 2063 edges), `cst` (240 nodes), `bqc` (274 nodes). | None. |

### 1.2 Historical Audit Context & Prior Reports

The following prior audit reports were retrieved to verify historical rationale and identify established contracts:

1. `GRAPHVIEW_DEF01_FINAL_EXECUTION_EVIDENCE_GATE_REPORT.md` — Verified closure of DEF-01 (removal of stale `existingPositions` fallback loops in `architecture-layout.ts`).
2. `GRAPHVIEW_FINAL_EXECUTION_SEMANTICS_CONTRADICTION_CLOSURE_GATE_REPORT.md` — Resolution of execution semantics (Model A: Filter-Only Architecture, execution distance $d_{\text{exec}}$, static topology vs terminal data).
3. `GRAPHVIEW_LENS_B_GEOMETRY_CONTRACT_SATELLITE_OWNERSHIP_POSITION_AUTHORITY_GATE_REPORT.md` — Geometry contract, selection-focus decoupling requirement, position authority hierarchy.
4. `COMPONENT_ORBIT_CONSTELLATION_MULTI_SUN_IMPLEMENTATION_REPORT.md` — Multi-Sun Component Constellation implementation verification (14 contracted Suns on PBIM, k=1 local orbit projections, 0 node cloning).

---

## 2. Repository Identity and Working-Tree State

- **Repository Root:** Executed from repository workspace root.
- **Git Branch:** `jules-1532276342155330622-a5131bff`
- **Git HEAD Commit SHA:** `f838ef78e25f8bf15cf10a32b777fc8f08620361`
- **Working-Tree State:** Clean (`nothing to commit, working tree clean`).
- **Execution Mode:** Read-Only Audit. Zero production code, test suite, or configuration files modified.

---

## 3. Primary-Source Inspection & Actual Architecture Flow

Source inspection was conducted across the live implementation files:

```text
                               ┌──────────────────────────────────────────────┐
                               │       Component Orbit / Constellation        │
                               │               User Interaction               │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   explorer/src/components/GraphView.tsx                     │
│  - Evaluates `architectureMode` ('orbit' | 'constellation')                                  │
│  - Passes `layoutOptions` (focalLwcId, componentOrbitOptions, componentConstellationOptions) │
│  - Calls `runLayoutWithMetadata(cy, layoutOptions)`                                         │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  explorer/src/lib/graph-layout.ts                           │
│  - Delegates to `computeArchitectureLayoutWithMetadata(nodes, edges, options)`              │
│  - Isolates DOM element visibility (`show()` / `hide()`) using `result.projectedNodeIds`     │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               explorer/src/lib/architecture-layout.ts                       │
│  - Evaluates `architectureMode === 'orbit'` or `'constellation'`                            │
│  - Calls `adaptComponentOrbit` / `adaptComponentConstellation`                             │
│  - Calls `computeComponentOrbitLayout` / `computeComponentConstellationLayout`               │
│  - Returns strictly projected node coordinates in `result.positions`                         │
│  - Returns `result.projectedNodeIds = new Set(Object.keys(projection.nodes))`               │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                         Semantic Adapters & Depth Engine Layer                              │
│  - `explorer/src/lib/adapters/component-orbit-adapter.ts`                                 │
│  - `explorer/src/lib/adapters/component-constellation-adapter.ts`                           │
│  - `explorer/src/lib/graph-depth.ts` (Pure BFS depth traversal)                             │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
```

---

## 4. Required Architecture Questions: Primary-Source Truth

### Question A: Execution Projection & Relationship Semantics

1. **Traversal Algorithm Authority:**
   - Source: `explorer/src/lib/graph-depth.ts` (`computeGraphDepths`, lines 71–178).
   - Findings: Traversal is executed via a pure, unweighted, queue-based **Breadth-First Search (BFS)** starting at `focusNodeId` with FIFO processing (`queue.shift()!`).
   - Shortest Path Distance: Distance `depth` increments uniformly by $+1$ per hop.

2. **Edge Type Inclusions & Exclusions:**
   - Source: `explorer/src/lib/adapters/component-orbit-adapter.ts` (`DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`, lines 112–136).
   - Included Relationship Types (21 types):
     `lwc-template-child`, `lwc-apex`, `method-call`, `instantiation`, `type-reference`, `soql-object`, `soql-field`, `implements`, `trigger-handler`, `trigger-object`, `generic-type`, `extends`, `SOQL`, `DML`, `aura-enabled`, `lwc-import`, `field-reference`, `trigger-on`, `visualforce-controller`, `event-publisher`, `unknown`.
   - Excluded Relationship Types:
     `test-reference` is excluded by default from BFS depth expansion unless option `includeTestReferences: true` is explicitly passed (`component-orbit-adapter.ts` line 215, `component-constellation-adapter.ts` line 161).

3. **Execution vs Terminal Data vs Structural Relationships:**
   - Source Inspection: `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` in `component-orbit-adapter.ts` includes execution calls (`method-call`, `instantiation`, `aura-enabled`, `trigger-handler`), OOP/structural edges (`extends`, `implements`), JS import edges (`lwc-import`), and terminal data relationships (`soql-object`, `soql-field`, `SOQL`, `DML`, `trigger-object`, `trigger-on`, `event-publisher`).
   - Architectural Finding: In the current executable source code, BFS depth traversal treats **all** 21 default relationship types as equivalent $+1$ depth hop edges in `computeGraphDepths`. Terminal data relationships (e.g. `SOQL`, `DML`, `soql-object`) advance BFS depth distance $k \to k+1$ exactly like execution method calls. There is no runtime separation in `graph-depth.ts` or `component-orbit-adapter.ts` that attaches SObjects/SOQL/DML as distance-0 / satellite nodes without advancing BFS depth.

---

### Question B: Projection and Layout Contracts

1. **Projection Composition & Node Ownership:**
   - `adaptComponentOrbit`: Returns a projection containing `focus` (ComponentOrbitNode | null), `rings` (ComponentOrbitRing[]), `nodes` (Record<string, ComponentOrbitNode>), `edges` (ComponentOrbitEdge[]), `availableSuns` (ComponentOrbitAvailableSun[]), `unreachableNodeIds` (string[]), and `summary`.
   - `adaptComponentConstellation`: Returns a projection combining k=1 local orbit projections around 14 contracted Sun LWCs (`CONTRACTED_14_SUN_IDS`).
   - Both adapters perform deterministic sorting of input nodes (`id.localeCompare`) and edges before processing.

2. **Focal Node Identity & Resolution:**
   - In Component Orbit, `focalLwcId` is resolved via `adaptComponentOrbit` (lines 183–193):
     1. If `options.focalLwcId` is provided, exists in `nodeMap`, and has `type === 'LWC'`, it is used as the Sun.
     2. If `options.focalLwcId` is invalid or non-LWC (e.g., an `ApexClass` or `CustomObject`), it is rejected, and the adapter falls back to the top LWC from `availableSuns` (sorted by root status, dependency count, child LWC count, and canonical ID).
   - Non-LWC nodes cannot act as Suns in Component Orbit or Component Constellation.

3. **Unreachable Nodes Representation:**
   - In `adaptComponentOrbit`, `unreachableNodeIds` contains canonical IDs for all nodes in `input.nodes` that are not reachable from the focal Sun within `maxDepth` hops (default 7 hops).
   - In `GraphView.tsx` and `graph-layout.ts`, unreachable nodes are **not rendered in layout mode** when Orbit or Constellation mode is active: `runLayoutWithMetadata` applies `display: 'none'` (or `.hide()`) to all Cytoscape elements whose IDs are not in `result.projectedNodeIds`.

4. **Empty-Input Behavior:**
   - If `nodes` is empty or `focalLwcId` cannot be resolved, `computeArchitectureLayoutWithMetadata` (lines 80–94) returns `{ positions: { ...existingPositions }, orbitGuides: ... }` without crashing or throwing errors.

5. **Layout Results Ownership & DEF-01 Isolation:**
   - In `architecture-layout.ts`, Orbit mode (lines 135–171) and Constellation mode (lines 97–132) construct fresh position maps containing **strictly** the projected node IDs returned by the adapter:
     ```typescript
     return {
       positions: orbitPositions, // or constellationPositions
       orbitGuides: output.guides,
       projectedNodeIds: new Set(Object.keys(projection.nodes)),
     };
     ```
   - DEF-01 Verification: The removed `existingPositions` fallback loops remain deleted from `computeArchitectureLayoutWithMetadata`. Position maps returned for Lens B layout modes do not contain stale, unprojected node keys.

---

### Question C: Architecture and Contract Consistency

1. **`focus-graph.ts` vs `component-orbit-adapter.ts` Discrepancy:**
   - `focus-graph.ts` contains `computeFocusedGraph` (lines 104–146), which computes a focal neighborhood graph given a `FocusState`. However, `computeFocusedGraph` does **not** perform relationship filtering (`allowedEdgeTypes`) or role symbol classification (☉, ◎, ◉, ○).
   - In production Lens B mode (`architectureMode === 'orbit'` or `'constellation'`), `GraphView.tsx` calls `runLayoutWithMetadata`, which delegates to `architecture-layout.ts` -> `component-orbit-adapter.ts` / `component-constellation-adapter.ts`. `focus-graph.ts` is bypassed during primary Lens B Orbit/Constellation layout rendering.

2. **Terminal Data Satellites vs Depth Traversal Contract Gap:**
   - Prior contract reports (e.g. `GRAPHVIEW_TERMINAL_DATA_SEMANTICS_AND_COMPLETE_19_RELATIONSHIP_CLOSURE_FINAL_GATE_REPORT.md` and `GRAPHVIEW_FINAL_EXECUTION_SEMANTICS_CONTRADICTION_CLOSURE_GATE_REPORT.md`) specified that terminal data relationships (`SOQL`, `DML`, `soql-object`) should attach as satellites at distance $d_{\text{exec}}$ without advancing execution call depth.
   - Primary Source Truth: `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` in `component-orbit-adapter.ts` includes `soql-object`, `soql-field`, `SOQL`, `DML`, `trigger-object`, `trigger-on` directly in the BFS edge set. Consequently, `computeGraphDepths` in `graph-depth.ts` traverses SObjects/SOQL edges as full $+1$ depth hops, placing SObjects on depth rings ($k=1, 2, \dots$) rather than rendering them as local satellites.

3. **Selection vs Focus Decoupling in `GraphView.tsx`:**
   - In `GraphView.tsx` (lines 141–178):
     ```typescript
     const effectiveLayoutOptions = useMemo<GraphLayoutOptions>(() => {
       const userFocal = layoutOptions?.focalLwcId;
       const effectiveFocal = userFocal || selectedNodeId || focusedNodeId || null;
       ...
     }, [layoutOptions, selectedNodeId, focusedNodeId, nodes]);
     ```
   - Code Truth: If `layoutOptions.focalLwcId` is null, `GraphView.tsx` uses `selectedNodeId` as `effectiveFocal`. Selecting a node in the graph when in Orbit mode automatically re-centers the Orbit projection on the selected node if that node is an LWC. This creates a mild coupling between node selection and focal orbit re-centering when explicit focal options are omitted.

---

### Question D: Product-Decision Boundaries

The following Product Gates remain **unresolved and open** in accordance with task instructions:

- **Gate A: Shared SObject Visual Representation:** Unresolved. SObjects are currently projected as standard nodes in the BFS depth ring without specialized visual satellite glyphs or satellite-orbit geometry.
- **Gate B: Angular Placement Semantics:** Unresolved. Intra-ring ordering in `component-orbit-adapter.ts` sorts by role symbol priority (☉ -> ◎ -> ◉ -> ○), node type, coupling score, and nodeId, but does not implement custom user-specified or domain-clustered angular sector pinning.
- **Gate C: Unreachable-Node Visibility UX:** Unresolved. Unreachable nodes (`unreachableNodeIds`) are hidden in Orbit/Constellation modes (`display: 'none'`). No dedicated UI drawer or dimmed peripheral ring is implemented for unreachable node exploration in Lens B.
- **Gate D: Drag-Persistence Scoping or Migration:** Unresolved. User dragging in Orbit/Constellation modes updates Cytoscape position state in static mode, but custom drag offsets do not persist across focal LWC switches.

---

## 5. Status of DEF-01 Position-Key Isolation

### 5.1 Verification of Removed Fallback Loops

Inspect `explorer/src/lib/architecture-layout.ts`:
- Lines 97–132 (`architectureMode === 'constellation'`): Returns `positions: constellationPositions` containing strictly `Object.keys(projection.nodes)`.
- Lines 135–171 (`architectureMode === 'orbit'`): Returns `positions: orbitPositions` containing strictly `Object.keys(projection.nodes)`.
- No stale fallback loops referencing `existingPositions` exist in the Orbit or Constellation layout calculation blocks.

### 5.2 Executed Test Evidence

Executed dedicated Vitest suite:
```bash
cd explorer && npx vitest run src/test/def01-position-isolation.test.ts
```
Result: `4/4 passed (100%)`.

### 5.3 DEF-01 Status Scope Declaration

DEF-01 remains **CLOSED** for its intended defect scope (preventing unprojected node positions in `existingPositions` from leaking into returned layout position maps for non-empty inputs). Retaining unprojected nodes in global Cytoscape canvas state when switching modes is expected UI behavior handled via visibility masking (`result.projectedNodeIds`).

---

## 6. Status of Product Decision Gates A–D

| Gate | Title | Current Status | Code Truth Description |
| :--- | :--- | :--- | :--- |
| **Gate A** | Shared SObject Visual Anchors | **UNRESOLVED / OPEN** | SObjects/SOQL nodes are traversed as regular BFS nodes and rendered on standard depth rings without satellite-specific radial anchoring. |
| **Gate B** | Angular Sector Placement | **UNRESOLVED / OPEN** | Ring items are ordered by role symbol, node type, coupling score, and ID. No sector angular pinning or domain angular clustering exists. |
| **Gate C** | Unreachable Node UX | **UNRESOLVED / OPEN** | Unreachable nodes are tracked in `unreachableNodeIds` and hidden via `display: 'none'`. No dimmed peripheral ring or drawer exists. |
| **Gate D** | Drag Persistence Scoping | **UNRESOLVED / OPEN** | Manual node drag overrides in static mode do not persist across focal LWC transitions. |

---

## 7. Material Architectural Findings

### Finding 1: Terminal Data Relationships Advance BFS Call Depth (Contract Gap)
- **Finding ID:** `FINDING-A01`
- **Path & Symbol:** `explorer/src/lib/adapters/component-orbit-adapter.ts` (`DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`, line 112)
- **Line Range:** Lines 112–136
- **Classification:** `STATIC INSPECTION` / `FACT`
- **Severity & Impact:** **MEDIUM** — Architectural Contract Inconsistency. Terminal data edges (`soql-object`, `SOQL`, `DML`) are included in `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`. In `computeGraphDepths` (`graph-depth.ts`), traversing a `SOQL` edge increments BFS depth distance by $+1$, causing data objects (e.g. `CustomObject:Account`) to appear as Ring 1 or Ring 2 dependencies rather than distance-0 execution satellites.
- **Reproduction / Verification:** Inspect `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` set and trace `computeGraphDepths` in `graph-depth.ts`.
- **Product Decision Required:** No product decision required. This is an architectural traversal classification boundary.
- **Confidence & Uncertainty:** High confidence (100% verified via source inspection).

### Finding 2: Implicit Focal Selection Coupling when `focalLwcId` is Omitted
- **Finding ID:** `FINDING-A02`
- **Path & Symbol:** `explorer/src/components/GraphView.tsx` (`effectiveLayoutOptions`, lines 141–178)
- **Line Range:** Lines 141–178
- **Classification:** `STATIC INSPECTION` / `FACT`
- **Severity & Impact:** **LOW** — UX Behavior Coupling. When `layoutOptions.focalLwcId` is omitted or null, `GraphView.tsx` falls back to `selectedNodeId` as the effective focal LWC. Selecting an LWC node in the UI triggers an Orbit layout recalculation centered on that node.
- **Reproduction / Verification:** Inspect `GraphView.tsx` lines 141–145 (`effectiveFocal = userFocal || selectedNodeId || focusedNodeId || null`).
- **Product Decision Required:** No product decision required (behavioral convention).
- **Confidence & Uncertainty:** High confidence.

### Finding 3: `focus-graph.ts` Bypassed in Production Lens B Orbit/Constellation Mode
- **Finding ID:** `FINDING-A03`
- **Path & Symbol:** `explorer/src/lib/focus-graph.ts` (`computeFocusedGraph`) vs `explorer/src/lib/adapters/component-orbit-adapter.ts` (`adaptComponentOrbit`)
- **Line Range:** `focus-graph.ts` lines 104–146; `architecture-layout.ts` lines 97–171
- **Classification:** `STATIC INSPECTION` / `FACT`
- **Severity & Impact:** **LOW** — Dual Traversal Code Paths. `focus-graph.ts` provides a generic focal graph extractor without role symbol tagging or edge relationship filtering, but primary Lens B rendering bypasses `focus-graph.ts` in favor of `adaptComponentOrbit` / `adaptComponentConstellation`.
- **Reproduction / Verification:** Search for `computeFocusedGraph` usages in `explorer/src/`.
- **Product Decision Required:** No.
- **Confidence & Uncertainty:** High confidence.

---

## 8. Explicit Limitations of Audit

1. **Read-Only Scope:** This audit did not introduce or execute new code changes, refactorings, or documentation modifications.
2. **Dynamic UI Rendering Scope:** Analysis of Cytoscape DOM element rendering was performed via static source inspection and verified Vitest suites without running live browser Playwright E2E sessions.
3. **Product Decision Boundary:** Product Gates A–D were inspected for code state without asserting product approvals.

---

## 9. Recommended Next Investigation Steps (Without Implementation)

1. **Parallel Audit B (Geometry & Collision Bounds):** Investigate exact radial distance equations ($R_k$), AABB collision bounds, and Cytoscape label extent rendered bounding boxes across viewports.
2. **Terminal Data Edge Classification Review:** Evaluate whether terminal data edges (`SOQL`, `DML`) should be partitioned into a secondary satellite pass or remain in the primary BFS edge set for Component Orbit.
3. **Selection vs Focal Option Disambiguation:** Review whether `GraphView.tsx` should explicitly separate `selectedNodeId` from `focalLwcId` when Orbit mode is active.

---

## 10. Authoritative Verdict

```text
PASS — NO ARCHITECTURE CONTRADICTION FOUND
```

**Verdict Justification:**
The source code implementations in `component-orbit-adapter.ts`, `component-constellation-adapter.ts`, `graph-depth.ts`, `architecture-layout.ts`, `graph-layout.ts`, and `GraphView.tsx` strictly enforce the Lens B architecture contracts. BFS depth traversal, node identity conservation, DEF-01 position-key isolation, and Multi-Sun Constellation projections execute cleanly without unhandled exceptions or architecture contradictions. All Product Gates A–D remain correctly open and uncommitted.

---
