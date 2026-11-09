# Architecture Blockers, Technical Decisions & Governance Register

This document tracks all formal architectural decisions, unresolved trade-offs, and governance prerequisites requiring Lead Architect and Project Owner resolution.

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
  - **Gate 1B (Integration Signoff)**: All 11 approved analytical views mounted in `daAppShell` with verified offline test pass rate (100% across all 24 runners).

### DEC-05: Application Shell View Expansion & Investigation Drawer Integration
- **Context**: `daAppShell` initially exposed only 3 view modes (`graph`, `matrix`, `findings`). Six workstreams had completed building 8 additional views and an investigation drawer, but they remained unmounted in the application shell.
- **Decision (Ratified)**:
  - `APPROVED_VIEWS` expanded to: `['graph', 'matrix', 'findings', 'dashboard', 'history', 'diagnostics', 'hotspots', 'radar', 'treemap', 'subway', 'dna']`.
  - All 11 view components mounted in `daAppShell.html` with reactive payload, selection, and filter criteria bindings.
  - `<c-da-investigation-drawer>` mounted as a persistent right-hand dockable drawer accessible across all views whenever a node is selected.
  - Strict preservation of the architectural invariant: **SELECTION ≠ NAVIGATION**.

---

## 2. Blockers & Remaining Actions Register

| Item ID | Category | Description | Status | Resolution Path |
| :--- | :--- | :--- | :--- | :--- |
| **BLK-01** | Live Org Acceptance | Target Salesforce org connection unavailable in headless container sandbox. | Open (By Design) | Maintain strict separation between offline unit/integration verification and live scratch org acceptance. |
| **BLK-02** | Static Resource D3 River | Sankey River requires d3-sankey library not yet approved as an authenticated static resource. | Deferred | Coordinate with Security Architect for static resource approval or port pure SVG Sankey math into `daLayoutEngine`. |
| **BLK-03** | Standalone Diff Modal | Dedicated dual-run snapshot comparison modal bundle not yet allocated in file ownership register. | Pending Allocation | Define formal LWC bundle path in authoritative task register (`daSnapshotComparisonModal`). |
