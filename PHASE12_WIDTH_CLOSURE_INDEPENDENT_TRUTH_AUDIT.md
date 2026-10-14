# PHASE 12 WIDTH CLOSURE: INDEPENDENT GEOMETRY TRUTH AUDIT

## 1. Executive Verdict

**Final Verdict:** `WIDTH_ASSERTION PASSES BUT CONTRACT NOT PROVEN`

### Verdict Justification
1. **Numeric Parity Confirmed at `7,040.00 px`**: Under both the test helper `runPhase12PipelineTrace(ds.nodes, ds.edges, 3200)` (with Stage 8 primary immutability) and the production orchestrator `computeArchitectureLayoutWithMetadata` (under both explicit `targetRowWidthOverride: 3200` and default dynamic row width), the final Stage 12 bounding width for `pub-infra-mang` (528 nodes, 2063 edges) evaluates to **`7,040.00 px`** (`minX = 60.00 px`, `maxX = 7,100.00 px`). Updating line 465 of `Phase12GeometryDominatorAudit.test.ts` to `7040` yields a 100% pass rate (12/12 tests passing).
2. **Prior `12,760 px` Contract Disproven**: Reconstructing the pipeline without Stage 8 `immutablePrimaryPositions` reveals that the actual prior all-node Stage 12 width was **`12,800.00 px`** (`minX = 60.00 px`, `maxX = 12,860.00 px`), **NOT** `12,760.00 px`. The value `12,760` was an un-enforced arithmetic error ($12,860 - 100 = 12,760$) copied from an assumed $X_0 = 100\text{ px}$ origin rather than measuring the true node minimum ($X = 60.00\text{ px}$).
3. **Causal Mechanism Isolated to Single Node**: Adding `immutablePrimaryPositions: immutableStage7PrimaryPositions` to Stage 8 of `runPhase12PipelineTrace` alters the coordinates of **exactly 1 node** out of 528: `ApexClass:VendorAssignmentService` (moved from $X = 12,860.00\text{ px}$ down to corridor slot $X = 1,220.00\text{ px}$). Because `ApexClass:VendorAssignmentService` was the sole right-hand outlier establishing $maxX = 12,860.00\text{ px}$, relocating it brought the global maximum down to $maxX = 7,100.00\text{ px}$ (`LWC:error-panel`).
4. **Helper Limitations**: The test helper `runPhase12PipelineTrace` hardcodes `effectiveTargetRowWidth: targetRowWidthOverride ?? 3200` in its return object and cannot directly report default dynamic width telemetry, although its internal call to `computeGlobalFeatureLayout` properly delegates to dynamic width calculation when `targetRowWidthOverride` is `undefined`.

---

## 2. Working Tree and Diff Inventory

A complete inspection of the working tree confirmed 0 uncommitted changes in production or test source files:

- **Command:** `git status --short`
- **Output:** *(empty)*
- **Command:** `git diff --check`
- **Output:** *(empty, exit code 0)*
- **Command:** `git diff`
- **Output:** *(empty)*

All audit evidence was evaluated against the clean working tree at commit `HEAD`.

---

## 3. Before / After Stage 8 Coordinate-Delta Evidence

To isolate the exact causal impact of adding `immutablePrimaryPositions: immutableStage7PrimaryPositions` to Stage 8 of `runPhase12PipelineTrace`, the pipeline trace was executed under two isolated configurations on `pub-infra-mang` (528 nodes, 2063 edges, `targetRowWidth = 3200`):

1. **Old Configuration (without `immutablePrimaryPositions`)**: `calculateBridgeCandidatePosition` is called without primary position immutability.
2. **New Configuration (with `immutablePrimaryPositions`)**: `calculateBridgeCandidatePosition` is passed `immutablePrimaryPositions: immutableStage7PrimaryPositions`.

### Position-Map Delta Across Pipeline Stages

| Stage | Total Nodes | Changed Node Count | Node IDs Changed | Coordinate Shift |
|---|:---:|:---:|---|---|
| **Stage 5** (Feature Layout) | 528 | 0 | None | $0.00\text{ px}$ |
| **Stage 7** (Local Primary) | 528 | 0 | None | $0.00\text{ px}$ |
| **Stage 8** (Bridge Refinement) | 528 | **1** | `ApexClass:VendorAssignmentService` | $(12860, 350) \to (1220, 350)$ |
| **Stage 9** (Satellites) | 528 | **1** | `ApexClass:VendorAssignmentService` | $(12860, 350) \to (1220, 350)$ |
| **Stage 10** (Component Packing) | 528 | **1** | `ApexClass:VendorAssignmentService` | $(12860, 350) \to (1220, 350)$ |
| **Stage 11** (Collision Cleanup) | 528 | **1** | `ApexClass:VendorAssignmentService` | $(12860, 350) \to (1220, 350)$ |
| **Stage 12** (Position Authority) | 528 | **1** | `ApexClass:VendorAssignmentService` | $(12860, 350) \to (1220, 350)$ |

### Causal Explanation
- Without primary position immutability, when evaluating `ApexClass:VendorAssignmentService` (a cross-domain bridge node), `calculateBridgeCandidatePosition` allowed bridge placement searches to overlap with primary production node slots. Expanding past occupied primary slots pushed `VendorAssignmentService` out to $X = 12,860.00\text{ px}$.
- Passing `immutablePrimaryPositions` enforced dual-occupancy collision checking against Stage 7 primary positions, constraining `VendorAssignmentService` to an open corridor slot at $X = 1,220.00\text{ px}$.
- **No other node coordinates changed** across all 528 nodes in the dataset.

---

## 4. Exact Extrema and Width Arithmetic

### Extrema Comparison by Stage

#### Old Configuration (Without Primary Immutability)
- **Stage 8 Extrema**: `minX = -1,740.00 px` (`Object:Maintenance_Approval__c`), `maxX = 2,740.00 px` (`Object:Inspection_Checklist__c`).
  - Stage 8 Width: $2740 - (-1740) = 4,480.00\text{ px}$.
- **Stage 12 Extrema (All 528 Nodes)**:
  - `minX`: `60.00 px` (Node ID: `Field:Maintenance_Approval__c.Decision__c`)
  - `maxX`: `12,860.00 px` (Node ID: `ApexClass:VendorAssignmentService`)
  - `minY`: `30.00 px` (Node ID: `ApexClass:fflib_ISObjectUnitOfWork`)
  - `maxY`: `25,430.00 px` (Node ID: `Field:Telemetry_Batch_Event__e.Payload__c`)
  - **Actual Width Arithmetic**: $12,860.00 - 60.00 = \mathbf{12,800.00\text{ px}}$.
  - **Actual Height Arithmetic**: $25,430.00 - 30.00 = \mathbf{25,400.00\text{ px}}$.

#### New Configuration (With Primary Immutability)
- **Stage 8 Extrema**: `minX = -1,740.00 px` (`Object:Maintenance_Approval__c`), `maxX = 2,740.00 px` (`Object:Inspection_Checklist__c`).
  - Stage 8 Width: $2740 - (-1740) = 4,480.00\text{ px}$.
- **Stage 12 Extrema (All 528 Nodes)**:
  - `minX`: `60.00 px` (Node ID: `Field:Maintenance_Approval__c.Decision__c`)
  - `maxX`: `7,100.00 px` (Node ID: `LWC:error-panel`)
  - `minY`: `30.00 px` (Node ID: `ApexClass:fflib_ISObjectUnitOfWork`)
  - `maxY`: `25,430.00 px` (Node ID: `Field:Telemetry_Batch_Event__e.Payload__c`)
  - **Actual Width Arithmetic**: $7,100.00 - 60.00 = \mathbf{7,040.00\text{ px}}$.
  - **Actual Height Arithmetic**: $25,430.00 - 30.00 = \mathbf{25,400.00\text{ px}}$.

### Extrema Summary Table

| Metric / Bounds | Old Config (No Immutability) | New Config (With Immutability) | Difference ($\Delta$) |
|---|:---:|:---:|:---:|
| **`minX`** | `60.00 px` (`Decision__c`) | `60.00 px` (`Decision__c`) | $0.00\text{ px}$ |
| **`maxX`** | `12,860.00 px` (`VendorAssignmentService`) | `7,100.00 px` (`error-panel`) | $-5,760.00\text{ px}$ |
| **Bounding Width** | **`12,800.00 px`** | **`7,040.00 px`** | **$-5,760.00\text{ px}$** |
| **`minY`** | `30.00 px` (`ISObjectUnitOfWork`) | `30.00 px` (`ISObjectUnitOfWork`) | $0.00\text{ px}$ |
| **`maxY`** | `25,430.00 px` (`Payload__c`) | `25,430.00 px` (`Payload__c`) | $0.00\text{ px}$ |
| **Bounding Height** | `25,400.00 px` | `25,400.00 px` | $0.00\text{ px}$ |

Both configurations use the exact same 528-node population and Cytoscape model-space bounding box convention ($\text{maxX} - \text{minX}$).

---

## 5. Production Parity Results for Configurations A and B

To verify production parity without conflating configurations, `runPhase12PipelineTrace` was compared against production `computeArchitectureLayoutWithMetadata` under two distinct settings:

### Configuration A — Explicit Target Row Width (`targetRowWidth = 3200`)
- **Helper Input**: `runPhase12PipelineTrace(ds.nodes, ds.edges, 3200)`
- **Production Input**: `computeArchitectureLayoutWithMetadata(ds.nodes, ds.edges, { enableFeatureLayout: true, targetRowWidthOverride: 3200 })`

#### Configuration A Audit Results
- **Effective Target Row Width**: $3,200.00\text{ px}$ (both helper and production).
- **Node Key Set Equality**: `Set(Object.keys(helper.stage12Positions))` equals `Set(Object.keys(prod.positions))` (100% exact match, 528 nodes).
- **Missing or Extra Node IDs**: 0 missing, 0 extra.
- **Coordinate Equality**: Bit-for-bit identical ($0.00000\text{ px}$ drift) across all 528 common nodes.
- **Final Extrema & Dimensions**:
  - `minX`: `60.00 px` (`Field:Maintenance_Approval__c.Decision__c`)
  - `maxX`: `7,100.00 px` (`LWC:error-panel`)
  - `width`: `7,040.00 px`
  - `height`: `25,400.00 px`
- **Parity Status**: **100% BIT-FOR-BIT PARITY PROVEN**.

---

### Configuration B — Default Dynamic Row Width
- **Helper Input**: `runPhase12PipelineTrace(ds.nodes, ds.edges)` (with no `targetRowWidthOverride`)
- **Production Input**: `computeArchitectureLayoutWithMetadata(ds.nodes, ds.edges, { enableFeatureLayout: true })` (with no `targetRowWidthOverride`)

#### Configuration B Audit Results
- **Effective Target Row Width**:
  - Production calculates dynamic target row width: $W_{target} = \max(1200, \min(3200, \sqrt{\text{totalWidthSum} \times 300 \times 1.6})) = 2,960.54\text{ px}$.
  - Helper returns `{ effectiveTargetRowWidth: 3200 }` on line 378 due to fallback expression `targetRowWidthOverride ?? 3200`, but internally passes `targetRowWidthOverride = undefined` into `computeGlobalFeatureLayout`. Inside `computeGlobalFeatureLayout`, `targetRowWidth` also evaluates to $2,960.54\text{ px}$.
- **Node Key Set Equality**: 100% exact match (528 nodes).
- **Missing or Extra Node IDs**: 0 missing, 0 extra.
- **Coordinate Equality**: Bit-for-bit identical ($0.00000\text{ px}$ drift) across all 528 nodes between Default Production and Default Helper, AND bit-for-bit identical to Configuration A on `pub-infra-mang`.
- **Final Extrema & Dimensions**:
  - `minX`: `60.00 px` (`Field:Maintenance_Approval__c.Decision__c`)
  - `maxX`: `7,100.00 px` (`LWC:error-panel`)
  - `width`: `7,040.00 px`
  - `height`: `25,400.00 px`
- **Parity Status**: **100% BIT-FOR-BIT PARITY PROVEN**.
- **Helper Limitation**: The helper `runPhase12PipelineTrace` contains a reporting limitation where `res.effectiveTargetRowWidth` returns `3200` when `targetRowWidthOverride` is `undefined`, even though the underlying layout calculation correctly uses the dynamic width $2,960.54\text{ px}$.

---

## 6. Assertion-Contract and Historical-Value Provenance

### Intent of Step 3 Assertion in `Phase12GeometryDominatorAudit.test.ts`
- Line 465 in `Phase12GeometryDominatorAudit.test.ts` tests Step 3: `Stage Geometry Ledger for pub-infra-mang at targetRowWidth = 3200`.
- Its intent is to verify the final Stage 12 position map produced by `runPhase12PipelineTrace(ds.nodes, ds.edges, 3200)`.

### Provenance of Historical Values (`12760` vs `7040`)
1. **Provenance of `12760`**:
   - Prior to adding `immutablePrimaryPositions` to `runPhase12PipelineTrace`, `ApexClass:VendorAssignmentService` landed at $X = 12,860.00\text{ px}$.
   - The test author calculated width as $12,860 - 100 = \mathbf{12,760\text{ px}}$, assuming a default $X = 100\text{ px}$ origin (`baseX = 100`).
   - However, the actual minimum node X coordinate in `pub-infra-mang` was $X = 60.00\text{ px}$ (`Field:Maintenance_Approval__c.Decision__c`).
   - Thus, `12760` was an unverified, mathematically invalid expectation derived from subtracting an assumed $100\text{ px}$ origin instead of evaluating `getMapBounds(res.stage12Positions).width`.
2. **Provenance of `7040`**:
   - Following Stage 8 primary position immutability alignment, `VendorAssignmentService` moved to $X = 1,220.00\text{ px}$.
   - The global maximum X shifted to `LWC:error-panel` at $X = 7,100.00\text{ px}$.
   - With $minX = 60.00\text{ px}$ and $maxX = 7,100.00\text{ px}$, $maxX - minX = 7100.00 - 60.00 = \mathbf{7,040.00\text{ px}}$.

### Relationship to Phase 13 Assertion
- In `Phase13FeatureLayerSpacing.test.ts` (Test 6, line 189):
  `expect(maxX - minX).toBe(7040);`
- Phase 13 Test 6 measures `computeArchitectureLayoutWithMetadata(pubInfraNodes, pubInfraEdges, { enableFeatureLayout: true })`.
- Both Phase 12 Step 3 and Phase 13 Test 6 measure the exact same 528-node population at Stage 12 using the exact same bounding box semantics ($\text{maxX} - \text{minX}$).

---

## 7. Test Results and Commands

### Vitest Test Execution
- **Command:** `cd explorer && npx tsx -e "/* test runner */"`
- **Output:**
  - `Phase12GeometryDominatorAudit.test.ts`: **6 passed / 0 failed**
  - `Phase13FeatureLayerSpacing.test.ts`: **6 passed / 0 failed**
  - **Total:** **12 passed / 0 failed (100% PASS)**

### Broader CLI Test Suite
- **Command:** `npm run test:cli`
- **Output:** **31 of 31 test scripts passed (100% PASS)**

---

## 8. Contradictions or Unresolved Questions

1. **Reconciliation of Closure Report Math Claims**:
   - `PHASE12_FINAL_WIDTH_ASSERTION_CLOSURE_REPORT.md` claimed: "Before Stage 8 parity: `minX = 100`, `maxX = 12860`, width `12760`."
   - **Falsified by Runtime Audit**: `minX` before Stage 8 parity was `60.00 px` (`Field:Maintenance_Approval__c.Decision__c`), making actual width `12,800.00 px`. The closure report accepted an erroneous subtraction ($12860 - 100 = 12760$) without checking the actual `minX` coordinate in `res.stage12Positions`.
2. **Helper Return Telemetry Discrepancy**:
   - In `runPhase12PipelineTrace`, `res.effectiveTargetRowWidth` returns `3200` when `targetRowWidthOverride` is `undefined` due to line 378 (`effectiveTargetRowWidth: targetRowWidthOverride ?? 3200`). This is a cosmetic reporting discrepancy in the trace helper; the actual layout engine calculation correctly evaluates dynamic width ($2,960.54\text{ px}$).

---

## 9. Evidence Table with Source Paths and Line Numbers

| Evidence Item | Source Path | Line Number(s) | Observed Fact / Finding |
|---|---|:---:|---|
| Stage 8 Immutability | `explorer/src/test/Phase12GeometryDominatorAudit.test.ts` | 235, 265 | Adds `immutableStage7PrimaryPositions` to `calculateBridgeCandidatePosition` options. |
| Line 465 Assertion | `explorer/src/test/Phase12GeometryDominatorAudit.test.ts` | 465 | `expect(getMapBounds(res.stage12Positions).width).toBe(7040);` |
| Phase 13 Assertion | `explorer/src/test/Phase13FeatureLayerSpacing.test.ts` | 189 | `expect(maxX - minX).toBe(7040);` |
| Stage 8 Caller (Prod) | `explorer/src/lib/architecture-layout.ts` | 473-485 | Production passes `immutablePrimaryPositions: enableImmutablePrimaryPositions ? immutableStage7PrimaryPositions : undefined`. |
| Bridge Calculation | `explorer/src/lib/layout/centrality.ts` | 647-657 | Evaluates `immutablePrimary` dual-occupancy collision check. |
| Global Feature Layout | `explorer/src/lib/layout/global-layout.ts` | 1230, 1286 | Calculates dynamic `targetRowWidth` when override is omitted. |
| Closure Report Claim | `PHASE12_FINAL_WIDTH_ASSERTION_CLOSURE_REPORT.md` | Section 2 | Claims $minX=100, maxX=12860, W=12760$ prior to Stage 8 parity update. |
