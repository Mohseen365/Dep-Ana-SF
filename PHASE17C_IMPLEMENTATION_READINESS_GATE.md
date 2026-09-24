# PHASE 17C — IMPLEMENTATION READINESS GATE

## 1. Purpose

This document establishes the formal **implementation readiness gate evaluation** for the Salesforce Architecture Explorer repository, synthesizing the change-surface analysis from Phase 17A (`PHASE17A_CHANGE_SURFACE_AND_REGRESSION_BOUNDARY.md`) and the reconciled remediation plan from Phase 17B (`PHASE17B_RECONCILED_REMEDIATION_PLAN.md`).

The objective is to determine whether the repository has sufficient evidence, bounded change surfaces, and well-defined validation boundaries to authorize controlled remediation across Tracks A, B, and C.

This is a **readiness assessment only**. No production code, test suites, build configurations, routing logic, fixtures, layout algorithms, historical reports, or `AGENT.md` files have been modified.

---

## 2. Governing Planning Decisions

The readiness assessment is governed by the project-level engineering decisions established for planning in Phase 17B:

1. **Track A (Production Provisioning)**: Production project data should be provisioned through the generated build/export artifact pipeline (`export-explorer.cjs`, `run-explorer.cjs`, `package.json`).
2. **Track B (40px Clearance Contract)**: The semantic clearance requirement remains strictly `>= 40.0px` (`FEAT-LAYOUT-report-v2.md`). The numerical reconciliation mechanism is an implementation-time decision.
3. **Track C (Locality Evaluation)**: The historical global `medianIntra < medianInter` criterion is not governing for the current multi-row 2D layout. Planning proceeds toward layer-aware locality evaluation.

*Note*: These engineering directions guide technical readiness and do not claim external governance authority approvals.

---

## 3. Track A Readiness

### Verification Items

* **Current export mechanism**: CLI export adapter `scripts/export-explorer.cjs` deterministically transforms analyzer output into contract JSON schema `1.0.0`. `READY`
* **Current runtime loading path**: `ProjectContext.tsx` resolves project data URLs (`/projects/${projectId}/explorer-data.json`). `READY`
* **Production artifact boundary**: Build scripts (`run-explorer.cjs`, `package.json`) and static public asset output directory (`explorer/public/projects/`). `READY WITH IMPLEMENTATION-TIME VALIDATION`
* **Confirmed change surface**: `scripts/export-explorer.cjs`, `scripts/run-explorer.cjs`, `package.json` (MUST CHANGE); `.gitignore`, `ProjectContext.tsx` (MAY CHANGE / REQUIRES CONFIRMATION). `READY`
* **Clean-build validation method**: Direct browser deep-linking (`?project=cloud-spend-tracker`) loading the 240-node graph without HTTP 404 in clean production builds. `READY WITH IMPLEMENTATION-TIME VALIDATION`
* **Canonical fixture protection**: `audit-fixtures/cloud-spend-tracker/explorer-data.json` SHA-256 digest `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` locked and protected. `READY`

### Track Classification

`READY WITH IMPLEMENTATION-TIME VALIDATION`

---

## 4. Track B Readiness

### Verification Items

* **Formal 40px contract**: Formal requirement specified as `>= 40.0px` in `FEAT-LAYOUT-report-v2.md`. `READY`
* **Current 39.99 test behavior**: Automated test assertions in `Phase6B_LocalityCompaction.test.ts` enforce `expect(clearance).toBeGreaterThanOrEqual(39.99)`. `READY`
* **Raw measured discrepancy**: Measured raw minimum clearance on Candidate E Cloud Spend Tracker is `39.99905982905989px` (a sub-pixel arithmetic noise deficit of `0.00094017094011px`). `READY`
* **Relevant calculation path**: Stage 11 spatial hash grid collision cleanup in `spacing.ts` and `minimumNodeClearance` measurement in `metrics.ts`. `READY`
* **Confirmed change surface**: `explorer/src/lib/layout/spacing.ts`, `explorer/src/lib/layout/metrics.ts` (MUST CHANGE); test assertions (MAY CHANGE / REQUIRES CONFIRMATION). `READY`
* **Regression invariants**: $0.00000\text{ px}$ coordinate drift, zero primary/satellite node overlaps, exact 13-stage pipeline execution. `READY`

### Mechanism Neutrality

The implementation mechanism remains strictly open. The readiness assessment does NOT choose between calculation step precision adjustment, placement padding, measurement epsilon normalization, or another evidence-supported strategy.

### Track Classification

`READY WITH IMPLEMENTATION-TIME VALIDATION`

---

## 5. Track C Readiness

### Verification Items

* **Current locality calculation**: `calculateFeatureLocalityDiagnostics` in `metrics.ts` evaluating global median intra-feature vs inter-feature edge lengths. `READY`
* **Evidence explaining global metric failure**: Global `medianIntra` (`1,101.68px`) > `medianInter` (`1,020.00px`) is proven to be an artifact of 4-layer vertical Y hierarchy (~1,100px vertical span) vs adjacent 2D horizontal band packing (~1,020px). Same-layer intra-feature distance (~214.35px) is 33.1% shorter than cross-feature distance (~320.50px). `READY`
* **Available layer metadata**: `classifyNodeLayer(node)` in `layers.ts`, `node.layer`, `layerYOffsets`, and feature cluster assignments in `features.ts`. `READY`
* **Confirmed diagnostic change surface**: `explorer/src/lib/layout/metrics.ts`, `explorer/src/lib/layout/evaluate-layout.ts` (MUST CHANGE); `scripts/test-architecture-quality-gates.cjs` (MAY CHANGE / REQUIRES CONFIRMATION). `READY`
* **Existing benchmark datasets**: Canonical 240-node Cloud Spend Tracker dataset and synthetic scale benchmarks. `READY`
* **Regression boundaries**: Stage 0–12 primary layout geometry (`architecture-layout.ts`) and Cytoscape canvas renderer MUST NOT be altered or distorted. `READY`

### Formula & Threshold Neutrality

The final locality formula and numerical pass/fail threshold remain unresolved and will be established during implementation from benchmark diagnostic evidence before introducing assertions. Diagnostic implementation can proceed cleanly without prematurely declaring these values.

### Track Classification

`READY WITH IMPLEMENTATION-TIME VALIDATION`

---

## 6. Cross-Track Dependency Verification

Tracks A, B, and C are **independently implementable tracks**. No sequential execution coupling (`A → B → C`) is required by repository evidence.

```text
                 ┌── Track A (Build & Export Provisioning) ──┐
                 │                                           │
Start ───────────┼── Track B (Clearance Reconciliation) ─────┼── Integration Verification
                 │                                           │
                 └── Track C (Layer-Aware Locality) ─────────┘
```

### Dependency Audit Matrix

| Dependency Claim | Evidence | Proven / Inferred | Required Sequential Coupling? |
|---|---|---|---|
| **Track B depends on Track A** | Track A modifies build scripts; Track B modifies layout math in `spacing.ts`/`metrics.ts`. | Inferred | **NO** — Track B layout math executes independently of public asset provisioning. |
| **Track C depends on Track B** | Track B affects clearance in `spacing.ts`; Track C adds diagnostic metrics in `metrics.ts`. | Inferred | **NO** — Track C locality diagnostics are pure measurement functions on `PositionMap`. |
| **Tracks A, B, C share `types/explorer.ts`** | Shared interface definitions for node positions, metadata, and metric types. | **Proven** | **NO** — Interface additions preserve backward compatibility and do not block parallel track work. |

*Conclusion*: Inferred sequential dependencies are removed. Tracks A, B, and C may be implemented independently or in parallel.

---

## 7. Implementation Boundaries

### Track A — Production Provisioning

* **Authorized Implementation Surface**: `scripts/export-explorer.cjs`, `scripts/run-explorer.cjs`, `package.json`.
* **Protected Surface**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`, `dependency-analyzer.cjs`, `GraphView.tsx`, `position-policy.ts`.
* **Implementation-Time Decisions**: Exact public output directory, manifest entry structure, specific projects exported during build.
* **Governance Decisions**: Altering source fixture SHA-256 hashes or changing the core analyzer schema version.

### Track B — 40px Clearance Contract

* **Authorized Implementation Surface**: `explorer/src/lib/layout/spacing.ts`, `explorer/src/lib/layout/metrics.ts`, `Phase6B_LocalityCompaction.test.ts`.
* **Protected Surface**: `FEAT-LAYOUT-report-v2.md` (formal requirement remains `>= 40.0px`), `position-policy.ts`, `GraphView.tsx`.
* **Implementation-Time Decisions**: Selecting the specific sub-pixel floating-point precision, step adjustment, padding, or epsilon normalization strategy.
* **Governance Decisions**: Weakening or relaxing the formal clearance specification to `>= 39.99px`.

### Track C — Locality Evaluation

* **Authorized Implementation Surface**: `explorer/src/lib/layout/metrics.ts`, `explorer/src/lib/layout/evaluate-layout.ts`, `scripts/test-architecture-quality-gates.cjs`.
* **Protected Surface**: `explorer/src/lib/architecture-layout.ts` (Stage 0–12 geometry generation), `global-layout.ts`, historical audit reports under `audit-reports/`.
* **Implementation-Time Decisions**: Selecting candidate diagnostic dimensions (same-layer vs cross-layer distances) and establishing baseline metric numbers from benchmark execution.
* **Governance Decisions**: Modifying primary layout geometry or altering historical report records.

---

## 8. Readiness Matrix

| Track | Scope Defined | Change Surface Defined | Validation Defined | Remaining TBDs Safe? | Readiness Classification |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Track A** | Yes | Yes | Yes | Yes | `READY WITH IMPLEMENTATION-TIME VALIDATION` |
| **Track B** | Yes | Yes | Yes | Yes | `READY WITH IMPLEMENTATION-TIME VALIDATION` |
| **Track C** | Yes | Yes | Yes | Yes | `READY WITH IMPLEMENTATION-TIME VALIDATION` |

---

## 9. Global Gate

### Gate Evaluation Rules

* If any track is `BLOCKED` $\longrightarrow$ `IMPLEMENTATION READINESS BLOCKED`
* If all tracks are `READY` or `READY WITH IMPLEMENTATION-TIME VALIDATION` $\longrightarrow$ `IMPLEMENTATION READY — CONTROLLED REMEDIATION MAY BEGIN`

### Global Gate Result

```text
IMPLEMENTATION READY — CONTROLLED REMEDIATION MAY BEGIN
```

*Scope Constraint*: This gate authorization does NOT permit unrestricted codebase modifications. Remediation may begin ONLY within the documented authorized change surfaces, respecting all protected surfaces, prohibitions, and regression boundaries.

---

## 10. First-Implementation Safety Rules

The implementation agent executing subsequent remediation work must strictly adhere to the following safety rules:

> **The implementation agent must work on one track at a time, preserve all regression boundaries, and stop when an implementation-time TBD cannot be resolved from repository evidence.**

### Strict Prohibitions for Implementation Agents

1. **NO Invented Architecture**: Do not invent new server architectures, backend APIs, or routing frameworks.
2. **NO Invented Thresholds**: Do not invent arbitrary numeric pass/fail thresholds without empirical benchmark evidence.
3. **NO Invented Formulas**: Do not invent unverified locality formulas.
4. **NO Contract Weakening**: Do not weaken formal contractual requirements (e.g. relaxing `>= 40.0px` to `>= 39.99px`).
5. **NO Unauthorized Governance**: Do not attempt to overwrite repository governance records or rewrite historical audit reports.

---

## 11. Final Status

```text
IMPLEMENTATION READY — CONTROLLED REMEDIATION MAY BEGIN
```
