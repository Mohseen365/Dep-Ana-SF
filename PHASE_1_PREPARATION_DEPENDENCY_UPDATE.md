# Phase 1 Preparation Dependency Update

## Document Metadata
- **Classification**: Phase 1 Technical Dependency & Blocker Architecture
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1
- **Status**: AUTHORITATIVE DEPENDENCY TRACKING UPDATE

---

## 1. Updated Dependency Chains

Following the completion of the four preparation assignments, the Phase 1 dependency topology has been refined:

```mermaid
graph TD
    %% Executive Decisions
    PO1[PO-DEC-V2-01: REST Transport]
    PO2[PO-DEC-V2-02: Private OWD & Security]
    PO3[PO-DEC-V2-03: Lifecycle Schema & Unique Key]
    PO4[PO-DEC-V2-04: Sankey Shell Mount]
    PO5[PO-DEC-V2-05: Finding Persistence Schema]
    PO6[PO-DEC-V2-06: Secondary React Lenses Scope]

    %% Completed Preparations
    subgraph Completed_Preparation [Preparation Complete - Read-Only]
        PREP5[Agent 5: Component Mount Specifications]
        PREP8A[Agent 8A: Interaction & Palette Specifications]
        PREP9[Agent 9: Parity Matrix & Benchmarks]
        PREP10[Agent 10: Runner Audit & Ingestion Specs]
    end

    %% Implementation Chains
    PO2 --> A1[Agent 1: Security & Sharing Implementation]
    PO3 --> A2[Agent 2: Lifecycle & Chunk Uniqueness Implementation]

    PO1 --> A3[Agent 3: Ingestion REST Endpoint]
    A2 --> A3

    A3 --> A4[Agent 4: Node.js Upload Client]

    A1 --> A6[Agent 6: Finding Review Persistence]
    PO5 --> A6

    A3 --> A7[Agent 7: Project Upload UI]
    A1 --> A7

    PREP5 --> D1_SHELL[Coordinator D1: Mount Sankey in Shell]
    PO4 --> D1_SHELL

    PREP8A --> A8B[Agent 8B: Command Palette & Hover LWC]
    AUTH_8B[Separate PO Implementation Authorization] --> A8B

    A4 --> T10[Agent 10: Full Ingestion Pipeline Verification]
    A3 --> T10
    A2 --> T10
```

---

## 2. Granular Blocker Catalog

1. **PO Decision Blockers (Executive Authority)**:
   - `PO-DEC-V2-01` blocks Agent 3 REST implementation.
   - `PO-DEC-V2-02` blocks Agent 1 Security OWD transition.
   - `PO-DEC-V2-03` blocks Agent 2 Ingestion Lifecycle schema changes.
   - `PO-DEC-V2-04` blocks Coordinator D1 from mounting `daSankeyView` in `daAppShell`.
   - `PO-DEC-V2-05` blocks Agent 6 Finding Status persistence schema and controller updates.
   - `PO-DEC-V2-06` blocks formal closure of React lens parity gap items.

2. **Technical & Environmental Dependencies**:
   - **Wire Size Exceeding 6 MB Cap**: Blocks Agent 4 upload client until client-side pre-flight size checking and dynamic batch splitting are incorporated into the client design.
   - **Live Salesforce Org Absence**: Blocks formal certification of Apex heap and CPU governor safety for 10-chunk batches (retained as `NOT VERIFIED — LIVE SALESFORCE ORG REQUIRED`).
   - **Shared-Shell Invariant Protection**: Coordinator D1 exclusively controls `daAppShell.*`, preventing any feature workstream from creating merge conflicts or violating `SELECTION != NAVIGATION`.
