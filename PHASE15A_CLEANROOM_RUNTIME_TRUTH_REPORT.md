# PHASE 15A REPORT

## 1. Executive Finding

* **Default Launch Asset:** A completely clean real user launching the application at `/` with empty `localStorage` receives project ID `default`, loading `explorer/public/explorer-data.json` (SHA-256 `4705517852ed51caada4aa5477c958de2561d2737d24a069f87e8fe39471cb13`, 4 nodes, 3 edges), NOT the canonical Cloud Spend Tracker dataset.
* **Canonical Fixture Path Isolation:** The canonical Cloud Spend Tracker dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`, 240 nodes, 1,024 edges) is NOT present in `explorer/public/projects/cloud-spend-tracker/explorer-data.json`.
* **Deep Link Fallback Behavior:** Requesting `?project=cloud-spend-tracker` on a clean browser causes `useExplorerData` to attempt fetching `/projects/cloud-spend-tracker/explorer-data.json`, receiving an HTTP 404/SPA HTML fallback, resulting in `NOT_ANALYZED: Project analysis data not found (HTTP 404)` screen.
* **Default Architecture Mode:** Both clean root launch and initial project creation default to `architectureMode: "hierarchical"`. Hybrid mode (`architectureMode: "hybrid"`) is NEVER enabled by default.
* **Opt-In Feature Layout Propagation:** Toggling to Hybrid layout sets `architectureMode: "hybrid"`, which passes `enableFeatureLayout: true` into `computeArchitectureLayout`, successfully executing the Stage 1–12 2D feature geometry pipeline without modifying `enableFeatureLayout: false` in production default settings.
* **State Persistence & Provenance Isolation:** User layout toggles and manual node drags are persisted per-project under `explorer.projectState.<projectId>` in `localStorage`, tagged with provenance (`automatic-hierarchical`, `automatic-hybrid`, `user-authored`).
* **Hybrid Mode Reload Persistence:** Reloading after switching to Hybrid restores `architectureMode: "hybrid"` and `layoutProvenance: "automatic-hybrid"` from `localStorage` for that project.
* **First Divergence Location:** The first point of divergence occurs in `useExplorerData.ts` / `ProjectContext.tsx` during project URL/manifest resolution, where project `default` routes to a 4-node public fallback instead of mounting the canonical 240-node Cloud Spend Tracker dataset.

---

## 2. Current Runtime Identity

| Attribute | Value / Specification |
|---|---|
| **Repository Revision / Tag** | `fe0341f` (`fe0341ff1f52a979982675b85be3c2ae70e8849d`) |
| **Canonical Audit Fixture Path** | `audit-fixtures/cloud-spend-tracker/explorer-data.json` |
| **Canonical Audit Fixture SHA-256** | `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` |
| **Canonical Topology** | 240 nodes, 1,024 edges |
| **Default Clean Launch Fixture** | `explorer/public/explorer-data.json` |
| **Default Clean Launch SHA-256** | `4705517852ed51caada4aa5477c958de2561d2737d24a069f87e8fe39471cb13` |
| **Default Clean Topology** | 4 nodes, 3 edges |
| **Default Architecture Mode** | `hierarchical` (Layered Flow) |
| **Default Hybrid Flag** | `enableFeatureLayout: false` |
| **Default Provenance Tag** | `automatic-hierarchical` |

---

## 3. Clean Launch Truth

When a completely clean real user (empty `localStorage`, no URL parameters) opens `http://localhost:3000/`:

1. **Project Selection:** `ProjectContext` and `ProjectStateContext` initialize `activeProjectId = 'default'`.
2. **Fixture Fetching:** `useExplorerData` invokes `resolveDataUrl(undefined)`. It reads no saved state or URL query parameter and returns `/explorer-data.json`.
3. **Data Loading:** The browser fetches `http://localhost:3000/explorer-data.json`. The server returns the 4-node public fallback fixture (SHA-256 `47055178...`).
4. **Data Validation:** `parseExplorerData` in `explorer/src/lib/schema.ts` validates the schema in ~2.8ms, supplying 4 nodes (`FoodAppController`, `FoodAppService`, `FoodAppRepository`, `Food_Item__c`) and 3 edges to `App.tsx`.
5. **Mode & State Initialization:** `loadProjectState('default')` generates default UI state with `architectureMode: 'hierarchical'` and `layoutProvenance: 'automatic-hierarchical'`.
6. **Canvas Layout Execution:** `GraphView.tsx` renders the graph using Cytoscape `fcose` / `computeArchitectureLayout`. Because `architectureMode === 'hierarchical'`, `enableFeatureLayout` evaluates to `false`.
7. **Persistence:** State changes (if any) are written to `explorer.projectState.default` in `localStorage`. `explorer.activeProjectId` is set to `default`.

---

## 4. Fixture Resolution Matrix

| Scenario | Requested URL | Resolved Fixture URL | Fixture SHA-256 | Nodes | Edges | Resulting Behavior |
|---|---|---|---|---:|---:|---|
| **A. Clean Root Launch** | `/` | `/explorer-data.json` | `4705517852ed...` | 4 | 3 | Renders 4-node `default` project successfully. |
| **B. Explicit Cloud Spend Query** | `/?project=cloud-spend-tracker` | `/projects/cloud-spend-tracker/explorer-data.json` | N/A (404 / HTML SPA) | 0 | 0 | Displays `NotAnalyzedScreen` ("Project analysis data not found"). |
| **C. Existing Project via localStorage** | `/` (with `explorer.activeProjectId = "movie"`) | `/projects/movie/explorer-data.json` | `f6792c0d4329...` | 9 | 16 | Renders 9-node `movie` project successfully. |
| **D. Explicit Hybrid Activation** | `/` (toggle 🏢 -> 🧩) | `/explorer-data.json` | `4705517852ed...` | 4 | 3 | Triggers `computeArchitectureLayout` with `enableFeatureLayout: true`. |
| **E. Hybrid Mode Reload** | `/` (reload after D) | `/explorer-data.json` | `4705517852ed...` | 4 | 3 | Restores `architectureMode: "hybrid"` and `automatic-hybrid` provenance. |
| **F. Hybrid -> Hierarchical -> Hybrid** | `/` (toggle 🧩 -> 🏢 -> 🧩) | `/explorer-data.json` | `4705517852ed...` | 4 | 3 | Switches layout engine dynamically; updates `localStorage` atomically. |

---

## 5. Mode/State Matrix

| Scenario | Architecture Mode | Feature Layout Flag | Provenance | Persisted in localStorage | Reload Result |
|---|---|---|---|---|---|
| **A. Clean Launch** | `hierarchical` | `false` | `automatic-hierarchical` | `explorer.projectState.default` | Restores `hierarchical` mode |
| **B. Cloud Spend Link** | `hierarchical` | `false` | `automatic-hierarchical` | `explorer.projectState.cloud-spend-tracker` | Shows `NotAnalyzedScreen` |
| **C. Stored Project ("movie")** | `hierarchical` | `false` | `automatic-hierarchical` | `explorer.projectState.movie` | Restores `movie` project state |
| **D. Hybrid Toggle** | `hybrid` | `true` | `automatic-hybrid` | `explorer.projectState.default` (`architectureMode: "hybrid"`) | Preserves `hybrid` mode |
| **E. Hybrid Reload** | `hybrid` | `true` | `automatic-hybrid` | `explorer.projectState.default` (`architectureMode: "hybrid"`) | Restores `hybrid` mode cleanly |
| **F. Toggle Cycle** | `hybrid` -> `hierarchical` -> `hybrid` | `true` -> `false` -> `true` | `automatic-hybrid` -> `automatic-hierarchical` -> `automatic-hybrid` | Updated on each click | Restores latest active mode |

---

## 6. First Divergence

```text
PRODUCT REQUIREMENT / EXPECTATION:
The canonical 240-node, 1,024-edge Cloud Spend Tracker dataset (audit-fixtures/cloud-spend-tracker/explorer-data.json, SHA-256 feeb68f3...) should serve as the default reference dataset for architecture exploration and evaluation.

ACTUAL RUNTIME BEHAVIOR:
Standard clean launch resolves activeProjectId = 'default', fetching '/explorer-data.json' from 'explorer/public/explorer-data.json' (SHA-256 47055178...), loading a 4-node fallback fixture.

FIRST DIVERGENCE LOCATION:
File: explorer/src/context/ProjectContext.tsx & explorer/public/project-manifest.json
Symbol: DEFAULT_PROJECT / manifest.projects

CAUSE:
1. explorer/public/project-manifest.json defines 'default' pointing to 'explorer-data.json' (4 nodes).
2. 'audit-fixtures/cloud-spend-tracker/explorer-data.json' exists at the repo root for automated test suites, but is NOT copied or symlinked into 'explorer/public/projects/cloud-spend-tracker/explorer-data.json'.
```

---

## 7. Verified Working

1. **Deterministic Position Authority:** Level 1 (in-session drag), Level 2 (persisted `nodePositions`), Level 3 (canvas positions), Level 4 (`fcose`), and Level 5 (neighbor average / hash) priority hierarchy in `position-policy.ts` functions flawlessly.
2. **Project Isolation:** `saveProjectState` and `loadProjectState` strictly isolate state under `explorer.projectState.<projectId>`. Switching Project A -> Project B -> Project A causes zero state or coordinate leakage.
3. **Hybrid Mode Pipeline Dispatch:** When `architectureMode === 'hybrid'`, `GraphView.tsx` sets `enableFeatureLayout: true`, invoking the 13-stage architecture layout pipeline in `computeArchitectureLayout`.
4. **State Persistence on Reload:** Mode selection (`architectureMode`), filters, zoom, and node positions persist across page reloads per project.
5. **Schema Validation:** `parseExplorerData` validates Explorer artifacts deterministically with Zod in ~2.8ms.

---

## 8. Verified Broken

1. **Missing Canonical Public Artifact:** `explorer/public/projects/cloud-spend-tracker/explorer-data.json` does not exist on disk. Passing `?project=cloud-spend-tracker` in the browser fails with 404/SPA HTML fallback.
2. **Missing JSDOM Environment in Unit Tests:** Running Vitest without `--environment jsdom` fails in `ProjectStatePersistenceAndIsolation.test.tsx` due to missing `localStorage` global object.

---

## 9. Not Proven

1. **PRODUCT INTENT NOT PROVEN regarding Default Public Dataset:** It is not provable whether `explorer/public/explorer-data.json` (4 nodes) was intended as a lightweight developer fallback or whether `cloud-spend-tracker` was meant to be copied to `explorer/public/` during build time.

---

## 10. Evidence Register

* `explorer/src/hooks/useExplorerData.ts` (`resolveDataUrl` line 14): Resolves `/explorer-data.json` for project `default` or `/projects/<slug>/explorer-data.json`.
* `explorer/src/context/ProjectContext.tsx` (`DEFAULT_PROJECT` line 31): Sets default project ID to `'default'`.
* `explorer/src/context/ProjectStateContext.tsx` (`getInitialProjectIdFromUrlOrStorage` line 40): Reads URL query parameter `project` or `localStorage.getItem('explorer.activeProjectId')`.
* `explorer/src/lib/projectState.ts` (`loadProjectState` line 188, `mergeWithDefaultState` line 211): Sets default `architectureMode: 'hierarchical'`.
* `explorer/src/components/GraphView.tsx` (lines 141–160, 270): Maps `enableFeatureLayout: architectureMode === 'hybrid'` into `getLayoutOptions`.
* `audit-fixtures/cloud-spend-tracker/explorer-data.json`: Canonical 240-node fixture, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`.
* `explorer/public/explorer-data.json`: Public 4-node fallback fixture, SHA-256 `4705517852ed51caada4aa5477c958de2561d2737d24a069f87e8fe39471cb13`.
