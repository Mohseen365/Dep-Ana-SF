# R1 Full Offline Regression Results

**Agent:** Agent R1 — Diagnostic Test Failure Remediation Engineer
**Role:** Diagnostic Test Failure Closure & Verification
**Base Commit / HEAD:** `dccc6950c919ad1dc0848b2105b891a05181156b`
**Execution Timestamp:** 2026-11-09 / 2026-11-10
**Test Directory:** `scratch/salesforce-poc/tests/`
**Execution Engine:** Node.js `v22.22.1`
**Final Status:** PASS

---

## 1. Executive Summary

A comprehensive offline regression execution was conducted across all 28 test suites in `scratch/salesforce-poc/tests/` following the remediation of `run-b4-security-tests.cjs`.

- **Total Test Suites Executed:** 28
- **Suites Passing:** 28 (100%)
- **Suites Failing:** 0 (0%)
- **Total Assertions Executed:** 408
- **Total Assertions Passing:** 408 (100%)
- **Total Assertions Failing:** 0 (0%)
- **Overall Exit Code:** 0

---

## 2. Test Suite Execution Matrix

| # | Test Suite Filename | Tests Passed | Tests Failed | Exit Code | Status | Verification Scope |
|:---:|:---|:---:|:---:|:---:|:---:|:---|
| 1 | `run-analysis-history-tests.cjs` | 13 | 0 | 0 | **PASS** | Historical runs, sorting, and comparelaunch events |
| 2 | `run-b4-security-tests.cjs` | 14 | 0 | 0 | **PASS** | Agent B4 security verification & invariant enforcer |
| 3 | `run-c1-url-sync-tests.cjs` | 11 | 0 | 0 | **PASS** | REM-04 URL parameter serialization/deserialization |
| 4 | `run-c4-export-tests.cjs` | 13 | 0 | 0 | **PASS** | REM-05 Canvas export, SVG generation, radial layout |
| 5 | `run-coordinator-integration-suite.cjs` | 13 | 0 | 0 | **PASS** | Central shell lifecycle, 11 views, SELECTION != NAVIGATION |
| 6 | `run-lane-a-schema-tests.cjs` | 9 | 0 | 0 | **PASS** | Field schemas, picklists, relationships |
| 7 | `run-lane-c-preset-manager-tests.cjs` | 10 | 0 | 0 | **PASS** | Preset management, V2 filter container persistence |
| 8 | `run-lane-d-graph-filter-tests.cjs` | 15 | 0 | 0 | **PASS** | Layer, degree, domain, risk filtering |
| 9 | `run-lane-e-matrix-tests.cjs` | 15 | 0 | 0 | **PASS** | Matrix cell calculation, density gradients, coupling |
| 10 | `run-lane-f-findings-tests.cjs` | 16 | 0 | 0 | **PASS** | Finding filters, severities, nodeselect interactions |
| 11 | `run-lwc-jest-tests.cjs` | 2 | 0 | 0 | **PASS** | LWC module imports and compilation |
| 12 | `run-p0-verification-tests.cjs` | 27 | 0 | 0 | **PASS** | P0 schema, ingestion service, chunk reassembly |
| 13 | `run-p1-header-tests.cjs` | 6 | 0 | 0 | **PASS** | Header component layout, title, and buttons |
| 14 | `run-p1-sidebar-tests.cjs` | 6 | 0 | 0 | **PASS** | Sidebar navigation, view modes, collapse/expand |
| 15 | `run-poc-tests.cjs` | 47 | 0 | 0 | **PASS** | Core Cytoscape rendering, layout algorithms, data adapters |
| 16 | `run-s1-security-tests.cjs` | 11 | 0 | 0 | **PASS** | Agent S1 security remediation verification harness |
| 17 | `run-w5-1-tests.cjs` | 18 | 0 | 0 | **PASS** | W5-1 Shell Layout Switcher lifecycle & preferences |
| 18 | `run-w6-1-tests.cjs` | 10 | 0 | 0 | **PASS** | W6-1 Dependency Matrix interactive view |
| 19 | `run-w6-2-tests.cjs` | 7 | 0 | 0 | **PASS** | W6-2 Treemap visualization and hierarchical navigation |
| 20 | `run-w6-3-tests.cjs` | 7 | 0 | 0 | **PASS** | W6-3 Subway map layout and transit line tracing |
| 21 | `run-w6-4-tests.cjs` | 8 | 0 | 0 | **PASS** | W6-4 Architecture Hotspots risk analysis |
| 22 | `run-w7-1-tests.cjs` | 7 | 0 | 0 | **PASS** | W7-1 System Diagnostics and metric thresholds |
| 23 | `run-w7-2-tests.cjs` | 7 | 0 | 0 | **PASS** | W7-2 Architecture DNA Barcode visualization |
| 24 | `run-w8-1-tests.cjs` | 10 | 0 | 0 | **PASS** | W8-1 Architectural Radar view |
| 25 | `run-wave4-integration-suite.cjs` | 32 | 0 | 0 | **PASS** | Wave 4 integrated feature suite & cross-view flows |
| 26 | `run-workstream-a-tests.cjs` | 33 | 0 | 0 | **PASS** | Workstream A graph enhancements & layouts |
| 27 | `run-workstream-c-tests.cjs` | 31 | 0 | 0 | **PASS** | Workstream C core analytical view suite |
| 28 | `run-ws5-tests.cjs` | 10 | 0 | 0 | **PASS** | Workstream 5 historical analysis comparison |
| **TOTAL** | **28 Suites** | **408** | **0** | **0** | **ALL PASS** | **100% Pass Rate** |

---

## 3. Detailed Output of Remediated Runner

```text
===================================================================
Running Agent B4 Security Verification & Regression Test Suite...
===================================================================

[Suite 1: SEC-01 Field-Level Security Verification]
  ✓ 1.1 Permission set XML is syntactically valid and has basic structure
  ✓ 1.2 Custom field inventory across all 6 DA objects totals 35 fields
  ✓ 1.3 Master-Detail fields (4 total) are properly classified and excluded from FLS eligibility
  ✓ 1.4 Required fields (6 total) are properly classified according to Salesforce metadata rules
  ✓ 1.5 Remediated FLS verification: All 29 eligible fields granted in DA_Architecture_Analyst (0 missing)

[Suite 2: SEC-02 BroadcastChannel Isolation & Multi-Window Security]
  ✓ 2.1 daInvestigationDrawer.js exists and initializes BroadcastChannel correctly
  ✓ 2.2 Verification: handleBroadcastMessage validates projectId and rejects cross-project messages
  ✓ 2.3 BroadcastChannel specification disclosure: origin and source properties do NOT exist
  ✓ 2.4 Recommended hardening validator rejects cross-project messages and malformed payloads

[Suite 3: SEC-03 Prototype Controller Reference & Isolation Audit]
  ✓ 3.1 GraphDataController.cls exists and is confirmed as a prototype mock stub
  ✓ 3.2 Production LWC components have ZERO imports of GraphDataController
  ✓ 3.3 Production Apex controllers have ZERO references to GraphDataController

[Suite 4: SEC-04 Exception Detail Exposure Static Analysis]
  ✓ 4.1 DAAnalysisHistoryController concatenates raw ex.getMessage() into AuraHandledException
  ✓ 4.2 Survey all AuraHandledException occurrences across all controllers

===================================================================
Agent B4 Security Verification Suite Results: 14 PASSED, 0 FAILED
===================================================================
```
