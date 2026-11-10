# Unmounted Component and Workflow Integration Audit

## 1. Executive Summary

This audit investigates implemented LWC components in `scratch/salesforce-poc/force-app/main/default/lwc/` that are currently omitted from the main application shell (`daAppShell`), detached from global navigation, or missing end-to-end user workflows.

Three primary production-ready components were discovered in an unmounted or disconnected state:
1. **`daSankeyView`** (Pure SVG Dependency River / Task REM-02).
2. **`daSnapshotComparisonModal`** (Dual-Snapshot Comparison Modal / Task REM-03 / CONTRACT-05).
3. **`daPresetManager`** (Filter Preset Manager / Wave 4 Phase 2 Lane C).

---

## 2. Component-by-Component Investigation

### A. Pure SVG Dependency River (`daSankeyView`)
- **Status**: IMPLEMENTED_NOT_MOUNTED (GAP-MNT-01)
- **Files**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/daSankeyView.js` (718 lines)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/daSankeyView.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/daSankeyView.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/daSankeyView.js-meta.xml`
- **History**: Implemented and ratified in Wave 5A under Task REM-02 to eliminate external Cytoscape/D3 dependencies and provide pure SVG rendering.
- **Verification**: `scratch/salesforce-poc/tests/run-c3-sankey-tests.cjs` (14/14 tests passing).
- **Inspection**:
  - In `daAppShell.js`, `APPROVED_VIEWS` contains 11 modes (`graph`, `matrix`, `findings`, `dashboard`, `history`, `diagnostics`, `hotspots`, `radar`, `treemap`, `subway`, `dna`), but **`sankey` (or `river`) is missing**.
  - In `daAppShell.html`, no `<template if:true={isSankeyView}>` block exists, and `<c-da-sankey-view>` is never instantiated.
  - In `daSidebar.html` and `daHeader.html`, there is no button or navigation entry to switch to this view.
- **Remediation**:
  1. Add `'sankey'` to `APPROVED_VIEWS` in `daAppShell.js`.
  2. Add computed getter `isSankeyView` in `daAppShell.js`.
  3. Add `<c-da-sankey-view>` tab panel to `daAppShell.html` binding `project-id`, `payload`, `selected-node-id`, and `onnodeselect`.
  4. Add navigation icon/tab in `daSidebar` and `daHeader`.

---

### B. Dual-Snapshot Comparison Modal (`daSnapshotComparisonModal`)
- **Status**: IMPLEMENTED_NOT_MOUNTED (GAP-MNT-02)
- **Files**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.js` (485 lines)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.js-meta.xml`
- **History**: Implemented and ratified in Wave 5A under Task REM-03 / CONTRACT-05 by Agent C2. Implements pure structural diffing (`computeGraphDiff`) without caller object mutation.
- **Verification**: `scratch/salesforce-poc/tests/run-c2-snapshot-comparison-tests.cjs` (21/21 tests passing).
- **Inspection**:
  - In `daAppShell.js`:
    ```javascript
    handleHeaderActionTrigger(event) {
        const action = event.detail?.action;
        if (action === 'history') {
            this.switchView('history');
        } else if (action === 'dashboard') {
            this.switchView('dashboard');
        } else if (action === 'compare') {
            // Compare action: preserve active project, route to history/compare
            this.switchView('history'); // ❌ Defect: routes to history instead of opening modal
        }
    }
    ```
  - `<c-da-snapshot-comparison-modal>` is never declared or mounted in `daAppShell.html`.
  - The modal has no entry point for users to compare two snapshots.
- **Remediation**:
  1. Add `@track isCompareModalOpen = false` in `daAppShell.js`.
  2. Update `handleHeaderActionTrigger('compare')` to set `this.isCompareModalOpen = true`.
  3. Mount `<c-da-snapshot-comparison-modal>` in `daAppShell.html` conditioned on `isCompareModalOpen`, handling `close` and `diffcalculated` events.

---

### C. Filter Preset Manager (`daPresetManager`)
- **Status**: IMPLEMENTED_NOT_MOUNTED (GAP-MNT-03)
- **Files**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js-meta.xml`
- **History**: Built during Wave 4 Phase 2 Lane C to allow saving, updating, and applying named filter presets.
- **Verification**: `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` (passing).
- **Inspection**:
  - Grepping the entire repository confirms zero usages of `<c-da-preset-manager>` across all HTML templates.
  - The component exists in isolation as a standalone bundle.
  - Users have no way to access preset saving/loading from `daSidebar` or `daAppShell`.
- **Remediation**:
  1. Embed `<c-da-preset-manager>` into `daSidebar.html` below the active layer filters.
  2. Bind current `filterCriteria` to preset manager.
  3. Wire preset selection event to update `daAppShell` filter criteria.

---

## 3. Workflow Completeness Matrix

| User Workflow | Starting Point | Intermediate Component | Terminal Action / Persistence | Status |
|---|---|---|---|---|
| **View Component Graph** | `daHeader` (select project) | `daSidebar` (filters) | `daGraphViewer` renders Cytoscape canvas | COMPLETE |
| **Inspect Node Details** | Node click in any view | `daInvestigationDrawer` | View metrics, open annotations | COMPLETE |
| **Annotate Component** | `daInvestigationDrawer` | `daAnnotationPanel` | Insert/Edit `DA_Annotation__c` (Apex) | COMPLETE |
| **Review Architecture Finding** | `daFindingsView` | Status change button | Memory only (`reviewStatuses`) ❌ | BROKEN (GAP-WKF-01) |
| **Compare Analysis Snapshots** | `daHeader` ("Compare") | `daAppShell` reroutes to `history` ❌ | `daSnapshotComparisonModal` never opens | BROKEN (GAP-MNT-02) |
| **Explore Flow / Sankey River** | `daSidebar` / `daHeader` | Tab missing ❌ | `daSankeyView` never mounts | BROKEN (GAP-MNT-01) |
| **Save & Apply Filter Presets** | `daSidebar` | Manager missing ❌ | `daPresetManager` never mounts | BROKEN (GAP-MNT-03) |
| **Create New Project** | `daHeader` | Modal missing ❌ | Only existing projects can be chosen | BROKEN (GAP-WKF-02) |
