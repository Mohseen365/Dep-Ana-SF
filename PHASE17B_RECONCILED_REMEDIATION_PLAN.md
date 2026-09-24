# PHASE 17B — RECONCILED REMEDIATION PLAN

## 1. Purpose

This document provides the reconciled, technically disciplined remediation plan for the Salesforce Architecture Explorer repository, reconciling the preliminary planning in Phase 17 with the authoritative change-surface analysis established in Phase 17A (`PHASE17A_CHANGE_SURFACE_AND_REGRESSION_BOUNDARY.md`).

This is a **planning reconciliation only**. No production code, test suites, build configurations, routing logic, fixtures, layout algorithms, historical reports, or `AGENT.md` files have been modified.

---

## 2. Planning Decision Status

To maintain strict alignment with repository governance, planning proceeds under explicit **project-level engineering decisions supplied for planning**, clearly distinguished from formal repository governance records (`PHASE16F_DECISION_CLOSURE_AND_AUTHORIZATION_GATE.md`):

1. **Track A (Production Provisioning)**:
   * *Planning Decision*: Production fixture provisioning shall follow the generated build/export artifact model.
   * *Governance Context*: This is a project-level engineering direction for planning. It does not overwrite Phase 16F or claim external governance authority approval.

2. **Track B (40px Contract)**:
   * *Planning Decision*: `>= 40.0px` remains the strict semantic clearance contract (`FEAT-LAYOUT-report-v2.md`).
   * *Governance Context*: The existing `39.99px` automated test threshold is treated as implementation behavior requiring technical reconciliation, not as a contract change.

3. **Track C (Locality)**:
   * *Planning Decision*: The historical global `medianIntra < medianInter` criterion is not the governing criterion for the current multi-row 2D layout; planning proceeds toward a layer-aware locality criterion.
   * *Governance Context*: Acknowledges that global metric failure (`1,101.68px > 1,020.00px`) is an artifact of 4-layer vertical Y hierarchy vs horizontal 2D band packing.

---

## 3. Track A — Production Provisioning

### Decision

Generated build/export artifact model for production provisioning.

### Proven Evidence

* Current runtime project resolution in `ProjectContext.tsx` attempts to fetch project-scoped datasets from `/projects/${projectId}/explorer-data.json`.
* In a clean repository checkout, `explorer/public/projects/*` is gitignored (`.gitignore` line 9) and absent on disk, causing browser runtime requests for `?project=cloud-spend-tracker` to return HTTP 404 and fall back to the 4-node default fixture (`/explorer-data.json`).
* Automated browser test suites (Playwright) pass because test scripts explicitly copy `audit-fixtures/cloud-spend-tracker/explorer-data.json` to `explorer/public/projects/cloud-spend-tracker/explorer-data.json` prior to starting Vite.

### Required Outcome

Production environment receives project contract artifacts through the standard build/export execution pipeline.

### Change Surface

* `scripts/export-explorer.cjs`: MUST CHANGE (ensure project export routine deterministically writes contract JSON files and updates manifest).
* `scripts/run-explorer.cjs`: MUST CHANGE (integrate export step prior to preview/server launch).
* `package.json`: MUST CHANGE (integrate export/provisioning step into build scripts).
* `.gitignore`: MAY CHANGE / REQUIRES CONFIRMATION (adjust gitignore patterns if static default fixtures are tracked).
* `explorer/src/context/ProjectContext.tsx`: REQUIRES CONFIRMATION (adjust runtime fallback resolution if required by implementation evidence).

### Implementation Questions

* What is the exact public output directory structure for exported project artifacts? `REQUIRES IMPLEMENTATION-TIME VALIDATION`
* What manifest update mechanism will be used during build? `REQUIRES IMPLEMENTATION-TIME VALIDATION`
* Which specific projects are exported during clean builds? `REQUIRES IMPLEMENTATION-TIME VALIDATION`

### Validation

* Direct browser deep-linking to `?project=cloud-spend-tracker` in a clean production build loads the 240-node dataset without HTTP 404 errors or fallback to default mock data.
* Canonical benchmark fixture SHA-256 digest remains `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`.

### Risks

* Accidental mutation or overwriting of source benchmark fixtures under `audit-fixtures/`.
* Breaking multi-project state isolation or project switching in `ProjectContext.tsx`.

---

## 4. Track B — 40px Contract

### Decision

`>= 40.0px` remains the strict semantic clearance contract.

### Proven Evidence

* Formal layout contract (`audit-reports/features/FEAT-LAYOUT-report-v2.md`) specifies minimum node clearance of `>= 40.0px`.
* Spatial hash grid collision cleanup in `explorer/src/lib/layout/spacing.ts` yields a raw calculated minimum clearance of `39.99905982905989px` on the canonical 240-node dataset due to sub-pixel floating-point arithmetic noise (a deficit of `0.00094017094011px`).
* Automated regression test suites (`Phase6B_LocalityCompaction.test.ts`) currently enforce `expect(clearance).toBeGreaterThanOrEqual(39.99)`.

### Required Outcome

Reconcile the sub-pixel floating-point calculation discrepancy with the formal `>= 40.0px` contract without relaxing the contractual specification to `>= 39.99px`.

### Change Surface

* `explorer/src/lib/layout/spacing.ts`: MUST CHANGE (adjust spatial grid shift steps or placement padding).
* `explorer/src/lib/layout/metrics.ts`: MUST CHANGE (apply sub-pixel precision normalization / epsilon handling in `minimumNodeClearance`).
* `explorer/src/lib/layout/Phase6B_LocalityCompaction.test.ts` (and related test files): MAY CHANGE / REQUIRES CONFIRMATION (update test assertions from `39.99` to `40.0` once floating-point noise is handled).

### Implementation Questions

* Is the discrepancy best addressed via calculation step adjustments, placement padding, measurement precision normalization, or epsilon handling? `REQUIRES IMPLEMENTATION-TIME VALIDATION`
* What specific floating-point precision strategy best preserves coordinate determinism? `REQUIRES IMPLEMENTATION-TIME VALIDATION` (No numeric epsilon is declared authoritative during planning).

### Validation

* Raw measured minimum node clearance evaluates to `>= 40.0px` across all benchmark fixtures.
* Primary-primary and primary-satellite node overlap counts remain strictly `0`.
* $0.00000\text{ px}$ coordinate drift across 10x executions and 5x input permutations.

### Risks

* Introducing unintended node position shifts that increase primary edge crossings ($C_{pp}$).
* Creating satellite or primary node overlaps during collision cleanup.

---

## 5. Track C — Locality

### Decision

The historical global `medianIntra < medianInter` criterion is not the governing criterion for the current multi-row 2D layout; planning proceeds toward a layer-aware locality criterion.

### Proven Evidence

* The global locality metric in `explorer/src/lib/layout/metrics.ts` (`calculateFeatureLocalityDiagnostics`) measures global `medianIntra` (`1,101.68px`) vs global `medianInter` (`1,020.00px`), resulting in `1,101.68px > 1,020.00px` (`isIntraShorterThanInter = false`).
* Geometric analysis proves this is a metric artifact of the 4-layer vertical Y hierarchy ($Y_{\text{presentation}} < Y_{\text{application}} < Y_{\text{domain}} < Y_{\text{schema}}$ spanning ~1,100px) vs 2D horizontal adjacent band packing (~1,020px). Within the same architectural layer, same-feature distance (~214.35px) is 33.1% shorter than cross-feature distance (~320.50px).

### Required Outcome

Introduce layer-aware locality evaluation metrics that accurately reflect the 2D multi-row spatial layout model without altering Stage 0–12 primary layout geometry or Cytoscape canvas rendering.

### Change Surface

* `explorer/src/lib/layout/metrics.ts`: MUST CHANGE (update `calculateFeatureLocalityDiagnostics` to compute layer-aware / same-layer intra vs inter feature edge length metrics).
* `explorer/src/lib/layout/evaluate-layout.ts`: MUST CHANGE (expose layer-aware diagnostic fields in `EvaluatedLayoutMetrics`).
* `scripts/test-architecture-quality-gates.cjs`: MAY CHANGE / REQUIRES CONFIRMATION (update change gate assertions for 2D multi-row layouts).
* `explorer/src/test/Phase5DAcceptance.test.ts`: MAY CHANGE / REQUIRES CONFIRMATION (update test assertions to validate layer-aware locality metrics).

### Implementation Questions

* What candidate dimensions (same-layer relationships, cross-layer relationships, feature membership, layer distance, comparable geometric regions) provide the most robust diagnostic signal? `REQUIRES IMPLEMENTATION-TIME VALIDATION`
* What specific pass/fail threshold should be established from benchmark behavior? `REQUIRES IMPLEMENTATION-TIME VALIDATION`

### Validation

* Layer-aware locality diagnostic metrics accurately report same-layer feature cohesion (`medianIntraSameLayer < medianInterSameLayer`).
* Primary-primary edge crossings ($C_{pp}$) remain $\le 8,704$ (passing the mandatory $C_{pp} < 9,335$ gate).
* Zero layer flow violations ($Y_{\text{presentation}} < Y_{\text{application}} < Y_{\text{domain}} < Y_{\text{schema}}$).

### Risks

* Accidental modification or distortion of primary layout engine geometry (`architecture-layout.ts`) to satisfy global metrics.
* Introducing nondeterminism or performance degradation into diagnostic metric evaluation.

---

## 6. Cross-Track Dependencies

| Dependency | Dependent Tracks | Risk Analysis | Safe Boundary |
|---|---|---|---|
| `explorer/src/types/explorer.ts` | Tracks A, B, C | Shared TypeScript interfaces for project metadata, positions, and layout metrics. | Ensure all type additions preserve backward compatibility. |
| `explorer/src/lib/layout/metrics.ts` | Tracks B, C | Contains both `minimumNodeClearance` (Track B) and `calculateFeatureLocalityDiagnostics` (Track C). | Maintain strict modular isolation between clearance and locality functions. |
| `explorer/src/lib/layout/evaluate-layout.ts` | Tracks B, C | Aggregates all layout metrics for test assertions and change gates. | Ensure self-auditing crossing equation ($C_{\text{total}} \equiv C_{pp} + C_{pb} + C_{bb} + C_{ps} + C_{ss}$) remains enforced. |
| `explorer/src/lib/architecture-layout.ts` | Tracks B, C | Core 13-stage layout orchestrator. | Must NOT change layout geometry for Track C locality diagnostics; only Stage 11 spacing mechanics for Track B if required. |

---

## 7. Reconciled Implementation Sequence

| Step | Track | Objective | Preconditions | Validation | Uncertainty |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **Track A** | Configure build/export scripts (`export-explorer.cjs`, `run-explorer.cjs`, `package.json`) to provision project artifacts to static public asset locations. | Clean repository checkout; verified source fixtures in `audit-fixtures/`. | Direct URL loading of `?project=cloud-spend-tracker` returns 240-node graph without HTTP 404. | Exact manifest update mechanism and project export scope `TBD`. |
| **2** | **Track B** | Reconcile sub-pixel floating-point clearance calculation noise (`39.99905982905989px`) with formal `>= 40.0px` requirement in `spacing.ts` / `metrics.ts`. | Track A build pipeline verified; baseline metrics established. | `minimumNodeClearance` evaluates to `>= 40.0px`; 0 overlaps; $0.00000\text{ px}$ determinism. | Specific floating-point precision / padding strategy `TBD`. |
| **3** | **Track C** | Implement layer-aware / same-layer locality diagnostic metrics in `metrics.ts` and `evaluate-layout.ts`. | Track B clearance reconciliation complete; Candidate E geometry preserved. | Diagnostic metrics confirm `medianIntraSameLayer < medianInterSameLayer`; $C_{pp} \le 8,704$. | Final metric formula and pass/fail threshold `TBD`. |
| **4** | **Integration** | Execute full pipeline regression verification across CLI change gates, Vitest suites, and multi-project state isolation. | Steps 1, 2, and 3 complete. | All CLI tests pass (`npm run test:cli`); Vitest suites pass; zero coordinate drift. | None. |

---

## 8. Regression Boundaries

1. **Canonical Fixture Integrity**: `audit-fixtures/cloud-spend-tracker/explorer-data.json` SHA-256 digest must strictly remain `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`.
2. **Graph Topology & Identity**: Node count (240) and edge count (1,024) on Cloud Spend Tracker fixture must remain exact. Zero orphaned or cloned nodes.
3. **Position Authority**: Strict 5-level Position Authority hierarchy (`position-policy.ts`) must be preserved (Level 1 Session Drag > Level 2 Persisted State > Level 3 Canvas Position > Level 4 Architecture Layout > Level 5 Deterministic Fallback).
4. **Renderer Behavior**: Cytoscape canvas panning, zooming, selection, and filtering operations must trigger 0 layout calls (`cy.layout()`).
5. **Deterministic Coordinates**: Node coordinates must preserve $0.00000\text{ px}$ 10x execution and 5x input permutation determinism.
6. **Zero-Overlap Invariants**: Primary-primary and primary-satellite node overlap counts must remain strictly `0`.
7. **2D Multi-Row Geometry**: 4-layer vertical Y hierarchy ($Y_{\text{presentation}} < Y_{\text{application}} < Y_{\text{domain}} < Y_{\text{schema}}$) and 2D feature band packing must be preserved.
8. **Historical Report Immutability**: No historical audit reports under `audit-reports/` or root Markdown records may be retroactively modified.

---

## 9. Unresolved Implementation Questions

1. **Track A**: What is the exact public manifest entry format and fallback priority order when loading project metadata in `ProjectContext.tsx`?
2. **Track B**: Is sub-pixel floating-point clearance reconciliation best achieved via calculation step precision adjustment in `spacing.ts` or epsilon normalization in `metrics.ts`?
3. **Track C**: What exact mathematical formula and pass/fail numerical threshold should be established for layer-aware locality after evaluating benchmark behavior?

---

## 10. Final Change-Surface Matrix

| Area | Track | MUST CHANGE | MAY CHANGE | REQUIRES CONFIRMATION | MUST NOT CHANGE |
| ---- | ----- | ----------- | ---------- | --------------------- | --------------- |
| **Build & Export Tooling** | **Track A** | `scripts/export-explorer.cjs`, `scripts/run-explorer.cjs`, `package.json` | `.gitignore` | `explorer/src/context/ProjectContext.tsx` | `audit-fixtures/cloud-spend-tracker/explorer-data.json`, `dependency-analyzer.cjs` |
| **Clearance Mechanics** | **Track B** | `explorer/src/lib/layout/spacing.ts`, `explorer/src/lib/layout/metrics.ts` | `explorer/src/lib/layout/Phase6B_LocalityCompaction.test.ts` | None | `audit-reports/features/FEAT-LAYOUT-report-v2.md`, `position-policy.ts`, `GraphView.tsx` |
| **Locality Diagnostics** | **Track C** | `explorer/src/lib/layout/metrics.ts`, `explorer/src/lib/layout/evaluate-layout.ts` | `scripts/test-architecture-quality-gates.cjs`, `Phase5DAcceptance.test.ts` | None | `explorer/src/lib/architecture-layout.ts`, `global-layout.ts`, historical audit reports |

---

## 11. Implementation Authorization

```text
PLANNING RECONCILED — IMPLEMENTATION NOT PERFORMED
```
