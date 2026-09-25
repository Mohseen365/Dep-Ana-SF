# Current Hybrid Layout Geometry — Living Audit Log

> **Status:** Investigation ongoing  
> **Current phase:** Phase 12 reviewed; Phase 12A required before optimization implementation  
> **Production-code status:** No production changes from Phase 12  
> **Primary issue:** Dense Hybrid graphs can become extremely tall; current `pub-infra-mang` production geometry is approximately `12,760 × 24,670px`.

## 1. Executive Summary

The investigation began as a Hybrid Architecture Explorer visual/layout problem: feature regions could become excessively wide or vertically elongated, and dense Salesforce projects could require extreme panning.

The investigation has now established several important facts:

- Feature layouts were incorrectly prevented from using compact 2D multi-row packing; this was corrected.
- Empty feature-layer rows could create unnecessary Y gaps; this was corrected.
- Hybrid satellite placement and spacing were aligned with feature-local geometry.
- Crossing reduction was aligned with the actual Hybrid layer-Y model; a harmful global estimated-X ordering experiment was rejected.
- Edge semantics, zoom behavior, and feature overlays were completed and validated.
- Multiple later phases reconciled historical contradictions between intermediate geometry, component-packed geometry, Position Authority, and Cytoscape rendering.
- Phase 11E established that Stage 12, GraphView, and Cytoscape contain the same 528 nodes and that Stage 12 coordinates reach Cytoscape unchanged.
- Phase 12 strongly indicates that increasing Stage 5 `targetRowWidth` is **not** an effective final-height optimization lever.
- Phase 12 identifies a large Stage 5 → Stage 7 vertical expansion and identifies Stage 10 component packing as the mechanism establishing final width.

The remaining critical question is:

> **Exactly where does the large Stage 7 Y expansion originate, and is it causally controlled by Stage 7 local layout, `layerYMap`, Stage 5 feature geometry, or an interaction between them?**

Until that is proven with a same-node coordinate lineage, Stage 7 optimization should remain experimental only.

---

## 2. Current Authoritative Production Baseline

Phase 12 reports the current `pub-infra-mang` production run as:

```text
Run:                  SINGLE-RUN-3200-PHASE12
Architecture mode:   hybrid
Nodes:               528
Edges:               2063
Primary nodes:       267
Satellite nodes:     261
Composite features:  26
Connected components:77
Target row width:    3200px
```

Dataset identity reported by Phase 12:

```text
explorer/public/projects/pub-infra-mang/explorer-data.json
analyze/projects/pub-infra-mang/explorer-data.json
SHA-256: d5465b665accccd89437ced754f41b068c541c4923318b7bc88b388c96b6b943
```

Current center-node geometry:

```text
X = [60, 12820]   Width  = 12760px
Y = [30, 24700]   Height = 24670px
```

Cytoscape `boundingBox()` is reported as approximately:

```text
X = [58.5, 12821.5]   Width  = 12763px
Y = [28.5, 24701.5]   Height = 24673px
```

Phase 11E established the key identity contract:

```text
Stage 12 node count = GraphView node count = Cytoscape node count = 528
Stage 12 → Cytoscape ΔX = 0
Stage 12 → Cytoscape ΔY = 0
```

The previous hypothesis that Cytoscape secretly translated or synthesized the graph was therefore rejected.

---

## 3. Pipeline Under Investigation

The existing layout pipeline is:

1. Stage 0 — normalization/indexing
2. Stage 1 — architecture analysis
3. Stage 2 — layer classification
4. Stage 3 — domain discovery
5. Stage 3.5 — feature roles
6. Stage 4 — feature discovery
7. Stage 5 — global feature layout / 2D feature-band packing
8. Stage 6 — ordering / crossing reduction
9. Stage 7 — primary local node layout
10. Stage 8 — bridge refinement
11. Stage 9 — satellite placement
12. Stage 10 — disconnected-component packing
13. Stage 11 — spacing / collision cleanup
14. Stage 12 — Position Authority
15. GraphView / Cytoscape rendering and feature overlay

The investigation must continue using this architecture rather than introducing a second layout system.

---

## 4. Original Problems and Resolutions

### 4.1 Feature regions were packed as a long strip

The original feature-layout path disabled the 2D packing behavior. The intended multi-row behavior was restored while preserving the non-feature path.

Validated result on the canonical path included compact feature geometry, zero feature overlaps, and deterministic coordinates.

### 4.2 Empty feature-layer rows created unnecessary gaps

`computeFeatureLayerYMap` could advance Y even when `rows === 0`.

The intended correction was to advance Y only when rows exist. This removed artificial empty-layer gaps while preserving validated geometry.

### 4.3 Satellite Y authority could disagree with Hybrid primary geometry

Satellite placement was extended to use feature-local Y information where available, with global fallback. Hybrid spacing cleanup also received appropriate bounds.

Validated invariants remained intact.

### 4.4 Crossing reduction used a synthetic Y model

Crossing reduction previously used hard-coded synthetic Y positions inconsistent with compact Hybrid geometry. Passing the real layer-Y map restored coordinate-model consistency.

### 4.5 Global estimated-X feature sorting was tested and rejected

A global sort based on estimated X increased canonical primary-primary crossings:

```text
Cpp: 7766 → 8913
```

and disrupted architectural layer-band grouping.

Therefore that strategy was reverted/refuted.

### 4.6 Edge semantics and visual hierarchy were completed

Hybrid inter-feature edges were explicitly distinguished from intra-feature edges. Zoom-dependent edge opacity and feature-overlay labeling were also validated.

---

## 5. Phase 08 Findings

Phase 08 established that the intended Hybrid visual/layout delivery was largely working:

- compact 2D feature packing;
- strict architectural layer ordering;
- feature-local Y behavior;
- satellite containment and spacing;
- deterministic coordinates;
- crossing counts within the canonical baseline;
- inter-feature edge semantics;
- zoom behavior;
- overlay alignment;
- Hybrid mode switching;
- Position Authority integration.

The remaining major issue was extreme vertical extent on dense real projects, especially `pub-infra-mang`.

---

## 6. Phase 09 — Initial Extreme-Height Diagnosis

Phase 09 initially attributed the extreme vertical extent primarily to Stage 5 multi-row feature packing and macro-layer row accumulation.

It identified:

- Presentation, Application, Domain, and Schema macro bands;
- sequential row packing within those bands;
- row height controlled by the tallest feature in each row;
- large Application features;
- `Unassigned` and `Shared` contributors.

This was a plausible explanation for intermediate Stage 5 geometry, but later experiments showed that intermediate Stage 5 height does not necessarily determine final rendered height.

---

## 7. Phase 10 — Target Row Width Investigation

Phase 10 tested wider Stage 5 row widths.

A harness/configuration problem was discovered: a full-pipeline override was being dropped before reaching Stage 5. The diagnostic path was corrected so that `targetRowWidth` was actually exercised.

Phase 10C then proved that the Stage 5 row-break predicate is real and has measurable thresholds.

Examples reported:

```text
Presentation threshold:
3299 → break
3300 → no break
3301 → no break

Application threshold:
3339 → break
3340 → no break
3341 → no break
```

Extreme widths also changed Stage 5 row counts.

Therefore:

> `targetRowWidth` is a genuine Stage 5 geometry control.

But this did not prove that it is a final-render optimization lever.

---

## 8. Phase 11 — Controlled Aspect-Ratio Experiment

Phase 11 expanded the target-row-width sweep and showed that Stage 5 geometry could change substantially while final geometry changed much less.

This established a key distinction:

```text
Stage 5 improvement
≠
final rendered improvement
```

However, Phase 11 contained contradictions with earlier reports about feature counts, Stage 5 rows, and final bounds. That triggered the forensic sequence Phase 11A–11E.

---

## 9. Phase 11A–11D — Forensic Reconciliation

### Phase 11A

Identified two important historical causes of conflicting results:

1. standalone feature discovery could produce granular feature counts different from the production orchestrator;
2. diagnostic harnesses could omit `featureLayerYMap`, causing different Y-coordinate behavior.

### Phase 11B

Established a more precise production topology:

```text
528 nodes
2063 edges
267 primary
261 satellites
26 composite features
```

but still contained inconsistent aggregate geometry measurements.

### Phase 11C

Separated raw Stage 7 geometry, downstream component packing, Position Authority, and rendered geometry conceptually, but still contained incompatible stage bounds.

### Phase 11D

Traced position-map creation/mutation through local layout, bridge refinement, satellites, component packing, spacing cleanup, and Position Authority. Node-set cardinalities were useful, but aggregate bounds still conflicted.

These phases were therefore treated as forensic stepping stones rather than final geometry authority.

---

## 10. Phase 11E — Rendered Node-Set and Bounding-Box Closure

Phase 11E is the major forensic closure before Phase 12.

It established for one deterministic production run:

```text
528 total nodes
267 primary
261 satellites
26 composite features
77 connected components
```

and:

```text
Stage 12 / GraphView / Cytoscape:
528 / 528 / 528 nodes
```

with no set differences.

It also established:

```text
Stage 12 → Cytoscape:
ΔX = 0
ΔY = 0
```

The previous `+4920/+300` translation hypothesis was refuted.

Phase 11E also reconciled the historical `3720px` vs `12760px` width discrepancy as a stage-boundary issue: the smaller geometry belonged to pre-component-pack geometry, while the larger width belonged to final component packing.

The historical approximately `25740px` height was also separated from the current production `24670px` height and associated with an earlier/unanchored utility-component stacking configuration.

This closed the major rendered-node-set and bounding-box contradictions.

---

# 11. Phase 12 — Current Geometry-Dominator Experiment

## 11.1 Central result

Phase 12 tested:

```text
3200
4000
6000
10000
20000
```

for Stage 5 `targetRowWidth`.

The reported final geometry remained:

```text
12760 × 24670
```

across the sweep.

The reported crossing totals also remained unchanged.

Therefore:

> Further increasing Stage 5 `targetRowWidth` is not currently supported as an effective final-height optimization.

## 11.2 Phase 12 reported stage ledger

The report records:

| Stage | Reported Width | Reported Height |
|---|---:|---:|
| Stage 5 | 2660 | 2780 |
| Stage 7 | 2720 | 24170 |
| Stage 8 | 12460 | 24195 |
| Stage 9 | 12940 | 24670 |
| Stage 10 | 12760 | 24670 |
| Stage 11 | 12760 | 24670 |
| Stage 12 | 12760 | 24670 |

The report interprets this as a large vertical expansion appearing by Stage 7, a smaller satellite expansion in Stage 9, and final width being established by Stage 10.

---

# 12. Current Root-Cause Model

## 12.1 Height

The current working hypothesis is:

```text
Stage 5 feature geometry
        ↓
Stage 7 local primary-node placement
        ↓
architectural layer Y authority + intra-feature tier stacking
        ↓
large vertical expansion
        ↓
Stage 9 satellite envelope
        ↓
final ~24670px height
```

Phase 12 reports approximately:

```text
Stage 5 height: 2780px
Stage 7 height: 24170px
Expansion:      +21390px
```

It attributes this expansion to Stage 7's interaction with macro architectural layer Y offsets.

**Important:** this is a strong working hypothesis, but the exact Stage 5 → Stage 7 coordinate lineage is not yet closed enough to justify production modification.

## 12.2 Satellites

Phase 12 reports:

```text
Stage 8 Y: [-25, 24170]
Stage 9 Y: [-270, 24400]
```

for a `+475px` global envelope expansion.

This makes satellites a secondary height contributor, not the primary source of the full graph height.

## 12.3 Width

Phase 12 reports Stage 10 component packing as the mechanism establishing the final approximately `12760px` width.

The report describes 77 connected components, with the main component and utility components being placed by the component packing stage.

The current interpretation is:

```text
Stage 9 pre-pack geometry
        ↓
Stage 10 component packing
        ↓
final width
```

This does not imply Stage 10 should be rewritten; component isolation and collision invariants must remain intact.

---

# 13. Hypothesis Register

| Hypothesis | Status | Current Evidence |
|---|---|---|
| Stage 5 `targetRowWidth` is the primary final-height cause | **Refuted as an optimization lever** | 3200→20000 produced identical final geometry in Phase 12 |
| Stage 7 local primary layout is a major height contributor | **Strong working hypothesis** | Large reported Stage 5→Stage 7 Y expansion |
| `layerYMap` / macro-layer structure establishes a vertical floor | **Supported structurally** | Report attributes large Stage 7 Y values to architectural layer Y authority |
| Stage 9 satellites are the primary height problem | **Refuted** | Reported global contribution is ~475px |
| Stage 10 controls final width | **Strongly supported** | Final width established during component packing |
| Cytoscape secretly translates coordinates | **Refuted** | Phase 11E: zero Stage 12→Cytoscape coordinate delta |
| Hidden/filtered nodes cause final geometry | **Refuted** | 528-node identity through Stage 12, GraphView, Cytoscape |
| Historical ~25740px geometry is current rendering | **Refuted** | Current production geometry is ~24670px |
| Stage 7 is ready for implementation | **Not yet proven** | Coordinate-lineage audit still required |

---

# 14. What Has Been Solved

## Layout

- Feature layouts use compact 2D multi-row packing.
- Empty feature-layer rows no longer create unnecessary Y advancement.
- Feature-local Y is available to Hybrid satellite/layout logic.
- Hybrid spacing/collision handling uses appropriate bounds.
- Crossing reduction uses actual Hybrid layer-Y information.
- The harmful global estimated-X ordering approach was rejected.

## Visual delivery

- Inter-feature edges are explicitly distinguishable.
- Zoom-dependent edge opacity is implemented.
- Feature-region overlay behavior is zoom-aware.
- Hybrid overlay alignment and mode switching were validated.

## Forensics

- Stage 12 → GraphView → Cytoscape node-set identity is established.
- Cytoscape coordinate translation was refuted.
- Historical mixed-map measurements were identified.
- Historical utility stacking was separated from current production geometry.
- Intermediate geometry and final geometry are now treated as distinct measurement boundaries.

---

# 15. Problems Still Open

## 15.1 Stage 5 → Stage 7 coordinate lineage

We need to prove the exact relationship among:

```text
Stage 5 feature geometry
featureLayerYMap
layerYMap
Stage 7 inputs
Stage 7 node outputs
```

for the same exact node/feature identities.

## 15.2 Source of large Schema Y

The investigation must identify exactly where the large Schema Y value is generated and whether it is:

- inherited from feature geometry;
- generated from `layerYMap`;
- generated by local layout;
- generated by an interaction between these mechanisms.

## 15.3 Stage 7 optimization boundary

We must distinguish:

```text
feature-local compaction
```

from:

```text
macro-layer Y compression
```

and:

```text
inter-layer gap reduction
```

These are separate optimization mechanisms.

## 15.4 Cross-stage consequences

Any Stage 7 change must be checked through:

- bridge placement;
- satellites;
- component packing;
- spacing cleanup;
- Position Authority;
- crossings;
- rendered geometry.

---

# 16. Immediate Next Phase — Phase 12A

## Title

**PHASE 12A — STAGE 5 → STAGE 7 COORDINATE-LINEAGE & LAYER-Y AUTHORITY AUDIT**

## Objective

Determine exactly why Stage 7 produces the large vertical extent.

Trace the same node identities through:

```text
Stage 5
→ featureLayerYMap
→ layerYMap
→ computeLocalNodeLayout input
→ computeLocalNodeLayout output
→ Stage 8
→ Stage 9
→ Stage 10
→ Stage 11
→ Stage 12
```

## Required questions

1. What exact geometry/object does Stage 5 produce?
2. What exact geometry/object does Stage 7 consume?
3. Where is the approximately 24,000px Schema Y generated?
4. Does Stage 7 inherit the large Y from Stage 5 or independently construct it from `layerYMap`?
5. If `layerYMap` is held constant but feature-local packing changes, does final height change?
6. If feature-local packing is held constant but inter-layer gaps change experimentally, how does final height change?
7. Which exact final-extremum node first acquires the large Y value?

## Required trace fields

For each critical node record:

```text
node ID
feature ID
layer
Stage 5 Y
featureLayerYMap Y
layerYMap Y
Stage 7 input Y
Stage 7 output Y
Stage 8 Y
Stage 9 Y
Stage 10 Y
Stage 11 Y
Stage 12 Y
```

At minimum trace:

- topmost final node;
- bottommost final node;
- representative node from each macro layer;
- the node responsible for the large Schema Y.

## Acceptance criteria

Phase 12A is complete only when:

1. Stage 5 → Stage 7 coordinate lineage is explicit.
2. `layerYMap` ownership is identified.
3. `featureLayerYMap` ownership is identified.
4. The origin of the large Schema Y is identified.
5. Same-node coordinate traces are available across stages.
6. Inherited versus generated Y values are proven.
7. A controlled experiment demonstrates which variable changes final height.
8. No production code is changed.
9. Existing invariants remain intact.

---

# 17. Future Optimization Experiments — Only After Phase 12A

If Phase 12A confirms Stage 7 as the causal height mechanism, investigate experimentally:

### A. Feature-local tier compaction

Reduce unnecessary vertical spacing inside individual features.

### B. Inter-layer gap calibration

Experiment with smaller architectural gaps while preserving layer ordering.

### C. Combined local compaction + gap calibration

Measure whether effects are additive, absorbed, or interacting.

### D. Satellite containment after compaction

Revalidate satellite overlap, clearance, and final envelope after any Stage 7 change.

No production optimization should be implemented until these experiments identify a safe causal lever.

---

# 18. Required Optimization Metrics

Every future experiment must record:

```text
Final width
Final height
Aspect ratio

Primary overlaps
Satellite overlaps
Minimum clearance
Layer violations

Cpp
Cpb
Cbb
Cps
Css
Ctotal

Determinism drift
```

The canonical regression thresholds remain part of the gate unless superseded by the current authoritative baseline.

---

# 19. Real-Project Validation

Future optimization cannot be validated only on the canonical fixture.

Representative datasets should be taken from both:

```text
explorer/public/projects/
analyze/projects/
```

where available, including:

```text
pub-infra-mang
cst
bqc
movie
project-b
```

The canonical fixture remains the deterministic regression authority.

Real projects are required to determine whether the observed optimization behavior generalizes.

Phase 12 reports the following current comparison, which should be rechecked against repository contents before becoming a permanent baseline:

| Dataset | Nodes | Edges | Features | Components | Reported Final Geometry |
|---|---:|---:|---:|---:|---:|
| `pub-infra-mang` | 528 | 2063 | 26 | 77 | 12760 × 24670 |
| `cst` | 240 | 1024 | 21 | 1 | 6650 × 10840 |
| `bqc` | 274 | 603 | 12 | 11 | 10320 × 8880 |
| `movie` | 9 | 16 | 2 | 1 | 450 × 720 |
| `project-b` | 14 | 16 | 1 | 1 | 960 × 560 |

---

# 20. Regression Status Reported by Phase 12

Phase 12 reports:

```text
npm run test:cli                         PASS
Phase 12 geometry audit                  32/32 PASS
Phase 11E rendered-node audit            PASS
Primary overlaps                         0
Satellite overlaps                       0
Minimum clearance                        >= 40px
Determinism drift                        0.00000px
Production code changes                  NONE
```

These are source-reported results and should be rerun whenever the investigation advances.

---

# 21. Current Engineering Decision

## Do now

- Run Phase 12A.
- Prove Stage 5 → Stage 7 coordinate lineage.
- Identify the exact source of the large Schema Y.
- Separate local node compaction from macro-layer spacing.
- Use controlled experiments.
- Measure final rendered geometry, not only intermediate geometry.
- Validate against canonical and representative real projects.

## Do not do yet

- Do not modify Stage 7 production layout.
- Do not increase Stage 5 `targetRowWidth` as a presumed solution.
- Do not rewrite Stage 10 component packing.
- Do not alter Position Authority.
- Do not alter GraphView/Cytoscape coordinate handling.
- Do not remove architectural layer ordering.
- Do not arbitrarily compress macro-layer bands.
- Do not introduce a second layout engine.

---

# 22. Invariants That Must Remain Protected

Future changes must preserve or explicitly explain any deviation in:

```text
Primary overlaps = 0
Satellite overlaps = 0
Minimum clearance >= 40px
Determinism drift = 0.00000px
Canonical Cpp/Ctotal thresholds
Architectural layer ordering
Position Authority
Stage 12 → GraphView coordinate identity
```

Any experiment that violates a protected invariant must be treated as unsafe until the violation is understood.

---

# 23. Audit Lessons

### 23.1 Intermediate geometry is not final geometry

A large intermediate bound does not automatically identify the final optimization lever.

### 23.2 Magnitude does not prove causality

The largest number in a stage ledger is not automatically the root cause.

### 23.3 Node identity must be preserved

Geometry comparisons are meaningful only when the same node set and coordinate lineage are being compared.

### 23.4 Coordinate frames must be named

At minimum distinguish:

```text
feature geometry
primary-node geometry
satellite geometry
component-packed geometry
Position Authority geometry
rendered Cytoscape geometry
```

### 23.5 Diagnostic harnesses must be audited

Earlier contradictions were caused in part by different feature-discovery inputs, dropped options, omitted feature-local maps, and different stage boundaries.

### 23.6 Rendering is the final acceptance boundary

An optimization must ultimately be judged at Stage 12 / GraphView / Cytoscape, not solely at Stage 5 or Stage 7.

---

# 24. Current Status Matrix

| Area | Status |
|---|---|
| Feature 2D packing | Resolved |
| Empty feature-layer gaps | Resolved |
| Feature-local Y | Resolved |
| Satellite containment/spacing | Resolved in validated paths |
| Crossing-reduction Y consistency | Resolved |
| Edge differentiation | Resolved |
| Zoom-dependent styling | Resolved |
| Overlay alignment | Resolved |
| Stage 12 → Cytoscape identity | Resolved |
| Rendered node-set identity | Resolved |
| Historical 25740 vs current 24670 | Reconciled |
| Stage 5 `targetRowWidth` as final-height lever | Refuted by current sweep |
| Exact Stage 5 → Stage 7 Y causality | Open |
| Stage 7 optimization | Not implemented |
| Final 24670px height | Open optimization target |

---

# 25. Final Working Conclusion

The investigation has moved beyond the original belief that extreme graph height is simply a Stage 5 feature-packing problem.

The current working model is:

```text
Stage 5
  controls intermediate feature geometry

Stage 7
  appears to introduce the dominant vertical expansion

Stage 9
  adds a secondary satellite envelope

Stage 10
  establishes final component-packed width

Stage 12
  is the authoritative final position map

Cytoscape
  renders Stage 12 positions without coordinate transformation
```

The decisive next task is therefore not another broad geometry audit.

It is a narrow coordinate-lineage proof:

> **Prove exactly how Stage 5 feature geometry becomes Stage 7 primary-node Y coordinates, identify the authority responsible for the large Schema Y position, and experimentally determine which part of that transformation can be safely compacted.**

Only after that evidence is established should production optimization begin.

---

# 26. References / Audit Chain

The investigation should be read as a chain rather than as isolated reports:

1. `CONTEXT-TASK-PROMPT-TEMPLATE.md`
2. `AGENT.md`
3. `CONTEXT-RETRIEVAL-PROTOCOL.md`
4. `08_Audit_Source_Register.md`
5. `CURRENT-STATE-BASELINE.md`
6. `PROMPT_01_2D_PACKING.md`
7. `PROMPT_02_FEATURE_Y_SPACING.md`
8. `PROMPT_03_SATELLITES_AND_SPACING.md`
9. `PROMPT_04_ORDERING_AND_CROSSINGS.md`
10. `PROMPT_05_EDGE_DIFFERENTIATION.md`
11. `PROMPT_06_ZOOM_EDGE_OPACITY.md`
12. `PROMPT_07_OVERLAY_POLISH.md`
13. Phase 08 Hybrid Delivery Validation report
14. Phase 09 Extreme Vertical Extent Investigation report
15. Phase 10 Extreme-Scale Feature Packing Optimization Experiment report
16. Phase 10A Feature-Packing Harness Reconciliation report
17. Phase 10B Target-Row-Width Runtime Trace report
18. Phase 10C Break Threshold Proof report
19. Phase 11 Controlled Aspect-Ratio Experiment report
20. Phase 11A Cross-Phase Geometry Reconciliation report
21. Phase 11B Production Geometry Ledger Integrity report
22. Phase 11C Coordinate-Frame & Stage-Boundary Reconciliation report
23. Phase 11D Position Map Identity & Mutation report
24. Phase 11E Rendered Node-Set & Bounding-Box Identity report
25. `PHASE 12 — CURRENT PRODUCTION GEOMETRY DOMINATOR & OPTIMIZATION EXPERIMENT AUDIT REPORT.md`

The latest Phase 12 report is the immediate source for the current geometry-dominator experiment. It reports the target-row-width sweep, stage geometry ledger, candidate matrix, cross-dataset observations, and current optimization boundary. fileciteturn21file0L5-L15

---

# 27. Living-Document Rule

Update this file after every major forensic or optimization phase.

Each update must preserve:

```text
what was previously believed
what new evidence showed
which hypothesis was confirmed
which hypothesis was refuted
what remains uncertain
what changed in the plan
```

Do not silently rewrite historical conclusions.

When a previous conclusion is superseded, explicitly mark it:

```text
SUPERSEDED
```

and preserve the reason for supersession.

This file is both:

1. the current-state issue summary; and
2. the historical audit trail for the Hybrid layout geometry investigation.
