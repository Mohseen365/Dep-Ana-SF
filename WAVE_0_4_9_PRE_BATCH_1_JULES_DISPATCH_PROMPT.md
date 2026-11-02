# JULES DISPATCH PROMPT — WAVE 0.4.9
## Pre-Batch-1 Security Remediation, Dispatch-Gate Verification, and Independent-Review Evidence Closure

**Execution mode:** Verification and narrowly scoped dispatch-tooling remediation only  
**Primary objective:** Make the Dependency Analyzer migration preparation eligible for an independent Batch 1 authorization review.  
**Batch 1 execution:** STRICTLY PROHIBITED during this wave.  
**Required final artifact:** `WAVE_0_4_9_SINGLE_FILE_PRE_BATCH_1_EVIDENCE_PACKAGE.md`

---

# 1. Mission and success criteria

You are executing Wave 0.4.9 for the Dependency Analyzer React/TypeScript → Salesforce LWC/Apex migration.

Your task is to remediate the security, correctness, test-reliability, and evidence deficiencies identified in the independent review of:

`WAVE_0_4_8_SINGLE_FILE_REMEDIATION_EVIDENCE_PACKAGE.md`

This is the final preparation wave before an independent review of Batch 1 readiness. It is **not** authorization to begin migration implementation.

Your work must establish, through source inspection and reproducible execution, whether the patch/ownership/rollback/validation/evidence tooling is safe enough to be reviewed for Batch 1 authorization.

Do not optimize for a READY verdict. Optimize for accurate evidence. If a security boundary cannot be established in the Jules environment, explicitly report that it remains unresolved and return a NOT READY verdict.

## Allowed final verdicts

Choose exactly one:

1. `READY FOR INDEPENDENT AUTHORIZATION REVIEW`
2. `NOT READY — REMEDIATION INCOMPLETE`
3. `NOT READY — EVIDENCE INSUFFICIENT`

Even if the result is READY FOR INDEPENDENT AUTHORIZATION REVIEW, this wave does not authorize Batch 1.

The final package and final response must state exactly:

`Batch 1 dispatch authorized: NO`

---

# 2. Strict execution restrictions

## 2.1 Prohibited actions

Do NOT:

- Dispatch Batch 1 or any feature-agent task.
- Start W5, W6, W7, W8, or W9 feature implementation.
- Modify production React or TypeScript application code.
- Modify production LWC JavaScript, HTML, CSS, Apex, or Salesforce metadata.
- Perform Salesforce org login, deployment, data mutation, or org operations.
- Modify any of the nine frozen baseline regression runners.
- Modify baseline runner expected counts or test identities to obtain a pass.
- Create branches or commits.
- Stage files.
- Run destructive Git commands, including reset, clean, checkout-overwrite, restore-overwrite, or force operations.
- Overwrite, delete, or normalize pre-existing dirty files.
- Claim a test passed based only on a summary, expected string, manually assigned status, or manually assigned exit code.
- Claim a security control is closed based only on a helper-level unit test when the public entry point remains vulnerable.
- Treat an exported function name, task ID, owner string, or caller-supplied flag as proof of caller identity.
- Label generated summaries as raw process logs.
- hardcode branch, HEAD, working-tree state, runner counts, test counts, or verdict in a synthesis generator.

## 2.2 Allowed actions

You MAY:

- Inspect all repository files and Git state.
- Create Wave 0.4.9 verification tooling and evidence under a dedicated Wave 0.4.9 directory.
- Modify existing dispatch/patch/rollback verification tooling when necessary to close the findings, provided the changes are isolated from production application code.
- Install missing dependencies in the Jules environment if safely possible.
- Run existing offline tests and new verification tests.
- Create temporary test repositories and fixtures outside the production repository working tree.
- Generate reports, manifests, logs, hashes, and the single consolidated Markdown package.

If a dependency is missing, install it only in a safe isolated manner. Do not change production package manifests or lockfiles merely to make the verification environment work. Record package name, exact version, installation command, environment, and result. If installation is impossible, do not silently skip the relevant test.

---

# 3. Mandatory initial baseline and preservation protocol

Before creating, staging, or modifying any Wave 0.4.9 file, capture the initial repository state.

Record:

- UTC timestamp and local timestamp with timezone.
- Working directory.
- Branch.
- HEAD commit.
- `git status --short --branch`.
- `git status --porcelain=v2 --branch`.
- `git diff --binary`.
- `git diff --cached --binary`.
- Untracked-file inventory.
- Tracked modified/deleted/renamed paths.
- Relevant file hashes.
- Node, npm, Python, Git, operating-system versions.
- Installed dependencies and available test/browser tooling.

Do not call the initial tree clean unless the actual captured status proves it. If there are staged additions, unstaged changes, or untracked files, list them exactly.

Preserve all pre-existing state. At the end, capture the same Git information and compare it to the initial state. Clearly distinguish:

1. Pre-existing dirty paths.
2. Wave 0.4.9-created or modified paths.
3. Any unexpected changes.

Do not stage any file. If the initial tree is dirty, preserve it and do not claim a clean baseline.

---

# 4. Authoritative project inventory — preserve and verify

The established planning inventory is:

- 21 registered tasks.
- 175 authoritative paths.
- 99 existing paths.
- 76 planned new paths.
- 9 traceability contracts.
- 11 Batch 1 task IDs.
- 49 Batch 1 task/path rows.

The 11 Batch 1 task IDs and path counts are:

| Task ID | Scope | Path rows |
|---|---|---:|
| W5-1 | Shell Layout Switcher | 3 |
| W6-1 | Wave 6 feature | 5 |
| W6-2 | Wave 6 feature | 5 |
| W6-3 | Wave 6 feature | 5 |
| W6-4 | Wave 6 feature | 5 |
| W7-P1 | Wave 7 prerequisite/schema work | 5 |
| W7-1 | Wave 7 feature | 5 |
| W7-2 | Wave 7 feature | 5 |
| W8-1 | Wave 8 feature | 5 |
| W8-2 | Wave 8 feature | 3 |
| W9-1 | Wave 9 feature | 3 |
| **Total** | | **49** |

These values are expected historical inventory values, not permission to hardcode them into validation. Load the authoritative registers and calculate the actual values. Report any discrepancy.

Preserve the Wave 5 dependency chain:

`W5-1 → W5-2 → W5-3 → W5-4 → W5-5 → W5-6`

W5-2 through W5-6 must remain serialized. Do not treat all registered Batch 1 tasks as simultaneously dispatchable.

Coordinator-owned files and aggregate runners must remain coordinator-controlled.

---

# 5. P0 remediation A — coordinator authorization and trust boundary

## 5.1 Finding to close

Wave 0.4.8 removed caller-controlled `trustedRole` and `batch1Enforce` arguments from the standard feature route, but publicly exported:

`apply_coordinator_patch_with_provenance()`

Any caller with module access could invoke the coordinator route. A separate exported function is not authentication.

Task ID `INT-1`, owner-name strings, or a function name must not confer coordinator privileges.

## 5.2 Required implementation

Inspect the complete call graph and all exports/imports of patch-application functions.

Establish a genuine trusted boundary. Acceptable designs must be supported by the actual runtime, not merely asserted in documentation. Examples may include a coordinator-only process boundary, an unforgeable capability held outside feature-agent input, or a trusted dispatcher that alone can invoke a private coordinator implementation.

Requirements:

- Feature-agent callers cannot invoke coordinator-only operations.
- Feature-agent callers cannot pass a role, capability, task ID, owner string, or boolean that elevates privileges.
- Coordinator-only paths are denied by default.
- Coordinator identity is established outside untrusted patch payloads.
- Task ownership is loaded from authoritative registers.
- Task eligibility and dispatch status are checked independently.
- The Batch 1 allowlist is loaded authoritatively, not passed in as a caller-controlled array.
- A caller cannot disable Batch 1 enforcement.
- The public API surface is minimal and documented.

If the Jules execution environment cannot establish a real trusted coordinator identity or process boundary, do not fake one. Remove or disable the unsafe public route and classify coordinator-only patch application as unsupported/unresolved. That limitation blocks READY FOR INDEPENDENT AUTHORIZATION REVIEW if coordinator-owned work is required by the dispatch plan.

## 5.3 Required tests

Test through the actual public entry points:

- Feature caller attempts coordinator function invocation.
- Feature caller attempts `INT-1`.
- Feature caller attempts coordinator-owned paths.
- Feature caller attempts to alter task owner/status/dependency data.
- Feature caller attempts to supply a fake allowlist.
- Feature caller attempts to disable Batch 1 enforcement.
- Feature caller attempts to invoke private implementation through exports or alternate imports.
- Authorized coordinator path works only through the genuine trusted boundary.
- Unknown caller identity fails closed.

For every rejection, assert the exact error code and prove repository/file state is unchanged.

No test may pass merely because any exception occurred.

---

# 6. P0 remediation B — rollback complete preflight and data-loss prevention

## 6.1 Finding to close

Wave 0.4.8 verifies restore payload integrity during Phase B. If target 1 is valid and target 2 is corrupt, target 1 can be restored before target 2 fails. This permits partial rollback caused by invalid restoration data.

## 6.2 Mandatory two-phase design

### Phase A — complete preflight, zero mutations

Before changing or deleting any target, validate every target in the rollback transaction.

For every path:

1. Validate normalized path and repository containment.
2. Reject symlink traversal and unsafe path types.
3. Reject duplicate or aliased targets.
4. Validate the provenance record and expected pre/post state.
5. Validate the `pre.exists` and `post.exists` state combinations.
6. Validate base64 syntax and decode every restoration payload.
7. Verify every decoded payload hash.
8. Verify every decoded payload byte length.
9. Validate original mode and post-apply mode.
10. Verify current file existence matches the expected post-state.
11. Verify current content hash matches the expected post-state when the file should exist.
12. Verify current file mode matches the expected post-state mode.
13. Verify every required directory and restoration operation is safe.
14. Validate all metadata needed by Phase B.
15. Build a complete immutable restoration plan.

All payloads for all targets must be decoded and hash-verified during Phase A. Do not defer any validation until Phase B.

If any target fails Phase A, zero targets may be modified. Prove this by comparing all target contents, existence states, modes, and hashes before and after the rejected rollback.

### Phase B — controlled restoration

Only begin after every Phase A check succeeds.

- Restore original content using binary-safe buffers.
- Restore original file modes.
- Delete patch-created files only if their current state still matches the expected post-patch state.
- Revalidate relevant state immediately before each mutation where feasible.
- Verify final content hashes, byte lengths, existence, and modes.
- Record restored, skipped, and failed paths.
- If the filesystem cannot provide transaction-level atomicity, implement safe staging/backup/recovery and accurately report partial restoration.
- Never report successful rollback if a chmod or verification operation failed.

Empty files must work. An empty base64 string is a valid encoding of an empty file and must not be mistaken for a missing payload.

Binary files must be restored byte-for-byte. Do not convert arbitrary binary content to UTF-8 strings.

## 6.3 Remove public test hooks

Remove arbitrary callbacks such as `_testHookPreMutate` and `_testHookPrePhaseB` from public production patch/rollback APIs.

Use private test-only dependency injection or an isolated harness that cannot be reached by untrusted callers. Prove the production export surface contains no test hooks.

## 6.4 Required rollback tests

All tests must invoke the actual public rollback entry point, not just internal helpers.

At minimum:

- Two targets, second target has corrupt base64.
- Two targets, second target has wrong payload hash.
- Two targets, second target has wrong byte length.
- Two targets, second target has invalid mode.
- Two targets, second target has changed post-apply content.
- Two targets, second target has changed post-apply mode.
- First target valid and second target invalid: prove zero changes to either target.
- Empty original file.
- Binary original file containing non-UTF-8 bytes.
- Original file mode restoration.
- chmod failure.
- File unexpectedly recreated after patch.
- Patch-created file unexpectedly modified before rollback.
- Duplicate provenance paths.
- Normalized alias paths.
- Symlink replacement attempt.
- Path changes between validation and mutation.
- Failure during restoration and recovery behavior.
- Tampered provenance.
- Missing provenance fields.
- Wrong repository/base identity.

For each test capture exact expected error code, actual error code, pre/post filesystem inventory, file hashes, byte lengths, modes, and actual process exit code.

The key P0 test is the multi-target corrupt-payload test. It must prove no partial mutation.

---

# 7. P1 remediation C — filesystem containment and TOCTOU

A static symlink test is not a TOCTOU test.

Implement and test the actual public patch and rollback entry points against path replacement between validation and mutation.

Required cases:

- Symlink present before validation.
- Symlink parent directory.
- Nested symlink.
- Symlink target outside repository.
- Symlink replacement after validation but before mutation.
- Parent directory replacement.
- File replaced with a directory.
- Directory replaced with a symlink.
- Concurrent path mutation where reproducible.
- Repository root replacement or mismatch where relevant.

Use race-safe filesystem techniques where available. If the runtime cannot provide a sufficient guarantee, document the residual risk and block readiness where it remains material.

Do not label a static symlink test as TOCTOU coverage.

All path checks must validate the complete normalized path and all relevant source/destination paths.

---

# 8. P1 remediation D — patch parsing, duplicates, rename/copy, and shell safety

## 8.1 Duplicate paths

The current parser silently deduplicates normalized paths with a Set. This can hide repeated patch file sections.

Required behavior:

- Preserve raw patch file-section occurrences.
- Distinguish expected multiple header representations within one file diff from duplicate file-diff sections.
- Reject duplicate file sections.
- Reject normalized aliases.
- Reject conflicting source/destination paths.
- Reject duplicate provenance targets.

Test repeated `diff --git` sections through the actual public patch API.

## 8.2 Rename and copy paths

For rename and copy patches, validate both source and destination paths against:

- Repository containment.
- Ownership.
- Batch allowlist.
- Path type.
- Duplicate/alias rules.
- Existence and state constraints.

Do not validate only the destination path.

## 8.3 Git path quoting

Correctly parse Git C-quoted path encodings, including escaped quotes, backslashes, and octal escapes. Do not use simplistic string stripping that can normalize an attacker-controlled path incorrectly.

Add tests with spaces, tabs, quotes, backslashes, non-ASCII names, and octal-escaped paths.

## 8.4 Shell injection

Replace shell-interpolated Git commands such as `execSync` with interpolated paths.

Use process execution with argument arrays, e.g. `spawnSync`, `shell:false`, and an explicit `--` separator before path arguments. Validate exit status and stderr.

Test filenames containing quotes, dollar signs, backticks, semicolons, spaces, and other shell metacharacters. These must be treated as literal path data and must never execute shell syntax.

---

# 9. P1 remediation E — strict CSV and authoritative task dependency validation

## 9.1 CSV parser

The actual production patch-gate caller must invoke strict RFC 4180 validation. It is not sufficient for a parser library to offer an optional strict mode that the caller does not enable.

Requirements:

- Enforce CRLF record separators in the authoritative register path.
- Reject bare CR and bare LF outside quoted fields.
- Validate line breaks inside quoted fields according to the chosen documented RFC-compatible behavior.
- Correctly parse quoted commas and escaped quotes.
- Reject malformed quoting.
- Reject duplicate headers.
- Reject inconsistent field counts.
- Reject malformed rows.
- Reject invalid encoding/input where relevant.
- No permissive fallback parser.
- Fail closed if the strict parser is unavailable.

Test the actual patch-gate entry point, not only the parser helper.

## 9.2 Authoritative task eligibility

The patch gate must load the authoritative task register and dependency graph.

For each patch:

- Resolve exactly one registered task.
- Resolve the task's owner.
- Resolve all owned paths.
- Resolve task status and dispatch status.
- Resolve dependencies.
- Reject missing dependencies.
- Reject ambiguous dependencies.
- Reject dependency cycles.
- Reject tasks with incomplete prerequisites.
- Reject tasks outside the authorized batch.
- Reject tasks not currently eligible for dispatch.
- Enforce topological ordering.
- Enforce W5-1 → W5-2 → W5-3 → W5-4 → W5-5 → W5-6.
- Do not accept caller-supplied task/ownership/dependency arrays as authoritative.

Test an otherwise eligible task with one incomplete dependency. It must be rejected with an exact dependency-specific error.

---

# 10. P1 remediation F — exact mutation testing and reliable test processes

## 10.1 Exact finding-set equality

The Wave 0.4.8 mutation suite checks whether expected findings are a subset of actual findings. That is insufficient.

For every mutation:

`Actual finding set === Expected finding set`

Compare normalized sets with duplicate detection. Fail if:

- An expected finding is missing.
- An unexpected finding appears.
- A finding is duplicated.
- The validator returns an unexpected exit code.
- The mutation did not change the intended semantic field.

Use a clean baseline negative control both before and after the mutation suite.

Each mutation must use a fresh isolated fixture or a verified restored fixture. Record original and mutated hashes and prove restoration hash equality.

Run at least 20 meaningful mutations × 3 independent sweeps = at least 60 executions.

Include mutations for:

- Extra well-formed task.
- Duplicate task ID.
- Duplicate path.
- Unknown owner.
- Wrong owner.
- Missing manifest path.
- Unregistered task path.
- Missing dependency.
- Incomplete dependency.
- Dependency cycle.
- Invalid task status.
- Invalid dispatch status.
- Batch allowlist violation.
- Coordinator path violation.
- Malformed CSV quoting.
- Bare LF.
- Bare CR.
- Duplicate header.
- Wrong column count.
- Invalid traceability reference.
- Missing required evidence.
- Hash mismatch.
- Byte-count mismatch.
- Duplicate artifact ID.
- Unindexed evidence file.

## 10.2 Real child-process execution

Authorization, rollback, containment, CSV, mutation, and synthesis harnesses must return a nonzero OS process exit code when any test fails.

Do not merely print a FAIL status.

Do not assign an `EXIT_CODE` field manually and call it a process exit code.

Capture actual process metadata:

- Command and arguments.
- Working directory.
- Start/end timestamps.
- Actual exit code.
- Raw stdout.
- Raw stderr.
- Signal/termination details if applicable.

Each suite must be invoked as a child process by the orchestrator. The orchestrator must independently verify its exit code and parse its machine-readable results.

Any failure, missing result, malformed result, or nonzero exit must fail the suite.

---

# 11. P1 remediation G — synthesis generator and evidence integrity

The synthesis generator must be fail-closed and deterministic.

Requirements:

1. Load the authoritative manifest from a known file path itself.
2. Do not trust a caller-supplied manifest object as the sole authority.
3. Validate required artifact IDs, paths, hashes, byte counts, and types.
4. Validate required log IDs, paths, hashes, byte counts, and classifications.
5. Validate process command, working directory, timestamps, and actual exit code for raw process logs.
6. Distinguish raw process logs, structured scenario results, generated summaries, and synthesis logs.
7. Detect missing artifacts.
8. Detect missing logs.
9. Detect corrupt artifacts.
10. Detect corrupt logs.
11. Detect duplicate IDs.
12. Detect duplicate filenames.
13. Detect unindexed files.
14. Detect unexpected files where prohibited.
15. Verify that the content embedded in the final Markdown package matches the authoritative source bytes under the documented encoding/serialization rules.
16. Verify all byte counts, including zero-byte artifacts.
17. Exclude its own output deterministically or define a stable self-reference strategy.
18. Fail nonzero on every integrity failure.
19. Provide a real CLI entry point and document the exact command.
20. Produce deterministic output for unchanged inputs.

Run two successive synthesis executions with unchanged inputs and compare output hashes. Also run negative tests for missing, corrupt, duplicate, unindexed, and wrong-byte-count artifacts/logs.

Do not claim synthesis closure without the harness source and actual test logs.

---

# 12. P1 remediation H — complete, self-contained single-file evidence package

Produce exactly one canonical final Markdown package:

`WAVE_0_4_9_SINGLE_FILE_PRE_BATCH_1_EVIDENCE_PACKAGE.md`

It must contain multiple clearly labelled sections. Each embedded artifact must include:

- Artifact ID.
- Original filename and repository path.
- Artifact type.
- SHA-256.
- Exact byte count.
- Full content, without truncation.

For raw process logs include command, arguments, cwd, timestamps, actual process exit code, stdout, and stderr.

Do not create a package that merely lists hashes for required source files. Embed the complete source contents needed to review and reproduce the verification.

## Required package sections

1. Executive summary and final verdict.
2. Scope, restrictions, and limitations.
3. Initial repository state — captured before any Wave 0.4.9 changes.
4. Final repository state and exact state comparison.
5. Environment and dependency inventory.
6. Authoritative task register — complete content.
7. Ownership manifest — complete content.
8. Batch 1 allowlist — complete content.
9. Traceability contracts — complete content.
10. Dependency graph and eligibility rules.
11. Patch-gate source — complete source.
12. Coordinator authorization implementation and call graph.
13. Strict CSV parser source.
14. Rollback implementation — complete source.
15. Filesystem containment and TOCTOU implementation.
16. Patch path parser and Git process helper source.
17. Validator source — complete source.
18. Authorization harness source.
19. Rollback harness source.
20. Containment/TOCTOU harness source.
21. CSV harness source.
22. Mutation harness source.
23. Synthesis generator source.
24. Synthesis test harness source.
25. Baseline orchestrator source (`test-baseline-runners.cjs`).
26. Evidence package builder source (`build-evidence-package.cjs`).
27. All nine frozen baseline runner source files, complete and unchanged.
28. Complete `daAppShell.js` provenance input and provenance register.
29. W7 and W8 contract documents, complete.
30. Baseline execution register and all 27 raw process logs.
31. Authorization test register and raw process logs.
32. Rollback test register and raw process logs.
33. Containment/TOCTOU test register and raw process logs.
34. CSV test register and raw process logs.
35. Mutation register, exact expected/actual finding sets, and raw process logs.
36. Synthesis test register and raw process logs.
37. Complete authoritative artifact manifest.
38. Hash and byte-count verification results.
39. Reproduction commands and expected outcomes.
40. Findings register, including every open and closed issue.
41. Prior Wave 0.4.8 finding-by-finding closure matrix.
42. Batch 1 inventory and Wave 5 serialization reconciliation.
43. Independent-review checklist and limitations.
44. Final readiness assessment.

If a required source file or raw log is unavailable, state that it is missing and classify the package as EVIDENCE INSUFFICIENT. Do not substitute a hash-only record or a summary.

The package may be large. Completeness and verifiability are more important than brevity.

---

# 13. Baseline regression execution

The nine frozen runners and expected check counts are:

| Runner | Expected checks |
|---|---:|
| `run-poc-tests.cjs` | 43 |
| `run-wave4-integration-suite.cjs` | 32 |
| `run-lane-a-schema-tests.cjs` | 9 |
| `run-lane-c-preset-manager-tests.cjs` | 10 |
| `run-lane-d-graph-filter-tests.cjs` | 15 |
| `run-lane-e-matrix-tests.cjs` | 11 |
| `run-lane-f-findings-tests.cjs` | 12 |
| `run-workstream-a-tests.cjs` | 33 |
| `run-workstream-c-tests.cjs` | 22 |
| **Total per sweep** | **187** |

Run all nine frozen runners for three independent sweeps:

- 27 actual child-process executions.
- 187 distinct identities per sweep.
- 561 cumulative outcomes.

Do not hardcode 187 or synthesize missing test identities. Extract actual identities from the real runner output. If a runner does not expose stable identities or its count differs, report the discrepancy and do not fabricate identities.

Capture each runner's source hash immediately before and after all sweeps. All nine must remain unchanged.

Do not modify the runners.

---

# 14. Component provenance

Preserve the distinction between:

- Public `@api` properties.
- Inbound event handlers.
- Outbound dispatched events.
- Proposed but unimplemented APIs.

The Wave 0.4.8 evidence identified `daAppShell.js` as having two public properties, four inbound handlers, and zero outbound dispatched events. Reinspect the actual source and verify the current hash and line ranges.

Do not describe inbound handlers as outbound events.

Embed the complete source file and provenance register. Verify any source line references against the exact embedded source.

---

# 15. Prior Wave 0.4.8 findings — mandatory closure matrix

For every item below, record:

- Original finding.
- Exact source location.
- Remediation made.
- Test ID(s).
- Actual process log reference.
- Before/after hash or state evidence.
- Result: CLOSED / OPEN / NOT TESTED.
- Residual risk.

Required items:

1. Public coordinator route callable by untrusted caller.
2. Coordinator identity not authenticated.
3. Rollback payload hash verification deferred to Phase B.
4. Multi-target rollback can partially mutate before later payload failure.
5. Public test hooks in patch/rollback APIs.
6. Mutation suite checks subset instead of exact finding equality.
7. Clean negative control not performed before and after.
8. CSV production caller uses permissive defaults.
9. Strict CSV mode does not fully validate line breaks.
10. Patch parser silently deduplicates paths.
11. Task dependency completion not checked.
12. Test harnesses may exit zero despite test failures.
13. Initial Git state contradiction and staged additions.
14. Evidence package omits nine baseline runner source files.
15. Evidence package omits baseline orchestrator and package builder.
16. Synthesis generator does not independently load and fully validate manifest.
17. Rollback post-state mode and revalidation gaps.
18. Empty-file restoration handling.
19. chmod failure suppression.
20. Git shell interpolation / command-injection risk.
21. TOCTOU scenario is static rather than a real race.
22. Rollback duplicate-provenance test does not invoke rollback.
23. Ownership tests accept any thrown exception rather than exact error.
24. Generated summaries are incorrectly classified as raw logs.
25. Component provenance source/register consistency.

Do not mark an item CLOSED solely because code was changed. Require a test that exercises the relevant public path and verifies the expected state.

---

# 16. Independent validation rules

Before finalizing:

- Independently inspect all modified source files.
- Verify the exact module paths imported by every harness.
- Verify source hashes against the embedded source.
- Run every test command from the documented working directory.
- Check actual child-process exit codes.
- Check raw stdout/stderr.
- Recompute all artifact and log hashes independently.
- Recompute all byte counts independently.
- Check all embedded source sections for truncation.
- Check duplicate artifact IDs and filenames.
- Check all required package sections exist.
- Check the package builder includes the final exact bytes.
- Check the initial and final Git state.
- Check no production application files changed.
- Check no frozen baseline runner changed.
- Check no files were staged by this wave.

A report generated by the same test harness is not independent proof of the harness's correctness. Add external checks in the orchestrator where practical.

---

# 17. Readiness decision rules

## READY FOR INDEPENDENT AUTHORIZATION REVIEW

This verdict is allowed only if:

- Coordinator trust boundary is genuine and tested, or the dispatch plan does not require coordinator-only operations and that limitation is explicitly accepted by the independent reviewer.
- All rollback restoration payloads are fully preflighted before mutation.
- Multi-target corruption tests prove zero mutation.
- No public test hooks remain.
- Critical filesystem and path checks pass through public entry points.
- Strict CSV parsing is used by the actual authoritative caller.
- Dependency and task eligibility validation is complete.
- Mutation finding sets are exact.
- Every harness fails nonzero on any test failure.
- All baseline executions are real and complete.
- The complete self-contained evidence package exists.
- Hashes, byte counts, and raw logs are verified.
- Initial/final repository state is accurately recorded.
- No critical unresolved finding remains.

This verdict means only that the package is ready for another independent review. It does not authorize Batch 1.

## NOT READY — REMEDIATION INCOMPLETE

Use when implementation or tests demonstrate that one or more required controls remain defective.

## NOT READY — EVIDENCE INSUFFICIENT

Use when source or tests may be adequate but required source files, raw logs, hashes, reproduction inputs, or execution proof are missing or contradictory.

Never choose READY to satisfy a target or because most tests passed.

---

# 18. Final response format

Your final response must be concise and report:

1. Exact final package path.
2. SHA-256.
3. Byte count.
4. Branch and HEAD.
5. Initial and final Git state summary.
6. Number of required sections and embedded artifacts.
7. Baseline runner executions and outcomes.
8. Authorization, rollback, containment, CSV, mutation, and synthesis test totals.
9. Number of Wave 0.4.8 findings closed, open, and unverified.
10. Any dependency installations.
11. Exact final verdict.
12. Exact statement:

`Batch 1 dispatch authorized: NO`

Do not provide a separate competing report. The canonical evidence is the single Markdown file.

---

# 19. Final instruction

Work methodically. Inspect first, preserve state, remediate narrowly, test through public entry points, capture real process evidence, and independently verify your own package.

Do not launch Batch 1.

Do not dispatch feature agents.

Do not claim a control is closed unless its implementation and its actual test evidence support that conclusion.

If coordinator authentication cannot be established in this environment, or if rollback cannot guarantee complete preflight before mutation, report the blocker plainly. Do not work around it with naming conventions, caller-supplied flags, synthetic test results, or documentation-only assurances.

**The only objective of Wave 0.4.9 is to establish whether Batch 1 can safely be submitted for independent authorization review.**
