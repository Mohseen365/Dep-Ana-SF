# Architecture Blockers, Technical Decisions & Governance Register

This document tracks all formal architectural decisions, unresolved trade-offs, and governance prerequisites requiring Lead Architect and Project Owner resolution prior to dispatching implementation (Step B).

---

## 1. Technical Decisions Register

### DEC-01: Analysis Run Ingestion Status & SOQL Compound Ordering
- **Context**: The `DA_Analysis_Run__c` custom object in `scratch/salesforce-poc/` does not include a `Status__c` field in some baseline schemas, creating ambiguity between runs that produced empty graphs versus runs that failed or were interrupted during chunk generation.
- **Decision (Option A Ratified)**:
  - If `DA_Analysis_Run__c` has 0 associated `DA_Graph_Chunk__c` records, status is classified as `EMPTY`.
  - If `DA_Analysis_Run__c` has >= 1 chunks, status is classified as `AVAILABLE`.
  - Incomplete or failed runs require explicit error logging via `DAErrorResponse` or external status tracking.
  - Queries ordering analysis runs must use deterministic compound ordering: `ORDER BY Run_Timestamp__c DESC, Id DESC` (or `CreatedDate DESC, Id DESC`).
- **Impact**: Eliminates non-deterministic ordering and race conditions during run selection.

### DEC-02: Graph Chunking, Payload Caps & Single-Canvas Invariant
- **Context**: Passing large graph structures into Salesforce risks exceeding Apex heap limits (6 MB sync / 12 MB async), browser memory limits, and LWC component re-render performance.
- **Decision (Option A Ratified)**:
  - Salesforce LongTextArea chunk size is strictly capped at **131,072 characters** (JavaScript UTF-16 code units).
  - Maximum total graph payload is strictly capped at **10,485,760 characters (~10 MB)**.
  - Surrogate pairs at chunk boundaries must be protected by rolling back 1 character to avoid malformed UTF-16 strings.
  - Single Cytoscape Canvas Invariant: A single canvas instance is maintained within `daGraphViewer` and re-used or cleanly destroyed/re-instantiated upon project/run switch.
- **Impact**: Guarantees zero browser crashes and predictable heap consumption.

### DEC-03: Refactoring Simulation Scoping & Tarjan SCC Semantics
- **Context**: React provides extensive refactoring simulation (`refactoring-simulation.ts`), but full method-level analysis requires AST metadata not present in Salesforce.
- **Decision (Option A Ratified)**:
  - Component/Class-Level Scoping: Simulation in Salesforce operates at the component/class/object level.
  - `MOVE_METHOD`: Deferred and unsupported due to lack of method metadata in CONTRACT-01.
  - `EXTRACT_CLASS`: Supported; `movedMethodList` is treated as non-operational informational metadata.
  - `BREAK_CYCLE` / `REMOVE_NODE`: Fully supported; mathematically verified using client-side Tarjan SCC.
  - Metric Semantics: `cyclicSccCountDelta = newCyclicSccCount - baseCyclicSccCount` (measures reduction in cyclic SCCs, not raw elementary cycle counts).
- **Impact**: Provides predictable simulation math while deferring deep AST parsing to external analyzers.

### DEC-04: Implementation Dispatch Governance & Signoff Authority
- **Context**: Multi-agent parallel implementation risks collisions, regressions, and unauthorized architectural deviations without formal signoff gates.
- **Decision (Alternative 3: Two-Phase Sequential Dispatch)**:
  - **Gate 1A (Technical Certification)**: Lead Architect and Integration Coordinator must verify technical readiness, contract compliance, and test suite execution.
  - **Gate 1B (Business Scope Ratification)**: Product Owner and Project Owner must ratify business scope, priorities, and implementation order.
  - Implementation authorization requires formal 16-point Implementation Authorization Orders.
- **Impact**: Prevents uncoordinated, unreviewed code mutation across parallel lanes.

---

## 2. Active Technical Blockers & Governance Prerequisites

| Blocker ID | Domain | Description | Resolution Strategy / Prerequisite | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **BLK-01** | Apex Permissions & FLS | Permission sets (`ArchitectureExplorerAdmin`, `ArchitectureExplorerUser`) require verified field permissions for all 6 Custom Objects before org deployment. | Update permission set XML files in `force-app/main/default/permissionsets/` and run `DASchemaAndSecurityTest.cls`. | **High** |
| **BLK-02** | Static Resource Packaging | Cytoscape.js Static Resource is currently unbundled or referenced locally. A production-ready, minified, LWS-compliant Cytoscape static resource must be confirmed. | Validate `scratch/salesforce-poc/force-app/main/default/staticresources/` package metadata. | **High** |
| **BLK-03** | LWS Compatibility | Lightning Web Security (LWS) in modern Salesforce orgs restricts certain DOM mutations and third-party canvas hooks used by legacy libraries. | Validate pure SVG renderers for advanced views (DNA, Subway, Treemap) and enforce sandbox container boundaries. | **Medium** |
| **BLK-04** | Dual Snapshot Diff Ingestion | Direct AST diffing in Apex is restricted by CPU limits. Large diffs between two analysis runs must be computed client-side in LWC or externally. | Client-side diff computation in `daSnapshotComparisonModal` using CONTRACT-05. | **Medium** |

---

## 3. Clear List of Decisions Required Before Step B (Implementation Dispatch)

Before any agent executes implementation changes (Step B), the following items must be formally confirmed:
1. **Approval of Master Planning Session Deliverables**: Executive review and acceptance of `PARALLEL_IMPLEMENTATION_PLAN.md`, `AGENT_WORKSTREAM_ASSIGNMENTS.md`, and `SHARED_CONTRACTS.md`.
2. **Batch 2 Task Authorization**: Formal Gate 1A and Gate 1B signoff on Batch 2 tasks (WS-3 Matrix/Findings, WS-4 Radar/Sankey, WS-5 Dashboard, WS-6 Simulation).
3. **Shell Mutex Lock**: Confirmation that Workstream 1 retains exclusive mutation locks on `daAppShell` coordinator files.
