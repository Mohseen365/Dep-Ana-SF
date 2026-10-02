# SPATIAL DENSITY ISSUE — COMPLETE CURRENT-STATE HANDOFF
## Salesforce Architecture Explorer / Dependency Analyzer

**Purpose:** Durable handoff for continuing the spatial-density investigation without repeating failed experiments or losing the evidence trail.

**Current state:** HG-1 was implemented as a controlled experiment, failed its acceptance gates, and was rolled back. The repository is restored to the pre-experiment baseline.

---

# 1. Executive Summary

The current UX problem is excessive spatial separation in several architecture visualization modes:

- **Hierarchical:** nodes can be far apart, making dependency paths harder to follow.
- **Graph/default:** the graph can spread even farther because it shares the architecture geometry pipeline for the affected mode.
- **Dependency Constellation:** dense hubs can become unreadable because too many nodes are placed around a fixed-radius ring; sparse graphs can also appear surrounded by excessive blank canvas.
- **Hybrid:** existing semantic feature-region geometry must be protected unless a shared root cause is proven.
- **Architecture Orbit:** already frozen/validated and must remain isolated.

The program deliberately avoids blind spacing tuning. The objective is to determine:

> **Where excessive space is first introduced, what mechanism causes it, what the smallest safe intervention is, and whether that intervention survives deterministic, geometric, interaction, persistence, cross-layout, and real-browser validation.**

The most important current finding is:

> **Stage 8 bridge/collision refinement is strongly implicated as the primary source of the large Hierarchical/Graph canvas expansion. However, the first attempted Stage-8 fix (HG-1 candidate-X clamping) failed because downstream collision stepping can move the final bridge position thousands of pixels outside the clamp and can trigger an even larger collision cascade.**

Therefore the next investigation must focus on the **Stage-8 collision-resolution mechanism and its cascade behavior**, not merely the initial bridge candidate position.

---

# 2. Current Evidence Identity

The HG-1 experiment used:

- Baseline commit SHA: `108d99ea5631fe6877325604964cfde08ce11b74`
- CST / Cloud Spend Tracker: 240 nodes, 1024 edges
- BQC / BigQuery Connector: 274 nodes, 603 edges
- PBIM / Public Infra Manager: 528 nodes, 2063 edges

Primary experiment report:

`HG1_CONTROLLED_IMPLEMENTATION_AND_REAL_RUNTIME_VALIDATION.md`

Previous adversarial gate:

`SPATIAL_DENSITY_PRE_IMPLEMENTATION_ADVERSARIAL_EXPERIMENT_GATE.md`

Previous synthesis:

`CROSS_LAYOUT_SPATIAL_DENSITY_ROOT_CAUSE_RECONCILIATION_AND_IMPLEMENTATION_GATE.md`

The HG-1 report states that the working tree was clean after experimental execution and forensic metric capture, and that the production change was rolled back.

---

# 3. User-Visible Problem

## Hierarchical

The graph can occupy a much wider coordinate envelope than the core domain/node geometry requires.

Symptoms:

- large blank horizontal areas
- very small fit-to-screen node sizes
- long dependency edges
- harder dependency tracing
- excessive panning/zooming

## Graph/default

For the affected architecture pipeline, Graph/default shares the same architecture geometry pipeline as Hierarchical.

Therefore the same underlying spatial expansion can manifest there rather than requiring an independent geometry explanation.

## Dependency Constellation

Constellation has two distinct problems:

### Sparse constellation

A small graph or shallow hop selection can occupy only a small central region while the fixed `900 x 900` viewBox leaves large blank margins.

### Dense constellation

A highly connected focal node can place many nodes around a fixed-radius ring. Same-ring chord distance becomes too small as population grows, producing circle/label overlap and poor relationship readability.

These are separate from the Hierarchical/Graph Stage-8 problem.

---

# 4. When the Problem Occurs

## Hierarchical / Graph

The severe expansion occurs particularly when:

1. The dataset has many domains/components.
2. Stage 5 creates a multi-row domain grid.
3. Stage 7 produces a relatively compact primary-node geometry.
4. Stage 8 creates many bridge/cross-domain nodes.
5. Multiple bridge nodes compete for the same corridor/layer positions.
6. The collision resolver repeatedly shifts bridge nodes horizontally.
7. Those shifts propagate through subsequent bridge allocations.
8. Extreme coordinates are then passed into later cleanup stages.
9. Stage 11 preserves/resolves around the expanded coordinate envelope rather than recovering the compact Stage-7 geometry.

The effect is strongest on dense/cross-domain datasets.

## Important nuance

The issue is not simply “many nodes = too much space.”

The evidence indicates that **bridge collision resolution can amplify local congestion into global horizontal expansion**.

---

# 5. Layout Pipeline Under Investigation

The architecture layout pipeline is broadly:

1. Stage 0 — indexing / validation
2. Stage 1 — architecture + feature analysis
3. Stage 2 — layer classification
4. Stage 3 — domain discovery
5. Stage 4 — feature discovery
6. Stage 5 — global domain/feature geometry
7. Stage 6 — ordering / crossing reduction
8. Stage 7 — primary local node layout
9. Stage 8 — hub/bridge spatial refinement
10. Stage 9 — satellite placement
11. Stage 10 — disconnected-component packing
12. Stage 11 — collision / spacing resolution
13. Stage 12 — final position-authority restoration

The investigation is based on tracing where the bounding box actually expands, not on assuming which stage “sounds” responsible.

---

# 6. Earlier Hypothesis: Stage 5

Stage 5 was initially suspected because domain regions appeared widely distributed.

This was corrected.

Stage 5 already enters multi-row packing for the medium/large datasets:

- CST: 106 domains
- BQC: 115 domains
- PBIM: 196 domains

Therefore:

**Stage 5 multi-row packing = secondary contributor, not the primary proven expansion mechanism.**

---

# 7. HG-2 — Stage-5 Target-Row Experiment

HG-2 proposed:

`targetRowWidth = 4800 → 2800`

The intent was to compress the initial domain grid.

## Why HG-2 was rejected

Although it reduced Stage-5/Stage-7 width, Stage 8 still re-expanded the graph.

It also caused overlap and crossing regressions.

Reported examples:

- CST Stage-7 width decreased from about 4460px to about 2540px.
- CST Stage-8 still expanded to about 9059px.
- PBIM crossings increased by +17,323 (+5.4%).
- CST/PBIM primary and satellite overlaps increased.

### Status

**HG-2 is rejected as an initial fix.**

Do not retry it merely with another arbitrary `targetRowWidth` value.

---

# 8. Stage-8 Root-Cause Discovery

The important causal decomposition is:

```text
Stage 7 compact primary geometry
        |
        v
Bridge candidate midpoint
        |
        v
Collision-resolution stepping
        |
        v
Repeated horizontal shifts
        |
        v
Bridge displacement
        |
        v
Subsequent bridge collisions
        |
        v
Cascade / avalanche
        |
        v
Very large Stage-8 / Stage-11 coordinate envelope
```

The raw midpoint calculation itself generally remains within the existing domain grid.

The large expansion is associated with the downstream collision resolver.

Relevant source:

`explorer/src/lib/layout/centrality.ts`

particularly:

`calculateBridgeCandidatePosition`

and the downstream bridge collision-resolution logic involving `shiftIndex` / `minDx`.

---

# 9. Why Stage 8 Matters

Pre-HG-1 forensic evidence showed approximately:

- CST Stage 7: ~4460px wide
- CST Stage 8: ~11121.6px wide
- PBIM Stage 7: ~4537.9px wide
- PBIM Stage 8: ~18660px wide

This established Stage 8 as the first major expansion point in the investigated pipeline.

Exact numbers can differ between reports/runs depending on measurement boundary and current benchmark instrumentation. Always reproduce against the current SHA.

---

# 10. HG-1 Experiment

## Intended hypothesis

HG-1 attempted to constrain the initial bridge candidate X position to the connected-domain corridor plus a margin:

```text
minConnectedX - margin
        <= candidateX <=
maxConnectedX + margin
```

Nominal margin:

```text
nodeWidth + horizontalGap
120px + 40px = 160px
```

## Authorized scope

Only:

- `explorer/src/lib/layout/centrality.ts`
- corresponding unit test

No Constellation, Hybrid, Orbit, Stage-5, GraphView, CSS, fixtures, or persistence changes were authorized.

---

# 11. HG-1 Critical Failure

The experiment proved that HG-1 controls only:

`candidateX`

It does NOT control:

`finalX`

The downstream collision resolver can repeatedly shift the bridge:

```text
candidateX
   |
   +-- collision
   +-- 160px
   +-- 320px
   +-- 480px
   +-- ...
   |
   v
finalX
```

Measured corridor escapes:

| Dataset | Bridges | Final corridor escapes | Escape rate |
|---|---:|---:|---:|
| CST | 104 | 96 | 92.3% |
| BQC | 68 | 63 | 92.6% |
| PBIM | 182 | 75 | 41.2% |

This is decisive evidence that candidate-only clamping is structurally insufficient.

Representative CST example:

```text
Connected bounds: [880, 2200]
Allowed corridor: [720, 2360]
Raw candidate X:      1540
Clamped candidate X:  1540
Collision steps:      105
Final X:              -6940
```

A PBIM example similarly moved from an in-corridor candidate to a final X of `10060`.

---

# 12. HG-1 Actual Regression

For CST:

```text
Stage 7 width:
4460 → 4460

Stage 8 width:
10641.6 → 10999.2

Stage 11 final width:
11341.6 → 19599.2
```

That is:

**+8257.6px / +72.8% final width.**

Other CST regressions:

- primary-primary crossings: `9562 → 9899` (+337 / +3.5%)
- maximum edge length: `6727.4 → 8587.88` (+27.6%)

The experiment therefore made the key problem worse on CST.

---

# 13. HG-1 Dataset Summary

## CST

- final width: severe regression
- primary-primary crossings: regression
- maximum edge length: regression
- no new final overlaps
- no new layer violations
- deterministic
- Hybrid unchanged
- Constellation unchanged
- Orbit unchanged

## BQC

- Stage 8 width unchanged
- Stage 11 width unchanged
- crossings slightly improved
- overlaps unchanged
- layer violations unchanged

This shows HG-1 was not a universal solution.

## PBIM

- final width unchanged
- total crossings improved slightly
- primary-primary crossings improved slightly
- primary overlap increased by 2
- median edge length increased

Again, this is not an acceptable universal density fix.

---

# 14. BQC Overlap Contradiction Resolved

An earlier adversarial report appeared to show BQC overlap increases.

A fresh baseline rerun showed:

```text
Baseline:
9 primary
5 satellite
14 total

HG-1:
9 primary
5 satellite
14 total
```

Therefore:

**HG-1 introduced zero new final BQC overlaps.**

The earlier discrepancy was measurement/reproduction inconsistency.

Future experiments must reproduce baseline metrics against the current SHA rather than copying historical numbers.

---

# 15. Layer Violations

Pre-existing violations were preserved:

```text
CST: 0 → 0
BQC: 2 → 2
PBIM: 13 → 13
```

Therefore the correct regression metric is:

```text
newLayerViolations =
postExperiment - baseline
```

Requirement:

```text
newLayerViolations = 0
```

Do not classify known baseline violations as regressions.

---

# 16. Determinism

HG-1 preserved determinism:

- 10 repeated executions: `0.00000px` drift
- 5 shuffled-input executions: `0.00000px` drift

Stable:

- node ordering
- bridge ordering
- collision direction
- no random seed dependence
- no DOM measurement dependence

Determinism was not the reason HG-1 failed.

---

# 17. Position Authority

HG-1 did not break position authority.

Verified:

- user-authored coordinates remain authoritative
- persisted project coordinates remain protected
- mode switching does not overwrite protected coordinates
- reload does not overwrite protected coordinates

Do not clear persisted coordinates to make future experiments pass.

---

# 18. Cross-Layout Isolation

HG-1 demonstrated good architectural isolation.

### Hierarchical
Affected as expected.

### Graph/default
Shares the same architecture pipeline and can share the same geometry behavior.

### Hybrid
No measurable delta.

### Dependency Constellation
No measurable delta.

### Architecture Orbit
No measurable delta.

Orbit remains frozen.

---

# 19. Real-Browser Result

Playwright validation confirmed:

- CST renders
- BQC renders
- PBIM renders
- no console errors/uncaught exceptions
- viewport fit/zoom operational
- screenshots/video captured

However:

> Technical rendering success is not layout-quality success.

CST's enormous coordinate envelope was enough to reject HG-1.

---

# 20. Final HG-1 Disposition

Final verdict:

```text
C. HG-1 FAILED — ROLLBACK
```

The production change was restored to the pre-experiment state.

The test suite passed after rollback.

Therefore:

**HG-1 should not be retained.**

Do not ship candidate-X clamping.

Do not tune the 160px value as a blind follow-up.

---

# 21. What We Have Proven

1. The visible density problem is real.
2. Hierarchical and Graph/default can share the same underlying architecture geometry pipeline.
3. Stage 5 is already multi-row for medium/large datasets.
4. Stage 5 alone does not explain the massive final-width expansion.
5. Stage 8 is the first major expansion point in the investigated pipeline.
6. Bridge collision resolution is strongly implicated in that expansion.
7. Collision stepping can move bridge nodes thousands of pixels from their connected-domain corridor.
8. Candidate-only clamping does not constrain final bridge coordinates.
9. Candidate-only clamping can trigger a larger collision cascade.
10. HG-1 is unsafe and has been rolled back.
11. Hybrid was not affected by HG-1.
12. Constellation was not affected by HG-1.
13. Orbit was not affected by HG-1.
14. Determinism survived HG-1.
15. Position authority survived HG-1.

---

# 22. What Is Not Proven Yet

Do not claim any of these as solved:

- exact minimal safe collision-resolution algorithm
- exact correct replacement for `shiftIndex`
- exact ideal bridge corridor width
- whether X-only correction is sufficient
- whether collision reservation should be local, bounded, layered, or topology-aware
- whether Stage 11 contributes more than currently measured
- final optimal Hierarchical/Graph density
- final Constellation dense-ring solution
- final Constellation sparse-viewBox solution

These require separate experiments.

---

# 23. What Should NOT Be Tried Next

Avoid:

- blind spacing-constant tuning
- `160 → 120/200/80` without a new causal hypothesis
- retrying HG-2 without new evidence
- global node shrinking
- semantic changes to solve geometry
- topology changes
- force-directed/random layout changes
- clearing persisted coordinates
- changing fixtures to make tests pass
- modifying Constellation during Hierarchical experiments
- modifying Orbit
- broad multi-file redesign

The failure was structural, not merely a bad margin.

---

# 24. Next Investigation: Stage-8 Collision Resolution

The next investigation should target:

> **Stage-8 collision-resolution mechanics and cascade amplification.**

Questions to answer:

## A. Why does the collision resolver move a bridge so far?

Measure:

- initial candidate
- occupied positions
- collision count
- step count
- direction
- first collision
- last collision
- final displacement

## B. What is the actual collision objective?

Determine whether the resolver is trying to guarantee:

- node non-overlap
- corridor separation
- layer separation
- bridge separation
- primary/bridge separation
- all of the above

## C. Why is the search one-dimensional?

Determine whether horizontal-only search causes the global cascade.

## D. Why does one bridge affect subsequent bridges?

Trace allocation order and occupancy mutation.

Key question:

> Does placing one displaced bridge make the next bridge inherit an increasingly hostile coordinate environment?

## E. What is the maximum reasonable displacement?

Derive bounds from:

- connected domain bounds
- corridor width
- neighboring bridge density
- node envelope
- horizontal gap
- layer geometry
- graph topology

## F. Can collision resolution be bounded without introducing overlap?

The goal is not merely:

`keep bridge inside corridor`

The real goal is:

> **Find a deterministic collision-free bridge placement subject to a bounded spatial envelope.**

---

# 25. Possible Future Solution Families

These are hypotheses, NOT approved implementations.

## Family 1 — Bounded collision search

Replace unlimited:

`candidate ± N * minDx`

with a mathematically bounded search and explicitly report failure if no legal slot exists.

## Family 2 — Bidirectional nearest-slot search

Instead of:

```text
0
+160
+320
+480
...
```

consider deterministic symmetric probing:

```text
0
-160
+160
-320
+320
...
```

This may reduce one-sided displacement but still requires capacity handling.

## Family 3 — Corridor capacity calculation

Before placement:

1. determine available corridor length
2. determine required bridge slots
3. determine whether capacity is sufficient
4. distribute positions deterministically

## Family 4 — Multi-lane bridge corridors

If one corridor cannot accommodate all bridges, introduce bounded lanes rather than unlimited horizontal expansion.

This changes Y geometry and therefore requires stronger semantic/layer validation.

## Family 5 — Topology-aware bridge grouping

Group bridges by connected domains/relationships before placement.

This may reduce displacement but could affect ordering/crossings, so it requires evidence.

---

# 26. Acceptance Criteria for Future Stage-8 Experiments

Every future experiment must measure:

## Geometry

- final width
- final height
- Stage-7 → Stage-8 expansion
- Stage-8 → Stage-11 expansion
- bridge displacement distribution

## Overlaps

Require:

`new final overlaps = 0`

unless an existing contract explicitly says otherwise.

## Layer violations

Require:

`newLayerViolations = 0`

relative to baseline.

## Crossings

At minimum:

`primary-primary crossings <= baseline`

Preferably:

`total crossings <= baseline`

If metrics conflict, report the tradeoff.

## Edge length

Measure:

- median
- P75
- P90
- P95
- max

Do not call a result an improvement if median improves while tail length explodes.

## Determinism

Require:

- 10 repeated runs
- 5 shuffled-input runs
- `0.00000px` drift

## Position authority

No mutation of protected user/persisted coordinates.

## Cross-layout

No unintended changes to:

- Hybrid
- Constellation
- Orbit

## Browser

Real Playwright validation required.

---

# 27. Dataset Strategy

At minimum:

- CST
- BQC
- PBIM

Also consider existing specialized fixtures when the hypothesis specifically requires them:

- bridge-heavy
- dense-cross-domain
- disconnected-components
- field-heavy
- hub-heavy
- layered-architecture
- long-chain
- scale-100-plus
- sparse-graph
- test-heavy
- trigger-handler
- two-domain
- food-delivery

Never modify fixtures merely to make an experiment pass.

---

# 28. Dependency Constellation Is a Separate Program

Do not mix Constellation into Stage-8 experiments.

## Sparse Constellation

Problem:

```text
small graph
+
fixed 900x900 viewBox
=
excess blank canvas
```

Potential future experiment:

**dynamic viewBox tightening**

The coordinate system is centered around:

`cx = 450`

`cy = 450`

Therefore the viewBox must remain centered around those coordinates.

## Dense Constellation

Problem:

```text
too many nodes
+
fixed circumference
=
tiny chord distances
=
overlap
```

Same-ring chord:

`Chord = 2 * R * sin(pi / N)`

At approximately `R = 330px`:

- N=40 → sufficient
- N=69 → sufficient
- N=120 → insufficient
- N=217 → severely insufficient

Shrinking radius is not a solution for dense rings because it makes chord distance smaller.

A previous two-track proposal was insufficient for N=217.

There remains a mathematical reconciliation needed around the exact minimum number of tracks because different radial-spacing assumptions produce different capacity results.

Do not implement C-1 until that is resolved.

---

# 29. Constellation ViewBox Finding

Existing constellation coordinates are centered around:

`(450,450)`

A prior dynamic viewBox formula centered around `(0,0)` was incorrect.

Correct conceptual form:

```text
viewBox =
[
  cx - Rmax - margin,
  cy - Rmax - margin,
  2 * (Rmax + margin),
  2 * (Rmax + margin)
]
```

This is a future experiment, not an implemented fix.

---

# 30. Protected Architecture Contracts

Every future spatial experiment must preserve:

- deterministic architecture layer ordering
- primary/satellite overlap protection
- topology
- semantic classification
- stable sorting
- deterministic IDs/hashes
- position authority
- persisted coordinates
- cross-layout isolation
- Hybrid behavior
- Orbit freeze

Do not solve density by violating these contracts.

---

# 31. Evidence Discipline

Every future report must distinguish:

### Proven
Directly measured or demonstrated by source/runtime evidence.

### Observed
Seen in screenshots/runtime but not necessarily causally proven.

### Hypothesis
A proposed explanation requiring experiment.

### Recommendation
A future engineering direction.

Never turn a hypothesis into a “root cause” merely because it sounds plausible.

---

# 32. Historical Experiment Record

## HG-2 — Stage-5 Target Width
**Status:** Rejected.

Reason:

- Stage 5 already multi-row.
- Stage 8 remained dominant.
- overlap regressions
- PBIM crossing regression.

## HG-1 — Candidate-X Corridor Clamp
**Status:** Failed and rolled back.

Reason:

- candidate-only clamp
- final corridor escape
- collision cascade
- CST +72.8% final width
- CST primary-primary crossing regression
- CST maximum-edge-length regression
- PBIM primary overlap increase.

## C-1 — Dense Constellation Multi-Track
**Status:** Not implemented.

Reason:

- previous two-track concept mathematically insufficient for high-density ring
- minimum-track/radial-envelope problem still needs reconciliation.

## C-2 — Constellation Dynamic ViewBox
**Status:** Not implemented.

Reason:

- future sparse-Constellation experiment
- coordinate-system formula corrected but not implemented.

---

# 33. Current Decision Tree

```text
Current clean baseline
        |
        v
Stage-8 collision forensic investigation
        |
        v
Can collision search be bounded safely?
        |
        +---- NO ----> investigate corridor capacity / multi-lane strategy
        |
        +---- YES
                |
                v
          controlled experiment
                |
                v
        deterministic validation
                |
                v
        real-browser validation
                |
          +-----+------+
          |            |
        PASS          FAIL
          |            |
          v            v
       retain       rollback
          |
          v
cross-layout regression
```

Only after the Hierarchical/Graph issue is independently controlled should the project proceed with Constellation experiments.

---

# 34. Practical Definition of “Solved”

Do not declare the issue solved because:

- the graph looks smaller in one screenshot
- one fixture improves
- median edge length improves
- the browser renders without errors

A solution should only be considered validated when it demonstrates:

```text
bounded geometry
+
no new overlaps
+
no new layer violations
+
no unacceptable crossing regression
+
no pathological edge-length tails
+
determinism
+
position authority preservation
+
cross-layout isolation
+
real-browser usability
```

across relevant datasets.

---

# 35. Recommended Continuation Strategy

### Step 1
Keep the repository at the clean post-HG-1 rollback baseline.

### Step 2
Perform a read-only forensic investigation of the Stage-8 collision resolver.

### Step 3
Produce a coordinate ledger for representative bridge nodes:

```text
raw candidate
connected bounds
initial slot
collision count
each displacement
final coordinate
next bridge's occupancy state
```

### Step 4
Identify the exact mechanism causing the cascade.

### Step 5
Design one single-variable experiment against that mechanism.

### Step 6
Run unit + geometry + determinism validation.

### Step 7
Run real-browser validation.

### Step 8
Accept or rollback.

### Step 9
Only then continue to Constellation sparse/dense experiments.

---

# 36. One-Sentence Current State

> **The spatial-density problem is currently traced to Stage-8 bridge collision amplification in the Hierarchical/Graph architecture pipeline; the first candidate-position clamp experiment (HG-1) was proven insufficient and harmful, was rolled back, and the next work should investigate the collision-resolution cascade itself before attempting another implementation.**

---

# 37. Key Files

Core context:

- `AGENTS.md` / `AGENT.md`
- `CONTEXT-RETRIEVAL-PROTOCOL.md`
- `08_Audit_Source_Register.md`

Architecture:

- `ARCHITECTURE_LAYOUT_IMPLEMENTATION_PLAN.md`
- `ARCHITECTURE_INTELLIGENCE_CONTRACT.md`
- `FINAL_LAYOUT_CALL_GRAPH.md`
- `FULL_LAYOUT_STAGE_RUNTIME_ATTRIBUTION_2026-09-26.md`

Density:

- `LAYOUT_BASELINE_AUDIT.md`
- `LAYOUT_DENSITY_REGRESSION_INVESTIGATION_REPORT.md`
- `LAYOUT_DENSITY_REGRESSION_Validation_and_Diff_Audit.md`
- `Layout Density Regression Verification Report.md`
- `NODE_DENSITY_REGRESSION_FORENSIC_FIX_REPORT.md`
- `P0-6_PERFORMANCE_DENSITY_AUDIT.md`
- `FEATURE_VISUAL_DENSITY_REGRESSION_WAVE12_REPORT.md`
- `FEATURE_SPATIAL_LAYOUT_FORENSIC_AUDIT.md`
- `FEATURE_SPATIAL_LAYOUT_IMPLEMENTATION_REPORT.md`
- `FEATURE_LAYOUT_FINAL_VALIDATION_REPORT.md`

Cross-layout:

- `CROSS_LAYOUT_SPATIAL_DENSITY_ROOT_CAUSE_RECONCILIATION_AND_IMPLEMENTATION_GATE.md`
- `SPATIAL_DENSITY_PRE_IMPLEMENTATION_ADVERSARIAL_EXPERIMENT_GATE.md`
- `HG1_CONTROLLED_IMPLEMENTATION_AND_REAL_RUNTIME_VALIDATION.md`

Hybrid:

- `HYBRID_LAYOUT_MASTER_BASELINE.md`
- `HYBRID_LAYOUT_DEEP_ARCHITECTURAL_AUDIT.md`
- `HYBRID_LAYOUT_FORENSIC_AUDIT.md`
- `HYBRID_LAYOUT_SPATIAL_QUALITY_AUDIT.md`

Constellation:

- `PHASE_3D_DEPENDENCY_CONSTELLATION_IMPLEMENTATION_AND_REAL_BROWSER_VERIFICATION_REPORT.md`

Orbit:

- `ARCHITECTURE_ORBIT_C9_RELEASE_DOCUMENTATION_CONTRACT_FREEZE.md`
- `ARCHITECTURE_ORBIT_C9R3_FINAL_TWO_ISSUE_CONTRACT_CLOSURE.md`
- `ARCHITECTURE_ORBIT_C10R2_FINAL_SECTOR_AND_BENCHMARK_RECONCILIATION.md`
- `ARCHITECTURE_ORBIT_C10R3_FINAL_BENCHMARK_INPUT_IDENTITY_FORENSIC_CLOSURE.md`
- `ARCHITECTURE_ORBIT_C11_FINAL_ORBIT_FREEZE_CLEAN_ROOM_VERIFICATION.md`
- `ARCHITECTURE_ORBIT_C11R_FINAL_METRIC_SCOPE_AND_FREEZE_LANGUAGE_RECONCILIATION.md`

Important source areas:

- `explorer/src/lib/layout/centrality.ts`
- `explorer/src/lib/layout/global-layout.ts`
- `explorer/src/lib/layout/architecture-layout.ts`
- `explorer/src/lib/layout/spacing.ts`
- `explorer/src/lib/layout/ordering.ts`
- `explorer/src/lib/layout/constellation-layout.ts`
- `explorer/src/lib/adapters/constellation-adapter.ts`
- `explorer/src/components/DependencyConstellationPanel.tsx`
- relevant `GraphView.tsx` / layout orchestration code

---

# 38. Final Handoff Rules

When continuing this investigation:

1. Start from repository truth.
2. Verify the current SHA and clean tree.
3. Read this handoff plus source-register-selected evidence.
4. Do not repeat HG-1.
5. Do not revive HG-2 without a new causal justification.
6. Do not modify Constellation during Stage-8 experiments.
7. Do not modify Orbit.
8. Do not clear persisted positions.
9. Do not change fixtures to make tests pass.
10. Do not weaken acceptance criteria after a failure.
11. Keep each experiment single-variable.
12. Reproduce baseline measurements before comparison.
13. Require real-browser validation for UX claims.
14. Record failures as valuable evidence.
15. Do not declare the problem solved until the full validation matrix passes.

---

## Current Status: `INVESTIGATION CONTINUES`

**Last completed experiment:** HG-1 — Candidate X Corridor Clamp

**Result:** `FAILED — ROLLED BACK`

**Current strongest root-cause mechanism:** Stage-8 collision-resolution stepping / cascade amplification

**Next logical work:** Read-only forensic analysis of the Stage-8 collision resolver and bridge allocation cascade

**Do not proceed directly to:** arbitrary spacing tuning, HG-2, Constellation implementation, Orbit modification, or broad multi-file redesign.

The project should remain in **evidence-first controlled-experiment mode** until the Stage-8 collision mechanism is understood well enough to formulate a bounded, testable intervention.
