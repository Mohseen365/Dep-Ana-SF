# Master Implementation Plan: React-to-Salesforce Architecture Explorer Migration

## 1. Executive Summary & Purpose
This document provides the definitive, evidence-based master implementation plan for the migration of the React Architecture Refactoring Explorer (`explorer/src/`) to the Salesforce Platform (`scratch/salesforce-poc/force-app/main/default/`).

This plan coordinates **six parallel workstreams**, establishes explicit data transfer object (DTO) boundaries, enforces architectural governance invariants, resolves file ownership to avoid collision, and schedules implementation across phased waves.

In strict compliance with **Step A rules**, this document represents planning and architectural blueprints only; no production feature implementation is authorized within this session.

---

## 2. Baseline Architecture & Guiding Principles

### 2.1 Preserved Architecture Principles
1. **External Node.js Analyzer Boundary**: Heavy dependency analysis, graph parsing, and raw parsing logic remain in the external CLI/Node.js analyzer (`scripts/export-explorer.cjs`, `analyze/`). Salesforce functions as the presentation, persistence, security, project workflow, annotation, and interactive consumption layer.
2. **Thin Apex Controllers**: Apex controllers (`force-app/main/default/classes/controllers/`) are strictly presentation-facing entry points that expose `@AuraEnabled` methods, enforce input sanitation, invoke service layers, and return strongly-typed DTOs. Controllers contain no business logic or inline SOQL.
3. **Service & Selector Separation**:
   - **Services** (`classes/services/`): Handle business logic, chunk reassembly/splitting orchestration, validation, payload capping, and transaction boundaries.
   - **Selectors** (`classes/selectors/`): Handle SOQL data retrieval, enforce `WITH USER_MODE`, object/field level security (FLS), and sharing rules (`with sharing`). Selectors perform zero DML.
4. **Explicit DTOs at API Boundaries**: Untyped `Object` and unstructured generic Maps are forbidden at wire boundaries. Apex classes in `classes/dto/` define explicit, typed structures.
5. **Parent-Owned LWC State & Explicit CustomEvents**:
   - State flows downward via public reactive properties (`@api`).
   - Events flow upward via standard DOM `CustomEvent` (`bubbles: true, composed: true, cancelable: false`).
   - Lightning Message Service (LMS) is reserved strictly for decoupling across disconnected component trees (e.g., global utility bar, multi-window detached drawers).
6. **Hard Invariant: SELECTION ≠ NAVIGATION**: Selecting an entity (node, edge, finding, hotspot) updates detail drawers and inspector panels; it **never** triggers implicit view navigation or route changes. View mode switching is exclusively driven by the top-level navigation shell (`daAppShell`, `daSidebar`).
7. **Security & Data Isolation**:
   - All SOQL/DML operations enforce `WITH USER_MODE` and `with sharing`.
   - Record access, project tenancy, and user boundaries are strictly verified with zero bypasses.
   - Apex queries guard against SOQL injection and unauthorized project traversal.
8. **Platform & Performance Limits**:
   - Salesforce LongTextArea field limit: **131,072 characters** (used as max graph chunk size).
   - Ingestion payload cap: **10,485,760 UTF-16 characters (~10 MB)**.
   - Single-canvas invariant: A single Cytoscape canvas instance is preserved in `daGraphViewer` to prevent memory leaks and WebGL context exhaustion.

---

## 3. Six Parallel Workstreams

| Workstream | Domain | Scope & Core Responsibilities | Planning Lead |
| :--- | :--- | :--- | :--- |
| **WS-1** | **Application Shell & Navigation** | Application layout, sidebar, view switcher, page composition, shared state orchestrator, responsive layout, loading/error boundary. | Agent 1 |
| **WS-2** | **Graph Engine & Cytoscape** | Cytoscape lifecycle, graph DTOs, chunk reassembly, layout engine integration, node/edge styling, selection, viewport controls, canvas LOD. | Agent 2 |
| **WS-3** | **Core Analytical Views** | Findings view, Diagnostics view, Hotspots view, Matrix view, Dependency analysis tables, search & filter overlays. | Agent 3 |
| **WS-4** | **Advanced Visualization Views** | Architecture DNA Barcode, Subway Map, Treemap, Constellation, Orbit, Radar 9D, Sankey River, 4-Direction adapter. | Agent 4 |
| **WS-5** | **Portfolio & Project Workflows** | Project selector, Project dashboard, Analysis Run history, Run comparison, dual snapshot diffing, user preferences persistence. | Agent 5 |
| **WS-6** | **Investigation & Collaboration** | Investigation drawer, 1-hop drill, Node annotations, Refactoring simulation engine, Refactor handoff export. | Agent 6 |

---

## 4. Workstream Sequencing and Waves

To ensure zero collisions and unblocked dependencies, implementation is scheduled across four execution waves:

### Wave 0: Foundations & Contracts (Completed Baseline)
- Custom Object schemas (`DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, `DA_Annotation__c`, `DA_User_Preference__c`).
- Chunked ingestion and payload loader services (`DAGraphIngestionService`, `DAGraphChunkService`, `daGraphPayloadLoader`).
- Baseline test harnesses (`run-poc-tests.cjs`, `run-lane-a-schema-tests.cjs`).

### Wave 1: Core Shell, Payload Pipeline & Baseline Viewers (In Progress / Partially Verified)
- **Workstream 1 (Shell)**: `daAppShell`, `daSidebar`, `daHeader` core state wiring.
- **Workstream 2 (Graph)**: `daGraphViewer`, `daLayoutEngine` (P0 Hierarchical layout, P1 Orbit/Constellation).
- **Workstream 5 (Portfolio Foundation)**: `daProjectSelector`, `DAGraphController`, `DAUserPreferenceController`.
- **Wave 1A Certified Tasks**: `daTreemapView` (W6-2), `daSubwayView` (W6-3), `daHotspotsView` (W6-4), `daDiagnosticsView` (W7-1), `daArchitectureDnaBarcode` (W7-2).

### Wave 2: Analytical Views & Advanced Visualizations (Targeted Dispatch)
- **Workstream 3**: `daFindingsView`, `daMatrixView`, filter preset synchronization (`daPresetManager`).
- **Workstream 4**: `daRadarView`, `daSankeyView`, `daFourDirectionView`, advanced SVG renderers.
- **Workstream 5**: `daAnalysisHistory`, `daProjectDashboard`, run comparison dual-snapshot ingestion.

### Wave 3: Deep Investigation & Collaboration Workflows
- **Workstream 6**: `daInvestigationDrawer`, `daAnnotationPanel`, `daRefactoringSimulationPanel`, `daRefactorHandoffModal`.
- Detached window IPC / multi-monitor investigation synchronization via LMS / BroadcastChannel.

### Wave 4: Integration Hardening, End-to-End Governance & Acceptance
- Full coordinator integration suite execution (`run-wave4-integration-suite.cjs`, `run-coordinator-integration-suite.cjs`).
- Performance profiling on benchmark datasets (`pbim`, `cst`, `bqc`).
- Security, sharing, and FLS audits.
- Final production readiness signoff.

---

## 5. Collision Avoidance & File Ownership Rules

To prevent merge conflicts and concurrent mutation collisions:
1. **Single File Ownership**: Every file in `force-app/main/default/` and `scratch/salesforce-poc/tests/` is assigned to exactly **one** workstream.
2. **Protected Shell Coordinator Files**: The top-level coordinator shell files are strictly owned by Workstream 1:
   - `force-app/main/default/lwc/daAppShell/daAppShell.js`
   - `force-app/main/default/lwc/daAppShell/daAppShell.html`
   - `force-app/main/default/lwc/daAppShell/daAppShell.css`
   - `force-app/main/default/lwc/daFilterSchema.js`
   - `tests/run-coordinator-integration-suite.cjs`
   No other workstream may touch these files without Integration Coordinator authorization.
3. **Decoupled View Contracts**: Views communicate with `daAppShell` exclusively through `@api` properties (downward) and standard `CustomEvent`s (upward).
4. **Isolated Test Runners**: Each task must introduce its own dedicated test runner (`run-wX-Y-tests.cjs`) rather than mutating shared baseline runners.

---

## 6. Pre-Implementation Governance Checklist

Before implementation authorization for subsequent waves (Step B):
- [x] Full codebase inspection of React reference (`explorer/src/`) and Salesforce POC.
- [x] Verification of existing offline test suites (20 passing suites).
- [x] Publication of complete shared contracts (`SHARED_CONTRACTS.md`).
- [x] Definition of exact file ownership allowlists (`AGENT_WORKSTREAM_ASSIGNMENTS.md`).
- [x] Resolution of technical decisions DEC-01 through DEC-04 (`BLOCKERS_AND_DECISIONS.md`).
- [x] Verification plan and acceptance criteria approved (`FINAL_MIGRATION_VERIFICATION.md`).
