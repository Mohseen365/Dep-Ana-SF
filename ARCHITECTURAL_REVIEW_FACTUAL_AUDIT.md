# Factual Accuracy Audit & Reconciliation of Master Architectural Review

**Auditor Role**: Principal Salesforce Platform Architect & Migration Program Lead (Independent Reviewer)
**Inputs Audited**:
1. Eight (8) Original Step A Planning Documents (`PARALLEL_IMPLEMENTATION_PLAN.md`, `AGENT_WORKSTREAM_ASSIGNMENTS.md`, `SHARED_CONTRACTS.md`, `IMPLEMENTATION_DEPENDENCY_GRAPH.md`, `IMPLEMENTATION_PROGRESS.md`, `INTEGRATION_LOG.md`, `BLOCKERS_AND_DECISIONS.md`, `FINAL_MIGRATION_VERIFICATION.md`)
2. Review Document: `MASTER_ARCHITECTURAL_REVIEW_AND_IMPROVED_PLAN.md`
3. Repository Ground Truth: `scratch/salesforce-poc/force-app/main/default/` metadata, classes, and test runners.

---

## 1. Audit of Findings (F-01 through F-10)

| ID | Stated Severity | Stated Claim in Review | Ground Truth Verification & Citations | Audit Verdict | Correction / True Platform Truth |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **F-01** | **P0** | DEC-01 infers `AVAILABLE` solely on chunks >= 1; partial failure creates corrupted graphs. Review claimed `DA_Analysis_Run__c` lacks status fields and proposed adding `Expected_Chunks__c` and `Status__c`. | **WRONG ON SCHEMA, CONFIRMED ON CONTRACT GAP**: `DA_Analysis_Run__c` **already contains** `Status__c` (Picklist: `AVAILABLE`, `EMPTY`, `FAILED` in `objects/DA_Analysis_Run__c/fields/Status__c.field-meta.xml`) and `Total_Chunks__c` (Number(6,0) in `fields/Total_Chunks__c.field-meta.xml`). However, `SHARED_CONTRACTS.md § 1.2` and `BLOCKERS_AND_DECISIONS.md § 1` explicitly specified: *"If DA_Analysis_Run__c has >= 1 associated chunks, status is classified as AVAILABLE"*, failing to compare chunk count to `Total_Chunks__c`. | **PARTIALLY CONFIRMED / AMENDED** | Delete the claim that new schema fields (`Expected_Chunks__c`) must be created. The schema already has `Total_Chunks__c` and `Status__c`. Amend DEC-01 to require matching `COUNT(Chunks) == Total_Chunks__c` and `Status__c == 'AVAILABLE'`. |
| **F-02** | **P0** | Contradiction between `PARALLEL_IMPLEMENTATION_PLAN.md § 6` marking checklist complete `[x]` vs. `BLOCKERS_AND_DECISIONS.md § 3` requiring Gate 1A/1B signoff. | Verified: `PLAN § 6` has `[x] Resolution of technical decisions DEC-01 through DEC-04`, while `BLOCKERS § 3` states Gate 1B has not executed and blocks Step B dispatch. | **CONFIRMED** | Reconcile checklist in `PARALLEL_IMPLEMENTATION_PLAN.md` to show Gate 1B as pending `[ ]`. |
| **F-03** | **P1** | LMS proposed across browser windows for detached drawer, but LMS does not span browser windows/tabs in Lightning Experience. | Verified: `PLAN § 4` and `SHARED_CONTRACTS § 2.1.5` propose LMS for cross-window detached drawers. Salesforce official documentation confirms Lightning Message Service (LMS) only communicates across components within the same browser window/tab frame hierarchy. | **CONFIRMED** | Strike LMS for cross-window IPC. Mandate browser `BroadcastChannel` with fallback to `window.postMessage` or `localStorage` events. |
| **F-04** | **P1** | Apex services described as orchestrating "chunk reassembly", risking 6 MB heap overflow on a 10 MB payload. | Verified: `PLAN § 2.1.3` states *"Services: Handle business logic, chunk reassembly/splitting orchestration"*, while `SHARED_CONTRACTS § 3.5` states reassembly is client-side in `daGraphPayloadLoader`. Reassembling 10 MB in Apex would immediately breach the 6 MB synchronous heap limit. | **CONFIRMED** | Forbid Apex chunk reassembly in architecture documentation; restrict Apex exclusively to bounded raw chunk retrieval. |
| **F-05** | **P1** | Inconsistent naming: `daRefactoringSimulator` vs `daRefactoringSimulationPanel`. | Verified: `PROGRESS.md § 2.7` uses `daRefactoringSimulator`; `PLAN § 4` uses `daRefactoringSimulationPanel`. | **CONFIRMED** | Standardize canonical bundle name as `daRefactoringSimulation` (UI panel) and `daRefactoringEngine` (headless math utility). |
| **F-06** | **P1** | `daSnapshotComparisonModal` required by BLK-04 is omitted from Workstream 5 file allowlist in `AGENT_WORKSTREAM_ASSIGNMENTS.md`. | Verified: BLK-04 references `daSnapshotComparisonModal`, but `AGENT_WORKSTREAM_ASSIGNMENTS.md § WS-5.5` allowlist omits it. | **CONFIRMED** | Add `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/*` to Workstream 5 file allowlist. |
| **F-07** | **P1** | DEC-03 sign convention ambiguity: mathematical delta is negative for reduction (`new - base`), but UI expects positive integer. | Verified: `SHARED_CONTRACTS § 6.2` defines `cyclicSccCountDelta = new - base` (negative indicates reduction). Displaying a negative number to users as "cycles eliminated" causes UI confusion. | **CONFIRMED** | Preserve mathematical delta `cyclicSccCountDelta` in backend contracts; expose `cyclicSccReduction = base - new` (positive integer) in UI. |
| **F-08** | **P1** | Plan omits specification of external Node analyzer ingestion transport mechanism into Salesforce. | Verified: `PLAN § 2.1.1` mandates analyzer remains external, but nowhere in `PLAN`, `CONTRACTS`, or `ASSIGNMENTS` is the network ingestion protocol (REST endpoint, Connected App auth, batching) defined. | **CONFIRMED** | Specify REST Ingestion Endpoint (`/services/apexrest/DAGraphIngestion/` or Composite REST) with Bearer token authentication and bounded chunk batching. |
| **F-09** | **P2** | "16-point Implementation Authorization Orders" cited in DEC-04 but not defined in any of the 8 planning documents. | Verified: DEC-04 cites "formal 16-point Implementation Authorization Orders", but none of the 8 planning files defines the schema or fields. | **CONFIRMED** | Standardize the 16-point template in Section 5.5 of the improved plan. |
| **F-10** | **P2** | Arithmetic error in review: Review claimed scenario sum is 299, but actual sum is 289. | **WRONG IN REVIEW**: `INTEGRATION_LOG.md § 1.1` text stated 276. The review stated the table sums to 299. Recalculation: $43+32+8+12+14+11+10+12+15+9+6+8+13+9+10+11+10+10+24+22 = \mathbf{289}$. | **CONFIRMED ERROR IN REVIEW** | Delete the claim of 299 scenarios. The true scenario sum in `INTEGRATION_LOG.md` is **289** (276 in text was also wrong by 13). |

---

## 2. Audit of Risks (R-01 through R-15) and Kill Criteria

- **R-01 (Cytoscape blocked under LWS)**: **CONFIRMED**. Real platform risk. Third-party canvas libraries that touch DOM elements outside shadow roots or attach global listeners can throw `SecurityException` under Lightning Web Security. **Kill Criterion 1 is VALID**.
- **R-02 (Partial Ingestion Corruption)**: **CONFIRMED**. Directly addressed by amending DEC-01 using existing `Total_Chunks__c` and `Status__c` fields.
- **R-03 (Apex Heap Limit Exhaustion)**: **CONFIRMED**. 10 MB payload > 6 MB synchronous heap limit. Reassembly in Apex is fatal.
- **R-04 (Coordinator Merge Bottleneck)**: **CONFIRMED**. Locking 5 files (`daAppShell.*`, etc.) to one person makes shell integration a sequential funnel.
- **R-05 (Large Graph DOM Freezing)**: **CONFIRMED**. 528 nodes with complex styling and hundreds of edges without Level-of-Detail (LOD) causes browser jank.
- **R-06 (Unverified FLS Security Violations)**: **CONFIRMED**. `WITH USER_MODE` queries throw `System.QueryException` if fields lack FLS; BLK-01 is open.
- **R-07 (LMS Cross-Window Failure)**: **CONFIRMED**. LMS cannot cross browser windows.
- **R-08 (Storage Cost Overrun)**: **CONFIRMED**. 10 MB per analysis run across 100 runs = 1 GB of data storage, exceeding Developer Edition (5 MB) and rapid consumption in Production.
- **R-09 (Surrogate Pair Boundary Truncation)**: **CONFIRMED**. Splitting UTF-16 surrogate pairs (`0xD800-0xDBFF`, `0xDC00-0xDFFF`) corrupts JSON strings.
- **R-10 (Selection vs Navigation Invariant Violation)**: **CONFIRMED**. Core architectural invariant from Contract W0-C7.
- **R-11 (Client-Side Diff Engine Browser Freeze)**: **CONFIRMED**. Diffing two 528-node graphs with edge maps on the main JavaScript thread causes noticeable UI lockup. **Kill Criterion 2 is VALID**.
- **R-12 (Broken SVG Paths in Subway/DNA)**: **CONFIRMED**. SVG rendering in LWC requires strict kebab-case attributes and namespace safety under CSP.
- **R-13 (Tarjan SCC Metric Discrepancy)**: **CONFIRMED**. Discrepancies between elementary cycle severing and maximal strongly connected components have caused previous audit blockers.
- **R-14 (Governor CPU Timeout on Ingestion)**: **CONFIRMED**. Validating and inserting chunks in tight synchronous transactions risks hitting the 10,000 ms Apex CPU limit.
- **R-15 (Silent Feature Dropping)**: **CONFIRMED**. Without a feature disposition matrix, React features (e.g. Command Palette, quick filters) disappear unnoticed.

---

## 3. Recomputed Numeric Claims Audit

### 3.1 Test Scenarios Recomputation
- Stated in `INTEGRATION_LOG.md` text: **276 scenarios**.
- Stated in `MASTER_ARCHITECTURAL_REVIEW`: **299 scenarios**.
- **Exact Ground Truth Arithmetic**:
  - `run-poc-tests.cjs`: 43
  - `run-wave4-integration-suite.cjs`: 32
  - `run-analysis-history-tests.cjs`: 8
  - `run-lane-a-schema-tests.cjs`: 12
  - `run-lane-c-preset-manager-tests.cjs`: 14
  - `run-lane-d-graph-filter-tests.cjs`: 11
  - `run-lane-e-matrix-tests.cjs`: 10
  - `run-lane-f-findings-tests.cjs`: 12
  - `run-lwc-jest-tests.cjs`: 15
  - `run-p0-verification-tests.cjs`: 9
  - `run-p1-header-tests.cjs`: 6
  - `run-p1-sidebar-tests.cjs`: 8
  - `run-w5-1-tests.cjs`: 13
  - `run-w6-2-tests.cjs`: 9
  - `run-w6-3-tests.cjs`: 10
  - `run-w6-4-tests.cjs`: 11
  - `run-w7-1-tests.cjs`: 10
  - `run-w7-2-tests.cjs`: 10
  - `run-workstream-a-tests.cjs`: 24
  - `run-workstream-c-tests.cjs`: 22
  - **TOTAL**: $43 + 32 + 8 + 12 + 14 + 11 + 10 + 12 + 15 + 9 + 6 + 8 + 13 + 9 + 10 + 11 + 10 + 10 + 24 + 22 = \mathbf{289}$.
  - **Verdict**: Both 276 (in `INTEGRATION_LOG.md`) and 299 (in `MASTER_ARCHITECTURAL_REVIEW`) were **WRONG**. The true count is **289**.

### 3.2 Parity Percentage Recomputation (`IMPLEMENTATION_PROGRESS.md § 1`)
- **Custom Objects & Fields**: 6 objects / 35 fields. All metadata exists. Status: 100% metadata deployed, but 0% FLS verified.
- **Apex Classes**: Text claims 10 classes; repository ground truth has **16 `.cls` files** (10 non-test classes + 6 test classes, or 4 controllers + 3 services + 3 DTOs + 1 standalone controller = 11 production classes). Stated 10 was an undercount of production classes.
- **Advanced Visualizations**: Stated: 6 target views, 4 completed, 2 planned, 67% parity.
  - Section 2.5 lists: Completed = `daArchitectureDnaBarcode`, `daSubwayView`, `daTreemapView` (3 views). Planned = `daRadarView`, `daSankeyView` (2 views).
  - True denominator: 5 enumerated views (or 6 if including `daFourDirectionView`).
  - True completed count: **3 views**.
  - Recalculated parity: $3 / 5 = \mathbf{60.0\%}$ (or $3 / 6 = \mathbf{50.0\%}$). Stated 67% was **WRONG**.

### 3.3 Chunk & Payload Boundary Arithmetic
- Max Chunk Size: 131,072 characters (matches Salesforce LongTextArea max length).
- Total Payload Cap: 10,485,760 characters.
- Number of Chunks: $10,485,760 / 131,072 = \mathbf{80\text{ chunks}}$ (not 100 chunks).
- Maximum page fetch size: 10 chunks per call. Full retrieval requires exactly 8 round trips for a max-capped payload.

---

## 4. Platform Validity of Proposed Fixes

1. **PROPOSED FIX: "Add `Expected_Chunks__c` to `DA_Analysis_Run__c`"** -> **INVALID AS PROPOSED / REDUNDANT**.
   - **Reason**: `DA_Analysis_Run__c` already has `Total_Chunks__c` (Number 6,0). Adding a duplicate `Expected_Chunks__c` is redundant metadata clutter.
   - **Valid Platform Solution**: Use existing `Total_Chunks__c` and populate it upon analysis run creation.
2. **PROPOSED FIX: "Cross-Window LMS"** -> **TECHNICALLY INVALID ON SALESFORCE**.
   - **Reason**: Lightning Message Service does not operate across browser tabs or windows.
   - **Valid Platform Solution**: `BroadcastChannel` API or `localStorage` window storage event listener.
3. **PROPOSED FIX: "Apex chunk reassembly"** -> **TECHNICALLY INVALID ON SALESFORCE**.
   - **Reason**: Reassembling 10 MB payload in Apex exceeds the 6 MB synchronous heap limit.
   - **Valid Platform Solution**: Streaming chunk pagination to LWC; reassembly exclusively in client JavaScript.

---

## 5. Review Claims to Delete

The following claims in `MASTER_ARCHITECTURAL_REVIEW_AND_IMPROVED_PLAN.md` are factually inaccurate and must be struck or corrected:
1. **DELETE**: Claim that `DA_Analysis_Run__c` lacks an expected chunk field and requires adding `Expected_Chunks__c`. (*Correction: `Total_Chunks__c` already exists in metadata.*)
2. **DELETE**: Claim that the test scenario total in `INTEGRATION_LOG.md` sums to 299. (*Correction: It sums to 289.*)
3. **DELETE**: Claim that 4 Advanced Visualizations are completed in `IMPLEMENTATION_PROGRESS.md`. (*Correction: Only 3 are completed: Treemap, Subway, DNA.*)
4. **DELETE**: Any mention of using Lightning Message Service (LMS) across browser windows for detached drawers. (*Correction: LMS is strictly intra-window.*)

---

## 6. Corrected Findings Table (Audited)

| ID | Severity | Type | Reconciled Finding Description | Platform Evidence Citation | Verified Resolution |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **F-01** | **P0** | **Contract Gap** | DEC-01 infers run availability solely from `COUNT(Chunks) >= 1`, allowing partially uploaded or interrupted runs to be read as valid. | `objects/DA_Analysis_Run__c/fields/Total_Chunks__c.field-meta.xml` and `fields/Status__c.field-meta.xml` | Amend DEC-01: An analysis run is only `AVAILABLE` when `Status__c == 'AVAILABLE'` AND `COUNT(Chunks) == Total_Chunks__c`. |
| **F-02** | **P0** | **Governance Contradiction** | `PLAN.md § 6` claims pre-implementation checklist is 100% complete, but `BLOCKERS.md § 3` shows Gate 1B business authorization is pending. | `PARALLEL_IMPLEMENTATION_PLAN.md § 6` vs `BLOCKERS_AND_DECISIONS.md § 3` | Mark Gate 1B business ratification as pending `[ ]` in `PLAN.md`. |
| **F-03** | **P1** | **Platform Violation** | Proposal to use LMS across detached browser windows is invalid in Lightning Experience. | Salesforce LWS & LMS Developer Documentation | Replace LMS with native browser `BroadcastChannel` API. |
| **F-04** | **P1** | **Architecture Defect** | Apex service layer stated as orchestrating chunk reassembly, which causes heap exhaustion on large graphs. | Salesforce Apex Synchronous Heap Limit (6 MB) | Clarify that Apex only handles chunk storage/retrieval; reassembly is 100% client-side in LWC. |
| **F-05** | **P1** | **Naming Inconsistency**| Component named `daRefactoringSimulator` in `PROGRESS.md` vs `daRefactoringSimulationPanel` in `PLAN.md`. | `IMPLEMENTATION_PROGRESS.md § 2.7` vs `PARALLEL_IMPLEMENTATION_PLAN.md § 4` | Standardize canonical bundle as `daRefactoringSimulation`. |
| **F-06** | **P1** | **Allowlist Omission** | `daSnapshotComparisonModal` required by BLK-04 is omitted from Workstream 5 file allowlist. | `BLOCKERS_AND_DECISIONS.md § 2` vs `AGENT_WORKSTREAM_ASSIGNMENTS.md § WS-5.5` | Add `daSnapshotComparisonModal` to Workstream 5 allowlist. |
| **F-07** | **P1** | **UX Ambiguity** | Mathematical delta for cyclic SCCs is negative on reduction, which causes confusing UI labels. | `SHARED_CONTRACTS.md § 6.2` | Expose `cyclicSccReduction = base - new` (positive integer) in UI components. |
| **F-08** | **P1** | **Architecture Gap** | Ingestion transport from external Node analyzer to Salesforce is completely unspecified. | External Analyzer Architecture Boundary | Formally specify REST Ingestion Endpoint with token auth and bounded chunk batches. |
| **F-09** | **P2** | **Undefined Schema** | "16-point Implementation Authorization Orders" mandated by DEC-04 lacks a defined schema in the planning documents. | `BLOCKERS_AND_DECISIONS.md § 1` | Standardize the 16-point template. |
| **F-10** | **P2** | **Metric Discrepancy**| Test scenarios in `INTEGRATION_LOG.md` stated as 276, review claimed 299; actual sum is 289. | `INTEGRATION_LOG.md § 1.1` Table | Correct official scenario count to **289 scenarios**. |

---

## 7. Final Prioritized P0 / P1 Fix List

### Immediate P0 Fixes (Must complete before Step B dispatch)
1. **Fix F-01 (DEC-01 Amendment)**: Update `SHARED_CONTRACTS.md` and `BLOCKERS_AND_DECISIONS.md` to specify that `DA_Analysis_Run__c` status availability is validated against `Total_Chunks__c` (`COUNT(Chunks) == Total_Chunks__c` and `Status__c == 'AVAILABLE'`).
2. **Fix F-02 (Checklist Alignment)**: Reconcile `PARALLEL_IMPLEMENTATION_PLAN.md` Section 6 to indicate that Step B pre-implementation governance remains conditionally blocked pending Gate 1B business ratification.

### Mandatory P1 Fixes (Must resolve before affected wave dispatch)
3. **Fix F-03 (Cross-Window IPC)**: Update Workstream 6 briefs and `SHARED_CONTRACTS.md` to replace LMS with `BroadcastChannel` for detached drawer windows.
4. **Fix F-04 (Apex Heap Protection)**: Update `PARALLEL_IMPLEMENTATION_PLAN.md` Section 2.1.3 to remove "chunk reassembly" from Apex service responsibilities.
5. **Fix F-05 (Canonical Component Naming)**: Reconcile `IMPLEMENTATION_PROGRESS.md` and `PARALLEL_IMPLEMENTATION_PLAN.md` to use `daRefactoringSimulation`.
6. **Fix F-06 (Allowlist Inclusion)**: Add `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/*` to Workstream 5 file allowlist in `AGENT_WORKSTREAM_ASSIGNMENTS.md`.
7. **Fix F-07 (SCC Metric UI Invariant)**: Specify `cyclicSccReduction = base - new` for user-facing UI labels in `SHARED_CONTRACTS.md`.
8. **Fix F-08 (Ingestion Protocol Specification)**: Define the REST Ingestion endpoint contract (`/services/apexrest/DAGraphIngestion/`) in `SHARED_CONTRACTS.md`.

---

## 8. Amended DEC-01 Text (Using Existing `Total_Chunks__c` and `Status__c` Fields)

> ### DEC-01 (Amended): Analysis Run Ingestion Status, Integrity & SOQL Compound Ordering
>
> **Context**: The `DA_Analysis_Run__c` custom object possesses an existing picklist field `Status__c` (`AVAILABLE`, `EMPTY`, `FAILED`) and an existing numerical field `Total_Chunks__c` (Number 6,0). Previously, DEC-01 relied on an informal heuristic where any run with $\ge 1$ chunks was classified as available, creating an integrity blindspot where aborted or partially ingested runs were served to users as valid graphs.
>
> **Ratified Decision**:
> 1. **Ingestion Lifecycle States**:
>    - When an analysis run record is initially created by the external analyzer or ingestion service, it must be inserted with `Status__c = 'EMPTY'` (or `FAILED` if creation aborts) and `Total_Chunks__c` set to the exact expected number of chunk records.
>    - Graph chunks are inserted into `DA_Graph_Chunk__c` in bounded batches (max 10 chunks per call) with contiguous `Chunk_Index__c` values ($0, 1, 2, \dots$).
>    - Upon successful insertion of all chunks, the ingestion client executes an atomic update setting `Status__c = 'AVAILABLE'`.
> 2. **Deterministic UI Query Contract**:
>    - Client components (`daGraphViewer`, `daGraphPayloadLoader`, `daAnalysisHistory`) and controllers (`DAGraphController`) must **never** query or return graph payloads for runs where `Status__c != 'AVAILABLE'`.
>    - An analysis run is valid for chunk retrieval if and only if:
>      $$\text{Status\_\_c} == \text{'AVAILABLE'} \quad \text{AND} \quad \text{COUNT}(\text{DA\_Graph\_Chunk\_\_c}) == \text{Total\_Chunks\_\_c}$$
>    - If $\text{Total\_Chunks\_\_c} == 0$ and $\text{Status\_\_c} == \text{'EMPTY'}$, the UI displays the canonical empty state view.
>    - If $\text{COUNT}(\text{DA\_Graph\_Chunk\_\_c}) < \text{Total\_Chunks\_\_c}$, the run is treated as corrupt/incomplete (`FAILED`), logging an error via `DAErrorResponse` and suppressing payload retrieval.
> 3. **Compound SOQL Ordering**:
>    - All queries ordering analysis runs must use deterministic compound ordering:
>      ```sql
>      SELECT Id, Name, Commit_Hash__c, Run_Timestamp__c, Status__c,
>             Node_Count__c, Edge_Count__c, Cyclic_SCC_Count__c,
>             Total_Chunks__c, Total_Payload_Size_Chars__c, CreatedDate
>      FROM DA_Analysis_Run__c
>      WHERE DA_Project__c = :projectId
>      WITH USER_MODE
>      ORDER BY Run_Timestamp__c DESC, Id DESC
>      ```
