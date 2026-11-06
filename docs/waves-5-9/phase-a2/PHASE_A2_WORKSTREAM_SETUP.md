# Phase A2 — Five Workstream Setup & Operational Governance
## Dependency Analyzer | Waves 5–9 Parallel Migration

**Phase**: Phase A2 — Establish Implementation Workstreams & Operational Boundaries
**Coordinator / Author**: Jules (Parallel Migration Coordinator Agent)
**Date**: 2026-11-06
**Status**: `READY WITH CONSTRAINTS` (Operational boundaries established; feature dispatch remains locked pending Phase A3 contract freezing and Lead Architect authorization)

---

## 1. Purpose & Scope
Phase A1 established the immutable working baseline, verified environment constraints, and inventoried all 21 tasks across Waves 5–9.

The objective of **Phase A2** is to turn that baseline into a robust, collision-free execution structure:
1. Establish five dedicated workstream charters grounded in the authoritative register.
2. Define rigorous path ownership and boundaries to prevent concurrent write collisions.
3. Map every permitted path and coordinator-protected boundary.
4. Establish clear integration, testing, and handoff contracts.
5. Catalog shared contract inputs for formalization in Phase A3.

**Strict Governance Boundaries**:
- **No feature code implementation** in Phase A2.
- **No dependency installation** (`node_modules` remains untouched).
- **No launch or dispatch of feature tasks**.
- **No Git staging, commits, branches, resets, cleans, or history alteration**.

---

## 2. Current Baseline & Git State Reconciliation

### Repository State at Phase A2 Start
- **Repository Root**: `/app`
- **Branch**: `jules-3758698184075386171-15cf1576`
- **HEAD Commit**: `286e73f18b6e459823c643f42d145ca608b4da00`
- **Working Tree**: Completely clean (zero dirty files, zero untracked files, zero staged changes).

### Reconciliation with Phase A1 Baseline
Phase A1 captured repository baseline at commit `ca8da634723425f19dc651d0f808484f3fe458bd`. Following completion of Phase A1, pull request #104 merged those deliverables into the mainline at merge commit `286e73f18b6e459823c643f42d145ca608b4da00` ("Establish Waves 5-9 Implementation Baseline (Phase A1)").
- All Phase A1 deliverables under `docs/waves-5-9/phase-a1/` are fully preserved and tracked in Git.
- The untracked files noted in Phase A1 raw Git output (`git_baseline_raw.txt` and `docs/waves-5-9/`) are now properly tracked in commit `286e73f`.
- The current Phase A2 starting state is verified 100% clean and consistent.

---

## 3. Five Workstream Charters Overview

Five independent workstreams are established, each governed by a dedicated charter document located in `docs/waves-5-9/phase-a2/WAVES_5_9_WORKSTREAM_CHARTERS/`:

| Workstream | Wave & Focus | Owning Role | Assigned Tasks | Initial Parallel Capacity | Primary Governance Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Workstream A** | **Wave 5**: Deep Graph & Layout | Workstream A Lead (`W5 Owner`) | `W5-1`, `W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6` | **1 task only** (`W5-1`) | Strict serialized execution chain. Zero concurrent edits on `daGraphViewer` or `daLayoutEngine`. |
| **Workstream B** | **Wave 6**: Analytical Views | Workstream B Lead (`W6 Owner`) | `W6-1`, `W6-2`, `W6-3`, `W6-4` | **4 tasks** (Full parallel) | Complete bundle isolation. Zero cross-agent collisions. Pure SVG/LWC implementations. |
| **Workstream C** | **Wave 7**: Diagnostics & History | Workstream C Lead (`W7 Owner`) | `W7-P1`, `W7-1`, `W7-2`, `W7-3` | **3 tasks** (`W7-P1`, `W7-1`, `W7-2`) | Contract A zero-schema Apex. `W7-3` gated on `W7-P1`. Component isolation. |
| **Workstream D** | **Wave 8**: Investigation & Compare | Workstream D Lead (`W8 Owner`) | `W8-1`, `W8-2`, `W8-3` | **2 tasks** (`W8-1`, `W8-2`) | `W8-3` gated on `W8-2` and cross-wave `W7-P1`. Pure JavaScript diff engine. |
| **Workstream E** | **Wave 9**: Refactoring Simulation | Workstream E Lead (`W9 Owner`) | `W9-1`, `W9-2`, `W9-3` | **1 task** (`W9-1`) | Pure-math simulation engine. Zero Dagre/UI layout dependency. `W9-2` and `W9-3` gated on `W9-1`. |

*Note: Task `INT-1` (Unified App Shell Integration & Navigation Mount) is coordinator-exclusive and not assigned to any feature workstream.*

---

## 4. Workstream Ownership Rules & Boundaries

To prevent silent overwrites and code regression across concurrent workstreams, the following strict rules are enforced:

1. **Permitted Path Scope**: A task may edit ONLY the paths explicitly assigned to it in `WAVES_5_9_WORKSTREAM_OWNERSHIP_MATRIX.csv`.
2. **Coordinator Protected Paths**: Feature workstreams are strictly prohibited from modifying coordinator-controlled paths:
   - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*`
   - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js`
   - All 9 immutable baseline test runners (`scratch/salesforce-poc/tests/run-*-tests.cjs`)
   - All aggregate wave test runners (`run-wave[5-9]-tests.cjs`, `run-coordinator-integration-suite.cjs`)
3. **No Concurrent Path Modification**: No two concurrently executing tasks may modify the same file under any circumstances.
4. **Wave 5 Serialization**: Workstream A tasks must execute strictly one at a time in sequence:
   $$\text{W5-1} \rightarrow \text{W5-2} \rightarrow \text{W5-3} \rightarrow \text{W5-4} \rightarrow \text{W5-5} \rightarrow \text{W5-6}$$
   Each task must be verified, reviewed, and integrated before the next task begins.
5. **Read-Only Shared Contracts**: Shared contracts (graph payloads, DTOs, schemas) approved in Phase A3 are immutable for feature tasks.
6. **Scope Expansion Escalation**: If an engineer discovers a required file outside their permitted path list, work on that aspect must halt and the requirement escalated to the Integration Coordinator.
7. **Git Command Prohibitions**: Workstream engineers/subagents must NEVER run `git commit`, `git push`, `git checkout`, `git reset`, `git clean`, `git rebase`, or `git merge`.
8. **Transfer Artifacts**: All completed work must be handed off as structured patch bundles with test evidence to the Integration Owner.

---

## 5. Implementation Handoff Contract

Every workstream must adhere to the standardized Implementation Handoff Contract when delivering completed task code:

### Mandatory Handoff Bundle Items
1. **Task Metadata**: Task ID, exact title, owning workstream, and base commit SHA.
2. **Path Manifest**: List of all created, modified, or deleted files (must match permitted paths 100%).
3. **Patch Artifact**: Unified Git diff / patch file (e.g. `task-<TASK_ID>.patch`).
4. **Dependency Declarations**: Explicit confirmation of zero external npm dependencies or manifest modifications.
5. **Test Execution Evidence**:
   - Task-specific runner command, exit code (must be 0), and full console output.
   - Baseline regression runner execution (all 9 immutable suites, 187 test cases, 0 failures).
6. **Omitted Tests & Justifications**: Explanation for any test scenario mocked or deferred.
7. **Visual / Browser Evidence**: Where applicable, Playwright screenshots or DOM snapshots.
8. **Security & Boundary Assessment**:
   - Confirmation of `with sharing` and FLS checks (for Apex).
   - Confirmation of project isolation (`activeProjectId` scoping).
   - Invariant check: `SELECTION != NAVIGATION` strictly preserved.
9. **Zero-Pollution Attestations**:
   - Confirmation that zero files outside permitted scope were touched.
   - Confirmation that zero coordinator-owned paths were touched.

---

## 6. Phase A3 Contract Inputs Summary

Phase A3 will formally ratify shared technical contracts. Nine areas have been cataloged in `WAVES_5_9_PHASE_A3_CONTRACT_INPUTS.md`:
1. Canonical Graph Payload & Node/Edge Schema (`Object.freeze` enforcement).
2. Layout Identifiers & Layout Engine Configuration (`orbit`, `constellation`, `sankey`).
3. Radar 9-Dimension Architecture Adapter (Coupling, Instability, Abstraction, Distance, Cycles, Unassigned, Coverage, Complexity, Density).
4. Historical Analysis Run Identity & DTO (Contract A zero-schema Apex adapter).
5. Dual-Snapshot Retrieval & Diff Engine Contract (added/removed/modified JSON deltas).
6. Investigation Drawer Selection Event DTO (`nodeselect` detail payload).
7. Refactoring Action DTOs & Simulation Operations (`extractClass`, `moveMethod`, `breakCycle`).
8. Workspace Component Registration & Navigation Mount (`daAppShell` tab bar routing).
9. Shared State & Immutable Graph Invariants (`SELECTION != NAVIGATION`).

---

## 7. Phase A2 Exit Criteria Assessment

| Exit Criterion | Status | Evidence / Verification |
| :--- | :--- | :--- |
| Five workstream charters exist and reflect authoritative register | **MET** | Charters created in `docs/waves-5-9/phase-a2/WAVES_5_9_WORKSTREAM_CHARTERS/`. |
| Every Wave 5–9 task represented in execution board | **MET** | 21 tasks in `WAVES_5_9_EXECUTION_BOARD.csv` (20 feature + coordinator INT-1). |
| `INT-1` clearly designated as coordinator-only | **MET** | Identified as coordinator-exclusive in all boards and matrices. |
| Every task-permitted path represented in ownership matrix | **MET** | 80 task-permitted paths mapped in `WAVES_5_9_WORKSTREAM_OWNERSHIP_MATRIX.csv`. |
| Coordinator-protected paths identified | **MET** | 23 coordinator-protected paths mapped from baseline conflicts register. |
| Concurrent edit conflicts explicitly represented | **MET** | Ownership matrix and charters document intra-workstream serial constraints. |
| Wave 5 serial execution preserved | **MET** | Explicit sequence enforced; only W5-1 initially eligible. |
| Parallel opportunities grounded in actual dependencies | **MET** | Workstream B (4 tasks), C (3 tasks), D (2 tasks), E (1 task) confirmed parallel. |
| Integration and handoff responsibilities explicit | **MET** | `WAVES_5_9_INTEGRATION_RESPONSIBILITY_MATRIX.csv` created; handoff contract defined. |
| Phase A3 contract inputs clearly identified | **MET** | Cataloged in `WAVES_5_9_PHASE_A3_CONTRACT_INPUTS.md`. |
| Application code, metadata, test runners, manifests unmodified | **MET** | Zero diff in `scratch/salesforce-poc`, `force-app`, `package.json`. |
| Zero Git staging, commits, branches, resets, or destructive ops | **MET** | Clean working tree; all changes restricted to `docs/waves-5-9/phase-a2/`. |

### Final Readiness Classification
**`READY WITH CONSTRAINTS`**
- Operational governance, workstream boundaries, execution boards, and ownership matrices are established.
- Feature dispatch remains locked (`DISPATCH_NOT_AUTHORIZED`) until Phase A3 formalizes shared contracts and independent authorization review is completed.
