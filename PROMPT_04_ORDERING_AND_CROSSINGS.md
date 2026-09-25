# PROMPT 04 — Fix Feature Ordering & Crossing Reduction Accuracy

## Prerequisite

PROMPT 01, 02, and 03 must be completed and all their tests must pass.

---

## Context retrieval protocol

Start at `AGENT.md`. Follow this route:
```
AGENT.md
  → Task: "Feature Discovery & 2D Geometry"
  → audit-reports/features/FEAT-FEATURE-report-v2.md
  → 02_Layout_Engine_Spatial.md
  → explorer/src/lib/layout/feature-ordering.ts   (change A)
  → explorer/src/lib/layout/ordering.ts            (change B, C)
  → explorer/src/lib/architecture-layout.ts        (change D)
```

---

## Background

This prompt fixes two independent problems that both hurt layout quality.

---

### Problem 1 — Feature ordering ignores computed X positions

**File:** `explorer/src/lib/layout/feature-ordering.ts`
**Function:** `compute2DFeatureBandOrdering`

This function runs an iterative 2D barycentric sweep that places features at computed X
positions based on which features are most connected. After all that computation the final
`orderedFeatures` list is built by iterating the 4 architectural layer bands in order
(`presentation → application → domain → schema`) and appending within each band.

The problem: the final list is ordered by **layer band**, not by the computed X positions.
When `computeGlobalDomainLayout` wraps this list into rows (after PROMPT 01 fix), the
row boundaries fall at arbitrary points — features that belong together visually may land
on different rows.

**Fix:** sort `orderedFeatures` by the computed `estimatedX` values before returning, so
the 2D row wrapping places spatially-related features adjacent.

---

### Problem 2 — Crossing reduction uses hardcoded 250 px layer Y spacing

**File:** `explorer/src/lib/layout/ordering.ts`
**Function:** `computeSimulatedPositions`

The crossing reduction algorithm estimates edge crossings using simulated node positions.
It hardcodes Y = `100 + layerIndex × 250` (giving Y = 100, 350, 600, 850). In Hybrid mode
the actual compact feature-local Y spacing is ~120 px per occupied layer. The optimiser is
minimising crossings in a coordinate space that does not match reality, so it can pick a
worse node order than if it used the real Y values.

**Fix:** accept an optional `layerYMap` in both `NodeOrderingInput` and
`computeSimulatedPositions`, and use it when available.

---

## Change A — `feature-ordering.ts`: sort `orderedFeatures` by estimated X

Find section **"5. Construct Final Placements Map and Ordered List"** in
`compute2DFeatureBandOrdering`. The block looks like:

```typescript
const placements = new Map<string, Feature2DPlacement>();
const orderedFeatures: string[] = [];

LAYER_ORDER.forEach(l => {
  const list = bandFeatures.get(l)!;
  const bandIdx = LAYER_PRIORITY[l];
  list.forEach((f, orderIdx) => {
    orderedFeatures.push(f);
    placements.set(f, {
      featureId: f,
      primaryLayer: l,
      bandIndex: bandIdx,
      orderInBand: orderIdx,
      estimatedX: estimatedX.get(f) ?? (BASE_X + orderIdx * BAND_HORIZONTAL_SPACING),
      estimatedY: estimatedY.get(f) ?? LAYER_BASE_Y[l],
    });
  });
});
```

Replace with:

```typescript
// Build placements first (no ordering yet)
const placements = new Map<string, Feature2DPlacement>();

LAYER_ORDER.forEach(l => {
  const list = bandFeatures.get(l)!;
  const bandIdx = LAYER_PRIORITY[l];
  list.forEach((f, orderIdx) => {
    placements.set(f, {
      featureId: f,
      primaryLayer: l,
      bandIndex: bandIdx,
      orderInBand: orderIdx,
      estimatedX: estimatedX.get(f) ?? (BASE_X + orderIdx * BAND_HORIZONTAL_SPACING),
      estimatedY: estimatedY.get(f) ?? LAYER_BASE_Y[l],
    });
  });
});

// Sort by estimated X so 2D row wrapping places spatially-related features adjacent.
// Tie-break by layer priority then alphabetically for full determinism.
const orderedFeatures: string[] = [...matrix.featureIds].sort((a, b) => {
  const xA = estimatedX.get(a) ?? 0;
  const xB = estimatedX.get(b) ?? 0;
  if (Math.abs(xA - xB) > 1e-6) return xA - xB;
  const lA = LAYER_PRIORITY[matrix.featurePrimaryLayers.get(a) || 'application'];
  const lB = LAYER_PRIORITY[matrix.featurePrimaryLayers.get(b) || 'application'];
  if (lA !== lB) return lA - lB;
  return a.localeCompare(b);
});
```

---

## Change B — `ordering.ts`: add `layerYMap` to `NodeOrderingInput`

Find the `NodeOrderingInput` interface (near the top of the file):

```typescript
export interface NodeOrderingInput {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  layerMap?: Map<string, ArchitectureLayer> | Record<string, ArchitectureLayer>;
  domainMap?: Map<string, string> | Record<string, string>;
  domainOrder?: string[];
  maxIterations?: number;
}
```

Add one optional field:

```typescript
  /** Actual layout layer Y offsets — improves crossing estimation accuracy in Hybrid mode */
  layerYMap?: Record<ArchitectureLayer, number>;
```

---

## Change C — `ordering.ts`: use `layerYMap` in `computeSimulatedPositions`

Find `computeSimulatedPositions`. Its current signature is:

```typescript
export function computeSimulatedPositions(
  bucketOrder: Map<string, string[]>,
  domainOrder: string[]
): PositionMap {
```

Change to:

```typescript
export function computeSimulatedPositions(
  bucketOrder: Map<string, string[]>,
  domainOrder: string[],
  layerYMap?: Record<ArchitectureLayer, number>
): PositionMap {
```

Inside the function, find:

```typescript
const y = 100 + layerIdx * 250;
```

Replace with:

```typescript
const y = layerYMap
  ? (layerYMap[layer] ?? 100 + layerIdx * 250)
  : 100 + layerIdx * 250;
```

Now update `estimateCrossingsForOrder` to accept and forward `layerYMap`:

```typescript
export function estimateCrossingsForOrder(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  bucketOrder: Map<string, string[]>,
  domainOrder: string[],
  layerYMap?: Record<ArchitectureLayer, number>
): number {
  const positions = computeSimulatedPositions(bucketOrder, domainOrder, layerYMap);
  return fastEdgeCrossingCount(nodes, edges, positions);
}
```

Inside `reduceEdgeCrossings`, find both calls to `estimateCrossingsForOrder` (the initial
`bestCrossings` calculation and the per-sweep `currentCrossings` calculation) and add
`input.layerYMap` as the last argument to each.

---

## Change D — `architecture-layout.ts`: pass `layerYMap` to `reduceEdgeCrossings`

Find the Step 6 call:

```typescript
const orderingResult = reduceEdgeCrossings({
  nodes: safeNodes,
  edges: safeEdges,
  layerMap,
  domainMap: activeSpatialMap,
  domainOrder: globalDomainResult.orderedDomains,
});
```

Replace with:

```typescript
const orderingResult = reduceEdgeCrossings({
  nodes: safeNodes,
  edges: safeEdges,
  layerMap,
  domainMap: activeSpatialMap,
  domainOrder: globalDomainResult.orderedDomains,
  layerYMap: globalDomainResult.layerYMap,
});
```

---

## What must NOT change

- All changes are purely additive (new optional fields, new optional parameters).
  No existing caller is broken.
- Do not change the `FeatureOrderingStrategy` enum or any other strategy function.
- Do not touch any file other than the three listed above.

---

## Verification — run these commands after the change

```bash
npx vitest run explorer/src/lib/layout/feature-ordering.test.ts
npx vitest run explorer/src/lib/layout/feature-ordering-experiments.test.ts
npx vitest run explorer/src/lib/layout/ordering.test.ts
npx vitest run explorer/src/lib/layout/baseline-snapshot.test.ts
npx vitest run explorer/src/test/Phase12HybridActivation.test.ts
```

Same invariant table as PROMPT 01 must pass.

---

## Expected outcome

- Features that share many edges appear in adjacent grid cells.
- The crossing reduction optimiser works in the same coordinate space as the real layout,
  producing better node orderings within each feature region.
