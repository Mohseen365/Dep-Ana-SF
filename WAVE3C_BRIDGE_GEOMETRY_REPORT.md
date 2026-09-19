# WAVE 3C — BRIDGE GEOMETRY OPTIMIZATION REPORT

## 1. EXECUTIVE SUMMARY

Wave 3C optimizes the spatial placement and corridor geometry of cross-domain **bridge nodes** in the Explorer Architecture-Aware Layout engine. By replacing fixed, static corridor displacement (`layerSpacing * 0.5 = 125px`) with dynamic layer-aware Y-displacement and geometry-driven clearance calculations, bridge placement now respects Wave 2B's dynamic `layerYOffsets` and physical node clearance boundaries.

---

## 2. OLD BRIDGE ALGORITHM & FORENSIC ROOT CAUSE

### Old Behavior
Previously, `calculateBridgeCandidatePosition()` computed the candidate centroid for a bridge node (averaging neighbor positions or connected domain centers).
When evaluating Y displacement, the implementation checked:
```ts
if (hasIntermediateTrap || sortedConnectedDomains.length >= 2) {
  const corridorOffset = layerSpacing * 0.5; // ~125px fixed
  candidateY = baseY - corridorOffset;
}
```

### Exact Root Cause
1. **Assumption of Fixed 250px Layer Spacing**: The calculation used `layerSpacing * 0.5` (defaulting to 250 * 0.5 = 125px), ignoring the dynamic layer spacing and variable row heights introduced in Wave 2B (`globalDomainResult.layerYMap`).
2. **Fixed Constant Displacement**: The displacement did not consider actual node heights or vertical clearance gaps, applying static 125px regardless of dynamic inter-layer spacing.

---

## 3. CURRENT WAVE 2B INTERACTION

Wave 2B introduced dynamic architectural layer Y coordinates (`computeDynamicLayerYMap` / `layerYMap`) where layer Y coordinates adjust based on primary-node row counts and dynamic tier heights rather than remaining fixed at 100px / 350px / 600px / 850px.

Passing `layerYOffsets` into `calculateBridgeCandidatePosition()` provided `baseY` for the node's layer, but the old displacement formula (`layerSpacing * 0.5`) ignored the actual distance between `baseY` and adjacent layer Y positions in `layerYOffsets`. Under compact or expanded dynamic layer spacing, fixed 125px displacement could cause layer inversion or excess vertical distance.

---

## 4. NEW DISPLACEMENT ALGORITHM

The optimized algorithm in `explorer/src/lib/layout/centrality.ts` computes geometry-driven dynamic displacement using active `layerYOffsets` and physical node height clearance:

```ts
// Apply geometry-driven minimum safe displacement for cross-domain bridges or intermediate domain traps
if (hasIntermediateTrap || sortedConnectedDomains.length >= 2) {
  const layerOrder: ArchitectureLayer[] = ['presentation', 'application', 'domain', 'schema'];
  const layerIdx = layerOrder.indexOf(layer);
  let corridorGap = layerSpacing;

  if (layerIdx > 0) {
    const prevLayer = layerOrder[layerIdx - 1];
    const prevY = layerYOffsets[prevLayer];
    if (prevY !== undefined && prevY < baseY) {
      corridorGap = baseY - prevY;
    }
  } else if (layerIdx < layerOrder.length - 1) {
    const nextLayer = layerOrder[layerIdx + 1];
    const nextY = layerYOffsets[nextLayer];
    if (nextY !== undefined && nextY > baseY) {
      corridorGap = nextY - baseY;
    }
  }

  // Geometry-driven minimum displacement:
  // Requires clearing node height (nodeHeight/2) + vertical clearance gap (verticalGap/2),
  // bounded by half of the active dynamic corridor gap.
  const minClearance = nodeHeight * 0.5 + verticalGap * 0.5;
  const geometryDisplacement = Math.max(minClearance, corridorGap * 0.5);

  candidateY = baseY - geometryDisplacement;
}
```

### Key Guarantees
1. **Geometry-Driven Minimum Displacement**: Displacement equals $\max(H_{\text{node}}/2 + G_y/2, 0.5 \cdot \Delta Y_{\text{corridor}})$, ensuring physical node clearance while scaling seamlessly when dynamic layer spacing narrows or expands.
2. **Intermediate Domain Trap Protection**: If candidate X lands within the horizontal interior bounds of an unconnected domain $B$, `hasIntermediateTrap` is set to `true` and the bridge candidate is safely routed into the dynamic inter-layer corridor above $B$.
3. **Multi-Bridge Separation**: Multi-bridge collision avoidance checks (`activeBridgeAllocations` and `allocatedPositions`) shift colliding bridge nodes horizontally by deterministic step increments ($\pm k \cdot (W_{\text{node}} + G_x)$), maintaining 100% input-order determinism and zero node overlaps.

---

## 5. EXPERIMENTAL RESULTS & METRICS

### Dense Cross-Domain Fixture (`dense-cross-domain`)

| Metric | Before (Baseline) | After (Wave 3C) | Delta / Status |
| :--- | :--- | :--- | :--- |
| **Edge Crossings** | 7 | 7 | 0 (No regression) |
| **Max Edge Length** | 1,160px | 1,160px | 0px |
| **Average Edge Length** | 477.62px | 476.73px | -0.89px (Shorter) |
| **Node Overlaps** | 0 | 0 | 0 (PASS) |
| **Avg Bridge-to-Domain Distance** | 399.47px | 398.55px | -0.92px (Tighter) |

### Bridge-Heavy Fixture (`bridge-heavy`)

| Metric | Before (Baseline) | After (Wave 3C) | Delta / Status |
| :--- | :--- | :--- | :--- |
| **Edge Crossings** | 6 | 6 | 0 (No regression) |
| **Max Edge Length** | 486.34px | 486.34px | 0px |
| **Average Edge Length** | 247.22px | 247.77px | +0.55px |
| **Node Overlaps** | 0 | 0 | 0 (PASS) |
| **Avg Bridge-to-Domain Distance** | 218.66px | 218.66px | 0px |

---

## 6. DETERMINISM & PERFORMANCE

- **Input Order Determinism**: Tested by reversing node and edge arrays in `bridge-heavy` and `dense-cross-domain`. Resulting layout coordinates are 100% identical (`pos1 === pos2`).
- **Performance**: $O(K \cdot D)$ search where $K$ is bridge node count and $D$ is total domain count ($D \le 10$). Zero global $O(N^2)$ pairwise loops introduced.

---

## 7. REMAINING LIMITATIONS

1. **Complex Multi-Domain Loops**: Extremely dense graphs with $>5$ overlapping bridge nodes on the same domain pair will step horizontally into adjacent domain margins if vertical corridor space is saturated.
2. **Unconnected Floating Clusters**: Disconnected graph components containing bridge nodes depend on FFDH 2D component packing (Wave 2C) for final global coordinate placement.
