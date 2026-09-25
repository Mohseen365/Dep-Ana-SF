# PROMPT 07 — Feature Region Overlay Polish (Labels + Far-Zoom Visibility)

## Prerequisite

PROMPT 01 through 06 must be completed and all their tests must pass.

---

## Context retrieval protocol

Start at `AGENT.md`. Follow this route:
```
AGENT.md
  → Task: "UI/UX, A11y & Gap-Fill context"
  → audit-reports/gap-fill/AUD-UIUX-001-report.md
  → 03_UI_UX_Interaction.md
  → explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx  (only file changed)
```

---

## Background

Two small problems remain in the feature region overlay rendered by
`FeatureOverlayCanvas.tsx`.

**Problem 1 — Raw internal IDs shown as labels**
The current label for every feature region box is:
```
Feature: feature_cloud-spend__c
```
This exposes the internal feature ID string, which is not meaningful to a user.
It should be converted to a human-readable title such as `Cloud Spend`.

**Problem 2 — Region boxes hidden at overview zoom**
The entire feature region block is wrapped in `{!isFarZoom && ...}`, so when the user
zooms out past 0.6× to navigate the overall graph, every feature region box disappears.
This is exactly the zoom level where seeing the feature grid structure matters most.
At far zoom, minimal unlabelled outlines should remain visible to preserve spatial
orientation.

---

## Only file changed

`explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`

---

## Exact change — replace the feature region rendering block

Find this exact block in the JSX return (it starts at the comment
`{/* Render Outer Semantic Feature Region Enclosure Boxes ... */}`):

```tsx
{/* Render Outer Semantic Feature Region Enclosure Boxes (Suppressed at Far Zoom) */}
{!isFarZoom &&
  featureRegionsList.map((region) => {
    const { featureId, xMin, yMin, width, height } = region;
    const labelText = `Feature: ${featureId}`;
    const labelWidth = labelText.length * 6.5 + 20;

    return (
      <g
        key={`feature_region_${featureId}`}
        className="semantic-feature-region-overlay"
        data-testid={`feature-region-${featureId}`}
      >
        <rect
          x={xMin}
          y={yMin}
          width={width}
          height={height}
          rx={16}
          fill="rgba(59, 130, 246, 0.02)"
          stroke="rgba(59, 130, 246, 0.35)"
          strokeWidth={2}
        />
        <rect
          x={xMin + 12}
          y={yMin - 13}
          width={labelWidth}
          height={22}
          rx={6}
          fill="rgba(15, 23, 42, 0.92)"
          stroke="rgba(59, 130, 246, 0.6)"
          strokeWidth={1.2}
        />
        <text
          x={xMin + 22}
          y={yMin + 2}
          fill="#93c5fd"
          fontSize={11}
          fontWeight={700}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {labelText}
        </text>
      </g>
    );
  })}
```

Replace it entirely with:

```tsx
{/* Render Outer Semantic Feature Region Enclosure Boxes */}
{featureRegionsList.map((region) => {
  const { featureId, xMin, yMin, width, height } = region;

  // Convert raw feature ID to human-readable title
  // e.g. "feature_cloud-spend__c"  →  "Cloud Spend"
  //      "feature_user-org-role"   →  "User Org Role"
  const labelText = featureId
    .replace(/^feature_/, '')
    .replace(/-/g, ' ')
    .replace(/__c$/i, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (isFarZoom) {
    // Far zoom: minimal unlabelled outline only.
    // Preserves spatial orientation without cluttering the overview.
    return (
      <rect
        key={`fr_min_${featureId}`}
        x={xMin}
        y={yMin}
        width={width}
        height={height}
        rx={10}
        fill="rgba(59, 130, 246, 0.025)"
        stroke="rgba(59, 130, 246, 0.2)"
        strokeWidth={1}
      />
    );
  }

  // Mid / near zoom: full labelled box
  const labelWidth = labelText.length * 6.5 + 20;

  return (
    <g
      key={`feature_region_${featureId}`}
      className="semantic-feature-region-overlay"
      data-testid={`feature-region-${featureId}`}
    >
      <rect
        x={xMin}
        y={yMin}
        width={width}
        height={height}
        rx={16}
        fill="rgba(59, 130, 246, 0.04)"
        stroke="rgba(59, 130, 246, 0.35)"
        strokeWidth={2}
      />
      <rect
        x={xMin + 12}
        y={yMin - 13}
        width={labelWidth}
        height={22}
        rx={6}
        fill="rgba(15, 23, 42, 0.92)"
        stroke="rgba(59, 130, 246, 0.6)"
        strokeWidth={1.2}
      />
      <text
        x={xMin + 22}
        y={yMin + 2}
        fill="#93c5fd"
        fontSize={11}
        fontWeight={700}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {labelText}
      </text>
    </g>
  );
})}
```

---

## What must NOT change

- Do not touch the LWC Composition Group block (`compositionGroups.map(...)`) that
  immediately follows — leave it exactly as it is.
- Do not touch the Shared Infrastructure highlight block that follows after that.
- Do not touch any other file.
- Do not modify any file under `audit-reports/`, `audit-fixtures/`, or `audit-evidence/`.

---

## Verification — run these commands after the change

```bash
npx vitest run explorer/src/test/Phase2_5_VisualComposition.test.tsx
npx vitest run explorer/src/test/ViewportPerformanceB5.test.tsx
npx vitest run explorer/src/lib/layout/baseline-snapshot.test.ts
```

All must pass. Layout invariants are unaffected (SVG overlay only).

Verify visually:
- At zoom 0.3 (far): thin blue outlines visible for all 21 feature regions, no labels
- At zoom 0.8 (mid): full labelled boxes with human-readable titles e.g. "Cloud Spend"
- Label `feature_cloud-spend__c` must NOT appear anywhere in the UI

---

## Expected outcome

- Feature region boxes display clean human-readable names at navigable zoom levels.
- At overview zoom, the feature grid structure remains visible as thin blue outlines
  instead of disappearing entirely.
