# PHASE 17 — REMEDIATION PLAN

## 1. Executive Summary

Phase 17 establishes the definitive, non-destructive remediation plan for the three core operational tracks identified in the Phase 15/16 forensic series:
* **Track A — Production Fixture Provisioning**: Resolving clean deep-link `404` errors by formalizing the build artifact boundary (`source data → build/export → production artifact → runtime`) without depending on test-harness pre-population or raw source folder un-ignoring.
* **Track B — 40px Acceptance Contract**: Protecting the strict semantic requirement `>= 40.0px` in spatial placement calculations while introducing an explicit, bounded numerical validation tolerance ($\epsilon = 1\text{e-}3\text{ px}$) to handle sub-pixel floating-point noise without diluting the contract.
* **Track C — Locality Criterion**: Replacing the obsolete 1D global criterion (`medianIntra < medianInter`) with a layer-aware 2D locality evaluation framework that accounts for multi-row band packing and multi-layer vertical spans without prematurely inventing arbitrary thresholds.

This phase is **planning only**. No production code, test suites, dataset fixtures, build scripts, configuration files, or historical reports have been modified.

---

## 2. Governing Decisions

### 2.1 Production Provisioning
The system explicitly adopts a **generated build/export artifact** model for production provisioning. Raw source directories and test-harness fixtures must never be loaded directly by production runtime environments. Instead, analysis and export tools generate build artifacts into a defined distribution folder (`explorer/dist/` or `explorer/public/` during build time), establishing a deterministic pipeline:
$$\text{Source Data} \longrightarrow \text{Build/Export Engine} \longrightarrow \text{Production Artifact} \longrightarrow \text{Runtime Loading}$$

### 2.2 40px Contract
The governing semantic requirement remains strictly:
$$\text{Minimum Clearance} \ge 40.0\text{ px}$$
Numerical tolerances used by validation harnesses or floating-point comparison assertion helpers must NOT become the contractual requirement. `39.99px` is recognized as an artifact of sub-pixel floating-point arithmetic and grid-binning precision limits, not a redefined contractual standard.

### 2.3 Locality Criterion
The historical global metric:
$$\text{medianIntra} < \text{medianInter}$$
is formally declared obsolete for multi-row 2D layer-band layouts. Planning moves toward a **layer-aware locality criterion** that evaluates intra-feature vs inter-feature geometric proximity within comparable horizontal layer bands. Final numeric thresholds for the replacement metric remain unchosen and subject to empirical calibration.

---

## 3. Track A — Production Fixture Provisioning

### Current State
* **Source of Project Data**: Raw analysis artifacts reside in `audit-fixtures/cloud-spend-tracker/explorer-data.json` or `analyze/projects/<project-id>/`.
* **Existing Export Mechanism**: `scripts/export-explorer.cjs` reads analyzer outputs, normalizes schema formats, writes `explorer-data.json` and `project-metadata.json`, and attempts to copy outputs to `explorer/public/projects/<project-id>/`.
* **Runtime Loading Path**: `ProjectContext.tsx` calculates data URLs via `getProjectDataUrl(projectId)` returning `/projects/<project-id>/explorer-data.json`.
* **Root Cause of Deep-Link Failure**: In `.gitignore`, the entries `explorer/public/projects` and `analyze/projects` prevent generated project assets from being committed to source control. In a clean checkout, launching the app and navigating directly to `?project=cloud-spend-tracker` attempts to fetch `/projects/cloud-spend-tracker/explorer-data.json`. Because the directory does not exist on disk in a clean checkout, the HTTP request returns `404 Not Found`, forcing the app to fall back to the 4-node `/explorer-data.json` default.
* **Test Harness Coupling**: The Playwright test harness bypasses this in test environments by manually copying `audit-fixtures/cloud-spend-tracker/explorer-data.json` into `explorer/public/projects/cloud-spend-tracker/` prior to test execution.

### Target State
A clean separation between source inputs, build-time export processing, static web asset distribution, and runtime state resolution:
1. Canonical org datasets are defined as source inputs.
2. An automated build step (`npm run build` or `npm run explorer:build`) invokes the export adapter to process project sources into bundled static JSON distribution assets inside `explorer/dist/projects/` (and `explorer/public/projects/` for development).
3. The Vite build process packages all processed project distribution assets as static web production artifacts.
4. Production deep-links resolve static artifacts cleanly with zero test-harness intervention.

### Required Changes
* **Build Integration**: Update `package.json` build scripts (`npm run build`, `npm run explorer:build`) to execute a pre-build asset provisioning step (`node scripts/export-explorer.cjs --all-projects` or targeted export).
* **Export Adapter Enhancements**: Extend `scripts/export-explorer.cjs` to support batch processing of configured production project directories and ensure directory structure creation in `explorer/public/projects/` and `explorer/dist/projects/`.
* **Project Registry**: Maintain an authoritative project registry manifest (`project-manifest.json`) generated at build time that lists all available static project artifacts.
* **Runtime Resolution**: Update `explorer/src/context/ProjectContext.tsx` to handle missing projects gracefully with structured error boundaries rather than unhandled fetch failures.

### Validation
* Execute clean checkout build: `git clean -fdx -e node_modules` followed by `npm run build`.
* Verify artifact presence in `explorer/dist/projects/cloud-spend-tracker/explorer-data.json`.
* Launch production preview (`npm run preview`) and execute deep-link navigation to `http://localhost:4173/?project=cloud-spend-tracker`.
* Assert 240 nodes and 1,024 edges render correctly without test-harness copying scripts.

### Risks
* Increased production bundle/distribution size if large org fixtures are included indiscriminately.
* Build time inflation during Vite static asset compilation.

---

## 4. Track B — 40px Contract

### Current State
* **Requirement Definition**: Defined in `explorer/src/lib/layout/spacing.ts` (`minDistance = 40.0px` or `nodeWidth + 40`).
* **Enforcement Threshold**: Enforced in `Phase6B_LocalityCompaction.test.ts` line 111 as `expect(clearance).toBeGreaterThanOrEqual(39.99)`.
* **Origin of Sub-Pixel Discrepancy**: `minimumNodeClearance()` in `metrics.ts` measures exact Euclidean edge-to-edge clearance between bounding boxes:
$$\text{gap}_x = |x_2 - x_1| - \frac{w_1 + w_2}{2}, \quad \text{gap}_y = |y_2 - y_1| - \frac{h_1 + h_2}{2}$$
In `spacing.ts`, spatial hash grid binning and relative separation ratio axis projections use double-precision floating-point math ($64\text{-bit IEEE 754}$). Multi-pass overlap resolution divides separation vectors across iterative shifts, producing coordinate positions such as $x = 120.00000000000009$ or clearance values like $39.99905982905989\text{ px}$.
* **Current Conceptual Flaw**: The test assertion was adjusted to `39.99` to prevent false test failures, blurring the line between the semantic layout requirement and numerical precision.

### Target State
* **Semantic Contract**: The layout spacing engine (`spacing.ts`) strictly targets $\ge 40.0\text{ px}$ placement clearance.
* **Numerical Validation Tolerance**: A explicit, centralized tolerance constant (`CLEARANCE_TOLERANCE_EPSILON = 1e-3`) is defined in validation metrics (`metrics.ts`), separating physical placement intent from floating-point rounding noise.
* **Contract Integrity**: The contractual requirement is maintained as $40.0\text{ px}$. `39.99px` is never accepted as a contractual redefinition.

### Required Changes
* **Layout Engine Calibration**: Inspect `spacing.ts` separation vector application to ensure collision resolution steps add a micro-epsilon ($\epsilon_{\text{pad}} = 1\text{e-}4\text{ px}$) to discrete shift offsets, preventing truncation below $40.00000\text{ px}$.
* **Validation Metric Formalization**: Update `minimumNodeClearance` in `metrics.ts` to return both raw measured float value and formal boolean compliance against `CONTRACT_MIN_CLEARANCE = 40.0` with explicit float tolerance `EPSILON = 0.001`.
* **Test Suite Standardization**: Replace loose inline numeric literals (`39.99`) in `Phase6B_LocalityCompaction.test.ts` and related suites with explicit contractual assertions using the validation helper:
```typescript
const { rawClearance, isContractCompliant } = evaluateClearanceContract(positions);
expect(isContractCompliant).toBe(true);
expect(rawClearance + CLEARANCE_EPSILON).toBeGreaterThanOrEqual(40.0);
```

### Validation
* Run layout calculation on all 13 canonical benchmark fixtures.
* Assert raw clearance value $C_{\text{raw}} \ge 39.999\text{ px}$ and normalized contract compliance $C_{\text{norm}} \ge 40.000\text{ px}$.
* Verify zero regression in node overlap counts ($O_p = 0, O_s = 0$).

### Risks
* Over-correcting separation padding could artificially push adjacent nodes outside grid bucket bounds, triggering secondary edge crossings.

---

## 5. Track C — Locality Criterion

### Current State
* **Implementation Location**: Implemented in `explorer/src/lib/layout/metrics.ts` (`calculateFeatureLocalityDiagnostics`) and evaluated in `evaluate-layout.ts`.
* **Measured Geometry**: Measures global median intra-feature edge length ($\text{medianIntra}$) vs global median inter-feature edge length ($\text{medianInter}$) across all graph edges.
* **Root Cause of Failure**: In the Candidate E 2D multi-row band layout:
  1. Multi-layer features (e.g., presentation LWC down to schema CustomObject) span vertically across 4 architectural layers, generating vertical intra-feature edge lengths of $1,100\text{ px} \dots 1,400\text{ px}$.
  2. Multi-row 2D band packing places adjacent feature bands side-by-side horizontally with narrow inter-band gaps ($40\text{ px} \dots 80\text{ px}$), producing inter-feature edge lengths of $180\text{ px} \dots 250\text{ px}$ between adjacent bands.
  3. Consequently, global $\text{medianIntra} \approx 1,101.68\text{ px} > \text{medianInter} \approx 1,020.00\text{ px}$, causing the 1D global criterion to fail despite excellent local feature visual grouping.

### Target State
* Replace the global 1D metric with a **Layer-Aware 2D Locality Metric** that evaluates edge lengths strictly within comparable geometric contexts:
  * **Same-Layer Intra-Feature vs Same-Layer Inter-Feature**: Compares intra vs inter edge lengths for nodes residing in the same architectural layer band.
  * **Layer-Span Normalized Locality**: Normalizes vertical edge lengths by the vertical Y-distance between participating architectural layers.
* Existing metadata in the codebase (`classifyNodeLayer`, `discoverFeatures`, `globalDomainResult.layerYMap`, feature region bounds) provides 100% of the information required for this analysis.

### Required Changes
* **Diagnostic Metric Extension**: Extend `metrics.ts` to compute layer-aware locality diagnostics:
  * $D_{\text{intra, same-layer}}$ vs $D_{\text{inter, same-layer}}$
  * $D_{\text{intra, cross-layer}}$ vs $D_{\text{inter, cross-layer}}$
  * Layer-normalized locality ratio $R_{\text{locality, layer}}$
* **Preserve Unresolved Boundary**: Do NOT assign arbitrary pass/fail threshold numbers (e.g. $R < 0.85$) until empirical baseline distribution data is collected across all 13 canonical fixtures.

### Validation
* Compute layer-aware locality metrics across all benchmark datasets.
* Verify that same-layer intra-feature node distances are strictly smaller than same-layer inter-feature distances ($D_{\text{intra, same-layer}} < D_{\text{inter, same-layer}}$).
* Assert metric computation executes in $< 10\text{ ms}$ without altering graph coordinates or layout execution.

### Unresolved Metric Definition
* The exact numerical target threshold for the replacement layer-aware metric is **PENDING EMPIRICAL CALIBRATION**. The plan establishes the diagnostic framework only.

### Risks
* Selecting a layer-aware formula that is overly sensitive to single-node outlier features.

---

## 6. Cross-Track Dependencies

```text
[Track A: Fixture Provisioning]
        │
        ▼ (Provides static distribution assets for production deep-links)
[Clean Runtime Environment]
        │
        ▼ (Enables exact coordinate measurement on canonical graph)
[Track B: 40px Contract Validation] ───► [Track C: Layer-Aware Locality Evaluation]
```

* **Fixture Provisioning (Track A) → Runtime Verification**: Track A provides stable static build assets, ensuring that runtime verification tests measure the genuine 240-node dataset rather than falling back to the 4-node public default.
* **Runtime Verification → Coordinate Measurement**: Accurate runtime loading guarantees that coordinate measurement engines evaluate valid Stage 12 layout positions.
* **Coordinate Measurement → 40px Validation (Track B)**: Bounding box coordinates extracted from runtime Cytoscape instances feed directly into Track B clearance validation helpers.
* **Layout Metadata → Locality Validation (Track C)**: Layer Y-offsets and feature cluster assignments generated during layout execution provide the required metadata for Track C layer-aware locality calculations.

---

## 7. Implementation Sequence

| Step | Track | Change | Dependency | Validation |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Track A** | Update `scripts/export-explorer.cjs` and `package.json` to process project fixtures into `explorer/dist/projects/` during static build. | None | `npm run build && npm run preview` clean deep-link loads 240-node graph without test-harness copying. |
| **2** | **Track A** | Add `project-manifest.json` static generation and update `ProjectContext.tsx` fallback handling. | Step 1 | Switching projects in production build correctly loads target `explorer-data.json`. |
| **3** | **Track B** | Refactor `spacing.ts` collision resolution vector addition to enforce exact $\ge 40.000\text{ px}$ separation padding. | None | Unit test `spacing.test.ts` asserts raw minimum clearance $\ge 40.000\text{ px}$. |
| **4** | **Track B** | Update `metrics.ts` to export `evaluateClearanceContract()` with contractual float tolerance $\epsilon = 1\text{e-}3$. | Step 3 | `Phase6B_LocalityCompaction.test.ts` passes with explicit contractual compliance assertions. |
| **5** | **Track C** | Implement `calculateLayerAwareLocalityDiagnostics()` in `metrics.ts` utilizing layer Y-map and feature roles. | None | Benchmark tests output layer-aware intra vs inter edge length breakdowns across all 13 fixtures. |
| **6** | **Track C** | Perform empirical calibration run across benchmark datasets to establish baseline distribution for new locality metric. | Step 5 | Diagnostic report exported with empirical baseline distributions; numeric threshold proposal prepared for governance review. |
| **7** | **Cross-Track** | Execute full end-to-end integration and regression suite across Tracks A, B, and C. | Steps 1–6 | All Vitest component, unit, CLI, and Playwright acceptance suites pass with 0 regressions. |

---

## 8. Test Strategy

### Production Provisioning (Track A)
* **Build Artifact Verification**: Verify that `npm run build` generates `explorer/dist/projects/cloud-spend-tracker/explorer-data.json`.
* **Deep-Link Production Test**: Playwright test asserting clean browser launch to `/?project=cloud-spend-tracker` without prior file copying renders 240 nodes.
* **Fallback Behavior Test**: Verify that requesting a non-existent project ID gracefully displays `NotAnalyzedScreen` without unhandled React errors.

### 40px Contract (Track B)
* **Contract Boundary Test**: Assert `evaluateClearanceContract(positions)` returns `isContractCompliant: true` and `rawClearance >= 39.999`.
* **Numerical Noise Immunity Test**: Verify that adding $1\text{e-}5\text{ px}$ floating-point jitter to coordinates does not flip contractual pass status.
* **Regression Test**: Verify 0 primary overlaps ($O_p = 0$) and 0 satellite overlaps ($O_s = 0$) across all 13 benchmark datasets.

### Locality Criterion (Track C)
* **Multi-Row Layer-Aware Locality Test**: Verify $D_{\text{intra, same-layer}} < D_{\text{inter, same-layer}}$ on 2D multi-row layouts.
* **Cross-Layer Normalization Test**: Verify vertical cross-layer edge lengths are correctly normalized by layer Y-offset deltas.
* **Determinism Test**: Verify metric output is 100% deterministic across 10 repeated evaluations and input shuffles.

---

## 9. Risk Register

| Risk | Track | Impact | Detection | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Gitignore / Public Artifact Pollution** | Track A | High | CI file tracking check detects un-tracked static files in repository. | Keep `explorer/public/projects` gitignored; emit static production artifacts exclusively to `explorer/dist/projects` during build time. |
| **Build Time Inflation** | Track A | Medium | Build duration exceeds SLA (> 30s). | Optimize `export-explorer.cjs` adapter to perform fast stream copy for pre-analyzed JSON datasets. |
| **Separation Padding Over-Correction** | Track B | High | Increased canvas width or secondary edge crossings. | Limit micro-epsilon adjustment strictly to collision shift vectors ($\epsilon_{\text{pad}} = 1\text{e-}4\text{ px}$). |
| **Premature Locality Threshold Locking** | Track C | Medium | Future layout optimizations blocked by unrealistic pass/fail gates. | Retain locality metric as diagnostic-only until governance formally adopts a calibrated threshold. |
| **Cross-Project State Contamination** | Cross-Track | High | Switching projects retains coordinate maps or selection states from previous project. | Maintain strict project keying (`explorer.projectState.<projectId>`) and verify `explorer:project-changed` event flushes. |

---

## 10. Files/Components Likely Affected

### Confirmed Affected Files
* `scripts/export-explorer.cjs` — Project asset export and static manifest publishing logic.
* `package.json` — Root command script definitions for pre-build asset provisioning.
* `explorer/src/context/ProjectContext.tsx` — Runtime project data URL resolution and fallback error handling.
* `explorer/src/lib/layout/spacing.ts` — Collision clearance calculation and separation vector application.
* `explorer/src/lib/layout/metrics.ts` — Minimum clearance evaluation helper and layer-aware locality metrics.
* `explorer/src/test/Phase6B_LocalityCompaction.test.ts` — Clearance test assertion updates.

### Likely Affected Files
* `explorer/src/lib/layout/evaluate-layout.ts` — Inclusion of layer-aware locality in layout summary metrics.
* `explorer/src/types/explorer.ts` — Project metadata and locality diagnostic interface extensions.
* `explorer/vite.config.ts` — Vite static asset copying or public directory build configuration.

### Files Requiring Confirmation Before Implementation
* `scripts/run-explorer.cjs` — Verification of CLI wrapper flags for production build integration.
* `explorer/src/App.tsx` — Verification of error boundary handling for failed project asset loads.

---

## 11. Explicit Non-Goals

* **NO** modification of production code, test files, dataset fixtures, build configs, or documentation during Phase 17.
* **NO** changing the 40px requirement to 39.99px.
* **NO** inventing arbitrary numerical pass/fail thresholds for the replacement layer-aware locality metric.
* **NO** un-ignoring raw test folders or committing generated project assets to git.
* **NO** altering the 5-Level Position Authority Hierarchy or Static Mode coordinate invariance contracts.

---

## 12. Implementation Authorization Boundary

`PLANNING COMPLETE — IMPLEMENTATION NOT PERFORMED`
