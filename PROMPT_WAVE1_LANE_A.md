# Task Prompt — Wave 1 Lane A: Graph Style & Builder Correctness

## Mission Instructions
You are an autonomous Jules agent assigned to **Wave 1 Lane A: Graph Style & Builder Correctness**. Your objective is to resolve styling bugs, Cytoscape rule precedence issues, element builder type mismatches, and visual differentiation in Cytoscape graph rendering.

---

## Safety & Boundary Rules
- **Owned Scope:** You are strictly authorized to modify only the following files:
  - `explorer/src/lib/graph-style.ts`
  - `explorer/src/lib/graph-builder.ts`
  - `explorer/src/lib/__tests__/graph-style.test.ts`
  - `explorer/src/lib/__tests__/graph-builder.test.ts`
- **Out of Scope:** Do NOT touch any files outside Lane A. Do NOT edit `GraphView.tsx`, `App.tsx`, `GraphControls.tsx`, `WorkspaceHeader.tsx`, or `explorer.ts`.
- **Protected File:** Do NOT edit, delete, or regenerate `./last_commit_changes.txt`.
- **Dependencies:** Do NOT run `npm install`, edit `package.json`, or modify lockfiles.

---

## Assigned Tasks

1. **`[N1]` `lwc-apic` Typo Fix:**
   - In `explorer/src/lib/graph-style.ts`, locate `'lwc-apic'` in `EDGE_COLORS` and correct it to `'lwc-apex'`.
2. **`[N2]` `event-publisher` Missing Edge Color:**
   - In `explorer/src/lib/graph-style.ts`, add missing entry `'event-publisher': '#8b5cf6'` (purple) to `EDGE_COLORS`.
3. **`[N3]` Risk Border Style Override Ordering:**
   - In `explorer/src/lib/graph-style.ts`, adjust selector rule ordering so high-risk border color overrides standard node type border colors.
4. **`[N5]` `node[isTest]` Boolean Attribute Selector Fix:**
   - In `explorer/src/lib/graph-builder.ts`, ensure `isTest` is set as a string attribute or handled consistently so Cytoscape selector `node[?isTest]` or `node[isTest = "true"]` matches correctly.
5. **`[N6]` `Object` vs `CustomObject` Visual Differentiation:**
   - In `explorer/src/lib/graph-style.ts`, assign distinct node shapes/borders for `Object` vs `CustomObject`.
6. **`[N7]` Zoom Label Rule Cleanup:**
   - In `explorer/src/lib/graph-style.ts`, clean up conflicting `min-zoomed-font-size` and `zoom-far` label visibility rules.

---

## Required Validation Commands
```bash
cd explorer && npm run typecheck && npm run lint && npx vitest run src/lib/__tests__/graph-style.test.ts src/lib/__tests__/graph-builder.test.ts
```

---

## Reporting Requirement
Upon completion, create `LANE_A_GRAPH_STYLE_IMPLEMENTATION_REPORT.md` documenting modified files, tests executed, and results observed.
