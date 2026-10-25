# Architecture Explorer — Post-Repair Runtime Qualification & Benchmark Re-Execution Prompt

## Mission

Independently verify the changes described in `ARCHITECTURE_EXPLORER_PERFORMANCE_BASELINE_REPAIR_AND_REVERIFICATION_REPORT.md` against the current repository, then execute the missing runtime qualification if the environment permits.

The latest report claims `PASS WITH LIMITATIONS`, with these changes:
- Benchmark event listeners now filter by target `architectureMode` and `requestId > initialReqId`.
- PBIM sampling is configured to use a continuous browser session and unique raw-output files.
- Worker deserialization now reconstructs typed `FeatureRegion` objects, including `width` and `height`.
- The actual export CLI uses `--project` / `--project-id`, not historical `--projectName`.
- `npm run test:cli` passed 31/31.
- Live Playwright benchmark re-execution was not performed because the Vite server/browser were inactive and `explorer/node_modules` was absent.
- Cloud Spend Tracker Constellation's one-node/zero-edge output remains an unresolved product-contract decision.

**The purpose of this phase is to close the runtime evidence gap, not to blindly trust or repeat the prior report.**

## 1. Safety and provenance

Before any command or change:
1. Record repository root, branch, HEAD, and working-tree status.
2. Inspect the current diff and verify that it matches the prior report's described changes.
3. Preserve user changes and all prior reports/raw JSON.
4. Do not reset, clean, checkout another branch, amend commits, or overwrite files.
5. Do not run `scripts/export-explorer.cjs` and do not modify project datasets or `project-manifest.json`.
6. Do not optimize layout algorithms or resolve the Constellation product decision in this task.
7. Inspect package scripts, lockfiles, and benchmark runner side effects before installing dependencies or running browser tests.
8. Keep source inspection, automated tests, and browser-observed evidence clearly separated.

If the current HEAD/source differs from the report, document the mismatch and qualify the current code, not the historical claims.

## 2. Audit the benchmark listener correlation more deeply

Inspect both:
- `scripts/run-formal-performance-baseline.cjs`
- `scripts/run-pbim-full-cycles.cjs`

The report says the handlers require `evt.detail.architectureMode === targetMode` and `evt.detail.requestId > initialReqId`.

Verify whether this condition actually identifies the request caused by the current action. A greater-than check may be adequate only if request IDs are monotonic within the same mounted page, the page does not reload, and no concurrent action can issue a later request. Prove these assumptions from source and runner behavior. Do not accept `requestId > initialReqId` automatically as exact request correlation.

Check:
- listener installed before the click/action;
- `initialReqId` is captured from the correct page/global state;
- the intended transition is the only action capable of advancing the request ID during the wait;
- target mode and request identity both match;
- ignored events do not remove the listener;
- timeout cleanup removes listeners and timers;
- an event arriving after timeout cannot resolve or corrupt the completed sample;
- fallback/error outcomes are represented correctly according to the real app contract;
- no fixed sleeps or indicator-only completion checks remain.

Add or run focused tests for wrong mode, stale ID, unrelated completion first, correct completion, timeout, and listener cleanup. If no test harness exists for the event-wait helper, extract a small pure helper only if that is a minimal, justified change.

## 3. Verify worker deserialization against the true type contract

Inspect:
- `explorer/src/lib/workers/layout-worker-types.ts`
- `explorer/src/lib/workers/layout.worker.ts`
- `explorer/src/lib/workers/layout-worker-client.ts`
- the canonical synchronous layout result construction
- `FeatureRegion` / `DomainRegion` definitions
- `FeatureOverlayCanvas` and every consumer of reconstructed region objects

The prior report shows optional summary fields such as `primaryLayer?: any`, and reconstruction fallbacks such as `primaryLayer || 'application'`, `nodeCount ?? 0`, and `orderIndex ?? 0`.

Verify these defaults are semantically valid. Do not equate a structurally type-checking object with a semantically equivalent one. Determine whether worker and synchronous paths preserve the same metadata and behavior. Remove `any` from newly changed type declarations if feasible and safe, using the actual canonical type rather than guessed replacements.

Run focused tests proving:
- `width` and `height` are finite and equal to their bounds' differences;
- required metadata survives serialization/deserialization;
- worker and synchronous paths produce equivalent region data for representative input;
- feature overlay elements receive valid dimensions.

If dependencies are unavailable, state that the test was not run. Do not claim runtime rendering was verified from source inspection alone.

## 4. Validate project initialization and selector behavior without exporting data

Inspect `scripts/export-explorer.cjs`, `parseArgs()`, project registry/manifest code, and project-loading code.

Confirm the report's CLI claim directly from current source:
- supported flags;
- defaults;
- working directory assumptions;
- output paths;
- whether execution writes manifests/copies assets.

Do not run export. Do not change datasets or manifests.

If a safe browser is available, open the app using existing registered datasets and verify:
- initial project selection;
- actual options shown in the project selector;
- selecting a registered project requests the expected registered data path;
- the loaded graph corresponds to the selected project rather than a stale/default dataset.

Record observed project IDs and results. If browser access is unavailable, report source/test evidence only and keep the runtime gate open.

## 5. Cross-layout runtime qualification

Use the current selectors only after verifying them against source/DOM:
- `.domain-lenses-bar`
- `[aria-label="Graph view: Interactive Dependency Graph Canvas"]`
- `.graph-controls-floating`
- `.graph-control-btn`
- `.graph-control-btn.active`
- `[data-testid="architecture-mode-toggle"]`
- `[data-testid="layout-mode-toggle"]`
- `[data-testid="graph-mode-indicator"]`

Using existing registered projects only, verify all four architecture modes:
- Hierarchical
- Hybrid
- Orbit
- Constellation

For each tested project/mode:
1. Record project ID and source graph counts.
2. Record starting and target architecture modes.
3. Trigger the mode switch after arming the completion listener.
4. Verify selected-button state, mode indicator, matching completion event, outcome, and resulting graph state.
5. Record visible projected node/edge counts separately from source graph counts.
6. Check browser console/page errors and React render errors.
7. Verify static/interactive layout mode separately if the control is present.
8. Do not treat `.active` or the mode indicator alone as proof of layout completion.

At minimum, attempt `default`, `cloud-spend-tracker`, and `pbim` if they are already registered and browser resources permit. Do not export missing projects.

Specifically record the known Cloud Spend Tracker Constellation behavior (reported 1 node / 0 edges). Do not change it in this task; report whether it reproduces and leave the product decision pending.

## 6. Re-run the performance benchmark only after the harness passes its focused checks

Before running:
- inspect all scripts for side effects;
- verify the output filename is unique;
- confirm the prior raw JSON will remain unchanged;
- confirm the continuous-session runner really avoids re-navigation between warm-up and five measured runs.

If safe and the Vite server/browser are available:
1. Run one small smoke transition to validate the event listener.
2. Run PBIM Hybrid warm-up plus five measured runs in one continuous page/session.
3. Record session ID, navigation count, request IDs, start/target modes, outcomes, `durationMs`, `e2eMs`, and sample classification.
4. Independently calculate count, min, max, median, mean, and range from the new raw values.
5. Only if that succeeds, run the remaining dataset/mode matrix within safe resource limits.
6. Write new output to a uniquely named file such as `audit-reports/formal_multi_run_benchmark_results_runtime_qualification_<timestamp>.json`.
7. Never overwrite the historical JSON or prior reports.
8. Keep initial-load timing separate and label single observations as such.
9. Do not claim visual/animation settlement, GPU performance, or user-perceived latency from headless Chromium.

If runtime execution is blocked, do not fabricate values. Record the exact blocker, which steps were completed, and what environment capability is required to finish.

## 7. Tests

Inspect dependency installation state and lockfiles before installing anything. Avoid broad upgrades or lockfile mutations.

Run if feasible:
- focused tests for event correlation;
- focused worker serialization/geometry tests;
- project selection and layout mode tests;
- the four Vitest files previously listed in the repair report;
- `npm run test:cli`.

Record exact commands, exit codes, actual summaries, and environment limitations. The prior report's 31/31 CLI result is historical until verified in the current checkout.

## 8. Deliverable

Create a new report:

`ARCHITECTURE_EXPLORER_POST_REPAIR_RUNTIME_QUALIFICATION_REPORT.md`

If a benchmark is actually executed, include the new raw JSON file with a unique name. Do not overwrite old evidence.

Report sections:
1. Verdict: `PASS`, `PASS WITH LIMITATIONS`, or `FAIL`.
2. Current repository provenance and working-tree status.
3. Current source/diff audit.
4. Event-correlation correctness and focused test results.
5. Worker serialization semantic/type validation.
6. Project selector and export CLI verification.
7. Cross-layout runtime matrix with source vs projected counts.
8. Console/page errors and mode-toggle results.
9. Benchmark execution status and raw statistics, if run.
10. Exact tests/commands and exit codes.
11. Supported, unsupported, and unresolved claims.
12. Explicit statement about whether code changed and confirmation that project datasets/manifests were not mutated.
13. One next action grounded in evidence.

## 9. Verdict rules

- **PASS** only if the relevant event correlation, worker contract, project selection, and required runtime/layout checks were actually verified, and any claimed benchmark data was freshly produced and independently checked.
- **PASS WITH LIMITATIONS** if code/tests are verified but some runtime matrix or browser benchmark could not be executed. State exactly what remains unverified.
- **FAIL** if event correlation remains ambiguous, worker data is semantically incomplete, benchmark samples are contaminated, tests fail, or evidence cannot support the claims.

Do not approve official performance budgets in this phase. The Constellation fixed-versus-dynamic Sun selection choice remains a separate product decision unless explicit product requirements are found in the repository.

## Final response

Provide links only to files actually created and verified. Summarize the verdict, runtime evidence, tests executed, remaining blockers, and one next action. Never report a live browser or benchmark success unless it actually occurred.
