# WAVE 4 Regression and Change Scope Audit Report

## 1. Objective & Audit Principles
This document audits the Git diff, modified files, and change boundaries for Wave 4 offline hardening to confirm zero unauthorized modifications, strict adherence to project invariants, and clean isolation of the Salesforce POC.

## 2. Invariants & Scope Principles
1. **SELECTION ≠ NAVIGATION**: Project selection semantics and URL state routing in the Explorer React application were preserved without modification.
2. **Analysis Engine Neutrality**: No changes were made to the core Node.js analysis engine (`analyze/`), deterministic graph generators, or CLI utilities.
3. **No Org Authentication Attempts**: Confirmed zero calls to `sf org login`, `sf org create`, or `sf project deploy` during dispatch execution.
4. **Preservation of Four Vitest Baseline Failures**: Confirmed no test assertions in `ProjectContext.test.tsx` or `useViewState.test.ts` were weakened or skipped.
5. **Targeted POC Scope**: All modified files are strictly confined to `scratch/salesforce-poc/`.

## 3. Modified Files Register

| File Path | Change Category | Justification |
|---|---|---|
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js` | Bug Fix / Client Integrity | Added numeric coercion and boundary validation (`Number(expectedStartIndex)`) to `verifyChunkSequence`. |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | Enhancement / Race Condition Protection | Implemented `currentRequestId` sequence counter to discard stale in-flight fetches on project switch, and added `cyInstance.destroy()` cleanup. |
| `scratch/salesforce-poc/tests/run-poc-tests.cjs` | Test Suite Extension | Expanded test coverage from 10 to 16 offline tests, incorporating direct ES module imports, UTF-8 multibyte boundary checks, race condition simulation, and lifecycle cleanup assertions. |

## 4. Assessment of Legacy Components
- **`GraphDataController.cls` & `lwc/graphViewer`**: Evaluated legacy prototype components. These remain unreferenced by active POC components (`DAGraphController.cls` & `daGraphViewer`). They were left intact to maintain backward-compatibility with earlier POC research artifacts without introducing breaking changes.
