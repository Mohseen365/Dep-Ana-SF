# Wave 0.2: Dual-Snapshot Graph Retrieval & Diff Contract for W8-3

## 1. Executive Summary & Problem Formulation

In Wave 0.1, Task `W8-3` (Compare View) was specified as depending on `W7-P1` and `W8-2` (`WAVE_0_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv`).

However, earlier migration audits noted a critical gap:
While `W7-P1` (`getAnalysisRuns`) lists available runs, **listing run identifiers is not sufficient to perform snapshot diffing**. To perform graph comparison, the client must retrieve the **complete graph payloads for two distinct runs (Run A and Run B)**.

This audit inspects the actual Apex controllers, chunk services, and client loaders to determine whether existing APIs can retrieve two distinct run payloads, defines the dual-snapshot retrieval protocol, and determines the true launch readiness of `W8-3`.

---

## 2. Apex Retrieval Capability Verification

### 2.1 Inspection of `DAGraphController.cls`
In `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`:
- Method `getLatestGraphMetadataForProject(String projectId)` retrieves only the latest run metadata.
- **However**, method `getGraphChunks(String runId, Integer startIndex, Integer maxChunks, String projectId)` provides:
  ```apex
  @AuraEnabled(cacheable=true)
  public static List<DA_Graph_Chunk__c> getGraphChunks(String runId, Integer startIndex, Integer maxChunks, String projectId)
  ```
  This method:
  1. Accepts an arbitrary `runId` parameter.
  2. Validates that the run belongs to the specified `projectId` under `WITH USER_MODE`.
  3. Queries `DA_Graph_Chunk__c` records where `DA_Analysis_Run__c = :runId` bounded by `startIndex` and `maxChunks`.
  4. Orders chunks deterministically by `Chunk_Index__c ASC`.

### 2.2 Finding: Existing APIs Fully Support Dual-Snapshot Retrieval
The existing Apex implementation in `DAGraphController.cls` **already supports retrieving any specific historical run by ID**, provided the caller knows the `runId`.

Therefore:
- Run A (`runIdA`) and Run B (`runIdB`) can be retrieved concurrently or sequentially via repeated calls to `getGraphChunks(runId, startIndex, maxChunks, projectId)`.
- No new Apex chunk endpoints are required.
- However, a dedicated run-specific metadata endpoint `getGraphMetadataForRun(String runId, String projectId)` is recommended to fetch `totalChunks` for non-latest runs, or the client can discover `totalChunks` by iterating until chunks return empty.

---

## 3. Dual-Snapshot Retrieval Protocol & Client Architecture

```
   +-----------------------------------------------------------------------+
   |                     c-da-compare-view (LWC Shell)                     |
   |                                                                       |
   |  [Run A Selector: Run_001]                  [Run B Selector: Run_002] |
   +-----------------------------------------------------------------------+
              |                                            |
              v                                            v
   +----------------------+                     +----------------------+
   |  Chunk Ingestion A   |                     |  Chunk Ingestion B   |
   | (Sequential/Bounded) |                     | (Sequential/Bounded) |
   | getGraphChunks(A)    |                     | getGraphChunks(B)    |
   +----------------------+                     +----------------------+
              |                                            |
              v                                            v
   +----------------------+                     +----------------------+
   |  reassembleChunks()  |                     |  reassembleChunks()  |
   | validateIntegrity()  |                     | validateIntegrity()  |
   +----------------------+                     +----------------------+
              |                                            |
              +---------------------+----------------------+
                                    |
                                    v
                     +------------------------------+
                     |       daDiffEngine (LWC)     |
                     |  computeGraphDiff(base, curr)|
                     +------------------------------+
                                    |
                                    v
                     +------------------------------+
                     |       Diff Visualization     |
                     | (Added/Removed/Mod ViewCards)|
                     +------------------------------+
```

### 3.1 Selection & Scope Invariants
1. **Identical Run Guard:** The UI must disable comparison if `runIdA === runIdB`, presenting a clear prompt to select distinct snapshots.
2. **Project Scoping:** Both `runIdA` and `runIdB` must belong to the active `projectId`. Cross-project comparisons are strictly prohibited and rejected by Apex `WITH USER_MODE` query filters.
3. **Project Switch Invalidation:** Switching the active project immediately aborts all in-flight chunk requests and resets Run A, Run B, and diff state to null.

### 3.2 Chunk Reassembly & UTF-16 Safety
- Chunks for Run A and Run B must be reassembled using `daGraphPayloadLoader.reassembleChunks()`.
- Chunks must be validated using `verifyChunkSequence()` and `validatePayloadIntegrity()`.
- Surrogate-pair preservation ensures that multi-byte Unicode characters in component names or annotations do not corrupt JSON parsing.

### 3.3 Client Memory Constraints & Garbage Collection
- **Salesforce Lightning Runtime Memory Boundary:**
  In Salesforce LWC, holding two massive graph payloads ($\sim 10\text{ MB}$ each) simultaneously can strain browser tab memory on resource-constrained client machines.
- **Diff Engine Execution Strategy:**
  1. Parse Snapshot A into an indexed Map of nodes (`Map<id, Node>`) and Map of edges (`Map<id, Edge>`).
  2. Parse Snapshot B into an indexed Map.
  3. Execute `computeGraphDiff` to produce the minimal delta structure (`addedNodes`, `removedNodes`, `modifiedNodes`, `addedEdges`, `removedEdges`).
  4. **Immediately release references** to the raw JSON string payloads (`rawJsonA = null`, `rawJsonB = null`) to allow the JavaScript garbage collector to reclaim memory.
- **Single Cytoscape Instance Invariant:**
  The Compare View must **never** instantiate two simultaneous Cytoscape instances. If graph visualization of diffs is rendered, it must render a single unified diff graph using color-coded diff statuses (Green = Added, Red = Removed, Orange = Modified) or a side-by-side tabular view.

---

## 4. Workstream D Launch Readiness & Staging Decision

We distinguish between the component shell/diff algorithms and live dual-snapshot retrieval:

1. **W8-1: Investigation Drawer**
   - **Status:** `READY_TO_LAUNCH`.
   - **Contract:** `W0-C2` (Selection != Navigation), `W0-C6` (Pinning).
   - **Dependencies:** None.

2. **W8-2: Diff Engine LWC Module**
   - **Status:** `READY_TO_LAUNCH`.
   - **Contract:** `W0-C7` (Snapshot Diff Contract).
   - **Dependencies:** None. Operates on pure in-memory JSON fixtures and unit tests.

3. **W8-3A: Compare View Shell & Tabular Diff Component**
   - **Status:** `IMPLEMENTATION_DEPENDENT`.
   - **Contract:** `W0-C4` (View Registration), `W0-C7` (Diff Contract).
   - **Dependencies:** Awaits `W8-2` (Diff Engine) and `W7-P1A` (Minimal History API for run selection).

4. **W8-3B: Live Dual-Snapshot Chunk Pipeline**
   - **Status:** `IMPLEMENTATION_DEPENDENT`.
   - **Contract:** `W0-C1` (Payload Loader), `W0-C7`.
   - **Dependencies:** Integrates `W8-3A` with `getGraphChunks` multi-run loading.

**Authoritative Conclusion:**
`W8-1` and `W8-2` are immediately launchable. `W8-3` is unblocked for component development as soon as `W8-2` and `W7-P1A` are complete. No blocking schema gaps exist for dual-snapshot retrieval.
