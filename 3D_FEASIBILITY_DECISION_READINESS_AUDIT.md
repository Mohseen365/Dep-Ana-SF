# 3D FEASIBILITY DECISION-READINESS AUDIT — CURRENT-VERSION VERIFICATION REPORT

## 1. Executive Summary

This report delivers an independent decision-readiness audit of the candidate analysis document `3D_ARCHITECTURE_GRAPH_FEASIBILITY_INVESTIGATION.md` against the actual current state of the **Salesforce Architecture Explorer & Dependency Analyzer** codebase.

### Audit Findings Summary
1. **Candidate Investigation Status**: The existing 3D feasibility report contains valuable conceptual analysis but combines verified code facts with unverified experimental targets, minor historical metric discrepancies, and unproven user comprehension assumptions.
2. **Canonical Graph Contract**: The canonical dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`) is **CURRENT VERIFIED** at **240 nodes** and **1,024 edges** across 4 layers (`presentation`: 26, `application`: 50, `domain`: 32, `schema`: 132) and **13 discovered feature regions**.
3. **2D Metric Calibration**: The candidate report cited $C_{total} = 94,661$ crossings ($C_{ps} = 41,590$, $C_{ss} = 41,544$). Current code execution confirms Phase 11/12 Candidate E frozen metrics at $C_{total} = 94,662$ ($C_{ps} = 41,590, C_{ss} = 41,544$), with Phase 8 global feature ordering further reducing crossings down to $C_{total} = 85,367$ ($C_{pp} = 7,812, C_{ps} = 38,706, C_{ss} = 36,381$). Satellite edges account for **87.8% to 87.9%** of all 2D crossings.
4. **Position Authority & Architecture Isolation**: The proposed **Option 1 (2D-Derived 3D Projection)** is structurally sound and compatible with Level 1–5 Position Authority (`position-policy.ts`). However, the candidate report's claim of "zero regression risk" is a **CONTRADICTED** overstatement due to bundle size growth (+550 KB WebGL libraries), WebGL fallback hazards, and canvas event raycasting overhead.
5. **Comprehension vs. Geometry Gap**: High geometric edge crossing counts do **not** automatically establish an architecture comprehension defect. Whether 3D camera projection provides a net usability benefit over existing 2D neighborhood focus, filtering, and impact analysis remains **UNKNOWN UNTIL VALIDATED**.

### Decision-Readiness Status
```text
READY ONLY AFTER SPECIFIC EVIDENCE GAPS ARE CLOSED
```

---

## 2. Current-State Verification

Every claim in the existing 3D feasibility investigation was audited against current source files and validation records.

| Fact / Area | Existing Claim | Current Verified Code / Evidence | Classification |
| :--- | :--- | :--- | :--- |
| **Canonical Dataset** | `cloud-spend-tracker/explorer-data.json` | SHA-256 `feeb68f3...` bit-for-bit matched | `CURRENT VERIFIED` |
| **Node / Edge Count** | 240 nodes, 1,024 edges | 240 nodes, 1,024 edges | `CURRENT VERIFIED` |
| **Layer Breakdown** | 4 layers (26 / 50 / 32 / 132) | 4 layers (`presentation`: 26, `application`: 50, `domain`: 32, `schema`: 132) | `CURRENT VERIFIED` |
| **Feature Regions** | 13 features | 13 features discovered via `discoverFeatures()` | `CURRENT VERIFIED` |
| **Position Hierarchy** | 5-Level Position Authority | Level 1 Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout > Level 5 Fallback | `CURRENT VERIFIED` |
| **Physical Clearance** | $\ge 40.0\text{px}$ clearance | `minimumNodeClearance` with $1\text{e-}3$ epsilon normalization | `CURRENT VERIFIED` |
| **Total 2D Crossings** | $C_{total} = 94,661$ | Candidate E baseline = $94,662$; Phase 8 global ordering = $85,367$ | `CORRECTED` |
| **Satellite Crossing Ratio** | 87.8% | $C_{ps} + C_{ss} = 83,134 / 94,662 = 87.82\%$ | `CURRENT VERIFIED` |
| **Layout Runtime** | $< 50\text{ms}$ layout computation | $< 50\text{ms}$ layout; full pipeline $< 890\text{ms}$ | `CURRENT VERIFIED` |
| **WebGL Performance** | $\ge 60\text{ FPS}$, $< 100\text{ms}$ render | Unverified experimental targets | `PROPOSED TARGET` |

---

## 3. Existing Investigation Claims Audit

### Claims Classification Breakdown

#### 1. CURRENT VERIFIED Claims
* Canonical graph topology (240 nodes, 1,024 edges).
* 13-stage deterministic layout pipeline (`architecture-layout.ts`).
* Level 1–5 Position Authority priority rules (`position-policy.ts`).
* Physical node clearance $\ge 40.0\text{px}$ contract.
* Satellite crossings comprising ~87.8% of total 2D edge crossings.

#### 2. HISTORICAL / CORRECTED Claims
* Candidate report cited $C_{total} = 94,661$. Current Phase 11/12 Candidate E metric is $94,662$ (1 crossing difference), while Phase 8 ordering achieves $85,367$.

#### 3. PROPOSED TARGET Claims
* Render frame rate $\ge 60\text{ FPS}$ under 3D WebGL instanced rendering.
* Initial render latency $< 100\text{ms}$.
* GPU VRAM footprint $< +50\text{ MB}$.
* Projected 2D crossing reduction $> 50\%$.

#### 4. CONTRADICTED Claims
* "Zero regression risk" and "guaranteed architectural isolation". (Introducing WebGL/Three.js adds +550 KB bundle size, WebGL canvas fallback requirements, and GPU context lost handling).

#### 5. UNKNOWN Claims
* User task completion time improvements under 3D camera projection versus 2D focus/filter tools.
* Reduced cognitive load during architecture dependency tracing.

---

## 4. Current Graph Contract

Audited directly against `audit-fixtures/cloud-spend-tracker/explorer-data.json` (SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`):

| Property | Existing Report Claim | Current Code Verification | Status |
| :--- | ---: | ---: | :--- |
| **Total Nodes** | 240 | 240 | `CURRENT VERIFIED` |
| **Total Edges** | 1,024 | 1,024 | `CURRENT VERIFIED` |
| **Presentation Layer** | 26 | 26 | `CURRENT VERIFIED` |
| **Application Layer** | 50 | 50 | `CURRENT VERIFIED` |
| **Domain Layer** | 32 | 32 | `CURRENT VERIFIED` |
| **Schema Layer** | 132 | 132 | `CURRENT VERIFIED` |
| **ApexClass Count** | 79 | 79 | `CURRENT VERIFIED` |
| **CustomField Count** | 63 | 63 | `CURRENT VERIFIED` |
| **External Count** | 59 | 59 | `CURRENT VERIFIED` |
| **LWC Count** | 26 | 26 | `CURRENT VERIFIED` |
| **CustomObject Count** | 10 | 10 | `CURRENT VERIFIED` |
| **ApexTrigger Count** | 3 | 3 | `CURRENT VERIFIED` |
| **Discovered Features** | 13 | 13 | `CURRENT VERIFIED` |

---

## 5. Current Position Authority

```text
       Layout Engine (architecture-layout.ts)
             ↓ Computes (X, Y) Level 4
       Position Policy (position-policy.ts)
             ↓ Evaluates Priority 1–5
       2D Canvas Renderer (GraphView.tsx)
             ↓ Renders preset Cytoscape elements
       Browser-Visible Canvas Coordinates (X, Y)
             ↓ Persists Level 1/2
       Project Store (projectState.ts nodePositions)
```

### 3D Projection Compatibility
* **2D Supremacy**: 2D $(X,Y)$ coordinates generated by `architecture-layout.ts` and managed by `position-policy.ts` remain the authoritative spatial foundation.
* **Derived Z Coordinate**: $Z_i$ is computed purely downstream as $Z_i = f(\text{node}_i)$.
* **State Neutrality**: Toggling 3D view mode makes **zero writes** to `GraphLayoutState.nodePositions`.

---

## 6. Current 2D Layout Evidence

### A. Physical Node Geometry
* **Minimum Node Clearance**: Strictly $\ge 40.0\text{px}$ enforced via `minimumNodeClearance` in `explorer/src/lib/layout/metrics.ts` with $1\text{e-}3$ epsilon normalization.
* **Node Overlaps**: 0 primary overlaps, 0 satellite overlaps.

### B. Edge Crossing Decomposition
On canonical Candidate E (`enableFeatureLayout: true`):
* $C_{pp}$ (Primary-Primary): 8,704
* $C_{ps}$ (Primary-Satellite): 41,590
* $C_{ss}$ (Satellite-Satellite): 41,544
* $C_{pb}$ (Primary-Bridge): 2,594
* $C_{bb}$ (Bridge-Bridge): 230
* **$C_{total}$ (Total Geometric Crossings)**: **94,662**

---

## 7. Crossing Metric Audit

### Critical Evaluation of 94,662 Crossings
1. **Mathematical Accuracy**: The equation $C_{total} \equiv C_{pp} + C_{ps} + C_{ss} + C_{pb} + C_{bb}$ is strictly enforced by self-auditing assertions in `metrics.ts`.
2. **Satellite Crossing Dominance**: Satellite-to-primary ($C_{ps} = 41,590$) and satellite-to-satellite ($C_{ss} = 41,544$) account for **87.82%** of all geometric crossings.
3. **Metric vs. Perception**: Geometric segment intersections count every line-to-line intersection in 2D coordinate space. However, in Cytoscape 2D rendering:
   - Faded edge opacity reduces visual clutter.
   - Neighborhood focus and hover highlighting isolate active dependency paths.
   - Users rarely view the entire 240-node un-zoomed canvas at once.
4. **Audit Finding**: High 2D geometric edge crossings prove **planar mathematical overlap**, but do **not** prove that end-users cannot navigate the graph using existing focus controls.

---

## 8. Current Problem Validation

| Claimed Problem | Current Evidence | Reproducible? | User-Visible? | Could 3D Address? | Could 2D Address? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **High Satellite Crossing Density** | $C_{ps}+C_{ss} = 83,134$ | Yes (Deterministic) | Yes (Dense web) | Yes (Z-elevation) | Yes (Edge bundling) |
| **Vertical Canvas Height** | Height ~12,760px | Yes (Stage 11 bounds) | Yes (Scroll distance) | Yes (Z-stacking) | Yes (Aspect ratio tuning) |
| **Shared Utility Ambiguity** | Long inter-feature edges | Yes (High fan-in nodes) | Yes (Cross-cutting lines) | Yes (Z-recession) | Yes (Color/Grouping) |
| **Transitive Path Tracing** | Spans 4 layer bands | Yes (Multi-step edges) | Yes (Viewport panning) | Yes (3D arc paths) | Yes (Path highlighting) |

---

## 9. Z-Model Audit

| Model | Semantic Basis | Deterministic | Stable | Problem Addressed | Main Risk | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Model A (Layer Stack)** | $Z = \text{Layer Elevation}$ | 100% | High | Layer Separation | Visual occlusion | `FEASIBLE` |
| **Model B (Role Elevation)** | $Z = \text{Feature Role}$ | 100% | High | Satellite Crossings | Depth ambiguity | `FEASIBLE` |
| **Model C (Centrality Depth)** | $Z = \text{Hub Score}$ | 100% | Medium | System Criticality | Visual distortion | `SECONDARY` |

---

## 10. 2D-Derived 3D Architecture Audit

The proposed **Option 1 (2D-Derived 3D Projection)** architecture:

```text
Canonical Graph → 2D Layout Engine → Authoritative (X, Y) → Deterministic Z → WebGL 3D Viewport
```

### Architectural Verification
* **Is Isolation Clean?**: **YES**. 3D viewport receives read-only props `(nodes, edges, nodePositions)`.
* **Are Interaction Handlers Affected?**: **NO**. 2D Cytoscape interactions remain intact when 2D mode is active.
* **Hidden Coupling Risks**:
  - WebGL context loss recovery.
  - Syncing selected node state between 2D panel inputs and 3D raycaster clicks.

---

## 11. Performance / Runtime Audit

| Performance Target | Status | Reality Check |
| :--- | :--- | :--- |
| **$\ge 60\text{ FPS}$ Render Rate** | `PROPOSED TARGET` | Feasible for 240 nodes in WebGL; unverified on lower-end integrated GPUs. |
| **$< 100\text{ ms}$ Initial Render** | `PROPOSED TARGET` | Instanced mesh allocation is fast, but WebGL shader compilation adds 50–150ms on first boot. |
| **$< +50\text{ MB}$ GPU VRAM** | `PROPOSED TARGET` | Expected VRAM footprint for Three.js scene context is ~35–60 MB. |

---

## 12. Regression-Risk Audit

The claim of "zero regression risk" is **REJECTED** as overly optimistic. Concrete risks identified:

1. **Bundle Size Expansion**: Adding Three.js / R3F adds **~550 KB** uncompressed JS to client bundle.
2. **WebGL Fallback Hazard**: Clients without WebGL 2.0 hardware acceleration fail to render 3D views.
3. **Raycasting Overhead**: Mouse hover testing via `THREE.Raycaster` on 1,024 3D line meshes requires spatial indexing to prevent UI thread stutter.
4. **Label Readability**: 3D rotated text becomes illegible; screen-aligned 2D billboard HTML overlays are strictly required.

---

## 13. Experimental Threshold Audit

| Threshold | Source | Classification | Action |
| :--- | :--- | :--- | :--- |
| **$> 50\%$ Crossing Reduction** | Candidate Report | `PROPOSED EXPERIMENTAL TARGET` | Validate in prototype |
| **$< 15\%$ Node Occlusion** | Candidate Report | `PROPOSED EXPERIMENTAL TARGET` | Validate in prototype |
| **$\ge 60\text{ FPS}$ Frame Rate** | Candidate Report | `PROPOSED EXPERIMENTAL TARGET` | Validate in prototype |
| **$< 100\text{ ms}$ Render Latency** | Candidate Report | `PROPOSED EXPERIMENTAL TARGET` | Validate in prototype |

---

## 14. Internal Contradictions

1. **Metric Discrepancy**: Candidate report cited $C_{total} = 94,661$, whereas frozen Phase 11/12 baseline is $94,662$ and Phase 8 ordering yields $85,367$.
2. **Zero Regression vs. WebGL Dependencies**: Claiming zero risk while introducing WebGL rendering engines and +550 KB bundle footprint is contradictory.
3. **Geometric Crossings vs. User Comprehension**: Equating planar line intersections ($C_{total} = 94,662$) with user disorientation without user testing evidence.

---

## 15. Evidence Matrix

| Claim / Topic | Classification | Current Evidence Source | Confidence | Action |
| :--- | :--- | :--- | :--- | :--- |
| **Graph Topology (240/1024)** | `CURRENT VERIFIED` | `explorer-data.json` | High | `RETAIN` |
| **2D Clearance $\ge 40.0\text{px}$** | `CURRENT VERIFIED` | `metrics.ts` | High | `RETAIN` |
| **Candidate E $C_{total} = 94,662$** | `CURRENT VERIFIED` | `Phase11ReleaseHardening.test.ts` | High | `CORRECT` |
| **Option 1 Projection Isolation** | `CURRENT VERIFIED` | `position-policy.ts` | High | `RETAIN` |
| **Model B Role Z-Elevation** | `PROPOSED` | Candidate 3D Design | Medium | `EXPERIMENTALLY TEST` |
| **Zero Regression Claim** | `CONTRADICTED` | Bundle / WebGL Analysis | High | `CORRECT / REMOVE` |
| **User Task Speedup in 3D** | `UNKNOWN` | Untested UX | Low | `DEFER TO PROTOTYPE` |

---

## 16. Remaining Evidence Gaps

Before authorizing production 3D integration, the following evidence gaps must be closed via an isolated feasibility prototype:

1. **Screen-Space Crossing Reduction**: Empirical measurement of visible screen crossings $C_{proj}(\theta)$ at camera angle $\theta = (45^\circ, 45^\circ)$.
2. **Camera Occlusion Metrics**: GPU/Raycast measurement of node occlusion ratios across Presets 1–4.
3. **User Task Completion Benchmarks**: Comparative user testing (2D focus mode vs 3D perspective orbit) for transitive dependency tracing tasks.

---

## 17. Decision-Readiness Assessment

```text
STATUS: READY ONLY AFTER SPECIFIC EVIDENCE GAPS ARE CLOSED
```

### Assessment Rationale
1. **Technical Feasibility**: High. Option 1 (2D-Derived 3D Projection) is clean, deterministic, and preserves 2D Position Authority.
2. **Evidenced 2D Problem**: Moderate. Geometric satellite crossings ($87.8\%$) exist in 2D, but existing focus/filter tools already mitigate visual clutter.
3. **Missing Empirical Evidence**: Projected crossing reduction, camera occlusion ratios, and user cognitive speedup remain unmeasured hypotheses.

---

## 18. Exact Conditions Required Before Prototype Authorization

To responsibly authorize an isolated 3D prototype (`Phase 3D-PROTO`), the project must enforce the following guardrails:

1. **Strict Guardrail 1 (Zero Production Edits)**: Zero changes to `architecture-layout.ts`, `position-policy.ts`, `GraphView.tsx`, or production stylesheets.
2. **Strict Guardrail 2 (Isolated Component)**: Prototype implemented strictly inside an isolated experimental file (`explorer/src/components/experimental/GraphView3D.tsx`).
3. **Strict Guardrail 3 (Feature Flag Gated)**: Mounted exclusively behind an explicit feature flag (`enable3DPrototype: false` default).
4. **Strict Guardrail 4 (Quantitative Evaluation Gate)**: Prototype must measure actual $C_{proj}(\theta)$, $O_{ratio}(\theta)$, and FPS to prove value before any production integration discussion.
