# GRAPHVIEW LENS B — SAFE IMPLEMENTATION SEQUENCE

## 1. Executive Overview

This report establishes the safe, 4-stage implementation sequence for **GraphView Lens B — Component Orbit / Component Constellation**.

To guarantee zero regressions across the 18 workspace view modes, work is partitioned strictly into four sequential stages based on decision authorization dependencies and safety boundaries.

---

## 2. Stage 0 — Authority and Contract Prerequisites

### Preconditions
- All baseline context files and predecessor reports retrieved and inspected.
- Git working tree in a clean state on commit `00cc29803313dec67766d938cc8d46029bfabb96`.

### Authorized Behavior
- Submit `GRAPHVIEW_LENS_B_PRODUCT_DECISION_PACKET.md` to Product Authority.
- Record formal product decision selections for Gates A, B, C, and D in `context/CURRENT-DECISIONS.md`.

### Prohibited Actions
- Zero production application source code (`explorer/src/`) modifications in Stage 0.

### Exit Criteria
- `context/CURRENT-DECISIONS.md` contains signed, attributable product decision records for Gates A, B, C, and D.

---

## 3. Stage 1 — Contract-Backed Independent Technical Corrections

### Preconditions
- Stage 0 complete OR authorized independent technical fix approved by code review.

### Authorized Behavior (DEF-01 Code Fix)
- In `explorer/src/lib/architecture-layout.ts`:
  - Delete lines 169–171 (Constellation stale position copy loop):
    ```typescript
    // DELETE:
    for (const [id, pos] of Object.entries(existingPositions)) {
      if (pos && !(id in constellationOutput.positions)) {
        constellationPositions[id] = { x: pos.x, y: pos.y };
      }
    }
    ```
  - Delete lines 219–221 (Orbit stale position copy loop):
    ```typescript
    // DELETE:
    for (const [id, pos] of Object.entries(existingPositions)) {
      if (pos && !(id in orbitOutput.positions)) {
        orbitPositions[id] = { x: pos.x, y: pos.y };
      }
    }
    ```

### Files & Functions to Change
- File: `explorer/src/lib/architecture-layout.ts`
- Function: `computeArchitectureLayoutWithMetadata`
- Lines: 169–171, 219–221

### Prohibited Actions
- Do not modify Cytoscape DOM rendering or element removal in `GraphView.tsx` during Stage 1.
- Do not alter `projectState.ts` storage schema during Stage 1.

### Required Tests
- Add unit test in `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx`:
  - Execute `computeArchitectureLayoutWithMetadata(nodes, edges, { architectureMode: 'orbit', existingPositions: { "UnrelatedNode": {x: 999, y: 999} } })`.
  - Assert `"UnrelatedNode" in orbitPositions` evaluates to `false`.

### Regression Risks & Mitigation
- **Risk:** Hierarchical layout fallback.
- **Mitigation:** Hierarchical layout code block in `architecture-layout.ts` remains 100% untouched.

### Acceptance Criteria & Recovery
- `orbitOutput.positions` map contains ONLY projected focal nodes.
- If regression occurs, revert lines 169–171 and 219–221 deletion via git checkout.

---

## 4. Stage 2 — Product-Decision-Dependent Changes

### Preconditions
- Stage 0 and Stage 1 complete.
- `context/CURRENT-DECISIONS.md` contains signed product decision records for Gates A, B, C, and D.

### Authorized Behavior (Gates A, B, C, D Implementations)
1. **Gate A (Shared SObjects):**
   - Update `satellites.ts` (`findParentObjectId`) to select anchor component via `metrics.fanIn DESC`, `metrics.coupling DESC`, `nodeId ASC`.
   - Update `graph-style.ts` or `FeatureOverlayCanvas.tsx` to render `"◉ SHARED"` badge on shared SObject nodes.
2. **Gate C (Cytoscape Element Removal):**
   - Update `GraphView.tsx` element synchronization to filter `nodes` against `projectedNodeIds` when `architectureMode === 'orbit'`, ensuring unreachable nodes are removed from Cytoscape DOM via `cy.elements().remove()`.
3. **Gate D (Composite Storage Scoping):**
   - Update `GraphLayoutState` interface in `projectState.ts`:
     ```typescript
     nodePositions: Record<string, Record<string, { x: number; y: number }>>; // [layoutMode][focalNodeId]
     legacyNodePositions?: Record<string, { x: number; y: number }>;
     ```
   - Update `captureAndPersistPositions()` in `GraphView.tsx` to pass active `layoutMode` and `focalLwcId`.

### Files to Change
- `explorer/src/lib/layout/satellites.ts`
- `explorer/src/lib/projectState.ts`
- `explorer/src/components/GraphView.tsx`
- `explorer/src/lib/graph-style.ts`

### Required Tests
- Integration test in `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx`:
  - Verify drag in LWC A view exerts 0 position effect on LWC B view.
  - Verify unreachable nodes are absent from `cy.nodes()` in Orbit mode.

### Acceptance Criteria
- Shared SObjects render with `"SHARED"` badge.
- Unreachable nodes leave Cytoscape DOM canvas in Orbit mode.
- Drag overrides isolated by mode and focal component.

---

## 5. Stage 3 — Migration, Integration, and Regression Validation

### Preconditions
- Stage 2 implementation complete.

### Authorized Behavior
1. **Backward-Compatible Legacy Migration Verification:**
   - Verify `mergeWithDefaultState` in `projectState.ts` converts legacy flat `nodePositions` into `legacyNodePositions` compatibility store, initializing `nodePositions.hierarchical.global = legacyNodePositions`.
2. **Full Regression Test Suite Run:**
   - Execute `npm run test:cli`.
   - Execute `cd explorer && npx vitest run`.

### Acceptance Criteria
- All 31 CLI integration test suites pass 100%.
- All Vitest component and layout regression test suites pass 100%.
- Zero position authority drift (`0.00000px`).
- Zero cross-context position contamination.
