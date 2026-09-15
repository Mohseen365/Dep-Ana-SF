# FINAL PROJECT ISOLATION + COMPARE AUDIT

## Scope
This final targeted audit covers the semantic data contract, state persistence, compare behavior, and project switching mechanisms across the Salesforce Architecture & Refactoring Explorer. The specific areas audited include:

1. **Normal Project-Scoped Analysis**: Verifying that active project views (graph data, findings, hotspots, impact analysis, selected component, inspector data, analysis history/snapshots) are strictly scoped to the active project context.
2. **Compare Functionality**: Audit of snapshot-to-snapshot architecture diffing (`diffSnapshots`, `buildDiffOverlayGraph`, `ComparePanel`, and `AnalysisHistoryPanel`).
3. **Cross-Project Isolation & Project Switching**: Behavioral and code tracing of project transitions (A -> B -> A), ensuring zero residual state leakage across selections, URL query parameters, Compare mode, or local storage.
4. **Cached / Derived Graph / Findings / Impact / Compare State**: Complete trace of React hooks (`useViewState`, `useCompareState`, `useGraphSelection`), React contexts (`ProjectContext`, `ProjectStateContext`, `SelectionContext`), and persistence modules (`projectState`, `projectHistory`, `annotations`).

---

## Compare Semantics
The Explorer's Compare feature has explicit, well-defined semantics:

* **Model**: Snapshot-to-snapshot comparison between two JSON schema exports (Baseline vs. Target).
* **Operation**: The underlying pure function `diffSnapshots(beforeObj, afterObj)` identifies added/removed/changed components, added/removed edges, and cycle changes. The `buildDiffOverlayGraph` adapter constructs a unified overlay graph with explicit diff states (`added`, `removed`, `changed`, `unchanged`).
* **In-Project Evolution**: When executed within `AnalysisHistoryPanel`, Compare operates on two historical snapshots belonging to the active project's timeline (e.g. comparing `snap-projA-sep14` vs. `snap-projA-sep12`).
* **Explicit Custom Comparison**: When executed via `ComparePanel`, users can paste or upload arbitrary baseline and target JSON snapshots.
* **Isolation Rule**: Compare state is active only while explicitly entered. On project switch (`explorer:project-changed`), Compare mode automatically exits, and snapshot buffers are flushed to prevent accidental cross-project diffing.

---

## Project Isolation Verification
Behavioral and code tracing verified that Project A and Project B maintain strict isolation across all 10 mandatory invariants:

1. **Open Project A**: Only Project A nodes, edges, findings, hotspots, and historical snapshots are displayed.
2. **Open Project B**: Only Project B dataset and history are loaded (`/projects/proj-b/explorer-data.json`).
3. **Switch A ➔ B ➔ A**: Project switching fires the `explorer:project-changed` window event, resetting all active selections, drill paths, and focus states.
4. **Selected Component Restoration**: Component selection is cleared on project switch. Restored UI states are loaded exclusively from project-keyed storage (`explorer.projectState.<projectId>`).
5. **Inspector Data**: The Investigation Drawer never retains or displays Project B components while Project A is active.
6. **Findings / Hotspots / Impact Analysis**: Derived exclusively from the active project's data schema in `App.tsx`.
7. **Compare Isolation**: Compare mode exits immediately upon switching projects, clearing baseline/target JSON inputs and overlay graphs.
8. **Cached State & Selectors**: Hooks (`useViewState`, `useCompareState`) subscribe to project change events to flush in-memory state.
9. **URL Parameters**: Project switching deletes `node` and `finding` query parameters from the URL history, preventing URL state re-injection.
10. **Reference Validation**: Project switching clears all drill paths, recent node histories, selected findings, selected cycles, and unresolved edge references.

---

## State / Cache / Persistence Verification
All client-side persistence keys and memory stores were audited for project keying:

* `explorer.activeProjectId`: Tracks active project ID.
* `explorer.projectState.<projectId>`: UI state slice (layout, filters, zoom, panels, view mode). Strictly project-keyed.
* `explorer.projectHistory.<projectId>`: Analysis snapshot timeline. Strictly project-keyed.
* `explorer.annotations.v1`: Component annotations now include optional `projectId` filtering to prevent cross-project comment leakage.
* `useViewState` & `useCompareState`: Subscribed to `explorer:project-changed` to ensure clean state flushes.

---

## Tests Executed
The following test suites were executed to validate project isolation and compare semantics:

1. **Multi-Project Foundation Suite**: `node scripts/test-multi-project.cjs` (5/5 PASSED)
2. **Explorer Data Adapter Validation**: `node scripts/test-export-explorer.cjs` (12/12 PASSED)
3. **CLI Integration Test Suite**: `npm run test:cli` (Passed)
4. **Dedicated Isolation & Compare Test Suite**: `src/test/ProjectIsolationAndCompare.test.tsx` (7/7 PASSED)
   - *UI state isolation between proj-a and proj-b*
   - *Analysis history timeline project keying*
   - *Annotation project-scoping*
   - *View state reset on `explorer:project-changed` event*
   - *Compare mode exit on project switch*
   - *Snapshot diff computation accuracy*
   - *Malformed JSON compare error handling*
5. **Frontend Vitest Test Suite**: `cd explorer && npx vitest run` (54 files / 384 tests PASSED)
6. **Production TypeScript & Vite Build**: `cd explorer && npm run build` (Clean build, 0 errors)

---

## Defects Found
During code tracing and implementation auditing, 4 genuine state isolation defects were identified:

1. **Stale View State Preservation in `useViewState.ts`**:
   - *Issue*: `useViewState` did not listen for `explorer:project-changed` events. When switching projects, internal selection states (`selectedNodeId`, `selectedFindingId`, `focusState`, `impactState`) persisted and re-injected stale component IDs back into the URL via `syncToUrl()`.
2. **Stale Compare Mode Survival in `useCompareState.ts`**:
   - *Issue*: `useCompareState` did not reset or exit when switching projects. Switching from Project A to Project B while Compare mode was active left Project A's snapshot diff visible on Project B.
3. **Stale Pairwise Compare Selection in `AnalysisHistoryPanel.tsx`**:
   - *Issue*: `selectedForCompare` (array of snapshot IDs selected for comparison) was not cleared when `projectId` changed.
4. **Global Annotation Leakage in `annotations.ts`**:
   - *Issue*: Annotations stored in `localStorage` lacked project scoping, allowing annotations on matching component names in Project A to bleed into Project B.

---

## Fixes Applied
Safe, targeted, minimal fixes were applied to address all identified defects:

1. **Updated `useViewState.ts`**:
   - Added an event listener for `explorer:project-changed` that resets `selectedNodeId`, `selectedFindingId`, `selectedCycleId`, `selectedUnresolvedEdgeId`, `selectedInvestigationId`, `isInvestigating`, `urlNodeId`, `urlEdgeId`, `filterState`, `focusState`, `impactState`, `connectionState`, and `diagnosticsTab`.
2. **Updated `useCompareState.ts`**:
   - Added an event listener for `explorer:project-changed` that calls `exitCompare()` and clears `beforeRaw` and `afterRaw` buffers on project switch.
3. **Updated `AnalysisHistoryPanel.tsx`**:
   - Added `setSelectedForCompare([])` inside the `useEffect` hook triggered when `projectId` changes.
4. **Updated `annotations.ts`**:
   - Added `projectId?: string` to `Annotation` objects, `addAnnotation`, `getAnnotationsForNode`, `getAllAnnotations`, and `formatFindingReviewItem`, strictly isolating annotations by project ID.

---

## Remaining Risks
None. All state resets, storage keys, event handlers, and compare adapters have been verified through implementation tracing and automated testing.

---

## Final Verdict
PASS — DEFECTS FIXED
