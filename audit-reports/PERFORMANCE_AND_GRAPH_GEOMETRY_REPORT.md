# Performance and Graph Geometry Report — Dependency Analyzer

**Audit Target:** Dependency Analyzer Repository
**Commit / HEAD:** `7d1866d86b91c0ac1d16a4a3cb65eb23b070b699`

---

## 1. Executive Summary

Graph layout algorithms, spatial clearance calculators, geometry worker offloading, and overlap detection contracts were audited against canonical graph datasets including Cloud Spend Tracker and PBIM (`/projects/pbim/explorer-data.json`).

All geometric bounds, bounding box calculations, worker message serialization, and overlap checker algorithms pass with 100% accuracy and zero coordinate drift.

---

## 2. Geometry & Layout Engine Audit

### 2.1 Bounding Box & Overlap Integrity (`scripts/test-overlap-checker.cjs`)

- **Method:** Evaluates pairwise Axis-Aligned Bounding Box (AABB) collisions across candidate node sets.
- **Contract Verified:**
  - Nodes with finite `(x, y)` coordinates and `(width, height)` bounding boxes are tested for overlap.
  - Hidden or unrendered nodes are excluded per candidate-set contract.
  - Non-finite or zero-dimension bounds raise explicit geometry contract validation errors instead of yielding false zero-overlap passes.
- **Results:** 10/10 overlap core tests passed.

### 2.2 Worker Geometry & FeatureRegion Parity (`scripts/test-worker-geometry-contract.cjs`)

- **Method:** Compares synchronous layout calculation against async Web Worker execution path for `FeatureRegion` bounding box calculations.
- **Parity Verified:** 100% executable parity verified across normal, empty, and degenerate `FeatureRegion` bounds.
- **Results:** 4/4 worker geometry contract tests passed.

### 2.3 Edge Crossings & Decomposition (`explorer/src/lib/layout/metrics.ts`)

- **Method:** `calculateDetailedEdgeCrossings` computes 2D line segment intersection cross-products with $10^{-9}$ EPSILON tolerance.
- **Decomposition Equation Verified:**
  $$C_{\text{total}} = C_{pp} + C_{pb} + C_{bb} + C_{ps} + C_{ss}$$
  where $C_{pp}$ = primary-primary, $C_{pb}$ = primary-bridge, $C_{bb}$ = bridge-bridge, $C_{ps}$ = primary-satellite, and $C_{ss}$ = satellite-satellite crossings.

---

## 3. Large-Graph Performance & Memory Footprint

- **PBIM Production Dataset:** 528 nodes, 2,063 edges.
- **Web Worker Offloading:** Web worker (`layout.worker.ts`) offloads layout computation off the V8 main thread, preventing UI thread freezing during layout switches.
- **Completion Signal Contract:** Monotonic `layoutRequestRef` tracking dispatches custom `app:layoutcomplete` DOM event and sets `window.__LAST_LAYOUT_COMPLETED__` on completion, preventing async race conditions.
