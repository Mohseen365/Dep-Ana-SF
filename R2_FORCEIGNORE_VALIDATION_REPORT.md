# R2 .forceignore Validation Report

**Agent:** R2 — Salesforce Packaging Exclusion and Release Configuration Engineer
**Date:** 2026-11-10
**Harness:** `scratch/salesforce-poc/tests/run-r2-packaging-validation.cjs`
**Execution Environment:** Node.js v22.22.1 & Salesforce CLI `@salesforce/cli/2.157.8`

---

## 1. Validation Objectives

1. Validate that the exclusion rules in `scratch/salesforce-poc/.forceignore`:
   - `**/lwc/daRefactoringEngine`
   - `**/lwc/daRefactoringEngine/**`
   - `**/lwc/daRefactorHandoffModal`
   - `**/lwc/daRefactorHandoffModal/**`
   strictly exclude both quarantined Wave 9 components:
   - `force-app/main/default/lwc/daRefactoringEngine/`
   - `force-app/main/default/lwc/daRefactorHandoffModal/`
2. Validate that none of the 21 approved LWC components are accidentally excluded.
3. Validate that non-LWC metadata (Apex classes, Custom Objects, Permission Sets, Static Resources) are 100% preserved.
4. Validate directory-level and recursive path evaluation across nested directory structures.
5. Validate actual live source conversion via Salesforce CLI (`sf project convert source`).
6. Validate actual live manifest generation via Salesforce CLI (`sf project generate manifest`).

---

## 2. Test Execution & Output Log

```text
======================================================================
Agent R2 — Salesforce POC Deployment Packaging Validation Suite
POC Root:        /app/scratch/salesforce-poc
force-app:       /app/scratch/salesforce-poc/force-app
.forceignore:    /app/scratch/salesforce-poc/.forceignore
======================================================================

Active .forceignore rules:
  - **/lwc/daRefactoringEngine
  - **/lwc/daRefactoringEngine/**
  - **/lwc/daRefactorHandoffModal
  - **/lwc/daRefactorHandoffModal/**
✓ All 4 required quarantine exclusion rules verified in .forceignore.

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

[TEST 4] Verifying directory-level and path variation pattern matching:
  ✓ Correctly verified: force-app/main/default/lwc/daRefactoringEngine (excluded=true)
  ✓ Correctly verified: force-app/main/default/lwc/daRefactoringEngine/ (excluded=true)
  ✓ Correctly verified: force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js (excluded=true)
  ✓ Correctly verified: force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js-meta.xml (excluded=true)
  ✓ Correctly verified: force-app/main/default/lwc/daRefactorHandoffModal (excluded=true)
  ✓ Correctly verified: force-app/main/default/lwc/daRefactorHandoffModal/ (excluded=true)
  ✓ Correctly verified: force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.html (excluded=true)
  ✓ Correctly verified: force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js-meta.xml (excluded=true)
  ✓ Correctly verified: force-app/main/default/lwc/daAppShell/daAppShell.js (excluded=false)
  ✓ Correctly verified: force-app/main/default/lwc/daGraphViewer/daGraphViewer.js (excluded=false)
  ✓ Correctly verified: force-app/main/default/classes/DAGraphController.cls (excluded=false)

[TEST 5] Verifying actual Salesforce CLI source conversion and manifest generation:
  Detected Salesforce CLI: @salesforce/cli/2.157.8 linux-x64 node-v22.22.1
  Executing: sf project convert source --output-dir /tmp/r2-cli-convert-test-... --json
  ✓ sf project convert source succeeded with exitCode 0
  ✓ Both quarantined bundles are absent from converted Metadata API format
  ✓ All 21 approved LWC bundles present in converted output
  Executing: sf project generate manifest --source-dir force-app --output-dir /tmp/r2-cli-manifest-test-... --name package.xml --json
  ✓ package.xml excludes daRefactoringEngine and daRefactorHandoffModal
  ✓ All 21 approved LWC bundles present in generated package.xml

======================================================================
ALL PACKAGING VALIDATION TESTS PASSED CLEANLY (5/5 test suites)
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

## 4. Live Salesforce CLI Operations

Actual CLI tests were conducted with `@salesforce/cli/2.157.8`:

1. **Source Conversion Test (`sf project convert source`):**
   - Executed against `scratch/salesforce-poc/force-app` with active `.forceignore`.
   - Result: Successful conversion to Metadata API format.
   - Converted output inspected: Quarantined component directories (`daRefactoringEngine`, `daRefactorHandoffModal`) were **completely absent**. All 21 approved components were generated with valid metadata descriptors.

2. **Manifest Generation Test (`sf project generate manifest`):**
   - Executed against `force-app`.
   - Result: Successful `package.xml` generated.
   - Inspected contents: Quarantined components were **completely absent**. All 21 approved LWC components were enumerated in `<types><name>LightningComponentBundle</name>`.

---

## 5. Scope Boundary & Environment Limitations

- **Live Org Deployment Limitation:** Full deployment validation against an active org (`sf project deploy start`) requires an authenticated scratch org. In accordance with task restrictions, no live org deployment was attempted, and this will be validated in a separately authorized scratch-org validation phase.
