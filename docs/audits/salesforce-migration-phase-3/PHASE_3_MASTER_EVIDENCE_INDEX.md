# Phase 3 Deliverable 16: Master Evidence Index

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY AUDIT & VERIFICATION

---

## 1. Executive Summary

This Master Evidence Index links every material finding, architectural claim, and classification in the Phase 3 audit to verifiable repository evidence.

### Evidence Classification Legend:
- `DIRECT_SOURCE`: Inspected directly in active repository source files.
- `EXECUTED_TEST`: Independently verified by running offline test runners during Phase 3.
- `INTEGRATION_TEST`: Verified via multi-component integration test harness.
- `STATIC_ANALYSIS`: Derived from AST metadata, JSON datasets, or schema definitions.
- `DOCUMENTATION`: Historical record from prior wave documentation packages.

---

## 2. Evidence Cross-Reference Table

| Evidence ID | Subject | Repository Location | Commit / Execution Reference | Classification | Material Finding / Invariant Proved |
|---|---|---|---|---|---|
| EVD-01 | Baseline Commit Provenance | Git commit history | Commit `f239696`, PR #82 (`08fc4e3`), PR #83 (`ab96d16`) | `DIRECT_SOURCE` | Zero production code drift between baseline and current HEAD. |
| EVD-02 | Eligible React Inventory | `explorer/src/` | 185 files cataloged in `baseline_counts.json` | `STATIC_ANALYSIS` | 185 production files; 391 excluded tests, fixtures, and mocks. |
| EVD-03 | Exported Public Symbols | `explorer/src/` | `extracted_symbols.json` (874 entries) | `STATIC_ANALYSIS` | 874 public symbols extracted across eligible production files. |
| EVD-04 | Salesforce Target Artifacts | `scratch/salesforce-poc/...` | 80 production artifacts cataloged | `DIRECT_SOURCE` | 20 executable source, 15 presentation, 45 XML metadata files. |
| EVD-05 | Node.js Pipeline Scripts | `scripts/` | 128 physical files | `DIRECT_SOURCE` | 59 test runners, 37 audit tools, 24 verifiers, 6 engine/adapters. |
| EVD-06 | `SELECTION ≠ NAVIGATION` | `daAppShell.js`, `daGraphViewer.js` | `run-poc-tests.cjs` (Category 7, TC-11) | `EXECUTED_TEST` | Invariant 1 verified: Node click does not trigger navigation. |
| EVD-07 | User Preference Isolation | `DAUserPreferenceController.cls` | `run-poc-tests.cjs` (Category 5) | `EXECUTED_TEST` | Invariant 2 verified: Queries enforce `User__c = :UserInfo.getUserId()`. |
| EVD-08 | Project Preset Isolation | `daPresetManager.js` | `run-wave4-integration-suite.cjs` (#14, #15) | `INTEGRATION_TEST`| Invariant 3 verified: DEC-W4-03 excludes foreign project presets. |
| EVD-09 | Node Position Persistence | `daGraphViewer.js` | `run-poc-tests.cjs` (Category 7, TC-12) | `EXECUTED_TEST` | Invariant 4 verified: `Positions_JSON__c` saved/restored across reload. |
| EVD-10 | Viewport Persistence | `daGraphViewer.js` | `run-poc-tests.cjs` (Category 7, TC-13) | `EXECUTED_TEST` | Invariant 5 verified: `Zoom_Pan_JSON__c` preserved. |
| EVD-11 | Annotations Resilience | `daAnnotationPanel.js` | `run-lane-d-graph-filter-tests.cjs` (#13) | `EXECUTED_TEST` | Invariant 6 verified: Annotations survive graph layout reload. |
| EVD-12 | Cytoscape Teardown | `daGraphViewer.js` | `run-poc-tests.cjs` (Category 4, Category 7 TC-08) | `EXECUTED_TEST` | Invariant 7 verified: Cytoscape cleanly destroyed on disconnect. |
| EVD-13 | Stale Request Protection | `daAppShell.js`, `daGraphViewer.js` | `run-wave4-integration-suite.cjs` (#5) | `INTEGRATION_TEST`| Invariant 8 verified: Outdated async chunk queries discarded. |
| EVD-14 | Chunk Boundary & Surrogates | `DAGraphChunkService.cls` | `run-poc-tests.cjs` (Category 4) | `EXECUTED_TEST` | Invariant 9 verified: 131,072 boundary; surrogate pairs preserved. |
| EVD-15 | Shared Payload Immutability | `daAppShell.js`, `daFilterSchema.js` | `run-wave4-integration-suite.cjs` (#1, #2, #4) | `INTEGRATION_TEST`| Invariant 10 verified: Payload shared with Matrix and Findings. |
| EVD-16 | Ported Layout Algorithms | `daLayoutEngine.js` | `run-poc-tests.cjs` (Category 6) | `EXECUTED_TEST` | 4 algorithms verified: architecture, orbit, constellation, sankey. |
| EVD-17 | Missing Apex Endpoint | `DAGraphController.cls` | Source inspection of lines 1-150 | `DIRECT_SOURCE` | Proves absence of `getAnalysisRuns(Id projectId)` query selector. |
