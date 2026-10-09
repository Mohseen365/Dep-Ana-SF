# Current Contracts & Interfaces

## 1. Primary Explorer Data Contracts (`explorer/src/types/explorer.ts`)

### `ExplorerData` Interface
```typescript
export interface ExplorerData {
  manifest: {
    projectId: string;
    projectName: string;
    generatedAt: string;
    version: string;
  };
  nodes: Node[];
  edges: Edge[];
  features?: Feature[];
  metadata?: {
    totalNodes: number;
    totalEdges: number;
    metrics?: Record<string, any>;
  };
}
```

### `Node` Interface
```typescript
export interface Node {
  id: string;                      # Canonical ID e.g. "ApexClass:ApprovalController"
  name: string;                    # Display label
  type: string;                    # "ApexClass" | "ApexTrigger" | "CustomObject" | "Flow" | "LWC"
  layer?: 'presentation' | 'application' | 'domain' | 'schema';
  role?: 'entry_point' | 'controller' | 'service' | 'utility' | 'data_access';
  featureId?: string;
  primaryDomainId?: string;
  secondaryDomainIds?: string[];
  metrics?: {
    loc?: number;
    complexity?: number;
    fanIn?: number;
    fanOut?: number;
    pageRank?: number;
  };
}
```

### `Edge` Interface
```typescript
export interface Edge {
  id: string;                      # Canonical edge ID e.g. "Edge:A->B"
  source: string;                  # Source node ID
  target: string;                  # Target node ID
  type: string;                    # "calls" | "references" | "extends" | "triggers"
  weight?: number;
}
```

## 2. Layout & Geometry Contracts (`explorer/src/lib/orbit-layout.ts`)

- **Lens B Position Isolation Invariant (DEF-01):** Orbit and Constellation layout results returned by `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`) must contain strictly projected node IDs (`result.projectedNodeIds`). Unprojected node IDs must not be inherited or re-injected merely because they exist in `existingPositions`.
- **Node Dimensions:** Width $W = 120\text{px}$, Height $H = 60\text{px}$, Effective Collision Box $W_{\text{eff}} = 160\text{px}$, $H_{\text{eff}} = 100\text{px}$.
- **Cartesian AABB Collision Predicate:** Two nodes collide if and only if $|\Delta x| < 160\text{px}$ AND $|\Delta y| < 100\text{px}$.
- **Radial Ring Spacing:** Minimum track/ring radial step $R_{\text{step}} = 200\text{px}$ (exceeds $188.68\text{px}$ diagonal cross-track safety threshold).
- **Orbit Ring Allocation:**
  - `R0`: Entry points ($N=43$) — ApexTriggers & LWC controllers.
  - `R1`: Application services ($N=38$).
  - `R2`: Domain controllers & logic ($N=15$).
  - `R3`: Utility & core infrastructure ($N=6$).
  - `R4`: Primary features & data objects ($N=264$).
  - `R5`: Fallback schema & unassigned nodes ($N=162$).
- **Sector Conservation Invariant:** Sector angular allocations sum to exactly $2\pi$ radians across all sectors ($S=65$ on PBIM dataset).
- **Stage 8 Corridor Clearance:** 3 legal Y Y-lanes (`[baseY, baseY - 100, baseY + 100]`) with exact AABB collision checks.
- **Stage 9 Satellite Placement:** Concentric ring traversal with bounded angular slots.

## 3. Web Worker IPC Contract (`explorer/src/lib/workers/layout-worker-types.ts`)

- **Worker Request Message:** `{ type: 'RUN_LAYOUT', payload: { data, options }, requestId: string, generation: number }`.
- **Worker Response Message:** `{ type: 'LAYOUT_COMPLETE', payload: { positions, metadata }, requestId: string, generation: number, error?: string }`.
- **Stale Protection:** Main thread discards layout results if message `generation < currentGeneration`.
- **Position Authority Invariance:** Web Worker execution guarantees `0.00000px` coordinate drift vs synchronous baseline.

## 4. URL & State Persistence Contract (`explorer/src/hooks/useViewState.ts`)

- **Opt-In URL Write Policy:**
  - Primary URL parameters center on `?node=X` and `?investigate=true|false`.
  - Modular feature query parameters (e.g. `focus.*`, `impact.*`, `findings.*`) are written to the URL **only** when their respective feature is actively enabled via Cmd+K or UI controls.
  - Legacy deep-links containing all parameters parse correctly on initial load without crashing.
- **Query Parameters:**
  - `project` — Active project ID e.g. `?project=pbim`.
  - `view` — Active view mode e.g. `&view=graph`, `&view=river`, `&view=matrix`.
  - `domain` — Active workspace domain e.g. `&domain=feature`.
  - `node` — Selected node ID e.g. `&node=ApexClass:ApprovalFlowController`.
  - `investigate` — Investigation drawer visibility state (`true` | `false`).
- **History Semantics:**
  - View mode & project switches use `window.history.pushState`.
  - Transient selections, hover, drawer toggles, and pan/zoom state use `window.history.replaceState`.

## 5. Detached Drawer BroadcastChannel IPC Contract (`explorer/src/lib/detached-drawer.ts`)

- **Channel Name:** `BroadcastChannel('investigator')`.
- **Message Types:**
  - `{ type: 'SELECT_NODE', nodeId: string }`: Synchronizes target node selection between main application window and detached drawer window.
  - `{ type: 'STATE_SYNC', state: object }`: Bi-directional state echo across windows.
- **Safety Invariant:** Closing or disconnecting the detached window gracefully falls back to docked drawer mode without throwing unhandled exceptions in the main thread.
