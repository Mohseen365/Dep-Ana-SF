# Agent S1: Remaining Blockers Register

**Agent:** Agent S1 — Security Remediation Implementation Agent
**Date:** 2026-11-09
**Scope:** Wave 2A Security Remediation

---

## 1. Resolved Security Items (No Longer Blockers)

| Blocker ID | Original Ref | Description | Resolution Status |
| :--- | :--- | :--- | :--- |
| **BLK-SEC-01** | SEC-01 | Missing Field-Level Security in `DA_Architecture_Analyst` for 12 custom fields | **REMEDIATED** by Agent S1; all 12 fields granted read/write. |
| **BLK-SEC-02** | SEC-03 | `daInvestigationDrawer` BroadcastChannel accepts cross-project and unvalidated messages | **REMEDIATED** by Agent S1; hardened with instance echo rejection, project ID match, staleness filter, and schema check. |

---

## 2. Remaining External Architectural & Governance Blockers

The following items were identified by Agent B4 or exist in project governance and remain outside Agent S1's authorized scope:

| Blocker ID | Severity | Category | Description | Governance State | Resolution Path |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **BLK-SEC-03** | P2 | Apex / Hygiene | Legacy mock controller `GraphDataController.cls` remains in deployable metadata directory. | FROZEN_READ_ONLY / Unallocated | Retained to preserve baseline. Requires Project Owner signoff to deprecate or exclude in `.forceignore`. |
| **BLK-SEC-04** | P2 | Apex / Info Leak | `DAAnalysisHistoryController.cls` and other controllers expose raw `ex.getMessage()` to AuraHandledException. | Assigned to WS-5 Lead | Sanitization of exception strings across controller classes in Wave 5/7 backlog. |
| **BLK-ENV-01** | P1 | Packaging | Missing `.forceignore` and `package.xml` in `scratch/salesforce-poc/` creates risk of deploying quarantined Wave 9 components (`daRefactoringEngine`, `daRefactorHandoffModal`). | Quarantine Invariant | Release Engineering / Integration Coordinator must provision `.forceignore` under DEC-04. |
| **BLK-LWS-01** | P2 | LWS / Runtime | Multi-window BroadcastChannel behavior under live Lightning Web Security (LWS) distortions remains unverified on live org. | Environment Gate | Live-org smoke test once test org provisioning is authorized by Project Owner. |
