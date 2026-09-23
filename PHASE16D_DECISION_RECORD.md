# PHASE 16D — DECISION RECORD

## 1. Purpose

The purpose of this document is to establish a formal decision record for three unresolved governance and architectural decisions identified during Phase 16 audit and reconciliation activities. This document records established facts, decision questions, candidate options, and required decision authorities. It records no decisions, recommends no options, ranks no candidates, and authorizes no remediation implementation.

## 2. Decision Status Summary

| Decision | Evidence State | Decision Status | Implementation |
|---|---|---|---|
| **Decision A — Production Fixture Provisioning** | UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND | PENDING | NOT AUTHORIZED |
| **Decision B — 40px Acceptance Contract** | UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND | PENDING | NOT AUTHORIZED |
| **Decision C — Locality Acceptance Criterion** | UNRESOLVED — NO AUTHORITATIVE EVIDENCE FOUND | PENDING | NOT AUTHORIZED |

## 3. Decision A — Production Fixture Provisioning

### Established Facts

* **Clean production deep-link behavior**: In a clean repository checkout, requesting `?project=cloud-spend-tracker` in the browser returns HTTP 404 because `explorer/public/projects/cloud-spend-tracker/explorer-data.json` is absent on disk, causing the application to fall back to `explorer/public/explorer-data.json` (the 4-node default fixture).
* **Gitignored project fixture path**: `.gitignore` line 9 explicitly ignores `explorer/public/projects/*` (excluding `.gitkeep`).
* **Test-harness provisioning behavior**: Automated browser test suites (Playwright) pass because the test harness populates `explorer/public/projects/cloud-spend-tracker/explorer-data.json` by copying `audit-fixtures/cloud-spend-tracker/explorer-data.json` prior to starting Vite.
* **CLI export behavior**: Analysis CLI scripts (`export-explorer.cjs`, `run-explorer.cjs`, `test-multi-project.cjs`) write contract files to `analyze/projects/<project-id>/` and copy contract JSON files to `explorer/public/projects/<project-id>/explorer-data.json`.
* **Absence of an authoritative production provisioning model**: No authoritative specification or architectural contract document in the repository explicitly defines the intended production provisioning model for project/benchmark fixtures.

### Decision Question

What is the authoritative production provisioning model for project/benchmark fixtures?

### Recorded Options

1. statically bundled
2. generated during build/export
3. provisioned separately
4. dynamically served
5. intentionally unavailable in a clean checkout

### Required Authority

System Architect / Product Owner

### Decision

PENDING

## 4. Decision B — 40px Acceptance Contract

### Established Facts

* **Formal requirement**: The formal layout specification (`audit-reports/features/FEAT-LAYOUT-report-v2.md`) specifies a minimum node clearance requirement of `>= 40.0px`.
* **Automated enforcement**: Automated regression test suites (`Phase6B_LocalityCompaction.test.ts`) enforce `expect(clearance).toBeGreaterThanOrEqual(39.99)`.
* **Candidate E measured value**: Measured Candidate E Stage 11 spatial hash grid cleanup (`spacing.ts`) yields a raw calculated minimum clearance value of `39.99905982905989px` on the 240-node Cloud Spend dataset due to sub-pixel floating-point rounding.
* **Formal mathematical relationship**: The measured value `39.99905982905989px` is strictly less than the formal requirement of `40.0px` (a deficit of `0.00094017094011px`), while being strictly greater than the automated test threshold of `39.99px`.

### Decision Question

Does the formal `>= 40.0px` requirement remain the contractual acceptance criterion, or is the existing `>= 39.99px` automated tolerance formally accepted as the contractual criterion?

### Recorded Options

1. Retain the formal `>= 40.0px` requirement as the contractual acceptance criterion.
2. Formally accept the existing `>= 39.99px` automated tolerance as the contractual acceptance criterion.

### Required Authority

Quality Governance Lead / Layout System Architect

### Decision

PENDING

## 5. Decision C — Locality Acceptance Criterion

### Established Facts

* **Historical criterion**: Historical quality gates specify `medianIntraFeatureEdgeLength < medianInterFeatureEdgeLength`.
* **Candidate E measurements**: On Candidate E (2D multi-row layout), measured `medianIntraFeatureEdgeLength = 1101.68px` and measured `medianInterFeatureEdgeLength = 1020.00px`.
* **Current FALSE result**: The historical condition evaluates to `FALSE` because `1101.68px > 1020.00px`.
* **Historical documentation suggesting layer-filtered locality metrics**: Historical reports (`HYBRID_LAYOUT_PHASE6_FINAL_INTEGRATION_REPORT.md`) analyze this result as a metric artifact driven by 4-layer vertical Y hierarchy spanning (~1101.68px) versus horizontal 2D band packing (~1020.00px) and suggest evaluating layer-filtered locality metrics (`D_intra, same-layer < D_inter, same-layer`).
* **Absence of an authoritative decision adopting that alternative**: No authoritative governance decision or contract document in the repository explicitly adopts a layer-filtered metric or retires/modifies the historical `medianIntra < medianInter` criterion.

### Decision Question

Should the historical `medianIntra < medianInter` criterion remain active for the current 2D multi-row layout, or should an explicitly authorized replacement criterion be adopted?

### Recorded Options

1. Retain the historical `medianIntraFeatureEdgeLength < medianInterFeatureEdgeLength` criterion as active.
2. Adopt an explicitly authorized replacement locality criterion.

### Required Authority

Architecture Quality Gate Owner / Governance Lead

### Decision

PENDING

## 6. Historical Documentation Policy

### Established Rule

* Later-created authoritative audit documentation governs conflicts.
* Historical findings are retained as historical record.
* No retroactive modification of historical reports is authorized.

### Status

RESOLVED

## 7. Implementation Authorization

NO IMPLEMENTATION AUTHORIZED

## 8. Final Status

DECISIONS PENDING — IMPLEMENTATION BLOCKED
