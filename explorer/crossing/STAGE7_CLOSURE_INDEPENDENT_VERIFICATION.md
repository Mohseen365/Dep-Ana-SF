# Stage 7 Independent Verification

---

## 1. Repository Baseline (Protected)

| Property | Value |
|----------|-------|
| Repository Root | `C:/Users/User/Downloads/dependency-analyzer` |
| Git Branch | `main` |
| HEAD Commit SHA | `4f9f9a9ffde9d85bfb8b528f42cabb6d56d41d9a` |
| `last_commit_changes.txt` SHA‑256 | `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb` |

*No uncommitted changes reported (`git status --short` empty).*

---

## 2. Comparison to Reported Root‑Cause Document

The **root‑cause report** (`STAGE7_PRIMARY_PRIMARY_CROSSING_ROOT_CAUSE_REPORT.md`) claims:
- Branch `jules-2324028968619952256-6af819d4`
- HEAD `639250b911d20a52fae9221326c76e53ffa30c2c`
- Primary‑primary crossing count **7 812** (bit‑for‑bit match).

Our current checkout is on **different branch/commit**; therefore the report’s assertions are **not applicable** to the repository state we are verifying.

---

## 3. Diagnostic Artifact Integrity

| Artifact | Expected Type | Actual Content | Integrity Observation |
|----------|---------------|----------------|----------------------|
| `candidate_cross_debug.json` | JSON data array of segment intersections | A **Node.js copy‑script stub** (6 lines) that merely copies a file; not a JSON dataset. | **Invalid – not a dataset** |
| `oracle_cross_debug.json` | JSON array of ~36 k segment records | Large JSON (≈10 MB) that **parses up to line 401 963**; line 401 964 contains stray text (`]    "classification": "primary-primary"`) causing the file to be **malformed beyond that point**. | **Partially valid** – only the prefix is usable. |
| `diff_crossings.cjs` | Executable diff utility | Valid CommonJS script (1.6 KB) – runs without syntax errors. | **Valid** |
| `primary_primary_extra.json` | – | Not present. | – |

The report’s claim of **18 697 raw primary‑primary segment intersections** and **4 272 unique edge‑pair keys** matches the **parsed subset** of `oracle_cross_debug.json`; however, this is **not the canonical metric** used by the test (`primaryPrimaryCrossings`). The test counts *unique edge‑pair* crossings, which should be 7 812.

---

## 4. Canonical Test Execution

We executed the exact test file:
```
npx vitest run explorer/src/test/stage7-single-pass-x-center-ab.test.ts --reporter=verbose
```
Result (task `task-34`):
- **Exit code:** `1`
- **Duration:** ~416 s (overall Vitest run)
- **Failure:** `it('1. Canonical Fixture Contract - Exact Bit‑for‑Bit Geometry Differential')` timed out after the default 5 s timeout.
- The test contains the assertions:
  ```ts
  expect(fullPipelineMetrics.detailedCrossings!.primaryPrimaryCrossings).toBe(7834);
  expect(fullPipelineMetrics.detailedCrossings!.totalGeometricCrossings).toBe(86198);
  ```
- Because the test timed out, **no metric values were printed**, and the expectations were never evaluated. The timeout indicates the computation exceeds the default 5 s limit for the canonical fixture (240 nodes / 1 024 edges).

**Implication:** The repository still **expects 7 834** crossings, which differs from the **7 812** reported in the root‑cause document. The failure is therefore **unresolved**.

---

## 5. Integration Test (`npm run test:cli`) Scope

The root‑cause report states that `npm run test:cli` ran **33 suites / 184 assertions** and passed. In the current checkout, `npm run test:cli` runs the **full Vitest suite**, which includes the failing Stage 7 test. The presence of a failing test disproves the claim that the entire CLI suite passed on this checkout.

---

## 6. Verdict

**`OPEN`** – The original Stage 7 failure (assertion expecting 7 834 primary‑primary crossings) **persists** and cannot be reconciled with the values claimed in the report. Additionally, diagnostic artifacts are incomplete or malformed, and the report was generated from a different branch/commit.

---

## 7. Recommended Next Actions
1. **Increase the test timeout** for the canonical fixture (e.g., `testTimeout(30000)` or run with `--timeout=30000`) to obtain the actual metric values.
2. **Run the test again** and record the real `primaryPrimaryCrossings` and `totalGeometricCrossings`.
3. If the values equal **7 812**, update the test expectation accordingly and commit the change.
4. Replace the placeholder `candidate_cross_debug.json` with the genuine candidate debug dump, and ensure `oracle_cross_debug.json` is a well‑formed JSON file (remove trailing stray content).
5. Re‑run `npm run test:cli` to confirm the entire suite passes before declaring the issue fixed.

---

*All repository state was captured without any modifications; no files were altered during this verification.*
