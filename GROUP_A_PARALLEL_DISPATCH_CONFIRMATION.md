# GROUP A PARALLEL DISPATCH CONFIRMATION

## Document Identification
- **Document Type**: Initial Dispatch Confirmation & Master Launch Directives
- **Coordinator**: Integration Coordinator D1 (Sole Integration Coordinator)
- **Authority**: Project Owner Mandate
- **Independent Verifier**: Independent Verifier D2
- **Date**: 2026-11-12
- **Baseline Git Commit**: `17502b832617666bcea26a9bbd2d6bd4310f47c9`
- **Active Branch**: `jules-12338440050225123151-106c7075`
- **Working Tree Status**: Clean (0 uncommitted modifications prior to dispatch)

---

## 1. Executive Dispatch Statement

In accordance with Project Owner directives and DEC-04 Alternative 4, Integration Coordinator D1 hereby confirms the formal launch of **Group A Parallel Execution**. All ten workstream tracks are dispatched concurrently under maximum safe parallelism. Independent tasks are launched immediately without waiting for unrelated tracks, while strict interface gating protects downstream stability.

No agent accepts its own work. All completed workstreams must undergo the mandatory 8-step acceptance protocol including joint signoff between the Workstream Lead and Integration Coordinator D1, followed by independent forensic verification by Independent Verifier D2.

---

## 2. Dispatch and Agent Launch Matrix

| Agent | Workstream Scope | Dispatch Classification | Initial Status | Immediate Permitted Scope | Gated Actions |
|---|---|---|---|---|---|
| **Agent 1** | Salesforce Security & Project Isolation | Active Implementation | `UNBLOCKED_IMPLEMENTATION` | Audit relationship metadata, configure Private OWD on `DA_Project__c`, deploy FLS permissions (29 eligible fields), implement `DAProjectSecurityService.cls`, deploy `DASecurityAuditLogTrigger` & `DAEmergencyAccessCleanupService.cls`. | No broad View All / Modify All; no tampering with business object triggers. |
| **Agent 2 [Scope A]** | Run Lifecycle & Chunk Uniqueness | Active Implementation | `UNBLOCKED_IMPLEMENTATION` | Implement lifecycle state machine in `DAGraphIngestionService.cls`, define `DA_Analysis_Run__c.Status__c` picklist, implement `DA_Graph_Chunk__c.Chunk_Key__c` unique constraint, chunk integrity validation. | None. Scope A is independent of Agent 1. |
| **Agent 2 [Scope B]** | Security-Dependent Persistence Integration | Preparation Only | `GATED_PENDING_INTERFACE` | Draft schema mapping, data access stubs, and isolation logic offline. | Gated on Agent 1 security interface signoff (`DAProjectSecurityService.cls`). Do not alter Private OWD or shared shell files. |
| **Agent 3** | Apex REST Ingestion Transport | Preparation Only | `INDEPENDENT_PREPARATION_AUTHORIZED` | Scaffold `@RestResource` routing, deserialization DTO structures, error handling templates in `DAGraphIngestionRestResource.cls`. | Implementation of live authorization and persistence calls gated on Agent 1 & Agent 2 Scope B interface signoffs. |
| **Agent 4** | Node.js Analyzer Upload Client | Preparation Only | `INDEPENDENT_PREPARATION_AUTHORIZED` | Construct client test harness, wire ceiling calculation stubs, and mock dynamic batching logic offline. | Live REST communication and contract freeze gated on Agent 3 publishing frozen REST contract. |
| **Agent 5** | Existing Component Packages (River, Snapshot, Presets) | Preparation Only | `PARALLEL_PREPARATION_ONLY` | Package and verify `daSankeyView` (native SVG View 12), `daSnapshotComparisonModal`, and `daPresetManager` in isolation; prepare mounting contracts. | STRICT PROHIBITION on touching shared shell files (`daAppShell.*`, `daHeader.*`, `daSidebar.*`). Shell integration reserved exclusively for D1. |
| **Agent 6** | Finding Review Persistence | Preparation Only | `INDEPENDENT_PREPARATION_AUTHORIZED` | Formulate finding status transition schemas and draft controller method specs for review persistence. | Gated on Agent 1 security context. Do not modify shared shell files or cross-project data. |
| **Agent 7** | Project Creation & Upload UI Workflow | Preparation Only | `INDEPENDENT_PREPARATION_AUTHORIZED` | Prepare UI component scaffolding for `daProjectCreateModal` and `daProjectSelector`, offline chunking mocks. | Wiring live upload workflow gated on Agent 1 security context AND Agent 3 frozen REST transport contract. |
| **Agent 8B** | Command Palette & Graph Hover Cards | Active Implementation | `UNBLOCKED_IMPLEMENTATION` | Implement `daCommandPalette` LWC (Ctrl+K navigation), implement 200ms debounced node/edge hover cards in `daGraphViewer`. | Preserve `SELECTION != NAVIGATION` invariant at all times. Preserve frozen selection DTO (CONTRACT-06 v1.0.0). No second Cytoscape canvas instance. No shell edits. |
| **Agent 9** | React Parity & Performance Benchmarks | Active Implementation | `UNBLOCKED_IMPLEMENTATION` | Maintain `REACT_SALESFORCE_FEATURE_PARITY_MATRIX.csv` reflecting PO-approved scope; execute PBIM/CST/BQC benchmark harness (`wave1/B2/bench/run-benchmarks.cjs`). | Read-only analysis. No unilateral modifications to frozen contracts. |
| **Agent 10** | Ingestion & Release Test Engineering | Active Implementation | `UNBLOCKED_IMPLEMENTATION` | Scaffold offline test harnesses, draft external multi-threaded concurrency runners, maintain test suite stability. | Do not tamper with implementation code to force tests to pass; distinguish offline mocks from live Salesforce org execution. |

---

## 3. Tasks Started Concurrently

1. **Task A1-1**: Security relationship metadata audit, Private OWD configuration, and FLS completion (Agent 1).
2. **Task A1-2**: `DAProjectSecurityService.cls` runtime authorization-time lease & revocation engine (Agent 1).
3. **Task A2-1**: Lifecycle state machine and chunk uniqueness constraints (Agent 2 Scope A).
4. **Task A8B-1**: `daCommandPalette` component implementation and keyboard shortcut bindings (Agent 8B).
5. **Task A8B-2**: `daGraphViewer` debounced node and edge hover card overlay (Agent 8B).
6. **Task A9-1**: Parity audit reconciliation and PO out-of-scope lens synchronization (Agent 9).
7. **Task A9-2**: Standard benchmark suite execution (PBIM, CST, BQC) (Agent 9).
8. **Task A10-1**: Regression test harness validation across 34 active runners (Agent 10).
9. **Task A10-2**: Ingestion test suite specification and concurrency test preparation (Agent 10).

---

## 4. Preparation-Only Tasks (Unblocked Offline Formulation)

1. **Task A2-2-PREP**: Agent 2 Scope B persistence isolation logic and project authorization stubbing.
2. **Task A3-1-PREP**: Agent 3 REST resource scaffolding, URL routing, and request DTO schemas.
3. **Task A4-1-PREP**: Agent 4 Upload Client test mocks, wire ceiling calculator, and batch downscaling algorithm.
4. **Task A5-1-PREP**: Agent 5 `daSankeyView` SVG packaging and CONTRACT-08 View 12 shell integration proposal.
5. **Task A5-2-PREP**: Agent 5 `daSnapshotComparisonModal` tabular diff packaging and CONTRACT-05 compliance review.
6. **Task A5-3-PREP**: Agent 5 `daPresetManager` filter preset packaging and event schema formulation.
7. **Task A6-1-PREP**: Agent 6 finding review persistence data models and draft controller methods.
8. **Task A7-1-PREP**: Agent 7 `daProjectCreateModal` chunking and UI state preparation.

---

## 5. Gated Tasks & Blocker Triggers

| Gated Task | Owner | Prerequisite Interfaces / Triggers | Unblocking Mechanism |
|---|---|---|---|
| **Task A2-2**: Security-dependent persistence integration | Agent 2 | Agent 1 Security Interface (`DAProjectSecurityService.cls`) ratified & accepted. | Formal D1/Agent 1 joint signoff on Security v1.0.2. |
| **Task A3-1**: Live REST Ingestion Transport | Agent 3 | Agent 1 Security Interface AND Agent 2 Scope B Persistence Interface accepted. | Release of security and persistence interfaces. |
| **Task A4-1**: Production REST Upload Client | Agent 4 | Agent 3 Frozen REST Transport Contract (`DAGraphIngestionRestResource.cls`). | Milestone A completion (REST contract freeze). |
| **Task A6-1**: Live Finding Review Persistence | Agent 6 | Agent 1 Security Interface accepted. | Release of security interface (decoupled from REST). |
| **Task A7-1**: Live Project Upload UI Integration | Agent 7 | Agent 1 Security Interface AND Agent 3 Frozen REST Contract. | Release of both security and REST transport contracts. |
| **Stage B Integration**: Workspace Shell Mounting | Coordinator D1 | Respective component package acceptance (Agent 5, Agent 8B, Agent 7). | Incremental integration upon package signoff. |
| **Stage C Integration**: Consolidated Regression | Agent 10 | Completion of Stage B Incremental Integration. | D1 integration commit release. |
| **Stage E Verification**: Independent Verification | Verifier D2 | Integrated codebase and verified execution evidence. | Formal submission by D1 post-Stage D. |

---

## 6. Shared-File Conflict Analysis & Ownership Isolation

To eliminate race conditions and concurrent uncoordinated writes, source file ownership is strictly isolated:

1. **Protected Shell Files (D1 Exclusively)**:
   - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*`
   - `scratch/salesforce-poc/force-app/main/default/lwc/daHeader/*`
   - `scratch/salesforce-poc/force-app/main/default/lwc/daSidebar/*`
   - *Conflict Rule*: No agent is permitted to touch shell files. Agent 5, Agent 7, and Agent 8B deliver isolated packages and submit integration handoffs. D1 performs all shell wiring.
2. **Graph Viewer Coordination**:
   - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/*` is exclusively written by Agent 8B for hover card overlays. No other agent may write to `daGraphViewer` in Group A.
3. **Graph Controller Apex**:
   - `DAGraphController.cls` modifications are sequenced: Agent 6 (finding persistence) edits controller methods only after Agent 1 and Agent 2 interfaces are established.
4. **Permission Set Metadata**:
   - `DA_Architecture_Analyst.permissionset-meta.xml` is exclusively owned by Agent 1 for FLS configuration.

---

## 7. Current Branch, HEAD, and Repository Status

- **Repository Root**: `/app`
- **Active Git Branch**: `jules-12338440050225123151-106c7075`
- **HEAD Commit**: `17502b832617666bcea26a9bbd2d6bd4310f47c9`
- **Commit Summary**: `Merge pull request #198 from Mohseen365/jules-phase1-ratification-evidence-alignment-reconciliation-14602916172707116812`
- **Working Tree**: Clean, verified 0 uncommitted changes.
- **Offline Test Suite Health**: 34/34 offline test runners passing with 0 failures across 1,258 static assertions.

---

## 8. Dependency Readiness & Critical Path Schedule

The governing critical path for Group A is the Ingestion Pipeline:

$$\text{Agent 1 (Security)} \longrightarrow \text{Agent 2 [Scope B] (Persistence)} \longrightarrow \text{Agent 3 (Apex REST)} \longrightarrow \text{Agent 4 (Upload Client)} \longrightarrow \text{Stage B (D1 Shell)} \longrightarrow \text{Stage C (Agent 10 Regression)} \longrightarrow \text{Stage E (D2 Audit)} \longrightarrow \text{Stage F (PO Ratification)}$$

Independent tracks run concurrently in parallel:
- **Component Packaging Track**: Agent 5 -> D1 Shell Integration (View 12 River, Snapshot, Presets).
- **UX Enhancements Track**: Agent 8B -> D1 Shell Integration (Command Palette, Hover Cards).
- **Review Persistence Track**: Agent 1 -> Agent 6 -> D1 Shell Integration (Finding Status).
- **Benchmarking & Parity Track**: Agent 9 (PBIM/CST/BQC Benchmarks, Parity Matrix).
- **Harness & Concurrency Track**: Agent 10 (Test Harnesses, Ingestion Tests).

---

## 9. First Critical-Path Milestone

- **Milestone A: REST Contract Freeze**
  - *Prerequisites*: Agent 1 security interface ratified + Agent 2 Scope B persistence ratified + Agent 3 publishes frozen `@RestResource` interface and DTO schema.
  - *Outcome*: Enables Agent 4 production client implementation and Agent 7 live UI upload binding.

---

## 10. Expected First Integration Handoffs

1. **Handoff 1 (Stage A -> Stage B)**: Agent 5 submits `daSankeyView`, `daSnapshotComparisonModal`, and `daPresetManager` integration packages for D1 shell integration.
2. **Handoff 2 (Stage A -> Stage B)**: Agent 8B submits `daCommandPalette` component package and `daGraphViewer` hover card modifications.
3. **Handoff 3 (Stage A -> Downstream Unblocking)**: Agent 1 submits `DAProjectSecurityService.cls` interface package, unblocking Agent 2 Scope B and Agent 6.

Integration Coordinator D1 will proceed with active monitoring, register updates, and pipeline coordination without requiring additional Project Owner prompts.
