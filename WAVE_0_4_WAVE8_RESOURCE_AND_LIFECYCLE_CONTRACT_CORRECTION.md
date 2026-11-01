# Wave 0.4: Wave 8 Resource and Lifecycle Contract Correction (Workstream C)

## 1. Problem Formulation & Defect Analysis

Wave 0.3 outlined client-side constraints for dual-snapshot retrieval in Task `W8-3` (`daCompareView`). However, independent technical review uncovered two significant defects:
1. **Conflation of String Character Limits with Memory Usage:**
   Wave 0.3 presented thresholds such as "10 MB per snapshot / 20 MB combined" as measured browser memory limits. In reality, Salesforce fields and JavaScript strings measure character lengths, which differ substantially from actual JavaScript runtime heap allocation and Cytoscape DOM/WebGL memory footprint.
2. **LWC Anti-Pattern in Documentation:**
   Section 3.1 of `WAVE_0_3_WAVE8_DUAL_SNAPSHOT_RESOURCE_AND_LIFECYCLE_GATES.md` included code that illegally mutated an inbound public property:
   ```javascript
   this.projectId = newProjectId; // VIOLATES LWC INVARIANT: Component must not mutate its own @api property!
   ```

---

## 2. Character Length Limits vs. JavaScript Heap Allocation

We explicitly differentiate application string length constraints from browser runtime heap consumption:

### 2.1 Source-Code Constants and Platform Limits
Inspection of `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js` reveals:
- `MAX_CHUNK_SIZE = 131072`: Derived from Salesforce `LongTextArea` character limit (131,072 UTF-16 code units / characters).
- `MAX_TOTAL_PAYLOAD_SIZE = 10485760`: An application-level string character length guard (`rawJson.length <= 10485760`).
- Apex controller `DAGraphController.getGraphChunks`: Enforces `maxChunks <= 10` per SOQL retrieval batch.

### 2.2 Heap Memory Realities
A 10,485,760 character JSON string requires ~20 MB of raw memory in V8 (2 bytes per UTF-16 code unit). However:
1. When parsed via `JSON.parse()`, the resulting object graph (thousands of nodes, edges, properties) typically expands **3x to 8x**, consuming **30 MB to 80 MB** of V8 heap per snapshot.
2. If two full snapshots (Run A and Run B) and a diff graph are instantiated simultaneously, heap consumption can exceed **150 MB to 200 MB**.
3. **Crucial Clarification:** The 10 MB and 20 MB limits are **character-count ceilings on reassembled JSON strings**, not guarantees of browser heap safety.
4. The repository contains offline Node.js test runners; it does **not** contain automated browser heap memory profiling tests. It is technically false to claim that 20 MB string limits "prevent browser heap exhaustion." They provide necessary input boundaries, but memory safety requires diligent object dereferencing and garbage collection facilitation.

---

## 3. LWC Inbound Property Invariant Correction

In Lightning Web Components, `@api` properties are public, read-only reactive properties managed exclusively by the parent component (`daAppShell`). A child component modifying its own `@api` property produces an LWC runtime error or unexpected component state de-synchronization.

### 3.1 Correct State Ownership Architecture:
- **Parent (`daAppShell`):** Owns `activeProjectId` and passes it to child components via the template attribute:
  `<c-da-compare-view project-id={activeProjectId} ...></c-da-compare-view>`
- **Child (`daCompareView`):**
  Declares `@api projectId;` as a read-only inbound property.
  Uses a getter/setter or `renderedCallback` / reactive change tracking:
  ```javascript
  @api
  get projectId() {
      return this._projectId;
  }
  set projectId(value) {
      if (this._projectId !== value) {
          this._projectId = value;
          this.handleProjectChange(value);
      }
  }

  // Private state
  _projectId = null;
  _activeRequestGeneration = 0;

  handleProjectChange(newProjectId) {
      // Monotonically increment request generation token to invalidate stale responses
      this._activeRequestGeneration++;
      this.resetComparisonState();
  }
  ```

---

## 4. Request Lifecycle and Concurrency Management

Task `W8-3` must enforce the following request lifecycle invariants:

### 4.1 Request Generation Token Pattern
- Every retrieval sequence is tagged with `this._activeRequestGeneration`.
- When an asynchronous Apex call resolves, the callback compares the captured generation ID against `this._activeRequestGeneration`.
- If `capturedGeneration !== this._activeRequestGeneration`, the response is silently discarded.

### 4.2 Reassembly & Invariant Verification Pipeline
For each snapshot:
1. Chunks are ingested in batches (`maxChunks <= 10`).
2. Sequence verification: `verifyChunkSequence(chunks, expectedIndex)` ensures contiguous ordering without gaps or duplicates.
3. Size verification: `validateChunkLimits(chunks)` ensures no chunk exceeds 131,072 characters.
4. Total length verification: `validatePayloadSize(rawJson)` ensures concatenated string <= 10,485,760 characters.
5. Payload integrity: `validatePayloadIntegrity(rawJson)` ensures parseable JSON and valid graph envelopes.
6. Surrogate safety: Chunk boundary slicing in `chunkPayload` prevents splitting UTF-16 surrogate pairs (D800–DBFF).

### 4.3 Teardown and Resource Cleanup
- **Single Diff Canvas Invariant:** `daCompareView` must render a **single** unified diff Cytoscape canvas representing delta states (added, removed, modified), rather than instantiating two independent Cytoscape canvases.
- **Teardown Lifecycle:** When `disconnectedCallback()` is invoked or comparison resets:
  1. Call `cyInstance.destroy()` to release DOM nodes, event listeners, and WebGL contexts.
  2. Nullify references to Cytoscape instances, node indices, and raw JSON strings:
     `this.cy = null; this.rawPayloadA = null; this.rawPayloadB = null;`
  3. If Web Workers are used for diffing, invoke `worker.terminate()` and dereference the worker instance.
