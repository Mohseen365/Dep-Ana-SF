# Phase 0 Project Owner Decision Readiness & Verification (Corrected)

## Document Metadata
- **Classification**: Phase 0 Executive Decision Prerequisites Verification
- **Audit Date**: 2026-11-10 (Correction Pass)
- **Auditor**: Jules Master Dispatch & Coordination Agent (Integration Coordinator D1 / Verifier D2)
- **Status**: READINESS CONFIRMED — AWAITING PROJECT OWNER RATIFICATION

---

## 1. Executive Summary & Historical Approval Reconciliation

This review evaluates the six Project Owner decisions documented in `MASTER_GAP_PROJECT_OWNER_DECISIONS_V2.md`. In strict adherence to governance:
- **Historical Ratifications Preserved**: `PO-REQ-01` through `PO-REQ-05` (ratified on 2026-11-10) already approved the Dual-Snapshot & Diff Engine (`CONTRACT-05` / `REM-03`), Pure SVG Dependency River (`REM-02`), and URL synchronization (`REM-04`). Re-requesting authorization for their implementation or basic algorithmic structure would be redundant.
- **New Executive Decisions**: The six decisions detailed below represent **genuinely new architectural, security, schema, and scope choices** that require explicit Project Owner approval before implementation code can be merged in Phase 1.
- **Strict Separation of Powers**: Neither Jules nor Coordinator D1 possesses the authority to approve these decisions. Phase 0 prepares the complete technical briefs, governor-limit analyses, and error semantics so the Project Owner can make informed, decisive determinations.

---

## 2. Comprehensive Review of the Six Project Owner Decisions

### PO-DEC-V2-01 — Apex REST Ingestion Transport Architecture & Endpoint URL

#### Technical Verification & Architecture:
- **Affected Gaps**: GAP-ING-01, GAP-ING-02
- **Endpoint Structure**: `@RestResource(urlMapping='/da/v1/ingest/*')` exposing `DAGraphIngestionRestResource.cls`.
  - Sub-resources:
    - `POST /da/v1/ingest/projects`: Create or resolve project context.
    - `POST /da/v1/ingest/runs`: Initialize an analysis run in `CREATED` state.
    - `POST /da/v1/ingest/chunks`: Ingest batched graph chunks.
    - `POST /da/v1/ingest/runs/{runId}/finalize`: Finalize and trigger validation transition.
- **Authentication & Authorization Model**: Enforces standard Salesforce OAuth 2.0 (JWT Bearer Token / Connected App). Execution context runs strictly `with sharing` and enforces `WITH USER_MODE` or `Security.stripInaccessible` on all DML.
- **Request / Response DTOs**:
  - Request: `IngestionChunkBatchRequest` (`runId`, `projectId`, `chunkIndex`, `totalChunks`, `chunkData`, `chunkKey`).
  - Response: `IngestionChunkBatchResponse` (`success`, `chunksReceived`, `runStatus`, `message`).
- **Error Semantics & Status Codes**:
  - `400 Bad Request`: Payload validation failure, invalid chunk sequence, or chunk exceeding 131,072 UTF-16 code units.
  - `401 Unauthorized / 403 Forbidden`: Insufficient object/field permissions or cross-project access attempt.
  - `409 Conflict`: Duplicate conflicting chunk submitted or run already finalized (`AVAILABLE`).
  - `413 Payload Too Large`: Total accumulated payload exceeds 10,485,760 UTF-16 code units.
  - `500 Internal Error`: Unhandled transaction exception; rolls back partial batch via savepoint.
- **Retry & Idempotency Behavior**: Chunk ingestion requests include deterministic `chunkKey` (`{runId}_{chunkIndex}`). Re-submitting an identical payload for an existing `chunkKey` returns `200 OK` (idempotent success). Submitting a different payload for an existing key returns `409 Conflict`.

#### Mandatory Ingestion & Apex Heap Accounting (Correction 1):
The distinction between character lengths, wire representations, and runtime memory is critical. The following units must not be conflated:
1. **UTF-16 Code Units**: Salesforce Apex `String.length()` counts UTF-16 code units. Max chunk size = 131,072 UTF-16 code units. Max run payload cap = 10,485,760 UTF-16 code units (80 chunks).
2. **UTF-8 Encoded Bytes**: Multi-byte characters in AST node labels or identifiers consume 1 to 4 bytes per character over the wire.
3. **HTTP Request Bytes**: The multipart/JSON HTTP body includes headers, JSON framing, escaping, and DTO overhead. A 10-chunk batch HTTP payload is estimated between 1.35 MB and 2.8 MB depending on character escaping.
4. **Apex Heap Consumption**: Apex stores Strings as 16-bit characters. In addition to string buffers, deserializing JSON into DTOs allocates object headers, field references, and temporary string copies. The total heap footprint is substantially higher than the raw string size:
   - Request body extraction: `RestContext.request.requestBody.toString()` allocates heap for raw body.
   - JSON deserialization: `JSON.deserialize()` or custom parser allocates DTO instances + string primitives.
   - SObject allocation: `DA_Graph_Chunk__c` record instantiation allocates further heap.
   - Heap Peak: Peak heap during a 10-chunk batch is statically estimated between 3.5 MB and 5.2 MB.
5. **Salesforce Governor Limits**:
   - Synchronous Apex transaction heap limit: **6 MB** (6,291,456 bytes).
   - Asynchronous Apex transaction heap limit: **12 MB** (12,582,912 bytes).
   - Maximum HTTP request body size: **6 MB**.

#### Evidence Classification of Heap Claims:
- **Raw string size is safe (< 1.31 MB for 10 chunks)**: `STATICALLY ESTIMATED` (Confirmed by arithmetic).
- **Node.js offline simulator handles 10 chunks**: `LOCALLY SIMULATED` (Simulated in V8 runtime, not Apex).
- **Actual Apex runtime heap safety under 6 MB synchronous limit**: **`NOT VERIFIED`** (Requires live Salesforce org execution and Apex profiling with real multi-chunk payloads).
- **Governor Limit Safety**: **`NOT VERIFIED`** (Cannot be certified until live staging org execution in Phase 1 by Agent 10).
- **Mitigation Directive**: In Phase 1, Agent 2 & Agent 3 must implement batch chunk size configurability (e.g., dynamically downscaling from 10 chunks to 5 chunks if heap profiling exceeds 4 MB).

- **Readiness Classification**: **READY FOR PROJECT OWNER APPROVAL** (Option A Recommended).

---

### PO-DEC-V2-02 — Private OWD and Permission Revocation

#### Technical Verification & Security Boundaries:
- **Affected Gaps**: GAP-SEC-01, GAP-SEC-02
- **Existing Metadata Flaw**:
  - `DA_Project__c.object-meta.xml` currently defines `<sharingModel>ReadWrite</sharingModel>`.
  - `DA_Architecture_Analyst.permissionset-meta.xml` grants `<viewAllRecords>true</viewAllRecords>` across all custom objects (`DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Annotation__c`, `DA_Finding__c`, `DA_User_Preference__c`).
  - This allows any user with the analyst permission set to view and manipulate projects across tenant boundaries, completely violating project isolation.
- **Proposed Security Architecture**:
  - Change `DA_Project__c` sharing model to `Private`.
  - Set child object sharing models (`DA_Analysis_Run__c`, `DA_Annotation__c`, `DA_Finding__c`) to `ControlledByParent` via Master-Detail or programmatic row-level sharing.
  - Remove `<viewAllRecords>true</viewAllRecords>` and `<modifyAllRecords>true</modifyAllRecords>` from `DA_Architecture_Analyst.permissionset-meta.xml`.
  - Implement project membership via `DA_Project_Member__c` or Apex Managed Sharing (`DA_Project__Share`) granting Read or Edit access based on explicit project assignment.
- **CRUD / FLS & Existing Access Migration**:
  - Permission set retains `<fieldPermissions>` (29 custom fields) and object-level Read/Create/Edit/Delete, but relies on record-level sharing for record visibility.
  - A post-install / migration Apex script shares existing projects with creator users to prevent loss of access upon flipping OWD to Private.
- **Rollback & Recovery**: Metadata changes can be reverted via source deploy if access contention is observed in sandbox testing.
- **Readiness Classification**: **READY FOR PROJECT OWNER APPROVAL** (Option A Recommended).

---

### PO-DEC-V2-03 — Run Lifecycle & Chunk Uniqueness Schema

#### Technical Verification & State Machine:
- **Affected Gaps**: GAP-ING-03, GAP-ING-04, GAP-ING-05
- **Formal Lifecycle States**:
  - `CREATED`: Run record instantiated by client; no chunks accepted yet.
  - `UPLOADING`: Chunks actively being streamed and saved.
  - `VALIDATING`: All chunks received; checksum and sequence verification in progress.
  - `AVAILABLE`: Run validated, finalized, and immutable; visible to application shell and queries.
  - `FAILED`: Validation checksum mismatch, sequence timeout, or payload cap violation.
  - `EXPIRED`: Run superseded or garbage collected.
- **Critical Invariants & Defense**:
  - **Availability Gate**: Queries in `DAGraphController.getLatestGraphMetadataForProject` MUST filter `WHERE Status__c = 'AVAILABLE'`. In-flight (`UPLOADING` / `VALIDATING`) or aborted runs are completely invisible to end-users.
  - **Preservation of Previous Valid Run**: The existing `AVAILABLE` run remains active until the new run successfully transitions from `VALIDATING` to `AVAILABLE`.
  - **Missing & Out-of-Order Chunks**: Finalization validates that `COUNT(Chunk_Index__c) == Total_Chunks__c` and that chunk indexes form a contiguous 0-indexed sequence. Missing chunks abort the transition and set status to `FAILED`.
  - **Database Unique Constraint**: Add custom field `Chunk_Key__c` (Text 100, Unique Case-Insensitive, External ID) to `DA_Graph_Chunk__c`. Prevents concurrent DML races from inserting duplicate chunk rows.
  - **Enforcement of Total Payload Cap**: Maximum total payload limit is strictly **10,485,760 UTF-16 code units** (80 chunks of 131,072 chars). The service maintains `Total_Payload_Size__c` and throws `DAGraphIngestionException` if the running sum exceeds the cap.
- **Readiness Classification**: **READY FOR PROJECT OWNER APPROVAL** (Option A Recommended).

---

### PO-DEC-V2-04 — Dependency River Shell Mounting

#### Technical Verification & View Registry:
- **Affected Gaps**: GAP-MNT-01, GAP-CON-03
- **Context & Approval Distinction**:
  - `daSankeyView` (REM-02) was implemented and ratified under `PO-REQ-03`.
  - However, `daAppShell.js` currently defines a hardcoded array `APPROVED_VIEWS` with only 11 modes (`graph`, `matrix`, `findings`, `dashboard`, `history`, `diagnostics`, `hotspots`, `radar`, `treemap`, `subway`, `dna`).
  - `daSankeyView` is unmounted in `daAppShell.html` and absent from `APPROVED_VIEWS`.
- **Architectural Distinction**:
  - Workspace View Identifier: `river` (canonical navigation mode).
  - Layout Mode Identifier: `sankey` (layout algorithm key).
  - Component Bundle: `c/daSankeyView`.
- **Integration Proposal**:
  - Authorize Coordinator D1 to add `'river'` to `APPROVED_VIEWS` in `daAppShell.js` (expanding approved views from 11 to 12).
  - Mount `<template if:true={isRiverView}><c-da-sankey-view ...></c-da-sankey-view></template>` in `daAppShell.html`.
  - Align `CONTRACT-08` table to document `river` as an official approved view mode.
- **Readiness Classification**: **READY FOR PROJECT OWNER APPROVAL** (Option A Recommended).

---

### PO-DEC-V2-05 — Finding Review Persistence Schema Expansion

#### Technical Verification & Data Flow:
- **Affected Gaps**: GAP-WKF-01
- **Context**: In React Explorer and current LWC `daFindingsView`, finding status toggles (`OPEN`, `IN_REVIEW`, `RESOLVED`, `WONT_FIX`) operate purely in-memory. Reloading the browser or switching projects discards user review progress.
- **Proposed Schema & Controller**:
  - Add `Status__c` (Picklist: `OPEN`, `IN_REVIEW`, `RESOLVED`, `WONT_FIX`, default `OPEN`) to `DA_Finding__c`.
  - Add `Review_Comments__c` (LongTextArea 4000) and `Reviewed_By__c` (Lookup User) for auditability.
  - Implement `@AuraEnabled public static void updateFindingStatus(Id findingId, String status, String comments)` in `DAGraphController.cls`.
  - Enforce `WITH USER_MODE` and project isolation verification prior to update.
- **Readiness Classification**: **READY FOR PROJECT OWNER APPROVAL** (Option A Recommended).

---

### PO-DEC-V2-06 — Secondary React Lens Scope Rationalization

#### Technical Verification & Scope Boundaries:
- **Affected Gaps**: GAP-PAR-01, GAP-PAR-04
- **React Legacy Inventory vs. Salesforce Architecture**:
  - React workspace contains experimental or duplicate visualizations: `heatmap`, `tree`, `profile`, `four-direction`, and standalone `constellation`.
  - In Salesforce, core architectural perspectives are already represented:
    - Circular/Constellation dependencies -> `daRadarView` (W6-1).
    - Hierarchical flow -> `daSankeyView` (REM-02).
    - Multi-layer pathways -> `daSubwayView` (W6-3) and `daDnaView` (W6-4).
    - Matrix clustering -> `daDependencyMatrix` (W7-1).
- **Explicit Scope Classification**:
  - `Heatmap`, `Tree`, `Profile`, `Four-Direction`: **APPROVED DIFFERENCE / OUT OF SCOPE FOR V1.0**.
  - `Constellation Dynamic D3 Force`: **APPROVED DIFFERENCE** (Salesforce uses deterministic SVG math per pure simulation isolation and Locker/LWS security requirements).
- **Readiness Classification**: **READY FOR PROJECT OWNER APPROVAL** (Option A Recommended).

---

## 3. Frozen Contract Reconciliation Governance (Correction 3)

The ownership model for frozen technical contracts is strictly defined as follows:
- **D1 Integration Coordinator Authority**: D1 exclusively coordinates the reconciliation of contract divergences:
  - `CONTRACT-04` (Zero-Schema Invariant): Reconciles discrepancy with custom objects.
  - `CONTRACT-05` (Snapshot Comparison): Reconciles header status (`PROPOSED` vs ratified `PO-REQ-02`).
  - `CONTRACT-08` (Workspace View Modes): Reconciles approved view keys (`river` vs `sankey`).
- **Technical Evidence Providers**:
  - Agent 2 supplies ingestion and persistence evidence.
  - Agent 5 supplies component and workspace mounting evidence.
  - Agent 9 supplies React/Salesforce parity evidence.
  - D2 independently verifies the evidence.
- **Project Owner Exclusive Authority**: Only the Project Owner can authorize changes to frozen contract scope or ratified contract texts. Neither D1 nor any implementation agent may rewrite contracts or change approval statuses without an explicit Project Owner decision.

---

## 4. Decision Readiness Summary Table

| Decision ID | Description | Technical Spec Complete? | Risks Addressed? | PO Approval Status | Phase 1 Blocking Impact |
|---|---|---|---|---|---|
| **PO-DEC-V2-01** | Apex REST Ingestion Transport | YES | Heap limits (NOT VERIFIED on live org), OAuth, Idempotency | **PENDING** | BLOCKS Agent 3 & 4 implementation |
| **PO-DEC-V2-02** | Private OWD & Revocation | YES | Migration script, FLS, CRUD | **PENDING** | BLOCKS Agent 1 implementation |
| **PO-DEC-V2-03** | Run Lifecycle & Chunk Uniqueness | YES | SOQL races, payload caps, availability | **PENDING** | BLOCKS Agent 2 implementation |
| **PO-DEC-V2-04** | daSankeyView Shell Mount ('river') | YES | 11 -> 12 views, contract sync | **PENDING** | BLOCKS D1 shell integration |
| **PO-DEC-V2-05** | Finding Review Persistence | YES | Schema, controller, user mode | **PENDING** | BLOCKS Agent 6 implementation |
| **PO-DEC-V2-06** | Secondary React Lens Scope | YES | Matrix reconciliation, boundary freeze | **PENDING** | Non-blocking (Governance docs) |
