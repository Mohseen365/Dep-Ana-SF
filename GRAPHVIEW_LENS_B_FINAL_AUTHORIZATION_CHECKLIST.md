# GRAPHVIEW LENS B — FINAL AUTHORIZATION CHECKLIST

## 1. Product Decisions Checklist (Gates A–D)

Before Lens B contract freeze can be declared, Product Authority must approve and record choices for all four gates in `context/CURRENT-DECISIONS.md`:

- [ ] **Gate A — Shared SObject Representation:**
  - Selected Option: `[ ] A1 (Multi-Tethers) | [x] A2 (Single Node + Non-Semantic Anchor + SHARED Badge) | [ ] A3 (Proxy Clones)`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES`

- [ ] **Gate B — Angular Placement Semantics:**
  - Selected Option: `[x] B1 (Geometry Uniform Packing) | [ ] B2 (Semantic Domain Sectors)`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES`

- [ ] **Gate C — Excluded Node Visibility Policy:**
  - Selected Option: `[x] C1 (Hide Unreachable Nodes) | [ ] C2 (Categorize Badges) | [ ] C3 (Peripheral Shell)`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES`

- [ ] **Gate D — Drag Position Persistence Scope:**
  - Selected Option: `[ ] D1 (Session-Only) | [ ] D2 (Mode-Scoped) | [x] D3 (Composite Mode+Focal Scoped)`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES`

---

## 2. Technical Corrections Checklist

Independent technical defect corrections:

- [ ] **DEF-01 (Remove Stale Position Merge Loop in `architecture-layout.ts`):**
  - Delete L169–171 (Constellation stale position copy loop): `[ ] COMPLETE`
  - Delete L219–221 (Orbit stale position copy loop): `[ ] COMPLETE`
  - Verified `orbitOutput.positions` contains ONLY projected focal nodes: `[ ] VERIFIED`

- [ ] **DEF-02 (Composite Storage Scoping in `projectState.ts` & `GraphView.tsx`):**
  - Update `GraphLayoutState` interface to `nodePositions[layoutMode][focalNodeId][nodeId]`: `[ ] COMPLETE`
  - Add M1/M2 legacy flat state migration in `mergeWithDefaultState`: `[ ] COMPLETE`
  - Update `captureAndPersistPositions()` in `GraphView.tsx` to pass active `layoutMode` and `focalLwcId`: `[ ] COMPLETE`

---

## 3. State Migration Checklist

Legacy state compatibility and safety verification:

- [ ] **M1 Proven-Context Migration:** Legacy flat entries migrated to `legacyNodePositions` store: `[ ] VERIFIED`
- [ ] **M2 Compatibility Quarantine:** Legacy positions initialized under `nodePositions.hierarchical.global`: `[ ] VERIFIED`
- [ ] **Zero Loss of User Edits:** Edits made in Hierarchical mode in prior sessions retained smoothly: `[ ] VERIFIED`
- [ ] **Zero Cross-Context Pollution:** Drag in LWC A view exerts 0 position effect on LWC B view: `[ ] VERIFIED`

---

## 4. Stage Prerequisites Matrix

| Implementation Stage | Prerequisites Required | Approval / Clearance Status |
|---|---|---|
| **Stage 0 — Authority & Prerequisites** | Predecessor audit deliverables A, B, C created | **COMPLETE** |
| **Stage 1 — Independent Technical Fix** | DEF-01 code review approval | **READY FOR EXECUTION** |
| **Stage 2 — Product Decision Changes** | `context/CURRENT-DECISIONS.md` signed for Gates A–D | **BLOCKED ON PRODUCT APPROVAL** |
| **Stage 3 — Integration & Validation** | Stage 1 and Stage 2 complete | **BLOCKED ON STAGE 2** |

---

## 5. Acceptance Criteria Required Before Lens B Freeze Declaration

The entire Lens B visualization lens may be declared **PRODUCT CONTRACT FROZEN (A)** and **TECHNICAL IMPLEMENTATION VERIFIED (T1)** only when all of the following pass:

1. [ ] `context/CURRENT-DECISIONS.md` contains signed product decision records for Gates A, B, C, and D.
2. [ ] `computeArchitectureLayoutWithMetadata` returns positions strictly for projected focal nodes in Orbit mode.
3. [ ] Unreachable nodes leave Cytoscape DOM canvas rendering in Orbit mode.
4. [ ] User drag overrides in LWC A view exert zero position effect in LWC B view or Hierarchical view.
5. [ ] Shared SObjects render with `"SHARED"` badge without implying exclusive ownership.
6. [ ] Legacy flat `nodePositions` JSON state migrates automatically without throwing errors or dropping user edits.
7. [ ] All 31 CLI integration test suites pass 100% (`npm run test:cli`).
8. [ ] All Vitest component and layout regression test suites pass 100%.
9. [ ] Zero position authority coordinate drift (`0.00000px`).
