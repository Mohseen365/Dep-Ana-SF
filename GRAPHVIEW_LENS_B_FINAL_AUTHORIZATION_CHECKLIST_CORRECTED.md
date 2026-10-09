# GRAPHVIEW LENS B — FINAL AUTHORIZATION CHECKLIST (CORRECTED)

## 1. Product Decisions Checklist (Gates A–D)

Before Lens B contract freeze can be declared, Product Authority must approve and record choices for all four gates in `context/CURRENT-DECISIONS.md`.

*Note: All selections are currently PROPOSED DEFAULTS and remain UNAPPROVED until recorded in `context/CURRENT-DECISIONS.md`.*

- [ ] **Gate A — Shared SObject Representation:**
  - Selected Option: `[ ] A1 (Multi-Tethers) | [ ] A2 (Single Node + Non-Semantic Anchor + SHARED Badge) [PROPOSED DEFAULT — NOT APPROVED] | [ ] A3 (Proxy Clones)`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES`

- [ ] **Gate B — Angular Placement Semantics:**
  - Selected Option: `[ ] B1 (Geometry Uniform Packing) [PROPOSED DEFAULT — NOT APPROVED] | [ ] B2 (Semantic Domain Sectors)`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES`

- [ ] **Gate C — Excluded Node Visibility Policy:**
  - Selected Option: `[ ] C1 (Hide Unreachable Nodes) [PROPOSED DEFAULT — NOT APPROVED] | [ ] C2 (Categorize Badges) | [ ] C3 (Peripheral Shell)`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES`

- [ ] **Gate D — Drag Position Persistence Scope:**
  - Selected Option: `[ ] D1 (Session-Only) | [ ] D2 (Mode-Scoped) | [ ] D3 (Composite Mode+Focal Scoped) [PROPOSED DEFAULT — NOT APPROVED]`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES`

---

## 2. Technical Corrections Checklist (DEF-01 & DEF-02)

Independent technical defect corrections and state migration:

- [ ] **DEF-01 — Remove Stale Position Merge Loop in `architecture-layout.ts`:**
  - Delete L169–171 (Constellation stale position copy loop): `[ ] COMPLETE`
  - Delete L219–221 (Orbit stale position copy loop): `[ ] COMPLETE`
  - Verified `orbitPositions` contains ONLY projected focal nodes: `[ ] VERIFIED`
  - Verified `constellationPositions` contains ONLY projected constellation nodes: `[ ] VERIFIED`

- [ ] **DEF-02 — Composite Storage Scoping in `projectState.ts` & `GraphView.tsx`:**
  - Update `GraphLayoutState` interface to `nodePositions[layoutMode][focalNodeId][nodeId]`: `[ ] COMPLETE`
  - Add M1/M2 legacy flat state migration & quarantine in `mergeWithDefaultState`: `[ ] COMPLETE`
  - Update `captureAndPersistPositions()` in `GraphView.tsx` to pass active `layoutMode` and `focalLwcId`: `[ ] COMPLETE`

---

## 3. State Migration & Compatibility Safety Checklist

- [ ] **M1 Proven-Context Migration:** Legacy flat entries migrated ONLY when stored context matches: `[ ] VERIFIED`
- [ ] **M2 Compatibility Quarantine:** Unproven legacy entries stored in `legacyNodePositions` compatibility store without active assignment to `hierarchical/global`: `[ ] VERIFIED`
- [ ] **Zero Data Loss:** Legacy user drag coordinates retained safely in compatibility store: `[ ] VERIFIED`
- [ ] **Zero Cross-Context Leakage:** User drag in LWC A Orbit view exerts zero effect on LWC B Orbit view or Hierarchical view: `[ ] VERIFIED`

---

## 4. Stage Prerequisites Matrix

| Implementation Stage | Prerequisites Required | Approval / Clearance Status |
|---|---|---|
| **Stage 0 — Authority & Prerequisites** | Lens B context retrieval & contradiction closure reports created | **COMPLETE** |
| **Stage 1 — Independent Technical Fix (DEF-01)** | Code review approval for L169–171 & L219–221 deletion + branch tests | **READY FOR AUTHORIZATION** |
| **Stage 2 — Product Decision Changes (Gates A–D)** | `context/CURRENT-DECISIONS.md` signed for Gates A–D | **BLOCKED ON PRODUCT APPROVAL** |
| **Stage 3 — Integration & Validation** | Stage 1 and Stage 2 complete | **BLOCKED ON STAGE 2** |

---

## 5. Acceptance Criteria Required Before Lens B Freeze Declaration

The entire Lens B visualization lens may be declared **PRODUCT CONTRACT FROZEN (A)** and **TECHNICAL IMPLEMENTATION VERIFIED (T1)** only when all of the following pass:

1. [ ] `context/CURRENT-DECISIONS.md` contains signed product decision records for Gates A, B, C, and D.
2. [ ] `computeArchitectureLayoutWithMetadata` returns positions strictly for projected focal nodes in Orbit and Constellation modes.
3. [ ] Unreachable nodes leave Cytoscape DOM canvas rendering in Orbit mode (Gate C).
4. [ ] User drag overrides in LWC A view exert zero position effect in LWC B view or Hierarchical view (Gate D).
5. [ ] Shared SObjects render with `"SHARED"` badge without implying exclusive ownership (Gate A).
6. [ ] Legacy flat `nodePositions` JSON state migrates/quarantines automatically without throwing errors or dropping user edits.
7. [ ] TST-STG1-01 through TST-STG1-06 unit tests pass 100%.
8. [ ] All 31 CLI integration test suites pass 100% (`npm run test:cli`).
9. [ ] Zero position authority coordinate drift (`0.00000px`).
