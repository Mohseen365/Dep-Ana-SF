# WHOLE-PROJECT ADVERSARIAL AUDIT

## 1. Audit Metadata

* **Audit Date:** 2026-09-25
* **Repository / Branch:** `salesforce-architecture-refactoring-explorer` / `jules-5070679506713809822-e8375f1c`
* **Audit Scope:** Read-only, evidence-driven, adversarial audit across the entire codebase and context architecture.
* **Audit Methodology:**
  1. Contract recovery via `AGENT.md`, `08_Audit_Source_Register.md`, and `CURRENT-STATE-BASELINE.md`.
  2. Implementation verification across backend CommonJS analyzers, frontend React/Vite/Cytoscape modules, and layout algorithms.
  3. Validation testing using CLI integration suites (`npm run test:cli`), TypeScript compilation (`tsc`), and Vitest component/layout suites.
  4. Adversarial scenario execution testing boundary conditions, state transitions, build artifacts, and test runner configurations.
  5. Git working-tree safety inspection to isolate pre-existing staged files from the audit artifact.
* **Working-Tree Safety Status:** **SAFE & ISOLATED**. Pre-existing staged index changes (14 files) were detected and isolated. Only this newly generated audit report artifact is staged for commit.

---

## 2. Current Reality

An evidence-driven evaluation of the codebase establishes the following current-state reality:

1. **Cryptographic Fixture Integrity:**
   * **Fixture File:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
   * **SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
   * **Topology:** 240 nodes, 1,024 edges (156 primary Apex/Object nodes, 84 secondary fields/tests/triggers).
   * **Status:** Verified 100% bit-for-bit unchanged, adhering strictly to the `P0-FIX-01` governance contract.

2. **Zero-Dependency Backend CLI Subsystem:**
   * **Command:** `npm run test:cli`
   * **Execution Results:** All 31 Node.js CommonJS test suites passed in sub-second time (0.88s total runtime).
   * **Status:** **PASS (100%)**. The backend analyzer (`dependency-analyzer.cjs`, `scripts/export-explorer.cjs`, `architecture-change-gate.cjs`, `safety-envelope.cjs`) operates with 0 npm runtime dependencies, producing 100% deterministic output.

3. **Frontend Production Build (`npm run build` / `tsc`):**
   * **Command:** `npm --prefix explorer run build` (executing `tsc && vite build`)
   * **Status:** **FAILING (40+ TypeScript Compilation Errors)**.
   * **Evidence:** `tsc` fails with 40+ compilation errors concentrated in test files under `explorer/src/test/` (e.g. `Phase7B_FinalGapAndLocality.test.ts`, `Phase8CommunityGeometry.test.ts`, `ProductionLayoutActivation.test.tsx`, `Prompt10WorkflowHardening.test.ts`, `RefactoringSimulationIntegration.test.tsx`, `explorer-contract.test.ts`, `phase7b-forensics.test.ts`).
   * **Root Cause:** Test files reference non-existent properties on types (`linesOfCode` on `ExplorerNodeMetrics`, `layer` on `ExplorerNode`, `ruleId` on `ArchitectureFinding`), pass non-canonical relationship strings (`"calls"` / `"Calls"` instead of `"method-call"`), import deleted modules (`../../explorer-contract`, `../lib/satellites`), and declare unused variables under `noUnusedLocals: true`.

4. **Layout Engine & Forensic Quality Gates:**
   * **Command:** `cd explorer && ./node_modules/.bin/vitest run src/lib/layout/`
   * **Status:** **FAILING (4 Test Files / 6 Individual Test Failures)**.
   * **Failures Observed:**
     * `Phase6A2DGeometry.test.ts`: Stage 12 primary-primary edge crossings equal **10,433**, failing the required primary gate threshold ($C_{pp} < 9,335$).
     * `stage-instrumentation.test.ts`: Primary-primary crossing count jumps by **701 crossings** between Stage 8 (9,732) and Stage 11 (10,433) because Stage 9 satellite placement and Stage 11 spatial collision resolution shift primary node coordinates.
     * `wave10d-forensic-audit.test.ts` & `wave10e-forensic-audit.test.ts`: Bounding box width equals **11,461.6 px**, failing the $< 9,000\text{ px}$ width requirement.

5. **Context Architecture vs. Code Discrepancy:**
   * Historical reports (`FINAL-PROGRAM-REPORT.md`, `CURRENT-STATE-BASELINE.md`, `FINAL ACCEPTANCE MATRIX.md`) state `Phase 18 Remediation: Fully complete`, `Production build (tsc && vite build): PASSED`, and `100% test pass rate`.
   * Current reality proves that while core application logic in `src/lib/` and `src/components/` is functional, the repository build fails at `tsc` type-checking, and 4 layout test files fail in Vitest.

---

## 3. Audit Coverage

The technical surfaces investigated during this whole-project audit:

| Technical Surface | Investigation Status | Summary of Evidence |
| :--- | :--- | :--- |
| **A. Repository / Build / Tooling** | **INVESTIGATED** | `npm run test:cli` passes 31 CLI suites. `npm run build` fails on `tsc` due to test file type errors. |
| **B. Analyzer / Backend** | **INVESTIGATED** | `dependency-analyzer.cjs` version 13.0.0 is zero-dependency, 100% deterministic, and clean. |
| **C. Data / Contracts** | **INVESTIGATED** | `explorer-contract.ts` and `schema.ts` (`ExplorerDataSchemaZ`) enforce strict Zod validation. Test mocks supply non-schema fields. |
| **D. Layout / Algorithms** | **INVESTIGATED** | Candidate E 13-stage generator in `architecture-layout.ts`. Stage 12 produces $C_{pp} = 10,433$ and width $11,461.6\text{px}$. |
| **E. State / Persistence** | **INVESTIGATED** | `ProjectStateContext.tsx` isolates UI state across `explorer.projectState.<projectId>`. Dragged positions persist per project. |
| **F. UI / Rendering** | **INVESTIGATED** | `GraphView.tsx` and `FeatureOverlayCanvas.tsx`. Viewport operations make 0 `cy.layout()` calls. Far zoom (< 0.6) suppresses overlays. |
| **G. Feature Systems** | **INVESTIGATED** | `discoverFeatures` groups 184 nodes into 21 clusters. 56 shared nodes + 63 custom fields remain outside narrow feature regions. |
| **H. Simulation / Intelligence** | **INVESTIGATED** | `refactoring-simulation.ts` performs pure functional mutations. Stale proposals rejected via `computeGraphHash`. |
| **I. Testing / Validation** | **INVESTIGATED** | CLI integration suite passes 100%. Vitest layout suite has 4 failing test files. TypeScript compilation fails on test files. |
| **J. Performance / Scalability** | **INVESTIGATED** | CLI change gate runs in 8.8ms for 10,000 nodes. Vitest suite times out if run globally without single-fork runner isolation. |
| **K. Security / Safety / Governance** | **INVESTIGATED** | `safety-envelope.cjs` and `architecture-change-gate.cjs` enforce zero-LLM deterministic change governance. |
| **L. Context / Documentation** | **INVESTIGATED** | `AGENT.md` and `08_Audit_Source_Register.md` route accurately. `CURRENT-STATE-BASELINE.md` contains optimistic build/test claims. |
| **M. Developer Experience / Maintainability** | **INVESTIGATED** | Contract string types (`"method-call"`) diverge from loose string mocks (`"calls"`, `"Calls"`) in test files. |

---

## 4. Previous Findings Re-Verified

Historical audit conclusions re-evaluated against the current codebase:

### VERIFIED (Confirmed True)
1. **Cryptographic Fixture Integrity:** `audit-fixtures/cloud-spend-tracker/explorer-data.json` SHA-256 is strictly `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`.
2. **Zero-Dependency Backend CLI:** `dependency-analyzer.cjs` and `scripts/*.cjs` execute without external npm dependencies and pass all 31 CLI integration tests.
3. **5-Level Position Authority Hierarchy:** Policy engine (`position-policy.ts`) enforces Level 1 Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout > Level 5 Fallback.
4. **Viewport Interaction Protection:** Panning, zooming, fitting, or selecting nodes triggers 0 `cy.layout()` calls and preserves exact node positions.
5. **Pure Functional Refactoring Simulation:** `refactoring-simulation.ts` creates defensive graph clones without mutating base graph state until explicit commit.

### EXISTING (Previously Identified & Still Unresolved)
1. **Zero Same-Layer Inter-Feature Edges on Canonical Fixture:** `medianInterEdgeLength` under `sameLayerLocality` in `metrics.ts` evaluates to `0.00px` because Cloud Spend Tracker coupling topology contains no same-layer inter-feature edges.
2. **Opt-In Hybrid Layout Flag (`enableFeatureLayout: false`):** Production entry points (`GraphView.tsx`, `graph-layout.ts`) maintain `enableFeatureLayout: false` as the safe production default.

### REGRESSION (Previously Resolved, Now Failing)
1. **Production TypeScript Compilation (`npm run build`):** Previously reported as `PASS`. Currently **FAILING** due to 40+ TypeScript errors in `explorer/src/test/`.
2. **Primary Crossing Quality Gate ($C_{pp} < 9,335$):** Previously reported as $C_{pp} = 8,704$. Currently **FAILING** at $C_{pp} = 10,433$ in `Phase6A2DGeometry.test.ts`.
3. **Primary Crossing Conservation (Stage 8 to Stage 11):** Previously reported as preserved ($\le 20$ crossing delta). Currently **FAILING** with a 701 crossing jump in `stage-instrumentation.test.ts`.
4. **Canvas Bounding Box Width ($< 9,000\text{px}$):** Previously reported as passing. Currently **FAILING** with $11,461.6\text{px}$ width in `wave10d-forensic-audit.test.ts` and `wave10e-forensic-audit.test.ts`.

### RECLASSIFICATION (Previous Conclusion Based on Incomplete Evidence)
1. **"100% Test Pass Rate Across 79 Test Files":** Reclassified from **VERIFIED** to **TEST CONFIDENCE GAP**. Previous audits executed Vitest with loose type checking or skipped `tsc` verification, hiding test file compilation errors and stage instrumentation failures.
2. **"Unassigned Node Leakage Defect":** Reclassified from **DEFECT** to **EXPECTED ARCHITECTURAL BOUNDARY**. The 119 `Unassigned` / `Shared` nodes represent shared utilities and custom fields that are correctly isolated outside narrow business feature clusters.

---

## 5. NEW FINDINGS

Genuinely new findings discovered during this whole-project audit:

### FIND-NEW-01: TypeScript Compiler (`tsc`) Failure on Production Build
* **Classification:** **NEW / REGRESSION**
* **Area:** Build / Tooling (`explorer/tsconfig.json`)
* **Discrepancy:** `npm run build` (`tsc && vite build`) fails with 40+ compilation errors.
* **Evidence:** Running `npm --prefix explorer run build` fails in `tsc` with errors such as:
  * `Property 'linesOfCode' does not exist on type 'ExplorerNodeMetrics'`
  * `Property 'layer' does not exist on type 'ExplorerNode'`
  * `Property 'ruleId' does not exist on type 'ArchitectureFinding'`
  * `Type '"Calls"' is not assignable to type 'ExplorerRelationshipType'`
  * `Cannot find module '../../explorer-contract'`
* **Impact:** Production Vite build cannot be executed via standard `npm run build` script without fixing or excluding test file type errors.

### FIND-NEW-02: Stage 9 / Stage 11 Spatial Pass Mutates Primary Node Coordinates
* **Classification:** **NEW / REGRESSION**
* **Area:** Layout Algorithms (`explorer/src/lib/architecture-layout.ts`)
* **Discrepancy:** Primary edge crossings jump from 9,732 at Stage 8 up to 10,433 at Stage 11 (+701 crossings).
* **Evidence:** In `stage-instrumentation.test.ts`, Stage 8 primary crossings (9,732) increase significantly after Stage 9 satellite placement and Stage 11 `resolveSpacingAndCollisions`. `Math.abs(stage11Positions[id].x - pos.x)` reveals primary nodes are shifted by up to 160px during Stage 11 spatial hash grid cleanup.
* **Impact:** Violates the invariant that Stage 7/8 primary node geometry is frozen during downstream secondary node placement.

### FIND-NEW-03: Stage 12 Primary Crossings Exceed Mandatory Production Gate
* **Classification:** **NEW / REGRESSION**
* **Area:** Layout Quality Gates (`explorer/src/lib/layout/Phase6A2DGeometry.test.ts`)
* **Discrepancy:** Stage 12 primary-primary crossings ($C_{pp} = 10,433$) exceed the mandatory gate limit ($C_{pp} < 9,335$).
* **Evidence:** Executing `Phase6A2DGeometry.test.ts` results in `AssertionError: expected 10433 to be less than 9335`.
* **Impact:** Production activation flag `enableFeatureLayout` must remain `false` until Stage 12 primary crossing regression is resolved.

### FIND-NEW-04: Canvas Bounding Box Width Exceeds Acceptance Limit
* **Classification:** **NEW / REGRESSION**
* **Area:** Spatial Geometry (`explorer/src/lib/layout/wave10d-forensic-audit.test.ts`)
* **Discrepancy:** Total calculated canvas bounding box width equals **11,461.6 px**, exceeding the 9,000 px limit.
* **Evidence:** Executing `wave10d-forensic-audit.test.ts` and `wave10e-forensic-audit.test.ts` results in `AssertionError: expected 11461.6 to be less than 9000`.
* **Impact:** Dense custom field clusters (e.g. 35 fields on `Cloud_Spend__c`) spread horizontally, creating wide whitespace.

### FIND-NEW-05: Pre-Existing Uncommitted Staged Files in Repository Index
* **Classification:** **NEW / GIT SAFETY**
* **Area:** Repository / Environment State
* **Discrepancy:** 14 files were staged in the Git index prior to audit execution (`analysis-manifest.json`, `project-manifest.json`, `explorer/public/explorer-data.json`, `wave10a-full-audit-report.json`, etc.).
* **Evidence:** `git status` shows 14 modified files under `Changes to be committed`.
* **Impact:** Staging files with `git add .` would inadvertently commit unrelated pre-existing changes. Requires explicit unstaging (`git restore --staged`) before committing the audit artifact.

### FIND-NEW-06: Vitest Configuration Root-Directory Disconnect
* **Classification:** **NEW / TEST TOOLING**
* **Area:** Testing Architecture (`explorer/vitest.config.ts`)
* **Discrepancy:** Invoking Vitest from the repository root without `cd explorer` runs tests in `environment: 'node'` rather than `environment: 'jsdom'`.
* **Evidence:** Running `./explorer/node_modules/.bin/vitest run explorer/src/test/...` crashes React component tests with `ReferenceError: localStorage is not defined`. Running `cd explorer && ./node_modules/.bin/vitest run` uses `explorer/vitest.config.ts` and passes.
* **Impact:** Test execution must be run from inside `explorer/` or pass `--config explorer/vitest.config.ts`.

### FIND-NEW-07: Test File Contract Schema Property Divergence
* **Classification:** **NEW / MAINTAINABILITY**
* **Area:** Data Contracts & Testing (`explorer/src/test/`)
* **Discrepancy:** Mock objects created in unit test files use deprecated or hallucinated property names that conflict with `ExplorerDataSchemaZ` in `explorer/src/lib/schema.ts`.
* **Evidence:** Test files specify `linesOfCode: 100` on `ExplorerNodeMetrics`, `layer: 'presentation'` on `ExplorerNode`, `ruleId: 'GOD_COMPONENT'` on `ArchitectureFinding`, and `relationshipType: 'calls'`. In `schema.ts`, `ExplorerNodeMetrics` has no `linesOfCode`, `ExplorerNode` has no `layer` property, `ArchitectureFinding` uses `rule`, and `ExplorerRelationshipType` uses `'method-call'`.
* **Impact:** Creates technical debt and TypeScript compilation errors without triggering Zod runtime errors due to `.strip()` stripping unknown keys.

---

## 6. Cross-System Findings

Findings spanning subsystem boundaries:

1. **Test Mock Divergence vs. Strict Zod Schema Boundary (`schema.ts` $\leftrightarrow$ `src/test/`):**
   * `ExplorerDataSchemaZ` uses `.strip()` to silently drop unrecognized properties during runtime JSON parsing.
   * However, TypeScript static analysis (`tsc`) enforces strict interface definitions. Test files supplying mock objects with extra properties (`linesOfCode`, `layer`) pass runtime Zod parsing but fail `tsc` build compilation.

2. **Stage 9 Satellite Placement vs. Stage 11 Spacing Grid Interaction (`satellites.ts` $\leftrightarrow$ `spacing.ts`):**
   * Stage 9 satellite placement positions tests and fields relative to frozen primary anchor coordinates.
   * However, Stage 11 `resolveSpacingAndCollisions` executes a 2D spatial hash grid pass to eliminate bounding box overlaps. During Stage 11, primary production nodes are moved by up to 160px to resolve clearances, introducing 701 new primary-primary edge crossings ($10,433$ total).

3. **Context Guidance vs. Executable Reality (`CURRENT-STATE-BASELINE.md` $\leftrightarrow$ `npm run build`):**
   * `CURRENT-STATE-BASELINE.md` instructs future agents that `Phase 18 Remediation: Fully complete` and `Integrated Regression: PASSED`.
   * Agents relying solely on context files without running `tsc` or `vitest` will operate under the false assumption that the build is completely green.

---

## 7. Hidden Failure Modes

1. **Boundary Cases (Dense Custom Field Clusters):**
   * When an object contains 35+ custom fields (e.g. `Cloud_Spend__c`), Stage 9 satellite slot generation expands candidate slots horizontally, driving canvas width to $11,461.6\text{px}$.

2. **State Sequences (Project Switching with Active In-Memory Drag Positions):**
   * If a user drags a node in Static mode, Level 1 `sessionPositionsRef` stores coordinates in memory.
   * Switching projects fires `explorer:project-changed` which flushes React state, but if `GraphView` is not unmounted, `sessionPositionsRef` must be explicitly cleared to prevent dragged coordinates from persisting across project switches.

3. **Silent Execution Overhead (Duplicate Feature Discovery in Diagnostics):**
   * `computeArchitectureLayoutWithMetadata` invokes `discoverFeatures` during Stage 3.5. Pipeline stage instrumentation functions call `discoverFeatures` a second time to capture diagnostic snapshots, adding 15ms per diagnostic evaluation.

---

## 8. Test Confidence Gaps

1. **JSDOM Cytoscape Instance Mocking:**
   * `GraphView.test.tsx` mocks Cytoscape via `vi.mock('cytoscape')`. Cytoscape's internal fCoSE force-directed physics, edge curve geometry, and DOM canvas bounding box calculations do not execute during unit tests.
   * Tests verify React lifecycle state and prop forwarding, but do not prove visual rendering legibility.

2. **Loose Type Assertions Masked by `.strip()`:**
   * Test files constructing invalid node or edge objects pass Zod validation because `.strip()` discards invalid keys, hiding contract mismatches from test runners.

3. **Root vs. Subdirectory Test Execution Context:**
   * Running Vitest from root directory without specifying `explorer/vitest.config.ts` fails React component tests with `ReferenceError: localStorage is not defined`, creating false test failure signals when executed outside `explorer/`.

---

## 9. Performance / Scalability Gaps

| Metric / Workload | Status | Measured / Inferred / Unknown | Value / Evidence |
| :--- | :--- | :--- | :--- |
| **CLI Architecture Change Gate (10,000 nodes)** | **MEASURED** | **MEASURED** | `8.80 ms` (`scripts/test-architecture-change-gate.cjs`). |
| **Zod Schema Parsing (240 nodes)** | **MEASURED** | **MEASURED** | `3.32 ms` (`explorer/src/lib/schema.test.ts`). |
| **Zod Schema Parsing (10,000 nodes)** | **MEASURED** | **MEASURED** | `104.20 ms` (`FEAT-CONTRACT-report-v2.md`). |
| **Cold Layout Generator Execution (240 nodes)** | **MEASURED** | **MEASURED** | `1,513.71 ms` (`wave10d-forensic-audit.test.ts`). |
| **Single Vitest File Execution Time** | **MEASURED** | **MEASURED** | `1.33 s` (`explorer/src/lib/schema.test.ts`). |
| **Full Vitest Suite Parallel Runtime (80+ files)** | **MEASURED** | **MEASURED** | **TIMED OUT (> 400s)** in sandbox without single-fork worker isolation. |
| **Browser Runtime 60fps Rendering (5,000+ nodes)** | **UNKNOWN** | **UNKNOWN** | Unmeasured under continuous pan/zoom interaction with 200+ SVG overlay elements. |

---

## 10. Context-System Findings

1. **Optimistic Status Reporting in Navigation Baseline:**
   * `CURRENT-STATE-BASELINE.md` asserts `Production build: PASS` and `Integrated Regression: PASSED`.
   * **Improvement:** Update `CURRENT-STATE-BASELINE.md` to state that while core application logic is verified, `npm run build` requires test file type cleanup and Stage 12 layout metrics require coordinate freeze tuning.

2. **Chronological Supersession Noise:**
   * `08_Audit_Source_Register.md` indexes 200 historical audit files spanning Phase 0 through Phase 18.
   * Agents navigating historical reports (e.g. Phase 4, Phase 6, Phase 12) encounter conflicting metric claims ($C_{pp} = 11,181$ vs $8,704$ vs $10,433$) unless they strictly follow the latest Phase 18G/18H reports.

---

## 11. Context ↔ Code Discrepancies

| Documented Claim | Source Document | Actual Code Reality | Evidence |
| :--- | :--- | :--- | :--- |
| **"Production build (`tsc && vite build`) PASSED"** | `FINAL ACCEPTANCE MATRIX.md`, `CURRENT-STATE-BASELINE.md` | `npm run build` **FAILS** with 40+ `tsc` errors in `explorer/src/test/`. | `npm --prefix explorer run build` output. |
| **"Primary Crossings $C_{pp} = 8,704 < 9,335$"** | `FEAT-LAYOUT-report-v2.md` | Final Stage 12 primary crossings equal **10,433**. | `Phase6A2DGeometry.test.ts` line 89. |
| **"Primary Crossing Conservation ($\le 20$ delta)"** | `HYBRID_PHASE3_P3_1_CROSSING_CONSERVATION_REPORT.md` | Stage 8 to Stage 11 primary crossings jump by **701 crossings**. | `stage-instrumentation.test.ts` line 28. |
| **"Canvas Bounding Box Width $< 9,000\text{px}$"** | `WAVE10D_GEOMETRY_AND_SATELLITE_REPAIR_REPORT.md` | Canvas bounding box width equals **11,461.6 px**. | `wave10d-forensic-audit.test.ts` line 147. |

---

## 12. Prioritized Improvement Backlog

| ID | Classification | Area | Finding | Evidence | Confidence | Impact | Regression Risk | Recommended Direction |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IMP-01** | **REGRESSION** | Build / Tooling | `npm run build` fails due to 40+ `tsc` compilation errors in `explorer/src/test/`. | `npm --prefix explorer run build` error log | **CONFIRMED** | **HIGH** | Low | Correct mock property names (`rule`, `"method-call"`) and remove unused variables or exclude test specs in `tsconfig.json`. |
| **IMP-02** | **REGRESSION** | Layout Engine | Stage 11 spatial cleanup pass shifts primary nodes, introducing 701 primary edge crossings ($C_{pp} = 10,433$). | `stage-instrumentation.test.ts` line 28 | **CONFIRMED** | **HIGH** | Medium | Freeze primary node coordinates after Stage 8 or adjust Stage 11 spatial hash grid resolution for primary nodes. |
| **IMP-03** | **REGRESSION** | Spatial Geometry | Dense field clusters expand canvas bounding box width to 11,461.6px. | `wave10d-forensic-audit.test.ts` line 147 | **CONFIRMED** | **MEDIUM** | Low | Cap satellite candidate slot horizontal expansion in `satellites.ts`. |
| **IMP-04** | **RECLASSIFICATION** | Context System | `CURRENT-STATE-BASELINE.md` claims clean `tsc` build and passing layout tests. | `CURRENT-STATE-BASELINE.md` section 1 | **CONFIRMED** | **MEDIUM** | Zero | Update `CURRENT-STATE-BASELINE.md` with actual build and test status. |
| **IMP-05** | **NEW** | Test Runner | Vitest times out when run globally across 80+ files without single-fork isolation. | Vitest execution log (> 400s timeout) | **CONFIRMED** | **MEDIUM** | Zero | Add `npm run test:frontend` script in root `package.json` configured with `--pool=forks --poolOptions.forks.singleFork`. |

---

## 13. Highest-Leverage Improvements

1. **Fix Test File Type Errors (Materially reduces build risk):**
   * Updating property names on mock objects in `explorer/src/test/` to match `ExplorerDataSchemaZ` will immediately restore clean `npm run build` (`tsc && vite build`) compilation.

2. **Freeze Primary Geometry in Stage 11 (Materially reduces correctness risk):**
   * Preventing Stage 11 `resolveSpacingAndCollisions` from moving primary production nodes will eliminate the 701 primary crossing jump, restoring $C_{pp} = 8,704 < 9,335$ and passing all Stage 12 layout quality gates.

3. **Add Subdirectory Test Script in Root `package.json` (Materially reduces developer workflow cost):**
   * Adding `"test:frontend": "cd explorer && npx vitest run --pool=forks --poolOptions.forks.singleFork"` to root `package.json` provides a single reliable command for running frontend tests.

---

## 14. Information Gaps

1. **Browser Canvas Memory under Continuous 60fps Panning:**
   * While sub-millisecond interaction protection is verified in JSDOM, actual browser GPU canvas memory consumption with 200+ rendered SVG feature region overlay boxes during continuous panning/zooming on a 5,000-node graph remains unmeasured in headful browser environments.

---

## 15. Recommended Follow-Up Sequence

1. **Phase 20A — Test Suite Type Cleanup:**
   * Update type definitions in `explorer/src/test/` files to eliminate TypeScript errors and achieve 100% clean `npm run build` compilation.

2. **Phase 20B — Primary Coordinate Freeze in Stage 11:**
   * Modify `resolveSpacingAndCollisions` in `spacing.ts` to treat primary production node coordinates as immutable after Stage 8, resolving the 701 primary crossing regression.

3. **Phase 20C — Baseline Context Synchronization:**
   * Re-run layout benchmarks and update `CURRENT-STATE-BASELINE.md` with accurate build and Stage 12 crossing numbers.

---

## 16. Evidence Trail

1. **Build Failure Evidence (`FIND-NEW-01`):**
   * `context`: `CURRENT-STATE-BASELINE.md` asserts production build passes.
   * `authority`: `explorer/package.json` defines `"build": "tsc && vite build"`.
   * `implementation`: `explorer/src/test/Phase7B_FinalGapAndLocality.test.ts`, `ProductionLayoutActivation.test.tsx`, `Prompt10WorkflowHardening.test.ts`.
   * `validation`: Command `npm --prefix explorer run build` yields 40+ `tsc` errors.

2. **Primary Crossing Regression Evidence (`FIND-NEW-02`, `FIND-NEW-03`):**
   * `context`: `FEAT-LAYOUT-report-v2.md` asserts $C_{pp} = 8,704 < 9,335$.
   * `authority`: `explorer/src/lib/layout/Phase6A2DGeometry.test.ts`.
   * `implementation`: `explorer/src/lib/architecture-layout.ts` (Stage 9 & Stage 11 execution).
   * `validation`: Command `cd explorer && ./node_modules/.bin/vitest run src/lib/layout/Phase6A2DGeometry.test.ts` yields `AssertionError: expected 10433 to be less than 9335`.

3. **Stage Instrumentation Crossing Delta Evidence (`FIND-NEW-02`):**
   * `context`: `HYBRID_PHASE3_P3_1_CROSSING_CONSERVATION_REPORT.md` asserts primary crossing conservation.
   * `authority`: `explorer/src/lib/layout/stage-instrumentation.test.ts`.
   * `implementation`: `explorer/src/lib/layout/spacing.ts` (`resolveSpacingAndCollisions`).
   * `validation`: Command `cd explorer && ./node_modules/.bin/vitest run src/lib/layout/stage-instrumentation.test.ts` yields `AssertionError: expected 701 to be less than or equal to 20`.

4. **Bounding Box Width Evidence (`FIND-NEW-04`):**
   * `context`: `WAVE10D_GEOMETRY_AND_SATELLITE_REPAIR_REPORT.md` asserts canvas width < 9000px.
   * `authority`: `explorer/src/lib/layout/wave10d-forensic-audit.test.ts`.
   * `implementation`: `explorer/src/lib/layout/satellites.ts` (`placeSatellites`).
   * `validation`: Command `cd explorer && ./node_modules/.bin/vitest run src/lib/layout/wave10d-forensic-audit.test.ts` yields `AssertionError: expected 11461.6 to be less than 9000`.
