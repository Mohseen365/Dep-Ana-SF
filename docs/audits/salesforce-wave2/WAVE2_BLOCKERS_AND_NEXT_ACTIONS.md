# Wave 2 Blockers and Next Actions

**Date:** October 2026
**Context:** Wave 2 Blocker Resolution & Wave 3 Handoff

---

## 1. Active External Blockers

1. **Salesforce Target Org / Dev Hub Authentication (`BLOCKED`):**
   * **Impact:** Prevents `sf project deploy start` and live Apex test execution for `DAGraphControllerTest.cls` and `DAGraphSecurityTest.cls`.
   * **Required Action:** Project Owner / Admin must provide an authenticated Dev Hub or Scratch Org token (`sf org login web`).

2. **Live Lightning Web Security (LWS) Runtime Validation (`BLOCKED`):**
   * **Impact:** Prevents empirical LWS evaluation of Cytoscape canvas DOM interactions in `daGraphViewer`.
   * **Required Action:** Execute in-org LWC preview once a target org is provisioned.

---

## 2. Immediate Wave 3 Recommendations

1. Authenticate target Salesforce org.
2. Deploy `scratch/salesforce-poc/force-app` metadata and Apex code.
3. Execute `DAGraphSecurityTest` in the live org to confirm user-mode security compliance.
4. Conduct end-to-end performance benchmarks for the 4.25 MB PBIM payload inside the LWC Cytoscape canvas.
