# GRAPHVIEW LENS B — DOCUMENTATION CONTRADICTION CLOSURE AND IMPLEMENTATION READINESS AUDIT

## 1. Executive Verdict

**PRODUCT CONTRACT STATUS:** `C — PRODUCT CONTRACT NOT FROZEN`
**TECHNICAL IMPLEMENTATION STATUS:** `T2 — CONTRACT ESTABLISHED, IMPLEMENTATION GAPS REMAIN`
**VALIDATION STATUS:** `V2 — PARTIALLY VALIDATED`

### Executive Summary

This report establishes the context-retrieved, source-grounded contradiction closure for **GraphView Lens B — Component Orbit / Component Constellation**.

The preceding three documentation deliverables (`GRAPHVIEW_LENS_B_CONTEXT_RETRIEVAL_AND_CONTRADICTION_RECONCILIATION.md`, `GRAPHVIEW_LENS_B_SAFE_IMPLEMENTATION_SEQUENCE.md`, and `GRAPHVIEW_LENS_B_FINAL_AUTHORIZATION_CHECKLIST.md`) contained five material contradictions and safety risks that required correction before implementation could be authorized:

1. **Correction A — Legacy Position Quarantine vs Migration:** The prior report recommended quarantining legacy positions, but contradicted itself by prescribing `nodePositions.hierarchical.global = legacyNodePositions`. This automatically activated legacy positions in a context (`hierarchical/global`) without proving that context was their original source. This report classifies automatic assignment as **`UNSAFE / UNRESOLVED`** and defines explicit Quarantine vs. Migration boundaries under Policies M1–M4.
2. **Correction B — Composite Position-State Schema:** The prior safe implementation sequence omitted the `nodeId` dimension in its TypeScript type definition, declaring `Record<string, Record<string, {x: number; y: number}>>`. This report restores the exact logical structure `nodePositions[layoutMode][focalNodeId][nodeId] = {x, y}` (typed as `Record<string, Record<string, Record<string, {x: number; y: number>>>>>`) and proves why a second `projectId` key inside `GraphLayoutState` is redundant given top-level `ProjectUIState` scoping in `projectState.ts`.
3. **Correction C — Approval Status Unambiguous:** The prior authorization checklist visually checked boxes `[x]` for options A2, B1, C1, and D3 while simultaneously noting that product approval records were absent. This report corrects the visual contradiction: all approval checkboxes remain unchecked `[ ]`, displayed as **`PROPOSED DEFAULT — NOT APPROVED`**.
4. **Correction D — Stage 1 Test Coverage Matrix:** The prior implementation sequence proposed deleting stale-position merge loops in both Orbit (lines 219–221) and Constellation (lines 169–171) in `architecture-layout.ts`, but its test specification covered only Orbit. This report details a comprehensive test matrix explicitly asserting contract compliance for both branches.
5. **Correction E — Working-Tree & Rollback Safety:** The prior implementation sequence assumed a clean working tree at a historical commit and proposed broad rollback commands (`git checkout`). This report defines non-destructive preconditions and a controlled patch-reversion recovery procedure (`git apply -R`) that protects uncommitted audit deliverables and user work.

---

## 2. Current Repository and Commit Identity

- **Git Commit SHA:** `8a25cc255430c99f5f0a76cb879b4db12cb0f2d2`
- **Working-Tree Status:** Clean working tree on branch `jules-5887262621270202402-28f93f59`. Zero production code or test file modifications.
- **Verification Environment:** Node.js v22.13.0, Linux x86_64, React 19, Cytoscape 3.30, Vitest 5.0.3.

---

## 3. Context Retrieval Manifest

Every required project context file and predecessor report was retrieved and inspected directly:

| Source Artifact | Retrieval Path | Retrieval Status | Authority Level | Relevant Symbol / Section | Key Finding | Evidence Limitation |
|---|---|---|---|---|---|---|
| `context/CURRENT-ARCHITECTURE.md` | `context/CURRENT-ARCHITECTURE.md` | `RETRIEVED_AND_INSPECTED` | Tier 2 System Spec | Section 3 State Authority & Section 4 Position Authority | Defines single-owner contexts and Level 1–5 Position Authority | Silent on user Gate choices |
| `context/CURRENT-CONTRACTS.md` | `context/CURRENT-CONTRACTS.md` | `RETRIEVED_AND_INSPECTED` | Tier 2 Technical Contract | Section 2 Layout Contracts & Section 3 Worker IPC | Defines $160 \times 100$ AABB bounds & Level 4 pure calculation rules | Technical contract |
| `context/CURRENT-DECISIONS.md` | `context/CURRENT-DECISIONS.md` | `RETRIEVED_AND_INSPECTED` | Tier 1 Decision Log | Decisions 1–7 | **0 approved records for Gates A, B, C, or D** | Decision log |
| `context/CURRENT-IMPLEMENTATION.md` | `context/CURRENT-IMPLEMENTATION.md` | `RETRIEVED_AND_INSPECTED` | Tier 4 Implementation Map | Section 1 Source Map & Section 3 Data Flow | System execution mapping | Implementation map |
| `context/CURRENT-TESTS.md` | `context/CURRENT-TESTS.md` | `RETRIEVED_AND_INSPECTED` | Tier 5 Test Baseline | Section 1 CLI Suites & Section 2 Vitest Suites | 31 CLI test suites baseline | Test inventory |
| `context/PROJECT-OVERVIEW.md` | `context/PROJECT-OVERVIEW.md` | `RETRIEVED_AND_INSPECTED` | Tier 2 System Overview | Overview | Workspace overview | Overview only |
| `context/SOURCE-REGISTER.md` | `context/SOURCE-REGISTER.md` | `RETRIEVED_AND_INSPECTED` | Tier 2 Source Map | Subsystem Routing | Routing authority map | Routing map |
| `context/SUPERSESSION-MAP.md` | `context/SUPERSESSION-MAP.md` | `RETRIEVED_AND_INSPECTED` | Tier 2 Milestone Map | Milestone Map | Supersession timeline | Historical map |
| `GRAPHVIEW_LENS_B_PRODUCT_AUTHORITY_AND_IMPLEMENTATION_BOUNDARY.md` | Root | `RETRIEVED_AND_INSPECTED` | Tier 6 Audit Deliverable | Sections 1–5 | Documented implementation boundary & defect verification matrix | Audit report |
| `GRAPHVIEW_LENS_B_MINIMUM_CORRECTION_PLAN.md` | Root | `RETRIEVED_AND_INSPECTED` | Tier 6 Audit Deliverable | Steps 1–3 | Proposed 3-step correction sequence for DEF-01 and DEF-02 | Audit report |
| `GRAPHVIEW_LENS_B_PRODUCT_DECISION_PACKET.md` | Root | `RETRIEVED_AND_INSPECTED` | Tier 6 Audit Deliverable | Sections 1–4 | Decision packets and approval forms for Gates A–D | Audit report |
| `GRAPHVIEW_LENS_B_FINAL_CONTRACT_DECISION_READINESS_AND_MINIMUM_CORRECTION_REPORT.md` | Root | `RETRIEVED_AND_INSPECTED` | Tier 6 Audit Deliverable | Geometry Sections | Geometry resolution & 12-scenario Gate D lifecycle | Audit report |
| `GRAPHVIEW_LENS_B_FINAL_AUTHORITATIVE_CONTRACT_AND_REPOSITORY_TRUTH_AUDIT.md` | Root | `RETRIEVED_AND_INSPECTED` | Tier 6 Audit Deliverable | Claims 1–14 | 14-claim historical reconciliation & decision register | Audit report |
| `GRAPHVIEW_LENS_B_PRODUCT_DECISION_AUTHORITY_RETRIEVAL_AND_CONTRACT_CLOSURE_GATE_REPORT.md` | Root | `RETRIEVED_AND_INSPECTED` | Tier 6 Audit Deliverable | Authority Gates | Authority retrieval & gate closures | Audit report |
| `GRAPHVIEW_LENS_B_CONTEXT_RETRIEVAL_AND_DESIGN_AUTHORITY_DECISION_CLOSURE_REPORT.md` | Root | `RETRIEVED_AND_INSPECTED` | Tier 6 Audit Deliverable | Design Authority | Design authority closure report | Audit report |
| `GRAPHVIEW_LENS_B_CONTEXT_RETRIEVAL_AND_CONTRADICTION_RECONCILIATION.md` | Root | `RETRIEVED_AND_INSPECTED` | Tier 6 Audit Deliverable | Complete contents | Prior reconciliation report containing Contradictions A–E | Target of correction |
| `GRAPHVIEW_LENS_B_SAFE_IMPLEMENTATION_SEQUENCE.md` | Root | `RETRIEVED_AND_INSPECTED` | Tier 6 Audit Deliverable | Stages 0–3 | Prior implementation sequence containing Contradictions A–E | Target of correction |
| `GRAPHVIEW_LENS_B_FINAL_AUTHORIZATION_CHECKLIST.md` | Root | `RETRIEVED_AND_INSPECTED` | Tier 6 Audit Deliverable | Checklist 1–5 | Prior authorization checklist containing Contradictions A–E | Target of correction |

---

## 4. Source-Backed Fact Ledger

All material assertions across current source code and documentation are verified against active source lines:

| Claim ID | Classification | Source File Path | Symbol / Line | Direct Source Evidence | Implementation Boundary Implication |
|---|---|---|---|---|---|
| **FCT-01** | `FACT` | `architecture-layout.ts` | L169–171 | `for (const [id, pos] of Object.entries(existingPositions)) { if (pos && !(id in constellationOutput.positions)) constellationPositions[id] = { x: pos.x, y: pos.y }; }` | Constellation layout merges unassigned nodes from `existingPositions` (**DEF-01 Branch 1**) |
| **FCT-02** | `FACT` | `architecture-layout.ts` | L219–221 | `for (const [id, pos] of Object.entries(existingPositions)) { if (pos && !(id in orbitOutput.positions)) orbitPositions[id] = { x: pos.x, y: pos.y }; }` | Orbit layout merges unassigned nodes from `existingPositions` (**DEF-01 Branch 2**) |
| **FCT-03** | `FACT` | `projectState.ts` | L47 | `nodePositions: Record<string, { x: number; y: number }>;` | Flat key storage without mode or focal scope (**DEF-02**) |
| **FCT-04** | `FACT` | `projectState.ts` | L185–188 | `getProjectStorageKey(projectId)` returns `explorer.projectState.${projectId}` | State persistence is **already project-scoped at top-level key** |
| **FCT-05** | `FACT` | `GraphView.tsx` | L139–153 | `effectiveLayoutOptions` derives `derivedFocalLwcId` from `selectedNodeId ?? layoutOptions?.focalLwcId ?? focusedNodeId` | Focal LWC passes dynamically to layout dispatcher |
| **FCT-06** | `FACT` | `GraphView.tsx` | L195–207 | `captureAndPersistPositions` reads all canvas nodes and invokes `onNodePositionsChange` | Drag captures current viewport positions |
| **FCT-07** | `FACT` | `context/CURRENT-CONTRACTS.md` | Section 3 | "Level 4: Synchronous pipeline fallback (`computeArchitectureLayoutWithMetadata`). Position authority enforces 0.00000px coordinate drift." | Pure calculation constraint prohibits merging unassigned stale nodes into calculation output |
| **FCT-08** | `FACT` | `context/CURRENT-DECISIONS.md` | Entire File | Decisions 1–7 recorded | Zero decision records exist for Gates A, B, C, or D |

---

## 5. Correction A — Legacy Position Quarantine vs Migration

### The Contradiction
The prior reconciliation report correctly noted that legacy flat `nodePositions[nodeId]` entries lack layout mode, focal component, or project context metadata. It recommended quarantining legacy entries (M2) and migrating entries only when proven (M1). However, it then prescribed:

`nodePositions.hierarchical.global = legacyNodePositions`

This automatically activated legacy positions in the `hierarchical/global` context, despite having zero proof that the legacy flat entries were created in that context.

### Source Verification & Findings
1. **Metadata Absence:** Old flat `nodePositions[nodeId]` entries in `projectState.ts` (L47) store only `{ x: number, y: number }`. They contain zero `layoutMode`, `focalNodeId`, `timestamp`, or `viewMode` metadata.
2. **Context Unrecoverability:** It is impossible to prove retroactively whether a flat coordinate was authored during Hierarchical mode, Hybrid mode, Component Orbit, or Component Constellation.
3. **Contamination Risk:** Automatically applying flat entries to `hierarchical/global` risks applying an Orbit circular layout coordinate as an active drag override in Hierarchical mode, corrupting the layout layout.

### Resolution: Strict Operational Definitions

#### Quarantine (Default Safe State)
- Legacy flat entries are stored in a separate compatibility field: `legacyNodePositions?: Record<string, { x: number; y: number }>`.
- Quarantined entries are **NEVER** automatically assigned to `nodePositions.hierarchical.global` or any other active scoped mode.
- Quarantined entries are never consumed by Position Authority Level 2 active position lookups.
- Quarantined entries do not override layout calculation defaults.
- Quarantined entries remain in raw storage to prevent data loss, but do not alter active visual layout.

#### Migration (Authorized Assignment)
- Legacy entries are moved into scoped position maps (`nodePositions[layoutMode][focalNodeId][nodeId]`) **ONLY** when:
  a) The entry's original context is proven via explicit surrounding state (e.g. `graphLayout.architectureMode === 'hierarchical'`), OR
  b) An attributable Product Decision explicitly authorizes a fallback assignment policy (e.g. Policy M3).
- Missing, malformed, or ambiguous legacy entries remain in `legacyNodePositions` without throwing runtime errors.
- Quarantined entries are retained indefinitely until explicit user reset or authorized migration.

### Evaluation of Migration Policies M1–M4

| Policy | Description | Cross-Context Contamination Risk | User Edit Loss Risk | Backward Compatibility | Required Authorization | Final Classification |
|---|---|---|---|---|---|---|
| **M1 — Proven-Context Migration** | Migrate legacy flat entries to `nodePositions[mode][focalId]` ONLY if stored `architectureMode` matches | **Zero** | Low (unproven entries quarantined) | High | Technical / Automatic | **RECOMMENDED DEFAULT** |
| **M2 — Compatibility Quarantine** | Retain unproven legacy flat entries in `legacyNodePositions` compatibility store without active application | **Zero** | **Zero** (Data preserved) | **100%** | Technical / Automatic | **RECOMMENDED DEFAULT** |
| **M3 — Explicit Authorized Fallback** | Fall back to `legacyNodePositions` as Level 2 override when no scoped entry exists | High (Leaks legacy positions into active views) | Zero | High | Product Authority (Gate D) | **REQUIRES PRODUCT APPROVAL** |
| **M4 — Reset Legacy Overrides** | Discard flat legacy custom positions on schema migration | Zero | High (Destroys user drag edits) | Low | Product Authority (Gate D) | **REJECTED (DATA LOSS)** |

**Determination:** Automatic assignment `nodePositions.hierarchical.global = legacyNodePositions` is **UNSAFE / UNRESOLVED** and must NOT be executed. Combine **M1 (Proven-Context Migration)** and **M2 (Compatibility Quarantine)** as the safe technical default.

---

## 6. Correction B — Composite Position-State Schema

### The Contradiction
The logical state hierarchy was described as `nodePositions[layoutMode][focalNodeId][nodeId]`, but the prior safe implementation sequence declared the TypeScript interface as:

```typescript
// CONTRADICTORY PRIOR TYPE (MISSING nodeId LEVEL):
nodePositions: Record<string, Record<string, { x: number; y: number }>>;
```

This omitted the `nodeId` dimension, making it impossible to store multiple node coordinates under a focal component.

### Verification of Enclosing Scope
Inspecting `projectState.ts` (lines 180–210) confirms that `ProjectUIState` is loaded via `loadProjectState(projectId)`, which accesses `localStorage.getItem('explorer.projectState.' + projectId)`.
Because the entire `GraphLayoutState` object is contained inside `ProjectUIState`, **state persistence is ALREADY project-scoped at the top-level localStorage key**.

Therefore, introducing a redundant `projectId` key inside `nodePositions` (e.g., `nodePositions[projectId][layoutMode]...`) is unnecessary and violates schema normalization.

### Correct Logical Structure and TypeScript Interface

#### Logical Structure
```text
nodePositions[layoutMode][focalNodeId][nodeId] = { x: number, y: number }
```

#### TypeScript Type Definition
```typescript
export interface GraphLayoutState {
  layoutName?: string;
  mode: GraphInteractionMode;
  architectureMode?: ArchitectureLayoutMode;
  layoutProvenance?: LayoutProvenance;
  // Composite 3-tier scoped position map: [layoutMode][focalNodeId | 'global'][nodeId]
  nodePositions: Record<string, Record<string, Record<string, { x: number; y: number }>>>;
  legacyNodePositions?: Record<string, { x: number; y: number }>;
  layoutVersion?: string | number;
}
```

#### Field Standards & Domain Representation
- **Global / Non-Focal Modes:** Hierarchical and Hybrid modes do not use a focal LWC. Their position maps use the reserved string `'global'` as the `focalNodeId` key (e.g., `nodePositions['hierarchical']['global'][nodeId]`).
- **Missing Focal ID in Orbit Mode:** If Orbit mode runs without a selected/focused LWC, `focalNodeId` falls back to `'default'` or the deterministic default LWC ID (`'LWC:vendor-assignment-panel'`).
- **Canonical Layout Mode Keys:** `'hierarchical'`, `'hybrid'`, `'orbit'`, `'constellation'`.
- **Invalid / Missing Coordinates:** Missing keys return `undefined` and fall back to Level 3/4 layout calculation defaults. Invalid non-numeric coordinates are discarded during state deserialization (`mergeWithDefaultState`).
- **Position Restoration Precedence:**
  1. `sessionPositions` (active in-memory drag during session)
  2. `nodePositions[activeLayoutMode][activeFocalId || 'global'][nodeId]`
  3. Calculated layout output from Web Worker / `computeArchitectureLayoutWithMetadata`
- **Context-Switch Isolation:** Switching `architectureMode` or `focalLwcId` changes the active lookup key in `nodePositions`, preventing cross-context position leakage.
- **Reset Behavior:** Reset layout clears `sessionPositions` and deletes the active key entry `nodePositions[activeLayoutMode][activeFocalId]`.

---

## 7. Correction C — Approval Status Unambiguous

### The Contradiction
`GRAPHVIEW_LENS_B_FINAL_AUTHORIZATION_CHECKLIST.md` visually marked options A2, B1, C1, and D3 with checked boxes `[x]`, despite explicitly stating in prose that decision records were absent in `context/CURRENT-DECISIONS.md`.

### Source Verification
Inspecting `context/CURRENT-DECISIONS.md` confirms that decisions 1–7 cover state authority, 18 view modes, worker offloading, orbit layout, constellation sync, two-pane shell, and safety envelope. **Zero approved records exist for Gates A, B, C, or D.**

### Corrected Status Rules
- `PROPOSED DEFAULT — NOT APPROVED`: Recommended technical choice, awaiting Product Authority approval.
- Visual checkboxes MUST reflect reality: `[ ]` for unapproved choices, `[x]` ONLY when an attributable decision record exists in `context/CURRENT-DECISIONS.md`.

---

## 8. Correction D — Stage 1 Test Coverage Reconciliation

### The Contradiction
The prior implementation sequence proposed removing stale-position merge loops in both Orbit and Constellation modes, but provided an explicit test example covering Orbit only.

### Source Verification
Inspecting `explorer/src/lib/architecture-layout.ts` reveals TWO distinct stale-position merge loop locations:
- **Constellation Branch (L169–171):**
  ```typescript
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos && !(id in constellationOutput.positions)) {
      constellationPositions[id] = { x: pos.x, y: pos.y };
    }
  }
  ```
- **Orbit Branch (L219–221):**
  ```typescript
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos && !(id in orbitOutput.positions)) {
      orbitPositions[id] = { x: pos.x, y: pos.y };
    }
  }
  ```

Because Constellation and Orbit execute through separate code paths and adapters (`adaptComponentConstellation` vs `adaptComponentOrbit`), a test passing on Orbit provides ZERO assurance that the Constellation branch is fixed or regression-free.

### Explicit Test Matrix Required for Stage 1

| Test ID | Target Branch | Input Preconditions | Expected Assertions | Location |
|---|---|---|---|---|
| **TST-STG1-01** | Orbit L219–221 | `architectureMode: 'orbit'`, `existingPositions: { "UnrelatedNode": {x: 999, y: 999} }` | `"UnrelatedNode" in result.positions` is `false`. Output contains ONLY projected focal nodes. | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` |
| **TST-STG1-02** | Constellation L169–171 | `architectureMode: 'constellation'`, `existingPositions: { "UnrelatedNode": {x: 999, y: 999} }` | `"UnrelatedNode" in result.positions` is `false`. Output contains ONLY projected constellation nodes. | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` |
| **TST-STG1-03** | Projected Coordinates | Valid LWC focal input in Orbit & Constellation | Projected node coordinates match adapter output bit-for-bit ($0.00000\text{px}$ drift). | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` |
| **TST-STG1-04** | Hierarchical Fallback | `architectureMode: 'hierarchical'` | Hierarchical layout calculation remains 100% unaffected. | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` |
| **TST-STG1-05** | Empty / Edge Cases | Empty `nodes` or `edges` array | Layout dispatcher handles gracefully without throwing exceptions. | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` |
| **TST-STG1-06** | Position Authority | Level 1–5 hierarchy check | Pure function rules respected; zero state mutation. | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` |

---

## 9. Correction E — Working-Tree & Rollback Safety

### Precondition Verification
Before applying any patch or code change:
1. Execute `git status` to verify commit SHA and inspect working-tree state.
2. Confirm that audit deliverables (`GRAPHVIEW_LENS_B_*.md`) and user files are tracked or isolated.
3. Prohibit broad destructive commands such as `git checkout .`, `git reset --hard`, or `git clean -fd`.

### Controlled Patch Recovery Procedure
If a Stage 1 code change fails verification or must be reverted:
1. Generate the exact implementation patch diff: `git diff explorer/src/lib/architecture-layout.ts > stage1_fix.patch`.
2. Inspect `stage1_fix.patch` to confirm it contains ONLY lines 169–171 and 219–221 deletions.
3. To revert cleanly without touching uncommitted audit deliverables or user work, execute reverse patch:
   `git apply -R stage1_fix.patch`
4. Re-run `npm run test:cli` to confirm clean recovery.

---

## 10. Remaining Unresolved Questions

1. **Gate A–D Product Sign-Off:** When will Product Authority review `GRAPHVIEW_LENS_B_PRODUCT_DECISION_PACKET.md` and record choices in `context/CURRENT-DECISIONS.md`?
2. **Gate C Cytoscape DOM Removal:** Will Product Authority select Policy C1 (Hide Unreachable Nodes), C2 (Categorize Badges), or C3 (Peripheral Shell)?
3. **Gate D Drag Storage Persistence:** Will Product Authority authorize Policy D3 (Composite Mode+Focal Scoped Persistence) and permit M1/M2 state migration?

---

## 11. Exact Implementation Boundary

```text
================================================================================
                    FINAL RECONCILED IMPLEMENTATION BOUNDARY
================================================================================

[AUTHORIZED STAGE 1 WORK — INDEPENDENT TECHNICAL FIX (DEF-01)]
--------------------------------------------------------------
1. Delete lines 169–171 (Constellation stale position copy loop) in architecture-layout.ts.
2. Delete lines 219–221 (Orbit stale position copy loop) in architecture-layout.ts.
3. Add TST-STG1-01 through TST-STG1-06 unit tests in Phase2FA_CoreArchitecture.test.tsx.

[BLOCKED STAGE 2 WORK — REQUIRES PRODUCT APPROVAL IN CURRENT-DECISIONS.MD]
-------------------------------------------------------------------------
1. BLOCKED: Gate A SHARED badge UI and SObject anchor logic.
2. BLOCKED: Gate B domain sector angular offsets and guidelines.
3. BLOCKED: Gate C Cytoscape DOM element removal filtering in GraphView.tsx.
4. BLOCKED: Gate D composite drag position storage schema in projectState.ts.
================================================================================
```
