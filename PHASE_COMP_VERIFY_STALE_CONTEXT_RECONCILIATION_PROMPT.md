# PHASE COMP-VERIFY — REPOSITORY-WIDE AUDIT RECONCILIATION, STALE-CONTEXT PURGE, AND EVIDENCE-CLOSURE GATE

## Mission

Perform an autonomous, adversarial reconciliation of the prior repository-wide audit and its five deliverables. Do not trust prior reports, context-retrieval files, summaries, inventories, manifests, comments, test output copied into documents, or the current conversation as proof of the checkout's present state.

The goal is to establish the repository's current truth from the live checkout, identify and quarantine stale or contradictory repository knowledge, correct stale context-retrieval records where safely justified, verify the previously claimed test-harness fix, and issue a closure verdict that does not overstate evidence.

**This is a repository-truth task, not a report-polishing task.** A report saying “PASS,” “verified,” “current,” or “closed” is only a claim to test. No earlier conclusion is grandfathered in.

Proceed autonomously through all phases without stopping to ask for approval between phases. Make only safe, in-scope, evidence-backed edits. Do not overwrite unrelated or pre-existing user work, do not reset/rebase/clean the repository, do not delete source artifacts or user data, do not install dependencies or browser binaries, do not change package versions/lockfiles, and do not make architecture/product-gate decisions. If a required correction would risk unrelated work or requires a decision outside this scope, document it and leave it unchanged.

---

## Governing repository constraints

Treat these as constraints to verify against the live checkout, not as proof that the implementation already complies:

- Canonical context files include:
  - `AGENT.md`
  - `CONTEXT-RETRIEVAL-PROTOCOL.md`
  - `context/CURRENT-DECISIONS.md`
  - `context/CURRENT-CONTRACTS.md`
  - `context/CURRENT-ARCHITECTURE.md`
  - `context/CURRENT-TESTS.md`
  - `context/CURRENT-IMPLEMENTATION.md`
  - `context/CURRENT-DATA-AND-FIXTURES.md`
- Required PBIM artifact: `explorer/public/pbim/explorer-data.json`.
- Required PBIM browser URL: `/pbim/explorer-data.json`.
- Default artifact must remain `explorer/public/explorer-data.json`; default browser URL `/explorer-data.json`.
- Do not migrate PBIM to `/projects/pbim/explorer-data.json`.
- Worker serializes `projectedNodeIds` Set to an array and client reconstructs Set; `runLayoutWithMetadataAsync` must filter for both `orbit` and `constellation`.
- DEF-01 position-key isolation is closed; do not reopen it without new, direct contradictory runtime evidence and an explicitly authorized scope change.
- Do not introduce `legacyNodePositions`.
- Do not change canonical BFS/approved edge types without an explicit architecture decision.
- Product Gates A–D remain unapproved/proposed. Do not represent them as approved.
- Do not change package versions or lockfiles absent a separate, explicit authorization.
- No npm installs or browser binary installs to work around missing dependencies.
- The user expects autonomous execution without approval pauses for safe, in-scope phases. This is not permission for destructive or out-of-scope changes.

If the live checkout or newer authoritative evidence contradicts a constraint above, do not silently change the constraint. Record the conflict, identify its provenance and recency, and mark it as requiring an explicit architecture/product decision where appropriate.

---

# PHASE 0 — Establish checkout identity and evidence provenance

1. Record:
   - repository root;
   - current branch and HEAD commit;
   - working-tree status before edits;
   - tracked and untracked pre-existing changes;
   - available runtime/tool versions;
   - whether the repository is shallow, detached, or otherwise constrained.
2. Locate the prior five audit deliverables, wherever they actually reside:
   - `REPOSITORY_WIDE_PROJECT_AND_ARTIFACT_AUDIT_REPORT*.md`
   - `REPOSITORY_WIDE_PROJECT_VERIFICATION_MATRIX*.md`
   - `REPOSITORY_WIDE_PROJECT_INVENTORY*.json`
   - `REPOSITORY_WIDE_FIX_AND_REGRESSION_LOG*.md`
   - `REPOSITORY_WIDE_AUDIT_EVIDENCE_INDEX*.md`
   Also locate any prior reconciliation outputs and similarly named duplicates.
3. For each evidence source, record its path, tracked/untracked status, file hash, last modification time if available, and the commit/tree state it claims to describe.
4. Do not assume an uploaded file is present in the repository or that a report's named commit is the current HEAD.
5. Use the actual current checkout as the source of truth for present-state claims. Treat older reports and conversation/context summaries as leads only.
6. Preserve the pre-edit baseline so the final report can distinguish pre-existing changes from changes made in this run.

**Required rule:** No fact is “current” merely because it appears in a context file, a report, a summary, a comment, or a prior assistant answer.

---

# PHASE 1 — Stale-data and stale-context discovery across the entire repository

Perform a recursive, repository-wide search—not just a search of the known context directory—for stale or conflicting project knowledge. Include tracked files, untracked files, generated files, docs, scripts, test fixtures, manifests, JSON/YAML/TOML, Markdown, source comments, prompt files, report artifacts, and nested directories. Exclude only dependency/build/cache directories from expensive content scanning where justified, and list every excluded path/pattern. Do not exclude `context/`, `analyze/`, `explorer/public/`, scripts, tests, or reports.

Search for, at minimum:

- `CURRENT-`, `CONTEXT-`, `AGENT.md`, `CONTEXT-RETRIEVAL-PROTOCOL.md`;
- stale commit hashes, branch names, dates, test counts, project counts, artifact counts, “latest/current/verified/passed/closed” claims;
- obsolete paths, moved/renamed files, old URL conventions, obsolete schema or data-shape claims;
- contradictions involving PBIM/default artifact paths, `projectedNodeIds`, orbit/constellation filtering, DEF-01, `legacyNodePositions`, canonical BFS/edge types, and Product Gates A–D;
- references to reports whose claims have been superseded by later evidence;
- duplicate copies of context files or reports that could be selected by retrieval instead of the canonical file;
- stale TODOs, instructions, generated inventories, README examples, comments, and test expectations that encode a superseded contract;
- hard-coded counts and “PASS” labels unsupported by the current source/test evidence;
- instructions that tell agents to trust retrieval summaries, report verdicts, or old audit artifacts without revalidation.

Use ripgrep or equivalent repository-native tools when available. If a tool is unavailable, use a safe alternative already installed; do not install anything. Search both filenames and contents. Capture exact paths and line ranges for every material finding.

For every candidate stale fact, classify it as one of:

- `CURRENT_SUPPORTED`
- `STALE_CONFIRMED`
- `CONTRADICTORY`
- `UNVERIFIED`
- `HISTORICAL_VALID`
- `DUPLICATE_OR_SHADOW_COPY`
- `DECISION_REQUIRED`

Do not delete historical records just because they are old. Historical evidence can remain if clearly labeled historical and prevented from masquerading as current truth.

---

# PHASE 2 — Apply a strict freshness and authority policy to context retrieval

Audit the instructions and data model used by context retrieval. Make a minimal, safe correction to the retrieval protocol and relevant canonical context files where the current repository supports doing so.

The protocol must explicitly require agents to:

1. **Revalidate on retrieval.** Context files, memory summaries, old reports, generated inventories, prior chat summaries, and previous verdicts are discovery aids, never sufficient proof of current repository state.
2. **Resolve conflicts by evidence, not convenience.** Prefer direct inspection of current source, current configuration/manifests, reproducible test output, and current artifact hashes over prose claims. Use Git history only to establish chronology or explain changes, not to assume a historical state is still active.
3. **Track provenance.** Material claims should include the source path, relevant symbol/line or JSON field, commit/tree identity where applicable, observation date, and validation method.
4. **Enforce freshness.** A claim about current implementation, test status, counts, paths, or architecture must be rechecked against the current checkout in the current run. If it cannot be rechecked, mark it `UNVERIFIED`, never `CURRENT_SUPPORTED`.
5. **Detect shadow copies.** If multiple files appear to be canonical, identify the designated authority and update retrieval instructions to prevent a stale duplicate from silently overriding it. Do not delete duplicates without evidence that deletion is safe.
6. **Separate present state from historical state.** Preserve useful historical decisions and reports but label them with their valid commit/date/scope and mark superseded claims explicitly.
7. **Fail closed.** If authoritative sources conflict, do not synthesize a new contract or choose whichever source gives a passing result. Report the conflict as `DECISION_REQUIRED` or `INDETERMINATE`.
8. **Avoid self-validating documentation.** A context file cannot establish its own correctness merely by declaring itself canonical/current.
9. **Update carefully.** Make only evidence-backed, minimal edits to context files. Preserve existing user changes. Do not bulk-rewrite, auto-format, or regenerate canonical documents wholesale.
10. **Prevent stale closure.** “Fixed,” “verified,” “closed,” and “passed” statements must cite the specific current evidence and scope. Where the evidence no longer applies to HEAD, relabel it historical.

Add or update a compact “Freshness / Authority / Stale-Context Rejection” section in `CONTEXT-RETRIEVAL-PROTOCOL.md` or the actual authoritative equivalent. Ensure `AGENT.md` points to and obeys this policy. If these files do not exist at the expected paths, locate the actual equivalent and report the discrepancy rather than creating a parallel canonical protocol.

Do not alter architecture decisions while changing the freshness policy. Do not mark any proposed Product Gate as approved.

---

# PHASE 3 — Reconstruct the real project and artifact inventory

Do not copy counts from prior reports. Build the inventory from a fresh recursive filesystem scan and source inspection.

1. Enumerate all projects under `analyze/` and all public artifacts under `explorer/public/`, including nested directories.
2. Distinguish:
   - source datasets;
   - public datasets;
   - registered projects;
   - legacy/orphan public artifacts;
   - test fixtures and temporary artifacts;
   - manifests/configuration entries;
   - browser routes/URLs;
   - aliases or normalized project IDs.
3. Use explicit rules to avoid double-counting one project under multiple aliases and to avoid silently merging distinct IDs.
4. Reconcile the prior claims of 11 projects, 12 project IDs, and 13 public/source artifacts. Do not assume any number is correct.
5. Explain every unmatched source artifact, public artifact, manifest entry, project ID, and route. Each unexplained item must remain a closure blocker.
6. For every data artifact, record:
   - canonical project ID;
   - exact source path, if any;
   - exact public path;
   - exact browser URL;
   - byte size;
   - SHA-256;
   - parse/validation result;
   - node/edge counts only if derived from the current artifact;
   - whether the artifact is generated, tracked, or a fixture;
   - how the artifact is consumed and tested.
7. Verify whether source/public equality is required for each project. Where it is required, compare bytes or canonicalized JSON according to the actual contract and state which comparison was used.
8. Do not infer that every public artifact is a registered project or that every source project must have a public artifact. Prove the mapping from current code/manifests/tests.

---

# PHASE 4 — Audit the five prior deliverables and status inflation

Compare the old reports against the freshly reconstructed truth.

For every material claim, classify it as:
- `CONFIRMED_CURRENT`
- `CONFIRMED_HISTORICAL`
- `CONTRADICTED`
- `UNSUPPORTED`
- `NOT_REPRODUCIBLE`

Specifically reconcile:

- 11 vs 12 project counts;
- 13 source/public artifact counts and any artifacts not represented in the project matrix;
- claims that all projects were retested when evidence appears to be global-only;
- per-project `PASSED`, `VERIFIED`, layout/runtime and E4/E5 claims;
- any claims that browser verification passed when browser execution was blocked;
- all claimed hashes, node/edge counts, manifest checks and cross-project isolation results;
- whether “defects remaining: 0” is justified;
- whether all pre-existing working-tree changes were preserved and reconciled;
- whether each evidence-index path and line range exists in the current checkout and supports the stated claim.

**Evidence-level rules:**

- Static source inspection supports only static/code-path claims.
- JSON parse/schema/invariant checks support only the checks actually executed.
- A global CLI test suite does not prove every project's browser behavior.
- Artifact hashes prove the identity of the bytes hashed, not correctness of the application behavior.
- A test's existence does not prove it passed in this run.
- A pasted test log or report claim is not equivalent to a fresh execution.
- Browser/runtime/layout claims require browser/runtime evidence. If the required tooling is unavailable, report `BLOCKED`, not `PASS`.
- A row may have multiple separate statuses (artifact, routing, CLI, worker, browser, layout); do not collapse them into one `VERIFIED` label.
- Any missing required evidence must lower the status; never fill gaps by inference.

---

# PHASE 5 — Independently verify the multi-project test-harness repair

Inspect the live diff and current implementation of `scripts/test-multi-project.cjs`, including all relevant helpers and cleanup behavior.

The prior report claims that:
- `TEST_ANALYZE_DIR` was moved from `../temp-multi-project-analyze` to `../analyze/temp-multi-project-analyze`;
- `sourcePath` assertions were normalized with `normalizeSourcePath()`;
- the move addressed `isPathContained` rejection and a mismatch between `analyzeContent` and stale `browserContent`.

Verify each claim independently.

1. Compare the actual patch against the pre-edit version using Git history or available baseline evidence.
2. Determine whether moving the test fixture under `analyze/` is valid under the production containment contract or merely bypasses a security boundary.
3. Confirm that path containment is still tested for an actually out-of-boundary path and that traversal/symlink cases are covered to the extent the existing contract requires.
4. Inspect setup and cleanup paths. Confirm the test does not delete, overwrite, or mutate pre-existing user files.
5. Run the relevant test twice, safely, if the environment permits. Check for leaked fixtures, nondeterminism, and dirty working-tree changes.
6. Run the directly related tests and record exact commands, exit codes, and fresh output.
7. If the fix is invalid, unsafe, or unsupported, make a minimal correction only if clearly in-scope and safe; otherwise report a blocker. Do not declare success just because the test count is green.
8. Do not install missing dependencies. Clearly distinguish `BLOCKED` from `FAIL`.

Also inspect `scripts/test-export-explorer.cjs` and related implementation for path-containment regression coverage. Do not assume an earlier reported missing test has been fixed; locate the exact test and demonstrate the assertion.

---

# PHASE 6 — Revalidate contracts and runtime claims

Inspect current source and tests for:

- default artifact `explorer/public/explorer-data.json` and URL `/explorer-data.json`;
- PBIM artifact `explorer/public/pbim/explorer-data.json` and URL `/pbim/explorer-data.json`;
- no unintended PBIM migration to `/projects/pbim/explorer-data.json`;
- worker serialization/reconstruction of `projectedNodeIds`;
- `runLayoutWithMetadataAsync` filtering for both `orbit` and `constellation`;
- DEF-01 isolation remaining closed without introducing `legacyNodePositions`;
- canonical BFS and approved edge types remaining unchanged absent an explicit decision;
- Product Gates A–D remaining proposed/unapproved;
- manifest/source/public artifact mappings;
- invalid/missing dataset handling;
- route and project-ID normalization;
- cross-project data and selection isolation.

For each item, provide:
- current source of truth;
- exact code/config/test references;
- test command and fresh result if executable;
- evidence tier (`STATIC`, `UNIT/CLI`, `ARTIFACT`, `BROWSER`, `RUNTIME`);
- status and remaining limitations.

Do not make a claim about layout/runtime success based solely on static code inspection or a CLI test.

---

# PHASE 7 — Fresh execution and regression

Run the relevant existing tests available in the checkout without installing dependencies. At minimum, where present and executable, run:

- `npm run test:cli`
- `node scripts/test-multi-project.cjs`
- `node scripts/test-source-resolution.cjs`
- `node scripts/test-pbim-dedicated-data-path.cjs`
- `node scripts/test-export-explorer.cjs`

First inspect each command/script so that test side effects are understood. Record exact command, exit code, duration if available, and concise output summary. If a command is missing, unsafe, or blocked by unavailable dependencies, record that honestly. Do not invent a result or substitute a different test without explaining the difference.

Run relevant tests twice where nondeterminism or cleanup risk is material. Compare the working tree before and after each test. If tests mutate tracked artifacts, determine whether that is expected and restore only files created/modified by this run, never pre-existing user changes.

If browser tooling is unavailable, do not install it. Report browser verification as `BLOCKED` and continue with the non-browser checks that are safe and available.

---

# PHASE 8 — Context freshness correction and stale-data disposition

Create a repository-wide stale-data ledger with one row per material stale or conflicting item:

- exact path and line/JSON field;
- stale text/claim (short excerpt);
- classification;
- why it is stale, contradictory, duplicated, or unsupported;
- authoritative current evidence;
- safe action taken (`UPDATED`, `LABELED_HISTORICAL`, `DUPLICATE_FLAGGED`, `LEFT_UNCHANGED`, `DECISION_REQUIRED`);
- resulting status and any follow-up needed.

Apply only minimal corrections that are directly supported by current evidence:
- update incorrect current-state counts and paths;
- mark historical reports as historical/superseded when that is safe and does not rewrite immutable audit evidence;
- fix context-retrieval instructions that encourage trusting stale summaries;
- remove or revise stale “current” assertions only when their authoritative replacement is proven;
- add cross-links from canonical context files to the new reconciliation report if this is consistent with existing repository conventions.

Do not rewrite prior reports to make them appear correct retroactively. Preserve original evidence and record corrections in the new reconciliation report. If an old report is treated as an immutable historical artifact, leave its content unchanged and add a separate supersession notice in an appropriate current index or context file.

Do not mass-delete files, old reports, fixtures, branches, or data. Do not delete duplicate context files until the canonical authority and safe disposition are proven. If a stale item cannot be safely corrected, flag it and block closure as appropriate.

---

# PHASE 9 — Final working-tree integrity and change review

1. Compare final working-tree status against the Phase 0 baseline.
2. For every changed file, classify it as:
   - pre-existing and preserved;
   - modified by this task;
   - created by this task;
   - generated by tests;
   - unexpected.
3. Review every diff for accidental changes, unrelated formatting, generated churn, deleted data, or hidden behavior changes.
4. Ensure no package/lockfile changes, dependency installations, unrelated artifact rewrites, or unapproved architecture changes occurred.
5. Confirm test temporary directories are cleaned up without disturbing pre-existing content.
6. Do not claim “working tree clean” if pre-existing changes remain; report the exact state and distinguish pre-existing from task-created changes.
7. If an unexpected change cannot be safely attributed or reconciled, closure is blocked.

---

# PHASE 10 — Required deliverables

Create or update these five deliverables in the repository using the repository's established report location/convention. Do not create duplicate canonical versions if a clear convention already exists; if the correct location is ambiguous, choose a clearly named new reconciliation artifact and explain why.

1. `REPOSITORY_WIDE_AUDIT_RECONCILIATION_REPORT.md`
   - Executive verdict and scope
   - Checkout identity and provenance
   - Current inventory counts and reconciliation of old counts
   - Stale-context policy changes
   - Confirmed defects, fixes, blockers, and limitations
   - Evidence-tiered conclusions
   - Working-tree integrity
   - Explicit remaining risks and next action

2. `REPOSITORY_WIDE_PROJECT_VERIFICATION_MATRIX_RECONCILED.md`
   - One row per canonical project ID, plus a separate section for orphan/legacy/test artifacts
   - Separate columns for artifact integrity, source/public mapping, route/static inspection, CLI tests, worker/runtime, browser, layout, isolation, and final status
   - Cite exact evidence; never use a single ambiguous `VERIFIED` label

3. `REPOSITORY_WIDE_PROJECT_INVENTORY_RECONCILED.json`
   - Valid machine-readable JSON
   - Derived from the fresh scan, not copied from the old inventory
   - Explicit counts with definitions
   - Arrays for projects, source artifacts, public artifacts, manifests, routes, orphan artifacts, and stale-context findings
   - Every record has exact path/ID and SHA-256 where applicable
   - Include `checkoutHead`, `branch`, `generatedAt`, and an explanation of counting rules
   - Ensure declared totals exactly equal array cardinalities; validate JSON and run an internal consistency check

4. `REPOSITORY_WIDE_FIX_AND_REGRESSION_LOG_RECONCILED.md`
   - Only changes actually made in this run
   - Before/after evidence
   - Test commands, exit codes, and output summaries
   - Distinguish production changes from test-only changes and documentation/context-policy changes

5. `REPOSITORY_WIDE_AUDIT_EVIDENCE_INDEX_RECONCILED.md`
   - Claim-to-evidence map
   - Exact current paths and line ranges/symbols
   - Hashes and test output provenance
   - Evidence tier and limitations
   - Explicit list of unsupported or blocked claims

Also create `REPOSITORY_WIDE_STALE_CONTEXT_LEDGER.md` unless an existing authoritative ledger convention is present. It must list all material stale-context findings and their dispositions.

Do not fabricate timestamps, hashes, line ranges, command output, or commit identities. If a field cannot be measured, use an explicit null/unknown value with a reason.

---

# PHASE 11 — Machine-verifiable closure gate

Before issuing the final verdict, validate the new deliverables mechanically:

- JSON parses successfully.
- All inventory totals equal actual array lengths and are internally consistent.
- Project IDs are unique where the counting definition requires uniqueness.
- Source/public mappings refer to existing files or are explicitly marked missing.
- All report references and evidence paths exist.
- Every `PASS` has direct supporting evidence and an explicit scope.
- No `BLOCKED` browser/runtime claim is simultaneously represented as `PASS`, `VERIFIED`, or equivalent.
- No current-state claim relies solely on a stale context file or previous report.
- All material stale facts have a ledger entry and disposition.
- All context-policy edits are listed in the fix log.
- Final working-tree differences are reconciled with the baseline.
- The prior 11/12/13 discrepancy is fully explained; any remaining unexplained mismatch blocks full closure.
- The current context files no longer present superseded counts/paths/contracts as current truth unless explicitly marked historical.
- Search again for the specific stale claims discovered in Phase 1 and confirm that each is corrected, labeled historical, or recorded as an unresolved blocker.

If any check fails, do not report full closure. Correct safe in-scope errors, rerun the gate, and report remaining blockers.

---

# Final verdict rules

Choose exactly one primary verdict and explain why:

- `AUDIT RECONCILED — NON-BROWSER CONTRACTS SUPPORTED`
- `STALE CONTEXT CORRECTED — SOME VERIFICATION STILL BLOCKED`
- `AUDIT CLAIMS CORRECTED — PROJECT VERIFICATION INCOMPLETE`
- `REPOSITORY DEFECT CONFIRMED — REPAIR OR RETEST REQUIRED`
- `BROWSER/RUNTIME VERIFICATION BLOCKED — NON-BROWSER EVIDENCE RECONCILED`
- `INDETERMINATE — CHECKOUT OR EVIDENCE INTEGRITY LIMITATION`

Use `AUDIT RECONCILED — NON-BROWSER CONTRACTS SUPPORTED` only when all non-browser reconciliation and stale-context closure gates pass. It does not imply browser verification.

Never use “all passed,” “all verified,” “zero defects,” or “fully closed” unless the specific evidence and scope genuinely support that statement. Distinguish confirmed defects from unsupported claims and unavailable verification. A green test suite is not proof that the whole repository is correct.

## Final response to the user

Summarize:
1. the primary verdict;
2. what stale-context policy was changed and which stale records were corrected/labeled;
3. which tests actually ran and passed/failed/blocked;
4. whether browser verification was possible;
5. the exact paths of all deliverables;
6. any blockers or decisions that remain.

Do not ask the user to approve the next phase. Continue autonomously within the safety and scope limits above.
