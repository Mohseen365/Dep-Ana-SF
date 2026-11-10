# Phase 0 Master Dependency Graph (Corrected)

## Document Metadata
- **Classification**: Phase 0 Critical Path & Dependency Architecture
- **Audit Date**: 2026-11-10 (Correction Pass)
- **Auditor**: Integration Coordinator D1
- **Status**: AUTHORITATIVE DEPENDENCY GRAPH

---

## 1. Executive Summary & Critical Path Overview

To execute the remediation of all 24 migration gaps safely and concurrently, the dependency graph enforces strict sequencing across four discrete waves, explicitly distinguishing **read-only preparation** from **code-modifying implementation**.

### Critical Path:
`PO Decision Ratification` -> `Agent 1 (Security & Private OWD)` -> `Agent 2 (Ingestion Lifecycle & Chunk Uniqueness)` -> `Agent 3 (Apex REST Transport)` -> `Agent 4 (Node.js Upload Client)` -> `Agent 7 (Project Creation & Upload UI)` -> `Coordinator D1 Integration` -> `Agent 10 Regression Suite` -> `D2 Independent Verification` -> `PO Final Ratification`.

---

## 2. End-to-End Master Dependency Diagram

```mermaid
graph TD
    subgraph PO_GATE ["Project Owner Governance Gate (Mandatory Approval)"]
        PO1[PO-DEC-V2-01: REST Transport]
        PO2[PO-DEC-V2-02: Private OWD & Security]
        PO3[PO-DEC-V2-03: Run Lifecycle & Schema]
        PO4[PO-DEC-V2-04: River 12th View Mount]
        PO5[PO-DEC-V2-05: Finding Persistence]
        PO6[PO-DEC-V2-06: Secondary React Lenses]
    end

    subgraph WAVE_1 ["Wave 1: Foundation (Security & Read-Only Preparation)"]
        A1[Agent 1: Security & Project Isolation<br>GAP-SEC-01, GAP-SEC-02]
        A9[Agent 9: React Parity & Benchmarks<br>GAP-PAR-01..04 (Read-Only)]
        A10_PREP[Agent 10: Test Scaffolding Prep<br>GAP-TEST-01 (Offline Harness)]
        A5_PREP[Agent 5: Component Package Prep<br>GAP-MNT-01..03 (Isolated)]
        A8A_PREP[Agent 8A: Command Palette & Hover Prep<br>GAP-WKF-03..04 (Read-Only Specs)]
    end

    subgraph WAVE_2 ["Wave 2: Core Data Lifecycle & Ingestion"]
        A2[Agent 2: Ingestion Lifecycle & Schema<br>GAP-ING-03..05, GAP-CON-01]
        A6[Agent 6: Finding Review Persistence<br>GAP-WKF-01]
    end

    subgraph WAVE_3 ["Wave 3: Transport & Workflow UI"]
        A3[Agent 3: Apex REST Ingestion Transport<br>GAP-ING-01]
        A4[Agent 4: Node.js Analyzer Upload Client<br>GAP-ING-02]
        A7[Agent 7: Project Create & Upload UI<br>GAP-WKF-02]
        A8B_IMPL[Agent 8B: Command Palette & Hover Impl<br>Requires Separate Implementation Auth]
    end

    subgraph WAVE_4 ["Wave 4: Coordinator Integration & Final Verification"]
        D1_INT[Coordinator D1: Central Shell Integration<br>daAppShell 12-View Registration & Mounting]
        A10_E2E[Agent 10: Full Ingestion & E2E Verification<br>GAP-ENV-01, GAP-ENV-02]
        D2_AUDIT[Independent Verifier D2: Read-Only Verification]
        PO_RAT[Project Owner: Final Program Ratification]
    end

    %% Governance Gate Dependencies
    PO2 --> A1
    PO3 --> A2
    PO1 --> A3
    PO4 --> D1_INT
    PO5 --> A6

    %% Implementation Dependencies
    A1 -->|Security Context & OWD Established| A2
    A1 -->|Security Context| A6
    A1 -->|Membership Model| A7
    A2 -->|Lifecycle & Chunk Key Service Ready| A3
    A3 -->|Approved REST API Contract| A4
    A3 -->|Apex Ingestion Endpoint Ready| A7
    A2 -->|Ingestion Service Signoff| A10_PREP

    %% Component Handoffs to D1
    A5_PREP -->|River & Snapshot Packages Ready| D1_INT
    A7 -->|Project Creation Modal Ready| D1_INT
    A8B_IMPL -->|Command Palette Component Ready| D1_INT

    %% Verification & Ratification
    D1_INT --> A10_E2E
    A10_E2E --> D2_AUDIT
    D2_AUDIT --> PO_RAT
```

---

## 3. Strict Predecessor & Successor Matrix

| Task / Agent | Mandatory Predecessors | Permitted Successors | Interface Freeze Point | Current Dispatch Classification |
|---|---|---|---|---|
| **Agent 1** (Security) | `PO-DEC-V2-02` | Agent 2, Agent 3, Agent 6, Agent 7 | Object OWD and Permission Set XML frozen | BLOCKED BY PROJECT OWNER DECISION |
| **Agent 2** (Ingestion Lifecycle) | `PO-DEC-V2-03`, Agent 1 Acceptance | Agent 3, Agent 10 | `DAGraphIngestionService.cls` method signatures frozen | BLOCKED BY PROJECT OWNER DECISION |
| **Agent 3** (REST Transport) | `PO-DEC-V2-01`, Agent 1 & Agent 2 Acceptance | Agent 4, Agent 7 | REST URL mapping and DTO schemas frozen | BLOCKED BY PROJECT OWNER DECISION |
| **Agent 4** (Node.js Upload Client) | Agent 3 REST Contract Freeze | Agent 10 E2E Harness | Node CLI arguments and response parsing frozen | BLOCKED BY TECHNICAL DEPENDENCY |
| **Agent 5** (Component Packages) | None (Prep); `PO-DEC-V2-04` (Mounting) | Coordinator D1 Integration | Component `@api` properties and custom event schemas frozen | READY FOR READ-ONLY PREPARATION ONLY |
| **Agent 6** (Finding Persistence) | `PO-DEC-V2-05`, Agent 1 Acceptance | Coordinator D1 Integration | Apex `updateFindingStatus` signature frozen | BLOCKED BY PROJECT OWNER DECISION |
| **Agent 7** (Project Create / Upload UI) | Agent 1 & Agent 3 Acceptance | Coordinator D1 Integration | Component modal events frozen | BLOCKED BY TECHNICAL DEPENDENCY |
| **Agent 8A** (Command Palette & Hover Prep) | None (Read-only specs) | Agent 8B Implementation | Keyboard shortcuts & hit-test contracts | READY FOR READ-ONLY PREPARATION ONLY |
| **Agent 8B** (Command Palette & Hover Impl) | Agent 8A Prep & Separate PO Auth | Coordinator D1 Integration | Component bundle files | BLOCKED BY PROJECT OWNER DECISION |
| **Agent 9** (Parity & Benchmarks) | None (Read-only analysis) | Parity Matrix Proposal | Benchmark metrics published; D1 reviews | READY FOR DISPATCH (Read-Only Analysis) |
| **Agent 10** (Test Engineering) | None (Offline Scaffolding); Agent 2/3 for Live | Independent Verifier D2 | Test suites executed and logs captured | READY FOR DISPATCH (Test Scaffolding) |
| **Coordinator D1** (Shell Integration) | `PO-DEC-V2-04`, Agent 5, 7, 8 Packages | Agent 10 Full E2E & D2 | `daAppShell` 12-view baseline frozen | INTEGRATION COORDINATOR EXCLUSIVE |
| **Verifier D2** (Independent Verification) | D1 Joint Acceptance across all tasks | Project Owner Ratification | Final Verification Report issued | STRICTLY READ-ONLY VERIFIER |
