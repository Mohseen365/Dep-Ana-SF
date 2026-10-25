# Phase D.4-D — PBIM Data Authority, Runtime Endpoint, and Graph Count Reconciliation Report

## Executive Summary

This investigation completes the verification and count reconciliation of the PBIM (Public Infrastructure Management) Salesforce DX dataset across storage artifacts, network runtime endpoints, fallback boundaries, and multi-stage graph pipeline projections.

The authority decision designating `explorer/public/projects/pbim/explorer-data.json` as authoritative is preserved. All 3 dataset copies in the repository were verified to be byte-identical. Explicit URL endpoint resolution (`/pbim/explorer-data.json`) and project isolation guarantees were confirmed, proving that a failed PBIM data fetch cannot silently present default project data (`/explorer-data.json`) as PBIM. Furthermore, the reported graph count transitions—**528 / 2,063**, **42 / 71**, and **312 / 421**—were reconciled across distinct stages of the architecture graph pipeline.

---

## 1. File Verification, Hash Integrity, and Dual-Copy Analysis

All three PBIM dataset copies across public and analysis directories were independently inspected and hashed using SHA-256:

| File Path | Byte Size | SHA-256 Digest | Node Count | Edge Count | Role / Authority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `explorer/public/projects/pbim/explorer-data.json` | 4,253,560 | `395c23bd4b1dcd7bca6747010987f234083a3e83ab7f457fb9c41cdf042b013d` | 528 | 2,063 | **Primary Authoritative Copy** |
| `explorer/public/pbim/explorer-data.json` | 4,253,560 | `395c23bd4b1dcd7bca6747010987f234083a3e83ab7f457fb9c41cdf042b013d` | 528 | 2,063 | **Secondary Compatibility Copy** |
| `analyze/projects/pbim/explorer-data.json` | 4,253,560 | `395c23bd4b1dcd7bca6747010987f234083a3e83ab7f457fb9c41cdf042b013d` | 528 | 2,063 | Raw Analysis Generation Target |

### Findings & Secondary Copy Disposition
- Both `explorer/public/projects/pbim/explorer-data.json` and `explorer/public/pbim/explorer-data.json` are **byte-identical** (100% hash parity).
- **Secondary Copy Assessment**: `explorer/public/pbim/explorer-data.json` is published directly by `scripts/export-explorer.cjs` alongside `explorer/public/projects/pbim/explorer-data.json` during analysis export.
- **Disposition**: The secondary copy must **NOT** be deleted. It serves as the primary HTTP endpoint `/pbim/explorer-data.json` registered in `explorer/public/project-manifest.json` and requested by client routing. `scripts/export-explorer.cjs` synchronously updates both copies to ensure complete byte parity.

---

## 2. Runtime Endpoint Resolution & Public Path Mapping

The endpoint resolution path was traced through client context hooks and server routing:

1. **Manifest Registration (`explorer/public/project-manifest.json`)**:
   ```json
   {
     "id": "pbim",
     "name": "PBIM",
     "analysisPath": "/pbim/explorer-data.json",
     "componentCount": 528,
     "dependencyCount": 2063
   }
   ```
2. **Project Context (`explorer/src/context/ProjectContext.tsx`)**:
   - On application startup or project switch, `refreshProjects()` reads `/project-manifest.json` and populates `analysisPath` as `/pbim/explorer-data.json`.
   - `getProjectDataUrl('pbim')` returns `proj.analysisPath` (`/pbim/explorer-data.json`).
3. **Data Hook (`explorer/src/hooks/useExplorerData.ts`)**:
   - `resolveDataUrl('pbim')` explicitly maps `slugId === 'pbim'` to `/pbim/explorer-data.json`.
4. **Vite Public Directory Mapping**:
   - Vite serves files located under `explorer/public/` directly at the application root URL (`http://localhost:3000/`).
   - Consequently, both `/pbim/explorer-data.json` and `/projects/pbim/explorer-data.json` are valid HTTP endpoints, with `/pbim/explorer-data.json` acting as the canonical contract path.

---

## 3. Fallback Behavior & Data Identity Protection

An adversarial audit of error states and fallback handling in `useExplorerData.ts`, `ProjectContext.tsx`, and `App.tsx` confirmed strict identity protection:

- **Unmanifested / Custom Project Handling**: If an unmanifested project ID (or `pbim` before manifest load) is selected via URL (`?project=pbim`), `ProjectContext.tsx` creates a custom project entry matching `id: 'pbim'` rather than collapsing to `DEFAULT_PROJECT` (`'default'`).
- **HTTP 404 / Non-JSON / HTML SPA Fallbacks**: When fetching non-default project endpoints like `/pbim/explorer-data.json`, `useExplorerData.ts` checks HTTP status and content type. If the fetch returns a non-200 response or HTML SPA fallback, `useExplorerData` throws an error starting with `NOT_ANALYZED:`.
- **UI Screen Protection**: In `App.tsx`, `isNotAnalyzed` evaluates to `true` on `NOT_ANALYZED:` errors. The UI renders `<NotAnalyzedScreen project={activeProject} />` or `<ErrorScreen />`.
- **Verdict**: Failed or missing PBIM data fetches **CANNOT** silently present `default` package data (`/explorer-data.json`, 4 nodes / 3 edges) or any other project's graph data. Project isolation is strictly enforced.

---

## 4. Pipeline Count Reconciliation (528/2063 vs 42/71 vs 312/421)

The reported node and edge count discrepancies represent different stages and projection lenses within the architecture graph pipeline rather than data corruption or inconsistencies:

```
[ Stage 1: Full Model ] ──► (528 Nodes / 2063 Edges) ── Raw Analysis & Full Schema Parse
        │
        ├──► [ Stage 2: Constellation Lens ] ──► (42 Nodes / 71 Edges)  ── Macro Lens: 14 Suns + 28 Satellites
        │
        └──► [ Stage 3: Orbit BFS Lens ]    ──► (312 Nodes / 421 Edges) ── Focal BFS Projection (e.g. LWC:vendor-assignment-panel)
```

### Stage 1: Source Raw File & Parsed Data Model
- **Counts**: **528 Nodes, 2,063 Edges**
- **Definition**: Complete Salesforce DX package graph parsed directly from `Pub-Infra-Mang/force-app/main/default`.
- **Node Breakdown by Type**:
  - `ApexClass`: 181
  - `CustomField`: 180
  - `External`: 99
  - `LWC`: 30
  - `ApexTrigger`: 13
  - `CustomObject`: 25
  - **Total**: 528 Nodes
- **Summary Inventory**:
  - 795 Files, 181 Apex Classes, 13 Apex Triggers, 30 LWC JS, 30 LWC HTML, 25 Objects, 180 Fields.

### Stage 2: Component Constellation Macro Projection Lens
- **Counts**: **42 Nodes, 71 Edges**
- **Definition**: The Constellation Architecture View (`adaptComponentConstellation`) computes a macro-level system view.
- **Mechanism**:
  - Identifies 14 primary focal "Suns" (LWCs with `componentCount > 0` or key shared relationships).
  - Includes 28 connected satellite components (shared dependencies and inter-LWC bridges).
  - Filters out unprojected standalone nodes and deep internal fields.
  - Verified in `static-constellation-projection.test.ts` (42 nodes, 71 edges).

### Stage 3: Architecture Orbit Focal BFS Projection Lens
- **Counts**: **312 Nodes, 421 Edges** (Focal Sun: `LWC:vendor-assignment-panel` at bounded depth)
- **Definition**: The Architecture Orbit View (`adaptComponentOrbit`) generates a bounded multi-ring radial projection around an active focal LWC Sun node.
- **Mechanism**:
  - Traverses outgoing and incoming dependency paths using Breadth-First Search (BFS) up to a bounded depth (e.g., depth $k \le 4$).
  - For major LWC Suns like `LWC:vendor-assignment-panel`, BFS depth traversal isolates 312 connected components and 421 active relationships from the total 528-node graph.

---

## 5. Verification & Test Execution Results

1. **PBIM Dedicated Data Path Suite**:
   ```bash
   node scripts/test-pbim-dedicated-data-path.cjs
   ```
   **Output**:
   ```
   Running PBIM Dedicated Data Path Test Suite...
   ============================================
     ✓ Test 1 PASSED: Project ID slugification verified
     ✓ Test 2 PASSED: PBIM dedicated artifact at explorer/public/pbim/explorer-data.json verified (528N / 2063E)
     ✓ Test 3 PASSED: project-manifest.json registration and analysisPath contract verified
     ✓ Test 4 PASSED: Exporter output path and analysisPath contract agree on /pbim/explorer-data.json
     ✓ Test 5 PASSED: Root default file /explorer-data.json is strictly distinct from PBIM artifact
     ✓ Test 6 PASSED: Manifest synchronization verified across public, analyze, and root manifests
   ============================================
   ALL 6 PBIM DEDICATED DATA PATH TESTS PASSED!
   ```

2. **Master Integration CLI Suite**:
   ```bash
   npm run test:cli
   ```
   **Output**: 31/31 integration scripts passed (184 assertions, exit code 0).

---

## 6. Blockers & Outstanding Risks

- **Blockers**: None.
- **Risks & Mitigation**:
  - *Manifest Desynchronization*: If custom export tools bypass `scripts/export-explorer.cjs`, `explorer/public/project-manifest.json` could lose the `pbim` entry. Automated by `scripts/test-pbim-dedicated-data-path.cjs` in CI.
  - *Secondary Copy Drifts*: `scripts/export-explorer.cjs` enforces dual publication to both `/pbim/` and `/projects/pbim/`, guaranteeing byte-identical synchronization.

---

## Conclusion & Verdict

**VERDICT: PASS — DATA AUTHORITY & PIPELINE COUNTS FULLY RECONCILED**

1. Authoritative copy `explorer/public/projects/pbim/explorer-data.json` is preserved.
2. Endpoint `/pbim/explorer-data.json` correctly resolves PBIM dataset without silent default fallbacks.
3. Graph counts 528/2063, 42/71, and 312/421 represent verified pipeline stages (Full Model, Constellation Macro Projection, Orbit BFS Focal Projection).
