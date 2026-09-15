# MULTI-PROJECT USER EXPERIENCE & PROJECT SELECTOR SPECIFICATION

## Implementation Overview

This document specifies the **Multi-Project User Experience** and **Project Selector** component architecture implemented in Phase 2G/2H for the Salesforce Dependency Analyzer and Explorer.

---

## 1. Application Entry & Navigation Flow

The application features a project-scoped entry flow that guides users from repository selection into detailed architecture investigation while enforcing complete multi-project data isolation.

```
                  ┌───────────────────────────────┐
                  │    Application Open / Entry   │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │       Project Selector        │
                  │ (Full-Screen / Header Pill)   │
                  └───────────────┬───────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  │                               │
        [ Select Existing ]             [ + New Project ]
                  │                               │
                  ▼                               ▼
      ┌──────────────────────┐        ┌──────────────────────┐
      │ Select Salesforce    │        │ Project Creation     │
      │ Project Workspace    │        │ Modal Dialog         │
      └───────────┬──────────┘        └───────────┬──────────┘
                  │                               │
                  │   (Validate & Open)           │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │  Project Dashboard / Explorer │
                  │  (Cytoscape Graph & Panels)   │
                  └───────────────────────────────┘
```

---

## 2. Project Selector Component Architecture

The `ProjectSelector` component (`explorer/src/components/ProjectSelector.tsx`) provides two distinct visual presentations depending on context:

### 2.1 Full-Screen Application Screen (`variant="full"`)
Designed as a first-class application entry screen with rich metrics, hero section, and project cards.

#### Key UI Elements:
- **Hero Section:** Application title, status indicator, and primary `+ New Project` call-to-action button.
- **Search & Filter Bar:** Instant real-time filtering by project name, project ID slug, source directory path, or description.
- **Recent Projects Carousel:** Displays up to 5 recently opened Salesforce projects for quick context switching.
- **Project Cards Grid:** Rich cards featuring:
  - Project display name & ID slug badge.
  - Analysis status badge (`COMPLETE` / `ANALYZING` / `NOT_ANALYZED` / `FAILED`).
  - Source directory path indicator with custom monospace styling.
  - Component count metric card.
  - Dependency count metric card.
  - Last analyzed timestamp formatted for regional display.
  - Action button (`Active Workspace` or `Open Project`).
- **Empty / Loading / Error States:** Uses UI Design System tokens (`--surface-panel`, `--state-error-bg`, `--text-muted`) to provide clear visual feedback and actionable clear/retry controls.

### 2.2 Compact Header Dropdown (`variant="compact"`)
Designed for top navigation integration (`Header.tsx`) to allow seamless project switching from any workspace view.

#### Key UI Elements:
- **Header Pill Button:** Folder icon, active project display name, and dropdown arrow indicator.
- **Project List Dropdown:** Scrollable project list showing checkmarks next to the active project.
- **Register Action:** Direct link to launch `ProjectCreationModal`.

---

## 3. Project Creation & Validation Engine

The `ProjectCreationModal` component (`explorer/src/components/ProjectCreationModal.tsx`) provides a robust dialog workflow for registering new Salesforce projects.

### 3.1 Supported Input Fields:
1. **Project Name (Required):** Human-readable title (e.g. `Core CRM Services`).
2. **Salesforce Project / Source Folder (Required):** Relative path to Salesforce DX source metadata (e.g. `force-app/main/default` or `packages/billing`).
3. **Project ID Slug (Optional):** Unique identifier slug (auto-generated via slugify algorithm if left empty).
4. **Description (Optional):** Contextual notes or package module description.

### 3.2 Validation Contract & Error Clearing:
- **Required Field Checking:** Real-time and submit-time checks ensuring project name and source path are not empty.
- **Slug Validation:** Ensures project IDs contain only valid characters (`a-z`, `0-9`, `-`, `_`) and prevents duplicate ID registration.
- **Error Banner & Field Highlights:** Displays targeted red error highlights on invalid inputs alongside a dismissible error summary banner with a `Clear` button.
- **Input-Based Auto-Clearing:** Modifying an invalid input field immediately clears its associated validation error.

---

## 4. Multi-Project State & Isolation (`ProjectContext.tsx`)

Multi-project state management is governed by `ProjectContext.tsx` (`explorer/src/context/ProjectContext.tsx`).

### 4.1 State API:
```typescript
export interface ProjectContextValue {
  projects: ProjectMetadata[];
  recentProjects: ProjectMetadata[];
  activeProject: ProjectMetadata | null;
  activeProjectId: string;
  loading: boolean;
  error: Error | null;
  clearError: () => void;
  selectProject: (projectId: string) => void;
  createProject: (input: {
    name: string;
    id?: string;
    description?: string;
    sourcePath?: string;
  }) => Promise<ProjectMetadata>;
  refreshProjects: () => Promise<void>;
  getProjectDataUrl: (projectId?: string) => string;
}
```

### 4.2 Data Isolation Guarantees:
1. **URL & Selection Flushing:** Calling `selectProject(projectId)` updates the URL query parameter `?project=[projectId]` and automatically removes single-project node selection (`?node=...`) and finding selection (`?finding=...`).
2. **Workspace Event Notification:** Dispatches `explorer:project-changed` custom event on `window` to notify external sub-components and reset temporary state.
3. **Data Contract Resolution:** `getProjectDataUrl` maps project IDs to project-scoped contract endpoints (`/projects/[projectId]/explorer-data.json`), falling back to `/explorer-data.json` for single-project setups.

---

## 5. Integration Handoff Instructions

For Phase 2F / Final Integration Leads:

1. **Root Provider Wiring (`App.tsx`):**
   Wrap the application tree with `ProjectProvider`:
   ```tsx
   <ProjectProvider>
     <AppLayout />
   </ProjectProvider>
   ```

2. **Header Navigation Integration (`Header.tsx`):**
   Render the compact project selector inside the top header toolbar:
   ```tsx
   <ProjectSelector variant="compact" />
   ```

3. **Landing View Integration:**
   To present the full-screen project selector on initial load or workspace switch, render:
   ```tsx
   <ProjectSelector variant="full" onProjectSelect={handleProjectOpened} />
   ```
