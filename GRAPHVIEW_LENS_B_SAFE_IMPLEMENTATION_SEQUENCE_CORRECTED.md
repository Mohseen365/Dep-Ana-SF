# GRAPHVIEW LENS B — SAFE IMPLEMENTATION SEQUENCE (CORRECTED)

## 1. Executive Overview

This report establishes the verified, safe 4-stage implementation sequence for **GraphView Lens B — Component Orbit / Component Constellation**.

Work is partitioned strictly into four sequential stages based on decision authorization dependencies, Position Authority contracts, and working-tree safety boundaries.

---

## 2. Stage 0 — Authority and Contract Prerequisites

### Preconditions
- Retrieve and inspect all baseline context files (`context/CURRENT-*.md`) and predecessor Lens B deliverables.
- Verify working tree identity (`git status` and `git rev-parse HEAD`).
- Confirm clean checkout without uncommitted production code changes.

### Authorized Actions
- Submit `GRAPHVIEW_LENS_B_PRODUCT_DECISION_PACKET.md` to Product Authority for review.
- Record formal product decision selections for Gates A, B, C, and D in `context/CURRENT-DECISIONS.md`.

### Prohibited Actions
- Zero production application source code (`explorer/src/`) or test file modifications in Stage 0.

### Exit Criteria
- `context/CURRENT-DECISIONS.md` contains signed, attributable product decision records for Gates A, B, C, and D.

---

## 3. Stage 1 — Contract-Backed Independent Technical Corrections (DEF-01)

### Prerequisites & Authorization
- Position Authority Level 4 pure calculation contract (`context/CURRENT-CONTRACTS.md` Section 3) explicitly prohibits merging unassigned stale node positions into layout calculation outputs.
- Deleting the stale position merge loops in `architecture-layout.ts` is an **AUTHORIZED INDEPENDENT TECHNICAL FIX**.

### Authorized Actions (DEF-01 Code Fix)
In `explorer/src/lib/architecture-layout.ts`:

1. **Constellation Branch Deletion (Lines 169–171):**
   ```typescript
   // DELETE LINES 169-171:
   for (const [id, pos] of Object.entries(existingPositions)) {
     if (pos && !(id in constellationOutput.positions)) {
       constellationPositions[id] = { x: pos.x, y: pos.y };
     }
   }
   ```

2. **Orbit Branch Deletion (Lines 219–221):**
   ```typescript
   // DELETE LINES 219-221:
   for (const [id, pos] of Object.entries(existingPositions)) {
     if (pos && !(id in orbitOutput.positions)) {
       orbitPositions[id] = { x: pos.x, y: pos.y };
     }
   }
   ```

### Files to Change
- Source File: `explorer/src/lib/architecture-layout.ts`
- Target Function: `computeArchitectureLayoutWithMetadata`
- Target Lines: L169–171, L219–221

### Prohibited Actions in Stage 1
- Do NOT modify Cytoscape DOM element synchronization or filtering in `GraphView.tsx` during Stage 1.
- Do NOT modify `projectState.ts` storage schema or migration functions during Stage 1.

### Test Requirements per Modified Branch
Add explicit unit tests in `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx`:

1. **Orbit Branch Test (TST-STG1-01):**
   - Execute `computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'orbit', existingPositions: { "UnrelatedNode": {x: 999, y: 999} } })`.
   - Assert `"UnrelatedNode" in result.positions` is `false`.
   - Assert `result.positions` contains ONLY projected focal nodes.

2. **Constellation Branch Test (TST-STG1-02):**
   - Execute `computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'constellation', existingPositions: { "UnrelatedNode": {x: 999, y: 999} } })`.
   - Assert `"UnrelatedNode" in result.positions` is `false`.
   - Assert `result.positions` contains ONLY projected constellation nodes.

3. **Hierarchical Fallback Protection (TST-STG1-04):**
   - Execute `computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'hierarchical', existingPositions: { "A": {x: 10, y: 10} } })`.
   - Assert hierarchical layout behavior is 100% unchanged.

### Exit Criteria
- `computeArchitectureLayoutWithMetadata` returns positions strictly for projected focal nodes in Orbit and Constellation modes.
- TST-STG1-01 through TST-STG1-06 pass 100%.

---

## 4. Stage 2 — Product-Decision-Dependent Changes (Gates A–D)

### Prerequisites
- Stage 0 and Stage 1 complete.
- Signed product decision records for Gates A, B, C, and D present in `context/CURRENT-DECISIONS.md`.

### Authorized Actions (When Approved)

1. **Gate A (Shared SObjects):**
   - Update `satellites.ts` (`findParentObjectId`) to select anchor component via schema metrics (`metrics.fanIn DESC`, `metrics.coupling DESC`, `nodeId ASC`).
   - Update `FeatureOverlayCanvas.tsx` / `graph-style.ts` to render `"◉ SHARED"` badge on shared SObject nodes.

2. **Gate C (Cytoscape Element Removal):**
   - Update `GraphView.tsx` element synchronization to filter Cytoscape nodes against `projectedNodeIds` when `architectureMode === 'orbit'`, removing unprojected nodes from DOM canvas via `cy.elements().remove()`.

3. **Gate D (Composite Storage Scoping & Schema Update):**
   - Update `GraphLayoutState` interface in `projectState.ts`:
     ```typescript
     nodePositions: Record<string, Record<string, Record<string, { x: number; y: number }>>>;
     legacyNodePositions?: Record<string, { x: number; y: number }>;
     ```
   - Update `captureAndPersistPositions` in `GraphView.tsx` to pass active `layoutMode` and `focalLwcId`.

### Prohibited Actions
- Do not execute Stage 2 code changes until `context/CURRENT-DECISIONS.md` contains attributable approval records.

---

## 5. Stage 3 — Migration, Integration, and Regression Validation

### Prerequisites
- Stage 2 implementation complete.

### Authorized Actions

1. **Safe Legacy Migration & Quarantine Verification:**
   - Verify `mergeWithDefaultState` in `projectState.ts` extracts legacy flat `nodePositions` into `legacyNodePositions` compatibility field without automatically assigning them to `nodePositions.hierarchical.global`.
   - Verify M1 (Proven-Context Migration) moves entries only when `architectureMode` matches stored provenance.

2. **Full Automated Test Suite Execution:**
   - Execute master CLI integration suite: `npm run test:cli`.
   - Execute Vitest regression suite: `cd explorer && npx vitest run`.

---

## 6. Controlled Rollback and Recovery Procedure

If a Stage 1 code change fails verification or must be reverted:

1. **Record Implementation Patch Diff:**
   `git diff explorer/src/lib/architecture-layout.ts > stage1_fix.patch`
2. **Inspect Patch:** Confirm `stage1_fix.patch` touches ONLY lines 169–171 and 219–221.
3. **Execute Targeted Reverse Patch:**
   `git apply -R stage1_fix.patch`
4. **Preserve Audit Deliverables:** Uncommitted audit deliverables (`GRAPHVIEW_LENS_B_*.md`) remain 100% untouched and preserved.
5. **Re-Run Validation:** Execute `npm run test:cli` to verify clean recovery.

---

## 7. Acceptance Criteria & Explicitly Blocked Tasks

### Acceptance Criteria
1. `computeArchitectureLayoutWithMetadata` returns coordinates strictly for projected focal nodes in Orbit and Constellation modes.
2. Unit tests covering both Orbit and Constellation branches pass 100%.
3. Master CLI integration test suite passes 100% (`npm run test:cli`).
4. Working tree remains clean without uncommitted source or test changes until authorized.

### Explicitly Blocked Tasks
- **BLOCKED:** Modifying `GraphView.tsx` DOM element filtering (Gate C) before Product Authority approval.
- **BLOCKED:** Modifying `projectState.ts` state schema (Gate D) before Product Authority approval.
- **BLOCKED:** Modifying `satellites.ts` or rendering SHARED badges (Gate A) before Product Authority approval.
- **BLOCKED:** Automatically assigning legacy flat positions to `hierarchical/global`.
