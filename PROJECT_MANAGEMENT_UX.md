# PROJECT MANAGEMENT UX

## Overview

`PROJECT_MANAGEMENT_UX.md` documents the **Project Management UX** interface implemented in Phase 3B for the Salesforce Architecture Explorer. It establishes a complete, production-grade project management workspace that allows users to manage multiple Salesforce DX projects and analysis snapshots.

---

## 1. Key Capabilities & Actions Implemented

The **Manage Projects** interface (`explorer/src/components/ProjectManager.tsx`) supports 8 core operations with 100% genuine functionality—no mock/fake placeholders:

1. **Open:** Selects and activates the target Salesforce project context, transitioning the active workspace and flushing single-project selection parameters for data isolation.
2. **Rename:** Opens a modal dialog allowing users to update the project name and description.
3. **Change Source:** Opens a modal dialog allowing users to adjust the relative Salesforce DX source directory path (`force-app/main/default`).
4. **Re-analyze:** Re-fetches the analysis contract snapshot for the project, recalculates component & dependency metrics, updates `lastAnalyzedAt`, and transitions project status.
5. **Duplicate:** Creates an exact duplicate of the project metadata with a unique copied ID and configuration.
6. **Archive:** Toggles project archive status (`isArchived`), allowing users to hide legacy/inactive projects without permanent deletion.
7. **Delete (Requires Confirmation):** Prompts the user with an explicit confirmation dialog before permanently removing project metadata and local storage state.
8. **Export:** Builds a structured JSON export payload containing project metadata and analysis snapshot data, triggering a client-side browser file download.

---

## 2. Display Fields & Visual Hierarchy

Each project entry card presents a structured grid layout aligned with the `UI_DESIGN_SYSTEM.md` token system:

- **Project:** Displaying primary Project Name, unique ID slug, Active badge indicator, and relative Source Folder path.
- **Status:** Badge indicating analysis status (`Analyzed`, `Analyzing...`, `Not Analyzed`, `Analysis Failed`, or `Archived`).
- **Components:** Total count of analyzed Salesforce metadata components (Apex classes, LWC, Flows, Triggers, Custom Objects, Fields).
- **Dependencies:** Total count of static and heuristic dependency references in the graph.
- **Last Analyzed:** Human-readable date and time of the last completed static analysis run.

---

## 3. Search, Filtering, & Sorting

- **Recent Projects:** Displays a quick-access toolbar for the top 5 most recently accessed projects.
- **Project Search:** Real-time search field filtering projects by name, ID, source directory, or description.
- **Status & Archive Filtering:** Filter dropdown enabling users to view All Active Projects, Analyzed Only, Not Analyzed, Analyzing, Failed, or Archived Projects.
- **Sorting Options:** Sort dropdown with ascending/descending order support by Last Analyzed timestamp, Name, Component Count, or Analysis Status.

---

## 4. Architectural Data Isolation & Safety

- Deletion strictly requires user confirmation via a dedicated modal overlay (`deletingProject` state).
- Switching projects flushes URL query parameters (`?node=...`, `?finding=...`) and dispatches `explorer:project-changed` events to guarantee zero cross-project data leakage.
- Core dependency analysis algorithms (`dependency-analyzer.cjs`) remain strictly untouched and preserved.

---

## 5. Verification & Test Summary

- Unit tests in `explorer/src/context/ProjectContext.test.tsx` verify state updates, re-analysis, duplication, archiving, deletion, export, and data URL resolution.
- Unit tests in `explorer/src/components/ProjectManager.test.tsx` and `explorer/src/components/ProjectSelector.test.tsx` verify search, sorting, filtering, action modal dialogs, and deletion confirmation.
- Production Vite build (`npm run build`) compiled successfully with clean JavaScript bundle generation.
