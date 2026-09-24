# Node-Distance Stability & Regression Playbook

## Purpose

This is a project-specific forensic guide for the recurring problem:

> **After a layout change, nodes that were previously readable become too close together, visually collide, or lose the intended whitespace between related/unrelated nodes.**

The goal is to make node-distance behavior explicit, traceable, testable, and resistant to regressions while preserving the accepted Wave 1–13 contracts.

---

# 1. Executive diagnosis

In this project, "nodes are too close" is **not one bug**.

Distance can be reduced by several stages:

```text
RAW GRAPH
   ↓
analysis / classification
   ↓
layers
   ↓
domains
   ↓
global placement
   ↓
local placement
   ↓
bridge placement
   ↓
satellite placement
   ↓
component packing
   ↓
spacing / collision cleanup
   ↓
Position Authority
   ↓
Cytoscape rendering
```

The most important rule is:

> **The stage that produces the final coordinates is not necessarily the stage that caused the distance problem.**

The correct debugging question is:

> **At which pipeline stage did the pair first become too close?**

---

# 2. Distance contract

For rectangular nodes, distinguish:

### Bounding-box gap

```text
gapX = horizontal rectangle clearance
gapY = vertical rectangle clearance
```

### Center distance

```text
sqrt((Ax-Bx)^2 + (Ay-By)^2)
```

Center distance is useful diagnostically but must not be the only spacing criterion.

### Required clearance

Define:

```text
requiredGap(pairContext)
```

which can depend on:

- node class
- primary/secondary status
- feature membership
- layer relationship
- domain relationship
- satellite status
- bridge status
- component boundary.

The geometric contract is:

```text
actualGap >= requiredGap
```

for every pair covered by the policy.

---

# 3. Main causes of "too close"

## A. Local layout compresses nodes

Primary file:

```text
explorer/src/lib/local-layout.ts
```

The existing local layout uses concepts such as:

```text
layer
domain
degree tiers
barycenter
hub centering
cross-domain signals
row chunking
```

A change to bucket membership, row chunking, maximum columns, gap constants, barycenter alignment, or hub-centering can turn:

```text
A       B       C
```

into:

```text
A B C
```

even when there are still zero overlaps.

### Fix

Trace:

```text
bucket → row → column → placement formula
```

and make placement geometry-aware. Do not immediately increase a global gap.

---

## B. Global placement makes the available region too narrow

Primary file:

```text
explorer/src/lib/global-layout.ts
```

Wave 10 fixed a major historical problem where domains were accumulated horizontally. The replacement uses deterministic 2D placement.

A too-small global region can still starve downstream local placement.

### Happens when

- target width is reduced;
- wrapping changes;
- feature/domain bounds are underestimated;
- cluster geometry ignores required internal spacing;
- secondary footprint is introduced after global bounds were computed.

### Fix

Reserve space from actual or conservative geometry, not node count alone.

---

## C. Dynamic layer spacing is insufficient

Primary file:

```text
explorer/src/lib/global-layout.ts
```

The accepted system uses dynamic layer heights based on occupied rows rather than a fixed Y map.

Conceptually:

```text
layerHeight =
  rows * nodeHeight
  + (rows - 1) * verticalGap
```

and:

```text
nextLayerY =
  previousLayerBottom
  + interLayerGap
```

### Happens when

- node height changes;
- row count changes;
- row geometry is calculated from the wrong node subset;
- inter-layer gap is reduced;
- feature-local layout creates more rows after global layer geometry was calculated.

### Fix

Recompute dependent layer bounds whenever row geometry changes.

---

## D. Satellite placement consumes the neighborhood

Primary file:

```text
explorer/src/lib/satellites.ts
```

A primary pair may be fine:

```text
A        B
```

but satellites can create:

```text
A test field B
```

which is visually too dense.

### Happens when

- satellite count increases;
- anchor selection changes;
- slot allocation changes;
- fallback anchors are used;
- feature placement moves primary nodes into satellite-heavy areas.

### Fix

Verify:

```text
anchor
satellite count
slot allocation
occupied rectangles
anchor distance
```

before changing global spacing.

Historical satellite-anchor bugs are especially important to guard against.

---

## E. Bridge placement creates crowding

Primary integration file:

```text
explorer/src/lib/architecture-layout.ts
```

Related classification/diagnostics:

```text
analysis.ts
metrics.ts
```

Bridges occupy corridors between regions.

### Happens when

- feature regions move closer;
- bridge anchors move;
- fallback placement changes;
- a node is incorrectly classified as a bridge;
- fields/tests accidentally become bridge candidates;
- several bridges share a narrow corridor.

Historical warning: incorrect parent-object resolution once caused fields to behave like pseudo-bridges.

### Fix

Before touching spacing, verify:

```text
isBridge(node)
isFieldNode(node)
isTestNode(node)
parentObjectId(node)
```

---

## F. Component packing compresses dense components

Relevant files:

```text
explorer/src/lib/components.ts
explorer/src/lib/architecture-layout.ts
```

Component packing can improve global compactness but cannot repair bad internal geometry.

### Happens when

- component bounds are underestimated;
- padding is reduced;
- bounds are calculated before satellites/bridges;
- stale bounds are packed.

### Fix

Use correct component bounds plus component gap. Do not expect packing to fix internal layout.

---

## G. Final spacing cleanup does not guarantee minimum clearance

Primary file:

```text
explorer/src/lib/spacing.ts
```

Spacing is the final geometry safety net, but it must not become blind global nudging.

A one-pass correction can fix one pair and create a new near-collision elsewhere.

### Correct model

```text
detect violation
→ deterministic correction
→ update geometry
→ re-query affected neighborhood
→ revalidate
→ stable
```

The project's spatial-hash approach should be used to avoid O(N²) neighbor checks.

---

## H. Feature Cluster bounds are underestimated

This is the biggest future risk for the Feature Cluster work.

Relevant files:

```text
feature-roles.ts
feature-clusters.ts
global-layout.ts
local-layout.ts
architecture-layout.ts
spacing.ts
```

A feature containing:

```text
LWC
Controller
Service
Selector
Repository
Domain
DTO
Tests
support
```

cannot safely be represented as:

```text
nodeCount × nodeWidth
```

### Failure

Global placement assumes:

```text
Feature A = 800px
Feature B = 800px
```

while local placement actually requires:

```text
Feature A = 1300px
Feature B = 1200px
```

The result is crowding.

### Fix

Feature geometry must use measured/conservative bounds, ideally:

```text
discover feature
→ layout/estimate internal feature geometry
→ obtain feature bounds
→ place feature region
→ finalize local layout
→ reserve secondary geometry
```

Do not use membership count alone.

---

## I. Global gap constants are changed to fix one fixture

A change such as:

```text
horizontalGap: 80 → 40
```

may fix width in one fixture while destroying readability in another.

Likewise:

```text
80 → 140
```

can fix Bouquet while causing scale-100 width growth.

### Fix

Separate semantic spacing policies where justified:

```text
feature gap
domain gap
role-row gap
satellite gap
component gap
layer gap
```

but avoid uncontrolled constant proliferation.

---

## J. Primary/secondary classification changes

Relevant files:

```text
analysis.ts
layers.ts
domains.ts
architecture-layout.ts
metrics.ts
satellites.ts
```

A classification change can suddenly alter:

- rows
- widths
- domain geometry
- feature membership
- satellite anchors
- layer heights.

### Fix

Feature work must explicitly preserve primary/secondary classification unless changing it is intentional and separately approved.

---

## K. Tests/fields leak into primary geometry

Relevant files:

```text
analysis.ts
global-layout.ts
local-layout.ts
satellites.ts
architecture-layout.ts
```

This was a known historical failure mode.

Correct:

```text
primary geometry
   ↓
application layout

secondary geometry
   ↓
satellite attachment
```

Not:

```text
tests + fields + primary nodes
   ↓
one giant primary layout rectangle
```

---

## L. Position Authority intentionally preserves a close coordinate

Relevant files:

```text
position-policy.ts
GraphView.tsx
graph-layout.ts
architecture-layout.ts
```

The accepted authority order is:

```text
USER
>
PERSISTED
>
EXISTING CYTOSCAPE
>
INTELLIGENT LAYOUT
>
FALLBACK
```

If a persisted/user position is close, the system may correctly preserve it.

### Debug first

```text
Did computeArchitectureLayout run?
Did the coordinate actually change?
Which authority supplied the final coordinate?
```

Do not weaken Position Authority to solve a geometry complaint.

---

## M. Static Mode creates apparent spacing differences

Relevant files:

```text
position-policy.ts
GraphView.tsx
graph-layout.ts
```

Under the accepted contract, these must not cause unwanted relayout:

```text
filter
focus
depth
direction
selection
investigation
visibility
mode switch
```

A changed visible subset can therefore appear differently spaced while coordinates remain unchanged.

### Fix

Distinguish:

```text
initial layout
explicit Reset Layout
new-node placement
```

from view-only changes.

---

## N. Ordering changes without bound recalculation

If a change turns:

```text
Feature A = 4 rows
Feature B = 1 row
```

into:

```text
Feature A = 2 rows
Feature B = 3 rows
```

but old bounds are reused, downstream regions can become too close.

### Fix

Whenever ordering changes:

- row count
- column count
- node dimensions
- cluster height
- layer height

must be recomputed.

---

## O. Crossing optimization destroys readability

Fewer crossings do not necessarily mean better spacing.

A crossing-reduction move can produce:

```text
fewer crossings
+
smaller node gaps
```

The priority must remain:

```text
Position Authority
→ layer validity
→ feature cohesion
→ dependency locality
→ clearance
→ readability
→ crossings
→ compactness
```

Do not accept crossing reduction that violates clearance.

---

# 4. File responsibility map

| File | Main distance risk |
|---|---|
| `architecture-layout.ts` | Stage ordering, bridge/component integration |
| `global-layout.ts` | Global region width/height, domain/feature placement, layer spacing |
| `local-layout.ts` | Node placement, rows/columns, local gaps, topology alignment |
| `spacing.ts` | Final clearance/collision cleanup |
| `components.ts` | Component bounds and inter-component gaps |
| `satellites.ts` | Secondary-node crowding and anchor distance |
| `analysis.ts` | Primary/secondary classification, ownership, parent resolution, bridge eligibility |
| `layers.ts` | Layer membership and geometry assumptions |
| `domains.ts` | Domain grouping/order |
| `centrality.ts` | Hub/bridge signals affecting placement |
| `metrics.ts` | Detection/reporting of geometry regressions |
| `graph-layout.ts` | Layout orchestration |
| `position-policy.ts` | Whether coordinates may change |
| `GraphView.tsx` | Layout invocation/state/persistence/render integration |
| `layout/types.ts` | Shared layout contracts |

---

# 5. Stage-by-stage forensic method

When a pair is too close, capture coordinates after:

```text
Stage 5 — global placement
Stage 7 — primary local placement
Stage 8 — bridge placement
Stage 9 — satellites
Stage 10 — component packing
Stage 11 — spacing
Final — Position Authority restoration
```

For each node record:

```text
id
x
y
width
height
layer
domain
feature
role
primary/secondary
component
anchor
```

Calculate:

```text
minimum pair gap
minimum primary-primary gap
minimum same-feature gap
minimum cross-feature gap
minimum same-layer gap
minimum cross-layer gap
minimum satellite-parent gap
minimum component gap
```

The **first stage** where:

```text
gap < requiredGap
```

is the stage to investigate.

---

# 6. Pair-level incident report

For any reported pair A/B, generate:

```text
Node A
  id
  role
  layer
  domain
  feature
  primary/secondary
  component
  width
  height

Node B
  id
  role
  layer
  domain
  feature
  primary/secondary
  component
  width
  height

For every stage:
  A.x
  A.y
  B.x
  B.y
  gapX
  gapY
  rectangleDistance
```

Then identify:

```text
first violating stage
```

This turns a visual complaint into an actionable code location.

---

# 7. Distance regression metrics

Track more than overlap:

| Metric | Meaning |
|---|---|
| `minPrimaryGap` | Closest primary-primary pair |
| `minSameFeatureGap` | Closest pair inside a feature |
| `minCrossFeatureGap` | Separation between feature regions |
| `minSameLayerGap` | Closest same-layer pair |
| `minCrossLayerGap` | Closest cross-layer pair |
| `minSatelliteParentGap` | Satellite-parent clearance |
| `minComponentGap` | Disconnected component separation |
| `overlapCount` | Actual rectangle overlaps |
| `nearCollisionCount` | Pairs below readability threshold |
| `medianPrimaryGap` | Typical primary spacing |
| `P90PrimaryGap` | Spacing distribution |
| `clusterDiameter` | Feature footprint |
| `clusterCompactness` | Feature density |

**Zero overlaps is not enough.** A layout can have zero overlaps and still be unreadable.

---

# 8. Where the fix usually belongs

## First violation in local placement

Fix:

```text
local-layout.ts
```

## Whole feature/domain region too narrow

Fix:

```text
global-layout.ts
```

or feature-bound calculation.

## Satellite crowding

Fix:

```text
satellites.ts
```

and/or its occupancy contract.

## Disconnected components too close

Fix:

```text
components.ts
```

or component bounds.

## Bridge crowding

Fix:

```text
architecture-layout.ts
analysis.ts
```

depending on whether the problem is placement or classification.

## Everything becomes close only after final cleanup

Investigate:

```text
spacing.ts
```

## Coordinates never changed

Investigate:

```text
position-policy.ts
graph-layout.ts
GraphView.tsx
```

before modifying geometry.

---

# 9. Recommended minimum-clearance policy

Do not immediately hard-code one universal number.

Define semantic categories:

```text
primary ↔ primary
primary ↔ satellite
satellite ↔ satellite
feature ↔ feature
component ↔ component
layer ↔ layer
```

Then centralize:

```text
requiredGap(pairContext)
```

The exact values should be calibrated from the current node dimensions and accepted fixtures.

Do not scatter independent gap constants throughout the layout pipeline.

---

# 10. Feature Cluster spacing rules

The upcoming Feature Cluster system needs two distinct objectives:

```text
feature cohesion
```

and:

```text
minimum readability clearance
```

"Close enough to read as one capability" must not become "touching."

The correct target is:

```text
high cohesion
+
valid clearance
```

not:

```text
minimum distance
```

Shared infrastructure must not become cluster glue:

```text
Feature A       Feature B       Feature C
    \              |              /
             Shared Logger
```

---

# 11. Tests and fields

Tests should generally satisfy:

```text
distance(test, owner)
```

being relatively small.

But they must not determine:

```text
distance(feature A, feature B)
```

Likewise fields/objects must not make a feature enormous simply because it owns many schema artifacts.

Preferred order:

```text
primary feature layout
→ tests
→ fields/secondary nodes
→ satellites
→ final spacing
```

---

# 12. Safe spacing architecture

The final geometry stage should behave like:

```text
candidate coordinates
       ↓
geometry validation
       ↓
   ┌───┴────┐
   │        │
valid    violation
   │        │
   ▼        ▼
continue  deterministic correction
              ↓
        affected-neighborhood
            revalidation
              ↓
            stable
```

No random jitter.

No arbitrary nudging.

No global movement just to repair one pair.

---

# 13. Performance requirement

A naive minimum-distance pass is:

```text
O(N²)
```

which is undesirable for large graphs.

Use the project's spatial-hash/neighborhood approach:

```text
node
 ↓
spatial hash cells
 ↓
nearby candidates
 ↓
rectangle/clearance check
```

Do not compare every node against every other node unless the fixture is deliberately tiny.

---

# 14. Dedicated geometry safety contract

Before further Feature Cluster geometry work, add a diagnostic contract such as:

```text
LayoutGeometryDiagnostics {
  minPrimaryGap
  minFeatureGap
  minLayerGap
  minComponentGap
  minSatelliteParentGap
  overlapCount
  nearCollisionCount
  firstViolationStage
}
```

This is **diagnostic infrastructure**, not another layout engine.

It lets every future change answer:

```text
Did feature cohesion improve?
Did minimum clearance regress?
Where did it regress?
Did the regression happen before or after feature placement?
Did Position Authority change anything?
```

---

# 15. Recommended ownership

If no equivalent abstraction already exists, consider:

```text
explorer/src/lib/layout/geometry-spacing-policy.ts
```

for centralized spacing policy:

```text
requiredPrimaryGap
requiredSecondaryGap
requiredFeatureGap
requiredComponentGap
requiredLayerGap
```

Do not create it blindly. The baseline audit should first verify whether an existing policy abstraction is already present.

Keep actual responsibilities in:

```text
local-layout.ts
global-layout.ts
satellites.ts
components.ts
spacing.ts
```

Diagnostics can remain in:

```text
metrics.ts
```

or a dedicated diagnostics module if warranted.

Keep:

```text
architecture-layout.ts
graph-layout.ts
```

as orchestration/integration points.

Do not put geometry responsibility into:

```text
position-policy.ts
```

Position Authority decides **whether coordinates may change**, not how nodes should be arranged.

---

# 16. Regression test requirements

For representative fixtures, assert:

```text
overlapCount === 0
minPrimaryGap >= configuredPrimaryClearance
minFeatureGap >= configuredFeatureClearance
```

and track:

```text
nearCollisionCount
```

Do this for:

```text
Cloud Spend
Bouquet
small fixtures
dense fixtures
bridge-heavy fixtures
test-heavy fixtures
field-heavy fixtures
disconnected components
long-chain
hub-heavy
```

For semantically identical graphs, require identical:

```text
coordinates
minimum gaps
feature membership
stage bounds
near-collision set
metrics
```

under:

```text
canonical input
reversed nodes
shuffled nodes
reversed edges
shuffled edges
```

---

# 17. Practical incident workflow

When you see:

```text
A     B
```

become:

```text
A B
```

do this:

```text
1. Identify A and B.
2. Determine roles/layers/domains/features.
3. Check Position Authority.
4. Confirm whether computeArchitectureLayout ran.
5. Capture stage-by-stage coordinates.
6. Find first stage where clearance dropped.
7. Identify cause:
     classification
     bounds
     ordering
     packing
     satellite
     bridge
     spacing
     authority
8. Fix the earliest incorrect stage.
9. Run affected fixture.
10. Run representative regressions.
11. Run determinism tests.
12. Run performance comparison.
```

Never start by changing a gap constant.

---

# 18. Final project rule

> **No layout change is complete until we know not only whether nodes overlap, but also whether minimum readable clearance, feature cohesion, layer separation, component separation, satellite spacing, determinism, and Position Authority behavior remain valid.**

The accepted Wave 1–13 system solved many structural problems. Feature Cluster work must add recognizable application-feature geometry **without reintroducing the old spacing, width, satellite, bridge, or authority failures.**

The most important debugging principle is:

> **Find the first pipeline stage that violates the intended geometric contract, then fix that stage rather than adding another downstream nudge.**
