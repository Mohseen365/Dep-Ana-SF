# DEC-W4-02: Cross-View Filter Semantics

| Document Attribute | Value |
|---|---|
| **Decision ID** | `DEC-W4-02` |
| **Title** | Cross-View Filter Semantics |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Required Approver** | Lead Architect |
| **Approval Status** | **PENDING** |
| **Approver Name** | _______________________ |
| **Approval Date** | _______________________ |
| **Governance Classification** | `APPROVAL RECORDED IN REPOSITORY — UNDERLYING HUMAN PROVENANCE NOT INDEPENDENTLY VERIFIED` |

---

## 1. Decision Question

How should shared filter criteria behave when navigating across Graph, Matrix, and Findings views in the Architecture Dependency Analyzer?

---

## 2. Background & Architectural Context

The application shell (`daAppShell`) serves as the top-level container holding active filter state. In the original web application (`explorer/`), users can navigate between three distinct views:
1. **Graph View (`daGraphViewer`):** Cytoscape-based interactive visual dependency graph.
2. **Matrix View (`daMatrixViewer`):** Grid/adjacency matrix representation showing source vs target component interactions.
3. **Findings View (`daFindingsViewer`):** Tabular list of architecture recommendations, security alerts, and compliance findings.

A key architectural distinction must be preserved: **A shared filter contract does NOT require identical internal implementation across views.** Each view is permitted to map canonical filter criteria to its own specialized data model, provided the documented semantics are consistently maintained.

---

## 3. Evaluation of Options

### Option A: Shared Canonical Filter Model with Strict Common Semantics (Recommended)

A single canonical filter state is owned by `daAppShell` and passed reactively to whichever view is currently active. When the user changes a filter selection or loads a preset, that change applies uniformly across Graph, Matrix, and Findings views.

#### Detailed Evaluation Matrix Criteria

1. **Consistency Between Views:**
   - **High.** Filtering for "High Risk Apex Classes" filters nodes in the Graph, row/column headers in the Matrix, and issue rows in Findings. Visual context is preserved when toggling tabs.
2. **Handling Unsupported Filter Attributes:**
   - If a view receives a filter criteria attribute that has no direct domain equivalent (e.g., `findingsSeverity` passed to `daGraphViewer`), the view ignores that specific attribute gracefully without throwing errors or clearing unrelated filters.
3. **View-Specific Field Translation:**
   - Each view translates canonical attributes into its local data structures via an explicit translation mapping layer.
4. **Missing Data Behavior:**
   - If a node or finding lacks a filtered attribute (e.g. `testCoverageStatus = null`), it is treated as `"UNTESTED"` or `"AMBIGUOUS"` based on explicit schema rules, ensuring deterministic evaluation.
5. **Filtering versus Highlighting:**
   - **Graph View:** Filters hide non-matching nodes/edges entirely from view while retaining active selection highlight anchors.
   - **Matrix View:** Filters hide non-matching rows and columns or gray out non-matching matrix cells.
   - **Findings View:** Filters hide non-matching finding rows from the table view.
6. **Cross-View State Restoration:**
   - Fast tab switching instantly re-evaluates the view against the active canonical filter state stored in `daAppShell`.
7. **Performance:**
   - High. Views re-filter in-memory collections locally upon receiving updated `@api filters` properties.
8. **Accessibility:**
   - Clear aria-live status updates announce the number of visible items remaining across each view.
9. **Testability:**
   - Highly testable in unit tests by passing fixture canonical filter objects to each view component adapter.

---

### Option B: Independent Per-View Filter Configurations

`daAppShell` maintains three isolated sub-filter payloads inside `Filters_JSON__c`:
```json
{
  "graphFilters": { ... },
  "matrixFilters": { ... },
  "findingsFilters": { ... }
}
```

#### Evaluation against Criteria
- **Consistency:** Low. Changing a filter in Graph View does not affect Matrix or Findings View, creating user confusion when switching tabs ("Why is Component X visible in Matrix but hidden in Graph?").
- **Complexity:** High. Requires tripling the filter state management logic and UI controls in `daAppShell`.
- **Payload Size:** Increases storage overhead in `Filters_JSON__c`.

---

## 4. Architectural Recommendation

**RECOMMENDATION: OPTION A (Shared Canonical Filter Model with Strict Common Semantics).**

Option A maintains a clean, predictable mental model for users and enforces single-source-of-truth state management in `daAppShell`.

---

## 5. Explicit Cross-View Field Mapping Table

The following explicit mapping table governs how each canonical filter attribute is interpreted across Graph, Matrix, and Findings views. Attributes marked as **UNSUPPORTED** must be ignored gracefully by the receiving view adapter.

| Canonical Filter Attribute | Description / Allowed Values | Graph View (`daGraphViewer`) | Matrix View (`daMatrixViewer`) | Findings View (`daFindingsViewer`) |
|---|---|---|---|---|
| **`search`** | Free-text string | Substring match against Node `displayName`, `name`, or `id`. Hides non-matching nodes. | Substring match against Row & Column component labels. Hides non-matching rows/cols. | Substring match against Finding `title`, `description`, or `componentName`. Hides non-matching rows. |
| **`riskLevels`** | Array of string: `["HIGH", "MEDIUM", "LOW"]` | Filter against `node.risk`. Hides non-matching nodes. | Filter against source/target component risk level. Hides cells where neither endpoint matches. | Filter against Finding `risk` or impact rating. Hides non-matching findings. |
| **`nodeTypes`** | Array of string: `["ApexClass", "ApexTrigger", "LWC", "Visualforce", "Flow", "CustomObject"]` | Filter against `node.type`. Hides non-matching nodes. | Filter against source and target component type. Hides non-matching rows/cols. | Filter against target component metadata type (`finding.componentType`). |
| **`layers`** | Array of string: `["Controller", "Service", "Data", "UI", "Domain"]` | Filter against `node.layer` or `node.category`. | Filter against source/target component layer. | Filter against target component layer (`finding.layer`). |
| **`testCoverageStatus`** | String enum: `"ALL"`, `"COVERED"`, `"UNTESTED"`, `"NO_TESTS"`, `"AMBIGUOUS"` | Filter against `node.refactoringReadiness.testCoverageStatus`. | Filter against source/target component test coverage. | **UNSUPPORTED** (Ignored by Findings view unless finding is explicitly tagged with coverage status). |
| **`findingsSeverity`** | Array of string: `["CRITICAL", "HIGH", "MEDIUM", "LOW"]` | **UNSUPPORTED** (Ignored by Graph view adapter). | **UNSUPPORTED** (Ignored by Matrix view adapter). | Filter against `finding.severity`. Hides non-matching finding rows. |
| **`findingsStatus`** | Array of string: `["OPEN", "RESOLVED", "WAIVED"]` | **UNSUPPORTED** (Ignored by Graph view adapter). | **UNSUPPORTED** (Ignored by Matrix view adapter). | Filter against `finding.status`. Hides non-matching finding rows. |

---

## 6. Consequences of Approval

- **Implementation Path:** `daAppShell` will dispatch a single canonical filter payload to all child views.
- **View Adapters:** `daGraphViewer`, `daMatrixViewer`, and `daFindingsViewer` will implement local predicate logic consuming the shared payload according to the mapping table above.
- **Test Matrix Impact:** Scenario TEST-W4-05 in `run-poc-tests.cjs` will assert that changing canonical filter criteria triggers re-evaluation across all active view adapters without throwing errors on unsupported attributes.

---

## 7. Approval Block

| Role | Name | Status | Signature / Date |
|---|---|---|---|
| **Lead Architect** | _______________________ | **PENDING** | _______________________ |
