# JULES DISPATCH PROMPT — WAVE 0.4.7
## Single-File Evidence Reconciliation, Source Identity & Final Tooling Closure

**Execution mode:** Verification, evidence reconciliation, and narrowly scoped verification-tool remediation only  
**Primary deliverable:** `WAVE_0_4_7_SINGLE_FILE_EVIDENCE_PACKAGE.md`  
**Authorization outcome required:** Explicitly state whether the evidence is sufficient for a separate human authorization review  
**Batch 1 dispatch:** MUST remain **NO** throughout this wave

---

# 1. Mission

Execute Wave 0.4.7 as a rigorous, independent evidence-reconciliation and final tooling-closure exercise for the Dependency Analyzer React/TypeScript → Salesforce LWC/Apex migration.

Wave 0.4.6 reported `READY_WITH_EXPLICIT_RESTRICTIONS`, but the independent review found material inconsistencies and missing primary evidence. Wave 0.4.7 must resolve those gaps using repository source, actual execution, raw evidence, reproducible hashes, and strict cross-document reconciliation.

The central requirement is that **all deliverables must be consolidated into ONE self-contained Markdown file**, with multiple logical files represented as clearly separated sections inside that file.

Do not deliver a collection of separate Markdown/CSV reports as the final package. You may create temporary scripts, logs, CSVs, JSON, and other working artifacts during execution where necessary. However, the final canonical evidence package must contain the complete contents of every required report, register, manifest, scenario matrix, hash table, and raw log in individually labelled sections.

The final file must be independently reviewable without needing to open a separate report, CSV, or log file. Do not replace evidence with summaries, excerpts, ellipses, or statements such as “see attached CSV.”

---

# 2. Mandatory governance restrictions

## 2.1 Prohibited work

Do NOT:

- Implement migration features.
- Modify production React, TypeScript, JavaScript, CSS, HTML, LWC, Apex, Salesforce metadata, or Salesforce object definitions.
- Modify frozen baseline test runners.
- Deploy to or modify a Salesforce org.
- Perform live Salesforce SOQL, Apex deployment, or org operations.
- Start Batch 1 feature tasks or dispatch feature agents.
- Create implementation branches or commits.
- Reset, clean, stash, checkout, restore, or otherwise overwrite pre-existing user changes.
- Delete or rewrite prior-wave evidence.
- silently reinterpret an authoritative task, dependency, ownership, or Batch 1 boundary.
- claim a test passed merely because a scenario row says PASS.
- fabricate logs, hashes, test identities, timestamps, exit codes, or source provenance.

## 2.2 Permitted work

You MAY:

- Inspect repository source and Git history.
- Inspect all Wave 0.4.1 through Wave 0.4.6 governance and evidence artifacts.
- Create new Wave 0.4.7 verification scripts and test harnesses under a dedicated Wave 0.4.7 verification directory.
- Correct defects in new Wave 0.4.7 verification tooling when required to make the evidence reliable.
- Run verification tests and frozen baseline runners without modifying them.
- Create temporary isolated Git repositories and filesystem fixtures.
- Capture raw execution logs and SHA-256 hashes.
- Generate the single consolidated Markdown evidence package.
- Install missing dependencies in the Jules environment when required for verification, subject to the dependency rules below.

All changes must remain limited to Wave 0.4.7 verification tooling and evidence outputs. Record every changed path.

## 2.3 Dependency installation

Before testing, inspect whether every required runtime, package, and executable is available.

If a required dependency is missing:

1. Determine whether it is needed for this verification task.
2. Attempt installation in the Jules environment using the repository's declared package manager and lockfile where available.
3. Prefer the repository's pinned or compatible versions.
4. Do not modify production dependency declarations or lockfiles unless strictly unavoidable.
5. If installation would require modifying a protected production manifest or lockfile, do not do so; document the blocker and use a safe, isolated alternative if one exists.
6. Record exact dependency name, version, installation command, result, and environment changes.
7. Do not claim a test passed if the required dependency was unavailable and no valid substitute was executed.

Do not assume a dependency is missing or present. Check empirically.

---

# 3. Baseline capture and preservation

Before making any changes, capture:

- Repository root.
- Branch name.
- Full HEAD SHA.
- `git status --short --branch`.
- `git status --porcelain=v1 --untracked-files=all`.
- Tracked modified paths.
- Untracked paths.
- Ignored paths only if relevant to the verification environment.
- Node.js, npm, Python, Git versions.
- Relevant installed dependency versions.
- Existing Wave 0.4.6 evidence/tooling paths and hashes.
- Frozen runner hashes.
- Production source hashes for the relevant Salesforce/React source files.

Record both:
- **Starting state**, before Wave 0.4.7 work.
- **Final state**, after Wave 0.4.7 work.

The Wave 0.4.6 inventory stated that the tree was clean at execution start, while its synthesis report later recorded `DIRTY`. Determine the exact chronology from Git status and execution evidence. Do not treat these as contradictory without checking timestamps and changed paths.

Never clean or overwrite pre-existing dirty paths. If a path is already dirty at the start, preserve its exact bytes and report it.

---

# 4. Authoritative source inputs — do not silently change them

Load and hash-verify the authoritative Wave 0.4.1 / Wave 0.4.4 inputs:

1. `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv`
2. `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv`
3. `WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv`
4. `docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv`
5. `docs/wave-0/4.4/WAVE_0_4_4_COMPONENT_API_SOURCE_PROVENANCE.csv`

Expected planning boundaries, subject to verification against the actual authoritative files:

- 21 task-register entries.
- 175 unique ownership-manifest paths:
  - 99 existing baseline paths.
  - 76 planned new paths.
- 9 traceability contracts: W0-C1 through W0-C9.
- 11 Batch 1 task IDs and 49 task-path rows:
  - W5-1
  - W6-1
  - W6-2
  - W6-3
  - W6-4
  - W7-P1
  - W7-1
  - W7-2
  - W8-1
  - W8-2
  - W9-1

Do not hardcode these counts as proof. Recompute them from the authoritative files, validate uniqueness, and report actual counts. If actual files differ, stop and report the discrepancy; do not edit authoritative inputs to make them match.

Wave 5 serialization must remain:

`W5-1 → W5-2 → W5-3 → W5-4 → W5-5 → W5-6`

W5-1 is the only immediately dispatchable Wave 5 task under the known Batch 1 boundary. W5-2 through W5-6 remain blocked until their immediate predecessor is applied, verified, and integrated. Wave 0.4.7 itself does not authorize dispatch.

---

# 5. Resolve Wave 0.4.6 discrepancies

The following are mandatory closure items. Each must be resolved by inspecting primary source and actual execution evidence.

## 5.1 Filesystem containment: 14 versus 16

Wave 0.4.6 artifacts disagree:

- The supplied filesystem containment report lists CONT-01 through CONT-14: 14 scenarios.
- The cross-document reconciliation claims 16.
- The synthesis and final assessment also claim 16.

Actions:

1. Locate the actual Wave 0.4.6 scenario CSV, test harness, raw logs, and source.
2. Determine whether CONT-15 and CONT-16 exist.
3. If they exist, verify unique IDs, exact scenario semantics, execution command, exit code, raw log, and log hash.
4. Confirm whether they were actually executed or merely described in a report.
5. If they were not executed, mark them NOT EXECUTED and correct the Wave 0.4.7 reconciliation.
6. Do not invent replacement scenarios or backdate evidence.
7. If additional tests are required, execute new Wave 0.4.7 scenarios with new IDs, such as `W047-CONT-01`, rather than pretending they were Wave 0.4.6 executions.

At minimum, verify:
- Normal existing file.
- Normal nested file.
- Valid new nested file.
- External symlink parent.
- Internal symlink parent.
- Symlink final target.
- Windows drive path.
- UNC path.
- POSIX absolute path.
- Traversal.
- NUL byte.
- Trailing-slash directory.
- Bare directory.
- Root `.`.
- Any additional claimed cases.

## 5.2 Rollback: 8 versus 16

Wave 0.4.6 rollback closure report lists RB-01 through RB-08, while the synthesis, reconciliation, and final assessment claim RB-01 through RB-16.

Actions:

1. Locate the actual rollback source, harness, scenario CSV, state-hash CSV, raw logs, and execution commands.
2. Determine whether RB-09 through RB-16 exist and were actually executed.
3. Reconcile all 16 IDs individually.
4. Do not infer that the missing eight passed.
5. If any are absent, explicitly mark them NOT EXECUTED or MISSING EVIDENCE.
6. If needed, implement and execute additional tests only in the new Wave 0.4.7 verification harness, with new Wave 0.4.7 IDs. Do not rewrite historical Wave 0.4.6 evidence.

Required rollback safety cases include, at minimum:

- Newly created file removed safely.
- Clean tracked file restored byte-for-byte.
- Dirty tracked file preserved byte-for-byte.
- Multiple files rolled back.
- Corrupt provenance rejected before any mutation.
- Post-apply modification protected from overwrite.
- Missing provenance rejected.
- Caller task mismatch rejected.
- Missing file handling.
- Directory target rejection.
- Symlink target and symlink-parent rejection.
- Duplicate provenance path rejection.
- Path traversal rejection.
- Tampered provenance/hash rejection.
- Partial preflight failure leaves all targets unchanged.
- Successful rollback produces expected final state for every target.

For every scenario capture:
- Unique scenario ID.
- Test level: UNIT, INTEGRATION, or END_TO_END.
- Exact setup.
- Exact command.
- Expected result.
- Actual result.
- Exit code.
- Finding ID, if any.
- Raw log filename.
- Raw log SHA-256.
- Pre-state hashes.
- Post-state hashes.
- Whether any mutation occurred.
- Whether the result was independently asserted by the harness.

The harness must create actual temporary Git repositories and actual files. Do not manually fabricate provenance records or expected state in a way that bypasses the public rollback path. Clearly distinguish helper/unit tests from public entry-point integration tests.

## 5.3 Canonical patch-gate source identity

Wave 0.4.6 refers to both:

- `docs/wave-0/4.6/patch-gate.cjs`
- `docs/wave-0/4.5/patch-gate.cjs`

The initial inventory records a 4.5 path and SHA:

`f7661f8e5c17972c4b7dd22667a50544a02bcb5273453f9e621597992038a944`

The 4.6 source audit claims the same SHA for the 4.6 path.

Actions:

1. Inspect both physical files.
2. Recompute SHA-256 for each.
3. Compare bytes, line counts, exported functions, and relevant code paths.
4. Identify the exact module imported by each scenario harness.
5. Identify the exact public entry point exercised by ownership, stale-base, containment, patch, and rollback scenarios.
6. Record absolute/relative resolved module paths at runtime.
7. Record the loaded module's SHA-256 in each raw log or execution manifest.
8. Do not call the source canonical merely because a report labels it canonical.
9. If there is more than one implementation, designate one authoritative source for Wave 0.4.7 verification and explicitly document the relationship to historical Wave 0.4.5/0.4.6 paths.
10. Do not modify old source in place. Any permitted tooling correction must be a new Wave 0.4.7 artifact with a new hash and clear provenance.

## 5.4 Patch-gate integration and duplicate headers

Wave 0.4.6 documents four scenarios:
- PG-DUP-01
- PG-DUP-02
- PG-DUP-03
- PG-INT-01

Only PG-INT-01 is described as an actual `git apply` integration test; the other three are unit tests.

Verify:
- Duplicate `diff --git` headers.
- Duplicate `+++ b/` headers.
- Normalized aliases resolving to the same path.
- Traversal aliases.
- Absolute paths.
- Duplicate entries across combined patch sections.
- Correct behavior through the public patch-application entry point.
- Valid patch applied with real `git apply` in a temporary repository.

Do not label helper-level tests as integration tests.

## 5.5 Authoritative ownership and stale-base gates

Reproduce the claimed Wave 0.4.6 ownership scenarios OWN-01 through OWN-10 and stale-base scenarios BASE-01 through BASE-06 if their original source/logs exist.

Verify actual public-entry-point behavior for:
- Valid task and owned path.
- Foreign task path.
- Forged caller allowlist.
- Frozen path.
- Coordinator-only path.
- Role impersonation.
- Unknown task.
- Task outside Batch 1.
- Duplicate task ID in authoritative register.
- Missing ownership-manifest path.
- Approved base differs from current HEAD.
- Patch base differs from approved base.
- HEAD changes after approval.
- Missing or malformed SHA.

The gate must load authoritative task/ownership/Batch 1 data from trusted repository files. It must not trust caller-provided `allowedPaths`, `frozenPaths`, role, task ownership, or Batch 1 membership.

For stale-base enforcement, verify the actual sequence immediately before mutation and ensure the public apply path rejects mismatches. Confirm the exact equality rule claimed by Wave 0.4.6:

`expectedBaseSha === patchBaseSha === currentHeadSha`

If the implementation uses a different valid design, document the exact behavior and demonstrate it with adversarial tests rather than merely repeating the claimed rule.

## 5.6 Physical filesystem containment and TOCTOU

Inspect the actual implementation, not only its report.

Verify:
- Lexical path validation.
- Segment-by-segment `lstat` checks.
- Symlinked parent rejection, both internal and external.
- Symlink final-target rejection.
- Canonical realpath containment.
- Directory target rejection.
- Root `.` rejection.
- Windows drive, UNC, POSIX absolute, NUL, and traversal rejection.
- Newly created nested paths under a safe parent.
- Race window between validation and mutation.
- Symlink replacement after preflight, if the implementation has a check/use gap.

If a TOCTOU race cannot be prevented by the current implementation, document the residual risk. Do not claim complete physical containment merely because a preflight `realpath` check passed.

## 5.7 Raw evidence: 139 logs versus 99 evidence records

Wave 0.4.6 claims:
- 139 raw logs.
- 99 evidence-index records.
- 0 missing files.
- 0 hash mismatches.

Reconcile the counting model explicitly.

Actions:
1. Locate every claimed raw log on disk.
2. Build a complete raw-log inventory.
3. Distinguish a physical log file from an evidence record, scenario, runner execution, or grouped run.
4. Determine why the two counts differ.
5. Recompute SHA-256 from physical bytes.
6. Verify every index row points to exactly one existing file.
7. Detect duplicate index paths, duplicate IDs, missing files, orphan logs, duplicate hashes where unexpected, malformed hashes, and path traversal.
8. Verify log contents include command, working directory, timestamp, exit code, scenario/test identity, and relevant source hashes.
9. Do not accept hashes copied from another CSV as proof.
10. Do not accept a report stating “100% verified” without the physical-file comparison results.

The final package must include the full raw-log index and the complete raw log contents. If a raw log is binary or cannot be represented safely in Markdown, include its exact SHA-256, byte count, encoding/type, and a deterministic text extraction or explicitly mark it unavailable. Do not silently omit it.

## 5.8 Baseline runners and 187 stable identities

Wave 0.4.6 reported nine frozen runners, three sweeps, 27 executions, and 187 distinct identities per sweep.

Verify again without changing the runners.

Expected runner list:

1. `scratch/salesforce-poc/tests/run-poc-tests.cjs`
2. `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs`
3. `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs`
4. `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs`
5. `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs`
6. `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs`
7. `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs`
8. `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`
9. `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`

For each of the 27 executions capture:
- Runner path.
- Sweep number.
- Command.
- Working directory.
- Start/end timestamps.
- Exit code.
- Raw log.
- Raw log hash.
- Runner SHA-256 immediately before and after execution.
- Parsed stable test identities.
- Per-test outcome.

Validate:
- No duplicate identities within a sweep.
- Exactly the same identity set across all three sweeps, or document every difference.
- No hidden skipped/unreported tests.
- No parser assumptions that count only lines containing a checkmark.
- Runner immutability before/after all executions.
- Actual unique identity count from parsed records, not a hardcoded 187.

If a runner's output does not expose stable identities, report that limitation rather than inventing identities.

## 5.9 Semantic validator and mutation suite

Inspect the actual Wave 0.4.6 validator source and harness. Reproduce all claimed 20 mutations × 3 sweeps if source/evidence is present.

Verify that:
- All inputs, including W7/W8 documents and scenario evidence, are read from the supplied `--targetDir` sandbox.
- No hidden reads from ambient repository paths occur.
- Exact task set is validated.
- Exact manifest set and uniqueness are validated.
- Task paths are unique and belong to the declared owner.
- Dependency references resolve.
- Dependency cycles are rejected.
- W5 serialization is enforced.
- Batch 1 IDs and path rows are exact.
- Coordinator-only and frozen paths are protected.
- W7/W8 contracts are checked semantically, not by searching for words.
- Scenario rows are checked against raw logs, hashes, commands, exit codes, and unique IDs.
- CSV parsing handles RFC 4180 quoting, escaped quotes, CRLF, and rejects malformed/lone CR input as appropriate.
- Duplicate rows and duplicate identifiers are rejected.
- Self-tests assert the exact expected finding IDs and do not allow unrelated findings.
- Mutation inputs are demonstrably changed before each run.
- Each mutation is isolated and restored afterward.
- Mutation restoration is verified by hashes.
- Three repeated sweeps produce deterministic findings.

For each mutation include:
- Mutation ID.
- Target file.
- Exact mutation description.
- Before hash.
- After hash.
- Expected finding ID(s).
- Actual finding ID(s).
- Exit code.
- False-positive/unrelated-finding result.
- Raw log path and SHA-256.
- Restore hash and restoration result.

Do not report “100% detection” if the harness only checks nonzero exit status.

## 5.10 Component API provenance

Revalidate the source file:

`scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`

Wave 0.4.6 claimed:
- 593 physical lines.
- SHA-256 `b908430756f9efdf273e4574b8d2b77b7efc367687ec238348b459b5de03c80c`.
- `@api activeProjectId` line 77.
- `@api activeProjectKey` line 78.
- `handleFilterChange` lines 487–503.
- `handleContainerChange` lines 514–539.
- `handleProjectChange` lines 562–585.
- `handleNodeSelect` lines 588–592.
- Zero dispatched events.
- 13 proposed components.

Recompute the hash and line ranges from actual source. Search for `dispatchEvent`, event constructors, `@api`, public methods, handlers, and event listener bindings. Distinguish:
- Public properties.
- Public methods.
- Inbound handlers.
- Outbound dispatched events.
- Proposed, unimplemented APIs.

Do not infer that an inbound handler is a dispatched event. Include a complete provenance table in the final package.

## 5.11 Dynamic synthesis generator

Inspect the actual generator source and execute it.

It must derive from live state:
- Branch.
- HEAD.
- Working-tree status.
- Runtime versions.
- Actual scenario counts.
- Actual unique test identities.
- Actual mutation outcomes.
- Raw log count.
- Hash verification results.
- Findings.
- Final evidence verdict.

It must not hardcode:
- Branch names.
- HEAD SHA.
- Clean/dirty status.
- Test counts.
- Scenario counts.
- Pass rates.
- Finding counts.
- Final verdict.

The generator must fail closed if:
- Any required artifact is missing.
- Any hash mismatches.
- Scenario counts disagree.
- IDs are duplicated.
- Logs are missing.
- Source paths/hashes disagree.
- A test has a nonzero exit code.
- Required evidence is unverified.

Run the generator twice against unchanged inputs and verify deterministic output except for explicitly dynamic timestamps. Record both output hashes and explain any differences.

---

# 6. Required final verdict rules

The final verdict must be exactly one of:

1. `READY FOR INDEPENDENT AUTHORIZATION REVIEW`
2. `NOT READY — REMEDIATION INCOMPLETE`
3. `NOT READY — EVIDENCE INSUFFICIENT`

Use `READY FOR INDEPENDENT AUTHORIZATION REVIEW` only if every mandatory P0/P1 gate is actually implemented, executed through the correct public entry point, supported by raw evidence, hash-verified, internally consistent, and reproducible.

Use `NOT READY — REMEDIATION INCOMPLETE` when an actual code/tooling defect remains.

Use `NOT READY — EVIDENCE INSUFFICIENT` when claims cannot be independently established from source and execution evidence.

Do not use `READY_WITH_EXPLICIT_RESTRICTIONS` as a substitute for these required verdicts.

Regardless of the result, the final statement MUST be:

**Batch 1 dispatch authorized: NO**

Wave 0.4.7 is not a feature-dispatch authorization. A separate human integration authority must review the final evidence and make any later authorization decision.

---

# 7. Single-file deliverable contract — mandatory

## 7.1 One canonical file

Create exactly one canonical final Markdown deliverable:

`WAVE_0_4_7_SINGLE_FILE_EVIDENCE_PACKAGE.md`

Place it in the repository root unless repository conventions require a dedicated evidence location. If placed elsewhere, record the exact path.

The file must be self-contained and include all required artifacts as separate, clearly labelled sections.

Do not make the final delivery depend on separate CSV, JSON, Markdown, or log attachments.

## 7.2 Multi-file-in-one-file format

Use this exact structure. Each embedded artifact must have a unique artifact ID and its original filename/path.

For every embedded artifact, use a section in this form:

```markdown
# ARTIFACT W047-001
## Original filename
`WAVE_0_4_7_INITIAL_BASELINE.md`

## Artifact type
Markdown report

## SHA-256
`<computed hash of exact embedded content or original file bytes; explain which>`

## Content

<the complete original file content goes here>
```

For CSV artifacts, include the complete CSV content inside a fenced `csv` block.

For JSON artifacts, include the complete JSON content inside a fenced `json` block.

For source code, include the complete relevant source file inside a fenced code block with the correct language.

For raw logs, include each complete log in its own subsection and fenced `text` block. Include the log's physical filename, byte count, and SHA-256.

Never put one code fence inside another with the same fence delimiter. Use longer outer fences where required.

Do not truncate long artifacts. If the file becomes large, that is acceptable. Completeness and reproducibility take priority over convenience.

## 7.3 Mandatory sections in the single file

The final Markdown file must contain, in this order:

1. **Executive verdict and authorization statement**
2. **Scope, restrictions, and audit methodology**
3. **Starting repository/runtime baseline**
4. **Final repository/runtime baseline and changed-path inventory**
5. **Dependency/tool availability and installation record**
6. **Authoritative input inventory and SHA-256 manifest**
7. **Wave 0.4.6 discrepancy register**
8. **Canonical patch-gate source identity and source audit**
9. **Ownership gate source and scenario evidence**
10. **Stale-base gate source and scenario evidence**
11. **Filesystem containment source and complete scenario evidence**
12. **Patch parsing, duplicate-header, and real `git apply` evidence**
13. **Rollback source audit**
14. **Complete rollback scenario matrix**
15. **Rollback before/after state hashes**
16. **Raw evidence count reconciliation: 139 versus 99**
17. **Complete raw evidence index**
18. **Complete raw execution logs**
19. **Baseline runner execution report**
20. **All 27 baseline execution records**
21. **Complete 187 stable test identity register, if 187 is actually verified**
22. **Frozen runner before/after hash verification**
23. **Semantic validator source audit**
24. **Validator sandbox-isolation evidence**
25. **All mutation test cases and all repeated execution results**
26. **Component API source provenance**
27. **Synthesis generator source audit and deterministic rerun results**
28. **Authoritative task/ownership/traceability reconciliation**
29. **Batch 1 task/path boundary and Wave 5 dependency chain**
30. **Complete findings register**
31. **Cross-document and cross-artifact consistency matrix**
32. **Reproduction commands**
33. **Known limitations and unverified areas**
34. **Final verdict and Batch 1 authorization statement**
35. **Embedded artifact directory / table of contents mapping artifact IDs to original filenames**

The embedded artifact directory may be repeated at the beginning as a navigation aid, but all 35 sections must exist.

## 7.4 Embedded source files

Include complete source contents for the verification-critical files, at minimum:

- Canonical patch-gate implementation actually exercised.
- Strict CSV parser actually exercised.
- Rollback harness.
- Ownership gate harness.
- Stale-base harness.
- Filesystem containment harness.
- Patch integration harness.
- Semantic validator.
- Mutation harness.
- Raw evidence hash verifier.
- Synthesis generator.
- Baseline execution orchestrator.

If any source file is too large, still include it in full. Do not substitute a summary.

Include the exact source hash and physical path for each.

## 7.5 Embedded registers and manifests

Include full contents of:
- Initial baseline inventory.
- Final baseline inventory.
- Input SHA-256 manifest.
- Ownership scenario CSV.
- Stale-base scenario CSV.
- Filesystem containment scenario CSV.
- Patch-gate scenario CSV.
- Rollback scenario CSV.
- Rollback state-hash CSV.
- Baseline raw-log index.
- Baseline test identities CSV.
- Validator mutation results CSV.
- Component API provenance CSV.
- Raw evidence index.
- Findings register.
- Cross-document reconciliation matrix.

All rows must be present. Do not include only the first few rows or a summary table.

## 7.6 Embedded raw logs

Include every raw execution log required to support the reported counts and verdict.

At minimum include:
- All 27 baseline runner execution logs.
- All ownership gate logs.
- All stale-base logs.
- All containment logs.
- All patch integration and duplicate-header logs.
- All rollback logs.
- All mutation test logs.
- All raw evidence hash-verifier logs.
- Both synthesis-generator execution logs.

Each log must be tied to an execution/scenario ID and indexed in the embedded raw evidence index.

If the number of logs is not 139, report the actual number and reconcile the earlier claim. Do not force the number to 139.

## 7.7 Content integrity and reproducibility

The single-file package must preserve exact artifact contents.

For each embedded artifact record:
- Original path/name.
- Artifact type.
- Original byte count.
- Original SHA-256.
- Whether content is embedded byte-faithfully or normalized for Markdown.
- If normalized, include the original raw hash and explain the normalization.

For CSV and JSON, preserve exact field names, row order, quoting, and values. Do not silently normalize line endings before hashing.

For raw logs, preserve exact content where text encoding allows. Hash the original physical bytes, not the rendered Markdown code fence.

The single Markdown file's own SHA-256 must be computed after it is fully written. Since a file cannot contain its own final hash without a self-reference problem, put the package hash in the execution summary or terminal output and explicitly state that the embedded package does not self-include its own hash.

---

# 8. Evidence quality rules

Every test result must be classified accurately:

- `UNIT`: tests a helper/function in isolation.
- `INTEGRATION`: exercises multiple real components or the public gate in an isolated repository/environment.
- `END_TO_END`: exercises the complete intended workflow, including actual mutation and resulting state verification.

A scenario is PASS only if:
1. Its setup was executed.
2. Its command and exit code were captured.
3. Its expected behavior was asserted.
4. Its actual behavior matched.
5. Its raw log exists.
6. Its log hash was recomputed from disk.
7. Its relevant source hash is known.
8. Its state mutation or non-mutation was verified where applicable.

A report row marked PASS without these elements is not verified.

Use explicit statuses:
- VERIFIED
- FAILED
- NOT EXECUTED
- MISSING EVIDENCE
- BLOCKED
- NOT APPLICABLE

Never convert NOT EXECUTED, MISSING EVIDENCE, or BLOCKED into PASS.

Keep findings open until the evidence closes them. Do not delete historical findings; map each to its Wave 0.4.7 status and evidence.

---

# 9. Cross-document reconciliation requirements

Build an explicit reconciliation matrix comparing:

- Actual source files and hashes.
- Source-audit claims.
- Scenario registers.
- Raw logs.
- Raw-log index.
- Hash verifier output.
- Synthesis report.
- Final verdict.

At minimum reconcile:

| Subject | Wave 0.4.6 claim | Primary evidence to verify |
|---|---|---|
| Filesystem containment | 16 scenarios | Actual CSV, harness, logs |
| Rollback | 16 scenarios | Actual CSV, harness, state hashes, logs |
| Patch-gate source | 4.6 canonical path | Both 4.5/4.6 files, hashes, runtime-loaded module |
| Raw logs | 139 logs | Physical files and raw index |
| Evidence records | 99 records | Index semantics and physical logs |
| Baseline | 187 identities × 3 sweeps | All 27 logs and identity sets |
| Mutation suite | 20 × 3 = 60 | Actual mutation inputs, exact findings, logs |
| Working tree | Clean at start / DIRTY in synthesis | Timestamped Git status and changed paths |
| Component provenance | 593 lines, 13 proposed | Actual source hash and extracted ranges |

No discrepancy may be marked resolved solely because two reports repeat the same number.

---

# 10. Required execution sequence

Execute in this order:

### Stage A — Read-only baseline
- Capture starting Git/runtime state.
- Hash authoritative inputs, production source, frozen runners, and Wave 0.4.6 tooling.
- Inventory all Wave 0.4.6 reports, scenario registers, source files, and logs.
- Preserve dirty paths.

### Stage B — Evidence inventory and source identity
- Reconcile 4.5/4.6 patch-gate paths.
- Build physical artifact inventory.
- Verify existing hashes.
- Identify missing artifacts and missing logs.
- Build the Wave 0.4.6 discrepancy register.

### Stage C — Reproduction harnesses
- Reproduce ownership and stale-base tests.
- Reproduce filesystem containment tests.
- Reproduce duplicate-header and real git-apply tests.
- Reproduce rollback tests.
- Reproduce baseline runners.
- Reproduce semantic validator and mutations.
- Revalidate component provenance.
- Test synthesis generator.

### Stage D — Narrow verification-tool remediation
- Fix only new Wave 0.4.7 verification harnesses/generators if needed.
- Do not alter production source or frozen runners.
- Add regression tests for each discovered verification-tool defect.
- Preserve all prior-wave evidence unchanged.

### Stage E — Repeated execution and integrity
- Repeat required deterministic suites.
- Verify hashes from physical disk.
- Verify no missing/orphan logs.
- Verify all source hashes match loaded modules.
- Verify final Git state and production/frozen-runner immutability.

### Stage F — Single-file package assembly
- Generate the one Markdown package with all 35 required sections.
- Embed complete artifact contents and raw logs.
- Verify every embedded artifact has a unique artifact ID.
- Verify all expected files are included.
- Verify no placeholders, omitted rows, truncation, or “see separate file” references remain.
- Re-read the completed Markdown file and run a structural completeness check.
- Compute the final package SHA-256.

### Stage G — Final synthesis and verdict
- Generate the final verdict from actual findings and evidence.
- Ensure the verdict follows the required allowed values.
- Ensure Batch 1 dispatch remains NO.

---

# 11. Required fail-closed assertions before finalizing

The final package generator/validator must exit nonzero if any of the following is true:

- Canonical patch-gate source identity is ambiguous.
- A required source file is missing.
- A required scenario ID is duplicated.
- A claimed scenario is absent from the actual scenario register.
- A scenario is reported PASS without a raw log.
- A raw log is missing or hash-mismatched.
- A raw log is orphaned and unexplained.
- Raw log count cannot be reconciled.
- Rollback state hashes are incomplete.
- A rollback scenario mutates files before preflight completes.
- A dirty tracked file is not preserved exactly.
- A post-apply modification is overwritten by rollback.
- Symlink or traversal containment fails.
- Current HEAD does not match the approved patch base at mutation time.
- Caller-controlled ownership/role/allowlist data bypasses authoritative checks.
- Duplicate patch paths are silently collapsed.
- Baseline runner hash changes.
- Baseline test identity sets differ unexpectedly across sweeps.
- Validator reads outside the targetDir sandbox.
- Mutation tests do not assert exact expected findings.
- Mutation tests produce unrelated findings without detection.
- Mutation input restoration fails.
- Synthesis output hardcodes runtime/Git/count/verdict facts.
- The single-file package omits any required section or artifact.
- The final Git status or changed-path inventory is missing.

If any assertion fails, report the specific finding and use a NOT READY verdict. Do not weaken the assertion to obtain a pass.

---

# 12. Final response format from Jules

At completion, provide:

1. Exact path to `WAVE_0_4_7_SINGLE_FILE_EVIDENCE_PACKAGE.md`.
2. Final package SHA-256 and byte count.
3. Starting and final branch/HEAD/Git status.
4. Number of embedded artifacts.
5. Number of embedded raw logs.
6. Reconciled filesystem scenario count.
7. Reconciled rollback scenario count.
8. Number of verified baseline identities and executions.
9. Number of mutation executions and exact detection results.
10. Number of open P0/P1/P2 findings.
11. Any dependency installations performed.
12. Final verdict using one of the three allowed values.
13. The mandatory statement: **Batch 1 dispatch authorized: NO**.

Do not create a separate final report. The single Markdown file is the authoritative deliverable. The terminal response may summarize its location and verdict, but all substantive evidence must be inside that one file.

---

# 13. Final non-negotiable reminder

This is a verification and evidence-closure wave, not a migration implementation wave.

Preserve the React/TypeScript and Salesforce production code, frozen test runners, authoritative planning files, and all pre-existing user changes.

Do not dispatch Batch 1.

The goal is not to make Wave 0.4.6 appear successful. The goal is to establish, with primary source and reproducible evidence, exactly what is true, what is fixed, what remains open, and whether the project is genuinely ready for a separate human authorization review.
