# Wave 4 Phase 0: Implementation Dependency & Lane Dispatch Plan

| Attribute | Baseline Value |
|---|---|
| **Feature ID** | `FEAT-STATE-03` (Wave 4) |
| **Phase** | Phase 0 — Dependency Analysis & Sequencing Design |
| **Target Architecture** | Shared Filter Foundation + 6 Implementation Lanes (A–F) |
| **Implementation Hold** | **HUMAN AUTHORIZATION RECORDED — IMPLEMENTATION READY FOR SEQUENCED DISPATCH** |

---

## 1. Technical Remediations Dependency Analysis (R1–R4)

Before feature-level parallel development can begin, four critical technical remediations must be addressed:

### 1.1 Remediation R1 — Apex Backward Compatibility & V1/V2 Merge
- **Target Files**:
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`
  - `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls`
  - `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`
- **Technical Problem**: Currently, `DAUserPreferenceController.cls` does not implement schema version recognition. Saving a V1 active filter from an older client or legacy script could overwrite and erase an existing V2 preset container, resulting in data loss.
- **Contract Specification**: `WAVE_4_CANONICAL_V2_SCHEMA_AND_R1_MERGE_CONTRACT.md` mandates fail-closed merge:
  1. Inspect existing `Filters_JSON__c`.
  2. If existing payload is V2 (`schemaVersion: 2`), incoming V1 writes must update `activeFilter` while preserving the `presets` array and `activePresetId`.
  3. If incoming payload is V2, it replaces the existing V2 container atomically.
  4. Null-coalescing: incoming null does not clear existing preferences; empty string clears.
- **Dependency**: Must precede or merge with Lane B (Apex persistence).

### 1.2 Remediation R2 — Exporter Coverage Normalization Correction
- **Target Files**:
  - `scripts/export-explorer.cjs`
  - `scripts/test-export-explorer.cjs`
- **Technical Problem**: Line 331 of `scripts/export-explorer.cjs` currently maps falsy input to `"UNTESTED"`: `if (!status) return "UNTESTED";`. This violates the 4-state coverage semantic invariant where missing data must map to `"UNKNOWN"`.
- **Contract Specification**: `WAVE_4_FINAL_COVERAGE_NORMALIZATION_CONTRACT.md`:
  1. Category A (missing/falsy/blank) -> `"UNKNOWN"`.
  2. Category B (`likely-covered`, `failed`, `known-coverage-failure`) -> Throw `UnresolvedCoverageEvidenceError`.
  3. Category C (legacy non-canonical aliases) -> Throw `UnresolvedCoverageEvidenceError` pending human policy clarification.
  4. Exactly 4 canonical output states: `COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`.
  5. Prohibit caller-controlled boolean bypass.
- **Dependency**: Independent of Apex/LWC; requires dual human sign-off (Lead Architect & Product Owner).

### 1.3 Remediation R3 — Governance Inventory Alignment
- **Target Files**:
  - `docs/audits/salesforce-wave4/WAVE_4_FINAL_EVIDENCE_CLOSURE_REPORT.md`
  - `docs/audits/salesforce-wave4/WAVE_4_FINAL_EVIDENCE_CLOSURE_EXECUTIVE_SUMMARY.md`
- **Technical Problem**: Early audit reports had arithmetic discrepancies (44 vs 46 files) regarding total Wave 4 file inventory.
- **Resolution**: Reconcile governance inventory to the authoritative 46-file inventory in `WAVE_4_FINAL_REMEDIATION_FILE_OWNERSHIP_MATRIX.md`.

### 1.4 Remediation R4 — Field-Specific Payload Boundary Verification
- **Target Files**:
  - `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls`
  - `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`
- **Technical Problem**: Prior drafts referenced a fictitious 100,000 character soft limit. Metadata and Apex source actually enforce 131,072 characters across all three fields (`Filters_JSON__c`, `Positions_JSON__c`, `Zoom_Pan_JSON__c`).
- **Contract Specification**: Add exact-boundary test assertions at 131,072 characters (accepted) and 131,073 characters (rejected with `AuraHandledException`).

---

## 2. Shared Filter Foundation Prerequisites

The Shared Filter Foundation forms the common protocol required before the 6 feature lanes can integrate:

1. **Canonical V2 Filter Schema (`daFilterSchema.js`)**:
   - Defines schema structure: `schemaVersion`, `activePresetId`, `activeFilter`, `presets`.
   - Defines field enums: `riskLevels`, `nodeTypes`, `layers`, `testStatus`, `findingsSeverity`, `findingsStatus`.
   - Provides validation function `validateFilterPayload(payload)` returning `{ valid, errors }`.
2. **Preset CRUD Contract**:
   - `createPreset(name, criteria)`
   - `updatePreset(id, criteria)`
   - `deletePreset(id)`
   - `applyPreset(id)`
3. **Shared Filter State in `daAppShell`**:
   - `daAppShell` acts as the single source of truth for `activeFilterCriteria`.
   - Downward propagation via `@api activeFilterCriteria` to child views.
   - Upward notification via custom events: `filterchange`, `presetapply`, `presetcancel`.
4. **Cross-View Semantics (`DEC-W4-02`)**:
   - Graph view filters nodes/edges by `riskLevels`, `nodeTypes`, `layers`, `testStatus`.
   - Matrix view filters grid cells by component types and risk.
   - Findings view filters finding rows by `findingsSeverity` and `findingsStatus`.
   - Unsupported filter fields in a specific view are gracefully ignored.

---

## 3. Authoritative Six-Lane Implementation Dispatch Matrix

| Lane Identifier | Objective / Primary Responsibility | Exact Owned Files | Dependencies | Allowed Parallelism | Prohibited Modifications | Integration Owner | Required Completion Evidence & Exit Criteria |
|---|---|---|---|---|---|---|---|
| **Lane A** (Shared Foundation) | Canonical V2 Filter Schema, Schema Validation, Filter Event Contracts | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js`<br>`scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | None | Must dispatch first (Blocks dependent UI lanes) | Apex classes, `daAppShell.*`, `daGraphViewer.*`, `daPresetManager/*`, `daMatrixViewer/*`, `daFindingsViewer/*` | Integration Coordinator | `node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` (100% PASS); schema exports validated. |
| **Lane B** (Apex Persistence & Boundaries) | Apex V1/V2 fail-closed merge, preset persistence, 131,072 character payload boundary verification (R1, R4) | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`<br>`scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls`<br>`scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | R1, R4 approvals (Recorded) | Parallel-safe with Lane A; completely decoupled from LWC UI | LWC components, Explorer files, Salesforce metadata XML files | Integration Coordinator | `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` (100% PASS, including R1 merge & R4 boundary assertions). |
| **Lane C** (Preset Manager UI) | Preset dropdown, modal CRUD dialog, project isolation (`DEC-W4-03`) | `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js`<br>`scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.html`<br>`scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.css`<br>`scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js-meta.xml` | Lane A (Foundation Schema Integration Gate) | Parallel-safe with Lanes D, E, F *after* Lane A integration gate | `daAppShell.*`, Apex classes, `daGraphViewer.*`, `daMatrixViewer/*`, `daFindingsViewer/*` | Integration Coordinator | Component unit tests & DOM mount verification in Workstream A suite; zero cross-project preset leakage. |
| **Lane D** (Graph Filter Engine) | Apply active filters to Cytoscape graph nodes and edges (`DEC-W4-02`) | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | Lane A (Foundation Schema Integration Gate) | Parallel-safe with Lanes C, E, F *after* Lane A integration gate | `daAppShell.*`, `daGraphViewer.html`, Apex classes, other viewer LWCs | Integration Coordinator | Filter predicate execution verifies hidden/visible nodes match canonical filter criteria; `run-poc-tests.cjs` 100% PASS. |
| **Lane E** (Matrix View) | Minimal functional Matrix viewer LWC using existing graph analytics payload (`DEC-W4-04`) | `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.js`<br>`scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.html`<br>`scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.css`<br>`scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.js-meta.xml` | Lane A (Foundation Schema Integration Gate) | Parallel-safe with Lanes C, D, F *after* Lane A integration gate | `daAppShell.*`, `daGraphViewer.*`, Apex classes, `daFindingsViewer/*` | Integration Coordinator | Matrix grid renders component dependencies; applies active canonical filters gracefully; no metadata dependencies. |
| **Lane F** (Findings View) | Minimal functional Findings viewer LWC with Lightning Datatable (`DEC-W4-04`) | `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.js`<br>`scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.html`<br>`scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.css`<br>`scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.js-meta.xml` | Lane A (Foundation Schema Integration Gate) | Parallel-safe with Lanes C, D, E *after* Lane A integration gate | `daAppShell.*`, `daGraphViewer.*`, Apex classes, `daMatrixViewer/*` | Integration Coordinator | Datatable renders findings from graph analytics payload; filters by severity/status; no metadata dependencies. |

---

## 3.1 Coordinator Shared File Ownership & Integration Responsibilities

- **Shared File Single-Ownership Invariant:** The shared application shell files:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs`
  are owned **EXCLUSIVELY** by the **Integration Coordinator**.
- **Prohibition on Independent Edits:** Parallel feature lanes (A, B, C, D, E, F) are **strictly prohibited** from independently editing or committing changes to shared shell files.
- **Coordinator Integration Gate:**
  1. Lane A delivers `daFilterSchema.js` and schema unit tests.
  2. Coordinator integrates Lane A schema into `daAppShell` and mounts the shared filter event handlers.
  3. Once Coordinator integration gate passes, dependent Lanes C, D, E, and F are dispatched.
  4. As each lane completes, Coordinator merges the respective subcomponents into `daAppShell` (mounting `daPresetManager` bar, matrix tab view, findings tab view).
  5. Coordinator executes `run-wave4-integration-suite.cjs` and the complete regression suite.

---

## 4. Branching, Recovery, and Execution Strategy

To ensure zero risk to existing repository work and eliminate merge collisions:

### 4.1 Branching Model
1. **Never commit directly to main or integration branches without verification.**
2. **Foundation First (Sequenced Phase 1)**:
   - Execute R1, R2, R4, and Lane A foundation on dedicated task branch `wave4/foundation-and-remediations`.
   - Validate foundation with comprehensive schema and offline test suites.
   - Merge foundation into the primary working branch before dispatching dependent lanes.
3. **Isolated Parallel Worktrees (Phase 2)**:
   - For Lanes B, C, D, E, and F, instantiate isolated Git worktrees (`git worktree add ../wave4-lane-b ...`).
   - Each lane works strictly within its designated owned files.
4. **Integration Phase (Phase 3)**:
   - Merge lanes sequentially into integration branch: Foundation -> Lane B -> Lane C -> Lane D -> Lane E -> Lane F.
   - Run full regression suite after each lane integration.

### 4.2 Shared-File Collision Mitigation
- `daAppShell.js` and `daAppShell.html` are touched by Lane A (filter bar), Lane C (preset bar mount), Lane E (matrix tab mount), and Lane F (findings tab mount).
- **Rule**: Shared-file integrations into `daAppShell` must be performed exclusively by the Integration Coordinator during structured integration phases, not by parallel lane workers.

### 4.3 Safe Recovery Point
- Current HEAD `8557f6b93c44588a1b87b68313a36baee3c276e3` is clean, all baseline tests pass 100%, and Git status is pristine.
- If any subsequent phase encounters unrecoverable corruption, roll back immediately to `8557f6b93c44588a1b87b68313a36baee3c276e3`.
