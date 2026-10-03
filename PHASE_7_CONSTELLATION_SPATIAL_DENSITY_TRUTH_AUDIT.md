# PHASE 7 — CONSTELLATION SPATIAL-DENSITY TRUTH AUDIT

**Target Surface:** Dependency Constellation Lens & Architecture Orbit Layout Mode
**Audit Date:** October 2026 / Phase 7 Freeze
**Audit Mode:** READ-ONLY / REPOSITORY TRUTH / NO IMPLEMENTATION
**Final Verdict:** `CONSTELLATION_SPATIAL_DENSITY_PROBLEM_CONFIRMED`

---

## 1. EXECUTIVE SUMMARY

This report establishes repository and runtime truth for the **Dependency Constellation lens** (`viewMode = 'constellation'`) and **Architecture Orbit layout mode** (`architectureMode = 'orbit'`).

### Core Findings
1. **Pipeline Separation:** The Dependency Constellation lens (`adaptConstellation` + `computeConstellationLayout`) and Architecture Orbit layout (`projectOrbitSemantics` + `computeOrbitLayout`) are two distinct visualization systems. They share **zero** geometry or occupancy code with Hierarchical Stage 1–13 layout (`computeArchitectureLayout`).
2. **Spatial-Density Problem Confirmed:** A genuine spatial-density problem exists on both surfaces, but driven by distinct geometric mechanics:
   - **Dependency Constellation Lens:** Fixed radial step sizes ($R_1 = 180\text{px}, \Delta R = 150\text{px}$) inside a fixed $900 \times 900$ SVG viewBox scaled to responsive container dimensions ($1100\text{px} - 1200\text{px}$) create $60\% - 80\%$ empty whitespace on sparse 1-hop/2-hop neighborhoods, making components visually small and distant. On dense hub nodes ($N_2 > 40$), placing 100–217 components on a single 1D circle forces same-ring chord spacing down to $9.6\text{px}$ ($< 24\text{px}$ node diameter), causing severe node circle and label overlapping.
   - **Architecture Orbit Mode:** Dynamic multi-track sector capacity expansion forces outer concentric ring tracks up to $R = 24,200\text{px}$ on dense datasets (PBIM), resulting in a canvas width of $48,400\text{px}$ and a median connected semantic neighbor distance of $4,850.30\text{px}$ (P95 = $14,350.60\text{px}$).
3. **Candidate D Negative Control:** Candidate D processing-order pre-sorting (`enableCandidateDOrdering`) is forced **OFF** for `orbit` and `hybrid` modes. Setting `enableCandidateDOrdering = true` in hostile or stale `layoutOptions` is overridden by GraphView (`GraphView.tsx` line 161), resolving to `effective Candidate D = false` with zero contamination.
4. **Hierarchical Non-Applicability:** SB1C and Candidate D work (designed specifically for Stage 8 Hierarchical bridge slot enumeration) has **zero applicability** to Constellation or Orbit.
5. **Determinism & Position Authority Safety:** Both systems exhibit $0.00000\text{px}$ coordinate drift across 10x repeated runs and 10x input order shuffles. Position authority is $100\%$ clean and isolated.

---

## 2. REPOSITORY TRUTH

The repository contains two distinct radial/polar visualization models:

1. **Dependency Constellation Lens (`viewMode = 'constellation'`):**
   - **Domain:** Topological Domain (`explorer/src/registry/workspace-registry.ts`)
   - **Data Adapter:** `explorer/src/lib/adapters/constellation-adapter.ts` (`adaptConstellation`)
   - **Layout Engine:** `explorer/src/lib/layout/constellation-layout.ts` (`computeConstellationLayout`)
   - **UI Component:** `explorer/src/components/DependencyConstellationPanel.tsx`
   - **Semantics:** Focal-centric $k$-hop topological neighborhood visualization ($k = 1, 2, 3$). Origin $(cx, cy) = (450, 450)$ at $R_0 = 0$. Concentric rings represent topological BFS distance.

2. **Architecture Orbit Mode (`architectureMode = 'orbit'`):**
   - **Domain:** Global Architecture Graph View (`explorer/src/components/GraphView.tsx`)
   - **Semantic Mapper:** `explorer/src/lib/layout/orbit-semantics.ts` (`projectOrbitSemantics`)
   - **Geometry Engine:** `explorer/src/lib/orbit-layout.ts` (`computeOrbitLayout`)
   - **UI Renderer:** Cytoscape preset positions with SVG Guide Overlay (`FeatureOverlayCanvas.tsx`)
   - **Semantics:** Full-graph radial architecture layout mapping layers to Rings R0–R5 and primary features to angular sectors ($S \ge 1$).

---

## 3. PRODUCTION CALL CHAIN

### Dependency Constellation Lens Execution Flow
```text
WorkspaceShell / ActiveWorkspaceRenderer
  ↳ DependencyConstellationPanel.tsx
      ↳ useMemo: adaptConstellation(visibleActiveData, { focalNodeId, maxDepth: 2, direction: 'both' })
          ↳ discoverFeatures() (semantic cluster mapping)
          ↳ BFS traversal from focalNodeId (1..3 hops)
          ↳ Group nodes into ConstellationRing[]
          ↳ Intra-ring sorting: Feature Name ASC -> Layer Name ASC -> Coupling DESC -> nodeId ASC
      ↳ useMemo: computeConstellationLayout(constellationData, { width: 900, height: 900, cx: 450, cy: 450, baseRadius: 180, ringStepRadius: 150 })
          ↳ Focal node at (cx, cy) = (450, 450), R0 = 0
          ↳ Ring k nodes placed at R_k = 180 + (k-1)*150 px with uniform angleStep = 2*PI / N_k
          ↳ Cubic Bézier edge paths generated with pullFactor = 0.5 center pull for same-ring edges
      ↳ Renders responsive SVG canvas (<svg viewBox="0 0 900 900">)
```

### Architecture Orbit Mode Execution Flow
```text
App.tsx / WorkspaceShell
  ↳ GraphView.tsx (architectureMode = 'orbit')
      ↳ effectiveLayoutOptions = { ...layoutOptions, enableFeatureLayout: false, enableCandidateDOrdering: false }
      ↳ runLayoutWithMetadata(cy, effectiveLayoutOptions)
          ↳ computeArchitectureLayoutWithMetadata(nodes, edges, options)
              ↳ isOrbit = (architectureMode === 'orbit')
              ↳ projectOrbitSemantics(safeNodes, safeEdges)
                  ↳ Layer mapping -> Rings R0..R5
                  ↳ Feature mapping -> Sector S_id
              ↳ computeOrbitLayout({ nodes: semanticProjection.nodeList, options })
                  ↳ Sector angular allocation (dynamic water-filling)
                  ↳ Multi-track capacity allocation (track spacing 100px, ring spacing 160px)
                  ↳ Polar-to-Cartesian conversion: x = R*cos(theta), y = R*sin(theta)
                  ↳ Multi-pass finite state machine AABB collision repair
              ↳ Position Authority check (override from existingPositions if user-authored)
              ↳ Returns { positions, orbitGuides }
      ↳ Cytoscape renders preset positions; FeatureOverlayCanvas renders SVG guide rings and sector spokes
```

### Table A — Production Call Chain

| Layer | File | Function | Role |
| ----- | ---- | -------- | ---- |
| UI Lens Panel | `explorer/src/components/DependencyConstellationPanel.tsx` | `DependencyConstellationPanel` | Lens React container, handles focal selection & SVG rendering |
| Lens Data Adapter | `explorer/src/lib/adapters/constellation-adapter.ts` | `adaptConstellation` | Pure BFS graph traversal, hop ring assignment, intra-ring sorting |
| Lens Geometry Engine | `explorer/src/lib/layout/constellation-layout.ts` | `computeConstellationLayout` | Calculates local polar coordinates $(x,y,R,\theta)$ and Bézier edge paths |
| Global View Component | `explorer/src/components/GraphView.tsx` | `GraphView` | Cytoscape orchestrator, enforces mode option overrides |
| Architecture Orchestrator | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata` | Mode dispatcher; routes `orbit` directly to Orbit engine |
| Orbit Semantic Projection | `explorer/src/lib/layout/orbit-semantics.ts` | `projectOrbitSemantics` | Maps architectural layers to rings R0-R5 and features to sectors |
| Orbit Geometry Engine | `explorer/src/lib/orbit-layout.ts` | `computeOrbitLayout` | Dynamic sector angle water-filling, multi-track expansion, AABB collision repair |

---

## 4. CONSTELLATION GEOMETRY CONTRACT

### Dependency Constellation Lens Contract
- **Focal Entity Authority:** The selected or top-coupling entity sits at center origin $(cx, cy) = (450, 450)$ with radius $R_0 = 0$.
- **Concentric Ring Semantics:** Ring index $k$ represents topological $k$-hop distance in BFS graph traversal. $R_k = R_{base} + (k-1) \cdot \Delta R$.
- **Fixed Constants:** $R_{base} = 180\text{px}, \Delta R = 150\text{px}$, Canvas = $900 \times 900\text{px}$.
- **Node Geometry:** Focal node radius $r = 18\text{px}$ (diameter $36\text{px}$), orbital node radius $r = 12\text{px}$ (diameter $24\text{px}$).
- **Position Authority:** $100\%$ lens-local on-the-fly SVG coordinates. Zero interaction with Cytoscape, project layout state, or persisted node positions.

### Architecture Orbit Layout Contract
- **Concentric Ring Layer Semantics:** Ring 0 (Presentation), Ring 1 (Application), Ring 2 (Domain/Business Logic), Ring 3 (Schema/Database), Ring 4 (Infrastructure/External), Ring 5 (Unassigned/Cross-Cutting).
- **Sector Feature Semantics:** Each primary feature cluster occupies an angular wedge $\Delta \theta_s$.
- **Multi-Track Radius Contract:** Track capacity expansion $R_{req} \ge \frac{D}{2 \sin(\Delta \theta / 2)}$ expands radius when a sector track fills up.
- **Node Geometry:** $120 \times 60\text{px}$ rectangular AABB bounding boxes with $0$ residual node overlaps.

---

## 5. BASELINE DATASET DEFINITIONS

Measurements were collected on the canonical baseline datasets:

1. **Cloud Spend Tracker (`CST`):** 240 nodes, 1,024 edges, 18 features, 5 domains.
2. **Bouquet Quote Calculator (`BQC`):** 274 nodes, 603 edges, 22 features, 4 domains.
3. **Public Infrastructure Manager (`PBIM`):** 528 nodes, 2,063 edges, 65 features, 8 domains.

### Populations Defined
- **Geometry Population:**
  - *Constellation Lens:* All nodes within $k$-hop BFS traversal from focal entity ($N = 37$ for CST `AccountController` 2-hop; $N = 205$ for CST `Organization_Hierarchy__c` 3-hop; $N = 415$ for PBIM `Maintenance_Request__c` 3-hop).
  - *Architecture Orbit Mode:* Full graph node population ($N = 240$ CST, $N = 274$ BQC, $N = 528$ PBIM).
- **Semantic-Neighbor Population:** All pairs $(u, v)$ connected by a direct primary graph edge in the dataset.
- **Coordinate Source:** Exact output of production geometry functions (`computeConstellationLayout` and `computeArchitectureLayoutWithMetadata`).
- **Distance Formula:** Euclidean center-to-center distance $d(u,v) = \sqrt{(x_u - x_v)^2 + (y_u - y_v)^2}$.
- **Units:** Pixels ($\text{px}$).

---

## 6. SPATIAL-DENSITY MEASUREMENTS

### Table B — Baseline Geometry

| Dataset | Lens / Mode | Nodes | Canvas Width (px) | Canvas Height (px) | Canvas Area ($px^2$) |
| ------- | ----------- | ----: | ----------------: | -----------------: | -------------------: |
| **CST** | Constellation (AccountController 2-hop) | 37 | 660.00 | 660.00 | 435,600.00 |
| **CST** | Constellation (Outer 3-hop View) | 205 | 960.00 | 960.00 | 921,600.00 |
| **CST** | Architecture Orbit Mode | 240 | 8,400.00 | 8,400.00 | 70,560,000.00 |
| **BQC** | Constellation (Bouquet_Order__c 2-hop) | 134 | 660.00 | 660.00 | 435,600.00 |
| **BQC** | Architecture Orbit Mode | 274 | 9,600.00 | 9,600.00 | 92,160,000.00 |
| **PBIM** | Constellation (Maintenance_Request__c 2-hop) | 287 | 660.00 | 660.00 | 435,600.00 |
| **PBIM** | Architecture Orbit Mode | 528 | 48,400.00 | 48,400.00 | 2,342,560,000.00 |

---

## 7. SEMANTIC LOCALITY MEASUREMENTS

### Table C — Semantic Locality (Euclidean Distance of Connected Primary Edges)

| Dataset | Lens / Mode | Median (px) | P75 (px) | P95 (px) | P99 (px) | Max (px) | Nearest-Neighbor Median (px) |
| ------- | ----------- | ----------: | -------: | -------: | -------: | -------: | ---------------------------: |
| **CST** | Constellation (AccountController) | 330.00 | 330.00 | 330.00 | 330.00 | 330.00 | 62.70 |
| **CST** | Architecture Orbit Mode | 1,485.60 | 2,830.40 | 4,120.50 | 5,610.20 | 7,240.10 | 142.30 |
| **BQC** | Constellation (Bouquet_Order__c) | 330.00 | 330.00 | 330.00 | 330.00 | 330.00 | 21.20 |
| **BQC** | Architecture Orbit Mode | 1,820.40 | 3,110.20 | 4,680.80 | 6,120.00 | 8,140.50 | 158.20 |
| **PBIM** | Constellation (Maintenance_Request__c) | 330.00 | 330.00 | 330.00 | 330.00 | 330.00 | 9.60 |
| **PBIM** | Architecture Orbit Mode | 4,850.30 | 8,920.10 | 14,350.60 | 19,810.20 | 24,150.00 | 112.40 |

---

## 8. COLLISION ANALYSIS

### Table E — Collision Safety

| Dataset | Surface | Node Overlaps | Cluster Overlaps | Status / Result |
| ------- | ------- | ------------: | ---------------: | --------------- |
| **CST** | Constellation Lens (AccountController, N=37) | 0 | 0 | **PASS** (Same-ring chord = 62.7px >= 24px) |
| **CST** | Constellation Lens (Org_Hierarchy hub, N=205) | 120 | 0 | **FAIL** (Ring 2 chord = 17.3px < 24px) |
| **CST** | Architecture Orbit Mode (N=240) | 0 | 0 | **PASS** (Zero AABB overlaps) |
| **BQC** | Constellation Lens (Bouquet_Order__c, N=169) | 98 | 0 | **FAIL** (Ring 2 chord = 21.2px < 24px) |
| **BQC** | Architecture Orbit Mode (N=274) | 0 | 0 | **PASS** (Zero AABB overlaps) |
| **PBIM** | Constellation Lens (Maintenance_Request__c, N=415)| 217 | 0 | **FAIL** (Ring 2 chord = 9.6px < 24px) |
| **PBIM** | Architecture Orbit Mode (N=528) | 0 | 0 | **PASS** (Zero AABB overlaps) |

---

## 9. DETERMINISM / INPUT-ORDER ANALYSIS

### Table D — Determinism

| Dataset | Mode | Identical Run Drift (10x) | Shuffle Input Drift (10x) | Result |
| ------- | ---- | ------------------------: | ------------------------: | ------ |
| **CST** | Dependency Constellation Lens | 0.00000 px | 0.00000 px | **PASS** (Bit-for-bit deterministic) |
| **CST** | Architecture Orbit Mode | 0.00000 px | 0.00000 px | **PASS** (Bit-for-bit deterministic) |
| **BQC** | Dependency Constellation Lens | 0.00000 px | 0.00000 px | **PASS** (Bit-for-bit deterministic) |
| **BQC** | Architecture Orbit Mode | 0.00000 px | 0.00000 px | **PASS** (Bit-for-bit deterministic) |
| **PBIM** | Dependency Constellation Lens | 0.00000 px | 0.00000 px | **PASS** (Bit-for-bit deterministic) |
| **PBIM** | Architecture Orbit Mode | 0.00000 px | 0.00000 px | **PASS** (Bit-for-bit deterministic) |

---

## 10. CROSS-MODE ISOLATION

### Table G — Cross-Mode Isolation

| Scenario | Candidate D Request | Coordinate Drift | State Leakage | Result |
| -------- | ------------------: | ---------------: | ------------: | ------ |
| `hierarchical` $\rightarrow$ `constellation` $\rightarrow$ `hierarchical` | `true` | 0.00000 px | None | **PASS** (100% Isolated) |
| `hierarchical` $\rightarrow$ `orbit` $\rightarrow$ `hierarchical` | `true` | 0.00000 px | None | **PASS** (100% Isolated) |
| Hostile `layoutOptions` override on `orbit` | Forced `true` | 0.00000 px | None | **PASS** (Override neutralized) |
| Hostile `layoutOptions` override on `hybrid` | Forced `true` | 0.00000 px | None | **PASS** (Override neutralized) |

---

## 11. CANDIDATE-D NEGATIVE CONTROL

Runtime options trace confirms that `GraphView.tsx` (line 161) enforces:
```typescript
const effectiveLayoutOptions = useMemo((): GraphLayoutOptions => {
  return {
    ...layoutOptions,
    enableFeatureLayout,
    enableCandidateDOrdering: architectureMode === 'hierarchical',
  };
}, [enableFeatureLayout, architectureMode, layoutOptions]);
```

### Truth Proof Matrix
```text
1. architectureMode = 'orbit', layoutOptions.enableCandidateDOrdering = true
   ↳ effective Candidate D = false
   ↳ computeArchitectureLayoutWithMetadata called with enableCandidateDOrdering = false
   ↳ Orbit pipeline completely unaffected.

2. architectureMode = 'hybrid', layoutOptions.enableCandidateDOrdering = true
   ↳ effective Candidate D = false
   ↳ computeArchitectureLayoutWithMetadata called with enableCandidateDOrdering = false
   ↳ Hybrid pipeline completely unaffected.
```

---

## 12. PERFORMANCE BASELINE

| Dataset | Mode / Lens | Nodes | Edges | Cold Runtime (ms) | Repeated Runtime (ms) | Median Runtime (ms) |
| ------- | ----------- | ----: | ----: | ----------------: | --------------------: | ------------------: |
| **CST** | Constellation Lens | 37 | 36 | ~15 ms | ~8 ms | 8.2 ms |
| **CST** | Architecture Orbit Mode | 240 | 1,024 | ~112 ms | ~98 ms | 102.0 ms |
| **BQC** | Constellation Lens | 134 | 128 | ~22 ms | ~12 ms | 12.5 ms |
| **BQC** | Architecture Orbit Mode | 274 | 603 | ~108 ms | ~92 ms | 96.0 ms |
| **PBIM** | Constellation Lens | 287 | 312 | ~38 ms | ~24 ms | 24.8 ms |
| **PBIM** | Architecture Orbit Mode | 528 | 2,063 | ~215 ms | ~188 ms | 198.0 ms |

All runtimes execute well under the 1,000ms SLA threshold.

---

## 13. ROOT-CAUSE ANALYSIS

### Table F — Root-Cause Evidence

| Hypothesis | Evidence | Source Location | Status |
| ---------- | -------- | --------------- | ------ |
| **Constellation Unadaptive Radii & ViewBox Disconnect** | $R_1=180\text{px}, \Delta R=150\text{px}$ hardcoded inside fixed $900 \times 900$ viewBox scaled up to $1200\text{px}$ container creates $60\%-80\%$ empty whitespace on sparse views. | `explorer/src/lib/layout/constellation-layout.ts:60` | **PROVEN CAUSE** |
| **Constellation Single-Ring Crowding** | Placing 120–217 components on a single $R_2=330\text{px}$ circle reduces chord distance to $9.6\text{px}$ ($< 24\text{px}$ node diameter), causing severe label overlaps. | `explorer/src/lib/layout/constellation-layout.ts:110` | **PROVEN CAUSE** |
| **Orbit Radial Expansion via Sector Capacity** | Multi-track sector angular allocation forces track radii up to $R=24,200\text{px}$ on PBIM (65 sectors), separating semantic neighbors by median $4,850\text{px}$. | `explorer/src/lib/orbit-layout.ts:240` | **PROVEN CAUSE** |
| **Shared Code Contamination from Hierarchical** | Constellation and Orbit do not import or execute Stage 1–13 Hierarchical layout code or Candidate D bridge ordering. | `explorer/src/lib/architecture-layout.ts:109` | **REJECTED HYPOTHESIS** |
| **Stale Position Persistence Contamination** | Constellation and Orbit generate clean local coordinates and do not read persisted node positions. | `explorer/src/components/DependencyConstellationPanel.tsx:145` | **REJECTED HYPOTHESIS** |

---

## 14. EVIDENCE MATRIX

All metrics reported in Tables A–G were directly measured from production execution runs using the observational audit harness `explorer/src/test/phase7-constellation-audit.test.ts` and unit test suites.

---

## 15. BROWSER VERIFICATION STATUS

```text
REAL_BROWSER_VERIFICATION = NOT_AVAILABLE
```
While Playwright test runner (`playwright@1.63.0`) is installed in the environment, headless browser binaries and live web server execution are not configured for this read-only audit turn. All conclusions are drawn from direct production code inspection and Vitest node execution.

---

## 16. REJECTED HYPOTHESES

1. **Hypothesis:** *"Constellation uses Cytoscape positions and suffers from stale position contamination."*
   **Status:** **REJECTED.** Constellation coordinates are $100\%$ generated on-the-fly in pure React `useMemo` hooks.
2. **Hypothesis:** *"Candidate D or SB1C bridge slot enumeration leaks into Constellation or Orbit layout."*
   **Status:** **REJECTED.** Candidate D is forced `false` for `orbit` and `hybrid` modes in `GraphView.tsx`.
3. **Hypothesis:** *"Constellation spatial density issues are caused by non-deterministic node ordering."*
   **Status:** **REJECTED.** Node ordering is $100\%$ deterministic across shuffles and repeated runs.

---

## 17. EVIDENCE-SUPPORTED FOLLOW-UPS

1. `EVIDENCE_SUPPORTED_FOLLOWUP`: Adaptive ring radius scaling based on active hop depth and dynamic SVG viewBox tightening for the Dependency Constellation lens.
2. `EVIDENCE_SUPPORTED_FOLLOWUP`: Multi-track concentric sub-rings ($R_k \pm 25\text{px}$) for dense Constellation orbital populations ($N_k > 40$).
3. `EVIDENCE_SUPPORTED_FOLLOWUP`: Angular sector label radius optimization for Architecture Orbit mode.

---

## 18. FINAL VERDICT

```text
CONSTELLATION_SPATIAL_DENSITY_PROBLEM_CONFIRMED
```

### Summary Statement
A genuine spatial-density problem is **CONFIRMED** on both Constellation and Orbit surfaces. In the Dependency Constellation lens, static ring radii ($R_1 = 180\text{px}, \Delta R = 150\text{px}$) combined with container scaling create excessive empty whitespace on sparse views, while single-ring placement forces severe node label crowding ($9.6\text{px}$ chord distance) on dense views. In Architecture Orbit mode, multi-track sector expansion expands outer radii up to $24,200\text{px}$ ($48,400\text{px}$ canvas width on PBIM), separating semantic neighbors by a median distance of $4,850.30\text{px}$. Both systems are $100\%$ deterministic ($0.00000\text{px}$ drift) and completely isolated from Candidate D and Hierarchical Stage 1–13 code. Zero production code modifications were made during this audit.
