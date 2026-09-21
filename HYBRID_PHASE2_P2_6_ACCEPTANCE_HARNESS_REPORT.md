# HYBRID LAYOUT PHASE 2 WORKSTREAM P2.6 ACCEPTANCE HARNESS & REGRESSION CONTRACT REPORT

**Author:** Phase 2.6 Acceptance Engineer
**Program:** Salesforce Architecture Explorer / Dependency Analyzer — Hybrid Layout Restoration
**Phase:** Phase 2 — Workstream P2.6 Canonical Acceptance Harness & Quality Gate
**Status:** COMPLETE (CANONICAL ACCEPTANCE CONTRACT ESTABLISHED — ZERO PRODUCTION CODE MODIFICATIONS)

---

## 1. EXECUTIVE SUMMARY & ACCEPTANCE HARNESS PURPOSE

Workstream P2.6 is the single canonical acceptance and regression authority for Phase 2. Its mission is to audit existing Hybrid acceptance machinery, strengthen metric helpers and tests, and establish an ungameable, objective contract against which all Phase 2 layout agents (P2.1 through P2.5) are evaluated.

The harness (`explorer/src/test/HybridLayoutAcceptanceB6.test.ts`) and central metric engine (`explorer/src/lib/layout/metrics.ts` & `evaluate-layout.ts`) strictly distinguish between three distinct spatial layout execution paths:

1. **Path A — Legacy Hierarchical/Domain Layout (`enableFeatureLayout: false`):** Current production default, grouping nodes by architectural Y-layers and domain columns.
2. **Path B — Feature-Enabled Column Layout (`enableFeatureLayout: true` with 1D Columns):** Naive feature clustering that maps feature regions linearly along X, causing high cross-feature edge crossings.
3. **Path C — Genuine Hybrid Layout (Target State):** True 2D feature-aware layout with vertical layer hierarchy preserved, compact 2D feature regions, relationship-aware barycenter ordering, shared infrastructure isolation, zero primary overlaps, zero layer violations, 100% finite coordinates, 0.00000 px 10x determinism, and crossing reduction meeting canonical targets ($\le 8,500$ primary, $\le 95,000$ total).

### Ownership & Boundaries
- **Owned Files:** Acceptance tests (`explorer/src/test/HybridLayoutAcceptanceB6.test.ts`), metric helpers (`explorer/src/lib/layout/metrics.ts`, `explorer/src/lib/layout/evaluate-layout.ts`), generated runtime benchmark artifacts (`explorer/src/test/hybrid-b6-cloud-spend-acceptance.json`).
- **Unmodified Production Files:** Zero modifications made to production layout algorithms (`architecture-layout.ts`, `global-layout.ts`, `ordering.ts`, `spacing.ts`, `centrality.ts`, `satellites.ts`).
- **Unmodified Source Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json` remains pristine (SHA-256: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`).
- **Production Default:** `enableFeatureLayout: false` remains the safe, un-flipped production default in `GraphView.tsx` and `architecture-layout.ts`.

---

## 2. CANONICAL METRIC DEFINITIONS & MEASUREMENT FORMULAS

To eliminate metric gaming across Phase 2 implementation agents, single canonical algorithms are enforced in `explorer/src/lib/layout/metrics.ts` and `evaluate-layout.ts`:

| Metric | Measurement Scope & Algorithm | Anti-Gaming Rule |
| ------ | ----------------------------- | ---------------- |
| **1. Primary-Primary Crossings** | Count of proper 2D interior segment intersections between edges connecting primary production nodes (`!isTest && !isField`). Calculated via 2D cross-product straddle check with EPSILON tolerance. | Excludes shared endpoint edges. Excludes duplicate parallel edges. Cannot be gamed by hiding edges. |
| **2. Total Geometric Crossings** | Sum of all 5 interior crossing categories (`primaryPrimary` + `primaryBridge` + `bridgeBridge` + `primarySatellite` + `satelliteSatellite`). | Measures complete graph rendering legibility across all active nodes and edge types. |
| **3. Feature Cohesion Score** | $1 - (\text{averageIntraFeatureDistance} / \text{graphDiagonal})$, bounded $[0.0, 1.0]$. Evaluates pairwise Euclidean distances between member nodes of discovered semantic features. | Uses actual physical node center coordinates $(x, y)$, not abstract bounding box assignments. |
| **4. Average Edge Length** | $\frac{1}{|E|} \sum_{e \in E} \sqrt{(x_{src} - x_{tgt})^2 + (y_{src} - y_{tgt})^2}$ across all active edges with assigned coordinates. | Must be evaluated on final post-cleanup coordinates in Stage 11/12. |
| **5. Maximum Edge Length** | $\max_{e \in E} \sqrt{(x_{src} - x_{tgt})^2 + (y_{src} - y_{tgt})^2}$. | Detects extreme spatial outliers and stretched cross-layer edges. |
| **6. Layer Violations** | Count of directed edges where $Y_{src} > Y_{tgt}$ according to strict architectural hierarchy ($Y_{presentation} < Y_{application} < Y_{domain} < Y_{schema}$). | Non-negotiable hard invariant: must equal **0**. |
| **7. Primary Overlaps** | Count of overlapping primary production node pairs where $|x_A - x_B| < \text{nodeWidth} - \epsilon$ AND $|y_A - y_B| < \text{nodeHeight} - \epsilon$. | Evaluated with standard primary bounding box extents ($80 \times 40\text{ px}$). Must equal **0**. |
| **8. Satellite Overlaps** | Count of overlapping node pairs involving secondary satellite nodes (tests, fields). | Evaluated across all secondary nodes. Must equal **0**. |
| **9. Minimum Clearance** | Minimum Euclidean edge-to-edge gap between any pair of primary production node bounding boxes: $\min_{i \ne j} \text{distance}(\text{box}_i, \text{box}_j)$. | Hard lower bound: $\ge 0\text{ px}$ (non-negative, non-overlapping). |
| **10. Runtime** | Wall-clock execution time ($ms$) of `computeArchitectureLayout` from Stage 0 through Stage 12 on the 240-node benchmark fixture. | Benchmark requirement: $< 2,000\text{ ms}$ cold start. |
| **11. Determinism Drift** | Maximum coordinate delta $\max_{i} \sqrt{(\Delta x_i)^2 + (\Delta y_i)^2}$ across 10 consecutive executions on identical input graph data. | Strict floating-point invariance: **$0.00000\text{ px}$**. |

---

## 3. THREE-PATH CLASSIFICATION ARCHITECTURE

Path C classification cannot be achieved simply by setting a feature flag (`enableFeatureLayout: true`). The harness enforces an algorithmic evaluator (`classifyLayoutPath`) that inspects both options and spatial geometric outputs:

```typescript
function classifyLayoutPath(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  positions: PositionMap,
  options: { isFeatureFlagEnabled: boolean }
): 'Path A (Legacy)' | 'Path B (Column Feature)' | 'Path C (Genuine Hybrid)' {
  if (!options.isFeatureFlagEnabled) {
    return 'Path A (Legacy)';
  }

  const metrics = evaluateLayout(nodes, edges, positions);
  const isGenuine =
    nodes.every(n => Number.isFinite(positions[n.id]?.x) && Number.isFinite(positions[n.id]?.y)) &&
    metrics.layerViolationCount === 0 &&
    (metrics.primaryOverlapCount ?? 0) === 0 &&
    (metrics.satelliteOverlapCount ?? 0) === 0 &&
    (metrics.detailedCrossings?.primaryPrimaryCrossings ?? Infinity) <= 8500 &&
    metrics.edgeCrossingCount <= 95000 &&
    metrics.domainCohesion.domainCohesionScore >= 0.9200;

  return isGenuine ? 'Path C (Genuine Hybrid)' : 'Path B (Column Feature)';
}
```

---

## 4. BASELINE VS TARGET COMPARISON TABLE

Evaluated on `audit-fixtures/cloud-spend-tracker/explorer-data.json` (240 nodes, 1,024 edges):

| Metric / Dimension | Path A: Production Default (`enableFeatureLayout: false`) | Path B: Integrated Feature Layout (`enableFeatureLayout: true`) | Path C: Canonical Target Quality Gate | P2.6 Gate Status |
| ------------------ | :------------------------------------------------------: | :------------------------------------------------------------: | :----------------------------------: | :--------------: |
| **Production Default** | `false` | `true` (Opt-in / Test-Only) | `true` (When gates pass) | **SAFE (`false`)** |
| **Primary-Primary Crossings** | 9,037 | **10,582** | $\le \mathbf{8,500}$ | **FAIL (Path B)** |
| **Total Geometric Crossings** | 107,561 | **111,634** | $\le \mathbf{95,000}$ | **FAIL (Path B)** |
| **Feature Cohesion Score** | 0.9426 | **0.8620** | $\ge \mathbf{0.9200}$ | **FAIL (Path B)** |
| **Average Edge Length** | 1,408.50 px | **1,173.33 px** | $< 1,400.00\text{ px}$ | **PASS** |
| **Maximum Edge Length** | 4,420.00 px | **2,717.20 px** | $< 3,500.00\text{ px}$ | **PASS** |
| **Layer Violations** | **0** | **0** | **0** | **PASS** |
| **Primary Overlaps** | **0** | **0** | **0** | **PASS** |
| **Satellite Overlaps** | 25 | **4** | **0** | **FAIL (4 remaining)** |
| **Minimum Clearance** | 0.00 px | 0.00 px | $\ge 0.00\text{ px}$ | **PASS** |
| **10x Determinism Drift** | 0.00000 px | **0.00000 px** | **0.00000 px** | **PASS** |
| **Coordinate Finiteness** | 100% Finite | **100% Finite** | **100% Finite** | **PASS** |
| **Runtime (Cold Load)** | 506.41 ms | **919.86 ms** | $< 2,000.00\text{ ms}$ | **PASS** |

---

## 5. COMPLETE ACCEPTANCE TEST SUITE INVENTORY & COVERAGE

The Phase 2.6 test harness in `explorer/src/test/HybridLayoutAcceptanceB6.test.ts` validates 15 comprehensive categories:

1. **Production Path Verification:** Confirms `computeArchitectureLayout` produces distinct coordinates when `enableFeatureLayout: true`, and proves `getLayoutOptions()` defaults safely to Path A (`enableFeatureLayout: false`).
2. **Feature Region Geometry:** Verifies 21 discovered feature clusters map to non-zero physical 2D bounding box coordinate extents without unassigned node collapse.
3. **Architectural Hierarchy:** Enforces strict downward Y-layer flow ($Y_{presentation} < Y_{application} < Y_{domain} < Y_{schema}$) and 0 layer violations.
4. **Feature Cohesion:** Evaluates intra-feature vs inter-feature relationship distances.
5. **Three-Path Classification & Crossings Baseline:** Validates `classifyLayoutPath` correctly distinguishes Path A, Path B, and Path C without relying on feature flags alone.
6. **Spatial Geometry & Bounds:** Asserts 100% finite coordinates, well-bounded aspect ratio ($0.2 < \text{width/height} < 15.0$), zero primary node overlaps, and non-negative clearance.
7. **Shared Infrastructure Safety:** Guarantees 240 unique logical nodes map to 240 unique physical coordinates without duplicate node cloning or region corruption.
8. **10x Determinism & Repeatability:** Executes 10 consecutive layout runs requiring $0.00000\text{ px}$ floating-point coordinate drift.
9. **Position Authority:** Tests Level 1–3 position retention (`existingPositions` preserved) and explicit Reset Layout recalculation when `existingPositions` is omitted.
10. **Viewport Interaction Safety:** Simulates viewport pan, zoom, hover, and selection mutations, verifying zero layout invocations and $0.00000\text{ px}$ position drift.
11. **Persistence & Multi-Project Isolation:** Verifies project state stored under `explorer.projectState.<projectId>` remains strictly isolated across distinct project IDs.
12. **Visual Acceptance Data Export:** Exports machine-readable benchmark JSON (`hybrid-b6-cloud-spend-acceptance.json`) for downstream automated audits.
13. **Explicit Reset Layout Behavior:** Confirms Reset Layout restores initial deterministic coordinates.
14. **Production Safe Defaults:** Guarantees production callers (`GraphView.tsx`) retain safe `enableFeatureLayout: false` defaults until Phase 2 quality gates pass.
15. **Theoretical Path C Gate Test:** Validates that Path C classification strictly rejects layouts failing crossing or cohesion thresholds even when `enableFeatureLayout: true`.

---

## 6. KNOWN LIMITATIONS & PHASE 2 WORKSTREAM INTEGRATION REQUIREMENTS

To transition Phase 2 from **Path B (Column Feature)** to **Path C (Genuine Hybrid)**, upcoming Phase 2 workstreams must fulfill the following integration requirements:

1. **Global 2D Region Barycenter Placement (Phase 2.2 / Phase 2.3):**
   - *Current Defect:* Stage 5 places feature regions in linear 1D column order, causing cross-feature edges to span long horizontal distances and generating 10,582 primary crossings.
   - *Requirement:* Must implement global 2D multi-row feature region placement and inter-feature barycenter ordering to reduce primary crossings from 10,582 down to $\le 8,500$ (-19.7%).
2. **Satellite Spacing & Collision Cleanup (Phase 2.4):**
   - *Current Defect:* 4 satellite node overlaps remain in dense test/field clusters prior to final cleanup.
   - *Requirement:* Stage 10/11 must eliminate all satellite overlaps so `satelliteOverlapCount === 0`.
3. **Domain Cohesion Optimization (Phase 2.1 / Phase 2.3):**
   - *Current Defect:* Cohesion score drops from 0.9426 (Legacy) to 0.8620 (Path B) due to multi-feature utility separation.
   - *Requirement:* High-coupling shared utilities must be placed in central corridors between connected feature regions to boost cohesion back to $\ge 0.9200$.

---

## 7. VERIFICATION & CONCLUSION

The Phase 2.6 Acceptance Harness and canonical metric contract are fully implemented, verified, and checked into the repository:

- **Metric Helpers:** `explorer/src/lib/layout/metrics.ts` & `evaluate-layout.ts`
- **Acceptance Harness:** `explorer/src/test/HybridLayoutAcceptanceB6.test.ts` (15/15 passing tests)
- **Export Artifact:** `explorer/src/test/hybrid-b6-cloud-spend-acceptance.json`

**Final Decision:** **ACCEPTED — CANONICAL PHASE 2 REGRESSION CONTRACT ESTABLISHED**. Production defaults remain untouched and safe (`enableFeatureLayout: false`). All Phase 2 workstreams must evaluate against this contract.
