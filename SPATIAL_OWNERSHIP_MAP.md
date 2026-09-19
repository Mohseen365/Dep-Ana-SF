# SPATIAL OWNERSHIP MAP
**Salesforce Dependency Analyzer + Architecture Explorer**
**Audit Status:** EVIDENCE-GATHERING & DIAGNOSIS PASS COMPLETE (0 PRODUCTION FILES MODIFIED)

---

## Subsystem Architecture & Implementation Boundaries

To prepare for Phase 2 compaction and optimization without introducing regressions or merge conflicts, this document maps exact file ownership, module responsibilities, strict contracts, dependencies, and parallel-safe execution boundaries across all layout subsystems.

---

## 1. Domain Responsibility & Ownership Map

| Subsystem Domain | Primary File | Core Functions / Exported Interfaces | Implementation Owner / Role | Primary Responsibilities |
|------------------|--------------|--------------------------------------|-----------------------------|--------------------------|
| **Pipeline Orchestration** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayout`, `ArchitectureLayoutOptions` | Architecture Layout Lead | Top-level pipeline sequencing, defensive cloning, component shift loop, position authority merge |
| **Cytoscape & Viewport Binding** | `explorer/src/lib/graph-layout.ts` | `createLayout`, `runLayout`, `extractNodesAndEdgesFromCy`, `getLayoutOptions` | Graph Integrator | Cytoscape preset layout binding, element extraction, viewport fit & padding options |
| **Analysis & Facts** | `explorer/src/lib/layout/analysis.ts` | `computeArchitectureAnalysis`, `applyLayerClassification`, `applyDomainClassification` | Graph Intelligence Specialist | Structural degree, neighbor adjacency, satellite parenting, connected component decomposition |
| **Layer Classification** | `explorer/src/lib/layout/layers.ts` | `classifyNodeLayer`, `classifyNodeLayerWithReason`, `isTestNode` | Layer Architect | Mapping node types, behavior, path, and naming to presentation/application/domain/schema |
| **Domain Discovery** | `explorer/src/lib/layout/domains.ts` | `discoverDomains`, `extractDomainStem`, `extractDomainFromPath`, `classifyNodeDomain` | Subsystem Classifier | Domain stem extraction, folder path parsing, neighborhood cohesion, Shared fallback |
| **Global Layout & Region Sizing** | `explorer/src/lib/layout/global-layout.ts` | `computeGlobalDomainLayout`, `buildDomainGraph`, `determineGlobalDomainOrder` | Global Geometry Specialist | Domain graph construction, barycentric domain ordering, domain spatial region bounds & X origin advancement |
| **Layer Ordering & Crossing Reduction** | `explorer/src/lib/layout/ordering.ts` | `reduceEdgeCrossings`, `computeSimulatedPositions`, `estimateCrossingsForOrder` | Topology & Ordering Lead | Inter-layer edge crossing reduction, 2-pass barycenter sweeps, bucket rank mapping |
| **Local Production Node Placement** | `explorer/src/lib/layout/local-layout.ts` | `computeLocalNodeLayout`, `LocalBucketLayout`, `LocalLayoutResult` | Primary Production Layout Lead | Primary node tiering (upstream/intermediate/downstream), row/column grid arrangement, local bucket bounds |
| **Centrality, Hubs & Bridges** | `explorer/src/lib/layout/centrality.ts` | `computeGraphCentralityAnalysis`, `calculateBridgeCandidatePosition`, `calculateHubCandidatePosition` | Graph Centrality Specialist | Hub score formula, cross-domain bridge identification, Intermediate-Domain Trap detection & corridor displacement |
| **Satellite Placement** | `explorer/src/lib/layout/satellites.ts` | `placeSatellites`, `isTriggerNode`, `isHandlerNode`, `SatellitePlacementResult` | Secondary Satellite Lead | Collision-free slot ring generation for tests, field grids around parent objects, trigger-handler microclusters |
| **Component Packing** | `explorer/src/lib/layout/components.ts` | `packComponents`, `packComponentPositions`, `calculateLocalComponentBounds`, `compareComponents` | Geometry Packing Specialist | 2D FFDH shelf packing for disconnected components, target aspect ratio calculation, global offset translation |
| **Spatial Clearance & Collision** | `explorer/src/lib/layout/spacing.ts` | `resolveSpacingAndCollisions`, `SpatialGrid` | Spatial Physics Lead | $O(N)$ spatial grid overlap detection, priority-weighted displacement pushes, domain/layer/satellite constraint clamping |
| **Diagnostic Metrics & Evaluation** | `explorer/src/lib/layout/metrics.ts`, `evaluate-layout.ts` | `evaluateLayout`, `calculateLayoutMetrics`, `compareLayoutMetrics` | Verification & QA Lead | Pure diagnostic measurements (edge crossings, edge lengths, overlaps, domain cohesion, component separation) |

---

## 2. Dependency Graph Between Subsystems

```
[analysis.ts] ◄── [layers.ts] ◄── [domains.ts]
      │
      ▼
[global-layout.ts] (Computes domain graph & region X origins)
      │
      ▼
[ordering.ts] (Orders layer:domain buckets)
      │
      ▼
[local-layout.ts] (Places primary nodes inside domain regions)
      │
      ▼
[centrality.ts] (Refines hub/bridge positions)
      │
      ▼
[satellites.ts] (Places test/field satellites around anchors)
      │
      ▼
[components.ts] (2D shelf packing for disconnected components)
      │
      ▼
[spacing.ts] (Final $O(N)$ collision clearance pass)
      │
      ▼
[architecture-layout.ts] (Merges preserved positions & returns map)
```

---

## 3. Parallel Execution Safety & Isolation Matrix

When implementing layout compaction changes in future phases, modifications can be executed safely in parallel according to the following isolation boundaries:

| File Name | Parallel-Safe Group | Safe to Modify Concurrently With | CANNOT Modify Concurrently With | Change Guidance |
|-----------|--------------------|----------------------------------|---------------------------------|-----------------|
| `global-layout.ts` | Group A: Global Geometry | `satellites.ts`, `components.ts`, `metrics.ts` | `local-layout.ts`, `ordering.ts` | Modify domain region width formula to use primary nodes only; adjust inter-domain spacing formula. |
| `local-layout.ts` | Group B: Primary Production | `satellites.ts`, `components.ts`, `metrics.ts` | `global-layout.ts`, `ordering.ts` | Modify local tier row max column limits or local row spacing without breaking `bucketLayouts` interface. |
| `satellites.ts` | Group C: Secondary Satellites | `global-layout.ts`, `components.ts`, `ordering.ts` | `spacing.ts` | Modify satellite slot step sizes (`dx`, `dy`) and tether penalties. |
| `components.ts` | Group D: Component Packing | `global-layout.ts`, `local-layout.ts`, `satellites.ts` | `architecture-layout.ts` | Enhance 2D shelf packing algorithm or aspect ratio calculations. |
| `architecture-layout.ts` | Group E: Pipeline Orchestrator | `metrics.ts`, `evaluate-layout.ts` | `global-layout.ts`, `components.ts` | Replace linear horizontal shift loop in Step 10 with `packComponentPositions`. |
| `spacing.ts` | Group F: Spatial Clearance | `global-layout.ts`, `local-layout.ts`, `components.ts` | `satellites.ts` | Adjust required clearance margins or priority weights in collision cleanup pass. |
| `metrics.ts` / `evaluate-layout.ts` | Group G: Metrics & Diagnostics | ALL GROUPS (Pure Diagnostic Read-Only) | NONE | Safe to modify or extend diagnostic measurement properties at any time. |

---

## 4. Architectural Rules for Phase 2 Implementation

1. **Zero Randomness:** All layout algorithms must maintain 100% input-order determinism.
2. **Immutable Analysis:** `analysis.ts`, `layers.ts`, and `domains.ts` remain the sole authoritative sources for node classification.
3. **5-Level Position Authority Hierarchy:**
   - Level 1: User-dragged / explicit persisted positions (highest authority)
   - Level 2: Static Mode preserved positions
   - Level 3: Incremental layout calculated positions
   - Level 4: Full architecture-aware calculated positions
   - Level 5: Fallback preset layout positions
4. **Collision Safety Exclusivity:** Any compaction changes in `global-layout.ts` or `components.ts` must maintain 0 node overlaps, verified by `resolveSpacingAndCollisions` in `spacing.ts`.
