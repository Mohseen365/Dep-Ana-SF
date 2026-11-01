# Report 5: Salesforce Unmigrated Code Register

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** Read-Only Audit

---

## 1. Summary of Confirmed Unmigrated Functionality

This register catalogs all original production modules, algorithms, workflows, and UI views that currently have **zero** implementation in the Salesforce target (`scratch/salesforce-poc/force-app/main/default/`).

---

## 2. Unmigrated Workspaces & Visualizations (15 Views)

1. **Project Dashboard Surface (`src/components/ProjectDashboard.tsx`)**
   - High-level portfolio view showing project health, cyclomatic risk, coverage metrics.
2. **Snapshot Compare Engine & UI (`src/components/ComparePanel.tsx`, `src/lib/compare.ts`, `src/lib/graph-diff.ts`)**
   - Diffing logic for structural AST graph snapshots.
3. **Analysis History Browser (`src/components/AnalysisHistoryPanel.tsx`)**
   - Run timeline, chronological selector, delta indicators.
4. **Subway Map Lens (`src/components/SubwayPanel.tsx`, `src/lib/adapters/subway.ts`)**
   - Metro-line routing algorithm, transfer stations, feature track layouts.
5. **Component Tree Explorer (`src/components/FeatureTreePanel.tsx`)**
   - Tree hierarchy, package grouping, collapsible folder views.
6. **Architecture Treemap Lens (`src/components/ArchitectureTreemapPanel.tsx`, `src/lib/layout/treemap.ts`)**
   - Squarified treemap layout algorithm, size and color metric bindings.
7. **Coupling Heatmap Lens (`src/components/CouplingHeatmapPanel.tsx`)**
   - Cross-domain coupling matrix and heatmap cell rendering.
8. **Dependency River Lens (`src/components/DependencyRiverPanel.tsx`)**
   - River/Sankey UI container (layout calculation is ported in `daLayoutEngine.js` but UI is absent).
9. **Architecture DNA Lens (`src/components/ArchitectureDNABarcode.tsx`)**
   - Chromosome/barcode representation of system component types.
10. **Component Profile Lens (`src/components/FeatureProfilePanel.tsx`)**
    - Single-component deep dive (direct fan-in, fan-out, transitive blast radius).
11. **Health Radar Lens (`src/components/RadarPanel.tsx`)**
    - Polygon radar chart for structural health dimensions.
12. **Four-Direction Lens (`src/components/FourDirectionPanel.tsx`, `src/lib/adapters/four-direction.ts`)**
    - 4-quadrant exploration (upstream, downstream, peers, tests).
13. **Architectural Hotspots Surface (`src/components/HotspotPanel.tsx`, `src/lib/hotspots.ts`)**
    - Risk scoring and ranked hotspot queues.
14. **Diagnostics Surface (`src/components/DiagnosticsPanel.tsx`, `src/lib/diagnostics.ts`)**
    - AST diagnostic issue tables and validation logs.
15. **Dependency Constellation Lens (`src/components/DependencyConstellationPanel.tsx`)**
    - Constellation UI container (algorithm is ported in `daLayoutEngine.js` but UI is absent).

---

## 3. Unmigrated Core Workflows & Interactive Engines

1. **Refactoring Simulation Engine (`src/lib/change-simulator.ts`, `src/lib/refactoring-simulation.ts`)**
   - Hypothetical graph mutation: simulate moving, deleting, or splitting a component, and dynamically recomputing blast radius and breaking changes.
2. **Refactoring Handoff Workflow (`src/lib/refactor-handoff.ts`, `src/components/RefactorHandoffModal.tsx`)**
   - Generation of actionable refactoring plans, markdown exports, and task tickets.
3. **Investigation Workflow & Context (`src/context/InvestigationContext.tsx`, `src/components/InvestigationDrawer.tsx`)**
   - Pinning multiple nodes/edges into an investigation workbench; generating investigation reports.
4. **Command Palette (`src/hooks/useCommandPalette.ts`, `src/components/CommandPalette.tsx`)**
   - Keyboard shortcut modal (`Ctrl+K` / `Cmd+K`) for global node search, action triggering, and view switching.
5. **Graph Export Utility (`src/lib/export-graph.ts`, `src/lib/image-export.ts`)**
   - Client-side export of graphs to PNG, SVG, and canonical JSON.
6. **URL State Synchronization & Deep Linking (`src/lib/url/`, `src/lib/url/filterQuery.ts`)**
   - Dynamic synchronization of active project, selected node, view mode, and filter criteria to URL query parameters.
