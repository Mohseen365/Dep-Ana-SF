# Agent S1: Security Test Results

**Date:** 2026-11-09
**Execution Environment:** Node.js v22.22.1 (Offline Linux Sandbox)
**Harness Executed:** `scratch/salesforce-poc/tests/run-s1-security-tests.cjs` & Related Baseline Suites

---

## 1. Agent S1 Dedicated Security Test Suite (`run-s1-security-tests.cjs`)

```
===================================================================
Running Agent S1 Security Remediation & Regression Test Suite...
===================================================================

[Suite 1: SEC-01 Field-Level Security Verification]
  ✓ 1.1 Permission set XML exists and is valid metadata
  ✓ 1.2 Exactly 29 fields are granted FLS in DA_Architecture_Analyst (17 baseline + 12 remediated)
  ✓ 1.3 Master-Detail and Required fields are excluded from FLS entries

[Suite 2: SEC-02 Apex Security Test Coverage Verification]
  ✓ 2.1 DASchemaAndSecurityTest.cls contains test coverage for USER_MODE and remediated objects
  ✓ 2.2 DAGraphSecurityTest.cls validates multi-tenant isolation and restricted user access

[Suite 3: SEC-03 BroadcastChannel Isolation & Multi-Window Security]
  ✓ 3.1 daInvestigationDrawer.js includes _instanceId for echo suppression
  ✓ 3.2 handleBroadcastMessage rejects mismatched projectId
  ✓ 3.3 handleBroadcastMessage rejects echo from same instanceId
  ✓ 3.4 handleBroadcastMessage rejects stale messages older than 15s
  ✓ 3.5 handleBroadcastMessage rejects unauthorized or malformed action types
  ✓ 3.6 Outbound messages from handleDetach and notifyDetachedWindow include envelope metadata

===================================================================
Agent S1 Security Remediation Suite Results: 11 PASSED, 0 FAILED
===================================================================
Exit Code: 0
```

---

## 2. Workstream Regression Suite Executions

### 2.1 Task W8-1 Test Suite (`run-w8-1-tests.cjs`)
```
Running Task W8-1 (daInvestigationDrawer LWC) Test Suite...
===========================================================
  ✓ 1. Default state: no selected node renders empty state
  ✓ 2. Node metadata display & structural metrics calculation
  ✓ 3. Incident edges extraction (Inbound vs Outbound)
  ✓ 4. 1-Hop drill-down dispatches canonical nodeselect CustomEvent (CONTRACT-06)
  ✓ 5. Breadcrumb trail tracks history on drill-down and truncation on previous crumb jump
  ✓ 6. Stale selection suppression on graph reload
  ✓ 7. Pinning state invariant: preserves trail and dispatches pintoggle
  ✓ 8. Detached window BroadcastChannel cross-window IPC contract
  ✓ 9. Invariant: SELECTION != NAVIGATION preserved
  ✓ 10. Associated findings filtering by targetNodeId
===========================================================
Summary: 10 PASSED, 0 FAILED
Exit Code: 0
```

### 2.2 Workstream C Suite (`run-workstream-c-tests.cjs`)
```
Running Workstream C Offline Verification & Integration Suite...
===================================================================
[Category 1: FEAT-STATE-02 ViewState & Position Persistence Tests] (12 tests passed)
[Category 2: FEAT-DATA-02 User Annotations & Notes Tests] (6 tests passed)
[Category 3: LWC Annotation Panel Component Direct Unit Tests] (2 tests passed)
[Category 4: Production Apex Class Source Code Contract Verification] (1 test passed)
[Category 5: Workstream 6 daInvestigationDrawer LWC Unit Tests] (3 tests passed)
[Category 6: Workstream 6 Refactoring Engine & Pure Topological Math] (7 tests passed)
===================================================================
Summary: 31 PASSED, 0 FAILED
Exit Code: 0
```

### 2.3 Central Coordinator Integration Suite (`run-coordinator-integration-suite.cjs`)
```
Running Central Coordinator Integration Test Suite (INT-1)...
===================================================================
[Section 1: Shell Architecture & Contract Validation] (2 tests passed)
[Section 2: Shared Graph Payload Lifecycle] (2 tests passed)
[Section 3: View Navigation & Invariant Enforcement] (4 tests passed)
[Section 4: User Preference & Deduplication Discipline] (2 tests passed)
[Section 5: Project Switching & Lifecycle Safety] (2 tests passed)
[Section 6: Error Containment & Fallback UI States] (1 test passed)
===================================================================
Central Coordinator Integration Suite Results: 13 PASSED, 0 FAILED
Exit Code: 0
```

### 2.4 Salesforce POC Core Hardening Suite (`run-poc-tests.cjs`)
```
Running Salesforce POC Offline Verification & Hardening Test Suite...
===================================================================
Summary: 47 PASSED, 0 FAILED
Exit Code: 0
```

---

## 3. Pre-Remediation Auditor Suite Status (`run-b4-security-tests.cjs`)
Prior to remediation, `run-b4-security-tests.cjs` asserted that 12 fields were missing FLS and `daInvestigationDrawer` accepted messages without `projectId` validation. Following Agent S1's fixes, tests 1.5 and 2.2 fail as expected because the defects are now successfully remediated (29 fields are present and `projectId` validation is enforced). Suite 1.1-1.4, Suite 2.1, 2.3-2.4, Suite 3, and Suite 4 all pass (12 passed).
