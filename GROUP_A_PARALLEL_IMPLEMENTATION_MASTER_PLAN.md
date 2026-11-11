# GROUP A PARALLEL IMPLEMENTATION MASTER PLAN

## Document Identification
- **Document Type**: Master Plan & Implementation Architecture
- **Coordinator**: Integration Coordinator D1 (Sole Integration Coordinator)
- **Authority**: Project Owner Mandate under DEC-04 Alternative 4
- **Independent Verifier**: Independent Verifier D2
- **Date**: 2026-11-12
- **Baseline Git Commit**: `17502b832617666bcea26a9bbd2d6bd4310f47c9`
- **Active Branch**: `jules-12338440050225123151-106c7075`
- **Milestone Horizon**: Milestones A through E

---

## 1. Executive Summary & Objective

The objective of this Master Plan is to coordinate all ten Group A agents through maximum safe parallelism, continuous integration, controlled interface gating, and evidence-backed acceptance. Integration Coordinator D1 holds sole responsibility for the overall execution schedule, dependency releases, strict file ownership enforcement, and shared shell integration.

Workstreams proceed concurrently across decoupled tracks. Where prerequisites exist, downstream tasks are authorized for offline independent preparation while physical execution remains gated fail-closed. Formal task completion is governed by an 8-step acceptance protocol requiring dual joint signoff between the Workstream Lead and Integration Coordinator D1, followed by independent forensic verification by Independent Verifier D2.

---

## 2. Architecture & Design Principles

1. **One Exclusive Writer Per Source File**:
   - To eliminate merge conflicts and concurrent state races, every production source file is mapped to exactly one owner.
   - Shared shell components (`daAppShell.*`, `daHeader.*`, `daSidebar.*`, `daFilterSchema.js`) are exclusively owned and modified by Integration Coordinator D1.
2. **Strict Invariant Governance**:
   - **SELECTION != NAVIGATION**: Selecting an element (node/edge) focuses investigation and emits `CustomEvent('nodeselect')` without triggering shell tab switching or canvas re-rendering. Navigation switches workspace view modes without mutating active selection.
   - **Single Cytoscape Canvas Invariant**: Exactly one Cytoscape.js canvas instance exists in the DOM, mounted exclusively by `daGraphViewer`. Modals, drawers, and secondary views (such as `daSnapshotComparisonModal` and `daSankeyView`) must never instantiate or embed Cytoscape instances.
   - **Client-Side Heavy Processing**: AST diffing, graph reassembly, and topological sorting occur purely client-side in Node.js or browser JavaScript. Apex controllers remain thin, user-mode enforced, and DTO-driven.
3. **Frozen Contract Preservation**:
   - Frozen technical contracts (CONTRACT-01 through CONTRACT-06, CONTRACT-08, CONTRACT-09) are immutable. CONTRACT-07 remains quarantined. Unilateral contract modifications are strictly barred.
4. **Decoupled Interface Release Pipeline**:
   - Downstream consumers prepare offline models, unit tests, and mock adapters. Implementation is unlocked dynamically as upstream interfaces are signed off.

---

## 3. Milestones A through E Definitions

### Milestone A: REST Contract Freeze
- **Scope**: Formal publication and contract freeze of Apex REST Ingestion Transport (`DAGraphIngestionRestResource.cls`, DTOs).
- **Prerequisites**:
  - Agent 1 Security Interface (`DAProjectSecurityService.cls`) v1.0.2 accepted.
  - Agent 2 Scope B Ingestion Persistence Interface (`DAGraphIngestionService.cls`) accepted.
  - User-mode authorization and 5 MiB wire ceiling validation verified.
- **Enables**: Agent 4 live HTTP upload client implementation and Agent 7 live UI upload binding.

### Milestone B: Core Ingestion Integration
- **Scope**: End-to-end ingestion pipeline operational from Node.js client (`salesforce-upload-client.cjs`) through Apex REST transport into chunk persistence and run lifecycle finalization.
- **Prerequisites**: Milestone A complete + Agent 4 upload client verified + Agent 10 multi-threaded concurrency and chunk integrity tests pass offline.
- **Enables**: End-to-end project graph ingestion from external analyzers.

### Milestone C: Project Creation & Finding Persistence
- **Scope**: User-facing project creation modal (`daProjectCreateModal`), project switcher (`daProjectSelector`), and persistent finding-review workflow (`DA_Finding__c.Status__c`, `DAGraphController.cls`).
- **Prerequisites**: Agent 1 security interface accepted + Agent 6 finding persistence verified + Agent 7 project modal package accepted.
- **Enables**: Full multi-project workspace lifecycle and reviewer collaboration.

### Milestone D: Workspace Parity & Interaction Completion
- **Scope**: Pure SVG Dependency River (`daSankeyView` View 12), Tabular Snapshot Comparison modal (`daSnapshotComparisonModal`), Filter Presets (`daPresetManager`), Command Palette (`daCommandPalette`, Ctrl+K), and 200ms debounced node/edge hover cards.
- **Prerequisites**: Agent 5 component packages integrated into `daAppShell` + Agent 8B UX packages integrated + Agent 9 parity matrix updated to 100% PO scope reconciliation.
- **Enables**: Complete workspace analytical and navigational capability.

### Milestone E: Full Integration & Release Readiness
- **Scope**: Consolidated Stage B incremental integrations complete, Stage C regression suite passing 100% across all 34+ runners, Stage D PBIM/CST/BQC benchmarks validated, and Stage E independent forensic audit completed by D2.
- **Prerequisites**: Milestones A, B, C, D complete + D2 Release Verdict issued.
- **Enables**: Final submission to Project Owner for executive release ratification.

---

## 4. Critical Path & Parallel Track Architecture

```
CRITICAL PATH:
Agent 1 (Security v1.0.2)
       │
       ▼
Agent 2 Scope B (Ingestion Persistence)
       │
       ▼
Agent 3 (Apex REST Transport)  ──► [MILESTONE A: REST CONTRACT FREEZE]
       │
       ▼
Agent 4 (Analyzer Upload Client)
       │
       ▼
D1 Incremental Integration (Stage B)
       │
       ▼
Agent 10 Consolidated Regression (Stage C)  ──► [MILESTONE B: CORE INGESTION INTEGRATION]
       │
       ▼
D2 Independent Audit (Stage E)
       │
       ▼
Project Owner Ratification (Stage F)  ───────► [MILESTONE E: RELEASE READINESS]
```

**Concurrently Dispatched Parallel Tracks**:
- **Track 1 (Lifecycle Independent Scope A)**: Agent 2 Scope A -> Schema and Picklist verification.
- **Track 2 (Workspace Visualization Packaging)**: Agent 5 (`daSankeyView`, `daSnapshotComparisonModal`, `daPresetManager`) -> Ready for D1 Stage B mounting -> Milestone D.
- **Track 3 (Interaction Enhancements)**: Agent 8B (`daCommandPalette`, `daGraphViewer` hover cards) -> Ready for D1 Stage B binding -> Milestone D.
- **Track 4 (Finding Review Workflow)**: Agent 1 Security -> Agent 6 finding status persistence -> D1 Stage B binding -> Milestone C.
- **Track 5 (Project Modal Workflow)**: Agent 1 Security + Agent 3 REST -> Agent 7 project creation UI -> D1 Stage B binding -> Milestone C.
- **Track 6 (Parity & Performance)**: Agent 9 (Parity Matrix, Benchmark Suite) -> Stage D Parity & Performance -> Milestone D & E.
- **Track 7 (Test Engineering & Verification)**: Agent 10 (34 Offline Suites, Ingestion Harnesses) -> Stage C Regression -> Milestone E.

---

## 5. Sequence of Shared Shell & Metadata Modifications

Integration Coordinator D1 strictly sequences all modifications to shared shell files:

1. **Step 1 — Dependency River (View 12) Mounting**:
   - Import `c-da-sankey-view` into `daAppShell.html`.
   - Add view mode `'river'` to workspace tab navigation in `daAppShell.js` under CONTRACT-08.
   - Bind `nodeselect` event handler to shell selection store without altering view mode.
2. **Step 2 — Modals & Presets Embedding**:
   - Embed `c-da-snapshot-comparison-modal` into `daAppShell.html` template.
   - Embed `c-da-preset-manager` into `daHeader.html` / `daSidebar.html`.
   - Wire comparison open/close events with monotonic request token protection.
3. **Step 3 — Command Palette Global Binding**:
   - Embed `c-da-command-palette` in `daAppShell.html`.
   - Wire global `keydown` event listener for `Ctrl+K` / `Cmd+K`.
   - Map palette action dispatches to view mode transitions preserving node selection state.
4. **Step 4 — Finding Review Status UI Binding**:
   - Wire review status change events in `daFindingsView` to `DAGraphController.updateFindingStatus`.
5. **Step 5 — Project Selector & Modal Binding**:
   - Wire `c-da-project-create-modal` in `daHeader.html` and project switch events in `daSidebar.html`.

---

## 6. Formal 8-Step Acceptance Protocol

No agent accepts its own implementation. For every completed task, the following eight steps are executed:

1. **Step 1 (Handoff Inspection)**: D1 inspects the formal handoff deliverable, release notes, and diff.
2. **Step 2 (Ownership Audit)**: D1 verifies all touched files against `GROUP_A_FILE_OWNERSHIP_MANIFEST.csv`. Zero unassigned or cross-boundary edits permitted.
3. **Step 3 (Test & Evidence Audit)**: D1 and Agent 10 execute offline unit and integration tests. 100% pass rate required.
4. **Step 4 (Contract Compatibility)**: D1 validates conformance against CONTRACT-01..06, 08, 09.
5. **Step 5 (Workstream Lead Acceptance)**: The producing Workstream Lead signs off on task completion.
6. **Step 6 (D1 Joint Acceptance)**: Integration Coordinator D1 issues formal joint acceptance and records status in `GROUP_A_INTEGRATION_AND_ACCEPTANCE_REGISTER.csv`.
7. **Step 7 (D2 Submission)**: D1 submits the verified package and execution evidence to Independent Verifier D2.
8. **Step 8 (Limitations Recorded)**: D1 records any remaining edge cases or environment constraints in the tracking logs.

---

## 7. Governance Constraints & Boundaries

- All six Project Owner decisions (`PO-DEC-V2-01` through `PO-DEC-V2-06`) remain approved and binding.
- Agent 8B remains exclusively authorized for Command Palette and graph hover cards.
- Wave 5A remains formally ratified and closed; no reopening of Wave 5A files.
- Wave 9 components (`daRefactoringEngine`, `daRefactorHandoffModal`) remain strictly quarantined and excluded from packaging via `.forceignore`.
- Live production deployment remains unauthorized.
- Project Owner retains sole ratification authority for milestones and final release.
