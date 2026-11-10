# Phase 0 Revised Dependency Graph

## Document Metadata
- **Classification**: Phase 0 Critical Path & Dependency Architecture (Revised)
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1
- **Status**: AUTHORITATIVE REVISED DEPENDENCY GRAPH

---

## 1. Critical Path Overview

`PO Decision Ratification (PO-DEC-V2-01..06)` -> `Agent 1 (Security & Private OWD)` -> `Agent 2 (Ingestion Lifecycle & Chunk Key)` -> `Agent 3 (REST Ingestion Transport)` -> `Agent 4 (Node.js Upload Client)` -> `Agent 7 (Project Create/Upload UI)` -> `Coordinator D1 Integration` -> `Agent 10 Regression Suite` -> `D2 Independent Verification` -> `PO Final Ratification`.

---

## 2. Phased Architecture & Parallel Preparation

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

## 3. Safe Parallel Execution & Stop Conditions
- Parallel preparation is authorized immediately for Agents 5, 8A, 9, 10.
- All code modifications by Agents 1, 2, 3, 4, 6, 7, 8B are strictly blocked until PO approval.
