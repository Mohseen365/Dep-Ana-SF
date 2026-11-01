# Wave 0.2: Exhaustive Ownership & Collision Audit Report

## 1. Inventory Methodology & Boundary Rules

To eliminate ambiguous wildcards and prevent parallel workstream collisions during implementation dispatch, Wave 0.2 conducted an exhaustive audit of all files within the Salesforce migration boundary (`scratch/salesforce-poc/`).

### Boundary Classification Rules
Every file in the repository is assigned exactly one authoritative owner and mapped to one of the five canonical governance tiers:
1. `EXCLUSIVE_FEATURE_OWNER`: Exclusive creation and edit rights by an assigned parallel workstream lead (e.g. Workstreams A, B, C, D, E).
2. `INTEGRATION_COORDINATOR_ONLY`: Restricted exclusively to the Integration Coordinator (e.g. `daAppShell`, shared schema, integration suites).
3. `FROZEN_READ_ONLY`: Protected baseline infrastructure, shared utilities, baseline regression runners, and production Apex classes from Waves 1–4. Read-only during feature development.
4. `OUT_OF_SCOPE`: External directories prohibited from modification during the Salesforce migration (`explorer/*`, root config).
5. `EXPLICIT_APPROVAL_REQUIRED`: Schema changes (`objects/`), new static resources, or package modifications requiring explicit human approval.

### Bounded Wildcard Rules
Wildcard patterns (`/*`) are strictly prohibited across general directories (`force-app/*`, `classes/*`, `explorer/*`). Wildcards are permitted **only** within isolated, newly created component bundles (e.g. `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/*`) where:
- The pattern governs strictly JS, HTML, CSS, and `.js-meta.xml` inside that single component directory.
- No shared files, configuration, or companion utilities are encompassed.
- Ownership is 100% exclusive to the designated workstream.

---

## 2. Exhaustive Repository Inventory & Collision Matrix

### 2.1 Existing Salesforce POC Inventory (99 Files)
- **LWC Bundles (11 existing components / 39 files):**
  - `daAppShell` (5 files): `INTEGRATION_COORDINATOR_ONLY`
  - `daProjectSelector` (4 files): `FROZEN_READ_ONLY`
  - `daPresetManager` (4 files): `FROZEN_READ_ONLY`
  - `daFindingsView` (4 files): `FROZEN_READ_ONLY`
  - `daMatrixView` (4 files): `FROZEN_READ_ONLY`
  - `daAnnotationPanel` (4 files): `FROZEN_READ_ONLY`
  - `graphViewer` (3 files): `FROZEN_READ_ONLY` (Deprecated)
  - `daGraphViewer` (4 files): `EXCLUSIVE_FEATURE_OWNER` (Workstream A Lead - Wave 5)
  - `daLayoutEngine` (2 files): `EXCLUSIVE_FEATURE_OWNER` (Workstream A Lead - Wave 5)
  - `daGraphPayloadLoader` (2 files): `FROZEN_READ_ONLY`
  - `daFilterSchema.js` (inside `daAppShell/`): `INTEGRATION_COORDINATOR_ONLY`
- **Apex Classes, Services & Controllers (14 files):**
  - `DAGraphController.cls`, `DAGraphController.cls-meta.xml`: `EXCLUSIVE_FEATURE_OWNER` (Workstream C Lead - Wave 7)
  - `DAAnnotationController.cls`, `.cls-meta.xml`: `FROZEN_READ_ONLY`
  - `DAUserPreferenceController.cls`, `.cls-meta.xml`: `FROZEN_READ_ONLY`
  - `DAGraphChunkService.cls`, `.cls-meta.xml`: `FROZEN_READ_ONLY`
  - `DAGraphIngestionService.cls`, `.cls-meta.xml`: `FROZEN_READ_ONLY`
  - `DAGraphDTO.cls`, `.cls-meta.xml`: `FROZEN_READ_ONLY`
  - `DAErrorResponse.cls`, `.cls-meta.xml`: `FROZEN_READ_ONLY`
  - `GraphDataController.cls`, `.cls-meta.xml`: `FROZEN_READ_ONLY` (Deprecated)
- **Apex Unit Tests (8 files):**
  - `DAGraphControllerTest.cls`, `.cls-meta.xml`: `EXCLUSIVE_FEATURE_OWNER` (Workstream C Lead - Wave 7)
  - `DAGraphSecurityTest.cls`, `.cls-meta.xml`: `FROZEN_READ_ONLY`
  - `DAAnnotationControllerTest.cls`, `.cls-meta.xml`: `FROZEN_READ_ONLY`
  - `DAUserPreferenceControllerTest.cls`, `.cls-meta.xml`: `FROZEN_READ_ONLY`
- **Custom Objects & Fields (27 files):**
  - All files in `objects/DA_Project__c/`, `DA_Analysis_Run__c/`, `DA_Graph_Chunk__c/`, `DA_User_Preference__c/`, `DA_Annotation__c/`, `DA_Finding__c/`: `FROZEN_READ_ONLY` (Schema changes require `EXPLICIT_APPROVAL_REQUIRED`).
- **Static Resources (2 files):**
  - `cytoscape.js`, `cytoscape.resource-meta.xml`: `FROZEN_READ_ONLY`
- **Offline Test Runners (9 files):**
  - `run-poc-tests.cjs`: `FROZEN_READ_ONLY`
  - `run-wave4-integration-suite.cjs`: `INTEGRATION_COORDINATOR_ONLY`
  - `run-lane-a-schema-tests.cjs`: `FROZEN_READ_ONLY`
  - `run-lane-c-preset-manager-tests.cjs`: `FROZEN_READ_ONLY`
  - `run-lane-d-graph-filter-tests.cjs`: `EXCLUSIVE_FEATURE_OWNER` (Workstream A Lead - Wave 5)
  - `run-lane-e-matrix-tests.cjs`: `FROZEN_READ_ONLY`
  - `run-lane-f-findings-tests.cjs`: `FROZEN_READ_ONLY`
  - `run-workstream-a-tests.cjs`: `INTEGRATION_COORDINATOR_ONLY`
  - `run-workstream-c-tests.cjs`: `EXCLUSIVE_FEATURE_OWNER` (Workstream C Lead - Wave 7)
- **Project Configuration (2 files):**
  - `sfdx-project.json`: `FROZEN_READ_ONLY`
  - `config/project-scratch-def.json`: `FROZEN_READ_ONLY`

### 2.2 Planned New Feature Scopes (Exclusively Assigned)
- **Workstream B (Wave 6):**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/*`
  - `scratch/salesforce-poc/tests/run-wave6-tests.cjs`
- **Workstream C (Wave 7):**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryView/*`
  - `scratch/salesforce-poc/tests/run-wave7-tests.cjs`
- **Workstream D (Wave 8):**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDiffEngine/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daCompareView/*`
  - `scratch/salesforce-poc/tests/run-wave8-tests.cjs`
- **Workstream E (Wave 9):**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringView/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/*`
  - `scratch/salesforce-poc/tests/run-wave9-tests.cjs`

---

## 3. Collision Validation Analysis

A programmatic collision check across all 99 existing files and all planned new component scopes verifies:
1. **Zero Overlapping Ownership:** No file or directory has more than one assigned owner.
2. **Strict Isolation of Shared Shell:** `daAppShell` is solely owned by the Integration Coordinator. No parallel feature agent can modify `daAppShell.js`, `daAppShell.html`, or `daFilterSchema.js`.
3. **Strict Isolation of Shared Schema:** No workstream may modify `objects/` or `classes/services/` without coordinator review and explicit approval.
4. **Collision Verdict:** **PASS. 100% collision-free.**
