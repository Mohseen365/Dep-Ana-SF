# Master Gap Project Owner Decisions Required

This register enumerates formal decisions requiring executive authorization from the Project Owner before subsequent implementation dispatches begin.

---

## 1. Executive Decisions Inventory

| Decision ID | Title | Gaps Affected | Executive Authority Scope | Recommendation | Blocks Implementation? |
|---|---|---|---|---|---|
| **PO-DEC-GAP-01** | Authorization of Apex REST Ingestion Transport | GAP-ING-01, GAP-ING-02 | Ingestion Architecture & Connected App Scope | **APPROVE**: Expose Apex REST endpoint `/services/apexrest/da/v1/ingest/*` | YES (Blocks external upload) |
| **PO-DEC-GAP-02** | Ratification of Private Organization-Wide Default Sharing | GAP-SEC-01, GAP-SEC-02 | Data Model & Sharing Security Policy | **APPROVE**: Set OWD to Private for `DA_Project__c` and remove `viewAllRecords` | YES (Blocks production security compliance) |
| **PO-DEC-GAP-03** | Scope Approval for Persistent Finding Review Status | GAP-WKF-01 | Custom Schema Expansion (`DA_Finding__c.Status__c`) | **APPROVE**: Add picklist field and Apex update controller | NO (Blocks finding review persistence) |
| **PO-DEC-GAP-04** | Approval of 12th Official View: Pure SVG Dependency River (`sankey`) | GAP-MNT-01 | Application Shell View Mode Registry (`APPROVED_VIEWS`) | **APPROVE**: Expand `APPROVED_VIEWS` to 12 modes including `sankey` | NO (Blocks Sankey UI navigation) |
| **PO-DEC-GAP-05** | Ratification of Constellation Layout Approved Difference | GAP-PAR-01 | Architecture Parity Policy | **APPROVE**: Formally ratify deterministic SVG polar layout in place of D3 force | NO (Governance record only) |

---

## 2. Detailed Decision Briefs

### Decision PO-DEC-GAP-01: Authorization of Apex REST Ingestion Transport
- **Findings Affected**: GAP-ING-01, GAP-ING-02
- **Why Executive Approval is Needed**: Introducing an external REST endpoint expands the public API surface of the Salesforce package and requires defining authentication expectations (Connected App OAuth vs Salesforce CLI user context).
- **Options Considered**:
  - *Option A (Recommended)*: Expose `/services/apexrest/da/v1/ingest/*` utilizing `DAGraphIngestionService` with batch chunking and USER_MODE enforcement.
  - *Option B*: Rely exclusively on Salesforce standard Composite / Bulk API (requires complex external payload mapping).
  - *Option C*: Retain manual script-based data loading via Anonymous Apex.
- **Risks & Trade-offs**: Option A creates an additional package endpoint to maintain, but provides first-class idempotency and payload verification.
- **Jules Recommendation**: APPROVE Option A.
- **Contract Impact**: None (complies with CONTRACT-01 and CONTRACT-04).

---

### Decision PO-DEC-GAP-02: Ratification of Private OWD Sharing for `DA_Project__c`
- **Findings Affected**: GAP-SEC-01, GAP-SEC-02
- **Why Executive Approval is Needed**: Changing Organization-Wide Defaults (OWD) alters security behavior across all enterprise org deployments.
- **Options Considered**:
  - *Option A (Recommended)*: Set `DA_Project__c` OWD to `Private` and set `<viewAllRecords>false</viewAllRecords>` in `DA_Architecture_Analyst`.
  - *Option B*: Keep OWD `ReadWrite` and rely solely on application-level filtering.
- **Risks & Trade-offs**: Option B leaves severe security vulnerabilities in multi-tenant orgs where different teams analyze confidential codebases. Option A enforces true project isolation at the database level.
- **Jules Recommendation**: APPROVE Option A.
- **Contract Impact**: None (reinforces CONTRACT-09 project isolation invariant).

---

### Decision PO-DEC-GAP-03: Scope Approval for Persistent Finding Review Status
- **Findings Affected**: GAP-WKF-01
- **Why Executive Approval is Needed**: Adds a new custom field `Status__c` to `DA_Finding__c` custom object metadata.
- **Options Considered**:
  - *Option A (Recommended)*: Add `Status__c` picklist (`OPEN`, `IN_REVIEW`, `RESOLVED`, `WONT_FIX`) to `DA_Finding__c` and implement Apex update controller.
  - *Option B*: Maintain in-memory review status within `daFindingsView` only (state lost on page refresh).
  - *Option C*: Store review status in `DA_User_Preference__c` JSON blob per user.
- **Risks & Trade-offs**: Option A allows collaborative review across team members. Option C isolates review per user. Option B fails user expectations.
- **Jules Recommendation**: APPROVE Option A.
- **Contract Impact**: Requires adding field permission to `DA_Architecture_Analyst`.

---

### Decision PO-DEC-GAP-04: Approval of 12th Official View: Pure SVG Dependency River (`sankey`)
- **Findings Affected**: GAP-MNT-01
- **Why Executive Approval is Needed**: Expands the list of officially approved views in `daAppShell` from 11 to 12.
- **Options Considered**:
  - *Option A (Recommended)*: Formally add `'sankey'` (or `'river'`) to `APPROVED_VIEWS`, mounting `daSankeyView` in `daAppShell`.
  - *Option B*: Keep `daSankeyView` as an unmounted experimental component.
- **Risks & Trade-offs**: Option A delivers the feature ratified under Task REM-02 to end users. Option B leaves ratified production code inaccessible.
- **Jules Recommendation**: APPROVE Option A.
- **Contract Impact**: Updates `APPROVED_VIEWS` frozen array in `daAppShell.js`.

---

### Decision PO-DEC-GAP-05: Ratification of Constellation Layout Approved Difference
- **Findings Affected**: GAP-PAR-01
- **Why Executive Approval is Needed**: Formally closes the feature parity discrepancy between React (D3 dynamic simulation) and Salesforce (pure SVG polar geometry).
- **Options Considered**:
  - *Option A (Recommended)*: Ratify as an APPROVED_DIFFERENCE under the pure simulation isolation invariant.
  - *Option B*: Require porting D3-force simulation to Salesforce LWC.
- **Risks & Trade-offs**: Porting D3 violates the pure simulation isolation and zero-dependency LWC architecture. Option A preserves proven deterministic SVG math.
- **Jules Recommendation**: APPROVE Option A.
- **Contract Impact**: Reaffirms CONTRACT-02 and CONTRACT-09 invariants.
