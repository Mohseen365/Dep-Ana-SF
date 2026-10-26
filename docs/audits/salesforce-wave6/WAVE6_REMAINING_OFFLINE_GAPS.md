# Wave 6 Remaining Offline Gaps

## 1. Overview
This report lists all remaining gaps, limitations, and deferred items prior to handing off to the final Salesforce validation stage.

## 2. Categorization of Remaining Gaps

### A. Non-Blocking Historical Offline Baseline Gaps
1. **Four Historical Focused Vitest Failures:**
   - *Impact:* Confined to standalone React Explorer url/context unit test assertions (`ProjectContext.test.tsx` and `useViewState.test.ts`).
   - *Assessment:* NON-BLOCKING. Does not impact Salesforce POC LWC components, custom objects, or analysis payload rendering.

### B. Intentionally Deferred Live Salesforce Stage Dependencies
The following items CANNOT be executed offline and are intentionally deferred to the final stage:

1. **Live Org Authentication & Scratch Org Creation:**
   - Dev Hub authorization (`sf org login web`) and scratch org creation (`sf org create scratch`).
2. **Metadata Deployment:**
   - Deployment of POC package (`sf project deploy start --source-dir scratch/salesforce-poc/force-app`).
3. **Apex Unit Test Execution in Live Org Runtime:**
   - Execution of `DAGraphControllerTest` and `DAGraphSecurityTest` via `sf apex run test`.
4. **Multi-User Record Sharing & CRUD/FLS Verification:**
   - Runtime enforcement of `WITH USER_MODE` and object/field permissions across different user profiles.
5. **Live Lightning Web Security (LWS) Execution:**
   - Browser verification of Cytoscape DOM manipulation and event handlers inside active LWS sandbox.

## 3. Residual Offline Risk Assessment
- **Zero unresolved offline defects** exist in the Salesforce POC implementation.
- All offline boundaries, data contracts, reassembly logic, and error handling are fully verified and green.
