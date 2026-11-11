# Group A Repository Truth and Source Provenance Audit

## Document Identification
- **Document Type**: P0 Repository Truth & Evidence Reconciliation Audit
- **Executing Roles**: Integration Coordinator D1 / Independent Verifier D2
- **Authority**: Project Owner
- **Execution Date**: 2026-11-11
- **Branch**: `jules-9117442776605781269-d983ef01`
- **HEAD Commit**: `aa0d772e28d73e7ebe0c31f44eb07b0408f06e39`
- **Working Tree State**: Clean (`git status --short` is empty)
- **Status**: `AUDIT_COMPLETE_AUTHORITATIVE`

---

## 1. Executive Summary

This audit establishes the definitive baseline of the repository state at commit `aa0d772e28d73e7ebe0c31f44eb07b0408f06e39` on branch `jules-9117442776605781269-d983ef01`.

Historical documentation contained apparent contradictions regarding the physical presence of code on disk:
1. **Agent 3 (Apex REST Ingestion)**: Claims of `@RestResource` implementation versus D2 registers recording `NOT_COMMITTED_ON_DISK`.
2. **Agent 4 (Upload Client)**: Reports claiming implementation while earlier D2 registers marked source as absent.
3. **Agent 8B (Command Palette & Hover)**: Workstream claims of implementation versus earlier registers marking them absent.
4. **Agent 7 (Project Creation UI & Ingestion)**: Claims of import workflow versus specification status and presence of competing upload transport paths.
5. **Agent 6 (Finding Persistence)**: Verification of Apex methods, FLS metadata, and LWC UI state persistence.
6. **Agent 5 (Component Packages)**: Verification of `daSankeyView`, `daSnapshotComparisonModal`, and `daPresetManager`.

### Root Cause Analysis of Contradictions:
- **Historical Git Timing & Commit Integration**: Pull Request #206 (`aa0d772e28d73e7ebe0c31f44eb07b0408f06e39`) merged workstream deliverables across Agent 4, Agent 5, Agent 6, Agent 7, and Agent 8B into the working tree. Earlier D2 audit reports reflected commit `17502b832617666bcea26a9bbd2d6bd4310f47c9` prior to PR #206 merging.
- **Agent 3 Gating**: Agent 3 (`DAGraphIngestionRestResource.cls` and `DAGraphIngestionDTO.cls`) remains genuinely **not present on disk**. Agent 3 was explicitly gated fail-closed pending freeze of the REST batching contract and Project Owner ratification. Its prior status was `PREPARATION_AUTHORIZED` / `BLOCKED_PENDING_INTERFACE`.
- **Agent 4 Transport Adapter**: `scripts/salesforce-upload-client.cjs` is fully implemented and committed, passing 19/19 tests. It uses a pluggable `TransportAdapter` architecture with a default in-memory simulator adapter, cleanly decoupled while awaiting Agent 3's REST endpoint freeze.
- **Agent 8B Artifacts**: Both `daCommandPalette` (LWC) and `daGraphViewer` hover cards are fully implemented, committed on disk, and pass dedicated offline suites (`run-command-palette-tests.cjs` 11/11, `run-graph-hover-tests.cjs` 8/8). Earlier D2 registers reflecting absence were outdated.
- **Agent 7 Upload Route**: Agent 7 implemented `daProjectCreateModal` and `DAProjectController`, but included an Apex method `uploadChunks` that forwards directly to `DAGraphIngestionService.saveGraphChunks`, which acts as an alternative/competing upload route to the approved REST transport architecture.

---

## 2. Definitive Source Provenance & Cryptographic Verification Table

Every claimed file across Group A has been inspected directly on the filesystem at HEAD `aa0d772e28d73e7ebe0c31f44eb07b0408f06e39`:

| Workstream / Agent | Claimed File Path | Exists | Git Status | SHA-256 Checksum | Verification Classification | Discrepancy & Root Cause Resolution |
|---|---|---|---|---|---|---|
| **Agent 1** (Security) | `scratch/salesforce-poc/force-app/main/default/classes/services/DAProjectSecurityService.cls` | Yes | Committed | `fa28a7c2aad7472af4528148b3cbe8275988fa0d91244bb6882194380eb9a44c` | `COMMITTED_SOURCE_VERIFIED` | None. Security v1.0.2 fully implemented. |
| **Agent 1** (Security) | `scratch/salesforce-poc/force-app/main/default/classes/services/DAEmergencyAccessCleanupService.cls` | Yes | Committed | `8e1627c22b92c0f68d6139fe9b7886a117dd4fa525287f3ddf81734bc1f251e0` | `COMMITTED_SOURCE_VERIFIED` | None. Lease cleanup service verified. |
| **Agent 1** (Security) | `scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml` | Yes | Committed | `166aa91f661e36894c2bf172778ca77ae84285cb5c9ff8d89e50e9648fe6f6c8` | `COMMITTED_SOURCE_VERIFIED` | Contains 29 eligible fieldPermissions. |
| **Agent 1** (Security) | `scratch/salesforce-poc/force-app/main/default/triggers/DASecurityAuditLogTrigger.trigger` | Yes | Committed | `4009b8284da5a45de712ddf7560d2bbfd739ff94efc2c4bf239f134599a3848b` | `COMMITTED_SOURCE_VERIFIED` | Append-only trigger protection verified. |
| **Agent 2** (Lifecycle) | `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls` | Yes | Committed | `c678b631ec023c859c25f46a782b85e330a6230f8df75d4001d6701f2f8a49c4` | `COMMITTED_SOURCE_VERIFIED` | Lifecycle v1.0.2 with EMPTY state machine. |
| **Agent 2** (Lifecycle) | `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Status__c.field-meta.xml` | Yes | Committed | `94fba37b56e6d4cd689bc00aa2ef64d4b3c95a7c366ffbc3f7ddca2a49f506e7` | `COMMITTED_SOURCE_VERIFIED` | Picklist contains AVAILABLE, EMPTY, FAILED. |
| **Agent 2** (Lifecycle) | `scratch/salesforce-poc/force-app/main/default/objects/DA_Graph_Chunk__c/fields/Chunk_Key__c.field-meta.xml` | Yes | Committed | `751ff896eb48e0ad4cf685c4bfbcdebe8a6cbccdc5c5b9f71c4c9dcf9363a0a3` | `COMMITTED_SOURCE_VERIFIED` | Unique case-insensitive constraint verified. |
| **Agent 3** (REST) | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphIngestionRestResource.cls` | **No** | Absent | N/A | `SPECIFICATION_VERIFIED` / `NOT_IMPLEMENTED` | Gated fail-closed pending REST contract freeze and PO ratification. |
| **Agent 3** (REST) | `scratch/salesforce-poc/force-app/main/default/classes/dto/DAGraphIngestionDTO.cls` | **No** | Absent | N/A | `SPECIFICATION_VERIFIED` / `NOT_IMPLEMENTED` | Gated fail-closed pending REST contract freeze. |
| **Agent 4** (Upload) | `scripts/salesforce-upload-client.cjs` | Yes | Committed | `c28689036f7b07659556216447ce73faec4ca612e62ea6da7994ef03511eb9c0` | `COMMITTED_SOURCE_VERIFIED` | Implemented; wire ceiling downscaling verified; uses pluggable transport adapter. |
| **Agent 4** (Upload) | `scripts/cli-salesforce-ingest.cjs` | Yes | Committed | `f21982a719aa8df1d5fc68dcf03d42ef403606fbf637f94bb40e69ddc6ef6eeb` | `COMMITTED_SOURCE_VERIFIED` | CLI wrapper for upload client verified. |
| **Agent 4** (Upload) | `scripts/test-salesforce-upload-client.cjs` | Yes | Committed | `8be2a61c3d2021d9fa4d5ae251783478cfec109ff621e25e9ae51b3a886a11e8` | `COMMITTED_SOURCE_VERIFIED` | 19/19 tests pass offline. |
| **Agent 5** (Components) | `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/daSankeyView.js` | Yes | Committed | `60c7f7970d4f09618b76ce8f0475306bfb8e612f0c72f7783aa87693630f5551` | `COMMITTED_SOURCE_VERIFIED` | Pure native SVG Sankey river view (View 12). |
| **Agent 5** (Components) | `scratch/salesforce-poc/force-app/main/default/lwc/daSnapshotComparisonModal/daSnapshotComparisonModal.js` | Yes | Committed | `df3edd44826b6c99c67bb4814e427dfaaee0f6e91f1a5ba8294719d36e8b4e85` | `COMMITTED_SOURCE_VERIFIED` | Modal diffing component adhering to CONTRACT-05. |
| **Agent 5** (Components) | `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js` | Yes | Committed | `3098b69428a91119aafe562a05cf4ff2a66e07629b359d95f8428586c52a0a25` | `COMMITTED_SOURCE_VERIFIED` | Preset manager modal component. |
| **Agent 6** (Findings) | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` | Yes | Committed | `7dc3380ea485a6de9e011ccb58098fa395e7ecdb073cf049c31405e3650228d4` | `COMMITTED_SOURCE_VERIFIED` | Contains finding persistence methods & USER_MODE. |
| **Agent 6** (Findings) | `scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/Status__c.field-meta.xml` | Yes | Committed | `9ff2fb64bb5a5a0438cf39886dd6e9e4f5538e136371cb7c0e5a8f4b00511fd3` | `COMMITTED_SOURCE_VERIFIED` | Status picklist (OPEN, IN_REVIEW, RESOLVED, WONT_FIX). |
| **Agent 6** (Findings) | `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsView/daFindingsView.js` | Yes | Committed | `7c02977d2465fb044c688321e149302ca21915998a4dbeae486a68f03be9dbba` | `COMMITTED_SOURCE_VERIFIED` | Optimistic update with automatic error rollback. |
| **Agent 7** (Project) | `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAProjectController.cls` | Yes | Committed | `9b1a9e5eeef4f5f0b5433a02796e949a21b3303d22ecf0426815ce30ba8772a8` | `COMMITTED_SOURCE_VERIFIED` | Project creation & slugification; contains uploadChunks. |
| **Agent 7** (Project) | `scratch/salesforce-poc/force-app/main/default/lwc/daProjectCreateModal/daProjectCreateModal.js` | Yes | Committed | `e3376604960425f891d4e022f462bbcb468e7b99ba65ff296ef2c6e6bc340fc4` | `COMMITTED_SOURCE_VERIFIED` | Modal chunking & project creation. |
| **Agent 7** (Project) | `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/daProjectSelector.js` | Yes | Committed | `a951d8804d2ccb7694f2d348a74e5ce6c3217b12d7870ebfc1e3609fc233ec8e` | `COMMITTED_SOURCE_VERIFIED` | Project selection dropdown & modal trigger. |
| **Agent 8B** (Interactive) | `scratch/salesforce-poc/force-app/main/default/lwc/daCommandPalette/daCommandPalette.js` | Yes | Committed | `14729335887673fb78fcb5ec8e8bc37042f9b8aa7516d957ba4bcf1b5d63f9b7` | `COMMITTED_SOURCE_VERIFIED` | Ctrl+K/Cmd+K spotlight search; SELECTION != NAVIGATION. |
| **Agent 8B** (Interactive) | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | Yes | Committed | `62683832acb466aee409f53e6b72a6bca232ea270501869e9d6d5d54a2a2223a` | `COMMITTED_SOURCE_VERIFIED` | 200ms debounced hover cards for nodes and edges. |

---

## 3. Discrepancy Reconciliation Summary

1. **Agent 3 REST Apex Source**: Confirmed absent on disk. Agent 3 has not written source code into `force-app/` because it is properly respecting fail-closed dependency governance. The REST contract proposal is ready for formal freeze and PO ratification.
2. **Agent 4 Upload Client**: Confirmed committed and passing 19 unit tests. The earlier claim that source was absent was due to evaluating prior commit `17502b83` instead of the PR #206 merge commit `aa0d772e`.
3. **Agent 8B Palette & Hover**: Confirmed committed, passing 19 total unit tests (11 palette + 8 hover). The source is completely verified on disk.
4. **Agent 7 Transport Architecture**: Confirmed that `DAProjectController.cls` provides an Apex `@AuraEnabled` method `uploadChunks`. This represents a UI-side ingestion path that bypasses the external REST endpoint. Under canonical architecture, `DAProjectController` should create the project and initialize the run, while external chunk ingestion flows through the approved REST transport or an approved Apex service call. This is reconciled in Wave E.
5. **D2 Register Alignment**: The discrepancy between older D2 reports (`STAGE_E_AUDIT_PASS`) and real disk presence is resolved: the repository now has all physical assets committed except Agent 3 REST resource which is appropriately gated.

Audit verdict: **OFFLINE_SOURCE_VERIFIED across all existing assets; AGENT 3 PROVEN GATED**.
