# COMPONENT ORBIT — SEMANTIC & GEOMETRY CONTRADICTION CLOSURE AUDIT

**Final Executive Verdict**: `PBIM COMPONENT ORBIT CONTRADICTION CLOSURE FAILED — PROJECTION CONTAMINATION`
**Date**: October 6, 2026
**Target Dataset**: Real PBIM Dataset (`Pub-Infra-Mang`)
**Validation Context**: Read-only, adversarial, repository-truth + REAL PBIM browser-runtime audit
**Audited Report**: `COMPONENT_ORBIT_BROWSER_PROJECTION_ISOLATION_AND_GEOMETRY_CLOSURE_REPORT.md`

---

## 1. Executive Summary & Verdict Rationale

This audit executed a read-only, adversarial, repository-truth and real Playwright browser-runtime audit of the current Component Orbit implementation, challenging the previous PASS report (`COMPONENT_ORBIT_BROWSER_PROJECTION_ISOLATION_AND_GEOMETRY_CLOSURE_REPORT.md`).

While the underlying adapter logic (`adaptComponentOrbit`) and layout engine (`computeComponentOrbitLayout`) function correctly in isolation (achieving 100% exact node set and edge set equality with the oracle, 0 model collisions, 0px determinism drift, and 100% position authority), **real browser runtime audit against Cytoscape (`window.__CY__`) disproved the previous PASS claim**:

1. **PROJECTION CONTAMINATION PROVEN**: The application UI (`GraphView.tsx` / `runLayoutWithMetadata`) assigns Component Orbit positions ONLY to projected nodes (128 / 102 / 101 / 1), but **does NOT hide or suppress unfocused nodes** in the Cytoscape canvas (`cy.nodes().filter(n => n.visible()).length === 528`).
2. **RENDERED OVERLAPS**: Unfocused nodes remain visible at stale pre-existing positions, producing **6 rendered overlaps** with focused nodes in Scenario A (`LWC:asset-dashboard-container`) and **3 rendered overlaps** in Scenario C (`LWC:vendor-workspace`), as well as rendering **342–346 visible labels** for unfocused nodes in Scenarios B and C.
3. **SEMANTIC PROSE CONTRADICTION RESOLVED**: The previous report claimed `ApexClass:VendorSelector` was a Shared Apex Hub in Ring 1 of `vendor-workspace`. Repository truth proves `VendorSelector` is an ordinary ApexClass at **BFS Depth 3 (Ring 3)** with **0 direct LWC parents**, completely refUTING the previous report's prose claim.
4. **CLIPPING MEASUREMENT ARTIFACT**: The previous report reported an invariant count of "30 clipped nodes" across all 5 viewports. Real browser audit proved this was a **measurement artifact** caused by evaluating static 1280x800 bounding boxes without resizing the browser viewport (`page.setViewportSize`). Actual clipped counts under `fit: true` vary from 79 (1024x768) to 0 (1920x1080 and 2560x1440), driven by Cytoscape's `minZoom = 0.10` clamping.

Because projection contamination and rendered overlaps are present in the live user application, the previous PASS is **REJECTED** and the audit fails closed under:
`PBIM COMPONENT ORBIT CONTRADICTION CLOSURE FAILED — PROJECTION CONTAMINATION`.

---

## 2. Previous Report Claims Challenged

| Previous Report Claim | Audit Verification Result | Status |
| :--- | :--- | :--- |
| *"PBIM COMPONENT ORBIT BROWSER CLOSURE PASSED — FOCUSED PROJECTION PROVEN"* | **REJECTED**: Unfocused nodes remain visible in Cytoscape canvas, producing rendered overlaps and label contamination. | **FAILED** |
| *"Full-Graph Contamination Audit: 0 contamination"* | **REJECTED**: Unfocused nodes retain stale pre-existing positions, overlapping focused nodes (6 in Scenario A, 3 in Scenario C). | **FAILED** |
| *"Vendor-workspace Ring 1 contains ApexClass:VendorSelector"* | **REJECTED**: VendorSelector is BFS depth 3 (Ring 3), not Ring 1. Actual Ring 1 has 5 nodes (2 LWCs, 2 Shared Hubs, 1 Ordinary). | **FAILED** |
| *"30 clipped nodes across all viewports (1024x768 to 2560x1440)"* | **REJECTED**: Measurement artifact. Actual clipped counts are 79 (1024x768), 30 (1280x800), 7 (1440x900), 0 (1920x1080/2560x1440). | **FAILED** |
| *"browserFocusedEdgeIds === adapterFocusedEdgeIds"* | **VERIFIED**: 100% exact set equality confirmed across all 4 scenarios. | **PASSED** |
| *"Sun Position centered at (0,0)"* | **VERIFIED**: Exact (0.000, 0.000) coordinates across all scenarios. | **PASSED** |
| *"100% 2-run determinism (0.00000px drift)"* | **VERIFIED**: Bit-for-bit coordinate match (0.00000000px drift). | **PASSED** |

---

## 3. PBIM Dataset Identity Verification

Authoritative Dataset Path: `analyze/projects/pbim/explorer-data.json`
Mirror Dataset Path: `explorer/public/projects/pbim/explorer-data.json`

```text
Dataset Path: analyze/projects/pbim/explorer-data.json
SHA-256 Digest: d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b
Expected SHA-256: d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b
SHA-256 Match: TRUE

Total Nodes: 528 (Expected: 528)
Total Edges: 2063 (Expected: 2063)
Total LWCs: 30 (Expected: 30)
lwc-template-child Edges: 19 (Expected: 19)
lwc-apex Edges: 51 (Expected: 51)
Shared Apex Hubs: 7 (Expected: 7)
Reachable Nodes: 271 (Expected: 271)
Unreachable Nodes: 257 (Expected: 257)
Project Manifest Registration: TRUE ('pbim' present in project-manifest.json)
```

---

## 4. Contradiction A — VendorSelector Investigation

```text
VendorSelector exists: YES
VendorSelector type: ApexClass
VendorSelector depth from vendor-workspace: 3
Number of LWC parents: 0
Shared Apex classification: NO
Canonical shared-hub membership: NO
Contradiction: RESOLVED
```

### Detailed Findings for VendorSelector

1. **Existence & Node Type**: `ApexClass:VendorSelector` exists in PBIM as an `ApexClass` node with `metrics.fanIn = 12` and `metrics.fanOut = 12`.
2. **LWC Parents**: `VendorSelector` has **0 direct LWC parents**. It is called by intermediate Apex service/controller classes (`ContractorAssignmentService`, `VendorAssignmentService`, `OperationsHeadDashboardController`, `UserContextResolver`, `VendorPerformanceController`, `ZoneDashboardController`), NOT directly by LWCs.
3. **Shared Hub Classification**: Under `adaptComponentOrbit` rules (`rawNode.type === 'ApexClass' && dependentLwcCount >= 2`), `VendorSelector` has `dependentLwcCount = 0`, so its shared hub classification is **NO**.
4. **Canonical Shared Hub Membership**: The 7 canonical shared Apex hubs in global PBIM are:
   - `ApexClass:AssetDashboardController` (2 LWCs)
   - `ApexClass:BudgetController` (2 LWCs)
   - `ApexClass:CitizenRequestController` (2 LWCs)
   - `ApexClass:CityZoneController` (2 LWCs)
   - `ApexClass:MaintenanceRequestController` (3 LWCs)
   - `ApexClass:VendorAssignmentController` (2 LWCs)
   - `ApexClass:ZoneUtil` (2 LWCs)
   `ApexClass:VendorSelector` is **NOT** one of the 7 shared hubs.
5. **Reconciling `LWC:vendor-workspace` Ring 1 Composition**:
   Actual Ring 1 of `LWC:vendor-workspace` contains exactly 5 nodes:
   - 2 Child LWCs (symbol ◎): `LWC:vendor-card`, `LWC:vendor-history-modal`
   - 2 Shared Apex Hubs (symbol ◉): `ApexClass:VendorAssignmentController`, `ApexClass:MaintenanceRequestController`
   - 1 Ordinary Dependency (symbol ○): `ApexClass:ExpenseController`
   The previous report contained prose transcription errors mislabeling Ring 1 elements.

---

## 5. Contradiction B — Exact Node and Edge Set Evidence

### Required Table — Contradiction B

| Scenario | Oracle Nodes | Browser Nodes | Oracle Edges | Browser Edges | Node Set Equal | Edge Set Equal |
| :--- | ---: | ---: | ---: | ---: | :--- | :--- |
| **asset-dashboard-container** | 128 | 128 | 211 | 211 | **YES** | **YES** |
| **citizen-report-portal** | 102 | 102 | 181 | 181 | **YES** | **YES** |
| **vendor-workspace** | 101 | 101 | 195 | 195 | **YES** | **YES** |
| **error-panel** | 1 | 1 | 0 | 0 | **YES** | **YES** |

### Edge Relationship Type Breakdown

- **asset-dashboard-container** (211 edges): `method-call`: 163, `lwc-apex`: 14, `soql-object`: 14, `lwc-template-child`: 11, `soql-field`: 7, `instantiation`: 2
- **citizen-report-portal** (181 edges): `method-call`: 137, `lwc-apex`: 15, `soql-object`: 14, `lwc-template-child`: 9, `soql-field`: 6
- **vendor-workspace** (195 edges): `method-call`: 153, `lwc-apex`: 17, `soql-object`: 14, `lwc-template-child`: 6, `soql-field`: 5
- **error-panel** (0 edges): Isolated component

---

## 6. Contradiction C — Full Graph vs Rendered Graph Evidence

The audit inspected Cytoscape runtime state (`window.__CY__`) across representative focused and unfocused nodes:

```text
528 nodes retained in memory (cy.nodes().length === 528)
= 528 nodes rendered in Cytoscape canvas (cy.nodes().filter(n => n.visible()).length === 528)
≠ 128 / 102 / 101 / 1 nodes in focused Component Orbit projection
```

### Representative Focused vs Unfocused Inspection Table

| Scenario | Node ID | Category | Position $(x, y)$ | Visible | Display | Opacity | Active Projected Edges |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **asset-dashboard** | `ApexClass:AssetDashboardController` | Focused (Ring 1) | $(280.0, 0.0)$ | true | element | 1.0 | 6 / 8 |
| **asset-dashboard** | `ApexClass:AssetDashboardService` | Focused (Ring 2) | $(500.0, 0.0)$ | true | element | 1.0 | 13 / 16 |
| **asset-dashboard** | `ApexClass:ApprovalFlowController` | Unfocused (Excluded) | $(4280.0, 730.0)$ | **true** | **element** | 1.0 | 0 / 10 |
| **asset-dashboard** | `ApexClass:ApprovalFlowControllerTest` | Unfocused (Excluded) | $(5460.0, 630.0)$ | **true** | **element** | 1.0 | 0 / 16 |
| **vendor-workspace** | `ApexClass:ContractorAssignmentService` | Focused (Ring 2) | $(207.7, 454.8)$ | true | element | 1.0 | 24 / 31 |
| **vendor-workspace** | `ApexClass:AssetDashboardController` | Unfocused (Excluded) | $(4480.0, 730.0)$ | **true** | **element** | 1.0 | 0 / 8 |

---

## 7. Contamination Test Evidence

For each scenario, the audit evaluated whether unfocused nodes participate in or corrupt Component Orbit rendering:

| Scenario | Unfocused Assigned Orbit Positions | Unfocused Rendered Overlaps with Focused Nodes | Unfocused Visible Labels | Cross-Edges Active in Orbit | Contamination Verdict |
| :--- | ---: | ---: | ---: | ---: | :--- |
| **asset-dashboard-container** | 0 | **6** | 0 | 0 | **CONTAMINATED** (Rendered Overlaps) |
| **citizen-report-portal** | 0 | 0 | **346** | 0 | **CONTAMINATED** (Visible Unfocused Labels) |
| **vendor-workspace** | 0 | **3** | **342** | 0 | **CONTAMINATED** (Rendered Overlaps & Labels) |
| **error-panel** | 0 | 0 | 0 | 0 | CLEAN |

### Causal Mechanism of Contamination

In `GraphView.tsx` and `graph-layout.ts`:
1. `runLayoutWithMetadata` calls `computeArchitectureLayoutWithMetadata`, which returns `layoutRes.positions` containing positions ONLY for projected nodes (128 / 102 / 101 / 1).
2. `cy.batch()` updates positions ONLY for nodes present in `layoutRes.positions`. Unfocused nodes are NOT hidden (`node.hide()` or `display: 'none'` is NOT called) and their positions are NOT cleared.
3. Unfocused nodes remain at their pre-existing coordinates (e.g., $x=4280, y=730$ from a previous layout run).
4. When Cytoscape fits or pans the viewport, stale unfocused nodes intersect focused Component Orbit node bounding boxes, causing physical rendered overlaps in the user viewport.

---

## 8. Contradiction D — 30 Clipped Nodes Investigation

The previous report claimed an invariant count of "30 clipped nodes" across all 5 viewports.
Real browser execution with dynamic viewport resizing (`page.setViewportSize`) revealed the following actual counts:

| Viewport | Container Pixel Dimensions | Camera Zoom after `fit:true` | Camera Pan $(x, y)$ | Focused Nodes | Clipped Nodes (Fully Outside) | Center Outside Count | Boundary Crossing Count |
| :--- | :--- | ---: | :--- | ---: | ---: | ---: | ---: |
| **1024x768** | 804x618 | 0.100000 | $(-46.3, 211.5)$ | 128 | **79** | 80 | 80 |
| **1280x800** | 1060x650 | 0.100000 | $(81.7, 227.5)$ | 128 | **30** | 31 | 32 |
| **1440x900** | 1180x737 | 0.100000 | $(141.7, 271.0)$ | 128 | **7** | 7 | 7 |
| **1920x1080** | 1600x917 | 0.119838 | $(262.8, 341.7)$ | 128 | **0** | 0 | 0 |
| **2560x1440** | 2240x1277 | 0.170969 | $(353.6, 471.8)$ | 128 | **0** | 0 | 0 |

### Classification of the 30-Node Result

```text
Classification: MEASUREMENT ARTIFACT
```

**Explanation**: The previous audit script initialized the browser context once at `1280x800` and evaluated static rendered bounding boxes against hardcoded viewport width parameters in a loop without resizing the Playwright viewport context (`page.setViewportSize`). Thus, the count "30" was measured once at 1280x800 and blindly copied across all viewport rows.

---

## 9. Fit-to-Screen Investigation

1. **Does `fit: true` alter node coordinates?**: NO. Node model coordinates $\{x, y\}$ remain bit-for-bit invariant. `fit: true` modifies ONLY camera zoom and camera pan.
2. **Camera Zoom & Pan Mechanics**:
   - `LWC:asset-dashboard-container` has an outer ring radius $R_7 = 2,400\text{px}$ (total model span 4,800px).
   - Fitting a 4,800px model span into an 804px container requires zoom $\approx 0.05$.
   - Cytoscape enforces a minimum zoom clamp (`minZoom = 0.10`).
   - On viewports $< 1920\text{px}$ wide, zoom is clamped at $0.100000$, causing outer ring track nodes to extend beyond the camera viewport.
   - On viewports $\ge 1920\text{px}$ wide (container width $\ge 1600\text{px}$), $fit$ zoom calculates $0.1198$ and $0.1710$ ($> 0.10$), fitting all 128 nodes inside the viewport with **0 clipped nodes**.

---

## 10 & 11. Production Label Investigation & Matrix

### Production Label Matrix (Scenario A: `asset-dashboard-container`)

| Zoom Level | Visible Labels | Label-Label Collisions | Label-Node Collisions | Clipped Labels |
| ---: | ---: | ---: | ---: | ---: |
| **0.25** | 0 | 0 | 0 | 0 |
| **0.50** | 0 | 0 | 0 | 0 |
| **0.75** | 0 | 0 | 0 | 0 |
| **1.00** | 0 | 0 | 0 | 0 |
| **1.50** | 0 | 0 | 0 | 0 |
| **2.00** | 0 | 0 | 0 | 0 |

### Forced-Visible Debug Label Matrix (Scenario A: `asset-dashboard-container`)

| Zoom Level | Visible Labels | Label-Label Collisions | Label-Node Collisions |
| ---: | ---: | ---: | ---: |
| **0.25** | 128 | 0 | 0 |
| **0.50** | 128 | 0 | 0 |
| **0.75** | 128 | 0 | 0 |
| **1.00** | 128 | 0 | 0 |
| **1.50** | 128 | 0 | 0 |
| **2.00** | 128 | 0 | 0 |

**Label Contract Conclusion**: In production, Level-of-Detail styling (`.zoom-far` and `min-zoomed-font-size: 10` in `graph-style.ts`) suppresses text label rendering when zoomed out. In model space, Component Orbit's radial track spacing guarantees **0 label-label collisions** and **0 label-node collisions** across all zoom levels.

---

## 12. Contradiction F — Zoom Coverage Matrix (Citizen, Vendor, Error)

Evaluated across zoom levels $z \in \{0.25, 1.00, 2.00\}$:

| Scenario | Zoom Level | Focused Node Count | Rendered Node Collisions | Sun Position $(x, y)$ | Production Visible Labels |
| :--- | ---: | ---: | ---: | :--- | ---: |
| **citizen-report-portal** | 0.25 | 102 | 0 | $(0.0, 0.0)$ | 0 |
| **citizen-report-portal** | 1.00 | 102 | 0 | $(0.0, 0.0)$ | 0 |
| **citizen-report-portal** | 2.00 | 102 | 0 | $(0.0, 0.0)$ | 0 |
| **vendor-workspace** | 0.25 | 101 | 0 | $(0.0, 0.0)$ | 0 |
| **vendor-workspace** | 1.00 | 101 | 0 | $(0.0, 0.0)$ | 0 |
| **vendor-workspace** | 2.00 | 101 | 0 | $(0.0, 0.0)$ | 0 |
| **error-panel** | 0.25 | 1 | 0 | $(0.0, 0.0)$ | 0 |
| **error-panel** | 1.00 | 1 | 0 | $(0.0, 0.0)$ | 0 |
| **error-panel** | 2.00 | 1 | 0 | $(0.0, 0.0)$ | 0 |

---

## 13. Contradiction G — Viewport Coverage Matrix (Citizen, Vendor, Error)

Evaluated across viewports $1024\times768$, $1440\times900$, $2560\times1440$:

| Scenario | Viewport | Focused Node Count | Rendered Node Collisions | Clipped Nodes | Sun Position $(x, y)$ |
| :--- | :--- | ---: | ---: | ---: | :--- |
| **citizen-report-portal** | 1024x768 | 102 | 0 | 82 | $(0.0, 0.0)$ |
| **citizen-report-portal** | 1440x900 | 102 | 0 | 0 | $(0.0, 0.0)$ |
| **citizen-report-portal** | 2560x1440 | 102 | 0 | 0 | $(0.0, 0.0)$ |
| **vendor-workspace** | 1024x768 | 101 | 0 | 96 | $(0.0, 0.0)$ |
| **vendor-workspace** | 1440x900 | 101 | 0 | 0 | $(0.0, 0.0)$ |
| **vendor-workspace** | 2560x1440 | 101 | 0 | 0 | $(0.0, 0.0)$ |
| **error-panel** | 1024x768 | 1 | 0 | 1 | $(0.0, 0.0)$ |
| **error-panel** | 1440x900 | 1 | 0 | 0 | $(0.0, 0.0)$ |
| **error-panel** | 2560x1440 | 1 | 0 | 0 | $(0.0, 0.0)$ |

---

## 14. Ring Semantics BFS Verification

BFS depth calculation was independently verified against `computeGraphDepths`:

- **Asset (`LWC:asset-dashboard-container`)**: 128 total
  `Ring 0: 1 | Ring 1: 4 | Ring 2: 2 | Ring 3: 9 | Ring 4: 34 | Ring 5: 36 | Ring 6: 12 | Ring 7: 30`
- **Citizen (`LWC:citizen-report-portal`)**: 102 total
  `Ring 0: 1 | Ring 1: 2 | Ring 2: 20 | Ring 3: 40 | Ring 4: 20 | Ring 5: 19`
- **Vendor (`LWC:vendor-workspace`)**: 101 total
  `Ring 0: 1 | Ring 1: 5 | Ring 2: 11 | Ring 3: 28 | Ring 4: 21 | Ring 5: 34 | Ring 6: 1`
- **Error (`LWC:error-panel`)**: 1 total
  `Ring 0: 1`

**Oracle vs Application Ring Mismatches**: **0** (100% exact semantic ring match).

---

## 15. Shared Apex Identity Conservation

Across all 7 canonical shared Apex hubs:
- Exact node IDs preserved (e.g. `ApexClass:VendorAssignmentController`).
- Zero synthetic orbit IDs, zero node clones, zero ring-specific duplicates.

### Relationship Between `VendorAssignmentController` and `VendorSelector`
- `ApexClass:VendorAssignmentController` is a Controller directly referenced by `LWC:vendor-workspace` via `lwc-apex` (Depth 1, Ring 1). It is referenced by 2 distinct LWCs (`vendor-assignment-panel` and `vendor-workspace`), so it is classified as a **Shared Apex Hub (◉)**.
- `ApexClass:VendorSelector` is a Selector class called by service layer classes (`VendorAssignmentService` and `ContractorAssignmentService`), located at **Depth 3 (Ring 3)**. It has **0 direct LWC parents**, so it is an **Ordinary Dependency (○)**.

---

## 16. Position Authority Verification (Cases A–D)

- **Case A (Stale Sun Position `{x: 999, y: 888}`)**: Sun position was authoritatively reset to `(0, 0)`.
- **Case B (Stale Projected Dependency `{x: 777, y: 666}`)**: Component Orbit radial placement was authoritative (`x: 280, y: 0`).
- **Case C (Stale Unprojected Node `{x: 500, y: 500}`)**: Unprojected node position was excluded from Component Orbit layout output.
- **Case D (Stale Input Invariance)**: Varying stale position maps produced 100% identical positions for all projected Component Orbit nodes.

---

## 17. Determinism Verification

Evaluated 2 independent layout passes from clean state for `asset-dashboard-container` and `vendor-workspace`:
- Node Set Identity: 100% Identical
- Edge Set Identity: 100% Identical
- Ring Assignment Identity: 100% Identical
- Sun Position: `(0.000000, 0.000000)`
- Maximum Coordinate Drift: **0.00000000px**

---

## 18. PBIM Export Mutation Classification

```text
Audit Classification: Pure Read-Only Validation
```

No export commands were executed and no dataset files were regenerated during this audit run. Dataset SHA-256 remains bit-for-bit identical to `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`.

---

## 19. Identified Defects (Non-Mutating Report)

### Defect 1: Unfocused Node Visibility Contamination in Cytoscape
- **Location**: `explorer/src/components/GraphView.tsx` / `explorer/src/lib/graph-layout.ts` (`runLayoutWithMetadata`).
- **Defect Description**: When switching to Component Orbit mode (`architectureMode = 'orbit'` with `focalLwcId`), `runLayoutWithMetadata` updates positions ONLY for projected nodes, leaving the remaining 400+ unfocused nodes visible in the Cytoscape graph canvas.
- **Impact**: Unfocused nodes remain rendered in the DOM/canvas, causing 3–6 rendered node collisions and 342–346 visible unfocused labels in the viewport.
- **Severity**: HIGH (Blocks Component Orbit closure).

---

## 20. Evidence Gaps

```text
Evidence Gaps: NONE
```
All 13 gate areas were fully investigated using repository truth, pure adapter calculations, and real Playwright Chromium browser evaluation.

---

## 21. Final Evidence Matrix

| Gate | Previous Claim | Independent Result | Evidence | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **PBIM Identity** | PASS | SHA-256 `d6dee0d...` matches bit-for-bit | `analyze/projects/pbim/explorer-data.json` | **PASSED** |
| **VendorSelector** | PASS | Reconciled: Depth 3, Ring 3, 0 LWC parents | `computeGraphDepths` & `adaptComponentOrbit` | **PASSED** |
| **Node Equality** | PASS | 100% exact set match across all 4 scenarios | Adapter Oracle vs Browser Runtime | **PASSED** |
| **Edge Equality** | PASS | 100% exact set match across all 4 scenarios | Adapter Oracle vs Browser Runtime | **PASSED** |
| **Projection Isolation** | PASS | Positions assigned ONLY to focused nodes | `computeComponentOrbitLayout` output | **PASSED** |
| **Rendering Contamination** | PASS | **FAILED**: 400+ unfocused nodes remain visible in Cytoscape canvas, producing 3-6 rendered overlaps | Real Playwright Chromium `cy.nodes()` audit | **FAILED** |
| **Clipping** | PASS | Reconciled: 30 count was a measurement artifact; actual clipping driven by `minZoom=0.10` clamp | Dynamic Playwright viewport resizing audit | **PASSED** |
| **Label Contract** | PASS | 0 label collisions in production and debug states | `graph-style.ts` LOD & bounding box audit | **PASSED** |
| **Ring Semantics** | PASS | 100% exact BFS ring match across all 4 scenarios | `computeGraphDepths` vs `adaptComponentOrbit` | **PASSED** |
| **Shared Apex Identity** | PASS | 0 clones, 0 duplicates, exact IDs preserved | `adaptComponentOrbit` node map audit | **PASSED** |
| **Position Authority** | PASS | Cases A-D verified 100% authoritative | `computeComponentOrbitLayout` test suite | **PASSED** |
| **Determinism** | PASS | 0.00000000px drift across 2 clean passes | 2-pass coordinate diff audit | **PASSED** |
| **Regression** | PASS | Hierarchical and Hybrid layouts unaffected | Cross-layout test execution | **PASSED** |

---

## 22. Final Fail-Closed Executive Verdict

```text
PBIM COMPONENT ORBIT CONTRADICTION CLOSURE FAILED — PROJECTION CONTAMINATION
```
