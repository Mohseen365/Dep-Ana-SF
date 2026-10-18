# Task Prompt — Wave 1 Lane C: App Pipeline & Search Optimization

## Mission Instructions
You are an autonomous Jules agent assigned to **Wave 1 Lane C: App Pipeline & Search Optimization**. Your objective is to optimize `App.tsx` state pipeline, stabilize effect subscriptions, invalidate shadow graph state on data changes, and debounce sidebar search.

---

## Safety & Boundary Rules
- **Owned Scope:** You are strictly authorized to modify only the following files:
  - `explorer/src/App.tsx`
  - `explorer/src/hooks/useViewState.ts`
  - `explorer/src/components/Sidebar.tsx`
  - `explorer/src/components/Sidebar.test.tsx`
- **Out of Scope:** Do NOT touch files owned by other lanes (`GraphView.tsx`, `graph-style.ts`, `GraphControls.tsx`, `WorkspaceHeader.tsx`, `explorer.ts`).
- **Protected File:** Do NOT edit, delete, or regenerate `./last_commit_changes.txt`.
- **Dependencies:** Do NOT run `npm install`, edit `package.json`, or modify lockfiles.

---

## Assigned Tasks

1. **`[N11]` `useProjectSafe` Dev Error Logging:**
   - In `App.tsx` or related project hooks, log explicit dev warnings when `useProjectSafe` encounters uninitialized project state.
2. **`[N12]` Effect Subscription Ref Stabilization:**
   - Stabilize event listener subscription callbacks in `App.tsx` using refs to prevent unnecessary re-subscriptions on re-render.
3. **`[N13]` `isNotAnalyzed` Helper Extraction:**
   - Extract `isNotAnalyzed(status)` logic into a clean utility helper.
4. **`[N14]` `committedMutatedGraph` Invalidation:**
   - Invalidate `committedMutatedGraph` shadow graph state in `App.tsx` when fresh data results arrive or re-analysis is triggered.
5. **`[T1-4]` Memoize Derived Graph Pipeline:**
   - Implement `useMemo` over derived graph transformation pipeline steps in `App.tsx` to reduce redundant computation.
6. **`[T1-7]` Debounce Search Query:**
   - Implement debouncing on search input processing in `useViewState.ts` and `Sidebar.tsx` to prevent rapid keystrokes from triggering expensive synchronous filtering.

---

## Required Validation Commands
```bash
cd explorer && npm run typecheck && npm run lint && npx vitest run src/App.test.tsx src/components/Sidebar.test.tsx
```

---

## Reporting Requirement
Upon completion, create `LANE_C_APP_PIPELINE_IMPLEMENTATION_REPORT.md` documenting modified files, tests executed, and results observed.
