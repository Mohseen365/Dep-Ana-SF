# GRAPHVIEW LENS B — MINIMUM CORRECTION PLAN

## 1. Verified Defects in Current Checkout

Only two engineering defects are verified to exist in the current repository checkout (`commit 00cc29803313dec67766d938cc8d46029bfabb96`):

1. **DEF-01 (Position Contamination Loop):** `architecture-layout.ts` (lines 169–171, 219–221) forcibly copies `existingPositions` into newly calculated Lens B output maps for unassigned nodes, violating Position Authority Level 4 pure function constraints.
2. **DEF-02 (Flat Drag Position Storage Keying):** `projectState.ts` (line 47) stores positions in a flat map `nodePositions[nodeId]` without `layoutMode` or `focalNodeId` scope, causing user drag adjustments in one context to pollute node positions across unrelated views.

---

## 2. Exact Files and Functions to Change

| Defect ID | File Path | Function / Symbol | Line Range | Action |
|---|---|---|---|---|
| **DEF-01** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata` | Lines 169–171, 219–221 | Delete `existingPositions` copy loops in Constellation and Orbit blocks |
| **DEF-02** | `explorer/src/lib/projectState.ts` | `GraphLayoutState`, `mergeWithDefaultState` | Lines 42–49, 205–230 | Update `GraphLayoutState` interface to composite key structure & add backward-compatible migration |
| **DEF-02** | `explorer/src/components/GraphView.tsx` | `captureAndPersistPositions`, `dragfree` listener | Lines 220–250, 502–520 | Pass active `layoutMode` and `focalLwcId` to position change handler |

---

## 3. Minimal Correction per Defect

### Correction 1 (DEF-01: Remove Stale Position Merge Loop)
- **In `explorer/src/lib/architecture-layout.ts`:**
  - Delete lines 169–171:
    ```typescript
    // DELETE:
    for (const [id, pos] of Object.entries(existingPositions)) {
      if (pos && !(id in constellationOutput.positions)) {
        constellationPositions[id] = { x: pos.x, y: pos.y };
      }
    }
    ```
  - Delete lines 219–221:
    ```typescript
    // DELETE:
    for (const [id, pos] of Object.entries(existingPositions)) {
      if (pos && !(id in orbitOutput.positions)) {
        orbitPositions[id] = { x: pos.x, y: pos.y };
      }
    }
    ```
  - **Effect:** Ensures `orbitPositions` and `constellationPositions` return coordinates strictly for projected focal nodes.

### Correction 2 (DEF-02: Composite Drag Position Storage Scoping)
- **In `explorer/src/lib/projectState.ts`:**
  - Update `GraphLayoutState` interface:
    ```typescript
    export interface GraphLayoutState {
      layoutName?: string;
      mode: GraphInteractionMode;
      architectureMode?: ArchitectureLayoutMode;
      layoutProvenance?: LayoutProvenance;
      nodePositions: Record<string, Record<string, Record<string, { x: number; y: number }>>>; // [mode][focalId][nodeId]
      legacyNodePositions?: Record<string, { x: number; y: number }>; // Backward-compatible migration
    }
    ```
  - Update `mergeWithDefaultState` (lines 205–230):
    - If `loaded.graphLayout.nodePositions` is a flat object `Record<string, {x, y}>`, convert it to `legacyNodePositions` and initialize `nodePositions = { hierarchical: { global: legacyNodePositions } }`.
  - **Effect:** Completely isolates user drags to exact composite scope `(projectId, layoutMode, focalNodeId, nodeId)`.

---

## 4. Required Tests for Each Correction

| Defect ID | Test File to Create / Update | Assertion to Add | Expected Result |
|---|---|---|---|
| **DEF-01** | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | Run Orbit layout with `existingPositions = { "UnrelatedNode": {x: 999, y: 999} }` -> assert `"UnrelatedNode" in orbitPositions` is `false` | `orbitPositions` contains ONLY projected focal nodes |
| **DEF-02** | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | Drag node in Orbit mode for LWC A -> switch focal node to LWC B -> assert LWC A drag does NOT alter LWC B node coordinates | Complete cross-focal position isolation |

---

## 5. Cross-Layout and Context-Switch Regression Tests

1. **Hierarchical View Regression Test:**
   - Execute `runLayoutWithMetadata(cy, { architectureMode: 'hierarchical' })`.
   - Assert Level 1–5 Position Authority precedence remains 100% intact.
2. **Lens Switching Regression Test:**
   - Switch active lens across all 18 view modes (`graph`, `matrix`, `river`, `tree`, `radar`, `dna`, etc.).
   - Assert zero runtime exceptions and zero position desynchronization.
3. **Project Boundary Isolation Test:**
   - Switch active project (`pbim` -> `cst`).
   - Assert Project A drag positions never leak into Project B.

---

## 6. Compatibility and Migration Requirements

1. **Backward Compatibility Guarantee:**
   - Existing project state JSON files in `localStorage` containing flat `nodePositions` MUST parse without throwing syntax or type errors.
   - `mergeWithDefaultState` in `projectState.ts` automatically converts flat `nodePositions` into `legacyNodePositions` under scope `[hierarchical][global][nodeId]`.
2. **Zero Loss of User Edits:**
   - User drag edits made in Hierarchical mode in prior sessions are migrated smoothly into the `hierarchical` scope map.

---

## 7. Acceptance Criteria

1. **Acceptance Criterion 1:** `computeArchitectureLayoutWithMetadata` returns positions strictly for nodes present in `orbitOutput.positions` when `architectureMode === 'orbit'`.
2. **Acceptance Criterion 2:** User drag edits in Orbit mode for LWC A exert zero position effect when switching focal node to LWC B or switching mode to Hierarchical.
3. **Acceptance Criterion 3:** Legacy flat `nodePositions` JSON state migrates automatically without throwing errors or dropping user edits.
4. **Acceptance Criterion 4:** All 31 CLI integration test suites and Vitest regression suites pass 100%.

---

## 8. Explicit Preconditions Required Before Implementation

Implementation of this plan MUST NOT begin until the following preconditions are satisfied:

1. **Precondition 1:** `context/CURRENT-DECISIONS.md` contains signed product authority selections for Gates A, B, C, and D.
2. **Precondition 2:** Code review approval of Deliverables A, B, and C.
