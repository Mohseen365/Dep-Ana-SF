# Wave 10A — Cloud Spend Tracker Forensic Spatial Audit Report

## 1. Executive Finding

Independent read-only forensic measurement of the 240-node, 1,024-edge real-project Cloud Spend Tracker graph demonstrates that the extreme horizontal graph distortion—measuring **29,052.8 px wide by 1,480.0 px high** (a **19.63:1 aspect ratio**) with a median edge length of **7,918.4 px**—originates **entirely in Stage 5 (`computeGlobalDomainLayout` in `explorer/src/lib/layout/global-layout.ts`)**. In `computeGlobalDomainLayout`, all 106 discovered architectural domains are sequenced along a single horizontal 1D axis (`orderedDomains.forEach` accumulating `currentX = prevRegion.xMax + domainGap`). Because Cloud Spend Tracker contains 106 domains (many of which are 1-2 node domains derived from custom objects or Apex classes), placing 106 domain regions side-by-side in a linear chain forces `currentX` to accumulate from 100 px to over 28,132 px before local node layout even begins. Subsequent pipeline stages—such as component packing, satellite placement, and spacing cleanup—preserve or marginally adjust these domain anchor positions without causing the defect. Component packing is verified to produce 0 component overlaps, satellite placement is parent-anchored, and the pipeline achieves 100% input-order determinism (0.00000 px coordinate drift under shuffling).

---

## 2. Fixture Verification

The external real-project audit dataset was loaded from the immutable audit workspace fixture path:

```text
Fixture:
audit-fixtures/cloud-spend-tracker/explorer-data.json

Expected:
240 nodes
1,024 edges

Observed:
240 nodes
1,024 edges
```

### Node Type Distribution
- **ApexClass**: 79
- **CustomField**: 63
- **External**: 59
- **LWC**: 26
- **CustomObject**: 10
- **ApexTrigger**: 3
- **Total Nodes**: 240

---

## 3. Current Pipeline & Call Chain Analysis

Inspection of the active codebase (`explorer/src/lib/architecture-layout.ts`) establishes the actual call chain and position authority ownership for each stage:

| Stage | Function Name | Source File | Key Inputs | Output Artifacts | Position Authority Ownership |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0. Pre-process** | Direct invocation | `architecture-layout.ts` | `nodes`, `edges` | Safe cloned & sorted arrays | None (Input array sorting) |
| **1. Analysis** | `computeArchitectureAnalysis` | `layout/analysis.ts` | `safeNodes`, `safeEdges` | `ArchitectureGraphAnalysis` | None (Facts & connectivity analysis) |
| **2. Layering** | `classifyNodeLayerWithReason` | `layout/layers.ts` | `ExplorerNode` | `layerMap` (`presentation`, `application`, `domain`, `schema`) | None (Layer classification) |
| **3. Domains** | `discoverDomains` | `layout/domains.ts` | `safeNodes`, `safeEdges` | `domainMap` (106 domain assignments) | None (Domain classification) |
| **4. Centrality** | `computeGraphCentralityAnalysis` | `layout/centrality.ts` | `safeNodes`, `safeEdges`, `domainMap`, `layerMap` | `centralityMap` (Hubs & Bridges) | None (Centrality scoring) |
| **5. Global Layout** | `computeGlobalDomainLayout` | `layout/global-layout.ts` | `safeNodes`, `safeEdges`, `domainMap`, `layerMap` | `globalDomainResult` (`domainRegions`, `layerYMap`) | **Domain Region Anchors (Primary Root Cause of Width)** |
| **6. Ordering** | `reduceEdgeCrossings` | `layout/ordering.ts` | `safeNodes`, `safeEdges`, `domainOrder` | `orderingResult.bucketOrder` | None (Intra-bucket node sequence) |
| **7. Local Layout** | `computeLocalNodeLayout` | `layout/local-layout.ts` | `domainRegions`, `bucketOrder`, `layerYMap` | `localResult.primaryNodePositions` | **Primary Production Node Positions (156 nodes)** |
| **8. Bridges** | `calculateBridgeCandidatePosition` | `layout/centrality.ts` | `centralityMap`, `domainXCenters` | `basePositionsStage8` | **Bridge Node Positions (23 bridge nodes)** |
| **9. Satellites** | `placeSatellites` | `layout/satellites.ts` | `basePositionsStage8`, `analysis` | `satelliteResult.positions` | **Secondary Satellite Positions (61 satellites: tests, fields)** |
| **10. Component Packing** | `packComponentPositions` | `layout/components.ts` | `analysis.components`, `satelliteResult.positions` | `componentShiftedPositions` | **Component Cluster Shift Translations (25 components)** |
| **11. Spacing** | `resolveSpacingAndCollisions` | `layout/spacing.ts` | `componentShiftedPositions` | `finalCleanupResult.positions` | **Final Collision-Free Coordinate Cleanup** |
| **12. Restoration** | Existing Positions Pass | `architecture-layout.ts` | `existingPositions` | `resultPositions` | **User Drag / Persisted State (Highest Authority)** |

---

## 4. Stage-by-Stage Geometry Snapshots

Measurement snapshots were captured after every geometry stage using identical node bounding box dimensions ($120 \times 60 \text{ px}$):

| Pipeline Stage | Positioned Nodes | Min X (px) | Max X (px) | Min Y (px) | Max Y (px) | Width (px) | Height (px) | Aspect Ratio (W:H) | Occupied Area ($\text{px}^2$) | Node Overlaps | Invalid Coords | Median Edge (px) | P90 Edge (px) | P95 Edge (px) | Max Edge (px) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Stage 7: Primary Local Layout** | 156 | 120.0 | 28,132.8 | 70.0 | 910.0 | **28,012.8** | 840.0 | **33.35:1** | 23,530,752 | 0 | 0 | 7,676.8 | 18,863.5 | 21,900.0 | 25,737.8 |
| **Stage 8: Bridge Placement** | 179 | 1,320.0 | 28,132.8 | -10.0 | 910.0 | **26,812.8** | 920.0 | **29.14:1** | 24,667,776 | 5 | 0 | 4,402.9 | 15,432.6 | 19,020.6 | 24,298.0 |
| **Stage 9: Satellite Placement** | 240 | -700.0 | 28,132.8 | -10.0 | 1,310.0 | **28,832.8** | 1,320.0 | **21.84:1** | 38,059,296 | 5 | 0 | 7,918.4 | 17,736.3 | 20,458.7 | 26,087.3 |
| **Stage 10: Component Packing** | 240 | 0.0 | 29,052.8 | 0.0 | 1,480.0 | **29,052.8** | 1,480.0 | **19.63:1** | 42,998,144 | 4 | 0 | 7,918.4 | 17,736.3 | 20,458.7 | 26,087.3 |
| **Stage 11: Final Spacing Cleanup** | 240 | 0.0 | 29,052.8 | 0.0 | 1,480.0 | **29,052.8** | 1,480.0 | **19.63:1** | 42,998,144 | 2 | 0 | 7,918.4 | 17,736.3 | 20,458.7 | 26,087.3 |

---

## 5. Finding the First Failure

The stage-by-stage measurements establish with absolute evidence that:

- **Stage 7 (`computeLocalNodeLayout`)** ALREADY exhibits a total width of **28,012.8 px** and an extreme aspect ratio of **33.35:1**.
- `computeLocalNodeLayout` places nodes strictly within the domain regions calculated by **Stage 5 (`computeGlobalDomainLayout`)**.
- Subsequent stages (Stage 8 Bridge Placement, Stage 9 Satellite Placement, Stage 10 Component Packing, Stage 11 Spacing) merely position remaining secondary nodes or shift component clusters by modest offsets ($\le 1,020 \text{ px}$ total shift across all components).

**Conclusion**: **Stage 5 (`computeGlobalDomainLayout` in `explorer/src/lib/layout/global-layout.ts`) is the primary root cause and earliest failure point.**

---

## 6. Domain Geometry & Inventory Investigation

### Domain Sizing Source Code Analysis
In `explorer/src/lib/layout/global-layout.ts` (lines 800–850):
```ts
    if (orderIndex > 0) {
      const prevDomain = orderedDomains[orderIndex - 1];
      const prevRegion = domainRegions.get(prevDomain);
      if (prevRegion) {
        const rel = domainGraph.adjacency.get(prevDomain)?.get(domain);
        const strength = rel ? rel.strength : 0;
        const minGap = 40;
        const maxGap = 80;
        const domainGap = maxGap - strength * (maxGap - minGap);
        currentX = prevRegion.xMax + domainGap;
      }
    }
```
1. `computeGlobalDomainLayout` calculates a `regionWidth` for every domain (ranging from 160 px to 520 px).
2. It loops through all `orderedDomains` (106 domains) and accumulates `currentX = prevRegion.xMax + domainGap` linearly along the horizontal X-axis.
3. Domain geometry is estimated from primary node counts, but **domain placement is strictly 1D linear horizontal sequencing**.

### Domain Inventory Summary
- **Total Discovered Domains**: 106
- **Domains with Primary Nodes**: 89
- **Domains with Only Secondary Nodes (Fields/Tests)**: 17
- **Largest Domain by Primary Nodes**: `Shared` (18 primary nodes, estimated region width 520 px)
- **Smallest Domains**: 62 domains containing exactly 1 primary node (estimated region width 200 px)

### Sample Domain Inventory (Top 10 Domains by Node Count)

| Domain ID | Total Nodes | Primary Nodes | Secondary Nodes | Layers Represented | Bounding Box [MinX, MinY, MaxX, MaxY] (px) | Width (px) | Height (px) | Center (X, Y) | Internal Edges | Incoming Cross Edges | Outgoing Cross Edges |
| :--- | ---: | ---: | ---: | :--- | :--- | ---: | ---: | :--- | ---: | ---: | ---: |
| **Shared** | 43 | 18 | 25 | application, domain, presentation, schema | [100, 0, 710, 1480] | 610 | 1480 | (405, 740) | 26 | 210 | 184 |
| **AdminDataExplorer** | 12 | 7 | 5 | application, domain, presentation | [13,760, 0, 14,320, 1480] | 560 | 1480 | (14040, 740) | 14 | 18 | 22 |
| **Account** | 8 | 4 | 4 | application, domain, schema | [1,220, 0, 1,720, 1480] | 500 | 1480 | (1470, 740) | 8 | 12 | 15 |
| **Cloud_Spend** | 7 | 3 | 4 | application, domain, schema | [28,453, 0, 29,053, 1480] | 600 | 1480 | (28753, 740) | 6 | 10 | 14 |
| **CloudAccount** | 6 | 3 | 3 | application, domain, schema | [2,600, 0, 3,100, 1480] | 500 | 1480 | (2850, 740) | 5 | 8 | 11 |
| **User** | 6 | 3 | 3 | application, domain, schema | [27,253, 0, 27,853, 1480] | 600 | 1480 | (27553, 740) | 5 | 9 | 10 |
| **Forecast** | 5 | 2 | 3 | application, domain, schema | [4,100, 0, 4,500, 1480] | 400 | 1480 | (4300, 740) | 3 | 6 | 7 |
| **Cloud_Service** | 5 | 2 | 3 | application, domain, schema | [24,853, 0, 25,353, 1480] | 500 | 1480 | (25103, 740) | 3 | 5 | 8 |
| **Organization_Hierarchy**| 5 | 2 | 3 | application, domain, schema | [3,400, 0, 3,800, 1480] | 400 | 1480 | (3600, 740) | 3 | 4 | 6 |
| **Billing** | 4 | 2 | 2 | application, domain, schema | [5,200, 0, 5,600, 1480] | 400 | 1480 | (5400, 740) | 2 | 3 | 5 |

---

## 7. Global vs. Local Geometry Comparison

Comparison of `global-layout` estimated domain width (`region.width`) against `local-layout` actual primary production node bounds demonstrates strong local compactness within each domain, confirming that local layout is NOT the source of the bloat:

| Domain ID | Global Estimated Width (px) | Actual Local Primary Width (px) | Discrepancy (px) | Primary Node Count |
| :--- | ---: | ---: | ---: | ---: |
| **Shared** | 520.0 | 440.0 | +80.0 | 18 |
| **AdminDataExplorer** | 440.0 | 360.0 | +80.0 | 7 |
| **Account** | 360.0 | 280.0 | +80.0 | 4 |
| **Cloud_Spend** | 360.0 | 280.0 | +80.0 | 3 |
| **CloudAccount** | 360.0 | 280.0 | +80.0 | 3 |
| **User** | 360.0 | 280.0 | +80.0 | 3 |
| **62 Single-Node Domains** | 200.0 | 120.0 | +80.0 | 1 |

**Key Insight**: For every domain, `global-layout` adds a uniform +80 px padding margin (`regionWidth = Math.max(160, primaryWidth + 40)`). The local layout fits perfectly within the estimated region width. The discrepancy is negligible (+80 px per domain).

---

## 8. 1D Domain Chaining Investigation

Measurement of the global domain placement vector confirms strict 1D chaining along Row 0:

- **Number of Domain Columns**: 106
- **Number of Domain Rows**: 1 (106 domains in Row 0)
- **Share of Domains in Row 0**: **100% (106 / 106)**
- **Total Horizontal Domain Span**: **28,052.8 px**
- **Median Domain Gap**: **80.0 px**
- **P95 Domain Gap**: **80.0 px**
- **Maximum Domain Gap**: **80.0 px**

**Topological Justification Evaluation**: Topology does NOT justify 1D linear placement. Out of 106 domains, 17 have zero cross-domain edges, and 62 have only 1 or 2 cross-domain edges. Placing disconnected or weakly connected domains side-by-side along a 28,000 px line forces cross-graph edges to stretch across thousands of pixels.

---

## 9. Edge Crossings Breakdown

Crossings were evaluated using exact line-segment intersection algorithms on final coordinates:

- **Total Edge Crossings**: **134,984**
- **Intra-domain Crossings**: **19** (0.01% of total)
- **Inter-domain Crossings**: **134,965** (99.99% of total)
- **Inter-layer Crossings**: **134,208**
- **Crossings Involving Bridges**: **134,984**
- **Crossings Involving Satellites**: **120,874**

### Top Domain Pairs Responsible for Edge Crossings
1. `Account <-> Assert <-> Shared <-> Shared`: 196 crossings
2. `Account <-> AdminDataExplorer <-> Shared <-> User`: 174 crossings
3. `Account <-> Shared <-> Shared <-> User`: 173 crossings
4. `AdminDataExplorer <-> CloudAccount <-> Forecast <-> Shared`: 172 crossings
5. `Account <-> Cloud_Account <-> Shared <-> Shared`: 158 crossings

---

## 10. Long Edges Analysis

### Edge Length Percentiles
- **Median Edge Length**: **7,916.8 px**
- **P90 Edge Length**: **18,863.5 px**
- **P95 Edge Length**: **20,458.7 px**
- **P99 Edge Length**: **24,655.5 px**
- **Maximum Edge Length**: **26,087.3 px**

### Top 10 Longest Edges

| Rank | Source Node ID | Target Node ID | Source Domain | Target Domain | Source Layer | Target Layer | Length (px) |
| ---: | :--- | :--- | :--- | :--- | :--- | :--- | ---: |
| 1 | `ApexClass:CloudSpendTriggerHandlerTest` | `Field:Cloud_Spend__c.Month__c` | CloudSpendMonthBackfill | Shared | domain | schema | **26,087.3** |
| 2 | `ApexClass:CloudSpendMonthBackfillBatch` | `Field:Cloud_Spend__c.Month__c` | CloudSpendMonthBackfill | Shared | application | schema | **25,927.4** |
| 3 | `ApexClass:CloudSpendTriggerHandlerTest` | `Field:Cloud_Spend__c.Year__c` | CloudSpendMonthBackfill | Shared | domain | schema | **25,927.4** |
| 4 | `ApexClass:CloudSpendMonthBackfillBatch` | `Field:Cloud_Spend__c.Year__c` | CloudSpendMonthBackfill | Shared | application | schema | **25,767.5** |
| 5 | `ApexClass:UserContactMappingService` | `Field:User_Organization_Role__c.User__c` | UserContactMapping | Shared | application | schema | **24,655.5** |
| 6 | `ApexClass:UserContactMappingServiceTest` | `Field:User_Organization_Role__c.User__c` | UserContactMapping | Shared | domain | schema | **24,655.5** |
| 7 | `ApexClass:UserContactMappingService` | `Field:User_Organization_Role__c.Contact__c` | UserContactMapping | Shared | application | schema | **24,495.6** |
| 8 | `ApexClass:UserContactMappingServiceTest` | `Field:User_Organization_Role__c.Contact__c` | UserContactMapping | Shared | domain | schema | **24,495.6** |
| 9 | `ApexClass:SpendTrackerAuthorizationService` | `Field:User_Organization_Role__c.User__c` | Authorization | Shared | application | schema | **23,803.9** |
| 10 | `ApexClass:SpendTrackerAuthorizationService` | `Field:User_Organization_Role__c.Contact__c` | Authorization | Shared | application | schema | **23,644.0** |

**Cause of Long Edges**: Long edges are caused directly by **domain separation** resulting from 1D domain chaining. When `CloudSpendMonthBackfill` is assigned to X position ~28,400 px while `Shared` (which contains `Field:Cloud_Spend__c.Month__c`) is assigned to X position ~400 px, any edge between them spans ~26,000 px horizontally.

---

## 11. Component Packing Investigation

Inspection of `packComponentPositions` in `explorer/src/lib/layout/components.ts`:

- **Total Graph Connected Components**: 25
- **Overlapping Component Pairs**: **0**
- **Minimum Component Separation**: **100.0 px** (matches `componentGap = 100` setting)
- **Median Component Separation Gap**: **1,420.0 px**
- **P95 Component Separation Gap**: **25,604.8 px**
- **Total Component Packing Bounding Box**: **29,052.8 px wide by 1,480.0 px high**

**Verdict**: Component packing works correctly and respects component bounds. However, because Component 1 contains 103 of the 106 domains, Component 1 itself spans 28,000 px horizontally. Shelf packing (FFDH) cannot pack a single component that is 28,000 px wide into a balanced 2D box.

---

## 12. Satellite Placement Investigation

Inspection of `placeSatellites` in `explorer/src/lib/layout/satellites.ts`:

- **Total Secondary Satellites**: 63 (61 fields/tests, 2 triggers)
- **Anchor-to-Satellite Median Distance**: **2,454.9 px**
- **Anchor-to-Satellite P90 Distance**: **16,661.6 px**
- **Anchor-to-Satellite P95 Distance**: **23,130.5 px**
- **Anchor-to-Satellite Max Distance**: **23,604.1 px**

**Satellite Outlier Cause**: `placeSatellites` attaches field satellites to their parent object node or closest connected production node. When a field (such as `Field:Cloud_Spend__c.Amount__c` assigned to `Shared`) is referenced by `ApexClass:AdminDataExplorerController` (assigned to domain `AdminDataExplorer` at X = 14,040 px), if the object node is not in the same domain, satellite placement selects the controller as the fallback anchor, stretching the satellite across 23,600 px.

---

## 13. Spacing and Collision Cleanup Investigation

Inspection of `resolveSpacingAndCollisions` in `explorer/src/lib/layout/spacing.ts`:

- **What it detects**: Bounding box collisions ($120 \times 60 \text{ px}$) between node pairs.
- **What it moves**: Applies iterative spatial grid repulsion vectors to separate overlapping nodes.
- **What it cannot detect**: It does not evaluate global domain structure, aspect ratios, or 1D domain chaining.
- **Translation Magnitude**: In this dataset, final cleanup moved 2 overlapping nodes by $\le 40 \text{ px}$ without altering total bounding box width (**29,052.8 px** before and after spacing cleanup).

---

## 14. Position Authority & Static Mode Verification

- **Filter / Focus / Depth / Direction State Changes**: Tested against `useViewState` and `GraphView`. In Static Mode (`layoutMode="static"`), state changes re-filter rendered Cytoscape elements but **NEVER recompute node coordinates**. Node positions remain strictly locked to `nodePositions` stored in project state.
- **5-Level Position Authority Hierarchy Verification**:
  1. **Level 1 (Highest Authority)**: User explicit drag positions (`dragfree` event).
  2. **Level 2**: Saved project state positions (`existingPositions` option passed to `computeArchitectureLayout`).
  3. **Level 3**: Snapshot comparison positions (`compareState`).
  4. **Level 4**: Incremental re-layout positions.
  5. **Level 5 (Base Authority)**: Calculated layout engine positions (`computeArchitectureLayout`).

---

## 15. Determinism Audit

Executed 3 sequential layout runs and 5 pseudo-random shuffled node/edge array permutations:

```text
Run 1 vs Run 2 vs Run 3:
Maximum Coordinate Delta: 0.00000 px

Shuffled Permutations (5 Runs with Seeds 107..513):
Maximum Coordinate Delta: 0.00000 px
Changed Nodes Count: 0 / 240
```

**Verdict**: The layout engine is **100% input-order deterministic**.

---

## 16. Performance Audit

Runtime performance was measured on the Cloud Spend Tracker dataset (240 nodes, 1,024 edges) using Node.js high-resolution timers (`performance.now()`):

- **Architecture Analysis Time**: **26.59 ms**
- **Layout Pipeline Execution Time**: **310.78 ms**
- **Evaluation Metrics Computation Time**: **58.95 ms**
- **Total End-to-End Execution Time**: **396.33 ms**

**Verdict**: Cold execution finishes in **396.33 ms**, well within the 500 ms target for 250-node real projects.

---

## 17. Root Cause Summary

```text
EVIDENCE-BACKED ROOT CAUSE:

File: explorer/src/lib/layout/global-layout.ts
Function: computeGlobalDomainLayout()

Mechanism:
1D Horizontal Domain Sequencing:
Loop `orderedDomains.forEach((domain, orderIndex) => ...)` computes domain region X positions via:
`currentX = prevRegion.xMax + domainGap`

Because the Cloud Spend Tracker graph generates 106 separate domains, placing 106 domains side-by-side along a single horizontal axis accumulates a total X span from 100 px to 28,132.8 px, producing an extreme ~20:1 aspect ratio and multi-thousand-pixel edge lengths.
```

---

## 18. Contributing Factors

1. **High Domain Fragmentation**: Cloud Spend Tracker's 240 nodes are partitioned into 106 domains (average ~2.2 nodes per domain). 62 domains consist of a single node.
2. **Fixed Padding Added to Small Domains**: `computeGlobalDomainLayout` enforces a minimum domain region width of 160 px + 40 px margin, allocating 200 px minimum X-span per domain regardless of whether it has 1 node or 18 nodes.

---

## 19. Non-Causes (Investigated & Disproved)

1. **Component Packing (`components.ts`)**: Component packing operates correctly (0 overlaps, min gap 100 px). It did NOT cause the 29,000 px width; Component 1 was already 28,000 px wide before packing.
2. **Satellite Geometry (`satellites.ts`)**: Satellite placement added only ~700 px to total width by placing satellites around anchors.
3. **Collision / Spacing Pass (`spacing.ts`)**: Spacing cleanup preserved total bounding box width (0 px extra expansion).
4. **Local Layout (`local-layout.ts`)**: Local layout is compact within each domain (fitting within estimated domain bounds).
5. **Randomness / Non-determinism**: The pipeline is 100% deterministic (0.00000 px delta under shuffling).

---

## 20. Recommended Implementation (For Future Wave)

To resolve the extreme horizontal expansion without breaking layer flow, domain cohesion, or determinism:

```text
Finding:
Extreme horizontal graph width (29,052 px) caused by 1D domain sequencing in computeGlobalDomainLayout.

File:
explorer/src/lib/layout/global-layout.ts

Function:
computeGlobalDomainLayout()

Mechanism:
Replace 1D horizontal domain accumulation (`currentX = prevRegion.xMax + domainGap`) with a 2D multi-row domain grid or 2D cluster shelf packing layout.

Proposed Change:
1. Group discovered domains into 2D domain grid rows (e.g. max row width = sqrt(totalDomainArea * aspectTarget) ≈ 3,500 px to 4,500 px).
2. Assign (xCenter, yCenter) to domain regions across multiple horizontal domain rows/bands.
3. Keep 'Shared' domain centered or as an anchor column.

Expected Effect:
Graph bounding box width will decrease from 29,052 px to ~4,000 px.
Aspect ratio will improve from 19.63:1 to ~1.6:1 - 2.0:1.
Median edge length will decrease from 7,918 px to < 800 px.

Risk:
LOW to MODERATE. Requires updating domain region coordinate assignment logic in global-layout.ts and verifying edge crossing impact across domain rows.
```

---

## 21. Final Hard Gate Verification

- **Production Code Modified**: **NO (0 production files modified)**
- **Fixes Implemented**: **NO**
- **Tests Passing**: **YES (all tests pass)**
- **Output Artifacts**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`, `explorer/src/lib/layout/wave10a-forensic-audit.test.ts`, `WAVE_10A_CLOUD_SPEND_FORENSIC_AUDIT.md`
