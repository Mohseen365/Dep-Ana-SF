# PROMPT 01 — Enable 2D Multi-Row Packing for Feature Layout

## Context retrieval protocol

Start at `AGENT.md`. Follow this route:
```
AGENT.md
  → Task: "Feature Discovery & 2D Geometry"
  → audit-reports/features/FEAT-FEATURE-report-v2.md
  → 02_Layout_Engine_Spatial.md  (layout pipeline reference)
  → explorer/src/lib/layout/global-layout.ts  (target file)
```

Read `CURRENT-STATE-BASELINE.md` to orient yourself on the project state before touching any code.

---

## Background (read before coding)

The project is a Salesforce Architecture Explorer. Its Hybrid Layout mode groups nodes into
21 semantic feature clusters and renders them as a 2D grid of labelled region boxes.

The canonical benchmark is `audit-fixtures/cloud-spend-tracker/explorer-data.json`
(240 nodes, 1,024 edges, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`).

**Current problem:** In Hybrid mode all 21 feature regions are placed in a single horizontal
strip ≈5,880 px wide instead of a compact 2D grid. This makes the graph unreadable.

---

## Root cause (verified against current code)

**File:** `explorer/src/lib/layout/global-layout.ts`

Inside function `computeGlobalDomainLayout`, find this exact block:

```typescript
const isFeatureLayout = options.isFeatureLayout ?? false;
const isMultiRowNeeded = isFeatureLayout
  ? false
  : (orderedDomains.length >= 25 || totalWidthSum > 5000);
```

`isFeatureLayout ? false` unconditionally disables 2D packing when running in Hybrid feature
mode. This forces all 21 features into one horizontal row.

Also find, inside the `else` (2D multi-row) branch further below:

```typescript
const targetRowWidth = Math.max(2400, Math.min(4800, Math.sqrt(totalWidthSum * 800 * 1.6)));
```

---

## Exact changes required

### Change 1 — Fix `isMultiRowNeeded`

Replace:
```typescript
const isMultiRowNeeded = isFeatureLayout
  ? false
  : (orderedDomains.length >= 25 || totalWidthSum > 5000);
```

With:
```typescript
const isMultiRowNeeded = isFeatureLayout
  ? (orderedDomains.length >= 4 || totalWidthSum > 1200)
  : (orderedDomains.length >= 25 || totalWidthSum > 5000);
```

### Change 2 — Tighten `targetRowWidth` for feature layout

Replace:
```typescript
const targetRowWidth = Math.max(2400, Math.min(4800, Math.sqrt(totalWidthSum * 800 * 1.6)));
```

With:
```typescript
const targetRowWidth = isFeatureLayout
  ? Math.max(1200, Math.min(3200, Math.sqrt(totalWidthSum * 300 * 1.6)))
  : Math.max(2400, Math.min(4800, Math.sqrt(totalWidthSum * 800 * 1.6)));
```

---

## What must NOT change

- The domain layout path (`isFeatureLayout = false`) must be bit-for-bit identical to today.
- Do not touch any other function in `global-layout.ts`.
- Do not touch any other file.
- Do not modify `audit-fixtures/` or any file under `audit-reports/`.

---

## Verification — run these commands after the change

```bash
npx vitest run explorer/src/lib/layout/global-layout.test.ts
npx vitest run explorer/src/lib/layout/Phase6A2DGeometry.test.ts
npx vitest run explorer/src/lib/layout/baseline-snapshot.test.ts
npx vitest run explorer/src/test/Phase12HybridActivation.test.ts
```

All must pass. The following invariants must hold on the canonical fixture
(`enableFeatureLayout: true`):

| Metric | Required |
|---|---|
| Primary node overlaps | 0 |
| Layer violations | 0 |
| Primary-primary crossings (`Cpp`) | ≤ 8,704 |
| Total crossings (`Ctotal`) | ≤ 94,662 |
| Coordinate drift (5× shuffled inputs) | 0.00000 px |
| Minimum node clearance | ≥ 40.0 px |

---

## Expected outcome

After this change, Hybrid mode renders 21 features in a ≈3–4 column 2D grid
(≈2,400 px wide) instead of a 5,880 px horizontal strip.
