# R2 .forceignore Validation Report

**Agent:** R2 — Salesforce Deployment Packaging and Quarantine Exclusion Engineer
**Date:** 2026-11-09
**Harness:** `scratch/salesforce-poc/tests/run-r2-packaging-validation.cjs`
**Execution Environment:** Node.js v22.22.1 (Offline Standalone Suite)

---

## 1. Validation Objectives

1. Validate that the proposed exclusion rules in `R2_FORCEIGNORE.patch` strictly exclude both quarantined Wave 9 components:
   - `force-app/main/default/lwc/daRefactoringEngine/`
   - `force-app/main/default/lwc/daRefactorHandoffModal/`
2. Validate that none of the 21 approved LWC components are accidentally excluded.
3. Validate that non-LWC metadata (Apex classes, Custom Objects, Permission Sets, Static Resources) are 100% preserved.
4. Validate pattern matching behavior across nested directory structures and path variations.

---

## 2. Test Execution & Output Log

```text
======================================================================
Agent R2 — Salesforce POC Deployment Packaging Simulation Suite
POC Root:    /app/scratch/salesforce-poc
force-app:   /app/scratch/salesforce-poc/force-app
======================================================================

Discovered 164 metadata files under force-app/

Packaging Simulation Results:
  - Excluded files count: 6
  - Included files count: 158
  - Total files audited:  164

[TEST 1] Verifying all quarantined Wave 9 files are excluded:
  ✓ Correctly excluded: force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.css
  ✓ Correctly excluded: force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.html
  ✓ Correctly excluded: force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js
  ✓ Correctly excluded: force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js-meta.xml
  ✓ Correctly excluded: force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js
  ✓ Correctly excluded: force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js-meta.xml

[TEST 2] Verifying approved LWC components remain included:
  ✓ Confirmed included: daAnalysisHistory (4 files)
  ✓ Confirmed included: daAnnotationPanel (4 files)
  ✓ Confirmed included: daAppShell (5 files)
  ✓ Confirmed included: daArchitectureDnaBarcode (4 files)
  ✓ Confirmed included: daDiagnosticsView (4 files)
  ✓ Confirmed included: daFindingsView (4 files)
  ✓ Confirmed included: daGraphPayloadLoader (2 files)
  ✓ Confirmed included: daGraphViewer (4 files)
  ✓ Confirmed included: daHeader (5 files)
  ✓ Confirmed included: daHotspotsView (4 files)
  ✓ Confirmed included: daInvestigationDrawer (4 files)
  ✓ Confirmed included: daLayoutEngine (2 files)
  ✓ Confirmed included: daMatrixView (4 files)
  ✓ Confirmed included: daPresetManager (4 files)
  ✓ Confirmed included: daProjectDashboard (4 files)
  ✓ Confirmed included: daProjectSelector (4 files)
  ✓ Confirmed included: daRadarView (4 files)
  ✓ Confirmed included: daSidebar (5 files)
  ✓ Confirmed included: daSubwayView (4 files)
  ✓ Confirmed included: daTreemapView (4 files)
  ✓ Confirmed included: graphViewer (3 files)

[TEST 3] Verifying Apex classes, custom objects, and permissions remain included:
  ✓ Confirmed included: Apex classes (32 files)
  ✓ Confirmed included: Custom objects (41 files)
  ✓ Confirmed included: Permission sets (1 files)
  ✓ Confirmed included: Static resources (2 files)

[TEST 4] Verifying pattern matching behavior across path variations:
  ✓ Correctly verified: force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js (excluded=true)
  ✓ Correctly verified: scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js (excluded=true)
  ✓ Correctly verified: /app/scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js (excluded=true)
  ✓ Correctly verified: force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.html (excluded=true)
  ✓ Correctly verified: force-app/main/default/lwc/daAppShell/daAppShell.js (excluded=false)
  ✓ Correctly verified: force-app/main/default/lwc/daGraphViewer/daGraphViewer.js (excluded=false)

======================================================================
ALL PACKAGING VALIDATION TESTS PASSED CLEANLY (4/4 test suites)
======================================================================
```

---

## 3. Analysis of Exclusion Boundary

### 3.1 Excluded Quarantined Files (6 Total)
1. `force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.css`
2. `force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.html`
3. `force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js`
4. `force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js-meta.xml`
5. `force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js`
6. `force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js-meta.xml`

### 3.2 Verification of Non-Exclusion of Approved Metadata
- **Total Metadata Files Discovered:** 164
- **Excluded Files:** 6 (quarantined only)
- **Included Files:** 158
- **Accidental Exclusions:** 0

---

## 4. Environment Limitations

Salesforce CLI (`sf`/`sfdx`) is not installed in the local execution sandbox. Direct execution of `sf project deploy start --dry-run` was substituted with the exact regex/glob simulation engine conforming to Salesforce CLI `.forceignore` specification (based on the standard node-ignore / gitignore glob matching).
