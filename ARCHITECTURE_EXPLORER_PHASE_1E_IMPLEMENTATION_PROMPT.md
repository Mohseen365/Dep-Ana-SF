# PHASE 1E — IMPLEMENT CLICK / DOUBLE-CLICK INTERACTION CONTRACT AND CLOSE REMAINING INTERACTION-LIFECYCLE WORK

## Execution directive

Work directly in the `salesforce-architecture-refactoring-explorer` repository.

Phase 1D has been reported as implemented and validated. Continue with Phase 1E. Do not repeat Phase 1D, conduct another broad audit, or create a readiness gate. Implement the interaction behavior, add regression tests, run relevant checks, fix regressions, and produce one implementation report.

Use the current repository as the source of truth. Preserve existing user changes and all Phase 1C/1D work.

## 1. Brief safety preflight

Before editing:
- Confirm repository root, current branch/HEAD, and working-tree status.
- Preserve all existing changes and untracked files.
- Inspect current click/double-click handlers, event registrations, tests, and callers.
- Do not reset, clean, discard, or overwrite unrelated changes.
- Do not switch branches, rewrite history, commit, or push.

This is a brief safety check, not an audit phase. Proceed directly to implementation.

## 2. Scope — 1B5-02: Click / double-click dispatch behavior

**Primary target:** `explorer/src/components/GraphView.tsx`

Implement deterministic behavior based on the existing public component contract and real call sites.

- Trace the current node click and double-click event paths and determine which callbacks are expected for each interaction.
- Ensure a single click invokes its intended action exactly as intended.
- Ensure a double-click invokes its intended action exactly as intended.
- Prevent accidental duplicate dispatch from the browser/Cytoscape event sequence without arbitrarily suppressing legitimate single-click behavior.
- Preserve node/edge selection, event filtering, modifier-key behavior, and existing callback contracts unless the source demonstrates a necessary correction.
- Keep listener registration and cleanup lifecycle-safe.
- Avoid arbitrary timeouts or timing heuristics unless required by the existing contract and supported by tests.
- Preserve the Phase 1D latest-callback ref behavior.

Do not assume a double-click must always suppress the preceding single-click. Determine the intended contract from existing callers, tests, and UI behavior. If evidence is genuinely ambiguous, choose the least disruptive behavior consistent with existing callers and document the assumption in the implementation report rather than stopping for approval.

### Required regression tests

Add or update tests proving:
1. A single click invokes the expected callback(s) exactly once.
2. A double-click invokes the expected callback(s) according to the established contract.
3. A double-click does not cause duplicate invocation from duplicate listener registration.
4. Repeated renders do not multiply click or double-click callback invocations.
5. Updated callback props are respected after rerender.
6. Cleanup/unmount does not leave listeners that fire afterward.
7. Node and edge interactions remain distinguishable where required by the current contract.

Use the existing test framework and Cytoscape harness. Prefer interaction-level tests over source-text assertions.

## 3. Adjacent callback-lifecycle risk

Phase 1D reports that `onNodeDoubleTapRef` is refreshed through an effect. While implementing Phase 1E, verify with focused tests that the listener does not use an obsolete callback in supported render/interaction sequences.

If a directly related callback freshness bug is demonstrated, fix it in this phase and add a regression test. Do not reopen unrelated Phase 1D work or refactor the whole event system.

## 4. Explicit exclusions

Do not implement or redesign:
- `1B5-06`: cross-layout position contamination, drag-persistence scope, or position authority. It remains blocked pending a product contract.
- `1B5-05`: broad effect synchronization changes, except for a directly demonstrated regression caused by this phase.
- Unrelated focus, Connection, Impact, accessibility, naming, or type-safety findings.
- Broad graph architecture changes, dependency upgrades, unrelated formatting, or new interaction features.
- A general audit or another readiness report.

Keep any directly necessary adjacent change minimal and explain it in the final report.

## 5. Implementation and validation sequence

Execute continuously:
1. Inspect current interaction handlers and callers.
2. Implement the smallest contract-correct event-handling change.
3. Add focused tests for single click, double-click, callback freshness, listener uniqueness, and cleanup.
4. Run focused `GraphView` interaction tests.
5. Run existing `GraphView` tests, including Phase 1D callback freshness and position-authority/layout-policy tests.
6. Run the relevant component/frontend test suite.
7. Run CLI integration tests and configured lint/type checks if available.
8. Fix patch-introduced regressions and rerun affected tests.
9. Write the final implementation report.

Use actual repository scripts; do not invent commands or claim checks ran when they did not.

### Failure handling
- Fix failures introduced by the patch.
- Do not weaken, delete, or skip valid tests to obtain a passing result.
- Distinguish pre-existing failures from patch-introduced failures using available evidence.
- If an environment-dependent test cannot run, continue with remaining work and state the limitation precisely.
- Preserve user changes. If rollback is necessary, revert only the smallest isolated change introduced during this phase.
- Do not parallelize conflicting edits to `GraphView.tsx`.

## 6. Final deliverable

Create or update:

`ARCHITECTURE_EXPLORER_PHASE_1E_IMPLEMENTATION_REPORT.md`

Include:
- Final status:
  - `PASS — INTERACTION CONTRACT IMPLEMENTED AND VALIDATED`
  - `PARTIAL — IMPLEMENTATION COMPLETE BUT SOME VALIDATION INCOMPLETE`
  - `BLOCKED — IMPLEMENTATION COULD NOT BE COMPLETED`
  - `FAIL — PATCH INTRODUCED UNRESOLVED REGRESSIONS`
- The existing click/double-click contract and implemented behavior.
- Files changed and concrete implementation details.
- Regression tests added/updated and what each proves.
- Exact commands and results, including test counts where available.
- Tests not run and why.
- Pre-existing failures distinguished from patch-introduced failures.
- Any unresolved limitations.
- Confirmation that `1B5-06` was not intentionally changed.
- A concise working-tree change summary.

Do not claim `PASS` unless the implementation and validation evidence support it.

## Final instruction

Implement Phase 1E now. Do not return another plan, audit, readiness gate, or approval request. Make the changes, test them, fix regressions, and produce the final implementation report in this same execution.
