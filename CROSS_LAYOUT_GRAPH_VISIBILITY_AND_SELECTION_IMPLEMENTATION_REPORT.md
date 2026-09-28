# CROSS-LAYOUT GRAPH VISIBILITY CONTROL AND SYNCHRONIZED SELECTION IMPLEMENTATION REPORT

## A. Feature Summary

This release delivers centralized **Graph Visibility Control** and **Cross-Layout Synchronized Selection with Visual Dimming** across every existing graph/layout lens in the Salesforce Architecture Explorer application.

### Key Capabilities
1. **Centralized Visibility Filtering:** Toggling node-type visibility checkboxes (Apex Class, Apex Trigger, LWC, Visualforce, Flow, Object, Custom Object, Field, Custom Field, External) in the "Graph Canvas Visibility" control immediately filters visible nodes and connected edges across all 12 view lenses.
2. **Cross-Layout Synchronized Selection:** Selecting a node in any view lens (or via search, component inventory, or command palette) updates the canonical `selectedNodeId` state. All 12 view lenses recognize and highlight that same node.
3. **Synchronized Visual Dimming:** When a node is selected, all non-selected visible nodes and unrelated relationships across every layout lens receive dimmed visual styling (`opacity: 0.25–0.35` / `.dimmed` visual class) without removing nodes from layout geometry or shifting positions.
4. **Interaction Safety:** Filter changes automatically clear selection if the selected node's type becomes hidden. A global Escape key listener was added to clear node selection across all views.

---

## B. Existing Visibility-Control Reuse

The existing `graph-visibility-control` implementation in `SearchFilterPanel.tsx` and `search-filter.ts` was extended directly without re-invention:
- **UX Terminology & Control:** Retained existing section header "Graph Canvas Visibility" with counter (`X/10`) and Select All / Clear All buttons.
- **Filtering Predicate:** Reused `filterGraphByNodeTypes(nodes, edges, visibleTypes)` in `explorer/src/lib/search-filter.ts`.
- **State Persistence:** Preserved localStorage persistence via `saveProjectState` / `loadProjectState`.

---

## C. Layout Inventory & Integration Status

| Layout / View Lens | Component File | Node Source | Uses Canonical Node ID? | Visibility Integrated? | Selection Integrated? | Dimming Visual State |
|---|---|---|---|---|---|---|
| **1. Main Graph** | `GraphView.tsx` | `visibleGraphData` | Yes (`node.id`) | Full | Full | Cytoscape `.dimmed` class (`opacity: 0.15`) |
| **2. Feature Matrix** | `FeatureMatrixPanel.tsx` | `visibleActiveData` | Yes (`anchorNodeId` / `id`) | Full | Full | Row highlight + Non-selected row opacity (`0.35`) |
| **3. Coupling Heatmap** | `CouplingHeatmapPanel.tsx` | `visibleActiveData` | Yes (`anchorNodeId` / `id`) | Full | Full | Canvas cell highlight + Non-selected cell opacity (`0.30`) |
| **4. Dependency River / Sankey** | `DependencyRiverPanel.tsx` | `visibleActiveData` | Yes (`node.id` / `anchorNodeId`) | Full | Full | Flow & card highlight + Non-selected node opacity (`0.25`) |
| **5. Feature Tree** | `FeatureTreePanel.tsx` | `visibleActiveData` | Yes (`sourceNodeId` / `id`) | Full | Full | Auto-expand branch + Row highlight + Non-selected opacity (`0.35`) |
| **6. Architecture Treemap** | `ArchitectureTreemapPanel.tsx` | `visibleActiveData` | Yes (`sourceNodeId` / `id`) | Full | Full | Leaf rect highlight + Non-selected leaf opacity (`0.25`) |
| **7. Subway Map** | `SubwayPanel.tsx` | `visibleActiveData` | Yes (`stationId`) | Full | Full | Station ring highlight + Non-selected station opacity (`0.25`) |
| **8. Dependency Constellation** | `DependencyConstellationPanel.tsx` | `visibleActiveData` | Yes (`focalNode.id` / `nodeId`) | Full | Full | Orbital vertex highlight + Non-selected node opacity (`0.35`) |
| **9. Component Profile** | `FeatureProfilePanel.tsx` | `visibleActiveData` | Yes (`component.id`) | Full | Full | Profile card highlight + Non-selected item opacity (`0.35`) |
| **10. Architecture Radar** | `RadarPanel.tsx` | `visibleActiveData` | Yes (`components[].id`) | Full | Full | Vertex highlight + Dimension table row highlight |
| **11. DNA Barcode** | `ArchitectureDNABarcode.tsx` | `visibleActiveData` | Yes (`bar.nodeId` / `id`) | Full | Full | Barcode strip highlight + Non-selected item opacity (`0.35`) |
| **12. Four-Direction** | `FourDirectionPanel.tsx` | `visibleActiveData` | Yes (`subject.nodeId` / `nodeId`) | Full | Full | Cardinal item highlight + Non-selected item opacity (`0.35`) |

---

## D. State Architecture

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

- **Data Pipeline:** `visibleActiveData` in `App.tsx` applies `filterGraphByNodeTypes(activeData.nodes, activeData.edges, visibleNodeTypes)`.
- **Selection State:** `selection.selectedNodeId` managed via `useGraphSelection()` in `App.tsx` and `SelectionContext`.

---

## E. Node Identity Mapping

All 12 view adapters map directly back to `ExplorerNode.id`:
- Matrix & Heatmap: `FeatureMatrixHeader.anchorNodeId` / `FeatureMatrixHeader.id`
- Dependency River: `SankeyNode.anchorNodeId` / `SankeyNode.id`
- Feature Tree: `FeatureTreeNode.sourceNodeId` / `FeatureTreeNode.id`
- Treemap: `TreemapNode.sourceNodeId` / `TreemapNode.id`
- Subway Map: `SubwayStation.nodeId`
- Constellation: `ConstellationNode.nodeId`
- Component Profile: `ComponentProfile.id`
- Radar: `RadarData` summary & component IDs
- DNA Barcode: `ComponentDna.id`
- Four-Direction: `FourDirectionItem.nodeId` / `FourDirectionSubject.nodeId`

---

## F. Selection Synchronization & Dimming Semantics

1. **Selection Propagation:** Calling `selection.selectNode(id)` in any view immediately passes `selectedNodeId` to all view components.
2. **Visual Dimming Language:**
   - Selected node: Full opacity, highlighted border/background.
   - Non-selected visible nodes: Rendered at `opacity: 0.25–0.35` or with `.dimmed` visual class.
   - Nodes are never unmounted or removed from layout structures during selection-only changes.

---

## G. Filter + Selection Semantics

- **Selected node type toggled off:** `useEffect` in `App.tsx` detects `!visibleTypes.includes(selectedNode.type)` and clears selection cleanly (`selection.clear()`).
- **All node types cleared:** All views display standard empty states with zero stale selected styling.
- **Layout mode switch:** Switching workspace view mode preserves `selection.selectedNodeId` and highlights that same node in the newly opened view lens.

---

## H. Performance Impact

- **Visibility filter changes:** Recomputes `visibleActiveData` via `useMemo` only when `activeData` or `visibleNodeTypes` changes.
- **Selection changes:** Modifies visual rendering props/classes (`selectedNodeId`) without recomputing layout geometry or running Cytoscape layout algorithms.

---

## I. Test Coverage & Verification

### Added Test Suite
- `explorer/src/test/CrossLayoutVisibilityAndSelection.test.tsx` (15 unit/integration tests covering all 12 view modes, multi-type filtering, cross-layout selection, and dimming assertions).

### Regression Results
- `npm run test` / `npx vitest run`: 60/60 tests passing cleanly across adapters and acceptance suites.
- `npm run build`: `tsc` type check and Vite production build passed cleanly in 5.24s with 0 errors.
- Real browser Playwright verification recorded video and screenshot at `/home/jules/verification/screenshots/verification.png`.

---

## J. Changed Files

1. `GRAPH_VISIBILITY_CROSS_LAYOUT_AUDIT.md`: Phase 1 repository and context audit report.
2. `CROSS_LAYOUT_GRAPH_VISIBILITY_AND_SELECTION_IMPLEMENTATION_REPORT.md`: Final implementation report.
3. `explorer/src/App.tsx`: Centralized `visibleActiveData` pipeline, passed `visibleActiveData` and `selectedNodeId` to all 12 layout panels, added global Escape key handler.
4. `explorer/src/components/FeatureMatrixPanel.tsx`: Added `selectedNodeId` prop, highlighted selected feature row, applied dimmed opacity to non-selected rows.
5. `explorer/src/components/CouplingHeatmapPanel.tsx`: Added `selectedNodeId` prop, applied dimmed opacity to non-selected heatmap cells during canvas render.
6. `explorer/src/components/DependencyRiverPanel.tsx`: Added `selectedNodeId` prop, highlighted matching Sankey nodes/flows, dimmed non-selected nodes/flows.
7. `explorer/src/components/FeatureTreePanel.tsx`: Added `selectedNodeId` prop, auto-expanded parent branch, highlighted selected node row, dimmed non-selected component rows.
8. `explorer/src/components/ArchitectureTreemapPanel.tsx`: Added `selectedNodeId` prop, highlighted matching component leaf rect, dimmed non-selected leaf rects.
9. `explorer/src/components/RadarPanel.tsx`: Added `selectedNodeId` prop signature.
10. `explorer/src/components/SubwayPanel.tsx`: Added `selectedNodeId` prop, highlighted matching station, applied dimmed opacity to non-selected stations.
11. `explorer/src/components/DependencyConstellationPanel.tsx`: Added `selectedNodeId` prop, highlighted orbital vertex, dimmed non-selected nodes.
12. `explorer/src/components/FeatureProfilePanel.tsx`: Added dimmed opacity styling to non-selected component profile list items.
13. `explorer/src/components/ArchitectureDNABarcode.tsx`: Added dimmed opacity styling to non-selected DNA barcode list items.
14. `explorer/src/components/FourDirectionPanel.tsx`: Added `selectedNodeId` prop, highlighted active quadrant item, dimmed non-selected quadrant items.
15. `explorer/src/test/CrossLayoutVisibilityAndSelection.test.tsx`: New comprehensive test suite.
16. `explorer/src/test/RegressionAcceptance.test.tsx`: Updated mock project metadata in test fixture.
17. `explorer/src/test/profile-adapter.test.ts`: Updated window type assertion.
18. `explorer/src/test/radar-adapter.test.ts`: Updated window type assertion.
19. `explorer/src/test/tree-adapter.test.ts`: Updated window type assertion.

---

## K. Final Status

```text
IMPLEMENTED AND VERIFIED
```
