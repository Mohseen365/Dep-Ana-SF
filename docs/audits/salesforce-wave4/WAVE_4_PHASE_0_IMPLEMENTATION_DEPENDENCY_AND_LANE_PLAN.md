# Wave 4 Phase 0: Implementation Dependency & Lane Dispatch Plan

| Attribute | Baseline Value |
|---|---|
| **Feature ID** | `FEAT-STATE-03` (Wave 4) |
| **Phase** | Phase 0 — Dependency Analysis & Sequencing Design |
| **Target Architecture** | Shared Filter Foundation + 6 Implementation Lanes (A–F) |
| **Implementation Hold** | **ACTIVE — IMPLEMENTATION NOT AUTHORIZED IN PHASE 0** |

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

## 3. Six-Lane Implementation Dispatch Matrix

| Lane | Name | Primary Responsibility | Owned Files | Shared Files (Protected) | Prohibited Files | Dependencies | Parallel Safe? |
|---|---|---|---|---|---|---|---|
| **Lane A** | Shell Filter Bar | Canonical V2 Filter Schema, Filter Bar UI, Filter Events | `daFilterSchema.js` (NEW), `run-lane-a-schema-tests.cjs` (NEW) | `daAppShell.js`, `daAppShell.html` | Apex files, `daGraphViewer.*` | None | **YES (Foundation)** |
| **Lane B** | Preset Management & Apex Persistence | Apex V1/V2 merge, preset persistence, 131,072 boundary | `DAUserPreferenceController.cls`, `DAUserPreferenceControllerTest.cls`, `run-workstream-c-tests.cjs` | None | LWC components, Explorer files | R1, R4 | **YES (Independent)** |
| **Lane C** | Preset Manager UI | Preset dropdown, modal CRUD dialog, project isolation | `daPresetManager/*` (NEW: js, html, css, meta.xml) | `daAppShell.html` (mount tag) | Apex files, `daGraphViewer.*` | Lane A, Lane B | **NO (Requires Foundation)** |
| **Lane D** | Graph Filter Engine | Apply active filters to Cytoscape graph nodes and edges | `daGraphViewer.js` (filter logic) | None | `daAppShell.*`, Apex controllers | Lane A | **NO (Requires Lane A)** |
| **Lane E** | Matrix View | Minimal functional Matrix viewer LWC using graph payload | `daMatrixViewer/*` (NEW: js, html, css, meta.xml) | `daAppShell.html` (tab container) | `daGraphViewer.*`, Apex files | Lane A | **NO (Requires Lane A)** |
| **Lane F** | Findings View | Minimal functional Findings viewer LWC with Lightning Datatable | `daFindingsViewer/*` (NEW: js, html, css, meta.xml) | `daAppShell.html` (tab container) | `daGraphViewer.*`, Apex files | Lane A | **NO (Requires Lane A)** |

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
