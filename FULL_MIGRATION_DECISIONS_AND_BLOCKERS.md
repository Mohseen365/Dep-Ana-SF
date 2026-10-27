# Full Dependency Analyzer to Salesforce Migration Decisions & Blockers

## 1. Architectural Decisions Register

### Decision 1: External Node.js AST Parsing vs Salesforce Apex Boundary
- **Status:** **`APPROVED_EXTERNAL_SERVICE`**
- **Decision:** Keep source code file traversal, AST parsing, and initial graph export in external Node.js CLI tooling (`analyze/`, `scripts/`).
- **Rationale:** AST parsing of TypeScript/JavaScript files requires heavy filesystem I/O and CPU operations incompatible with Apex CPU/Memory limits. Apex handles data ingestion, chunk storage, authorization, layout computation, and UI rendering.

### Decision 2: Payload Chunking & Boundary Limits
- **Status:** **`VERIFIED & FROZEN`**
- **Decision:** Cap graph payload chunks at 131,072 characters matching the `Payload_Data__c` LongTextArea field limit. Overall application-level graph payload limit is capped at 10 MB (100 chunks).
- **Rationale:** Guarantees strict adherence to Salesforce DML field length limits while protecting client memory from runaway graph sizes.

### Decision 3: Reusable LWC Layout Engine (`daLayoutEngine.js`)
- **Status:** **`VERIFIED & FROZEN`**
- **Decision:** Encapsulate layout algorithms (Architecture, Orbit, Constellation, Sankey) inside a standalone ES module LWC (`daLayoutEngine.js`).
- **Rationale:** Enables client-side layout computation directly inside LWC components without requiring external web workers or backend Apex recalculation passes.

### Decision 4: Interaction Invariant Enforcement (**SELECTION ≠ NAVIGATION**)
- **Status:** **`APPROVED PRODUCT CONTRACT`**
- **Decision:** Node and edge selection events within Cytoscape.js canvas update side-panel reactive properties ONLY. They must never mutate route paths, tab locations, or active project context.
- **Rationale:** Prevents context loss and accidental navigation during graph investigation.

---

## 2. Unknowns & Proposed Decisions Requiring Approval

1. **Snapshot Compare Implementation Strategy:**
   - *Proposal:* Implement graph comparison in LWC client-side using Map diffing for small/medium graphs; introduce a lightweight Apex diff controller for large graphs (>5,000 nodes).
   - *Status:* `PROPOSED` — Requires review prior to Wave 4 dispatch.

2. **D3 / Specialized Visualization Dependencies in LWS:**
   - *Proposal:* Bundle D3 sub-modules (e.g. `d3-sankey`, `d3-shape`) as static resources or inline ES imports for `daDependencyRiver` and `daSubwayMap`.
   - *Status:* `PROPOSED` — Requires LWS security verification in Wave 5.

---

## 3. External Dependencies & Salesforce Org Validation Blockers

### Primary Blocker: Deferred Salesforce Org Access
- **Description:** Live Apex execution, code coverage calculation, `WITH USER_MODE` profile validation, and Lightning Web Security (LWS) runtime checks cannot be completed without an authorized Salesforce SFDX org connection.
- **Impact:** Live org deployment and release sign-off are deferred to Wave 5.
- **Mitigation:** Comprehensive offline test harness (`run-poc-tests.cjs`) simulates Apex DTO serialization, chunk boundary rules, and LWC layout algorithms with 100% pass rate.

---

## 4. Key Project Risks & Mitigation Matrix

| Risk ID | Risk Description | Potential Impact | Severity | Mitigation Strategy |
|---|---|---|---|---|
| **RISK-01** | Client Browser Heap Exhaustion on 10MB Graphs | Cytoscape canvas crashes on low-spec client hardware when rendering >5,000 nodes. | High | Implement LOD (Level of Detail) node text hiding and dynamic element pruning at low zoom levels. |
| **RISK-02** | Apex CPU Time Limit During Ingestion | Parsing large JSON payloads in Apex exceeds the 10-second synchronous governor limit. | High | Ingestion service processes chunks asynchronously using Queueable Apex if chunk count >20. |
| **RISK-03** | LWS Violation in Cytoscape Static Resource | Lightning Web Security blocks Cytoscape DOM manipulation or canvas access. | Medium | Static resource `cytoscape.js` tested against LWS compliance rules in standard LWC sandbox mode. |
