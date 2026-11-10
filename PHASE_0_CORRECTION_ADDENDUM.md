# Phase 0 Correction Addendum

## Document Metadata
- **Classification**: Phase 0 Readiness Corrections & Governance Reconciliation
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1
- **Status**: AUTHORITATIVE CORRECTION ADDENDUM

---

## 1. Executive Summary & Purpose

This addendum resolves the six key issues identified during independent review of Phase 0 deliverables, establishing an evidence-backed, internally consistent, and verified readiness package for Phase 1 dispatch. All historical Phase 0 baseline documents are preserved.

---

## 2. The Six Phase 0 Corrections

### Correction 1 — Apex Heap & Ingestion Safety Evidence
- Conflation of UTF-16 characters, UTF-8 bytes, HTTP request bytes, and Apex heap memory has been corrected.
- Synch Apex limit is 6 MB; async is 12 MB; HTTP body limit is 6 MB.
- Static estimation indicates a 10-chunk batch (1.31 MB raw chars) could reach 3.5–5.2 MB heap during deserialization, DTO allocation, and SObject staging.
- Evidence Classification: Live org Apex runtime heap safety and governor limit compliance are formally classified as **`NOT VERIFIED`** pending live staging org execution in Phase 1 by Agent 10. Dynamic batch downscaling (e.g. 10 to 5 chunks) is mandated as an architecture safety mechanism.

### Correction 2 — Agent 8 Preparation vs. Implementation Separation
- Inconsistent classification of Agent 8 has been resolved by dividing the scope:
  - **Agent 8A (Read-Only Preparation)**: Interaction specs, keyboard mappings, Cytoscape hit-test contracts. Status: **READY FOR READ-ONLY PREPARATION ONLY**.
  - **Agent 8B (Implementation)**: `daCommandPalette` component and graph hover UI in `daGraphViewer`. Status: **BLOCKED BY PROJECT OWNER DECISION** (Requires separate implementation authorization).

### Correction 3 — Contract Reconciliation Ownership & Governance
- D1 coordinates technical divergence across `CONTRACT-04` (zero-schema invariant vs existing metadata), `CONTRACT-05` (ratified status header), and `CONTRACT-08` (view mode registry).
- Technical evidence is provided by Agent 2 (ingestion), Agent 5 (mounting), and Agent 9 (parity).
- Exclusive authority over contract text, scope amendments, and approvals is retained exclusively by the **Project Owner**.

### Correction 4 — Agent 9 Parity Matrix Authority
- Agent 9 is responsible for technical investigation, benchmarking, and drafting the proposed parity matrix (`REACT_SALESFORCE_FEATURE_PARITY_MATRIX_PROPOSED.csv`).
- Integration Coordinator D1 retains sole authority to review and incorporate proposed additions into the authoritative migration gap register.

### Correction 5 — Exhaustive Test Runner Inventory & Execution Evidence
- All 31 discovered offline test runners in `scratch/salesforce-poc/tests/` were individually executed via Node.js.
- Execution outcome: **31 EXECUTED_PASS**, 0 FAIL, 0 BLOCKED.
- Clear distinction established: offline Node.js runners validate syntactical and logical LWC/Apex structure, but cannot prove Apex runtime governor safety in a live multi-tenant Salesforce org.

### Correction 6 — Granular Rollback & Recovery Procedures
- Detailed, domain-specific rollback procedures established for Security (OWD/permissions), Ingestion (lifecycle/chunks), Finding Review Persistence, and Component Mounting, including triggers, owners, actions, data preservation, and validation.

---

## 3. Scope Boundaries & Invariants
- Wave 5A remains **RATIFIED AND FORMALLY CLOSED**.
- Wave 9 refactoring engine remains **QUARANTINED** via `.forceignore`.
- Phase 0 strictly prohibits production code or metadata modification.
