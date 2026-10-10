# COMP_ORBIT_PBIM_DEDICATED_DATA_PATH_ADVERSARIAL_VERIFICATION.md

# Phase COMP-VERIFY — PBIM Dedicated Data Path Adversarial Verification Report

## Executive Summary

- **Selected Verdict:** `PBIM DATA PATH WORKS — REGRESSION RISKS REMAIN`
- **Branch:** `jules-6379267940786298824-79227dc7`
- **HEAD SHA:** `7b768554601f63a027004f0616ac48cb447028fc`
- **Working Tree Status:** Clean (`nothing to commit, working tree clean`)
- **Primary Finding:** The dedicated PBIM data path fix correctly prevents silent fallback to the root-level default dataset (`/explorer-data.json`, 4 nodes / 3 edges) when navigating to `?project=pbim`. The browser requests and receives `/pbim/explorer-data.json` containing the authoritative 528-node / 2,063-edge dataset with HTTP 200 OK.
- **Critical Regression Risks:**
  1. **Manifest Desynchronization:** `explorer/public/project-manifest.json` is missing the `pbim` registration, causing automated test `scripts/test-pbim-dedicated-data-path.cjs` to fail out-of-the-box.
  2. **Hardcoded Route Special-Casing:** `ProjectContext.tsx` and `useExplorerData.ts` contain hardcoded `if (slugId === "pbim") return "/pbim/explorer-data.json";` branches, bypassing the standard `/projects/${id}/explorer-data.json` conventions used by all other projects (e.g., `/projects/cst/explorer-data.json`, `/projects/bqc/explorer-data.json`).
  3. **Unmanifested State Preservation Risk:** Preserving unmanifested project IDs in `ProjectContext.tsx` prevents silent default fallback, but causes active project state mismatch (UI project dropdown remains on "Default Salesforce Project" while `activeProjectId` is `"pbim"`), and triggers infinite unhandled loading error loops if an artifact is missing or malformed.

---

## 1. Repository Provenance & Exact Diff Reviewed

### Repository State
- **Branch:** `jules-6379267940786298824-79227dc7`
- **HEAD SHA:** `7b768554601f63a027004f0616ac48cb447028fc`
- **Merge Commit:** PR #634 (`Merge pull request #634 from Mohseen365/jules-11735646698107868447-263f7ed6`)

### File Inspection Matrix

| File Path | Status | Verification Notes |
| :--- | :--- | :--- |
| `explorer/src/context/ProjectContext.tsx` | **PRESENT & INSPECTED** | Preserves explicit project ID in `refreshProjects()` (L162-167); hardcodes `/pbim/explorer-data.json` in `getProjectDataUrl` (L355-357). |
| `explorer/src/hooks/useExplorerData.ts` | **PRESENT & INSPECTED** | Hardcodes `/pbim/explorer-data.json` in `resolveDataUrl` (L23-25, L34-36, L58-60). |
| `scripts/export-explorer.cjs` | **PRESENT & INSPECTED** | Publishes PBIM dataset to `explorer/public/pbim/explorer-data.json` (L845-847). |
| `project-manifest.json` | **PRESENT & INSPECTED** | Registers `pbim` under `analysisPath: "/pbim/explorer-data.json"`. |
| `explorer/public/project-manifest.json` | **PRESENT & INSPECTED** | **DESYNCHRONIZED / DEFECTIVE:** Lacks `pbim` entry (contains only `default`). |
| `analyze/project-manifest.json` | **PRESENT & INSPECTED** | Registers `pbim` with `analysisPath: "/pbim/explorer-data.json"`. |
| `explorer/public/pbim/explorer-data.json` | **PRESENT & INSPECTED** | Valid 528N / 2063E JSON artifact (4,253,560 bytes). |
| `explorer/src/test/pbim-dedicated-data-path.test.ts` | **PRESENT & INSPECTED** | Vitest test file checking slugification, artifact existence, and manifest registration. |
| `scripts/test-pbim-dedicated-data-path.cjs` | **PRESENT & INSPECTED** | Standalone CJS runner for PBIM data path contracts. |
| `scripts/verify-phase-comp-verify-real-browser.cjs` | **PRESENT & INSPECTED** | Playwright Chromium E2E script capturing network traffic and layout screenshots. |

---

## 2. Canonical Context & Authority Resolution

Retrieved context from canonical context files (`AGENT.md`, `CONTEXT-RETRIEVAL-PROTOCOL.md`, `context/CURRENT-DECISIONS.md`, `context/CURRENT-CONTRACTS.md`, `context/CURRENT-IMPLEMENTATION.md`, `context/CURRENT-TESTS.md`, `context/CURRENT-DATA-AND-FIXTURES.md`).

- **Data Path Authority:** Executable source code (`ProjectContext.tsx`, `useExplorerData.ts`) and physical artifacts (`explorer/public/pbim/explorer-data.json`) take precedence over report assertions.
- **Project Isolation Invariant:** Explicit selection of project `X` must load dataset `X` or fail explicitly with `NOT_ANALYZED`. It must NEVER load dataset `Y` (such as `default`) while reporting active project `X`.

---

## 3. Physical Artifact & URL Mapping

### Physical Artifact Locations
- Primary analyze artifact: `analyze/projects/pbim/explorer-data.json`
- Published browser artifact: `explorer/public/pbim/explorer-data.json` (Size: 4,253,560 bytes)
- Legacy public project artifact: `explorer/public/projects/pbim/explorer-data.json` (Size: 4,253,560 bytes)

### URL Resolution Path Analysis
- `getProjectDataUrl('pbim')` in `ProjectContext.tsx`:
  - If `pbim` is in `projects` state and has `analysisPath`, returns `proj.analysisPath` (`"/pbim/explorer-data.json"`).
  - Fallback check L355: `if (targetId === "pbim") return "/pbim/explorer-data.json";`
- `resolveDataUrl('pbim')` in `useExplorerData.ts`:
  - Check L58: `if (slugId === "pbim") return "/pbim/explorer-data.json";`
  - URL parameter check L23: `if (slugProject === "pbim") return "/pbim/explorer-data.json";`
  - LocalStorage check L34: `if (slugProject === "pbim") return "/pbim/explorer-data.json";`

**Inconsistency Identified:** PBIM is served from `/pbim/explorer-data.json`, whereas all other non-default projects are served from `/projects/${id}/explorer-data.json` (e.g., `/projects/cst/explorer-data.json`, `/projects/bqc/explorer-data.json`). Furthermore, `explorer/public/projects/pbim/explorer-data.json` still exists on disk, creating artifact duplication.

---

## 4. Adversarial Project-Selection Matrix (Scenarios A–F)

| Scenario | Input Condition | Target Behavior | Actual Behavior | Disposition | Exact Code Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | Explicit `?project=pbim` with registered manifest | Load `/pbim/explorer-data.json` (528N/2063E) | Loads `/pbim/explorer-data.json` (528N/2063E). HTTP 200 OK. | **VERIFIED CORRECT** | `ProjectContext.tsx` L160-167 |
| **B** | Explicit `?project=pbim` when artifact missing/404 | Report error / NOT_ANALYZED UI | Throws `NOT_ANALYZED: Project analysis data not found (HTTP 404)`. Shows error screen. | **VERIFIED CORRECT** | `useExplorerData.ts` L122-126 |
| **C** | Explicit `?project=pbim` when manifest omits PBIM | Preserve `activeProjectId = "pbim"`, fetch dataset | Preserves `activeProjectId = "pbim"`, fetches `/pbim/explorer-data.json` via hardcoded fallback. | **RISK / REQUIREMENTS NEEDED** | `ProjectContext.tsx` L162-164 |
| **D** | No query parameter (Default route `/`) | Load `/explorer-data.json` (default 4N/3E) | Loads `/explorer-data.json` (4N/3E). HTTP 200 OK. | **VERIFIED CORRECT** | `ProjectContext.tsx` L50-51 |
| **E** | Explicit selection of another project (e.g. `?project=cst`) | Load `/projects/cst/explorer-data.json` | Loads `/projects/cst/explorer-data.json` (240N/1024E). HTTP 200 OK. | **VERIFIED CORRECT** | `useExplorerData.ts` L62 |
| **F** | Explicit selection of unknown ID (`?project=nonexistent`) | Preserve ID or fail with NOT_ANALYZED | Preserves `activeProjectId = "nonexistent"`. Tries to fetch `/projects/nonexistent/explorer-data.json`, gets HTML/404, enters error state. UI dropdown shows "Default Salesforce Project" while state is "nonexistent". | **RISK / REQUIREMENTS NEEDED** | `ProjectContext.tsx` L162, L647-649 |

### Detailed Assessment of Scenario C & F Risks
In `ProjectContext.tsx` (L160–167):
```typescript
const validId = mergedMap.has(currentId)
  ? currentId
  : currentId !== DEFAULT_PROJECT.id
    ? currentId
    : activeIdFromManifest && mergedMap.has(activeIdFromManifest)
      ? activeIdFromManifest
      : DEFAULT_PROJECT.id;
```
By returning `currentId` whenever `currentId !== DEFAULT_PROJECT.id`, any arbitrary string (e.g., `?project=foo`) is set as `activeProjectId`. Because `projects` list only contains items from `mergedMap`, `projects.find(p => p.id === "foo")` evaluates to `undefined`.
- In `ProjectContext.tsx` (L647-649): `activeProject` falls back to `DEFAULT_PROJECT` object ("Default Salesforce Project").
- The UI dropdown renders `activeProject.name` ("Default Salesforce Project"), but `activeProjectId` remains `"foo"`.
- `useExplorerData` attempts to fetch `/projects/foo/explorer-data.json`, fails, and displays the error screen ("NOT_ANALYZED: Project analysis data not found").

---

## 5. Test-Quality Assessment & Actual Test Outcomes

### Test Execution Results

1. **Standalone Test Runner (`node scripts/test-pbim-dedicated-data-path.cjs`):**
   ```text
   Running PBIM Dedicated Data Path Test Suite...
   ============================================
     ✓ Test 1 PASSED: Project ID slugification verified
     ✓ Test 2 PASSED: PBIM dedicated artifact at explorer/public/pbim/explorer-data.json verified (528N / 2063E)

   Test failure: pbim must be registered in project-manifest.json
   AssertionError [ERR_ASSERTION]: pbim must be registered in project-manifest.json
       at runTests (/app/scripts/test-pbim-dedicated-data-path.cjs:40:10)
   ```
   **Defect Confirmed:** Test 3 fails because `explorer/public/project-manifest.json` only contains the `default` project (overwritten during integration test runs), whereas `scripts/test-pbim-dedicated-data-path.cjs` reads `explorer/public/project-manifest.json`.

2. **CLI Integration Test Suite (`npm run test:cli`):**
   - Executed 31 sub-suites. All 31 sub-suites passed (0 failures). Note that `test-pbim-dedicated-data-path.cjs` is NOT included in `test-cli-integration.cjs`.

3. **Frontend Vitest Suite (`cd explorer && npx vitest run src/test/pbim-dedicated-data-path.test.ts`):**
   - Attempting to run Vitest directly in `explorer/` fails with `Cannot find package 'vitest'` because `explorer/node_modules` is not populated or configured for standalone invocation without `npm ci` / root context.

---

## 6. Real-Browser Network Proof Quality Assessment

Inspected `scripts/verify-phase-comp-verify-real-browser.cjs` and captured screenshots in `audit-evidence/pbim-dedicated-data-proof/`.

### Network Proof Verification
1. **Scenario 1 (`?project=pbim`):**
   - Requested URLs: `http://localhost:3000/pbim/explorer-data.json` (HTTP 200 OK)
   - Root `/explorer-data.json` requested: `false`
   - Response Payload Project ID: `"pbim"`
   - Node Count: `528`, Edge Count: `2063`
   - Representative nodes confirmed: `LWC:vendor-assignment-panel`, `ApexClass:ApprovalFlowController`, `ApexClass:AssetDashboardController`, `ApexClass:BudgetController`
2. **Scenario 2 (Default Route `/`):**
   - Requested URL: `http://localhost:3000/explorer-data.json` (HTTP 200 OK)
   - Response Payload Project ID: `"default"`
   - Node Count: `4`, Edge Count: `3`

The browser network proof is **HIGH QUALITY and VERIFIED**.

---

## 7. Layout & Worker Evidence Assessment

In the real-browser execution against PBIM (528N / 2063E):
1. **Hierarchical Layout:** Rendered 528 nodes / 2063 edges cleanly in layered flow.
2. **Architecture Orbit Mode:** Offloaded to Web Worker (`layout.worker.ts`). Calculated radial 6-ring polar layout with 0.00000px drift.
3. **Component Constellation Mode:** Correctly filtered active focus graph (42 visible nodes, 71 visible edges). Unprojected nodes remained hidden (`display: none`).
4. **Layout Transitions:** Cycled through modes with 0 console errors and 0 uncaught exceptions.

---

## 8. Summary of Findings & Exact References

| Finding ID | Title | File & Line Reference | Severity | Summary |
| :--- | :--- | :--- | :--- | :--- |
| **FINDING-01** | Public Manifest Desynchronization | `explorer/public/project-manifest.json` L1-20 | **HIGH** | `explorer/public/project-manifest.json` lacks `pbim` entry, causing `scripts/test-pbim-dedicated-data-path.cjs` Test 3 to fail. |
| **FINDING-02** | Hardcoded PBIM Path Special-Casing | `ProjectContext.tsx` L355, `useExplorerData.ts` L23, L34, L58 | **MEDIUM** | Hardcoded `/pbim/explorer-data.json` checks bypass uniform `/projects/${id}/explorer-data.json` path structure. |
| **FINDING-03** | Artifact Duplication | `explorer/public/pbim/explorer-data.json` vs `explorer/public/projects/pbim/explorer-data.json` | **LOW** | PBIM artifact exists in both `/pbim/` and `/projects/pbim/` directories. |
| **FINDING-04** | Unmanifested ID UI Mismatch | `ProjectContext.tsx` L162-164, L647-649 | **MEDIUM** | Unknown or unmanifested project IDs set `activeProjectId` without updating `activeProject` metadata, creating UI dropdown mismatch. |

---

## 9. Final Disposition & Next Smallest Required Action

### Final Verdict
`PBIM DATA PATH WORKS — REGRESSION RISKS REMAIN`

### Justification
The core objective of Phase COMP-VERIFY is achieved: navigating to `?project=pbim` strictly fetches the 528-node PBIM dataset from `/pbim/explorer-data.json` and never silently falls back to the 4-node default dataset. However, significant regression risks remain due to manifest desynchronization (`explorer/public/project-manifest.json`), hardcoded path special-casing in frontend hooks, and UI metadata mismatch for unmanifested project IDs.

### Next Smallest Required Action
1. Synchronize `explorer/public/project-manifest.json` with root `project-manifest.json` to include the `pbim` project registration.
2. Refactor export/publishing logic so PBIM uses the standard `/projects/pbim/explorer-data.json` path (or update `project-manifest.json` generation to prevent manifest overwriting during test execution).
3. Update `ProjectContext.tsx` so unmanifested project IDs construct a synthetic `ProjectMetadata` object instead of falling back `activeProject` to `DEFAULT_PROJECT`.
