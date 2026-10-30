# DEC-W4-04: Matrix and Findings Implementation Scope

| Document Attribute | Value |
|---|---|
| **Decision ID** | `DEC-W4-04` |
| **Title** | Matrix and Findings Implementation Scope |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Required Approver** | Product Owner |
| **Approval Status** | **PENDING** |
| **Approver Name** | _______________________ |
| **Approval Date** | _______________________ |
| **Governance Classification** | `APPROVAL RECORDED IN REPOSITORY — UNDERLYING HUMAN PROVENANCE NOT INDEPENDENTLY VERIFIED` |

---

## 1. Decision Question

What is the required implementation scope for the Matrix (`daMatrixViewer`) and Findings (`daFindingsViewer`) views during Wave 4 (`FEAT-STATE-03`) of the Salesforce migration?

---

## 2. Background & Scope Ambiguity Analysis

The Wave 4 readiness audit identified a key product ambiguity:
- In the original web explorer application (`explorer/`), Matrix View (`FeatureMatrixPanel.tsx` / `matrix-adapter.ts`) and Findings View (`FindingsPanel.tsx` / `intelligence/finding.ts`) are fully functional interactive UI modules.
- In the current Salesforce POC codebase (`scratch/salesforce-poc/force-app/main/default/lwc/`), only `daAppShell` and `daGraphViewer` exist as LWC components. Neither `daMatrixViewer` nor `daFindingsViewer` LWCs have been created.
- The proposed dispatch plan suggested creating lightweight LWC adapters/stubs for Matrix and Findings views. However, creating non-functional stubs might fail product owner expectations if full feature parity was intended for Wave 4.

To resolve this ambiguity prior to implementation dispatch, three distinct scope options have been formulated for Product Owner evaluation.

---

## 3. Evaluation of Scope Options

### Option A: Fully Functional Matrix & Findings LWCs in Wave 4

Build complete, production-grade LWC implementations of both `daMatrixViewer` and `daFindingsViewer` inside `scratch/salesforce-poc/` matching React feature parity.

#### Option A Breakdown
- **User-Visible Capability:**
  - **Matrix View:** Renders an interactive 2D adjacency grid showing source vs target component dependency cells, supporting filtering, sorting, cell inspection, and risk heatmapping.
  - **Findings View:** Renders a searchable data table of architecture recommendation items (`DA_Finding__c` custom objects or JSON intelligence findings), with severity badges, status tags, and detail expansion drawers.
- **Required Components:**
  - `daMatrixViewer` LWC (JS, HTML, CSS) with custom grid rendering logic.
  - `daFindingsViewer` LWC (JS, HTML, CSS) leveraging Lightning Datatable (`lightning-datatable`).
  - Apex controller additions: `DAFindingController.cls` (SOQL queries on `DA_Finding__c`).
- **Required Data:**
  - `DA_Finding__c` custom object metadata and sample record fixtures.
  - Matrix node/edge dependency adjacency calculation engine ported to LWC JS.
- **Implementation Effort & Dependencies:**
  - **High Effort (~3-4 weeks).** Requires porting complex React canvas/grid virtualization and finding intelligence adapters to LWC.
- **Acceptance Criteria:**
  - Toggling tabs in `daAppShell` displays functional Matrix and Findings views. Filter changes instantly filter matrix cells and findings rows.
- **Risks of Declaring Wave 4 Complete under Option A:**
  - Significantly delays Wave 4 dispatch and closure. High risk of introducing scope creep into filter state management.

---

### Option B: Shared-Filter Adapters / Stubs Only (View Implementation Deferred)

Create lightweight LWC adapter stubs for `daMatrixViewer` and `daFindingsViewer` whose primary purpose is to establish and validate the reactive `@api filters` contract and event synchronization with `daAppShell`.

#### Option B Breakdown
- **User-Visible Capability:**
  - Shell tab switching displays placeholder cards ("Matrix View — Filter Contract Active", "Findings View — Filter Contract Active") displaying active filter criteria metrics (e.g. "Filters applied: High Risk, 12 nodes matching").
- **Required Components:**
  - Minimal `daMatrixViewer` and `daFindingsViewer` LWC stubs (~50 lines JS/HTML each).
- **Required Data:**
  - None required beyond existing `daGraphPayloadLoader` exported JSON structures.
- **Implementation Effort & Dependencies:**
  - **Low Effort (~3-5 days).** Focuses 100% of Wave 4 effort on robust filter preset management (`DEC-W4-01`), cross-view filter state event synchronization, and test coverage.
- **Acceptance Criteria:**
  - Filter state correctly passes into both stubs; offline tests verify event propagation and state retention when switching tabs.
- **Risks of Declaring Wave 4 Complete under Option B:**
  - Users navigating to Matrix or Findings tabs in Salesforce will see placeholder stubs rather than interactive visualizations until a subsequent wave (e.g. Wave 5) builds the full view UI.

---

### Option C: Minimal Functional Views with Clearly Defined Limitations (Recommended Scope)

Build lightweight, functional LWC implementations for both Matrix and Findings views that provide genuine utility without the heavy UI virtualization required for massive orgs.

#### Option C Breakdown
- **User-Visible Capability:**
  - **Matrix View:** Functional summary matrix rendering component-type interaction counts (e.g., ApexClass -> CustomObject: 14 calls) in a clean SLDS summary grid filtered by active criteria.
  - **Findings View:** Functional Lightning Datatable (`lightning-datatable`) displaying architectural findings (e.g., circular dependencies, untested high-risk classes, missing layer annotations) derived directly from `explorer-data.json` / graph payload analytics, filtered reactively by active search, risk, and node type criteria.
- **Required Components:**
  - Lightweight `daMatrixViewer` LWC (SLDS grid layout).
  - Lightweight `daFindingsViewer` LWC (`lightning-datatable` with SLDS severity badges).
- **Required Data:**
  - Existing `explorer-data.json` graph payload (utilizes `cycles`, `unresolvedReferences`, and `refactoringReadiness` already present in payload).
- **Implementation Effort & Dependencies:**
  - **Medium Effort (~1-1.5 weeks).** Delivers functional end-user utility using existing graph payload data without requiring new Apex controllers or complex custom object deployments.
- **Acceptance Criteria:**
  - Matrix tab displays filtered component interaction matrix. Findings tab displays filtered architecture findings table. Both views react instantly to `daAppShell` filter preset changes.
- **Risks of Declaring Wave 4 Complete under Option C:**
  - Matrix view is summarized rather than full cell-by-cell virtualization (acceptable for >90% of architectural analysis use cases).

---

## 4. Product Owner Scope Decision Summary

| Feature Scope Metric | Option A: Full Parity | Option B: Contract Stubs | Option C: Minimal Functional (Recommended) |
|---|---|---|---|
| **Matrix View Functional Level** | Full Virtualized Adjacency Grid | Placeholder Card Stub | Functional Interaction Summary Grid |
| **Findings View Functional Level** | Full `DA_Finding__c` Object Manager | Placeholder Card Stub | Functional Graph Analytics Datatable |
| **Cross-View Filter Integration** | Full | Full | Full |
| **Estimated Implementation Effort** | High (3–4 weeks) | Low (3–5 days) | Medium (1–1.5 weeks) |
| **New Salesforce Metadata Needed?** | Yes (`DA_Finding__c` object) | No | No |
| **Blocks Wave 4 Dispatch?** | Yes (Requires re-scoping WPs) | No | No (Fits inside WPs 4.5 & 4.6) |

---

## 5. Architectural Recommendation

**RECOMMENDATION: OPTION C (Minimal Functional Views with Defined Limitations).**

Option C achieves the optimal balance: it delivers real, visible value and functional filtering in both Matrix and Findings views using existing data payloads, without adding heavyweight metadata dependencies or delaying Wave 4 execution.

---

## 6. Approval Block

| Role | Name | Status | Signature / Date |
|---|---|---|---|
| **Product Owner** | _______________________ | **PENDING** | _______________________ |
