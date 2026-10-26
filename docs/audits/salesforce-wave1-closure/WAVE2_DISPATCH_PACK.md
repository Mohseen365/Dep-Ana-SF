# Wave 2 Dispatch Pack

**Audit Context:** Dependency Analyzer Salesforce Migration — Wave 1 Integration & Readiness Audit
**Auditor:** Jules Salesforce Migration Coordinator
**Date:** October 2026
**Status:** READY WITH EXPLICIT BLOCKERS

---

## 1. Executive Summary & Wave 2 Strategy

Wave 2 transitions the Salesforce Dependency Analyzer migration from research and audit into structured, parallel implementation. To maintain strict repository safety and prevent cross-workstream regression, Wave 2 is structured into **6 isolated, parallel workstreams (Lanes A–F)** with strictly partitioned read/write file boundaries and explicit dependency sequencing.

**Wave 2 Final Gate Status:** **`READY WITH EXPLICIT BLOCKERS`**
* **Offline Development (Lanes A–D, F):** Fully cleared to proceed in `scratch/salesforce-poc/` using offline Apex static analysis, local LWC scaffolding, Vitest, and CLI verification.
* **Org Deployment & End-to-End Validation (Lane E & Org Deployments):** **`BLOCKED`** pending provision of an authenticated Salesforce target org / Dev Hub.

---

## 2. Non-Overlapping Writes Policy

To prevent merge conflicts and state corruption across concurrent workstreams:
1. Each workstream is assigned exclusive write access to its designated folder/file tree.
2. Cross-workstream modifications are strictly prohibited unless explicitly reviewed and merged by the Integration Owner / Coordinator.
3. Shared contracts (`DAGraphDTO.cls` and object schema metadata) are governed by Lane A; other lanes must treat them as read-only interfaces.

---

## 3. Workstream Definitions & Responsibility Matrix

### Lane A: Architecture, Schema & DTO Contract Authority
* **Primary Scope:** Finalizing custom object metadata, field definitions, Apex DTO contracts, and error response schemas.
* **Exclusive Write Scope:**
  * `scratch/salesforce-poc/force-app/main/default/objects/`
  * `scratch/salesforce-poc/force-app/main/default/classes/dto/`
* **Dependencies:** None (Base contract provider).
* **Deliverables:**
  * `DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, `DA_Annotation__c`, `DA_User_Preference__c` `.object-meta.xml` definitions.
  * `DAGraphDTO.cls` (TypeScript/Apex parity interface).
  * `DAErrorResponse.cls` (Standardized error envelope).
* **Offline Readiness:** `READY` (Local XML metadata and Apex class files).

### Lane B: Salesforce Ingestion & Persistence Services
* **Primary Scope:** Apex service layer and `DAGraphController` SOQL queries, ingestion endpoints, and project metadata operations.
* **Exclusive Write Scope:**
  * `scratch/salesforce-poc/force-app/main/default/classes/controllers/`
  * `scratch/salesforce-poc/force-app/main/default/classes/services/`
* **Dependencies:** Lane A DTOs and Object Schema.
* **Deliverables:**
  * `DAGraphController.cls` (`@AuraEnabled` endpoints for project list, active project retrieval, run metadata).
  * `DAGraphIngestionService.cls` (REST/Apex payload ingestion).
* **Offline Readiness:** `READY` (Apex source code creation and `sf` static analysis).

### Lane C: Lightning Web Component Graph Renderer
* **Primary Scope:** Scaffolding the `daGraphViewer` LWC, Cytoscape.js static resource integration, and core DOM layout rendering.
* **Exclusive Write Scope:**
  * `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/`
  * `scratch/salesforce-poc/force-app/main/default/staticresources/`
* **Dependencies:** Lane A DTOs.
* **Deliverables:**
  * `daGraphViewer` LWC component (`.html`, `.js`, `.js-meta.xml`, `.css`).
  * `cytoscape.min.js` static resource bundle.
  * Synchronous LWC main-thread layout engine fallback.
* **Offline Readiness:** `READY` (LWC source code and static resources).

### Lane D: Governor Limit, Payload Chunking & Transport Validation
* **Primary Scope:** Implementation of chunked Base64 payload transport (`DA_Graph_Chunk__c`) and client-side streaming JSON parsing.
* **Exclusive Write Scope:**
  * `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphChunkService.cls`
  * `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/payloadLoader.js`
* **Dependencies:** Lane A & Lane B.
* **Deliverables:**
  * Base64 payload chunking service for graphs >3.5 MB.
  * LWC chunk reassembly module.
* **Offline Readiness:** `READY`.

### Lane E: Security, Tenant Isolation & Compliance Acceptance
* **Primary Scope:** Crafting Apex unit test suite verifying `WITH USER_MODE`, CRUD/FLS enforcement, multi-tenant `DA_Project__c` isolation, and malformed payload resilience.
* **Exclusive Write Scope:**
  * `scratch/salesforce-poc/force-app/main/default/classes/tests/`
* **Dependencies:** Lanes A, B, C, D.
* **Deliverables:**
  * `DAGraphControllerTest.cls` (100% code coverage target).
  * `DAGraphSecurityTest.cls` (Cross-project leakage and `runAs` testing).
* **Offline Readiness:** `BLOCKED_FOR_DEPLOYMENT` (Tests can be authored offline, but execution requires an authenticated Salesforce org).

### Lane F: React Explorer Baseline & Regression Verification
* **Primary Scope:** Monitoring existing React explorer CLI test suites (`npm run test:cli`) and ensuring no source regressions during Wave 2.
* **Exclusive Write Scope:**
  * `docs/audits/salesforce-wave1-closure/`
* **Dependencies:** Read-only monitor of `explorer/`.
* **Deliverables:**
  * Regression audit logs and verification reports.
* **Offline Readiness:** `READY` (Fully executable locally).

---

## 4. Entry Gate Checklist

| Gate Item | Target / Requirement | Verification Method | Status | Owner Role |
| :--- | :--- | :--- | :--- | :--- |
| **1. Reports Reconciled** | All 4 Wave 1 reports cross-checked and audit deliverables produced | Verification of `docs/audits/salesforce-wave1-closure/` | `PASSED` | Coordinator |
| **2. Environment Verified** | Node v22, npm 11, JDK 21, `sf` CLI 2.155, Playwright Chromium v1248 | Executed verification scripts in Phase 1 | `PASSED` | Environment Lead |
| **3. Baseline Tests Executed** | 34/34 root CLI tests passing; build clean; 4 pre-existing Vitest failures documented | Executed `npm run test:cli` & `npm run build` | `PASSED` | QA Lead |
| **4. Payload Bounds Reconciled** | Chunking strategy defined for >3.5 MB payloads; Apex heap limit modeled (<12 MB) | Conservative resource model in audit report | `PASSED` | Lead Architect |
| **5. Canonical Schema Approved** | `DA_*` custom object naming map approved | Decision Register DEC-03 | `PROPOSED` | Salesforce Architect |
| **6. Write Boundaries Enforced** | Non-overlapping folder trees defined for Lanes A–F | Wave 2 Dispatch Pack Section 3 | `PASSED` | Integration Owner |
| **7. Salesforce Target Org** | Authenticated Dev Hub or Scratch Org available for deployment | `sf org display` | `BLOCKED` | Product Owner / Admin |

---

## 5. Next Steps for Project Owner

To transition Wave 2 from **`READY WITH EXPLICIT BLOCKERS`** to full execution:
1. **Approve Architecture Proposals:** Review and approve the proposed canonical schema and hybrid chunking strategy in `WAVE1_DECISION_REGISTER.md`.
2. **Provide Salesforce Target Org:** Authorize or provision a Salesforce Scratch Org / Dev Hub and complete `sf org login web` or JWT auth to unblock Lane E deployment and runtime testing.
