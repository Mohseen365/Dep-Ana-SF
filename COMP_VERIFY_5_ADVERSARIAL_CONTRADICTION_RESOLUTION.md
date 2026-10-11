# PHASE COMP-VERIFY-5: ADVERSARIAL CONTRADICTION RESOLUTION & REMEDIATION AUTHORIZATION GATE REPORT

**Phase:** COMP-VERIFY-5
**Date:** October 11, 2026
**Auditor:** Jules (Read-Only Adversarial Audit)
**Primary Deliverable:** `COMP_VERIFY_5_ADVERSARIAL_CONTRADICTION_RESOLUTION.md`

---

## A. Executive Verdict

**Verdict:** `PARTIALLY VERIFIED`

### Summary Evidence Supporting Verdict
1. **Movie / Movie-App Registration Reconciled:** Verified via direct manifest and resolver source inspection that `movie` and `movie-app` are **two distinct registered project IDs** in `project-manifest.json`. The claim in COMP-VERIFY-4 that `movie-app` is an alias for `movie` is **DISPROVED**. No alias mapping exists in resolver code or manifest definitions.
2. **Analysis-Output Pollution Causation Proven:** Verified that `scripts/test-architecture-snapshot.cjs` Test 10 invokes `analyze(FIXTURE_DIR, { maxGraphEdges: 10000 })` with `writeOutputs` defaulting to `true`, directly overwriting `analyze/explorer-data.json` with temporary 2-node / 2-edge fixture data (`sourcePath: "scripts/temp-snapshot-test-fixture"`). The test lacks teardown and snapshot/restore logic.
3. **Artifact Discrepancy Explained:** `analyze/explorer-data.json` (2 nodes / 2 edges) differs from `explorer/public/explorer-data.json` (4 nodes / 3 edges, `sourcePath: "tmp-integration-test/fixture"`) because `test-architecture-snapshot.cjs` pollutes `analyze/` without publishing to `explorer/public/`, leaving the public default artifact stale.
4. **Evidence Snapshot Security Bounded:** Inspected `repository-evidence-snapshot.cjs`. Verified it is read-only and safe for execution on hardcoded candidate paths. Bounded its security claims: it provides **lexical path containment** via `path.resolve()`, but does **not** perform realpath symlink traversal checks (`fs.realpathSync`).
5. **`fileHash` Contract Established:** Confirmed that `fileHash` is an optional/metadata property owned by `scripts/export-explorer.cjs` (`updateManifestWithExplorerData`). Empty `""` values in `project-manifest.json` represent incomplete manifest exports for 11 non-default projects rather than a broken core schema contract.
6. **Remediation Gate Decisions Rendered:** Evaluated 6 candidate remediations: 4 AUTHORIZED FOR A FUTURE IMPLEMENTATION PHASE, 1 NOT REQUIRED — CLAIM DISPROVED, 1 NOT AUTHORIZED — CONTRACT UNRESOLVED. Zero application code, manifests, graph artifacts, or test scripts were modified in COMP-VERIFY-5.

---

## B. Checkout Provenance

- **Repository Root:** `/workspace`
- **Current Branch:** `jules-8703275050900232628-440e0ccd`
- **HEAD Commit:** `70468d7` ("Add files via upload")
- **COMP-VERIFY-4 Checkout Commit:** `03b9945` ("docs: add COMP-VERIFY-4 repository truth audit report")
- **Git Working Tree Status Prior to Report:** Clean (`git status` reported nothing to commit, working tree clean).
- **Relationship to COMP-VERIFY-4 Checkout:** Commit `70468d7` deleted `COMP_VERIFY_4_REPOSITORY_TRUTH_AND_TEST_SIDE_EFFECTS_AUDIT.md` (committed in `03b9945`). All other application source, test scripts, public artifacts, and manifests are identical between the two checkouts.
- **Changed Files Since Previous Audit:** Only `COMP_VERIFY_4_REPOSITORY_TRUTH_AND_TEST_SIDE_EFFECTS_AUDIT.md` was removed in HEAD `70468d7`.

---

## C. Contradiction Register

| Contradiction ID | Disputed Claim in COMP-VERIFY-4 | Direct Source / Filesystem Evidence | Resolved Truth & Conclusion | Confidence & Evidence Standard |
|---|---|---|---|---|
| **CONTRAD-01** | `movie-app` is both an explicitly registered project ID AND an alias for `movie`. | `project-manifest.json` lines 67–90; `scripts/export-explorer.cjs` lines 50–180; `scripts/test-source-resolution.cjs`. | `movie` and `movie-app` are TWO SEPARATE registered project IDs. Neither `export-explorer.cjs` nor `project-manifest.json` contains any alias mapping equating `movie-app` to `movie`. Claim of aliasing is **DISPROVED**. | DIRECT SOURCE & MANIFEST EVIDENCE (100%) |
| **CONTRAD-02** | `analyze/explorer-data.json` contains 2 nodes / 2 edges while public inventory reports 4 nodes / 3 edges. | `analyze/explorer-data.json` (5593B, SHA-256: `98e00f54...`), `explorer/public/explorer-data.json` (9002B, SHA-256: `c35af1eb...`); `scripts/test-architecture-snapshot.cjs`. | `test-architecture-snapshot.cjs` Test 10 calls `analyze(FIXTURE_DIR)` which overwrites `analyze/explorer-data.json` with 2 nodes / 2 edges (`scripts/temp-snapshot-test-fixture`). It does not publish to `explorer/public/`, leaving `explorer/public/explorer-data.json` (4 nodes / 3 edges) stale. | DIRECT FILESYSTEM & SOURCE EVIDENCE (100%) |
| **CONTRAD-03** | `repository-evidence-snapshot.cjs` ensures filesystem containment via `path.resolve()`. | `repository-evidence-snapshot.cjs` lines 20–40. | `path.resolve(ROOT, relativePath)` performs purely lexical path resolution. It does NOT invoke `fs.realpathSync` to verify symlink targets. The script is safe for hardcoded relative candidate paths, but provides lexical containment, not realpath symlink containment. | DIRECT SOURCE EVIDENCE (100%) |
| **CONTRAD-04** | Empty `fileHash` values in `project-manifest.json` constitute a broken core schema defect. | `project-manifest.json` lines 165–250; `scripts/export-explorer.cjs` lines 1030–1110; `scripts/test-cli-integration.cjs`. | `fileHash` is populated by `updateManifestWithExplorerData()` during `export-explorer.cjs` runs. 11 projects have `""` because `project-manifest.json` was generated without running exports for all projects. Consumers load `analysisPath` directly; empty hashes indicate incomplete manifest population rather than a broken core schema. | DIRECT SOURCE & MANIFEST EVIDENCE (100%) |

---

## D. Movie Mapping Decision

### Definitive Adjudication Table

| Question | Required Result | Direct Evidence |
|---|---|---|
| **Is `movie` a registered ID?** | **YES** | `project-manifest.json` line 67: `{ "id": "movie", "name": "MOVIE", "sourcePath": "projects/movie", "analysisPath": "/projects/movie/explorer-data.json" }`. |
| **Is `movie-app` a registered ID?** | **YES** | `project-manifest.json` line 79: `{ "id": "movie-app", "name": "MOVIE-APP", "sourcePath": "projects/movie-app", "analysisPath": "/projects/movie-app/explorer-data.json" }`. |
| **Is `movie-app` an alias?** | **NO** | `movie` and `movie-app` exist as two separate registered entries in `project-manifest.json` with distinct `analysisPath` destinations. No resolver or normalization code defines `movie-app` as an alias for `movie`. |
| **What does each input resolve to?** | `"movie"` -> `projects/movie/explorer-data.json`<br>`"movie-app"` -> `projects/movie-app/explorer-data.json`<br>`"Movie App"` -> `"movie-app"` (via `slugify`) | `scripts/export-explorer.cjs` `parseArgs()` & `resolveInputFile()`; `scripts/test-source-resolution.cjs` Test 5 & Test C. |
| **What is each payload ID?** | `explorer/public/projects/movie/explorer-data.json` -> `project.id = "movie"`<br>`explorer/public/projects/movie-app/explorer-data.json` -> `project.id = "movie"` (stale payload ID from copy/export)<br>`explorer/public/explorer-data.json` -> `project.id = "default"` | Measured via Node.js JSON inspection of public artifact files on disk. |
| **Which persistent source paths exist?** | **NONE** | Neither `projects/movie` nor `projects/movie-app` exists as a persistent directory on the filesystem (`ls projects/` returns "No such file or directory"). |
| **Which paths are generated or ignored?** | `analyze/projects/movie` is explicitly **gitignored** (`.gitignore` line 1: `analyze/projects/movie`). `analyze/projects/movie/explorer-data.json` and `movie-app/explorer-data.json` are generated artifacts. | `.gitignore` inspection & `scripts/test-source-resolution.cjs` fixture generation. |
| **Which public artifacts exist?** | `explorer/public/projects/movie/explorer-data.json` (30,589 bytes, SHA-256: `900b4069...`) & `explorer/public/projects/movie-app/explorer-data.json` (30,589 bytes, SHA-256: `900b4069...`). | Direct filesystem measurement. |
| **Do the existing tests match the contract?** | **YES** | `scripts/test-multi-project.cjs` asserts `"Movie App"` slugifies to `"movie-app"` and creates `projects/movie-app/explorer-data.json`. `scripts/test-source-resolution.cjs` asserts `--project Movie` creates `projects/movie/explorer-data.json`. The tests correctly treat them as separate project IDs. |

---

## E. Analysis-Output Pollution Decision

### Causal Chain and Discrepancy Explanation

1. **Write Path Confirmation:** When `scripts/test-architecture-snapshot.cjs` Test 10 executes `analyze(FIXTURE_DIR, { maxGraphEdges: 10000 })`, it calls `analyze()` in `dependency-analyzer.cjs` programmatically without passing a 3rd parameter (`writeOutputs`).
2. **Default Output Target:** In `dependency-analyzer.cjs` (line 6446), `analyze(sourceDir, options, writeOutputs = true)` defaults `writeOutputs` to `true`. Because `OUTPUT_DIR` defaults to `path.join(BASE_OUTPUT_DIR, "analyze")` (`/workspace/analyze`), `analyze()` directly overwrites files in `/workspace/analyze/`.
3. **Overwritten Artifacts:** Overwrites `analyze/dependency-report.json`, `analyze/analysis-snapshot.json`, `analyze/analysis-manifest.json`, `analyze/architecture-snapshot.json`, `analyze/architecture-metrics.json`, `analyze/dependency-report.md`, `analyze/dependency-summary.md`, `analyze/dependency-graph.mmd`, `analyze/dependency-graph.dot`, `analyze/unresolved-references.md`, and `analyze/explorer-data.json`.
4. **Explicit Output Directory Support:** `dependency-analyzer.cjs` supports `--output-dir` via CLI or passing `writeOutputs = false` as the 3rd argument to `analyze()`.
5. **Teardown & Cleanup Disparity:** `scripts/test-architecture-snapshot.cjs` contains **zero** setup, teardown, or snapshot/restore logic for `analyze/`. (By contrast, `scripts/test-source-resolution.cjs` and `scripts/test-multi-project.cjs` implement `snapshotSharedFiles()` and `restoreSharedFiles()` in `finally` blocks).
6. **Current `analyze/explorer-data.json` Content:** Contains `sourcePath: "scripts/temp-snapshot-test-fixture"`, 2 nodes (`ApexClass:ClassA`, `ApexClass:ClassB`), 2 edges, size 5,593 bytes, SHA-256: `98e00f5407c6aa89f480667e7158fc98240c7303d6b2b379c7477c58f92693a1`.
7. **Direct Causation:** The observed 2-node / 2-edge artifact in `analyze/explorer-data.json` is 100% causally attributed to running `scripts/test-architecture-snapshot.cjs` Test 10.
8. **Public Artifact Independence:** `explorer/public/explorer-data.json` is independent of `test-architecture-snapshot.cjs`. It contains `sourcePath: "tmp-integration-test/fixture"`, 4 nodes (`SampleHelper`, `SampleService`, `demo`, `SampleTrigger`), 3 edges, size 9,002 bytes, SHA-256: `c35af1eb0c25d6fa276c6bc184bd354f1867c946ccc8d6376fa23b9edc0bbba0`.
9. **Stale Survival Mechanism:** `test-architecture-snapshot.cjs` overwrites `analyze/explorer-data.json` but does not invoke `export-explorer.cjs` or `publishProjectToExplorerAssets`. Thus, `explorer/public/explorer-data.json` remains untouched, surviving with the 4-node artifact from a prior integration test run.
10. **Environment Observation:** The pollution was observed directly in the committed checkout at commit `70468d7`.

---

## F. Evidence Snapshot Security Assessment

### Implementation Security Bounding (`repository-evidence-snapshot.cjs`)

- **Lexical Path Containment:** Uses `path.resolve(ROOT, relativePath)` on a hardcoded list of `candidateFiles`. This ensures that all inputs relative to `ROOT` resolve deterministically.
- **Symlink Traversal Behavior:** Uses standard `fs.existsSync(abs)`, `fs.statSync(abs)`, and `fs.readFileSync(abs)` which follow symbolic links. It does **not** call `fs.realpathSync(abs)` to confirm the target file physically resides within `ROOT`.
- **Time-Of-Check/Time-Of-Use (TOCTOU):** Performs sequential `existsSync` -> `statSync` -> `readFileSync`. While synchronous Node execution minimizes race conditions, a concurrent external process could replace a file between checks.
- **Subprocess Safety:** Calls `execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })` with strict array argument arrays (`['branch', '--show-current']`, `['status', '--porcelain=v1', '--untracked-files=all']`). No shell is invoked (`shell: false`), preventing shell injection.
- **Error Handling & JSON Bounds:** Safely wraps JSON parsing in `try ... catch` and truncates graph arrays (`nodes`/`edges` arrays are omitted; only metadata and top-level keys are extracted). Does not dump raw environment variables or system credentials.
- **Security Bounding Verdict:** Safe for read-only evidence collection against hardcoded repository relative paths. Security claims must be accurately bounded as providing **lexical path containment**, not realpath symlink containment.

---

## G. `fileHash` Contract Decision

1. **Contract Definition:** `fileHash` is defined in `project-manifest.json` under `artifacts[projectId].fileHash` as a string formatted as `"sha256:<hex_digest>"`.
2. **Ownership:** `scripts/export-explorer.cjs` (`updateManifestWithExplorerData`) owns computing and populating `fileHash` during project exports.
3. **Consumer Reliance:** Frontend consumers (`ProjectContext.tsx`, `useExplorerData.ts`) load project data directly via `fetch(project.analysisPath)` and do not require `fileHash` to be populated for basic rendering. CLI integration tests (`scripts/test-cli-integration.cjs`) assert hash equality when validating exported artifacts.
4. **Impact of Empty Values:** 11 non-default project artifact entries in `project-manifest.json` currently contain `"fileHash": ""`. This is an incomplete manifest population artifact resulting from adding project entries without running `export-explorer.cjs` for all 11 projects.
5. **Contract Decision:** Empty `fileHash` values do not constitute a broken schema or runtime error, but populating them completes manifest integrity.

---

## H. Test-Cleanup Safety Reassessment

| Test Script | Write Operations | Deletion / Restoration Logic | Teardown Mechanism | Confirmed Safety Level |
|---|---|---|---|---|
| `scripts/test-multi-project.cjs` | Writes to `temp-test-fixture-proj-a`, `temp-test-fixture-proj-b`, `analyze/temp-multi-project-analyze`, and shared manifests/assets. | `snapshotSharedFiles()` / `restoreSharedFiles()` restores all shared files; `cleanupFixtures()` deletes temp dirs. | `try ... finally` block | **SAFE** under normal execution. (Restoration bypassed if process killed via `SIGKILL`). |
| `scripts/test-source-resolution.cjs` | Writes to `temp-test-source-resolution` and transient `analyze/projects/movie/`. | `snapshotSharedFiles()` / `restoreSharedFiles()` restores all shared files; `cleanupFixtures()` deletes temp dir. | `try ... finally` block | **SAFE** under normal execution. |
| `scripts/test-pbim-dedicated-data-path.cjs` | Writes to `temp-test-export-pbim/explorer-data.json` with `skipManifest: true`. | `fs.rmSync(tempParent, { recursive: true, force: true })`. | `try ... finally` block | **SAFE** — zero mutation of live manifests or public assets. |
| `scripts/test-export-explorer.cjs` | Writes to `temp-test-fixture-realistic`. | `setupRealisticFixture()` cleans `FIXTURE_DIR` before running. | No `finally` cleanup | **PARTIALLY SAFE** — confined to `temp-test-fixture-realistic` dir, but leaves temp fixture files on disk after completion. |
| `scripts/test-architecture-snapshot.cjs` | Overwrites `analyze/explorer-data.json`, `analyze/dependency-report.json`, `analyze/analysis-manifest.json`, etc. | **NONE.** | **NONE.** | **DESTRUCTIVE / POLLUTING** — overwrites canonical `analyze/` artifacts with 2-node fixture without cleanup or isolation. |

---

## I. Artifact and Hash Verification

### Direct Filesystem Measurements (Calculated via Node.js `crypto`)

| File Path | Size (Bytes) | Calculated SHA-256 Hash | Internal `project.id` | Node Count | Edge Count |
|---|---|---|---|---|---|
| `analyze/explorer-data.json` | 5,593 | `98e00f5407c6aa89f480667e7158fc98240c7303d6b2b379c7477c58f92693a1` | `default` | 2 | 2 |
| `analyze/project-manifest.json` | 8,045 | `ad2c202caf313e911e04c13ecb7ac9aae0aaadc52678a03a02d55c4bd0d4ab89` | `manifest:default` | N/A | N/A |
| `explorer/public/explorer-data.json` | 9,002 | `c35af1eb0c25d6fa276c6bc184bd354f1867c946ccc8d6376fa23b9edc0bbba0` | `default` | 4 | 3 |
| `explorer/public/project-manifest.json` | 8,045 | `ad2c202caf313e911e04c13ecb7ac9aae0aaadc52678a03a02d55c4bd0d4ab89` | `manifest:default` | N/A | N/A |
| `explorer/public/pbim/explorer-data.json` | 4,253,560 | `395c23bd4b1dcd7bca6747010987f234083a3e83ab7f457fb9c41cdf042b013d` | `pbim` | 528 | 2063 |
| `explorer/public/projects/pbim/explorer-data.json` | 4,253,560 | `395c23bd4b1dcd7bca6747010987f234083a3e83ab7f457fb9c41cdf042b013d` | `pbim` | 528 | 2063 |
| `explorer/public/projects/pbim/analysis-manifest.json` | 1,973 | `d38bc9ec6bf434fd143c2686eadd14d348e66d2977c5874e420934ad5c189073` | N/A | N/A | N/A |
| `explorer/public/projects/movie/explorer-data.json` | 30,589 | `900b4069abffe45c858f221ed595c2749b919828390498670b5644f1af598743` | `movie` | 9 | 16 |
| `explorer/public/projects/movie/project-metadata.json` | 416 | `97abdcc1a82b101e356c8c2bc68937e82eef5eb961d63f6e7684e06952ee316c` | `movie` | N/A | N/A |
| `explorer/public/projects/movie-app/explorer-data.json` | 30,589 | `900b4069abffe45c858f221ed595c2749b919828390498670b5644f1af598743` | `movie` | 9 | 16 |
| `explorer/public/projects/movie-app/project-metadata.json` | 416 | `97abdcc1a82b101e356c8c2bc68937e82eef5eb961d63f6e7684e06952ee316c` | `movie` | N/A | N/A |
| `project-manifest.json` | 8,045 | `ad2c202caf313e911e04c13ecb7ac9aae0aaadc52678a03a02d55c4bd0d4ab89` | `manifest:default` | N/A | N/A |

### Key Artifact Identicality Confirmations
1. **PBIM Artifact Bit-for-Bit Identity:** `explorer/public/pbim/explorer-data.json` and `explorer/public/projects/pbim/explorer-data.json` have the **exact same SHA-256 hash** (`395c23bd4b1dcd7bca6747010987f234083a3e83ab7f457fb9c41cdf042b013d`) and byte length (4,253,560 B).
2. **Project Manifest Synchronization:** Root `project-manifest.json`, `analyze/project-manifest.json`, and `explorer/public/project-manifest.json` have the **exact same SHA-256 hash** (`ad2c202caf313e911e04c13ecb7ac9aae0aaadc52678a03a02d55c4bd0d4ab89`) and byte length (8,045 B).
3. **Movie vs Movie-App Public Artifacts:** `explorer/public/projects/movie/explorer-data.json` and `explorer/public/projects/movie-app/explorer-data.json` have the **exact same SHA-256 hash** (`900b4069abffe45c858f221ed595c2749b919828390498670b5644f1af598743`).

---

## J. Remediation Authorization Gate

| Candidate Fix | Proposed Remediation Action | Authorization Decision | Justification |
|---|---|---|---|
| **FIX-01** | Update `scripts/test-architecture-snapshot.cjs` Test 10 to pass `writeOutputs = false` (`analyze(FIXTURE_DIR, { maxGraphEdges: 10000 }, false)`) and add `snapshotSharedFiles()` / `restoreSharedFiles()` teardown. | **AUTHORIZED FOR A FUTURE IMPLEMENTATION PHASE** | Prevents test side-effect pollution of canonical `analyze/` artifacts while preserving test validation coverage. |
| **FIX-02** | Populate missing `fileHash` values for all 12 project artifacts in `project-manifest.json`. | **AUTHORIZED FOR A FUTURE IMPLEMENTATION PHASE** | Completes manifest artifact integrity tracking across all registered projects without changing schema structure. |
| **FIX-03** | Add `finally` fixture directory removal to `scripts/test-export-explorer.cjs` for `FIXTURE_DIR` (`temp-test-fixture-realistic`). | **AUTHORIZED FOR A FUTURE IMPLEMENTATION PHASE** | Ensures working tree cleanliness after test execution. |
| **FIX-04** | Re-export `explorer/public/projects/movie-app/explorer-data.json` with `--project movie-app` so internal `project.id` equals `"movie-app"`. | **AUTHORIZED FOR A FUTURE IMPLEMENTATION PHASE** | Aligns internal payload `project.id` with registered project ID `"movie-app"`. |
| **FIX-05** | Define `movie-app` as an alias of `movie` in code or manifest. | **NOT REQUIRED — CLAIM DISPROVED** | `movie` and `movie-app` are two distinct registered projects. Claimed aliasing is disproved. |
| **FIX-06** | Add synchronous `fs.realpathSync` calls inside `isPathContained()`. | **NOT AUTHORIZED — CONTRACT UNRESOLVED** | `isPathContained()` is a fast lexical path guard. Adding synchronous I/O or altering its lexical contract is unverified and risks regressions. |

*Note: Authorization in this report permits candidate fixes for future implementation phases, but explicitly forbids implementing them in COMP-VERIFY-5.*

---

## K. Explicit Non-Actions

1. **Zero Application Source Modifications:** No files in `explorer/src/`, `scripts/`, or root CJS scripts were modified.
2. **Zero Graph Artifact Regeneration:** No JSON graph payloads in `analyze/` or `explorer/public/` were regenerated or altered.
3. **Zero Manifest Updates:** `project-manifest.json`, `analyze/project-manifest.json`, and `explorer/public/project-manifest.json` were left untouched.
4. **Zero Layout / Architecture Contract Changes:** All layout, rendering, and geometry contracts remain 100% frozen.
5. **Zero Test Script Implementation Changes:** No test runner scripts or test assertions were modified.

---

## L. Evidence Standards Index

Every material statement in this report is grounded in:
- **DIRECT SOURCE EVIDENCE:** Line-level inspection of `scripts/export-explorer.cjs`, `dependency-analyzer.cjs`, `scripts/test-architecture-snapshot.cjs`, `repository-evidence-snapshot.cjs`.
- **DIRECT FILESYSTEM EVIDENCE:** Measured byte sizes, SHA-256 hashes, node/edge counts, and directory listings.
- **REPRODUCED EXECUTION:** Read-only Node.js inspection scripts calculating exact hash and size metrics.
