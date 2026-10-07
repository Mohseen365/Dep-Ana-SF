# Component Orbit Constellation Shared-Node Clearance Final Gate
## Real PBIM — Read-Only — Fail-Closed — Final Shared-Node Clearance Audit

---

# 1. Executive Verdict

This read-only, evidence-backed mathematical and repository-truth audit resolves the single remaining mathematical contradiction in the Multi-Sun Component Constellation geometry contract on the canonical Pub-Infra-Mang (`pbim`) dataset.

### Resolution of the 225.6px Mathematical Contradiction:
1. **Source of $225.6\text{px}$ Identified**: The prior audit measured $225.62\text{px}$ as the raw center-to-center distance between `ApexClass:MaintenanceRequestController` at its raw multi-Sun centroid $(-225.49, -801.82)$ and its nearest active Sun `vendor-workspace` $(-450.00, -779.42)$.
2. **Contradiction Closed**: The previous report statement "$D_{\text{center}} \ge 225.6\text{px} \ge 240\text{px}$" was mathematically false ($225.62 < 240$). At the raw centroid, `MaintenanceRequestController` achieves raw AABB edge clearance of $104.51\text{px} < 120.00\text{px}$, violating the required $120.00\text{px}$ AABB clearance contract.
3. **Deterministic Displacement Applied**: Applying deterministic radial displacement along the Sun-to-centroid vector shifts `MaintenanceRequestController` to final position $(-205.59, -803.80)$, achieving a final center distance of $245.62\text{px} \ge 240.00\text{px}$ and a final AABB edge clearance of $124.41\text{px} \ge 120.00\text{px}$.
4. **Co-location Collision Resolved**: The 3-way shared-node co-location at raw centroid $(-675.00, -389.71)$ (`ApexClass:VendorAssignmentController`, `LWC:vendor-card`, `LWC:vendor-history-modal`) is resolved via deterministic tangent displacement, establishing $\ge 78.56\text{px}$ AABB edge clearance between shared nodes and $\ge 192.78\text{px}$ AABB clearance to nearest Suns.
5. **10x Determinism & Identity Conservation Verified**: 0.00000px coordinate drift across 40 runs/shuffles with 0 node clones (exactly 7 graph identities).

### Final Verdict:
```text
SHARED-NODE CLEARANCE CONTRADICTION CLOSED — GEOMETRY IMPLEMENTATION READY
```

---

# 2. Canonical PBIM Identity

Pre-flight verification confirms bit-for-bit dataset identity across both canonical repository locations.

- **Primary Path**: `analyze/projects/pbim/explorer-data.json`
- **Secondary Path**: `explorer/public/projects/pbim/explorer-data.json`
- **SHA-256 Checksum**: `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`
- **Total Nodes**: `528` | **Total Edges**: `2063` | **Total LWCs**: `30`
- **Composition Edges (`lwc-template-child`)**: `19` | **Controller Edges (`lwc-apex`)**: `51`
- **Global Shared Apex Hubs ($\ge 2$ LWC consumers)**: `7`
- **Reachable Nodes from LWCs**: `271` | **Unreachable Backend Nodes**: `257`

**Validation Status**: `DATASET VALIDATED — CANONICAL PBIM MATCH` [REAL PBIM OBSERVATION]

---

# 3. Exact 7 Shared k=1 Nodes

Independently calculating the union of the 14 initial Suns' $k=1$ local projections identifies exactly 7 nodes appearing in $>1$ Sun's local projection:

| Shared Node ID | Node Type | Referencing Suns | Referencing Sun Count |
|---|---|---|---:|
| `ApexClass:BudgetController` | `ApexClass` | `budget-utilization-summary`, `vendor-assignment-panel` | 2 |
| `ApexClass:CitizenRequestController` | `ApexClass` | `citizen-complaint-list`, `citizen-report-portal` | 2 |
| `ApexClass:CityZoneController` | `ApexClass` | `citizen-report-portal`, `zone-manager-dashboard` | 2 |
| `ApexClass:MaintenanceRequestController` | `ApexClass` | `maintenance-request-kanban`, `vendor-assignment-panel`, `vendor-workspace` | 3 |
| `ApexClass:VendorAssignmentController` | `ApexClass` | `vendor-assignment-panel`, `vendor-workspace` | 2 |
| `LWC:vendor-card` | `LWC` | `vendor-assignment-panel`, `vendor-workspace` | 2 |
| `LWC:vendor-history-modal` | `LWC` | `vendor-assignment-panel`, `vendor-workspace` | 2 |

### Partition Summary:
- **Shared Apex Controllers**: `5` (`BudgetController`, `CitizenRequestController`, `CityZoneController`, `MaintenanceRequestController`, `VendorAssignmentController`)
- **Shared Child LWCs**: `2` (`LWC:vendor-card`, `LWC:vendor-history-modal`)
- **Other Shared Nodes**: `0`
- **Total Shared $k=1$ Nodes**: `7`

---

# 4. The 225.6px Contradiction

### Origin & Forensic Analysis:
In `COMPONENT_ORBIT_CONSTELLATION_FINAL_GEOMETRY_CLEARANCE_CONTRADICTION_GATE.md` (Section 9), the statement appeared:
> *"satisfies $D_{\text{center}} \ge 225.6\text{px} \ge 240\text{px}$ or receives deterministic radial displacement"*

This statement contains a direct mathematical contradiction because $225.62 < 240$.

Forensic tracing reveals that $225.62\text{px}$ was the measured **raw center distance** between `ApexClass:MaintenanceRequestController`'s raw centroid $(-225.49, -801.82)$ and its nearest Sun `vendor-workspace` $(-450.00, -779.42)$.
Under the locked $120.00\text{px} \times 60.00\text{px}$ node footprint contract:
- Center distance required for $120.00\text{px}$ primary X-axis AABB clearance $= 120/2 + 120/2 + 120 = 240.00\text{px}$.
- At raw centroid $(-225.49, -801.82)$, raw AABB edge clearance is:
  $$dx = |-225.49 - (-450.00)| - 120 = 224.51 - 120 = 104.51\text{px}$$
  $$dy = \max(0, |-801.82 - (-779.42)| - 60) = 0.00\text{px}$$
  $$D_{\text{AABB, raw}} = \sqrt{104.51^2 + 0^2} = 104.51\text{px} < 120.00\text{px} \quad [\text{CONTRACT VIOLATION}]$$

### Resolution:
1. $225.62\text{px}$ is confirmed to be a **raw centroid measurement**, NOT a final position distance.
2. `MaintenanceRequestController` cannot remain at its raw centroid and MUST undergo displacement.
3. Applying deterministic radial displacement shifts `MaintenanceRequestController` to final position $(-205.59, -803.80)$, where final center distance is $245.62\text{px} \ge 240.00\text{px}$ and final AABB edge clearance is $124.41\text{px} \ge 120.00\text{px}$.
4. The contradiction is completely closed.

---

# 5. Raw Centroid Evidence

For every shared node $v$, raw centroid coordinates are calculated as:
$$X_{\text{raw}} = \frac{1}{|S_v|} \sum_{s \in S_v} X_s, \quad Y_{\text{raw}} = \frac{1}{|S_v|} \sum_{s \in S_v} Y_s$$

| Shared Node ID | Referencing Suns | Raw Centroid $(X, Y)$ | Nearest Sun | Raw Center Dist | Raw AABB Gap | Clearance Status |
|---|---|---|---|---:|---:|---|
| `ApexClass:BudgetController` | `budget-utilization-summary`, `vendor-assignment-panel` | $(-113.24, 813.01)$ | `citizen-complaint-list` | $338.43\text{px}$ | $216.76\text{px}$ | Satisfied ($\ge 120\text{px}$) |
| `ApexClass:CitizenRequestController` | `citizen-complaint-list`, `citizen-report-portal` | $(-561.76, 1202.73)$ | `citizen-complaint-list` | $437.81\text{px}$ | $363.30\text{px}$ | Satisfied ($\ge 120\text{px}$) |
| `ApexClass:CityZoneController` | `citizen-report-portal`, `zone-manager-dashboard` | $(-111.76, 423.30)$ | `citizen-complaint-list` | $491.15\text{px}$ | $367.85\text{px}$ | Satisfied ($\ge 120\text{px}$) |
| `ApexClass:MaintenanceRequestController` | `maintenance-request-kanban`, `vendor-assignment-panel`, `vendor-workspace` | $(-225.49, -801.82)$ | `vendor-workspace` | **$225.62\text{px}$** | **$104.51\text{px}$** | **VIOLATED** ($< 120\text{px}$) |
| `ApexClass:VendorAssignmentController` | `vendor-assignment-panel`, `vendor-workspace` | $(-675.00, -389.71)$ | `vendor-assignment-panel` | $450.00\text{px}$ | $346.03\text{px}$ | Co-located ($0\text{px}$ shared gap) |
| `LWC:vendor-card` | `vendor-assignment-panel`, `vendor-workspace` | $(-675.00, -389.71)$ | `vendor-assignment-panel` | $450.00\text{px}$ | $346.03\text{px}$ | Co-located ($0\text{px}$ shared gap) |
| `LWC:vendor-history-modal` | `vendor-assignment-panel`, `vendor-workspace` | $(-675.00, -389.71)$ | `vendor-assignment-panel` | $450.00\text{px}$ | $346.03\text{px}$ | Co-located ($0\text{px}$ shared gap) |

---

# 6. Final Position Pipeline

Every shared node passes through the deterministic final position pipeline:

```text
RAW CENTROID
      ↓
CLEARANCE & MULTI-OCCUPANCY TEST
      ↓
DISPLACEMENT REQUIRED?
   ├── NO  → FINAL POSITION = RAW CENTROID
   └── YES → APPLY DETERMINISTIC DISPLACEMENT RULES → FINAL POSITION
      ↓
FINAL CLEARANCE TEST (AABB GAP >= 120px)
```

- **Nodes at Raw Centroid** (`final position = raw centroid`):
  1. `ApexClass:CitizenRequestController`
  2. `ApexClass:BudgetController`
  3. `ApexClass:CityZoneController`
  4. `LWC:vendor-card` (Rank 1 anchor of co-located cluster)
- **Nodes Displaced** (`final position != raw centroid`):
  1. `ApexClass:MaintenanceRequestController` (Sun AABB clearance displacement)
  2. `ApexClass:VendorAssignmentController` (Tangent displacement, Rank 0)
  3. `LWC:vendor-history-modal` (Tangent displacement, Rank 2)

---

# 7. Exact AABB Clearance Method

Node bounding boxes are modeled using authoritative footprint dimensions:
$$\text{Width} = 120.00\text{px}, \quad \text{Height} = 60.00\text{px}$$

For two nodes $A$ and $B$ with center coordinates $(cx_A, cy_A)$ and $(cx_B, cy_B)$:
$$dx = \max\left(0, |cx_A - cx_B| - \frac{w_A + w_B}{2}\right) = \max(0, |cx_A - cx_B| - 120.00)$$
$$dy = \max\left(0, |cy_A - cy_B| - \frac{h_A + h_B}{2}\right) = \max(0, |cy_A - cy_B| - 60.00)$$
$$\text{AABB Edge Clearance} = \sqrt{dx^2 + dy^2}$$

Required threshold:
$$\text{Final Sun-to-Shared AABB Clearance} \ge 120.00\text{px}$$

---

# 8. Complete 7-Node Clearance Table

| Shared Node | Type | Referencing Suns | Raw Centroid | Nearest Sun | Raw Center Dist | Displacement Required | Final Position | Final Center Dist | Final AABB Clearance | Pass/Fail |
|---|---|---|---|---|---:|---|---|---:|---:|---|
| `ApexClass:BudgetController` | `ApexClass` | `budget-utilization-summary`, `vendor-assignment-panel` | $(-113.24, 813.01)$ | `citizen-complaint-list` | $338.43\text{px}$ | NO | $(-113.24, 813.01)$ | $338.43\text{px}$ | $216.76\text{px}$ | PASS |
| `ApexClass:CitizenRequestController` | `ApexClass` | `citizen-complaint-list`, `citizen-report-portal` | $(-561.76, 1202.73)$ | `citizen-complaint-list` | $437.81\text{px}$ | NO | $(-561.76, 1202.73)$ | $437.81\text{px}$ | $363.30\text{px}$ | PASS |
| `ApexClass:CityZoneController` | `ApexClass` | `citizen-report-portal`, `zone-manager-dashboard` | $(-111.76, 423.30)$ | `citizen-complaint-list` | $491.15\text{px}$ | NO | $(-111.76, 423.30)$ | $491.15\text{px}$ | $367.85\text{px}$ | PASS |
| `ApexClass:MaintenanceRequestController` | `ApexClass` | `maintenance-request-kanban`, `vendor-assignment-panel`, `vendor-workspace` | $(-225.49, -801.82)$ | `vendor-workspace` | $225.62\text{px}$ | YES | $(-205.59, -803.80)$ | $245.62\text{px}$ | $124.41\text{px}$ | PASS |
| `ApexClass:VendorAssignmentController` | `ApexClass` | `vendor-assignment-panel`, `vendor-workspace` | $(-675.00, -389.71)$ | `vendor-assignment-panel` | $450.00\text{px}$ | YES | $(-755.00, -251.15)$ | $290.00\text{px}$ | $192.78\text{px}$ | PASS |
| `LWC:vendor-card` | `LWC` | `vendor-assignment-panel`, `vendor-workspace` | $(-675.00, -389.71)$ | `vendor-assignment-panel` | $450.00\text{px}$ | NO | $(-675.00, -389.71)$ | $450.00\text{px}$ | $346.03\text{px}$ | PASS |
| `LWC:vendor-history-modal` | `LWC` | `vendor-assignment-panel`, `vendor-workspace` | $(-675.00, -389.71)$ | `vendor-assignment-panel` | $450.00\text{px}$ | YES | $(-595.00, -528.28)$ | $290.00\text{px}$ | $192.78\text{px}$ | PASS |

---

# 9. Displacement Analysis

Two explicit deterministic displacement rules were executed and validated in `scripts/audit_shared_node_clearance.cjs`:

### Rule A — Radial Sun Clearance Displacement:
- **Trigger**: Shared node AABB gap to nearest active Sun $< 120.00\text{px}$.
- **Target Node**: `ApexClass:MaintenanceRequestController`
- **Vector**: Unit vector along ray from nearest Sun $\mathbf{S} = (-450.00, -779.42)$ to raw centroid $\mathbf{C}_{\text{raw}} = (-225.49, -801.82)$:
  $$\hat{\mathbf{u}} = (0.99507, -0.099255)$$
- **Shift**: Scale radial center distance from $225.62\text{px}$ to $245.62\text{px}$ ($\Delta r = +20.00\text{px}$).
- **Final Coordinates**: $(-205.5928, -803.8058)\text{px}$.
- **Result**: Achieves final center distance $245.62\text{px} \ge 240.00\text{px}$ and final AABB gap $124.41\text{px} \ge 120.00\text{px}$.

### Rule B — Tangent Multi-Occupancy Resolution Displacement:
- **Trigger**: Multiple shared nodes share identical raw centroids ($0\text{px}$ pairwise gap).
- **Target Cluster**: `ApexClass:VendorAssignmentController`, `LWC:vendor-card`, `LWC:vendor-history-modal` at raw centroid $(-675.00, -389.71)$.
- **Lexical Tie-Breaking**: Sort nodes by `id` ASC $\implies$ Rank 0 (`VendorAssignmentController`), Rank 1 (`LWC:vendor-card`), Rank 2 (`LWC:vendor-history-modal`).
- **Tangent Direction**: Unit vector perpendicular to centroid radial angle $\theta = 210^\circ$:
  $$\hat{\mathbf{w}} = (0.50000, -0.8660254)$$
- **Step Size**: $S = 160.00\text{px}$ along tangent direction for multiplier $m = \text{Rank} - 1 \in \{-1, 0, +1\}$.
- **Results**:
  - Rank 0 (`VendorAssignmentController`): Offset $-160\text{px} \implies (-755.00, -251.15)\text{px}$.
  - Rank 1 (`LWC:vendor-card`): Offset $0\text{px} \implies (-675.00, -389.71)\text{px}$.
  - Rank 2 (`LWC:vendor-history-modal`): Offset $+160\text{px} \implies (-595.00, -528.28)\text{px}$.
- **Result**: Achieves $160.00\text{px}$ center distance ($78.56\text{px}$ AABB edge clearance) between adjacent shared nodes and $\ge 192.78\text{px}$ AABB clearance to nearest Suns.

---

# 10. Collision Validation

Across all 7 final shared nodes and 14 active Suns:
1. **Shared Node vs Sun AABB Collisions**: `0` (Minimum AABB gap $= 124.41\text{px} \ge 120.00\text{px}$).
2. **Shared Node vs Shared Node AABB Collisions**: `0` (Minimum AABB gap $= 78.56\text{px} > 0.00\text{px}$).
3. **Shared Node vs Local Orbit Node Collisions**: `0`.
4. **Shared Node vs Label Envelopes**: `0` modeled label-envelope collisions ($120\text{px} \times 20\text{px}$ footprint).
5. **Cluster Overlaps**: `0` cluster overlaps.

---

# 11. Identity Conservation

Identity preservation is strictly verified across all 7 shared $k=1$ nodes:
- **Authoritative Graph Node IDs**: `7` (`5 ApexClass` + `2 LWC`)
- **Rendered Node Identities**: `7`
- **Node Clones / Duplicates**: `0`
- **Synthetic Replacement Nodes**: `0`

Moving or displacing a shared node changes its Cartesian coordinates $(X, Y)$ without cloning or mutating its underlying graph identity.

---

# 12. Determinism

Ran 40 total executions in `scripts/audit_shared_node_clearance.cjs`:
- 10 Normal executions
- 10 Node-array order shuffles
- 10 Edge-array order shuffles
- 10 Sun-array order shuffles

**Result**:
$$\text{Maximum Coordinate Drift} = 0.00000\text{px}$$

Placement is 100% deterministic and invariant to input order.

---

# 13. Final Shared-Node Contract

For every shared $k=1$ node in Multi-Sun Component Constellation layout:

1. Compute deterministic raw centroid across referencing Suns.
2. Evaluate exact AABB clearance against all active Suns and co-located shared nodes.
3. If the $120\text{px}$ Sun AABB clearance is violated, apply deterministic radial displacement along the Sun-to-centroid vector.
4. If multiple shared nodes occupy the same raw centroid, apply deterministic tangent displacement ordered lexicographically by node ID.
5. Re-evaluate exact final AABB clearance against all active Suns and shared nodes.
6. Final position, NOT raw centroid, is authoritative.
7. The node retains its single original graph identity (0 node clones).
8. The final result is 100% deterministic under input ordering ($0.00000\text{px}$ drift).

---

# 14. Remaining Evidence Boundaries

- **Model Space**: 100% verified and proven in mathematical model space.
- **Browser Space**: DOM-rendered bounding boxes and text soft-wrapping are reserved for the implementation phase.
- **Source Code Changes**: Zero production source code modifications were made during this read-only audit.

---

# 15. Final Verdict

```text
SHARED-NODE CLEARANCE CONTRADICTION CLOSED — GEOMETRY IMPLEMENTATION READY
```

The single mathematical contradiction ($225.6\text{px} \ge 240\text{px}$) is completely resolved with mathematical proof, deterministic displacement modeling, 0 AABB collisions, 0 node clones, and 10x input-order determinism on canonical PBIM. Implementation may proceed.
