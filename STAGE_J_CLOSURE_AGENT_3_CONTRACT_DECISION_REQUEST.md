# STAGE J CLOSURE — AGENT 3 CONTRACT DECISION REQUEST

## Governance Identification
- **Document Title**: Agent 3 REST Ingestion Contract Governance Correction & Decision Request
- **Request ID**: `DEC-REQ-STAGE-J-AGENT-3-01`
- **Originating Role**: Agent 3 (REST API and Salesforce Apex Lead)
- **Receiving Authorities**:
  - Integration Coordinator D1
  - Project Owner (Final Deciding Authority)
- **Cross-Reference Deliverable**: `STAGE_J_CLOSURE_AGENT_3_CORRECTED_REST_CONTRACT.md`
- **Requested Decision Status**: `PENDING_PROJECT_OWNER_RATIFICATION`
- **Date**: 2026-11-11

---

## 1. Executive Summary & Governance Correction

In earlier Stage J submissions, Agent 3 reported the REST ingestion contract as:
`1.0.0-FINAL-RATIFIED` / `RATIFIED_BY_PROJECT_OWNER` under reference `PO-RAT-STAGE-J-AGENT-3-2026-11-11`.

Following governance review and audits by Integration Coordinator D1 (`STAGE_J_D1_TASK_AND_DEPENDENCY_REGISTER.csv`) and Independent Verifier D2 (`STAGE_J_D2_INDEPENDENT_VERIFICATION_REPORT.md` findings BLK-AUTH-05 and BLK-AUTH-06), this status has been recognized as premature and contradictory because explicit Project Owner ratification was not yet recorded in the governance ledger.

Agent 3 hereby retracts any claims of completed ratification, corrects the contract to:
**`1.0.0-PROPOSED-FROZEN — PENDING PROJECT OWNER RATIFICATION`**,
and formally submits this Decision Request to obtain the Project Owner's explicit authorization before authorizing or deploying the Apex REST implementation.

---

## 2. Decision Items for Project Owner Approval

The Project Owner is requested to review and formally ratify the following four specific determinations:

### Decision Item 1: REST Ingestion Contract Normative Freeze (DEC-PO-REST-01)
- **Scope**: Ratification of `STAGE_J_CLOSURE_AGENT_3_CORRECTED_REST_CONTRACT.md` (v1.0.0).
- **Core Provisions**:
  1. Standard base path `/services/apexrest/da/v1/ingest/*` exposing `/init`, `/chunks`, and `/finalize`.
  2. Single external upload path delegating exclusively to canonical `DAGraphIngestionService.cls`.
  3. Pre-flight 5 MiB wire size ceiling (`5,242,880 bytes`) with HTTP 413 `ERR_CHUNK_WIRE_OVERSIZE` protection.
  4. 131,072 UTF-16 code unit chunk limit and 10,485,760 UTF-16 code unit total payload cap.
  5. SHA-256 lowercase 64-hex lowercase checksum validation with fail-safe preservation of last-known-good (`AVAILABLE`) graph.
  6. Idempotent identical retry handling (HTTP 200) and conflicting chunk rejection (HTTP 409 `ERR_CONFLICTING_RETRY`).
- **Requested Action**: Approve / Ratify as normative standard.

### Decision Item 2: Measurement Unit Delineation & DTO Semantics (DEC-PO-REST-02)
- **Scope**: Formal adoption of the six-unit measurement framework distinguishing:
  1. UTF-16 code units (database LongTextArea characters).
  2. UTF-8 payload bytes (raw JSON bytes on external filesystem).
  3. Serialized JSON bytes (wire envelope representation).
  4. HTTP request-body bytes (binary payload evaluated against 5 MiB ceiling).
  5. Salesforce field limits (131,072 per chunk; 10,485,760 total).
  6. Apex heap limits (6 MB sync / 12 MB async).
- **Requested Action**: Approve disambiguation between client `expectedTotalBytes` and database `Total_Payload_Size_Chars__c`.

### Decision Item 3: Apex REST Implementation Authorization Gate (DEC-PO-REST-03)
- **Scope**: Release of implementation gate BLK-AUTH-06.
- **Trigger**: Once DEC-PO-REST-01 and DEC-PO-REST-02 are ratified, authorize the Apex implementation classes:
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphIngestionRestResource.cls`
  - `scratch/salesforce-poc/force-app/main/default/classes/dto/DAGraphIngestionDTO.cls`
  - `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphIngestionRestResourceTest.cls`
- **Requested Action**: Authorize Apex implementation reconciliation and testing under gated control.

### Decision Item 4: Classification of Live Salesforce Org Runtime Environment (DEC-PO-REST-04)
- **Scope**: Formal classification of environment boundaries.
- **Classification**: Because no live authenticated Salesforce scratch org is connected in the headless CI container, all Apex compile-and-run verification is performed via comprehensive offline Node.js AST runners, with live org deployment and Apex governor limits cataloged as environmental limitations (`BLK-ENV-02` / `BLK-ENV-03`).
- **Requested Action**: Reaffirm offline AST verification acceptance pending scratch org provisioning.

---

## 3. Risk and Impact Assessment

| Scenario | Risk | Mitigation |
|---|---|---|
| **Proceeding Without PO Ratification** | Governance violation, unauthorized contract change, potential breaking changes for external tooling. | Complete stop at Phase A until Project Owner provides explicit signoff. |
| **Ambiguity in Payload Sizing** | Heap exhaustion or truncation if UTF-8 bytes are confused with UTF-16 characters or wire bytes. | Six-unit taxonomy clearly documents limits and separates wire size check from heap safety. |
| **Duplicate Persistence Logic** | Inconsistent graph state between REST uploads and Lightning UI uploads. | REST resource strictly delegates to `DAGraphIngestionService`, ensuring single-engine persistence. |

---

## 4. Formal Signoff Request Block

```
================================================================================
PROJECT OWNER RATIFICATION DECISION BLOCK
================================================================================
Order ID: PO-RAT-STAGE-J-AGENT-3-[DATE]
Deciding Authority: Project Owner

[ ] DEC-PO-REST-01: Ratify Corrected REST Contract v1.0.0
[ ] DEC-PO-REST-02: Approve Six-Unit Measurement Semantics & DTO Field Mapping
[ ] DEC-PO-REST-03: Authorize Apex REST Implementation Gate Release
[ ] DEC-PO-REST-04: Confirm Offline AST Verification Standard for Sandbox

Signature / Approval Reference: ____________________________________
Date: ____________________________________
================================================================================
```

*Submitted by Agent 3 to Integration Coordinator D1 and Project Owner.*
