# Report 10: Salesforce Migration Audit Evidence Index

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** Read-Only Audit

---

## 1. Index of Audit Findings to Source Code Evidence

| Finding / Gap Area | Original Source Reference | Target Salesforce Reference | Target Line Range / Symbol | Classification | Evidence & Verification Notes |
|---|---|---|---|---|---|
| **Hierarchical Layout Engine** | `explorer/src/lib/layout/layered-architecture.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` | Lines 20–129 (`computeArchitectureLayout`) | `FULLY_MIGRATED` | Imported by `daGraphViewer.js:1` and called during graph initialization. Offline tests pass in `run-poc-tests.cjs:680`. |
| **Orbit Radial Layout** | `explorer/src/lib/layout/orbit.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` | Lines 130–368 (`computeOrbitLayout`) | `PORTED_NOT_INTEGRATED` | Exported by `daLayoutEngine.js`, verified in offline tests (`run-poc-tests.cjs:689`), but never imported or invoked in any LWC UI. |
| **Constellation Polar Layout** | `explorer/src/lib/layout/constellation.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` | Lines 369–519 (`computeConstellationLayout`) | `PORTED_NOT_INTEGRATED` | Exported by `daLayoutEngine.js`, verified in offline tests (`run-poc-tests.cjs:708`), but no Constellation LWC view exists. |
| **Sankey River Flow Layout** | `explorer/src/lib/layout/sankey.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` | Lines 520–648 (`computeSankeyLayout`) | `PORTED_NOT_INTEGRATED` | Exported by `daLayoutEngine.js`, verified in offline tests (`run-poc-tests.cjs:730`), but no River LWC view exists. |
| **Graph View Canvas** | `explorer/src/components/GraphCanvas.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | Lines 1–350 (`DaGraphViewer`) | `PARTIALLY_MIGRATED` | Basic Cytoscape rendering and single selection work. Omits focus controls, impact analysis, dynamic edge bezier curves, and hover cards. |
| **Dependency Matrix View** | `explorer/src/components/FeatureMatrixPanel.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixView/daMatrixView.js` | Lines 1–400 (`DaMatrixView`) | `PARTIALLY_MIGRATED` | Grid rendering and canonical filter criteria binding work. Omits anchor jumps and coupling metric sorting. |
| **Findings View** | `explorer/src/components/findings/FindingsPanel.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsView/daFindingsView.js` | Lines 1–380 (`DaFindingsView`) | `PARTIALLY_MIGRATED` | Derives 3 core finding categories client-side from graph payload. Lacks AST rule classes and investigation workbench handoff. |
| **Preset & Filter Management** | `explorer/src/lib/url/filterQuery.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js` | Lines 1–450 (`DaPresetManager`) | `FULLY_MIGRATED` | Full V2 filter container management, project scoping, and criteria dispatch. Verified in `run-lane-c-preset-manager-tests.cjs`. |
| **User Preference Persistence** | `explorer/src/lib/projectState.ts` | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` | Lines 1–280 | `FULLY_MIGRATED` | Atomically persists V2 container, enforces 131,072 character limit, preserves `Positions_JSON__c` and `Zoom_Pan_JSON__c`. |
| **Project Selector** | `explorer/src/components/ProjectDropdown.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/daProjectSelector.js` | Lines 1–120 (`DaProjectSelector`) | `FULLY_MIGRATED` | Project dropdown selector integrated in shell header. |
| **Node Annotation Panel** | `explorer/src/components/panels/AnnotationDrawer.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daAnnotationPanel/daAnnotationPanel.js` | Lines 1–200 (`DaAnnotationPanel`) | `FULLY_MIGRATED` | CRUD annotation notes associated with nodes on `DA_Annotation__c`. |
| **Shell Navigation & Invariant** | `explorer/src/components/workspace/WorkspaceShell.tsx` | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | Lines 30–80 (`APPROVED_VIEWS`) | `PARTIALLY_MIGRATED` | Enforces `SELECTION != NAVIGATION`, but restricts `APPROVED_VIEWS` strictly to `['graph', 'matrix', 'findings']`. |
