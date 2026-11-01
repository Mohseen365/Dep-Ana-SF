# Wave 0: Cross-Wave Testing and Regression Plan

> **RECONCILIATION NOTICE (RECONCILED BY WAVE 0.2):**
> Test baseline execution figures (187 test cases across 9 suites), empirical 3-run stability, and browser tooling facts (Playwright v1.64.1 & Chromium v145.0.7632.6 available; sfdx-lwc-jest missing) are authoritatively reconciled in `WAVE_0_2_TEST_STABILITY_AND_BROWSER_TOOLING_VERIFICATION.md`.

**Status:** APPROVED MANDATORY TEST FRAMEWORK
**Coordinator:** Independent Quality Gate Owner & Lead Test Architect

---

## 1. Test Architecture Overview

Quality verification is divided into two continuous tiers:
1. **Per-Lane Offline Unit Test Suites:** Independent test runners created by each workstream testing components against synthetic DOM environments without Salesforce org deployment.
2. **Authoritative Cross-Wave Integration Suite:** Central regression harness verifying end-to-end component lifecycle, state persistence, and invariant protection.

---

## 2. Baseline Test Suites & Verification

The existing 9 offline test suites form the unbreakable regression baseline:
- `scratch/salesforce-poc/tests/run-poc-tests.cjs` (43 tests)
- `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` (32 tests)
- `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` (9 tests)
- `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` (10 tests)
- `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` (15 tests)
- `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` (11 tests)
- `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` (12 tests)
- `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` (33 tests)
- `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` (22 tests)

**Total Baseline Test Executions:** 187 Passing Tests. Any failure across these 187 tests constitutes an immediate release blocker.

---

## 3. Workstream-Specific Testing Requirements

### 3.1 Workstream A (Wave 5: Deep Graph Capabilities)
- **Target Suite:** `scratch/salesforce-poc/tests/run-wave5-deep-graph-tests.cjs`
- **Required Test Scenarios:**
  1. Switching between Architecture, Orbit, Constellation, and Sankey layouts produces valid coordinates.
  2. Manual node position overrides in `Positions_JSON__c` are respected and not overwritten by auto-layout unless user triggers reset.
  3. Viewport zoom/pan is preserved across layout toggles.
  4. Upstream traversal isolates all transitive callers of a target node.
  5. Downstream traversal isolates all transitive callees of a target node.
  6. $N$-hop neighborhood focus correctly caps traversal depth.
  7. Blast radius calculation reflects transitive impact scores accurately.
  8. Node and edge hover cards unmount cleanly without memory leaks.
  9. Invariant 1 (`SELECTION ≠ NAVIGATION`) holds during focus and traversal actions.

### 3.2 Workstream B (Wave 6: Core Analytical Views)
- **Target Suite:** `scratch/salesforce-poc/tests/run-wave6-analytical-views-tests.cjs`
- **Required Test Scenarios:**
  1. **Radar View:** Generates balanced polygon geometry across complexity, coupling, and coverage axes; handles zero-value metrics gracefully.
  2. **Treemap View:** Partitions nodes into hierarchical rectangular squarified layout; scales area by LOC or coupling; handles empty layers safely.
  3. **Subway View:** Renders linear flow paths and transfer stations; handles cyclical graphs without infinite rendering loops.
  4. **Hotspots View:** Correctly flags nodes matching `coupling > 15 || fanIn > 10`; sorts hotspots deterministically by criticality.
  5. **Canonical Filter Conformance:** All four views filter identical node subsets when supplied standard `filterCriteria`.

### 3.3 Workstream C (Wave 7: Diagnostics, DNA & Analysis History)
- **Target Suite:** `scratch/salesforce-poc/tests/run-wave7-diagnostics-tests.cjs` & Apex unit tests (`DAGraphControllerTest.cls`)
- **Required Test Scenarios:**
  1. **Task W7-P1 Apex Endpoint:** Validates `getAnalysisRuns` enforces user mode, returns max requested runs, respects project boundaries, and throws `AuraHandledException` on blank project ID.
  2. **Diagnostics View:** Accurately tallies total classes, triggers, cyclic paths, and unresolved references.
  3. **Architecture DNA Barcode:** Generates discrete colored bands representing architecture layer ratios and risk indicators.
  4. **History Timeline:** Renders chronological runs, displays run metadata, and dispatches `runselect` event without triggering navigation.

### 3.4 Workstream D (Wave 8: Investigation Drawer & Compare)
- **Target Suite:** `scratch/salesforce-poc/tests/run-wave8-investigation-tests.cjs`
- **Required Test Scenarios:**
  1. Multi-node pinning maintains state without mutating active selection or Cytoscape layout.
  2. `daDiffEngine`: Accurately identifies added nodes, removed nodes, modified attributes, and modified edges between two benchmark payloads.
  3. Map-based diff handles payloads with 1,000+ nodes in $< 100\text{ms}$.
  4. Diff view operates on single canvas or tabular mode without dual Cytoscape instances.
  5. Stale snapshot fetch responses are discarded when run selection changes rapidly.

### 3.5 Workstream E (Wave 9: Refactoring Simulation & Handoff)
- **Target Suite:** `scratch/salesforce-poc/tests/run-wave9-refactoring-tests.cjs`
- **Required Test Scenarios:**
  1. `daRefactoringEngine`: Simulating node removal updates fanIn/fanOut metrics on dependent nodes in memory.
  2. Original graph payload remains 100% immutable and identical before and after simulation runs.
  3. Cycle elimination calculator correctly reports broken cycles upon simulated edge decoupling.
  4. Proposal export generates valid Markdown and JSON schemas.
  5. Zero Apex DML calls occur during any simulation action.
