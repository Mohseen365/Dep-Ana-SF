# PHASE 15T — Runtime Identity & Coordinate Reconciliation Report

## 1. Executive Verdict

1. **Phase 15B and Phase 15C Stage 12 Hash Equality**: Phase 15B and Phase 15C executed against the identical 240-node canonical audit fixture (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`). When both pipelines run `computeArchitectureLayout` with `enableFeatureLayout: true`, they produce **100% identical Candidate E Stage 12 position map hashes** (`af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30`).
2. **Explicit 240-Node Coordinate Diff Status**: Stage 12 position hash equality proves identical coordinate maps. However, an explicit 240-row coordinate-diff artifact comparing 15B output against 15C output was not generated in historical reports. The coordinate diff previously included in Phase 15T Section 13 compared Candidate E Hybrid (`enableFeatureLayout: true`) against Legacy Hierarchical (`enableFeatureLayout: false`), not Phase 15B against Phase 15C.
3. **Apparent Contradiction Root Cause Classification**:
   - `ApexClass:SharedUtility`: **PROVEN** historical documentation error. `SharedUtility` does not exist in the 240-node canonical fixture.
   - `(5279.15, 750.00)`: **SUPPORTED BUT NOT CONCLUSIVE** historical artifact from Phase 4 1D column layout documentation.
   - `c09aba8f...` hash: **UNKNOWN** origin (does not correspond to live Stage 12 output of Candidate E).
4. **Execution Path Disambiguation (Direct Engine vs. Browser Harness vs. Production Deep-Link)**:
   - **Direct Engine Execution (15B)**: Executes `computeArchitectureLayout` directly in Node.js on `audit-fixtures/cloud-spend-tracker/explorer-data.json`.
   - **Browser Harness Execution (15C)**: Playwright test harness places the canonical fixture into gitignored `explorer/public/projects/cloud-spend-tracker/explorer-data.json` prior to test execution, allowing browser acceptance tests to load and pass cleanly.
   - **Clean Production Deep-Link Execution (15A)**: In a clean checkout without harness intervention, requesting `?project=cloud-spend-tracker` returns 404 because `explorer/public/projects/*` is gitignored. The browser falls back to `explorer/public/explorer-data.json` (4 nodes, 3 edges).
5. **Runtime Defects**: No defect was observed in the verified Phase 15T Hybrid engine layout calculation, Stage 12 output, Position Authority resolution, or Cytoscape model synchronization under the tested configuration and fixture.

---

## 2. Investigation Scope

This forensic audit investigates the exact execution paths, data paths, stage hashes, and coordinate outputs comparing:
* **Phase 15A Cleanroom Audit**: Public asset routing and launch defaults in a clean repository checkout.
* **Phase 15B Direct Engine Reconciliation**: Stage 0–12 Hybrid layout pipeline execution in Node.js.
* **Phase 15C Browser Acceptance Audit**: Playwright Chromium browser rendering and Position Authority resolution.

---

## 3. Context Retrieval & Navigation

Context navigation followed `AGENT.md` strictly:
```text
AGENT.md
   ↓
08_Audit_Source_Register.md
   ↓
Canonical Feature & Gap-Fill Audit Reports
   ↓
Raw Forensic Evidence (audit-evidence/)
```

### Files Consulted:
* `AGENT.md`
* `08_Audit_Source_Register.md`
* `audit-reports/features/FEAT-LAYOUT-report-v2.md`
* `audit-reports/features/FEAT-POSAUTH-report-v2.md`
* `PHASE_15B_HYBRID_LAYOUT_METRIC_RECONCILIATION_AND_HISTORICALFORENSICS.md`
* `PHASE15C_REAL_BROWSER_POSITION_AUTHORITY_ACCEPTANCE_REPORT.md`
* `PHASE15A_CLEANROOM_RUNTIME_TRUTH_REPORT.md`
* `audit-fixtures/cloud-spend-tracker/explorer-data.json`

---

## 4. Source & Working Tree Identity

| Attribute | Verified Evidence Value |
|---|---|
| **Git Commit** | HEAD on active branch |
| **Tracked Modifications** | None (`git status --short` returns empty) |
| **Untracked Files** | None (`git status --porcelain=v1` returns empty) |
| **Ignored Files** | `node_modules/` (`git status --ignored` returns `node_modules/` only) |
| **Working-Tree Classification** | Globally clean tracked working tree |
| **Node.js Version** | `v22.22.1` |
| **Core Source Hashes** | `explorer/src/lib/architecture-layout.ts`: `e2f1a6c4...` |

---

## 5. Fixture Identity

* **Canonical Path**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
* **File SHA-256 Digest**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
* **Node Count**: 240
* **Edge Count**: 1,024
* **Integrity Status**: **100% MATCH** with canonical benchmark specification.

---

## 6. Execution Path Disambiguation

| Path | Description | Scope / What It Proves | Scope Limitations |
|---|---|---|---|
| **A. Direct Engine Execution** | Node.js invoking `computeArchitectureLayout` directly on `audit-fixtures/cloud-spend-tracker/explorer-data.json`. | Proves math, geometry, stage hashes, edge crossings ($C_{\text{total}} = 94,662$), and determinism of layout algorithms. | Does not prove React state persistence, DOM rendering, or URL routing. |
| **B. Browser Harness Execution** | Playwright mounting Vite dev server after copying fixture into `explorer/public/projects/cloud-spend-tracker/`. | Proves browser rendering, React lifecycle, Cytoscape synchronization, and Position Authority in the test environment. | Does not independently prove that an un-assisted clean production deployment loads the fixture via deep-link. |
| **C. Clean Deep-Link Execution** | Fresh browser launch requesting `?project=cloud-spend-tracker` without test harness pre-population. | Proves real-world asset routing. Returns 404 because `explorer/public/projects/*` is gitignored; falls back to 4-node public default. | Proves public data asset routing behavior, not engine layout math. |

---

## 7. Stage 12 Hash Equality vs. Explicit Coordinate Diff

* **Stage 12 Hash Match**: Both Direct Engine Execution (15B) and Browser Harness Execution (15C) produce Stage 12 position map hash `af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30`.
* **Explicit 240-Node Coordinate Diff**: An explicit node-by-node 240-row coordinate-diff artifact comparing Phase 15B vs. Phase 15C was **not generated** because identical Stage 12 position map hashes mathematically guarantee 0.00000 px coordinate difference across all 240 nodes.
* **Hybrid vs. Legacy Structural Diff**: The coordinate diff comparing Candidate E Hybrid (`enableFeatureLayout: true`) vs Legacy Hierarchical (`enableFeatureLayout: false`) on all 240 nodes yields:
  * **Nodes Compared**: 240
  * **Identical Nodes**: 0
  * **Changed Nodes**: 240
  * **Max $\text{d}x$**: `10,141.77 px`
  * **Max $\text{d}y$**: `3,600.00 px`
  * **Max Euclidean Distance**: `10,194.06 px`
  * **Mean Euclidean Distance**: `3,169.00 px`
  * **Median Euclidean Distance**: `2,800.27 px`

---

## 8. Historical Phase 15C Text Figures Origin Analysis

| Suspicious Value in 15C Text | Direct Execution Truth | Classification | Origin Evidence |
|---|---|---|---|
| `ApexClass:SharedUtility` | Component does NOT exist in fixture | **PROVEN** | `SharedUtility` is absent from `audit-fixtures/cloud-spend-tracker/explorer-data.json`. Its inclusion in Phase 15C text was a manual documentation copy-paste error. |
| `Cloud_Spend__c` at `(5279.15, 750.00)` | Actual Stage 12 position: `(1519.83, 2490.00)` | **SUPPORTED BUT NOT CONCLUSIVE** | `(5279.15, 750.00)` matches Phase 4 1D column layout documentation coordinates before Phase 6 2D feature reordering. |
| Hash `c09aba8f...` | Actual Stage 12 hash: `af0ce238...` | **UNKNOWN** | The origin of hash `c09aba8f...` cannot be reproduced from live Candidate E Stage 12 output. |

---

## 9. Clearance Metric Breakdown (39.99px vs 40.0px)

* **Raw Measured Value**: `39.99905982905989 px`
* **Formal Requirement**: `clearance >= 40.0 px`
* **Mathematical Comparison**: `39.99905982905989 >= 40.0` is **`false`**.
* **Epsilon Deficit**: `0.00094017094011 px`
* **Automated Regression Threshold**: `39.99 px` (`expect(clearance).toBeGreaterThanOrEqual(39.99)` in `Phase6B_LocalityCompaction.test.ts`)
* **Automated Test Status**: **PASS**
* **Conclusion**: The automated test suite passes because the threshold was set to `39.99 px` to accommodate sub-pixel floating point rounding in spatial hash grid assignment. The formal mathematical requirement of `>= 40.0 px` is strictly unsatisfied by `0.00094 px`.

---

## 10. Locality Metric Analysis & Governance Status

* **Observed Geometry Measurements**:
  * `medianIntraFeatureEdgeLength`: `1101.68 px`
  * `medianInterFeatureEdgeLength`: `1020.00 px`
* **Contract Evaluation (`medianIntra < medianInter`)**: **`false`** (`1101.68 > 1020.00`).
* **Geometric Cause**: In 2D multi-row band layouts, vertical 4-layer spans within a feature band (`~1101px`) inherently exceed the horizontal spacing gap between adjacent feature bands (`1020px`).
* **Governance Status**: **UNRESOLVED**. The current geometry does not satisfy the historical locality condition (`D_intra < D_inter`), and no formal governance decision has been recorded to retire or modify this acceptance condition.

---

## 11. Code Change Necessity Assessment by Category

| Category | Status | Details |
|---|---|---|
| **Hybrid Engine / Layout Runtime** | NO DEFECT OBSERVED | `computeArchitectureLayout` deterministically computes Candidate E coordinates ($C_{\text{total}} = 94,662$). |
| **Browser Renderer** | NO DEFECT OBSERVED | Cytoscape model receives exact Stage 12 coordinates with 0.00000 px drift. |
| **Position Authority** | NO DEFECT OBSERVED | Priority hierarchy Level 1–5 operates deterministically. |
| **Production Fixture Routing** | DEFECT PROVEN | Clean deep-link `?project=cloud-spend-tracker` returns 404 because `explorer/public/projects/*` is gitignored. |
| **Test Harness** | INFORMATIONAL | Harness correctly mounts fixture into gitignored path for browser testing. |
| **Historical Documentation** | DEFECT PROVEN | Section 4 of Phase 15C report contains stale text figures and non-existent nodes. |
| **Acceptance Thresholds** | INFORMATIONAL | Sub-pixel deficit (`39.99906 px < 40.0 px`) is allowed by automated threshold (`39.99 px`). |
| **Governance Requirements** | UNRESOLVED | Governance status of locality requirement ($D_{\text{intra}} < D_{\text{inter}}$) remains unresolved. |

---

## 12. Final Evidence Matrix

| Question | Verified Answer | Evidence |
|---|---|---|
| **Same source revision?** | YES | Git commit HEAD on branch |
| **Same relevant source files?** | YES | `architecture-layout.ts` SHA-256 `e2f1a6c4...` |
| **Same fixture SHA?** | YES | `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` |
| **Same parsed graph?** | YES | 240 nodes, 1,024 edges |
| **Same configuration?** | YES | `enableFeatureLayout: true`, default spacing options |
| **Same Stage 0 hash?** | YES | `182799dfd39547d46bc1edb58d52e680e2c0f7defcea3a469ee553926d07b37b` |
| **Same Stage 12 hash?** | YES | `af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30` |
| **Explicit 240-node 15B-vs-15C diff performed?** | NO | Equality established via Stage 12 position map hash match |
| **15B/15C coordinate difference reproduced?** | NO | Direct execution yields 0.00000 px difference between 15B and 15C engine calls |
| **Historical 15C coordinate error proven?** | YES | `ApexClass:SharedUtility` in 15C text proven non-existent in fixture |
| **Clean production deep-link loads canonical fixture?** | NO | Returns HTTP 404 because `explorer/public/projects/*` is gitignored |
| **Browser harness loads canonical fixture?** | YES | Harness copies fixture into gitignored public path before test run |
| **Same Position Authority result?** | YES | Level 4 selected for automatic hybrid mode |
| **Same Cytoscape coordinates?** | YES | 0.00000 px drift in Cytoscape model |
| **Runtime defect observed?** | NO | Engine executes deterministically without runtime errors |
| **Renderer defect observed?** | NO | Renderer matches Stage 12 model coordinates exactly |
| **Production data-path issue observed?** | YES | Gitignored public project folder prevents clean deep-link loading |
| **Test-harness issue observed?** | NO | Test harness operates as designed to mount test fixtures |
| **Documentation error observed?** | YES | Phase 15C report text contains stale column layout figures |
| **40px mathematical requirement satisfied?** | NO | Raw measurement `39.99905982905989 px` is `< 40.0 px` by `0.00094 px` |
| **Automated 39.99px threshold satisfied?** | YES | `expect(clearance).toBeGreaterThanOrEqual(39.99)` passes |
| **Locality requirement satisfied?** | NO | `medianIntra` (`1101.68 px`) > `medianInter` (`1020.00 px`) |
| **Locality governance status resolved?** | NO | No formal decision recorded to retire or revise locality condition |
| **Production code change proven necessary?** | NO | No production code modifications performed in Phase 15T |

---

## 13. Final Classification

```text
A. Hybrid Engine / Layout Runtime
Status: NO DEFECT OBSERVED
Evidence: Direct engine execution yields Stage 12 hash af0ce238... and exact Candidate E crossing count C_total = 94,662.
Confidence: PROVEN

B. Position Authority / Renderer
Status: NO DEFECT OBSERVED
Evidence: Live Cytoscape model coordinates match Stage 12 output with 0.00000 px drift across Level 1–5 authority checks.
Confidence: PROVEN

C. Production Data Routing
Status: DEFECT PROVEN
Evidence: Clean deep-link ?project=cloud-spend-tracker returns 404 because explorer/public/projects/* is gitignored.
Confidence: PROVEN

D. Browser/Test Harness
Status: INFORMATIONAL
Evidence: Harness pre-populates gitignored public path, enabling browser acceptance tests to exercise the canonical fixture.
Confidence: PROVEN

E. Historical Documentation
Status: DEFECT PROVEN
Evidence: Phase 15C Section 4 text lists non-existent node ApexClass:SharedUtility and stale Phase 4 column coordinates.
Confidence: PROVEN

F. Acceptance Thresholds
Status: INFORMATIONAL
Evidence: Minimum clearance is 39.99906 px (< 40.0 px formal requirement, but >= 39.99 px automated test threshold).
Confidence: PROVEN

G. Governance Requirements
Status: UNRESOLVED
Evidence: Observed geometry (medianIntra 1101.68 px > medianInter 1020.00 px) fails historical locality condition; governance status unrecorded.
Confidence: SUPPORTED
```
