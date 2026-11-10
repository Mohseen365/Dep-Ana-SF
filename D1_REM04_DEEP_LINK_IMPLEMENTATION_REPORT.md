# D1 REM-04 Deep-Link Implementation Report

**Role:** D1 — Master Integration Coordinator
**Task:** REM-04 (Deep-Link URL State Synchronization)
**Assigned Owner:** Coordinator-Exclusive (Agent D1 / INT-1)
**Target Path:** `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
**Date:** 2026-11-10
**Status:** **IMPLEMENTED & VERIFIED**

---

## 1. Architecture & Design Principles

Under DEC-04 Alternative 4 and the authoritative file ownership manifest, `daAppShell.*` is coordinator-exclusive. Task REM-04 requires implementing deep-link URL state synchronization without:
1. Violating the frozen invariant `SELECTION != NAVIGATION`.
2. Creating a second source of truth for graph payloads.
3. Breaking backwards compatibility with frozen offline test runners (`run-wave4-integration-suite.cjs`, `run-workstream-a-tests.cjs`).
4. Generating redundant browser history entries.
5. Permitting XSS / script injection via URL parameters.

---

## 2. Parameter Schema & Specification

Custom Lightning Experience URL parameters must use the `c__` prefix convention:

| URL Parameter | Data Type | Canonical Description | Sanitization / Validation Rule | Fallback Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `c__projectId` | String | Active project ID or key | Alphanumeric `^[a-zA-Z0-9_\-]{3,50}$` | Ignored if invalid |
| `c__viewMode` | String | Active analytical view mode | Strict membership in `APPROVED_VIEWS` | Falls back safely to `'graph'` |
| `c__nodeId` | String | Selected entity identifier | Max 255 chars, strip `<>"'` | Rejected if malicious |
| `c__search` | String | Active filter text query | Strip `<>"'` | Cleared if empty |
| `c__layers` | String | Comma-delimited layer list | Array split and trimmed | `[]` |
| `c__risk` | String | Comma-delimited risk levels | Filtered strictly to `HIGH,MEDIUM,LOW` | `[]` |
| `c__coverage` | String | Coverage status | Strict enum: `COVERED,UNTESTED,AMBIGUOUS,UNKNOWN` | `'ALL'` |

---

## 3. Implementation Details in `daAppShell.js`

### 3.1 State Tracking Variables
- `_urlStateVersion`: Monotonic integer incremented on every deserialization to suppress stale out-of-order restorations.
- `_isSynchronizingUrl`: Boolean re-entrancy guard to prevent circular updates during URL synchronization.
- `_currentUrlState`: Cached dictionary of current URL parameters for deduplication.

### 3.2 Methods Added to `DaAppShell`
- `serializeUrlState(options)`: Compiles the current reactive properties (`activeProjectId`, `activeView`, `selectedNodeId`, `activeFilterCriteria`) into a clean dictionary of `c__` URL parameters.
- `deserializeUrlState(rawState, currentVersion)`: Validates and sanitizes parameters, returning a normalized state container or `{ isStale: true }` if superseding state exists.
- `restoreStateFromUrl(state, incomingVersion)`: Restores project, view mode, selected node, and filter criteria without violating invariants.
- `isEqualUrlState(stateA, stateB)`: Performs key-value equality check across all `c__` parameters to detect matching state.
- `syncStateToUrl()`: Serializes state, verifies whether parameters changed via `isEqualUrlState`, and updates `window.history.replaceState` safely in browser environments without cluttering the back button.

### 3.3 Event Hook Integration
`syncStateToUrl()` is triggered systematically upon:
- `switchView(targetView)`: Updates `c__viewMode`.
- `handleProjectChange(event)`: Updates `c__projectId` and resets `c__nodeId`.
- `handleNodeSelect(event)`: Updates `c__nodeId`.
- `handleFilterChange(event)`: Updates criteria (`c__search`, `c__layers`, `c__risk`, `c__coverage`).
- `handleContainerChange(event)`: Updates persisted filter container state.

---

## 4. Preservation of Frozen Invariants

### 4.1 Invariant: `SELECTION != NAVIGATION`
- When `handleNodeSelect` fires, `selectedNodeId` is updated and serialized to `c__nodeId`.
- `activeView` remains completely unchanged.
- When `switchView` fires, `activeView` changes and is serialized to `c__viewMode`.
- `selectedNodeId` is retained and preserved in the URL.
- Verified in `run-c1-url-sync-tests.cjs` Suite 4 and `run-coordinator-integration-suite.cjs` Section 7.1.

### 4.2 Invariant: Project Isolation
- When switching projects, prior node selection is cleared (`this.selectedNodeId = null`).
- URL synchronization removes `c__nodeId` and sets the new `c__projectId`.

---

## 5. Verification Evidence

- `scratch/salesforce-poc/tests/run-c1-url-sync-tests.cjs`: **11/11 PASSED** (Serialization, restoration, sanitization, invariants, deduplication).
- `scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs`: **16/16 PASSED** (All 7 sections green, including Section 7 coordinator deep-link tests).
- `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs`: **32/32 PASSED**.
- `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`: **33/33 PASSED**.
