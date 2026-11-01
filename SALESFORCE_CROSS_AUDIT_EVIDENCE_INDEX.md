# Salesforce Cross-Audit Evidence Index
## Phase 2: Independent Cross-Report Consistency, Evidence & Completeness Audit

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY
**Authoritative Baseline Commit:** `f239696a567c85a12534bfbd393ff3cd3aa4025d`

---

## 1. Traceable Evidence Index for All Material Findings

This index links every finding, contradiction, and metric across the 8 newly produced Phase 2 audit deliverables directly to verifiable line numbers, file paths, and test cases in the authoritative repository baseline (`f239696a567c85a12534bfbd393ff3cd3aa4025d`).

| Finding / Topic | Source File & Path | Target Salesforce Reference | Target Line Range / Identifier | Evidence Type | Verification Details & Test References |
|---|---|---|---|---|---|
| **Authoritative Baseline Commit** | `.git` repository tree | Merge PR #81 | Commit `f239696a567c85a12534bfbd393ff3cd3aa4025d` | Direct Git Evidence | Tree diff against HEAD `08fc4e3a72cd693ae20cba5682078ece0f7576bd` shows zero application code changes outside `docs/.../salesforce-migration-gap-audit/`. |
| **80 Salesforce Artifacts Breakdown** | `scratch/salesforce-poc/force-app/main/default/` | Physical filesystem scan | 8 `.cls`, 12 `.js`, 8 `.html`, 7 `.css`, 45 `.xml` | Direct Source Evidence | Confirms 45 XML metadata files (56.25%) are included in the 80 count, leaving 20 executable code files. |
| **Completeness Baseline Discrepancy** | `docs/audits/salesforce-migration-gap-audit/SALESFORCE_MIGRATION_COMPLETENESS_BASELINE.md` | `SALESFORCE_FILE_BY_FILE_MIGRATION_GAP_MATRIX.csv` & `SALESFORCE_SYMBOL_LEVEL_MIGRATION_MATRIX.csv` | Report 9 Table 1 vs CSV rows | Mathematical Discrepancy | Report 9 claims 14 full files / 82 full symbols; Report 2 CSV has 1 full file; Report 3 CSV has 13 full symbols. |
| **Mounted Shell Views Bottleneck** | `explorer/src/registry/workspace-registry.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | Lines 29–31 (`const APPROVED_VIEWS = ['graph', 'matrix', 'findings'];`) | Direct Source Evidence | Hardcodes view registration strictly to 3 views. Remaining 15 registered workspace views are blocked at shell level. |
| **Mounted Views Template Wiring** | `explorer/src/components/workspace/WorkspaceShell.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html` | Lines 114–118 (`c-da-graph-viewer`), Lines 153–157 (`c-da-matrix-view`), Lines 186–190 (`c-da-findings-view`) | Direct Source Evidence | Verifies exactly 3 child views are mounted and bound to shared payload and filter criteria. |
| **Disconnected Layout Engine Algorithms** | `explorer/src/lib/layout/` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` | Lines 130–368 (`computeOrbitLayout`), Lines 369–519 (`computeConstellationLayout`), Lines 520–648 (`computeSankeyLayout`) | Source & Test Evidence | Fully ported and pass offline unit tests (`run-poc-tests.cjs:689-730`), but never imported in `daGraphViewer.js` or `daAppShell.js`. |
| **Legacy Prototype Component** | `scratch/salesforce-poc/force-app/main/default/lwc/graphViewer/graphViewer.js` | `scratch/salesforce-poc/force-app/main/default/lwc/graphViewer/graphViewer.html` | Lines 1–40 (`@api projectId = 'pbim';`) | Direct Source Evidence | Unused, unmounted POC artifact superseded by `c-da-graph-viewer`. |
| **Invariant 1: SELECTION != NAVIGATION** | `explorer/src/hooks/useGraphSelection.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` & `daGraphViewer.js` | `daAppShell.js:handleNodeSelect` (lines 140–155) | Test Evidence | Verified by Wave 4 integration test TC-28 (`node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs`). Tab does not switch on selection. |
| **Invariant 3: Strict Project-Scoped Presets** | `explorer/src/lib/url/filterQuery.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | `filterPresetsByProject` (lines 210–230) | Test Evidence | Verified by Wave 4 integration test TC-14 & TC-15. Presets belonging to other projects are filtered out at the boundary. |
| **User Preference Character Limit & Isolation** | `explorer/src/lib/projectState.ts` | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` | Lines 50–120 (`131072` character check, `WITH USER_MODE`) | Source & Test Evidence | Verified by offline unit tests and Wave 4 integration test TC-11 & TC-31. |
| **Node Annotation Persistence** | `explorer/src/components/panels/AnnotationDrawer.tsx` | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAAnnotationController.cls` | Lines 1–110 (`DA_Annotation__c`, `WITH USER_MODE`) | Source & Test Evidence | Verified by `DAAnnotationControllerTest.cls` and component integration. |
| **Wave 7 Historical Selector Prerequisite** | `explorer/src/components/AnalysisHistoryPanel.tsx` | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` | Lines 1–150 | Missing Evidence | `DAGraphController.cls` currently lacks a `@AuraEnabled` query method for `DA_Analysis_Run__c`. Identified as Wave 7 blocker. |
| **Wave 8 Dual-Payload Prerequisite** | `explorer/src/lib/compare.ts`, `graph-diff.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js` | Lines 1–250 | Missing Evidence | Loader currently only accepts single `projectId`. Must be enhanced for dual-snapshot retrieval in Wave 8. |
