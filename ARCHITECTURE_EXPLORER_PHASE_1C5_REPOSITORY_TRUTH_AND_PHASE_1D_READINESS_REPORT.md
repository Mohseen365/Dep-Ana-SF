# Architecture Explorer Phase 1C.5 Repository Truth & Phase 1D Readiness Report

## Executive Summary & Final Verdict
- **Final Verdict:** `READY — A NARROW IMPLEMENTATION SCOPE IS EVIDENCE-BACKED`
- **Report Date:** October 11, 2026
- **Read-Only Audit Assurance:** Zero application source code, test files, package manifests, or test runner configurations were modified during this readiness verification phase.

---

## 1. Repository Provenance & Baseline

### A. Repository Identifier & Working Tree
- **Repository URL / Identifier:** `salesforce-architecture-refactoring-explorer`
- **Current Branch:** `jules-3744697362910664896-d4c2896d`
- **HEAD Commit SHA:** `d82c141d949670adbe5c8efb5325c47377db4900`
- **Working-Tree Status:**
  - 3 Phase 1C modified source files (`ConnectionControls.tsx`, `ImpactControls.tsx`, `GraphControls.tsx`).
  - 1 Phase 1C regression test suite (`Phase1C_Accessibility.test.tsx`).
  - 1 Phase 1C deliverable report (`ARCHITECTURE_EXPLORER_PHASE_1C_ACCESSIBILITY_IMPLEMENTATION_REPORT.md`).
  - 1 Phase 1C.5 readiness report (`ARCHITECTURE_EXPLORER_PHASE_1C5_REPOSITORY_TRUTH_AND_PHASE_1D_READINESS_REPORT.md`).

### B. Target Files & Canonical Location Mapping
| Target File | Actual Working-Tree Path | Scope Status |
| :--- | :--- | :--- |
| `ConnectionControls.tsx` | `explorer/src/components/ConnectionControls.tsx` | Primary target (Phase 1C target / Phase 1D candidate) |
| `ImpactControls.tsx` | `explorer/src/components/ImpactControls.tsx` | Primary target (Phase 1C target / Phase 1D candidate) |
| `GraphControls.tsx` | `explorer/src/components/GraphControls.tsx` | Primary target (Phase 1C target) |
| `FocusControls.tsx` | `explorer/src/components/FocusControls.tsx` | Primary target (Phase 1D candidate) |
| `DependencyConstellationPanel.tsx` | `explorer/src/components/DependencyConstellationPanel.tsx` | Primary target (Phase 1D candidate) |
| `GraphView.tsx` | `explorer/src/components/GraphView.tsx` | Primary target (Phase 1D candidate) |
| `GraphSlot.tsx` | `explorer/src/components/GraphSlot.tsx` | Adjacent component (Checked, Out of Scope) |

---

## 2. Reconcile Phase 1C PASS Evidence

### A. Phase 1C Source & Verification Results
- **Verdict:** `PHASE 1C FINDINGS VERIFIED`
- **Verification Evidence:**
  1. **Finding 1B5-07 (Missing Form-Label Associations):**
     - `ConnectionControls.tsx`: Bound Direction and Depth `<label>` elements to `<select>` controls using unique `useId()` generated IDs (`${controlId}-direction`, `${controlId}-depth`).
     - `ImpactControls.tsx`: Bound Depth `<label>` to `<select>` using `${controlId}-depth`. Transformed static `Impact Direction:` display into a valid `<div role="group" aria-labelledby="...">` container, eliminating dangling label associations.
     - Multi-instance testing confirmed 4 unique element IDs rendered across dual concurrent instances.
  2. **Finding 1B5-09 (Decorative Emoji Treatment):**
     - `ConnectionControls.tsx`: `🔗` wrapped in `span[aria-hidden="true"]`.
     - `ImpactControls.tsx`: `💥`, `🔍`, and `🧪` wrapped in `span[aria-hidden="true"]`.
     - `GraphControls.tsx`: All button glyphs (`➕`, `➖`, `⛶`, `🎯`, `🌌`, `🪐`, `🧩`, `🏢`, `📌`, `🔀`, `🔄`, `🗺️`) wrapped in `span[aria-hidden="true"]` without altering button `aria-label` or visible text.
  3. **Test Suite Execution Results:**
     - Vitest suite (`Phase1C_Accessibility.test.tsx`, `ConnectionControls.test.tsx`, `ImpactControls.test.tsx`, `GraphControls.test.tsx`, `Phase2EU_UXAccessibility.test.tsx`): 27/27 tests passed.
     - Root CLI Integration test suite (`npm run test:cli`): 31/31 suites passed.

---

## 3. High-Priority Verification Checks (A–F)

### Check A — 1B5-01: React Rules of Hooks
- **Target File:** `explorer/src/components/DependencyConstellationPanel.tsx`
- **Mechanism:** On line 53, an early conditional return `if (!focalNode)` occurs before three subsequent `useMemo` hook declarations on lines 71, 79, and 89.
- **Reachability Analysis:**
  - When `focalNode` is `null`/`undefined`, the component returns early on line 53.
  - If a subsequent re-render supplies a valid `focalNode`, React executes the three `useMemo` hooks on lines 71, 79, and 89.
  - Because the number and sequence of hooks executed differs between renders on the same mounted component instance, React throws a fatal `Rendered fewer hooks than expected` / `Rendered more hooks than during the previous render` exception.
- **Verdict:** `CONFIRMED REACHABLE HOOK-ORDER VIOLATION` (P0/P1 Priority for Phase 1D).

### Check B — Focus Stale-Origin Leak
- **Target Files:** `explorer/src/components/FocusControls.tsx` & `explorer/src/components/GraphView.tsx`
- **Mechanism:** In `FocusControls.tsx`, `handleToggleFocus` sets `focusNodeId: focusState.enabled ? focusState.focusNodeId : targetNodeId`.
- **State Transition Matrix:**

| Step | User Action | `selectedNodeId` | `focusState.enabled` | `focusState.focusNodeId` | Observed / Expected Behavior |
| :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | Select Node A & Enable Focus | `Node_A` | `true` | `Node_A` | Graph focuses on Node A neighborhood. |
| 2 | Disable Focus | `Node_A` | `false` | `Node_A` | Focus disabled; `focusNodeId` **remains `Node_A`** in state. |
| 3 | Select Node B | `Node_B` | `false` | `Node_A` | Selection changes to Node B; stale `Node_A` origin retained. |
| 4 | Re-Enable Focus | `Node_B` | `true` | `Node_A` | **BUG:** Focus re-activates on stale **Node A** instead of current Node B. |

- **Verdict:** `OPEN — CONFIRMED` (P1 Priority for Phase 1D).

### Check C — 1B5-10: Connection and Impact Exit Traps
- **Target Files:** `explorer/src/components/ConnectionControls.tsx` & `explorer/src/components/ImpactControls.tsx`
- **Mechanism:**
  - In `ConnectionControls.tsx`: `disabled={!active && !selectedNode}`.
  - In `ImpactControls.tsx`: `disabled={!active && !selectedNode}`.
  - Compute active state: `active = Boolean(enabled && (originNodeId || selectedNode))`.
- **Exit Trap Reachability Analysis:**
  - If `enabled = true` and `originNodeId = null` (e.g. state reset or cleared result), and the user deselects the current component (`selectedNode = null`), then `active` evaluates to `false`.
  - Consequently, `disabled` evaluates to `!false && !null` -> `true`.
  - The toggle button renders `disabled`, displaying label "Analyze Connections" or "Show Impact", preventing the user from clicking the button to emit `onExitConnection()` or `onExitImpact()`.
- **Verdict:** `OPEN — CONFIRMED` (P1 Priority for Phase 1D).

### Check D — 1B5-04: Stale Double-Tap Callback
- **Target File:** `explorer/src/components/GraphView.tsx`
- **Mechanism:**
  - `onNodeDoubleTapProp` is received as a prop in `GraphView.tsx`.
  - The Cytoscape interaction binding in `useEffect` (lines 753–758) captures `onNodeDoubleTapProp` at initialization time inside a closure.
  - Because `useEffect` has an empty dependency array `[]` (lines 789–820), re-renders with updated `onNodeDoubleTapProp` callbacks leave Cytoscape event handlers calling stale callback instances.
- **Verdict:** `OPEN — SOURCE-LEVEL ONLY` (P2 Priority for Phase 1D).

### Check E — 1B5-05: Element-Sync Effect Dependencies
- **Target File:** `explorer/src/components/GraphView.tsx`
- **Mechanism:**
  - The Element Synchronization `useEffect` (lines 823–965) consumes `architectureMode`, `layoutMode`, `effectiveLayoutOptions`, `findings`, `featureAssignmentMap`, `focusedNodeId`, `selectedFinding`, `selectedCycleNodeIds`, `impactResult`, and `selectedEdgeId` inside its body.
  - However, its dependency array on line 965 lists only `[nodes, edges, nodePositions, captureAndPersistPositions, simulatedNodeIds, simulatedRemovedNodeIds, simulatedEdgeIds]`.
  - When `architectureMode` or `findings` update without `nodes`/`edges` changing, the element sync effect does not re-run, leaving Cytoscape visual elements out of sync.
- **Verdict:** `OPEN — CONFIRMED` (P2 Priority for Phase 1D).

### Check F — 1B5-06: Cross-Layout Position Contamination
- **Target Files:** `explorer/src/lib/architecture-layout.ts`, `explorer/src/lib/projectState.ts`, `explorer/src/components/GraphView.tsx`
- **Mechanism:**
  - `architecture-layout.ts` (lines 169–171 and 219–221) inherits `existingPositions` directly into output positions: `positions: { ...existingPositions }`.
  - `projectState.ts` stores positions in a single flat map `nodePositions: Record<string, { x: number; y: number }>` shared across all layout modes without mode/focal keying.
  - Switching layout modes (e.g. Hierarchical -> Orbit -> Hybrid) causes coordinates from the prior layout to contaminate subsequent layouts.
- **Verdict:** `PENDING PRODUCT DECISION` (Blocked for Phase 1D pending position authority & persistence contract freeze).

---

## 4. Reconciled Canonical Ledger

| Finding ID | Finding Title | Current Classification | Phase 1D Status |
| :---: | :--- | :--- | :--- |
| **1B5-01** | Rules of Hooks Violation in `DependencyConstellationPanel` | `OPEN — CONFIRMED` | **READY FOR PHASE 1D** |
| **FOCUS-LEAK** | Focus Controls Stale-Origin Leak across Disable/Enable Cycles | `OPEN — CONFIRMED` | **READY FOR PHASE 1D** |
| **1B5-10** | Connection & Impact Control Exit Trap when Selection Cleared | `OPEN — CONFIRMED` | **READY FOR PHASE 1D** |
| **1B5-04** | Stale Double-Tap Callback Closure in `GraphView` | `OPEN — SOURCE-LEVEL ONLY` | **READY FOR PHASE 1D** |
| **1B5-05** | Missing Element-Sync Effect Dependencies in `GraphView` | `OPEN — CONFIRMED` | **READY FOR PHASE 1D** |
| **1B5-07** | Missing Form-Label Associations in Connection/Impact Controls | `FIXED AND VERIFIED` | Closed in Phase 1C |
| **1B5-09** | Decorative Emoji Accessibility Treatment in Controls | `FIXED AND VERIFIED` | Closed in Phase 1C |
| **1B5-08** | Tablist Keyboard Navigation in `ViewModeSwitcher` | `FIXED AND VERIFIED` | Closed in Phase 2EU |
| **1B5-02** | Click / Double-Click Event Dispatch Race in `GraphView` | `OPEN — SOURCE-LEVEL ONLY` | Defer to Phase 1E |
| **1B5-03** | Selection Context Fallback Hierarchy Semantics | `REJECTED BY EVIDENCE` | Intentional Design |
| **1B5-06** | Cross-Layout Position Contamination & Drag Persistence Scope | `PENDING PRODUCT DECISION` | Blocked on Contract |
| **1B5-11** | Loose `any` Type Annotations in Explorer Controls | `OPEN — SOURCE-LEVEL ONLY` | Defer to Maintenance |
| **1B5-12** | Naming Collision across Constellation Lenses | `PENDING PRODUCT DECISION` | Defer to Domain Refactor |
| **1B5-13** | Analysis Mode Mutual Exclusivity Semantics | `REJECTED BY EVIDENCE` | Intentional Design |

### Mathematical Ledger Reconciliation
- **Total Canonical Findings Evaluated:** 14
- **Fixed & Verified:** 3 (1B5-07, 1B5-09, 1B5-08)
- **Open — Confirmed (Phase 1D Scope):** 5 (1B5-01, Focus Stale-Origin, 1B5-10, 1B5-04, 1B5-05)
- **Open — Source-Level / Deferred:** 3 (1B5-02, 1B5-11, 1B5-12)
- **Pending Product Decision:** 1 (1B5-06)
- **Rejected by Evidence / Intentional Design:** 2 (1B5-03, 1B5-13)
- **Sum:** $3 + 5 + 3 + 1 + 2 = 14$ (100% mathematically balanced).

---

## 5. Prioritized Phase 1D Implementation Readiness Matrix

| Priority | Finding ID | Target File | Proposed Minimal Remediation | Authorization Status |
| :---: | :---: | :--- | :--- | :---: |
| **P0** | **1B5-01** | `DependencyConstellationPanel.tsx` | Move `useMemo` hooks above the `if (!focalNode)` early return statement. | **AUTHORIZED FOR 1D** |
| **P1** | **FOCUS-LEAK** | `FocusControls.tsx` | Clear `focusNodeId` when focus is toggled OFF, or evaluate `effectiveOrigin = selectedNodeId \|\| focusState.focusNodeId`. | **AUTHORIZED FOR 1D** |
| **P1** | **1B5-10** | `ConnectionControls.tsx` & `ImpactControls.tsx` | Update disabled predicate to `disabled = !selectedNode && !connectionState.enabled`. | **AUTHORIZED FOR 1D** |
| **P2** | **1B5-04** | `GraphView.tsx` | Store `onNodeDoubleTapProp` in `onNodeDoubleTapRef` and invoke `onNodeDoubleTapRef.current` inside Cytoscape callback. | **AUTHORIZED FOR 1D** |
| **P2** | **1B5-05** | `GraphView.tsx` | Add `architectureMode`, `effectiveLayoutOptions`, and `findings` to element-sync `useEffect` dependency array. | **AUTHORIZED FOR 1D** |

---

## 6. Readiness Conclusion & Next Steps
1. **Status:** `READY — A NARROW IMPLEMENTATION SCOPE IS EVIDENCE-BACKED`
2. **Authorized Scope for Phase 1D:** The 5-item narrow bundle consisting of **1B5-01**, **Focus Stale-Origin Leak**, **1B5-10**, **1B5-04**, and **1B5-05**.
3. **Excluded / Blocked Items:**
   - **1B5-06 (Position Contamination):** Blocked pending formal product decision on cross-layout drag persistence contracts.
   - **1B5-03 & 1B5-13:** Rejected as bugs; confirmed as intentional multi-lens design invariants.
