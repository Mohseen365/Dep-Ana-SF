# Component Mounting and Workflow Integration Matrix

## Document Identification
- **Contracts Covered**: CONTRACT-06, CONTRACT-08
- **Audit Date**: 2026-11-10
- **Auditor**: Jules Master Dispatch & UX Integration Verifier
- **Scope**: LWC Component Exposure, Wiring, UI Mounting, and Persistent Workflow Architecture

---

## 1. Executive Summary

This audit assesses the physical mounting, event wiring, and workflow persistence of all 25 LWC bundles in the repository.

Three fully implemented, tested, and ratified components remain unmounted in `daAppShell`:
1. **`daSankeyView`** (Pure SVG Dependency River / REM-02 / GAP-MNT-01)
2. **`daSnapshotComparisonModal`** (Dual-Snapshot Comparison Modal / REM-03 / GAP-MNT-02)
3. **`daPresetManager`** (Filter Preset Manager / Wave 4 Lane C / GAP-MNT-03)

Furthermore, four critical persistent workflows currently lack backend Apex controllers or UI triggers:
1. Finding review status persistence (GAP-WKF-01)
2. Project creation & manifest upload modal (GAP-WKF-02)
3. Keyboard command palette (GAP-WKF-03)
4. Cytoscape rich node hover cards (GAP-WKF-04)

---

## 2. Exhaustive LWC Bundle Exposure & Mounting Matrix

| Component Bundle | Category / Purpose | Implemented? | Tested? | Shell Mounted? | User Accessible? | Integration Gap / Recommendation |
|---|---|---|---|---|---|---|
| **`daAppShell`** | Main Application Shell | YES | YES | ROOT | YES | Active view controller (11 views) |
| **`daHeader`** | Global Header & Actions | YES | YES | YES | YES | Needs Compare & Import action triggers |
| **`daSidebar`** | Navigation & Filters | YES | YES | YES | YES | Needs Preset Manager slot integration |
| **`daProjectSelector`** | Project Dropdown | YES | YES | YES | YES | Needs "New Project" modal trigger |
| **`daProjectDashboard`** | Health Metrics Surface | YES | YES | YES | YES | Fully mounted on view `dashboard` |
| **`daGraphViewer`** | Cytoscape Canvas | YES | YES | YES | YES | Fully mounted on view `graph` |
| **`daGraphPayloadLoader`**| Chunk Reassembly Utility | YES | YES | N/A | YES | Headless utility used by shell |
| **`daLayoutEngine`** | Layout Algorithm Engine | YES | YES | N/A | YES | Headless utility used by graph viewer |
| **`daMatrixView`** | Dependency Matrix Lens | YES | YES | YES | YES | Fully mounted on view `matrix` |
| **`daFindingsView`** | Architecture Findings Lens| YES | YES | YES | YES | Fully mounted on view `findings` |
| **`daRadarView`** | 9-Dimension Radar Lens | YES | YES | YES | YES | Fully mounted on view `radar` |
| **`daTreemapView`** | Component Treemap Lens | YES | YES | YES | YES | Fully mounted on view `treemap` |
| **`daSubwayView`** | Subway Transit Map Lens| YES | YES | YES | YES | Fully mounted on view `subway` |
| **`daHotspotsView`** | Hotspots & Risks Surface | YES | YES | YES | YES | Fully mounted on view `hotspots` |
| **`daDiagnosticsView`** | Circularity & Diagnostics| YES | YES | YES | YES | Fully mounted on view `diagnostics` |
| **`daArchitectureDnaBarcode`** | DNA Barcode Lens | YES | YES | YES | YES | Fully mounted on view `dna` |
| **`daAnalysisHistory`** | Run History Surface | YES | YES | YES | YES | Fully mounted on view `history` |
| **`daInvestigationDrawer`** | Dockable Investigation | YES | YES | YES | YES | Mounted globally when node selected |
| **`daAnnotationPanel`** | Node Annotation Panel | YES | YES | YES | YES | Mounted inside investigation drawer |
| **`daSankeyView`** | Pure SVG Dependency River| YES | YES | **NO** | **NO** | **GAP-MNT-01**: Mount on view `river` |
| **`daSnapshotComparisonModal`**| Snapshot Diff Modal | YES | YES | **NO** | **NO** | **GAP-MNT-02**: Mount as global modal |
| **`daPresetManager`** | Preset Save/Load Modal | YES | YES | **NO** | **NO** | **GAP-MNT-03**: Mount in sidebar/header |
| **`daRefactoringEngine`** | Refactoring Simulation | YES | ISOLATED| **NO** | **NO** | Quarantined under Wave 9 .forceignore |
| **`daRefactorHandoffModal`**| Refactor Handoff Modal | YES | ISOLATED| **NO** | **NO** | Quarantined under Wave 9 .forceignore |
| **`graphViewer`** | Legacy Baseline Wrapper| YES | N/A | NO | NO | Deprecated legacy bundle |

---

## 3. Detailed UI Integration Specifications for Unmounted Components

### 3.1 Dependency River (`daSankeyView` / GAP-MNT-01)
- **Integration Model**: Primary Visualization Lens.
- **Shell Registration**: Add `river` (alias `sankey`) to `APPROVED_VIEWS` in `daAppShell.js`.
- **Template Binding** (`daAppShell.html`):
```html
<template if:true={isRiverView}>
    <div id="tab-river" class="slds-tabs_default__content slds-show" role="tabpanel">
        <c-da-sankey-view
            project-id={activeProjectId}
            payload={activeGraphPayload}
            selected-node-id={selectedNodeId}
            onnodeselect={handleNodeSelect}>
        </c-da-sankey-view>
    </div>
</template>
```
- **Contract Adherence**: Uses CONTRACT-06 `nodeselect` detail (`{ nodeId, node, sourceView: "river", meta }`).

### 3.2 Dual-Snapshot Comparison Modal (`daSnapshotComparisonModal` / GAP-MNT-02)
- **Integration Model**: Modal / Workflow Surface (NOT a persistent tab lens).
- **Trigger**: "Compare Snapshots" button in `daHeader.html`.
- **Event Flow**:
  - `daHeader` emits `CustomEvent(opencompare)`.
  - `daAppShell` sets `isCompareModalOpen = true`.
- **Template Binding** (`daAppShell.html`):
```html
<template if:true={isCompareModalOpen}>
    <c-da-snapshot-comparison-modal
        project-id={activeProjectId}
        current-run-id={activeRunId}
        onclose={handleCloseCompareModal}
        onnodeselect={handleNodeSelect}>
    </c-da-snapshot-comparison-modal>
</template>
```

### 3.3 Filter Preset Manager (`daPresetManager` / GAP-MNT-03)
- **Integration Model**: Filter Configuration Modal / Drawer Extension.
- **Trigger**: "Manage Presets" button in `daSidebar` or `daHeader`.
- **Template Binding**: Rendered inside `daSidebar` or conditionally launched as modal.
- **Event Flow**: Emits `filterchange` to update shell filter state.

---

## 4. Persistent Workflow Architecture

### 4.1 Finding Review Status Workflow (GAP-WKF-01)
- **Problem**: Finding review actions in `daFindingsView` are volatile.
- **Required Remediation**:
  1. Add `Status__c` picklist field to `DA_Finding__c` (`OPEN`, `IN_REVIEW`, `RESOLVED`, `WONT_FIX`).
  2. Implement `DAFindingController.updateFindingStatus(Id findingId, String newStatus)` with `WITH USER_MODE`.
  3. Wire `daFindingsView.js` to dispatch Apex call upon user status dropdown change.

### 4.2 Project Creation & Ingestion Upload UI (GAP-WKF-02)
- **Problem**: No UI exists for creating projects or initiating file imports.
- **Required Remediation**:
  1. Author `daProjectCreationModal` bundle.
  2. Wire modal to invoke `DAGraphIngestionService.createProject` and chunk upload.
  3. Add "New Project" button in `daProjectSelector`.
