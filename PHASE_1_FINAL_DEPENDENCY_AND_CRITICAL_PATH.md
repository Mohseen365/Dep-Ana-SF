# Phase 1 Final Dependency and Critical Path

## Document Identification
- **Document Type**: Implementation Dependency Analysis & Scheduling Runbook
- **Classification**: Master Execution Architecture
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1, Independent Verifier D2
- **Status**: AUTHORITATIVE IMPLEMENTATION SCHEDULE

---

## 1. Executive Summary & Dispatch Strategy

With the Project Owner's explicit authorization of all six PO decisions and Agent 8B's implementation scope, the implementation phase is organized into **four structured dispatch groups (Groups A through D)** and executed across **six authoritative stages (Stage A through Stage F)**.

### Core Principles
1. **Maximize Safe Parallelism**: Agents with zero mutual file overlap or unblocked preconditions launch immediately in Group A.
2. **Strict Interface Gates**: Dependent agents in Groups B and C launch only after interface contracts from Group A are published and frozen. Independent directed gates decouple Agent 6 from Agent 7.
3. **Scoped Agent 2 Execution**: Agent 2's implementation is partitioned into Scope A (independent lifecycle/schema, unblocked immediately) and Scope B (security-dependent persistence integration, gated on Agent 1).
4. **Authoritative Integration & Test Sequence**: Package implementation (Stage A) precedes incremental integration (Stage B), followed by integrated regression (Stage C), integrated parity & benchmarks (Stage D), independent verification (Stage E), and Project Owner ratification (Stage F). Integrated regression must never precede integration.
5. **Exclusive Shell Integration**: Integration Coordinator D1 exclusively controls all changes to shared shell files (`daAppShell.*`, `daHeader.*`, `daSidebar.*`).
6. **Independent Verification**: Independent Verifier D2 audits all completions post-integration without executing code repairs.
7. **No Production Deployment**: Execution is restricted to local development, sandboxes, and verification harnesses.

---

## 2. Four Structured Dispatch Groups

```
┌────────────────────────────────────────────────────────────────────────┐
│ GROUP A: Foundations & Parallel Preparation (LAUNCH IMMEDIATELY)       │
│ • Agent 1: Salesforce Security, Private OWD, FLS, Grant Service        │
│ • Agent 2 [Scope A]: Ingestion Lifecycle, Status Picklist, Unique Key  │
│ • Agent 5: Component Packages (daSankeyView, daSnapshotComparisonModal)│
│ • Agent 8B: Command Palette & Graph Hover (preserves SELECTION!=NAV)   │
│ • Agent 9: Parity Matrix Update (ratify out-of-scope) & Benchmarks     │
│ • Agent 10: Ingestion Test Harness Scaffolding & Multi-Thread Runner   │
└─────────────┬──────────────────────────┬───────────────────────────────┘
              │                          │
              │ (Agent 1 Interface)      │ (Agent 1 Interface)
              ▼                          ├───────────────────────────────┐
┌───────────────────────────────────┐    │                               │
│ Agent 2 [Scope B]: Security-      │    ▼                               ▼
│ Dependent Persistence Integration │ ┌──────────────────────┐ ┌────────┴──────────────┐
└─────────────┬─────────────────────┘ │ Agent 6: Finding     │ │ (Requires Agent 1     │
              │                       │ Review Persistence   │ │  Security Interface)  │
              │ (Agent 2 Interface)   └──────────┬───────────┘ │                       │
              ▼                                  │             │ Agent 7: Project      │
┌─────────────────────────────────────────┐      │             │ Creation & Upload UI  │
│ GROUP B: Ingestion Transport Pipeline   │      │             │ (Gated on Agent 1 &   │
│ • Agent 3: Apex REST Ingestion Transport│      │             │  Agent 3 REST Contract│
│   (Gated on Agent 1 AND Agent 2)        │      │             └──────────┬────────────┘
│ • Agent 4: Node.js Analyzer Client      │      │                        │
│   (Gated on Agent 3 Frozen REST)        │      │                        │
└────────────────────┬────────────────────┘      │                        │
                     │                           │                        │
                     └───────────────────────────┼────────────────────────┘
                                                 │
                                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GROUP D: Coordinator Integration, Regression & Final Verification      │
│ • Integration Coordinator D1: Integrates packages & mounts shell views │
│ • Agent 10: Runs complete regression test suite & browser E2E          │
│ • Agent 9: Benchmarks and parity verification                          │
│ • Independent Verifier D2: Independent audit and non-regression check  │
│ • Project Owner: Final milestone ratification                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Authoritative Six-Stage Execution Sequence

The migration lifecycle strictly executes across six successive stages:

### Stage A — Package Implementation
- Implementation owners complete their assigned work in isolation.
- Each owner executes package-level offline unit tests and validates acceptance criteria.
- Pre-integration unit tests (including test harness preparation by Agent 10) may run during Stage A.
- Workstream Lead and Integration Coordinator D1 jointly accept completed tasks against frozen specifications.

### Stage B — Incremental Integration
- Integration Coordinator D1 integrates accepted packages incrementally as their dependencies are satisfied.
- D1 coordinates shared shell integration (`daAppShell.*`, `daHeader.*`, `daSidebar.*`).
- Incremental integration must NOT wait for unrelated workstreams where no dependency exists (e.g., Agent 5 component mounting can integrate once Stage A completes without waiting for Group B REST transport).
- D1 records integration commits and changed files.

### Stage C — Integrated Regression
- Follows relevant Stage B integration. Integrated regression must never precede integration.
- Agent 10 executes consolidated regression test suite across integrated packages.
- Agent 10 executes configured Playwright/browser E2E tests against the integrated shell state.
- Agent 10 records exact test execution commands, exit codes, and verifiable log outputs.

### Stage D — Integrated Parity and Performance
- Agent 9 validates integrated feature parity against the authoritative parity register.
- Agent 9 performs benchmark and performance comparisons (PBIM, CST, BQC datasets).
- Any deviation from approved scope or performance baselines is formally documented.

### Stage E — Independent Verification
- Independent Verifier D2 independently inspects the integrated codebase and execution logs.
- D2 verifies implementation artifacts, tests, contracts, git history, and evidence traceability.
- D2 operates in a strictly read-only capacity and does not edit implementation files.

### Stage F — Project Owner Ratification
- D1 compiles and submits the final milestone completion package.
- D2's independent verification findings and verdicts are presented.
- Project Owner renders the executive decision for milestone ratification.

---

## 4. Group Detail, Interface Gates, and Agent Readiness Precision

### Group A: Foundations and Parallel Preparation
- **Participants**: Agent 1, Agent 2 (Scope A), Agent 5, Agent 8B, Agent 9, Agent 10.
- **Coordination Discipline**:
  - **Agent 1 (`UNBLOCKED_IMPLEMENTATION`)**: Audits actual metadata relationships (`ControlledByParent` on `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, `DA_Annotation__c`; Lookup on `DA_User_Preference__c`), implements `DAProjectSecurityService.cls` with runtime authorization-time expiry (< 4-hour lease), explicit revocation, and append-only audit protections, and sets `DA_Project__c` OWD to `Private`.
  - **Agent 2 [Scope A] (`UNBLOCKED_IMPLEMENTATION` - Independent Lifecycle/Schema)**: Immediately authorized to implement run lifecycle state machine, `DA_Analysis_Run__c.Status__c` picklist metadata, `DA_Graph_Chunk__c.Chunk_Key__c` uniqueness constraint, deterministic chunk validation, and isolated unit tests.
  - **Agent 2 [Scope B] (`BLOCKED_PENDING_INTERFACE` - Security-Dependent Persistence)**: Gated on Agent 1's published security interface (`DAProjectSecurityService.cls`) for project-level authorization, sharing checks, and cross-project isolation.
  - **Agent 5 (`PARALLEL_PREPARATION_ONLY`)**: Packages `daSankeyView`, `daSnapshotComparisonModal`, and `daPresetManager` in isolation; prepares integration contracts for D1; strictly prohibited from modifying `daAppShell.*`, `daHeader.*`, or `daSidebar.*`.
  - **Agent 8B (`UNBLOCKED_IMPLEMENTATION`)**: Implements `daCommandPalette` and hover cards within approved scope, strictly isolated from shell files, preserving `SELECTION != NAVIGATION`.
  - **Agent 9 (`UNBLOCKED_IMPLEMENTATION`)**: Updates proposed parity matrix reflecting ratified out-of-scope lenses; executes benchmark harness; no unilateral frozen contract changes.
  - **Agent 10 (`UNBLOCKED_IMPLEMENTATION`)**: Scaffolds shared test harnesses and external multi-threaded concurrency runners; coordinates expectations with implementation owners without tampering with code.

### Group B: Ingestion Transport Pipeline
- **Prerequisites**: Agent 1 security interface signoff AND Agent 2 persistence interface signoff.
- **Participants**:
  - **Agent 3 (Apex REST Transport - `BLOCKED_PENDING_INTERFACE`)**: Gated on Agent 1 security interface AND Agent 2 ingestion persistence service. Exposes `@RestResource` in `DAGraphIngestionRestResource.cls`, handles DTO deserialization, user-mode validation, chunk batching, and invokes Agent 2's ingestion service.
  - **Agent 4 (Node.js Analyzer Upload Client - `BLOCKED_PENDING_INTERFACE`)**: Gated on Agent 3 freezing the REST API contract. Implements pre-flight wire measurement, dynamic batch downscaling under the 5 MiB ceiling, retry idempotency, and finalization calls.

### Group C: Persistent Workflows (Independent Directed Gates)
- **Agent 6 (Finding Review Persistence - `BLOCKED_PENDING_INTERFACE`)**:
  - *Directed Dependency Gate*: Requires Agent 1 security interface ONLY.
  - Does NOT depend on Agent 3 REST transport. Unblocked immediately once Agent 1 publishes the security context.
  - Expands `DA_Finding__c.Status__c`, updates `DAGraphController.cls`, and binds UI toggles in `daFindingsView`.
- **Agent 7 (Project Creation & Upload UI - `BLOCKED_PENDING_INTERFACE`)**:
  - *Directed Dependency Gate*: Requires Agent 1 security interface AND Agent 3 frozen REST transport contract.
  - Remains blocked until both prerequisite interfaces are signed off.
  - Expands `daProjectCreateModal` and `daProjectSelector` to handle file chunking and invoke REST transport endpoints.

### Group D: Integration, Regression, and Independent Verification
- **Integration Coordinator D1 (`INTEGRATION_ONLY`)**: Exclusively performs incremental shell integration in `daAppShell.*` (registering view 12 `river`, embedding `<c-da-sankey-view>`, mounting modals, binding Command Palette).
- **Agent 10 (`REGRESSION_TESTING`)**: Executes consolidated regression test suite and browser E2E post-integration in Stage C.
- **Agent 9 (`PARITY_BENCHMARKING`)**: Executes PBIM/CST/BQC performance benchmark harness in Stage D.
- **Independent Verifier D2 (`INDEPENDENT_VERIFICATION`)**: Conducts independent verification of provenance, file ownership boundaries, and non-regression in Stage E.
- **Project Owner (`RATIFICATION_AUTHORITY`)**: Executive milestone ratification in Stage F.

---

## 5. Critical Path Schedule

The critical path of Phase 1 implementation is governed by the ingestion pipeline:

$$\text{Agent 1 (Security)} \longrightarrow \text{Agent 2 [Scope B] (Ingestion Persistence)} \longrightarrow \text{Agent 3 (Apex REST)} \longrightarrow \text{Agent 4 (Upload Client)} \longrightarrow \text{Stage B (D1 Shell Integration)} \longrightarrow \text{Stage C (Agent 10 Integrated Regression)} \longrightarrow \text{Stage E (D2 Audit)} \longrightarrow \text{Stage F (PO Ratification)}$$

- **Parallel Independent Tracks**:
  - Track 1 (Agent 2 Scope A): Unblocked immediately in Stage A (Lifecycle/Schema).
  - Track 2 (Component Mounting): Agent 5 -> Stage B (D1 Shell Integration View 12).
  - Track 3 (Interaction Enhancements): Agent 8B -> Stage B (D1 Shell Integration Palette/Hover).
  - Track 4 (Finding Review Workflow): Agent 1 -> Agent 6 -> Stage B (D1 Shell Integration).
  - Track 5 (Project UI Workflow): Agent 1 + Agent 3 -> Agent 7 -> Stage B (D1 Shell Integration).
  - Track 6 (Governance Parity): Agent 9 -> Stage D (Parity & Benchmarks).

None of the off-path tracks block the critical ingestion path, allowing maximum safe implementation velocity across independent teams.
