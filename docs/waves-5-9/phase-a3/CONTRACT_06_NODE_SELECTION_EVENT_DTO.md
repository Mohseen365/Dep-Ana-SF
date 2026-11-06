# Contract 06: Node Selection Event DTO & Interaction Contract

## 1. Document Control & Identification
- **Contract ID**: `CONTRACT-06`
- **Contract Name**: Node Selection Event DTO & Interaction Contract
- **Version**: `1.0.0`
- **Status**: `FROZEN`
- **Purpose**: Establishes the singular canonical CustomEvent name, bubbling/composition flags, payload shape, and interaction rules for cross-view node selection and investigation drawer coordination.
- **Affected Tasks**: `W8-1` (Investigation Drawer), `W5-1..6` (`daGraphViewer`), `W6-1..4` (`daRadarView`, `daTreemapView`, `daSubwayView`, `daHotspotsView`), `INT-1` (`daAppShell`)
- **Affected Workstreams**: Workstream D, Workstream A, Workstream B, Integration Coordinator

---

## 2. Source-of-Truth References
1. `docs/audits/salesforce-parallel-migration/phase-0/WAVE_0_SHARED_ARCHITECTURAL_CONTRACTS.md` (Section 3: Selection and Navigation Contract W0-C2).
2. `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` (Lines 163–183: `handleNodeSelect(event)`).
3. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Dispatches `nodeselect` on Cytoscape tap).
4. `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` (Verifies node selection event isolation).

---

## 3. Discrepancy Resolution: Competing Event Names

- **Conflict**: Phase A2 contract catalog listed candidate event names as either `nodeselect` or `selectionchange`.
- **Actual Implementation**:
  - `daAppShell.html` binds `onnodeselect={handleNodeSelect}` across child views.
  - `daAppShell.js` implements `handleNodeSelect(event)` expecting `event.detail.nodeId` or `event.detail.node`.
  - `daGraphViewer.js` dispatches `new CustomEvent('nodeselect', ...)`.
  - Architectural Contract W0-C2 specifies `nodeselect`.
- **Resolution**:
  **`nodeselect` is the sole canonical event name**. `selectionchange` is rejected as redundant and non-standard in this architecture.

---

## 4. Canonical Selection Event Specifications

### 4.1 Node Selection (`nodeselect`)
Dispatched by any interactive view when a user clicks or highlights an architectural node:

```typescript
export interface NodeSelectDetail {
  /**
   * Unique identifier of the selected node.
   * If null or empty string, signals deselection / clearing selection.
   */
  nodeId: string | null;

  /**
   * Optional full node object reference or clone.
   */
  node?: CanonicalGraphNode | null;

  /**
   * Source view initiating the selection event.
   * Canonical values: 'graph' | 'matrix' | 'findings' | 'radar' | 'treemap' | 'subway' | 'hotspots' | 'history' | 'compare'
   */
  sourceView: string;

  /**
   * Optional contextual metadata (e.g. click coordinates, shift-key status).
   */
  meta?: {
    isMultiSelect?: boolean;
    isPinned?: boolean;
    [key: string]: any;
  };
}
```

**Dispatching Standard**:
```javascript
this.dispatchEvent(new CustomEvent('nodeselect', {
  detail: {
    nodeId: node.id,
    node: node,
    sourceView: 'graph'
  },
  bubbles: true,
  composed: true,
  cancelable: false
}));
```

### 4.2 Deselection / Selection Clear (`selectionclear`)
When clicking on empty canvas or pressing Escape:
```javascript
this.dispatchEvent(new CustomEvent('selectionclear', {
  detail: {
    sourceView: 'graph'
  },
  bubbles: true,
  composed: true,
  cancelable: false
}));
```

---

## 5. Architectural Invariant: `SELECTION != NAVIGATION`

Selecting a node within any view or clicking a row in a table:
1. **MUST NOT** trigger project switching or project reload.
2. **MUST NOT** switch the active tab (e.g. user selecting a node in Graph does not suddenly switch to Matrix or Radar).
3. **MUST NOT** clear or mutate active filter criteria or presets.
4. **MUST NOT** invoke Apex write operations or save preferences.

---

## 6. Investigation Drawer Coordination (`W8-1`)

1. **Mounting Architecture**:
   - The Investigation Drawer (`daInvestigationDrawer`) is mounted at the `daAppShell` level as a sliding right-hand drawer overlay.
   - It is **NOT** duplicated inside individual view components.
2. **Event Routing**:
   - Child view dispatches `nodeselect` (`bubbles: true, composed: true`).
   - `daAppShell` intercepts `nodeselect`, updates `@api selectedNodeId`, and passes the selected entity and its local neighborhood to `daInvestigationDrawer`.
3. **Pinning Invariant**:
   - Nodes pinned inside `daInvestigationDrawer` remain pinned when the user switches tabs or changes filters.
   - Pinning does NOT mutate the underlying graph payload.
