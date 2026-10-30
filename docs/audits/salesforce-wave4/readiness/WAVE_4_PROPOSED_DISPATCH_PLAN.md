# Wave 4 (`FEAT-STATE-03`): Proposed Implementation Dispatch Plan

**Audit Date:** October 30, 2026
**Auditor:** Jules (Independent Migration Auditor)

---

## 1. Overview & Work Package Breakdown

Wave 4 implementation is structured into **9 sequential and parallel work packages (WPs)**. Implementation must strictly execute in order of dependency.

```
[WP 4.1: Filter Schema Contract & Validation]
                    |
                    v
[WP 4.2: Apex Controller & Preset DML Integration]
                    |
                    v
[WP 4.3: Application Shell Filter UI & Preset Manager LWC]
                    |
     +--------------+--------------+
     |                             |
     v                             v
[WP 4.4: Graph Filter Adapter]  [WP 4.5: Matrix/Findings Filter Adapters (Stubs)]
     |                             |
     +--------------+--------------+
                    |
                    v
[WP 4.6: Cross-View Filter Synchronization & Event Bus]
                    |
                    v
[WP 4.7: Automated Test Suite Expansion (Offline Regression)]
                    |
                    v
[WP 4.8: Frozen Architectural Invariants Verification]
                    |
                    v
[WP 4.9: Independent Wave 4 Closure Audit]
```

---

## 2. Work Package Specifications

### WP 4.1: Filter Schema Contract & Preset Serialization Engine
- **Objective:** Establish the canonical TypeScript interface and JSON schema validation engine for filter presets inside `Filters_JSON__c`.
- **Target Files:** `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
- **In-Scope:** Schema v1 container definition, default preset fallback logic, preset validation functions.
- **Prerequisites:** Owner sign-off on DEC-W4-01 (Option A container schema).
- **Acceptance Criteria:** `daAppShell.js` correctly parses, validates, and serializes multi-preset JSON structures.

### WP 4.2: Apex Controller & Long TextArea Payload Integration
- **Objective:** Verify and enhance `DAUserPreferenceController.cls` to ensure safe handling of multi-preset JSON payloads.
- **Target Files:** `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`
- **In-Scope:** Verification of null-coalescing guards, length limits (131,072 chars), and SOQL `WITH USER_MODE`.
- **Prerequisites:** WP 4.1.
- **Acceptance Criteria:** Offline Apex unit tests pass for multi-preset payload persistence and retrieval.

### WP 4.3: Application Shell Filter UI Bar & Preset Selector
- **Objective:** Add the top-level Filter Bar UI and Preset Selector modal/dropdown to `daAppShell`.
- **Target Files:** `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html`, `daAppShell.js`, `daAppShell.css`
- **In-Scope:** Quick search input, risk level checkboxes, layer dropdowns, saved preset selector, "Save as Preset" modal.
- **Prerequisites:** WP 4.1 & WP 4.2.
- **Acceptance Criteria:** User can select, create, apply, and delete presets within `daAppShell` UI.

### WP 4.4: Graph View Filter Integration Adapter
- **Objective:** Connect `daGraphViewer` to receive active filter criteria from `daAppShell` and update Cytoscape element visibility.
- **Target Files:** `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
- **In-Scope:** Reactive `@api filters` property, Cytoscape batch element hiding/showing, preservation of neighborhood highlighting on click.
- **Prerequisites:** WP 4.3.
- **Acceptance Criteria:** Toggling filters in `daAppShell` instantly updates visible nodes/edges in Cytoscape canvas without losing graph coordinates.

### WP 4.5: Matrix & Findings Filter View Adapters (Stubs)
- **Objective:** Create lightweight LWC view stubs for Matrix and Findings to consume shared filter criteria.
- **Target Files:** Create `daMatrixViewer` and `daFindingsViewer` LWCs in `scratch/salesforce-poc/force-app/main/default/lwc/`.
- **In-Scope:** Rendering summary filter status and filtered item counts.
- **Prerequisites:** WP 4.3.
- **Acceptance Criteria:** Both stubs receive and reflect active filter state from `daAppShell`.

### WP 4.6: Cross-View Filter Event Synchronization
- **Objective:** Ensure switching between Graph, Matrix, and Findings tabs preserves active filter selection seamlessly.
- **Target Files:** `daAppShell.js`
- **In-Scope:** Tab event handlers, state re-hydration upon tab switch.
- **Prerequisites:** WP 4.4 & WP 4.5.
- **Acceptance Criteria:** Toggling from Graph -> Matrix -> Findings retains exact filter state and active preset binding.

### WP 4.7: Automated Test Suite Expansion
- **Objective:** Author comprehensive unit tests covering all new filter preset scenarios.
- **Target Files:** `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`, `run-poc-tests.cjs`
- **In-Scope:** Adding scenarios TEST-W4-01 through TEST-W4-09.
- **Prerequisites:** WPs 4.1–4.6.
- **Acceptance Criteria:** Test suite expands from 33 to 42+ Workstream A tests, all 100% passing offline.

### WP 4.8: Frozen Architectural Invariants Verification
- **Objective:** Perform static code analysis and offline test verification for all 12 frozen architectural invariants.
- **Target Files:** Entire `scratch/salesforce-poc/` workspace.
- **Prerequisites:** WP 4.7.
- **Acceptance Criteria:** 100% verification that `SELECTION ≠ NAVIGATION`, coordinate integrity, and security boundaries remain uncompromised.

### WP 4.9: Independent Wave 4 Closure Audit
- **Objective:** Conduct an independent closure audit and produce final Wave 4 audit reports.
- **Target Directory:** `docs/audits/salesforce-wave4/closure/`
- **Prerequisites:** WPs 4.1–4.8.
- **Acceptance Criteria:** Independent auditor verifies offline pass rate, code quality, and issues official Wave 4 Closure Report.

---

## 3. Implementation Authorization Preconditions

Implementation of Wave 4 **must not commence** until:
1. Product Owner approves Decision DEC-W4-01 (Option A Enclosing Container Schema).
2. Lead Architect approves Decision DEC-W4-02 (Strict Common Subset Filter Policy).
3. Product Owner approves Decision DEC-W4-03 (Project-Scoped Preset Boundaries).
