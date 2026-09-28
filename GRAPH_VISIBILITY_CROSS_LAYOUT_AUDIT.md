# GRAPH VISIBILITY CONTROL & CROSS-LAYOUT SYNCHRONIZED SELECTION AUDIT

## 1. Executive Summary

This audit establishes the baseline architecture, current capability gaps, and extension path for delivering **Graph Visibility Control** and **Cross-Layout Synchronized Selection** across all 12 layout lenses and analytical views in the application.

The current regression baseline is `e6cb181`.

---

## 2. Existing Visibility-Control Architecture

### State Ownership & Persistence
- `SearchFilterState.visibleNodeTypes`: An array of `ExplorerNodeType` (10 canonical node types: `ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`). Defaults to `ALL_EXPLORER_NODE_TYPES`.
- State is owned in `view.filterState` (via `useProjectView` / `App.tsx`) and rendered in `SearchFilterPanel.tsx` under the panel section **"Graph Canvas Visibility"** (`data-testid="graph-visibility-panel"`).
- Persisted to project localStorage via `saveProjectState(activeProjectId, { filters: { visibleNodeTypes } })`.

### Centralized Visibility Filtering
- Core predicate: `filterGraphByNodeTypes(nodes, edges, visibleTypes)` in `explorer/src/lib/search-filter.ts`.
- Node filter: `filterNodesByVisibleTypes(nodes, visibleTypes)` checks `visibleTypes.includes(node.type)`.
- Edge filter: `filterEdgesByVisibleNodes(edges, visibleNodeIds)` retains edge iff `visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)`.

---

## 3. Node Identity & Selection Architecture

### Canonical Node Identity
- Every node across the entire application possesses a canonical string identifier (`ExplorerNode.id`), structured as `${ExplorerNodeType}:${ComponentName}` (e.g. `ApexClass:AccountController`, `LWC:contactList`).
- All layout adapters (Matrix, Sankey, Tree, Treemap, Subway, Constellation, Profile, Radar, DNA, Four-Direction) derive their representations directly from or reference back to this canonical ID.

### Selection State Ownership
- `useGraphSelection()` hook provides `selectedNodeId: string | null`, `selectedEdgeId: string | null`, and `selectNode(id: string | null)`.
- Lifted to `App.tsx` level and exposed via `SelectionContext` (`SelectionProvider` / `useSelection`).

---

## 4. Complete Layout Inventory & Integration Matrix

| Layout/View Lens | Component File | Node Source | Uses Canonical Node ID? | Visibility Currently Supported? | Selection Currently Supported? | Target Integration Plan |
|---|---|---|---|---|---|---|
| **1. Main Graph** | `GraphView.tsx` | `visibleGraphData.nodes` | Yes (`node.id`) | Full | Full | Retain existing Cytoscape integration and `.dimmed` class updates. |
| **2. Feature Matrix** | `FeatureMatrixPanel.tsx` | `activeData.nodes` | Yes (`anchorNodeId` / `primaryNodes`) | Partial (unfiltered `activeData`) | Partial (row select, anchor) | Pass `visibleActiveData` and `selectedNodeId`. Dim non-selected feature rows/cells. |
| **3. Coupling Heatmap** | `CouplingHeatmapPanel.tsx` | `activeData.nodes` | Yes (`anchorNodeId`) | Partial (unfiltered `activeData`) | Partial (canvas click) | Pass `visibleActiveData` and `selectedNodeId`. Highlight selected feature cells, dim others. |
| **4. Dependency River / Sankey** | `DependencyRiverPanel.tsx` | `activeData` | Yes (`provenance.source/target`, `anchorNodeId`) | Partial (unfiltered `activeData`) | Internal state only | Pass `visibleActiveData` and `selectedNodeId`. Highlight matching flows/nodes, dim unrelated. |
| **5. Feature Tree** | `FeatureTreePanel.tsx` | `activeData` | Yes (`sourceNodeId`, `id`) | Partial (unfiltered `activeData`) | Internal state only | Pass `visibleActiveData` and `selectedNodeId`. Auto-expand to selected node, dim non-selected rows. |
| **6. Architecture Treemap** | `ArchitectureTreemapPanel.tsx` | `activeData` | Yes (`component.id`) | Partial (unfiltered `activeData`) | Click callback only | Pass `visibleActiveData` and `selectedNodeId`. Highlight selected leaf rect, dim non-selected. |
| **7. Subway Map** | `SubwayPanel.tsx` | `activeData` | Yes (`stationId`) | Partial (unfiltered `activeData`) | Yes (`selectedStationId`) | Pass `visibleActiveData` and `selectedNodeId`. Highlight selected station/line, dim others. |
| **8. Dependency Constellation** | `DependencyConstellationPanel.tsx` | `activeData` | Yes (`focalNodeId`, `node.id`) | Partial (unfiltered `activeData`) | Yes (`focalNodeId`) | Pass `visibleActiveData` and `selectedNodeId`. Highlight focal node, dim peripheral nodes. |
| **9. Component Profile** | `FeatureProfilePanel.tsx` | `activeData` | Yes (`component.id`) | Partial (unfiltered `activeData`) | Yes (`selectedNodeId`) | Pass `visibleActiveData` and `selectedNodeId`. Highlight selected component row, dim others. |
| **10. Architecture Radar** | `RadarPanel.tsx` | `activeData` | Yes (`components[].id`) | Partial (unfiltered `activeData`) | Callback only | Pass `visibleActiveData` and `selectedNodeId`. Highlight selected component, dim non-selected items. |
| **11. DNA Barcode** | `ArchitectureDNABarcode.tsx` | `activeData` | Yes (`bar.nodeId`) | Partial (unfiltered `activeData`) | Yes (`selectedNodeId`) | Pass `visibleActiveData` and `selectedNodeId`. Highlight matching barcode bands, dim others. |
| **12. Four-Direction** | `FourDirectionPanel.tsx` | `activeData` | Yes (`selectedNodeId`) | Partial (unfiltered `activeData`) | Yes (`selectedNodeId`) | Pass `visibleActiveData` and `selectedNodeId`. Highlight center/neighbor nodes, dim others. |

---

## 5. Layout Adapter Inventory

| Adapter | Source File | Input Data | Transformation Output | Node Identity Mapping |
|---|---|---|---|---|
| `adaptFeatureMatrix` | `matrix-adapter.ts` | `ExplorerDataSchema` | `FeatureMatrixData` (`features`, `cells`, `summary`) | `feature.anchorNodeId`, `primaryNodes`, `secondaryNodes` |
| `adaptSankeyRiver` | `sankey-adapter.ts` | `ExplorerDataSchema` | `SankeyRiverData` (`stages`, `nodes`, `flows`) | `flow.provenance[].sourceComponentId`, `node.anchorNodeId` |
| `adaptFeatureTree` | `tree-adapter.ts` | `ExplorerDataSchema` | `FeatureTreeData` (`rootId`, `nodes`, `summary`) | `treeNode.sourceNodeId` -> `ExplorerNode.id` |
| `adaptTreemap` | `treemap-adapter.ts` | `ExplorerDataSchema` | `TreemapNode` hierarchy | `leafNode.id` -> `ExplorerNode.id` |
| `adaptSubwayMap` | `subway-adapter.ts` | `ExplorerDataSchema` | `SubwayMapData` (`stations`, `lines`, `transfers`) | `station.stationId` -> `ExplorerNode.id` |
| `adaptConstellation` | `constellation-adapter.ts` | `ExplorerDataSchema` | `ConstellationData` (`focalNode`, `layers`, `edges`) | `node.id` -> `ExplorerNode.id` |
| `adaptComponentProfile` | `profile-adapter.ts` | `ExplorerDataSchema` | `ComponentProfileData` (`components`, `summary`) | `component.id` -> `ExplorerNode.id` |
| `adaptRadarDimensions` | `radar-adapter.ts` | `ExplorerDataSchema` | `RadarDimensionsData` (`dimensions`, `components`) | `component.id` -> `ExplorerNode.id` |
| `adaptDNABarcode` | `dna-adapter.ts` | `ExplorerDataSchema` | `DNABarcodeData` (`bands`, `bars`) | `bar.nodeId` -> `ExplorerNode.id` |
| `adaptFourDirectionView` | `four-direction-adapter.ts` | `ExplorerDataSchema` | `FourDirectionData` (`centerNode`, `cardinals`) | `node.id` -> `ExplorerNode.id` |

---

## 6. Current Gaps & Analysis

1. **Unfiltered Data Passed to Analytical Views:**
   - In `App.tsx`, `visibleGraphData` was supplied only to `<GraphView />`.
   - All other 11 analytical panels were passed raw `activeData`, causing hidden node types to remain visible in non-Graph view modes.

2. **Inconsistent Selection Synchronization:**
   - While `GraphView`, `ArchitectureDNABarcode`, `FeatureProfilePanel`, `SubwayPanel`, `FourDirectionPanel`, and `DependencyConstellationPanel` accepted `selectedNodeId`, views like `FeatureTreePanel`, `DependencyRiverPanel`, `ArchitectureTreemapPanel`, and `RadarPanel` managed internal selection or lacked `selectedNodeId` prop binding.

3. **Inconsistent Dimming Semantics:**
   - Only Cytoscape in `GraphView` applied `.dimmed` styling to non-selected elements.
   - Non-graph view mode adapters/components lacked uniform visual dimming (e.g. `opacity: 0.25` or `isDimmed` flags) for unselected nodes when a canonical selection is active.

---

## 7. Proposed Minimal Extension Architecture

```text
                      Canonical Graph State (activeData)
                                     │
                ┌────────────────────┴────────────────────┐
                ▼                                         ▼
   Visibility State (visibleNodeTypes)       Selection State (selectedNodeId)
                │                                         │
                └────────────────────┬────────────────────┘
                                     ▼
                          visibleActiveData (useMemo)
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
   Graph View                Matrix / Heatmap / River        Tree / Treemap / Subway / ...
(Cytoscape .dimmed)       (Selected Cell/Row Highlight,    (Selected Card Highlight,
                           Unselected Dimmed Opacity)       Unselected Dimmed Opacity)
```

1. **Centralized Data Filtering (`visibleActiveData`):**
   - Create a memoized `visibleActiveData` in `App.tsx`:
     `filterGraphByNodeTypes(activeData.nodes, activeData.edges, visibleNodeTypes)`.
   - Pass `visibleActiveData` to all 12 layout view panels so hidden node types and their connected edges are filtered consistently.

2. **Unified Cross-Layout Selection Prop Handoff:**
   - Ensure every analytical panel receives `selectedNodeId={selection.selectedNodeId}` and calls `selection.selectNode(id)` on interaction.

3. **Consistent Dimming Visual Language:**
   - Define a shared helper/CSS convention (`isDimmed = selectedNodeId !== null && node.id !== selectedNodeId`).
   - When a node is selected, render the selected item in normal/highlighted state and apply `opacity: 0.3` (or `.dimmed-node` class) to non-selected visible nodes across every view lens.
   - Dimming must never remove visible nodes from the DOM/layout structure, preserving geometry and spatial context.

---

## 8. Conclusion & Readiness

The architecture is clean, minimal, and fully preserves existing position authority, layout engines, and contract invariants. Phase 1 Audit is complete.
