# ARCHITECTURE-FOCUSED PROJECTION EXPERIMENT AND SB-1B DECISION GATE REPORT

## 1. REPOSITORY IDENTITY & BASELINE
* **HEAD SHA:** `e060ac116cc9bd20eff31d2a185ad69ac2483840`
* **Branch:** `jules-6369731966459244413-864fdb3d`
* **Working Tree:** Clean (0 production code modifications)
* **Relevant Files:**
  * Layout Engine: `explorer/src/lib/architecture-layout.ts`
  * Centrality / Stage 8: `explorer/src/lib/layout/centrality.ts`
  * Projection / Filtering: `explorer/src/lib/search-filter.ts`
  * Graph View Component: `explorer/src/components/GraphView.tsx`
  * Active Renderer: `explorer/src/components/workspace/ActiveWorkspaceRenderer.tsx`
  * Workspace Shell: `explorer/src/components/workspace/WorkspaceShell.tsx`
  * Main Application: `explorer/src/App.tsx`
* **SB-1A Historical Baseline Audit:** Verified that the experimental SB-1A changes from pull request #517 are NOT present in `explorer/src/lib/layout/centrality.ts`. Production `calculateBridgeCandidatePosition` continues to use unconstrained arithmetic midpoint calculations across connected domain columns.

---

## 2. ACTUAL GRAPH VIEW PRODUCT & UI ARCHITECTURE
The Graph View surface is integrated into the workspace hierarchy:

```text
Topological Structure (Domain Lenses Bar)
    ↓
Graph View (aria-label="Salesforce Architecture Dependency Graph")
    ↓
Graph Controls Floating Toolbar (class="graph-controls-floating")
    ↓
Layout Controls (class="graph-control-group layout-group")
    ↓
Architecture Mode Button (class="graph-control-btn [active]")
```

* **Hierarchical Mode:** Layered top-to-bottom flow (`architectureMode = 'hierarchical'`)
* **Hybrid Mode:** Clustered feature regions (`architectureMode = 'hybrid'`)
* **Architecture Orbit Mode:** Radial concentric bands (`architectureMode = 'orbit'`)

All layout modes render within the exact same Graph View canvas surface (`cytoscape-view`).

---

## 3. INITIAL VS EXPLICIT LAYOUT SELECTION INVESTIGATION
* **Initial Flow:**
  1. `AppContent` loads `activeData`.
  2. `visibleActiveData` and `visibleGraphData` are computed via `filterGraphByNodeTypes`.
  3. `ActiveWorkspaceRenderer` renders `<GraphSlot>` -> `<GraphView>`.
  4. `GraphView` `useEffect` mounts Cytoscape (`cy`) and evaluates `autoLayoutPolicy` using `shouldAutoLayout`.
  5. `getLayoutOptions` invokes `computeArchitectureLayout` (or `computeArchitectureLayoutWithMetadata`).
  6. Coordinates are applied to Cytoscape nodes and `cy.fit()` centers the bounding box.
* **Explicit Selection Flow:**
  1. User clicks layout button in `GraphControls` (`data-testid="architecture-mode-toggle"`).
  2. `onArchitectureModeChange` updates `projectStateContext.graphLayout.architectureMode`.
  3. `GraphView` `useEffect` detects `architectureMode` change and triggers `runLayoutWithMetadata(cy, ...)`.
  4. `computeArchitectureLayoutWithMetadata` recalculates positions.
  5. Updated positions are applied to Cytoscape nodes and persisted.
* **Finding:** Both initial mount and explicit layout selection invoke the exact same layout calculation pipeline (`computeArchitectureLayoutWithMetadata`). The initial visual perception of a "messy" graph is caused by Cytoscape's auto-fit scaling down an extremely wide horizontal canvas (e.g., 22,180px in PBIM) to fit a 1,000px viewport, compressing nodes into small visual clusters until explicit interaction or zooming occurs.

---

## 4. LAYOUT CALL-GRAPH MATRIX

```text
App.tsx (visibleGraphData)
    ↓
ActiveWorkspaceRenderer.tsx (simulatedGraph)
    ↓
GraphSlot.tsx
    ↓
GraphView.tsx
    ↓
runLayoutWithMetadata() / getLayoutOptions() [explorer/src/lib/graph-layout.ts]
    ↓
computeArchitectureLayoutWithMetadata() [explorer/src/lib/architecture-layout.ts]
    ├── Stage 1: computeArchitectureAnalysis
    ├── Stage 2: classifyNodeLayerWithReason
    ├── Stage 3: discoverDomains
    ├── Stage 4: computeGraphCentralityAnalysis [explorer/src/lib/layout/centrality.ts]
    ├── Stage 5: computeGlobalDomainLayout / computeGlobalFeatureLayout [global-layout.ts]
    ├── Stage 6: reduceEdgeCrossings [ordering.ts]
    ├── Stage 7: computeLocalNodeLayout [local-layout.ts]
    ├── Stage 8: calculateBridgeCandidatePosition [centrality.ts]
    ├── Stage 9: placeSatellites [satellites.ts]
    ├── Stage 10: packComponentPositions [components.ts]
    ├── Stage 11: resolveSpacingAndCollisions [spacing.ts]
    └── Stage 12: Position Authority Overrides
```

---

## 5. FULL GRAPH NODE INVENTORY

| Dataset | Total Nodes | Total Edges | ApexClass | ApexTest | ApexTrigger | LWC | CustomObject | CustomField | External | Bridges | Hubs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CST** | 240 | 1,024 | 79 | 0 | 3 | 26 | 10 | 63 | 59 | 158 | 84 |
| **BQC** | 274 | 603 | 78 | 0 | 3 | 17 | 18 | 107 | 51 | 148 | 85 |
| **PBIM** | 528 | 2,063 | 181 | 0 | 13 | 30 | 25 | 180 | 99 | 338 | 226 |

*Note: In these datasets, test classes are classified as `ApexClass` with `behavior.isTest = true`.*

---

## 6. ARCHITECTURE-FOCUSED PROJECTION DEFINITION
The **Architecture-Focused Projection** filters the visual projection to include only core architectural components:

```text
INCLUDED NODE TYPES:
  - ApexClass (including test classes)
  - ApexTest
  - ApexTrigger
  - LWC (Lightning Web Components)

EXCLUDED NODE TYPES (Visual Projection Only):
  - CustomObject / Object
  - CustomField / Field
  - External
```

---

## 7. EDGE SEMANTICS UNDER FOCUSED PROJECTION
* **Option A (Exact Edge Removal):** When intermediate metadata nodes (such as `CustomObject` or `CustomField`) are excluded from the visual projection, any edge connected to an excluded node is removed from the visible edge set (`filterEdgesByVisibleNodes`).
* **No Synthetic Edges:** Synthetic transitive dependencies (e.g. `ApexClass A -> Object B -> ApexClass C` becoming `ApexClass A -> ApexClass C`) are NOT dynamically created, preserving the exact underlying source dependency model.

---

## 8. FULL VS ARCHITECTURE-FOCUSED GRAPH COMPARISON

### A. Graph Size & Composition
| Metric | CST (Full) | CST (Focused) | BQC (Full) | BQC (Focused) | PBIM (Full) | PBIM (Focused) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Nodes** | 240 | **108** (-55.0%) | 274 | **98** (-64.2%) | 528 | **224** (-57.6%) |
| **Edges** | 1,024 | **340** (-66.8%) | 603 | **225** (-62.7%) | 2,063 | **774** (-62.5%) |
| **Bridges** | 158 | **68** (-57.0%) | 148 | **57** (-61.5%) | 338 | **136** (-59.8%) |
| **Hubs** | 84 | **61** (-27.4%) | 85 | **47** (-44.7%) | 226 | **125** (-44.7%) |

### B. Layer Distribution
| Layer | CST (Full) | CST (Focused) | BQC (Full) | BQC (Focused) | PBIM (Full) | PBIM (Focused) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Presentation** | 26 | 26 | 17 | 17 | 30 | 30 |
| **Application** | 41 | 41 | 40 | 40 | 99 | 99 |
| **Domain** | 41 | 41 | 41 | 41 | 95 | 95 |
| **Schema** | 132 | **0** (-100%) | 176 | **0** (-100%) | 304 | **0** (-100%) |

### C. Layout Geometry & Overlap Analysis (Hierarchical Mode)
| Geometry Metric | CST (Full) | CST (Focused) | BQC (Full) | BQC (Focused) | PBIM (Full) | PBIM (Focused) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Canvas Width** | 11,341.6px | **7,380.0px** | 8,480.0px | **8,440.0px** | 22,180.0px | **10,842.1px** |
| **Width Reduction** | - | **-34.9%** | - | **-0.5%** | - | **-51.1%** |
| **Min X** | 60.0px | 60.0px | 60.0px | 60.0px | 60.0px | 60.0px |
| **Max X** | 11,401.6px | 7,440.0px | 8,540.0px | 8,500.0px | 22,240.0px | 10,902.1px |
| **Node Overlaps** | 0 | **0** | 28 | **25** | 53 | **21** |

---

## 9. LAYOUT-MODE COMPARISON

### A. Hierarchical Layout
* Under the focused projection, canvas width is reduced by 34.9% on CST and 51.1% on PBIM, but remains pathologically wide at 7,380px to 10,842px.
* On BQC, canvas width is virtually unchanged (8,480px vs 8,440px) because cross-domain 1D horizontal row packing in Stage 5 remains un-wrapped.
* Overlaps in BQC (25 overlaps) and PBIM (21 overlaps) remain unacceptably high despite filtering out 300+ schema nodes.

### B. Architecture Orbit Layout
* **PBIM Full:** Diameter = 46,496.5px, Overlaps = 0
* **PBIM Focused:** Diameter = 45,249.1px, Overlaps = 0
* Orbit successfully resolves 100% of node overlaps on both full and focused graphs through its multi-pass polar track capacity expansion and finite state machine collision repair.

### C. Constellation, Hybrid, and Treemap Layouts
* **Constellation / Hybrid:** Consume `visibleActiveData` cleanly. Zero layout regressions or guide leaks.

---

## 10. DECISION GATE VERDICT & EVALUATION

### Decision Tree Path Evaluated:
```text
                 FULL GRAPH BASELINE
                          │
                          ▼
        ARCHITECTURE-FOCUSED PROJECTION
                          │
                ┌─────────┴─────────┐
                │                   │
           SUFFICIENT          INSUFFICIENT
                │                   │
                │                   ▼
                │              SB-1B REQUIRED
                │              (BOUNDED 2D)
                │                   │
                └─────────┬─────────┘
                          ▼
                FULL VALIDATION
```

### Official Verdict:
```text
FOCUSED_PROJECTION_INSUFFICIENT_SB1B_REQUIRED
```

### Justification:
1. **Width Pathological:** Even after removing 304 schema nodes from PBIM (reducing node count by 57.6%), the Stage-8 bridge placement algorithm expands the focused graph to 10,842px wide (+2.85x expansion over Stage 7).
2. **BQC Unchanged:** BQC canvas width drops by only 0.5% (8,480px to 8,440px) because domain column centroids remain separated by 1D horizontal row packing in Stage 5.
3. **Severe Overlaps Persist:** Focused PBIM retains 21 node overlaps and focused BQC retains 25 node overlaps. Bounding X placement with multi-lane Y offsets (SB-1B) is strictly required to provide adequate spatial placement capacity.

---

## 11. BROWSER & POSITION AUTHORITY VALIDATION
* **CLI Test Suite:** `npm run test:cli` passed 100% across all 30 test files.
* **10x Determinism:** Running the focused layout 10 times produced 0.00000px coordinate drift.
* **Input-Order Invariance:** 5 random input node shuffles yielded exact bit-for-bit geometry matches.
* **Position Authority:** Persisted user coordinates and layout provenance are preserved without unintended layout triggers.

---

## 12. ABSOLUTE PROHIBITION CHECKLIST
- [x] No Objects, Fields, or metadata deleted from source repository or dependency model.
- [x] No source data or fixtures modified.
- [x] Unbounded X search was NOT restored.
- [x] No arbitrary Y offsets or global layer spacing modifications applied.
- [x] Unrelated layout engines (Orbit, Constellation, Hybrid) remain unaffected.
- [x] Production code changes = 0 files.
