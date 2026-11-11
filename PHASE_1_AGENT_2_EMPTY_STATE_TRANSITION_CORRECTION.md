# Phase 1 Agent 2 EMPTY State Transition Correction Report

## Document Identification
- **Document Type**: Lifecycle State Machine & EMPTY State Specification
- **Owner**: Agent 2 (Ingestion Lifecycle & Persistence Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: IMPLEMENTED & TEST-VERIFIED

---

## 1. Problem Statement

Previous interface drafts introduced `EMPTY` as a valid picklist value for `Status__c` on `DA_Analysis_Run__c`, but lacked a complete definition of its transition rules, handling of different forms of empty input, and interaction with the last-known-good graph.

---

## 2. Complete State Transition Table

| Scenario | Input Parameters | Transition Path | Terminal Status | Notes |
|---|---|---|---|---|
| **Zero Chunks & Zero Nodes** | `expectedChunks = 0, expectedTotalBytes = 0` | Creation -> Immediate | `EMPTY` | Terminal state for valid empty projects. |
| **Zero Chunks Finalization** | Run initialized with 0 chunks | Finalization check | `EMPTY` | Bypasses chunk validation and returns success. |
| **Expected Non-Empty but 0 Uploaded** | `expectedChunks > 0`, 0 chunks saved | Finalization check | `FAILED` | Mismatch between expected and actual chunks triggers failure. |
| **Chunks Present with 0 Nodes** | Valid chunks uploaded with empty AST | Finalization -> Validated | `AVAILABLE` | Successfully parsed non-chunk-empty graph with 0 nodes. |
| **Invalid Empty Payload** | Corrupt/malformed empty string | Ingestion/Finalize | `FAILED` | Rejection fail-closed. |
| **Run Retrieval** | `getLatestAvailableRun` | SOQL Query | `AVAILABLE` only | `EMPTY` runs are strictly excluded from `getLatestAvailableRun`. |
| **Last-Known-Good Invariant** | Existing `AVAILABLE` run followed by `EMPTY` run | Retrieval query | Preserved `AVAILABLE` | An `EMPTY` run never displaces an existing valid `AVAILABLE` graph. |
| **Chunk Upload to EMPTY Run** | `saveGraphChunks` called on `EMPTY` run | Validation check | Rejected (`IngestionException`) | Chunks cannot be uploaded to an `EMPTY` run. |

---

## 3. Preserved Invariants

1. **Terminal State**: `EMPTY` is terminal. Once marked `EMPTY`, chunk ingestion is prohibited fail-closed.
2. **Last-Known-Good Preservation**: `getLatestAvailableRun` filters strictly on `Status__c = 'AVAILABLE'`. Incomplete (`QUEUED`, `IN_PROGRESS`, `VALIDATING`), `FAILED`, and `EMPTY` runs do not displace the last-known-good graph.
