# B5 Packaging Exclusion Audit: Wave 9 Quarantined Components

**Agent:** B5 — Deployment Readiness and Validation Environment Auditor
**Date:** 2026-11-09
**Execution Mode:** READ-ONLY (No Live Deployment or File Mutation)
**Governance Basis:** DEC-04 Alternative 4 & Project Owner Governance Order

---

## 1. Executive Summary

This audit investigates the deployment exposure of the two unauthorized Wave 9 components:
1. `daRefactoringEngine`
2. `daRefactorHandoffModal`

Both components are classified under governance status **`IMPLEMENTED_UNAUTHORIZED_QUARANTINED`**. While the components were physically written to disk under `scratch/salesforce-poc/force-app/main/default/lwc/` during previous unauthorized waves, they are strictly prohibited from being imported, mounted, or deployed into production or testing orgs without explicit Project Owner authorization.

### Audit Finding
**CRITICAL PACKAGING LEAKAGE DETECTED:** Under standard Salesforce CLI deployment tooling (`sf project deploy start` or `sf project deploy validate`), the entire default package directory `force-app` is packaged and pushed. Because `scratch/salesforce-poc/` lacks a `.forceignore` file and lacks a deployment manifest (`manifest/package.xml`), any standard deployment command will **automatically package and deploy both quarantined components**, directly violating governance restrictions.

---

## 2. Component Inventory & Physical File Locations

| Quarantined Component | Bundle Path | Contained Files | Metadata Classification | Exposed to AppShell? |
| :--- | :--- | :--- | :--- | :---: |
| `daRefactoringEngine` | `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine` | `daRefactoringEngine.js`<br>`daRefactoringEngine.js-meta.xml` | `isExposed: false`<br>`apiVersion: 60.0` | **NO** |
| `daRefactorHandoffModal` | `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal` | `daRefactorHandoffModal.js`<br>`daRefactorHandoffModal.html`<br>`daRefactorHandoffModal.css`<br>`daRefactorHandoffModal.js-meta.xml` | `isExposed: true`<br>`apiVersion: 60.0`<br>`target: lightning__AppPage` | **NO** |

---

## 3. Dependency & Import Analysis

A comprehensive grep across the entire Salesforce POC codebase reveals:
1. **`daAppShell` Isolation:** Neither `daRefactoringEngine` nor `daRefactorHandoffModal` is imported, referenced, or mounted in `daAppShell.js`, `daAppShell.html`, or any active view component (`daTreemapView`, `daSubwayView`, `daHotspotsView`, etc.). The UI shell remains strictly uncontaminated.
2. **Inter-Component Coupling:**
   - `daRefactorHandoffModal.js` imports `generateHandoffMarkdown` and `generateHandoffJson` from `c/daRefactoringEngine`:
     ```javascript
     import { generateHandoffMarkdown, generateHandoffJson } from 'c/daRefactoringEngine';
     ```
   - No authorized component imports either of these bundles.
3. **Quarantine Invariant Preservation:** The runtime invariant of pure simulation isolation is preserved in the application shell. However, static deployment isolation is **NOT PRESERVED** due to filesystem directory structure.

---

## 4. Root Cause of Packaging Leakage

The root cause of deployment leakage stems from the Salesforce CLI default packaging mechanism:

1. **`sfdx-project.json` Default Directory:**
   ```json
   {
     "packageDirectories": [
       {
         "path": "force-app",
         "default": true
       }
     ]
   }
   ```
2. **Lack of `.forceignore`:**
   In Salesforce DX, the `.forceignore` file controls which files are excluded when deploying or retrieving source. In `scratch/salesforce-poc/`, **no `.forceignore` file exists**.
3. **Lack of `package.xml` Manifest:**
   No manifest file exists to define a scoped allowlist of approved components.
4. **Behavior on Deployment:**
   Executing:
   ```bash
   sf project deploy start --target-org <alias>
   ```
   recursively scans `scratch/salesforce-poc/force-app/` and pushes all 23 LWC bundles, including `daRefactoringEngine` and `daRefactorHandoffModal`. Because `daRefactorHandoffModal.js-meta.xml` specifies `isExposed: true` and `targets: lightning__AppPage`, it will become visible in Lightning App Builder in the target Salesforce org!

---

## 5. Remediation Strategy & Governance Compliance

In accordance with Agent B5 execution rules:
> *".forceignore and package manifests may be modified ONLY if explicitly assigned and authorized (default: do not modify)."*
> *"Do not modify another agent's assigned files."*

Agent B5 has **NOT** created or modified `.forceignore` or package manifests. Instead, we provide the two concrete remediation specifications for authorization and execution by the Integration Coordinator (Agent D1) or Project Owner:

### Option A: Exclusion via `.forceignore` (Recommended / Minimal Intrusion)
Create `scratch/salesforce-poc/.forceignore` containing:
```ignore
# Exclude unauthorized Wave 9 quarantined refactoring components
**/lwc/daRefactoringEngine/**
**/lwc/daRefactorHandoffModal/**
```
- **Pros:** Native SFDX exclusion; applies automatically to all `sf project deploy` and `sf project retrieve` operations.
- **Cons:** Must be committed to the repository by an authorized coordinator.

### Option B: Explicit Scoped Manifest (`manifest/package.xml`)
Deploy exclusively using an allowlist manifest that explicitly enumerates the 21 authorized LWC components and omits `daRefactoringEngine` and `daRefactorHandoffModal`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>daAnalysisHistory</members>
        <members>daAnnotationPanel</members>
        <members>daAppShell</members>
        <members>daArchitectureDnaBarcode</members>
        <members>daDiagnosticsView</members>
        <members>daFindingsView</members>
        <members>daGraphPayloadLoader</members>
        <members>daGraphViewer</members>
        <members>daHeader</members>
        <members>daHotspotsView</members>
        <members>daInvestigationDrawer</members>
        <members>daLayoutEngine</members>
        <members>daMatrixView</members>
        <members>daPresetManager</members>
        <members>daProjectDashboard</members>
        <members>daProjectSelector</members>
        <members>daRadarView</members>
        <members>daSidebar</members>
        <members>daSubwayView</members>
        <members>daTreemapView</members>
        <members>graphViewer</members>
        <name>LightningComponentBundle</name>
    </types>
    <version>61.0</version>
</Package>
```

---

## 6. Verification Status

| Item | Status | Result |
| :--- | :---: | :--- |
| Quarantined files present in source tree | CONFIRMED | Present in `force-app/main/default/lwc/` |
| Quarantined files mounted in `daAppShell` | CONFIRMED | **NOT mounted** (0 references) |
| Quarantined files imported by approved LWCs | CONFIRMED | **NOT imported** (0 references) |
| `.forceignore` exclusion protection active | MISSING | **NO exclusion active** |
| Deployment manifest protection active | MISSING | **NO manifest protection active** |
| Overall Quarantine Deployment Risk | **HIGH / CRITICAL** | Deployment will leak unless Option A or B is implemented |
