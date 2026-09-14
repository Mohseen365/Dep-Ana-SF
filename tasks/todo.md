# Todo: Graph-First Investigation (Track: UX-GFI)

> Cross-session task list. Jules sessions check off items and append
> their session ID as a comment. Do not reorder or rename task IDs.

## Cross-Prompt Invariants

- [ ] Never modify `dependency-analyzer.cjs` or any `*.cjs` file
- [ ] Never modify `explorer-contract.ts`
- [ ] Never modify anything under `explorer/src/lib/intelligence/`
- [ ] Never modify panel internals (SummaryBar, HotspotPanel, DiagnosticsPanel, FindingsPanel, ComparePanel, FocusControls, ImpactControls, ViewModeSwitcher, Sidebar) — mount/unmount only
- [ ] `cd explorer && npm test` passes before declaring done (unless prompt says otherwise)
- [ ] `cd explorer && npm run build` passes before declaring done
- [ ] STOP condition verified before reporting completion

---

## Phase 0: Spikes (GATE — do not proceed until complete)

- [ ] **Task 0.1 — Graph↔Drawer sync spike**
  - Toggle pane width 100% ↔ 60% via CSS grid
  - Measure FPS during transition; target ≥55
  - Files: `explorer/src/spike/graph-drawer-sync.tsx` (throwaway)
  - Scope: XS
  - Prompt: UX-1
  - Verified by: _pending_
  - Session ID: _pending_

- [ ] **Task 0.2 — Detached window message-passing spike**
  - `window.open()` + `BroadcastChannel` round-trip for `nodeId`
  - Files: `explorer/src/spike/detached-window.html`, `detached-window.ts` (throwaway)
  - Scope: XS
  - Prompt: UX-1
  - Verified by: _pending_
  - Session ID: _pending_

- [ ] **Task 0.3 — Record spike decision**
  - Write `explorer/spike-notes.md` with measured FPS, BroadcastChannel reliability, and a clear proceed/revise/abandon decision
  - Scope: XS
  - Prompt: UX-1
  - Verified by: _pending_
  - Session ID: _pending_

### Checkpoint: Spikes

- [ ] Sync spike maintains ≥55 FPS through pane transition
- [ ] Detached window receives and echoes `nodeId` via BroadcastChannel
- [ ] `explorer/spike-notes.md` records explicit decision
- [ ] **Review with human before Phase 1.** If decision = abandon, halt.

---

## Phase 1: Foundation

- [ ] **Task 1.1 — Simplify `useViewState` to two params**
  - Shape: `{ nodeId, investigateOpen, setNodeId, setInvestigateOpen }`
  - URL: `?node=X&investigate=true` (omit defaults for clean URLs)
  - Legacy params parse without crash (silent ignore)
  - Files: `explorer/src/hooks/useViewState.ts`, `explorer/src/hooks/useViewState.test.ts`
  - Scope: S
  - Prompt: UX-2
  - Deps: 0.3
  - Session ID: _pending_

- [ ] **Task 1.2 — Adopt opt-in URL write policy**
  - Keep all 5 URL modules on disk (focusQuery, impactQuery,
    findingsQuery, connectionQuery, investigationQuery)
  - Change write policy: each module's `toQuery` is only invoked
    when its feature is actively enabled
  - Default session URL: `?node=X` or `?node=X&investigate=true`
  - After invoking Focus via Cmd+K: URL gains `focus.*` params
  - After closing Focus: `focus.*` params are removed from URL
  - Legacy deep-links with all params present parse correctly on load
  - Files: `explorer/src/hooks/useViewState.ts`,
    `explorer/src/hooks/useViewState.test.ts`,
    `explorer/src/lib/url/index.ts`,
    `explorer/src/lib/url/urlQuery.test.ts`
  - Scope: S
  - Prompt: UX-2 (amended)
  - Deps: 1.1
  - Session ID: _pending_

- [ ] **Task 1.3 — Drawer skeleton**
  - Click node → right drawer opens with node name; close → closes
  - Browser back/forward navigates drawer state
  - Graph pane never unmounts
  - Files: `explorer/src/components/InvestigationDrawer.tsx` (new), `InvestigationDrawer.test.tsx` (new), `App.tsx`, `index.css`
  - Scope: M
  - Prompt: UX-3
  - Deps: 1.2
  - Session ID: _pending_

### Checkpoint: Foundation

- [ ] Only `node` and `investigate` params appear in URL
- [ ] Click node → drawer opens; close → drawer closes; back button navigates
- [ ] All existing tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] `DetailsPanel.tsx` on disk is unchanged
- [ ] **Review with human before Phase 2**

---

## Phase 2: Drilling Core

- [ ] **Task 2.1 — Ranked dependents list**
  - `rankDependents(nodeId, data)` returns direct+transitive ranked by `impactCount` desc, then name asc
  - Deterministic (identical input → identical output)
  - Files: `explorer/src/lib/drill.ts` (new), `drill.test.ts` (new), `InvestigationDrawer.tsx`
  - Scope: M
  - Prompt: UX-4
  - Deps: 1.3
  - Session ID: _pending_

- [ ] **Task 2.2 — One-hop expansion in place**
  - Clicking a dependent row pushes a new hop (Finder-column style)
  - Empty state: "No dependents detected"
  - Files: `explorer/src/components/InvestigationDrawer.tsx`
  - Scope: M
  - Prompt: UX-4
  - Deps: 2.1
  - Session ID: _pending_

- [ ] **Task 2.3 — Breadcrumb + recent investigations stack**
  - `Breadcrumbs.tsx`: `A › B › C` with clickable segments
  - Recent stack: last 5 investigated node IDs, session-only
  - Files: `explorer/src/components/Breadcrumbs.tsx` (new), `Breadcrumbs.test.tsx` (new), `InvestigationDrawer.tsx`, `App.tsx`
  - Scope: M
  - Prompt: UX-4
  - Deps: 2.2
  - Session ID: _pending_

### Checkpoint: Drilling Core

- [ ] ServiceX → OrderController → CartService drill works via row clicks
- [ ] Breadcrumb reflects current path; clicking a crumb returns to that hop
- [ ] Ranking is deterministic (verified by `drill.test.ts`)
- [ ] Empty dependents/dependencies states render cleanly
- [ ] **Review with human before Phase 3**

---

## Phase 3: Graph Coupling

- [ ] **Task 3.1 — Graph pane shrinks smoothly on drawer open**
  - CSS `grid-template-columns` transition; `cy.resize()` fires on `transitionend`
  - No remount, no re-layout, no flash
  - Files: `explorer/src/App.tsx`, `explorer/src/index.css`, `explorer/src/components/GraphView.tsx`
  - Scope: M
  - Prompt: UX-5
  - Deps: 2.3
  - Session ID: _pending_

- [ ] **Task 3.2 — Graph focus follows current drill node**
  - `focusOnNode(cy, nodeId)` in `graph-interactions.ts`
  - Centers on node, preserves zoom, dims unrelated
  - `GraphView` accepts new prop `focusedNodeId`
  - Files: `explorer/src/lib/graph-interactions.ts`, `explorer/src/components/GraphView.tsx`, `App.tsx`
  - Scope: S
  - Prompt: UX-5
  - Deps: 3.1
  - Session ID: _pending_

### Checkpoint: Graph Coupling

- [ ] Drawer open shrinks graph without jitter (≥55 FPS verified manually)
- [ ] Current drill node is centered + highlighted; zoom preserved
- [ ] Closing drawer restores full canvas; no residual dimming
- [ ] **Review with human before Phase 4**

---

## Phase 4: Command Palette

- [ ] **Task 4.1 — Command palette host + node search**
  - Cmd+K / Ctrl+K toggles; Escape closes
  - Search reuses `searchNodes` from `lib/search-filter.ts`
  - Search <200ms on 500 nodes (debounce 100ms)
  - Files: `explorer/src/components/CommandPalette.tsx` (new), `CommandPalette.test.tsx` (new), `hooks/useCommandPalette.ts` (new), `hooks/useCommandPalette.test.ts` (new), `App.tsx`, `index.css`
  - Scope: M
  - Prompt: UX-6
  - Deps: 3.2
  - Session ID: _pending_

- [ ] **Task 4.2 — Relocate read-only diagnostics**
  - Summary, Hotspots, Diagnostics, Findings mounted as palette commands
  - Panel components NOT edited — mount/unmount only
  - Files: `explorer/src/components/CommandPalette.tsx`, `CommandPalette.test.tsx`, `App.tsx`
  - Scope: M
  - Prompt: UX-7
  - Deps: 4.1
  - Session ID: _pending_

- [ ] **Task 4.3 — Relocate actionable operations**
  - Compare, Focus-here, Impact-here, Toggle view mode as palette commands
  - Files: `explorer/src/components/CommandPalette.tsx`, `App.tsx`
  - Scope: S
  - Prompt: UX-7
  - Deps: 4.1
  - Session ID: _pending_

### Checkpoint: Command Palette

- [ ] Cmd+K opens in <100ms
- [ ] Every previously-permanent surface reachable via Cmd+K
- [ ] No panel component files were edited
- [ ] No keyboard conflicts with existing shortcuts
- [ ] **Review with human before Phase 5**

---

## Phase 5: Cleanup + Detach

- [x] **Task 5.1 — Delete `DetailsPanel.tsx` and tests**
  - Delete `DetailsPanel.tsx`, `DetailsPanel.test.tsx`, `RefactorHandoff.test.tsx`
  - Remove `.details-panel` rules from `panels/panels.css`
  - `grep -r "DetailsPanel\|RefactorHandoff" explorer/src` returns zero
  - Note removed refactor-handoff modal in `tasks/plan.md` Open Questions
  - Files: as listed
  - Scope: S
  - Prompt: UX-8
  - Deps: 4.2
  - Session ID: jules-18290189911400019495-d9b457ce (2026-09-14)

- [ ] **Task 5.2 — Remove permanent chrome + add ⌘K hint**
  - Remove `<Sidebar />`, `<SummaryBar />`, `<StatusBar />`, `<ViewModeSwitcher />`, `<FocusControls />`, `<ImpactControls />` from `App.tsx`
  - Add non-interactive ⌘K hint to `Header.tsx`
  - Files: `explorer/src/App.tsx`, `explorer/src/components/Header.tsx`, `explorer/src/index.css`
  - Scope: S
  - Prompt: UX-9
  - Deps: 4.3
  - Session ID: _pending_

- [ ] **Task 5.3 — Drawer pin / close / detach**
  - Pin persists in `localStorage: explorer.drawer.pinned`
  - Detach uses `BroadcastChannel('investigator')`; `detached.html` at `explorer/public/`
  - Both directions of sync (main↔detached) work; closing detached does not crash main
  - Files: `explorer/src/lib/detached-drawer.ts` (new), `detached-drawer.test.ts` (new), `explorer/public/detached.html` (new), `InvestigationDrawer.tsx`, `App.tsx`, `index.css`
  - Scope: M
  - Prompt: UX-10
  - Deps: 5.1
  - Session ID: _pending_

### Checkpoint: Complete

- [ ] Default view is a clean full-canvas graph + header
- [ ] No permanent panels other than the header
- [ ] Detached drawer works on a second window
- [ ] All acceptance criteria met
- [ ] **Final review with human before merge**

---

## Session Log

Append entries as `<session-id> | <prompt> | <task(s)> | <timestamp> | <notes>`.

jules-18290189911400019495-d9b457ce | UX-8-R | Task 5.1 | 2026-09-14T14:43:00Z | Corrective pass; audit failures A3/A5/A6/B2/C1/C3/C4/E1/E2 resolved
