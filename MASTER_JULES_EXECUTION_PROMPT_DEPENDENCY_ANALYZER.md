# MASTER JULES EXECUTION PROMPT — DEPENDENCY ANALYZER
## Stage 0–3 Independent Closure, Graph Invalidation Correctness, Integrated Regression, and Evidence-Gated Tier 2 Implementation

---

# 1. Mission

You are working on the Dependency Analyzer repository.

Your mission is to take the project from its reported Stage 0–3 remediation state to a verified, reproducible, evidence-backed baseline, resolve any confirmed integration defects, and then continue into the highest-value deferred Tier 2 workstreams without destabilizing existing functionality.

This is an implementation task, not merely a review or audit.

You must perform the following in order:

1. Establish the actual repository and environment baseline.
2. Verify the reported Stage 0, Stage 1, Stage 2A, Stage 2B, Stage 2C, Stage 3A, Stage 3B, and Stage 3 integration work.
3. Resolve inconsistencies between the reports, repository contents, tests, and actual source code.
4. Independently verify and, if necessary, fix the known `graphStructureKey` invalidation weakness.
5. Verify position persistence, authority precedence, provenance, layout lifecycle, asynchronous result safety, and GraphView integration.
6. Run the combined regression suite against one identifiable checkout.
7. Produce a final Stage 0–3 closure report with truthful evidence.
8. Only after the closure gate passes, implement the deferred Tier 2 workstreams in a controlled, evidence-driven sequence.
9. Run regression tests after every implementation phase and provide a final implementation and integration report.

Do not simply generate another plan or report without doing the available work. Inspect the actual source, make narrowly scoped changes where justified, execute the relevant tests, and document what genuinely happened.

If the environment does not provide repository access or executable tooling, state that limitation explicitly. Do not fabricate source inspection, edits, test execution, branches, commits, or successful results.

# 2. Non-Negotiable Safety Rules

## 2.1 Protect existing user work

- Preserve all existing user changes, including uncommitted work.
- Never use destructive commands to make the repository clean.
- Never use `git reset --hard`, `git clean -fd`, `git checkout --`, `git restore` on user changes, or equivalent destructive operations.
- Do not overwrite files merely to match an old report.
- Do not discard changes that appear unrelated to the current task.
- Inspect existing diffs before editing files with pre-existing changes.
- Keep implementation scope narrow and explain any unavoidable overlap.
- Do not commit, push, merge remotely, or rewrite Git history without explicit authorization.
- Do not install packages, update dependencies, regenerate lockfiles, or alter package versions without explicit authorization.
- Do not modify the protected file `last_commit_changes.txt`.

## 2.2 Protected-file integrity

The expected SHA-256 for `last_commit_changes.txt` is:

`e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`

At the beginning of execution:

1. Identify the actual repository root.
2. Confirm the protected file exists.
3. Calculate its SHA-256.
4. Compare the result with the expected value.
5. Record the result in the execution evidence.

If the file is missing or its hash differs:

- Stop before editing any source or test files.
- Do not attempt to repair, regenerate, restore, or overwrite it.
- Report the exact observed state and request human direction.

At the end of every implementation phase and at final closure, recalculate the hash. It must remain unchanged.

Do not claim that a hash check passed unless the actual command was executed successfully.

## 2.3 Truthfulness

- Distinguish source-code inspection from executable test evidence.
- Distinguish a test that was run from a test described in a previous report.
- Distinguish a test that passed from a test that could not run.
- Do not infer that a feature works merely because its implementation exists.
- Do not report a clean working tree if files are modified or untracked.
- Do not claim all stages are integrated merely because their reports exist.
- Do not invent a common Git history across separate Jules workspaces.
- Do not fabricate browser acceptance, benchmark results, test counts, or final HEAD values.
- Do not mark a known defect as resolved without regression evidence.

# 3. Repository and Environment Baseline

Start with a read-only inspection.

Record:

- Actual repository root.
- Operating system and execution environment.
- Current branch.
- Current HEAD commit.
- `git status --short`.
- Relevant existing diffs.
- Untracked files.
- Node.js and npm versions.
- Package manager and lockfile.
- Whether dependencies are already installed.
- Available test, lint, type-check, build, and browser-test scripts.
- Existing test framework and configuration.
- Presence and contents of the remediation reports.
- Protected-file SHA-256.

Inspect the package scripts before choosing commands. Do not assume script names are identical across repository revisions.

Known historical environments include:

- Local Windows checkout: `C:\Users\User\Downloads\dependency-analyzer`.
- Jules execution checkouts under paths such as `/app` or `/workspace`.

These environments may represent different revisions. Do not assume they share a working tree, branch, or commit.

If the current environment is a Jules checkout, record its actual root and Git identity. Do not claim that its changes have been integrated into the local Windows checkout unless the relevant Git evidence establishes that fact.

If dependencies are unavailable, do not install them without authorization. Run whatever safe checks are available and explicitly record the blocked checks.

Create a baseline record in:

`REMEDIATION_STAGE0_3_BASELINE_EVIDENCE.md`

Do not modify `last_commit_changes.txt`.

# 4. Existing Remediation History to Reconcile

The following is historical context to verify, not unquestionable truth.

## 4.1 Stage 0 — Coordinator preparation and safety nets

Previous reports described:

- Editable-target guards.
- Development-gated telemetry.
- Cleanup of debug globals.
- Detached-drill validation.
- Popup-blocker handling.
- Missing-position warnings.
- URL-selection edge-trigger behavior.
- A Stage 0 test command reportedly passing eight tests.
- A CLI suite historically reporting approximately 32 suites and 184 or more assertions.
- An initial Z46 extraction round-trip regression test documented with `.fails()` because of an extraction defect.

Verify the actual current implementation and test status. In particular, determine whether the Z46 defect was genuinely fixed and whether the temporary `.fails()` expectation was removed for the correct reason.

## 4.2 Stage 1 — Canonical position and contract hardening

Previous reports described:

- Canonical `Position` handling.
- A deterministic comparator.
- Strict boolean coercion.
- Explorer type-contract hardening.
- Lossless `extractNodesAndEdgesFromCy` behavior.
- Removal of the Z46 `.fails()` marker.

Stage 1 and Stage 2B historically touched `graph-layout.ts`. Inspect the actual merged result for regressions and contradictory implementations.

## 4.3 Stage 2A — Architecture layout correctness

Previous reports described:

- Handling of phantom nodes.
- High-risk unresolved architecture-layout behavior.
- Unresolved summaries derived from edges.
- Sanitization of saved positions.
- Rejection of non-finite coordinates and unknown node IDs.
- Immutable inputs.
- Deterministic packing.
- Complete position coverage.

Verify each behavior in the current source and tests.

## 4.4 Stage 2B — Graph layout and worker lifecycle

Previous reports described changes involving:

- `graph-layout.ts`.
- `layout-worker-client.ts`.
- `useArchitectureLayout: false` dispatcher behavior.
- Fallback position correctness.
- Actual timing measurements.
- Worker timeout and cancellation.
- Listener cleanup.
- Set/Map serialization.
- Complete result shapes.
- Event pairing.
- Avoidance of redundant extraction.
- Existing-position preservation.

Verify cancellation, timeout, listener cleanup, result validation, and fallback behavior under realistic asynchronous ordering.

## 4.5 Stage 2C — Orbit and Constellation

Previous reports described:

- Filtering and focal-depth behavior.
- Reachability.
- Dynamic angles.
- Clearance diagnostics.
- A 120-pixel clearance target.
- Test-file filtering.
- Distinct local versus multi-Sun engine contracts.

Verify the actual contracts and tests. Do not assume the reported clearance threshold is universally valid if the current product contract specifies otherwise; identify the authoritative contract before changing behavior.

## 4.6 Stage 3A — Persistence

The previous Stage 3A report described:

- `isValidCoordinate`.
- `sanitizePosition`.
- `sanitizePositionMap`.
- Sanitization of mode-scoped position maps for hierarchical, hybrid, orbit, and constellation modes.
- Deep-cloning of position maps.
- Finite-coordinate checks in position authority levels.
- Preservation of user-authored position provenance across save/reload.
- Five reported passing persistence tests.

Verify that saved state is sanitized at every relevant trust boundary, not just in one helper. Confirm that loading, saving, cloning, migration, and mode switching do not reintroduce invalid values or cross-mode position leakage.

## 4.7 Stage 3B — GraphView

The previous Stage 3B report described:

- Enhanced `graphStructureKey`.
- Monotonic `layoutRequestRef.current` to prevent stale asynchronous results.
- Mode-scoped `sessionPositionsRef`.
- Stage 0 keyboard safeguards.
- Five reported passing GraphView tests.

The reported key implementation sampled only the first and last nodes and edges. This is a known verification concern and must be addressed explicitly in Phase 2.

## 4.8 Stage 3 final integration

The previous consolidated report claimed:

- Branch: `jules-11061331815237493684-8ede6ce4`.
- HEAD: `11dfc60efdd8f1163b2457315f94b5dd04af289c`.
- Stage 0 test: eight passing tests.
- CLI test: 33 passing suites, according to that report's terminology.
- Stage 3A: five passing tests.
- Stage 3B: five passing tests.
- `git diff --check` passed.
- Protected-file hash remained unchanged.
- Stage 0–2C changes were integrated and passing.

Verify whether this HEAD exists in the current repository and whether the relevant source changes are present. Do not assume the branch or commit is available in this checkout.

Previous reports contain an October 2024 execution date, which is inconsistent with the current project timeline. Treat that as a report-quality issue and record the actual execution date when performing new verification. Do not silently rewrite historical claims to make them appear current.

# 5. Phase 1 — Reconcile All Stages on One Checkout

Establish one actual working checkout as the authoritative execution target.

Inspect:

- Git history and available branches.
- Existing source diffs.
- Stage reports and test reports.
- Stage-specific test files and scripts.
- `GraphView.tsx`.
- `projectState.ts`.
- `position-policy.ts`.
- `graph-layout.ts`.
- `layout-worker-client.ts`.
- `architecture-layout.ts`.
- Orbit and Constellation implementation and tests.
- `extractNodesAndEdgesFromCy`.
- Position serialization, restoration, and migration paths.
- Existing layout invalidation and request-cancellation logic.

For every historical stage, create a reconciliation matrix containing:

| Field | Required evidence |
|---|---|
| Stage | Stage 0, 1, 2A, 2B, 2C, 3A, or 3B |
| Reported behavior | What the report claims |
| Source evidence | Actual implementation and relevant files |
| Test evidence | Exact tests and current execution result |
| Integration status | Present, partially present, absent, or contradictory |
| Remaining issue | Specific gap, if any |
| Decision | Accept, repair, or leave explicitly unresolved |

Do not duplicate fixes that already exist.

Do not undo working implementation simply because a historical report is incomplete.

When stages overlap, especially in `graph-layout.ts`, inspect the final combined implementation and preserve the intended contracts of both stages.

Before editing any file with existing user changes, inspect the diff and ensure the intended patch will not erase unrelated work.

# 6. Phase 2 — Graph Invalidation Correctness Gate

This phase is mandatory.

## 6.1 Problem to investigate

The previously reported `graphStructureKey` used counts and selected endpoint information, conceptually resembling:

```ts
const graphStructureKey = useMemo(() => {
  if (nodes.length === 0) return '0:0';

  const firstNode = nodes[0];
  const lastNode = nodes[nodes.length - 1];
  const firstEdge = edges[0];
  const lastEdge = edges[edges.length - 1];

  return `${nodes.length}:${edges.length}:${firstNode?.id}:${firstNode?.type}:${firstNode?.layer}:${lastNode?.id}:${lastNode?.type}:${lastNode?.layer}:${firstEdge?.id}:${firstEdge?.relationshipType}:${lastEdge?.id}:${lastEdge?.relationshipType}`;
}, [nodes, edges]);
```

This strategy can miss changes to interior entries if counts and sampled endpoints remain unchanged.

Do not assume the snippet is still present. Inspect the current code first. If the implementation has already been corrected, verify its actual behavior rather than reapplying a duplicate fix.

## 6.2 Required regression scenarios

Create or extend focused tests to cover at least:

1. An interior node changes `type`, with node count and endpoints unchanged.
2. An interior node changes `layer`, with node count and endpoints unchanged.
3. An interior edge changes `relationshipType`, with edge count and endpoints unchanged.
4. An interior node ID changes while counts remain unchanged.
5. An interior edge ID or endpoint changes while counts remain unchanged.
6. Node or edge order changes where order is semantically significant.
7. A structurally equivalent graph does not trigger unnecessary invalidation merely because equivalent arrays or objects were recreated, if the intended contract is semantic equality.
8. Empty graph and first/last element transitions.
9. A graph mutation arrives while an older asynchronous layout request is still pending.
10. A result computed for the old graph cannot overwrite the state for the new graph.

Use the actual graph schema and the repository's established test framework.

Avoid writing tests that merely copy the implementation's assumptions. Construct mutation cases that would fail under the endpoint-sampling implementation.

## 6.3 Implement a correct invalidation strategy

If the defect is reproduced, implement a reliable and appropriately scoped solution.

Requirements:

- Include all structural fields that affect layout or graph interpretation.
- Include node identity and relevant node properties.
- Include edge identity, endpoints, and relevant relationship properties.
- Respect the actual graph contract rather than blindly including every object property.
- Ensure meaningful interior changes are detected.
- Avoid unnecessary invalidations where practical.
- Preserve deterministic behavior.
- Avoid mutating graph inputs.
- Do not introduce a fragile hash with unexamined collision behavior.
- If a stable serialization or structural signature is appropriate, document its field contract and ordering rules.
- If upstream immutable graph references are authoritative, explain how the strategy detects semantic changes that can occur under the actual update contract.
- Ensure asynchronous layout results remain associated with the exact graph version for which they were computed.

Do not use a generic `JSON.stringify` of the entire graph without evaluating performance, serialization correctness, optional values, ordering, and irrelevant metadata.

If a graph revision identifier already exists and is trustworthy, consider using it only if every relevant structural mutation reliably advances that revision. Prove that contract in tests.

## 6.4 Acceptance criteria

This gate passes only when:

- The interior-mutation regression tests exist.
- They fail against the vulnerable implementation, where a reproducible test setup can demonstrate that behavior.
- They pass against the corrected implementation.
- Stale results cannot overwrite newer graph state.
- Relevant existing GraphView and layout tests pass.
- The solution is consistent with the application's actual update and invalidation contract.

Document the result in:

`GRAPH_STRUCTURE_KEY_INVALIDATION_CLOSURE_REPORT.md`

If the current environment cannot reproduce or test a concern, state exactly what remains unverified.

# 7. Phase 3 — Verify Persistence and Position Authority

Inspect all paths through which positions enter, change, persist, and return to the graph.

The previous reports described the following authority hierarchy:

1. In-session user-drag position, scoped to the active layout mode.
2. Persisted project position for that layout mode.
3. Existing Cytoscape canvas position where still valid under the authoritative contract.
4. Intelligent initial layout position.
5. Deterministic fallback placement for a new node.

This hierarchy is historical context to verify, not permission to overwrite a stronger authoritative source with a weaker one.

## 7.1 Required behavior

- User-authored positions survive save and reload.
- Non-finite coordinates are rejected or sanitized according to the established contract.
- Unknown node IDs are not accepted into persisted position maps unless the contract explicitly supports them.
- Position maps are not accidentally shared across layout modes.
- Mutating an input position map does not mutate persisted or in-memory state through aliasing.
- New nodes receive deterministic initial placement.
- Deleted nodes do not leave invalid stale entries unless retained intentionally for a documented reason.
- Switching modes does not overwrite another mode's saved positions.
- Invalid persisted data does not crash layout initialization.
- A lower-authority fallback does not override a valid user-authored position.
- Provenance is retained and interpreted consistently.
- Save/reload and state migration preserve intended authority.

## 7.2 Required tests

Add or update tests for:

- `NaN`, positive and negative infinity, missing coordinates, and malformed position objects.
- Input immutability.
- Mode-scoped persistence.
- Provenance preservation.
- User drag versus persisted state precedence.
- Existing canvas position versus initial layout.
- New and deleted node reconciliation.
- Save/reload round trips.
- Malformed or outdated saved state.
- Concurrent or repeated state updates where applicable.

Do not change authority levels without first identifying the existing product contract and explaining why the change is necessary.

If a defect is found, fix it narrowly and run the relevant tests.

# 8. Phase 4 — Verify GraphView and Asynchronous Lifecycle

Audit GraphView's lifecycle and interactions after correcting graph invalidation.

Focus on:

- Graph changes during an in-flight layout.
- Layout mode changes during an in-flight layout.
- Worker success, error, timeout, and cancellation.
- Component unmount during asynchronous work.
- Request IDs and stale-result guards.
- Session position ownership and mode scoping.
- URL selection synchronization and feedback loops.
- Keyboard navigation and editable-target guards.
- Correct cleanup of event listeners and timers.
- Avoidance of redundant graph extraction and layout execution.
- Stable selection and focus behavior during graph changes.

Required properties:

1. Old layout results never overwrite newer graph state.
2. A mode-specific result never overwrites another mode's positions.
3. Cancelled work cannot later commit stale results.
4. Event listeners and timers are cleaned up.
5. Graph updates do not create infinite synchronization loops.
6. User selections and positions remain stable where the contract requires them to.
7. Empty, malformed, or rapidly changing graph data does not crash the component.

Add regression tests for each reproduced issue. Prefer deterministic test control over timing-dependent sleeps.

Do not refactor GraphView broadly in this phase merely to improve style. Make correctness changes first and preserve current functionality.

# 9. Phase 5 — Combined Stage 0–3 Regression Gate

Inspect `package.json` and the repository's test configuration before running commands.

Where the corresponding scripts exist, execute:

- `npm run test:stage0`
- `npm run test:cli`
- `node scripts/test-stage3a-persistence.cjs`
- `node scripts/test-stage3b-graphview.cjs`

The two Stage 3 scripts are historical examples. Verify they exist and inspect what they test before relying on them.

Run the current test framework's focused suites for:

- Z46 extraction round trip.
- Canonical position behavior.
- Deterministic sorting and strict boolean handling.
- Architecture layout.
- Graph layout.
- Worker client lifecycle.
- Orbit and Constellation.
- Graph invalidation.
- Persistence and position authority.
- GraphView asynchronous lifecycle.

Also run available:

- Type checking.
- Linting.
- Production build.
- Browser acceptance tests.
- Relevant performance tests or benchmarks.

Do not install dependencies if a check is blocked by missing packages. Report the exact limitation.

Run `git diff --check` where Git is available.

Record the exact command, exit code, test count, failures, and relevant output for each check. Do not invent test totals or combine incompatible test-count terminology.

At the end of this phase:

- Recalculate the protected-file hash.
- Inspect the final diff.
- Inspect the working tree.
- Identify any test files accidentally excluded by test discovery.
- Confirm no temporary `.fails()` tests remain without an explicit and justified contract.
- Confirm no unintended package or lockfile changes occurred.

If a test fails, diagnose and fix it when the issue is in scope and the fix is safe. Do not hide, skip, weaken, or delete a failing test merely to make the suite green.

If a failure is unrelated or cannot be safely resolved, document it and do not claim full closure.

# 10. Phase 6 — Stage 0–3 Closure Decision

Create:

`REMEDIATION_STAGE0_3_FINAL_CLOSURE_REPORT.md`

The report must contain:

1. Execution date and environment.
2. Repository root, branch, and verified HEAD.
3. Baseline working-tree status.
4. Protected-file hash before and after.
5. Stage reconciliation matrix.
6. Confirmed changes made during this run.
7. Known historical claims that were independently verified.
8. Known historical claims that were not verified.
9. Graph invalidation defect analysis and regression evidence.
10. Persistence and position-authority evidence.
11. GraphView and async lifecycle evidence.
12. Exact commands and results.
13. Type-check, build, and browser acceptance status.
14. Remaining failures and blockers.
15. Final working-tree status.
16. Explicit closure verdict.

Use one of these verdicts:

- `VERIFIED AND CLOSED`: all required correctness and regression gates pass.
- `IMPLEMENTED — PARTIALLY VERIFIED`: implementation exists but one or more required checks remain blocked.
- `BLOCKED`: a material unresolved issue prevents safe closure.
- `NOT CLOSED`: one or more required correctness or regression gates fail.

Do not use `VERIFIED AND CLOSED` while a known correctness defect remains unresolved.

## Gate to Tier 2

Do not begin Tier 2 implementation until:

- The repository identity and baseline are recorded.
- Protected-file integrity is confirmed.
- The graph invalidation gate passes.
- Persistence and authority checks pass.
- GraphView lifecycle checks pass.
- Required Stage 0–3 regression checks pass, or any blocked checks are explicitly adjudicated and a safe implementation path is established.

If the gate cannot pass, complete the available remediation work, document the blocker, and stop before broad Tier 2 refactoring. Do not conceal the failed gate.

# 11. Phase 7 — Tier 2 Readiness and Prioritization

After Stage 0–3 closure, evaluate the following previously deferred workstreams.

These are candidates, not unconditional requirements. Confirm they still apply to the actual source and that they have not already been implemented.

### Candidate A — Graph invalidation and differential reconciliation

Goal:

- Detect meaningful graph changes correctly.
- Avoid redundant extraction and reconciliation.
- Reconcile only affected graph elements when safe.
- Preserve identity, selection, layout, and position contracts.

This is the highest priority if the closure audit shows the current graph update path is incorrect, redundant, or expensive.

Do not build a complex differential reconciliation system before measuring the current behavior and identifying the actual correctness and performance bottleneck.

### Candidate B — GraphView hook extraction

Potential boundaries:

- `useCytoscape`: Cytoscape lifecycle, initialization, disposal, and event ownership.
- `useGraphLayout`: layout orchestration, cancellation, requests, and result acceptance.
- `useGraphSelectionSync`: selection and URL synchronization.

Before extraction:

- Map current state ownership.
- Identify lifecycle dependencies.
- Identify cross-hook ordering constraints.
- Record all externally observable behavior.
- Add characterization tests for the behavior that must remain unchanged.

Do not create hooks merely to move code between files. Each hook must have a coherent ownership boundary and a testable contract.

### Candidate C — `LayoutStateProvider`

Goal:

- Centralize layout state where there is demonstrated duplication or conflicting ownership.
- Make layout mode and position state transitions explicit.
- Preserve persistence, provenance, and position-authority behavior.

Before implementation, determine whether a provider is actually needed or whether existing state ownership is already coherent.

Avoid introducing unnecessary global state, prop-drilling complexity, circular dependencies, or additional rerenders.

### Candidate D — `AppContent` context decomposition

Goal:

- Reduce unnecessary coupling and rerenders.
- Separate independent state domains where source analysis supports the split.
- Preserve existing feature behavior and initialization order.

Identify the current consumers, state dependencies, and render causes before creating or splitting contexts.

Do not split contexts speculatively.

### Candidate E — Virtualized node listbox

Goal:

- Improve rendering performance for large node lists.
- Preserve keyboard navigation, accessibility, selection, filtering, focus, and URL synchronization.

Before implementation:

- Inspect the current list implementation.
- Establish a baseline at representative graph sizes.
- Determine whether virtualization is necessary.
- Identify accessibility and focus requirements.
- Reuse existing project dependencies and patterns where possible.

Do not install a new virtualization library without authorization.

### Candidate F — `discoverFeatures` Web Worker

Goal:

- Move expensive, suitable feature-discovery computation off the main thread when profiling demonstrates a benefit.

Before implementation:

- Measure the current computation.
- Inspect input and output serialization.
- Determine whether the computation is CPU-bound.
- Define cancellation and stale-result behavior.
- Handle worker errors, timeouts, and cleanup.
- Avoid moving trivial work into a worker when messaging and serialization overhead would dominate.

Do not duplicate existing worker infrastructure unnecessarily.

# 12. Phase 8 — Tier 2 Dependency and Architecture Analysis

Before implementing Tier 2, map the dependency relationships among the candidate workstreams.

Determine:

- Which candidates directly depend on graph invalidation correctness.
- Which candidates share GraphView state or lifecycle.
- Whether `LayoutStateProvider` is a prerequisite for hook extraction or vice versa.
- Whether `AppContent` context decomposition is independent of GraphView changes.
- Whether virtualization is independent of layout and selection state.
- Whether feature discovery currently shares worker infrastructure with layout.
- Which files each workstream owns.
- Which tests protect each contract.
- Which changes can safely be isolated.

Produce a concise dependency matrix and implementation order in the closure or Tier 2 readiness report.

Use the following default order unless repository evidence justifies a different order:

1. Correctness and performance baseline for graph invalidation/reconciliation.
2. GraphView lifecycle characterization and, if justified, hook extraction.
3. Layout state ownership and provider changes, if necessary.
4. `AppContent` context decomposition, if justified.
5. Node list virtualization, if measured performance warrants it.
6. `discoverFeatures` worker migration, if profiling warrants it.

Do not implement every candidate simply because it is listed. A workstream may be marked `NOT NEEDED`, `ALREADY IMPLEMENTED`, or `DEFERRED WITH EVIDENCE` when the repository supports that decision.

# 13. Phase 9 — Tier 2 Implementation Protocol

Implement one isolated workstream at a time.

For each workstream:

1. Establish the pre-change test baseline.
2. Identify the files and contracts in scope.
3. Inspect existing user changes in those files.
4. Define acceptance criteria.
5. Add characterization or regression tests before changing behavior where practical.
6. Implement the smallest coherent change.
7. Run focused tests.
8. Run adjacent subsystem tests.
9. Run type-check and build checks where available.
10. Inspect the full diff.
11. Check the protected-file hash.
12. Document results and remaining risks.
13. Proceed to the next workstream only when the current one is stable or its limitations are explicitly documented.

Do not make broad simultaneous edits to GraphView, layout state, application contexts, node-list UI, and worker infrastructure in a single unreviewable patch.

## 13.1 Parallel execution

Parallel work is permitted only if the environment genuinely provides isolated worktrees or branches and the workstreams have clearly separated ownership.

If separate workers are used:

- Assign explicit file ownership.
- Record each worker's branch and HEAD.
- Avoid concurrent writes to shared files.
- Require each worker to provide changed files, tests, and evidence.
- Integrate changes sequentially.
- Re-run combined tests after each integration.
- Resolve conflicts by inspecting the actual code and contracts, not by blindly choosing one side.

If isolated worktrees are unavailable, execute serially in the same checkout.

Do not assume that different Jules tasks automatically share a branch or that their changes have been integrated.

## 13.2 No speculative architecture expansion

Do not introduce:

- A new state management library.
- A new worker framework.
- A new virtualization dependency.
- A broad rewrite of GraphView.
- A new persistence format.
- A new graph schema.
- A sweeping directory restructure.

unless the existing implementation demonstrably requires it, the change is within the authorized scope, and the rationale is documented.

# 14. Phase 10 — Tier 2 Acceptance Criteria

The exact acceptance criteria must be refined from the actual repository, but the following principles are mandatory.

## Graph invalidation and reconciliation

- Meaningful structural changes are detected.
- Unchanged graphs do not trigger avoidable expensive work where the contract allows reuse.
- Selection, positions, and node identity remain stable where appropriate.
- Asynchronous work cannot commit stale results.
- Incremental updates produce the same required observable result as the authoritative full-reconciliation path.
- Tests cover both structural mutation and non-mutation cases.

## GraphView hooks

- Each extracted hook has a defined ownership contract.
- Initialization and cleanup remain correct.
- Existing behavior is preserved.
- Selection and URL synchronization do not loop.
- Layout cancellation and stale-result protection remain correct.
- Hook extraction does not introduce duplicate listeners or duplicate layout requests.

## Layout state provider

- State transitions are explicit and deterministic.
- Mode-specific positions remain isolated.
- Persistence and provenance remain correct.
- Consumers receive coherent state.
- No unintended rerender explosion or circular update path is introduced.

## AppContent contexts

- Context ownership is documented.
- Existing feature initialization remains correct.
- Consumers continue to receive required values.
- Independent state changes do not unnecessarily invalidate unrelated consumers where the new design intends isolation.
- Integration tests cover critical workflows.

## Virtualized node listbox

- Keyboard navigation remains functional.
- Focus and selection remain correct.
- Accessibility semantics are preserved.
- Filtering and graph updates behave correctly.
- Large-list performance is measured against the baseline.
- Tests cover empty, filtered, selected, and dynamically updated lists.

## Feature discovery worker

- Output matches the established main-thread implementation.
- Serialization is correct.
- Cancellation and stale-result guards work.
- Worker errors have a safe fallback or documented failure behavior.
- Cleanup is reliable.
- Measured performance justifies the added complexity.

# 15. Phase 11 — Regression and Final Integration

After each Tier 2 workstream, run its focused tests and relevant neighboring tests.

After all approved Tier 2 workstreams are complete, run the combined regression suite again.

Inspect the available scripts and use the repository's actual commands. Do not assume historical script names still exist.

At minimum, execute all applicable checks from:

- Stage 0 regression tests.
- CLI regression tests.
- Stage 3A persistence tests.
- Stage 3B GraphView tests.
- Graph invalidation tests.
- Architecture layout tests.
- Graph layout tests.
- Worker lifecycle tests.
- Orbit and Constellation tests.
- Graph extraction and sorting tests.
- Relevant UI interaction tests.
- Type checking.
- Linting.
- Production build.
- Browser acceptance tests.
- Relevant performance benchmarks.

Record checks that are blocked by unavailable dependencies or tooling. Do not install dependencies without authorization.

Run `git diff --check`.

Inspect:

- Final source diff.
- New and modified tests.
- Untracked files.
- Package and lockfile changes.
- Test discovery exclusions.
- Any temporary diagnostic code.
- Any debug globals or development-only code.
- Any accidentally weakened or skipped assertions.
- Protected-file hash.
- Final branch, HEAD, and working-tree status.

Do not commit or push.

# 16. Required Deliverables

Create or update the following reports in the repository, without modifying the protected file.

### A. `REMEDIATION_STAGE0_3_BASELINE_EVIDENCE.md`

Contains repository identity, baseline status, protected hash, environment, scripts, dependencies, and available test tooling.

### B. `GRAPH_STRUCTURE_KEY_INVALIDATION_CLOSURE_REPORT.md`

Contains the original concern, actual source inspected, mutation scenarios, tests, fix if needed, and final evidence.

### C. `REMEDIATION_STAGE0_3_FINAL_CLOSURE_REPORT.md`

Contains the reconciliation matrix, Stage 0–3 verification, combined tests, protected-file integrity, and closure verdict.

### D. `TIER2_READINESS_AND_DEPENDENCY_REPORT.md`

Contains candidate workstream status, dependency relationships, file ownership, evidence-based priority, prerequisites, and the approved implementation sequence.

### E. One report per Tier 2 workstream actually implemented

Use descriptive names, for example:

- `TIER2_GRAPH_RECONCILIATION_REPORT.md`
- `TIER2_GRAPHVIEW_HOOK_EXTRACTION_REPORT.md`
- `TIER2_LAYOUT_STATE_PROVIDER_REPORT.md`
- `TIER2_APPCONTENT_CONTEXT_DECOMPOSITION_REPORT.md`
- `TIER2_VIRTUALIZED_NODE_LISTBOX_REPORT.md`
- `TIER2_DISCOVER_FEATURES_WORKER_REPORT.md`

Only create implementation reports for workstreams actually attempted. Clearly label workstreams not implemented and explain why in the readiness report.

### F. `REMEDIATION_TIER2_FINAL_INTEGRATION_REPORT.md`

Contains:

- Final repository root, branch, and HEAD.
- Initial and final working-tree status.
- Stage 0–3 closure verdict.
- Tier 2 workstreams implemented and deferred.
- Summary of source changes.
- Exact test commands and results.
- Type-check, lint, build, browser, and performance results.
- Protected-file hash before and after.
- Known limitations and residual risks.
- Explicit final verdict.

# 17. Final Execution Summary

At the end, provide a concise but evidence-backed summary containing:

1. What was verified from Stage 0–3.
2. What was already correct and left unchanged.
3. What defects were reproduced.
4. What defects were fixed.
5. What Tier 2 workstreams were implemented.
6. What workstreams were deferred and why.
7. Which tests actually ran and passed.
8. Which tests failed or were blocked.
9. Whether the protected-file hash remained unchanged.
10. Final repository branch and HEAD.
11. Final working-tree status.
12. Remaining risks and the next concrete action.

Use an explicit overall verdict:

- `CLOSED — STAGE 0–3 VERIFIED; TIER 2 COMPLETE` only if both the Stage 0–3 closure gate and all approved Tier 2 acceptance criteria pass.
- `STAGE 0–3 CLOSED; TIER 2 PARTIALLY COMPLETE` if the baseline is verified but some approved Tier 2 work remains.
- `STAGE 0–3 VERIFIED; TIER 2 DEFERRED` if closure passes but Tier 2 was not justified or authorized for implementation.
- `PARTIALLY VERIFIED` if material checks remain blocked.
- `BLOCKED` if a material safety, integrity, or correctness issue prevents safe continuation.
- `NOT CLOSED` if required tests fail or known correctness defects remain.

Never claim completion merely because the implementation or reports exist.

# 18. Execution Order Summary

Follow this sequence without skipping gates:

**Phase 0:** Read-only repository baseline and protected-file integrity.

**Phase 1:** Reconcile Stage 0–3 reports against the actual source and tests.

**Phase 2:** Independently verify and close the `graphStructureKey` interior-mutation concern.

**Phase 3:** Verify persistence, provenance, mode scoping, and position authority.

**Phase 4:** Verify GraphView lifecycle, cancellation, and stale-result protection.

**Phase 5:** Run the combined Stage 0–3 regression suite.

**Phase 6:** Produce the Stage 0–3 closure report and make the explicit gate decision.

**Phase 7:** Evaluate and prioritize the deferred Tier 2 workstreams using repository evidence.

**Phase 8:** Map dependencies, ownership, and implementation order.

**Phase 9:** Implement justified Tier 2 workstreams one at a time, using isolated parallelism only when genuinely available.

**Phase 10:** Validate each workstream against its acceptance criteria.

**Phase 11:** Run final combined regressions, verify protected-file integrity, and produce the final integration report.

Start with Phase 0 now. Do not jump directly to broad refactoring. Do not stop at a report if a safe, in-scope implementation is possible. Do not continue into Tier 2 if the required correctness and safety gates have not passed.

The goal is a genuinely verified Dependency Analyzer repository, not simply a collection of remediation reports claiming success.
