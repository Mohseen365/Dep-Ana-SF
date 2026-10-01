# ARCHITECTURE ORBIT — WORKSTREAM C1 INTEGRATION READINESS REPORT

**Document Type:** Parallel Workstream C1 Integration Readiness & Dependency Mapping Audit
**Status:** COMPLETE — READY FOR C2
**Mode:** Preparatory & Read-Only (0 Production Code Changes)
**Authority:** Direct Repository Audit (`explorer/src/`, `scripts/`) + Master Execution Contract (`ARCHITECTURE_ORBIT_MASTER_EXECUTION_CONTRACT.md`)

---

## EXECUTIVE SUMMARY

Workstream C1 performs the preparatory archaeology, dependency mapping, interface verification, and risk analysis necessary to integrate Workstream A (Semantic Projection) and Workstream B (Orbit Geometry Engine) into the main application once they converge.

C1 was executed strictly as a **read-only preparatory investigation**. Zero production files were modified. All proposed C2 changes have been mapped down to line numbers, file paths, and exact function interfaces.

---

## A. REPOSITORY INTEGRATION MAP

The following table details every file and symbol in `explorer/src/` that plays a role in layout orchestration, state management, worker messaging, position authority, UI controls, lens rendering, or persistence:

| Purpose / Function | Exact File Path | Primary Symbols / Identifiers |
| :--- | :--- | :--- |
| **Layout Orchestrator Dispatch** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayout`, `computeArchitectureLayoutWithMetadata`, `ArchitectureLayoutOptions`, `ArchitectureLayoutResultWithMetadata` |
| **Layout Helper Wrapper** | `explorer/src/lib/graph-layout.ts` | `runLayoutWithMetadata`, `runLayoutWithMetadataAsync`, `getLayoutOptions`, `createLayout`, `globalWorkerClient` |
| **Type Definitions** | `explorer/src/types/explorer.ts` | `ArchitectureLayoutMode` (`'hierarchical' \| 'hybrid'`) |
| **State Persistence** | `explorer/src/lib/projectState.ts` | `GraphLayoutState`, `LayoutProvenance` (`'automatic-hierarchical' \| 'automatic-hybrid' \| 'user-authored'`), `loadProjectState`, `saveProjectState`, `mergeWithDefaultState` |
| **Position Authority Policy** | `explorer/src/lib/position-policy.ts` | `shouldAutoLayout`, `resolveAuthoritativePosition`, `calculateDeterministicNewNodePosition` |
| **Worker Client Transport** | `explorer/src/lib/workers/layout-worker-client.ts` | `LayoutWorkerClient`, `calculateLayoutAsync`, `applyPositionAuthority` |
| **Worker Message Types** | `explorer/src/lib/workers/layout-worker-types.ts` | `LayoutWorkerRequest`, `LayoutWorkerResponseSuccess`, `LayoutWorkerResponseError`, `FeatureRegionSummary` |
| **Worker Engine Endpoint** | `explorer/src/lib/workers/layout.worker.ts` | `ctx.addEventListener('message')`, `computeArchitectureLayoutWithMetadata` |
| **Primary Graph View Component** | `explorer/src/components/GraphView.tsx` | `GraphView`, `runLayoutWithMetadata`, `captureAndPersistPositions`, `executeResetLayout`, `handleToggleArchitectureModeInternal` |
| **Floating Controls Bar** | `explorer/src/components/GraphControls.tsx` | `GraphControls`, `onToggleArchitectureMode`, `architectureMode` |
| **Overlay Guide Canvas** | `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | `FeatureOverlayCanvas`, `featureRegions`, Cytoscape canvas overlay |
| **Workspace Lens Registry** | `explorer/src/registry/workspace-registry.ts` | `LENS_REGISTRY`, `constellation`, `graph`, `subway` |
| **Constellation Engine (Independent Lens)** | `explorer/src/lib/layout/constellation-layout.ts` | `computeConstellationLayout` |
| **Constellation Adapter & Helpers** | `explorer/src/lib/adapters/constellation-adapter.ts` | `polarToCartesian`, `svgArc` |

---

## B. EXISTING LAYOUT ARCHITECTURE

The repository currently supports three distinct layout mechanisms:

### 1. Hierarchical Layout (`architectureMode = 'hierarchical'`)
* **Selection & Trigger:** Selected via `GraphControls.tsx` mode toggle button or stored in `ProjectUIState` (`graphLayout.architectureMode = 'hierarchical'`).
* **Dispatch:** `computeArchitectureLayout` $\to$ `computeGlobalDomainLayout` (Stage 5) $\to$ `reduceEdgeCrossings` (Stage 6) $\to$ `computeLocalNodeLayout` (Stage 7) $\to$ `resolveSpacingAndCollisions` (Stage 11).
* **Output Representation:** Cartesian coordinates `{ [nodeId]: { x, y } }`.
* **Worker Execution:** Asynchronous offloading via `LayoutWorkerClient.calculateLayoutAsync` to `layout.worker.ts`, falling back to synchronous `computeArchitectureLayoutWithMetadata` if Web Worker is unavailable or encounters an IPC error.

### 2. Hybrid Layout (`architectureMode = 'hybrid'`)
* **Selection & Trigger:** Selected via `GraphControls.tsx` mode toggle button (`enableFeatureLayout = true`).
* **Dispatch:** `computeArchitectureLayout` $\to$ `computeGlobalFeatureLayout` (Stage 5 feature layout path reusing pre-constructed `featureGraph`) $\to$ `reduceEdgeCrossings` (Stage 6) $\to$ `computeLocalNodeLayout` (Stage 7 using `featureLayerYMap`) $\to$ `placeSatellites` (Stage 9) $\to$ `resolveSpacingAndCollisions` (Stage 11).
* **Metadata Output:** Produces `featureRegions: Map<string, FeatureRegion>`, passed to `FeatureOverlayCanvas.tsx` to draw feature bounding boxes on canvas.
* **Worker Execution:** Worker serializes `featureRegions` into `FeatureRegionSummary[]` over IPC and reconstructs `Map<string, FeatureRegion>` on main thread in `LayoutWorkerClient`.

### 3. Dependency Constellation (`WorkspaceViewMode = 'constellation'`)
* **Selection & Trigger:** Activated as a separate interactive lens registered in `LENS_REGISTRY` (`explorer/src/registry/workspace-registry.ts`).
* **Dispatch:** Executed inside `DependencyConstellationPanel.tsx` calling `computeConstellationLayout` in `constellation-layout.ts`.
* **Independence:** Constellation does **NOT** go through `computeArchitectureLayout` or `layout.worker.ts`. It is a focal-node k-hop BFS radial view operating independently on a focal component.
* **Position Authority Safety:** Does not overwrite or persist main graph positions in `GraphLayoutState.nodePositions`.

---

## C. FUTURE ORBIT ENTRY POINT

Orbit will enter as an additive option to `ArchitectureLayoutMode`:

```typescript
// In explorer/src/types/explorer.ts
export type ArchitectureLayoutMode = 'hierarchical' | 'hybrid' | 'orbit';
```

### Exact Dispatch Location in `explorer/src/lib/architecture-layout.ts`

In `computeArchitectureLayoutWithMetadata`, after Stage 0 normalization and indexing, a clean dispatch branch will be added:

```typescript
if (options.architectureMode === 'orbit') {
  // 1. Invoke Workstream A: Semantic Projection
  const orbitSemantics = computeOrbitSemantics(safeNodes, safeEdges, { index, analysis, layerMap, domainMap });

  // 2. Invoke Workstream B: Pure Radial Geometry Engine
  const orbitResult = computeOrbitLayout(safeNodes, safeEdges, orbitSemantics, options);

  // 3. Apply Level 1-3 Position Authority overrides
  const resultPositions = applyPositionAuthorityOverrides(orbitResult.positions, existingPositions);

  return {
    positions: resultPositions,
    orbitGuideMetadata: orbitResult.guideMetadata,
  };
}
```

This guarantees 100% zero interference with existing `hierarchical` and `hybrid` layout branches.

---

## D. A → B → C INTERFACE MAP

The data flow connecting Workstream A $\to$ Workstream B $\to$ Workstream C uses the frozen interface specified in the Master Execution Contract:

```text
                  ┌────────────────────────┐
                  │      INPUT GRAPH       │
                  │ (safeNodes, safeEdges) │
                  └───────────┬────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ WORKSTREAM A — SEMANTIC PROJECTION (orbit-semantics.ts)   │
│ Produces: OrbitNodeMetadata[]                             │
│ Status: FROZEN CONTRACT                                   │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ WORKSTREAM B — RADIAL GEOMETRY ENGINE (orbit-layout.ts)   │
│ Accepts: OrbitNodeMetadata[], OrbitLayoutOptions          │
│ Produces: OrbitLayoutResult { positions, guideMetadata }  │
│ Status: FROZEN CONTRACT                                   │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ WORKSTREAM C — ORCHESTRATION & UI (architecture-layout.ts)│
│ Accepts: OrbitLayoutResult                                │
│ Transforms: { positions: Record<string, Position>, ... }  │
│ Status: INTEGRATION TARGET                                │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ POSITION AUTHORITY & GRAPHVIEW (position-policy.ts)       │
│ Applies Level 1-5 Authority Precedence $\to$ Cytoscape    │
└───────────────────────────────────────────────────────────┘
```

### Contract Interfaces (`FROZEN CONTRACT`)

```typescript
export interface OrbitNodeMetadata {
  nodeId: string;
  canonicalNodeType: string;
  canonicalLayer: ArchitectureLayer;
  orbitRingIndex: number;          // 0..4
  primaryFeatureId: string;
  primaryDomainId: string;
  orbitSectorId: string;
  semanticOrderKey: string;
}

export interface OrbitLayoutOptions {
  center: { x: number; y: number };
  innerRadius: number;             // Default: 120px
  ringSpacing: number;             // Default: 140px
  nodeWidth: number;               // Default: 120px
  nodeHeight: number;              // Default: 60px
  sectorMarginAngleRad: number;    // Default: 0.05 rad
  architectureMode?: ArchitectureLayoutMode;
}

export interface OrbitGuideMetadata {
  rings: Array<{ ringIndex: number; radiusPx: number; label: string }>;
  sectors: Array<{ sectorId: string; label: string; startAngleRad: number; endAngleRad: number }>;
}

export interface OrbitLayoutResult {
  positions: Record<string, { x: number; y: number }>;
  guideMetadata?: OrbitGuideMetadata;
}
```

---

## E. POSITION AUTHORITY ANALYSIS

Position authority in `explorer/src/lib/position-policy.ts` and `layout-worker-client.ts` strictly enforces a 5-level hierarchy:

1. **Level 1: Explicit User Drag Position** (Session memory during active user interaction).
2. **Level 2: Persisted Project Position** (`GraphLayoutState.nodePositions` in `localStorage`).
3. **Level 3: Existing Canvas Position** (During incremental view or filter update).
4. **Level 4: Generated Layout Position** (Output from `computeArchitectureLayoutWithMetadata` or worker).
5. **Level 5: Deterministic Fallback Placement** (Calculated via `calculateDeterministicNewNodePosition`).

### Authority Compatibility Answers

> **Q: How can Orbit-generated coordinates enter the existing authority model without creating a second position system?**
>
> **A:** Orbit coordinates enter as standard Level 4 generated positions. When `architectureMode = 'orbit'`, `computeArchitectureLayoutWithMetadata` generates polar-derived Cartesian positions `{ x, y }`. `LayoutWorkerClient.applyPositionAuthority` evaluates these generated positions against Level 1-3 overrides without changing position authority logic.
>
> Furthermore, position provenance will be assigned `layoutProvenance = 'automatic-orbit'` when Orbit is active. In `GraphView.tsx`, layout provenance validation guarantees that switching to Orbit clears/recalculates positions rather than reusing stale `automatic-hierarchical` or `automatic-hybrid` grid coordinates.

---

## F. WORKER ARCHITECTURE

Worker offloading operates via `LayoutWorkerClient` (`explorer/src/lib/workers/layout-worker-client.ts`) and `layout.worker.ts`:

### Minimal C2 Worker Changes Required

1. **`layout-worker-types.ts`:**
   - Extend `FeatureRegionSummary` or add optional `orbitGuideSummary?: OrbitGuideSummary` to `LayoutWorkerResponseSuccess`.
2. **`layout.worker.ts`:**
   - In `ctx.addEventListener('message')`, pass `options` directly to `computeArchitectureLayoutWithMetadata(nodes, edges, options)`. Since worker options already forward `options: ArchitectureLayoutOptions`, adding `architectureMode: 'orbit'` in options automatically executes the Orbit branch inside the worker!
3. **`layout-worker-client.ts`:**
   - In `calculateLayoutAsync`, unpack `result.orbitGuideMetadata` (if present) from worker response and return it alongside `positions`.

Worker message protocol, generation cancellation (`requestGeneration`), project isolation (`projectId`), and IPC fallback remain 100% untouched.

---

## G. GRAPHVIEW INTEGRATION POINTS

In `explorer/src/components/GraphView.tsx`, Orbit requires minimal surgical integration:

| Location | Existing Line / Function | Purpose / Proposed C2 Insertion |
| :--- | :--- | :--- |
| **State Declaration** | `const [featureRegions, setFeatureRegions] = ...` | Add `const [orbitGuides, setOrbitGuides] = useState<OrbitGuideMetadata \| undefined>(undefined);` |
| **Provenance Check** | `GraphView.tsx:392` | Include `'automatic-orbit'` check when `architectureMode === 'orbit'`: <br>`else if (currentProvenance === 'automatic-orbit' && architectureMode === 'orbit') { hasAuth = true; }` |
| **Layout Trigger Effect** | `GraphView.tsx:218` | Handle Orbit mode switch in `useEffect([architectureMode])` to set `targetProvenance = 'automatic-orbit'`. |
| **Overlay Render** | `GraphView.tsx:755` (`<FeatureOverlayCanvas ... />`) | Pass `orbitGuides={architectureMode === 'orbit' ? orbitGuides : undefined}` to canvas overlay. |

---

## H. GUIDE INTEGRATION

Orbit visual guides (ring concentric circles, sector boundary lines, and ring/sector labels) should be rendered using the existing `FeatureOverlayCanvas.tsx` or a lightweight `OrbitOverlayCanvas` extension.

### Guide Metadata Structure Produced by Workstream B
* **Rings:** `radiusPx`, `ringIndex`, `label` (e.g. `Presentation Layer`, `Application Layer`).
* **Sectors:** `startAngleRad`, `endAngleRad`, `sectorId`, `label` (e.g. `Order Processing`).

### Insertion Point in `FeatureOverlayCanvas.tsx`
`FeatureOverlayCanvas.tsx` already subscribes to Cytoscape pan/zoom rendering loops (`cy.on('pan zoom render', updateCanvas)`), converts graph coordinates to canvas rendering coordinates via `cy.pan()` and `cy.zoom()`, and draws shapes on an HTML5 2D overlay canvas.

C2 will add a clean rendering method `drawOrbitGuides(ctx, orbitGuides, pan, zoom)` inside `FeatureOverlayCanvas.tsx` when `orbitGuides` is present.

---

## I. CONTROLS ANALYSIS

In `explorer/src/components/GraphControls.tsx`, the architecture mode toggle button currently toggles between `hierarchical` and `hybrid`:

```tsx
// Current GraphControls.tsx
<button
  className={`graph-control-btn ${architectureMode === 'hybrid' ? 'active' : ''}`}
  onClick={onToggleArchitectureMode}
  title={architectureMode === 'hybrid' ? 'Hybrid Layout' : 'Hierarchical Layout'}
>
  {architectureMode === 'hybrid' ? '🧩' : '🏢'}
</button>
```

### Proposed C2 Change in `GraphControls.tsx`
Cycle through three modes: `'hierarchical'` $\to$ `'hybrid'` $\to$ `'orbit'` $\to$ `'hierarchical'`:

* **Icon for Orbit:** `🪐` or `🎯`
* **Title:** `Orbit Layout (Concentric Radial Map)`
* **Aria-Label:** `Switch to Orbit Layout`

---

## J. PERSISTENCE ANALYSIS

In `explorer/src/lib/projectState.ts`:

1. **`LayoutProvenance` Type:**
   ```typescript
   export type LayoutProvenance =
     | 'automatic-hierarchical'
     | 'automatic-hybrid'
     | 'automatic-orbit'      // Added for C2
     | 'user-authored';
   ```

2. **Backward Compatibility in `loadProjectState` / `mergeWithDefaultState`:**
   - Existing saved project JSON without Orbit state cleanly defaults to `'hierarchical'` and `'automatic-hierarchical'`.
   - Unknown or corrupted layout modes fallback to `'hierarchical'`.
   - When Orbit state is saved, `architectureMode: 'orbit'` and `layoutProvenance: 'automatic-orbit'` persist in `localStorage` alongside node coordinates `{ x, y }`.

---

## K. LAYOUT SWITCHING ANALYSIS

Transitions between layout modes (`hierarchical` $\to$ `hybrid` $\to$ `orbit`) must follow a clean lifecycle:

```text
User toggles mode to 'orbit'
  │
  ├── 1. Check layoutProvenance in stored project state
  │      - If provenance !== 'automatic-orbit', invalidate cached position map
  │
  ├── 2. Clear current overlay guides (setOrbitGuides(undefined))
  │
  ├── 3. Execute runLayoutWithMetadataAsync({ architectureMode: 'orbit' })
  │      - Offload computation to Web Worker
  │
  ├── 4. Worker returns Orbit positions and guideMetadata
  │
  ├── 5. Apply Position Authority (Level 1-3 user overrides preserved if active)
  │
  ├── 6. Update Cytoscape node positions batch
  │
  ├── 7. Store positions with layoutProvenance = 'automatic-orbit'
  │
  └── 8. Render Orbit concentric ring guides on canvas overlay
```

### Stale-State Safeguards
* **Old Coordinates:** Prevented by provenance validation (`layoutProvenance === 'automatic-orbit'`).
* **Old Guides:** Canvas overlay automatically clears previous feature boxes or orbit rings when switching modes.
* **Worker Response:** Worker generation counter (`requestGeneration`) discards stale responses from superseded layout calls.

---

## L. FILE OWNERSHIP MATRIX FOR C2

| File Path | Proposed C2 Ownership | Expected Changes |
| :--- | :--- | :--- |
| `explorer/src/types/explorer.ts` | **Workstream C2** | Add `'orbit'` to `ArchitectureLayoutMode`. |
| `explorer/src/lib/projectState.ts` | **Workstream C2** | Add `'automatic-orbit'` to `LayoutProvenance` and update merge fallback logic. |
| `explorer/src/lib/architecture-layout.ts` | **Workstream C2** | Add `architectureMode === 'orbit'` dispatch branch calling Workstream A & B engines. |
| `explorer/src/lib/workers/layout-worker-types.ts` | **Workstream C2** | Add optional `orbitGuideSummary` to worker IPC response types. |
| `explorer/src/lib/workers/layout.worker.ts` | **Workstream C2** | Forward `options` to layout engine (0 code changes required if options forwarded). |
| `explorer/src/lib/workers/layout-worker-client.ts` | **Workstream C2** | Pass `orbitGuideMetadata` from worker response to client caller. |
| `explorer/src/components/GraphControls.tsx` | **Workstream C2** | Update 3-way mode toggle button UI (`hierarchical` / `hybrid` / `orbit`). |
| `explorer/src/components/GraphView.tsx` | **Workstream C2** | Wire Orbit provenance check, mode switch, and overlay guide state. |
| `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | **Workstream C2** | Add `drawOrbitGuides` canvas rendering loop. |

---

## M. SHARED INFRASTRUCTURE PROTECTION

The following shared infrastructure files **MUST NOT** be modified during C2 implementation:

* `explorer/src/lib/layout/layers.ts` (Layer classification engine)
* `explorer/src/lib/layout/features.ts` (Feature discovery engine)
* `explorer/src/lib/layout/domains.ts` (Domain discovery engine)
* `explorer/src/lib/layout/feature-roles.ts` (Feature roles classification)
* `explorer/src/lib/layout/centrality.ts` (Centrality analysis)
* `explorer/src/lib/layout/graph-index.ts` (Graph index queries)
* `explorer/src/lib/position-policy.ts` (5-level position authority engine)
* `explorer/src/lib/layout/global-layout.ts` (Hierarchical/Hybrid global layout engine)
* `explorer/src/lib/layout/local-layout.ts` (Hierarchical/Hybrid local layout engine)
* `explorer/src/lib/layout/satellites.ts` (Satellite placement engine)
* `explorer/src/lib/layout/constellation-layout.ts` (Dependency constellation engine)

---

## N. EXISTING-LAYOUT REGRESSION MATRIX

C2 must execute and pass the following regression suites to prove zero breakage of existing layouts:

```bash
# 1. Root CLI Integration Test Suite
npm run test:cli

# 2. Position Authority & Policy Tests
node scripts/test-deterministic-contract.cjs

# 3. Architecture Layout Integration Tests
cd explorer && npx vitest run src/lib/architecture-layout.test.ts

# 4. Global & Local Layout Tests
cd explorer && npx vitest run src/lib/layout/global-layout.test.ts
cd explorer && npx vitest run src/lib/layout/local-layout.test.ts

# 5. GraphView & Controls Integration Tests
cd explorer && npx vitest run src/components/GraphView.test.tsx
cd explorer && npx vitest run src/components/GraphControls.test.tsx

# 6. Project State Persistence Tests
cd explorer && npx vitest run src/lib/projectState.test.ts
```

---

## O. RISK REGISTER

| Risk | Evidence / Source | Impact | C2 Mitigation | Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Mode Dispatch Conflict** | `architecture-layout.ts` | Invalid mode selection or crash. | Add explicit `if (options.architectureMode === 'orbit')` branch with fallback to `hierarchical`. | Unit test mode dispatch with invalid input. |
| **Position Provenance Conflict** | `projectState.ts` / `GraphView.tsx` | Stale Cartesian grid positions reused for polar Orbit layout. | Strictly isolate `layoutProvenance = 'automatic-orbit'` and invalidate positions on mode switch if provenance mismatch. | Verify mode switch clears position cache. |
| **Worker Protocol Mismatch** | `layout-worker-client.ts` | IPC serialization failure or dropped responses. | Keep worker message request/response structure identical; pass Orbit options inside existing `options` object. | Test worker async offloading with Orbit options. |
| **Canvas Guide Overlap** | `FeatureOverlayCanvas.tsx` | Orbit rings rendered on top of Hybrid feature boxes. | Render Orbit guides conditionally based strictly on `architectureMode === 'orbit'`. | Visual/unit test for overlay canvas. |
| **Existing Layout Regression** | `architecture-layout.ts` | Breaking `hierarchical` or `hybrid` output. | Zero modifications to existing layout functions (`computeGlobalDomainLayout`, `computeGlobalFeatureLayout`). | Run full regression suite (`npm run test:cli`). |

---

## P. C2 IMPLEMENTATION ORDER

Following A+B convergence, Workstream C2 must execute in the following precise order:

1. **Finalized A/B API Verification:** Confirm `orbit-semantics.ts` (A) and `orbit-layout.ts` (B) conform to the Master Execution Contract.
2. **Type Definition Updates:** Add `'orbit'` to `ArchitectureLayoutMode` in `types/explorer.ts` and `'automatic-orbit'` to `LayoutProvenance` in `projectState.ts`.
3. **Orchestrator Dispatch:** Add the Orbit branch in `explorer/src/lib/architecture-layout.ts`.
4. **Worker Transport Wiring:** Update `layout-worker-types.ts` and `layout-worker-client.ts` to pass Orbit guide metadata.
5. **Project State Persistence:** Update `loadProjectState` / `mergeWithDefaultState` fallbacks in `projectState.ts`.
6. **UI Controls Toggle:** Add Orbit toggle state to `GraphControls.tsx`.
7. **GraphView Integration:** Wire Orbit layout execution, provenance checking, and overlay state in `GraphView.tsx`.
8. **Guide Rendering:** Implement `drawOrbitGuides` in `FeatureOverlayCanvas.tsx`.
9. **Regression Execution:** Run full CLI and Vitest regression suites.

---

## Q. C2 STOP CONDITIONS

C2 execution **MUST IMMEDIATELY STOP AND ESCALATE** if any of the following occur:

1. **A/B Interface Mismatch:** Workstream A or B exports types that violate the frozen contract in `ARCHITECTURE_ORBIT_MASTER_EXECUTION_CONTRACT.md`.
2. **Position Authority Mutation:** Position authority policy (`position-policy.ts`) requires modification to accommodate Orbit.
3. **Existing Layout Mutation:** Implementing Orbit requires modifying `computeGlobalDomainLayout` or `computeGlobalFeatureLayout`.
4. **Regression Failure:** Any existing layout test in `npm run test:cli` or Vitest regression suites fails.

---

## R. FINAL VERDICT

```text
READY FOR C2
```

Workstream C1 is complete. All integration points, file ownership boundaries, data flows, and risk mitigations are mapped. Convergence with Workstreams A and B can proceed cleanly.
