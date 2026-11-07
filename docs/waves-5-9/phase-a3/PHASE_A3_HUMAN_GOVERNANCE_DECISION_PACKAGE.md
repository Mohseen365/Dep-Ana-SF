# Phase A3 Human Governance Decision Package
**Document Identifier**: `docs/waves-5-9/phase-a3/PHASE_A3_HUMAN_GOVERNANCE_DECISION_PACKAGE.md`
**Governance Scope**: Phase A3 Human Decisions DEC-01 through DEC-04
**Implementation Authorization Status**: **STRICTLY NOT AUTHORIZED**
**Repository State**: Git Commit `85e8f4e9a92b1bba13f9a72f61bbd5909c43e96b` on branch `jules-3615347302555669507-d5c1e42b`

---

## 1. Executive Summary & Governance Purpose

This document provides the formal, evidence-backed human governance decision package for Phase A3 decisions `DEC-01`, `DEC-02`, `DEC-03`, and `DEC-04`.

In accordance with project governance rules established in Wave 0.4.3 through Wave 0.4.10 and reaffirmed across Phase A1, Phase A2, and Phase A3 audits:
1. **Implementation Dispatch is NOT Authorized**: Zero tasks are authorized to implement. All code modifications, Apex metadata changes, LWC source implementations, offline test additions, and git branch dispatches remain locked.
2. **Decisions Require Explicit Human Ratification**: Neither automated subagents nor coordinator agents possess authority to resolve architectural conflicts, ratify proposed contracts, or approve implementation release. All four decisions presented herein remain explicitly **PENDING** human review and signature.
3. **Task Readiness Integrity Preserved**: Review eligibility is strictly separated from implementation authorization. The verified 21-task classification breakdown is preserved:
   - **8 Tasks**: `READY_FOR_IMPLEMENTATION_REVIEW` (`W5-1`, `W6-1`, `W6-2`, `W6-3`, `W6-4`, `W7-1`, `W7-2`, `W8-1`)
   - **9 Tasks**: `BLOCKED_ON_PREDECESSORS` (`W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6`, `W7-3`, `W8-3`, `W9-2`, `W9-3`)
   - **2 Tasks**: `BLOCKED_ON_CONTRACT_APPROVAL` (`W8-2`, `W9-1`)
   - **1 Task**: `BLOCKED_ON_UNRESOLVED_SPECIFICATION` (`W7-P1`)
   - **1 Task**: `COORDINATOR_EXCLUSIVE` (`INT-1`)
   - **0 Tasks**: `AUTHORIZED_FOR_IMPLEMENTATION`

---

## 2. DEC-01 — CONTRACT-04: Analysis Run History API Status Semantics & SOQL Ordering

### 2.1 Context and Technical Background
Task `W7-P1` (`Minimal History API (Contract A Apex & DTO)`) is the entry point for historical run retrieval in Salesforce, implemented in:
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunSummaryDTO.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls`

The object `DA_Analysis_Run__c` is bound by strict zero-schema constraints: it contains standard fields (`Id`, `Name`, `CreatedDate`, `CreatedBy`) and exactly **one** custom field (`DA_Project__c` lookup). Fields such as `Status__c`, `Metrics_JSON__c`, and `DNA_Barcode__c` do not exist. Therefore, the status of an analysis run cannot be read from a database field; it must be derived dynamically from related `DA_Graph_Chunk__c` records.

### 2.2 Exact Conflicting Contract Language
In `docs/waves-5-9/phase-a3/CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md`, two distinct sections specify mutually contradictory status values when chunk count is zero:

1. **Section 4 (Zero-Schema Metadata Invariants, line 43)**:
   > *"All status/timestamp attributes on the DTO must be derived safely:*
   > *- `status`: Derived as `'COMPLETED'` if chunks exist, or `'UNKNOWN'`."*

2. **Section 5.2 (Controller Method Specification, line 117)**:
   > ```apex
   > Integer chunks = chunkCountsByRunId.containsKey(run.Id) ? chunkCountsByRunId.get(run.Id) : 0;
   > dto.totalChunks = chunks;
   > dto.status = chunks > 0 ? 'COMPLETED' : 'EMPTY';
   > ```

### 2.3 Exact Conflicting SOQL Ordering Clauses
In `CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md`, two distinct sections specify differing SOQL `ORDER BY` clauses for the primary run query:

1. **Section 5.2 (Controller Method Specification, lines 88–95)**:
   > ```apex
   > List<DA_Analysis_Run__c> runs = [
   >     SELECT Id, Name, DA_Project__c, DA_Project__r.Name, CreatedDate, CreatedBy.Name
   >     FROM DA_Analysis_Run__c
   >     WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
   >     WITH USER_MODE
   >     ORDER BY CreatedDate DESC
   >     LIMIT :safeLimit
   > ];
   > ```

2. **Section 6.2 (Deterministic Tie-Breaking, lines 129–130)**:
   > *"Queries order primarily by `CreatedDate DESC, Id DESC` to ensure completely deterministic ordering."*

### 2.4 Current Source and Test Behavior
Inspection of `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` reveals that:
- `DAGraphController` currently implements:
  - `getProjects()` (lines 6–15)
  - `getLatestGraphMetadataForProject(String projectId)` (lines 20–58)
  - `getGraphChunks(String runId, Integer startIndex, Integer maxChunks)` (lines 65–85)
  - `getGraphChunks(String runId, Integer startIndex, Integer maxChunks, String projectId)` (lines 94–140)
  - `getLatestGraphForProject(String projectId)` (lines 145–167)
- Method `getAnalysisRuns(String projectId, Integer queryLimit)` **is not yet implemented** in `DAGraphController.cls`.
- `DAAnalysisRunSummaryDTO.cls` **does not yet exist** under `scratch/salesforce-poc/force-app/main/default/classes/dto/`.
- `DAGraphControllerTest.cls` and `DAGraphSecurityTest.cls` test existing chunk retrieval, bounded paging, and multi-tenant isolation, but do not contain assertions for `getAnalysisRuns` or zero-chunk status semantics.
- Downstream consumer `daAnalysisHistoryView` (`W7-3`) is not yet created.

### 2.5 Zero-Chunk Semantics and Data Model Limitations (Critical Analysis)
A critical question in architectural evaluation is: **Does `chunks === 0` always mean an analysis run completed successfully with an empty graph?**

#### Technical Finding: The Zero-Schema Indistinguishability Limitation
Under the existing zero-schema metadata for `DA_Analysis_Run__c`, the system possesses **no status field, error field, heartbeat timestamp, chunk count field, or lifecycle flag**. An aggregate count query (`SELECT COUNT(Id) FROM DA_Graph_Chunk__c WHERE DA_Analysis_Run__c = :runId`) returns `0` in four materially distinct real-world situations:
1. **Successful Run with Empty Graph**: An analysis was run on a project containing 0 Apex/LWC components, successfully persisting a header run with 0 chunks.
2. **Incomplete/Aborted Run**: Graph generation was initiated (the `DA_Analysis_Run__c` header was inserted), but the CLI or ingestion process crashed or timed out before chunks were written.
3. **Partially Persisted / In-Flight Run**: Chunks are currently in the process of being inserted asynchronously across multiple DML batches.
4. **Chunk Ingestion/Access Failure**: The user has read access to `DA_Analysis_Run__c` but lacks Field-Level Security (FLS) or object permissions on `DA_Graph_Chunk__c` under `WITH USER_MODE`, causing SOQL to return zero chunk records.

Because the database schema cannot distinguish these four states, **it is technically inaccurate to label a run with 0 chunks as 'ANALYSIS_SUCCEEDED_WITH_EMPTY_GRAPH'**.

#### Recommended Precise Semantic Definition of `EMPTY`
To prevent misleading downstream consumers without inventing unapproved schema fields, `EMPTY` must be defined strictly and objectively as:
> **`EMPTY`**: *"No graph chunks were found associated with this analysis run header at query time. The run header exists, but contains zero retrievable graph payload chunks. This state does NOT guarantee that analysis completed without error, only that no graph chunks are currently available."*

In downstream UI components (`daAnalysisHistoryView`, `daCompareView`), `EMPTY` signals to the user that no graph payload exists to load or compare, disabling comparison buttons without falsely certifying execution health.

### 2.6 Exact Proposed Replacement Clauses for CONTRACT-04

#### 1. Replacement for Section 4 (Zero-Schema Metadata Invariants, line 43)
```markdown
- All status/timestamp attributes on the DTO must be derived safely:
  - `status`: Derived objectively from chunk availability:
    - If `totalChunks > 0`: `'COMPLETED'` (Graph payload chunks exist and are retrievable).
    - If `totalChunks == 0`: `'EMPTY'` (Run header exists, but zero graph chunks were found at query time. Indicates no payload is available to visualize).
  - `analysisTimestamp`: Uses standard `CreatedDate`.
  - `createdByName`: Queried safely via relationship `CreatedBy.Name`.
```

#### 2. Replacement for Section 5.2 SOQL Query and Status Mapping (lines 88–95, line 117)
```apex
    // Query DA_Analysis_Run__c strictly using existing standard and custom fields under USER_MODE
    // Compound ordering (CreatedDate DESC, Id DESC) guarantees deterministic pagination
    List<DA_Analysis_Run__c> runs = [
        SELECT Id, Name, DA_Project__c, DA_Project__r.Name, CreatedDate, CreatedBy.Name
        FROM DA_Analysis_Run__c
        WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
        WITH USER_MODE
        ORDER BY CreatedDate DESC, Id DESC
        LIMIT :safeLimit
    ];

    ...

    for (DA_Analysis_Run__c run : runs) {
        ...
        Integer chunks = chunkCountsByRunId.containsKey(run.Id) ? chunkCountsByRunId.get(run.Id) : 0;
        dto.totalChunks = chunks;
        dto.status = chunks > 0 ? 'COMPLETED' : 'EMPTY';
        dtos.add(dto);
    }
```

#### 3. Reconciled Section 6.2 (Deterministic Tie-Breaking)
```markdown
2. **Deterministic Tie-Breaking**:
   - Queries order primarily by `CreatedDate DESC, Id DESC` to guarantee strict deterministic pagination across all execution environments.
```

### 2.7 Available Decision Options

#### Option A: Standardize on `'EMPTY'` with Compound Tie-Breaker `ORDER BY CreatedDate DESC, Id DESC` (Recommended)
- **Zero-Chunk Status**: Set `dto.status = chunks > 0 ? 'COMPLETED' : 'EMPTY'`.
- **SOQL Ordering**: Enforce `ORDER BY CreatedDate DESC, Id DESC LIMIT :safeLimit`.
- **Pros**: Semantically precise regarding payload availability; guarantees deterministic ordering in tests and pagination.
- **Cons**: Requires aligning Section 4 text with Section 5.2.

#### Option B: Standardize on `'UNKNOWN'` with Single Ordering `ORDER BY CreatedDate DESC`
- **Zero-Chunk Status**: Set `dto.status = chunks > 0 ? 'COMPLETED' : 'UNKNOWN'`.
- **SOQL Ordering**: Enforce `ORDER BY CreatedDate DESC LIMIT :safeLimit`.
- **Pros**: Matches early draft phrasing in §4.
- **Cons**: Ambiguous; introduces pagination flakiness in automated Apex unit testing.

### 2.8 Required Tests & Verification Plan
When task `W7-P1` is eventually dispatched for implementation, the following offline and Apex unit tests must be executed:
1. `test_getAnalysisRuns_returns_empty_when_no_chunks`: Verifies `status === 'EMPTY'` and `totalChunks === 0`.
2. `test_getAnalysisRuns_returns_completed_when_chunks_exist`: Verifies `status === 'COMPLETED'` and `totalChunks > 0`.
3. `test_getAnalysisRuns_deterministic_order_with_identical_createdDate`: Inserts 3 runs in the same millisecond and verifies strict `Id DESC` ordering.
4. `test_getAnalysisRuns_user_mode_security`: Verifies `WITH USER_MODE` respects multi-tenant project scoping.

### 2.9 Decision Record DEC-01 (Explicit Human Completion Form)

```markdown
================================================================================
HUMAN GOVERNANCE DECISION RECORD: DEC-01
================================================================================
Decision ID:          DEC-01
Decision Title:       CONTRACT-04 Zero-Chunk Status Semantics & Deterministic SOQL Ordering
Contract Affected:    CONTRACT-04 (Analysis Run History API)
Tasks Affected:       W7-P1, W7-3, W8-3
Required Approvers:   Lead Architect, Integration Coordinator

FORMAL QUESTION:
Shall CONTRACT-04 define zero-chunk run status as 'EMPTY' (Option A) or 'UNKNOWN' (Option B),
and shall the SOQL query mandate compound tie-breaker 'ORDER BY CreatedDate DESC, Id DESC'?

STATUS:               PENDING HUMAN APPROVAL (Select Option A, B, or C below)

[ ] OPTION A: Adopt 'EMPTY' status and 'ORDER BY CreatedDate DESC, Id DESC'.
[ ] OPTION B: Adopt 'UNKNOWN' status and 'ORDER BY CreatedDate DESC'.
[ ] OPTION C: Other (specify conditions below).

Lead Architect Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________

Integration Coordinator Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________
================================================================================
```

---

## 3. DEC-02 — CONTRACT-05: Dual-Snapshot Payload Size Limits & Single Cytoscape Canvas Invariant

### 3.1 Context and Technical Background
Task `W8-2` (`daDiffEngine.js`) and Task `W8-3` (`daCompareView.js`) implement dual-snapshot comparison, computing differences between two architectural graphs and rendering the visual diff.

In Phase A1 and early drafts, documents cited "10MB/20MB limits" without grounding in physical platform capabilities. Contract 05 (`CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md`) proposed:
- Single Snapshot Payload Cap: **5 MB** uncompressed JSON (~30,000 entities).
- Dual Snapshot Combined Cap: **10 MB** raw JSON.
- Single Cytoscape Canvas: Rendering diffs in a single unified Cytoscape instance with color-coded delta styling.

Contract 05 currently has status **`PROPOSED`**.

### 3.2 Critical Technical Measurement Distinction: Characters vs UTF-8 Bytes
A vital engineering distinction must be established between **JavaScript string length (characters)**, **UTF-8 bytes**, and **serialized JSON bytes**:

1. **JavaScript String Characters (`String.length`)**:
   - In JavaScript, `String.prototype.length` counts the number of 16-bit UTF-16 code units.
   - ASCII characters ('a', '{', '"') consume 1 code unit (length 1) and 1 byte in UTF-8.
   - Supplementary characters (emojis, complex Unicode) consume 2 code units (surrogate pair, length 2) and 4 bytes in UTF-8.
2. **Existing Implementation Measurement in Code**:
   - In `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js`:
     ```javascript
     export const MAX_CHUNK_SIZE = 131072; // Salesforce LongTextArea field limit (131,072 chars)
     export const MAX_TOTAL_PAYLOAD_SIZE = 10485760; // 10 MB application-level payload limit

     export function validatePayloadSize(rawJson, maxTotalSize = MAX_TOTAL_PAYLOAD_SIZE) {
         if (typeof rawJson !== 'string') return false;
         return rawJson.length <= maxTotalSize;
     }
     ```
   - **Empirical Confirmation**: The existing implementation measures **JavaScript string character length (`rawJson.length`)**, NOT encoded byte count.
   - Citing "10 MB" is technically a shorthand for **10,485,760 UTF-16 code units / string characters**.
   - For standard ASCII JSON payloads (component names, IDs, numbers), $1\text{ char} = 1\text{ byte}$, so $10,485,760\text{ chars} \approx 10\text{ MB}$. However, if multi-byte characters are present, the memory footprint in UTF-8 or RAM differs.

### 3.3 Deep Memory-Safety Analysis Across Lifecycle Tiers
Evaluating client-side memory safety requires analyzing all five memory tiers across the snapshot lifecycle:

```
+-----------------------------------------------------------------------------------------+
|                                SNAPSHOT MEMORY TIERS                                    |
|                                                                                         |
|  Tier 1: Raw JSON String Retention                                                      |
|          Snapshot A (5M chars) + Snapshot B (5M chars) = 10M UTF-16 chars (~20 MB RAM)  |
|                                                                                         |
|  Tier 2: Parsed JavaScript AST Objects (V8 / JavaScriptCore Heap)                       |
|          Nodes, Edges, Maps, Sets, Objects: Expansion multiplier ~4x to 8x (~40-80 MB)   |
|                                                                                         |
|  Tier 3: Diff Engine Transient Compute Structures                                       |
|          daDiffEngine Maps, Set lookups, property delta objects (~10-20 MB transient)   |
|                                                                                         |
|  Tier 4: Cytoscape Graph Data Model & Canvas Render Tree                                |
|          Internal Cytoscape elements, event listeners, layout geometry (~30-50 MB)      |
|                                                                                         |
|  Tier 5: Concurrent Dual Canvas Rendering (PROHIBITED)                                  |
|          If two Cytoscape instances ran concurrently: WebGL/2D contexts doubled!         |
+-----------------------------------------------------------------------------------------+
```

1. **Tier 1 (Raw String Retention)**: Retaining two 5 MB raw strings in memory consumes $10\text{ MB}$ of characters ($\approx 20\text{ MB}$ in V8 UTF-16 string storage).
2. **Tier 2 (Parsed Object Memory)**: When JSON is parsed into JavaScript objects (`nodes[]` and `edges[]`), object overhead in V8 (hidden classes, object headers, dictionary properties) expands the memory by approximately $4\times$ to $8\times$. Two 5 MB snapshots parsed into 60,000 entity objects can occupy $40\text{ MB}$ to $80\text{ MB}$ of browser heap.
3. **Tier 3 (Diff Calculation)**: `daDiffEngine` constructs ID-based Maps to perform $O(N)$ comparisons. These maps are temporary, but contribute an additional $10\text{ MB}$ to $20\text{ MB}$ during active computation.
4. **Tier 4 (Cytoscape Visualizer)**: Instantiating Cytoscape with 30,000 nodes/edges adds canvas backing stores, DOM nodes, and WebGL textures, requiring another $30\text{ MB}$ to $60\text{ MB}$.
5. **Tier 5 (The Dual-Canvas Crash Risk)**: If two separate Cytoscape instances were instantiated (one for Baseline, one for Target), browser tab memory consumption would surge past $200\text{ MB}$, triggering tab crashes in Lightning Experience on mobile or low-memory devices.

### 3.4 Single Cytoscape Canvas Invariant Provenance
The single-canvas rule is an approved architectural invariant originating in Phase 0:
- **Contract W0-C7** (`docs/audits/salesforce-parallel-migration/phase-0/WAVE_0_SHARED_ARCHITECTURAL_CONTRACTS.md` §8.2):
  > *"To operate safely within Salesforce browser memory limits: 1. No Dual-Cytoscape Instances: The comparison view must not instantiate two active Cytoscape graph instances concurrently. 2. Graph comparison must be computed as a pure JavaScript data-structure diff using Maps indexed by entity ID. 3. Diff rendering must use a single Cytoscape canvas with delta styling (Green: Added, Red: Removed, Amber: Modified) or a structured tabular diff."*
- Reaffirmed in `CONTRACT_09_SHARED_STATE_AND_INVARIANTS.md` (Invariant 4).

### 3.5 Evidence Gap: Lack of Empirical Browser Heap Benchmarks
**Explicit Evidence Gap**: While theoretical calculations and physical platform limits (131 KB per chunk, 6 MB Apex heap) are verified, **the repository currently contains zero automated browser memory benchmarks measuring actual V8 heap consumption in Salesforce Lightning Experience**.

#### Recommended Bounded Offline Benchmark Plan
Before committing to production deployment, a dedicated benchmark script must be executed:
1. Generate synthetic graph payloads of sizes 1 MB, 2.5 MB, 5 MB, and 10 MB.
2. Run `daDiffEngine.computeDiff` in Node.js with `v8.getHeapStatistics()` measuring before, peak, and after heap usage.
3. Validate that garbage collection cleanly recovers transient diff structures.

### 3.6 Exact Proposed Limits and Lifecycle Enforcement Rules

1. **Single Snapshot String Limit**: `5,242,880` characters (`rawJson.length <= 5242880`, ~5 MB).
2. **Combined Dual Snapshot Limit**: `10,485,760` characters (`(rawJsonA.length + rawJsonB.length) <= 10485760`, ~10 MB).
3. **Enforcement Points**:
   - `daCompareView.js` validates snapshot A size upon ingestion.
   - `daCompareView.js` validates snapshot B size upon ingestion.
   - `daCompareView.js` validates that cumulative length does not exceed `MAX_TOTAL_PAYLOAD_SIZE` prior to triggering `daDiffEngine.computeDiff`.
4. **Rejection Behavior**:
   - If either snapshot exceeds 5,242,880 characters, ingestion halts with: `PayloadLimitExceededError: Snapshot payload exceeds 5 MB limit. Please filter the architecture project before comparing.`
   - If combined payloads exceed 10,485,760 characters, diffing is suppressed and a tabular-only fallback diff is offered.
5. **Single-Canvas Lifecycle**:
   - `daCompareView` renders exactly one canvas instance.
   - When switching runs, the existing Cytoscape instance is wiped (`cy.elements().remove()`) or updated via batch delta styling rather than destroying and recreating the WebGL canvas context.

### 3.7 Decision Record DEC-02 (Explicit Human Completion Form)

```markdown
================================================================================
HUMAN GOVERNANCE DECISION RECORD: DEC-02
================================================================================
Decision ID:          DEC-02
Decision Title:       CONTRACT-05 Dual-Snapshot Payload Size Caps & Single Canvas Invariant
Contract Affected:    CONTRACT-05 (Dual-Snapshot Retrieval & Diff Engine Contract)
Tasks Affected:       W8-2, W8-3
Required Approvers:   Lead Architect, Workstream D Lead

FORMAL QUESTION:
Shall CONTRACT-05 be ratified with 5,242,880 character single-snapshot cap,
10,485,760 character combined cap, and the strict Single Cytoscape Canvas Invariant?

STATUS:               PENDING HUMAN APPROVAL (Select Option A, B, or C below)

[ ] OPTION A: Ratify 5M char single snapshot, 10M char combined snapshot, single Cytoscape canvas.
[ ] OPTION B: Expand to 10M char single snapshot, 20M char combined snapshot.
[ ] OPTION C: Other (specify conditions below).

Lead Architect Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________

Workstream D Lead Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________
================================================================================
```

---

## 4. DEC-03 — CONTRACT-07: Refactoring Simulation DTOs, Topological Integrity & Method-Level Operations

### 4.1 Context and Technical Background
Task `W9-1` (`daRefactoringEngine.js`), Task `W9-2` (`daRefactoringView.js`), and Task `W9-3` (`daRefactorHandoffModal.js`) comprise Workstream E (Wave 9 Refactoring Simulation).
`CONTRACT_07_REFACTORING_ACTION_DTOS.md` defines four refactoring actions:
1. `EXTRACT_CLASS`
2. `MOVE_METHOD`
3. `BREAK_CYCLE`
4. `REMOVE_NODE`

Contract 07 is currently **`PROPOSED`**. A rigorous audit against `CONTRACT_01_CANONICAL_GRAPH_PAYLOAD.md` and repository fixtures reveals profound semantic discrepancies and missing schema elements.

---

### 4.2 Action-by-Action Technical Analysis & Proposed Specification

#### Action 1: `EXTRACT_CLASS`

1. **Required Input Fields**:
   ```typescript
   export interface ExtractClassAction extends BaseRefactoringAction {
     type: 'EXTRACT_CLASS';
     sourceNodeId: string;       // Existing class node being split
     newClassName: string;       // Unique identifier/name of proposed class
     newClassLayer?: string;     // Defaults to sourceNode.layer if omitted
     movedMethodList: string[];  // List of method names being relocated
     description?: string;
   }
   ```
2. **Node Identity & Naming Rules**:
   - `newClassName` must follow CONTRACT-01 ID conventions: `Class.<Name>` (e.g. `'Class.AccountTaxCalculator'`).
   - If user supplies a bare name (`'AccountTaxCalculator'`), the engine prefixes `'Class.'`.
3. **Preconditions & Validation**:
   - `sourceNodeId` must exist in `payload.nodes[]`.
   - `newClassName` must not collide with any existing node `id` or `name` in `payload.nodes[]`.
   - `movedMethodList` must be a non-empty array of strings.
4. **Resulting Graph Topology**:
   - Creates a new node in `nodes[]`:
     `id: newClassName`, `name: bareName`, `type: 'ApexClass'`, `layer: newClassLayer || sourceNode.layer`, `fanIn: 1`, `fanOut: 0`, `coupling: 1`, `risk: 'LOW'`, `coverageStatus: 'UNKNOWN'`.
   - Injects a directed dependency edge:
     `id: "${sourceNodeId}->${newClassName}"`, `source: sourceNodeId`, `target: newClassName`, `type: 'references'`, `weight: 1.0`.
   - **Method Retargeting Limitation**: External edges calling moved methods are NOT retargeted because CONTRACT-01 edges have no method annotations.
5. **Delta Representation**:
   - `couplingDelta`: Net change across affected nodes.
   - `unresolvedReferencesDelta`: 0 (internal node).
   - `architectureHealthDelta`: Recalculated.
6. **Error Handling**: Throws `ValidationError` if `sourceNodeId` not found or `newClassName` duplicate.
7. **Immutability**: Deep-clones graph before returning.
8. **Fixture Status**: Fixture exists (`docs/waves-5-9/phase-a3/fixtures/sample-refactoring-action.json`).

---

#### Action 2: `MOVE_METHOD`

1. **The Incompatibility**: `CONTRACT_01_CANONICAL_GRAPH_PAYLOAD.md` defines nodes without a `methods[]` array and edges without method identifiers.
2. **Recommended Policy**: **Defer and Mark Unsupported**.
3. **Engine Behavior When Received**:
   When `daSimulationEngine` receives `type: 'MOVE_METHOD'`, it must reject the action with a structured error:
   ```json
   {
     "success": false,
     "actionId": "act-move-001",
     "errorType": "UNSUPPORTED_REFACTORING_ACTION",
     "message": "Action MOVE_METHOD is currently unsupported: CanonicalGraphPayload (CONTRACT-01) does not contain method-level sub-entities or call-site annotations."
   }
   ```
   No state is mutated, and the payload is returned unmodified.

---

#### Action 3: `BREAK_CYCLE`

1. **Supported Strategy**: Standardize strictly on `EXTRACT_INTERFACE`.
2. **Unsupported Strategies**: `EVENT_DRIVEN_DECOUPLING` and `INVERSION_OF_CONTROL` are marked unsupported until topological specifications are authored.
3. **Proposed `ExtractInterfaceAction` Topology**:
   - **Input Fields**: `id`, `type: 'BREAK_CYCLE'`, `edgeIdToSever`, `substitutionStrategy: 'EXTRACT_INTERFACE'`, `intermediateNodeName?`.
   - **Preconditions**: `edgeIdToSever` (`Source -> Target`) exists in `edges[]`.
   - **Topology Transformation**:
     1. Direct edge `edgeIdToSever` is removed.
     2. New node `I<Target>` is created: `id: "Interface.I" + targetName`, `type: 'ApexInterface'`, `layer: targetNode.layer`.
     3. Edge 1 created: `Source -> I<Target>` (type: `references`).
     4. Edge 2 created: `Target -> I<Target>` (type: `implements`).
   - Direct cyclic dependency from `Source` to `Target` is severed.
4. **Cycle Recalculation**: Run Tarjan's SCC algorithm on the modified edge set; decrement `cyclesEliminated`.

---

#### Action 4: `REMOVE_NODE`

1. **Resolution of `force` vs `cascadeEdges`**:
   To prevent dangling edges and maintain CONTRACT-01 integrity (`!nodeIds.has(source) || !nodeIds.has(target)` causes validation failure), `REMOVE_NODE` must enforce:
   - **Zero Incoming Dependencies**: If `fanIn === 0`, node is safely removed along with any outbound edges (`source === nodeId`).
   - **Incoming Dependencies Present**: If `fanIn > 0`, removal is **rejected** unless `cascadeEdges: true` is explicitly provided.
   - When `cascadeEdges: true` is set, **all incident edges (both inbound and outbound) are removed atomically**.
   - **NO DANGLING EDGES ARE PERMITTED**.
2. **Proposed DTO Schema**:
   ```typescript
   export interface RemoveNodeAction extends BaseRefactoringAction {
     type: 'REMOVE_NODE';
     nodeId: string;
     cascadeEdges?: boolean; // Required to be true if fanIn > 0
   }
   ```

---

### 4.3 Common Action Contract
Every refactoring simulation operation in `daSimulationEngine` must obey:
1. **Input Immutability**: The passed `CanonicalGraphPayload` is never mutated in place. Cloned via deep structured copy.
2. **Pure Calculation**: No DOM, Cytoscape, Apex, Salesforce wire, or network calls. Pure JavaScript math.
3. **Deterministic Outputs**: Nodes and edges are sorted lexicographically by `id ASC` after every transformation.
4. **Metric Integrity**: Graph summary metrics (`coupling`, `cycles`, `healthScore`) are recalculated using approved formulas.

---

### 4.4 Required Reference Fixture Coverage
A suite of 10 test fixtures must be provisioned under `docs/waves-5-9/phase-a3/fixtures/` before Task `W9-1` dispatch:
1. `fixture-01-extract-class.json`: Valid `EXTRACT_CLASS` action.
2. `fixture-02-break-cycle-interface.json`: Valid `BREAK_CYCLE` using `EXTRACT_INTERFACE`.
3. `fixture-03-remove-node-zero-fanin.json`: Valid `REMOVE_NODE` with zero incoming edges.
4. `fixture-04-remove-node-cascade.json`: Valid `REMOVE_NODE` with `cascadeEdges: true`.
5. `fixture-05-unsupported-move-method.json`: `MOVE_METHOD` yielding `UNSUPPORTED_REFACTORING_ACTION`.
6. `fixture-06-unsupported-break-cycle-strategy.json`: `BREAK_CYCLE` with `INVERSION_OF_CONTROL`.
7. `fixture-07-invalid-node-reference.json`: Action referencing non-existent node ID.
8. `fixture-08-duplicate-id-collision.json`: Action attempting to create existing node ID.
9. `fixture-09-input-immutability.json`: Test payload asserting object references remain unchanged.
10. `fixture-10-graph-integrity-post-action.json`: Payload validating CONTRACT-01 schema compliance after action.

---

### 4.5 Decision Record DEC-03 (Explicit Human Completion Form)

```markdown
================================================================================
HUMAN GOVERNANCE DECISION RECORD: DEC-03
================================================================================
Decision ID:          DEC-03
Decision Title:       CONTRACT-07 Refactoring Action DTOs & Topological Semantics
Contract Affected:    CONTRACT-07 (Refactoring Action DTOs & Simulation Operations)
Tasks Affected:       W9-1, W9-2, W9-3
Required Approvers:   Workstream E Lead, Integration Coordinator

FORMAL QUESTION:
Shall CONTRACT-07 be amended and ratified under Option A (component-level scoping,
defer MOVE_METHOD, standardize BREAK_CYCLE on EXTRACT_INTERFACE, enforce cascadeEdges on
REMOVE_NODE, and supply 10 reference fixtures)?

STATUS:               PENDING HUMAN APPROVAL (Select Option A, B, or C below)

[ ] OPTION A: Adopt Option A (component-level scoping, schema corrections, missing fixtures).
[ ] OPTION B: Adopt Option B (full method-level schema extension of CONTRACT-01).
[ ] OPTION C: Other (specify conditions below).

Workstream E Lead Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________

Integration Coordinator Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________
================================================================================
```

---

## 5. DEC-04 — Implementation Dispatch Authority (Gate 1 Release)

### 5.1 The Documented Disagreement Over Gate 1 Authorization
Across Phase A1, Phase A2, and Phase A3 documentation, conflicting statements exist regarding who possesses the authority to sign off on Gate 1 implementation dispatch:

1. **Phase A2 Charter & Completion Summary**:
   Cited **Lead Architect + Integration Coordinator** as the dual technical authorities empowered to authorize task dispatch.
2. **Phase A3 Audit Findings Reconciliation Report (§5.2 & §12)**:
   Introduced a split interpretation, arguing that implementation dispatch commits engineering resources and impacts scope, therefore requiring **Project Sponsor / Product Owner** authorization alongside the Lead Architect.
3. **Phase A3 Integrity Audit Report (§8 & §12)**:
   Formalized this contradiction under `DEC-04`, documenting that the governance charter did not formally define whether Gate 1 release is a purely technical engineering milestone or a product delivery boundary.

### 5.2 Distinguishing the Three Distinct Governance Boundaries
```
+-------------------------------------------------------------------------+
|                  TIER 1: TECHNICAL CONTRACT RATIFICATION                |
|  Authority: Lead Architect + Workstream Lead + Integration Coordinator  |
|  Scope: CONTRACT-01..09, DTO schemas, math formulas, offline test specs |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  TIER 2: PRODUCT SCOPE & DELIVERY BOUNDARY              |
|  Authority: Project Sponsor / Product Owner + Lead Architect            |
|  Scope: Feature scope changes, org deployments, resource commitment     |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  TIER 3: IMPLEMENTATION DISPATCH (GATE 1)               |
|  Authority: UNRESOLVED GOVERNANCE SIGNATORY QUESTION (DEC-04)           |
|  Scope: Authorizing agents to write code, modify metadata, git branch   |
+-------------------------------------------------------------------------+
```

### 5.3 Detailed Eight-Dimension Comparative Evaluation of Alternatives

| Evaluation Dimension | Alternative 1: Joint Dual Signoff (Lead Architect + Product Owner) | Alternative 2: Technical Dual Signoff (Lead Architect + Integration Coordinator) | Alternative 3: Two-Phase Dispatch (Phase 1A Technical / 1B Product) |
| :--- | :--- | :--- | :--- |
| **1. Who Signs?** | Lead Architect AND Product Owner (both mandatory). | Lead Architect AND Integration Coordinator. | Gate 1A: Lead Architect + Integration Coordinator; Gate 1B: Product Owner. |
| **2. What is Approved?** | Release of engineering implementation budget AND technical readiness. | Verification of technical contract readiness only. | Gate 1A approves technical readiness; Gate 1B releases tasks for dispatch. |
| **3. Required Evidence** | Offline test logs (187/187), frozen contracts, signed DEC-01..03, sprint plan. | Offline test logs (187/187), frozen contracts, dependency trees. | Gate 1A: test evidence + contracts; Gate 1B: business release signoff. |
| **4. Dual Signoff Mandatory?** | **YES.** Both must sign; neither can override. | **YES.** Both technical roles must sign. | **YES.** Both gates must pass sequentially. |
| **5. Single Authority Rejection?** | Dispatch halted immediately. Returned to planning. | Dispatch halted immediately. Returned to architecture. | Gate 1A rejection halts technical review; Gate 1B rejection halts launch. |
| **6. Partial Dispatch Permitted?** | Permitted only if explicitly bounded in written order (e.g. Batch 1 only). | Permitted on a per-workstream basis upon contract freeze. | Permitted: Batch 1 released while later waves await Gate 1B. |
| **7. Recording Mechanism** | Check-in of signed markdown file: `GATE_1_IMPLEMENTATION_AUTHORIZATION.md`. | Check-in of signed markdown file in repository. | Check-in of two sequential gate assessment records. |
| **8. Revocation Authority** | Either Lead Architect OR Product Owner can revoke immediately. | Either Lead Architect OR Integration Coordinator can revoke. | Architect can revoke technical gate; Product Owner can revoke dispatch gate. |

### 5.4 Recommendation: Adopt Alternative 1 (Joint Dual Signoff)
- **Recommendation**: **Adopt Alternative 1**. Gate 1 implementation dispatch represents a decisive transition from read-only architectural planning to active code mutation. Having the **Lead Architect** certify technical readiness and the **Project Sponsor / Product Owner** certify business and scope authorization guarantees maximum governance rigor and prevents premature resource consumption.

### 5.5 Decision Record DEC-04 (Explicit Human Completion Form)

```markdown
================================================================================
HUMAN GOVERNANCE DECISION RECORD: DEC-04
================================================================================
Decision ID:          DEC-04
Decision Title:       Gate 1 Implementation Dispatch Signoff Authority Boundary
Contracts Affected:   All Contracts (CONTRACT-01 through CONTRACT-09)
Tasks Affected:       All 21 Tasks (W5-1..6, W6-1..4, W7-P1..3, W8-1..3, W9-1..3, INT-1)
Required Approver:    Project Sponsor / Product Owner

FORMAL QUESTION:
Which governance structure holds authoritative jurisdiction to authorize Gate 1
Implementation Dispatch across Waves 5 through 9?

STATUS:               PENDING HUMAN APPROVAL (Select Alternative 1, 2, or 3 below)

[ ] ALTERNATIVE 1: Joint Dual Signoff — Lead Architect + Product Owner.
[ ] ALTERNATIVE 2: Technical Dual Signoff — Lead Architect + Integration Coordinator.
[ ] ALTERNATIVE 3: Two-Phase Dispatch — Technical Gate 1A (Architect/IC) + Dispatch Gate 1B (PO).

Project Sponsor / Product Owner Approval:
  Name / Role:        _________________________________________
  Decision:           [ ] APPROVED    [ ] REJECTED    [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________

Lead Architect Concurrence:
  Name / Role:        _________________________________________
  Decision:           [ ] CONCUR      [ ] DISSENT     [ ] REVISE
  Signature / Date:   _________________________________________
  Conditions / Notes: _________________________________________
================================================================================
```

---

## 6. Consolidated Decision Matrix

The table below unifies decisions `DEC-01` through `DEC-04`. All decision records remain explicitly **PENDING HUMAN APPROVAL**.

| Decision ID | Current Status | Existing Conflict | Recommended Resolution | Technical Evidence | Unresolved Risks | Affected Tasks | Required Approvers | Required Contract Amendments | Acceptance Criteria | Approval Status |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **DEC-01** | `PENDING` | Status `'EMPTY'` vs `'UNKNOWN'`; SOQL `ORDER BY CreatedDate DESC` vs `CreatedDate DESC, Id DESC` | Adopt Option A (`status = 'EMPTY'` and `ORDER BY CreatedDate DESC, Id DESC`) | Contract 04 §4 vs §5.2; zero custom fields in `DA_Analysis_Run__c`; standard CreatedDate | Cannot distinguish zero components from aborted run | W7-P1, W7-3, W8-3 | Lead Architect & Integration Coordinator | Amend CONTRACT-04 §4 and §5.2 to match Option A | Offline tests assert 'EMPTY' and deterministic ordering | `PENDING HUMAN APPROVAL` |
| **DEC-02** | `PENDING` | 10MB/20MB legacy claims vs 5MB/10MB proposed bounds | Adopt Option A (5,242,880 char single cap, 10,485,760 char combined cap, single Cytoscape canvas) | `daGraphPayloadLoader.js` line 6; LongTextArea 131,072 char limit; Contract W0-C7 | Lack of empirical browser heap benchmarks in LWC | W8-2, W8-3 | Lead Architect & Workstream D Lead | Transition CONTRACT-05 from PROPOSED to FROZEN | Memory benchmark tests pass without browser tab crash | `PENDING HUMAN APPROVAL` |
| **DEC-03** | `PENDING` | Method-level operations incompatible with CONTRACT-01; missing `force` and fixtures | Adopt Option A (Component-level scoping, defer MOVE_METHOD, EXTRACT_INTERFACE for cycles, cascadeEdges for node removal) | CONTRACT-01 has no `methods[]`; `fixtures/sample-refactoring-action.json` exists | Method retargeting deferred; IoC/Event strategies deferred | W9-1, W9-2, W9-3 | Workstream E Lead & Integration Coordinator | Amend CONTRACT-07 to reflect component-level rules | 10 reference fixtures pass deterministic offline tests | `PENDING HUMAN APPROVAL` |
| **DEC-04** | `PENDING` | Architect + Coordinator vs Architect + Product Owner for Gate 1 release | Adopt Alternative 1 (Joint Dual Signoff: Lead Architect + Product Owner) | Phase A2 summary vs Phase A3 reconciliation §5.2; engineering resource governance | Slower dispatch if Product Owner is unavailable | All 21 Tasks | Project Sponsor / Product Owner | None (Governance charter ratification) | Signed Gate 1 authorization markdown checked into git | `PENDING HUMAN APPROVAL` |

---

## 7. Dispatch-Readiness Implications

### 7.1 Impact of Decisions on Task Readiness Matrix
The resolution of decisions `DEC-01` through `DEC-04` directly controls task readiness progression across the 21 canonical tasks:

1. **Resolution of DEC-01**: Unblocks Task `W7-P1` from `BLOCKED_ON_UNRESOLVED_SPECIFICATION` to `READY_FOR_IMPLEMENTATION_REVIEW`.
2. **Resolution of DEC-02**: Unblocks Task `W8-2` from `BLOCKED_ON_CONTRACT_APPROVAL` to `READY_FOR_IMPLEMENTATION_REVIEW`.
3. **Resolution of DEC-03**: Unblocks Task `W9-1` from `BLOCKED_ON_CONTRACT_APPROVAL` to `READY_FOR_IMPLEMENTATION_REVIEW`.
4. **Resolution of DEC-04**: Establishes the governing authority permitted to grant Gate 1 implementation authorization. **However, resolving DEC-04 does not automatically authorize implementation; the designated authority must then explicitly execute the Gate 1 dispatch order.**

### 7.2 Current Authoritative 21-Task Classification Matrix
The verified classification established in `PHASE_A3_FINAL_TASK_READINESS_COUNT_CORRECTION.md` is strictly preserved:

| Task ID | Workstream | Primary Governance Classification | Direct Predecessors | Contract Dependencies | Review Eligible? | Authorized to Implement? | Impact of Pending Human Decisions |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| **W5-1** | WS-A | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-02 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W5-2** | WS-A | `BLOCKED_ON_PREDECESSORS` | W5-1 | CONTRACT-01, CONTRACT-02 | **NO** | **NO** | Serial blocker on W5-1 completion |
| **W5-3** | WS-A | `BLOCKED_ON_PREDECESSORS` | W5-1, W5-2 | CONTRACT-01, CONTRACT-02 | **NO** | **NO** | Serial blocker on W5-1, W5-2 completion |
| **W5-4** | WS-A | `BLOCKED_ON_PREDECESSORS` | W5-3 | CONTRACT-01, CONTRACT-09 | **NO** | **NO** | Serial blocker on W5-3 completion |
| **W5-5** | WS-A | `BLOCKED_ON_PREDECESSORS` | W5-4 | CONTRACT-01, CONTRACT-09 | **NO** | **NO** | Serial blocker on W5-4 completion |
| **W5-6** | WS-A | `BLOCKED_ON_PREDECESSORS` | W5-5 | CONTRACT-01, CONTRACT-06 | **NO** | **NO** | Serial blocker on W5-5 completion |
| **W6-1** | WS-B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-03 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W6-2** | WS-B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W6-3** | WS-B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W6-4** | WS-B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W7-P1** | WS-C | `BLOCKED_ON_UNRESOLVED_SPECIFICATION` | None | CONTRACT-01, CONTRACT-04 | **NO** | **NO** | **Directly blocked on DEC-01** |
| **W7-1** | WS-C | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W7-2** | WS-C | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W7-3** | WS-C | `BLOCKED_ON_PREDECESSORS` | W7-P1 | CONTRACT-04, CONTRACT-08 | **NO** | **NO** | Blocked on W7-P1 (and DEC-01) |
| **W8-1** | WS-D | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-06 | **YES** | **NO** | Awaits DEC-04 dispatch authorization |
| **W8-2** | WS-D | `BLOCKED_ON_CONTRACT_APPROVAL` | None | CONTRACT-01, CONTRACT-05 | **NO** | **NO** | **Directly blocked on DEC-02** |
| **W8-3** | WS-D | `BLOCKED_ON_PREDECESSORS` | W8-2, W7-P1 | CONTRACT-04, CONTRACT-05 | **NO** | **NO** | Compounded: blocked on W8-2, W7-P1, DEC-01, DEC-02 |
| **W9-1** | WS-E | `BLOCKED_ON_CONTRACT_APPROVAL` | None | CONTRACT-01, CONTRACT-07 | **NO** | **NO** | **Directly blocked on DEC-03** |
| **W9-2** | WS-E | `BLOCKED_ON_PREDECESSORS` | W9-1 | CONTRACT-07, CONTRACT-08 | **NO** | **NO** | Compounded: blocked on W9-1 and DEC-03 |
| **W9-3** | WS-E | `BLOCKED_ON_PREDECESSORS` | W9-1 | CONTRACT-07, CONTRACT-08 | **NO** | **NO** | Compounded: blocked on W9-1 and DEC-03 |
| **INT-1** | Coord | `COORDINATOR_EXCLUSIVE` | Waves 5–9 | CONTRACT-08, CONTRACT-09 | **NO** | **NO** | Awaits completion of all feature waves |

### 7.3 Category Totals Verification
$$\begin{aligned}
\text{Ready for Implementation Review} &= 8 \\
\text{Blocked on Predecessors} &= 9 \\
\text{Blocked on Contract Approval} &= 2 \\
\text{Blocked on Unresolved Specification} &= 1 \\
\text{Coordinator Exclusive} &= 1 \\
\hline
\mathbf{Total\ Accounted\ Tasks} &= \mathbf{21} \\
\mathbf{Authorized\ to\ Implement} &= \mathbf{0}
\end{aligned}$$

No task has been prematurely transitioned or elevated. Review eligibility remains strictly distinct from implementation authorization.

---

## 8. Summary Governance Conclusion

This human governance decision package is complete, evidence-backed, and ready for presentation to the designated human authorities. All four decisions (`DEC-01`, `DEC-02`, `DEC-03`, `DEC-04`) remain pending written execution.

**IMPLEMENTATION DISPATCH REMAINS STRICTLY PROHIBITED.**
