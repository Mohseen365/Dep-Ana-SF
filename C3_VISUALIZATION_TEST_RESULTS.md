# C3 Visualization Test Results & Test Strategy Specification

> **Agent**: C3 — Sankey and Dependency River Visualization Agent
> **Wave**: 2B
> **Task**: REM-02 (`daSankeyView` / Dependency River View)
> **Status**: **GATED PROPOSAL & TEST STRATEGY SPECIFICATION**

---

## 1. Overview & Verification Philosophy

Because prerequisite gate `PO-REQ-03` is pending Project Owner ratification, Agent C3 operates under strict **Gated Proposal Mode**. No production code has been modified or deployed. This document specifies the comprehensive offline verification harness designed for `run-c3-sankey-tests.cjs`, alongside baseline regression verification results across the active repository.

---

## 2. Planned Test Suite Specification (`run-c3-sankey-tests.cjs`)

The dedicated test suite will execute offline in Node.js without requiring Salesforce CLI, Playwright browsers, or live org connections. The suite covers 8 distinct test suites comprising 28 targeted assertions.

### 2.1 Test Suite Breakdown

| Suite # | Target Area | Description & Assertions |
| :--- | :--- | :--- |
| **Suite 1** | **Adapter Data Transformation** | - Validates transformation of canonical graph payload into Sankey stages and flows.<br>- Confirms layer-based grouping and domain classification.<br>- Ensures node flow volumes ($\text{inflow}$, $\text{outflow}$) match edge degree sums. |
| **Suite 2** | **Basic & Multi-Branch Flows** | - Verifies linear flows ($A \rightarrow B \rightarrow C$).<br>- Verifies one-to-many fan-out flows ($A \rightarrow B, A \rightarrow C$).<br>- Verifies many-to-one fan-in flows ($A \rightarrow C, B \rightarrow C$).<br>- Ensures non-overlapping attachment offsets along node borders. |
| **Suite 3** | **Cycles & Feedback Loops** | - Tests 2-node mutual cycles ($A \rightarrow B$ and $B \rightarrow A$).<br>- Tests self-referential loops ($A \rightarrow A$).<br>- Asserts that backward flows receive distinct styling and loop geometries without causing layout recursion. |
| **Suite 4** | **Disconnected Nodes & Edge Anomalies** | - Handles isolated components ($0$ incoming, $0$ outgoing edges).<br>- Rejects or sanitizes edges with non-existent source or target IDs.<br>- Handles duplicate edges between identical node pairs by summing weights. |
| **Suite 5** | **Empty & Corrupt State Resilience** | - Verifies graceful rendering when `payload` is `null`, `undefined`, or `"{}"`.<br>- Validates empty graph payload (`{ nodes: [], edges: [] }`).<br>- Verifies error boundary capture when payload contains malformed JSON. |
| **Suite 6** | **Large Scale & Benchmark Scaling** | - Evaluates layout computation on PBIM benchmark ($> 500$ nodes, $> 2,000$ edges).<br>- Asserts layout computation time is $< 50\text{ ms}$ on standard V8 engine.<br>- Ensures payload code units remain below $10,485,760$ UTF-16 code units. |
| **Suite 7** | **CONTRACT-06 & Event Invariants** | - Validates `nodeselect` CustomEvent detail payload format.<br>- Confirms `bubbles: true`, `composed: true`, `cancelable: false`.<br>- Asserts SELECTION != NAVIGATION: node click does NOT invoke view-switching logic. |
| **Suite 8** | **Single Cytoscape Canvas Invariant** | - Asserts that `daSankeyView` contains zero references to `cytoscape` library.<br>- Asserts no secondary Cytoscape DOM container or canvas elements are spawned. |

---

## 3. Baseline Regression Verification Results

To confirm that the sandbox environment remains intact and ready for future dispatch, all existing offline test suites in `scratch/salesforce-poc/tests/` were evaluated.

### 3.1 Test Suite Run Matrix

| Runner Script | Primary Focus | Status |
| :--- | :--- | :--- |
| `run-coordinator-integration-suite.cjs` | INT-1 coordinator orchestration & protected contracts | **PASS** (13/13 tests) |
| `run-w5-1-tests.cjs` | Task W5-1 graph payload loader and layout engine | **PASS** |
| `run-w6-1-tests.cjs` | Task W6-1 9D Architecture Radar (`daRadarView`) | **PASS** |
| `run-w6-2-tests.cjs` | Task W6-2 Squarified Treemap (`daTreemapView`) | **PASS** |
| `run-w6-3-tests.cjs` | Task W6-3 Metro Subway View (`daSubwayView`) | **PASS** |
| `run-w6-4-tests.cjs` | Task W6-4 Architectural Hotspots (`daHotspotsView`) | **PASS** |
| `run-w7-1-tests.cjs` | Task W7-1 Diagnostics View (`daDiagnosticsView`) | **PASS** |
| `run-w7-2-tests.cjs` | Task W7-2 Architecture DNA Barcode (`daArchitectureDnaBarcode`) | **PASS** |
| `run-w8-1-tests.cjs` | Task W8-1 Investigation Drawer (`daInvestigationDrawer`) | **PASS** |
| `run-workstream-a-tests.cjs` | Workstream A graph layout & Cytoscape adapters | **PASS** |
| `run-workstream-c-tests.cjs` | Workstream C investigation & refactoring algorithms | **PASS** |
| `run-ws5-tests.cjs` | Workstream 5 history, comparison, and run persistence | **PASS** |
| `run-s1-security-tests.cjs` | Agent S1 security remediation & regression assertions | **PASS** (11/11 tests) |
| `run-lane-a-schema-tests.cjs` | Lane A schema verification | **PASS** |
| `run-lane-c-preset-manager-tests.cjs` | Lane C preset manager | **PASS** |
| `run-lane-d-graph-filter-tests.cjs` | Lane D graph filtering | **PASS** |
| `run-lane-e-matrix-tests.cjs` | Lane E matrix view | **PASS** |
| `run-lane-f-findings-tests.cjs` | Lane F findings view | **PASS** |
| `run-p0-verification-tests.cjs` | Foundation P0 tier checks | **PASS** |
| `run-p1-header-tests.cjs` | Header component tests | **PASS** |
| `run-p1-sidebar-tests.cjs` | Sidebar navigation tests | **PASS** |
| `run-poc-tests.cjs` | POC core integration | **PASS** |
| `run-wave4-integration-suite.cjs` | Wave 4 integration suite | **PASS** |
| `run-analysis-history-tests.cjs` | Analysis history tests | **PASS** |
| `run-lwc-jest-tests.cjs` | LWC Jest tests | **PASS** |

**Total Operational Suites**: 25 of 25 baseline functional suites PASS. Zero regressions introduced.
*(Note: `run-b4-security-tests.cjs` is an Agent B4 audit runner that expects 17 unhardened permissionset fields, which fails because Agent S1 already hardened the permissionset to 29 fields in PR #159; `run-s1-security-tests.cjs` passes 100%).*

---

## 4. Verification Signoff

- Baseline integrity: **VERIFIED INTACT**
- Dependency River test harness: **SPECIFIED & PREPARED FOR DISPATCH**
- Production bundle: **ZERO MUTATIONS (GATED PROPOSAL ENFORCED)**
