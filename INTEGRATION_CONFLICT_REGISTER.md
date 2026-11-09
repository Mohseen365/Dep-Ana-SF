# Integration Conflict and Resolution Register

## 1. Overview
This register records all cross-workstream ownership, contract, and interface conflicts identified during the master integration process, along with their authoritative resolutions.

## 2. Identified Conflicts and Authoritative Resolutions

### Conflict 1: Ownership of `DA_Finding__c` Object and Metadata
- **Parties:** WS-3 (Core Analytical Views) vs WS-6 (Investigation and Collaboration).
- **Description:** Both workstreams referenced `DA_Finding__c` in their charters as a core dependency for findings display and contextual investigation.
- **Resolution:** WS-3 is assigned exclusive primary ownership of the `DA_Finding__c` metadata definition and test suites (`run-lane-f-findings-tests.cjs`). WS-6 consumes findings read-only via parent property bindings (`@api findings`). Single-writer discipline maintained.

### Conflict 2: Node Selection CustomEvent Payload (`sourceView` vs `sourceComponent`)
- **Parties:** WS-1 (App Shell & Sidebar) vs WS-2/3/4/6 (Child Visualization Components).
- **Description:** WS-1 specified `detail: { nodeId, sourceComponent }`, while CONTRACT-06 v1.0.0 specified `detail: { nodeId, sourceView, meta }`.
- **Resolution:** Child views emit `sourceView` (e.g. `'graph'`, `'matrix'`, `'findings'`, `'radar'`, `'treemap'`, `'subway'`, `'barcode'`, `'investigationDrawer'`). Where appropriate, components include both fields or aliases. `daAppShell.handleNodeSelect` consumes `nodeId` directly, preserving the core invariant that selecting a node never alters view navigation or project selection (`SELECTION != NAVIGATION`).

### Conflict 3: Dual-Snapshot Comparison Modal Ownership Allowlist
- **Parties:** WS-5 (Portfolio Workflows) vs Integration Allowlist.
- **Description:** `daSnapshotComparisonModal` was referenced in earlier planning documents but omitted from the WS-5 task allowlist.
- **Resolution:** WS-5 properly deferred the creation of `daSnapshotComparisonModal`, implementing only the necessary backend query methods in `DAGraphController` and `DAAnalysisHistoryService`. No unauthorized files were created.

### Conflict 4: DEC-01 Ingestion Integrity and Chunk Count Verification
- **Parties:** WS-5 vs Platform Metadata.
- **Description:** Earlier proposals suggested adding `Expected_Chunks__c` custom field to `DA_Analysis_Run__c`.
- **Resolution:** Per Architectural Review Factual Audit and amended DEC-01, redundant schema fields were rejected. The existing schema fields `Status__c` and `Total_Chunks__c` were utilized:
  ```sql
  Status__c == 'AVAILABLE' AND COUNT(Id) == Total_Chunks__c
  ```
  Verified in `DAGraphController.cls` using bulkified aggregate queries outside loops.

### Conflict 5: W9 Refactoring Simulation Scope
- **Parties:** WS-6 vs Executive Authorization Governance.
- **Description:** WS-6 implemented W9-1 and W9-3 without prior Project Owner executive authorization.
- **Resolution:** All W9 assets are quarantined in Git branch `unauthorized-w9-quarantine` and patch `UNAUTHORIZED_W9_IMPLEMENTATION.patch`. They are isolated from the application shell navigation and excluded from production acceptance.
