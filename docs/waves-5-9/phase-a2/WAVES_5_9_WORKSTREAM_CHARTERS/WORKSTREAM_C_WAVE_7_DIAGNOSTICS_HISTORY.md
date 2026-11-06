# Workstream C Charter: Wave 7 — Historical Analysis & Diagnostics

## 1. Executive Summary & Purpose
Workstream C governs the historical analysis tracking and diagnostic scorecard capabilities for Dependency Analyzer Wave 7. It comprises the backend Apex historical run query controller (Contract A zero-schema adapter), the Diagnostics Scorecard component, the Architecture DNA Barcode component, and the chronological Analysis History timeline view.

## 2. Owning Role & Accountability
- **Accountable Role**: Workstream C Lead (`W7 Owner`)
- **Integration Authority**: Integration Coordinator / Integration Owner
- **Execution Mandate**: Phased parallel launch (`W7-P1`, `W7-1`, `W7-2` parallel; `W7-3` dependent on `W7-P1`).

## 3. Dependency Structure & Collision Prevention
- `W7-P1`, `W7-1`, and `W7-2` have zero overlapping file paths and zero mutual predecessor dependencies.
- `W7-3` (Analysis History View) depends functionally on `W7-P1` (Analysis Run Query Controller) to provide historical run records via Apex.
- **Shared Path Collisions**: ZERO (`NONE`) among all Workstream C tasks. Each task owns distinct component bundles or Apex classes.

### Execution Flow
```
[W7-P1: Apex History Controller] (READY_TO_LAUNCH)   ──┐
[W7-1: Diagnostics Scorecard]    (READY_TO_LAUNCH)     │
[W7-2: Architecture DNA Barcode] (READY_TO_LAUNCH)     │
                                                       ▼
[W7-3: Analysis History View]    (IMPLEMENTATION_DEPENDENT on W7-P1)
```

---

## 4. Task Catalog & Scope

### Task W7-P1: Analysis Run Query Controller (Contract A Zero-Schema)
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Parallel eligible)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/classes/DAAnalysisHistoryController.cls`
  - `scratch/salesforce-poc/force-app/main/default/classes/DAAnalysisHistoryController.cls-meta.xml`
  - `scratch/salesforce-poc/force-app/main/default/classes/DAAnalysisHistoryControllerTest.cls`
  - `scratch/salesforce-poc/force-app/main/default/classes/DAAnalysisHistoryControllerTest.cls-meta.xml`
  - `scratch/salesforce-poc/tests/run-w7-p1-tests.cjs`
- **Scope & Deliverables**: Expose `@AuraEnabled(cacheable=true) public static List<AnalysisRunDTO> getAnalysisRuns(Id projectId, Integer queryLimit)`. Query standard fields (`Id`, `Name`, `CreatedDate`, `CreatedById`, `DA_Project__c`) from existing `DA_Analysis_Run__c` object metadata. Zero unapproved schema fields. Return typed DTOs. Enforce strict CRUD/FLS and project isolation.

### Task W7-1: Diagnostics Scorecard Component
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Parallel eligible)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/daDiagnosticsView.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/daDiagnosticsView.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/daDiagnosticsView.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/daDiagnosticsView.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w7-1-tests.cjs`
- **Scope & Deliverables**: High-level health dashboard cards computing cyclic dependencies, isolated components, layer boundary violations, and test coverage density; read-only reactive rendering from `activeGraphPayload`.

### Task W7-2: Architecture DNA Barcode Component
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Parallel eligible)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/daArchitectureDnaBarcode.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/daArchitectureDnaBarcode.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/daArchitectureDnaBarcode.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/daArchitectureDnaBarcode.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w7-2-tests.cjs`
- **Scope & Deliverables**: Visual multi-band barcode strip visually encoding architecture composition (structural layer distribution, risk level, test density); interactive hover tooltips; canonical component name `daArchitectureDnaBarcode`.

### Task W7-3: Analysis History View Component
- **Register Status**: `IMPLEMENTATION_DEPENDENT`
- **Initial Eligibility**: `BLOCKED_ON_PREDECESSOR` (Requires W7-P1)
- **Predecessor Dependencies**: `W7-P1`
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryView/daAnalysisHistoryView.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryView/daAnalysisHistoryView.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryView/daAnalysisHistoryView.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryView/daAnalysisHistoryView.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w7-3-tests.cjs`
- **Scope & Deliverables**: Chronological analysis run selector timeline consuming `DAAnalysisHistoryController.getAnalysisRuns`; display run timestamp, author, and run status; dispatch `runselected` event for cross-component comparison.

---

## 5. Coordinator Protected Boundaries
Workstream C is strictly prohibited from touching:
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*` (Integration Coordinator Exclusive)
- `scratch/salesforce-poc/force-app/main/default/lwc/daFilterSchema.js`
- `scratch/salesforce-poc/tests/run-wave7-tests.cjs` (Aggregate Wave 7 Runner, owned by Coordinator)
- Existing Salesforce custom object definitions (e.g. `DA_Analysis_Run__c.object-meta.xml`) - Contract A mandates zero custom schema fields.
- Any component belonging to Workstreams A, B, D, or E.

## 6. Handoff & Acceptance Criteria
- Every task delivers: `task-<TASK_ID>.patch`, changed file manifest, and test execution logs demonstrating 100% pass on `run-w7-<n>-tests.cjs` and 100% pass across all 9 immutable baseline test suites.
- `W7-P1` Apex class must pass unit tests with 100% code coverage asserting `with sharing`, FLS checks, and project ID filtering.
- View mounting in `daAppShell` is deferred to `INT-1`.
