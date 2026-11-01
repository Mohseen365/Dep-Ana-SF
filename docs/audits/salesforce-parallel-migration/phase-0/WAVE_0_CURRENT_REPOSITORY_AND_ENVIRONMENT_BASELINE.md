# Wave 0: Current Repository and Environment Baseline

**Status:** APPROVED & AUDITED
**Audit Date:** November 2026
**Auditor / Coordinator:** Principal Migration Architect & Independent Quality Gate Owner
**Target Architecture:** Salesforce Platform (Lightning Web Components, Apex, Platform Metadata)
**Historical Provenance:** Phase 3 Migration Baseline (Commit `42f39a26977387e80d7a719a8329b23854cad662`)

---

## 1. Executive Summary

This report establishes the authoritative baseline of the repository state, working tree, and execution environment prior to authorizing concurrent workstreams for Waves 5 through 9.

All baseline findings have been independently verified against the physical filesystem, Git history, package manifests, and offline test execution runners. No assumed or historical states are accepted without live confirmation.

---

## 2. Git Repository & Working Tree State

| Property | Value | Evidence / Command | Status |
| :--- | :--- | :--- | :--- |
| **Repository Path** | `/app` | `pwd` | Verified |
| **Current Branch** | `jules-17480803246055796124-bbdb1ba1` | `git branch --show-current` | Verified Active Branch |
| **Current HEAD Commit** | `42f39a26977387e80d7a719a8329b23854cad662` | `git rev-parse HEAD` | Verified Authoritative Merge |
| **Parent Commit** | Merge PR #84 (incorporating Phase 3 baseline) | `git log -n 1 --oneline` | Verified |
| **Working Tree Status** | Clean (`nothing to commit, working tree clean`) | `git status --porcelain` | Verified Clean |
| **Shallow Repository** | `true` | `git rev-parse --is-shallow-repository` | Verified Shallow Clone |
| **Uncommitted Changes**| None | `git status` | Clean Baseline |

### Historical Commit & Audit Provenance Reconciliation
- **Historical Baseline Commit:** `f239696a567c85a12534bfbd393ff3cd3aa4025d` (Wave 1/2 inception)
- **Phase 2 Baseline Commit:** `08fc4e3a72cd693ae20cba5682078ece0f7576bd`
- **Phase 3 Branch HEAD:** `ab96d16afdfee2d334c65661c34bd0e53296fcda` (Merged via PR #84)
- **Current Active HEAD:** `42f39a26977387e80d7a719a8329b23854cad662` (incorporating full Phase 3 audit reports and deliverables)

---

## 3. Physical Source Inventory & Component Status

### 3.1 Salesforce POC LWC Components (`scratch/salesforce-poc/force-app/main/default/lwc/`)

| LWC Component | Files Present | Target Status | Role & Baseline Invariants |
| :--- | :--- | :--- | :--- |
| `daAppShell` | `.js`, `.html`, `.css`, `.js-meta.xml`, `daFilterSchema.js` | Complete (v2.0) | Top-level application container; manages project context, active view, and persistence. Enforces `SELECTION ≠ NAVIGATION`. |
| `daGraphViewer` | `.js`, `.html`, `.css`, `.js-meta.xml` | Complete (v1.4) | Primary graph visualization component using Cytoscape.js; supports interactive nodes/edges, positions persistence, and filtering. |
| `daLayoutEngine` | `.js`, `.js-meta.xml` | Complete (v1.2) | Reusable layout calculation engine. Computes Architecture, Orbit, Constellation, and Sankey layouts. |
| `daGraphPayloadLoader`| `.js`, `.js-meta.xml` | Complete (v1.0) | Chunk reassembly, bounded pagination, surrogate-pair boundary safety, and payload validation. |
| `daPresetManager` | `.js`, `.html`, `.css`, `.js-meta.xml` | Complete (v1.0) | Project-scoped filter preset management and persistence. |
| `daMatrixView` | `.js`, `.html`, `.css`, `.js-meta.xml` | Complete (v1.0) | Dependency matrix analytical view (source-to-target dependency counts and filtering). |
| `daFindingsView` | `.js`, `.html`, `.css`, `.js-meta.xml` | Complete (v1.0) | Architectural findings view (circular dependencies, hotspots, untested risk, unresolved refs). |
| `daProjectSelector` | `.js`, `.html`, `.css`, `.js-meta.xml` | Complete (v1.0) | Project selection dropdown wired to `DAGraphController.getProjects`. |
| `daAnnotationPanel` | `.js`, `.html`, `.css`, `.js-meta.xml` | Complete (v1.0) | Node annotation panel scoped to active project and selected node. |
| `graphViewer` | `.js`, `.html`, `.js-meta.xml` | Deprecated (v0.1) | Legacy proof-of-concept viewer; superseded by `daGraphViewer`. Retained for regression safety. |

### 3.2 Apex Classes & Controllers (`scratch/salesforce-poc/force-app/main/default/classes/`)

| Apex Class | Category | Target Status | Security & Governance |
| :--- | :--- | :--- | :--- |
| `DAGraphController.cls` | Controller | Active | `WITH USER_MODE`, `@AuraEnabled(cacheable=true)`. Provides `getProjects`, `getLatestGraphMetadataForProject`, `getGraphChunks`. Missing `getAnalysisRuns`. |
| `DAUserPreferenceController.cls` | Controller | Active | `WITH USER_MODE`. Manages `DA_User_Preference__c` (Positions, Filters V2, Zoom/Pan). 131,072-char boundary enforcement. |
| `DAAnnotationController.cls` | Controller | Active | `WITH USER_MODE`. CRUD for `DA_Annotation__c` with project and node scoping. |
| `DAGraphChunkService.cls` | Service | Active | Chunk verification, surrogate pair safety, and reassembly validation. |
| `DAGraphIngestionService.cls` | Service | Active | Ingestion and bounded chunk storage service. |
| `GraphDataController.cls` | Controller | Deprecated | Legacy controller; superseded by `DAGraphController`. |
| `DAGraphDTO.cls` | DTO | Active | Data transfer object for graph metadata and chunks. |
| `DAErrorResponse.cls` | DTO | Active | Standardized error payload structure. |
| `DAGraphControllerTest.cls` | Test | Active | Unit tests for `DAGraphController`. |
| `DAUserPreferenceControllerTest.cls` | Test | Active | Unit tests for `DAUserPreferenceController`. |
| `DAAnnotationControllerTest.cls` | Test | Active | Unit tests for `DAAnnotationController`. |
| `DAGraphSecurityTest.cls` | Test | Active | Security tests for user isolation and CRUD/FLS permissions. |

### 3.3 Salesforce Custom Objects & Fields (`scratch/salesforce-poc/force-app/main/default/objects/`)

1. `DA_Project__c` (Fields: `Project_Key__c`, `Name`)
2. `DA_Analysis_Run__c` (Fields: `DA_Project__c`, `Status__c`, `Analysis_Timestamp__c`, `Metrics_JSON__c`, `DNA_Barcode__c`)
3. `DA_Graph_Chunk__c` (Fields: `DA_Analysis_Run__c`, `Chunk_Index__c`, `Payload_Data__c`)
4. `DA_User_Preference__c` (Fields: `DA_Project__c`, `User__c`, `Filters_JSON__c`, `Positions_JSON__c`, `Zoom_Pan_JSON__c`, `Active_View__c`, `Layout_Mode__c`)
5. `DA_Annotation__c` (Fields: `DA_Project__c`, `Node_Id__c`, `Body__c`, `Status__c`, `Resolved_At__c`)
6. `DA_Finding__c` (Fields: `DA_Analysis_Run__c`, `Rule_Id__c`, `Severity__c`, `Node_Id__c`, `Details_JSON__c`)

---

## 4. Environment & Toolchain Baseline

| Component | Tool / Runtime | Installed Version | Status | Execution Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | Node Runtime | `v22.22.1` | Available | Fully Verified |
| **npm** | Package Manager | `11.11.0` | Available | Fully Verified |
| **npx** | Binary Runner | `/home/jules/.nvm/versions/node/v22.22.1/bin/npx` | Available | Fully Verified |
| **Salesforce CLI** | `sf` | Not Installed (`which sf` returned 1) | Missing (Expected in offline container) | Offline Mock Harness Mode Active |
| **LWC Jest Tooling**| `@salesforce/sfdx-lwc-jest` | Not in root `node_modules` | Offline Harness Mode Active | Replaced by Node.js synthetic DOM harness |
| **Vite / Vitest** | React Explorer Tools | Explorer local (`explorer/node_modules`) | Available in `explorer/` | Verified |
| **Playwright** | E2E Browser Testing | Binaries in cache / scripts | Available in `scripts/` | Real browser verification harness |

---

## 5. Offline Test Runner Inventory & Baseline Results

All 9 offline verification suites execute successfully with 100% pass rate:

1. `scratch/salesforce-poc/tests/run-poc-tests.cjs` — **43 Tests Passed, 0 Failed**
2. `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` — **32 Tests Passed, 0 Failed**
3. `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` — **9 Tests Passed, 0 Failed**
4. `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` — **10 Tests Passed, 0 Failed**
5. `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` — **15 Tests Passed, 0 Failed**
6. `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` — **11 Tests Passed, 0 Failed**
7. `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` — **12 Tests Passed, 0 Failed**
8. `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` — **33 Tests Passed, 0 Failed**
9. `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` — **22 Tests Passed, 0 Failed**

**Total Baseline Offline Test Executions:** **187 Passed, 0 Failed, 0 Flaky**.

---

## 6. Implementation Changes Since Phase 3

A complete audit of `git diff --stat` and commit history demonstrates:
1. All Phase 3 deliverables and inventory reports are present and unmodified in `docs/audits/salesforce-migration-phase-3/`.
2. No functional modifications to LWC components, Apex classes, or Salesforce metadata have occurred between Phase 3 sign-off and current HEAD.
3. The codebase represents a clean, stable foundation ready for Wave 0 coordination.
