# Master Gap Project Owner Decisions Register V2

## Document Identification
- **Governance Authority**: Project Owner Exclusive Executive Scope
- **Reconciliation Date**: 2026-11-10
- **Auditor**: Jules Master Dispatch & Governance Advisor
- **Status**: Authoritative Executive Decision Register V2

---

## 1. Executive Summary & Historical Approval Reconciliation

This register reconciles all previously proposed executive decisions against the historical approval records of the repository.

### Critical Governance Finding:
- **PO-REQ-01 through PO-REQ-05** were formally approved and signed off by the Project Owner on **2026-11-10**.
- **PO-REQ-02 (Option A)** already ratified the Dual-Snapshot & Diff Engine (`CONTRACT-05` / `REM-03`) and the Pure SVG Dependency River (`REM-02`).
- Consequently, **re-requesting approval for the creation or algorithmic structure of daSankeyView or daSnapshotComparisonModal would be redundant and administratively invalid**.

The decisions enumerated below represent **genuinely new, unapproved executive choices** required to authorize Phase 1 and Phase 2 remediation implementation dispatches.

---

## 2. Genuinely New Executive Decisions

| Decision ID | Title | Affected Gaps | Required Executive Scope | Recommendation | Blocks Implementation? |
|---|---|---|---|---|---|
| **PO-DEC-V2-01** | Authorization of Apex REST Ingestion Transport & Endpoint URL | GAP-ING-01, GAP-ING-02 | Public REST API Surface Exposure | **APPROVE**: Expose `/services/apexrest/da/v1/ingest/*` | YES (Blocks external upload automation) |
| **PO-DEC-V2-02** | Ratification of Private OWD Sharing for `DA_Project__c` & Permission Set Revocation | GAP-SEC-01, GAP-SEC-02 | Org Security Policy & Multi-Tenant Access | **APPROVE**: Set OWD to Private and revoke `viewAllRecords` | YES (Blocks enterprise security compliance) |
| **PO-DEC-V2-03** | Approval of Strict Run Lifecycle Schema & Ingestion Status Picklist | GAP-ING-03, GAP-ING-04, GAP-ING-05 | Object Schema (`Status__c`, `Chunk_Key__c`) | **APPROVE**: Add CREATED/UPLOADING/VALIDATING picklists & Unique Chunk Key | YES (Blocks reliable upload lifecycle) |
| **PO-DEC-V2-04** | Formal Shell Mount Authorization for `daSankeyView` as 12th Official View | GAP-MNT-01, GAP-CON-03 | Application Shell Navigation Registry (`APPROVED_VIEWS`) | **APPROVE**: Expand `APPROVED_VIEWS` to 12 modes, registering view `river` | NO (Blocks UI tab exposure) |
| **PO-DEC-V2-05** | Approval of Finding Review Persistence Schema Expansion | GAP-WKF-01 | Custom Schema (`DA_Finding__c.Status__c`) | **APPROVE**: Add review status picklist and update controller | NO (Blocks finding review persistence) |
| **PO-DEC-V2-06** | Ratification of Secondary React Lenses (Heatmap, Tree, Profile, Four-Direction) | GAP-PAR-01, GAP-PAR-04 | Feature Parity Baseline Policy | **PROPOSED OUT-OF-SCOPE DIFFERENCES — PENDING PROJECT OWNER APPROVAL** | NO (Governance documentation only) |

---

## 3. Detailed Decision Briefs

### Decision PO-DEC-V2-01: Authorization of Apex REST Ingestion Transport
- **Affected Gaps**: GAP-ING-01, GAP-ING-02
- **Executive Question**: Shall the project introduce a dedicated Apex REST endpoint (`/services/apexrest/da/v1/ingest/*`) to allow external CI/CD pipelines and the Node.js CLI analyzer to ingest projects, runs, and chunks directly into Salesforce?
- **Options**:
  - *Option A (Recommended)*: Expose `DAGraphIngestionRestResource.cls` with chunk batching and `WITH USER_MODE` enforcement.
  - *Option B*: Do not introduce custom REST endpoints; require external clients to use standard Salesforce Composite REST API.
- **Jules Recommendation**: APPROVE Option A. Option A encapsulates chunk validation, sequence checks, and atomic state transitions within Apex.
- **Contract Impact**: Fully complies with CONTRACT-01 and CONTRACT-04.

### Decision PO-DEC-V2-02: Ratification of Private OWD Sharing & Revocation of `viewAllRecords`
- **Affected Gaps**: GAP-SEC-01, GAP-SEC-02
- **Executive Question**: Shall Organization-Wide Default sharing for `DA_Project__c` be changed from `ReadWrite` to `Private`, and shall `<viewAllRecords>true</viewAllRecords>` be removed from `DA_Architecture_Analyst`?
- **Options**:
  - *Option A (Recommended)*: Enforce Private OWD, remove `viewAllRecords`, and implement project membership sharing.
  - *Option B*: Retain `ReadWrite` OWD and rely on LWC client-side filtering.
- **Jules Recommendation**: APPROVE Option A. Option B represents a catastrophic multi-tenant data exposure flaw.
- **Contract Impact**: Reinforces CONTRACT-09 project isolation invariant.

### Decision PO-DEC-V2-03: Approval of Run Lifecycle Schema & Database Chunk Uniqueness
- **Affected Gaps**: GAP-ING-03, GAP-ING-04, GAP-ING-05
- **Executive Question**: Shall `Status__c` on `DA_Analysis_Run__c` be expanded to include `CREATED`, `UPLOADING`, and `VALIDATING`, and shall `Chunk_Key__c` (Unique External ID) be added to `DA_Graph_Chunk__c` to prevent duplicate chunk race conditions?
- **Options**:
  - *Option A (Recommended)*: Authorize the metadata schema expansion to guarantee atomic visibility and race-safe uploads.
  - *Option B*: Retain existing schema and attempt software-only locking in Apex.
- **Jules Recommendation**: APPROVE Option A. Software-only locking in Apex cannot prevent concurrent SOQL/DML race conditions without database-level uniqueness.

### Decision PO-DEC-V2-04: Formal Shell Mount Authorization for `daSankeyView` as 12th View
- **Affected Gaps**: GAP-MNT-01, GAP-CON-03
- **Executive Question**: Task REM-02 implemented and ratified `daSankeyView`, but the shell currently caps `APPROVED_VIEWS` at 11 modes. Shall Coordinator D1 be authorized to expand `APPROVED_VIEWS` to include `river` (aliasing `sankey`) and mount `<c-da-sankey-view>` in `daAppShell`?
- **Options**:
  - *Option A (Recommended)*: Authorize 12th view registration and shell tab bar mounting.
  - *Option B*: Keep `daSankeyView` unmounted and accessible only via custom developer URL flags.
- **Jules Recommendation**: APPROVE Option A.
- **Contract Impact**: Amends CONTRACT-08 workspace registry table.

### Decision PO-DEC-V2-05: Finding Review Persistence Schema Expansion
- **Affected Gaps**: GAP-WKF-01
- **Executive Question**: Shall `DA_Finding__c` metadata be expanded to add `Status__c` (`OPEN`, `IN_REVIEW`, `RESOLVED`, `WONT_FIX`), accompanied by an Apex controller method to persist review updates?
- **Options**:
  - *Option A (Recommended)*: Authorize field addition and Apex persistence method.
  - *Option B*: Keep finding status changes purely in-memory in `daFindingsView.js`.
- **Jules Recommendation**: APPROVE Option A.

### Decision PO-DEC-V2-06: Formal Ratification of Secondary React Lenses as Out-of-Scope
- **Affected Gaps**: GAP-PAR-01, GAP-PAR-04
- **Executive Question**: React Explorer contains experimental lenses (`heatmap`, `tree`, `profile`, `four-direction`, and standalone `constellation`). Shall these lenses be formally classified as approved differences / out-of-scope for v1.0?
- **Options**:
  - *Option A (Recommended)*: Formally ratify as out-of-scope for v1.0.
  - *Option B*: Mandate creation of 5 new LWC bundles.
- **Jules Recommendation**: APPROVE Option A.
