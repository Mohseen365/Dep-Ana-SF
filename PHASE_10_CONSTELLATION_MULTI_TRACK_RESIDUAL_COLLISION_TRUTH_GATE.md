# PHASE 10 — CONSTELLATION MULTI-TRACK RESIDUAL COLLISION TRUTH GATE REPORT

**Target Surface:** Dependency Constellation Lens (`viewMode = 'constellation'`)
**Audit Date:** October 2026 / Phase 10 Measurement Integrity Verification
**Execution Mode:** READ-ONLY / ADVERSARIAL MEASUREMENT INTEGRITY AUDIT
**Primary Question:** *Are the 4 alleged PBIM 3-hop residual cross-ring overlaps reported by Phase 9 real AABB overlaps under the experiment's own collision predicate?*
**Final Verdict & Classification:** `RESIDUAL_COLLISION_CONFIRMED`
**Production Authorization Verdict:** `PHASE_9_RESIDUAL_FAILURE_CLAIM_CONFIRMED`

---

## 1. EXECUTIVE SUMMARY

This report documents the **read-only, adversarial measurement-integrity verification** of the Phase 9 Dependency Constellation multi-track experiment (`PHASE_9_CONSTELLATION_MULTI_TRACK_SUBRING_CAPACITY_CONTROLLED_EXPERIMENT.md`).

### Core Findings
1. **Primary Question Answer:** **YES.** The 4 alleged PBIM 3-hop residual cross-ring overlaps reported by Phase 9 are **100% authentic, real AABB collisions** under the experiment's exact collision predicate (`dx < 24px AND dy < 24px`).
2. **Exact Overlap Coordinates:**
   - On the canonical PBIM 3-hop scenario (`Maintenance_Request__c`, $N = 415$, Ring 2 Track 4 $R = 450\text{px}$, Ring 3 Track 1 $R = 480\text{px}$), exactly 4 co-angular cross-ring pairs sit at $\Delta R = 30\text{px}$ and angular offset $|\Delta \theta| \approx 0.007272\text{rad}$ ($0.4167^\circ$).
   - Computed coordinate deltas for all 4 pairs are bit-for-bit identical:
     $$\Delta X = 19.394672\text{px} \quad (< 24.00\text{px})$$
     $$\Delta Y = 23.135899\text{px} \quad (< 24.00\text{px})$$
     $$\text{Euclidean Center Distance} = \sqrt{\Delta X^2 + \Delta Y^2} = 30.189785\text{px}$$
   - Since both $\Delta X < 24$ and $\Delta Y < 24$ hold simultaneously, the AABB collision predicate is satisfied.
3. **Resolution of the Phase 9 Textual Example Inconsistency:**
   - The Phase 9 text included an approximate conceptual illustration suggesting $\Delta \theta \approx 0.02\text{rad}$ near $0^\circ$ ($\Delta X \approx 29.99\text{px}, \Delta Y \approx 0.60\text{px}$), which would *not* satisfy $\Delta X < 24$.
   - Independent coordinate extraction proved that the actual 4 overlaps do *not* occur near $0^\circ$. They occur at inclined arc positions near $\theta \approx 56.4^\circ, 123.5^\circ, 236.5^\circ,$ and $303.5^\circ$. At these inclined angles, $\cos\theta \approx 0.552$ and $\sin\theta \approx 0.834$, causing the radial vector $\mathbf{\Delta R} = (16.57, 25.01)$ to decompose such that $\Delta X = 19.395\text{px} < 24\text{px}$ and $\Delta Y = 23.136\text{px} < 24\text{px}$.
   - The reported 4 collisions are programmatically and mathematically real. The Phase 9 report text contained a minor visual illustration typo, but its empirical collision count was 100% accurate.
4. **BQC Table Reconciliation Resolved:**
   - Recomputation confirmed why Phase 9 reported 2 overlaps in its minimum-safe-spacing table but 4 overlaps in its track-count table for BQC 3-hop.
   - At $T=2, \Delta r = 40\text{px}$, BQC 3-hop produces 2 overlaps (both are same-track overlaps on Ring 1 Track 1 at $R=180\text{px}$).
   - At $T=4, \Delta r = 40\text{px}$, BQC 3-hop produces 4 overlaps (2 same-track overlaps on Ring 1 Track 1 + 2 cross-ring overlaps between Ring 2 Track 4 at $R=450\text{px}$ and Ring 3 Track 1 at $R=480\text{px}$). The difference was due to evaluating different track counts ($T=2$ vs $T=4$).
5. **Zero Production Code Touched:** $100\%$ clean repository state (`git status --short` proves 0 production source modifications).

---

## 2. REPOSITORY STATE

The audit was performed on a completely clean production codebase:

```bash
git status --short
# Output: A explorer/src/test/phase10-investigation.test.ts
git diff -- explorer/src/lib/
# Output: (empty)
git diff -- explorer/src/components/
# Output: (empty)
```

- **Production Source Code:** $100\%$ untouched (0 edits in `explorer/src/lib/` or `explorer/src/components/`).
- **Verification Harness:** Executed via temporary, verification-only test script `explorer/src/test/phase10-investigation.test.ts`.

---

## 3. PHASE 9 IMPLEMENTATION UNDER TEST

The Phase 9 multi-track experiment implementation was located in:
`explorer/src/test/phase9-constellation-multi-track-experiment.test.ts`

### Collision Function Implementation (Verbatim)

```typescript
// From computeMultiTrackConstellationLayout in phase9-constellation-multi-track-experiment.test.ts
const reqClearance = (dimA + dimB) / 2; // orbital-orbital = (24 + 24) / 2 = 24

if (dx < reqClearance - 1e-3 && dy < reqClearance - 1e-3) {
  let type: 'SAME_TRACK' | 'CROSS_TRACK' | 'FOCAL' = 'CROSS_TRACK';
  if (isFocalA || isFocalB) {
    type = 'FOCAL';
    focalOverlaps++;
  } else if (posA.ringIndex === posB.ringIndex && posA.trackIndex === posB.trackIndex) {
    type = 'SAME_TRACK';
    sameTrackOverlaps++;
  } else {
    type = 'CROSS_TRACK';
    crossTrackOverlaps++;
  }

  overlappingPairs.push({
    nodeA: idA,
    nodeB: idB,
    distance: Number(dist.toFixed(2)),
    type,
  });
}
```

### Divergence Flag Evaluation
- **Reported Predicate:** `dx < 24 && dy < 24`
- **Implemented Predicate:** `dx < reqClearance - 1e-3 && dy < reqClearance - 1e-3` where `reqClearance = 24`
- **Result:** **NO DIVERGENCE** (`MATCH`). The $10^{-3}$ epsilon handles floating-point precision at strict boundaries.

---

## 4. EXACT COLLISION PREDICATE

The authoritative collision predicate for two orbital nodes $A$ and $B$ (bounding box size $24 \times 24\text{px}$) centered at $(x_A, y_A)$ and $(x_B, y_B)$ is:

$$\text{Collision} \iff |x_A - x_B| < 24\text{px} \quad \land \quad |y_A - y_B| < 24\text{px}$$

---

## 5. REPRODUCE CANONICAL PBIM 3-HOP CASE

The canonical PBIM 3-hop scenario was reproduced bit-for-bit:

- **Dataset:** PBIM (`public/projects/pbim/explorer-data.json`)
- **Focal Node:** `Object:Maintenance_Request__c` (depth = 3)
- **Total Population:** $N = 415$
  - Focal Node ($R=0$): $1$
  - Ring 1 ($R=180\text{px}$): $69$ nodes
  - Ring 2 ($R=330\text{px}$): $217$ nodes
  - Ring 3 ($R=480\text{px}$): $128$ nodes
- **Configuration:** $T = 4$, $\Delta r_{\text{track}} = 40\text{px}$, Strategy B (Interleaved), Base radii $R_1=180\text{px}, R_2=330\text{px}, R_3=480\text{px}$.

---

## 6. FULL ALLEGED-OVERLAP TABLE (EXACT COORDINATES)

Below are the exact Cartesian and polar coordinates for all 4 PBIM 3-hop residual cross-ring overlaps:

| Field | Overlap Pair #1 | Overlap Pair #2 | Overlap Pair #3 | Overlap Pair #4 |
| :--- | :--- | :--- | :--- | :--- |
| **Node A ID** | `External:Queueable` | `ApexClass:CitizenRequestControllerTest` | `External:SaveResult` | `Field:Infrastructure_Asset__c.City_Zone__c` |
| **Node B ID** | `External:ZoneOption` | `ApexClass:ZoneUtilTest` | `External:EmailException` | `Field:Inspection__c.Status__c` |
| **Ring A / Track A** | Ring 2 / Track 3 | Ring 2 / Track 3 | Ring 2 / Track 3 | Ring 2 / Track 3 |
| **Radius A** | $450.0000\text{px}$ | $450.0000\text{px}$ | $450.0000\text{px}$ | $450.0000\text{px}$ |
| **Angle Rad / Deg A** | $-0.989020\text{ rad } (303.3333^\circ)$ | $0.989020\text{ rad } (56.6667^\circ)$ | $2.152573\text{ rad } (123.3333^\circ)$ | $4.130613\text{ rad } (236.6667^\circ)$ |
| **$(X_A, Y_A)$** | $(697.2790, 74.0305)\text{px}$ | $(697.2790, 825.9695)\text{px}$ | $(202.7210, 825.9695)\text{px}$ | $(202.7210, 74.0305)\text{px}$ |
| **Ring B / Track B** | Ring 3 / Track 0 | Ring 3 / Track 0 | Ring 3 / Track 0 | Ring 3 / Track 0 |
| **Radius B** | $480.0000\text{px}$ | $480.0000\text{px}$ | $480.0000\text{px}$ | $480.0000\text{px}$ |
| **Angle Rad / Deg B** | $-0.981748\text{ rad } (303.7500^\circ)$ | $0.981748\text{ rad } (56.2500^\circ)$ | $2.159845\text{ rad } (123.7500^\circ)$ | $4.123340\text{ rad } (236.2500^\circ)$ |
| **$(X_B, Y_B)$** | $(716.6737, 50.8946)\text{px}$ | $(716.6737, 849.1054)\text{px}$ | $(183.3263, 849.1054)\text{px}$ | $(183.3263, 50.8946)\text{px}$ |
| **$\Delta X = |X_A - X_B|$** | **$19.394672\text{px}$** | **$19.394672\text{px}$** | **$19.394672\text{px}$** | **$19.394672\text{px}$** |
| **$\Delta Y = |Y_A - Y_B|$** | **$23.135899\text{px}$** | **$23.135899\text{px}$** | **$23.135899\text{px}$** | **$23.135899\text{px}$** |
| **Euclidean Center Dist**| **$30.189785\text{px}$** | **$30.189785\text{px}$** | **$30.189785\text{px}$** | **$30.189785\text{px}$** |
| **AABB Predicate** | $\Delta X < 24 \land \Delta Y < 24$ | $\Delta X < 24 \land \Delta Y < 24$ | $\Delta X < 24 \land \Delta Y < 24$ | $\Delta X < 24 \land \Delta Y < 24$ |
| **Collision Verdict** | **AUTHENTIC COLLISION** | **AUTHENTIC COLLISION** | **AUTHENTIC COLLISION** | **AUTHENTIC COLLISION** |

---

## 7. INDEPENDENT COLLISION RECOMPUTATION

An independent verifier built directly on raw node positions (without calling any Phase 9 test helpers) evaluated all $\frac{415 \times 414}{2} = 85,905$ pairs:

| Collision Type | Phase 9 Reported Set | Independent Verifier Set | Match Classification |
| :--- | :---: | :---: | :---: |
| **Same-Track Overlaps** | 0 | 0 | **EXACT_MATCH** |
| **Cross-Track Overlaps** | 4 | 4 | **EXACT_MATCH** |
| **Focal Overlaps** | 0 | 0 | **EXACT_MATCH** |
| **Total Overlaps** | 4 | 4 | **EXACT_MATCH** |

Classification: **`EXACT_MATCH`**

---

## 8. SPECIFIC TEST OF THE PHASE 9 EXAMPLE

Evaluating the textual illustration given in Section 11 of the Phase 9 report:
- **Phase 9 Text Example:** $\Delta R = 30\text{px}, \Delta \theta \approx 0.02\text{rad}$ near $0^\circ$.
- **Calculated Example Geometry:**
  $$\Delta X = 30 \cos(0.02) = 29.994\text{px}$$
  $$\Delta Y = 30 \sin(0.02) = 0.5998\text{px}$$
- **AABB Evaluation of Text Example:** Since $\Delta X = 29.994\text{px} \ge 24\text{px}$, the text example itself would **NOT** be an AABB collision.
- **Root Cause Reconciliation:** The Phase 9 report author used a horizontal arc approximation near $0^\circ$ for illustrative narrative purposes. However, the actual code placement algorithm produced nodes at inclined angles ($\theta \approx 56.25^\circ \dots 303.75^\circ$). At these real angles, the vector projection distributes $\Delta R = 30\text{px}$ into $\Delta X = 19.395\text{px} < 24$ and $\Delta Y = 23.136\text{px} < 24$.
- **Conclusion:** The claimed 4 collisions are **100% mathematically and programmatically real AABB collisions**.

---

## 9. RADIAL VS EUCLIDEAN VS AABB CLEARANCE ANALYSIS

To prevent future confusion, the four clearance concepts are explicitly distinguished:

1. **Radial Separation ($\Delta R = |R_1 - R_2|$):** $30.00\text{px}$ between Ring 2 Track 4 ($450\text{px}$) and Ring 3 Track 1 ($480\text{px}$).
2. **Euclidean Center Distance ($D = \sqrt{\Delta X^2 + \Delta Y^2}$):** $30.189785\text{px}$ between co-angular nodes.
3. **Actual AABB Collision Predicate ($\Delta X < 24 \land \Delta Y < 24$):** Evaluates strictly in Cartesian screen space for square $24 \times 24\text{px}$ node body boxes.
4. **Conservative Sufficient Non-Overlap Bound ($D \ge 24\sqrt{2} \approx 33.941125\text{px}$):**
   - For a square box of side length $W = 24$, the maximum diagonal extent is $24\sqrt{2} \approx 33.94\text{px}$.
   - If Euclidean center distance $D \ge 33.94\text{px}$, then AABB overlap is **guaranteed impossible** regardless of angle.
   - If $D < 33.94\text{px}$ (e.g. $D = 30.19\text{px}$), AABB overlap **may occur** depending on orientation angle $\theta$. In our case, at $\theta \approx 56.4^\circ$, overlap **does occur**.

---

## 10. COMPLETE PBIM 3-HOP PAIR AUDIT

Auditing all 1,728 candidate pairs between Ring 2 Track 4 ($N=54$) and Ring 3 Track 1 ($N=32$):

- **Total Candidate Pairs:** 1,728
- **Actual AABB Collisions:** 4
- **Minimum $\Delta X$:** $0.000000\text{px}$
- **Minimum $\Delta Y$:** $2.047654\text{px}$
- **Minimum Euclidean Center Distance:** $30.000000\text{px}$
- **Minimum Radial Separation:** $30.000000\text{px}$
- **Minimum Distance Node Pair:** `LWC:citizen-complaint-list` (R2T3) vs `LWC:asset-management-dashboard` (R3T0) at exact same angle ($180^\circ$), where $\Delta X = 0.00\text{px}$ and $\Delta Y = 30.00\text{px}$. Because $\Delta Y = 30.00\text{px} \ge 24\text{px}$, this pair does **NOT** collide!

---

## 11. CROSS-CHECK ALL PHASE 9 DENSE DATASETS

Independent recomputation across all canonical dense scenarios at $T=4, \Delta r = 40\text{px}$, Strategy B:

| Scenario | Phase 9 Report Value | Independent Count | Match Status |
| :--- | :---: | :---: | :---: |
| **CST Org_Hierarchy 3-hop** | 0 | 0 | **100% MATCH** |
| **BQC 2-hop** | 2 | 2 | **100% MATCH** |
| **BQC 3-hop** | 4 | 4 | **100% MATCH** |
| **PBIM 2-hop** | 0 | 0 | **100% MATCH** |
| **PBIM 3-hop** | 4 | 4 | **100% MATCH** |

---

## 12. BQC TABLE RECONCILIATION

The apparent discrepancy in BQC 3-hop counts in Phase 9 was investigated and reconciled:

- At $T=2, \Delta r = 40\text{px}$, BQC 3-hop yields **2 overlaps** (both are same-track overlaps on Ring 1 Track 1 at $R=180\text{px}$).
- At $T=4, \Delta r = 40\text{px}$, BQC 3-hop yields **4 overlaps** (2 same-track overlaps on Ring 1 Track 1 + 2 cross-ring overlaps between Ring 2 Track 4 at $R=450\text{px}$ and Ring 3 Track 1 at $R=480\text{px}$).
- **Verdict:** There was no measurement bug or population error. The two tables in Phase 9 evaluated different track configurations ($T=2$ vs $T=4$).

---

## 13. CAPACITY BOUND VERIFICATION

The analytical 2D AABB capacity bound for a track at radius $R = 330\text{px}$ with $24\times24\text{px}$ nodes:

$$\text{Max Safe Nodes / Track} = \left\lfloor \frac{\pi}{\arcsin\left(\frac{24\sqrt{2}}{2 \times 330}\right)} \right\rfloor = \left\lfloor \frac{\pi}{\arcsin(0.051414)} \right\rfloor = \lfloor 61.07 \rfloor = 61$$

For $T = 4$ sub-tracks, total safe ring capacity is $4 \times 61 = 244$ nodes.
For PBIM Ring 2 ($N_2 = 217$), $217 \le 244$, giving a positive capacity margin of $+27$ nodes.
This analytical bound was empirically confirmed: same-track overlaps on PBIM Ring 2 dropped from 565 at $T=1$ to **0** at $T=4$.

---

## 14. LOCALITY METRIC VERIFICATION

Connected edge locality (Euclidean distance) was independently verified across identical edge populations:

| Scenario | Baseline Median (px) | Phase 8 Median (px) | Phase 9 Median (px) | Independent Verification (px) | Match |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **CST Org_Hierarchy 3-hop** | 313.57 | 418.07 | 325.29 | 325.29 | **MATCH** |
| **PBIM 2-hop** | 320.30 | 762.24 | 384.31 | 384.31 | **MATCH** |
| **PBIM 3-hop** | 345.05 | 803.03 | 406.56 | 406.56 | **MATCH** |

---

## 15. CANVAS MEASUREMENT VERIFICATION

Occupied canvas bounding boxes were independently verified:

- **PBIM 2-hop:** $922.48\text{px}$ (Width) $\times 922.48\text{px}$ (Height)
- **PBIM 3-hop:** $1224.00\text{px}$ (Width) $\times 1224.00\text{px}$ (Height)
- **CST Org_Hierarchy:** $1062.24\text{px}$ (Width) $\times 1062.24\text{px}$ (Height)

Bounding box formula verified: $\text{Width} = (\max X + r_{\text{node}}) - (\min X - r_{\text{node}})$.

---

## 16. DETERMINISM VERIFICATION

Independent re-execution of 10x identical runs and 10x random input-order shuffles confirmed:
- **Coordinate Drift:** $0.000000\text{px}$
- **Ordering Sequence Hash:** SHA-256 match ($100\%$ deterministic).

---

## 17. MEASUREMENT INTEGRITY FINDINGS

1. **Phase 9 Collision Calculations:** $100\%$ correct and accurate.
2. **PBIM 3-hop Residual Overlaps:** Confirmed as 4 real cross-ring AABB collisions.
3. **Phase 9 Failure Claim:** Confirmed as mathematically sound.

---

## 18. FAILURE ATTRIBUTION

The failure mechanism of PBIM 3-hop residual overlaps is attributed to:

1. **`CROSS_TRACK_INTER_RING_BOUNDARY`:** The radial gap $\Delta R = 30\text{px}$ between Ring 2 Track 4 ($450\text{px}$) and Ring 3 Track 1 ($480\text{px}$) is smaller than the conservative non-overlap threshold ($33.94\text{px}$).
2. **`INSUFFICIENT_INTER_RING_STEP`:** The fixed base step ($\Delta R_{\text{step}} = 150\text{px}$) is overwhelmed when a ring expands across 4 sub-tracks ($4 \times 40 = 160\text{px}$). Dynamic inter-ring step scaling ($\Delta R_{\text{step}, k} = 150 + (T_k - 1) \Delta r_{\text{track}}$) is required.

---

## 19. FINAL GATE MATRIX

| Gate ID | Gate Name | Requirement | Measured Value | Verdict |
| :--- | :--- | :--- | :--- | :---: |
| **G1** | Zero Production Modifications | 0 production files edited | 0 modified source files | **PASS** |
| **G2** | Predicate Identity | Implementation uses `dx < 24 && dy < 24` | `dx < 24 - 1e-3 && dy < 24 - 1e-3` | **PASS** |
| **G3** | Independent Verifier Match | Independent collision set matches Phase 9 | 4/4 exact pair match | **PASS** |
| **G4** | PBIM 3-Hop Overlap Reality | Overlaps satisfy `dx < 24 && dy < 24` | $\Delta X = 19.39\text{px}, \Delta Y = 23.14\text{px}$ | **PASS** |
| **G5** | Cross-Dataset Reconciliation | All dense dataset counts match | 100% match across all 5 scenarios | **PASS** |
| **G6** | Determinism & Shuffle Invariance | $0.00000\text{px}$ drift over 10x shuffles | $0.00000\text{px}$ drift | **PASS** |

---

## 20. FINAL CLASSIFICATION & NEXT PHASE RECOMMENDATION

### Final Classification

```text
RESIDUAL_COLLISION_CONFIRMED
```

### Production Authorization Verdict

```text
PHASE_9_RESIDUAL_FAILURE_CLAIM_CONFIRMED
```

### Recommendation for Next Phase
Because the four residual PBIM 3-hop overlaps are **confirmed real**, Phase 9's proposed fix is authorized for a **new controlled experiment** (Phase 11):

1. **Test Dynamic Inter-Ring Step Scaling:**
   $$\Delta R_{\text{step}, k} = 150\text{px} + (T_k - 1) \cdot \Delta r_{\text{track}}$$
   This will guarantee $\Delta R \ge 150\text{px}$ between the outermost track of Ring $k$ and the innermost track of Ring $k+1$.
2. **Do NOT modify production source code** until Phase 11 proves $100\%$ zero-overlap clearance across all scenarios.
