# Agent 5 Component Integration Preparation Report

## Document Metadata
- **Agent**: Agent 5 (Existing Component Integration Preparation)
- **Coordinator**: Integration Coordinator D1
- **Date**: 2026-11-10
- **Status**: PREPARATION COMPLETE (READ-ONLY AUDIT & TEST SPECIFICATION)

---

## 1. Scope & Governance Boundaries
Agent 5 is authorized strictly for read-only inspection, dependency identification, and integration test specification for:
1. `daSankeyView` (Native SVG Sankey visualization)
2. `daSnapshotComparisonModal` (Tabular snapshot comparison modal)
3. `daPresetManager` (Filter preset management component)

**Prohibitions Enforced**:
- Zero modifications to `daAppShell.*`, `daHeader.*`, or `daSidebar.*`.
- Zero modifications to frozen selection DTOs (CONTRACT-06 v1.0.0).
- River workspace view is **not** mounted in `daAppShell`.
- Zero changes to navigation or production shell behavior.
- Implementation remains strictly owned by Integration Coordinator D1.

---

## 2. Component Inspection & Interface Analysis

### 2.1 `daSankeyView`
- **Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/`
- **Current Interfaces**:
  - `@api graphData`: Canonical AST / graph container object (`{ nodes: [], edges: [] }`).
  - `@api currentRunId`: Active analysis run identifier.
  - `@api selectedNodeId`: Synchronized node selection ID.
  - Custom Event `nodeselect`: Dispatched when user clicks a Sankey stage or link. Detail payload: `{ node: CanonicalGraphNode, sourceView: 'river', sourceComponent: 'daSankeyView' }`.
- **Implementation Characteristics**:
  - Implemented using 100% pure native SVG rendering without external third-party D3 or static resources (satisfying PO-REQ-03).
  - Multi-tier architectural flow mapping: UI -> Controller -> Service -> Domain -> Data.
- **Dependencies**: None on external DOM or static JS libraries. Relies strictly on standard LWC engine and SVG elements.

### 2.2 `daSnapshotComparisonModal`
- **Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/`
- **Current Interfaces**:
  - `@api projectId`: Current project ID.
  - `@api baselineRunId`: Comparison baseline run ID.
  - `@api targetRunId`: Comparison target run ID.
  - Custom Event `close`: Modal dismissal.
  - Custom Event `applyrun`: Dispatches selected run ID back to parent shell.
- **Implementation Characteristics**:
  - Strictly limited to tabular structural diffs (node additions, deletions, modifications, cyclic SCC deltas) per CONTRACT-05 v1.0.0.
  - No secondary Cytoscape canvas instantiation (satisfies 5 MB single / 10 MB combined payload caps).
- **Dependencies**: Relies on `lightning-modal` / standard SLDS modal markup.

### 2.3 `daPresetManager`
- **Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/`
- **Current Interfaces**:
  - `@api projectId`: Current project context.
  - `@api activeFilters`: Current graph filter state.
  - Custom Event `presetapply`: Applies saved filter configuration.
  - Custom Event `presetsave`: Persists current filters.
- **Implementation Characteristics**:
  - Interfaces with `DAUserPreferenceController` for persisting preset configurations.
- **Dependencies**: Relies on `daFilterSchema.js` data models.

---

## 3. Exact Shared Shell Registration Specification for Coordinator D1

When implementation authorization is granted under `PO-DEC-V2-04`, Integration Coordinator D1 will make the following isolated registrations in `daAppShell`:

### 3.1 View Registry Expansion (`daAppShell.js`)
Expand `APPROVED_VIEWS` constant from 11 to 12 entries:
```javascript
// Addition to APPROVED_VIEWS set:
'river' // Corresponds to daSankeyView
```

### 3.2 Template Mounting (`daAppShell.html`)
Mount `daSankeyView` under conditional template tab:
```html
<template if:true={isRiverView}>
    <c-da-sankey-view
        graph-data={currentGraphData}
        current-run-id={activeRunId}
        selected-node-id={selectedNodeId}
        onnodeselect={handleNodeSelect}>
    </c-da-sankey-view>
</template>
```

### 3.3 Modal Mounting (`daAppShell.html`)
Mount `daSnapshotComparisonModal` controlled by shell state property `isSnapshotModalOpen`:
```html
<template if:true={isSnapshotModalOpen}>
    <c-da-snapshot-comparison-modal
        project-id={activeProjectId}
        baseline-run-id={activeRunId}
        onclose={handleCloseSnapshotModal}
        onapplyrun={handleApplyRunFromModal}>
    </c-da-snapshot-comparison-modal>
</template>
```

---

## 4. Component Focused Test Specifications
1. **Sankey Pure SVG Test Suite**:
   - Verify zero external scripts loaded.
   - Verify rendering of SVG nodes and bezier ribbon paths for PBIM dataset (528 nodes).
   - Verify `nodeselect` event conforms strictly to CONTRACT-06 v1.0.0 (`detail.node.id` present, `SELECTION != NAVIGATION`).
2. **Snapshot Comparison Modal Test Suite**:
   - Verify tabulations for node/edge additions, deletions, and property modifications.
   - Verify payload envelope does not exceed 10 MB combined cap.
3. **Preset Manager Test Suite**:
   - Verify JSON serialization of filter sets and interaction with `DAUserPreferenceController`.
