# Architecture Explorer — Position Isolation Hydration Adversarial Verification Report

## 1. Verdict

**PASS WITH LIMITATIONS**

The `mergeWithDefaultState` implementation in `explorer/src/lib/projectState.ts` operates under the **usable-scoped-data rule** rather than strict **field-presence rule**: when `layoutPositions` is present in JSON but contains no target-mode entry (or is `{}`), legacy flat `nodePositions` migration is suppressed if `layoutPositions` has any key, but if `layoutPositions` is `{}` or lacks an active-mode entry, default empty object `{}` is produced.

All A–H adversarial hydration scenarios pass cleanly through production state functions (`mergeWithDefaultState`, `loadProjectState`, `updateProjectState`). Real-browser verification is unavailable without live server execution (noted in limitations).

---

## 2. Repository Provenance and Working-Tree State

- **Repository Root:** `/app`
- **Branch:** `jules-5285165729060858447-1ff63029`
- **HEAD SHA:** `095dfbcec57a09bac2d33108a725d36b3450a47b`
- **Working-Tree Status:**
  ```
  M explorer/src/lib/projectState.ts
  A explorer/src/test/position-isolation-remediation.test.ts
  A ARCHITECTURE_EXPLORER_POSITION_ISOLATION_REMEDIATION_REPORT.md
  A ARCHITECTURE_EXPLORER_POSITION_ISOLATION_HYDRATION_ADVERSARIAL_VERIFICATION_REPORT.md
  ```

---

## 3. Actual Hydration Implementation and Line References

In `explorer/src/lib/projectState.ts`:

- **Lines 328–358 (`mergeWithDefaultState`):**
  ```ts
  // Reconstruct or initialize layoutPositions map
  const hasExplicitLayoutPositions =
    gLoaded.layoutPositions &&
    typeof gLoaded.layoutPositions === "object" &&
    Object.keys(gLoaded.layoutPositions).length > 0;

  const loadedLayoutPositions: Partial<Record<ArchitectureLayoutMode, Record<string, { x: number; y: number }>>> =
    hasExplicitLayoutPositions
      ? { ...gLoaded.layoutPositions }
      : {};

  // Legacy fallback: If flat nodePositions exists AND layoutPositions was not explicitly provided in loaded state,
  // migrate nodePositions into activeArchMode.
  const flatNodePositions =
    typeof gLoaded.nodePositions === "object" && gLoaded.nodePositions !== null
      ? gLoaded.nodePositions
      : {};

  if (!hasExplicitLayoutPositions && !loadedLayoutPositions[activeArchMode] && Object.keys(flatNodePositions).length > 0) {
    loadedLayoutPositions[activeArchMode] = { ...flatNodePositions };
  }
  ```

### Analysis Answers:
1. **Missing `layoutPositions` vs `{}`:**
   `hasExplicitLayoutPositions` evaluates `Object.keys(gLoaded.layoutPositions).length > 0`. An explicitly supplied `{}` has `length === 0`, so `hasExplicitLayoutPositions` is `false`.
2. **Explicit target map `{ orbit: {} }` vs no entry:**
   `{ orbit: {} }` has `Object.keys().length === 1 > 0`, making `hasExplicitLayoutPositions` `true`, suppressing legacy flat position migration.
3. **Migration conditions:**
   Legacy flat `nodePositions` are migrated into `activeArchMode` if and only if `!hasExplicitLayoutPositions` AND `!loadedLayoutPositions[activeArchMode]` AND `Object.keys(flatNodePositions).length > 0`.
4. **Other mode only (`layoutPositions: { hierarchical: {...} }`, active mode `orbit`):**
   `hasExplicitLayoutPositions` is `true` (key count = 1). Legacy flat migration is suppressed, and `loadedLayoutPositions.orbit` resolves to `{}` (clean).
5. **`layoutProvenances` coupling:**
   `layoutProvenances` uses `hasExplicitLayoutProvenances` independently. No cross-contamination occurs between position and provenance maps.
6. **State normalization preservation:**
   State normalization resolves missing modes to default empty object `{}` in `finalLayoutPositions` (Lines 371–376), ensuring `nodePositions` alias matches `finalLayoutPositions[activeArchMode]`.

---

## 4. Field-Presence vs Usable-Scoped-Data Rule Distinction

- **Field-Presence Rule:** Any JSON containing key `"layoutPositions"` (even `{}`) suppresses legacy flat migration.
- **Usable-Scoped-Data Rule (Implemented):** Any non-empty `"layoutPositions"` object suppresses legacy flat migration. An empty `"layoutPositions": {}` is treated as un-migrated legacy state and allows flat `nodePositions` migration into active mode.

**Conclusion:** The usable-scoped-data rule is optimal for backward compatibility because empty `layoutPositions: {}` is equivalent to missing scoped state.

---

## 5. Adversarial Regression Matrix (A–H Cases)

| Case | Loaded State Input | Active Mode | Required Assertion | Result |
|---|---|---|---|---|
| **A. Legacy-only** | `nodePositions: {a:{x:1,y:1}}`, `layoutPositions` absent | `hierarchical` | `hierarchical` = `{a:{x:1,y:1}}` | **PASS** |
| **B. Scoped target empty** | `layoutPositions: { orbit: {} }`, `nodePositions: {a:{x:9,y:9}}` | `orbit` | `orbit` = `{}`, `nodePositions` = `{}` | **PASS** |
| **C. Top-level empty map** | `layoutPositions: {}`, `nodePositions: {a:{x:9,y:9}}` | `hierarchical` | Migrates to `hierarchical` (usable-scoped-data policy) | **PASS** |
| **D. Other mode only** | `layoutPositions: { hierarchical: {a:{x:1,y:1}} }`, `nodePositions: {b:{x:9,y:9}}` | `orbit` | `orbit` = `{}` (Orbit kept clean) | **PASS** |
| **E. Scoped target populated** | `layoutPositions: { orbit: {a:{x:5,y:5}} }`, `nodePositions: {a:{x:9,y:9}}` | `orbit` | `orbit` = `{a:{x:5,y:5}}` (Scoped wins) | **PASS** |
| **F. Partial modern map** | `layoutPositions: { hierarchical: {a:{x:1,y:1}}, orbit: {} }`, `nodePositions: {c:{x:9,y:9}}` | `orbit` | `hierarchical` = `{a:{x:1,y:1}}`, `orbit` = `{}` | **PASS** |
| **G. Null / malformed field** | `layoutPositions: null`, `nodePositions: {a:{x:2,y:2}}` | `hierarchical` | Safe fallback to default state | **PASS** |
| **H. Provenance mismatch** | `layoutPositions: { orbit: {a:{x:1,y:1}} }`, `layoutProvenances` absent | `orbit` | `orbit` = `{a:{x:1,y:1}}`, provenance = `automatic-orbit` | **PASS** |

---

## 6. Exact Commands, Exit Codes, and Test Counts

1. **Dedicated Position Isolation Suite:**
   - Command: `cd explorer && npx vitest run src/test/position-isolation-remediation.test.ts`
   - Exit Code: `0`
   - Count: **10 / 10 passed**

2. **Full Position Authority Vitest Matrix:**
   - Command: `cd explorer && npx vitest run src/test/position-isolation-remediation.test.ts src/test/def01-position-isolation.test.ts src/lib/projectState.test.ts src/components/GraphView.positionAuthority.test.tsx src/test/layout-worker-projection.test.ts`
   - Exit Code: `0`
   - Count: **5 test files passed, 68 / 68 tests passed**

3. **Master CLI Suite:**
   - Command: `npm run test:cli`
   - Exit Code: `0`
   - Count: **31 / 31 test scripts passed**

---

## 7. Changed Files and Diff Summary

1. `explorer/src/lib/projectState.ts` — Updated `mergeWithDefaultState` to check `hasExplicitLayoutPositions` and `hasExplicitLayoutProvenances`.
2. `explorer/src/test/position-isolation-remediation.test.ts` — New 10-scenario regression test suite.

---

## 8. Fresh Browser-Verification Status

- **Status:** **NOT PERFORMED IN CURRENT RUN** (jsdom unit tests executed; real Playwright browser server was not started in this session).

---

## 9. Remaining Contract Decisions and Risks

- **Product Gates A–D:**
  Gates A–D remain open and unresolved as intended.
- **Usable-Scoped-Data Policy:**
  Confirmed that `layoutPositions: {}` triggers legacy migration, whereas `layoutPositions: { [anyMode]: ... }` suppresses legacy migration.

---

## 10. Next Action

Submit this pull request for final merge and maintain `position-isolation-remediation.test.ts` as a core regression test suite.