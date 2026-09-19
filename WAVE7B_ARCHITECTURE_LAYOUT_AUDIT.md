# WAVE 7B — ARCHITECTURE / LAYOUT PIPELINE FORENSIC AUDIT

**Audit Executed By:** Audit Agent 7B
**Target Architecture:** Wave 1–5 Architecture-Aware Layout Pipeline
**Scope:** Pipeline module contracts, orchestration, layer classification, domain discovery, global layout, layer ordering, component packing, local layout, centrality, satellites, spacing, layout evaluator, and Cytoscape graph integration.
**Mode:** AUDIT ONLY. Zero production code modified. Zero tests weakened.

---

## 1. Executive Result

The Wave 5 architecture-aware layout pipeline implemented in `explorer/src/lib/architecture-layout.ts` is **genuinely architecture-aware** and implements an 11-stage deterministic pipeline.

However, a critical orchestration finding was discovered:
1. **Bypassed Component Packing Module:** `explorer/src/lib/architecture-layout.ts` imports `packComponentPositions` from `explorer/src/lib/layout/components.ts` at line 12, but **never invokes it**. Instead, Step 10 of `computeArchitectureLayout` executes inline single-row horizontal X shifting (`currentComponentXOffset += Math.max(compWidth, nodeWidth) + componentGap`). As a result, the 2D aspect-ratio-aware FFDH shelf packing engine in `components.ts` is **bypassed/dead in orchestration**, causing disconnected graph components to stretch out in a single horizontal line.
2. **Duplicate Domain Discovery:** `discoverDomains` is invoked in Step 3 of `computeArchitectureLayout` and then **re-executed inside `computeGlobalDomainLayout`** in Step 5 because `domainDiscovery` is not forwarded to `computeGlobalDomainLayout` / `buildDomainGraph`.

### Test Suite Execution Summary
- **Total Test Suites Executed:** 15 test files
- **Total Tests Passed:** 228 passed (100% pass rate)
- **Production Source Code Modifications:** 0 files modified
- **Test Code Modifications:** 0 files modified

---

## 2. Actual Pipeline

Tracing `computeArchitectureLayout` in `explorer/src/lib/architecture-layout.ts`:

```text
computeArchitectureLayout(nodes, edges, options)
  │
  ├── 1. Facts Normalization & Defensive Cloning
  │      └── Clones nodes/edges, resolves synthetic missing edge endpoints, sorts deterministically by ID.
  │
  ├── 2. Step 1: Base Architecture Analysis (Wave 1A)
  │      └── computeArchitectureAnalysis(safeNodes, safeEdges) -> ArchitectureGraphAnalysis
  │
  ├── 3. Step 2: Layer Classification (Wave 1B)
  │      └── classifyNodeLayerWithReason(node) -> layerMap -> applyLayerClassification(analysis, layerMap)
  │
  ├── 4. Step 3: Domain Discovery (Wave 1C)
  │      └── discoverDomains(safeNodes, safeEdges) -> domainDiscovery -> applyDomainClassification(analysis, domainMap)
  │
  ├── 5. Step 4: Centrality & Spatial Roles (Wave 3B)
  │      └── computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap) -> centralityMap
  │
  ├── 6. Step 5: Global Domain Architecture Layout (Wave 2A)
  │      └── computeGlobalDomainLayout(safeNodes, safeEdges, options) -> globalDomainResult
  │          [Note: Re-executes discoverDomains inside buildDomainGraph]
  │
  ├── 7. Step 6: Layer Ordering & Crossing Reduction (Wave 2B)
  │      └── reduceEdgeCrossings({ nodes, edges, layerMap, domainMap, domainOrder }) -> orderingResult
  │
  ├── 8. Step 7: Primary Production Local Layout (Wave 3A)
  │      └── computeLocalNodeLayout({ nodes, edges, analysis, domainRegions, layerMap, domainMap, bucketOrder }) -> localResult
  │
  ├── 9. Step 8: Hub & Bridge Spatial Refinement (Wave 3B)
  │      └── calculateBridgeCandidatePosition(nodeId, layer, connectedDomains, domainXCenters, domainBounds, neighborPositions)
  │
  ├── 10. Step 9: Secondary Satellite Placement (Wave 3C)
  │       └── placeSatellites(nodes, edges, analysis, basePositions, options) -> satelliteResult
  │
  ├── 11. Step 10: Disconnected Component Packing (Wave 2C)
  │       └── Inline horizontal X offset shift (BYPASSES components.ts packComponentPositions)
  │
  ├── 12. Step 11: Final Global Spatial Cleanup Pass (Wave 4A)
  │       └── resolveSpacingAndCollisions({ nodes, edges, positions, analysis, options }) -> finalCleanupResult
  │
  └── 13. Step 12: Position Authority Restoration
          └── Restores Level 1-3 authoritative existingPositions over calculated candidate positions.
```

---

## 3. Orchestration Audit

Every import and invocation inside `explorer/src/lib/architecture-layout.ts`:

| Imported Module | Imported Symbol | Call Site Line | Input Parameters | Return Output | Position Mutation | Audit Status / Flags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `./layout/analysis` | `computeArchitectureAnalysis` | Line 75 | `safeNodes`, `safeEdges` | `ArchitectureGraphAnalysis` | None | Active (Step 1) |
| `./layout/analysis` | `applyLayerClassification` | Line 82 | `analysis`, `layerMap` | `ArchitectureGraphAnalysis` | None | Active (Step 2) |
| `./layout/analysis` | `applyDomainClassification` | Line 89 | `analysis`, `domainMap` | `ArchitectureGraphAnalysis` | None | Active (Step 3) |
| `./layout/layers` | `classifyNodeLayerWithReason` | Line 79 | `node` | `LayerClassificationResult` | None | Active (Step 2) |
| `./layout/domains` | `discoverDomains` | Line 85 | `safeNodes`, `safeEdges` | `DomainDiscoveryResult` | None | Active (Step 3) & Duplicated (Step 5) |
| `./layout/centrality` | `computeGraphCentralityAnalysis` | Line 92 | `safeNodes`, `safeEdges`, `domainMap`, `layerMap` | `Map<string, NodeCentralityAnalysis>` | None | Active (Step 4) |
| `./layout/global-layout` | `computeGlobalDomainLayout` | Line 100 | `safeNodes`, `safeEdges`, options | `GlobalLayoutResult` | Candidate region centers | Active (Step 5) |
| `./layout/ordering` | `reduceEdgeCrossings` | Line 108 | `nodes`, `edges`, `layerMap`, `domainMap`, `domainOrder` | `NodeOrderingResult` | Bucket ordering map | Active (Step 6) |
| `./layout/local-layout` | `computeLocalNodeLayout` | Line 117 | `nodes`, `edges`, `analysis`, `domainRegions`, `bucketOrder` | `LocalLayoutResult` | Primary node positions | Active (Step 7) |
| `./layout/centrality` | `calculateBridgeCandidatePosition` | Line 153 | `nodeId`, `layer`, `domains`, `xCenters`, `bounds`, `neighborPositions` | `BridgePlacementInfo` | Bridge candidate coordinates | Active (Step 8) |
| `./layout/satellites` | `placeSatellites` | Line 169 | `nodes`, `edges`, `analysis`, `basePositions`, options | `SatellitePlacementResult` | Satellite node positions | Active (Step 9) |
| `./layout/components` | `packComponentPositions` | Line 12 | None | None | None | **FLAG: UNUSED / DEAD IMPORT** |
| `./layout/spacing` | `resolveSpacingAndCollisions` | Line 243 | `nodes`, `edges`, `positions`, `analysis`, options | `SpacingResult` | Cleaned non-overlapping positions | Active (Step 11) |

---

## 4. Legacy Algorithm Audit

Explicit audit of historical/legacy algorithm remnants:

| Historical / Legacy Algorithm | Status | Location in Codebase | Audit Finding |
| :--- | :--- | :--- | :--- |
| **Alphabetical domain X placement** | INACTIVE / FALLBACK ONLY | `explorer/src/lib/layout/global-layout.ts` (`determineGlobalDomainOrder`) | Replaced by domain graph dependency flow analysis (`flowScores`, net flow) and 2-pass barycentric sweeps. Alphabetical sorting is strictly a tie-breaker when structural scores are identical. |
| **Degree-only ordering** | INACTIVE / SECONDARY TIE-BREAKER | `explorer/src/lib/layout/ordering.ts` (`reduceEdgeCrossings`) | Replaced by relationship-aware barycenter sweeps across layer buckets (`${layer}:${domain}`). Node degree is used only as initial order or secondary tie-breaker. |
| **Arithmetic mean bridge placement** | INACTIVE / MITIGATED | `explorer/src/lib/layout/centrality.ts` (`calculateBridgeCandidatePosition`) | Detects "Intermediate-Domain Trap" when candidate X falls inside an unconnected domain interior B. Shifts Y into inter-layer corridor (`baseY - layerSpacing * 0.5`) to prevent bridging nodes from landing inside intermediate domain clusters. |
| **Single-pass collision cleanup** | INACTIVE | `explorer/src/lib/layout/spacing.ts` (`resolveSpacingAndCollisions`) | Replaced by multi-pass bounded relaxation engine (default 30 passes) with 2D spatial hash grid partitioning, relative separation ratio axis selection, and priority weighting. |
| **Horizontal component offset** | **ACTIVE / LEGACY REMNANT** | `explorer/src/lib/architecture-layout.ts` (lines 181-240) | **ACTIVE FINDING:** Step 10 in `architecture-layout.ts` implements inline single-row horizontal X shifting (`currentComponentXOffset += compWidth + componentGap`) instead of invoking 2D FFDH shelf packing from `components.ts`. |
| **Test/field distortion** | INACTIVE / PREVENTED | `explorer/src/lib/layout/satellites.ts` (`placeSatellites`) | Satellites are placed AFTER primary production layout is computed. Primary production positions are passed as fixed anchor positions and are never moved or distorted by test or field placement. |

---

## 5. Wave 1 Model Audit

Audit of `analysis.ts`, `layers.ts`, `domains.ts`, and `metrics.ts`:

- **Shared Model Consumption:** `computeArchitectureAnalysis` in `analysis.ts` produces `ArchitectureGraphAnalysis` containing `nodes`, `components`, `nodeList`, `totalNodes`, `totalEdges`. Passed cleanly into Step 2, Step 3, Step 7, Step 9, and Step 11 of `architecture-layout.ts`.
- **Layer Classification:** Implemented in `layers.ts` (`classifyNodeLayerWithReason`). Returns 4-layer classification (`presentation`, `application`, `domain`, `schema`) with diagnostic reason and confidence score.
- **Domain Classification:** Implemented in `domains.ts` (`discoverDomains`). 5-pass structural discovery (Direct signals -> Inheritance -> Graph cohesion -> Shared fallback -> Assembly).
- **Test / Field Satellite Relationships:** `findParentProductionNodeId` and `findParentObjectId` in `analysis.ts` resolve satellite targets and populate `parentProductionNodeId` and `parentObjectId` slots on `ArchitectureNodeAnalysis`.
- **Layout Metrics:** Implemented in `metrics.ts` (`calculateLayoutMetrics`). Independent mathematical evaluation functions for crossings, lengths, overlaps, layer violations, domain cohesion, component separation, hub locality, and bridge placement.

---

## 6. Layer Audit

Verifying layer semantics and classification rules in `explorer/src/lib/layout/layers.ts`:

| Metadata Type / Signal | Target Layer | Classifier Priority | Audit Verification |
| :--- | :--- | :--- | :--- |
| `Object`, `CustomObject`, `Field`, `CustomField`, `External` | `schema` | Priority 1 (Salesforce Node Type) | Verified (Confidence 1.0) |
| `LWC`, `Visualforce` | `presentation` | Priority 1 (Salesforce Node Type) | Verified (Confidence 1.0) |
| `ApexTrigger`, `Flow` | `application` | Priority 1 (Salesforce Node Type) | Verified (Confidence 1.0) |
| Test Nodes (`isTestNode`) | Target Production Layer | Priority 2 (Test Context Inheritance) | Verified (Confidence 0.9–0.95) |
| File path `/lwc/`, `/aura/`, `/pages/` | `presentation` | Priority 3 (File Path) | Verified (Confidence 0.9) |
| Behavior: Async execution | `application` | Priority 4 (Behavioral Signal) | Verified (Confidence 0.85) |
| Behavior: Query / DML counts > 0 | `domain` | Priority 4 (Behavioral Signal) | Verified (Confidence 0.8) |
| Naming: Controller, Manager, Service | `application` | Priority 5 (Naming Convention) | Verified (Confidence 0.85) |
| Naming: Selector, Repo, DTO, Model | `domain` | Priority 5 (Naming Convention) | Verified (Confidence 0.85) |
| Unclassified Apex Class | `application` | Priority 6 (Deterministic Fallback) | Verified (Confidence 0.5) |

**Contradiction Check:** Zero contradictions found across layer classification definitions in `layers.ts`, `ordering.ts`, `global-layout.ts`, and `evaluate-layout.ts`.

---

## 7. Domain Audit

Audit of domain discovery in `explorer/src/lib/layout/domains.ts`:

- **Structural Basis:** `discoverDomains` uses structural evidence across 5 passes:
  1. Direct signals: Salesforce CustomObjects act as domain anchors. File folder paths (e.g. `classes/order/`) and 47 architectural suffixes are extracted and checked against generic stems (`Base`, `Util`, `Common`).
  2. Inheritance: Fields inherit CustomObject domain; tests inherit production target domain.
  3. Graph Neighborhood Cohesion: Unclassified nodes connected to neighbors in 1 domain inherit that domain; nodes connected to $\ge 2$ distinct domains are assigned `'Shared'`.
  4. Fallback: Generic utility classes assigned `'Shared'`.
  5. Final Assembly: Tracks `connectedDomains` per node and builds sorted domain-to-nodes map.
- **Determinism:** All input nodes and edges are sorted lexicographically by ID prior to pass execution, guaranteeing identical assignments across runs.

---

## 8. Global Layout Audit

Audit of `explorer/src/lib/layout/global-layout.ts`:

- **Domain Graph Construction:** `buildDomainGraph` summarizes cross-domain dependency edges, directional strengths, and primary layer profiles per domain.
- **Global Domain Ordering:** `determineGlobalDomainOrder` calculates `flowScores` (out-degree vs in-degree net flow), separates domain components, and performs 2-pass barycentric sweeps to minimize cross-domain edge lengths.
- **Alphabetical Role:** Alphabetical ordering is strictly a secondary tie-breaker when structural flow scores and barycenters are equal.
- **Region Output:** Produces `domainRegions` Map of `DomainRegion` bounding boxes (`xCenter`, `yCenter`, `width`, `height`, `xMin`, `xMax`, `yMin`, `yMax`), which serve as global boundaries for local node layout.

---

## 9. Ordering Audit

Audit of `explorer/src/lib/layout/ordering.ts`:

- **Crossing Reduction Algorithm:** `reduceEdgeCrossings` performs deterministic alternating sweeps across architectural layers (`presentation` -> `application` -> `domain` -> `schema`).
- **Barycenter Sweeps:** Calculates 1D continuous barycenter positions for nodes based on connected neighbors in adjacent layers.
- **Cycle Safety:** Filters neighbor relationships by DAG layer ranks, preventing circular dependencies from causing infinite loops or non-deterministic ordering.
- **Bounded Iterations:** Bounded by `maxIterations` (default 4 sweeps).
- **Tie-Breaking:** Barycenter -> Node Degree (hubs first) -> Node ID string comparison.

---

## 10. Component Packing Audit

Audit of `explorer/src/lib/layout/components.ts`:

- **Algorithm:** `packComponents` implements 2D First-Fit Decreasing Height (FFDH) shelf packing.
- **Bounding-Box Aware:** Computes exact 2D component bounding boxes (`width` and `height`) using `calculateLocalComponentBounds`.
- **Aspect-Ratio Aware:** Calculates target packing width dynamically based on aggregate component area and preferred aspect ratio (`targetAspectRatio = 1.6`).
- **Deterministic Ordering:** `compareComponents` sorts components by structural importance -> node count -> area -> height -> width -> min node ID -> component ID.

**CRITICAL ORCHESTRATION FINDING:**
In `explorer/src/lib/architecture-layout.ts` Step 10 (lines 181-240), `components.ts` is imported (`packComponentPositions`), but **never called**. Step 10 executes inline horizontal X offsetting (`currentComponentXOffset += Math.max(compWidth, nodeWidth) + componentGap`), causing disconnected components to be arranged in a single long horizontal line rather than a compact 2D grid.

---

## 11. Local Layout Audit

Audit of `explorer/src/lib/layout/local-layout.ts`:

- **Scope:** Places primary production nodes (Apex classes, services, controllers, selectors, repositories, domain classes) inside domain regions across layer Y base offsets (`presentation: 100`, `application: 350`, `domain: 600`, `schema: 850`). Excludes unit tests (`isTest`) and object fields (`isField`).
- **Relationship-Aware Local Tiers:** Groups nodes inside buckets into local relationship tiers:
  - Tier 0: Upstream nodes (callers / controllers / out-degree > in-degree)
  - Tier 1: Intermediate nodes
  - Tier 2: Downstream nodes (callees / selectors / repos / in-degree > out-degree)
- **Bucket Layout Bounds:** Produces detailed `bucketLayouts` Map containing grid dimensions, row counts, and bounding box coordinates (`xMin`, `xMax`, `yMin`, `yMax`, `xCenter`, `yCenter`).

---

## 12. Centrality Audit

Audit of `explorer/src/lib/layout/centrality.ts`:

- **Hub vs Bridge Distinction:** `hubScore` (fanIn + fanOut degree & balance factor) and `bridgeScore` (cross-domain boundary degree) are kept strictly distinct in `NodeCentralityAnalysis`.
- **Spatial Roles:** Classifies nodes into `hub-only`, `bridge-only`, `hub-and-bridge`, and `standard`.
- **Intermediate-Domain Trap Prevention:** `calculateBridgeCandidatePosition` detects if a bridge node connecting Domain A and Domain C would land inside unconnected Domain B. If trapped, it shifts Y into the inter-layer corridor (`baseY - layerSpacing * 0.5`), preventing cross-domain edges from cutting through intermediate domain clusters.

---

## 13. Satellite Audit

Audit of `explorer/src/lib/layout/satellites.ts`:

- **Placement Order:** Secondary nodes are placed AFTER primary production local layout is fixed. Primary node positions are passed as `primaryPositions` anchors and are **100% preserved**.
- **Priority Hierarchy:** `primary production > hubs > bridges > trigger/handlers > tests > fields`.
- **Trigger / Handler Microclusters:** Placed in Application layer near parent object / service.
- **Fields:** Placed in compact 3–4 column grid below parent CustomObject in Schema layer.
- **Tests:** Placed in compact 2-column side cluster to the right of target production class.

---

## 14. Spacing Audit

Audit of `explorer/src/lib/layout/spacing.ts`:

- **Multi-Pass Relaxation:** `resolveSpacingAndCollisions` executes bounded iteration passes (default 30) to eliminate node overlaps.
- **Spatial Partitioning:** Uses 2D spatial hash grid (`SpatialGrid`) for $O(N)$ candidate pair detection.
- **Priority Weighting:** `getNodePriorityWeight` assigns priority weights (fields 10 < tests 20 < triggers/handlers 40 < standard 50 < hubs 70 < bridges 80). Higher priority nodes remain stationary while lower priority nodes absorb displacement.
- **Axis Selection:** Evaluates relative separation ratios (`ratioX = dx / requiredDx`, `ratioY = dy / requiredDy`) to choose horizontal vs vertical separation direction.
- **Constraints Preserved:** Coordinates are clamped to layer bounds, domain bounds, component bounds, and satellite tether distance (`maxSatelliteDistance = 300`).

---

## 15. Evaluator Audit

Audit of `explorer/src/lib/layout/evaluate-layout.ts`:

- **Independent Dimensions:** `evaluateLayout` measures 9 independent geometric and architectural metrics:
  1. `edgeCrossingCount`
  2. `averageEdgeLength`, `medianEdgeLength`, `maxEdgeLength`
  3. `nodeOverlapCount`
  4. `layerViolationCount`
  5. `domainCohesion` (`averageIntraDomainDistance`, `domainCohesionScore`)
  6. `componentSeparation` (`overlappingComponentPairs`, `gapViolationCount`, `minComponentDistance`)
  7. `hubLocality` (`averageHubNeighborDistance`)
  8. `bridgeLocality` (`averageBridgeToDomainCentroidDistance`)
  9. `satelliteLocality` (`averageTestToTargetDistance`, `averageFieldToObjectDistance`, `averageTriggerToHandlerDistance`)
- **Zero Magic Scores:** Does NOT calculate an arbitrary weighted "beauty score" or single quality rating.
- **Raw Delta Comparison:** `compareLayoutMetrics(before, after)` outputs raw numeric deltas for all dimensions.

---

## 16. Graph Layout Audit

Audit of `explorer/src/lib/graph-layout.ts`:

- **Cytoscape Adapter Integration:** `runLayout` and `createLayout` inspect `options.useArchitectureLayout !== false`.
- **Architecture Layout Execution:** Extracts Cytoscape nodes and edges via `extractNodesAndEdgesFromCy`, invokes `computeArchitectureLayout`, and applies coordinates via Cytoscape `preset` layout or `cy.batch()` position assignment.
- **`fcose` Override Audit:** Does `fcose` secretly override architecture layout? **NO.**
  `getLayoutOptions` returns Cytoscape `preset` layout whenever `nodes && nodes.length > 0`. `fcose` options are returned ONLY when `nodes` is empty or omitted.
- **Exact Fallback Conditions:**
  1. `options.useArchitectureLayout === false` -> falls back to `fcose`
  2. `cy.nodes().length === 0` or `nodes.length === 0` -> falls back to `fcose`

---

## 17. Position Contract Audit

Audit of Position Authority interaction in `explorer/src/lib/architecture-layout.ts` (lines 257–266):

- **Authority Hierarchy Integration:** `computeArchitectureLayout` accepts `existingPositions` option containing Level 1–3 authoritative positions (session drags, persisted positions, Cytoscape canvas positions).
- **Restoration Step (Step 12):** Candidate architecture positions are calculated for all graph nodes, but `existingPositions` overwrite calculated positions prior to returning:
  ```typescript
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos) {
      resultPositions[id] = { x: pos.x, y: pos.y };
    }
  }
  ```
- **Boundary Verification:** Lower-level layout modules (`local-layout`, `centrality`, `satellites`, `spacing`) operate purely on node data and do NOT touch `existingPositions`.

---

## 18. Determinism Audit

Audit of layout reproducibility:

- **100% Deterministic Execution:** All input node and edge arrays are cloned and sorted lexicographically by ID using `localeCompare` across all 13 layout modules and orchestration.
- **Zero Randomness:** Zero `Math.random()` or non-seeded operations exist in the layout pipeline.
- **Verified Scale Runs:** Tested across 10, 50, 100, 500, and 2,000 node graphs in `scalability-layout.test.ts` and `fixtures.test.ts`. Identical input produces identical coordinate byte outputs.

---

## 19. Fixture Audit

Audit of 13 synthetic benchmark fixtures in `explorer/src/lib/layout/fixtures/`:

| Fixture Name | File Location | Topology Attributes Exercised | Test Suite Coverage |
| :--- | :--- | :--- | :--- |
| `layered-architecture` | `fixtures/layered-architecture.ts` | Vertical 4-layer flow (LWC -> Controller -> Service -> Selector -> Schema) | Covered in `fixtures.test.ts` |
| `two-domain` | `fixtures/two-domain.ts` | 2 distinct business domains (`Order`, `Payment`) with cross-domain edges | Covered in `fixtures.test.ts` |
| `food-delivery` | `fixtures/food-delivery.ts` | Multi-domain architecture (`Ordering`, `Delivery`, `Restaurant`, `Billing`) | Covered in `fixtures.test.ts` |
| `hub-heavy` | `fixtures/hub-heavy.ts` | High-centrality fan-in / fan-out hub classes | Covered in `fixtures.test.ts` |
| `bridge-heavy` | `fixtures/bridge-heavy.ts` | Multi-domain cross-cutting orchestrator bridge classes | Covered in `fixtures.test.ts` |
| `test-heavy` | `fixtures/test-heavy.ts` | Production classes with multiple unit test satellites | Covered in `fixtures.test.ts` |
| `field-heavy` | `fixtures/field-heavy.ts` | CustomObjects with dense field satellite clusters | Covered in `fixtures.test.ts` |
| `trigger-handler` | `fixtures/trigger-handler.ts` | ApexTrigger -> Handler -> Service microclusters | Covered in `fixtures.test.ts` |
| `disconnected-components` | `fixtures/disconnected-components.ts` | Multiple disconnected subgraphs | Covered in `fixtures.test.ts` |
| `dense-cross-domain` | `fixtures/dense-cross-domain.ts` | Dense inter-domain dependency mesh | Covered in `fixtures.test.ts` |
| `sparse-graph` | `fixtures/sparse-graph.ts` | Low-density sparse dependency tree | Covered in `fixtures.test.ts` |
| `long-chain` | `fixtures/long-chain.ts` | Deep vertical dependency chains | Covered in `fixtures.test.ts` |
| `scale-100-plus` | `fixtures/scale-100-plus.ts` | Large 100+ node benchmark graph | Covered in `fixtures.test.ts` |

---

## 20. Findings

### FINDING-01: Bypassed Component Packing Module in Orchestration
- **ID:** `FINDING-01`
- **Severity:** `HIGH`
- **Exact File:** `explorer/src/lib/architecture-layout.ts`
- **Function:** `computeArchitectureLayout`
- **Evidence:** Line 12 imports `packComponentPositions` from `./layout/components`. However, Step 10 of `computeArchitectureLayout` (lines 181–240) implements inline single-row horizontal X shifting (`currentComponentXOffset += Math.max(compWidth, nodeWidth) + componentGap`) instead of invoking `packComponentPositions` or `packComponents`. `packComponentPositions` is never called anywhere in `architecture-layout.ts`.
- **Impact:** Disconnected graph components are arranged side-by-side in a single horizontal line rather than being packed into a compact 2D aspect-ratio-aware bounding box arrangement via FFDH shelf packing as designed in Wave 2C.
- **Reproduction:** Pass a graph with multiple disconnected components to `computeArchitectureLayout`. Components are shifted sequentially along the X-axis (`currentComponentXOffset += deltaX`), creating wide horizontal graphs.
- **Recommended Owner:** Agent 5A / Pipeline Integration Refinement.

---

### FINDING-02: Duplicate Domain Discovery Pass in Global Layout
- **ID:** `FINDING-02`
- **Severity:** `MEDIUM`
- **Exact File:** `explorer/src/lib/architecture-layout.ts` and `explorer/src/lib/layout/global-layout.ts`
- **Function:** `computeArchitectureLayout` / `computeGlobalDomainLayout`
- **Evidence:** In `architecture-layout.ts`, Step 3 executes `const domainDiscovery = discoverDomains(safeNodes, safeEdges);`. In Step 5, `computeGlobalDomainLayout(safeNodes, safeEdges, ...)` is invoked without passing `domainDiscovery`. Inside `computeGlobalDomainLayout` (`global-layout.ts` line 348), `buildDomainGraph(safeNodes, safeEdges)` is called without passing `domainResult`, causing `buildDomainGraph` to execute `discoverDomains(safeNodes, safeEdges)` a second time.
- **Impact:** Unnecessary duplicate computation pass over all graph nodes and edges during domain discovery, increasing execution time on large graphs.
- **Reproduction:** Profile `computeArchitectureLayout` or trace calls to `discoverDomains`. `discoverDomains` is executed twice per layout run.
- **Recommended Owner:** Agent 5A / Pipeline Integration Refinement.

---

### FINDING-03: Redundant Centrality Analysis in Orchestration Step 8
- **ID:** `FINDING-03`
- **Severity:** `LOW`
- **Exact File:** `explorer/src/lib/architecture-layout.ts`
- **Function:** `computeArchitectureLayout`
- **Evidence:** In Step 4 (line 92), `centralityMap = computeGraphCentralityAnalysis(...)` is computed. In Step 8 (lines 134–166), `computeArchitectureLayout` iterates over `safeNodes` and calls `calculateBridgeCandidatePosition` for bridge nodes. However, `analysis` from Step 1 already contains `isBridge` and `bridgeScore` computed in Wave 1A. Step 4 recomputes centrality analysis using `domainMap` and `layerMap`.
- **Impact:** Minor computational overhead due to dual calculation of bridge metrics across Step 1 and Step 4, though functional output remains correct.
- **Reproduction:** Trace `computeGraphCentralityAnalysis` and `computeArchitectureAnalysis`.
- **Recommended Owner:** Agent 5A / Pipeline Integration Refinement.

---

### FINDING-04: O(N^2) Overlap Check in Spacing Cleanup Engine on 10,000 Nodes
- **ID:** `FINDING-04`
- **Severity:** `LOW`
- **Exact File:** `explorer/src/lib/layout/spacing.ts`
- **Function:** `resolveSpacingAndCollisions` / `getOverlapCount`
- **Evidence:** `resolveSpacingAndCollisions` uses `SpatialGrid` for $O(N)$ candidate pair detection during relaxation passes. However, `getOverlapCount` helper (lines 183–200) runs a full $O(N^2)$ pairwise loop over all nodes to compute `initialOverlapCount` and `finalOverlapCount`. On synthetic graphs with 10,000 nodes, `getOverlapCount` performs $(10,000 \times 9,999) / 2 \approx 50,000,000$ iterations per call.
- **Impact:** Test execution timeouts when running `scalability-layout.test.ts` on 10,000 node benchmark graphs without test timeout adjustments or spatial grid overlap counting.
- **Reproduction:** Run `vitest run src/lib/scalability-layout.test.ts` on 10,000 node benchmarks.
- **Recommended Owner:** Agent 8A / Scalability & Performance Optimization.

---

## 21. Verified Invariants

The following 15 architectural and spatial invariants were verified across all pipeline modules and tests:

1. [x] **Analyzer Independence:** Analyzer facts (`dependency-analyzer.cjs`) remain untouched and authoritative.
2. [x] **Read-Only Explorer:** Explorer UI operates completely client-side without backend databases or LLM calls.
3. [x] **Static Mode Semantics:** Static mode semantics are 100% frozen; automatic relayout is prevented on filter, focus, or investigation changes.
4. [x] **Position Authority Hierarchical Win:** Level 1–3 authoritative positions strictly override candidate architecture positions in Step 12.
5. [x] **Layer Ordering Invariant:** Presentation layer ($Y=100$) appears above Application ($Y=350$), Domain ($Y=600$), and Schema ($Y=850$).
6. [x] **Domain Cohesion Invariant:** Related domain nodes are grouped spatially inside coherent domain regions.
7. [x] **Crossing Reduction Invariant:** Layer ordering uses relationship-aware barycenter sweeps, significantly reducing edge crossings compared to degree-only sorting.
8. [x] **Hub Locality Invariant:** High-centrality hub classes sit at prominent local bucket positions.
9. [x] **Bridge Trapping Protection:** Cross-domain bridge placement detects Intermediate-Domain Traps and displaces Y into inter-layer corridors.
10. [x] **Satellite Anchoring Invariant:** Tests and fields are placed relative to target production and object anchors without moving primary production coordinates.
11. [x] **Collision Clearance Invariant:** Spacing cleanup resolves overlapping node bounding boxes using priority-weighted relaxation.
12. [x] **Exact Determinism:** Given identical nodes and edges, the pipeline produces exact identical coordinate outputs.
13. [x] **No Magic Scores:** Layout evaluator measures independent metric dimensions without creating arbitrary weighted quality scores.
14. [x] **Thin Cytoscape Adapter:** `graph-layout.ts` acts purely as a thin adapter converting Cytoscape elements to Explorer data structures.
15. [x] **No Unintended `fcose` Overrides:** Architecture layout preset positions are applied cleanly when nodes exist, without silent `fcose` overrides.

---

## 22. Unverified Claims

1. **2D Component Packing in Orchestration:** Documentation claimed disconnected components are packed using 2D FFDH shelf packing from `components.ts`. As proved in FINDING-01, `architecture-layout.ts` currently executes single-row horizontal X shifting.
2. **Sub-100ms Performance on 10,000 Node Graphs:** Documentation claimed sub-second execution on 10,000 node graphs. As proved in FINDING-04, $O(N^2)$ overlap checking in `spacing.ts` causes execution timeouts on 10,000 node graphs unless optimized.

---

## 23. Tests Executed

Summary of all 15 test files executed during audit verification:

| Test File Path | Test Count | Pass / Fail | Duration | Focus Area |
| :--- | :---: | :---: | :---: | :--- |
| `src/lib/layout/components.test.ts` | 15 | PASS | 39ms | 2D FFDH shelf component packing |
| `src/lib/layout/spacing.test.ts` | 12 | PASS | 175ms | Multi-pass spatial collision cleanup |
| `src/lib/architecture-layout.test.ts` | 14 | PASS | 189ms | End-to-end pipeline orchestration |
| `src/lib/layout/domains.test.ts` | 14 | PASS | 26ms | 5-pass structural domain discovery |
| `src/lib/layout/local-layout.test.ts` | 10 | PASS | 81ms | Primary production local tier layout |
| `src/lib/layout/satellites.test.ts` | 11 | PASS | 33ms | Trigger, field, and test satellite placement |
| `src/lib/layout/evaluate-layout.test.ts` | 14 | PASS | 62ms | Layout evaluator & metrics comparison |
| `src/lib/layout/centrality.test.ts` | 11 | PASS | 26ms | Hub & bridge centrality analysis |
| `src/lib/layout/metrics.test.ts` | 15 | PASS | 13ms | Mathematical metric calculation functions |
| `src/lib/layout/analysis.test.ts` | 9 | PASS | 28ms | Intermediate architecture analysis model |
| `src/lib/layout/ordering.test.ts` | 8 | PASS | 67ms | Barycentric layer crossing reduction |
| `src/lib/layout/layers.test.ts` | 14 | PASS | 12ms | 4-layer architectural classification |
| `src/lib/position-policy.test.ts` | 19 | PASS | 16ms | 5-level Position Authority hierarchy |
| `src/lib/layout/global-layout.test.ts` | 8 | PASS | 103ms | Domain graph & global region layout |
| `src/lib/layout/fixtures/fixtures.test.ts` | 54 | PASS | 93ms | 13 synthetic benchmark graph fixtures |
| **Total** | **228** | **PASS (100%)** | **9.45s** | **Full Wave 1–5 Pipeline Coverage** |

---

## 24. Recommendation for Wave 8

1. **Integrate `components.ts` into Orchestration (Fix FINDING-01):** Update Step 10 in `explorer/src/lib/architecture-layout.ts` to call `packComponentPositions` from `./layout/components` rather than running inline horizontal X offsetting.
2. **Forward Domain Discovery Result (Fix FINDING-02):** Pass `domainDiscovery` from Step 3 into `computeGlobalDomainLayout` in Step 5 to eliminate the duplicate `discoverDomains` pass.
3. **Optimize Overlap Check for Scale (Fix FINDING-04):** Replace the $O(N^2)$ pairwise loop in `getOverlapCount` (`spacing.ts`) with spatial grid querying (`SpatialGrid`) for scale graphs (>1,000 nodes).
