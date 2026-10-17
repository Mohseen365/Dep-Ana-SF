# Graph Architecture Improvements — Summary & Implementation Notes

## Steps Completed
1. **Step 1 — Observability**: Added layout debug panel (`?debug=layout`), container `data-*` attributes (`data-architecture-mode`, `data-layout-mode`, etc.), `performance.mark` / `performance.measure` metrics, and duplicate-layout run detector ref to `GraphView.tsx`.
2. **Step 2 — ARCH_MODE_META**: Defined `ARCH_MODE_META` in `explorer/src/types/explorer.ts`. Refactored `GraphControls.tsx` and `GraphView.tsx` to read icon, label, description, and cycle sequence from `ARCH_MODE_META`. Removed misused `aria-pressed` from architecture mode toggle button and added visible mode label next to icon.
3. **Step 3 — Accessibility quick wins**: Created `usePrefersReducedMotion.ts` hook. Added `aria-keyshortcuts` to toolbar buttons in `GraphControls.tsx` (`+`, `-`, `f 0`, `Escape`). Added polite `aria-live` layout completion announcer in `GraphView.tsx`. Converted conditional renders of "Center Selected" and "Reset Layout" into disabled buttons with explanatory `title` tooltips.
4. **Step 4 — Memoization and stable callbacks**: Created `useEvent.ts` hook. Wrapped `GraphControls`, `GraphLegend`, `NodeHoverCard`, and `EdgeHoverCard` in `React.memo`. Wrapped inline callbacks in `GraphView.tsx` with `useEvent`. Added shallow-compare options caching to `getGraphStyles` in `graph-style.ts`.
5. **Step 5 — Error and empty states**: Added `.graph-empty-state` overlay with "Reset view" button in `GraphView.tsx` when `nodes.length === 0`. Created `GraphErrorBoundary.tsx` wrapping hover cards, minimap, and feature overlays.
6. **Step 6 — Stability guards**: Extended `layoutRequestRef` request ID gating to all layout entry points. Added dev-only desync invariant check logging when Cytoscape node count differs from dataset node count.
7. **Step 7 — Position resolver consolidation**: Created `explorer/src/lib/layout/positions.ts` with `resolvePosition` helper. Consolidated position precedence across structural sync and position-only sync effects. (Note: `hasAuth` inversion in `GraphView.tsx` across layout effects remains an active open finding tracked under T0-1 in Lane B).
8. **Step 8 — Static mode contract**: Enforced `autoLayoutPolicy` in structural sync effect for all architecture modes so static mode strictly locks node positions.
9. **Step 9 — Simulation classes out of structural effect**: Extracted simulation class toggling (`simulated-added`, `simulated-removed`, `simulated-affected`) into a dedicated effect and removed simulation ID arrays from the structural sync effect's dependency array.
10. **Step 10 — URL hash and localStorage mode persistence**: Implemented reading `architectureMode` and `layoutMode` from `location.hash` -> `projectState` -> `localStorage` on mount, and syncing updates to `location.hash` and `localStorage`.
11. **Step 11 — WorkspaceHeader fixes**: Downgraded lens bar from `role="tablist"` to `role="navigation"` with `aria-current="page"`. Updated keyboard navigation to manual activation (focus only, no implicit click) without hijacking `ArrowUp`/`ArrowDown`. Added `scrollIntoView`. Folded `findingsCount` into findings tab `aria-label`. Added per-domain lens memory in `localStorage`.
12. **Step 12 — Unit Tests**: Created pure function unit tests in `src/types/__tests__/arch-mode-meta.test.ts` (asserting `ARCH_MODE_META` forms a single closed cycle) and `src/lib/layout/__tests__/position-policy.test.ts` (table tests for `shouldAutoLayout` and `resolvePosition`).
13. **Step 13 — Comprehensive Suite Verification**: Verified typecheck on touched files, ran Vitest component/unit tests, and confirmed 100% pass rate across root CLI integration test suites (`npm run test:cli`).
14. **Deep Bug Hunt & Flicker Remediation**:
    - **B1 (CONFIRMED_AND_FIXED)**: Fixed dragfree position persistence in `GraphView.tsx` using `architectureModeRef` so user drag positions are saved to the active mode's session position map.
    - **B2 (CONFIRMED_AND_FIXED)**: Fixed Escape key handling in `GraphView.tsx` and `App.tsx` to exit focus/drill mode (`focusState.enabled = false`) and clear both node and edge selections.
    - **B3 (CONFIRMED_AND_FIXED)**: Fixed `handleCommitSimulation` in `App.tsx` to prevent throwing errors out of event handlers.
    - **B4 (CONFIRMED_AND_FIXED)**: Consolidate selection effect handling in `GraphView.tsx` so selecting an edge or clearing node selection executes `clearHighlights`, removing orphaned `.dimmed` classes.
    - **F1 (CONFIRMED_AND_FIXED)**: Raised far-zoom edge opacity in `graph-style.ts` from 0.18 to 0.35 (0.7 for inter-feature edges).
    - **F2 (CONFIRMED_AND_FIXED)**: Fingerprinted `discoverFeatures` inputs using `graphStructureKey` in `GraphView.tsx` to prevent recomputations on identity shifts.
    - **F3 (CONFIRMED_AND_FIXED)**: Guarded position-only sync against running while layout animation is active (`isLayoutRunningRef.current`).
    - **F4 (CONFIRMED_AND_FIXED)**: Removed duplicate highlight calls from structural sync in `GraphView.tsx`.
    - **H1/H4 (CONFIRMED_AND_FIXED)**: Expanded `clearHighlights` in `graph-interactions.ts` to remove all highlight/dim/finding/focus/cycle classes and added finding highlight CSS rules in `graph-style.ts`.
    - **B7/B9 (CONFIRMED_AND_FIXED)**: Decoupled `architectureMode` from structural sync dependencies in `GraphView.tsx` and added depth tracking for overlapping layout events.
    - **U1/U2/U3/P1 (CONFIRMED_AND_FIXED)**: Fixed hover card positioning bounding rect calculations, cleared hover timers on node grab/drag, and stabilized global Escape listener dependencies.

## Steps Skipped
- None. All specified remediation steps were fully completed.

## Test Failures Observed & Resolution
- All targeted Vitest test suites and root CLI integration test suites (`npm run test:cli`, 32/32 suites, 184 assertions) passed 100%.

## Closure Polish (PR 1) — Completed Items & Observations
1. **N4 — Dead `lod-*` CSS class removal**: Removed unused `lod-*` class strings from `.removeClass()` and `.addClass()` in `GraphView.tsx` `updateZoomClass()` while preserving standard zoom level classes (`zoom-far`, `zoom-mid`, `zoom-near`) and `computeCanvasLODLevel`.
2. **N8 — `discoveryResult` recomputation optimization**: Introduced stable `graphStructureKey` string in `GraphView.tsx` memoizing node/edge ID lists and counts to avoid recomputing `discoverFeatures` on reference array churn.
3. **N9 — Redundant hover state updates**: Added `hoveredNodeIdRef` in `GraphView.tsx` to guard `mouseover` and `mouseout` event handlers, returning early if hovering over the currently hovered node.
4. **N10 — Scoped cursor mutations**: Updated `GraphView.tsx` and `graph-interactions.ts` to mutate local Cytoscape container cursor (`cy.container().style.cursor`) rather than setting global `document.body.style.cursor`.
5. **T0-8 — Stabilized `useImperativeHandle`**: Introduced `selectedNodeIdRef` in `GraphView.tsx` so imperative methods (`centerSelected`) read the latest selection without recreating imperative handle method references on selection changes.
6. **T1-6 — Keyboard first-node selection**: Added `else if (accessibleNodes.length > 0)` branch in `GraphView.tsx` `handleKeyDown` when arrow keys are pressed without a selected node, selecting the first accessible node while handling empty node lists safely.
7. **High-Priority Observation 1 — Mode-Scoped `user-authored` Provenance**: Updated all four `hasAuth` sites in `GraphView.tsx` to strictly require `storedArchMode === architectureMode` for `user-authored` position authority, ensuring user drags in one mode do not incorrectly suppress the initial layout when switching architecture modes.
8. **High-Priority Observation 2 — Structural-Sync Live-Region Announcements**: Added `setLayoutAnnouncement` calls upon structural-sync layout completion in `GraphView.tsx` guarded with `requestId` checks to announce updates to screen readers.

## Out-of-Scope Follow-ups for Next Pass
- Splitting `GraphView` into dedicated custom hooks (`useGraphLayout`, `useCytoscape`, etc.)
- Differential element reconciliation (element-level diffing)
- Introducing a `LayoutStateProvider`
- Splitting `AppContent` into providers
- WebWorker for feature discovery
- Virtualized node list
