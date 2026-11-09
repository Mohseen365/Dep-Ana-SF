# Agent C2: Snapshot Comparison Implementation Report (Gated Precondition Audit & Blocked Technical Proposal)

**Agent Identity:** Agent C2 — Snapshot Comparison Implementation Agent
**Assigned Task:** REM-03 / W8-3 / Wave 2B (`daSnapshotComparisonModal`)
**Operating Mode:** GATED — Read-Only Investigation and Technical Proposal
**Governance Authority Standard:** DEC-04 Alternative 4 (Executive Project Owner Exclusive Signoff)
**Date:** 9 November 2026
**Reference HEAD Commit:** `5d217fc`

---

## 1. Executive Summary & Gating Precondition Verification

In accordance with global execution rules and Agent C2 instructions:
> "Mode: GATED — read-only/proposal until all preconditions pass. Prerequisite gate for this agent: ALL must be verified before any implementation: (1) Project Owner approval of PO-REQ-02; (2) formal CONTRACT-05 approval; (3) explicit allocation of `daSnapshotComparisonModal.*`; (4) confirmed API/backend contract; (5) no ownership conflict with W7-P1 or `DAGraphController.cls`. If any is missing: do NOT implement the modal or invent a substitute contract — only read-only investigation and a technical plan."

### Prerequisite Audit Findings

| Precondition | Required Status | Current Repository Truth | Gating Result |
| :--- | :--- | :--- | :--- |
| **(1) Project Owner Approval of PO-REQ-02** | Executive Approval under DEC-04 Alt 4 | **PENDING** in `PROJECT_OWNER_APPROVAL_REQUESTS.md` § PO-REQ-02. Zero self-approval permitted. | **BLOCKED** |
| **(2) Formal CONTRACT-05 Ratification** | Ratified v1.0.0 | **PROPOSED** in `CONTRACT_AND_AUTHORIZATION_STATUS.md` and `docs/waves-5-9/phase-a3/CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md`. | **BLOCKED** |
| **(3) Explicit Allocation of `daSnapshotComparisonModal.*`** | Present in Authoritative File Manifest | **PROVISIONAL / ABSENT** from `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv`. Listed as `PROVISIONAL-NEEDS-PROJECT-OWNER` in `REMAINING_WORK_FILE_OWNERSHIP.csv`. | **BLOCKED** |
| **(4) Confirmed API / Backend Contract** | Stable & Signoff Complete | `DAGraphController.cls` provides `@AuraEnabled getGraphChunks(runId, startIndex, maxChunks, projectId)`, but W7-P1 / W8-2 / W8-3 lack joint signoff. | **CONDITIONALLY READY (Backend only)** |
| **(5) No Ownership Conflict with W7-P1 or `DAGraphController.cls`** | Exclusive Non-Colliding Boundaries | `DAGraphController.cls` and `DAAnalysisHistoryService.cls` are exclusively owned by WS-5 Lead (W7-P1). Agent C2 has **zero** write access. | **SATISFIED (Strict Read-Only Enforcement)** |

**Gating Conclusion:**
Preconditions (1), (2), and (3) are **NOT SATISFIED**. Therefore, in strict compliance with instructions, Agent C2 **must not** create `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/` or modify production code. This deliverable serves as the formal **Blocked Technical Proposal & Precondition Audit Report**.

---

## 2. In-Depth Read-Only Investigation of Architecture Baseline

### 2.1 Existing Snapshot Storage and Chunk Retrieval
1. **Underlying Data Model:**
   - Analysis runs are stored as `DA_Analysis_Run__c` records scoped to a parent `DA_Project__c`.
   - Graph payloads are stored as chunked records in child object `DA_Graph_Chunk__c` related by `Analysis_Run__c`.
   - Payload field `DA_Graph_Chunk__c.Payload_Data__c` is a Long Text Area capped at **131,072 characters** (UTF-16 code units).
2. **Chunk Query Endpoint (`DAGraphController.cls`):**
   ```apex
   @AuraEnabled(cacheable=true)
   public static List<DA_Graph_Chunk__c> getGraphChunks(String runId, Integer startIndex, Integer maxChunks, String projectId)
   ```
   - Enforces `WITH USER_MODE` and verifies project-run isolation via `resolveProject(projectId)`.
   - Bounded paging: `maxChunks <= 10` per Apex call (~1.31 MB raw text per roundtrip).
   - Validated against integer overflow with safe casting `(Long) startIndex + (Long) maxChunks - 1`.
3. **Chunk Reassembly Utility (`daGraphPayloadLoader.js`):**
   - Reassembly: Concatenates chunks safely on the client.
   - Surrogate-pair protection: UTF-16 high/low surrogates are not fractured across chunk boundaries.
   - Sequence verification: `verifyChunkSequence()` confirms strictly contiguous zero-based indices.

### 2.2 Analysis History & Run Selection Flow (`daAnalysisHistory.js`)
- Analysis runs are fetched via `DAAnalysisHistoryController.getAnalysisRuns({ projectId, queryLimit: 50, queryOffset: 0 })`.
- Selection handling: Checkbox toggles populate `selectedRunIds = new Set()`.
- Compare button state: Enabled strictly when `selectedRunIds.size === 2`.
- Event dispatch:
  ```javascript
  handleCompareSelected() {
      if (this.selectedRunIds.size !== 2) return;
      const [baseRunId, targetRunId] = Array.from(this.selectedRunIds);
      this.dispatchEvent(new CustomEvent('comparelaunch', {
          detail: { baseRunId, targetRunId },
          bubbles: true,
          composed: true
      }));
  }
  ```
- **Current Shell Integration Gap (GAP-C01 / REM-03):**
  `daAppShell` does not yet mount a modal consumer for `comparelaunch`. Once authorized, `daAppShell` will listen for `comparelaunch` and display `daSnapshotComparisonModal`.

---

## 3. Technical Proposal: `daSnapshotComparisonModal` Architecture Specification

When PO-REQ-02 and CONTRACT-05 are ratified, the implementation of `daSnapshotComparisonModal` will follow this exact design.

### 3.1 Public API & Lifecycle
```javascript
// daSnapshotComparisonModal.js
import { LightningElement, api, track } from 'lwc';
import getGraphChunks from '@salesforce/apex/DAGraphController.getGraphChunks';
import { reassembleChunks, validatePayloadIntegrity, MAX_TOTAL_PAYLOAD_SIZE } from 'c/daGraphPayloadLoader';

export default class DaSnapshotComparisonModal extends LightningElement {
    @api projectId;
    @api baseRunId;
    @api targetRunId;
    @api isOpen = false;

    @track isLoading = false;
    @track errorMessage = '';
    @track diffResult = null;
    @track activeCategory = 'ALL'; // 'ALL' | 'NODES' | 'EDGES'
    @track searchTerm = '';
}
```

### 3.2 Dual Snapshot Ingestion & Memory Safeguards
1. **Sequential / Bounded Parallel Chunk Ingestion:**
   - Ingest chunks for `baseRunId` and `targetRunId` using paged batches of 10 chunks.
   - Enforce monotonic `requestId` token to discard stale responses if the modal is dismissed or runs change mid-flight.
2. **Defensive Payload Caps (CONTRACT-05 / DEC-02):**
   - Single snapshot string length: `<= 5,242,880 UTF-16 code units` (~5 MB).
   - Combined snapshot string length: `<= 10,485,760 UTF-16 code units` (~10 MB).
   - If either exceeds limit, throw immediate fail-closed error: `Payload exceeds platform memory safety limits (5MB single / 10MB combined).`
3. **Canvas Invariant Preservation:**
   - **Single Cytoscape Canvas Invariant (W0-C7):** The modal **never** instantiates a Cytoscape canvas instance. Comparison is rendered purely as an accessible SLDS tabular/card entity diff view.

### 3.3 Pure Client-Side Diff Computation Algorithm
In strict adherence to CONTRACT-05, the diff algorithm runs purely in JavaScript:
- **Node Matching:** Map by `node.id`.
  - Added: Present in target snapshot, absent in base snapshot.
  - Removed: Present in base snapshot, absent in target snapshot.
  - Modified: Present in both, but tracked properties differ (`risk`, `layer`, `type`, `coupling`, `coverageStatus`, `coverageDensity`, `cyclomaticComplexity`, `hasCycle`).
  - Unchanged: All tracked properties identical.
- **Edge Matching:** Map by `edge.id` (or fallback `${source}->${target}`).
  - Added: Present in target snapshot, absent in base snapshot.
  - Removed: Present in base snapshot, absent in target snapshot.
  - Modified: Present in both, but `relationshipType` / `weight` differ.
- **Source Immutability:** Neither `baseSnapshot` nor `targetSnapshot` is mutated; diff calculation generates a new isolated `diffResult` structure.
- **Sorting:** All output arrays are sorted deterministically by `id` ASC.

### 3.4 Modal UI States & SLDS Blueprint
1. **Loading State:** SLDS spinner with progress text ("Ingesting snapshot chunks... Computing structural diff...").
2. **Error State:** SLDS scoped notification banner with actionable message (e.g., mismatched project, incomplete chunks, or memory limit exceeded).
3. **Empty / No Changes State:** SLDS illustration showing identical snapshots ("No architectural changes detected between selected snapshots").
4. **Summary & Inspection State:**
   - Executive KPI tiles: `+ Nodes`, `- Nodes`, `~ Modified Nodes`, `+ Edges`, `- Edges`, `~ Modified Edges`.
   - Category filtering: Buttons for `All`, `Nodes`, `Edges`.
   - Search/Filter bar: Instant client-side filtering by entity ID or name.
   - Interactive SLDS data table with status badges (`slds-badge_success` for added, `slds-badge_error` for removed, `slds-badge_warning` for modified).

---

## 4. Contract and Ownership Dependency Status

- **CONTRACT-05:** Status: `PROPOSED`. Requires ratification by Project Owner.
- **PO-REQ-02:** Status: `PENDING`. Requires Project Owner executive authorization.
- **File Ownership Manifest:** Path `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/` must be added to `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv` under exclusive ownership of Agent C2.
- **Test Runner Ownership:** `scratch/salesforce-poc/tests/run-c2-snapshot-comparison-tests.cjs` is pre-allocated to Agent C2 in `REMAINING_WORK_FILE_OWNERSHIP.csv` and ready for activation upon unblocking.
