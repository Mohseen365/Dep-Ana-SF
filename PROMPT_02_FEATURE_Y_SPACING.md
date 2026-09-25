# PROMPT 02 — Fix Per-Feature Vertical Y Spacing

## Prerequisite

PROMPT 01 must be completed and all its tests must pass before starting this prompt.

---

## Context retrieval protocol

Start at `AGENT.md`. Follow this route:
```
AGENT.md
  → Task: "Feature Discovery & 2D Geometry"
  → audit-reports/features/FEAT-FEATURE-report-v2.md
  → 02_Layout_Engine_Spatial.md
  → explorer/src/lib/layout/global-layout.ts  (target file)
```

---

## Background

The Hybrid Layout computes a per-feature Y coordinate map (`featureLayerYMap`) that assigns
compact Y positions to each architectural layer (presentation/application/domain/schema)
**within** each feature region. The function that builds this map is `computeFeatureLayerYMap`
in `explorer/src/lib/layout/global-layout.ts`.

**Current problem:** The function advances `currentY` by at least 120 px for every layer,
even when a feature has **zero nodes** in that layer. A feature that only has `application`
and `domain` nodes still gets vertical space reserved for `presentation` and `schema`,
producing large empty gaps and making feature region boxes unnecessarily tall.

---

## Root cause (verified against current code)

**File:** `explorer/src/lib/layout/global-layout.ts`
**Function:** `computeFeatureLayerYMap`

Find this exact block inside the `featureGraph.nodes.forEach` loop:

```typescript
LAYERS_IN_ORDER.forEach(layer => {
  const rows = rowCounts[layer].domainRows[featureId] || 0;
  featureYMap[featureId][layer] = currentY;

  const height = rows > 0 ? rows * nodeHeight + (rows - 1) * verticalGap : 0;
  const step = Math.max(height + interLayerGap, 120);
  currentY += step;
});
```

The problem: `currentY += step` runs even when `rows === 0`, always advancing by at least
120 px per empty layer.

---

## Exact change required

Replace the block above with:

```typescript
LAYERS_IN_ORDER.forEach(layer => {
  const rows = rowCounts[layer].domainRows[featureId] || 0;
  featureYMap[featureId][layer] = currentY;

  if (rows > 0) {
    // Only advance Y when this feature actually has nodes in this layer
    const height = rows * nodeHeight + (rows - 1) * verticalGap;
    const step = Math.max(height + interLayerGap, nodeHeight + interLayerGap);
    currentY += step;
  }
  // rows === 0: leave currentY unchanged — no vertical gap for empty layers
});
```

---

## What must NOT change

- `computeDynamicLayerYMap` is a separate function used by hierarchical mode — do not touch it.
- Do not touch any other function in `global-layout.ts`.
- Do not touch any other file.

---

## Verification — run these commands after the change

```bash
npx vitest run explorer/src/lib/layout/global-layout.test.ts
npx vitest run explorer/src/lib/layout/feature-layout.test.ts
npx vitest run explorer/src/lib/layout/baseline-snapshot.test.ts
npx vitest run explorer/src/test/Phase12HybridActivation.test.ts
```

Same invariant table as PROMPT 01 must pass (zero overlaps, zero layer violations,
`Cpp ≤ 8,704`, `Ctotal ≤ 94,662`, 0.00000 px drift, ≥ 40.0 px clearance).

---

## Expected outcome

Feature region boxes become compact — a feature with only `application` and `domain` nodes
occupies ≈200 px vertically instead of ≈480 px. Empty vertical white-space inside features
is eliminated.
