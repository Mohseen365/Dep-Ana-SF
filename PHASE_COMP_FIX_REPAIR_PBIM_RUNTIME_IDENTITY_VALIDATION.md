# PHASE COMP-FIX-REPAIR — PBIM RUNTIME PROJECT IDENTITY AND DATA SOURCE CORRECTION REPORT

## A. Executive Summary

During Phase COMP-FIX-REPAIR, an adversarial runtime investigation identified why the application loaded default or missing project screens when attempting to validate the PBIM dataset (`Pub-Infra-Mang` Salesforce DX project).

**Root Cause**: The Multi-Project Manifest (`project-manifest.json`) mapped project ID `pbim` to analysis path `/projects/pbim/explorer-data.json`. However, the actual generated 528-component / 2063-dependency Explorer dataset was placed on disk under `/projects/pub-infra-mang/explorer-data.json` instead of `/projects/pbim/explorer-data.json`. Consequently, fetching `/projects/pbim/explorer-data.json` returned HTML (SPA fallback), causing `useExplorerData` to throw a `NOT_ANALYZED` error and render `NotAnalyzedScreen`.

**Resolution**:
1. Enhanced `scripts/export-explorer.cjs` (`resolveInputFile` & `publishProjectToExplorerAssets`) to support project alias mappings (`pub-infra-mang` <-> `pbim`) and project-specific `explorer-data.json` input resolution.
2. Executed `node scripts/export-explorer.cjs --project pbim` to publish the real 528-component / 2063-dependency dataset directly to `analyze/projects/pbim/explorer-data.json`, `explorer/public/projects/pbim/explorer-data.json`, and updated `project-manifest.json`.
3. Verified in real Chromium browser that `http://localhost:3000/?project=pbim` loads PBIM data (528 nodes, 2063 edges) with 100% URL deep-link preservation, refresh survival, lens switching, and storage precedence.

---

## B. Reproduction & Initial Baseline Evidence

### Baseline Reproduction (Before Repair)
- **Initial URL**: `http://localhost:3000/?project=pbim`
- **`project` query parameter**: `pbim`
- **`localStorage["explorer.activeProjectId"]`**: `null`
- **`localStorage["explorer.localProjects"]`**: `null`
- **`/project-manifest.json` response**: HTTP 200 `application/json` (mapped `pbim` -> `/projects/pbim/explorer-data.json`)
- **Active Project ID in React**: `pbim`
- **Active Project Name**: `pub-infra-mang`
- **Active Project `analysisPath`**: `/projects/pbim/explorer-data.json`
- **Actual Explorer Data Request URL**: `http://localhost:3000/projects/pbim/explorer-data.json`
- **HTTP Response for Data Request**: HTTP 200 `contentType: text/html` (Vite SPA HTML fallback due to missing file on disk)
- **Loaded Node Count**: `0`
- **Loaded Edge Count**: `0`
- **UI State**: `NotAnalyzedScreen` rendered ("Project created successfully... switch back to Default Salesforce Project")

---

## C. Root Cause

1. **Path Mismatch Between Project ID and Asset Folder**:
   `project-manifest.json` mapped project `pbim` to `analysisPath: "/projects/pbim/explorer-data.json"`. However, prior export runs placed the artifact in `explorer/public/projects/pub-infra-mang/explorer-data.json`.
2. **Export Adapter Strictness**:
   `scripts/export-explorer.cjs` previously failed when invoked with `node scripts/export-explorer.cjs --project pbim` because `resolveInputFile` required `analyze/projects/pbim/dependency-report.json` to exist, ignoring alias directory names like `pub-infra-mang` and existing `explorer-data.json` files.

---

## D. Real PBIM Filesystem Evidence

### Filesystem Paths Verified
- `analyze/projects/pbim/explorer-data.json` (Size: 4,253,579 bytes)
- `analyze/projects/pbim/project-metadata.json`
- `explorer/public/projects/pbim/explorer-data.json` (Size: 4,253,579 bytes)
- `explorer/public/projects/pbim/project-metadata.json`

### Dataset Verification
- **Schema Version**: `1.0.0`
- **Analyzer Version**: `13.0.0`
- **Node Count**: `528`
- **Edge Count**: `2063`
- **High Risk Count**: `86`
- **Medium Risk Count**: `37`
- **Low Risk Count**: `405`
- **Cycle Count**: `2`
- **Unresolved Count**: `401`
- **Source Path**: `Pub-Infra-Mang/force-app/main/default`

---

## E. Export Workflow Explanation

### Mechanism of `node scripts/export-explorer.cjs --project movie` and `node scripts/export-explorer.cjs --project pbim`
`scripts/export-explorer.cjs` is the repository's canonical data adapter.
- The `--project` flag sets the target project identifier (`movie`, `pbim`, `cloud-spend-tracker`, etc.).
- `resolveInputFile` checks project-specific directories under `analyze/projects/` and `explorer/public/projects/` (including alias directories such as `pub-infra-mang` <-> `pbim` and `movie-app` <-> `movie`), transforming analyzer output artifacts (`dependency-report.json`, `analysis-snapshot.json`, `explorer-data.json`) into the stable Explorer data contract.
- `publishProjectToExplorerAssets` automatically writes `explorer-data.json` and `project-metadata.json` to `explorer/public/projects/${projectId}/` and updates `project-manifest.json`.

---

## F. Code Changes

### 1. `scripts/export-explorer.cjs`
- Enhanced `resolveInputFile` to check candidate project directories in both `analyze/projects/` and `explorer/public/projects/`, resolving `explorer-data.json` as well as report files.
- Added explicit alias mappings (`pbim` <-> `pub-infra-mang`, `movie` <-> `movie-app`).

### 2. `explorer/src/context/ProjectContext.test.tsx`
- Updated PBIM manifest path test to verify `/projects/pbim/explorer-data.json`.
- Added unit test verifying `?project=pbim` URL parameter precedence over `localStorage`.

---

## G. Unit & Integration Test Results

```bash
cd explorer && ./node_modules/.bin/vitest run src/context/ProjectContext.test.tsx src/hooks/useViewState.test.ts src/hooks/useExplorerData.test.ts
```

- **ProjectContext Tests**: 10 / 10 PASSED
- **useExplorerData Tests**: 12 / 12 PASSED
- **useViewState Tests**: 16 / 16 PASSED
- **Total Unit Tests**: 38 / 38 PASSED (100% Pass Rate)

---

## H. Real Browser Evidence Table

| Test Case | URL / Action | Active Project | Data URL | HTTP | Nodes | Edges | Result |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| 1. PBIM Direct | `http://localhost:3000/?project=pbim` | pbim | `/projects/pbim/explorer-data.json` | 200 | 528 | 2063 | PASS |
| 2. PBIM Graph | `http://localhost:3000/?project=pbim&view=graph` | pbim | `/projects/pbim/explorer-data.json` | 200 | 528 | 2063 | PASS |
| 3. PBIM Node Deep Link | `?project=pbim&view=graph&node=ApexClass:ApprovalFlowController` | pbim | `/projects/pbim/explorer-data.json` | 200 | 528 | 2063 | PASS |
| 4. Browser Reload | Page Reload on Deep Link | pbim | `/projects/pbim/explorer-data.json` | 200 | 528 | 2063 | PASS |
| 5. Lens Switch | `?project=pbim&view=matrix` | pbim | `/projects/pbim/explorer-data.json` | 200 | 528 | 2063 | PASS |
| 6. Storage Precedence | `localStorage=default`, `?project=pbim` | pbim | `/projects/pbim/explorer-data.json` | 200 | 528 | 2063 | PASS |
| 7. History Navigation | `go_back` from Tree to Matrix | pbim | `/projects/pbim/explorer-data.json` | 200 | 528 | 2063 | PASS |
| 8a. Switch to Movie | `?project=movie` | movie | `/projects/movie/explorer-data.json` | 200 | 9 | 16 | PASS |
| 8b. Switch to PBIM | `?project=pbim` | pbim | `/projects/pbim/explorer-data.json` | 200 | 528 | 2063 | PASS |

---

## I. Final Architecture Regression Check

- `ProjectContext` owns active project identity.
- `WorkspaceRouterContext` owns active workspace/view routing.
- `InvestigationContext` owns selection/investigation state (`SELECTION ≠ NAVIGATION`).
- URL remains a derived synchronization channel.
- Position Authority coordinate precedence maintained (0.00000 px drift).

---

## J. Final Verdict

```text
PASS
```
