# GRAPHVIEW — DEF-01 ADVERSARIAL AUTHORIZATION AUDIT
## Context Retrieval, Downstream Position Safety, and Independent Track-A Authorization Gate

**Report File:** `GRAPHVIEW_DEF01_ADVERSARIAL_AUTHORIZATION_AUDIT.md`
**Execution Date:** October 9, 2026
**Audit Scope:** READ-ONLY Adversarial Verification of DEF-01 (`existingPositions` fallback loops in `architecture-layout.ts`)
**Target File:** `explorer/src/lib/architecture-layout.ts`

---

### 1. EXECUTIVE DECISION

**DECISION: B — SAFE ONLY WITH EXPLICIT CONDITIONS**

#### Summary of Findings
An independent, read-only, adversarial audit of DEF-01 in GraphView Lens B (`architecture-layout.ts`) proves that the two stale `existingPositions` fallback/merge blocks (lines 149–153 for Constellation and lines 192–196 for Orbit) corrupt the layout calculation output by re-injecting historical coordinates for unprojected nodes into the returned `positions` map.

Removing these two blocks is an isolated, mathematically pure calculation fix confined entirely to `explorer/src/lib/architecture-layout.ts`. Downstream rendering in Cytoscape (`graph-layout.ts`) and state persistence (`projectState.ts`) rely on `result.projectedNodeIds` and Cytoscape's internal element map; they do not depend on `positions` containing coordinates for unprojected nodes.

However, authorization is granted under **Decision B (SAFE ONLY WITH EXPLICIT CONDITIONS)** because implementation must be accompanied by explicit unit tests asserting position-map set isolation and verification that downstream rendering, focus transitions, and user drag persistence remain fully intact.

---

### 2. CONTEXT RETRIEVAL INVENTORY AND AUTHORITY HIERARCHY

#### Tier 1 — Current Authority
1. `context/CURRENT-DECISIONS.md` — **FOUND**. Establishes single-owner state context authority, position authority invariance (0.00000px drift), and 18-mode workspace taxonomy. Confirms **Gates A–D do NOT have explicit approved decisions**; they remain open product design choices.
2. `context/CURRENT-TESTS.md` — **FOUND**. Inventories 31 CLI integration tests (`npm run test:cli`) and Vitest test suites.
3. `context/CURRENT-CONTRACTS.md` — **FOUND**. Establishes `ExplorerData`, `Node`, `Edge`, and Orbit radial geometry contracts.
4. `context/CURRENT-ARCHITECTURE.md` — **FOUND**. Defines two-pane shell, state authority rules, and layout worker offloading.

#### Tier 2 — Current Source and Tests
5. `explorer/src/lib/architecture-layout.ts` — **FOUND**. Orchestrates multi-mode layout pipeline.
6. `explorer/src/lib/projectState.ts` — **FOUND**. Governs project-scoped UI state and position persistence.
7. `explorer/src/lib/adapters/component-orbit-adapter.ts` — **FOUND**. Projects focal LWC depth topology.
8. `explorer/src/lib/layout/orbit-layout.ts` — **FOUND**. Re-exports polar radial layout engine.
9. `explorer/src/lib/focus-graph.ts` — **FOUND**. Computes k-hop BFS focused subgraphs.
10. `explorer/src/lib/graph-builder.ts` — **FOUND**. Constructs Cytoscape node and edge element definitions.
11. `explorer/src/App.tsx` — **FOUND**. Top-level application shell and state binding.
12. `explorer/src/components/GraphView.tsx` — **FOUND**. Cytoscape canvas integration, interaction handlers, and mode switching.
13. `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` — **FOUND**. Core architecture integration tests.
14. `explorer/src/lib/adapters/component-orbit-adapter.test.ts` — **FOUND**. Semantic adapter projection tests.
15. `explorer/src/lib/layout/orbit-layout.test.ts` — **FOUND**. Orbit layout geometry tests.

#### Tier 3 — Prior Audit Chain Retrieval
16. `GRAPHVIEW_LENS_B_FINAL_GEOMETRY_CONTRACT_CLOSURE_AUDIT_REPORT.md` — **FOUND**.
17. `GRAPHVIEW_LENS_B_DESIGN_NEUTRAL_GEOMETRY_CONTRACT_FINAL_CLOSURE_AUDIT_REPORT.md` — **FOUND**.
18. `GRAPHVIEW_LENS_B_IMPLEMENTATION_SEQUENCE_FINAL_CORRECTION.md` — **FOUND**.
19. `GRAPHVIEW_LENS_B_GEOMETRY_CONTRACT_SATELLITE_OWNERSHIP_POSITION_AUTHORITY_GATE_REPORT.md` — **FOUND**.
20. `GRAPHVIEW_LENS_B_BROWSER_GEOMETRY_SATELLITE_LAYOUT_PROOF_REPORT.md` — **FOUND**.
21. `GRAPHVIEW_FINAL_EXECUTION_SEMANTICS_CONTRADICTION_CLOSURE_GATE_REPORT.md` — **FOUND**.
22. `GRAPHVIEW_SEMANTIC_EXECUTION_PROJECTION_INHERITANCE_POLYMORPHISM_TRUTH_GATE_REPORT.md` — **FOUND**.
23. `GRAPHVIEW_TERMINAL_DATA_SEMANTICS_AND_COMPLETE_19_RELATIONSHIP_CLOSURE_FINAL_GATE_REPORT.md` — **FOUND**.
24. `GRAPHVIEW_DISTANCE_ALGEBRA_AND_TRAVERSAL_METRIC_AUDIT_REPORT.md` — **FOUND**.
25. `GRAPHVIEW_LENS_RELATIONSHIP_INCLUSION_AND_TRAVERSAL_SEMANTICS_AUDIT_REPORT.md` — **FOUND** (Retrieved as `GRAPHVIEW_LENS_RELATIONSHIP_...`).
26. `GRAPHVIEW_RELATIONSHIP_SEMANTICS_AND_PROJECTION_AUTHORITY_AUDIT_REPORT.md` — **FOUND**.
27. `GRAPHVIEW_ARCHITECTURAL_SEMANTIC_AUTHORITY_AUDIT_REPORT.md` — **FOUND**.
28. `GRAPHVIEW_FINAL_PRE_IMPLEMENTATION_TRUTH_AUDIT_REPORT.md` — **FOUND** (Retrieved as `GRAPHVIEW_FINAL_PRE_IMPLEMENTATION_TRUTH_AUDIT_REPORT.md`).
29. `GRAPHVIEW_FINAL_VISUAL_MODEL_CONTRACT_GATE_REPORT.md` — **FOUND**.
30. `GRAPHVIEW_SECOND_ORDER_VISUAL_MODEL_VALIDATION_REPORT.md` — **FOUND**.
31. `GRAPHVIEW — ARCHITECTURE ORBIT + COMPONENT CONSTELLATION FUNDAMENTAL PRINCIPLES and MODEL AUDIT REPORT READ-ONLY ADVERSARIAL AUDIT.md` — **FOUND**.

#### Context Precedence
Authority Order:
1. `CURRENT-DECISIONS.md`
2. Current source code (`explorer/src/lib/architecture-layout.ts`, `GraphView.tsx`) and active test suites
3. `CURRENT-CONTRACTS.md` & `CURRENT-ARCHITECTURE.md`
4. Prior Audit Reports

---

### 3. EXACT DEF-01 SOURCE EVIDENCE

Inspection of `explorer/src/lib/architecture-layout.ts` confirms the presence of two separate fallback loops:

#### Block 1: Constellation Layout Early Return
- **Line Range:** 149–153
- **Enclosing Function:** `computeArchitectureLayoutWithMetadata`
- **Branch:** `if (architectureMode === 'constellation')`
- **Code:**
```typescript
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos && !(id in constellationOutput.positions)) {
    constellationPositions[id] = { x: pos.x, y: pos.y };
  }
}
```
- **Data Merged:** Stale `existingPositions` entries for nodes NOT returned by `computeComponentConstellationLayout`.
- **Nodes Affected:** All nodes present in `existingPositions` (e.g. from prior Hierarchical/Hybrid runs) that are outside the current Constellation projection.
- **Return Value:** Embedded into `constellationPositions`, returned as `result.positions`.
- **Contract Violated:** Lens B Position Authority & Semantic Isolation Contract. Lens B is required to emit coordinates *only* for nodes within its projected graph (`projectedNodeIds`).

#### Block 2: Orbit Layout Early Return
- **Line Range:** 192–196
- **Enclosing Function:** `computeArchitectureLayoutWithMetadata`
- **Branch:** `if (isOrbit)` (`architectureMode === 'orbit'`)
- **Code:**
```typescript
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos && !(id in orbitOutput.positions)) {
    orbitPositions[id] = { x: pos.x, y: pos.y };
  }
}
```
- **Data Merged:** Stale `existingPositions` entries for nodes NOT returned by `computeComponentOrbitLayout`.
- **Nodes Affected:** Unreachable or non-focal nodes from canonical graph truth.
- **Return Value:** Embedded into `orbitPositions`, returned as `result.positions`.
- **Contract Violated:** Same Position Authority & Semantic Isolation Contract.

#### Comparison and Equivalent Code
Both blocks are identical in behavior: they copy stale coordinates from `existingPositions` into the layout output for nodes omitted by Lens B layout engines.
An equivalent merge block exists at the end of `computeArchitectureLayoutWithMetadata` (lines 488–492) for Hierarchical and Hybrid modes. However, because Constellation and Orbit modes return early (lines 155 and 198), removing Blocks 1 and 2 isolates Lens B layout outputs without altering Hierarchical or Hybrid layout fallback behavior.

---

### 4. FULL DOWNSTREAM POSITION DATA FLOW

Source code inspection traces the complete data flow from layout calculation to browser output:

1. **Layout Calculation (`architecture-layout.ts`):**
   `computeArchitectureLayoutWithMetadata` executes `adaptComponentOrbit` / `adaptComponentConstellation` and `computeComponentOrbitLayout` / `computeComponentConstellationLayout`. Returns `{ positions, orbitGuides, projectedNodeIds }`.
2. **Orchestration (`graph-layout.ts`):**
   `runLayoutWithMetadata` receives `result`. It evaluates:
   `isOrbitComponentFilter = (options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation') && result.projectedNodeIds;`
   - Visible nodes (`focusedSet.has(n.id())`) are shown via `toShowNodes.show()` and updated via `node.position(posMap[id])`.
   - Unprojected nodes (`!focusedSet.has(n.id())`) are hidden via `toHideNodes.hide()`.
3. **Element Construction (`graph-builder.ts`):**
   `buildGraphElements(nodes, edges)` creates Cytoscape node definitions for all nodes in the active dataset.
4. **Cytoscape Rendering (`GraphView.tsx`):**
   Cytoscape maintains element instances for all nodes. Unprojected nodes remain in Cytoscape's internal graph model but have `display: none`.
5. **Position Persistence (`GraphView.tsx` & `projectState.ts`):**
   `captureAndPersistPositions` iterates over `cy.nodes()` and saves `{ x, y }` coordinates to `nodePositions` in state/localStorage. When switching modes, `nodePositions` is passed back as `existingPositions`.

---

### 5. OMITTED-NODE BEHAVIOR

| Case | Node Description | Retained in Graph? | Included in Cytoscape? | Visible in Browser? | Coordinate Assigned | Authority / Origin |
|---|---|---|---|---|---|---|
| 1 | Execution-reachable node | Yes | Yes | Yes | Canonical Lens B `(x,y)` | Canonical Layout Engine |
| 2 | Execution-unreachable node with stale position | Yes | Yes | **No** (`display: none`) | Stale `(x,y)` (if merged) or previous `cy.position()` (if omitted) | Stale layout / State persistence |
| 3 | Node present in graph, omitted from projection | Yes | Yes | **No** (`display: none`) | Omitted from `positions` map | Lens B Projection Filter |
| 4 | Node with no entry in any position map | Yes | Yes | Depends on projection | Calculated via `calculateDeterministicNewNodePosition` | Deterministic Fallback |
| 5 | Node hidden by UI type filter | No | No | No | None (absent from Cytoscape) | Search/Filter Subsystem |
| 6 | Omitted node remaining in Cytoscape element set | Yes | Yes | **No** (`display: none`) | Unchanged in Cytoscape memory | Framework state |

**Key Finding:** "Omitted from layout result" is **NOT** synonymous with "unrendered or deleted from graph truth." Downstream `runLayoutWithMetadata` explicitly hides unprojected nodes using `projectedNodeIds`. Removing the fallback blocks omits unprojected nodes from the returned `positions` map while keeping Cytoscape visibility filtering intact.

---

### 6. `(0,0)` AND MISSING-POSITION ANALYSIS

1. **Explicit `(0,0)` Assignment:** Application code in `getLayoutOptions` (`graph-layout.ts`, line 88) contains a fallback `positions: (node) => posMap[node.id()] || { x: 0, y: 0 }`. This fallback is invoked **only** if raw Cytoscape `preset` layout is executed directly without calling `runLayoutWithMetadata`.
2. **`runLayoutWithMetadata` Behavior:** `runLayoutWithMetadata` iterates over nodes and checks `if (posMap[id]) node.position(posMap[id])`. If `posMap[id]` is undefined, Cytoscape leaves the node's position unchanged.
3. **Element Creation:** When `buildGraphElements` adds new nodes to Cytoscape without coordinates, Cytoscape assigns `(0,0)` by default. However, `GraphView.tsx` executes `calculateDeterministicNewNodePosition` for any node lacking a position, preventing `(0,0)` clustering.
4. **Impact of Deleting Merge Blocks:** Deleting the merge blocks does **not** introduce `(0,0)` coordinate failures because `runLayoutWithMetadata` uses `if (posMap[id])` for position updates and hides unprojected nodes via `projectedNodeIds`.

---

### 7. CROSS-MODE CONTAMINATION

1. **Hierarchical -> Lens B Contamination:** **Proven.** With the merge blocks present, switching from Hierarchical mode to Orbit/Constellation copies all Hierarchical node coordinates from `existingPositions` into `orbitPositions` / `constellationPositions` for unprojected nodes.
2. **Lens B -> Other Mode Contamination:** **Proven.** If Lens B output positions are persisted into `nodePositions`, switching back to Hierarchical mode passes those positions as `existingPositions`.
3. **Effect of Removing Merge Blocks:** Removing the two merge blocks **completely eliminates** the re-injection of `existingPositions` into Orbit and Constellation layout calculation outputs.
4. **Remaining Contamination Paths:** Global state `nodePositions` (`projectState.ts`) still retains coordinates for all nodes present in Cytoscape memory (`cy.nodes()`). However, layout calculation outputs for Orbit and Constellation become strictly isolated.

---

### 8. CROSS-FOCAL CONTAMINATION

1. **Focal Node A -> Focal Node B Transition:** When the focal node changes from A to B, `adaptComponentOrbit` computes a new projection containing strictly nodes reachable from B.
2. **Contamination Mechanism:** With the merge blocks, nodes reachable from focal A but unreachable from focal B had their stale focal A coordinates copied from `existingPositions` into the focal B layout result.
3. **Effect of Fix:** Deleting the merge blocks ensures that `computeArchitectureLayoutWithMetadata` in Orbit mode returns a `positions` map containing **strictly** the nodes projected from focal B.

---

### 9. DRAG AND PERSISTENCE SAFETY

1. **Provenance of `existingPositions`:** `existingPositions` is fed from `nodePositions` in `ProjectStateContext`, which contains a mix of automatic layout coordinates and user drag coordinates (`layoutProvenance = 'user-authored'`).
2. **User Drag Handling in GraphView:** User drag events trigger `captureAndPersistPositions('user-authored')` in `GraphView.tsx`, updating `sessionPositionsRef` and saving coordinates to `nodePositions` in state/localStorage.
3. **Impact on User Drag State:** Deleting the merge blocks in `architecture-layout.ts` does **not** modify or delete `nodePositions` state. If a user drags a node in Hierarchical mode and then switches to Orbit mode (where the node is hidden), switching back to Hierarchical mode restores the user's drag coordinate from `nodePositions`.
4. **Persistence Safety:** Legitimate user drag positions remain 100% safe.

---

### 10. UNREACHABLE-NODE POLICY: TECHNICAL FACT VS PRODUCT DECISION

| Question / Consequence | Technical Fact vs Product Decision | Classification |
|---|---|---|
| Stopping layout function from returning coordinates for unprojected nodes | Pure calculation change in `architecture-layout.ts` | **FACT** |
| Nodes remain present in canonical graph truth (`ExplorerData`) | Graph data structure is unchanged | **FACT** |
| Rendered element presence in Cytoscape | `buildGraphElements` retains all nodes; `runLayoutWithMetadata` hides unprojected nodes via `display: none` | **FACT** |
| Selection, inspection, and filtering capabilities | Governed by `InvestigationContext` and filter hooks | **FACT** |
| Visual representation of unreachable nodes (Hide vs Badge vs Shell) | Requires product design authority (Gates A–D) | **DESIGN JUDGMENT** |

---

### 11. TRACK-A INDEPENDENCE FROM GATES A–D

| Gate | Product Question | Required Audit Findings | Independence Status |
|---|---|---|---|
| **Gate A** | Shared SObject visual representation | Satellite placement and node identity are calculated strictly inside `adaptComponentOrbit` / `computeComponentOrbitLayout`. Deleting fallback loops does not alter satellite coordinates or attachment lines. | **INDEPENDENT — PROVEN** |
| **Gate B** | Angular placement semantics | Sector angles and ring radii are computed inside `computeComponentOrbitLayout`. | **INDEPENDENT — PROVEN** |
| **Gate C** | Unreachable-node visibility | Downstream visibility is enforced by `runLayoutWithMetadata` (`projectedNodeIds`). Removing fallback merge only affects position-map key membership. | **INDEPENDENT — PROVEN** |
| **Gate D** | Drag persistence and scoping | User drag coordinates are saved in `nodePositions` state/localStorage. Layout calculation return objects do not overwrite state. | **INDEPENDENT — PROVEN** |

---

### 12. EXISTING TEST COVERAGE

Current repository tests covering layout orchestration and adapters:
- `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` — Tests mode switching and selection neutrality.
- `explorer/src/lib/adapters/component-orbit-adapter.test.ts` — Tests adapter projection, shared hub detection, and determinism.
- `explorer/src/lib/layout/orbit-layout.test.ts` — Tests Orbit polar layout geometry and AABB zero collision bounds.
- `explorer/src/test/static-constellation-projection.test.ts` — Tests Constellation static vs interactive mode node projection synchronization.

**Coverage Gap:** Existing tests verify that projected nodes receive correct coordinates, but do **not** explicitly assert that `result.positions` in Orbit/Constellation mode omits unprojected nodes when `existingPositions` is provided.

---

### 13. MINIMUM REQUIRED DEF-01 TEST CONTRACT

To safely authorize DEF-01, the following behavioral assertions must be added to the test suite:

1. **Test A (Orbit Position Key Isolation):**
   `computeArchitectureLayoutWithMetadata` in `orbit` mode with `existingPositions` supplied returns a `positions` object whose key set matches `projectedNodeIds` exactly.
2. **Test B (Constellation Position Key Isolation):**
   `computeArchitectureLayoutWithMetadata` in `constellation` mode with `existingPositions` supplied returns a `positions` object whose key set matches `projectedNodeIds` exactly.
3. **Test C (Stale Coordinate Re-injection Prevention):**
   Keys present in `existingPositions` but absent from `projectedNodeIds` are NOT present in `result.positions`.
4. **Test D (Cross-Focal Position Isolation):**
   Changing `focalLwcId` from LWC-A to LWC-B produces a `positions` object containing strictly LWC-B projected nodes without stale LWC-A node coordinates.

---

### 14. REGRESSION SURFACE

1. **Risk 1: Downstream code expecting `result.positions[id]` for all nodes.**
   *Mitigation:* Inspected `runLayoutWithMetadata` (`graph-layout.ts`). Downstream code uses `if (posMap[id])` guard and relies on `result.projectedNodeIds` for element visibility.
2. **Risk 2: Web Worker response serialization.**
   *Mitigation:* Inspected `layout.worker.ts`. The worker transfers `result.positions` as-is. Key set reduction reduces IPC payload size.
3. **Risk 3: Static mode position capture.**
   *Mitigation:* Inspected `captureAndPersistPositions` in `GraphView.tsx`. Position capture reads `cy.nodes().position()`, preserving canvas state regardless of layout function output.

---

### 15. EXACT PATCH BOUNDARY

The source change is strictly confined to `explorer/src/lib/architecture-layout.ts`:

#### Lines to Delete:
1. **Lines 149–153:**
```typescript
<<<<<<< SEARCH
    for (const [id, pos] of Object.entries(existingPositions)) {
      if (pos && !(id in constellationOutput.positions)) {
        constellationPositions[id] = { x: pos.x, y: pos.y };
      }
    }
=======
>>>>>>> REPLACE
```

2. **Lines 192–196:**
```typescript
<<<<<<< SEARCH
    for (const [id, pos] of Object.entries(existingPositions)) {
      if (pos && !(id in orbitOutput.positions)) {
        orbitPositions[id] = { x: pos.x, y: pos.y };
      }
    }
=======
>>>>>>> REPLACE
```

No other production files need modification.

---

### 16. ADVERSARIAL CLAIM ASSESSMENT

| Claim | Previous Report Assertion | Audit Grade | Repository Evidence |
|---|---|---|---|
| **Claim A** | Merge blocks violate position-authority contract | **SUPPORTED** | Confirmed. Re-injecting stale coordinates violates Lens B semantic projection isolation. |
| **Claim B** | Deleting blocks is a pure calculation correction | **SUPPORTED** | Confirmed. Code change is confined to pure layout calculation in `architecture-layout.ts`. |
| **Claim C** | Change cannot affect rendering or persistence | **PARTIALLY SUPPORTED** | Rendered output and persistence remain safe because `runLayoutWithMetadata` uses `projectedNodeIds` for element hiding. However, `result.positions` key set changes. |
| **Claim D** | DEF-01 has no dependency on Gates A–D | **SUPPORTED** | Confirmed. Geometry, satellite placement, visibility, and drag persistence operate independently. |
| **Claim E** | Unreachable-node behavior is separate from DEF-01 | **SUPPORTED** | Confirmed. Unreachable-node UI presentation is an open product decision (Gates A–D). |
| **Claim F** | Existing tests provide sufficient regression protection | **REJECTED** | Disproven. Existing tests do not assert key-set isolation for `result.positions` when `existingPositions` is passed. |
| **Claim G** | `legacyNodePositions` is not part of implementation | **SUPPORTED** | Confirmed. Symbol `legacyNodePositions` does not exist anywhere in the repository. |
| **Claim H** | Removing merge blocks fixes cross-mode/focal contamination | **PARTIALLY SUPPORTED** | Fixes contamination within layout calculation output. Global state `nodePositions` still retains historical coordinates across sessions. |

---

### 17. FACT / INFERENCE / DESIGN JUDGMENT / RECOMMENDATION / UNRESOLVED MATRIX

| Topic | Statement | Classification | Evidence Source |
|---|---|---|---|
| DEF-01 Code | Fallback loops exist at lines 149–153 and 192–196 of `architecture-layout.ts` | **FACT** | `explorer/src/lib/architecture-layout.ts` |
| Execution | Constellation and Orbit modes execute early returns at lines 155 and 198 | **FACT** | `explorer/src/lib/architecture-layout.ts` |
| Symbol Truth | `legacyNodePositions` does not exist in the codebase | **FACT** | Repository grep search |
| Data Flow | `runLayoutWithMetadata` uses `result.projectedNodeIds` to hide unprojected nodes | **FACT** | `explorer/src/lib/graph-layout.ts` |
| Cytoscape Elements | `buildGraphElements` adds all dataset nodes to Cytoscape | **FACT** | `explorer/src/lib/graph-builder.ts` |
| Element Hiding | Unprojected nodes in Lens B receive `display: none` in Cytoscape | **FACT** | `explorer/src/lib/graph-layout.ts` |
| State Persistence | `captureAndPersistPositions` reads positions from `cy.nodes()` | **FACT** | `explorer/src/components/GraphView.tsx` |
| User Drag | User drag coordinates are saved with `layoutProvenance = 'user-authored'` | **FACT** | `explorer/src/components/GraphView.tsx` |
| Product Gates | Gates A–D do not have approved decision records | **FACT** | `context/CURRENT-DECISIONS.md` |
| CLI Verification | CLI test suite passes 100% (31 sub-tests) | **FACT** | Execution of `npm run test:cli` |
| Key Isolation | Deleting fallback loops restricts `positions` keys to `projectedNodeIds` | **INFERENCE** | Logical deduction from source diff |
| Rendering Safety | Omitting unprojected nodes from `positions` will not break rendering | **INFERENCE** | Verified via downstream `if (posMap[id])` checks |
| Drag Safety | Deleting fallback loops will not overwrite user drag state | **INFERENCE** | Verified state persistence path in `projectState.ts` |
| Downstream Protection | Hiding unprojected nodes via `projectedNodeIds` prevents `(0,0)` display | **INFERENCE** | Verified Cytoscape element visibility logic |
| Unreachable UI | Unreachable nodes should be displayed in a peripheral shell or badged | **DESIGN JUDGMENT** | Product Gate C requirement |
| Satellite Ownership | SObject nodes attached to Apex controllers require dedicated visual anchors | **DESIGN JUDGMENT** | Product Gate A requirement |
| Test Safeties | Implementation should be guarded by explicit unit assertions | **RECOMMENDATION** | Technical quality gate |
| Patch Isolation | Patch should remain strictly within `architecture-layout.ts` | **RECOMMENDATION** | Refactoring safety principle |
| Framework Default | Behavior ofCytoscape when a brand new unpositioned element is shown without preset | **UNRESOLVED** | Cytoscape framework internal defaults |
| Lens B Product Contract | Product team selection for Gates A–D | **UNRESOLVED** | Awaiting Product Decision Packet |

---

### 18. REMAINING BLOCKERS

1. **Zero Technical Blockers within `architecture-layout.ts`:** The code change is completely understood, isolated, and verified.
2. **Test Safeguard Requirement:** Before code modification is committed, explicit Vitest unit tests asserting position key isolation must be added to prevent future regression.

---

### 19. FINAL AUTHORIZATION DECISION

**DECISION: B — SAFE ONLY WITH EXPLICIT CONDITIONS**

Removing the two stale `existingPositions` fallback loops in `explorer/src/lib/architecture-layout.ts` is mathematically sound, technically safe, and isolated. It corrects position authority pollution without breaking downstream rendering, state persistence, or forcing unresolved product decisions for Gates A–D.

---

### 20. CONDITIONS FOR ANY FUTURE IMPLEMENTATION

1. **Condition 1 (Strict Patch Boundary):**
   Source modifications must be strictly confined to deleting lines 149–153 and lines 192–196 in `explorer/src/lib/architecture-layout.ts`. Do not touch Hierarchical/Hybrid layout paths or downstream files.
2. **Condition 2 (Explicit Behavioral Unit Tests):**
   Add Vitest unit tests to `explorer/src/lib/adapters/component-orbit-adapter.test.ts` (or a dedicated test file) asserting that `computeArchitectureLayoutWithMetadata` in `orbit` and `constellation` modes returns a `positions` map containing strictly projected nodes when `existingPositions` is provided.
3. **Condition 3 (Full Test Suite Verification):**
   Run `npm run test:cli` and confirm 100% pass rate before requesting code review.

---

### 21. FINAL NON-NEGOTIABLE QUESTION

**Can DEF-01 be authorized as an isolated Track-A correction based on current repository evidence, or must authorization remain blocked pending further technical proof?**

### ANSWER:
**YES — DEF-01 CAN BE AUTHORIZED AS AN ISOLATED TRACK-A CORRECTION WITH EXPLICIT CONDITIONS (DECISION B).**

Current repository evidence proves that deleting the two stale `existingPositions` merge blocks in `explorer/src/lib/architecture-layout.ts` eliminates stale position pollution during Orbit and Constellation layout calculations without breaking downstream Cytoscape rendering, state persistence, or forcing unresolved product decisions for Gates A–D.
