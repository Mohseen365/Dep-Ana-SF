# Task Prompt — Wave 1 Lane D: GraphControls Accessibility & Roving Focus

## Mission Instructions
You are an autonomous Jules agent assigned to **Wave 1 Lane D: GraphControls Accessibility & Roving Focus**. Your objective is to improve keyboard accessibility, implement roving `tabIndex` focus management, and enforce ARIA semantics for `GraphControls.tsx`.

---

## Safety & Boundary Rules
- **Owned Scope:** You are strictly authorized to modify only the following files:
  - `explorer/src/components/GraphControls.tsx`
  - `explorer/src/components/GraphControls.test.tsx`
- **Out of Scope:** Do NOT touch files owned by other lanes (`GraphView.tsx`, `App.tsx`, `WorkspaceHeader.tsx`, `explorer.ts`).
- **Protected File:** Do NOT edit, delete, or regenerate `./last_commit_changes.txt`.
- **Dependencies:** Do NOT run `npm install`, edit `package.json`, or modify lockfiles.

---

## Assigned Tasks

1. **`[N18]` `GraphControls` Focus State Memoization:**
   - In `GraphControls.tsx`, memoize focus state calculations to prevent unnecessary component re-renders.
2. **`[N19]` Toolbar Roving `tabIndex` Implementation:**
   - Implement roving `tabIndex` pattern for graph toolbar controls (`tabIndex={isActive ? 0 : -1}`) and handle Arrow key navigation across toolbar buttons.
3. **`[N20]` Focus Containment Guard:**
   - Add focus containment guards in toolbar event handlers to prevent focus from escaping or resetting unexpectedly.
4. **`[T1-8]` `getInteractiveElements` `getComputedStyle` Filter:**
   - Update element query helpers in `GraphControls.tsx` to filter out hidden/disabled elements using `getComputedStyle`.
5. **`[T1-9]` Toolbar `aria-orientation` Attribute:**
   - Add `role="toolbar"` and `aria-orientation="vertical"` (or `"horizontal"`) to the GraphControls container element.

---

## Required Validation Commands
```bash
cd explorer && npm run typecheck && npm run lint && npx vitest run src/components/GraphControls.test.tsx
```

---

## Reporting Requirement
Upon completion, create `LANE_D_GRAPHCONTROLS_ACCESSIBILITY_REPORT.md` documenting modified files, tests executed, and results observed.
