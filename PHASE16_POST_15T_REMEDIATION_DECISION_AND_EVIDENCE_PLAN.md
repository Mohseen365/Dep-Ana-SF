# PHASE 16 — POST-15T REMEDIATION DECISION & EVIDENCE PLAN

## 1. Executive Summary

This report establishes the authoritative remediation decision and evidence plan following Phase 15T.

The baseline evidence from `PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md` proves that the core runtime engines (**Hybrid Layout Engine** and **Position Authority / Renderer**) exhibit **NO DEFECT OBSERVED** within their tested operational scopes. However, four surrounding structural areas require clear classification regarding remediation readiness:

1. **Production Data Routing**: A **PROVEN observed defect** exists where clean production deep-links (`?project=cloud-spend-tracker`) fail with HTTP 404 because `explorer/public/projects/*` is gitignored and not provisioned in a fresh repository clone. Remediation is **NOT READY FOR IMPLEMENTATION** pending an architectural decision on fixture packaging/deployment.
2. **40px Acceptance Requirement**: An **ACCEPTANCE REQUIREMENT GAP** exists where the raw minimum clearance of `39.99905982905989 px` fails the formal `40.0 px` mathematical requirement by `0.00094 px`, while passing the automated test threshold of `>= 39.99 px`. Remediation is **NOT READY FOR IMPLEMENTATION** pending formal governance reconciliation.
3. **Locality Governance**: A **GOVERNANCE QUESTION** exists because the historical locality condition (`medianIntra < medianInter`) evaluates to `FALSE` (`1101.68 px > 1020.00 px`) on Candidate E due to multi-row vertical layer geometry vs. horizontal band spacing. Remediation is **NOT READY FOR IMPLEMENTATION**.
4. **Historical Documentation**: A **HISTORICAL DOCUMENTATION ISSUE** exists in Phase 15C (`SharedUtility` non-existence). Correcting historical reports is **NOT JUSTIFIED BY CURRENT EVIDENCE** under strict living documentation protocols prohibiting retroactive report rewriting. Remediation is **NOT READY FOR IMPLEMENTATION**.

---

## 2. Phase 15T Baseline

The starting evidence baseline is strictly preserved from `PHASE15T_RUNTIME_IDENTITY_AND_COORDINATE_RECONCILIATION_REPORT.md`:

```text
A. Hybrid Engine / Layout Runtime
Status: NO DEFECT OBSERVED
Scope: Verified source revision + canonical 240-node fixture + verified configuration + tested execution path.
Confidence: HIGH, bounded to the verified execution scope.

B. Position Authority / Renderer
Status: NO DEFECT OBSERVED
Scope: Verified browser-harness execution using the canonical fixture.
Confidence: HIGH, bounded to the verified browser-harness scope.

C. Production Data Routing
Status: DEFECT PROVEN
Evidence: Clean deep-link ?project=cloud-spend-tracker returns 404 because explorer/public/projects/* is gitignored.
Remediation: NOT DETERMINED IN PHASE 15T

D. Browser / Test Harness
Status: INFORMATIONAL
Evidence: Harness pre-populates gitignored public path, enabling browser acceptance tests to exercise the canonical fixture.
Remediation: NOT DETERMINED IN PHASE 15T

E. Historical Documentation
Status: DEFECT PROVEN for directly verified documentation errors
Evidence: Phase 15C Section 4 text lists non-existent node ApexClass:SharedUtility (PROVEN), stale Phase 4 column coordinates (SUPPORTED), and unexplained hash origin (UNKNOWN).

F. Acceptance Thresholds
Status: INFORMATIONAL
Evidence: Measured clearance is 39.99905982905989 px (FAIL by 0.00094 px for >= 40.0 px formal requirement; PASS for >= 39.99 px automated threshold).

G. Governance Requirements
Status: UNRESOLVED
Evidence: Observed geometry (medianIntra 1101.68 px > medianInter 1020.00 px) fails historical locality condition; governance status unrecorded.
```

---

## 3. Track A — Production Data Routing

### Investigation Findings
In a clean repository checkout, requesting `?project=cloud-spend-tracker` in the browser returns HTTP 404, causing the application to fall back to the public 4-node default fixture (`explorer/public/explorer-data.json`). Conversely, browser acceptance tests (Playwright) succeed because the test harness explicitly copies `audit-fixtures/cloud-spend-tracker/explorer-data.json` into `explorer/public/projects/cloud-spend-tracker/explorer-data.json` prior to launching Vite.

Preserved Verified Facts:
* Clean deep-link requests `/projects/<projectId>/explorer-data.json`
* `explorer/public/projects/*` is gitignored
* Clean checkout lacks the project fixture
* Harness populates the fixture before browser testing
* Clean deep-link therefore falls back to the 4-node public default

### Classification

```text
Observed mechanism:
PROVEN

Root cause:
SUPPORTED

Expected architecture:
UNRESOLVED

Remediation readiness:
NOT READY
```

---

## 4. Track B — 40px Acceptance Requirement

### Investigation Findings
The formal layout specification (`audit-reports/features/FEAT-LAYOUT-report-v2.md`) specifies a minimum node clearance of `40.0 px`.

```text
Observed mathematical value:
39.99905982905989 px

Formal requirement:
>= 40.0 px

Formal result:
FAIL by 0.00094017094011 px

Automated threshold:
>= 39.99 px

Automated result:
PASS
```

### Classification

```text
Requirement status:
CURRENT AUTHORITATIVE REQUIREMENT

Threshold rationale:
SUPPORTED BUT NOT CONCLUSIVE
```

The `39.99 px` automated test threshold was introduced in Phase 6-B to accommodate sub-pixel floating-point rounding inherent in spatial hash grid collision cleanup (`Stage 11`). The historical rationale for introducing this tolerance is supported by code comments in `spacing.ts` and test assertions, but remains supported rather than conclusively proven as a formal contractual specification change.

---

## 5. Track C — Locality Governance

### Investigation Findings
The historical locality condition requires:
$$\text{medianIntraFeatureEdgeLength} < \text{medianInterFeatureEdgeLength}$$

```text
medianIntraFeatureEdgeLength = 1101.68 px
medianInterFeatureEdgeLength = 1020.00 px

Historical condition:
medianIntra < medianInter

Observed result:
FALSE

Governance:
UNRESOLVED
```

### Classification

```text
Observed geometry:
PROVEN

Geometric explanation:
SUPPORTED

Governance status:
UNRESOLVED
```

In Candidate E's 2D multi-row feature band layout (`global-layout.ts`), adjacent feature bands sit horizontally close together (`1020.00 px` inter-band spacing). Conversely, individual features span presentation, application, domain, and schema layers vertically, causing multi-layer intra-feature edges to extend across vertical Y distances (`~1101.68 px`). This geometric explanation is supported by spatial analysis, while the overall governance status remains unresolved.

---

## 6. Track D — Historical Documentation

### Investigation Findings
Phase 15C report text included several text figure inconsistencies:
1. `ApexClass:SharedUtility`: **PROVEN DOCUMENTATION ERROR** (does not exist in the 240-node canonical fixture).
2. `(5279.15, 750.00)`: **SUPPORTED BUT NOT CONCLUSIVE** (matches historical Phase 4 1D column layout documentation coordinates before Phase 6 2D feature reordering).
3. Hash `c09aba8f...`: **UNKNOWN** (origin cannot be reproduced from live Candidate E Stage 12 output).

Standard repository governance rules prohibit retroactively modifying or rewriting historical audit reports (`PHASE15C_...`). Living documentation rules dictate that historical errors are documented and clarified in current reconciliation reports (such as Phase 15T and Phase 16) rather than modifying past historical artifacts.

### Classification

```text
SharedUtility:
PROVEN DOCUMENTATION ERROR

5279.15 / 750.00:
SUPPORTED BUT NOT CONCLUSIVE

c09aba8f...:
UNKNOWN

Documentation correction action:
NOT JUSTIFIED BY CURRENT EVIDENCE
```

---

## 7. Decision-Readiness Matrix

| Issue | Evidence State | Root Cause / Interpretation | Governance Needed? | Ready for Implementation? |
| :--- | :--- | :--- | :--- | :--- |
| **Production routing** | PROVEN | SUPPORTED | YES | NO |
| **40px requirement** | PROVEN | SUPPORTED / GOVERNANCE GAP | YES | NO |
| **Locality metric** | PROVEN | SUPPORTED | YES | NO |
| **Phase 15C documentation** | PROVEN / SUPPORTED / UNKNOWN by item | Historical documentation issue | NO | NO |

---

## 8. Missing Evidence

### Production Routing
Missing:
* Authoritative decision on how project fixtures are supposed to be provisioned in production
* Whether benchmark fixtures are expected to ship with production
* Whether they are generated dynamically
* Whether they are externally served

### 40px Requirement
Missing:
* Formal governance decision reconciling `>=40.0px` specification with `>=39.99px` automated enforcement
* Explicit decision whether the contract or implementation should change

### Locality
Missing:
* Authoritative governance decision confirming whether `medianIntra < medianInter` remains an active acceptance criterion for Candidate E / 2D multi-row layouts

### Historical Documentation
No additional factual evidence is required to establish the already-classified `SharedUtility` error.

---

## 9. Implementation Boundaries

### Production Data Routing
```text
Potential implementation area:
Asset build/export scripts or public asset routing in explorer/src/context/ProjectContext.tsx or Vite configuration to bundle or copy audit-fixtures/cloud-spend-tracker/explorer-data.json into the public build distribution path.

Evidence required before implementation:
Authoritative decision specifying whether sample benchmark projects should be statically bundled in production builds, dynamically generated via CLI setup, or served via backend endpoints.

Implementation authorized:
NO
```

### 40px Acceptance Requirement
```text
Potential implementation area:
Adjustment of spatial hash grid clearance parameters in Stage 11 (explorer/src/lib/layout/spacing.ts) by 0.00094 px to achieve 40.00000 px, OR formal update of the release contract specification in FEAT-LAYOUT-report-v2.md to specify >= 39.99 px.

Evidence required before implementation:
Formal governance sign-off on whether sub-pixel tolerance (39.99 px) is contractually acceptable or whether 40.00000 px strict mathematical clearance must be enforced at the engine level.

Implementation authorized:
NO
```

### Locality Governance
```text
Potential implementation area:
Modification of layout Y-spacing algorithms in global-layout.ts OR formal retirement/amendment of the historical medianIntra < medianInter condition in the release governance contract.

Evidence required before implementation:
Authoritative governance decision confirming whether medianIntra < medianInter remains an active acceptance criterion for Candidate E / 2D multi-row layouts.

Implementation authorized:
NO
```

### Historical Documentation
```text
Potential implementation area:
Retroactive edit of PHASE15C_REAL_BROWSER_POSITION_AUTHORITY_ACCEPTANCE_REPORT.md text.

Evidence required before implementation:
None. Historical report editing is explicitly prohibited by repository governance protocols.

Implementation authorized:
NO
```

---

## 10. Final Phase 16 Status

```text
FINAL PHASE 16 STATUS:
NOT READY FOR IMPLEMENTATION
```

### Rationale
The observed defects/gaps are sufficiently characterized, but the architectural and governance decisions required to define an evidence-backed remediation remain unresolved.

Summary of track characterizations:
* **Production routing**: PROVEN observed defect
* **40px**: ACCEPTANCE REQUIREMENT GAP
* **Locality**: GOVERNANCE QUESTION
* **Historical documentation**: HISTORICAL DOCUMENTATION ISSUE

No production code, tests, fixtures, routing, layout algorithms, Position Authority, renderer code, thresholds, or historical reports have been modified during Phase 16.
