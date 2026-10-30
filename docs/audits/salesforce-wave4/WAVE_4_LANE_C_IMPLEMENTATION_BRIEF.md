# Wave 4 Implementation Brief — Lane C: App Shell and Preset Manager

| Brief Attribute | Specification |
|---|---|
| **Lane ID** | `LANE-C` |
| **Objective** | Build App Shell Filter Bar, Preset CRUD UI (`daPresetManager`), project-scoped preset persistence, default preset activation, and filter event dispatching in `daAppShell`. |
| **Status** | **NOT AUTHORIZED FOR IMPLEMENTATION** (Draft Readiness Specification) |
| **Target Directory** | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/` |

---

## 1. Exact Scope & File Ownership

### Owned Files
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html`
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.css`
- `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.html` (NEW)
- `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js` (NEW)
- `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.css` (NEW)

### Prohibited Modifications
- MUST NOT edit Apex code (`DAUserPreferenceController.cls`).
- MUST NOT edit Graph Viewer LWC (`daGraphViewer.js`).

---

## 2. Interface Contracts & Key Tasks

1. Consume `daFilterSchema.js` for filter validation and legacy v1 normalization.
2. Render responsive SLDS Filter Bar above view tabs in `daAppShell.html`.
3. Implement `daPresetManager` LWC for Preset Save, Select, Rename, Delete, Set Default operations.
4. Load preferences on project switch using `getUserPreference` Apex method with stale-response guards.
5. Save active filter and presets array to `Filters_JSON__c` via `saveUserPreference`.
6. Dispatch `filterchange` CustomEvent to child views (`daGraphViewer`, `daMatrixViewer`, `daFindingsViewer`).

---

## 3. Acceptance Criteria

- Filter bar allows real-time search term, risk level, node type, and layer filtering.
- Users can create, activate, and delete named presets.
- Presets are strictly scoped to the active project ID.
- Project switching reloads project-specific presets and cancels stale asynchronous requests.
- Fires `filterchange` custom event on every filter/preset change.
