# PROMPT 03 — Fix Satellite Placement + Region Containment

## Prerequisite

PROMPT 01 and PROMPT 02 must be completed and all their tests must pass.

---

## Context retrieval protocol

Start at `AGENT.md`. Follow this route:
```
AGENT.md
  → Task: "Feature Discovery & 2D Geometry"
  → audit-reports/features/FEAT-FEATURE-report-v2.md
  → 02_Layout_Engine_Spatial.md
  → explorer/src/lib/layout/satellites.ts       (change A, B)
  → explorer/src/lib/architecture-layout.ts     (change C, D)
```

---

## Background

Two separate wiring gaps cause nodes to appear outside their feature region boxes.

**Gap 1 — Satellite Y anchor (causes the dangling orange column)**
Test and field satellite nodes are placed relative to a Y anchor derived from
`layerYOffsets`. In Hybrid mode the primary nodes use compact feature-local Y coordinates
(e.g. application layer Y = 220 inside Feature A), but `placeSatellites` still receives
the global `layerYMap` (application = 350). Unanchored satellites fall back to the global Y
and appear far below their feature regions.

**Gap 2 — Node drift during collision resolution**
`resolveSpacingAndCollisions` (Stage 11) accepts a `domainBounds` option that clamps each
node's X within its assigned region. In Hybrid mode `computeGlobalFeatureLayout` already
computes `domainBounds` per feature, but it is never passed to the spacing stage.
Nodes drift outside their feature boxes during collision resolution.

---

## Files and functions involved

| File | Function | Role |
|---|---|---|
| `explorer/src/lib/layout/satellites.ts` | `SatelliteLayoutOptions` interface | Add new optional fields |
| `explorer/src/lib/layout/satellites.ts` | `placeSatellites` | Consume feature-local Y |
| `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata` Step 9 | Pass `featureLayerYMap` + `featureMap` |
| `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata` Step 11 | Pass `domainBounds` |

---

## Change A — `satellites.ts`: extend `SatelliteLayoutOptions` interface

Find the interface `SatelliteLayoutOptions` (look for `layerYOffsets?:`).
Add two optional fields immediately after `layerYOffsets`:

```typescript
/** Feature-specific layer Y coordinates for compact feature-aware satellite placement */
featureLayerYMap?: Record<string, Record<ArchitectureLayer, number>>
                 | Map<string, Record<ArchitectureLayer, number>>;
/** Feature map (nodeId → featureId) for resolving feature-local Y anchors */
featureMap?: Map<string, string> | Record<string, string>;
```

---

## Change B — `satellites.ts`: add `resolveLayerY` helper in `placeSatellites`

Inside the body of `placeSatellites`, find the line:
```typescript
const layerYOffsets = options.layerYOffsets ?? DEFAULT_LAYER_Y_OFFSETS;
```

Immediately after that line, insert this helper function:

```typescript
// Normalise featureMap once
const _featureMap: Map<string, string> | null = options.featureMap instanceof Map
  ? options.featureMap
  : options.featureMap
    ? new Map(Object.entries(options.featureMap))
    : null;

// Returns the best available Y base for `layer` relative to a given node
function resolveLayerY(nodeId: string, layer: ArchitectureLayer): number {
  if (options.featureLayerYMap && _featureMap) {
    const featureId = _featureMap.get(nodeId);
    if (featureId) {
      const fMap = options.featureLayerYMap instanceof Map
        ? options.featureLayerYMap.get(featureId)
        : options.featureLayerYMap[featureId];
      if (fMap && fMap[layer] !== undefined) return fMap[layer];
    }
  }
  return layerYOffsets[layer] ?? DEFAULT_LAYER_Y_OFFSETS[layer];
}
```

Now find every occurrence of `layerYOffsets.application` and `layerYOffsets.schema`
in the rest of `placeSatellites` and replace each one with the appropriate call:

- `layerYOffsets.application` used for **trigger** fallback anchor →
  `resolveLayerY(triggerItem.nodeId, 'application')`
- `layerYOffsets.application` used for **handler** fallback anchor →
  `resolveLayerY(handlerItem.nodeId, 'application')`
- `layerYOffsets.schema` used for **unanchored fields** fallback →
  `resolveLayerY(fieldItem.nodeId, 'schema')`
- `layerYOffsets.application` used for **unanchored tests** fallback →
  `resolveLayerY(testItem.nodeId, 'application')`

(There are exactly 4 such occurrences. Use grep/search to find each one.)

---

## Change C — `architecture-layout.ts`: pass `featureLayerYMap` and `featureMap` to `placeSatellites`

Find the Step 9 comment and the `placeSatellites` call that follows:

```typescript
// Step 9: Secondary Satellite Placement (Tests, Fields, Trigger/Handlers) (Wave 3C)
const satelliteResult = placeSatellites(
  safeNodes,
  safeEdges,
  analysis,
  basePositions,
  {
    nodeWidth,
    nodeHeight,
    layerSpacing,
    layerYOffsets: globalDomainResult.layerYMap,
    index,
  }
);
```

Replace the options object with:

```typescript
  {
    nodeWidth,
    nodeHeight,
    layerSpacing,
    layerYOffsets: globalDomainResult.layerYMap,
    index,
    ...(enableFeatureLayout && globalDomainResult.featureLayerYMap
      ? { featureLayerYMap: globalDomainResult.featureLayerYMap, featureMap }
      : {}),
  }
```

Note: `featureMap` is already defined earlier in the same function — it is a
`Map<string, string>` built from `featureDiscovery.assignments`.

---

## Change D — `architecture-layout.ts`: pass `domainBounds` to `resolveSpacingAndCollisions`

Find the Step 11 comment and the `resolveSpacingAndCollisions` call:

```typescript
// Step 11: Final Global Spatial Cleanup Pass (Wave 4A)
const finalCleanupResult = resolveSpacingAndCollisions({
  nodes: safeNodes,
  edges: safeEdges,
  positions: componentShiftedPositions,
  analysis,
  options: {
    nodeWidth,
    nodeHeight,
    layerMap,
    domainMap: activeSpatialMap,
  },
});
```

Replace the `options` object with:

```typescript
  options: {
    nodeWidth,
    nodeHeight,
    layerMap,
    domainMap: activeSpatialMap,
    ...(enableFeatureLayout && globalDomainResult.domainBounds
      ? { domainBounds: globalDomainResult.domainBounds }
      : {}),
  },
```

`globalDomainResult.domainBounds` is populated by `computeGlobalFeatureLayout`
as a `Record<string, { xMin: number; xMax: number }>`.

---

## What must NOT change

- The function signature of `placeSatellites` must remain backward-compatible.
  All new fields in `SatelliteLayoutOptions` are optional.
- When `enableFeatureLayout` is `false` the behaviour of both call sites must be
  identical to today.
- Do not touch `position-policy.ts`, `centrality.ts`, `focus-graph.ts`,
  `graph-style.ts`, or `GraphView.tsx`.

---

## Verification — run these commands after the change

```bash
npx vitest run explorer/src/lib/layout/satellites.test.ts
npx vitest run explorer/src/lib/layout/spacing.test.ts
npx vitest run explorer/src/lib/layout/baseline-snapshot.test.ts
npx vitest run explorer/src/test/Phase12HybridActivation.test.ts
```

Same invariant table as PROMPT 01 must pass.

---

## Expected outcome

- Field (`CustomField`) and test (`ApexClass` isTest) satellites snap inside their parent
  feature region instead of forming a dangling column on the right side of the canvas.
- No nodes escape their feature region box during collision resolution.
