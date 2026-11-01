# Phase 3 Deliverable 2: Corrected Source-to-Target Inventory

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY AUDIT & VERIFICATION
**Authoritative Historical Baseline Commit:** `f239696a567c85a12534bfbd393ff3cd3aa4025d`
**Current HEAD Commit:** `ab96d16afdfee2d334c65661c34bd0e53296fcda`

---

## 1. Executive Summary & Inventory Scope

This report provides the authoritative, corrected physical and logical inventory across all three repository layers:
1. **Original React/TypeScript Application** (`explorer/src/`)
2. **Salesforce POC Implementation** (`scratch/salesforce-poc/force-app/main/default/`)
3. **Node.js Analysis Engine, Tooling, & Pipeline Adapters** (`scripts/`)

---

## 2. Layer 1: Original React Application Inventory (`explorer/src/`)

An independent scan of `explorer/src/` identifies **576 total physical files**:
- `.ts` source files: 398
- `.tsx` component files: 168
- `.css` stylesheets: 4
- `.json` static datasets: 5
- `.html` entrypoint: 1

### 2.1 Excluded Non-Production Assets (391 Files)
The following 391 files do not constitute migratable production source code:
- **Unit & Component Tests (142 files):** `*.test.ts`, `*.test.tsx`, `*.spec.ts`.
- **Test Suites, Benchmarks, & Test Drivers (96 files):** `explorer/src/test/`, benchmark drivers.
- **Mock Fixtures & Synthetic Datasets (84 files):** `fixtures/`, `__mocks__/`, and synthetic JSON files.
- **Spikes & Experimental Prototypes (42 files):** `spike/`, `prototypes/`, temporary layout experiments.
- **TypeScript Declaration Wrappers & Type Shims (27 files):** Pure `.d.ts` declaration wrappers.

### 2.2 Net Eligible Production Files: 185 Files
There are exactly **185 eligible production files**, matching `baseline_counts.json["prodExplorerFiles"]` and `SALESFORCE_FILE_BY_FILE_MIGRATION_GAP_MATRIX.csv`.
- Exported public symbols within these 185 files: **874 symbols** (documented in `extracted_symbols.json`).

---

## 3. Layer 2: Salesforce Target Implementation Inventory

The target directory `scratch/salesforce-poc/force-app/main/default/` contains **88 total physical files**.
- **Excluded Apex Test Classes & Test Metadata (8 files):**
  - `classes/tests/DAAnnotationControllerTest.cls` & `.cls-meta.xml`
  - `classes/tests/DAGraphControllerTest.cls` & `.cls-meta.xml`
  - `classes/tests/DAGraphSecurityTest.cls` & `.cls-meta.xml`
  - `classes/tests/DAUserPreferenceControllerTest.cls` & `.cls-meta.xml`

### 3.1 Decomposition of the 80 Reported Production Artifacts
Report 1 previously labeled 80 items as "production source files." Forensic decomposition reveals that platform XML metadata was conflated with executable source code:
- **Executable Apex Source (8 files):**
  - Controllers (3): `DAGraphController.cls`, `DAUserPreferenceController.cls`, `DAAnnotationController.cls`
  - Services (2): `DAGraphChunkService.cls`, `DAGraphIngestionService.cls`
  - DTOs (2): `DAGraphDTO.cls`, `DAErrorResponse.cls`
  - Legacy Prototype (1): `GraphDataController.cls`
- **Executable LWC JavaScript Modules (11 files):**
  - Core Shell & Views (5): `daAppShell.js`, `daGraphViewer.js`, `daMatrixView.js`, `daFindingsView.js`, `daPresetManager.js`
  - Utilities & Helpers (4): `daLayoutEngine.js`, `daFilterSchema.js`, `daGraphPayloadLoader.js`, `daProjectSelector.js`
  - Panels (1): `daAnnotationPanel.js`
  - Deprecated Prototype (1): `graphViewer.js` (legacy standalone viewer with hardcoded project ID)
- **Static JavaScript Libraries (1 file):**
  - `staticresources/cytoscape.js` (third-party graph visualization engine)
- **UI Presentation Templates & Stylesheets (15 files):**
  - HTML Templates (8): `daAppShell.html`, `daGraphViewer.html`, `daMatrixView.html`, `daFindingsView.html`, `daPresetManager.html`, `daProjectSelector.html`, `daAnnotationPanel.html`, `graphViewer.html`
  - CSS Stylesheets (7): `daAppShell.css`, `daGraphViewer.css`, `daMatrixView.css`, `daFindingsView.css`, `daPresetManager.css`, `daProjectSelector.css`, `daAnnotationPanel.css`
- **Salesforce Platform Metadata XML (45 files):**
  - Apex Class Metadata (`*.cls-meta.xml`): 8 files
  - LWC Component Metadata (`*.js-meta.xml`): 10 files
  - Static Resource Metadata (`*.resource-meta.xml`): 1 file
  - Custom Object Metadata (`*.object-meta.xml`): 5 objects (`DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_User_Preference__c`, `DA_Annotation__c`)
  - Custom Field Metadata (`*.field-meta.xml`): 21 custom field definitions across objects.

**Authoritative Finding:** Exactly **20 files** represent executable production source code (8 Apex + 12 JS/LWC/Static Resource).

---

## 4. Layer 3: Node.js Pipeline & Tooling Inventory (`scripts/`)

The repository contains **128 physical files** under `scripts/`. Forensic classification establishes:
1. **Production Analysis Engine & Dependency Extraction (5 files):**
   - AST parsing, import tracing, symbol resolution, and canonical graph JSON generation.
2. **Export Adapters (1 file):**
   - `export-explorer.cjs` (transforms CLI output into chunkable Salesforce ingestion payload).
3. **Pipeline Orchestration & Test Runners (59 files):**
   - Automated offline test harnesses (`run-poc-tests.cjs`, `run-wave4-integration-suite.cjs`, lane runners A-F).
4. **Verification & Forensic Analysis Utilities (24 files):**
   - Layout geometry, coordinate clearance, and headless browser validation scripts.
5. **Audit Tooling & Report Generators (37 files):**
   - Inventory cross-auditing, symbol extraction, and consistency check utilities.
6. **Benchmarks & Performance Scripts (2 files):**
   - Viewport and layout execution performance measurement scripts.

### 4.1 Boundary Classification: Retained Node.js vs. Salesforce Target
- **Intentionally Retained in Node.js:** AST parsing, file system walking, and deep static code analysis. As established in architectural invariant decisions, TypeScript AST extraction cannot execute natively in Apex due to governor limits (CPU time and heap).
- **Targeted for Salesforce UI:** Graph visualization, filtering, view layout rendering, preset management, annotations, findings review, and matrix analysis.
