# Wave 0.3: Wave 8 Dual-Snapshot Resource & Lifecycle Gates

## 1. Problem Formulation & Defect Analysis

Wave 0.2 verified that historical snapshots can be retrieved using the existing Apex endpoint:
`DAGraphController.getGraphChunks(runId, startIndex, maxChunks, projectId)`

However, in Wave 8 Task `W8-3` (`daCompareView`), the client application must concurrently or sequentially load **two complete graph snapshots (Run A and Run B)** into the browser, execute diffing via `daDiffEngine`, and render the comparison.

### Defect Impact:
Without enforceable client-side resource thresholds and asynchronous lifecycle management:
1. **Browser Memory Exhaustion (OOM):** Loading two massive multi-megabyte JSON payloads and reassembling them simultaneously can exceed browser tab memory limits, causing browser tab crashes.
2. **Dual Cytoscape Canvas Leaks:** Instantiating two full-scale Cytoscape instances in DOM simultaneously will result in severe WebGL / Canvas context thrashing and mobile/desktop UI lockups.
3. **Race Conditions on Project Switching:** If the user switches projects in `daAppShell` while two multi-chunk snapshot retrievals are in flight, responses from the abandoned project will arrive asynchronously and overwrite new project state or corrupt diff comparisons.
4. **Duplicate Run Selection:** Selecting the same run ID for both Run A and Run B triggers redundant chunk downloads and wasteful diff computation.

---

## 2. Enforceable Resource Limits & Architectural Thresholds

All thresholds below are based directly on measured platform limits in `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js` and Apex controller limits in `DAGraphController.cls`:

| Resource Metric | Enforceable Limit | Architectural Source & Rationale | Enforcement Status |
| :--- | :---: | :--- | :---: |
| **Max Chunk Size** | `131,072 chars` (128 KB) | `MAX_CHUNK_SIZE` in `daGraphPayloadLoader.js`. Salesforce `LongTextArea` field limit. | **Active / Enforced** |
| **Max Payload Size per Snapshot** | `10,485,760 chars` (10 MB) | `MAX_TOTAL_PAYLOAD_SIZE` in `daGraphPayloadLoader.js`. Protects JSON parser. | **Active / Enforced** |
| **Max Combined Payload (Run A + Run B)** | `20,971,520 chars` (20 MB) | Strict 2x ceiling preventing browser heap exhaustion. | **Mandatory Gate** |
| **Max Chunks per Retrieval Batch** | `10 chunks` | Hard-coded max limit in `DAGraphController.getGraphChunks` (`maxChunks <= 10`). | **Active / Enforced** |
| **Max Total Chunks per Snapshot** | `80 chunks` | Derived from `10 MB / 128 KB = 80`. If `totalChunks > 80`, payload is rejected. | **Mandatory Gate** |
| **Max Concurrent In-Flight HTTP Requests** | `2 requests` | At most 1 chunk request in flight for Run A and 1 for Run B (or fully sequential). | **Mandatory Gate** |
| **Active Cytoscape Instances** | **Maximum 1** | Diff view must render a single unified diff graph (showing added/removed/modified nodes) rather than 2 simultaneous Cytoscape instances. | **Mandatory Invariant** |

---

## 3. Asynchronous Lifecycle & State Invalidation Gates

The implementation of `c-da-compare-view` (Task `W8-3`) must conform to the following enforceable lifecycle criteria:

### 3.1 Project-Switch Invalidation & Cancellation Token
Every retrieval session must maintain a local monotonically increasing request sequence token (`_currentRequestId`):
```javascript
// On projectId change:
handleProjectChange(newProjectId) {
    this._activeRequestId++; // Invalidate all pending chunk responses
    this.resetRetrievalState();
    this.projectId = newProjectId;
}
```
When an asynchronous `getGraphChunks` promise resolves, the response must be discarded immediately if `responseRequestId !== this._activeRequestId`.

### 3.2 Duplicate Run Selection Guard
If the user selects identical run IDs (`runIdA === runIdB`), the component must:
1. Prevent network chunk downloads for Run B.
2. Reuse Run A's reassembled payload locally.
3. Emit a non-destructive notice: `"Identical snapshots selected: zero diffs detected."`

### 3.3 Strict In-Order Chunk Reassembly & Surrogate Safety
Each snapshot must independently execute:
1. `verifyChunkSequence(chunks, expectedStartIndex)` to prevent missing or duplicated chunks.
2. `validateChunkLimits(chunks, MAX_CHUNK_SIZE)` to reject oversized chunks.
3. `reassembleChunks(chunks)` preserving UTF-16 surrogate pairs.
4. `validatePayloadIntegrity(rawJson)` to verify JSON syntax and graph node/edge integrity before diffing.

### 3.4 Cleanup & Memory Teardown
When navigating away from Compare View or resetting comparison:
1. Cytoscape instance must call `cy.destroy()` and set container references to `null`.
2. Diff Maps, node lookup indices, and raw chunk strings must be explicitly dereferenced (`this.rawChunksA = null; this.rawChunksB = null;`).
3. Active Web Workers (if used for background diffing) must be terminated (`worker.terminate()`).
