# WAVE 0.4.11 — SEQUENCED INTEGRATION, REMEDIATION, AND EVIDENCE CLOSURE
## Jules execution prompt — integrate Wave 0.4.9 before reconciling Wave 0.4.10; no Batch 1 dispatch

You are working in the Dependency Analyzer repository. A sequencing error has been identified:

**The Wave 0.4.9 output was not merged/integrated into the repository before the Wave 0.4.10 prompt was executed.**

Therefore, Wave 0.4.10 must NOT be treated as a cumulative continuation of Wave 0.4.9. Its source changes may have been developed against an earlier code state. The first priority is to reconstruct the correct sequence, integrate the actual Wave 0.4.9 implementation output, then reconcile and selectively port the Wave 0.4.10 work on top of it. Only after that may you perform the Wave 0.4.11 security remediation and evidence closure.

This prompt supersedes the previous Wave 0.4.11 prompt. Follow the sequence below exactly.

**No Batch 1 task is authorized. This remains a pre-dispatch verification and remediation exercise.**

---

# 1. Hard restrictions

- Do NOT dispatch Batch 1.
- Do NOT launch W5-1 or any other feature task.
- Do NOT start Waves 5–9 feature implementation.
- Do NOT create feature branches, commits, tags, or pull requests.
- Do NOT stage files.
- Do NOT modify the nine frozen baseline runners.
- Do NOT modify application functionality unrelated to the Wave 0.4.9/0.4.10 integration and Wave 0.4.11 remediation.
- Do NOT perform Salesforce org operations, authentication, deployment, or production data operations.
- Do NOT run destructive Git commands (`reset --hard`, `clean`, broad `checkout`, force operations, or equivalent).
- Do NOT overwrite or discard pre-existing user changes.
- Do NOT assume that a report saying “merged,” “applied,” “verified,” or “complete” proves that code is present in the current repository.
- Do NOT blindly cherry-pick, copy, or overwrite Wave 0.4.10 files over Wave 0.4.9 files.
- Do NOT reconstruct source files from prose or summaries. Use exact embedded source blocks only when their path, hash, and byte count can be verified.
- Do NOT claim tests were executed if they were only specified, inspected, simulated, or reasoned about.
- Do NOT claim a clean working tree unless actual Git output proves it.

If any required source, patch, package, branch, or evidence is unavailable, report the exact blocker. Do not fabricate missing inputs.

---

# 2. Required inputs and expected files

Locate and inspect these exact consolidated packages if available:

1. `WAVE_0_4_9_SINGLE_FILE_PRE_BATCH_1_EVIDENCE_PACKAGE.md`
2. `WAVE_0_4_10_SINGLE_FILE_PRE_BATCH_1_EVIDENCE_PACKAGE.md`

Also search the current repository and available Jules workspace artifacts for:
- Wave 0.4.9 implementation patches, diffs, changed source files, test files, and generated artifacts.
- Wave 0.4.10 implementation patches, diffs, changed source files, test files, and generated artifacts.
- Any branch/ref/commit/worktree metadata associated with either run.
- Prior integration notes, conflict reports, source hashes, and test logs.

The Wave 0.4.9 and Wave 0.4.10 evidence packages are not interchangeable with implementation patches. Treat embedded source files as recoverable implementation inputs only after validating exact source path, SHA-256, byte count, and completeness.

If the 0.4.9 package is absent but a verified 0.4.9 patch or exact source artifact exists elsewhere, use that artifact and record its provenance. If neither is available, stop before source integration and report that the required Wave 0.4.9 implementation cannot be reliably recovered.

---

# 3. Phase 0 — Capture the current repository state before any change

Before creating, editing, generating, or deleting anything, capture verbatim:

1. `pwd`
2. `git rev-parse --show-toplevel`
3. `git branch --show-current`
4. `git rev-parse HEAD`
5. `git status --porcelain=v2 --branch`
6. `git diff --stat`
7. `git diff --cached --stat`
8. `git diff`
9. `git diff --cached`
10. `git ls-files --others --exclude-standard`
11. `git log --oneline --decorate -30`
12. `git branch --all --verbose --no-abbrev`
13. `git worktree list --porcelain`
14. Node, npm, Python, and Git versions.
15. SHA-256 and byte count of each of the nine frozen baseline runners.

Save exact command output in the final evidence package.

If the tree is dirty, preserve it. Identify pre-existing modifications and untracked files. Do not stage, reset, clean, or overwrite them.

Create a read-only inventory of all Wave 0.4.9 and Wave 0.4.10 artifacts before integration.

---

# 4. Phase 1 — Reconstruct the actual Wave 0.4.9 output

Inspect the complete Wave 0.4.9 package and any associated implementation output.

The Wave 0.4.9 package's previously identified characteristics include:
- Branch reported as `jules-16656031112462310269-c226efb9`
- HEAD reported as `922b89e6c8e0c6d220efa18a728a331fcbe54c50`
- A claimed 176 embedded artifacts, but the manifest in the package was incomplete/mismatched.
- Complete nine baseline runner sources, `daAppShell.js`, and W7/W8 contracts were claimed embedded.
- Prior independent audit found security and evidence defects, including:
  - Public rollback privilege derived from caller-forgeable task/provenance.
  - Public pre-mutation and pre-Phase-B test hooks.
  - Rollback mode/empty-payload problems.
  - Permissive production CSV CRLF behavior.
  - Duplicate patch paths silently deduplicated.
  - Missing dependency completion enforcement.
  - Shell interpolation through `execSync`.
  - Incomplete mutation assertions and harness exit handling.
  - Synthesis generator accepting caller-supplied manifest and hardcoded readiness.
  - Incomplete manifest and missing synthesis CLI evidence.
  - TOCTOU gaps.

These are historical claims to verify against the actual package. Do not assume all listed issues are present or fixed in the current checkout.

## 4.1 Build a Wave 0.4.9 provenance inventory

For each 0.4.9 source/test/report artifact, record:
- Exact source path.
- Artifact ID and package section.
- SHA-256 of the exact embedded bytes.
- Exact byte count.
- Whether it is source, test, register, report, or log.
- Whether an exact corresponding artifact exists in the current checkout.
- Current checkout hash and byte count, if present.
- Whether it is new, modified, unchanged, missing, or conflicting.
- Whether the package's own manifest correctly describes it.

Do not use a claimed manifest count as proof. Independently count and validate the actual embedded artifacts.

## 4.2 Identify the actual Wave 0.4.9 implementation delta

Produce an explicit list of:
- Files that Wave 0.4.9 intended to add.
- Files that Wave 0.4.9 intended to modify.
- Files that are only evidence/report artifacts and must not be copied into production source locations.
- Files that are frozen and must remain unchanged.
- Files that are missing or cannot be reconstructed reliably.

If a package artifact is a source file, verify the complete source content and exact hash before considering it for integration.

---

# 5. Phase 2 — Integrate Wave 0.4.9 first

This phase is mandatory and must precede any Wave 0.4.10 source integration.

## 5.1 Integration method

Integrate the verified Wave 0.4.9 implementation changes into the current repository working tree, preserving all pre-existing user changes.

- Do not create a commit or stage changes.
- Do not use a broad checkout or reset.
- Do not overwrite a current file without first preserving and comparing its exact current bytes.
- Use file-by-file, path-scoped integration.
- For each changed file, retain the original bytes in a safe, non-destructive comparison artifact or report.
- If the 0.4.9 output is available as an exact Git patch, validate its base and applicability before applying it.
- If the patch base differs from the current HEAD, do not force-apply. Reconstruct and review the file-level change manually from verified source/diff evidence.
- If a file cannot be integrated without losing unrelated user changes, stop on that file and report the conflict. Do not choose a side silently.

## 5.2 Wave 0.4.9 integration validation

After applying the 0.4.9 changes, verify:
- Every intended 0.4.9 implementation path is accounted for.
- No report or log was accidentally copied into a production source path.
- No frozen baseline runner changed.
- No unrelated pre-existing user modification was lost.
- No unreviewed conflict was resolved by overwriting.
- Current source hashes match the integrated content recorded in the integration manifest.

Run the focused Wave 0.4.9 tests that can be executed safely. Distinguish tests that pass from tests that expose known Wave 0.4.9 defects.

**Do not attempt to “make Wave 0.4.9 green” by weakening tests or changing expected results.** The point is to integrate its actual output faithfully, then remediate the defects in the next phase.

Produce an integration report that states one of:
- `WAVE 0.4.9 INTEGRATED — VERIFIED`
- `WAVE 0.4.9 PARTIALLY INTEGRATED — CONFLICTS OPEN`
- `WAVE 0.4.9 NOT INTEGRABLE — REQUIRED INPUT MISSING`

If the result is not fully integrated, do not proceed to treating 0.4.10 as cumulative. You may continue read-only analysis, but do not apply 0.4.10 changes on top of an unresolved 0.4.9 state.

---

# 6. Phase 3 — Reconcile Wave 0.4.10 on top of integrated Wave 0.4.9

The Wave 0.4.10 prompt was executed before the Wave 0.4.9 output had been integrated. Therefore, its output is a separate, potentially stale implementation branch/state—not a reliable cumulative patch.

## 6.1 Reconstruct Wave 0.4.10 independently

Inspect the complete 0.4.10 package and associated workspace/branch/patch artifacts.

Previously reported 0.4.10 state:
- Branch `jules-1581901653157623122-2446219f`
- HEAD `8d8d24e8a6755ffbf20a1252e2fd0808c7123763`
- 82 embedded artifact records claimed.
- Nine frozen baseline runners × three sweeps were claimed.
- Independent audit found:
  - Public `apply_coordinator_patch_with_provenance()` privilege bypass.
  - Rollback Phase B existence/content/mode race.
  - Production register loader did not enable strict CRLF.
  - Dependency completion enforcement incomplete.
  - Synthesis generator was not genuinely fail-closed and lacked a real CLI.
  - Raw process evidence was overclaimed; many logs were in-process summaries.
  - Package builder and baseline raw logs were absent from the manifest/package.
  - Several positive tests could pass early on unrelated errors.

Verify these claims against the actual 0.4.10 package. Do not assume its source is present in the current checkout.

## 6.2 Do not blindly merge 0.4.10 over 0.4.9

For each file changed by 0.4.10:
1. Compare the 0.4.10 version with the original pre-0.4.9 version, if recoverable.
2. Compare it with the now-integrated 0.4.9 version.
3. Identify which 0.4.10 changes are independent improvements.
4. Identify which changes assume the older pre-0.4.9 implementation.
5. Identify which changes would regress or erase 0.4.9 behavior.
6. Port only the compatible intent, with code review and tests.
7. Do not copy a complete 0.4.10 file over a 0.4.9 file merely because its timestamp or version is later.
8. Do not claim that 0.4.10 has been merged unless every intended source delta is reconciled and verified.

Create a three-way reconciliation table:

| Path | Pre-0.4.9 version | Wave 0.4.9 version | Wave 0.4.10 version | Integrated decision |
|---|---|---|---|---|

For each file, document the chosen implementation and why. Where the original base version cannot be recovered, state that limitation and do not invent a three-way merge result.

## 6.3 Wave 0.4.10 integration status

Use one:
- `WAVE 0.4.10 RECONCILED ON TOP OF 0.4.9`
- `WAVE 0.4.10 PARTIALLY RECONCILED — CONFLICTS OPEN`
- `WAVE 0.4.10 NOT RECONCILABLE — REQUIRED SOURCE/BASE MISSING`

Do not proceed to implementation remediation if 0.4.9 or 0.4.10 integration has unresolved conflicts affecting the patch gate, rollback, authoritative registers, synthesis, validator, or test harnesses.

---

# 7. Phase 4 — Wave 0.4.11 security and evidence remediation

Only after Phases 2 and 3 are completed and verified, remediate the following findings against the **integrated code**, not against a stale Wave 0.4.10 snapshot.

## P0-01 — Coordinator authorization boundary

Remove every public coordinator privilege bypass, including the former exported `apply_coordinator_patch_with_provenance()` route.

- No caller-supplied task ID, provenance, role string, boolean, or environment value may grant coordinator privilege.
- Do not expose an alternate privileged public API.
- Review exports, re-exports, package entry points, and indirect routes.
- If no genuine non-forgeable trusted coordinator mechanism exists, keep coordinator-exclusive mutation unavailable and fail closed.
- Ordinary task APIs must enforce authoritative ownership/path scope.
- Rollback must not accept forged coordinator provenance.

Tests must exercise the actual public API with valid matching base SHAs, not pass early because of `BASE_SHA_MISMATCH`. Verify exact rejection and unchanged file hashes for all coordinator-exclusive targets.

## P0-02 — Rollback transaction and race safety

Implement complete Phase A preflight and per-target Phase B revalidation immediately before mutation.

Validate:
- Canonical repository-relative paths and containment.
- Every parent component and target symlink status.
- Expected existence/nonexistence.
- Content hash and byte length.
- File mode, including mandatory pre-state mode where required.
- Payload base64, decoded length, and hash.
- Provenance and task ownership.
- Duplicate paths and aliases.

No target may mutate if Phase A finds any invalid target.

Phase B must recheck existence, content, mode, containment, and symlink state immediately before each mutation. Detect a file created after Phase A when the expected post-state was absent. Do not swallow chmod/write/rename errors. Correctly handle zero-byte and binary payloads. Provide a precise recovery inventory for unexpected OS-level partial failure.

Test through the actual public rollback API:
- Absent target created between phases.
- Existing target replaced between phases.
- Content and mode race.
- Parent and target symlink race.
- Missing required modes.
- Invalid payload.
- Zero-byte and binary payload.
- Corrupt second target in a multi-target rollback.
- Duplicate paths and aliases.
- Coordinator-exclusive path with forged metadata.
- chmod/write/rename failures.

Use only private test-harness injection for deterministic races; no public production test-hook parameters. Document residual platform TOCTOU limitations honestly.

## P1-01 — Strict CRLF production loader

The actual authoritative register loader must explicitly enable strict CRLF for task, ownership/manifest, and Batch1 registers. Test through the public loader/patch gate:
- Valid CRLF accepted.
- LF-only rejected.
- Lone CR rejected.
- Malformed quoting rejected.
- Duplicate headers and invalid row widths rejected.

Parser-helper tests alone do not close this finding.

## P1-02 — Synthesis generator and CLI

The generator must load its authoritative manifest from a deterministic repository-controlled path, not a caller-supplied manifest.

Require:
- Exact schema.
- Unique IDs and paths.
- Mandatory SHA-256 and byte counts, including zero.
- Safe relative paths.
- Exact artifact and log inventory.
- Complete process metadata for raw logs: command, timestamps, actual exit code, stdout/stderr or justified redaction, runner identity/hash.
- Rejection of missing, duplicate, orphaned, truncated, stale, corrupt, and unindexed evidence.
- No `ACTUAL:`-only summary accepted as raw process evidence.
- No hardcoded readiness, branch, HEAD, clean state, or totals.
- Real CLI, documented exit codes, nonzero failure behavior.
- Deterministic output.

Test the CLI as a child process for valid control, missing manifest/artifact/hash/byte count, zero-byte artifact, bad hash/size, duplicates, traversal, summary-only log, missing process metadata, orphaned logs, stale evidence, contradictory Git state, missing source, deterministic output, and nonzero failures.

## P1-03 — Patch-path parsing

Reject duplicate normalized paths and aliases. Correctly parse rename/copy source and destination paths, Git C-quoted paths, and octal UTF-8 escapes. Reject malformed or ambiguous syntax. Test through the public patch gate.

## P1-04 — Dependency enforcement

Load authoritative task/dependency data from repository-controlled sources. Validate owner, task ID, dependency existence, cycles, and prerequisite completion/acceptance.

Enforce:
`W5-1 → W5-2 → W5-3 → W5-4 → W5-5 → W5-6`

A dependent task must not pass merely because its own status says `IMPLEMENTATION_DEPENDENT`. Verify the actual predecessor's authoritative completion status. Do not mark unexecuted work complete to satisfy tests. Exercise the public gate.

## P1-05 — Shell-safe Git operations

Remove shell interpolation from every path-sensitive Git invocation. Use argument arrays with `shell:false`; validate paths. Test spaces, quotes, leading hyphens, Unicode, newline filenames where supported, and shell metacharacters. Verify no injected command executes.

## P1-06 — Exact mutation tests

Compare exact expected and actual finding collections, detecting missing, unexpected, and duplicate findings. Verify each mutation changes the intended semantic property. Record original/mutated/restored hashes. Run clean negative controls before and after. Use genuine child processes and real exit codes. A failed mutation or a finding on clean control must produce nonzero exit.

## P1-07 — Harness exit behavior

Every harness must return nonzero on any failed scenario. Capture command, timestamps, actual process exit code, stdout, stderr, and runner hash. Add a deliberate-failure meta-test proving the process exits nonzero. Do not synthesize exit codes in report objects.

## P1-08 — Complete artifact manifest and package builder

Inventory every source, test, register, report, and raw log. Generate the manifest from actual package content. Each record must have unique ID, path/section, exact byte count, and SHA-256. Include complete package-builder and synthesis-generator source and tests. Include all nine frozen baseline runner sources, `daAppShell.js`, W7/W8 contracts, patch gate, parser, validator, harnesses, task register, ownership manifest, Batch1 allowlist, and all required logs. Validate every embedded artifact against its manifest record. Do not claim an artifact count that is not proven by the generated manifest.

---

# 8. Frozen baseline regression gate

The nine frozen offline runners must remain byte-identical:

1. `run-poc-tests.cjs` — 43
2. `run-wave4-integration-suite.cjs` — 32
3. `run-lane-a-schema-tests.cjs` — 9
4. `run-lane-c-preset-manager-tests.cjs` — 10
5. `run-lane-d-graph-filter-tests.cjs` — 15
6. `run-lane-e-matrix-tests.cjs` — 11
7. `run-lane-f-findings-tests.cjs` — 12
8. `run-workstream-a-tests.cjs` — 33
9. `run-workstream-c-tests.cjs` — 22

Expected: 187 checks per sweep.

Run all nine three times: 27 genuine child-process executions. Capture a separate raw execution record for each process containing command, runner path/hash, timestamps, actual exit code, stdout, stderr, and observed check identities/counts.

Verify each runner's expected count and 187 per sweep. Distinguish process executions, check outcomes, and unique test identities. Do not claim 561 passes unless all raw executions support it. If a runner cannot execute, report the blocker. Do not modify frozen runners.

---

# 9. Single-file deliverable

Create exactly one primary deliverable:

`WAVE_0_4_11_SEQUENCED_INTEGRATION_EVIDENCE_PACKAGE.md`

All reports, source files, tests, registers, manifests, package-builder source, and raw execution logs must be embedded in this one Markdown file. The user must not need to assemble multiple files.

## Mandatory package sections

1. Cover, scope, and explicit no-dispatch status.
2. Initial environment and verbatim Git-state capture.
3. Artifact discovery and provenance for Wave 0.4.9 and Wave 0.4.10.
4. Wave 0.4.9 file inventory and hash verification.
5. Wave 0.4.9 integration plan, conflicts, and exact integration record.
6. Wave 0.4.9 focused test results.
7. Wave 0.4.10 independent provenance inventory.
8. Three-way reconciliation matrix and integration decisions.
9. Wave 0.4.10 reconciliation test results.
10. P0-01 coordinator authorization design, call graph, exports, and tests.
11. P0-02 rollback transaction design, threat model, Phase A/Phase B, race limitations, and tests.
12. P1-01 strict CRLF loader source and public-path tests.
13. P1-02 synthesis generator complete source, CLI, schema, and tests.
14. P1-03 path parser source and public-gate tests.
15. P1-04 dependency enforcement source, authoritative register, and tests.
16. P1-05 Git invocation inventory and shell-safety tests.
17. P1-06 mutation validator source and per-mutation evidence.
18. P1-07 all harness sources and genuine child-process evidence.
19. P1-08 complete manifest and package-builder source/tests.
20. Frozen baseline runner inventory, hashes, and 27 raw execution logs.
21. Component provenance evidence, distinguishing inbound handlers from outbound dispatched events.
22. Final Git state and exact initial-to-final delta.
23. Independent package self-validation output.
24. Known limitations, residual risks, and unresolved findings.
25. Final readiness assessment.
26. Explicit statement: `BATCH 1 DISPATCH AUTHORIZED: NO`.

For every embedded artifact include:
- Exact repository-relative path.
- Artifact type.
- Unique artifact ID.
- SHA-256 of exact embedded bytes.
- Exact byte count.
- Complete source/content, not an excerpt (raw logs must be complete).
- Manifest record that matches the embedded bytes.

For every raw process log include actual command, timestamps, exit code, stdout, stderr, and runner identity/hash. Label summaries as summaries, never as raw logs.

The package manifest must be generated from actual embedded artifacts and independently validated. Do not hand-author artifact counts.

---

# 10. Final gates and stop conditions

Do not proceed to the next phase if the previous phase is unresolved:

- If Wave 0.4.9 source output cannot be recovered and verified: stop source integration.
- If Wave 0.4.9 integration has unresolved conflicts in security-critical files: do not apply Wave 0.4.10 to those files.
- If Wave 0.4.10 cannot be reconciled against the integrated 0.4.9 state: document it as unreconciled; do not claim cumulative completion.
- If any P0 remains open: final verdict cannot be ready.
- If any required test cannot execute, any artifact is missing, any manifest record fails, any raw log is absent, or any process exits nonzero: final verdict is NOT READY.
- If no genuine trusted coordinator authorization mechanism exists, coordinator-exclusive mutation must remain unavailable.
- Never dispatch Batch 1, regardless of the package's internal verdict.

Before finalizing:
1. Re-run all focused integration, authorization, rollback, CSV, dependency, path, shell-safety, mutation, harness, synthesis, and package-builder tests.
2. Re-run the nine frozen runners three times.
3. Verify frozen runner hashes unchanged.
4. Verify every artifact manifest record against embedded bytes.
5. Verify no duplicate IDs, paths, or path aliases.
6. Verify package determinism by generating twice from identical inputs and comparing exact bytes/hashes.
7. Run the package's independent validator against the final package.
8. Capture final Git state and compare with initial state.
9. Confirm no files were staged or committed.
10. Confirm no Batch 1 task or feature implementation was started.

## Allowed final verdicts

Choose exactly one:

- `READY FOR INDEPENDENT AUTHORIZATION REVIEW`
- `NOT READY — REMEDIATION INCOMPLETE`
- `NOT READY — EVIDENCE INSUFFICIENT`

`READY FOR INDEPENDENT AUTHORIZATION REVIEW` is not implementation authorization and is not Batch 1 authorization. A separate independent review is still required.

---

# 11. Final response to the user

Return:
1. Exact path to `WAVE_0_4_11_SEQUENCED_INTEGRATION_EVIDENCE_PACKAGE.md`.
2. SHA-256 and byte count.
3. Initial/final branch, HEAD, and Git status summary.
4. Wave 0.4.9 integration status using the exact status strings above.
5. Wave 0.4.10 reconciliation status using the exact status strings above.
6. Number of integration/remediation tests actually executed, passed, failed, and skipped.
7. Frozen baseline process executions and results.
8. Exact findings closed, partially closed, and open.
9. Final verdict using one of the exact allowed strings.
10. The explicit line: `BATCH 1 DISPATCH AUTHORIZED: NO`.

Do not claim cumulative completion if Wave 0.4.9 was not integrated first. Do not conceal conflicts or missing source provenance. Do not start Batch 1.
