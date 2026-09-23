# PHASE 16B — REMEDIATION DECISION PACKAGE

## 1. Executive Decision Summary

This report converts the evidence baseline established in Phase 16A (`PHASE16A_DECISION_EVIDENCE_RESOLUTION_REPORT.md`) into a structured remediation decision package.

Three open architectural and governance decisions are characterized (Production Fixture Provisioning, 40px Acceptance Contract, Locality Acceptance Criterion), and the established repository rule for Historical Documentation Policy is confirmed.

For each open decision, this package strictly delineates:
1. **What is factually established**
2. **What decision remains unresolved**
3. **What implementation is blocked**

No remediation implementation is authorized, no decisions are invented, and no recommendations are made.

---

## 2. Decision A — Production Fixture Provisioning

### Current Evidence State
* **Observed Mechanism**: In a clean repository checkout, requesting `?project=cloud-spend-tracker` in the browser returns HTTP 404 because `explorer/public/projects/*` is gitignored and `explorer/public/projects/cloud-spend-tracker/explorer-data.json` does not exist on disk in `public/`.
* **Fallback Behavior**: The browser application falls back to `explorer/public/explorer-data.json` (the 4-node public default).
* **Test Harness Contrast**: Browser acceptance test suites (Playwright) pass because the test harness explicitly populates gitignored `explorer/public/projects/cloud-spend-tracker/explorer-data.json` by copying `audit-fixtures/cloud-spend-tracker/explorer-data.json` prior to starting Vite.
* **CLI Analysis Pipeline**: Analysis scripts (`export-explorer.cjs`, `run-explorer.cjs`, `test-multi-project.cjs`) export project artifacts to `analyze/projects/<project-id>/` and copy contract JSON files to `explorer/public/projects/<project-id>/explorer-data.json`.
* **Unresolved Evidence State**: Phase 16A established `UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND` because no specification document explicitly defines how benchmark/project fixtures are expected to be available to production.

### Decision Required
Determine the authoritative production provisioning model for project fixtures among the candidate models identified in Phase 16A:
* statically bundled in git/distribution,
* generated during a build/export step,
* provisioned separately/externally served,
* dynamically served by a backend,
* or intentionally unavailable in a clean checkout without running analysis export.

### Evidence Required
Authoritative architectural specification or product requirements document explicitly defining the production provisioning model for project/benchmark fixtures.

### Decision Owner / Authority Required
System Architect / Product Owner.

### Blocked Until Decision
Any implementation modification to public asset build/export scripts, static public asset copying, public routing handlers, or asset bundling configuration remains strictly blocked.

### Implementation Status
NOT AUTHORIZED

---

## 3. Decision B — 40px Acceptance Contract

### Current Evidence State
* **Formal Requirement**: The formal layout specification (`audit-reports/features/FEAT-LAYOUT-report-v2.md`) specifies a minimum node clearance of `>= 40.0px`.
* **Automated Enforcement**: Regression test suites (`Phase6B_LocalityCompaction.test.ts`) enforce `expect(clearance).toBeGreaterThanOrEqual(39.99)`.
* **Measured Candidate E Runtime Value**: Stage 11 spatial hash grid cleanup (`spacing.ts`) yields a raw calculated minimum clearance of `39.99905982905989px` on the canonical 240-node Cloud Spend dataset due to sub-pixel floating-point rounding.
* **Deficit**: Raw measurement `39.99905982905989px` mathematically fails the formal requirement (`>= 40.0px`) by `0.00094017094011px` while passing the automated test threshold (`>= 39.99px`).
* **Unresolved Evidence State**: Phase 16A established `UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND` because no authoritative source explicitly reconciles the formal requirement with automated enforcement or records a decision adopting `39.99px` as the contractual specification.

### Decision Required
Determine whether the formal `40.0px` requirement remains strictly contractual (requiring layout engine clearance adjustment) or whether the existing `39.99px` automated test tolerance is formally acceptable as the contractual specification.

### Evidence Required
Authoritative governance decision reconciling the formal requirement with automated test enforcement.

### Decision Owner / Authority Required
Quality Governance Lead / Layout System Architect.

### Blocked Until Decision
Any modification to layout engine spacing parameters, spatial grid collision cleanup algorithms, or formal release contract threshold specifications remains strictly blocked.

### Implementation Status
NOT AUTHORIZED

---

## 4. Decision C — Locality Acceptance Criterion

### Current Evidence State
* **Historical Condition**: Historical quality gates require `medianIntraFeatureEdgeLength < medianInterFeatureEdgeLength`.
* **Current Candidate E Measurements**: On Candidate E (2D multi-row feature band layout), `medianIntraFeatureEdgeLength = 1101.68px` and `medianInterFeatureEdgeLength = 1020.00px`.
* **Observed Condition Result**: The historical condition evaluates to `FALSE` (`1101.68px > 1020.00px`).
* **Observed Geometry vs Governance Status**:
  - *Observed Geometry*: Individual features span presentation, application, domain, and schema layers vertically across Y distances (`~1101.68px`), whereas 2D horizontal band packing places adjacent feature bands close together (`1020.00px`). Within the same layer, same-feature node distance (`214.35px`) is 33.1% shorter than cross-feature node distance (`320.50px`).
  - *Governance Status*: `UNRESOLVED`. While the geometric cause of the metric failure is understood, no formal governance decision has been recorded to retire, amend, or re-affirm the historical locality condition for 2D multi-row Candidate E layouts.
* **Unresolved Evidence State**: Phase 16A established `UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND`.

### Decision Required
Determine whether `medianIntraFeatureEdgeLength < medianInterFeatureEdgeLength` remains an active contractual acceptance criterion for Candidate E / 2D multi-row layouts or whether an updated layer-filtered locality criterion (`D_intra, same-layer < D_inter, same-layer`) should formally replace it.

### Evidence Required
Authoritative governance decision confirming whether `medianIntra < medianInter` remains an active acceptance criterion for Candidate E / 2D multi-row layouts.

### Decision Owner / Authority Required
Architecture Quality Gate Owner / Governance Lead.

### Blocked Until Decision
Any modification to layout Y-spacing algorithms, feature band geometry, locality metric definitions, or quality gate evaluation logic remains strictly blocked.

### Implementation Status
NOT AUTHORIZED

---

## 5. Historical Documentation Policy

### Established Rule
* Phase 16A established this track as `PROVEN` under the explicit recency and conflict rule defined in `08_Audit_Source_Register.md`:
  - Rule 2: "When statements conflict, the later-created audit is authoritative."
  - Rule 3: "...explicit phase/wave progression and executable/runtime evidence take precedence over earlier baseline/planning narratives."
  - Rule 4: "Historical findings are retained only when they explain why a later decision exists; superseded conclusions are not presented as current state."
* Later/active authoritative audit documentation reconciles historical discrepancies; historical reports are retained as historical record rather than retroactively modified. No governance decision remains unresolved for this question.

### Implementation Status
NO HISTORICAL REPORT MODIFICATION AUTHORIZED

---

## 6. Consolidated Decision Matrix

| Decision | Evidence State | Decision Required | Evidence Required | Implementation |
|---|---|---|---|---|
| **Production fixture provisioning** | UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND | Determine authoritative production provisioning model for project fixtures. | Specification defining fixture packaging/deployment model. | NOT AUTHORIZED |
| **40px acceptance contract** | UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND | Determine whether 40.0px requirement remains contractual or if 39.99px tolerance is acceptable. | Governance decision reconciling formal requirement with test enforcement. | NOT AUTHORIZED |
| **Locality acceptance criterion** | UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND | Determine whether medianIntra < medianInter remains an active criterion for 2D multi-row layouts. | Governance decision confirming or replacing the locality gate criterion. | NOT AUTHORIZED |
| **Historical documentation policy** | PROVEN | Apply established recency/conflict rule (08_Audit_Source_Register.md). | None (Rule established in repository). | NOT AUTHORIZED |

---

## 7. Authorization Boundary

This decision package defines decision requirements and blocked implementation areas only.

It authorizes:
* Zero production code changes
* Zero test changes
* Zero fixture changes
* Zero routing changes
* Zero layout algorithm changes
* Zero Position Authority or renderer changes
* Zero threshold changes
* Zero historical report changes
* Zero `AGENT.md` changes

---

## 8. Final Phase 16B Status

```text
FINAL PHASE 16B STATUS:
NO IMPLEMENTATION AUTHORIZED
```
