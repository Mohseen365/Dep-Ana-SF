# FEATURE CLUSTER BASELINE AUDIT
**Repository:** `dependency-analyzer`
**Commit Inspected:** `5e93faa553835c390fb641a8e570356f8e9678f0`
**Date:** September 2024
**Audit Purpose:** Comprehensive forensic analysis of existing repository documentation, source code, data pipelines, layout algorithms, Position Authority, Static Mode, persistence, and test infrastructure prior to Feature Cluster layout design and implementation.

---

## 1. Executive Summary

This forensic audit establishes an authoritative baseline of the `dependency-analyzer` repository and its frontend application (`explorer/`). Prior waves (Waves 1 through 12) established a multi-tier deterministic architecture layout pipeline, Position Authority policy, project isolation mechanism, and Cytoscape visualization engine.

Key baseline facts:
1. **Zero Production Code Changes:** No production code, layout logic, contracts, or UI components were modified during this forensic audit.
2. **Current Layout Entry Point:** `computeArchitectureLayout` in `explorer/src/lib/architecture-layout.ts`, invoked via `getLayoutOptions` in `explorer/src/lib/graph-layout.ts`.
3. **Current Position Authority:** `resolveNodePosition` in `explorer/src/lib/position-policy.ts` enforces the strict precedence: `USER > PERSISTED > EXISTING CYTOSCAPE > INTELLIGENT LAYOUT > FALLBACK`.
4. **Current Static Mode Entry Point:** `isStaticMode` in `explorer/src/components/GraphView.tsx` (using `useViewState.ts` / `layoutMode`), which prevents automatic layout repositioning on filter, focus, or investigation triggers.
5. **Persistence & Isolation:** `projectState.ts` and `ProjectContext.tsx` maintain project-scoped positions in `localStorage` under `sf-dep-explorer-project-state:<projectId>`.
6. **Documentation Health:** 117 root `.md` files were audited. While early architectural documents (e.g. `EXPLORER_ARCHITECTURE.md`) describe earlier 1D layout concepts, later wave reports (Waves 7A–12) accurately reflect the current 2D multi-tier domain packing, dynamic layer geometry, and Position Authority pipeline.

---

## 2. Repository Architecture

The project consists of two core subsystems:
1. **Root Node.js Static Analysis Engine:**
   - `dependency-analyzer.cjs`: Sole engine for static dependency extraction from Salesforce source metadata (`force-app/main/default`). Outputs `analyze/dependency-report.json`.
   - `scripts/export-explorer.cjs`: Data adapter converting analyzer output into `explorer-data.json` following `explorer-contract.ts`.
   - `architecture-*.cjs`: Suite of modular analytical tools (health, smells, gates, diff, profile).

2. **Explorer UI Subsystem (`explorer/`):**
   - **Framework:** React 18, TypeScript, Vite, Cytoscape.js.
   - **Data Entry:** `useExplorerData.ts` fetches `explorer-data.json` (or project-specific `projects/<id>/explorer-data.json`).
   - **State Orchestration:** `ProjectContext.tsx` (active project, project data, persisted state), `SelectionContext.tsx`, `useViewState.ts` (view mode, filter, focus, depth, direction, layout mode).
   - **Graph Rendering:** `GraphView.tsx` manages Cytoscape.js canvas, layout runs, element drag handlers, hover cards, and selection sync.
   - **Deterministic Layout Engine:** `explorer/src/lib/architecture-layout.ts` and modular drivers in `explorer/src/lib/layout/*`.

```text
Salesforce Source Repository (force-app/main/default)
                    │
                    ▼
          dependency-analyzer.cjs (Static Analysis Engine)
                    │
                    ▼
          Analyzer Output Artifacts (analyze/dependency-report.json)
                    │
                    ▼
          scripts/export-explorer.cjs (Explorer Data Adapter)
                    │
                    ▼
          explorer-data.json (Stable View-Model Contract)
                    │
                    ▼
          React + TypeScript + Vite + Cytoscape.js (Explorer UI)
```

---

## 3. Root Markdown Documentation Inventory

An audit of all 117 `.md` files in the repository root categorizes them as follows:

| File Category | Total Count | Representative Files | Status |
| :--- | :---: | :--- | :--- |
| **Wave Audit & Repair Reports** | 43 | `WAVE7A_PERFORMANCE_FIX_REPORT.md`, `WAVE7A_RUNTIME_POSITION_AUTHORITY_AUDIT.md`, `WAVE7B_ARCHITECTURE_LAYOUT_AUDIT.md`, `WAVE7B_LARGE_SCALE_PERFORMANCE_REPORT.md`, `WAVE8_FINAL_RELEASE_CLOSURE.md`, `WAVE_10B_2D_DOMAIN_LAYOUT_REPORT.md`, `WAVE_10D_GEOMETRY_AND_SATELLITE_REPAIR_REPORT.md`, `WAVE_10E_PRIMARY_CROSSING_FORENSIC_REPAIR_REPORT.md`, `WAVE_11_FILTER_FORENSIC_AUDIT.md`, `WAVE_12_INITIAL_LAYOUT_FORENSIC_AUDIT.md` | **AUTHORITATIVE / CURRENT** (Reflects Wave 1-12 production state) |
| **Final Release & Freeze Audits** | 13 | `FINAL_LAYOUT_CALL_GRAPH.md`, `FINAL_PERSISTENCE_AUDIT.md`, `FINAL_FILTER_FOCUS_AUDIT.md`, `FINAL_INTEGRATION_FREEZE_AUDIT.md`, `FINAL_PROJECT_ISOLATION_COMPARE_AUDIT.md`, `FINAL_RELEASE_FORENSIC_AUDIT.md` | **AUTHORITATIVE** |
| **Master Architecture & Plans** | 7 | `ARCHITECTURE_INTELLIGENCE_MASTER_PLAN.md`, `ARCHITECTURE_LAYOUT_IMPLEMENTATION_PLAN.md`, `EXPLORER_ARCHITECTURE.md`, `LAYOUT_BASELINE_AUDIT.md` | **MIXED** (Plans describe intent; implementation evolved in Wave 7-10) |
| **Contracts & Interfaces** | 8 | `EXPLORER_CONTRACT.md`, `ARCHITECTURE_INTELLIGENCE_CONTRACT.md`, `DA-2.1-CONTRACT-HARDENING.md`, `DIFF_CONTRACT.md`, `GRAPH_FILE_OWNERSHIP.md`, `UI_FILE_OWNERSHIP.md` | **CURRENT CONTRACTS** |
| **UX & Feature Guidelines** | 22 | `ANALYSIS_HISTORY_UX.md`, `COMPONENT_EXPLORER_UX.md`, `INSPECTOR_UX.md`, `PROJECT_DASHBOARD_UX.md`, `UI_DESIGN_SYSTEM.md` | **CURRENT UI GUIDELINES** |
| **Spatial & Baseline Reports** | 17 | `SPATIAL_BASELINE.md`, `SPATIAL_DISTANCE_AUDIT.md`, `GRAPH_RUNTIME_BASELINE.md`, `GRAPH_STATE_BASELINE.md`, `GRAPH_TEST_BASELINE.md` | **HISTORICAL BASELINES** |
| **Other / Tool Reports** | 8 | `README.md`, `dependency-report.md`, `dependency-summary.md`, `unresolved-references.md` | **CURRENT** |

---

## 4. Historical Project Context Extracted from Markdown

Synthesis of historical context from key audit documents:
- **Wave 1–4 Layout Foundations:** Introduced layer classification (`layers.ts`), domain stem discovery (`domains.ts`), 1D domain placement, bridge placement (`centrality.ts`), satellite micro-clusters (`satellites.ts`), and 2D shelf component packing (`components.ts`).
- **Wave 5 Adversarial & Static Mode Hardening:** Formalized `WAVE5_STATIC_MODE_TRIGGER_MATRIX.md`, establishing that filter, focus, depth, and investigation changes must NEVER move existing nodes in Static Layout Mode.
- **Wave 6 Performance Profiling:** Identified $O(N \cdot E)$ graph traversal overhead in layer calculation (`calculatePrimaryLayerRowCounts`). Resolved in Wave 7A by memoizing intermediate architecture analysis (`computeArchitectureAnalysis`).
- **Wave 7 Runtime Position Authority:** `WAVE7A_RUNTIME_POSITION_AUTHORITY_AUDIT.md` and `WAVE8A_RUNTIME_POSITION_AUTHORITY_IMPLEMENTATION.md` established `position-policy.ts` as the single authority for node coordinates.
- **Wave 10 Multi-Row 2D Domain Packing:** `WAVE_10B_2D_DOMAIN_LAYOUT_REPORT.md` replaced linear 1D domain layout with dynamic multi-row 2D domain packing for large graphs ($\ge 25$ domains or width $> 5000\text{px}$).
- **Wave 11 & 12 Audits:** `WAVE_11_FILTER_FORENSIC_AUDIT.md` and `WAVE_12_INITIAL_LAYOUT_FORENSIC_AUDIT.md` confirmed layout stability across filter transitions and cold initial load.

---

## 5. Documentation → Current Code Verification

| Documentation Claim | Source MD Document | Current Code Evidence | Verification Status |
| :--- | :--- | :--- | :--- |
| **Position Precedence:** `USER > PERSISTED > EXISTING CYTOSCAPE > INTELLIGENT > FALLBACK` | `WAVE7A_RUNTIME_POSITION_AUTHORITY_AUDIT.md` | `resolveNodePosition()` in `explorer/src/lib/position-policy.ts` | **CONFIRMED** |
| **Static Mode:** Existing nodes do not move on filter/focus changes | `WAVE5_STATIC_MODE_TRIGGER_MATRIX.md` | `GraphView.tsx` checks `layoutMode === 'static'` before invoking layout | **CONFIRMED** |
| **2D Domain Layout:** Graphs with $\ge 25$ domains or width $> 5000\text{px}$ pack in 2D | `WAVE_10B_2D_DOMAIN_LAYOUT_REPORT.md` | `computeGlobalDomainLayout()` in `explorer/src/lib/layout/global-layout.ts` | **CONFIRMED** |
| **Satellite Exclusion:** Satellites (tests, fields) are excluded from primary layer/domain calculations | `WAVE3B_SATELLITE_OPTIMIZATION_REPORT.md` | `placeSatellites()` in `explorer/src/lib/layout/satellites.ts` & `architecture-layout.ts` Stage 8/9 | **CONFIRMED** |
| **Project State Isolation:** Positions are scoped by `projectId` in `localStorage` | `FINAL_PERSISTENCE_AUDIT.md` | `loadProjectState()` / `saveProjectState()` in `explorer/src/lib/projectState.ts` | **CONFIRMED** |
| **Initial Layout:** Unpositioned nodes use intelligent layout; positioned nodes are preserved | `WAVE_12_INITIAL_LAYOUT_FORENSIC_AUDIT.md` | `getLayoutOptions()` in `explorer/src/lib/graph-layout.ts` passing `existingPositions` | **CONFIRMED** |

---

## 6. Graph Data Flow

The lifecycle of graph data in the Explorer frontend follows a unidirectional transformation pipeline:

```text
RAW ANALYZER DATA (analyze/dependency-report.json)
        │
        ▼ (scripts/export-explorer.cjs)
EXPLORER DATA CONTRACT (explorer-data.json)
        │
        ▼ (explorer/src/hooks/useExplorerData.ts)
REACT PROJECT CONTEXT (ProjectContext.tsx)
        │
        ▼ (explorer/src/hooks/useViewState.ts & focus-graph.ts)
VISUAL SUBGRAPH SELECTION (Filtered Nodes & Edges)
        │
        ▼ (explorer/src/lib/graph-layout.ts -> architecture-layout.ts)
DETERMINISTIC POSITION CALCULATION
        │
        ▼ (explorer/src/lib/position-policy.ts)
POSITION AUTHORITY RESOLUTION (USER > PERSISTED > EXISTING > INTELLIGENT > FALLBACK)
        │
        ▼ (explorer/src/components/GraphView.tsx)
CYTOSCAPE CANVAL ELEMENT RENDERING
```

### Transformation Details:
1. **Raw Analyzer Data:** Array of raw component objects and relationship edge objects.
2. **Export Adapter:** Normalizes IDs (`ApexClass:Foo`), calculates risk scores, extracts behavior signals, and produces `ExplorerData`.
3. **`useExplorerData.ts`:** Fetches JSON, validates schema version (`1.0.0`), populates `ProjectContext`.
4. **Subgraph Filtering (`focus-graph.ts` / `search-filter.ts`):** Filters visible nodes based on search queries, metadata type toggles, risk toggles, and focus depth/direction without mutating underlying graph arrays.
5. **Layout Orchestration (`architecture-layout.ts`):** Calculates layout coordinates deterministically for unpositioned nodes.
6. **Position Authority (`position-policy.ts`):** Merges calculated positions with user drag overrides and `localStorage` saved positions.
7. **Cytoscape Sync (`GraphView.tsx`):** Applies positions to canvas node elements via `cy.batch()`.

---

## 7. Current Layout Pipeline

The public layout entry point is `computeArchitectureLayout` in `explorer/src/lib/architecture-layout.ts`, called via `getLayoutOptions` in `explorer/src/lib/graph-layout.ts`.

### Pipeline Stage Breakdown:

| Stage # | Stage Name | Implementation Module & Function | Purpose & Action |
| :---: | :--- | :--- | :--- |
| **0** | **Facts Normalization** | `architecture-layout.ts` | Defensive deep-clone of `nodes` and `edges`, sorting by ID deterministically. |
| **1** | **Base Analysis** | `explorer/src/lib/layout/analysis.ts` (`computeArchitectureAnalysis`) | Computes adjacency maps, degree distributions, and connected components. |
| **2** | **Layer Classification** | `explorer/src/lib/layout/layers.ts` (`classifyNodeLayerWithReason`) | Maps nodes to 5 architectural layers (`ui`, `controller`, `service`, `domain`, `data`). |
| **3** | **Domain Discovery** | `explorer/src/lib/layout/domains.ts` (`discoverDomains`) | Groups primary nodes into domains based on naming stems and strong coupling. |
| **4** | **Centrality Analysis** | `explorer/src/lib/layout/centrality.ts` (`computeGraphCentralityAnalysis`) | Identifies hubs and cross-domain bridges. |
| **5** | **Global Domain Layout** | `explorer/src/lib/layout/global-layout.ts` (`computeGlobalDomainLayout`) | Calculates domain region bounding boxes and multi-row 2D domain band packing. |
| **6** | **Layer Crossing Reduction** | `explorer/src/lib/layout/ordering.ts` (`reduceEdgeCrossings`) | Reorders nodes within layer buckets to minimize inter-layer edge crossings. |
| **7** | **Primary Production Local Layout** | `explorer/src/lib/layout/local-layout.ts` (`computeLocalNodeLayout`) | Places primary nodes into layer Y-coordinates and domain X-coordinates. |
| **8** | **Hub & Bridge Refinement** | `explorer/src/lib/layout/centrality.ts` (`calculateBridgeCandidatePosition`) | Shifts bridge nodes to intermediate boundary positions between domains. |
| **9** | **Secondary Satellite Placement** | `explorer/src/lib/layout/satellites.ts` (`placeSatellites`) | Places test classes, custom fields, and trigger/handlers in orbital rings around parent objects/classes. |
| **10** | **Disconnected Component Packing** | `explorer/src/lib/layout/components.ts` (`packComponentPositions`) | Packs disconnected subgraphs into a compact 2D grid using First-Fit Decreasing Height (FFDH). |
| **11** | **Spatial Clearance & Collision Cleanup** | `explorer/src/lib/layout/spacing.ts` (`resolveSpacingAndCollisions`) | Resolves remaining bounding-box overlaps via spatial pushing. |
| **12** | **Position Authority Restoration** | `architecture-layout.ts` (Stage 12) | Overlays `existingPositions` to preserve user drags and persisted coordinates. |

---

## 8. Layer Analysis

- **Module:** `explorer/src/lib/layout/layers.ts`
- **Architectural Layers:**
  1. `ui` (LWC, Visualforce, Aura)
  2. `controller` (Apex Controllers, Batchable Apex)
  3. `service` (Apex Service Classes, Logic Handlers)
  4. `domain` (Apex Domain Classes, Selectors)
  5. `data` (Custom Objects, Standard Objects, Custom Fields, External Objects)
- **Classification Logic:** Precedence-based rule matching using node type, naming conventions (`*Controller`, `*Service`, `*Selector`), interface implementations, and relationships.
- **Layer Y-Coordinates:** `computeDynamicLayerYMap()` in `global-layout.ts` calculates Y-positions for layers with dynamic vertical clearance dependent on row counts.

---

## 9. Domain Analysis

- **Module:** `explorer/src/lib/layout/domains.ts`
- **Domain Discovery:**
  - Extracts domain stems from component names using prefix/suffix tokenization (e.g., `BillingService` $\rightarrow$ `Billing`).
  - Clusters connected primary nodes that share a common stem into logical domains.
  - Assigns unassigned nodes to domains based on strong edge connectivity.
- **Domain Geometry:**
  - Standard/small graphs: 1D linear domain arrangement along the X-axis.
  - Large graphs ($\ge 25$ domains or width $> 5000\text{px}$): 2D multi-row domain packing (`computeGlobalDomainLayout` in `global-layout.ts`).

---

## 10. Role Analysis

- **Current Implementation:** `explorer/src/lib/layout/analysis.ts` and `centrality.ts`.
- **Node Classification:**
  - Primary Nodes: Standard business logic components (`ApexClass`, `LWC`, `Flow`, `CustomObject`).
  - Secondary Satellite Nodes: `isTestNode` (Apex Test Classes) and `isFieldNode` (`CustomField`).
  - Centrality Roles: `isHub` (high fan-in/fan-out within domain) and `isBridge` (high cross-domain edge ratio).
- **Extensibility:** The existing `ArchitectureNodeAnalysis` structure easily accommodates future Feature Role Analysis without breaking layer or domain assignments.

---

## 11. Global Layout

- **Module:** `explorer/src/lib/layout/global-layout.ts`
- **Responsibilities:** Calculates macro-level spatial coordinates for domain regions.
- **2D Domain Packing:** Packs domain bounding boxes into horizontal rows while maintaining inter-domain relationship affinities to minimize cross-domain edge lengths.
- **Primary Node Restriction:** Bounding box calculations strictly consider primary architecture nodes, excluding test nodes and field satellites to prevent domain spatial inflation.

---

## 12. Local Layout

- **Module:** `explorer/src/lib/layout/local-layout.ts`
- **Responsibilities:** Assigns $(x, y)$ coordinates to primary nodes within each domain region.
- **Barycenter Alignment:** Positions nodes horizontally relative to connected nodes in adjacent layers above/below to enforce vertical alignment.
- **Bucket Ordering:** Integrates ordering decisions from `reduceEdgeCrossings()` in `ordering.ts`.

---

## 13. Bridge System

- **Module:** `explorer/src/lib/layout/centrality.ts`
- **Bridge Definition:** A primary node with edges spanning multiple distinct domain regions.
- **Placement Logic:** `calculateBridgeCandidatePosition()` calculates the centroid of connected domain centers and places the bridge node at the inter-domain boundary, reducing edge lengths across domain divides.

---

## 14. Satellite System

- **Module:** `explorer/src/lib/layout/satellites.ts`
- **Satellite Definition:** Secondary support nodes attached to a single primary parent node:
  1. Apex Test Classes (`isTest: true`) $\rightarrow$ attached to tested Apex classes.
  2. Custom Fields (`CustomField`) $\rightarrow$ attached to parent `CustomObject`.
  3. Triggers & Handlers $\rightarrow$ micro-clustered around trigger events.
- **Placement Logic:** Arranged in deterministic orbital rings/arcs around parent nodes.
- **Spatial Isolation:** Satellites do NOT contribute to primary layer row heights or domain width calculations, ensuring primary architectural structure remains clear.

---

## 15. Component / Spacing / Collision System

- **Modules:** `explorer/src/lib/layout/components.ts` & `explorer/src/lib/layout/spacing.ts`
- **Disconnected Components:** Subgraphs with no interconnecting edges are identified via BFS in `analysis.ts`.
- **Component Packing:** `packComponentPositions()` arranges disconnected component bounding boxes using 2D First-Fit Decreasing Height (FFDH) shelf packing.
- **Collision Resolution:** `resolveSpacingAndCollisions()` performs a spatial sweep pass to eliminate any residual bounding-box overlaps between adjacent nodes.

---

## 16. Position Authority

- **Module:** `explorer/src/lib/position-policy.ts` (`resolveNodePosition`)
- **Authority Precedence Hierarchy:**

```text
1. USER (Manual drag during current session)
     >
2. PERSISTED (Saved position in localStorage project state)
     >
3. EXISTING CYTOSCAPE (Current canvas position in active view)
     >
4. INTELLIGENT LAYOUT (Output of computeArchitectureLayout)
     >
5. FALLBACK (Deterministic grid coordinate)
```

- **Invariants:** User session drag and persisted `localStorage` coordinates ALWAYS override calculated layout positions unless an explicit "Reset Layout" action is triggered by the user.

---

## 17. Static Mode

- **Modules:** `explorer/src/components/GraphView.tsx` & `explorer/src/hooks/useViewState.ts`
- **Behavior:**
  - When `layoutMode === 'static'`, automatic layout recalculation is disabled.
  - Interactive triggers (changing filters, adjusting search, focusing components, changing depth/direction, opening investigation drawer) toggle node visibility or highlighting, but existing visible nodes **NEVER change coordinates**.
  - New nodes entering the visible view receive positions via `resolveNodePosition` without moving existing nodes.

---

## 18. Initial Layout

- **Modules:** `explorer/src/components/GraphView.tsx` & `explorer/src/lib/graph-layout.ts`
- **Cold Load Execution:**
  - Upon initial graph load, if no saved positions exist in `localStorage`, `getLayoutOptions()` runs `computeArchitectureLayout()` to generate initial positions.
  - If partial saved positions exist, `computeArchitectureLayout()` receives `existingPositions`, computing positions for new/unpositioned nodes while preserving saved coordinates.

---

## 19. Persistence and Project Isolation

- **Modules:** `explorer/src/lib/projectState.ts` & `explorer/src/context/ProjectContext.tsx`
- **Key Storage Format:** `localStorage` key `sf-dep-explorer-project-state:<projectId>`.
- **Project Isolation:** All persisted node positions, view preferences, and layout overrides are strictly key-partitioned by `projectId`. Switching active projects completely unmounts/reloads project state, preventing cross-project position leakage.

---

## 20. Filtering / Focus / Depth / Direction

- **Modules:** `explorer/src/lib/focus-graph.ts` & `explorer/src/lib/search-filter.ts`
- **Operation Categorization:**

| Operation | Inputs | Graph Data Modified? | Cytoscape Subgraph Modified? | Relayout Triggered in Static Mode? | Coordinates Preserved? |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Type Filter** | Metadata types toggled | No | Elements added/removed | No | Yes |
| **Risk Filter** | Risk levels toggled | No | Elements added/removed | No | Yes |
| **Search Query** | Text string | No | Elements highlighted | No | Yes |
| **Focus Component**| Target node ID | No | Visible subgraph isolated | No | Yes |
| **Focus Depth** | Radius 1, 2, 3, ALL | No | Visible subgraph isolated | No | Yes |
| **Focus Direction**| upstream, downstream, both | No | Visible subgraph isolated | No | Yes |

---

## 21. Primary vs Secondary Artifacts

Classification taxonomy based on current source code and data fixtures:

| Artifact Type | Type / Property | Taxonomy Classification | Layout Handling |
| :--- | :--- | :--- | :--- |
| **LWC / Visualforce** | `LWC`, `Visualforce` | Primary | Placed in UI Layer |
| **Apex Controller** | `ApexClass` (Controller) | Primary | Placed in Controller Layer |
| **Apex Service** | `ApexClass` (Service) | Primary | Placed in Service Layer |
| **Apex Domain/Selector**| `ApexClass` (Domain) | Primary | Placed in Domain Layer |
| **Custom Object** | `CustomObject`, `Object` | Primary | Placed in Data Layer |
| **Flow** | `Flow` | Primary | Placed in Service/Controller Layer |
| **Apex Test Class** | `ApexClass` (`isTest: true`) | Secondary (Satellite) | Orbital placement around parent class |
| **Custom Field** | `CustomField` | Secondary (Satellite) | Orbital placement around parent object |
| **Apex Trigger** | `ApexTrigger` | Primary / Secondary | Micro-clustered with handler class |

---

## 22. Performance Forensics

Wave 6 profiling identified performance bottlenecks in large graphs ($\ge 1000$ nodes):

| Hotspot File & Function | Operation | Algorithmic Complexity | Frequency | Optimization Strategy |
| :--- | :--- | :---: | :---: | :--- |
| `analysis.ts`: `computeArchitectureAnalysis` | Full graph adjacency & BFS traversal | $O(N + E)$ | Called in multiple layout stages | Memoize/cache intermediate graph analysis index. |
| `global-layout.ts`: `calculatePrimaryLayerRowCounts` | Repeated graph filtering for layer counts | $O(N \cdot E)$ | Called per domain band | Pass pre-indexed node layer lookups. |
| `ordering.ts`: `reduceEdgeCrossings` | Barycenter calculation across layers | $O(N \cdot \log N)$ | Iterative passes (up to 4 passes) | Pre-build adjacency arrays. |
| `satellites.ts`: `placeSatellites` | Parent object/class node lookup | $O(N \cdot S)$ | Per satellite node | Use `Map<nodeId, ExplorerNode>` lookup. |

---

## 23. Existing Indexes / Caches

Existing analytical data structures in `explorer/src/lib/layout/`:
- `ArchitectureAnalysis.nodes`: `Map<string, ArchitectureNodeAnalysis>` providing `inDegree`, `outDegree`, `neighborIds`, `parentObjectId`.
- `centralityMap`: `Map<string, NodeCentralityInfo>` providing `hubScore`, `bridgeScore`, `isHub`, `isBridge`.
- `layerMap`: `Map<string, ArchitectureLayer>` providing fast $O(1)$ layer lookup.
- `domainMap`: `Map<string, string>` providing fast $O(1)$ primary domain lookup.

---

## 24. Test / Fixture Inventory

### Test Suites (`explorer/src/`):
- **Unit Tests:** `layers.test.ts`, `domains.test.ts`, `centrality.test.ts`, `satellites.test.ts`, `components.test.ts`, `spacing.test.ts`, `ordering.test.ts`, `position-policy.test.ts`, `projectState.test.ts`.
- **Integration Tests:** `architecture-layout.test.ts`, `GraphView.test.tsx`, `GraphView.positionAuthority.test.tsx`, `GraphView.runtimeIntegration.test.tsx`, `ProjectIsolationAndCompare.test.tsx`.
- **Forensic Audit Tests:** `wave10a-` through `wave10f-forensic-audit.test.ts`, `Wave11Audit.test.tsx`, `Wave12Audit.test.tsx`.
- **Benchmark Tests:** `scalability-layout.test.ts`, `benchmark-wave7b.ts`.

### Fixture Repositories (`explorer/src/lib/layout/fixtures/`):
- `sparse-graph.ts`, `layered-architecture.ts`, `two-domain.ts`, `dense-cross-domain.ts`, `field-heavy.ts`, `test-heavy.ts`, `bridge-heavy.ts`, `hub-heavy.ts`, `long-chain.ts`, `trigger-handler.ts`, `food-delivery.ts`, `disconnected-components.ts`, `scale-100-plus.ts`.

---

## 25. Determinism Analysis

1. **Node and Edge Sorting:** Stage 0 of `computeArchitectureLayout()` sorts safe nodes and edges by ID using `localeCompare()` prior to any algorithmic processing.
2. **Set/Map Traversal:** All Set/Map iterations follow deterministic key insertion orders derived from the initial sorted arrays.
3. **Floating Point Coordinates:** All mathematical operations (`Math.round`, trigonometric satellite placement, FFDH shelf packing) use deterministic double-precision arithmetic.
4. **Zero Randomness:** The layout pipeline contains zero calls to `Math.random()` or timestamp-based seeds.

---

## 26. Cytoscape / UI Integration

- **Canvas Container:** `GraphView.tsx` initializes Cytoscape instance inside a container `div`.
- **Position Application:**
  - Calculates layout positions via `getLayoutOptions()`.
  - Batch updates node positions via `cy.batch(() => { node.position({ x, y }); })`.
  - Disables Cytoscape physics simulation engine (`preset` layout mode), treating Cytoscape purely as a canvas renderer.
- **Viewport Management:** Fits graph to viewport on initial load or explicit "Fit View" button click.

---

## 27. Analyzer / Schema / CLI Contracts

- **Analyzer Output Contract:** `analyze/dependency-report.json` produced by `dependency-analyzer.cjs`.
- **Explorer Contract (`explorer-contract.ts`):** `schemaVersion: "1.0.0"`, `analyzerVersion: "13.0.0"`.
- **CLI Exporter (`scripts/export-explorer.cjs`):** CLI script transforming dependency reports into `explorer-data.json`.
- **Contract Stability Guarantee:** Feature Cluster layout will consume the existing `ExplorerData` schema and `ExplorerNode`/`ExplorerEdge` types without modifying CLI commands or JSON export structure.

---

## 28. Existing Debug / Observability

- **`evaluate-layout.ts`:** Pure quantitative metric evaluation tool measuring edge crossings, edge lengths, node overlaps, layer violations, domain cohesion, and component separation.
- **Forensic Audit Test Suite:** Tests in `explorer/src/lib/layout/wave10*-forensic-audit.test.ts` provide snapshot assertions and spatial boundary checks.
- **Position Test Helpers:** `explorer/src/test/position-test-helpers.ts` provides utilities (`captureNodePositions`, `expectPositionsEqual`, `expectOnlyNodesMoved`) for verifying Position Authority invariants.

---

## 29. Documentation → Implementation → Test Matrix

| Concept | Historical Documentation | Current Implementation | Current Test Coverage |
| :--- | :--- | :--- | :--- |
| **Layers** | `WAVE2B_DYNAMIC_LAYER_SPACING_REPORT.md` | `explorer/src/lib/layout/layers.ts` | `layers.test.ts` |
| **Domains** | `WAVE_10B_2D_DOMAIN_LAYOUT_REPORT.md` | `explorer/src/lib/layout/domains.ts` | `domains.test.ts`, `wave10c-forensic-audit.test.ts` |
| **Centrality / Bridges** | `WAVE3C_BRIDGE_GEOMETRY_REPORT.md` | `explorer/src/lib/layout/centrality.ts` | `centrality.test.ts` |
| **Satellites** | `WAVE3B_SATELLITE_OPTIMIZATION_REPORT.md` | `explorer/src/lib/layout/satellites.ts` | `satellites.test.ts`, `wave10d-forensic-audit.test.ts` |
| **Components** | `WAVE2C_COMPONENT_PACKING_REPORT.md` | `explorer/src/lib/layout/components.ts` | `components.test.ts` |
| **Position Authority** | `WAVE7A_RUNTIME_POSITION_AUTHORITY_AUDIT.md` | `explorer/src/lib/position-policy.ts` | `position-policy.test.ts`, `GraphView.positionAuthority.test.tsx` |
| **Static Mode** | `WAVE5_STATIC_MODE_TRIGGER_MATRIX.md` | `explorer/src/components/GraphView.tsx` | `AdversarialWave5.test.tsx`, `GraphView.layoutModeToggle.test.tsx` |
| **Initial Layout** | `WAVE_12_INITIAL_LAYOUT_FORENSIC_AUDIT.md` | `explorer/src/lib/graph-layout.ts` | `Wave12Audit.test.tsx` |
| **Persistence** | `FINAL_PERSISTENCE_AUDIT.md` | `explorer/src/lib/projectState.ts` | `projectState.test.ts`, `ProjectIsolationAndCompare.test.tsx` |

---

## 30. Feature Integration Map

Proposed structural integration map for upcoming Feature Cluster layout implementation:

```text
               RAW EXPLORER GRAPH DATA
                         │
                         ▼
             [LayoutGraphIndex] (New Index Module)
                         │
                         ▼
        [computeArchitectureAnalysis] (Existing Analysis)
                         │
                         ▼
            [Feature Role Analysis] (New Module)
                         │
                         ▼
             [Feature Discovery] (New Module)
                         │
                         ▼
           [Feature Cluster Graph] (New Module)
                         │
                         ▼
        [Global Feature Placement] (New Module)
                         │
                         ▼
  [Local Layout & Layer Adaptation] (Adapted local-layout.ts)
                         │
                         ▼
       [Bridges / Satellites / Components] (Existing)
                         │
                         ▼
            [Position Authority Policy] (Existing)
```

### Module Location Blueprint:
1. `explorer/src/lib/layout/graph-index.ts`: Unified $O(1)$ node/edge indexing infrastructure (`LayoutGraphIndex`).
2. `explorer/src/lib/layout/feature-roles.ts`: Feature Role classifier module determining functional primary vs secondary roles.
3. `explorer/src/lib/layout/features.ts`: Feature discovery, feature cluster graph construction, and feature boundary placement.
4. `explorer/src/lib/architecture-layout.ts`: Main layout orchestrator integrating Feature Cluster stage cleanly between Domain discovery and Global layout.

---

## 31. Proposed File Ownership

To prevent merge conflicts and maintain clean architectural isolation during parallel execution:

| Module / Scope | Key Files | Exclusive Owner |
| :--- | :--- | :--- |
| **Graph Index Infrastructure** | `explorer/src/lib/layout/graph-index.ts` | Feature Layout Lead |
| **Feature Discovery & Roles** | `explorer/src/lib/layout/features.ts`, `feature-roles.ts` | Feature Layout Lead |
| **Layout Orchestrator** | `explorer/src/lib/architecture-layout.ts` | Orchestrator Owner |
| **Position Authority & Policy** | `explorer/src/lib/position-policy.ts` | Core Runtime Lead |
| **State & Persistence** | `explorer/src/lib/projectState.ts`, `ProjectContext.tsx` | Core Runtime Lead |
| **UI Rendering & Canvas** | `explorer/src/components/GraphView.tsx` | UI Lead |

---

## 32. Regression Contract

Any future Feature Cluster implementation MUST strictly preserve the following baseline invariants:

1. **Position Authority Invariant:** User session drags and persisted `localStorage` coordinates must NEVER be overwritten by automatic layout runs.
2. **Static Mode Invariant:** Interacting with filters, search, focus depth/direction, or investigation drawer must NEVER trigger layout repositioning of visible nodes in Static Mode.
3. **Satellite Isolation Invariant:** Apex Test Classes and Custom Fields must remain placed as secondary satellites around primary parent components and must not distort macro feature bounding box dimensions.
4. **100% Determinism:** Identical input graphs (regardless of array element shuffle order) must produce 100% identical coordinate outputs.
5. **Contract Compatibility:** Zero changes to `explorer-contract.ts` or CLI export behavior.

---

## 33. Known Risks

1. **Repeated Graph Traversal Performance:** Re-traversing large graphs ($>1000$ nodes) in multiple layout stages without a shared `LayoutGraphIndex` risks high execution latency ($>2\text{s}$).
2. **Feature vs Domain Spatial Clashes:** Overlapping feature cluster bounding boxes with domain region bounds could cause spatial collisions if global placement is not properly coordinated.
3. **Static Mode Drift:** Applying feature layout during active user investigation in Static Mode would violate the Static Mode trigger contract.

---

## 34. Unknowns / Ambiguities

1. **Feature Boundary Definition:** Optimal balance between grouping components by architectural layer vs grouping by functional feature business domain.
2. **Multi-Feature Membership:** Handling components referenced across multiple functional features without creating visual clutter or excessive bridge edges.

---

## 35. Documentation Contradictions

| Topic | Documentation Statement | Actual Repository Implementation | Reconciliation Resolution |
| :--- | :--- | :--- | :--- |
| **Domain Band Packing** | Early docs (`EXPLORER_ARCHITECTURE.md`) describe 1D linear domain placement. | `global-layout.ts` packs domains in multi-row 2D grids for graphs $\ge 25$ domains. | Code is authoritative (`WAVE_10B_2D_DOMAIN_LAYOUT_REPORT.md`). |
| **Position Authority** | Historical plans suggested re-running layout on filter changes. | `position-policy.ts` & `GraphView.tsx` enforce strict Static Mode and user drag precedence. | Code is authoritative (`WAVE7A_RUNTIME_POSITION_AUTHORITY_AUDIT.md`). |

---

## 36. Recommended Next Steps

1. **Proceed to Prompt 2 (P2 — Performance / Repeated Graph Traversal Audit):**
   - Perform detailed profiling of repeated `nodes.filter()`, `edges.filter()`, and adjacency construction across `architecture-layout.ts` stages.
   - Design the `LayoutGraphIndex` specification to support $O(1)$ lookup operations for Feature Discovery.

---

```text
AUDIT COMPLETE

Repository:
dependency-analyzer

Commit inspected:
5e93faa553835c390fb641a8e570356f8e9678f0

Root Markdown files reviewed:
117

Most useful historical documents:
- WAVE7A_RUNTIME_POSITION_AUTHORITY_AUDIT.md
- WAVE8A_RUNTIME_POSITION_AUTHORITY_IMPLEMENTATION.md
- WAVE_10B_2D_DOMAIN_LAYOUT_REPORT.md
- WAVE_10D_GEOMETRY_AND_SATELLITE_REPAIR_REPORT.md
- WAVE_11_FILTER_FORENSIC_AUDIT.md
- WAVE_12_INITIAL_LAYOUT_FORENSIC_AUDIT.md
- FINAL_PERSISTENCE_AUDIT.md
- FINAL_LAYOUT_CALL_GRAPH.md

Important outdated/superseded documents:
- EXPLORER_ARCHITECTURE.md (describes early 1D layout replaced in Wave 10B)
- ARCHITECTURE_LAYOUT_IMPLEMENTATION_PLAN.md (describes early un-memoized pipeline)

Documentation/code contradictions:
- Early docs describe 1D domain layout; actual code implements multi-row 2D domain band packing (Wave 10B).
- Historical plans suggested relayout on filter; actual code enforces Static Mode Position Authority (Wave 5/7A).

Audit document:
FEATURE_CLUSTER_BASELINE_AUDIT.md

Files inspected:
218 source files in explorer/src + 117 markdown files

Relevant layout files:
- explorer/src/lib/architecture-layout.ts
- explorer/src/lib/graph-layout.ts
- explorer/src/lib/position-policy.ts
- explorer/src/lib/projectState.ts
- explorer/src/lib/layout/analysis.ts
- explorer/src/lib/layout/layers.ts
- explorer/src/lib/layout/domains.ts
- explorer/src/lib/layout/global-layout.ts
- explorer/src/lib/layout/local-layout.ts
- explorer/src/lib/layout/centrality.ts
- explorer/src/lib/layout/satellites.ts
- explorer/src/lib/layout/components.ts
- explorer/src/lib/layout/spacing.ts
- explorer/src/lib/layout/ordering.ts

Current layout entry point:
explorer/src/lib/architecture-layout.ts + computeArchitectureLayout

Current Position Authority:
explorer/src/lib/position-policy.ts + resolveNodePosition

Current Static Mode:
explorer/src/components/GraphView.tsx + isStaticMode check

Current Initial Layout:
explorer/src/components/GraphView.tsx & explorer/src/lib/graph-layout.ts + getLayoutOptions

Current Persistence:
explorer/src/lib/projectState.ts + loadProjectState / saveProjectState

Critical Feature integration points:
- Insertion of LayoutGraphIndex at Stage 0
- Feature Role Analysis & Discovery between Domain discovery (Stage 3) and Global placement (Stage 5)
- Adaptation of computeLocalNodeLayout for Feature x Layer matrix

Critical regression risks:
- Position Authority override regression
- Static Mode repositioning on filter/focus
- Satellite domain inflation
- Performance degradation on >1000 node graphs

Performance hotspots:
- Repeated computeArchitectureAnalysis traversals in layer/domain steps
- Array filter/find loops during satellite parent lookup
- Multi-pass barycenter edge crossing reduction

Determinism risks:
- Unsorted Set/Map iterations (mitigated by Stage 0 array sorting)

Files requiring exclusive ownership:
- explorer/src/lib/architecture-layout.ts
- explorer/src/lib/position-policy.ts
- explorer/src/lib/projectState.ts
- explorer/src/components/GraphView.tsx

Production code changed:
NONE

Recommended next prompt:
P2 — Performance / Repeated Graph Traversal Audit
```
