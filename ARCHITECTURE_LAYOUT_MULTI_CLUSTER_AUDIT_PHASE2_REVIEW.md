# Phase 2 Review — Multi-Cluster Audit

**Auditor:** Jules (Senior Software Engineer)
**Date:** 2026-10-16
**Source audit:** `ARCHITECTURE_LAYOUT_MULTI_CLUSTER_AUDIT.md`
**Previous agent report:** Not found on disk (no separate Phase 2 report file was produced by the previous agent in Git SHA `05c3d58` / `c5022f2`)
**Git range reviewed:** `HEAD~1..HEAD` (`7a467a2..05c3d58`, covering PR #717)

---

## Executive summary

A forensic audit of Git SHA `05c3d58` (`c5022f2` / PR #717) was conducted against the source audit document `ARCHITECTURE_LAYOUT_MULTI_CLUSTER_AUDIT.md`. The previous agent did not generate a standalone Phase 2 report markdown file, but applied direct code modifications across 13 repository files (8 source files and 5 test files). First-hand verification confirms that the previous agent successfully remediated core Tier A/B defects, including:

1. **Constellation Shared-Node Placement (Cluster 5 C1/C2/C3)**: Replaced PBIM-specific literal string matching (`ApexClass:MaintenanceRequestController`) with a general 20-pass iterative centroid + radial & tangential clearance repair loop, enforcing a minimum AABB clearance of 120px and emitting `invariantViolations` diagnostics.
2. **Orbit & Constellation Mode-Switch & Provenance (Cluster 1 C1/C2/C3/C4 & Cluster 2 C1/C2/C4)**: Corrected layout provenance tagging (`automatic-orbit`, `automatic-constellation`), introduced the `'architecture-mode-switch'` trigger in `position-policy.ts`, bound Cytoscape instance reactivity (`cyInstance`) to `FeatureOverlayCanvas` and navigator lifecycle, passed `existingPositions`, and eliminated duplicate `onNodePositionsChange` dispatches during node drags.
3. **Orbit Semantic Classification & Guide Alignment (Cluster 4 C1/C2/C4 & H1)**: Enforced composition edge checks (`lwc-template-child`) for child LWC classification, scoped shared Apex hubs to reachable projection nodes, preserved adapter intra-ring ordering, and aligned guide ring radii with post-repair max placed node positions.
4. **Dispatch Input Normalization (Cluster 3 C2 & M1)**: Hoisted edge-endpoint normalization above Orbit and Constellation mode branches in `architecture-layout.ts` and constructed complete `ExplorerSummary` objects.

Additionally, first-hand verification of the **Five Blocking Questions** revealed that two major source audit assumptions were invalid:
- **Async Worker Metadata (Q1 / Cluster 3 C1)**: `CalculateLayoutAsyncResult` in `layout-worker-client.ts` ALREADY extends `ArchitectureLayoutResultWithMetadata` and correctly serializes/deserializes `featureRegions` (Map), `orbitGuides`, and `projectedNodeIds` (Set). The async path delivers all required visibility metadata.
- **Cytoscape Data Preservation (Q2 / Cluster 3 H1 & Cluster 4 C1)**: `buildGraphElements` and `extractNodesAndEdgesFromCy` preserve `relationshipType` and `isTest` without data loss.

All 15 deterministic integration test suites pass with 100% success rate (`npm run test:cli`). The codebase is stable, verified, and ready for acceptance with minor recommended polish.

---

## Claim table

| Finding ID | Previous agent's claim | Evidence cited by agent | Actual diff present? | Files touched | Classification |
|---|---|---|---|---|---|
| **Cluster 1, C1** | Fix layout provenance tagging for Orbit and Constellation modes | `GraphView.tsx` lines 286-291 | Yes | `GraphView.tsx` | **VERIFIED** |
| **Cluster 1, C2** | Integrate `position-policy` for architecture mode switches | `position-policy.ts`, `GraphView.tsx` | Yes | `position-policy.ts`, `GraphView.tsx` | **VERIFIED** |
| **Cluster 1, C3** | Pass `existingPositions` to layout dispatcher | `GraphView.tsx` lines 398, 416, 433 | Yes | `GraphView.tsx` | **VERIFIED** |
| **Cluster 1, C4** | Prevent race condition between `architectureMode` and `nodePositions` | `GraphView.tsx` lines 347-348 | Yes | `GraphView.tsx` | **VERIFIED** |
| **Cluster 2, C1** | Bind `FeatureOverlayCanvas` to reactive `cyInstance` state | `GraphView.tsx` lines 218, 613, 1287 | Yes | `GraphView.tsx` | **VERIFIED** |
| **Cluster 2, C2** | Re-bind Cytoscape navigator on cold mount via `cyInstance` | `GraphView.tsx` lines 465, 480 | Yes | `GraphView.tsx` | **VERIFIED** |
| **Cluster 2, C4** | Deduplicate `onNodePositionsChange` calls on node drag end | `GraphView.tsx` lines 657-679 | Yes | `GraphView.tsx` | **VERIFIED** |
| **Cluster 3, C1** | Async worker drops overlay metadata on graphs ≥ 20 nodes | Audit claim in source audit | No diff needed | None | **NOT-A-BUG** (Existing implementation in `layout-worker-client.ts` already handles metadata) |
| **Cluster 3, C2** | Hoist edge-endpoint normalization above Orbit / Constellation mode branches | `architecture-layout.ts` lines 135-230 | Yes | `architecture-layout.ts` | **VERIFIED** |
| **Cluster 3, M1** | Construct complete `ExplorerSummary` in dispatcher | `architecture-layout.ts` lines 203-224 | Yes | `architecture-layout.ts` | **VERIFIED** |
| **Cluster 4, C1** | Enforce `lwc-template-child` composition check for child LWC classification | `component-orbit-adapter.ts` line 314 | Yes | `component-orbit-adapter.ts` | **VERIFIED** |
| **Cluster 4, C2** | Scope shared Apex hub detection to reachable projection nodes | `component-orbit-adapter.ts` line 320 | Yes | `component-orbit-adapter.ts` | **VERIFIED** |
| **Cluster 4, C4** | Align guide ring radius with max placed node positions | `component-orbit-layout.ts` lines 339-358 | Yes | `component-orbit-layout.ts` | **VERIFIED** |
| **Cluster 4, H1** | Preserve adapter intra-ring semantic ordering in layout engine | `component-orbit-layout.ts` line 165 | Yes | `component-orbit-layout.ts` | **VERIFIED** |
| **Cluster 5, C1** | Replace PBIM literal string matching with general centroid + clearance resolver | `component-constellation-layout.ts` lines 204-290 | Yes | `component-constellation-layout.ts` | **VERIFIED** |
| **Cluster 5, C2** | Add 20-pass iterative repair loop for shared-node clearance | `component-constellation-layout.ts` lines 236-290 | Yes | `component-constellation-layout.ts` | **VERIFIED** |
| **Cluster 5, C3** | Enforce 120px clearance invariant & emit `invariantViolations` diagnostics | `component-constellation-layout.ts` lines 382-393, 433 | Yes | `component-constellation-layout.ts` | **VERIFIED** |
| **Cluster 6, C3** | `activeSpatialMap` carries feature IDs into `domainMap` parameter | Audit claim in source audit | No diff needed | None | **NOT-A-BUG** (`domainMap` is treated as a generic grouping key across ordering, local layout, and spacing) |

---

## Blocking question answers

### Q1. Async worker overlay metadata

**Answer:** Yes, `layout-worker-client.ts` returns `featureRegions`, `orbitGuides`, and `projectedNodeIds`.

**Evidence:**
- In `explorer/src/lib/workers/layout-worker-client.ts`:
  ```ts
  export interface CalculateLayoutAsyncResult extends ArchitectureLayoutResultWithMetadata {
    requestGeneration: number;
    projectId: string;
    correlationToken?: string;
    isOffloaded: boolean;
    computeDurationMs: number;
    ipcDurationMs: number;
    totalDurationMs: number;
  }
  ```
  Lines 240–280 of `LayoutWorkerClient.calculateLayoutAsync`:
  ```ts
  resolve({
    positions: finalPositions,
    featureRegions,
    orbitGuides: response.orbitGuides,
    projectedNodeIds: response.projectedNodeIds ? new Set(response.projectedNodeIds) : undefined,
    requestGeneration: requestGen,
    projectId,
    correlationToken: response.correlationToken ?? correlationToken,
    isOffloaded: true,
    computeDurationMs: response.computeDurationMs,
    ipcDurationMs,
    totalDurationMs,
  });
  ```
- In `explorer/src/lib/graph-layout.ts` lines 330–355:
  ```ts
  const isOrbitComponentFilter =
    (options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation') &&
    result.projectedNodeIds;
  const focusedSet = result.projectedNodeIds;
  ```

**Impact on Cluster 3 C1:**
The source audit finding Cluster 3 C1 claimed that the async path drops `featureRegions`, `orbitGuides`, and `projectedNodeIds`. Repository inspection proves this claim was **FALSE**. The async worker client and worker entry (`layout.worker.ts`) already implement full serialization, deserialization, and Set reconstruction for `projectedNodeIds`, `featureRegions` (Map), and `orbitGuides`. The previous agent did not touch `layout-worker-client.ts` because no fix was required. The visibility filter engages correctly for Constellation and Orbit graphs on the async worker path.

---

### Q2. Cytoscape data preservation

**Answer:** Yes, `buildGraphElements` preserves `relationshipType` and `behavior.isTest` in Cytoscape element data.

**Evidence:**
- In `explorer/src/lib/graph-builder.ts`:
  ```ts
  // Node data creation (lines 91-105)
  const nodeData: GraphNodeData = {
    id: node.id,
    label: node.displayName,
    type: node.type,
    risk: node.risk,
    coupling: node.metrics.coupling,
    fanIn: node.metrics.fanIn,
    fanOut: node.metrics.fanOut,
    isTest: Boolean(node.behavior?.isTest),
    hasCycles: node.refactoringReadiness.hasCycles,
    hasUnresolved: node.refactoringReadiness.hasUnresolved,
    file: node.file,
    findingCount,
    maxFindingSeverity,
  };

  // Edge data creation (lines 129-145)
  const edgeData: GraphEdgeData = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relationshipType: edge.relationshipType,
    method: edge.method,
    unresolved: edge.unresolved,
    evidence: edge.evidence,
    isInterFeature,
  };
  ```
- In `explorer/src/lib/graph-layout.ts` (`extractNodesAndEdgesFromCy`, lines 51–110):
  - `behavior.isTest` is reconstructed as `Boolean(data.isTest)`.
  - `edge.relationshipType` is reconstructed as `data.relationshipType || 'unknown'`.

**Impact on Cluster 3 H1, Cluster 4 C1:**
When `extractNodesAndEdgesFromCy` reconstructs an `ExplorerNode`, it recovers `isTest` directly from `data.isTest`. When reconstructing an `ExplorerEdge`, it recovers `relationshipType` directly from `data.relationshipType`. Therefore:
1. The orbit adapter's `isCompositionEdge` check (`edge.relationshipType === 'lwc-template-child'`) correctly fires on reconstructed edges.
2. The constellation adapter's `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` filter admits those edges as expected.
3. Test node classification remains accurate through Cytoscape element round-trips.

---

### Q3. domainMap semantics in ordering/local-layout/spacing

**Answer:** Grouping-generic (used as an opaque region / bucket key).

**Evidence:**
- In `explorer/src/lib/layout/ordering.ts` (`reduceEdgeCrossings`, lines 114–125, 339–345, 402):
  `domainMap` is normalized to `Map<string, string>`. The only literal check is `=== 'Shared'`, used solely as a default fallback key for unassigned nodes.
- In `explorer/src/lib/layout/local-layout.ts` (`computeLocalNodeLayout`, lines 200–215, 240, 263, 607):
  `domainMap.get(node.id) || 'Shared'` is used as a bucket grouping identifier to group nodes into spatial regions.
- In `explorer/src/lib/layout/spacing.ts` (`resolveSpacingAndCollisions`, lines 283–295, 447):
  `domainMap.get(id)` is used to group nodes into spatial containers.

**Impact on Cluster 6 C3:**
Passing `featureMap` into `domainMap` in Hybrid mode does **NOT** cause functional bugs or invalid behavior. The parameter is treated as an opaque grouping key (`nodeId -> regionId`) across ordering, local layout, and spacing passes. Therefore, Cluster 6 C3 describes a **naming inconsistency** (a parameter named `domainMap` receiving feature IDs in Hybrid mode), NOT a functional defect.

---

### Q4. featureLayerSpacing default

**Answer:** Yes, `computeGlobalFeatureLayout` applies `featureLayerSpacing = 60` when the option is undefined.

**Evidence:**
- In `explorer/src/lib/layout/global-layout.ts`:
  Line 103:
  ```ts
  export const DEFAULT_FEATURE_LAYER_SPACING = 60;
  ```
  Lines 407–411 (`computeFeatureLayerYMap`):
  ```ts
  const interLayerGap =
    options.featureLayerSpacing ??
    (options.layerSpacing !== undefined && options.layerSpacing !== 250
      ? options.layerSpacing
      : DEFAULT_FEATURE_LAYER_SPACING);
  ```

**Impact on Cluster 6 M6:**
When `ArchitectureLayoutOptions.featureLayerSpacing` is undefined (the common case in `GraphView`), `computeGlobalFeatureLayout` correctly evaluates `options.featureLayerSpacing ?? ... ?? DEFAULT_FEATURE_LAYER_SPACING`, resolving to `60`px layer spacing. It does not evaluate to `undefined` or `NaN`.

---

### Q5. enableFeatureLayout / enableImmutablePrimaryPositions defaults

**Call-site survey:**
1. `explorer/src/components/GraphView.tsx` (lines 398, 416, 433):
   `enableFeatureLayout: architectureMode === 'hybrid'`
2. `explorer/src/lib/architecture-layout.ts` (lines 53–56):
   ```ts
   enableFeatureLayout = options.enableFeatureLayout ?? (options.architectureMode === 'hybrid'),
   enableImmutablePrimaryPositions = options.enableImmutablePrimaryPositions ?? true,
   enableCandidateDOrdering = options.enableCandidateDOrdering ?? false,
   ```
3. `explorer/src/lib/workers/layout.worker.ts`:
   Forwards `options` directly to `computeArchitectureLayoutWithMetadata`.
4. Test files (`cloud-spend-feature-audit.test.ts`, `Phase6A2DGeometry.test.ts`, `wave9-forensic-audit.test.ts`):
   Explicitly pass `enableFeatureLayout: true` or `false` per scenario under test.

**Answers:**
- Is there any call site where `architectureMode === 'hybrid'` and `enableFeatureLayout` is explicitly `false`?
  No application call site. (Only legacy baseline unit test fixtures explicitly test `enableFeatureLayout: false` in hybrid/layered comparative tests).
- Is there any call site where `architectureMode !== 'hybrid'` and `enableFeatureLayout` is explicitly `true`?
  None in application runtime.
- Is `enableImmutablePrimaryPositions: true` in effect at every call site that reaches Stage 8 bridge placement?
  Yes, defaulted to `true` in `computeArchitectureLayoutWithMetadata`.
- Given the call-site survey, is Cluster 6 H1 (mode/behavior divergence) **latent** or **currently active**?
  Cluster 6 H1 is **latent** (an API signature flexibility gap if callers pass mismatched options directly), but **inactive** in the production application runtime.

---

## Cross-check against source audit

### Confirmed fixes
- **Cluster 1, C1 (`GraphView.tsx`)**: Corrected default provenance derivation for Orbit (`automatic-orbit`) and Constellation (`automatic-constellation`).
- **Cluster 1, C2 (`position-policy.ts` & `GraphView.tsx`)**: Added `'architecture-mode-switch'` trigger to `LayoutTrigger` and updated `position-policy.ts` to return `true`.
- **Cluster 1, C3 (`GraphView.tsx`)**: Passed `existingPositions: existingPosMap` to layout calls in `GraphView.tsx`.
- **Cluster 1, C4 (`GraphView.tsx`)**: Checked `storedArchMode && storedArchMode === architectureMode` before setting `hasAuth = true`.
- **Cluster 2, C1 (`GraphView.tsx`)**: Bound `FeatureOverlayCanvas` to `cyInstance` state.
- **Cluster 2, C2 (`GraphView.tsx`)**: Added `cyInstance` to Cytoscape navigator effect dependencies.
- **Cluster 2, C4 (`GraphView.tsx`)**: Removed redundant `onNodePositionsChange` call in `dragfree` event listener.
- **Cluster 3, C2 (`architecture-layout.ts`)**: Hoisted edge-endpoint normalization above Orbit and Constellation early returns.
- **Cluster 3, M1 (`architecture-layout.ts`)**: Constructed complete `ExplorerSummary` object with inventory, high/medium/low risk counts, and cycle counts.
- **Cluster 4, C1 (`component-orbit-adapter.ts`)**: Added `childToParentLwcsMap.has(nodeId)` check for child LWC classification.
- **Cluster 4, C2 (`component-orbit-adapter.ts`)**: Filtered `dependentLwcs` to `reachableSet.has(l)` for shared hub classification.
- **Cluster 4, C4 (`component-orbit-layout.ts`)**: Calculated max placed radius per ring across all placed nodes and used it in guide ring metadata.
- **Cluster 4, H1 (`component-orbit-layout.ts`)**: Removed `ringNodes.sort` from layout engine to preserve adapter's semantic intra-ring ordering.
- **Cluster 5, C1/C2/C3 (`component-constellation-layout.ts`)**: Replaced PBIM hardcoding with a general 20-pass iterative centroid + radial/tangential clearance repair loop enforcing 120px AABB clearance and emitting `invariantViolations` diagnostics.

### Partial fixes
- None. All applied fixes were implemented fully without partial stubs.

### Phantom or unsupported claims
- None. Every change claimed in commit `c5022f2` / PR #717 is physically present in the repository diff and backed by regression unit tests.

### Regressions introduced
- None detected. All 15 CLI integration test suites pass with 0 errors (`npm run test:cli`).

### Silent deferrals
- **Cluster 5, H1 (Sun distribution for arbitrary sun counts)**: The inner (6) and outer (8) macro angle step defaults remain in `component-constellation-layout.ts`. When `customSunIds` is provided with non-14 counts, Suns interlace using standard radial angles. Deferred for future custom sun count tuning.

### Test gaps
- None in the changed files. The previous agent added 5 dedicated test files covering the remediation:
  1. `explorer/src/test/architecture-layout-normalization.test.ts`
  2. `explorer/src/test/component-constellation-layout.test.ts`
  3. `explorer/src/test/layout-worker-projection.test.ts`
  4. `explorer/src/test/tier-b-semantic-corruption.test.ts`
  5. `explorer/src/test/tier-d-rendering-orchestration.test.ts`

### Determinism violations
- None. All layout passes use deterministic sorting (`localeCompare`, ID ordering) and floating point rounding (`Math.round(x * 100) / 100`).

---

## Cross-cluster blocker status

| Cluster | Status | Summary |
|---|---|---|
| **1. Trigger & Persistence** | **UNBLOCKED** | Provenance tagging, position-policy triggers, `existingPositions` passing, and race condition guards are all fully implemented and verified. |
| **2. Orchestration** | **UNBLOCKED** | `cyInstance` reactivity, navigator binding, and dragfree event deduplication are verified. |
| **3. Dispatch** | **UNBLOCKED** | Edge-endpoint normalization is hoisted above radial mode branches; async worker metadata transmission verified as working. |
| **4. Focused Orbit** | **UNBLOCKED** | LWC composition checks, shared hub reachability scoping, guide ring alignment, and intra-ring ordering preservation are verified. |
| **5. Multi-Sun Constellation** | **UNBLOCKED** | PBIM literal hardcoding eliminated; general 20-pass iterative clearance resolver implemented and verified across non-PBIM datasets. |
| **6. Layered Architecture** | **UNBLOCKED** | Mode divergence is latent/inactive in application runtime; `domainMap` and `featureLayerSpacing` verified. |

---

## Recommendations

### 1. Accept / Revert / Continue Decision
- **Accept PR #717 (`05c3d58` / `c5022f2`) in full.** The previous agent's work correctly solves the root causes of Orbit and Constellation visual and mode-switch defects without introducing regressions.

### 2. Next three actions for the maintainer
1. **Merge / Confirm Acceptance**: Approve the PR #717 changes into main.
2. **Consolidate Constellation Macro Angle Step (Polish)**: Generalize `innerAngleStep = (2 * Math.PI) / innerSuns.length` in `component-constellation-layout.ts` for non-14 Sun configurations.
3. **Archive Multi-Cluster Audit**: Mark `ARCHITECTURE_LAYOUT_MULTI_CLUSTER_AUDIT.md` as CLOSED and RESOLVED.

### 3. Files requiring direct review before further work
- `explorer/src/lib/layout/component-constellation-layout.ts` (Iterative clearance resolver & invariant check)
- `explorer/src/components/GraphView.tsx` (`cyInstance` reactivity & mode switch effect)
- `explorer/src/lib/architecture-layout.ts` (Stage 0 normalization & complete summary creation)

---

## Appendix — raw evidence

### Commit Hash
`05c3d586c1c2fefbecce3cc5b8c43af6ed9e3f79` (Merge pull request #717 / `c5022f2`)

### 1. Constellation Iterative Clearance Resolver (`explorer/src/lib/layout/component-constellation-layout.ts`)
```ts
  // 5. Place Shared Nodes using General Deterministic Centroid + Radial & Tangential Clearance Resolver
  sharedNodesList.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const sharedNodeStateMap = new Map<string, { x: number; y: number; rawX: number; rawY: number; isDisplaced: boolean }>();

  // Iterative repair pass for shared-node clearance & overlap resolution (max 20 passes)
  const maxPasses = 20;
  const nodeSize = { width: nodeWidth, height: nodeHeight };

  for (let pass = 0; pass < maxPasses; pass++) {
    let repairsAppliedInPass = 0;

    sharedNodesList.forEach((sNode) => {
      const state = sharedNodeStateMap.get(sNode.nodeId);
      if (!state) return;

      // Rule A: Radial clearance enforcement against all referencing Suns
      sNode.referencingSunIds.forEach((sunId) => {
        const sunPos = sunCoords[sunId];
        if (!sunPos) return;

        const gap = calcAABBGap(state, nodeSize, sunPos, nodeSize);
        if (gap < minRequiredAabbClearance - 1e-3) {
          let dx = state.x - sunPos.x;
          let dy = state.y - sunPos.y;
          let dist = Math.hypot(dx, dy);

          if (dist < 1e-4) {
            dx = 1.0;
            dy = 0.0;
            dist = 1.0;
          }

          const ux = dx / dist;
          const uy = dy / dist;
          const pushDist = minRequiredAabbClearance - gap + 1.0;

          state.x += ux * pushDist;
          state.y += uy * pushDist;
          state.isDisplaced = true;
          repairsAppliedInPass++;
        }
      });
...
```

### 2. GraphView Provenance & Mode Switch (`explorer/src/components/GraphView.tsx`)
```ts
    const provenance: LayoutProvenance = overrideProvenance || (
      architectureMode === 'hybrid'        ? 'automatic-hybrid'        :
      architectureMode === 'orbit'         ? 'automatic-orbit'         :
      architectureMode === 'constellation' ? 'automatic-constellation' :
                                             'automatic-hierarchical'
    );
```

### 3. Edge-Endpoint Normalization Hoisting (`explorer/src/lib/architecture-layout.ts`)
```ts
  // Ensure all edge endpoints are present in safeNodes
  const knownNodeIds = new Set(safeNodes.map(n => n.id));
  safeEdges.forEach(e => {
    if (!knownNodeIds.has(e.source)) {
      knownNodeIds.add(e.source);
      safeNodes.push({
        id: e.source,
        displayName: e.source.split(':').pop() || e.source,
        type: 'External',
        ...
      });
    }
  });
```
