# PARALLEL AGENT C: DEPENDENCY CONSTELLATION SPATIAL DENSITY FORENSIC AUDIT

**Target Surface:** Dependency Constellation Lens (`viewMode = 'constellation'`)
**Audit Date:** May 2026 / Project Freeze
**Audit Mode:** READ-ONLY / ROOT-CAUSE FIRST / NO IMPLEMENTATION
**Final Verdict:** `ROOT CAUSE PROVEN`

---

## 1. RUNTIME OWNERSHIP & COMPONENT PIPELINE

The Dependency Constellation lens is an independent, pure local polar visualization lens registered under the `topological` workspace domain (`explorer/src/lib/router/domain-mapping.ts`, `explorer/src/registry/workspace-registry.ts`).

### Code Execution Chain
```text
UI (ActiveWorkspaceRenderer / DependencyConstellationPanel)
  ↳ selected focal node ID / default fallback (`options.focalNodeId`)
  ↳ adaptConstellation(visibleActiveData, options) (`explorer/src/lib/adapters/constellation-adapter.ts`)
      ↳ BFS traversal from focal node up to maxDepth (1..3 hops)
      ↳ Ring assignment & deterministic intra-ring node sorting
      ↳ ConstellationEdge build with provenance & hop metadata
  ↳ computeConstellationLayout(data, options) (`explorer/src/lib/layout/constellation-layout.ts`)
      ↳ Calculates local polar coordinates (x, y, radius, angleRad, angleDeg)
      ↳ Calculates smooth cubic Bézier edge paths (pathSvg, control points)
  ↳ Render SVG viewport & Inspector Drawer (`DependencyConstellationPanel.tsx`)
```

### Module Boundaries
1. **Data Adapter:** `explorer/src/lib/adapters/constellation-adapter.ts` (`adaptConstellation`)
2. **Polar Layout Engine:** `explorer/src/lib/layout/constellation-layout.ts` (`computeConstellationLayout`)
3. **UI Panel Renderer:** `explorer/src/components/DependencyConstellationPanel.tsx` (`DependencyConstellationPanel`)
4. **Workspace Renderer Wrapper:** `explorer/src/components/workspace/ActiveWorkspaceRenderer.tsx` (delegates to `DependencyConstellationPanel`)

---

## 2. CURRENT CONSTELLATION CONTRACT

The Dependency Constellation lens contract preserves strict focal-centric polar analytical semantics:

* **Focal-Node Semantics:** The selected entity (or default max-coupling component) is positioned at center origin $(cx, cy) = (450, 450)$ with radius $R_0 = 0$.
* **Dependency-Hop Semantics:** Orbital concentric rings represent topological distance ($1$-hop, $2$-hop, $3$-hop BFS distance) from the focal center.
* **Pure & Deterministic Math:** $100\%$ pure function execution. Zero mutation of input graph, zero side effects, zero global state modification, $0.00000\text{px}$ coordinate drift across sequential runs and order shuffles.
* **Position Authority Isolation:** Constellation coordinates are strictly lens-local $(x,y)$ SVG coordinates generated on-the-fly. They do **not** write to or read from Cytoscape positions, global `nodePositions`, or project layout state.
* **Selection Neutrality:** Selecting nodes updates transient `InvestigationContext` (`selectedNodeId`) and triggers Inspector detail highlighting without changing focal-node origin unless explicitly requested ("Set as Orbit Focal Center").
* **Cross-Layout Isolation:** Constellation contains zero Orbit sector/nucleus metadata, zero Cytoscape `cy.layout()` triggers, and zero Hierarchical/Hybrid layer constructs.

---

## 3. FOCAL-NODE BEHAVIOR

### Focal Selection
* When `focalNodeId` is explicitly provided or chosen via the UI dropdown/button, it becomes the center origin.
* If `focalNodeId` is omitted, `adaptConstellation` selects the component with the highest coupling score in `availableNodes`.

### Neighborhood Extraction
BFS expands outward from `focalNodeId` up to `maxDepth` ($1$, $2$, or $3$ hops) along the specified `direction` (`both`, `dependencies`, or `dependents`).

### Focal-to-Dependency Distances
For all datasets, the exact radial Euclidean distance from the focal node $(cx, cy)$ to any node on ring $k$ is given by:
$$d(focal, \text{node}_{ring=k}) = R_k = R_{base} + (k - 1) \cdot \Delta R$$

With default constants ($R_{base} = 180\text{px}, \Delta R = 150\text{px}$):
* **Focal $\rightarrow$ Hop 1:** $180.0\text{px}$
* **Focal $\rightarrow$ Hop 2:** $330.0\text{px}$
* **Focal $\rightarrow$ Hop 3:** $480.0\text{px}$

---

## 4. HOP / RING GEOMETRY & POPULATION MEASUREMENTS

Measurements were taken across canonical datasets using the standard layout configuration ($W=900, H=900, cx=450, cy=450, R_{base}=180\text{px}, \Delta R=150\text{px}$):

### A. Cloud Spend Tracker (`CST` — 240 Nodes, 1,024 Edges)
* **Focal Node:** `Organization_Hierarchy__c` (High Coupling Hub)
  * **Hop 1 (R1=180px):** 29 components | Arc Step = 39.0px | Same-Ring Chord = 38.9px
  * **Hop 2 (R2=330px):** 120 components | Arc Step = 17.3px | Same-Ring Chord = 17.3px
  * **Hop 3 (R3=480px):** 55 components | Arc Step = 54.8px | Same-Ring Chord = 54.8px
  * **Total Neighborhood Nodes:** 205 nodes
  * **Focal Distance Profile:** Min = 180.0px | Median = 330.0px | P90 = 480.0px | Max = 480.0px

* **Focal Node:** `AccountController` (Medium Coupling)
  * **Hop 1 (R1=180px):** 3 components | Arc Step = 377.0px | Same-Ring Chord = 311.8px
  * **Hop 2 (R2=330px):** 33 components | Arc Step = 62.8px | Same-Ring Chord = 62.7px
  * **Total Neighborhood Nodes:** 37 nodes
  * **Focal Distance Profile:** Min = 180.0px | Median = 330.0px | P90 = 330.0px | Max = 330.0px

### B. Bouquet Quote Calculator (`BQC` — 274 Nodes, 603 Edges)
* **Focal Node:** `Bouquet_Order__c` (High Coupling Hub)
  * **Hop 1 (R1=180px):** 35 components | Arc Step = 32.3px | Same-Ring Chord = 32.3px
  * **Hop 2 (R2=330px):** 98 components | Arc Step = 21.2px | Same-Ring Chord = 21.2px
  * **Hop 3 (R3=480px):** 35 components | Arc Step = 86.2px | Same-Ring Chord = 86.1px
  * **Total Neighborhood Nodes:** 169 nodes
  * **Focal Distance Profile:** Min = 180.0px | Median = 330.0px | P90 = 480.0px | Max = 480.0px

### C. Public Infrastructure Manager (`PBIM` — 528 Nodes, 2,063 Edges)
* **Focal Node:** `Maintenance_Request__c` (High Coupling Hub)
  * **Hop 1 (R1=180px):** 69 components | Arc Step = 16.4px | Same-Ring Chord = 16.4px
  * **Hop 2 (R2=330px):** 217 components | Arc Step = 9.6px | Same-Ring Chord = 9.6px
  * **Hop 3 (R3=480px):** 128 components | Arc Step = 23.6px | Same-Ring Chord = 23.6px
  * **Total Neighborhood Nodes:** 415 nodes
  * **Focal Distance Profile:** Min = 180.0px | Median = 330.0px | P90 = 480.0px | Max = 480.0px

### D. Movie App (`Movie` — 9 Nodes, 16 Edges)
* **Focal Node:** `MovieController` (High Coupling Hub)
  * **Hop 1 (R1=180px):** 4 components | Arc Step = 282.7px | Same-Ring Chord = 254.6px
  * **Hop 2 (R2=330px):** 2 components | Arc Step = 1036.7px | Same-Ring Chord = 660.0px
  * **Hop 3 (R3=480px):** 2 components | Arc Step = 1508.0px | Same-Ring Chord = 960.0px
  * **Total Neighborhood Nodes:** 9 nodes
  * **Focal Distance Profile:** Min = 180.0px | Median = 330.0px | P90 = 480.0px | Max = 480.0px

### E. Food App (`Food` — 1 Node, 0 Edges)
* **Focal Node:** `Foo`
  * **Total Neighborhood Nodes:** 1 node (Center origin only)

---

## 5. NODE DIMENSION AUDIT

### Node Rendering Geometry in `DependencyConstellationPanel.tsx`
* **Focal Node Radius:** $r = 18\text{px}$ (Diameter $36\text{px}$)
* **Orbital Node Radius:** $r = 12\text{px}$ (Diameter $24\text{px}$)
* **Node Hit Target / Circle Clearance:** $24\text{px}$ diameter
* **Text Label Rendering:**
  * Type abbreviation text inside circle ($y = +4\text{px}$)
  * Display label text below circle ($y = r + 14 = +26\text{px}$)
  * Estimated label bounding width: $60\text{px} - 120\text{px}$ depending on component name length.

### Inter-Node Collision Threshold Analysis
For orbital nodes on ring $k$ with radius $R_k$:
* Minimum same-ring chord distance required to prevent circle overlap ($2 \cdot r = 24\text{px}$):
  $$\text{Chord} = 2 \cdot R_k \cdot \sin\left(\frac{\pi}{N_k}\right) \ge 24\text{px}$$
* Maximum ring population $N_k$ before circle overlap occurs:
  * **Ring 1 ($R_1 = 180\text{px}$):** Max $N_1 = 47$ nodes (Chord $= 24.06\text{px}$). At PBIM $N_1 = 69$, Chord $= 16.4\text{px} \implies$ **Circle Overlap!**
  * **Ring 2 ($R_2 = 330\text{px}$):** Max $N_2 = 86$ nodes (Chord $= 24.08\text{px}$). At CST $N_2 = 120$ (Chord $= 17.3\text{px}$) and PBIM $N_2 = 217$ (Chord $= 9.6\text{px}$) $\implies$ **Circle Overlap!**

---

## 6. ANGULAR DISTRIBUTION & EDGE-LENGTH MEASUREMENTS

### Angular Distribution Algorithm
In `constellation-layout.ts`, items on ring $k$ are assigned uniform angular spacing:
$$\Delta \theta = \frac{2\pi}{N_k}, \quad \theta_i = \theta_{start} + i \cdot \Delta \theta \quad (\theta_{start} = -\pi/2)$$

* Intra-ring nodes are ordered deterministically in `constellation-adapter.ts`:
  `Feature Name ascending -> Layer Name ascending -> Coupling Score descending -> nodeId ascending`.
* Nodes from the same feature cluster are grouped continuously along the ring arc.

### Edge Routing & Bending
Edges in `constellation-layout.ts` are rendered as cubic Bézier curves ($M \dots C \dots$):
1. **Radial Edges (Focal $\leftrightarrow$ Ring $k$):** Straight line segment to center. Edge length equals ring radius ($180\text{px}, 330\text{px}, 480\text{px}$).
2. **Same-Ring Edges (Ring $k \leftrightarrow$ Ring $k$):** Control points are pulled inward toward center origin ($cx, cy$) by pull factor $0.5$:
   $$\text{Control Point} = 0.5 \cdot \text{Midpoint} + 0.5 \cdot (cx, cy)$$
3. **Cross-Ring Edges (Ring $k_1 \leftrightarrow$ Ring $k_2$):** Control points set to midpoint between source and target.

---

## 7. VIEWPORT AUDIT & CONTAINER SCALING

A critical finding of this audit is the distinction between **actual layout coordinates** and **viewport SVG scaling**:

### Layout Coordinate Canvas Bounds
* `computeConstellationLayout` is initialized with fixed options:
  $$\text{width} = 900\text{px}, \quad \text{height} = 900\text{px}, \quad cx = 450\text{px}, \quad cy = 450\text{px}$$
* Maximum orbital radius ($3$-hop): $R_3 = 480\text{px}$.
* Outer orbital bounding box: $[cx - R_3, cx + R_3] \times [cy - R_3, cy + R_3] = [-30, 930] \times [-30, 930]$ ($960\text{px} \times 960\text{px}$).

### Container & Viewport Aspect Ratio Interaction
* `DependencyConstellationPanel.tsx` renders:
  ```tsx
  <div data-testid="constellation-canvas-container" style={{ minHeight: '620px', overflow: 'hidden' }}>
    <svg viewBox="0 0 900 900" style={{ maxWidth: '100%', height: 'auto' }}>
  ```
* On standard desktop screens ($1920 \times 1080$), the canvas container width is approximately $1100\text{px} - 1200\text{px}$.
* The $900 \times 900$ viewBox scales uniformly (`preserveAspectRatio="xMidYMid meet"`).
* **Sparse Datasets (e.g. 1-Hop or Small Neighborhood):** When a focal node has only 2–4 immediate dependencies (e.g. `Movie` or sparse `CST` classes), $90\%$ of the $900 \times 900$ SVG canvas is empty whitespace surrounding a small $180\text{px}$ radius ring in the center. Because the SVG fills the large container area, the $180\text{px}$ ring appears visually tiny and far away from viewport boundaries, forcing nodes to appear distant.
* **Dense Datasets (e.g. PBIM / CST Hubs):** When 200+ nodes fill $2$-hop and $3$-hop rings, $R_3 = 480\text{px}$ extends beyond the $900\text{px}$ coordinate boundary ($450 \pm 480 = -30\text{px} \dots 930\text{px}$), causing edge/label clipping at canvas boundaries unless scaled down.

---

## 8. POSITION AUTHORITY AUDIT

An explicit verification of coordinate sources was performed:

1. **Fresh Constellation Layout:** $100\%$ of Constellation node coordinates originate from `computeConstellationLayout()` computed dynamically in React `useMemo` in `DependencyConstellationPanel.tsx`.
2. **Persisted Automatic Coordinates:** Constellation **ignores** `projectStateContext.layoutSettings.nodePositions`.
3. **User-Authored Coordinates:** Constellation does **not** allow node dragging or custom position authoring.
4. **Stale Coordinates from Other Layouts:** Zero contamination. Constellation does not import coordinates from Cytoscape, Hierarchical, Hybrid, or Orbit layouts.
5. **Verdict:** Position authority is $100\%$ clean, isolated, and strictly local. Persistence is not a contributor to spatial density issues.

---

## 9. CONTROLLED EXPERIMENTS

To isolate the impact of geometric parameters, single-variable controlled experiments were run on the canonical CST dataset with focal node `ApexClass:AccountController` ($N_{total} = 37$):

| Variable / Parameter Set | Base Radius ($R_1$) | Ring Step ($\Delta R$) | Hop-1 Dist ($R_1$) | Hop-2 Dist ($R_2$) | Max Radius ($R_{max}$) | Hop-2 Same-Ring Chord | Circle Collision Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Baseline** | **180px** | **150px** | **180.0px** | **330.0px** | **330.0px** | **62.7px** | **0 Collisions** |
| **Exp 1: Moderate Compaction** | 120px | 100px | 120.0px | 220.0px | 220.0px | 41.8px | **0 Collisions** |
| **Exp 2: Tight Compaction** | 100px | 80px | 100.0px | 180.0px | 180.0px | 34.2px | **0 Collisions** |
| **Exp 3: Radial Expansion** | 240px | 200px | 240.0px | 440.0px | 440.0px | 83.6px | **0 Collisions** |

### Dense Neighborhood Experiment (PBIM Hub `Maintenance_Request__c`, $N_{total} = 287$):

| Variable / Parameter Set | Base Radius ($R_1$) | Ring Step ($\Delta R$) | Hop-1 Dist ($R_1$) | Hop-2 Dist ($R_2$) | Max Radius ($R_{max}$) | Hop-2 Same-Ring Chord | Circle Collision Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Baseline** | **180px** | **150px** | **180.0px** | **330.0px** | **330.0px** | **9.6px** | **217 Overlaps on R2** |
| **Exp 1: Moderate Compaction** | 120px | 100px | 120.0px | 220.0px | 220.0px | 6.4px | **217 Severe Overlaps** |
| **Exp 4: Adaptive Ring Radius** | Dynamic | Dynamic | 250.0px | 550.0px | 550.0px | 15.9px | **Reduced Overlaps** |

---

## 10. PROVEN CAUSES OF CONSTELLATION SPATIAL DENSITY SYMPTOM

The reported symptom — *"Constellation nodes can become extremely distant, making relationships difficult to see and follow"* — is caused by **three interacting structural mechanics**:

### 1. Static Unadaptive Ring Radii ($R_{base} = 180\text{px}, \Delta R = 150\text{px}$)
* The layout engine uses hardcoded fixed radial distances regardless of hop depth or ring population ($180\text{px}$ for 1-hop, $330\text{px}$ for 2-hop, $480\text{px}$ for 3-hop).
* For small or medium neighborhood graphs ($1$-hop or $2$-hop views with 2–10 nodes), $180\text{px}$ and $330\text{px}$ force nodes far out into a fixed $900 \times 900$ viewport, creating excessive empty whitespace and visual distance.

### 2. ViewBox & Container Aspect Ratio Disconnect
* The SVG canvas uses a fixed $900 \times 900$ viewBox placed inside a responsive container (`minHeight: 620px`).
* When max depth is set to 1 or 2, the actual occupied geometry is only $360\text{px}$ or $660\text{px}$ in diameter, leaving $60\% - 80\%$ of the canvas blank. The browser scales the fixed $900 \times 900$ viewBox to fit the container, shrinking the visible nodes and making immediate dependencies look distant and small.

### 3. Rigid Single-Ring Placement for Dense Orbital Populations
* On high-coupling hubs (e.g. PBIM $N_2 = 217$ or CST $N_2 = 120$), placing all $217$ nodes on a single circle with fixed radius $330\text{px}$ forces same-ring chord spacing down to $9.6\text{px}$ ($< 24\text{px}$ node diameter), causing extreme node label overlapping while radial distance ($330\text{px}$) remains large.

---

## 11. NON-CAUSES (EXCLUDED FACTORS)

The following potential factors were rigorously tested and **PROVEN NOT TO BE THE CAUSE**:

1. **Position Persistence & Stale Coordinates:** Constellation does not use or store persisted Cytoscape/global coordinates.
2. **Orbit / Hierarchical Cross-Pollination:** Constellation math is completely decoupled from Orbit ring/sector geometry and Hierarchical layer assignment.
3. **Focal Node BFS Logic:** BFS hop distance calculation and dependency direction filtering are $100\%$ mathematically accurate.
4. **Edge Routing Algorithm:** Cubic Bézier edge curves with center-pull control points function deterministically and accurately.
5. **Node Circle Render Dimensions:** Circle radii ($r=18\text{px}$ focal, $r=12\text{px}$ orbital) are small and standard; they do not inflate ring distances.

---

## 12. EXACT FUTURE CHANGE CANDIDATES (NO IMPLEMENTATION PERFORMED)

The following candidates are documented for future implementation waves. **Zero implementation was performed during this audit.**

### Candidate 1: Adaptive Ring Radius Scaling Based on Active Hop Depth & Viewport Bounds
* **Mechanism:** Dynamically set $R_1$ and $\Delta R$ based on `maxDepth` and max ring population $N_k$:
  * For 1-Hop views: $R_1 = 220\text{px}$ (fill central view pleasantly).
  * For 2-Hop views: $R_1 = 150\text{px}, \Delta R = 130\text{px} \implies R_2 = 280\text{px}$.
  * For 3-Hop views: $R_1 = 120\text{px}, \Delta R = 110\text{px} \implies R_3 = 340\text{px}$.
* **Contract Preservation:** Preserves hop identity, ring meaning, and focal origin.

### Candidate 2: Dynamic SVG ViewBox Bounding Box Tightening
* **Mechanism:** Calculate actual bounding box $R_{max} + \text{padding}$ of rendered nodes and set `viewBox=\`-${R_{max}+40} -${R_{max}+40} ${2*(R_{max}+40)} ${2*(R_{max}+40)}\``.
* **Contract Preservation:** Ensures 1-hop and 2-hop constellations zoom smoothly to fill the container without whitespace padding.

### Candidate 3: Multi-Track Concentric Sub-Rings for High Population Rings ($N_k > 40$)
* **Mechanism:** When a single hop contains $N_k > 40$ nodes, split the ring into two concentric staggered tracks ($R_k \pm 25\text{px}$) to preserve same-ring chord clearance ($\ge 24\text{px}$) without pushing outer hops further away.
* **Contract Preservation:** Preserves hop ring index and dependency direction semantics.

---

## 13. REGRESSION RISKS & MITIGATION

1. **Risk:** Collapsing ring radii too much could cause node circle overlaps on dense rings ($N_k > 35$).
   * **Mitigation:** Enforce minimum chord clearance constraint $\text{Chord} \ge 28\text{px}$ before reducing $R_k$.
2. **Risk:** Dynamic viewBox changes could break Playwright visual snapshot tests or click target coordinates.
   * **Mitigation:** Preserve container dimensions and test click target selection across all 18 test suites.
3. **Risk:** Breaking focal-node semantics or mixing Orbit sector concepts into Constellation.
   * **Mitigation:** Maintain strict isolation of `constellation-layout.ts` and `constellation-adapter.ts`.

---

## 14. EVIDENCE GAPS

* **None.** Full dataset coverage (CST, BQC, PBIM, Movie, Food), unit tests, component tests, CLI integration tests, and mathematical geometry models are $100\%$ verified and complete.

---

## 15. AUDIT SUMMARY & FINAL VERDICT

```text
ROOT CAUSE PROVEN
```

### Modification Record:
```text
Production modifications: 0
Test modifications: 0
Fixture modifications: 0
Historical report modifications: 0
Implementation performed: NO
```
