# Wave 0.3: LWC Public API Contract Reconciliation (Contract W0-C4)

## 1. Problem Formulation & Defect Analysis

Across Wave 0 architectural documents and Wave 0.2 task descriptions, public API property names for LWC view components diverged, introducing significant integration ambiguity:

1. **Theoretical Contract Definition (`WAVE_0_SHARED_ARCHITECTURAL_CONTRACTS.md`, Section 5.2):**
   ```typescript
   export interface AnalyticalViewProps {
     @api payload: CanonicalGraphPayload | null;
     @api filterCriteria: CanonicalFilterCriteria | null;
     @api selectedNodeId: string | null;
     @api activeProjectId: string | null;
     @api readOnly: boolean;
   }
   ```
2. **Actual Integrated Component Code & Parent Shell Template:**
   - In `daFindingsView.js` & `daMatrixView.js`:
     The properties are declared as:
     `@api projectId = null;`
     `@api get graphPayload() / set graphPayload(val)`
     `@api get filterCriteria() / set filterCriteria(val)`
   - In `daAppShell.html` (the integrating parent shell):
     ```html
     <c-da-matrix-view
         project-id={activeProjectId}
         graph-payload={activeGraphPayload}
         filter-criteria={activeFilterCriteria}>
     </c-da-matrix-view>
     ```
   - In `daGraphViewer.js`:
     `@api get recordId() / set recordId(value)` (representing `projectId`)
     `@api get filterCriteria() / set filterCriteria(value)`
   - In `daPresetManager.js`:
     `@api projectId = null;`
     `@api filterContainer`
     `@api activeFilter`

### Defect Impact:
If new feature agents for Wave 6 (Radar, Treemap, Subway, Hotspots), Wave 7 (Diagnostics, History), Wave 8 (Compare), and Wave 9 (Refactoring) implement `@api payload` instead of `@api graphPayload`, or `@api activeProjectId` instead of `@api projectId`, then when `daAppShell.html` passes `graph-payload={activeGraphPayload}` and `project-id={activeProjectId}`, the child components will silently fail to receive the graph data and project ID.

---

## 2. Authoritative Component Public API Contract

To maintain 100% backward compatibility with existing mounted components (`daMatrixView`, `daFindingsView`) and the integrating shell (`daAppShell`), while supporting clean adapter patterns where desirable, the following exact property names are **frozen and binding**.

### 2.1 Standard Analytical Child View Interface (`c-da-*-view`)
Applies to: `daRadarView`, `daTreemapView`, `daSubwayView`, `daHotspotsView`, `daDiagnosticsView`, `daCompareView`, `daRefactoringView`.

| Exact LWC Property Name | Template Kebab-Case Attribute | Data Type | Default Value | Required? | Mutability / Direction | Purpose / Semantics |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **`projectId`** | `project-id` | `String` | `null` | Optional | Inbound / Read-Only | Current project Salesforce Id or Project_Key__c |
| **`graphPayload`** | `graph-payload` | `Object` | `null` | **Mandatory** | Inbound / Read-Only | Canonical graph payload object (`CanonicalGraphPayload`) |
| **`filterCriteria`** | `filter-criteria` | `Object` | `null` | Optional | Inbound / Read-Only | Canonical filter criteria object (`CanonicalFilterCriteria`) |
| **`selectedNodeId`** | `selected-node-id` | `String` | `null` | Optional | Inbound / Read-Only | Currently highlighted or selected node identifier |
| **`readOnly`** | `read-only` | `Boolean` | `false` | Optional | Inbound / Read-Only | Flag indicating whether annotations/modifications are locked |

### 2.2 Compatibility Adapter Rule for `payload` vs `graphPayload`
To ensure robust fail-safe integration across all existing and future tasks:
Every new analytical view component should expose `@api graphPayload` as its primary input property, but **may additionally support `@api get payload() / set payload(val)` as an alias** pointing to the same internal state.
```javascript
// Recommended Standard Implementation Pattern in new views:
_graphPayload = null;

@api
get graphPayload() {
    return this._graphPayload;
}
set graphPayload(value) {
    this._graphPayload = value;
    this.handlePayloadChange();
}

// Backward-compatibility alias:
@api
get payload() {
    return this.graphPayload;
}
set payload(value) {
    this.graphPayload = value;
}
```

---

## 3. Component Interface Inventory

| Component Name | Public Properties (`@api`) | Parent Template Wiring (`daAppShell.html`) | Event Contract Emitted |
| :--- | :--- | :--- | :--- |
| `daAppShell` | `activeProjectId`<br>`activeProjectKey` | Root application container / FlexiPage host | N/A |
| `daProjectSelector` | `label`<br>`selectedProjectId`<br>`disabled` | `selected-project-id={activeProjectId}` | `onprojectchange` (`event.detail.projectId`) |
| `daPresetManager` | `projectId`<br>`filterContainer`<br>`activeFilter` | `project-id={activeProjectId}`<br>`filter-container={scopedFilterContainer}`<br>`active-filter={activeFilterCriteria}` | `onfilterchange` (`event.detail.criteria`) |
| `daGraphViewer` | `recordId`<br>`filterCriteria` | `record-id={activeProjectId}`<br>`filter-criteria={activeFilterCriteria}` | `onnodeselect` (`event.detail.nodeId`) |
| `daAnnotationPanel` | `projectId`<br>`selectedNodeId` | `project-id={activeProjectId}`<br>`selected-node-id={selectedNodeId}` | `onannotationchange` |
| `daMatrixView` | `projectId`<br>`graphPayload`<br>`filterCriteria` | `project-id={activeProjectId}`<br>`graph-payload={activeGraphPayload}`<br>`filter-criteria={activeFilterCriteria}` | `onnodeselect` (`event.detail.nodeId`) |
| `daFindingsView` | `projectId`<br>`graphPayload`<br>`filterCriteria` | `project-id={activeProjectId}`<br>`graph-payload={activeGraphPayload}`<br>`filter-criteria={activeFilterCriteria}` | `onnodeselect` (`event.detail.nodeId`) |
| **New Analytical Views (Wave 6-9)** | `projectId`<br>`graphPayload`<br>`filterCriteria` projections | Standardized to mount under `daAppShell.html` tab navigation | `onnodeselect` (or view-specific action event) |

---

## 4. Selection vs Navigation Invariant (`SELECTION != NAVIGATION`)

Under no circumstances may selecting a node or item within any child view trigger an automatic or silent route navigation or view switch:
- Selecting a node emits `nodeselect` with `{ nodeId }`.
- `daAppShell` updates `selectedNodeId` and broadcasts it to synchronized child panels (e.g., `daAnnotationPanel`).
- The active view tab remains unchanged unless the user explicitly clicks a tab navigation header.
