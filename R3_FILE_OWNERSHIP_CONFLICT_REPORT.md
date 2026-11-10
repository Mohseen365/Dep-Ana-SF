# R3 File Ownership Conflict and Manifest Reconciliation Report

**Auditor:** Agent R3 — Project Governance, Contract and Authorization Reconciliation Auditor
**Date:** 2026-11-10
**Framework:** DEC-04 Alternative 4
**Target Manifest Baseline:** `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv` (175 Paths)
**Proposed Allocation Baseline:** `REMAINING_WORK_FILE_OWNERSHIP.csv` (74 Paths)

---

## 1. Executive Summary

This report reconciles the authoritative repository file ownership manifest against proposed remaining-work assignments, physical files on disk, and integrated release candidate changes.

Key findings:
1. **Direct Ownership Conflict on `daAppShell.*`:** The authoritative manifest restricts all edits to `Integration Coordinator` (`INTEGRATION_COORDINATOR_ONLY`), whereas `REMAINING_WORK_FILE_OWNERSHIP.csv` assigns write authority to `Agent C1` for Task `REM-04`.
2. **Provisional Unallocated Component Paths:** Two prospective LWC modules (`daSankeyView` and `daSnapshotComparisonModal`) are completely missing from the 175-path authoritative manifest.
3. **Historical vs Active Overlap on `daGraphViewer.*`:** Historically owned by Workstream A (Tasks W5-1 through W5-6); proposed and modified by Agent C4 (REM-05).
4. **Physical Files Omitted from Manifest:** 50 physical files reside in `scratch/salesforce-poc/` (including test runners, mocks, and DTOs) that are absent from the 175-path manifest.
5. **Critical Packaging Exclusion Missing:** Quarantined Wave 9 components (`daRefactoringEngine`, `daRefactorHandoffModal`) exist in the deployable source tree without a corresponding `.forceignore` or `manifest/package.xml`.

---

## 2. In-Depth Audit of Critical Paths

### 2.1 `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.*`
- **Files Affected:**
  - `daAppShell.js`
  - `daAppShell.html`
  - `daAppShell.css`
  - `daAppShell.js-meta.xml`
  - `daFilterSchema.js`
- **Authoritative Manifest Status (`WAVE_0_4_1`):**
  - Owner: `Integration Coordinator`
  - Mutability Tier: `INTEGRATION_COORDINATOR_ONLY`
  - Permitted Task: `INT-1 / Coordinator`
- **Remaining Work Assignment:**
  - Proposed Owner: `Agent C1`
  - Proposed Task: `REM-04` (Dynamic Lightning URL Parameter Sync)
- **Conflict Assessment (`BLK-OWN-01`):**
  - High severity conflict. Agent C1 was instructed not to touch `daAppShell.js` until Project Owner ratification of `PO-REQ-05`. Agent C1 complied, delivering a read-only proposal and test runner `run-c1-url-sync-tests.cjs`.
  - **Resolution Path:** Project Owner must either:
    - (Option 1) Ratify PO-REQ-05 and reallocate `daAppShell.*` to Agent C1; OR
    - (Option 2) Maintain `INTEGRATION_COORDINATOR_ONLY` and instruct Agent D1 to integrate C1's implementation patch.

### 2.2 `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.*`
- **Files Affected:**
  - `daGraphViewer.js`
  - `daGraphViewer.html`
  - `daGraphViewer.css`
  - `daGraphViewer.js-meta.xml`
  - `daLayoutEngine.js`
- **Authoritative Manifest Status (`WAVE_0_4_1`):**
  - Owner: `Workstream A Lead`
  - Mutability Tier: `EXCLUSIVE_FEATURE_OWNER` (SERIALIZED_OR_BUNDLED)
  - Permitted Tasks: `W5-1` through `W5-6`
- **Integrated Reality (PR #163 by Agent C4):**
  - Modified By: `Agent C4` for `REM-05` (Export PNG/SVG and layout performance)
  - Verified By: `Agent D1` (SHA verification) and `Agent D2`
- **Conflict Assessment:**
  - Historical Workstream A serialization was completed. Agent C4 was assigned exclusive write access for Wave 2B in `REMAINING_WORK_FILE_OWNERSHIP.csv`. The integration was cleanly merged by Agent D1 without collision.
  - **Status:** Operationally resolved via D1 integration, but requires formal Project Owner ratification under PO-REQ-05 to update the authoritative manifest baseline.

### 2.3 `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/`
- **Files Affected:**
  - `daSnapshotComparisonModal.js`
  - `daSnapshotComparisonModal.html`
  - `daSnapshotComparisonModal.css`
  - `daSnapshotComparisonModal.js-meta.xml`
- **Authoritative Manifest Status (`WAVE_0_4_1`):**
  - **ABSENT**. Path does not exist in the 175-path manifest.
- **Physical Disk Status:**
  - Directory does not exist on disk.
- **Conflict Assessment (`BLK-OWN-02`):**
  - Classified as `PROVISIONAL-NEEDS-PROJECT-OWNER`. Agent C2 adhered to gating discipline and did not create the component files.
  - **Resolution Path:** Project Owner must execute PO-REQ-02 to formally allocate this path before any source files can be added.

### 2.4 `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/`
- **Files Affected:**
  - `daSankeyView.js`
  - `daSankeyView.html`
  - `daSankeyView.css`
  - `daSankeyView.js-meta.xml`
- **Authoritative Manifest Status (`WAVE_0_4_1`):**
  - **ABSENT**. Path does not exist in the 175-path manifest.
- **Physical Disk Status:**
  - Directory does not exist on disk.
- **Conflict Assessment (`BLK-OWN-03`):**
  - Classified as `PROVISIONAL-NEEDS-PROJECT-OWNER`. Agent C3 adhered to gating discipline and delivered an architecture specification without creating unallocated files.
  - **Resolution Path:** Project Owner must execute PO-REQ-03 to formally allocate this path before any source files can be added.

### 2.5 `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
- **Authoritative Manifest Status (`WAVE_0_4_1`):**
  - Owner: `Workstream C Lead`
  - Mutability Tier: `EXCLUSIVE_FEATURE_OWNER`
  - Permitted Task: `W7-P1` (Historical run retrieval)
- **Remaining Work Assignment:**
  - Assigned to `Workstream 5 Lead` for `W7-P1`.
- **Conflict Assessment:**
  - No collision. Workstream naming difference (Workstream C vs Workstream 5) refers to the same owner responsible for Analysis History and historical endpoints. Endpoint `getAnalysisRuns` was implemented with `WITH USER_MODE`.

### 2.6 `.forceignore` & `manifest/package.xml` (`BLK-ENV-01`)
- **Authoritative Manifest Status (`WAVE_0_4_1`):**
  - Neither file is tracked in the 175-path manifest.
- **Physical Disk Status:**
  - Neither file exists in `scratch/salesforce-poc/`.
- **Critical Risk:**
  - Quarantined Wave 9 components (`daRefactoringEngine`, `daRefactorHandoffModal`) reside directly inside `force-app/main/default/lwc/`.
  - Without `.forceignore`, any standard Salesforce DX command (`sf project deploy start`) will automatically discover, compile, and deploy these quarantined components to target orgs, violating DEC-04 Alternative 4.
  - **Resolution Path:** Packaging Agent or Release Engineering must add `scratch/salesforce-poc/.forceignore` containing:
    ```
    **/lwc/daRefactoringEngine/**
    **/lwc/daRefactorHandoffModal/**
    ```

### 2.7 Supporting Test and Validation Scripts Under `scratch/salesforce-poc/tests/`
- **Dedicated Task Runners:**
  - `run-b4-security-tests.cjs` (Agent B4, SEC-01)
  - `run-b5-validation-tests.cjs` (Agent B5, VAL-01)
  - `run-c1-url-sync-tests.cjs` (Agent C1, REM-04)
  - `run-c4-export-tests.cjs` (Agent C4, REM-05)
  - `run-s1-security-tests.cjs` (Agent S1, SEC-01..03)
- **Status in Manifest:**
  - None of these dedicated task runners are tracked in `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv` (which tracked only the 9 baseline runners and 5 wave runners).
  - All were created with unique, non-colliding filenames and integrated by Agent D1 without boundary violation.

---

## 3. Ownership Matrix Summary Table

| Path Pattern | Authoritative Manifest Owner | Proposed / Actual Writer | Conflict Type | Status | Required PO Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `lwc/daAppShell/*` | Integration Coordinator | Agent C1 (REM-04) | Writer Conflict | DISPUTED | PO-REQ-05 Signoff |
| `lwc/daGraphViewer/*` | Workstream A Lead | Agent C4 (REM-05) | Historical vs Wave 2B | OPERATIONALLY RESOLVED | PO-REQ-05 Ratification |
| `lwc/daSnapshotComparisonModal/*` | None (Unallocated) | Agent C2 (REM-03) | Missing Path Allocation | PROVISIONAL BLOCKED | PO-REQ-02 Signoff |
| `lwc/daSankeyView/*` | None (Unallocated) | Agent C3 (REM-02) | Missing Path Allocation | PROVISIONAL BLOCKED | PO-REQ-03 Signoff |
| `classes/DAGraphController.cls` | Workstream C Lead | Workstream 5 Lead | Nomenclature Only | ALIGNED | None |
| `scratch/salesforce-poc/.forceignore` | None | Packaging Agent | Missing Quarantine Guard | OPEN DEPLOYMENT BLOCKER | Authorize creation |

---

## 4. Governance Recommendations
1. The Authoritative File Ownership Manifest should NOT be modified directly by any feature agent or auditor.
2. The Project Owner should formally ratify `REMAINING_WORK_FILE_OWNERSHIP.csv` via `PO-REQ-05` and authorize Integration Coordinator D1 to update the authoritative manifest.
3. Creation of `scratch/salesforce-poc/.forceignore` must be authorized immediately to resolve `BLK-ENV-01`.
