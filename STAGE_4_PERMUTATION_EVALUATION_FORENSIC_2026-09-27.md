# Stage 4 — Permutation Evaluation Forensic Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Subsystem:** Stage 4 Post-Placement Satellite Slot Permutation Refinement (`explorer/src/lib/layout/satellites.ts`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Measurement Scale:** Canonical Cloud Spend Tracker Fixture (240 nodes, 1,024 edges)

---

### Evaluation Summary

| Metric                        | Result |
| ----------------------------- | -----: |
| Stage 4 groups                |     12 |
| Total permutation evaluations |     49 |
| Unique permutation states     |     49 |
| Exact duplicate evaluations   |      0 |
| Maximum evaluations per group |      5 |

---

### Per-group Summary

| Group | Fields | Evaluations | Unique States | Repeats |
| ----- | -----: | ----------: | ------------: | ------: |
| `External:Account` | 4 | 4 | 4 | 0 |
| `Object:Action_Audit__c` | 4 | 4 | 4 | 0 |
| `Object:Cloud_Account__c` | 4 | 4 | 4 | 0 |
| `Object:Cloud_Service__c` | 5 | 5 | 5 | 0 |
| `Object:Cloud_Spend__c` | 8 | 5 | 5 | 0 |
| `External:Contact` | 2 | 2 | 2 | 0 |
| `Object:Fiscal_Period_Mapping__mdt` | 4 | 4 | 4 | 0 |
| `Object:Forecast__c` | 6 | 5 | 5 | 0 |
| `Object:Organization_Budget__c` | 3 | 3 | 3 | 0 |
| `Object:Organization_Hierarchy__c` | 3 | 3 | 3 | 0 |
| `Object:Spend_Import_Batch__c` | 12 | 5 | 5 | 0 |
| `Object:User_Organization_Role__c` | 8 | 5 | 5 | 0 |

---

### Redundancy Classification

* **Exact Duplicate States:** **0** (0.0%). Mathematically, for a group of $N \ge 2$ fields, cyclic shift $shift \in [0, \min(N, 5) - 1]$ assigns field $idx$ to slot $(idx + shift) \bmod N$. Because $shift < N$, every shift generates a $100\%$ distinct mapping of field nodes to slot coordinates.
* **Equivalent States:** **0**. No two shifts in the evaluated range produce identical spatial layouts.
* **Merely Equal Crossing Scores:** **7** evaluations across 12 groups (14.3%). For example, in `External:Contact` ($N=2$), $shift=0$ and $shift=1$ both yield a total crossing score of 88,370. Similarly, in `Object:Fiscal_Period_Mapping__mdt` ($N=4$), all 4 shifts yield 88,370 crossings. However, these represent distinct physical node position assignments in the 2D plane. Per authoritative Stage 4 rules, strict inequality (`candidateCrossings < currentBestCrossings`) retains the earlier shift ($shift=0$) in tie scenarios.
* **Genuinely Distinct States:** **49** evaluations (100.0%). Every single permutation evaluated in Stage 4 tests a genuinely distinct physical field-slot spatial arrangement.

---

### Safety Conclusion

1. **Are any Stage 4 evaluations provably redundant?**
   **No.** Out of 49 total permutation evaluations conducted across all 12 field parent groups on the canonical fixture, **0 evaluations represent exact duplicate states**. Every shift evaluates a unique assignment of field satellites to grid slots.

2. **Can any cyclic shifts be safely skipped?**
   **No.** In 7 out of 12 field parent groups (58.3%), a non-zero shift ($shift = 1, 2, \text{ or } 3$) produced a strictly lower crossing score than $shift = 0$, successfully reducing global graph crossings from 88,508 down to 87,589. Because the crossing impact of a field assignment depends on non-local edge topologies across the entire graph, it is impossible to predict which shift will be optimal without evaluating its crossing count. Skipping any shift risks missing the optimal placement and altering the selected layout geometry.

3. **Is a controlled permutation-pruning A/B experiment justified?**
   **No.** Since all 49 evaluations represent genuinely distinct candidate states and 58.3% of groups require non-zero shifts to reach their optimal layout, there is no mathematical or repository-supported basis for pruning cyclic shifts without causing layout regressions.

```text
NO SAFE PERMUTATION OPTIMIZATION ESTABLISHED
```

---

### Production Status

```text
Production files changed: 0
Production algorithm changed: NO
Commit: NO
Push: NO
```
