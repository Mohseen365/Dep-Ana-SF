# Risk, Cycles, and Unresolved References

## Overview

This document describes the architectural diagnostics implemented in the Salesforce Architecture & Refactoring Explorer for Prompt 11:
1. **Risk Presentation & Filtering**
2. **Circular Dependencies Visualization & Highlighting**
3. **Unresolved References Diagnostics & Evidence Linkage**

---

## 1. Risk Presentation

### Source of Truth
Risk evaluation and risk scores remain entirely deterministic and managed by `dependency-analyzer.cjs`. React/Explorer does NOT calculate risk scores or infer new risk metrics.

### Explorer Node Data Used
- `risk`: Risk level classification (`HIGH`, `MEDIUM`, `LOW`).
- `riskReasons`: String array containing specific reasons for risk level (e.g. `High coupling`, `Participates in cycle`).
- `metrics`: Fan-In, Fan-Out, Coupling, Unresolved count, Score.
- `refactoringReadiness`: Flags indicating high risk, cycles, unresolved dependencies, and test coverage status.

### Presentation
Selected component details in `DetailsPanel.tsx` clearly display:
- **Risk Level**: High-visibility badge and risk text (`HIGH`, `MEDIUM`, `LOW`).
- **Risk Evaluation Reasons**: Bulleted list of analyzer-provided `riskReasons`.
- **Empty Reason Fallback**: If no risk reasons exist, displays `No additional risk reasons provided by analyzer.`

### Summary & Filtering
- Summary Bar displays top-level counts for `High Risk`, `Medium Risk`, and `Low Risk`.
- Clicking a risk summary item toggles the `riskFilter` in `SearchFilterState` to filter/focus the Cytoscape graph without destroying other search/filter state.

---

## 2. Circular Dependencies (Cycles)

### Source of Truth
Cycles are provided deterministically in `explorer-data.json` under the `cycles` array (`ExplorerCycleGroup[]`). No cycle detection algorithms (e.g. Tarjan SCC) are executed in React.

### Cycle Presentation
- **Summary Count**: `Cycles: X` displayed in `SummaryBar.tsx`.
- **Diagnostics Panel**: Clicking `Cycles` in `SummaryBar.tsx` opens `DiagnosticsPanel.tsx` on the Cycles tab.
- **Cycle Explorer**: Displays cycle groups (e.g. `Circular Dependency #1`) with component loop flows (e.g. `AssetDashboardService ↓ AssetHelper ↓ AssetDashboardService`).

### Graph Highlighting
When a cycle is selected:
- Participating cycle nodes are highlighted (`.highlighted` class with glowing amber border).
- Connecting edges between cycle nodes are highlighted (`.highlighted` class with amber line).
- Unrelated graph nodes and edges are muted (`.dimmed` class with 15% opacity).
- Viewport animates and fits bounds to the cycle components.
- Clicking "Clear Cycle Highlight" restores standard graph styling.

---

## 3. Unresolved References

### Source of Truth
Unresolved references are provided deterministically in `explorer-data.json` under `unresolvedReferences` (`ExplorerUnresolvedReference[]`).

### Semantic Distinction
The UI explicitly communicates the architectural difference between:
1. **No dependency exists**: No edge or relationship present.
2. **Dependency exists but target is unresolved**: A reference exists in source code, but the target symbol was not resolved in the registry (e.g., missing package, external system, removed component).

### Diagnostics View
- **Summary Count**: `Unresolved: X` displayed in `SummaryBar.tsx`.
- **Diagnostics Panel**: Displays a banner highlighting the explicit semantic distinction, followed by detailed unresolved reference cards:
  - Source Component (`sourceNodeId` / display name)
  - Target Symbol (`targetName`)
  - Target Type (`targetType`)
  - File Location & Line (`file:line`)
  - Code Evidence (`evidence`)
  - Reason (`reason`)
- **Interactive Linkage**: Clicking "Inspect Edge & Evidence" selects the corresponding edge in Cytoscape, centers the viewport, and opens relationship evidence details in `DetailsPanel.tsx`.

---

## 4. Combining Diagnostics

A selected component can simultaneously have:
- `HIGH` risk level
- Cycle participation (`refactoringReadiness.hasCycles`)
- Unresolved references (`refactoringReadiness.hasUnresolved`)

These states coexist in the UI without forcing one diagnostic view to overwrite another.

---

## 5. Automated Testing

### Test Suites
- `src/components/DiagnosticsPanel.test.tsx`: Cycle card rendering, cycle selection/highlight toggles, unresolved reference card rendering, semantic distinction banner, empty data safety.
- `src/components/DetailsPanel.test.tsx`: Risk badge and reasons display, empty risk reasons fallback, edge evidence, unresolved edge indication.
- `src/components/SummaryBar.test.tsx`: Summary value rendering, clickable risk filter triggers, cycles/unresolved click handlers.
- `src/lib/graph-interactions.test.ts`: Cycle highlighting and dimming functions.
- `src/lib/search-filter.test.ts`, `src/lib/focus-graph.test.ts`, `src/lib/graph-builder.test.ts`, `src/lib/graph-style.test.ts`: Full regression test coverage.

### Verification Results
- `node scripts/test-export-explorer.cjs`: All 12 validation invariants and graph comparison checks passed.
- `npm test`: 116 tests passed across 8 test suites.
- `npm run build`: Production bundle compiled successfully (`tsc && vite build`).
