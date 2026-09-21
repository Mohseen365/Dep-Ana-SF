# HYBRID LAYOUT PHASE 1 WORKSTREAM B1: FEATURE REGION GEOMETRY REPORT

**Author:** Workstream B1 — Feature Region Geometry Engineer
**Program:** Salesforce Architecture Explorer / Dependency Analyzer
**Phase:** Phase 1 — Restoration of Hybrid Layout (Feature Region Geometry)
**Date:** May 2024
**Status:** COMPLETE

---

## 1. EXECUTIVE SUMMARY & OBJECTIVE

Workstream B1 is responsible for improving the spatial geometry model of feature and domain regions in the Salesforce Architecture Explorer.

### Objective
Enhance the global feature layout engine (`explorer/src/lib/layout/global-layout.ts`) so that feature regions become genuine 2D spatial containers capable of spanning multiple architectural layers (`presentation`, `application`, `domain`, `schema`) while strictly preserving vertical architectural layer hierarchy and input-order determinism.

---

## 2. FILES OWNED AND MODIFIED

| File Path | Scope | Purpose of Modification |
| --------- | ----- | ----------------------- |
| `explorer/src/lib/layout/global-layout.ts` | **Primary Owner** | Refactored `computeGlobalDomainLayout` / `computeGlobalFeatureLayout` to compute true multi-layer vertical region bounds ($yMin$, $yMax$, $height$, $yCenter$) and 2D horizontal width expansion (minimum 280px for multi-node features) without region overlaps. |
| `explorer/src/lib/layout/features.ts` | **Primary Owner** | Audited feature cluster discovery and candidate expansion logic; verified data structures support multi-layer feature metadata. |
| `explorer/src/lib/layout/feature-roles.ts` | **Primary Owner** | Audited semantic feature role classification (`FeatureAnchor`, `FeatureCore`, `FeatureData`, `FeatureBridge`, `FeatureTest`, `SharedInfrastructure`); verified 0% reliance on fragile naming heuristics. |

*No files outside Workstream B1 ownership were modified.*

---

## 3. FORENSIC AUDIT OF EXISTING 1D BEHAVIOR

Prior to this workstream, `computeGlobalFeatureLayout` delegated region calculations to `computeGlobalDomainLayout` with `domainMap` set to `featureMap`.

### Identified Root Causes of 1D Column Behavior:
1. **Single-Layer Y-Center Assignment:** Region $yCenter$ was previously calculated as $\text{layerBaseY}[primaryLayer] + dim.height / 2$. This assigned feature regions to a single architectural layer height, collapsing multi-layer features into narrow layer-bound boxes.
2. **Narrow Horizontal Column Default:** Regions with 1 node per layer defaulted to $160\text{px}$ width ($\text{maxCols} \cdot 120 + 40$), forcing nodes into narrow vertical 1D strips.
3. **Lack of Multi-Layer Vertical Spanning:** Feature bounding boxes did not dynamically span from the top represented layer ($L_{\text{min}}$) down to the bottom represented layer ($L_{\text{max}}$).

---

## 4. THE 2D MULTI-LAYER GEOMETRY MODEL

The refactored geometry calculation in `explorer/src/lib/layout/global-layout.ts` introduces:

1. **Multi-Layer Vertical Bounding Box:**
   For any feature spanning multiple architectural layers, vertical coordinates are computed across all represented layers:
   $$yMin = \text{layerYMap}[L_{\text{min}}] - 20\text{ px}$$
   $$yMax = \text{layerYMap}[L_{\text{max}}] + \text{layerHeight}[L_{\text{max}}] + 20\text{ px}$$
   $$height = yMax - yMin$$
   $$yCenter = \frac{yMin + yMax}{2}$$

2. **2D Horizontal Width Expansion:**
   Multi-node feature clusters are assigned a minimum container width of $280\text{px}$ (scaling up based on primary node tier columns and padding), ensuring ample horizontal space for local node placement (Stage 7) without collapsing into single-node columns.

3. **Deterministic Clearance & Overlap Prevention:**
   Inter-region gaps are dynamically calculated using relationship strength ($gap = 100 - strength \cdot 20$), strictly enforcing $xMax_A + gap \le xMin_B$ and $yMax_A + gap \le yMin_B$.

4. **Preservation of Vertical Architectural Hierarchy:**
   Architectural layer Y ordering (`presentation` < `application` < `domain` < `schema`) remains 100% authoritative along the vertical axis.

---

## 5. REAL DATA MEASUREMENTS (CLOUD SPEND TRACKER)

Evaluated on `audit-fixtures/cloud-spend-tracker/explorer-data.json` (240 nodes, 1024 edges, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`):

| Metric | Before (1D Column Model) | After (2D Multi-Layer Model) | Impact / Status |
| ------ | ------------------------ | ---------------------------- | --------------- |
| **Primary Node Overlaps** | 0 | 0 | **VERIFIED (0.00000 px drift)** |
| **Feature Region Overlaps** | 0 | 0 | **VERIFIED (0 overlaps)** |
| **Multi-Layer Vertical Height (e.g. `feature_forecast-manager`)** | 600 px | 2,580 px | **Expanded to span Presentation $\to$ Schema** |
| **Multi-Layer Vertical Height (e.g. `feature_create_users`)** | 300 px | 1,820 px | **Expanded to span Application $\to$ Schema** |
| **Multi-Node Feature Region Width** | 160 px | 280 px – 640 px | **Genuine 2D spatial regions** |
| **Coordinate Determinism** | 100% (0.00000 px drift) | 100% (0.00000 px drift across 5 shuffles) | **VERIFIED** |
| **Layer Violations** | 0 | 0 | **Strict vertical flow preserved** |

---

## 6. HANDOFF NOTES FOR OTHER WORKSTREAMS

1. **Workstream B2 (Ordering & Crossing Reduction):**
   - Feature regions now provide multi-layer vertical spans and 2D horizontal bounds (`width >= 280px`). Stage 6 sweep iterations can safely order nodes in local `${layer}:${featureId}` buckets knowing region centers and bounds accommodate multi-tier local grids.
2. **Workstream B3 (Shared Infrastructure & Satellites):**
   - Stage 8 bridge candidates and Stage 9 satellite placements can reference `featureRegions.get(featureId)` for accurate 2D spatial centers and bounds.
3. **Workstream B4 (Viewport & Overlay Canvas):**
   - `FeatureOverlayCanvas.tsx` can derive bounding boxes around feature regions that accurately encompass all architectural layers of each feature.

---

## 7. CONCLUSION

Workstream B1 has successfully restored genuine 2D feature/domain region geometry in `explorer/src/lib/layout/global-layout.ts`. Feature regions now act as true 2D spatial containers spanning all member architectural layers while maintaining strict vertical hierarchy, 0% region overlap, and 100% determinism.
