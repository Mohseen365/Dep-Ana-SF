# Phase A3 Source Evidence Index

## 1. Scope & Traceability Overview
This document catalogs every repository source file, Apex class, Lightning Web Component, schema definition, and baseline test runner consulted during Phase A3 contract finalization. Every contract decision is anchored to tangible repository evidence.

---

## 2. Upstream Architecture & Registers
- **`WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv`**:
  - Authoritative register governing all 21 tasks across Waves 5–9 (`W5-1..6`, `W6-1..4`, `W7-P1`, `W7-1..3`, `W8-1..3`, `W9-1..3`, `INT-1`).
  - Anchors task titles, exact permitted paths, and dependencies for W5-5, W5-6, and W7-P1.
- **`WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv`**:
  - Authoritative 175-path manifest (99 existing on disk, 76 planned new).
  - Confirms exclusive ownership tiers and resolves protected path counts.
- **`docs/audits/salesforce-parallel-migration/phase-0/WAVE_0_SHARED_ARCHITECTURAL_CONTRACTS.md`**:
  - Foundational architectural contracts: W0-C1 (Graph Data Model), W0-C2 (`SELECTION != NAVIGATION`), W0-C3 (Filter Schema), W0-C4 (View Registration), W0-C5 (Analysis Runs), W0-C7 (Diff Engine), W0-C8 (Simulation Isolation).

---

## 3. Original Dependency Analyzer Evidence (React Explorer)
- **`explorer/src/lib/adapters/radar-adapter.ts`**:
  - Lines 1–45: `RadarDimension`, `RadarSummary`, `MissingPrimitiveInfo`, `RadarData` interfaces.
  - Lines 46–170: `adaptRadarDimensions(input)` function computing the 9 authoritative dimensions.
  - Lines 171–195: Explicit cataloging of the 3 missing primitives (`Layer Purity Score`, `Dependency Health Index`, `Test Coverage Score`).
- **`explorer/src/components/RadarPanel.tsx`**:
  - Lines 15–45: `getVisualNormalizedValue(dim, summary)` presentation-scaling function bounding heterogeneous metrics into `[0, 1]`.
  - Lines 60–120: SVG radial geometry calculations, axis endpoints, and polygon vertex mapping.
- **`explorer/src/registry/workspace-registry.ts`**:
  - Catalogs original 18 workspace views (12 lenses, 6 surfaces).

---

## 4. Salesforce POC Baseline Implementation & Metadata
- **`scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`**:
  - Lines 77–78: `@api activeProjectId`, `@api activeProjectKey`.
  - Lines 163–183: `handleNodeSelect(event)` handling inbound `nodeselect` CustomEvent.
  - Lines 250–320: View switching, project state, and filter coordination.
- **`scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html`**:
  - Template definitions and conditional view rendering tags for approved views.
- **`scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js`**:
  - Canonical V2 filter criteria and `matchesNodeFilter(node, criteria)` predicate logic.
- **`scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`**:
  - Implemented algorithmic layout functions: `computeArchitectureLayout`, `computeOrbitLayout`, `computeConstellationLayout`, `computeSankeyLayout`.
- **`scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`**:
  - Cytoscape canvas integration, layout switcher bindings, and `nodeselect` dispatching.
- **`scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`**:
  - Authoritative Apex endpoints: `getProjects`, `getLatestGraphMetadataForProject`, `getGraphChunks`.
  - Enforces `with sharing` and `WITH USER_MODE`.
- **`scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/`**:
  - Metadata verification confirms that `DA_Analysis_Run__c` possesses only `DA_Project__c` lookup field. Unapproved fields (`Status__c`, `Metrics_JSON__c`, `DNA_Barcode__c`) do not exist.

---

## 5. Frozen Offline Test Suite Baseline
Verified clean execution across all 9 offline suites (187 test cases total):
1. `scratch/salesforce-poc/tests/run-poc-tests.cjs` (43 tests)
2. `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` (32 tests)
3. `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` (9 tests)
4. `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` (10 tests)
5. `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` (15 tests)
6. `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` (11 tests)
7. `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` (12 tests)
8. `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` (33 tests)
9. `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` (22 tests)
