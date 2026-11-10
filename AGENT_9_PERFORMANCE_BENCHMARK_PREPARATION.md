# Agent 9 Performance Benchmark Preparation

## Document Metadata
- **Agent**: Agent 9 (React Parity & Performance Investigation)
- **Coordinator**: Integration Coordinator D1
- **Date**: 2026-11-10
- **Status**: PREPARATION COMPLETE (BENCHMARK DESIGN & PARITY RECONCILIATION)

---

## 1. Scope & Governance Boundaries
Agent 9 is authorized strictly for:
- Reconciling proposed React vs Salesforce parity and distinguishing views, layouts, surfaces, and modals.
- Formulating performance benchmark scenarios across large graph datasets (500+ nodes).
- Establishing reproducible thresholds for FPS, initial layout computation, and position persistence concurrency.

**Prohibitions Enforced**:
- Zero implementation of new Salesforce lenses.
- Zero modification to production visualization components or layout identifiers.
- Secondary React lenses (Heatmap, Tree, Profile, Four-Direction) are classified strictly as `PROPOSED OUT-OF-SCOPE DIFFERENCES — PENDING PROJECT OWNER APPROVAL`.

---

## 2. Parity Classification & Architectural Distinctions

A fundamental failure in earlier migration tracking was the conflation of workspace views, layout algorithms, supporting surfaces, modals, and quarantined features. The authoritative parity model separates them into 5 distinct categories:

1. **Workspace Views (Primary Lenses)**: Full-page visualization modes (Architecture/Cytoscape, River/Sankey, Circular, Metrics, Radar, Matrix, Treemap, Timeline, Sphere, Landscape).
2. **Layout Algorithms (Within `daGraphViewer`)**: Mathematical layouts executed by Cytoscape (COSE, Dagre, Concentric, Cola, Breadthfirst, Grid, Circle, Preset).
3. **Supporting Surfaces**: Non-view auxiliary UI controls (Investigation Drawer, Command Palette, Node/Edge Hover Cards, Preset Filter Manager).
4. **Modals**: Ephemeral dialogs invoked on top of workspace views (Snapshot Comparison Modal).
5. **Quarantined Features**: Isolated Wave 9 components (`daRefactoringEngine`, `daRefactorHandoffModal`) excluded from packaging via `.forceignore`.

---

## 3. 500+ Node Graph Benchmark Investigation (PBIM Specimen)

The canonical test specimen for large-scale graph performance is the **PBIM dataset** (528 nodes, 2,063 edges, 4.25 MB JSON representation, 33 chunks).

### 3.1 Initial Render & Layout Computation Targets
| Layout Algorithm | Target Computation Time (500 Nodes) | Warning Threshold | Critical Fail Bound |
|---|---|---|---|
| **Dagre (Hierarchical)** | < 350 ms | > 600 ms | > 1,500 ms |
| **COSE (Physics Spring)** | < 1,200 ms | > 2,000 ms | > 4,000 ms |
| **Concentric / Circular** | < 120 ms | > 250 ms | > 600 ms |
| **Grid / Preset** | < 50 ms | > 100 ms | > 300 ms |

### 3.2 Viewport Interaction & Frame Rate Standards
- **Pan & Zoom Smoothness**: Sustained **> 45 FPS** during viewport dragging and zooming on standard desktop hardware (Google Chrome).
- **Node Drag Responsiveness**: Latency from `mousedown` to position update `< 16 ms` (1 frame).

---

## 4. Coordinate Persistence Concurrency & Race Condition Defense

When users reposition nodes in `preset` layout mode, node coordinates `(x, y)` are saved back to `DA_User_Preference__c.Positions_JSON__c`.

### 4.1 Identified Concurrency Failure Modes
1. **Rapid Drag Throttling**: Moving multiple nodes rapidly can queue dozens of concurrent Apex DML requests, risking `UNABLE_TO_LOCK_ROW` or governor-limit exhaustion.
2. **Multi-Tab Conflict**: User opens Project in two browser windows; window B overwrites positions saved by window A.

### 4.2 Architectural Safeguards
1. **Client-Side Debouncing**: Enforce a mandatory 800 ms debounce on position mutations before initiating network persistence.
2. **Delta Serialization**: Persist only modified node coordinates rather than entire 528-node coordinate sets whenever possible.
3. **Optimistic Locking via Revision Hash**: Include a lightweight hash or timestamp on the preference payload to detect stale overwrites.

---

## 5. Parity Proposal & Outstanding P2 Scope

The detailed parity audit is published in `AGENT_9_REACT_SALESFORCE_PARITY_PROPOSAL.csv`.
Key highlights:
- 10 Workspace Views implemented or specified.
- 8 Cytoscape Layout Algorithms implemented.
- 4 Secondary React Lenses (Heatmap, Tree, Profile, Four-Direction) are classified strictly as `PROPOSED OUT-OF-SCOPE DIFFERENCES — PENDING PROJECT OWNER APPROVAL` awaiting `PO-DEC-V2-06`.
