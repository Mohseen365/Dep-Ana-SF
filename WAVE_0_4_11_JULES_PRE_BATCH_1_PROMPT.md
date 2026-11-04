# WAVE 0.4.11 — FINAL COORDINATOR AUTHORIZATION AND EVIDENCE CLOSURE
## Jules execution prompt — focused remediation, no Batch 1 dispatch

You are operating in the Dependency Analyzer repository. Your assignment is a narrowly scoped security, rollback, validator, and evidence-closure remediation following the independent audit of the consolidated Wave 0.4.10 package.

**This is not authorization to dispatch Batch 1 or begin feature implementation.** Your task is to remediate the identified Wave 0.4.10 findings, prove the fixes with adversarial tests, and produce one self-contained consolidated Markdown evidence package for a fresh independent review.

---

# 1. Governing instructions and hard restrictions

## 1.1 Read the actual Wave 0.4.10 package first

Locate and inspect the complete file:

`WAVE_0_4_10_SINGLE_FILE_PRE_BATCH_1_EVIDENCE_PACKAGE.md`

Treat it as a consolidated package containing multiple embedded source files, reports, logs, registers, and evidence sections. Do not assume that each section is an independent attachment. Extract and inspect the actual embedded source content.

Reproduce the Wave 0.4.10 findings below against the current repository before changing anything. Identify the exact source paths, functions, call paths, and tests involved. Do not rely solely on the previous audit narrative.

If the file is unavailable in your workspace, stop and report that exact blocker. Do not fabricate its contents or claim that its findings were reproduced.

## 1.2 Prohibited actions

- Do NOT dispatch Batch 1.
- Do NOT launch W5-1 or any other feature task.
- Do NOT start Waves 5–9 feature implementation.
- Do NOT create feature branches, commits, tags, or pull requests.
- Do NOT stage files.
- Do NOT modify frozen baseline runners.
- Do NOT modify application functionality unrelated to the Wave 0.4.10 remediation.
- Do NOT perform Salesforce org operations, authentication, deployment, or production data operations.
- Do NOT install packages or change dependency manifests unless a specific remediation test is impossible without a dependency. If a dependency is genuinely required, first document the exact missing dependency, why existing tools cannot test the behavior, and the smallest safe installation plan. Do not silently install.
- Do NOT use destructive Git commands, broad checkout/reset/clean commands, or overwrite the user's pre-existing changes.
- Do NOT describe a test as executed if it was only specified, inspected, simulated, or manually reasoned about.
- Do NOT claim a clean initial working tree unless the actual captured Git output proves it.

## 1.3 Preserve the repository's initial state

Before creating, editing, generating, or deleting any file, capture and preserve:

1. `pwd`
2. `git rev-parse --show-toplevel`
3. `git branch --show-current`
4. `git rev-parse HEAD`
5. `git status --porcelain=v2 --branch`
6. `git diff --stat`
7. `git diff --cached --stat`
8. `git ls-files --others --exclude-standard`
9. Node, npm, Python, Git versions.
10. Hashes and byte counts of all frozen baseline runners.

Save the unmodified command output in the evidence package. Distinguish pre-existing user changes from files created by this remediation. Never stage or commit anything. At the end, capture the same Git state commands and report the exact delta.

If the initial tree is dirty, preserve it. Do not “clean it up” to make the report look clean.

---

# 2. Mandatory Wave 0.4.10 findings to remediate

The following findings are mandatory closure targets. A finding is closed only when the implementation and an adversarial test demonstrate the required behavior through the real public entry point. A helper-only test is not sufficient.

## P0-01 — Remove the publicly callable coordinator authorization bypass

### Observed problem

Wave 0.4.10 exposed:

`apply_coordinator_patch_with_provenance({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha })`

The function internally supplied `isCoordinatorCall: true`. A caller could invoke the exported function and claim the coordinator task `INT-1`. No trusted caller identity, cryptographic capability, or authenticated authorization boundary established that the caller was genuinely the coordinator.

The prior AUTH-06 test was inadequate because dummy base SHAs could cause `BASE_SHA_MISMATCH` before the authorization check. API-06 also explicitly allowed the coordinator function in the public exports.

### Required remediation

1. Remove the publicly callable coordinator privilege-escalation route.
2. Do not replace it with another exported function that accepts caller-controlled `isCoordinator`, `trustedRole`, `role`, `taskId`, `coordinator`, `authorized`, or equivalent booleans/strings as proof of privilege.
3. Do not treat a task ID, ownership register row, environment variable, caller-supplied provenance object, or module parameter as proof of trusted coordinator identity.
4. Coordinator-exclusive operations must fail closed unless the repository already has a genuine, non-forgeable trusted authorization mechanism. If no such mechanism exists, do not invent a weak substitute. Keep coordinator-exclusive mutation unavailable and report the limitation.
5. Ensure public patch APIs cannot mutate coordinator-exclusive paths, including through aliases, alternate exported functions, direct internal-module exposure, or crafted task metadata.
6. Ensure rollback cannot be used to restore caller-forged coordinator provenance or overwrite coordinator-exclusive files.
7. Review module exports, re-exports, package entry points, test-only exports, and indirect call paths. A function hidden from `Object.keys()` but reachable through another public route is not an acceptable fix.
8. Keep the legitimate non-coordinator patch workflow functional within its authoritative task/path scope.

### Required adversarial tests

Tests must invoke the actual public API with valid, matching base SHAs so the test reaches the authorization boundary. Include:

- Direct call to the former coordinator API name, if still resolvable.
- Calls through every public export/re-export that could reach coordinator mutation.
- Forged `INT-1` task metadata.
- Forged provenance claiming coordinator origin.
- Coordinator-exclusive path supplied to ordinary patch APIs.
- Alias/path normalization attempts.
- A test proving ordinary authorized non-coordinator work still succeeds.
- A test proving coordinator-exclusive content and hash remain unchanged after every rejected attempt.

Assertions must verify the exact error/result and unchanged file bytes/hash. Do not accept an earlier unrelated error such as `BASE_SHA_MISMATCH` as proof of authorization denial.

If no genuine trusted coordinator capability exists, tests must demonstrate fail-closed behavior through all reachable public entry points.

## P0-02 — Make rollback a genuinely atomic, race-aware operation

### Observed problem

Wave 0.4.10 improved Phase A preflight but Phase B did not revalidate all state. In particular, a target whose post-state was recorded as nonexistent could be created after Phase A and then overwritten/deleted without detection. Phase B did not consistently recheck modes, and missing `pre.mode` could pass despite closure claims.

### Required remediation

Design rollback as a fail-closed transaction with a complete all-target preflight and a second per-target validation immediately before mutation.

For every target, validate and record:

- Canonical repository-relative path.
- Path containment and every parent directory component.
- Symlink status for the target and all parent components.
- Expected post-state existence/nonexistence.
- Expected post-state content hash and byte length when applicable.
- Expected post-state file mode when applicable.
- Pre-state existence/nonexistence.
- Pre-state content hash and byte length.
- Pre-state mode, including explicit handling of valid zero-byte files.
- Payload encoding, base64 validity, decoded byte length, and SHA-256.
- Provenance authenticity/authorization and task ownership.
- Duplicate target/path aliases and conflicting entries.

**Phase A must not mutate any target.** If any target fails preflight, no target may be changed.

**Phase B requirements:**

1. Immediately before each target mutation, re-resolve and revalidate the target and every parent component.
2. Recheck expected existence/nonexistence. If Phase A expected the target not to exist, but it now exists, abort before touching it.
3. Recheck content hash, byte length, and mode against the recorded post-state.
4. Recheck path containment and symlink status.
5. Reject missing or malformed required mode metadata; do not silently default.
6. Do not swallow `chmod` or other restoration failures.
7. Handle zero-byte files correctly; do not use truthiness of an empty base64 string to mean “no content.”
8. Handle binary payloads and UTF-8 safely.
9. If a recheck fails, do not continue mutating remaining targets.
10. Preserve a precise recovery inventory describing which targets were restored and which were not, if an unexpected OS-level failure occurs during Phase B.

Be explicit about the limits of portable filesystem race prevention. If the platform cannot provide race-free descriptor-relative operations, document the residual TOCTOU limitation and use the strongest available safe implementation. Do not claim complete TOCTOU elimination without evidence.

### Required adversarial rollback tests

Use the actual public rollback API and real temporary repository files. Include:

- Target absent in Phase A, created before Phase B.
- Target present in Phase A, replaced before Phase B.
- Content changed after Phase A.
- Mode changed after Phase A.
- Parent directory replaced with a symlink after Phase A.
- Target replaced with a symlink after Phase A.
- Missing `pre.mode`.
- Missing `post.mode` where required.
- Invalid base64.
- Correctly encoded zero-byte file.
- Binary payload containing NUL and non-ASCII bytes.
- Corrupt second target payload in a multi-target rollback.
- Wrong second target hash in a multi-target rollback.
- Second target mode mismatch in a multi-target rollback.
- Coordinator-exclusive path with forged task/provenance.
- `chmod` failure and write/rename failure.
- Duplicate paths and path aliases.

For every Phase A rejection, assert **zero target mutations across the entire target set** using pre/post hashes, existence, and modes.

For every Phase B race rejection, assert the raced target was not overwritten and provide the exact per-target recovery inventory. Do not manually construct a successful result object in place of invoking rollback.

Do not add public test-hook parameters to production APIs. If deterministic race injection is needed, use dependency injection confined to a non-production test harness or a private test seam that is not reachable through the production public API. Prove that production exports do not expose the seam.

---

# 3. P1 findings to close

## P1-01 — Enforce strict CRLF in the authoritative production register loader

The parser supports strict CRLF mode, but the production authoritative loader previously called:

- `parseCsvStrict(taskCsv)`
- `parseCsvStrict(manifestCsv)`
- `parseCsvStrict(batch1Csv)`

without `strictCrlf: true`.

Required:
1. Make the production authoritative loader explicitly enforce strict CRLF for all authoritative registers.
2. Reject LF-only, lone-CR, malformed quoted fields, duplicate headers, invalid row widths, and ambiguous records according to the documented schema.
3. Do not rely on parser-helper tests alone.
4. Add tests through the actual register-loading/public patch-gate path for each register.
5. Include valid CRLF controls and exact error codes/messages.

## P1-02 — Synthesis must load and verify authoritative evidence itself

The prior `generate-synthesis.cjs` accepted a caller-supplied manifest, allowed missing expected hashes, did not fully validate artifact/log completeness, and lacked a real CLI implementation despite report claims.

Required:
1. The generator must load its authoritative manifest from a deterministic, repository-controlled path.
2. Do not accept a caller-provided manifest as the authority for what files should exist or what hashes are expected.
3. Validate exact manifest schema, unique paths, unique artifact IDs, expected byte counts including zero, mandatory SHA-256 values, and safe repository-relative paths.
4. Verify every required artifact's existence, byte count, and SHA-256.
5. Verify every required log's existence and its declared process metadata.
6. Require actual process evidence fields where applicable: command, start/end timestamps, exit code, stdout/stderr capture or explicitly justified redaction, and the identity of the executed script/runner.
7. Do not treat a line containing `ACTUAL:` or a summary statement as raw process evidence.
8. Detect missing, duplicate, orphaned, truncated, stale, or unindexed artifacts/logs.
9. Validate the evidence package's internal references and ensure all claimed evidence is present.
10. Do not hardcode `READY`, `PASS`, clean Git state, branch, HEAD, or baseline totals.
11. Derive status only from validated evidence. Missing or contradictory evidence must produce a nonzero exit and a NOT READY result.
12. Implement a real CLI entry point with documented exit codes and deterministic output.
13. Add generator tests that run the CLI as a child process and inspect real exit codes, stdout, stderr, and generated output.

Required synthesis tests:
- Valid complete evidence control.
- Missing manifest.
- Missing artifact.
- Missing artifact hash.
- Missing byte count.
- Zero-byte artifact with expected byte count zero.
- Incorrect hash.
- Incorrect byte count.
- Duplicate artifact ID.
- Duplicate path.
- Path traversal and absolute path.
- Missing process log.
- Log with only `ACTUAL:` summary.
- Missing command/exit/timestamp metadata.
- Duplicate and orphaned logs.
- Stale evidence hash.
- Contradictory Git state.
- Missing required source artifact.
- Deterministic repeated generation.
- CLI failure returns nonzero.

## P1-03 — Strict duplicate and ambiguous patch-path rejection

Required:
1. Reject duplicate normalized paths rather than silently deduplicating them with a `Set`.
2. Detect aliases that normalize to the same target.
3. Detect rename/copy source and destination paths correctly.
4. Reject malformed, ambiguous, or unsupported Git diff path syntax.
5. Preserve correct parsing of Git C-quoted paths and octal UTF-8 escapes.
6. Do not silently ignore a path record that cannot be parsed.
7. Add tests through the real patch-gate entry point, not only the parser helper.

## P1-04 — Enforce task dependencies at the public patch gate

Required:
1. Load the authoritative task register and dependency definitions from repository-controlled sources.
2. Validate the exact task ID and owner against the authoritative register.
3. Validate dependency existence and detect cycles.
4. Enforce that every prerequisite is complete/accepted according to the authoritative status model before a dependent task can apply a patch.
5. Enforce the canonical W5 chain:
   `W5-1 → W5-2 → W5-3 → W5-4 → W5-5 → W5-6`
6. Do not accept caller-supplied dependency arrays or ownership records as authoritative.
7. Add public-gate tests proving W5-2 is rejected before W5-1 completion, W5-3 is rejected before W5-2 completion, and so on; also prove allowed tasks succeed when prerequisites are genuinely satisfied.
8. Do not mark historical or unexecuted tasks complete merely to make tests pass.

## P1-05 — Remove shell interpolation from path-sensitive Git calls

Required:
1. No shell command string may interpolate a patch-controlled or repository-relative path.
2. Use `spawnSync`/`execFileSync` with argument arrays and `shell: false`.
3. Validate path inputs before passing them to Git.
4. Correctly handle unusual filenames, spaces, quotes, leading hyphens, Unicode, and newlines where Git permits them.
5. Add adversarial tests proving shell metacharacters are treated as filename characters and cannot execute commands.
6. Verify all path-sensitive Git invocations, not just the two previously identified functions.

## P1-06 — Make mutation testing exact, semantic, and reproducible

Required:
1. Compare the exact expected finding set with the exact actual finding set; reject both missing and unexpected findings.
2. Verify each mutation actually changes the intended semantic property.
3. Verify source hashes before and after each mutation and restore exact original bytes.
4. Run a clean negative control before and after the mutation suite.
5. Use genuine child-process execution with captured command, timestamps, exit code, stdout, stderr, and script hash.
6. A mutation test must fail if the validator does not detect the intended defect.
7. A clean baseline must fail if any finding appears.
8. Harness must return nonzero if any mutation or control fails.
9. Include mutation IDs, target file/field, original hash, mutated hash, expected findings, actual findings, and restoration hash.

## P1-07 — Every test harness must fail the process on failure

Required:
1. Review rollback, containment, CSV, mutation, authorization, and synthesis harnesses.
2. Ensure every failed scenario increments a failure count and causes a nonzero process exit.
3. Capture genuine process exit code, stdout, stderr, command, timestamps, and runner SHA-256.
4. Do not write a PASS summary if child processes failed.
5. Add a meta-test that deliberately causes one scenario to fail and proves the harness exits nonzero.
6. No harness may manually assign an `exitCode` field in a report while the actual process exits zero.

## P1-08 — Repair the authoritative artifact manifest and package builder

Wave 0.4.10 claimed 82 embedded artifacts, but the evidence-package builder source was not embedded or included in the manifest. Earlier waves also had incorrect/mislabelled artifact records.

Required:
1. Inventory every embedded source, report, register, test, runner, and raw log.
2. Generate a complete authoritative manifest from the actual package contents.
3. Every record must have a unique ID, exact path/section, exact byte count (including zero), and mandatory SHA-256.
4. Verify the artifact's embedded bytes match its manifest record.
5. Correct all mislabeled paths and hashes.
6. Include the package builder's complete source and tests in the manifest and consolidated package.
7. Include the synthesis generator's complete source and tests.
8. Include all nine frozen baseline runner source files, with exact hashes and byte counts.
9. Include `daAppShell.js`, W7/W8 contract sources, patch gate, parser, validator, all test harnesses, task register, ownership manifest, Batch1 allowlist, and all relevant evidence sources.
10. Do not claim “176 artifacts” or any other count unless the generated manifest proves the exact count.
11. The builder must not hardcode a readiness verdict.
12. Builder must be deterministic: same inputs produce byte-identical output, apart from explicitly identified generated timestamps if timestamps are strictly necessary. Prefer no volatile timestamps in generated package content.
13. The builder must validate its own output and return nonzero on any inconsistency.

---

# 4. Frozen baseline and regression requirements

The nine frozen offline baseline runners must remain byte-identical. Do not modify them.

Expected baseline inventory from prior Wave 0 work:

1. `run-poc-tests.cjs` — 43
2. `run-wave4-integration-suite.cjs` — 32
3. `run-lane-a-schema-tests.cjs` — 9
4. `run-lane-c-preset-manager-tests.cjs` — 10
5. `run-lane-d-graph-filter-tests.cjs` — 15
6. `run-lane-e-matrix-tests.cjs` — 11
7. `run-lane-f-findings-tests.cjs` — 12
8. `run-workstream-a-tests.cjs` — 33
9. `run-workstream-c-tests.cjs` — 22

Expected total: 187 checks per sweep.

Required:
- Capture frozen runner SHA-256 and byte count before and after.
- Run all nine runners three times, for 27 genuine child-process executions.
- Capture one raw execution record per child process, not just an aggregate.
- Each record must include command, runner path/hash, start/end timestamps, actual exit code, stdout, stderr, and observed check counts.
- Verify expected count per runner and 187 per sweep.
- Do not claim 561 PASS outcomes unless all 27 actual child processes succeeded and the check identities/counts support that claim.
- Distinguish execution count, check count, and unique test identity count.
- If a runner cannot execute, report the blocker and do not substitute a manually authored PASS record.
- Do not modify runner contents to make them pass.

---

# 5. Consolidated evidence package — one Markdown file only

The primary deliverable must be exactly:

`WAVE_0_4_11_SINGLE_FILE_PRE_BATCH_1_EVIDENCE_PACKAGE.md`

All individual reports, source files, manifests, test outputs, raw logs, and audit records must be embedded as clearly labelled sections inside this one Markdown document. Do not make the user assemble multiple files.

You may create temporary working files during execution, but the final evidence package must contain the complete content needed for independent review.

## Required package structure

1. Package cover, purpose, scope, and explicit no-dispatch status.
2. Initial environment and Git-state capture (verbatim).
3. Wave 0.4.10 finding reproduction matrix.
4. Remediation summary and exact source paths changed.
5. P0-01 coordinator authorization design, call graph, exports, and adversarial tests.
6. P0-02 rollback transaction design, threat model, Phase A/Phase B logic, race limitations, and adversarial tests.
7. P1-01 strict CRLF production loader source and public-path tests.
8. P1-02 synthesis generator complete source, CLI, schema, and tests.
9. P1-03 patch-path parser source and public-gate tests.
10. P1-04 dependency enforcement source, authoritative register, W5-chain tests.
11. P1-05 Git invocation inventory and shell-injection tests.
12. P1-06 mutation validator complete source and per-mutation records.
13. P1-07 all harness sources and actual child-process evidence.
14. P1-08 complete artifact manifest and package-builder source/tests.
15. Frozen baseline runner source inventory, hashes, and 27 raw execution logs.
16. All remediation test harness sources and raw outputs.
17. Mutation and clean-control evidence.
18. Component provenance evidence, clearly distinguishing inbound handlers from outbound dispatched events.
19. Final Git state and exact initial-to-final diff.
20. Complete artifact manifest with exact hashes and byte counts.
21. Independent package self-validation output.
22. Known limitations, residual risks, and unclosed findings.
23. Final readiness assessment.
24. Explicit statement: `BATCH 1 DISPATCH AUTHORIZED: NO`.

For every embedded file, include:
- Exact repository-relative path.
- Whether it is source, test, register, report, or log.
- SHA-256 of exact embedded bytes.
- Exact byte count.
- Complete content, not an excerpt, unless the item is a raw log whose complete output is embedded.
- A unique artifact ID referenced by the manifest.

For every log, include genuine child-process metadata. Label summaries as summaries, never as raw logs.

The manifest must be generated from the actual embedded artifacts and validated against them. Do not hand-author a claimed artifact count.

---

# 6. Required final verification

Before presenting the package:

1. Re-run all focused authorization, rollback, CSV, dependency, path parsing, shell-safety, mutation, harness, synthesis, and builder tests.
2. Re-run all nine frozen baseline runners three times.
3. Verify frozen runner hashes did not change.
4. Verify every manifest entry against the exact embedded content.
5. Verify there are no duplicate IDs, paths, or conflicting path aliases.
6. Verify every required source and log is present.
7. Verify generated package determinism by building twice from identical inputs and comparing exact bytes/hashes.
8. Run the package's own independent validator against the final package.
9. Capture final Git status and compare it with the initial state.
10. Confirm no files were staged or committed by this task.
11. Confirm no Batch 1 task or feature implementation was started.

If any required test cannot execute, any required artifact is missing, any manifest record fails, any process exits nonzero, or any security boundary remains unproven, the final verdict must be NOT READY.

## Final verdict vocabulary

Choose exactly one:

- `READY FOR INDEPENDENT AUTHORIZATION REVIEW`
- `NOT READY — REMEDIATION INCOMPLETE`
- `NOT READY — EVIDENCE INSUFFICIENT`

Even if the package earns `READY FOR INDEPENDENT AUTHORIZATION REVIEW`, this is not Batch 1 authorization. Only a separate independent review can decide whether dispatch is permitted.

If no genuine trusted coordinator authorization mechanism exists, coordinator-exclusive patching must remain unavailable and the final verdict must not imply that coordinator execution is authorized.

---

# 7. Final response format to the user

Return:
1. The exact path to `WAVE_0_4_11_SINGLE_FILE_PRE_BATCH_1_EVIDENCE_PACKAGE.md`.
2. Its SHA-256 and byte count.
3. Initial and final branch/HEAD/Git status summary.
4. Number of remediation tests actually executed and number passed/failed/skipped.
5. Frozen baseline execution count and results.
6. Exact list of findings closed, partially closed, and open.
7. Final verdict using one of the exact verdict strings above.
8. The explicit line: `BATCH 1 DISPATCH AUTHORIZED: NO`.

Do not claim success based on documentation alone. Do not omit unresolved findings. Do not start Batch 1.
