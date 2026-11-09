# Project Owner Approval & Governance Requests

**Submitted By:** Governance & Ownership Resolver
**Branch:** `wave1/governance-resolver`
**Reference HEAD Commit:** `570f658bc929d61f0909ff4d516f3d97e5327be0`
**Governance Standard:** DEC-04 Alternative 4 (Executive Project Owner Exclusive Signoff)

---

## Executive Summary
In strict compliance with DEC-04 Alternative 4, zero actions are self-approved or assumed ratified. This document formulates the narrowest possible executive decision proposals for items requiring Project Owner resolution:
1. **PO-REQ-01**: Ratification of CONTRACT-03 (Radar Nine-Dimension Adapter) and Dispatch of W6-1 (`daRadarView`).
2. **PO-REQ-02**: Formal Path Allocation & Scope Ratification for `daSnapshotComparisonModal/` (REM-03) and CONTRACT-05.
3. **PO-REQ-03**: Architectural Resolution & Path Authorization for Sankey River View (`daSankeyView` / REM-02 / BLK-02).
4. **PO-REQ-04**: Final Disposition of Unauthorized Quarantined Scope (W9-1 `daRefactoringEngine`, W9-3 `daRefactorHandoffModal`).
5. **PO-REQ-05**: Authoritative Ratification of Wave 1 and Wave 2 File Ownership Allocations (`REMAINING_WORK_FILE_OWNERSHIP.csv`).

---

### PO-REQ-01: Ratification of CONTRACT-03 & Formal Dispatch of Task W6-1 (`daRadarView`)
- **Question**: Should CONTRACT-03 (Radar Nine-Dimension Architecture Adapter) be formally ratified as frozen v1.0.0, and should Task W6-1 be moved from `IMPLEMENTED_PENDING_REVIEW` to `FORMALLY_ACCEPTED`?
- **Options**:
  - **Option A (Recommended)**: Formally ratify CONTRACT-03 based on the reconciled `CONTRACT_03_REMEDIATION_PROPOSAL.md`. Accept the 9 canonical dimensions and the explicit refusal to fabricate missing primitives (Layer Purity, Dependency Health Index, Test Coverage Score). Move W6-1 to `FORMALLY_ACCEPTED`.
  - **Option B**: Reject CONTRACT-03. Remove `c-da-radar-view` from `daAppShell.html`, prune `radar` from `APPROVED_VIEWS`, and delete `daRadarView` bundle from the tree.
  - **Option C**: Keep W6-1 quarantined / isolated in current `IMPLEMENTED_PENDING_REVIEW` state until a future release cycle.
- **Resolver Recommendation**: **Option A**. The implementation is technically hardened, verified by 10/10 offline unit tests, mounted cleanly in the shell, and strictly adheres to anti-hallucination policies for missing primitives.
- **What is Blocked**: Production signoff and formal verification closure of Workstream 4 (Advanced Visualization Views).

---

### PO-REQ-02: Formal Path Allocation & Scope Ratification for `daSnapshotComparisonModal/` (REM-03) and CONTRACT-05
- **Question**: Does the Project Owner authorize the addition of new LWC path `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/` to the authoritative manifest, and should CONTRACT-05 (Dual-Snapshot Comparison) be ratified to unblock Agent C2?
- **Options**:
  - **Option A (Recommended)**: Authorize path allocation `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/` under exclusive ownership of Agent C2. Formally ratify CONTRACT-05 with strict 5 MB single snapshot / 10 MB combined payload caps and single Cytoscape canvas invariant.
  - **Option B**: Defer standalone modal comparison to Wave 3. Retain run selection and metrics diffing within existing `daProjectDashboard` without adding a new LWC component.
  - **Option C**: Reject CONTRACT-05 comparison modal entirely.
- **Resolver Recommendation**: **Option A** with narrow scope: modal comparison only renders tabular entity diffs (nodes/edges added/removed/modified) without instantiating a second Cytoscape canvas instance.
- **What is Blocked**: Dispatch and implementation of Wave 2 Agent C2 (Task REM-03). Currently marked `PROVISIONAL-NEEDS-PROJECT-OWNER`.

---

### PO-REQ-03: Architectural Resolution & Path Authorization for Sankey River View (`daSankeyView` / REM-02 / BLK-02)
- **Question**: How should BLK-02 be resolved to allow implementation of the Sankey River View (`daSankeyView`), and is the path `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/` approved for allocation to Agent C3?
- **Options**:
  - **Option A (Recommended)**: Authorize `daSankeyView/` under Agent C3 with a **pure SVG mathematical implementation** (embedded algorithmic layout calculation in JavaScript/SVG without external npm dependencies or static resources), bypassing BLK-02 security hurdles.
  - **Option B**: Approve the introduction of an authenticated static resource (`d3-sankey.js`) and allocate `daSankeyView/` to Agent C3.
  - **Option C**: Formally cancel REM-02 from the migration scope and remove `daSankeyView` references from all registers.
- **Resolver Recommendation**: **Option A**. A pure SVG algorithm avoids Salesforce Content Security Policy (CSP) and static resource governance friction while guaranteeing deterministic rendering.
- **What is Blocked**: Dispatch and implementation of Wave 2 Agent C3 (Task REM-02). Currently marked `PROVISIONAL-NEEDS-PROJECT-OWNER`.

---

### PO-REQ-04: Final Disposition of Quarantined Scope (W9-1 `daRefactoringEngine`, W9-3 `daRefactorHandoffModal`)
- **Question**: What is the final executive disposition for the unauthorized Wave 9 refactoring code currently quarantined on branch `unauthorized-w9-quarantine` and tracked in `MASTER_LIVE_TASK_REGISTRY.csv` as `IMPLEMENTED_UNAUTHORIZED_QUARANTINED`?
- **Options**:
  - **Option A (Recommended)**: Maintain strict quarantine for Wave 1 and Wave 2. Authorize formal review and potential un-quarantine as a dedicated Wave 3 workstream after all Wave 1 and Wave 2 baseline deliverables are independently verified.
  - **Option B**: Formally reject and delete `daRefactoringEngine` and `daRefactorHandoffModal` source files from the repository main tree, preserving them exclusively in `UNAUTHORIZED_W9_IMPLEMENTATION.patch`.
  - **Option C**: Unilaterally ratify CONTRACT-07 and authorize immediate integration of W9 components into `daAppShell`.
- **Resolver Recommendation**: **Option A**. The mathematical logic (Tarjan SCC, directed cycle verification, immutability) is sound and verified by offline tests (Tests 20–25 in `run-workstream-c-tests.cjs`), but immediate integration would expand the migration surface and violate sequential wave governance.
- **What is Blocked**: Integration of interactive refactoring simulation in `daInvestigationDrawer` and export modals.

---

### PO-REQ-05: Authoritative Ratification of Wave 1 and Wave 2 File Ownership Allocations (`REMAINING_WORK_FILE_OWNERSHIP.csv`)
- **Question**: Does the Project Owner formally ratify the single-writer file allocations defined in `REMAINING_WORK_FILE_OWNERSHIP.csv` for Wave 1 and Wave 2 agents?
- **Key Allocations to Ratify**:
  1. `daAppShell.*`: Reconcile historical WS-1 vs INT-1 conflict by designating **Agent C1** as the single authoritative writer for Wave 2 (Task REM-04).
  2. `daGraphViewer.*` & `daLayoutEngine.*`: Reconcile historical WS-2 ownership by designating **Agent C4** as the single authoritative writer for Wave 2 (Task REM-05).
  3. Permission sets and security test helpers: Authorize **Agent B4** to modify `DA_Architecture_Analyst.permissionset-meta.xml`, `DASchemaAndSecurityTest.cls`, and `DAGraphSecurityTest.cls` for FLS / USER_MODE hardening.
  4. Non-colliding test runner allocations under `scratch/salesforce-poc/tests/`:
     - Agent B4: `run-b4-security-tests.cjs`
     - Agent B5: `run-b5-validation-tests.cjs`
     - Agent C1: `run-c1-url-sync-tests.cjs`
     - Agent C2: `run-c2-snapshot-comparison-tests.cjs`
     - Agent C3: `run-c3-sankey-tests.cjs`
     - Agent C4: `run-c4-export-tests.cjs`
- **Options**:
  - **Option A (Recommended)**: Formally adopt and freeze `REMAINING_WORK_FILE_OWNERSHIP.csv` as the governing ownership matrix for Wave 1 and Wave 2.
  - **Option B**: Amend specific agent assignments before dispatching Wave 1 and Wave 2 agents.
- **Resolver Recommendation**: **Option A**. Provides zero-collision boundaries and resolves all historical workstream overlap.
- **What is Blocked**: Parallel execution authorization for Wave 1 and Wave 2 agents.
