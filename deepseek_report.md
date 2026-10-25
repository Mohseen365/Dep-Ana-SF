# Stage 9 Geometry Regression Investigation Report

**Important scope limitation:** I do not have terminal access to `C:\Users\User\Downloads\dependency-analyzer`. I can only inspect the source files supplied in context (the test file, the layout pipeline, the metric evaluator, and the historical artifacts). I cannot execute `git status`, `git diff`, `git log`, `vitest`, or verify the protected file hash on disk. Every statement below is therefore **derived from static analysis of the supplied code** unless it is explicitly labeled _Historical / reported_.

I will clearly separate **confirmed facts from code**, **hypotheses**, and **diagnostics you must run**. I will not modify production code or assertions, because no conclusive defect is demonstrated from static analysis alone.

---

## 1. What the code confirms

### 1.1 The failing assertion path

`explorer/src/test/stage9-flat-spatial-bucket-index-ab.test.ts` → `it('6. Full-Pipeline Regression & Quality Gates Validation')`:

```ts
const fullResult = computeArchitectureLayoutWithMetadata(
  dataset.nodes,
  dataset.edges,
  {
    enableFeatureLayout: true,
  },
);
const evalMetrics = evaluateLayout(
  dataset.nodes,
  dataset.edges,
  fullResult.positions,
);

expect(evalMetrics.detailedCrossings?.primaryPrimaryCrossings).toBe(7812);
expect(evalMetrics.edgeCrossingCount).toBe(85367);
```

`evaluateLayout()` in `evaluate-layout.ts` calls `calculateDetailedEdgeCrossings()` in `metrics.ts` and asserts internal self-consistency:

```ts
totalGeometricCrossings === Σ{ primaryPrimary, primaryBridge, bridgeBridge, primarySatellite, satelliteSatellite }
```

`edgeCrossingCount = detailedCrossings.totalGeometricCrossings` (the sum of the five categories), **not** the standalone `edgeCrossingCount()` in `metrics.ts`.

### 1.2 The classification contract is deterministic on `(nodes, edges)`

In `calculateDetailedEdgeCrossings` (metrics.ts):

- `isSatellite` ⇐ `isSecondary(sourceId) || isSecondary(targetId)` where `isSecondary` is the local helper in that file (test node by `behavior.isTest`/file/test suffix, or `type ∈ {Field, CustomField}`).
- `isBridge` ⇐ `!isSatellite && srcDomain !== tgtDomain && srcDomain !== 'Shared' && tgtDomain !== 'Shared'`.
- `extractDomain(node)`: fields use `id.split('.')[0]`; other nodes strip a suffix from `Controller|Service|Selector|Repository|Handler|Helper|Test`; otherwise `'Shared'`.

Consequences that matter for the +22 delta:

1. **Reclassifying a segment between primary ↔ bridge** (via a domain-extraction change) does **not** alter `totalGeometricCrossings`; it shifts mass between `primaryPrimaryCrossings` and `primaryBridgeCrossings`. So a reclassification-only change is compatible with `edgeCrossingCount = 85367` still passing while `primaryPrimaryCrossings` drifts.
2. **A genuine new/removed geometric intersection** (via layout position change) raises/lowers both the specific category and `totalGeometricCrossings`.
3. **A shared-node exclusion change** (endpoints) cannot change counts without altering intersection geometry.

The provided `evaluate-layout.ts` self-audit will throw if the five categories don't sum to the total; the reported failure was a value mismatch, not a self-audit throw, so the internal accounting is intact.

### 1.3 The layout pipeline that produced the positions

`computeArchitectureLayoutWithMetadata(..., { enableFeatureLayout: true })` (architecture-layout.ts) selects `computeGlobalFeatureLayout` instead of `computeGlobalDomainLayout`, then feeds `featureMap` as the active spatial map into `reduceEdgeCrossings`, `computeLocalNodeLayout`, Stage 8 bridge refinement, and `placeSatellites`. Positions returned are `finalCleanupResult.positions` overlaid with any `existingPositions`. The pipeline is deterministic given `(nodes, edges, options)`, but it is **highly nonlinear** through the ordering sweep, the feature-layer Y map (`computeFeatureLayerYMap`), the bridge refinement loop, and the satellite permutation pass. The `phase5o-forensic-data.json` artifact confirms many bridges exhibit `DYNAMIC_CASCADE_EFFECT` and large `displacementStage7Final_CandD` values, i.e. small upstream changes translate into large downstream position changes.

### 1.4 Protected-file gate

`P0_VERIFICATION_BASELINE_REPORT.md` (supplied) records SHA-256 `e834467b…ec8bedb` **MATCH** at HEAD `2cc3c251…6ff586b`. I cannot re-verify from here. Any edit must re-check this first.

---

## 2. Honest status of the "+22" delta

| Question                                                  | Answer                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is 7834 vs 7812 reproducible from the supplied files?     | **No.** The canonical fixture `audit-fixtures/cloud-spend-tracker/explorer-data.json` is not supplied.                                                                                                                                   |
| Is the current metric self-audit (5-category sum) broken? | **No evidence** from the supplied code — the evaluator throws on mismatch; the reported failure was a value mismatch.                                                                                                                    |
| Is the layout pipeline deterministic?                     | Yes in code; whether the specific run producing 7834 is deterministic can only be proven by running it twice.                                                                                                                            |
| Did the layout code change after 7812 was recorded?       | **Unverifiable from here.** The prompt's own historical hints (`f8c5a049` added the test, `e2a5381c` types, `986bfeae` "Remediate Stage 2A") are consistent with a post-baseline layout change, but that is a **hypothesis**, not proof. |
| Did the metric contract change after 7812 was recorded?   | **Unverifiable from here.** `git blame` was reported in the prompt to attribute the current crossing logic to `465f4268` and the total-as-sum logic to `dc4c8781`. Whether either predates the 7812 baseline is not stated.              |

---

## 3. Plausible root-cause categories (ranked by code-level plausibility)

1. **Layout position drift introduced by a post-baseline layout change** (most likely per the pipeline's nonlinearity and the phase5o cascade evidence). Candidate sources inside the supplied code:
   - `global-layout.ts` → `computeFeatureLayerYMap` skips vertical advance for `rows === 0`. Any change to feature/domain classification can shift downstream Y coordinates and thus crossings.
   - `ordering.ts` → `reduceEdgeCrossings` has a `consecutiveNonImproving ≥ 2` early exit and clamps best state; small input perturbations (e.g. `domainOrder`, `layerYMap`) can select a different iteration as best.
   - `local-layout.ts` → barycentric sweeps and `!hasBucketOrder` hub-centering branch. Differences in whether a Wave 2B bucket is supplied flip the hub-centering behavior.
   - `spacing.ts` → outward-displacement propagation branch (`pR.x = Math.max(pR.x, pL.x + requiredDx)` when weights are equal) can propagate through dense bridges.
   - `satellites.ts` Stage 4 permutation uses full `evaluateTotalCrossings` and can flip a cluster's assignment.
2. **Metric reclassification** (bridge ↔ primary via `extractDomain` change, or satellite via `isSecondary` change). This keeps total constant. If your rerun shows `edgeCrossingCount` still at 85367 while `primaryPrimaryCrossings` drifted, this is the likely mechanism.
3. **Dataset drift** in `audit-fixtures/cloud-spend-tracker/explorer-data.json` (node/edge order, added/removed bridges or satellite-marked nodes). This can simultaneously move both `primaryPrimaryCrossings` and `edgeCrossingCount`.

The `phase5o-forensic-data.json` artifact shows wide divergence (`h5aVsCandD_Stage8`, `h5aVsCandD_Final`, dynamic cascade), which is consistent with (1) but is **not** proof — it compares two Stage 8 variants, not the pre/post baseline of the failing assertion.

---

## 4. Read-only diagnostics you must run

All commands from `C:\Users\User\Downloads\dependency-analyzer\explorer` (paths relative to `explorer/`). None modify state.

### 4.1 Preservation & protected-file gate

```powershell
git status --short
git rev-parse HEAD
git log -8 --oneline --decorate
Get-FileHash -Algorithm SHA256 ..\last_commit_changes.txt
```

Expected hash: `E834467BD4A5168F5B5DCC972C49D7456F0DF78D7121A1A491648FB33EC8BEDB`. If missing/mismatched, stop before any edit.

### 4.2 Historical diff of layout & metric files

```powershell
git diff e2a5381c..HEAD -- `
  src/lib/layout/metrics.ts `
  src/lib/layout/evaluate-layout.ts `
  src/lib/layout/satellites.ts `
  src/lib/architecture-layout.ts `
  src/lib/layout/ordering.ts `
  src/lib/layout/global-layout.ts `
  src/lib/layout/local-layout.ts `
  src/lib/layout/spacing.ts `
  src/lib/layout/components.ts `
  src/test/stage9-flat-spatial-bucket-index-ab.test.ts

git show --stat --oneline 986bfeae
git show 986bfeae -- src/lib/architecture-layout.ts src/lib/layout/ordering.ts src/lib/layout/global-layout.ts src/lib/layout/local-layout.ts
git log --oneline --follow -- src/lib/layout/metrics.ts
git log --oneline --follow -- src/lib/architecture-layout.ts
git log --oneline --follow -- audit-fixtures/cloud-spend-tracker/explorer-data.json
```

Rerun the earlier "empty diff" comparison **without** the `explorer/` prefix. Verify whether `f8c5a049`, `e2a5381c`, `986bfeae` sit before or after the commit that first recorded `7812`.

### 4.3 Narrow reproduction of the failing assertion

Save a temporary script (unique name, e.g. `tmp/investigate-stage9-crossings.cjs`) that:

1. Loads `dataset` from `audit-fixtures/cloud-spend-tracker/explorer-data.json` (same normalization as the test: `rawParsed.data ? rawParsed.data : rawParsed`).
2. Calls `computeArchitectureLayoutWithMetadata(dataset.nodes, dataset.edges, { enableFeatureLayout: true })` **twice** to verify determinism.
3. Calls `evaluateLayout` on both results and prints:
   - all five crossing categories
   - `edgeCrossingCount`
   - `primaryOverlapCount`, `satelliteOverlapCount`, `layerViolationCount`, `minClearance`
   - the count of `detailedCrossings` pairs where one segment changed primary↔bridge vs the current test run (requires storing two runs)
4. Dump `fullResult.positions` to `tmp/positions-<runid>.json` for both runs.

Run under `vitest` (not plain `node`, since the test uses ESM TS imports) — easiest is a throwaway `*.test.ts` file with a single `it`. This isolates Test 6 only; skip the 10‑minute scale-tier test 5.

### 4.4 Decide between layout-drift vs metric-reclassification

- If **total** `edgeCrossingCount` also drifted from `85367` → layout drift. Compare `positions-<runA>.json` against a historical snapshot if one exists (`git log --oneline -- audit-fixtures/…` and `git show <commit>:audit-fixtures/cloud-spend-tracker/explorer-data.json` — read-only).
- If **total is unchanged** and only `primaryPrimaryCrossings` drifted → metric reclassification. Diff the five categories between the current run and (if available) any historical snapshot of `detailedCrossings`. Then audit `extractDomain` and `isSecondary` against the commit at which the baseline was recorded.
- If **both** drift → layout drift, and metric changes must be ruled out separately via `git diff` on `metrics.ts` alone.

### 4.5 Report but do not act on the separate Stage 9 A/B finding

The supplied test's Test 5 candidate/oracle equivalence passes are **not** the same defect as Test 6. Do not promote the flat spatial-bucket candidate or touch production `satellites.ts` based on Test 6 alone.

---

## 5. Recommended action sequence (no edits until evidence lands)

1. Verify protected-file hash and preserve working tree (§4.1).
2. Rerun the corrected historical diff (§4.2). Confirm whether any of `metrics.ts`, `evaluate-layout.ts`, or `architecture-layout.ts`/stage files changed **after** the commit that introduced the `7812` assertion.
3. Run the isolated Test 6 reproduction twice (§4.3) to confirm determinism and to capture the five-category breakdown plus a positions dump.
4. Branch on §4.4:
   - **Layout drift proven** → bisect the layout file diff from §4.2 to the smallest commit that first produced 7834 on the canonical fixture. Propose a minimal correction only after that commit is identified, and re-validate Test 6, the Stage 9 A/B suite, and related layout tests.
   - **Metric reclassification proven** → fix the underlying classification (e.g., `extractDomain` suffix set or satellite predicate) without touching the crossing arithmetic, add a focused unit test for the reclassified segment pair, re-validate.
   - **Baseline stale** → do not edit assertions. Produce the independent evidence and route for coordinated review of every artifact asserting `7812`/`85367`.
   - **Evidence still insufficient** → leave code and tests untouched and report the smallest next diagnostic needed.
5. Only after a justified fix: run the narrow Test 6, then the full Stage 9 A/B file (budget ~10 min for Test 5), then the layout test suite, then recheck TypeScript diagnostics. Report timeouts, skipped tests, and missing browser binaries separately from code failures.

---

## 6. What I explicitly cannot claim

- I cannot confirm that 7834 is the current value on your checkout.
- I cannot confirm that `edgeCrossingCount` remains 85367 in the failing run.
- I cannot confirm whether the layout or the metric (or the fixture) regressed.
- I cannot confirm that the protected-file hash still matches.
- I cannot confirm that any historical commit bisect would produce a clean, minimal correction.

These are the exact gaps the diagnostics in §4 are designed to close. Do not weaken, skip, or delete assertions, and do not update `7812`/`85367` without explicit authorization and independent proof of the intended contract.
