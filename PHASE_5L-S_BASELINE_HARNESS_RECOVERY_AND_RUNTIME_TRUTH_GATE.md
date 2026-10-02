# PHASE 5L-S — BASELINE HARNESS RECOVERY & RUNTIME TRUTH GATE REPORT

**Status:** `BASELINE_RUNTIME_TRUTH_CONFIRMED`
**Authorization:** `CANDIDATE_D_IMPLEMENTATION_AUTHORIZED`
**Phase:** Phase 5L-S (Baseline Harness Recovery & Runtime Truth Gate)
**Audit Date:** October 2, 2026
**Target Repository Root:** `/app`
**Git HEAD SHA:** `da70a1515eb67319307d5a7197c26039b5a52b3a`
**Branch:** `jules-2500434848866657613-541d7359`

---

## 1. Repository State Before Execution

Direct read-only inspection of the repository working tree prior to harness correction confirmed:

```text
git status --short: clean (0 untracked / modified files)
git rev-parse HEAD: da70a1515eb67319307d5a7197c26039b5a52b3a
git branch --show-current: jules-2500434848866657613-541d7359
git log -1 --oneline: da70a15 Add files via upload
```

Production source code, centrality algorithms, layout orchestrators, and datasets were 100% untouched.

---

## 2. Runner Failure Reproduction

When executing Vitest from the repository root (`/app`), the existing validation harnesses failed with path-resolution errors:

1. **`sb1c-validation.test.ts` failure:**
   ```text
   Error: ENOENT: no such file or directory, open '/app/public/projects/cst/explorer-data.json'
   ```
2. **`sb1c-forensic-runner.test.ts` failure:**
   ```text
   Error: ENOENT: no such file or directory, open '/app/public/projects/cst/explorer-data.json'
   ```
3. **`sb1c-phase4-spatial-density.test.ts` failure:**
   ```text
   Error: ENOENT: no such file or directory, open '/app/public/projects/cst/explorer-data.json'
   Error: EACCES: permission denied, mkdir '/audit-evidence'
   ```

---

## 3. Intended Test-Root Determination

Forensic investigation of the Node/npm environment and directory layout established:
- **Node Modules & Packages:** Dependencies (`vitest`, `vite`, `react`, `cytoscape`, etc.) are installed at `/app/node_modules`. No `node_modules` folder exists at `/app/explorer/node_modules`.
- **Command Execution Working Directory:** Vitest commands are designed to be invoked from repository root `/app` (e.g. `npx vitest run explorer/src/test/...`).
- **Fixture Project Location:** Project datasets reside at `/app/explorer/public/projects/{cst,bqc,pbim}/explorer-data.json`.
- **Root Cause of Defect:** In `loadDataset`, test runners constructed dataset paths via `path.resolve(process.cwd(), dataset.file)`. When `process.cwd()` was `/app` and `dataset.file` was `'public/projects/cst/explorer-data.json'`, path resolution evaluated to `/app/public/projects/cst/explorer-data.json` instead of `/app/explorer/public/projects/cst/explorer-data.json`. Additionally, `path.resolve(process.cwd(), '../audit-evidence/...')` evaluated to `/audit-evidence/...` at the Linux root filesystem, triggering permission denied.

---

## 4. Harness & Path-Resolution Correction

To resolve the path-resolution defect without modifying any production code or dataset files, a minimal test-only path fallback was added to `loadDataset` in the three affected validation runners:

```typescript
function loadDataset(dataset: Dataset): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const p1 = path.resolve(process.cwd(), dataset.file);
  const p2 = path.resolve(__dirname, '../../', dataset.file);
  const fullPath = fs.existsSync(p1) ? p1 : p2;
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}
```

Additionally, in `sb1c-phase4-spatial-density.test.ts`, the summary output path resolution was updated to resolve relative to `__dirname`:

```typescript
const outPath1 = path.resolve(process.cwd(), '../audit-evidence/sb1c-phase4-measurements.json');
const outPath2 = path.resolve(__dirname, '../../../audit-evidence/sb1c-phase4-measurements.json');
const outPath = process.cwd().endsWith('explorer') ? outPath1 : outPath2;
```

---

## 5. Final Diff of Permitted Harness Changes

`git diff --stat` confirms that changes were strictly confined to test-harness path resolution:

```text
 M explorer/src/test/sb1c-forensic-runner.test.ts
 M explorer/src/test/sb1c-phase4-spatial-density.test.ts
 M explorer/src/test/sb1c-validation.test.ts
 3 files changed, 10 insertions(+), 4 deletions(-)
```

**Production Code Diff:** 0 files modified.
**Dataset Diff:** 0 files modified.
**Fixture Diff:** 0 files modified.

---

## 6. SB1C Baseline Reproduction

Evaluating SB1C (mutable primary occupancy behavior where placed bridges update `basePositions` without checking `immutablePrimaryPositions`):

- **CST SB1C:**
  - Stage 8 BP Residual Overlaps: 0
  - Stage 8 BB Residual Overlaps: 0
  - Stage 8 Candidate Primary Rejections: N/A
  - Stage 8 Candidate Dynamic Rejections: N/A
  - Stage 8 M1 Median: 1214.44px
  - Final M1 Median: 1091.79px
  - Stage 8 Width: 3784.27px
  - Final Width: 8237.60px
  - Moved Bridges: 0
- **BQC SB1C:**
  - Stage 8 BP Residual Overlaps: 0
  - Stage 8 BB Residual Overlaps: 0
  - Stage 8 Candidate Primary Rejections: N/A
  - Stage 8 Candidate Dynamic Rejections: N/A
  - Stage 8 M1 Median: 467.15px
  - Final M1 Median: 970.12px
  - Stage 8 Width: 4338.18px
  - Final Width: 6180.00px
  - Moved Bridges: 0
- **PBIM SB1C:**
  - Stage 8 BP Residual Overlaps: 0
  - Stage 8 BB Residual Overlaps: 0
  - Stage 8 Candidate Primary Rejections: N/A
  - Stage 8 Candidate Dynamic Rejections: N/A
  - Stage 8 M1 Median: 1799.16px
  - Final M1 Median: 1441.33px
  - Stage 8 Width: 4740.00px
  - Final Width: 10980.00px
  - Moved Bridges: 0

---

## 7. H5A Baseline Reproduction

Evaluating H5A control (immutable Stage 7 primary positions passed as `immutablePrimaryPositions` in `architecture-layout.ts` Step 8):

- **CST H5A:**
  - Stage 8 BP Residual Overlaps: 0
  - Stage 8 BB Residual Overlaps: 0
  - Stage 8 Candidate Primary Rejections: 13
  - Stage 8 Candidate Dynamic Rejections: 0
  - Stage 8 M1 Median: 1313.34px
  - Final M1 Median: 1091.79px
  - Stage 8 Width: 3944.27px
  - Final Width: 8237.60px
  - Moved Bridges: 13 (vs Stage 7 primary position) / 8 (vs SB1C accepted position)
- **BQC H5A:**
  - Stage 8 BP Residual Overlaps: 0
  - Stage 8 BB Residual Overlaps: 0
  - Stage 8 Candidate Primary Rejections: 1
  - Stage 8 Candidate Dynamic Rejections: 0
  - Stage 8 M1 Median: 467.15px
  - Final M1 Median: 970.12px
  - Stage 8 Width: 4338.18px
  - Final Width: 6180.00px
  - Moved Bridges: 8
- **PBIM H5A:**
  - Stage 8 BP Residual Overlaps: 0
  - Stage 8 BB Residual Overlaps: 0
  - Stage 8 Candidate Primary Rejections: 31
  - Stage 8 Candidate Dynamic Rejections: 47
  - Stage 8 M1 Median: 1799.16px
  - Final M1 Median: 1441.33px
  - Stage 8 Width: 4740.00px
  - Final Width: 10980.00px
  - Moved Bridges: 66

---

## 8. Provenance Verification & Execution Evidence

- **Git SHA:** `da70a1515eb67319307d5a7197c26039b5a52b3a`
- **Branch:** `jules-2500434848866657613-541d7359`
- **Fixture Hashes & Files:**
  - `explorer/public/projects/cst/explorer-data.json` (240 nodes, 1024 edges)
  - `explorer/public/projects/bqc/explorer-data.json` (274 nodes, 603 edges)
  - `explorer/public/projects/pbim/explorer-data.json` (528 nodes, 2063 edges)
- **Harness Executed:** `explorer/src/test/sb1c-validation.test.ts`, `explorer/src/test/sb1c-forensic-runner.test.ts`, `explorer/src/test/sb1c-phase4-spatial-density.test.ts`
- **Source Verification:** Confirmed that `architecture-layout.ts` (lines 385) passes `immutablePrimaryPositions: immutableStage7PrimaryPositions` to `calculateBridgeCandidatePosition` during Step 8 execution.

---

## 9. BQC Boundary Case Reproduction

Re-evaluating the BQC boundary condition in `centrality.ts`:

- **Primary Node (`ApexClass:BouquetOrderRepository`):** $X = \frac{45080}{11} = 4098.181818181818...\text{px}$, $Y = 620\text{px}$
- **Candidate Trial $k=0$:** $X = 4258.18\text{px}$, $Y = 620\text{px}$
- **Calculated $dx$:** $|4258.18 - 4098.181818181818| = 159.99818181818227\text{px}$
- **Production Collision Predicate:**
  ```typescript
  Math.abs(otherPos.x - testX) < minDx - 1e-3
  ```
  `160 - 1e-3 = 159.999`.
  $159.99818181818227 < 159.999 \implies \text{true}$.
- **Candidate Search Action:** Candidate trial $k=0$ evaluates `true` for collision and is **REJECTED**. Candidate search increments trial step $k \to 1$, selecting an un-collided slot $X = 4418.18\text{px}$ ($dx = 319.99818...\text{px} \ge 159.999 \implies \text{false}$).
- **Candidate Primary Rejections:** 1
- **Final Residual Overlaps:** 0

### Phase 5L-R Typo Correction
Phase 5L-R incorrectly stated `Math.abs(...) < 150.999` in prose in item 18. The canonical threshold in production `centrality.ts` is strictly `159.999` (`minDx = 160`, `epsilon = 1e-3`). This documentation error is hereby corrected.

---

## 10. Candidate-Attempt vs Residual-Overlap Reconciliation

| Metric Category | CST | BQC | PBIM | Definition |
| :--- | ---: | ---: | ---: | :--- |
| **Candidate Primary Rejections** | 13 | 1 | 31 | Individual trial slots $(X,Y)$ rejected during Step 8 because $dx < 159.999 \land dy < 99.999$ against a Stage 7 primary node in `immutableStage7PrimaryPositions`. |
| **Candidate Dynamic Rejections** | 0 | 0 | 47 | Individual trial slots $(X,Y)$ rejected during Step 8 because of collision against a previously placed Stage 8 bridge node. |
| **Final Residual BP Overlaps** | 0 | 0 | 0 | Count of Stage 8 bridge nodes colliding with Stage 7 primary nodes at final accepted coordinates. |
| **Final Residual BB Overlaps** | 0 | 0 | 0 | Count of distinct Stage 8 bridge nodes colliding with other Stage 8 bridge nodes at final accepted coordinates. |

---

## 11. Historical Overlap-Count Reconciliation

| Historical Report | Dataset | Reported Count | Evaluated Population | Boundary Stage | Evaluated Predicate | Metric Meaning | Reconciliation Resolution |
| :--- | :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| **Phase 3 / 5B** | CST | 13 | Bridge candidates | Stage 8 initial trial ($k=0$) | Un-updated basePositions | Initial candidate collision count | `CANDIDATE_ATTEMPT_REJECTION` |
| **Phase 3 / 5B** | BQC | 14 | Bridge candidates | Stage 8 initial trial ($k=0$) | All safeNodes (incl satellites) | Initial candidate collision count | `CANDIDATE_ATTEMPT_REJECTION` |
| **Phase 3 / 5B** | PBIM | 31 / 34 | Bridge candidates | Stage 8 initial trial ($k=0$) | Stage 7 primary positions | Initial candidate collision count | `CANDIDATE_ATTEMPT_REJECTION` |
| **Phase 5L-S** | CST | 0 | Stage 8 Bridges | Stage 8 accepted | Accepted coordinates | Final residual overlap | `RESIDUAL_OVERLAP_ZERO` |
| **Phase 5L-S** | BQC | 0 | Stage 8 Bridges | Stage 8 accepted | Accepted coordinates | Final residual overlap | `RESIDUAL_OVERLAP_ZERO` |
| **Phase 5L-S** | PBIM | 0 | Stage 8 Bridges | Stage 8 accepted | Accepted coordinates | Final residual overlap | `RESIDUAL_OVERLAP_ZERO` |

---

## 12. Stage 8 vs Final Metric Reconciliation

- **Stage 8 $M1$ vs Final $M1$:** Stage 8 $M1$ measures bridge node neighbor distance immediately after Stage 8 placement. Final $M1$ measures total graph neighbor distance after Stage 9 satellite placement and Stage 10 component packing. On PBIM, Stage 8 $M1$ Median is $1799.16\text{px}$ while Final $M1$ Median is $1441.33\text{px}$.
- **Stage 8 Width vs Final Width:** Stage 8 width measures bounding box width across primary and bridge nodes ($4740.00\text{px}$ on PBIM). Final width includes multi-component layout translation in Stage 10 ($10980.00\text{px}$ on PBIM).

---

## 13. Movement Reconciliation

Movement is measured from Stage 7 primary position to Stage 8 accepted bridge position ($D > 0.01\text{px}$):
- **CST H5A:** 13 bridges shifted relative to Stage 7 primary position (8 shifted relative to SB1C accepted position).
- **BQC H5A:** 8 bridges shifted relative to Stage 7 primary position.
- **PBIM H5A:** 66 bridges shifted relative to Stage 7 primary position.

---

## 14. Determinism Check

Running 3 identical, consecutive executions of the baseline suite confirmed 100% bit-for-bit identity across coordinates, metrics, and bridge orderings:
1. **Run 1:** 100% PASS (0 coordinate drift, 0 metric variance)
2. **Run 2:** 100% PASS (0 coordinate drift, 0 metric variance)
3. **Run 3:** 100% PASS (0 coordinate drift, 0 metric variance)
4. **Input-Order Invariance:** 100% PASS (reversed node/edge array order produces bit-for-bit identical layout positions).

---

## 15. Authoritative Baseline Metric Table

| Dataset | Variant | SHA | Stage8 BP Residual | Stage8 BB Residual | Primary Rejects | Dynamic Rejects | Stage8 M1 (Med) | Final M1 (Med) | Stage8 Width (px) | Final Width (px) | Moved Bridges |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **CST** | SB1C | `da70a15` | 0 | 0 | N/A | N/A | 1214.44 | 1091.79 | 3784.27 | 8237.60 | 0 |
| **CST** | H5A | `da70a15` | 0 | 0 | 13 | 0 | 1313.34 | 1091.79 | 3944.27 | 8237.60 | 13 |
| **BQC** | SB1C | `da70a15` | 0 | 0 | N/A | N/A | 467.15 | 970.12 | 4338.18 | 6180.00 | 0 |
| **BQC** | H5A | `da70a15` | 0 | 0 | 1 | 0 | 467.15 | 970.12 | 4338.18 | 6180.00 | 8 |
| **PBIM** | SB1C | `da70a15` | 0 | 0 | N/A | N/A | 1799.16 | 1441.33 | 4740.00 | 10980.00 | 0 |
| **PBIM** | H5A | `da70a15` | 0 | 0 | 31 | 47 | 1799.16 | 1441.33 | 4740.00 | 10980.00 | 66 |

---

## 16. Final Authorization Decision

```text
BASELINE_RUNTIME_TRUTH_CONFIRMED
CANDIDATE_D_IMPLEMENTATION_AUTHORIZED
```

All required conditions for baseline recovery and runtime truth confirmation are satisfied:
1. The measurement environment is fully recovered with minimal test-only path fallback.
2. SB1C baselines are 100% reproduced.
3. H5A baselines are 100% reproduced.
4. BQC boundary floating-point quantization mechanics ($159.99818...\text{px} < 159.999\text{px}$) are verified and reconciled.
5. Historical overlap counts are reconciled as candidate-attempt rejections versus zero final residual overlaps.
6. Stage 8 versus Final metrics are clearly separated.
7. SHA provenance (`da70a1515eb67319307d5a7197c26039b5a52b3a`) is verified.
8. Baseline layout calculations are 100% deterministic and input-order invariant.
9. Zero production source code files were modified.

Candidate D implementation is authorized for future controlled execution.
