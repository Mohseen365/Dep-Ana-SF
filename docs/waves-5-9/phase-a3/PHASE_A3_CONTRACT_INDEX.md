# Phase A3 Contract Master Index

## 1. Executive Mission & Baseline Purpose
Phase A3 unifies and establishes the **Shared Technical Contracts** for Waves 5 through 9 of the Dependency Analyzer migration into Salesforce.

Phase A1 established the implementation baseline across 187 frozen tests. Phase A2 established the 5 workstream charters, path ownership, and dependencies. Phase A3 resolves cross-workstream discrepancies and provides concrete, frozen interfaces so that feature workstreams can implement components without inventing data models, event signatures, or integration assumptions.

---

## 2. Canonical Contracts Directory

| Contract ID | Title | Status | Affected Tasks | Specification File |
| :--- | :--- | :---: | :--- | :--- |
| **CONTRACT-01** | Canonical Graph Payload & Node/Edge Schema | `FROZEN` | `W5-1..6`, `W6-1..4`, `W7-1..2`, `W8-1..3`, `W9-1..3`, `INT-1` | [CONTRACT_01_CANONICAL_GRAPH_PAYLOAD.md](./CONTRACT_01_CANONICAL_GRAPH_PAYLOAD.md) |
| **CONTRACT-02** | Layout Identifiers & Layout Engine Configuration | `FROZEN` | `W5-1`, `W5-2`, `W5-3`, `INT-1` | [CONTRACT_02_LAYOUT_IDENTIFIERS_AND_CONFIGURATION.md](./CONTRACT_02_LAYOUT_IDENTIFIERS_AND_CONFIGURATION.md) |
| **CONTRACT-03** | Radar Nine-Dimension Architecture Adapter | `SOURCE_CONFIRMED` | `W6-1` | [CONTRACT_03_RADAR_NINE_DIMENSION_ADAPTER.md](./CONTRACT_03_RADAR_NINE_DIMENSION_ADAPTER.md) |
| **CONTRACT-04** | Analysis Run History API (Contract A Zero-Schema) | `FROZEN` | `W7-P1`, `W7-3`, `W8-3` | [CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md](./CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md) |
| **CONTRACT-05** | Dual-Snapshot Retrieval & Diff Engine Contract | `PROPOSED` | `W8-2`, `W8-3` | [CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md](./CONTRACT_05_DUAL_SNAPSHOT_AND_DIFF_ENGINE.md) |
| **CONTRACT-06** | Node Selection Event DTO & Interaction Contract | `FROZEN` | `W8-1`, `W5-1..6`, `W6-1..4`, `INT-1` | [CONTRACT_06_NODE_SELECTION_EVENT_DTO.md](./CONTRACT_06_NODE_SELECTION_EVENT_DTO.md) |
| **CONTRACT-07** | Refactoring Action DTOs & Simulation Operations | `PROPOSED` | `W9-1`, `W9-2`, `W9-3` | [CONTRACT_07_REFACTORING_ACTION_DTOS.md](./CONTRACT_07_REFACTORING_ACTION_DTOS.md) |
| **CONTRACT-08** | Workspace Component Registration & Navigation Mount | `FROZEN` | All tasks, `INT-1` | [CONTRACT_08_WORKSPACE_REGISTRATION_AND_MOUNT.md](./CONTRACT_08_WORKSPACE_REGISTRATION_AND_MOUNT.md) |
| **CONTRACT-09** | Shared State, Immutability & Frozen Invariants | `FROZEN` | All tasks, `INT-1` | [CONTRACT_09_SHARED_STATE_AND_INVARIANTS.md](./CONTRACT_09_SHARED_STATE_AND_INVARIANTS.md) |

---

## 3. Discrepancy & Contract Status Registers

- **Contract Status CSV**: [PHASE_A3_CONTRACT_STATUS.csv](./PHASE_A3_CONTRACT_STATUS.csv)
- **Discrepancy & Decision Register CSV**: [PHASE_A3_DISCREPANCY_AND_DECISION_REGISTER.csv](./PHASE_A3_DISCREPANCY_AND_DECISION_REGISTER.csv)
- **Source Traceability Evidence Index**: [PHASE_A3_SOURCE_EVIDENCE_INDEX.md](./PHASE_A3_SOURCE_EVIDENCE_INDEX.md)

---

## 4. Reusable Reference Fixtures

Representative and non-destructive sample fixtures are provided under `docs/waves-5-9/phase-a3/fixtures/`:
1. `fixtures/sample-graph-payload.json`: Authoritative canonical graph payload containing nodes, edges, cycle catalog, and summary.
2. `fixtures/sample-analysis-run-dto.json`: Authoritative Contract A zero-schema DTO representing a historical run.
3. `fixtures/sample-refactoring-action.json`: Discriminated union refactoring action DTO (`EXTRACT_CLASS`).

---

## 5. Implementation Gates & Post-A3 Readiness

1. **Overall Phase A3 Classification**: `READY WITH CONSTRAINTS`.
2. **Tasks Ready for Implementation Review**:
   - `W5-1` (Initial Layout Switcher under Workstream A)
   - `W6-1`, `W6-2`, `W6-3`, `W6-4` (Workstream B Visualizations)
   - `W7-P1` (Minimal History API under Workstream C)
   - `W7-1`, `W7-2` (Diagnostics & Architecture DNA Barcode)
   - `W8-1` (Investigation Drawer under Workstream D)
   - `W9-1` (Pure-Math Refactoring Engine under Workstream E)
3. **Dispatch Policy**:
   Phase A3 **DOES NOT authorize dispatch**. Tasks remain locked until explicit Lead Architect / Integration Coordinator authorization is granted.
