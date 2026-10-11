# PHASE 1F — IMPLEMENT POSITION PERSISTENCE AND PROVENANCE CONTRACT IN ONE PASS

## Mission

Work directly in the `salesforce-architecture-refactoring-explorer` repository. Continue after the reported Phase 1D and Phase 1E implementation work.

Implement cross-layout position persistence and position provenance for finding `1B5-06`. Do not conduct another broad audit or create a readiness gate. Make a minimal, evidence-supported product-contract decision, implement it, add regression tests, run relevant checks, fix regressions, and produce one final implementation report.

The supplied Phase 1C.5 report marked `1B5-06` as pending a product decision. No definitive user-approved policy is present in the supplied context. Do not pretend a decision already exists. Choose the least disruptive, reversible default supported by current code and tests, record it explicitly as an implementation assumption, and isolate it in a small, well-named contract/helper where practical. Do not stop for approval unless the repository contains a genuine contradictory requirement that makes a safe default impossible.

## 1. Brief safety preflight

Before editing:
- Confirm repository root, current branch/HEAD, and working-tree status.
- Preserve all existing changes and untracked files, including Phase 1C, Phase 1D, and Phase 1E work.
- Inspect current position writers/readers, layout generation, drag persistence, state serialization/restoration, and existing tests.
- Do not reset, clean, discard, or overwrite unrelated changes.
- Do not switch branches, rewrite history, commit, or push.

This is a brief safety check, not a new audit phase. Continue directly into implementation.

## 2. Required contract decision

The reported issue is that one flat `nodePositions` map is shared across layout modes and layout generators may inherit `existingPositions` indiscriminately. Implement this default contract unless existing source/tests establish a clear, already-intended alternative:

1. **Scope saved positions to the layout identity that owns the coordinates.** A position saved in one layout must not silently override the same node's position in a layout with different spatial semantics.
2. **Preserve user-dragged positions within the same layout identity** across rerenders and ordinary data updates.
3. **Preserve other layouts' saved positions when switching layouts.** Returning to a layout restores that layout's saved positions for nodes that still exist.
4. **Distinguish generated/default coordinates from explicitly persisted user-dragged positions** where the existing architecture permits it.
5. **Make provenance explicit.** A generic provenance value must not imply that Orbit, Constellation, Hierarchical, and Hybrid all share the same coordinate semantics.
6. **Maintain backward compatibility.** Legacy project state using a flat `nodePositions` map must not crash or lose all coordinates. Define and test a deterministic migration/fallback. If legacy data cannot identify its originating layout, do not falsely claim that origin is known; document a conservative fallback.
7. **Use deterministic layout keys** based on actual layout semantics/options that affect coordinates. Avoid keys that change each render or include irrelevant transient UI state.
8. Do not include focal-node identity in the key unless the existing behavior shows that it materially changes the coordinate system. If it does, document and test the choice.

Avoid building a new persistence subsystem if a small extension to existing state is sufficient.

## 3. Update the complete position data flow

Inspect and update all relevant paths:
- Layout coordinate generation.
- `existingPositions` handling.
- Drag/move event persistence.
- Project-state restoration.
- Layout switching.
- Project-state serialization/deserialization.
- Cytoscape element synchronization.
- Position provenance writers and readers.

Previously reported candidate files:
- `explorer/src/lib/architecture-layout.ts`
- `explorer/src/lib/projectState.ts`
- `explorer/src/components/GraphView.tsx`

Use actual current paths. A partial fix in only one file is insufficient if other readers/writers still mix positions across layouts.

## 4. Required regression tests

Add meaningful tests for:

### A. Same-layout drag persistence
Drag a node, rerender and update ordinary graph data; verify its saved position persists for that layout.

### B. Cross-layout isolation
Save a dragged position in Layout A, switch to a layout with different spatial semantics, and verify Layout A's coordinate is not blindly applied. Save a distinct position in Layout B.

### C. Round-trip restoration
Save positions in at least two layouts, switch between them, and verify each restores its own coordinates for matching nodes.

### D. Provenance correctness
Verify user-dragged positions are distinguishable from generated/default positions, layout provenance is accurate, and unknown legacy provenance is not falsely asserted.

### E. Legacy project state
Load/normalize the old flat `nodePositions` format without throwing. Verify the documented deterministic fallback and new-format serialization/deserialization round-trip.

### F. Node lifecycle and identity
Deleted nodes must not crash layout generation. Reintroduced nodes follow the chosen restoration contract. Different node IDs must not share positions.

### G. Layout options
If options materially affect coordinates, verify their effect on layout identity. Do not key positions by transient display settings that do not affect coordinate semantics.

Prefer behavior-level tests over source-text assertions.

## 5. Constraints and non-goals

- Preserve Phase 1C accessibility changes, Phase 1D fixes, and Phase 1E click/double-click behavior.
- Do not change Phase 1E event deduplication unless a concrete regression is caused by position work.
- Do not change unrelated selection, focus, impact, or inspector behavior.
- Do not redesign layout algorithms unless required by the position contract.
- Do not silently change serialized-field meaning.
- Do not add dependencies unless absolutely necessary.
- Do not perform unrelated cleanup or formatting.

## 6. Continuous implementation sequence

Execute without approval gates:

1. Identify current state shape and position readers/writers.
2. Define the layout-position identity and provenance contract in code or a focused helper.
3. Add backward-compatible state normalization/migration.
4. Update layout generation to apply positions only for the correct layout identity.
5. Update drag persistence and graph synchronization to read/write positions under the same identity.
6. Update provenance metadata consistently.
7. Add the tests in Section 4.
8. Run focused position-authority/layout-policy tests.
9. Run relevant `GraphView`, layout, and project-state tests.
10. Run the relevant frontend suite, CLI integration tests, and configured lint/type checks where available.
11. Fix patch-introduced regressions and rerun affected tests.
12. Produce the final implementation report.

Do not stop after designing the contract or changing the data type. Complete the writer/reader integration and regression tests.

## 7. Failure and recovery rules

- Preserve pre-existing changes and user-owned files.
- If a patch introduces a regression, isolate and fix it.
- If repair is unsafe, revert only the smallest isolated change introduced during this phase.
- Never discard unrelated changes to get a clean test run.
- Do not weaken or delete valid tests to obtain a pass.
- Distinguish patch-introduced failures from pre-existing or environment-blocked failures using evidence.
- If one test cannot run, continue with remaining checks and report the limitation.
- Avoid parallel edits to files participating in the same state contract.

## 8. Final deliverable

Create or update `ARCHITECTURE_EXPLORER_PHASE_1F_IMPLEMENTATION_REPORT.md`.

Include:
- Final status: `PASS — POSITION CONTRACT IMPLEMENTED AND VALIDATED`, `PARTIAL — IMPLEMENTATION COMPLETE BUT SOME VALIDATION INCOMPLETE`, `BLOCKED — IMPLEMENTATION COULD NOT BE COMPLETED`, or `FAIL — PATCH INTRODUCED UNRESOLVED REGRESSIONS`.
- The chosen position-scope contract and why it is the least disruptive supported default.
- Legacy-state migration/fallback rule and its limitation.
- All files changed and the writer/reader paths updated.
- Layout identity and provenance representation.
- Tests added/modified and what each proves.
- Exact commands and results, including counts where available.
- Tests not run and why.
- Pre-existing failures distinguished from patch-introduced failures.
- Remaining limitations or compatibility tradeoffs.
- Confirmation that Phase 1C, 1D, and 1E behavior was preserved.
- Concise working-tree summary.

Do not claim `PASS` unless implementation and validation evidence support it.

## Final instruction

Implement Phase 1F now. Do not return another audit, plan, readiness report, or approval request. Make the contract decision explicit, implement the complete position read/write path, add regression tests, run checks, fix regressions, and deliver the final implementation report in this execution.
