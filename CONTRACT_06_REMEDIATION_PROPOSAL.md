# CONTRACT-06 Remediation Proposal: Node Selection Event DTO & Interaction Contract

## 1. Governance & Proposal Metadata
- **Contract Target:** `CONTRACT-06`
- **Current Status:** `PROPOSED` (Unratified by Project Owner)
- **Proposed Status:** `RATIFICATION_RECOMMENDED`
- **Affected Tasks:** Task W8-1 (`daInvestigationDrawer`), Cross-View Selection Coordination (`daGraphViewer`, `daMatrixView`, `daFindingsView`, `daTreemapView`, `daSubwayView`, `daHotspotsView`), Shell Integration (`daAppShell` under INT-1).
- **Affected Workstream:** Workstream D (Wave 8) & Integration Coordinator
- **Author:** Jules (Integration Coordinator / Contract Remediation Lane)
- **Date:** 8 November 2026
- **Ratification Authority:** Project Owner (Sole Executive Authority under DEC-04 Alternative 4)

---

## 2. Problem Statement & Historical Ambiguity
Historical Phase A2 notes exhibited ambiguity between two candidate event names for node selection: `nodeselect` vs `selectionchange`. Additionally, drawer mounting boundaries and selection lifecycle semantics required formalization:
1. `daAppShell.html` already binds `onnodeselect={handleNodeSelect}`.
2. `daGraphViewer.js` already dispatches `CustomEvent('nodeselect', ...)`.
3. The drawer component must be mounted at the shell level as a persistent slide-out overlay rather than duplicated within every child view.
4. Selection must strictly obey the frozen invariant `SELECTION != NAVIGATION`.

Until Project Owner formally ratifies CONTRACT-06, Task W8-1 remains blocked from production implementation.

---

## 3. Authoritative Event Specification & Payload DTO

### 3.1 Event Name & Dispatch Contract
- **Canonical Event Name:** `nodeselect` (Sole approved event name; `selectionchange` is rejected).
- **Bubbling & Composed:** `bubbles: true`, `composed: true`, `cancelable: false`.
- **Deselection Event:** `selectionclear` (or `nodeselect` with `nodeId: null`).

### 3.2 Detail Payload Interface
```typescript
export interface NodeSelectDetail {
  /**
   * Unique identifier of selected node (e.g., 'ApexClass.AccountService').
   * Null signals complete deselection.
   */
  nodeId: string | null;

  /**
   * Optional full node data object from canonical graph payload.
   */
  node?: CanonicalGraphNode | null;

  /**
   * Originating view identifier ('graph', 'matrix', 'findings', 'treemap', 'subway', 'hotspots', etc.).
   */
  sourceView: string;

  /**
   * Contextual interaction flags.
   */
  meta?: {
    isMultiSelect?: boolean;
    isPinned?: boolean;
    [key: string]: any;
  };
}
```

---

## 4. Preservation of Frozen Invariants

### 4.1 Invariant 1: `SELECTION != NAVIGATION`
- Selecting a node within any view or drawer tab:
  1. Does NOT change the active project (`activeProjectId` remains untouched).
  2. Does NOT switch the active view tab (`activeView` remains unchanged).
  3. Does NOT mutate active filter criteria or stored presets.
  4. Does NOT invoke write operations to the database.

### 4.2 Invariant 2: Payload Immutability
- Selecting a node does not mutate properties on the shared `payload.nodes` or `payload.edges` objects. All selection visual state is tracked in local component memory (e.g., `selectedNodeId` or `Set<string>`).

---

## 5. Investigation Drawer (`daInvestigationDrawer`) Architectural Boundary

1. **Mounting:** Mounted exclusively within `daAppShell.html` under INT-1 integration control.
2. **Inputs:**
   - `@api node`: Currently selected `CanonicalGraphNode`.
   - `@api isOpen`: Boolean controlling drawer slide-out animation/visibility.
   - `@api payload`: Canonical graph payload (for neighborhood/edge queries).
3. **Internal Tabs:**
   - `overview`: Node identity, layer, type, LOC, cyclomatic complexity, risk classification.
   - `dependencies`: Target nodes called/referenced by this node (outbound).
   - `dependents`: Caller nodes depending on this node (inbound).
   - `evidence`: Coverage density, cycle participation, unassigned status.
   - `actions`: Pinning toggle, focus graph request event emission.

---

## 6. Implementation Impact Assessment & Acceptance Criteria

- **Implementation Impact:**
  - Standardizes cross-view selection across Waves 5–8.
  - Zero changes to existing passing baseline runners.
  - Clears path for W8-1 implementation once ratified.
- **Testable Acceptance Criteria:**
  1. Selection event emitted with exact name `nodeselect` and correct payload detail.
  2. Drawer cleanly renders null/empty state when no node is selected.
  3. Selecting a node displays all 5 tabs without mutating payload.
  4. Closing or clearing selection sets `nodeId: null` safely.

---

## 7. Approval Blocker & Next Actions
- **Current Status:** `AUTHORIZED_BLOCKED_ON_CONTRACT_APPROVAL`.
- **Blocker:** Requires Project Owner formal review and chat approval to ratify CONTRACT-06.
- **Production Guard:** No production files for Task W8-1 (`daInvestigationDrawer.*`) will be implemented or committed until formal ratification is granted.
