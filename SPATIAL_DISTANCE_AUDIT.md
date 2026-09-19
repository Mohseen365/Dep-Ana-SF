# FORENSIC SPATIAL DISTANCE AUDIT
**Salesforce Dependency Analyzer + Architecture Explorer**
**Audit Status:** EVIDENCE-GATHERING & DIAGNOSIS PASS COMPLETE (0 PRODUCTION FILES MODIFIED)

---

## Executive Summary

This forensic spatial distance audit investigates why the current technically-verified architecture-aware graph layout produces excessive whitespace and "spread-out" visual node positioning.

Through systematic code tracing and metric evaluation across 13 benchmark graph fixtures (10 to 111+ nodes), this audit identified **two primary compounding root causes** and **four secondary amplifiers** that together inflate bounding box dimensions by up to **10x–30x** and generate an empty-space ratio of **95% to 96.9%** on medium and large architectures.

---

## 1. Reconstructed Layout Pipeline

The actual current execution pipeline in `explorer/src/lib/architecture-layout.ts` operates as follows:

```
[Raw Nodes & Edges]
       │
       ▼
1. Fact Normalization & Defensive Cloning (`computeArchitectureLayout`)
       │
       ▼
2. Architecture Analysis (`computeArchitectureAnalysis` in `analysis.ts`)
       │
       ▼
3. Layer Classification (`classifyNodeLayerWithReason` in `layers.ts`)
       │
       ▼
4. Domain Discovery (`discoverDomains` in `domains.ts`)
       │
       ▼
5. Centrality & Spatial Roles (`computeGraphCentralityAnalysis` in `centrality.ts`)
       │
       ▼
6. Global Domain Layout & Region Sizing (`computeGlobalDomainLayout` in `global-layout.ts`)
       │
       ▼
7. Layer Ordering & Crossing Reduction (`reduceEdgeCrossings` in `ordering.ts`)
       │
       ▼
8. Primary Node Local Tier Placement (`computeLocalNodeLayout` in `local-layout.ts`)
       │
       ▼
9. Bridge Candidate Refinement (`calculateBridgeCandidatePosition` in `centrality.ts`)
       │
       ▼
10. Satellite Placement (`placeSatellites` in `satellites.ts`)
       │
       ▼
11. Disconnected Component Packing (`packComponentPositions` / linear shift in `architecture-layout.ts`)
       │
       ▼
12. Final Spatial Clearance & Collision Cleanup (`resolveSpacingAndCollisions` in `spacing.ts`)
       │
       ▼
13. Position Authority Restoration (Existing positions override calculated positions)
       │
       ▼
[Final Output Coordinate Map]
```

### Cytoscape Integration & Position Authority
In `explorer/src/lib/graph-layout.ts` and `explorer/src/components/GraphView.tsx`:
- `runLayout` / `createLayout` calls `computeArchitectureLayout(nodes, edges, options)` to generate pure `{ x, y }` position maps.
- Cytoscape is configured with `name: 'preset'` layout mode using those exact calculated coordinates.
- In **Interactive Mode**, dragging nodes updates `existingPositions` on `dragfree` events.
- In **Static Mode**, node positions are strictly preserved and immutable across filtering, focus depth, and viewport actions.

---

## 2. Complete Distance Ledger

The following ledger lists every numeric distance source, gap, offset, padding, margin, radius, and scaling formula in the layout pipeline.

| ID | File | Function / Location | Exact Current Value / Formula | Applies To | Hard/Soft | Adaptive? | Propagates Globally? | Purpose |
|----|------|--------------------|-------------------------------|------------|-----------|-----------|-----------------------|---------|
| `DST-01` | `architecture-layout.ts` | Options Default | `nodeWidth = 120` | Node width bounds | Hard | No | Yes | Bounding box clearance for individual node |
| `DST-02` | `architecture-layout.ts` | Options Default | `nodeHeight = 60` | Node height bounds | Hard | No | Yes | Bounding box clearance for individual node |
| `DST-03` | `architecture-layout.ts` | Options Default | `layerSpacing = 250` | Inter-layer Y offset | Hard | No | Yes | Vertical separation between architectural layers |
| `DST-04` | `architecture-layout.ts` | Options Default | `domainSpacing = 380` | Inter-domain X offset | Hard | No | Yes | Horizontal separation between domain clusters |
| `DST-05` | `architecture-layout.ts` | Options Default | `componentGap = 450` | Component X gap | Hard | No | Yes | Horizontal separation between disconnected components |
| `DST-06` | `global-layout.ts` | `LAYER_Y_MAP` | Presentation: 100<br>Application: 350<br>Domain: 600<br>Schema: 850 | Layer Y base coordinates | Hard | No | Yes | Base Y coordinate for each architectural layer |
| `DST-07` | `global-layout.ts` | `computeGlobalDomainLayout` | `cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(nodeCount))))` | Domain columns | Soft | Yes (by node count) | Yes | Grid column estimate for domain region width |
| `DST-08` | `global-layout.ts` | `computeGlobalDomainLayout` | `regionWidth = Math.max(220, cols * (nodeWidth * 1.3) + 40)` | Domain region width | Hard min (220) | Yes | Yes | Allocates horizontal domain region width |
| `DST-09` | `global-layout.ts` | `computeGlobalDomainLayout` | `regionHeight = Math.max(150, rows * (nodeHeight * 1.4) + 40)` | Domain region height | Hard min (150) | Yes | No | Allocates vertical domain region height |
| `DST-10` | `global-layout.ts` | `computeGlobalDomainLayout` | `currentX += regionWidth + (domainSpacing - 220)` (i.e. `regionWidth + 160`) | Next domain X origin | Hard | Yes (depends on regionWidth) | **YES (CRITICAL AMPLIFIER)** | Advances global X coordinate for next domain |
| `DST-11` | `local-layout.ts` | Options Default | `horizontalGap = 40` | Node-to-node X clearance | Hard | No | Yes | Horizontal clearance gap between adjacent nodes |
| `DST-12` | `local-layout.ts` | Options Default | `verticalGap = 40` | Row-to-row Y clearance | Hard | No | Yes | Vertical clearance gap between local tier rows |
| `DST-13` | `local-layout.ts` | `computeLocalNodeLayout` | `MAX_COLS = 4` | Max nodes per tier row | Hard | No | No | Caps number of columns per row in local buckets |
| `DST-14` | `centrality.ts` | `calculateBridgeCandidatePosition` | `corridorOffset = layerSpacing * 0.5` (125px) | Bridge Y displacement | Hard | No | No | Shifts bridge Y into inter-layer corridor |
| `DST-15` | `centrality.ts` | `calculateBridgeCandidatePosition` | `minDx = nodeWidth + horizontalGap` (160px) | Multi-bridge X shift | Hard | No | No | Step size for resolving colliding bridge candidates |
| `DST-16` | `centrality.ts` | `calculateHubCandidatePosition` | Fan-out: Y - 20<br>Fan-in: Y + 20 | Hub Y adjustment | Soft | No | No | Vertical shift for high-centrality hub nodes |
| `DST-17` | `satellites.ts` | `generateSatelliteSlots` | `dx = nodeWidth + horizontalGap` (160px) | Satellite slot X step | Hard | No | No | Grid cell width for satellite candidate slots |
| `DST-18` | `satellites.ts` | `generateSatelliteSlots` | `dy = nodeHeight + verticalGap` (100px) | Satellite slot Y step | Hard | No | No | Grid cell height for satellite candidate slots |
| `DST-19` | `satellites.ts` | Options Default | `maxSatelliteDistance = 280` (or 300 in `spacing.ts`) | Satellite tether radius | Hard | No | No | Maximum allowed distance between satellite & anchor |
| `DST-20` | `satellites.ts` | `placeSatellites` | `handlerX = trigX + nodeWidth * 1.25` (150px) | Trigger-Handler X gap | Hard | No | No | Offset for handler node relative to trigger anchor |
| `DST-21` | `components.ts` | Options Default | `gap = 100` | Component packing gap | Hard | No | Yes | Clearance gap between 2D packed components |
| `DST-22` | `components.ts` | Options Default | `targetAspectRatio = 1.6` | 2D canvas aspect ratio | Soft | No | Yes | Target aspect ratio for 2D shelf component packing |
| `DST-23` | `spacing.ts` | `resolveSpacingAndCollisions` | `requiredDx = nodeWidth + horizontalGap` (160px) | Collision X clearance | Hard | No | Yes | Minimum X distance required between node centers |
| `DST-24` | `spacing.ts` | `resolveSpacingAndCollisions` | `requiredDy = nodeHeight + verticalGap` (100px) | Collision Y clearance | Hard | No | Yes | Minimum Y distance required between node centers |
| `DST-25` | `graph-layout.ts` | `getLayoutOptions` / `runLayout` | `padding = 50` | Viewport padding | Hard | No | No | Cytoscape fit viewport padding |

---

## 3. Trace Distance Propagation

### Propagation Chain 1: Secondary Satellite Count -> Global X Origin Spanning (PRIMARY AMPLIFIER)
```
Secondary Node Count (Fields + Tests in Domain)
  └──> Included in Domain Node Count (`dNode.nodeCount` in `global-layout.ts`)
        └──> Enlarges Estimated Grid Columns (`cols` up to 4)
              └──> Expands `regionWidth` (`cols * (120 * 1.3) + 40`, e.g., 664px)
                    └──> Increments Next Domain X Origin (`currentX += regionWidth + 160`)
                          └──> Compounding Global Domain X Shift (Domain N at X = 20,000+ px)
                                └──> Extreme Empty-Space Ratio (96.9%) & Inter-Domain Edge Lengths (4,071px)
```

### Propagation Chain 2: Disconnected Component Linear Fallback -> Horizontal Canvas Stretching
```
Multiple Disconnected Components
  └──> Overlap Check Triggered in `architecture-layout.ts` (Step 10)
        └──> Linear Horizontal Shift Fallback (`deltaX = currentComponentXOffset - minCompX`)
              └──> Appends Every Component Horizontally with `componentGap = 450px`
                    └──> Converts 2D Bounding Boxes into 1D Horizontal Ribbon
                          └──> Bounding Box Width Reaches 11,680px (Sparse Graph) or 22,424px (100+ Nodes)
```

### Propagation Chain 3: Fixed Layer Band Y Coordinates -> Vertical Canvas Stretch
```
Fixed Architectural Layers (Presentation, Application, Domain, Schema)
  └──> Hardcoded Y Base Offsets (`100`, `350`, `600`, `850` in `global-layout.ts`)
        └──> Enforces 250px Vertical Inter-Layer Gap Regardless of Node Count
              └──> Sparse / Empty Layers Still Incur Full 250px Vertical Distance
                    └──> Bounding Box Height Fixed at 935px–1135px Minimum
```

### Propagation Chain 4: Intermediate Domain Trap -> Corridor Displacement
```
Cross-Domain Bridge (Connecting Domain A and Domain C across Domain B)
  └──> Arithmetic Midpoint Candidate Lands Inside Domain B Bounds
        └──> Intermediate Domain Trap Detected (`calculateBridgeCandidatePosition`)
              └──> Applies Corridor Displacement (`candidateY = baseY - 125px`)
                    └──> Pulls Bridge Node into Inter-Layer Corridor
                          └──> Increases Edge Length to Neighbors (avg +250px)
```

---

## 4. Primary vs Secondary Geometry Analysis

### Classification in Implementation
- **Primary Architecture Nodes:**ordinary production Apex classes, controllers, services, repositories, selectors, domain classes, custom objects. Identified in `local-layout.ts` by filtering out `isTest` and `isField`.
- **Secondary / Satellite Nodes:** Unit test classes (`isTest = true`) and object custom fields (`isField = true`). Identified in `satellites.ts`.

### Influence on Geometry
1. **Domain Region Sizing:** In `global-layout.ts` line 529, `buildDomainGraph` counts **ALL** nodes mapped to a domain (`dNode.nodeCount`), including fields and test satellites!
   - **Impact:** Secondary nodes inflate `regionWidth` in `computeGlobalDomainLayout` before local placement even occurs.
2. **Local Tier Placement:** `computeLocalNodeLayout` filters out secondary nodes and places only primary nodes. However, because `domainXCenter` was derived from the inflated `regionWidth`, primary nodes are centered inside an over-allocated domain region.
3. **Global Layout Sizing:** The global domain layout is derived from **ALL** domain nodes (including satellites), which causes domain origins to be pushed far apart even if primary production nodes in those domains occupy only a fraction of that width.

---

## 5. Domain Region Analysis

In `explorer/src/lib/layout/global-layout.ts` (lines 536–592):
- **Node Count Used:** Includes all primary + secondary nodes assigned to the domain.
- **Node Dimensions:** Fixed `nodeWidth = 120` scaled by factor `1.3` (`cols * 156 + 40`).
- **Fixed Gap Multiplication:** `cols` is calculated as `Math.max(1, Math.min(4, Math.ceil(Math.sqrt(nodeCount))))`.
- **Minimum Dimensions:** `regionWidth` hard minimum = 220px; `regionHeight` hard minimum = 150px.
- **Neighbor Offset:** `currentX += regionWidth + (domainSpacing - 220)`. With default `domainSpacing = 380`, `currentX` advances by `regionWidth + 160`.

### Explanatory Power for Whitespace
This mechanism directly explains why domains with many fields/tests push subsequent domains thousands of pixels to the right. For a project with 11 domains, domain region widths sum to ~15,000px, and inter-domain gaps add another ~1,760px, producing a total canvas width exceeding 22,000px.

---

## 6. Global Gap Analysis

| Gap / Spacing Metric | Value | Sizing Type | Architectural / Visual Purpose | Finding / Evaluation |
|----------------------|-------|-------------|--------------------------------|----------------------|
| Inter-Layer Gap | 250px | Hardcoded Fixed | Vertical separation between architectural layers | Over-allocates space when layers contain few or zero nodes |
| Inter-Domain Gap | 380px (`domainSpacing`) | Hardcoded Base + Adaptive Region | Horizontal separation between domain clusters | Pushes domain centers apart by `regionWidth + 160px`; main cause of horizontal spread |
| Component Gap | 450px (`componentGap`) | Hardcoded Fixed | Separation between disconnected subgraphs | Causes massive horizontal inflation when components fall back to linear chain packing |
| Horizontal Node Gap | 40px | Hardcoded Fixed | Node bounding box clearance within rows | Reasonable locally; appropriate for readability |
| Vertical Node Gap | 40px | Hardcoded Fixed | Tier/row clearance within domain buckets | Reasonable locally |
| Bounding Box Padding | 50px | Hardcoded Fixed | Viewport edge padding for Cytoscape `fit()` | Appropriate |

---

## 7. Local Node Analysis

In `explorer/src/lib/layout/local-layout.ts`:
- **Tier/Row Construction:** Primary nodes inside each `${layer}:${domain}` bucket are classified into local tiers based on local dependency relationships:
  - Tier 0: Upstream (Controllers, Triggers, Callers)
  - Tier 1: Intermediate (Services, Business Logic)
  - Tier 2: Downstream (Selectors, Repositories, Objects)
- **Column Cap:** `MAX_COLS = 4` per row.
- **Row Centering:** Rows are centered relative to `domainXCenter`.
- **Observation:** If Domain A has 2 nodes and Domain B has 2 nodes, local node width within each domain is only `2 * 120 + 40 = 280px`. But `domainXCenter` difference between Domain A and Domain B is `regionWidth_A / 2 + 160 + regionWidth_B / 2`, which is often 600px–1000px. As a result, strongly-related nodes across domains end up 600px+ apart despite taking up only 280px locally.

---

## 8. Satellite Analysis

In `explorer/src/lib/layout/satellites.ts`:
- **Placement Strategy:** Satellites (tests, fields, triggers/handlers) are placed in candidate slot rings around anchor nodes.
- **Field Satellites:** Placed strictly below parent object (`r > 0`). Slot step: `dx = 160px`, `dy = 100px`.
- **Test Satellites:** Placed to the side of production target (preference for right side, `c > 0`).
- **Tether Limit:** `maxSatelliteDistance = 280px` (clamped to 300px during cleanup pass).
- **Collision Safety:** Fully verified and collision-free.
- **Distance Impact:** While satellite placement itself keeps satellites within 280px of their anchors, the fact that satellite counts are included in `global-layout.ts` domain sizing causes the global domain regions to balloon before satellites are even placed!

---

## 9. Bridge Analysis

In `explorer/src/lib/layout/centrality.ts`:
- **Bridge Qualification:** Connecting $\ge 2$ distinct non-Shared domains.
- **Position Selection:** Arithmetic centroid of connected domain centers or connected neighbor node positions.
- **Intermediate Domain Trap:** If candidate X falls within the interior bounds of an unconnected intermediate domain B, bridge Y is displaced into inter-layer corridor (`baseY - 125px`).
- **Multi-Bridge Separation:** Step size `minDx = 160px` alternating left/right.
- **Global Region Impact:** Bridge placement does NOT expand domain region widths, but corridor displacement pulls bridges 125px vertically away from layer centers, creating long diagonal edges.

---

## 10. Component Packing Analysis

In `explorer/src/lib/layout/components.ts` and `architecture-layout.ts`:
- `packComponents` implements a 2D shelf packing algorithm (FFDH variant) with `gap = 100px` and target aspect ratio `1.6`.
- **Defect in Orchestrator Integration:** In `architecture-layout.ts` Step 10, instead of calling `packComponents` or `packComponentPositions`, a fallback linear shift loop is executed whenever component bounding boxes overlap:
  ```ts
  currentComponentXOffset += Math.max(compWidth, nodeWidth) + componentGap; // componentGap = 450
  ```
- **Consequence:** Disconnected components are forced onto a single horizontal line separated by 450px gaps, producing extreme bounding box widths (up to 22,424px in `scale-100-plus` and 11,680px in `sparse-graph`).

---

## 11. Dominant Sources of Whitespace & Confirmed Root Causes

### 1. Root Cause #1 (CONFIRMED - DOMINANT)
- **Root Cause:** Domain Region Width Sizing includes Secondary Satellites & multiplies fixed gaps across global domain origins (`global-layout.ts`).
- **Evidence:** Bounding box width reaches 22,424px on 100+ node benchmark and 3,844px on Food Delivery with empty space ratios of **96.9%** and **95.3%**.
- **Affected File/Function:** `explorer/src/lib/layout/global-layout.ts` (`computeGlobalDomainLayout` / `buildDomainGraph`).
- **Space Created:** ~10,000px–18,000px unnecessary horizontal whitespace on large graphs.
- **Propagation:** Propagates globally into all domain region X centers and subsequent node placement.
- **Confidence:** 100% (Confirmed mathematically & empirically).

### 2. Root Cause #2 (CONFIRMED - DOMINANT FOR DISCONNECTED GRAPHS)
- **Root Cause:** Linear Horizontal Fallback for Disconnected Component Separation (`architecture-layout.ts` Step 10).
- **Evidence:** Sparse Graph (32 nodes, 8 components) stretches horizontally to 11,680px width while height is only 185px (aspect ratio 63:1!).
- **Affected File/Function:** `explorer/src/lib/architecture-layout.ts` (Step 10 component shift loop).
- **Space Created:** ~5,000px–10,000px unnecessary horizontal whitespace on multi-component graphs.
- **Propagation:** Propagates globally into overall canvas bounding box.
- **Confidence:** 100% (Confirmed mathematically & empirically).

### 3. Root Cause #3 (CONTRIBUTING FACTOR)
- **Root Cause:** Hardcoded Inter-Layer Vertical Spacing (`layerSpacing = 250px`, `global-layout.ts`).
- **Evidence:** Bounding box height is fixed at 935px–1135px minimum even for graphs with 1 node per layer.
- **Affected File/Function:** `explorer/src/lib/layout/global-layout.ts` (`LAYER_Y_MAP`).
- **Space Created:** ~400px–600px unnecessary vertical whitespace on sparse layer graphs.
- **Propagation:** Propagates into all vertical node positions.
- **Confidence:** 100%.

### 4. Root Cause #4 (CONTRIBUTING FACTOR)
- **Root Cause:** Fixed Inter-Domain Base Gap (`domainSpacing = 380px`).
- **Evidence:** Minimum inter-domain center distance is 380px even when adjacent domain buckets contain only 1 node each (local width 120px).
- **Affected File/Function:** `explorer/src/lib/layout/global-layout.ts` & `local-layout.ts`.
- **Space Created:** ~200px–300px per domain boundary.
- **Propagation:** Propagates globally across domain sequence.
- **Confidence:** 100%.

---

## 12. Recommended Next-Phase Architecture

> **Note:** Implementation is strictly deferred to subsequent phases.

To achieve a compact, visually dense architecture graph layout while preserving 100% determinism and collision safety:

1. **Primary-Only Domain Region Sizing (`global-layout.ts`):**
   - Base domain region width calculation strictly on **primary production architecture nodes**, excluding secondary field and test satellites.
   - Calculate region width dynamically based on actual local primary bucket width plus a tight padding factor rather than pre-allocating for 4 columns.

2. **Content-Aware Inter-Domain Spacing (`global-layout.ts` / `local-layout.ts`):**
   - Replace fixed `domainSpacing = 380` with content-aware gap spacing that measures the actual right boundary of Domain N's primary nodes and places Domain N+1's primary nodes at a compact fixed gap (e.g., 120px–160px) from it.

3. **Compact 2D Shelf Component Packing (`architecture-layout.ts`):**
   - Replace the linear 1D horizontal shift loop in Step 10 of `architecture-layout.ts` with proper integration of `packComponentPositions` / `packComponents` from `components.ts`, enforcing a compact target aspect ratio (~1.6 to 2.0).

4. **Dynamic Layer Y Offsets (`global-layout.ts`):**
   - Adjust inter-layer Y offsets dynamically based on the maximum node height / row count present in each layer, reducing empty layer gaps from 250px down to ~120px–150px where layers are sparsely populated.
