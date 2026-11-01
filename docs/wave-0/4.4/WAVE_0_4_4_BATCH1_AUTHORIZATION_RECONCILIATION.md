# WAVE 0.4.4 BATCH 1 AUTHORIZATION RECONCILIATION

## 1. Executive Summary & Defect Correction

In Wave 0.4.3, the audit identified an authorization boundary contradiction:
- The authorization assessment listed **11** dispatchable task IDs.
- The cross-document reconciliation table stated **"Exactly 9 tasks"** (a typographical mismatch).

In Wave 0.4.4, this contradiction is formally reconciled. The canonical Batch 1 boundary consists of **exactly 11 tasks**:

| # | Task ID | Wave | Description | Owning Workstream | Accountable Owner | Dependencies | Path Count | Dispatch Status |
|:---:|:---:|:---:|:---|:---|:---|:---:|:---:|:---:|
| 1 | **W5-1** | Wave 5 | Shell Layout Switcher (Grid / Circle / Breadthfirst) | Workstream A | Workstream A Lead | None | 3 | **READY_TO_LAUNCH** |
| 2 | **W6-1** | Wave 6 | Radar View Component | Workstream B | Workstream B Lead | None | 5 | **READY_TO_LAUNCH** |
| 3 | **W6-2** | Wave 6 | Treemap View Component | Workstream B | Workstream B Lead | None | 5 | **READY_TO_LAUNCH** |
| 4 | **W6-3** | Wave 6 | Subway View Component | Workstream B | Workstream B Lead | None | 5 | **READY_TO_LAUNCH** |
| 5 | **W6-4** | Wave 6 | Hotspots View Component | Workstream B | Workstream B Lead | None | 5 | **READY_TO_LAUNCH** |
| 6 | **W7-P1** | Wave 7 | Minimal History API (Contract A Apex & DTO) | Workstream C | Workstream C Lead | None | 5 | **READY_TO_LAUNCH** |
| 7 | **W7-1** | Wave 7 | Diagnostics Scorecard Component | Workstream C | Workstream C Lead | None | 5 | **READY_TO_LAUNCH** |
| 8 | **W7-2** | Wave 7 | Architecture DNA Barcode Component | Workstream C | Workstream C Lead | None | 5 | **READY_TO_LAUNCH** |
| 9 | **W8-1** | Wave 8 | Investigation Drawer Component | Workstream D | Workstream D Lead | None | 5 | **READY_TO_LAUNCH** |
| 10 | **W8-2** | Wave 8 | Diff Engine Utility Module | Workstream D | Workstream D Lead | None | 3 | **READY_TO_LAUNCH** |
| 11 | **W9-1** | Wave 9 | Refactoring Engine (Pure Math / In-Memory Topology) | Workstream E | Workstream E Lead | None | 3 | **READY_TO_LAUNCH** |

---

## 2. Invariant & Boundary Verification

1. **All 11 Tasks Exist in Task Register**: Verified against `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv`.
2. **Zero Unfulfilled Dependencies**: All 11 tasks specify `Dependencies: None`.
3. **Zero Frozen Path Overlap**: No task in Batch 1 touches any frozen baseline test runner.
4. **Zero Coordinator Path Overlap**: No feature task touches `daAppShell.*` or `run-coordinator-integration-suite.cjs`.
5. **Wave 5 Concurrency**: Only `W5-1` is authorized in Wave 5; subsequent tasks (`W5-2` through `W5-6`) remain strictly serialized.
6. **Coordinator Exclusivity**: Aggregate test runners (`run-wave[5-9]-tests.cjs`) remain coordinator-exclusive.
