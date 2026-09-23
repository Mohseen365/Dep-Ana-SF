# PHASE 16A — DECISION EVIDENCE RESOLUTION REPORT

## Executive Summary

This report delivers the evidence resolution for the four open governance and evidence questions identified in Phase 16 (`PHASE16_POST_15T_REMEDIATION_DECISION_AND_EVIDENCE_PLAN.md`).

Following `AGENT.md` as the context navigation guide, authoritative repository files were inspected to resolve whether explicit decisions or specifications exist for:
1. **Production Fixture Provisioning**
2. **40px Clearance Acceptance**
3. **Locality Acceptance Criterion**
4. **Historical Documentation Policy**

This phase implements no remediation, modifies no production code, tests, fixtures, layout algorithms, Position Authority, renderer behavior, routing behavior, thresholds, or historical audit reports, and authorizes no implementation.

---

## Question A — Production Fixture Provisioning

### 1. Question
Determine whether the repository contains an authoritative statement of how project/benchmark fixtures are supposed to be available to production.

### 2. Authoritative Sources Inspected
* `08_Audit_Source_Register.md`
* `EXPLORER_CONTRACT.md`
* `EXPLORER_ARCHITECTURE.md`
* `MULTI_PROJECT_FOUNDATION.md`
* `04_MultiProject_State_Persistence.md`
* `audit-reports/features/FEAT-STATE-report-v2.md`
* `audit-reports/features/FEAT-CONTRACT-report-v2.md`
* `PHASE15A_CLEANROOM_RUNTIME_TRUTH_REPORT.md`
* `PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md`
* `PHASE16_POST_15T_REMEDIATION_DECISION_AND_EVIDENCE_PLAN.md`
* `.gitignore`
* `scripts/export-explorer.cjs`
* `scripts/run-explorer.cjs`
* `scripts/test-multi-project.cjs`

### 3. Evidence Found
* Analysis CLI scripts (`export-explorer.cjs`, `run-explorer.cjs`, `test-multi-project.cjs`) export analyzed projects to `analyze/projects/<project-id>/` and copy browser contract JSON files to `explorer/public/projects/<project-id>/explorer-data.json`.
* `.gitignore` explicitly ignores `explorer/public/projects/*` (excluding `.gitkeep`).
* The benchmark fixture `audit-fixtures/cloud-spend-tracker/explorer-data.json` is stored under `audit-fixtures/` at the repository root and is pre-populated into `explorer/public/projects/cloud-spend-tracker/explorer-data.json` by automated browser test harnesses prior to launching Vite.
* In a clean repository checkout without running CLI analysis export or test harness setup, requesting `?project=cloud-spend-tracker` returns HTTP 404 because `explorer/public/projects/cloud-spend-tracker/explorer-data.json` is gitignored and absent.
* No authoritative specification document in the repository explicitly states whether benchmark/project fixtures in production are expected to be statically bundled in git, generated during a build/export step via analysis CLI, provisioned separately, dynamically served by a backend, or intentionally unavailable in a clean checkout.

### 4. Classification
`UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND`

### 5. What Remains Unresolved
Whether benchmark/project fixtures are expected to be:
* statically bundled in git/distribution,
* generated during a build/export step,
* provisioned separately/externally served,
* dynamically served,
* or intentionally unavailable in a clean checkout without running analysis export.

### 6. Decision Required Before Implementation
Determine the authoritative production provisioning model for project fixtures.

---

## Question B — 40px Clearance Acceptance

### 1. Question
Determine whether an authoritative source explicitly reconciles the formal requirement (`>= 40.0px`) with automated test enforcement (`>= 39.99px`).

### 2. Authoritative Sources Inspected
* `audit-reports/features/FEAT-LAYOUT-report-v2.md`
* `HYBRID_LAYOUT_PHASE6_B_FEATURE_LOCALITY_REPORT.md`
* `HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md`
* `explorer/src/lib/layout/spacing.ts`
* `explorer/src/lib/layout/evaluate-layout.ts`
* `explorer/src/test/Phase6B_LocalityCompaction.test.ts`
* `PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md`
* `PHASE16_POST_15T_REMEDIATION_DECISION_AND_EVIDENCE_PLAN.md`

### 3. Evidence Found
* `FEAT-LAYOUT-report-v2.md` lists formal "Minimum Node Clearance: 40.0 px" in its authoritative metrics summary.
* Stage 11 spatial hash grid cleanup (`spacing.ts`) yields a raw calculated minimum clearance of `39.99905982905989 px` on Candidate E due to sub-pixel floating-point rounding.
* Automated regression test suites (`Phase6B_LocalityCompaction.test.ts`) enforce `expect(clearance).toBeGreaterThanOrEqual(39.99)`.
* `PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md` confirms that raw measurement `39.99905982905989 px` is mathematically `< 40.0 px` (a formal deficit of `0.00094 px`), while passing the `>= 39.99 px` test threshold.
* No authoritative source or governance artifact in the repository explicitly reconciles the formal requirement (`>= 40.0px`) with automated enforcement (`>= 39.99px`) or records a formal decision adopting `39.99px` as the contractual specification.

### 4. Classification
`UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND`

### 5. What Remains Unresolved
Whether the formal `>= 40.0px` requirement remains strictly contractual (requiring layout engine adjustment) or whether the existing `>= 39.99px` automated tolerance is formally acceptable as the contractual specification.

### 6. Decision Required Before Implementation
Authoritative governance decision reconciling the formal requirement with automated enforcement.

---

## Question C — Locality Criterion

### 1. Question
Determine whether an authoritative source explicitly establishes that `medianIntraFeatureEdgeLength < medianInterFeatureEdgeLength` remains an active acceptance criterion for the current 2D multi-row layout.

### 2. Authoritative Sources Inspected
* `HYBRID_LAYOUT_PHASE5_B_FEATURE_INTERNAL_GEOMETRY_REPORT.md`
* `HYBRID_LAYOUT_PHASE5_D_CANONICAL_ACCEPTANCE_REPORT.md`
* `HYBRID_LAYOUT_PHASE6_B_FEATURE_LOCALITY_REPORT.md`
* `HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md`
* `HYBRID_LAYOUT_PHASE7B_FINAL_CROSSING_GAP_REPORT.md`
* `audit-reports/features/FEAT-LAYOUT-report-v2.md`
* `PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md`
* `PHASE16_POST_15T_REMEDIATION_DECISION_AND_EVIDENCE_PLAN.md`

### 3. Evidence Found
* In Candidate E's 2D multi-row layout, individual features span presentation, application, domain, and schema layers vertically across Y distances (`~1101.68 px`), whereas horizontal 2D band packing places adjacent feature bands close together (`1020.00 px`).
* Consequently, `medianIntraFeatureEdgeLength` (`1101.68 px`) exceeds `medianInterFeatureEdgeLength` (`1020.00 px`), evaluating `medianIntra < medianInter` to `FALSE`.
* `HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md` Section 1, 8, 9, 21, and 24 explicitly notes that this failure blocks production activation under the historical gate, analyzing it as a metric artifact driven by 4-layer vertical Y hierarchy spanning vs horizontal band packing, and notes that future gates should formally adopt layer-filtered locality metrics (`D_intra, same-layer < D_inter, same-layer`).
* `PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md` Section 10 and 13 confirms that governance status remains `UNRESOLVED` as no formal governance decision has been recorded to retire, modify, or re-affirm the historical locality condition for 2D multi-row Candidate E layouts.

### 4. Classification
`UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND`

### 5. What Remains Unresolved
Whether `medianIntraFeatureEdgeLength < medianInterFeatureEdgeLength` remains an active contractual acceptance criterion for Candidate E / 2D multi-row layouts or whether an updated layer-filtered locality criterion (`D_intra, same-layer < D_inter, same-layer`) should formally replace it.

### 6. Decision Required Before Implementation
Authoritative governance decision confirming whether `medianIntra < medianInter` remains an active acceptance criterion for Candidate E / 2D multi-row layouts.

---

## Question D — Historical Documentation Policy

### 1. Question
Determine whether an authoritative repository rule explicitly establishes how historical audit discrepancies are handled:
* retroactive historical-report modification, or
* reconciliation through later/active audit documentation.

### 2. Authoritative Sources Inspected
* `08_Audit_Source_Register.md` (Recency / conflict rule)
* `AGENT.md` (Retrieval Flows & Source Relationships)
* `PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md`
* `PHASE16_POST_15T_REMEDIATION_DECISION_AND_EVIDENCE_PLAN.md`

### 3. Evidence Found
* `08_Audit_Source_Register.md` contains an explicit, authoritative "Recency / conflict rule":
  * Rule 1: "Archive file creation timestamp is the primary chronology signal."
  * Rule 2: "When statements conflict, the later-created audit is authoritative."
  * Rule 3: "Within the same timestamp/day, explicit phase/wave progression and executable/runtime evidence take precedence over earlier baseline/planning narratives."
  * Rule 4: "Historical findings are retained only when they explain why a later decision exists; superseded conclusions are not presented as current state."
* Active reconciliation reports (e.g. `PHASE15T_...` Section 1 & 8, `PHASE16_...` Track D) document and classify historical errors (such as `ApexClass:SharedUtility` being a proven documentation error in Phase 15C) without retroactively editing past report files.
* The repository recency/conflict rule explicitly establishes that later-created audit documents are authoritative for reconciliation, while historical reports are retained as historical record rather than retroactively modified.

### 4. Classification
`PROVEN`

### 5. What Remains Unresolved
Nothing remains unresolved regarding the repository's historical-documentation reconciliation rule.

### 6. Decision Required Before Implementation
No governance decision remains unresolved for this question. The established repository rule directs reconciliation through later/active authoritative audit documentation rather than retroactive modification of historical reports.

---

## Final Decision Matrix

| Area | Evidence Status | Governance/Architecture Decision | Implementation Authorized |
| --- | --- | --- | --- |
| **Production routing** | UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND | Determine the authoritative production provisioning model for project fixtures. | NO |
| **40px acceptance** | UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND | Authoritative governance decision reconciling the formal requirement with automated enforcement. | NO |
| **Locality** | UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND | Authoritative governance decision confirming whether `medianIntra < medianInter` remains an active acceptance criterion for Candidate E / 2D multi-row layouts. | NO |
| **Historical documentation** | PROVEN | Apply the established recency/conflict rule: later/active authoritative audit documentation reconciles historical discrepancies; historical reports are retained as historical record. | NO |

---

## Final Phase 16A Status

```text
FINAL PHASE 16A STATUS:
NO IMPLEMENTATION AUTHORIZED
```

### Rationale
The evidence resolution confirms that Questions A, B, and C remain `UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND` within the codebase documents, while Question D is `PROVEN` under the recency/conflict rule in `08_Audit_Source_Register.md`. No implementation is authorized.
