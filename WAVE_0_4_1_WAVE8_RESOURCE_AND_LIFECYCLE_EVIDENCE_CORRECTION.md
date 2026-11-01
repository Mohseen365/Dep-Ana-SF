# Wave 0.4.1: Wave 8 Resource and Lifecycle Evidence Correction

## 1. Executive Summary & Defect Remediation

In Wave 0.4, documentation surrounding Wave 8 resource limits and request lifecycles contained unverified claims:
- **Defect Identified:** Previous reports conflated string length limits (`MAX_TOTAL_PAYLOAD_SIZE = 10485760` characters) with browser runtime heap safety, and referred to a "20 MB combined two-snapshot ceiling" as an established platform guard. Additionally, request-generation invalidation was colloquially termed "cancellation," which could imply physical cancellation of in-flight Apex requests.
- **Remediation Enacted in Wave 0.4.1:**
  1. We explicitly distinguish JavaScript string length limits (UTF-16 code units) from runtime V8 heap allocation.
  2. The 10 MB limit (`MAX_TOTAL_PAYLOAD_SIZE = 10,485,760` characters in `daGraphPayloadLoader.js`) is an **application-level string character length guard**, not a proof of browser heap safety.
  3. The "20 MB combined two-snapshot limit" is formally classified as an **unverified / proposed design requirement**, as no automated enforcement or evidence exists in the repository.
  4. Request-generation invalidation is clarified: it ensures stale responses are safely discarded without mutating component state; it does **not** physically cancel the underlying Apex HTTP/XHR transaction.

---

## 2. String Length Guards vs Browser Heap Realities

### 2.1 String Character Limit Guard
- Constant: `MAX_TOTAL_PAYLOAD_SIZE = 10485760` characters (~10 MB in raw UTF-16 representation).
- Enforced in: `daGraphPayloadLoader.js` during chunk reassembly.
- Role: Protects against runaway Apex payload chunk reassembly.

### 2.2 V8 Heap Expansion & Memory Footprint
- When a 10 MB raw JSON string is parsed by `JSON.parse()`, the resulting object tree (with tens of thousands of node and edge objects, properties, and prototype chains) typically occupies **30 MB to 80 MB** on the V8 heap.
- If two snapshots are parsed concurrently and converted into Cytoscape graph models, the heap footprint can exceed **150 MB to 200 MB**.
- **Evidence Limitation:** The offline Node.js environment cannot profile browser heap memory, GPU rendering limits, or DOM memory pressure. Therefore, string guards must never be cited as proof of browser heap safety.

---

## 3. Stale Response Invalidation vs Request Cancellation

### 3.1 Mechanism: Request Generation Sequence Numbers
In LWC, standard `@wire` or imperative Apex calls cannot be forcibly aborted at the network transport layer like `AbortController.abort()`.
Instead, `daCompareView` and `daGraphViewer` utilize a generation counter:
1. When a new project or snapshot request begins, the component increments `this.currentRequestId++`.
2. A local copy `const requestId = this.currentRequestId` is captured in the request closure.
3. When the promise resolves or rejects, the component checks:
   `if (requestId !== this.currentRequestId) return; // Stale response discarded`
4. This completely prevents race conditions and out-of-order state corruption.
5. **Architectural Distinction:** This is **stale-response invalidation**, not network request cancellation.

---

## 4. Lifecycle Cleanup and Teardown Invariants
To prevent memory leaks during view transitions:
1. `disconnectedCallback()` must explicitly invoke `this.cytoscapeInstance.destroy()`.
2. All event listeners registered on `window` or external buses must be removed.
3. Web worker instances (if any) must be terminated with `.terminate()`.
4. Cached payload references must be set to `null` to facilitate garbage collection.
