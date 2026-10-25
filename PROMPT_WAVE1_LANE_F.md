# Task Prompt — Wave 1 Lane F: Architecture Mode Contracts & Types

## Mission Instructions
You are an autonomous Jules agent assigned to **Wave 1 Lane F: Architecture Mode Contracts & Types**. Your objective is to extract architecture mode metadata contracts, derive cycle order, update project documentation, and configure test bootstrap flags.

---

## Safety & Boundary Rules
- **Owned Scope:** You are strictly authorized to modify only the following files:
  - `explorer/src/types/explorer.ts`
  - `explorer/src/lib/layout/arch-mode.ts`
  - `NOTES.md`
  - `explorer/src/test/setup.ts`
  - `explorer/src/types/__tests__/arch-mode-meta.test.ts`
- **Out of Scope:** Do NOT touch files owned by other lanes (`GraphView.tsx`, `App.tsx`, `graph-style.ts`, `GraphControls.tsx`, `WorkspaceHeader.tsx`).
- **Protected File:** Do NOT edit, delete, or regenerate `./last_commit_changes.txt`.
- **Dependencies:** Do NOT run `npm install`, edit `package.json`, or modify lockfiles.

---

## Assigned Tasks

1. **`[N27]` Extract `ARCH_MODE_META` to `arch-mode.ts`:**
   - Extract `ARCH_MODE_META` dictionary from `explorer/src/types/explorer.ts` to `explorer/src/lib/layout/arch-mode.ts`.
   - Re-export `ARCH_MODE_META` from `explorer/src/types/explorer.ts` for backward compatibility.
2. **`[N28]` Derive Mode Cycle from `ARCH_MODE_ORDER` Array:**
   - In `explorer/src/lib/layout/arch-mode.ts`, derive `getNextArchMode` dynamically from `ARCH_MODE_ORDER` array.
3. **`[T0-9]` `NOTES.md` Documentation Update:**
   - Update `NOTES.md` to accurately document the open status of `T0-1` (`hasAuth` inversion fix) and clarify execution prerequisites.
4. **`[T0-10]` E2E Bootstrap Expose-Flag Test Setup:**
   - In `explorer/src/test/setup.ts`, add global test flag initialization `(window as any).__EXPOSE_CY__ = true;` for E2E test setup.

---

## Required Validation Commands
```bash
cd explorer && npm run typecheck && npm run lint && npx vitest run src/types/__tests__/arch-mode-meta.test.ts
```

---

## Reporting Requirement
Upon completion, create `LANE_F_ARCH_MODE_CONTRACTS_IMPLEMENTATION_REPORT.md` documenting modified files, tests executed, and results observed.
