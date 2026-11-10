# Authoritative Master Migration Gap Register V2

## Document Metadata
- **Classification**: Authoritative Re-Audit Register & Governance Baseline
- **Audit Date**: 2026-11-10
- **Auditor**: Jules Master Dispatch & Coordination Agent
- **Baseline Git Commit**: `116391ac5b2321b30be1da23a4218d76b586f027`
- **Preceding Wave Status**: Wave 5A RATIFIED AND FORMALLY CLOSED (`PO-RAT-WAVE5A-2026-11-10`)
- **Quarantined Components**: Wave 9 Refactoring Engine & Handoff Modal (excluded via `.forceignore`)

---

## 1. Executive Summary & Inventory Reconciliation

Following a comprehensive second-pass re-audit of the complete Dependency Analyzer archive (`3,112` files across React frontend and Salesforce metadata/code), this register supersedes `MASTER_REMAINING_GAPS.md` and its associated CSV.

### 1.1 Priority Distribution Correction
In the previous audit round, an inconsistency existed between the CSV (which registered P0: 5, P1: 9, P2: 2 = 16 total) and the execution report text (which miscounted P1: 8, P2: 3). Furthermore, critical technical deficits identified in Apex ingestion, database constraints, contract alignment, and test coverage were previously omitted from the formal register.

This authoritative V2 register incorporates:
- The **16 original reconciled findings**
- **8 newly confirmed critical findings** (GAP-ING-03, GAP-ING-04, GAP-ING-05, GAP-CON-01, GAP-CON-02, GAP-CON-03, GAP-PAR-04, GAP-TEST-01)

### Authoritative Distribution (24 Total Findings):
- **P0 (Critical / Blocker)**: **9 findings**
- **P1 (Major Functional / Architectural)**: **12 findings**
- **P2 (Moderate / Approved Difference / Omission)**: **3 findings**
- **Total Registered Gaps**: **24 findings**

---

## 2. Exhaustive Gap Register

### Priority P0: Critical / Blocker Gaps (9 Findings)

#### 1. GAP-ING-01 — Missing Ingestion Transport: DAGraphIngestionService Unexposed
- **Category**: Ingestion & Persistence
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`
- **React Counterpart**: Vite static dev server filesystem export
- **Status**: `CONFIRMED` (PARTIALLY_IMPLEMENTED)
- **Root Cause**: `DAGraphIngestionService.cls` implements core persistence logic (`createProject`, `createAnalysisRun`, `saveGraphChunks`) but lacks `@AuraEnabled` or `@RestResource` annotations. External callers cannot invoke ingestion over HTTP.
- **Recommended Owner**: Workstream A (WS-A)
- **Release Impact**: Blocker for v1.0 automated ingestion pipeline.

#### 2. GAP-ING-02 — Node.js Analyzer Lacks Salesforce Upload Command
- **Category**: Ingestion & Persistence
- **Source Location**: `dependency-analyzer.cjs`
- **React Counterpart**: `npm run analyze` direct JSON generation
- **Status**: `CONFIRMED` (MISSING)
- **Root Cause**: The CLI analyzer produces chunked JSON but contains no HTTP client or transport layer to dispatch chunks to Salesforce.
- **Recommended Owner**: Workstream A (WS-A)
- **Release Impact**: Blocker for continuous integration ingestion.

#### 3. GAP-ING-03 — Analysis Run Upload Lifecycle Vulnerability & Premature AVAILABLE Status
- **Category**: Ingestion & Persistence
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls:83-138`
- **React Counterpart**: N/A (local filesystem synchronous load)
- **Status**: `CONFIRMED` (ARCHITECTURAL_DEFICIENCY)
- **Root Cause**: In `DAGraphIngestionService.createAnalysisRun()`, runs are inserted with no status parameter. The underlying object metadata defaults `Status__c` to `AVAILABLE`. In `DAGraphController.getLatestGraphMetadataForProject()`, candidate runs are queried where `Status__c == AVAILABLE`, and if `Total_Chunks__c` is null, expected chunks are derived from actual chunks. Consequently, an aborted or in-flight partial run becomes visible to users and can displace a previously valid complete run.
- **Recommended Owner**: Workstream A (WS-A)
- **Release Impact**: Blocker for data integrity and reliability.

#### 4. GAP-ING-04 — Absence of Total Payload Size Cap Enforcement in Apex
- **Category**: Ingestion & Persistence
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls:9`
- **React Counterpart**: N/A (memory only)
- **Status**: `CONFIRMED` (UNVERIFIED)
- **Root Cause**: While `MAX_TOTAL_PAYLOAD_SIZE = 10485760` is defined in Apex, it is never evaluated during run creation, chunk persistence, or finalization. A runaway client could insert unlimited chunks across multiple batch calls, evading platform safety boundaries.
- **Recommended Owner**: Workstream A (WS-A)
- **Release Impact**: Blocker for multi-tenant governor limit protection.

#### 5. GAP-ING-05 — Missing Database Uniqueness Constraint on Run Chunks
- **Category**: Ingestion & Persistence
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/objects/DA_Graph_Chunk__c/fields/Chunk_Index__c.field-meta.xml`
- **React Counterpart**: N/A (local array)
- **Status**: `CONFIRMED` (ARCHITECTURAL_DEFICIENCY)
- **Root Cause**: `saveGraphChunks` executes a SOQL query to detect existing chunk indices before executing `insert`. Under concurrent batch uploads or rapid retries, a race condition allows duplicate `DA_Graph_Chunk__c` records with identical `Chunk_Index__c` to be inserted, corrupting client reassembly.
- **Recommended Owner**: Workstream A (WS-A)
- **Release Impact**: Blocker for concurrent ingestion safety.

#### 6. GAP-SEC-01 — Overly Broad Object Permissions Undermine Project Isolation
- **Category**: Security & Isolation
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml:14-60`
- **React Counterpart**: Client-side isolated local directory
- **Status**: `CONFIRMED` (ARCHITECTURAL_DEFICIENCY)
- **Root Cause**: Permission set grants `<viewAllRecords>true</viewAllRecords>` across all six custom objects, bypassing sharing rules and allowing any analyst to inspect architectures of projects they do not own.
- **Recommended Owner**: Workstream B (WS-B)
- **Release Impact**: Blocker for enterprise multi-tenant security compliance.

#### 7. GAP-SEC-02 — OWD Sharing for DA_Project__c is ReadWrite Instead of Private
- **Category**: Security & Isolation
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/DA_Project__c.object-meta.xml:10`
- **React Counterpart**: Local directory isolation
- **Status**: `CONFIRMED` (ARCHITECTURAL_DEFICIENCY)
- **Root Cause**: Organization-Wide Default sharing is set to `ReadWrite`. Child objects (`DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, `DA_Annotation__c`) have sharing model `ControlledByParent`, thus inheriting public read/write access.
- **Recommended Owner**: Workstream B (WS-B)
- **Release Impact**: Blocker for project data isolation.

#### 8. GAP-TEST-01 — Missing Direct Apex Ingestion Tests & Offline Harness
- **Category**: Testing & Evidence
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/classes/tests/`
- **React Counterpart**: N/A
- **Status**: `CONFIRMED` (MISSING_TEST_COVERAGE)
- **Root Cause**: Zero Apex test classes in `classes/tests/` and zero offline test runners in `scratch/salesforce-poc/tests/` instantiate or invoke `DAGraphIngestionService`.
- **Recommended Owner**: Workstream F (WS-F) & WS-A
- **Release Impact**: Blocker for continuous integration and deployment verification.

#### 9. GAP-ENV-01 — Apex Unit Tests and Governor Execution Unverified in Live Org
- **Category**: Environment & Release
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/classes/tests/*.cls`
- **React Counterpart**: Vitest test runners
- **Status**: `CONFIRMED` (UNVERIFIED)
- **Root Cause**: Offline test suites (31 suites) pass cleanly via Node.js built-ins, but live Salesforce org deployment, SOQL/DML governor enforcement, and Apex execution remain unverified due to lack of live staging org access.
- **Recommended Owner**: Workstream F (WS-F)
- **Release Impact**: Blocker for production release certification.

---

### Priority P1: Major Functional / Architectural Gaps (12 Findings)

#### 10. GAP-CON-01 — CONTRACT-04 Zero-Schema Invariant Discrepancy
- **Category**: Contract Reconciliation
- **Source Location**: `docs/waves-5-9/phase-a3/CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md:42`
- **React Counterpart**: N/A
- **Status**: `CONFIRMED` (DOCUMENTATION_DIVERGENCE)
- **Root Cause**: CONTRACT-04 text asserts strict zero-schema and claims fields like `Status__c`, `Node_Count__c`, etc. DO NOT EXIST. In reality, these fields exist in `DA_Analysis_Run__c` metadata and are actively used by `DAGraphController`. CONTRACT-04 document is stale relative to actual schema.
- **Recommended Owner**: Workstream A (WS-A) / Coordinator D1
- **Release Impact**: Governance and API definition risk.

#### 11. GAP-CON-02 — CONTRACT-05 Status Retains PROPOSED Despite Ratification
- **Category**: Contract Reconciliation
- **Source Location**: `docs/waves-5-9/phase-a3/CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md:6`
- **React Counterpart**: N/A
- **Status**: `CONFIRMED` (DOCUMENTATION_DIVERGENCE)
- **Root Cause**: CONTRACT-05 header displays `Status: PROPOSED` even though PO-REQ-02 formally ratified Option A on 2026-11-10. Requires administrative status reconciliation.
- **Recommended Owner**: Workstream C (WS-C) / Coordinator D1
- **Release Impact**: Minor governance documentation alignment.

#### 12. GAP-CON-03 — CONTRACT-08 Approved View Key Divergence
- **Category**: Contract Reconciliation
- **Source Location**: `docs/waves-5-9/phase-a3/CONTRACT_08_WORKSPACE_REGISTRATION_AND_MOUNT.md:33`
- **React Counterpart**: `explorer/src/registry/workspace-registry.ts`
- **Status**: `CONFIRMED` (DOCUMENTATION_DIVERGENCE)
- **Root Cause**: CONTRACT-08 specifies 11 view keys (`graph`, `matrix`, `findings`, `radar`, `treemap`, `subway`, `hotspots`, `diagnostics`, `history`, `compare`, `refactoring`), whereas `daAppShell.js` implements 11 view keys (`graph`, `matrix`, `findings`, `dashboard`, `history`, `diagnostics`, `hotspots`, `radar`, `treemap`, `subway`, `dna`). CONTRACT-08 mapped `diagnostics` to `daArchitectureDnaBarcode`, while the shell separates `diagnostics` (`daDiagnosticsView`) and `dna` (`daArchitectureDnaBarcode`).
- **Recommended Owner**: Workstream C (WS-C) / Coordinator D1
- **Release Impact**: Architectural contract clarity.

#### 13. GAP-MNT-01 — Pure SVG Dependency River (daSankeyView) Unmounted
- **Category**: Mounting & Integration
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/`
- **React Counterpart**: `explorer/src/components/DependencyRiverPanel.tsx`
- **Status**: `CONFIRMED` (IMPLEMENTED_NOT_MOUNTED)
- **Root Cause**: `daSankeyView` was implemented and verified under REM-02 with full offline tests, but is not registered in `APPROVED_VIEWS` or mounted in `daAppShell.html`.
- **Recommended Owner**: Workstream C (WS-C)
- **Release Impact**: Major visualization lens inaccessible to users.

#### 14. GAP-MNT-02 — Dual-Snapshot Comparison Modal Unmounted in Shell
- **Category**: Mounting & Integration
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/`
- **React Counterpart**: `explorer/src/components/ComparePanel.tsx`
- **Status**: `CONFIRMED` (IMPLEMENTED_NOT_MOUNTED)
- **Root Cause**: `daSnapshotComparisonModal` was implemented under REM-03, but no launch button exists in `daHeader` or `daAppShell`.
- **Recommended Owner**: Workstream C (WS-C)
- **Release Impact**: Historical comparison workflow inaccessible to users.

#### 15. GAP-MNT-03 — Filter Preset Manager Unmounted in Shell
- **Category**: Mounting & Integration
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/`
- **React Counterpart**: `explorer/src/components/SearchFilterPanel.tsx`
- **Status**: `CONFIRMED` (IMPLEMENTED_NOT_MOUNTED)
- **Root Cause**: Preset manager component is fully implemented and tested (Lane C) but not rendered inside `daSidebar` or `daHeader`.
- **Recommended Owner**: Workstream C (WS-C)
- **Release Impact**: Filter preset management UX gap.

#### 16. GAP-WKF-01 — Finding Review Status Workflow In-Memory Only
- **Category**: Persistent Workflows
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsView/daFindingsView.js`
- **React Counterpart**: `explorer/src/components/findings/FindingsPanel.tsx`
- **Status**: `CONFIRMED` (PARTIALLY_IMPLEMENTED)
- **Root Cause**: Finding status toggles (`OPEN`, `IN_REVIEW`, `RESOLVED`) update internal LWC reactive state only. No Apex controller or schema exists to persist statuses to `DA_Finding__c`.
- **Recommended Owner**: Workstream D (WS-D)
- **Release Impact**: Audit findings progress lost upon navigation or refresh.

#### 17. GAP-WKF-02 — Project Creation & Manifest Upload UI Missing
- **Category**: Persistent Workflows
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/`
- **React Counterpart**: `explorer/src/components/ProjectCreationModal.tsx`
- **Status**: `CONFIRMED` (MISSING)
- **Root Cause**: Project selector only lists existing projects. No modal or action exists in the Salesforce UI to initialize a new project or upload an analysis manifest.
- **Recommended Owner**: Workstream D (WS-D)
- **Release Impact**: Project onboarding requires backend CLI or Apex execution.

#### 18. GAP-WKF-03 — Command Palette (Cmd+K) Missing from Shell
- **Category**: Persistent Workflows
- **Source Location**: `explorer/src/components/CommandPalette.tsx`
- **React Counterpart**: `explorer/src/components/CommandPalette.tsx`
- **Status**: `CONFIRMED` (MISSING)
- **Root Cause**: Keyboard-driven quick-search and lens switching modal was not migrated to LWC.
- **Recommended Owner**: Workstream D (WS-D)
- **Release Impact**: Power-user navigation parity gap.

#### 19. GAP-WKF-04 — Interactive Node/Edge Rich Hover Cards Missing
- **Category**: Persistent Workflows
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/`
- **React Counterpart**: `explorer/src/components/graph-internals/NodeHoverCard.tsx`
- **Status**: `CONFIRMED` (MISSING)
- **Root Cause**: Cytoscape canvas provides click selection but lacks floating rich popovers displaying metrics and dependencies on node hover.
- **Recommended Owner**: Workstream D (WS-D)
- **Release Impact**: Visual exploration UX gap.

#### 20. GAP-PAR-02 — Node Position Multi-User Concurrency Unverified
- **Category**: React Parity & Performance
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
- **React Counterpart**: `explorer/src/components/GraphView.tsx`
- **Status**: `CONFIRMED` (UNVERIFIED)
- **Root Cause**: Node dragging saves positions into `DA_User_Preference__c` per user, but concurrent preference overwrites under rapid pan/drag remain unverified in a live org.
- **Recommended Owner**: Workstream E (WS-E)
- **Release Impact**: Graph layout stability under heavy usage.

#### 21. GAP-ENV-02 — End-to-End Browser UI Automation (Playwright) Missing
- **Category**: Environment & Release
- **Source Location**: `tests/e2e/`
- **React Counterpart**: `scripts/audit-phase21-browser.cjs`
- **Status**: `CONFIRMED` (MISSING)
- **Root Cause**: While 31 offline CJS unit suites run cleanly, automated real-browser end-to-end DOM tests for the Salesforce LWC experience do not exist.
- **Recommended Owner**: Workstream F (WS-F)
- **Release Impact**: High-confidence regression test gate missing.

---

### Priority P2: Moderate / Approved Difference / Omission Gaps (3 Findings)

#### 22. GAP-PAR-01 — Constellation Radial Layout Divergence
- **Category**: React Parity & Performance
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`
- **React Counterpart**: `explorer/src/components/DependencyConstellationPanel.tsx`
- **Status**: `CONFIRMED` (APPROVED_DIFFERENCE)
- **Root Cause**: React utilizes a D3-force simulation engine. Salesforce uses pure deterministic SVG polar math to adhere to the pure simulation isolation invariant.
- **Recommended Owner**: Workstream E (WS-E)
- **Release Impact**: None (approved architectural difference).

#### 23. GAP-PAR-03 — Large Graph (PBIM 500+ nodes) Rendering Thresholds
- **Category**: React Parity & Performance
- **Source Location**: `scratch/salesforce-poc/force-app/main/default/staticresources/cytoscape.resource`
- **React Counterpart**: `explorer/src/components/GraphView.tsx`
- **Status**: `CONFIRMED` (UNVERIFIED)
- **Root Cause**: Cytoscape graph rendering under Lightning Web Security (LWS) DOM virtualization with 500+ nodes has not been empirically benchmarked in a production browser environment.
- **Recommended Owner**: Workstream E (WS-E)
- **Release Impact**: Potential browser UI lag on very large enterprise org graphs.

#### 24. GAP-PAR-04 — Missing React Workspace Lenses in Feature Parity Matrix
- **Category**: React Parity & Performance
- **Source Location**: `explorer/src/registry/workspace-registry.ts:38-42`
- **React Counterpart**: `explorer/src/registry/workspace-registry.ts`
- **Status**: `CONFIRMED` (MISSING_INVENTORY)
- **Root Cause**: Previous parity matrices omitted four secondary React lenses (`heatmap`, `tree`, `profile`, `four-direction`) and standalone lens registration for `constellation`.
- **Recommended Owner**: Workstream E (WS-E)
- **Release Impact**: Minor parity tracking documentation omission.
