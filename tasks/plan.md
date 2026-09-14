# Implementation Plan: Graph-First Investigation (Explorer UX Refinement)

## Overview

Convert the Explorer from a dashboard-of-panels into a two-pane,
graph-first application. The full-canvas dependency graph becomes the
default Overview surface with no permanent competing chrome. Clicking a
node opens a right-side Investigation Drawer with a progressive one-hop
drill (ranked dependents → expand in place → breadcrumb). Every other
current surface (SummaryBar, HotspotPanel, DiagnosticsPanel,
FindingsPanel, ComparePanel, FocusControls, ImpactControls,
ViewModeSwitcher) relocates into a Cmd+K command palette. URL state
reduces to two parameters: `?node=X` and `?investigate=true|false`.
The graph never unmounts; the drawer is pinnable, closable, and
detachable to a second browser window via `BroadcastChannel`.

## Architecture Decisions

- **Single app, two panes — not two localhosts.** The user's
  "two different localhost" intent (avoid mode-switch cost) is honored
  via a detachable drawer window synced via `BroadcastChannel`, not via
  two separate builds. Rationale: one bundle, one data fetch, one state
  machine; the detached window is a rendering target, not a separate app.
- **Cmd+K is a relocation target, not a redesign.** Panels keep their
  internals; they are simply mounted inside a palette host on demand.
  This bounds the work and preserves all existing intelligence logic.
- **Drawer replaces DetailsPanel.** The current 3-tab DetailsPanel is
  deleted; its content is redistributed into the drill drawer. Not
  "kept alongside" — replaced.
- **One-hop drilling is the navigation model.** Breadcrumbs hold the
  current path; an in-memory "recent investigations" stack holds
  branches. No tabbed investigations in v1.
- **Graph pane never unmounts.** Drawer open/close is a CSS
  `grid-template-columns` transition; `cy.resize()` fires on
  `transitionend`. No remount, no re-layout, no flash.
- **URL state is two params, period.** Deleted query modules are
  removed from disk, not just unused.
- **No changes to deterministic analyzer or contract.** All UI-layer.
  `dependency-analyzer.cjs`, `explorer-contract.ts`, and
  `explorer-data.json` are read-only inputs.

## Task List

See `tasks/todo.md`. Full task breakdown with acceptance criteria and
verification steps lives there.

### Phase 0: Spikes (GATE)

- Task 0.1 — Graph↔Drawer sync spike
- Task 0.2 — Detached window message-passing spike
- Task 0.3 — Record decision

### Phase 1: Foundation

- Task 1.1 — Simplify `useViewState` to two params
- Task 1.2 — Delete obsolete URL modules
- Task 1.3 — Drawer skeleton

### Phase 2: Drilling Core

- Task 2.1 — Ranked dependents list
- Task 2.2 — One-hop expansion in place
- Task 2.3 — Breadcrumb + recent investigations stack

### Phase 3: Graph Coupling

- Task 3.1 — Graph pane shrinks on drawer open
- Task 3.2 — Graph focus follows current drill node

### Phase 4: Command Palette

- Task 4.1 — Palette host + node search
- Task 4.2 — Relocate read-only diagnostics
- Task 4.3 — Relocate actionable operations

### Phase 5: Cleanup + Detach

- Task 5.1 — Delete `DetailsPanel.tsx`
- Task 5.2 — Remove permanent chrome + add ⌘K hint
- Task 5.3 — Drawer pin / close / detach

## Risks and Mitigations

| Risk                                              | Impact | Mitigation                                                                  |
| ------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| Graph↔Drawer sync jitters                         | High   | Phase 0 spike; if FPS <55, fall back to instant resize (no transition)      |
| BroadcastChannel detach broken in target browsers | Medium | Phase 0 spike; if broken, defer detach to v1.1 and ship pin/close only      |
| Deleting URL modules breaks deep-link users       | Medium | Parse legacy params, ignore gracefully; document URL change in README       |
| Cmd+K search slow on large graphs                 | High   | Debounce 100ms, pre-built name index, virtualize list >200                  |
| Overlap between "focus mode" and new drill model  | Medium | Fold Focus into palette command, not persistent mode                        |
| Scope creep: redesigning panel internals          | High   | Freeze panel internals; only change mount location. Enforced by code review |

## Open Questions

- Should the graph auto-zoom on the currently-drilled node, or hold
  user zoom? Recommendation: hold zoom; center only.
- When the user closes the drawer, does `?node=X` persist? Recommendation: persist.
- Is the "recent investigations" stack persisted across reloads? Recommendation: session-only for v1.
- Does a thin status strip survive at the bottom of the graph pane, or does Cmd+K absorb everything? Recommendation: Cmd+K absorbs all; header hint is enough.
- RESOLVED (UX-8.5-R, 2026-09-14): RefactorHandoff modal reinstated as both a Cmd+K palette command and an InvestigationDrawer header action. Original window.parent.postMessage transport preserved in lib/refactor-handoff.ts.

## Ownership Boundaries

- **Production files this track may modify:** `explorer/src/**` only.
- **Production files this track MUST NOT modify:**
  - `dependency-analyzer.cjs`
  - `explorer-contract.ts`
  - `explorer-data.json` (generated, read-only input)
  - Any file under `explorer/src/lib/intelligence/`
  - Any panel internals (Summary, Hotspot, Diagnostics, Findings, Compare, Focus, Impact, ViewModeSwitcher, Sidebar)
- **Files under `explorer/spike/` are throwaway** and may be deleted after UX-1.

## Exit Criteria (Track Complete)

- [ ] Default view is a clean full-canvas graph + minimal header
- [ ] Clicking a node opens the Investigation Drawer
- [ ] Progressive drill works: ranked dependents → expand → breadcrumb
- [ ] Every former permanent surface reachable via Cmd+K
- [ ] Drawer supports pin, close, detach (BroadcastChannel)
- [ ] No permanent panels other than the header
- [ ] All Explorer tests pass
- [ ] `cd explorer && npm run build` succeeds
- [ ] `dependency-analyzer.cjs`, `explorer-contract.ts`, and
      `explorer/src/lib/intelligence/` are byte-for-byte unchanged
