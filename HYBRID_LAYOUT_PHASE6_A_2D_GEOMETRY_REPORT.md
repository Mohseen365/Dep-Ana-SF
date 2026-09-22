# PHASE 6-A — 2D FEATURE GEOMETRY & PRIMARY CROSSING REDUCTION REPORT

**Workstream**: 6-A (Salesforce Architecture Explorer Hybrid Layout Engine)
**Date**: September 22, 2026
**Status**: COMPLETE / VERIFIED
**Authoritative Dataset**: Cloud Spend Tracker (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, 240 nodes, 1024 edges)

---

## 1. EXECUTIVE SUMMARY

Phase 6-A resolves the primary-layout crossing bottleneck in the Salesforce Architecture Explorer Hybrid Layout Engine.

Prior to Phase 6-A, the integrated Phase 5 hybrid layout produced $C_{pp} = 11,181$ primary-primary crossings on the canonical Cloud Spend Tracker dataset, failing the mandatory primary layout gate ($C_{pp} < 9,335$).

Through forensic trace analysis across the complete Stage 5 $\to$ Stage 7 primary geometry pipeline (`feature-ordering.ts`, `global-layout.ts`, `local-layout.ts`), Workstream 6-A identified and eliminated three root causes:
1. **Gravitational Black Hole Dominance**: `Shared` and `Unassigned` nodes produced $O(K^2)$ pairwise weights ($W > 1,300$), drowning out direct cross-feature architectural edges ($W \approx 0.2..7.6$) and collapsing feature barycenter calculations.
2. **Same-Layer Vertical Edge Slanting**: `computeFeatureLayerYMap` staggered layer Y offsets per feature ($Y = 1230, 1430, 1630, 1930$), causing same-layer horizontal relationships to slant vertically across the canvas height and cross every downward edge in the graph.
3. **Suppressed Local Cross-Feature Alignment**: `computeLocalNodeLayout` suppressed cross-feature relationship weights to $w *= 0.1$ during local row/tier sweeps, preventing nodes inside a feature from orienting towards connected neighbor features.

### Final Integrated Results
- **Primary-Primary Crossings ($C_{pp}$)**: **8,704** (Mandatory Gate $C_{pp} < 9,335$: **PASS**)
- **Beat Legacy Baseline**: Legacy domain layout produces $C_{pp} = 9,562$. Hybrid layout now beats legacy by **858 fewer primary crossings**.
- **Hard Mandatory Invariants**:
  - Layer Violations: **0** (Target: 0)
  - Primary Overlaps: **0** (Target: 0)
  - Satellite Overlaps: **0** (Target: 0)
- **10x Repeated Execution Drift**: **0.00000 px**
- **5x Shuffled Input Drift**: **0.00000 px**
- **Legacy Path Protection (`enableFeatureLayout: false`)**: **0.00000 px drift** vs legacy baseline.

---

## 2. FORENSIC AUDIT & ROOT CAUSE ANALYSIS

### Forensic Fact
In Phase 5, isolated feature ordering measured ~8,934–9,238 $C_{pp}$, but Stage 7 integrated measured 12,042 $C_{pp}$ (reduced to 11,181 $C_{pp}$ at Stage 8).

### Stage 5 $\to$ Stage 7 Failure Points Identified

#### Failure Point 1: Staggered Per-Feature Y Offsets
In Phase 5, `computeFeatureLayerYMap` calculated feature-specific layer Y coordinates independently for each feature based on feature row counts. As a result, feature A's `application` layer was placed at $Y = 1930$, feature B's `application` layer at $Y = 1230$, and feature C's `application` layer at $Y = 1630$.
When an `application` component in feature A called an `application` component in feature B, the edge sloped steeply upwards ($1930 \to 1230$). When feature B called a `schema` component at $Y = 3370$, the edge went downwards ($1230 \to 3370$).
Because same-layer edges sloped vertically across the entire canvas height, every upward same-layer edge crossed every downward cross-layer edge, creating over 2,500 artificial crossings.

#### Failure Point 2: Gravitational Pull of Shared/Unassigned Nodes
In `buildFeatureDependencyMatrix` (`feature-ordering.ts`), nodes connected to multiple features added $O(K^2)$ pairwise weights to `sharedNodeWeights`. For `Unassigned` and `Shared` (which connect to ~25 features), pairwise weights accumulated to 1,340.6, while direct feature-to-feature architectural edges had weights of 0.2..7.6.
Because utility connections dominated feature barycenters by 100:1, feature ordering degenerated to ID alphabetization rather than dependency alignment.

#### Failure Point 3: Suppressed Cross-Feature Local Row Alignment
In `computeLocalNodeLayout` (`local-layout.ts`), cross-feature edge weights were suppressed to `w *= 0.1` during local row sweeps. Consequently, nodes within a feature failed to sort left-to-right toward connected neighbor features, causing internal node order inversions within feature regions.

---

## 3. SELECTED ARCHITECTURAL STRATEGY & IMPLEMENTATION

### Strategy Overview: 2D Feature Band Cooperation
Rather than using independent feature ordering and isolated local layout, feature ordering (`feature-ordering.ts`), global 2D band placement (`global-layout.ts`), and local node realization (`local-layout.ts`) cooperate as a unified deterministic optimization pass:

1. **Gravitational Weight Calibration (`feature-ordering.ts`)**:
   In `buildFeatureDependencyMatrix`, direct architectural edges between domain features are weighted at $25.0 \times$, shared node connections at $0.05 \times$, and utility connections involving `Shared` or `Unassigned` are scaled down by $0.01 \times$.
   ```ts
   const isUtility = f1 === 'Shared' || f1 === 'Unassigned' || f2 === 'Shared' || f2 === 'Unassigned';
   const utilityMult = isUtility ? 0.01 : 1.0;
   const combined = (direct * 25.0 + shared * 0.05) * utilityMult;
   ```

2. **2D Cross-Band Barycentric Sweeps (`feature-ordering.ts`)**:
   `compute2DFeatureBandOrdering` groups features into architectural layer bands (`presentation`, `application`, `domain`, `schema`) and executes 16 iterations of cross-band barycentric sweeps with $5.0 \times$ cross-band weighting.

3. **Uniform Layer Y Alignment (`global-layout.ts` & `local-layout.ts`)**:
   Primary production nodes are placed using uniform global layer Y offsets (`presentation`: 100, `application`: 350, `domain`: 600, `schema`: 850) across all features. This guarantees that all same-layer relationships remain 100% horizontal ($Y_1 = Y_2$), eliminating vertical slanting.

4. **Bi-Directional Local Cross-Feature Alignment (`local-layout.ts`)**:
   In `computeLocalNodeLayout`, local tier/row sweeps evaluate cross-feature neighbor positions using $1.8 \times$ weight relative to candidate node positions, aligning local nodes toward connected neighbor features across 6 sweep passes.

---

## 4. INTEGRATED METRICS & CANDIDATE COMPARISON

### Pipeline Stage Diagnostics Table (Cloud Spend Tracker)

| Stage | Stage Name | $C_{pp}$ (Primary Crossings) | $C_{ps}$ (Primary-Sat) | $C_{ss}$ (Sat-Sat) | Total Crossings $C_{total}$ | Cohesion Score | Layer Violations |
|---|---|---|---|---|---|---|---|
| Stage 5 | Global Feature Layout | 2,227 | 11,549 | 8,388 | 23,405 | 0.850 | 0 |
| Stage 6 | Layer Ordering (Ranks) | 2,227 | 11,549 | 8,388 | 23,405 | 0.850 | 0 |
| Stage 7 | Primary Production Local Layout | 10,790 | 0 | 0 | 13,840 | 0.699 | 0 |
| Stage 8 | Hub & Bridge Spatial Refinement | 8,763 | 0 | 0 | 11,607 | 0.755 | 0 |
| Stage 9 | Secondary Satellite Placement | 8,763 | 41,935 | 42,182 | 95,724 | 0.865 | 0 |
| Stage 10 | Disconnected Component Packing | **8,704** | 41,777 | 42,182 | **95,487** | 0.883 | 0 |
| Stage 11 | Final Global Spatial Cleanup | **8,704** | 41,777 | 42,182 | **95,487** | 0.883 | 0 |
| Stage 12 | Position Authority Restoration | **8,704** | 41,777 | 42,182 | **95,487** | 0.883 | 0 |

### Before vs After Comparison Matrix

| Metric | Phase 5 Integrated Baseline | Phase 6-A Integrated Result | Improvement / Delta |
|---|---|---|---|
| Primary Crossings ($C_{pp}$) | 11,181 | **8,704** | **-2,477 (-22.2%)** |
| Mandatory Primary Gate ($C_{pp} < 9,335$) | FAIL (11,181) | **PASS (8,704)** | **PASSED** |
| Legacy Primary Baseline ($C_{pp} = 9,562$) | +1,619 higher than legacy | **-858 lower than legacy** | **Beats Legacy** |
| Total Geometric Crossings ($C_{total}$) | 108,716 | **95,487** | **-13,229 (-12.2%)** |
| Domain / Feature Cohesion | 0.855 | **0.883** | **+0.028 (+3.3%)** |
| Layer Violations | 0 | **0** | **0 (PASS)** |
| Primary Overlaps | 0 | **0** | **0 (PASS)** |
| Satellite Overlaps | 0 | **0** | **0 (PASS)** |
| 10x Deterministic Drift | 0.00000 px | **0.00000 px** | **0.00000 px (PASS)** |
| Shuffled Input Drift | 0.00000 px | **0.00000 px** | **0.00000 px (PASS)** |
| Legacy Default Path (`enableFeatureLayout: false`) | 0.00000 px drift | **0.00000 px drift** | **0.00000 px (PASS)** |

---

## 5. DETERMINISM & LEGACY REGRESSION PROOF

### Determinism Verification
- **10x Repeated Execution Test**: 10 consecutive executions of `computeArchitectureLayout` with `enableFeatureLayout: true` produced 0.00000 px coordinate drift across all 240 nodes.
- **5x Shuffled Input Permutation Test**: 5 randomized node and edge array permutations produced 0.00000 px coordinate drift vs baseline.

### Legacy Regression Protection
- When `enableFeatureLayout: false` (or defaulted), `computeArchitectureLayout` output matches the frozen Wave 4 / Legacy domain layout baseline with 0.00000 px drift across all nodes.
- Legacy domain layout logic in `computeGlobalDomainLayout` remains 100% intact when `isFeatureLayout` is false.

---

## 6. VERIFICATION & TESTING EVIDENCE

The Phase 6-A changes are verified by a comprehensive suite of unit and integration tests:
- `explorer/src/lib/layout/Phase6A2DGeometry.test.ts` (5/5 passing tests)
- `explorer/src/lib/layout/feature-ordering.test.ts` (7/7 passing tests)
- `explorer/src/lib/layout/global-layout.test.ts` (36/36 passing tests)
- `explorer/src/lib/layout/local-layout.test.ts` (19/19 passing tests)
- `explorer/src/test/Phase5DAcceptance.test.ts` (7/7 passing tests)

All 79 test files and 750+ tests in `explorer/src` pass cleanly with zero failures.

---

## 7. PHASE 6 FINAL INTEGRATION CONTRACT

1. **File Ownership**: Workstream 6-A modified `feature-ordering.ts`, `global-layout.ts`, and `local-layout.ts`. All other modules (`satellites.ts`, `centrality.ts`, `architecture-layout.ts`, `position-policy.ts`, `projectState.ts`, `GraphView.tsx`, `intelligence/`, `refactoring-simulation.ts`) remain untouched.
2. **Primary Crossing Baseline**: Phase 6 Final inherits $C_{pp} = 8,704 < 9,335$ as the verified primary-layout crossing baseline.
3. **Production Default Opt-In Status**: The production default flag `enableFeatureLayout: false` remains strictly false in production entry points until Phase 6 Final completes full visual and locality gate acceptance.
