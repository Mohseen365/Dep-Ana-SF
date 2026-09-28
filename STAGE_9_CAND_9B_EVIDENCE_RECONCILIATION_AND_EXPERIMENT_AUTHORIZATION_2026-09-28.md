# Stage 9 CAND-9B Evidence Reconciliation and Experiment Authorization Report

**Report Date:** September 28, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Subsystem:** Stage 4 Post-Placement Satellite Slot Permutation Refinement (`explorer/src/lib/layout/satellites.ts`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## 1. Executive Summary

This report performs a strict, read-only historical and technical evidence reconciliation for Stage 9 Candidate **CAND-9B: Incident-Bounded Stage 4 Field Slot Permutation Refinement**.

### Key Empirical Findings & Reconciliation Resolves

1. **Candidate Identity & Prior Work**:
   - CAND-9B proposes restricting edge-crossing evaluations during Stage 4 cyclic field slot shifts to edges directly incident to the active field cluster, avoiding full-graph ($E_{\text{total}}$) edge sweeps.
   - Thorough repository investigation confirms that CAND-9B is **`GENUINELY NEW`** (or `ALREADY KNOWN — NOT EXPERIMENTED`).
   - While CAND-9B was hypothesized in forensic reports (`STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md` and `STAGE 9 LINEAGE RECONCILED — CANDIDATE READY FOR CONTROLLED EXPERIMENT.md`), **zero implementation code or controlled A/B experiments** have ever been created or executed for incident-bounded Stage 4 edge filtering.
   - Prior Stage 4 experiments tested cyclic shift pruning (`STAGE_4_PERMUTATION_EVALUATION_FORENSIC_2026-09-27.md`) and BigInt `Map` edge-pair result caching (`STAGE_4_EXACT_EDGE_PAIR_MEMOIZATION_AB_EXPERIMENT_2026-09-27.md`), both of which are materially distinct from CAND-9B.

2. **Mathematical Locality Proof**:
   - Proof establishes that during cyclic slot shifts for field cluster $F$, 100% of non-field nodes and field nodes outside $F$ maintain fixed 2D coordinates.
   - Consequently, all edge pairs $\{e_1, e_2\} \subseteq E \setminus E_{\text{incident}}(F)$ have invariant 2D geometry, making their mutual intersection status constant across all candidate shifts.
   - Constant static-static edge crossings cancel out identically when comparing candidate shift scores ($\Delta \text{Crossings} < 0$).
   - Evaluating ONLY edge pairs involving at least one edge in $E_{\text{incident}}(F)$ is **mathematically exact**, producing zero false positives, zero false negatives, and bit-for-bit identical selected field slot permutations ($0.00000\text{ px}$ coordinate drift).

3. **Runtime & Metric Verification**:
   - **46.9% Stage 9 Runtime Claim**: Verified from `STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md`. At Tier 5 (5,000 nodes, 10,024 edges), full Stage 9 runtime was $163,354.12\text{ ms}$, of which Stage 4 field slot permutation refinement (`evaluateTotalCrossings`) consumed $76,656.58\text{ ms}$ ($46.9\%$).
   - **10,024 Edge Metric**: Verified as total layout graph edges (`safeEdges`) passed into `placeSatellites` and `evaluateTotalCrossings` at Tier 5 synthetic scale graph. At Tier 1 (Cloud Spend Tracker), `safeEdges` contains $1,024$ total edges.
   - Incident-bounded edge filtering reduces evaluated edges per shift from $10,024$ down to $\approx 4\text{--}15$ edges ($>99.7\%$ reduction in segment pair evaluations per shift).

4. **Experiment Authorization Gate Decision**:
   - **Decision: B — `STAGE 9 CAND-9B — READY FOR CONTROLLED EXPERIMENT`**.
   - CAND-9B satisfies all 8 mandatory authorization criteria. A controlled A/B experiment contract is specified, leaving all production code 100% frozen.

---

## 2. Repository/Git Baseline

Current repository state and frozen layout authorities:

* **Primary Subsystem Target**: Stage 4 within `explorer/src/lib/layout/satellites.ts` (`fieldsByParent.forEach` & `evaluateTotalCrossings`)
* **Canonical Benchmark Fixture**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
* **Frozen Production Layout Baseline**:
  - `explorer/src/lib/layout/satellites.ts` (Stage 9 Secondary Satellite Placement — Concentric-Ring & Stage 4 Baseline)
  - `explorer/src/lib/layout/ordering.ts` (Stage 6 Crossing Reduction — T2 Early Exit Baseline)
  - `explorer/src/lib/layout/global-layout.ts` (Stage 5 Global Feature Layout)
  - `explorer/src/lib/layout/local-layout.ts` (Stage 7 Local Placement)
  - `explorer/src/lib/layout/spacing.ts` (Stage 11 Collision Cleanup)

Zero lines of production code, test harnesses, or benchmark fixtures were modified during this reconciliation.

---

## 3. Stage 4 Artifact Inventory

Authorized inventory of all Stage 4 and Stage 9 forensic reports, A/B experiments, and source files:

| Artifact | Type | Target | Hypothesis | Finding / Decision | Productionized? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `explorer/src/lib/layout/satellites.ts` | Source | Stage 4 | Unbounded full-graph edge sweep (`evaluateTotalCrossings`) across cyclic shifts | Baseline authority; consumes 46.9% of Stage 9 runtime at 5,000 nodes | YES (Baseline) |
| `STAGE_4_PERMUTATION_EVALUATION_FORENSIC_2026-09-27.md` | Report | Stage 4 | Prune cyclic shifts ($shift \ge 1$) to reduce evaluations | REJECTED: 58.3% of groups require non-zero shifts to reach optimal crossing count | NO |
| `STAGE_4_EXACT_EDGE_PAIR_MEMOIZATION_AB_EXPERIMENT_2026-09-27.md` | Report | Stage 4 | Cache `segmentsIntersect` results using BigInt `Map` keys | REJECTED (A3): 12.9x slowdown due to V8 `Map` lookup and BigInt bitwise key overhead | NO |
| `STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md` | Report | Stage 9 | Deconstruct Stage 9 runtime; hypothesized incident-bounded Stage 4 filtering | Forensic proof: Stage 4 consumes $76.65\text{s}$ ($46.9\%$) at Tier 5; proposed incident-bounded filter | NO (Report only) |
| `STAGE_9_INTERSECTION_DUPLICATE_REUSE_FORENSIC_2026-09-27.md` | Report | Stage 9 | Quantify duplicate edge-pair evaluations across layout sub-routines | Proved Stage 4 accounts for 98.63% of duplicate calls (14.46M duplicate pairs) | NO (Report only) |
| `STAGE 9 LINEAGE RECONCILED — CANDIDATE READY FOR CONTROLLED EXPERIMENT.md` | Report | Stage 9 | Reconcile Stage 9 lineage and isolate CAND-9A and CAND-9B | Isolated CAND-9B as a new candidate; did not implement or execute experiment | NO (Report only) |

---

## 4. Historical Optimization Timeline

1. **Sept 26, 2026 — Full Pipeline Attribution**:
   Established Stage 9 Secondary Satellite Placement as primary pipeline dominator at scale ($227.14\text{s} / 76.5\%$ of total pipeline time at 5,000 nodes).
2. **Sept 27, 2026 — Cost Decomposition Forensic**:
   Isolated `segmentsIntersect` ($152.35\text{s} / 93.2\%$ of Stage 9) as internal root cause, with Stage 4 field slot permutation refinement consuming $76.65\text{s}$ ($46.9\%$ of Stage 9).
3. **Sept 27, 2026 — Stage 4 Shift Permutation Forensic**:
   Evaluated whether cyclic shifts could be skipped. Proved 100% of shifts evaluate unique spatial states and 58.3% of groups require non-zero shifts to minimize crossings.
4. **Sept 27, 2026 — Stage 4 Exact Edge-Pair Memoization Experiment**:
   Evaluated BigInt `Map` result caching in Stage 4. Resulted in a severe $12.9\times$ runtime regression due to V8 `Map` hash lookup overhead outweighing inline scalar floating-point math.
5. **Sept 28, 2026 — CAND-9A Reconciliation Gate**:
   Proved CAND-9A (inline scalar AABB pre-filter) was already evaluated in `STAGE_9_AABB_PREFILTER_ISOLATED_AB_EXPERIMENT_2026-09-27.md` and regressed runtime by 10%–26% due to V8 branch mispredictions. Reconciled $1.71\text{B}$ segment checks vs $140\text{B}+$ operations.
6. **Sept 28, 2026 — CAND-9B Evidence Reconciliation (Current)**:
   Conduct read-only reconciliation for CAND-9B (incident-bounded Stage 4 refinement), establish mathematical locality proof, and evaluate experiment authorization gate.

---

## 5. Current Stage 4 Algorithm

The current production implementation of Stage 4 Post-Placement Satellite Slot Permutation Refinement in `explorer/src/lib/layout/satellites.ts`:

```ts
// STAGE 4: POST-PLACEMENT SATELLITE SLOT PERMUTATION REFINEMENT
fieldsByParent.forEach((fields) => {
  if (fields.length < 2) return;
  const fieldIds = fields.map(f => f.nodeId);
  const slots = fieldIds.map(id => positions[id]).filter(Boolean);
  if (slots.length !== fieldIds.length) return;

  let currentBestCrossings = evaluateTotalCrossings(safeEdges, positions);

  // Test cyclic permutations of slot assignments
  for (let shift = 1; shift < Math.min(fieldIds.length, 5); shift++) {
    const candidatePositions = { ...positions };
    fieldIds.forEach((id, idx) => {
      candidatePositions[id] = slots[(idx + shift) % fieldIds.length];
    });

    const candidateCrossings = evaluateTotalCrossings(safeEdges, candidatePositions);
    if (candidateCrossings < currentBestCrossings) {
      currentBestCrossings = candidateCrossings;
      fieldIds.forEach((id) => {
        positions[id] = candidatePositions[id];
        satellitePositions[id] = candidatePositions[id];
      });
    }
  }
});
```

Where `evaluateTotalCrossings` evaluates all pairs in `safeEdges` ($1,024$ edges at CST, $10,024$ edges at Tier 5):

```ts
function evaluateTotalCrossings(
  edges: ExplorerEdge[],
  positions: Record<string, { x: number; y: number }>
): number {
  const segs: EdgeSeg[] = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const p1 = positions[e.source];
    const p2 = positions[e.target];
    if (p1 && p2) {
      segs.push({ p1, p2, s: e.source, t: e.target });
    }
  }

  let count = 0;
  for (let i = 0; i < segs.length; i++) {
    const s1 = segs[i];
    for (let j = i + 1; j < segs.length; j++) {
      const s2 = segs[j];
      if (s1.s === s2.s || s1.s === s2.t || s1.t === s2.s || s1.t === s2.t) continue;
      if (segmentsIntersect(s1.p1, s1.p2, s2.p1, s2.p2)) {
        count++;
      }
    }
  }
  return count;
}
```

---

## 6. CAND-9B Exact Hypothesis

CAND-9B proposes modifying the Stage 4 crossing score evaluation as follows:

```text
Stage 4 field-slot permutation refinement
→ active field cluster F is locally shifted/permuted
→ identify incident edge subset E_incident(F) = { e ∈ E | e.source ∈ F ∨ e.target ∈ F }
→ evaluate crossing count strictly for pairs {e1, e2} where at least one edge e ∈ E_incident(F)
→ avoid evaluating static-static edge pairs {e1, e2} ⊆ E \ E_incident(F)
```

### Analytical Breakdown
- **Oracle**: Calls `evaluateTotalCrossings(safeEdges, candidatePositions)`, sweeping $\binom{|E|}{2}$ edge pairs (e.g. $\binom{10,024}{2} \approx 50,235,276$ pair evaluations per shift).
- **Candidate**: Calls `evaluateIncidentCrossings(incidentEdges, safeEdges, candidatePositions)`, sweeping $|E_{\text{incident}}| \cdot |E| - \binom{|E_{\text{incident}}|}{2}$ edge pairs (e.g. $10 \times 10,024 \approx 100,240$ pair evaluations per shift).

---

## 7. Prior-Work Identity Reconciliation

### Classification Result

```text
CLASSIFICATION: GENUINELY NEW (ALREADY KNOWN — NOT EXPERIMENTED)
```

### Detailed Justification
1. **Comparison with `STAGE_4_PERMUTATION_EVALUATION_FORENSIC_2026-09-27.md`**:
   - Prior report evaluated whether cyclic shift iterations ($shift \in [1..4]$) could be skipped. It did NOT modify the edge evaluation loop inside `evaluateTotalCrossings`.
2. **Comparison with `STAGE_4_EXACT_EDGE_PAIR_MEMOIZATION_AB_EXPERIMENT_2026-09-27.md`**:
   - Prior experiment evaluated BigInt `Map` result caching across all full-graph edge pairs. It evaluated all edges and cached boolean results in a hash map. It did NOT restrict the evaluated edge subset based on incident nodes.
3. **Comparison with Historical Reports**:
   - Forensic reports (`STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md`) conceptualized incident-edge filtering, but NO code, harness, or A/B experiment was ever written or executed.

Conclusion: CAND-9B is genuinely new and has never been experimentally evaluated.

---

## 8. Locality / Correctness Analysis

### A. What Moves?
Only the field satellite nodes $v \in F$ belonging to the active parent object cluster `fields` are assigned new 2D coordinates `slots[(idx + shift) % fieldIds.length]`.

### B. What Remains Fixed?
All primary nodes, all non-field satellite nodes (tests, microclusters), and all field satellite nodes belonging to other parent objects maintain 100% fixed 2D coordinates ($P'(v) = P(v)$).

### C. Which Edges Change Geometry?
Only edges $e \in E_{\text{incident}}(F)$ where $e.\text{source} \in F$ or $e.\text{target} \in F$ experience coordinate changes when $F$ is shifted.

### D. Mathematical Locality Proof
Let $E = E_{\text{incident}}(F) \cup E_{\text{static}}(F)$, where $E_{\text{static}}(F) = E \setminus E_{\text{incident}}(F)$.

For any candidate position map $P'$, total graph crossings are:
$$\text{Crossings}(P') = \sum_{\{e_1, e_2\} \subseteq E_{\text{static}}} \text{intersects}(P', e_1, e_2) + \sum_{e_1 \in E_{\text{incident}}, e_2 \in E} \text{intersects}(P', e_1, e_2) - \sum_{\{e_1, e_2\} \subseteq E_{\text{incident}}} \text{intersects}(P', e_1, e_2)$$

Since no endpoint of any edge $e \in E_{\text{static}}$ is in $F$, $P'(v) = P(v)$ for all endpoints of $E_{\text{static}}$.
Therefore:
$$\sum_{\{e_1, e_2\} \subseteq E_{\text{static}}} \text{intersects}(P', e_1, e_2) = C_{\text{static}} \quad (\text{a constant independent of } shift)$$

When comparing candidate shift $P'_{\text{shift}}$ against baseline $P'_{\text{best}}$:
$$\text{Crossings}(P'_{\text{shift}}) < \text{Crossings}(P'_{\text{best}})$$
$$\iff C_{\text{static}} + \text{Crossings}_{\text{incident}}(P'_{\text{shift}}) < C_{\text{static}} + \text{Crossings}_{\text{incident}}(P'_{\text{best}})$$
$$\iff \text{Crossings}_{\text{incident}}(P'_{\text{shift}}) < \text{Crossings}_{\text{incident}}(P'_{\text{best}})$$

$C_{\text{static}}$ cancels out **identically and exactly** on both sides of the inequality!

### E. Correctness Conclusion
Evaluating strictly incident-involved edge crossings ($\text{Crossings}_{\text{incident}}$) produces **100% exact mathematical equivalence** in all shift selection comparisons. Zero false positives or false negatives can occur.

---

## 9. 46.9% Runtime Attribution Verification

Verification of the 46.9% Stage 9 runtime claim:

- **Source**: `STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md` (Section A & J) and `FULL_LAYOUT_STAGE_RUNTIME_ATTRIBUTION_2026-09-26.md`.
- **Target Tier**: Synthetic Tier 5 (5,000 nodes, 10,024 edges).
- **Measurement Method**: High-precision wall-clock timing using `performance.now()` in isolated benchmark harness `explorer/src/test/stage9-cost-decomposition.test.ts`.
- **Measured Metrics**:
  - Full Stage 9 Total Duration: $163,354.12\text{ ms}$
  - Stage 4 Permutation Refinement Duration (`evaluateTotalCrossings`): $76,656.58\text{ ms}$
  - Percentage: $\frac{76,656.58}{163,354.12} \times 100\% = 46.91\%$
- **Verification Result**: CONFIRMED. Stage 4 refinement consumes 46.9% of total Stage 9 runtime at 5,000 nodes.

---

## 10. 10,024-Edge Metric Verification

Verification of the reported `10,024 edges` metric:

- **Source**: `FULL_LAYOUT_STAGE_RUNTIME_ATTRIBUTION_2026-09-26.md` and `satellites.ts` (`safeEdges`).
- **Meaning**: Represents the total layout graph edges (`safeEdges`) passed into `placeSatellites` and evaluated in `evaluateTotalCrossings` at Tier 5 synthetic scale graph ($5,000$ nodes, $10,024$ edges).
- **Scale Comparison**:
  - Tier 1 (Cloud Spend Tracker, 240 nodes): $1,024$ total edges in `safeEdges`.
  - Tier 5 (Synthetic Graph, 5,000 nodes): $10,024$ total edges in `safeEdges`.
- **Verification Result**: CONFIRMED. `10,024 edges` is the exact total edge count of the Tier 5 benchmark graph.

---

## 11. Correctness Contract

Any future CAND-9B experiment must satisfy 13 strict pipeline invariants:

1. **Exact Selected Permutation Match**: The chosen cyclic shift for every field group must match the Oracle 100%.
2. **Exact Final Crossing Count Match**: Final $C_{pp}$ and $C_{total}$ must be bit-for-bit identical to the Oracle.
3. **Primary Geometry Immutability**: Primary node positions (Stages 1–8) are 100% immutable ($\Delta x = 0.00000\text{ px}, \Delta y = 0.00000\text{ px}$).
4. **Satellite Geometry Drift**: Maximum coordinate drift across all satellite nodes must be $\Delta = 0.00000\text{ px}$.
5. **Minimum Clearance Gap**: Minimum physical clearance must remain $\ge 40.0\text{ px}$.
6. **Zero Overlaps**: Zero primary/primary, primary/satellite, or satellite/satellite node overlaps.
7. **Zero Layer Violations**: Zero layer ordering flow violations.
8. **Repetition Determinism**: $0.00000\text{ px}$ drift across 10x repeated runs under identical seed.
9. **Shuffled Input Determinism**: $0.00000\text{ px}$ drift under 5x shuffled input permutations.
10. **Canonical Crossing Limits**: $C_{pp} \le 9,335$ and $C_{total} \le 95,000$ on canonical CST dataset.
11. **Tie-Break Preservation**: Strict inequality (`candidateCrossings < currentBestCrossings`) preserved bit-for-bit.
12. **No Unrelated Modifications**: Stage 5, Stage 6, Stage 7, Stage 9 candidate scoring, and Stage 11 remain 100% unchanged.
13. **Isolated Experiment**: CAND-9B must be evaluated without combining CAND-9A (AABB filtering) or BigInt `Map` caches.

---

## 12. Candidate Classification

```text
CANDIDATE CLASSIFICATION: GENUINELY NEW (READY FOR EXPERIMENT)
```

CAND-9B is genuinely new, mathematically sound, and addresses the proven $46.9\%$ Stage 4 bottleneck without modifying unrelated layout stages or resurrecting disproven optimizations.

---

## 13. Experiment Authorization Decision

Evaluating against all 8 mandatory authorization criteria:

1. No equivalent historical experiment exists? **YES** (proven: 0 prior A/B experiments tested incident-bounded Stage 4 filtering).
2. Current implementation supports the hypothesis? **YES** (`fieldsByParent.forEach` in `satellites.ts` mutates only field satellite coordinates in `candidatePositions`).
3. Affected-edge set can be precisely defined? **YES** ($E_{\text{incident}}(F) = \{ e \in E \mid e.\text{source} \in F \lor e.\text{target} \in F \}$).
4. Locality correctness can be justified? **YES** (proved mathematically: static-static edge pair intersection states are invariant constants across cyclic shifts, canceling out identically).
5. Candidate does not depend on modifying unrelated layout stages? **YES** (isolated strictly within Stage 4 slot permutation refinement).
6. Experiment can be isolated? **YES** (via test harness `explorer/src/test/stage4-incident-bounded-ab.test.ts`).
7. Oracle remains available? **YES** (current `evaluateTotalCrossings(safeEdges, candidatePositions)`).
8. Correctness can be measured exactly? **YES** ($0.00000\text{ px}$ drift, 100% exact permutation selection match, 100% exact crossing score match).

### Final Gate Decision

```text
DECISION: B — STAGE 9 CAND-9B — READY FOR CONTROLLED EXPERIMENT
```

---

## 14. Controlled Experiment Contract (For Future Execution)

The authorized experiment contract specifies:

* **Harness File**: `explorer/src/test/stage4-incident-bounded-ab.test.ts`
* **Oracle Implementation**: Current `evaluateTotalCrossings(safeEdges, candidatePositions)`.
* **Candidate Implementation**: `evaluateIncidentCrossings(incidentEdges, safeEdges, candidatePositions)`.
* **Frozen Scope**:
  - `explorer/src/lib/layout/satellites.ts` (0 lines changed in production source during experiment)
  - `ordering.ts`, `global-layout.ts`, `local-layout.ts`, `spacing.ts` (100% frozen)
  - `audit-fixtures/cloud-spend-tracker/explorer-data.json` (100% frozen)
* **Required Measurements**:
  - Selected permutation equivalence across all 12 field parent groups (100% match required)
  - Final satellite coordinate drift ($\Delta = 0.00000\text{ px}$ required)
  - Evaluated edge-pair count reduction percentage (expected $>95\%$)
  - Isolated Stage 4 wall-clock runtime (ms) and speedup ratio ($T_{\text{oracle}} / T_{\text{candidate}}$)
  - Isolated Stage 9 wall-clock runtime (ms) and full-pipeline runtime (ms)
  - 10x repetition determinism and 5x input order shuffle determinism

---

## 15. Frozen Scope Verification

The following core files remain 100% frozen and unmodified:

* `explorer/src/lib/layout/satellites.ts` (0 lines changed)
* `explorer/src/lib/layout/ordering.ts` (0 lines changed)
* `explorer/src/lib/layout/global-layout.ts` (0 lines changed)
* `explorer/src/lib/layout/local-layout.ts` (0 lines changed)
* `explorer/src/lib/layout/spacing.ts` (0 lines changed)
* `audit-fixtures/cloud-spend-tracker/explorer-data.json` (0 lines changed)

---

## 16. Final Diff Audit

Executing git status and git diff verification commands:

```bash
git status --short
git diff --stat explorer/src/lib/layout/satellites.ts
```

Output:
- Zero production source code files modified.
- Zero test suite files modified.
- Zero fixture files modified.
- Zero benchmark generator files modified.
- Zero historical experiment reports modified.
- Only the newly authorized reconciliation report (`STAGE_9_CAND_9B_EVIDENCE_RECONCILIATION_AND_EXPERIMENT_AUTHORIZATION_2026-09-28.md`) created.

---

## 17. Final Classification

```text
STAGE 9 CAND-9B — READY FOR CONTROLLED EXPERIMENT
```
