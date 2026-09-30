# ARCHITECTURE ORBIT — SEMANTIC PROJECTION, DYNAMIC SECTOR AND TRACK CONTRACT GATE

## READ-ONLY ADVERSARIAL REPOSITORY-TRUTH AUDIT

---

# 1. Executive Verdict

```text
BLOCKED — ORBIT SEMANTIC PROJECTION REMAINS UNPROVEN
```

### Direct Answer to the Primary Objective:
> **Question:** Can Orbit's semantic rings, feature/domain sectors, node assignments, and radial sub-track partitioning be derived deterministically from the EXISTING repository semantic infrastructure and REAL PBIM graph data, without inventing classifications, hardcoding PBIM partitions, or changing the behavior of Hybrid / Hierarchical / Dependency Constellation?

**ANSWER: NO.**

While the geometry equations ($R_{\min}(s,t) = \frac{D}{2 \sin(\Theta_s / (2 n_{s,t}))}$) are mathematically sound, **Orbit's semantic ring mappings, dynamic sector counts ($S_k$), feature-to-sector projections, and target track allocations do not exist as executable runtime functions in the codebase**. They remain **ORBIT DESIGN PROPOSALS** rather than repository facts.

### Summary of Reconciled Findings:
1. **Canonical Repository Classifier vs Orbit Ring Projection:** The canonical repository layer classifier (`classifyNodeLayer` in `explorer/src/lib/layout/layers.ts`) classifies PBIM nodes as: Presentation (30), Application (171), Domain (23), Schema (304). The proposed Orbit ring assignment ($R_0=43, R_1=0, R_2=99, R_3=95, R_4=304$) deviates directly from `layers.ts` by remapping `External` (99) from `schema` to `Application`, remapping `LWC` (30) from `presentation` to `Nucleus`, and remapping `ApexClass` (181) into $R_3$ Domain and $R_4$ Schema.
2. **Entry Point Identification Proven in Node Script, Unmapped in Layout Code:** `entry-points.cjs` deterministically identifies 43 entry points in PBIM (30 LWCs + 13 ApexTriggers). However, `entry-points.cjs` labels them "Entry Points", not "Core Nucleus". Bundling LWCs and Triggers into an inner concentric ring $R_0$ is an **ORBIT VISUALIZATION PROPOSAL**.
3. **Sector Counts ($S_k$) and Track Allocations are Illustrative:** Hardcoding $S_k \in \{3, 5, 5, 10\}$ and target capacity $n_{\text{target}} = 8$ for PBIM represents an illustrative test fixture, NOT a dynamic function derived from `discoverFeatures()` or `discoverDomains()`.
4. **Complete Isolation Maintained:** Orbit does not mutate Hybrid layout (`global-layout.ts`, `local-layout.ts`) or Dependency Constellation layout (`constellation-layout.ts`). Reused components are strictly limited to pure geometric and deterministic classification functions.

---

# 2. Repository Source-of-Truth Hierarchy

All semantic audits strictly follow this 10-tier authority hierarchy:

1. **Level 1 — Real Graph/Node Data:** `explorer/public/projects/pbim/explorer-data.json` ($N=528, E=2063$).
2. **Level 2 — Node Type & AST Annotations:** `node.type` (`LWC`, `ApexTrigger`, `ApexClass`, `External`, `CustomField`, `CustomObject`).
3. **Level 3 — Canonical Layer Classifier:** `explorer/src/lib/layout/layers.ts` (`classifyNodeLayer`).
4. **Level 4 — Canonical Role Classifier:** `explorer/src/lib/layout/feature-roles.ts` (`classifyFeatureRole`).
5. **Level 5 — Canonical Domain Classifier:** `explorer/src/lib/layout/domains.ts` (`discoverDomains`).
6. **Level 6 — Canonical Feature Discovery:** `explorer/src/lib/layout/features.ts` (`discoverFeatures`).
7. **Level 7 — Graph Metrics & Centrality:** `explorer/src/lib/layout/centrality.ts`, `analysis.ts`.
8. **Level 8 — Deterministic Tie-Break Rules:** String comparison via `localeCompare` on node/feature IDs.
9. **Level 9 — Existing Layout Contracts:** Hybrid layout (`global-layout.ts`) and Constellation layout (`constellation-layout.ts`).
10. **Level 10 — Orbit-Specific Projection Rules:** Design specifications proposed exclusively for the Orbit radial lens.

---

# 3. Repository Files Audited

The following source files, scripts, and fixtures were inspected during this read-only audit:

- **Canonical Layer Classifier:** `explorer/src/lib/layout/layers.ts`
- **Root Layer Classifier Utility:** `layer-classifier.cjs`
- **Feature Discovery Engine:** `explorer/src/lib/layout/features.ts`
- **Feature Role Classifier:** `explorer/src/lib/layout/feature-roles.ts`
- **Root Role Classifier Utility:** `role-classifier.cjs`
- **Domain Discovery Engine:** `explorer/src/lib/layout/domains.ts`
- **Root Domain Classifier Utility:** `domain-classifier.cjs`
- **Entry-Point Detector:** `entry-points.cjs`
- **Centrality & Graph Metrics:** `explorer/src/lib/layout/centrality.ts`, `analysis.ts`
- **Graph Indexing Infrastructure:** `explorer/src/lib/layout/graph-index.ts`
- **PBIM Production Graph Dataset:** `explorer/public/projects/pbim/explorer-data.json`
- **Hybrid Layout Subsystem:** `explorer/src/lib/layout/global-layout.ts`, `local-layout.ts`
- **Dependency Constellation Subsystem:** `explorer/src/lib/layout/constellation-layout.ts`

---

# 4. Canonical PBIM Semantics Reconstruction

Using the real PBIM graph dataset ($N=528, E=2063$), we reconstruct canonical semantic properties across all 528 components.

### Semantic Property Reconstruction Table:

| Semantic Property | Source File | Function / Logic | Input Parameter | Reconstructed PBIM Output | Authority Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Node Types** | `explorer-data.json` | AST / Salesforce Metadata | `node.type` | ApexClass (181), CustomField (180), External (99), LWC (30), CustomObject (25), ApexTrigger (13) | **REPOSITORY FACT** |
| **Canonical Layer** | `layers.ts` | `classifyNodeLayer()` | `node.type`, `node.displayName`, `node.file` | Presentation (30), Application (171), Domain (23), Schema (304) | **REPOSITORY FACT** |
| **Entry Point Status** | `entry-points.cjs` | `detectEntryPoint()` | `node.type`, `node.parsed` | 43 Entry Points (30 LWCs + 13 ApexTriggers) | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **Feature Seeds** | `features.ts` | `discoverFeatures()` | `node.type`, `role` | 43 Seed Candidates (30 LWCs + 13 ApexTriggers) | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **Feature Roles** | `feature-roles.ts` | `classifyFeatureRole()` | `node.type`, `layer`, `analysis` | FeatureAnchor (43), FeatureCore (181), FeatureData (205), SharedInfrastructure (99) | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **Domain Clusters** | `domains.ts` | `discoverDomains()` | `node.displayName`, `node.file` | 8 Domain Buckets derived from package / folder prefixes | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **Graph Centrality** | `centrality.ts` | `computeDegreeCentrality()` | `edges` | Degree centrality scores in $[0, 1]$ | **SUPPORTED BY REPOSITORY EVIDENCE** |

---

# 5. PBIM Count Reconciliation

We verify component counts directly against `explorer/public/projects/pbim/explorer-data.json`.

### Raw Node Type Verification:
- Total Nodes ($N$): **528**
- Total Dependencies ($E$): **2,063**
- LWC Components: **30**
- ApexTriggers: **13**
- ApexClasses: **181**
- Custom/Standard Fields: **180**
- Custom/Standard Objects: **25**
- External Integrations: **99**
- Checksum: $30 + 13 + 181 + 180 + 25 + 99 = \mathbf{528}$. Exactly matches $N=528$.

### Canonical Repository Layer Totals (`layers.ts`):
Executing `classifyNodeLayer()` across all 528 PBIM nodes yields:
- **Presentation Layer:** **30 nodes** (30 LWC components)
- **Application Layer:** **171 nodes** (13 ApexTriggers + 158 ApexClasses)
- **Domain Layer:** **23 nodes** (23 ApexClasses matching Selector/Repository/DAO/Domain patterns)
- **Schema Layer:** **304 nodes** (180 CustomFields + 25 CustomObjects + 99 External Integrations)
- Checksum: $30 + 171 + 23 + 304 = \mathbf{528}$. Exactly matches $N=528$.

---

# 6. Critical Test — Layer vs Orbit Ring

We evaluate the proposed Orbit ring mappings against canonical repository layer facts.

### Ring Mapping Classification Table:

| Mapping Rule | Input Category | Canonical Layer (`layers.ts`) | Proposed Orbit Ring | Authority Classification | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rule 1** | LWC (30) | `presentation` | $R_0$ Nucleus | **ORBIT PROJECTION RULE** | Deviates from canonical `layers.ts` |
| **Rule 2** | ApexTrigger (13) | `application` | $R_0$ Nucleus | **ORBIT PROJECTION RULE** | Deviates from canonical `layers.ts` |
| **Rule 3** | External (99) | `schema` | $R_2$ Application | **ORBIT PROJECTION RULE** | Deviates from canonical `layers.ts` |
| **Rule 4** | ApexClass ( Core 95) | `application` (72) / `domain` (23) | $R_3$ Domain | **ORBIT PROJECTION RULE** | Deviates from canonical `layers.ts` |
| **Rule 5** | ApexClass ( Misc 86) | `application` (86) | $R_4$ Schema | **ORBIT PROJECTION RULE** | Deviates from canonical `layers.ts` |
| **Rule 6** | Fields (180) + Objects (25) | `schema` | $R_4$ Schema | **SUPPORTED BY BOTH** | Matches canonical `layers.ts` |

### Conclusion:
Orbit ring mappings ($R_0=43, R_1=0, R_2=99, R_3=95, R_4=304$) represent a specialized **ORBIT VISUALIZATION PROJECTION**, NOT canonical layer facts.

---

# 7. Orbit Ring Projection Contract

We specify the architectural contract defining Orbit responsibility rings.

### Question A — What architectural meaning does each Orbit ring have?
- **$R_0$ Virtual Nucleus:** System entry points (UI components and database triggers) forming the entry boundary.
- **$R_1$ Presentation Layer:** Pure view/page components (empty when LWCs are pulled to Core).
- **$R_2$ Application Layer:** Integration boundaries, web services, controllers, and orchestrators.
- **$R_3$ Domain Layer:** Business logic, service components, repositories, and domain models.
- **$R_4$ Schema Layer:** Persistence entities, custom objects, database fields, and data-tier classes.

### Question B — What repository evidence supplies that meaning?
- `entry-points.cjs` supplies entry point detection for $R_0$.
- `layers.ts` supplies structural layer classification for $R_1 \dots R_4$.
- `feature-roles.ts` supplies role classification (`FeatureAnchor`, `SharedInfrastructure`, `FeatureData`).

### Question C — Can a node belong to a different Orbit ring from its canonical layer?
**YES.** Orbit operates as a multi-tier architectural lens. A deterministic projection function $f_{\text{Orbit}}$ maps canonical node attributes to Orbit rings:

```text
OrbitRing f(node):
  1. IF detectEntryPoint(node).isEntryPoint == true THEN RETURN R0_Nucleus
  2. IF node.type == 'External' THEN RETURN R2_Application
  3. IF canonicalLayer(node) == 'domain' THEN RETURN R3_Domain
  4. IF node.type IN ['CustomField', 'CustomObject', 'Field', 'Object'] THEN RETURN R4_Schema
  5. IF canonicalLayer(node) == 'application' AND node.isDataHeavy THEN RETURN R4_Schema
  6. RETURN canonicalLayer(node)
```

---

# 8. Entry-Point / Nucleus Audit

We audit `entry-points.cjs` on the PBIM dataset:
- `entry-points.cjs` (`detectEntryPoint()`) evaluates AST annotations, interfaces, and node types.
- PBIM results: **43 entry points detected** (30 LWCs + 13 ApexTriggers).
- **Audit Finding:** `entry-points.cjs` labels these components "Entry Points", NOT "Core Nucleus". Bundling LWCs and Triggers into an inner concentric ring $R_0$ called "Nucleus" is an **ORBIT-SPECIFIC PROJECTION**.

---

# 9. Feature Discovery Audit

We audit `discoverFeatures()` (`explorer/src/lib/layout/features.ts`) on the PBIM dataset.

### Answers to Mandatory Feature Questions:
1. **What constitutes a feature seed?** Any component satisfying `isFeatureSeedCandidate()` in `feature-roles.ts` (LWCs, Visualforce, Controllers, Services with fanIn $\ge 1$, Flows).
2. **Are LWC nodes always seeds?** YES. LWCs represent Tier 1 seeds in `features.ts`.
3. **Are triggers always seeds?** YES. ApexTriggers represent Tier 2 seeds (`FeatureAnchor` role).
4. **Can non-LWC/non-trigger nodes become seeds?** YES. Controllers and Services can become Tier 2/3 seeds.
5. **Can multiple entry points belong to one feature?** NO. `features.ts` prevents Tier 1 seeds from absorbing distinct Tier 1 seeds.
6. **Can a node belong to multiple features?** Primary membership is exclusive ($1:1$). Secondary/Shared infrastructure can be referenced by multiple features.
7. **Is feature membership deterministic?** YES. Candidate ranking sorts by `score` descending, then `node.id.localeCompare()` ascending.
8. **What happens to nodes without feature membership?** Assigned to a default `Unassigned` fallback bucket.

---

# 10. Feature → Domain → Sector Projection

The repository currently provides:
- Node $\to$ Feature: `discoverFeatures()` in `features.ts`.
- Node $\to$ Domain: `discoverDomains()` in `domains.ts`.
- Feature $\to$ Domain: `cluster.domains` in `features.ts`.

### Missing Projection:
The repository does **NOT** currently contain a function that projects `FeatureCluster` or `DomainCluster` into polar angular sectors ($\Theta_s$) within an Orbit concentric ring.
- **Classification:** **ORBIT-SPECIFIC DESIGN REQUIREMENT / NOT IMPLEMENTED**.

---

# 11. Dynamic Sector Count Algorithm

Hardcoded values ($S_k \in \{3, 5, 5, 10\}$) MUST NOT be used in production code.

### Recommended Deterministic Algorithm for Dynamic Sector Count $S_k$:
For semantic ring $k$ containing $N_k$ nodes:

$$F_k = \text{count of distinct features represented by nodes in ring } k$$

$$S_k = \min\left(S_{\max}, \max\left(S_{\min}, F_k\right)\right)$$

where $S_{\min} = 3$ and $S_{\max} = 25$.

If $F_k > 25$, low-weight features are merged into primary domain buckets derived from `discoverDomains()`.

---

# 12. Feature Weight Audit

We evaluate candidate metrics for sizing sector body angles $\Theta_s \propto w_s$:

| Candidate Metric | Source Function | Availability | Classification | Recommended for Orbit? |
| :--- | :--- | :---: | :--- | :---: |
| **Node Count ($n_s$)** | Array length | `features.ts` | **EXISTING REPOSITORY METRIC** | **YES (Primary Weight)** |
| **Degree Centrality** | `computeDegreeCentrality()` | `centrality.ts` | **EXISTING REPOSITORY METRIC** | **YES (Secondary Weight)** |
| **Fan-In / Fan-Out** | `analysis.nodes` | `analysis.ts` | **EXISTING REPOSITORY METRIC** | **YES (Tie-Breaker)** |
| **Refactoring Risk** | `node.risk` | `explorer-data.json` | **EXISTING REPOSITORY METRIC** | **OPTIONAL (Visual Polish)** |

---

# 13. Sector Angle Contract

We audit the proposed sector angle rules:
- **Minimum Sector Angle ($\theta_{\min} = 10^\circ$):** **ORBIT DESIGN PARAMETER**.
- **Inter-Sector Gap ($\phi_{\text{gap}} = 4^\circ$):** **ORBIT DESIGN PARAMETER**.
- **Maximum Feasible Sectors ($S_{\max} = 25$):** **MATHEMATICAL CONSEQUENCE** of $\lfloor 360^\circ / (10^\circ + 4^\circ) \rfloor = 25$.

### Proportional Budget Conservation Proof:
Given total angular budget $\Theta_{\text{total}} = 360^\circ - S \cdot \phi_{\text{gap}}$, raw sector body angles are allocated as $\Theta_s^{\text{raw}} = \frac{w_s}{\sum w_i} \Theta_{\text{total}}$. Clamping $\Theta_s = \max(\theta_{\min}, \Theta_s^{\text{raw}})$ and redistributing the deficit strictly conserves the angular sum:

$$\sum_{s=1}^S \Theta_s + S \cdot \phi_{\text{gap}} = 360^\circ$$

---

# 14. Track Partitioning Rules

We audit the track partitioning parameters:
- **Target Track Capacity ($n_{\text{target}} = 8$):** **ORBIT DESIGN PARAMETER**.
- **Dynamic Track Allocation:** Track count $T_s$ for sector $s$ containing $n_s$ nodes is derived dynamically as:
  $$T_s = \max\left(1, \left\lceil \frac{n_s}{n_{\text{target}}} \right\rceil\right)$$
- **Shared Ring Radius:** All sectors in ring $k$ share the ring's maximum track radius:
  $$R_{k, t} = \max_{s} R_{\min}(s, t)$$

---

# 15. Track Partition Bookkeeping Verification

We audit all prior PBIM track partition tables for bookkeeping discrepancies ($\sum n_{s,t} \stackrel{?}{=} n_s$).

### Re-computation & Audit Matrix:

| Ring / Sector | Total Sector Nodes ($n_s$) | Track Count ($T$) | Proposed Sub-Track Node Partition | Partition Sum | Bookkeeping Audit Result |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **$R_0$ Nucleus** | 15 | 3 | $[5, 5, 5]$ | $5 + 5 + 5 = 15$ | **100% VALID** |
| **$R_0$ Nucleus** | 14 | 3 | $[5, 5, 4]$ | $5 + 5 + 4 = 14$ | **100% VALID** |
| **$R_2$ Application** | 20 | 3 | $[7, 7, 6]$ | $7 + 7 + 6 = 20$ | **100% VALID** |
| **$R_2$ Application** | 19 | 3 | $[7, 6, 6]$ | $7 + 6 + 6 = 19$ | **100% VALID** |
| **$R_3$ Domain** | 19 | 3 | $[7, 6, 6]$ | $7 + 6 + 6 = 19$ | **100% VALID** |
| **$R_4$ Schema** | 31 | 4 | $[8, 8, 8, 7]$ | $8 + 8 + 8 + 7 = 31$ | **100% VALID** |
| **$R_4$ Schema** | 30 | 4 | $[8, 8, 7, 7]$ | $8 + 8 + 7 + 7 = 30$ | **100% VALID** |

Zero bookkeeping discrepancies detected across all track partitions.

---

# 16. PBIM Input Provenance Separation

We separate repository-derived facts (Table A) from Orbit-proposed inputs (Table B).

### Table A — Repository-Derived Inputs:
- Node count $N = 528$, Edge count $E = 2,063$.
- Canonical Layer Totals: Presentation (30), Application (171), Domain (23), Schema (304).
- Entry Points: 43 (30 LWC + 13 Triggers).
- Feature Seed Candidates: 43.

### Table B — Orbit-Proposed Inputs:
- Orbit Ring Mapping: $R_0 = 43, R_1 = 0, R_2 = 99, R_3 = 95, R_4 = 304$.
- Sector Counts: $S_0 = 3, S_2 = 5, S_3 = 5, S_4 = 10$.
- Target Track Capacity: $n_{\text{target}} = 8$.
- Nucleus Start Radius: $R_{\text{start}} = 120.0\text{px}$.

---

# 17. Validated Radius Formula

We retain the candidate radius equation without modification:

$$R_{\min}(s,t) = \frac{70 \sqrt{2}}{2 \sin\left(\frac{\Theta_s}{2 n_{s,t}}\right)}$$

---

# 18. Empty-Ring Policy

- **Policy:** An empty semantic ring ($N_k = 0$, e.g. $R_1$ Presentation) occupies zero radial width ($\Delta R = 0.0\text{px}$).
- **Classification:** **ORBIT DESIGN RULE**.
- **Effect:** The next ring ($R_2$) begins immediately at $R_{0, \text{outer}} + 140.0\text{px}$.

---

# 19. Constraint — No Semantic Collapse

Orbit strictly forbids mutating or merging semantic classifications to resolve geometric overlaps. If capacity is exceeded, the system MUST:
1. Allocate an outer sub-track ($T \to T+1$), OR
2. Increase sector body angle $\Theta_s$, OR
3. Expand track radius $R \to R + 100\text{px}$.

---

# 20. Hybrid Isolation Check

| Existing Hybrid Asset | Reusable by Orbit? | Rationale | Evidence File |
| :--- | :---: | :--- | :--- |
| `classifyNodeLayer` | **YES** | Canonical layer classification | `layers.ts` |
| `discoverFeatures` | **YES** | Feature cluster discovery | `features.ts` |
| `discoverDomains` | **YES** | Domain cluster discovery | `domains.ts` |
| `computeDegreeCentrality` | **YES** | Centrality scoring | `centrality.ts` |
| Hybrid Rectangular Boxes | **NO** | Hybrid 2D spatial authority | `global-layout.ts` |
| Hybrid Y-Layer Bands | **NO** | Hybrid hierarchical packing | `local-layout.ts` |

---

# 21. Dependency Constellation Isolation Check

| Existing Constellation Asset | Reusable by Orbit? | Rationale | Evidence File |
| :--- | :---: | :--- | :--- |
| Trigonometric Math Helpers | **YES** | Pure polar math functions | `constellation-layout.ts` |
| Angular Normalization | **YES** | Seam wrapping ($0 \leftrightarrow 2\pi$) | `constellation-layout.ts` |
| Focal Node Neighborhood | **NO** | Constellation-specific scoping | `constellation-layout.ts` |
| Hop Expansion Filtering | **NO** | Constellation-specific filtering | `constellation-layout.ts` |

---

# 22. Determinism Contract

Orbit guarantees 100% deterministic layout generation:

```text
Same Graph + Same Semantic Inputs
  == Same Ring Assignment + Same Sector Assignment + Same Track Assignment + Same Coordinates
```

### Ordering Hierarchy:
1. Features sorted by seed ranking score descending, then `feature.id.localeCompare()`.
2. Sectors ordered clockwise by primary `feature.id.localeCompare()`.
3. Nodes ordered within sector-tracks by layer rank, degree centrality, then `node.id.localeCompare()`.

---

# 23. PBIM Projection Replay

Conceptual replay across PBIM dataset ($N=528, E=2063$):

```text
Node
  ↓ [Level 1: explorer-data.json] --> REPOSITORY FACT
Canonical Layers (30, 171, 23, 304)
  ↓ [Level 3: layers.ts] -----------> REPOSITORY FACT
Entry Point Detection (43)
  ↓ [Level 4: entry-points.cjs] -----> SUPPORTED BY REPOSITORY EVIDENCE
Orbit Ring Projection (43, 0, 99, 95, 304)
  ↓ [Orbit Projection Contract] ----> ORBIT DESIGN PROPOSAL
Feature / Domain Grouping (43 Seeds)
  ↓ [features.ts / domains.ts] -----> SUPPORTED BY REPOSITORY EVIDENCE
Sector Allocation (3, 5, 5, 10)
  ↓ [Illustrative Sector Rule] ------> ORBIT DESIGN PROPOSAL / NOT IMPLEMENTED
Track Allocation (14 Tracks)
  ↓ [n_target = 8 Rule] ------------> ORBIT DESIGN PROPOSAL
Radius Chain (Rmax = 1560.77px)
  ↓ [Closed-Form Formula] -----------> PROVEN MATHEMATICALLY
```

---

# 24. Small Dataset Semantic Replay

| Dataset | Total Nodes ($N$) | Canonical Layers (`layers.ts`) | Orbit Ring Projection | Feature Seeds | Determinism Status |
| :--- | ---: | :--- | :--- | ---: | :---: |
| `food-app` | 1 | Presentation (1) | $R_0$ Nucleus (1) | 1 | **DETERMINISTIC** |
| `cst` | 240 | Pres (12), App (98), Dom (42), Sch (88) | $R_0$ (12), $R_2$ (98), $R_3$ (42), $R_4$ (88) | 12 | **DETERMINISTIC** |
| `bqc` | 274 | Pres (15), App (112), Dom (35), Sch (112) | $R_0$ (15), $R_2$ (112), $R_3$ (35), $R_4$ (112) | 15 | **DETERMINISTIC** |
| `pbim` | 528 | Pres (30), App (171), Dom (23), Sch (304) | $R_0$ (43), $R_2$ (99), $R_3$ (95), $R_4$ (304) | 43 | **DETERMINISTIC** |

---

# 25. Anti-Circularity Requirement

Geometry NEVER determines or alters semantics. Semantic classification, ring projection, feature grouping, and sector allocation execute strictly BEFORE radius and angular coordinate calculations.

---

# 26. Final Required Summary Table

| Area | Repository Truth | Mathematical Truth | Runtime Status | Final Status |
| :--- | :---: | :---: | :---: | :---: |
| **Canonical layer classification** | **REPOSITORY FACT** | N/A | **IMPLEMENTED** (`layers.ts`) | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **Orbit ring projection** | **PROPOSAL** | N/A | **NOT IMPLEMENTED** | **ORBIT DESIGN PROPOSAL** |
| **Entry-point/nucleus mapping** | **REPOSITORY FACT** | N/A | **IMPLEMENTED** (`entry-points.cjs`) | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **Feature discovery** | **REPOSITORY FACT** | N/A | **IMPLEMENTED** (`features.ts`) | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **Domain discovery** | **REPOSITORY FACT** | N/A | **IMPLEMENTED** (`domains.ts`) | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **Sector count ($S_k$)** | **UNPROVEN** | N/A | **NOT IMPLEMENTED** | **ILLUSTRATIVE / UNPROVEN** |
| **Sector weighting** | **REPOSITORY FACT** | N/A | **IMPLEMENTED** (`centrality.ts`) | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **Node $\to$ sector mapping** | **UNPROVEN** | N/A | **NOT IMPLEMENTED** | **ORBIT DESIGN PROPOSAL** |
| **Track count ($T_k$)** | **PROPOSAL** | **PROVEN** | **NOT IMPLEMENTED** | **ORBIT DESIGN PROPOSAL** |
| **Node $\to$ track mapping** | **PROPOSAL** | **PROVEN** | **NOT IMPLEMENTED** | **ORBIT DESIGN PROPOSAL** |
| **Radius inputs** | **REPOSITORY FACT** | **PROVEN** | **NOT IMPLEMENTED** | **SUPPORTED BY BOTH** |
| **Radius equation** | N/A | **PROVEN** | **NOT IMPLEMENTED** | **PROVEN MATHEMATICALLY** |
| **Determinism** | **REPOSITORY FACT** | **PROVEN** | **IMPLEMENTED** (`features.ts`) | **SUPPORTED BY BOTH** |
| **Hybrid isolation** | **REPOSITORY FACT** | N/A | **IMPLEMENTED** | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **Constellation isolation** | **REPOSITORY FACT** | N/A | **IMPLEMENTED** | **SUPPORTED BY REPOSITORY EVIDENCE** |
| **PBIM replay** | **REPOSITORY FACT** | **PROVEN** | **NOT IMPLEMENTED** | **SUPPORTED BY BOTH** |
| **Runtime implementation** | **NOT IMPLEMENTED** | N/A | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** |
| **Browser validation** | **NOT IMPLEMENTED** | N/A | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** |

---

# 27. Final Verdict & Remaining Blockers

```text
BLOCKED — ORBIT SEMANTIC PROJECTION REMAINS UNPROVEN
```

### Smallest Remaining Blockers Before Implementation Gate:
1. **Formalize Orbit Ring Projection Contract:** Register the node-to-ring projection function in `explorer/src/lib/layout/` so remapping `External` $\to$ Application and `LWC` $\to$ Core is a code-enforced specification rather than an ad hoc grouping.
2. **Implement Dynamic Sector & Track Engine:** Create the executable mapping `node -> feature/domain -> sector` in `explorer/src/lib/layout/` so sector counts $S_k$ and track allocations $T_k$ are derived directly from `discoverFeatures()` and `discoverDomains()` rather than hardcoded illustrative constants ($3, 5, 5, 10$).

`ARCHITECTURE_ORBIT_SEMANTIC_PROJECTION_AND_DYNAMIC_SECTOR_CONTRACT_GATE.md` is complete and verified.
