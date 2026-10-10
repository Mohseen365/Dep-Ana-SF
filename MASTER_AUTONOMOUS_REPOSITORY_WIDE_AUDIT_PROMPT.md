# MASTER AUTONOMOUS PROMPT — REPOSITORY-WIDE PROJECT, DATASET, EXPORTER, MANIFEST, RUNTIME, AND GRAPH-LAYOUT AUDIT

## Mission

Perform a complete, evidence-first, adversarial repository audit of `context-analyzer-graph`, covering **every project, dataset, manifest, generated artifact, and relevant implementation under `analyze/`, `explorer/public/`, and all their nested directories**.

Do not limit the investigation to PBIM, a hardcoded list of projects, a single manifest, a recent defect, or previously generated audit reports.

Discover every project from the current repository, determine how each project flows from analysis output to published data and browser consumption, validate every applicable contract, identify cross-project interference, correct verified defects within the authorization boundaries below, and independently retest the resulting state.

**Execute all phases sequentially without asking the user for approval or confirmation.** Do not stop after producing a plan, an inventory, a preliminary report, or a list of suspected issues. Continue through every applicable phase, every discovered project, justified in-scope repairs, regression testing, and final closure reporting.

The objective is not to produce a reassuring report. The objective is to establish the strongest reproducible evidence of what is correct, what is broken, what was fixed, and what remains unverified.

---

# 1. Autonomous execution policy

## 1.1 No approval checkpoints

You are authorized to make routine engineering decisions necessary to complete this task without interrupting the user.

- Do not ask whether to proceed to the next phase.
- Do not ask which projects to include.
- Do not ask which manifests or nested directories to inspect.
- Do not stop to ask whether an objectively verified, in-scope defect should be fixed.
- Do not ask the user to select a test strategy when a safe, established strategy exists.
- Do not report a proposed action as completed.
- If a command, test, or environment capability is unavailable, use the safest alternative, record the limitation, and continue with the remaining work.

Make reasonable, conservative decisions from executable code, tests, types, schemas, fixtures, and current architecture contracts.

## 1.2 Authorization to fix defects

This task authorizes **minimal, evidence-justified repairs** within the repository's existing architecture when all of the following hold:

1. The defect is reproducible or supported by direct, compelling source-level evidence.
2. The violated contract is established by current authoritative code, tests, schemas, or accepted architecture decisions.
3. The repair is limited to the affected implementation, tests, configuration, or directly generated artifacts necessary to establish the contract.
4. The repair does not silently change product behavior beyond the defective contract.
5. The repair does not overwrite pre-existing user changes or destroy the only copy of valuable data.
6. Regression tests can be added or strengthened without weakening existing assertions.

Fix independently established, in-scope defects rather than merely documenting them. After a repair, run the relevant tests and the available broader regression suite.

Do not invent a new architecture to make the audit easier. If a defect cannot be repaired without an unresolved product decision, preserve existing behavior, document the conflict, choose the safest non-destructive outcome, and continue.

## 1.3 Hard safety boundaries

Do not:

- Install dependencies or browser binaries merely to make a test pass.
- Change package versions or lockfiles unless an existing, explicitly authorized repository workflow requires it and no safer alternative exists. In this task, treat package and lockfile changes as out of scope.
- Delete source data, project directories, historical reports, or user-created artifacts merely because they appear stale or duplicated.
- Run destructive cleanup, broad formatting, blanket regeneration, or repository-wide refactoring without direct necessity.
- Weaken tests, suppress failures, silently skip failing cases, replace real behavior with mocks as a substitute for required integration evidence, or alter assertions just to obtain a pass.
- Modify canonical architecture decisions to accommodate accidental implementation behavior.
- Claim that browser behavior was verified when only source inspection or unit tests were performed.
- Claim that every project was verified if any discovered project was omitted.
- Claim a clean working tree without checking it.
- Claim that a fix is complete before the relevant post-fix tests and evidence have been collected.

If an action would violate these boundaries, do not perform that action. Record the blocker and continue with all safe work.

---

# 2. Establish the authoritative repository context

Before changing anything, read the repository's agent instructions and current architecture context.

At minimum, inspect these files if present:

- `AGENT.md`
- `CONTEXT-RETRIEVAL-PROTOCOL.md`
- `context/CURRENT-DECISIONS.md`
- `context/CURRENT-CONTRACTS.md`
- `context/CURRENT-ARCHITECTURE.md`
- `context/CURRENT-TESTS.md`
- `context/CURRENT-IMPLEMENTATION.md`
- `context/CURRENT-DATA-AND-FIXTURES.md`

Discover any additional instruction files, nested `AGENT.md` files, package scripts, project-specific contracts, and architecture records that apply to the affected paths.

Follow the repository's stated context retrieval and evidence-authority rules. Where applicable, prioritize executable code, tests, types and schemas, data and fixtures, documentation, and historical reports in the repository's prescribed order.

Historical reports are leads, not proof of current state. Verify every material historical claim against the current checkout.

### Required provenance record

Record:

- Current working directory.
- Git repository root.
- Current branch.
- Current HEAD commit SHA.
- Working-tree status before any audit action.
- Existing staged, unstaged, and untracked files.
- Node.js and npm versions, if available.
- Operating system and relevant runtime versions.
- Available dependency installations and test runners.
- Relevant package scripts and their actual definitions.
- Repository instruction files and architecture decisions consulted.

Preserve the initial working-tree state as a baseline. Distinguish pre-existing changes from every change made during this task.

**Do not overwrite or revert pre-existing user changes.** Do not use a blanket `git checkout`, `git reset --hard`, or equivalent destructive recovery command.

If the repository contains pre-existing modifications, work around them and report any areas where their presence prevents reliable attribution.

---

# 3. Phase A — Exhaustive repository and project discovery

## A1. Discover every relevant directory

Recursively inventory:

- `analyze/`
- `explorer/public/`
- Every nested directory beneath both.
- Root and nested project manifests.
- Analysis output directories.
- Public data directories.
- Generated metadata, indexes, registries, and manifests.
- Project-specific source or configuration files referenced by either tree.
- Test fixtures and scripts that produce, publish, consume, validate, or clean these artifacts.

Also inspect the root-level implementation, scripts, configuration, and package definitions that influence those trees.

Do not rely exclusively on filename patterns. Discover JSON datasets, manifest-like files, metadata, generated artifacts, and nonstandard project layouts.

## A2. Build a complete project inventory

Identify every project from actual repository evidence, including projects that:

- Appear in one manifest but not another.
- Have analysis data but no public output.
- Have public output but no analysis source.
- Are nested under multiple levels of directories.
- Use custom output paths.
- Have incomplete or malformed metadata.
- Are referenced by code but absent from the main manifest.
- Are no longer registered but still have potentially relevant artifacts.

For each discovered project, record:

- Canonical project ID, if one exists.
- Display name.
- Source directory.
- Source dataset or analysis artifact.
- Published artifact path.
- Expected browser request URL.
- Manifest registrations.
- Artifact identity and schema.
- Node and edge counts, where applicable.
- Related exporter and consumer code.
- Applicable tests.
- Current validation status.
- Missing evidence and dependencies.

Distinguish a real project from a fixture, test project, historical output, and unrelated JSON file. Do not silently discard ambiguous entries; classify them and explain the classification.

## A3. Establish coverage completeness

Create a machine-checkable or otherwise reproducible inventory that reconciles:

1. All discovered project directories.
2. All project IDs declared in manifests.
3. All projects referenced by implementation code.
4. All discovered source datasets.
5. All published datasets.
6. All project-specific test cases.

Explain any differences between these sets.

A project is not considered audited merely because its directory was listed. Every applicable validation phase below must either pass for that project or have a specific, evidence-supported blocked or not-applicable status.

---

# 4. Phase B — Canonical project and artifact contract reconstruction

For each discovered project, reconstruct its actual data lifecycle:

`Project Source → Analysis → Exporter → Generated Artifact → Manifest Registration → Published Artifact → Browser URL → Runtime Payload → Graph Consumer`

Trace the actual implementation at each stage. Do not assume that the path structure or naming convention tells the whole story.

Determine:

- Which component owns the project ID.
- Which source file or directory is authoritative.
- Whether the dataset is generated or hand-maintained.
- Which exporter or build step creates it.
- Which manifest entries determine publication and routing.
- Whether paths are relative to the repository root, analysis root, public root, or another directory.
- Whether any compatibility or special-case behavior exists.
- Which schemas, node types, edge types, identifiers, metadata, and position contracts apply.
- Whether project selection is persisted, URL-driven, manifest-driven, or resolved through multiple sources.
- Which existing architecture decisions constrain valid fixes.

Identify contradictory contracts, duplicate authorities, hardcoded paths, stale documentation, and tests that assert an obsolete path.

Do not normalize all projects to a single path convention merely for aesthetic consistency. Existing explicit product contracts take precedence over stylistic uniformity.

---

# 5. Phase C — Manifest integrity and registration consistency

Inspect every relevant manifest discovered in Phase A, including but not limited to:

- Root `project-manifest.json`, if present.
- `analyze/project-manifest.json`, if present.
- `explorer/public/project-manifest.json`, if present.
- Nested project manifests.
- Any alternate registry, metadata index, or build-generated manifest used by runtime code.

For every manifest, validate:

1. JSON syntax and expected schema.
2. Project ID uniqueness within its intended scope.
3. Required fields and value types.
4. Project display names and identifiers.
5. Artifact path validity.
6. Path containment and traversal protection.
7. Whether registered artifacts exist.
8. Whether registered paths match the intended source and published artifact.
9. Whether any project is silently omitted.
10. Whether unregistered artifacts remain discoverable or are accidentally exposed.
11. Whether stale entries reference missing artifacts.
12. Whether one manifest is generated from another or independently maintained.
13. Whether manifest order has semantic meaning.
14. Whether runtime behavior depends on a manifest other than the one inspected.

Compare registrations and semantics across all manifests.

If exact byte equality is an established contract, test exact equality. If only semantic equivalence is required, compare normalized project entries and relevant fields. Do not label harmless formatting differences a defect unless byte equality is actually required.

## C1. Manifest lifecycle and mutation safety

Inspect every script that creates, updates, overwrites, copies, or restores a manifest.

Determine whether tests and exporters can:

- Remove project registrations.
- Publish partial manifests.
- Leave temporary entries behind.
- Overwrite a public manifest with an incomplete snapshot.
- Depend on execution order.
- Restore files only on successful execution.
- Fail to restore absent files.
- Swallow cleanup failures.
- Corrupt a manifest if interrupted.

Where an existing test mutates manifests, validate its snapshot and teardown logic. Include success, assertion-failure, and cleanup-failure behavior when safely testable.

Implement a minimal fix if a reproducible in-scope manifest defect is found. Re-run all relevant tests and re-compare the resulting manifest state with the baseline.

---

# 6. Phase D — Exhaustive artifact integrity and identity validation

For every discovered analysis artifact and public artifact, where applicable:

- Confirm existence and readability.
- Parse the complete file, not just a preview.
- Validate the schema.
- Record the current SHA-256 hash.
- Calculate node and edge counts from the actual payload.
- Validate unique identifiers.
- Check required node and edge fields.
- Detect malformed references.
- Detect duplicate IDs and duplicate edges where prohibited.
- Detect edges whose endpoints do not exist.
- Check allowed edge types against authoritative contracts.
- Check required metadata and payload identity.
- Detect truncation, empty payloads, placeholder data, and accidental substitution.
- Check for unexpected differences between source and generated output.
- Check deterministic generation expectations, where established.
- Record dataset-specific invariants and representative identity markers.

Do not infer project identity from node counts alone. Use explicit payload identity and representative identifiers grounded in the actual source dataset.

Do not assume all projects use the same node schema or edge rules. Apply the appropriate established contract to each project.

## D1. Source-to-public comparison

For each project, compare its authoritative source artifact with the corresponding published artifact.

Determine whether the artifacts should be byte-identical or semantically equivalent. Account for legitimate normalization or generated metadata only where supported by the implementation.

Report:

- Source hash.
- Public artifact hash.
- Identity and counts.
- Exact differences or semantic comparison results.
- Whether the difference is expected.
- Whether a public artifact is stale.
- Whether the exporter can reproducibly regenerate the intended artifact.

Do not regenerate every artifact indiscriminately. First establish the intended source and expected generation procedure.

## D2. Cross-project contamination

Explicitly check whether one project's output contains another project's payload.

Detect:

- Default dataset overwritten by a named project.
- Named project overwritten by default data.
- Two projects resolving to the same public path unintentionally.
- Shared mutable data structures leaking between projects.
- Stale artifacts masquerading as current outputs.
- Cross-project node and edge identity collisions where they indicate actual contamination.
- Exporter behavior that writes to an incorrect project's directory.
- Inconsistent metadata between payload and manifest.

Preserve all established project-specific identity and path contracts.

---

# 7. Phase E — Exporter, generator, and filesystem safety

Inspect every relevant exporter, analyzer, publisher, build script, and cleanup script.

For each, trace the complete input-to-output behavior, including path resolution, validation, error handling, temporary files, and cleanup.

Verify:

- Correct source project discovery.
- Correct project ID propagation.
- Correct target directory selection.
- Correct output naming.
- Directory creation and missing-directory handling.
- Path traversal protection.
- Sibling-prefix protection.
- Absolute path handling.
- Symlink handling where relevant to the threat model.
- Safe handling of missing or empty arguments.
- Prevention of unintended writes to public assets.
- Prevention of writes outside intended project roots.
- Atomicity or safe failure behavior where required.
- Preservation of unrelated project artifacts.
- Manifest update consistency.
- Correct behavior for repeated exports.
- Correct behavior for failed exports.
- Correct behavior when one project fails but other projects remain valid.

Inspect helper functions at their actual call sites. A correct helper does not prove that all callers use it correctly.

Execute isolated filesystem tests using temporary directories when safe. Test both allowed and rejected paths, including traversal and sibling-prefix cases.

If a historical report claims a test exists, confirm that the test exists and is actually executed. Do not count a manually executed helper scenario as a permanent regression test.

Fix verified exporter defects and add targeted regression tests without broad refactoring.

---

# 8. Phase F — Full project-path and browser-routing audit

Inspect the actual frontend implementation responsible for:

- Initial project selection.
- URL query parameter handling.
- Persisted project selection.
- Project manifest discovery.
- Project selector options.
- Project switching.
- Data URL resolution.
- Network requests.
- Request cancellation.
- Loading and error states.
- Payload identity validation.
- Graph data updates.
- Selection and layout preservation.
- Handling of missing or unknown projects.

Trace every project ID through the full path from user selection to data fetch and graph consumption.

## F1. Required scenario matrix

Run or statically trace each applicable scenario for every project:

**A. Default entry**

No explicit project query parameter. Confirm the established default project and its original dataset behavior.

**B. Explicit project selection**

Load a project using its actual registered ID. Confirm the exact intended artifact URL and payload identity.

**C. Valid alternate project**

Select a second project and verify its independent registration, data URL, and payload.

**D. Direct URL initialization**

Open the app with a project query parameter before the application has initialized. Confirm the requested project is not overwritten by asynchronous manifest discovery or persisted state.

**E. Invalid project ID**

Supply an unknown ID. Confirm the app enters a coherent invalid-project or explicit error state. It must not retain an unknown active ID while showing unrelated default-project metadata, and it must not silently load default data.

**F. Missing registered artifact**

Make the expected artifact unavailable in an isolated test environment. Confirm an explicit error is produced and unrelated data is not substituted.

**G. Malformed response**

Return invalid JSON or an invalid payload in a controlled test. Confirm a clear error rather than partially accepting the wrong dataset.

**H. Wrong payload identity**

Return a valid but incorrect project's dataset from a controlled test. Verify identity validation wherever the architecture contract requires it.

**I. Rapid project switching**

Switch projects while requests are pending. Confirm cancellation or stale-response protection prevents an earlier request from replacing the final selection's data.

**J. Repeated switching**

Switch among projects multiple times and back to the original project. Verify there is no cross-project cache contamination or stale selection state.

**K. Refresh and browser history**

Verify direct reloads, query-parameter changes, and browser navigation behave consistently with the established URL contract.

**L. Build and deployment paths**

Inspect how the app is served in development and production. Verify public asset paths remain valid under the actual supported base-path and routing configuration.

## F2. Special-case paths

Discover all hardcoded project-specific URLs and path exceptions.

For every exception, establish whether it is intentional, documented, tested, and required by the current contract.

Do not remove a required special case just because other projects use a different convention.

In particular, preserve these existing PBIM contracts:

- Public artifact: `explorer/public/pbim/explorer-data.json`.
- Browser request URL: `/pbim/explorer-data.json`.
- Default artifact: `explorer/public/explorer-data.json`.

Do not migrate PBIM to `/projects/pbim/explorer-data.json`.

The same rule applies to any other explicitly established project-specific path: prove the contract before changing it.

---

# 9. Phase G — Graph data and layout contract validation

Audit every relevant graph consumer and every supported layout mode.

Discover the modes from the current implementation, tests, and architecture documentation rather than assuming a fixed list.

Where applicable, inspect:

- Hierarchical layout.
- Hybrid layout.
- Orbit layout.
- Constellation layout.
- Other registered layouts.
- Web Worker and asynchronous layout paths.
- Graph visibility controls.
- Node and edge selection.
- Domain filters and lenses.
- Layout switching.
- Project switching while a layout is active.
- Empty and small datasets.
- Large datasets.
- Worker serialization and deserialization.

Verify:

1. The intended project payload reaches the graph.
2. Node and edge identity are preserved.
3. Only valid edges and endpoints reach layout algorithms.
4. Project switching does not mix graph data.
5. Layout transitions do not unexpectedly reset unrelated data.
6. Position maps and geometry obey current contracts.
7. Worker messages preserve all required metadata.
8. `Set`, `Map`, or other non-JSON structures are serialized and reconstructed correctly where required.
9. Filtering behavior is consistent across synchronous and asynchronous layout paths.
10. Empty, missing, and malformed data states are handled safely.
11. UI controls reflect the actual active layout and selection.
12. Visibility and selection behavior remains correct across supported layouts.

Do not modify canonical BFS behavior, approved edge types, DEF-01 position-key isolation, or other established architectural decisions merely to make tests pass.

For Component Orbit and Constellation, preserve the existing worker serialization contract for `projectedNodeIds` and the required filtering behavior in `runLayoutWithMetadataAsync` unless authoritative current evidence establishes a formally approved replacement.

Treat previously proposed Product Gates A–D as unapproved unless current authoritative decisions explicitly change their status. Do not silently promote proposals into implementation requirements.

Use actual runtime tests when available. Label static inspection separately.

---

# 10. Phase H — UI, selection, and interaction regression audit

Inspect relevant React components, hooks, contexts, event handlers, and test IDs.

Discover the actual control inventory from source and runtime rather than assuming a list.

For each supported project and applicable layout, validate:

- Project selector reflects the active project.
- URL and selected project remain synchronized according to the existing contract.
- Loading indicators correspond to the current request.
- Errors are attributable to the correct project.
- Layout controls change the real active layout.
- Active classes and accessibility state reflect the actual mode.
- Graph visibility controls affect the intended graph.
- Selection state does not leak across unrelated projects.
- Switching layout does not unintentionally change project identity.
- Data refresh does not silently discard required state.
- Empty and error states remain usable.
- Existing DOM test hooks remain stable unless a verified defect requires a compatible change.

A rendered button is not proof that its behavior works. A passing component unit test is not proof that the real graph runtime responds correctly.

---

# 11. Phase I — Test-suite completeness, credibility, and safety

Discover all test commands and test files relevant to the audited system, including:

- CLI tests.
- Exporter tests.
- Manifest tests.
- Data-path tests.
- Schema and fixture tests.
- Project context and data-hook tests.
- Graph component tests.
- Layout tests.
- Worker tests.
- Browser automation.
- Build and integration tests.
- Existing repository-wide regression suites.

Inspect each test before execution to determine whether it:

- Mutates manifests or datasets.
- Writes generated files.
- Requires dependencies not installed.
- Relies on execution order.
- Requires network access.
- Assumes a particular branch or working-tree state.
- Has unsafe cleanup.
- Masks failures or silently skips cases.
- Exercises the actual implementation or only a mock.
- Is included in a broader test command.
- Is genuinely deterministic.

## I1. Execute safe tests autonomously

Run all applicable tests that can execute safely with available dependencies.

Do not stop at the first failing suite. Continue with independent tests where useful and safe.

Record the exact command, exit code, meaningful output, and side-effect assessment.

For tests that cannot run, state the specific reason and the missing evidence.

Do not install dependencies or browser binaries to remove an environmental blocker.

## I2. Test isolation and repeatability

For scripts that mutate repository files:

- Inspect their mutation and cleanup logic first.
- Prefer isolated temporary directories.
- Verify pre-run and post-run hashes for protected artifacts.
- Verify missing files are restored to their original absent state.
- Verify failures propagate rather than being swallowed.
- Verify temporary output does not contaminate subsequent tests.
- Verify the same test can run twice without depending on prior test state.

Do not assume that a passing test has left the repository unchanged.

## I3. Permanent regression coverage

For each verified defect, determine whether a permanent test exists and whether the normal test command executes it.

If a required test is missing, add a focused regression test as part of the authorized repair, provided doing so is safe and does not require architectural approval.

A manually executed test scenario is useful evidence but is not a substitute for a committed regression test.

Do not inflate test counts by counting assertions, helper calls, or nested tests as separate suites without explaining the counting method.

---

# 12. Phase J — Browser and end-to-end runtime verification

Use the existing browser and end-to-end infrastructure if it is already available.

Do not install missing dependencies.

If the environment supports real browser execution, validate the actual served application for representative projects and all critical routing or identity cases. Extend coverage across every project where the existing infrastructure makes that feasible.

For each executed browser scenario, collect evidence for:

- Exact URL opened.
- Exact network request URL.
- HTTP status.
- Response content type.
- Actual payload identity.
- Actual node and edge counts.
- Console errors.
- Failed requests.
- Rendered graph state.
- Selected project and layout.
- Actual layout transitions.
- Invalid project behavior.
- Missing artifact behavior.
- Cross-project isolation.
- Default dataset preservation.

For the PBIM scenario, explicitly prove that selecting `/?project=pbim` requests `/pbim/explorer-data.json` and that the returned payload is PBIM—not merely a dataset with 528 nodes and 2,063 edges.

For the default scenario, prove that the default route uses `/explorer-data.json` and preserves the established default payload.

For a valid alternate project, prove that the appropriate independent artifact is requested.

For an unknown project and a missing artifact, prove that default data is not silently substituted.

If browser execution is unavailable, report `BLOCKED` and state the exact environmental reason. Continue all non-browser tests and source audits.

Never infer HTTP status, network behavior, DOM rendering, or actual layout execution from source code alone.

---

# 13. Phase K — Cross-project interference and regression matrix

After per-project validation, perform a repository-wide comparison to identify failures that only appear across projects.

Investigate:

- Shared output paths.
- Shared mutable caches.
- Manifest overwrite order.
- Exporter ordering dependencies.
- Duplicate IDs and ambiguous project identities.
- Inconsistent project selection.
- Source-to-public artifact mismatches.
- Missing project registrations.
- Stale public artifacts.
- Default dataset mutation.
- Invalid project fallback.
- Race conditions between project changes.
- Worker reuse across projects.
- Layout-specific filtering inconsistencies.
- Test-order dependence.
- Cleanup failures.
- Build output contamination.
- Differences between development and production routing.

Test multiple project exports in different orders where safe. Verify that exporting project B cannot change project A's artifact, manifest identity, or browser route.

Include both isolated project checks and the full multi-project integration path.

---

# 14. Phase L — Repair, retest, and regression closure

Do not stop after identifying defects.

For every verified, in-scope defect:

1. Record the failing contract and evidence.
2. Identify the smallest correct fix.
3. Confirm the fix respects current architecture decisions.
4. Implement the fix without overwriting pre-existing user changes.
5. Add or strengthen a permanent regression test.
6. Run the targeted test.
7. Run the applicable project-level regression suite.
8. Run the broader CLI or integration suite when safe.
9. Revalidate relevant manifests and artifact hashes.
10. Recheck unaffected projects.
11. Recheck the default dataset and all explicitly protected paths.
12. Review the diff for unrelated modifications.

Use a fix-and-verify loop until the issue is closed or a concrete blocker prevents further progress.

Do not perform cosmetic refactors unrelated to a verified defect. Do not remove duplicate artifacts automatically: first determine whether they are still referenced, contractually required, generated, or intentionally retained.

If an issue depends on an unresolved product decision, document the alternatives and stop changes only at that issue. Continue with other independent repairs.

If a repair introduces a regression, correct it before final reporting when safe. Do not conceal failed post-fix tests.

---

# 15. Phase M — Final independent verification

Treat the post-fix repository as a new candidate state. Do not rely solely on earlier test results.

Repeat the key checks against the final state:

- Repository status and diff.
- Project inventory completeness.
- Manifest registration consistency.
- Dataset integrity and identity.
- Source-to-public artifact comparison.
- Exporter containment and publication behavior.
- Project routing.
- Invalid project and missing artifact behavior.
- Default dataset preservation.
- Applicable graph layout and worker contracts.
- Targeted regression tests.
- Safe broader regression suites.
- Browser scenarios, if available.
- Cross-project isolation.
- Restoration of all protected files.

Verify every claimed fix from current evidence.

Distinguish:

- Confirmed fixed.
- Confirmed still defective.
- Not reproducible.
- Not applicable.
- Blocked by the environment.
- Indeterminate due to conflicting evidence.

Do not convert a blocked result into a pass.

---

# 16. Required deliverables

Create a dedicated audit directory if an appropriate one does not already exist. Do not overwrite historical reports.

Produce the following reports, using timestamped or uniquely named files when needed to avoid overwriting existing artifacts.

## Deliverable 1 — Master report

`REPOSITORY_WIDE_PROJECT_AND_ARTIFACT_AUDIT_REPORT.md`

Must include:

1. Executive verdict.
2. Repository provenance and initial/final working-tree status.
3. Authoritative context and architecture decisions.
4. Complete project and artifact inventory.
5. Inventory coverage and exclusions.
6. Manifest consistency matrix.
7. Artifact integrity and source-to-public comparison.
8. Exporter and filesystem safety findings.
9. Project routing and initialization matrix.
10. Graph layout and worker findings.
11. UI and selection findings.
12. Test execution and safety matrix.
13. Browser evidence and limitations.
14. Cross-project interference findings.
15. Every verified defect and its severity.
16. Repairs performed and evidence for each.
17. Regressions found and their resolution status.
18. Contradictions with historical reports.
19. Remaining blockers and unverified contracts.
20. Final closure decision and next steps.

## Deliverable 2 — Project-by-project matrix

`REPOSITORY_WIDE_PROJECT_VERIFICATION_MATRIX.md`

Include one row per discovered project, plus separate rows for shared infrastructure and the default dataset.

For every project, report:

- ID and display name.
- Source path.
- Published artifact path.
- Browser URL.
- Manifest status.
- Payload identity.
- Node and edge counts, where applicable.
- Source/public comparison.
- Exporter validation.
- Routing validation.
- Invalid/missing-data validation.
- Layout/runtime validation.
- Tests executed.
- Fixes performed.
- Remaining blockers.
- Evidence level.
- Final project status.

Do not omit projects that fail discovery or validation. Include a reasoned status for them.

## Deliverable 3 — Fix and regression log

`REPOSITORY_WIDE_FIX_AND_REGRESSION_LOG.md`

For each change, include:

- Original defect.
- Evidence supporting the defect.
- Files changed.
- Minimal repair description.
- Regression test added or strengthened.
- Exact test commands and results.
- Relevant before/after artifact hashes.
- Affected and unaffected projects retested.
- Remaining limitations.

If no fixes are necessary, state that explicitly and explain what evidence supports the conclusion.

## Deliverable 4 — Machine-readable inventory

Create `REPOSITORY_WIDE_PROJECT_INVENTORY.json` containing the discovered projects, artifacts, paths, manifest registrations, hashes, counts, validations, test results, and final status.

Use valid JSON. Do not include fabricated evidence or claim fields that were not actually measured. Use explicit `null`, `blocked`, or `not_applicable` values where appropriate.

Keep this inventory reproducible from the current checkout.

## Deliverable 5 — Evidence index

`REPOSITORY_WIDE_AUDIT_EVIDENCE_INDEX.md`

Index key findings to:

- Exact repository paths.
- Line numbers or relevant code ranges.
- Test names.
- Commands executed.
- Output and exit codes.
- Artifact hashes.
- Browser request/response evidence, if available.
- Report sections containing detailed analysis.

Separate source inspection, executed tests, artifact measurements, and browser evidence.

---

# 17. Evidence and severity standards

Use the following evidence classifications consistently:

- **E0 — Unsupported:** No reliable evidence.
- **E1 — Historical:** A prior report or claim, not independently verified against the current checkout.
- **E2 — Static:** Current source, test, configuration, or schema inspection.
- **E3 — Focused execution:** A targeted script, test, or controlled experiment executed against the current implementation.
- **E4 — Integration execution:** A real multi-component workflow or end-to-end test executed successfully.
- **E5 — Browser runtime:** Actual served application, network, payload, and interactive behavior verified in a browser.

These levels describe evidence, not correctness by themselves. A failing E4 test is strong evidence of a defect.

Assign severity according to actual impact:

- **Critical:** Destructive data loss, broad security boundary failure, or severe cross-project corruption.
- **High:** Wrong project payload, silent dataset substitution, major manifest corruption, or widespread graph failure.
- **Medium:** Project selection inconsistencies, important routing failures, missing error handling, or substantial functionality defects.
- **Low:** Limited test gaps, isolated edge cases, or noncritical inconsistencies.
- **Informational:** Confirmed behavior with no defect, historical discrepancy, or maintainability observation.

For every defect, state the affected projects and the evidence that supports its severity.

---

# 18. Final verdict rules

Choose a verdict that matches the evidence. Do not force a successful closure.

Use one of the following, or a similarly precise verdict justified by the findings:

- `REPOSITORY-WIDE AUDIT PASSED — ALL APPLICABLE CONTRACTS VERIFIED`
- `REPOSITORY-WIDE AUDIT PASSED — BROWSER VERIFICATION BLOCKED`
- `VERIFIED DEFECTS FIXED — REGRESSION SUITES PASSED`
- `PARTIAL CLOSURE — SOME PROJECTS OR CONTRACTS REMAIN BLOCKED`
- `REPOSITORY REGRESSION CONFIRMED — REPAIRS INCOMPLETE`
- `INDETERMINATE — REPOSITORY OR EVIDENCE INTEGRITY LIMITATION`

A complete audit requires that every discovered project is accounted for and every applicable phase has an evidence-supported outcome.

A complete runtime closure requires runtime evidence appropriate to the claim. If browser verification is blocked, say so prominently even if every available non-browser test passes.

Do not claim all projects pass if even one project has a confirmed unresolved defect.

Do not claim a clean repository if pre-existing modifications remain. Clearly separate those modifications from task-created changes.

---

# 19. Mandatory final execution summary

At the end of execution, report:

1. Total projects discovered.
2. Total source artifacts and public artifacts inspected.
3. Number of manifests audited.
4. Number of projects fully verified.
5. Number of projects with verified defects.
6. Number of defects fixed.
7. Number of defects remaining.
8. Number of blocked or indeterminate validations.
9. Exact test commands executed and their results.
10. Browser runtime status.
11. Whether the initial working-tree state was preserved.
12. Every file created or changed.
13. Paths to all five deliverables.
14. The final verdict and the most important remaining risk.

Include a concise statement of any work that could not be completed and the specific reason.

## Final operating instruction

Start immediately with repository provenance and exhaustive inventory discovery. Then execute every applicable phase in order, autonomously, across every discovered project and nested artifact.

Do not ask the user for approval while executing. Do not stop after the first report, first failure, or first project. Fix verified defects within the stated safety boundaries, run the relevant regressions, independently verify the final state, and produce the required reports even when some validations are blocked.

**Evidence outranks confidence. Actual repository state outranks historical reports. Correctness outranks a passing headline.**
