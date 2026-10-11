# Architecture Explorer — Full Issue Remediation Roadmap

**Document type:** Evidence-gated remediation plan  
**Planning baseline:** Phase 1C accessibility implementation report and the accompanying “Post-Phase 1C State of All Six Files” assessment  
**Status:** Proposed plan; not a claim that every listed item is a confirmed defect  
**Primary rule:** Verify current repository truth before authorizing changes.

---

## 1. Executive direction

The next step is not to implement every item in the post-Phase-1C assessment. The correct sequence is:

1. Establish current repository truth and reconcile historical audit evidence.
2. Classify every claim as confirmed, source-level-only, contract-dependent, contradicted, duplicate, or unverifiable.
3. Fix verified high-risk behavior in small batches.
4. Independently verify each batch before starting the next.
5. Resolve product decisions before modifying state/persistence semantics.
6. Complete accessibility and interaction-contract work.
7. Handle type-safety and maintainability candidates only after correctness work.
8. Reconcile the canonical ledger and establish a verified baseline.

The Phase 1C `PASS` applies only to findings **1B5-07** and **1B5-09**, not to the full six-file surface or the entire codebase.

## 2. Scope and evidence rules

### Primary six-file surface

- `ConnectionControls.tsx`
- `ImpactControls.tsx`
- `GraphControls.tsx`
- `FocusControls.tsx`
- `DependencyConstellationPanel.tsx`
- `GraphView.tsx`

### Adjacent file

- `GraphSlot.tsx` — treat as adjacent scope for the typing finding, not as a seventh file in the six-file surface unless the canonical audit defines it that way.

### Evidence classifications

Every finding must receive one of these statuses before implementation:

- **Confirmed defect:** Current code and a reproducible path establish behavior that violates a verified contract.
- **Source-level risk:** A concerning pattern exists, but reachability or user-visible impact is not established.
- **Contract-dependent:** Correct behavior depends on a product or API contract that must be decided.
- **Maintainability candidate:** A code-quality concern without demonstrated functional failure.
- **Contradicted:** Current evidence disproves the claim.
- **Duplicate/merged:** The claim is already represented by another canonical finding.
- **Unverifiable:** Required source, history, runtime, or test evidence is unavailable.
- **Fixed and verified:** The specific behavior is corrected and independently validated.

Never upgrade a source-level risk to a confirmed runtime defect merely because the code pattern looks suspicious. Never treat a suggested fix as proof of root cause.

---

## 3. Phase sequence and exit gates

| Phase | Purpose | Scope | Required exit gate |
|---|---|---|---|
| **1C.5** | Repository-truth and readiness gate | All canonical findings and the key claims in the post-1C assessment | Current source identified; evidence and ledger reconciled; next scope justified |
| **1D** | Verified high-risk behavior fixes | Only confirmed, independently scoped fixes from 1C.5 | Focused regression tests pass; no unrelated changes |
| **1D.5** | Adversarial verification | Actual 1D diff and tests | Independent reproduction confirms fixes; ledger updated |
| **1E** | State and lifecycle correctness | Callback freshness, effect synchronization, selection fallback, event dispatch—only where verified | Explicit contracts and regression cases established |
| **1E.5** | Lifecycle verification | Actual 1E changes | Reachable transitions tested; no stale state or regressions |
| **1F** | Layout position and provenance contract | Position writers/readers, layout transitions, provenance metadata | Product decision recorded; storage/provenance behavior tested |
| **1F.5** | Layout isolation verification | Orbit/Constellation/other affected layout paths | Cross-layout regression matrix passes |
| **1G** | Accessibility and interaction semantics | Tabs/toolbars, SVG navigation, toggle states, disclosure controls, false affordances | Keyboard and screen-reader semantics match implemented behavior |
| **1G.5** | Accessibility verification | Actual 1G diff and supported automated/manual checks | Keyboard paths and accessible names verified; limitations documented |
| **1H** | Type safety, defensive handling, and robustness | Depth parsing, loose types, null handling, cleanup, error/loading behavior | Contracts are explicit; tests cover invalid and failure states |
| **1H.5** | Robustness verification | Actual 1H diff | Regression suite and failure-path tests pass |
| **1I** | UX and maintainability cleanup | Naming, duplicated JSX, test selectors, presentation noise, only where justified | No behavior change without contract; cleanup is separately reviewable |
| **1I.5** | Final audit and ledger closure | All phases and remaining candidates | Counts reconcile; all statuses and residual risks explicit |

**Important:** Phase labels are a proposed planning structure. If Phase 1C.5 finds that a candidate is disproven or not implementation-ready, remove it from the implementation phase and record why. Do not force work into a phase just to preserve the schedule.

---

## 4. Phase 1C.5 — Required investigation before implementation

Perform a read-only audit against the current GitHub repository and current branch. Inspect previous reports and the canonical ledger where available.

### Required checks

1. **1B5-01 Rules of Hooks:** Trace conditional returns, hook sequence, parent mounting, and reachable prop/state transitions. Establish whether a hook-order violation can occur without remounting.
2. **Focus stale-origin leak:** Trace focus disable/re-enable behavior, `focusNodeId`, selected node, state owner, and intended precedence. Verify the transition and whether it violates a contract.
3. **1B5-10 Connection/Impact exit traps:** Trace `enabled`, origin, selection, result, `active`, disabled state, and handler branches. Establish whether the exit is unreachable in reachable states.
4. **1B5-04 stale double-tap callback:** Trace callback capture, refs, effect lifecycle, and parent callback replacement.
5. **1B5-05 effect dependencies:** Trace each omitted dependency to its writers and synchronization paths; test whether the rendered graph can become stale.
6. **1B5-06 position contamination/provenance:** Trace all position writers/readers, mode transitions, storage scope, and provenance values.
7. **Phase 1C verification:** Reconcile the report, current source, patch, baseline tests, and post-change tests. Distinguish current correctness from reproducibility of historical baseline evidence.
8. **Ledger reconciliation:** Map each ID and each additional candidate exactly once. Resolve the candidate assessment’s inconsistent count claim before reporting totals.

### Phase 1C.5 deliverable

`ARCHITECTURE_EXPLORER_PHASE_1C5_REPOSITORY_TRUTH_AND_PHASE_1D_READINESS_REPORT.md`

No application code, tests, dependencies, or configuration may be modified during this phase.

---

## 5. Phase 1D — Verified high-risk behavior

The following are candidates, not pre-approved defects. Implement only those confirmed by Phase 1C.5.

### A. 1B5-01 — Rules of Hooks

**Precondition:** A reachable hook-order violation is established.

**Implementation approach:** Make hook invocation unconditional and preserve hook ordering across all render paths. Keep conditional rendering/returns after the complete hook sequence where appropriate. Do not change component mounting or data behavior unnecessarily.

**Regression tests:**
- Render with the relevant state/prop absent.
- Transition from absent to present without remounting.
- Transition back to absent.
- Confirm no hook-order warning/error and expected UI behavior.

**Do not proceed** if reachability remains unproven; keep it as a source-level risk or run a narrowly targeted reproduction.

### B. Focus stale-origin leak — candidate for a separate canonical ID

Earlier audit summaries identify this as `DEF-AUD-02 / FIND-1B-07`, but the supplied ledger does not clearly include it among 1B5-01 through 1B5-13. Do not silently renumber or merge it. Reconcile identity and evidence first; use a candidate label until approved.

**Precondition:** The stale focal node is reproduced and the expected disable/re-enable behavior is agreed.

**Implementation approach:** Choose state-clearing or target-selection behavior only after tracing ownership and contract. Do not blindly adopt either suggested one-line fix.

**Regression tests:**
- Enable focus on node A.
- Disable focus.
- Select node B.
- Re-enable focus.
- Verify the intended focal node and rendered graph.
- Repeat with no selection, same selection, and stale/deleted focal node.

### C. 1B5-10 — Connection and Impact exit traps

**Precondition:** A reachable state makes the mode exit action unavailable or routes the handler incorrectly.

**Implementation approach:** Separate “mode is enabled” from “a valid analysis result is available” if the verified contract requires it. Ensure the button’s disabled state and click handler agree. Do not fix only one of them.

**Regression tests for both controls:**
- Enabled mode with valid result.
- Enabled mode with missing result.
- Enabled mode with missing origin/selection.
- Disabled mode with selection.
- Exit callback invocation and state reset.
- Entry behavior when no valid selected node exists.
- Result updates arriving after state changes.

### Phase 1D deliverable

`ARCHITECTURE_EXPLORER_PHASE_1D_VERIFIED_BEHAVIOR_FIXES_REPORT.md`

Only approved findings may be implemented. Record exact baseline commands/results, focused regression results, type/lint results when available, and a final scope diff.

---

## 6. Phase 1D.5 — Independent verification

A separate read-only pass must inspect the actual Phase 1D commit/diff and reproduce the relevant tests.

Verify:
- The original defect path is covered by a regression test.
- The test would fail against the affected baseline, if baseline evidence is available.
- The fix addresses both state conditions and event handling where applicable.
- No new state transition, stale-state issue, or unrelated change was introduced.
- The implementation report’s claims match the actual diff and test output.

Deliverable:

`ARCHITECTURE_EXPLORER_PHASE_1D5_ADVERSARIAL_VERIFICATION_REPORT.md`

If verification fails, return to Phase 1D for a narrowly scoped correction. Do not proceed as if the batch passed.

---

## 7. Phase 1E — Callback, effect, and selection lifecycle

This phase covers verified lifecycle findings and must not become a general rewrite.

### 1B5-04 — Stale double-tap callback

- Establish callback freshness requirements.
- Compare a current-value ref, effect dependency update, or another repository-consistent pattern.
- Avoid changing event semantics unless separately authorized.
- Test callback replacement after initial mount, repeated clicks/double-clicks, and unmount cleanup.

### 1B5-05 — Element-sync effect dependencies

- Identify which state/prop changes must trigger synchronization.
- Determine whether a single effect or split effects best express distinct responsibilities.
- Test each omitted value changing while the current listed dependencies remain stable.
- Check for duplicate synchronization, loops, stale elements, and cleanup correctness.

### 1B5-03 — Selection fallback

- Verify whether empty string is a valid value or represents “no selection.”
- Inspect callers and type contracts for `selectedNodeIdProp`, investigation state, and internal selection.
- Define the precedence contract before changing `||` to `??` or another expression.
- Test `undefined`, `null` if allowed, empty string if allowed, and valid IDs.

### 1B5-02 — Click/double-click dispatch

- Confirm the actual number and order of handler invocations in the UI framework and current event wiring.
- Agree whether a double-click should also produce a single-click selection.
- Add tests for single click, double click, rapid repeated clicks, and any required selection behavior.
- Do not infer product behavior solely from handler counts.

### Phase 1E deliverable

`ARCHITECTURE_EXPLORER_PHASE_1E_LIFECYCLE_AND_SELECTION_FIXES_REPORT.md`

Include contract decisions, regression matrix, and an explicit list of deferred candidates.

---

## 8. Phase 1E.5 — Lifecycle adversarial verification

Verify callback freshness, effect update paths, cleanup, selection precedence, and click semantics against actual source and tests.

Check both normal and transition paths. Do not accept a test that only exercises initial render if the reported defect concerns later state changes.

Deliverable:

`ARCHITECTURE_EXPLORER_PHASE_1E5_LIFECYCLE_VERIFICATION_REPORT.md`

---

## 9. Phase 1F — Layout position persistence and provenance

### 1B5-06 — Cross-layout position contamination

This issue contains at least two potentially related mechanisms and they must be investigated separately:

1. Position storage scope may allow one layout’s coordinates to influence another.
2. Provenance metadata may collapse distinct layout modes into a shared value such as `automatic-hierarchical`.

### Required decision before implementation

Document:
- Which layouts are supposed to share positions, if any.
- Whether switching layouts should preserve, recompute, or independently persist positions.
- What provenance values mean and who writes/reads them.
- Whether existing persisted data must be migrated or remain backward-compatible.
- How manual positions interact with automatic layouts.
- Whether the UI must distinguish static and interactive layout behavior.

Do not change storage scope or provenance labels until the intended contract is approved.

### Related GraphView candidates

- `shouldAutoLayout` bypass behavior for Orbit/Constellation.
- `enableFeatureLayout` default for Constellation.
- Focal re-layout being Orbit-only.
- Stale `featureRegions` or `orbitGuides` on mode exit.
- Duplicate/incomplete `hasAuth` derivation across effects.
- Navigator double-destroy.
- `cy.off('render')` cleanup without the original handler.
- `knownPosMap` versus `knownPositionsMap` naming.

Each item must be traced to an actual failure or contract violation before bundling into this phase.

### Regression matrix

Test transitions among every relevant layout pair, including:
- automatic to manual;
- manual to automatic;
- Orbit to Constellation;
- Constellation to another layout;
- switching with pre-existing positions;
- switching with no saved positions;
- changing architecture mode while data stays stable;
- changing data while layout stays stable;
- restoring saved positions.

Assert coordinates and provenance independently. Do not use visual similarity alone as proof.

### Phase 1F deliverable

`ARCHITECTURE_EXPLORER_PHASE_1F_LAYOUT_POSITION_AND_PROVENANCE_REPORT.md`

---

## 10. Phase 1F.5 — Layout isolation verification

Run the agreed transition matrix against the actual implementation. Verify:
- No unintended coordinate leakage.
- No unexpected reset of intentionally preserved positions.
- Provenance describes the actual source/layout behavior.
- Mode-specific overlays and layout state do not persist unexpectedly.
- Existing graph layouts remain functional.

Any unapproved product semantics remain explicitly unresolved.

Deliverable:

`ARCHITECTURE_EXPLORER_PHASE_1F5_LAYOUT_ISOLATION_VERIFICATION_REPORT.md`

---

## 11. Phase 1G — Accessibility and interaction semantics

This phase includes canonical 1B5-08 and the accessibility/interaction candidates in the post-Phase-1C assessment. The current implementation must be inspected before changes.

### A. 1B5-08 — Tablist keyboard navigation

- Verify whether the component uses `role="tablist"`/`role="tab"` or another semantic pattern.
- Choose and document the appropriate keyboard model.
- Implement expected arrow-key, Home/End where applicable, focus management, and activation semantics.
- If the UI is not actually a tab interface, reconsider the role rather than adding keyboard behavior to an incorrect semantic structure.
- Test focus order, keyboard activation, selected state, and accessible names.

### B. GraphControls toolbar keyboard behavior

- Confirm whether `role="toolbar"` is appropriate.
- If retained, implement the expected keyboard interaction pattern, including a clear tab stop and arrow-key movement as required by the chosen pattern.
- Otherwise use semantics matching the actual UI.
- Test keyboard reachability and activation of every control.

### C. GraphControls architecture mode cycle

- Verify whether the control represents a four-way cycle or a binary toggle.
- Avoid using `aria-pressed` as though a four-state cycle were a simple two-state toggle.
- Expose the current state and action clearly, and communicate that activation cycles through modes.
- Reconcile the `title` and accessible-name behavior.
- Preserve visible glyphs while ensuring accessible names describe the action/state.

### D. ImpactControls breakdown disclosure

- Determine whether the header button expands/collapses content.
- Use a native button with correct expanded state and an associated controlled region where appropriate.
- Test keyboard activation and whether the state announced by assistive technology matches the visible panel.

### E. Shadow tree and SVG interaction

- Inspect the `GraphView` shadow `<ul role="tree">` and its relationship to the visible graph.
- Add tree semantics only if the actual interaction model supports a tree.
- If retained, provide appropriate hierarchy/expanded state and keyboard navigation.
- Ensure SVG nodes have keyboard-accessible interaction if they are intended to be selectable.
- Avoid adding ARIA roles without implementing the corresponding behavior.

### F. Other interaction/accessibility candidates

- `Impact Direction` static semantics must remain correct.
- Inspect the Impact navigation banner for false interactive affordances.
- Verify whether impacted-test and direct-dependent pills are informational or actionable. Do not turn informational labels into fake controls.
- Verify whether non-interactive spans visually imply interaction.
- Review `aria-pressed` usage on toggles and non-binary controls.
- Check focus hints and orphaned `aria-describedby` IDs in FocusControls.
- Ensure accessible names remain meaningful after decorative glyphs are hidden.

### Phase 1G deliverable

`ARCHITECTURE_EXPLORER_PHASE_1G_ACCESSIBILITY_AND_INTERACTION_REPORT.md`

Include a control-by-control keyboard and semantic test matrix.

---

## 12. Phase 1G.5 — Accessibility verification

Verify:
- Every interactive control is reachable and operable using the documented keyboard model.
- Focus is visible and follows expected movement.
- Accessible names, descriptions, selected/expanded/pressed states are correct.
- Decorative glyphs are hidden without removing meaningful text.
- The UI does not claim tab, toolbar, tree, button, or toggle semantics that it does not implement.

Use automated accessibility checks where the project supports them, but do not treat an automated scan as a substitute for interaction tests.

Deliverable:

`ARCHITECTURE_EXPLORER_PHASE_1G5_ACCESSIBILITY_VERIFICATION_REPORT.md`

---

## 13. Phase 1H — Types, defensive handling, and runtime resilience

This phase handles verified type-safety and robustness candidates after the behavior contracts are clear.

### A. Depth parsing and validation

Affected candidates:
- `parseInt(value, 10) as ConnectionDepth`
- `parseInt(value, 10) as ImpactDepth`
- `parseInt(value, 10) as FocusDepth`

Before changing them:
- Inspect the allowed depth values and their source types.
- Validate malformed, empty, negative, out-of-range, and unexpected values.
- Reuse a shared parser only if it preserves each component’s actual contract.
- Avoid a type assertion that hides invalid runtime values.

Tests must cover every allowed value and representative invalid inputs.

### B. 1B5-11 — GraphSlot loose `any` types

- Inspect the actual callback/value signatures and call sites.
- Replace `any` with accurate types inferred from the real contract.
- Avoid introducing broad casts or invented interfaces merely to silence TypeScript.
- Add compile-time coverage or focused tests where runtime behavior is involved.

### C. Null/undefined defensive handling

Candidates include:
- `featureName.toLowerCase()` when feature fields may be absent.
- `id.split(':')[1] || id` shortening behavior.
- Optional `onNodePositionsChange` callback.
- Assumptions that the origin always appears in `affectedNodeIds`.
- Stale or missing analysis results.
- Risk badges defaulting to `LOW`.

For each, establish whether invalid/missing values are permitted by the contract and choose explicit behavior. Do not mask invalid state with a plausible-looking default.

### D. Cytoscape and event cleanup

- Verify initialization and destruction lifecycle.
- Confirm whether navigator cleanup and main cleanup can destroy the same instance twice.
- Confirm whether `cy.off('render')` removes the intended listener; preserve the original callback reference if required.
- Test repeated mount/unmount and mode changes.
- Do not restructure lifecycle code without a reproduced or well-established cleanup defect.

### E. Error boundaries and loading states

These are candidates, not automatic defects.
- Determine whether graph initialization/layout computation is expected to fail and how the application should recover.
- Determine whether operations are synchronous or asynchronous.
- Add an error boundary or loading state only if the actual execution contract and user experience require it.
- Test failure, retry/recovery, and normal rendering where applicable.

### Phase 1H deliverable

`ARCHITECTURE_EXPLORER_PHASE_1H_TYPE_SAFETY_AND_RESILIENCE_REPORT.md`

---

## 14. Phase 1H.5 — Type and resilience verification

- Run repository type checks and relevant lint rules.
- Test malformed and absent values.
- Test mount/unmount and cleanup paths.
- Verify failure states do not silently appear healthy.
- Confirm normal graph behavior and all supported depth values still work.
- Record unavailable validation explicitly.

Deliverable:

`ARCHITECTURE_EXPLORER_PHASE_1H5_TYPE_AND_RESILIENCE_VERIFICATION_REPORT.md`

---

## 15. Phase 1I — UX and maintainability cleanup

Do this only after correctness, persistence, and accessibility contracts are stable. Keep each cleanup independently reviewable.

### Candidates

- **1B5-12 naming collision:** Establish whether the collision causes actual ambiguity or is only a maintenance concern; rename narrowly if approved.
- **Duplicated `ViewModeSwitcher` JSX:** Verify the duplicated branches and preserve behavioral differences while reducing duplication.
- **GraphControls `data-testid` coverage:** Add selectors only where tests need stable targeting; do not treat missing test IDs alone as a production defect.
- **`hasSelectedNode` prop drilling:** Consider composition/context only if the current architecture warrants it; avoid a broad redesign for one prop.
- **Inline styles:** Migrate only when there is a concrete styling, consistency, or maintainability objective; avoid mixing a broad CSS rewrite with functional fixes.
- **Magic values and display noise:** Review `affectedNodeIds.size - 1`, zero-value cards, and ID shortening only after verifying their semantics.
- **Non-interactive pills:** Keep them informational if there is no supported action; add interaction only when product behavior explicitly requires it.
- **Fixed 900×900 viewport / missing ResizeObserver:** Verify whether this causes actual clipping/responsiveness problems in supported containers before changing layout sizing.
- **Position preservation on option changes:** Coordinate with Phase 1F; do not create a second persistence policy.
- **Constellation dependencies list:** Verify whether the list should show all edges or only edges incident to the active inspected node.
- **SVG marker ID collisions:** Reproduce with multiple instances before changing ID strategy.
- **Focal node filtering/opacity:** Define whether filtering may visually de-emphasize or must preserve the focal node.
- **Inspector hover precedence:** Define whether the drawer follows hover or canonical selection; do not treat either as inherently correct.

### Phase 1I deliverable

`ARCHITECTURE_EXPLORER_PHASE_1I_UX_AND_MAINTAINABILITY_REPORT.md`

Each change must identify whether it changes behavior, presentation, tests, or only internal structure.

---

## 16. Phase 1I.5 — Final verification and ledger closure

Conduct a read-only adversarial audit of the cumulative changes.

Required checks:
- Run the appropriate focused and broader regression suites.
- Run type checks and lint checks where configured.
- Verify supported graph layouts and cross-layout transitions.
- Verify focus, selection, connection, impact, and keyboard interaction behavior.
- Inspect the cumulative diff for unauthorized changes.
- Compare each completed finding to its acceptance criteria.
- Reconcile duplicates and candidate findings.
- Record unverified items and product decisions still open.
- Ensure every count is mathematically consistent.

Deliverable:

`ARCHITECTURE_EXPLORER_FINAL_REMEDIATION_AND_LEDGER_CLOSURE_REPORT.md`

Do not label the entire codebase “clean” while confirmed or material unverified findings remain open.

---

## 17. Full issue inventory and intended phase

This inventory preserves the canonical IDs while keeping additional candidates separate.

| Finding / candidate | Current planning treatment | Planned phase |
|---|---|---|
| **1B5-01 Rules of Hooks** | Verify reachability first; highest risk if confirmed | 1C.5 → 1D → 1D.5 |
| **1B5-02 Double-click repeated dispatch** | Verify actual event sequence and intended semantics | 1C.5 → 1E → 1E.5 |
| **1B5-03 `||` selection fallback** | Resolve empty/null/undefined contract | 1C.5 → 1E → 1E.5 |
| **1B5-04 Stale double-tap callback** | Verify callback lifecycle and freshness | 1C.5 → 1E → 1E.5 |
| **1B5-05 Element-sync dependencies** | Trace omitted dependency update paths | 1C.5 → 1E → 1E.5 |
| **1B5-06 Position contamination/provenance** | Requires writer/reader trace and product decision | 1C.5 → 1F → 1F.5 |
| **1B5-07 Label association** | Reported fixed by Phase 1C; independently verify | 1C.5 / 1D.5 reconciliation |
| **1B5-08 Tablist keyboard navigation** | Verify semantic role and keyboard contract | 1G → 1G.5 |
| **1B5-09 Decorative emoji accessibility** | Reported fixed by Phase 1C; independently verify | 1C.5 / 1D.5 reconciliation |
| **1B5-10 Connection/Impact exit traps** | Trace state, disabled condition, and handler together | 1C.5 → 1D → 1D.5 |
| **1B5-11 GraphSlot loose `any` types** | Type-contract cleanup after behavior is stable | 1H → 1H.5 |
| **1B5-12 Constellation naming collision** | Verify impact; likely maintenance-only | 1I |
| **1B5-13 Analysis-mode mutual exclusivity** | Product/architecture decision; no implementation until decided | Decision gate before relevant behavior changes |
| **Focus stale-origin leak (DEF-AUD-02 / FIND-1B-07)** | Candidate separate from canonical IDs until ledger identity/evidence reconciled | 1C.5 → 1D if confirmed |
| `parseInt` depth casts | Verify range and input contract | 1H |
| Provenance collapse | Related to 1B5-06; reconcile rather than duplicate | 1F |
| Error boundary absence | Contract-dependent resilience candidate | 1H |
| Loading state absence | Determine sync/async contract first | 1H if justified |
| `activeInspectId` hover precedence | Product interaction decision | 1I or earlier if proven user-blocking |
| Optional `onNodePositionsChange` | Verify optionality and caller contract | 1H |
| Toolbar keyboard navigation | Accessibility contract | 1G |
| Duplicated `ViewModeSwitcher` JSX | Maintainability candidate | 1I |
| Focus depth/direction not consumed | Trace whether controls promise behavior that graph ignores | 1C.5 → 1G/1H or dedicated contract fix |
| `shouldAutoLayout` bypass | Verify per-layout behavior | 1F |
| `enableFeatureLayout` default | Verify supported layout contract | 1F |
| Focal re-layout only in Orbit | Verify expected layout behavior | 1F |
| Mode-specific overlays persist briefly | Reproduce transition and visual impact | 1F |
| Duplicate/incomplete `hasAuth` derivation | Trace effects and actual behavior | 1E or 1F |
| Navigator double-destroy | Verify instance lifecycle | 1H |
| `cy.off('render')` without handler | Verify listener cleanup path | 1H |
| `knownPosMap` / `knownPositionsMap` naming | Maintenance-only unless evidence shows behavior error | 1I |
| Shadow `<ul role="tree">` incomplete | Verify tree semantics and interaction model | 1G |
| Breakdown disclosure missing expanded state | Verify disclosure behavior | 1G |
| Nav banner false affordance | Verify whether it implies an unavailable action | 1G/1I |
| Risk badge defaults to LOW | Verify missing-risk contract; avoid misleading safe default | 1H |
| Zero-value cards | UX/product choice; avoid removing meaningful zeros blindly | 1I |
| Non-interactive pills | Decide whether informational or actionable | 1G/1I |
| `affectedNodeIds.size - 1` assumption | Verify origin membership invariant | 1H |
| Fragile node-ID shortening | Verify ID format and collision risk | 1H/1I |
| SVG marker ID collision | Reproduce across multiple component instances | 1I |
| Focal node filtered to low opacity | Verify intended focal-node visibility | 1I |
| Fixed 900×900 viewport | Reproduce responsive layout issue | 1I |
| Feature name null crash | Verify input type and malformed-data behavior | 1H |
| Constellation list shows all edges | Verify intended inspector semantics | 1I |
| Constellation positions not preserved | Coordinate with approved persistence contract | 1F/1I |
| No graph error boundary | Contract-dependent | 1H |
| GraphControls title/aria mismatch | Verify what state/action is announced | 1G |
| Four-way cycle uses binary `aria-pressed` | Verify state semantics | 1G |
| Missing `data-testid`s | Test maintainability, not automatically a defect | 1I |
| Single-leaf `hasSelectedNode` prop drilling | Architecture candidate, not automatic defect | 1I |
| Inline styles | Maintenance candidate | 1I |

---

## 18. Change-control protocol for every implementation batch

Every implementation prompt must require the agent to:

1. Read the current repository and working-tree status.
2. Name the exact approved findings and files.
3. Record baseline test commands and outputs before changing code, when safely possible.
4. Implement the smallest change consistent with the verified contract.
5. Add tests that fail for the original defect and pass for the fix, where reproducible.
6. Run focused tests, related component tests, type checks, and lint checks where available.
7. Inspect the final diff against the starting state.
8. Report every modified/added/deleted file.
9. Distinguish `PASS`, `FAIL`, `NOT RUN`, and `BLOCKED`.
10. Create a report that states what is fixed, what remains open, and what was not verified.
11. Avoid commits/pushes unless explicitly authorized or required by the workflow.
12. Never claim full verification from source inspection alone.

If tests cannot run or baseline failures cannot be established, report partial validation. Do not fabricate evidence.

---

## 19. Final completion criteria

The remediation program is complete only when:

- Each canonical finding has a reconciled identity and status.
- Every confirmed defect is fixed or explicitly accepted as an open risk.
- Contract-dependent behavior has a documented decision.
- Each implemented fix has an appropriate regression test or a documented reason one cannot be supplied.
- The supported graph layouts and their transitions have been checked.
- Accessibility semantics match real interaction behavior.
- Type and resilience work preserves the established component contracts.
- Independent audits validate the implementation reports.
- The final ledger totals reconcile.
- Remaining candidates and limitations are visible rather than silently marked closed.

**Final principle:** The objective is not to make the ledger say “fixed.” The objective is to establish what is true, fix verified defects without collateral changes, and retain enough evidence that another reviewer can independently reach the same conclusion.
