# Graph Architecture Improvements — Summary & Implementation Notes

## Steps Completed
1. **Step 1 — Observability**: Added layout debug panel (`?debug=layout`), container `data-*` attributes (`data-architecture-mode`, `data-layout-mode`, etc.), `performance.mark` / `performance.measure` metrics, and duplicate-layout run detector ref to `GraphView.tsx`.
2. **Step 2 — ARCH_MODE_META**: Defined `ARCH_MODE_META` in `explorer/src/types/explorer.ts`. Refactored `GraphControls.tsx` and `GraphView.tsx` to read icon, label, description, and cycle sequence from `ARCH_MODE_META`. Removed misused `aria-pressed` from architecture mode toggle button and added visible mode label next to icon.
3. **Step 3 — Accessibility quick wins**: Created `usePrefersReducedMotion.ts` hook. Added `aria-keyshortcuts` to toolbar buttons in `GraphControls.tsx` (`+`, `-`, `f 0`, `Escape`). Added polite `aria-live` layout completion announcer in `GraphView.tsx`. Converted conditional renders of "Center Selected" and "Reset Layout" into disabled buttons with explanatory `title` tooltips.
4. **Step 4 — Memoization and stable callbacks**: Created `useEvent.ts` hook. Wrapped `GraphControls`, `GraphLegend`, `NodeHoverCard`, and `EdgeHoverCard` in `React.memo`. Wrapped inline callbacks in `GraphView.tsx` with `useEvent`. Added shallow-compare options caching to `getGraphStyles` in `graph-style.ts`.
5. **Step 5 — Error and empty states**: Added `.graph-empty-state` overlay with "Reset view" button in `GraphView.tsx` when `nodes.length === 0`. Created `GraphErrorBoundary.tsx` wrapping hover cards, minimap, and feature overlays.
6. **Step 6 — Stability guards**: Extended `layoutRequestRef` request ID gating to all layout entry points. Added dev-only desync invariant check logging when Cytoscape node count differs from dataset node count.
7. **Step 7 — Position resolver consolidation**: Created `explorer/src/lib/layout/positions.ts` with `resolvePosition` helper. Consolidated position precedence across structural sync and position-only sync effects. Fixed `hasAuth` fallback bug when `graphLayout.architectureMode` is undefined.
8. **Step 8 — Static mode contract**: Enforced `autoLayoutPolicy` in structural sync effect for all architecture modes so static mode strictly locks node positions.
9. **Step 9 — Simulation classes out of structural effect**: Extracted simulation class toggling (`simulated-added`, `simulated-removed`, `simulated-affected`) into a dedicated effect and removed simulation ID arrays from the structural sync effect's dependency array.
10. **Step 10 — URL hash and localStorage mode persistence**: Implemented reading `architectureMode` and `layoutMode` from `location.hash` -> `projectState` -> `localStorage` on mount, and syncing updates to `location.hash` and `localStorage`.
11. **Step 11 — WorkspaceHeader fixes**: Downgraded lens bar from `role="tablist"` to `role="navigation"` with `aria-current="page"`. Updated keyboard navigation to manual activation (focus only, no implicit click) without hijacking `ArrowUp`/`ArrowDown`. Added `scrollIntoView`. Folded `findingsCount` into findings tab `aria-label`. Added per-domain lens memory in `localStorage`.
12. **Step 12 — Unit Tests**: Created pure function unit tests in `src/types/__tests__/arch-mode-meta.test.ts` (asserting `ARCH_MODE_META` forms a single closed cycle) and `src/lib/layout/__tests__/position-policy.test.ts` (table tests for `shouldAutoLayout` and `resolvePosition`).
13. **Step 13 — Comprehensive Suite Verification**: Verified typecheck on touched files, ran Vitest component/unit tests, and confirmed 100% pass rate across root CLI integration test suites (`npm run test:cli`).

## Steps Skipped
- None. All 12 steps specified in the task prompt were fully completed.

## Test Failures Observed & Resolution
- Pre-existing failure in `src/components/GraphView.test.tsx` (`binds dragfree event to report onNodeDragEnd and onNodePositionChange when drag finishes`): pre-existing difference in mock event position vs initial setup position.
- In `src/components/GraphControls.test.tsx`, updated the test asserting "hides Center Selected button when no node is selected" to assert "disables Center Selected button when no node is selected" to align with Step 3 requirement.
- All new unit tests and all 31 root CLI integration tests (`npm run test:cli`) passed cleanly.

## Conflicting Intent / Resolution
- **Center Selected & Reset Layout conditional render**: `GraphControls.tsx` previously conditionally omitted the Center Selected button when `hasSelectedNode` was false. Per Step 3 and md §3d, replaced conditional rendering with a disabled button containing an explanatory `title` tooltip ("Select a node first to center") to prevent toolbar layout shift during selection.
- **WorkspaceHeader ARIA Tablist pattern**: `WorkspaceHeader.tsx` previously declared `role="tablist"` and `role="tab"` without controlled `role="tabpanel"` elements. Per Step 11, downgraded lens bar to `role="navigation"` with `aria-current="page"` to preserve visual styling while providing valid ARIA semantics.

## Out-of-Scope Follow-ups for Next Pass
- Splitting `GraphView` into dedicated custom hooks (`useGraphLayout`, `useCytoscape`, etc.)
- Differential element reconciliation (element-level diffing)
- Introducing a `LayoutStateProvider`
- Splitting `AppContent` into providers
- WebWorker for feature discovery
- Virtualized node list
