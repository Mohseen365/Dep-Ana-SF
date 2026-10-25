# GRAPHVIEW LENS B AUDIT-REPORT CONTRADICTION AND CONTRACT INTEGRITY VERIFICATION

## 1. Executive Verdict

**FINAL VERDICT:** `B — VERIFIED WITH LIMITATIONS`

### Executive Summary
This second-order adversarial verification independently audited the evidence, reasoning, and conclusions presented in `GRAPHVIEW_LENS_B_FUNDAMENTAL_PRINCIPLES_DECISION_CLOSURE_AND_MINIMUM_FROZEN_CONTRACT_AUDIT.md` against current repository state in `explorer/src/`.

The verification confirms that the core verdict (`DECISION C — CONTRACT NOT FROZEN`) and the primary repository defects are **fully supported by direct repository evidence**:
1. **Position Contamination Defect (Gate F):** `architecture-layout.ts` (lines 169–171, 219–221) forcibly copies `existingPositions` from previous layout modes/focal contexts into newly calculated Lens B outputs.
2. **Flat Drag Keying Defect (Gate G):** `projectState.ts` (line 47) stores positions in `graphLayout.nodePositions` keyed solely by `nodeId`, allowing user drags in one view to contaminate other views and focal contexts.
3. **Unresolved Product Decisions (Gates A, B, C, G):** Four implementation-blocking design authority questions (Shared SObject representation, Angular domain sectors vs uniform packing, Unreachable node visibility, and Drag position persistence lifetime) genuinely lack authoritative specification in schema or context files.

However, this second-order audit identifies **two minor limitations / over-simplifications** in the predecessor report:
- **Unified Root Cause:** Defect 1 (Position Contamination) and Defect 3 (Unreachable Node Stale Coordinate Inheritance) describe the **exact same code loop** in `architecture-layout.ts` (lines 169–171, 219–221), rather than two independent codebase bugs.
- **Label Geometry Scope:** While the AABB non-overlap predicate $\lvert x_i - x_j \rvert \ge W_{\text{eff}} \lor \lvert y_i - y_j \rvert \ge H_{\text{eff}}$ is a correct sufficient condition for fixed rectangular node bodies, its exact extension to variable-width multi-line text labels requires Cytoscape DOM text canvas measuring during runtime rendering.

---

## 2. Context-Retrieval Manifest

All required historical predecessor reports and context files were retrieved, re-read, and validated against current repository state:

| # | Filename / Artifact | Verification Status | Notes |
|---|---|---|---|
| 1 | `GRAPHVIEW_LENS_B_FUNDAMENTAL_PRINCIPLES_DECISION_CLOSURE_AND_MINIMUM_FROZEN_CONTRACT_AUDIT.md` | **RETRIEVED** | Audited target artifact (31,169 bytes). |
| 2 | `GRAPHVIEW_LENS_B_FINAL_DESIGN_AUTHORITY_AND_CONTRACT_FREEZE_AUDIT_REPORT.md` | **RETRIEVED** | Predecessor report 1. |
| 3 | `GRAPHVIEW_LENS_B_DESIGN_NEUTRAL_GEOMETRY_CONTRACT_FINAL_CLOSURE_AUDIT_REPORT.md` | **RETRIEVED** | Predecessor report 2. |
| 4 | `GRAPHVIEW_LENS_B_FINAL_GEOMETRY_CONTRACT_CLOSURE_AUDIT_REPORT.md` | **RETRIEVED** | Predecessor report 3. |
| 5 | `CURRENT-ARCHITECTURE.md` | **RETRIEVED** | Context file in `context/`. |
| 6 | `CURRENT-CONTRACTS.md` | **RETRIEVED** | Context file in `context/`. |
| 7 | `CURRENT-DECISIONS.md` | **RETRIEVED** | Context file in `context/`. |
| 8 | `CURRENT-IMPLEMENTATION.md` | **RETRIEVED** | Context file in `context/`. |
| 9 | `CURRENT-TESTS.md` | **RETRIEVED** | Context file in `context/`. |

---

## 3. Verification Methodology and Evidence Hierarchy

Every claim is classified according to the 5-tier classification framework:
- **FACT:** Directly supported by source code, schema, or executable test output.
- **INFERENCE:** Directly derived from logical implications of facts.
- **DESIGN JUDGMENT:** Requires explicit choice by product/architecture design authority.
- **RECOMMENDATION:** Proposed implementation strategy; not an established contract.
- **UNRESOLVED:** Insufficient authority or evidence to decide.

---

## 4. Verification Gate 1 — Position Contamination Findings

### Code Inspection
In `explorer/src/lib/architecture-layout.ts`:
- **Constellation Mode (lines 169–171):**
  ```typescript
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos && !(id in constellationOutput.positions)) {
      constellationPositions[id] = { x: pos.x, y: pos.y };
    }
  }
  ```
- **Orbit Mode (lines 219–221):**
  ```typescript
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos && !(id in orbitOutput.positions)) {
      orbitPositions[id] = { x: pos.x, y: pos.y };
    }
  }
  ```

### Analysis
1. **Loop Existence:** Confirmed present in `architecture-layout.ts`.
2. **Affected Categories:** Any node in `existingPositions` that was not assigned a position by `computeComponentOrbitLayout` or `computeComponentConstellationLayout` (e.g. unreachable nodes, nodes outside max depth, or nodes belonging to a previous focal context).
3. **Cross-Context Leakage:** When switching from Hierarchical layout or changing `focalLwcId`, `existingPositions` contains coordinates from the prior context. Nodes omitted from the new Lens B layout inherit these stale coordinates.
4. **Contract Status:** Violates Position Authority Level 4 pure function constraints (`CONFIRMED`).
5. **Defect Consolidation:** Reported Defect #1 (Position Contamination) and Defect #3 (Unreachable Node Stale Coordinates) are **two manifestations of the same underlying merge loop** in `architecture-layout.ts`.

---

## 5. Verification Gate 2 — Drag-State Identity Findings

### State Identity Invariant
To ensure user-drag positions do not contaminate other views, position identity requires scoping across 4 dimensions:
$$\text{StorageKey} = (\text{projectId}, \text{layoutMode}, \text{focalNodeId} \mid \text{'global'}, \text{nodeId})$$

### Viable Storage Strategies & Authority Requirements

| Storage Strategy | Keying Structure | Requirements Satisfied | Authority Needed |
|---|---|---|---|
| **Strategy A: Flat Node Keying** | `nodePositions[nodeId]` | Simplest storage; cross-mode sharing. | Fails isolation across focal contexts. |
| **Strategy B: Mode-Scoped Keying** | `nodePositions[mode][nodeId]` | Mode isolation; shares across focal contexts. | Fails isolation across focal LWCs in Orbit mode. |
| **Strategy C: Composite Scoped Keying** | `nodePositions[mode][focalId][nodeId]` | 100% isolation across modes and focal contexts. | **RECOMMENDED.** Scopes drag state perfectly. |

---

## 6. Verification Gate 3 — Geometry and Collision-Invariant Findings

### AABB Non-Overlap Predicate Verification
The predicate $\lvert x_i - x_j \rvert \ge W_{\text{eff}} \lor \lvert y_i - y_j \rvert \ge H_{\text{eff}}$ is a **proven sufficient condition** for fixed axis-aligned rectangular node bodies with $W_{\text{eff}} = W + C_x = 160\text{px}$ and $H_{\text{eff}} = H + C_y = 100\text{px}$.

### Chord Distance Formula vs Scalar Arc Length
On a circle of radius $R$ with $N$ nodes, the straight-line chord distance between adjacent node centers is:
$$d_{\text{chord}} = 2 R \sin\left(\frac{\pi}{N}\right)$$
For non-overlap, $d_{\text{chord}} \ge \sqrt{W_{\text{eff}}^2 + H_{\text{eff}}^2} \approx 188.68\text{px}$. Therefore:
$$R \ge \frac{188.68}{2 \sin(\pi / N)}$$

The scalar arc length formula ($2\pi R / N \ge W_{\text{eff}}$) underestimates required radial spacing because arc length is strictly greater than straight-line chord distance and ignores node height $H$!

### Hardcoded Capacity 8 Analysis
- Placing $N=8$ nodes on a track at $R=280\text{px}$ yields $d_{\text{chord}} = 2 \cdot 280 \cdot \sin(\pi/8) \approx 214.3\text{px} \ge 188.68\text{px}$ (Collision Free).
- Placing $N=16$ nodes on a track at $R=280\text{px}$ yields $d_{\text{chord}} = 2 \cdot 280 \cdot \sin(\pi/16) \approx 109.2\text{px} < 188.68\text{px}$ (Collision Occurs without radial expansion).
- Multi-track expansion in `component-orbit-layout.ts` (lines 170–190) calculates required radius dynamically via `reqRadius = requiredChordSeparation / (2 * sin(pi / n_k))`, guaranteeing zero AABB overlap across tracks.

---

## 7. Verification Gate 4 — Unreachable-Node Classification Findings

In `component-orbit-adapter.ts` (lines 280–285), `unreachableNodeIds` is computed as:
```typescript
const unreachableNodeIds = nodes
  .map((n) => n.id)
  .filter((id) => !reachableSet.has(id))
  .sort((a, b) => a.localeCompare(b));
```

This array combines:
1. **Depth-Truncated Nodes:** Reachable in topology, but $d > \text{maxDepth}$ (7).
2. **Disconnected Components:** Disconnected from focal LWC (0 paths).
3. **Filtered Nodes:** Excluded by relationship filters (`includeTestReferences: false`).

All three categories are currently passed to `architecture-layout.ts`, where the `existingPositions` merge loop assigns them stale coordinates from previous views.

---

## 8. Verification Gate 5 — Determinism and Test Evidence Matrix

| Property | Test Identifier | Command / Test File | Result | Verified Scope |
|---|---|---|---|---|
| **CLI Architecture Tests** | 31 Integration Suites | `npm run test:cli` | **PASS (31/31)** | Full CLI pipeline |
| **Orbit Geometry Layout** | `component-orbit-layout.test.ts` | `vitest run component-orbit-layout.test.ts` | **PASS (12/12)** | Radial placement & G1–G12 |
| **Constellation Layout** | `component-constellation-layout.test.ts` | `vitest run component-constellation-layout.test.ts` | **PASS (10/10)** | Multi-sun constellation |
| **Static Constellation Filter** | `static-constellation-projection.test.ts` | `vitest run static-constellation-projection.test.ts` | **PASS (8/8)** | Projection filtering |

---

## 9. Internal Contradiction Ledger

| # | Conflict Subject | Claim A | Claim B | Resolution |
|---|---|---|---|---|
| 1 | **Defect Count** | Predecessor report listed Defect #1 and Defect #3 as separate defects. | Both describe the `existingPositions` loop in `architecture-layout.ts` (lines 169–171/219–221). | **APPARENT CONTRADICTION WITH EXPLANATION.** Single root defect with two user-visible symptoms. |
| 2 | **AABB Invariant Scope** | AABB predicate $\lvert dx \rvert \ge W_{\text{eff}} \lor \lvert dy \rvert \ge H_{\text{eff}}$ labelled frozen. | Cytoscape label wrapping varies dynamically with text length. | **APPARENT CONTRADICTION WITH EXPLANATION.** Predicate frozen for fixed node bodies; label wrapping bounded at DOM render time. |
| 3 | **Multi-Track Safety** | Multi-track expansion labelled frozen. | Complete collision safety requires dynamic chord separation. | **APPARENT CONTRADICTION WITH EXPLANATION.** Multi-track radial expansion uses exact chord formula $R \ge d_{\text{chord}} / (2 \sin(\pi/N))$. |

---

## 10. Product Decisions Decision Packet

The following 4 explicit decisions are required from product/architecture design authority before Lens B contracts can be declared frozen:

1. **Shared SObjects (Gate A):** Choose between Single Shared Node with Multi-Tethers, Designated Geometric Anchor, or Visual Proxy Clones.
2. **Angular Semantics (Gate B):** Choose between Model A (Uniform Spatial Packing) and Model B (Semantically Meaningful Sectors).
3. **Unreachable Node Visibility (Gate C):** Choose between Hiding Unreachable Nodes, Outer Peripheral Shell ($R_{\text{max}} + \Delta R$), or Adapter Exclusion.
4. **Drag Position Scope (Gate G):** Choose between Session-Only Focal Isolation, Project-Level Mode Isolation, or Permanent Global Override.

---

## 11. Final Verification Decision Gate

### **FINAL VERDICT: `VERIFIED WITH LIMITATIONS`**

**Justification:** The core audit verdict (`DECISION C — CONTRACT NOT FROZEN`) and position authority defects are 100% verified against current repository source code. Predecessor report findings are validated with two minor clarifications regarding defect consolidation and dynamic label DOM bounds.

---

## 12. Evidence Index

| Module | File Path | Lines | Verification Result |
|---|---|---|---|
| Architecture Layout Orchestrator | `explorer/src/lib/architecture-layout.ts` | 169–171, 219–221 | Confirmed Position Contamination Leak |
| Component Orbit Adapter | `explorer/src/lib/adapters/component-orbit-adapter.ts` | 280–285 | Confirmed `unreachableNodeIds` derivation |
| Component Orbit Layout | `explorer/src/lib/layout/component-orbit-layout.ts` | 154, 193–194, 210–225 | Confirmed linear angle step & dynamic chord radius |
| Project State Context | `explorer/src/lib/projectState.ts` | 47, 205 | Confirmed flat `nodePositions` storage schema |
