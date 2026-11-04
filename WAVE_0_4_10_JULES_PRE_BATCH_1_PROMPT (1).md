# WAVE 0.4.10 — FINAL SECURITY BOUNDARY & EVIDENCE INTEGRITY CLOSURE
## Jules execution prompt — pre-Batch 1 authorization gate

You are operating in the Dependency Analyzer repository. This is a focused remediation, verification, and evidence-packaging task following the independent review of `WAVE_0_4_9_SINGLE_FILE_PRE_BATCH_1_EVIDENCE_PACKAGE.md`.

Your task is to close the specific unresolved findings below and produce one self-contained Markdown evidence package. This is NOT authorization to dispatch Batch 1 or begin feature implementation.

---

## 1. Absolute execution boundaries

### Allowed
- Inspect the repository and the complete Wave 0.4.9 package.
- Make narrowly scoped changes to Wave 0 patch-gate, rollback, CSV parser, diff/path parser, dependency validation, test harness, and evidence-generation tooling needed to close the findings.
- Add/update Wave 0.4.10 tests and evidence.
- Install a dependency only if genuinely required: inspect existing manifests/environment first, install only what is necessary, and report exactly what/why.
- Run all nine frozen baseline runners without modifying them.
- Produce the single consolidated package specified below.

### Prohibited
- Do NOT dispatch Batch 1, launch feature agents, or begin feature tasks.
- Do NOT implement Wave 5–9 product features or change Salesforce/LWC/Apex application functionality.
- Do NOT modify frozen baseline runner source, baseline test identities, or expected-count definitions.
- Do NOT create a branch, commit, stage files, amend commits, reset, clean, checkout over user changes, or run destructive Git operations.
- Do NOT use broad rollback commands or overwrite unrelated working-tree content.
- Do NOT claim a clean initial tree unless captured evidence proves it.
- Do NOT conceal, normalize, or discard pre-existing user changes.
- Do NOT treat summaries or manually constructed results as raw execution evidence.
- Do NOT claim coordinator authentication exists unless the runtime supplies a genuine, trustworthy identity boundary.

### Preserve initial state
Before creating/modifying anything, capture and preserve:
- `git branch --show-current`, `git rev-parse HEAD`
- `git status --short`, `git status --porcelain=v2`
- `git diff --stat`, `git diff --cached --stat`
- `git diff --binary`, `git diff --cached --binary`
- Relevant tracked/untracked/staged paths and file hashes.

Capture this before creating Wave 0.4.10 files. If the tree is already dirty, enumerate and preserve every pre-existing dirty path. Do not stage anything. At completion, capture the same status/diff evidence and attribute each changed path to pre-existing state or Wave 0.4.10. Never use destructive Git commands to recreate the initial state.

---

## 2. Authoritative baseline to preserve

Read the complete Wave 0.4.9 package and inspect actual repository sources. Reproduce findings independently; do not accept the previous closure matrix as proof.

Verify and preserve these baseline claims:
- Nine frozen offline baseline runners.
- 187 unique expected check identities per complete sweep.
- Three sweeps: 27 child-process executions and 561 cumulative outcomes.
- 21 task-register entries.
- 175 authoritative manifest paths: 99 existing + 76 planned new.
- Batch 1: 11 task IDs and 49 path rows.
- W5 serialization: W5-1 → W5-2 → W5-3 → W5-4 → W5-5 → W5-6.

Do not hardcode these numbers as proof. Derive them from authoritative source files and report discrepancies. Do not silently alter the baseline to make tests pass.

---

## 3. P0-01 — Close coordinator-only rollback privilege escalation

Wave 0.4.9 removed the direct exported coordinator patch function, but exported `pathSafeRollback()` still accepts caller-supplied provenance and can derive coordinator privilege from a task ID such as `INT-1`.

Required:
1. Trace every exported/public route into rollback and every route capable of writing coordinator-exclusive paths.
2. Never treat caller-supplied `taskId`, `effectiveTaskId`, role flags, provenance objects, task-register rows, or hashes as proof of coordinator identity.
3. Do not authorize coordinator-only restoration through an ordinary public feature rollback API.
4. If a genuine non-forgeable coordinator capability exists, validate it at the trust boundary and bind it to the exact operation, repository/base SHA, allowed paths, patch identity, and provenance record. Arbitrary callers must not be able to construct it.
5. If no trustworthy identity mechanism exists, fail closed: public rollback rejects coordinator-exclusive paths. State that coordinator-only rollback is unsupported until a trusted boundary exists.
6. Add adversarial tests for forged `INT-1` provenance, `isCoordinatorCall: true`, forged registers/manifest, forged payload/hash, and every exported rollback route.
7. Prove these attacks cannot modify coordinator-exclusive files.

Checking only that a coordinator patch function is absent from exports is insufficient. The rollback API itself must be safe.

## 4. P0-02 — Remove public mutation hooks

Wave 0.4.9 still exposes `_testHookPreMutate` and `_testHookPrePhaseB` callback parameters.

Required:
1. Remove these parameters entirely from every public function signature and call path.
2. Do not replace them with renamed callbacks, flags, dependency overrides, or environment variables.
3. If fault injection is essential, isolate it behind a private test-only module boundary that production callers cannot import or invoke.
4. No callback may run between final preflight and mutation unless all relevant state is revalidated after it.
5. Update tests so they do not rely on public hooks.
6. Add API-surface/static tests that inspect exported functions and signatures, not only `Object.keys()`.

If a reliable test seam cannot be isolated, do not leave a public hook; report NOT READY if necessary.

---

## 5. Rollback: complete all-target preflight and safe restoration

Required design:
1. Validate the complete rollback request before mutation.
2. Validate every path; reject duplicates/aliases, directories, unsafe components, and symlinked parents.
3. Validate provenance authorization before trusting rollback data.
4. For every target validate required pre/post fields, types, canonical base64, decoded byte length (including zero), SHA-256, binary/UTF-8 fidelity, required file mode, current content hash, and current mode against expected post-state.
5. Empty base64 is valid for an empty file; never use truthiness to distinguish it from missing data.
6. Complete validation for ALL targets before the first filesystem mutation.
7. If any target fails Phase A, prove zero targets changed.
8. Use safe temporary files and atomic replacement where supported. Never silently swallow write, rename, chmod, fsync, or cleanup failures.
9. Verify restored hash, length, and mode after replacement.
10. Revalidate current-state assumptions immediately before replacement.
11. If Phase B fails after partial restoration, produce an exact recovery inventory with paths, before/after hashes/modes, and remaining actions. Do not claim multi-file atomicity unless demonstrated.

Mandatory tests: second-target corrupt payload; second-target wrong hash; zero-byte file; binary payload; current-mode mismatch; invalid/missing mode; chmod failure propagation; duplicate/aliased target; directory target; symlinked parent; forged coordinator provenance; mutation between validation and replacement; post-restore hash/length/mode verification.

---

## 6. Strict CSV mode in the production caller

Wave 0.4.9's parser supports strict CRLF, but the production patch-gate caller does not enable it.

Required:
- Production `parseCsvStrict()` explicitly invokes strict CRLF mode.
- Reject bare LF, bare CR, malformed quotes/escapes, and malformed record boundaries per the documented dialect.
- Do not normalize malformed input before validation or fall back to a permissive parser.
- Validate task, ownership, manifest, and Batch 1 registers through the same strict production path.
- Test the real patch-gate/register-loading caller, not only a helper.

Cover valid CRLF, bare LF/CR, quoted CRLF according to contract, unterminated quotes, invalid escapes, empty fields, UTF-8/BOM behavior, duplicate headers, malformed row widths, and proof that the production caller enables strict mode. Document the accepted dialect.

---

## 7. Duplicate/ambiguous paths and Git diff parsing

Wave 0.4.9 silently deduplicates normalized paths via a `Set`.

Required:
- Reject repeated diff sections for the same normalized path unless explicitly supported and modeled.
- Reject duplicate raw/normalized paths, aliases, source/destination collisions, and case-fold collisions where relevant.
- Never silently drop duplicates.
- Correctly parse Git C-quoted paths, including octal escapes; preserve spaces, tabs, quotes, backslashes, and non-ASCII names.
- Validate old and new paths for renames, copies, deletions, and additions.
- Reject traversal, absolute paths, drive prefixes, UNC paths, NUL/control characters, alternate separators, and unsafe symlink destinations.
- Preserve mapping from each diff section to exact old/new path pair.

Test duplicate sections, normalized aliases, rename collisions, quoted paths, escaped quotes/backslashes, octal UTF-8 bytes, Unicode filenames, and malicious path forms.

---

## 8. Enforce authoritative task dependencies at the public patch gate

Wave 0.4.9 loads registers but does not traverse dependencies.

Required:
1. Parse dependencies from the authoritative task register.
2. Reject missing dependency IDs and dependency cycles.
3. Enforce task status and prerequisite eligibility at the public patch-gate entry point.
4. Enforce W5 chain: W5-1 → W5-2 → W5-3 → W5-4 → W5-5 → W5-6.
5. Batch 1 allowlist membership must not override dependency eligibility.
6. Never trust caller-supplied dependency arrays, maps, allowlists, or statuses.
7. Load authoritative data from repository files and bind it to verified base SHA.
8. Return stable rejection codes for missing dependency, cycle, blocked/incomplete prerequisite, unknown task, and task outside Batch 1.

Test the actual public API for valid task, out-of-order W5 task, missing dependency, cycle, blocked prerequisite, and forged caller data. If the authoritative register lacks sufficient dependency data, do not invent it; document the gap and block authorization.

---

## 9. Eliminate path-tainted shell interpolation

Wave 0.4.9 still interpolates paths into `execSync` strings in `checkIsTracked()` and `checkIsDirty()`.

Required:
- Replace every path-tainted shell command with `spawnSync`/equivalent argument-array execution and `shell: false`.
- Set explicit cwd, encoding/buffer handling, timeout, and exit checks.
- Pass paths as discrete arguments; never concatenate untrusted paths into command strings.
- Audit all patch-gate/rollback sources for `exec`, `execSync`, shell scripts, command substitution, and path interpolation.
- Preserve literal Git path semantics and safe pathspec behavior.
- Do not use a shell as a quoting workaround.

Test filenames containing spaces, quotes, semicolons, dollar signs, backticks, parentheses, leading dashes, tabs, and Unicode. Prove they remain literal paths and cannot execute commands.

---

## 10. Mutation validator: exact finding sets and real child-process evidence

Wave 0.4.9 uses subset matching (`expectedFindings.every(...)`).

Required:
1. Compare actual and expected finding sets for exact equality.
2. Reject missing, unexpected, and duplicate findings.
3. Use a documented stable finding identity key.
4. Verify each mutation changed the intended semantic field and relevant input hash.
5. Use isolated fresh fixtures; restore and hash-check after each mutation.
6. Run clean negative controls before AND after the suite.
7. Run the actual validator as a child process for each case.
8. Capture command, cwd, timestamps, exit code, stdout/stderr, and input/output hashes.
9. Verify exact expected exit codes for clean, findings, malformed-input, and validator-error cases.
10. Ensure unrelated pre-existing findings cannot make a mutation pass.
11. CLI main must set nonzero `process.exitCode` if any scenario fails.

Test exact pass, missing finding, unexpected finding, duplicate finding, unrelated finding, no-op mutation, before/after clean baseline, and child-process exit propagation.

---

## 11. All test harnesses must propagate failures

Audit rollback, containment, CSV, mutation, authorization, diff/path, dependency, shell-safety, and synthesis harnesses.

Each CLI harness must:
- Aggregate scenario results.
- Set nonzero `process.exitCode` if any required scenario fails.
- Preserve stdout and stderr separately.
- Record command, cwd, runtime, timestamps, duration, exit code, stdout/stderr byte counts and hashes.
- Be orchestrated by a parent that checks actual child-process exit codes.
- Label raw process logs separately from generated summaries.
- Declare and verify expected nonzero exit codes for intentional negative tests.

Run at least one deliberate failing scenario per harness class to prove nonzero process exit, then restore/hash-check fixtures. Printed “All pass” text or returned arrays are not proof of process success.

---

## 12. Synthesis generator must be evidence-derived and fail-closed

Wave 0.4.9's generator accepts caller-supplied manifests, uses truthy byte-count checks, lacks complete artifact verification, and the builder hardcodes READY.

Required:
1. Load authoritative manifest from the designated repository file; do not accept caller-supplied manifest as source of truth.
2. Validate every artifact/log by stable ID and repository-relative path.
3. Require exact SHA-256 and byte count, including expected byte count zero.
4. Reject missing, duplicate, unindexed, unexpected, corrupt, and path-mismatched artifacts.
5. Verify embedded source content and raw log bytes against recorded hashes/lengths.
6. Verify every declared raw log is genuinely captured from a child process, not a generated summary.
7. Check expected test/scenario IDs, baseline identities, and count totals from authoritative inventories.
8. Validate initial/final Git state and accurately represent dirty state.
9. Derive verdicts from machine-checked evidence and mandatory gates. Never hardcode READY/PASS/closure.
10. Missing, contradictory, stale, malformed, or unverifiable evidence must yield NOT READY.
11. Add a real CLI and synthesis test harness with nonzero exit on invalid evidence.
12. Test clean generation, missing artifact, wrong hash/bytes, zero-byte artifact, duplicate ID/path, unindexed/unexpected artifact, malformed log, wrong exit, stale base SHA, dirty-state contradiction, and deterministic repeat generation.
13. Run generation twice and prove byte-identical output, eliminating nondeterministic fields where possible.

---

## 13. Repair complete artifact manifest and provenance mismatch

Wave 0.4.9 Section 37 has only nine manifest records despite claiming 176 artifacts. Its ninth record labels `test-rollback.cjs` but carries the component provenance log's hash/byte count.

Required:
- Reconstruct inventory from actual files and embedded sections.
- Include every artifact and raw log as one explicit record.
- Each record must have unique stable ID, exact path/name, type, source classification, SHA-256, byte count, and provenance.
- Correct `test-rollback.cjs` record and create a distinct component provenance log record.
- Enforce one-to-one correspondence between manifest entries and embedded content.
- Reject duplicate IDs/paths, missing content, mismatched labels, wrong lengths/hashes.
- Include manifest integrity using a documented non-recursive strategy (e.g. detached manifest digest in package index).
- Recompute and independently verify all hashes/lengths after package assembly.

Do not claim all 176 records verified unless the complete inventory and verification output are included.

---

## 14. Required execution evidence

### Frozen baseline
Run the nine frozen baseline runners three times each:
- 27 actual child-process executions.
- 187 unique expected identities per sweep.
- 561 cumulative outcomes.

For every run capture runner ID, exact command, cwd, timestamps/duration, exit code, source hash before/after, expected/actual unique check IDs, PASS/FAIL/SKIP/UNVERIFIED counts, raw stdout and stderr separately, byte counts/hashes, and runtime versions.

Do not count repeated outcomes as unique tests. Derive identity counts from authoritative inventory, not hardcoded constants. Prove frozen runner hashes unchanged; if baseline hashes are unavailable/contradictory, state that and do not claim integrity.

### Wave 0.4.10 suites
Capture process-level evidence for authorization, rollback, containment, CSV and register loading, diff/path parsing, dependency eligibility, shell safety, mutation validation, synthesis/integrity, and API-surface/public-hook tests.

Each suite must include raw process metadata and stdout/stderr. Summaries supplement but never replace raw logs.

---

## 15. Mandatory single-file deliverable

Create exactly one primary deliverable:

`WAVE_0_4_10_SINGLE_FILE_PRE_BATCH_1_EVIDENCE_PACKAGE.md`

It must be a self-contained Markdown file with numbered sections and embedded source/evidence. Do not deliver a folder of separate reports as the primary result.

Include at minimum:
1. Executive summary and verdict.
2. Scope/boundaries and explicit Batch 1 decision.
3. Initial Git state captured before modifications.
4. Final Git state and path-by-path attribution.
5. Environment/runtime/dependencies and installation actions.
6. Authoritative baseline and provenance.
7. Complete artifact manifest.
8. Full patch-gate source.
9. Full rollback source.
10. Full CSV parser and production caller source.
11. Full diff/path parser source.
12. Full dependency/eligibility enforcement source.
13. Full synthesis generator and CLI source.
14. Full test harness sources.
15. Exact expected outcomes and all relevant tests.
16. P0-01 coordinator rollback evidence.
17. P0-02 public-hook removal evidence.
18. Rollback preflight/Phase B/recovery evidence.
19. Strict CSV production-path evidence.
20. Duplicate/path/rename/quoted-path evidence.
21. Dependency graph/cycle/order evidence.
22. Shell-safe Git invocation evidence.
23. Exact-set mutation evidence.
24. Child-process exit propagation evidence.
25. Synthesis fail-closed/determinism evidence.
26. Complete 27-execution baseline raw evidence.
27. Complete Wave 0.4.10 raw process logs.
28. Frozen runner hash comparison.
29. Component provenance evidence if inspected.
30. Closure matrix mapping every Wave 0.4.9 finding to source, tests, logs, outcome.
31. Residual risks and explicit limitations.
32. Final authorization recommendation.

Embed complete source and raw evidence. Do not replace source with excerpts, hashes, or prose. If size constraints prevent full embedding, list exactly what is missing and return NOT READY. Use stable artifact IDs and anchors for traceability.

---

## 16. Final verdict rules

Choose exactly one:
- `READY FOR INDEPENDENT AUTHORIZATION REVIEW`
- `NOT READY — REMEDIATION INCOMPLETE`
- `NOT READY — EVIDENCE INSUFFICIENT`

The package MUST state:

**Batch 1 dispatch authorized: NO**

READY is permissible only if both P0 findings and all mandatory P1 findings are closed and adversarially tested; every harness propagates failures through real process exit codes; evidence is complete, self-consistent, hash-verified and reproducible; initial Git state is accurately represented; manifest is complete; generator is evidence-derived/fail-closed; and no prohibited action or unsupported claim remains.

If genuine coordinator identity cannot be established, state coordinator-only rollback is unsupported and choose NOT READY. Do not simulate or invent an identity provider.

If evidence is absent, contradictory, summary-only, manually fabricated, or unreproducible, choose `NOT READY — EVIDENCE INSUFFICIENT`.

---

## 17. Final response to the user

After work, report:
1. Concise changes made.
2. Exact verdict.
3. Confirmation Batch 1 was not dispatched.
4. Branch and HEAD.
5. Initial/final Git status summaries.
6. Baseline and Wave 0.4.10 execution counts, failures/skips/unverified.
7. Exact package path, byte count, and SHA-256.
8. Unresolved findings/limitations.

Independently inspect the final package, recompute its hash/byte count, verify its section inventory, and cross-check the embedded manifest against actual embedded content. Do not trust the builder's own success message.

**Begin by reading the complete Wave 0.4.9 package and capturing the initial repository state. Do not dispatch Batch 1.**
