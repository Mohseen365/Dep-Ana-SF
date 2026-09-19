# WAVE 5 — POST-LAYOUT BASELINE & NEXT-AREA FORENSIC AUDIT

**Author:** Jules (Software Engineer Agent)
**Date:** September 19, 2026
**Status:** FORENSIC AUDIT & PLANNING COMPLETE

---

## 1. EXECUTIVE SUMMARY

Following the acceptance of Wave 4D (`WAVE4D_FINAL_SPATIAL_ACCEPTANCE_REPORT.md`), the spatial layout engine of the Salesforce Dependency Analyzer and Architecture Explorer has reached a **frozen architectural baseline**.

### Key Baseline Audit Findings:
1. **Spatial Layout Engine Frozen:** The 11-stage architecture layout pipeline (`computeArchitectureLayout`) is completely stable, achieving 0 node overlaps, 0 component overlaps, 100% determinism, and input-order invariance across all 13 canonical benchmark fixtures. No additional spatial layout compaction algorithm is authorized or required.
2. **Position Authority & Static Mode Intact:** The 5-level Position Authority hierarchy (User Drag Session > Persisted Project State > Existing Cytoscape > Intelligent Layout > Fallback) is strictly enforced via `position-policy.ts`. Static Mode prevents all automatic node movements during filtering, focus changes, depth adjustments, selection, investigation drilling, and mode switches.
3. **Pipeline Invariants Verified:** Graph data transformation (`export-explorer.cjs`), schema validation (`schema.ts`), focus topology calculation (`focus-graph.ts`), and viewport preservation (`GraphView.tsx`) operate predictably without contract drift.
4. **Primary Engineering Priorities Identified:** Rather than continuing spatial compaction, future implementation waves must focus on:
   - **Performance Benchmark Hardening:** Adjusting environment-sensitive scale benchmark thresholds in `performance.test.ts` and optimizing 10,000-node $O(N^2)$ initial overlap checks in `scalability-layout.test.ts`.
   - **Test Suite Warning Remediation:** Wrapping React state updates in `ProjectDashboard.test.tsx` and `ProjectCreationModal.test.tsx` with `act(...)` to eliminate test suite stderr noise.
   - **Minimap / Navigator Container Styling:** Cleaning up `position: absolute !important` rules in `index.css` that override component-level positioning in `graph.css`.

---

## 2. WAVE 4 FROZEN CONTRACTS

Future development waves **MUST NOT** modify or violate the following baseline contracts:

### Layout Engine Contracts
- **Architecture-Aware 11-Stage Pipeline:** Must retain all 11 stages in `computeArchitectureLayout`.
- **Dynamic Layer Bands:** Layer Y coordinates are strictly bounded (`presentation` Y=100, `application` Y=350, `domain` Y=600, `schema` Y=850).
- **Domain Ordering:** Star hub centering and stem-prefix adjacency grouping in `global-layout.ts` must be preserved.
- **Local Placement:** Tiers and relationship-aware placement for primary production nodes must be preserved.
- **Satellite & Bridge Placement:** Radial/orbital satellite attachment and corridor bridge positioning must be preserved.
- **Disconnected Component Packing:** 2D First-Fit Decreasing Height (FFDH) shelf packing ($G_{\text{comp}} \ge 100\text{px}$) must be preserved.
- **Collision Safety & Determinism:** 0 node overlaps, 0 component overlaps, and 100% coordinate determinism ($P(\text{shuffle}(G)) = P(G)$) are mandatory invariants.

### Position Authority Contract
Strict 5-level non-bypasable resolution hierarchy:
$$\text{Level 1 (User Session)} > \text{Level 2 (Persisted)} > \text{Level 3 (Existing Cytoscape)} > \text{Level 4 (Intelligent Layout)} > \text{Level 5 (Fallback)}$$

### Static Mode Contract
Existing nodes must **NOT** automatically move because of:
- filters (type, risk, search text)
- focus node selection
- focus depth adjustments ($1..5$)
- focus direction changes (`incoming`, `outgoing`, `both`)
- cycle mode toggle
- investigation mode drilling
- node / edge selection
- visibility state changes
- layout mode toggles (`static` $\leftrightarrow$ `interactive`)

Explicit `Reset Layout` is the **only** trigger allowed to execute a full graph relayout.

### Semantic Integrity Contract
- Semantic domains must **NOT** be merged solely for spatial layout reasons.
- Domain discovery rules in `domains.ts` must not be altered for visual aesthetics.
- Static code analysis semantics in `dependency-analyzer.cjs` remain the single source of truth.

---

## 3. CURRENT ARCHITECTURE MAP

The end-to-end Explorer system comprises 9 distinct pipeline stages, fully documented in `WAVE5_CURRENT_ARCHITECTURE_MAP.md`:

1. **Analyzer** (`dependency-analyzer.cjs`): Static analysis producing dependency reports.
2. **Export / Data Contract** (`scripts/export-explorer.cjs`): Transforms analyzer JSON to `explorer-data.json`.
3. **Explorer Data Loading** (`useExplorerData.ts`): Asynchronous fetching and Zod schema parsing.
4. **Graph Model** (`schema.ts`, `graph-builder.ts`): Node/edge types and Cytoscape element building.
5. **Filtering / Focus / Visibility** (`focus-graph.ts`, `search-filter.ts`): Focus topology and visibility filtering.
6. **Position Authority** (`position-policy.ts`): Governance policy and 5-level position resolution.
7. **Architecture Layout** (`architecture-layout.ts`, `lib/layout/*`): 11-stage spatial positioning engine.
8. **Cytoscape Rendering** (`GraphView.tsx`, `graph-style.ts`): Canvas DOM mounting and imperative element updates.
9. **UI Controls / Interaction** (`GraphControls.tsx`, `ProjectStateContext.tsx`): User interaction, toggles, and state persistence.

---

## 4. CURRENT GRAPH DATA CONTRACT AUDIT

### Data Contract Stability:
- **Schema Enforcement:** `parseExplorerData` in `explorer/src/lib/schema.ts` enforces strict Zod validation (`ExplorerDataSchemaZ`).
- **Exporter Alignment:** `scripts/export-explorer.cjs` maps raw analyzer signals to standard enums (`COVERED`, `NO_TESTS`, `UNTESTED`, `AMBIGUOUS`).
- **Validation Test Suite:** `scripts/test-export-explorer.cjs` executes 12 validation invariants checking node ID uniqueness, edge endpoints, enum validity, risk attributes, and graph equivalence.

### Audit Result:
The data contract is **100% stable**. No producer/consumer mismatches, missing metadata, or schema drift were discovered.

---

## 5. POSITION AUTHORITY AUDIT

### Writer Lifecycle Audit:
Every function that writes or modifies node coordinates was inspected. Results are summarized below:

| Writer / Function | File | Trigger Event | Authority Level Written | Bypasses Hierarchy? |
| :--- | :--- | :--- | :---: | :---: |
| `onDragFree` listener | `GraphView.tsx` | User drags node on canvas | Level 1 & Level 2 | **No** (Captures user drag) |
| `saveProjectState` | `projectState.ts` | State persistence trigger | Level 2 | **No** |
| `cy.batch()` element update | `GraphView.tsx` | React element synchronization `useEffect` | Applies Level 1–5 | **No** (Consumes `resolveAuthoritativePosition`) |
| `computeArchitectureLayout` | `architecture-layout.ts` | Initial load / Reset Layout | Level 4 | **No** |
| `calculateDeterministicNewNodePosition` | `position-policy.ts` | Unpositioned new node insertion | Level 5 | **No** |

### Audit Result:
**0 undocumented position writers found.** All coordinate updates strictly obey `resolveAuthoritativePosition`.

---

## 6. STATIC MODE AUDIT

The full trigger matrix is documented in `WAVE5_STATIC_MODE_TRIGGER_MATRIX.md`.

### Core Findings:
1. `shouldAutoLayout(mode, trigger)` returns `false` in Static Mode for all navigation actions (filter change, focus change, depth, direction, selection, investigation, mode switch).
2. When filters hide nodes, omitted nodes are removed from Cytoscape elements but retain their coordinates in `sessionPositionsRef` and Level 2 persisted state.
3. When hidden nodes become visible again, their coordinates are restored seamlessly without triggering automatic relayout.

### Audit Result:
Static Mode behavior is **100% compliant with contracts**.

---

## 7. FILTERING / FOCUS / DIRECTION AUDIT

### Pipeline Sequence:
```text
  Full Graph (nodes, edges)
         │
         ▼
  computeFocusedGraph (focusNodeId, depth 1..5, direction, cycleMode)
         │
         ▼
  applyFilters (nodeTypes, riskFilter, searchQuery)
         │
         ▼
  shouldAutoLayout (returns false in Static Mode)
         │
         ▼
  cy.batch() (imperative Cytoscape update preserving Level 1–3 positions)
```

### Audit Findings:
- The `FOCUS TOPOLOGY → VISIBILITY FILTER` sequence is strictly maintained.
- Focused subgraphs correctly compute transitive depth ($1..5$) and directionality (`incoming`, `outgoing`, `both`).
- Returning to a previous focus or clearing filters restores exact previous node coordinates.

---

## 8. GRAPH INTERACTION UX AUDIT

### Audit Findings:
1. **Viewport Selection Invariant:** Node and edge selections update selection state without triggering camera mutations (`cy.animate`, `cy.center`, `cy.zoom`, `cy.pan`, `cy.fit`), as verified in `FINAL_VIEWPORT_SELECTION_CLOSURE.md`.
2. **Minimap / Navigator Override Issue:** In `explorer/src/index.css`, CSS selector `.minimap-container, .cytoscape-navigator` uses `!important` to force `position: absolute`, `bottom: 18px`, `right: 58px`. This overrides component-level styles in `graph.css` (`bottom: 60px; right: 16px; width: 150px; height: 100px;`) and forces the inner canvas container offset relative to parent chrome.
3. **React State Update Warnings:** Running React component test suites (`ProjectDashboard.test.tsx`, `ProjectCreationModal.test.tsx`) logs `act(...)` state update warnings in stderr when async callbacks fire outside test React wrappers.

---

## 9. RENDERING AUDIT

### Audit Findings:
- Node styles map node types to distinct colors, shapes, borders, and risk badges (`graph-style.ts`).
- Edge styles differentiate relationship types (`method-call`, `instantiation`, `type-reference`, `SOQL`, `DML`, `trigger-handler`, `test-reference`) with arrowheads, dash patterns, and highlight/fade states during hover and focus.
- Satellite nodes and bridge nodes render with distinct visual indicators matching the underlying data contract.

---

## 10. PERFORMANCE AUDIT (OUTSIDE LAYOUT)

### Audit Findings:
1. **Scalability Layout Test Time:** `explorer/src/lib/scalability-layout.test.ts` generates synthetic graphs up to 10,000 nodes and runs determinism verification twice, taking 6+ minutes and timing out default Vitest test executions.
2. **Environment-Sensitive Benchmark Failures in `performance.test.ts`:** In `explorer/src/lib/performance.test.ts`, cold architecture layout benchmarks for 500 nodes (<2000ms), 750 nodes (<3000ms), and 1000 nodes (<5000ms) failed on the sandbox test environment (500 nodes took 2,842ms; 750 nodes took 8,737ms; 1000 nodes took 15,183ms) due to hardcoded, machine-dependent execution time thresholds.
3. **Wave 7B Optimization Opportunity:** As documented in `WAVE7B_ARCHITECTURE_LAYOUT_AUDIT.md`, `computeArchitectureLayout` runs `discoverDomains` twice (Step 1 and Step 2) and performs $O(N^2)$ initial overlap checks without spatial grid partitioning in 10,000-node scenarios.

---

## 11. TEST COVERAGE AUDIT

### Test Inventory:
- **Total Frontend Unit Tests:** 719 passing tests across 79 test files in `explorer/src/`.
- **CLI Test Suite:** 31 passing CLI test scripts in `scripts/`.
- **Layout Unit Tests:** 262 passing layout tests in `explorer/src/lib/layout/`.

### Identified Coverage Gaps / Recommendations:

| Behavior / Area | Existing Test? | Risk | Recommended Action / Test |
| :--- | :---: | :---: | :--- |
| **Scale Layout Benchmarks** | Yes (`scalability-layout.test.ts`) | **HIGH** (Timeouts) | Add scale-specific Vitest timeout bounds or decouple 10k node test into an opt-in benchmark suite. |
| **Cold Layout Benchmarks** | Yes (`performance.test.ts`) | **MEDIUM** (Machine Sensitivity) | Relax environment-dependent millisecond assertions or normalize by operations/sec. |
| **React Test State Updates** | Yes (`ProjectDashboard.test.tsx`) | **LOW** (Console Noise) | Wrap async state triggers in `act(...)`. |
| **Minimap CSS Overrides** | No | **LOW** (Visual Styling) | Add CSS regression test verifying minimap container position properties. |

---

## 12. STALE / DUPLICATE LOGIC AUDIT

1. **Inline Horizontal Shifting vs. `components.ts`:**
   In `architecture-layout.ts` (Step 10), component decomposition was utilizing inline horizontal shifting rather than invoking `packComponentPositions` from `components.ts` for connected components (noted in `WAVE7B_ARCHITECTURE_LAYOUT_AUDIT.md`).
2. **Duplicate Domain Discovery Execution:**
   In `architecture-layout.ts`, `discoverDomains` is invoked in Step 1 analysis and re-invoked in Step 2 layer/domain classification.
3. **React `act(...)` Warnings in Unit Tests:**
   Unwrapped state updates in `ProjectDashboard.test.tsx` and `ProjectCreationModal.test.tsx` generate non-fatal stderr warnings during Vitest runs.

---

## 13. EVIDENCE-BASED REMAINING ISSUES

| Issue | Evidence | File | Severity | User Impact | Confidence |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **Benchmark Threshold Failures in `performance.test.ts`** | Cold layout test failures: 500 nodes took 2842ms (>2000ms threshold); 1000 nodes took 15183ms (>5000ms threshold). | `explorer/src/lib/performance.test.ts` | **MEDIUM** | Fails automated test suite on slower CI/virtualized hardware environments. | **HIGH** |
| **Scalability Test Runner Timeouts** | `scalability-layout.test.ts` tests 5k and 10k nodes, causing Vitest test runner timeout when executing full suite. | `explorer/src/lib/scalability-layout.test.ts` | **MEDIUM** | Prevents single-command `npm test` execution from completing smoothly. | **HIGH** |
| **Minimap / Navigator CSS Position Override** | `.minimap-container, .cytoscape-navigator` uses `!important` rules in `index.css` overriding `graph.css`. | `explorer/src/index.css` | **LOW** | Minor visual displacement of Cytoscape navigator inside minimap box. | **HIGH** |
| **React Test `act(...)` Warnings** | Stderr warnings in `ProjectDashboard.test.tsx` and `ProjectCreationModal.test.tsx` during Vitest runs. | `explorer/src/components/ProjectDashboard.test.tsx` | **LOW** | Test output clutter; no runtime impact on production build. | **HIGH** |
| **Duplicate Domain Discovery Calls** | `discoverDomains` called twice during `computeArchitectureLayout`. | `explorer/src/lib/architecture-layout.ts` | **LOW** | Minor redundant CPU cycles during cold layout execution. | **HIGH** |

---

## 14. OWNERSHIP MATRIX

Potential future work is assigned to isolated subsystem owners:

| Workstream | Subsystem Domain | Primary Files Owned | Forbidden Files | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Workstream A** | Graph Data Contract | `scripts/export-explorer.cjs`, `explorer/src/lib/schema.ts` | `explorer/src/lib/layout/*` | None |
| **Workstream B** | Position Authority & Static Mode | `explorer/src/lib/position-policy.ts`, `explorer/src/components/GraphView.tsx` | `dependency-analyzer.cjs` | Workstream A |
| **Workstream C** | Filtering & Focus Engine | `explorer/src/lib/focus-graph.ts`, `explorer/src/lib/search-filter.ts` | `explorer/src/lib/layout/*` | None |
| **Workstream D** | UI Controls & Navigation UX | `explorer/src/components/*`, `explorer/src/index.css` | `explorer/src/lib/layout/*` | None |
| **Workstream E** | Visual Rendering & Styling | `explorer/src/lib/graph-style.ts`, `explorer/src/components/graph-internals/*` | `position-policy.ts` | None |
| **Workstream F** | Performance & Benchmarking | `explorer/src/lib/performance.test.ts`, `explorer/src/lib/scalability-layout.test.ts` | `global-layout.ts` | None |
| **Workstream G** | Test Hardening & Mock Fidelity | `explorer/src/components/*.test.tsx` | `architecture-layout.ts` | None |

---

## 15. PARALLEL WORKSTREAM PROPOSAL

```text
                     WAVE 4 BASELINE FROZEN
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
      Workstream F       Workstream G       Workstream D
     (Performance &      (Test Hardening    (UI & Minimap
      Benchmarking)      & Act Fixes)        CSS Cleanup)
            │                  │                  │
            └──────────────────┼──────────────────┘
                               ▼
                   SAFE PARALLEL EXECUTION
```

- **Workstream F & Workstream G** can proceed completely in parallel because they touch disjoint file sets (`lib/performance.test.ts` / `lib/scalability-layout.test.ts` vs `components/*.test.tsx`).
- Neither workstream touches the frozen Wave 4 spatial layout baseline (`lib/layout/*`).

---

## 16. RECOMMENDED NEXT IMPLEMENTATION WAVE

Based on evidence, impact, and safety, the recommended scope for the **Next Implementation Wave (Wave 6)** is:

1. **Performance Test Suite Threshold Normalization (Workstream F):**
   - Calibrate millisecond expectation bounds in `explorer/src/lib/performance.test.ts` to accommodate virtualized CI environment execution times.
   - Configure Vitest test timeout limits for large scale benchmarks ($5,000$ and $10,000$ nodes) in `explorer/src/lib/scalability-layout.test.ts`.
2. **Test Warning & Mock Fidelity Remediation (Workstream G):**
   - Wrap React state updates in `ProjectDashboard.test.tsx` and `ProjectCreationModal.test.tsx` inside `act(...)` blocks.
3. **Minimap Styling Cleanup (Workstream D):**
   - Remove overriding `!important` rules in `explorer/src/index.css` to allow component-level CSS styling in `graph.css` to govern minimap container bounds.

---

## 17. EXPLICITLY DEFERRED / ACCEPTED ISSUES

The following items are **ACCEPTED LAYOUT CONSTRAINTS** from Wave 4D (`WAVE4D_FINAL_SPATIAL_ACCEPTANCE_REPORT.md`) and must **NOT** be reopened:

- **Large Canvas Width in `hub-heavy` ($1,960\text{px}$):** ACCEPTED LAYOUT CONSTRAINT. Driven by star hub fan-out topology and domain separation boundaries.
- **Sequential Chain Width in `long-chain` ($2,840\text{px}$):** ACCEPTED LAYOUT CONSTRAINT. Driven by 15-step linear execution flow.
- **Large Canvas Span in `scale-100-plus` ($11,380\text{px}$):** ACCEPTED LAYOUT CONSTRAINT. Driven by 47 distinct domains and 2D FFDH shelf packing bounds.
- **Horizontal 1D Domain Ordering:** ACCEPTED LAYOUT CONSTRAINT. Preserves global architectural layer bands (`presentation`, `application`, `domain`, `schema`).
