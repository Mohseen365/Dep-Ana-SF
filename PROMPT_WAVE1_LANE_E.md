# Task Prompt — Wave 1 Lane E: WorkspaceHeader & Overlay Polish

## Mission Instructions
You are an autonomous Jules agent assigned to **Wave 1 Lane E: WorkspaceHeader & Overlay Polish**. Your objective is to refine navigation accessibility, error boundary recovery, tooltip semantics, and overlay component props.

---

## Safety & Boundary Rules
- **Owned Scope:** You are strictly authorized to modify only the following files:
  - `explorer/src/components/workspace/WorkspaceHeader.tsx`
  - `explorer/src/components/graph-internals/GraphErrorBoundary.tsx`
  - `explorer/src/components/graph-internals/EdgeHoverCard.tsx`
  - `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`
- **Out of Scope:** Do NOT touch files owned by other lanes (`GraphView.tsx`, `App.tsx`, `GraphControls.tsx`, `explorer.ts`).
- **Protected File:** Do NOT edit, delete, or regenerate `./last_commit_changes.txt`.
- **Dependencies:** Do NOT run `npm install`, edit `package.json`, or modify lockfiles.

---

## Assigned Tasks

1. **`[N15]` `FeatureOverlayCanvas` Prop Decoupling:**
   - Decouple excess prop re-renders in `FeatureOverlayCanvas.tsx` by memoizing callbacks and splitting heavy object props.
2. **`[N21]` `aria-current="true"` on Lens Buttons:**
   - In `WorkspaceHeader.tsx`, add `aria-current="true"` (or `aria-current="page"`) to active workspace lens/mode buttons.
3. **`[N22]` Landmark ARIA Role Consolidation:**
   - Ensure header navigation containers in `WorkspaceHeader.tsx` use cohesive `<nav role="navigation">` landmark roles.
4. **`[N23]` `handleDomainClick` LocalStorage Memoization:**
   - Avoid direct synchronous `localStorage` reads on every render in `WorkspaceHeader.tsx` domain click handlers.
5. **`[N24]` Reset Error State on Prop Change:**
   - In `GraphErrorBoundary.tsx`, reset boundary error state when incoming key props change.
6. **`[N25]` Retry Button Recovery & Debouncing:**
   - Debounce retry button actions and update recovery state feedback in `GraphErrorBoundary.tsx`.
7. **`[N26]` Interactive Link ARIA Role Fix:**
   - Remove conflicting `role="tooltip"` from outer interactive containers in `EdgeHoverCard.tsx`.

---

## Required Validation Commands
```bash
cd explorer && npm run typecheck && npm run lint && npx vitest run src/components/workspace/WorkspaceHeader.test.tsx src/components/graph-internals/GraphErrorBoundary.test.tsx
```

---

## Reporting Requirement
Upon completion, create `LANE_E_WORKSPACE_OVERLAY_IMPLEMENTATION_REPORT.md` documenting modified files, tests executed, and results observed.
