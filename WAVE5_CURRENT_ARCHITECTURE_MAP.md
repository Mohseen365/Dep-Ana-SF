# WAVE 5 — CURRENT ARCHITECTURE MAP & PIPELINE FLOW

**Author:** Jules (Software Engineer Agent)
**Date:** September 19, 2026
**Status:** Post-Wave 4 Architectural Baseline

---

## OVERVIEW

This document outlines the end-to-end architecture and pipeline stages of the Salesforce Dependency Analyzer and Architecture Explorer following the completion and freeze of the Wave 4 Spatial Layout Engine.

```text
               Analyzer (dependency-analyzer.cjs)
                                ↓
               Export / Data Contract (scripts/export-explorer.cjs)
                                ↓
               Explorer Data Loading (useExplorerData.ts)
                                ↓
               Graph Model (schema.ts, types/explorer.ts)
                                ↓
               Filtering / Focus / Visibility (focus-graph.ts, search-filter.ts)
                                ↓
               Position Authority (position-policy.ts)
                                ↓
               Architecture Layout (architecture-layout.ts)
                                ↓
               Cytoscape Rendering (GraphView.tsx, graph-builder.ts, graph-style.ts)
                                ↓
               UI Controls / Interaction (GraphControls.ts, ProjectStateContext.tsx)
```

---

## 1. STAGE DETAILS & PIPELINE CONTRACTS

### STAGE 1: ANALYZER
- **Primary Files:** `dependency-analyzer.cjs`, `layer-classifier.cjs`, `domain-classifier.cjs`, `role-classifier.cjs`, `entry-points.cjs`, `path-analyzer.cjs`
- **Responsibilities:** Performs static code analysis on Salesforce Apex, LWC, Visualforce, Flow, Objects, Custom Fields, and Triggers. Produces deterministic dependency reports, health metrics, and snapshot data.
- **Inputs:** Source directory path (e.g., `force-app/main/default`).
- **Outputs:** `dependency-report.json`, `architecture-metrics.json`, `analysis-snapshot.json`.
- **Important Invariants:** Single source of truth for static dependency extraction. Must remain deterministic, offline, and independent of LLMs or external runtimes.
- **Tests:** `scripts/test-cli-integration.cjs`, `scripts/test-layers.cjs`, `scripts/test-domains.cjs`, `scripts/test-roles.cjs`.
- **Known Coupling:** Consumed directly by the exporter adapter script.

---

### STAGE 2: EXPORT / DATA CONTRACT
- **Primary Files:** `scripts/export-explorer.cjs`, `scripts/test-export-explorer.cjs`
- **Responsibilities:** Transforms analyzer outputs into the canonical `explorer-data.json` format validated against `ExplorerDataSchemaZ`. Handles node/edge type normalization, test coverage mapping, and multi-project artifact synchronization.
- **Inputs:** Raw JSON outputs from Stage 1 (`dependency-report.json`, `architecture-metrics.json`, `analysis-snapshot.json`).
- **Outputs:** `explorer/public/explorer-data.json`, `explorer/public/projects/<projectId>/explorer-data.json`.
- **Important Invariants:**
  - Every edge source and target must exist in the node set.
  - Node types and `testCoverageStatus` mapped strictly to standard enums.
  - Canonical `source` and `target` sub-objects populated with fallback defaults.
- **Tests:** `scripts/test-export-explorer.cjs` (12 validation invariants + graph equivalence comparison).
- **Known Coupling:** Synchronizes files into `explorer/public/` for React frontend consumption.

---

### STAGE 3: EXPLORER DATA LOADING
- **Primary Files:** `explorer/src/hooks/useExplorerData.ts`, `explorer/src/context/ProjectContext.tsx`
- **Responsibilities:** Fetches `explorer-data.json` asynchronously, validates JSON payload using Zod `parseExplorerData` schema validator, and exposes active project graph data to React context.
- **Inputs:** Active `projectId` or default `/explorer-data.json` URL path.
- **Outputs:** Validated `ExplorerDataSchema` object, loading state, error state, and reload triggers.
- **Important Invariants:**
  - Rejects malformed JSON via Zod schema enforcement.
  - Isolates data fetching per project ID.
- **Tests:** `explorer/src/hooks/useExplorerData.test.ts`, `explorer/src/context/ProjectContext.test.tsx`.
- **Known Coupling:** Supplies raw schema data to `useViewState`, `App.tsx`, and state context providers.

---

### STAGE 4: GRAPH MODEL
- **Primary Files:** `explorer/src/types/explorer.ts`, `explorer/src/lib/schema.ts`, `explorer/src/lib/graph-builder.ts`
- **Responsibilities:** Defines TypeScript types and Zod schemas for nodes, edges, summary metrics, cycles, and unresolved references. Converts raw schema nodes and edges into Cytoscape element definitions (`ElementDefinition[]`).
- **Inputs:** `ExplorerNode[]` and `ExplorerEdge[]`.
- **Outputs:** Typed graph data models and Cytoscape raw element arrays (`nodes` and `edges`).
- **Important Invariants:**
  - Cytoscape node ID maps 1:1 to `ExplorerNode.id`.
  - Edge data retains canonical relationship type, evidence, and risk attributes.
- **Tests:** `explorer/src/lib/schema.test.ts`, `explorer/src/lib/graph-builder.test.ts`.
- **Known Coupling:** Used across all downstream frontend modules (layout, rendering, filtering, selection).

---

### STAGE 5: FILTERING / FOCUS / VISIBILITY
- **Primary Files:** `explorer/src/lib/focus-graph.ts`, `explorer/src/lib/search-filter.ts`
- **Responsibilities:**
  1. Computes focus subgraphs (`computeFocusedGraph`) based on active `focusNodeId`, depth ($1..5$), direction (`incoming`, `outgoing`, `both`), and cycle mode.
  2. Applies visibility filters (`applyFilters`) based on node types, risk levels, and search text queries.
- **Inputs:** Full graph `nodes` and `edges`, active focus settings, active filter state.
- **Outputs:** Filtered/focused subset `{ nodes: ExplorerNode[], edges: ExplorerEdge[] }`.
- **Important Invariants:**
  - Pipeline sequence invariant: `FOCUS TOPOLOGY → VISIBILITY FILTER`.
  - Node-type and risk filtering operates downstream of focus calculation to prevent topology fracturing.
  - Omitted nodes are removed from visible element updates but retain their position state in `sessionPositionsRef`.
- **Tests:** `explorer/src/lib/focus-graph.test.ts`, `explorer/src/lib/search-filter.test.ts`.
- **Known Coupling:** Called inside `App.tsx` and `GraphView.tsx` during state updates.

---

### STAGE 6: POSITION AUTHORITY
- **Primary Files:** `explorer/src/lib/position-policy.ts`, `explorer/src/lib/position-policy.test.ts`
- **Responsibilities:** Enforces the 5-level Position Authority hierarchy and governs whether automatic relayouts execute via `shouldAutoLayout(mode, trigger)`.
- **Inputs:** `LayoutMode` (`static` | `interactive`), `LayoutTrigger`, session drag positions, persisted positions, Cytoscape positions.
- **Outputs:** `ResolvedPosition` (coordinates + authority level $1..5$), boolean or `'place-new-only'` relayout decision.
- **Important Invariants:**
  - Strict 5-level hierarchy:
    1. Level 1: User drag session (`sessionPositionsRef`)
    2. Level 2: Persisted project state (`persistedPositions` in `localStorage`)
    3. Level 3: Existing Cytoscape canvas positions
    4. Level 4: Intelligent initial layout
    5. Level 5: Deterministic neighbor-average / hash fallback
  - Static Mode invariant: `shouldAutoLayout` returns `false` for filters, focus, depth, direction, selection, investigation, and mode switches.
- **Tests:** `explorer/src/lib/position-policy.test.ts`, `explorer/src/components/GraphView.positionAuthority.test.tsx`.
- **Known Coupling:** Directly controls coordinate assignment in `GraphView.tsx` element updates.

---

### STAGE 7: ARCHITECTURE LAYOUT
- **Primary Files:** `explorer/src/lib/architecture-layout.ts`, `explorer/src/lib/layout/*`
- **Responsibilities:** Orchestrates the 11-stage spatial positioning engine (`computeArchitectureLayout`):
  1. Graph analysis & centrality metrics (`analysis.ts`, `centrality.ts`)
  2. Architectural layer classification (`layers.ts`)
  3. Domain discovery (`domains.ts`)
  4. Global domain order & region calculation (`global-layout.ts`)
  5. Layer ordering & crossing minimization (`ordering.ts`)
  6. Primary production node placement (`local-layout.ts`)
  7. Hub/bridge inter-layer corridor placement (`centrality.ts`)
  8. Satellite node placement (`satellites.ts`)
  9. Horizontal component packing (`components.ts`)
  10. 2D spatial collision cleanup & min-spacing resolution (`spacing.ts`)
  11. Position Authority coordinate restoration (`position-policy.ts`)
- **Inputs:** `ExplorerNode[]`, `ExplorerEdge[]`, optional layout options.
- **Outputs:** Map of node coordinates `Record<string, { x: number, y: number }>`.
- **Important Invariants:**
  - Frozen Wave 4 spatial layout baseline: 0 node overlaps, 0 component overlaps, 100% deterministic, input-order invariant.
  - Layers assigned fixed vertical bands (`presentation` Y=100, `application` Y=350, `domain` Y=600, `schema` Y=850).
- **Tests:** `explorer/src/lib/architecture-layout.test.ts`, `explorer/src/lib/layout/*.test.ts` (262 tests).
- **Known Coupling:** Executed when initial layout runs or when explicit Reset Layout is triggered.

---

### STAGE 8: CYTOSCAPE RENDERING
- **Primary Files:** `explorer/src/components/GraphView.tsx`, `explorer/src/lib/graph-style.ts`
- **Responsibilities:** Instantiates Cytoscape canvas instance, applies styling rules (colors, shapes, borders, edge arrows, highlight/fade states), and imperatively synchronizes elements via `cy.batch()`.
- **Inputs:** Visible nodes/edges, calculated positions, active selection, highlight states.
- **Outputs:** Rendered DOM canvas, viewport camera zoom/pan, interaction event listeners (`dragfree`, `select`, `unselect`, `tap`).
- **Important Invariants:**
  - Canvas initialized once on mount (`[]`).
  - Viewport preservation invariant: Ordinary node/edge selection updates state without triggering camera animation, center, zoom, pan, or fit.
  - On `dragfree`, user drag coordinates captured into `sessionPositionsRef` (Level 1) and persisted (Level 2).
- **Tests:** `explorer/src/components/GraphView.test.tsx`, `explorer/src/components/GraphView.runtimeIntegration.test.tsx`.
- **Known Coupling:** Interacts directly with Cytoscape DOM element and Cytoscape Navigator.

---

### STAGE 9: UI CONTROLS / INTERACTION
- **Primary Files:** `explorer/src/components/GraphControls.tsx`, `explorer/src/context/ProjectStateContext.tsx`, `explorer/src/components/FocusControls.tsx`, `explorer/src/components/InvestigationDrawer.tsx`
- **Responsibilities:** Renders top bar controls (Static/Interactive mode toggle, Reset Layout, Focus depth/direction, Search filter), sidebar panels, investigation drawer, and project state persistence.
- **Inputs:** User clicks, toggle switches, form inputs.
- **Outputs:** Updated React state, `localStorage` project state updates, URL query parameter updates (`useViewState`).
- **Important Invariants:**
  - Project state isolated per project ID in `localStorage` under `explorer.projectState.<projectId>`.
  - Controls must non-destructively overlay graph viewport without displacing graph elements.
- **Tests:** `explorer/src/components/GraphControls.test.tsx`, `explorer/src/context/ProjectStateContext.test.tsx`, `explorer/src/components/GraphView.layoutModeToggle.test.tsx`.
- **Known Coupling:** Drives Stage 5 (filtering/focus) and Stage 6 (position policy) updates.
