# Authoritative Dependency Analyzer to Salesforce Migration Wave Plan

## 1. Executive Roadmap Overview

This document defines the authoritative, phased migration roadmap for transitioning the Dependency Analyzer application into native Salesforce Lightning Experience (LWC and Apex).

### Wave Progression Summary
- **Wave 0: Analysis, Inventory & Architecture Readiness** (`COMPLETED`)
- **Wave 1: Core Payload Ingestion, Security & Layout Engine** (`COMPLETED / FROZEN`)
- **Wave 2: Application Shell, Project Context & Persistence Services** (`NEXT - READY FOR DISPATCH`)
- **Wave 3: Core Analytical Views & SLDS Panels** (`PLANNED`)
- **Wave 4: Advanced Visualizations & Specialized Layouts** (`PLANNED`)
- **Wave 5: Refactoring Simulation, Snapshot Compare & Advanced Analytics** (`PLANNED`)
- **Wave 6: End-to-End Integration, LWS Hardening & Live Org Acceptance** (`DEFERRED - PENDING ORG`)

---

## 2. Detailed Wave Breakdown & Feature Assignments

### Wave 0: Analysis, Inventory & Architecture Readiness
- **Objective:** Establish source inventory, schema contracts, AST parser extraction boundary, and proof of concept.
- **Assigned Feature IDs:**
  - `FEAT-ANALYSIS-01` (External TypeScript/JS AST Parsing)
  - `FEAT-ANALYSIS-02` (Canonical Graph Adapter & Schema Validation)
- **Status:** `COMPLETED` / `OFFLINE_TESTED`

### Wave 1: Core Payload Ingestion, Security & Layout Engine
- **Objective:** Build Apex payload chunking, ingestion controllers, LWC Cytoscape canvas loader, and reusable LWC layout engine (`daLayoutEngine.js`).
- **Assigned Feature IDs:**
  - `FEAT-APEX-01` (Project & Run Authorization)
  - `FEAT-APEX-02` (Unicode-Safe Graph Payload Chunking)
  - `FEAT-APEX-03` (Idempotent Graph Ingestion)
  - `FEAT-GRAPH-01` (Interactive Cytoscape Graph Canvas)
  - `FEAT-GRAPH-02` (Architecture Global Domain Layout Engine)
  - `FEAT-GRAPH-03` (Orbit Layout Engine)
  - `FEAT-GRAPH-04` (Constellation Layout Engine)
  - `FEAT-GRAPH-05` (Sankey / Flow Layout Engine)
  - `FEAT-STATE-01` (Selection vs Navigation Isolation Invariant)
  - `FEAT-STATE-03` (Highlight & Neighborhood Focus State)
- **Status:** `COMPLETED / FROZEN` (30/30 offline tests passed)

### Wave 2: Application Shell, Project Context & Persistence Services
- **Objective:** Establish SLDS app tab shell, dynamic project selector dropdown, user view-state/position persistence, and architectural annotations.
- **Assigned Feature IDs:**
  - `FEAT-SHELL-01` (Workspace Navigation & View Switching - `daAppShell`)
  - `FEAT-SHELL-02` (Header & Status Banner)
  - `FEAT-SHELL-03` (Project Selector & Multi-Project Isolation)
  - `FEAT-STATE-02` (ViewState & Position Persistence - `DA_User_Preference__c`)
  - `FEAT-DATA-02` (User Annotations & Notes - `DA_Annotation__c`)
- **Status:** `READY FOR USER AUTHORIZATION` (Prerequisites verified)
- **Workstream Owners:** Workstream A (Shell/Navigation), Workstream C (Persistence Services)

### Wave 3: Core Analytical Views & SLDS Panels
- **Objective:** Port core analytical side panels and error diagnostics into native SLDS LWCs.
- **Assigned Feature IDs:**
  - `FEAT-SHELL-05` (Error Boundary & Diagnostics Overlay)
  - `FEAT-PANEL-01` (Feature Matrix Panel)
  - `FEAT-PANEL-06` (Coupling Heatmap & Hotspot Panel)
  - `FEAT-PANEL-08` (Findings & Rule Violations Panel)
  - `FEAT-ADV-03` (Detached Feature Overlay & Slide-out Drawers)
  - `FEAT-DATA-03` (User Preferences Storage)
- **Status:** `PLANNED`
- **Workstream Owners:** Workstream A, Workstream E, Workstream C

### Wave 4: Advanced Visualizations & Specialized Layouts
- **Objective:** Port remaining specialized React visualization views to LWC.
- **Assigned Feature IDs:**
  - `FEAT-SHELL-04` (Command Palette & Keyboard Shortcuts)
  - `FEAT-PANEL-02` (Architecture DNA Barcode)
  - `FEAT-PANEL-03` (Architecture Treemap Panel)
  - `FEAT-PANEL-04` (Dependency River Panel)
  - `FEAT-PANEL-05` (Subway Map Panel)
  - `FEAT-PANEL-07` (Architecture Radar Panel)
- **Status:** `PLANNED`
- **Workstream Owners:** Workstream E

### Wave 5: Refactoring Simulation, Snapshot Compare & Advanced Analytics
- **Objective:** Implement what-if refactoring simulator and cross-run graph snapshot comparison.
- **Assigned Feature IDs:**
  - `FEAT-ADV-01` (Refactoring Simulation Panel)
  - `FEAT-ADV-02` (Snapshot Compare Mode)
  - `FEAT-DATA-01` (Data Export PNG/CSV/JSON - LWC Blob Handler)
- **Status:** `PLANNED`
- **Workstream Owners:** Workstream E, Workstream F

### Wave 6: End-to-End Integration, LWS Hardening & Live Org Acceptance
- **Objective:** Execute live SFDX org deployment, Apex test coverage (>85%), restricted profile FLS/CRUD testing, Lightning Web Security compliance, and final user sign-off.
- **Assigned Feature IDs:** All 32 features end-to-end.
- **Status:** `DEFERRED` (Pending user-provided Salesforce org)
- **Workstream Owner:** Workstream G

---

## 3. Workstream Concurrency & Shared File Boundaries

To prevent concurrent agent collisions during implementation, files are assigned strict workstream boundaries:

| Workstream | Assigned Directory / File Path | Conflict Risk Controls |
|---|---|---|
| **Workstream A** | `scratch/salesforce-poc/.../lwc/daAppShell/`<br>`scratch/salesforce-poc/.../lwc/daProjectSelector/` | Owns top-level app wrapper and tab routing. Must not edit Cytoscape canvas core. |
| **Workstream B** | `analyze/`, `scripts/`, `explorer-contract.ts` | Owns external Node.js AST parsing and CLI tools. Immutable external boundary. |
| **Workstream C** | `scratch/salesforce-poc/.../classes/`<br>`scratch/salesforce-poc/.../objects/` | Owns Apex controllers (`DAUserPreferenceController`, `DAAnnotationController`) and Custom Objects. |
| **Workstream D** | `scratch/salesforce-poc/.../lwc/daGraphViewer/`<br>`scratch/salesforce-poc/.../lwc/daLayoutEngine/` | Owns Cytoscape canvas and `daLayoutEngine.js`. Enforces SELECTION ≠ NAVIGATION invariant. |
| **Workstream E** | `scratch/salesforce-poc/.../lwc/daFeatureMatrixPanel/`<br>`scratch/salesforce-poc/.../lwc/daHotspotPanel/` etc. | Owns individual LWC panel components. Independent module boundaries. |
| **Workstream F** | `scratch/salesforce-poc/.../lwc/daSnapshotCompare/` | Owns graph diff algorithms and file export utilities. |
| **Workstream G** | `scratch/salesforce-poc/.../classes/*Test.cls` | Owns Apex test classes, PMD static analysis, and SFDX deployment manifests. |
