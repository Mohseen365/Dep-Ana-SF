# Analysis Views UX Specification & Architecture

## Overview

This document specifies the redesigned **Analysis Views UX** for the Dependency Explorer. It details the design goals, navigation patterns, structured communication models, and progressive disclosure principles for the core analytical views: **Findings**, **Hotspots**, **Impact**, and **Compare**.

---

## 1. Core UX Principles & Invariants

1. **UI/UX Refinement Only:** Analysis logic, Cytoscape graph construction, risk rules, and contract structures are 100% preserved.
2. **Coherent Analysis Modes:** Every analytical view presents a consistent mode indicator navigation bar:
   `Graph | Findings | Hotspots | Impact | Compare`
3. **Structured Communication over Raw Data Dumps:** Views eliminate cramped modals and overwhelming lists by structuring insight into clear, actionable sections.
4. **Progressive Disclosure:** Primary metrics and summaries are displayed first; expanding cards or selecting tabs discloses detailed evidence, metric breakdowns, and source locations.
5. **Action Preservation:** All existing interactive capabilities (selection, filtering, investigation drill-down, review status state changes, snapshot comparison, file uploads) remain fully supported and verified.

---

## 2. Redesigned View Specifications

### 2.1 Findings UX: Issue-Oriented Architecture Interface
- **Purpose:** Transform technical rule violations into a clear, prioritized issue triage interface.
- **Categorization & Severities:**
  - **Critical:** Severe rule violations blocking architectural stability.
  - **High:** High-risk architectural hotspots or cycles.
  - **Warning (Medium):** Moderate coupling or unresolved references.
  - **Informational (Low / Info):** Low-risk signals and component information.
- **Structured Communication Structure:**
  Each finding card explicitly structures information into four clear sections:
  1. **WHAT:** Finding title, severity badge, rule name, and description.
  2. **WHY IT MATTERS:** Contextual explanation detailing architectural risk (e.g., blast radius of high fan-in hubs, test isolation breakdown in circular dependencies, or runtime failure risk in unresolved references).
  3. **WHERE:** Participating component count (`nodeIds`), file paths, line numbers, evidence code snippets, and direct "Open in editor" links.
  4. **WHAT TO DO NEXT:** Actionable remediation bar (e.g., 🔍 Investigate Component, ⏳ Mark In Review, ✓ Resolve / 🔄 Reopen, and Evidence Expansion toggle).
- **Filtering & Workflow:** Status filtering by *Unresolved (default)*, *Resolved*, and *All*, alongside interactive severity toggles.

### 2.2 Hotspots UX: Clear Ranking & Readiness Analysis
- **Purpose:** Provide architectural ranking and refactoring readiness analysis.
- **Ranking System:**
  - Clear numerical rank badges (`#1`, `#2`, `#3`...) for top-ranked architectural hotspots.
  - Metrics grid displaying **Fan-In**, **Fan-Out**, **Coupling Score**, and overall **Hotspot Score**.
- **Progressive Disclosure:**
  - Compact summary rows show rank, component name, and risk score.
  - Expansion toggle reveals the full metric grid and action controls (Select Component, Analyze Impact).
- **Categorized Tabs:**
  - `Top Ranked` | `High Risk` | `Fan-In` | `Coupling` | `Cycles` | `Unresolved` | `Readiness`
- **Refactoring Readiness:**
  - Categorizes components into `GOOD CANDIDATE`, `CAUTION`, and `HIGH CAUTION`.
  - Includes a safety filter checkbox: *"Hide nodes with any HIGH CAUTION dependent"*.

### 2.3 Impact UX: Blast Radius & Refactoring Impact
- **Purpose:** Communicate the exact blast radius and dependent ripple effect when modifying or refactoring a component.
- **Structured Communication Structure:**
  1. **Selected Component:** Origin Node ID, Type, and Risk Level badge.
  2. **Direct Impact:** Immediate dependent count and list of direct affected components.
  3. **Indirect Impact:** Transitive dependent count with interactive depth filter (`Depth 1`, `Depth 2`, `Depth 3`, `ALL Transitive`).
  4. **Affected Components:** Summary card grid displaying Impacted Components, Impacted Tests, Cycles Involved, Unresolved References, and Visible Count.
  5. **Actions:** `Show Impact` / `Exit Impact` toggle, Depth selector dropdown.
- **Progressive Disclosure:**
  - Metric summary cards at top -> Expandable breakdown list for direct dependents and impacted unit tests (`🧪`).

### 2.4 Compare UX: Dedicated 3-Step Snapshot Diff Workflow
- **Purpose:** Provide an intuitive step-by-step workflow for comparing baseline vs target architecture snapshots.
- **Dedicated 3-Step Workflow:**
  - **Step 1: Select Snapshots:** Side-by-side JSON input textareas, file uploaders, and a *"Load Sample Snapshots"* preset button.
  - **Step 2: Diff Summary:** Executive 7-card diff metric summary grid (`+ Nodes`, `- Nodes`, `Changed Nodes`, `+ Edges`, `- Edges`, `New Cycles`, `Removed Cycles`).
  - **Step 3: Categorized Inspection:** Filterable change list by category (`All Changes`, `Nodes`, `Edges`, `Cycles`). Interactive cards display property transitions (`property: before ➔ after`) and a 🔍 *Focus on Graph* action button.

---

## 3. Design System & CSS Token Adherence

All redesigned views consume standardized design system tokens and component classes declared in `UI_DESIGN_SYSTEM.md`:
- **Surface Elevation:** `--surface-panel`, `--surface-card`, `--surface-subtle`, `--surface-hover`.
- **Borders & Focus:** `--border-default`, `--border-subtle`, `--border-strong`, `--border-focus`.
- **Risk Colors:** `--risk-critical`, `--risk-high`, `--risk-medium`, `--risk-low`.
- **Scoped Styles:** All component styles are namespaced under `.findings-panel`, `.hotspot-panel`, `.impact-controls`, and `.compare-panel-container` in `findings.css` and `panels.css`.

---

## 4. Test Verification & Contract Stability

All Vitest unit test suites for analysis views pass without regressions:
- `FindingsPanel.test.tsx` (6 passed)
- `HotspotPanel.test.tsx` (5 passed)
- `ImpactControls.test.tsx` (4 passed)
- `ComparePanel.test.tsx` (6 passed)
