# PHASE 17A — CHANGE SURFACE & REGRESSION BOUNDARY

## 1. Purpose

This document provides an independent analysis of the repository to establish the **smallest safe change surface** and the **regression boundaries** for three already-decided remediation tracks:

* **Track A — Production Provisioning**: Generated build/export production fixture provisioning.
* **Track B — 40px Contract**: `>= 40.0px` semantic clearance contract with numerical tolerance handled separately.
* **Track C — Locality**: Layer-aware locality evaluation for the current multi-row 2D layout.

This is an analysis-only task. No production code, test suites, build scripts, routing logic, fixtures, or layout algorithms have been modified.

---

## 2. Executive Findings

1. **Track A (Production Provisioning)**:
   * Current runtime project loading in `ProjectContext.tsx` attempts to fetch project-scoped datasets from `/projects/${projectId}/explorer-data.json`.
   * In a clean repository checkout, `explorer/public/projects/*` is gitignored (`.gitignore` line 9) and absent on disk, causing browser runtime requests for `?project=cloud-spend-tracker` to fail (HTTP 404) and fall back to the 4-node default fixture (`/explorer-data.json`).
   * Browser acceptance tests (Playwright) succeed because test scripts manually copy `audit-fixtures/cloud-spend-tracker/explorer-data.json` into `explorer/public/projects/cloud-spend-tracker/explorer-data.json` prior to starting Vite.
   * The smallest safe change surface for Track A encompasses build/export scripts (`scripts/export-explorer.cjs`, `scripts/run-explorer.cjs`, and `package.json` build scripts) to emit and copy generated project contract JSON files into `explorer/public/projects/` during build/export execution.

2. **Track B (40px Contract)**:
   * The formal requirement remains strictly `>= 40.0px` (`audit-reports/features/FEAT-LAYOUT-report-v2.md`).
   * Spatial hash grid collision cleanup in `explorer/src/lib/layout/spacing.ts` yields a raw calculated minimum clearance of `39.99905982905989px` on the canonical 240-node Cloud Spend Tracker dataset due to sub-pixel floating-point arithmetic noise (a deficit of `0.00094017094011px`).
   * Automated tests currently enforce `expect(clearance).toBeGreaterThanOrEqual(39.99)`.
   * Preserving `>= 40.0px` as the semantic requirement requires applying sub-pixel precision normalization / epsilon rounding in `minimumNodeClearance` (`metrics.ts`) and/or adjusting step shifts in `spacing.ts`, while leaving formal specifications and assertions locked at `>= 40.0px`.

3. **Track C (Locality)**:
   * The global locality metric in `explorer/src/lib/layout/metrics.ts` (`calculateFeatureLocalityDiagnostics`) compares global median intra-feature edge length (`1,101.68px`) against global median inter-feature edge length (`1,020.00px`), resulting in `1,101.68px > 1,020.00px` (`isIntraShorterThanInter = false`).
   * Forensic geometry analysis proves this is a metric artifact of the 4-layer vertical Y hierarchy ($Y_{\text{presentation}} < Y_{\text{application}} < Y_{\text{domain}} < Y_{\text{schema}}$ spanning ~1,100px) vs 2D horizontal adjacent band packing (~1,020px). Within the same architectural layer, intra-feature edge distance (~214.35px) is 33.1% shorter than inter-feature edge distance (~320.50px).
   * The change surface for Track C is strictly confined to the diagnostic metrics layer (`metrics.ts` and `evaluate-layout.ts`), introducing same-layer / layer-filtered locality metrics (`medianIntraSameLayer`, `medianInterSameLayer`) without modifying Stage 0–12 layout geometry or Cytoscape canvas rendering.

---

## 3. Track A — Production Provisioning

### Dependency Trace

```text
source data (force-app/main/default or audit-fixtures/)
  └─> export/build (dependency-analyzer.cjs & scripts/export-explorer.cjs)
        └─> artifact (analyze/projects/<id>/ & explorer/public/projects/<id>/)
              └─> runtime resolution (ProjectContext.tsx fetching /project-manifest.json & /projects/<id>/explorer-data.json)
                    └─> project loading (Zod schema validation via explorer-contract.ts)
                          └─> renderer (GraphView.tsx Cytoscape canvas)
```

### Change Surface

* `scripts/export-explorer.cjs`: CLI export adapter generating project JSON artifacts and manifest entries.
* `scripts/run-explorer.cjs`: Wrapper script orchestrating analysis, export, and preview/server launching.
* `package.json` / `explorer/package.json`: Root and frontend build scripts (`explorer:build`, `build`).
* `.gitignore`: Git ignore patterns governing `explorer/public/projects/*`.

### Must Change

* `scripts/export-explorer.cjs`: Ensure project export routine deterministically writes contract JSON files to `explorer/public/projects/<project-id>/explorer-data.json` and updates `explorer/public/project-manifest.json`.
* `scripts/run-explorer.cjs` / `package.json`: Integrate fixture generation/copying into standard `build` and `preview` scripts so clean repository builds provision production fixtures.

### May Change

* `.gitignore`: Relax or narrow gitignore rules if specific benchmark project manifests or static default fixtures are tracked in source control.
* `explorer/src/context/ProjectContext.tsx`: Fallback resolution logic when `project-manifest.json` or project data URLs are loaded at runtime.

### Must Not Change

* `audit-fixtures/cloud-spend-tracker/explorer-data.json`: Canonical benchmark dataset (SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`). Must remain 100% bit-for-bit immutable.
* `dependency-analyzer.cjs`: Core static analysis engine.
* `explorer/src/components/GraphView.tsx`: Cytoscape renderer component.
* `explorer/src/lib/position-policy.ts`: 5-level Position Authority hierarchy.

### Regression Boundaries

* **Project Loading**: Switching active projects must trigger clean `explorer:project-changed` window events, resetting active selections while maintaining isolated project UI state.
* **Deep Links**: Direct URL navigation (`?project=cloud-spend-tracker`) must resolve the correct project dataset without HTTP 404 errors or fallback to default 4-node mock data.
* **Fixture Hash Integrity**: Canonical fixture SHA-256 hash must remain `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`.

---

## 4. Track B — 40px Contract

### Dependency Trace

```text
layout calculation (computeArchitectureLayout in architecture-layout.ts)
  └─> Stage 11 spacing & collision cleanup (resolveSpacingAndCollisions in spacing.ts)
        └─> sub-pixel floating-point operations (Math.sqrt & spatial hash shifts)
              └─> clearance evaluation (minimumNodeClearance in metrics.ts)
                    └─> metric aggregation (evaluateLayout in evaluate-layout.ts)
                          └─> test assertion boundary (Phase6B_LocalityCompaction.test.ts)
```

### Change Surface

* `explorer/src/lib/layout/spacing.ts`: Spatial hash grid collision cleanup and iterative node shift logic.
* `explorer/src/lib/layout/metrics.ts`: `minimumNodeClearance` measurement function.
* `explorer/src/lib/layout/evaluate-layout.ts`: `evaluateLayout` metric aggregator.
* `explorer/src/lib/layout/Phase6B_LocalityCompaction.test.ts` (and related layout test files): Test assertion specifications.

### Must Change

* `explorer/src/lib/layout/spacing.ts`: Ensure spatial hash shift steps enforce physical node clearance $\ge 40.0\text{px} + \epsilon$ during coordinate placement.
* `explorer/src/lib/layout/metrics.ts`: Apply sub-pixel epsilon rounding/normalization in `minimumNodeClearance` so floating-point arithmetic noise (e.g. `39.99905982905989px`) evaluates cleanly to `>= 40.0px`.

### May Change

* `explorer/src/lib/layout/Phase6B_LocalityCompaction.test.ts` / `Phase5DAcceptance.test.ts`: Update test assertions from `toBeGreaterThanOrEqual(39.99)` to `toBeGreaterThanOrEqual(40.0)` once sub-pixel floating-point noise is handled.

### Must Not Change

* `audit-reports/features/FEAT-LAYOUT-report-v2.md`: Formal specification requiring `>= 40.0px` MUST remain unchanged. Do NOT relax specification to `>= 39.99px`.
* `explorer/src/lib/position-policy.ts`: Position Authority rules.
* `explorer/src/components/GraphView.tsx`: Renderer canvas component.

### Regression Boundaries

* **Semantic 40px Contract**: The formal contractual clearance requirement remains `>= 40.0px`.
* **Zero Overlaps**: Primary-primary and primary-satellite node overlap counts must strictly remain `0`.
* **Determinism**: Node coordinate output must preserve $0.00000\text{ px}$ 10x execution and 5x input permutation determinism.

---

## 5. Track C — Locality

### Dependency Trace

```text
layout stage execution (Stages 5-12 in architecture-layout.ts)
  └─> calculated node positions (PositionMap)
        └─> diagnostic evaluation (calculateFeatureLocalityDiagnostics in metrics.ts)
              └─> metric evaluation wrapper (evaluateLayout in evaluate-layout.ts)
                    └─> quality gate & test assertions (test-architecture-quality-gates.cjs)
```

### Change Surface

* `explorer/src/lib/layout/metrics.ts`: `calculateFeatureLocalityDiagnostics` diagnostic calculation.
* `explorer/src/lib/layout/evaluate-layout.ts`: `EvaluatedLayoutMetrics` interface and metric evaluation.
* `scripts/test-architecture-quality-gates.cjs` / `architecture-quality-gates.cjs`: Architecture change gate checking.
* `explorer/src/test/Phase5DAcceptance.test.ts` / `Phase6B_LocalityCompaction.test.ts`: Test assertion files.

### Must Change

* `explorer/src/lib/layout/metrics.ts`: Update `calculateFeatureLocalityDiagnostics` to compute layer-aware / same-layer intra vs inter feature edge length metrics (`medianIntraSameLayer`, `medianInterSameLayer`, `isIntraSameLayerShorterThanInter`).
* `explorer/src/lib/layout/evaluate-layout.ts`: Expose layer-aware diagnostic fields in `EvaluatedLayoutMetrics`.

### May Change

* `scripts/test-architecture-quality-gates.cjs`: Update quality gate assertions to evaluate layer-aware locality metrics for 2D multi-row layouts.
* `explorer/src/test/Phase5DAcceptance.test.ts`: Update test assertions to validate layer-aware locality metrics.

### Must Not Change

* `explorer/src/lib/architecture-layout.ts`: Stage 0–12 primary layout geometry generation MUST NOT be modified or distorted to satisfy naive global locality.
* `explorer/src/lib/layout/global-layout.ts`: Feature band geometry and layer Y offsets must remain intact.
* Historical audit reports (`HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md`, etc.): Historical records must remain untouched.

### Regression Boundaries

* **2D Multi-Row Geometry**: 2D feature band layout structure and layer hierarchy ($Y_{\text{presentation}} < Y_{\text{application}} < Y_{\text{domain}} < Y_{\text{schema}}$) must be preserved.
* **Primary Crossings**: Primary-primary crossings ($C_{pp}$) must remain $\le 8,704$ (passing the $C_{pp} < 9,335$ gate).
* **Deterministic Metrics**: Diagnostic metrics must produce 100% deterministic outputs.

---

## 6. Shared Dependencies

| Shared Component | Dependent Tracks | Risk of Inter-Track Interference | Dependency Type | Potential Regression |
|---|---|---|---|---|
| `explorer/src/types/explorer.ts` | Tracks A, B, C | Low (type definitions for nodes, edges, positions, metrics) | Proven | TypeScript build failure if interfaces break. |
| `explorer/src/lib/layout/metrics.ts` | Tracks B, C | Low (clearance and locality are separate pure functions) | Proven | Erroneous calculations if shared geometric helpers are altered. |
| `explorer/src/lib/layout/evaluate-layout.ts` | Tracks B, C | Low (evaluates clearance and locality independently) | Proven | Metric aggregation mismatches or self-auditing assertion failures. |
| `explorer-contract.ts` / `ExplorerDataSchemaZ` | Track A (schema validation) | Low | Proven | Runtime Zod schema parse rejection on project load. |
| `explorer/src/lib/architecture-layout.ts` | Tracks B, C | High (executes Stage 11 spacing and Stage 12 layout) | Proven | Coordinate drift, primary node overlaps, layer order violations. |

---

## 7. Golden / Snapshot Risk

| Artifact / Snapshot Category | Risk Assessment | Expected Status | Action Required |
|---|---|---|---|
| **Canonical Fixture Hashes** (`audit-fixtures/cloud-spend-tracker/explorer-data.json`) | Protected by governance (`P0-FIX-01`). SHA-256 `feeb68f3...` | MUST REMAIN IDENTICAL | Do NOT regenerate or touch. |
| **Coordinate Snapshots** (Stage 12 Candidate E positions) | Critical position authority invariant. | EXPECTED TO REMAIN IDENTICAL | Preserve $0.00000\text{ px}$ drift. |
| **Serialized Graph Schema** (`explorer-data.json` version `1.0.0`) | Schema version stability. | EXPECTED TO REMAIN IDENTICAL | Do NOT modify schema. |
| **Test Fixtures** (`audit-fixtures/*`) | Read-only benchmark fixtures. | MUST REMAIN IDENTICAL | Do NOT regenerate. |
| **Browser Acceptance Artifacts** (Playwright visual screenshots/videos) | Visual rendering baselines. | EXPECTED TO REMAIN IDENTICAL | Do NOT regenerate. |

---

## 8. Minimum Change Boundaries

* **Track A Boundary**: Build/export scripts (`scripts/export-explorer.cjs`, `scripts/run-explorer.cjs`, `package.json` build commands) and static public asset directory emission (`explorer/public/projects/`). Ensures exported project JSON files are provisioned during build without touching runtime React renderer logic or backend analyzer core.
* **Track B Boundary**: Spatial grid collision cleanup step calculation (`explorer/src/lib/layout/spacing.ts`) and measurement epsilon normalization (`explorer/src/lib/layout/metrics.ts`). Normalizes sub-pixel floating-point precision noise (`39.99905982905989px` $\to$ `40.0px`) without altering formal contractual specifications (`>= 40.0px`).
* **Track C Boundary**: Diagnostic metrics module (`explorer/src/lib/layout/metrics.ts` and `evaluate-layout.ts`). Introduces layer-aware diagnostic metrics (`medianIntraSameLayer`, `medianInterSameLayer`) without modifying primary layout geometry, stage orchestration, or Cytoscape rendering logic.

---

## 9. Conflicts Requiring Review

```text
CONFLICT REQUIRES REVIEW
```

* **Governance Gate vs Task Instruction Relationship**:
  * *Phase 16F Governance Result*: `PHASE16F_DECISION_CLOSURE_AND_AUTHORIZATION_GATE.md` recorded Decisions A, B, and C as `PENDING / UNRESOLVED — NO AUTHORITATIVE DECISION FOUND` because no human governance decision-maker had formally signed off on a decision input package.
  * *Phase 17A Task Context*: Phase 17A task instructions specify Tracks A, B, and C as "already-decided remediation tracks".
  * *Resolution / Boundary Statement*: This analysis establishes the exact safe change surfaces and regression boundaries for Tracks A, B, and C under the explicit assumption of these track definitions. Formal governance sign-off must be confirmed prior to executing any future implementation phase.

---

## 10. Final Change-Surface Matrix

| Area | Track | Must Change | May Change | Must Not Change | Evidence |
| ---- | ----- | ----------- | ---------- | --------------- | -------- |
| **Build & Export** | **Track A** | `scripts/export-explorer.cjs`, `scripts/run-explorer.cjs`, `package.json` | `.gitignore`, `explorer/src/context/ProjectContext.tsx` | `audit-fixtures/cloud-spend-tracker/explorer-data.json`, `dependency-analyzer.cjs` | `ProjectContext.tsx:112`, `export-explorer.cjs:14` |
| **Clearance Math** | **Track B** | `explorer/src/lib/layout/spacing.ts`, `explorer/src/lib/layout/metrics.ts` | `explorer/src/lib/layout/Phase6B_LocalityCompaction.test.ts` | `FEAT-LAYOUT-report-v2.md`, `position-policy.ts`, `GraphView.tsx` | `metrics.ts:402`, `spacing.ts:182`, `FEAT-LAYOUT-report-v2.md:45` |
| **Locality Diagnostics** | **Track C** | `explorer/src/lib/layout/metrics.ts`, `explorer/src/lib/layout/evaluate-layout.ts` | `scripts/test-architecture-quality-gates.cjs`, `Phase5DAcceptance.test.ts` | `architecture-layout.ts`, `global-layout.ts`, historical audit reports | `metrics.ts:742`, `evaluate-layout.ts:280`, `FEAT-LAYOUT-report-v2.md:112` |

---

## 11. Final Status

```text
CHANGE SURFACE ANALYZED — IMPLEMENTATION NOT PERFORMED
```
