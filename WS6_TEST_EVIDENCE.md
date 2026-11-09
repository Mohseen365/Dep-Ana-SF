# Workstream 6 (WS-6) Test Evidence

## 1. Test Suite Summary
- **Primary WS-6 Test Suite:** `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`
- **Dedicated Task W8-1 Runner:** `scratch/salesforce-poc/tests/run-w8-1-tests.cjs`
- **Total Test Runners Verified in Repository:** 21 runners
- **Total Passing Scenarios:** 100% (0 failures, 0 regressions)

---

## 2. Test Execution Output: `run-workstream-c-tests.cjs`

```text
Running Workstream C Offline Verification & Integration Suite...
===================================================================

[Category 1: FEAT-STATE-02 ViewState & Position Persistence Tests]
  ✓ 1. First-use behavior: returns null when no saved preference exists
  ✓ 2. Saving and loading valid node positions and view state
  ✓ 3. Project and user isolation: preferences are strictly scoped
  ✓ 4. Project switch during save/load rejects cross-project pollution
  ✓ 5. Malformed JSON payload detection and rejection
  ✓ 6. Oversized JSON payload detection and rejection (>131072 chars) - R4 Boundary Verification
  ✓ 7. Blank or missing Project ID rejection
  ✓ 7a. Null arguments preserve existing saved preference values (Null-Coalescing Guard)
  ✓ 7b. Empty string parameter updates field value and is not treated as null
  ✓ 7c. R1: V1 filter save over existing V2 container preserves presets and activePresetId set to null
  ✓ 7d. R1: Incoming V2 container replaces existing container atomically
  ✓ 7e. R1: Empty string clears Filters_JSON__c and null preserves stored value
  ✓ 7f. R1: Malformed and unsupported schema fail closed and preserve existing data

[Category 2: FEAT-DATA-02 User Annotations & Notes Tests]
  ✓ 8. Creating and loading node annotations for specific project
  ✓ 9. Updating annotation text, status, and resolved timestamp
  ✓ 10. Deleting annotation record
  ✓ 11. Input validation: missing required fields and length limits
  ✓ 12. Project switch isolation: annotations from project A do not leak to project B
  ✓ 13. Selection Invariant Check: Annotation interactions do NOT mutate active project or view (SELECTION != NAVIGATION)

[Category 3: LWC Annotation Panel Component Direct Unit Tests]
  ✓ 14. daAnnotationPanel: fetching and creating annotations via LWC component
  ✓ 16. daAnnotationPanel: stale request response rejection on rapid node change

[Category 4: Production Apex Class Source Code Contract Verification]
  ✓ 15. Production Apex Source Contracts: DAUserPreferenceController.cls & DAAnnotationController.cls

[Category 5: Workstream 6 daInvestigationDrawer LWC Unit Tests]
  ✓ 17. daInvestigationDrawer: Node metadata, fan-in/fan-out, and incident edge extraction
  ✓ 18. daInvestigationDrawer: 1-hop drill-down and SELECTION != NAVIGATION invariant
  ✓ 19. daInvestigationDrawer: Stale selection suppression on project/graph switch

[Category 6: Workstream 6 Refactoring Engine & Pure Topological Math]
  ✓ 20. daRefactoringEngine: Tarjan SCC detection & cycle counting
  ✓ 21. daRefactoringEngine: Directed cycle edge verification vs SCC membership
  ✓ 22. daRefactoringEngine: Immutable simulation inputs & cyclicSccCountDelta semantics
  ✓ 23. daRefactoringEngine: Atomic REMOVE_NODE cascades across all incident edges (self-loops included)
  ✓ 24. daRefactoringEngine: Informational movedMethodList & rejection of unsupported MOVE_METHOD
  ✓ 25. daRefactoringEngine: Markdown and JSON handoff export generation & disclaimer

===================================================================
Summary: 31 PASSED, 0 FAILED
```

---

## 3. Test Execution Output: `run-w8-1-tests.cjs`

```text
Running Task W8-1 (daInvestigationDrawer LWC) Test Suite...
===========================================================
  ✓ 1. Default state: no selected node renders empty state
  ✓ 2. Node metadata display & structural metrics calculation
  ✓ 3. Incident edges extraction (Inbound vs Outbound)
  ✓ 4. 1-Hop drill-down dispatches canonical nodeselect CustomEvent (CONTRACT-06)
  ✓ 5. Breadcrumb trail tracks history on drill-down and truncation on previous crumb jump
  ✓ 6. Stale selection suppression on graph reload
  ✓ 7. Pinning state invariant: preserves trail and dispatches pintoggle
  ✓ 8. Detached window BroadcastChannel cross-window IPC contract
  ✓ 9. Invariant: SELECTION != NAVIGATION preserved
  ✓ 10. Associated findings filtering by targetNodeId
===========================================================
Summary: 10 PASSED, 0 FAILED
```

---

## 4. Full Repository Test Suite Verification
All 21 test runners in `scratch/salesforce-poc/tests/` pass with zero failures:
- `run-analysis-history-tests.cjs`: PASS
- `run-lane-a-schema-tests.cjs`: PASS
- `run-lane-c-preset-manager-tests.cjs`: PASS
- `run-lane-d-graph-filter-tests.cjs`: PASS
- `run-lane-e-matrix-tests.cjs`: PASS
- `run-lane-f-findings-tests.cjs`: PASS
- `run-lwc-jest-tests.cjs`: PASS
- `run-p0-verification-tests.cjs`: PASS
- `run-p1-header-tests.cjs`: PASS
- `run-p1-sidebar-tests.cjs`: PASS
- `run-poc-tests.cjs`: PASS
- `run-w5-1-tests.cjs`: PASS
- `run-w6-2-tests.cjs`: PASS
- `run-w6-3-tests.cjs`: PASS
- `run-w6-4-tests.cjs`: PASS
- `run-w7-1-tests.cjs`: PASS
- `run-w7-2-tests.cjs`: PASS
- `run-w8-1-tests.cjs`: PASS
- `run-wave4-integration-suite.cjs`: PASS
- `run-workstream-a-tests.cjs`: PASS
- `run-workstream-c-tests.cjs`: PASS
