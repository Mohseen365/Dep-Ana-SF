# Workstream 5 (WS-5) Contract Remediation Proposal: Amended DEC-01 Ingestion Integrity

**Document ID:** `WS5-PROP-DEC01-REMED`
**Author:** Jules Agent 5 (Workstream 5 Lead)
**Target Authority:** Lead Architect, Integration Coordinator, Project Owner
**Date:** 2026-11-09
**Status:** PROPOSED FOR FORMAL RATIFICATION

---

## 1. Context & Motivation
Historical governance decisions in `PHASE_A5_DECISION_REGISTER.md` and `BLOCKERS_AND_DECISIONS.md` outlined DEC-01 around run completion status. Early iterations posited introducing a custom field such as `Expected_Chunks__c` or evaluating simple run existence.

However, a factual schema audit of Salesforce metadata confirms:
1. `DA_Analysis_Run__c` already contains `Status__c` (Picklist: `AVAILABLE`, `EMPTY`, `FAILED`).
2. `DA_Analysis_Run__c` already contains `Total_Chunks__c` (Number 6,0).
3. `DA_Graph_Chunk__c` has a master-detail relationship to `DA_Analysis_Run__c`.

Introducing a redundant `Expected_Chunks__c` field would create unnecessary technical debt and schema bloat.

---

## 2. Proposed Formal Amendment to DEC-01
The rule for determining whether an analysis run payload is complete, uncorrupted, and available for retrieval by LWC clients is amended as follows:

```
Run Available iff (
    DA_Analysis_Run__c.Status__c == 'AVAILABLE'
    AND
    COUNT(DA_Graph_Chunk__c WHERE DA_Analysis_Run__c = run.Id) == DA_Analysis_Run__c.Total_Chunks__c
)
```

### Invariants:
1. **Partial Ingestion Prevention**: An interrupted, partial, or failed run has `COUNT(chunks) < Total_Chunks__c` and must never be served as available graph metadata.
2. **Deterministic Ordering**: Analysis run queries must strictly sort by `Run_Timestamp__c DESC NULLS LAST, CreatedDate DESC, Id DESC`.
3. **Empty/Failed State Clarity**:
   - `EMPTY`: Zero chunks, zero entities (`Node_Count__c == 0`).
   - `FAILED`: Analysis aborted, partial chunks discarded or invalidated.
   - `AVAILABLE`: Fully ingested and verified chunk sequence.

---

## 3. Implementation Status
This amended rule has already been implemented and verified in:
- `DAGraphController.cls`: Filters candidate runs using bulkified aggregate chunk counts outside loops.
- `DAGraphControllerTest.cls`: Tested with `testIngestionIntegrityPartialChunkMismatchRejection`.
- `run-ws5-tests.cjs`: Automated offline simulation of interrupted ingestion rejection.

---

## 4. Requested Action
Ratify this remediation proposal into the authoritative governance register without modifying frozen historical audit logs.
