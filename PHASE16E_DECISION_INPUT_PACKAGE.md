# PHASE 16E — DECISION INPUT PACKAGE

## 1. Purpose

This document provides a concise, evidence-backed decision input package for the three unresolved governance and architectural decisions recorded as `PENDING` in `PHASE16D_DECISION_RECORD.md`. The purpose of this package is to allow an authorized project or system owner to evaluate and make the required decisions based on established repository evidence.

In accordance with strict governance directives, this document makes no decisions, recommends no options, ranks or scores no candidates, predicts no consequences as fact, and authorizes no remediation implementation or production behavior modification.

---

## 2. Decision A — Production Fixture Provisioning

### Established Facts

* **Clean production deep-link behavior**: Requesting `?project=cloud-spend-tracker` in a clean checkout returns HTTP 404 because `explorer/public/projects/cloud-spend-tracker/explorer-data.json` is absent on disk, causing fallback to `explorer/public/explorer-data.json` (the 4-node public default).
* **Gitignored project fixture path**: `.gitignore` explicitly ignores `explorer/public/projects/*` (excluding `.gitkeep`).
* **Test-harness provisioning behavior**: Automated browser test suites (Playwright) pass because the test harness populates `explorer/public/projects/cloud-spend-tracker/explorer-data.json` by copying `audit-fixtures/cloud-spend-tracker/explorer-data.json` prior to starting Vite.
* **CLI export behavior**: Analysis CLI scripts (`export-explorer.cjs`, `run-explorer.cjs`, `test-multi-project.cjs`) write contract files to `analyze/projects/<project-id>/` and copy contract JSON files to `explorer/public/projects/<project-id>/explorer-data.json`.
* **Absence of an authoritative production provisioning model**: No authoritative specification or architectural contract document in the repository explicitly defines the intended production provisioning model for project/benchmark fixtures.

### Decision Question

What is the authoritative production provisioning model for project/benchmark fixtures?

### Available Options

#### Option 1: Statically Bundled

* **Context & Meaning**: Project/benchmark fixtures are tracked in git and statically bundled in the distribution under public asset directories (e.g., un-gitignoring `explorer/public/projects/` or committing fixtures into `public/`).
* **Relevant Existing Evidence**:
  * Root benchmark fixture exists at `audit-fixtures/cloud-spend-tracker/explorer-data.json` tracked in git (`PHASE16A_DECISION_EVIDENCE_RESOLUTION_REPORT.md` Section Question A).
  * `.gitignore` currently excludes `explorer/public/projects/*` (`.gitignore` line 9).
* **Required Authoritative Evidence**: An authoritative architectural decision or specification explicitly mandating git tracking and static bundling of project fixtures in distribution assets.

#### Option 2: Generated During Build/Export

* **Context & Meaning**: Project fixtures are generated or copied during a build or export pipeline step prior to deployment (e.g., executing `export-explorer.cjs` or a build script during CI/CD publishing).
* **Relevant Existing Evidence**:
  * Analysis CLI tools (`export-explorer.cjs`, `run-explorer.cjs`, `test-multi-project.cjs`) write contract JSON files to `analyze/projects/<project-id>/` and copy them to `explorer/public/projects/<project-id>/explorer-data.json` (`PHASE16C_GOVERNANCE_DECISION_RESOLUTION_REPORT.md` Section 2).
  * Build scripts (`package.json`) currently do not execute `export-explorer.cjs` or fixture copying as part of `npm run build`.
* **Required Authoritative Evidence**: An authoritative build/deployment specification defining mandatory build-time or export-time fixture generation and asset copying.

#### Option 3: Provisioned Separately

* **Context & Meaning**: Project fixtures are provisioned separately from the core application source, such as external asset distribution, object storage, or post-deployment provisioning processes.
* **Relevant Existing Evidence**:
  * Automated browser test harnesses operate as an external provisioner by copying root benchmark files into `explorer/public/projects/` prior to web server launch (`PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md` Section 6).
* **Required Authoritative Evidence**: An authoritative operational deployment guide or infrastructure specification defining separate fixture provisioning workflows.

#### Option 4: Dynamically Served

* **Context & Meaning**: Project fixtures are dynamically served or requested from a backend service, API endpoint, or storage service at runtime rather than loaded as static relative public JSON files.
* **Relevant Existing Evidence**:
  * Client application fetches project data via HTTP `fetch` in `ProjectContext.tsx` requesting relative URL paths `/projects/<projectId>/explorer-data.json` (`PHASE15A_CLEANROOM_RUNTIME_TRUTH_REPORT.md`).
* **Required Authoritative Evidence**: An authoritative backend API contract or architecture specification defining dynamic endpoint serving for project fixtures.

#### Option 5: Intentionally Unavailable in a Clean Checkout

* **Context & Meaning**: Project/benchmark fixtures are intentionally unavailable in a clean checkout, requiring explicit local analysis CLI execution (`run-explorer.cjs` or `export-explorer.cjs`) by a user before deep-linking to specific projects.
* **Relevant Existing Evidence**:
  * Clean repository checkout requesting `?project=cloud-spend-tracker` without prior analysis export yields HTTP 404 and falls back to `explorer/public/explorer-data.json` (`PHASE16B_REMEDIATION_DECISION_PACKAGE.md` Section 2).
* **Required Authoritative Evidence**: An authoritative product requirement or user workflow specification stating that clean checkouts intentionally lack pre-analyzed project data.

---

## 3. Decision B — 40px Acceptance Contract

### Established Facts

* **Formal requirement**: `>= 40.0px` (`FEAT-LAYOUT-report-v2.md` summary tables specify "Minimum Node Clearance: 40.0 px").
* **Automated enforcement**: `>= 39.99px` (`Phase6B_LocalityCompaction.test.ts` asserts `expect(clearance).toBeGreaterThanOrEqual(39.99)`).
* **Candidate E measured value**: `39.99905982905989px` (measured in Stage 11 spatial hash grid cleanup `spacing.ts` on the 240-node Cloud Spend dataset).
* **Formal mathematical deficit**: `0.00094017094011px` (`39.99905982905989px` is strictly less than `40.0px` by `0.00094017094011px`).

### Decision Question

Does the formal `>= 40.0px` requirement remain the contractual acceptance criterion, or is the existing `>= 39.99px` automated tolerance formally accepted as the contractual criterion?

### Available Options

#### Option 1: Retain `>= 40.0px` as Contractual Acceptance Criterion

* **Governing Acceptance Contract**: The formal requirement `>= 40.0px` governs release acceptance. Any layout measurement below `40.00000px` (including sub-pixel values such as `39.99906px`) constitutes an acceptance failure.
* **Relevant Existing Evidence**:
  * `FEAT-LAYOUT-report-v2.md` summary table lists "Minimum Node Clearance: 40.0 px".
  * Raw Candidate E measurement is `39.99905982905989px`, mathematically failing `>= 40.0px` by `0.00094px` (`PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md` Section 9).
* **Required Authoritative Approval/Evidence**: Authoritative governance decision confirming that `>= 40.0px` remains strictly contractual without sub-pixel tolerance.

#### Option 2: Formally Accept `>= 39.99px` as Contractual Acceptance Criterion

* **Governing Acceptance Contract**: The automated threshold `>= 39.99px` governs release acceptance, formally incorporating sub-pixel floating-point rounding tolerance. Candidate E measurement `39.99906px` constitutes an acceptance pass.
* **Relevant Existing Evidence**:
  * Regression test suite `Phase6B_LocalityCompaction.test.ts` enforces `expect(clearance).toBeGreaterThanOrEqual(39.99)`.
  * Candidate E measurement `39.99905982905989px` satisfies `>= 39.99px` (`PHASE16A_DECISION_EVIDENCE_RESOLUTION_REPORT.md` Question B).
* **Required Authoritative Approval/Evidence**: Authoritative governance decision formally revising the formal release contract specification to match the `>= 39.99px` automated test enforcement.

---

## 4. Decision C — Locality Acceptance Criterion

### Established Facts

* **Historical criterion**: `medianIntraFeatureEdgeLength < medianInterFeatureEdgeLength`.
* **Candidate E measurements**: `medianIntraFeatureEdgeLength = 1101.68px`, `medianInterFeatureEdgeLength = 1020.00px`.
* **Current FALSE result**: The historical condition evaluates to `FALSE` (`1101.68px > 1020.00px`).
* **2D multi-row geometry**: Individual features span presentation, application, domain, and schema layers vertically across Y distances (~1101.68px), whereas horizontal 2D band packing places adjacent feature bands close together (~1020.00px).
* **Historical layer-filtered locality discussion**: Historical audit report `HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md` analyzes this result as a geometric property of multi-row 2D layer-band layouts and discusses evaluating layer-filtered locality metrics (`D_intra, same-layer < D_inter, same-layer`).

### Decision Question

Should the historical `medianIntra < medianInter` criterion remain active for the current 2D multi-row layout, or should an explicitly authorized replacement criterion be adopted?

### Available Options

#### Option 1: Retain Historical `medianIntra < medianInter` Criterion

* **Governing Acceptance Criterion**: The un-filtered condition `medianIntraFeatureEdgeLength < medianInterFeatureEdgeLength` remains active and binding for release acceptance.
* **Relevant Existing Evidence**:
  * Historical quality gate specifications require `medianIntra < medianInter`.
  * Candidate E evaluates `1101.68px < 1020.00px` to `FALSE`, blocking production activation under this historical gate (`HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md` Section 1).
* **Required Authoritative Approval/Evidence**: Authoritative governance decision confirming that `medianIntra < medianInter` remains active and binding despite 2D multi-row band geometry.

#### Option 2: Adopt Explicitly Authorized Replacement Locality Criterion

* **Governing Acceptance Criterion**: An updated, formally approved locality metric (such as layer-filtered locality `D_intra, same-layer < D_inter, same-layer`) replaces the historical un-filtered criterion for 2D multi-row layouts.
* **Relevant Existing Evidence**:
  * On Candidate E, same-layer intra-feature distance (`214.35px`) is 33.1% shorter than same-layer inter-feature distance (`320.50px`) (`PHASE16B_REMEDIATION_DECISION_PACKAGE.md` Section 4).
  * Historical analysis in `HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md` Section 21 suggests layer-filtered evaluation.
* **Required Authoritative Approval/Evidence**: Authoritative governance decision formally adopting a specified replacement locality criterion and retiring the historical un-filtered condition.

---

## 5. Cross-Cutting Implementation Gate

* **Prerequisite Status**: Decisions A, B, and C are mandatory prerequisites for any remediation implementation.
* **Decision Status**: No decision has been made for Decision A, Decision B, or Decision C (`DECISION: PENDING`).
* **Implementation Status**: NO IMPLEMENTATION IS AUTHORIZED.
* **Historical Documentation Policy**: Historical documentation policy is ALREADY RESOLVED (`08_Audit_Source_Register.md` recency/conflict rules apply; historical reports are retained as historical record rather than retroactively modified).
* **Controlling Record**: `PHASE16D_DECISION_RECORD.md` remains the controlling pending-decision record for the system.

---

## 6. Authorized Decision Record

```text
## Authorized Decision Record

### Decision A — Production Fixture Provisioning
Decision:
Authority:
Date:
Evidence/Reference:

### Decision B — 40px Acceptance Contract
Decision:
Authority:
Date:
Evidence/Reference:

### Decision C — Locality Acceptance Criterion
Decision:
Authority:
Date:
Evidence/Reference:
```

---

```text
DECISION INPUT PREPARED — IMPLEMENTATION BLOCKED
```
