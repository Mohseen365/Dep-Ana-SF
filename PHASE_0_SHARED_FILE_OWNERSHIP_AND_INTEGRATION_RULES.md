# Phase 0 Shared File Ownership & Integration Rules (Corrected)

## Document Metadata
- **Classification**: Phase 0 Integration Governance & Anti-Collision Protocols
- **Audit Date**: 2026-11-10 (Correction Pass)
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

## 3. Granular Rollback & Recovery Procedures (Correction 6)

To ensure fault containment during Phase 1 dispatches, explicit rollback procedures are established across the four key technical remediation domains:

### 3.1 Security Changes (OWD & Permission Sets)
- **Trigger Conditions**: Legitimate users lose access to projects; automated integration tests encounter `INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY`; or multi-tenant sharing calculation exceeds governor limits.
- **Responsible Owner**: Workstream Lead WS-B & Agent 1 (under D1 supervision).
- **Recovery Action**:
  1. Deploy previous baseline `DA_Project__c.object-meta.xml` setting `<sharingModel>ReadWrite</sharingModel>`.
  2. Deploy previous baseline `DA_Architecture_Analyst.permissionset-meta.xml` restoring `<viewAllRecords>true</viewAllRecords>`.
  3. Execute automated security regression suite (`run-s1-security-tests.cjs`) to verify baseline stability.
- **Data Preservation**: Project records and analysis runs are not deleted; only row-level visibility rules are reverted.
- **Residual Risk & Security Assessment**: Reverting OWD to ReadWrite temporarily restores cross-project visibility flaw; must be classified as a temporary emergency recovery requiring immediate root-cause resolution.
- **Approval Requirement**: Project Owner emergency authorization.

### 3.2 Ingestion Changes (Lifecycle States, Chunk Keys, REST Transport)
- **Trigger Conditions**: Legitimate upload payloads fail with false-positive payload cap errors; duplicate chunk key constraints cause unexpected DML exceptions; or Apex heap exceeds 6 MB during batch ingestion.
- **Responsible Owner**: Workstream Lead WS-A, Agent 2 & Agent 3 (under D1 supervision).
- **Recovery Action**:
  1. Revert `DAGraphIngestionService.cls` and `DAGraphIngestionRestResource.cls` to commit `52e0429`.
  2. Drop the `Chunk_Key__c` Unique Case-Insensitive attribute (convert to standard external text without uniqueness constraint) to allow existing ingestion flows to succeed.
  3. Reset any stuck `UPLOADING` or `VALIDATING` runs to `FAILED` to prevent orphan locks.
- **Data Preservation**: Existing `AVAILABLE` runs and graph chunks remain completely untouched and queryable by `daAppShell`.
- **Validation Procedure**: Execute `run-p0-verification-tests.cjs` and `run-coordinator-integration-suite.cjs`.
- **Residual Risk**: High-concurrency upload races may create duplicate chunks until unique index is refined.
- **Approval Requirement**: Workstream Lead WS-A and Integration Coordinator D1 joint signoff.

### 3.3 Finding Review Persistence Changes
- **Trigger Conditions**: Finding status updates corrupt finding records, throw user-mode DML exceptions, or break `daFindingsView.js`.
- **Responsible Owner**: Workstream Lead WS-D & Agent 6.
- **Recovery Action**:
  1. Revert `DAGraphController.cls` method `updateFindingStatus`.
  2. Revert `daFindingsView.js` to in-memory status handling mode.
  3. Schema rollback: Leave `DA_Finding__c.Status__c` in place as unmapped metadata to avoid destructive column drops.
- **Data Preservation**: Existing finding records retain their current status values.
- **Validation Procedure**: Execute `run-lane-f-findings-tests.cjs`.
- **Approval Requirement**: Workstream Lead WS-D and Coordinator D1 signoff.

### 3.4 Shared Shell & Component Mounting Integration
- **Trigger Conditions**: Mounting `daSankeyView`, `daSnapshotComparisonModal`, `daPresetManager`, or `daCommandPalette` breaks `daAppShell` tab routing or violates `SELECTION != NAVIGATION`.
- **Responsible Owner**: Integration Coordinator D1 exclusively.
- **Recovery Action**:
  1. Revert `daAppShell.js` and `daAppShell.html` to commit `52e0429` (restoring 11 approved views).
  2. The standalone component bundles (`c/daSankeyView`, `c/daSnapshotComparisonModal`, `c/daPresetManager`) remain intact in the repository but unmounted in the shell.
- **Validation Procedure**: Run `run-coordinator-integration-suite.cjs` (must pass 16/16).
- **Approval Requirement**: Coordinator D1 exclusive authority.

---

## 4. Frozen Invariants & Non-Negotiable Boundaries

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
