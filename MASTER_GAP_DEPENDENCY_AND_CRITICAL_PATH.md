# Master Gap Dependency and Critical Path Map

## 1. Executive Summary

This document charts the real technical and governance dependency graph across all 16 identified migration gaps. It defines which remediation tasks can proceed in parallel, identifies shared-file collision hazards, and establishes the optimal sequential critical path for future implementation dispatches.

---

## 2. Dependency Graph and Parallel Workstreams

```
                   [PROJECT OWNER AUTHORIZATION]
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
[TRACK 1: INGESTION & DATA]                   [TRACK 2: SECURITY & ISOLATION]
  WS-A: Ingestion REST API                      WS-B: Sharing Model Remediation
        (GAP-ING-01)                                  (GAP-SEC-02: OWD Private)
        │                                               │
        ▼                                               ▼
  WS-A: Node.js CLI Upload                      WS-B: Permission Set Hardening
        (GAP-ING-02)                                  (GAP-SEC-01: Remove viewAll)
        │                                               │
        └───────────────────────┬───────────────────────┘
                                ▼
                   [CHECKPOINT 1: DATA SECURITY GATE]
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
[TRACK 3: COMPONENT MOUNT]  [TRACK 4: WORKFLOWS]   [TRACK 5: PARITY & PERF]
  WS-C: Sankey & Modal Mount  WS-D: Finding Review   WS-E: Drag Concurrency &
        (GAP-MNT-01, MNT-02)        (GAP-WKF-01)           LWS Benchmarks
        │                           │                      (GAP-PAR-02, PAR-03)
        ▼                           ▼
  WS-C: Preset Manager Mount  WS-D: Project Create &
        (GAP-MNT-03)                Palette / Tooltips
                                    (GAP-WKF-02..04)
        │                           │                       │
        └───────────────────────┬───┴───────────────────────┘
                                ▼
                   [CHECKPOINT 2: FUNCTIONAL INTEGRATION]
                                │
                                ▼
                    [TRACK 6: RELEASE EVIDENCE]
                      WS-F: Apex Live Tests (GAP-ENV-01)
                      WS-F: Playwright LWC E2E (GAP-ENV-02)
                                │
                                ▼
                      [FINAL D2 AUDIT & PO RATIFICATION]
```

---

## 3. Workstream Execution Matrix & Safe Parallelization

| Workstream | Focus Area | Tasks / Gaps Covered | Primary File Ownership | Parallel Feasibility |
|---|---|---|---|---|
| **WS-A** | Ingestion & Persistence | GAP-ING-01, GAP-ING-02 | `DAGraphIngestionRestResource.cls`<br>`dependency-analyzer.cjs` (or `scripts/sf-ingest.cjs`) | Can run 100% in parallel with WS-B and WS-E |
| **WS-B** | Security & Isolation | GAP-SEC-01, GAP-SEC-02 | `DA_Project__c.object-meta.xml`<br>`DA_Architecture_Analyst.permissionset-meta.xml`<br>`DAGraphSecurityTest.cls` | Can run 100% in parallel with WS-A and WS-E |
| **WS-C** | Component Mounting | GAP-MNT-01, GAP-MNT-02, GAP-MNT-03 | `daAppShell.html`<br>`daAppShell.js`<br>`daSidebar.html`<br>`daHeader.html` | Serialized after Checkpoint 1; owns Shell mounting |
| **WS-D** | Persistent Workflows | GAP-WKF-01, GAP-WKF-02, GAP-WKF-03, GAP-WKF-04 | `DA_Finding__c` metadata<br>`DAFindingController.cls`<br>`daFindingsView.*`<br>`daProjectCreationModal.*`<br>`daCommandPalette.*`<br>`daGraphViewer.*` (hover cards) | Must coordinate shell entry points with WS-C |
| **WS-E** | Parity & Performance | GAP-PAR-01, GAP-PAR-02, GAP-PAR-03 | `daLayoutEngine.js`<br>`daGraphViewer.js` (concurrency)<br>Benchmark harnesses | Can run in parallel with WS-A and WS-B |
| **WS-F** | Environment & Release | GAP-ENV-01, GAP-ENV-02 | Apex test runners<br>`tests/e2e-lwc/` Playwright scripts | Dependent on Checkpoint 2 functional completion |

---

## 4. Shared-File Conflict Analysis & Mitigation

Several high-impact shared files were identified where multiple workstreams could collide:

1. **`daAppShell.js` and `daAppShell.html`**:
   - **Collision Risk**: WS-C needs to add `daSankeyView`, `daSnapshotComparisonModal`, and `daPresetManager`. WS-D needs to mount `daCommandPalette` and `daProjectCreationModal`.
   - **Mitigation**: Assign exclusive ownership of `daAppShell.*` to **WS-C** for Wave 6. WS-D must deliver standalone child components (`daCommandPalette`, `daProjectCreationModal`) with clear public APIs (`@api open()`), which WS-C mounts during shell integration.
2. **`daGraphViewer.js`**:
   - **Collision Risk**: WS-D touches node mouseover tooltips (GAP-WKF-04). WS-E touches drag concurrency persistence (GAP-PAR-02).
   - **Mitigation**: Sequence WS-E (persistence hardening) before WS-D (hover card additions), or isolate hover cards into a dedicated child LWC (`daGraphHoverCard`) with event hooks.
3. **`DA_Architecture_Analyst.permissionset-meta.xml`**:
   - **Collision Risk**: WS-B modifies object permissions (`viewAllRecords`). WS-D may add new fields (`DA_Finding__c.Status__c`).
   - **Mitigation**: WS-B executes first to harden baseline security. WS-D adds field permissions in a subsequent discrete task.

---

## 5. Critical Path Sequence for Execution Dispatch

1. **Phase 1: Ingestion & Security Hardening (Parallel Tracks)**
   - Dispatch WS-A (GAP-ING-01, GAP-ING-02) and WS-B (GAP-SEC-01, GAP-SEC-02) concurrently.
   - Milestone: External analyzer can upload data to a private, project-isolated Salesforce org.
2. **Phase 2: Component Shell Mounting & Workflow Persistence**
   - Dispatch WS-C (GAP-MNT-01, GAP-MNT-02, GAP-MNT-03) and WS-D (GAP-WKF-01).
   - Milestone: All 12 views accessible; comparison modal working; finding review status persisted.
3. **Phase 3: Interactive UI Polish & Performance Benchmarking**
   - Dispatch WS-D (GAP-WKF-02, GAP-WKF-03, GAP-WKF-04) and WS-E (GAP-PAR-02, GAP-PAR-03).
   - Milestone: Project creation modal, command palette, hover cards, and large-graph benchmark verified.
4. **Phase 4: Staging Validation & Independent Release Verification**
   - Dispatch WS-F (GAP-ENV-01, GAP-ENV-02).
   - Milestone: D2 independent verification rendered PASS; PO final ratification for Release 1.0.
