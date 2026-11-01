# Report 4: Salesforce Complete Functional Parity Audit

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** Read-Only Audit

---

## 1. Comprehensive View-by-View Audit (18 Views)

The original Dependency Analyzer application registers exactly 18 distinct workspace views via `LENS_REGISTRY` (12 lenses) and `SURFACE_REGISTRY` (6 surfaces) in `explorer/src/registry/workspace-registry.ts`.

| Original View | Domain / Type | Original Component & Responsibilities | Salesforce Target Equivalent | Current Parity Status | Evidence & Functional Gaps |
|---|---|---|---|---|---|
| **1. Interactive Graph (`graph`)** | Lens / Topological | `GraphSlot`, `GraphCanvas`, `CytoscapeCanvas`. Dynamic Cytoscape rendering, node/edge hover cards, multi-selection, path tracing, focus neighborhood expansion. | `c/daGraphViewer` | **PARTIALLY_MIGRATED** | Implements basic Cytoscape rendering and single-node selection. Missing: dynamic hover cards, path mode, focus controls, zoom controls, mini-navigator. |
| **2. Dependency Matrix (`matrix`)** | Lens / Topological | `FeatureMatrixPanel`. Square matrix of component-to-component interactions, coupling heat levels, cell selection, anchor node jumps. | `c/daMatrixView` | **PARTIALLY_MIGRATED** | Implements matrix grid table, cell counts, unresolved edge detection. Missing: anchor navigation, coupling sort toggles. |
| **3. Findings & Alerts (`findings`)** | Surface / Architectural | `FindingsPanel`. Automated architectural anti-patterns, circular dependencies, unhandled hub classes, rule severity filters. | `c/daFindingsView` | **PARTIALLY_MIGRATED** | Derives cycles, unhandled hubs, and high-coupling alerts in client LWC. Missing: AST rule engine, deep node investigation drawer. |
| **4. Project Dashboard (`dashboard`)** | Surface / Overview | `ProjectDashboard`. Top-level project health score, total node/edge counts, risk indicators, recent analysis runs. | None | **NOT_MIGRATED** | No dashboard LWC exists. Shell only displays basic header status fields. |
| **5. Snapshot Compare (`compare`)** | Surface / Temporal | `ComparePanel`. Diff comparison between two analysis snapshots, node additions, removals, edge mutations. | None | **NOT_MIGRATED** | `graph-diff.ts` and `ComparePanel` logic not migrated. Apex persistence stores historical runs, but no diff engine exists in LWC. |
| **6. Analysis History (`history`)** | Surface / Temporal | `AnalysisHistoryPanel`. Timeline of previous analysis runs, metadata inspection, snapshot selection. | None | **NOT_MIGRATED** | No historical run browser or selection component in Salesforce LWC. |
| **7. Subway Map (`subway`)** | Lens / Topological | `SubwayPanel`, `adaptSubwayMap`. Feature routes and component transfer stations visual metro-style map. | None | **NOT_MIGRATED** | `adaptSubwayMap` and `SubwayPanel` have no LWC implementation. |
| **8. Dependency Constellation (`constellation`)** | Lens / Neighborhood | `DependencyConstellationPanel`, `adaptConstellation`. Polar radial view centered around focal node. | `daLayoutEngine` (algo only) | **PORTED_NOT_INTEGRATED** | `computeConstellationLayout` is ported in `daLayoutEngine.js`, but has no LWC view or UI invocation. |
| **9. Component Tree (`tree`)** | Lens / Hierarchical | `FeatureTreePanel`. Hierarchical file and component tree explorer with nested node counts. | None | **NOT_MIGRATED** | Tree view not implemented in LWC. |
| **10. Architecture Treemap (`treemap`)** | Lens / Hierarchical | `ArchitectureTreemapPanel`. Nested rectangular packing representing package sizes and dependency density. | None | **NOT_MIGRATED** | Treemap layout and visualization not implemented in LWC. |
| **11. Coupling Heatmap (`heatmap`)** | Lens / Feature | `CouplingHeatmapPanel`. 2D heat-intensity map of structural coupling across architectural boundaries. | None | **NOT_MIGRATED** | Heatmap rendering not implemented in LWC. |
| **12. Dependency River (`river`)** | Lens / Feature | `DependencyRiverPanel`, `computeSankeyLayout`. Sankey flow diagram representing layer-to-layer call volumes. | `daLayoutEngine` (algo only) | **PORTED_NOT_INTEGRATED** | `computeSankeyLayout` is ported in `daLayoutEngine.js`, but no River/Sankey LWC view exists. |
| **13. Architecture DNA (`dna`)** | Lens / Feature | `ArchitectureDNABarcode`. Visual barcode signature representing architectural component distribution. | None | **NOT_MIGRATED** | DNA barcode visualization not implemented in LWC. |
| **14. Component Profile (`profile`)** | Lens / Neighborhood | `FeatureProfilePanel`. Deep-dive profile of individual component metrics, afferent/efferent coupling. | None | **NOT_MIGRATED** | Profile view not implemented in LWC. |
| **15. Health Radar (`radar`)** | Lens / Neighborhood | `RadarPanel`. Multi-axis radar spider chart evaluating complexity, coupling, coverage, and cohesion. | `daLayoutEngine` (algo only) | **PORTED_NOT_INTEGRATED** | `computeOrbitLayout` radial logic is ported in `daLayoutEngine.js`, but `RadarPanel` is not implemented in LWC. |
| **16. Four-Direction Expansion (`four-direction`)** | Lens / Neighborhood | `FourDirectionPanel`, `adaptFourDirectionView`. Cardinal direction dependency explorer (Up/Down/Left/Right). | None | **NOT_MIGRATED** | Four-direction view not implemented in LWC. |
| **17. Architectural Hotspots (`hotspots`)** | Surface / Risk | `HotspotPanel`. Ranked structural risk hubs combining high coupling, cycles, and missing tests. | None | **NOT_MIGRATED** | Hotspots panel not implemented in LWC. |
| **18. Diagnostics (`diagnostics`)** | Surface / Integrity | `DiagnosticsPanel`. Validation breakdown of broken links, unresolved type references, cycle lists. | None | **NOT_MIGRATED** | Diagnostics surface not implemented in LWC. |

---

## 2. Deep Graph Parity Audit

### Rendering & Styling
- Original uses cytoscape.js with SVG feature overlays, animated pulse borders on selected nodes, dynamic edge curvature based on layer distance, and high-performance canvas rendering.
- Salesforce `daGraphViewer` initializes Cytoscape and computes basic static hierarchical coordinates using `computeArchitectureLayout`. Dynamic edge bundling, styled bezier routing, and cluster boundaries are absent.

### Graph Interaction Mechanics
- **Original:** Supports single selection, shift-multi-selection, edge selection, focal neighborhood expansion, right-click context menu ("Isolate", "Simulate Refactor", "Add to Investigation"), dynamic hover cards with afferent/efferent counts.
- **Salesforce:** Only supports single-node click selection (`handleNodeSelect`), which fires a custom event to update `selectedNodeId` in `daAppShell`. Edge selection, context menus, and hover cards are not implemented.

### State & Lifecycle Protection
- Salesforce `daAppShell` strictly enforces the invariant `SELECTION ≠ NAVIGATION`. Selecting a node does not navigate between views or overwrite active project state.
- Both `daAppShell` and `daGraphViewer` implement stale request increment counters to discard responses if a project switch occurs while an asynchronous chunk query is in-flight.
