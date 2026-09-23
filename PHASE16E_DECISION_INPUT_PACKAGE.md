# PHASE 16E — DECISION INPUT PACKAGE

## 1. Purpose

This document provides a concise, evidence-backed decision input package for the three unresolved governance and architectural decisions recorded as `PENDING` in `PHASE16D_DECISION_RECORD.md`. The purpose of this package is to allow an authorized project or system owner to evaluate and make the required decisions based on established repository evidence.

In accordance with strict governance directives, this document makes no decisions, recommends no options, ranks or scores no candidates, predicts no consequences as fact, and authorizes no remediation implementation or production behavior modification.

---

## 2. Decision A — Production Fixture Provisioning

### Established Facts

* **Clean production deep-link behavior**: `ESTABLISHED FACT` — Requesting `?project=cloud-spend-tracker` in a clean checkout returns HTTP 404 because `explorer/public/projects/cloud-spend-tracker/explorer-data.json` is absent on disk, causing fallback to `explorer/public/explorer-data.json` (the 4-node public default).
* **Gitignored project fixture path**: `ESTABLISHED FACT` — `.gitignore` explicitly ignores `explorer/public/projects/*` (excluding `.gitkeep`).
* **Test-harness provisioning behavior**: `ESTABLISHED FACT` / `TEST-ONLY EVIDENCE — NOT EVIDENCE OF PRODUCTION ARCHITECTURE` — Automated browser test suites (Playwright) pass because the test harness populates `explorer/public/projects/cloud-spend-tracker/explorer-data.json` by copying `audit-fixtures/cloud-spend-tracker/explorer-data.json` prior to starting Vite.
* **CLI export behavior**: `ESTABLISHED FACT` — Analysis CLI scripts (`export-explorer.cjs`, `run-explorer.cjs`, `test-multi-project.cjs`) write contract files to `analyze/projects/<project-id>/` and copy contract JSON files to `explorer/public/projects/<project-id>/explorer-data.json`.
* **Absence of an authoritative production provisioning model**: `ESTABLISHED FACT` — No authoritative specification or architectural contract document in the repository explicitly defines the intended production provisioning model for project/benchmark fixtures.

### Decision Question

What is the authoritative production provisioning model for project/benchmark fixtures?

### Available Options

#### Option 1: Statically Bundled

* **Context & Meaning**: Project/benchmark fixtures are intentionally included in the deployed application distribution as static assets.
* **Relevant Existing Evidence**:
  * `ESTABLISHED FACT` — Root benchmark fixture exists at `audit-fixtures/cloud-spend-tracker/explorer-data.json` tracked in git (`PHASE16A_DECISION_EVIDENCE_RESOLUTION_REPORT.md` Section Question A).
  * `ESTABLISHED FACT` — `.gitignore` currently excludes `explorer/public/projects/*` (`.gitignore` line 9).
  * `INFERENCE` — Neither the tracked benchmark fixture nor the current `.gitignore` state establishes the intended production architecture.
* **Required Authoritative Evidence**: `REQUIRED AUTHORITY` — An authoritative architectural decision or specification explicitly mandating static bundling of project fixtures in distribution assets.

#### Option 2: Generated During Build/Export

* **Context & Meaning**: Project fixtures are generated or copied as part of an authoritative build/export process before deployment.
* **Relevant Existing Evidence**:
  * `ESTABLISHED FACT` — Analysis CLI tools (`export-explorer.cjs`, `run-explorer.cjs`, `test-multi-project.cjs`) write contract JSON files to `analyze/projects/<project-id>/` and copy them to `explorer/public/projects/<project-id>/explorer-data.json` (`PHASE16C_GOVERNANCE_DECISION_RESOLUTION_REPORT.md` Section 2).
  * `INFERENCE` — The existence of CLI export behavior demonstrates that a local generation mechanism exists, but does NOT establish that production deployment is intended to use it.
* **Required Authoritative Evidence**: `REQUIRED AUTHORITY` — An authoritative build/deployment specification defining mandatory build-time or export-time fixture generation and asset copying.

#### Option 3: Provisioned Separately

* **Context & Meaning**: Project fixtures are provisioned separately from the core application source, such as external asset distribution, object storage, or post-deployment provisioning processes.
* **Relevant Existing Evidence**:
  * `ESTABLISHED FACT` — Current repository evidence does not establish a production provisioning workflow of this type.
  * `TEST-ONLY EVIDENCE — NOT EVIDENCE OF PRODUCTION ARCHITECTURE` — Automated browser test harnesses operate as an external provisioner by copying root benchmark files into `explorer/public/projects/` prior to web server launch (`PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md` Section 6).
* **Required Authoritative Evidence**: `REQUIRED AUTHORITY` — An authoritative operational deployment guide or infrastructure specification defining separate fixture provisioning workflows.

#### Option 4: Dynamically Served

* **Context & Meaning**: Project fixtures are dynamically served or requested from a backend service, API endpoint, or storage service at runtime rather than loaded as static relative public JSON files.
* **Relevant Existing Evidence**:
  * `ESTABLISHED FACT` — The application currently requests project fixture data through an HTTP URL. This establishes the transport mechanism but does not establish whether the resource is a static asset, generated asset, externally provisioned asset, backend response, or another delivery mechanism.
  * `INFERENCE` — Client HTTP `fetch()` calls do not establish that a dynamic backend architecture exists.
* **Required Authoritative Evidence**: `REQUIRED AUTHORITY` — An authoritative backend API contract or architecture specification defining dynamic endpoint serving for project fixtures.

#### Option 5: Intentionally Unavailable in a Clean Checkout

* **Context & Meaning**: Project/benchmark fixtures are intentionally unavailable in a clean checkout, requiring explicit local analysis CLI execution (`run-explorer.cjs` or `export-explorer.cjs`) by a user before deep-linking to specific projects.
* **Relevant Existing Evidence**:
  * `OBSERVED BEHAVIOR` — Clean repository checkout requesting `?project=cloud-spend-tracker` without prior analysis export yields HTTP 404 and falls back to `explorer/public/explorer-data.json` (`PHASE16B_REMEDIATION_DECISION_PACKAGE.md` Section 2).
  * `INFERENCE` — The 404/fallback demonstrates what happens in a clean checkout, but does NOT establish that this behavior represents `INTENDED PRODUCT ARCHITECTURE`.
* **Required Authoritative Evidence**: `REQUIRED AUTHORITY` — An authoritative product, architecture, or workflow specification explicitly stating that clean checkouts are intentionally expected to lack pre-analyzed project fixtures.

---

## 3. Decision B — 40px Acceptance Contract

### Established Facts

* **Formal requirement**: `ESTABLISHED FACT` — `>= 40.0px` (`FEAT-LAYOUT-report-v2.md` summary tables specify "Minimum Node Clearance: 40.0 px").
* **Automated enforcement**: `ESTABLISHED FACT` — `>= 39.99px` (`Phase6B_LocalityCompaction.test.ts` asserts `expect(clearance).toBeGreaterThanOrEqual(39.99)`).
* **Candidate E measured value**: `ESTABLISHED FACT` — `39.99905982905989px` (measured in Stage 11 spatial hash grid cleanup `spacing.ts` on the 240-node Cloud Spend dataset).
* **Formal mathematical deficit**: `ESTABLISHED FACT` — `0.00094017094011px` (`39.99905982905989px` is strictly less than `40.0px` by `0.00094017094011px`).

### Decision Question

Does the formal `>= 40.0px` requirement remain the contractual acceptance criterion, or is the existing `>= 39.99px` automated tolerance formally accepted as the contractual criterion?

### Available Options

#### Option 1: Retain `>= 40.0px` as Contractual Acceptance Criterion

* **Governing Acceptance Contract**: If formally adopted, `>= 40.0px` would remain the governing acceptance requirement.
* **Relevant Existing Evidence**:
  * `ESTABLISHED FACT` — `FEAT-LAYOUT-report-v2.md` summary table lists "Minimum Node Clearance: 40.0 px".
  * `ESTABLISHED FACT` — Raw Candidate E measurement is `39.99905982905989px`, mathematically failing `>= 40.0px` by `0.00094px` (`PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md` Section 9).
* **Required Authoritative Approval/Evidence**: `REQUIRED AUTHORITY` — Authoritative governance decision confirming that `>= 40.0px` remains strictly contractual without sub-pixel tolerance.

#### Option 2: Formally Accept `>= 39.99px` as Contractual Acceptance Criterion

* **Governing Acceptance Contract**: If formally adopted, `>= 39.99px` would become the governing automated/contractual acceptance threshold.
* **Relevant Existing Evidence**:
  * `ESTABLISHED FACT` — Regression test suite `Phase6B_LocalityCompaction.test.ts` enforces `expect(clearance).toBeGreaterThanOrEqual(39.99)`.
  * `HISTORICAL DISCUSSION` — Historical code/comments associate the `39.99px` tolerance with sub-pixel floating-point behavior during spatial cleanup, but Phase 16A classified this rationale as supported rather than conclusively contractual.
  * `ESTABLISHED FACT` — Candidate E measurement `39.99905982905989px` satisfies `>= 39.99px` (`PHASE16A_DECISION_EVIDENCE_RESOLUTION_REPORT.md` Question B).
* **Required Authoritative Approval/Evidence**: `REQUIRED AUTHORITY` — Authoritative governance decision formally revising the formal release contract specification to match the `>= 39.99px` automated test enforcement.

---

## 4. Decision C — Locality Acceptance Criterion

### Established Facts

* **Historical criterion**: `HISTORICAL DISCUSSION` — `medianIntraFeatureEdgeLength < medianInterFeatureEdgeLength`.
* **Candidate E measurements**: `ESTABLISHED FACT` — `medianIntraFeatureEdgeLength = 1101.68px`, `medianInterFeatureEdgeLength = 1020.00px`.
* **Current FALSE result**: `ESTABLISHED FACT` — The historical condition evaluates to `FALSE` (`1101.68px > 1020.00px`).
* **2D multi-row geometry**: `ESTABLISHED FACT` — Individual features span presentation, application, domain, and schema layers vertically across Y distances (~1101.68px), whereas horizontal 2D band packing places adjacent feature bands close together (~1020.00px).
* **Historical layer-filtered locality discussion**: `HISTORICAL DISCUSSION` — Historical analysis discussed layer-filtered locality metrics as a possible future evaluation approach (`HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md` Section 21). This discussion does not constitute authorization.

### Decision Question

Should the historical `medianIntra < medianInter` criterion remain active for the current 2D multi-row layout, or should an explicitly authorized replacement criterion be adopted?

### Available Options

#### Option 1: Retain Historical `medianIntra < medianInter` Criterion

* **Governing Acceptance Criterion**: If formally adopted, the historical `medianIntra < medianInter` criterion would remain active.
* **Relevant Existing Evidence**:
  * `HISTORICAL DISCUSSION` — Historical quality gate specifications require `medianIntra < medianInter`.
  * `ESTABLISHED FACT` — Candidate E evaluates `1101.68px < 1020.00px` to `FALSE`, blocking production activation under this historical gate (`HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md` Section 1).
* **Required Authoritative Approval/Evidence**: `REQUIRED AUTHORITY` — Authoritative governance decision confirming that `medianIntra < medianInter` remains active and binding despite 2D multi-row band geometry.

#### Option 2: Adopt Explicitly Authorized Replacement Locality Criterion

* **Governing Acceptance Criterion**: If formally adopted, an explicitly specified and authorized replacement locality criterion would govern the relevant acceptance decision.
* **Relevant Existing Evidence**:
  * `ESTABLISHED FACT` — On Candidate E, same-layer intra-feature distance (`214.35px`) is 33.1% shorter than same-layer inter-feature distance (`320.50px`) (`PHASE16B_REMEDIATION_DECISION_PACKAGE.md` Section 4).
  * `HISTORICAL DISCUSSION` — Historical analysis discussed layer-filtered locality metrics as a possible future evaluation approach. This discussion does not constitute authorization.
* **Required Authoritative Approval/Evidence**: `REQUIRED AUTHORITY` — Authoritative governance decision formally adopting a specified replacement locality criterion and retiring the historical un-filtered condition.

---

## 5. Cross-Cutting Implementation Gate

* **Prerequisite Status**: The current Phase 16 decision record treats Decisions A, B, and C as unresolved gates blocking remediation authorization.
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
