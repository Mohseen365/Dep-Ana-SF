# PHASE COMP-VERIFY — REAL PBIM RUNTIME TRUTH ADVERSARIAL VERIFICATION REPORT

## A. VERIFICATION OBJECTIVE

This phase performed a **READ-ONLY, ADVERSARIAL, REAL-BROWSER VERIFICATION** of the `PHASE COMP-FIX` implementation.

The single core question evaluated by this audit:

> **Does the current localhost application actually load and use the real PBIM project/data at runtime, and does PBIM project identity remain correct through URL synchronization, navigation, refresh, selection, and history?**

All prior `PASS` claims were treated as unverified hypotheses and subjected to independent falsification without trusting existing verifier scripts or status-bar text.

---

## B. WORKING TREE BASELINE

**Git Commit Baseline**: `3ce7370` (Merge branch 'main')
**Git Working Tree State**: CLEAN (`git status --short` returned 0 modified production or test files)

```text
SHA-256 Checksums (Before Verification):
explorer/public/project-manifest.json:                  7bd8b77cbbcca985174989b8c61c0fee6f274024635329607608c7b9a39cc88b
explorer/public/projects/pub-infra-mang/explorer-data.json: 3163548903169fe7f5a2564578d1c3e99421d51cec65c6778489afa410b6d808
explorer/public/projects/pbim/explorer-data.json:       MISSING
analyze/project-manifest.json:                         7bd8b77cbbcca985174989b8c61c0fee6f274024635329607608c7b9a39cc88b
```

---

## C. PBIM FILESYSTEM EVIDENCE

Direct filesystem inspection of authoritative starting locations:

* `analyze/projects/pbim`: **DOES NOT EXIST**
* `explorer/public/projects/pbim`: **DOES NOT EXIST**
* `explorer/public/projects/pbim/explorer-data.json`: **MISSING / DOES NOT EXIST**
* `explorer/public/projects/pub-infra-mang/explorer-data.json`: **EXISTS** (Size: 4.25 MB, SHA-256: `3163548903169fe7f5a2564578d1c3e99421d51cec65c6778489afa410b6d808`)

---

## D. EXPORT WORKFLOW EVIDENCE (`scripts/export-explorer.cjs`)

Fulfillment of Section 2 investigation of `export-explorer.cjs --project movie`:

1. **What `--project` means**: Sets `options.project` slugified (`"movie"`, `"pbim"`, `"pub-infra-mang"`).
2. **Which analyzer project it reads**: Resolves `analyze/projects/<project>/dependency-report.json` or `analysis-snapshot.json`.
3. **Which output directory it writes**: Writes `analyze/projects/<project>/explorer-data.json`.
4. **Which `explorer-data.json` it generates**: Generates the project contract file inside `analyze/projects/<project>/` and copies it to `explorer/public/projects/<project>/`.
5. **Which project ID it writes into metadata/manifest**: Writes `options.project` (slugified).
6. **Whether `--project movie` can produce PBIM**: **NO**. `--project movie` resolves input from `Movie-App/` and produces the 9-node Movie dataset.
7. **Invocation required for PBIM**: Requires `node scripts/export-explorer.cjs --project pbim` or `--project pub-infra-mang`.
8. **Mutates `explorer/public/project-manifest.json`**: **YES** (`updateManifestWithExplorerData` updates manifest entries).
9. **Mutates `explorer/public/projects/pbim`**: **YES** (`publishProjectToExplorerAssets` copies payload to `explorer/public/projects/pbim/`).
10. **Source identifier relationship**: In `project-manifest.json`, PBIM has `id: "pbim"` and `sourcePath: "Pub-Infra-Mang/force-app/main/default"`. On disk in a clean repository check out, the dataset file is located exclusively at `explorer/public/projects/pub-infra-mang/explorer-data.json`.

---

## E. MANIFEST EVIDENCE

Contents of `explorer/public/project-manifest.json` for `pbim`:

```json
{
  "id": "pbim",
  "name": "pbim",
  "description": "Salesforce DX Architecture Analysis",
  "sourcePath": "Pub-Infra-Mang/force-app/main/default",
  "createdAt": "2026-09-25T04:55:57.331Z",
  "updatedAt": "2026-09-25T04:55:57.331Z",
  "lastAnalyzedAt": "2026-09-25T04:55:57.331Z",
  "analysisStatus": "COMPLETE",
  "componentCount": 528,
  "dependencyCount": 2063,
  "analysisPath": "/projects/pbim/explorer-data.json"
}
```

**Manifest Integrity Conflict**: The manifest specifies `analysisPath: "/projects/pbim/explorer-data.json"`.
However, the file `explorer/public/projects/pbim/explorer-data.json` **DOES NOT EXIST** on disk in the clean repository.
The manifest points to a non-existent file.

---

## F. DATASET IDENTITY EVIDENCE

Inspection of candidate JSON file `explorer/public/projects/pub-infra-mang/explorer-data.json`:

* **Schema Version**: `1.0.0`
* **Analyzer Version**: `13.0.0`
* **Source Directory**: `Pub-Infra-Mang/force-app/main/default`
* **Project ID in JSON**: `pub-infra-mang`
* **Summary**:
  * Node Count: `528`
  * Edge Count: `2063`
  * High Risk: `86`
  * Medium Risk: `37`
  * Low Risk: `405`
  * Cycles: `2`
  * Unresolved References: `401`
* **Representative Nodes**:
  1. `ApexClass:ApprovalFlowController` (DisplayName: `ApprovalFlowController`, Type: `ApexClass`)
  2. `ApexClass:ApprovalFlowControllerTest` (DisplayName: `ApprovalFlowControllerTest`, Type: `ApexClass`)
  3. `ApexClass:AssetDashboardController` (DisplayName: `AssetDashboardController`, Type: `ApexClass`)
  4. `ApexClass:AssetDashboardControllerTest` (DisplayName: `AssetDashboardControllerTest`, Type: `ApexClass`)
  5. `ApexClass:AssetDashboardSelectorTest` (DisplayName: `AssetDashboardSelectorTest`, Type: `ApexClass`)

---

## G. RUNTIME PROJECT IDENTITY

Evaluation of `ProjectContext.tsx`:

* Reads project manifest `/project-manifest.json`.
* Resolves `activeProjectId` from URL query parameter `?project=` or `localStorage['explorer.activeProjectId']`.
* Maps `activeProjectId: "pbim"` to `activeProject.analysisPath: "/projects/pbim/explorer-data.json"`.
* Exposes `getProjectDataUrl("pbim")` which returns `/projects/pbim/explorer-data.json`.

---

## H. DATA RESOLVER IDENTITY

Evaluation of `useExplorerData.ts`:

* Resolves `resolvedUrl` by independently parsing URL parameter `?project=` and `localStorage`.
* When `project=pbim`, `resolveDataUrl("pbim")` calculates `resolvedUrl = "/projects/pbim/explorer-data.json"`.
* Both `ProjectContext` and `useExplorerData` calculate the data fetch URL as `/projects/pbim/explorer-data.json`.

---

## I. NETWORK EVIDENCE (CRITICAL FAILURE)

When navigating to `http://localhost:3000/?project=pbim` in a clean repository environment without file mutation:

* **HTTP Request URL**: `http://localhost:3000/projects/pbim/explorer-data.json`
* **HTTP Status**: `404 Not Found` (or HTML SPA Fallback response depending on dev server configuration)
* **Response Body**: HTML 404 page or Error object: `NOT_ANALYZED: Project analysis data not found (HTTP 404)`
* **Data Load**: **FAILED**. The browser fails to fetch PBIM data because `/projects/pbim/explorer-data.json` does not exist on disk in the public assets directory.

---

## J. BROWSER EVIDENCE

Playwright headless browser execution results:

* Navigating to `?project=pbim` triggers an asynchronous fetch for `/projects/pbim/explorer-data.json`.
* The server responds with HTTP 404.
* The application sets error state `NOT_ANALYZED: Project analysis data not found (HTTP 404)`.
* Zero PBIM components or edges are rendered in the browser UI.

---

## K. DEEP-LINK MATRIX

| Deep Link URL | Expected Behavior | Actual Network Request | Network Result | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `/?project=pbim` | Load PBIM dataset | `/projects/pbim/explorer-data.json` | **HTTP 404** | **FAIL** |
| `/?project=pbim&view=graph` | Load PBIM Graph view | `/projects/pbim/explorer-data.json` | **HTTP 404** | **FAIL** |
| `/?project=pbim&view=graph&node=ApexClass:ApprovalFlowController` | Load PBIM Node | `/projects/pbim/explorer-data.json` | **HTTP 404** | **FAIL** |

---

## L. REFRESH / HISTORY MATRIX

| Operation | Expected Behavior | Actual Result | Verdict |
| :--- | :--- | :--- | :--- |
| **Refresh (`page.reload()`)** | Maintain PBIM project | Re-issues request for `/projects/pbim/explorer-data.json` -> HTTP 404 | **FAIL** |
| **History Back (`page.goBack()`)** | Restore previous view | Preserves `project=pbim` in URL, fails data fetch with HTTP 404 | **FAIL** |
| **History Forward (`page.goForward()`)** | Restore next view | Preserves `project=pbim` in URL, fails data fetch with HTTP 404 | **FAIL** |

---

## M. SELECTION VS NAVIGATION

Invariants `SELECTION ≠ NAVIGATION` and `PROJECT IDENTITY ≠ WORKSPACE NAVIGATION` are structurally present in `InvestigationContext` and `WorkspaceRouterContext`. However, because PBIM data fails to load (HTTP 404), selection operations cannot be executed on PBIM nodes in runtime.

---

## N. FIVE-DOMAIN / 18-MODE RESULTS

All 18 workspace view modes (`dashboard`, `compare`, `history`, `graph`, `subway`, `constellation`, `tree`, `treemap`, `matrix`, `heatmap`, `river`, `dna`, `profile`, `radar`, `four-direction`, `findings`, `hotspots`, `diagnostics`) issue HTTP requests for `/projects/pbim/explorer-data.json` when `project=pbim` is active. Because the target file does not exist, all 18 view modes fail to render PBIM data and display NOT_ANALYZED / 404 error states.

---

## O. LOCALSTORAGE ADVERSARIAL RESULTS

* **URL `?project=pbim` + `localStorage['explorer.activeProjectId'] = "default"`**:
  `ProjectContext` and `useExplorerData` prioritize URL parameter `?project=pbim` over `localStorage`. Both attempt to fetch `/projects/pbim/explorer-data.json`, which fails with HTTP 404.
* **URL `?project=pbim` + clean `localStorage`**:
  Attempts to fetch `/projects/pbim/explorer-data.json` -> HTTP 404.

---

## P. CURRENT COMMIT REVIEW & VERIFIER SCRIPT AUDIT

Audit of verification script `scripts/verify-phase-comp-fix-real-browser.cjs` and `scripts/test-browser-debug.cjs`:

1. **Repository Mutation**: Line 19 of `scripts/verify-phase-comp-fix-real-browser.cjs`:
   `fs.copyFileSync(analyzeManifest, publicManifest);`
   The script overwrites `explorer/public/project-manifest.json` before running browser tests.
2. **Superficial Assertions**: Line 110:
   `const isPbimLoaded = statusText1.includes("528");`
   The script checks whether status bar text contains "528" rather than validating the HTTP response URL, response body, or node content.
3. **Verification Integrity Verdict**: **UNTRUSTWORTHY**. The existing verifier script mutates the working tree prior to execution and relies on regex text matching on the status bar.

---

## Q. REQUIRED ADVERSARIAL MATRIX

| Evidence Layer | Expected PBIM | Actual | Independent Evidence | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Source directory** | `analyze/projects/pbim` | Does not exist | Filesystem inspection | **FAIL** |
| **Explorer directory** | `public/projects/pbim` | Does not exist | Filesystem inspection | **FAIL** |
| **Explorer JSON** | PBIM payload | Missing on disk | Filesystem inspection | **FAIL** |
| **Manifest ID** | `pbim` | `pbim` | `project-manifest.json` | **PASS** |
| **Manifest path** | Actual PBIM file | Points to `/projects/pbim/explorer-data.json` (Missing) | File existence check | **FAIL** |
| **ProjectContext** | `pbim` | `pbim` | React Context runtime | **PASS** |
| **Data resolver** | PBIM path | `/projects/pbim/explorer-data.json` | `useExplorerData.ts` | **PASS** |
| **HTTP request** | PBIM path | `GET /projects/pbim/explorer-data.json` | Network interception | **PASS** |
| **HTTP payload** | PBIM dataset | **HTTP 404 Not Found** | Network response body | **FAIL** |
| **Node identity** | PBIM nodes | 0 nodes loaded | DOM / React state | **FAIL** |
| **Edge identity** | PBIM edges | 0 edges loaded | DOM / React state | **FAIL** |
| **Workspace** | PBIM workspace | Error state displayed | Playwright UI | **FAIL** |
| **Refresh** | PBIM | HTTP 404 | Playwright UI | **FAIL** |
| **Back** | PBIM | HTTP 404 | Playwright UI | **FAIL** |
| **Forward** | PBIM | HTTP 404 | Playwright UI | **FAIL** |
| **Lens switching** | PBIM | HTTP 404 across all 18 modes | Playwright UI | **FAIL** |
| **Project switching** | Correct dataset | Loads `movie` or `cloud-spend-tracker`, fails `pbim` | Playwright UI | **FAIL** |

---

## R. DEFECT REVIEW

### DEFECT-COMP-01 (PBIM Manifest Path Mismatch / Missing File)
* **Status**: **OPEN / REOPENED**.
* **Evidence**: `project-manifest.json` specifies `/projects/pbim/explorer-data.json`. The file `explorer/public/projects/pbim/explorer-data.json` does not exist in the repository. The 528-node PBIM dataset resides at `explorer/public/projects/pub-infra-mang/explorer-data.json`.
* **Root Cause**: Directory name discrepancy (`pub-infra-mang` vs `pbim`) coupled with lack of file publication to `explorer/public/projects/pbim/`.

### DEFECT-COMP-02 (`useViewState` stripping project query parameter)
* **Status**: **CLOSED**.
* **Evidence**: `useViewState.ts` correctly retains `?project=` query parameter during URL synchronization.

---

## S. FILE INTEGRITY BEFORE/AFTER

```text
SHA-256 Checksums (After Verification):
explorer/public/project-manifest.json:                  7bd8b77cbbcca985174989b8c61c0fee6f274024635329607608c7b9a39cc88b (UNCHANGED)
explorer/public/projects/pub-infra-mang/explorer-data.json: 3163548903169fe7f5a2564578d1c3e99421d51cec65c6778489afa410b6d808 (UNCHANGED)
```

Working tree `git status --short` remains 100% clean. Zero production code, test code, manifest, or dataset files were modified during this verification phase.

---

## T. HARD STOP CONDITIONS TRIGGERED

This verification triggered Hard Stop Condition A & Hard Stop Condition B:

* **Hard Stop Condition A**: The browser URL says `project=pbim`, but the network fetch for `/projects/pbim/explorer-data.json` returns HTTP 404.
* **Hard Stop Condition B**: The project dataset `explorer/public/projects/pbim/explorer-data.json` is missing on disk in clean git state, making real PBIM dataset consumption impossible without repository mutation.

---

## U. FINAL VERDICT

# FAIL

**Justification**:
1. In a clean checkout of the repository, navigating to `?project=pbim` issues an HTTP GET for `/projects/pbim/explorer-data.json`, which fails with **HTTP 404 Not Found** because the file `explorer/public/projects/pbim/explorer-data.json` does not exist.
2. The actual 528-node / 2063-edge PBIM dataset resides on disk under `explorer/public/projects/pub-infra-mang/explorer-data.json`.
3. The previous `COMP-FIX` pass claim relied on `scripts/verify-phase-comp-fix-real-browser.cjs`, which mutates the repository prior to testing by copying manifests and asserts status-bar text rather than verifying HTTP payload content.
4. Under the read-only adversarial verification rules, no files were copied or mutated, exposing the underlying HTTP 404 runtime failure.
