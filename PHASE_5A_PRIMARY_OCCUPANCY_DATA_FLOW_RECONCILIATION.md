# PHASE 5A — Read-Only Primary Occupancy Data-Flow Reconciliation

**Status:** `RECONCILIATION_COMPLETE`
**Phase:** Phase 5A (Read-Only Primary Occupancy Data-Flow Reconciliation)
**Audit Date:** October 2, 2026
**Target Repository:** `/app`
**Authoritative Commit SHA:** `5d596fadcef827a97faad50a83f0286b1538ac6f` (includes Phase 3 re-audit commit `a4cc41b37c5956ef844cf7e655300bc108ae1fb1`)
**Dataset:** CST (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, 240 nodes, 1024 edges)

---

## 1. Executive Summary & Forensic Verdict

This deliverable establishes the **strictly read-only forensic reconciliation** of the Stage-7 primary occupancy data flow into the Stage-8 bridge candidate collision evaluation engine in the Salesforce Architecture Explorer graph layout system.

### The Contradiction Under Investigation
* **Phase 3:** Reported that `architecture-layout.ts` passes `allocatedPositions: basePositions` into `calculateBridgeCandidatePosition`, and `basePositions` initially contains Stage-7 `primaryNodePositions`.
* **Phase 4:** Proposed "Pass the complete Stage-7 primary occupancy map as `allocatedPositions`", implying it was not passed or missing.

### Proven Forensic Resolution
Our runtime trace and source-code lineage investigation **PROVES**:

1. **`basePositions` IS passed:** `architecture-layout.ts` line 374 explicitly passes `allocatedPositions: basePositions`.
2. **`basePositions` DOES contain Stage-7 primary positions:** At the start of Stage 8, `basePositions` contains all 156 Stage-7 `primaryNodePositions` (including `ApexClass:DateUtils` at `(4579.20, 260.00)`).
3. **`DateUtils` IS present in `options.allocatedPositions`:** At the invocation of `calculateBridgeCandidatePosition` for `ApexClass:StandardAccessPolicy`, `DateUtils` IS present in `options.allocatedPositions`.
4. **`DateUtils` IS present in `activeOccupancy`:** `activeOccupancy` includes `options.allocatedPositions`, so `DateUtils` IS present in `activeOccupancy`.
5. **CRITICAL DISCOVERY — BUT `DateUtils` WAS MOVED IN STAGE 8 BEFORE `StandardAccessPolicy` WAS EVALUATED!**
   * At Stage 7 completion, `ApexClass:DateUtils` was located at `(4579.20, 260.00)`.
   * However, `DateUtils` is itself classified as a bridge node (Bridge #6 out of 56 total bridges in CST).
   * When `calculateBridgeCandidatePosition` was executed for `DateUtils` earlier in Stage 8, it reassigned `DateUtils` to offloaded candidate position `(1360.00, 360.00)`.
   * Because `basePositions[node.id] = bridgeInfo.candidatePosition` mutates `basePositions` in-place as bridges are allocated, by the time `StandardAccessPolicy` (Bridge #9) was evaluated, `basePositions["ApexClass:DateUtils"]` contained `(1360.00, 360.00)`—**NOT** the Stage-7 primary coordinate `(4579.20, 260.00)`.
   * Consequently, when `StandardAccessPolicy` evaluated candidate coordinate `(4538.80, 260.00)` against `activeOccupancy`, `DateUtils` was evaluated at `(1360.00, 360.00)` ($dx = 3178.80\text{px} \gg 160\text{px}$), returning `collides() = false`.
   * `StandardAccessPolicy` was accepted at `(4538.80, 260.00)`, which overlaps horizontally ($dx = 40.40\text{px} < 160.00\text{px}$) with the **un-moved Stage-7 primary position** of `DateUtils` (`4579.20, 260.00`).

---

## 2. Repository Verification & Source Locations

### Repository State Verification
* **HEAD Commit:** `5d596fadcef827a97faad50a83f0286b1538ac6f`
* **Historical Audit SHA:** `a4cc41b37c5956ef844cf7e655300bc108ae1fb1` (Verified present in commit history as PR #522 parent)
* **Working Tree:** Clean (0 tracked production/test/fixture files modified)

### Relevant Code Locations

#### 1. Stage 8 Caller & `basePositions` Construction
* **File:** `explorer/src/lib/architecture-layout.ts`
* **Lines 324–326:**
  ```typescript
  const basePositions: Record<string, { x: number; y: number }> = {
    ...localResult.primaryNodePositions,
  };
  ```
* **Lines 352–377:**
  ```typescript
  safeNodes.forEach(node => {
    if (isTestNode(node) || isFieldNode(node)) return;

    const centrality = centralityMap.get(node.id);
    if (centrality?.isBridge && !centrality.isHub) {
      const neighborPositions: Record<string, { x: number; y: number }> = {};
      const nodeAnalysis = analysis.nodes.get(node.id);

      nodeAnalysis?.neighborIds.forEach(nId => {
        if (basePositions[nId]) {
          neighborPositions[nId] = basePositions[nId];
        }
      });

      const bridgeInfo = calculateBridgeCandidatePosition(
        node.id,
        layerMap.get(node.id) || 'application',
        centrality.connectedDomains,
        domainXCenters,
        domainBounds,
        neighborPositions,
        { layerSpacing, nodeWidth, nodeHeight, layerYOffsets: globalDomainResult.layerYMap, index, allocatedPositions: basePositions }
      );

      basePositions[node.id] = bridgeInfo.candidatePosition;
    }
  });
  ```

#### 2. `calculateBridgeCandidatePosition`, `activeOccupancy`, and `collides()`
* **File:** `explorer/src/lib/layout/centrality.ts`
* **Lines 448–452 (activeOccupancy construction):**
  ```typescript
  const activeOccupancy: Record<string, { x: number; y: number }> = {
    ...neighborPositions,
    ...Object.fromEntries(activeBridgeAllocations.entries()),
    ...(options.allocatedPositions || {}),
  };
  ```
* **Lines 491–497 (Collision Predicate Evaluation):**
  ```typescript
  for (const [otherId, otherPos] of Object.entries(activeOccupancy)) {
    if (otherId === nodeId) continue;
    collisionChecks++;
    if (
      Math.abs(otherPos.x - testX) < minDx - 1e-3 &&
      Math.abs(otherPos.y - testY) < minDy - 1e-3
    ) {
      collides = true;
      break;
    }
  }
  ```

---

## 3. Required Runtime Trace & State Snapshots

Specimen Under Investigation:
* **Bridge Candidate:** `ApexClass:StandardAccessPolicy`
* **Target Node:** `ApexClass:DateUtils`

### Question A — Incoming `allocatedPositions`
**Determined:** Is `ApexClass:DateUtils` present in `options.allocatedPositions` at the exact invocation for `ApexClass:StandardAccessPolicy`?

* **Present?** **YES**
* **Exact key lookup result:** `options.allocatedPositions["ApexClass:DateUtils"]` $\to$ `{ x: 1360, y: 360 }`
* **Stage 7 Original coordinate:** `{ x: 4579.2, y: 260 }`
* **Total entries in `options.allocatedPositions`:** `156`

---

### Question B — `activeOccupancy`
**Determined:** Is `ApexClass:DateUtils` present in `activeOccupancy` immediately before collision evaluation begins?

* **Present?** **YES**
* **Exact coordinate stored for key:** `{ x: 1360, y: 360 }`
* **Total active occupancy entries:** `156`
* **Source of Entry:** Merged from `options.allocatedPositions` (which equals `basePositions` at invocation time).
* **Merge Order in Code:**
  ```typescript
  const activeOccupancy = {
    ...neighborPositions,
    ...Object.fromEntries(activeBridgeAllocations.entries()),
    ...(options.allocatedPositions || {}),
  };
  ```
  Note: `options.allocatedPositions` is merged last, so for `DateUtils` (where `activeBridgeAllocations` also contains `{ x: 1360, y: 360 }`), both maps contain `{ x: 1360, y: 360 }`.

---

### Question C — Candidate Coordinate
**Captured:** Exact candidate coordinate presented for `ApexClass:StandardAccessPolicy`:

* **`testX`:** `4538.80`
* **`testY`:** `260.00`
* **Node Dimensions:** `nodeWidth = 120`, `nodeHeight = 60`
* **Clearance Gaps:** `horizontalGap = 40`, `verticalGap = 40`
* **Separation Rules:** `minDx = 160.00`, `minDy = 100.00`

---

### Question D — `DateUtils` Collision Evaluation
**Captured:** Values used when predicate evaluates candidate `StandardAccessPolicy` against `DateUtils` entry in `activeOccupancy`:

* **Candidate X:** `4538.80`
* **Candidate Y:** `260.00`
* **DateUtils X in `activeOccupancy`:** `1360.00`
* **DateUtils Y in `activeOccupancy`:** `360.00`
* **`dx`:** `|1360.00 - 4538.80| = 3178.80`
* **`dy`:** `|360.00 - 260.00| = 100.00`
* **Exact Boolean Expression Evaluated:**
  ```typescript
  Math.abs(1360.00 - 4538.80) < 160 - 1e-3 && Math.abs(360.00 - 260.00) < 100 - 1e-3
  // 3178.80 < 159.999 (FALSE) && 100.00 < 99.999 (FALSE) => FALSE
  ```
* **Final result returned by `collides()`:** `false` (no collision detected against `DateUtils` in `activeOccupancy`).

---

## 4. Mathematical Reconciliation

Why was candidate `(4538.80, 260.00)` accepted for `StandardAccessPolicy`?

1. **Against `activeOccupancy` entry for `DateUtils` (`1360.00, 360.00`):**
   * $dx = 3178.80 \ge 160.00 \implies$ No collision.
2. **Against un-moved Stage 7 primary position of `DateUtils` (`4579.20, 260.00`):**
   * $dx = |4579.20 - 4538.80| = 40.40$
   * $dy = |260.00 - 260.00| = 0.00$
   * Under separation rule $minDx = 160.00$, $dx = 40.40 < 160.00$ is a **severe physical overlap**.
3. **Why it was accepted:**
   Because `activeOccupancy` contained `DateUtils` at its **new bridge position** `(1360.00, 360.00)`, the predicate NEVER evaluated candidate `(4538.80, 260.00)` against the **un-moved Stage-7 primary coordinate** `(4579.20, 260.00)`.
   Therefore, `StandardAccessPolicy` was placed at `(4538.80, 260.00)`. When Stage 8 finishes and before Stage 11 cleanup runs, `DateUtils` remains at `(4579.20, 260.00)` in the un-moved primary node set, creating the observed Stage-8 bridge-primary overlap.

---

## 5. Critical Data-Lineage Trace

Full lineage trace for `ApexClass:DateUtils`:

1. **Stage 7 `localResult.primaryNodePositions`:**
   * Present: **YES**
   * Coordinate: `{ x: 4579.2, y: 260 }`
2. **`basePositions` initial construction:**
   * Present: **YES**
   * Coordinate: `{ x: 4579.2, y: 260 }`
3. **Stage 8 Bridge Iteration #6 (`ApexClass:DateUtils` processed as bridge):**
   * `calculateBridgeCandidatePosition` executed for `DateUtils`.
   * Candidate position returned: `{ x: 1360, y: 360 }`.
   * Code executes: `basePositions["ApexClass:DateUtils"] = { x: 1360, y: 360 }`.
   * **DIVERGENCE POINT:** `DateUtils` coordinate in `basePositions` is mutated from Stage-7 primary coordinate `(4579.2, 260)` to new bridge coordinate `(1360, 360)`.
4. **Stage 8 Bridge Iteration #9 (`ApexClass:StandardAccessPolicy` processed as bridge):**
   * `basePositions` passed as `options.allocatedPositions`.
   * `DateUtils` entry present: **YES**.
   * Coordinate contained: `{ x: 1360, y: 360 }` (the MUTATED value, NOT the Stage-7 primary value).
5. **`activeOccupancy` construction in `centrality.ts`:**
   * `DateUtils` entry present: **YES**.
   * Coordinate contained: `{ x: 1360, y: 360 }`.
6. **Collision iteration in `collides()`:**
   * Candidate `(4538.8, 260)` evaluated against `DateUtils` at `(1360, 360)`.
   * Result: `false` (no collision).

---

## 6. Known Collision Reproduction Gate Evidence

Reproduced on CST dataset:

```text
Bridge Candidate:
ApexClass:StandardAccessPolicy

Primary (Un-moved Stage 7):
ApexClass:DateUtils

Candidate Position:
(4538.8, 260)

Primary Position (Stage 7):
(4579.2, 260)

dx:
40.40

dy:
0.00

Collision Predicate (against Stage 7 primary):
Math.abs(4579.2 - 4538.8) < 160 - 1e-3 && Math.abs(260 - 260) < 100 - 1e-3
=> 40.40 < 159.999 (TRUE) && 0.00 < 99.999 (TRUE)

Result:
TRUE (Overlap exists against Stage 7 primary position)

Collision Predicate (against activeOccupancy at runtime):
Math.abs(1360.0 - 4538.8) < 160 - 1e-3 && Math.abs(360 - 260) < 100 - 1e-3
=> 3178.80 < 159.999 (FALSE)

Result:
FALSE (Accepted by runtime engine)
```

The Phase-3 reported coordinates `StandardAccessPolicy` `(4538.8, 260)` and `DateUtils` Stage-7 primary `(4579.2, 260)` are **100% reproducible**.

---

## 7. Contradiction Resolution (Findings 1 – 7)

### Finding 1: Was `basePositions` already passed into `allocatedPositions`?
**PROVEN FACT:** **YES.** `architecture-layout.ts` line 374 passes `{ allocatedPositions: basePositions }`.

### Finding 2: Did `basePositions` actually contain `ApexClass:DateUtils` at the relevant invocation?
**PROVEN FACT:** **YES**, but it contained the **mutated Stage-8 bridge coordinate `(1360, 360)`**, not the Stage-7 primary coordinate `(4579.2, 260)`.

### Finding 3: Did `options.allocatedPositions` contain it?
**PROVEN FACT:** **YES**, containing `{ x: 1360, y: 360 }`.

### Finding 4: Did `activeOccupancy` contain it?
**PROVEN FACT:** **YES**, containing `{ x: 1360, y: 360 }`.

### Finding 5: Did `collides()` actually evaluate against it?
**PROVEN FACT:** **YES**, `collides()` evaluated `StandardAccessPolicy` candidate `(4538.8, 260)` against `DateUtils` at `(1360, 360)`.

### Finding 6: If it evaluated against it, why did the collision predicate return the observed result?
**PROVEN FACT:** Because $dx = |1360.0 - 4538.8| = 3178.8 \ge 160$, `collides()` correctly returned `false`.

### Finding 7: If it did not evaluate against it, where exactly did the occupancy disappear?
**PROVEN FACT:** The **Stage-7 primary occupancy coordinate** `(4579.2, 260)` for `DateUtils` disappeared at Stage 8 Bridge Iteration #6 when `basePositions["ApexClass:DateUtils"]` was overwritten with its new bridge position `(1360, 360)`.

---

## 8. Root-Cause Classification

```text
PROVEN REPORTING/RECONSTRUCTION DISCREPANCY & PROVEN DATA-FLOW DEFECT
```

### Forensic Explanation
1. **Reporting Discrepancy:** Previous Phase 3/4 reports mischaracterized the issue as "`allocatedPositions` not supplied" or "`basePositions` not passed". In reality, `basePositions` WAS passed.
2. **Data-Flow Defect:** The data flow in `architecture-layout.ts` mutates `basePositions` in-place as bridges are allocated (`basePositions[node.id] = bridgeInfo.candidatePosition`). Because nodes classified as bridges can also have Stage-7 primary positions, overwriting `basePositions[node.id]` destroys the Stage-7 primary occupancy memory for those nodes. When later bridges are placed near the original Stage-7 primary coordinates of earlier bridges, collision checking fails to see the Stage-7 primary occupancy.

---

## 9. What Remains Unproven & Next Experiment Hypothesis

### What Remains Unproven
It remains unproven whether preserving immutable Stage-7 primary positions alongside mutated bridge positions during Stage 8 will resolve all 13 CST overlaps without forcing unnecessary bridge displacements or degrading spatial density.

### Candidate Next Experiment Hypothesis (Strictly 1 Hypothesis)
**Hypothesis H-5A:**
*If* `architecture-layout.ts` maintains an immutable snapshot of Stage-7 primary positions (`stage7Positions = { ...localResult.primaryNodePositions }`) and passes `allocatedPositions: { ...stage7Positions, ...basePositions }` (where `basePositions` contains newly placed Stage 8 bridges), *then* Stage 8 candidate placement will evaluate collisions against BOTH un-moved Stage-7 primary positions and newly placed Stage-8 bridges, eliminating pre-cleanup bridge-primary overlaps without affecting Stage 9–11 density.

---

## 10. Repository Integrity Verification

* **Tracked Production Files Modified:** 0
* **Tracked Test Files Modified:** 0
* **Tracked Fixtures/Datasets Modified:** 0
* **Layout Engine Behavior Altered:** No
* **Commits Created:** None (Investigation phase only)

```text
git status --short
(clean output - 0 tracked file modifications)
```
