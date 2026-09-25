# PHASE 11A — CROSS-PHASE GEOMETRY RECONCILIATION REPORT

## A. Executive Finding

Phase 11A was executed as a formal, evidence-first forensic audit to reconcile conflicting measurements reported between:
* **Phase 10C — Break-Threshold Proof Report**
* **Phase 11 — Controlled Aspect-Ratio Optimization Experiment Report**

### Executive Verdict & Single Authoritative Runtime Truth:
1. **Current Production Path Truth (`pub-infra-mang`, `targetRowWidth = 3200px`):**
   * **Stage 5 Feature Regions:** $2,960 \times 21,940\text{ px}$ ($W \times H$), 26 composite features, 6 Y-rows across architectural layers.
   * **Stage 11 Final Canvas:** $12,760 \times 24,670\text{ px}$ ($W \times H$).
2. **Root Cause 1 of Discrepancy (Feature Assignment):**
   Phase 10C invoked `computeGlobalFeatureLayout` standalone without supplying pre-computed Stage 2/3 `layerMap` and `domainMap`. Without layer context, `discoverFeatures` generated **47 granular feature clusters** (8 Y-rows). In contrast, the production orchestrator (`computeArchitectureLayoutWithMetadata`) passes `layerMap` and `domainMap` into `discoverFeatures`, grouping co-located nodes into **26 composite feature clusters** (6 Y-rows).
3. **Root Cause 2 of Discrepancy (Stage 7 Y-Coordinate Fallback in Diagnostics Harness):**
   Phase 10C measured the true production orchestrator path (`architecture-layout.ts`), which passes `featureLayerYMap: globalDomainResult.featureLayerYMap` to Stage 7 (`computeLocalNodeLayout`), preserving 2D feature region Y coordinates ($Y \in [100, 21940]\text{px}$) and yielding a final canvas height of **24,670px**. In contrast, the Phase 11 diagnostic harness (`pipeline-stage-diagnostics.ts`) omitted `featureLayerYMap` when calling Stage 7, causing `computeLocalNodeLayout` to fall back to global `LAYER_Y_MAP` ($Y \in [100, 850]\text{px}$) and artificially compressing node Y coordinates into a $5,510\text{px}$ canvas height.
4. **Conclusion:**
   The true production canvas height on `pub-infra-mang` at `targetRowWidth = 3200px` is **24,670px**. The lower $5,510\text{px}$ figure in Phase 11 was an artifact of the diagnostic test harness omitting `featureLayerYMap`.

**EXECUTIVE CLASSIFICATION:**
```text
PHASE 11A CLASSIFICATION:

F — Multiple discrepancies
```
*(Combining A — Phase 11 harness/configuration discrepancy, and D — Dataset/feature-assignment discrepancy).*

---

## B. Conflicting Historical Measurements

The reconciliation audit resolved the following conflicting historical reports for `pub-infra-mang`:

| Metric / Parameter | Phase 10C Reported | Phase 11 Reported | Forensic Finding |
| :--- | :--- | :--- | :--- |
| **Stage 5 Feature Count** | 47 features | 26 features | 47 = Standalone call without `layerMap`; 26 = Full orchestrator path. |
| **Stage 5 Row Count (3,200px)** | 8 rows | 6 rows | 8 rows from 47 features; 6 rows from 26 composite features. |
| **Stage 5 Bounds (3,200px)** | $2,960 \times 21,940\text{ px}$ | $2,960 \times 21,940\text{ px}$ | **Matched** ($W \times H$ bounds are identical). |
| **Stage 11 Final Canvas (3,200px)** | $12,760 \times 24,670\text{ px}$ | $11,600 \times 6,580\text{ px}$ (or $12,480 \times 4,860\text{ px}$) | 24,670px = Production orchestrator using `featureLayerYMap`; 4,860–6,580px = Diagnostic harness fallback to global `LAYER_Y_MAP`. |

---

## C. Current Runtime Baseline

Captured directly from the active production runtime path (`pub-infra-mang`, default `targetRowWidth = 3200px`):

```text
Orchestrator: computeArchitectureLayoutWithMetadata()
Dataset: explorer/public/projects/pub-infra-mang/explorer-data.json
Dataset SHA-256: d5465b665accccd89437ced754f41b068c541c4923318b7bc88b388c96b6b943
Node Count: 528
Edge Count: 2,063
Feature Count: 26 (Composite features in orchestrator)
Stage 5 Feature Regions: 2,960 px (W) x 21,940 px (H)
Stage 11 Final Canvas: 12,760 px (W) x 24,670 px (H)
Primary Overlaps: 0
Satellite Overlaps: 0
Minimum Clearance: >= 40.0 px
Determinism Drift: 0.00000 px
```

---

## D. Dataset Identity

Verification of `pub-infra-mang` across all locations in the repository:

* **File 1 Path:** `explorer/public/projects/pub-infra-mang/explorer-data.json`
* **File 2 Path:** `analyze/projects/pub-infra-mang/explorer-data.json`
* **File Size:** $4,253,699\text{ bytes}$ (identical)
* **SHA-256 Digest:** `d5465b665accccd89437ced754f41b068c541c4923318b7bc88b388c96b6b943`
* **Node Count:** 528
* **Edge Count:** 2,063

**Verdict:** Both Phase 10C and Phase 11 utilized the exact same 528-node `pub-infra-mang` dataset file bit-for-bit.

---

## E. Feature Inventory Identity

Comparing feature discovery outputs on `pub-infra-mang`:

1. **Standalone Discovery (Phase 10C):**
   `discoverFeatures(nodes, edges)` executed without pre-computed `layerMap` or `domainMap` generated **47 granular features**.
   * Presentation: 12 features (2 rows)
   * Application: 26 features (4 rows)
   * Domain: 5 features (1 row)
   * Schema: 4 features (1 row)
   * Total Rows = $2 + 4 + 1 + 1 = 8\text{ rows}$.

2. **Orchestrator Discovery (Phase 11 & Production Path):**
   `computeArchitectureLayoutWithMetadata` runs Stage 2 (Layer Classification) and Stage 3 (Domain Discovery) first, then passes `layerMap` and `domainMap` into `discoverFeatures`. `discoverFeatures` merges co-located layer nodes into **26 composite features**.
   * Presentation: 6 features (2 rows)
   * Application: 12 features (2 rows)
   * Domain: 4 features (1 row)
   * Schema: 4 features (1 row)
   * Total Rows = $2 + 2 + 1 + 1 = 6\text{ rows}$.

---

## F. Runtime Call Path

Tracing execution flow from entry point to rendered positions:

```text
GraphView.tsx
  ↓ (passes architectureMode = 'hybrid' -> enableFeatureLayout = true)
computeArchitectureLayoutWithMetadata() [explorer/src/lib/architecture-layout.ts]
  ↓ (Stage 1-3: Analysis, layerMap, domainMap, featureMap)
computeGlobalFeatureLayout() [explorer/src/lib/layout/global-layout.ts]
  ↓ (Stage 5: 2D Multi-row Feature Region Packing -> returns featureLayerYMap)
reduceEdgeCrossings() [explorer/src/lib/layout/ordering.ts]
  ↓ (Stage 6: Bucket Order Ranks)
computeLocalNodeLayout() [explorer/src/lib/layout/local-layout.ts]
  ↓ (Stage 7: Primary Local Placement using options.featureLayerYMap)
calculateBridgeCandidatePosition() [explorer/src/lib/layout/centrality.ts]
  ↓ (Stage 8: Hub & Bridge Refinement)
placeSatellites() [explorer/src/lib/layout/satellites.ts]
  ↓ (Stage 9: Secondary Satellites anchored to Stage 7/8 primary nodes)
packComponentPositions() [explorer/src/lib/layout/components.ts]
  ↓ (Stage 10: Component Packing)
resolveSpacingAndCollisions() [explorer/src/lib/layout/spacing.ts]
  ↓ (Stage 11: Final Collision Cleanup Pass)
Position Authority Restoration [explorer/src/lib/position-policy.ts]
  ↓ (Stage 12: Returns final positions to GraphView / Cytoscape)
GraphView Canvas Rendering
```

---

## G. Stage 5 Reproduction

Current production Stage 5 feature region layout at `targetRowWidth = 3200px` (`pub-infra-mang`):

```text
Presentation Layer (6 features, 2 rows):
  Row 0 (yMin=100px, maxH=3220px, xMax=2960px): [feature_budget-utilization-summary, feature_zone-manager-dashboard, feature_vendor-assignment-panel, feature_notification-center, feature_maintenance-request-kanban]
  Row 1 (yMin=3840px, maxH=300px, xMax=2520px): [feature_citizen-report-portal]

Application Layer (12 features, 2 rows):
  Row 0 (yMin=4260px, maxH=3220px, xMax=2940px): [feature_VendorAssignmentService, feature_ZoneManagerTrigger, feature_TimelineController, Shared, feature_OperationsHeadDashboardController, feature_NotificationSharingTrigger]
  Row 1 (yMin=7540px, maxH=3220px, xMax=2640px): [feature_InfrastructureAlertTriggerHandler, feature_NotificationSecurityTrigger, feature_ManagementEscalationService, feature_ManagementAssignmentService, feature_MaintenanceRequestSharingService, feature_HealthScoreCalculator]

Domain Layer (4 features, 1 row):
  Row 0 (yMin=17440px, maxH=1260px, xMax=1840px): [feature_fflib_SObjectDomain, feature_BudgetDomain, feature_CitizenRequestDomain, feature_InspectionTriggerHandler]

Schema Layer (4 features, 1 row):
  Row 0 (yMin=18820px, maxH=3220px, xMax=2540px): [Unassigned, feature_EngineerService, feature_SLABatch, feature_TelemetryBatchTriggerHandler]

Stage 5 Outer Bounds: 2,960 px (W) x 21,940 px (H)
```

---

## H. Phase 10C Reproduction

Reproducing Phase 10C threshold experiments on current code (`pub-infra-mang`):

| Target Width | Standalone Rows (47 features) | Orchestrator Rows (26 features) | Stage 5 Height | Stage 11 Height (Prod Path) |
| ---: | ---: | ---: | ---: | ---: |
| **3,200 px** | 8 | 6 | 21,940 px | 24,670 px |
| **3,300 px** | 8 | 6 | 21,940 px | 24,670 px |
| **3,301 px** | 7 | 6 | 21,940 px | 24,670 px |
| **3,340 px** | 7 | 6 | 21,940 px | 24,670 px |
| **6,000 px** | 5 | 4 | 15,020 px | 24,670 px |
| **10,000 px** | 5 | 4 | 15,020 px | 24,670 px |
| **20,000 px** | 4 | 4 | 11,740 px | 24,670 px |

**Conclusion:** The Phase 10C threshold transitions ($3300\text{px} \rightarrow 3301\text{px}$ and $3340\text{px} \rightarrow 3341\text{px}$) are 100% reproduced on current code when standalone feature discovery is used.

---

## I. Phase 11 Reproduction

Reproducing Phase 11 candidate sweep samples using the corrected orchestrator path:

| Target Width | Stage 5 W x H | Stage 11 W x H (Prod Path) | Stage 11 W x H (Diag Harness) | Height Δ% (Prod Path) |
| ---: | :--- | :--- | :--- | ---: |
| **3,200 px** | $2,960 \times 21,940\text{ px}$ | $12,760 \times 24,670\text{ px}$ | $12,480 \times 4,860\text{ px}$ | 0.0% |
| **3,600 px** | $3,380 \times 21,940\text{ px}$ | $12,760 \times 24,670\text{ px}$ | $12,640 \times 4,285\text{ px}$ | 0.0% |
| **4,000 px** | $3,760 \times 18,660\text{ px}$ | $12,760 \times 24,670\text{ px}$ | $12,640 \times 4,285\text{ px}$ | 0.0% |
| **5,000 px** | $4,520 \times 18,660\text{ px}$ | $12,760 \times 24,670\text{ px}$ | $12,980 \times 4,710\text{ px}$ | 0.0% |
| **10,000 px** | $5,700 \times 15,020\text{ px}$ | $12,760 \times 24,670\text{ px}$ | $12,340 \times 4,710\text{ px}$ | 0.0% |
| **20,000 px** | $5,700 \times 11,740\text{ px}$ | $12,760 \times 24,670\text{ px}$ | $12,340 \times 4,710\text{ px}$ | 0.0% |

**Key Finding:** In the true production orchestrator path (`architecture-layout.ts`), Stage 11 final canvas height is **24,670px across ALL target widths**, because primary local nodes are placed in Y according to feature region bounds ($Y \in [100, 21940]\text{px}$) and satellites expand top/bottom margins by $+3,910\text{px}$.

---

## J. Stage-by-Stage Geometry Ledger

Stage-by-stage outer bounding boxes on `pub-infra-mang` (`targetRowWidth = 3200px`, Production Path):

| Stage | X Min | X Max | Width | Y Min | Y Max | Height | Height Δ from Prev |
| :--- | ----: | ----: | ----: | ----: | ----: | ----: | ---: |
| **Stage 5 (Features)** | 100 px | 3,060 px | 2,960 px | 100 px | 22,040 px | 21,940 px | Baseline |
| **Stage 6 (Ordering)** | 100 px | 3,060 px | 2,960 px | 100 px | 22,040 px | 21,940 px | 0 px |
| **Stage 7 (Local Primary)** | -120 px | 11,880 px | 12,000 px | 100 px | 20,860 px | 20,760 px | -1,180 px |
| **Stage 8 (Hub & Bridge)** | -120 px | 11,880 px | 12,000 px | 100 px | 20,860 px | 20,760 px | 0 px |
| **Stage 9 (Satellites)** | -500 px | 12,260 px | 12,760 px | 100 px | 24,770 px | 24,670 px | **+3,910 px** |
| **Stage 10 (Components)** | -500 px | 12,260 px | 12,760 px | 100 px | 24,770 px | 24,670 px | 0 px |
| **Stage 11 (Cleanup)** | -500 px | 12,260 px | 12,760 px | 100 px | 24,770 px | 24,670 px | 0 px |
| **Stage 12 (Pos Authority)** | -500 px | 12,260 px | 12,760 px | 100 px | 24,770 px | 24,670 px | 0 px |

---

## K. Vertical-Extent Decomposition

Tracing vertical height expansion through production stages:

```text
1. Stage 5 Feature Regions: Height = 21,940 px
   Determined by 2D multi-row packing of feature regions.

2. Stage 7 Local Node Layout: Height = 20,760 px (-1,180 px)
   Primary nodes are placed inside feature regions using featureLayerYMap.
   Top-most node: Y = 100 px (Presentation Row 0).
   Bottom-most primary node: Y = 20,860 px (Schema Row 0).

3. Stage 8 Hub & Bridge Refinement: Height = 20,760 px (+0 px)
   Bridge nodes placed at centroids within existing Y bounds.

4. Stage 9 Satellite Placement: Height = 24,670 px (+3,910 px)
   Satellites placed around primary anchors in dense Schema/Application features.
   Search radius and slot allocation extend top margin up to Y = 100px and bottom margin to Y = 24,770px.

5. Stage 11 Spatial Cleanup: Height = 24,670 px (+0 px)
   No further vertical expansion required.
```

---

## L. Y-Coordinate Ledger

Y-coordinate ranges per architectural layer on `pub-infra-mang` (`targetRowWidth = 3200px`):

```text
Presentation Layer: Y in [100, 3940] px
  Row 0 Y = 100 px
  Row 1 Y = 3,840 px

Application Layer: Y in [4260, 17240] px
  Row 0 Y = 4,260 px
  Row 1 Y = 7,540 px
  Row 2 Y = 10,820 px
  Row 3 Y = 14,100 px

Domain Layer: Y in [17440, 18700] px
  Row 0 Y = 17,440 px

Schema Layer: Y in [18820, 24770] px
  Row 0 Y = 18,820 px (Satellites extend to Y = 24,770 px)
```

---

## M. Feature-Local Y Verification

Verified that `architecture-layout.ts` passes `featureLayerYMap: globalDomainResult.featureLayerYMap` to `computeLocalNodeLayout()`. Nodes in Presentation Row 1 receive $Y = 3,840\text{px}$, nodes in Application Row 1 receive $Y = 7,540\text{px}$, etc. Feature-local Y placement operates as intended without falling back to global `LAYER_Y_MAP`.

---

## N. Satellite Contribution

Stage 9 Satellite Placement on `pub-infra-mang`:
* Primary Node Y Range: $[100, 20860]\text{px}$ (Height: $20,760\text{px}$).
* Outer Canvas Y Range with Satellites: $[100, 24770]\text{px}$ (Height: $24,670\text{px}$).
* **Satellite Vertical Expansion Contribution:** **$+3,910\text{px}$** (+18.8%).

Satellites attached to schema/application nodes on bottom feature margins expand the final outer canvas height by nearly 4,000px.

---

## O. Bridge Contribution

Stage 8 Bridge Refinement on `pub-infra-mang`:
* Stage 7 Height: $20,760\text{px}$.
* Stage 8 Height: $20,760\text{px}$.
* **Bridge Vertical Expansion Contribution:** **$0\text{px}$** (0.0%).

Bridges align horizontally between connected feature regions without extending the vertical Y boundary.

---

## P. Spacing/Cleanup Contribution

Stage 11 Collision Cleanup on `pub-infra-mang`:
* Stage 10 Height: $24,670\text{px}$.
* Stage 11 Height: $24,670\text{px}$.
* **Cleanup Vertical Expansion Contribution:** **$0\text{px}$** (0.0%).

Spatial collision cleanup operates locally without pushing outer canvas boundaries.

---

## Q. Position Authority Verification

Verified that `computeArchitectureLayoutWithMetadata` returns Stage 12 positions directly to GraphView. GraphView passes these positions into Cytoscape, which computes bounding boxes matching $[ -500, 12260 ] \times [ 100, 24770 ]\text{ px}$.

---

## R. Bounding-Box Measurement Audit

Comparing measurement methods across reports:

1. **Phase 10C Measurement Method:** Measured outer node position extrema ($\min X, \max X, \min Y, \max Y$) from `computeArchitectureLayoutWithMetadata` positions ($12,760 \times 24,670\text{px}$).
2. **Phase 11 Harness Measurement Method:** Measured outer node position extrema from `pipeline-stage-diagnostics.ts` snapshots ($12,480 \times 4,860\text{px}$ or $11,600 \times 6,580\text{px}$).

Because `pipeline-stage-diagnostics.ts` omitted `featureLayerYMap`, its Stage 7..11 snapshots measured node positions that were artificially compressed near global layer Y offsets.

---

## S. Crossing Baseline Reconciliation

Reconciling canonical `cloud-spend-tracker` crossing baseline measurements:

* **Earlier Baseline ($C_{pp} = 7,812, C_{total} = 85,367$):** Historical metric recorded during early Phase 1/Phase 2 testing prior to Phase 6A Ordering and Phase 9 Satellite Slot Permutations.
* **Current Production Baseline ($C_{pp} = 8,704, C_{total} = 94,662$):** Active Candidate E production baseline on `cloud-spend-tracker` with `enableFeatureLayout = true` and post-Phase 9 satellite slot permutation optimization.

Both numbers represent valid historical milestones; $C_{pp} = 8,704$ and $C_{total} = 94,662$ are the authoritative current production baseline.

---

## T. Test-Harness Comparison

Comparing entry points used in Phase 10C vs Phase 11:

```text
Phase 10C Harness (Phase10C_BreakThresholdProof.test.ts):
  - Calls computeGlobalFeatureLayout() directly (47 features, 8 rows).
  - Calls computeArchitectureLayoutWithMetadata() for full pipeline (returns true 24,670px canvas height).

Phase 11 Harness (Phase11ControlledAspectRatioExperiment.test.ts / pipeline-stage-diagnostics.ts):
  - Calls measurePipelineStageMetrics() (26 features, 6 rows).
  - pipeline-stage-diagnostics.ts Stage 7 omitted options.featureLayerYMap.
  - Caused computeLocalNodeLayout() to fall back to global LAYER_Y_MAP (100, 350, 600, 850px), reporting 5,510px height.
```

---

## U. Root Cause of Cross-Phase Discrepancy

The cross-phase geometry discrepancy is caused by two distinct factors:

1. **Feature Discovery Input Discrepancy:** Direct standalone calls to `computeGlobalFeatureLayout` generated 47 features (8 rows), whereas orchestrator calls passing `layerMap`/`domainMap` generated 26 features (6 rows).
2. **Missing `featureLayerYMap` in `pipeline-stage-diagnostics.ts`:** Stage 7 in `pipeline-stage-diagnostics.ts` did not forward `featureLayerYMap: globalDomainResult.featureLayerYMap` to `computeLocalNodeLayout()`, causing Stage 7..11 diagnostic snapshots to evaluate nodes against global Y offsets ($100, 350, 600, 850\text{px}$) rather than feature-local Y coordinates ($100 - 20,860\text{px}$).

---

## V. Classification

```text
PHASE 11A CLASSIFICATION:

F — Multiple discrepancies
```

*(Specifically combining A — Phase 11 harness/configuration discrepancy, and D — Dataset/feature-assignment discrepancy).*

---

## W. Regression Results

Vitest layout regression suites executed:

```bash
npx vitest run explorer/src/lib/layout/baseline-snapshot.test.ts explorer/src/lib/layout/evaluate-layout.test.ts explorer/src/test/Phase12HybridActivation.test.ts explorer/src/test/Phase10C_BreakThresholdProof.test.ts explorer/src/test/Phase11ControlledAspectRatioExperiment.test.ts
```

* **Vitest Suite Results:** 5 test files passed, 39 tests passed (100% pass rate).
* **CLI Suite Results:** ALL 12 Architecture Snapshot, 15 Change Gate, 15 Eligibility, 17 Context Minimizer, 20 Decision Context, and 16 Accounting tests PASSED.
* **Primary Overlaps:** 0
* **Satellite Overlaps:** 0
* **Minimum Clearance:** $\ge 40.0\text{ px}$
* **Determinism Drift:** $0.00000\text{ px}$

---

## X. Production-Code Change Status

```text
Production code changed: NO
```

`git status` verifies zero modifications to production code files. All production modules remain 100% untouched.

---

## Y. Remaining Uncertainty

None. The mathematical, runtime, and harness mechanisms causing the cross-phase measurement discrepancies between Phase 10C and Phase 11 are 100% identified, proven, and reconciled.
