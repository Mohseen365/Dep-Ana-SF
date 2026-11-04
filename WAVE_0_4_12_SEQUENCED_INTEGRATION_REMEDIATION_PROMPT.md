# WAVE 0.4.12 — SEQUENCED INTEGRATION, SECURITY REMEDIATION & EVIDENCE-CLOSURE PROMPT

## Mission and authorization boundary

Perform a controlled integration and remediation pass on the Dependency Analyzer Wave 0 tooling. The required order is:

1. Recover and verify the actual Wave 0.4.9 output/source, then integrate its verified changes.
2. Reconcile Wave 0.4.10 against the integrated Wave 0.4.9 state using three-way comparisons.
3. Integrate and verify Wave 0.4.11 on top of the reconciled 0.4.10 state.
4. Close the remaining defects identified in the independent review of `WAVE_0_4_11_SEQUENCED_INTEGRATION_EVIDENCE_PACKAGE.md`.
5. Produce one self-contained Markdown evidence package.

**This is NOT Batch 1 authorization. `BATCH 1 DISPATCH AUTHORIZED: NO`.**

## Absolute prohibitions

- Do not dispatch Batch 1 or launch feature agents.
- Do not implement Wave 5–9 product features.
- Do not modify Salesforce application components, Apex, LWC, metadata, or runtime behavior except for narrowly scoped Wave 0 tooling integration defects.
- Do not log in to, deploy to, or mutate a Salesforce org.
- Do not create branches, commits, tags, or push.
- Do not stage files or perform destructive Git operations (`reset`, `clean`, `checkout` against working files, `restore`, or equivalent).
- Do not overwrite/delete prior-wave evidence.
- Do not modify the nine frozen baseline runners.
- Do not claim the working tree is clean without raw Git evidence.
- Do not treat prior Jules verdicts, closure matrices, summaries, or self-generated manifests as independent proof.
- Do not fabricate missing 0.4.9/0.4.10 source. If source is unavailable, mark that integration stage NOT VERIFIABLE.

Create new Wave 0.4.12 tooling/evidence only in an isolated `docs/wave-0/4.12/` area plus the single required final package. Preserve existing files and user/Jules changes.

Use Node.js built-ins and existing offline tooling where possible. Check dependencies before installing anything. Install only genuinely required dependencies, record exact commands/versions/results, and do not install Salesforce CLI or org dependencies.

---

## 1. Initial repository state — capture before edits

Before creating or modifying any file, capture verbatim output of:

```bash
pwd
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --porcelain=v2 --branch
git diff --no-ext-diff --binary
git diff --cached --no-ext-diff --binary
git ls-files --others --exclude-standard
git diff --stat
git diff --cached --stat
```

Record path-by-path pre-existing dirty/untracked files, hashes/byte counts of prior-wave source inputs, and SHA-256 hashes of all nine frozen baseline runners. Do not clean, stage, reset, switch, or discard anything. If the initial tree is dirty, preserve it and report it as dirty.

At completion, capture the same commands and explain every changed path. Separate pre-existing dirt from Wave 0.4.12 changes. No commits or staging.

## 2. Mandatory sequential integration

Use actual prior-wave outputs and repository files already available. Do not ask for files already in the workspace.

### Stage A — Wave 0.4.9

- Recover the actual 0.4.9 output and every source file it produced.
- For every artifact record path, SHA-256, byte count, provenance, and current repository counterpart.
- Classify each as: identical/already integrated; integrated with later changes; missing/not integrated; conflicting; unavailable/unverifiable.
- Integrate only verified missing changes. Preserve valid later changes; do not overwrite later files with an earlier snapshot.
- Record exact diffs and merge rationale.

Declare `WAVE_0_4_9_INTEGRATED_VERIFIED` only when every required artifact has a documented disposition and required source changes are present. Otherwise mark NOT VERIFIABLE.

### Stage B — Wave 0.4.10 reconciliation on top of 0.4.9

For every overlapping file, compare:
1. exact Wave 0.4.9 source;
2. exact Wave 0.4.10 source;
3. current repository source after Stage A.

Identify inherited changes, 0.4.10 additions, regressions, conflicts, and missing files. Port/reconcile only supported changes. Record rejected changes and rationale. Do not copy the 0.4.10 snapshot wholesale over 0.4.9.

Declare `WAVE_0_4_10_RECONCILED_ON_0_4_9_VERIFIED` only when all relevant overlaps have a documented three-way disposition.

### Stage C — Wave 0.4.11 integration

Compare current source against the exact source embedded in the 0.4.11 package. Determine which files are identical, partial, absent, or conflicting. Integrate verified missing changes on top of Stage B. Preserve valid earlier changes. Provide per-file hashes and diff summaries.

If any prior-wave source is missing, do not silently reconstruct it. Mark the affected stage NOT VERIFIABLE and clearly separate independent remediation that can safely proceed.

The submitted 0.4.11 package reports branch `jules-1581901653157623122-2446219f`, HEAD `8d8d24e8a6755ffbf20a1252e2fd0808c7123763`, 32 sections, 114 manifest records, 9 baseline runners, 187 checks per sweep, 3 sweeps, 102 raw-log artifacts claimed, and Batch 1 NO. Treat all as claims to verify.

---

## 3. Remediation findings and required outcomes

Verify each finding against the integrated live source before editing. If already fixed, provide direct reproducible evidence rather than redundant changes.

### P0 — Coordinator authorization boundary

The 0.4.11 export list omits the public coordinator patch function, but the exported `enforceAuthoritativeTaskOwnership()` helper still accepts caller-supplied `isCoordinatorCall`.

Required:
- No caller-controlled boolean, task ID, provenance field, environment variable, or public argument may confer coordinator privilege.
- Public feature patch APIs cannot modify coordinator-exclusive paths.
- Public rollback rejects coordinator-exclusive paths and coordinator-owned provenance.
- No privileged coordinator patch/rollback route unless a genuine trusted capability boundary exists outside caller-controlled inputs.
- If no genuine trusted identity/capability mechanism exists, coordinator-exclusive patching/rollback remains unsupported and fails closed.
- Audit all exports and call paths, not just function signatures. Prefer keeping privilege-sensitive helpers private.

Adversarial tests must use actual public APIs, valid base SHA, and valid authoritative fixtures. Prove:
1. feature caller cannot modify coordinator-exclusive path;
2. `isCoordinatorCall:true` or equivalent cannot elevate privilege;
3. forged `INT-1`, task ownership, or provenance cannot elevate privilege;
4. public rollback cannot restore coordinator-exclusive paths;
5. a valid eligible feature task/path still works.

Tests must fail for the intended authorization reason, not an earlier base-SHA mismatch or unrelated error.

### P1 — Rollback Phase A/Phase B race and metadata integrity

Inspect full `pathSafeRollback()` and callers.

Required:
- Phase A validates all targets before any mutation.
- Require valid pre/post existence metadata.
- Require mode metadata wherever restoration depends on it; missing required mode fails closed.
- Validate restore payload type, base64, exact byte length, and SHA-256.
- Immediately before each Phase B mutation revalidate containment/parent, symlink/directory status, expected existence, post-apply hash, and post-apply mode.
- If `post.exists === false`, a file created before Phase B must cause rejection without overwrite/deletion.
- If `post.exists === true`, deletion/replacement before Phase B must cause rejection.
- Detect mode-only races.
- A multi-target invalid payload or preflight failure must cause zero target mutations.
- Safely clean temporary files; never overwrite a concurrent user file.
- Describe residual filesystem TOCTOU limits accurately; do not claim impossible guarantees.

Use private test-only instrumentation in isolated fixtures, never public production hooks. Test:
1. file created between phases when post.exists=false;
2. file changed/replaced when post.exists=true;
3. file deleted when post.exists=true;
4. mode changed between phases;
5. missing pre.mode;
6. missing post.mode where required;
7. corrupt second payload in multi-target rollback, proving zero first-target mutation;
8. zero-byte original file;
9. symlink/parent replacement containment;
10. successful multi-target restore with exact hashes/modes.

Invoke the actual exported rollback API.

### P1 — Strict CRLF in the actual production register loader

In 0.4.11, `parseCsvStrict()` enables strict CRLF only when `options.strictCrlf === true`; ordinary `loadAuthoritativeRegisters(repoRoot)` calls omit it.

Required:
- Authoritative production loader enforces strict CRLF by default for task register, ownership manifest, and Batch 1 allowlist.
- Callers cannot silently downgrade authoritative parsing.
- Any normalized mode for non-authoritative inputs must be separate and explicit.
- Reject bare LF and bare CR; accept CRLF.
- No silent normalization or split-based fallback.

Call the normal public/default `loadAuthoritativeRegisters()` path in tests:
1. LF task register rejected;
2. bare-CR task register rejected;
3. valid CRLF task register accepted;
4. LF ownership manifest rejected;
5. LF Batch 1 allowlist rejected;
6. complete valid fixture accepted;
7. duplicate headers, task IDs, normalized manifest paths, and malformed column counts rejected.

Parser-only tests with `{strictCrlf:true}` do NOT satisfy this requirement.

### P1 — Dependency completion and eligibility

0.4.11 detects cycles/missing IDs and checks current W5 task status, but does not prove predecessors have completed.

Required:
- Load dependencies and statuses from authoritative register.
- Validate all transitive IDs and detect cycles.
- Require every prerequisite to have an explicitly approved completed status before dependent task eligibility.
- Define accepted completion values from actual register vocabulary; do not invent statuses.
- Enforce actual W5 predecessor sequence: `W5-1 → W5-2 → W5-3 → W5-4 → W5-5 → W5-6`.
- Changing a dependent task's own status cannot bypass incomplete prerequisites.
- Enforce Batch 1 allowlist membership where required.
- Fail closed on missing, ambiguous, duplicate, or unknown status data.
- Validate all dependencies, not just W5.

Public-gate tests with valid base SHA:
1. W5-1 eligible only under actual authoritative ready status;
2. W5-2 blocked until W5-1 completed;
3. W5-2 allowed only after W5-1 completed and W5-2 itself eligible;
4. test a later W5 edge;
5. changing W5-2 own status cannot bypass W5-1;
6. non-W5 dependent blocked until prerequisite completed;
7. cycle rejected;
8. missing dependency rejected;
9. duplicate task ID rejected;
10. task absent from Batch 1 rejected;
11. all status mutation cases exercise actual public gate using isolated fixture copies.

Do not alter canonical registers to make tests pass.

### P1 — Authoritative fail-closed evidence synthesis

0.4.11 synthesis accepts caller-selected manifest, conditionally checks hashes, accepts weak `ACTUAL:` log markers, and does not prove inventory completeness.

Required:
- Normal CLI loads one canonical manifest from a fixed documented location in Wave 0.4.12 evidence.
- Normal verification path cannot substitute arbitrary caller-provided manifest.
- Every artifact/log has mandatory valid SHA-256 and mandatory byte count. Handle zero bytes without truthiness checks.
- Reject missing, malformed, duplicate, unindexed, extra, corrupt, traversal, symlink escape, or ambiguous entries.
- Validate both directions: every manifest entry maps to exactly one file and every file in the inventory is represented exactly once.
- Validate unique scenario IDs and complete expected scenario coverage.
- Distinguish actual child-process logs from in-process summaries. `ACTUAL:` alone is never sufficient.
- Raw process records must include exact command/argv, working directory, run identity/timestamps, process exit code, stdout, stderr, scenario/runner identity, and runtime/tool version as applicable.
- Preserve exact raw bytes or losslessly encode them.
- Each of the 27 baseline child-process executions needs its own raw execution record.
- Verdict is derived from verified inputs, never hardcoded.
- Demonstrate byte-identical deterministic output from two independent runs.
- Missing/altered required file causes nonzero CLI exit and NOT_READY.
- Avoid requiring generated synthesis output as its own input.

Test real CLI and real directories, not only in-memory manifests:
1. valid complete manifest;
2. missing artifact;
3. missing log;
4. absent SHA;
5. absent byte count;
6. wrong hash;
7. wrong byte count;
8. duplicate ID/path/scenario;
9. unindexed file;
10. traversal/symlink escape;
11. summary-only `ACTUAL:` log;
12. missing command/exit code;
13. missing baseline execution record;
14. deterministic two-run output;
15. nonzero CLI exit on every failure.

### P1 — Genuine raw process evidence and complete inventory

- Distinguish raw child-process logs from summaries.
- Execute suites as child processes and capture real exit codes/stdout/stderr.
- Embed all 27 baseline execution records individually.
- Preserve 187 unique check identities per sweep and explain identity derivation. 561 cumulative outcomes are not 561 unique tests.
- Embed full source for every harness, validator, parser, patch gate, rollback helper, synthesis CLI, package builder, and fixture generator.
- Include exact hashes/byte counts for every embedded artifact.
- Include every required raw record in manifest.
- Manifest count must equal actual embedded artifact/log block count; independently verify one-to-one mapping.
- Short in-process `recordResult()` output is not a raw child-process log.
- Do not omit package builder or CLI source.
- Preserve stdout/stderr and exit code for negative tests too.

### P1 — Exact mutation validator

- Compare exact finding multisets, not Sets that collapse duplicates.
- Detect missing, unexpected, duplicated, and malformed finding IDs.
- Prove each mutation actually changes intended fixture before validation.
- Run clean negative controls before and after mutations.
- Run validator/harness as child processes and capture actual exit codes.
- Test duplicate expected IDs, duplicate actual IDs, unexpected/missing IDs, and clean-baseline false positives.
- Verify all 20 semantic mutations individually.

---

## 4. Frozen baseline and invariants

Do not modify the nine frozen baseline runners. Expected per-sweep counts:

| Runner | Checks |
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
| **Total** | **187** |

Execute each runner three times as separate child processes: 27 executions. Record every raw log and actual exit code. Verify 187 unique check identities per sweep; report duplicates/missing IDs. Verify all nine runner hashes before/after. Expected 561 is cumulative check outcomes, not unique tests. Never alter test expectations to obtain a pass.

Preserve and verify:
- authoritative task register: 21 tasks;
- ownership manifest: 175 paths (99 existing + 76 planned);
- Batch 1 scope: 11 task IDs / 49 path rows;
- W5 serialization chain;
- coordinator-exclusive and frozen paths;
- migration invariants:
  - `SELECTION ≠ NAVIGATION`;
  - user-scoped preferences;
  - project-scoped preset isolation;
  - `Positions_JSON__c` manual node positions;
  - `Zoom_Pan_JSON__c` viewport zoom/pan;
  - annotation resilience across graph updates;
  - Cytoscape teardown/resource cleanup;
  - stale async responses cannot overwrite newer requests;
  - chunk-size/UTF-8/surrogate-pair boundary safety;
  - shared graph payload immutability.

Do not change canonical registers, ownership manifest, or allowlist to manufacture eligibility or alter task scope.

## 5. Verification requirements

Run:
- all nine baseline runners three times;
- all remediation/security suites;
- public API authorization tests;
- rollback race tests;
- production-loader CRLF tests;
- dependency status/eligibility tests;
- synthesis CLI positive/negative tests;
- exact mutation tests;
- path parser, rename, duplicate-path, symlink, containment tests;
- shell-safe Git argument tests;
- two independent synthesis generations;
- independent package manifest/hash/byte-count verification.

If any test cannot run, provide exact command and actual output, explain why, and mark UNVERIFIED/BLOCKED. Do not substitute static inspection for runtime verification. Do not claim browser E2E, Salesforce Apex/LWC tests, org deployment, or live Salesforce acceptance.

## 6. One consolidated Markdown deliverable

Create exactly one primary package:

`WAVE_0_4_12_SEQUENCED_INTEGRATION_REMEDIATION_EVIDENCE_PACKAGE.md`

Place it in repository root unless conventions require a documented alternative. It must be self-contained and include full source and raw logs, not snippets or references to omitted files.

Required sections:

1. Executive summary/verdict.
2. Scope and Batch 1 prohibition.
3. Initial Git state (verbatim raw output).
4. Prior-wave source inventory/provenance.
5. Wave 0.4.9 file-by-file integration matrix.
6. Wave 0.4.9 integration decision.
7. Wave 0.4.10 three-way reconciliation matrix.
8. Wave 0.4.10 reconciliation decision.
9. Wave 0.4.11 integration matrix.
10. Runtime/toolchain/dependency inventory.
11. Path-by-path changes and rationale.
12. Coordinator authorization source/tests.
13. Rollback implementation/race evidence.
14. Strict CSV parser and production loader source/tests.
15. Dependency eligibility implementation/tests.
16. Synthesis generator/CLI source/tests.
17. Exact mutation validator source/tests.
18. Baseline execution matrix (27 records).
19. All genuine raw child-process logs, stdout/stderr/exit.
20. Remediation test results including negative tests.
21. Frozen runner before/after hashes.
22. Complete artifact/log manifest with mandatory SHA-256 and byte counts.
23. Independent manifest self-check output.
24. Final Git state (verbatim raw output and path attribution).
25. Residual risks/unverified items.
26. 0.4.9/0.4.10/0.4.11 integration closure matrix.
27. Final recommendation and explicit Batch 1 NO.

Every embedded artifact: stable ID, exact repo-relative path, type, SHA-256, byte count, full content.
Every process record: stable execution ID, runner/test ID, exact command/argv, working directory, run identity/times, exit code, stdout, stderr, SHA-256, byte count.

Embed package builder and synthesis CLI source and include them in manifest. Ensure manifest count exactly matches embedded artifact/log blocks. Do not claim self-contained if anything required is omitted.

## 7. Verdict vocabulary and stop condition

Choose exactly one:
- `READY FOR INDEPENDENT AUTHORIZATION REVIEW`
- `NOT READY — REMEDIATION INCOMPLETE`
- `NOT READY — EVIDENCE INSUFFICIENT`

READY means only ready for a separate independent review. It does not authorize implementation or dispatch.

If prior-wave source is missing, any integration stage is unverifiable, any P0/P1 fix fails, a baseline runner changes, manifest checks fail, raw execution evidence is missing, or Git-state claims cannot be verified, verdict must be NOT READY.

The package must state verbatim:

**BATCH 1 DISPATCH AUTHORIZED: NO**

Do not ask for authorization to launch Batch 1. Stop after producing the evidence package.

## 8. Jules final response

Report:
1. exact package path;
2. SHA-256 and byte count;
3. actual branch and HEAD;
4. actual initial/final Git status (clean/dirty);
5. Wave 0.4.9 integration verified or not;
6. Wave 0.4.10 reconciliation verified or not;
7. Wave 0.4.11 integration verified or not;
8. baseline execution count and pass/fail/skip totals;
9. remediation pass/fail/blocked totals;
10. missing/unavailable inputs;
11. exact final verdict;
12. `BATCH 1 DISPATCH AUTHORIZED: NO`.
