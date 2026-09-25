# PROMPT 05 — Add Inter/Intra-Feature Edge Visual Differentiation

## Prerequisite

PROMPT 01 through 04 must be completed and all their tests must pass.

---

## Context retrieval protocol

Start at `AGENT.md`. Follow this route:
```
AGENT.md
  → Task: "UI/UX, A11y & Gap-Fill context"
  → audit-reports/gap-fill/AUD-UIUX-001-report.md
  → 03_UI_UX_Interaction.md
  → explorer/src/lib/graph-builder.ts     (change A)
  → explorer/src/lib/graph-style.ts       (change B)
  → explorer/src/components/GraphView.tsx (change C)
```

---

## Background

With 240 nodes and 1,024 edges all rendered at the same weight (width 2, full opacity,
same gray), the canvas is an undifferentiated edge web. When features are grouped into a
2D grid the most important visual information is **which edges cross feature boundaries**
vs **which edges stay inside one feature**. Currently you cannot tell these apart.

This prompt adds a data field `isInterFeature` to every edge element so that Cytoscape
stylesheet rules can style them differently.

---

## Important facts about the existing codebase

- `explorer/src/lib/graph-builder.ts` builds the Cytoscape element array. It has:
  - `GraphEdgeData` interface
  - `buildGraphElements(nodes, edges, findings?)` function
  - `createEdgeElement(edge)` private function

- `GraphView.tsx` already computes `discoveryResult` via `useMemo` (line ~194).
  `discoveryResult` is a `FeatureDiscoveryResult` which has an `assignments` map:
  `Map<string, FeatureAssignment>` where each `FeatureAssignment` has `primaryFeatureId`.

- `buildGraphElements` is called in exactly two places in `GraphView.tsx`:
  - Line ~379 (Cytoscape initialisation)
  - Line ~720 (graph update)

---

## Change A — `graph-builder.ts`: add `isInterFeature` to edge data

### Step A1 — extend the `GraphEdgeData` interface

Find:
```typescript
export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  method: string | null;
  unresolved: boolean;
  evidence: string;
}
```

Add one field at the end:
```typescript
  isInterFeature: boolean;
```

### Step A2 — add optional `featureMap` parameter to `buildGraphElements`

Find:
```typescript
export function buildGraphElements(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  findings?: ArchitectureFinding[]
): ElementDefinition[] {
```

Change to:
```typescript
export function buildGraphElements(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  findings?: ArchitectureFinding[],
  featureMap?: Map<string, string>
): ElementDefinition[] {
```

Inside the function body, find the line:
```typescript
elements.push(createEdgeElement(edge));
```

Change to:
```typescript
elements.push(createEdgeElement(edge, featureMap));
```

### Step A3 — update `createEdgeElement` to populate `isInterFeature`

Find the `createEdgeElement` function:
```typescript
function createEdgeElement(edge: ExplorerEdge): EdgeDefinition {
  const edgeData: GraphEdgeData = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relationshipType: edge.relationshipType,
    method: edge.method,
    unresolved: edge.unresolved,
    evidence: edge.evidence
  };
  return {
    data: edgeData,
    group: 'edges'
  };
}
```

Replace with:
```typescript
function createEdgeElement(
  edge: ExplorerEdge,
  featureMap?: Map<string, string>
): EdgeDefinition {
  const sourceFeature = featureMap?.get(edge.source);
  const targetFeature = featureMap?.get(edge.target);
  // isInterFeature: true only when BOTH endpoints have a known, non-utility feature
  // and those features differ. Unassigned / Shared edges are treated as intra-feature.
  const isInterFeature = Boolean(
    sourceFeature &&
    targetFeature &&
    sourceFeature !== 'Unassigned' &&
    targetFeature !== 'Unassigned' &&
    sourceFeature !== 'Shared' &&
    targetFeature !== 'Shared' &&
    sourceFeature !== targetFeature
  );

  const edgeData: GraphEdgeData = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relationshipType: edge.relationshipType,
    method: edge.method,
    unresolved: edge.unresolved,
    evidence: edge.evidence,
    isInterFeature,
  };
  return { data: edgeData, group: 'edges' };
}
```

---

## Change B — `graph-style.ts`: add intra/inter-feature edge styles

Open `explorer/src/lib/graph-style.ts`. Find the section that starts building the
`styles` array and locate the closing section just before the `for...of EDGE_COLORS` loop
(the loop that adds per-`relationshipType` color rules). Insert the following two new style
rules **before** that loop:

```typescript
// Intra-feature edges: thinner and muted — local dependency, low visual noise
{
  selector: 'edge[isInterFeature = "false"]',
  style: {
    'width': 1.5,
    'opacity': 0.6,
  }
},
// Inter-feature edges: dashed and prominent — cross-feature architectural boundary
{
  selector: 'edge[isInterFeature = "true"]',
  style: {
    'width': 2.5,
    'line-style': 'dashed',
    'line-dash-pattern': [6, 3],
    'opacity': 0.9,
  }
},
```

Note: `isInterFeature` is a **boolean** field in the data. Cytoscape data selectors match
the string representation, so `"false"` and `"true"` are correct.

---

## Change C — `GraphView.tsx`: build a `featureAssignmentMap` and pass it to both `buildGraphElements` calls

### Step C1 — add a `featureAssignmentMap` useMemo

`discoveryResult` is already computed at approximately line 194. Add this immediately after:

```typescript
// Build nodeId → featureId map for edge inter-feature classification (Hybrid mode only)
const featureAssignmentMap = useMemo((): Map<string, string> | undefined => {
  if (architectureMode !== 'hybrid') return undefined;
  const map = new Map<string, string>();
  discoveryResult.assignments.forEach((assignment, nodeId) => {
    map.set(nodeId, assignment.primaryFeatureId);
  });
  return map;
}, [architectureMode, discoveryResult]);
```

### Step C2 — update the first `buildGraphElements` call (initialisation, line ~379)

Find:
```typescript
const elements = buildGraphElements(nodesRef.current, edgesRef.current, findings);
```

Replace with:
```typescript
const elements = buildGraphElements(nodesRef.current, edgesRef.current, findings, featureAssignmentMap);
```

### Step C3 — update the second `buildGraphElements` call (graph update, line ~720)

Find:
```typescript
const newElements = buildGraphElements(nodes, edges, findings);
```

Replace with:
```typescript
const newElements = buildGraphElements(nodes, edges, findings, featureAssignmentMap);
```

---

## What must NOT change

- `buildGraphElements` must remain backward-compatible — `featureMap` is optional.
  All callers that don't pass it continue working exactly as before.
- Do not touch `position-policy.ts`, `architecture-layout.ts`, `satellites.ts`,
  `spacing.ts`, or `ordering.ts`.
- Do not modify any file under `audit-reports/` or `audit-fixtures/`.

---

## Verification — run these commands after the change

```bash
npx vitest run explorer/src/test/GraphDataIntegrityAndMutations.test.tsx
npx vitest run explorer/src/test/Phase2_5_VisualComposition.test.tsx
npx vitest run explorer/src/lib/layout/baseline-snapshot.test.ts
```

All must pass. Layout invariants (zero overlaps, zero layer violations, etc.) are
unaffected by this change because it only adds visual data to edge elements.

---

## Expected outcome

In Hybrid mode:
- Edges between nodes of the **same feature** are thinner and 60% opacity.
- Edges between nodes of **different features** are dashed, wider, and 90% opacity.
- In Hierarchical mode all edges are unaffected (no `featureAssignmentMap` is passed).
