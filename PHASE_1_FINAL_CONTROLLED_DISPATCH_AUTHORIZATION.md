# Phase 1 Final Controlled Dispatch Authorization

## Document Identification
- **Document Type**: Executive Implementation Dispatch & Authorization Order
- **Classification**: Integration Coordinator D1 Dispatch Directives & Project Owner Mandate
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1, Independent Verifier D2
- **Status**: AUTHORITATIVE IMPLEMENTATION DISPATCH DIRECTIVE

---

## 1. Executive Dispatch Authorization

In accordance with explicit Project Owner authorization under DEC-04 Alternative 4:
- All six decisions (`PO-DEC-V2-01` through `PO-DEC-V2-06`) are formally ratified as `PROJECT_OWNER_APPROVED`.
- Implementation scope for Agent 8B (Command Palette and Graph Hover) is formally authorized under strict isolation boundaries.
- All technical, security, and governance corrections identified during the preparation review have been resolved, verified, and documented.
- Authoritative execution follows the six-stage sequence (Stage A: Package Implementation, Stage B: Incremental Integration, Stage C: Integrated Regression, Stage D: Parity/Benchmarks, Stage E: Independent Verification, Stage F: PO Ratification).

**CONTROLLED DISPATCH ORDER**:
Execution of **Group A** implementation tasks is authorized to commence immediately under the strict file-ownership boundaries and interface conditions set forth below.

---

## 2. Group A Immediate Permitted Scope and Boundaries

The following six agents in Group A are authorized to begin work immediately:

1. **Agent 1 (Salesforce Security & Project Isolation)**:
   - *Status*: `UNBLOCKED_IMPLEMENTATION`
   - *Permitted Work*: Audit and verify actual relationship metadata; update `DA_Project__c` OWD to `Private`; configure `DA_Architecture_Analyst` permission set (FLS for 29 custom fields, excluding Master-Detail and custom required fields); implement `DAProjectSecurityService.cls` enforcing runtime authorization-time expiry (< 4-hour lease) independent of share deletion, explicit revocation, and append-only audit protections on `DA_Security_Audit_Log__c`.
   - *Restrictions*: Must establish actual relationship metadata before relying on inherited sharing. Broad object-level `View All` or OWD rollbacks are strictly barred.

2. **Agent 2 (Ingestion Lifecycle & Persistence)**:
   - *Scope A Status*: `UNBLOCKED_IMPLEMENTATION` (Independent Lifecycle/Schema)
     - *Permitted Work*: Draft `DAGraphIngestionService.cls` lifecycle state machine (`CREATED -> UPLOADING -> VALIDATING -> AVAILABLE`); define `DA_Analysis_Run__c.Status__c` picklist values; define `DA_Graph_Chunk__c.Chunk_Key__c` unique constraint metadata; deterministic chunk validation; isolated schema unit tests.
     - *Restrictions*: Unique constraint activation requires pre-existing duplicate data audit and recovery planning.
   - *Scope B Status*: `BLOCKED_PENDING_INTERFACE` (Security-Dependent Persistence Integration)
     - *Permitted Work*: Pre-integration stubbing and design for project-level persistence.
     - *Restrictions*: Security-dependent persistence operations and project-level authorization calls must wait for Agent 1's published security interface (`DAProjectSecurityService.cls`).

3. **Agent 5 (Existing Component Package Preparation)**:
   - *Status*: `PARALLEL_PREPARATION_ONLY`
   - *Permitted Work*: Inspect and prepare component packages for `daSankeyView` (Pure SVG Dependency River), `daSnapshotComparisonModal` (tabular diffs), and `daPresetManager`; verify existing component unit tests; formulate integration contracts and mounting recommendations for D1.
   - *Restrictions*: STRICT PROHIBITION on modifying `daAppShell.*`, `daHeader.*`, or `daSidebar.*`. Agent 5 cannot perform shell integration.

4. **Agent 8B (Command Palette & Graph Hover Implementation)**:
   - *Status*: `UNBLOCKED_IMPLEMENTATION`
   - *Permitted Work*: Implement `daCommandPalette` LWC with global keyboard shortcuts (`Ctrl+K`/`Cmd+K`); implement `daGraphViewer` hover cards (200ms debounce) for nodes and edges; construct focused offline unit tests.
   - *Restrictions*: Must preserve `SELECTION != NAVIGATION` invariant at all times. Must preserve frozen Selection Event DTO (CONTRACT-06 v1.0.0). No second Cytoscape canvas instance. No modifications to shared shell files.

5. **Agent 9 (React Parity & Performance Benchmarks)**:
   - *Status*: `UNBLOCKED_IMPLEMENTATION`
   - *Permitted Work*: Update proposed feature parity matrix (`REACT_SALESFORCE_FEATURE_PARITY_MATRIX_PROPOSED.csv`) reflecting the Project Owner's ratification of secondary React lenses (Heatmap, Tree, Profile, Four-Direction) as out-of-scope differences; execute baseline performance benchmark harness (`node wave1/B2/bench/run-benchmarks.cjs`) across PBIM, CST, and BQC datasets.
   - *Restrictions*: Cannot unilaterally modify frozen technical contracts. D1 retains exclusive authority over authoritative parity register freezing.

6. **Agent 10 (Ingestion & Release Test Engineering)**:
   - *Status*: `UNBLOCKED_IMPLEMENTATION`
   - *Permitted Work*: Scaffold shared test harnesses in `scratch/salesforce-poc/tests/`; draft multi-threaded external concurrency runners targeting live Salesforce test endpoints; document reproducible evidence. Pre-integration test preparation in Stage A.
   - *Restrictions*: Must coordinate test expectations with implementation owners (Agent 2 and Agent 3); must not alter implementation code to force tests to pass; must strictly distinguish offline mocked tests from live Salesforce org execution. Consolidated integrated regression occurs in Stage C post-integration.

---

## 3. Independent Interface Gates for Group B and Group C

Implementation work in Groups B and C remains **strictly blocked** behind independent directed interface gates:

### Group B (Ingestion Transport Pipeline)
- **Agent 3 (Apex REST Ingestion Transport)**:
  - *Status*: `BLOCKED_PENDING_INTERFACE`
  - *Gate*: Blocked until Agent 1 publishes the security interface (`DAProjectSecurityService.cls`) AND Agent 2 publishes the persistence service interface (`DAGraphIngestionService.cls`).
- **Agent 4 (Node.js Analyzer Upload Client)**:
  - *Status*: `BLOCKED_PENDING_INTERFACE`
  - *Gate*: Blocked until Agent 3 publishes and freezes the REST API contract (`DAGraphIngestionRestResource.cls` and DTOs). Bound by `PHASE_1_INGESTION_HTTP_BATCHING_ACCEPTANCE_SPEC.md` to enforce 5 MiB wire ceiling and dynamic downscaling.

### Group C (Persistent Workflows - Decoupled Gates)
- **Agent 6 (Finding Review Persistence)**:
  - *Status*: `BLOCKED_PENDING_INTERFACE`
  - *Independent Gate*: Blocked until Agent 1 publishes the project security context interface ONLY. Does NOT depend on Agent 3 REST transport.
- **Agent 7 (Project Creation & Upload UI Workflow)**:
  - *Status*: `BLOCKED_PENDING_INTERFACE`
  - *Dual Gates*: Blocked until Agent 1 publishes the security interface AND Agent 3 completes and freezes the REST ingestion endpoint.

---

## 4. Group D (Coordinator Integration, Regression, and Independent Verification)

- **Stage B Incremental Integration (D1)**: Integration Coordinator D1 exclusively performs shell modifications in `daAppShell.*` (registering View 12 `river`, embedding `<c-da-sankey-view>`, mounting modals, binding Command Palette) as prerequisite packages are accepted. Does not wait for unrelated tracks.
- **Stage C Integrated Regression (Agent 10)**: Executes consolidated regression and browser E2E test suite strictly post-integration.
- **Stage D Parity & Benchmarking (Agent 9)**: Validates integrated feature parity and executes PBIM/CST/BQC benchmarks.
- **Stage E Independent Verification (D2)**: Independent Verifier D2 operates in a strictly read-only capacity, conducting forensic verification of deliverables, test evidence, and git provenance post-integration.
- **Stage F Milestone Ratification (Project Owner)**: Project Owner holds exclusive authority to ratify completed milestones.

---

## 5. Invariant & Safety Prohibitions

1. **NO SALESFORCE PRODUCTION DEPLOYMENT**:
   - This dispatch authorizes local development, sandboxes, and verification harnesses only.
   - Deployment to a live Salesforce production environment is strictly prohibited and requires a separate, explicit Project Owner authorization under DEC-04 Alternative 4.
2. **WAVE 5A CLOSURE**:
   - Wave 5A remains formally ratified and closed (`PO-RAT-WAVE5A-2026-11-10`). No reopening of closed Wave 5A deliverables is permitted.
3. **WAVE 9 QUARANTINE**:
   - Quarantined refactoring components (`daRefactoringEngine` and `daRefactorHandoffModal`) remain strictly quarantined and excluded from deployment packaging via `.forceignore` and `package.xml`.
