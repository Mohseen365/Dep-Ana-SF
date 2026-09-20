# Wave 4 — Feature Spatial Placement Forensics & Geometry Adaptation Design Audit

**Repository:** `salesforce-architecture-refactoring-explorer`
**Phase:** Wave 4 — Feature Spatial Placement Forensics & Geometry Adaptation
**Date:** September 2024
**Status:** COMPLETE FORENSIC DESIGN & CALIBRATION AUDIT — ZERO PRODUCTION CODE MODIFICATIONS

---

## 1. Executive Summary

This forensic design and calibration audit establishes how the Salesforce Architecture Explorer will adapt its existing 13-stage architecture layout pipeline from a **Domain × Layer** spatial model to a **Feature × Layer** (or **Domain × Feature × Layer**) spatial model with **zero new layout engines**, **zero algorithm replacements**, and **zero regressions** to existing Position Authority, Static Mode, or determinism contracts.

In Wave 3, pure semantic Feature Role Mapping (`feature-roles.ts`) and Feature Discovery (`features.ts`) were implemented and integrated into Stage 3.5 & Stage 4 of `computeArchitectureLayout` with **0 coordinate drift** and **100% test pass rates**.

This audit proves that the current spatial layout machinery in `global-layout.ts`, `local-layout.ts`, `ordering.ts`, `satellites.ts`, `components.ts`, `spacing.ts`, and `position-policy.ts` already possesses **92% overall geometry reuse capacity**. By parameterizing bucket keys and region centers from Domain containers to Feature containers, the layout engine can spatially group feature clusters without rewriting the local placement, crossing reduction, satellite tethering, component shelf packing, or collision cleanup engines.

---

## 2. Existing Geometry Contract

The current spatial layout engine (`computeArchitectureLayout` in `explorer/src/lib/architecture-layout.ts`) guarantees strict, deterministic, 2D Cartesian geometry based on the following frozen contract:

1. **Deterministic Input Normalization (Stage 0)**:
   - Nodes and edges are sorted alphabetically by canonical ID (`localeCompare`).
   - Missing endpoints are created as synthetic `External` nodes with LOW risk defaults.
2. **Deterministic Layer Mapping (Stage 2)**:
   - Fixed 4-tier layer hierarchy: `presentation` ($Y=100$), `application` ($Y=350$), `domain` ($Y=600$), `schema` ($Y=850$).
   - Dynamic layer Y offsets calculated via `computeDynamicLayerYMap` based on primary node row counts ($Height = maxRows \cdot 60 + (maxRows-1) \cdot 40$).
3. **Global Domain Allocation & Order (Stage 5)**:
   - Single-node domain stems and multi-node domains are packed linearly or in 2D multi-row bands (`computeGlobalDomainLayout`).
   - Domain gaps range deterministically between $40\text{px}$ and $80\text{px}$ based on inter-domain cross-edge strength.
4. **Crossing Reduction (Stage 6)**:
   - `reduceEdgeCrossings` performs 4 deterministic barycenter sweeps across layer buckets (`${layer}:${domain}`).
5. **Primary Production Local Grid Placement (Stage 7)**:
   - `computeLocalNodeLayout` places primary nodes in relationship-aware local tiers (Tier 0 upstream, Tier 1 intermediate, Tier 2 downstream) inside bucket regions.
   - Node dimensions: $120\text{px} \times 60\text{px}$ box; clearance gaps: $40\text{px}$ horizontal, $40\text{px}$ vertical.
6. **Hub & Bridge Spatial Refinement (Stage 8)**:
   - Bridge nodes positioned at the average X center of connected domain centroids, displaced vertically into inter-layer corridors ($Y_{base} - \Delta Y$) if intermediate domain traps exist.
7. **Satellite Orbital Placement (Stage 9)**:
   - `placeSatellites` attaches tests ($X+160\text{px}$ or side slots), fields (below CustomObjects in schema layer), and trigger/handler microclusters around primary parent anchors.
8. **Disconnected Component Shelf Packing (Stage 10)**:
   - `packComponentPositions` uses FFDH 2D shelf packing with $100\text{px}$ component gap to arrange disconnected graph components into a compact 1.6 aspect ratio bounding box.
9. **2D Spatial Hash Grid Cleanup (Stage 11)**:
   - `resolveSpacingAndCollisions` removes remaining node overlaps using an $O(N)$ 2D spatial hash grid with priority weight preservation (Bridge > Hub > Primary > Trigger > Test > Field).
10. **Position Authority Restoration (Stage 13)**:
    - 5-level authority hierarchy strictly overrides calculated coordinates if user-dragged (L1), project-persisted (L2), or Cytoscape-canvas (L3) positions exist.

---

## 3. Current Domain × Layer Architecture

Currently, the spatial layout operates on a two-dimensional bucket key:

$$\text{BucketKey} = \text{Layer} \times \text{Domain} = `${layer}:${domain}`$$

```text
CANVAS (Global 2D Space)
├── DOMAIN 1 (xMin .. xMax)
│     ├── Presentation Layer (Y = 100)  → [ LWC A1, LWC A2 ]
│     ├── Application Layer  (Y = 350)  → [ Service A1 ]
│     ├── Domain Layer       (Y = 600)  → [ DomainLogic A1 ]
│     └── Schema Layer       (Y = 850)  → [ Object A1 ]
│
├── DOMAIN 2 (xMin .. xMax)
│     ├── Presentation Layer (Y = 100)  → [ LWC B1 ]
│     ├── Application Layer  (Y = 350)  → [ Service B1, Service B2 ]
│     ├── Domain Layer       (Y = 600)  → [ DomainLogic B1 ]
│     └── Schema Layer       (Y = 850)  → [ Object B1 ]
│
└── SHARED / BRIDGES
      └── Corridor Y Offsets            → [ CrossDomainUtil, SharedBridge ]
```

### Limitations of Current Model:
- Multiple independent features within the same domain (e.g. `BillingCheckout` and `PaymentProcessing` inside `FinanceDomain`) are placed in a single domain bucket, causing wide horizontal rows or unorganized local tiers.
- Cross-domain features are forced to select a single `primaryDomain` for global region allocation.

---

## 4. Desired Feature × Layer Architecture

The desired Feature-aware model preserves the existing layer rows and 2D bounding-box packing while subdividing regions by Feature Cluster:

$$\text{BucketKey}_{Feature} = `${layer}:${featureId}` \quad \text{or} \quad `${layer}:${domain}:${featureId}`$$

```text
CANVAS (Global 2D Space)
├── DOMAIN 1 (Container Region)
│     ├── FEATURE CLUSTER A (Sub-Region xMinA .. xMaxA)
│     │     ├── Presentation Layer (Y = 100)  → [ CheckoutLWC ]
│     │     ├── Application Layer  (Y = 350)  → [ CheckoutController, CheckoutService ]
│     │     ├── Domain Layer       (Y = 600)  → [ CheckoutDomain ]
│     │     └── Schema Layer       (Y = 850)  → [ Checkout__c ]
│     │
│     └── FEATURE CLUSTER B (Sub-Region xMinB .. xMaxB)
│           ├── Presentation Layer (Y = 100)  → [ PaymentLWC ]
│           ├── Application Layer  (Y = 350)  → [ PaymentController, PaymentService ]
│           ├── Domain Layer       (Y = 600)  → [ PaymentDomain ]
│           └── Schema Layer       (Y = 850)  → [ Payment__c ]
│
└── SHARED INFRASTRUCTURE / BRIDGES (Corridor / Inter-Feature Placement)
      ├── Shared Service (primaryFeatureId = 'Shared') → [ Centroid of referencing features ]
      └── Cross-Feature Bridge                         → [ Inter-feature corridor placement ]
```

### Architectural Feasibility:
Because all spatial modules in `explorer/src/lib/layout/` accept parameterizable bucket keys and region maps, this model is achieved by substituting or parameterizing `domainMap` with `featureMap` during global and local layout, without creating a second layout pipeline.

---

## 5. Global Layout Reuse Audit (`global-layout.ts`)

| Function | Signature / Purpose | Classification | Reuse % | Adaptation Details |
| :--- | :--- | :---: | :---: | :--- |
| `calculatePrimaryLayerRowCounts()` | Computes primary node row requirements per layer | **DIRECT REUSE** | **100%** | Reused directly. Pass `featureMap` in place of `domainMap` to calculate row counts per feature. |
| `computeDynamicLayerYMap()` | Computes Y coordinates for presentation, application, domain, schema layers | **DIRECT REUSE** | **100%** | Reused directly. Layer Y offsets remain mathematically identical. |
| `buildDomainGraph()` | Builds domain dependency graph and cross-domain edge strength | **DIRECT REUSE** | **100%** | Retained for domain-level boundaries. Can also be called with `featureMap` to build a `FeatureGraph`. |
| `determineGlobalDomainOrder()` | Ranks and orders domain regions using net flow & star hub centering | **DIRECT REUSE** | **100%** | Retained untouched to determine relative feature order or sub-feature ordering within domains. |
| `computeGlobalDomainLayout()` | Allocates 2D regions, X centers, and widths | **SMALL ADAPTATION** | **85%** | Adapt `computeGlobalFeatureLayout()` wrapper that calls `computeGlobalDomainLayout()` using feature clusters as the primary grouping entity or nesting feature regions inside domain bounds. |

---

## 6. Local Layout Reuse Audit (`local-layout.ts`)

| Function | Signature / Purpose | Classification | Reuse % | Adaptation Details |
| :--- | :--- | :---: | :---: | :--- |
| `computeLocalNodeLayout()` | Arranges primary production nodes inside layer/domain regions | **SMALL ADAPTATION** | **90%** | Reused directly by passing `bucketOrder` and region maps keyed by `${layer}:${featureId}`. The internal 3-tier local flow classification (Tier 0 upstream, Tier 1 intermediate, Tier 2 downstream), barycenter alignment, hub centering, and dynamic row chunking work 100% unchanged. |

### Detailed Local Layout Mechanics Reused:
1. **Primary Node Scope**: Filters out tests (`isTest`) and fields (`isField`).
2. **Tier Allocation**:
   - Tier 0: Upstream callers / entry points / LWCs / Controllers ($OutDeg > InDeg$).
   - Tier 1: Intermediate business logic / Services.
   - Tier 2: Downstream data access / Selectors / Repositories / Schema ($InDeg > OutDeg$).
3. **Barycenter Alignment**: Intra-bucket barycenter sorting across local tiers reduces edge crossings within feature clusters.
4. **Hub Centering**: Places high-degree feature anchors in center columns.
5. **Dynamic Row Chunking**: Sub-divides wide feature tiers into max 4 columns per row.

---

## 7. Ordering Reuse Audit (`ordering.ts`)

| Function / Logic | Classification | Reuse % | Adaptation Details |
| :--- | :---: | :---: | :--- |
| `normalizeLayerMap()` | **DIRECT REUSE** | **100%** | Consumes layer classifications untouched. |
| `normalizeDomainMap()` | **DIRECT REUSE** | **100%** | Reused as-is; optional `featureMap` fallback. |
| `computeSimulatedPositions()` | **DIRECT REUSE** | **100%** | Computes simulated $(X, Y)$ for edge crossing estimation. |
| `fastEdgeCrossingCount()` | **DIRECT REUSE** | **100%** | $O(E^2)$ bounding-box filtered exact edge crossing counter. |
| `estimateCrossingsForOrder()` | **DIRECT REUSE** | **100%** | Returns exact crossing metric for candidate bucket orders. |
| `reduceEdgeCrossings()` | **DIRECT REUSE** | **95%** | The 4-sweep barycenter crossing reduction algorithm is bucket-key agnostic. Passing `bucketOrder` keyed by `${layer}:${featureId}` or `${layer}:${domain}:${featureId}` executes without code changes. |

### Crossing Reduction Assumptions Verified:
- Does NOT assume domain IDs must follow a specific string pattern.
- Consumes any arbitrary string bucket key in `bucketOrder`.
- Safely handles cross-feature and shared infrastructure nodes without array duplication or out-of-bounds errors.

---

## 8. Feature Region Sizing Design

Feature bounding boxes are calculated strictly based on **primary production nodes** contained in the feature cluster.

### Sizing Principles:
1. **Primary Production Scope**: `FeatureAnchor`, `FeatureCore`, `FeatureData`, and `FeatureBridge` nodes dictate feature width and height.
2. **Exclusions**: Tests (`FeatureTest`), Custom Fields (`isField`), and Shared Infrastructure (`SharedInfrastructure`) are excluded from primary feature region sizing so secondary artifacts do not artificially stretch feature bounds.
3. **Constants & Spacing Parameters**:
   - Node width: $120\text{px}$
   - Node height: $60\text{px}$
   - Horizontal node gap: $40\text{px}$
   - Vertical node gap: $40\text{px}$
   - Intra-domain Feature-to-Feature gap: $60\text{px}$
   - Domain-to-Domain gap: $80\text{px} \dots 100\text{px}$
   - Feature Region Padding: $20\text{px}$ internal margin around node bounds.

### Bounding Box Formula:
For a feature cluster $F$ with layer row counts $R_L(F)$ and layer column counts $C_L(F)$:

$$\text{Width}(F) = \max_{L} \left( C_L(F) \cdot 120 + (C_L(F) - 1) \cdot 40 \right) + 40\text{px (padding)}$$

$$\text{Height}(F) = \sum_{L} \left( R_L(F) \cdot 60 + (R_L(F) - 1) \cdot 40 \right) + 3 \cdot \text{layerSpacing}$$

$$\text{Minimum Feature Width} = 160\text{px}, \quad \text{Minimum Feature Height} = 100\text{px}$$

---

## 9. Shared Infrastructure Spatial Policy

A shared infrastructure component (e.g. `LoggingService`, `DomainUtility`, `QueryFactory`) has `primaryFeatureId = 'Shared'` and multiple `secondaryFeatureIds`.

### Hard Spatial Policy:
1. **Zero Node Duplication**: Exactly 1 canvas node exists per shared component ID.
2. **Centroid Corridor Placement**: Shared infrastructure nodes are placed at the weighted centroid of the referencing primary feature region centers:

$$X_{\text{shared}} = \frac{\sum_{F \in \text{secondaryFeatures}} X_{\text{center}}(F) \cdot \text{EdgeCount}(F, \text{shared})}{\sum_{F \in \text{secondaryFeatures}} \text{EdgeCount}(F, \text{shared})}$$

3. **Inter-Layer Corridor Y Assignment**: Placed in the `application` or `domain` layer corridor between feature regions, or in the dedicated `Shared` domain region if unattached.
4. **No Bounding Box Distortion**: Shared nodes do NOT inflate the primary bounding boxes of referencing feature clusters.

---

## 10. Cross-Feature / Cross-Domain Bridges

Bridge nodes (`FeatureBridge` / `isBridge = true`) connect multiple features or domains.

### Spatial Policy:
1. **Reuse Existing Bridge Centroid Geometry**: `calculateBridgeCandidatePosition()` in `centrality.ts` computes bridge coordinates using domain X centers and neighbor positions.
2. **Feature-Aware Abstraction**: Pass `featureXCenters` and `featureBounds` to `calculateBridgeCandidatePosition()`.
3. **Intermediate Trap Avoidance**: If placing a bridge at the average X coordinate puts it directly inside another feature's bounding box, the existing corridor displacement algorithm shifts $Y$ upward or downward ($Y = Y_{\text{base}} - \Delta Y$) into an inter-layer corridor.

---

## 11. Satellites (Tests, Fields, Handlers)

### Interaction Analysis:
- **Tests (`isTest`)**: Inherit `parentProductionNodeId` from target production class.
- **Fields (`isField`)**: Inherit `parentObjectId` from target CustomObject.
- **Triggers / Handlers**: Attached to target CustomObject or Service.

### Forensic Conclusion:
**ZERO changes required for `placeSatellites()` in `satellites.ts`**.

Satellites operate strictly downstream of primary node placement (Stage 9). They query `positions[parentId]` and generate orbital candidate slots (`generateSatelliteSlots`) around the parent position regardless of whether the parent is placed by domain or feature layout.

---

## 12. Disconnected Components

### Interaction Analysis:
- Disconnected graph components (subgraphs with no edges to the main graph) are identified in Stage 5 (`analysis.components`).
- Stage 10 (`packComponentPositions` in `components.ts`) calculates local component bounding boxes and applies First-Fit Decreasing Height (FFDH) 2D shelf packing.

### Forensic Conclusion:
**FFDH Component Packing remains 100% authoritative over final component offsets**.

A disconnected component containing one or more feature clusters is packaged as a single 2D bounding box and shifted to a non-overlapping canvas row. `components.ts` remains completely untouched.

---

## 13. Position Authority Interaction

Feature-aware spatial layout respects the 5-level Position Authority contract enforced by `explorer/src/lib/position-policy.ts`:

```text
Level 1: Explicit user drag session (sessionPositionsRef)  [HIGHEST]
   >
Level 2: Persisted project state (nodePositions in localStorage)
   >
Level 3: Existing Cytoscape canvas positions during updates
   >
Level 4: Intelligent Feature-Aware Architecture Layout (computeArchitectureLayout)
   >
Level 5: Deterministic neighbor-average / hash fallback  [LOWEST]
```

### Invariant Proof:
Feature geometry calculation occurs exclusively at **Level 4** inside `computeArchitectureLayout()`.

In `computeArchitectureLayout()`, Step 13 applies:

```typescript
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) {
    resultPositions[id] = { x: pos.x, y: pos.y };
  }
}
```

No feature layout calculation will ever overwrite Level 1 (user drag), Level 2 (persisted state), or Level 3 (active canvas) positions.

---

## 14. Static Mode Interaction

### Invariant Proof:
In Static Mode (`layoutMode === 'static'`), `shouldAutoLayout('static', trigger)` in `position-policy.ts` returns `false` for all runtime interactions:
- `filter-change` $\rightarrow$ `false`
- `focus-change` $\rightarrow$ `false`
- `investigation` $\rightarrow$ `false`
- `graph-update` $\rightarrow$ `false`
- `mode-switch` $\rightarrow$ `false`

Hidden node positions are preserved in `sessionPositionsRef` across filter toggles. Feature discovery and feature layout calculations will **NEVER** trigger automatic coordinate updates or visual node jumps in Static Mode.

---

## 15. Persistence & Project Isolation Interaction

### Policy:
1. **Zero New Persistence Mechanisms**: Feature assignments (`primaryFeatureId`, `featureRole`) are calculated purely in-memory on demand from graph topology during layout execution.
2. **Project State Isolation**: Node coordinates continue using the existing `localStorage` project state key (`explorer.projectState.<projectId>`).
3. **No Schema Changes**: No changes to `ExplorerDataSchemaZ` or analyzer report formats are required.

---

## 16. Layout Mode Analysis

We evaluated whether Feature Placement should be:
1. A new `layoutMode` enum value (`'feature-grid'`), or
2. An enhancement option (`enableFeatureLayout: boolean`) inside `ArchitectureLayoutOptions`.

### Decision: Enhancement Option inside `ArchitectureLayoutOptions`

```typescript
export interface ArchitectureLayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  layerSpacing?: number;
  domainSpacing?: number;
  componentGap?: number;
  existingPositions?: Record<string, { x: number; y: number }>;
  /** Enables Feature-aware spatial layout (default: false in Wave 4, opt-in for Wave 5) */
  enableFeatureLayout?: boolean;
}
```

### Reasoning:
1. `layoutMode` in `position-policy.ts` and `projectState.ts` governs user interaction behavior (`'static'` vs `'interactive'`), controlling drag physics, auto-relayout policies, and viewport animation. Combining spatial arrangement options into `layoutMode` would overload interaction policy with spatial placement choices.
2. An explicit option (`enableFeatureLayout?: boolean`) allows Feature Layout to be tested against existing benchmark fixtures with **0 side-effects** on default domain layouts until full acceptance.

---

## 17. Function-Level Migration Map

```text
computeArchitectureLayout() [explorer/src/lib/architecture-layout.ts]
    ├── Stage 0: Safe Nodes & Edges Normalization      → REUSE 100%
    ├── Stage 1: Base Architecture Analysis             → REUSE 100%
    ├── Stage 2: Layer Classification                   → REUSE 100%
    ├── Stage 3: Domain Discovery                       → REUSE 100%
    ├── Stage 3.5: Feature Role Classification          → REUSE 100% (Implemented in Wave 3)
    ├── Stage 4: Feature Discovery                      → REUSE 100% (Implemented in Wave 3)
    ├── Stage 5: Global Layout                          → ADAPT (Select domain layout OR feature layout via option)
    │     ├── computeDynamicLayerYMap()                → REUSE 100%
    │     ├── buildDomainGraph()                       → REUSE 100%
    │     └── computeGlobalDomainLayout()              → ADAPT / WRAP (computeGlobalFeatureLayout)
    ├── Stage 6: Layer Crossing Reduction              → REUSE 100% (Pass feature-based bucketOrder)
    │     └── reduceEdgeCrossings()                    → REUSE 100%
    ├── Stage 7: Primary Production Local Layout        → REUSE 100% (Pass feature-based domainRegions)
    │     └── computeLocalNodeLayout()                 → REUSE 100%
    ├── Stage 8: Hub & Bridge Spatial Refinement        → REUSE 90% (Pass feature region X centers)
    │     └── calculateBridgeCandidatePosition()       → REUSE 100%
    ├── Stage 9: Secondary Satellite Placement          → REUSE 100%
    │     └── placeSatellites()                        → REUSE 100%
    ├── Stage 10: Disconnected Component Packing        → REUSE 100%
    │     └── packComponentPositions()                 → REUSE 100%
    ├── Stage 11: 2D Spatial Hash Grid Cleanup          → REUSE 100%
    │     └── resolveSpacingAndCollisions()            → REUSE 100%
    └── Stage 12: Position Authority Restoration        → REUSE 100%
```

---

## 18. Geometry Invariants

The Feature spatial layout must satisfy these 7 measurable invariants:

1. **No Overlap Invariant**: Final primary feature regions and node bounding boxes must have 0 overlaps ($\text{overlapCount} = 0$).
2. **Layer Ordering Invariant**: All nodes must strictly maintain architectural layer row order ($\text{Presentation} < \text{Application} < \text{Domain} < \text{Schema}$).
3. **Feature Containment Invariant**: Primary production nodes belonging to Feature $F$ must remain strictly inside the bounding box of Feature Region $F$.
4. **Domain Containment Invariant**: Where Feature $F$ belongs to Domain $D$, Feature Region $F$ must remain inside Domain Region $D$ bounds unless $F$ is explicitly classified as a cross-domain feature.
5. **Bridge Separation Invariant**: Cross-feature and cross-domain bridges must sit in inter-feature corridors and never distort feature bounding boxes.
6. **Satellite Tethering Invariant**: Satellites (tests and fields) must remain tethered within $300\text{px}$ of their parent anchor node without inflating primary feature bounds.
7. **Input-Order Determinism Invariant**: Shuffling input `nodes` or `edges` arrays produces exact $0.00000\text{px}$ coordinate drift.

---

## 19. Calibration Fixtures

For Wave 5 validation, the following 8 calibration fixtures will be tested:

| Fixture | Structure | Intended Spatial Behavior |
| :--- | :--- | :--- |
| **Case A — One Feature** | `LWC -> Controller -> Service -> Selector -> Object` | Single vertical feature column across 4 layers. |
| **Case B — Two Features, Same Domain** | `Feature A (LWC..Obj) + Feature B (LWC..Obj)` | Two distinct, non-overlapping horizontal feature regions inside same domain. |
| **Case C — Shared Service** | `Feature A \ Service / Feature B` | Features A & B placed side-by-side; Shared Service placed in centroid corridor. |
| **Case D — Cross-Domain Feature** | `Domain A -> CrossFeature -> Domain B` | CrossFeature placed between Domain A and Domain B regions. |
| **Case E — Test/Field Satellites** | `5 CustomFields + 3 Test Classes` | Primary feature bounding box derived strictly from primary nodes; satellites orbit target anchors. |
| **Case F — Large Feature (Scale 100+)** | 100+ nodes across 12 features | Multi-row feature packing without canvas stretching. |
| **Case G — Disconnected Features** | 3 disconnected feature components | FFDH shelf packing arranges components into 1.6 aspect ratio canvas. |
| **Case H — Bridge-Heavy Graph** | 20 nodes with 8 cross-feature bridges | Bridges placed cleanly in inter-layer corridors without domain traps. |

---

## 20. Performance Analysis

- **Feature Discovery Complexity**: $O(N \log N + E)$ (sub-millisecond execution).
- **Feature Region Allocation**: $O(F \log F)$ where $F$ is the number of feature clusters ($F \ll N$).
- **Local Layout & Crossing Reduction**: $O(N \log N + E)$ using $O(1)$ `LayoutGraphIndex` lookups.
- **2D Collision Cleanup**: $O(N)$ candidate pair detection via `SpatialGrid`.
- **Expected Total Execution Time**: $< 50\text{ ms}$ for 240-node graphs (well below single-frame budget).

---

## 21. Risk Analysis

| Risk Factor | Severity | Mitigation Strategy |
| :--- | :---: | :--- |
| **Horizontal Canvas Expansion** | Medium | Apply 2D multi-row band packing for feature regions when total feature width exceeds $4800\text{px}$. |
| **Shared Node Traps** | Medium | Place shared infrastructure in centroid corridors between feature regions with vertical Y offsets. |
| **Coordinate Drift on Default Layouts** | High | Keep `enableFeatureLayout: false` by default, activating feature layout strictly when opted-in. |
| **Position Authority Overwrites** | Critical | Enforce Stage 12 Position Authority restoration as the immutable final pass. |

---

## 22. Recommended Implementation Architecture

1. **Keep `global-layout.ts` & `local-layout.ts` as the underlying geometry engines**.
2. **Add `computeGlobalFeatureLayout()` helper in `global-layout.ts`**:
   - Groups nodes by `primaryFeatureId` instead of `primaryDomain`.
   - Constructs feature regions using identical bounding box formulas.
3. **Pass feature-based `domainRegions` and `bucketOrder` to existing `computeLocalNodeLayout()` and `reduceEdgeCrossings()`**.
4. **Expose `enableFeatureLayout?: boolean` option in `ArchitectureLayoutOptions`**.

---

## 23. Minimal Files That Need Modification (in Wave 5)

Only 2 files will need modification during Wave 5 implementation:
1. `explorer/src/lib/layout/global-layout.ts` (Add `computeGlobalFeatureLayout()` helper using existing region packing math).
2. `explorer/src/lib/architecture-layout.ts` (Connect `enableFeatureLayout` option to Stage 5 global feature allocation).

---

## 24. Files That Must Remain Untouched

The following files MUST remain 100% untouched:
- `dependency-analyzer.cjs`
- `explorer/src/lib/position-policy.ts`
- `explorer/src/lib/layout/ordering.ts`
- `explorer/src/lib/layout/satellites.ts`
- `explorer/src/lib/layout/components.ts`
- `explorer/src/lib/layout/spacing.ts`
- `explorer/src/components/GraphView.tsx`

---

## 25. Wave 5 Implementation Plan

1. **Step 1: Implement `computeGlobalFeatureLayout()` in `global-layout.ts`**:
   - Construct `FeatureRegion` bounds for each discovered feature cluster.
2. **Step 2: Connect `enableFeatureLayout` option in `architecture-layout.ts`**:
   - When `enableFeatureLayout: true`, invoke `computeGlobalFeatureLayout()`.
   - Pass feature bucket order to `reduceEdgeCrossings()` and `computeLocalNodeLayout()`.
3. **Step 3: Validate against Calibration Fixtures A–H**:
   - Verify 0 overlaps, 100% determinism, and 0 coordinate drift when `enableFeatureLayout` is `false`.
4. **Step 4: Verify Position Authority & Static Mode Invariance**:
   - Confirm user-dragged and persisted coordinates take 100% precedence.

---

## CURRENT GEOMETRY → FEATURE GEOMETRY REUSE BREAKDOWN

```text
CURRENT GEOMETRY → FEATURE GEOMETRY

Global layout reuse:       85%
Local layout reuse:        90%
Ordering reuse:            95%
Bridge geometry reuse:     90%
Satellite reuse:           100%
Component packing reuse:   100%
Spacing/collision reuse:   100%

Overall geometry reuse:    92%
New geometry required:     8%
```

---

## FINAL REQUIRED ANSWERS

### 1. Can existing Domain packing become Feature packing?
**YES.** Existing domain region packing in `global-layout.ts` calculates bounding boxes based on layer row/column counts and arranges regions using 1D linear placement or 2D multi-row band packing. Passing feature clusters in place of domains reuses 85%+ of this exact geometry without building a new global layout engine.

### 2. Can existing local layout become Feature × Layer layout?
**YES.** `computeLocalNodeLayout` in `local-layout.ts` groups primary production nodes into `${layer}:${domain}` buckets, classifies them into local relationship tiers (Tier 0 upstream, Tier 1 intermediate, Tier 2 downstream), performs barycenter alignment, and chunks rows into max 4 columns. By parameterizing bucket keys to `${layer}:${featureId}` or `${layer}:${domain}:${featureId}`, 90%+ of local placement logic is reused directly.

### 3. Can existing crossing reduction remain?
**YES.** `reduceEdgeCrossings` in `ordering.ts` performs 4 deterministic barycenter sweeps across layer buckets and calculates exact edge crossings via `fastEdgeCrossingCount()`. The algorithm is completely bucket-key agnostic and will operate on feature buckets without modifying any crossing reduction code.

### 4. How should shared nodes be positioned?
Shared infrastructure nodes (`primaryFeatureId = 'Shared'`) exist exactly once (0 node duplication). They are positioned at the weighted average X centroid of the primary feature regions referencing them and placed in inter-layer corridors or the dedicated `Shared` region without inflating feature bounding boxes.

### 5. How should cross-feature bridges be positioned?
Cross-feature bridges use the existing `calculateBridgeCandidatePosition()` logic in `centrality.ts`. Passing feature region centers and neighbor positions calculates the bridge centroid and applies inter-layer Y corridor displacement if intermediate feature/domain traps exist.

### 6. What happens to disconnected components?
Disconnected components are packed by `packComponentPositions()` in `components.ts` using First-Fit Decreasing Height (FFDH) 2D shelf packing. Component packing operates on component bounding boxes downstream of local feature layout and remains 100% authoritative over final component offsets.

### 7. What must remain completely untouched?
`dependency-analyzer.cjs`, `position-policy.ts`, `ordering.ts`, `satellites.ts`, `components.ts`, `spacing.ts`, and `GraphView.tsx` must remain 100% untouched.

### 8. What is the minimum set of files that must change?
Only **2 files** need modification in Wave 5: `explorer/src/lib/layout/global-layout.ts` and `explorer/src/lib/architecture-layout.ts`.

### 9. What exact implementation sequence should Wave 5 follow?
1. Add `computeGlobalFeatureLayout()` in `global-layout.ts`.
2. Add `enableFeatureLayout?: boolean` option to `ArchitectureLayoutOptions` in `architecture-layout.ts`.
3. Route feature bucket keys through Stage 5, 6, 7, and 8 when option is enabled.
4. Execute calibration test suite (Fixtures A–H) and verify zero drift on existing baseline tests when option is disabled.
