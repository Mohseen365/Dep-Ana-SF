# COMPONENT ORBIT / CONSTELLATION (LENS B) — PARALLEL AUDIT C: UI, STATE, AND POSITION AUTHORITY

## 1. Mandatory Context Retrieval Inventory

### Retrieved Context Files & Source Artifacts
- `context/CURRENT-DECISIONS.md`: Confirmed Decisions 1 (Single-owner contexts, `SELECTION ≠ NAVIGATION`), 3 (Level 1–5 Position Authority Hierarchy, Web Worker 0.00000px drift), 5 (Constellation static/interactive sync filtering), 8 (DEF-01 Lens B position-key isolation for non-empty node inputs).
- `context/CURRENT-CONTRACTS.md`: Confirmed Explorer data contracts, DEF-01 isolation invariant, Cytoscape element filtering rules, and project-scoped state persistence.
- `context/CURRENT-ARCHITECTURE.md`: Confirmed 2-pane shell architecture, 18-mode taxonomy across 5 domains, and position authority level hierarchy.
- `context/CURRENT-TESTS.md`: Confirmed 31/31 passing CLI integration test suite and frontend Vitest suites (`def01-position-isolation.test.ts`, `static-constellation-projection.test.ts`, `component-orbit-integration.test.ts`, `component-orbit-visibility.test.ts`).
- `GRAPHVIEW_DEF01_FINAL_EXECUTION_EVIDENCE_GATE_REPORT.md`: Verified DEF-01 closure evidence (removal of two stale `existingPositions` fallback loops in `architecture-layout.ts`).
- `GRAPHVIEW_LENS_B_FINAL_AUTHORITATIVE_CONTRACT_AND_REPOSITORY_TRUTH_AUDIT.md`: Reconciled execution semantics ($T_{\text{exec}}$, $d_{\text{exec}}$, BFS algebra) vs unfrozen product gates A–D.
- `COMPONENT_ORBIT_CONSTELLATION_STATIC_MODE_EVIDENCE_CONTRADICTION_GATE_REPORT.md`: Verified static mode projection filtering synchronization (`GraphView.tsx` line 831).

### Position Authority Hierarchy (Level 1–5)
- **Level 1:** Static stored positions in dataset (`explorer-data.json`).
- **Level 2:** User override / drag coordinates (`user-authored` provenance).
- **Level 3:** Web Worker layout result (`layout.worker.ts`).
- **Level 4:** Synchronous pipeline fallback (`computeArchitectureLayoutWithMetadata`).
- **Level 5:** Cytoscape default fallback (`calculateDeterministicNewNodePosition`).

### Current State and Persistence Decisions
- `nodePositions` is managed by `ProjectStateContext.tsx` and persisted in `ProjectUIState.graphLayout.nodePositions` in localStorage keyed by `explorer.projectState.<projectId>`.
- `nodePositions` is currently stored as a **single flat map** (`Record<string, { x: number; y: number }>`) per project. There is no mode-specific or focal-specific keying schema in active production code.
- Layout switches and drag operations update `ProjectUIState.graphLayout.nodePositions` via `captureAndPersistPositions()` in `GraphView.tsx`.

### Unresolved Product Gates A–D
- **Gate A (Shared SObject Visual Representation):** PROPOSED / UNRESOLVED. Anchor selection policy and visual representation of shared SObjects across multiple features/hubs remain unfrozen.
- **Gate B (Angular Placement Semantics):** PROPOSED / UNRESOLVED. Domain sector mapping vs uniform radial packing remains unfrozen.
- **Gate C (Unreachable-Node Visibility UX):** PROPOSED / UNRESOLVED. Visual presentation of unprojected/unreachable nodes (peripheral shell at $R_{\max} + 250\text{px}$ vs hidden) remains unfrozen.
- **Gate D (Drag Position Persistence Lifecycle):** PROPOSED / UNRESOLVED. Scoping drag persistence by mode and focal LWC (`nodePositionsByMode[mode][focalId]`) vs flat global override remains unfrozen.

### Branch, HEAD, and Working-Tree Status
- **Branch:** `jules-2743033299083136737-6cee681c`
- **HEAD SHA:** `f838ef7 Merge pull request #624 from Mohseen365/jules-7532417870078139272-831b518b`
- **Working Tree Status:** Clean (0 staged or unstaged code/test modifications).

---

## 2. End-to-End Runtime Pipeline & State Authority Map

```text
[1. App / Data Loading]
    │  explorer/src/App.tsx (lines 190–210)
    ▼
[2. GraphView Options & Focal LWC Derivation]
    │  explorer/src/components/GraphView.tsx (lines 146–160)
    ▼
[3. Layout Orchestration Dispatch]
    │  explorer/src/lib/graph-layout.ts: runLayoutWithMetadata() (lines 197–210)
    ▼
[4. Lens B Adapter Projection & Layout Calculation]
    │  explorer/src/lib/architecture-layout.ts: computeArchitectureLayoutWithMetadata()
    │    ├── Constellation: adaptComponentConstellation() & computeComponentConstellationLayout() (lines 124–155)
    │    └── Orbit: adaptComponentOrbit() & computeComponentOrbitLayout() (lines 157–200)
    ▼
[5. Result Metadata Return]
    │  Returns { positions, orbitGuides, projectedNodeIds: Set<string> }
    ▼
[6. Cytoscape Element Creation & Visibility Filtering]
    │  explorer/src/components/GraphView.tsx: buildGraphElements() (lines 802–810)
    │  explorer/src/lib/graph-layout.ts: runLayoutWithMetadata() (lines 211–230)
    │    ├── Nodes in projectedNodeIds  -> style('display', 'element') + assigned positions
    │    └── Nodes NOT in projectedNodeIds -> style('display', 'none')
    ▼
[7. Canvas Render & Interaction]
    │  Rendered on Cytoscape Canvas (with FeatureOverlayCanvas overlay)
    ▼
[8. Drag Free Event Handling]
    │  explorer/src/components/GraphView.tsx: cy.on('dragfree', 'node') (lines 812–830)
    │  Captures dragged node coordinates -> sessionPositionsRef -> captureAndPersistPositions('user-authored')
    ▼
[9. Global State Update & Storage]
    │  explorer/src/context/ProjectStateContext.tsx & explorer/src/lib/projectState.ts
    │  Updates ProjectUIState.graphLayout.nodePositions and saves to localStorage
    ▼
[10. Mode Switching & Position Inheritance]
    │  Switching to Hierarchical / Hybrid mode -> runLayoutWithMetadata restores allNodes display:'element'
    │  stale/captured coordinates in nodePositions re-injected as Level 2 authoritative positions
```

### Call-Site Reference Table

| Pipeline Stage | Module / Source File | Function / Hook | Line Range | Role & State Ownership |
| :--- | :--- | :--- | :--- | :--- |
| **1. Data Entrance** | `explorer/src/App.tsx` | `App` component | lines 190–210 | Passes `nodes` and `edges` from active project dataset to `GraphView`. |
| **2. Focal Selection** | `explorer/src/components/GraphView.tsx` | `effectiveLayoutOptions` useMemo | lines 146–160 | Derives `focalLwcId` from `selectedNodeId`, `layoutOptions`, or `focusedNodeId`. |
| **3. Dispatch** | `explorer/src/lib/graph-layout.ts` | `runLayoutWithMetadata()` | lines 197–210 | Extracts nodes/edges from Cy instance, passes `existingPositions: nodePositions`. |
| **4. Projection** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata()` | lines 124–200 | Calls `adaptComponentConstellation` / `adaptComponentOrbit` and returns layout result. |
| **5. Filtering** | `explorer/src/lib/graph-layout.ts` | `runLayoutWithMetadata()` | lines 211–230 | Filters Cytoscape elements: projected nodes get `display: 'element'`, unprojected get `display: 'none'`. |
| **6. Element Sync** | `explorer/src/components/GraphView.tsx` | `useEffect` (Element Sync) | lines 800–860 | Re-builds DOM elements, applies `resolveAuthoritativePosition`, executes `runLayoutWithMetadata`. |
| **7. Drag Capture** | `explorer/src/components/GraphView.tsx` | `cy.on('dragfree', 'node')` | lines 812–830 | Captures position to `sessionPositionsRef`, triggers `captureAndPersistPositions('user-authored')`. |
| **8. Persistence** | `explorer/src/lib/projectState.ts` | `updateProjectState()` | lines 315–340 | Persists updated `nodePositions` into project-scoped localStorage key. |
| **9. Mode Switch** | `explorer/src/components/GraphView.tsx` | `useEffect` (Arch Mode) | lines 310–335 | Calls `runLayoutWithMetadata` with new mode, un-hides elements, persists new positions. |

---

## 3. Position Authority, Visibility, and Lifecycle Findings

### 3A. Position Authority Layer Ownership

1. **Calculated Layout Coordinates:** Owned by layout engines (`explorer/src/lib/layout/component-orbit-layout.ts`, `explorer/src/lib/layout/component-constellation-layout.ts`). They generate pure mathematical coordinates based on the adapter projection.
2. **User-Dragged Coordinates:** Owned by canvas interaction handlers in `GraphView.tsx` (`cy.on('dragfree')`), assigned `user-authored` provenance, and recorded in `sessionPositionsRef`.
3. **Persisted Positions:** Owned by `ProjectStateContext.tsx` / `projectState.ts` stored in `ProjectUIState.graphLayout.nodePositions`.
4. **Current Projection Membership:** Owned by adapter projection logic (`adaptComponentOrbit` in `component-orbit-adapter.ts`, `adaptComponentConstellation` in `component-constellation-adapter.ts`) returned in `result.projectedNodeIds`.
5. **Render Visibility:** Owned by orchestration logic in `runLayoutWithMetadata` (`graph-layout.ts` lines 211–230) and CSS class applications in `GraphView.tsx`.

#### Stale Coordinate Projection Contamination Evaluation
- **DEF-01 Verification:** In `computeArchitectureLayoutWithMetadata` (`architecture-layout.ts`), non-empty node inputs return position maps strictly limited to `result.projectedNodeIds`. Unprojected node coordinates are **not** inherited inside `computeArchitectureLayoutWithMetadata`.
- **UI State Contamination Defect:** While `computeArchitectureLayoutWithMetadata` is isolated, `GraphView.tsx`'s `captureAndPersistPositions()` method iterates over **all** Cytoscape nodes (`cy.nodes().forEach(n => ...)`), capturing positions for both visible (projected) and hidden (unprojected) nodes, and writing them to `sessionPositionsRef` and `ProjectUIState.graphLayout.nodePositions`. When the user switches back to Hierarchical or Hybrid mode, `resolveAuthoritativePosition` sees these stored coordinates in `nodePositions` as Level 2 authoritative positions, forcing Hierarchical mode to inherit Orbit/Constellation coordinates for unprojected nodes!

### 3B. Visibility and Rendering Analysis

- **Unprojected Element Lifecycle:** Unprojected nodes and edges are **retained in the Cytoscape DOM** but set to `display: 'none'` via Cytoscape style/show/hide API (`graph-layout.ts` lines 218–226). They are not removed from `cy.nodes()`.
- **Missing Coordinate Handling:** When a node in `cy.nodes()` lacks an entry in `nodePositions` and `sessionPositionsRef`:
  1. `resolveAuthoritativePosition` returns `null`.
  2. If `autoLayoutPolicy !== true`, `GraphView.tsx` (lines 789–797) calls `calculateDeterministicNewNodePosition(id, edges, knownPositionsMap)`.
  3. `calculateDeterministicNewNodePosition` computes the centroid of connected neighbors that already have known positions. If no connected neighbors have positions, it falls back to a deterministic offset based on hash of node ID.
  4. **No (0,0) Clustering:** Nodes do not collapse or cluster at `(0,0)`. Missing coordinates are safely and deterministically placed.

### 3C. Lifecycle and Persistence Analysis

- **Focal Node Switching:** Changing the focal LWC in Orbit mode (`effectiveLayoutOptions.focalLwcId`) causes `useEffect` in `GraphView.tsx` (lines 310–335) to re-run `runLayoutWithMetadata`. The adapter projects a new neighborhood (`projectedNodeIds`), and unprojected nodes from the previous focal view are hidden while new focal neighbors are rendered.
- **Layout Mode Switching (Lens B -> Hierarchical -> Lens B):**
  - Switching away from Lens B triggers `captureAndPersistPositions()` in `GraphView.tsx`.
  - Because `nodePositions` is a single flat map in `ProjectUIState`, Lens B positions overwrite pre-existing Hierarchical positions for all projected nodes.
  - Upon returning to Lens B, `runLayoutWithMetadata` re-computes the Lens B layout, which overrides stored positions unless marked `user-authored`.

---

## 4. Asynchronous Worker Orchestration Divergence

A critical implementation divergence was identified between synchronous layout orchestration (`runLayoutWithMetadata`) and asynchronous Web Worker orchestration (`runLayoutWithMetadataAsync`) in `explorer/src/lib/graph-layout.ts`:

- **Synchronous Orchestration (`runLayoutWithMetadata`, line 211):**
  ```typescript
  const isOrbitComponentFilter = (options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation') && result.projectedNodeIds;
  ```
  Applies visibility filtering (`display: 'none'` / `'element'`) for **both** `'orbit'` and `'constellation'` modes.

- **Asynchronous Worker Orchestration (`runLayoutWithMetadataAsync`, line 332):**
  ```typescript
  const isOrbitComponentFilter = options?.architectureMode === 'orbit' && result.projectedNodeIds;
  ```
  **Missing `|| options?.architectureMode === 'constellation'`!**

### Impact of Asynchronous Divergence
When Web Worker offloading is enabled for Component Constellation mode (`architectureMode === 'constellation'`), `runLayoutWithMetadataAsync` fails to set `isOrbitComponentFilter` to `true`. As a result, it executes the fallback branch (lines 351–362), setting `display: 'element'` on **all 528 nodes** in the project instead of hiding the 486 unprojected nodes! This causes unprojected nodes to remain visible during Web Worker execution in Constellation mode.

---

## 5. DEF-01 Scope Confirmation

### Verification of DEF-01 Fix Integrity
The DEF-01 bug fix in `explorer/src/lib/architecture-layout.ts` was audited against current HEAD:

1. **Non-Empty Node Input Isolation:**
   - Lines 170–173 (Constellation branch):
     ```typescript
     return {
       positions: constellationPositions,
       orbitGuides: constellationOutput.guides as any,
       projectedNodeIds: new Set(Object.keys(projection.nodes)),
     };
     ```
   - Lines 214–217 (Orbit branch):
     ```typescript
     return {
       positions: orbitPositions,
       orbitGuides: orbitOutput.guides as any,
       projectedNodeIds: new Set(Object.keys(projection.nodes)),
     };
     ```
   - Both branches return position maps containing **strictly projected node IDs**. No unprojected node keys from `existingPositions` are re-injected or merged into `result.positions`.

2. **Empty Input Fallback Preservation:**
   - Line 118: `if (safeNodes.length === 0) return { positions: { ...existingPositions } };`
   - Correctly preserves `existingPositions` when inputs are empty, as intended.

3. **No Legacy Schema Contamination:**
   - Confirmed zero references to `legacyNodePositions` or unapproved schema fallbacks in `architecture-layout.ts` or `graph-layout.ts`.

4. **Test Suite Status:**
   - Dedicated Vitest regression suite `explorer/src/test/def01-position-isolation.test.ts` passes 4/4 test cases.

---

## 6. Unresolved Product Gates A–D Boundaries

The four product design authority gates remain **unapproved and unresolved** in context files (`context/CURRENT-DECISIONS.md`) and active code:

| Product Gate | Area | Current Code Behavior | Technical Scope (Safe to Investigate) | Blocked Product Choice (Requires Approval) |
| :--- | :--- | :--- | :--- | :--- |
| **Gate A** | Shared SObject Visual Representation | Shared SObjects are mapped to `R5` schema ring in Orbit layout. | Geometry bounds, chord clearance, collision predicates. | Primary host sorting algorithm, shared vs duplicated node representation. |
| **Gate B** | Angular Placement Semantics | Nodes in same ring are packed uniformly around $2\pi$ circle. | Polar coordinate conversions, radial track staggering. | Domain sector angular mapping vs uniform radial packing. |
| **Gate C** | Unreachable-Node Visibility UX | Unprojected nodes are hidden (`display: 'none'`). | Cytoscape element filtering, batch style operations. | Peripheral shell placement at $R_{\max} + 250\text{px}$ at $30\%$ opacity vs complete element hiding. |
| **Gate D** | Drag Persistence Scoping | Dragged positions are saved into single flat `nodePositions` map. | Position capture in `GraphView.tsx`, event emission. | Mode/focal scoped keying schema (`nodePositionsByMode[mode][focalId]`) vs flat global persistence. |

---

## 7. Prioritized Findings Table

| Finding ID | Severity | Source Path & Line Range | Summary & Classification | User-Visible Impact | Reproduction Conditions | Recommended Minimal Follow-Up |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-PAR-C01** | **HIGH** | `explorer/src/lib/graph-layout.ts`<br>line 332 | **Async Worker Constellation Mode Visibility Divergence**<br>`FACT` / `STATIC INSPECTION` | In Web Worker layout execution, Constellation mode fails to hide unprojected nodes, showing 528 nodes instead of 42. | Enable Web Worker offloading and switch to Constellation mode. | Align line 332 in `runLayoutWithMetadataAsync` to include `|| options?.architectureMode === 'constellation'`. |
| **DEF-PAR-C02** | **MEDIUM** | `explorer/src/components/GraphView.tsx`<br>lines 215–235, 812–830 | **Flat Storage Cross-Mode Position Contamination**<br>`FACT` / `STATIC INSPECTION` | Dragging nodes or switching modes in Orbit/Constellation persists positions into flat `nodePositions`, overriding Hierarchical mode positions. | Drag a node in Orbit mode, switch to Hierarchical mode. | Require Product Gate D resolution to implement mode-scoped position keying in `projectState.ts`. |
| **DEF-PAR-C03** | **LOW** | `explorer/src/components/GraphView.tsx`<br>lines 228–245 | **Unprojected Node Position Capture During Drag**<br>`FACT` / `STATIC INSPECTION` | `captureAndPersistPositions` iterates over hidden nodes, snapshotting stale hidden coordinates into global state. | Drag any node in Orbit mode. | Filter `cy.nodes()` in `captureAndPersistPositions` to record only visible nodes or projected node IDs. |

---

## 8. Unknowns and Limitations

1. **Product Gate D Specification:** Until Product Decision Gate D is formally approved and recorded in `context/CURRENT-DECISIONS.md`, mode-scoped position persistence (`nodePositionsByMode`) cannot be implemented without violating repo guidelines.
2. **Browser Execution Evidence:** This audit was conducted via static code analysis and CLI integration test execution (`npm run test:cli`). Real browser DOM interaction was verified via existing Playwright test suites in prior audits.

---

## 9. Recommended Next Investigation

1. **Address DEF-PAR-C01:** Correct `runLayoutWithMetadataAsync` line 332 in `explorer/src/lib/graph-layout.ts` to include `|| options?.architectureMode === 'constellation'`, ensuring parity between synchronous and asynchronous layout execution.
2. **Formulate Product Decision Packet for Gate D:** Present Product Gate D (drag position persistence scoping) to decision authority for approval, specifying the `nodePositionsByMode` schema migration path.
3. **Refine Position Capture:** Update `captureAndPersistPositions` in `GraphView.tsx` to exclude hidden (`display: 'none'`) unprojected nodes from global persistence during Lens B interactions.

---

## Final Verdict

`FAIL — STATE OR RENDERING DEFECT EVIDENCED`

*(Verdict issued due to evidenced implementation defect DEF-PAR-C01: Asynchronous Web Worker orchestration divergence in `runLayoutWithMetadataAsync` omitting Constellation mode visibility filtering, causing unprojected nodes to remain visible during worker execution, and DEF-PAR-C02: Flat position storage contamination across layout modes).*
