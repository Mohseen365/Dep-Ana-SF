# Wave 4 Implementation Brief — Lane A: Canonical Filter Schema and Contract

| Brief Attribute | Specification |
|---|---|
| **Lane ID** | `LANE-A` |
| **Objective** | Establish versioned v2 canonical filter schema, validation rules, preset serialization model, missing-coverage semantics, and contract test suite. |
| **Status** | **NOT AUTHORIZED FOR IMPLEMENTATION** (Draft Readiness Specification) |
| **Target Directory** | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/` |

---

## 1. Exact Scope & File Ownership

### Owned Files
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js` (NEW)
- `scratch/salesforce-poc/tests/contracts/canonical-filter-contract.test.cjs` (NEW)

### Prohibited Modifications
- MUST NOT modify Apex files (`DAUserPreferenceController.cls`).
- MUST NOT modify graph viewer (`daGraphViewer.js`).
- MUST NOT modify existing test runners (`run-poc-tests.cjs`, `run-workstream-a-tests.cjs`).

---

## 2. Interface Contracts & Key Tasks

1. Define `SCHEMA_VERSION = 2`.
2. Implement `validateFilterCriteria(criteria)` function ensuring all fields (`searchTerm`, `riskLevels`, `nodeTypes`, `layers`, `testCoverageStatus`, `findingsSeverity`, `findingsStatus`) are normalized arrays or strings.
3. Implement `normalizeLegacyV1Filter(v1Json)` to convert flat v1 filter objects into v2 preset container format.
4. Implement `getCanonicalDefaultFilter()` returning safe default criteria.
5. Define canonical test coverage values: `'COVERED'`, `'UNTESTED'`, `'AMBIGUOUS'`, `'UNKNOWN'`.
6. Write contract unit test suite (`canonical-filter-contract.test.cjs`).

---

## 3. Acceptance Criteria

- `daFilterSchema.js` successfully validates v2 filter payloads.
- Legacy v1 flat JSON payloads are upgraded to v2 without data loss.
- Malformed inputs produce clean fallback default filter criteria without throwing exceptions.
- Contract test suite passes 100%.
