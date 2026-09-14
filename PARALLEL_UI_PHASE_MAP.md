# Parallel UI Execution Phase Map & Dependency Matrix

## Overview
This document outlines the recommended execution waves, inter-phase dependencies, and safety guarantees for implementing the UI/UX and multi-project refactoring. Work is structured into 4 sequential execution waves to maximize parallelism while preventing integration conflicts.

---

## 1. Execution Waves Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WAVE 1: FOUNDATION & INFRASTRUCTURE (Days 1–2)                               │
│                                                                             │
│  ┌──────────────────────────────┐        ┌──────────────────────────────┐   │
│  │ Phase 2A: Layout & Grid      │        │ Phase 2G: Multi-Project      │   │
│  │ Tracks (index.css, State)    │        │ Foundation & Export Scripts  │   │
│  └──────────────────────────────┘        └──────────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Layout Tracks & ProjectContext Ready)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WAVE 2: PARALLEL FEATURE WORKSTREAMS (Days 3–4)                             │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────┐ │
│  │ Phase 2B:    │ │ Phase 2C:    │ │ Phase 2D:    │ │ Phase 2E:    │ │ 2F: │ │
│  │ Graph Canvas │ │ Component    │ │ Inspector    │ │ Analytical   │ │ Cmd │ │
│  │ & Overlays   │ │ Sidebar Dock │ │ Drawer       │ │ Panels       │ │ Pal │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └─────┘ │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (All Component Views Complete)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WAVE 3: PORTFOLIO DASHBOARD & ACCESSIBILITY (Days 5–6)                       │
│                                                                             │
│  ┌──────────────────────────────┐        ┌──────────────────────────────┐   │
│  │ Phase 2H: Multi-Project      │        │ Phase 2I: Responsive Break-  │   │
│  │ Portfolio Dashboard          │        │ points & Accessibility       │   │
│  └──────────────────────────────┘        └──────────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (All Views Polished)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WAVE 4: FINAL INTEGRATION & SHELL COMPOSITION (Day 7)                       │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Final Integration: Compose App.tsx & main.tsx with all Phase Outputs  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Wave Breakdown & Phase Specifications

### Wave 1: Foundation & Infrastructure
* **Phases Included:** Phase 2A (Layout / Grid) and Phase 2G (Multi-Project Foundation).
* **Parallel Safety:** Phase 2A works exclusively on `index.css` and view state hooks. Phase 2G works on data adapter scripts (`export-explorer.cjs`), `ProjectContext.tsx`, and `useExplorerData.ts`. ZERO file overlap.
* **Outputs Required before Wave 2:**
  - `index.css` grid track classes (`[sidebar] auto [graph] 1fr [drawer] auto`).
  - `ProjectContext.tsx` providing multi-project state management.

### Wave 2: Parallel Feature Workstreams
* **Phases Included:** Phase 2B (Graph Workspace), Phase 2C (Sidebar), Phase 2D (Inspector Drawer), Phase 2E (Analytical Panels), Phase 2F (Header & Command Palette).
* **Parallel Safety:** Strictly enforced file ownership per `UI_FILE_OWNERSHIP.md`.
  - **Phase 2B:** Edits `GraphView.tsx`, `GraphControls.tsx`, `GraphLegend.tsx`, `graph.css`.
  - **Phase 2C:** Edits `Sidebar.tsx`, `SearchFilterPanel.tsx`.
  - **Phase 2D:** Edits `InvestigationDrawer.tsx`, `Breadcrumbs.tsx`, `RefactorHandoffModal.tsx`.
  - **Phase 2E:** Edits `FindingsPanel.tsx`, `HotspotPanel.tsx`, `ComparePanel.tsx`, `DiagnosticsPanel.tsx`, `SummaryBar.tsx`, `panels.css`, `findings.css`.
  - **Phase 2F:** Edits `Header.tsx`, `CommandPalette.tsx`, `useCommandPalette.ts`.
* **Outputs Required before Wave 3:** Complete, standalone component implementations with internal unit test coverage.

### Wave 3: Portfolio View & Accessibility
* **Phases Included:** Phase 2H (Project Dashboard) and Phase 2I (Responsive & Accessibility).
* **Parallel Safety:**
  - **Phase 2H:** Creates new `ProjectDashboard.tsx` component.
  - **Phase 2I:** Edits `useUserPreferences.ts` and prepares responsive media queries.
* **Outputs Required before Wave 4:** Dashboard component and responsive CSS enhancements.

### Wave 4: Final Integration & Shell Composition
* **Responsibility:** Integration Lead.
* **Tasks:**
  - Unfreeze `App.tsx` and `main.tsx`.
  - Wire `ProjectProvider`, `SelectionProvider`, and `WorkspaceContext`.
  - Mount `Sidebar.tsx`, `Header.tsx` (with `ProjectSelector`), workspace view container, and `InvestigationDrawer.tsx` into `App.tsx`.
  - Execute full CLI and Vitest integration test suite.

---

## 3. Inter-Phase Dependency Matrix

| Phase | Direct Dependencies | Blocked By | Can Run In Parallel With |
|---|---|---|---|
| **Phase 2A** | None | None | Phase 2G |
| **Phase 2G** | None | None | Phase 2A |
| **Phase 2B** | Phase 2A | Wave 1 completion | Phase 2C, 2D, 2E, 2F |
| **Phase 2C** | Phase 2A | Wave 1 completion | Phase 2B, 2D, 2E, 2F |
| **Phase 2D** | Phase 2A | Wave 1 completion | Phase 2B, 2C, 2E, 2F |
| **Phase 2E** | Phase 2A | Wave 1 completion | Phase 2B, 2C, 2D, 2F |
| **Phase 2F** | Phase 2E | Wave 1 completion | Phase 2B, 2C, 2D |
| **Phase 2H** | Phase 2G | Wave 2 completion | Phase 2I |
| **Phase 2I** | Phase 2A–2H | Wave 2 completion | Phase 2H |
