# D1 Master Integration Full Regression Results

**Date:** 2026-11-09
**Coordinator:** Agent D1 — Master Integration Coordinator
**Wave:** 3A
**Baseline Integration HEAD:** `6e31a245764c0f94d842db1693fd754fc3f4bfa1`
**Test Harness Count:** 28 suites

## 1. Executive Summary of Regression Execution

All 28 offline test suites residing in `scratch/salesforce-poc/tests/` were executed in a clean room sweep.
- **27 suites passed with zero failures** (394 tests passed).
- **1 suite (`run-b4-security-tests.cjs`) returned exit code 1 with 2 failing diagnostic assertions** (12 passed, 2 failed).
  - *Root Cause Analysis:* As documented by Agent B4 and independently validated by Agent V1 and S1, `run-b4-security-tests.cjs` was written as a pre-remediation diagnostic probe that explicitly asserts that 12 FLS fields are *missing* and that `handleBroadcastMessage` *fails* to validate `projectId`. Because Agent S1 remediated both defects in PR #158 (granting all 29 fields and adding strict `projectId` validation), `run-s1-security-tests.cjs` passes 11/11, while the historical diagnostic probe reflects that the defects have been remediated.
- **Total Test Outcomes across all 28 suites:** 406 passed, 2 negative diagnostic failures.

## 2. Test Suite Execution Matrix

| Test Suite | Status | Exit Code | Tests Passed | Tests Failed | Duration (ms) | Category / Notes |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| `run-analysis-history-tests.cjs` | **PASS** | `0` | 13 | 0 | 45ms | WS-5 Historical Runs |
| `run-b4-security-tests.cjs` | **DIAGNOSTIC_FAIL** | `1` | 12 | 2 | 53ms | Agent B4 Diagnostic Probe (pre-remediation baseline) |
| `run-c1-url-sync-tests.cjs` | **PASS** | `0` | 11 | 0 | 46ms | Agent C1 Deep-Link URL State Harness |
| `run-c4-export-tests.cjs` | **PASS** | `0` | 13 | 0 | 301ms | Agent C4 Canvas Export & Viewport Perf |
| `run-coordinator-integration-suite.cjs` | **PASS** | `0` | 13 | 0 | 61ms | Central Coordinator E2E Shell Integration |
| `run-lane-a-schema-tests.cjs` | **PASS** | `0` | 9 | 0 | 53ms | Lane A Filter Schema |
| `run-lane-c-preset-manager-tests.cjs` | **PASS** | `0` | 10 | 0 | 53ms | Lane C Preset Manager |
| `run-lane-d-graph-filter-tests.cjs` | **PASS** | `0` | 15 | 0 | 67ms | Lane D Graph Filter Criteria |
| `run-lane-e-matrix-tests.cjs` | **PASS** | `0` | 15 | 0 | 59ms | Lane E Matrix Analytical View |
| `run-lane-f-findings-tests.cjs` | **PASS** | `0` | 16 | 0 | 64ms | Lane F Findings Datatable |
| `run-lwc-jest-tests.cjs` | **PASS** | `0` | 2 | 0 | 44ms | LWC Jest Offline Stub Harness |
| `run-p0-verification-tests.cjs` | **PASS** | `0` | 27 | 0 | 44ms | P0 Baseline Invariants & Payloads |
| `run-p1-header-tests.cjs` | **PASS** | `0` | 6 | 0 | 43ms | P1 Header Component |
| `run-p1-sidebar-tests.cjs` | **PASS** | `0` | 6 | 0 | 43ms | P1 Sidebar Navigation |
| `run-poc-tests.cjs` | **PASS** | `0` | 47 | 0 | 1768ms | Core POC & Cytoscape Viewport Suite |
| `run-s1-security-tests.cjs` | **PASS** | `0` | 11 | 0 | 49ms | Agent S1 Security Remediation Suite |
| `run-w5-1-tests.cjs` | **PASS** | `0` | 18 | 0 | 847ms | Task W5-1 Shell Layout Switcher |
| `run-w6-1-tests.cjs` | **PASS** | `0` | 10 | 0 | 65ms | Task W6-1 Radar View Contract Verification |
| `run-w6-2-tests.cjs` | **PASS** | `0` | 7 | 0 | 66ms | Task W6-2 Treemap View Component |
| `run-w6-3-tests.cjs` | **PASS** | `0` | 7 | 0 | 53ms | Task W6-3 Subway View Component |
| `run-w6-4-tests.cjs` | **PASS** | `0` | 8 | 0 | 54ms | Task W6-4 Hotspots View Component |
| `run-w7-1-tests.cjs` | **PASS** | `0` | 7 | 0 | 53ms | Task W7-1 Diagnostics View Component |
| `run-w7-2-tests.cjs` | **PASS** | `0` | 7 | 0 | 64ms | Task W7-2 Architecture DNA Barcode |
| `run-w8-1-tests.cjs` | **PASS** | `0` | 10 | 0 | 51ms | Task W8-1 Investigation Drawer Component |
| `run-wave4-integration-suite.cjs` | **PASS** | `0` | 32 | 0 | 74ms | Wave 4 Integration Suite (32 Invariants) |
| `run-workstream-a-tests.cjs` | **PASS** | `0` | 33 | 0 | 75ms | Workstream A App Shell & State |
| `run-workstream-c-tests.cjs` | **PASS** | `0` | 31 | 0 | 110ms | Workstream C Persistence & Annotations |
| `run-ws5-tests.cjs` | **PASS** | `0` | 10 | 0 | 58ms | Workstream 5 Dashboard & Dual Snapshot Diff |

## 3. Benchmark Execution Summary

Benchmarks executed via `node wave1/B2/bench/run-benchmarks.cjs`:
- **PBIM Project (528 nodes, 2063 edges, 4.25 MB explorer-data, 33 chunks):** Layout, reassembly, and serialization verified within performance bounds.
- **CST Project (240 nodes, 1024 edges, 1.86 MB explorer-data, 15 chunks):** Verified.
- **BQC Project (274 nodes, 603 edges, 1.33 MB explorer-data, 11 chunks):** Verified.
- **Synthetic 10 MB Payload Cap Boundary (10,485,760 chars, 80 chunks):** Chunk boundary reassembly strictly validated without memory corruption or surrogate truncation.

## 4. Frozen Architectural Invariants Verification

| Invariant | Status | Verification Suite & Mechanism |
|:---|:---:|:---|
| **SELECTION != NAVIGATION** | **VERIFIED** | Verified in `run-coordinator-integration-suite.cjs` Test 12, `run-workstream-a-tests.cjs` Test 10, `run-w8-1-tests.cjs` Test 9, and `run-c4-export-tests.cjs` Test 9. Selecting nodes dispatches canonical CustomEvents without altering shell view route. |
| **Canonical Graph Payload Immutability** | **VERIFIED** | Verified in `run-c4-export-tests.cjs` Test 10 and `run-wave4-integration-suite.cjs` Test 2. Components operate on shared read-only payloads without mutation. |
| **Project Isolation** | **VERIFIED** | Verified in `run-s1-security-tests.cjs` Suite 2 & 3, `run-workstream-c-tests.cjs` Tests 3 & 12, and `run-ws5-tests.cjs` Test 2. Zero cross-project leakage. |
| **Single Cytoscape Canvas** | **VERIFIED** | Verified in `run-c4-export-tests.cjs` Test 12 and `run-poc-tests.cjs`. Exactly one canvas element mounted. |
| **Stale-Response Suppression** | **VERIFIED** | Verified in `run-workstream-a-tests.cjs` Test 16 and `run-workstream-c-tests.cjs` Test 16 via incrementing request tokens. |
| **Pure Simulation Isolation** | **VERIFIED** | Verified in `run-workstream-c-tests.cjs` Test 22. Quarantined W9 simulation logic does not mutate base graph data. |
| **UTF-8 and Chunk-Boundary Safety** | **VERIFIED** | Verified in `run-p0-verification-tests.cjs` and `run-benchmarks.cjs`. Reassembly preserves code unit boundaries across 131,072 char limits. |
| **Payload Cap 10,485,760 Units** | **VERIFIED** | Verified in `run-ws5-tests.cjs` and `run-benchmarks.cjs`. Maximum total size enforced. |
