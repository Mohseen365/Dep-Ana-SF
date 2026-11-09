# B3 — Architectural Feature Dependency Map

**Document Role:** Architectural Dependency and Contract Flow Analysis
**Auditor:** Agent B3 (Feature Parity and Migration Gap Auditor)
**Governance Baseline:** DEC-04 Alternative 4 (Executive Project Owner Exclusive Signoff)
**Execution Mode:** READ-ONLY

---

## 1. Architectural Overview & Tiered Hierarchy

The Salesforce React-to-LWC migration architecture is organized into strict dependency tiers (P0 through P5). Under governance rules, components in lower tiers cannot execute or integrate without their upstream contract prerequisites being formally verified.

```
       +-------------------------------------------------------------+
       | Tier P0: Foundation & Storage (Schema & Ingestion)          |
       | Objects: DA_Analysis_Run__c, DA_Graph_Chunk__c,             |
       |          DA_Project__c, DA_User_Preference__c, DA_Finding__c|
       | Services: DAGraphIngestionService, DAAnalysisHistoryService |
       +-------------------------------------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       | Tier P1: Canonical Graph Ingestion & Contracts              |
       | CONTRACT-01 (Canonical Graph Schema v1.0.0)                 |
       | CONTRACT-02 (Layout Engine Math & Hierarchy)                |
       | CONTRACT-04 (Apex FLS & With User Mode Enforcement)         |
       | CONTRACT-05 (Chunked Reassembly & Safe Limits: 10MB/80 Chk) |
       +-------------------------------------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       | Tier P2: Shell Coordinator & Navigation Core                |
       | Component: daAppShell (Coordinator Exclusive)               |
       | Sub-Components: daHeader, daSidebar                         |
       | Event Contract: CONTRACT-06 (Node Selection & Navigation)   |
       | INVARIANT: SELECTION != NAVIGATION                          |
       +-------------------------------------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       | Tier P3: Primary Specialized Analytical Views               |
       | Mounted Tabs in daAppShell:                                 |
       | - daGraphViewer (Topological Canvas + Cytoscape)            |
       | - daMatrixView (N x N Dependency Matrix)                    |
       | - daFindingsView (Rule Violations & Quality Gates)          |
       | - daProjectDashboard (Project Health & Metric Cards)        |
       | - daAnalysisHistory (Ingestion Run Timeline)                |
       | - daDiagnosticsView (Circular Dependency Cycle Groups)      |
       | - daHotspotsView (Coupling Intensity Ranking)               |
       | - daRadarView (9-Dimensional Architecture Spider Chart)     |
       | - daTreemapView (Squarified Bounding-Box Risk Treemap)      |
       | - daSubwayView (Transit-Style Metro Route Visualizer)       |
       | - daArchitectureDnaBarcode (Multi-Layer Genomic Barcode)    |
       +-------------------------------------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       | Tier P4: Investigation & Collaboration Drawer               |
       | Component: daInvestigationDrawer (Docked/Detached Drawer)   |
       | - Overview Tab (Subsumes React Profile View)                |
       | - Connections Tab (Subsumes React 4-Direction View)         |
       | - BroadcastChannel IPC (da_investigation_drawer_channel)    |
       +-------------------------------------------------------------+
                                      |
                 [GOVERNANCE DISPATCH GATE 1B REQUIRED]
                                      v
       +-------------------------------------------------------------+
       | Tier P5: Quarantined & Deferred Capabilities                |
       | QUARANTINED: daRefactoringEngine, daRefactorHandoffModal    |
       | DEFERRED: daSnapshotComparisonModal (REM-03),               |
       |           daSankeyView (REM-02), daCommandPalette           |
       +-------------------------------------------------------------+
```

---

## 2. Shared Contracts Cross-Reference Matrix

| Contract ID | Contract Title | Governing Authority | Features Dependent on Contract | Verification Test Suite |
| :--- | :--- | :--- | :--- | :--- |
| **CONTRACT-01** | Canonical Graph JSON DTO Schema | Workstream Lead / Integration Coordinator | VIEW-01..18, LAYOUT-01..04, INV-01..09, COMP-01..07 | `run-coordinator-integration-suite.cjs` |
| **CONTRACT-02** | Layout Engine Coordinate Model | Workstream 2 Lead | VIEW-04, VIEW-06, LAYOUT-01..04, INV-02 | `run-poc-tests.cjs`, `run-w5-1-tests.cjs` |
| **CONTRACT-03** | 9-Dimensional Architecture Radar | Workstream 4 Lead | VIEW-14 (`daRadarView`) | `run-w6-1-tests.cjs` |
| **CONTRACT-04** | Apex CRUD/FLS & Ingestion Security | Workstream 5 Lead | VIEW-01, VIEW-03, PERSIST-01, CLI-01 | `run-analysis-history-tests.cjs` |
| **CONTRACT-05** | Chunked Payload Ingestion (131k / 10MB) | Workstream 5 Lead / Coordinator | VIEW-01..18, INV-05, INV-07 | `run-coordinator-integration-suite.cjs` |
| **CONTRACT-06** | Canonical Event Bus & Node Selection | Integration Coordinator | VIEW-04..18, INV-01, INV-03, COMP-01 | `run-coordinator-integration-suite.cjs` |
| **CONTRACT-07** | Pure Simulation Refactoring Invariants | Workstream 6 Lead (Quarantined) | COMP-02, COMP-04 (Quarantined) | `run-workstream-c-tests.cjs` |
| **CONTRACT-08** | Multi-Snapshot Analysis & Diff Model | Workstream 5 Lead (Pending REM-03) | VIEW-02 (Compare Mode) | `run-analysis-history-tests.cjs` |
| **CONTRACT-09** | Inter-Layer Flow / Sankey Model | Workstream 4 Lead (Pending REM-02) | VIEW-11 (Dependency River) | `run-poc-tests.cjs` |

---

## 3. Residual Gap Dependency Chains & Prerequisites

To resolve residual gaps without violating architectural boundaries or breaking existing tests, the following sequential prerequisite chains must be observed:

### Chain 1: URL Deep-Linking Restoration (`GAP-B01` / `REM-04`)
- **Target:** `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
- **Prerequisite:** Coordinator-exclusive access only (INT-1). Protected path cannot be touched by feature agents.
- **Contract:** Standard Lightning Navigation (`lightning/navigation`) `CurrentPageReference` wire adapter.
- **Verification:** Unit test updating page state and asserting query parameter serialization.

### Chain 2: Large Graph Live-Org Benchmark (`GAP-B03` / `REM-01`)
- **Target:** `daGraphViewer` Cytoscape canvas.
- **Prerequisite:** Authenticated Salesforce scratch org with Lightning Web Security (LWS) enabled.
- **Blockers:** BLK-02 and BLK-03 (LWS DOM/Canvas sandbox compliance verification).
- **Verification:** Headless browser Playwright benchmark running PBIM fixture (528 nodes, 2063 edges) at >= 30 FPS.

### Chain 3: Snapshot Comparison Diff Modal (`GAP-C01` / `REM-03`)
- **Target:** New LWC `daSnapshotComparisonModal`.
- **Prerequisite:** Ratification of CONTRACT-08 and path allocation by Central Coordinator.
- **Upstream Producer:** `daAnalysisHistory.js` emits `comparelaunch` with `{ baseRunId, targetRunId }`.
- **Consumer:** `daSnapshotComparisonModal` fetches chunked payloads for both runs via Apex and computes AST diff client-side.

### Chain 4: Sankey River Flow Visualizer (`GAP-C02` / `REM-02`)
- **Target:** New LWC `daSankeyView`.
- **Prerequisite:** Static resource security approval for pure SVG or D3 flow layout under LWS.
- **Upstream Math:** `daLayoutEngine.js:computeSankeyLayout` already implemented and tested offline.
- **Governance:** Requires Workstream 4 authorization.

### Chain 5: Quarantined Refactoring Suite Release (`GAP-C03`, `GAP-C05`)
- **Target:** Integration of `daRefactoringEngine` and `daRefactorHandoffModal` into `daAppShell`.
- **Prerequisite:** Executive ratification of DEC-04 Alternative 4 and issuance of formal Batch 2 Implementation Authorization Order by the Project Owner.
- **Current State:** STRICTLY QUARANTINED. Code exists, passes offline unit tests (`run-workstream-c-tests.cjs`), but is prohibited from shell mounting.

---

## 4. Architectural Invariant Enforcement Summary

1. **SELECTION != NAVIGATION:**
   - Inbound event `nodeselect` passes `nodeId`.
   - `daAppShell` updates `this.selectedNodeId = event.detail.nodeId` and renders/updates `daInvestigationDrawer`.
   - `this.activeView` is **never** mutated by `nodeselect`.
2. **Canonical Graph Immutability:**
   - Graph payloads received from `daGraphPayloadLoader` are treated as strictly read-only.
   - Any layout position adjustments or simulation mutations clone data deep or maintain separate position overlay maps (`Positions_JSON__c`).
3. **Single Cytoscape Canvas:**
   - Only `daGraphViewer` instantiates Cytoscape.
   - Other topological views (`daTreemapView`, `daSubwayView`, `daArchitectureDnaBarcode`, `daRadarView`) use pure lightweight SVG, preventing multiple heavy canvas contexts or DOM leaks.
4. **Project Isolation:**
   - Multi-tenant data leakage is prevented via strict Apex SOQL `WITH USER_MODE` and compound validation (`DA_Project__c` Id cast followed by `Project_Key__c` fallback).
