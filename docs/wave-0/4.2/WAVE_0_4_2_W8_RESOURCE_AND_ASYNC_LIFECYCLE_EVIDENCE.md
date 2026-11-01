# Wave 0.4.2: Workstream D — Wave 8 Resource and Asynchronous Lifecycle Evidence

## 1. Executive Summary & Clarification of Ambiguities

During the independent technical review of Wave 0.4 and Wave 0.4.1, several assertions regarding resource management and component lifecycle in Task `W8-3` (`daCompareView`) required empirical classification:
1. **Raw String Guard vs V8 Heap Expansion:** The constant `MAX_TOTAL_PAYLOAD_SIZE = 10,485,760` characters in `daGraphPayloadLoader.js` is a defensive raw JavaScript string length guard. It does not limit V8 heap allocation, which expands by 3x to 8x upon `JSON.parse()`.
2. **The "20 MB Combined Limit":** Wave 0.4 referred to a "20 MB combined two-snapshot ceiling" as an architectural guard. In reality, no such check exists in the current codebase; it is formally classified as a **proposed design requirement**.
3. **Stale Response Invalidation vs Physical Cancellation:** Using incrementing request sequence numbers (`currentRequestId++`) ensures stale responses are safely ignored. It does **not** abort in-flight Apex HTTP transactions or free server execution threads.

---

## 2. Memory Claim Classification & Heap Footprint Analysis

| Memory Claim | Reported Figure | Verified Technical Classification | Evidence / Basis |
| :--- | :--- | :--- | :--- |
| **Max Payload Size Guard** | 10,485,760 chars (~10 MB) | **DOCUMENTED_CONSTANT** | Constant `MAX_TOTAL_PAYLOAD_SIZE` defined in `daGraphPayloadLoader.js` |
| **Two-Snapshot Combined Limit**| ~20 MB (2 x 10 MB) | **PROPOSED_LIMIT (UNVERIFIED)** | Proposed design requirement; not implemented in code |
| **Single Parsed Snapshot Heap** | 30 MB – 80 MB | **DERIVED_ESTIMATE** | V8 object overhead: strings, pointers, prototype chains for 5,000+ nodes/edges |
| **Dual Snapshot Graph Heap** | 150 MB – 200 MB | **DERIVED_ESTIMATE** | Cytoscape.js internal elements, indexes, event listeners, canvas backing stores |
| **Client Heap Profiling** | N/A | **UNKNOWN / UNVERIFIED** | No browser heap profiling evidence exists in offline Node.js environment |

### Technical Principle: String Guard != Heap Safety
A 10 MB JSON string contains approximately 10.48 million 16-bit code units (20.97 MB in memory as flat string).
When deserialized by `JSON.parse()`:
- Each node object consumes ~48 to 128 bytes of V8 object heap.
- Each edge object with source/target references consumes ~64 to 160 bytes.
- For a graph of 20,000 nodes and 50,000 edges, the in-memory JavaScript object graph typically exceeds 40 MB to 70 MB.
- When two snapshots (Snapshot A and Snapshot B) are held in memory concurrently during diff analysis, peak memory can trigger browser tab performance warnings on low-memory mobile or embedded devices.
- **Architectural Requirement:** The 10 MB guard prevents runaway payload chunks, but memory safety requires explicit snapshot disposal and reference nullification.

---

## 3. Asynchronous Lifecycle and Race Condition Contract

### 3.1 Request Generation Sequence Number Protocol
In LWC, AuraEnabled Apex invocations (imperative or wired) cannot be canceled via `AbortController`. Therefore, asynchronous race conditions during rapid project/run switching must be mitigated at the component controller level:

```javascript
export default class DaCompareView extends LightningElement {
  _currentRequestId = 0;
  _isLoading = false;

  loadComparison(projectId, baseRunId, targetRunId) {
    // 1. Advance request generation token
    const requestId = ++this._currentRequestId;
    this._isLoading = true;

    // 2. Clear old state before fetch
    this.diffResult = null;

    Promise.all([
      fetchSnapshot(projectId, baseRunId),
      fetchSnapshot(projectId, targetRunId)
    ])
    .then(([snapA, snapB]) => {
      // 3. Stale Response Guard: Verify generation token has not been superseded
      if (requestId !== this._currentRequestId) {
        console.warn(`[daCompareView] Discarding stale comparison response for request #${requestId}`);
        return; // Early return: state is NOT mutated
      }

      // 4. Compute diff only if still current
      this.diffResult = this.computeDiff(snapA, snapB);
      this._isLoading = false;
    })
    .catch(error => {
      // 5. Stale Error Guard: Discard errors from obsolete requests
      if (requestId !== this._currentRequestId) {
        return;
      }
      this._isLoading = false;
      this.handleError(error);
    });
  }
}
```

### 3.2 Audit of Asynchronous Mutation Paths

| Asynchronous Mutation Path | Risk if Unguarded | Required Guard Mechanism |
| :--- | :--- | :--- |
| **Base Run Selection Change** | Stale diff overwrites newly selected base run | Increment `_currentRequestId`; discard in `.then()` |
| **Target Run Selection Change** | Stale diff overwrites newly selected target run | Increment `_currentRequestId`; discard in `.then()` |
| **Project Switch** | Cross-project data leakage into comparison view | Increment `_currentRequestId`; nullify diff and snapshots |
| **Chunk Reassembly Timeout** | Partial chunks lingering in memory | Clear chunk reassembly buffer on request reset |
| **Component Disconnection** | Mutation after DOM detach throws unhandled error | Check `this.isConnected` before updating component state |
| **Component Reconnection** | Stale cached references re-rendered | Refresh state on `connectedCallback()` |

### 3.3 Component Teardown & Reference Nullification
To prevent memory leaks when switching between views in `daAppShell`:
```javascript
disconnectedCallback() {
  // Invalidate any in-flight asynchronous operations
  this._currentRequestId++;

  // Nullify heavy snapshot and diff references to facilitate garbage collection
  this.snapshotA = null;
  this.snapshotB = null;
  this.diffResult = null;

  // Clean up any child graph instances if mounted
  if (this._graphInstance) {
    this._graphInstance.destroy();
    this._graphInstance = null;
  }
}
```

---

## 4. Testable Resource Acceptance Criteria for Implementation

Feature agents implementing `W8-2` and `W8-3` must satisfy these explicit criteria:

1. **AC-W8-01 (Single Snapshot Raw Size):** Reassembly rejects any payload where total chunk length exceeds `MAX_TOTAL_PAYLOAD_SIZE = 10,485,760` characters with `PayloadExceedsLimitException`.
2. **AC-W8-02 (Combined Dual Snapshot Size):** Implement the proposed check in `daCompareView`: if `snapA.rawSize + snapB.rawSize > 20,971,520` characters (~20 MB), display a graceful UI warning instead of crashing.
3. **AC-W8-03 (Chunk Boundary UTF-8 Safety):** Ensure multibyte UTF-8 characters and surrogate pairs split across chunk boundaries are reassembled without character corruption.
4. **AC-W8-04 (Stale Response Invalidation):** If request 1 resolves after request 2 has initiated, request 1's resolved payload must not mutate component properties.
5. **AC-W8-05 (Disconnected Callback Teardown):** Verify that navigating away from `daCompareView` unmounts graph instances and releases snapshot references.
