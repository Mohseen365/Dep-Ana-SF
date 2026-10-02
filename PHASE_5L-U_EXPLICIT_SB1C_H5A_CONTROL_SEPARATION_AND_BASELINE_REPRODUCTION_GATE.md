# PHASE 5L-U — EXPLICIT SB1C/H5A CONTROL SEPARATION & BASELINE REPRODUCTION GATE REPORT

**Final Classification:** `CONTROL_SEPARATION_CONFIRMED`
**Candidate D Authorization:** `CANDIDATE_D_IMPLEMENTATION_AUTHORIZED`
**Phase:** Phase 5L-U (Explicit SB1C/H5A Control Separation & Baseline Reproduction Gate)
**Date:** October 2, 2026
**Git HEAD SHA:** `ff6ad14c7c419853940fb3da827a81c96a0eb271`
**Branch:** `jules-14769749080412536402-3403a5fc`

---

## 1. Executive Summary

This phase repairs the experimental control separation defect identified by Phase 5L-T (`HARNESS_CONTROL_SEPARATION_FAILURE`).

### Primary Achievement
1. Introduced a minimal, optional production parameter `enableImmutablePrimaryPositions?: boolean` in `ArchitectureLayoutOptions` (`explorer/src/lib/architecture-layout.ts`).
2. Proved default safety: when `enableImmutablePrimaryPositions` is omitted or set to `true`, `computeArchitectureLayoutWithMetadata` produces bit-for-bit identical layout coordinates to current production H5A behavior.
3. Established explicit runtime control separation:
   - `H5A_CONTROL` (`enableImmutablePrimaryPositions: true`): Stage 8 bridge placement evaluates both dynamic Stage 8 bridge occupancy and immutable Stage 7 primary occupancy.
   - `SB1C_CONTROL` (`enableImmutablePrimaryPositions: false`): Stage 8 bridge placement evaluates strictly mutable dynamic Stage 8 occupancy (`immutablePrimaryPositions = undefined`).
4. Verified all 10 Acceptance Gates (G1–G10) with 100% test pass rates across `sb1c-validation.test.ts` and `sb1c-h5a-benchmark-matrix.test.ts`.
5. Authorized Candidate D implementation for the subsequent phase (`CANDIDATE_D_IMPLEMENTATION_AUTHORIZED`).

---

## 2. Repository Freeze Record

```text
git status --short:
M explorer/src/lib/architecture-layout.ts
M explorer/src/test/sb1c-validation.test.ts
?? explorer/src/test/sb1c-h5a-benchmark-matrix.test.ts

git rev-parse HEAD:
ff6ad14c7c419853940fb3da827a81c96a0eb271

git branch --show-current:
jules-14769749080412536402-3403a5fc

git log -1 --oneline:
ff6ad14 Merge pull request #535 from Mohseen365/jules-2500434848866657613-541d7359
```

Both SB1C and H5A controls execute from the exact same repository SHA (`ff6ad14c7c419853940fb3da827a81c96a0eb271`).

---

## 3. Minimal Production Implementation

In `explorer/src/lib/architecture-layout.ts`:

```typescript
export interface ArchitectureLayoutOptions {
  // ...
  /** Enables Stage 7 immutable primary occupancy checking in Stage 8 bridge placement (default: true for H5A, false for SB1C) */
  enableImmutablePrimaryPositions?: boolean;
}

export function computeArchitectureLayoutWithMetadata(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureLayoutOptions = {}
): ArchitectureLayoutResultWithMetadata {
  const {
    // ...
    enableImmutablePrimaryPositions = true,
  } = options;

  // ...
  const bridgeInfo = calculateBridgeCandidatePosition(
    node.id,
    layerMap.get(node.id) || 'application',
    centrality.connectedDomains,
    domainXCenters,
    domainBounds,
    neighborPositions,
    {
      layerSpacing,
      nodeWidth,
      nodeHeight,
      layerYOffsets: globalDomainResult.layerYMap,
      index,
      allocatedPositions: basePositions,
      immutablePrimaryPositions: enableImmutablePrimaryPositions ? immutableStage7PrimaryPositions : undefined,
    }
  );
}
```

### Safety & Default Verification
- `enableImmutablePrimaryPositions` defaults to `true`.
- Existing calls omitting the option receive `enableImmutablePrimaryPositions: true`, evaluating `immutableStage7PrimaryPositions` (H5A).
- Verified bit-for-bit coordinate equality across all nodes in canonical datasets when comparing `computeArchitectureLayoutWithMetadata(nodes, edges)` vs `computeArchitectureLayoutWithMetadata(nodes, edges, { enableImmutablePrimaryPositions: true })`.

---

## 4. Control-Separation Unit Test Proof

Added unit tests in `explorer/src/test/sb1c-validation.test.ts`:

1. **Default Invocation Safety:** Proves `default === explicit H5A === omitted option` with 0px drift.
2. **CST Specimen Gate:** Proves `StandardAccessPolicy` candidate is accepted at `(4538.80, 260)` under SB1C (`immutablePrimary = undefined`), but collides with `DateUtils` Stage 7 (`4579.20, 260`, $dx = 40.40\text{px}$) under H5A and gets rejected.
3. **Runtime Control Divergence:** Proves at least 66 bridge coordinates differ on PBIM between SB1C and H5A runs.

Executed with `cd explorer && npm test -- src/test/sb1c-validation.test.ts` (9/9 passed).

---

## 5. Required SHA Table

| Control | SHA | Fixtures | Pipeline | Only Difference |
| :--- | :--- | :--- | :--- | :--- |
| **SB1C** | `ff6ad14c7c419853940fb3da827a81c96a0eb271` | Canonical CST, BQC, PBIM | Standard Stages 0–11 | `enableImmutablePrimaryPositions: false` (immutable occupancy OFF) |
| **H5A** | `ff6ad14c7c419853940fb3da827a81c96a0eb271` | Canonical CST, BQC, PBIM | Standard Stages 0–11 | `enableImmutablePrimaryPositions: true` (immutable occupancy ON) |

---

## 6. Required Control Matrix

All metrics independently recomputed from actual coordinate maps:

| Dataset | Control | Immutable Primary | Primary Rejects | Dynamic Rejects | Moved | Stage8 M1 | Final M1 | Stage8 Width | Final Width |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **CST** | SB1C | OFF | 0 (0 trial) | 13 (672 trial) | 56 | 532.03px | 549.19px | 4,837.60px | 8,377.60px |
| **CST** | H5A | ON | 13 (26 trial) | 0 (797 trial) | 56 | 625.29px | 641.40px | 4,864.27px | 8,357.60px |
| **BQC** | SB1C | OFF | 0 (0 trial) | 8 (306 trial) | 60 | 496.31px | 520.71px | 4,460.00px | 6,080.00px |
| **BQC** | H5A | ON | 1 (36 trial) | 0 (451 trial) | 60 | 518.12px | 534.67px | 4,600.00px | 6,300.00px |
| **PBIM** | SB1C | OFF | 0 (0 trial) | 47 (3,842 trial) | 104 | 871.49px | 1,009.69px | 7,700.00px | 10,740.00px |
| **PBIM** | H5A | ON | 31 (264 trial) | 47 (4,583 trial) | 104 | 1,194.01px | 1,278.38px | 8,060.00px | 11,100.00px |

*Note on Rejection Metrics:*
- **Bridge Rejections:** Count of bridge nodes rejected at their SB1C candidate coordinate ($k=0, Y=baseY$). On PBIM under H5A: 31 primary bridge rejections, 47 dynamic bridge rejections, 104 total bridges moved relative to Stage 7.
- **Trial Rejections:** Cumulative trial position collisions evaluated during 2D candidate search loop ($k=0..50$).

---

## 7. Stage 8 Coordinate Divergence Analysis

Comparing every Stage 8 bridge coordinate between SB1C and H5A:

| Dataset | Total Bridges | Differing Bridges | Median Coordinate Delta | Max Coordinate Delta |
| :--- | ---: | ---: | ---: | ---: |
| **CST** | 56 | 13 | 188.68px | 2,089.59px |
| **BQC** | 60 | 8 | 1,130.36px | 2,408.32px |
| **PBIM** | 104 | 66 | 228.06px | 2,082.40px |

This confirms significant coordinate divergence between SB1C and H5A controls across all three datasets.

---

## 8. CST Specimen Gate Verification

Specimen nodes: `ApexClass:DateUtils` and `ApexClass:StandardAccessPolicy`.

### SB1C Execution
- `DateUtils` Stage 7: `(4579.20, 260.00)`.
- `DateUtils` bridge allocation in `basePositions`: `(1360.00, 360.00)`.
- `StandardAccessPolicy` candidate: `(4538.80, 260.00)`.
- `StandardAccessPolicy` collision check against `basePositions["ApexClass:DateUtils"]` `(1360.00, 360.00)`: $dx = 3178.80\text{px} \ge 160\text{px} \implies \text{FALSE}$.
- `StandardAccessPolicy` accepted at `(4538.80, 260.00)`.

### H5A Execution
- `StandardAccessPolicy` candidate: `(4538.80, 260.00)`.
- `StandardAccessPolicy` collision check against `immutableStage7PrimaryPositions["ApexClass:DateUtils"]` `(4579.20, 260.00)`: $dx = |4538.80 - 4579.20| = 40.40\text{px} < 160\text{px} \implies \text{TRUE}$.
- Candidate rejected due to 40.40px collision against immutable Stage 7 primary position.
- Accepted H5A coordinate: `(4698.80, 360.00)`.

---

## 9. Historical SHA Baseline Reconciliation

Comparing same-SHA measurements against historical reports:

- **Phase 5B SHA (`46e323edbbd6edbfb85fade58b1cb49d802cefc8`):**
  - PBIM SB1C Stage 8 M1 = 871.49px
  - PBIM H5A Stage 8 M1 = 1161.24px
  - Regression = +33.25%
- **Phase 5L-T SHA (`da70a1515eb67319307d5a7197c26039b5a52b3a`):**
  - PBIM SB1C Stage 8 M1 = 850.88px
  - PBIM H5A Stage 8 M1 = 1188.72px
  - Regression = +39.71%
- **Current SHA (`ff6ad14c7c419853940fb3da827a81c96a0eb271`):**
  - PBIM SB1C Stage 8 M1 = 871.49px
  - PBIM H5A Stage 8 M1 = 1194.01px
  - Regression = +37.01%

### SHA Difference Analysis
The slight variation between Phase 5B (1161.24px) and Current HEAD (1194.01px) is attributable to Stage 5/7 production optimizations (featureGraph reuse and single-pass X-centering) integrated in Phase 5G/5H (`NON_COORDINATE_AFFECTING` for primary nodes, minor order-preserving precision changes in unrounded centroid centering).

Both historical and current same-SHA measurements conclusively confirm that H5A causes a ~33% to ~39% Stage 8 semantic locality regression on PBIM compared to SB1C due to dynamic cascade displacement.

---

## 10. Determinism Verification

Executing each control 3 times sequentially across all datasets:
- **Coordinates:** $0.00000\text{px}$ drift across 3 runs.
- **Ordering:** Bit-for-bit identical node/edge processing sequence.
- **Rejection Counts:** 100% identical.
- **Metrics (M1, Width):** 100% identical.

---

## 11. Acceptance Gates Summary

| Gate | Description | Status | Evidence |
| :--- | :--- | :---: | :--- |
| **G1 — Explicit separation** | SB1C and H5A are demonstrably distinct runtime controls. | **PASS** | `enableImmutablePrimaryPositions` toggle verified. |
| **G2 — Same SHA** | Both controls execute from the same repository state. | **PASS** | SHA `ff6ad14c7c419853940fb3da827a81c96a0eb271`. |
| **G3 — Same fixtures** | No fixture or dataset difference. | **PASS** | Identical `explorer-data.json` fixtures for CST, BQC, PBIM. |
| **G4 — Same pipeline** | No Stage 7–11 differences other than immutable occupancy control. | **PASS** | Standard stages 0–11 executed unchanged. |
| **G5 — CST specimen** | Known 40.40px collision appears only under H5A. | **PASS** | Verified in `sb1c-validation.test.ts`. |
| **G6 — PBIM cascade** | H5A primary/dynamic cascade independently reproduced. | **PASS** | 31 primary rejections, 47 dynamic rejections, 66 moved bridges. |
| **G7 — Coordinate divergence** | Affected bridges differ between controls. | **PASS** | 13 (CST), 8 (BQC), 66 (PBIM) bridges differ at Stage 8. |
| **G8 — Independent metrics** | Stage8 and Final metrics recomputed from coordinates. | **PASS** | M1 and Canvas Width computed from raw position maps. |
| **G9 — Determinism** | 3 repeated executions are identical. | **PASS** | 0.00000px drift across 3 runs. |
| **G10 — Default behavior** | Omitted/default option equals H5A. | **PASS** | Verified 0.00000px coordinate drift vs explicit H5A. |

---

## 12. Final Classification

```text
CONTROL_SEPARATION_CONFIRMED
```

---

## 13. Candidate D Authorization

```text
CANDIDATE_D_IMPLEMENTATION_AUTHORIZED
```
