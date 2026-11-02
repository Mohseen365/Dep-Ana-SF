# JULES DISPATCH PROMPT — WAVE 0.4.8
## Security-Critical Remediation, Real Integration Tests, and Self-Contained Evidence Closure

**Execution mode:** Verification and tooling remediation only  
**Primary objective:** Correct the independently identified Wave 0.4.7 defects and produce one fully self-contained, independently auditable Markdown evidence package.  
**Implementation authorization:** **NOT GRANTED**  
**Batch 1 dispatch:** **PROHIBITED**

---

## 1. Mission and mandatory outcome

Execute Wave 0.4.8 as a tightly scoped remediation of the specific defects recorded in the independent Wave 0.4.7 audit.

Your job is not to implement Dependency Analyzer features. Your job is to make the dispatch-control, patch-application, rollback, evidence-validation, and audit-reproduction mechanisms trustworthy enough for a *separate independent authorization review*.

The final deliverable must be exactly one canonical Markdown file:

`WAVE_0_4_8_SINGLE_FILE_REMEDIATION_EVIDENCE_PACKAGE.md`

It must contain the full contents of every artifact needed to understand and reproduce the work, including source code, registers, test harnesses, raw execution logs, hashes, and findings. The package must not depend on a second report, an unembedded source file, an external log directory, or a repository checkout to understand the evidence. If exact reproduction requires a repository, provide all relevant source inputs in the package and document the repository-dependent steps precisely.

Allowed final verdicts:

1. `READY FOR INDEPENDENT AUTHORIZATION REVIEW`
2. `NOT READY — REMEDIATION INCOMPLETE`
3. `NOT READY — EVIDENCE INSUFFICIENT`

You must always state:

`Batch 1 dispatch authorized: NO`

Even a successful Wave 0.4.8 run does **not** authorize Batch 1. Only a separate independent review may consider authorization.

---

## 2. Strict scope and safety boundaries

### Allowed

- Inspect Wave 0.4.7 artifacts and current repository state.
- Create or modify Wave 0.4.8-specific verification tooling and documentation under a dedicated directory such as `docs/wave-0/4.8/`.
- Modify the dispatch patch gate, rollback implementation, and related verification code only if those are explicitly Wave 0 dispatch-control tooling—not Dependency Analyzer product code—and only after recording exact paths, starting hashes, and reasons.
- Add focused automated tests and test fixtures for the defects listed in this prompt.
- Install missing test dependencies only when genuinely required and feasible. Prefer existing dependencies and offline caches. Do not change production dependency manifests or lockfiles. Record package name, exact version, source/cache, command, result, and all files changed. If installation is impossible, report the blocker and use a clearly labelled alternative; do not claim equivalent coverage without evidence.
- Generate one consolidated Markdown package containing all required evidence.

### Prohibited

- No Dependency Analyzer feature implementation.
- No React, TypeScript, LWC, Apex, Salesforce metadata, or production UI/business-logic changes.
- No Salesforce org authentication, deployment, data mutation, or org operations.
- No Batch 1 dispatch, feature-agent launch, task execution, or implementation work.
- No branch creation, commit, cherry-pick, merge, reset, clean, checkout, stash, or destructive Git operation.
- Do not modify the nine frozen baseline test runners.
- Do not modify or delete pre-existing user changes.
- Do not overwrite, normalize, or “clean up” unrelated dirty files.
- Do not silently replace Wave 0.4.7 evidence with newly generated summaries.
- Do not report a test as PASS merely because an exception occurred or because a status string was assigned manually.

If a required remediation cannot be safely performed within these boundaries, stop that subtask, preserve state, and report it as unresolved.

---

## 3. Initial repository and environment preservation

Before editing anything, capture and embed:

1. Current working directory.
2. Branch name and exact HEAD SHA.
3. `git status --short --branch`.
4. Full tracked and untracked changed-path inventory.
5. `git diff --stat`, `git diff --name-status`, and untracked path listing.
6. Node, npm, Python, Git, and relevant test-tool versions.
7. Exact hashes and byte counts of all Wave 0.4.7 source inputs used.
8. Whether the repository is shallow.
9. Timestamp and timezone for each capture.

Do not assume the working tree is clean. Wave 0.4.7 claimed a clean start, but the current state must be measured independently.

Preserve all pre-existing dirty paths byte-for-byte. Record a baseline manifest of their hashes. At the end, compare the same paths and prove that no pre-existing content was changed. If any pre-existing path changes unexpectedly, stop and report the exact path and before/after hashes.

Capture final Git state and all Wave 0.4.8-created/modified paths. No commit is permitted.

---

## 4. P0 remediation A — eliminate caller-controlled authorization bypass

### Wave 0.4.7 defect

The Wave 0.4.7 patch gate allowed callers to supply `trustedRole` and `batch1Enforce`. A caller could attempt to claim the coordinator role and/or disable Batch 1 enforcement. The coordinator check relied on caller-provided role and weak task/owner string matching. The `INT-1` coordinator task made the spoofing scenario especially important.

### Required security properties

1. Authorization must be derived from trusted execution context controlled by the gate, not from untrusted function arguments.
2. Public patch-application entry points must not accept caller-controlled role, owner, allowlist-enforcement, or equivalent authorization bypass flags.
3. Batch 1 allowlist enforcement must be unconditional for feature-task patch application. No caller option may disable it.
4. Coordinator-only actions must use a separate, explicitly constrained entry point or a trusted capability that cannot be forged by passing a string such as `"coordinator"`.
5. The gate must load the authoritative task register, ownership manifest, Batch 1 allowlist, and dependency/status data from fixed, validated sources. It must not trust caller-supplied ownership arrays or task metadata.
6. The gate must reject:
   - a feature agent attempting to use `INT-1`;
   - a feature agent claiming `trustedRole: "coordinator"`;
   - a caller attempting `batch1Enforce: false`;
   - a caller supplying a fake owner or modified task register;
   - a task outside Batch 1;
   - a task whose dependencies/status do not permit dispatch;
   - a task/path pair not owned by that task;
   - duplicate or aliased paths;
   - a stale base SHA;
   - a patch touching any unauthorized source or destination path.
7. The gate must fail closed if any authoritative register is missing, malformed, duplicated, ambiguous, or inconsistent.
8. Coordinator integration work must not become an implicit universal bypass. If coordinator patch application is necessary, define a separate narrow policy with explicit allowed task IDs and exact paths, and test it independently.

### Required tests

Test through the actual public patch-application entry point, not only private helper functions.

At minimum include:
- `AUTH-01`: feature task cannot claim coordinator role.
- `AUTH-02`: feature task cannot use `INT-1`.
- `AUTH-03`: caller cannot disable Batch 1 enforcement.
- `AUTH-04`: caller-supplied owner metadata is ignored/rejected.
- `AUTH-05`: caller-supplied allowlist/register is ignored/rejected.
- `AUTH-06`: non-Batch-1 task is rejected even when caller passes legacy bypass-shaped options.
- `AUTH-07`: task with unmet dependency/status is rejected.
- `AUTH-08`: wrong task/path ownership is rejected.
- `AUTH-09`: malformed or duplicate authoritative register entries fail closed.
- `AUTH-10`: a legitimate Batch 1 task with the exact authorized path can pass the authorization layer.
- `AUTH-11`: coordinator-only path is accepted only through the explicitly designed coordinator route, if one is retained.
- `AUTH-12`: stale base is rejected by the public entry point.

For every negative test assert:
- the exact expected error code/type;
- no target file changed;
- no unauthorized file was created/deleted;
- Git status and relevant hashes are unchanged.

Do not count an arbitrary thrown exception as a successful rejection.

If the codebase cannot provide a cryptographically or operationally trusted caller identity, state that limitation explicitly. Do not pretend a JavaScript string argument is authentication. Prefer eliminating caller-selectable role entirely and making the gate's policy determine allowed operations.

---

## 5. P0 remediation B — make rollback data-loss safe

### Wave 0.4.7 defects

Rollback failed to reject files that appeared after patch application when the recorded post-state said they should not exist. It could overwrite/delete post-apply user changes. It also validated restore payloads during sequential mutation rather than preflighting every target, risking partial rollback. Original file modes were not restored, and UTF-8 string storage could corrupt arbitrary binary content.

### Required rollback design

Implement a two-phase rollback with a complete preflight before the first mutation.

**Phase A — read-only preflight**

For every target path, validate all of the following before any write/delete occurs:

1. Path is normalized, unique, inside the permitted root, and not a directory.
2. No symlink exists in any path component; resolve and validate containment.
3. Recorded pre-state and post-state records are present and structurally valid.
4. Current filesystem state exactly matches the recorded post-apply state:
   - If post-state says the file exists, it must exist and match the exact post-apply content hash and mode.
   - If post-state says the file does not exist, it must still not exist. If it now exists, reject rollback and preserve it.
5. Restore payload exists whenever pre-state says the file existed.
6. Restore payload type, encoding, byte length, content hash, and mode are valid.
7. Binary content is preserved byte-for-byte. Do not serialize arbitrary bytes through lossy UTF-8 text. Use a reversible representation such as base64 with explicit encoding metadata, or another verified byte-preserving format.
8. All target paths are checked for duplicates, aliases, case-fold collisions where relevant, parent/child conflicts, and path traversal.
9. All parent directories and target states are validated before mutation.
10. The complete operation plan is constructed and hashed.

If any preflight check fails, rollback must perform **zero mutations**. Prove this with before/after hashes and Git state.

**Phase B — guarded restoration**

Only after all Phase A checks succeed:
- Restore original content byte-for-byte.
- Restore original file mode/permissions where supported.
- Remove files created by the patch only if they remain exactly in the recorded post-apply state.
- Use safe temporary files and atomic replacement where feasible.
- Re-check target state immediately before mutation to narrow race windows.
- Record each operation and resulting hash/mode.
- If an error occurs after mutation begins, do not claim atomic rollback. Provide a documented recovery plan and identify exactly which paths were restored and which were not.

### Concurrency and TOCTOU

Do not claim race safety based solely on `lstat`/`realpath` checks followed by later path-based writes. Either:
- use platform-supported descriptor-relative/no-follow operations that close the race; or
- explicitly document that complete race-free guarantees are unavailable in the runtime, implement best-effort revalidation, and classify the residual race as an unresolved limitation.

Never claim full TOCTOU protection without a test and mechanism that actually supports it.

### Required rollback tests

Run through the actual public rollback entry point:
- `RB-01`: normal restore of modified file.
- `RB-02`: removal of file created by patch.
- `RB-03`: reject modified post-apply file.
- `RB-04`: reject deleted post-apply file.
- `RB-05`: reject directory target.
- `RB-06`: reject symlink target.
- `RB-07`: reject symlinked parent.
- `RB-08`: reject path traversal.
- `RB-09`: reject duplicate touched path.
- `RB-10`: reject normalized/alias duplicate.
- `RB-11`: reject post-state says absent but file now exists.
- `RB-12`: reject post-state says present but file is now absent.
- `RB-13`: reject malformed pre-state.
- `RB-14`: reject malformed post-state.
- `RB-15`: reject missing/null restore payload.
- `RB-16`: reject restore payload with wrong hash.
- `RB-17`: reject invalid mode metadata.
- `RB-18`: preserve binary file bytes exactly.
- `RB-19`: restore original file mode.
- `RB-20`: all-target preflight catches a bad second target before first target changes.
- `RB-21`: a post-apply recreated file is never overwritten/deleted.
- `RB-22`: failure during guarded restoration is reported with exact partial-state inventory and recovery instructions.

Every test must invoke the real public rollback API. No test may simulate a rejection by manually assigning an outcome string or by checking a helper unrelated to rollback.

For all negative/preflight tests, assert zero mutation using exact before/after path inventories, file hashes, modes, and Git status. For positive tests, assert exact final bytes and modes.

---

## 6. P1 remediation C — repair rollback scenario harness false positive

Wave 0.4.7 `RB-12` only inspected duplicate provenance paths and never called rollback.

Replace it with a real public-entry-point integration test. Ensure every scenario:
- invokes the intended public operation;
- asserts exact result/error code;
- checks exact filesystem state;
- records process exit code from the actual child process where subprocess execution is used;
- never manually assigns a synthetic exit code;
- does not translate arbitrary exceptions into the expected rejection;
- has a unique scenario ID and a stable, explicit expected outcome.

Include a negative control proving that a legitimate rollback succeeds.

---

## 7. P1 remediation D — actual filesystem race test and honest containment claims

Wave 0.4.7 `CONT-16` created a symlink before validation; that is a static symlink test, not a TOCTOU race.

Required:
1. Separate static symlink containment tests from race tests.
2. Implement a deterministic race harness that attempts to replace a validated parent or target with a symlink between validation and mutation.
3. Use synchronization barriers/hooks rather than timing-only sleeps where possible.
4. Assert the operation does not write outside the authorized root.
5. Include a sentinel file outside the root and prove its bytes/hash remain unchanged.
6. Repeat the race test enough times to provide meaningful evidence, but do not claim that a finite test proves all races impossible.
7. If the platform/runtime cannot support a reliable race test or race-free operation, report the limitation and classify it as unresolved; do not label a static symlink test as TOCTOU.
8. Ensure patch apply and rollback use the same hardened path policy.

Required scenarios:
- `CONT-01` through `CONT-14`: retain and accurately describe the original static containment scenarios, fixing any weak assertions.
- `CONT-15`: deterministic parent-symlink replacement attempt after preflight.
- `CONT-16`: deterministic target replacement attempt after preflight.
- Each scenario must have actual operation invocation, exact expected outcome, path/hash checks, and a real process exit code if run as a subprocess.

---

## 8. P1 remediation E — exact patch path accounting, including rename/copy

Wave 0.4.7 parsed only the destination (`bPath`) from `diff --git` headers. A rename can affect both source and destination.

Required:
- Parse all paths affected by a patch, including old/source and new/destination paths.
- Handle add, delete, modify, rename, copy, quoted paths, spaces, escaped characters, and `/dev/null`.
- Validate every affected path against task ownership and containment.
- Reject ambiguous, malformed, duplicate, aliased, or unsupported patch headers.
- Fail closed on unknown diff forms.
- Add tests for:
  - authorized rename source + authorized destination;
  - unauthorized rename source;
  - unauthorized rename destination;
  - copy source and destination ownership;
  - delete source path;
  - add destination path;
  - quoted paths with spaces;
  - malformed rename metadata;
  - duplicate source/destination aliases.
- Test through actual patch-application entry point and prove no unauthorized file changes.

---

## 9. P1 remediation F — fail-closed authoritative CSV parsing

Wave 0.4.7 patch gate had a permissive fallback parser, and the embedded “strict RFC 4180” parser accepted bare CR/LF record separators.

Required:
1. Remove permissive split-based fallback. If the strict parser is unavailable, malformed, or cannot be loaded, fail closed.
2. Use a well-defined CSV parser with documented behavior, or implement and test a clearly specified grammar.
3. If claiming RFC 4180 compliance, enforce CRLF record separators and all relevant quoting/escaping rules. Otherwise describe the actual supported dialect accurately.
4. Validate required headers, exact row widths, quoting, escaped quotes, embedded CRLF in quoted fields, duplicate headers, duplicate IDs, duplicate paths, and trailing data.
5. Reject malformed input; never silently drop rows.
6. Reject duplicate authoritative task IDs and duplicate ownership entries.
7. Validate path normalization and exact owner/path semantics after parsing.
8. Add a parser conformance suite with valid and invalid fixtures.
9. Include the full parser implementation and every fixture in the consolidated evidence package.

---

## 10. P1 remediation G — mutation suite must assert exact semantics

Wave 0.4.7 mutation suite checked only whether a finding ID contained an expected substring. It lacked a clean negative control and did not prove that each mutation changed the intended semantic input. MUT-01 appended a blank CSV record and triggered parse errors rather than testing a valid extra task.

Required:
1. Start from a verified clean baseline fixture.
2. For every mutation, record:
   - mutation ID;
   - target artifact and exact field/line/row changed;
   - before and after SHA-256;
   - proof that the intended semantic value changed;
   - expected exact finding ID(s);
   - actual exact finding ID set;
   - unrelated finding IDs (must be empty unless explicitly expected);
   - validator exit code;
   - raw stdout/stderr;
   - restoration hash proving fixture returned to original bytes.
3. Assert exact finding set equality, not substring matching.
4. Assert no unrelated findings.
5. Run a clean baseline negative control before and after the mutation suite; it must produce the exact expected clean finding set and exit code.
6. Each mutation must be independently applied to a fresh copy of the clean fixture.
7. No mutation may contaminate the next test.
8. Test both valid semantic mutations and malformed-input mutations as separate categories.
9. Fix `MUT-01` to append a syntactically valid, complete task row with all required fields and valid CSV formatting; it must trigger the exact task-count/inventory finding, not CSV parse errors.
10. At minimum preserve and strengthen the original 20 mutation concepts. Add cases for:
   - caller-controlled role spoof;
   - disabling Batch 1 enforcement;
   - INT-1 coordinator spoof;
   - rollback absent→present overwrite attempt;
   - malformed rollback payload in second target;
   - rename source ownership bypass;
   - missing strict parser;
   - synthesis missing artifact;
   - synthesis hash mismatch;
   - duplicate authoritative register ID.
11. Run the full mutation suite three times from fresh fixture copies: 20+ distinct mutations × 3 runs. Report exact number; do not claim 60 valid detections unless all tests pass exact-set assertions.

---

## 11. P1 remediation H — synthesis generator must fail closed and be deterministic

Wave 0.4.7 synthesis generator merely enumerated whatever `.log` files happened to exist. It did not validate the authoritative evidence index or required artifact set. It also included its own previous output on subsequent runs, making the count non-deterministic.

Required:
1. Load an authoritative, versioned artifact/evidence manifest.
2. Define the exact expected artifact IDs, paths, types, and required evidence records.
3. Verify every required artifact exists, has the expected SHA-256 and byte count, and is embedded in the final package.
4. Verify every required log exists, has the expected SHA-256 and byte count, and has a valid execution record.
5. Reject missing, extra where disallowed, duplicate, corrupt, unindexed, or mismatched evidence.
6. Exclude the generated synthesis output and its own log from the input set.
7. Generate output deterministically from identical inputs. Two consecutive runs must produce byte-identical output or byte-identical normalized synthesis manifests, with a clear explanation if timestamps are intentionally externalized.
8. Prove determinism with two actual independent runs, hashes, byte counts, and diff output.
9. Add tests that remove an artifact, alter one byte, duplicate an ID, add an unindexed log, and corrupt a hash. Each must fail with a precise finding.
10. The generator must exit nonzero on any integrity failure. It must not generate a READY verdict from incomplete inputs.

---

## 12. P1 remediation I — reconcile artifact hashes and byte counts

Wave 0.4.7 Sections 6 and 35 recorded identical SHA-256 values with contradictory byte counts for five artifacts.

Required:
- One canonical artifact manifest must be the sole source of artifact identity, SHA-256, and byte count.
- Generate every repeated artifact reference from that manifest; do not manually retype values.
- Verify the hash and byte count against the exact embedded bytes, including a clearly documented newline policy.
- Ensure identical SHA-256 values always have identical byte counts.
- Add a validator that rejects any repeated artifact ID/path/hash with inconsistent metadata.
- Report the exact five prior discrepancies and the corrected authoritative values.
- Include the manifest and validator source in the package.

---

## 13. P1 remediation J — make the package genuinely self-contained

Wave 0.4.7 was a single Markdown file but omitted key sources needed to reproduce its claims.

The new package must embed the complete contents of all relevant inputs, including at minimum:

1. The complete Wave 0.4.8 patch gate source.
2. The complete rollback implementation source.
3. The complete strict CSV parser source.
4. The complete validator source.
5. The complete synthesis generator source.
6. Every test harness used for authorization, patch, rollback, containment, parser, mutation, and synthesis tests.
7. All fixtures and authoritative input registers/manifests.
8. The complete nine frozen baseline runner source files, or a precise immutable source snapshot with complete source contents embedded.
9. The complete `daAppShell.js` source used for the provenance claim, or withdraw the claim and mark it unverified.
10. The relevant W7/W8 contract documents and fixtures used by validation/mutation tests.
11. All raw stdout/stderr logs and machine-readable execution records.
12. All baseline identity records, per-runner counts, run records, and before/after runner hashes.
13. All filesystem state snapshots and hash manifests used for rollback/containment claims.
14. All scenario CSV/JSON records and full findings.
15. Reproduction commands, exact working directory, environment versions, and expected exit codes.

For every embedded artifact include:
- artifact ID;
- original repository path;
- artifact type;
- SHA-256 of exact embedded bytes;
- byte count of exact embedded bytes;
- encoding/newline policy;
- full content.

For every execution log include:
- log ID;
- command;
- working directory;
- timestamp with timezone;
- process exit code;
- stdout and stderr;
- SHA-256 and byte count;
- scenario/test IDs covered;
- whether it is a raw process log or a derived summary.

Do not label synthetic summaries as raw logs. Do not omit output because it is long. If the package becomes too large, still preserve the one-file requirement; do not silently split into multiple files. If platform limits prevent inclusion, report that the package is not self-contained and verdict must be `NOT READY — EVIDENCE INSUFFICIENT`.

---

## 14. Component provenance correction

Wave 0.4.7 reported zero dispatched events, while the embedded component provenance CSV still labelled inbound handlers as declared outbound events.

Required:
- Inspect the exact `daAppShell.js` source used for the audit.
- Verify the source hash, byte count, and line count independently.
- Distinguish:
  - public `@api` properties;
  - inbound event handlers/listeners;
  - outbound `dispatchEvent`/`CustomEvent` emissions;
  - proposed but unimplemented APIs.
- Do not label inbound handlers as emitted events.
- Search for all actual dispatch mechanisms, not only a simplistic literal string scan.
- Correct the provenance CSV and all references.
- If source is unavailable or source identity cannot be established, mark the provenance claim unverified.
- Embed the complete source or clearly classify it as an external, unavailable input.

---

## 15. Baseline runner integrity

The nine baseline runners are frozen. Do not edit them.

Run the nine runners three times each (27 actual executions), using the existing expected test identities and counts:

| Runner | Expected identities |
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

Rules:
- Extract actual stable test identities from runner output.
- Do not fabricate fallback identity IDs.
- If a runner emits fewer or more than expected identities, fail the baseline gate and report it.
- Record actual child-process exit code, stdout/stderr, duration, start/end timestamps, and runner source hash before/after.
- Preserve each raw process log in the package.
- Do not infer unique test identities solely from line counts or checkmark counts.
- Clearly distinguish 187 unique identities per sweep from 561 cumulative executions across three sweeps.
- If raw runner source or logs cannot be included, mark reproduction incomplete.

---

## 16. Wave 0 inventory and dispatch constraints

Preserve and verify the authoritative inventory; do not silently change task counts or path ownership.

Historical inventory to validate against actual source inputs:
- 21 task-register entries.
- 175 authoritative paths: 99 existing + 76 planned new.
- 9 traceability contracts.
- 11 Batch 1 task IDs / 49 Batch 1 path rows.
- W5 serialized chain:
  `W5-1 → W5-2 → W5-3 → W5-4 → W5-5 → W5-6`.
- W5-1 was the only immediately dispatchable W5 task in the earlier plan; later W5 tasks remain serialized.
- Aggregate runners are coordinator-exclusive.
- W7-P1 metadata exclusions and W7/W8 contracts must be preserved as specified by the authoritative register.

Recompute all counts from source data. If any inventory differs, do not “correct” it silently. Show the source row-level difference, explain whether the source of truth changed, and mark the discrepancy unresolved until reconciled.

The dispatch gate must independently enforce:
- task ID existence and uniqueness;
- exact owner;
- exact allowed paths;
- Batch 1 membership;
- dependency completion;
- status eligibility;
- base SHA;
- no forbidden/frozen/coordinator-exclusive path;
- no duplicate or aliased patch path.

---

## 17. Required execution evidence and quality rules

For every test suite and scenario:
- use unique stable IDs;
- invoke the actual public operation under test;
- assert exact expected result or error code;
- capture actual process exit code;
- capture full stdout and stderr;
- record working directory and environment;
- record start/end timestamps with timezone;
- record input/source hashes;
- record before/after filesystem and Git state where applicable;
- preserve raw logs;
- generate derived summaries separately and label them as summaries.

A test is PASS only when:
1. the intended input mutation is proven;
2. the intended public operation was invoked;
3. the exact expected result/error was observed;
4. unrelated outcomes are excluded;
5. required filesystem/hash invariants hold;
6. the process exited with the expected code.

No “PASS” from:
- arbitrary exception handling;
- manually assigned outcome strings;
- manually assigned exit codes;
- substring finding matches;
- scenario row counts alone;
- synthetic logs;
- helper-only calls when the public API is the required target.

---

## 18. Required Wave 0.4.8 test inventory

At minimum include these suites:

| Suite | Minimum |
|---|---:|
| Authorization public-entry tests | 12 |
| Rollback public-entry tests | 22 |
| Static containment tests | 14 |
| Deterministic race attempts | 2 |
| Rename/copy patch-path tests | 9 |
| Strict CSV parser conformance tests | 15 |
| Mutation cases | 20+ cases × 3 fresh runs |
| Synthesis integrity tests | 5 |
| Artifact manifest consistency tests | 5 |
| Baseline runners | 9 runners × 3 sweeps |

Do not inflate counts by splitting one logical scenario into multiple log lines. Publish both scenario counts and actual executed test identities.

---

## 19. Required single-file package structure

Create exactly one final canonical deliverable:

`WAVE_0_4_8_SINGLE_FILE_REMEDIATION_EVIDENCE_PACKAGE.md`

Use the following sections, in order:

1. Cover, scope, and mandatory no-dispatch statement.
2. Executive verdict and explicit limitations.
3. Initial environment and Git state.
4. Pre-existing dirty-state preservation manifest.
5. Wave 0.4.7 findings-to-remediation traceability matrix.
6. Source inventory and authoritative artifact manifest.
7. Authorization design and threat model.
8. Authorization implementation — complete source.
9. Authorization public-entry test plan and results.
10. Rollback design and state model.
11. Rollback implementation — complete source.
12. Rollback public-entry tests and results.
13. Filesystem containment design and threat model.
14. Containment/race implementation — complete source.
15. Static containment and race test results.
16. Patch path parser and rename/copy policy — complete source.
17. Patch application integration tests.
18. Strict CSV parser — complete source.
19. CSV conformance fixtures and results.
20. Semantic validator — complete source.
21. Mutation suite implementation — complete source.
22. Mutation case register and exact findings.
23. Mutation raw logs and three-run reconciliation.
24. Synthesis generator — complete source.
25. Synthesis integrity and determinism results.
26. Artifact hash/byte-count consistency report.
27. Component provenance source and corrected register.
28. Frozen baseline runner source inventory and hashes.
29. Baseline 27 raw execution logs.
30. Baseline identity and count reconciliation.
31. Authoritative task register, ownership manifest, traceability, Batch 1 allowlist.
32. W7/W8 contract sources and validation fixtures.
33. Complete raw execution log index and embedded logs.
34. Filesystem/Git before-after state and all hash manifests.
35. Reproduction instructions and exact commands.
36. Wave 0.4.7 discrepancy closure matrix.
37. Residual risks, unsupported guarantees, and blockers.
38. Final verdict and mandatory no-dispatch statement.

Each section must be present. If a section is not applicable, explain why; do not silently omit it.

---

## 20. Wave 0.4.7 discrepancy closure matrix

Explicitly close each prior finding:

| ID | Prior finding | Required closure evidence |
|---|---|---|
| W047-P0-01 | Caller-controlled role / Batch1 bypass | Public API tests prove no caller-selectable bypass |
| W047-P0-02 | Rollback overwrites/deletes post-apply changes | Absent→present and recreated-file tests; zero mutation on rejection |
| W047-P0-03 | Incomplete rollback preflight / partial mutation | Bad second-target test proves zero first-target mutation |
| W047-P1-01 | RB-12 did not call rollback | Actual public rollback invocation and exact assertions |
| W047-P1-02 | CONT-16 was static symlink test | Deterministic race attempt with outside sentinel |
| W047-P1-03 | Ownership tests accepted arbitrary exceptions | Exact error codes and unchanged state |
| W047-P1-04 | Mutation tests used substring findings | Exact set equality, clean negative controls |
| W047-P1-05 | Synthesis not fail-closed/deterministic | Missing/corrupt artifact rejection and two-run reproducibility |
| W047-P1-06 | Contradictory byte counts | Single manifest and hash/length validator |
| W047-P1-07 | Package not self-contained | All source inputs, fixtures, raw logs embedded |
| W047-P1-08 | Rename source omitted | Both source and destination ownership validated |
| W047-P1-09 | CSV fallback permissive | Strict parser only; malformed inputs rejected |
| W047-P1-10 | Component provenance contradiction | Correct inbound/outbound classification and embedded source |

For each row include:
- status: CLOSED / PARTIALLY CLOSED / OPEN / NOT VERIFIABLE;
- exact artifact and section;
- exact test IDs;
- evidence hashes;
- residual risk;
- reason for any non-closure.

Do not mark a finding CLOSED on the basis of a design description alone.

---

## 21. Independent self-audit before finalizing

Before producing the package, perform an adversarial review of your own work:

- Can any public API caller still spoof a role or disable policy?
- Can any patch touch an unauthorized rename source?
- Can a malformed or missing register silently fall back?
- Can rollback overwrite or delete a file that changed after patch application?
- Can a bad second target cause a partial rollback?
- Are file modes and binary bytes preserved?
- Does any containment claim exceed what the implementation/runtime guarantees?
- Do race tests actually interleave validation and mutation?
- Does every negative test assert the exact expected error?
- Are all actual process exit codes captured?
- Do mutation tests assert exact finding sets and no unrelated findings?
- Does the synthesis generator reject missing/corrupt evidence?
- Are two synthesis runs deterministic?
- Do all repeated SHA-256 values have identical byte counts?
- Are all claimed raw logs truly raw process logs?
- Is every source required for reproduction embedded?
- Are the nine frozen runner hashes unchanged?
- Are all pre-existing dirty paths unchanged?
- Does the final verdict reflect unresolved issues honestly?

If any P0 finding remains open, verdict must be `NOT READY — REMEDIATION INCOMPLETE` or `NOT READY — EVIDENCE INSUFFICIENT`.

If required source/logs are missing or claims cannot be independently reproduced, verdict must be `NOT READY — EVIDENCE INSUFFICIENT`.

Never convert a known unresolved issue into a “restriction” while still declaring the package ready.

---

## 22. Final response format

After creating the single Markdown package, respond with only:
- exact package path;
- SHA-256;
- byte count;
- counts of actual test scenarios and process executions;
- baseline result;
- number of Wave 0.4.7 findings CLOSED / PARTIALLY CLOSED / OPEN / NOT VERIFIABLE;
- final verdict;
- `Batch 1 dispatch authorized: NO`.

Do not provide a separate report or secondary artifact. Do not claim success before all evidence is captured and verified.

**End of dispatch prompt.**
