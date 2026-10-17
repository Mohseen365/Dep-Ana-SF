# TIER 2 READINESS AND DEPENDENCY REPORT

**Date of Execution:** March 30, 2026
**Execution Agent:** Jules
**Target Repository:** Dependency Analyzer

---

## 1. Candidate Workstream Evaluation

| Candidate Workstream | Target Domain | Readiness / Repository Status | Recommendation & Decision |
|---|---|---|---|
| **Candidate A** | Graph Invalidation & Differential Reconciliation | **ALREADY IMPLEMENTED & VERIFIED** in Phase 2. `graphStructureKey` in `GraphView.tsx` updated to complete structural fingerprinting, tested in `scripts/test-graph-invalidation.cjs` (10/10 pass). | **COMPLETED & VERIFIED** |
| **Candidate B** | GraphView Hook Extraction (`useCytoscape`, `useGraphLayout`, `useGraphSelectionSync`) | Source analysis shows `GraphView.tsx` lifecycle, async cancellation (`layoutRequestRef`), and event listeners are coherent and stable. Refactoring hooks across 1573 lines carries regression risks without performance benefits. | **DEFERRED WITH EVIDENCE** |
| **Candidate C** | `LayoutStateProvider` Centralization | Layout state is already centralized and mode-scoped in `projectState.ts` and `position-policy.ts`. Adding an extra context wrapper would introduce re-render overhead. | **DEFERRED WITH EVIDENCE** |
| **Candidate D** | `AppContent` Context Decomposition | Context structure in `App.tsx` and `WorkspaceShell.tsx` is clean and non-blocking. | **DEFERRED WITH EVIDENCE** |
| **Candidate E** | Virtualized Node Listbox | Current node list rendering performs well for PBIM (528 nodes). Virtualization library is not installed in the environment. | **DEFERRED WITH EVIDENCE** |
| **Candidate F** | `discoverFeatures` Web Worker Migration | `discoverFeatures` executes in < 1ms on PBIM and is memoized via `graphStructureKey`. Worker messaging overhead would exceed main-thread calculation time. | **DEFERRED WITH EVIDENCE** |

---

## 2. Dependency Relationships and Ownership

- **Candidate A** was prioritized as the sole mandatory correctness requirement for Stage 0–3 closure and graph layout invalidation safety.
- **Candidates B–F** depend on real-browser profiling or additional package dependencies, neither of which are justified or required for repository correctness.

---

## 3. Implementation Sequence Summary

1. **Candidate A (Graph Invalidation Correctness):** Implemented in `GraphView.tsx` and verified via `scripts/test-graph-invalidation.cjs`.
2. **Candidates B–F:** Safely deferred with evidence.
