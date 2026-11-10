# Master Remaining Gaps Register

This authoritative register documents all remaining gaps, unmounted components, missing features, architectural defects, and security risks identified in the Dependency Analyzer React-to-Salesforce migration as of commit `2d2acc271d49dfa917ab0b2e3db47437c7884259` following the formal closure of Wave 5A.

---

## 1. Executive Summary of Findings

| Gap ID | Priority | Category | Current Status | Title | Recommended Owner |
|---|---|---|---|---|---|
| **GAP-ING-01** | P0 | Ingestion & Persistence | PARTIALLY_IMPLEMENTED | Missing Ingestion Transport: `DAGraphIngestionService` Unexposed to External Callers | WS-A |
| **GAP-ING-02** | P0 | Ingestion & Persistence | MISSING | Node.js Analyzer Lacks Salesforce Upload & Ingestion Command | WS-A |
| **GAP-SEC-01** | P0 | Security & Isolation | ARCHITECTURAL_DEFICIENCY | Overly Broad Object Permissions (`viewAllRecords: true`) Undermine Project Isolation | WS-B |
| **GAP-SEC-02** | P0 | Security & Isolation | ARCHITECTURAL_DEFICIENCY | Organization-Wide Default Sharing for `DA_Project__c` is `ReadWrite` Instead of `Private` | WS-B |
| **GAP-MNT-01** | P1 | Mounting & Integration | IMPLEMENTED_NOT_MOUNTED | Pure SVG Dependency River (`daSankeyView` / REM-02) Excluded from `daAppShell` Navigation | WS-C |
| **GAP-MNT-02** | P1 | Mounting & Integration | IMPLEMENTED_NOT_MOUNTED | Dual-Snapshot Comparison Modal (`daSnapshotComparisonModal` / REM-03) Unmounted in Shell | WS-C |
| **GAP-MNT-03** | P1 | Mounting & Integration | IMPLEMENTED_NOT_MOUNTED | Filter Preset Manager (`daPresetManager`) Unmounted and Inaccessible in Navigation | WS-C |
| **GAP-WKF-01** | P1 | Persistent Workflows | PARTIALLY_IMPLEMENTED | Finding Review Status Workflow Exists Only In-Memory Without Apex Persistence | WS-D |
| **GAP-WKF-02** | P1 | Persistent Workflows | MISSING | Project Creation & Manifest Upload UI Missing from Salesforce App Shell | WS-D |
| **GAP-WKF-03** | P1 | Persistent Workflows | MISSING | Quick Search / Command Palette (`Cmd+K` / `Ctrl+K`) Missing from Salesforce Shell | WS-D |
| **GAP-WKF-04** | P1 | Persistent Workflows | MISSING | Interactive Node and Edge Rich Hover Cards Missing from `daGraphViewer` | WS-D |
| **GAP-PAR-01** | P2 | React Parity & Performance | APPROVED_DIFFERENCE | Constellation Radial Layout Divergence: D3 Dynamic Force vs Deterministic SVG Math | WS-E |
| **GAP-PAR-02** | P1 | React Parity & Performance | UNVERIFIED | Graph Node Position Persistence Implemented but Lacks Live Multi-User Concurrency Verification | WS-E |
| **GAP-PAR-03** | P2 | React Parity & Performance | UNVERIFIED | Large Graph (PBIM 500+ nodes) Rendering Thresholds Under Salesforce Lightning Locker/LWS | WS-E |
| **GAP-ENV-01** | P0 | Environment & Release | UNVERIFIED | Apex Unit Tests and Governor Execution Unverified in Live Salesforce Staging Org | WS-F |
| **GAP-ENV-02** | P1 | Environment & Release | MISSING | End-to-End Browser UI Automation (Playwright) Missing for Salesforce LWC Experience | WS-F |

---

## 2. Detailed Gap Specifications

### GAP-ING-01: Missing Ingestion Transport: `DAGraphIngestionService` Unexposed to External Callers
- **Priority**: P0
- **Category**: Ingestion & Persistence
- **Current Status**: PARTIALLY_IMPLEMENTED
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`
- **React Counterpart**: Direct filesystem ingestion via Vite static dev server (`explorer/public/projects/*`).
- **Salesforce Counterpart**: `DAGraphIngestionService.cls` (methods `createProject`, `createAnalysisRun`, `saveGraphChunks`).
- **Apex Dependency**: `DAGraphIngestionService.cls`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Project__c`.
- **Metadata Dependency**: Custom objects `DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`.
- **Persistence Dependency**: Insertion of analysis runs and chunk records with index sequencing.
- **Security Implications**: Ingestion methods use `insert as user` and `update as user`, but without an exposed endpoint, external tools cannot authenticate or invoke ingestion.
- **Root Cause**: `DAGraphIngestionService` was implemented as a backend Apex service without `@AuraEnabled` or `@RestResource(urlMapping='/da/v1/ingest/*')` wrappers.
- **Recommended Owner**: Workstream A (Ingestion architecture and persistence).
- **Acceptance Criteria**: Expose a secure, RESTful Apex endpoint or AuraEnabled controller allowing authenticated external clients to create runs and upload chunk batches (up to 10 chunks per call, 128 KB per chunk).
- **Verification Requirements**: Automated Apex REST test suite verifying valid token authentication, project scoping, payload boundary enforcement, and chunk reassembly verification.

---

### GAP-ING-02: Node.js Analyzer Lacks Salesforce Upload & Ingestion Command
- **Priority**: P0
- **Category**: Ingestion & Persistence
- **Current Status**: MISSING
- **Source Locations**: `dependency-analyzer.cjs`
- **React Counterpart**: `npm run analyze` exports JSON directly into `analyze/` and `explorer/public/projects/`.
- **Salesforce Counterpart**: None.
- **Apex Dependency**: Requires GAP-ING-01 endpoint.
- **Metadata Dependency**: Connected App or Salesforce CLI (`sf`) auth configuration.
- **Persistence Dependency**: Chunk generation and network upload.
- **Security Implications**: CLI must securely manage Salesforce OAuth tokens or session IDs without hardcoding secrets.
- **Root Cause**: The CLI analyzer v13 was architected as a local filesystem tool and never extended with a Salesforce ingestion transport client.
- **Recommended Owner**: Workstream A (Ingestion architecture and persistence).
- **Acceptance Criteria**: Add `sf-upload` or `ingest` command to `dependency-analyzer.cjs` (or companion script `sf-ingest.cjs`) that reads `explorer-data.json`, slices chunks <= 131,072 characters, and invokes the Apex ingestion REST API.
- **Verification Requirements**: Integration test using mock Salesforce HTTP server verifying chunking, retry on transient network errors, and run finalization.

---

### GAP-SEC-01: Overly Broad Object Permissions (`viewAllRecords: true`) Undermine Project Isolation
- **Priority**: P0
- **Category**: Security & Isolation
- **Current Status**: ARCHITECTURAL_DEFICIENCY
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml:14,23,32,41,50,59`
- **React Counterpart**: Pure client-side project switcher reading local files.
- **Salesforce Counterpart**: Permission Set `DA_Architecture_Analyst`.
- **Apex Dependency**: `DAGraphController.cls`, `DAAnnotationController.cls`, `DAAnalysisHistoryController.cls`.
- **Metadata Dependency**: `DA_Architecture_Analyst.permissionset-meta.xml`.
- **Persistence Dependency**: Object-level access for `DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`, `DA_Annotation__c`, `DA_User_Preference__c`.
- **Security Implications**: Granting `viewAllRecords: true` on `DA_Project__c` and `DA_Analysis_Run__c` bypasses sharing rules, allowing any user with the permission set to see all projects, defeating multi-tenant project isolation.
- **Root Cause**: Premature addition of `viewAllRecords` during early prototyping to bypass sharing errors before sharing rules and role hierarchies were modeled.
- **Recommended Owner**: Workstream B (Salesforce security and project isolation).
- **Acceptance Criteria**: Remove `viewAllRecords: true` from `DA_Architecture_Analyst`, retain Read/Create/Edit, and establish project-level sharing criteria.
- **Verification Requirements**: Multi-user negative test confirming User A assigned Project X cannot query or retrieve chunks from Project Y.

---

### GAP-SEC-02: Organization-Wide Default Sharing for `DA_Project__c` is `ReadWrite`
- **Priority**: P0
- **Category**: Security & Isolation
- **Current Status**: ARCHITECTURAL_DEFICIENCY
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/DA_Project__c.object-meta.xml:10`
- **React Counterpart**: N/A (isolated local directory).
- **Salesforce Counterpart**: `DA_Project__c` custom object metadata.
- **Apex Dependency**: All controllers enforcing `WITH USER_MODE`.
- **Metadata Dependency**: `DA_Project__c.object-meta.xml`.
- **Persistence Dependency**: Record sharing model.
- **Security Implications**: With OWD `ReadWrite`, all users in the Salesforce org can read and modify all projects and their child runs/chunks/findings.
- **Root Cause**: Default object creation metadata used `ReadWrite` for ease of local testing.
- **Recommended Owner**: Workstream B (Salesforce security and project isolation).
- **Acceptance Criteria**: Change `sharingModel` to `Private` for `DA_Project__c`, ensuring access is granted strictly via project membership, ownership, or sharing rules.
- **Verification Requirements**: Unit and Apex security tests verifying that queries executed without explicit sharing fail to return unauthorized project records.

---

### GAP-MNT-01: Pure SVG Dependency River (`daSankeyView` / REM-02) Excluded from `daAppShell` Navigation
- **Priority**: P1
- **Category**: Mounting & Integration
- **Current Status**: IMPLEMENTED_NOT_MOUNTED
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js:24-36`, `daAppShell.html`
- **React Counterpart**: `explorer/src/components/DependencyRiverPanel.tsx` (view mode `river`).
- **Salesforce Counterpart**: `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/`
- **Apex Dependency**: None (pure client-side SVG rendering from `payload`).
- **Metadata Dependency**: None.
- **Persistence Dependency**: None.
- **Security Implications**: None.
- **Root Cause**: `daSankeyView` was successfully implemented and ratified in Wave 5A (Task REM-02), but was not added to `APPROVED_VIEWS` or given a template tab in `daAppShell`.
- **Recommended Owner**: Workstream C (Component mounting and integration).
- **Acceptance Criteria**: Add `'sankey'` (or `'river'`) to `APPROVED_VIEWS`, add navigation tab button to `daHeader` or `daSidebar`, and mount `<c-da-sankey-view>` conditionally in `daAppShell.html`.
- **Verification Requirements**: Update `run-coordinator-integration-suite.cjs` to assert switching to `sankey` mounts the component and dispatches node selection.

---

### GAP-MNT-02: Dual-Snapshot Comparison Modal (`daSnapshotComparisonModal` / REM-03) Unmounted in Shell
- **Priority**: P1
- **Category**: Mounting & Integration
- **Current Status**: IMPLEMENTED_NOT_MOUNTED
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html`, `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js:804`
- **React Counterpart**: `explorer/src/components/ComparePanel.tsx`
- **Salesforce Counterpart**: `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/`
- **Apex Dependency**: `DAAnalysisHistoryController.getAnalysisRuns`, `DAGraphController.getGraphChunks`.
- **Metadata Dependency**: None.
- **Persistence Dependency**: Dual run loading.
- **Security Implications**: Must enforce project isolation when fetching dual snapshot payloads.
- **Root Cause**: `handleHeaderActionTrigger('compare')` currently routes to view `'history'` instead of opening the dedicated `daSnapshotComparisonModal`.
- **Recommended Owner**: Workstream C (Component mounting and integration).
- **Acceptance Criteria**: Mount `<c-da-snapshot-comparison-modal>` in `daAppShell.html`, wired to open on header `compare` action, passing `project-id`, handling close and run comparison diff events.
- **Verification Requirements**: Integration test verifying modal open, baseline and comparison run selection, diff computation trigger, and node selection forwarding.

---

### GAP-MNT-03: Filter Preset Manager (`daPresetManager`) Unmounted and Inaccessible in Navigation
- **Priority**: P1
- **Category**: Mounting & Integration
- **Current Status**: IMPLEMENTED_NOT_MOUNTED
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/`
- **React Counterpart**: `explorer/src/components/SearchFilterPanel.tsx` preset pills.
- **Salesforce Counterpart**: `daPresetManager` LWC bundle.
- **Apex Dependency**: `DAUserPreferenceController` (filtersJson persistence).
- **Metadata Dependency**: None.
- **Persistence Dependency**: Save/load filter preset JSON.
- **Security Implications**: User preferences are scoped to `OwnerId = :UserInfo.getUserId()`.
- **Root Cause**: Component was created during Wave 4 Phase 2 Lane C, verified by isolated runner `run-lane-c-preset-manager-tests.cjs`, but omitted from `daSidebar` and `daAppShell`.
- **Recommended Owner**: Workstream C (Component mounting and integration).
- **Acceptance Criteria**: Mount `<c-da-preset-manager>` inside `daSidebar` or as a popover utility, connecting preset selection to `daAppShell.handleFilterChange`.
- **Verification Requirements**: Integration test verifying preset creation, selection, and propagation to shell filter criteria.

---

### GAP-WKF-01: Finding Review Status Workflow Exists Only In-Memory Without Apex Persistence
- **Priority**: P1
- **Category**: Persistent Workflows
- **Current Status**: PARTIALLY_IMPLEMENTED
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsView/daFindingsView.js:41,460-500`
- **React Counterpart**: In-memory review statuses in React `FindingsPanel.tsx`.
- **Salesforce Counterpart**: `daFindingsView.js` (`@track reviewStatuses = {}`).
- **Apex Dependency**: None currently implemented.
- **Metadata Dependency**: `DA_Finding__c` custom object has no `Status__c` field.
- **Persistence Dependency**: Missing `Status__c` picklist (`OPEN`, `IN_REVIEW`, `RESOLVED`, `WONT_FIX`) on `DA_Finding__c`.
- **Security Implications**: Users expect findings triage decisions to persist across browser refreshes and be collaborative across team members.
- **Root Cause**: `daFindingsView` cloned the React in-memory prototype behavior (`this.reviewStatuses = { ... }`) without implementing custom field and Apex persistence.
- **Recommended Owner**: Workstream D (Persistent workflows and missing UI).
- **Acceptance Criteria**: Add `Status__c` field to `DA_Finding__c`, expose Apex method `updateFindingStatus(Id findingId, String status)`, and update `daFindingsView` to persist status changes.
- **Verification Requirements**: Offline unit tests and Apex tests verifying status update, validation of allowed values, and user-mode enforcement.

---

### GAP-WKF-02: Project Creation & Manifest Upload UI Missing from Salesforce App Shell
- **Priority**: P1
- **Category**: Persistent Workflows
- **Current Status**: MISSING
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/`
- **React Counterpart**: `explorer/src/components/ProjectCreationModal.tsx`, `ProjectManager.tsx`.
- **Salesforce Counterpart**: None (only read-only project selector `daProjectSelector`).
- **Apex Dependency**: `DAGraphIngestionService.createProject`.
- **Metadata Dependency**: `DA_Project__c`.
- **Persistence Dependency**: Record creation.
- **Security Implications**: Must verify Create permissions on `DA_Project__c`.
- **Root Cause**: Salesforce application assumed projects would be provisioned via automated backend scripts rather than direct UI modal.
- **Recommended Owner**: Workstream D (Persistent workflows and missing UI).
- **Acceptance Criteria**: Provide a "New Project" button in `daHeader` opening a modal that invokes `createProject` with Project Name and Key validation.
- **Verification Requirements**: Unit test asserting modal rendering, input validation, and successful project creation event dispatch.

---

### GAP-WKF-03: Quick Search / Command Palette (`Cmd+K` / `Ctrl+K`) Missing from Salesforce Shell
- **Priority**: P1
- **Category**: Persistent Workflows
- **Current Status**: MISSING
- **Source Locations**: `explorer/src/components/CommandPalette.tsx`, `explorer/src/hooks/useCommandPalette.ts`
- **React Counterpart**: Global `CommandPalette.tsx` supporting fuzzy symbol search, layout switching, and view switching.
- **Salesforce Counterpart**: None (only simple text search input in `daHeader.html`).
- **Apex Dependency**: None (pure client-side).
- **Metadata Dependency**: None.
- **Persistence Dependency**: None.
- **Security Implications**: None.
- **Root Cause**: Scope limitation in earlier waves; deferred to post-Wave 5.
- **Recommended Owner**: Workstream D (Persistent workflows and missing UI).
- **Acceptance Criteria**: Implement `daCommandPalette` LWC with keyboard listener (`Cmd+K` / `Ctrl+K`), node search, view switcher commands, and node selection dispatch.
- **Verification Requirements**: Component unit tests verifying keyboard event binding, fuzzy filtering, and event emission.

---

### GAP-WKF-04: Interactive Node and Edge Rich Hover Cards Missing from `daGraphViewer`
- **Priority**: P1
- **Category**: Persistent Workflows
- **Current Status**: MISSING
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/`
- **React Counterpart**: `explorer/src/components/graph-internals/NodeHoverCard.tsx`, `EdgeHoverCard.tsx`.
- **Salesforce Counterpart**: Native HTML title tooltips only (`title="Constellation Polar Layout"`, etc.).
- **Apex Dependency**: None.
- **Metadata Dependency**: None.
- **Persistence Dependency**: None.
- **Security Implications**: None.
- **Root Cause**: Wave 5 Task W5-6 ('Hover Cards & Node Previews') was scheduled but not implemented due to serial dependency constraints.
- **Recommended Owner**: Workstream D (Persistent workflows and missing UI).
- **Acceptance Criteria**: Floating popover in `daGraphViewer` appearing on Cytoscape node `mouseover` displaying component type, layer, incoming/outgoing degree, and critical findings count.
- **Verification Requirements**: Unit test asserting tooltip container positioning, data binding, and unmount on `mouseout`.

---

### GAP-PAR-01: Constellation Radial Layout Divergence: D3 Dynamic Force vs Deterministic SVG Math
- **Priority**: P2
- **Category**: React Parity & Performance
- **Current Status**: APPROVED_DIFFERENCE
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js:371-460`
- **React Counterpart**: D3-force dynamic simulation in `explorer/src/components/DependencyConstellationPanel.tsx`.
- **Salesforce Counterpart**: Deterministic polar concentric ring geometry in `daLayoutEngine.computeConstellationLayout`.
- **Apex Dependency**: None.
- **Metadata Dependency**: None.
- **Persistence Dependency**: None.
- **Security Implications**: None.
- **Root Cause**: Approved architectural invariant: Pure simulation isolation and zero D3/Cytoscape runtime dependencies for analytical views in Salesforce LWC.
- **Recommended Owner**: Workstream E (React parity and performance).
- **Acceptance Criteria**: Formally document in architecture documentation as an APPROVED_DIFFERENCE; ensure SVG visual fidelity matches polar coordinate expectations.
- **Verification Requirements**: Geometry regression test asserting concentric radii assignment and non-overlapping angular offsets.

---

### GAP-PAR-02: Graph Node Position Persistence Implemented but Lacks Live Multi-User Concurrency Verification
- **Priority**: P1
- **Category**: React Parity & Performance
- **Current Status**: UNVERIFIED
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js:1050-1118`
- **React Counterpart**: LocalStorage position caching in `explorer/src/components/GraphView.tsx`.
- **Salesforce Counterpart**: `daGraphViewer.scheduleSaveState()` invoking `DAUserPreferenceController.saveUserPreference`.
- **Apex Dependency**: `DAUserPreferenceController.cls`.
- **Metadata Dependency**: `DA_User_Preference__c`.
- **Persistence Dependency**: `Positions_JSON__c`, `Zoom_Pan_JSON__c`.
- **Security Implications**: User preferences are scoped per user and project (`UserId + ProjectId`), preventing cross-user collision.
- **Root Cause**: Offline test runner verifies debouncing and serialization, but live database round-trip under concurrent dragging remains unverified.
- **Recommended Owner**: Workstream E (React parity and performance).
- **Acceptance Criteria**: Validate end-to-end position persistence, debounce suppression (800ms window), and payload size limits (<131,072 chars).
- **Verification Requirements**: Automated concurrency test simulating rapid node drags and verifying single terminal persistence write.

---

### GAP-PAR-03: Large Graph (PBIM 500+ nodes) Rendering Thresholds Under Salesforce Lightning Locker/LWS
- **Priority**: P2
- **Category**: React Parity & Performance
- **Current Status**: UNVERIFIED
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/staticresources/cytoscape.resource`
- **React Counterpart**: WebGL/Canvas Cytoscape rendering in unrestricted React browser runtime.
- **Salesforce Counterpart**: Cytoscape running inside Salesforce Lightning Web Security (LWS) shadow DOM sandbox.
- **Apex Dependency**: None.
- **Metadata Dependency**: Static Resource `cytoscape`.
- **Persistence Dependency**: Chunk loading (33 chunks for PBIM).
- **Security Implications**: LWS sandbox wraps DOM APIs and canvas context, creating potential CPU overhead.
- **Root Cause**: Inability to run full Chrome rendering benchmarks in offline headless test environment without live Salesforce scratch org.
- **Recommended Owner**: Workstream E (React parity and performance).
- **Acceptance Criteria**: Benchmark PBIM dataset (528 nodes, 2063 edges) under LWS; confirm initial layout settles under 3.5 seconds.
- **Verification Requirements**: Performance benchmark harness measuring FPS and layout execution time with synthetic 500-node graph.

---

### GAP-ENV-01: Apex Unit Tests and Governor Execution Unverified in Live Salesforce Staging Org
- **Priority**: P0
- **Category**: Environment & Release
- **Current Status**: UNVERIFIED
- **Source Locations**: `scratch/salesforce-poc/force-app/main/default/classes/tests/*.cls`
- **React Counterpart**: Vitest test runner.
- **Salesforce Counterpart**: Salesforce Apex Test Runner (`sf apex run test`).
- **Apex Dependency**: All 4 Apex test classes (`DAGraphSecurityTest`, `DAGraphControllerTest`, `DASchemaAndSecurityTest`, `DAUserPreferenceControllerTest`).
- **Metadata Dependency**: Salesforce scratch org or developer sandbox.
- **Persistence Dependency**: SOQL and DML operations.
- **Security Implications**: Proves CRUD/FLS enforcement, `WITH USER_MODE`, and SOQL injection immunity.
- **Root Cause**: Lack of live authenticated Salesforce org in current CI sandbox environment.
- **Recommended Owner**: Workstream F (Testing, environment and release evidence).
- **Acceptance Criteria**: Deploy metadata to scratch org, execute `sf apex run test --code-coverage`, and achieve >=85% code coverage with 0 failures.
- **Verification Requirements**: Apex test execution log artifact with individual test results and coverage metrics.

---

### GAP-ENV-02: End-to-End Browser UI Automation (Playwright) Missing for Salesforce LWC Experience
- **Priority**: P1
- **Category**: Environment & Release
- **Current Status**: MISSING
- **Source Locations**: `tests/e2e/` (currently only exists for React `explorer/`)
- **React Counterpart**: React Playwright tests and scripts in `scripts/audit-phase21-browser.cjs`.
- **Salesforce Counterpart**: Node.js mock test runners in `scratch/salesforce-poc/tests/*.cjs`.
- **Apex Dependency**: None directly (browser level).
- **Metadata Dependency**: Lightning Experience app page.
- **Persistence Dependency**: None.
- **Security Implications**: Validates UI clickjacking protection, CSP, and LWS DOM access.
- **Root Cause**: Salesforce test infrastructure relied exclusively on headless Node.js built-ins to maintain zero external npm dependencies.
- **Recommended Owner**: Workstream F (Testing, environment and release evidence).
- **Acceptance Criteria**: Create Playwright test suite verifying login, navigation between all 12 views, node selection, drawer expansion, and URL state restoration in live Lightning Experience.
- **Verification Requirements**: Recorded Playwright test video and screenshot artifact showing successful cross-view navigation.
