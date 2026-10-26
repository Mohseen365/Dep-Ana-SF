# Wave 1 Decision Register

**Audit Context:** Dependency Analyzer Salesforce Migration — Wave 1 Integration & Decision Closure Audit
**Auditor:** Jules Salesforce Migration Coordinator
**Date:** October 2026
**Status:** PROPOSED FOR ARCHITECTURE & PRODUCT OWNER APPROVAL

---

## Decision Matrix Summary

| Decision ID | Decision Subject | Source / Evidence | Recommended Disposition | Alternatives Considered | Risk & Consequences | Required Approver | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | **Authoritative Analysis Engine Location** | Feasibility §3, Data Model §2 | **Node.js Snapshot Offload** (Node.js engine remains authoritative source; generated snapshots uploaded to Salesforce) | Re-implementing parser & analysis engine in Apex. | **Low Risk.** Avoids Apex CPU/heap governor limits during graph generation. Requires Node.js CI pipeline trigger. | Lead Architect | `P0` | `PROPOSED` |
| **DEC-02** | **Graph Payload Storage & Transport Strategy** | Baseline Report §4.3, Feasibility §2, Data Model §3 | **Hybrid Single-Record / Multi-Chunk Strategy** (<3.5 MB in `ContentVersion`/`Graph_Payload__c`; >3.5 MB chunked via `DA_Graph_Chunk__c`) | Pure Apex SObject normalized graph records (528 nodes + 2063 edges = 2591 SObject records per run). | **Medium Risk.** Protects Apex synchronous heap limit (<12 MB) during transfer. Client LWC handles JS JSON deserialization. | Salesforce Architect | `P0` | `PROPOSED` |
| **DEC-03** | **Canonical Salesforce Schema Naming Strategy** | Data Model §3, Baseline Report §4 | **Adopt `DA_*` Custom Objects & Controllers** (`DA_Project__c`, `DA_Analysis_Run__c`, `DA_Finding__c`, `DA_Annotation__c`, `DA_User_Preference__c`, `DAGraphController`) | Unprefixed objects or reusing `Analysis_Run__c` without namespace. | **Low Risk.** Establishes clean, non-conflicting package schema foundation. | Salesforce Architect | `P0` | `PROPOSED` |
| **DEC-04** | **Project Isolation & Security Enforcement** | Data Model §4 | **Enforce `WITH USER_MODE` SOQL & Mandatory `project_id` Scope** | Enforcing CRUD/FLS via `Schema.sObjectType` manual checks only. | **High Risk if unvalidated.** Ensures multi-tenant isolation and prevents cross-project leak. Requires org-dependent security test suite. | Security Lead | `P0` | `PROPOSED` |
| **DEC-05** | **Graph Layout Engine & LWS Rendering Strategy** | Feasibility §4, Data Model §5 | **Cytoscape.js Static Resource with `lwc:dom="manual"` and Synchronous Layout Fallback** | Web Worker offload inside LWC (blocked by LWS worker isolation). | **Medium Risk.** Main-thread layout execution may block UI for graphs >1,000 nodes. Acceptable for PBIM (528 nodes). | Frontend Lead | `P0` | `PROPOSED` |
| **DEC-06** | **Wave 2 Scope Boundary for React Parity** | Parity Matrix §3, Decision Register §1 | **Focus Wave 2 on P0 Core Architecture Features** (Constellation/Orbit views, selection, depth filter, search) | Mandating 100% P0/P1/P2 parity (39 features) in first milestone. | **Low Risk.** Bounds Wave 2 deliverables; defers refactoring simulation and satellite crossing optimization to Wave 3. | Product Owner | `P0` | `PROPOSED` |
| **DEC-07** | **Explorer Baseline Test Failures Scope Boundary** | Baseline Report §3, Vitest Test Run | **Classify 4 Vitest Failures as Pre-Existing Non-Blockers** (URL query, debounced filter, active project switching) | Halting Salesforce migration to fix pre-existing React explorer state tests. | **Low Risk.** Verified pre-existing in baseline checkout. Isolated from Salesforce Apex/LWC code. | QA Lead / Integration Owner | `P1` | `ACCEPTED BY EXISTING EVIDENCE` |
| **DEC-08** | **Wave 2 Entry Gate Disposition** | Wave 0 Coordinator Report, Wave 1 Audit | **`READY WITH EXPLICIT BLOCKERS`** (Proceed with offline Apex/LWC development; block org deployment until credentials provided) | Postponing all Wave 2 work until Salesforce org is authenticated. | **Low Risk.** Maximizes offline development velocity while maintaining strict safety gate on deployment. | Coordinator / Product Owner | `P0` | `ACCEPTED BY EXISTING EVIDENCE` |

---

## Detailed Decision Records

### DEC-01: Authoritative Analysis Engine Location
* **Unresolved Question:** Should Apex re-implement dependency parsing and analysis, or remain an ingestion/visualization boundary?
* **Evidence:** Feasibility §3 demonstrates Apex regex and string parsing on multi-megabyte source code exceeds 10-second CPU time limits and 12 MB heap limits.
* **Recommended Disposition:** Node.js analysis pipeline remains authoritative. It emits `explorer-data.json` / `analysis-snapshot.json`, which is ingested into Salesforce via REST API or `sf` CLI.
* **Validation Required:** Ingestion API schema validation test.

### DEC-02: Graph Payload Storage & Transport
* **Unresolved Question:** How to safely transfer 4.25 MB JSON payloads into Apex without heap exhaustion?
* **Evidence:** Synchronous Apex heap limit is 12 MB. Parsing a 4.15 MB JSON string via `JSON.deserializeUntyped()` creates ~10–14 MB of object overhead.
* **Recommended Disposition:** Store JSON as `ContentVersion` file attachment. Apex queries `VersionData` as Blob or Base64 chunks without deserializing JSON into Apex objects. LWC fetches Base64 chunks via LWC wire/Apex and parses JSON directly in the browser JavaScript engine (V8/LWS).
* **Validation Required:** LWC payload retrieval benchmark for 528-node / 2,063-edge graph.

### DEC-03: Canonical Object & Service Naming Map
* **Unresolved Question:** Reconcile contradictory object names across reports (`Analysis_Run__c` vs `DA_Analysis_Run__c`).
* **Recommended Disposition:** Standardize on `DA_` prefix for all custom objects:
  * `DA_Project__c` (Project metadata & isolation authority)
  * `DA_Analysis_Run__c` (Run metadata, commit hash, node/edge counts)
  * `DA_Graph_Chunk__c` (Chunked graph payload storage)
  * `DA_Finding__c` (Hotspots, debt, governance violations)
  * `DA_Annotation__c` (User notes & node tags)
  * `DA_User_Preference__c` (User-specific UI state)
  * Controller: `DAGraphController`
  * DTO: `DAGraphDTO`
* **Validation Required:** Apex static type check (`sf project deploy validate`).

### DEC-04: Security & Tenant Isolation
* **Unresolved Question:** How to prevent cross-project or cross-user data leakage?
* **Recommended Disposition:**
  * All SOQL queries in `DAGraphController` must include `WITH USER_MODE` and explicit `WHERE DA_Project__c = :projectId`.
  * Findings and annotations inherit sharing from `DA_Project__c` via Master-Detail.
  * User preferences use `OwnerId = :UserInfo.getUserId()`.
* **Validation Required:** Apex unit tests executing under `System.runAs(restrictedUser)`.

### DEC-05: Cytoscape & LWS Rendering
* **Unresolved Question:** Can Cytoscape.js run cleanly under Lightning Web Security?
* **Evidence:** LWS restricts Web Worker instantiation and direct DOM manipulation.
* **Recommended Disposition:**
  * Load Cytoscape.js via `lightning/platformResourceLoader` from Static Resource.
  * Attach canvas using `lwc:dom="manual"` container.
  * Run layout algorithms on LWC main thread with synchronous fallback.
* **Validation Required:** Real-org LWS DOM container smoke test.
