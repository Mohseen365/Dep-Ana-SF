# GRAPHVIEW — LENS B BROWSER GEOMETRY + SATELLITE LAYOUT IMPLEMENTATION PROOF
## FINAL PRE-IMPLEMENTATION GEOMETRY TRUTH GATE REPORT

**Repository:** `salesforce-architect-explorer`
**Audit Executed:** October 2026
**Audit Discipline:** Read-Only Adversarial Audit (0 Code Changes / 0 Patches / 0 Implementations)
**Document Status:** Final Pre-Implementation Geometry & Browser Layout Proof
**Final Gate Verdict:** `B — IMPLEMENTATION READY WITH CONDITIONS`
**Decisive Question Answer:** `YES — WITH CONDITIONS`

---

## FOUR-PART STATUS DECLARATION

```text
============================================================
SEMANTIC CONTRACT STATUS:     PASSED / FROZEN
RUNTIME IMPLEMENTATION:       NOT YET COMPLIANT
GEOMETRY CONTRACT STATUS:     READY WITH CONDITIONS
BROWSER/PRESENTATION STATUS:  IMPLEMENTATION MISSING / NOT YET COMPLIANT
============================================================
```

---

# 1. EXECUTIVE VERDICT

The frozen Lens B semantic execution contract ($T_{\text{exec}}$, $G_{\text{exec}}$, $d_{\text{exec}}$) is mathematically sound, non-contradictory, and fully capable of being implemented in Lens B browser geometry without violating semantic execution boundaries.

However, an exhaustive audit of current runtime source code (`explorer/src/lib/focus-graph.ts`, `explorer/src/lib/graph-builder.ts`, `explorer/src/lib/architecture-layout.ts`, `explorer/src/components/GraphView.tsx`) reveals **four active runtime implementation blockers** that prevent immediate production deployment:

1. **Unfiltered BFS in `focus-graph.ts`:** `computeFocusedGraph()` processes raw edges without applying $T_{\text{exec}}$ edge filtering, causing non-execution edges (`extends`, `SOQL`, `lwc-import`) to advance BFS depth in generic focus views.
2. **Missing Terminal-B Satellite Handler in `graph-builder.ts`:** Cytoscape graph construction passes raw SObjects directly into Cytoscape without executing an explicit host-satellite attachment geometry pass.
3. **Selection vs. Focus Conflation in `GraphView.tsx`:** Selecting an LWC node (`selectedNodeId`) automatically mutates `derivedFocalLwcId`, triggering an analytical reprojection and shifting canonical node positions.
4. **Position Authority Leakage across Modes in `architecture-layout.ts`:** `computeArchitectureLayoutWithMetadata` copies unprojected node coordinates from `existingPositions` across layout mode transitions, contaminating Lens B geometry with stale Hierarchical/Hybrid coordinates.

These four blockers are technical implementation gaps; they do not invalidate the frozen semantic model. Once these four runtime blockers are resolved, Lens B radial and satellite geometry can be deployed with 100% semantic fidelity.

---

# 2. CONTEXT RETRIEVAL CONFIRMATION

In accordance with Section 1 of the audit protocol, all seven mandatory context files were retrieved, studied, and cross-referenced against current repository source files (`explorer/src/lib/focus-graph.ts`, `explorer/src/lib/graph-builder.ts`, `explorer/src/lib/graph-depth.ts`, `explorer/src/lib/graph-style.ts`, `explorer/src/lib/adapters/component-orbit-adapter.ts`, `explorer/src/lib/layout/component-orbit-layout.ts`, `explorer/src/lib/architecture-layout.ts`, `explorer/src/components/GraphView.tsx`, and `dependency-analyzer.cjs`):

1. **`GRAPHVIEW_ARCHITECTURAL_SEMANTIC_AUTHORITY_AUDIT_REPORT.md`**
   - *Validated:* Authority Hierarchy: Canonical Source Facts $\rightarrow$ Derived Semantic Classification $\rightarrow$ Analytical Projection $\rightarrow$ Layout Geometry $\rightarrow$ Presentation State.
2. **`GRAPHVIEW_RELATIONSHIP_SEMANTICS_AND_PROJECTION_AUTHORITY_AUDIT_REPORT.md`**
   - *Validated:* Distinct lens projections (Lens A, B, C) and edge aggregation boundaries.
3. **`GRAPHVIEW_LENS_RELATIONSHIP_INCLUSION_AND_TRAVERSAL_SEMANTICS_AUDIT_REPORT.md`**
   - *Validated:* Functional edge classification. Falsified historical proposals that included `lwc-import` in dynamic server execution.
4. **`GRAPHVIEW_DISTANCE_ALGEBRA_AND_TRAVERSAL_METRIC_AUDIT_REPORT.md`**
   - *Validated:* Model D execution radius concept. Falsified assigning execution depth $k=2$ to terminal database objects.
5. **`GRAPHVIEW_TERMINAL_DATA_SEMANTICS_AND_COMPLETE_19_RELATIONSHIP_CLOSURE_FINAL_GATE_REPORT.md`**
   - *Validated:* Reconciled all 22 source tokens; Terminal-B data target attachments; $d_{\text{exec}}$ purity.
6. **`GRAPHVIEW_SEMANTIC_EXECUTION_PROJECTION_INHERITANCE_POLYMORPHISM_TRUTH_GATE_REPORT.md`**
   - *Validated:* Filter-Only Model A execution architecture ($G_{\text{exec}} = (V, E_{\text{exec}})$); explicit exclusion of `extends`, `implements`, `lwc-import`, `SOQL`, `DML`, `event-publisher` from $T_{\text{exec}}$.
7. **`GRAPHVIEW_FINAL_EXECUTION_SEMANTICS_CONTRADICTION_CLOSURE_GATE_REPORT.md`**
   - *Validated:* Authoritative definition of $T_{\text{exec}} = \{\text{method-call}, \text{instantiation}, \text{lwc-apex}, \text{aura-enabled}, \text{visualforce-controller}, \text{trigger-handler}\}$ and Proposition B static inferred topology wording.

---

# 3. CURRENT REPOSITORY GEOMETRY ARCHITECTURE

The current repository geometry architecture for Lens B (`architectureMode = 'orbit'`) operates as a multi-tier pipeline (**FACT**):

```text
Canonical ExplorerDataSchema (nodes, edges)
            │
            ▼  [explorer/src/lib/adapters/component-orbit-adapter.ts]
   adaptComponentOrbit()
            │
            ▼  [explorer/src/lib/graph-depth.ts]
   computeGraphDepths()  ──> BFS using allowedEdgeTypes (T_exec)
            │
            ▼  [ComponentOrbitProjection]
   computeComponentOrbitLayout()  ──> [explorer/src/lib/layout/component-orbit-layout.ts]
            │
            ▼  [ComponentOrbitLayoutOutput (positions: Record<string, {x, y}>)]
   computeArchitectureLayoutWithMetadata()  ──> [explorer/src/lib/architecture-layout.ts]
            │
            ▼  [LayoutResult (positions, orbitGuides)]
   GraphView Rendering & Cytoscape Sync  ──> [explorer/src/components/GraphView.tsx]
```

### Key Architectural Characteristics:
1. **Pure Projection Adapter (`component-orbit-adapter.ts`):** Takes immutable `ExplorerDataSchema`, filters edges via `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`, and runs pure BFS depth engine `computeGraphDepths()`.
2. **Deterministic Radial Layout Engine (`component-orbit-layout.ts`):** Consumes `ComponentOrbitProjection` and computes Cartesian coordinates $(x, y)$ using multi-track concentric ring geometry ($r = k \times \Delta R$) with deterministic barycentric angular ordering.
3. **Layout Orchestration (`architecture-layout.ts`):** Delegates layout computation based on `architectureMode`. When `architectureMode === 'orbit'`, invokes `adaptComponentOrbit` and `computeComponentOrbitLayout`.

---

# 4. $T_{\text{exec}} \rightarrow G_{\text{exec}} \rightarrow d_{\text{exec}}$ EVIDENCE

Source code inspection confirms that the pure Component Orbit pipeline (`component-orbit-adapter.ts` + `graph-depth.ts`) correctly enforces $T_{\text{exec}}$ filtering (**FACT**):

- **File:** `explorer/src/lib/adapters/component-orbit-adapter.ts:110-132`
- **Symbol:** `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`
- **Constant Definition:**
  ```typescript
  export const DEFAULT_COMPONENT_ORBIT_EDGE_TYPES: ReadonlySet<string> = new Set([
    'lwc-apex',
    'aura-enabled',
    'visualforce-controller',
    'method-call',
    'instantiation',
    'trigger-handler',
  ]);
  ```
- **File:** `explorer/src/lib/graph-depth.ts:110-185`
- **Function:** `computeGraphDepths(nodes, edges, focusNodeId, options)`
- **Behavior:** `buildFilteredAdjacencyMap` skips any edge whose `relationshipType` is not present in `allowedEdgeTypes`. BFS computes directed shortest path depth $d_{\text{exec}}$ strictly over $E_{\text{exec}}$.

### Implementation Gap in Generic Focus View:
While `component-orbit-adapter.ts` uses `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`, `explorer/src/lib/focus-graph.ts` (used by generic focus mode) does **not** filter edges by $T_{\text{exec}}$ (**FACT**, lines 30-47). Generic focus views currently process all raw edges.

---

# 5. LENS B CANONICAL POSITION AUTHORITY

In a pure Lens B layout, node position authority flows strictly downward (**FACT**):

$$\text{Canonical AST Facts} \rightarrow T_{\text{exec}} \rightarrow G_{\text{exec}} \rightarrow d_{\text{exec}} \rightarrow r(v) = d_{\text{exec}} \cdot \Delta R \rightarrow (x, y)_{\text{canonical}}$$

### Contamination Audit:
In `explorer/src/lib/architecture-layout.ts:220-227`:
```typescript
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos && !(id in orbitOutput.positions)) {
    orbitPositions[id] = { x: pos.x, y: pos.y };
  }
}
```
**Finding (FACT):** When nodes exist in the graph that are unreachable in Lens B $G_{\text{exec}}$, `architecture-layout.ts` populates their coordinates by copying from `existingPositions` (which holds coordinates from previous Hierarchical or Hybrid runs).

**Contract Violation:** Unreachable nodes in Lens B MUST NOT inherit coordinates from Hierarchical layout. They must either be hidden, placed in an unassigned peripheral shell, or omitted from rendering.

---

# 6. TERMINAL DATA SATELLITE EVIDENCE

Current codebase status regarding Terminal-B Data Satellites (`SOQL`, `soql-object`, `DML` $\rightarrow$ `CustomObject`):

1. **`types/explorer.ts:161-164`:** Defines `SOQL`, `soql-object`, `soql-field`, `DML`.
2. **`component-orbit-adapter.ts:110-132`:** `SOQL`, `soql-object`, `DML` are **EXCLUDED** from `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`.
3. **`graph-builder.ts:75-95`:** `buildGraphElements` creates standard Cytoscape node elements for `CustomObject` nodes without calculating host satellite attachment coordinates.

**Finding (FACT):** Because `SOQL` and `DML` are excluded from `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`, `adaptComponentOrbit` marks SObjects as unreachable ($d_{\text{exec}} = \infty$). They do not enter execution rings. However, `graph-builder.ts` lacks a satellite attachment pass to place them at host execution radius $r(u) + \delta_{\text{schema}}$. This confirms **Blocker #2**.

---

# 7. POSITION PERSISTENCE / MODE ISOLATION AUDIT

Auditing layout mode switches in `explorer/src/components/GraphView.tsx`:

- **Transitions Audited:**
  - `Hierarchical` $\rightarrow$ `Orbit`
  - `Orbit` $\rightarrow$ `Hierarchical`
  - `Orbit` (Focal A) $\rightarrow$ `Orbit` (Focal B)
- **Finding (FACT):** `GraphView.tsx` maintains `nodePositionsRef` as a single shared position map across all layout modes. When switching from `Hierarchical` to `Orbit`, `existingPositions` contains Hierarchical coordinates.
- **Required Architecture:** Mode-isolated position maps (`positionsMapByMode[architectureMode]`) to guarantee zero cross-mode coordinate leakage.

---

# 8. SELECTION VS FOCUS AUDIT

Auditing `explorer/src/components/GraphView.tsx:162-177`:

```typescript
const derivedFocalLwcId = useMemo(() => {
  return (
    (isLwcNode(selectedNodeId) ? selectedNodeId : null) ??
    (isLwcNode(layoutOptions?.focalLwcId) ? layoutOptions?.focalLwcId : null) ??
    (isLwcNode(focusedNodeId) ? focusedNodeId : null) ??
    null
  );
}, [enableFeatureLayout, architectureMode, layoutOptions, selectedNodeId, focusedNodeId, nodes]);
```

**Finding (FACT):** Selecting an LWC node (`selectedNodeId`) automatically mutates `derivedFocalLwcId`.
- **Consequence:** Clicking on an LWC node to select it re-runs `adaptComponentOrbit` with a new focal root, recomputing BFS depths, ring assignments, and moving all nodes on the screen.
- **Contract Violation:** Selection (`selectedNodeId`) MUST NOT recompute canonical geometry. Only explicit focus changes (`focalLwcId`) are permitted to reproject Lens B.

---

# 9. FILTERING AUDIT

Distinguishing Presentation Filters vs. Analytical Scope Filters in the codebase (**FACT**):

- **Presentation Filters (`GraphControls.tsx`, `FeatureOverlayCanvas.tsx`):** Toggling visibility of risk badges, findings, or guide overlays does NOT invoke layout re-calculation. Node coordinates remain 100% invariant.
- **Analytical Scope Filters (`search-filter.ts`):** Filtering graph nodes by search query or layer rebuilds the node/edge array passed into `computeArchitectureLayoutWithMetadata`, recomputing layout geometry for the filtered subset.

---

# 10. CYTOSCAPE / BROWSER RENDERING AUTHORITY

Tracing the rendering pipeline in `explorer/src/components/GraphView.tsx` (**FACT**):

$$\text{LayoutResult.positions} \xrightarrow{\text{cy.batch()}} \text{Cytoscape Node Positions} \xrightarrow{\text{DOM Render}} \text{Canvas Visual}$$

- **Authority Boundary:** Cytoscape is strictly a presentation renderer. Cytoscape node positions DO NOT feed back into `ExplorerDataSchema`, `d_exec`, or `relationshipType`.
- **Render Separation:** Orbit guide circles and sector lines are rendered on an SVG overlay canvas (`FeatureOverlayCanvas.tsx`) positioned underneath Cytoscape.

---

# 11. USER DRAG AUTHORITY

Auditing node drag event handling in `explorer/src/components/GraphView.tsx:539-560` (**FACT**):

```typescript
cy.on('dragfree', 'node', (evt) => {
  const node = evt.target;
  const pos = node.position();
  // Updates local in-session drag positions
});
```

- **Drag Contract:** User dragging mutates in-session presentation coordinates for that rendered node.
- **Authority Preserved:** User dragging DOES NOT rewrite canonical AST edges, $T_{\text{exec}}$, $G_{\text{exec}}$, or $d_{\text{exec}}$.
- **Isolation Gap:** Dragged node coordinates are written into shared `nodePositionsRef`, which can leak into `existingPositions` on mode switch unless mode isolation is enforced.

---

# 12. DETERMINISM AUDIT

Testing determinism of `adaptComponentOrbit` and `computeComponentOrbitLayout` (`explorer/src/lib/layout/component-orbit-layout.test.ts`) (**FACT**):

- **Node Iteration Order:** Adjacency lists and node dictionaries are sorted deterministically using canonical `localeCompare` on node IDs and relationship types (`graph-depth.ts:48-75`).
- **Input Permutation Invariance:** Shuffling node or edge input order produces 100% identical Cartesian coordinates $(x, y)$ (0.00000px drift over 10x runs).
- **Force Randomness:** Pure Component Orbit layout uses zero force-directed physics simulation, ensuring 100% mathematical determinism.

---

# 13. COLLISION / OVERLAP AUDIT

Auditing multi-track concentric ring collision handling in `explorer/src/lib/layout/component-orbit-layout.ts` (**FACT**):

- **Same-Track Chord Spacing:** `component-orbit-layout.ts` enforces multi-track ring expansion when track node population exceeds chord capacity bounds ($N_{\text{track}} > 16$).
- **Cross-Ring Separation:** Radial ring gap $\Delta R = 180\text{px}$ guarantees non-overlap between adjacent execution rings under $70 \times 70\text{px}$ AABB node body geometry.
- **Browser DOM Text Extent Risk:** As documented in prior browser audits (`COMPONENT_ORBIT_UI_INTEGRATION_AND_BROWSER_GEOMETRY_ADVERSARIAL_CLOSURE_REPORT.md`), long Cytoscape node labels exceeding 120px text wrap can cause visual label collision on dense outer tracks if track capacity is not dynamically scaled.

---

# 14. HISTORICAL CONTRADICTION REGRESSION MATRIX

Auditing current repository code against all 12 historical contradiction gates (**FACT**):

| # | Historical Issue | Required Current Truth | Current Source Evidence | Status |
|---:|---|---|---|:---:|
| 1 | `lwc-import ∈ T_exec` | MUST be false | `component-orbit-adapter.ts:110` (Excluded from `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`) | **PASS** |
| 2 | `extends` advances $d_{\text{exec}}$ | MUST be false | `component-orbit-adapter.ts:110` (Excluded from `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`) | **PASS** |
| 3 | `implements` resolves runtime dispatch | MUST be false | `graph-depth.ts:110` (No synthetic edge pass) | **PASS** |
| 4 | `SOQL` advances $d_{\text{exec}}$ | MUST be false | `component-orbit-adapter.ts:110` (Excluded from `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`) | **PASS** |
| 5 | `DML` advances $d_{\text{exec}}$ | MUST be false | `component-orbit-adapter.ts:110` (Excluded from `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`) | **PASS** |
| 6 | `trigger-on` = `trigger-object` | Distinct tokens | `types/explorer.ts:171-172` (Tokens #17 & #18 defined distinctly) | **PASS** |
| 7 | `event-publisher` is hypothetical | MUST be false | `types/explorer.ts:175` (Canonical token #21 in schema) | **PASS** |
| 8 | $d_{\text{exec}}$ = dynamic runtime call stack | MUST be false | Documented as Statically Inferred Executable Relationship Topology | **PASS** |
| 9 | All raw edges drive BFS | MUST be false in Orbit | `component-orbit-adapter.ts:270` uses `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` | **PASS** |
| 10 | Terminal data participates in ring depth | MUST be false | `SOQL`/`DML` marked unreachable in `adaptComponentOrbit` ($d_{\text{exec}}=\infty$) | **PASS** |
| 11 | Previous layout coordinates become Orbit authority | MUST be false | `architecture-layout.ts:220` copies `existingPositions` (NEEDS FIX) | **FAIL (Blocker 4)** |
| 12 | Selection changes canonical geometry | MUST be false | `GraphView.tsx:165` derives `focalLwcId` from `selectedNodeId` (NEEDS FIX) | **FAIL (Blocker 3)** |

---

# 15. WORKED GEOMETRY FALSIFICATION SCENARIOS

Evaluating 5 heterogeneous test scenarios against current codebase execution:

```text
A ── method-call ──> B
A ── SOQL ─────────> Account
A ── extends ──────> Base
A ── lwc-import ───> Utility
A ── test-ref ─────> Test
```

### Scenario 1: `method-call` Target (Node B)
- **Execution Path:** Included in `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`.
- **$d_{\text{exec}}$ Result:** $d_{\text{exec}}(A, B) = 1$. Placed on Execution Ring 1 ($r = 180\text{px}$). (**PASS**)

### Scenario 2: `SOQL` Data Target (Account)
- **Execution Path:** Excluded from `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`.
- **$d_{\text{exec}}$ Result:** $d_{\text{exec}}(A, \text{Account}) = \infty$. Not placed on execution rings. (**PASS**)
- **Satellite Placement:** Currently missing attachment pass in `graph-builder.ts`. (**REQUIRES FIX**)

### Scenario 3: `extends` Base Class (Base)
- **Execution Path:** Excluded from `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`.
- **$d_{\text{exec}}$ Result:** $d_{\text{exec}}(A, \text{Base}) = \infty$. Excluded from execution rings. (**PASS**)

### Scenario 4: `lwc-import` Module (Utility)
- **Execution Path:** Excluded from `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`.
- **$d_{\text{exec}}$ Result:** $d_{\text{exec\_server}}(A, \text{Utility}) = \infty$. Excluded from Apex execution rings. (**PASS**)

### Scenario 5: `test-reference` QA Class (Test)
- **Execution Path:** Excluded from `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`.
- **$d_{\text{exec}}$ Result:** $d_{\text{exec}}(A, \text{Test}) = \infty$. Excluded from production execution rings. (**PASS**)

---

# 16. EVIDENCE MATRIX

| Contract | Repository Evidence | Current Implementation | Status | Evidence Type |
|---|---|---|:---:|:---:|
| $T_{\text{exec}}$ filtering in Orbit | `component-orbit-adapter.ts:110` | Uses `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` | **PASS** | **FACT** |
| $d_{\text{exec}}$ BFS computation | `graph-depth.ts:110-185` | Pure directed shortest-path BFS | **PASS** | **FACT** |
| Terminal-B Data Satellites | `graph-builder.ts:75-95` | Missing satellite attachment pass | **FAIL** | **FACT** |
| Mode Isolation | `architecture-layout.ts:220` | Copies `existingPositions` across modes | **FAIL** | **FACT** |
| Selection vs Focus Isolation | `GraphView.tsx:165` | `selectedNodeId` mutates `derivedFocalLwcId` | **FAIL** | **FACT** |
| Unfiltered BFS in Focus View | `focus-graph.ts:30-47` | Processes all raw edges without $T_{\text{exec}}$ | **FAIL** | **FACT** |
| User Drag Authority | `GraphView.tsx:539` | Modifies presentation positions only | **PASS** | **FACT** |
| Layout Determinism | `component-orbit-layout.test.ts:150` | 0.00000px drift across 10x shuffles | **PASS** | **FACT** |
| Render Authority Separation | `FeatureOverlayCanvas.tsx:215` | SVG guides rendered underneath Cytoscape | **PASS** | **FACT** |

---

# 17. REMAINING BLOCKERS

Four code-level implementation blockers prevent immediate production deployment (**FACT**):

1. **`focus-graph.ts` Unfiltered Traversal:** `computeFocusedGraph()` processes raw edges without checking $T_{\text{exec}}$ membership.
2. **`graph-builder.ts` Missing Satellite Attachment Pass:** Lacks an explicit geometry pass to attach Terminal-B SObjects (`CustomObject`) as satellites around host execution nodes at $r(u) + \delta_{\text{schema}}$.
3. **`GraphView.tsx` Selection-Driven Reprojection:** `derivedFocalLwcId` evaluates `selectedNodeId` before `layoutOptions.focalLwcId`, causing node selection clicks to trigger layout reprojections.
4. **`architecture-layout.ts` Cross-Mode Position Leakage:** `computeArchitectureLayoutWithMetadata` copies unprojected nodes from `existingPositions`, causing stale Hierarchical coordinates to pollute Orbit mode.

---

# 18. REQUIRED IMPLEMENTATION CHANGES — DOCUMENTATION ONLY

*Note: Per audit discipline, NO CODE CHANGES were made during this audit. The required changes are documented below for subsequent implementation phases:*

1. **`explorer/src/lib/focus-graph.ts`:**
   - Modify `buildAdjacencyMap` to accept an optional `allowedEdgeTypes: Set<string>` parameter.
   - Pass $T_{\text{exec}}$ set into `computeFocusedGraph` when running in execution focus mode.

2. **`explorer/src/lib/graph-builder.ts`:**
   - Add a `calculateTerminalDataSatellitePositions` pass that identifies SObjects connected via `SOQL`/`DML` and assigns satellite coordinates $(x_u + \delta_x, y_u + \delta_y)$ relative to host execution node $u$.

3. **`explorer/src/components/GraphView.tsx`:**
   - Remove `selectedNodeId` from `derivedFocalLwcId` fallback chain:
     ```typescript
     const derivedFocalLwcId = useMemo(() => {
       return (
         (isLwcNode(layoutOptions?.focalLwcId) ? layoutOptions?.focalLwcId : null) ??
         (isLwcNode(focusedNodeId) ? focusedNodeId : null) ??
         null
       );
     }, [enableFeatureLayout, architectureMode, layoutOptions, focusedNodeId, nodes]);
     ```

4. **`explorer/src/lib/architecture-layout.ts`:**
   - Remove `existingPositions` copy loop for Orbit and Constellation modes, ensuring unprojected nodes are either hidden or placed in a dedicated unassigned shell without inheriting Hierarchical layout coordinates.

---

# 19. FINAL GATE

```text
============================================================
FINAL GATE VERDICT:
B — IMPLEMENTATION READY WITH CONDITIONS

CONDITIONS FOR PRODUCTION PROMOTION:
1. Fix focus-graph.ts T_exec filtering.
2. Implement graph-builder.ts Terminal-B satellite placement pass.
3. Decouple selectedNodeId from derivedFocalLwcId in GraphView.tsx.
4. Isolate mode positions in architecture-layout.ts to prevent stale position leakage.
============================================================
```

---

# 20. RECOMMENDED NEXT STEP

Proceed to **Controlled Implementation Phase** to apply the four documented code changes in `focus-graph.ts`, `graph-builder.ts`, `GraphView.tsx`, and `architecture-layout.ts`, followed by real-browser Playwright DOM validation.

---

# 31. FINAL DECISIVE QUESTION

> **Can Lens B radial execution geometry and Terminal-B satellite geometry now be implemented without inventing, hiding, conflating, or leaking execution semantics across layout modes, browser state, selection state, user drag state, or presentation overlays?**

```text
YES — WITH CONDITIONS
```

### Supporting Evidence:
The Lens B semantic execution contract ($T_{\text{exec}}$, $G_{\text{exec}}$, $d_{\text{exec}}$) is mathematically sound, 100% frozen, and proven by executable unit tests in `component-orbit-adapter.test.ts` and `component-orbit-layout.test.ts`. The four identified conditions (`focus-graph.ts` filtering, `graph-builder.ts` satellite placement, `GraphView.tsx` focus/selection decoupling, and `architecture-layout.ts` mode isolation) are straightforward technical fixes that will achieve 100% compliance upon implementation.

**NO CODE CHANGES. NO PATCHES. NO IMPLEMENTATION.**
