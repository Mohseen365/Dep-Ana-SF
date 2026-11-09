# Architecture Blockers, Technical Decisions & Governance Register

This document tracks all formal architectural decisions, unresolved trade-offs, and governance prerequisites requiring Lead Architect and Project Owner resolution.

---

## 1. Technical Decisions Register

### DEC-01: Analysis Run Ingestion Status & SOQL Compound Ordering
- **Context**: The `DA_Analysis_Run__c` custom object in `scratch/salesforce-poc/` does not include a `Status__c` field in some baseline schemas, creating ambiguity between runs that produced empty graphs versus runs that failed or were interrupted during chunk generation.
- **Decision (Option A Ratified)**:
  - If `DA_Analysis_Run__c` has 0 associated `DA_Graph_Chunk__c` records, status is classified as `EMPTY`.
  - If `DA_Analysis_Run__c` has >= 1 chunks, status is classified as `AVAILABLE`.
  - Incomplete or failed runs require explicit error logging via `DAErrorResponse` or external status tracking.
  - Queries ordering analysis runs must use deterministic compound ordering: `ORDER BY Run_Timestamp__c DESC, Id DESC` (or `CreatedDate DESC, Id DESC`).
- **Impact**: Eliminates non-deterministic ordering and race conditions during run selection.

### DEC-02: Graph Chunking, Payload Caps & Single-Canvas Invariant
- **Context**: Passing large graph structures into Salesforce risks exceeding Apex heap limits (6 MB sync / 12 MB async), browser memory limits, and LWC component re-render performance.
- **Decision (Option A Ratified)**:
  - Salesforce LongTextArea chunk size is strictly capped at **131,072 characters** (JavaScript UTF-16 code units).
  - Maximum total graph payload is strictly capped at **10,485,760 characters (~10 MB)**.
  - Surrogate pairs at chunk boundaries must be protected by rolling back 1 character to avoid malformed UTF-16 strings.
  - Single Cytoscape Canvas Invariant: A single canvas instance is maintained within `daGraphViewer` and re-used or cleanly destroyed/re-instantiated upon project/run switch.
- **Impact**: Guarantees zero browser crashes and predictable heap consumption.

### DEC-03: Refactoring Simulation Scoping & Tarjan SCC Semantics
- **Context**: React provides extensive refactoring simulation (`refactoring-simulation.ts`), but full method-level analysis requires AST metadata not present in Salesforce.
- **Decision (Option A Ratified)**:
  - Component/Class-Level Scoping: Simulation in Salesforce operates at the component/class/object level.
  - `MOVE_METHOD`: Deferred and unsupported due to lack of method metadata in CONTRACT-01.
  - `EXTRACT_CLASS`: Supported; `movedMethodList` is treated as non-operational informational metadata.
  - `BREAK_CYCLE` / `REMOVE_NODE`: Fully supported; mathematically verified using client-side Tarjan SCC.
  - Metric Semantics: `cyclicSccCountDelta = newCyclicSccCount - baseCyclicSccCount` (measures reduction in cyclic SCCs, not raw elementary cycle counts).
- **Impact**: Provides predictable simulation math while deferring deep AST parsing to external analyzers.

### DEC-04: Implementation Dispatch Governance & Signoff Authority

> **GOVERNANCE ANNOTATION (Wave 1 Audit - 9 November 2026):**
> **STALE GOVERNANCE TEXT WARNING:** The text below specifying "Alternative 3: Two-Phase Sequential Dispatch" is historical/stale. Under authoritative project governance, **DEC-04 Alternative 4 (Executive Project Owner Exclusive Signoff)** is the approved and binding governance model. Advisors and coordinators possess technical review authority only (e.g. Gate 1A); dispatch and contract ratification authority resides solely and exclusively with the Executive Project Owner. Alt-3 references across historical records are non-binding recommendations.

- **Context**: Multi-agent parallel implementation risks collisions, regressions, and unauthorized architectural deviations without formal signoff gates.
- **Decision (Alternative 3: Two-Phase Sequential Dispatch) [SUPERSEDED BY DEC-04 ALTERNATIVE 4]**:
  - **Gate 1A (Technical Certification)**: Lead Architect and Integration Coordinator must verify technical readiness, contract compliance, and test suite execution.
  - **Gate 1B (Integration Signoff)**: All 11 approved analytical views mounted in `daAppShell` with verified offline test pass rate (100% across all 24 runners).

### DEC-05: Application Shell View Expansion & Investigation Drawer Integration
- **Context**: `daAppShell` initially exposed only 3 view modes (`graph`, `matrix`, `findings`). Six workstreams had completed building 8 additional views and an investigation drawer, but they remained unmounted in the application shell.
- **Decision (Ratified)**:
  - `APPROVED_VIEWS` expanded to: `['graph', 'matrix', 'findings', 'dashboard', 'history', 'diagnostics', 'hotspots', 'radar', 'treemap', 'subway', 'dna']`.
  - All 11 view components mounted in `daAppShell.html` with reactive payload, selection, and filter criteria bindings.
  - `<c-da-investigation-drawer>` mounted as a persistent right-hand dockable drawer accessible across all views whenever a node is selected.
  - Strict preservation of the architectural invariant: **SELECTION ≠ NAVIGATION**.

---

## 2. Blockers & Remaining Actions Register

| Item ID | Category | Description | Status | Resolution Path |
| :--- | :--- | :--- | :--- | :--- |
| **BLK-01** | Live Org Acceptance | Target Salesforce org connection unavailable in headless container sandbox. | Open (By Design) | Maintain strict separation between offline unit/integration verification and live scratch org acceptance. |
| **BLK-02** | Static Resource D3 River | Sankey River requires d3-sankey library not yet approved as an authenticated static resource. | Deferred | Coordinate with Security Architect for static resource approval or port pure SVG Sankey math into `daLayoutEngine`. |
| **BLK-03** | Standalone Diff Modal | Dedicated dual-run snapshot comparison modal bundle not yet allocated in file ownership register. | Pending Allocation | Define formal LWC bundle path in authoritative task register (`daSnapshotComparisonModal`). |

---

## 3. Wave 1 Governance Verification Addendum (DEC-01, DEC-04, W9)

### 3.1 DEC-01 Schema and Apex Logic Verification
- **Metadata Inspection**:
  - `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Status__c.field-meta.xml`: Exists. Restricted picklist defining `AVAILABLE` (default), `EMPTY`, and `FAILED`.
  - `Total_Chunks__c.field-meta.xml`: Exists (Number 18, 0).
  - `Expected_Chunks__c.field-meta.xml`: **ABSENT / CONFIRMED NON-EXISTENT**. No redundant field introduced.
- **Apex Code Logic**:
  - `DAGraphController.cls` (lines 66, 85, 105, 124, 129): Enforces amended DEC-01 integrity rule: `Status__c == 'AVAILABLE' && count(persisted chunks) == Total_Chunks__c`.
  - `DAAnalysisHistoryService.cls` (lines 50, 68): Queries `Status__c` and maps to `DAAnalysisRunSummaryDTO.status`.
  - Ordering: Deterministic compound ordering `ORDER BY Run_Timestamp__c DESC, Id DESC` (or `CreatedDate DESC, Id DESC`) verified.

### 3.2 DEC-04 Full Repository Audit of Stale Alternative 3 Citations
A comprehensive search across the repository identified all occurrences of "Alternative 3", "Alt 3", and "Alt-3". All are classified as historical or superseded by DEC-04 Alternative 4:
1. `BLOCKERS_AND_DECISIONS.md`: Line 39 (Annotated above).
2. `PHASE_A5_DECISION_REGISTER.md`: Lines 34, 160–170 (Recorded as proposed working direction, explicitly non-binding).
3. `PHASE_A5_COMPLETION_REPORT.md`: Lines 18, 51, 180, 186 (Documented as recommendation pending formal ratification).
4. `PHASE_A5.2_CANONICAL_BASELINE_AND_GOVERNANCE_CLOSURE_REPORT.md`: Line 94.
5. `PHASE_A4_DECISION_AUTHORITY_AND_APPROVAL_MATRIX.csv`: Line 5 (Recorded as preferred recommendation pending PO ratification).
6. `PHASE_A4_GOVERNANCE_EVIDENCE_AND_READINESS_REPORT.md`: Lines 69, 211.
7. `PHASE_A4.2_COMPLETION_REPORT.md`: Lines 15, 29, 130, 157.
8. `PHASE_A4.3_COMPLETION_REPORT.md`: Lines 27, 128, 148.
9. `PHASE_A4_IMPLEMENTATION_AUTHORIZATION_TEMPLATE.md`: Lines 21, 40, 218, 287.
10. `GATE_1A_INTEGRATION_COORDINATOR_CERTIFICATION_RECORD.md`: Line 16.
11. `GATE_1A_FINAL_EVIDENCE_INTEGRITY_RECONCILIATION.md`: Line 5.
12. `GATE_1A_TECHNICAL_CERTIFICATION_EVIDENCE_PACKAGE.md`: Lines 5, 16, 25.
13. `GATE_1A_EVIDENCE_CORRECTION_AND_REVIEW_REPORT.md`: Lines 5, 23, 121.
14. `docs/waves-5-9/phase-a3/PHASE_A3_HUMAN_GOVERNANCE_DECISION_PACKAGE.md`: Line 472.
15. `docs/waves-5-9/phase-a3/PHASE_A3_FINAL_TECHNICAL_DECISION_PROPOSAL.md`: Line 214.
16. `docs/waves-5-9/phase-a2/WAVES_5_9_INTEGRATION_RESPONSIBILITY_MATRIX.csv`: Row DEC-04.

### 3.3 Wave 9 Quarantine Status Verification
- **UI Shell Mount Verification**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html`: Contains **zero** references to `<c-da-refactoring-engine>` or `<c-da-refactor-handoff-modal>`.
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`: Contains **zero** imports of `daRefactoringEngine` or `daRefactorHandoffModal`.
- **Other Components & Apex in Tree**:
  - `scratch/salesforce-poc/force-app/main/default/classes/`: Contains **zero** references to refactoring components.
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js`: Imports `generateHandoffMarkdown` and `generateHandoffJson` from `c/daRefactoringEngine`, but the modal itself is not mounted or triggered anywhere in the active UI.
  - `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`: Contains unit tests 20–25 verifying pure algorithm logic offline without touching the shell.
- **Master Live Task Registry**:
  - `MASTER_LIVE_TASK_REGISTRY.csv`: Formally marks:
    - `W9-1`: `UNAUTHORIZED`, `IMPLEMENTED`, `PASSED`, `QUARANTINED`, `NOT_AUTHORIZED`, Blocker: `Project Owner W9 Signoff`.
    - `W9-2`: `UNAUTHORIZED`, `DEFERRED`, `NOT_RUN`, `NOT_INTEGRATED`, `NOT_AUTHORIZED`, Blocker: `Project Owner W9 Signoff`.
    - `W9-3`: `UNAUTHORIZED`, `IMPLEMENTED`, `PASSED`, `QUARANTINED`, `NOT_AUTHORIZED`, Blocker: `Project Owner W9 Signoff`.
- **Conclusion**: W9 remains strictly quarantined, unintegrated, and unmounted.
