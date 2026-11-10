# Phase 0 Phase 1 Dispatch Sequence & Execution Wave Charter

## Document Metadata
- **Classification**: Phase 0 Phase 1 Dispatch Runbook & Execution Schedule
- **Audit Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1
- **Status**: AUTHORITATIVE DISPATCH DIRECTIVE

---

## 1. Executive Summary & Phased Parallelism Strategy

To maximize safe concurrency among ten implementation agents while completely preventing merge conflicts and governor-limit violations, Phase 1 is structured into **four sequential execution waves**.

### Critical Governance Precondition:
**No implementation code modifications may occur until the Project Owner ratifies the corresponding decision (PO-DEC-V2-01 through 06).**
Read-only analysis, specification drafting, and isolated test fixture preparation may proceed immediately.

---

## 2. Four-Wave Phased Dispatch Schedule

### Wave 1: Security Foundation & Independent Analysis (Agents 1, 9, 10-Prep, 5-Prep, 8-Prep)
- **Primary Blocking Dependency**: `PO-DEC-V2-02` (Project Owner approval of Private OWD).
- **Active Agents**:
  - **Agent 1 (Security & Project Isolation)**:
    - *Prerequisite*: `PO-DEC-V2-02` Ratified.
    - *Action*: Update `DA_Project__c` to Private OWD; remove `viewAllRecords` from `DA_Architecture_Analyst.permissionset-meta.xml`; write Apex sharing tests.
  - **Agent 9 (React Parity & Benchmarks)**:
    - *Prerequisite*: None (Read-only analysis).
    - *Action*: Run PBIM/CST/BQC benchmarks, document Locker/LWS thresholds, update `REACT_SALESFORCE_FEATURE_PARITY_MATRIX_V2.csv`.
  - **Agent 10 (Test Preparation)**:
    - *Prerequisite*: None (Test infrastructure).
    - *Action*: Build mock framework for direct Apex ingestion tests (`run-direct-ingestion-tests.cjs`).
  - **Agent 5 (Existing Component Packages Preparation)**:
    - *Prerequisite*: None (Read-only / isolated component verification).
    - *Action*: Verify `daSankeyView`, `daSnapshotComparisonModal`, `daPresetManager` standalone functionality; draft integration snippets for D1.
  - **Agent 8 (Command Palette & Hover Preparation)**:
    - *Prerequisite*: None (Isolated component development).
    - *Action*: Build standalone `c/daCommandPalette` component and mock Cytoscape hover card popups.

### Wave 2: Core Data Lifecycle & Ingestion Persistence (Agents 2, 6)
- **Primary Blocking Dependency**: Wave 1 Agent 1 Acceptance + `PO-DEC-V2-03` & `PO-DEC-V2-05`.
- **Active Agents**:
  - **Agent 2 (Ingestion Lifecycle & Persistence)**:
    - *Prerequisite*: Agent 1 signed off + `PO-DEC-V2-03` Ratified.
    - *Action*: Add `Status__c` picklist values (`CREATED`, `UPLOADING`, `VALIDATING`, `AVAILABLE`); add `Chunk_Key__c` unique field; enforce 10 MB payload cap in `DAGraphIngestionService.cls`.
  - **Agent 6 (Finding Review Persistence)**:
    - *Prerequisite*: Agent 1 signed off + `PO-DEC-V2-05` Ratified.
    - *Action*: Add `DA_Finding__c.Status__c`; implement `DAGraphController.updateFindingStatus`; bind status toggle in `daFindingsView.js`.

### Wave 3: Transport Exposure & Workflow UI (Agents 3, 4, 7, 8-Impl)
- **Primary Blocking Dependency**: Wave 2 Agent 2 Acceptance + `PO-DEC-V2-01`.
- **Active Agents**:
  - **Agent 3 (Apex REST Ingestion Transport)**:
    - *Prerequisite*: Agent 2 signed off + `PO-DEC-V2-01` Ratified.
    - *Action*: Implement `DAGraphIngestionRestResource.cls` and request/response DTOs; enforce batch chunk limits and user mode.
  - **Agent 4 (Node.js Analyzer Upload Client)**:
    - *Prerequisite*: Agent 3 REST Contract Frozen.
    - *Action*: Implement `scripts/salesforce-upload-client.cjs` and CLI upload flags; test chunk batch streaming against Agent 3 contract.
  - **Agent 7 (Project Creation & Upload Workflow UI)**:
    - *Prerequisite*: Agent 1 & Agent 3 Signed Off.
    - *Action*: Implement `c/daProjectCreateModal` and project selector integration; validate manifest file upload flow.
  - **Agent 8 (Command Palette & Graph Hover Finalization)**:
    - *Prerequisite*: None.
    - *Action*: Finalize component unit tests and package for D1 integration.

### Wave 4: Coordinator Integration & End-to-End Verification (Coordinator D1, Agent 10, Verifier D2, PO)
- **Primary Blocking Dependency**: Waves 1–3 Acceptance + `PO-DEC-V2-04`.
- **Active Roles**:
  - **Coordinator D1 (Central Shell Integration)**:
    - *Prerequisite*: `PO-DEC-V2-04` Ratified + Component Packages from Agents 5, 7, 8.
    - *Action*: Update `APPROVED_VIEWS` to 12 modes (add `river`); mount `daSankeyView`, `daSnapshotComparisonModal`, `daPresetManager`, `daCommandPalette`, and `daProjectCreateModal` into `daAppShell.*`; execute `run-coordinator-integration-suite.cjs`.
  - **Agent 10 (Ingestion & Release Test Suite)**:
    - *Prerequisite*: D1 Shell Integration Complete.
    - *Action*: Run full direct Apex unit test suite and Playwright E2E browser flows.
  - **Independent Verifier D2 (Final Verification)**:
    - *Prerequisite*: All tasks accepted by Workstream Leads and Coordinator D1.
    - *Action*: Independent read-only verification of all test logs, metadata diffs, and contract conformance.
  - **Project Owner (Final Ratification)**:
    - *Prerequisite*: D2 CERTIFIED PASS.
    - *Action*: Executive ratification and baseline freeze.

---

## 3. Concurrency & Contention Rules

1. **Parallelism Ceiling**: At most 4 implementation agents may actively write code concurrently, provided their file paths are completely disjoint.
2. **Read-Only Exemption**: Agent 9 and initial preparation steps for Agents 5, 8, 10 may run concurrently at any time.
3. **Zero Contention Gate**: If two agents require modification of the same subsystem (e.g. `DAGraphIngestionService.cls` by Agent 2 vs `DAGraphIngestionRestResource.cls` by Agent 3), Agent 3 MUST NOT begin until Agent 2 completes its changes and passes acceptance.
