# R3 Project Owner Decision Package

**Document Identifier:** `R3_PROJECT_OWNER_DECISION_PACKAGE.md`
**Auditor:** Agent R3 — Project Governance, Contract and Authorization Reconciliation Auditor
**Date:** 2026-11-10
**Target:** Project Owner (Executive Authority under DEC-04 Alternative 4)
**Status:** EXECUTIVE DECISION PACKAGE (Awaiting Human Project Owner Execution)

---

## Notice of Role Boundaries
Agent R3 is an independent governance auditor and **is not authorized to approve decisions or select options on behalf of the Project Owner**. All recommendations below are strictly analytical recommendations provided for executive consideration.

---

## Executive Overview
Following the successful integration of Wave 3A and independent verification by Agent D2 (verdict `PASS_WITH_DOCUMENTED_LIMITATIONS`), five executive decisions require Project Owner resolution to advance the Salesforce migration from offline verification into gated target org staging and release:

1. **PO-REQ-01**: Ratification of CONTRACT-03 and Formal Acceptance of W6-1 (`daRadarView`).
2. **PO-REQ-02**: Ratification of CONTRACT-05 and Path Allocation for `daSnapshotComparisonModal/` (REM-03).
3. **PO-REQ-03**: Architectural Strategy & Path Allocation for Sankey River View (`daSankeyView` / REM-02 / BLK-02).
4. **PO-REQ-04**: Final Disposition of Quarantined Wave 9 Refactoring Components.
5. **PO-REQ-05**: Authoritative Ratification of Wave 1 and Wave 2 File Ownership Allocations.

---

### DECISION PO-REQ-01: Ratification of CONTRACT-03 & Formal Acceptance of Task W6-1 (`daRadarView`)

- **Decision Identifier:** `PO-REQ-01`
- **Exact Question:**
  Shall the Project Owner formally ratify CONTRACT-03 (Radar Nine-Dimension Architecture Adapter) as frozen v1.0.0 and approve Task W6-1 (`daRadarView`) to transition from `IMPLEMENTED_PENDING_REVIEW` to `FORMALLY_ACCEPTED`?
- **Available Options:**
  - **Option A (Recommended):** Formally ratify CONTRACT-03 with its 9 canonical dimensions and explicit anti-hallucination guardrails (refusing to invent arbitrary scores for missing primitives Layer Purity, Dependency Health, and Test Coverage). Formally accept Task W6-1.
  - **Option B:** Reject CONTRACT-03. Prune `radar` from `daAppShell.html` tab bar, remove it from `APPROVED_VIEWS`, and delete `daRadarView` bundle from the tree.
  - **Option C:** Maintain W6-1 in its current `IMPLEMENTED_PENDING_REVIEW` state, keeping it mounted but gating its production release to a subsequent release cycle.
- **Technical Consequences:**
  - *Option A:* Provides mathematical alignment between LWC UI and legacy React calculation algorithms. Enables offline test runner `run-w6-1-tests.cjs` (10/10 passing) to represent formal acceptance.
  - *Option B:* Reduces shell complexity but drops a major analytical capability and causes regressions in integration tests.
  - *Option C:* Preserves current state without progress; leaves audit blocker open.
- **Security Consequences:** CONTRACT-03 operates purely client-side on memory payloads. Enforces `SELECTION != NAVIGATION` without Apex DML risks.
- **Migration Impact:** Directly closes parity requirement for the 9D Architecture Radar Spider Chart.
- **Files Affected:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.html`
  - `scratch/salesforce-poc/tests/run-w6-1-tests.cjs`
- **Contract Changes Required:** Ratifies `docs/waves-5-9/phase-a3/CONTRACT_03_RADAR_NINE_DIMENSION_ADAPTER.md` as frozen v1.0.0.
- **Dependencies:** None. Lineage and offline tests are already complete.
- **Recommended Option & Rationale:**
  **Option A (Recommendation Only).** The implementation is robust, adheres to all architectural invariants, and refuses to fabricate ungrounded metrics.
- **Consequences of Deferral:** Task W6-1 remains permanently blocked from release certification.

---

### DECISION PO-REQ-02: Ratification of CONTRACT-05 & Path Allocation for Snapshot Comparison (`daSnapshotComparisonModal` / REM-03)

- **Decision Identifier:** `PO-REQ-02`
- **Exact Question:**
  Shall the Project Owner formally ratify CONTRACT-05 (Dual-Snapshot Retrieval and Diff Engine) and authorize the allocation of path `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/` under the exclusive ownership of Agent C2?
- **Available Options:**
  - **Option A (Recommended):** Formally ratify CONTRACT-05 establishing 5 MB single snapshot / 10 MB combined payload caps and the single Cytoscape canvas invariant. Allocate `daSnapshotComparisonModal/` to Agent C2 with the scope restricted to tabular entity diffs (nodes/edges added, removed, modified) without mounting a second Cytoscape canvas.
  - **Option B:** Defer standalone modal comparison to Wave 3. Keep snapshot diffing constrained to tabular metric deltas in `daProjectDashboard`.
  - **Option C:** Formally reject CONTRACT-05 and cancel snapshot comparison from the migration scope.
- **Technical Consequences:**
  - *Option A:* Enables dual snapshot analysis in LWC while strictly preventing browser WebGL/Canvas memory exhaustion.
  - *Option B:* Simplifies scope but leaves visual snapshot parity unaddressed.
  - *Option C:* Permanently excludes snapshot comparison capability.
- **Security Consequences:** Chunk ingestion uses paginated Apex queries with `WITH USER_MODE`. Request correlation tokens suppress stale responses.
- **Migration Impact:** Fulfills legacy parity for historical architecture run comparison.
- **Files Affected:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/*` (New LWC bundle)
  - `scratch/salesforce-poc/tests/run-c2-snapshot-comparison-tests.cjs`
- **Contract Changes Required:** Ratifies `docs/waves-5-9/phase-a3/CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md`.
- **Dependencies:** Preceded by Wave 2A closure (satisfied) and W7-P1 `getAnalysisRuns` endpoint (satisfied).
- **Recommended Option & Rationale:**
  **Option A (Recommendation Only).** Tabular diffing inside a lightweight modal respects Salesforce platform memory bounds while delivering full comparison parity.
- **Consequences of Deferral:** Agent C2 remains blocked in Gated Proposal Mode; `daSnapshotComparisonModal` remains unbuilt.

---

### DECISION PO-REQ-03: Architectural Strategy & Path Allocation for Sankey River View (`daSankeyView` / REM-02 / BLK-02)

- **Decision Identifier:** `PO-REQ-03`
- **Exact Question:**
  How shall blocker `BLK-02` (dependency river rendering) be resolved, and is path `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/` approved for allocation to Agent C3?
- **Available Options:**
  - **Option A (Recommended):** Authorize `daSankeyView/` under Agent C3 using a **pure SVG mathematical implementation** (embedded algorithmic layout calculation in JavaScript/SVG without external npm dependencies or static resources), bypassing CSP and static resource friction.
  - **Option B:** Approve the introduction of an authenticated static resource (`d3-sankey.js`) and allocate `daSankeyView/` to Agent C3.
  - **Option C:** Formally cancel Task REM-02 and remove Sankey River from migration scope.
- **Technical Consequences:**
  - *Option A:* Completely avoids Lightning Web Security (LWS) static resource loading overhead, eliminates external library risks, and provides deterministic SVG DOM output.
  - *Option B:* Reuses D3 layout math but requires static resource packaging, CSP approval, and potential LWS sandbox debugging.
  - *Option C:* Eliminates implementation effort but permanently concedes visual parity for dependency flow analysis.
- **Security Consequences:** Pure SVG rendering inside LWC templates adheres fully to Locker/LWS security rules with zero third-party script execution.
- **Migration Impact:** Restores legacy parity for architectural flow and cross-layer dependency rivers.
- **Files Affected:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/*` (New LWC bundle)
  - `scratch/salesforce-poc/tests/run-c3-sankey-tests.cjs`
- **Contract Changes Required:** None (operates under CONTRACT-01 and CONTRACT-06).
- **Dependencies:** Preceded by Wave 2A closure (satisfied).
- **Recommended Option & Rationale:**
  **Option A (Recommendation Only).** A pure SVG algorithm is mathematically deterministic, aligns with other native custom SVG views (`daSubwayView`, `daArchitectureDnaBarcode`), and eliminates deployment friction.
- **Consequences of Deferral:** Agent C3 remains blocked in Gated Proposal Mode; `daSankeyView` remains unbuilt.

---

### DECISION PO-REQ-04: Final Executive Disposition of Quarantined Wave 9 Components

- **Decision Identifier:** `PO-REQ-04`
- **Exact Question:**
  What is the final executive disposition for unauthorized Wave 9 refactoring code (`daRefactoringEngine`, `daRefactorHandoffModal`) currently quarantined on disk?
- **Available Options:**
  - **Option A (Recommended):** Maintain strict quarantine for Wave 1 and Wave 2. Authorize formal review and potential un-quarantine as a dedicated Wave 3 workstream after all Wave 1 and Wave 2 baseline deliverables are deployed. Mandate immediate creation of `.forceignore` to prevent accidental deployment.
  - **Option B:** Formally reject and delete `daRefactoringEngine` and `daRefactorHandoffModal` source directories from the repository main tree, archiving them exclusively in patch format (`UNAUTHORIZED_W9_IMPLEMENTATION.patch`).
  - **Option C:** Unilaterally ratify CONTRACT-07 and authorize immediate integration of W9 components into `daAppShell`.
- **Technical Consequences:**
  - *Option A:* Preserves verified topological math (Tarjan SCC, cycle severing) while preventing scope creep and deployment failures.
  - *Option B:* Maximizes tree cleanliness and eliminates packaging risk, but discards verified code that passed offline tests.
  - *Option C:* Violates sequential wave discipline and introduces un-gated mutation risks into production bundles.
- **Security Consequences:** Without `.forceignore`, quarantined components create deployment failure risk `BLK-ENV-01`.
- **Migration Impact:** Governs interactive refactoring simulation and export capabilities.
- **Files Affected:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/*`
  - `scratch/salesforce-poc/.forceignore` (Prerequisite)
- **Contract Changes Required:** If Option A is maintained, CONTRACT-07 remains `PROPOSED`.
- **Dependencies:** None.
- **Recommended Option & Rationale:**
  **Option A (Recommendation Only).** The code logic is sound and tested, but must remain quarantined from baseline deployment until Wave 3, protected by an explicit `.forceignore`.
- **Consequences of Deferral:** Quarantined code remains in limbo; live org deployment cannot proceed safely without resolving `BLK-ENV-01`.

---

### DECISION PO-REQ-05: Authoritative Ratification of File Ownership Allocations (`REMAINING_WORK_FILE_OWNERSHIP.csv`)

- **Decision Identifier:** `PO-REQ-05`
- **Exact Question:**
  Does the Project Owner formally ratify the single-writer file allocations defined in `REMAINING_WORK_FILE_OWNERSHIP.csv`, and how should the ownership conflict on `daAppShell.*` (`BLK-OWN-01`) be resolved?
- **Available Options:**
  - **Option A (Recommended):** Formally ratify `REMAINING_WORK_FILE_OWNERSHIP.csv` as the governing allocation matrix. For `daAppShell.*`, designate that Agent D1 (Integration Coordinator) applies Agent C1's verified patch, preserving coordinator-only discipline on shell orchestrators while unblocking the deep-link URL sync feature (REM-04).
  - **Option B:** Reallocate `daAppShell.*` directly to Agent C1 under exclusive ownership.
  - **Option C:** Reject the matrix and maintain strict `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv` allocations without accommodating Wave 2B tasks.
- **Technical Consequences:**
  - *Option A:* Maintains architectural purity (shell modified only by coordinator) while allowing feature agents to deliver verified proposals and tests.
  - *Option B:* Allows direct modification by Agent C1 but breaches coordinator single-writer discipline on the application shell.
  - *Option C:* Leaves REM-04 permanently blocked.
- **Security Consequences:** Restricting `daAppShell` modifications to the coordinator minimizes the risk of breaking core view routing or security invariants.
- **Migration Impact:** Unblocks deep-linking URL synchronization across all views.
- **Files Affected:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html`
  - `scratch/salesforce-poc/tests/run-c1-url-sync-tests.cjs`
- **Contract Changes Required:** None.
- **Dependencies:** Preceded by Wave 2A security hardening (satisfied).
- **Recommended Option & Rationale:**
  **Option A (Recommendation Only).** Preserves coordinator protection on the shell while facilitating clean application of Agent C1's tested changes.
- **Consequences of Deferral:** REM-04 remains blocked; `daAppShell.js` cannot be modified to support URL state synchronization.

---

## Sign-off Directive for Project Owner

To execute any or all of the above decisions, the Project Owner must record their choice (e.g., `APPROVED (Option A)`) in an authoritative governance update signed under DEC-04 Alternative 4.
