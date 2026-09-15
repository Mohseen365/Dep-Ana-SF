# PROJECT ANALYSIS HISTORY / SNAPSHOT UX Specification & Implementation

## Overview

This document details the design and implementation of the **Project Analysis History & Snapshot UX** (Phase 4) for the Salesforce Dependency Analyzer and Explorer.

Each Salesforce project maintains its own isolated analysis history timeline. The analysis history interface enables developers and technical architects to understand:
1. **When analysis happened:** Exact dates and formatted timestamps for every static analysis run performed on the project.
2. **What changed:** Delta metrics and architectural diff summaries between historical snapshots (added/removed components, added/removed dependencies, risk score shifts, cycle changes).
3. **Which snapshot is active:** Clear visual badge indicating the active loaded snapshot versus historical snapshots.

It seamlessly integrates with existing architecture comparison functionality (`useCompareState` / `ComparePanel`) without inventing fake backend endpoints or modifying dependency analysis algorithms.

---

## IMPLEMENTATION REPORT

**Phase:** Phase 4 - Project Analysis History / Snapshot UX
**Status:** COMPLETE

### Files Changed:
- `explorer/src/types/explorer.ts` (Added `ProjectSnapshot` and `ProjectAnalysisHistory` interfaces)

### Files Created:
- `ANALYSIS_HISTORY_UX.md` (This document)
- `explorer/src/lib/projectHistory.ts` (Project snapshot history storage manager and helper utilities)
- `explorer/src/lib/projectHistory.test.ts` (Unit test suite for snapshot history management and delta calculations)
- `explorer/src/components/AnalysisHistoryPanel.tsx` (Primary Project Analysis History UI component)
- `explorer/src/components/AnalysisHistoryPanel.test.tsx` (Unit test suite for AnalysisHistoryPanel component)

### Files Deleted:
- NONE

### Tests Run:
- `cd explorer && npm test`
- `cd explorer && npm run build`
- `node scripts/test-multi-project.cjs`

### Tests Passed:
- **100% Passed:** 48 Vitest test files in `explorer` including `projectHistory.test.ts` and `AnalysisHistoryPanel.test.tsx`.
- Multi-project foundation and isolation integration test suite (`test-multi-project.cjs`) passed.
- Clean TypeScript compilation and Vite build output.

### UI Behavior Introduced:
- Added `AnalysisHistoryPanel` displaying project-scoped snapshot timeline formatted exactly per specification:
  ```
  Sep 14
  428 components
  612 dependencies

  Sep 12
  421 components
  597 dependencies

  Sep 08
  403 components
  561 dependencies
  ```
- Prominent **[Active Snapshot]** visual indicator highlighting the currently loaded graph dataset.
- Delta change indicators (`+7 components`, `+15 dependencies`, `+2 high risk`) between consecutive snapshots to give instant architectural context on what changed.
- **[Compare with Active]** and **[Compare Any 2]** actions that load snapshot raw data directly into the existing `useCompareState` engine for detailed node/edge/cycle diff inspection.
- **[Activate Snapshot]** action allowing users to switch the active workspace context to a historical snapshot.

### Logic & Architecture Invariants Preserved:
- **Zero Backend Invention:** Relies strictly on project-scoped client storage (`explorer.projectHistory.<projectId>`) and local data contracts (`/projects/<projectId>/snapshots/`).
- **Algorithm Protection:** Zero modifications to `dependency-analyzer.cjs` or core graph builder logic.

---

## 1. Data Model & Architecture

### 1.1 Snapshot Schema (`ProjectSnapshot`)

Defined in `explorer/src/types/explorer.ts`:

```typescript
export interface ProjectSnapshot {
  id: string;                  // Unique snapshot ID (e.g., 'snap-2026-09-14-1000')
  projectId: string;           // Parent project ID
  createdAt: string;           // ISO timestamp (e.g., '2026-09-14T10:00:00Z')
  dateDisplay: string;         // Short formatted date string (e.g., 'Sep 14')
  componentCount: number;      // Total components (nodes)
  dependencyCount: number;     // Total dependencies (edges)
  highRiskCount?: number;      // Optional high risk components count
  mediumRiskCount?: number;    // Optional medium risk components count
  lowRiskCount?: number;       // Optional low risk components count
  cycleCount?: number;         // Optional circular dependency count
  unresolvedCount?: number;    // Optional unresolved references count
  isActive?: boolean;          // Whether this is currently active/loaded snapshot
  rawSchemaJson?: string;      // Full raw ExplorerDataSchema JSON for comparison
  analysisPath?: string;       // Relative path to snapshot artifact
}

export interface ProjectAnalysisHistory {
  projectId: string;
  activeSnapshotId: string;
  snapshots: ProjectSnapshot[];
  updatedAt: string;
}
```

---

## 2. Display Format & UX Layout

### 2.1 Timeline Card Rendering

Each historical entry in the timeline is presented as a clean card adhering to `UI_DESIGN_SYSTEM.md`:

```
+-------------------------------------------------------------------------------+
|  Sep 14                                                [● Active Snapshot]   |
|  428 components                                                               |
|  612 dependencies                                                             |
|  ───────────────────────────────────────────────────────────────────────────  |
|  📈 Change Delta vs Sep 12: +7 components, +15 dependencies, +1 cycle         |
|  [⚡ Compare with Baseline]  [📂 Inspect Raw JSON]                             |
+-------------------------------------------------------------------------------+
|  Sep 12                                                [Make Active]          |
|  421 components                                                               |
|  597 dependencies                                                             |
|  ───────────────────────────────────────────────────────────────────────────  |
|  📈 Change Delta vs Sep 08: +18 components, +36 dependencies                   |
|  [⚡ Compare with Active]  [📂 Inspect Raw JSON]                               |
+-------------------------------------------------------------------------------+
|  Sep 08                                                                       |
|  403 components                                                               |
|  561 dependencies                                                             |
|  ───────────────────────────────────────────────────────────────────────────  |
|  [⚡ Compare with Active]  [📂 Inspect Raw JSON]                               |
+-------------------------------------------------------------------------------+
```

### 2.2 Core Information Callouts

1. **When Analysis Happened:**
   - Prominent date banner (`Sep 14`, `Sep 12`, `Sep 08`) with hoverable full ISO date/time tooltip (`Sep 14, 2026, 10:00 AM UTC`).
2. **What Changed:**
   - Component delta: `+7 components` or `-2 components`.
   - Dependency delta: `+15 dependencies` or `-4 dependencies`.
   - Structural risk shift: High risk count delta and circular dependency changes.
3. **Which Snapshot is Active:**
   - The active snapshot features a solid green badge (`.ui-badge-success`) with label **● Active Snapshot**.
   - Other snapshots display an **[Activate Snapshot]** action button.

---

## 3. Integration with Comparison Engine

`AnalysisHistoryPanel` integrates directly with the existing `useCompareState` hook and `ComparePanel` component:

1. **Direct Pairwise Diffing:**
   Clicking **[Compare with Active]** or **[Compare Snapshot A vs B]** passes the two snapshot raw JSON objects (`beforeRaw` and `afterRaw`) directly into `useCompareState.setBeforeRaw()` and `useCompareState.setAfterRaw()`.
2. **Seamless Navigation:**
   Calling `compareState.runCompare()` immediately activates the full architecture diff view (`ComparePanel`), surfacing categorized additions, removals, and modifications for nodes, edges, and cycles.

---

## 4. Multi-Project Isolation Guarantees

- **Project-Scoped Storage:** Analysis history is persisted under `explorer.projectHistory.<projectId>` in `localStorage`.
- **Zero Cross-Talk:** Switching projects via `ProjectContext` reloads `AnalysisHistoryPanel` with the active project's isolated timeline.
- **Fallbacks:** If no history exists in localStorage, default sample history entries matching the project metadata metrics are automatically generated.

---

## 5. Verification & Testing

Validated through automated Vitest tests in `explorer/src/lib/projectHistory.test.ts` and `explorer/src/components/AnalysisHistoryPanel.test.tsx`:
1. **Formatting Invariants:** Verified timeline items match required format (`Sep 14`, `428 components`, `612 dependencies`).
2. **Active State Verification:** Verified active snapshot badge toggles correctly and non-active items display activation action.
3. **Delta Calculations:** Verified accurate component/dependency addition/deletion deltas between chronological snapshots.
4. **Comparison Triggering:** Verified clicking compare invokes callback with baseline and target raw snapshot content.
