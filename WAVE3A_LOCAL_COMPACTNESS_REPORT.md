# WAVE 3A — PRIMARY LOCAL RELATIONSHIP-AWARE COMPACTNESS REPORT

## 1. Executive Summary & Objective

Wave 3A focuses on optimizing **primary local node placement** within architectural layer and domain regions (`${layer}:${domain}` buckets). Now that Waves 2A (Global Domain Geometry), 2B (Dynamic Layer Heights & Ordering), and 2C (Disconnected Component Packing) have solved global geometry, Wave 3A improves local primary-node layout density, relationship locality, and intra-bucket alignment while preserving architectural constraints, 0 node overlaps, 100% determinism, and Position Authority.

The objective was achieved:
- **Zero Node Overlaps**: 0 node overlaps across all 13 canonical benchmark fixtures.
- **Improved Relationship Locality**: Callers and callees within local buckets are vertically aligned, reducing edge crossings and intra-bucket edge lengths.
- **Dynamic Row Balancing**: Multi-node tiers with > 4 nodes are dynamically balanced into even 2D grids (e.g. 5 nodes -> 3+2), eliminating wide trailing rows and reducing local bucket width by up to 26.6%.
- **Cross-Domain Signals**: Cross-domain connection signals refine node ordering so nodes communicating with adjacent domains sit near appropriate bucket boundaries.
- **Contract & Determinism Safety**: 100% input-order and shuffle-invariant determinism preserved across all runs.

---

## 2. Forensic Current-State Audit Findings

1. **Local Tier Grouping**:
   Primary production nodes in each `${layer}:${domain}` bucket are classified into 3 local flow tiers based on intra-bucket in-degree and out-degree:
   - `Tier 0` (Upstream callers/producers): `outDegree > inDegree` or (`outDegree > 0 && inDegree === 0`).
   - `Tier 1` (Intermediate / balanced): `inDegree === outDegree`.
   - `Tier 2` (Downstream targets/consumers): `inDegree > outDegree` or (`inDegree > 0 && outDegree === 0`).

2. **Column Assignment Mechanism**:
   Inside each local row, nodes are centered horizontally around `domainXCenter` (or `baseX`). Row width is `colCount * nodeWidth + (colCount - 1) * horizontalGap`. Column X coordinate is `rowStartX + colIdx * (nodeWidth + horizontalGap)`.

3. **Row Assignment Mechanism**:
   Each tier forms one or more rows. Row Y coordinate is `layerBaseY + rowIdx * (nodeHeight + verticalGap)`.

4. **Horizontal Position Authority**:
   Derived from `domainXCenter` (Wave 2A domain region center) and intra-row column offset.

5. **Vertical Position Authority**:
   Derived from `layerBaseY` (Wave 2B layer Y offset) and intra-bucket row index (`rowIdx * 100`).

6. **Application of `horizontalGap = 40`**:
   Applied between adjacent node bounding boxes in the same row.

7. **Application of `verticalGap = 40`**:
   Applied between adjacent row bounding boxes in the same bucket.

8. **Treatment of Different Relationship Clusters**:
   Previously, nodes within a tier were laid out strictly in arbitrary input/score order. Connected callers and callees across tiers were not vertically aligned, causing unnecessary diagonal edges and edge crossings. In addition, when a tier exceeded `MAX_COLS = 4`, chunking blindly split every 4 nodes, leaving unbalanced trailing rows (e.g. 4 nodes + 1 node).

9. **Relationship Signals in Ordering**:
   Wave 2B `reduceEdgeCrossings` in `ordering.ts` produces `bucketOrder` using barycenter sweeps. However, `local-layout.ts` separated nodes into `tier0`, `tier1`, `tier2` without aligning nodes across tiers or incorporating cross-domain neighbor X center signals.

10. **Ownership of Extreme Bounding Box Widths**:
   - `hub-heavy` (5,120px wide): Owned by Wave 1C / Wave 2A domain discovery because each class has a distinct domain stem (`Account`, `AuditLogger`, `Billing`, `Case`...), creating 15 side-by-side domains. Inside individual buckets, primary node counts are 1 per bucket.
   - `long-chain` (3,320px wide): Owned by Wave 1C / Wave 2A domain discovery because each step class has a distinct stem (`StepA`, `StepB`...), creating 15 domains.
   - `dense-cross-domain` (1,280px wide) & `scale-100-plus` (13,540px wide): Owned by multi-domain global layout and cross-domain bridge/satellite positioning. Local primary placement inside multi-node buckets contributes up to 26.6% width reduction via row balancing and reduces edge crossings in `scale-100-plus` from 535 to 529.

---

## 3. Subsystem File Ownership & Boundaries

Primary modified files:
- `explorer/src/lib/layout/local-layout.ts`
- `explorer/src/lib/layout/local-layout.test.ts`

Inspected (Unmodified):
- `explorer/src/lib/layout/ordering.ts`
- `explorer/src/lib/layout/metrics.ts`
- `explorer/src/lib/layout/analysis.ts`
- `explorer/src/lib/layout/spacing.ts`
- `explorer/src/lib/architecture-layout.ts`

Strictly Unmodified (Owned by other Wave 3 tracks):
- `explorer/src/lib/layout/global-layout.ts`
- `explorer/src/lib/layout/components.ts`
- `explorer/src/lib/layout/satellites.ts`
- `explorer/src/lib/layout/centrality.ts`

---

## 4. Wave 3A Relationship-Aware Local Layout Model

1. **Intra-Bucket Barycenter Vertical Alignment**:
   - Tier 0 nodes are ordered by outgoing connection barycenters to Tier 1/2.
   - Tier 1 nodes are ordered by barycenters calculated from connected Tier 0 node positions and connected Tier 2 node positions.
   - Tier 2 nodes are ordered by barycenters calculated from connected Tier 1/0 node positions.
   - Aligns callers directly above/below their callees inside local buckets.

2. **Cross-Domain Relationship Signals**:
   - Incorporates X centers of connected cross-domain primary neighbors into barycenter scoring.
   - Nodes communicating with a domain to the right sit on the right side of their row; nodes communicating with a domain to the left sit on the left.

3. **Dynamic Balanced Row Chunking**:
   - For tiers with > 4 nodes, calculates `numRows = Math.ceil(N / 4)` and `targetCols = Math.ceil(N / numRows)`.
   - Distributes nodes evenly across rows (5 -> 3+2, 6 -> 3+3, 7 -> 4+3, 8 -> 4+4, 9 -> 3+3+3), eliminating wide unbalanced single-item trailing rows and reducing local bucket width by up to 26.6%.

4. **Hub Centering**:
   - High-degree hub nodes in a tier are placed at the center index of their row array.

5. **Determinism & Contract Preservation**:
   - 100% deterministic (stable tie-breaking via `bucketOrder` rank -> degree descending -> `localeCompare`).
   - Preserves default 40px gaps and layer Y offsets. Zero node overlaps guaranteed.

---

## 5. Measured 13-Fixture Benchmark Results

| Fixture ID | Bounding Box (WxH) | Aspect Ratio | Crossings | Overlaps | Avg Edge | Med Edge | Max Edge | Intra-Domain Dist | Primary Local BB |
|---|---|---|---|---|---|---|---|---|---|
| layered-architecture | 980 x 765 | 1.28:1 | 0 | 0 | 276.5 | 160.0 | 718.1 | 446.2 | 1640 x 810 |
| two-domain | 860 x 360 | 2.39:1 | 0 | 0 | 229.2 | 160.0 | 402.6 | 311.0 | 1260 x 560 |
| food-delivery | 3320 x 965 | 3.44:1 | 10 | 0 | 631.0 | 160.0 | 3200.0 | 912.7 | 3540 x 810 |
| hub-heavy | 5120 x 185 | 27.68:1 | 3 | 0 | 968.9 | 400.0 | 2263.5 | 1370.0 | 5440 x 60 |
| bridge-heavy | 1200 x 505 | 2.38:1 | 6 | 0 | 247.2 | 187.7 | 486.3 | 293.5 | 3160 x 560 |
| test-heavy | 760 x 460 | 1.65:1 | 0 | 0 | 218.4 | 188.7 | 320.0 | 181.6 | 120 x 160 |
| field-heavy | 1080 x 560 | 1.93:1 | 0 | 0 | 371.2 | 377.4 | 520.0 | 388.8 | 120 x 60 |
| trigger-handler | 680 x 605 | 1.12:1 | 1 | 0 | 267.7 | 160.0 | 653.2 | 395.7 | 960 x 560 |
| disconnected-components | 1340 x 900 | 1.49:1 | 0 | 0 | 214.6 | 161.9 | 421.6 | 391.0 | 5440 x 810 |
| long-chain | 3320.01 x 185 | 17.95:1 | 0 | 0 | 231.1 | 239.1 | 240.0 | 1252.1 | 5440 x 60 |
| dense-cross-domain | 1280 x 320 | 4.00:1 | 7 | 0 | 477.6 | 301.5 | 1160.0 | 390.1 | 1260 x 310 |
| sparse-graph | 1260 x 860 | 1.47:1 | 0 | 0 | 160.0 | 160.0 | 160.0 | 585.3 | 11900 x 60 |
| scale-100-plus | 13540 x 1225 | 11.05:1 | 529 | 0 | 2180.9 | 762.4 | 9220.5 | 1465.0 | 17600 x 810 |

---

## 6. Analysis of Acceptance Cases

### Hub-Heavy Analysis
- In `hub-heavy`, all 15 nodes are in `ApexClass` and assigned distinct domain stems (`Account`, `AuditLogger`, `Billing`, `Case`...), creating 15 side-by-side domains. Each domain contains 1 primary production node.
- `local-layout.ts` arranges each primary node centrally in its domain region.
- Hub centering in `local-layout.ts` ensures that whenever multiple callers/callees share a local bucket with a hub, the hub is placed at the center column of its row.

### Long-Chain Analysis
- In `long-chain`, 15 sequential classes (`StepA` -> `StepB` -> ... -> `StepO`) each form a separate domain stem.
- Architectural layers assign all Apex classes to `application`.
- Horizontal progression across domains preserves readability and dependency direction flow without serpentine distortion or layer rule violations.

### Dense Cross-Domain Analysis
- `dense-cross-domain` metrics: 1280 x 320 bounding box, 7 crossings, max edge 1,160px.
- Local barycenter ordering incorporates cross-domain neighbor X centers, keeping cross-domain edges straight and preventing crossing spikes.

### Scale-100-Plus Analysis
- `scale-100-plus` metrics: Bounding box reduced to 13,540 x 1,225 (from 13,620 x 1,225). Crossings reduced from 535 to 529. Max edge length reduced from 9,380.5px to 9,220.5px.
- Zero node overlaps across all 100+ nodes.

---

## 7. Collision & Determinism Verification

- **Node Overlaps**: 0 overlaps across all 13 canonical fixtures.
- **Determinism**: 100% invariant under repeated runs, input array shuffling, and edge reversals. Tested explicitly in unit tests 8, 16, and 17.
- **Position Authority**: Position authority restoration pass in `architecture-layout.ts` remains intact and unaffected.
