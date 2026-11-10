# Phase 0 Final Technical Clarification Addendum

## Document Metadata
- **Classification**: Phase 0 Governance & Technical Clarification Addendum
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1
- **Status**: AUTHORITATIVE PHASE 0 CLARIFICATION ADDENDUM

---

## 1. Context & Purpose

Following the comprehensive Phase 0 correction assessment, this addendum formalizes the final technical clarifications and establishes strict controls over Phase 1 preparation activities.

This document serves as the bridging authority ensuring that:
1. All technical qualifications regarding payload accounting, governor limits, relationship architecture, and data recovery are decisively corrected.
2. The six Project Owner decisions (`PO-DEC-V2-01` through `PO-DEC-V2-06`) remain explicitly pending without unauthorized implementation.
3. Preparation work is strictly quarantined from production modifications.

---

## 2. Summary of Key Technical Clarifications

### 2.1 Correction A: Payload & Memory Accounting Disambiguation
- **Core Rectification**: Conflation of character lengths with memory and wire bytes is resolved. 1,310,720 UTF-16 code units (10 chunks of 131,072) is **not** 1.31 MB of memory; raw UTF-16 storage is 2,621,440 bytes (2.50 MB).
- **Wire Expansion Finding**: Worst-case JSON escaping of control characters expands a 10-chunk payload to **7.50 MB**, exceeding Salesforce's 6 MB synchronous HTTP limit. Defensive pre-flight checks and dynamic batch partitioning are established.
- **Apex Governor Limit Status**: In the absence of live Salesforce org execution, all Apex heap and CPU safety claims for 10-chunk batches are classified as **`NOT VERIFIED — LIVE SALESFORCE ORG REQUIRED`**.

### 2.2 Correction B: Scope Classification of Secondary React Lenses
- **Core Rectification**: Heatmap, Tree, Dependency Profile, and Four-Direction lenses are **not** formally approved differences.
- **Status**: Classified strictly as **`PROPOSED OUT-OF-SCOPE DIFFERENCES — PENDING PROJECT OWNER APPROVAL`** awaiting explicit Project Owner ratification under `PO-DEC-V2-06`.
- **Architectural Separation**: Strict taxonomy maintained across workspace views, layout algorithms, supporting surfaces, modals, and quarantined refactoring features.

### 2.3 Correction C: Object-by-Object Relationship & Security Access Model
- **Core Rectification**: `ControlledByParent`, `MasterDetail`, and programmatic Apex sharing are no longer treated as interchangeable.
- **Data Model Alignment**:
  - `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, and `DA_Finding__c` have Master-Detail relationships to their parents with `ControlledByParent` sharing. They have no independent sharing tables (`__Share`) and cannot receive explicit manual sharing.
  - `DA_Annotation__c` has a Master-Detail relationship to `DA_Project__c` with `ControlledByParent` sharing.
  - `DA_User_Preference__c` is `Private` with Lookup relationships, owned independently by the individual user.
  - `DA_Project__c` is the sole entity requiring explicit sharing (`DA_Project__Share`) upon transitioning OWD to `Private`.
- **FLS Metadata Rules**: Field-Level Security cannot be granted on Master-Detail or required custom fields. Exactly 29 fields receive FLS in `DA_Architecture_Analyst`.
- **Implementation Gate**: Zero security metadata changes are permitted prior to `PO-DEC-V2-02`.

### 2.4 Correction D: Ingestion & Security Rollback and Recovery
- **Core Rectification**: A code rollback does not restore data integrity.
- **Ingestion Runbook**: 12 failure modes detailed. Before uniqueness constraints on `Chunk_Key__c` are altered, duplicate detection, data preservation, and integrity verification are strictly mandatory.
- **Security Runbook**: Restoring broad access (reverting OWD to Public Read/Write or setting `viewAllRecords=true`) is **strictly prohibited as an automatic rollback**. Emergency containment must use targeted, non-exposing temporary permission sets. Any public re-exposure requires explicit Project Owner authorization.

---

## 3. Governance Register & Boundaries
- **Wave 5A**: RATIFIED AND FORMALLY CLOSED.
- **Wave 9**: QUARANTINED and excluded from packaging (`.forceignore`).
- **Baseline Commit**: `65d3d31`.
- **Implementation Status**: Zero unauthorized implementation dispatched. All blocked agents remain in holding status pending PO decisions.
