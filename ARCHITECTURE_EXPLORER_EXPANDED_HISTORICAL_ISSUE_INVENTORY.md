# Architecture Explorer — Expanded Historical Issue Inventory and Resolution Status

**Prepared:** 2026-10-13  
**Purpose:** Expand the three original layout findings into a wider inventory of issues raised in earlier Architecture Explorer audits and remediation reports.  
**Important:** This is a historical evidence register, not a claim that every item is still present. Reports were produced on different branches and commits. “Reported fixed” means a later report claimed a fix or passing tests; “verified now” requires re-running the relevant production-path test on the canonical commit.

## Status vocabulary

- **Reported fixed; current verification pending** — a later report says the issue was fixed/tested, but the latest canonical commit has not been freshly verified.
- **Partially verified** — some relevant source or CLI tests exist, but important paths or browser behavior remain untested.
- **Open product contract** — behavior requires a deliberate product decision before implementation.
- **Historical candidate; re-triage** — previously identified as a risk/defect candidate, but current source must establish whether it remains reachable.
- **Known verification gap** — evidence is specifically missing, not necessarily a production defect.

---

## A. Original three issues

### A1. Constellation filtering in the asynchronous worker path
**Priority:** High  
**Historical finding:** The async path reportedly applied the Orbit projection filter but omitted Constellation, allowing unprojected nodes to remain visible.  
**Later evidence:** A focused remediation report says the unified Orbit/Constellation filter already existed in both sync and async paths, that regression tests were expanded, and that no production code change was needed. The report recorded 7/7 projection tests, 4 worker-geometry categories, and 31 CLI scripts passing.  
**Status:** **Reported fixed; current browser verification pending.**  
**Next check:** Verify the condition and test against the canonical commit, then verify actual Constellation canvas node/edge counts in a browser. Do not reapply the same source change without evidence.

### A2. Cross-mode position contamination
**Priority:** High  
**Historical finding:** Flat position storage and mode switching could allow Hierarchical coordinates to influence Orbit/Constellation.  
**Later evidence:** Reports describe mode-scoped `layoutPositions` and `layoutProvenances`, plus hydration tests. The most recent end-to-end report could not execute Vitest because `explorer/node_modules`/Vitest was unavailable.  
**Status:** **Partially verified; executable gate incomplete.**  
**Next check:** Run the position, persistence, GraphView authority, mode-toggle, worker-projection, and integration tests in a preconfigured environment, then browser-check mode transitions.

### A3. Shared position inheritance in the layout engine
**Priority:** High  
**Historical finding:** `architecture-layout.ts` was reported to copy `existingPositions` into computed output without enough target-mode ownership scoping.  
**Later evidence:** Later source tracing claims target-mode maps and projection filtering prevent leakage. However, the end-to-end report's Vitest execution was blocked.  
**Status:** **Source-level confidence; production-path execution pending.**  
**Next check:** Independently test shared node IDs with deliberately different per-mode coordinates; ensure both worker and synchronous paths return target-mode-owned positions. Keep this distinct from state hydration.

---

## B. Additional layout, data, and state issues

### B1. Constellation contract is tied to a fixed Sun/component ID set
**Priority:** High product decision  
**Historical finding:** Constellation uses a contracted list (reported as `CONTRACTED_14_SUN_IDS`). Dataset results differ sharply: PBIM was reported at 42 nodes/50 edges, while CST could produce 0/0 and other projects could show a single fallback node.  
**Status:** **Open product contract.**  
**Risk:** The mode may appear broken on projects that do not contain the contracted IDs even if its projection code is behaving as designed.  
**Next check:** Decide whether Constellation is PBIM-specific, manifest-configurable, or dynamically discovered. Produce a read-only dataset matrix before changing adapters or manifests.

### B2. Empty or near-empty Constellation projection UX
**Priority:** High product/UX  
**Historical finding:** Some datasets reportedly project zero nodes/edges or a fallback node.  
**Status:** **Open product contract.**  
**Next check:** Define whether to show a supported-mode empty state, a fallback visualization, a disabled mode, or a valid projection. Test the chosen behavior across supported and unsupported datasets.

### B3. Legacy flat-position migration ambiguity
**Priority:** Medium  
**Historical finding:** `layoutPositions: {}` plus legacy `nodePositions` triggers migration, while `layoutPositions: { orbit: {} }` suppresses migration.  
**Later evidence:** The hydration adversarial report explicitly tested and accepted this dual behavior.  
**Status:** **Behavior tested in a prior report; product semantics still need confirmation.**  
**Risk:** If an empty top-level map is intended to mean “deliberately cleared,” legacy migration can restore stale positions.  
**Next check:** Confirm what empty top-level state means in the persisted schema. Do not change the predicate unless the product contract requires it.

### B4. Focal-anchor change and user-drag persistence
**Priority:** Medium / product decision  
**Historical finding:** Changing the Orbit focal Sun recalculates geometry; stored positions may be replaced or no longer applicable.  
**Status:** **Open product contract.**  
**Next check:** Decide whether user-authored positions persist across focal changes, are reprojected, or reset. Specify behavior for shared nodes and newly unreachable nodes, then add tests.

### B5. Project-switch in-memory state isolation
**Priority:** High reliability  
**Historical concern:** Overlapping node IDs or stale in-memory references could allow Project A positions/selection/layout results to contaminate Project B.  
**Later evidence:** Source-level report claims project-specific localStorage keys and project-change handling.  
**Status:** **Partially verified; fresh executable/browser check pending.**  
**Next check:** Use two projects with overlapping node IDs and very different coordinates; switch rapidly while a layout request is pending and confirm stale results are rejected.

### B6. Worker result staleness and cancellation
**Priority:** High reliability  
**Historical roadmap:** Worker offloading and request-generation cancellation were reported as implemented, but late results, rapid mode changes, and project switches must be checked together.  
**Status:** **Reported implemented; current interaction-level verification pending.**  
**Next check:** Force overlapping requests for different modes/projects and assert that only the newest valid request updates the graph and emits completion for the matching correlation token.

### B7. Worker versus synchronous fallback parity
**Priority:** High  
**Historical finding:** Both paths should use the same layout/projection contract, including projected IDs and positions.  
**Later evidence:** Worker-geometry reports claim parity checks and correlation matrix coverage.  
**Status:** **CLI-level reported pass; component/browser integration pending.**  
**Next check:** Verify equal positions/projected IDs for identical inputs and confirm that errors/cancellation do not cause fallback output to overwrite a newer worker result.

### B8. Static/interactive layout switch position authority
**Priority:** Medium  
**Historical concern:** Switching static/interactive modes could race with position capture or save automatic coordinates as user-authored.  
**Later evidence:** Reports claim active-architecture-mode capture and authority policy tests.  
**Status:** **Reported fixed/tested; fresh GraphView test execution pending.**  
**Next check:** Test rapid toggles, pending worker requests, and user drag immediately before/after a toggle; assert provenance and mode maps.

### B9. Hybrid layout scalability / possible O(E×N) cost
**Priority:** Medium performance risk  
**Historical finding:** A source audit raised potential scaling risk for graphs with more than roughly 2,000 nodes. This was a hypothesis, not a measured defect.  
**Status:** **Unmeasured risk.**  
**Next check:** Profile representative large graphs only after benchmark event correlation is trusted. Do not present complexity suspicion as a measured performance failure.

---

## C. Interaction and selection issues

### C1. Single-click side effects before double-click handling
**Priority:** High interaction correctness  
**Historical finding:** A double-click could trigger a single-click selection side effect before the double-click action.  
**Status:** **Historical candidate; re-triage against current code.**  
**Next check:** Define expected single/double-click semantics. Test one click, double-click, rapid separate clicks, and mode changes. Avoid timing changes without a clear interaction contract.

### C2. Duplicate activation from accessible-list keyboard handling
**Priority:** High accessibility/interaction  
**Historical finding:** Keyboard handling could result in duplicate activation.  
**Later evidence:** A later integration report claimed native button semantics and selection fixes in relevant areas, but current canonical execution has not been established.  
**Status:** **Reported addressed; current verification pending.**  
**Next check:** Press Enter and Space once on an accessible node-list item and assert exactly one selection/action. Check browser-native behavior to avoid double-handling.

### C3. Edge deselection incomplete in a fallback path
**Priority:** Medium interaction correctness  
**Historical finding:** An edge deselection path could be incomplete when local fallback behavior was used.  
**Status:** **Historical candidate; re-triage.**  
**Next check:** Select node and edge combinations, deselect edge via every supported path, and assert graph, accessible list, and details panel agree.

### C4. Selection exclusivity and cross-view synchronization
**Priority:** High  
**Historical concern:** Selection state needed to remain coherent between graph canvas, accessible node list, details/drawer, and workspace surfaces. Later reports claim some selection-exclusivity and synchronization fixes.  
**Status:** **Reported partially fixed; current integration verification pending.**  
**Next check:** Build a matrix for node select, edge select, deselect, project switch, architecture-mode switch, and closing details. Assert one authoritative selected state.

### C5. Workspace lens/surface capability mismatch
**Priority:** Medium/high  
**Historical finding:** Some workspace surfaces/lenses could expose controls or graph behavior that was not supported by that surface, or selection state could fail to synchronize.  
**Status:** **Reported addressed in later integration work; current source/test mapping required.**  
**Next check:** For every registered surface, test which graph controls, overlays, node selection, and navigation actions are supported. Unsupported actions should be unavailable or have an explicit empty state.

### C6. Zoom/pan configuration API contract
**Priority:** Medium  
**Historical finding:** Zoom/pan configuration and behavior needed validation against the actual Cytoscape API and app contract.  
**Status:** **Historical candidate; current source verification required.**  
**Next check:** Inspect the installed/locked Cytoscape version and actual call sites; test zoom limits, fit/reset, pan enablement, and mode changes without relying on assumptions about API names.

### C7. Stale double-tap callback references
**Priority:** Medium  
**Historical roadmap:** Callback references might become stale after state or mode changes.  
**Status:** **Historical candidate; re-triage.**  
**Next check:** Trigger the gesture before and after changing mode/selection/project and assert it uses current state. Fix only if a reproducible stale closure exists.

---

## D. Accessibility and bounded rendering issues

### D1. Accessible graph node list scalability
**Priority:** Medium/high  
**Historical work:** A bounded list was reported, showing the top 50 nodes plus the selected node.  
**Status:** **Reported implemented; current edge-case verification pending.**  
**Next check:** Confirm selected nodes outside the top 50 remain discoverable, ordering is deterministic, and updates do not cause focus loss.

### D2. Drawer dependency/dependent/evidence list bounds
**Priority:** Medium  
**Historical work:** Bounded lists and “Show More” behavior were reported.  
**Status:** **Reported implemented; current UI verification pending.**  
**Next check:** Verify initial limits, expansion, collapse/reset on changing selection, correct counts, and keyboard operation.

### D3. Accessible names, roles, selected/pressed states
**Priority:** Medium/high  
**Historical work:** Native button semantics and keyboard selection improvements were reported.  
**Status:** **Partially verified by historical reports; screen-reader/browser evidence incomplete.**  
**Next check:** Validate accessible names, role, focus order, visible focus, selected/pressed state, and no duplicate activation in a real browser where available.

### D4. Capability-aware overlays and unsupported-mode states
**Priority:** Medium  
**Historical work:** Capability-aware UI and workspace modes were part of prior integration work.  
**Status:** **Current state uncertain.**  
**Next check:** Test every supported surface/mode combination and ensure unavailable capabilities are not shown as active controls.

### D5. Animation-frame/event cleanup and long-session leaks
**Priority:** Medium  
**Historical work:** Pan/zoom event coalescing and animation-frame cleanup were reported.  
**Status:** **Reported implemented; long-session behavior unmeasured.**  
**Next check:** Confirm cleanup on unmount/project switch and profile long-session event/heap behavior with browser tools; do not infer memory safety from unit tests alone.

---

## E. Performance and runtime evidence issues

### E1. Invalid historical performance baseline
**Priority:** Critical for performance claims  
**Historical finding:** Prior formal timing results were judged invalid because the measurement boundary/correlation methodology was insufficient.  
**Later evidence:** Layout-completion instrumentation and correlation-token implementation were reported, but a subsequent report still failed the formal baseline gate.  
**Status:** **Open verification gate.**  
**Next check:** Do not reuse invalid timings. Verify exact event/token/request/mode/project correlation, stale-event rejection, sample completeness, and independent statistics before running a new baseline.

### E2. Layout completion event may be misattributed
**Priority:** High measurement integrity  
**Historical concern:** A completion event must belong to the specific layout request being measured; same mode or a newer request ID alone is not sufficient proof.  
**Later evidence:** Correlation-token matrix was reported.  
**Status:** **Implementation reported; independent current verification pending.**  
**Next check:** Exercise stale completion, out-of-order completion, worker and fallback paths, mode switches, project switches, and error/cancel paths.

### E3. Initial load vs layout vs mode-switch timing mixed together
**Priority:** Medium/high measurement integrity  
**Historical issue:** The baseline needs clear start/end boundaries and distinct metrics.  
**Status:** **Measurement contract needs to be ratified.**  
**Next check:** Report initial dataset loading, layout computation, worker transfer, rendering, and end-to-end user action separately.

### E4. Outlier handling and sample validity
**Priority:** Medium measurement integrity  
**Historical concern:** A benchmark can look stable while excluding or correlating samples incorrectly.  
**Status:** **Needs audit with raw samples.**  
**Next check:** Retain raw samples, define warm-up, sample count, exclusion rules, percentiles, and uncertainty before accepting budgets.

### E5. Real-browser frame time, GPU, memory, and long-session behavior
**Priority:** Medium/high runtime confidence  
**Historical evidence:** Not established by recent CLI results.  
**Status:** **Unverified.**  
**Next check:** Use a preconfigured browser environment for repeatable interaction latency, frame time, heap/memory, and long-session checks. State browser/device/version and graph size.

### E6. Graph update cost and unnecessary Cytoscape rebuilds
**Priority:** Medium  
**Historical roadmap:** Position-only synchronization was reported as preferable to rebuilding graph elements, but current runtime behavior needs verification.  
**Status:** **Reported implemented; current profiling pending.**  
**Next check:** Assert stable element identity where required and measure whether layout changes trigger full rebuilds unexpectedly.

---

## F. Lifecycle, state, and maintainability candidates

These are historical candidates and must be re-triaged rather than assumed to remain defects.

### F1. Rules-of-Hooks / conditional render reachability
**Priority:** High if reproducible  
**Historical candidate:** Potential hook-order violation or conditional render path.  
**Status:** **Needs current-source triage.**  
**Next check:** Run lint/typecheck and render-transition tests; establish whether the path is reachable before changing component structure.

### F2. Stale focus-origin after disable/re-enable
**Priority:** Medium  
**Historical candidate:** Focus state could retain an origin after a feature is disabled and later enabled.  
**Status:** **Needs current-source triage.**  
**Next check:** Exercise enable → focus → disable → re-enable → navigate and assert the intended initial focus.

### F3. Connection/Impact exit traps
**Priority:** Medium  
**Historical candidate:** Users could become stuck in a mode or have no clear route back.  
**Status:** **Needs current UI verification.**  
**Next check:** Test entry, exit, Escape/back controls, selection changes, and project switches for each mode.

### F4. Effect dependency omissions / stale graph state
**Priority:** High if reproducible  
**Historical candidate:** Effects could observe stale options, focal IDs, project IDs, or callback references.  
**Status:** **Needs current-source triage.**  
**Next check:** Inspect dependency arrays and reproduce rapid state transitions; do not mechanically add dependencies without understanding intended lifecycle.

### F5. Loading/error/empty-state and malformed-state handling
**Priority:** Medium  
**Historical candidate:** Missing or malformed inputs could lead to poor fallback behavior or crashes.  
**Status:** **Some malformed position-state cases were tested; broader UI states remain uncertain.**  
**Next check:** Test missing project data, malformed persisted state, empty projection, worker failure, and cancellation with explicit user-visible states.

### F6. Type safety, depth parsing, loose types, and cleanup
**Priority:** Low/medium after correctness  
**Historical candidates:** Input parsing, overly loose types, cleanup, duplicate JSX, and brittle selectors.  
**Status:** **Deferred maintenance backlog.**  
**Next check:** Triage after correctness/performance gates. Keep cleanups separate from bug fixes.

---

## G. Verification and process issues

### G1. Reports generated against different branches/commits
**Priority:** Critical process risk  
**Evidence:** Recent reports name different branch names and HEAD SHAs.  
**Status:** **Must be reconciled at every execution.**  
**Risk:** A fix reported on one branch may not exist in the branch intended for merge.  
**Next check:** Record commit provenance and verify relevant changes are present on the canonical commit before treating a finding as closed.

### G2. Test matrix marked PASS when test runner could not start
**Priority:** Critical evidence quality  
**Evidence:** The end-to-end report listed A–J as PASS while also recording that Vitest failed at startup because the dependency was missing.  
**Status:** **Known reporting/evidence limitation.**  
**Next check:** Separate “source-level expected behavior” from “test executed and passed.” A blocked test cannot receive an execution PASS.

### G3. CLI tests mistaken for browser verification
**Priority:** High evidence quality  
**Evidence:** CLI/worker tests passed in reports, but fresh Playwright/browser runs were unavailable in the most recent position verification.  
**Status:** **Known evidence boundary.**  
**Next check:** Keep CLI, unit, integration, and browser evidence columns separate.

### G4. Historical PASS reports may conflict with earlier FAIL reports
**Priority:** High process risk  
**Evidence:** Earlier audits reported failures, while later remediation reports claimed closure; the runs used different commits/environments.  
**Status:** **Requires traceability reconciliation.**  
**Next check:** Map each finding to source diff, regression test, commit, and fresh execution result.

### G5. Broad audits can produce repeated reports without closing the evidence gap
**Priority:** Medium workflow risk  
**Status:** **Address through gated execution.**  
**Next check:** Do not repeat a broad audit when the next missing evidence is a specific executable test or product decision. Run the narrowest gate and stop if its prerequisite is missing.

---

## H. Recommended order of work

1. **Repository/evidence reconciliation:** identify the canonical commit and current working-tree state.
2. **Executable position-isolation gate:** run existing tests in an environment where dependencies are already available; do not install dependencies just to force a pass.
3. **Browser transition verification:** mode switches, focal anchor, project switching, static/interactive, save/reload.
4. **Constellation contract:** fixed IDs vs manifest/dynamic discovery and empty-projection UX.
5. **Interaction/selection re-triage:** click/double-click, keyboard duplicate activation, edge deselection, cross-view selection, surface capabilities.
6. **Accessibility verification:** bounded lists, focus, names/roles/states, keyboard-only browser tests.
7. **Benchmark validity:** verify correlation token and completion event before any formal baseline.
8. **Large-graph runtime measurements:** browser frame time, interaction latency, memory, long sessions.
9. **Lifecycle and robustness candidates:** only confirmed reachable defects.
10. **Final qualification:** reconcile every issue as fixed-and-verified, open, blocked, contract-dependent, or unverified.

## I. Current priority snapshot

| Priority | Issues |
|---|---|
| P0 — Evidence gate | G1 repository/commit mismatch risk; G2 blocked tests described as PASS; G3 CLI vs browser evidence boundary |
| P1 — Correctness | A1 async Constellation filter; A2/A3 mode position isolation; B5 project switch; B6 stale worker results; B7 worker/fallback parity; C1–C5 interaction/selection |
| P1 — Product decisions | B1/B2 Constellation contract and empty-state UX; B4 focal-anchor drag persistence; B3 empty-map migration semantics |
| P1 — Measurement integrity | E1/E2 invalid baseline and event correlation |
| P2 — Accessibility/runtime | D1–D5, E3–E6 |
| P2 — Lifecycle candidates | F1–F5 |
| P3 — Maintenance | F6 |

## J. Definition of closure

An issue is only **FIXED AND VERIFIED** when:
- the current canonical commit contains the intended fix;
- a regression test exercises the relevant production path;
- the test actually ran and passed;
- browser-dependent claims have browser evidence or a clearly recorded limitation;
- no unrelated files/data were changed;
- the report identifies the exact evidence and remaining boundaries.

A prior report saying “PASS” is not, by itself, closure.
