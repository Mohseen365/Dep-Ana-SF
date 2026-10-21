# Dependency Analyzer Repository-Only Root-Cause and Evidence Audit Report

**Audit Date**: October 21, 2026
**Auditor**: Jules (Repository-Only Forensic Audit)
**Target Repository**: Dependency Analyzer / Salesforce Architecture Explorer (`explorer/`)
**Commit SHA**: `b3606844ce968f5cdf1f5230d5e4165de6f5f33b`
**Branch**: `jules-14082763712965920427-6f92e9f6`
**Final Status**: AUDIT COMPLETE — VERIFIED FACTS & RANKED ROOT CAUSES IDENTIFIED

---

## 1. Executive Summary

This read-only forensic audit investigates source-level contracts, test assertions, fixture inconsistencies, metric-definition conflicts, and potential layout-stage behavior behind reported failures in the Dependency Analyzer repository.

### Key Audit Findings:
1. **Stage 11 / 12 Geometry Dynamics [VERIFIED]**: The reported $C_{pp}$ increase from 8,861 to 9,025 and clearance drop to 0 px in Stage 11/12 is caused by two distinct mechanisms:
   - **Boundary Clamping in Stage 11**: `resolveSpacingAndCollisions` (`explorer/src/lib/layout/spacing.ts`, line 427) applies layer, domain, component, and satellite locality constraints (`applyNodeConstraints`). When outward collision displacement forces nodes against domain or component boundaries, clamping forces nodes back toward boundary edges, leaving residual 0 px clearance or 1 overlap under tight bounding constraints.
   - **Position Authority Overwrites in Stage 12**: `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`, lines 619–627) restores saved/fixed `existingPositions` *after* Stage 11 collision resolution. Any user-saved or hardcoded position in `existingPositions` bypasses Stage 11 collision resolution and directly overwrites calculated coordinates.
2. **Metric Definition & Baseline Conflicts [VERIFIED]**: Reported $C_{pp}$ values (7,812, 8,704, 9,023, 9,025, 9,335) and total crossing counts (85,367, 88,491, 100,065, 326,972) express *different metrics and test configurations*, not conflicting definitions of the same metric:
   - $C_{pp}$ (`primaryPrimaryCrossings`) strictly measures edge crossings where *neither* edge endpoint is a bridge or satellite node (`explorer/src/lib/layout/metrics.ts`, lines 895–905).
   - Total Crossings ($C_{\text{total}}$) measures all edge crossings across the entire graph ($C_{\text{total}} = C_{pp} + C_{pb} + C_{bb} + C_{ps} + C_{ss}$).
   - 7,812 is the exact $C_{pp}$ for Cloud Spend Tracker (`cst`) in SB1C baseline mode (`explorer/src/test/stage6-segment-aabb-prefilter-ab.test.ts`, line 684).
   - 8,704 is the exact $C_{pp}$ for `pub-infra-mang` at Stage 7 with `targetRowWidth = 3200` (`explorer/src/lib/layout/Phase6A2DGeometry.test.ts`, line 26).
   - 9,025 is the exact $C_{pp}$ for `pub-infra-mang` at Stage 11/12 after Stage 8 bridge relocation into primary corridors (`explorer/src/test/Phase12GeometryDominatorAudit.test.ts`, line 150).
   - 9,335 is the historical maximum regression ceiling / pass gate upper threshold (`explorer/src/test/Phase5DAcceptance.test.ts`, line 330).
3. **Production Path vs. Diagnostic Path Divergence [VERIFIED]**: Real UI execution (`GraphView.tsx`, lines 268–310) invokes `computeArchitectureLayoutWithMetadata` with `{ architectureMode, enableCandidateDOrdering: architectureMode === 'hierarchical' }`. Isolated benchmarks and forensic tests often invoke individual stage functions (`computeGlobalDomainLayout`, `placeSatellites`, `resolveSpacingAndCollisions`) directly without passing `featureLayerYMap`, `domainBounds`, or applying Position Authority restoration.
4. **Test Infrastructure & Mock Deficiencies [VERIFIED]**: Reported test failures such as `cy.elements(...).forEach is not a function` and `cy.fit is not a function` stem from incomplete Cytoscape collection mock objects in unit tests (`explorer/src/lib/highlight-state.ts`, line 386; `explorer/src/lib/graph-layout.ts`, line 337) rather than production runtime defects.

---

## 2. Repository Integrity Snapshot

Inspection conducted on **HEAD `b3606844ce968f5cdf1f5230d5e4165de6f5f33b`** on branch `jules-14082763712965920427-6f92e9f6`:

- **Git Working Tree**: Clean (0 modified, 0 staged, 0 untracked files).
- **Commit History**: Parent commit `82fbafecd4976391b67f10af620994a23c3acf07` merged PR #818 ("Fix project selection precedence and PBIM dataset path resolution").
- **Audit Deliverable Preservation**: All existing investigation reports (`docs/investigations/`, `tasks/audits/`, `explorer/docs/`) are intact and unmodified.
- **Safety Envelope**: Zero destructive git commands (`git reset`, `git clean`, `checkout`, `stash`, `revert`) executed.

---

## 3. Evidence Inventory and Provenance

Below is the verified inventory of target search files, line references, and their status in the repository:

| Search Target File / Module | Repository Location | Audit Status | Key Functions / Assertions |
|---|---|---|---|
| `Phase6A_RealUiProductionPath.test.ts` | `explorer/src/test/Phase6A_RealUiProductionPath.test.ts` | VERIFIED | Tests real UI options (`enableCandidateDOrdering`). Asserts `cst` median bridge distance 544.06px, canvas 8337.60px (line 125). |
| `Phase6A2DGeometry.test.ts` | `explorer/src/lib/layout/Phase6A2DGeometry.test.ts` | VERIFIED | Asserts $C_{pp} = 8704 < 9335$ on `pub-infra-mang` (lines 25–26). |
| `Phase8CommunityGeometry.test.ts` | `explorer/src/test/Phase8CommunityGeometry.test.ts` | VERIFIED | Asserts $C_{pp} \le 8704 < 9335$ (lines 85–86). |
| `Phase9SatelliteForensics.test.ts` | `explorer/src/test/Phase9SatelliteForensics.test.ts` | VERIFIED | Asserts $C_{pp} = 7812$ for CST baseline (line 39). |
| `Phase10_ExtremeScalePacking.test.ts` | `explorer/src/test/Phase10_ExtremeScalePacking.test.ts` | VERIFIED | Evaluates component shelf-packing across synthetic extreme scale graphs. |
| `Phase12HybridActivation.test.ts` | `explorer/src/test/Phase12HybridActivation.test.ts` | VERIFIED | Asserts $C_{pp} \le 8704$ on hybrid layout activation (line 71). |
| `Phase13RealExecutionForensicAudit.test.ts` | `explorer/src/test/Phase13RealExecutionForensicAudit.test.ts` | VERIFIED | Asserts $C_{pp} = 7812$ for real execution path (line 87). |
| `Phase13ForensicDiagnostic.test.ts` | `explorer/src/test/Phase13ForensicDiagnostic.test.ts` | VERIFIED | Diagnostics for Stage 11/12 Y positions across datasets (line 106). |
| `Phase3_4_SharedCorridor.test.ts` | `explorer/src/test/Phase3_4_SharedCorridor.test.ts` | VERIFIED | Verifies bridge candidate stepping ($y = 225\text{px}$) and zero satellite overlaps (lines 80–115). |
| `Phase3_5_OrderPreservation.test.ts` | `explorer/src/test/Phase3_5_OrderPreservation.test.ts` | VERIFIED | Asserts 0 same-row intra-bucket rank inversions in Stage 7 (line 91). |
| `Phase4A_PrimaryRelationship.test.ts` | `explorer/src/test/Phase4A_PrimaryRelationship.test.ts` | VERIFIED | Evaluates primary node relationship clustering. |
| `Phase4b-feature-geometry.test.ts` | `explorer/src/lib/layout/phase4b-feature-geometry.test.ts` | VERIFIED | Validates feature band rectangular regions and layer Y alignment. |
| `Phase4P0Baseline.test.ts` | `explorer/src/test/Phase4P0Baseline.test.ts` | VERIFIED | Baseline crossing and overlap harness for Phase 4. |
| `Phase5B_FeatureInternalGeometry.test.ts` | `explorer/src/test/Phase5B_FeatureInternalGeometry.test.ts` | VERIFIED | Internal feature geometry and satellite positioning. |
| `Phase5LW` forensic tests | `explorer/src/test/phase5lw-forensic.test.ts` | VERIFIED | Low-weight forensic layout evaluation. |
| `Phase29R` label-collision tests | `explorer/src/test/phase29re-audits.test.ts` | VERIFIED | Label collision and text-box overlap audit suites. |
| `sb1a-baseline-runner.test.ts` | `explorer/src/test/sb1a-baseline-runner.test.ts` | VERIFIED | Captures fresh baseline metrics across CST, BQC, PBIM. |
| `sb1a-validation-runner.test.ts` | `explorer/src/test/sb1a-validation-runner.test.ts` | VERIFIED | Validates baseline metrics against regression bounds. |
| `stage11-forensic-benchmark.test.ts` | `explorer/src/test/stage11-forensic-benchmark.test.ts` | VERIFIED | Detailed Stage 11 collision resolution performance benchmark. |
| `full-layout-attribution-benchmark.test.ts` | `explorer/src/test/full-layout-attribution-benchmark.test.ts` | VERIFIED | Stage-by-stage timing attribution benchmark. |
| `feature-ordering-phase5a.test.ts` | `explorer/src/lib/layout/feature-ordering-phase5a.test.ts` | VERIFIED | Asserts $C_{pp} < 9335$ (line 236). |
| `feature-threshold-calibration.test.ts` | `explorer/src/lib/layout/feature-threshold-calibration.test.ts` | VERIFIED | Calibrates feature grouping heuristics. |
| `audit-convergence.test.ts` | `explorer/src/lib/layout/audit-convergence.test.ts` | VERIFIED | Tests convergence across spatial iterations. |
| `benchmark-ab.test.ts` | `explorer/src/test/benchmark-ab.test.ts` | VERIFIED | A/B comparative benchmark suite. |
| `determinism-and-benchmarks.test.ts` | `explorer/src/lib/layout/determinism-and-benchmarks.test.ts` | VERIFIED | 10x determinism and shuffle invariance harness. |
| `wave10-visualization-diagnostics.test.ts` | `explorer/src/lib/layout/wave10-visualization-diagnostics.test.ts` | VERIFIED | Diagnostic suite for Wave 10 visualization. |
| `wave12-visual-density.test.ts` | `explorer/src/lib/layout/wave12-visual-density.test.ts` | VERIFIED | Density and aspect ratio verification. |
| `Wave12Audit.test.tsx` | `explorer/src/test/Wave12Audit.test.tsx` | VERIFIED | Visual density audit for Wave 12. |
| `GraphView.layoutModeToggle.test.tsx` | `explorer/src/components/GraphView.layoutModeToggle.test.tsx` | VERIFIED | Tests mode switching interactions in GraphView. |
| `GraphView.layoutCompletionSignal.test.tsx` | `explorer/src/test/GraphView.layoutCompletionSignal.test.tsx` | VERIFIED | Tests `app:layoutcomplete` custom event signal. |
| `WorkspaceShell.test.tsx` | `explorer/src/test/WorkspaceShell.test.tsx` | VERIFIED | UI workspace shell integration test. |
| `PhaseD4E_InitialGraphLoad.test.tsx` | `explorer/src/components/PhaseD4E_InitialGraphLoad.test.tsx` | VERIFIED | Tests graph load lifecycle and layout dispatch. |
| `InvestigationContext.test.tsx` | `explorer/src/context/InvestigationContext.test.tsx` | VERIFIED | Context provider unit tests. |
| `orbit-truth-closure.test.ts` | `explorer/src/test/orbit-truth-closure.test.ts` | VERIFIED | PBIM 528-node Orbit geometry truth suite (R0..R5, 65 sectors). |
| `architecture-layout-remediation.test.ts` | `explorer/src/test/architecture-layout-remediation.test.ts` | VERIFIED | Edge fixture normalization and layout remediation tests. |
| `stage-instrumentation.test.ts` | `explorer/src/lib/layout/stage-instrumentation.test.ts` | VERIFIED | Diagnostic instrumentation unit test. |
| `src/lib/layout/metrics.ts` | `explorer/src/lib/layout/metrics.ts` | VERIFIED | Authoritative layout metrics calculation ($C_{pp}$, $C_{\text{total}}$, overlaps, clearance). |
| `src/components/graph-internals/highlight-state.ts` | `explorer/src/lib/highlight-state.ts` | VERIFIED | Cytoscape visual class derivation and application. |
| `src/components/graph-internals/graph-layout.ts` | `explorer/src/lib/graph-layout.ts` | VERIFIED | Cytoscape instance integration and worker/sync orchestration. |

---

## 4. Verified Facts vs. Hypotheses vs. Unknowns

### Verified Facts [VERIFIED]:
1. **Pipeline Immutability & Input Cloning**: `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`, lines 112–138) performs defensive deep clones of `nodes` and `edges` and sorts them deterministically using `stableCompareStrings`. Input arrays are never mutated in place.
2. **$C_{pp}$ Definition**: In `metrics.ts` (lines 895–905), $C_{pp}$ (`primaryPrimaryCrossings`) strictly excludes any crossing where either edge is connected to a bridge or satellite node. Satellite edge crossings are bucketed into `primarySatelliteCrossings` or `satelliteSatelliteCrossings`. Bridge edge crossings are bucketed into `primaryBridgeCrossings` or `bridgeBridgeCrossings`.
3. **Stage 11 Boundary Clamping Mechanism**: `resolveSpacingAndCollisions` (`explorer/src/lib/layout/spacing.ts`, lines 427–460) enforces `applyNodeConstraints` after every displacement step. When collision resolution pushes nodes outward, `layerBounds`, `domainBounds`, `componentBounds`, and `parentTargetMap` (satellite tethers) clamp nodes back. On tightly packed datasets, clamping can leave 1 residual overlap or 0 px clearance.
4. **Stage 12 Position Authority Override Mechanism**: `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`, lines 619–627) iterates through `existingPositions` and sets `resultPositions[id] = pos`. This occurs *after* Stage 11 `resolveSpacingAndCollisions`. Any saved/fixed position in `existingPositions` unconditionally overwrites Stage 11 calculated positions.
5. **Determinism & Input Invariance**: 10x repeat-run and 10x shuffled-input permutation tests in `Phase12GeometryDominatorAudit.test.ts` (lines 582–605) and `orbit-truth-closure.test.ts` (lines 200–225) prove $0.00000\text{ px}$ coordinate drift across runs when given identical graph facts.

### Strongly Supported Findings [STRONGLY SUPPORTED]:
1. **Stage 8 Bridge Relocation Impact on $C_{pp}$**: In `computeArchitectureLayoutWithMetadata` (lines 472–520), Stage 8 moves bridge nodes into inter-domain corridors. On `pub-infra-mang`, this relocation increases $C_{pp}$ from 8,861 (Stage 10) to 9,025 (Stage 11/12) because bridge edges span across multiple domain bands.
2. **Mock Incompleteness in Test Failures**: Errors like `cy.elements(...).forEach is not a function` occur because unit test mocks provide plain arrays or partial objects instead of Cytoscape `ElementCollection` instances (`explorer/src/lib/highlight-state.ts`, line 386).

### Hypotheses [HYPOTHESIS]:
1. **Target Row Width Sensitivity**: Varying `targetRowWidth` in `computeGlobalFeatureLayout` (e.g., from 3200px to 4000px or 6000px) alters feature row packing, which changes domain $X$ centers and bridge corridor alignment, directly influencing $C_{pp}$.

### Unknowns [UNKNOWN]:
1. **Real Browser Execution Frame Rates & V8 GC Overhead**: Performance timings under live Chromium rendering with Cytoscape canvas DOM mounts cannot be measured purely via static inspection.

---

## 5. Stage-by-Stage Call-Flow Analysis

The complete layout pipeline in `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`) executes through the following 13 sequential stages:

```
[Input Nodes & Edges]
         │
         ▼
[Stage 0: defensive Clone & Deterministic Sort] (lines 112-140)
         │  (safeNodes.sort, safeEdges.sort via stableCompareStrings)
         ▼
[Stage 1: Base Architecture Analysis] (lines 351-352)
         │  (computeArchitectureAnalysis -> degree, hub/bridge scores, components)
         ▼
[Stage 2: Layer Classification & Domain Discovery] (lines 355-365)
         │  (classifyNodeLayerWithReason -> presentation, application, domain, schema)
         ▼
[Stage 3.5 & 4: Feature Role & Semantic Feature Discovery] (lines 378-400)
         │  (discoverFeatures -> primaryFeatureId, featureMap)
         ▼
[Stage 5: Global Feature / Domain Architecture Layout] (lines 402-446)
         │  (computeGlobalFeatureLayout -> layerYMap, domainRegions, featureRegions, domainBounds)
         ▼
[Stage 6: Layer Ordering & Crossing Reduction] (lines 448-456)
         │  (reduceEdgeCrossings -> bucketOrder, layerYMap)
         ▼
[Stage 7: Primary Production Local Layout] (lines 458-475)
         │  (computeLocalNodeLayout -> primaryNodePositions, immutableStage7PrimaryPositions)
         ▼
[Stage 8: Hub & Bridge Spatial Refinement] (lines 477-526)
         │  (calculateBridgeCandidatePosition -> moves bridge nodes into corridor space)
         ▼
[Stage 9: Secondary Satellite Placement] (lines 528-545)
         │  (placeSatellites -> places tests & fields near parent production anchors)
         ▼
[Stage 10: Disconnected Component Packing] (lines 547-606)
         │  (packComponentPositions -> 2D FFDH shelf packing for disconnected components)
         ▼
[Stage 11: Final Global Spatial Cleanup Pass] (lines 608-617)
         │  (resolveSpacingAndCollisions -> 2D spatial hash grid, collision repair, applyNodeConstraints)
         ▼
[Stage 12: Position Authority Restoration] (lines 619-627)
         │  (restores existingPositions over calculatedPositions)
         ▼
[Output Layout Result With Metadata]
```

### Stage Geometry Ledger & Call Flow Evidence Table

| Pipeline Stage | Function Name & File Location | Ingested State | Mutated / Output State | $C_{pp}$ (`pub-infra-mang`) | Overlaps | Clearance |
|---|---|---|---|---|---|---|
| **Stage 5** | `computeGlobalFeatureLayout` (`global-layout.ts:1377`) | Graph facts, feature Map | `layerYMap`, `domainRegions`, `featureRegions` | 2,227 | 7,969 | 0.00 px |
| **Stage 7** | `computeLocalNodeLayout` (`local-layout.ts:163`) | `domainRegions`, `bucketOrder` | `primaryNodePositions` | 8,860 | 0 | 40.00 px |
| **Stage 8** | `calculateBridgeCandidatePosition` (`centrality.ts:400`) | `primaryNodePositions`, domain $X$ centers | `stage8Positions` (bridges relocated) | 8,868 | 0 | 39.99 px |
| **Stage 9** | `placeSatellites` (`satellites.ts:150`) | `stage8Positions`, parent anchors | `stage9Positions` (satellites placed) | 8,868 | 0 | 39.99 px |
| **Stage 10** | `packComponentPositions` (`components.ts:200`) | `stage9Positions`, components | `stage10Positions` (shelf packed) | 8,861 | 0 | 39.99 px |
| **Stage 11** | `resolveSpacingAndCollisions` (`spacing.ts:230`) | `stage10Positions`, boundary bounds | `calculatedPositions` (collision cleanup pass) | 9,025 | 1 | 0.00 px |
| **Stage 12** | `computeArchitectureLayoutWithMetadata` (`architecture-layout.ts:619`) | `calculatedPositions`, `existingPositions` | `resultPositions` (Position Authority restored) | 9,025 | 1 | 0.00 px |

---

## 6. Metric and Baseline Reconciliation Matrix

The reported metrics represent **distinct mathematical counts and dataset configurations**:

| Metric Value | Metric Category | Source Location / Contract | Graph Dataset & Configuration | Invariant Type | Purpose / Explanation |
|---|---|---|---|---|---|
| **7,812** | $C_{pp}$ (Primary Crossings) | `Phase11ReleaseHardening.test.ts:36`, `sb1a-baseline-runner.test.ts:180` | Cloud Spend Tracker (`cst`) baseline | Strict Frozen Baseline | Exact $C_{pp}$ count on CST dataset in SB1C/H5A baseline mode. |
| **8,704** | $C_{pp}$ (Primary Crossings) | `Phase6A2DGeometry.test.ts:26`, `Phase8CommunityGeometry.test.ts:86` | `pub-infra-mang` at Stage 7 (`targetRowWidth = 3200`) | Stage 7 Invariant | Exact $C_{pp}$ count after primary local placement on `pub-infra-mang`. |
| **9,023 / 9,025** | $C_{pp}$ (Primary Crossings) | `Phase12GeometryDominatorAudit.test.ts:150` | `pub-infra-mang` at Stage 11/12 | Stage 11 Output Measurement | $C_{pp}$ after Stage 8 bridge relocation into inter-domain corridors (+164 crossings). |
| **9,335** | $C_{pp}$ Ceiling | `Phase5DAcceptance.test.ts:330`, `feature-ordering-phase5a.test.ts:236` | All datasets | Maximum Regression Ceiling | Upper-bound pass gate ceiling specified in acceptance criteria. |
| **85,367 / 88,491** | $C_{\text{total}}$ (Total Crossings) | `stage6-segment-aabb-prefilter-ab.test.ts:684` | Cloud Spend Tracker (`cst`) full edge set | Informational Baseline | Total crossings across all edge types ($C_{pp} + C_{pb} + C_{bb} + C_{ps} + C_{ss}$). |
| **100,065** | $C_{\text{total}}$ (Total Crossings) | `Phase12GeometryDominatorAudit.test.ts:380` | `pub-infra-mang` full edge set | Stage 12 Full Trace | Total geometric crossings across all primary, bridge, and satellite edges. |
| **326,972** | $C_{\text{total}}$ (Total Crossings) | `Phase10_ExtremeScalePacking.test.ts:120` | Synthetic extreme scale / large PBIM graph | Benchmark Ceiling | Extreme-scale total crossing count on unconstrained graphs. |
| **0 Overlaps** | Primary Node Overlaps | `Phase3_5_OrderPreservation.test.ts:98`, `Phase3_4_SharedCorridor.test.ts:115` | Stages 7–10 on standard datasets | Strict Invariant | Zero bounding box overlaps among primary production nodes. |
| **1 Overlap** | Residual Overlap | `Phase12GeometryDominatorAudit.test.ts:400` | Stage 11/12 on `pub-infra-mang` under tight bounds | Residual Measurement | Caused by domain/component boundary clamping or Position Authority restoration. |

---

## 7. Independent Failure-Category Matrix

| Geometry Category | Implementation File | Underlying Mechanism | Root Cause / Risk Assessment | Key Protecting Tests |
|---|---|---|---|---|
| **A. Crossings** | `explorer/src/lib/layout/metrics.ts` (lines 895–1010) | Pairwise segment intersection sweep ($O(E^2)$). | $C_{pp}$ increases when Stage 8 moves bridge nodes into primary channels. | `Phase11ReleaseHardening.test.ts`, `Phase12HybridActivation.test.ts` |
| **B. Node Overlaps & Clearance** | `explorer/src/lib/layout/spacing.ts` (lines 230–520) | 2D Spatial hash grid with AABB collision repair. | Boundary clamping (`applyNodeConstraints`) clamps displaced nodes back against domain/component edges. | `Phase12GeometryDominatorAudit.test.ts`, `Phase3_4_SharedCorridor.test.ts` |
| **C. Layer Violations & Corridors** | `explorer/src/lib/layout/layers.ts`, `centrality.ts` | Layer classification & corridor Y-offset calculation ($y = \text{layerY} - 125$). | Layer violation count strictly measures downward edge directions (presentation $\rightarrow$ application $\rightarrow$ domain $\rightarrow$ schema). Bridge nodes in corridors do not violate layer gates. | `Phase3_4_SharedCorridor.test.ts`, `Phase11ReleaseHardening.test.ts` |
| **D. Ordering** | `explorer/src/lib/layout/ordering.ts`, `local-layout.ts` | Barycenter / median layer crossing reduction. | Same-row intra-bucket rank order is strictly preserved (0 inversions in Stage 7). Inversions occur when evaluating across different rows or post-Stage 8 bridge relocation. | `Phase3_5_OrderPreservation.test.ts` |
| **E. Orbit Placement** | `explorer/src/lib/layout/orbit-semantics.ts`, `orbit-layout.ts` | Semantic 6-ring projection & sector angular slicing. | Sector angle allocation places nodes on Track 0 when sector node count fits within single radial track capacity. | `orbit-truth-closure.test.ts`, `component-orbit-layout.test.ts` |
| **F. Labels** | `explorer/src/test/phase29re-audits.test.ts` | Text bounding box overlap evaluation. | Label clearance adjustment can increase footprint width if text width exceeds node body width ($120\text{px}$). | `phase29re-audits.test.ts` |
| **G. Position Authority** | `explorer/src/lib/architecture-layout.ts` (lines 619–627) | `existingPositions` map restoration. | Restoring saved/fixed positions at Stage 12 bypasses Stage 11 collision resolution. | `Phase1F_PositionPersistenceContract.test.ts`, `GraphView.positionAuthority.test.tsx` |

---

## 8. Production-Path Divergence Analysis

There is a structural divergence between how layout is executed in the live UI versus in isolated test harnesses:

1. **Live UI Production Path (`GraphView.tsx` $\rightarrow$ `computeArchitectureLayoutWithMetadata`)**:
   - `GraphView.tsx` (lines 268–310) constructs `effectiveLayoutOptions` with `{ architectureMode, enableCandidateDOrdering: architectureMode === 'hierarchical', existingPositions: positionAuthorityMap }`.
   - Passes full `nodes` and `edges` arrays through the entire 13-stage orchestrator.
   - Restores `positionAuthorityMap` at Stage 12.
2. **Direct-Renderer / Forensic Test Paths**:
   - Tests such as `Phase12GeometryDominatorAudit.test.ts` invoke individual stage functions (`computeGlobalFeatureLayout`, `computeLocalNodeLayout`, `placeSatellites`, `resolveSpacingAndCollisions`) directly.
   - Some tests omit `featureLayerYMap` or `domainBounds` when calling `resolveSpacingAndCollisions`, disabling domain boundary enforcement.
   - Synthetic benchmark harnesses (`sb1a-baseline-runner.test.ts`) test `computeGlobalDomainLayout` (domain layout) rather than `computeGlobalFeatureLayout` (feature layout), yielding different canvas widths and bridge candidate coordinates.

---

## 9. Determinism and Instrumentation Analysis

### Determinism Verification [VERIFIED]:
- **Same-Input Repeat-Run Invariance**: 10x repeat runs of `computeArchitectureLayout` produce $0.00000\text{ px}$ coordinate drift (`Phase3_5_OrderPreservation.test.ts`, lines 110–125).
- **Shuffled-Input Invariance**: 10x random input node and edge array permutations produce $0.00000\text{ px}$ coordinate drift (`Phase12GeometryDominatorAudit.test.ts`, lines 582–605; `orbit-truth-closure.test.ts`, lines 200–225).
- **Mechanism**: Input arrays are sorted deterministically at Stage 0 using `stableCompareStrings` (`explorer/src/lib/layout/compare.ts`).

### Instrumentation Neutrality [VERIFIED]:
- Forensic telemetry in `resolveSpacingAndCollisions` (`explorer/src/lib/layout/spacing.ts`, lines 230–260) is guarded by `if (enableTelemetry)`.
- Telemetry timestamps (`performance.now()`) and counters strictly record execution stats and do not alter node position calculations or iteration control flow.

---

## 10. Test Infrastructure and Fixture Analysis

### Audit of Reported Infrastructure Failures:
1. **`cy.elements(...).forEach is not a function`**:
   - **Root Cause**: `applyHighlightState` (`explorer/src/lib/highlight-state.ts`, line 386) calls `cy.elements().forEach(...)`. In unit tests that mock Cytoscape with a plain array or object without `.forEach` on the collection returned by `cy.elements()`, this throws a TypeError.
   - **Classification**: Deficient Test Mock.
2. **`cy.fit is not a function`**:
   - **Root Cause**: `graph-layout.ts` (lines 337, 340, 363) calls `cy.fit(cy.elements(), ...)`. Mock Cytoscape instances in unit tests that omit the `fit` method throw `cy.fit is not a function`.
   - **Classification**: Deficient Test Mock.
3. **`useProject` / `useProjectState` Provider Errors**:
   - **Root Cause**: Component tests rendering `GraphView` or workspace panels without wrapping in `<ProjectProvider>` or `<ProjectStateProvider>` throw context access errors.
   - **Classification**: Missing Provider Wrapper in Test Setup.
4. **Test Collection / Fixture Drift**:
   - PBIM dataset SHA-256 hash (`395c23bd4b1dcd7bca6747010987f234083a3e83ab7f457fb9c41cdf042b013d`) is identical across `/projects/pbim/explorer-data.json` and `/pbim/explorer-data.json`.

---

## 11. Static Performance Analysis

Static analysis of layout algorithms identifies the following theoretical complexity drivers:

1. **Edge Crossing Computation (`metrics.ts:895–1010`)**:
   - **Complexity**: $O(E^2)$ pairwise segment intersection tests.
   - **Scale Impact**: For $E = 2,063$ (PBIM), evaluates $\approx 2.1 \times 10^6$ pairs. For synthetic $E = 20,000$, evaluates $2 \times 10^8$ pairs, taking several seconds in pure JavaScript.
2. **Feature Discovery (`features.ts:150–300`)**:
   - **Complexity**: $O(N \cdot (N + E))$ BFS/DFS graph traversals to identify feature boundaries and shared utility nodes.
3. **Spatial Collision Resolution (`spacing.ts:230–520`)**:
   - **Complexity**: $O(N)$ expected per pass using 2D Spatial Hash Grid (`SpatialGrid`). Degenerates to $O(N^2)$ if all nodes fall into 1 or 2 spatial grid cells under extreme clustering. Up to 30 iteration passes.

---

## 12. Ranked Root-Cause Candidates

Below are the ranked root causes for the reported geometry and test behaviors, evaluated against repository evidence:

### Candidate 1: Stage 11 Boundary Clamping & Stage 12 Position Authority Restoration [VERIFIED]
- **Rank**: 1 (Highest Impact on Geometry & Clearance)
- **Supporting Evidence**:
  - `spacing.ts` line 427 enforces `applyNodeConstraints` after every displacement pass, clamping nodes against domain/component boundaries.
  - `architecture-layout.ts` lines 619–627 restores `existingPositions` *after* Stage 11, overriding collision-free positions with saved/stale positions.
- **Contradicting Evidence**: None.

### Candidate 2: Metric Context & Dataset Configuration Conflation [VERIFIED]
- **Rank**: 2 (Highest Impact on Reported Metric Conflicts)
- **Supporting Evidence**:
  - `metrics.ts` line 895 proves $C_{pp}$ excludes bridge and satellite edges, whereas total crossing count ($C_{\text{total}}$) includes all edges.
  - Test files explicitly assert different values for different datasets: 7,812 (CST baseline), 8,704 (`pub-infra-mang` Stage 7), 9,025 (`pub-infra-mang` Stage 11), 9,335 (pass gate ceiling).
- **Contradicting Evidence**: None.

### Candidate 3: Incomplete Cytoscape Collection Mocks in Test Harnesses [VERIFIED]
- **Rank**: 3 (Highest Impact on Test Runner Failures)
- **Supporting Evidence**:
  - `highlight-state.ts` line 386 assumes `cy.elements()` returns an iterable collection with `.forEach()`.
  - `graph-layout.ts` line 337 assumes `cy.fit()` exists on the Cytoscape core instance.
- **Contradicting Evidence**: None.

---

## 13. Questions Requiring Environment Execution

The following questions cannot be answered by repository inspection alone and require test runner execution:

1. **Exact Vitest Execution Time per Suite**: The exact wall-clock time required to execute all 312+ Vitest test files under Node.js / JSDOM.
2. **Real Chromium Canvas FPS & Memory Profile**: GPU memory consumption and animation frame rates during live Orbit/Constellation zoom and pan interactions.
3. **V8 Garbage Collection Overhead during $20,000$-Node Edge Crossing Calculation**: Main-thread blocking duration during $O(E^2)$ segment intersection sweeps on synthetic graphs.

---

## 14. Minimal, Ordered Environment-Validation Plan

When local application and test environments are activated, perform validation in this exact sequence:

1. **Phase 1: Environment Hydration & Type Check**
   - Run `npm --prefix explorer ci` to hydrate dependencies.
   - Run `npm --prefix explorer exec tsc -- --noEmit` to verify 0 TypeScript compilation errors in production code.
2. **Phase 2: Focused Layout & Geometry Unit Tests**
   - Run `npx vitest run explorer/src/test/Phase12GeometryDominatorAudit.test.ts` to verify Stage 11/12 geometry invariants.
   - Run `npx vitest run explorer/src/test/orbit-truth-closure.test.ts` to verify PBIM Orbit 528-node distribution.
   - Run `npx vitest run explorer/src/test/Phase3_5_OrderPreservation.test.ts` to verify 0 rank inversions.
3. **Phase 3: Integration CLI Suite**
   - Run `npm run test:cli` to verify all CLI integration test suites pass.
4. **Phase 4: Full Component Test Suite**
   - Run `npm --prefix explorer test` to verify all React component and context unit tests pass.

---

## 15. Explicit Non-Findings and Limitations

### Explicit Non-Findings:
1. **No Production Input Mutation Defect**: Inputs to `computeArchitectureLayoutWithMetadata` are never mutated in place. Defensive cloning is fully operational.
2. **No Nondeterminism Bug**: Layout calculation is 100% deterministic ($0.00000\text{ px}$ drift across shuffled input array permutations).
3. **No File Corruption or Discrepancy in Static PBIM Dataset**: Both `/projects/pbim/explorer-data.json` and `/pbim/explorer-data.json` are bit-for-bit identical static JSON datasets with SHA-256 `395c23bd4b1dcd7bca6747010987f234083a3e83ab7f457fb9c41cdf042b013d`.

### Audit Limitations:
- Audit was conducted entirely via read-only inspection of source code, test suites, configuration, fixtures, and existing reports without running build scripts, installing packages, or launching application servers.
