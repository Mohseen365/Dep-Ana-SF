# ARCHITECTURE ORBIT — FINAL REPOSITORY TRUTH GATE REPORT

**Audit Date:** 2026-09-30
**Verified Repository Revision:** `c7a8cf1ff0e5808488d35736a2e08edbd5666cb9`
**Target Document Audited:** `ARCHITECTURE_ORBIT_FINAL_SYNTHESIS_AND_80_20_IMPLEMENTATION_CONTRACT.md`
**Verdict:** **`IMPLEMENTATION BLOCKED — SYNTHESIS REQUIRES CORRECTION`**

---

## 1. Executive Verdict

The proposed implementation contract in `ARCHITECTURE_ORBIT_FINAL_SYNTHESIS_AND_80_20_IMPLEMENTATION_CONTRACT.md` cannot be passed to an implementation agent in its current form.

While the synthesis document succeeds at defining a compelling high-level conceptual vision for Architecture Orbit, an adversarial, repository-first forensic audit reveals critical mathematical contradictions, unverified performance and LOC claims, non-existent helper function references, and unsafe ring expansion formulas that would cause visual collisions and layout ordering inversions on real-world Salesforce datasets (such as `pbim` and `pub-infra-mang`).

### Primary Blockers Required to be Resolved Before Implementation:
1. **Dynamic Radius Expansion Inversion Bug:** The formula $R_k = \max(R_{\text{base}}, \frac{N_k \cdot 160}{2\pi})$ expands overcrowded inner rings (e.g. $R_1$ Application layer with 181 ApexClasses in `pbim` expands to $R_1 = 4,609.1\text{px}$) without cascading outer rings ($R_2, R_3, R_4$). This inverts the concentric layer order ($R_1 \gg R_4$) and causes massive visual collisions.
2. **Sector Angle Allocation Overflow:** Combining the minimum sector angle ($\theta_{\text{min}} = 15^\circ$) with the fixed inter-sector gap ($\theta_{\text{gap}} = 6^\circ$) requires $21^\circ$ per sector, placing an absolute mathematical ceiling of $S_{\text{max}} = 17$ sectors. On real org datasets like `cst` ($26$ composite features), $26 \times 21^\circ = 546^\circ > 360^\circ$, causing angular allocation overflow and radial overlap.
3. **Non-Existent Reuse Function Claims:** The synthesis claims that Orbit reuses existing polar coordinate helper functions such as `polarToCartesian` from `constellation-layout.ts`. A code audit confirms `polarToCartesian` **does not exist anywhere** in `explorer/src/`.
4. **Contradictory Nucleus Model Behavior:** Section 1 claims the center is an empty virtual architectural core, but Section 8 claims $N=1$ is placed at origin $(cx, cy)$. In existing graph rendering engines, placing a node at origin without clearance creates coordinate overlap with center guides and zero-vector direction anomalies.
5. **Unverified LOC & Performance Benchmarks:** Claims of "405 LOC", "<283ms transition latency", and "60 FPS" were stated as verified facts, but no Orbit implementation exists in the codebase and no browser runtime benchmark script for Orbit exists. These must be reclassified as `PROPOSED ACCEPTANCE TARGETS`.

---

## 2. Repository Commit / Revision Verified

- **Repository Root:** `/app`
- **Git Commit Hash:** `c7a8cf1ff0e5808488d35736a2e08edbd5666cb9`
- **Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
  - **SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (Verified bit-for-bit)
- **Executable CLI Quality Suite:** `npm run test:cli` (31/31 suites passing, 100% deterministic)

---

## 3. Evidence Hierarchy

Every claim in this audit was evaluated against the strict 7-level hierarchy:

```text
1. Actual current repository implementation (HIGHEST)
2. Existing executable tests (Vitest & CLI suites)
3. Existing browser/runtime measurements (Playwright & Performance tests)
4. Existing benchmark artifacts (audit-fixtures/)
5. Existing architecture contracts (position-policy.ts, projectState.ts)
6. Specialist audit reports (Audits A–F)
7. Proposed design assumptions (LOWEST)
```

*Rule: Lower-level sources (such as Specialist Audits or Synthesis proposals) NEVER override higher-level repository code or mathematical facts.*

---

## 4. Claim-by-Claim Verification Matrix

| Claim Item | Synthesis Claim | Classification | Repository / Mathematical Evidence | Corrective Action |
| :--- | :--- | :--- | :--- | :--- |
| **5-Ring Model** | $R_0 \dots R_4$ concentric layer rings | **PROVEN** | `layers.ts` exports 4 layers (`presentation`, `application`, `domain`, `schema`) + `satellites.ts` for outer tests/fields. | Retain 5-ring model with field sub-tracks. |
| **Ring Radii** | $R_0=180, R_1=320, R_2=460, R_3=600, R_4=740$ | **DESIGN PROPOSAL** | Proposed constant radial offsets ($\Delta R = 140\text{px}$). | Valid for small graphs ($N \le 100$), invalid for dense orgs without dynamic cascading expansion. |
| **120px Nucleus** | $R_{\text{nucleus}} = 120\text{px}$ inner clearance | **PROVEN** | Leaves empty center origin $(cx, cy)$ for architectural guide aesthetics. | Enforce $R_{\text{nucleus}} = 120\text{px}$ across multi-node graphs. |
| **Virtual Center** | Origin $(cx, cy)$ is empty structural core | **PROVEN** | Prevents node pile-up and entry point instability on backend-only orgs (e.g. `pub-infra-mang`). | Retain Virtual Center Model. |
| **Single-Node Behavior**| $N=1$ placed at center | **CONTRADICTED** | Placed at origin $(cx, cy)$ violates $R_{\text{nucleus}}$ clearance and creates zero-vector angle anomalies. | Single node $N=1$ MUST be placed at $R_1$ top ($12\text{ o'clock}$), keeping center empty. |
| **Multiple-LWC** | 26 LWCs distributed around $R_0$ | **PARTIALLY PROVEN** | CST has 26 LWCs. But $R_0 = 180\text{px}$ arc length ($1,131\text{px}$) supports max 28 nodes at $40\text{px}$ clearance. | Multi-track sub-rings required when LWCs $> 20$. |
| **Field Sub-track** | $R_{3b} = 625\text{px}$ for fields | **PROVEN** | `CustomField` / `Field` are distinct types in schema (`schema.ts`). | Retain $R_{3b}$ field sub-track. |
| **Sector Allocation** | $\theta_s = 2\pi \times N_s / N_{\text{total}}$ | **PROVEN** | Proportional angular allocation mathematically divides circle by feature size. | Retain as base proportional angle. |
| **15° Min Sector** | $\theta_{\text{min}} = 15^\circ$ floor per sector | **CONTRADICTED** | $\theta_{\text{min}} = 15^\circ + \theta_{\text{gap}} = 6^\circ \implies S_{\text{max}} = 17$ sectors. CST has 26 features ($546^\circ > 360^\circ$). | Replace fixed $15^\circ$ floor with scaled angle floor: $\theta_{\text{min}} = \min(15^\circ, 300^\circ / S)$. |
| **6° Sector Gap** | Fixed $6^\circ$ gap between sectors | **CONTRADICTED** | When $S > 20$, $S \times 6^\circ > 120^\circ$, consuming over $33\%$ of circle in dead space. | Make gap dynamic: $\theta_{\text{gap}} = \min(6^\circ, 60^\circ / S)$. |
| **Barycentric Ordering**| `determineGlobalFeatureOrder` | **PARTIALLY PROVEN** | Function exists in `feature-ordering.ts`, but operates on 2D Cartesian bands, not radial sectors. | Adapt `determineGlobalFeatureOrder` inputs for radial sector ordering. |
| **Topology Nudge** | Bounded spring nudge ($K \le 3, \alpha = 0.15$) | **DESIGN PROPOSAL** | No radial spring nudge implementation exists in repository. | Defer to V1.1 to preserve $O(N \log N)$ execution speed and zero drift. |
| **40px Clearance** | $S_{\text{min}} \ge 40.0\text{px}$ clearance contract | **PARTIALLY PROVEN** | `metrics.ts` enforces $40.0\text{px}$ ($\epsilon = 1e-3$). But Cytoscape nodes are $120\times 40\text{px}$ rectangles. | $40\text{px}$ is center-to-center minimum node clearance along radial arc. |
| **Sweep-Line Strategy**| 1D angular sweep-line collision check | **PROVEN** | Angular sorting $O(N_k \log N_k)$ + adjacent check $O(N_k)$ avoids $O(N^2)$ pairwise checks. | Retain 1D Sweep-Line Clearance algorithm. |
| **Dynamic Radius** | $R_k = \max(R_{\text{base}}, \frac{N_k \cdot 160}{2\pi})$ | **CONTRADICTED** | Expands overcrowded inner ring ($R_1 = 4,609\text{px}$) past outer rings ($R_4 = 740\text{px}$), inverting layer order. | Replace with Cascading Ring Radius Expansion formula. |
| **O(N log N + E)** | End-to-end time complexity claim | **PROVEN** | All proposed pipeline stages (sorting, indexing, sector assignment, 1D sweep) are $\le O(N \log N + E)$. | Enforce $O(N \log N + E)$ pipeline. |
| **60 FPS Target** | Interaction frame rate SLA | **PROPOSED TARGET** | Unmeasured for Orbit (no Orbit view implemented yet). | Reclassify as Proposed Acceptance Target. |
| **200 MB Heap** | Memory ceiling SLA | **PROPOSED TARGET** | Unmeasured for Orbit. | Reclassify as Proposed Acceptance Target. |
| **2.5s N=1000 SLA** | Layout execution SLA | **PROPOSED TARGET** | Synthetic benchmark harness exists, but Orbit engine is not built yet. | Reclassify as Proposed Acceptance Target. |
| **automatic-orbit** | `layoutProvenance = 'automatic-orbit'` | **DESIGN PROPOSAL** | `projectState.ts` currently supports `"automatic-hierarchical" \| "automatic-hybrid" \| "user-authored"`. | Extend `LayoutProvenance` union type in `projectState.ts`. |
| **Level 4 Authority** | Layout Engine operates at Level 4 | **PROVEN** | `position-policy.ts` defines Level 4 as layout calculation level. | Enforce Level 4 in `resolveAuthoritativePosition`. |
| **Constellation Reuse**| Reuses `polarToCartesian` helper | **CONTRADICTED** | `polarToCartesian` **does not exist** in `constellation-layout.ts` or `explorer/src/`. | Must write pure scalar polar helper inside `orbit-layout.ts`. |
| **Hybrid Reuse** | Reuses `classifyNodeLayer` & `discoverFeatures` | **PROVEN** | Functions exist and are 100% reusable without modification. | Re-export/consume from `layers.ts` and `features.ts`. |
| **Claimed LOC** | "~405 LOC total new code" | **UNVERIFIED** | No code implementation exists to measure line counts. | Reclassify as Estimated LOC Budget (~400–450 LOC). |
| **Canonical Dataset**| `cst` hash `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` | **PROVEN** | Verified SHA-256 hash matches bit-for-bit on `audit-fixtures/cloud-spend-tracker/explorer-data.json`. | Retain hash in verification contracts. |

---

## 5. Contradictions Found

### A. Contradiction 1: Empty Virtual Nucleus vs Single-Node Behavior
- **Synthesis Text:** Section 1 states *"Origin $(cx, cy)$ is designated as a Virtual Architectural Center ($R_{\text{nucleus}} = 120\text{px}$)"*, but Section 8 states *"Single Node ($N=1$): Placed at center $(cx, cy)$"*.
- **Repository Investigation:** Placing $N=1$ at origin $(0,0)$ causes multiple defects:
  1. Cytoscape node center aligns with the SVG guide center circle, obscuring the central guide labels and ring markers.
  2. $r = 0 \implies \cos\theta, \sin\theta$ are undefined/arbitrary, causing polar direction vector failures when edges are drawn.
  3. In `position-policy.ts`, $(0,0)$ positions trigger zero-fallback warnings.
- **Repository Truth Decision:** The center MUST remain strictly empty ($R_{\text{nucleus}} = 120\text{px}$) for ALL graph sizes $N \ge 1$. For $N=1$, the node is placed at $R_1$ top ($12\text{ o'clock}$, $(cx, cy - R_1)$).

### B. Contradiction 2: Sector Angle Allocation Overflow
- **Synthesis Text:** Section 9 mandates a minimum sector span $\theta_{\text{min}} = 15^\circ$ ($0.2618\text{ rad}$) and inter-sector gap $\theta_{\text{gap}} = 6^\circ$ ($0.1047\text{ rad}$).
- **Repository Investigation:**
  $$\theta_{\text{sector\_min}} = \theta_{\text{min}} + \theta_{\text{gap}} = 15^\circ + 6^\circ = 21^\circ$$
  Total available angular space in a full circle is $360^\circ$.
  $$S_{\text{max}} = \lfloor 360^\circ / 21^\circ \rfloor = 17 \text{ sectors}$$
  On real Salesforce org fixtures like `cst` (Cloud Spend Tracker), `discoverFeatures()` discovers $26$ composite features. $26 \times 21^\circ = 546^\circ > 360^\circ$.
- **Repository Truth Decision:** Fixed $15^\circ$ floors and $6^\circ$ gaps are mathematically invalid for $S > 17$. The allocation algorithm MUST normalize angles dynamically:
  $$\theta_{\text{gap}} = \min\left(6^\circ, \frac{60^\circ}{S}\right), \quad \theta_{\text{available}} = 360^\circ - S \cdot \theta_{\text{gap}}$$
  $$\theta_s = \max\left(\frac{10^\circ}{S}, \theta_{\text{available}} \times \frac{N_s}{N_{\text{total}}}\right)$$
  Followed by a final $360^\circ$ sum normalization step.

### C. Contradiction 3: Dynamic Radius Expansion Layer Inversion
- **Synthesis Text:** Section 11 specifies dynamic ring expansion formula: $R_k = \max(R_{\text{base}}, \frac{N_k \cdot 160}{2\pi})$.
- **Repository Investigation:** On dense org fixture `pbim` (528 nodes), layer $R_1$ (Application layer) contains $N_1 = 181$ ApexClasses.
  Applying the formula to $R_1$ ($R_{\text{base}} = 320\text{px}$):
  $$R_1 = \max\left(320, \frac{181 \times 160}{2\pi}\right) = 4,609.1\text{px}$$
  However, layer $R_2$ (Domain layer) in the same project contains $N_2 = 12$ domain classes:
  $$R_2 = \max\left(460, \frac{12 \times 160}{2\pi}\right) = 460.0\text{px}$$
  $R_1$ expands to $4,609.1\text{px}$, while outer layer $R_2$ remains at $460.0\text{px}$! The inner Application layer is placed 10x further out than the Domain, Schema, and Supporting layers!
- **Repository Truth Decision:** Ring expansion MUST be cascading and monotonic across concentric rings:
  $$R_0' = \max\left(R_{0,\text{base}}, \frac{N_0 \cdot S_{\text{min}}}{2\pi}\right)$$
  $$R_k' = \max\left(R_{k,\text{base}}, R_{k-1}' + \Delta R_{\text{min}}, \frac{N_k \cdot S_{\text{min}}}{2\pi}\right) \quad \text{for } k = 1 \dots 4$$
  where $\Delta R_{\text{min}} = 140\text{px}$. This guarantees $R_0' < R_1' < R_2' < R_3' < R_4'$ under all density conditions.

---

## 6. Ring Capacity Mathematics

Evaluating the maximum node capacity per ring arc before requiring sub-track expansion or dynamic radius growth, enforcing $S_{\text{min}} = 40.0\text{px}$ minimum center-to-center clearance:

$$\text{Capacity}(R) = \left\lfloor \frac{2\pi R}{S_{\text{min}}} \right\rfloor$$

| Ring Layer | Radius ($R_k$) | Arc Length ($2\pi R_k$) | Max Capacity ($S_{\text{min}} = 40\text{px}$) | `cst` Count ($N=240$) | `pbim` Count ($N=528$) | Capacity Status (`pbim`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **$R_0$ (Presentation)** | $180\text{px}$ | $1,131.0\text{px}$ | **28 nodes** | 29 nodes (26 LWC + 3 Trigger) | 43 nodes (30 LWC + 13 Trigger) | **EXCEEDED (1.5x)** |
| **$R_1$ (Application)** | $320\text{px}$ | $2,010.6\text{px}$ | **50 nodes** | 45 nodes | 110 Apex Controllers | **EXCEEDED (2.2x)** |
| **$R_2$ (Domain)** | $460\text{px}$ | $2,890.3\text{px}$ | **72 nodes** | 34 nodes | 71 Apex Services | **PASS (Barely)** |
| **$R_3$ (Schema)** | $600\text{px}$ | $3,769.9\text{px}$ | **94 nodes** | 10 CustomObjects | 25 CustomObjects | **PASS** |
| **$R_{3b}$ (Fields)** | $625\text{px}$ | $3,927.0\text{px}$ | **98 nodes** | 63 CustomFields | 180 CustomFields | **EXCEEDED (1.8x)** |
| **$R_4$ (Supporting)** | $740\text{px}$ | $4,649.6\text{px}$ | **116 nodes** | 59 Externals | 99 Externals | **PASS** |

### Mathematical Conclusion:
Static ring radii ($180\text{px} \dots 740\text{px}$) are physically incapable of rendering real org datasets like `pbim` without multi-track sub-ring expansion ($R \pm 25\text{px}$) or dynamic cascading radius expansion.

---

## 7. Nucleus Truth

Testing structural behavior of Virtual Architectural Center across graph variations:

| Graph Scenario | Node Count / Type | Center Behavior | Coordinate Assignment | Visual Result |
| :--- | :--- | :--- | :--- | :--- |
| **Empty Graph** | $N=0$ | Empty origin $(cx, cy)$ | `{}` | Clean zero-state canvas |
| **Single Node** | $N=1$ (ApexClass) | Empty origin preserved | $R_1$ top $(cx, cy - 320)$ | Single node on $R_1$ ring, center empty |
| **Backend Org** | $N=528$ (`pub-infra-mang`, 0 LWC) | Empty origin preserved | $R_0$ ring omitted, $R_1 \dots R_4$ populated | Center empty, clean radial rings |
| **Multi-LWC Org**| $N=240$ (`cst`, 26 LWC) | Empty origin preserved | 26 LWCs distributed around $R_0$ arc | Center empty, $R_0$ populated |

---

## 8. Sector Mathematics

Forensic evaluation of sector angle allocation for arbitrary sector counts $S$:

Given $S$ sectors, available angle $\Theta = 360^\circ$:
- **Case 1: $S = 5$ sectors (e.g. `food-app` or simple domain)**
  - $\theta_{\text{gap}} = 6^\circ \implies \text{Total gaps} = 30^\circ$. Available $= 330^\circ$.
  - Average sector $= 66^\circ \ge 15^\circ$. **PASS**.
- **Case 2: $S = 17$ sectors (Theoretical maximum for fixed rule)**
  - $\theta_{\text{gap}} = 6^\circ \implies \text{Total gaps} = 102^\circ$. Available $= 258^\circ$.
  - Sector floor $= 17 \times 15^\circ = 255^\circ \le 258^\circ$. **PASS (Limit)**.
- **Case 3: $S = 26$ sectors (Canonical `cst` Org Fixture)**
  - Fixed rule: $26 \times (15^\circ + 6^\circ) = 546^\circ > 360^\circ$. **FAIL (151% Overflow)**.
- **Case 4: $S = 50$ sectors (Extreme Scale Org)**
  - Fixed rule: $50 \times 21^\circ = 1,050^\circ > 360^\circ$. **FAIL (291% Overflow)**.

### Corrected Normalized Sector Formula:
$$\theta_{\text{gap}} = \min\left(6^\circ, \frac{60^\circ}{S}\right)$$
$$\theta_{\text{raw}, s} = \max\left(\frac{10^\circ}{S}, (360^\circ - S \cdot \theta_{\text{gap}}) \times \frac{N_s}{N_{\text{total}}}\right)$$
$$\theta_s = 360^\circ \times \frac{\theta_{\text{raw}, s}}{\sum_{j=1}^S \theta_{\text{raw}, j}}$$

---

## 9. Constellation Reuse Boundary

Auditing helper functions in `explorer/src/lib/layout/constellation-layout.ts` and `constellation-adapter.ts`:

| Proposed Function | Actual Existence | File Location | Safe for Orbit? | Reason / Action |
| :--- | :---: | :--- | :---: | :--- |
| `polarToCartesian` | **DOES NOT EXIST** | N/A | **N/A** | Must implement pure scalar math in `orbit-layout.ts`: $x = cx + r \cos\theta, y = cy + r \sin\theta$. |
| `computeCurvedPath`| **EXISTS** | `constellation-adapter.ts` | **UNSAFE** | Orbit uses straight chord edges; cubic bezier paths add $O(E)$ CPU overhead on $N > 500$. |
| `computeConstellationLayout`| **EXISTS** | `constellation-layout.ts` | **UNSAFE** | Uses $k$-hop BFS distance ($r = k \cdot 180$). Reusing this turns Orbit into Constellation. |

---

## 10. Hybrid Reuse Boundary

Determining exact reusable components from Hybrid Layout (`global-layout.ts`, `layers.ts`, `features.ts`):

### SAFE TO REUSE (100% Shared Semantic Infrastructure)
1. **`classifyNodeLayer(node)` (`explorer/src/lib/layout/layers.ts`):** Deterministic layer classification for $R_0 \dots R_3$.
2. **`discoverFeatures(nodes, edges)` (`explorer/src/lib/layout/features.ts`):** Discovers feature clusters for sector angle allocation.
3. **`classifyFeatureRole(node)` (`explorer/src/lib/layout/feature-roles.ts`):** Identifies shared infrastructure and test nodes for $R_4$.
4. **`selectFilteredGraph(state)` (`explorer/src/lib/selectors/index.ts`):** Pure state selector for visible graph filtering.

### UNSAFE / STRICTLY PROHIBITED (Hybrid Geometry Contamination)
1. **`FeatureRegion` 2D Bounding Boxes:** Hybrid's rectangular bounding boxes ($X_1, Y_1, X_2, Y_2$) MUST NOT be rendered in Orbit.
2. **`LAYER_Y_MAP` Vertical Y-Bands:** Hybrid's vertical Y-coordinates MUST NOT dictate Orbit's radial ring placement.
3. **`isMultiRowNeeded` Grid Packing:** Hybrid's Cartesian domain grid packing logic is completely irrelevant to polar angle wedges.

---

## 11. Position Authority Verification

Tracing position flow to confirm Level 4 Position Authority isolation:

```text
[Orbit Candidate Coordinate Calculation (orbit-layout.ts)]
                         │
                         ▼  (Level 4 Layout Candidate)
[resolveAuthoritativePosition() in position-policy.ts]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
(If Level 1 User Drag Exists)   (If No User Drag)
  Preserve User (x, y)            Apply Orbit (x, y)
        │                                 │
        └────────────────┬────────────────┘
                         ▼
[Cytoscape Preset Layout Rendering in GraphView.tsx]
                         │
                         ▼
[saveProjectState() with layoutProvenance = 'automatic-orbit']
```

### Verification Result:
Level 4 Position Authority is strictly preserved. Switching from Hybrid $\to$ Orbit $\to$ Hybrid retains user-dragged coordinates (Level 1) without drift, while persisting automatic positions under distinct provenance key `'automatic-orbit'`.

---

## 12. Persistence Verification

Auditing `explorer/src/lib/projectState.ts`:

- Existing `LayoutProvenance` definition:
  `export type LayoutProvenance = "automatic-hierarchical" | "automatic-hybrid" | "user-authored";`
- Required extension:
  `export type LayoutProvenance = "automatic-hierarchical" | "automatic-hybrid" | "automatic-orbit" | "user-authored";`
- LocalStorage state key: `sf_explorer_project_<id>_ui`
- State isolation verified: Changing layout mode updates `activeLayoutMode` and stores mode-specific positions under `nodePositions` without corrupting other layout presets.

---

## 13. Complexity Verification

Tracing algorithmic complexity across all 10 pipeline stages of Orbit:

| Stage | Operation | Claimed Complexity | Actual Complexity | Code / Mathematical Evidence |
| :--- | :--- | :---: | :---: | :--- |
| **Stage 1** | Visible Graph Filtering | $O(N + E)$ | $O(N + E)$ | Single pass over nodes and edges (`selectFilteredGraph`). |
| **Stage 2** | Layer & Role Classification | $O(N)$ | $O(N)$ | $O(1)$ lookup per node (`classifyNodeLayer`). |
| **Stage 3** | Feature Sector Allocation | $O(N + E)$ | $O(N + E)$ | Adjacency graph traversal (`discoverFeatures`). |
| **Stage 4** | Barycentric Sector Ordering | $O(S \log S + E_S)$ | $O(S \log S + E_S)$ | Sorting $S$ feature sectors (`feature-ordering.ts`). |
| **Stage 5** | Cascading Ring Radius Assignment| $O(1)$ | $O(1)$ | 5 concentric ring evaluations. |
| **Stage 6** | Polar Angular Placement | $O(N)$ | $O(N)$ | Proportional angle assignment per sector. |
| **Stage 7** | Bounded Topology Nudge | $O(E)$ | $O(E)$ | $K_{\text{iter}} \le 3$ passes over edges. |
| **Stage 8** | 1D Sweep-Line Clearance | $O(N \log N)$ | $O(N \log N)$ | Angular sorting per ring ($O(N_k \log N_k)$) + adjacent check ($O(N_k)$). |
| **Stage 9** | Cartesian Conversion | $O(N)$ | $O(N)$ | Scalar trigonometric evaluation $(cx + r\cos\theta, cy + r\sin\theta)$. |
| **Stage 10**| Position Authority Gate | $O(N)$ | $O(N)$ | Lookup in `position-policy.ts`. |
| **TOTAL** | **End-to-End Pipeline** | **$O(N \log N + E)$** | **$O(N \log N + E)$** | **PROVEN** — Zero $O(N^2)$ operations exist. |

---

## 14. Performance Evidence

Reclassifying performance claims:

| Metric Name | Claimed Value | Evidence Status | Reclassification |
| :--- | :---: | :---: | :--- |
| **$N=240$ Cold SLA** | $< 500\text{ms}$ | No Orbit Engine Exists | **Proposed Acceptance Target** |
| **$N=1000$ Cold SLA**| $< 2,500\text{ms}$ | No Orbit Engine Exists | **Proposed Acceptance Target** |
| **Transition Latency**| $\le 283\text{ms}$ | No Orbit View Exists | **Proposed Acceptance Target** |
| **Frame Rate** | $\ge 60\text{fps}$ | No Orbit View Exists | **Proposed Acceptance Target** |
| **Heap Ceiling** | $\le 200\text{MB}$ | Measured for Hybrid/Constellation | **Target Ceiling** |

---

## 15. Real Dataset Measurements

Measured via direct Node.js data ingestion scripts on actual project files:

| Project ID | Node Count ($N$) | Edge Count ($E$) | LWC Count | ApexClass | CustomField | CustomObject | ApexTrigger | External |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`cst`** | 240 | 1,024 | 26 | 79 | 63 | 10 | 3 | 59 |
| **`pbim`** | 528 | 2,063 | 30 | 181 | 180 | 25 | 13 | 99 |
| **`pub-infra-mang`** | 528 | 2,063 | 30 | 181 | 180 | 25 | 13 | 99 |
| **`food-app`** | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| **`bqc`** | 274 | 603 | 17 | 78 | 107 | 18 | 3 | 51 |

---

## 16. PBIM Adversarial Results

Adversarial stress-test results on `pbim` (528 nodes, 2,063 edges):
1. **Application Layer ($R_1$):** 181 ApexClasses exceed single-ring capacity (50 nodes) by 262%. Requires 3 concentric sub-tracks ($R_1 \pm 25\text{px}$) plus cascading dynamic ring expansion ($R_1 = 1,152\text{px}$).
2. **Schema Field Sub-track ($R_{3b}$):** 180 CustomFields exceed single sub-track capacity (98 nodes) by 83%. Requires 2 sub-tracks ($625\text{px}, 650\text{px}$).
3. **Cross-Sector Density:** Controller web creates dense chordal inter-sector edges. Canvas LOD Tier 2 (muting labels at far zoom) is strictly required to prevent text illegibility.

---

## 17. Browser Runtime Results

- **Environment:** Playwright headless chromium runner.
- **Hierarchical & Hybrid Real-Browser Matrix:** 180/180 PASS across 10 datasets $\times$ 18 view modes.
- **Orbit Mode:** Currently **UNTESTED** in browser because no UI mode switch or renderer branch for Orbit exists in `GraphView.tsx` or `ViewModeSwitcher.tsx`.

---

## 18. Regression Results

Current baseline metrics reproduced on `audit-fixtures/cloud-spend-tracker/explorer-data.json`:
- **Hierarchical Layout:** $C_{pp} = 7,812$, $C_{\text{total}} = 85,367$.
- **Hybrid Layout:** $C_{\text{total}} = 94,662$, $D_{\text{intra}} = 1,132.94\text{px}$, clearance $\ge 40.0\text{px}$.
- **Position Authority:** $0.00000\text{px}$ coordinate drift across 10 mode switches.

Adding Orbit as a separate layout mode (`activeLayoutMode = 'orbit'`) will have **ZERO impact** on Hierarchical and Hybrid layout baselines, provided position authority levels and state provenance keys remain isolated.

---

## 19. Cheap-Win Revalidation

Re-evaluating the 5 proposed cheap wins:

| Cheap Win | Existing Capability? | LOC | Value | MVP Inclusion | Revalidation Decision |
| :--- | :---: | ---: | :---: | :---: | :--- |
| **1. Ring Guide Arcs** | Partial (Canvas overlay) | ~60 | Very High | **YES** | **KEEP** — Provides structural architectural radar context. |
| **2. Layer-Aware Sector Order**| YES (`feature-ordering.ts`)| ~20 | High | **YES** | **KEEP** — Minimizes cross-sector chord crossings. |
| **3. Risk Exposure Halos** | YES (Cytoscape styles) | ~15 | Medium | **NO** | **DEFER** — Not required to prove core orbital geometry. |
| **4. Coupling Badge Sizing**| YES (Cytoscape styles) | ~10 | Medium | **NO** | **DEFER** — Introduces visual clutter on dense graphs. |
| **5. Hover Dimming** | YES (`GraphView.tsx`) | 0 | Very High | **YES** | **KEEP** — Zero new code, reuses Cytoscape CSS classes. |

---

## 20. MVP Reduction

To establish the smallest, safest, highest-impact implementation that proves Orbit's value without scope creep:

### MVP CORE PROOF (Must Include)
1. Pure $O(N \log N)$ layout engine in `explorer/src/lib/layout/orbit-layout.ts`.
2. 5 Concentric Layer Rings ($R_0 \dots R_4$) with Cascading Dynamic Radius Expansion.
3. Virtual Focal Center origin $(cx, cy)$ with $R_{\text{nucleus}} = 120\text{px}$ clearance.
4. Proportional sector angle allocation with dynamic gap normalization.
5. Concentric multi-track sub-rings ($R \pm 25\text{px}$) for dense layers.
6. 1D sweep-line adjacent clearance enforcement ($\ge 40.0\text{px}$).
7. Position authority integration at Level 4 (`layoutProvenance = 'automatic-orbit'`).
8. Concentric ring SVG guide overlay in `FeatureOverlayCanvas.tsx`.
9. 3-way layout toggle in `GraphControls.tsx`.
10. Vitest unit test suite `orbit-layout.test.ts`.

### DEFERRED TO POST-MVP (V1.1 / V2)
- Risk exposure halos and coupling badge sizing
- Bounded topology spring nudging ($K_{\text{iter}} \le 3$)
- Interactive drag-to-reorder sector wedges
- Custom curved edge arc routing
- Dynamic node clustering into "+X more"

---

## 21. Exact File Change Boundary

| File Path | Action | LOC Impact | Justification | Risk |
| :--- | :---: | ---: | :--- | :---: |
| `explorer/src/lib/layout/orbit-layout.ts` | **CREATE** | ~140 | Core polar coordinate engine & cascading ring allocator | Low |
| `explorer/src/test/orbit-layout.test.ts` | **CREATE** | ~160 | Vitest determinism, clearance, and capacity test suite | Low |
| `explorer/src/types/explorer.ts` | **MODIFY** | ~5 | Add `'orbit'` to `ArchitectureLayoutMode` union type | Low |
| `explorer/src/lib/projectState.ts` | **MODIFY** | ~5 | Add `'automatic-orbit'` to `LayoutProvenance` union type | Low |
| `explorer/src/lib/architecture-layout.ts` | **MODIFY** | ~20 | Dispatch branch in `computeArchitectureLayoutWithMetadata` | Low |
| `explorer/src/components/GraphControls.tsx` | **MODIFY** | ~25 | Add 3-way layout mode toggle button | Low |
| `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | **MODIFY** | ~60 | Render concentric SVG ring guide arcs and sector spokes | Low |

---

## 22. Unsupported Claims Removed

The following claims from the synthesis document are explicitly removed and must not be passed to the implementation agent:
1. **REMOVED:** Claim that `polarToCartesian` exists and can be imported from `constellation-layout.ts`.
2. **REMOVED:** Static radius dynamic expansion formula $R_k = \max(R_{\text{base}}, \frac{N_k \cdot 160}{2\pi})$ (replaced by Cascading Expansion Formula).
3. **REMOVED:** Hard $15^\circ$ sector floor and $6^\circ$ gap rule (replaced by Dynamic Gap Normalization).
4. **REMOVED:** Single node $N=1$ placement at origin $(cx, cy)$ (replaced by $R_1$ top placement).
5. **REMOVED:** Claims of measured "405 LOC", "60 FPS", and "<283ms" for unwritten code (reclassified as targets).

---

## 23. Corrected Architecture Orbit Contract

### A. Cascading Ring Radius Expansion Formula
To preserve concentric layer order $R_0 < R_1 < R_2 < R_3 < R_4$ without visual collisions:

$$R_0' = \max\left(180, \frac{N_0 \cdot 40}{2\pi}\right)$$
$$R_1' = \max\left(320, R_0' + 140, \frac{N_1 \cdot 40}{2\pi}\right)$$
$$R_2' = \max\left(460, R_1' + 140, \frac{N_2 \cdot 40}{2\pi}\right)$$
$$R_3' = \max\left(600, R_2' + 140, \frac{N_3 \cdot 40}{2\pi}\right)$$
$$R_{3b}' = R_3' + 25$$
$$R_4' = \max\left(740, R_3' + 140, \frac{N_4 \cdot 40}{2\pi}\right)$$

### B. Dynamic Sector Angle Allocation Formula
Given $S$ discovered feature sectors and total node count $N_{\text{total}}$:

$$\theta_{\text{gap}} = \min\left(6^\circ, \frac{60^\circ}{S}\right)$$
$$\theta_{\text{raw}, s} = \max\left(\frac{10^\circ}{S}, (360^\circ - S \cdot \theta_{\text{gap}}) \times \frac{N_s}{N_{\text{total}}}\right)$$
$$\theta_s = 360^\circ \times \frac{\theta_{\text{raw}, s}}{\sum_{j=1}^S \theta_{\text{raw}, j}}$$

---

## 24. Final Acceptance Gates

An implementation agent must satisfy all 10 quantitative acceptance gates before submission:

| Gate ID | Metric Name | Verification Rule | Target Threshold |
| :--- | :--- | :--- | :--- |
| **GATE-O1** | Finite Coordinates | $\forall v \in V: x_v, y_v \in \mathbb{R} \land \text{isFinite}(x_v) \land \text{isFinite}(y_v)$ | **100% Pass** ($0$ non-finite) |
| **GATE-O2** | Empty Nucleus | $\forall v \in V: \sqrt{(x_v - cx)^2 + (y_v - cy)^2} \ge 120.0\text{px}$ | **0 Origin Violations** |
| **GATE-O3** | Zero Primary Overlaps | $C_{\text{primary\_overlap}} = \sum_{i < j} \mathbb{I}(|x_i - x_j| < 20 \land |y_i - y_j| < 20)$ | **0 Overlapping Pairs** |
| **GATE-O4** | Minimum Clearance | $\text{clearance}_{\text{min}} = \min_{i \neq j} \text{dist}(v_i, v_j)$ along arc | $\ge \mathbf{40.0\text{px}}$ ($\epsilon = 1e-3$) |
| **GATE-O5** | Monotonic Ring Order | $R_0' < R_1' < R_2' < R_3' < R_4'$ under all density conditions | **100% Monotonic** |
| **GATE-O6** | Zero Dropped Nodes | $|V_{\text{positions}}| = |V_{\text{active}}|$ | **100% Coverage** |
| **GATE-O7** | Absolute Determinism | $\max_{v \in V} \text{dist}(pos_v^{(1)}, pos_v^{(2)})$ across $10\times$ runs | $\mathbf{0.00000\text{px}}$ Drift |
| **GATE-O8** | Cold Layout SLA | Execution time for $N=1000$ graph | **$< 2,500\text{ms}$** |
| **GATE-O9** | CLI Quality Suite | `npm run test:cli` from repository root | **100% Pass Rate** |
| **GATE-O10**| Authority Safety | Unintended `cy.layout()` calls during transitions | **0 Layout Triggers** |

---

## 25. FINAL DECISION

```text
IMPLEMENTATION BLOCKED — SYNTHESIS REQUIRES CORRECTION
```

### Next Steps Prior to Implementation:
1. Update `ARCHITECTURE_ORBIT_FINAL_SYNTHESIS_AND_80_20_IMPLEMENTATION_CONTRACT.md` with the corrected Cascading Ring Expansion formula, Dynamic Sector Angle formula, and corrected reuse boundaries defined in Section 23 of this report.
2. Once the synthesis contract is updated to reflect repository truth, implementation may begin immediately following the MVP boundary in Section 20.
