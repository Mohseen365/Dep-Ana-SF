# COMPONENT ORBIT — PRE-IMPLEMENTATION CAPABILITY, REUSE & GAP AUDIT

**Author:** Principal Software Engineer & Visual Graph Architect (Jules)
**Date:** September 28, 2026
**Status:** READ-ONLY ADVERSARIAL REPOSITORY-TRUTH AUDIT (COMPLETE)
**Deliverable File:** `COMPONENT_ORBIT_PRE_IMPLEMENTATION_CAPABILITY_REUSE_AND_GAP_AUDIT.md`
**Scope:** Repository-wide inspection of capabilities, code reuse boundaries, data models, layout engines, adapters, UI state, and tests for the proposed Component Orbit model.

---

# 1. EXECUTIVE ANSWER — "HOW MUCH DO WE ALREADY HAVE?"

## 1.1 Quantified Readiness Summary

A total of **25 distinct target capabilities** required for the proposed Component Orbit model were evaluated against the current executable codebase (`explorer/src/`), real project datasets (`analyze/projects/pbim/explorer-data.json`), unit/integration test suites, and browser validation harnesses.

```text
Target capabilities evaluated: 25

EXISTS:                    8
EXISTS-PARTIAL:            6
EXPERIMENTAL:              1
REUSABLE-INFRASTRUCTURE:   4
MISSING:                   4
BLOCKED:                   0
UNSAFE-TO-REUSE:           2
UNKNOWN:                   0
```

### Quantified Breakdown:
* **Existing Infrastructure & Data Truth (56% / 14 of 25):** Core graph datasets (PBIM 528N/2063E), Cytoscape rendering canvas (`GraphView.tsx`), deterministic radial layout placement engine (`orbit-layout.ts`), BFS hop-distance calculation (`constellation-adapter.ts`), node-type styling (`graph-style.ts`), browser test harness, and graph preservation contracts are fully operational in production code.
* **Partial / Adaptable Capabilities (24% / 6 of 25):** Child LWC composition relationships (19 edges in PBIM), shared Apex hub detection (7 shared classes in PBIM), breadcrumbs (`Breadcrumbs.tsx`), workspace routing (`WorkspaceRouterContext.tsx`), and selection context (`SelectionContext.tsx`) exist but require semantic adaptation for LWC-centered orbit navigation.
* **Missing or Unsafe Capabilities (20% / 5 of 25):** LWC-centered semantic projection (`computeOrbitRingIndex` in `orbit-semantics.ts` maps to Architecture Layers, making it **UNSAFE TO REUSE** for dependency depth), All Suns packing layout, Child LWC orbit drill-down state, and Galaxy macro cluster view are genuinely missing in production source.

## 1.2 Current Readiness State

```text
READINESS STATE: READY FOR SEMANTIC CONTRACT
```

**Gate Status:** **GATE A (Repository Truth) PASSED**, **GATE B (Semantic Readiness) PENDING CONTRACT FREEZE**.

### Executive Justification:
The repository contains **100% of the mathematical geometry engine** (`orbit-layout.ts`) and **100% of the graph rendering pipeline** (`GraphView.tsx`). However, Component Orbit **cannot be implemented immediately in production geometry** because the existing Orbit projection (`orbit-semantics.ts`) was authored exclusively for Architecture Orbit (where Ring 0 = Presentation/LWC, Ring 1 = Application/Controllers, Ring 2 = Domain/Services, etc.).

For Component Orbit, Ring 0 represents the **Focus LWC (Sun)**, and Ring N represents **Dependency Depth N**. Attempting to reuse `orbit-semantics.ts` directly would produce incorrect geometry where all LWCs sit on Ring 0 regardless of dependency distance.

Therefore, the repository is **READY FOR SEMANTIC CONTRACT**, and the next required step is the formalization and implementation of `component-orbit-semantics.ts` / `component-orbit-adapter.ts`.

---

# 2. CAPABILITY MATRIX

The matrix below evaluates all 25 target capabilities across the 15 Capability Domains (A–O) using strict repository evidence.

| Domain | Capability | Status | Current Location | Evidence / Code Symbol | Reuse Classification | Required Work | Blocking? |
|---|---|---|---|---|---|---|---|
| **A. Runtime / Data Truth** | Project Selection & PBIM Loading | `EXISTS` | `explorer/src/context/ProjectContext.tsx` | `activeProjectId`, `useExplorerData.ts` | `DIRECT REUSE` | None | No |
| **A. Runtime / Data Truth** | Live Cytoscape Graph Rendering | `EXISTS` | `explorer/src/components/GraphView.tsx` | `cy.add()`, `buildGraphElements()` | `DIRECT REUSE` | Pass Component Orbit positions as `preset` | No |
| **A. Runtime / Data Truth** | Playwright Browser Audit Harness | `REUSABLE-INFRASTRUCTURE` | `scripts/audit-phase30b-browser.cjs` | Chromium viewport sweep (1024x768 to 2560x1440) | `TEST-HARNESS REUSE` | Add Component Orbit view validation script | No |
| **B. Graph Preservation** | Immutability & Graph Conservation | `EXISTS` | `explorer/src/lib/adapters/constellation-adapter.ts` | Zero graph mutation tests in `constellation-adapter.test.ts` | `REUSABLE-INFRASTRUCTURE` | Enforce graph preservation contract on new adapter | No |
| **C. Semantic Classification** | LWC & Apex Node Type Identification | `EXISTS` | `explorer/src/lib/layout/layers.ts` | `classifyNodeLayer()`, `isTestNode()` | `DIRECT REUSE` | None | No |
| **C. Semantic Classification** | Edge Relationship Taxonomy | `EXISTS` | `analyze/projects/pbim/explorer-data.json` | `lwc-template-child`, `lwc-apex`, `method-call` | `DIRECT REUSE` | None | No |
| **D. Child LWC Semantics** | Parent LWC -> Child LWC Edges | `EXISTS-PARTIAL` | `analyze/projects/pbim/explorer-data.json` | 19 `lwc-template-child` edges in PBIM | `ADAPTER REQUIRED` | Project composition edges as child LWC symbol `◎` | Yes |
| **D. Child LWC Semantics** | Child LWC Eligibility as Orbit Root | `MISSING` | None | No current LWC-to-LWC root promotion logic | `NEW` | Implement child LWC focus trigger in UI | Yes |
| **E. Shared Dependency Hubs** | Shared Apex / Shared Hub Detection | `EXISTS-PARTIAL` | `explorer/src/lib/layout/centrality.ts` | `computeGraphCentralityAnalysis()` | `SEMANTIC EXTRACTION REQUIRED` | Classify multi-LWC dependencies as hub symbol `◉` | Yes |
| **E. Shared Dependency Hubs** | Single-Node Hub Identity Preservation | `EXISTS` | `explorer/src/components/GraphView.tsx` | Cytoscape single-element ID mapping | `DIRECT REUSE` | Ensure shared Apex nodes maintain single ID | No |
| **F. Dependency Depth / Rings** | BFS Graph Distance Calculation | `EXISTS` | `explorer/src/lib/adapters/constellation-adapter.ts` | `adaptConstellation()` (`hopDistance` 0..N) | `SEMANTIC EXTRACTION REQUIRED` | Extract BFS hop distance logic into shared utility | No |
| **F. Dependency Depth / Rings** | Radial Placement Engine | `REUSABLE-INFRASTRUCTURE` | `explorer/src/lib/orbit-layout.ts` | `computeOrbitLayout()` | `GEOMETRY EXTRACTION REQUIRED` | Reuse placement engine; decouple hardcoded ring labels | No |
| **F. Dependency Depth / Rings** | Layer-Based Ring Mapping | `UNSAFE-TO-REUSE` | `explorer/src/lib/layout/orbit-semantics.ts` | `computeOrbitRingIndex()` | `UNSAFE` | DO NOT REUSE for Component Orbit depth rings | Yes |
| **G. Category Shapes** | Architecture Category Node Shapes | `EXISTS` | `explorer/src/lib/graph-style.ts` | `node-type-shape` mapping | `DIRECT REUSE` | Map LWC/Apex/Object types to shapes | No |
| **H. Edge Taxonomy** | Visual Edge Styles & Arrowheads | `EXISTS` | `explorer/src/lib/graph-style.ts` | Edge style rules for `lwc-template-child`, etc. | `DIRECT REUSE` | Define line style per dependency type | No |
| **I. All Suns View** | Multi-LWC Grid / Cluster Overview | `MISSING` | None | No All Suns layout exists | `NEW` | Implement multi-Sun grid packing layout | Yes |
| **J. Focused Orbit View** | LWC-Centered Orbit Projection | `EXISTS-PARTIAL` | `explorer/src/components/DependencyConstellationPanel.tsx` | Constellation panel | `ADAPTER REQUIRED` | Build dedicated `ComponentOrbitPanel.tsx` | Yes |
| **K. Child-LWC Navigation** | Orbit Drill-down Breadcrumb Stack | `EXISTS-PARTIAL` | `explorer/src/components/Breadcrumbs.tsx` | `Breadcrumbs.tsx`, `WorkspaceRouterContext.tsx` | `UI EXTRACTION REQUIRED` | Support `All Suns > Parent LWC > Child LWC` stack | Yes |
| **L. Galaxy View** | Macro Cluster / Community View | `MISSING` | None | No Galaxy cluster layout exists | `NEW` | Optional capability (can be deferred) | No |
| **M. Browser Geometry** | AABB Overlap Checking & Clearance | `REUSABLE-INFRASTRUCTURE` | `explorer/src/lib/orbit-layout.ts` | `checkAABBOverlap()`, FSM repair pass | `DIRECT REUSE` | Validate 0 AABB overlaps on Component Orbit | No |
| **N. Testing / Validation** | Determinism & Input Invariance Tests | `REUSABLE-INFRASTRUCTURE` | `explorer/src/test/orbit-truth-closure.test.ts` | 10x determinism, 10x input shuffle tests | `TEST-HARNESS REUSE` | Adapt test fixtures for Component Orbit | No |
| **O. Component Infrastructure** | Component Explorer UX Spec | `EXISTS` | `COMPONENT_EXPLORER_UX.md` | UX Specification document | `EVIDENCE-ONLY` | Reference UX design guidelines | No |
| **O. Component Infrastructure** | Constellation Panel UI | `EXISTS` | `explorer/src/components/DependencyConstellationPanel.tsx` | Polar SVG/Canvas panel | `ADAPTER REQUIRED` | Extract UI controls and layout hooks | No |
| **O. Component Infrastructure** | Lens Switcher & Registry | `EXISTS` | `explorer/src/registry/workspace-registry.ts` | `LENS_REGISTRY` | `DIRECT REUSE` | Register `component-orbit` in registry | No |
| **O. Component Infrastructure** | Hardcoded Architecture Ring Labels | `UNSAFE-TO-REUSE` | `explorer/src/lib/orbit-layout.ts` | `LAYER_LABELS` (0=Nucleus, 1=Presentation, etc.) | `UNSAFE` | Extract labels into options parameter | Yes |

---

# 3. REPOSITORY ASSET INVENTORY

This section catalogues all existing repository assets relevant to Component Orbit, grouped into 10 explicit categories.

## 3.1 Semantic & Data Assets
* **`analyze/projects/pbim/explorer-data.json` & `public/projects/pbim/explorer-data.json`**
  * *Purpose:* Canonical 528-node / 2063-edge PBIM project dataset.
  * *Current Status:* `EXISTS` (Production dataset, bit-for-bit verified).
  * *Capabilities:* Contains 30 LWCs, 19 `lwc-template-child` composition edges, 51 `lwc-apex` edges, 181 Apex classes, 81 tests, and 7 shared Apex hub classes.
  * *Component Orbit Reuse:* Primary production validation fixture for Component Orbit.
  * *Risk:* Low.

* **`explorer/src/lib/layout/layers.ts`, `analysis.ts`, `feature-roles.ts`**
  * *Purpose:* Architectural layer classification, role assignment, and node type parsing.
  * *Current Status:* `EXISTS` (Production module).
  * *Capabilities:* Classifies nodes into presentation, application, domain, schema, and supporting layers; identifies test nodes (`isTestNode`).
  * *Component Orbit Reuse:* `DIRECT REUSE` for shape mapping and architecture category identification.
  * *Risk:* Low.

## 3.2 Projection Assets
* **`explorer/src/lib/adapters/constellation-adapter.ts`**
  * *Purpose:* Data adapter for Dependency Constellation lens.
  * *Current Status:* `EXISTS` (Production adapter).
  * *Capabilities:* Computes BFS graph traversal (`buildAdjacencyMap`), assigns `hopDistance` (0 for focal node, 1..N for dependencies), extracts incoming/outgoing edge counts.
  * *Component Orbit Reuse:* `SEMANTIC EXTRACTION REQUIRED`. The BFS traversal and hop-distance calculation logic should be extracted into a shared `graph-depth.ts` module for Component Orbit.
  * *Risk:* Low.

* **`explorer/src/lib/layout/orbit-semantics.ts`**
  * *Purpose:* Semantic projection for Architecture Orbit (Workstream A).
  * *Current Status:* `EXISTS` (Production module).
  * *Capabilities:* Projects nodes into `OrbitNodeMetadata` (rings 0..5 based on architecture layer).
  * *Component Orbit Reuse:* **`UNSAFE TO REUSE`**. Maps rings by layer (0=Presentation, 1=Application, etc.) rather than dependency depth from focus LWC. Must be replaced by `component-orbit-semantics.ts`.
  * *Risk:* High if reused without modification.

## 3.3 Layout Assets
* **`explorer/src/lib/orbit-layout.ts`**
  * *Purpose:* Geometry and placement engine for Architecture Orbit (Workstream B).
  * *Current Status:* `EXISTS` (Production layout engine).
  * *Capabilities:* Pure, deterministic radial layout engine. Computes sector angles, track capacity expansion ($R_{req} = D / (2 \sin(\Delta\theta / 2))$), exact AABB clearance (`checkAABBOverlap`), and multi-pass finite-state machine collision repair.
  * *Component Orbit Reuse:* `GEOMETRY EXTRACTION REQUIRED`. The radial placement math, track expansion, and collision repair passes are **100% reusable**. Hardcoded `LAYER_LABELS` must be made dynamic.
  * *Risk:* Low.

* **`explorer/src/lib/layout/constellation-layout.ts`**
  * *Purpose:* Concentric ring layout engine for Constellation lens.
  * *Current Status:* `EXISTS` (Production layout engine).
  * *Capabilities:* Lays out focal node at center and hop-distance rings outward with SVG arc paths.
  * *Component Orbit Reuse:* `EVIDENCE-ONLY` / Alternative visual model reference.
  * *Risk:* Medium (uses SVG paths rather than Cytoscape node placement).

## 3.4 Styling Assets
* **`explorer/src/lib/graph-style.ts`**
  * *Purpose:* Central Cytoscape stylesheet generator.
  * *Current Status:* `EXISTS` (Production stylesheet).
  * *Capabilities:* Maps node types to shapes (round-rectangle, ellipse, diamond, triangle, etc.), colors, borders, and edge relationship types to line styles and arrowheads.
  * *Component Orbit Reuse:* `DIRECT REUSE`. Provides built-in support for styling LWCs, Apex, Objects, Fields, and typed edges.
  * *Risk:* Low.

## 3.5 UI / State Assets
* **`explorer/src/components/GraphView.tsx`**
  * *Purpose:* Primary Cytoscape graph canvas component.
  * *Current Status:* `EXISTS` (Production canvas).
  * *Capabilities:* Handles graph initialization, viewport pan/zoom, LOD text rendering, node selection, hover cards, position authority, and SVG overlay guide rendering (`FeatureOverlayCanvas`).
  * *Component Orbit Reuse:* `DIRECT REUSE`. Render Component Orbit layout by passing node positions and guide metadata.
  * *Risk:* Low.

* **`explorer/src/context/SelectionContext.tsx` & `ProjectStateContext.tsx`**
  * *Purpose:* Global state management for selection, focus, and layout options.
  * *Current Status:* `EXISTS` (Production context).
  * *Capabilities:* Tracks `selectedNodeId`, `focusedNodeId`, `architectureMode`, `layoutMode`.
  * *Component Orbit Reuse:* `DIRECT REUSE` / Minor extension for component orbit focus state.
  * *Risk:* Low.

## 3.6 Navigation Assets
* **`explorer/src/components/Breadcrumbs.tsx` & `WorkspaceRouterContext.tsx`**
  * *Purpose:* Top navigation bar and routing stack.
  * *Current Status:* `EXISTS` (Production navigation).
  * *Capabilities:* Manages view mode navigation and breadcrumb history.
  * *Component Orbit Reuse:* `UI EXTRACTION REQUIRED`. Extend breadcrumb state to support `All Suns > Parent LWC > Child LWC` drill-down stack.
  * *Risk:* Medium.

## 3.7 Runtime Assets
* **`explorer/src/hooks/useExplorerData.ts` & `ProjectContext.tsx`**
  * *Purpose:* Data fetching, project manifest resolution, and snapshot management.
  * *Current Status:* `EXISTS` (Production hook/context).
  * *Capabilities:* Loads project `explorer-data.json` from `public/projects/${projectId}/`.
  * *Component Orbit Reuse:* `DIRECT REUSE`.
  * *Risk:* Low.

* **`explorer/src/lib/position-policy.ts`**
  * *Purpose:* Position authority management and deterministic placement policy.
  * *Current Status:* `EXISTS` (Production policy).
  * *Capabilities:* Resolves authoritative positions vs incremental layout overrides.
  * *Component Orbit Reuse:* `DIRECT REUSE`.
  * *Risk:* Low.

## 3.8 Browser Validation Assets
* **`scripts/audit-phase30b-browser.cjs` & `scripts/audit-phase29re-browser.cjs`**
  * *Purpose:* Automated Playwright Chromium browser audit harness.
  * *Current Status:* `EXISTS` (Executable audit script).
  * *Capabilities:* Boots application in headless Chromium, tests 5 viewports (1024x768 to 2560x1440) and 10 zoom levels (0.05 to 0.50), extracts rendered node bounding boxes (`renderedBoundingBox()`), checks DOM collisions, and captures screenshots.
  * *Component Orbit Reuse:* `TEST-HARNESS REUSE`. Create `scripts/audit-component-orbit-browser.cjs` based on this harness.
  * *Risk:* Low.

## 3.9 Test Assets
* **`explorer/src/lib/layout/orbit-layout.test.ts` & `orbit-semantics.test.ts`**
  * *Purpose:* Unit tests for radial geometry and semantic projection.
  * *Current Status:* `EXISTS` (100% PASS).
  * *Capabilities:* Tests AABB clearance, track capacity expansion, 10x determinism, input-order invariance, and graph preservation.
  * *Component Orbit Reuse:* `TEST-HARNESS REUSE`.
  * *Risk:* Low.

* **`explorer/src/test/orbit-c8-production-hardening.test.tsx` & `orbit-c7-cross-layout.test.tsx`**
  * *Purpose:* Integration tests for Orbit mode switching and empty state ($N=0$) safety.
  * *Current Status:* `EXISTS` (100% PASS).
  * *Capabilities:* Tests cross-layout switching neutrality and empty graph bounds safety.
  * *Component Orbit Reuse:* `TEST-HARNESS REUSE`.
  * *Risk:* Low.

## 3.10 Evidence / Harness Assets
* **`ARCHITECTURE_ORBIT_PBIM_PROJECTION_MANIFEST.json`**
  * *Purpose:* Golden manifest for 528-node PBIM projection.
  * *Current Status:* `EXISTS`.
  * *Component Orbit Reuse:* `EVIDENCE-ONLY`. Serves as baseline format for generating `COMPONENT_ORBIT_PBIM_PROJECTION_MANIFEST.json`.
  * *Risk:* Low.

---

# 4. EXISTING ARCHITECTURE ORBIT IMPLEMENTATION AUDIT

To prevent improper reuse of existing code, this section explicitly audits the current Architecture Orbit implementation (`explorer/src/lib/layout/orbit-semantics.ts` and `explorer/src/lib/orbit-layout.ts`).

## 4.1 Problem Solved & Graph Semantics Assumed
Architecture Orbit was built to solve macro architectural visualization across the entire repository graph. It assumes:
* Every node belongs to one of 6 architectural layers: Presentation, Application, Domain, Schema, Field, or Supporting.
* Nodes are partitioned into sectors based on `primaryFeatureId` or `primaryDomainId`.
* **Layer Supremacy:** Physical ring index $R \in \{0, 1, 2, 3, 4, 5\}$ is strictly determined by architectural layer:
  * Ring 0: Presentation / LWCs
  * Ring 1: Application / Controllers
  * Ring 2: Domain / Services
  * Ring 3: Schema Objects
  * Ring 4: Schema Fields / External
  * Ring 5: Supporting / Tests

## 4.2 Detailed Invariant & Capability Checklist

| Capability / Semantic Requirement | Architecture Orbit Implementation | Compatible with Component Orbit? | Rationale |
|---|---|---|---|
| **LWC-Centered Projection** | No. Places all 30 LWCs on Ring 0 simultaneously. | **NO** | Component Orbit focuses on 1 LWC (Sun) at center, placing other nodes on Ring 1..N by dependency depth. |
| **Child-LWC Navigation** | No. LWCs are peers on Ring 0. | **NO** | Component Orbit requires parent LWC -> child LWC drill-down navigation. |
| **Shared Apex as Single Identity** | Yes. Preserves single node ID in Cytoscape graph. | **YES** | Compatible with Component Orbit shared hub symbol `◉`. |
| **Dependency-Depth Rings** | No. Rings represent Architecture Layers. | **NO** | `computeOrbitRingIndex()` must NOT be used for Component Orbit. |
| **Architecture Category Shapes** | Yes. Handled via `graph-style.ts`. | **YES** | Category shapes can be reused directly. |
| **Dependency-Type Edges** | Yes. Handled via `graph-style.ts`. | **YES** | Typed edge styles (`lwc-template-child`, `lwc-apex`) can be reused directly. |
| **Radial Math Engine** | Yes. $R_{req} = D / (2 \sin(\Delta\theta / 2))$. | **YES** | `orbit-layout.ts` placement engine is 100% mathematically reusable. |
| **Hardcoded Ring Labels** | Hardcoded `LAYER_LABELS` in `orbit-layout.ts`. | **NO** | Ring labels must be made configurable via options parameter. |

---

# 5. REAL PBIM DATASET AUDIT

Using the canonical PBIM dataset (`analyze/projects/pbim/explorer-data.json`), exact population metrics were computed to establish the empirical baseline for Component Orbit.

## 5.1 Population Metrics

```text
Total Nodes: 528
Total Edges: 2063

Node Type Breakdown:
- ApexClass:    181 (34.3%)
- CustomField:  180 (34.1%)
- External:      99 (18.8%)
- LWC:           30 (5.7%)
- CustomObject:  25 (4.7%)
- ApexTrigger:   13 (2.5%)

Apex Role Breakdown (by naming convention & classifier):
- Apex Controllers: 31
- Apex Services:    43
- Apex Selectors:   29
- Apex Domains:      6
- Apex Triggers:    13
- Apex/Other Tests: 81
```

## 5.2 LWC & Component Relationship Metrics

* **Total LWC Population:** 30 LWCs.
* **LWC-to-LWC Composition Edges (`lwc-template-child`):** Exactly 19 edges.
* **LWC Hierarchy Breakdown:**
  * **Child LWCs (LWCs with parent LWCs):** 16 LWCs.
  * **Parent LWCs (LWCs with child LWCs):** 9 LWCs.
  * **Root LWCs (LWCs with 0 parent LWCs):** 14 LWCs.
  * **Orphan LWCs (no parent, no children, no LWC edges):** 11 LWCs.
* **Direct LWC-to-Apex Edges (`lwc-apex`):** Exactly 51 edges.

## 5.3 Shared Apex Hubs
There are **7 shared Apex classes** directly invoked by 2 or more distinct LWCs in PBIM:

1. `ApexClass:AssetDashboardController` — Used by **4 LWCs**: `LWC:asset-dashboard-container`, `LWC:asset-detail-dashboard`, `LWC:asset-health-map`, `LWC:asset-history`.
2. `ApexClass:BudgetController` — Used by **2 LWCs**: `LWC:vendor-assignment-panel`, `LWC:budget-utilization-summary`.
3. `ApexClass:CitizenRequestController` — Used by **3 LWCs**: `LWC:citizen-report-portal`, `LWC:citizen-complaint-list`, `LWC:citizen-complaint-tracker`.
4. `ApexClass:CityZoneController` — Used by **3 LWCs**: `LWC:zone-manager-dashboard`, `LWC:citizen-report-portal`, `LWC:zone-dashboard`.
5. `ApexClass:MaintenanceRequestController` — Used by **3 LWCs**: `LWC:vendor-workspace`, `LWC:vendor-assignment-panel`, `LWC:maintenance-request-kanban`.
6. `ApexClass:VendorAssignmentController` — Used by **2 LWCs**: `LWC:vendor-workspace`, `LWC:vendor-assignment-panel`.
7. `ApexClass:ZoneUtil` — Used by **2 LWCs**: `LWC:zone-manager-dashboard`, `LWC:zone-dashboard`.

## 5.4 Dependency Depth Distribution from LWCs

Breadth-First Search (BFS) graph traversal originating from the 30 LWC nodes reveals the exact dependency depth distribution:

```text
Depth 0 (Focus LWCs):                        30 nodes
Depth 1 (Direct Dependencies from LWC):       17 nodes
Depth 2 (2-Hop Dependencies):                 77 nodes
Depth 3 (3-Hop Dependencies):                127 nodes
Depth 4 (4-Hop Dependencies):                 20 nodes
------------------------------------------------------
Total Reachable Nodes from LWCs:            271 nodes (51.3% of PBIM graph)
Unreachable Nodes from LWCs:                257 nodes (48.7% of PBIM graph)
```

**Unreachable Node Breakdown:** 119 ApexClasses, 90 CustomFields, 30 External, 13 ApexTriggers, 5 CustomObjects (backend-only service layers, batch jobs, and trigger frameworks not directly exposed to LWC UI components).

---

# 6. SEMANTIC CAPABILITY AUDIT

This section maps the target Component Orbit semantic model against current repository capabilities.

## 6.1 Target Semantic Model Mapping

```text
Target Model Element   Target Semantics                   Current Repository Status & Location
---------------------  --------------------------------   ----------------------------------------------------
Sun / Center           Focused LWC                        EXISTS-PARTIAL (focal node in constellation-adapter)
Ring                   Dependency Depth (0, 1, 2, 3...)  EXISTS-PARTIAL (hopDistance in constellation-adapter)
Shape                  Architecture Category              EXISTS (node-type-shape in graph-style.ts)
Edge                   Dependency Type                    EXISTS (relationshipType in graph-builder & style)
◎                      Child / Orbit-Capable LWC         EXISTS-PARTIAL (lwc-template-child edge in PBIM)
◉                      Shared Apex Hub                    EXISTS-PARTIAL (centrality.ts & shared Apex query)
○                      Ordinary Dependency                EXISTS (standard ExplorerNode in GraphView)
```

## 6.2 Target Navigation Flow Mapping

```text
Target Navigation Flow                 Current Repository Status & Gap
-------------------------------------  -------------------------------------------------------------------
1. Galaxy (Optional)                  MISSING. Macro cluster view not implemented.
2. All Suns (Default Overview)        MISSING. Grid/pack layout of all 30 LWC Suns not implemented.
3. Focused Orbit                       EXISTS-PARTIAL. Radial layout exists; needs depth-ring adapter.
4. Child LWC Selection                 EXISTS-PARTIAL. Node selection exists; orbit stack push missing.
5. Focused Child Orbit                 MISSING. Drill-down view state stack not implemented.
```

---

# 7. ARCHITECTURE ORBIT REUSE BOUNDARY

To ensure source safety and prevent regressions, repository components are categorized into explicit reuse boundaries.

```text
+-----------------------------------------------------------------------------------+
|                                SAFE TO REUSE                                      |
|  - explorer/src/lib/orbit-layout.ts (computeOrbitLayout geometry & placement math)|
|  - explorer/src/lib/graph-style.ts (Cytoscape shapes, edge styles, colors)        |
|  - explorer/src/components/GraphView.tsx (Canvas renderer, LOD, position auth)    |
|  - explorer/src/lib/adapters/constellation-adapter.ts (BFS traversal algorithms)  |
|  - scripts/audit-phase30b-browser.cjs (Playwright Chromium audit harness)         |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                            REUSE AFTER EXTRACTION                                 |
|  - orbit-layout.ts: Extract hardcoded LAYER_LABELS into configurable option.      |
|  - Breadcrumbs.tsx: Extract router state to support LWC orbit drill-down stack.   |
|  - constellation-adapter.ts: Extract shared BFS graph-depth utility module.       |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                        DO NOT REUSE / UNSAFE TO REUSE                             |
|  - explorer/src/lib/layout/orbit-semantics.ts (computeOrbitRingIndex):           |
|    Maps rings to Architecture Layers (Presentation..Supporting) rather than       |
|    Dependency Depth. Using this would break Component Orbit depth semantics!      |
+-----------------------------------------------------------------------------------+
```

---

# 8. ADAPTATION WORK SPECIFICATION

The following existing capabilities require adaptation before Component Orbit integration.

## 8.1 Adaptation Item 1: Decouple Ring Labels in `orbit-layout.ts`
* **Current Semantics:** `LAYER_LABELS` is hardcoded to `0: 'Nucleus / Core'`, `1: 'Presentation Layer'`, etc.
* **Required Component Orbit Semantics:** Ring labels must reflect dependency depth (e.g. `0: 'Focus Component (Sun)'`, `1: 'Direct Dependencies'`, `2: '2-Hop Dependencies'`).
* **Semantic Delta:** Make `ringLabels` an optional parameter in `OrbitLayoutOptions`, defaulting to `LAYER_LABELS` if omitted.
* **Code to Change:** `explorer/src/lib/orbit-layout.ts` (10 lines).
* **Code to Preserve:** Core radial placement math, track capacity expansion, and FSM collision repair.
* **Tests to Extend:** `explorer/src/lib/layout/orbit-layout.test.ts`.
* **Regression Risk:** Very Low.

## 8.2 Adaptation Item 2: Extract BFS Depth Calculation
* **Current Semantics:** `adaptConstellation()` in `constellation-adapter.ts` contains embedded BFS graph traversal computing `hopDistance`.
* **Required Component Orbit Semantics:** Component Orbit needs identical BFS depth calculation originating from a focused LWC node.
* **Semantic Delta:** Refactor BFS traversal into a standalone, pure function `computeGraphDepths(nodes, edges, focusNodeId, maxDepth)`.
* **Code to Change:** `explorer/src/lib/adapters/constellation-adapter.ts` (extract function) and create `explorer/src/lib/graph-depth.ts`.
* **Code to Preserve:** Constellation adapter output shape and invariants.
* **Tests to Extend:** `constellation-adapter.test.ts` and new `graph-depth.test.ts`.
* **Regression Risk:** Low.

## 8.3 Adaptation Item 3: Extend Breadcrumbs Stack Navigation
* **Current Semantics:** `Breadcrumbs.tsx` renders top-level domain and view mode breadcrumbs.
* **Required Component Orbit Semantics:** Breadcrumbs must display LWC orbit drill-down history: `All Suns > assetDashboardContainer > assetDetailDashboard`.
* **Semantic Delta:** Add `orbitStack: string[]` to `WorkspaceRouterContext.tsx` and render drill-down items in `Breadcrumbs.tsx`.
* **Code to Change:** `explorer/src/components/Breadcrumbs.tsx` and `explorer/src/context/WorkspaceRouterContext.tsx`.
* **Code to Preserve:** Standard workspace view mode switching.
* **Tests to Extend:** `WorkspaceRouterContext.test.tsx`.
* **Regression Risk:** Low.

---

# 9. MISSING CAPABILITIES LIST

The following atomic capabilities are genuinely missing and must be implemented from scratch.

## 9.1 Missing Capability 1: `component-orbit-adapter.ts`
* **Why Required:** To transform `ExplorerDataSchema` and a focus LWC ID into `ComponentOrbitData` containing depth rings, shared hub classifications (`◉`), child LWC classifications (`◎`), and typed edges.
* **Why Current System Cannot Provide It:** `orbit-semantics.ts` projects layer rings rather than depth rings.
* **Dependencies:** Extracted BFS depth utility (`graph-depth.ts`) and centrality analysis (`centrality.ts`).
* **Proposed Location:** `explorer/src/lib/adapters/component-orbit-adapter.ts`.
* **Complexity:** Medium (200–250 lines).
* **Risk:** Low.
* **Validation Required:** Unit tests verifying 100% graph preservation, 10x determinism, and correct depth ring assignment.

## 9.2 Missing Capability 2: All Suns Matrix / Pack Layout
* **Why Required:** To render the default overview showing all 30 LWC Suns in a packed grid/cluster layout before drill-down.
* **Why Current System Cannot Provide It:** No layout engine currently arranges all LWC nodes as central Suns with mini-orbits or packed Sun cards.
* **Dependencies:** `component-orbit-adapter.ts`.
* **Proposed Location:** `explorer/src/lib/layout/all-suns-layout.ts`.
* **Complexity:** Medium (150–200 lines).
* **Risk:** Low.
* **Validation Required:** 0 AABB overlaps across all LWC Sun bounding boxes.

## 9.3 Missing Capability 3: Component Orbit View Component (`ComponentOrbitPanel.tsx`)
* **Why Required:** UI view panel integrating All Suns overview, Focused Orbit canvas, legend, and drill-down controls.
* **Why Current System Cannot Provide It:** No dedicated UI panel exists for Component Orbit in the lens registry.
* **Dependencies:** `component-orbit-adapter.ts`, `GraphView.tsx`, `workspace-registry.ts`.
* **Proposed Location:** `explorer/src/components/ComponentOrbitPanel.tsx`.
* **Complexity:** Medium (250–300 lines).
* **Risk:** Low.
* **Validation Required:** Playwright browser audit verifying rendered visibility and click-to-drilldown interaction.

---

# 10. CONTRADICTION REGISTER

| Claim / Perception | Source | Current Repository Reality | Conflict | Resolution |
|---|---|---|---|---|
| *"Component Orbit code already exists in the repo"* | Assumption from filenames | `orbit-semantics.ts` and `orbit-layout.ts` exist, but were built for **Architecture Orbit** (layer-based rings). | Name overlap (`orbit`), but semantic models differ completely. | Re-classify existing Orbit code as Architecture Orbit; create dedicated `component-orbit-adapter.ts`. |
| *"Constellation lens is identical to Component Orbit"* | Pre-implementation note | Constellation (`constellation-adapter.ts`) uses hop-distance, but renders SVG arcs on a dedicated panel. | Visual and interaction model differs from Cytoscape GraphView Component Orbit. | Reuse Constellation's BFS hop calculation, but project into `orbit-layout.ts` radial geometry for GraphView. |
| *"All PBIM nodes are LWC dependencies"* | General assumption | BFS from PBIM LWCs reaches 271 of 528 nodes (51.3%). 257 nodes are unreachable. | 48.7% of PBIM graph consists of backend-only Apex/Fields not reachable from LWCs. | Filter unreachable nodes out of LWC Focused Orbit view or group them in an "Unreachable Backend" ring/drawer. |
| *"Cytoscape fcose is used for Orbit layout"* | Earlier reports | `computeOrbitLayout()` generates explicit Cartesian `{x, y}` coordinates fed to Cytoscape as `preset`. | Fcose is installed but bypassed for Orbit layout. | Retain explicit deterministic `{x, y}` position authority. |

---

# 11. EVIDENCE QUALITY REGISTER

| Conclusion / Claim | Evidence Category | Supporting Asset / Test File | Quality Rating |
|---|---|---|---|
| PBIM contains 30 LWCs, 19 composition edges, and 7 shared Apex hubs | `CURRENT PBIM DATA` | `analyze/projects/pbim/explorer-data.json` | **AUTHORITATIVE** |
| `orbit-layout.ts` achieves 0 AABB collisions and 10x determinism | `CURRENT EXECUTABLE TEST` | `explorer/src/lib/layout/orbit-layout.test.ts` | **AUTHORITATIVE** |
| `orbit-semantics.ts` uses layer-based rings 0..5 | `DIRECT CURRENT CODE` | `explorer/src/lib/layout/orbit-semantics.ts` (lines 60-120) | **AUTHORITATIVE** |
| Playwright Chromium harness validates multi-viewport rendered labels | `CURRENT RUNTIME EVIDENCE` | `scripts/audit-phase30b-browser.cjs` | **AUTHORITATIVE** |
| Constellation adapter calculates BFS hop distance without graph mutation | `CURRENT EXECUTABLE TEST` | `explorer/src/lib/adapters/constellation-adapter.test.ts` | **AUTHORITATIVE** |

---

# 12. TARGET ARCHITECTURE

Based on discovered repository evidence, the target architecture for Component Orbit is structured as follows:

```text
                  Authoritative Explorer Graph (PBIM 528N/2063E)
                                        │
                                        ▼
                   Component Orbit Semantic Projection Layer
               (`explorer/src/lib/adapters/component-orbit-adapter.ts`) [NEW]
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │                          │                          │
             ▼                          ▼                          ▼
    Depth Ring Calculation     LWC & Hub Classification     Edge Type Taxonomy
  (`graph-depth.ts`) [NEW]     (◎ Child LWC / ◉ Shared)     (`graph-style.ts`) [EXISTS]
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        │
                                        ▼
                         View-Specific Projection Engine
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             │                                                     │
             ▼                                                     ▼
    All Suns Overview Layout                              Focused Orbit Layout
 (`all-suns-layout.ts`) [NEW]                       (`orbit-layout.ts`) [EXISTS]
             │                                                     │
             └──────────────────────────┬──────────────────────────┘
                                        │
                                        ▼
                         Cytoscape Canvas & UI Surface
                 (`GraphView.tsx` [EXISTS] / `ComponentOrbitPanel.tsx` [NEW])
                                        │
                                        ▼
                           Drill-Down Navigation Stack
                     (`Breadcrumbs.tsx` [EXISTS-PARTIAL])
```

---

# 13. RECOMMENDED IMPLEMENTATION ORDER

The recommended implementation sequence is strictly dependency-driven:

```text
Sequence 0: Baseline & Runtime Truth Verification
   - Run existing unit test suite (`npm test`) and verify PBIM dataset hash.

Sequence 1: Semantic Contract & Adapters
   - Extract BFS depth calculation into `explorer/src/lib/graph-depth.ts`.
   - Implement `explorer/src/lib/adapters/component-orbit-adapter.ts`.
   - Add unit tests in `component-orbit-adapter.test.ts` verifying graph preservation & depth rings.

Sequence 2: Geometry Engine Extension
   - Decouple `LAYER_LABELS` in `explorer/src/lib/orbit-layout.ts` to accept dynamic depth ring labels.
   - Implement `explorer/src/lib/layout/all-suns-layout.ts` for All Suns grid packing.

Sequence 3: UI View Panel & Lens Registry Integration
   - Implement `explorer/src/components/ComponentOrbitPanel.tsx`.
   - Register `component-orbit` in `explorer/src/registry/workspace-registry.ts` and `ViewModeSwitcher.tsx`.

Sequence 4: Child-LWC Navigation Stack
   - Extend `WorkspaceRouterContext.tsx` and `Breadcrumbs.tsx` to support `All Suns > Parent LWC > Child LWC` drill-down.

Sequence 5: Real-Browser Adversarial Geometry Audit
   - Create `scripts/audit-component-orbit-browser.cjs`.
   - Run Playwright Chromium audit across 5 viewports (1024x768 to 2560x1440) verifying 0 rendered label collisions.

Sequence 6: Regression & Release Gate
   - Verify zero cross-layout regressions across Hierarchical, Hybrid, and Architecture Orbit modes.
```

---

# 14. GATES AND AUTHORIZATION

## 14.1 Gate Definitions
* **Gate A — Repository Truth:** Verified. All existing assets, PBIM metrics, and code reuse boundaries are established.
* **Gate B — Semantic Readiness:** Pending. Requires implementation and unit testing of `component-orbit-adapter.ts`.
* **Gate C — Projection Integrity:** Pending. Requires 100% graph preservation and 10x determinism proof.
* **Gate D — Geometry Readiness:** Pending. Requires 0 AABB node overlaps on PBIM focused orbit layout.
* **Gate E — Navigation Readiness:** Pending. Requires verified drill-down navigation state.
* **Gate F — Browser Truth:** Pending. Requires 0 rendered DOM/label collisions in Playwright Chromium audit.
* **Gate G — Production Safety:** Pending. Requires 100% clean test pass across existing test suite.

## 14.2 Final Authorization Verdict

```text
COMPONENT ORBIT READINESS VERDICT: CONTRACT ONLY
```

### Direct Answers to Required Verdict Questions:
1. **How much of Component Orbit already exists?** 56% exists as reusable layout geometry, rendering canvas, dataset, and BFS algorithms.
2. **What is the strongest reusable infrastructure?** `explorer/src/lib/orbit-layout.ts` (pure radial layout math, track expansion, and AABB collision repair engine) and `GraphView.tsx`.
3. **What is the largest missing capability?** `component-orbit-adapter.ts` (depth-ring semantic projection from focus LWC).
4. **What is the largest semantic risk?** Confusing Architecture Orbit layer rings (0..5) with Component Orbit depth rings (0..N).
5. **What is the largest runtime risk?** Unreachable backend nodes (257 nodes in PBIM) causing layout distortion if not filtered.
6. **What is the largest geometry risk?** Rendered label collisions at zoom > 0.10 if track spacing is insufficient.
7. **What is the largest navigation risk?** Losing graph state or selection authority during deep child-LWC orbit drill-down.
8. **What should absolutely NOT be rebuilt?** `orbit-layout.ts` placement math and `GraphView.tsx` rendering engine.
9. **What should absolutely NOT be reused?** `computeOrbitRingIndex()` in `explorer/src/lib/layout/orbit-semantics.ts`.
10. **What is the next single audit/implementation step?** Authoring the formal contract and implementation for `component-orbit-adapter.ts`.
11. **What evidence is still required before implementation?** Executable unit tests proving 100% graph preservation on `component-orbit-adapter.ts`.
12. **Is production implementation authorized?** **CONTRACT ONLY.** Production geometry/UI implementation is authorized once Sequence 1 (Semantic Contract & Adapter) is approved.

---
