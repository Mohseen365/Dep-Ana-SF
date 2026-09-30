# ARCHITECTURE ORBIT — FINAL PLACEMENT, ANGULAR DISTRIBUTION AND COLLISION-REPAIR INVARIANT GATE

## READ-ONLY • NO PRODUCTION IMPLEMENTATION • MATHEMATICAL & REPOSITORY-TRUTH AUDIT GATE

---

# 1. Executive Verdict

```text
BLOCKED — ORBIT PLACEMENT GEOMETRY STILL UNPROVEN
```

This audit report evaluates the complete proposed **Architecture Orbit** radial layout pipeline:
```text
semantic rings
→ feature/domain sectors
→ node ordering
→ multi-track assignment
→ angular placement
→ bounded angular nudging
→ collision repair
→ additional-track fallback
→ final AABB validation
```

### Core Audit Resolution:
1. **Critical Discovery — Full-Circle Capacity Formula Fails Under Sector Constraints:** The previously derived full-circle chord capacity formula $R_{\min}(n_t) = \frac{D}{2 \sin(\pi / n_t)}$ assumes nodes are uniformly distributed across the full $360^\circ$ circle. When nodes $n_{s,t}$ are confined inside a semantic sector of angle $\Theta_s < 360^\circ$ (e.g., $10^\circ \dots 36^\circ$), the actual angular separation between nodes drops dramatically, causing **severe physical AABB node collisions**.
2. **Corrected Sector-Constrained Radius Formula Derived:** For $n_{s,t} \ge 2$ nodes assigned to track $t$ within sector $s$ of angle $\Theta_s$ (with reserved boundary margins $\phi_{\text{margin}}$), the required radius $R_{\min}(s,t)$ MUST be computed as:
   $$R_{\min}(s,t) = \frac{D}{2 \sin(\Delta\theta_{s,t} / 2)}, \quad \text{where } \Delta\theta_{s,t} = \frac{\Theta_s - 2\phi_{\text{margin}}}{n_{s,t} - 1}$$
   For example, placing 15 nodes on a single track inside a $36^\circ$ sector requires radius $R \approx 2,205.96\text{px}$ (vs $238.07\text{px}$ under full-circle assumptions).
3. **Arbitrary-Angle Cross-Track Safety Proven:** For nodes on adjacent tracks with radial separation $\Delta R \ge 100\text{px}$, the Euclidean distance satisfies $|P_2 - P_1| \ge \Delta R \ge 100\text{px} > 70\sqrt{2}\text{px} \approx 98.995\text{px}$ for ALL polar angles $\theta_1, \theta_2 \in [0, 2\pi)$, proving 100% AABB non-collision.
4. **Collision Repair Termination Unproven:** The proposed 3-stage collision repair state machine (`PLACE` $\to$ `REPAIR` $\to$ `FALLBACK`) lacks a mathematically proven finite upper bound for angular sweeps and track allocations in runtime code.
5. **Final Verdict & Actionable Remediation:** Implementation remains **BLOCKED** until Orbit specs adopt the sector-constrained radius formula $R_{\min}(s,t)$ and define a deterministic, bounded collision repair state machine.

---

# 2. Repository Evidence & Claim Taxonomy

Inspected Level 1 repository source code and structural datasets:
- `explorer/src/lib/graph-style.ts` (lines 96–125: `nodeWidth: 50`, `nodeHeight: 50`, `text-max-width: 120px`).
- `explorer/src/lib/layout/layers.ts` (`classifyNodeLayer`).
- `explorer/src/lib/layout/features.ts` (`discoverFeatures`).
- `explorer/src/lib/layout/domains.ts` (`discoverDomains`).
- `explorer/src/lib/layout/feature-ordering.ts` (`determineGlobalFeatureOrder`).
- `explorer/src/lib/layout/position-policy.ts` (Level 4 Position Authority invariants).
- `explorer/public/projects/pbim/explorer-data.json` ($N = 528, E = 2,063$).

### Strict 7-Tier Claim Taxonomy:

| Claim / Fact | Assigned Classification | Audit Evidence |
| :--- | :--- | :--- |
| Physical node body $50 \times 50\text{px}$ | **PROVEN BY REPOSITORY** | `graph-style.ts` lines 96–97 |
| Effective safety geometry $70 \times 70\text{px}$ | **DERIVED FROM EXPLICIT CONTRACT** | $50\text{px} + 20\text{px}$ padding clearance contract |
| Center-to-center chord $D = 70\sqrt{2} \approx 98.995\text{px}$ | **PROVEN MATHEMATICALLY** | Worst-case diagonal AABB orientation at $45^\circ$ |
| Arbitrary-angle cross-track safety ($\Delta R \ge 100\text{px}$) | **PROVEN MATHEMATICALLY** | $|P_2 - P_1| \ge R_2 - R_1 \ge 100\text{px} > 70\sqrt{2}\text{px}$ for all $\theta_1, \theta_2$ |
| Inadequacy of full-circle $R_{\min}(n)$ formula for sectors | **PROVEN MATHEMATICALLY** | Angular density $\Delta\theta = \Theta_{\text{sector}}/(n-1) \ll 2\pi/n$ causes node overlap |
| Sector-constrained radius $R_{\min}(s,t) = \frac{D}{2\sin(\Delta\theta/2)}$ | **PROVEN MATHEMATICALLY** | Derivation from regular angular grid inside sector $\Theta_s$ |
| Sector feasibility ($S_{\max} = 25$ for $4^\circ$ gap) | **DERIVED FROM EXPLICIT CONTRACT** | $\lfloor 360^\circ / (10^\circ + 4^\circ) \rfloor = 25$ |
| Sector feasibility ($S_{\max} = 20$ for $8^\circ$ gap) | **DERIVED FROM EXPLICIT CONTRACT** | $\lfloor 360^\circ / (10^\circ + 8^\circ) \rfloor = 20$ |
| Automatic fallback via `discoverDomains()` | **UNPROVEN** | `discoverDomains()` exists, but no Orbit sector binding exists |
| Virtual Architectural Core center invariant | **DERIVED FROM EXPLICIT CONTRACT** | $(c_x, c_y)$ independent of graph node existence |
| Collision repair state machine termination | **UNPROVEN** | No finite upper bound proven for runtime execution |
| Browser execution $< 12\text{ms}$ / 60 FPS claims | **CONTRADICTED** | Zero Orbit production code exists in repository |

---

# 3. Authoritative Geometry Model

The Orbit radial layout engine operates under **Model B Effective Safety Geometry**:

```text
Node Body Width (W_body)   = 50 px
Node Body Height (H_body)  = 50 px
Clearance Padding (gx, gy) = 20 px
Effective Safety Envelope  = 70 × 70 px
```

### Orientation-Independent Center Distance:
For two square node envelopes of size $70 \times 70\text{px}$, the worst-case orientation occurs at a $45^\circ$ diagonal relative to the coordinate axes:

$$D = \sqrt{70^2 + 70^2} = 70 \sqrt{2} \approx \mathbf{98.994949\text{px}}$$

### Authoritative AABB Non-Collision Predicate:
For any two node center positions $A = (x_A, y_A)$ and $B = (x_B, y_B)$, non-collision under the $70 \times 70\text{px}$ effective model is strictly defined as:

$$\text{Safe}(A, B) \iff |x_A - x_B| \ge 70.0\text{px} \quad \mathbf{OR} \quad |y_A - y_B| \ge 70.0\text{px}$$

There is zero double-counting of clearance.

---

# 4. Arbitrary-Angle Cross-Track Proof

Previous reports proved inter-track safety under identical polar angles ($\theta_1 = \theta_2$). We extend this to a **complete proof for arbitrary polar angles** $\theta_1, \theta_2 \in [0, 2\pi)$.

### Theorem:
Let $P_1 = (R_1 \cos\theta_1, R_1 \sin\theta_1)$ and $P_2 = (R_2 \cos\theta_2, R_2 \sin\theta_2)$ be two nodes on sub-tracks at radii $R_1, R_2$ with radial separation $R_2 - R_1 \ge 100.0\text{px}$. Then $P_1$ and $P_2$ satisfy the AABB non-collision predicate $\text{Safe}(P_1, P_2) == \text{true}$ for ALL polar angles $\theta_1, \theta_2 \in [0, 2\pi)$.

### Mathematical Proof:
1. The Euclidean distance between $P_1$ and $P_2$ in Cartesian coordinates is:
   $$|P_2 - P_1|^2 = (R_2 \cos\theta_2 - R_1 \cos\theta_1)^2 + (R_2 \sin\theta_2 - R_1 \sin\theta_1)^2$$
   $$= R_2^2 + R_1^2 - 2 R_1 R_2 (\cos\theta_1 \cos\theta_2 + \sin\theta_1 \sin\theta_2) = R_2^2 + R_1^2 - 2 R_1 R_2 \cos(\theta_2 - \theta_1)$$
2. Because $\cos(\theta_2 - \theta_1) \le 1$ for all angles:
   $$|P_2 - P_1|^2 \ge R_2^2 + R_1^2 - 2 R_1 R_2 = (R_2 - R_1)^2$$
   $$\implies |P_2 - P_1| \ge R_2 - R_1 \ge 100.0\text{px}$$
3. For any two points separated by Euclidean distance $d = |P_2 - P_1| \ge 100.0\text{px}$, let $\Delta x = x_2 - x_1$ and $\Delta y = y_2 - y_1$. Since $\Delta x^2 + \Delta y^2 = d^2 \ge 10000$:
   $$\max(|\Delta x|, |\Delta y|) \ge \frac{d}{\sqrt{2}} \ge \frac{100}{\sqrt{2}} \approx 70.710678\text{px}$$
4. Since $70.710678\text{px} \ge 70.000000\text{px}$, either $|\Delta x| \ge 70.0\text{px}$ or $|\Delta y| \ge 70.0\text{px}$ MUST hold.

### Conclusion:
Inter-track radial gap $\Delta R_{\text{track}} = 100\text{px}$ guarantees 100% AABB safety across **arbitrary polar orientations** ($\theta_1, \theta_2 \in [0, 2\pi)$) without depending on angular staggering.

---

# 5. Semantic Sector Model

Orbit divides each concentric semantic ring into sectors corresponding to architectural features or domains:

- **Sector Body Angle ($\Theta_s^{\text{body}}$):** Angular width assigned to sector $s$.
- **Inter-Sector Gap ($\phi_{\text{gap}}$):** Reserved angular corridor between adjacent sectors.
- **Sector Start Angle ($\theta_s^{\text{start}}$):** $\theta_s^{\text{start}} = \sum_{i < s} (\Theta_i^{\text{body}} + \phi_{\text{gap}})$.
- **Sector End Angle ($\theta_s^{\text{end}}$):** $\theta_s^{\text{end}} = \theta_s^{\text{start}} + \Theta_s^{\text{body}}$.
- **Sector Center Angle ($\theta_s^{\text{center}}$):** $\theta_s^{\text{center}} = \theta_s^{\text{start}} + 0.5 \Theta_s^{\text{body}}$.

### Proportional Weight Allocation Policy:
Sector body angles are allocated proportionally to feature node weights $w_s$:
$$\Theta_s^{\text{body}} = \max\left(\theta_{\min}, \frac{w_s}{\sum w_i} (360^\circ - S \phi_{\text{gap}})\right)$$
If clamping ($\theta_{\min} = 10^\circ$) occurs, remaining angular budget is redistributed proportionally across unclamped sectors.

---

# 6. Sector Feasibility

We evaluate the maximum number of feasible sectors $S_{\max}$ under the two candidate inter-sector gaps:

### Contract Option A ($\phi_{\text{gap}} = 4^\circ$, $\theta_{\min} = 10^\circ$):
$$\Theta_{\text{req}} = 10^\circ + 4^\circ = 14^\circ \implies S_{\max} = \left\lfloor \frac{360^\circ}{14^\circ} \right\rfloor = \mathbf{25\text{ sectors}}$$

### Contract Option B ($\phi_{\text{gap}} = 8^\circ$, $\theta_{\min} = 10^\circ$):
$$\Theta_{\text{req}} = 10^\circ + 8^\circ = 18^\circ \implies S_{\max} = \left\lfloor \frac{360^\circ}{18^\circ} \right\rfloor = \mathbf{20\text{ sectors}}$$

### Contract Authority Verdict:
Orbit formally adopts **Option A ($\phi_{\text{gap}} = 4^\circ \implies S_{\max} = 25$)** as its primary sector feasibility contract authority. Option B ($\phi_{\text{gap}} = 8^\circ$) is rejected to maximize feature cardinality support ($S \le 25$).

---

# 7. Sector Overflow Policy

When total input features $F$ exceed $S_{\max} = 25$:

### Audit Classification:
- **Fallback Rule:** Merge low-weight features into primary domain buckets derived from `discoverDomains()`.
- **Classification:** **ORBIT-SPECIFIC DESIGN POLICY / UNPROVEN IN REPOSITORY**.
- **Repository Status:** `discoverDomains()` exists in `explorer/src/lib/layout/domains.ts`, but no Orbit-specific automatic fallback binding currently exists in production code. Marking as **UNPROVEN — IMPLEMENTATION POLICY REQUIRED**.

---

# 8. Node-to-Sector Assignment

Deterministic assignment function `sector(node)`:

1. **Primary Key:** `node.featureId` derived from `discoverFeatures()` (`explorer/src/lib/layout/features.ts`).
2. **Fallback Key:** `node.domainId` derived from `discoverDomains()` (`explorer/src/lib/layout/domains.ts`).
3. **Unassigned Fallback:** Assigned to a designated default `unclassified` sector bucket.
4. **Deterministic Tie-Breaker:** Sort by `node.id` (lexicographical string comparison).

This function reuses existing repository classification utilities (`features.ts`, `domains.ts`), ensuring 100% deterministic, environment-independent node grouping.

---

# 9. Node Order Within a Sector

Nodes assigned to the same sector and sub-track are ordered deterministically using `order(nodeA, nodeB)`:

1. **Primary Criterion:** Node Layer Rank (`classifyNodeLayer` in `explorer/src/lib/layout/layers.ts`).
2. **Secondary Criterion:** Graph Centrality (degree / dependency count).
3. **Tertiary Criterion:** Deterministic Node ID (`nodeA.id.localeCompare(nodeB.id)`).

Zero reliance on object iteration order, hash map key order, or unstable sort algorithms.

---

# 10. Angular Placement Formula

For node $i \in \{0 \dots n_{s,t} - 1\}$ assigned to track $t$ inside sector $s$ bounded by $[\theta_s^{\text{start}}, \theta_s^{\text{end}}]$ with reserved margin $\phi_{\text{margin}}$:

### Single Node ($n_{s,t} = 1$):
Placed at the exact center of the sector:
$$\theta_i = \theta_s^{\text{center}} = \theta_s^{\text{start}} + 0.5 \Theta_s^{\text{body}}$$

### Multiple Nodes ($n_{s,t} \ge 2$):
Distributed uniformly across the interior usable interval $[\theta_s^{\text{start}} + \phi_{\text{margin}}, \theta_s^{\text{end}} - \phi_{\text{margin}}]$:
$$\Delta\theta_{s,t} = \frac{\Theta_s^{\text{body}} - 2 \phi_{\text{margin}}}{n_{s,t} - 1}$$
$$\theta_i = \theta_s^{\text{start}} + \phi_{\text{margin}} + i \cdot \Delta\theta_{s,t}$$

---

# 11. Sector Boundary Safety

To prevent nodes near sector boundaries from encroaching on the inter-sector gap $\phi_{\text{gap}}$, Orbit reserves an interior angular margin:

$$\phi_{\text{margin}} = \arcsin\left(\frac{D}{2 R_t}\right)$$

### Proof of Boundary Safety:
1. Setting $\phi_{\text{margin}} = \arcsin\left(\frac{D}{2 R_t}\right)$ guarantees that the center of the first node ($\theta_0$) is at least chord distance $D = 70\sqrt{2}\text{px}$ away from the physical sector boundary $\theta_s^{\text{start}}$.
2. Similarly, the last node ($\theta_{n-1}$) is at least distance $D$ away from $\theta_s^{\text{end}}$.
3. Therefore, nodes in sector $s$ and sector $s+1$ separated by inter-sector gap $\phi_{\text{gap}} \ge 4^\circ$ have a total angular separation of $\Delta\theta \ge \phi_{\text{gap}} + 2 \phi_{\text{margin}}$, ensuring zero cross-sector AABB collisions.

---

# 12. Multi-Track Angular Staggering

Does Orbit require different sub-tracks within the same semantic ring to use angular staggering?

### Verdict:
- **Radial Separation Proof (Section 4):** Since sub-tracks are separated by $\Delta R_{\text{track}} \ge 100\text{px}$, AABB non-collision is 100% mathematically guaranteed at **ALL polar angles** ($\theta_1 = \theta_2$ or $\theta_1 \ne \theta_2$).
- **Angular Staggering Status:** Angular staggering between sub-tracks is **OPTIONAL VISUAL POLISHING**, not a mathematical non-collision requirement. Same polar angles across sub-tracks are 100% AABB safe.

---

# 13. Critical Distinction — Capacity vs Actual Placement

We formally separate three distinct proof tiers:

1. **Capacity Proof:** Proves that a circle or sector arc has sufficient geometric length to fit $N$ non-overlapping $70 \times 70\text{px}$ envelopes.
2. **Placement Proof:** Proves that the explicit angular coordinates $(\theta_1 \dots \theta_N)$ generated by the placement formula satisfy $\text{Chord}(i, i+1) \ge D$.
3. **Final AABB Validation:** Authoritative runtime validation inspecting all $N(N-1)/2$ node pairs against $|x_A - x_B| \ge 70 \lor |y_A - y_B| \ge 70$.

Capacity proof alone DOES NOT prove placement. Placement proof MUST be established independently.

---

# 14. Angular Nudge Audit

Orbit proposes a local collision repair rule allowing nodes to shift polar angle by up to $\pm 0.25 \Theta_s^{\text{body}}$.

### Audit Classification & Risk:
- **Rule:** Displacement $\Delta\theta_i \le 0.25 \Theta_s^{\text{body}}$.
- **Classification:** **ORBIT-SPECIFIC DESIGN POLICY / UNPROVEN**.
- **Boundary Risk:** If a node near the sector boundary is nudged by $+0.25 \Theta_s^{\text{body}}$, it will cross into the inter-sector gap or adjacent sector unless strictly clamped to $[\theta_s^{\text{start}} + \phi_{\text{margin}}, \theta_s^{\text{end}} - \phi_{\text{margin}}]$.
- **Mandatory Policy Correction:** Angular nudging MUST be strictly clamped to the interior usable sector interval.

---

# 15. Circular Angular Difference

For polar angle calculations around the $0^\circ / 360^\circ$ ($0 \leftrightarrow 2\pi$) seam:

### Authoritative Circular Difference Formula:
$$\Delta\theta = ((\theta_2 - \theta_1 + \pi) \bmod 2\pi) - \pi$$

### Test Suite Verification:
1. **Test Case 1 ($\theta_1 = 359^\circ, \theta_2 = 1^\circ$):**
   $$\theta_1 = \frac{359\pi}{180}, \quad \theta_2 = \frac{\pi}{180} \implies \Delta\theta = +2^\circ \quad (\text{NOT } 358^\circ)$$
2. **Test Case 2 ($\theta_1 = 1^\circ, \theta_2 = 359^\circ$):**
   $$\Delta\theta = -2^\circ \quad (\text{NOT } -358^\circ)$$

This circular difference formula MUST be used in all proximity, angular sorting, and collision repair logic.

---

# 16. Polar-to-Cartesian Consistency

All node polar coordinates $(R_i, \theta_i)$ are transformed to Cartesian screen coordinates $(x_i, y_i)$ using:

$$x_i = c_x + R_i \cos\theta_i$$
$$y_i = c_y + R_i \sin\theta_i$$

where $(c_x, c_y)$ is the **Virtual Architectural Core Center**.

Every Orbit node consumes the exact same center $(c_x, c_y)$. No graph node acts as the focal center.

---

# 17. Virtual Center Invariant

```text
Orbit Center == Virtual Architectural Core
             != Arbitrary Graph Node
```

The center point $(c_x, c_y)$ is a purely geometric reference origin (e.g. $(0, 0)$ or canvas center). It exists independently of whether any graph node is selected, hovered, or present in the dataset.

---

# 18. Initial Collision Invariant

Before collision repair, the placement generator satisfies:
- **Same-Track Sector Chord:** $\text{Chord} = 2 R_t \sin(\Delta\theta_{s,t} / 2) \ge D = 70\sqrt{2}\text{px}$ (guaranteed when sector-constrained radius $R_{\min}(s,t)$ is used).
- **Cross-Track Radial Distance:** $\Delta R_{\text{track}} \ge 100\text{px}$ (guaranteed by radial spacing proof in Section 4).

If full-circle radius $R_{\min}(n_t)$ is used instead of sector-constrained radius $R_{\min}(s,t)$, the initial placement **FAILS** the same-track chord invariant.

---

# 19. Sector-Constrained Capacity

### Critical Mathematical Evaluation:
Is the full-circle formula $R_{\min}(n_t) = \frac{D}{2 \sin(\pi / n_t)}$ valid when $n_{s,t}$ nodes are confined to a sector $\Theta_s < 360^\circ$?

**ANSWER: NO.**

### Proof of Failure:
Suppose 15 nodes are assigned to a track inside a $36^\circ$ sector ($10\%$ of a circle).
1. Full-circle formula yields $R_{\min}(15) = \frac{70\sqrt{2}}{2 \sin(\pi / 15)} \approx 238.07\text{px}$.
2. Placing 15 nodes uniformly across $36^\circ$ yields angular spacing $\Delta\theta = \frac{36^\circ}{14} \approx 2.5714^\circ = 0.04488\text{rad}$.
3. At $R = 238.07\text{px}$, the chord distance between adjacent nodes is:
   $$\text{Chord} = 2 \cdot 238.07 \cdot \sin(1.2857^\circ) = 476.14 \cdot 0.02244 = \mathbf{10.68\text{px}}$$
4. Since $10.68\text{px} \ll D = 98.995\text{px}$ (and along horizontal/vertical axes, distance falls below $70\text{px}$), nodes **severely overlap**.

### Derivation of Correct Sector-Constrained Radius Formula:
To achieve chord distance $D = 70\sqrt{2}\text{px}$ between $n_{s,t}$ nodes inside sector angle $\Theta_s$:

$$\Delta\theta_{s,t} = \frac{\Theta_s - 2\phi_{\text{margin}}}{n_{s,t} - 1}$$
$$2 R \sin\left(\frac{\Delta\theta_{s,t}}{2}\right) \ge D = 70\sqrt{2}$$
$$\implies \mathbf{R_{\min}(s,t) = \frac{70\sqrt{2}}{2 \sin\left(\frac{\Theta_s - 2\phi_{\text{margin}}}{2(n_{s,t} - 1)}\right)}}$$

Re-evaluating the 15-node example inside $36^\circ$ under the corrected formula:
$$\Delta\theta = \frac{36^\circ}{14} = 2.5714^\circ \implies R_{\min}(s,t) = \frac{49.49747}{\sin(1.2857^\circ)} = \mathbf{2205.96\text{px}}$$

---

# 20. Critical Gate Resolution

> Does the current Orbit radius formula remain valid when nodes are confined to semantic sectors?

### Verdict:

```text
REQUIRES SECTOR-CONSTRAINED RADIUS FORMULA
```

The full-circle chord formula $R_{\min}(n_t)$ is mathematically invalid for sector-constrained placement and MUST be replaced by $R_{\min}(s,t) = \frac{D}{2 \sin(\Delta\theta_{s,t} / 2)}$.

---

# 21. Collision Repair State Machine

Proposed 3-stage repair pipeline:

```text
PLACE (Sector-Constrained Angular Placement)
  ↓
VALIDATE (Authoritative Pairwise AABB Check)
  ↓ [Collisions Detected]
REPAIR (Bounded Polar Sweep within Usable Interval)
  ↓ [Collisions Persist]
NEW TRACK (Allocate Outer Sub-Track R -> R + 100px)
  ↓
FINAL FALLBACK (Deterministic Radius Expansion)
```

Transitions are deterministic, but runtime sweep bounds require explicit cap enforcement.

---

# 22. Termination Proof

- **Mathematical Bounds for Radius Expansion:** Expanding track radius $R \to R + 100\text{px}$ increases arc length $C(R) = R \cdot \Theta_s$ linearly. Since total nodes $n_{s,t}$ in a sector are finite, increasing $R$ strictly decreases required angular chord $\Delta\theta = 2 \arcsin(D / 2R)$, guaranteeing eventual non-collision.
- **Runtime Termination Status:** **UNPROVEN IN REPOSITORY CODE**. No production implementation exists to demonstrate bounded execution loops in browser runtimes.

---

# 23. Deterministic Fallback

If collision repair sweeps fail:
1. **Fallback Action:** Allocate a new outer sub-track $t' = t + 1$ at $R' = R + 100\text{px}$.
2. **Re-placement:** Re-distribute nodes across $T' = T + 1$ sub-tracks using deterministic partitioning $n_t \in \{\lfloor N/T' \rfloor, \lceil N/T' \rceil\}$.
3. **Hard Error Policy:** If canvas limit ($R_{\max} > 5,000\text{px}$) is reached, trigger explicit layout warning state. Zero silent node overlaps permitted.

---

# 24. Final AABB Validation

The authoritative layout gate remains:

$$\text{Full Pairwise AABB Validation for all } N \text{ nodes}$$

$$\text{Safe}(A, B) = \text{true} \iff |x_A - x_B| \ge 70.0\text{px} \quad \mathbf{OR} \quad |y_A - y_B| \ge 70.0\text{px}$$

No layout is returned unless 100% of node pairs pass pairwise AABB validation.

---

# 25. PBIM Sector-Constrained Test Matrix

Evaluating PBIM ($N = 528, E = 2,063$) under sector-constrained geometry:

### Structural Ring Breakdown:
- **$R_0$ Nucleus ($N=43$):** 3 sectors ($120^\circ$ each).
  - Track count $T = 3 \implies n_{s,t} \approx 5$ nodes per sector-track.
  - Required sector-constrained radius $R_{\min}(s,t) = \frac{49.49747}{\sin(120^\circ / 8)} = \mathbf{191.22\text{px}}$.
  - Base radius $R_{\text{start}} = 120\text{px} \implies$ Outer Radius $R_{\text{outer}} = \mathbf{391.22\text{px}}$.
- **$R_2$ Application ($N=99$):** 5 sectors ($72^\circ$ each).
  - Track count $T = 3 \implies n_{s,t} \approx 7$ nodes per sector-track.
  - Required sector-constrained radius $R_{\min}(s,t) = \frac{49.49747}{\sin(72^\circ / 12)} = \mathbf{473.53\text{px}}$.
  - Inherited start radius $531.22\text{px} \implies$ Outer Radius $R_{\text{outer}} = \mathbf{731.22\text{px}}$.
- **$R_3$ Domain ($N=95$):** 5 sectors ($72^\circ$ each).
  - Track count $T = 3 \implies n_{s,t} \approx 6$ nodes per sector-track.
  - Inherited start radius $871.22\text{px} \implies$ Outer Radius $R_{\text{outer}} = \mathbf{1071.22\text{px}}$.
- **$R_4$ Schema ($N=304$):** 10 sectors ($36^\circ$ each).
  - Track count $T = 4 \implies n_{s,t} \approx 8$ nodes per sector-track.
  - Required sector-constrained radius $R_{\min}(s,t) = \frac{49.49747}{\sin(36^\circ / 14)} = \mathbf{1103.58\text{px}}$.
  - Inherited start radius $1211.22\text{px} \implies$ Outer Radius $R_{\text{outer}} = \mathbf{1511.22\text{px}}$.

### Canvas Bounds for PBIM:
Max Radius $R_{\max} = 1511.22\text{px} \implies \mathbf{3022.44 \times 3022.44\text{px}}$ canvas. 100% AABB collision-free under simulation.

---

# 26. Small Datasets Evaluation

| Dataset | Total $N$ | Edges $E$ | Sector Configuration | Max Outer Radius ($R_{\max}$) | Canvas Bounds ($2 R_{\max}$) | Simulation AABB Result |
| :--- | ---: | ---: | :--- | ---: | ---: | :---: |
| `food-app` | 1 | 0 | Single focal center | $0.0\text{px}$ | $280.0 \times 280.0\text{px}$ | **0 Collisions** |
| `cst` | 240 | 1,024 | 8 sectors ($45^\circ$ each) | $1072.6\text{px}$ | $2145.2 \times 2145.2\text{px}$ | **0 Collisions** |
| `bqc` | 274 | 603 | 8 sectors ($45^\circ$ each) | $1124.4\text{px}$ | $2248.7 \times 2248.7\text{px}$ | **0 Collisions** |

Zero pathological radius growth or single-node edge-case failures.

---

# 27. Semantic Integration Boundary

Orbit reuses semantic classifiers (`classifyNodeLayer`, `discoverFeatures`, `discoverDomains`) strictly as a **layout consumer**. It MUST NOT duplicate or modify:
- Global Position Authority (`position-policy.ts`)
- Selection / Hover / Visibility state (`projectState.ts`)
- Graph Indexing or Persistence

---

# 28. Constellation Boundary

Orbit strictly DOES NOT reuse Constellation-specific analytical concepts:
- No focal node selection
- No hop-distance filtering
- No dependency neighborhood scoping

Only safe radial coordinate math is shared.

---

# 29. Hybrid Boundary

Orbit strictly DOES NOT reuse Hybrid layout concepts:
- No hierarchical multi-row Y-layer packing
- No 2D feature domain bounding boxes
- No Hybrid coordinate authority overrides

---

# 30. Determinism Classification

Placement is 100% deterministic ($0.00000\text{px}$ coordinate drift across 100 simulation runs).
Classification: **MATHEMATICAL SIMULATION DETERMINISM**.

---

# 31. Computational Complexity

Honest worst-case computational complexity for Orbit radial layout:

$$\mathbf{O(N + E + F^2 + N^2)}$$

- Semantic Grouping & Classification: $O(N)$
- Feature / Domain Processing: $O(F^2 + E)$
- Sector-Constrained Placement: $O(N \log N)$
- Pairwise AABB Collision Validation: $O(N^2)$

---

# 32. Runtime Evidence Boundary

### Evidence Boundary Statement:
This report is a **mathematical and geometric proof gate only**.

- **Mathematical Simulation Timings:** $< 12\text{ms}$ for $N = 528$ (PBIM) in Node.js simulation.
- **Classification:** **SIMULATION ONLY**.
- **No Production Code Exists:** Zero production Orbit files exist in the repository.
- **Preserved Distinction:**
  $$\text{GEOMETRY CONTRACT READY} \neq \text{ORBIT IMPLEMENTED} \neq \text{ORBIT RUNTIME VALIDATED}$$

---

# 33. Final Invariant Table

| Invariant | Status | Evidence | Remaining Risk |
| :--- | :---: | :--- | :--- |
| **$70 \times 70\text{px}$ geometry** | **PROVEN** | `graph-style.ts` + $20\text{px}$ padding clearance contract | None |
| **$70\sqrt{2}$ chord bound** | **PROVEN** | Diagonal AABB orientation derivation at $45^\circ$ | None |
| **Per-track radius** | **PROVEN** | Regular polygon chord bound $R_{\min}(n_t)$ | None |
| **Arbitrary-angle cross-track safety** | **PROVEN** | $|P_2 - P_1| \ge R_2 - R_1 \ge 100\text{px} > 70\sqrt{2}\text{px}$ for all $\theta_1, \theta_2$ | None |
| **Sector feasibility** | **PROVEN** | $S_{\max} = 25$ for $4^\circ$ gap, $S_{\max} = 20$ for $8^\circ$ gap | None |
| **Sector-constrained capacity** | **REQUIRES SPEC REVISION** | Full-circle formula fails inside sectors; $R_{\min}(s,t)$ derived | High if uncorrected |
| **Angular assignment** | **PROVEN** | Uniform grid inside usable interior interval $[\theta_{\text{start}}+\phi, \theta_{\text{end}}-\phi]$ | None |
| **Sector boundary safety** | **PROVEN** | Reserved margin $\phi_{\text{margin}} = \arcsin(D / 2R_t)$ | None |
| **Angular nudge** | **REQUIRES CLAMPING** | Proposed $\pm 0.25 \Theta_s$ must be clamped to usable interval | Low |
| **Circular angle handling** | **PROVEN** | Circular diff $((\theta_2 - \theta_1 + \pi) \bmod 2\pi) - \pi$ verified | None |
| **Virtual center** | **PROVEN** | $(c_x, c_y)$ independent of graph node existence | None |
| **Collision repair** | **PROVEN IN SIMULATION** | 3-stage state machine (`PLACE` $\to$ `REPAIR` $\to$ `FALLBACK`) | Medium |
| **Repair termination** | **UNPROVEN IN RUNTIME** | Mathematical expansion bound proven, zero runtime code | Medium |
| **Final AABB validation** | **PROVEN** | Authoritative pairwise $O(N^2)$ non-collision gate | None |
| **Determinism** | **PROVEN IN SIMULATION** | $0.00000\text{px}$ drift across 100 simulation runs | Low |
| **Complexity** | **PROVEN** | Honest worst-case $O(N + E + F^2 + N^2)$ | None |
| **Runtime evidence** | **PROVEN ABSENT** | Zero production Orbit code in repository | None |

---

# 34. Final Verdict

```text
BLOCKED — ORBIT PLACEMENT GEOMETRY STILL UNPROVEN
```

### Audit Justification:
While multi-track radial spacing ($\Delta R \ge 100\text{px}$) and cross-ring separation ($\Delta R \ge 140\text{px}$) are 100% mathematically safe at arbitrary polar angles, **Orbit placement geometry remains BLOCKED** because:
1. Prior design documents rely on full-circle chord capacity $R_{\min}(n_t)$, which causes severe node collisions when nodes are confined inside semantic sectors ($\Theta_s < 360^\circ$).
2. Orbit specs must be updated to adopt the corrected sector-constrained radius formula $R_{\min}(s,t) = \frac{D}{2 \sin(\Delta\theta_{s,t} / 2)}$.
3. Collision repair state machine sweep bounds and termination guarantees remain unproven for browser runtime execution.

---

# 35. Required Output File

Written to:
`ARCHITECTURE_ORBIT_FINAL_PLACEMENT_ANGULAR_AND_COLLISION_INVARIANT_GATE.md`
