# Master Gap Dependency & Critical Path Analysis V2

## Document Identification
- **Governance Reference**: Master Execution Board & Wave Planning
- **Audit Date**: 2026-11-10
- **Auditor**: Jules Master Dispatch & Dependency Coordinator
- **Status**: Authoritative Dependency Graph & Parallel Workstream Charter V2

---

## 1. Executive Summary

This document defines the strict execution dependency graph, shared-file collision risks, and parallelization strategy across all six proposed remediation workstreams (WS-A through WS-F) covering the 24 confirmed migration gaps.

To ensure stability and eliminate merge conflicts:
- **Zero Parallel Modifications on Shared Files**: Modifications to `daAppShell.*`, `daHeader.*`, `DAGraphIngestionService.cls`, and `DA_Architecture_Analyst.permissionset-meta.xml` must be strictly serialized.
- **Architectural Prerequisite (WS-B before WS-A)**: Security boundaries (Private OWD, project membership) must be finalized before public REST ingestion endpoints are deployed.
- **Integration Prerequisite (D1 Exclusivity)**: Component mounting into `daAppShell` (WS-C) is exclusively coordinated by Agent D1.

---

## 2. Workstream Charters & Gap Allocations

| Workstream | Focus Domain | Allocated Gaps | Shared Files Owned / Touched | Concurrency Constraint |
|---|---|---|---|---|
| **WS-A** | Ingestion & Persistence | GAP-ING-01, GAP-ING-02, GAP-ING-03, GAP-ING-04, GAP-ING-05, GAP-CON-01 | `DAGraphIngestionService.cls`, `DAGraphController.cls` | Must serialize after WS-B data model signoff |
| **WS-B** | Security & Project Isolation | GAP-SEC-01, GAP-SEC-02 | `DA_Project__c.object-meta.xml`, `DA_Architecture_Analyst.permissionset-meta.xml` | Prerequisite foundation for WS-A & WS-D |
| **WS-C** | Mounting & Shell Integration | GAP-MNT-01, GAP-MNT-02, GAP-MNT-03, GAP-CON-02, GAP-CON-03 | `daAppShell.js`, `daAppShell.html`, `daHeader.html`, `daSidebar.html` | Sole coordinator integration (Agent D1) |
| **WS-D** | Persistent Workflows & Missing UI | GAP-WKF-01, GAP-WKF-02, GAP-WKF-03, GAP-WKF-04 | `daFindingsView.*`, `daProjectSelector.*`, `daGraphViewer.*` | Feature branches isolated per component |
| **WS-E** | React Parity & Benchmarking | GAP-PAR-01, GAP-PAR-02, GAP-PAR-03, GAP-PAR-04 | Documentation, static resources, layout configs | Fully parallelizable / read-only analysis |
| **WS-F** | Testing, Evidence & Governance | GAP-TEST-01, GAP-ENV-01, GAP-ENV-02 | `force-app/.../tests/*`, `scratch/.../tests/*` | Fully parallelizable test harness expansion |

---

## 3. Strict Remediation Critical Path (Four Phased Waves)

```
   +-------------------------------------------------------------+
   | PHASE 1: Security & Governance Baseline Foundation          |
   | - GAP-SEC-01: Remove viewAllRecords from Permission Set     |
   | - GAP-SEC-02: Enforce Private OWD on DA_Project__c          |
   | - GAP-CON-01, GAP-CON-02, GAP-CON-03: Contract Alignment    |
   +-------------------------------------------------------------+
                                 |
                                 v
   +-------------------------------------------------------------+
   | PHASE 2: Ingestion Lifecycle & Data Integrity Hardening     |
   | - GAP-ING-03: Enforce CREATED -> UPLOADING -> AVAILABLE     |
   | - GAP-ING-04: Implement 10MB Total Payload Cap in Apex      |
   | - GAP-ING-05: Database Unique Constraint on Chunk_Key__c    |
   | - GAP-TEST-01: Ingestion Unit Tests & Offline Runner        |
   | - GAP-ING-01 & GAP-ING-02: REST Resource & CLI Transport    |
   +-------------------------------------------------------------+
                                 |
                                 v
   +-------------------------------------------------------------+
   | PHASE 3: Coordinator Shell Mounting & Workflow Integration  |
   | - GAP-MNT-01: Mount daSankeyView on view "river"            |
   | - GAP-MNT-02: Mount daSnapshotComparisonModal in daAppShell |
   | - GAP-MNT-03: Mount daPresetManager in daSidebar            |
   | - GAP-WKF-01: Finding Review Status Apex & Field Schema     |
   | - GAP-WKF-02: Project Creation & Upload UI Modal            |
   +-------------------------------------------------------------+
                                 |
                                 v
   +-------------------------------------------------------------+
   | PHASE 4: Secondary Workflows, Parity & Final Verification   |
   | - GAP-WKF-03: Command Palette (Cmd+K) Component             |
   | - GAP-WKF-04: Cytoscape Rich Hover Cards                    |
   | - GAP-PAR-02 / PAR-03: Concurrency & Performance Audits     |
   | - GAP-ENV-01 / ENV-02: Live Org & Playwright E2E Suites     |
   +-------------------------------------------------------------+
```

---

## 4. Shared Ownership & Collision Prevention Protocol

1. **`daAppShell` Exclusivity**:
   No workstream may modify `daAppShell.js` or `daAppShell.html` directly. All mounting requests (WS-C, WS-D) must be delivered as component packages to Integration Coordinator D1.
2. **Permission Set Merges**:
   All field permission additions (`DA_Finding__c.Status__c`, `DA_Graph_Chunk__c.Chunk_Key__c`) must be batched and applied by WS-B after Phase 1.
3. **Dual Acceptance Requirement**:
   In accordance with core governance, each workstream lead must sign technical acceptance with Coordinator D1, followed by read-only independent verification by D2.
