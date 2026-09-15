Summary of Investigation Findings
Primary Root Cause (React Props → Cytoscape Instance Synchronization Boundary):

In explorer/src/components/GraphView.tsx, Cytoscape is initialized once in a useEffect hook on mount.
When the user changes Focus settings (e.g., Depth 1 → 2 → 3 → ALL), useViewState.ts and App.tsx correctly update state and recompute focusedGraphData with filtered node and edge subsets.
However, GraphView.tsx only updates internal refs (nodesRef.current, edgesRef.current) on prop changes and lacks an imperative element synchronization effect (such as cy.batch() with element removal/addition or cy.json()).
Consequently, Cytoscape retains its initial element collection on the canvas, rendering the graph visually static despite React receiving updated props.
Secondary URL State Behavior (focusQuery.ts):

In explorer/src/lib/url/focusQuery.ts, the query parser defaults depth to 2 if focus.depth is omitted or unparsed.
During syncToUrl cycles, explicit state choices (1, 3, ALL) risk being overwritten back to 2 if query parameters are not serialized synchronously with state transitions.
Algorithm & Control Verification:

computeFocusedGraph() in focus-graph.ts was tested against multi-level relationship chains in the movie-app dataset (ApexClass:BouquetOrderPageHandler → Controller → FormService → Selector → External:Account).
FOCUS ALGORITHM: WORKING. It produces distinct node/edge count reductions for Depth 1 (2 nodes), Depth 2 (3 nodes), Depth 3 (5 nodes), and Depth ALL (10 nodes).
FocusControls.tsx correctly renders controls and emits onFocusChange events.
Artifact Created:

Authored FOCUS_DEPTH_ROOT_CAUSE_REPORT.md containing the Executive Summary, Root Cause, Source Code Evidence, End-to-End Data Flow, Working Features Verification, Dataset Analysis, Step-by-Step Reproduction, Expected vs Actual Breakdown, Test Coverage Analysis, Candidate Fix Locations, and Confidence Level (HIGH).
All 58 Vitest test suites (422 tests) in explorer/ and adapter validation tests pass. The root-cause investigation report has been submitted to the branch investigate-focus-depth-root-cause-1831564951504539718.
