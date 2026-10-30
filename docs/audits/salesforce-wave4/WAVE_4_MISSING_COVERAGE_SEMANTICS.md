# Wave 4 (`FEAT-STATE-03`): Missing Test-Coverage Semantics Specification

| Attribute | Value |
|---|---|
| **Inspection Date** | October 30, 2026 |
| **Branch** | `jules-17630609474842121823-74bd3cd3` |
| **HEAD Commit** | `9b1948f5faaa09116751b2e4a6ea67d5e9d4b220` |
| **Domain** | Test Coverage Classification & Visualization Contract |

---

## 1. Source Data Investigation Findings

Inspection of actual graph payloads (`explorer-data.json`, `daGraphPayloadLoader.js`, and AST exporter data) reveals the following coverage representation states across component nodes and findings:

- `testCoverageStatus`: String field present on component nodes.
- Valid enumerated values in graph schema:
  - `"COVERED"` / `"TESTED"`: Automated Apex/LWC unit test class exists and executes successfully.
  - `"UNTESTED"` / `"UNCOVERED"`: Explicitly evaluated by analyzer; zero test class coverage exists.
  - `"AMBIGUOUS"` / `"PARTIAL"`: Test coverage analysis detected ambiguous or partial test assertions.
- Missing/Null field representation:
  - Node has `testCoverageStatus: null` or field is absent entirely (e.g. static resources, custom metadata, or unanalyzed external entities).

---

## 2. Mandatory Architectural Invariant: Missing ≠ Untested

### Critical Rule
**Missing test-coverage information MUST remain strictly distinct from known coverage states.**
Missing or null coverage MUST NOT be automatically classified as `UNTESTED` or `AMBIGUOUS`.

Conflating missing data with `UNTESTED` causes false positive risk alerts, distorts health metrics, and misleads users during compliance audits.

---

## 3. Canonical Four-State Coverage Model

| State ID | Semantic Meaning | Canonical Value | Source Condition | Visual Badge / UI Representation | Filter Category |
|---|---|---|---|---|---|
| **State 1: Covered** | Valid automated test coverage confirmed | `"COVERED"` | `testCoverageStatus === 'COVERED'` or `'TESTED'` | Green Badge (`slds-badge_success`) "Tested" | Included in "Covered" filter |
| **State 2: Untested** | Formally analyzed; explicitly confirmed 0% test coverage | `"UNTESTED"` | `testCoverageStatus === 'UNTESTED'` or `'UNCOVERED'` | Red Badge (`slds-badge_error`) "Untested" | Included in "Untested" filter |
| **State 3: Ambiguous** | Formally analyzed; test relationships exist but coverage percentage is uncertain | `"AMBIGUOUS"` | `testCoverageStatus === 'AMBIGUOUS'` or `'PARTIAL'` | Yellow Badge (`slds-badge_warning`) "Ambiguous" | Included in "Ambiguous" filter |
| **State 4: Data Unavailable** | Coverage status not evaluated, inapplicable, or missing from export | `"UNKNOWN"` | `testCoverageStatus == null` or field missing | Neutral Grey Badge (`slds-badge_lightest`) "Coverage N/A" | Included in "Coverage Unavailable" filter |

---

## 4. View-Specific Rendering Guidelines

1. **Graph View (`daGraphViewer`):**
   - Nodes with `"UNKNOWN"` coverage render default node border styling without red/green coverage halo indicators.
   - Filtering by `"UNTESTED"` will NOT hide or select nodes with `"UNKNOWN"` coverage.

2. **Matrix View (`daMatrixViewer`):**
   - Cells corresponding to `"UNKNOWN"` coverage display `--` or a neutral icon with tooltip *"Coverage data not provided"*.

3. **Findings View (`daFindingsViewer`):**
   - Findings associated with entities having missing coverage display `"Data Unavailable"` status badge.
