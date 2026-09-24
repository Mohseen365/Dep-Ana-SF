# G-SAT Deliverables — Satellite Geometry

## 1. Audit Status

**Status:** CLOSED / VERIFIED  
**Decision:** `HYPOTHESIS REJECTED — NO CHANGE REQUIRED`

The G-SAT investigation established that the suspected detached satellite-column defect is not caused by anchored satellite placement using global layer Y coordinates.

The conclusion is supported by the canonical benchmark fixture and the available real Salesforce project datasets.

---

## 2. Scope

G-SAT investigated whether satellite placement could create a detached/dangling vertical column because Stage 9 satellite placement used global layer Y values after the Stage 5 → Stage 7 feature-local Y handoff.

The investigation was audit-only. No source code, tests, fixtures, project datasets, configuration, or context files were modified.

---

## 3. Authoritative Context

### Context Path

`AGENT.md` → `08_Audit_Source_Register.md` → `CURRENT-STATE-BASELINE.md` → `audit-reports/features/FEAT-LAYOUT-report-v2.md` → `explorer/src/lib/architecture-layout.ts` → `explorer/src/lib/layout/satellites.ts` → `explorer/src/lib/layout/global-layout.ts` → `explorer/src/lib/layout/metrics.ts`

### Governing State

- Stage 5 → Stage 7 `featureLayerYMap` handoff is active and frozen.
- Canonical fixture:
  `audit-fixtures/cloud-spend-tracker/explorer-data.json`
- Canonical fixture SHA-256:
  `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`

---

## 4. Current Layout Baseline

| Metric | Result |
|---|---:|
| Primary-primary crossings (`C_pp`) | 8,704 |
| Total crossings (`C_total`) | 94,662 |
| Primary overlaps | 0 |
| Satellite overlaps | 0 |
| Layer hierarchy violations | 0 |
| Minimum physical clearance | ≥ 40 px |
| Determinism drift | 0.00000 px |
| Position Authority / CLI gates | Passing |

The Stage 7 handoff is:

```ts
featureLayerYMap: globalDomainResult.featureLayerYMap
```

---

## 5. Real Salesforce Project Validation

### `explorer/public/projects/`

Available projects:

- `movie` — 9 nodes, 16 edges
- `project-b` — 14 nodes, 16 edges
- `test-canonical-project` — 2 nodes, 1 edge
- `test-norm-proj` — 1 node, 0 edges

### `analyze/projects/`

Reported as empty.

### Real-project validation inputs

- `explorer/public/projects/movie/explorer-data.json`
- `explorer/public/projects/project-b/explorer-data.json`
- `explorer/public/projects/test-canonical-project/explorer-data.json`
- `explorer/public/projects/test-norm-proj/explorer-data.json`

The canonical benchmark fixture was also retained as a validation input.

---

## 6. Satellite Producer → Consumer → Runtime Chain

```text
Feature Discovery
    ↓
Global Feature Layout
    ↓
featureLayerYMap
    ↓
Stage 7 Primary Local Layout
    ↓
primaryNodePositions
    ↓
Stage 8 Bridge Refinement
    ↓
Stage 9 placeSatellites()
    ↓
Stage 10 Component Packing
    ↓
Stage 11 Spacing / Collision Cleanup
    ↓
Stage 12 Position Authority
    ↓
GraphView / Cytoscape
```

`computeGlobalFeatureLayout()` produces `featureRegions`, global `layerYMap`, and feature-local `featureLayerYMap`.

`computeLocalNodeLayout()` consumes `featureLayerYMap` and produces primary node positions.

`placeSatellites()` receives Stage 7/8 `basePositions` as the primary anchor source.

---

## 7. Satellite Coordinate Contract

### Anchored satellites

Anchored satellite Y is:

```text
primary anchor Y
+
satellite slot offset
```

The primary anchor comes from Stage 7 primary node positions.

Therefore anchored satellites inherit the feature-local Y coordinate of their primary parent.

### Fallback satellites

Global `layerYOffsets` is used for satellites without a valid primary parent.

Fallback examples include:

- unanchored fields
- unanchored tests
- unplaced triggers/handlers

Fallback coordinates can use schema/application global Y values.

---

## 8. Exact Global-Y Usage

The audit found that global `layerYOffsets` is used in `placeSatellites()` for fallback/default paths, including:

1. fallback anchors for unanchored fields/tests
2. default Y for unplaced triggers/handlers when no connected parent exists

It is **not** used to determine Y for normally anchored satellites.

---

## 9. G-SAT Hypothesis Test

### Hypothesis

> The orange/detached satellite column is caused by satellite placement using inappropriate global layer Y coordinates instead of feature-local primary-anchor coordinates.

### Result

**Rejected.**

For the canonical fixture and the available real project datasets, the relevant anchored satellites use valid primary anchors.

The suspected global-Y mechanism is therefore not responsible for the observed detached column.

---

## 10. Explanation of the Observed Vertical Orange Strip

The audit identifies existing layout behavior that can visually produce a vertical orange strip:

### A. Field stacking geometry

`generateSatelliteSlots()` intentionally applies field-specific slot geometry.

Multiple fields belonging to a CustomObject can stack in a narrow vertical arrangement.

### B. Schema-layer placement

CustomObjects belong to the schema layer.

Fields attached to schema objects can therefore extend downward from the CustomObject near the lower portion of a feature.

### C. Feature overlay geometry

The feature overlay can encompass the resulting node geometry.

This can make the field stack appear as a vertical strip at the bottom of the feature area.

This behavior is not evidence of a detached-coordinate defect.

---

## 11. Real-Project Generalization

The G-SAT conclusion was checked against:

- canonical benchmark fixture
- `movie`
- `project-b`
- `test-canonical-project`
- `test-norm-proj`

The audit reports that the relevant CustomObject fields and Apex tests had valid primary anchors across the canonical and available real-project datasets.

No detached satellite column attributable to global-Y anchored placement was established.

### Qualification

`analyze/projects/` is currently empty.

The available real-project sample is therefore limited to the datasets currently present under `explorer/public/projects/`.

This conclusion should be understood as:

> G-SAT is closed for the currently available canonical and real-project validation datasets.

It should not be interpreted as proof that every possible future Salesforce project shape has identical satellite characteristics.

---

## 12. Existing Machinery Reuse

The existing architecture already provides the correct mechanism:

```text
Stage 5
featureLayerYMap
    ↓
Stage 7
primaryNodePositions
    ↓
Stage 9
satellite anchor = primaryNodePositions
```

No additional feature-local-Y parameter is required by Stage 9 for normally anchored satellites.

---

## 13. Code-Change Decision

**No code change is justified.**

Do NOT:

- pass `featureLayerYMap` directly into `placeSatellites()`
- rewrite `generateSatelliteSlots()`
- change satellite anchor semantics
- change Stage 5 → Stage 7
- change Position Authority
- introduce a new layout system
- introduce a side-channel for satellite coordinates
- modify project datasets

The existing satellite machinery should remain protected.

---

## 14. Protected Systems

The following remain protected:

- feature discovery
- feature roles
- `featureLayerYMap` generation
- Stage 5 → Stage 7 handoff
- feature-region packing
- ordering/crossing reduction
- local node layout
- bridge placement
- satellite placement
- component packing
- spacing / 40 px clearance
- Position Authority
- GraphView
- FeatureOverlayCanvas
- canonical deterministic behavior

---

## 15. Validation Contract

Future changes affecting satellite geometry should preserve:

- satellite-primary anchoring
- zero primary overlaps
- zero satellite overlaps
- ≥40 px clearance
- zero layer violations
- deterministic output
- Position Authority behavior
- crossing gates
- canonical fixture behavior
- available real Salesforce project behavior

When new real Salesforce project datasets become available, they should be included in future relevant visual/layout validation.

---

## 16. Final Decision

# `HYPOTHESIS REJECTED — NO CHANGE REQUIRED`

G-SAT is closed.

The suspected global-layer-Y satellite-placement defect is not supported by the available evidence.

The observed vertical field/satellite strip is explained by existing satellite slot stacking and schema-layer geometry rather than a detached satellite-coordinate handoff defect.

No implementation work should be performed for G-SAT.

---

## 17. Follow-up

The next independent investigation is:

**G-OVL — Feature Region Visualization / Enclosure**

G-OVL should continue to use:

- canonical fixture for deterministic validation
- `explorer/public/projects/` for real-project validation
- `analyze/projects/` when project datasets become available

G-OVL must not reopen G-SAT or the already-verified Stage 5 → Stage 7 handoff.
