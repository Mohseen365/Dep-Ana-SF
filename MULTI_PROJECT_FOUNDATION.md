# MULTI_PROJECT_FOUNDATION.md

## Implementation Overview

This document details the completed Multi-Project Foundation (Phase 2G) for the Salesforce Dependency Analyzer and Explorer.

---

## IMPLEMENTATION REPORT

**Phase:** Phase 2G - Multi-Project Foundation & Export Scripts
**Status:** COMPLETE

### Files Changed:
- `explorer/src/types/explorer.ts` (Added `ProjectMetadata`, `MultiProjectManifest`, and optional `project` on `ExplorerDataSchema`)
- `explorer/src/hooks/useExplorerData.ts` (Enhanced data loading hook to support project ID resolution, fallbacks, and project change events)
- `explorer/src/hooks/useExplorerData.test.ts` (Added unit tests for project data path resolution and 404 fallback)
- `scripts/export-explorer.cjs` (Updated CLI adapter with `--project`, `--project-name`, `--project-desc`, and `--source` parameters, project directory export, and `project-manifest.json` generation)
- `scripts/run-explorer.cjs` (Updated one-command runner to accept `--project` and `--source` flags and copy project-scoped artifacts to `explorer/public/projects/`)

### Files Created:
- `explorer/src/context/ProjectContext.tsx` (ProjectContext provider, state hook, manifest loading, project selection, and project creation)
- `explorer/src/context/ProjectContext.test.tsx` (Unit tests for ProjectContext, manifest loading, project creation, and state switching)
- `explorer/src/components/ProjectSelector.tsx` (Dropdown selector component for switching projects)
- `explorer/src/components/ProjectCreationModal.tsx` (Modal dialog for registering new Salesforce projects)
- `scripts/test-multi-project.cjs` (Node integration test suite for multi-project metadata, manifest generation, and isolation)
- `MULTI_PROJECT_FOUNDATION.md` (This document)

### Files Deleted:
- NONE

### Tests Run:
- `node scripts/test-multi-project.cjs`
- `node scripts/test-export-explorer.cjs`
- `cd explorer && npm test`
- `cd explorer && npm run build`

### Tests Passed:
- 100% passed (320 Vitest unit/component tests in `explorer`, 12 validation invariant tests in `test-export-explorer.cjs`, 5 integration tests in `test-multi-project.cjs`, and successful Vite production build)

### Tests Failed:
- NONE

### UI Behavior Changed:
- Application foundation is now project-aware. UI components can consume `ProjectContext` and render `ProjectSelector` and `ProjectCreationModal` without modifying Cytoscape graph semantics or redesigning existing views.

### Logic Changed:
- NONE in `dependency-analyzer.cjs` or core graph builder algorithms. Dependency analysis algorithms and Cytoscape graph semantics remain strictly untouched.

### API Changed:
- `useExplorerData` now accepts optional `projectIdOrUrl?: string` argument while preserving 100% backward compatibility with default string URLs.
- `scripts/export-explorer.cjs` and `scripts/run-explorer.cjs` accept `--project`, `--project-name`, `--project-desc`, and `--source` CLI arguments.

### Cross-Phase Requests:
- **For Phase 2F / Final Integration Lead:**
  Wire `ProjectProvider` into `explorer/src/App.tsx` and place `ProjectSelector` inside `explorer/src/components/Header.tsx` during final layout integration.

---

## 1. Architecture Implemented

The application now conceptually operates as a project-scoped analyzer:

```
Dependency Analyzer
    ↓
Projects
    ↓
Selected Salesforce Project
    ↓
Analysis / Dependency Explorer
```

```
projects/
    default/
        project-metadata.json
        explorer-data.json
    core-crm/
        project-metadata.json
        explorer-data.json
    billing-app/
        project-metadata.json
        explorer-data.json
project-manifest.json
```

### Key Principles Applied:
1. **One Application + Project-Scoped Data:** Single client codebase consuming isolated dataset files located at `/projects/[projectId]/explorer-data.json`.
2. **Backward Compatibility:** Defaults to `/explorer-data.json` if no project ID is specified or if project-specific files are not present.

---

## 2. Project Data Model

### `ProjectMetadata` Schema (`explorer/src/types/explorer.ts`)
```typescript
export type ProjectAnalysisStatus = 'NOT_ANALYZED' | 'ANALYZING' | 'COMPLETE' | 'FAILED';

export interface ProjectMetadata {
  id: string;                  // Unique slug (e.g., 'core-crm')
  name: string;                // Human-readable display name (e.g., 'Core CRM')
  description?: string;        // Optional project description
  sourcePath: string;          // Source directory path (e.g., 'force-app/main/default')
  createdAt: string;           // ISO timestamp of creation
  updatedAt: string;           // ISO timestamp of last update
  lastAnalyzedAt?: string | null; // ISO timestamp of last analysis
  analysisStatus: ProjectAnalysisStatus; // Current status
  componentCount: number;      // Total components (nodes)
  dependencyCount: number;     // Total dependencies (edges)
  analysisPath?: string;       // Path to explorer-data.json contract
}
```

### `MultiProjectManifest` Schema (`explorer/src/types/explorer.ts`)
```typescript
export interface MultiProjectManifest {
  manifestVersion: string;     // e.g., '1.0.0'
  activeProjectId: string;     // Active project slug
  projects: ProjectMetadata[]; // Array of registered projects
}
```

---

## 3. Data Isolation Guarantees

To ensure no project can accidentally display another project's components, dependencies, findings, analysis results, or graph state:

1. **Clean Fetch Boundaries:**
   - Switching `activeProjectId` in `ProjectContext` updates the fetch URL in `useExplorerData` to `/projects/[projectId]/explorer-data.json`.
   - Cytoscape graph canvas elements are fully replaced when `data` updates, destroying the old graph model completely.

2. **URL Parameter Flushing:**
   - Calling `selectProject(id)` automatically removes single-project node selection (`?node=...`) and finding selection (`?finding=...`) from URL search query parameters using `window.history.pushState`.

3. **Event-Driven Workspace Flush:**
   - `selectProject` dispatches a `explorer:project-changed` event on `window`, allowing hooks and sub-components to clear recent breadcrumbs, pinned drawer states, or temporary selections.

4. **Isolated Storage Keys:**
   - Client-created projects are stored in `localStorage` under `explorer.localProjects`. Active project ID is stored under `explorer.activeProjectId`.

---

## 4. Tests Executed

1. **Unit & Component Tests (`cd explorer && npm test`):**
   - Verified `ProjectContext.test.tsx` (5/5 tests passed): Default project loading, multi-project manifest loading, creating project metadata, switching project context, resolving project data URLs.
   - Verified `useExplorerData.test.ts` (5/5 tests passed): Fetching data by project ID, 404 fallback to `/explorer-data.json`, network retries.
   - All 45 test files (320 tests) in `explorer` passed.

2. **Multi-Project Integration Suite (`node scripts/test-multi-project.cjs`):**
   - Test 1: Project metadata creation.
   - Test 2: Manifest generation and project list loading.
   - Test 3: Project context switching and data isolation (verified zero component/dependency data leaks between Project Alpha and Project Beta).
   - Test 4: Missing / invalid project error handling.
   - Test 5: Backward compatibility for single-project pipeline.

3. **Adapter Validation Suite (`node scripts/test-export-explorer.cjs`):**
   - Verified all 12 core validation invariants and graph preservation equivalence against realistic Salesforce org fixtures.

4. **Production Build (`cd explorer && npm run build`):**
   - Verified clean TypeScript compilation and Vite build output.

---

## 5. Remaining Work (Cross-Phase Integration)

The following items are reserved for later integration phases per the ownership matrix:

1. **App Provider Wiring:** Wrap `ProjectProvider` around the root component inside `explorer/src/App.tsx` during final integration.
2. **Header Integration:** Render `ProjectSelector` inside `Header.tsx` (owned by Phase 2F).
3. **Portfolio Dashboard:** Render multi-project portfolio overview dashboard inside `ProjectDashboard.tsx` (owned by Phase 2H).
