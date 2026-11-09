# Contract Discrepancy and Reconciliation Register

## 1. Overview
This register tracks the technical contracts governing the React-to-Salesforce migration, comparing frozen v1.0.0 specifications against actual workstream implementations and remediation proposals.

## 2. Technical Contract Status Matrix

| Contract ID | Title | Frozen Version | Implementation Status | Discrepancy / Findings | Reconciliation & Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CONTRACT-01** | Canonical Graph Payload | v1.0.0 | Full Parity | None. Client-side chunk reassembly preserved. Zero Apex heap violations. Node/edge schemas verified. | Ratified & Preserved. Immutability verified across all suites. |
| **CONTRACT-02** | Layout Configuration & IDs | v1.0.0 | Full Parity | Extended layouts (`orbit`, `constellation`, `hierarchical`, `hybrid`) correctly mapped. | Ratified & Preserved across WS-2 and WS-4. |
| **CONTRACT-03** | Radar 9-Dimension Adapter | Proposed (v1.0.0 draft) | Implemented in `daRadarView` (WS-4) | Contract was not formally ratified by Project Owner prior to WS-4 dispatch. Component relies on 9 dimensions from Explorer radar adapter. | **NOT RATIFIED.** Component is isolated in `daRadarView`. Proposal documented in `CONTRACT_03_REMEDIATION_PROPOSAL.md`. Awaits PO executive authorization under DEC-04. |
| **CONTRACT-04** | Analysis Run History | v1.0.0 | Implemented in WS-5 | Two documented ambiguities: (1) Zero chunks behavior: UNKNOWN vs EMPTY; (2) SOQL ordering: `CreatedDate DESC` vs `CreatedDate DESC, Id DESC`. | WS-5 implemented deterministic ordering `CreatedDate DESC, Id DESC` and returns empty chunk list for zero chunks. Both behaviors verified in `run-analysis-history-tests.cjs`. |
| **CONTRACT-05** | Dual-Snapshot Retrieval & Diff | Proposed | Partially Implemented (WS-5 backend methods) | Full snapshot comparison modal deferred; retrieval methods implemented in `DAGraphController`. | Documented as Proposed. No schema additions introduced. |
| **CONTRACT-06** | Node Selection Event DTO | v1.0.0 | Reconciled Across All LWCs | WS-1 sidebar used `{ nodeId, sourceComponent: 'daSidebar' }`. CONTRACT-06 defines `{ nodeId, sourceView, meta }`. All 9 views emit `sourceView`. | **Reconciled:** `daSidebar` provides `sourceComponent` while child views provide both `sourceView` and optional `sourceComponent`. `daAppShell` tolerates both without breaking `SELECTION != NAVIGATION`. |
| **CONTRACT-07** | Refactoring Action DTOs | Proposed | Implemented in `daRefactoringEngine` (WS-6) | Not authorized under Wave 6–8 scope. MOVE_METHOD correctly rejected due to missing method-level AST. Tarjan SCC implemented. | **QUARANTINED.** Entire W9 implementation moved to quarantine branch and patch. |
| **CONTRACT-08** | Workspace Navigation & State | v1.0.0 | Full Parity | None. `activeViewMode` getter and `onviewchange` handling strictly enforce state. | Ratified & Preserved in WS-1 and Central Coordinator. |
| **CONTRACT-09** | Shared State & Invariants | v1.0.0 | Full Parity | None. `SELECTION != NAVIGATION` invariant rigorously maintained across all 24 suites. | Ratified & Preserved. Negative controls confirm immutability. |
