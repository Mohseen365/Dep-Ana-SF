# WAVE 1A TEST HARDENING EXECUTION LOG

## Environment Information

- **Operating System**: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC Fri Feb 20 20:38:43 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
- **Node.js Version**: v22.22.1
- **npm Version**: 11.11.0
- **Working Directory**: /app
- **Dependency Availability**: All tests executed with Node.js built-ins (`assert`, `path`, `fs`). No additional dependencies required.

## Summary of Test Execution

| Test Suite Category | Runner Count | Tests Planned | Tests Passed | Tests Failed | Exit Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Hardened Wave 1A Task Runners | 5 | 34 | 34 | 0 | 0 |
| Immutable Baseline Runners | 9 | 187 | 187 | 0 | 0 |
| **Total** | **14** | **221** | **221** | **0** | **0** |

---

## 1. Hardened Wave 1A Task Runners Execution Output

### Task W6-2 Runner (`scratch/salesforce-poc/tests/run-w6-2-tests.cjs`)
- **Command**: `node scratch/salesforce-poc/tests/run-w6-2-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Task W6-2 (daTreemapView LWC) Test Suite...
===================================================
  ✓ 1. Initial default state verified
  ✓ 2. Count metric layout and rect derivation verified
  ✓ 3. LOC metric weighting and deterministic ordering verified
  ✓ 4. Layer and Risk color scheme mapping verified
  ✓ 5. Canonical nodeselect event emission verified (SELECTION != NAVIGATION)
  ✓ 6. Empty and malformed payload resilience verified
  ✓ 7. Payload immutability preserved
===================================================
Task W6-2 Test Results: ALL 7 TESTS PASSED
```

### Task W6-3 Runner (`scratch/salesforce-poc/tests/run-w6-3-tests.cjs`)
- **Command**: `node scratch/salesforce-poc/tests/run-w6-3-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Task W6-3 (daSubwayView LWC) Test Suite...
=================================================
  ✓ 1. Initial default state verified
  ✓ 2. Subway tracks, stations, and route generation verified
  ✓ 3. Cross-line transit route geometry verified
  ✓ 4. Station search and layer filtering verified
  ✓ 5. Station selection event emission verified (SELECTION != NAVIGATION)
  ✓ 6. Empty and malformed payload resilience verified
  ✓ 7. Payload immutability preserved
=================================================
Task W6-3 Test Results: ALL 7 TESTS PASSED
```

### Task W6-4 Runner (`scratch/salesforce-poc/tests/run-w6-4-tests.cjs`)
- **Command**: `node scratch/salesforce-poc/tests/run-w6-4-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Task W6-4 (daHotspotsView LWC) Test Suite...
==================================================
  ✓ 1. Initial default state verified
  ✓ 2. Hotspot threshold detection and deterministic ranking verified
  ✓ 3. Category filtering verified
  ✓ 4. Risk and search filtering verified
  ✓ 5. Row click nodeselect event verified (SELECTION != NAVIGATION)
  ✓ 6. Empty and malformed payload resilience verified
  ✓ 7. Payload immutability preserved
==================================================
Task W6-4 Test Results: ALL 7 TESTS PASSED
```

### Task W7-1 Runner (`scratch/salesforce-poc/tests/run-w7-1-tests.cjs`)
- **Command**: `node scratch/salesforce-poc/tests/run-w7-1-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Task W7-1 (daDiagnosticsView LWC) Test Suite...
=====================================================
  ✓ 1. Initial default state verified
  ✓ 2. Health metrics and scorecard derivation verified
  ✓ 3. Weighted health score and styling threshold verified
  ✓ 4. Layer breakdown distribution verified
  ✓ 5. Empty and malformed payload resilience verified
  ✓ 6. Payload immutability preserved
=====================================================
Task W7-1 Test Results: ALL 6 TESTS PASSED
```

### Task W7-2 Runner (`scratch/salesforce-poc/tests/run-w7-2-tests.cjs`)
- **Command**: `node scratch/salesforce-poc/tests/run-w7-2-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Task W7-2 (daArchitectureDnaBarcode LWC) Test Suite...
===========================================================
  ✓ 1. Initial default state verified
  ✓ 2. Barcode strip rendering and deterministic band width verified
  ✓ 3. Multi-dimensional barcode color mappings verified
  ✓ 4. Active component profile resolution verified
  ✓ 5. Band click nodeselect event verified (SELECTION != NAVIGATION)
  ✓ 6. Empty and malformed payload resilience verified
  ✓ 7. Payload immutability preserved
===========================================================
Task W7-2 Test Results: ALL 7 TESTS PASSED
```

---

## 2. Immutable Frozen Baseline Test Runners Execution Output

### POC Tests (`scratch/salesforce-poc/tests/run-poc-tests.cjs`)
- **Expected Tests**: 43
- **Command**: `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Salesforce POC Offline Verification & Hardening Test Suite...
===================================================================

[Category 1: LWC Module Unit Tests]
  ✓ reassembleChunks: empty array and null returns empty string
  ✓ reassembleChunks: reassembles array of string chunks accurately
  ✓ validatePayloadIntegrity: accepts valid graph structures (nodes/edges, stages/flows, focal/rings)
  ✓ validatePayloadIntegrity: rejects parseable JSON without expected schema, invalid root types, and dangling edges
  ✓ verifyChunkSequence: detects correct contiguous indices starting at specified offset
  ✓ verifyChunkSequence: rejects gaps, duplicates, reordering, negative offsets, and invalid types

[Category 2: Bounded Pagination & Boundary Inputs]
  ✓ simulateBoundedFetch: caps requested limit at max allowed page size (10)
  ✓ simulateBoundedFetch: handles default maxChunks when null/undefined or <= 0
  ✓ simulateBoundedFetch: handles negative, fractional, and stringified start indices safely

[Category 3: Benchmark Fixture Paginated Verification]
  ✓ Fixture PBIM: file size, exact chunk count, paginated retrieval, and JSON verification
  ✓ Fixture BQC: file size, exact chunk count, paginated retrieval, and JSON verification
  ✓ Fixture CST: file size, exact chunk count, paginated retrieval, and JSON verification

[Category 4: Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle]
  ✓ Unicode & Multibyte UTF-8 handling across chunk boundaries
  ✓ Surrogate Pair Boundary Safety: prevents splitting UTF-16 surrogate pairs at, before, and after chunk boundaries
  ✓ Oversized Synthetic Payload (10 MB / 100 Chunks)
  ✓ In-flight Request Cancellation / Stale Request Discard (Rapid Project Switch)
  ✓ Cytoscape Mounting & Teardown Lifecycle Cleanup

[Category 5: Expanded Adversarial Security, Fault Injection & Ingestion Verification]
  ✓ verifyChunkSequence: null element in chunk array does not throw TypeError
  ✓ chunkPayload: caps chunk size at 131,072 characters
  ✓ simulateBoundedFetch: large startIndex arithmetic safety check
  ✓ Ingestion Contract: throws validation errors on blank project name/key
  ✓ Metadata DTO Alignment Contract: Apex DTO field set matches LWC expectations
  ✓ validateChunkLimits & validatePayloadSize: enforces max chunk size and total payload size bounds
  ✓ Ingestion Bounded Batching & Idempotency Simulation Contract

[Category 6: Reusable LWC Layout Engine (daLayoutEngine) Parity Tests]
  ✓ daLayoutEngine: P0 computeArchitectureLayout produces deterministic finite coordinates
  ✓ daLayoutEngine: P0 computeArchitectureLayout against real benchmark fixture (CST)
  ✓ daLayoutEngine: P1 computeOrbitLayout produces valid radial coordinates
  ✓ daLayoutEngine: P1 computeConstellationLayout produces focal origin and curved edge paths
  ✓ daLayoutEngine: P2 computeSankeyLayout positions stage columns and flow paths
  ✓ Graph Viewer SELECTION != NAVIGATION Invariant Check

[Category 7: Production DaGraphViewer LWC Class Direct Unit Tests (11 Scenarios)]
  ✓ TC-01: Initial project load
  ✓ TC-02: Switching from project A to project B
  ✓ TC-03: Rapid switching from A to B to C
  ✓ TC-04: Delayed response from A arriving after switching to B
  ✓ TC-05: Failure loading project B
  ✓ TC-06: Empty graph payload for project B
  ✓ TC-07: Selected-node ID reset on project change
  ✓ TC-08: Cytoscape destruction and reinitialization
  ✓ TC-09: Component disconnection during an outstanding request
  ✓ TC-10: Rerendering without a project-ID change
  ✓ TC-11: SELECTION ≠ NAVIGATION invariant check
  ✓ TC-12: FEAT-STATE-02 ViewState loading and restoration
  ✓ TC-13: FEAT-STATE-02 ViewState debounced saving on drag/viewport change

===================================================================
Summary: 43 PASSED, 0 FAILED
```

### Wave 4 Integration Suite (`scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs`)
- **Expected Tests**: 32
- **Command**: `node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Wave 4 Phase 2C Coordinator Integration Test Suite...
================================================================

[Section 1: Shared Graph Payload Lifecycle]
  ✓ 1. Shell loads and validates chunked/raw graph payload
  ✓ 2. Shell passes the same validated payload to Matrix and Findings
  ✓ 4. No duplicate graph requests when shared payload is supplied
  ✓ 5. Stale graph responses are ignored
  ✓ 6. Project switching invalidates prior graph data
  ✓ 7. Component disconnect invalidates in-flight requests
  ✓ 8. Loading, empty and error states are distinct

[Section 2: Preset Manager Event Responsibilities]
  ✓ 9. Preset Manager receives correct inputs via getters
  ✓ 10. filterchange updates active criteria without accidental container persistence
  ✓ 11. containerchange updates and persists the V2 container
  ✓ 12. Preset selection updates criteria without erasing presets
  ✓ 13. Preset create/update/delete updates container and persists correctly

[Section 3: Strict Project-Scoped Presets]
  ✓ 14. Matching project preset is retained
  ✓ 15. Different project preset and unscoped presets are excluded
  ✓ 16. Missing project context exposes no presets
  ✓ 17. Malformed preference JSON does not trigger destructive writes
  ✓ 18. V1 migration remains in-memory only during load
  ✓ 19. V2 container preserves presets and active preset ID

[Section 4: Child Views Integration & Predicates]
  ✓ 3. Graph Viewer remains functional and receives filter criteria
  ✓ 20. Matrix receives correct shared payload and criteria
  ✓ 21. Findings receives correct shared payload and criteria
  ✓ 22. Graph filtering uses canonical criteria
  ✓ 23. Coverage states retain exact canonical semantics
  ✓ 24. UNKNOWN and UNTESTED remain distinct
  ✓ 25. High-coupling condition uses coupling > 15 OR fanIn > 10 threshold
  ✓ 26. Unresolved Matrix edges are preserved and classified

[Section 5: Frozen Invariants & State Protection]
  ✓ 27. Existing shell navigation remains intact
  ✓ 28. Invariant 1: SELECTION != NAVIGATION
  ✓ 29. Existing position and zoom/pan fields remain untouched
  ✓ 30. Stale preference requests are ignored
  ✓ 31. Deduplication prevents duplicate preference writes
  ✓ 32. All 12 frozen invariants verified by source contracts

================================================================
Wave 4 Phase 2C Integration Suite Results: 32 PASSED, 0 FAILED
```

### Lane A Schema Tests (`scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs`)
- **Expected Tests**: 9
- **Command**: `node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Lane A Canonical Filter Schema Offline Test Suite...
===========================================================
  ✓ 1. Schema version and constants integrity
  ✓ 2. Default criteria and normalization
  ✓ 3. Legacy V1 filter upgrade to V2 container
  ✓ 4. Strict project-scoped preset isolation (DEC-W4-03)
  ✓ 5. Payload serialization 131,072 boundary enforcement
  ✓ 6. Graph node filter predicate mapping
  ✓ 7. Matrix edge filter predicate mapping and unresolved edge handling
  ✓ 8. Findings filter predicate mapping (Distinguishing UNTESTED vs UNKNOWN)
  ✓ 9. High coupling criteria helper (coupling > 15 or fanIn > 10)
===========================================================
Summary: 9 PASSED, 0 FAILED
```

### Lane C Preset Manager Tests (`scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs`)
- **Expected Tests**: 10
- **Command**: `node scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Lane C (DaPresetManager LWC) Focused Unit Test Suite...
================================================================
  ✓ 1. Empty preset collection initializes safe V2 defaults
  ✓ 2. Create preset saves criteria, activates preset, and emits containerchange/filterchange
  ✓ 3. Apply preset updates activeFilter, activePresetId, and emits event
  ✓ 4. Update preset persists modified criteria into target preset
  ✓ 5. Delete preset removes item and resets activePresetId if active preset was deleted
  ✓ 6. Project isolation excludes presets belonging to other projects
  ✓ 7. Missing project context blocks saving and sets clear error message
  ✓ 8. Malformed container string falls back safely to default V2 container
  ✓ 9. Capacity check enforces 131,072 char hard boundary on preset creation
  ✓ 10. Active preset styling correctly reflects activePresetId
================================================================
Lane C Test Results: 10 PASSED, 0 FAILED
```

### Lane D Graph Filter Tests (`scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs`)
- **Expected Tests**: 15
- **Command**: `node scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Lane D (daGraphViewer Filter Integration) Test Suite...
===============================================================
  ✓ 1. Search filtering isolates matching nodes
  ✓ 2. Node-type filtering isolates nodes of specified type
  ✓ 3. Risk filtering isolates HIGH risk nodes and intact edges
  ✓ 4. Layer filtering filters on layer attribute
  ✓ 5. Coverage filtering distinguishes COVERED vs UNTESTED
  ✓ 6. Missing coverage defaults to UNKNOWN, not UNTESTED
  ✓ 7. Combined filters evaluate conjunctive boolean logic
  ✓ 8. Clearing filters restores complete node and edge set
  ✓ 9. Filter change during load buffers criteria safely
  ✓ 10. Stale async responses are discarded upon request ID mismatch
  ✓ 11. Invariant 1: SELECTION != NAVIGATION preserved
  ✓ 12. Layout positions and zoom/pan preserved across filter applications
  ✓ 13. Node annotations preserved across filtering
  ✓ 14. Invariant 8: Cytoscape instance destroyed cleanly
  ✓ 15. Invariant 3: @api recordId getter/setter normalizes and invalidates in-flight requests
===============================================================
Lane D Test Results: 15 PASSED, 0 FAILED
```

### Lane E Matrix Tests (`scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs`)
- **Expected Tests**: 11
- **Command**: `node scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Lane E (daMatrixView LWC) Focused Unit Test Suite...
============================================================
  ✓ 1. Directed source-to-target dependency counts aggregated accurately
  ✓ 2. Directed dependency semantics preserved (Source != Target)
  ✓ 3. Unresolved edges with canonical target type mapped to expected target type
  ✓ 4. Unresolved edges without target type safely fall back to "Unresolved"
  ✓ 5. Dangling target node edge handled gracefully
  ✓ 6. Missing source node handled safely without error
  ✓ 7. Duplicate edge references suppressed to prevent overcounting
  ✓ 8. Canonical search and node-type filtering correctly restrict matrix
  ✓ 9. Empty payload yields empty matrix without crashing
  ✓ 10. Malformed payload string handled safely
  ✓ 11. Sum of row totals exactly matches totalDependencies
============================================================
Lane E Test Results: 11 PASSED, 0 FAILED
```

### Lane F Findings Tests (`scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs`)
- **Expected Tests**: 12
- **Command**: `node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Lane F (daFindingsView LWC) Focused Unit Test Suite...
==============================================================
  ✓ 1. Circular dependencies derived from cycles[] and node flags with deduplication
  ✓ 2. Untested high-risk items preserve distinct UNTESTED vs UNKNOWN status
  ✓ 3. Unresolved references derived and deduplicated
  ✓ 4. Hotspot detected when coupling > 15
  ✓ 5. Hotspot detected when fanIn > 10
  ✓ 6. Finding IDs are deterministic and stable across executions
  ✓ 7. Canonical search filter matches title, description, or componentName
  ✓ 8. Severity filtering restricts findings to requested levels
  ✓ 9. Coverage status filter correctly isolates UNTESTED findings
  ✓ 10. Empty payload yields 0 findings safely
  ✓ 11. Malformed payload handled safely fail-closed
  ✓ 12. Nodes missing optional analytics fields processed without errors
==============================================================
Lane F Test Results: 12 PASSED, 0 FAILED
```

### Workstream A Tests (`scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`)
- **Expected Tests**: 33
- **Command**: `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
Running Workstream A LWC Offline Unit Tests (daAppShell & daProjectSelector)...
================================================================================
  ✓ 1. Application shell initial render defaults
  ✓ 2. Navigation among approved existing views (Graph, Matrix, Findings)
  ✓ 3. Project selector loading and populated state
  ✓ 4. Empty project-list behavior
  ✓ 5. Project-list request failure behavior
  ✓ 6. Selecting a project updates parent-owned project context
  ✓ 7. Active graph viewer receives correct project ID binding
  ✓ 8. Switching views preserves active project context and selection
  ✓ 9. Re-selecting the same project suppresses redundant updates
  ✓ 10. Graph-node selection does NOT alter project or navigate views (SELECTION != NAVIGATION)
  ✓ 11. Project switching clears prior node selection to prevent stale state
  ✓ 12. Accessibility and tab index properties contract
  ✓ 13. daAppShell HTML template integrates c-da-annotation-panel with active project and node bindings
  ✓ 14. Load preferences for the initial project
  ✓ 15. Load preferences after changing projects
  ✓ 16. Reject a stale response from a previous project
  ✓ 17. Restore a valid saved active view
  ✓ 18. Restore a valid saved layout
  ✓ 19. Restore valid versioned filter JSON
  ✓ 20. Handle missing preferences
  ✓ 21. Handle malformed filter JSON
  ✓ 22. Handle unsupported schema versions
  ✓ 23. Apply approved empty-filter fallback
  ✓ 24. Change only layout while preserving unrelated preferences
  ✓ 25. Change only filters while preserving unrelated preferences
  ✓ 26. Change only active view while preserving unrelated preferences
  ✓ 27. Ensure graph positions are not overwritten during preference saves
  ✓ 28. Ensure zoom/pan is not overwritten during preference saves
  ✓ 29. Prevent redundant saves
  ✓ 30. Handle save failures
  ✓ 31. Prevent duplicate load/save operations
  ✓ 32. Preserve SELECTION != NAVIGATION invariant during preference changes
  ✓ 33. Preserve existing component lifecycle cleanup

================================================================================
Summary: 33 PASSED, 0 FAILED
```

### Workstream C Tests (`scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`)
- **Expected Tests**: 22
- **Command**: `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`
- **Exit Code**: 0
- **Raw Output**:
```
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

===================================================================
Summary: 22 PASSED, 0 FAILED
```

## 3. Negative-Control Verification Results

Each of the 5 hardened runners includes negative controls using isolated test objects to verify that deliberate mutations are caught by `assert.deepStrictEqual`:
1. **Node property mutation**: Deliberately changing a node property (e.g., `loc`, `fanIn`, `coupling`, `coverageDensity`) causes an `AssertionError` caught by `assert.throws`.
2. **Edge / cycle property mutation**: Deliberately changing an edge target or cycle array causes an `AssertionError` caught by `assert.throws`.
3. **Nested object mutation**: Deliberately adding or modifying a nested property causes an `AssertionError` caught by `assert.throws`.

All negative-control checks passed in all 5 runners.

## 4. Skipped Tests

Zero tests were skipped across all test suites.
