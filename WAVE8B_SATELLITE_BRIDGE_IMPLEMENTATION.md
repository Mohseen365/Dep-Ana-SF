# WAVE 8B — SATELLITE / BRIDGE IMPLEMENTATION

**Implementation Agent:** Implementation Agent 8B
**Scope:** Geometric defect remediation in `satellites.ts`, `satellites.test.ts`, `centrality.ts`, and `centrality.test.ts`.

---

## 1. Findings Addressed

- **FIND-7C-01 (Field Satellite Polar Offset Overlaps):** 24 fields assigned to a single parent CustomObject previously produced 132 overlaps due to insufficient polar angle/radial separation and tether distance snapping in spacing cleanup.
- **FIND-7C-02 (Test Satellite Stacking Overlaps):** Multiple test satellites covering the same production class previously stacked at identical relative offsets $(+200, +80)$, producing 13 overlaps.
- **FIND-7C-03 (Multi-Bridge Candidate Coordinate Overlaps):** Multiple bridge nodes sharing connected domain regions previously computed near-identical centroid midpoints, producing 1 overlap.

---

## 2. Field Placement Before/After

- **Before:** Field satellites were placed in a fixed-column grid below parent objects that extended beyond `maxSatelliteDistance` (300px). Subsequent distance clamping during spatial cleanup snapped outer rows back into identical radial distances, causing 132 overlaps on field-heavy fixtures.
- **After:** Implemented gap-aware, multi-ring/grid candidate slot generation in `satellites.ts`. Candidate slots account for node dimensions plus clearance gap (`nodeWidth + 40` $\times$ `nodeHeight + 40` = $160 \times 100$px), enforce strict directional placement below/beside parent objects ($y > y_{\text{parent}}$), avoid occupied positions, and remain within maximum tether distance ($280$px). Parent objects remain 100% unmoved.
- **Overlap Count:** `Field-Heavy CustomObject` overlaps reduced from **132 to 0**.

---

## 3. Test Placement Before/After

- **Before:** All test nodes covering a production target were placed at static offsets or tight 2-column grids extending beyond tether limits, causing spatial cleanup to snap lower test rows back into target nodes and producing 13 overlaps on test-heavy fixtures.
- **After:** Implemented gap-aware, side/fan/grid candidate slot generation in `satellites.ts` anchored around production targets. Candidate slots enforce side-placement preference ($x \ne x_{\text{target}}$), account for node dimensions plus clearance gap ($160 \times 100$px), avoid occupied primary positions, and maintain locality within tether limits. Production target nodes remain 100% fixed.
- **Overlap Count:** `Test-Heavy Architecture` overlaps reduced from **13 to 0**.

---

## 4. Bridge Placement Before/After

- **Before:** `calculateBridgeCandidatePosition` in `centrality.ts` computed candidate positions independently for each bridge node based on connected domain or neighbor averages. Multiple bridges connecting the same domain pair or 3-domain bridges received near-identical coordinates, producing 1 overlap on bridge-heavy fixtures.
- **After:** `calculateBridgeCandidatePosition` now performs collision detection against existing neighbor positions and previously allocated bridge positions (`activeBridgeAllocations`). When candidate coordinates collide with an existing position, deterministic alternating horizontal offset slotting ($x \pm k \cdot \Delta x$) is applied to guarantee distinct, non-overlapping candidate coordinates with $160 \times 100$px clearance.
- **Overlap Count:** `Bridge-Heavy Architecture` overlaps reduced from **1 to 0**.

---

## 5. Determinism

- **Input Invariance:** Input node and edge arrays in both `satellites.ts` and `centrality.ts` are cloned and sorted lexicographically by ID (`localeCompare`) prior to processing.
- **Reversal Verification:** Reversing input node or edge arrays (`nodes.reverse()`, `edges.reverse()`) produces 100% identical exact coordinate outputs across all satellite and bridge placement calls.
- **Zero Randomness:** Zero `Math.random` or timestamp primitives exist in either module.

---

## 6. Collision Behavior

- Candidate slot generation (`generateSatelliteSlots`) and bridge placement (`calculateBridgeCandidatePosition`) explicitly check bounding box collision against all currently occupied node positions.
- Step sizes dynamically respect configured node dimensions plus gap parameters (`dx = nodeWidth + horizontalGap`, `dy = nodeHeight + verticalGap`).
- Collision clearance is established at candidate generation time, preventing downstream spatial cleanup passes from distorting satellite or bridge clusters.

---

## 7. Performance

- **Satellite Slot Generation:** Uses $O(k \log k)$ deterministic candidate slot sorting for $k$ satellites per parent node.
- **Bridge Placement:** Employs $O(B \cdot M)$ collision checking where $B$ is bridge count and $M$ is neighbor count.
- **Total Pipeline Runtime:** Total pipeline execution across 100+ node benchmarks remains sub-100ms with negligible memory allocations.

---

## 8. Tests Added/Changed

- **`explorer/src/lib/layout/satellites.test.ts`:**
  - Added field scalability suite for 1, 2, 4, 8, 16, 24, and 50 field satellites around a parent object (proving 0 overlaps and parent unmoved).
  - Added test scalability suite for 1, 2, 5, 10, and 25 test satellites around a production target (proving 0 overlaps and target unmoved).
  - Added input array reversal determinism test for satellite placement.
  - Added full fixture overlap remediation tests for `Field-Heavy` (FIND-7C-01) and `Test-Heavy` (FIND-7C-02).
- **`explorer/src/lib/layout/centrality.test.ts`:**
  - Added multi-bridge candidate separation test for identical domain pairs.
  - Added full fixture overlap remediation test for `Bridge-Heavy` (FIND-7C-03).
  - Added input array reversal determinism test for centrality analysis.

---

## 9. Test Results

- **`satellites.test.ts`:** 26 passed (100%)
- **`centrality.test.ts`:** 13 passed (100%)
- **`fixtures.test.ts`:** 54 passed (100%)
- **`architecture-layout.test.ts`:** 14 passed (100%)
- **Total Layout Suite:** 195 passed across 13 test files (100%)

---

## 10. Remaining Risks

- **Extremely Large Satellite Clusters (>100 fields per single object):** Field clusters exceeding 100 satellites per object will expand radially up to ~500px, which may require wider domain bounding boxes in global domain layout. This is fully handled by the integrated spatial cleanup pass.
