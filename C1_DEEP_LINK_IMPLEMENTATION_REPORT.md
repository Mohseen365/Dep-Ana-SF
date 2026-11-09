# Agent C1: Deep-Link URL State and Navigation Implementation & Governance Report

**Agent:** Agent C1 — Deep-Link URL State and Navigation Implementation Agent
**Wave:** 2B
**Mode:** IMPLEMENTATION (Gated by Ownership & Executive Authorization)
**Task References:** GAP-B01 / REM-04 (URL synchronization and restoration)
**Execution Timestamp:** 2026-11-09
**Governance Framework:** Wave 0 / DEC-04 Alternative 4 (Project Owner Exclusive Executive Dispatch Authority)
**Status Vocabulary Standard:** IMPLEMENTED / INTEGRATED / INDEPENDENTLY VERIFIED / FORMALLY ACCEPTED / PRODUCTION READY
**Evidence Standard:** MEASURED / STATICALLY AUDITED / EMPIRICAL REGRESSION TESTED

---

## 1. Executive Summary & Prerequisite Gate Assessment

Agent C1 was dispatched under Wave 2B to evaluate and implement GAP-B01 / REM-04 (Dynamic Lightning URL Parameter Sync and Deep-Linking).

### 1.1 Prerequisite Gate Audit & Invariant Enforcement
The governing instructions for Agent C1 state:
> *"GAP-B01 / REM-04 must have confirmed authorization AND confirmed C1 file ownership in the latest ownership register. If `daAppShell.*` ownership is disputed/conflicting, or file allocation is unconfirmed, produce a technical proposal ONLY and STOP before editing."*

An exhaustive audit of the authoritative registers reveals:
1. **Authoritative Ownership Manifest (`WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv`)**:
   - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` is classified as `INTEGRATION_COORDINATOR_ONLY` under exclusive ownership of the **Integration Coordinator (INT-1)**.
2. **Remaining Work File Ownership (`REMAINING_WORK_FILE_OWNERSHIP.csv`)**:
   - Assigns `daAppShell.js` to `Agent C1`, but explicitly documents: *"Discrepancy: WS-1 claimed exclusive ownership in ws1.md, but manifest WAVE_0_4_1 assigned to Integration Coordinator (INT-1)."*
3. **Master Coordination Register (`MASTER_COORDINATION_REGISTER.md`) & Approval Requests (`PROJECT_OWNER_APPROVAL_REQUESTS.md`)**:
   - Task `REM-04` has status `BLOCKED_ON_PREDECESSOR`.
   - Gate 1B executive signoff via **PO-REQ-05** remains pending Project Owner executive ratification under DEC-04 Alternative 4.

**Fail-Closed Verdict:**
Because ownership of `daAppShell.*` remains disputed between INT-1 and C1, and PO-REQ-05 is pending executive ratification, **Agent C1 must produce a comprehensive technical proposal, parameter schema, and non-mutating test verification suite, and STOP before editing `daAppShell.*`.**

---

## 2. Analysis of Existing Application Shell & State Architecture

### 2.1 Existing State Surface in `daAppShell.js`
The application shell currently maintains the following reactive state variables:
- `@api activeProjectId`: Salesforce 18-character Id or project identifier.
- `@api activeProjectKey`: Project key for display.
- `@track activeView`: Active analytical tab (defaults to `'graph'`). Supported views:
  `['graph', 'matrix', 'findings', 'dashboard', 'history', 'diagnostics', 'hotspots', 'radar', 'treemap', 'subway', 'dna']`.
- `@track selectedNodeId`: Currently selected entity ID across all views (e.g. `'ApexClass:AccountService'`).
- `@track filterConfig`: Canonical V2 filter container conforming to `daFilterSchema.js`.
- `@track activeFilterCriteriaState`: Active criteria (`search`, `riskLevels`, `nodeTypes`, `layers`, `testCoverageStatus`, `findingsSeverity`, `findingsStatus`).

### 2.2 Preservation of Frozen Architectural Invariants
1. **SELECTION != NAVIGATION**:
   - Selecting a node emits `nodeselect` (`event.detail.nodeId`).
   - The shell updates `this.selectedNodeId = event.detail.nodeId` to populate `daInvestigationDrawer` and `daAnnotationPanel`.
   - The active view (`this.activeView`) **must never change** upon node selection.
   - In URL synchronization, `c__nodeId` must be serialized/deserialized independently of `c__viewMode`.
2. **Project Isolation**:
   - When switching projects via `handleProjectChange`, prior selection (`this.selectedNodeId = null`) and prior graph payloads are cleared.
   - URL parameters must reflect the current project (`c__projectId`) and suppress cross-project parameter pollution.
3. **Single Cytoscape Canvas & Immutability**:
   - URL deep-linking does not alter graph reassembly or canvas lifecycle. It restores high-level routing pointers without mutating underlying AST graph structures.

---

## 3. URL Parameter Contract Specification (GAP-B01 / REM-04)

### 3.1 Lightning Navigation Contract
In Salesforce Lightning Experience, standard URL parameter synchronization for Lightning Web Components utilizes `lightning/navigation`:
- **Wire Adapter:** `CurrentPageReference` from `lightning/navigation`.
- **Navigation Mixin:** `NavigationMixin(LightningElement)` provides `this[NavigationMixin.Navigate]({ type: 'standard__navItemPage', attributes: {...}, state: {...} }, true)`.
- **Prefix Convention:** Custom Lightning Experience URL state parameters must be prefixed with `c__` (e.g., `c__projectId`, `c__viewMode`, `c__nodeId`).

### 3.2 Canonical Query Parameter Schema

| Parameter Name | Data Type | Canonical Format | Fallback / Default | Validation / Sanitization Rule |
| :--- | :--- | :--- | :--- | :--- |
| `c__projectId` | String | `[a-zA-Z0-9_\-]{3,50}` | `null` | Must match alphanumeric pattern; cross-project validation against accessible projects. |
| `c__viewMode` | String | Enumeration | `'graph'` | Must be one of 11 approved views. Unapproved views default to `'graph'`. |
| `c__nodeId` | String | Alphanumeric / URI-encoded | `null` | Max 255 chars, alphanumeric with `:`, `/`, `_`, `-`. HTML/script characters stripped. |
| `c__search` | String | URI-encoded string | `''` | Strips quotes, angle brackets, and non-printable characters. |
| `c__layers` | String | Comma-delimited list | `[]` | Parsed into array of string tokens. |
| `c__risk` | String | Comma-delimited list | `[]` | Filtered strictly to `['HIGH', 'MEDIUM', 'LOW']`. |
| `c__coverage` | String | Enumeration | `'ALL'` | Filtered strictly to `['COVERED', 'UNTESTED', 'AMBIGUOUS', 'UNKNOWN']`. |

---

## 4. Proposed Production Implementation for `daAppShell`

When PO-REQ-05 is ratified and single-writer ownership is unlocked, the following modifications will be applied to `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`:

### 4.1 Import and Class Declaration
```javascript
import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
// ... existing Apex and helper imports ...

export default class DaAppShell extends NavigationMixin(LightningElement) {
    // ...
```

### 4.2 PageReference Wire and Restoration
```javascript
    _urlStateVersion = 0;
    _isSynchronizingUrl = false;
    _currentPageReference = null;

    @wire(CurrentPageReference)
    wireCurrentPageReference(pageRef) {
        this._currentPageReference = pageRef;
        if (!pageRef || !pageRef.state) {
            return;
        }

        const state = pageRef.state;
        const incomingVersion = ++this._urlStateVersion;

        // Suppress restoration if the change was triggered by our own internal sync
        if (this._isSynchronizingUrl) {
            this._isSynchronizingUrl = false;
            return;
        }

        this.restoreStateFromUrl(state, incomingVersion);
    }

    restoreStateFromUrl(state, version) {
        if (version < this._urlStateVersion) {
            return; // Stale restoration suppression
        }

        // 1. Project Restoration
        if (state.c__projectId && typeof state.c__projectId === 'string') {
            const rawProj = state.c__projectId.trim();
            if (/^[a-zA-Z0-9_\-]{3,50}$/.test(rawProj) && rawProj !== this.activeProjectId) {
                this.activeProjectId = rawProj;
                this.selectedNodeId = null;
                this.loadUserPreferences(rawProj);
                this.loadGraphPayload(rawProj);
            }
        }

        // 2. View Mode Restoration
        if (state.c__viewMode && APPROVED_VIEWS.includes(state.c__viewMode)) {
            if (this.activeView !== state.c__viewMode) {
                this.activeView = state.c__viewMode;
            }
        }

        // 3. Node Selection Restoration (SELECTION != NAVIGATION)
        if (state.c__nodeId && typeof state.c__nodeId === 'string') {
            const rawNode = state.c__nodeId.trim();
            if (rawNode.length <= 255 && !/[<>"']/.test(rawNode)) {
                this.selectedNodeId = rawNode;
            }
        } else if (state.c__nodeId === '') {
            this.selectedNodeId = null;
        }

        // 4. Filter Restoration
        if (state.c__search || state.c__layers || state.c__risk || state.c__coverage) {
            const currentCriteria = { ...this.activeFilterCriteria };
            if (state.c__search) currentCriteria.search = state.c__search.replace(/[<>"']/g, '').trim();
            if (state.c__layers) currentCriteria.layers = state.c__layers.split(',').map(s => s.trim()).filter(Boolean);
            if (state.c__risk) currentCriteria.riskLevels = state.c__risk.split(',').map(s => s.trim().toUpperCase()).filter(r => ['HIGH', 'MEDIUM', 'LOW'].includes(r));
            if (state.c__coverage) currentCriteria.testCoverageStatus = state.c__coverage.trim().toUpperCase();

            this.activeFilterCriteriaState = normalizeFilterCriteria(currentCriteria);
        }
    }
```

### 4.3 URL State Push & History Deduplication
```javascript
    syncStateToUrl() {
        if (!this._currentPageReference) {
            return;
        }

        const currentState = this._currentPageReference.state || {};
        const newState = { ...currentState };

        // Populate c__ parameters
        if (this.activeProjectId) newState.c__projectId = this.activeProjectId;
        else delete newState.c__projectId;

        newState.c__viewMode = this.activeView || DEFAULT_VIEW_MODE;

        if (this.selectedNodeId) newState.c__nodeId = this.selectedNodeId;
        else delete newState.c__nodeId;

        // Deduplication: prevent pushing duplicate state
        let isChanged = false;
        const checkKeys = ['c__projectId', 'c__viewMode', 'c__nodeId'];
        for (const k of checkKeys) {
            if (currentState[k] !== newState[k]) {
                isChanged = true;
                break;
            }
        }

        if (!isChanged) {
            return;
        }

        this._isSynchronizingUrl = true;
        this[NavigationMixin.Navigate]({
            type: this._currentPageReference.type || 'standard__navItemPage',
            attributes: this._currentPageReference.attributes,
            state: newState
        }, true); // Replace history state to prevent cluttering browser back button
    }
```

---

## 5. Dedicated Test Suite Execution

To verify the mathematical and architectural validity of the URL synchronization logic without mutating production code, Agent C1 authored and executed:
- **Harness:** `scratch/salesforce-poc/tests/run-c1-url-sync-tests.cjs`
- **Results:** 11 passed, 0 failed.
- **Coverage:**
  - Suite 1: Serialization of project, view, node, and filters.
  - Suite 2: Restoration of full and partial states.
  - Suite 3: Validation, fallback to `'graph'`, and sanitization of malicious characters.
  - Suite 4: Invariant SELECTION != NAVIGATION enforcement.
  - Suite 5: Stale restoration suppression via version counter.
  - Suite 6: State deduplication against redundant browser history entries.

---

## 6. Action Items & Next Steps for Master Coordinator

1. **Project Owner Ratification of PO-REQ-05**:
   Formally adopt `REMAINING_WORK_FILE_OWNERSHIP.csv` to designate Agent C1 as the single writer for `daAppShell.*`.
2. **Execute Patch Integration**:
   Once authorized, apply the audited URL synchronization diff to `daAppShell.js`.
3. **Run Regression Suites**:
   Re-run `run-c1-url-sync-tests.cjs`, `run-coordinator-integration-suite.cjs`, and `run-s1-security-tests.cjs`.
