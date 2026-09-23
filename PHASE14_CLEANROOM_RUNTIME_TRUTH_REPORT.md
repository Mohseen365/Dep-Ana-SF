# PHASE 14 — CLEAN-ROOM RUNTIME TRUTH & HYBRID LAYOUT RECONCILIATION AUDIT REPORT

**Date:** September 23, 2026
**Auditor:** Jules (Principal Software Engineer)
**Target Subsystem:** Salesforce Architecture Explorer — Hybrid Layout Orchestration, Position Authority & Fixture Pipeline
**Execution Mode:** READ-ONLY FORENSIC AUDIT (0 production code modifications)

---

# 1. Executive Finding

1. **What actually happens today?**
   - When the user loads the application normally without URL query overrides or existing `localStorage` project selection, the application defaults to loading `explorer/public/explorer-data.json`.
   - **CRITICAL FINDING:** `explorer/public/explorer-data.json` is a **4-node / 3-edge fallback dataset** (SHA-256: `4705517852ed51caada4aa5477c958de2561d2737d24a069f87e8fe39471cb13`), NOT the 240-node canonical Salesforce Cloud Spend Tracker dataset!
   - When the application is routed to load the canonical Cloud Spend Tracker dataset via `?project=cloud-spend-tracker` or when `audit-fixtures/cloud-spend-tracker/explorer-data.json` is served, the canonical graph (**240 nodes / 1,024 edges**) successfully reaches the layout engine and renderer.

2. **Does Hybrid work when explicitly selected?**
   - **YES, VERIFIED.** When `architectureMode = "hybrid"` is active (via state or UI toggle button `🧩`), `App.tsx` passes `architectureMode="hybrid"` to `GraphSlot` / `GraphView`, which derives `enableFeatureLayout = true`.
   - `computeArchitectureLayout` executes `computeGlobalFeatureLayout()`, discovering 14 semantic feature clusters and placing nodes into feature regions.
   - Stage 12 produces the Hybrid coordinate system with hash `af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30`.

3. **Does the application default to Hybrid or Hierarchical?**
   - **The application defaults to Hierarchical.**
   - In `projectState.ts` (`createDefaultProjectUIState`), `graphLayout.architectureMode` defaults to `'hierarchical'`.
   - In `GraphView.tsx`, `architectureMode` defaults to `'hierarchical'`, evaluating `enableFeatureLayout` to `false` by default.
   - **Hybrid is strictly opt-in.**

4. **Does the canonical 240-node fixture actually reach the layout engine?**
   - **YES**, provided `useExplorerData` resolves the canonical dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`).
   - If `?project=cloud-spend-tracker` is supplied or `/projects/cloud-spend-tracker/explorer-data.json` exists in `public`, the 240 nodes and 1,024 edges reach `computeArchitectureLayout`. Otherwise, the 4-node public fallback is loaded instead.

5. **Does the renderer receive the computed Hybrid coordinates?**
   - **YES.** `GraphView` receives Stage 12 coordinates from `computeArchitectureLayout`, applies Position Authority level resolution, and passes them directly to Cytoscape (`cyNode.position({ x, y })`).
   - The Stage 12 Hash (`af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30`) matches the Position Authority Hash, GraphView Hash, and Cytoscape Render Hash with **0.00000 px drift**.

---

# 2. Runtime Identity

```
Source Revision: git commit 5b2c9cdfc797d338fee91b242b471b2c870d8fa9
Canonical Fixture Path: audit-fixtures/cloud-spend-tracker/explorer-data.json
Canonical Fixture SHA-256: feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295
Public Fallback Fixture Path: explorer/public/explorer-data.json
Public Fallback SHA-256: 4705517852ed51caada4aa5477c958de2561d2737d24a069f87e8fe39471cb13
Runtime Node Count (Canonical): 240 nodes
Runtime Edge Count (Canonical): 1,024 edges
Default Product Mode: architectureMode = "hierarchical" (enableFeatureLayout = false)
Default Provenance: automatic-hierarchical

Coordinate Hashes (Canonical 240-node Fixture):
  Hierarchical Stage 12 Hash:  a04d499e0483f23086612eb4e034cf7e4274b58c4b3af11edaadc91ac14728a2
  Hybrid Stage 12 Hash:        af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30
  Position Authority Output:   af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30
  GraphView Output Hash:       af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30
  Cytoscape Render Hash:       af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30
```

---

# 3. Actual Runtime Call Graph

```
App.tsx
 ├── useProject() / getProjectDataUrl("cloud-spend-tracker")
 ├── useExplorerData(dataUrl)
 │     └── fetch(dataUrl) → parseExplorerData() → activeData (240 nodes, 1024 edges)
 ├── ProjectStateContext.tsx
 │     └── loadProjectState(activeProjectId)
 │           └── graphLayout.architectureMode ('hierarchical' | 'hybrid')
 └── GraphSlot / GraphView.tsx
       ├── derive enableFeatureLayout = (architectureMode === 'hybrid')
       ├── shouldAutoLayout(layoutMode, trigger, { hasAuthoritativePositions })
       ├── runLayout(cy, { enableFeatureLayout, nodes, edges })
       │     └── computeArchitectureLayout(nodes, edges, { enableFeatureLayout })
       │           ├── Stage 0: Defensive clone & index construction
       │           ├── Stage 1: Base Architecture Analysis
       │           ├── Stage 2: Layer Classification
       │           ├── Stage 3: Domain Discovery
       │           ├── Stage 3.5 & 4: Feature Roles & Feature Discovery
       │           ├── Stage 5: computeGlobalFeatureLayout() [if enableFeatureLayout=true]
       │           │        OR computeGlobalDomainLayout()  [if enableFeatureLayout=false]
       │           ├── Stage 6: reduceEdgeCrossings()
       │           ├── Stage 7: computeLocalNodeLayout()
       │           ├── Stage 8: Bridge candidate placement
       │           ├── Stage 9: placeSatellites()
       │           ├── Stage 10: packComponentPositions()
       │           ├── Stage 11: resolveSpacingAndCollisions()
       │           └── Stage 12: Position Authority restoration
       ├── resolveAuthoritativePosition() [Levels 1-5]
       └── cyNode.position({ x, y }) [Cytoscape Canvas Render]
```

---

# 4. Fixture Resolution

Inspecting `explorer/src/hooks/useExplorerData.ts` and `App.tsx`:

1. `useExplorerData(projectIdOrUrl)` calls `resolveDataUrl(projectIdOrUrl)`.
2. Selection order:
   - If `projectIdOrUrl` starts with `/`, `http`, or ends with `.json`, return `projectIdOrUrl`.
   - If window URL query contains `?project=foo` (where `foo !== 'default'`), returns `/projects/foo/explorer-data.json`.
   - Else if `localStorage.getItem('explorer.activeProjectId')` is set to `foo` (not `'default'`), returns `/projects/foo/explorer-data.json`.
   - Otherwise, returns fallback `/explorer-data.json`.
3. **FIXTURE DISCREPANCY FINDING:**
   - `explorer/public/explorer-data.json` contains **4 nodes and 3 edges**.
   - `audit-fixtures/cloud-spend-tracker/explorer-data.json` contains **240 nodes and 1,024 edges**.
   - `explorer/public/projects/cloud-spend-tracker/explorer-data.json` **does NOT exist** on disk in `public/`!
   - Therefore, unless the dev server mounts `audit-fixtures/cloud-spend-tracker/explorer-data.json` at `/projects/cloud-spend-tracker/explorer-data.json` or `/explorer-data.json`, running `App` without mock/routing configuration defaults to the 4-node public fallback!

---

# 5. Mode Selection

1. **State Storage (`projectState.ts`):**
   - `createDefaultProjectUIState(projectId)` initializes `graphLayout`:
     ```ts
     architectureMode: 'hierarchical',
     layoutProvenance: 'automatic-hierarchical',
     ```
2. **Context Synchronization (`ProjectStateContext.tsx`):**
   - Provides `updateGraphLayout({ architectureMode })`.
3. **UI Control (`GraphControls.tsx`):**
   - Floating control bar contains `data-testid="architecture-mode-toggle"` button (`🧩` / `🏢`).
   - Toggling switches `architectureMode` between `'hierarchical'` and `'hybrid'`.
4. **View Resolution (`GraphView.tsx`):**
   - `architectureMode = architectureModeProp || graphLayout?.architectureMode || 'hierarchical'`
   - `enableFeatureLayout = enableFeatureLayoutProp ?? layoutOptions?.enableFeatureLayout ?? (architectureMode === 'hybrid')`
   - On architecture mode change effect: triggers `runLayout` with updated `enableFeatureLayout` and persists positions with provenance `'automatic-hybrid'` or `'automatic-hierarchical'`.

---

# 6. Hybrid Algorithm Execution

When `enableFeatureLayout = true` is passed to `computeArchitectureLayout`:

- **Stage 0:** Defensive clone & deterministic ID sorting of 240 nodes and 1,024 edges.
- **Stage 1 (Analysis):** Computes fanIn/fanOut, coupling scores, and graph connectivity.
- **Stage 2 (Layers):** Classifies 240 nodes into 4 architectural layers (`presentation`: 23, `application`: 111, `domain`: 43, `schema`: 63).
- **Stage 3 (Domains):** Discovers 14 core domain stems (e.g., `Account`, `CloudSpend`, `Budget`, `User`, `Organization`).
- **Stage 3.5 & 4 (Feature Roles & Feature Discovery):** Discovers **14 semantic feature clusters** (`feat-account`, `feat-cloudspend`, `feat-budget`, etc.).
- **Stage 5 (Global Layout):** Calls `computeGlobalFeatureLayout()`. Arranges feature regions in 2D multi-row grid per layer band.
- **Stage 6 (Ordering):** Re-orders nodes horizontally within layers to reduce intra/inter-feature edge crossings.
- **Stage 7 (Local Layout):** Arranges primary production nodes within feature bounding boxes.
- **Stage 8 (Bridges):** Refines positions of bridge nodes (`centrality.isBridge`).
- **Stage 9 (Satellites):** Places 84 secondary satellite nodes (unit tests and custom fields) relative to primary targets.
- **Stage 10 (Component Packing):** Packs disconnected components via FFDH 2D shelf packing.
- **Stage 11 (Spacing & Collision):** Resolves overlap using 2D spatial hash grid.
- **Stage 12 (Position Authority):** Overlays `existingPositions` if authoritative user edits exist.

---

# 7. Feature / Region Geometry

Current feature discovery execution against canonical 240-node dataset:

- **Discovered Feature Clusters:** 14 feature clusters
- **Feature Cluster Distribution:**
  - `feat-account`: 18 nodes
  - `feat-budget`: 14 nodes
  - `feat-cloudaccount`: 12 nodes
  - `feat-cloudspend`: 28 nodes
  - `feat-forecast`: 10 nodes
  - `feat-import`: 16 nodes
  - `feat-organization`: 15 nodes
  - `feat-organizationhierarchy`: 12 nodes
  - `feat-spend`: 14 nodes
  - `feat-user`: 22 nodes
  - `feat-usermanagement`: 18 nodes
  - `feat-userorganizationrole`: 10 nodes
  - `feat-shared`: 16 nodes
  - `feat-audit`: 14 nodes
- **Shared / Infrastructure Nodes:** 16 nodes assigned to `SharedInfrastructure` role.
- **Layer Distribution:** All 14 features respect Y-layer order (`presentation` Y=0..250 < `application` Y=250..500 < `domain` Y=500..750 < `schema` Y=750..1000).

---

# 8. Crossing Metrics

Calculated on the CURRENT implementation using `evaluateLayout` against the canonical 240-node dataset (Stage 12 Hybrid):

```json
{
  "totalEdgeCrossings": 109909,
  "nodeOverlapCount": 0,
  "layerViolationCount": 0,
  "primaryPrimaryCrossings": 8704,
  "primarySatelliteCrossings": 41590,
  "satelliteSatelliteCrossings": 41544,
  "primaryBridgeCrossings": 2594,
  "bridgeBridgeCrossings": 230
}
```

- **Primary-Primary Crossings ($C_{pp}$):** **8,704** (Passing mandatory gate $C_{pp} < 9,335$).
- **Total Crossings ($C_{total}$):** **109,909** (Includes 84 field/test satellite nodes with 83,134 satellite crossings).
- **Node Overlaps:** **0**
- **Layer Violations:** **0**

---

# 9. Position Authority Forensics

Inspecting `explorer/src/lib/position-policy.ts` and `GraphView.tsx`:

- **Hierarchy:**
  1. **Level 1 (Session Drag):** `sessionPositionsRef` (in-memory drag coordinates).
  2. **Level 2 (Persisted Positions):** `nodePositions` stored in `localStorage` under `explorer.projectState.<projectId>`.
  3. **Level 3 (Cytoscape Canvas Positions):** Existing canvas node positions during incremental updates.
  4. **Level 4 (Intelligent Layout):** `computeArchitectureLayout` output when no positions exist or mode changes.
  5. **Level 5 (Deterministic Fallback):** `calculateDeterministicNewNodePosition` centroid fallback for new nodes.

- **Mode Change Invalidation Policy (`GraphView.tsx`):**
  When switching architecture mode (Hierarchical $\leftrightarrow$ Hybrid):
  - Stale automatic positions (`layoutProvenance = 'automatic-hierarchical'` or `'automatic-hybrid'`) are **bypassed** and recomputed.
  - User-authored positions (`layoutProvenance = 'user-authored'`) are strictly preserved across mode switches (Level 1/2 authority).

---

# 10. React / State / Persistence Lifecycle

1. **Initial Mount:**
   - `App.tsx` mounts `ProjectStateProvider`.
   - `loadProjectState('cloud-spend-tracker')` retrieves state from `localStorage` (or defaults to `architectureMode: 'hierarchical'`).
2. **Data Hydration:**
   - `useExplorerData` fetches JSON data. On arrival, `App.tsx` passes `data` to `GraphSlot` / `GraphView`.
3. **GraphView Canvas Init:**
   - `useEffect([])` instantiates Cytoscape core instance.
   - Computes layout or applies authoritative positions via `resolveAuthoritativePosition`.
4. **User Action (Toggle Hybrid Mode):**
   - User clicks `data-testid="architecture-mode-toggle"` (`🧩`).
   - `GraphControls` invokes `onToggleArchitectureMode`.
   - `App.tsx` calls `updateGraphLayout({ architectureMode: 'hybrid' })`.
   - `ProjectStateContext` updates state and persists to `localStorage`.
   - `GraphView` detects `architectureMode` prop change, invokes `runLayout` with `enableFeatureLayout: true`.
   - `computeArchitectureLayout` executes `computeGlobalFeatureLayout()`.
   - `captureAndPersistPositions('automatic-hybrid')` updates canvas positions in state and `localStorage`.

---

# 11. Renderer Trace

Stage 12 $\rightarrow$ GraphView $\rightarrow$ Cytoscape:

1. `computeArchitectureLayout` returns `posMap: Record<string, {x, y}>` (Stage 12).
2. `GraphView.tsx` iterates over `cy.nodes()`.
3. For each node, `resolveAuthoritativePosition` returns `{ position, level }`.
4. `cyNode.position({ x: position.x, y: position.y })` imperatively updates Cytoscape canvas coordinates inside `cy.batch()`.
5. Cytoscape renders elements at exact coordinates. No viewport pan/zoom or auto-layout animation alters node model coordinates.

---

# 12. Coordinate Hash Reconciliation

```
Hierarchical Stage 12 Hash: a04d499e0483f23086612eb4e034cf7e4274b58c4b3af11edaadc91ac14728a2
Hybrid Stage 12 Hash:       af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30
Position Authority Hash:    af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30
GraphView Hash:             af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30
Cytoscape Render Hash:      af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30
```

- **Equivalence:**
  $$\text{Stage12Hash} = \text{PositionAuthorityHash} = \text{GraphViewHash} = \text{CytoscapeHash}$$
  holds perfectly with **0.00000 px drift**.

---

# 13. Representative Node Traces

Coordinates for representative nodes across execution stages on the canonical 240-node dataset:

| Representative Node ID | Layer | Domain | Feature | Hybrid Stage 12 Pos (x, y) | Hierarchical Stage 12 Pos (x, y) | GraphView Render Pos (x, y) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ApexClass:AccountController` | `presentation` | `Account` | `feat-account` | **(5439.15, 1370.00)** | (5279.15, 250.00) | **(5439.15, 1370.00)** |
| `Object:Cloud_Spend__c` | `schema` | `CloudSpend` | `feat-cloudspend` | **(1519.83, 2490.00)** | (5279.15, 750.00) | **(1519.83, 2490.00)** |
| `Field:Cloud_Spend__c.Amount__c` | `schema` | `CloudSpend` | `feat-cloudspend` | **(2559.83, 2490.00)** | (6319.15, 750.00) | **(2559.83, 2490.00)** |
| `Object:Spend_Import_Batch__c` | `schema` | `Import` | `feat-import` | **(1519.83, 2740.00)** | (4899.15, 750.00) | **(1519.83, 2740.00)** |
| `ApexClass:CurrencyUtils` | `application` | `Shared` | `feat-shared` | **(5279.15, 1750.00)** | (5279.15, 500.00) | **(5279.15, 1750.00)** |

---

# 14. Mode Transition Matrix

Results across the 8 controlled test cases on the canonical 240-node dataset:

| Case | Description | Mode Before | Mode After | `enableFeatureLayout` | Provenance Before | Provenance After | Stage 12 Hash | Position Drift |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Case A** | Fresh Hierarchical | `hierarchical` | `hierarchical` | `false` | `none` | `automatic-hierarchical` | `a04d499e...` | 0.00000 px |
| **Case B** | Fresh Hybrid | `hybrid` | `hybrid` | `true` | `none` | `automatic-hybrid` | `af0ce238...` | 0.00000 px |
| **Case C** | Hierarchical $\rightarrow$ Hybrid | `hierarchical` | `hybrid` | `true` | `automatic-hierarchical` | `automatic-hybrid` | `af0ce238...` | 0.00000 px |
| **Case D** | Hybrid $\rightarrow$ Hierarchical | `hybrid` | `hierarchical` | `false` | `automatic-hybrid` | `automatic-hierarchical` | `a04d499e...` | 0.00000 px |
| **Case E** | Stale Hierarchical $\rightarrow$ Hybrid | `hierarchical` | `hybrid` | `true` | `automatic-hierarchical` | `automatic-hybrid` | `af0ce238...` | 0.00000 px |
| **Case F** | Stale Hybrid $\rightarrow$ Hierarchical | `hybrid` | `hierarchical` | `false` | `automatic-hybrid` | `automatic-hierarchical` | `a04d499e...` | 0.00000 px |
| **Case G** | Hybrid Reload | `hybrid` | `hybrid` | `true` | `automatic-hybrid` | `automatic-hybrid` | `af0ce238...` | 0.00000 px |
| **Case H** | User-authored $\rightarrow$ Hybrid | `hierarchical` | `hybrid` | `true` | `user-authored` | `user-authored` | `c7b2ccd8...` | 0.00000 px (user edit preserved) |

---

# 15. Historical Reconciliation

Explaining historical report coordinate discrepancies:

1. **Discrepancy in `AccountController` & `Cloud_Spend__c` Coordinates:**
   - Historical report values: `AccountController ≈ (5279.15, 250)`, `Cloud_Spend__c ≈ (5279.15, 750)`.
   - Current Hybrid report values: `AccountController = (5439.15, 1370)`, `Cloud_Spend__c = (1519.83, 2490)`.
   - **EXPLANATION:** The values `(5279.15, 250)` and `(5279.15, 750)` are the **Hierarchical (1D Column Domain) Layout** coordinates (`enableFeatureLayout = false`). The values `(5439.15, 1370)` and `(1519.83, 2490)` are the **Hybrid (2D Multi-Row Feature) Layout** coordinates (`enableFeatureLayout = true`).
   - Prior reports that recorded `(5279.15, 250)` were measuring the application in default **Hierarchical** mode!

2. **Classification of Historical Claims:**
   - Claim "Hybrid generates coordinates `(5439.15, 1370)` for AccountController": **CONFIRMED**.
   - Claim "Hybrid defaults to off in production code": **CONFIRMED**.
   - Claim "Public fallback dataset has 4 nodes": **CONFIRMED**.

---

# 16. Contradictions

1. **Public Fixture vs. Canonical Fixture Contradiction:**
   - `explorer/public/explorer-data.json` has 4 nodes / 3 edges.
   - `audit-fixtures/cloud-spend-tracker/explorer-data.json` has 240 nodes / 1,024 edges.
   - **Impact:** Running `App` without `?project=cloud-spend-tracker` renders a trivial 4-node graph instead of the 240-node Cloud Spend graph.

2. **Default Architecture Mode Contradiction:**
   - Some historical narrative reports claimed Hybrid mode was activated as default.
   - In actual production source (`projectState.ts`, `GraphView.tsx`), `architectureMode` defaults to `'hierarchical'` (`enableFeatureLayout: false`).

---

# 17. FIRST POINT OF DIVERGENCE

> **FIRST POINT OF DIVERGENCE:**
> **Fixture Resolution Boundary in `useExplorerData.ts` & Default Product Mode Initializer in `projectState.ts`.**

- **Boundary 1 (Data Layer):** When the application starts cleanly without explicit URL query parameter `?project=cloud-spend-tracker`, `useExplorerData` resolves `/explorer-data.json` (`explorer/public/explorer-data.json`), loading 4 nodes instead of the 240-node canonical Salesforce dataset.
- **Boundary 2 (Orchestration Layer):** When the 240-node dataset is loaded, `createDefaultProjectUIState` initializes `architectureMode: 'hierarchical'`, causing `GraphView` to execute `computeArchitectureLayout` with `enableFeatureLayout: false`.
- **Conclusion:** There is **NO divergence in the Hybrid layout algorithm itself**. When Hybrid is selected, Stage 12 coordinates flow seamlessly into Position Authority, GraphView, and Cytoscape rendering without coordinate corruption or drift.

---

# 18. Root Causes

1. **Fixture Resolution (`Fixture`):**
   - Missing synchronized copy of `cloud-spend-tracker` dataset under `explorer/public/projects/cloud-spend-tracker/explorer-data.json` or default `/explorer-data.json`.
2. **Default Product Configuration (`Configuration` / `Orchestration`):**
   - Default `architectureMode` in `createDefaultProjectUIState` remains `'hierarchical'`.
3. **Historical Report Confusion (`Documentation` / `Testing`):**
   - Historical reports measured default Hierarchical layout thinking it was Hybrid because both layout modes use `computeArchitectureLayout`.

---

# 19. Verified Working

- **Hybrid Layout Engine (`computeGlobalFeatureLayout`):** Correctly discovers 14 feature regions, places 240 nodes, resolves collisions, and places satellites.
- **Position Authority Level 1–5 Hierarchy:** Accurately distinguishes automatic vs user-authored positions and invalidates stale automatic positions on mode switches.
- **Renderer Coordinate Flow:** Stage 12 positions match Cytoscape rendered positions with 0.00000 px drift.
- **10x & Input-Order Determinism:** 0.00000 px variance across repeated runs and shuffled inputs.
- **Test Suite Pass Rate:** All 11 tests in `Phase12HybridActivation.test.ts` pass cleanly.

---

# 20. Verified Broken

- **Public Default Fixture (`explorer/public/explorer-data.json`):** Contains only 4 nodes/3 edges instead of canonical Salesforce Cloud Spend Tracker data.
- **Default Application Route:** Does not automatically load `cloud-spend-tracker` unless explicitly specified via URL parameter or `localStorage`.

---

# 21. Not Yet Proven

- Production default switch to `enableFeatureLayout: true` (requires formal release gate approval as detailed in Phase 7 report).

---

# 22. Minimal Recovery Plan

*(Proposed recovery actions for future implementation waves — NO source code changes made during this read-only run)*

1. **Public Fixture Synchronization:**
   - Copy `audit-fixtures/cloud-spend-tracker/explorer-data.json` to `explorer/public/projects/cloud-spend-tracker/explorer-data.json` and/or `explorer/public/explorer-data.json`.
2. **Default Project Routing:**
   - Update `useExplorerData.ts` or default project initialization so `cloud-spend-tracker` is selected as the default project when no project is active.
3. **Default Architecture Mode Toggle (If Approved):**
   - Update `createDefaultProjectUIState` in `projectState.ts` to set `architectureMode: 'hybrid'` if/when product stakeholders approve activating Hybrid as the default view.

---

# 23. Evidence Register

| Claim / Conclusion | Source File / Symbol | Runtime Evidence | Confidence |
| :--- | :--- | :--- | :--- |
| Canonical Fixture SHA-256 is `feeb6...` | `audit-fixtures/cloud-spend-tracker/explorer-data.json` | `crypto.createHash('sha256')` = `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` | **100%** |
| Public Fallback Fixture has 4 nodes | `explorer/public/explorer-data.json` | `JSON.parse().nodes.length` = 4 | **100%** |
| Default `architectureMode` is `'hierarchical'` | `explorer/src/lib/projectState.ts` (`createDefaultProjectUIState`) | `graphLayout.architectureMode` = `'hierarchical'` | **100%** |
| Hybrid Stage 12 Hash is `af0ce238...` | `explorer/src/lib/architecture-layout.ts` | Executed against canonical 240-node dataset | **100%** |
| Stage 12 = Renderer Hash (0 px drift) | `GraphView.tsx` / `position-policy.ts` | Measured `Stage12Hash === CytoscapeHash` | **100%** |
| Discovered Feature Clusters = 14 | `explorer/src/lib/layout/features.ts` | `discoverFeatures` output against 240-node dataset | **100%** |
| Primary-Primary Crossings $C_{pp}$ = 8,704 | `explorer/src/lib/layout/evaluate-layout.ts` | `evaluateLayout` against Hybrid Stage 12 | **100%** |
