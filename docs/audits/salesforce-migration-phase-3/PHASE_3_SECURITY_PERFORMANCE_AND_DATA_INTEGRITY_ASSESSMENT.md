# Phase 3 Deliverable 13: Security, Performance & Data Integrity Assessment

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY AUDIT & VERIFICATION

---

## 1. Executive Summary

This assessment evaluates the Salesforce architecture against platform governor limits, data security policies, and client-side performance boundaries.

---

## 2. Apex Governor Limits & Backend Feasibility

### 2.1 Heap Size & Ingestion Limits
- **Salesforce Synchronous Heap Limit:** 6 MB.
- **Asynchronous Heap Limit:** 12 MB.
- **Architectural Boundary Enforcement:** The application limits individual chunk records (`DA_Graph_Chunk__c.Chunk_Data__c`) to **131,072 characters** (matching the LongTextArea field capacity).
- **Ingestion Pipeline:** Large graph payloads (>10 MB) are chunked prior to ingestion and saved in batches of 10 chunks per transaction. This prevents exceeding the 6 MB synchronous heap during DML operations.
- **AST Parsing Boundary:** Full AST extraction is intentionally retained in Node.js CLI. Attempting to parse TypeScript ASTs in Apex would trigger Apex CPU time limits (10s synchronous) and heap overflow.

### 2.2 SOQL Query Limits
- **SOQL Query Limit:** 100 queries per synchronous transaction.
- **Retrieval Design:** `DAGraphController.getGraphChunks` queries chunks using a single bounded SOQL query:
  ```apex
  SELECT Chunk_Index__c, Chunk_Data__c
  FROM DA_Graph_Chunk__c
  WHERE Analysis_Run__c = :runId
  ORDER BY Chunk_Index__c ASC
  LIMIT 10 OFFSET :startIndex
  ```
- Reassembly is performed client-side in `daGraphPayloadLoader.js`. This consumes exactly 1 SOQL query per batch and avoids holding large multi-megabyte payloads in Apex heap.

---

## 3. Client-Side Performance & Cytoscape Scalability

### 3.1 DOM & Canvas Rendering Limits
- Cytoscape canvas handles up to **2,500 nodes and 5,000 edges** at acceptable frame rates (~60 FPS) in modern desktop browsers.
- When graph size exceeds 1,500 nodes, Level of Detail (LOD) node label suppression and simplified edge rendering must be engaged to prevent browser tab sluggishness.
- In Wave 8 (Compare Mode), holding two complete Cytoscape instances simultaneously in the DOM could consume >400 MB of browser memory. The diff view must share a single Cytoscape instance with color-coded diff overlays rather than dual active canvas instances.

### 3.2 ViewState & Preference Field Limits
- Preference storage fields in `DA_User_Preference__c` (`Filters_JSON__c`, `Positions_JSON__c`, `Zoom_Pan_JSON__c`) have a hard capacity of **131,072 characters**.
- Tests in `run-poc-tests.cjs` and `run-lane-a-schema-tests.cjs` verify that client serialization enforces this boundary and safely truncates or fails-closed without corrupted partial JSON writes.

---

## 4. Security, CRUD/FLS & Tenant Isolation

### 4.1 Apex Security Review
- **User Mode Queries:** All queries in `DAGraphController.cls`, `DAUserPreferenceController.cls`, and `DAAnnotationController.cls` enforce `WITH USER_MODE`.
- **User Isolation:** `DAUserPreferenceController` binds queries to `UserInfo.getUserId()`:
  ```apex
  SELECT Id, Filters_JSON__c, Positions_JSON__c, Zoom_Pan_JSON__c
  FROM DA_User_Preference__c
  WHERE User__c = :UserInfo.getUserId() AND Project__c = :projectId
  WITH USER_MODE
  LIMIT 1
  ```
  This guarantees that preferences, saved positions, and filter presets never leak across users.

### 4.2 Cross-Project Isolation
- Presets stored in `Filters_JSON__c` enforce `projectId` matching in `daFilterSchema.js` (DEC-W4-03).
- Offline integration test #15 (`run-wave4-integration-suite.cjs`) confirms that presets belonging to a different project or lacking project scoping are stripped during deserialization.

### 4.3 Error Handling & Information Disclosure
- Custom exception handling returns sanitized error responses via `DAErrorResponse.cls`. Internal database exception stack traces and SOQL query texts are not exposed to the client.
