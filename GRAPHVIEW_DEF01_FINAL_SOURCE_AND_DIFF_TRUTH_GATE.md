# GRAPHVIEW — DEF-01 FINAL SOURCE-AND-DIFF TRUTH GATE REPORT

**Report File:** `GRAPHVIEW_DEF01_FINAL_SOURCE_AND_DIFF_TRUTH_GATE.md`
**Execution Date:** October 9, 2026
**Auditor:** Jules (AI Software Engineer)
**Audit Scope:** Read-Only Final Source and Git Diff Truth Audit for DEF-01 Canonical Context Baseline
**Executive Verdict:** `PASS — BASELINE ACCEPTED`

---

### 1. EXECUTIVE VERDICT

**FINAL VERDICT: PASS — BASELINE ACCEPTED**

A read-only source-and-diff truth gate audit of the DEF-01 position-isolation correction and its canonical context updates confirms that:

1. **Proven Invariant:** Direct source code analysis of `computeArchitectureLayoutWithMetadata` in `explorer/src/lib/architecture-layout.ts` establishes that for all non-empty node inputs (`safeNodes.length > 0`), the position map returned in Orbit and Constellation modes contains **strictly** projected node IDs (`result.projectedNodeIds`). With the deletion of the two 6-line fallback loops, no code path exists to re-inject unprojected `existingPositions` into calculation results.
2. **Exact Context Minimality:** Read-only Git inspection confirms that all four canonical context updates (`context/CURRENT-DECISIONS.md`, `context/CURRENT-TESTS.md`, `context/CURRENT-CONTRACTS.md`, `context/CURRENT-ARCHITECTURE.md`) are minimal (total 10 lines added), necessary, owned by their respective authority files, non-redundant, and accurate.
3. **Evidence Provenance Preserved:** All test, mutation, static inspection, and browser verification claims are precisely categorized according to source truth (`FACT`, `EXECUTED TEST EVIDENCE`, `REPORTED EXECUTION EVIDENCE`, `STATIC INSPECTION`, `INFERENCE`, `NOT VERIFIED`).
4. **Untouched Source Baseline:** Git diff analysis confirms that production source code (`architecture-layout.ts`), regression tests (`def01-position-isolation.test.ts`), and package manifests are 100% clean and untouched by context-maintenance operations.
5. **Product Gate Isolation:** Product Gates A–D (shared SObjects visual representation, angular placement semantics, unreachable-node UX presentation, and drag persistence scoping) remain explicitly open and unresolved.

---

### 2. REPOSITORY IDENTITY AND CURRENT GIT STATE

- **Repository Root:** `/app`
- **Current Branch:** `jules-7532417870078139272-831b518b`
- **HEAD Commit SHA:** `e976696d518c3d4f8544c268a1803ca6bc8084c6`
- **Baseline Commit Comparison:** SHA `e976696d518c3d4f8544c268a1803ca6bc8084c6` is the appropriate baseline commit containing the merged DEF-01 fix (removal of fallback loops in `architecture-layout.ts`) and dedicated Vitest suite (`def01-position-isolation.test.ts`).
- **`git status --short`:**
```text
A  GRAPHVIEW_DEF01_CANONICAL_CONTEXT_CLOSURE_REPORT.md
M  context/CURRENT-ARCHITECTURE.md
M  context/CURRENT-CONTRACTS.md
M  context/CURRENT-DECISIONS.md
M  context/CURRENT-TESTS.md
```
- **Source and Test Diffs:**
  - `git diff HEAD -- explorer/src/lib/architecture-layout.ts`: `0 lines changed` (`FACT`).
  - `git diff HEAD -- explorer/src/test/def01-position-isolation.test.ts`: `0 lines changed` (`FACT`).
  - `git diff HEAD -- package.json explorer/package.json`: `0 lines changed` (`FACT`).

---

### 3. ACTUAL SOURCE EVIDENCE FOR THE POSITION-KEY INVARIANT

Direct inspection of `explorer/src/lib/architecture-layout.ts` (lines 110–202) establishes the exact calculation pipeline for Lens B:

#### A. `projectedNodeIds` Construction
- **Constellation Branch (L123–155):** `adaptComponentConstellation` computes `projection`. Returns `projectedNodeIds: new Set(Object.keys(projection.nodes))` (L154).
- **Orbit Branch (L170–201):** `adaptComponentOrbit` computes `projection`. Returns `projectedNodeIds: new Set(Object.keys(projection.nodes))` (L200).

#### B. Position Map Construction
- **Constellation Branch (L148–151):**
  ```typescript
  const constellationPositions: Record<string, { x: number; y: number }> = {};
  for (const [nodeId, pos] of Object.entries(constellationOutput.positions)) {
    constellationPositions[nodeId] = { x: pos.x, y: pos.y };
  }
  ```
- **Orbit Branch (L194–197):**
  ```typescript
  const orbitPositions: Record<string, { x: number; y: number }> = {};
  for (const [nodeId, pos] of Object.entries(orbitOutput.positions)) {
    orbitPositions[nodeId] = { x: pos.x, y: pos.y };
  }
  ```

#### C. Path Analysis & Invariant Guarantee
- Both branches return early (L152 and L198) before reaching downstream steps or the global `existingPositions` merge loop at L488.
- The two former fallback loops (`for (const [id, pos] of Object.entries(existingPositions)) { ... }`) at former L149–153 and L192–196 are absent.
- Both `computeComponentConstellationLayout` and `computeComponentOrbitLayout` iterate over `projection.nodes`. Therefore, every key in `result.positions` corresponds to a projected node ID.
- **Edge Case Analysis:**
  - `safeNodes.length === 0`: In Orbit mode (L111), returns `{ positions: { ...existingPositions }, orbitGuides: orbitOutput.guides }`, where `projectedNodeIds` is `undefined`.
  - For all non-empty inputs (`safeNodes.length > 0`), `Set(Object.keys(result.positions))` strictly equals `result.projectedNodeIds`.

**Conclusion for Audit A:** **`PROVEN INVARIANT`** (for non-empty node inputs).

---

### 4. EXACT CONTEXT DIFF AND MINIMALITY ASSESSMENT

Inspecting the exact diffs in `context/` vs commit `e976696d518c3d4f8544c268a1803ca6bc8084c6`:

```text
 context/CURRENT-ARCHITECTURE.md | 2 ++
 context/CURRENT-CONTRACTS.md    | 1 +
 context/CURRENT-DECISIONS.md    | 6 ++++++
 context/CURRENT-TESTS.md        | 1 +
 4 files changed, 10 insertions(+)
```

#### Detailed Per-File Assessment

1. **`context/CURRENT-DECISIONS.md` (6 lines added):**
   - **Added Content:** Section 8 "DEF-01 Lens B Position-Key Isolation". Records Decision #8, detailing position map key restriction, removal of 12 lines in `architecture-layout.ts`, Product Gates A–D isolation, and citation of `GRAPHVIEW_DEF01_FINAL_EXECUTION_EVIDENCE_GATE_REPORT.md`.
   - **Authority & Minimality:** `CURRENT-DECISIONS.md` is the sole authority for enforced architectural and defect decisions. Necessary, non-redundant, accurate. **RETAIN.**

2. **`context/CURRENT-TESTS.md` (1 line added):**
   - **Added Content:** Entry under Section 2 ("Frontend Vitest Test Suite") for `explorer/src/test/def01-position-isolation.test.ts` (Tests A–D).
   - **Authority & Minimality:** `CURRENT-TESTS.md` is the sole authority for test inventories. Necessary to register the dedicated Vitest regression suite. **RETAIN.**

3. **`context/CURRENT-CONTRACTS.md` (1 line added):**
   - **Added Content:** "Lens B Position Isolation Invariant (DEF-01)" under Section 2 ("Layout & Geometry Contracts").
   - **Authority & Minimality:** `CURRENT-CONTRACTS.md` is the authority for interface/geometry contracts. Necessary to formalize position calculation outputs for callers. **RETAIN.**

4. **`context/CURRENT-ARCHITECTURE.md` (2 lines added):**
   - **Added Content:** Appended position-key isolation statement to Section 4 ("Layout Pipeline & Position Authority").
   - **Authority & Minimality:** `CURRENT-ARCHITECTURE.md` governs position authority hierarchy levels 1–5. Necessary to document Level 4 layout behavior in Lens B modes. **RETAIN.**

**Minimality Verdict:** Exactly 10 lines added across 4 context files. Each addition is directly owned by its respective authority file and introduces 0 unsupported claims.

---

### 5. TEST AND MUTATION EVIDENCE PROVENANCE

Evidence is classified according to source level:

| Evidence Item | Execution Status | Provenance Classification | Evidence Source |
|---|---|---|---|
| Dedicated Vitest Suite (`def01-position-isolation.test.ts`) | Passed 4/4 in 27ms (exit code 0) | **REPORTED EXECUTION EVIDENCE** | `GRAPHVIEW_DEF01_FINAL_EXECUTION_EVIDENCE_GATE_REPORT.md` |
| Master CLI Suite (`npm run test:cli`) | Passed 31/31 sub-tests (exit code 0) | **EXECUTED TEST EVIDENCE** | Demonstrated in `run_in_bash_session` during verification |
| Disposable Worktree Mutation Testing | Restoring fallback loops fails Tests A, B, D | **REPORTED EXECUTION EVIDENCE** | Executed in `/tmp/mutation-worktree` in final evidence gate |
| Downstream Element Hiding (`runLayoutWithMetadata`) | Uses `projectedNodeIds` for `display: none` | **STATIC INSPECTION** | `explorer/src/lib/graph-layout.ts` L190–225 |
| `(0,0)` Coordinate Avoidance | `if (posMap[id]) node.position(...)` | **STATIC INSPECTION** | `explorer/src/lib/graph-layout.ts` L203–208 |
| Drag State Preservation | `captureAndPersistPositions` reads from `cy.nodes()` | **STATIC INSPECTION** | `explorer/src/components/GraphView.tsx` |
| Browser E2E Automation | Not rerun during context maintenance | **NOT VERIFIED** | Explicit residual limitation |

---

### 6. PRODUCT GATE A–D STATUS

Product Gates A–D remain explicitly **open and unresolved**:
- **Gate A (Shared SObjects visual representation):** `UNRESOLVED` (`FACT`).
- **Gate B (Angular placement semantics):** `UNRESOLVED` (`FACT`).
- **Gate C (Unreachable-node visibility UX):** `UNRESOLVED` (`FACT`).
- **Gate D (Drag persistence scoping):** `UNRESOLVED` (`FACT`).

DEF-01 closure is strictly limited to position-key calculation isolation. No policy or visual representation changes were authorized or introduced.

---

### 7. UNSUPPORTED CLAIMS, UNRESOLVED UNCERTAINTIES, AND LIMITATIONS

1. **Empty Input Edge Case (`safeNodes.length === 0`):** When `safeNodes` is empty, line 111 returns `{ positions: { ...existingPositions } }`, where `projectedNodeIds` is undefined. The invariant holds strictly for non-empty node inputs (`safeNodes.length > 0`).
2. **Global Canvas Memory Retention:** Cytoscape retains all dataset nodes in memory (`cy.nodes()`) across layout switches, using `display: none` for unprojected nodes. Switching back to Hierarchical mode passes `nodePositions` as `existingPositions`. This is expected incremental layout behavior.
3. **Absence of Fresh E2E Browser Automation:** Validation relies on Vitest unit tests, CLI integration tests, static inspection, and prior evidence reports.

---

### 8. FINAL RECOMMENDATION

**FINAL VERDICT: PASS — BASELINE ACCEPTED**

The DEF-01 canonical context baseline is complete, minimal, accurate, and ready for acceptance.

#### Recommended Follow-up (Post-Audit):
1. Preserve commit `e976696d518c3d4f8544c268a1803ca6bc8084c6` and context updates as the stable baseline.
2. Address Product Gates A–D in subsequent authorized product tracks.
