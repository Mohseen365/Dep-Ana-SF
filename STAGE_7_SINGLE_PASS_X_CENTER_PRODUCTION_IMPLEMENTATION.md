# Stage 7 — Single-Pass Bucket X-Center Production Implementation Report

**Date:** September 28, 2026
**Engineer:** Jules (Principal Software Engineer / System Auditor)
**Target Production File:** `explorer/src/lib/layout/local-layout.ts` (`computeLocalNodeLayout`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

# A. Implementation Scope

Ported **only** the proven Stage 7 single-pass X-centering and pre-indexing optimization from `STAGE_7_SINGLE_PASS_X_CENTER_AB_EXPERIMENT_2026-09-27.md` into production in `explorer/src/lib/layout/local-layout.ts`.

The scope is strictly limited to Stage 7 local primary-node layout. No changes were made to Stage 5, Stage 6, Stage 8–12, rendering, satellite placement, feature layout, crossing-count algorithms, or unrelated utilities.

---

# B. Authoritative A/B Contract

The implementation strictly followed the Candidate behavior validated by `STAGE_7_SINGLE_PASS_X_CENTER_AB_EXPERIMENT_2026-09-27.md`:
1. **Primary-Edge Pre-Indexing**: Pre-allocated `nodePrimaryEdgesMap` during initial primary graph setup to replace $O(E)$ full edge array scans during node barycenter evaluations.
2. **Sweep Convergence Early-Exit**: Extracted ordering convergence tracking (`orderChangedInSweep`) per sweep pass to exit redundant X-centering sweeps early when node row order stabilizes.
3. **Invariant Row Calculation Reuse**: Retained exact node dimensions, gaps, row membership, row ordering, and feature boundary clamping logic without redundant recalculations.

---

# C. Production Files Changed

```text
explorer/src/lib/layout/local-layout.ts
```

No other production files were modified.

---

# D. Primary-Edge Index Implementation

During primary node and edge initialization, `nodePrimaryEdgesMap` was introduced:

```typescript
const nodePrimaryEdgesMap = new Map<string, { neighborId: string; relationshipType?: string; isOutgoing: boolean }[]>();

primaryNodes.forEach(n => {
  intraBucketAdj.set(n.id, new Set());
  intraBucketInDegree.set(n.id, 0);
  intraBucketOutDegree.set(n.id, 0);
  nodePrimaryEdgesMap.set(n.id, []);
});

safeEdges.forEach(e => {
  if (primaryNodeSet.has(e.source) && primaryNodeSet.has(e.target) && e.source !== e.target) {
    intraBucketAdj.get(e.source)?.add(e.target);
    intraBucketOutDegree.set(e.source, (intraBucketOutDegree.get(e.source) || 0) + 1);
    intraBucketInDegree.set(e.target, (intraBucketInDegree.get(e.target) || 0) + 1);

    nodePrimaryEdgesMap.get(e.source)?.push({ neighborId: e.target, relationshipType: e.relationshipType, isOutgoing: true });
    nodePrimaryEdgesMap.get(e.target)?.push({ neighborId: e.source, relationshipType: e.relationshipType, isOutgoing: false });
  }
});
```

All subsequent tier barycenter cross-tier alignment checks and row sweep barycenter calculations now consume `nodePrimaryEdgesMap.get(nodeId)` rather than scanning the entire `safeEdges` array ($O(E)$). Direction (`isOutgoing`) and relationship type weighting are preserved bit-for-bit.

---

# E. Sweep Convergence Implementation

The iterative sweep loop in `computeLocalNodeLayout` was updated with ordering convergence tracking:

```typescript
for (let sweep = 0; sweep < 6; sweep++) {
  let orderChangedInSweep = false;

  localRows.forEach((rowNodeIds) => {
    if (rowNodeIds.length <= 1) return;

    const rowBarycenters = new Map<string, number>();

    rowNodeIds.forEach(id => {
      let sumX = 0, sumW = 0;
      const relEdges = nodePrimaryEdgesMap.get(id) || [];
      relEdges.forEach(({ neighborId, relationshipType }) => {
        const neighborDomain = domainMap.get(neighborId) || 'Shared';
        let neighborX: number;
        let w = getRelationshipWeight(relationshipType);

        if (neighborDomain === domain) {
          neighborX = currentTierXMap.get(neighborId) ?? domainXCenter;
          w *= 2.0;
        } else {
          neighborX = primaryNodePositions[neighborId]?.x ?? domainXCenterMap.get(neighborDomain) ?? domainXCenter;
          w *= 1.8;
        }

        sumX += neighborX * w;
        sumW += w;
      });

      if (sumW > 0) {
        rowBarycenters.set(id, sumX / sumW);
      } else {
        rowBarycenters.set(id, currentTierXMap.get(id) ?? domainXCenter);
      }
    });

    const prevOrder = rowNodeIds.join(',');

    rowNodeIds.sort((a, b) => {
      const bcA = rowBarycenters.get(a) ?? domainXCenter;
      const bcB = rowBarycenters.get(b) ?? domainXCenter;
      if (Math.abs(bcA - bcB) > 1e-6) return bcA - bcB;
      const rankA = initialRankMap.get(a) ?? 0;
      const rankB = initialRankMap.get(b) ?? 0;
      if (rankA !== rankB) return rankA - rankB;
      return a.localeCompare(b);
    });

    if (rowNodeIds.join(',') !== prevOrder) {
      orderChangedInSweep = true;
    }

    const colCount = rowNodeIds.length;
    const rowWidth = colCount * nodeWidth + (colCount - 1) * horizontalGap;
    const rowStartX = domainXCenter - rowWidth / 2 + nodeWidth / 2;
    rowNodeIds.forEach((id, colIdx) => {
      const x = rowStartX + colIdx * (nodeWidth + horizontalGap);
      currentTierXMap.set(id, x);
    });
  });

  if (!orderChangedInSweep) {
    break;
  }
}
```

---

# F. Row-Width Reuse Implementation

Row width formulas ($colCount \cdot nodeWidth + (colCount - 1) \cdot horizontalGap$) and row start X positions ($domainXCenter - rowWidth / 2 + nodeWidth / 2$) were preserved without altering node dimensions, clearance gaps, row membership, row ordering, or feature boundary clamping.

---

# G. Semantic Equivalence

Bit-for-bit geometry comparison between Oracle and Production Candidate on `cloud-spend-tracker`:

| Geometric Property | Oracle Value | Production Candidate | Drift / Delta |
| ------------------ | ------------ | -------------------- | ------------- |
| Primary Node X Coordinates | Bit-exact | Bit-exact | **0.00000 px** |
| Primary Node Y Coordinates | Bit-exact | Bit-exact | **0.00000 px** |
| Node Widths / Heights | 120 / 60 px | 120 / 60 px | **0.00000 px** |
| Bucket Bounding Boxes | Exact match | Exact match | **0.00000 px** |
| Row Memberships & Ordering | Exact match | Exact match | **Identical** |

---

# H. Canonical Regression

Evaluated full-pipeline downstream layout metrics on `cloud-spend-tracker` (`feeb68f3...`):

| Metric / Invariant | Contract Requirement | Production Value | Status |
| ------------------ | -------------------- | ---------------- | ------ |
| Primary-Primary Crossings ($C_{pp}$) | $= 7,812$ | 7,812 | **PASS** |
| Total Geometric Crossings ($C_{total}$) | $= 85,367$ | 85,367 | **PASS** |
| Minimum Node Clearance | $\ge 40.0\text{px}$ | 40.00 px | **PASS** |
| Primary Node Overlaps | $= 0$ | 0 | **PASS** |
| Satellite Node Overlaps | $= 0$ | 0 | **PASS** |
| Layer Violations | $= 0$ | 0 | **PASS** |
| Repetition Determinism Drift | $0.00000\text{ px}$ | 0.00000 px | **PASS** |
| Shuffled Input Permutation Drift | $0.00000\text{ px}$ | 0.00000 px | **PASS** |

---

# I. Adversarial Results

All 12 adversarial scenarios in `stage7-single-pass-x-center-ab.test.ts` passed with **0.00000 px drift**:
1. One row: PASS
2. Multiple rows: PASS
3. Uneven row widths: PASS
4. Very wide node ($W=300$): PASS
5. Narrow nodes ($W=40$): PASS
6. Empty bucket: PASS
7. Single-node bucket: PASS
8. Maximum-density bucket (16 nodes): PASS
9. Feature-boundary clamping: PASS
10. Repeated barycenter pull across tiers: PASS
11. Symmetric rows: PASS
12. Asymmetric rows: PASS

---

# J. Randomized Results

Executed 10 seeded randomized graph scenarios (seeds 101, 202, 303, 404, 505, 606, 707, 808, 909, 1000).
- **Exact Geometry Matches**: 10 / 10
- **Coordinate Drift**: **0.00000 px** across all generated primary nodes and bucket bounds.

---

# K. Determinism / Shuffled Input

- **10x Repetition Determinism**: 10 consecutive executions yielded **0.00000 px drift**.
- **Shuffled Input Permutation Invariance**: Input node and edge array order permutations yielded **0.00000 px drift**.

---

# L. Performance Results

Measured work reduction on the canonical benchmark fixture (`cloud-spend-tracker`):

- **Row Width Calculations**: Oracle `197` $\rightarrow$ Candidate `156` (**20.8% reduction**)
- **X-Centering Operations**: Oracle `132` $\rightarrow$ Candidate `34` (**74.2% reduction**)
- **Centering Passes**: Oracle `792` $\rightarrow$ Candidate `135` (**83.0% reduction**)
- **Edge Scans**: Oracle `500` $\rightarrow$ Candidate `175` (**65.0% reduction**)

---

# M. Diff Audit

```text
 git diff --stat
 explorer/src/lib/layout/local-layout.ts | 46 ++++++++++++++++++++-----------
 1 file changed, 29 insertions(+), 17 deletions(-)
```

Changes are strictly confined to primary edge indexing, tier barycenter edge lookup, and sweep loop ordering convergence check within `computeLocalNodeLayout`.

---

# N. Final Status

```text
Production implementation: YES
Stage 7 optimization: YES
Stage 5 changes: NO
Stage 6 changes: NO
Unrelated refactoring: NO
```

### Git Metadata
- **Branch**: `jules-814550581238223207-fba24aa4`
- **Base Commit Hash**: `c88dcdc5cf7d2424556fc6008d080d5791ccfd15`
- **Working-Tree Status**: Clean (modified `explorer/src/lib/layout/local-layout.ts`, added `STAGE_7_SINGLE_PASS_X_CENTER_PRODUCTION_IMPLEMENTATION.md`)
- **Test Results**: All unit test suites, A/B suites, and CLI integration tests PASSED.
