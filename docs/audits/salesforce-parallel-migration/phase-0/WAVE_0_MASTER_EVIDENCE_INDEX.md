# Wave 0: Master Evidence Index

**Status:** APPROVED AUDIT EVIDENCE LEDGER
**Coordinator:** Independent Quality Gate Owner

---

## 1. Traceability Ledger

Every factual statement and architectural requirement in the Wave 0 coordination package is anchored to verified physical files, commit hashes, or test executions.

| Evidence ID | Category | Repository Path / Reference | Commit / Line / Detail | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **EVD-01** | Git Provenance | Repository Root `/app` | Commit `42f39a26977387e80d7a719a8329b23854cad662` | Verified Fact |
| **EVD-02** | Git Provenance | Git Branch `jules-17480803246055796124-bbdb1ba1` | Clean working tree | Verified Fact |
| **EVD-03** | Test Execution | `scratch/salesforce-poc/tests/run-poc-tests.cjs` | 43 passed, 0 failed | Live Test Evidence |
| **EVD-04** | Test Execution | `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | 32 passed, 0 failed | Live Test Evidence |
| **EVD-05** | Test Execution | `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | 9 passed, 0 failed | Live Test Evidence |
| **EVD-06** | Test Execution | `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs`| 10 passed, 0 failed | Live Test Evidence |
| **EVD-07** | Test Execution | `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | 15 passed, 0 failed | Live Test Evidence |
| **EVD-08** | Test Execution | `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | 11 passed, 0 failed | Live Test Evidence |
| **EVD-09** | Test Execution | `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | 12 passed, 0 failed | Live Test Evidence |
| **EVD-10** | Test Execution | `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 33 passed, 0 failed | Live Test Evidence |
| **EVD-11** | Test Execution | `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 22 passed, 0 failed | Live Test Evidence |
| **EVD-12** | Source Contract | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` | Lines 1–170 (`WITH USER_MODE`, chunks, missing `getAnalysisRuns`) | Verified Fact |
| **EVD-13** | Source Contract | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js` | Lines 1–120 (Canonical V2 schema, high coupling predicate) | Verified Fact |
| **EVD-14** | Source Contract | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` | Lines 1–350 (Architecture, Orbit, Constellation, Sankey algorithms) | Verified Fact |
| **EVD-15** | Source Contract | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | Lines 1–480 (Cytoscape integration, manual position handling) | Verified Fact |
| **EVD-16** | React Reference | `explorer/src/components/ViewModeSwitcher.tsx` | View mode switching React pattern | Historical Source |
| **EVD-17** | React Reference | `explorer/src/components/RadarPanel.tsx` | Radar analytical view React pattern | Historical Source |
| **EVD-18** | React Reference | `explorer/src/components/ArchitectureTreemapPanel.tsx` | Treemap view React pattern | Historical Source |
| **EVD-19** | React Reference | `explorer/src/components/SubwayPanel.tsx` | Subway map view React pattern | Historical Source |
| **EVD-20** | React Reference | `explorer/src/components/HotspotPanel.tsx` | Hotspot panel React pattern | Historical Source |
| **EVD-21** | React Reference | `explorer/src/components/DiagnosticsPanel.tsx` | System diagnostics React pattern | Historical Source |
| **EVD-22** | React Reference | `explorer/src/components/ArchitectureDNABarcode.tsx` | Architecture DNA barcode React pattern | Historical Source |
| **EVD-23** | React Reference | `explorer/src/components/AnalysisHistoryPanel.tsx` | Analysis history panel React pattern | Historical Source |
| **EVD-24** | React Reference | `explorer/src/components/InvestigationDrawer.tsx` | Investigation drawer React pattern | Historical Source |
| **EVD-25** | React Reference | `explorer/src/lib/graph-diff.ts` | Graph diffing calculation engine | Historical Source |
| **EVD-26** | React Reference | `explorer/src/lib/refactoring-simulation.ts` | Refactoring simulation engine | Historical Source |
| **EVD-27** | React Reference | `explorer/src/components/RefactorHandoffModal.tsx` | Proposal handoff export React modal | Historical Source |
| **EVD-28** | Phase 3 Audit | `docs/audits/salesforce-migration-phase-3/` | 17 Phase 3 authoritative reports present | Verified Fact |
