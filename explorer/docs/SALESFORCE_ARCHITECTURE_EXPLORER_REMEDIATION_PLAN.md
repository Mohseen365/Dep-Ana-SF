# Salesforce Architecture Explorer --- Verified Remediation & Engineering Plan

**Purpose:** This is the execution plan for a coding agent working on
the supplied `explorer/` project. Treat it as a controlled engineering
plan, not permission to perform a broad rewrite.

**Repository baseline:** the uploaded `explorer.zip` inspected for this
plan. The archive contains 665 entries, including 558 TypeScript/TSX
source files and 357 test files. The exact current Git commit/branch is
not established by the archive. Do not assume the ZIP equals the latest
remote branch.

**Plan status:** implementation has not been performed by this document.
Every historical finding must be re-verified against the current source
and behavior before being labelled an open defect.

------------------------------------------------------------------------

## 1. Mission and definition of success

Make the Explorer reliable as a Salesforce dependency-analysis and
architecture-visualization tool. Correctness comes before cosmetic
polish or large-scale refactoring.

The application must:

1.  Show the correct project data and preserve the identity and meaning
    of Salesforce nodes and dependency edges.
2.  Apply the intended layout and restore user positions consistently
    across reloads, project switches, snapshots, and layout modes.
3.  Avoid stale graph state after re-analysis, simulation commits, or
    project changes.
4.  Keep structural graph changes separate from selection, hover,
    search, filtering, and other transient UI updates.
5.  Make the four architecture modes predictable: `hierarchical`,
    `hybrid`, `orbit`, and `constellation`.
6.  Remain usable with keyboard and assistive technology.
7.  Remain responsive on representative medium and large graphs.
8.  Have repeatable automated evidence: tests, type check, build, and a
    final integration report.
9.  Keep documentation aligned with verified implementation without
    rewriting historical reports to make old claims appear current.

### Non-goals

-   Do not redesign the product UI merely because a different design is
    possible.
-   Do not rewrite the entire graph engine or introduce a new
    state-management library before the current defects are reproduced
    and bounded.
-   Do not change analysis semantics, schemas, canonical fixtures, or
    generated project data without a demonstrated defect and explicit
    scope.
-   Do not remove features, compatibility paths, audit artifacts, or
    tests just to make checks pass.
-   Do not treat an audit report, test count, or agent completion
    message as proof that behavior works.
-   Do not bundle unrelated formatting, renaming, dependency upgrades,
    or opportunistic cleanup into defect fixes.

------------------------------------------------------------------------

## 2. Ground rules for the coding agent

### 2.1 Start with repository truth

Before editing:

1.  Confirm the working directory and inspect `git status --short`,
    current branch, and current commit if Git metadata exists.
2.  If the working tree has user changes, preserve them. Never reset,
    clean, overwrite, or reformat unrelated work.
3.  Read `AGENTS.md`, `README.md`, relevant package scripts, current
    tests, and the current project documentation if present. Respect
    repository-specific instructions.
4.  Read these audit artifacts, but treat them as historical evidence
    rather than unquestioned current truth:
    -   `docs/GRAPH_DEEP_PASS_FINDINGS.md`
    -   `docs/GRAPH_DEEP_PASS_PLAN.md`
    -   `docs/GRAPH_ARCHITECTURE_IMPROVEMENTS.md`
    -   `docs/Final_Jules_Dispatch_Schedule.md`
5.  Inspect the actual implementation and test around every finding
    before assigning a status.
6.  Record baseline test/build results before changing code.

### 2.2 Evidence-based issue statuses

Every issue must have one of these statuses in the issue register:

-   **CONFIRMED_OPEN** --- a reproducible defect exists in the current
    baseline.
-   **FIXED_IN_SOURCE_UNVERIFIED** --- current code appears to contain a
    fix, but the behavior or regression test has not been proven.
-   **VERIFIED_FIXED** --- a focused regression test proves the expected
    behavior, and relevant checks pass.
-   **NOT_REPRODUCED** --- reasonable reproduction attempts did not
    demonstrate the reported failure; retain evidence and do not claim
    universal correctness.
-   **STALE_OR_DUPLICATE** --- the report describes an old defect
    already addressed, or duplicates another tracked item.
-   **DEFERRED** --- intentionally out of scope for this remediation
    phase, with rationale and follow-up.
-   **BLOCKED** --- cannot proceed due to missing evidence, environment,
    or a conflicting requirement.

Do not call a task complete solely because source code was edited.

### 2.3 Change discipline

-   One coherent behavior change per commit or reviewable patch.
-   Add a regression test before or with each defect fix.
-   Preserve existing public interfaces unless a breaking change is
    explicitly approved.
-   Do not change multiple agents' shared files concurrently.
    `src/components/GraphView.tsx` has one designated owner at a time.
-   Keep the fix minimal first. Refactor only when required to make the
    contract testable or to prevent a demonstrated regression.
-   After every patch, inspect the diff and run the smallest relevant
    test set.
-   After integration, run the full relevant test suite,
    TypeScript/build checks, and manual smoke tests.
-   If a test fails before changes, document it as baseline failure; do
    not attribute it to the patch without evidence.

------------------------------------------------------------------------

## 3. Project map and key ownership areas

Use this as a navigation map, then confirm paths against the actual
checkout. These folders are in dependency-analyzer\explorer

  ------------------------------------------------------------------------------------------------
  Concern                 Primary locations                                Contract to establish
  ----------------------- ------------------------------------------------ -----------------------
  App/project lifecycle   `src/App.tsx`                                    Active project, data
                                                                           refresh, simulation
                                                                           commit, analysis
                                                                           status, derived graph
                                                                           pipeline

  Graph                   `src/components/GraphView.tsx`                   Cytoscape instance
  rendering/lifecycle                                                      lifecycle, structural
                                                                           synchronization, layout
                                                                           orchestration, event
                                                                           cleanup

  Graph construction      `src/lib/graph-builder.ts`                       Stable node/edge
                                                                           identity, endpoint
                                                                           integrity, type
                                                                           normalization

  Graph styles            `src/lib/graph-style.ts`                         Type/risk/LOD styling,
                                                                           visible legends,
                                                                           supported relationship
                                                                           types

  Layout dispatch         `src/lib/graph-layout.ts`                        Deterministic mode
                                                                           selection and layout
                                                                           configuration

  Architecture geometry   `src/lib/architecture-layout.ts`,                Geometry, stable IDs,
                          `src/lib/layout/`                                position conservation,
                                                                           adapter contracts

  Position policy         `src/lib/position-policy.ts`,                    Authoritative versus
                          `src/lib/layout/positions.ts`                    transient position
                                                                           precedence and
                                                                           provenance

  Project state           `src/lib/projectState.ts`                        State schema, defaults,
                                                                           persistence, migration
                                                                           and restoration

  Layout worker           `src/lib/workers/layout-worker-client.ts`        Input/output contract,
                                                                           fallback behavior,
                                                                           cancellation/error
                                                                           handling

  Graph controls          `src/components/GraphControls.tsx`               Keyboard behavior,
                                                                           active mode, accessible
                                                                           names and focus model

  Workspace navigation    `src/components/workspace/WorkspaceHeader.tsx`   Domain/lens semantics,
                                                                           active navigation state

  Error recovery          `src/components/GraphErrorBoundary.tsx` or       Reset/retry behavior
                          current equivalent                               and actionable error
                                                                           state

  Hover overlay           `src/components/EdgeHoverCard.tsx` or current    Semantic correctness
                          equivalent                                       and keyboard access

  History and comparison  `src/components/AnalysisHistoryPanel.tsx`,       Snapshot identity, diff
                          `src/components/ComparePanel.tsx`                correctness, restore
                                                                           behavior

  Diagnostics             `src/components/DiagnosticsPanel.tsx`, relevant  Accurate, explainable
                          diagnostics modules                              results and stable
                                                                           selection
  ------------------------------------------------------------------------------------------------

Names and locations above are expected navigation hints, not permission
to assume a file has the same implementation in every branch.

------------------------------------------------------------------------

## 4. Priority model

Use these priorities consistently:

-   **P0 --- correctness blocker:** wrong graph/project, lost user
    positions, stale state, broken primary workflow, or dependency
    integrity failure. Fix before feature work.
-   **P1 --- major reliability/accessibility/performance:** repeatable
    workflow breakage, serious keyboard/assistive-technology issue, or
    significant performance regression.
-   **P2 --- maintainability/quality:** structural risk, non-blocking
    accessibility issue, confusing diagnostics, or avoidable complexity.
-   **P3 --- polish/optimization:** low-impact visual inconsistency or
    optimization without demonstrated user impact.

A P0 label in this plan means "investigate first"; it is not proof that
a current bug exists. Final priority must reflect reproduced impact and
frequency.

------------------------------------------------------------------------

## 5. Workstream A --- Baseline, inventory, and issue register

**Priority:** P0 prerequisite\
**Owner:** Coordinator\
**Do not implement fixes during this workstream except an explicitly
approved environment repair.**

### Tasks

1.  Confirm repository and branch state. Record commit hash if
    available.
2.  Check for project instructions and read them before touching source.
3.  Determine package manager and runtime version from lockfiles and
    project configuration.
4.  Install dependencies using the repository's documented/locked
    process. Do not update package versions.
5.  Run:
    -   `npm test` (the package defines `test` as `vitest run`)
    -   `npm run build` (the package defines this as
        `tsc && vite build`)
    -   any repository-documented lint/type checks, if present
6.  Save exact commands, exit codes, summaries, and known baseline
    failures.
7.  Build an issue register with:
    -   stable ID;
    -   original report ID(s);
    -   concise title;
    -   affected files/symbols;
    -   status from §2.2;
    -   priority and impact;
    -   reproduction steps;
    -   expected versus actual behavior;
    -   regression test location;
    -   dependencies/blockers;
    -   evidence and final disposition.
8.  Search for tests already covering the behavior before adding
    duplicates.
9.  Separate production defects from stale audit notes, design
    suggestions, and deferred refactors.

### Exit gate A

Do not start broad parallel implementation until: - the baseline is
reproducible or all environment blockers are documented; - the issue
register distinguishes current defects from historical findings; -
`GraphView.tsx` ownership and workstream boundaries are agreed; - the
coordinator has identified tests that must remain green.

**Deliverable:** `REMEDIATION_BASELINE_AND_ISSUE_REGISTER.md`.

------------------------------------------------------------------------

## 6. Workstream B --- Graph data and relationship integrity

**Priority:** P0\
**Owner:** one agent; coordinate any shared type/schema changes with the
coordinator.

### Questions to answer

-   Are node IDs stable and unique across project reloads?
-   Does every edge endpoint resolve to a node or an explicitly
    supported unresolved-reference representation?
-   Are duplicate edges removed only when they represent the same
    relationship?
-   Are relationship types normalized consistently between analyzer
    output, graph builder, style rules, legend, and diagnostics?
-   Are test classes, custom objects, custom fields, LWC components,
    Apex classes, and triggers represented with the intended semantic
    identity?
-   Are unresolved relationships visible and explainable instead of
    silently dropped?
-   Are graph transformations preserving node and edge IDs?

### Implementation steps

1.  Identify canonical source data and its schema. Do not treat sample
    `public/` artifacts as the source of truth without checking their
    manifest and intended role.
2.  Create small deterministic fixtures containing:
    -   one valid relationship;
    -   one unresolved reference;
    -   duplicate input relationships;
    -   two distinct types that have similar names;
    -   nodes with long IDs/names;
    -   an isolated node;
    -   a cycle.
3.  Add invariant tests for node-ID uniqueness, edge-ID uniqueness,
    endpoint integrity, type normalization, and unresolved-reference
    handling.
4.  Fix only confirmed failures in the parser-to-builder pipeline.
5.  Validate that filters and layout adapters do not mutate canonical
    analysis data.
6.  Verify any generated report and UI count against the same underlying
    dataset.

### Acceptance criteria

-   All fixtures produce deterministic graph data.
-   Every edge is either valid and connected or represented through a
    documented unresolved-reference policy.
-   No unintended node cloning or identity changes occur through layout
    adapters.
-   Distinct semantic node types are not accidentally collapsed.
-   Existing public graph-data contracts remain compatible, or any
    required migration is documented and tested.

### Exit gate B

No layout work may compensate for malformed graph data. If graph
construction is incorrect, fix and verify it before judging layout
quality.

------------------------------------------------------------------------

## 7. Workstream C --- Position authority and persistence

**Priority:** P0\
**Owner:** one dedicated agent; this is the first high-risk
implementation lane. Do not run a second concurrent editor on
`GraphView.tsx` or position-policy files.

### Historical findings to verify

-   `T0-1`: position-authority defect reported by prior dispatch plan.
-   `N16`: `mode` accepted by `resolvePosition` but reportedly unused.
-   `N17` / `T0-6`: `hasAuth = true` default may incorrectly treat
    persisted positions as authoritative.
-   `T1-1`: session positions may not be scoped by architecture mode.
-   Prior reports identify several competing position sources and a
    position-only effect that may bypass the main resolver.

The current source reportedly contains newer provenance/authority checks
than the older audit. Inspect the actual current implementation and
tests; do not blindly reapply an old patch.

### Required contract

Document one deterministic read precedence for a node position in a
given mode. The contract must distinguish:

1.  persisted user-authoritative positions;
2.  explicit current-session user drag positions;
3.  valid current Cytoscape positions, if applicable;
4.  automatic layout-generated positions;
5.  absence of a position.

The exact order must be chosen from actual product requirements and
existing behavior, documented, and tested. Never infer authority solely
from a position object existing.

### Required test matrix

Test each of the following for at least two nodes and all architecture
modes where applicable:

-   no saved positions on initial load;
-   valid authoritative positions;
-   persisted positions marked non-authoritative;
-   user drag followed by rerender;
-   user drag followed by a structural data update;
-   mode switch and return to the previous mode;
-   reload and restoration;
-   project switch to a different project with overlapping node IDs;
-   re-analysis with new data;
-   malformed or partial position records;
-   static layout versus automatic layout;
-   simulation commit followed by source-data refresh.

Assertions must verify actual coordinates and provenance decisions, not
merely that a position exists.

### Implementation guardrails

-   Make authority explicit at the API boundary; avoid a permissive
    default that silently claims authority.
-   If `mode` affects semantics, use it in the resolver; otherwise
    remove it and update all callers.
-   Scope session positions by mode when the product contract requires
    separate per-mode geometry.
-   Route all reads/writes through a small number of documented
    functions.
-   Avoid a sweeping position-state rewrite unless the focused fix
    cannot satisfy the contract.
-   Keep persisted schema compatibility; add a migration only if
    required and tested.

### Exit gate C

The coordinator reviews the focused diff and test evidence. Do not
release the broader GraphView lane or position-policy follow-up until: -
targeted position tests pass; - existing relevant tests pass; - no
unrelated files changed; - precedence and mode scoping are documented; -
the test demonstrates the original failure and the fix.

**Deliverable:** `POSITION_AUTHORITY_FIX_REPORT.md`.

------------------------------------------------------------------------

## 8. Workstream D --- Graph lifecycle, structural synchronization, and layout modes

**Priority:** P0/P1\
**Owner:** one designated GraphView owner, after Workstream C's gate.

### Primary concerns

1.  Full Cytoscape element removal/recreation may run on changes that
    are not structural.
2.  Structural fingerprints may be incomplete or may change for
    non-structural reasons.
3.  Selection, hover, search, focus, and overlay updates must not
    inadvertently trigger a full graph rebuild.
4.  The four architecture modes need consistent initialization,
    switching, reset, fitting, and persistence behavior.
5.  Worker and synchronous layout paths must return compatible positions
    and errors.
6.  Event handlers and worker requests must be cleaned up or cancelled
    on graph/project changes.
7.  Layout adapters must conserve node identity and not create hidden
    duplicates.
8.  Static layout must not be silently overwritten by an unrelated
    effect.

### Tasks

1.  Draw the current graph lifecycle: Cytoscape creation → structural
    data sync → position resolution → layout dispatch → position
    capture/persistence → interaction updates.
2.  Map every effect in `GraphView.tsx` to the state change that is
    allowed to trigger it.
3.  Identify all places that remove/add elements, execute layouts, fit
    the viewport, or persist positions.
4.  Define what counts as a structural graph change. A count-only
    fingerprint is insufficient if node/edge identity or relationships
    can change while counts remain constant.
5.  Add tests or instrumentation proving:
    -   selection changes do not rebuild the graph;
    -   hover changes do not rerun layout;
    -   search/filter changes follow the documented
        structural/visibility strategy;
    -   true data changes synchronize the graph;
    -   event handlers do not accumulate after rerenders or project
        switches.
6.  Exercise each mode in a matrix:
    -   fresh load;
    -   switch from each other mode;
    -   reset;
    -   resize/fit;
    -   structural data change;
    -   restore saved positions;
    -   static layout;
    -   empty and single-node graph.
7.  Compare synchronous and worker results for validity, not necessarily
    pixel-identical geometry unless deterministic parity is required.
8.  Ensure worker failure has a safe, observable fallback; do not
    swallow failures silently.
9.  Only then consider differential Cytoscape reconciliation or a larger
    `useGraphElements` refactor.

### Acceptance criteria

-   A selection-only or hover-only action does not trigger a structural
    rebuild or layout execution.
-   Structural changes update nodes/edges without stale references or
    duplicated event listeners.
-   Each mode has a documented and tested transition contract.
-   Positions are resolved through the approved position policy.
-   Layout errors are visible in diagnostics/logging and do not corrupt
    persisted state.
-   Large refactors are split into reviewable steps with tests after
    each step.

### Exit gate D

Graph lifecycle and mode switching must pass the complete targeted
GraphView suite before UI polish work is merged.

------------------------------------------------------------------------

## 9. Workstream E --- App state and derived graph pipeline

**Priority:** P0/P1\
**Owner:** separate agent from the GraphView owner; coordinate interface
changes.

### Historical findings to verify

-   `N11`: `useProjectSafe` reportedly swallows hook-context errors.
-   `N12`: `handleProjectChanged` effect may resubscribe because object
    dependencies are unstable.
-   `N13`: analysis-status logic contains overlapping conditions.
-   `N14`: `committedMutatedGraph` may shadow newly analyzed `data`.
-   Older architecture notes propose extracting the
    `activeData → focusedGraphData → visibleGraphData → simulatedGraph`
    pipeline.
-   Other state responsibilities include selection, focus, impact,
    cycles, findings, simulation, handoff, detached windows, sidebar,
    and constellation options.

### Tasks

1.  Trace project selection, source data refresh, analysis status,
    simulation commit, and error handling.
2.  Reproduce whether committed simulated data remains active after
    source data changes. Use a test where `generatedAt` or an explicit
    source version changes.
3.  Determine whether hook-context exceptions can be mistaken for a
    missing provider. Preserve graceful fallback where intended but make
    genuine programming errors observable in development/tests.
4.  Inspect effect dependencies and subscription cleanup. Do not assume
    object identity is unstable; prove it with tests or a profiler.
5.  Extract analysis-status derivation into a pure function only if
    doing so clarifies and tests the existing contract.
6.  Test the derived-data pipeline as pure transformations where
    possible:
    -   base/active data;
    -   focus;
    -   filtering;
    -   simulation;
    -   final visible graph.
7.  Add lifecycle tests for project switch, failed load, no analysis,
    re-analysis, simulation commit, snapshot restore, and return to a
    previous project.
8.  Keep the current state architecture unless a minimal extraction is
    necessary. Do not split providers simply because an old design
    document suggests it.

### Acceptance criteria

-   A source-data revision cannot be shadowed indefinitely by stale
    simulation state.
-   Project changes clear or scope project-specific transient state
    according to documented product behavior.
-   Analysis status is consistent across loading, no-data, error, and
    successful-analysis states.
-   Subscriptions and event listeners are not duplicated.
-   Derived pipeline tests are deterministic and independent of the DOM
    where feasible.

------------------------------------------------------------------------

## 10. Workstream F --- Styling and graph semantics

**Priority:** P1/P2\
**Owner:** independent lane, only after graph-data type contracts are
clear.

### Historical findings to verify

`GRAPH_DEEP_PASS_FINDINGS.md` lists N1--N7: - `lwc-apic` versus
`lwc-apex` color key; - missing `event-publisher` edge color; - risk
border rules potentially overridden by later node-type rules; - unused
`lod-*` classes; - test-class selector expecting a string while data may
be boolean; - similar colors for `Object`/`CustomObject` and
`Field`/`CustomField`; - overlapping zoom/LOD label rules.

A later source inspection reported that the color-key typo,
event-publisher color, risk-border ordering, boolean test selector, and
distinct object/field styling appeared addressed in the supplied source.
Verify them rather than redoing them.

### Tasks

1.  Compare the actual relationship-type union, graph-builder data
    shape, style selectors, legend, and all supported edge/node types.
2.  Build a table-driven test for every supported type: expected
    selector, label, shape/color, and legend entry.
3.  Ensure risk styling remains visible when combined with every node
    type.
4.  Ensure boolean data selectors match the actual Cytoscape data type.
5.  For LOD classes, choose deliberately: implement their intended
    visual behavior or remove dead code only after proving no
    runtime/tooling contract depends on it.
6.  Check contrast and distinguishability without relying on color
    alone.
7.  Avoid changing the visual language unless an existing contract is
    demonstrably inconsistent.

### Acceptance criteria

-   Every supported node and edge type has an intentional style or
    documented fallback.
-   Legend entries correspond to actual rendered semantics.
-   High-risk styling remains perceptible alongside type styling.
-   Tests catch future spelling/type mismatches.
-   No dead selector cleanup changes intended zoom behavior.

------------------------------------------------------------------------

## 11. Workstream G --- Keyboard access, ARIA, overlays, and recovery

**Priority:** P1\
**Owner:** UI/accessibility agent; avoid concurrent changes to shared
graph lifecycle code.

### Graph controls

Historical N18--N20 identify potential memoization and roving-focus
issues. Verify: - whether `activeControlIndex` drives `tabIndex`; -
whether toolbar key handling is scoped to focus inside the toolbar; -
whether `React.memo` provides meaningful benefit; - whether arrow-key
behavior matches the chosen toolbar interaction pattern; - whether
active architecture mode is announced accurately.

If the toolbar uses the roving-tabindex pattern, exactly one enabled
control should be in the sequential tab order, focus movement must be
predictable, and disabled/hidden controls must be handled consistently.
If a different pattern is selected, document it and test it.

### Workspace header

Historical N21--N23 identify: - possible misuse of `aria-current="page"`
for same-page lens buttons; - duplicated or noisy navigation
landmarks; - localStorage reads during clicks.

Treat localStorage micro-optimization as low priority unless profiling
shows impact. Fix semantics based on the actual interaction model, not
mechanically by replacing one ARIA value with another.

### Error boundary

Historical N24--N25 identify: - boundary not resetting when relevant
props change; - retry immediately failing with no recovery feedback.

Implement a deliberate reset contract, preferably a documented
`resetKey` or keyed boundary. Retry must not falsely claim recovery. If
the underlying error persists, keep an actionable fallback and
diagnostic evidence.

### Hover card and overlays

Historical N26 flags an interactive link nested inside `role="tooltip"`.
Tooltips should not contain focusable interactive content. Choose a
proper popover/dialog/link interaction model if the card has an
actionable file link. Confirm keyboard focus, Escape behavior if
appropriate, focus restoration, and safe URL handling.

### Acceptance criteria

-   All graph controls are operable by keyboard.
-   Focus is visible and does not get trapped accidentally.
-   Active mode and navigation state are exposed accurately.
-   Hidden controls cannot receive keyboard focus.
-   Interactive hover content has appropriate semantics.
-   Error recovery resets on the intended event and exposes persistent
    errors.
-   Add focused tests for keyboard and error-recovery behavior, not only
    static attribute snapshots.

------------------------------------------------------------------------

## 12. Workstream H --- Performance and instrumentation

**Priority:** P1 after correctness; P2 otherwise\
**Owner:** performance agent; no premature algorithm rewrites.

### Historical areas

-   `N8`: feature discovery recomputation due to `nodes`/`edges`
    references.
-   `N9`: redundant hover state updates.
-   `N10`: resetting `document.body.style.cursor` may clobber another
    UI's cursor.
-   `N15`: feature overlay canvas may repaint on selection changes.
-   `N18`: GraphControls memoization may be defeated by unstable state
    references.
-   layout worker threshold and large-graph responsiveness.

### Method

1.  Profile representative graphs with recorded node/edge counts and a
    repeatable sequence.
2.  Measure separately:
    -   initial load;
    -   typing in search;
    -   filter toggle;
    -   node select;
    -   hover transitions;
    -   mode switch;
    -   reset/fit;
    -   structural update;
    -   snapshot restore.
3.  Record React commits, layout invocation counts, graph rebuild
    counts, and elapsed time where practical.
4.  Optimize only a measured hotspot. Avoid brittle count-only
    fingerprints that fail to detect changed IDs/edges.
5.  Make feature discovery depend on a stable structural input or move
    it to the canonical unfiltered graph if semantics permit.
6.  Avoid redundant state updates where they cause measurable work.
7.  Scope cursor changes to the component/container and restore previous
    values where appropriate; do not mutate global cursor state without
    ownership.
8.  Confirm overlay paint dependencies and separate structural graph
    input from selection-only decoration where useful.
9.  Use a worker only when benchmark data supports it and worker
    failure/fallback behavior is tested.

### Acceptance criteria

-   Baseline and post-change timings are comparable and documented.
-   No performance change weakens correctness or graph identity.
-   Search and selection do not trigger unnecessary full layout.
-   Worker and main-thread paths both have tests.
-   Any threshold (including the historical 2,500-node proposal) is
    based on measurement, not treated as a universal constant.

------------------------------------------------------------------------

## 13. Workstream I --- History, comparison, snapshots, and diagnostics

**Priority:** P1/P2\
**Owner:** workflow agent, with project-state owner review.

### Required scenarios

1.  Create two known analysis snapshots, one with an added node, one
    removed edge, and one changed relationship.
2.  Verify compare view reports exactly the known differences.
3.  Restore a snapshot and verify project identity, graph content,
    layout mode, and saved positions follow the documented restore
    contract.
4.  Switch projects after opening history/compare panels; ensure
    selected snapshot references do not leak between projects.
5.  Test missing, corrupt, or schema-incompatible snapshots with a clear
    error and no partial destructive state.
6.  Verify diagnostics counts and findings match the underlying graph.
7.  Selecting a finding/cycle should focus the correct node(s) without
    corrupting filters or persistent layout state.

### Acceptance criteria

-   Snapshot identity is stable and project-scoped.
-   Compare output is deterministic for deterministic fixtures.
-   Restore is atomic from the user's perspective: either the valid
    snapshot is restored or the previous state remains usable.
-   Diagnostics can be cross-checked against known fixtures.
-   No stale panel selection survives a project change unless explicitly
    intended.

------------------------------------------------------------------------

## 14. Workstream J --- Visual layout, minimap, and responsive behavior

**Priority:** P2\
**Owner:** UI polish lane after core state and layout contracts pass.

### Tasks

1.  Inspect current CSS and graph-control/minimap markup at narrow,
    medium, and wide viewport sizes.
2.  Verify the historical `.minimap-container` / `.cytoscape-navigator`
    positioning concern against current CSS. Prior notes identify a
    possible `!important` collision around `bottom: 60px`; do not assume
    it remains.
3.  Check that floating graph controls do not cover important graph
    content, overlays, or interactive elements.
4.  Test zoom extremes and long labels.
5.  Verify the legend remains readable and semantically aligned with
    graph styles.
6.  Confirm focus rings are not clipped and overlays stay inside the
    viewport.
7.  Avoid full-screen visual redesign; make the smallest change that
    resolves the reproduced issue.

### Acceptance criteria

-   No critical control is obscured at supported viewport sizes.
-   Minimap and floating controls remain distinct and operable.
-   No horizontal overflow or clipped focus indicators in supported
    layouts.
-   Graph remains usable at zoom extremes and with long Salesforce
    names.

------------------------------------------------------------------------

## 15. Parallel execution plan and file ownership

Parallelism is allowed only for independent work. It is not permission
for multiple agents to edit the same high-risk files.

### Wave 0 --- Coordinator baseline

Complete Workstream A. No broad implementation dispatch before the
baseline and issue register are accepted.

### Wave 1 --- Safe independent lanes

After Wave 0, launch only lanes whose scope does not overlap:

-   **Lane B --- graph data integrity:** graph-builder, fixtures,
    focused builder tests.
-   **Lane F --- styling and graph semantics:** style files and
    style/legend tests, after type contracts are agreed.
-   **Lane G --- accessibility/UI:** GraphControls, WorkspaceHeader,
    error boundary, hover card, and their tests, subject to file
    ownership checks.
-   **Lane I --- history/compare workflows:** panel tests and narrowly
    scoped workflow fixes, coordinated with project-state owner.

Every lane must declare files it will edit before starting. If a lane
needs a protected shared file, it pauses and requests ownership transfer
or a coordinated patch.

### Wave 2 --- Position authority gate

Run Workstream C alone on position policy and the necessary GraphView
changes. No second agent may edit those files.

Coordinator must review the position-authority report and targeted tests
before release.

### Wave 3 --- GraphView engine and App pipeline

After the position gate: - **Lane D --- GraphView lifecycle/layout:**
one owner for `GraphView.tsx` and its directly coupled lifecycle
tests. - **Lane E --- App state pipeline:** separate owner for `App.tsx`
and pure derivation helpers/tests. - Keep shared type and state-schema
edits coordinated through the coordinator.

If a task spans both `App.tsx` and `GraphView.tsx`, split it into a
contract-first patch and a consumer patch. Do not let two agents
independently implement the same state transition.

### Wave 4 --- Performance and visual polish

Only after correctness suites pass. Use profiling evidence for
performance work and current browser behavior for visual fixes.

### Wave 5 --- Integration and closure

One coordinator: 1. reviews every branch/diff; 2. integrates one lane at
a time; 3. resolves conflicts deliberately; 4. reruns focused tests
after each merge; 5. runs full tests and build after integration; 6.
performs smoke tests; 7. updates the issue register and creates the
final report.

A lane report is evidence to review, not automatic approval to merge.

------------------------------------------------------------------------

## 16. Required regression test matrix

The coding agent must build or identify tests covering the following
behaviors. Use existing fixtures where possible; avoid duplicating
equivalent tests.

  ------------------------------------------------------------------------------
  ID                      Scenario                  Essential assertion
  ----------------------- ------------------------- ----------------------------
  R01                     Fresh project, no saved   Initial layout runs and
                          positions                 creates valid positions

  R02                     Authoritative persisted   User positions win according
                          positions                 to documented precedence

  R03                     Non-authoritative layout  Automatic layout is allowed
                          positions                 to run

  R04                     Drag node, rerender       Position remains stable

  R05                     Drag node, structural     User position follows the
                          update                    contract

  R06                     Switch mode and return    Mode-specific positions
                                                    restore correctly

  R07                     Switch project with       No position/data leakage
                          overlapping node IDs      

  R08                     Re-analysis after         New source data is not
                          simulation commit         shadowed by stale committed
                                                    graph

  R09                     Selection change          No unnecessary structural
                                                    graph rebuild

  R10                     Hover change              No unnecessary layout
                                                    execution

  R11                     Structural data change    Changed node/edge identities
                          with unchanged counts     are recognized

  R12                     Worker failure            Safe fallback and observable
                                                    diagnostic

  R13                     Unresolved dependency     Relationship is preserved
                                                    according to policy

  R14                     Duplicate input           Correct deduplication or
                          relationship              preservation policy

  R15                     Compare snapshots         Exact expected
                                                    additions/removals/changes

  R16                     Restore snapshot          Data and layout state follow
                                                    documented restore contract

  R17                     Toolbar keyboard use      Predictable focus movement
                                                    and visible focus

  R18                     Error boundary            Recovery works when cause is
                          retry/reset               removed; persistent errors
                                                    remain actionable

  R19                     Risk style combined with  Risk affordance remains
                          each node type            visible

  R20                     Every supported edge type Style and legend have
                                                    matching semantics

  R21                     Narrow viewport/minimap   Controls and focus remain
                                                    visible

  R22                     Empty/single-node/large   No crash; expected layout
                          graph                     and usable controls

  R23                     Event listener lifecycle  No duplicate handlers after
                                                    rerender/project change

  R24                     Filter/focus/search       Visible graph and counts
                          combination               remain internally consistent
  ------------------------------------------------------------------------------

For each test, record whether it existed before remediation, was added,
or was modified. If a scenario is impossible to test in the current
environment, record the blocker and a manual test procedure.

------------------------------------------------------------------------

## 17. Definition of done for every issue

An issue can be marked **VERIFIED_FIXED** only when all applicable
requirements hold:

-   [ ] Reproduction or original failing assertion is recorded.
-   [ ] Expected behavior is explicit.
-   [ ] Root cause is identified, not guessed.
-   [ ] Regression test fails before the fix when practical, and passes
    after.
-   [ ] Focused tests pass.
-   [ ] Relevant existing tests pass.
-   [ ] TypeScript/build checks pass where applicable.
-   [ ] Diff contains no unrelated edits.
-   [ ] No public contract/schema change was made silently.
-   [ ] The final code path is reviewed, including error and cleanup
    behavior.
-   [ ] Documentation/issue register status reflects the evidence.
-   [ ] Remaining limitations are explicitly stated.

If the original failure cannot be reproduced, mark it `NOT_REPRODUCED`
or `STALE_OR_DUPLICATE`, with evidence. Do not create a code change
merely to satisfy an old report.

------------------------------------------------------------------------

## 18. Validation commands and environment policy

The supplied `package.json` declares:

``` bash
npm test
npm run build
```

`npm test` runs `vitest run`. `npm run build` runs `tsc && vite build`.

Before running commands, confirm the package root and package manager.
Use the lockfile and repository instructions. Do not run package
upgrades as part of remediation. If dependencies are absent, install
from the lockfile using the repository's prescribed command and document
any network/environment failure.

After each focused patch, run the relevant Vitest test(s), then broader
tests. After integration, run the complete test suite and build. If
linting or additional checks are configured elsewhere, run those too.

The final report must include actual command output summaries, exit
codes, test counts, and failures. Never report tests as passing if they
were not executed.

------------------------------------------------------------------------

## 19. Documentation and issue-register maintenance

Historical reports are records of what was believed or observed at the
time. Do not edit them to erase the old finding.

Instead:

1.  Keep the original audit reports intact unless the task explicitly
    authorizes changes.
2.  Create a current remediation register that maps every historical
    finding to its current status and evidence.
3.  Mark superseded findings and link the verified replacement or test.
4.  Identify contradictory claims between old plans and current code.
5.  Update only current navigation/status documents within the approved
    scope.
6.  Search for broken file paths, obsolete function names, stale test
    references, and duplicated issue IDs.
7.  Clearly distinguish code verified in the archive from code verified
    in the live working tree.

------------------------------------------------------------------------

## 20. Required deliverables

The coordinator must produce:

1.  `REMEDIATION_BASELINE_AND_ISSUE_REGISTER.md`
    -   branch/commit, clean/dirty status, baseline commands/results,
        issue inventory, evidence and priorities.
2.  One implementation report per workstream actually executed.
    -   files changed, root cause, tests added, commands run, results,
        unresolved concerns.
3.  `GRAPH_EXPLORER_REMEDIATION_FINAL_REPORT.md`
    -   summary of confirmed fixes;
    -   issues verified fixed, not reproduced, stale/duplicate,
        deferred, and blocked;
    -   test/build results;
    -   manual smoke-test results;
    -   performance evidence if measured;
    -   all remaining risks;
    -   exact list of modified files and rationale.
4.  A clean, reviewable diff with no unapproved generated-data or
    unrelated formatting changes.

Do not create empty reports for workstreams that were not performed. Do
not claim completion of the whole project if only a subset of issues was
verified.

------------------------------------------------------------------------

## 21. Final smoke-test checklist

Run against a representative Salesforce project and, where possible, a
second unrelated project.

-   [ ] App starts and the expected project data loads.
-   [ ] Node/edge counts and a few known relationships match the source
    report.
-   [ ] Unresolved references are visible and intelligible.
-   [ ] Search, filters, focus, and selection work together.
-   [ ] All four architecture modes can be entered and exited.
-   [ ] Reset/fit works without unexpectedly overwriting saved
    positions.
-   [ ] Dragged positions persist according to the defined contract.
-   [ ] Re-analysis and simulation commit show current data.
-   [ ] Switching projects does not leak data, positions, or transient
    selections.
-   [ ] History, comparison, and snapshot restore behave correctly.
-   [ ] Diagnostics and findings point to the expected nodes.
-   [ ] Toolbar works with keyboard only.
-   [ ] Error states are understandable and retry/reset behaves
    correctly.
-   [ ] Minimap and controls do not overlap critically at supported
    viewport sizes.
-   [ ] No console errors, uncaught exceptions, or repeated
    layout/rebuild loops during the walkthrough.
-   [ ] Full automated test suite and production build pass after the
    final integration.

------------------------------------------------------------------------

## 22. Explicit stop conditions

Stop and report rather than improvising if:

-   the current branch or user changes cannot be safely preserved;
-   source data/schema authority is unclear;
-   a position-policy change would silently invalidate persisted user
    layouts;
-   two agents need to edit the same high-risk file concurrently;
-   a required test cannot be run and there is no credible alternative
    verification;
-   the fix requires a breaking contract or migration outside approved
    scope;
-   integration reveals a regression whose root cause is unknown;
-   the proposed change only makes a test pass by weakening or deleting
    meaningful assertions;
-   a historical report contradicts the current source and the
    authoritative behavior cannot be established.

Every stop report should include the blocker, evidence, affected files,
safe options, and the decision needed to proceed.

------------------------------------------------------------------------

## 23. The first instruction to the coding agent

**Start with Workstream A only.** Inspect the current repository
instructions, source, tests, and historical reports; run the baseline
checks; and create `REMEDIATION_BASELINE_AND_ISSUE_REGISTER.md`. Do not
begin broad fixes until the issue statuses, file ownership, and baseline
failures are established.

Then implement the highest-priority *confirmed* defect in a narrow patch
with a regression test. Follow the gates in this plan, preserve
unrelated work, and report evidence rather than assumptions.

**Success means a smaller set of verified defects, explicit contracts,
and reliable regression protection---not the largest number of files
changed.**
