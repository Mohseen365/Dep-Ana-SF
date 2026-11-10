# Phase 0 Revised Agent Dispatch Sequence

## Document Metadata
- **Classification**: Phase 0 Phase 1 Revised Dispatch Runbook
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1
- **Status**: AUTHORITATIVE DISPATCH DIRECTIVE

---

## 1. Preparation vs. Implementation Distinction

- **Read-Only Preparation (Authorized Immediately)**:
  - Agent 9: React parity matrix drafting and benchmarking.
  - Agent 10: Direct Apex ingestion test fixture scaffolding.
  - Agent 5: Component bundle packaging and standalone verification.
  - Agent 8A: Command palette interaction specifications and hover card contracts.
- **Code-Modifying Implementation (Blocked Pending PO Approval)**:
  - Agent 1: Modifying project OWD and analyst permission set. (Blocked on `PO-DEC-V2-02`).
  - Agent 2: Modifying ingestion lifecycle picklists, payload caps, and chunk keys. (Blocked on `PO-DEC-V2-03`).
  - Agent 3: Exposing Apex REST ingestion resource. (Blocked on `PO-DEC-V2-01`).
  - Agent 4: CLI upload implementation. (Blocked on Agent 3 REST contract).
  - Agent 6: Modifying finding schema and persistence controller. (Blocked on `PO-DEC-V2-05`).
  - Agent 7: Project creation modal. (Blocked on Agent 1 & Agent 3).
  - Agent 8B: Creating command palette and graph hover components. (Blocked on separate PO authorization).

---

## 2. Safe Parallel Execution & Dispatch Gates

```
[PO Ratification Gate]
   ├── PO-DEC-V2-02 Approved ──> Dispatch Agent 1 (Security)
   │                                  │
   ├── PO-DEC-V2-03 Approved ──> Dispatch Agent 2 (Ingestion Lifecycle)
   │                                  │
   ├── PO-DEC-V2-01 Approved ──> Dispatch Agent 3 (Apex REST Transport)
   │                                  │
   │                                  ├──> Dispatch Agent 4 (Node CLI Client)
   │                                  └──> Dispatch Agent 7 (Project Create UI)
   │
   ├── PO-DEC-V2-05 Approved ──> Dispatch Agent 6 (Finding Persistence)
   │
   ├── PO-DEC-V2-04 Approved ──> Authorize Coordinator D1 Shell Mounting (river)
   │
   └── Separate PO Auth ───────> Dispatch Agent 8B (Command Palette Implementation)

[Unblocked Read-Only Stream]
   ├── Dispatch Agent 9 (Parity Benchmarking)
   ├── Dispatch Agent 10 (Test Scaffolding)
   ├── Dispatch Agent 5 (Component Package Prep)
   └── Dispatch Agent 8A (Command Palette Spec Prep)
```

---

## 3. Stop Conditions
All agents must stop when their assigned scope is completed, submit evidence packages, and await D1 joint acceptance and D2 independent verification.
