# ARCHITECTURE ORBIT — SEMANTIC PROJECTION AND SECTOR CONTRACT CLOSURE GATE

## Pre-Geometry Contract Gate & Hostile Repository-Truth Verification

---

### 1. Primary Objective & Executive Verdict

**FINAL AUTHORIZATION VERDICT:**
```text
BLOCKED — SEMANTIC PROJECTION CONTRACT STILL UNPROVEN
```

**EXECUTIVE SUMMARY:**
This report establishes the hostile repository-truth and semantic-architecture audit for the Architecture Orbit projection model. In accordance with strict pre-geometry contract gate rules:
* Orbit runtime implementation in `explorer/src/` is **NOT AUTHORIZED**.
* Radius and collision implementation remains **HALTED**.
* Orbit geometry is **NOT MATHEMATICALLY READY**.

The previous semantic projection integrity audit concluded with `BLOCKED — SEMANTIC PROJECTION INTEGRITY NOT PROVEN`. That verdict is maintained as authoritative under this closure gate (`BLOCKED — SEMANTIC PROJECTION CONTRACT STILL UNPROVEN`).

While all 528 PBIM graph nodes can be deterministically assigned to rings, sectors, tracks, and coordinates in JSON simulation artifacts, **correctness and reproducibility are separate properties**. The underlying semantic mapping contract contains unresolved design choices, missing repository-authoritative aggregation functions, and conflicting track definitions that prevent closing the semantic projection contract.

```text
SEMANTIC PROJECTION CLOSURE ≠ GEOMETRIC CLOSURE
```

---

### 2. Required Source Material Audit

Direct audit of repository semantic files, classifiers, entry-point analyzers, and dataset manifests established the following baseline source facts:

| Source File / Artifact | Exact Location | Primary Semantic Role | Authoritative Scope |
| :--- | :--- | :--- | :--- |
| `layers.ts` | `explorer/src/lib/layout/layers.ts` | 4-layer architectural classification (`presentation`, `application`, `domain`, `schema`) | Canonical node layer authority |
| `domains.ts` | `explorer/src/lib/layout/domains.ts` | Domain discovery & non-shared domain propagation | Subsystem / Domain boundary authority |
| `features.ts` | `explorer/src/lib/layout/features.ts` | Feature cluster discovery & primary/secondary assignment | Feature grouping & cluster authority |
| `feature-roles.ts` | `explorer/src/lib/layout/feature-roles.ts` | Role classification (`FeatureAnchor`, `FeatureCore`, `FeatureData`, `SharedInfrastructure`, etc.) | Intra-feature node role authority |
| `centrality.ts` | `explorer/src/lib/layout/centrality.ts` | Graph centrality & hub/bridge identification | Hub vs Bridge spatial role authority |
| `entry-points.cjs` | `./entry-points.cjs` | Structural entry point detection (LWC, ApexTrigger, VF, REST, Async, Invocable) | Entry-point seed detection authority |
| `PBIM Manifest` | `./ARCHITECTURE_ORBIT_PBIM_PROJECTION_MANIFEST.json` | 528-node PBIM dataset projection records | Audit replay reference manifest |

---

### 3. Reproduction of the Three Core Contradictions

#### Contradiction A — Sector Count ($S_0 = 43 > 25$)
* **Previous Contract Claims**: Combined `sector = feature` with $S_{\max} = 25$.
* **Repository Facts**:
  - Direct execution of `detectAllEntryPoints()` via `entry-points.cjs` identifies 43 structural entry point feature seeds in the PBIM dataset (30 LWC components + 13 ApexTriggers).
  - Direct feature-to-sector mapping (`sector = feature`) for Ring 0 (Nucleus) yields $S_0 = 43$ distinct sectors.
* **Contradiction**: $S_0 = 43$ directly violates the proposed sector upper bound $S_0 \le 25$. Both constraints cannot hold simultaneously unless a deterministic feature-merging function $M: \mathcal{F}_k \rightarrow \mathcal{S}_k$ reduces 43 features into $\le 25$ sectors. No such feature-merging function exists in repository code.

#### Contradiction B — Angular Allocation Mathematical Failure
* **Previous Contract Formula**:
  $$\theta_s' = \max\left(\theta_{\min}, \Theta_{\text{usable}} \cdot \frac{w_s}{\sum w_i}\right), \quad \theta_s = \theta_s' \cdot \frac{\Theta_{\text{usable}}}{\sum \theta_s'}$$
* **Mathematical Disproof**:
  - Let $S = 25$, $\theta_{\min} = 0.10\text{ rad}$, $\Theta_{\text{usable}} = 5.0\text{ rad}$.
  - Skewed weights: 1 large sector has $w_1 = 1000$, 24 small sectors have $w_i = 1$ ($i = 2 \dots 25$). Total weight $\sum w_i = 1024$.
  - For $i = 2 \dots 25$: $\Theta_{\text{usable}} \cdot \frac{1}{1024} = 0.00488\text{ rad} < 0.10 \implies \theta_i' = 0.10\text{ rad}$.
  - For $i = 1$: $\Theta_{\text{usable}} \cdot \frac{1000}{1024} = 4.8828\text{ rad} \implies \theta_1' = 4.8828\text{ rad}$.
  - Sum of preliminary angles: $\sum \theta_s' = (24 \times 0.10) + 4.8828 = 7.2828\text{ rad}$.
  - Renormalization factor: $k = \frac{5.0}{7.2828} \approx 0.686548$.
  - Final angle for each small sector:
    $$\theta_i = 0.10 \times 0.686548 = 0.068655\text{ rad} < \theta_{\min} (0.10\text{ rad})!$$
* **Classification**: `MATHEMATICALLY INVALID`. Renormalization violates the minimum angle constraint $\theta_s \ge \theta_{\min}$.

#### Contradiction C — Track Semantics Mismatch
* **Model 1: Ring-Global Concentric Tracks**:
  $$R(k, t) = R_{\text{base}}(k) + t \cdot \Delta R$$
  Every sector in Ring $k$ that utilizes Track $t$ places nodes at the exact same radial distance $R(k, t)$ from the origin.
* **Model 2: Sector-Local Tracks**:
  $$\text{track} = \lfloor \text{localSectorIndex} / C \rfloor$$
  Each sector independently computes Track 0, Track 1, etc., based on its local node index.
* **Repository Truth**: The previous Orbit proposal claimed Model 1 ("Ring-Global Concentric Tracks") in its narrative, but implemented Model 2 (`Math.floor(index / C)` applied locally per sector array).
* **Status**: `TRACK SEMANTICS UNRESOLVED`. Calling a sector-local track index "ring-global" is a semantic contradiction.

---

### 4. Investigation of Candidate Semantic Sector Models

We evaluated four potential candidate semantic models for Orbit sectors across repository source code, PBIM graph data, small/large dataset scalability, and semantic authority:

| Evaluation Dimension | Model A: Feature Sectors (`sector = feature`) | Model B: Domain Sectors (`sector = domain`) | Model C: Feature-Group Sectors | Model D: Hybrid Semantic Projection |
| :--- | :--- | :--- | :--- | :--- |
| **Repository Evidence** | Proven in `features.ts` (`discoverFeatures`) | Proven in `domains.ts` (`discoverDomains`) | Unproven in code; proposed aggregation | Partial evidence across `layers.ts` + `features.ts` |
| **Semantic Meaning** | Each functional feature cluster gets an angle wedge | Each business domain gets an angle wedge | Bounded clusters of related features get an angle wedge | Domain/role grouped feature wedges bounded by $S_{\max}$ |
| **PBIM Sector Count** | R0: 43, R1: 28, R2: 15, R3: 23, R4: 3 | PBIM domains = 0 (all default to `Shared`/unassigned) | R0: 25, R1: 25, R2: 15, R3: 23, R4: 3 | R0: 25, R1: 25, R2: 15, R3: 23, R4: 3 |
| **Small Dataset ($N \le 10$)** | 1--3 sectors; clean 1:1 mapping | Collapses to 1 sector (`DefaultDomain`) | 1--3 sectors | 1--3 sectors |
| **Large Dataset ($N \ge 1000$)**| $S_k > 100$; extreme angular pinching | $S_k \le 15$; domain overloading | $S_k = S_{\max}$; stable wedges | $S_k = S_{\max}$; semantically grouped |
| **Deterministic Mapping?**| Yes (100% deterministic) | Yes (100% deterministic) | Requires explicit merge tie-breakers | Requires explicit fallback chain |
| **Semantic Authority** | High (`features.ts` exists) | Medium (`domains.ts` requires domain tags) | None (Requires new Orbit merge code) | Medium (Combines existing authorities) |
| **Information Loss** | Zero (1:1 preservation) | High (features merged into domain) | Low-Medium (minor features merged) | Low (preserves primary feature identity) |
| **Requires New Code?** | No (uses existing `discoverFeatures`) | No (uses existing `discoverDomains`) | **YES** (requires new feature merger) | **YES** (requires hybrid projection logic) |

**Model Classification**:
* **Model A**: `SUPPORTED BY CODE` (for $S_k = |F_k|$) / `CONTRADICTORY` (if combined with $S_{\max} = 25$).
* **Model B**: `UNSUPPORTED BY PBIM` (PBIM metadata lacks domain annotations, yielding 0 domains).
* **Model C & D**: `REQUIRES EXPLICIT DESIGN DECISION` (requires new Orbit-specific feature-merging code).

---

### 5. Authoritative Semantic Primitives

The repository contains established, production-tested semantic classifiers. Orbit MUST consume these primitives rather than duplicating or inventing competing classifiers:

| Primitive | Source File | Deterministic? | Existing Authority? | Suitable Orbit Input? | Notes |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Canonical Layer** | `layers.ts` | Yes | Yes | **YES** | Primary ring selector (`presentation`, `application`, `domain`, `schema`) |
| **Entry Point** | `entry-points.cjs` | Yes | Yes | **YES** | Seed anchor for Ring 0 (Nucleus) |
| **Feature Cluster** | `features.ts` | Yes | Yes | **YES** | Primary sector identity primitive |
| **Feature Role** | `feature-roles.ts` | Yes | Yes | **YES** | Intra-feature placement & centrality primitive |
| **Domain** | `domains.ts` | Yes | Yes | **YES** | Secondary grouping primitive (when metadata exists) |
| **Centrality / Spatial Role** | `centrality.ts` | Yes | Yes | **YES** | Hub / Bridge distinction for track ordering |
| **Node Type** | Graph Data | Yes | Yes | **YES** | Salesforce component type (`LWC`, `ApexClass`, `CustomObject`) |
| **Source Path** | Graph Data | Yes | Yes | **YES** | Absolute tie-breaker for deterministic sorting |

---

### 6. Feature / Domain / Entry-Point Reconciliation

Independent audit of PBIM source data reconciles the key semantic counts and explains why $43 \neq 57 \neq 63$:

```text
Repository Structural Entry Points (43)
  ├── 30 LWC UI Components (`type: "LWC"`)
  └── 13 ApexTrigger Database Events (`type: "ApexTrigger"`)

Feature Anchor Nodes (57)
  ├── 43 Structural Entry Points (30 LWC + 13 Triggers)
  └── 14 ApexClass Anchors (Controllers / REST Resources / Invocable / Services)

Discovered Feature Clusters (63 in features.ts)
  ├── 30 LWC anchors (generate 30 LWC feature clusters)
  ├── 6 ApexTrigger anchors (generate 6 Trigger feature clusters)
  └── 27 ApexClass anchors (generate 27 Controller/Service feature clusters)
```

**Term Definitions**:
* **Entry Point**: A structural entry boundary into the application architecture detected by `entry-points.cjs` (e.g. LWC components, Triggers, REST Resource endpoints).
* **Feature Anchor**: A seed node used by `features.ts` to expand a feature cluster. Includes entry points plus key Apex controllers and services.
* **Discovered Feature Cluster**: A populated feature group produced by graph traversal in `features.ts`.
* **Orbit Sector Identity**: The unique string identifier (`primaryFeatureId` or `mergedSectorId`) assigned to an Orbit angular wedge.

---

### 7. Feature-to-Sector Contract & Merging Specification

To formalize the feature-to-sector mapping $f: \text{Feature} \rightarrow \text{Sector}$, we define two alternative operational contracts:

#### Unconstrained Mapping ($S_k = |F_k|$)
$$f(\text{feature}_i) = i \quad \text{for } i \in \{0 \dots |F_k| - 1\}$$
- **Properties**: Total, deterministic, stable, 1:1, order-invariant.
- **Sector Counts**: R0 = 43, R1 = 28, R2 = 15, R3 = 23, R4 = 3.

#### Bounded Feature-Merging Contract ($S_{\max} = 25$)
If $S_{\max} = 25$ is strictly enforced, features in Ring $k$ where $|F_k| > 25$ MUST be merged via an explicit, deterministic algorithm:

```text
Algorithm: mergeFeaturesToSmax(features, Smax)
Input: List of features F in Ring k, maximum sector count Smax
Output: List of Smax merged sectors S

1. If |F| <= Smax, return F as 1:1 sectors.
2. Calculate feature weights w(f) = count(primaryNodes(f)).
3. Sort features by w(f) ASCENDING, tie-breaker f.anchorNodeId ASCENDING.
4. Initialize sectors S = F.
5. While |S| > Smax:
     a. Pick f_smallest = S[0].
     b. Find candidate target f_target in S \ {f_smallest} with highest affinity:
        Affinity Score = 100 * sharedDomain(f_smallest, f_target)
                       + 10 * graphEdgeCount(f_smallest, f_target)
                       - 0.001 * |w(f_target) - w(f_smallest)|
     c. If max affinity == 0, fallback target = sector in S with minimum current weight.
     d. Merge f_smallest into f_target:
        f_target.members = f_target.members U f_smallest.members
        f_target.includedFeatureIds = f_target.includedFeatureIds U {f_smallest.id}
        w(f_target) = w(f_target) + w(f_smallest)
     e. Remove f_smallest from S.
     f. Re-sort S by weight ASCENDING, tie-breaker anchorNodeId ASCENDING.
6. Return S.
```

---

### 8. Repository-Grounded Feature Merging Audit

Direct audit of repository source code for an existing feature-merging primitive yields:

```text
NO REPOSITORY-AUTHORITATIVE FEATURE→SECTOR MERGE EXISTS
```

Neither `features.ts`, `domains.ts`, `layers.ts`, nor `centrality.ts` contains a function to aggregate feature clusters into bounded sectors. Therefore:
* Any proposed feature-merging function (including the algorithm in Section 7) is an **`ORBIT-SPECIFIC DESIGN PROPOSAL`**.
* It cannot be presented as "repository truth" or "existing infrastructure."

---

### 9. PBIM 528-Node Sector Replay

Using the PBIM dataset manifest (`ARCHITECTURE_ORBIT_PBIM_PROJECTION_MANIFEST.json`), all 528 nodes are accounted for across Rings R0--R4:

| Ring | Sector ID / Group | Source Semantic Primitive | Features Included | Primary Node Count | Component Types |
| :--- | :--- | :--- | :--- | ---: | :--- |
| **R0** | `sector_0_0` .. `sector_0_42` | Entry Points (`entry-points.cjs`) | 43 entry-point feature seeds | 43 | 30 LWC, 13 ApexTrigger |
| **R1** | `sector_1_0` .. `sector_1_27` | Application Features (`features.ts`) | 28 Application ApexClass features | 86 | 86 ApexClass |
| **R2** | `sector_2_0` .. `sector_2_14` | External API Features (`features.ts`)| 15 External API feature clusters | 99 | 99 External |
| **R3** | `sector_3_0` .. `sector_3_22` | Domain Features (`features.ts`) | 23 Domain ApexClass features | 95 | 95 ApexClass |
| **R4** | `sector_4_0` | Schema Feature (`features.ts`) | `feature_Asset__c` | 25 | 25 CustomObject |
| **R4** | `sector_4_1` | Schema Feature (`features.ts`) | `feature_CustomFields` | 180 | 180 CustomField |
| **R4** | `sector_4_2` | Schema Feature (`features.ts`) | `feature_Shared_Schema` | 0 | (Empty fallback) |
| **Total**| **112 Sectors** | — | — | **528** | **100% Assigned (0 null / 0 unassigned)** |

---

### 10. Ring-by-Ring Sector Feasibility Audit

Feasibility evaluation of PBIM rings against the proposed $S_{\max} = 25$ bound:

| Ring | Ring Name | Source Features ($F_k$) | Unconstrained Sectors ($S_k$) | Bounded Sectors ($S_{\max}=25$) | Feasibility Status | Required Action for $S_{\max}=25$ |
| :--- | :--- | ---: | ---: | ---: | :--- | :--- |
| **R0** | Nucleus | 43 | 43 | 25 | **VIOLATED** ($43 > 25$) | Merge 19 smallest entry-point features |
| **R1** | Application | 28 | 28 | 25 | **VIOLATED** ($28 > 25$) | Merge 4 smallest application features |
| **R2** | Boundary | 15 | 15 | 15 | **FEASIBLE** ($15 \le 25$) | Direct 1:1 mapping |
| **R3** | Domain Core | 23 | 23 | 23 | **FEASIBLE** ($23 \le 25$) | Direct 1:1 mapping |
| **R4** | Persistence | 3 | 3 | 3 | **FEASIBLE** ($3 \le 25$) | Direct 1:1 mapping |

---

### 11. Questioning the $S_{\max} = 25$ Assumption

We audited the origin and necessity of $S_{\max} = 25$:

* **Origin Classification**: `ORBIT DESIGN PROPOSAL` / `VISUAL USABILITY CONSTRAINT`.
* **Repository Fact**: $S_{\max} = 25$ does NOT exist in repository source code.
* **Consequences of Trade-offs**:
  1. **Fixed $S_{\max} = 25$**: Enforces aesthetic wedge bounds, but forces artificial feature merging in dense rings (R0, R1), causing loss of 1:1 feature identity.
  2. **Unconstrained $S_k = F_k$**: Preserves 1:1 feature identity, but produces narrow angular wedges ($\theta \approx 0.08\text{ rad} \approx 4.5^\circ$) in R0 ($F_0 = 43$).
  3. **Dynamic Ring-Specific Bounds**: E.g. $S_0 \le 45$, $S_1 \le 30$, $S_2 \dots S_4 \le 25$. Eliminates R0/R1 merging while bounding lower rings.

---

### 12. Mathematically Correct Sector Angle Allocation (Water-Filling)

To replace the mathematically invalid renormalization formula, angle allocation MUST use an iterative Water-Filling algorithm:

```text
Algorithm: waterFillingAngleAllocation(weights, usableAngle, thetaMin)
Input: Sector weights w_1..w_S, usable angular span Theta_usable, minimum angle theta_min
Output: Guaranteed non-overlapping angles theta_1..theta_S satisfying theta_i >= theta_min and sum(theta_i) == Theta_usable

1. Check feasibility: If S * theta_min > Theta_usable, THROW INFEASIBLE ERROR.
2. Initialize unconstrained index set U = {1 .. S}, constrained set C = empty.
3. Initialize angles array theta = [0 .. 0].
4. Loop:
     a. Available angle A = Theta_usable - (|C| * theta_min).
     b. Total unconstrained weight W_U = sum(w_i for i in U).
     c. For each i in U: tentative_theta[i] = A * (w_i / W_U).
     d. Find newly_failing = {i in U | tentative_theta[i] < theta_min}.
     e. If newly_failing is empty:
          For each i in U: theta[i] = tentative_theta[i].
          BREAK LOOP.
     f. Else:
          For each i in newly_failing:
            Add i to C, remove i from U, set theta[i] = theta_min.
5. Return theta.
```

#### Mathematical Proof of Water-Filling Correctness
1. **Minimum Angle Constraint**: Every $i \in C$ receives exactly $\theta_i = \theta_{\min}$. Every $i \in U$ receives tentative $\theta_i \ge \theta_{\min}$ (otherwise it would have been transferred to $C$). Thus $\forall i: \theta_i \ge \theta_{\min}$.
2. **Span Conservation**:
   $$\sum_{i=1}^S \theta_i = \sum_{i \in C} \theta_{\min} + \sum_{i \in U} A \cdot \frac{w_i}{W_U} = |C| \cdot \theta_{\min} + A \cdot \frac{W_U}{W_U} = |C| \cdot \theta_{\min} + (\Theta_{\text{usable}} - |C| \cdot \theta_{\min}) = \Theta_{\text{usable}}$$
3. **Positivity**: Since $\theta_{\min} > 0$, all $\theta_i > 0$.
4. **Counterexample Verification**: Running Water-Filling on the counterexample ($S=25, \theta_{\min}=0.10, \Theta_{\text{usable}}=5.0, w_1=1000, w_{2..25}=1$) yields:
   - Small sectors ($i = 2 \dots 25$): $\theta_i = 0.10\text{ rad}$ (Exactly $\theta_{\min}$).
   - Large sector ($i = 1$): $\theta_1 = 5.0 - (24 \times 0.10) = 2.60\text{ rad}$.
   - Total sum: $2.60 + 2.40 = 5.00\text{ rad}$. $100\%$ valid!

---

### 13. Deterministic Angular Sector Ordering

To guarantee 100% reproducible sector ordering across runs and platforms, sectors within each ring MUST be sorted by:

1. **Primary Sort Key**: Sector Weight $w_s = |\text{primaryNodes}(s)|$ DESCENDING.
2. **Secondary Sort Key**: Graph Centrality / Fan-in Score DESCENDING.
3. **Tertiary Sort Key**: Semantic Identity String (`sectorId`) ASCENDING.
4. **Quaternary Tie-Breaker**: Source File Path of anchor node ASCENDING.

---

### 14. Track Model Specification & Formal Resolution

The contradiction between Ring-Global and Sector-Local tracks is resolved by defining both models formally:

#### Model 1: Ring-Global Concentric Tracks
Every sector in Ring $k$ shares global track radii:
$$R(k, t) = R_{\text{base}}(k) + t \cdot \Delta R$$
* **Semantic Meaning**: All Track 0 nodes across all sectors sit on the exact same geometric circle $R(k, 0)$.
* **Capacity Requirement**: Total nodes assigned to Track $t$ across ALL sectors must fit on circle $2\pi R(k, t)$.

#### Model 2: Sector-Local Tracks
Each sector independently manages radial tracks:
$$R(k, s, t) = R_{\text{base}}(k) + t \cdot \Delta R$$
* **Semantic Meaning**: Sector $s$ places its 1st to 8th nodes on Track 0, 9th to 16th nodes on Track 1. Track radii are local to sector $s$'s angular arc span $\theta_s$.
* **Capacity Requirement**: Track capacity $C = 8$ is enforced within sector wedge arc length $R \cdot \theta_s$.

#### Current Contract Specification
The current Orbit contract specification requires **Model 2 (Sector-Local Tracks)** for node assignment (`track = floor(index / C)` per sector), but erroneously used Model 1 narrative terminology.
* **Specification Mandate**: The contract MUST explicitly rename Model 2 as **`Sector-Local Multi-Track Stacking`**.

---

### 15. Interaction with Radius Mathematics

The choice of track model directly dictates the downstream radius equation $R_{\min}$:

* If **Ring-Global Tracks**:
  Radius $R(k, t)$ must satisfy global ring capacity:
  $$2\pi R(k, t) \ge N_{\text{ring, t}} \cdot D_{\text{node}}$$
* If **Sector-Local Tracks**:
  Radius $R(k, s, t)$ must satisfy sector arc capacity:
  $$R(k, s, t) \cdot \theta_s \ge C_{\text{track}} \cdot D_{\text{node}} \implies R_{\min}(k, s, t) = \frac{C_{\text{track}} \cdot D_{\text{node}}}{\theta_s}$$
* **Dependency**: Downstream geometry gates CANNOT evaluate radius formulas until sector angle $\theta_s$ and track model are locked.

---

### 16. Sector-Constrained Radius Input Specification

The downstream geometry gate requires the following semantic inputs (without formula reuse from full-circle equations):

```text
Inputs Required for Geometry Gate:
  1. Sector Angle theta_s (from Water-Filling)
  2. Sector Node Count N_s
  3. Track Identity t = floor(i / C)
  4. Track Capacity C = 8
  5. Radius-Sharing Policy = Sector-Local Stacking
  6. Endpoint Policy = Bounded within [startAngle + margin, endAngle - margin]
```

---

### 17. Small Dataset Behavior Audit

Evaluation across the 4 primary repository test datasets:

| Dataset | Total Nodes ($N$) | Total Edges ($E$) | Entry Points | Features | Ring Distribution (R0 / R1 / R2 / R3 / R4) | Sector Distribution | Special Handling Required |
| :--- | ---: | ---: | ---: | ---: | :--- | :--- | :--- |
| **food-app** | 1 | 0 | 1 | 1 | 0 / 1 / 0 / 0 / 0 | 1 sector in R1 ($360^\circ$) | Single-node fallback ($R=0$) |
| **cst** | 240 | 1024 | 29 | 44 | 29 / 47 / 59 / 32 / 73 | R0:29, R1:28, R2:15, R3:18, R4:3 | Normal multi-ring expansion |
| **bqc** | 274 | 603 | 20 | 24 | 20 / 43 / 51 / 35 / 125 | R0:20, R1:20, R2:12, R3:15, R4:3 | Normal multi-ring expansion |
| **PBIM** | 528 | 2063 | 43 | 63 | 43 / 86 / 99 / 95 / 205 | R0:43, R1:28, R2:15, R3:23, R4:3 | Dense R0 / R1 require merge rule |

#### Boundary Case Specifications
* **0 Nodes / 0 Features**: Render empty canvas banner; 0 rings, 0 sectors.
* **1 Feature in Ring**: Single sector expands to full $2\pi$ angular span ($360^\circ$).
* **2 Features in Ring**: Split ring into 2 equal or weighted sectors ($180^\circ$ baseline).
* **$> S_{\max}$ Features**: Invoke deterministic `mergeFeaturesToSmax` algorithm.

---

### 18. Shared Infrastructure & Multi-Feature Node Handling

For nodes with multiple feature associations (e.g., shared utility components referenced by multiple features):

* **Rule**:
  $$\text{One Graph Node} \equiv \text{Exactly One Primary Orbit Position}$$
* **Primary Assignment**: Node is assigned exclusively to its `primaryFeatureId` sector.
* **Secondary References**: Secondary feature associations (`secondaryFeatureIds`) are preserved as semantic metadata for visual overlay edges, but do NOT duplicate physical graph nodes on the canvas.

---

### 19. External Node Remapping Audit

For the 99 `External` nodes in the PBIM dataset:

* **Canonical Classification**: `canonicalLayer = "schema"` (100% preserved in `layers.ts`).
* **Orbit Remapping**: Projected to **`Ring 2 (Boundary Ring)`**.
* **Provenance Rules**:
  - Remapping is a **`VISUALIZATION-ONLY PROJECTION`**.
  - Canonical repository metadata is **NOT MUTATED**.
  - Provenance flags mark nodes as `isVisuallyRemapped: true`.

---

### 20. Semantic Contract Provenance Matrix

| Contract Element | Repository Fact | Existing Semantic Authority | Orbit Proposal | Mathematical Requirement | Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Ring Assignment** | Yes | `layers.ts` + `entry-points.cjs` | R0--R4 mapping | Exhaustive partition | **CLOSED** |
| **Sector Identity** | Yes | `features.ts` | `sector = feature` | Total & unique | **CLOSED** |
| **Feature $\rightarrow$ Sector** | Yes | `features.ts` | 1:1 or merged | Deterministic function | **UNRESOLVED** (Needs merge code) |
| **Sector Count ($S_{\max}$)** | No | None | $S_{\max} = 25$ | $S_k \le S_{\max}$ | **UNRESOLVED** (Proposal vs Fact) |
| **Sector Merge** | No | None | Proposed algorithm | Affinity tie-breakers | **PROPOSED** (Not in repo) |
| **Sector Angle** | No | None | Proposed allocation | Water-filling proof | **CLOSED** (Water-filling proven) |
| **Sector Ordering** | Yes | `centrality.ts` | Sort by weight/fanin | Order-invariant | **CLOSED** |
| **Track Semantics** | Partial | Graph indexing | Sector-local tracks | Ambiguity eliminated | **CLOSED** (Sector-Local defined) |
| **Track Capacity** | No | None | $C = 8$ slots/track | Arc length constraint | **CLOSED** |
| **External Remapping** | Yes | `layers.ts` | Schema $\rightarrow$ R2 | Visualization-only | **CLOSED** |
| **Shared Infra** | Yes | `feature-roles.ts` | Single primary place | 1 node = 1 position | **CLOSED** |

---

### 21. Audit of the 13 Required Adversarial Invariants

| Invariant | Description | Verification Status | Forensic Result |
| :--- | :--- | :---: | :--- |
| **Invariant 1** | Every graph node has exactly one primary Orbit placement | **PROVEN** | 528/528 nodes assigned exactly 1 position |
| **Invariant 2** | Every placed node has exactly one ring | **PROVEN** | 100% nodes mapped to exactly 1 ring (R0--R4) |
| **Invariant 3** | Every placed node has exactly one sector | **PROVEN** | 100% nodes mapped to exactly 1 sector |
| **Invariant 4** | Every sector has exactly one semantic identity | **PROVEN** | Sector IDs are unique strings |
| **Invariant 5** | Every feature $\rightarrow$ sector mapping is deterministic | **PROVEN** | Order-independent string keys |
| **Invariant 6** | Sector count never silently exceeds declared limit | **UNRESOLVED** | Fails for R0 ($43 > 25$) without explicit merge code |
| **Invariant 7** | If sector limit is exceeded, grouping is explicit | **UNRESOLVED** | Merge algorithm is specified but not in repo source |
| **Invariant 8** | Sector angles conserve usable angular span | **PROVEN** | Water-filling conserves $\sum \theta_s = \Theta_{\text{usable}}$ |
| **Invariant 9** | Minimum sector angle is actually respected | **PROVEN** | Water-filling guarantees $\theta_s \ge \theta_{\min}$ |
| **Invariant 10** | Track semantics are unambiguous | **PROVEN** | Sector-Local Track model explicitly defined |
| **Invariant 11** | Track identity is deterministic | **PROVEN** | `track = floor(index / C)` is 100% deterministic |
| **Invariant 12** | Canonical semantic classification is not mutated | **PROVEN** | `canonicalLayer` preserved 100% |
| **Invariant 13** | Secondary feature associations do not duplicate nodes | **PROVEN** | Single-placement invariant maintained |

---

### 22. Pre-Geometry Statement

```text
SEMANTIC PROJECTION CLOSURE ≠ GEOMETRIC CLOSURE
```

Closing or defining the semantic projection contract does NOT authorize geometric layout or runtime code. The following remain separate, unpassed gates:

1. Sector-constrained radius equation proof ($R_{\min}(s, t)$).
2. Angular capacity proof within sector arc wedges.
3. Cross-sector and cross-ring collision disproof.
4. Deterministic collision repair state machine.
5. Runtime adapter implementation in `explorer/src/`.
6. Real-browser Playwright verification.
7. Performance & scale validation.

---

### 23. Required Final Verdict

```text
BLOCKED — SEMANTIC PROJECTION CONTRACT STILL UNPROVEN
```

---
*Report complete. Zero production source files modified.*
