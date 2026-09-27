# Stage 9 — Candidate Crossing-Reuse Forensic Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Subsystem:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## 1. Measurement Summary

Measurement was conducted strictly on **Stage 9 candidate slot scoring (`generateSatelliteSlots`)** for the canonical Cloud Spend Tracker fixture.

* **Stage 4 permutation refinement** was explicitly excluded.
* **Satellite-satellite segment checks** were excluded.
* Primary segment intersection calls were measured using exact identity for `candidate tether + primary segment` pairs without coordinate truncation.

### Primary Geometry Identity Totals

```text
unique candidate tethers : 9,859
unique primary segments  : 353
```

---

## 2. Measurement Data Table

| Scope                             | Total Calls | Unique Pairs | Duplicate Calls | Duplicate % | Max Reuse |
| --------------------------------- | ----------: | -----------: | --------------: | ----------: | --------: |
| One scoring operation             |   4,554,858 |    3,480,227 |       1,074,631 |      23.59% |         5 |
| One `generateSatelliteSlots` call |   4,554,858 |    3,480,227 |       1,074,631 |      23.59% |         5 |
| Across Stage 9 calls              |   4,554,858 |    3,480,227 |               0 |       0.00% |         1 |
| Combined                          |   4,554,858 |    3,480,227 |       1,074,631 |      23.59% |         5 |

---

## 3. Scope Analysis Breakdown

### A. Within one candidate scoring operation (and within one `generateSatelliteSlots` invocation)
During each candidate slot evaluation inside `generateSatelliteSlots`, `endpointsToTest` evaluates candidate tethers from all incident endpoints of the satellite node (e.g. multiple anchors/incident connections). When a satellite node has $k > 1$ incident endpoints (up to 5 in the dataset), each endpoint tests the same candidate slot tether against the exact same static primary segments ($353$ primary segments). This generates **1,074,631 duplicate calls (23.59%)** within individual slot scoring operations.

### B. Across different `generateSatelliteSlots` invocations
Different parent anchors are placed at distinct $(x, y)$ coordinates across the layout canvas. Because candidate slots are generated relative to each parent anchor ($x = \text{anchor.x} + c \cdot dx$), candidate slot tethers from different `generateSatelliteSlots` invocations do not share exact geometric endpoint coordinates with other invocations. Thus, **0 duplicate calls (0.00%)** occur across distinct Stage 9 calls.

---

## 4. Reuse Safety

| Scope                             | Same Geometry | State Stable | Result Stable | Reuse Safe |
| --------------------------------- | ------------- | ------------ | ------------- | ---------- |
| One scoring operation             | YES           | YES          | YES           | SAFE WITHIN ONE SCORING OPERATION |
| One `generateSatelliteSlots` call | YES           | YES          | YES           | SAFE WITHIN ONE generateSatelliteSlots CALL |
| Across Stage 9 calls              | N/A (0 dups)  | YES          | YES           | SAFE ACROSS Stage 9 CALLS |

### Forensic Safety & Invariance Verification
* **Anchor & Candidate Endpoint Coordinates:** Identical floating-point values across all evaluated pairs within each scoring operation.
* **Primary Segment Geometry:** Static primary segment endpoints $(p_1, p_2)$ remain completely fixed throughout Stage 9 execution.
* **Input Equivalence:** Inputs to `segmentsIntersect` are 100% deterministic and pure.
* **Result Consistency:** Zero inconsistent boolean results were observed across all 4,554,858 calls ($0$ discrepancies out of $3,480,227$ unique pairs).

---

## 5. Final Conclusion

1. **Is duplicate candidate-crossing work significant?**
   **Yes.** During candidate satellite slot scoring on the canonical fixture, **1,074,631 out of 4,554,858 primary intersection evaluations (23.59%)** test exact duplicate `candidate tether + primary segment` geometric pairs.

2. **Where does it occur?**
   Duplicate evaluations occur **within single candidate scoring operations** when multiple incident endpoints (`endpointsToTest`) evaluate a candidate slot tether against the same static primary segments.

3. **Is there a semantics-preserving reuse opportunity worth a separate A/B experiment?**
   **Yes.**

```text
CANDIDATE-CROSSING REUSE EXPERIMENT JUSTIFIED
```

---

## 6. Production Safety

```text
Production files changed: 0
Production algorithm changed: NO
Commit: NO
Push: NO
```
