# Phase 1 Final Dependency and Critical Path

## Document Identification
- **Document Type**: Implementation Dependency Analysis & Scheduling Runbook
- **Classification**: Master Execution Architecture
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1, Independent Verifier D2
- **Status**: AUTHORITATIVE IMPLEMENTATION SCHEDULE

---

## 1. Executive Summary & Dispatch Strategy

With the Project Owner's explicit authorization of all six PO decisions and Agent 8B's implementation scope, the implementation phase is organized into **four structured dispatch groups (Groups A through D)**.

### Core Principles
1. **Maximize Safe Parallelism**: Agents with zero mutual file overlap or unblocked preconditions launch immediately in Group A.
2. **Strict Interface Gates**: Dependent agents in Groups B and C launch only after interface contracts from Group A are published and frozen.
3. **Exclusive Shell Integration**: Integration Coordinator D1 exclusively controls all changes to shared shell files (`daAppShell.*`, `daHeader.*`, `daSidebar.*`).
4. **Independent Verification**: Independent Verifier D2 audits all completions post-integration without executing code repairs.
5. **No Production Deployment**: Execution is restricted to local development, sandboxes, and verification harnesses.

---

## 2. Four Structured Dispatch Groups

```
┌────────────────────────────────────────────────────────────────────────┐
│ GROUP A: Foundations & Parallel Preparation (LAUNCH IMMEDIATELY)       │
│ • Agent 1: Salesforce Security, Private OWD, FLS Updates               │
│ • Agent 2: Ingestion Lifecycle, Status Picklist, Unique Chunk Key      │
│ • Agent 5: Component Packages (daSankeyView, daSnapshotComparisonModal)│
│ • Agent 8B: Command Palette & Graph Hover (preserves SELECTION!=NAV)   │
│ • Agent 9: Parity Matrix Update (ratify out-of-scope) & Benchmarks     │
│ • Agent 10: Ingestion Test Harness Scaffolding & Multi-Thread Runner   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
┌─────────────────────────────────────────┐ ┌───────────────────────────┐
│ GROUP B: Ingestion Transport Pipeline   │ │ GROUP C: Persistent       │
│ • Agent 3: Apex REST Ingestion Transport│ │          Workflows        │
│   (Requires Agent 1 & Agent 2 interfaces)│ │ • Agent 6: Finding Review │
│ • Agent 4: Node.js Analyzer Client      │ │   Persistence             │
│   (Requires Agent 3 REST contract;      │ │   (Requires Agent 1)      │
│    Enforces 5 MiB wire ceiling)         │ │ • Agent 7: Project Create │
│                                         │ │   UI (Req Agent 1 & 3)    │
└────────────────────┬────────────────────┘ └─────────────┬─────────────┘
                     │                                    │
                     └─────────────────┬──────────────────┘
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GROUP D: Coordinator Integration, Regression & Final Verification      │
│ • Integration Coordinator D1: Integrates packages & mounts shell views │
│ • Agent 10: Runs complete regression test suite                        │
│ • Agent 9: Benchmarks and parity verification                          │
│ • Independent Verifier D2: Independent audit and non-regression check  │
│ • Project Owner: Final milestone review                                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Group Detail and Interface Gates

### Group A: Foundations and Parallel Preparation
- **Participants**: Agent 1, Agent 2, Agent 5, Agent 8B, Agent 9, Agent 10.
- **Coordination Discipline**:
  - Agent 1 (`UNBLOCKED_IMPLEMENTATION`): Audits actual metadata relationships (`ControlledByParent` on `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, `DA_Annotation__c`; Lookup on `DA_User_Preference__c`), implements `DAProjectSecurityService.cls` with runtime authorization-time expiry (< 4-hour lease), explicit revocation, and append-only audit protections, and sets `DA_Project__c` OWD to `Private`.
  - Agent 2 (`UNBLOCKED_IMPLEMENTATION`): Independent lifecycle schema and persistence work unblocked; drafts `DA_Analysis_Run__c.Status__c` and `DA_Graph_Chunk__c.Chunk_Key__c` in `DAGraphIngestionService.cls`; security-dependent persistence awaits Agent 1's interface.
  - Agent 5 (`PARALLEL_PREPARATION_ONLY`): Packages `daSankeyView`, `daSnapshotComparisonModal`, and `daPresetManager` in isolation; prepares integration contracts for D1; strictly no shell edits.
  - Agent 8B (`UNBLOCKED_IMPLEMENTATION`): Implements `daCommandPalette` and hover cards within approved scope, strictly isolated from shell files, preserving `SELECTION != NAVIGATION`.
  - Agent 9 (`UNBLOCKED_IMPLEMENTATION`): Updates proposed parity matrix reflecting ratified out-of-scope lenses; executes benchmark harness; no unilateral frozen contract changes.
  - Agent 10 (`UNBLOCKED_IMPLEMENTATION`): Scaffolds shared test harnesses and external multi-threaded concurrency runners; coordinates expectations with implementation owners without tampering with code.

### Group B: Ingestion Transport Pipeline
- **Prerequisites**: Agent 1 security interface signoff AND Agent 2 persistence interface signoff.
- **Participants**:
  - **Agent 3 (Apex REST Transport)**: Exposes `@RestResource` in `DAGraphIngestionRestResource.cls`, handles DTO deserialization, user-mode validation, chunk batching, and invokes Agent 2's ingestion service.
  - **Agent 4 (Node.js Analyzer Upload Client)**: Launches once Agent 3 freezes REST API contract. Implements pre-flight wire measurement, dynamic batch downscaling under the 5 MiB ceiling, retry idempotency, and finalization calls.

### Group C: Persistent Workflows
- **Prerequisites**: Agent 1 security context available.
- **Participants**:
  - **Agent 6 (Finding Review Persistence)**: Expands `DA_Finding__c.Status__c`, updates `DAGraphController.cls`, and binds UI toggles in `daFindingsView`.
  - **Agent 7 (Project Creation & Upload UI)**: Expands `daProjectCreateModal` and `daProjectSelector` to handle file chunking and invoke REST transport endpoints (requires Agent 1 and Agent 3).

### Group D: Integration, Regression, and Independent Verification
- **Integration Coordinator D1**: Exclusively performs shell modifications in `daAppShell.*` (registering view 12 `river`, embedding `<c-da-sankey-view>`, mounting modals, binding Command Palette).
- **Agent 10**: Executes full test suite (31 offline runners, REST mocks, concurrency harnesses).
- **Agent 9**: Executes PBIM/CST/BQC performance benchmark harness.
- **Independent Verifier D2**: Conducts independent verification of provenance, file ownership boundaries, and non-regression.
- **Project Owner**: Formal milestone ratification.

---

## 4. Critical Path Schedule

The critical path of Phase 1 implementation is governed by the ingestion pipeline:

$$\text{Agent 1 (Security)} \longrightarrow \text{Agent 2 (Ingestion Persistence)} \longrightarrow \text{Agent 3 (Apex REST)} \longrightarrow \text{Agent 4 (Upload Client)} \longrightarrow \text{Agent 10 (E2E Verification)} \longrightarrow \text{D1 Shell Integration} \longrightarrow \text{D2 Audit}$$

- **Parallel Off-Path Tracks**:
  - Track 2 (Component Mounting): Agent 5 -> D1 Shell Integration (View 12).
  - Track 3 (Interaction Enhancements): Agent 8B -> D1 Shell Integration (Palette/Hover).
  - Track 4 (Finding Review Workflow): Agent 1 -> Agent 6 -> D1 Shell Integration.
  - Track 5 (Governance Parity): Agent 9 -> Authoritative Parity Register Freeze.

None of the off-path tracks block the critical ingestion path, allowing maximum safe implementation velocity.
