# Phase 0 Shared File Ownership & Integration Rules

## Document Metadata
- **Classification**: Phase 0 Integration Governance & Anti-Collision Protocols
- **Audit Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1
- **Status**: AUTHORITATIVE INTEGRATION DIRECTIVE

---

## 1. Executive Summary & Integration Authority

To prevent concurrent file conflicts, regression of core architectural invariants, and merge collisions during Phase 1, this document establishes strict ownership boundaries across all shared components in the repository.

### Foundational Principles:
1. **D1 Exclusive Authority**: The Integration Coordinator (Agent D1) holds **exclusive, unshared ownership** over central application shell files and core coordination infrastructure.
2. **Zero Concurrent Modification**: No two agents may edit the same shared source file simultaneously.
3. **Packaging Protocol**: Feature implementation agents build and verify their components in isolated directories. Integration into the central application shell is performed strictly by Agent D1 after formal joint acceptance.

---

## 2. Protected Shared Files & Coordinator Exclusivity

The following files are strictly protected under **Coordinator-Exclusive Ownership (Agent D1)**. Feature agents (Agents 1 through 10) are barred from directly modifying these paths:

| Protected File Path | Description | Integration Authority |
|---|---|---|
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | Core Application Shell Controller | **D1 Only** |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html` | Core Application Shell Template | **D1 Only** |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.css` | Core Application Shell Styles | **D1 Only** |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js` | Filter Schema & Normalization Engine | **D1 Only** |
| `scratch/salesforce-poc/force-app/main/default/lwc/daHeader/daHeader.html` | Top Navigation Header Template | **D1 Only** |
| `scratch/salesforce-poc/force-app/main/default/lwc/daSidebar/daSidebar.html` | Collapsible Left Sidebar Template | **D1 Only** |
| `scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs` | Central Coordinator Integration Suite (INT-1) | **D1 Only** |

---

## 3. Component Handoff & Mounting Protocol (Agent 5 -> D1)

For GAP-MNT-01 (`daSankeyView` / `river`), GAP-MNT-02 (`daSnapshotComparisonModal`), and GAP-MNT-03 (`daPresetManager`):

1. **Isolation in Component Bundles**:
   - Agent 5 owns and modifies only its assigned bundles:
     - `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/*`
     - `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/*`
     - `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/*`
   - Agent 5 verifies component behavior using isolated test runners (`run-c3-sankey-tests.cjs`, `run-c2-snapshot-comparison-tests.cjs`).
2. **Integration Package Submission**:
   - Agent 5 prepares an Integration Package containing:
     - Component API documentation (`@api` properties and custom event schemas).
     - Minimal diff snippet requested for `daAppShell.html` / `daAppShell.js`.
     - Test evidence proving standalone stability.
3. **Coordinator Integration**:
   - Upon Project Owner approval of `PO-DEC-V2-04`, Agent D1 merges the integration snippet into `daAppShell.*`.
   - Agent D1 updates `APPROVED_VIEWS` in `daAppShell.js` to include `'river'`.
   - Agent D1 runs `run-coordinator-integration-suite.cjs` to verify that all 12 views load cleanly without regression.

---

## 4. Shared Permission Set Merging Protocol (Agents 1, 2, 6 -> WS-B)

`DA_Architecture_Analyst.permissionset-meta.xml` contains security permissions across the entire data model. To avoid merge races:
1. **Agent 1 Exclusive Initial Ownership**:
   - Agent 1 modifies `DA_Architecture_Analyst.permissionset-meta.xml` in Phase 1 to remove `<viewAllRecords>true</viewAllRecords>`.
2. **Sequential Schema Expansion**:
   - When Agent 2 adds `Chunk_Key__c` or Agent 6 adds `DA_Finding__c.Status__c`, the new field permissions are NOT edited directly in the permission set by Agent 2 or Agent 6.
   - Instead, new `<fieldPermissions>` blocks are submitted to Workstream B / Agent 1 as a formal schema patch.
   - Agent 1 applies and validates the consolidated permission set metadata.

---

## 5. Frozen Invariants & Non-Negotiable Boundaries

All agents and coordinators must maintain the following architectural invariants:
1. **`SELECTION != NAVIGATION`**: Selecting a node or edge must never trigger an automatic view mode change. Node selection events update `selectedNodeId` and drawer context while remaining on the active view.
2. **Single Cytoscape Canvas**: Exactly one Cytoscape instance may exist on the DOM at any given moment. Modals, diff viewers, and secondary views must use pure SVG, HTML canvas, or tabular diff representations. Multi-canvas Cytoscape instantiation is prohibited.
3. **Canonical Payload Immutability**: Graph chunks reassembled by `c/daGraphPayloadLoader` are read-only. Analytical views must not mutate the underlying node/edge payload.
4. **Pure Simulation Isolation**: Refactoring simulations or draft states operate in isolated memory and never alter the canonical graph model without formal DML commit.
5. **Stale Response Suppression**: Asynchronous responses carrying an outdated `activeProjectId` or stale timestamp must be rejected.
6. **Payload Size Caps**:
   - Maximum chunk size: **131,072 UTF-16 code units**.
   - Maximum total payload: **10,485,760 UTF-16 code units** (80 chunks).
7. **Wave 5A & Wave 9 Protection**:
   - Wave 5A is closed and immutable.
   - Wave 9 refactoring engine components remain excluded via `.forceignore`.
