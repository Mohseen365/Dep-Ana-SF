# Post-Wave-5A Next-Phase Execution Roadmap

**Project:** Dependency Analyzer
**Date:** 2026-11-10
**Governing Standard:** DEC-04 Alternative 4 (Project Owner Exclusive Executive Dispatch & Ratification Authority)

---

## 1. Roadmap Overview & Strategic Phasing

With Wave 5A formally closed from a governance perspective, the project transitions from **Component Remediation** to **Staging, Live Verification, and Release Enablement**.

The roadmap is structured into four sequential execution waves:
- **Wave 5B: Live Salesforce Org Deployment & Runtime Validation** (Laying the live platform baseline)
- **Wave 6A: Security, Governor, and Scale Verification** (Hardening against real platform limits)
- **Wave 6B: End-to-End Browser & Cross-View Experience** (Validating multi-view analytical workflows)
- **Wave 7: Packaging, Release Certification & Final Executive Ratification** (Achieving `RELEASE_ELIGIBLE`)

---

## 2. Wave-by-Wave Execution Specifications

### Wave 5B: Live Salesforce Org Deployment & Runtime Validation
- **Objective:** Establish the first authenticated live Salesforce scratch-org baseline.
- **Entry Criteria:**
  - Wave 5A governance ratification complete (`PO-RAT-WAVE5A-2026-11-10`).
  - Staging environment Salesforce CLI credentials configured.
- **Constituent Tasks:**
  - `REL-01`: Deploy complete source metadata (`scratch/salesforce-poc/`) to a clean scratch org.
  - `REL-02`: Execute complete Apex test suite (`scratch/salesforce-poc/force-app/main/default/classes/tests/`) via Tooling API.
- **Exit Criteria:**
  - Zero deployment or compilation errors across 21 LWC bundles and Apex classes.
  - 100% of Apex test methods pass with > 85% code coverage.
  - Coordinator D1 signs Deployment Certification Record.
  - Verifier D2 verifies zero deployment drift.

---

### Wave 6A: Security, Governor, and Scale Verification
- **Objective:** Prove multitenant platform safety, LWS proxy containment, and scale resilience.
- **Entry Criteria:**
  - Wave 5B successfully deployed and certified.
- **Constituent Tasks:**
  - `REL-03`: Lightning Web Security (LWS) runtime proxy containment audit.
  - `REL-05`: PBIM large dataset (528 nodes, 2063 edges, 33 chunks) ingestion and reassembly stress test.
  - `REL-06`: Security Analyst user persona permission set and FLS validation.
- **Exit Criteria:**
  - Zero LWS cross-namespace containment violations.
  - PBIM reassembles under client-side 10MB memory envelope without Apex heap exhaustion.
  - Zero FLS bypasses or unauthorized field disclosures.
  - Dual signoff (Workstream Lead + D1) on security and scale packages.

---

### Wave 6B: End-to-End Browser & Cross-View Experience
- **Objective:** Automated real-browser Playwright validation of all 11 analytical views.
- **Entry Criteria:**
  - Wave 6A scale and security verified.
- **Constituent Tasks:**
  - `REL-04`: Playwright automated cross-browser test execution (Chromium, Firefox, WebKit).
  - Multi-view event traversal: verifying `nodeselect` broadcasts into `daInvestigationDrawer` across all 11 views.
  - REM-04 URL state restoration: verifying browser back/forward and deep-linking in a real browser session.
- **Exit Criteria:**
  - Playwright test suite passes with 100% clean assertions and zero DOM detached node leaks.
  - Zero violations of `SELECTION != NAVIGATION`.

---

### Wave 7: Packaging, Release Certification & Final Executive Ratification
- **Objective:** Build installable 2GP package version and achieve formal release eligibility.
- **Entry Criteria:**
  - Waves 5B, 6A, and 6B successfully verified.
  - Project Owner executive decisions rendered on Wave 9 quarantined refactoring scope.
- **Constituent Tasks:**
  - `REL-07`: Build 2GP managed/unmanaged package version excluding Wave 9 refactoring bundles.
  - Test subscriber org installation, upgrade, and rollback lifecycles.
  - `REL-10`: Deploy automated CI/CD GitHub Actions verification pipeline.
  - Final Independent Verification Audit by Agent D2.
- **Exit Criteria:**
  - Clean package installation and upgrade in target subscriber orgs.
  - Agent D2 renders formal verdict `PASS` on Release Candidate.
  - Project Owner signs Executive Order granting `RELEASE_ELIGIBLE` and `PRODUCTION_READY` status.

---

## 3. Dynamic Parallelization & Governance Architecture

To ensure execution velocity while strictly preventing regression:
1. **Zero Multi-Agent File Overlap:** Exclusive path reservation rules under `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv` remain strictly enforced.
2. **Coordinator Gatekeeper:** Agent D1 acts as sole Integration Coordinator; no feature workstream may merge directly to the integration baseline.
3. **Independent Verification:** Agent D2 remains read-only, validating evidence packages before gates close.
4. **Dual Joint Acceptance Rule:** No task is accepted without simultaneous signoff from the Workstream Lead and Integration Coordinator D1.
5. **No Self-Acceptance:** Dual signoff must be executed by distinct agents.
