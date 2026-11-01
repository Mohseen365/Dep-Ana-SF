# Salesforce Roadmap Dependency Revalidation
## Phase 2: Independent Cross-Report Consistency, Evidence & Completeness Audit

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY
**Authoritative Baseline Commit:** `f239696a567c85a12534bfbd393ff3cd3aa4025d`

---

## 1. Executive Summary & Roadmap Scope

This report provides an independent forensic evaluation of the proposed implementation roadmap (Waves 5 through 9) documented in `SALESFORCE_MIGRATION_DEPENDENCY_AND_EXECUTION_ROADMAP.md`.

We examined:
- Whether the proposed wave ordering aligns with physical code dependencies and existing partial implementations.
- Whether missing prerequisites exist in the backend (Apex), data model (custom objects), or frontend architecture.
- Whether proposed tasks duplicate already completed work or introduce regression risks against the 32 Wave 4 integration tests.
- What adjustments are required to make the roadmap safe, deterministic, and verifiable.

---

## 2. Detailed Wave-by-Wave Evaluation

### 2.1 Wave 5: Deep Graph Capabilities & Layout Activation (Priority: P1)
- **Proposed Scope:**
  1. Add layout switcher UI to `daAppShell` (enabling Orbit, Constellation, and Sankey layouts from `daLayoutEngine.js`).
  2. Add Focus Controls (`FocusControls.tsx`, `focus-graph.ts`) to `daGraphViewer` for upstream/downstream subgraph isolation.
  3. Add Impact Analysis Controls (`ImpactControls.tsx`, `impact-analysis.ts`) for blast radius highlighting.
  4. Implement dynamic node/edge hover cards in `daGraphViewer`.
- **Validation Assessment:** **HIGHLY SOUND & SAFE (RECOMMENDED FIRST STEP)**.
  - **Prerequisite Check:** All 3 layout algorithms (`computeOrbitLayout`, `computeConstellationLayout`, `computeSankeyLayout`) are already ported, hardened, and pass 100% of offline unit tests in `run-poc-tests.cjs`.
  - **Existing Reusable Code:** `daLayoutEngine.js` is already integrated with `daGraphViewer.js`.
  - **Regression Risk:** Low. Expanding `daGraphViewer` internal capabilities does not alter the shared payload contract or violate `SELECTION ≠ NAVIGATION`.
  - **Acceptance Criteria Verification:** Measurable and unambiguous: User can switch layouts via shell controls; clicking focus isolator renders upstream/downstream subgraphs without changing route.

### 2.2 Wave 6: Core Analytical Views Migration (Priority: P1 / P2)
- **Proposed Scope:**
  1. `daRadarView` (Port of `RadarPanel.tsx` / Health radar polygon metrics).
  2. `daTreemapView` (Port of `ArchitectureTreemapPanel.tsx` / Squarified component packing).
  3. `daSubwayView` (Port of `SubwayPanel.tsx` / Feature transit line map).
  4. `daHotspotsView` (Port of `HotspotPanel.tsx` / High-risk component ranking).
- **Validation Assessment:** **VALID WITH MODIFICATIONS**.
  - **Prerequisite Check:** Requires expanding `const APPROVED_VIEWS = ['graph', 'matrix', 'findings']` in `daAppShell.js` and updating tab rendering in `daAppShell.html`.
  - **Sequencing Dependency:** `daRadarView` depends on the radial coordinate math activated in Wave 5. Implementing Wave 6 after Wave 5 is structurally correct.
  - **Risk Identification:** High tab count may clutter header. The shell must introduce a responsive tab bar or dropdown view selector.
  - **Acceptance Criteria:** Four new tabs mounted in `daAppShell`, receiving shared payload and canonical filter criteria.

### 2.3 Wave 7: Architecture Diagnostics, DNA & History (Priority: P2)
- **Proposed Scope:**
  1. `daDiagnosticsView` (Port of `DiagnosticsPanel.tsx` / Unresolved references, cycle tables).
  2. `daDnaView` (Port of `ArchitectureDNABarcode.tsx` / Architectural signature).
  3. `daHistoryView` (Port of `AnalysisHistoryPanel.tsx` / Historical run browser backed by `DA_Analysis_Run__c` queries).
- **Validation Assessment:** **MISSING BACKEND PREREQUISITES IDENTIFIED**.
  - **Backend Gap:** `DAGraphController.cls` currently lacks a `@AuraEnabled` query method to retrieve historical `DA_Analysis_Run__c` records for a given project.
  - **Prerequisite Requirement:** Wave 7 must explicitly include an Apex backend enhancement task (`getAnalysisRuns(String projectId)`) with unit test coverage before `daHistoryView` can be mounted.
  - **Acceptance Criteria:** Historical runs queryable with user-mode security; diagnostic tables filterable by severity.

### 2.4 Wave 8: Investigation Workbench & Interactive Compare (Priority: P2 / P3)
- **Proposed Scope:**
  1. `daInvestigationDrawer` (Port of `InvestigationDrawer.tsx` / Multi-item investigation workbench).
  2. `daCompareView` (Port of `ComparePanel.tsx` and `graph-diff.ts` / Structural diff between 2 snapshots).
- **Validation Assessment:** **HIGH COMPLEXITY; DUAL-PAYLOAD PREREQUISITE**.
  - **Data Flow Gap:** Current `daAppShell` is architected to load a single graph payload. Snapshot compare requires loading two independent snapshot payloads simultaneously (`runA` and `runB`) and passing both to a diffing engine.
  - **Prerequisite Requirement:** Wave 8 must enhance `daGraphPayloadLoader.js` and `daAppShell.js` to support dual-payload retrieval without memory bloat.
  - **Acceptance Criteria:** Added nodes render green, removed render red, modified render orange; pinning a node opens the investigation drawer.

### 2.5 Wave 9: Refactoring Simulation & Autonomous Handoff (Priority: P3)
- **Proposed Scope:**
  1. Port `change-simulator.ts` and `refactoring-simulation.ts` to client-side LWC.
  2. Implement `daRefactorModal` (Port of `RefactorHandoffModal.tsx`).
- **Validation Assessment:** **FEASIBLE AS FINAL STAGE**.
  - **Independence:** Simulation operates purely on in-memory clones of the graph structure. It does not modify persisted Salesforce records.
  - **Acceptance Criteria:** Simulating node deletion calculates blast radius; handoff modal generates exportable markdown/JSON refactoring proposal.

---

## 3. Recommended Authoritative Wave Execution Order

```
[Wave 5: Deep Graph & Layout Activation]
      │ (Activates ported layout algorithms, hover cards, focus controls)
      ▼
[Wave 6: Core Analytical Views]
      │ (Mounts Radar, Treemap, Subway, Hotspots views in shell)
      ▼
[Wave 7: Diagnostics, DNA & History]
      │ (Requires Apex backend selector for DA_Analysis_Run__c)
      ▼
[Wave 8: Investigation & Compare]
      │ (Requires dual-snapshot loading engine in shell)
      ▼
[Wave 9: Refactoring Simulation]
      │ (Pure in-memory client simulation and ticket export)
```

---

## 4. Implementation Readiness Gate

Is the roadmap safe to use immediately?
**NO.** While the high-level wave sequencing is logical, the roadmap cannot be executed until:
1. The quantitative baseline discrepancies in Report 9 are corrected.
2. The Wave 7 Apex query method prerequisite is formally added to the task specification.
3. The Wave 8 dual-snapshot loading contract is specified.
