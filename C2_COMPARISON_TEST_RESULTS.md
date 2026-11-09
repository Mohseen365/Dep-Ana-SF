# Agent C2: Snapshot Comparison Test Results & Baseline Evidence

**Agent Identity:** Agent C2 — Snapshot Comparison Implementation Agent
**Assigned Task:** REM-03 / W8-3 / Wave 2B (`daSnapshotComparisonModal`)
**Operating Mode:** GATED — Read-Only Investigation and Technical Proposal
**Date:** 9 November 2026
**Reference HEAD Commit:** `5d217fc`

---

## 1. Verified Baseline Test Suites (Zero Regressions)

Prior to documenting the gated technical proposal, Agent C2 executed all related offline test suites across coordinator integration, analysis history, workstream 5, and security verification. All tests passed with 100% integrity.

### 1.1 Central Coordinator Integration Suite (`run-coordinator-integration-suite.cjs`)
- **Execution Command:** `node scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs`
- **Result:** 13 PASSED, 0 FAILED
- **Verified Invariants:**
  - `SELECTION != NAVIGATION` invariant strictly preserved across all views.
  - Single Cytoscape canvas instance invariant preserved.
  - Null-coalescing user preference serialization.
  - Cross-view event propagation and stale request suppression.

### 1.2 Analysis History Feature Suite (`run-analysis-history-tests.cjs`)
- **Execution Command:** `node scratch/salesforce-poc/tests/run-analysis-history-tests.cjs`
- **Result:** ALL 4 SUITES PASSED
- **Verified Invariants:**
  - Static artifact presence for `DAAnalysisRunDTO.cls`, `DAAnalysisHistoryService.cls`, `DAAnalysisHistoryController.cls`, and `daAnalysisHistory` LWC bundle.
  - Apex security: `WITH USER_MODE`, two-step project resolution, deterministic ordering (`Run_Timestamp__c DESC, Id DESC`).
  - Run status classification (DEC-01 chunk count integrity).
  - LWC CustomEvent dispatch: verification that `comparelaunch` event is properly constructed with `{ detail: { baseRunId, targetRunId }, bubbles: true, composed: true }`.

### 1.3 Workstream 5 Feature Suite (`run-ws5-tests.cjs`)
- **Execution Command:** `node scratch/salesforce-poc/tests/run-ws5-tests.cjs`
- **Result:** 10 PASSED, 0 FAILED
- **Verified Invariants:**
  - Suite 1: Two-step project resolution (Salesforce ID vs Project Key).
  - Suite 2: DEC-01 chunk count match validation (`AVAILABLE` vs `EMPTY`).
  - Suite 3: History query compound ordering.
  - Suite 4: User preference 131,072 character capacity boundary.
  - Suite 5: `daProjectDashboard` metric trends and layout calculations.
  - Suite 6: CONTRACT-05 diff properties compliance (Added, Removed, Modified, and Summary Deltas).

### 1.4 Security Remediation Suite (`run-s1-security-tests.cjs`)
- **Execution Command:** `node scratch/salesforce-poc/tests/run-s1-security-tests.cjs`
- **Result:** 11 PASSED, 0 FAILED
- **Verified Invariants:**
  - SEC-01 FLS verification (29 fields granted in permission set, Master-Detail and required excluded).
  - SEC-02 Apex USER_MODE coverage.
  - SEC-03 BroadcastChannel multi-window isolation and echo suppression.

---

## 2. Planned Test Suite for `daSnapshotComparisonModal` (`run-c2-snapshot-comparison-tests.cjs`)

Upon Project Owner ratification of PO-REQ-02 and CONTRACT-05, the following comprehensive test matrix will be implemented in `scratch/salesforce-poc/tests/run-c2-snapshot-comparison-tests.cjs`:

| Test ID | Test Scenario | Expected Outcome | Invariant / Rule |
| :--- | :--- | :--- | :--- |
| **TC-C2-01** | Identical Snapshots (No Changes) | `diffResult.summary` shows 0 added, 0 removed, 0 modified; UI renders empty/no-change state. | Structural diff identity |
| **TC-C2-02** | Added and Removed Nodes | Correctly classifies new nodes in Target as `added` and missing nodes in Target as `removed`. | Node lifecycle categorization |
| **TC-C2-03** | Modified Node Properties | Detects changes in `risk`, `layer`, `coupling`, `cyclomaticComplexity`, `coverageStatus`. | CONTRACT-05 property tracking |
| **TC-C2-04** | Added and Removed Edges | Correctly tracks edge endpoint creation and deletion by edge ID. | Edge structural diffing |
| **TC-C2-05** | Modified Edges | Identifies relationship type changes and method signature modifications. | Edge attribute diffing |
| **TC-C2-06** | Large Payload Limit Boundary | Rejects payloads where single snapshot > 5 MB or combined > 10 MB fail-closed. | Platform memory safety |
| **TC-C2-07** | Incomplete / Corrupt Chunks | Gracefully displays error state when chunk indices are non-contiguous or missing. | Ingestion resilience |
| **TC-C2-08** | Project Isolation | Rejects comparisons where `baseRunId` or `targetRunId` does not belong to `activeProjectId`. | Multi-tenant isolation |
| **TC-C2-09** | Immutability of Source Snapshots | Deep freezes inputs before diff; verifies inputs are identical before and after diff execution. | Graph payload immutability |
| **TC-C2-10** | Single Cytoscape Canvas Invariant | Verifies that modal does not instantiate a Cytoscape instance or alter main canvas. | W0-C7 invariant |
| **TC-C2-11** | Stale Response Suppression | Rapid run switching invalidates prior chunk ingestion promises using monotonic request IDs. | Asynchronous race guard |
