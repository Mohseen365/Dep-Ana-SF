# Report 6: Salesforce Partial Implementation and Unused Code Register

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** Read-Only Audit

---

## 1. Partially Migrated Components & Logic

### 1.1 `daGraphViewer` (Partial Migration of `GraphView.tsx` / `GraphCanvas.tsx`)
- **Implemented:**
  - Dynamic Cytoscape initialization using static resource or local simulation.
  - Coordinate layout resolution via `computeArchitectureLayout`.
  - Node rendering and click selection dispatch (`nodeselect` custom event).
  - Filter criteria filtering (hiding unselected layers/types).
  - Stale query protection via `currentGraphRequestId`.
- **Missing / Gap:**
  - Focus controls (`FocusControls.tsx`, `focus-graph.ts`): upstream/downstream subgraph isolation.
  - Impact analysis controls (`ImpactControls.tsx`, `impact-analysis.ts`): blast radius traversal.
  - Interactive hover cards (`NodeHoverCard.tsx`, `EdgeHoverCard.tsx`).
  - Path tracing mode (shortest path between two components).
  - Dynamic edge styling and curvature based on dependency semantics.
  - Canvas zoom/pan controls, fit-view, and mini-map navigator.

### 1.2 `daMatrixView` (Partial Migration of `FeatureMatrixPanel.tsx`)
- **Implemented:**
  - Square dependency matrix grid rendering.
  - Filter criteria filtering.
  - Unresolved edge highlighting.
- **Missing / Gap:**
  - Navigation jumps to graph on feature anchor selection.
  - Metric-based row/column sorting (sorting by highest fan-in/fan-out or cyclic density).
  - Cell hover tooltips displaying caller/callee method details.

### 1.3 `daFindingsView` (Partial Migration of `FindingsPanel.tsx`)
- **Implemented:**
  - Client-side derivation of 3 core finding categories:
    1. Circular dependencies (`cycles[]`).
    2. Unhandled hub classes (`coupling > 15` or `fanIn > 10`).
    3. Structural risk / untested components.
  - Accordion list presentation with severity badges.
  - Finding category filtering.
- **Missing / Gap:**
  - Rule-based evaluation engine (`lib/intelligence/rules/`).
  - Rule explanation drawers and suggested remediation actions.
  - Handoff from finding directly to Investigation Drawer or Refactor Simulator.

---

## 2. Ported But Unused / Disconnected Algorithms (`daLayoutEngine.js`)

In `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`, several advanced layout algorithms were ported from the original application and have passing unit tests in `run-poc-tests.cjs`, but are **completely disconnected from the UI**:

| Exported Function | Lines in `daLayoutEngine.js` | Status | Why It Is Disconnected |
|---|---|---|---|
| `computeOrbitLayout` | Lines 130–368 | **PORTED_NOT_INTEGRATED** | Computes radial orbit coordinates for nodes and satellite satellites. It is not imported by `daGraphViewer` or `daAppShell`, and no Orbit/Radar view is registered in `daAppShell.html`. |
| `computeConstellationLayout` | Lines 369–519 | **PORTED_NOT_INTEGRATED** | Computes polar coordinates around a focal node. Tested offline, but not imported by any LWC and no Constellation view tab exists. |
| `computeSankeyLayout` | Lines 520–648 | **PORTED_NOT_INTEGRATED** | Computes multi-stage Sankey column flow coordinates. Not imported by any LWC and no River view tab exists. |

---

## 3. Disconnected / Legacy LWC Components

### `lwc/graphViewer` (Legacy POC Component)
- `scratch/salesforce-poc/force-app/main/default/lwc/graphViewer/`
- Contains early prototype code (`graphViewer.js`, `graphViewer.html`).
- Hardcodes `@api projectId = 'pbim'`.
- Not instantiated in `daAppShell.html` (superseded by `c-da-graph-viewer`).
- Status: **DEPRECATED / ORPHANED ARTIFACT**.
