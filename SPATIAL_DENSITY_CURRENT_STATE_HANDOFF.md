# SPATIAL_DENSITY_CURRENT_STATE_HANDOFF

**Project:** Salesforce Architecture Explorer / Dependency Analyzer  
**Purpose:** Current-state handoff for the spatial-density / Stage-8 investigation  
**Audit date:** October 2, 2026  
**Repository:** `/app`

---

## 1. Executive State

The original product problem is:

> Architecture nodes become excessively far apart, producing pathological horizontal spread and poor spatial density in Graph View.

The current evidence establishes that **SB-1C materially improves this original problem**. Therefore, **do not redesign SB-1C around the remaining Stage-8 structural overlap issue**.

Current state:

- **Spatial-density objective:** `IMPROVEMENT_CONFIRMED`
- **SB-1C redesign:** `NOT JUSTIFIED`
- **Stage-8 structural overlap issue:** `ROOT CAUSE PROVEN`
- **Phase-5A repository changes:** `NONE`
- **Next work:** one controlled experiment only
- **Stage 9/10/11 redesign:** `OUT OF SCOPE`

## 2. Evidence Chain

### Phase 1
`SB1C_PHASE1_REPOSITORY_TRUTH_AND_IMPLEMENTATION_CONTRACT.md`

Established repository truth, the original Stage-8 pathological-width problem, and the SB-1C contract.

Authoritative SHA: `fd8ceeeba48c2dee80edf53c7543a86613fa8808`

### Phase 2
`SB1C_PRODUCTION_IMPLEMENTATION_AND_ADVERSARIAL_VALIDATION_REPORT.md`

Reported the SB-1C production implementation and major Stage-8 width reductions. Its acceptance was later independently challenged.

### Phase 3
`SB1C_PHASE3_ADVERSARIAL_ACCEPTANCE_REAUDIT.md`

Verdict: `SB1C_ACCEPTANCE_REJECTED`.

Established:
- Stage-8 bridge-primary overlaps remained;
- Stage 11 moved many bridges;
- Stage 8 isolated runtime was fast;
- full-pipeline performance remained separate;
- determinism and input-order invariance were preserved.

Known CST specimen:
- Bridge: `ApexClass:StandardAccessPolicy`
- Stage-8 coordinate: `(4538.80, 260)`
- Stage-7 primary: `ApexClass:DateUtils` at `(4579.20, 260)`
- `dx = 40.40`, `dy = 0`
- `minDx = 160`

### Phase 4
`SB1C_SPATIAL_DENSITY_TRUTH_AUDIT.md`

Verdict: `SPATIAL_DENSITY_IMPROVEMENT_CONFIRMED`.

### Phase 5A
`PHASE_5A_PRIMARY_OCCUPANCY_DATA_FLOW_RECONCILIATION.md`

Status: `RECONCILIATION_COMPLETE`.

Proved the precise data-flow defect responsible for the known Stage-8 bridge-primary overlap.

## 3. Original Objective — Protected

The primary objective is **not** “eliminate every Stage-8 overlap at any cost.”

The primary objective is:

> reduce pathological spatial spread, improve semantic locality, and keep the graph readable.

Collision safety is a structural constraint, but it must not be pursued by simply expanding X indefinitely or destroying semantic locality.

## 4. SB-1C Spatial-Density Result

Phase 4 measured Stage 7 → Stage 8 → Stage 9 → Stage 10 → Stage 11 → Final.

### Final Canvas Width

| Dataset | Baseline | SB-1C Final | Change |
|---|---:|---:|---:|
| CST | 11039.20 | 8377.60 | -24.1% |
| BQC | 12140 | 6080 | -49.9% |
| PBIM | 18900 | 10740 | -43.2% |

### Final Semantic-Neighbor Median

| Dataset | Baseline | SB-1C Final | Reduction |
|---|---:|---:|---:|
| CST | 2262.92 | 876.81 | -61.2% |
| BQC | 2403.20 | 622.90 | -74.1% |
| PBIM | 3454.85 | 1520.13 | -56.0% |

### Final Semantic-Neighbor P95

| Dataset | Baseline | SB-1C Final | Reduction |
|---|---:|---:|---:|
| CST | 5388.75 | 3175.87 | -41.1% |
| BQC | 5098.71 | 2086.71 | -59.1% |
| PBIM | 8253.63 | 3866.26 | -53.2% |

### Final Maximum Semantic Distance

| Dataset | Baseline | SB-1C Final | Reduction |
|---|---:|---:|---:|
| CST | 8667.78 | 3574.35 | -58.8% |
| BQC | 5812.40 | 4339.75 | -25.3% |
| PBIM | 9269.52 | 5227.96 | -43.6% |

These measurements establish that SB-1C is not merely compressing empty space: semantic-neighbor distances themselves materially decreased.

## 5. Remaining Problems

### 5.1 Stage-8 bridge-primary overlaps

Phase 3 reported:
- CST: 13
- BQC: 14
- PBIM: 34

Bridge-bridge overlaps were reported as zero.

Phase 5A now proves the data-flow cause.

### 5.2 Stage-10 component packing

PBIM corridor locality increased from Stage-8 median `200` to final `2200`. Phase 4 attributed this to Stage-10 packing of a disconnected subgraph.

Do not blame this on SB-1C without new evidence.

### 5.3 Stage-9/full-pipeline runtime

Stage-8 isolated runtime was fast while full-pipeline runtime remained much larger. This is a separate workstream and must not be mixed with the current spatial-density experiment.

## 6. Phase 5A — Proven Root Cause

At Stage 7:

`ApexClass:DateUtils = (4579.20, 260.00)`

`basePositions` initially contains that coordinate.

Stage 8 then processes `DateUtils` itself as a bridge and executes the equivalent of:

```ts
basePositions[node.id] = bridgeInfo.candidatePosition;
```

For `DateUtils`, that becomes:

`(1360.00, 360.00)`

Later, `StandardAccessPolicy` receives:

`allocatedPositions: basePositions`

but the `DateUtils` entry is now:

`(1360.00, 360.00)`

rather than the original Stage-7 primary coordinate.

`activeOccupancy` therefore also contains `(1360.00, 360.00)`.

The collision predicate correctly evaluates that coordinate:

- candidate `(4538.80, 260.00)`
- DateUtils `(1360.00, 360.00)`
- `dx = 3178.80`
- `dy = 100.00`
- `minDx = 160`
- `minDy = 100`

The predicate returns `false`.

But against the original Stage-7 primary coordinate:

- DateUtils `(4579.20, 260.00)`
- candidate `(4538.80, 260.00)`
- `dx = 40.40`
- `dy = 0`

which is a physical overlap under the project's separation rule.

### Proven lineage

```text
Stage 7 primaryNodePositions
        |
        | DateUtils = (4579.2, 260)
        v
basePositions initial state
        |
        | Stage 8 processes DateUtils as bridge
        v
basePositions mutation
        |
        | DateUtils = (1360, 360)
        v
options.allocatedPositions
        |
        v
activeOccupancy
        |
        | DateUtils = (1360, 360)
        v
collides(StandardAccessPolicy)
        |
        | dx = 3178.8, dy = 100
        v
false
```

### Root-cause classification

`PROVEN REPORTING/RECONSTRUCTION DISCREPANCY & PROVEN DATA-FLOW DEFECT`

The underlying engineering defect is that `basePositions` is simultaneously serving as a Stage-7 primary-position store and a mutable Stage-8 bridge-allocation store. Those are different semantic occupancy states.

## 7. What Is Still Unproven

1. Whether preserving immutable Stage-7 primary occupancy eliminates all Stage-8 bridge-primary overlaps.
2. Whether it causes unnecessary bridge displacement.
3. Whether semantic-neighbor median/P95/max remain within acceptable bounds.
4. Whether final canvas width remains improved.
5. Whether Stage-8 exhaustion changes.
6. Whether determinism and input-order invariance remain unchanged.
7. Whether downstream Stage 9–11 behavior materially changes.

Do not state these as solved.

## 8. Next Experiment — H-5A

### Objective

Test whether Stage 8 can reason simultaneously about:

1. immutable Stage-7 primary occupancy; and
2. dynamically allocated Stage-8 bridge occupancy.

### Hypothesis

Maintain an immutable Stage-7 position snapshot separately from the mutable Stage-8 allocation state. Collision evaluation should see both occupancy sets without replacing the Stage-7 primary coordinate with the bridge coordinate.

### Critical warning

Do **not** blindly implement:

```ts
{
  ...stage7Positions,
  ...basePositions
}
```

and assume this solves the defect. If a bridge node exists in both maps, the later spread can overwrite the Stage-7 coordinate again.

The experiment must preserve two semantic occupancy sets rather than merging them with ambiguous key precedence.

## 9. Controlled-Experiment Requirements

Hold constant:
- CST/BQC/PBIM datasets;
- node dimensions and gaps;
- Stage-8 lane geometry;
- corridor expansion rules;
- bridge ordering;
- Stage 9–13;
- UI and fixtures;
- unrelated layout behavior.

Change exactly one conceptual variable:

> Preserve immutable Stage-7 primary occupancy during Stage-8 collision evaluation while retaining dynamic Stage-8 bridge occupancy.

## 10. Required Measurements

### Structural
- Stage-8 bridge-primary overlap count
- Stage-8 bridge-bridge overlap count
- Stage-8 exhaustion count
- candidate rejection count
- corridor expansion steps

### Spatial-density
- final canvas width
- semantic-neighbor median
- semantic-neighbor P95
- semantic-neighbor maximum
- Stage-8 semantic-neighbor median/P95
- corridor locality

### Stability
- 10x determinism
- input-order invariance
- coordinate reproducibility
- downstream Stage-9/10/11 behavior

### Displacement
- Stage 7 → Stage 8
- Stage 8 → Stage 11
- Stage 7 → Final

## 11. Acceptance Philosophy

Do **not** define success as “zero overlaps at any cost.”

A successful experiment must demonstrate:

1. meaningful reduction/elimination of the known Stage-8 bridge-primary defect;
2. no Stage-8 exhaustion;
3. no unacceptable deterioration in semantic locality;
4. no recreation of pathological canvas width;
5. deterministic behavior;
6. preservation of the proven SB-1C spatial-density gains.

If overlap count reaches zero but semantic distances or width materially worsen, the experiment is not automatically a success.

## 12. Protected Invariants

- Reduce pathological horizontal spread and improve readable semantic locality.
- Do not redesign the finite dynamic 2D SB-1C corridor based solely on the overlap defect.
- Do not modify Stage 9, 10, or 11 as part of this experiment.
- Do not reintroduce unbounded X expansion.
- Preserve determinism.
- Preserve input-order invariance.
- Require evidence before accepting implementation.

## 13. Historical Failure Modes

### SB-1A
Bounded X-only placement failed through insufficient space/exhaustion and did not robustly solve pathological placement.

### SB-1B
Fixed three-lane bounded 2D placement failed through primary blockage, fragmentation, and capacity exhaustion.

### Historical unbounded Stage-8 search
An unbounded `candidateX += 160` search could recreate pathological graph width.

### “Just pass basePositions”
Invalid as a fix: Phase 5A proved `basePositions` was already passed. The defect is that its Stage-7 coordinates are overwritten for bridge nodes.

## 14. Current Repository Truth

Latest Phase-5A audit state:

`5d596fadcef827a97faad50a83f0286b1538ac6f`

Phase-3 audit SHA:

`a4cc41b37c5956ef844cf7e655300bc108ae1fb1`

Phase 5A reported:
- tracked production modifications: `0`
- tracked test modifications: `0`
- tracked fixture/dataset modifications: `0`
- layout behavior altered during audit: `No`
- commits created during investigation: `None`
- working tree: clean

## 15. Next Task

The next engineering task should be:

**PHASE 5B — CONTROLLED DUAL-OCCUPANCY STAGE-8 EXPERIMENT**

It should:
1. preserve an immutable Stage-7 primary occupancy representation;
2. preserve dynamic Stage-8 bridge occupancy;
3. make the smallest possible implementation change;
4. run CST/BQC/PBIM;
5. compare directly against the current SB-1C baseline;
6. measure structural safety and spatial density together;
7. reject the experiment if it recreates pathological spread;
8. avoid Stage 9–13 modifications;
9. report exact before/after coordinates for the known CST specimen;
10. leave the original SB-1C baseline recoverable.

Do not start with a broad refactor.

## 16. Final Handoff Verdict

### Spatial-density status

`SPATIAL_DENSITY_IMPROVEMENT_CONFIRMED`

SB-1C has demonstrated substantial reductions in final canvas width, semantic-neighbor median, P95, and maximum distance.

### Stage-8 structural status

`ROOT CAUSE PROVEN — FIX NOT YET IMPLEMENTED`

The remaining bridge-primary overlap defect is caused by mutable `basePositions` overwriting Stage-7 primary coordinates when a node is subsequently allocated as a Stage-8 bridge.

### Engineering decision

**Do not redesign SB-1C.**

**Do not touch Stage 9–11.**

**Do not optimize solely for zero overlap.**

Run exactly one controlled H-5A dual-occupancy experiment and judge it against the original spatial-density objective.

## 17. One-Sentence Context for the Next Chat

> SB-1C materially solved the original pathological spatial-density problem, Phase 5A proved the remaining Stage-8 bridge-primary overlaps are caused by mutable `basePositions` overwriting immutable Stage-7 primary coordinates, and the next step is a tightly controlled dual-occupancy experiment that must improve structural safety without sacrificing SB-1C’s proven spatial-density gains.
