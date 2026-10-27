# Full Dependency Analyzer to Salesforce Migration Wave Plan

## Executive Directive & Scope Status

**NO IMPLEMENTATION BEYOND WAVE 1 IS STARTED IN THIS TASK.**
This document establishes the authoritative, evidence-backed multi-wave execution roadmap for migrating the Dependency Analyzer to Salesforce. All future wave dispatches require explicit user authorization.

---

## Migration Waves Breakdown

```
Wave 0: Baseline & Coordination ──────► COMPLETE (Verified)
Wave 1: Core Graph Foundation ────────► PASS WITH CONDITIONS (Code Frozen)
Wave 2: First Prioritized Tranche ────► PLANNED (Ready for Authorization)
Wave 3: Specialized Visualizations ───► PLANNED
Wave 4: Integration & Parity Closure ──► PLANNED
Wave 5: Actual Salesforce Org Gate ────► DEFERRED (Pending Credentials)
Wave 6: Release Readiness & Sign-off ─► PLANNED
```

---

### Wave 0 — Baseline & Repository Coordination
- **Objective:** Establish baseline provenance, audit existing scripts/fixtures, freeze data contracts, and build migration inventory.
- **Entry Gate:** Repository checkout clean at HEAD commit `cc1469d23f28193686488f7c2d21cd8eb464b421`.
- **Exit Criteria:** Inventory, Parity Matrix, Dependency Map, and Execution Strategy published and approved.
- **Status:** **`COMPLETE`**

---

### Wave 1 — Core Graph Payload & Rendering Foundation
- **Objective:** Establish Apex chunk persistence, payload loading, Cytoscape LWC rendering, and layout engines.
- **Scope:**
  - `DAGraphController.cls`, `DAGraphChunkService.cls`, `DAGraphIngestionService.cls`.
  - `daGraphPayloadLoader` LWC & `daGraphViewer` LWC.
  - `daLayoutEngine.js` (Architecture, Orbit, Constellation, Sankey layouts).
  - Enforce **SELECTION ≠ NAVIGATION** invariant.
- **Entry Gate:** Wave 0 approval.
- **Exit Criteria:** Offline harness 30/30 tests passing; UTF-16 surrogate chunk boundaries verified; zero payload corruption up to 10MB.
- **Status:** **`PASS WITH CONDITIONS — WAVE 1 CODE FROZEN, ORG VALIDATION PENDING`**

---

### Wave 2 — Migration Planning & First Implementation Tranche
- **Objective:** Migrate high-priority core application shell, project selector, and user persistence services to Salesforce.
- **Proposed Tranche Scope (Workstream A & C Focus):**
  1. `FEAT-SHELL-01`: App Tab Navigation and LWC routing context (`daAppShell`).
  2. `FEAT-SHELL-03`: Dynamic Project Selector (`daProjectSelector` + Apex SOQL).
  3. `FEAT-STATE-02`: Custom ViewState & Position Persistence (`DA_User_Preference__c` Apex service).
  4. `FEAT-DATA-02`: Architectural Annotations Service (`DA_Annotation__c` Apex controller & SLDS modal).
- **Prerequisites:** Wave 1 freeze preserved; explicit user dispatch signal.
- **Exit Criteria:**
  - Project selector dynamically loads projects from `DA_Project__c`.
  - User position overrides persist and reload accurately across sessions.
  - Offline suite passes 100% without regressions.
- **Status:** **`PLANNED — READY FOR DISPATCH AUTHORIZATION`**

---

### Wave 3 — Specialized Visualizations & Governance Panels
- **Objective:** Reimplement specialized React analytics views into native Lightning Web Components.
- **Scope (Workstream E Focus):**
  1. `FEAT-PANEL-01`: Feature Matrix LWC (`daFeatureMatrixPanel`).
  2. `FEAT-PANEL-06`: Hotspot & Coupling Panel (`daHotspotPanel`).
  3. `FEAT-PANEL-08`: Governance Findings Panel (`daFindingsPanel` + `DA_Finding__c`).
  4. `FEAT-PANEL-02`: Architecture DNA Barcode (`daArchitectureDnaBarcode`).
  5. `FEAT-PANEL-03`: Architecture Treemap (`daArchitectureTreemap`).
  6. `FEAT-PANEL-05`: Subway Map Component (`daSubwayMap`).
  7. `FEAT-PANEL-04`: Dependency River Streamgraph (`daDependencyRiver`).
- **Prerequisites:** Wave 2 exit gate passed.
- **Exit Criteria:** All 7 panels render deterministically in LWC with active project context; data parity with React source confirmed.
- **Status:** **`PLANNED`**

---

### Wave 4 — Integration, Analytics Compare & Parity Closure
- **Objective:** Close remaining cross-feature interaction gaps, snapshot comparison, and client-side exports.
- **Scope (Workstream F & E Focus):**
  1. `FEAT-ADV-02`: Snapshot Compare Mode (`daSnapshotCompare` LWC + Apex graph diff engine).
  2. `FEAT-ADV-01`: Refactoring What-If Simulator (`daRefactoringSimulator`).
  3. `FEAT-DATA-01`: LWC Canvas Export (PNG, CSV, JSON download).
  4. `FEAT-SHELL-04`: LWC Command Palette modal (`FEAT-SHELL-04`).
- **Prerequisites:** Wave 3 exit gate passed.
- **Exit Criteria:** Full end-to-end user workflows functional; zero console errors; parity matrix updated to 100% migrated/external.
- **Status:** **`PLANNED`**

---

### Wave 5 — Live Salesforce Org Verification (Deferred Gate)
- **Objective:** Deploy metadata package to scratch org / sandbox and execute live validation under real Governor Limits.
- **Scope (Workstream G Focus):**
  - Execute Apex test suite in org with target coverage >85%.
  - Verify Lightning Web Security (LWS) isolation for static resources (Cytoscape.js).
  - Verify `WITH USER_MODE` FLS/CRUD enforcement under Standard User profiles.
  - Measure live SOQL/DML/CPU governor limits during 10MB payload ingestion.
- **Prerequisites:** User provides authorized Salesforce SFDX org credentials.
- **Exit Criteria:** 100% Apex test pass in live org; zero LWS violation errors; security review signed off.
- **Status:** **`DEFERRED — PENDING USER ORG CREDENTIALS`**

---

### Wave 6 — Final Release Readiness & Eventual Production Handoff
- **Objective:** Package production metadata, finalize operational runbooks, and declare migration complete.
- **Scope:**
  - Final operational documentation update.
  - Automated deployment pipeline configuration.
  - Executive sign-off and repository freeze.
- **Prerequisites:** Wave 5 live org gate PASSED.
- **Exit Criteria:** Executive sign-off achieved; all 42 inventoried capabilities verified in live org or approved external service.
- **Status:** **`PLANNED`**
