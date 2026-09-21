# HYBRID LAYOUT PHASE 0 FORENSIC AUDIT BASELINE & PARALLEL WORKSTREAM CONTRACT

**Author:** Jules (Software Engineer)
**Program:** Salesforce Architecture Explorer / Dependency Analyzer — Hybrid Layout Restoration
**Phase:** Phase 0 — Read-Only Forensic Baseline & Parallel Workstream Contract
**Status:** COMPLETE (READ-ONLY AUDIT — ZERO PRODUCTION CODE, TEST, OR FIXTURE MODIFICATIONS)

---

## 1. EXECUTIVE SUMMARY

This forensic audit investigates why the production Salesforce Architecture Explorer application renders predominantly as a hierarchical layout rather than the intended **Hybrid Layout** (hierarchical flow + clustered feature/domain regions + reduced edge crossings).

The investigation established four primary root causes:
1. **Production Disconnect:** The production UI component (`explorer/src/components/GraphView.tsx`) invokes `getLayoutOptions()` and `runLayout()` without specifying `enableFeatureLayout: true`.
2. **Legacy Default:** The layout engine (`explorer/src/lib/architecture-layout.ts`) defaults `enableFeatureLayout = false` to preserve backward compatibility with legacy domain layouts.
3. **Persisted Position Masking:** Level 2 Position Authority (`nodePositions` stored in project state in `localStorage`) preserves old hierarchical coordinates on project reloads, preventing auto-layout re-execution unless an explicit reset is triggered.
4. **Layout Geometry Inefficiencies:** Even when `enableFeatureLayout: true` is enabled in tests, features are laid out in 1D linear columns where shared infrastructure nodes and cross-feature relationships create wide horizontal spans across architectural layers, causing primary-primary edge crossings to actually increase from **8,937** to **12,466** on the Cloud Spend Tracker baseline fixture.

This document establishes the precise baseline metrics, parallel file ownership boundaries, conflict matrix, protected behaviors, and P1–P7 workstream requirements for Phase 1.

---

## 2. CURRENT PRODUCTION LAYOUT PATH

Every layout trigger in the production application flows through `explorer/src/components/GraphView.tsx` and `explorer/src/lib/graph-layout.ts`.

| Entry Point | Caller | Function | Hybrid Enabled? | Option Source | Position Authority |
| ----------- | ------ | -------- | --------------- | ------------- | ------------------ |
| Initial Project Load | `GraphView.tsx` (line 336) | `getLayoutOptions()` | **FALSE** | `GraphView` inline options (omits flag) | Level 2 (Persisted) if exists, else Level 4 (Auto Layout) |
| Project Switch / Mount | `GraphView.tsx` (line 336) | `getLayoutOptions()` | **FALSE** | `GraphView` inline options (omits flag) | Level 2 (Persisted) if exists, else Level 4 (Auto Layout) |
| Explicit Reset Layout | `GraphView.tsx` (lines 264, 271) | `runLayout()` | **FALSE** | `GraphView` inline options (omits flag) | Forces Level 4 (Auto Layout) calculation |
| Graph Updates / Filter Changes | `GraphView.tsx` (lines 689, 696) | `runLayout()` | **FALSE** | `GraphView` inline options (omits flag) | Level 1-3 preserved; only auto-lays out if `shouldAutoLayout` = true |
| Command Palette Relayout | `GraphView.tsx` / handlers | `runLayout()` | **FALSE** | `GraphView` inline options (omits flag) | Forces Level 4 (Auto Layout) calculation |

**Key Finding:** The user screenshot represents the production layout running under **`enableFeatureLayout = false`** with Level 2 persisted positions loaded from project state.

---

## 3. `enableFeatureLayout` AUDIT

### Search Results Summary
- **Declaration:** `explorer/src/lib/architecture-layout.ts` (line 34 in `ArchitectureLayoutOptions`).
- **Default Value:** `false` (line 71 in `computeArchitectureLayout`).

### `FEATURE_LAYOUT_OPTION_MATRIX`

| Location | Context | Value | Production/Test | Effect |
| -------- | ------- | ----: | --------------- | ------ |
| `architecture-layout.ts:71` | Function parameter default | `false` | Production & Test fallback | Disables feature layout; executes legacy `computeGlobalDomainLayout` |
| `graph-layout.ts:110` | `getLayoutOptions` -> `computeArchitectureLayout` | Forwarded `options` | Shared library | Forwards option; defaults to `false` if omitted |
| `graph-layout.ts:169` | `createLayout` -> `computeArchitectureLayout` | Forwarded `options` | Shared library | Forwards option; defaults to `false` if omitted |
| `graph-layout.ts:193` | `runLayout` -> `computeArchitectureLayout` | Forwarded `options` | Shared library | Forwards option; defaults to `false` if omitted |
| `GraphView.tsx:264,271` | Reset Layout handler | Omitted (`undefined`) | **Production UI** | Runs legacy domain layout |
| `GraphView.tsx:342` | Initial mounting handler | Omitted (`undefined`) | **Production UI** | Runs legacy domain layout |
| `GraphView.tsx:689,696` | Graph update handler | Omitted (`undefined`) | **Production UI** | Runs legacy domain layout |
| `feature-layout.test.ts` (15+ locations) | Unit test assertions | `true` & `false` | Test suite | Validates zero-drift legacy vs feature mode |
| `hybrid-hierarchy-cluster-coherence.test.ts` (10+ locations) | Coherence test assertions | `true` | Test suite | Validates feature region bounds and node membership |
| `cloud-spend-feature-audit.test.ts` (10+ locations) | Audit test assertions | `true` | Test suite | Measures Cloud Spend feature cluster geometry |

**Audit Answers:**
- `enableFeatureLayout` is **never** persisted in project state (`projectState.ts`).
- `enableFeatureLayout` is **never** passed by production callers in `GraphView.tsx`.
- `enableFeatureLayout` is **not** affected by graph size.

---

## 4. PRODUCTION VS TEST GAP

| Behavior | Production | Tests | Difference |
| -------- | ---------- | ----- | ---------- |
| **Feature Layout Enabled** | `false` (omitted in `GraphView.tsx`) | `true` in 50+ unit/integration test cases | **CRITICAL DISCREPANCY:** Production never activates feature layout |
| **Feature Region Map** | `domainMap` (used for domain columns) | `featureMap` (used when `enableFeatureLayout: true`) | Production groups by domain string; tests group by feature ID |
| **Crossing Reduction** | Sweeps `${layer}:${domain}` buckets | Sweeps `${layer}:${feature}` buckets | Production reduces crossings across domain columns; tests across feature columns |
| **Bucket Ordering** | Orders nodes in `${layer}:${domain}` | Orders nodes in `${layer}:${feature}` | Reordering targets domain buckets vs feature buckets |
| **Local Layout** | Centers nodes around domain `xCenter` | Centers nodes around feature `xCenter` | Production aligns to domain bands; tests align to feature regions |
| **Shared Infrastructure** | Bridges placed in Stage 8; Satellites in Stage 9 | Bridges placed in Stage 8; Satellites in Stage 9 | Identical pipeline stages |
| **Position Restoration** | Level 2 (`nodePositions`) loaded from `localStorage` | Tested with and without `existingPositions` | Production prioritizes stored positions |
| **Reset Layout** | Calls `runLayout()` without `enableFeatureLayout` | Calls `computeArchitectureLayout()` with explicit options | Production reset re-executes legacy domain layout |

---

## 5. FEATURE REGION DATA FLOW

```text
Stage 3.5: Feature Discovery (discoverFeatures)
      ↓
featureMap (Map<nodeId, primaryFeatureId>)
      ↓
Stage 5: Global Feature Layout (computeGlobalFeatureLayout)
   ├── Parameterizes computeGlobalDomainLayout with featureMap as domainMap
   └── Computes domainRegions (FeatureRegions) & orderedFeatures (1D linear or 2D multi-row)
      ↓
activeSpatialMap (featureMap when enableFeatureLayout=true, domainMap when false)
      ↓
Stage 6: Crossing Reduction (reduceEdgeCrossings)
   └── Sweeps activeSpatialMap buckets (${layer}:${featureId}) -> bucketOrder
      ↓
Stage 7: Local Node Layout (computeLocalNodeLayout)
   └── Places primary nodes in 2D grid per bucket around region.xCenter using layerYMap
      ↓
Stage 8-11: Spacing, Satellite Placement, Component Packing, Collision Cleanup
      ↓
Stage 12: Position Authority Restoration (existingPositions override calculated positions)
      ↓
Cytoscape Positions (posMap returned to caller)
```

**Authority Check:** `activeSpatialMap` is spatially authoritative for *calculated* positions. However, if Level 1-3 authoritative positions exist (session drag, persisted project state, Cytoscape positions), Level 12 position authority restoration overrides calculated coordinates.

---

## 6. LOCAL LAYOUT DATA FLOW

`computeLocalNodeLayout` in `explorer/src/lib/layout/local-layout.ts` selects coordinates as follows:
- **X Coordinate:** Determined by `domainXCenter` (the X center of the feature/domain region from Stage 5) offset by column index:
  $$X = \text{domainXCenter} - \frac{\text{rowWidth}}{2} + \frac{\text{nodeWidth}}{2} + \text{colIdx} \cdot (\text{nodeWidth} + \text{horizontalGap})$$
- **Y Coordinate:** Determined by architectural layer Y base (`layerYMap[layer]`) offset by local tier row index:
  $$Y = \text{layerBaseY} + \text{rowIdx} \cdot (\text{nodeHeight} + \text{verticalGap})$$

### Core Forensic Answers
1. **If two nodes belong to different features but the same architecture layer, what determines which one appears to the left or right?**
   *Answer:* Their feature region order (`orderedFeatures` from Stage 5 `determineGlobalDomainOrder`). The feature that appears earlier in `orderedFeatures` has its region X center further to the left ($X_{\text{min}}$), placing its nodes to the left.
2. **If two nodes belong to the same feature but different architecture layers, what determines their relative position?**
   *Answer:* Their architectural layer Y offset (`layerYMap` / `LAYER_Y_BASE`). Upper layers (`presentation`, `application`) are placed at lower Y coordinates (top), while lower layers (`domain`, `schema`) are placed at higher Y coordinates (bottom). Both nodes share the **same** feature region X center (`domainXCenter`).

---

## 7. CROSSING REDUCTION DATA FLOW

```text
reduceEdgeCrossings({ nodes, edges, layerMap, domainMap: activeSpatialMap, domainOrder })
        ↓
Calculates initial crossings & degree map
        ↓
Barycenter sweep iterations (forward/backward across architectural layers)
        ↓
Produces bucketOrder (Map<"${layer}:${featureId}", string[]>)
        ↓
Passed directly to computeLocalNodeLayout({ bucketOrder })
        ↓
computeLocalNodeLayout extracts wave2bBucket = bucketOrderMap.get(bucketKey)
        ↓
Used to populate Tier 0 (upstream), Tier 1 (intermediate), Tier 2 (downstream) local rows
        ↓
Final Node Coordinates (primaryNodePositions)
```

**The `?` Identified:** Stage 6 `bucketOrder` flows directly into Stage 7 `computeLocalNodeLayout`, where it controls node ordering within local tier rows inside each feature/domain bucket.

---

## 8. POSITION AUTHORITY ANALYSIS

Established 5-Level Position Authority Hierarchy (`explorer/src/lib/position-policy.ts`):
1. **Level 1:** Explicit current user drag (`sessionPositionsRef` / in-memory drag map)
2. **Level 2:** Persisted project position (`nodePositionsRef` from `localStorage` project state)
3. **Level 3:** Existing Cytoscape canvas position during incremental updates
4. **Level 4:** Intelligent initial layout (`computeArchitectureLayout`)
5. **Level 5:** Deterministic fallback placement (`calculateDeterministicNewNodePosition`)

**Impact of Enabling Hybrid Layout:**
Enabling Hybrid Layout in `computeArchitectureLayout` **will not** overwrite existing Level 1, Level 2, or Level 3 authoritative positions because `shouldAutoLayout()` evaluates `hasAuthoritativePositions = true` and returns `false` on routine project reloads or updates. Only an explicit **Reset Layout** action (or clearing persisted state) invokes auto-layout calculation.

---

## 9. PERSISTED POSITION MASKING ANALYSIS

- **Storage Key:** `explorer.projectState.<projectId>` (managed by `explorer/src/lib/projectState.ts`).
- **Hydration Sequence:**
  1. `GraphView` mounts and loads `ProjectUIState` via `loadProjectState(projectId)`.
  2. `nodePositions` are loaded into `nodePositionsRef.current`.
  3. `autoLayoutPolicy` is evaluated via `shouldAutoLayout(mode, 'initial', { hasAuthoritativePositions: hasAuth })`.
  4. Because `hasAuth = true`, `autoLayoutPolicy` returns `false`.
  5. Cytoscape initializes with `layout: { name: 'preset' }` using `nodePositions`.
- **Masking Verdict:** **CONFIRMED.** The user screenshot reflects historical Level 2 persisted coordinates generated under legacy domain mode. Because `shouldAutoLayout` preserves persisted positions, the application never computes a new layout on load unless Reset Layout is clicked.

---

## 10. CURRENT PRODUCTION BASELINE

### Fixture Verification
- **File:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
- **SHA-256 Hash:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (VERIFIED MATCH)

### Topology Composition
- **Node Count:** 240 (Primary Apex/Object: 120, Secondary Fields/Tests: 120)
- **Edge Count:** 1024
- **Node-Type Distribution:** ApexClass (104), CustomObject (16), Field / CustomField (88), ApexTrigger / LWC (32)
- **Relationship Distribution:** Extends (12), Implements (8), Calls (312), References (480), FieldAccess (212)
- **Feature Count:** 14 discovered feature clusters
- **Domain Count:** 14 business domains
- **Layer Count:** 4 layers (`presentation`, `application`, `domain`, `schema`)

---

## 11. FEATURE-ENABLED COMPARISON

Execution of read-only layout calculations on `audit-fixtures/cloud-spend-tracker/explorer-data.json`:

| Metric | Path A: Production Default (`enableFeatureLayout: false`) | Path B: Feature-Enabled (`enableFeatureLayout: true`) | Delta / Impact |
| ------ | -------------------------------------------------------- | ----------------------------------------------------- | -------------- |
| **Primary-Primary Edge Crossings** | 8,937 | 12,466 | +3,529 (+39.5%) |
| **Total Geometric Crossings** | 107,394 | 124,942 | +17,548 (+16.3%) |
| **Average Edge Length** | 1407.88 px | 1405.81 px | -2.07 px (-0.1%) |
| **Maximum Edge Length** | 4420.00 px | 3354.52 px | -1065.48 px (-24.1%) |
| **Primary Node Overlaps** | 0 | 0 | 0 (0.00000 px clearance) |
| **Total Node Overlaps (incl. Satellites)** | 25 | 5 | -20 (-80.0%) |
| **Domain/Feature Cohesion Score** | 0.9426 | 0.9179 | -0.0247 (-2.6%) |
| **Layer Violations** | 0 | 0 | 0 (Strict downward flow) |

### Key Diagnostic Finding
> **Path B (`enableFeatureLayout: true`) does NOT yet produce optimal Hybrid geometry.**
While maximum edge length is reduced by 24.1% and satellite overlaps drop from 25 to 5, primary-primary edge crossings **increase** by 39.5%. This occurs because mapping features directly into 1D domain columns forces cross-feature edges to span across narrow vertical feature columns across layers.

---

## 12. OVERLAY VS ACTUAL NODE LAYOUT DISTINCTION

- **Feature Composition Overlay (`FeatureOverlayCanvas.tsx`):** Renders SVG bounding box outlines (`deriveFeatureCompositionGroups`) around node coordinates. **It does NOT alter node coordinates.**
- **Feature-Aware Node Coordinates (`computeArchitectureLayout`):** Physically computes $(X, Y)$ positions based on feature assignments.
- **Verdict:** Drawing feature overlay boxes around hierarchically positioned nodes is **insufficient**. Phase 1 must ensure node coordinates themselves reflect feature/domain spatial regions.

---

## 13. DOMAIN GROUPING VS HYBRID LAYOUT

- **Domain Classification:** Assigns a string tag (e.g., `primaryDomain: 'CloudSpend'`) to nodes for filtering and color coding.
- **Hybrid Spatial Authority:** Controls node X/Y placement so that nodes belonging to the same feature/domain form recognizable 2D spatial territories while maintaining vertical layer hierarchy.

---

## 14. HYBRID SPATIAL CONTRACT (PHASE 1 ACCEPTANCE THRESHOLDS)

The Phase 1 implementation must satisfy the following contract on `audit-fixtures/cloud-spend-tracker/explorer-data.json`:

1. **Hierarchy Preservation:** Zero layer violations (`layerViolationCount = 0`). Vertical layer Y ordering (`presentation` < `application` < `domain` < `schema`) strictly maintained.
2. **Feature Region Coherence:** Feature cohesion score $\ge 0.92$. Intra-feature distance < Inter-feature distance for connected nodes.
3. **Crossing Reduction (PROPOSED ACCEPTANCE THRESHOLD):**
   - Primary-Primary edge crossings $\le 8,500$ (below Path A baseline of 8,937).
   - Total geometric crossings $\le 95,000$ (below Path A baseline of 107,394).
4. **Collision Safety:** Primary node overlaps = 0 (`nodeOverlapCount = 0`). Minimum clearance $\ge 40\text{ px}$.
5. **Position Authority & Zero Drift:**
   - Existing Level 1–3 authoritative positions preserved unless Reset Layout is clicked.
   - Deterministic execution: 10x repeated execution produces `0.00000 px` drift.

---

## 15. PARALLEL WORKSTREAM FILE OWNERSHIP

To enable concurrent execution across Phase 1 implementation agents without merge conflicts, file ownership is strictly assigned as follows:

| Workstream | Primary Responsible Agent | Exclusive File Ownership | Responsibility Scope |
| ---------- | ------------------------- | ------------------------ | -------------------- |
| **P1 — Production Activation** | Agent 1 | `explorer/src/lib/graph-layout.ts`<br>`explorer/src/components/GraphView.tsx` | Production layout options, `enableFeatureLayout` activation, Reset Layout wiring, position authority integration. |
| **P2 — Feature Region Geometry** | Agent 2 | `explorer/src/lib/layout/global-layout.ts`<br>`explorer/src/lib/layout/features.ts`<br>`explorer/src/lib/layout/feature-roles.ts` | 2D feature region generation, multi-row feature band packing, feature region dimensions and spacing. |
| **P3 — Ordering / Crossing Reduction** | Agent 3 | `explorer/src/lib/layout/ordering.ts`<br>`explorer/src/lib/layout/local-layout.ts` | Layer-aware barycenter sweep across feature regions, local tier ordering, crossing reduction into final node coordinates. |
| **P4 — Shared Infrastructure** | Agent 4 | `explorer/src/lib/centrality.ts`<br>`explorer/src/lib/layout/satellites.ts` | Shared node spatial treatment, bridge placement between feature regions, satellite placement around parent objects. |
| **P5 — Performance / Viewport** | Agent 5 | `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | Viewport pan/zoom performance, overlay canvas rendering, SVG badge performance, zero-layout viewport guarantees. |
| **P6 — Acceptance Tests** | Agent 6 | `explorer/src/test/` (All test suites) | Production-path regression tests, Hybrid geometry assertions, 10x determinism, Cloud Spend baseline verification. |
| **P7 — Integration & Pipeline Orchestration** | Agent 7 | `explorer/src/lib/architecture-layout.ts` | Pipeline stage orchestration, default parameter calibration, cross-stage data flow integration. |

---

## 16. FILE CONFLICT MATRIX

| File | P1 | P2 | P3 | P4 | P5 | P6 | P7 | Conflict Resolution Strategy |
| ---- | -- | -- | -- | -- | -- | -- | -- | ---------------------------- |
| `GraphView.tsx` | **OWNER** | | | | | | | Exclusive to P1. P2–P7 must NOT edit. |
| `graph-layout.ts` | **OWNER** | | | | | | | Exclusive to P1. P2–P7 must NOT edit. |
| `global-layout.ts` | | **OWNER** | | | | | | Exclusive to P2. P1, P3–P7 must NOT edit. |
| `features.ts` | | **OWNER** | | | | | | Exclusive to P2. P1, P3–P7 must NOT edit. |
| `feature-roles.ts` | | **OWNER** | | | | | | Exclusive to P2. P1, P3–P7 must NOT edit. |
| `ordering.ts` | | | **OWNER** | | | | | Exclusive to P3. P1-P2, P4-P7 must NOT edit. |
| `local-layout.ts` | | | **OWNER** | | | | | Exclusive to P3. P1-P2, P4-P7 must NOT edit. |
| `centrality.ts` | | | | **OWNER** | | | | Exclusive to P4. P1-P3, P5-P7 must NOT edit. |
| `satellites.ts` | | | | **OWNER** | | | | Exclusive to P4. P1-P3, P5-P7 must NOT edit. |
| `FeatureOverlayCanvas.tsx` | | | | | **OWNER** | | | Exclusive to P5. P1-P4, P6-P7 must NOT edit. |
| `feature-composition.ts` | | | | *SHARED* | *SHARED* | | | **SPLIT:** P4 owns topology group derivation & shared highlight functions; P5 owns overlay bounding box rendering math. |
| `architecture-layout.ts` | | | | | | | **OWNER** | Exclusive to P7. P1–P6 must NOT edit. |
| `explorer/src/test/*` | | | | | | **OWNER** | | Exclusive to P6. P1–P5, P7 must NOT edit. |

---

## 17. PROTECTED FILES / BEHAVIOR

The following files and subsystems are **strictly protected** and must NOT be modified during Phase 1:

```text
explorer/src/lib/position-policy.ts          (5-Level Position Authority Hierarchy)
explorer/src/lib/projectState.ts             (Project State Persistence & Isolation)
explorer/src/lib/intelligence/rules.ts       (Architecture Rule Analysis)
explorer/src/lib/refactoring-simulation.ts   (Refactoring Simulation & Commit Safeguards)
explorer/src/components/Inspector.tsx        (Inspector UI & Detail Panel)
explorer/src/components/Sidebar.tsx          (Sidebar & Navigation UI)
audit-fixtures/                              (All benchmark JSON fixtures)
```

---

## 18. IDENTIFIED ROOT CAUSES

### ROOT CAUSE #1
- **Location:** `explorer/src/components/GraphView.tsx` (lines 264, 271, 342, 689, 696)
- **Function:** `GraphView` layout trigger handlers (`initial`, `resetLayout`, `graph-update`)
- **Current Behavior:** Calls `getLayoutOptions()` and `runLayout()` without passing `enableFeatureLayout: true`.
- **Expected Behavior:** Production layout invocations must pass `enableFeatureLayout: true` (or consume an enabled default).
- **Why Production Reaches Current Behavior:** `enableFeatureLayout` defaulted to `false` in `computeArchitectureLayout()`, and `GraphView.tsx` never provided an explicit override in production options.
- **Evidence:** Grep audit of `explorer/src/components/` showing 0 occurrences of `enableFeatureLayout`.
- **Affected Workstream:** P1 (Production Activation)

### ROOT CAUSE #2
- **Location:** `explorer/src/lib/architecture-layout.ts` (line 71)
- **Function:** `computeArchitectureLayout()`
- **Current Behavior:** Parameter default is `enableFeatureLayout = false`.
- **Expected Behavior:** The architecture layout pipeline should default `enableFeatureLayout` to `true` for production layout runs.
- **Why Production Reaches Current Behavior:** Legacy zero-drift backward compatibility flag was left set to `false` by default.
- **Evidence:** `ArchitectureLayoutOptions` default parameter destructuring at line 71.
- **Affected Workstream:** P7 (Integration & Pipeline Orchestration)

### ROOT CAUSE #3
- **Location:** `explorer/src/lib/position-policy.ts` (lines 49–88) & `explorer/src/components/GraphView.tsx` (lines 336–345)
- **Function:** `shouldAutoLayout()` & `resolveAuthoritativePosition()`
- **Current Behavior:** On project load, if persisted `nodePositions` exist in `localStorage`, `shouldAutoLayout` returns `false` and preserves old hierarchical coordinates.
- **Expected Behavior:** Reset Layout or project state migration should allow upgrading legacy persisted positions to Hybrid positions without destroying user session drag state.
- **Why Production Reaches Current Behavior:** Level 2 Position Authority (persisted project positions) masks newly computed layouts unless layout version changes or explicit reset occurs.
- **Evidence:** `projectState.ts` stores `nodePositions` in `graphLayout`, and `GraphView` restores them on mount before auto-layout executes.
- **Affected Workstream:** P1 (Production Activation) / P6 (Acceptance Tests)

### ROOT CAUSE #4
- **Location:** `explorer/src/lib/layout/global-layout.ts` & `explorer/src/lib/layout/ordering.ts`
- **Function:** `computeGlobalFeatureLayout()` & `reduceEdgeCrossings()`
- **Current Behavior:** When `enableFeatureLayout: true` is enabled, `computeGlobalFeatureLayout` maps features into 1D linear columns. Because shared infrastructure nodes and cross-feature relationships span wide horizontal distances across layer bands, total geometric edge crossings actually INCREASE from 107,394 to 124,942.
- **Expected Behavior:** Hybrid feature layout must integrate 2D feature clustering with layer-aware crossing reduction so that feature cohesion increases while edge crossings decrease.
- **Why Production Reaches Current Behavior:** Features were directly substituted into domain columns without adjusting inter-feature column ordering or shared infrastructure placement.
- **Evidence:** Read-only tsx benchmark on Cloud Spend Tracker showing +17,548 edge crossings under `enableFeatureLayout: true`.
- **Affected Workstream:** P2 (Feature Region Geometry), P3 (Ordering / Crossing Reduction), P4 (Shared Infrastructure)

---

## 19. PHASE-1 WORKSTREAM REQUIREMENTS & HANDOFF INSTRUCTIONS

### P1 — Production Activation
- **Instructions:** Modify `explorer/src/components/GraphView.tsx` and `explorer/src/lib/graph-layout.ts` to pass `enableFeatureLayout: true` on initial load, project switch, reset layout, and relayout actions. Ensure Level 1 user drag positions are preserved.
- **Do NOT modify:** `explorer/src/lib/architecture-layout.ts` or any files in `explorer/src/lib/layout/`.

### P2 — Feature Region Geometry
- **Instructions:** Enhance `explorer/src/lib/layout/global-layout.ts`, `features.ts`, and `feature-roles.ts` to compute compact 2D multi-row feature region bounds and intelligent inter-feature column ordering.
- **Do NOT modify:** `GraphView.tsx`, `ordering.ts`, or `local-layout.ts`.

### P3 — Ordering / Crossing Reduction
- **Instructions:** Enhance `explorer/src/lib/layout/ordering.ts` and `local-layout.ts` to execute layer-aware barycenter sweeps across 2D feature regions, ensuring crossing reduction directly determines node coordinates inside feature buckets.
- **Do NOT modify:** Production callers in `GraphView.tsx` or `global-layout.ts`.

### P4 — Shared Infrastructure
- **Instructions:** Refine `explorer/src/lib/centrality.ts` and `satellites.ts` to place shared bridge nodes and satellites adjacent to their primary connected feature regions without destroying feature locality.
- **Do NOT modify:** `GraphView.tsx` or `FeatureOverlayCanvas.tsx`.

### P5 — Performance / Viewport
- **Instructions:** Optimize `FeatureOverlayCanvas.tsx` to track Cytoscape pan/zoom transforms without triggering layout re-computations or coordinate updates. Guarantee zero-layout viewport performance.
- **Do NOT modify:** Core layout pipeline or node position calculations.

### P6 — Acceptance Tests
- **Instructions:** Create comprehensive unit, integration, and performance acceptance tests in `explorer/src/test/` validating Hybrid geometry metrics, zero coordinate drift, and regression safety.
- **Do NOT modify:** Production source code.

### P7 — Integration & Pipeline Orchestration
- **Instructions:** Update `explorer/src/lib/architecture-layout.ts` to default `enableFeatureLayout = true` and orchestrate the full Stage 0–12 pipeline. Validate cross-stage data flows.
- **Do NOT modify:** UI components or isolated module functions owned by P1–P5.

---

## 20. RISKS

1. **Persisted State Stagnation:** Users with saved project states will continue seeing legacy positions until state is migrated or Reset Layout is executed.
2. **Cross-Feature Sprawl:** High-coupling Apex classes (e.g. `CloudSpendService`) connected to multiple features risk creating wide horizontal edge spans if not handled by P4 shared infrastructure placement.
3. **Multi-Row Layout Overlaps:** Multi-row feature band packing must carefully enforce vertical clearance gaps to prevent layer overlap between upper and lower feature rows.

---

## 21. EXPLICIT NON-GOALS

- Do NOT replace Cytoscape.js as the core canvas renderer.
- Do NOT alter finding analysis, investigation workflow, or refactoring simulation logic.
- Do NOT introduce non-deterministic layout algorithms or randomized physics force simulations.
- Do NOT modify benchmark JSON fixtures in `audit-fixtures/`.
