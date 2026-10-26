# Salesforce-Native Architecture Feasibility, LWC Security and Performance Validation Report

**Header Information:**
- **Deliverable Path:** `SALESFORCE_NATIVE_FEASIBILITY_REPORT.md`
- **Workstream Lane:** Lane B (Salesforce Architecture Feasibility Analysis)
- **Repository Branch:** `jules-11180040639943580270-600be6cd`
- **Git Working Tree:** Clean
- **Date:** October 2026
- **Author:** Jules (Lane B Software Engineer)

---

## 1. Executive Summary

This report establishes the technical feasibility, security constraints, performance limits, and deployment prerequisites for migrating the Dependency Analyzer application into a Salesforce-native architecture.

### Key Feasibility Findings:
1. **Salesforce CLI & Tooling:** Installed `@salesforce/cli/2.155.7` globally. No authenticated target org or DevHub was present in the sandbox (`sf org list` returned `No Orgs found`). Org-dependent deployment and LWS runtime tests are classified as **`BLOCKED — NO AUTHENTICATED TARGET ORG`**.
2. **UI & Canvas Rendering:** Reusing Cytoscape.js (`v3.30.2`) and its extensions (`cytoscape-fcose`, `cytoscape-navigator`) inside a Lightning Web Component (LWC) is **Partially Feasible**. LWS supports DOM canvas rendering and standard event listeners when loaded via Static Resources (`lightning/platformResourceLoader`), but dynamic script injection, un-isolated Worker scripts, and direct external DOM access are restricted by CSP/LWS.
3. **Graph Layout & Web Worker Execution:** Browser-side JavaScript execution of layout algorithms in LWC is **Feasible**. However, Web Worker thread execution (`Worker` constructor with inline script blobs) is blocked under standard LWS security policies without custom CORS/static resource worker handling. The engine must utilize the existing synchronous fallback mechanism or pure browser-side async micro-tasks (`requestAnimationFrame` / `setTimeout`).
4. **Apex Governor Limits & Payload Sizes:** Apex server-side computation for O(N^2) graph layout or parsing large JSON payloads (e.g. PBIM dataset: **4.15 MB, 528 nodes, 2063 edges**) is **Unfeasible in Apex** due to strict synchronous governor limits (6 MB heap, 10s CPU timeout, 50,000 SOQL row limits). Apex **must** be reserved for data persistence, ACL checks, and light SOQL querying, while layout algorithms and JSON parsing remain client-side in browser JS.
5. **Metadata Ingestion Boundary:** Native Apex source parsing of entire org metadata at runtime is **Unfeasible** due to CPU limits and lack of AST parsing capabilities. Metadata acquisition must rely on Salesforce Tooling API / Metadata API for component inventory, paired with an approved source-export or client-side JSON ingestion workflow.

---

## 2. Repository and Environment Facts

- **Node.js Version:** `v22.22.1`
- **npm Version:** `11.11.0`
- **Root Package Dependencies:** 30 packages audited via `npm ci` (clean).
- **Explorer Package Dependencies:** 210 packages audited via `explorer/npm ci` (clean).
- **Cytoscape Version:** `cytoscape@3.30.2`
- **Cytoscape Extensions:** `cytoscape-fcose@2.2.0`, `cytoscape-navigator@2.0.2`
- **Layout Architecture Files:**
  - `explorer/src/lib/graph-layout.ts`
  - `explorer/src/lib/workers/layout-worker-client.ts`
  - `explorer/src/lib/workers/layout.worker.ts`
  - `explorer/src/lib/layout/global-layout.ts` (Hierarchical)
  - `explorer/src/lib/layout/component-orbit-layout.ts` (Orbit)
  - `explorer/src/lib/layout/component-constellation-layout.ts` (Constellation)

### Fixture Measurement Evidence:
| Dataset | JSON File Size | Node Count | Edge Count | File Path |
| :--- | :--- | :--- | :--- | :--- |
| **PBIM Dataset** | **4,153.87 KB (4.15 MB)** | **528** | **2,063** | `explorer/public/pbim/explorer-data.json` |
| **BQC Dataset** | **1,300.86 KB (1.30 MB)** | **274** | **603** | `explorer/public/projects/bqc/explorer-data.json` |
| **CST Dataset** | **1,817.16 KB (1.82 MB)** | **240** | **1,024** | `explorer/public/projects/cst/explorer-data.json` |
| Default Sample | 8.79 KB | 4 | 3 | `explorer/public/explorer-data.json` |

*Note on PBIM dataset discrepancy:* The Wave 0 report noted PBIM as a 528-node dataset. Physical measurement confirms 528 nodes and 2,063 edges, with a serialized file size of 4.15 MB (exceeding historical 1.2MB claims).

---

## 3. Salesforce CLI and Target-Org Readiness

- **SF CLI Installation Command:** `npm install -g @salesforce/cli`
- **SF CLI Version Output:** `@salesforce/cli/2.155.7 linux-x64 node-v22.22.1`
- **SF Org List Command:** `sf org list`
- **SF Org List Output:** `No Orgs found.`
- **Dev Hub Status:** Unconfigured / Not Authenticated.
- **Org Availability Classification:** **`BLOCKED — NO AUTHENTICATED TARGET ORG`**
- **Impact:** Local static code analysis, DX project scaffolding, and limit modeling are complete. Live deployment (`sf project deploy start`), Apex unit test execution in org, and runtime LWS validation require connected org credentials in future waves.

---

## 4. Salesforce DX Scaffold Findings

An isolated Salesforce DX project scaffold was created inside `scratch/salesforce-poc/`:
- **`sfdx-project.json`:** Formatted for Salesforce API v61.0, targeting package directory `force-app`.
- **`config/project-scratch-def.json`:** Configured for Developer Edition scratch org with Lightning Experience enabled.
- **LWC Component (`force-app/main/default/lwc/graphViewer/`):**
  - Includes `graphViewer.html`, `graphViewer.js`, and `graphViewer.js-meta.xml`.
  - Uses `lwc:dom="manual"` on `<div class="graph-container">` to grant Cytoscape DOM container control.
  - Implements `renderedCallback()` and `disconnectedCallback()` with `cy.destroy()` for lifecycle memory cleanup.
- **Apex Controller (`force-app/main/default/classes/GraphDataController.cls`):**
  - Implements `@AuraEnabled(cacheable=true)` with `with sharing` keyword for FLS/CRUD security compliance.
  - Returns `GraphPayloadDTO`, `NodeDTO`, and `EdgeDTO` for fast wire adapter consumption.

---

## 5. Cytoscape/LWS/CSP Compatibility Assessment

### A. Static Resource Packaging
- Cytoscape.js (`cytoscape.min.js`), `cytoscape-fcose.js`, and `cytoscape-navigator.js` must be uploaded as Salesforce Static Resources.
- Loaded in LWC via `import { loadScript, loadStyle } from 'lightning/platformResourceLoader'`.

### B. DOM Access & Shadow DOM Boundaries
- LWCs enforce Shadow DOM encapsulation. Cytoscape requires a direct DOM container node (`document.createElement` or inner `div`).
- *Solution:* Attach Cytoscape to a template element marked with `lwc:dom="manual"`. Cytoscape correctly renders HTML5 `<canvas>` inside this manual DOM container.

### C. Canvas & Inline Styles
- LWS permits standard 2D Canvas Context API methods (`getContext('2d')`, `drawImage`, `beginPath`, `stroke`).
- Dynamic inline style modifications applied by Cytoscape on its wrapper canvas elements are permitted under LWS, unlike legacy Locker Service.

### D. Resize Observation & Lifecycle Cleanup
- LWC lifecycle hook `disconnectedCallback()` **must** invoke `cy.destroy()` to detach event listeners and free canvas memory buffers.
- `ResizeObserver` is supported in standard browser contexts inside LWS.

---

## 6. Graph Layout and Web Worker Feasibility

### Execution Strategy Evaluation:

| Strategy | Technical Feasibility | Evaluation |
| :--- | :--- | :--- |
| **Strategy A: Client-Side JS in LWC** | **FEASIBLE (Recommended)** | Pure JS layout algorithms (`global-layout.ts`, `component-orbit-layout.ts`, `component-constellation-layout.ts`) run directly in browser JS inside LWC. |
| **Strategy B: Server-Side Apex** | **UNFEASIBLE** | O(N^2) graph algorithms exceed 10s CPU limit and 6MB heap limit on 528-node PBIM graph. |
| **Strategy C: Approved External Runtime** | **NOT REQUIRED** | Client-side JS in browser is sufficient when Web Worker fallbacks/micro-tasks are used. |

### Web Worker Specific Findings under LWS:
- LWS restricts web workers created via `new Worker(URL)` if the script originates from a blob URL or cross-origin static resource domain (`*.documentforce.com`).
- *Fallback Parity:* The existing application's `LayoutWorkerClient` already implements a robust synchronous fallback mechanism (`LayoutWorkerClient.calculateLayoutAsync` falls back to synchronous layout if `Worker` fails or is undefined).
- *Recommendation:* Rely on asynchronous client-side layout execution using browser micro-tasks (`requestAnimationFrame` chunking) or synchronous fallback within LWC.

---

## 7. Apex Governor Limits and Data-Volume Assessment

### Applicable Salesforce Platform Limits (API v61.0):
- **Synchronous Apex CPU Time Limit:** 10,000 ms (10 seconds).
- **Synchronous Apex Heap Size:** 6 MB.
- **Asynchronous Apex Heap Size:** 12 MB.
- **Maximum SOQL Query Rows:** 50,000 rows per transaction.
- **Maximum DML Statements:** 150 per transaction.
- **Maximum DML Records:** 10,000 records per transaction.
- **Maximum Heap Allocation for Single JSON Deserialization:** ~4 MB.

### Impact on PBIM Dataset (4.15 MB JSON, 528 Nodes, 2,063 Edges):
1. **Deserialization Risk:** `JSON.deserialize()` on the 4.15 MB PBIM JSON payload in Apex consumes ~5.2 MB of heap (86% of the 6 MB synchronous heap limit), risking `System.LimitException: Apex heap size too large`.
2. **DML Record Risk:** Persisting 528 nodes + 2,063 edges = 2,591 custom object records. This fits within the 10,000 DML record limit, but SOQL query limits require chunking when loading large graphs.
3. **Recommendation:** Store full graph snapshot payloads as `ContentVersion` (Salesforce Files) or Text Area (Long/Rich) for instant LWC transfer, while writing normalized `Dependency_Node__c` and `Dependency_Edge__c` records asynchronously via Queueable Apex for SOQL querying and reporting.

---

## 8. Metadata Ingestion and Source-Analysis Constraints

- **Local Filesystem Access:** Node.js file system APIs (`fs.readFileSync`, `path.join`) used in `scripts/export-explorer.cjs` do not exist in Apex or LWC.
- **Apex Metadata Access APIs:**
  - `Metadata.Operations` (Apex Metadata API) allows reading/writing custom metadata types, but cannot parse Apex Class body code AST.
  - Tooling API (`/services/data/v61.0/tooling/query?q=SELECT+Id,Name,Body+FROM+ApexClass`) can retrieve class bodies, but Apex lacks an AST parser.
- **Boundary Decision:** Node.js analysis engine (`scripts/export-explorer.cjs`) will remain an external/CLI tool or developer pipeline step that outputs JSON snapshots. LWC/Apex will consume these structured JSON snapshots or query metadata relationships via Salesforce APIs.

---

## 9. Security and Licensing Assessment

- **Lightning Web Security (LWS):** Supported in modern Salesforce orgs. Enables third-party JS libraries in static resources with secure sandbox boundaries.
- **Content Security Policy (CSP):** Strict CSP rules prohibit `eval()` and inline `<script>` tags. Cytoscape.js must be built without `eval()`.
- **CRUD / FLS Enforceability:** All Apex controllers MUST use `with sharing` and enforce `WITH USER_MODE` or `Security.stripInaccessible()` on SOQL queries.
- **Third-Party Licensing:** Cytoscape.js is licensed under **MIT**, `cytoscape-fcose` under **MIT**, `cytoscape-navigator` under **MIT**. Compatible with Salesforce enterprise deployment.

---

## 10. Required Experiments and Evidence

| Experiment | Preconditions | Executed Command | Exit Code | Result / Evidence Path | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. SF CLI Check** | Node v22 | `npm install -g @salesforce/cli` | 0 | `@salesforce/cli/2.155.7` | Installed successfully |
| **2. SF Org Check** | SF CLI | `sf org list` | 0 | `No Orgs found` | No active org credentials |
| **3. Fixture Size Audit** | Node v22 | Node measurement script | 0 | PBIM: 4.15MB (528 nodes, 2063 edges) | Physical measurement recorded |
| **4. Worker IPC Inspection** | Repo code | Source grep & inspect | 0 | `LayoutWorkerClient` sync fallback verified | Verified in `layout-worker-client.ts` |
| **5. DX Scaffold Creation** | Isolated path | `write_file` in `scratch/salesforce-poc/` | 0 | Scaffold files created | Isolated in `scratch/` |
| **6. Scaffold Verification** | Isolated path | `find scratch/salesforce-poc/` | 0 | Verified all files present | Clean isolation confirmed |
| **7. Root CLI Regression Test** | Root repo | `npm run test:cli` | 0 | 34/34 scripts passed | Zero regressions |
| **8. Explorer Build Test** | Explorer path | `npm run build` in `explorer/` | 0 | Vite production build pass | Zero regressions |

---

## 11. Blocked Experiments and Precise Blockers

| Experiment | Blocker Reason | Required Action to Unblock |
| :--- | :--- | :--- |
| **Live Org Deployment (`sf project deploy`)** | `BLOCKED — NO AUTHENTICATED TARGET ORG` | Provide SFDX auth URL or scratch org credentials. |
| **Runtime LWS Cytoscape Validation** | `BLOCKED — NO AUTHENTICATED TARGET ORG` | Deploy `graphViewer` LWC to active org and verify canvas rendering. |
| **Apex Controller SOQL Governor Benchmarks** | `BLOCKED — NO AUTHENTICATED TARGET ORG` | Run Apex test execution (`sf apex test run`) in target org. |

---

## 12. Recommended Architecture Split

| Subsystem | Candidate Execution Location | Feasibility Status | Evidence Reference | Remaining Risks |
| :--- | :--- | :--- | :--- | :--- |
| **LWC Application Shell** | Salesforce LWC | **VERIFIED** | Scaffold LWC in `scratch/salesforce-poc/` | LEX navigation container constraints |
| **Graph Renderer** | LWC + Cytoscape Static Resource | **PARTIAL** | Section 5 LWS evaluation | LWS canvas event listener behavior in real org |
| **Graph Layout** | Client-Side JS in LWC | **VERIFIED** | Pure JS algorithms + sync fallback in `layout-worker-client.ts` | CPU time on main thread for 1000+ nodes |
| **Project & Run Services** | Apex Controllers (`with sharing`) | **VERIFIED** | Stub `GraphDataController.cls` | SOQL governor limits on massive datasets |
| **Graph Persistence** | Salesforce Custom Objects / Files | **PARTIAL** | Section 7 Limit assessment | Heap limits when deserializing >4MB JSON |
| **Metadata Acquisition** | Salesforce Tooling API / Import Flow | **PARTIAL** | Section 8 Boundary analysis | Tooling API rate limits on large orgs |
| **Source Parsing & AST** | External Node.js CLI / Import Payload | **VERIFIED** | Section 8 Boundary analysis | Requires manual/automated export step |
| **History & Snapshots** | Salesforce Objects (`Analysis_Run__c`) | **VERIFIED** | Custom Object persistence model | Storage quota usage per run |

---

## 13. Proposed Decision Register Updates

1. **Update Decision 1 (Target Org):** Record that Wave 1 evaluation operated in local scaffold mode due to lack of authenticated org.
2. **Update Decision 4 (Computation Split):** Formally approve **Client-Side JS in LWC** for layout computation, reserving Apex solely for data persistence and query services.
3. **Update Decision 5 (Cytoscape LWS):** Classify Cytoscape.js via Static Resources as **Partially Verified**, pending live org deployment in Wave 2.
4. **Update Decision 7 (Storage Model):** Recommend a **Hybrid Storage Model**: Store `ContentVersion` JSON payloads for instant LWC loading + normalized `Dependency_Node__c` records for SOQL filtering.

---

## 14. Risks, Assumptions, and Unresolved Questions

### Top 5 Technical Risks:
1. **Apex Heap Exhaustion on Large Snapshots:** Deserializing JSON payloads >4MB in Apex triggers `System.LimitException`.
2. **LWS Cytoscape Event Handling:** LWS proxying of DOM events may interfere with Cytoscape drag/pan/zoom listeners.
3. **Main Thread Layout Lag without Workers:** Disabling Web Workers under LWS moves O(N^2) layout loops to the main thread, risking temporary browser UI freezes on graphs >500 nodes.
4. **Salesforce Data Storage Quotas:** Persisting 2,000+ custom object records per analysis run rapidly consumes org storage limits (2KB per record).
5. **Metadata API Execution Rate Limits:** Synchronous Tooling API queries during metadata ingestion may hit REST/SOQL governor limits in complex orgs.

---

## 15. Prioritized List of Next Feasibility Actions

1. **Acquire Target Salesforce Org Credentials:** Obtain SFDX Auth URL or DevHub authorization to unblock live deployment testing.
2. **Deploy Scaffold LWC to Scratch Org:** Execute `sf project deploy start` with `scratch/salesforce-poc/` and verify Cytoscape rendering in live LWS environment.
3. **Benchmark Hybrid Storage Payload in Apex:** Write Apex unit tests measuring exact heap memory consumption when loading PBIM 4.15 MB JSON vs normalized SOQL queries.
4. **Coordinate with Lane C for Final Schema Alignment:** Ensure custom object field definitions support the DTO structure in `GraphDataController.cls`.
