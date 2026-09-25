# PROMPT 06 — Add Zoom-Aware Edge Opacity Hierarchy

## Prerequisite

PROMPT 05 must be completed and all its tests must pass.
This prompt depends on the `isInterFeature` edge data field added in PROMPT 05.

---

## Context retrieval protocol

Start at `AGENT.md`. Follow this route:
```
AGENT.md
  → Task: "UI/UX, A11y & Gap-Fill context"
  → audit-reports/gap-fill/AUD-UIUX-001-report.md
  → 03_UI_UX_Interaction.md
  → explorer/src/lib/graph-style.ts   (only file changed)
```

---

## Background

At overview zoom (< 0.5) all 1,024 edges render at full opacity and width, creating a
solid edge web that obscures the feature grid structure. The zoom system already classifies
elements into `.zoom-far`, `.zoom-mid`, and `.zoom-near` CSS classes via `updateZoomClass`
in `GraphView.tsx`, but the existing `edge.zoom-far` rule only removes the edge label.
It does not reduce opacity or width.

This prompt adds opacity and width rules to the existing zoom classes so that:
- At far zoom the edge web fades out and only inter-feature (cross-boundary) edges remain
  clearly visible, letting the user see the feature grid structure.
- At mid zoom all edges are moderately visible.
- At close/near zoom all edges are fully visible (current behaviour preserved).

---

## Only file changed

`explorer/src/lib/graph-style.ts`

---

## Exact change

Open `explorer/src/lib/graph-style.ts`. Find the existing zoom style blocks. They look
like this (in order):

```typescript
{
  selector: '.zoom-far',
  style: { 'label': '' }
},
{
  selector: 'node.zoom-far',
  style: { 'label': '' }
},
{
  selector: 'edge.zoom-far',
  style: { 'label': '' }
},
{
  selector: 'node.zoom-mid',
  style: { 'label': 'data(label)' }
},
{
  selector: 'edge.zoom-mid',
  style: { 'label': '' }
},
{
  selector: 'node.zoom-near',
  style: { 'label': 'data(label)' }
},
{
  selector: 'edge.zoom-near',
  style: { 'label': 'data(relationshipType)' }
},
```

Replace **only the `edge` zoom rules** (leave the `node` and `.zoom-far` selector
untouched). The updated edge zoom rules are:

```typescript
// FAR ZOOM — mute all edges; keep inter-feature edges lightly visible for orientation
{
  selector: 'edge.zoom-far',
  style: {
    'label': '',
    'opacity': 0.18,
    'width': 1,
  }
},
{
  selector: 'edge[isInterFeature = "true"].zoom-far',
  style: {
    'opacity': 0.55,
    'width': 1.8,
  }
},
// MID ZOOM — moderate edge visibility; inter-feature edges stay prominent
{
  selector: 'edge.zoom-mid',
  style: {
    'label': '',
    'opacity': 0.45,
  }
},
{
  selector: 'edge[isInterFeature = "true"].zoom-mid',
  style: {
    'opacity': 0.85,
  }
},
// NEAR ZOOM — full visibility, show relationship type label
{
  selector: 'edge.zoom-near',
  style: {
    'label': 'data(relationshipType)',
  }
},
```

---

## What must NOT change

- Do not touch the node zoom rules.
- Do not touch the `.zoom-far` base rule (it sets `label: ''` for all elements).
- Do not touch any other file.
- In Hierarchical mode `isInterFeature` is `false` on all edges (PROMPT 05 only populates
  it in Hybrid mode), so the `[isInterFeature = "true"]` selectors simply won't match —
  this is correct and intentional.

---

## Verification

This prompt has no automated test impact (stylesheet only). After applying the change:

```bash
npx vitest run explorer/src/lib/layout/baseline-snapshot.test.ts
```

Verify visually:
- At zoom 0.3: only dashed inter-feature edges visible; feature region outlines visible
- At zoom 0.8: all edges visible at ~45% opacity; dashed inter-feature edges at ~85%
- At zoom 1.5: full opacity, labels appear on close inspection

---

## Expected outcome

At overview zoom the user sees the **feature grid structure** (which feature connects to
which) without the edge web obscuring the node positions.
