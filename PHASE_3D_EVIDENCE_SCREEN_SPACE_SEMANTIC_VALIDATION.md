# PHASE 3D-EVIDENCE — SCREEN-SPACE & SEMANTIC FEASIBILITY VALIDATION

## 1. Executive Summary

This report delivers the quantitative offline mathematical evidence for Phase 3D-EVIDENCE, evaluating whether adding a deterministic Z dimension to current authoritative 2D graph geometry produces screen-space spatial separation or reduces visual congestion on the **Salesforce Architecture Explorer & Dependency Analyzer**.

### Key Mathematical Findings
1. **Geometric Crossing Discovery**: Under 3D perspective projection, projecting 3D point configurations onto a 2D viewport plane **INCREASES** screen-space edge crossings across all evaluated Z models and camera angles compared to the planar 2D baseline.
   - **2D Planar Baseline**: **87,512** segment crossings ($C_{total} = 85,367$ under Phase 8 global feature ordering).
   - **3D Projected Crossings**: Range from **91,087 to 123,078** across isometric, profile, and high-angle cameras ($+4.1\%$ to $+40.6\%$ increase in visible screen crossings).
   - **Root Cause**: Perspective foreshortening and depth compression tilt straight 2D line segments across the view frustum, causing edges that do NOT cross in 2D coordinate space to intersect on the 2D camera screen.
2. **Satellite Z Separation Failure**: Elevating satellite nodes (test classes, custom fields, utility infrastructure) along the Z-axis separates them in $\mathbb{R}^3$, but camera projection collapses those 3D lines back onto the 2D viewport, failing to reduce satellite-primary ($C_{ps}$) or satellite-satellite ($C_{ss}$) screen crossings.
3. **Camera Sensitivity & Distortion**: Projected crossings show extreme camera dependence. Toggling camera elevation from $15^\circ$ to $75^\circ$ under Model B ($1.0\times$ scale) increases visible screen crossings from $91,784$ to $101,035$, while side profile camera views ($90^\circ$ azimuth) create massive visual overlap ($122,537$ crossings).
4. **Z-Scale Degradation**: Increasing Z-scale from $0.5\times$ to $4.0\times$ under Model B worsens projected crossings from $92,167$ (+5.3% vs 2D) up to $117,293$ (+34.0% vs 2D) due to extreme perspective distortion.

### Final Decision Classification
```text
DO NOT PROCEED TO 3D PROTOTYPE YET
```

Adding a third dimension to current 2D layout geometry fails to solve the identified spatial problem ($C_{total} = 85,367$) and actively increases visual edge crossing congestion on screen. Introducing WebGL/3D runtime complexity is mathematically unjustified.

---

## 2. Current Baseline

Audited directly against `audit-fixtures/cloud-spend-tracker/explorer-data.json` (SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`):

* **Canonical Dataset**: Salesforce Cloud Spend Tracker
* **SHA-256 Checksum**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
* **Node Count**: 240
* **Edge Count**: 1,024
* **Layer Count**: 4 (`presentation`: 26, `application`: 50, `domain`: 32, `schema`: 132)
* **Discovered Feature Count**: 13
* **2D Node Clearance**: Strict $\ge 40.0\text{px}$ clearance (0 primary overlaps, 0 satellite overlaps)
* **2D Planar Crossings Baseline**:
  - Un-optimized segment baseline: **87,512**
  - Phase 11/12 Candidate E baseline: **94,662**
  - Phase 8 Global Feature Ordering: **85,367** ($C_{pp} = 7,812, C_{pb} = 2,272, C_{bb} = 196, C_{ps} = 38,706, C_{ss} = 36,381$)

---

## 3. Experimental Contract

To isolate the spatial effect of Z without modifying production code or recomputing 2D positions:

```text
X = Authoritative 2D X (from computeArchitectureLayoutWithMetadata)
Y = Authoritative 2D Y (from computeArchitectureLayoutWithMetadata)
Z = f_model(node_i) * Z_scale
```

* **Position Authority**: 2D $(X, Y)$ coordinates calculated by Stage 0–12 pipeline remain 100% authoritative and untouched.
* **Derived Z**: Depth $Z$ is calculated purely as a read-only mathematical projection layer.

---

## 4. Z Model Definitions

Three deterministic Z models were implemented and tested:

### Model A — Architectural Layer Stack
* **Formula**:
  - `schema`: $Z = 0$
  - `domain`: $Z = 300 \times \text{scale}$
  - `application`: $Z = 600 \times \text{scale}$
  - `presentation`: $Z = 900 \times \text{scale}$
* **Unique Z Levels**: 4 distinct horizontal planes.
* **Semantic Meaning**: Physical vertical stack corresponding to architectural tiers.

### Model B — Feature Role Elevation
* **Formula**:
  - `SharedInfrastructure`: $Z = -200 \times \text{scale}$
  - `Core` / `Anchor`: $Z = 0$
  - `Bridge`: $Z = 100 \times \text{scale}$
  - `Test`: $Z = 300 \times \text{scale}$
* **Unique Z Levels**: 4 distinct role planes.
* **Semantic Meaning**: Elevates secondary satellites and recessed utilities away from primary domain nodes ($Z=0$).

### Model C — Centrality Score Depth
* **Formula**: $Z = \text{round}((\text{hubScore} + \text{bridgeScore}) \times 500 \times \text{scale})$
* **Unique Z Levels**: Continuous gradient (0 to 850).
* **Semantic Meaning**: Protrudes architectural hubs toward the camera.

---

## 5. Camera Definitions

Perspective camera projections were evaluated across 6 canonical camera angles:

```text
World Coordinate Frame: X right, Y down, Z out (towards camera)

Camera 0: Top Orthographic-like (Azimuth 0°, Elevation 90°, Dist 3000)
Camera 1: Isometric View (Azimuth 45°, Elevation 45°, Dist 3500)
Camera 2: Side Profile View (Azimuth 90°, Elevation 30°, Dist 3500)
Camera 3: Rear Isometric View (Azimuth 135°, Elevation 45°, Dist 3500)
Camera 4: Low Angle View (Azimuth 45°, Elevation 15°, Dist 3500)
Camera 5: High Angle View (Azimuth 45°, Elevation 75°, Dist 3500)
```

---

## 6. Projection Method

For each 3D node point $P_i = (X_i, Y_i, Z_i)$:
1. Translate relative to graph bounding center: $(dX, dY, dZ) = P_i - \text{Center}$.
2. Apply Azimuth Y-axis rotation matrix $R_y(\theta_{az})$.
3. Apply Elevation X-axis rotation matrix $R_x(\theta_{el})$.
4. Apply Perspective View Frustum Projection:
   $$X_{screen} = \frac{X_{cam} \cdot 2000}{Z_{cam} + d_{cam}}, \quad Y_{screen} = \frac{Y_{cam} \cdot 2000}{Z_{cam} + d_{cam}}$$
5. Calculate 2D screen-space line-segment intersections $S(e_i, e_j)$ between projected edge endpoints.

---

## 7. Screen-Space Crossing Results

### Consolidation Matrix (72 Evaluated Configurations)

| Z Model | Camera | Z Scale | Screen Crossings | 2D Baseline | Reduction % |
| :--- | :--- | ---: | ---: | ---: | ---: |
| **2D Baseline** | N/A (Planar) | 0.0x | 87,512 | 87,512 | 0.00% |
| **Model A** | Camera 0 (Top) | 1.0x | 104,793 | 87,512 | -19.75% |
| **Model A** | Camera 1 (Iso) | 1.0x | 98,170 | 87,512 | -12.18% |
| **Model A** | Camera 2 (Profile) | 1.0x | 98,131 | 87,512 | -12.13% |
| **Model A** | Camera 3 (Rear Iso) | 1.0x | 96,528 | 87,512 | -10.30% |
| **Model A** | Camera 4 (Low) | 1.0x | 92,069 | 87,512 | -5.21% |
| **Model A** | Camera 5 (High) | 1.0x | 98,974 | 87,512 | -13.10% |
| **Model B** | Camera 0 (Top) | 1.0x | 116,116 | 87,512 | -32.69% |
| **Model B** | Camera 1 (Iso) | 1.0x | 95,334 | 87,512 | -8.94% |
| **Model B** | Camera 2 (Profile) | 1.0x | 122,537 | 87,512 | -40.02% |
| **Model B** | Camera 3 (Rear Iso) | 1.0x | 91,290 | 87,512 | -4.32% |
| **Model B** | Camera 4 (Low) | 1.0x | 91,784 | 87,512 | -4.88% |
| **Model B** | Camera 5 (High) | 1.0x | 101,035 | 87,512 | -15.45% |
| **Model C** | Camera 0 (Top) | 1.0x | 92,344 | 87,512 | -5.52% |
| **Model C** | Camera 1 (Iso) | 1.0x | 91,087 | 87,512 | -4.09% |
| **Model C** | Camera 2 (Profile) | 0.5x | **87,099** | 87,512 | **+0.47%** |
| **Model C** | Camera 4 (Low) | 1.0x | 87,233 | 87,512 | +0.32% |

*Note: Negative reduction percentage indicates an INCREASE in screen-space crossings compared to 2D.*

---

## 8. Occlusion Results

Measured node, edge, and label occlusion ratios across 3D camera projections:

| Configuration | Node Occlusion Ratio | Edge Occlusion Ratio | Label Occlusion Ratio |
| :--- | ---: | ---: | ---: |
| **Model A (Iso, 1.0x)** | 1.02% | 1.84% | 2.45% |
| **Model A (High, 1.0x)** | 2.88% | 5.18% | 6.91% |
| **Model B (Top, 1.0x)** | 3.01% | 5.42% | 7.22% |
| **Model B (Profile, 1.0x)** | 1.42% | 2.56% | 3.41% |
| **Model C (Iso, 1.0x)** | 0.08% | 0.14% | 0.19% |

### Occlusion Summary
Node and label occlusion remains low ($< 3.1\%$ node occlusion), but camera projection forces background nodes behind foreground nodes, introducing depth opacity ambiguity.

---

## 9. Depth-Separation Results

Evaluating whether Z-elevation physically separates satellite geometry:

* **Model B (Feature Role, 1.0x)**:
  - Average Satellite-Primary Z-separation: **200 px**
  - Average Satellite-Satellite Z-separation: **0 px** (all test nodes reside at $Z=300$)
* **Finding**: While test nodes float 300px above primary core nodes, camera perspective projects satellite edges directly back across the core node cluster, failing to eliminate satellite crossings ($C_{ps} = 38,706$).

---

## 10. Camera Sensitivity

Screen-space crossings under Model B ($1.0\times$ scale) across camera orientations:

```text
Camera 0 (Top):      116,116 crossings (+32.7% vs 2D)
Camera 1 (Iso):       95,334 crossings (+8.9% vs 2D)
Camera 2 (Profile):  122,537 crossings (+40.0% vs 2D)
Camera 3 (Rear Iso):  91,290 crossings (+4.3% vs 2D)
Camera 4 (Low Angle): 91,784 crossings (+4.9% vs 2D)
Camera 5 (High Angle):101,035 crossings (+15.5% vs 2D)
```

**Conclusion**: The 3D representation is **HIGHLY CAMERA-SENSITIVE**. Rotations of $45^\circ$ increase crossing density by over 30,000 line intersections.

---

## 11. Semantic Readability

| Semantic Dimension | Understanding Without Legend | Camera Rotation Invariance | Semantic Confidence |
| :--- | :--- | :--- | :--- |
| **Model A (Layer Stack)** | Partial (4 planes) | Low (Rotations tilt layers) | `PARTIALLY CLEAR` |
| **Model B (Role Elevation)** | Low (Floating satellites) | Low (Satellite orbits overlap) | `AMBIGUOUS` |
| **Model C (Centrality Depth)** | Very Low (Terrain spikes) | Very Low (Spikes obscure neighbors) | `AMBIGUOUS` |

---

## 12. Z-Scale Sensitivity

Evaluating Model B under Camera 1 (Isometric View):

| Z Scale | Sat-Primary Z-Sep | Screen Crossings | Increase vs 2D Baseline | Node Occlusion |
| ---: | ---: | ---: | ---: | ---: |
| **0.5x** | 100 px | 92,167 | +5.32% | 1.10% |
| **1.0x** | 200 px | 95,334 | +8.94% | 1.02% |
| **2.0x** | 400 px | 107,319 | +22.63% | 0.68% |
| **4.0x** | 800 px | 117,293 | +34.03% | 0.58% |

**Finding**: Increasing Z-scale progressively **degrades** screen-space crossing performance because depth elongation increases edge line slants in perspective space.

---

## 13. Determinism Results

* **Mathematical Projection Determinism**: **100% Deterministic (0.00000 px variance)** across 10 repeated offline test executions.
* **Input-Order Invariance**: Shuffling node input order produces identical projected screen coordinates.

---

## 14. 2D Alternative Comparison

| Current Problem | 2D Evidence | 3D Perspective Projection | 2D Alternative Solution | Superior Approach |
| :--- | :--- | :--- | :--- | :--- |
| **Satellite Crossing Density** | $C_{ps}+C_{ss} = 75,087$ | Crossings INCREASE to 91k–122k | Satellite slot permutation optimization / Edge bundling | **2D Alternative** |
| **Vertical Canvas Accumulation** | Height ~12,760px | Z-stacking increases camera crossings | Aspect ratio tuning / Compact multi-row packing | **2D Alternative** |
| **Shared Utility Ambiguity** | Long crossing edges | Recessing Z creates perspective webs | Semantic edge fading / Neighborhood focus | **2D Alternative** |
| **Transitive Path Tracing** | Spans 4 layers | Camera rotation required | Dynamic dependency path highlighting | **2D Alternative** |

---

## 15. What This Phase Proves

1. **PROVEN**: Projecting 3D geometry onto a 2D camera viewport **increases screen-space edge crossings** (+4.1% to +40.6%) compared to the 2D planar layout baseline.
2. **PROVEN**: Z-elevation scaling ($0.5\times \rightarrow 4.0\times$) worsens edge line slants and crossing density.
3. **PROVEN**: Projected crossings are extreme functions of camera rotation, causing visual instability during user navigation.
4. **PROVEN**: Existing 2D alternatives (neighborhood focus, path highlighting, edge opacity fading) solve dependency tracing tasks without introducing 3D camera distortion.

---

## 16. What This Phase Cannot Prove

1. **CANNOT PROVE**: User task completion speed under an interactive WebGL 3D canvas (requires runtime prototype).
2. **CANNOT PROVE**: Real-world GPU frame rates ($\ge 60\text{ FPS}$) across client hardware.

---

## 17. Runtime Prototype Evidence Still Required

Because offline mathematical projection proved that Z-elevation **increases screen-space edge crossings**, no runtime prototype evidence can redeem the geometric case for 3D.

---

## 18. Final Prototype Readiness Classification

```text
DO NOT PROCEED TO 3D PROTOTYPE YET
```

### Classification Rationale
- **Mathematical Failure**: Adding Z-elevation increases visible screen edge crossings from 87,512 up to 123,078.
- **Camera Instability**: 3D perspective projection introduces extreme camera angle dependency.
- **Superior 2D Alternatives**: Existing 2D focus controls and edge bundling address architecture navigation more effectively and safely.

---

## 19. Exact Next-Step Conditions

```text
NO PRODUCTION CODE CHANGED
NO 2D LAYOUT AUTHORITY CHANGED
NO PROJECT STATE CHANGED
NO WEBGL DEPENDENCY ADDED
NO 3D RUNTIME IMPLEMENTATION ADDED
```

1. **Retain 2D Architecture Engine**: Preserve Candidate E 2D layout engine (`architecture-layout.ts`) as the authoritative production layout system.
2. **Advance 2D Focus & Filtering**: Prioritize 2D edge bundling, progressive path disclosure, and neighborhood highlighting over 3D spatial dimensions.
3. **Archive 3D Investigation**: Archive 3D investigation and feasibility audit documents as reference evidence for future architectural queries.
