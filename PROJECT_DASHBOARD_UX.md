# Project Dashboard UX Specification & Implementation

## Overview

This document details the completed **Project Dashboard UX** (Phase 2H) for the Salesforce Architecture & Refactoring Explorer.

The Project Dashboard provides a high-level overview of a selected Salesforce project before entering the interactive dependency graph. It bridges multi-project management (`ProjectContext`) with deep dependency graph visualization, offering instant clarity on project health, scale, architecture breakdown, risk distribution, and recent activity.

---

## IMPLEMENTATION REPORT

**Phase:** Phase 2H - Project Dashboard
**Status:** COMPLETE

### Files Changed:
- NONE in unowned phases (Strict ownership boundaries strictly preserved)

### Files Created:
- `explorer/src/components/ProjectDashboard.tsx` (Primary Project Dashboard component)
- `explorer/src/components/ProjectDashboard.test.tsx` (Unit test suite for Project Dashboard)
- `PROJECT_DASHBOARD_UX.md` (This document)

### Files Deleted:
- NONE

### Tests Run:
- `cd explorer && npm test`
- `cd explorer && npm run build`
- `node scripts/test-multi-project.cjs`
- `node scripts/test-export-explorer.cjs`

### Tests Passed:
- **100% Passed:** 46 Vitest test files (328 tests) in `explorer`, including 8/8 new tests in `ProjectDashboard.test.tsx`.
- Multi-project foundation & isolation test suite (`test-multi-project.cjs`) passed.
- Hardened data adapter validation suite (`test-export-explorer.cjs`) passed.
- Clean TypeScript compilation (`tsc`) and production build via Vite.

### UI Behavior Introduced:
- Added a standalone, clean, and informative `ProjectDashboard` overview layout.
- Provides project header banner with status indicator, source directory path, and analyzer/contract version badges.
- Renders 4 primary summary metric cards: **Component Count**, **Dependency Count**, **Findings Count** (with Critical severity indicator), and **Last Analysis** timestamp.
- Renders **Architecture Summary** grid showing metadata inventory distribution across Apex Classes, Apex Triggers, LWCs, Visualforce, Flows, and Schema Objects/Fields.
- Renders **Risk & Quality Summary** panel showing High/Medium/Low risk component distribution, circular dependency cycle count, unresolved reference count, and critical rule violations.
- Renders **Recent Activity & Timeline** section tracking analysis executions, project updates, and project registration events.
- Features primary CTA **[Explore Dependency Graph]** button with direct navigation callback.
- Includes secondary CTAs **[Run Analysis]**, **[View Findings]**, and **[View History]** with status awareness without inventing unsupported backend functionality.

### Logic & API Invariants:
- **Zero backend alterations:** Preserves 100% of dependency analysis logic in `dependency-analyzer.cjs` and graph semantics in `explorer/src/lib/`.
- **Honest status representation:** Does not fake unsupported browser analysis capabilities. The `[Run Analysis]` action displays an environment hint ("Run via CLI: node scripts/export-explorer.cjs") when in-browser execution is unavailable.

---

## 1. Component Architecture & Props Interface

### `ProjectDashboardProps` (`explorer/src/components/ProjectDashboard.tsx`)

```typescript
export interface ProjectDashboardProps {
  /** Optional project metadata; falls back to active project in ProjectContext */
  project?: ProjectMetadata | null;
  /** Optional explorer schema data; falls back to useExplorerData(project.id) */
  data?: ExplorerDataSchema | null;
  /** Optional architecture findings; falls back to computing via intelligence rules */
  findings?: ArchitectureFinding[];
  /** Optional loading override */
  loading?: boolean;
  /** Optional error override */
  error?: Error | null;
  /** Primary callback to enter/explore the dependency graph */
  onExploreGraph?: () => void;
  /** Callback to trigger re-analysis if environment supports it */
  onRunAnalysis?: () => void;
  /** Callback to navigate to findings mode */
  onViewFindings?: () => void;
  /** Callback to navigate to architecture history/comparison */
  onViewHistory?: () => void;
  /** Optional container class name */
  className?: string;
}
```

---

## 2. Dashboard Sections & Display Elements

```
+-----------------------------------------------------------------------------------------+
| [Salesforce Org Title]  [● Complete]                                                    |
| Source: force-app/main/default | Analyzer: v13.0.0 | Contract: v1.0.0                       |
|                                                                                         |
|                        [🕸️ Explore Dependency Graph]                                     |
|                        [⚡ Run Analysis]  [🔍 View Findings (N)]  [📜 View History]    |
+-----------------------------------------------------------------------------------------+
| [🧩 Component Count]  | [🔗 Dependency Count] | [⚠️ Findings Count] | [🕒 Last Analysis] |
|        42             |         88            |   2 (1 Critical)    |   Mar 1, 2026      |
+-----------------------------------------------+-----------------------------------------+
| 📊 Architecture Summary                       | 🛡️ Risk & Quality Summary               |
| - Apex Classes: 25   - Visualforce: 2         | - High Risk: 5  - Medium: 12  - Low: 25 |
| - Apex Triggers: 5   - Flows: 2               | - Circular Dependencies: 2 cycles       |
| - LWC Components: 8  - Objects/Fields: 0      | - Unresolved References: 3 unresolved   |
+-----------------------------------------------+-----------------------------------------+
| 📜 Recent Activity & Timeline                                                           |
| - Static Dependency Analysis Executed (Mar 1, 2026)                                     |
| - Project Metadata Updated (Feb 15, 2026)                                               |
| - Project Registered (Jan 1, 2026)                                                      |
+-----------------------------------------------------------------------------------------+
```

### 2.1 Header & Status Banner
- **Project Name:** Rendered in high-emphasis title typography (`22px / font-weight: 700`).
- **Project Status:** Displayed as a semantic status badge (`ui-badge`):
  - `COMPLETE`: Green status dot & tint ("Complete")
  - `ANALYZING`: Amber pulsing dot ("Analysis In Progress")
  - `NOT_ANALYZED`: Gray/blue dot ("Not Analyzed")
  - `FAILED`: Red dot ("Analysis Failed")
- **Metadata Badges:** Source directory path (`force-app/main/default`), analyzer version (`v13.0.0`), and contract version (`v1.0.0`).

### 2.2 Primary & Secondary Actions
- **Primary CTA: `[Explore Dependency Graph]`**
  Prominent button styled with `.ui-btn-primary.ui-btn-lg` triggering `onExploreGraph` callback to transition from dashboard to the Cytoscape graph canvas.
- **Secondary CTA: `[Run Analysis]`**
  Triggers `onRunAnalysis` if supported. When running in client-only mode where in-browser analysis is unsupported, renders a disabled button with tooltip instructions ("Analysis can be run via CLI: node scripts/export-explorer.cjs") adhering strictly to the "no fake functionality" rule.
- **Secondary CTA: `[View Findings]`**
  Triggers `onViewFindings` callback to jump directly to the findings view, displaying the active count of unresolved rule violations.
- **Secondary CTA: `[View History]`**
  Triggers `onViewHistory` callback to navigate to snapshot comparison and architectural timeline diffs.

### 2.3 Summary Metrics Cards
Four metric cards displayed in a responsive grid (`repeat(auto-fit, minmax(240px, 1fr))`):
1. **Component Count:** Total metadata components (`nodeCount`).
2. **Dependency Count:** Total static & heuristic relationships (`edgeCount`).
3. **Findings Count:** Total rule violations detected with a red pill showing critical severity counts if present.
4. **Last Analysis:** Formatted date & time of snapshot generation (`lastAnalyzedAt` or `generatedAt`).

### 2.4 Architecture Summary
Categorized breakdown of workspace metadata elements:
- **Apex Classes:** Total `.cls` components.
- **Apex Triggers:** Total `.trigger` components.
- **LWC Components:** Total Lightning Web Component bundles.
- **Visualforce:** Total Visualforce pages/components.
- **Flows:** Total declarative flow processes.
- **Objects & Fields:** Total schema object and custom field definitions.

### 2.5 Risk & Quality Summary
Visual risk indicators:
- **Risk Level Breakdown:** Cards for High Risk, Medium Risk, and Low Risk component counts using design system risk tints (`rgba(239,68,68,0.12)`, `rgba(245,158,11,0.12)`, `rgba(16,185,129,0.12)`).
- **Structural Integrity Counters:** Circular dependency cycle count (`data.cycles.length`), unresolved references count (`data.unresolvedReferences.length`), and critical severity findings count.

### 2.6 Recent Activity & Timeline
Chronological event stream detailing key repository milestones:
- **Analysis Execution:** Timestamp and metadata summary of the latest static analysis run.
- **Metadata Updates:** Last project configuration modification timestamp.
- **Project Registration:** Initial setup timestamp for the Salesforce project.

---

## 3. Design System Adherence

The implementation strictly consumes tokens and utility classes defined in `UI_DESIGN_SYSTEM.md`:
- **Surface Elevation:** Uses `--surface-panel` (`#111827`) for card backgrounds, `--surface-card` (`#1e293b`) for section headers, and `--surface-subtle` (`#0f172a`) for nested inventory rows.
- **Borders & Dividers:** Subtle structural borders (`--border-default` / `#334155`) with rounded corners (`--radius-lg` / `8px`).
- **Typography:** Hierarchy using `--text-primary` (`#f8fafc`), `--text-secondary` (`#cbd5e1`), and `--text-muted` (`#94a3b8`).
- **Color Semantics:** Risk levels mapped directly to `--risk-high` (`#ef4444`), `--risk-medium` (`#f59e0b`), and `--risk-low` (`#10b981`).

---

## 4. Verification & Testing Strategy

The component was validated through automated Vitest unit tests in `explorer/src/components/ProjectDashboard.test.tsx`:
1. **Rendering Invariants:** Verified project metadata, status pill, metric cards, architecture breakdown, risk pills, and timeline items render expected values.
2. **Action Callbacks:** Verified clicking `[Explore Dependency Graph]`, `[Run Analysis]`, `[View Findings]`, and `[View History]` invokes expected callbacks.
3. **Disabled Action Safety:** Verified disabled state and tooltip attributes when analysis execution is unavailable.
4. **Data Fallbacks:** Verified fallback handling when optional props are omitted or context is used.

---

## 5. Cross-Phase Handoff Notes (Wave 4 Final Integration)

During Wave 4 (Final Integration):
- **Wiring in `App.tsx`:** The Integration Lead can mount `ProjectDashboard` in `App.tsx` as a top-level workspace view mode or landing view (`viewMode === 'dashboard'`).
- **Callback Wiring:**
  - `onExploreGraph`: Call `setViewMode('graph')`.
  - `onViewFindings`: Call `setViewMode('findings')`.
  - `onViewHistory`: Call `palette.open('compare')`.
