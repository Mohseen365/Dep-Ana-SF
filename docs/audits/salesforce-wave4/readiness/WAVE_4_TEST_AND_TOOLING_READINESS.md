# Wave 4 (`FEAT-STATE-03`): Test & Tooling Readiness Report

**Audit Date:** October 30, 2026
**Auditor:** Jules (Independent Migration Auditor)

---

## 1. Tooling & Environment Availability Matrix

| Tool / Dependency | Declared Status | Installed Version | Executable | Verification Command & Evidence |
|---|---|---|---|---|
| **Node.js Environment** | Declared | v22.22.1 | **YES** | `node -v` -> Output: `v22.22.1` |
| **npm Package Manager** | Declared | 11.11.0 | **YES** | `npm -v` -> Output: `11.11.0` |
| **Java JDK** | Declared | OpenJDK 21.0.10 | **YES** | `java -version` -> Output: `openjdk version "21.0.10"` |
| **Playwright E2E** | Declared | 1.64.1 | **YES** | `npx playwright --version` -> Output: `Version 1.64.1` |
| **Vitest Unit Test Runner** | Declared | 5.0.5 | **YES** | `npx vitest --version` -> Output: `vitest/5.0.5` |
| **Salesforce CLI (`sf`)** | Declared | Not Installed | **NO (Deferred)** | `sf --version` -> Command not found (Live org tasks deferred) |

---

## 2. Actual Executed Test Results

All offline test suites were executed in the sandbox environment.

```
================================================================================
Test Suite Name                                Executed Tests   Passed   Failed
================================================================================
1. Salesforce POC Suite (run-poc-tests.cjs)          43           43        0
2. Workstream A Suite (run-workstream-a-tests.cjs)  33           33        0
3. Workstream C Suite (run-workstream-c-tests.cjs)  18           18        0
4. Explorer Adapter (test-export-explorer.cjs)       15           15        0
5. Root CLI Baseline Suite (npm run test:cli)       115          115        0
--------------------------------------------------------------------------------
TOTAL OFFLINE REGRESSION SUITE PASS RATE            224          224        0 (100%)
================================================================================
```

### Key Category Breakdown
- **Salesforce POC (`run-poc-tests.cjs`):** 43/43 PASSED. Verified payload chunking, UTF-8 surrogate pair handling, Cytoscape mounting/teardown lifecycle, `daLayoutEngine` parity, and `ViewState` debounced saving.
- **Workstream A (`run-workstream-a-tests.cjs`):** 33/33 PASSED. Verified `daAppShell` navigation, project switching, preference loading/saving, stale response rejection, and `SELECTION ≠ NAVIGATION` invariant preservation.
- **Workstream C (`run-workstream-c-tests.cjs`):** 18/18 PASSED. Verified `DAUserPreferenceController` null-coalescing guards, empty string update semantics, payload size bounds (>131,072 rejection), and `DAAnnotationController` CRUD operations.
- **Explorer Adapter (`test-export-explorer.cjs`):** 15/15 PASSED. Verified data export adapters and JSON schema structure generation.
- **CLI Baseline (`npm run test:cli`):** 115/115 PASSED. Verified Node AST parsing, geometry calculations, and security boundary assertions.

---

## 3. Proposed Wave 4 Test Matrix

To guarantee complete quality coverage during Wave 4 implementation, the following new test scenarios must be implemented in `run-workstream-a-tests.cjs` and `run-poc-tests.cjs`:

| Scenario ID | Test Scope / Requirement | Verification Approach | Target Test File |
|---|---|---|---|
| **TEST-W4-01** | Multi-preset container JSON parsing & validation | Verify deserialization of v1 preset schema in `Filters_JSON__c` | `run-workstream-a-tests.cjs` |
| **TEST-W4-02** | Active preset selection restoration | Confirm active filters match preset criteria when `activePresetId` is set | `run-workstream-a-tests.cjs` |
| **TEST-W4-03** | Preset Creation (CRUD - Create) | Assert new preset addition generates unique ID and appends to `presets: []` | `run-workstream-a-tests.cjs` |
| **TEST-W4-04** | Preset Deletion (CRUD - Delete) | Assert deletion of active preset resets `activePresetId` to null without corrupting custom filters | `run-workstream-a-tests.cjs` |
| **TEST-W4-05** | Cross-view filter change event propagation | Verify `daAppShell` fires custom event when active filters change | `run-poc-tests.cjs` |
| **TEST-W4-06** | Stale preset save request rejection | Assert rapid project switch discards in-flight preset save responses | `run-workstream-a-tests.cjs` |
| **TEST-W4-07** | Payload length boundary protection (>131,072 chars) | Verify adding 100+ presets triggers graceful client-side truncation or error | `run-workstream-c-tests.cjs` |
| **TEST-W4-08** | Invariant Regression: `SELECTION ≠ NAVIGATION` | Verify filter preset selection does NOT navigate away from active view tab | `run-workstream-a-tests.cjs` |
| **TEST-W4-09** | Invariant Regression: Graph coordinate preservation | Verify saving a filter preset leaves `Positions_JSON__c` untouched | `run-workstream-c-tests.cjs` |
