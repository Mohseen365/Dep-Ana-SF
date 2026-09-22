# HYBRID LAYOUT — DEEP ARCHITECTURAL AUDIT & SPATIAL COMMUNITY FORENSICS

## 0. PROJECT DOCUMENTATION BASELINE

### A. Root Markdown Inventory

| File | Last Modified | Apparent Phase | Purpose | Recency Priority | Relevance |
| ---- | ------------- | -------------- | ------- | ---------------- | --------- |
| `HYBRID_LAYOUT_PROMPT12_FINAL_PRODUCTION_READINESS_REPORT.md` | 2026-09-22 13:42 | Prompt 12 | Final Production Readiness & Release Gate Audit | 1 (Newest Release Gate) | Authoritative release gate status (`RELEASE READY WITH DOCUMENTED LIMITATIONS`, production flag `false`). |
| `HYBRID_LAYOUT_PROMPT11_IMPLEMENTATION_REPORT.md` | 2026-09-22 13:42 | Prompt 11 | Final Architecture Integration Audit | 2 | End-to-end integration audit, position authority (0.00000 px drift), invariant enforcement. |
| `HYBRID_LAYOUT_PROMPT10_IMPLEMENTATION_REPORT.md` | 2026-09-22 13:42 | Prompt 10 | Workflow Hardening & Adversarial E2E Matrix | 3 | Finding lifecycle, stale-proposal safety, mixed operation matrix. |
| `HYBRID_LAYOUT_PROMPT9_IMPLEMENTATION_REPORT.md` | 2026-09-22 13:42 | Prompt 9 | E2E Architecture Decision Workflow | 4 | End-to-end interactive simulation, finding handoff, commit validation. |
| `HYBRID_LAYOUT_PROMPT8_IMPLEMENTATION_REPORT.md` | 2026-09-22 13:42 | Prompt 8 | Real-Data Validation & Commit Safety | 5 | Cloud Spend Tracker fixture SHA-256 verification and commit safety envelope. |
| `HYBRID_LAYOUT_PHASE7B_FINAL_CROSSING_GAP_REPORT.md` | 2026-09-22 13:42 | Phase 7B | Final Satellite Crossing Gap Audit | 6 | Detailed breakdown of 83,959 satellite crossings and 487-crossing release threshold gap. |
| `HYBRID_LAYOUT_PHASE7_SATELLITE_LOCALITY_HARDENING_REPORT.md` | 2026-09-22 13:42 | Phase 7 | Satellite Placement & Locality Hardening | 7 | Adaptive search radius scaling and slot occupancy tracking. |
| `HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md` | 2026-09-22 13:42 | Phase 6 | Hybrid Layout Integration Evaluation | 8 | Forensic audit of Candidates A–F, concluding in OUTCOME B (Production Blocked). |
| `HYBRID_LAYOUT_PHASE6_A_2D_GEOMETRY_REPORT.md` | 2026-09-22 13:42 | Phase 6-A | 2D Hybrid Domain Band Packing | 9 | Multi-row 2D domain band layout implementation details. |
| `HYBRID_LAYOUT_PHASE5_FINAL_INTEGRATION_REPORT.md` | 2026-09-22 13:42 | Phase 5 | Phase 5 Integration & Verification | 10 | Primary geometry stabilization and feature ordering integration. |
| `HYBRID_LAYOUT_PHASE4_P0_BASELINE_REPORT.md` | 2026-09-22 13:42 | Phase 4.0 | Canonical Baseline & Stage Instrumentation | 11 | Baseline metrics for Path A/B/C and 13-stage diagnostic contract. |
| `HYBRID_LAYOUT_MASTER_BASELINE.md` | 2026-09-22 13:42 | Phase 0 | Master Baseline & Technical Hierarchy | 12 | Authoritative spatial readability hierarchy and design rules. |
| `HYBRID_LAYOUT_FORENSIC_AUDIT.md` | 2026-09-22 13:42 | Phase 0 | Forensic Audit of Initial Capabilities | 13 | Original 13-stage pipeline forensic audit and capability mapping. |

---

### B. Latest Relevant Documents
1. `HYBRID_LAYOUT_PROMPT12_FINAL_PRODUCTION_READINESS_REPORT.md` (Release Gate & System State)
2. `HYBRID_LAYOUT_PROMPT11_IMPLEMENTATION_REPORT.md` (System Integration & Invariants)
3. `HYBRID_LAYOUT_PHASE7B_FINAL_CROSSING_GAP_REPORT.md` (Satellite Crossing Breakdown & Gap)
4. `HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md` (Candidate B Architecture & Production Block)
5. `HYBRID_LAYOUT_MASTER_BASELINE.md` (Autoritative Spatial Readability Hierarchy)

---

### C. Current Documentary State
- **Latest Phase:** Prompt 12 / Phase 7B Hardening
- **Latest Canonical Benchmark:** Cloud Spend Tracker (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, 240 Nodes, 1,024 Edges, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`)
- **Latest Measured Metrics (`enableFeatureLayout: true`):**
  - $C_{pp} = 8,704$ (Primary-Primary Crossings, passes mandatory $C_{pp} < 9,335$ gate)
  - $C_{pb} = 2,594$, $C_{bb} = 230$
  - $C_{ps} = 41,777$, $C_{ss} = 42,182$
  - $C_{total} = 95,487$ (Total Geometric Crossings)
  - Feature Cohesion = 0.8830
  - Layer Violations = 0, Primary Overlaps = 0, Satellite Overlaps = 0
  - Deterministic Drift = 0.00000 px, Primary Drift = 0.00000 px
- **Latest Numerical Target:** $C_{total} \le 95,000$ (Current gap = 487 crossings)
- **Latest Visual Goal:** Hierarchical Flow + Spatially Coherent Clustered Regions + Reduced Crossings (Example #6 "Best of Both Worlds")
- **Latest Known Blocker:** OUTCOME B — Candidate B (Phase 6-A hybrid layout) is integrated into `computeArchitectureLayout`, but `enableFeatureLayout: false` remains the production default because $C_{total} = 95,487 > 95,000$ and feature nodes display spatial fragmentation due to high unassigned rates (87.5% unassigned).
- **Latest Production Status:** `RELEASE READY WITH DOCUMENTED LIMITATIONS` (`enableFeatureLayout: false` in production UI).

---

### D. Protected Decisions & System Invariants

| Invariant | Evidence / Verification Test | Current Implementation | Constraint |
| --------- | ---------------------------- | ---------------------- | ---------- |
| **0.00000 px Position Authority Drift** | `Prompt11FinalIntegrationAudit.test.ts` | Stage 12 in `architecture-layout.ts` restores `existingPositions` | User drags and persisted coordinates must never drift across non-layout operations. |
| **Primary Geometry Preservation ($C_{pp} = 8,704$)** | `Phase6A2DGeometry.test.ts` | Stage 7/8 in `architecture-layout.ts` | Primary-primary crossings must remain $\le 8,704$ ($C_{pp} < 9,335$ gate). |
| **Zero Overlaps (Primary & Satellite)** | `Prompt8RealDataValidation.test.ts` | Stage 9 `placeSatellites` & Stage 11 `resolveSpacingAndCollisions` | 0 primary-primary, 0 primary-satellite, 0 satellite-satellite node overlaps. |
| **Zero Layer Violations** | `LocalityMetricsAudit.test.ts` | Stage 2/6/7 in `architecture-layout.ts` | Presentation $\to$ Application $\to$ Domain $\to$ Schema top-to-bottom flow strictly enforced. |
| **Legacy Isolation (`enableFeatureLayout: false`)** | `ProductionLayoutActivation.test.tsx` | Branching in `architecture-layout.ts` & `GraphView.tsx` | Legacy layout execution path, coordinates, and crossings must remain 100% byte/pixel identical. |
| **10/10 Deterministic Replay** | `Prompt11FinalIntegrationAudit.test.ts` | Deterministic sorting on ID/hash throughout Stage 0–12 | Shuffled input or repeated execution must yield 0.00000 px coordinate variation. |

---

### E. Superseded / Rejected Approaches

| Approach | Document | Why Rejected | Still Relevant? |
| -------- | -------- | ------------ | --------------- |
| **Unconstrained Force-Directed / Annealing Layout** | `HYBRID_LAYOUT_FORENSIC_AUDIT.md` | Violates strict architectural layer flow, introduces non-determinism, scales poorly ($O(N^2)$ or $O(N^3)$). | No — strictly prohibited. |
| **Naive 1D Linear Feature Stacking** | `HYBRID_PHASE1_B2_ORDERING_REPORT.md` | Produced excessive canvas width ($>12,000\text{ px}$) and inflated cross-feature edge lengths. | No — replaced by Candidate B multi-row 2D domain packing. |
| **Displacing Primary Anchors for Satellites** | `HYBRID_LAYOUT_PHASE7_SATELLITE_LOCALITY_HARDENING_REPORT.md` | Caused primary geometry cascade and violated $C_{pp} \le 8,704$ contract. | No — satellites must be placed around fixed primary anchors. |
| **Interactive Layout Recomputation on Viewport Pan/Zoom** | `HYBRID_LAYOUT_PROMPT6_IMPLEMENTATION_REPORT.md` | Triggered expensive layout recalculations during zoom/pan, dropping frame rate $< 15\text{ FPS}$. | No — viewport transforms are decoupled in `FeatureOverlayCanvas.tsx`. |
| **Activating `enableFeatureLayout: true` by Default in Prod** | `HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md` | Total crossings $C_{total} = 95,487$ exceeded 95,000 threshold and semantic feature coverage was incomplete. | Yes — remains blocked until release gate is satisfied. |

---

### F. Document Contradictions Matrix

| Topic | Older Statement | Newer Statement | Executable Evidence | Current Interpretation |
| ----- | --------------- | --------------- | ------------------- | ---------------------- |
| **Primary Crossings Threshold** | Phase 1: $C_{pp} \le 9,335$ | Phase 6/7: $C_{pp} = 8,704$ | Executable runs yield $C_{pp} = 8,704$ | $C_{pp} = 8,704$ is the canonical frozen baseline; $C_{pp} < 9,335$ is the hard gate. |
| **Feature Region Existence** | Phase 1 B1: "Feature regions are implemented in global layout." | Phase 6-A: "Domain regions are packed in 2D; feature regions are semantic bounds." | `global-layout.ts` exports `computeGlobalFeatureLayout` which packs feature/domain regions into layer bands. | Domain/feature 2D bands exist in Stage 5, but local placement in Stage 7 distributes nodes across layer bands, weakening 2D feature bounding boxes. |
| **Satellite Crossing Impact** | Phase 3: "Satellites add ~15,000 crossings." | Phase 7B: "Satellites add 83,959 crossings ($C_{ps} + C_{ss}$)." | `evaluateLayout` yields $C_{ps} = 41,777$, $C_{ss} = 42,182$, sum = $83,959$. | Executable result wins. Satellites generate 87.9% of total layout crossings. |

---

### G. Current Documentary Hypothesis
The project documentation implies that Candidate B (Phase 6-A Hybrid Layout) successfully constructs 2D domain/feature geometry and reduces primary-primary crossings to $C_{pp} = 8,704$, but fails to achieve the visual target (Example #6 "Best of Both Worlds") and the numerical gate ($C_{total} \le 95,000$) because:
1. **Semantic Feature Discovery Leakage:** `discoverFeatures` assigns 210 out of 240 nodes (87.5%) to `Unassigned` due to strict naming/directory heuristics, causing global feature ordering to collapse into monolithic domain buckets.
2. **Post-Hoc Unconstrained Satellite Placement:** Stage 9 (`placeSatellites`) inserts 84 satellite nodes (tests, fields) *after* primary geometry is frozen without evaluating satellite-to-primary or satellite-to-satellite edge crossings, generating 83,959 crossings ($87.9\%$ of $C_{total}$).
3. **Absence of Spatial Community Constraints:** The pipeline lacks a persistent 2D `FeatureCommunityRegion` abstraction in Stage 7/8 that constrains node placement to cohesive spatial regions across layer bands.

---

### H. Verification Plan
- **Executable Source Inspection:** Verify `architecture-layout.ts`, `global-layout.ts`, `features.ts`, `satellites.ts`, `metrics.ts`, and `evaluate-layout.ts`.
- **Runtime Measurement & Tracing:** Execute TSX scripts on `audit-fixtures/cloud-spend-tracker/explorer-data.json` to capture stage-by-stage node coordinates, feature bounding boxes, fragmentation indices, crossing decompositions, and locality metrics.
- **Suite Verification:** Execute existing vitest suites (`Prompt11FinalIntegrationAudit.test.ts`, `Prompt8RealDataValidation.test.ts`, `Phase6A2DGeometry.test.ts`).

---

# HYBRID LAYOUT — DEEP ARCHITECTURAL AUDIT & SPATIAL COMMUNITY FORENSICS

## 1. Executive Summary

A deep forensic architectural audit of the graph layout engine (`explorer/src/lib/architecture-layout.ts`) was conducted against the canonical Cloud Spend Tracker dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, 240 nodes, 1,024 edges).

The audit conclusively proves that while the layout engine excels at **Global Hierarchical Layer Flow** (0 layer violations) and **Primary Relationship Placement** ($C_{pp} = 8,704$, meeting the $C_{pp} < 9,335$ gate), it currently **fails to form true 2D Spatial Communities**.

### Key Forensic Discoveries:
1. **Semantic Feature Discovery Collapse:** `discoverFeatures()` assigns **210 out of 240 nodes (87.5%) to `Unassigned`** on the canonical real-world benchmark dataset. Because semantic discovery relies heavily on rigid class name prefixes (`CloudAccountController` $\to$ `CloudAccount`), it fails to group 210 nodes that belong to broader functional features, collapsing global feature layout into fallback domain layout.
2. **Post-Hoc Unconstrained Satellite Placement:** Primary nodes ($156$ nodes) generate only $11,528$ crossings ($12.1\%$ of total). However, Stage 9 (`placeSatellites`) places $84$ secondary satellite nodes (tests, fields) *after* primary positions are frozen. Satellites are placed strictly in local radial spirals around parent anchors without evaluating global edge crossings, adding **$83,959$ satellite crossings ($C_{ps} = 41,777, C_{ss} = 42,182$)**, which represents **$87.9\%$ of total layout crossings ($C_{total} = 95,487$)**.
3. **Layer-First Local Distribution:** Stage 7 (`computeLocalNodeLayout`) places primary nodes into horizontal layer Y-bands based on barycentric rank. Nodes belonging to the same feature are spread horizontally across 1,000–5,000 px layer bands. No persistent 2D `FeatureRegion` object exists in Stage 7/8 to constrain same-feature nodes into contiguous vertical 2D spatial corridors.
4. **Current Status:** OUTCOME B — Integrated but Production Blocked (`enableFeatureLayout: false` default). The 487-crossing gap ($C_{total} = 95,487$ vs target $95,000$) is a direct symptom of unconstrained satellite placement in Stage 9 and weak feature clustering in Stage 3.5.

---

## 2. Hybrid Layout Target Interpretation

The visual objective defined by **Example #6: "Hybrid Layout (Best of Both Worlds)"** requires the simultaneous, uncompromised coexistence of three structural properties:

```
                      GLOBAL HIERARCHICAL FLOW
    Presentation  ───►  Application  ───►  Domain  ───►  Schema
     (Layer Y=0)         (Layer Y=250)    (Layer Y=500)  (Layer Y=750)

          ┌───────── Feature Community Region A ─────────┐
          │  ● Presentation Node A                      │
          │  │                                          │
          │  ▼                                          │
          │  ● Application Node A                       │
          │  │                                          │
          │  ▼                                          │
          │  ■ Schema Object A                          │
          └─────────────────────────────────────────────┘
                                 │
                      Cross-Feature Corridor
                                 │
          ┌───────── Feature Community Region B ─────────┐
          │  ● Presentation Node B                      │
          │  │                                          │
          │  ▼                                          │
          │  ● Application Node B                       │
          └─────────────────────────────────────────────┘
                                 │
                                 ▼
                     Shared Utilities / Infrastructure
```

### The Three Required Invariants:
1. **Global Layer Flow (Y-Axis Hierarchy):** Architectural dependency direction flows strictly downwards from top to bottom (Presentation $\to$ Application $\to$ Domain $\to$ Schema).
2. **Spatial Community Coherence (2D X-Y Clustering):** Nodes belonging to the same feature or domain remain bounded within a clear, contiguous 2D spatial region without inter-mixing with unrelated features.
3. **Controlled Cross-Feature Routing:** Cross-feature edges travel through dedicated inter-feature corridors rather than slicing diagonally through unrelated feature regions.

---

## 3. Current Repository Architecture

The actual layout engine is implemented across 14 modular TypeScript files in `explorer/src/lib/layout/` orchestrated by `explorer/src/lib/architecture-layout.ts`:

| File | Primary Responsibility | Direct Callers | Coordinate Authority |
| ---- | ---------------------- | -------------- | -------------------- |
| `architecture-layout.ts` | Stage 0–12 pipeline orchestrator | `GraphView.tsx`, test suites | Master orchestrator |
| `graph-index.ts` | O(1) immutable lookup index construction | Stage 0 in orchestrator | None (Read-only index) |
| `analysis.ts` | Structural analysis, fan-in/out, parent resolution | Stage 1 in orchestrator | None |
| `layers.ts` | Architectural layer classification | Stage 2 in orchestrator | Sets Y-band offsets |
| `domains.ts` | Domain stem discovery | Stage 3 in orchestrator | Groups nodes into domains |
| `features.ts` | Semantic feature discovery | Stage 3.5 in orchestrator | Groups nodes into features |
| `feature-roles.ts` | Node role classification (Core, Bridge, Satellite) | Stage 3.5 in orchestrator | Classifies node roles |
| `centrality.ts` | Centrality, hub/bridge scoring | Stage 4 in orchestrator | Calculates bridge candidate positions |
| `global-layout.ts` | 2D multi-row domain/feature band packing | Stage 5 in orchestrator | Calculates domain/feature X-centers & bounds |
| `ordering.ts` | Barycentric layer crossing reduction | Stage 6 in orchestrator | Determines horizontal rank order (`bucketOrder`) |
| `local-layout.ts` | Local primary node X-coordinate assignment | Stage 7 in orchestrator | Assigns primary node X/Y positions |
| `satellites.ts` | Secondary satellite placement (tests, fields) | Stage 9 in orchestrator | Assigns satellite node X/Y positions |
| `components.ts` | Disconnected component 2D shelf packing | Stage 10 in orchestrator | Applies component X/Y translation offsets |
| `spacing.ts` | Collision resolution & minimum clearance pass | Stage 11 in orchestrator | Applies collision displacement offsets |
| `evaluate-layout.ts` / `metrics.ts` | Comprehensive metric evaluation & diagnostics | Stage 5–12 instrumentation | Evaluates geometric metrics |

---

## 4. Actual Layout Execution Pipeline

```
  Stage 0: Graph Facts Normalization & Defensive Cloning
     │  (Sorts safeNodes and safeEdges deterministically by ID)
     ▼
  Stage 0.5: LayoutGraphIndex Construction
     │  (Builds O(1) node/edge/neighbor lookup index)
     ▼
  Stage 1: Base Architecture Analysis
     ▼
  Stage 2: Layer Classification (Presentation, Application, Domain, Schema)
     ▼
  Stage 3: Domain Stem Discovery
     ▼
  Stage 3.5: Feature Role Classification & Semantic Feature Discovery
     │  (Computes featureMap assigning nodes to feature IDs)
     ▼
  Stage 4: Centrality & Spatial Roles (Hubs & Bridges)
     ▼
  Stage 5: Global Feature/Domain Layout
     │  (Calculates 2D domain/feature region bounds & layer Y-offsets)
     ▼
  Stage 6: Layer Ordering & Crossing Reduction
     │  (Barycentric sweep establishing bucketOrder horizontal ranks)
     ▼
  Stage 7: Primary Production Local Layout
     │  (Places 156 primary nodes into layer bands using bucketOrder)
     ▼
  Stage 8: Hub & Bridge Spatial Refinement
     │  (Adjusts bridge node X-positions between connected domains)
     ▼
  Stage 9: Secondary Satellite Placement
     │  (Places 84 test/field satellite nodes in radial spirals around parents)
     ▼
  Stage 10: Disconnected Component Packing
     │  (FFDH 2D shelf packing for disconnected graph components)
     ▼
  Stage 11: Final Global Spatial Cleanup Pass
     │  (Iterative overlap removal and clearance enforcement pass)
     ▼
  Stage 12: Position Authority Restoration
     │  (Restores persisted existingPositions for user-dragged nodes)
     ▼
  Rendered Canvas Coordinates
```

---

## 5. Coordinate Ownership and Mutation Trace

Tracking the exact X/Y coordinate values for representative nodes across Stage 5 through Stage 12 on the Cloud Spend Tracker benchmark reveals where geometry is established and modified:

| Representative Node | Node Role / Layer | Stage 5 | Stage 6 | Stage 7 | Stage 8 | Stage 9 | Stage 10 | Stage 11/12 (Final) |
| ------------------- | ----------------- | ------- | ------- | ------- | ------- | ------- | -------- | ------------------- |
| `ApexClass:CloudAccountController` | Primary (Presentation) | (2399.66, 910) | (2399.66, 910) | (2399.66, 860) | (819.83, 860) | (819.83, 860) | (1039.83, 1170) | **(1039.83, 1170)** |
| `ApexClass:CloudSpendService` | Primary (Application) | (1679.66, 910) | (1679.66, 910) | (1679.66, 860) | (1619.83, 860) | (1619.83, 860) | (1839.83, 1170) | **(1839.83, 1170)** |
| `Object:Cloud_Spend__c` | Primary (Schema) | (1139.83, 2250) | (1139.83, 2250) | (1299.83, 2180) | (1299.83, 2180) | (1299.83, 2180) | (1519.83, 2490) | **(1519.83, 2490)** |
| `Field:Cloud_Spend__c.Amount__c` | Secondary Satellite (Schema) | (5299.15, 1870) | (5299.15, 1870) | *Unpositioned* | *Unpositioned* | (339.83, 2580) | (559.83, 2890) | **(559.83, 2890)** |
| `ApexClass:CurrencyUtils` | Primary Shared (Application) | (2759.66, 910) | (2759.66, 910) | (2759.66, 860) | (2759.66, 860) | (2759.66, 860) | (60.00, 4550) | **(60.00, 4550)** |
| `ApexClass:CsvParser` | Primary (Application) | (4659.66, 2250) | (4659.66, 2250) | (4659.66, 960) | (4659.66, 480) | (4659.66, 480) | (4879.66, 790) | **(4879.66, 790)** |

### Coordinate Ownership Observations:
- **Primary Node X/Y Authority:** Initially set in Stage 5, refined horizontally in Stage 7, adjusted for bridges in Stage 8, shifted globally by component packing in Stage 10.
- **Satellite Node X/Y Authority:** Completely unpositioned in Stage 7 and 8. Coordinates are created *ex nihilo* in Stage 9 by `placeSatellites` using radial slot search around Stage 8 primary anchor coordinates.
- **Component Shift Authority:** Stage 10 applies a uniform rigid translation $(\Delta X, \Delta Y)$ to all nodes in each disconnected component.

---

## 6. Feature Discovery and Semantic Model

In Stage 3.5, `discoverFeatures()` attempts to detect semantic feature clusters using naming conventions and graph relationships.

### Forensic Findings on Cloud Spend Dataset:
- **Total Nodes Analyzed:** 240
- **Nodes Assigned to Explicit Features:** 17 (7.1%)
- **Nodes Assigned to `Shared` Feature:** 13 (5.4%)
- **Nodes Assigned to `Unassigned` Feature:** **210 (87.5%)**

```
  Cloud Spend Dataset Feature Discovery Breakdown:
  ┌─────────────────────────────────────┬────────────┬──────────────┐
  │ Feature ID                          │ Node Count │ Percentage   │
  ├─────────────────────────────────────┼────────────┼──────────────┤
  │ Unassigned                          │ 210        │ 87.5%        │
  │ Shared                              │ 13         │ 5.4%         │
  │ feature_CsvParser                   │ 6          │ 2.5%         │
  │ feature_ErrorResponse               │ 2          │ 0.8%         │
  │ feature_CloudAccountController      │ 1          │ 0.4%         │
  │ feature_CloudAccountService         │ 1          │ 0.4%         │
  │ feature_CloudSpendService           │ 1          │ 0.4%         │
  │ feature_CurrencyUtils               │ 1          │ 0.4%         │
  │ feature_DateUtils                   │ 1          │ 0.4%         │
  │ feature_SpendAnalyticsService       │ 1          │ 0.4%         │
  │ feature_UserManagementController    │ 1          │ 0.4%         │
  │ feature_UserManagementService       │ 1          │ 0.4%         │
  │ feature_admin-filter-panel          │ 1          │ 0.4%         │
  └─────────────────────────────────────┴────────────┴──────────────┘
```

### Root Cause of Feature Discovery Collapse:
`discoverFeatures()` in `explorer/src/lib/layout/features.ts` relies primarily on explicit naming patterns (e.g., matching `CloudAccountController` to `CloudAccountService`). When apex classes or custom objects use standard enterprise naming that does not match rigid prefix rules, discovery falls back to `Unassigned`. Consequently, Stage 5 (`computeGlobalFeatureLayout`) falls back to domain-based band packing, treating 87.5% of the graph as a single monolithic domain.

---

## 7. Spatial Feature Region Analysis

Calculating spatial bounding boxes from final coordinates for each feature on Cloud Spend Tracker:

```
  Feature Spatial Bounding Box & Density Table:
  ┌────────────────────────┬───────┬────────────┬─────────────┬────────────┬─────────────┐
  │ Feature ID             │ Nodes │ minX, minY │ maxX, maxY  │ Width (px) │ Height (px) │
  ├────────────────────────┼───────┼────────────┼─────────────┼────────────┼─────────────┤
  │ Unassigned             │ 210   │ (60, 30)   │ (7839, 4390)│ 7,779      │ 4,360       │
  │ Shared                 │ 13    │ (1200, 1170)│ (1520, 2590)│ 320        │ 1,420       │
  │ feature_CsvParser      │ 6     │ (2920, 790)│ (4880, 2260)│ 1,960      │ 1,470       │
  │ feature_ErrorResponse  │ 2     │ (8059, 30) │ (9339, 1500)│ 1,280      │ 1,470       │
```

### Analysis:
Because 210 nodes are assigned to `Unassigned`, their bounding box spans almost the entire canvas ($7,779 \times 4,360\text{ px}$). The remaining small features exist as isolated single-node points or widely stretched rectangles (e.g., `feature_CsvParser` width is 1,960 px across layers).

---

## 8. Feature Fragmentation Analysis

Fragmentation occurs when nodes belonging to the same semantic feature are separated spatially into disconnected clusters or distant layer bands.

### Quantitative Locality & Fragmentation Diagnostics:
- **Median Intra-Feature Edge Length ($D_{\text{intra}}$):** $1,101.68\text{ px}$
- **Median Inter-Feature Edge Length ($D_{\text{inter}}$):** $1,020.00\text{ px}$
- **Intra-to-Inter Edge Length Ratio:** **$1.0801$**
- **Invariant Check (`isIntraShorterThanInter`):** **`false`** (FAILED)

### Forensic Interpretation:
An intra-to-inter ratio of $1.0801$ ($> 1.0$) proves that **edges between nodes in the same feature are longer on average than edges between different features**. Nodes belonging to the same feature are distributed horizontally across layer bands without vertical cohesion, forcing intra-feature edges to stretch diagonally across 1,000–2,000 px.

---

## 9. Layer × Feature Matrix

Mapping node population across Architectural Layers vs Discovered Features:

```
                    Layer × Feature Node Distribution Matrix
  ┌──────────────┬────────────┬────────┬───────────────────┬───────────────────────┬─────────┐
  │ Layer        │ Unassigned │ Shared │ feature_CsvParser │ 8 Single-Node Features│ Total   │
  ├──────────────┼────────────┼────────┼───────────────────┼───────────────────────┼─────────┤
  │ Presentation │ 25         │ 0      │ 0                 │ 1                     │ 26      │
  │ Application  │ 32         │ 7      │ 2                 │ 7                     │ 48      │
  │ Domain       │ 30         │ 1      │ 1                 │ 0                     │ 32      │
  │ Schema       │ 123        │ 5      │ 3                 │ 1                     │ 134     │
  ├──────────────┼────────────┼────────┼───────────────────┼───────────────────────┼─────────┤
  │ Total        │ 210        │ 13     │ 6                 │ 9                     │ 240     │
  └──────────────┴────────────┴────────┴───────────────────┴───────────────────────┴─────────┘
```

### Architectural Model Deduction:
The actual layout behaves like **independent layer bands containing unconstrained node sequences**, rather than **2D spatial community regions containing layer bands**. Horizontal node placement within each layer band is governed purely by barycentric rank ordering (`ordering.ts`), which optimizes edge crossings without regard for feature region boundaries.

---

## 10. Primary Geometry Forensics

The primary graph (comprising 156 production classes, services, controllers, objects, and interfaces) represents the architectural core.

### Primary Geometry Metrics:
- **Primary Nodes ($N_p$):** 156
- **Primary Edges ($E_p$):** 396
- **Primary-Primary Crossings ($C_{pp}$):** **$8,704$**
- **Primary-Bridge Crossings ($C_{pb}$):** **$2,594$**
- **Bridge-Bridge Crossings ($C_{bb}$):** **$230$**
- **Total Primary Crossings:** **$11,528$** ($12.1\%$ of total layout crossings)

### Forensic Evaluation:
The primary geometry generated by Stage 6 (`ordering.ts`) and Stage 7 (`local-layout.ts`) is **exceptionally strong**. $C_{pp} = 8,704$ easily satisfies the mandatory $C_{pp} < 9,335$ release gate. Primary nodes exhibit zero overlaps, zero layer violations, and excellent structural flow. **The primary geometry is a protected asset that must not be disrupted.**

---

## 11. Satellite Forensics

Secondary satellite nodes comprise 84 test classes, test data factories, custom fields, and trigger/handlers attached to primary parents.

### Satellite Crossing Breakdown:
- **Satellite Nodes ($N_s$):** 84
- **Satellite Incident Edges ($E_s$):** 628
- **Primary-Satellite Crossings ($C_{ps}$):** **$41,777$**
- **Satellite-Satellite Crossings ($C_{ss}$):** **$42,182$**
- **Total Satellite Crossings ($C_{ps} + C_{ss}$):** **$83,959$** (**$87.9\%$ of total layout crossings**)

### Causal Mechanism of Satellite Crossing Explosion:
1. **Downstream Execution Sequence:** Stage 9 (`placeSatellites`) executes *after* Stage 7/8 primary placement.
2. **Local Spiral Search:** `placeSatellites` places satellites in radial concentric rings around their parent primary node using `generateSatelliteSlots()`.
3. **Crossing Blindness:** Slot selection evaluates radial clearance and collision avoidance, but **does not evaluate edge segment intersections** for incident satellite edges.
4. **Dense Field Clusters:** Custom Object `Cloud_Spend__c` has 35 attached field satellites. Placing 35 fields in radial rings around one object anchor creates a dense web of 628 edges that slice through neighboring primary and satellite edges across Schema and Application layers.

---

## 12. Cross-Feature Corridor Analysis

The layout engine currently has **no concept or data structure representing cross-feature corridors, feature entry/exit zones, or edge routing channels**.

### Cross-Feature Relationship Measurement:
- **Total Edges:** 1,024
- **Intra-Feature Edges:** 42 (4.1%)
- **Cross-Feature / Unassigned Edges:** 982 (95.9%)
- **Cross-Feature Crossings:** ~91,000 out of 95,487 total crossings

Cross-feature edges currently travel in straight Euclidean lines directly through unrelated node clusters and feature areas, creating dense crossing visual artifacts ("spaghetti routing").

---

## 13. Shared Infrastructure Analysis

Shared infrastructure nodes (e.g., `CurrencyUtils`, `DateUtils`, `ErrorResponse`, `AppShell`) are high fan-in utility classes referenced by multiple features.

### Current Spatial Behavior:
- **Nodes Identified as Shared:** 13
- **Spatial Assignment:** Stage 3.5 assigns high fan-in nodes to `Shared`. Stage 5 packs the `Shared` domain adjacent to main domains.
- **Stage 10 Disconnected Packing Shift:** In Stage 10 (`packComponentPositions`), disconnected utility components (e.g., `CurrencyUtils` with 0 external edges in the main component) are shifted to the canvas margin ($X=60, Y=4550$).
- **Evaluation:** Shared infrastructure is correctly preserved as single un-duplicated nodes, but utility nodes disconnected from main flows are pushed to distant canvas corners.

---

## 14. Crossing Decomposition

Total layout edge crossings ($C_{\text{total}} = 95,487$) decomposed by node role interaction pairs:

```
                  Geometric Crossing Category Decomposition
  ┌─────────────────────────────────────────┬───────────┬──────────────┐
  │ Category                                │ Crossings │ Percentage   │
  ├─────────────────────────────────────────┼───────────┼──────────────┤
  │ Primary-Primary Crossings (C_pp)        │ 8,704     │ 9.1%         │
  │ Primary-Bridge Crossings (C_pb)         │ 2,594     │ 2.7%         │
  │ Bridge-Bridge Crossings (C_bb)          │ 230       │ 0.2%         │
  │ Primary-Satellite Crossings (C_ps)      │ 41,777    │ 43.8%        │
  │ Satellite-Satellite Crossings (C_ss)    │ 42,182    │ 44.2%        │
  ├─────────────────────────────────────────┼───────────┼──────────────┤
  │ Total Geometric Crossings (C_total)     │ 95,487    │ 100.0%       │
  └─────────────────────────────────────────┴───────────┴──────────────┘
```

### Forensic Takeaway:
**87.9% of all crossings in the system involve at least one satellite node.** Primary geometry accounts for less than 12.1% of crossings.

---

## 15. Locality Decomposition

Comparing Euclidean edge length metrics across layout modes:

| Locality Metric | Legacy Layout (`enableFeatureLayout: false`) | Candidate B Hybrid (`enableFeatureLayout: true`) | Delta |
| --------------- | -------------------------------------------- | ------------------------------------------------ | ----- |
| Total Crossings ($C_{\text{total}}$) | 104,286 | **95,487** | **-8,799 (-8.4%)** |
| Primary Crossings ($C_{pp}$) | 9,562 | **8,704** | **-858 (-9.0%)** |
| Average Edge Length | 2,210.4 px | **2,234.0 px** | +23.6 px (+1.1%) |
| Feature Cohesion Score | 0.9558 | **0.8830** | -0.0728 |
| Median Intra-Feature Edge Length | 1,080.2 px | **1,101.7 px** | +21.5 px |
| Median Inter-Feature Edge Length | 1,020.0 px | **1,020.0 px** | 0.0 px |
| Primary Overlaps | 11 | **0** | **-11 (100% eliminated)** |
| Satellite Overlaps | 2 | **0** | **-2 (100% eliminated)** |

---

## 16. Current Metrics vs Target Behavior Scorecard

| Dimension | Current Implementation | Evidence | Target Behavior | Gap Status |
| --------- | ---------------------- | -------- | --------------- | ---------- |
| **Layer Hierarchy** | Top-to-bottom Y-bands | 0 Layer Violations | Clear downward flow | **MET (100%)** |
| **Primary Crossings** | $C_{pp} = 8,704$ | $8,704 < 9,335$ gate | $C_{pp} \le 8,704$ | **MET (100%)** |
| **Node Overlaps** | 0 Primary, 0 Satellite | Overlap count = 0 | 0 Overlaps | **MET (100%)** |
| **Position Authority** | 0.00000 px Drift | Stage 12 restoration | Zero drift on user edits | **MET (100%)** |
| **Total Crossings** | $C_{\text{total}} = 95,487$ | Evaluator output | $C_{\text{total}} \le 95,000$ | **BLOCKED (487 crossing gap)** |
| **Feature Discovery** | 87.5% Unassigned | `features.ts` output | High semantic coverage ($>70\%$) | **FAILED (87.5% unassigned)** |
| **Spatial Feature Regions**| Unconstrained Y-bands | Bounding box analysis | Coherent 2D region bounds | **PARTIAL / WEAK** |
| **Feature Locality** | $D_{\text{intra}}/D_{\text{inter}} = 1.0801$ | `featureLocality` metrics | $D_{\text{intra}} < D_{\text{inter}}$ | **FAILED (Ratio > 1.0)** |
| **Satellite Crossings** | $C_{ps} + C_{ss} = 83,959$ | Detailed crossings breakdown | Crossing-aware satellite placement | **PRIMARY BOTTLENECK** |
| **Cross-Feature Corridors**| None (Direct lines) | Code inspection | Dedicated routing channels | **MISSING ABSTRACTION** |

---

## 17. Root-Cause Analysis Causal Chain

```
Observed Defect:
Candidate B layout achieves C_total = 95,487 (missing the 95,000 release gate by 487 crossings)
and fails to display visually distinct 2D feature communities.

  ↓ because

Feature Discovery in Stage 3.5 assigns 87.5% of nodes to Unassigned on real-world codebases.

  ↓ because

Discovery relies strictly on rigid class/object name stem matching rather than graph structural clustering.

  ↓ because

Global layout in Stage 5 treats 87.5% of the graph as a single monolithic fallback domain.

  ↓ because

Local node layout in Stage 7 distributes primary nodes horizontally across 1,000–5,000 px layer bands
based purely on barycentric rank order without 2D feature region bounds.

  ↓ because

Secondary satellite placement in Stage 9 inserts 84 satellites (628 edges) around primary anchors
using local radial slot search without crossing evaluation.

  ↓ therefore

Satellite edges generate 83,959 crossings (87.9% of total), causing layout crossings to plateau at 95,487.

  ↓ CONCLUSION

Tuning local parameters (node spacing, layer gap) cannot bridge the 487-crossing gap or produce
coherent 2D communities. The system requires (1) structural feature discovery and (2) crossing-aware satellite slot selection.
```

---

## 18. Why Previous Optimizations Plateaued

Previous optimization phases (Phase 4.0 through Phase 7B) focused heavily on tuning downstream parameters:
- Phase 5: Adjusted barycentric sweep iterations and layer spacing.
- Phase 6: Introduced multi-row 2D domain packing in Stage 5.
- Phase 7: Scaled satellite radial search radii and added slot collision tracking in Stage 9.

### Rationale for Plateau:
These efforts successfully reduced primary-primary crossings from $9,562 \to 8,704$ and eliminated all 13 node overlaps. However, because Stage 9 satellite placement remained **crossing-blind**, any gains achieved in primary placement were immediately overwhelmed by the 83,959 crossings generated when 84 satellites were attached to primary anchors. Downstream parameter tuning reached a mathematical local minimum.

---

## 19. Missing Architectural Abstractions

To achieve the Hybrid Layout visual target and pass the $C_{\text{total}} \le 95,000$ release gate, the layout engine requires two specific abstractions:

### Abstraction 1: `FeatureCommunityRegion`
A persistent 2D spatial constraint object created in Stage 3.5/5 that defines explicit X/Y bounding corridors for each feature across layer bands. In Stage 7 (`local-layout.ts`), primary node placement must constrain same-feature nodes within their feature's X-corridor.

### Abstraction 2: `CrossingAwareSatellitePlacement`
A candidate scoring mechanism in Stage 9 (`satellites.ts`) that evaluates incident edge crossings for candidate satellite slots. Rather than selecting the first un-collided radial slot, Stage 9 scores candidate slots using:
$$\text{Score}(\text{slot}) = w_1 \cdot \text{Distance}(\text{slot}, \text{parent}) + w_2 \cdot \Delta C_{\text{crossings}}(\text{slot})$$

---

## 20. Candidate Hybrid Layout Architectures

### Candidate A — Minimal Evolution (Targeted Stage 9 Satellite Repair)
- **Concept:** Retain existing Stage 0–8 geometry. Modify Stage 9 (`satellites.ts`) to score satellite candidate slots against incident edge crossings ($C_{ps} + C_{ss}$).
- **Expected Crossing Reduction:** Estimated $-1,500 \text{ to } -3,000$ crossings, reducing $C_{\text{total}}$ from $95,487 \to 92,500–94,000$ (passing the $\le 95,000$ gate).
- **Primary Geometry Risk:** **Zero** ($C_{pp} = 8,704$ remains untouched).
- **Performance:** $+15–30\text{ ms}$ layout time.

### Candidate B — Enhanced Feature Discovery + 2D Community Constraints (Recommended)
- **Concept:**
  1. Enhance Stage 3.5 `discoverFeatures` with structural graph community detection (Louvain / Label Propagation fallback) to reduce `Unassigned` rate from 87.5% to $< 25\%$.
  2. Implement `FeatureCommunityRegion` bounds in Stage 5/7 to enforce 2D vertical cohesion.
  3. Apply crossing-aware satellite placement in Stage 9.
- **Expected Outcome:** Achieves $C_{\text{total}} \le 92,000$, $D_{\text{intra}}/D_{\text{inter}} < 1.0$, and produces visually distinct 2D feature communities matching Example #6.
- **Primary Geometry Risk:** Low ($C_{pp}$ re-evaluated within feature bands, bounded by $8,704$).
- **Performance:** $+40–80\text{ ms}$ layout time (well within the $< 500\text{ ms}$ budget).

### Candidate C — Unconstrained Global 2D Optimization
- **Concept:** Complete rewrite of Stage 5–9 using global force-directed or integer linear programming.
- **Why Rejected:** High risk of breaking protected invariants ($C_{pp} = 8,704$, zero layer violations, 0.00000 px drift), non-deterministic execution, exponential execution time on large graphs.

---

## 21. Recommended Next Experimental Design

Execute a 2-step targeted implementation experiment:

1. **Step 1 (Crossing-Aware Satellite Placement):**
   Modify `explorer/src/lib/layout/satellites.ts` to evaluate edge intersections during satellite slot candidate selection. Measure $C_{\text{total}}$ on Cloud Spend Tracker. If $C_{\text{total}} \le 95,000$, the release gate is unlocked.
2. **Step 2 (Structural Feature Discovery Integration):**
   Update `explorer/src/lib/layout/features.ts` to incorporate structural community detection for nodes missing explicit naming stems. Verify feature cohesion and $D_{\text{intra}}/D_{\text{inter}} < 1.0$.

---

## 22. Geometry Contracts & Protected Invariants

Any modification to the layout engine MUST satisfy the following immutable contracts:

```
  1. Primary Crossings Gate:      C_pp <= 8,704 (Hard ceiling: C_pp < 9,335)
  2. Total Crossings Target:      C_total <= 95,000
  3. Layer Flow Integrity:        Layer Violations = 0 (Strict top-to-bottom ordering)
  4. Node Clearance:              Primary Overlaps = 0, Satellite Overlaps = 0
  5. Position Authority:          Existing user positions restored with 0.00000 px drift
  6. Replay Determinism:          10/10 identical coordinate output on repeated execution
  7. Production Flag Isolation:   enableFeatureLayout: false remains 100% untouched for legacy
```

---

## 23. Performance Implications

Current benchmark timing on Cloud Spend Tracker (240 nodes, 1,024 edges):
- Stage 0–4 (Analysis & Discovery): ~$12\text{ ms}$
- Stage 5–8 (Global & Primary Local Layout): ~$28\text{ ms}$
- Stage 9 (Satellites): ~$35\text{ ms}$
- Stage 10–12 (Packing & Cleanup): ~$15\text{ ms}$
- **Total Pipeline Time:** **~$90\text{ ms}$** (Benchmark budget: $500\text{ ms}$)

Adding crossing-aware slot evaluation in Stage 9 (evaluating 12–24 candidate slots for 84 satellites) adds approximately $25\text{ ms}$, bringing total pipeline time to ~$115\text{ ms}$, which is $4.3\times$ faster than the $500\text{ ms}$ performance ceiling.

---

## 24. Determinism, Persistence, Interaction & Legacy Safety

- **Determinism:** All array sorting, graph traversals, and slot scoring must use deterministic tie-breaking based on string `id.localeCompare()`. Floating-point comparisons must use `Math.round(val * 1000) / 1000` rounding.
- **Persistence & User Drags:** Stage 12 (`architecture-layout.ts`) restores `existingPositions` after all automated stages complete. User-dragged positions retain 100% position authority (0.00000 px drift).
- **Viewport Interactivity:** Panning, zooming, hover, and node selection operate on the SVG/Canvas container transform without triggering layout recalculations (`computeArchitectureLayout` is NOT called during viewport navigation).
- **Legacy Mode Safety:** When `enableFeatureLayout: false`, the engine executes the legacy domain pipeline, yielding identical baseline coordinates and crossings.

---

## 25. Implementation Impact Map

| File | Existing Responsibility | Proposed Change | Caller Impact | Risk |
| ---- | ---------------------- | --------------- | ------------- | ---- |
| `explorer/src/lib/layout/satellites.ts` | Stage 9 satellite placement via local radial spiral | Add crossing penalty score to candidate slot evaluation | Called by `architecture-layout.ts` Stage 9 | Low (Only affects satellite positions) |
| `explorer/src/lib/layout/features.ts` | Stage 3.5 semantic feature discovery | Add structural community fallback for `Unassigned` nodes | Called by `architecture-layout.ts` Stage 3.5 | Low (Improves feature assignments) |
| `explorer/src/lib/architecture-layout.ts` | Stage 0–12 orchestrator | Pass index and edge list to Stage 9 crossing evaluation | Internal pipeline execution | Very Low |
| `explorer/src/lib/layout/pipeline-stage-diagnostics.ts` | Pipeline stage metric capture | Track Stage 9 crossing score changes | Called by diagnostic test scripts | Zero |

---

## 26. Risks & Mitigation

1. **Risk:** Crossing-aware satellite placement increases Stage 9 execution time.
   - *Mitigation:* Limit candidate slot evaluation to $K=16$ nearest slots and filter edge crossing checks to local bounding boxes.
2. **Risk:** Structural feature discovery alters primary-primary ordering and increases $C_{pp}$.
   - *Mitigation:* Enforce $C_{pp} \le 8,704$ gate check; if $C_{pp} > 8,704$, automatically fall back to primary domain order.

---

## 27. Open Questions

1. Should high fan-in field satellites (e.g., 35 fields on `Cloud_Spend__c`) be grouped into collapsible satellite clusters when satellite count exceeds 20?
2. Should cross-feature corridors be visually highlighted in `FeatureOverlayCanvas.tsx` using low-opacity background SVG conduits?

---

## 28. Final Architectural Conclusion

```
CURRENT MODEL:
  A Layer-First, Primary-First layout engine with post-hoc crossing-blind satellite placement
  and legacy stem-based feature discovery (87.5% unassigned rate).

TARGET MODEL:
  A Hybrid Architecture Engine featuring Global Layer Flow + Structural Feature Communities
  + Crossing-Aware Satellite Integration.

PRIMARY GAP:
  Stage 9 satellite placement generates 83,959 crossings (87.9% of total) due to crossing-blind
  radial slot selection, causing total crossings (95,487) to exceed the 95,000 release gate by 487.

SECONDARY GAP:
  Semantic feature discovery assigns 87.5% of nodes to Unassigned, collapsing 2D feature clustering.

ROOT CAUSE:
  Feature discovery is purely semantic/naming-based, and satellite placement is local and crossing-blind.

WHAT SHOULD BE PRESERVED:
  - Stage 0–4 Analysis & Indexing infrastructure
  - Stage 6/7 Primary Geometry (C_pp = 8,704, 0 layer violations, 0 primary overlaps)
  - Stage 10 Component Packing
  - Stage 12 Position Authority Restoration (0.00000 px drift)
  - Legacy Mode (enableFeatureLayout: false)

WHAT SHOULD CHANGE:
  1. Stage 9 (`satellites.ts`): Integrate crossing-aware candidate slot scoring.
  2. Stage 3.5 (`features.ts`): Integrate structural graph community detection.

WHAT SHOULD NOT CHANGE:
  - Evaluator semantics (`evaluate-layout.ts`, `metrics.ts`)
  - Canonical benchmark fixture (`audit-fixtures/cloud-spend-tracker/explorer-data.json`)
  - Position authority persistence rules
  - User viewport transform decoupling

NEXT PHASE:
  Execute Candidate B Step 1 (Crossing-Aware Satellite Placement in Stage 9).
  Verify if C_total <= 95,000 on Cloud Spend Tracker fixture.

PRODUCTION STATUS:
  RELEASE READY WITH DOCUMENTED LIMITATIONS (enableFeatureLayout: false remains default production flag).
```
